# Installation

## Requirements

- [Node.js 18 or newer](https://nodejs.org/en/download)
- A browser on every device that will play

## Install

```bash
git clone https://github.com/gogo25171/gamenight.git
cd gamenight
npm install
```

## Run

=== "Any platform"

    ```bash
    npm start
    ```

=== "Windows"

    Double-click `start.bat`, or run it from a terminal.

=== "macOS / Linux"

    ```bash
    ./start.sh
    ```

=== "Development"

    ```bash
    npm run dev   # nodemon, restarts on save
    ```

Open <http://localhost:4000>.

## What you should see

```text
🎮  GameNight is live!

  Local:    http://localhost:4000
  Network:  http://gamenight.local:4000  ← share with friends!

  Open in any browser on the same WiFi / LAN.
```

## Configuration (`.env`)

Every setting has a working default, so GameNight runs with no configuration at
all. To change one, copy the committed example and edit it:

```bash
cp .env.example .env
```

`.env` is read at startup by `config.js`, so it applies however you launch —
`npm start`, `start.bat`, `check-and-start.ps1` or `docker compose`. The
`check-and-start` scripts offer to create it for you. It is gitignored: your
settings stay yours.

| Variable | Default | What it does |
|----------|---------|--------------|
| `PORT` | `4000` | Port the server listens on |
| `HOST` | `0.0.0.0` | Interface to bind. `127.0.0.1` = this machine only |
| `MDNS_ENABLED` | `true` | Advertise `gamenight.local` over Bonjour |
| `MDNS_HOST` | `gamenight.local` | The name advertised |
| `QUIZ_SOURCE` | `auto` | `auto`, `online` or `offline` — see [Quiz](../games/quiz.md#where-the-questions-come-from) |
| `QUIZ_API_URL` | opentdb.com | Trivia API, for pointing at a mirror |

A value that makes no sense stops the server with a message naming the variable,
rather than starting half-broken:

```text
✗ Bad configuration: PORT="four thousand" is not valid — expected a port
  between 1 and 65535. See .env.example.
```

## Changing the port

Either put `PORT=8080` in `.env`, or set the variable for one run — an
environment variable always wins over the file:

=== "macOS / Linux"

    ```bash
    PORT=8080 npm start
    ```

=== "Windows (PowerShell)"

    ```powershell
    $env:PORT = 8080; npm start
    ```

## Troubleshooting

??? question "Port 4000 is already in use"

    Another process holds the port. Either stop it or start GameNight on a
    different port with the `PORT` variable above.

??? question "Friends on the same WiFi cannot reach the server"

    The server listens on `0.0.0.0`, so this is almost always a firewall. Allow
    Node.js through it, and confirm every device is on the same network — guest
    WiFi networks usually isolate clients from one another. See
    [Network play](network.md).

??? question "The Quiz never loads its questions"

    The Quiz fetches from [Open Trivia Database](https://opentdb.com), so it is
    the one game that needs internet access when it starts. The API also rate-limits,
    which can stretch loading to a few seconds.
