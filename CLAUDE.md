# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

GameNight is a self-hosted LAN party-game server: one Node process, no database,
no build step, no front-end framework. Eight games (Mongolpuri, UNO, Quiz,
Tic Tac Toe, Scribble, Connect Four, Undercover, Rock Paper Scissors) all live in
a single `server.js` and are driven over Socket.io. Everything the app renders is
static files served from `public/`.

The last three ship behind a `BETA` badge — `BETA_GAMES` in
[app.js](public/js/app.js) is the single list that drives the badge on the home
card and in the lobby.

## Commands

```bash
npm install
npm start                  # node server.js  → http://localhost:4000
npm run dev                # nodemon, restarts on save
node test-tournament.js    # the only test: tournament bracket logic, 3–8 players
node --check <file.js>     # syntax check — CI runs this over every .js outside node_modules
pre-commit run --all-files # full hook suite (pip install pre-commit commitizen; pre-commit install)
docker compose up -d --build
mkdocs build --strict      # docs; pip install -r requirements-docs.txt first
```

There is no test runner and no linter/formatter for JS. `test-tournament.js` is a
standalone script that duplicates the bracket functions from `server.js` — if you
change `buildTournamentRounds` / `propagateTournamentWinners` in `server.js`, the
copies in the test must be updated in step or the test silently tests dead code.

Manual multiplayer testing is the norm: run the server and open several browser
windows against the room code.

## Architecture

### State

Two in-memory maps at the top of [server.js](server.js):

```js
const rooms = new Map();        // roomCode -> room
const playerRooms = new Map();  // socketId -> roomCode
```

Nothing persists. A restart ends every game in progress; that is deliberate.

Timers are registered per room with `addTimer(room, fn, ms)` and torn down with
`clearTimers(room)` — never a bare `setTimeout`, or an emptied room leaves stray
timers running.

### Server dispatch

Generic room handling is separate from game logic. Seven functions switch on
`room.gameType` and are the complete set of hooks a game plugs into:

| Function | Role |
|----------|------|
| `defaultSettings()` | Initial settings for a new room |
| `validateSettings()` | Allow-list for host-sent settings — unknown/out-of-range values are **dropped, not clamped** |
| `minPlayers()` | Minimum players before start |
| `restartGame()` | Maps game type → its `start*` function |
| `handleAction()` | Routes `game:action` to the game's `*Action()` |
| `sendReconnectState()` | Rebuilds a client's view after a refresh, private state included |
| `onPlayerDisconnect()` | Decides what a departure means for that game |

Below those, each game owns a banner-delimited section
(`// ────────── UNO ──────────`) with `start*`, `*Action`, `*Public` and `end*`.

**Secrets never enter the public state.** A Mongolpuri role, the Scribble word,
the Quiz answer: `*Public()` builds the broadcast-safe shape; private data goes
to the one socket that owns it (`socket.emit`, not `io.to(room)`).

### Client

`public/index.html` is a single-page shell holding every screen as a
`<div class="view">`; `showView(id)` toggles exactly one active. Each game has
one module in `public/js/<game>.js` exposing `onState()` (plus game-specific
handlers), and [app.js](public/js/app.js) wires socket events to it:

```js
App.socket.on('ttt:state', data => { showView('tictactoe'); TicTacToe.onState(data); });
```

Socket events are namespaced per game: `ttt:`, `kd:` (Mongolpuri is
`killerdoctor` internally), `uno:`, `quiz:`, `scribble:`, `c4:` (Connect Four),
`uc:` (Undercover), `rps:`. Room-level events use `room:`, `lobby:`, `game:`,
`chat:`.

`SETTINGS_SCHEMA` in [app.js](public/js/app.js#L69) renders the lobby controls.
Its options must match what `validateSettings()` accepts, or the host picks a
value the server silently discards.

### Adding a game

[docs/development/adding-a-game.md](docs/development/adding-a-game.md) walks the
seven server hooks and the seven client touch points;
[TODO.md](TODO.md#L142) has the same checklist with current line numbers. The
most-forgotten steps are `sendReconnectState()` and the `gameNames` map in
[app.js:533](public/js/app.js#L533). Verify by hand: mid-game reconnect, a
player leaving mid-game, play-again, and spectator view.

### Networking

Listens on `0.0.0.0` and advertises `gamenight.local` over mDNS via
`bonjour-service`; `SIGINT`/`SIGTERM` unpublish the record before exit. Port
comes from `PORT` (default 4000). The Quiz fetches questions from opentdb.com at
game start — it is the one feature that needs internet, with a retry loop for
rate limiting.

## Conventions

- 2-space indent, semicolons, single quotes, `camelCase` prefixed per game
  (`unoPlayCard`, `kdAction`, `scribbleAction`). Match surrounding code.
- Front end stays dependency-free — no framework, no build step, no bundler.
- Comments explain *why*, not *what*.
- LF everywhere except `.bat`/`.ps1`, which must stay CRLF (see `.gitattributes`).
- `public/js/i18n/en.json` and `fr.json` are flat key→string maps and must stay
  key-for-key identical; a key missing from `fr.json` silently falls back to
  English. Plural forms use the `key_one` / `key_other` suffix with a `count` param.
- `site/` is generated MkDocs output and is gitignored; edit `docs/` instead.
  `README.md` is excluded from markdownlint (upstream-owned).

## Commits and releases

Conventional Commits, enforced by Commitizen in the `commit-msg` hook and
re-checked over the whole PR range in CI. Prefer `cz commit` over writing the
header by hand. Scopes that mean something here: `mongolpuri`, `uno`, `quiz`,
`tictactoe`, `scribble`, `connect4`, `undercover`, `rps`, `i18n`, `lobby`,
`room`, `avatars`, `settings`, `docker`, `docs`, `deps`. Amend a bad message rather than adding a fix-up commit.

`cz bump` bumps `package.json` + `CHANGELOG.md` and tags; `release.yml` refuses
to publish when the tag and `package.json` disagree.

CI (`ci.yml`) additionally enforces: the Dockerfile's Node major and
`engines.node`'s minimum must both appear in the test matrix (`'18' '20' '22'`),
`npm ci --dry-run` (lockfile in sync), `npm audit --omit=dev --audit-level=high`,
a Docker build that must serve `/`, and `security.yml` runs Trivy on the repo and
the image, failing on fixable HIGH/CRITICAL.
