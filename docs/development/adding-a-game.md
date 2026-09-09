# Adding a game

A game plugs into seven functions on the server and seven places on the client.
Miss one and the symptom is usually subtle — the lobby shows the wrong title, or
refreshing mid-game drops the player into a blank screen.

Throughout this page the new game is called `monjeu`. Once it runs, add it to
[Game internals](game-internals.md) as well — that page is where the next person
looks to change its words, cards or timings.

## Server — `server.js`

### 1. Default settings

```js
function defaultSettings(gameType) {
  switch (gameType) {
    // ...
    case 'monjeu': return { roundTime: 60, rounds: 3 };
  }
}
```

### 2. Validate incoming settings

An allow-list, not a clamp. Anything unrecognised is dropped.

```js
case 'monjeu':
  if (isValidTime('roundTime'))          out.roundTime = n('roundTime');
  if ([2, 3, 4].includes(n('rounds')))   out.rounds    = n('rounds');
  break;
```

### 3. Minimum players

```js
function minPlayers(g) {
  return { tictactoe: 2, killerdoctor: 4, scribble: 3, uno: 2, quiz: 2,
           connect4: 2, undercover: 4, rps: 2, monjeu: 3 }[g] ?? 2;
}
```

### 4. Register the start function

```js
addTimer(room, () => ({ /* ... */, monjeu: startMonjeu })[room.gameType]?.(room), 3200);
```

### 5. Route player actions

```js
case 'monjeu': monjeuAction(room, socket, data); break;
```

### 6. Handle reconnection

The single most-forgotten step. Rebuild everything the client needs, including
anything private to that one player.

```js
case 'monjeu':
  socket.emit('monjeu:state', monjeuPublic(gs));
  if (gs.secrets[socket.id]) socket.emit('monjeu:secret', gs.secrets[socket.id]);
  break;
```

### 7. Handle disconnection

Decide what a departure means. Can the game continue? Does the leaver forfeit?
Does the round need to end early?

```js
case 'monjeu': {
  delete gs.scores[sid];
  if (room.players.size < minPlayers('monjeu')) { clearTimers(room); endMonjeu(room); }
  break;
}
```

### 8. Write the game itself

Add a banner-delimited section following the existing convention:

```js
// ─────────────────────────── MONJEU ───────────────────────────

function startMonjeu(room) { /* build gameState, emit first state */ }
function monjeuAction(room, socket, data) { /* validate, mutate, broadcast */ }
function monjeuPublic(gs) { /* state safe to broadcast — no secrets */ }
function endMonjeu(room) { /* final scores, session stats */ }
```

!!! danger "Never broadcast secrets"

    `monjeuPublic()` is what every player receives. A hidden role, a secret
    word or an unrevealed price must not appear in it — send those to the one
    socket that owns them.

## Client

### `public/index.html`

1. A game card on the home screen:

    ```html
    <div class="game-card" data-game="monjeu">…</div>
    ```

2. A view, hidden until the game starts:

    ```html
    <div id="view-monjeu" class="view">…</div>
    ```

3. A tab and a body in the rules modal:

    ```html
    <button class="rules-tab" data-game="monjeu">🎲 Mon Jeu</button>
    <div id="rules-monjeu" class="rules-content">…</div>
    ```

4. The script tag, before `app.js`:

    ```html
    <script src="js/monjeu.js"></script>
    ```

### `public/js/monjeu.js`

Follow the shape of the existing modules: an object exposing `onState()`, with
actions emitted back through `App.socket`.

### `public/js/app.js`

1. The settings schema, which renders the lobby controls. Labels and option
   labels are **i18n keys**, resolved at render time:

    ```js
    monjeu: [
      { id: 'rounds', label: 'settings.rounds', default: 3,
        options: [{v:2,k:'settings.opt.rounds',p:{count:2}},
                  {v:3,k:'settings.opt.rounds',p:{count:3},star:true},
                  {v:4,k:'settings.opt.rounds',p:{count:4}}] },
    ],
    ```

    `star: true` marks the recommended value with a ★ in the host's dropdown.
    Add `isTime: true` for a free-form seconds field instead of a `<select>`.

    Keep these options identical to what `validateSettings()` accepts, or the host
    will pick something the server silently discards. `npm test` checks both
    directions — including that every server default has a control here.

2. The display name — easy to miss. It is an i18n key, in the `gameKeys` map
   inside `renderLobby()`:

    ```js
    const gameKeys = { /* ... */, monjeu: 'game.monjeu.name' };
    ```

3. The socket listeners:

    ```js
    App.socket.on('monjeu:state', data => { showView('monjeu'); Monjeu.onState(data); });
    ```

4. If the game ships unfinished, add it to `BETA_GAMES` — one list drives the
   `BETA` chip in the lobby:

    ```js
    const BETA_GAMES = ['connect4', 'undercover', 'rps'];
    ```

    The chip on the home card and in the game's own view is markup:
    `<span class="badge-beta card-beta" data-i18n="common.beta">BETA</span>`.

### `public/js/i18n/en.json` and `fr.json`

Every string the game shows needs a key in **both** files — they must stay
key-for-key identical, or a missing French key silently falls back to English.
Plurals use the `key_one` / `key_other` suffix with a `count` param.

```bash
npm run i18n:check    # missing keys, and keys nothing uses
```

### `test/`

Write the game's tests as you go, not after. The suite drives the real functions
— `require('../server.js')` and build a room with
[`test/helpers.js`](https://github.com/gogo25171/gamenight/blob/main/test/helpers.js).
At a minimum: the rules that decide a winner, an illegal action from a player whose
turn it is not, and a `test/secrets.test.js` entry proving the game's private
state never reaches a room broadcast.

Two rules that are easy to learn the hard way: **step the phase machines** instead
of waiting on their timers (and end with `stopTimers(room)`), and **pick players by
role**, never by position — roles and hands are dealt at random.

## Before opening the pull request

- [ ] `npm test` passes, with new tests covering the game's rules and its secrets
- [ ] `npm run i18n:check` is clean
- [ ] `node --check` passes on every file you touched
- [ ] `pre-commit run --all-files` is clean
- [ ] Reconnecting mid-game restores everything, secrets included
- [ ] A player leaving mid-game does not wedge the room
- [ ] Play again works
- [ ] Spectators see something sensible, if the game eliminates players
- [ ] `README.md`, the games badge, `docs/games/` and
      [Game internals](game-internals.md) are updated
- [ ] `CHANGELOG.md` has an entry under `[Unreleased]`
