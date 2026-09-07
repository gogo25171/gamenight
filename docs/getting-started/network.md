# Network play

GameNight is built for one room and one WiFi network. The server listens on
`0.0.0.0`, so every device on the same LAN can reach it with no setup of its own.

## Sharing the URL

When the server starts it prints what to share:

```text
🎮  GameNight is live!

  Local:    http://localhost:4000
  Network:  http://gamenight.local:4000  ← share with friends!
```

Anyone on the same WiFi opens that address in a browser. There is nothing to
install on their side.

## gamenight.local

The server advertises itself over **mDNS (Bonjour)** under the stable hostname
`gamenight.local`, so nobody has to type an IP address.

| Platform | Works out of the box? |
|----------|----------------------|
| macOS, iOS | Yes |
| Android | Yes on recent versions |
| Most Linux desktops | Yes, via Avahi |
| Windows | Needs [Bonjour for Windows](https://support.apple.com/kb/DL999) |

If it does not resolve, fall back to the IP address shown in the terminal. To
find it by hand:

=== "Windows"

    ```powershell
    ipconfig | Select-String IPv4
    ```

=== "macOS"

    ```bash
    ipconfig getifaddr en0
    ```

=== "Linux"

    ```bash
    hostname -I
    ```

## Invite links

Rather than dictating a room code, the host can share the invite link from the
lobby. It pre-fills the code and takes the player straight to the game being
joined.

## Firewalls

The most common reason a phone cannot reach the server is the host machine's
firewall.

=== "Windows"

    The first run pops up a Windows Defender prompt — allow Node.js on
    **private networks**. If you dismissed it, add the rule by hand:

    ```powershell
    New-NetFirewallRule -DisplayName "GameNight" -Direction Inbound `
      -Protocol TCP -LocalPort 4000 -Action Allow -Profile Private
    ```

=== "macOS"

    **System Settings → Network → Firewall → Options**, then allow incoming
    connections for Node.

=== "Linux (ufw)"

    ```bash
    sudo ufw allow 4000/tcp
    ```

## Common problems

??? question "Some phones connect and others do not"

    They are probably not all on the same network. Phones silently fall back to
    mobile data when WiFi is weak, and many routers put guest WiFi on an
    isolated network that cannot see the main one. Check that every device is on
    the same SSID, and turn mobile data off to be sure.

??? question "Client isolation / AP isolation"

    Some routers — often in hotels, offices and student housing — block traffic
    between wireless clients entirely. Nothing on the GameNight side can work
    around it; you need a different network, or a phone hotspot.

??? question "Can I play over the internet?"

    Not safely as-is. There is no authentication and no encryption: anyone who
    can reach the port can join a room. If you must play remotely, use a VPN
    such as Tailscale or WireGuard so everyone shares a virtual LAN. See
    [SECURITY.md](https://github.com/gogo25171/gamenight/blob/main/SECURITY.md).

??? question "A player refreshed and lost the game"

    They should not have — every game supports reconnecting. Refreshing rejoins
    the room and restores the game state, including a secret role in Mongolpuri
    and the cards in an UNO hand. If it does not, that is a bug worth reporting.
