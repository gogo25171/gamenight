# Docker

## Quick start

```bash
docker compose up -d --build
```

The server is then on port 4000 of the host. Share
`http://<your-machine-ip>:4000` with everyone on the network.

```bash
docker compose logs -f      # follow the logs
docker compose down         # stop
```

## The image

The [`Dockerfile`](https://github.com/gogo25171/gamenight/blob/main/Dockerfile)
is a two-stage build on `node:20-alpine`:

1. A `deps` stage runs `npm ci --omit=dev`, so `nodemon` never reaches the final image.
2. The runtime stage copies `node_modules`, `server.js`, `package.json` and `public/`.

It runs as the unprivileged `node` user, exposes `4000`, and declares a
healthcheck that fetches `/` every 30 seconds.

Build it on its own if you prefer:

```bash
docker build -t gamenight .
docker run -d -p 4000:4000 --name gamenight gamenight
```

## mDNS and the two compose services

!!! warning "mDNS does not cross a bridge network"

    The server advertises itself as `gamenight.local` over mDNS. Inside the
    default bridge network that announcement never reaches your LAN, so
    `gamenight.local` will not resolve. The game works perfectly — you just have
    to share the IP address instead of the friendly name.

`docker-compose.yml` therefore defines two services:

=== "Default — bridge"

    ```bash
    docker compose up -d
    ```

    Port 4000 is published to the host. Works on Linux, macOS and Windows.
    Reach it at `http://<host-ip>:4000`.

=== "mdns profile — host network"

    ```bash
    docker compose --profile mdns up -d
    ```

    Uses `network_mode: host`, so the mDNS announcement reaches the LAN and
    `http://gamenight.local:4000` resolves.

    **Linux only.** `network_mode: host` has no effect on Docker Desktop for
    Windows or macOS, where the container runs inside a VM — stay on the
    default service there.

## Changing the port

`docker-compose.yml` reads a `PORT` variable for the published port:

```bash
PORT=8080 docker compose up -d      # http://<host-ip>:8080
```

Or put it in a `.env` file next to `docker-compose.yml`:

```ini
PORT=8080
```

## Pre-built images

Tagged releases publish multi-architecture images (amd64 and arm64) to the
GitHub Container Registry:

```bash
docker run -d -p 4000:4000 ghcr.io/gogo25171/gamenight:latest
```

## Troubleshooting

??? question "`failed to connect to the docker API`"

    The Docker daemon is not running. Start Docker Desktop, or
    `sudo systemctl start docker` on Linux.

??? question "The container is `unhealthy`"

    Check `docker compose logs gamenight`. The healthcheck fetches `/` on the
    port in `$PORT` inside the container, which is always 4000 — republishing on
    a different host port does not affect it.

??? question "State is lost when I restart the container"

    That is expected. Rooms and scores live in memory only; there is no database
    and no volume to mount. Restarting ends any game in progress.
