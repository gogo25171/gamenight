# :brain: Quiz

**2+ players — trivia, scored by speed.**

Questions are fetched from the [Open Trivia Database](https://opentdb.com) when
the game starts, then sorted easy → medium → hard so the round builds up.

!!! warning "The one game that needs internet"

    Every other game runs entirely on your LAN. The Quiz contacts opentdb.com
    once, at game start, to fetch its questions. A local fallback question bank
    is on the [roadmap](https://github.com/gogo25171/gamenight/blob/main/TODO.md).

## A round

While the questions load, players see a **Fetching questions…** screen. The
first question appears automatically once the fetch completes — usually under a
second, up to about six seconds if the API rate-limits.

Each question shows four lettered options (A–D) and a countdown. After the timer
runs out, or once everyone has answered, the correct answer is revealed
alongside the updated leaderboard.

## Scoring

| | Points |
|--|--------|
| Correct answer | **500–1000**, based on how fast you answered |
| First correct answer | **+200 bonus**, marked with :zap: |
| Wrong answer or no answer | 0 |

The game-over table ranks everyone by total score and also shows how many
questions each player got right — useful when a fast guesser and a careful
thinker end up close.

## Settings

| Setting | Options |
|---------|---------|
| Questions | 10 · **15** · 20 · 25 |
| Time per question | 10 s · 15 s · **20 s** · 30 s |

## Notes

- Answering locks your choice in — you cannot change it.
- If you refresh mid-question, your submitted answer is restored.
- A player who leaves has their score removed; if everyone still connected has
  answered, the question resolves immediately.
