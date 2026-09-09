# :scissors: Rock Paper Scissors

**2+ players — knockout tournament.** :material-flask: Beta

The playground classic, run as a bracket. Everyone in the room is seeded, two
players throw at a time, and the table watches the whole thing.

!!! warning "This game is in beta"

    The bracket and the timers work end to end, but pacing is still being tuned,
    so a `BETA` badge shows on the home card, in the lobby and in the game header.

## The bracket

Every player in the room is seeded into a single-elimination bracket, in random
order. Counts that are not a power of two get **byes**: some players skip the
first round instead of playing a phantom match.

The bracket is on screen the whole game, so everyone can see who they might face
next. Between matches it takes over the screen, then the next pair is called up.

The bracket code is shared with the [Tic Tac Toe](tictactoe.md) tournament — same
seeding, same byes.

## A match

1. The two players are called up. Everyone else watches.
2. Both pick rock, paper or scissors — **your pick stays secret until both are
   in.** The others only see *that* you have thrown, never what.
3. Both throws are revealed at once, the round is scored, and the next round
   starts automatically.
4. First to win the required number of rounds takes the match and advances.

A **tie scores nothing** and the round is replayed — no sudden death.

If you run out of time without picking, **a throw is made for you at random**.
One distracted player never stalls the whole bracket.

## Settings

| Setting | Options |
|---------|---------|
| Match format | Single throw · **Best of 3** · Best of 5 · Best of 7 |
| Time per throw | 8 s · **12 s** · 20 s |

**Single throw** makes the whole tournament very fast and very brutal — one
random throw and you are out. Best of 5 or 7 is the fairer bracket.

## Notes

- The winner of the final is the champion, and only the champion is credited with
  a win on the session scoreboard.
- Refreshing restores the bracket and the live match. If you had already thrown,
  your pick is still locked in.
- If a player leaves during their own match, **their opponent advances**
  immediately and the bracket carries on. Leaving from anywhere else in the
  bracket simply removes you from it.

## Tips

- People rarely repeat the same throw three times running. They also rarely play
  what just beat them.
- On an 8-second timer, hesitation is information: a very late throw is usually
  the one they talked themselves into.
- With **single throw**, everything above is noise. Enjoy the chaos.
