# :o: Tic Tac Toe

**2+ players — the classic 1v1, with tournaments.**

Get three of your symbol in a row — horizontal, vertical or diagonal — on a 3×3
grid. X always goes first, and symbols swap between games so nobody keeps the
advantage.

## Match formats

| Format | Behaviour |
|--------|-----------|
| **Free play** | Games continue indefinitely, the score keeps counting |
| **Best of 3 / 5 / 7** | First to reach the win target takes the match |

## Tournaments

With more than two players, GameNight builds a **single-elimination bracket**.
Player counts that are not a power of two get byes, and the bracket is arranged
so that every player gets at least one real match rather than being knocked out
before playing.

If a player disconnects during their match, their opponent advances
automatically.

## Settings

| Setting | Options |
|---------|---------|
| Match format | **Free play** · Best of 3 · Best of 5 · Best of 7 |
| Board size | **3×3 — align 3** · 4×4 — align 4 · 5×5 — align 4 |

A bigger board keeps the four-in-a-row goal: five in a row on a 5×5 grid is
almost always a draw.

## Notes

The bracket logic has its own test file. Run the suite after touching
anything in that area:

```bash
npm test
```

[`test/tournament.test.js`](https://github.com/gogo25171/gamenight/blob/main/test/tournament.test.js)
walks player counts from 2 to 16 and fails if a player would never get to play a
match, if a bye is handed to the wrong seat, or if a bracket ends with more than
one champion.
