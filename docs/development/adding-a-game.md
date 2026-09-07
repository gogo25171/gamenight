# Adding a game

A game plugs into seven functions on the server and seven places on the client.
Miss one and the symptom is usually subtle — the lobby shows the wrong title, or
refreshing mid-game drops the player into a blank screen.

Throughout this page the new game is called `monjeu`.

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
  return { tictactoe: 2, killerdoctor: 4, scribble: 3, uno: 2, quiz: 2, monjeu: 3 }[g] ?? 2;
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

1. The settings schema, which renders the lobby controls:

    ```js
    monjeu: [
      { id: 'rounds', label: 'Rounds', default: 3,
        options: [{v:2,l:'2 rounds'},{v:3,l:'3 rounds ★'},{v:4,l:'4 rounds'}] },
    ],
    ```

    The `★` marks the default. Keep these options identical to what
    `validateSettings()` accepts, or the host will pick something the server
    silently discards.

2. The display name — easy to miss:

    ```js
    const gameNames = { /* ... */, monjeu: 'Mon Jeu' };
    ```

3. The socket listeners:

    ```js
    App.socket.on('monjeu:state', data => { showView('monjeu'); Monjeu.onState(data); });
    ```

## Before opening the pull request

- [ ] `node --check` passes on every file you touched
- [ ] `pre-commit run --all-files` is clean
- [ ] Reconnecting mid-game restores everything, secrets included
- [ ] A player leaving mid-game does not wedge the room
- [ ] Play again works
- [ ] Spectators see something sensible, if the game eliminates players
- [ ] `README.md`, the games badge and `docs/games/` are updated
- [ ] `CHANGELOG.md` has an entry under `[Unreleased]`
