# Contributing to GameNight

Thanks for taking the time to contribute! GameNight is a small, dependency-light
project — vanilla JS on the front end, Express + Socket.io on the back end — so
getting started should take only a couple of minutes.

## Getting started

```bash
git clone https://github.com/gogo25171/gamenight.git
cd gamenight
npm install
npm run dev        # nodemon, restarts on save
```

Open <http://localhost:4000>. To test multiplayer, open a second browser window
(or a phone on the same WiFi) and join with the room code.

With Docker:

```bash
docker compose up -d --build
```

## Development setup

Install the pre-commit hooks once after cloning:

```bash
pip install pre-commit
pre-commit install
```

The hooks run automatically on `git commit`. To check the whole tree by hand:

```bash
pre-commit run --all-files
```

## Project layout

| Path | Role |
|------|------|
| `server.js` | Every game's server-side logic plus all Socket.io events |
| `public/index.html` | Single-page shell: game cards, one `<div class="view">` per game, rules modal |
| `public/js/app.js` | Socket setup, lobby, view switching, avatars, settings schema |
| `public/js/<game>.js` | One client module per game |
| `public/style.css` | Dark theme and animations, no framework |
| `docs/` | MkDocs sources published to GitHub Pages |

## Adding a game

[TODO.md](TODO.md) holds a full checklist of every integration point, with line
numbers. The short version: a game must be registered in `defaultSettings()`,
`validateSettings()`, `minPlayers()`, `restartGame()`, `handleAction()`,
`sendReconnectState()` and `onPlayerDisconnect()` on the server, then get a game
card, a view, a rules tab, a script tag, a client module and a settings schema
entry on the client.

Before opening a PR for a new game, check all four by hand:

- reconnecting mid-game (refresh the page)
- a player leaving mid-game
- the "play again" flow
- spectators, if the game eliminates players

## Coding style

There is no linter or formatter config — match the surrounding code:

- 2-space indent, semicolons, single quotes
- `camelCase` for variables and functions, prefixed per game (`unoPlayCard`,
  `kdAction`, `scribbleAction`)
- Section banners in `server.js` (`// ────────── UNO ──────────`) separate games
- Comments explain *why*, not *what*
- Keep the front end dependency-free: no framework, no build step

## Commit messages

Write a short imperative subject line under ~70 characters, then a blank line
and a body if the change needs explaining.

```
Add Connect Four with tournament support

Reuses the tictactoe bracket so byes and phantom matches behave
identically. Board is 7x6 and win detection scans four directions.
```

## Pull requests

1. Fork and branch off `main` — one topic per branch.
2. Make sure `node --check` passes on every file you touched and
   `node test-tournament.js` still succeeds.
3. Run `pre-commit run --all-files`.
4. Update `README.md` and `docs/` if you changed behaviour, and bump the games
   count badge if you added a game.
5. Open the PR and fill in the template.

CI runs on every push and pull request: syntax checks across Node 18/20/22, the
tournament test, an `npm audit`, a Docker image build, and a docs build.

## Reporting bugs

Open an issue with the bug report template. Multiplayer bugs are much easier to
fix with the number of players, the game, and the exact sequence of actions.

## Security

Do not open a public issue for a security problem — see [SECURITY.md](SECURITY.md).
