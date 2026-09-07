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

## Changing the port

The server reads the `PORT` environment variable and defaults to `4000`.

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
