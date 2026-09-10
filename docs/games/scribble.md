# :art: Scribble

**3+ players — draw and guess.** :material-flask: Beta

!!! warning "This game is in beta"

    The canvas pointer mapping was rewritten — the drawer's ink used to land
    beside the cursor, further off the closer to an edge you drew. The fix needs a
    party's worth of play across phones, tablets and desktops before the badge
    comes off. A `BETA` badge shows on the home card, in the lobby and in the
    game itself.

One player draws a secret word on a shared canvas while everyone else races to
type it in the chat.

## A turn

1. The drawer picks a word from several choices.
2. Everyone else sees a masked version — one underscore per letter.
3. The drawer draws; guesses go in the chat.
4. Hints reveal letters as time runs low.
5. The turn ends when time runs out or everyone has guessed.

Roles rotate every turn, so everyone draws.

## Scoring

- **Guessers** score more the faster they guess.
- **The drawer** earns a bonus for every player who guesses correctly — drawing
  something nobody can recognise is not a winning strategy.

Correct guesses are hidden from the chat, so a player who has already guessed
cannot spoil it for the others.

## Settings

| Setting | Options |
|---------|---------|
| Draw time | 40–120 seconds |
| Rounds | 2–5 |
| Word choices per turn | 2–4 |

## Notes

- The canvas has a fill tool and a clear button, both drawer-only.
- The canvas is 800×500 pixels whatever the size of your screen: strokes are sent
  as fractions of it, so everyone sees the same drawing. On a window whose shape
  does not match, the drawing is centred with a blank margin — clicking that
  margin does nothing, by design.
- The full drawing is replayed to anyone who refreshes mid-turn.
- If the drawer leaves, the turn ends and play moves on.
