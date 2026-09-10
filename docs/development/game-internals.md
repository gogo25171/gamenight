# Game internals

One page per question you will actually have: **how do I add words to Undercover,
change UNO's deck, swap the Quiz's question source** — and, once you need to go
deeper, how each game actually works inside `server.js`.

Every game gets two parts:

- **Tweak it** — the constant or the function to edit, and what else you have to
  touch so the change survives. Read this first.
- **How it works** — the state it keeps, the phases it walks through, and what it
  keeps secret.

[Adding a game](adding-a-game.md) covers the seven hooks a *new* game plugs into.
This page is about the eight that are already there.

## Before you touch anything

All eight games live in [`server.js`](https://github.com/gogo25171/gamenight/blob/main/server.js),
each under its own banner comment. Line numbers move; the banners do not, so find
a game with a search rather than a line number:

```bash
grep -n "──────" server.js      # every section boundary, in order
```

A few rules hold for all of them.

**State lives in `room.gameState`.** One object per room, built by `start*()`, and
thrown away when the game ends. Nothing is persisted — a server restart ends
every game in progress, deliberately.

**Secrets never enter the public state.** `*Public(gs)` builds the shape that goes
to the whole room; anything private goes to the one socket that owns it:

```js
io.to(room.code).emit('uc:state', ucPublic(gs));      // everyone
io.to(p.id).emit('uc:word', { word: pd.word });       // one player
```

`test/secrets.test.js` enforces this for all eight games by capturing every
broadcast and searching it for the secret. If you add a private field, add it
there too.

**Timers are per room.** Always `addTimer(room, fn, ms)`, never a bare
`setTimeout` — an emptied room calls `clearTimers(room)` and a stray timer would
survive it and fire into a room that no longer exists.

**Settings are an allow-list.** A value the server does not recognise is
**dropped, not clamped**. So whenever you add or change an option you touch three
places, or the host picks something the server silently throws away:

| Where | What |
|-------|------|
| `defaultSettings()` in `server.js` | The starting value |
| `validateSettings()` in `server.js` | The list of accepted values |
| `SETTINGS_SCHEMA` in `public/js/app.js` | The control the lobby renders |

Plus a label key in **both** `public/js/i18n/en.json` and `fr.json` — they must
stay key-for-key identical. `npm test` checks the schema against the validator in
both directions, and `npm run i18n:check` checks the language files.

---

## :knife: Mongolpuri

Internally the game type is `killerdoctor`, and its socket events are `kd:`. The
rename never reached the code.

### Tweak it

**The role mix** is computed in `startKD()` — there is no table to edit:

```js
const maxDoctors = Math.max(1, Math.floor(players.length / 5));
const numDoctors = Math.floor(Math.random() * maxDoctors) + 1;
```

Roughly one Doctor per five players, then a random count between 1 and that
maximum, so the table cannot count Doctors from the player count alone. There is
always exactly **one** Killer: `role: i === 0 ? 'killer' : …` on a shuffled list.

**To add a role** (Seer, Witch, Hunter…) you need three things: a branch in the
role assignment above, a night action in `kdAction()`, and a resolution step in
`kdResolveNight()` — which currently reads only the Killer's pick and the set of
Doctor picks. Nothing else in the game hard-codes the three existing roles, but
`kdCheckWin()` assumes one Killer, so a second killer role needs it rewritten.

**The timers** are all settings: `nightTime`, `discussionTime`, `votingTime`.

### How it works

`gs.playerData[socketId]` holds `{ role, alive, hasActedNight, nightChoice, vote }`
and never leaves the server whole — `kdPub()` strips it down to id, name and
avatar.

The phase walk, each step scheduled by the previous one's timer:

```text
role_reveal ─6s→ night ──→ night_resolution ─4s→ day_discussion ──→ voting
                   ↑                                                  │
                   └────────────── +5s, round++ ──── vote_resolution ←─┘
```

Two details that are easy to break:

- **Every living player submits a night pick**, not just the Killer and Doctors.
  The screen is identical for everyone, and a villager's pick is an ignored decoy.
  That is what stops the table from reading roles off who is choosing.
- `checkNightDone()` waits for `1000 + Math.random() * 4000` ms before resolving.
  Without that random delay, resolution speed itself would leak how many players
  had a real decision to make.

`kdCheckWin()` is checked after both resolutions: no living Killer means the
villagers win, two or fewer players alive means the Killer wins.

A disconnect marks the player dead and re-runs the win check; below
`minPlayers()` living players the game ends as `abandoned`.

---

## :black_joker: UNO

### Tweak it

**The deck** is built card by card in `buildUnoDeck()`:

```js
for (const color of UNO_COLORS) {
  deck.push({ color, value: '0' });                       // one 0
  for (let n = 1; n <= 9; n++)
    deck.push({ color, value: String(n) }, { color, value: String(n) });
  for (const v of ['skip', 'reverse', 'draw2'])
    deck.push({ color, value: v }, { color, value: v });
}
```

108 cards exactly: 25 per colour, 4 Wild, 4 Wild +4. `test/uno.test.js` asserts
that count, so a house rule that changes the deck changes the test too.

A card is `{ color, value }` and nothing else, so a **new card type** means:

1. Push it in `buildUnoDeck()`.
2. Teach `unoCanPlay()` when it is legal.
3. Handle its effect in `unoPlayCard()`.
4. Render it in `public/js/uno.js` (the card face is built from `color` + `value`).

**Playability** is one small function, and the place to change if you want the
"must play a drawn card" or "stacking +2" house rules:

```js
function unoCanPlay(card, topCard, currentColor) {
  if (card.color === 'wild') return true;
  if (card.color === currentColor) return true;
  if (topCard && card.value === topCard.value) return true;
  return false;
}
```

UNO deliberately has **no settings** — `defaultSettings('uno')` returns `{}` and
the lobby renders no controls. House rules would be the first thing to add there.

### How it works

`gs` holds `deck`, `discardPile`, `hands` (per player), `playerOrder`,
`currentPlayerIndex` and `direction` (`1` or `-1`). Turn order is one modulo:

```js
function unoNextIdx(gs, steps) {
  const n = gs.playerOrder.length;
  return ((gs.currentPlayerIndex + gs.direction * steps) % n + n) % n;
}
```

The double modulo is what makes a Reverse at index 0 wrap to the end instead of
going negative.

`unoPublic()` sends **card counts, not cards** — `cardCounts` per player, plus the
discard top, the active colour and the deck size. Hands go out one socket at a
time with `uno:hand`. That is the whole secret model of the game.

Two edge cases worth knowing before you touch this section:

- **The starting card is never a Wild.** `startUno()` puts it back and reshuffles
  until it is not, then applies Skip / Reverse / +2 as if it had been played.
- **A drained deck recycles the discard pile.** `unoDrawN()` keeps the top card,
  shuffles the rest back into the deck, and keeps dealing. This is the rarest path
  in the game and the easiest to break.

`phase` is `playing`, `choose_color` (a Wild is on the table and its owner has not
picked yet) or `game_over`. `awaitingPass` + `drawnCardIndex` are how "you drew a
card, now play it or pass" is enforced.

A player who leaves is spliced out of `playerOrder` with the index arithmetic
fixed up around them; if that leaves one player, they win by default.

---

## :brain: Quiz

The one game that *reaches* for the internet, and the only one with a fallback for
when it cannot.

### Tweak it

**The question source** is chosen by `loadQuizQuestions(n, source)`, where `source`
comes from `QUIZ_SOURCE` in the [`.env`](../getting-started/installation.md#configuration-env):

| `source` | What it does |
|----------|--------------|
| `auto` | `fetchQuizQuestions()`, then `quizLocalQuestions()` if that throws |
| `online` | `fetchQuizQuestions()` only — the error propagates and `startQuiz()` sends the room back to the lobby |
| `offline` | `quizLocalQuestions()`, without touching `fetch` at all |

Both paths funnel through `quizBuildQuestion()` and `quizByDifficulty()`, so both
produce the same shape, in the same `easy → medium → hard` order:

```js
{ question, correctAnswer, options: [/* 4, shuffled, includes the answer */], difficulty }
```

Everything downstream (`quizPublic`, `quizReveal`, the client) reads only those
four fields.

**The bundled bank** is `data/quiz-questions.json` — 60 entries, and the only data
file the project has:

```json
{ "difficulty": "easy", "question": "…", "answer": "…", "wrong": ["…", "…", "…"] }
```

The answer is stored apart from the wrong ones rather than as a ready-made option
list, so it can never end up at a predictable index; `quizBuildQuestion()` shuffles
the four together at deal time. `test/quiz.test.js` checks the shape of every entry
— exactly three wrong answers, a known difficulty, no duplicate question — so a
typo fails `npm test` instead of showing four wrong options mid-party.

`quizLocalQuestions(n)` shuffles the bank and takes `n`, capped at the bank size:
a 25-question game (the lobby maximum) never repeats a question, but two
consecutive games from the bank will overlap. Adding questions is the fix, and
costs nothing but the JSON.

**The API URL** is `QUIZ_API_URL`, for pointing at a mirror. The response has to
match the OpenTDB shape (`response_code`, `results[]`, `url3986` encoding).

**The scoring curve** is in `quizReveal()`:

```js
points = Math.round(500 + 500 * (1 - elapsed / gs.timeLimitMs));
if (id === firstCorrectId) points += 200;      // speed bonus
```

500 points for a correct answer at the buzzer, up to 1000 for an instant one, plus
200 for being first. A wrong answer scores nothing — there is no penalty.

`QUIZ_REVEAL_MS` (4 s) is how long the answer stays on screen between questions.

### How it works

`startQuiz()` is the only `async` start function. It emits
`{ phase: 'loading' }` first, then loads: OpenTDB rate-limits hard, so the
fetch retries **4 times, 6 seconds apart**, treating `response_code === 5` as
"try again". If it still fails, `auto` falls back to the bundled bank and the room
is told so (`quiz.offlineBank`); only `online` sends the room back to the lobby.
Either way nobody is left staring at a spinner.

Phases are `loading → question ⇄ reveal → gameover`, each question scheduled by
the previous reveal.

The secret is one field: `quizPublic()` sends `correctAnswer` only once
`phase !== 'question'`. Answers already submitted are echoed back to their own
socket via `quiz:answered`, which is also what a reconnect replays.

A question resolves early as soon as every player in the room has answered — on
both the action path and the disconnect path, since a player leaving can be what
completes the count.

---

## :o: Tic Tac Toe

Two games in one section: a 1v1 duel at two players, a knockout tournament at
three or more. `startTTT()` branches on `players.length >= 3`.

### Tweak it

**Board sizes** are one map, and it is the only place that knows how many symbols
in a row a size needs:

```js
// 5-in-a-row on a 5×5 grid is almost always a draw, so the bigger board keeps
// the 4-in-a-row goal.
const TTT_WIN_LENGTH = { 3: 3, 4: 4, 5: 4 };
```

To offer a 6×6 board: add `6: 4` here, `6` to the `boardSize` list in
`validateSettings()`, an option in `SETTINGS_SCHEMA`, and a `settings.opt.grid6`
label in both language files. Nothing else is size-aware — the board is a flat
array and `tttWin()` takes `size` and `need` as arguments.

**A misère variant** ("align three and you *lose*") is a one-line change in
`tttMove()`: swap who gets credited when `tttWin()` returns a line. It would need
a new setting to be switchable.

### How it works

The board is a flat `size × size` array, so the index of `(r, c)` is
`r * size + c`. `tttWin()` scans from every cell in four directions
(`[[0,1],[1,0],[1,1],[1,-1]]`) and returns the winning line, which the client
uses to light up the cells.

!!! warning "The classic bug this shape invites"

    On a flat array, cells `2` and `3` of a 3×3 board look adjacent but sit on
    different rows. `tttWin()` bounds-checks `nr`/`nc` **before** indexing for
    exactly that reason. `test/tictactoe.test.js` covers the wrap case
    explicitly; keep it if you rewrite the detection.

**Duel mode** (`mode: 'classic'`) keeps `scores`, `gameCount`, `bestOf` and
`matchWinner`. Symbols **swap between games** so the first-move advantage rotates,
and `tttNewGame()` refuses to run unless the current game is actually over —
`new_game` is a host action on a finished board, not a reset button.

**Tournament mode** (`mode: 'tournament'`) is the shared bracket:

```js
buildTournamentRounds(playerIds)   // seeds → rounds of { p1, p2, winner, isBye, phantom }
propagateTournamentWinners(gs)     // winners flow into the next round
advanceTournament(room)            // find the first playable match, or crown a champion
```

Player counts are padded to the next power of two with `null` seeds. A match is
**`isBye`** when one real player has no opponent (they advance for free) and
**`phantom`** when no real player will ever appear in it — that distinction is
what stops the bracket from advancing someone into a match that is still waiting
for a real opponent. `test/tournament.test.js` walks 2 to 16 players.

Rock Paper Scissors uses the same three functions. A regression here breaks both
games, which is why they are tested on their own rather than through either game.

---

## :art: Scribble

In beta. Events are `scribble:`.

### Tweak it

**The word list** is a flat array of about 110 English words:

```js
const WORDS = [
  'apple','banana','castle','dragon','elephant','fireworks','guitar', …
];
```

Add words directly to it. Two things to keep in mind:

- Multi-word entries work (`'race car'`, `'ice cream'`) — `maskWord()` renders a
  space as a double space and never reveals it as a letter.
- Guesses are compared **lowercase and trimmed**, so keep entries lowercase.

For a **per-language word list** (the most requested variant), the word bank has
to move behind a setting: `randWords()` is the only reader, and `startScribble()`
the only place a language setting would need to reach it.

**The hint schedule** is two timers in `scribbleWordChosen()`:

```js
addTimer(room, () => sendHint(room), 40000);   // one letter at 40 s
addTimer(room, () => sendHint(room), 55000);   // another at 55 s
```

Each call reveals one random unrevealed letter to everyone who has not guessed
yet. Note they are **absolute**, not proportional to `drawTime` — on a 40-second
round the first hint never lands.

**Undo** works in *gestures*, which is the only unit that means anything to a
person: the log is flat (`begin, point, point…, end`), so removing the last entry
would rub out one point of a line. `scribbleUndoLast()` walks back to the `begin`
that opened the stroke, or takes a single `fill` / `clear` entry:

```js
const SCB_STANDALONE = ['fill', 'clear'];   // one entry = one gesture
```

Two consequences worth knowing before changing any of it:

- **`clear` is a log entry, not an emptied log.** It used to do
  `gs.drawingData = []`, which made the drawing unrecoverable — and an accidental
  Clear is exactly when undo matters. Replay therefore has to apply it, which is
  the `case 'clear'` in the client's `onRemoteDraw()`.
- **Undo repaints everyone, the drawer included.** A raster canvas cannot un-draw
  a line, so the server sends the whole remaining log as `scribble:redraw` with
  `io.to(room)` — not `socket.to(room)`. That is one full log per undo; fine on a
  LAN, and the only way to keep every canvas in the room identical.

`scribbleActionCount()` rides along on the redraw and on the reconnect payload,
so the drawer's Undo button greys out at the right moment even after a refresh.

**Saving the drawing** is client-only: `drawingAsPng()` composites the canvas onto
a white sheet before `toDataURL()`, because a canvas nobody has cleared yet is
transparent and a transparent PNG reads as black-on-black in most viewers. The
file name carries the word only when that client already knows it — `knownWord` is
set from the drawer's `draw_start`, a correct guess, or the reveal, never from a
payload the client is not supposed to have.

**The scoring curve** is in `handleChat()`, since a guess arrives as a chat
message:

```js
points = Math.round(100 + (remaining / gs.ROUND_DURATION) * 200);   // guesser
gs.scores[drawerId] += 50;                                          // drawer, per correct guess
```

### How it works

The drawer rotates through `gs.drawerOrder`; a full pass is one round, and
`maxRounds` passes end the game. Phases are
`choosing → drawing → round_end → …  → game_over`.

The drawer picks from `wordChoices` random words within **15 seconds**, or the
first one is chosen for them.

Two secrets, handled differently:

- **The word.** `scribble:draw_start` carries `word` to the drawer and `null` to
  everyone else; everyone gets `masked`, the underscore version.
- **The guess.** A correct guess is *not* broadcast as chat — that would tell
  everyone the answer. It becomes a `scribble:guess_event` with
  `correct: true`, and only the guesser is told the word.

Strokes are appended to `gs.drawingData` and relayed with `socket.to(room.code)`
(everyone *except* the sender, who already drew them locally). Keeping the array
is what lets a reconnecting player receive the drawing so far.

**The canvas geometry is the one client-side subtlety.** The bitmap is a fixed
800×500 and strokes travel as fractions of it (`nx`, `ny` in 0–1), so every screen
sees the same drawing whatever its size. The element itself is stretched by the
flex layout and its CSS is `object-fit: contain`, which fits that bitmap inside the
box **without distorting it** — so the drawing is letterboxed, and the element box
is not where the pixels are.

`pointerToBitmap()` in [scribble.js](https://github.com/gogo25171/gamenight/blob/main/public/js/scribble.js)
undoes that fit:

```js
const scale = Math.min(rect.width / bmpW, rect.height / bmpH);
const left  = rect.left + (rect.width  - bmpW * scale) / 2;
const top   = rect.top  + (rect.height - bmpH * scale) / 2;
return { x: (clientX - left) / scale, y: (clientY - top) / scale };
```

Scaling each axis by the box alone — the bug this replaced — put the ink beside the
cursor, further off the closer to an edge you drew. The function takes a rect and
two numbers rather than reading the DOM, precisely so `test/scribble-pointer.test.js`
can check it without a browser; that test also asserts the CSS still says
`contain`, because the maths and the stylesheet have to change together.

A round ends when the timer runs out or when every non-drawer has guessed. If the
**drawer** leaves, the round ends immediately; if the drawer list empties, so does
the game.

---

## :red_circle: Connect Four

In beta. Events are `c4:`.

### Tweak it

**The win length** is a constant, and `c4Win()` takes it as an argument:

```js
const C4_NEED = 4;
```

Set it to 5 for a "Connect Five" variant and the detection follows. The board
sizes come from settings (`cols` 6–9, `rows` 5–7) and the grid is rebuilt on the
client whenever they change, so a new size only needs the three settings places.

**Gravity** is the loop that turns a column click into a cell — the shortest
description of the whole game:

```js
let row = -1;
for (let r = gs.rows - 1; r >= 0; r--)
  if (gs.board[r * gs.cols + col] === null) { row = r; break; }
if (row === -1) return;                      // column is full
```

### How it works

The board is a flat `cols × rows` array indexed `r * cols + c`, with row `0` at
the **top** — which is why the gravity loop counts down. `c4Win()` is the same
four-direction scan as `tttWin()`, with the same reason for bounds-checking
before indexing.

The room's first two players (shuffled) get `R` and `Y`; everyone else is sent
`{ disc: null }` and spectates. Colours **swap after each game**, `scores` and
`gameCount` survive the swap, and `bestOf > 0` ends the match at
`Math.ceil(bestOf / 2)` wins — only that match win reaches `recordResult()`.

`gs.lastMove` exists purely so the client can animate the disc that just dropped,
and `gs.winLine` so it can light up the four winning cells.

!!! note "Known beta gap"

    `onPlayerDisconnect` for Connect Four only emits `c4:player_left`. The board
    is left exactly as it was and there is no forfeit — the host has to take the
    room back to the lobby. Tic Tac Toe's duel mode behaves the same way; its
    tournament mode, by contrast, advances the opponent.

---

## :detective: Undercover

In beta. Events are `uc:`.

### Tweak it — adding word pairs

This is the one every host wants. The list is at the top of the section, and the
order inside each pair matters:

```js
// Civilian word first, undercover word second — close enough to be mistaken for
// one another, far enough apart that a careless clue gives the impostor away.
const UC_WORD_PAIRS = [
  ['Coffee','Tea'], ['Cat','Dog'], ['Pizza','Burger'], ['Beach','Desert'],
  …
];
```

Append your own pairs and restart the server. That is the whole change — nothing
else reads the list, there is no count to update, and the game picks one pair at
random per game.

Four things to get right:

1. **Pick words from the same category** — `Wolf`/`Fox`, not `Wolf`/`Tuesday`. If
   a single clue cannot plausibly fit both words, the impostor is found on the
   first round and the game is over.
2. **Do not make them synonyms either.** `Sofa`/`Couch` is unplayable: every clue
   fits both, so the impostor can never slip.
3. **Which word is the civilian one is randomised at play time**, so both
   orderings will happen:

    ```js
    const [civWord, ucWord] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
    ```

    Write pairs that work in both directions rather than relying on the order.

4. **Keep them one word, capitalised like the existing entries.** Mr White's guess
   is compared case-insensitively (`clean.toLowerCase() === gs.civilianWord.toLowerCase()`),
   but only exactly — no fuzzy match, no plural tolerance. A two-word entry makes
   that guess much harder than intended.

Translating the pairs is not supported: the list is server-side, shared by the
whole room, and the room has no single language. A `language` setting feeding
per-language pair lists is the natural fix.

### Tweak it — the rest

| What | Where |
|------|-------|
| Mr White's guess window (25 s) | `UC_WHITE_GUESS_MS` |
| Clue length cap (24 chars) | `.slice(0, 24)` in `ucSubmitClue()` — and `maxlength` on the input in `index.html` |
| Empty-clue placeholder (`—`) | same line |
| Role counts, timers | settings: `undercoverCount`, `mrWhite`, `clueTime`, `votingTime` |

### How it works

Role assignment is the part with the sharp edge, in `startUC()`:

```js
// The impostor side must never start at parity, or the game is over on turn one.
const maxImpostors = Math.max(1, Math.floor((players.length - 1) / 2));
const withWhite = (room.settings?.mrWhite ?? 1) === 1 && players.length >= 5;
const ucCount = Math.max(1, Math.min(room.settings?.undercoverCount ?? 1,
                                     maxImpostors - (withWhite ? 1 : 0)));
```

The host's choice is **clamped silently**: Mr White needs 5 players, a second
undercover alongside Mr White needs 7. Nothing tells the host in the lobby — a
gap worth closing before the game leaves beta.

Phases, each scheduled by the previous:

```text
role_reveal ─7s→ clues ──(one speaker at a time)──→ voting ──→ vote_result
                   ↑                                              │
                   │                            Mr White out? → white_guess
                   └──────── +4.5s, round++ ←─────────────────────┘
                                                    win? → game_over
```

`ucStartClues()` rotates the opening speaker by `(round - 1) % alive.length`, so
nobody gives the blind first clue twice. `ucNextSpeaker()` skips dead players and
falls through to voting when the order is exhausted — it is also what a
disconnect calls, so a departure never leaves the table waiting on a speaker who
is gone.

The secret model has two halves:

- **The word** goes out with `uc:word` per socket, never in a broadcast.
- **The role** is in `ucPublic()` but nulled while its owner is alive:

    ```js
    const reveal = over || !p.alive;
    role: reveal ? p.role : null, word: reveal ? p.word : null,
    ```

`ucResolveVote()` treats a tie as **nobody eliminated**. `ucCheckWin()` runs after
every elimination: no impostors left means the civilians win, impostors at parity
with civilians means the impostors win, and Mr White naming the civilian word wins
alone and instantly.

Dead players are muted in `handleChat()`, and so is everyone during
`role_reveal` — but `white_guess` is checked in `ucAction()` **before** the
`alive` test, because guessing is the one thing a dead player may still do.

---

## :scissors: Rock Paper Scissors

In beta. Events are `rps:`.

### Tweak it

**The moves are two constants** — a table of what beats what, not a chain of
`if`s. Adding moves is genuinely small:

```js
const RPS_MOVES = ['rock', 'paper', 'scissors'];
const RPS_BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
```

For Rock Paper Scissors Lizard Spock, each move beats *two* others, so `RPS_BEATS`
becomes `move → [beaten, beaten]` and the one comparison in `rpsResolveRound()`
follows:

```js
const roundWinner = a === b ? null : (RPS_BEATS[a] === b ? m.p1 : m.p2);
```

You would also need a button and an emoji per move in `public/js/rps.js`, plus
`rps.move.*` labels in both language files.

**The pacing** is two constants and one setting:

| What | Where | Default |
|------|-------|---------|
| How long the reveal stays up | `RPS_REVEAL_MS` | 2800 ms |
| Pause before the next match | `RPS_REVEAL_MS + 1400` in `rpsResolveRound()` | ~4.2 s |
| Pause once both have thrown | `addTimer(…, 500)` in `rpsAction()` | 500 ms |
| Time to throw | `roundTime` setting | 12 s |

### How it works

The bracket is Tic Tac Toe's — `buildTournamentRounds()` and
`propagateTournamentWinners()` — with `rpsAdvance()` playing the part of
`advanceTournament()`: propagate, crown the champion if the final has a winner,
otherwise find the first match with two real players and start it.

A match is `{ p1, p2, scores, roundNo, phase, picks, matchWinner }`, and a round
walks `picking → reveal`, either when both players have thrown or when the timer
expires.

Two behaviours to preserve if you touch this:

- **A missing throw is filled in at random.** One distracted player never stalls
  the whole bracket.

    ```js
    [m.p1, m.p2].forEach(id => { if (!m.picks[id])
      m.picks[id] = RPS_MOVES[Math.floor(Math.random() * RPS_MOVES.length)]; });
    ```

- **Only the *fact* of a throw is public** while the round is live. `rpsPublic()`
  sends `thrown: { [p1]: true/false, … }` and withholds `result` until the phase
  is `reveal`. The thrower's own pick is echoed back to them alone with
  `rps:confirmed` — which is also how a reconnect gets it back.

A tie scores nothing and replays the round. `matchWinner` is whoever reaches
`Math.ceil(bestOf / 2)`, and only the tournament champion is credited in
`recordResult()`.

A player who leaves **during their own match** hands the match to their opponent
and the bracket carries on; leaving from anywhere else just removes them from
`allPlayers`.

---

## Testing a change to any of this

```bash
npm test              # 128 tests, ~30 s, no dependencies
npm run i18n:check    # en/fr parity
node --check server.js
```

The suite drives the real functions, so a game change usually needs no new
scaffolding — [`test/helpers.js`](https://github.com/gogo25171/gamenight/blob/main/test/helpers.js)
builds a room by hand and hands you the exports.

Two rules, learned the hard way:

- **Step the phase machines, never wait on them.** Call `ucStartClues(room)` or
  `rpsResolveRound(room)` directly; a clue round is 30 real seconds. Any test that
  starts a game must end with `stopTimers(room)`, or the pending `setTimeout`
  keeps the runner alive forever.
- **Pick players by role, never by position.** Roles, words and hands are dealt at
  random, so `find(p => p.role === 'civilian')` passes every run and `players[0]`
  passes four out of five.

Then play it. Manual multiplayer is still the only real check: run the server,
open several windows on the same room code, and try a mid-game refresh, a player
leaving, play-again, and the spectator view.
