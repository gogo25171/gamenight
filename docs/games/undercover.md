# :detective: Undercover

**4–12 players — social deduction with words.** :material-flask: Beta

Everyone gets a secret word. Almost everyone gets the *same* word. Describe
yours with a single word each round, and vote out whoever does not belong.

!!! warning "This game is in beta"

    Undercover plays from start to finish, but the role counts and timers are
    still being balanced, so a `BETA` badge shows on the home card, in the lobby
    and in the sidebar during play.

## Roles

| Role | What they get | Goal |
|------|---------------|------|
| **Civilian** | The civilian word | Find and vote out every impostor |
| **Undercover** | A *similar but different* word | Blend in and survive |
| **Mr White** | No word at all | Work out the civilian word from what others say |

The two words in play are always a close pair — `Coffee` / `Tea`,
`Wolf` / `Fox`, `Castle` / `Palace`. Close enough that a vague clue fits both,
far enough apart that a careless one gives you away.

Which word is the civilian one is decided at random each game, so the impostor
never knows whether they hold the majority word.

Your word is hidden behind a **Show** button in the sidebar — you can check it
without showing it to the person sitting next to you.

## A round

=== "Clues"

    Players speak **one at a time, in order**, and each gives exactly one word
    (24 characters max). Your clue must describe your own word without naming
    it. Everyone sees every clue as it lands.

    The opening speaker rotates each round, so nobody has to give the blind first
    clue twice in a row. Run out of time and an empty clue (`—`) is submitted for
    you — which is itself a bad look.

=== "Vote"

    Once everyone has spoken, all living players vote for who to eliminate. You
    cannot vote for yourself. The vote resolves as soon as the last player has
    voted, or when the timer runs out.

    A **tie eliminates nobody**, and the game moves straight to the next clue
    round.

=== "Reveal"

    The eliminated player's role and word are shown to the table. If they were a
    civilian, the impostors just got closer to winning.

## Mr White's last words

If Mr White is voted out, they get one shot — **25 seconds to name the civilian
word**. Get it right and Mr White wins the game on the spot, from the grave.

Guessing is the one action a dead player can still take.

## Winning

- **Civilians win** when every impostor has been voted out.
- **Impostors win** when they are as many as the remaining civilians — at that
  point they cannot be outvoted.
- **Mr White wins** alone by correctly naming the civilian word after being
  eliminated.

## Settings

| Setting | Options |
|---------|---------|
| Undercovers | **1** · 2 |
| Mr White | **On** · Off |
| Time per clue | 15 s · **30 s** · 45 s · 60 s |
| Voting time | 30 s · **45 s** · 60 s · 90 s |

!!! note "The impostor side is capped so the game cannot end on turn one"

    The server never lets the impostors start at parity with the civilians, so
    your choice can be reduced quietly at small player counts:

    - **Mr White needs 5+ players.** With 4, the setting is ignored.
    - **2 undercovers plus Mr White needs 7+ players.** Below that, the second
      undercover becomes a civilian.

    At 4 players you always get exactly 1 undercover and no Mr White.

## Notes

- Eliminated players stop being able to chat — the table cannot be coached from
  the grave (except Mr White's one guess).
- Nobody can chat during the word reveal.
- Refreshing restores your word, the clue history and the current phase.
- A player who leaves is treated as eliminated. If it drops the table below three
  living players, the game ends as abandoned, and the departure never leaves the
  round waiting on a speaker who is gone.

## Tips

- A clue that is *too* accurate is as dangerous as a wrong one: if only you could
  have said it, you have identified yourself as holding the odd word.
- As the undercover, listen before the first round ends: your best clues are the
  ones that recycle what a civilian just said.
- As Mr White, aim for a clue so generic it fits any word in the category —
  then narrow down what the pair might be from the others.
- Suspect anyone whose clue would fit *both* words. That is what an impostor is
  aiming for.
