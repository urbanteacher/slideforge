# Activities to a premium standard: audit, redesigns and the shared kit — 23 September 2026

The second audit promised by [games-premium-audit.md](games-premium-audit.md).
One activity sets the standard: **Think-Pair-Share** on timed stages
([game-activity-redesign.md](game-activity-redesign.md)). This audit measures
the 44 activities in the catalogue that are not games against the standard it
set. It says what each needs, and which existing components it can be rebuilt
from. The other 10 catalogue entries are games, and the games audit covers them.

It was graded in code. What waves 0–3 built was also run in a browser: the
`activities` and `room-output` smoke scenarios drive a host and two phones.
File references are to `src/`, `js/`, `join.html` and `server/server.js`.

## 1. The premium bar

From Think-Pair-Share and the five activity principles in the redesign doc,
plus the three games tests (P4, P6, P9) that hold for any room. An activity is
premium when it passes all nine.

| # | Test | What it means | Where it was proven |
|---|---|---|---|
| **A1** | **The routine is recognisable** | The wall's shape says which routine this is before anyone reads it. | TPS: the track of four stages. |
| **A2** | **The wall is a stage** | The live prompt or task is the biggest thing on the wall. Steps, guidance and answers are on the desk. | TPS: the live stage's prompt at 54px; guidance in the notes. |
| **A3** | **The wall says where the room is** | The current stage is lit, each stage has its own clock, and there is one clock, never two. | TPS: the lit chip; one `.stage-clock` per stage. |
| **A4** | **The phone has a job, or is told to go down** | Each stage gives a phone something to do (write, talk, send, work), or says "phones down". | TPS: `paintStage` note · talk · send · down. |
| **A5** | **The room sees itself, never one person** | What the room sends is anonymous on the wall and named only on the desk. Private thinking never leaves the phone. | TPS: the Think note stays in `localStorage`; Share is anonymous. |
| **A6** | **The teacher drives from the desk** | Advance, add time, close, spotlight: all in the presenter view. The desk preview shows what the wall shows. | TPS: +30s on the desk; stages move on Next. |
| **A7** | **What the room makes lands somewhere** | The routine closes on its output: an idea spotlighted, a self-assessment revealed, a model answer turned over. It does not vanish when the slide moves. | The flip card's model answer; TPS's answer on the last stage. |
| **A8** | **Authored and rehearsed safely** | The editor shows the stages and each phone job. The rehearsal fills the room's output. It is tested. | `tests/stages.test.js`; the rehearsal's sample ideas. |
| **A9** | **Plays in every room** | It says how it runs with phones, in groups, with no devices, and for one learner. Teacher entry records whatever it collects. | Not yet met by any activity; see section 7. |

Games' P7 (fair scoring) is folded into section 6: activities do not score,
except the two whose name is a contest.

## 2. The scorecard

✓ passes · ◐ partly · ✗ fails · n/a not meaningful. A9 is in section 7.

- **Premium:** all nine.
- **Solid:** A1–A3 pass.
- **Thin:** A1 fails. The activity looks like a glossary.
- **Broken:** the wall tells the room two different things.

"Broken" was concrete (fixed by N7 in wave 0). A timed moment that was not staged drew the slide's
ring clock *and* the moments banner. They were separate timers
(`startSlideTimer` in `js/player.js`, `js/lesson-moments.js`), and the desk's
Pause and +1 min moved only the banner. After one press, the wall showed two
times. At zero, the ring turned the model-answer card while the banner still
had a minute to go.

### Staged talk routines

Rows that are stages ("Pair · 3 min"). These are the ones the stages view was built for.

| Activity | Today | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **Think-Pair-Share** | moment · stages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | Near-premium: A1–A7 pass. Open: the rehearsal has no spotlight; rooms (A9) |
| Think-Pair-Square-Share | moment · stages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | Near-premium: as Think-Pair-Share, with Square as group talk |
| Jigsaw (expert groups) | moment · stages | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✗ | ◐ | Solid: three group-talk stages; nothing lands (the guide is on paper) |
| Jigsaw (collaboration) | moment · stages | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✗ | ◐ | Solid: as the expert-groups Jigsaw |
| Peer-Teaching Carousel | moment · stages | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✗ | ◐ | Solid: the stations pinned as the brief; rotations are work |
| Socratic Seminar | moment · stages | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✗ | ◐ | Solid: the prompt pinned through both circles |
| Teach Someone | moment · stages | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✗ | ◐ | Solid: four partner stages |
| Whiteboards on Walls | moment · stages | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ◐ | Solid: the problem pinned; draw, walk, refine, debrief |
| Do Now / Bell Ringer | moment · steps | ✗ | ◐ | ◐ | ◐ | ✓ | ✓ | ◐ | ◐ | Thin: one clock the desk drives; three untimed tasks, a checklist, not stages |
| Strategic Wait Time | moment · steps | ✗ | ◐ | ◐ | ✗ | ✓ | ✓ | ✗ | ◐ | Thin: one clock; its pauses are seconds, run by the teacher |
| Daily Review Routine | slide · steps | ✗ | ◐ | n/a | ◐ | ✓ | ✓ | ◐ | ◐ | Thin |
| Dialogue Chain | slide · steps | ✗ | ◐ | n/a | ◐ | ✓ | ✓ | ✗ | ◐ | Thin: sentence stems as rows |

### Collect from the room

An audience prompt on a labelled-rows slide.

| Activity | Prompt | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| Word Splash | word cloud | ◐ | ◐ | n/a | ✓ | ✓ | ◐ | ✗ | ◐ | Thin: the source's confidence marking is on paper; the cloud asks something else |
| Knowledge Activation Web | word cloud | ◐ | ◐ | n/a | ✓ | ✓ | ◐ | ✗ | ◐ | Thin: a cloud, not a web; the notes say so |
| Question Cube (six types) | game · Question Cube | ✓ | ✓ | ◐ | ◐ | ✓ | ✓ | ◐ | ◐ | Solid: hands over to the Question Cube game, its six questions as faces; graded as that game (games audit) |
| Real-World Connection Hunt | moment · stages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | Near-premium: a stage, a clock, a box and a spotlight per place |
| Muddiest Point | brainstorm | ✓ | ◐ | n/a | ✓ | ✓ | ✓ | ◐ | ◐ | Solid-: the desk spotlights the point to fix. The wall says "Spotlight", not §4's "We'll fix this one" |
| Exit Ticket | brainstorm | ✓ | ◐ | n/a | ✓ | ✓ | ✓ | ◐ | ◐ | Solid-: named on the desk and in the report, which is right |
| Exit Ticket 3-2-1 | brainstorm | ✓ | ◐ | n/a | ✓ | ✓ | ✓ | ◐ | ◐ | Solid-: three answers in one box |
| Structured Reflection | poll · panels | ✓ | ✓ | n/a | ✓ | ✓ | ✓ | ✓ | ◐ | Solid, near premium: held, so the wall shows how many are in until the desk shows the split |
| Reflection Ladder | scale · panels | ✓ | ✓ | n/a | ✓ | ✓ | ✓ | ✓ | ◐ | Solid, near premium: held, then the column chart; who needs support is the desk's |

For all nine, before wave 2:
- **A6:** an authored prompt had no close control on the desk. It ended
  when the slide moved, and its only desk surface was the read-only Pulse
  list.
- **A7:** there was no reveal, no spotlight and no hide. Results updated
  live, then vanished.
- **A5 ◐** on the two self-assessments: live bars meant the fifth student
  saw where the first four went.

Wave 2 added a close control for all nine and spotlight and hide for the
brainstorms, and holds the two self-assessments. The word clouds' A6 stays
◐: they can be closed, but single words cannot be spotlighted or hidden.

### Teacher-led slides

The teacher talks; the phones get the "On the screen" card with Got it / Need help.

| Activity | Today | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| Clear Objectives | rows | ◐ | ◐ | n/a | ◐ | ✓ | ✓ | n/a | ✓ | Solid (a slide by design) |
| Hook + Objectives | brief | ✓ | ✓ | n/a | ◐ | ✓ | ✓ | n/a | ✓ | Solid |
| Connection Slide | rows | ◐ | ◐ | n/a | ◐ | ✓ | ✓ | n/a | ✓ | Solid |
| Preview Next Lesson | rows · idea box | ◐ | ◐ | n/a | ✓ | ✓ | ✓ | ◐ | ✓ | Solid: every phone sends a prediction, kept for next lesson's start |
| Hook and Predict | split · idea box | ◐ | ✓ | n/a | ✓ | ✓ | ✓ | ✓ | ◐ | Solid: the picture stays; the room's wonders arrive and one is spotlighted |
| Establish Talk Ground Rules | stages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | Solid, near premium: the drafted rules arrive as cards. Only three can be spotlighted, and §4 planned five |

### Modelled instruction

| Activity | Today | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| I Do, We Do, You Do | stages | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | Solid: four phases, each with its clock; You do alone is work |
| Concept Development | rows | ✗ | ◐ | ✗ | ◐ | ✓ | ◐ | ✓ | ◐ | Thin: five phases, untimed, one clock |
| Worked Example Analysis | brief | ✓ | ✓ | ✗ | ◐ | ✓ | ◐ | ✓ | ◐ | Solid-: the example is the brief, as it should be |
| Flipped Instruction | 3-slide arc · brief | ✓ | ✓ | ◐ | ◐ | ✓ | ✓ | ✓ | ◐ | Solid: a clock per page; no "part 2 of 3" |
| Guided Inquiry | 4-slide arc · brief | ✓ | ✓ | ◐ | ◐ | ✓ | ✓ | ✓ | ◐ | Solid: as Flipped |

### Tasks

A long piece of work, with the brief on the wall.

| Activity | Today | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| Problem-Based Learning | brief | ✓ | ✓ | ✗ | ◐ | ✓ | ◐ | ✓ | ◐ | Solid-: six stages, 40 min, one clock |
| Design and Create | stages | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | Solid: the brief pinned; plan, create and self-assess are work |
| Error Analysis | brief | ✓ | ✓ | n/a | ◐ | ✓ | ✓ | ✓ | ◐ | Solid |
| Differentiated Practice Menu | panels | ✓ | ✓ | n/a | ◐ | ✓ | ✓ | ✓ | ◐ | Solid: the menu is the thing |
| Quick Practice Stations | cards | ✓ | ✓ | ✗ | ◐ | ✓ | ◐ | ✓ | ◐ | Solid-: rotations are timed in the notes, not on the wall |
| Concept Card Sort | game · Compare sort | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | Near-premium: every card sorted on the phones, Perimeter, Area or both; the reveal names the card most misfiled |
| Scenario Analysis | stages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | Near-premium: the three scenarios pinned; two group-talk stages; predictions come back |
| Benefits vs Limitations Battle | brief | ✓ | ✓ | n/a | ✗ | ✓ | ◐ | ✗ | ◐ | Thin, by decision: it stays a slide, and its scoring rule is kept on the board (§6) |
| Connect Four (concepts) | table | ✓ | ✓ | n/a | ✗ | ✓ | ◐ | ✗ | ◐ | Thin: the grid is drawn; claims are on paper |

### Written reflection

| Activity | Today | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| Learning Log Entry | stages | ✓ | ✓ | ◐ | ✓ | ✓ | ✓ | n/a | ◐ | Solid: five private notes, one prompt at a time, untimed; the desk sees a count |
| Plus / Minus / Interesting | stages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | Near-premium: a box per column; the three spotlights stand together at the look back |
| Visual Summary | stages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | n/a | ◐ | Solid: the formats pinned; make (work), then share with a partner |

**Totals, after wave 3 and the two hand-overs:**
- 0 premium. What holds back the nearest is A8's rehearsal (no spotlight; a held prompt shows sample bars) and A9's teacher entry, deferred for polls and scales (§6, §7).
- 8 near-premium:
  - Think-Pair-Share and Think-Pair-Square-Share;
  - the Connection Hunt;
  - the two self-assessments;
  - Scenario Analysis, PMI and the Concept Card Sort.
- 27 solid or solid-minus.
- 9 thin: Do Now, Wait Time, Daily Review, Dialogue Chain, the two word
  clouds, Concept Development, the Battle and Connect Four.
- 0 broken. There were 9, every timed moment not on stages, and the one clock (N7) fixed them all.
- The Question Cube game supersedes the Question Cube activity (see §4).

## 3. The shared kit

**Reuse before you write.** The games kit (games audit §3, K1–K17) serves
activities too. These are the parts that matter here.

| # | Component | Where | What it gives activities |
|---|---|---|---|
| K6 | **Stages runtime** | `src/activities/stages.js`, `js/stages.js`, `layoutStages` in `js/render.js` | Track, a clock per stage, +30s on the wall and desk, advance on Next, the stage on the phones. Parsed from the rows the activity already stores |
| K7 | **Phone job cards** | `paintStage` in `join.html`; `cleanStage` in the relay | note · talk · send · down |
| K8 | **Private phone note** | `slideforge.note.<session>.<slide>` | Think, Predict, a learning log |
| K9 | **Anonymous idea box** | `Live.startCustomPrompt({presentAs: 'rail'})` | Share, a hunt, a rule, PMI's columns |
| N3 | **Proposal queue** | `openProposals`, `useProposal` in `js/live.js`; the desk list in `js/manual.js` | Named on the desk, anonymous on the wall; "Use this" puts one on the table. Today it serves three games only (`proposalSlide`) |
| — | **Flip card** | `modelAnswer` / `modelAnswerDraft`; the ⇄ button | The worked answer, turned over by the teacher or at time |
| — | **Lesson moments** | `js/lesson-moments.js`; the desk's On screen card | Pause, +1 min, Clear from the desk |
| — | **Pace signals** | Need help on the phone's content card → the desk's "need a hand" | A quiet "I'm stuck" during work that the room never sees |
| K10 | **Room pane** | `src/render/live.js` | Poll bars, scale columns with the mean and "room is split", idea cards, word cloud |
| K11 | **Desk plumbing** | `data-desk`, `Player.gameControls` | Any wall control becomes a desk button |
| K16 | **Relay harness** | `tests/harness.js` | Real server, real sockets |

### Build once, before the activities that need them

Numbered after the games' N1–N6, because some are shared.

| # | Component | Why once | Used by | Size |
|---|---|---|---|---|
| **N7 · done** | **One clock**: a timed moment's ring follows the desk's Pause, +1 min and Clear; the banner stands aside on the wall | The nine broken moments. One fix, not nine | every timed moment | S |
| **N8 · done** | **The desk shows the live stage**: the presenter's preview is drawn at the room's stage, not as the full list | A6 for every staged routine | all staged | S |
| **N9 · done** | **Pinned brief**: a leading row with no time stays on the wall through every stage | The problem, question or scenario must not vanish when the work starts | Socratic, Whiteboards, Carousel, Design and Create, PBL, Wait Time | S |
| **N10 · done** | **A work job**: "Work on the task", with a quiet *I'm stuck* that reaches the desk as a need-a-hand | Long tasks have no phone job; the pace signal already exists | Design, PBL, Carousel, Stations, I Do/You Do | S |
| **N11 · done** | **Group talk**: a talk stage that is not a pair says "Talk in your group", on the wall and the phone | "Turn to your partner" is wrong for a jigsaw or a seminar | Jigsaw ×2, Square, Socratic, Carousel | S |
| **N12 · done** | **Spotlight and hide on any idea box**: N3's "Use this" for every brainstorm, including a stage's Share | TPS-01; the thing Muddiest Point, Share and PMI all need | every brainstorm | S–M |
| **N13 · done** | **The written count**: "19 of 26 have written something" during a private stage. The phone sends *that* it wrote, never *what* | TPS-02; the one number a teacher needs during silent work | Think, Predict, Learning Log | S |
| **N14 · done** | **Prompt controls on the desk**: close now; hold, then reveal, for a poll or scale | A6 and A7 for all nine collect-from-the-room activities | polls, scales, clouds, brainstorms | M |
| E3 · built for games | **Tally entry** (games GA-15) | Hands up and paper feed the same bars | quiz questions only; polls and scales deferred (AC-13, §6) | M |
| N6 · built for games | **Sort input** (games GA-26): a column per item, the columns fixed as A only / Both / B only | Cards into bins on the phone | Card Sort (blocked, see §4), Compare | L |

### Built in wave 3: reuse these too

| # | Component | Where | What it gives |
|---|---|---|---|
| AK1 | **A declared job** in a row's label, `[note]` `[talk]` `[send]` `[work]` `[down]`, at the end: "At home · 3 min [send]" | `declaredJob`, `stripDeclaredJob` in `src/activities/stages.js` | Beats the inferred words; stripped wherever a label is shown |
| AK2 | **A box per send stage** | `syncShare` in `js/stages.js` | Plus, then Minus, or a hunt's three places collect separately |
| AK3 | **Several spotlights per slide**, three at most, each named for its stage | `Live.spotlights`, `paintSpotlight` in `js/live.js`; the desk block | PMI's three columns side by side; a spotlight's id is its box plus its idea |
| AK4 | **A private note per note stage** | `stageNoteKey`, `latestNote` in `join.html` | A Learning Log's five prompts are five notes; a talk stage shows back the latest |
| AK5 | **The live stage, drawn anywhere** | `SF.lightStages` in `js/render.js` | The desk's preview at the room's stage |
| AK6 | **Activity rooms** | `activityPlays` in `src/activities/rooms.js`, attached in `src/model.js` | Each activity's `plays`, derived from its shape |
| AK7 | **Room badges** | `SF.roomBadges` in `js/activities.js` | One badge row for both libraries |

## 4. Redesigns, family by family

S < a day, M a few days, L a week or more.

### Staged talk routines: stages, everywhere they fit

The redesign doc said it: "Once it exists, it spreads for free." It did not,
because only Think-Pair-Share defaults to stages and the parser misses
several rows.

- **Default to stages** when at least two rows carry a time:
  - Think-Pair-Square-Share
  - both Jigsaws
  - Peer-Teaching Carousel
  - Socratic Seminar
  - Teach Someone
  - Whiteboards on Walls

  N7 is then moot for them: stages already stand the banner aside.
- **Parse what the source wrote:** "Rotate · every 4 min" is four minutes.
- **Pinned brief (N9):**
  - the Socratic prompt stays up through both circles;
  - the Whiteboards problem through the gallery walk;
  - the Carousel's four stations through every rotation.
- **Jobs that fit the routine (N10, N11):**
  - Jigsaw's home and expert groups talk *in groups*;
  - Teach Someone's partners talk in pairs;
  - the Seminar's circles are phones down;
  - a Carousel rotation is work.
- **Stay as they are:**
  - **Do Now** is three untimed tasks, a checklist the room works down.
  - **Strategic Wait Time** is the teacher's pauses in seconds: a desk
    tool, not a wall routine.

  Both are wall checklists, so they only need N7's one clock.
- **Daily Review and Dialogue Chain** are teacher-paced slides. They stay
  numbered steps, and the phones get the on-screen card.

### Collect from the room: the output lands

- **N14 on all nine:**
  - the desk can close the prompt;
  - the two self-assessments are held and revealed by the teacher (§6).
- **N12:**
  - Muddiest Point: the teacher spotlights the point to fix, and the wall
    says "We'll fix this one".
  - Exit Tickets: the teacher reads them on the desk, as now.
- **Real-World Connection Hunt → stages:**
  - Room · 3, Home · 3, Community · 3, each a send stage.
  - One idea box per stage, so the cards arrive sorted by where they were
    found.
  - Reflect is phones down.
- **Reflection Ladder:**
  - Held, then revealed as the column chart.
  - "Who needs support" is the desk's need-a-hand list, never the wall.
  - Its "I'm here because…" becomes a private note (K8).
- **Word Splash** keeps its cloud. It is honest that the confidence
  marking is on paper, and the notes already say so. *Blocked:* a
  per-term confidence sort needs columns other than N6's A only / Both /
  B only.
- **Question Cube (activity)** is superseded by the Question Cube game.
  - **Done 23 Sep.** Choosing it inserts the Question Cube game, with its
    six authored questions as the game's six faces.
  - The first attempt was reverted: Quiz studio's AI had no Question Cube
    shape, and the activity's "Write it" guardrail (the six Rosenshine stems)
    would have been lost.
  - Since `de69598` the game AI writes exactly the six faces, so the
    guardrail travels with the game.

### Teacher-led slides

Slides by design: A3 and A7 are not their job.
- **Hook and Predict** (decided differently in wave 3):
  - It stays a split slide. The picture is the hook, and a staged slide has
    no place for one.
  - It collects "What do you wonder?" beside the picture, anonymously, and
    the teacher spotlights the question the lesson will answer.
  - The Predict *game* is the scored, committed version.
- **Preview Next Lesson:** the closing question becomes a one-line idea box.
  Its answers are the next lesson's starter.
- **Ground Rules:** the "our ground rules" row becomes a Share stage. The
  room's drafted rules arrive as cards, and the teacher spotlights the five
  to keep. *Built with three:* a slide holds three spotlights (AK3).

### Modelled instruction and tasks

- **I Do, We Do, You Do → stages:**
  - I do and We do are phones down.
  - You do together is talk.
  - You do alone is work (N10).
  - Each has its own clock, so the 25-minute block stops being one ring.
- **Design and Create, Problem-Based Learning → stages with a pinned brief
  (N9):**
  - The brief stays on the wall.
  - Planning, Creating and Self-assessment are work; Gallery walk is down.
  - PBL's rows need their times written in.
- **Quick Practice Stations:** a round clock (games N4) per rotation.
  - *Blocked:* this was built on stages and reverted.
  - Groups are at different stations at the same time, so the wall cannot
    name one station.
  - Its "Write it" guardrail wants a real task in each station's box.
  - It needs a clock that knows a rotation: every group moves, and the
    stations stay put.
- **Scenario Analysis:** the three scenarios pinned, the two questions as
  talk stages.
- **Benefits vs Limitations Battle:** stays a slide, by decision (§6).
  - Team credit would need a new spoken game style, with all nine
    registrations.
  - Its scoring rule ("valid new point: 1") stays on the slide, for the
    board.
- **Connect Four:** a board (K12) where a team claims a cell and the teacher
  accepts. L; after the boards work.
- **Concept Card Sort:** **Done 23 Sep**, on N6 as a Compare sort
  (Perimeter or Area).
  - The twelve cards are three rounds of four, each round with one card for
    Both.
  - The first attempt was reverted: Quiz studio's `compare` AI wrote no
    statements. Since `de69598` it writes four to eight tagged statements a
    round.
  - The source's student-chosen categories are kept as a question for after
    the sort (in the teacher notes).

### Written reflection

- **Learning Log:** five private note stages (K8), untimed.
  - The phone keeps the log.
  - The desk gets the count of how many have written (N13), never the words.
- **Plus / Minus / Interesting:**
  - three send stages;
  - the wall's three cards fill with the room's anonymous ideas, one column
    each;
  - the teacher spotlights one per column.
- **Visual Summary:** stages: Create · 6 (work), Share · 2 (talk).

## 5. The order to build in

| Wave | What | Why first | Size |
|---|---|---|---|
| **0** | **Done 23 Sep.** N7 one clock; N8 the desk shows the live stage | The wall says two things today; the desk shows the wrong thing | S |
| **1** | **Done 23 Sep.** N9 pinned brief, N10 work, N11 group talk; the parser reads "every 4 min"; stages by default for the seven staged routines, I Do/We Do/You Do and Design and Create | The flagship's shape spread to where it fits: nine activities from thin or broken to solid | S–M |
| **2** | **Done 23 Sep.** N12 spotlight and hide; N13 the written count; N14 prompt controls (close, hold, reveal) | The room's output lands; closes TPS-01 and TPS-02 | M |
| **3** | **Done 23 Sep.** Family redesigns on the kit (Hook and Predict, Connection Hunt, PMI, Learning Log, Ground Rules, Preview, Visual Summary, Scenario Analysis) and room declarations (AC-16) | Each is a preset change on stages plus N12 | S each |
| **with GA-15** | **E3 tally entry** for polls and scales | Rooms with no devices | M |
| **4** | **Question Cube activity → game: done 23 Sep.** The Battle stays a slide (decided). Stations: blocked on a rotation-aware clock | See §4 | S–L |
| **after GA-26** | **Concept Card Sort: done 23 Sep.** Word Splash confidence: blocked on custom sort columns | N6 is built | L |
| **later** | Connect Four as a board | | L |

At the end of wave 1 the broken count was zero, as planned. At the end of
wave 3 there are 8 near-premium, fewer than "most". Two things hold them
back:
- A8's rehearsal: the rehearsal has no spotlight, and shows sample bars
  for a held prompt.
- A9's teacher entry: a room without phones cannot put an idea or a vote
  in (tally entry, AC-13).

## 6. Decided

Decided on 23 September from user experience and logic, as the games audit
was.

### A private note is never sent. Only *that* someone wrote is counted.

**The rule:** during a note stage, the phone tells the relay that it has
written something (a yes, once there are a few words), never the text.
- The wall and the desk show the room's count: "19 of 26 have written
  something".
- Nobody is named, not even on the desk.

**Why:**
- Students write more honestly when "Only you can see this" is true, and
  it stays true.
- The teacher still gets the one thing they need during silent thinking:
  whether to wait.
- A count is safe on the wall (P4). A named list of who has *not* written
  would name a failure, which the games audit's §6 rules out.

### Self-assessment is held until the teacher shows it

**The rule:**
- A poll or scale in the Reflection phase collects hidden: the wall shows
  "14 of 26 have answered", not the bars.
- The teacher reveals the bars from the desk.
- Names are on the desk, never the wall.
- Other polls stay live, as now.

**Why:**
- Live bars anchor: the fifth student sees four "Got it"s and taps
  "Got it".
- The point of a self-assessment is the honest answer, and it is the one
  place where seeing the room first changes what you say.
- The desk is where "who needs support" belongs (P4); the room pane already
  moved "needs a hand" there.

### Activities do not score, except a contest built as a game

**The rule:**
- No activity puts points on the standings.
- The Benefits vs Limitations **Battle** stays a slide. It keeps its
  scoring rule for the board, and puts nothing on the standings. Decided by
  Mark on 23 September 2026: team credit would need a new spoken game style.
- Connect Four would score by team if it is built as a board (§4, later).

**Why:**
- Games are where the room competes. An activity is where it thinks, talks
  and makes, and a leaderboard there rewards speed and confidence over the
  work.
- The exception follows the games' first test: the name is the mechanic.

### Tally entry for polls and scales is deferred

**The rule:** AC-13 is left open and not built. Decided by Mark on 23
September 2026. In a room without phones, a poll or scale on the wall stays
empty, and the teacher reads the room by hands, as now.

**Why:**
- **Two activities would use it:** Structured Reflection and the
  Reflection Ladder. The other seven prompt activities collect words and
  ideas, which a count cannot fill. The teacher's own polls on ordinary
  slides would gain too.
- **Nothing breaks without it.** The loss is the bars on the wall and the
  record in the report, not the activity.
- **For the two self-assessments it works against the hold.** They are held
  so that nobody answers by looking at the room (see above). A show of hands
  is public, and brings the anchoring back. Paper slips counted afterwards
  would not, and are the case worth building for.
- **It crosses files another agent is working in:** the relay,
  `js/live.js` and teacher entry.

**What would change it:** teaching often in rooms where most learners have
no device, and wanting those self-assessments on record. The pieces exist:
tally entry for quiz questions (GA-15, `handCounts` in the relay) extends to
`feedbackDigest`'s poll and scale counts.

### Which activities become stages

**The rule:** an activity is staged when at least two of its rows carry a
time, or when a stage-only feature is its point (a private note, one idea
box per stage).

Everything else stays a slide in its own presentation:
- a checklist (Do Now),
- the teacher's own pacing (Wait Time, Dialogue Chain),
- a menu (Differentiated Practice),
- or a slide by design (Objectives).

**Why:**
- The stages view shows one row at a time. That is right for a routine the
  room moves through together.
- It is wrong for a list the room needs to see whole: objectives, a menu,
  three Do Now tasks worked in any order.

### A stage's clock never advances the slide

This is already the rule in `js/stages.js`, and it stays.

## 7. Who is in the room

| Room | Staged routines | Collect from the room | Teacher-led, tasks, reflection |
|---|---|---|---|
| **Phones** | ✓ | ✓ | ◐ the on-screen card and Need help |
| **Groups or teams** | ✓: the routine is the grouping | ◐ one phone per group works, but the count is per phone | ✓ |
| **No devices** | ✓: the wall carries it, and the phone job is extra | ✗: teacher entry cannot record a poll, scale or idea (no `manualAnswer` path for feedback) | ✓ |
| **One learner, alone** | ◐: the stages run in a solo present, with no phone | ✗ | ✓ as slides |

**A9 needs:**
- E3 tally entry, so a show of hands fills a poll or scale. *Deferred by
  decision (§6):* it is built for quiz questions (GA-15), not for polls and
  scales.
- A typed idea from teacher entry, so a paper Exit Ticket can reach the
  desk list.
- ~~Each activity declaring its rooms~~ **done in wave 3 (AC-16).**
  - Every activity has `plays`, derived from its shape in
    `src/activities/rooms.js`. The profiles are a staged routine, one with an
    idea box, a prompt, a slide, and a checklist moment. A game borrows its
    engine's.
  - The library shows these as badges, through the one `SF.roomBadges`
    both libraries use.
  - The catalogue test holds every activity to four statuses with reasons.
    A prompt says `entry: no` until tally entry exists.

## Change log

- **23 September 2026 — TPS-04, and the rehearsal's class sizes.**
  - **TPS-04:** a slide saved before its routine ran as stages is offered
    them in the inspector ("Run it as timed stages"). It is never switched
    for the teacher.
  - **RP-01:** a rehearsal can be a class of 8, 30 or 120. That narrows A8's
    rehearsal gap: a big room can now be rehearsed. The gap left is the
    rehearsal's spotlight, and a held prompt that shows its sample bars.
  - Deployed in `6888921`. `npm test` 529/529. Not seen in a browser.

- **23 September 2026 — Tally entry for polls and scales deferred (AC-13).**
  Mark's decision, with the reasoning in §6: two activities would use it,
  nothing breaks without it, and a show of hands undoes the self-assessments'
  hold.

- **23 September 2026 — The Question Cube and Card Sort hand-overs, redone.**
  - They were redone after `de69598` taught the game AI both shapes.
  - **Question Cube** inserts the Question Cube game (`randomchallenge`,
    format `question-cube`), its six perimeter questions as faces.
  - **The Card Sort** inserts a Compare & Contrast sort: three rounds of
    four cards, plus one for Both, Perimeter or Area.
  - A preset that remaps onto a game now names its engine (`style`).
  - **Tests:** `npm test` 525/525. The two AI guardrail tests now check that
    each activity is written by its game's shape. The slide-guardrail test
    moved to Worked Example Analysis, which still writes on the slide. A
    compile test checks six faces, and three rounds of five cards each.
  - Seen in the browser: both inserted from the catalogue, the cube rolling
    "Why", and the sort board with its five cards.
  - **Decided (Mark):** the Battle stays a slide (§6).
  - Stations and Word Splash stay blocked.

- **23 September 2026 — The body brought up to date.**
  - The wave 3 kit is in §3 (AK1–AK7), not only in this log.
  - §4 and §5 now say which plans are blocked or unblocked. The game AI's
    new cube and compare shapes (`de69598`, games side) unblock the Question
    Cube and Card Sort remaps; they have not been redone.
  - The introduction says what was seen in a browser.

- **23 September 2026 — AC-14 and AC-15 tried, and reverted.**
  - **What was tried:**
    - the Question Cube activity handing over to the Question Cube game,
      seeded with its six questions;
    - the Concept Card Sort as a Compare & Contrast sort (Perimeter or
      Area, three rounds of four cards and one for Both);
    - Quick Practice Stations on stages, a clock per rotation.

    All three compiled, and the catalogue and stage tests passed.
  - **Why reverted:** two AI tests failed, and they were right. Each of these
    activities has a "Write it" guardrail in `js/ai.js`:
    - the six Rosenshine stems for the cube;
    - named categories and twelve to twenty items for the sort;
    - a real task in each station's box, "not rotation instructions alone".

    Handing the first two to games moves their writing to Quiz studio's AI.
    That AI has no Question Cube shape, and its `compare` shape writes no
    statements to sort. The stations rows were rotation instructions, which
    their own guardrail forbids. Stages were also the wrong model: groups
    are at different stations at the same time.
  - **What unblocks each:**
    - the game AI learning the `question-cube` faces and `compare`
      statements (games-side, `js/ai.js`);
    - a clock that knows a rotation (every group moves, the stations stay);
    - custom sort columns, for Word Splash's confidence.
  - **Open decision:** the Benefits vs Limitations **Battle** scoring by team
    needs a new spoken game style, and all nine of a style's registrations.
    That is larger than §5's "S–M", and it is Mark's call.

- **23 September 2026 — Wave 3 (AC-09 to AC-12, AC-16).**
  - **Kit.**
    - A stage label may declare its job at its end, "At home · 3 min
      [send]". It beats the inferred words, which read "home" as a jigsaw's
      home group. The tag is stripped wherever a label is shown: the wall,
      the chips, the inspector, and the non-stage layouts.
    - Each send stage opens its own idea box.
    - Up to three spotlights stand on a slide, side by side, each named for
      the stage it was sent in. A spotlight's id is its box plus its idea,
      because the relay numbers ideas per box.
    - A phone keeps a private note per note stage. The first note stage keeps
      its old key, and a talk stage shows back the latest note.
  - **Presets.**
    - Ground Rules: Think, Pair, Share, Agree.
    - The Connection Hunt: now a moment, with three place stages and a
      closing note.
    - Scenario Analysis: the three scenarios pinned as one brief, two talk
      stages and a report back.
    - The Learning Log: five untimed note stages.
    - PMI: three send stages and a look back.
    - Visual Summary: the formats pinned, then create and share with a
      partner.
    - Preview Next Lesson: its closing question is an idea box.
    - Hook & Predict keeps its split slide and collects wonders. This changes
      §4's plan; the reason is there.
  - **Rooms (AC-16):** see §7.
  - **Tests:** `npm test` 519/519. The stage table now pins sixteen routines,
    and declared jobs have a test. The `room-output` smoke adds PMI: three
    boxes, one spotlight from each, and the three labelled cards at Look
    back. Seen in the browser: PMI's look back, and the badges on all 54
    activity cards and on the format library's 30 game cards.
  - **Where the build left §4's plan.** Hook & Predict is recorded in §4.
    The others were not decided, only built, and are open for review:
    - Ground Rules spotlights at most three rules; the plan said five.
    - The Hunt's closing Reflect is a private note; the plan said phones
      down.
    - Scenario Analysis has a third stage, Report back, that the plan did
      not have.
    - Muddiest Point's spotlight is labelled "Spotlight", not "We'll fix
      this one".
  - **Committed in pieces.** The `js/live.js` and `join.html` halves went in
    with the other agent's `53f5c3c` and `275ad28`, which committed those
    files whole.

- **23 September 2026 — Wave 2 (AC-06 to AC-08).** What the room sends
  now lands.
  - **The desk block.** Beside the notes on the presenter's main pane:
    - the prompt and how many have answered (or, in a note stage, how many
      have written something);
    - Show results for a held prompt, and Close;
    - each idea with its author ("only you see this"), with Spotlight and
      Hide.

    It shows for a slide's own prompt and a Share stage's idea box, not
    for the teacher's quick poll, which has its own card.
  - **Spotlight (N12).** The idea goes on the wall at the foot of the slide
    without a name, and stays for the rest of the slide, so Share's idea
    is there for Connect. Hide takes an idea off the wall, and out of the
    spotlight if it was there. Both work on the host's copy of the
    digest, so the report keeps everything.
  - **The written count (N13).** A note-stage phone sends `wrote` (yes or
    no, once it has two words or ten characters), never the text. The
    relay counts phones only and tells the host alone, and never
    journals it. A new note stage starts at nought.
  - **Prompt controls (N14).**
    - Close ends an authored prompt for the rest of the visit; a redraw
      does not reopen it, but coming back to the slide does.
    - A poll or scale can be `hold`; the two self-assessments are. While
      held, the wall's rail and full-screen view show the count and "Hidden
      until your teacher shows them".
  - **Tests:** `npm test` 513/513, with `tests/room-output.test.js` (the
    relay count, `hold`). The new smoke scenario `room-output` drives a host
    and two phones through Think, Share and a held poll. Seen in the
    browser: the spotlight at Share and at Connect, the held rail, and the
    desk block with the live stage beside it. That also confirms the
    wave 1 desk preview.
  - **Open:** the rehearsal still shows sample bars for a held prompt and
    has no spotlight; single words in a cloud cannot be spotlighted.
- **23 September 2026 — Waves 0 and 1 (AC-01 to AC-05).**
  - **One clock (N7).** A timed moment's ring now reads the desk's moment:
    Pause holds it (dimmed), +1 min adds to it, Clear takes it off the wall.
    The banner stands aside wherever a slide draws its own clock. Nine
    moments were broken by this; none are now.
  - **The desk shows the live stage (N8).** `SF.lightStages` draws the
    presenter's preview at the room's stage, and the next-slide preview at
    its introduction. It used to list every stage.
  - **Stages spread.** Nine more routines default to stages, by the rule in
    §6: Think-Pair-Square-Share, both Jigsaws, the Carousel, the Seminar,
    Teach Someone, Whiteboards, I Do/We Do/You Do and Design and Create.
    Do Now, Wait Time, Daily Review and Dialogue Chain stay numbered steps.
  - **Pinned brief (N9).** A leading untimed row with two or more timed rows
    after it stays up on the wall and on the phone through every stage.
  - **Work (N10) and group talk (N11).** A fifth job, `work`, keeps the
    phone's Need help and hides Got it. A talk stage is a group unless the
    routine is in pairs; an ambiguous label ("Switch", "Together") takes the
    routine's word for it. "Rotate · every 4 min" parses. The relay passes
    `work`, `brief` and `group`.
  - **Fit.** A stages rule was outranked by the activity slide's centred
    pad, so a long authoring list pushed the track off the top. It is now
    top-aligned, and the authoring list is set smaller. All ten staged
    activities were measured to fit, in 23 themes and at every stage.
  - **Tests:** `npm test` 508/508; the activities, add-activity and
    audience-feedback smoke scenarios pass. A test pins every staged
    routine's stages and jobs. Seen in the browser: the Seminar's first
    stage on the wall. The desk and a phone were not opened.
- **23 September 2026 — Audit written.** 44 activities graded against A1–A9;
  the kit, N7–N14, the waves and four decisions. Read in code; not seen in a
  browser.
