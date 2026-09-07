# Security Policy

## Scope

GameNight is designed to run on a **trusted local network** — a living room, a
LAN party, a home WiFi. It has no accounts, no authentication and no encryption,
and it is deliberately simple: anyone who can reach the port can create or join
a room.

**Do not expose a GameNight server directly to the internet.** If you need
remote play, put it behind a VPN or an authenticating reverse proxy.

Given that model, the following are **known and accepted**, not vulnerabilities:

- No authentication — knowing a 6-letter room code is enough to join
- No transport encryption — plain HTTP and WebSocket over the LAN
- Players choose their own display name, which other players can see
- The host can start, restart and configure the game for everyone

## What we do want to hear about

- Remote code execution, path traversal, or anything reading files outside `public/`
- A crash that any client can trigger on the server (a malformed Socket.io payload
  that takes down the process is a real bug — it ends the game for everyone)
- Cross-site scripting through a player name, chat message, or drawing payload
- A client obtaining information it should not have — for example reading another
  player's secret role in Mongolpuri, or the Scribble word before guessing it
- Dependency vulnerabilities that are actually reachable from this code

## Reporting

Report privately, not in a public issue:

- Use [GitHub's private vulnerability reporting](https://github.com/gogo25171/gamenight/security/advisories/new)
  (**Security → Report a vulnerability** on the repository)

Please include what you were doing, what happened, and the smallest sequence of
steps that reproduces it.

## Response

This is a hobby project maintained in spare time — expect a first reply within
a couple of weeks. Fixes ship on `main`; there is no backport or LTS branch.

## Supported versions

Only the latest commit on `main` is supported.
