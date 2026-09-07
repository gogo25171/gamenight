# Architecture

GameNight is deliberately small: one Node process, no database, no build step,
no front-end framework.

## Layout

```text
gamenight/
├── server.js            # All game logic + Socket.io events
├── public/
│   ├── index.html       # Single-page app shell
│   ├── style.css        # Dark theme, animations
│   └── js/
│       ├── app.js           # Socket setup · lobby · views · avatars · settings
│       ├── killerdoctor.js  # Mongolpuri client UI
│       ├── tictactoe.js     # Tic Tac Toe client UI
│       ├── scribble.js      # Scribble canvas + chat
│       ├── uno.js           # UNO client UI
│       └── quiz.js          # Quiz client UI
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
`*Action`, `*Public` and `end*` functions.

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

The server listens on `0.0.0.0` and advertises itself over mDNS as
`gamenight.local` using `bonjour-service`. `SIGINT` and `SIGTERM` unpublish the
mDNS record before exiting.

## Known debt

`server.js` is over 1 300 lines and holds all five games. Splitting it into
`games/<name>.js` modules is on the [roadmap](https://github.com/gogo25171/gamenight/blob/main/TODO.md)
and should happen before many more games are added.
