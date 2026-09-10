# Architecture

GameNight is deliberately small: one Node process, no database, no build step,
no front-end framework.

## Layout

```text
gamenight/
├── server.js            # All game logic + Socket.io events
├── config.js            # The only reader of process.env / .env
├── .env.example         # Every variable, documented, with its default
├── data/
│   └── quiz-questions.json  # Offline Quiz bank
├── public/
│   ├── index.html       # Single-page app shell
│   ├── style.css        # Dark theme, animations
│   └── js/
│       ├── app.js           # Socket setup · lobby · views · avatars · settings
│       ├── killerdoctor.js  # Mongolpuri client UI
│       ├── tictactoe.js     # Tic Tac Toe client UI
│       ├── scribble.js      # Scribble canvas + chat
│       ├── uno.js           # UNO client UI
│       ├── quiz.js          # Quiz client UI
│       ├── connect4.js      # Connect Four client UI
│       ├── undercover.js    # Undercover client UI
│       ├── rps.js           # Rock Paper Scissors client UI
│       ├── i18n.js          # Per-player language switching
│       └── i18n/            # en.json · fr.json
├── test/                 # node --test suite, no framework
├── docs/                # This site
├── Dockerfile
└── docker-compose.yml
```

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js 18+ |
| HTTP server | Express |
| Realtime | Socket.io (WebSockets) |
| Drawing | HTML5 Canvas API |
| Frontend | Vanilla JS, plain CSS, no framework |

## State model

Everything lives in memory, in two maps at the top of `server.js`:

```js
const rooms = new Map();        // roomCode -> room
const playerRooms = new Map();  // socketId -> roomCode
```

A room holds its players, the game type, the host, the settings, the timers and
a `gameState` object whose shape is entirely up to the game.

!!! warning "There is no persistence"

    Restarting the server ends every game in progress. This is a deliberate
    trade-off: no database, no migrations, no cleanup job. If you are adding a
    feature that needs to survive a restart, expect to argue for it first.

## The single-page front end

`index.html` contains every screen as a `<div class="view">`. Exactly one is
visible at a time:

```js
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${id}`)?.classList.add('active');
}
```

Each game gets one client module exposing an `onState()` function. `app.js`
wires socket events to it:

```js
App.socket.on('ttt:state', data => { showView('tictactoe'); TicTacToe.onState(data); });
```

Socket event names are namespaced per game: `ttt:`, `kd:`, `uno:`, `quiz:`,
`scribble:`.

## Server dispatch

`server.js` keeps generic room handling separate from game logic. Seven
functions switch on `room.gameType` and are the complete set of hooks a game
plugs into:

| Function | Role |
|----------|------|
| `defaultSettings()` | Initial settings for a new room |
| `validateSettings()` | Rejects anything the host did not legitimately send |
| `minPlayers()` | Minimum players before the game can start |
| `restartGame()` | Maps the game type to its `start*` function |
| `handleAction()` | Routes a player action to the game's handler |
| `sendReconnectState()` | Rebuilds a client's view after a refresh |
| `onPlayerDisconnect()` | Decides what a departure means for the game |

Below those, each game has its own banner-delimited section with `start*`,
`*Action`, `*Public` and `end*` functions. [Game internals](game-internals.md)
walks all eight of them — what each one keeps in `gameState`, and which constant
to edit to change its words, cards or questions.

!!! note "Trust nothing from the client"

    `validateSettings()` is an allow-list: an unknown or out-of-range value is
    dropped, not clamped. Game state that must stay secret — a Mongolpuri role,
    the Scribble word, a Quiz answer — is never included in the public state
    object. The `*Public()` functions exist precisely to build the version of
    the state that is safe to broadcast.

## Timers

Timers are registered per room through `addTimer()` and cleared with
`clearTimers()`, so a room that empties out never leaves a stray interval
running. Always use them instead of a bare `setTimeout`.

## Networking

The server listens on `HOST` (default `0.0.0.0`) and advertises itself over mDNS as
`MDNS_HOST` (default `gamenight.local`) using `bonjour-service`. `SIGINT` and
`SIGTERM` unpublish the mDNS record before exiting. `MDNS_ENABLED=false` skips the
announcement entirely, which is the sensible setting behind a bridge network.

Nothing else leaves the LAN. The Quiz *asks* opentdb.com for questions and falls
back to `data/quiz-questions.json` when it cannot reach it, so even that is not a
dependency — see [game internals](game-internals.md).

## Configuration

`config.js` is the only module that reads `process.env`. It loads `.env` if there
is one (without overriding a variable already set), validates every value, and
**refuses to start** on a value it does not understand rather than falling back to
a default the operator did not choose. Everything else imports the resolved
`config` object.

Adding a knob means adding it in three places, and `test/config.test.js` fails if
the last one is forgotten:

1. a reader in `buildConfig()`
2. a line in `.env.example`, with its default and what it does
3. a row in the table in [installation](../getting-started/installation.md#configuration-env)

## Known debt

`server.js` is close to 2 000 lines and holds all eight games. Splitting it into
`games/<name>.js` modules is on the [roadmap](https://github.com/gogo25171/gamenight/blob/main/TODO.md)
and should happen before many more games are added.
