# Contributing

The full guide lives in
[CONTRIBUTING.md](https://github.com/gogo25171/gamenight/blob/main/CONTRIBUTING.md)
at the root of the repository. This page is the short version.

## Set up

```bash
git clone https://github.com/gogo25171/gamenight.git
cd gamenight
npm install
npm run dev
```

Then install the hooks:

```bash
pip install pre-commit commitizen
pre-commit install
```

## Hooks

`pre-commit` runs on every commit:

| Hook | What it catches |
|------|-----------------|
| `trailing-whitespace`, `end-of-file-fixer`, `mixed-line-ending` | Whitespace and CRLF noise |
| `check-yaml`, `check-json` | Broken workflow and config files |
| `check-merge-conflict`, `detect-private-key` | Conflict markers and leaked keys |
| `node --check` | JavaScript syntax errors, before they reach a game night |
| `tournament bracket test` | Bracket regressions, when `server.js` changes |
| `actionlint` | Mistakes in GitHub Actions workflows |
| `hadolint` | Dockerfile problems |
| `markdownlint` | Malformed Markdown |
| `commitizen` | A commit message that does not follow Conventional Commits |

Run everything by hand at any time:

```bash
pre-commit run --all-files
```

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org), built for you by
Commitizen:

```bash
git add .
cz commit
```

Full list of types and scopes in
[CONTRIBUTING.md](https://github.com/gogo25171/gamenight/blob/main/CONTRIBUTING.md#commit-messages).

## Style

There is no linter config — match the surrounding code. Two-space indent,
semicolons, single quotes, `camelCase` prefixed per game (`unoPlayCard`,
`kdAction`). Comments explain *why*. The front end stays dependency-free.

## Testing multiplayer

Open a second browser window, or a phone on the same WiFi, and join with the
room code. Always test these four before opening a pull request:

- reconnecting mid-game
- a player leaving mid-game
- play again
- spectators, if the game eliminates players

## Where to start

[TODO.md](https://github.com/gogo25171/gamenight/blob/main/TODO.md) lists
candidate games ranked by how much work they need. Connect Four is the easiest
first contribution — it reuses the Tic Tac Toe tournament bracket almost
unchanged.
