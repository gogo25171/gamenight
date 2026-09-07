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
npm test           # the unit test suite (node --test), a few seconds
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
pip install pre-commit commitizen
pre-commit install
```

That installs both the `pre-commit` and `commit-msg` hooks, so commit messages
are validated too.

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

This repository follows [Conventional Commits](https://www.conventionalcommits.org),
enforced by [Commitizen](https://commitizen-tools.github.io/commitizen/).

Rather than writing the format by hand, let the prompt build it:

```bash
pip install commitizen
git add .
cz commit          # or: cz c
```

The result looks like this:

```text
feat(connect4): add Connect Four with tournament support

Reuses the tictactoe bracket so byes and phantom matches behave
identically. Board is 7x6 and win detection scans four directions.

Closes #42
```

### Types

| Type | Use it for |
|------|-----------|
| `feat` | A new game, or a new capability in an existing one |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace — no behaviour change |
| `refactor` | Restructuring that neither fixes a bug nor adds a feature |
| `perf` | A performance improvement |
| `test` | Adding or correcting tests |
| `build` | Dependencies, `package.json`, the Dockerfile |
| `ci` | Workflows and tooling configuration |
| `chore` | Anything else |

Useful scopes: a game (`mongolpuri`, `uno`, `quiz`, `tictactoe`, `scribble`) or
an area (`lobby`, `room`, `avatars`, `settings`, `docker`, `docs`, `deps`).

A breaking change gets a `!` after the type — `feat(room)!: ...` — and a
`BREAKING CHANGE:` paragraph in the body.

The `commit-msg` hook rejects a message that does not parse, and CI re-checks
every commit in a pull request. If a commit is already written, amend it with
`git commit --amend` rather than adding a fix-up commit.

### Releases

Because the history is machine-readable, releasing is one command:

```bash
cz bump            # bumps package.json, updates CHANGELOG.md, creates the tag
git push --follow-tags
```

The version bump is derived from the commits since the last tag: a `fix` gives a
patch, a `feat` a minor, a breaking change a major. Pushing the tag triggers
`release.yml`, which publishes the container image.

## Pull requests

1. Fork and branch off `main` — one topic per branch.
2. Make sure `npm test` passes and `node --check` is clean on every file you
   touched. If you changed game logic, add a test for it in `test/`.
3. Run `pre-commit run --all-files`.
4. Update `README.md` and `docs/` if you changed behaviour, and bump the games
   count badge if you added a game.
5. Open the PR and fill in the template.

CI runs on every push and pull request: syntax checks across Node 18/20/22, the
unit test suite, the language-file check, an `npm audit`, a Docker image build, a
docs build, and Trivy scans of both the repository and the container image. The
test suite and the language check also run as pre-commit hooks, so they fail on
your machine before they fail in CI.

## Reporting bugs

Open an issue with the bug report template. Multiplayer bugs are much easier to
fix with the number of players, the game, and the exact sequence of actions.

## Security

Do not open a public issue for a security problem — see [SECURITY.md](SECURITY.md).
