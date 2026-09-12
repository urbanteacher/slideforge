# Game adaptation for SlideForge

The fullscreen audit and older Lesson Planner components are references for
learning goals and mechanics. They are not implementation instructions. No
React components, dependencies, setup screens or styling were copied into
SlideForge.

## How a game gets converted

Steal the mechanic, not the code. Before anything is built, the old game has to
reduce to one sentence:

> **Essential interaction:** what the teacher does + what the class does + how
> it ends.

If that sentence cannot be written, the game is not understood well enough to
build. Then classify it, because the three kinds get different treatment and
the commonest mistake is giving a quiz a fake board skin:

| Kind | Pattern | Examples |
| --- | --- | --- |
| **Board engine** | Own module, `slide.xyzBoard`, early exit in `compileGame` | Memory, Knowledge Flip, Bingo, Low-Stakes Quiz, Quiz Bowl, Horse Race, Boss Battle |
| **Quiz-shaped** | Existing quiz slide, mechanic in the player and live | Multiple choice, typed, slider — most "check" formats are one question at a time |
| **Feedback** | Collect and discuss, no competitive score | Poll, word cloud, odd one out |

A board engine is ten steps, in this order:

1. **State machine first.** `ready → playing → … → complete → restart`, every
   action named. No double scoring. Timers die on unmount.
2. **Authored content in `GAME_STYLES`** — pairs, terms, cells. `normalize` and
   `problems`, and heal old saves rather than replacing them.
3. **Early branch in `compileGame`** — emit a `content` slide carrying
   `slide.xyzBoard`. No quiz, no placeholder options, no results slide.
4. **`js/xyz.js`** — `create` / `transition` / `render` / `mount` / `unmount` /
   `command` / `onVerdict`.
5. **`css/xyz.css`** — house theme tokens only, on the 16:9 stage.
6. **Wire it** — the `renderSlide` gate, player state plus presenter
   `cmd:'xyz'`, `games.js` preview *is* the compile, and both `index.html` and
   `presenter.html`. Add the board to `isBoard()`, to the demo host's state
   map and to its mount and unmount, or Try demo cannot rehearse it — an
   author who cannot step a round in the editor cannot see how it progresses.
7. **Never draw a board you cannot deal.** Missing content is drawn as named
   gaps on the real board, not padded into blank squares that pass for
   content, and not replaced by a panel of text — that shows an author
   neither the cards nor the progression.
8. **Live** — phones get lesson context plus game identity (`style`,
   participation for boards/discuss, clue tiles for emoji). The teacher marks
   boards. Board scores are not quiz leaderboard scores. The phone is a
   companion surface, not a miniature presentation slide.
9. **Tests** — compile immutability, the transitions, proof of no quiz leak,
   and a browser fixture for the things only a real player shows.
10. **Docs** — move the row below from direction to implemented, and keep
    [`js/playbook.js`](../js/playbook.js) / [`game-playbook.md`](game-playbook.md)
    aligned with the fullscreen mechanics audit (aim, how to play, scoring).

**How to play** for every catalogue format lives in the playbook (from
`Games-Fullscreen-Mechanics-Audit.md`). Quiz studio shows it in the library,
the inspector, and Try demo.

Setup is not a phase. The old app gated Bingo behind a wizard — pick a grid
size, name six teams, generate or type at least sixteen terms, *then* start —
and a teacher with five minutes before a lesson never got to the game. A format
arrives from the catalogue already playable, with worked example content to
overwrite. Every setting has a default that works and one place it lives: the
item panel is for one term, one cell, one pair, and Game settings is for the
board. A setting that has to be written to every question on change belongs in
Game settings, and the copying is the proof.

Every game, board or not: one composition on the stage; the teacher's verdict on
the stage and the private presenter, never on a learner's phone; preview and
present render the same payload; navigating freezes a board and a new
presentation clears it; and competitive, teacher-judged and discussion-only
scoring stay genuinely different rather than a leaderboard being hidden.

## Implemented: memory boards

Memory Match, Memory Flip and Knowledge Flip now compile to interactive boards
inside the existing presentation player. The editor previews the same board.
Authored pairs and existing saved games are preserved; new memory games start
with four editable example pairs. Collections larger than eight pairs become
multiple readable sets, with independent collection scores per set.

- **Memory Match:** study the set, hide the cards, choose a position, explain
  the term aloud, reveal the definition, then claim or pass. Claims lock cards;
  misses remain available. Teams rotate after either verdict. A completed set
  recognises a winner or tie.
- **Memory Flip:** the same retrieval loop, with one cooperative class
  collection rather than rotating competitive teams.
- **Knowledge Flip:** visible keywords, no study countdown. Definitions remain
  hidden until checking an explanation.

Recall uses an elapsed timer rather than an expiry. Study has a countdown,
manual early finish, and pause/resume. Navigation freezes the board until it is
revisited; starting a new presentation clears its state. Replay resets the set.
Teacher actions work on the projected board and the private presenter preview.
Learner phones receive the lesson context and style-specific participation copy
(“watch the cards…”), not self-awarded claim buttons or private definitions.
The running board state belongs to this playthrough and is never written to quiz
scores.

Each claim and pass *is* recorded, though — as a spoken round in the session
report, credited to the team or to the class. Before that, a Knowledge Flip
round left no evidence anywhere: not in the report, not in the class overview,
not in the CSV, so a teacher who ran three sets had nothing to show for the
lesson. What cannot be recorded is a name, because a spoken answer has none, so
these stay out of the per-learner grid and Adapt says as much rather than
claiming nothing was marked.

The isolated browser fixture is `tests/memory-fixture.html`. It exercises the
real player with synthetic pairs without saving a game. Its Private presenter
button embeds the real presenter page to exercise the same origin-checked
command channel without needing a browser popup.

## Implemented: bingo

**Essential interaction:** the teacher calls a definition, the team holding that
term explains it to claim the square, and a completed row, column or diagonal
ends it.

Authored content is term/definition pairs, and the questions are the pool the
cards are dealt from — so the pool wants to be larger than a card. Every team is
dealt a different card; an individual game plays one card for the whole room.
Card sizes are 2×2 to 4×4 and six teams is the cap, which is as much as a
1280×720 stage holds.

Each term is called once, in a random order. The definition goes up first and
the term stays hidden until the teacher reveals it — marking is refused until
then, because a row of "not on this card" under the teams tells the room which
cards hold the answer. A claim marks the square; a miss strikes it through for
good, which is the only thing that makes a miss cost anything. There are no
points: a line wins.

Claims and misses are journalled as a spoken round, credited to the team or to
the class. There is no `playerId` behind a spoken answer, so they stay out of
the per-learner grid and appear in the report as "Boards judged out loud".

What it replaced: one shared grid of nine terms with no definitions anywhere in
the model — so nothing to call — and a question sent to every phone whose two
options were "Line!" and "Keep playing", marked always correct for zero points.
The old overlay renderer, its stylesheet and the phone vote are gone rather than
left beside the new engine.

The browser fixture is `tests/bingo-fixture.html`: team counts of one to six and
2×2 through 4×4, a theme switch, and the embedded private presenter.

## Implemented: low-stakes retrieval

**Essential interaction:** the class writes answers on paper while a whole-quiz
clock runs; when time is up (or the teacher reveals early), answers appear for
discussion — no scoreboard and no phone scoring.

Authored content is question/answer pairs (3–10). Incomplete rows stay on the
board as named gaps rather than vanishing into an empty worksheet. `compileGame`
emits one `lowstakesBoard` worksheet. Quiz length is 2 / 3 / 4 minutes. Preview
and Present share the same payload; navigation freezes state; a new Present
clears it; Replay resets the clock. A reveal leaves an oral session-report
trace (`kind: 'lowstakes'`) without inventing phone scores.

What it replaced: a catalogue preset that mapped to multiple choice with the
leaderboard off — which was neither timed retrieval nor a paper worksheet.

The browser fixture is `tests/lowstakes-fixture.html`: Start → expire / early
reveal / Replay, theme switch, and the embedded private presenter.

## Implemented: quiz bowl

**Essential interaction:** the teacher picks an unused category × value cell,
the answering team says it aloud, the teacher reveals the answer and awards the
cell's value to a team or to nobody — and it ends when the board empties or a
team reaches the target score.

One column per category, one row per value that is actually used: a value
nobody wrote is not an empty row of cells the room can never choose. Questions
that share a category and a value stack in one cell and are asked one at a
time, which the audit allows and a teacher writing six questions across two
categories will do without meaning to.

The question replaces the grid while it is open — the grid has nothing to say
during a question, and two things competing for a projector is one too many.
The answer is the teacher's until they reveal it, and awarding is refused until
then. A cell is spent whether or not anyone answered, which is what makes
reaching for the five hundred a decision rather than a freebie. Targets are 500
to 2000; ties are named rather than resolved. On an individual game the room
plays one score against the target instead of against each other.

This is the first board with real points, so its verdicts carry the cell value
and the report tallies a round in points rather than counting claims. A cell
nobody could answer is recorded as an attempt credited to no one — it is not a
phantom participant sitting at zero.

What it replaced: a run of quiz slides in the authored order, each with a
category and a value written on it, and a Correct/Wrong vote sent to every
phone. That is a quiz wearing a bowl's clothes; the choosing, which is the
whole game, did not exist.

The browser fixture is `tests/bowl-fixture.html`: one to six teams, the widest
and tallest grids a stage holds, a stacked cell, a theme switch and the
embedded private presenter.

## Implemented: emoji guess

**Essential interaction:** the teacher shows the emoji clues and releases help
only as the room gets stuck — the letter pattern, then a hint — and then the
answer is revealed and marked; it ends when the puzzles run out.

Quiz-shaped, not a board: one puzzle at a time is a question. So there is no
module and no `slide.xyzBoard` — it is the existing quiz slide with a format of
its own. What it owns is the scaffolding, which is the part that was missing:

- The clues are their own field and the whole prompt, shown large.
- The letter pattern is derived from the answer, so it says how long the answer
  is without saying what it is. It reuses the Word Reveal mask rather than a
  second implementation of the same idea.
- A hint is optional and comes after the pattern.
- Difficulty decides how much help *exists* — pattern and hint, pattern only,
  or nothing — and help is released a press at a time on the progressive
  reveal the teacher already drives, not given away when the slide arrives.
- Points are the same however much help was used. Word Reveal scores by how
  much was still hidden; this does not, because the source game is one point
  either way and a penalty for asking would discourage the thing the hint is
  for.

Answers are typed on phones and marked against the accepted spellings by the
typed engine's own marking, so a room with phones and a room shouting at the
projector both work.

The learner phone is a **companion**, not a miniature wall slide. Live questions
carry `style` (and for emoji, `clues` / `clueMode`) so join.html can show tiled
clues and a mission line; progressive letter-pattern help stays on the wall.
Board and discuss formats stay on `idle` with participation copy (“watch /
discuss / paper”) — never claim buttons.

What it replaced: the typed engine with emoji pasted into the question text —
a typed question in a larger font, with nothing the difficulty setting could
mean. Old saves keep their clues: they only ever lived in the question, so that
is where clues are read back from.

Two defects surfaced while building it. `makeQuestion` fills missing keys from
`make()` before `normalize` runs, so a sample value in `make()` overwrites the
authored content of an older save — the same trap as the bingo term bank, and
the fix is the same: do not put a default where the old shape's data lands.
And the typed answer box only withheld the answer while hosting, so a teacher
running a guessing format straight from Present had the answer on the wall from
the moment the slide arrived. A slide can now say `hideAnswerUntilReveal`, which
emoji guess and Word Reveal both do.

## Implemented: odd one out

**Essential interaction:** four equal items appear; the class argues which does
not belong and why; the teacher reveals the prepared odd one and explanation;
no competitive score.

Quiz-shaped discuss format: each set is a slide with four options, but phones
stay on `idle` and the wall tiles are not a scored quiz. Next / Reveal paints
the prepared odd one and opens the explanation. Other defensible rules are
welcome — the justification is the lesson.

Authored fields are four items, which is odd, and an explanation. Catalogue
seeds arrive with four playable sets; readiness wants 3–10. Old choice-based
odd-one-out saves heal onto the `oddone` style.

What it replaced: a multiple-choice quiz with the scoreboard switched off —
still a phone vote with right/wrong language.

## Implemented: compare & contrast

**Essential interaction:** two items appear side by side; the class discusses
similarities and differences; the teacher reveals prepared points; no
competitive score.

Quiz-shaped discuss format: each comparison is a slide with Item A / Item B,
but phones stay on `idle` and the wall is not a brainstorm or a scored quiz.
Next / Reveal opens the prepared similarities and differences panels.

Authored fields are Item A, Item B, similarities, differences, and optional
category. Catalogue seeds arrive with four playable pairs; readiness wants
3–10. Old format→choice saves heal onto the `compare` style.

What it replaced: a brainstorm feedback prompt beside a content slide.

## Implemented: concept chain

**Essential interaction:** a starting concept appears; the class proposes a
related concept and justifies the link; the host types that link and Accepts;
the step joins a visible chain (+1); next start (or timeout / Reject skips).

Quiz-shaped host-oracy deepen: one slide per start term, with session
`chainLinks` that persist across starts in the same presentation. Phones stay
on `idle`. Accept without a typed link is blocked. Connection time is
30 / 45 / 60 / 90 seconds (default 45).

Authored fields are starting concept and definition/prompt. Catalogue seeds
arrive with four playable starts; readiness wants 3–10.

What it replaced: Accept/Reject scoring with static ghost “next link” chrome
that never grew.

## Implemented: definition challenge

**Essential interaction:** a passage appears for study; when time is up (or the
teacher asks early), the passage clears; the recall question appears with a
fresh clock of the same length; the class types the answer.

Quiz-shaped, not a board: each challenge is a typed question. What it owns is
the reading→ask gate. Phones stay on `idle` while the passage is up and only
receive `question` once Ask begins. Reading and answer times share one setting
(20 / 30 / 45 / 60 seconds, default 30) and the clock resets on ask.

Authored fields are `passage`, `question`, and accepted spellings. Old catalogue
saves that mashed the passage into the question text are healed on normalize.
Catalogue seeds arrive playable (three challenges); readiness wants 3–20.

What it replaced: a typed engine with the passage pasted into the question —
so the room could still see the text while answering.

## Implemented: horse race

**Essential interaction:** a question goes up, the teacher moves whichever lane
earned it — or the phones move it themselves in a live room — and it ends when
a lane reaches the post or the questions run out.

Not a board in the Bingo sense: a race is a run of real questions, and the
questions stay quiz slides. What is board-like is the *track*, which outlives
any one question, so that is what got its own module. `js/race.js` holds it:
`create` / `advance` / `back` / `reset` / `standings` / `winner`, with the
track kept per deck so leaving the race and coming back to it later in the
lesson finds the field where it was left. A new presentation clears it.

What it replaced: the track existed only inside `js/live.js`, as `Live.pos`.
Everywhere else the field was rebuilt from the declared teams at position 0
every time it was asked — so a race played without phones drew the starting
gate on every question and never moved anyone. Red 0/5, Blue 0/5, all game,
however the room answered. The mechanic was live-only and decorative
elsewhere, including in the editor's own demo.

Live still owns the phone-scored race and nothing about it changed: when a
room is hosting, the lanes are plain rows and the field moves itself. With
nobody scoring it for us the lanes become buttons — press the lane that earned
the step, shift-press to take one back, because the teacher doing the marking
is the one who will mark it wrong. A lane at the post is disabled rather than
silently ignoring presses. Track lengths are clamped to 3–12: a race won in
one question is not a race, and one nobody can finish is worse.

## Design direction for the remaining formats

These are design targets, not a claim that the full catalogue has been rebuilt.
A distinctive background alone does not deliver a distinctive game.

| Format | SlideForge play experience | Essential interaction |
| --- | --- | --- |
| True/False | A clean two-sided showdown with a misconception reveal | Lock votes, show split, explain, teacher advances |
| Beat the Clock | One sprint with a persistent round clock | Round deadline, rapid questions, final score; no timer restart per question |
| Boss Battle | A shared opponent with visible damage and phase changes | Difficulty controls damage; earned hits reduce persistent HP |
| Memory Maze | A compact spatial board with path study and navigation | Hide the studied route; validate every move; retry from the start |
| Definition Challenge | Passage then recall with phones closed during reading | Remove the passage before accepting answers |
| Word Reveal | Letter tiles with gradual, visible discovery | Award according to letters visible when the guess was submitted |
| Fill in the Blanks | A sentence with individually revealable gaps | Discuss before each reveal; optional word bank; no competition |
| Heads Up | A large term shown to clue-givers and hidden from the guesser | One round clock, correct/pass, immediate next term |
| Spin & Explain | A real random selection from authored concepts | Spin unused terms, optional hint, teacher verdict, next turn |
| Spot the Error | The original sentence as selectable word groups | Select the mistaken phrase; reveal the repair and reasoning |
| Ranking | An ordering workspace that supports touch and keyboard | Reorder, submit, compare with the answer, award positional credit |
| Odd One Out | Four equal tiles; discuss then reveal prepared rationale; no score | Choose, discuss alternatives, reveal the prepared rationale; no score |
| Compare & Contrast | Two equal items; discuss then reveal prepared alike/differ; no score | Discuss alike/differ, then reveal prepared comparison points |
| Predict the Outcome | A scenario and distinct possible futures | Commit before reveal; explain the causal chain |
| Time Traveler | Clue/date recall with a timeline that grows | Answer first; then place the recalled event chronologically |
| Connection Maker | Two concept tiles with an explained connection | Hear the bridge, privately judge it, preserve accepted connections |
| Question Cube | A genuinely random discussion prompt | Roll unused questions, discuss, finish; no competitive points |
| Random Challenge | A shuffled challenge deck with completion progress | Draw without repetition; teacher marks completion or passes |
| Concept Chain | A growing chain of accepted links on the wall | Add a proposed link; teacher accepts it; chain visibly grows |

## Shared standards

Use the active SlideForge theme, 16:9 stage, typography, lesson navigation and
private presenter. Keep timed, teacher-judged, competitive and discussion
activities meaningfully distinct. Never send a teacher verdict control to
learners. Hiding a leaderboard must not stand in for disabling scoring.

Each further game needs an explicit state machine and ownership model before
its visual treatment: setup, playing, feedback, completion and replay. Timers
must be disposed on exit and navigation; stale actions must not score twice.
Mixed lessons must route mechanics by the current activity, rather than applying
the first embedded game's scoring rules to every subsequent game.

Verify saved content round-trips, preview/runtime parity, teacher and learner
views, keyboard operation, tied finishes, replay and movement back into the
lesson. The remaining formats still need this complete treatment.
