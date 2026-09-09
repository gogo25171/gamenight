# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Player documentation for the three beta games: Connect Four, Undercover and
  Rock Paper Scissors, each with rules, settings and notes
- `docs/development/game-internals.md`: a technical section per game — how to
  customise it first (Undercover word pairs, Scribble words, the UNO deck, the
  Quiz question source, board sizes, RPS moves), then how it works inside
- A `Night time` lobby setting for Mongolpuri, which had a server default but no
  control to change it
- Documentation and README sections pointing at the bug-report, feature-request
  and new-game issue forms
- Regression tests for each fix below, plus a check that every server setting
  default has a lobby control and that every beta game is flagged on all three
  of its surfaces
- Docker support: multi-stage `Dockerfile` on `node:20-alpine` and a
  `docker-compose.yml` with an `mdns` profile for host networking
- GitHub Actions CI: syntax checks on Node 18/20/22, tournament test,
  dependency audit, Docker build, docs build
- Trivy security workflow scanning the repository and the container image
  for vulnerabilities, secrets and misconfigurations, with results in the
  code scanning tab and a weekly scheduled run
- Documentation site built with MkDocs Material and published to GitHub Pages
- `pre-commit` hooks for whitespace, YAML/JSON validation and JavaScript syntax
- Commitizen: Conventional Commits enforced by a `commit-msg` hook and by CI,
  with `cz bump` driving version bumps and this changelog
- `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue and
  pull request templates
- `TODO.md` listing candidate games and the checklist for adding one

### Removed

- `test-tournament.js`, superseded by `test/tournament.test.js`, which tests the
  real bracket functions instead of its own copy of them

### Fixed

- Connect Four and Tic Tac Toe accepted a `new_game` action from any player at
  any time, so a live board could be wiped mid-game. It is now host-only and only
  once the current game has finished
- Undercover was the only beta game with no `BETA` badge inside its own view

### Security

- Updated `socket.io-parser`, resolving a high-severity memory-exhaustion
  advisory ([GHSA-2m8v-j782-fhvr](https://github.com/advisories/GHSA-2m8v-j782-fhvr))
  reachable from any connected client

## [1.0.0]

### Added

- Mongolpuri — social deduction with hidden Killer, Doctor and Villager roles
- UNO — standard rules with skips, reverses, draw-twos and wild cards
- Quiz — trivia fetched from the Open Trivia Database, scored by speed
- Tic Tac Toe — match formats and single-elimination tournaments
- Scribble — shared drawing canvas with guessing chat
- Room codes, invite links, 100 avatars, remembered preferences
- Reconnect support, spectator mode, per-game host settings
- mDNS advertising so the server is reachable at `gamenight.local`
