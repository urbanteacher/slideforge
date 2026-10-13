# Show controls

The Lesson studio's show (`lab/src/show/`) and its Teacher Presenter window (`lab/src/presenter/`). Every control is listed once, in
`lab/src/presenter/controls.ts`: the show's keys, the `?` sheet and the Teacher Presenter's buttons all read that table, so they never drift;
this page was written from it. Room and Phones controls need a live room (Host live); without one the key says so.

- **The wall's bar** has previous, next, the slide count (with a snowflake and the teacher's slide while frozen), Draw, overview, black
  screen, the Teacher Presenter, notes on another device, the elapsed clock, full screen and exit. Once a room is live it adds the join
  card, the room view (E), Scores, Show results, Close prompt, Quick poll, Questions, Rehearse, Teacher entry and Share. Speaker notes
  are not on the bar (N still shows them on the wall); everything else is a key on the wall and a button in the Teacher Presenter.
- **The Teacher Presenter** groups its buttons Slides, Screen, Room and Phones. Each button's title names its wall key, and a button is
  pressed while its control is on. A state line above them says whether the wall is frozen, black or white, being drawn on, whether the phones
  are blanked (or going dark, with the seconds left), the floor, the room view, the join card and reactions. The window's keys are the
  wall's, except Esc, which closes a panel there and never ends the show.
- **Not in the Teacher Presenter:** full screen (a browser only lets the wall's own window ask for it), first and last slide, the
  overview and the wall's speaker notes (the desk already shows every slide and the notes).
- **Notes on another device** (Shift+N, or Notes on a phone) opens the Teacher Presenter, which shows the private link, its QR, how many
  screens follow and Stop sharing notes. The link is never shown on the wall. N still puts the speaker notes on the wall.
- **Who answered what** is only ever in the Teacher Presenter. Shift+W on the wall opens the window on that list; nothing reaches the wall.

Changed from classic's keys: D is Draw (and I), P opens the Teacher Presenter (classic's D), E cycles the room view (classic's S) and S
toggles the full scores board (classic's E), W stays white screen, so who answered what is Shift+W. New keys: A every step, L spotlight,
Shift+C phones down in 10, Shift+N notes on a phone, H show held results, C close the prompt, Q questions, K teacher entry, + for 30 seconds more.

## What each control sends

| Control | Frames (docs/games/protocol.md) |
|---|---|
| Blank phones (Shift+B) | `blankPhones {on}`; the relay sends the phones `blankPhones` and `floor`. A warning in flight is overtaken. A new room after a relay restart is sent `blankPhones {on: true}` again. |
| Blank in 10 s (Shift+C) | `blankSoon {seconds: 10}`; the host runs the clock, then sends `blankPhones {on: true}`. Pressed again: `blankSoon {seconds: 0}`. |
| Floor (Shift+H) | `floor {mode}`: auto, open, shut, round and round. |
| Ask again (R) | `at` as a `moment` (the relay leaves the question), then `at` and `question` again: answers cleared, the question open, scored afresh on its reveal. |
| Reactions (T) | `reactions {on}`. |
| Freeze, room view, join card, every step, spotlight | Nothing: they are the wall's own. Frozen, Next, Back and the jump move only the teacher's place; catching up moves the wall (and the room) there. |

## Every control

### Slides

| Key | Teacher Presenter | What it does |
|---|---|---|
| `→` `↓` `Space` `PgDn` `Enter` | Next | Next: a build, the room's next step (ask, reveal), or the next slide |
| `←` `↑` `PgUp` `⌫` | Back | Back |
| `Home` | (none) | First slide (without a room) |
| `End` | (none) | Last slide (without a room) |
| `1` `2` … then `Enter` | Slide # and Go | Go to that slide (Esc forgets the number) |
| `O` | (none) | Every slide at once: arrows and Enter go to one |
| `A` | Every step | Show every step on this slide |
| `Z` (outside Draw) | Freeze | Freeze the wall: it holds this picture while you move on here; again to catch up |
| `Alt+F` | (none) | Freeze the wall (also inside Draw) |
| `Esc` (outside Draw) | End show | Exit the show (a room is ended first, its standings stay up) |

### Screen

| Key | Teacher Presenter | What it does |
|---|---|---|
| `B` `.` | Black | Black screen; again to come back |
| `W` `,` | White | White screen, for writing on the board |
| `F` | (none) | Full screen on or off |
| `N` | (none) | Speaker notes on the wall |
| `Shift+N` | Notes on a phone | Notes on another device: the Teacher Presenter shows the private link and QR, and a phone follows your notes |
| `P` | (none) | Open the Teacher Presenter: notes, next slide and every control |
| `?` | Keys | This list of keys; ? or Esc closes it |

### Room

| Key | Teacher Presenter | What it does |
|---|---|---|
| (Next) | Reveal | Reveal the open question's answer |
| `J` | Join card | Join card: the PIN, address and QR over the slide for latecomers; J or Esc closes it |
| `E` | Room view | Room view: hidden, beside the slide (standings), full screen (scores) |
| `S` | Scores | The full scores board on or off |
| `H` | Show results | Show a prompt's held results |
| `C` | Close prompt | Close the prompt or the quick poll (the phones are thanked) |
| `R` | Ask again | Clear the answers and score again: the question is asked afresh |
| `+` `=` | +30s | 30 seconds more for the stage on the wall |
| `V` | Quick poll | Quick poll: ask the room something on the fly |
| `Q` | Questions | Questions from the room: approve, show, answer, hide |
| `Shift+W` | Who answered | Who answered what: in the Teacher Presenter only, never on the wall |
| `T` | Reactions | Phone reactions on or off |
| `K` | Teacher entry | Teacher entry: add names, enter answers by key |

### Phones

| Key | Teacher Presenter | What it does |
|---|---|---|
| `Shift+B` | Blank phones | Blank every phone (not the wall); again to bring them back |
| `Shift+C` | Blank in 10 s | Phones down in 10: a warning, then every phone goes dark; again to cancel |
| `Shift+H` | Floor | Who may speak: follows the lesson, always open, closed |

### Draw

| Key | Teacher Presenter | What it does |
|---|---|---|
| `D` `I` | Draw | Draw on the slide; again (or Esc) when done |
| `L` | Spotlight | Spotlight: drag over what to look at, the rest goes dark; click to put it out |
| `Z` (in Draw) | (none) | Undo the last mark (in Draw) |
| `X` (in Draw) | Clear marks | Clear the marks and the spotlight (in Draw) |
| `Esc` (in Draw) | (none) | Done drawing |
