# GameNight

**Self-hosted multiplayer party games for your living room. No internet. No accounts. Just fun.**

GameNight turns any device on your local network into a party game console.
Run one command, share the URL, play instantly.

<div class="grid cards" markdown>

- :material-rocket-launch: **[Get running in two minutes](getting-started/installation.md)**

    Node 18+, `npm install`, `npm start`. That's it.

- :material-docker: **[Run it in Docker](getting-started/docker.md)**

    `docker compose up -d` and you're live.

- :material-gamepad-variant: **[Eight games](games/index.md)**

    Social deduction, cards, trivia, drawing and three quick 1v1s.

- :material-hammer-wrench: **[Add your own game](development/adding-a-game.md)**

    Every integration point, with line numbers.

</div>

## The games

| | Game | Players | Vibe |
|--|------|---------|------|
| :knife: | [**Mongolpuri**](games/mongolpuri.md) | 4–15 | Social deduction — lies, trust, and midnight murder |
| :black_joker: | [**UNO**](games/uno.md) | 2+ | Classic card game with skips, reverses and wild cards |
| :brain: | [**Quiz**](games/quiz.md) :material-flask: | 2+ | Trivia, online or from the bundled bank — faster answers score more |
| :o: | [**Tic Tac Toe**](games/tictactoe.md) | 2+ | Classic 1v1 with score tracking and match formats |
| :art: | [**Scribble**](games/scribble.md) :material-flask: | 3+ | Draw a word while your friends race to guess it |
| :red_circle: | [**Connect Four**](games/connect4.md) :material-flask: | 2+ | Line up four discs — gravity included |
| :detective: | [**Undercover**](games/undercover.md) :material-flask: | 4–12 | Everyone gets a word. Almost everyone gets the same one |
| :scissors: | [**Rock Paper Scissors**](games/rps.md) :material-flask: | 2+ | The playground classic, as a knockout bracket |

:material-flask: = beta. Playable end to end, still finding its balance.

## Why it exists

Party game websites want accounts, show ads, and stop working when the WiFi
does. GameNight runs on a laptop in the corner of the room. Everyone opens a URL
on their own phone. Nothing leaves your network.

- **Fully local** — no internet needed after install (except the Quiz, which
  fetches its questions)
- **Works everywhere** — phone, tablet, laptop, any browser
- **Room codes** — create a room, share the six-letter code or the invite link
- **Reconnect support** — refresh the page and jump back in
- **No build step** — vanilla JS and plain CSS on the front end

## Where to go next

- New here? Start with [Installation](getting-started/installation.md).
- Playing over WiFi? [Network play](getting-started/network.md) explains
  `gamenight.local` and what to share with your friends.
- Want to contribute? [Architecture](development/architecture.md) is the tour.
