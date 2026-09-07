## What does this change?

<!-- One or two sentences. Link the issue it closes: Closes #123 -->

## Type of change

- [ ] Bug fix
- [ ] New game
- [ ] New feature in an existing game
- [ ] Documentation
- [ ] Infrastructure (CI, Docker, tooling)

## How was it tested?

<!-- Player counts, browsers, devices. "Tested with 4 players in two browsers" is fine. -->

## Checklist

- [ ] `node --check` passes on every file I touched
- [ ] `node test-tournament.js` still passes
- [ ] `pre-commit run --all-files` is clean
- [ ] I tested reconnecting mid-game (refresh the page)
- [ ] I tested a player leaving mid-game
- [ ] `README.md` and `docs/` are updated if behaviour changed
- [ ] `CHANGELOG.md` has an entry under `[Unreleased]`

## For a new game only

- [ ] All seven server integration points are wired (see [TODO.md](../blob/main/TODO.md))
- [ ] Game card, view, rules tab, script tag and settings schema are added on the client
- [ ] The game is listed in `README.md` and the games badge is bumped
