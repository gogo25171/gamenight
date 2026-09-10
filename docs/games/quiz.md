# :brain: Quiz

**2+ players — trivia, scored by speed.** :material-flask: Beta

Questions are fetched from the [Open Trivia Database](https://opentdb.com) when
the game starts, then sorted easy → medium → hard so the round builds up.

!!! warning "This game is in beta"

    The question source changed: the Quiz no longer needs the internet, and the
    fallback below has not yet had a party's worth of play. A `BETA` badge shows
    on the home card, in the lobby and in the game header.

## Where the questions come from

The Quiz prefers fresh questions from opentdb.com, and falls back to a bundled
bank of 60 general-knowledge questions when it cannot reach the site — a blocked
network, a rate limit that outlasts the retries, or no internet at all. When that
happens everyone in the room is told, and the game starts anyway.

Which source is used is a setting of the instance, not of the room —
`QUIZ_SOURCE` in the [`.env`](../getting-started/installation.md#configuration-env):

| `QUIZ_SOURCE` | Behaviour |
|---------------|-----------|
| `auto` *(default)* | Try opentdb.com, fall back to the bundled bank |
| `online` | opentdb.com only — a failure sends the room back to the lobby |
| `offline` | Never leave the LAN; always use the bundled bank |

The bundled bank lives in `data/quiz-questions.json` and is plain JSON — add your
own questions there and they are in the rotation on the next restart. Each entry
needs a `difficulty` (`easy`, `medium` or `hard`), a `question`, its `answer`, and
exactly three `wrong` answers.

!!! note "The bundled bank is in English"

    So is opentdb.com. Question text is shared by the whole room, so it cannot
    follow each player's interface language — see the i18n section of
    [TODO.md](https://github.com/gogo25171/gamenight/blob/main/TODO.md).

## A round

While the questions load, players see a **Fetching questions…** screen. The
first question appears automatically once the fetch completes — usually under a
second, up to about six seconds if the API rate-limits, and instantly when the
bundled bank is used.

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
- The bundled bank holds 60 questions, so a 25-question game never repeats one —
  but two games in a row from the bank will overlap.
