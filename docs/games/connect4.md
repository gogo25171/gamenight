# :red_circle: Connect Four

**2+ players — 1v1 grid game.** :material-flask: Beta

Drop discs into a grid and line up four before your opponent does. Gravity does
half the work: you pick a column, not a cell.

!!! warning "This game is in beta"

    Connect Four is playable from start to finish, but its board sizes and match
    formats are still being tuned, so a `BETA` badge shows on the home card, in
    the lobby and in the game header. Balance may change between releases.

## Playing

The room picks two players at random; everyone else watches. On your turn, click
any column that is not full — the disc falls to the lowest free cell.

Four in a row wins, in **any** direction: horizontal, vertical, or either
diagonal. The winning line lights up, and the last disc played is highlighted so
a table of six people can see what just happened.

If the grid fills with nobody aligned, the game is a draw.

## Colours swap every game

Red always moves first, and moving first is an advantage. So after each game the
two players **swap colours** — the loser of the coin toss opens the next one.
Scores carry across the swap.

## Winning a match

| Match format | Ends when |
|--------------|-----------|
| **Free play** | Never — keep playing, the score keeps counting |
| Best of 3 | Someone reaches 2 wins |
| Best of 5 | Someone reaches 3 wins |
| Best of 7 | Someone reaches 4 wins |

Only a *match* win reaches the session scoreboard in the lobby. Individual games
count on the in-game scoreboard.

## Settings

| Setting | Options |
|---------|---------|
| Match format | **Free play** · Best of 3 · Best of 5 · Best of 7 |
| Columns | 6 · **7** · 8 · 9 |
| Rows | 5 · **6** · 7 |

The win condition stays **four in a row** on every board size. A wider grid means
longer games and more room to set up a double threat; a shorter grid makes
vertical stacks much stronger.

## Notes

- More than two players in the room? The extras get a **Spectating** badge and
  watch live. Use *Back to Lobby* and *Play again* to rotate who plays.
- Refreshing restores the grid, the scores and your colour.
- **Next Game** and **New Match** are host-only buttons, and they only appear
  once a game has actually finished.
- If one of the two players leaves mid-game, everyone is told — but the board
  stays as it was. The host takes the room back to the lobby to deal a new pair.
  Automatic forfeit is on the list, not in the build.

## Tips

- The centre column is worth more than it looks: it takes part in more possible
  lines than any other.
- Watch the row *above* your threat. Completing three in a row is useless if
  filling the fourth cell hands your opponent a diagonal on top of it.
- On a 9-column board, threats on opposite edges are much harder to answer than
  on the standard 7.
