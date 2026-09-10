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

## The drawer's tools

Pencil, eraser, fill, a colour, a brush size — and two buttons worth calling out:

| | What it does |
|--|--------------|
| **✏️ Pencil** | Draws in the chosen colour, at the slider's width. |
| **🧽 Eraser** | Paints the background back over the drawing, **three times wider** than the pencil at the same slider setting — rubbing out is a coarser gesture than drawing. The width readout next to the slider shows the real figure, so `5px` on the pencil reads `15px` on the eraser. Picking a colour switches you back to the pencil. |
| **🪣 Fill** | Floods the area you click with the chosen colour. |
| **↩️ Undo** | Removes the **last gesture**, not the last pixel: one whole pencil stroke, one erase, one fill, or one Clear. `Ctrl+Z` does the same. Greyed out when there is nothing left to undo. |
| **🗑️ Clear** | Wipes the canvas — and is itself undoable, so hitting it by accident is not the end of the drawing. |

The eraser paints white rather than punching a transparent hole, which is why an
erased area still saves correctly in the PNG below and why undoing an erase brings
back exactly what was under it.

Undo is the drawer's alone, and only while they are drawing: nobody can rub out
someone else's work, and the drawing stops being editable at the reveal.

## Saving a drawing

**💾 Save**, in the bar above the canvas, downloads the drawing as a PNG. It is
there for **everyone**, not just the drawer — the good ones are usually worth
keeping, and the guessers are the ones laughing at them.

The file is named after the word once you are entitled to know it
(`gamenight-scribble-ice-cream-2026-09-10-18-04.png`); before that — a guesser
mid-round — the word is left out rather than leaked through a file name. The best
moment to save is the round-end reveal, when the drawing is still on screen and
everyone knows what it was.

## Notes

- The canvas has a fill tool and a clear button, both drawer-only.
- The canvas is 800×500 pixels whatever the size of your screen: strokes are sent
  as fractions of it, so everyone sees the same drawing. On a window whose shape
  does not match, the drawing is centred with a blank margin — clicking that
  margin does nothing, by design.
- The full drawing is replayed to anyone who refreshes mid-turn.
- If the drawer leaves, the turn ends and play moves on.
