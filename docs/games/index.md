# Games

Eight games ship with GameNight. Every one of them supports room codes, invite
links, avatars and reconnecting mid-game.

| | Game | Players | Configurable |
|--|------|---------|--------------|
| :knife: | [Mongolpuri](mongolpuri.md) | 4–15 | Night time · Discussion time · Voting time |
| :black_joker: | [UNO](uno.md) | 2+ | — standard rules |
| :brain: | [Quiz](quiz.md) | 2+ | Questions · Time per question |
| :o: | [Tic Tac Toe](tictactoe.md) | 2+ | Match format · Board size |
| :art: | [Scribble](scribble.md) | 3+ | Draw time · Rounds · Word choices |
| :red_circle: | [Connect Four](connect4.md) :material-flask: | 2+ | Match format · Columns · Rows |
| :detective: | [Undercover](undercover.md) :material-flask: | 4–12 | Undercovers · Mr White · Clue time · Voting time |
| :scissors: | [Rock Paper Scissors](rps.md) :material-flask: | 2+ | Match format · Time per throw |

!!! info ":material-flask: Three games are in beta"

    Connect Four, Undercover and Rock Paper Scissors are playable end to end, but
    their balance and settings are still moving. They carry a `BETA` badge on the
    home card, in the lobby and in the game itself — nothing else about them
    behaves differently.

    Found something off in one of them? That is exactly the feedback they need —
    see [how to report it](#reporting-a-bug-or-suggesting-a-game).

## Starting a game

1. Pick a game on the home screen.
2. Choose a name and an avatar. Both are remembered for next time — known names
   get their usual avatar back automatically.
3. Share the six-letter room code, or the invite link, which pre-fills the code
   and shows only the game being joined.
4. The host tunes the settings in the lobby. Everyone else sees the current
   configuration but cannot change it.
5. The host starts when enough players have joined.

## Reporting a bug or suggesting a game

The issue tracker takes three kinds of report, each with its own short form:

| | For |
|--|-----|
| :material-bug: [Bug report](https://github.com/gogo25171/gamenight/issues/new?template=bug_report.yml) | Something broke, hung, or showed the wrong thing |
| :material-lightbulb: [Feature request](https://github.com/gogo25171/gamenight/issues/new?template=feature_request.yml) | A setting, a variant, a quality-of-life fix |
| :material-dice-multiple: [New game](https://github.com/gogo25171/gamenight/issues/new?template=new_game.yml) | A game you want added |

For a bug, the two details that matter most are **how many players were in the
room** and **which phase you were in** when it happened — most of what breaks in
this project breaks with a specific player count, mid-phase.

!!! tip "Names and avatars are unique per room"

    Two players in the same room cannot pick the same name or the same avatar —
    it would make Mongolpuri accusations and Scribble scores impossible to
    follow.

## Rules in the app

Every screen has a **How to Play** button that opens the rules for any game, so
nobody has to leave the page to check how something works.

## Reconnecting

Refreshing the page rejoins the room and restores the game state — including a
secret Mongolpuri role, an UNO hand, the current Scribble drawing, and Quiz
answers already submitted. Players eliminated from Mongolpuri become spectators
and keep watching.
