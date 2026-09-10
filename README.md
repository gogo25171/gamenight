# 🎮 GameNight

> Self-hosted multiplayer party games for your living room. No internet. No accounts. Just fun.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.7-010101?style=flat-square&logo=socketdotio)](https://socket.io)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express)](https://expressjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-7c3aed?style=flat-square)](LICENSE)
[![Games](https://img.shields.io/badge/games-8-blueviolet?style=flat-square)](#-games)
[![Multiplayer](https://img.shields.io/badge/play-local%20network-0ea5e9?style=flat-square)](#-network-play)
[![No frameworks](https://img.shields.io/badge/frontend-vanilla%20JS-f59e0b?style=flat-square)](#)

---

```
  ██████╗  █████╗ ███╗   ███╗███████╗███╗   ██╗██╗ ██████╗ ██╗  ██╗████████╗
 ██╔════╝ ██╔══██╗████╗ ████║██╔════╝████╗  ██║██║██╔════╝ ██║  ██║╚══██╔══╝
 ██║  ███╗███████║██╔████╔██║█████╗  ██╔██╗ ██║██║██║  ███╗███████║   ██║   
 ██║   ██║██╔══██║██║╚██╔╝██║██╔══╝  ██║╚██╗██║██║██║   ██║██╔══██║   ██║   
 ╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗██║ ╚████║██║╚██████╔╝██║  ██║   ██║   
  ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝  
```

**GameNight** turns any device on your local network into a party game console.  
Run one command → share the URL → play instantly.

---

## 🎲 Games

| | Game | Players | Vibe |
|--|------|---------|------|
| 🔪 | **Mongolpuri** | 4–15 | Social deduction — lies, trust, and midnight murder |
| 🃏 | **UNO** | 2+ | Classic card game with skips, reverses, and wild cards |
| 🧠 | **Quiz** `beta` | 2+ | 15-question trivia, online or offline — faster answers score more |
| ⭕ | **Tic Tac Toe** | 2+ | Classic 1v1 with score tracking and match formats |
| 🎨 | **Scribble** `beta` | 3+ | Draw a word while your friends race to guess it |
| 🔴 | **Connect Four** `beta` | 2+ | Drop discs, line up four, best-of matches |
| 🕵️ | **Undercover** `beta` | 4–12 | Everyone shares a word — one or two players do not |
| ✂️ | **Rock Paper Scissors** `beta` | 2+ | Knockout bracket of simultaneous throws |

Games marked `beta` are playable end to end but still settling — they carry a
**BETA** badge on the home card, in the lobby and in the game header. Connect Four,
Undercover and Rock Paper Scissors are there because they are new; Scribble and the
Quiz because their behaviour just changed (a rewritten canvas pointer mapping, and
questions that no longer need the internet).

---

## ✨ Features

- 🌐 **Fully local** — runs on your LAN, no internet required at all: even the Quiz falls back to a built-in question bank
- 🔧 **One config file** — `.env` for the port, the mDNS name and the Quiz source; every value optional
- 📱 **Works everywhere** — phone, tablet, laptop — any browser
- 🏠 **Room codes** — create a room, share the 6-letter code or invite link, done
- 🔗 **Smart invite links** — link pre-fills the room code and shows only the game being joined
- 🎭 **100 avatars** — auto-assigned by name for known players, random for new ones; open a modal to browse and change
- 💾 **Remembered preferences** — name and avatar are saved and restored on your next visit
- ⚙️ **Configurable** — host adjusts timers, rounds, match format before game starts
- 📖 **Built-in rules** — tap "How to Play" to learn any game
- 🔄 **Reconnect support** — refresh the page and jump back in
- 👻 **Spectator mode** — eliminated players watch the action
- 🌙 **Dark UI** — polished animations, countdown timers, role cards

---

## 🚀 Quick Start

### Prerequisites

- [Node.js 18+](https://nodejs.org/en/download)

### Install

```bash
git clone <repo-url>
cd gamenight
npm install
```

### Run

| Platform | Command |
|----------|---------|
| Windows | Double-click `start.bat` or run it in terminal |
| macOS / Linux | `./start.sh` |
| Anywhere | `npm start` |

Open **[http://localhost:4000](http://localhost:4000)** in your browser.

### Configuration (optional)

Every setting has a working default, so there is nothing to configure to play. To
change one, copy the committed example and edit it — the `check-and-start` scripts
offer to do it for you:

```bash
cp .env.example .env
```

`.env` is read at startup, so it applies to `npm start`, `start.bat`,
`check-and-start.ps1` and `docker compose` alike. It is gitignored.

| Variable | Default | What it does |
|----------|---------|--------------|
| `PORT` | `4000` | Port the server listens on |
| `HOST` | `0.0.0.0` | Interface to bind — `127.0.0.1` for this machine only |
| `MDNS_ENABLED` | `true` | Advertise `gamenight.local` over Bonjour |
| `MDNS_HOST` | `gamenight.local` | The name advertised |
| `QUIZ_SOURCE` | `auto` | `auto` · `online` · `offline` — where Quiz questions come from |
| `QUIZ_API_URL` | opentdb.com | Trivia API, for a mirror |

A value that makes no sense stops the server with a message naming it, rather than
starting half-broken.

---

## 🌐 Network Play

When the server starts it prints every URL your friends can use:

```
🎮  GameNight is live!

  Local:    http://localhost:4000
  Network:  http://192.168.1.42:4000   ← share this!
  Network:  http://10.0.0.5:4000
```

Anyone on the **same WiFi or LAN** can open the Network URL directly — no setup needed on their end.

The server also advertises itself via **mDNS (Bonjour)**, so on most devices you can use the stable hostname instead:

```
http://gamenight.local:4000
```

> **Tip:** `gamenight.local` works on macOS, iOS, Android, and most Linux desktops out of the box. Windows may need [Bonjour for Windows](https://support.apple.com/kb/DL999). If it doesn't resolve, fall back to the IP shown in the terminal.

---

## ⚙️ Game Settings

The room creator can tune settings in the lobby before the game starts. Everyone else sees the current configuration.

| Game | Configurable |
|------|-------------|
| 🎨 Scribble | Draw time (40–120 s) · Rounds (2–5) · Word choices per turn (2–4) |
| 🔪 Mongolpuri | Night time · Discussion time · Voting time |
| ⭕ Tic Tac Toe | Free play · Best of 3 / 5 / 7 · Board size (3×3 / 4×4 / 5×5) |
| 🃏 UNO | No configurable settings — standard rules apply |
| 🧠 Quiz | Questions (10 / 15 / 20 / 25) · Time per question (10 / 15 / 20 / 30 s) |
| 🔴 Connect Four | Free play · Best of 3 / 5 / 7 · Columns (6–9) · Rows (5–7) |
| 🕵️ Undercover | Undercovers (1 / 2) · Mr White on/off · Time per clue · Voting time |
| ✂️ Rock Paper Scissors | Single throw · Best of 3 / 5 / 7 · Time per throw (8 / 12 / 20 s) |

---

## 📖 How to Play

Rules are built into the app — click **"How to Play"** on any screen. Here's the quick version:

### 🔪 Mongolpuri
Players are secretly assigned **Killer**, **Doctor**, or **Villager**. Roles are hidden by default — tap your role card to reveal it. Each night, every player confirms they are awake (villagers tap "I'm awake"; killer and doctor choose their target). Once all players have acted, the server waits a random delay then resolves the night. At dawn the village debates during a timed discussion, then votes to eliminate a suspect. Villagers win by voting out the Killer. The Killer wins by reducing the living players to two.

In larger games there may be **multiple Doctors** — roughly one per five players — to keep the game balanced.

### 🃏 UNO
Standard UNO rules. Each player starts with 7 cards. On your turn, play a card that matches the top discard by color or value, or draw one from the deck. Special cards: **Skip** ends the next player's turn, **Reverse** flips direction, **+2** forces the next player to draw two, **Wild** lets you choose the active color, **Wild +4** does the same and forces a four-card draw. First player to empty their hand wins. Your name is displayed in the top-left of the game header.

### 🧠 Quiz `beta`
The server fetches questions from the [Open Trivia Database](https://opentdb.com) at game start and sorts them easy → medium → hard. While questions are loading, players see a "Fetching questions…" screen; the first question appears automatically once the fetch completes (usually under a second, up to ~6 s if the API rate-limits). Each question shows 4 lettered options (A–D) with a countdown timer. Correct answers score 500–1000 points based on speed — the first player to answer correctly earns a +200 bonus (marked with ⚡). After each question the correct answer is revealed with animations alongside the updated leaderboard. The game-over ranking table shows each player's correct-answer count alongside their total score.

**No internet? It still plays.** If opentdb.com is unreachable, blocked, or rate-limiting past its retries, the Quiz falls back to a bundled bank of 60 questions in `data/quiz-questions.json`, tells the room it has done so, and starts. Set `QUIZ_SOURCE=offline` to always use the bank (and skip the attempt), or `online` to refuse the fallback. Adding your own questions to that JSON file is the intended way to extend it.

### 🎨 Scribble `beta`
One player draws a secret word on a shared canvas while everyone else types guesses in the chat. Faster correct guesses = more points. The drawer earns bonus points for each correct guesser. Hints appear as time runs low. Roles rotate every turn. The canvas is 800×500 whatever your screen size, so everyone sees the same drawing; on a window of a different shape the drawing is centred with a blank margin.

### ⭕ Tic Tac Toe
Get your symbols in a row (horizontal, vertical, or diagonal) to win. X always goes first. Symbols swap each game. The host picks the grid: 3×3 (align 3), 4×4 (align 4) or 5×5 (align 4). In match formats, first to reach the win target takes the match. Supports single-elimination tournaments for groups.

### 🔴 Connect Four `beta`
Two players drop discs into a standing grid; the disc falls to the lowest free cell. First to line up four — in any direction — wins the game, and colours swap for the next one. The host sets the grid size and the match format.

### 🕵️ Undercover `beta`
Everyone gets a secret word. One or two players get a slightly different one, and — with Mr White enabled — someone gets no word at all. Nobody is told their role. Each round every player says one word about their own, then the table votes someone out. Civilians win by finding every impostor; the impostors win the moment they equal the civilians in number. A Mr White voted out gets one shot at naming the civilians' word to steal the win.

### ✂️ Rock Paper Scissors `beta`
The whole room is seeded into a single-elimination bracket. Both players in a match throw at the same time before the timer runs out — miss it and a throw is picked for you. Win the majority of the match and you advance; everyone else follows the bracket.

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js |
| HTTP server | Express |
| Realtime | Socket.io (WebSockets) |
| Drawing | HTML5 Canvas API |
| Frontend | Vanilla JS, pure CSS |
| Styles | CSS custom properties, no framework |

---

## 📁 Structure

```
gamenight/
├── server.js            # All game logic + Socket.io events
├── config.js            # The only reader of process.env / .env
├── .env.example         # Every variable, documented, with its default
├── data/
│   └── quiz-questions.json  # Offline Quiz question bank
├── public/
│   ├── index.html       # Single-page app shell
│   ├── style.css        # Dark theme, animations
│   └── js/
│       ├── app.js           # Socket setup · lobby · views · avatars · settings
│       ├── killerdoctor.js  # Mongolpuri client UI
│       ├── tictactoe.js     # Tic Tac Toe client UI
│       ├── scribble.js      # Scribble canvas + chat
│       ├── uno.js           # UNO client UI
│       ├── quiz.js          # Quiz client UI
│       ├── connect4.js      # Connect Four client UI
│       ├── undercover.js    # Undercover client UI
│       ├── rps.js           # Rock Paper Scissors client UI
│       ├── i18n.js          # Per-player interface language
│       └── i18n/            # en.json · fr.json
├── start.bat            # Windows one-click launcher
├── start.sh             # macOS / Linux launcher
└── package.json
```

---

## 📚 Documentation

The full docs are in [`docs/`](docs/) and build with MkDocs:

| Page | What's in it |
|------|--------------|
| [Games](docs/games/) | One page per game — rules, settings, tips |
| [Game internals](docs/development/game-internals.md) | How each game works, and which constant to edit to change its words, cards or timings |
| [Adding a game](docs/development/adding-a-game.md) | The seven server hooks and the client touch points |
| [Architecture](docs/development/architecture.md) | The tour: state model, dispatch, timers |

```bash
pip install -r requirements-docs.txt
mkdocs serve            # http://localhost:8000
```

---

## 🐛 Found a bug? Want a game added?

Three short forms, one per kind of report:

- [🐛 Bug report](https://github.com/gogo25171/gamenight/issues/new?template=bug_report.yml) — include the **player count** and the **phase** you were in; that is what makes a bug reproducible here
- [💡 Feature request](https://github.com/gogo25171/gamenight/issues/new?template=feature_request.yml) — a setting, a variant, a quality-of-life fix
- [🎲 New game](https://github.com/gogo25171/gamenight/issues/new?template=new_game.yml) — a game you want to see in the list

Feedback on the `beta` games is the most useful of all — especially Scribble on a
phone or a tablet, and the Quiz on a network with no internet. They work here;
nobody has played them enough to know they work everywhere.

---

## 📝 License

MIT — do whatever you want with it.

---

*No cloud. No tracking. No nonsense. Just game night.*
