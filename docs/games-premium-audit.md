# Games to a premium standard: audit, redesigns and the shared kit — 23 September 2026

Two things set the high standard: one game (**Spot the Error**) and one
activity (**Think-Pair-Share**). This audit measures all 27 game formats
against the standard those two set. It says what each game needs, and
which existing components it can be rebuilt from, so no game reinvents
what another already has.

Activities come next, in a second audit with the same shape.

It builds on the 11 September audit ([slideforge-games-audit.md](slideforge-games-audit.md))
and the 12 September setup review ([game-ux-review.md](game-ux-review.md)).
Those sorted games by engine. This audit grades them by what the room
experiences.

## 1. The premium bar

From the two flagships. A game is premium when it passes all nine. (P9 was added after the first draft; see section 7.)

| # | Test | What it means | Where it was proven |
|---|---|---|---|
| **P1** | **The name is the mechanic** | The only way to answer is to do what the title says. | Spot: you can only answer by finding the word. |
| **P2** | **The wall is a stage** | One big thing at a time. Options and small print go on the phone. | Spot's passage; the TPS stage prompt at 54px. |
| **P3** | **Tension → reveal → reason** | Results are held until the reveal. The reveal shows where the room was against the answer, then the reason in one sentence. | Spot's heat map, strike-through and verdict line. |
| **P4** | **The room sees itself, never one person** | Distributions and counts are anonymous. Judgements about a person go to the desk. | Room pane: needs-a-hand moved to the desk; anonymous ideas. |
| **P5** | **The phone does the verb** | Tap, drag, place or type: the same shape as the wall. | Spot's tap-the-word; TPS stage jobs. |
| **P6** | **The teacher drives from the desk** | Every control the game needs exists in the presenter view, not only on the projected wall. | TPS +30s on the desk; stage moves on Next. |
| **P7** | **Fair, legible scoring** | Points reach the person who earned them, for the thing they did. Counts and accuracy are never confused with points. | Spot: points on a find, no speed bonus; the pane labels its column. |
| **P9** | **Plays in every room** | The game states how it runs with individual phones, with teams, with learners who have no device, and for one learner alone. Teacher entry can record every kind of answer it asks for. | See section 7. Spot records a tap in teacher entry and declares its room support. |
| **P8** | **Authored and rehearsed safely** | The editor shows what the phones will get and `problems()` catches mistakes. The rehearsal class behaves like a real one, lures included. It is tested through the relay harness. | Spot's editor preview, lure-seeking demo class and relay test. |

## 2. The scorecard

✓ passes · ◐ partly · ✗ fails. P9 is covered in section 7; the other eight
tests are in the table. The tier follows from the row.
- **Premium:** all nine.
- **Solid:** P1–P3 pass.
- **Thin:** P1 fails.
- **Broken:** P7 fails in a way that gives wrong results.

| Format | Engine | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **Spot the Error** | `spot` | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ | Near-premium: P9 is declared; the desk still has no heat-map preview |
| Ranking Challenge | `order` | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | Solid, near premium: the reveal puts the rows in order, fills each with how many of the room put it there, and names the pair most swapped |
| Horse Race | `race` | ✓ | ✓ | ◐ | ◐ | ◐ | ✓ | ✓ | ◐ | Solid: the teacher-run lanes are on the desk too (data-desk) |
| Boss Battle | `boss` | ✓ | ✓ | ◐ | ✓ | ◐ | ✓ | ✓ | ◐ | Solid: Reveal, Hit and Miss are on the desk too (data-desk) |
| Memory Flip | `memoryflip` | ✓ | ✓ | ✓ | ✓ | ✗ | ◐ | ◐ | ✓ | Solid (board) |
| Memory Match | `memorymatch` | ✓ | ✓ | ✓ | ✓ | ✗ | ◐ | ◐ | ✓ | Solid (board) |
| Knowledge Flip | `knowledgeflip` | ✓ | ✓ | ✓ | ✓ | ✗ | ◐ | ◐ | ✓ | Solid (board) |
| Bingo | `bingo` | ✓ | ✓ | ✓ | ✓ | ✗ | ◐ | ✓ | ✓ | Solid (board) |
| Quiz Bowl | `bowl` | ✓ | ✓ | ◐ | ✓ | ✗ | ◐ | ✓ | ◐ | Solid: a board-cell award goes to one team; the game-level target is fixed |
| Low-Stakes Quiz | `lowstakes` | ✓ | ✓ | ✓ | ✓ | n/a (paper) | ◐ | ✓ | ✓ | Solid (paper by design) |
| Definition Challenge | `definition` | ✓ | ✓ | ◐ | ✓ | ✓ | ✓ | ✓ | ◐ | Solid: "Ask now" is on the desk too (data-desk) |
| Word Reveal | `wordreveal` | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ✓ | ◐ | Solid: per-answer scoring fixed; reveal polish remains |
| Emoji Guess | `emoji` | ✓ | ✓ | ◐ | ✓ | ✓ | ◐ | ✓ | ◐ | Solid: the heading says "Decode the symbols"; the hint is the last help the teacher releases, after the letter pattern |
| Beat the Clock | `speed` | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | Solid, near premium: *Against the clock* — one round clock on wall and phones; each question reveals as the room answers (or after 15 s) and moves on; right answers score 10 + up to 10 for speed; "Time!" shows the room's right answers and skips the rest |
| True/False Showdown | `truefalse` | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | Solid, near premium: vote → the room's split on wall and phones → one switch each → reveal of before against after and how many switched |
| Predict the Outcome | `choice` | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | Solid, near premium: commit with confidence → lock (the room's split, not the answer) → watch → reveal; a sure, right prediction earns half again. Open: the private written prediction (K8) |
| Fill in the Blanks | `fill` | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ | Solid, near premium: *Fill the gaps* — up to four [gaps], a shuffled word bank with lures tapped into slots, the right word landing in each at the reveal with what the room put there, the hardest gap and its lure named; partial marks; teacher entry by key |
| Time Traveler | `slider` | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | Solid: *Place it in time* — phones drag the event to a year; the reveal shows every pin and the true year; one line for the game, carrying every earlier event, so the timeline grows |
| Odd One Out | `oddone` | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | n/a | ✓ | Solid, near premium: phones vote; the split is held, then drawn as heat across the four tiles, with a line inviting the next most popular pick to defend its rule. Never marked. Open: the written rule as an anonymous idea (K9) |
| Compare & Contrast | `compare` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | n/a | ✓ | Solid, near premium: *Sort it* — tagged statements sorted on phones into A only / Both / B only; the reveal lands each in its column with how the room sorted it and names the one the room misfiled most. Untagged comparisons still play as the discussion |
| Heads Up | `headsup` | ✓ | ✓ | ✓ | ✓ | ✗ | ◐ | ✓ | ◐ | Solid: one round clock, drawn terms, a verdict moves straight on, "Time!" with the guesser's count. Open: clue-givers' phones could show the term |
| Spin & Explain | `spinexplain` | ✓ | ✓ | ◐ | ✓ | ✗ | ◐ | ✓ | ◐ | Solid: the wheel spins and lands (a different sector each draw) before the concept arrives; drawn fresh each run with "N left"; the verdict credits a chosen speaker |
| Connection Maker | `connection` | ◐ | ✓ | ◐ | ✓ | ✓ | ✓ | ✓ | ◐ | Solid: phones propose the bridge, the teacher puts one on the table and credits its author. Open: approved bridges drawn as labelled lines |
| Concept Chain | `conceptchain` | ✓ | ✓ | ◐ | ✓ | ✓ | ✓ | ✓ | ◐ | Solid: phones propose links (anonymous on the wall, named on the desk); Use this puts one on the table and makes its author the speaker; Accept grows the chain and credits them. Open: several links per term, a branching map |
| Random Challenge | `randomchallenge` | ✓ | ✓ | ◐ | ✓ | ✗ | ◐ | ◐ | ◐ | Thin: now a real deck — drawn fresh each run, cards left behind it, a flip per draw. Only the count is revealed |
| Question Cube | `randomchallenge` | ✓ | ✓ | ◐ | ✓ | ◐ | ✓ | ✓ | ◐ | Solid: a real roll — six faces (Define, Compare, Why, Example, What if, Benefits and limits) drawn fresh each run, each with its colour and question, "N faces left"; a chosen speaker answers aloud; counted |
| Memory Maze | — | — | — | — | — | — | — | — | — | Disabled; out of scope |

**Totals:**
- 0 fully premium; 8 near premium (Spot the Error, Ranking, Beat the Clock, T/F Showdown, Predict, Fill the gaps, Odd One Out, Compare & Contrast).
- 24 solid, counting the seven near-premium ones listed as solid in the table.
- 1 thin.
- 0 broken by wrong-result scoring.
- 1 disabled.

The wrong-result scoring cases are fixed. That does not make the spoken games
premium: their missing draws, clocks and proposal mechanics are separate work
in waves 2–4. Bowl's board already awarded each cell to one selected team;
its game-level target was the actual missing setting.

### Verified in code for this audit

- **Spoken verdicts have a recipient.** `js/live.js` sends the selected
  speaker or team with the verdict. The relay credits that team alone;
  individual play counts accepted explanations unless *Score spoken answers*
  is enabled. Heads Up and Random Challenge remain count-only. Spoken phones
  get a listen/watch card rather than verdict pads. Bowl is a board-cell award,
  not part of this spoken verdict path.
- **Word Reveal is now scored at answer time.** The relay's `elapsedMs` for
  each response determines its letter count and points. The host's reveal
  position is only a fallback for entries without a timestamp.

The other defects in the table come from the 23 September inventory and
were not re-checked for this audit:
- Concept Chain allows one link per start term.
- The Emoji hint is on from the start.
- `dripInterval: 4`.
- Boss Hit/Miss, the race lanes, the chain input and Definition's "Ask" are
  all wall-only.

## 3. The shared kit: what exists, and who can use it

Built for the flagships and the room pane. **Reuse before you write.**

| # | Component | Where | What it gives | Games that should use it |
|---|---|---|---|---|
| K1 | **Game style contract** | `src/games/<style>.js`; make · normalize · problems · compile · mark · summary · describe, plus `input` and `showsQuestion` | One file per mechanic, marked on the host, validated by the relay | every rebuild |
| K2 | **Phone inputs** | `INPUTS` in `catalogue.js`: choice · text · number · order · **tap**; relay validation in `server.js` | Any tap-a-part-of-a-passage game rides on `tap`: 2–80 options, counted per option | Fill in the Blanks, Odd One Out vote, Emoji letter tap |
| K3 | **Held results** | `holdResults` on the compiled slide; `Player.releaseTally`; `tallyHeld` | The wall keeps where the room answered hidden until the reveal | every quiz-like game (P3) |
| K4 | **Heat reveal and verdict line** | `.spot-passage` bars with `--share`, empty bars hidden (`game-polish.css`); `spotVerdict` in `player.js` | "19 found it. 7 went for 'mitochondria'": the room's distribution against the answer | Fill in the Blanks, Odd One Out, T/F, Predict |
| K5 | **Reason after verdict** | `whyBox` in `src/render/quiz.js` | One sentence of why, after the verdict | all |
| K6 | **Stages runtime** | `src/activities/stages.js`, `js/stages.js` | Track, clock per stage, +30s on wall and desk, advance on Next; the stage and its job are sent to phones | Definition (Read → Recall), Memory (Study → Hide → Claim), Predict (Commit → Watch → Explain), Heads Up and Beat the Clock round clocks, Question Cube (Roll → Think → Share) |
| K7 | **Phone job cards** | `paintStage` in `join.html`: note · talk · send · down | A phone told what to do in each phase, including "phones down" | every game with a talking phase |
| K8 | **Private phone note** | `slideforge.note.<session>.<slide>` in phone `localStorage` | Thinking that never leaves the phone | Predict (write your prediction), Odd One Out (your rule) |
| K9 | **Anonymous idea box** | `Live.startCustomPrompt({kind:'brainstorm', presentAs:'rail'})`; anonymous cards in the room pane | Collect one line per phone without names | Odd One Out rules, Compare points, Connection proposals, Question Cube |
| K10 | **Room pane** | `src/render/live.js`: top five and the pack, biggest climb, `fitByDropping`, answered meter, `wallName` | Standings that work for 30 and never cut a row | every scored game |
| K11 | **Desk plumbing** | desk state in `src/presenter/window.js`; `Player.control` fallthrough for desk commands; chips (`pv-away`, `pv-needs`) | Any wall control becomes a desk button in three lines | Boss Hit/Miss, race lanes, chain input, Definition Ask (P6) |
| K12 | **Board runtime** | `src/boards/runtime.js`, `SF.Boards.command` | Teacher-operated boards with desk commands and frozen state | Bowl, Bingo, Memory; later Question Cube and Spin |
| K13 | **Overlays** | race track, boss bar, word-reveal wall in `src/render/live.js` | Full-screen game furniture that honours the theme | Race, Boss, Word Reveal |
| K14 | **Style editors** | `STYLE_EDITORS` in `js/games.js`, with an "On the phones" preview | Authoring that shows what the room will get | every rebuild (P8) |
| K15 | **Rehearsal class** | `inventChoice` in `js/demo.js`, with lures and demo kinds | A rehearsal whose wrong answers cluster the way a real room's do | every rebuild (P8) |
| K16 | **Relay harness** | `tests/harness.js` (`freePort`, `start`, `connect`, `until`) | Real server, real sockets, no browser | every rebuild |
| K17 | **Playbook entry** | `js/playbook.js` | Aim, how to play, setup line, in library, inspector and demo | every rebuild |

**Registering a new style touches nine places.** This is what Spot needed:
1. the style file;
2. `registry.js`;
3. `catalogue.js` (`FORMAT_STYLE`, `SPECIAL_STYLES`, `INPUTS` if new);
4. `presets.js`;
5. `types.d.ts`;
6. the `src/model.js` export;
7. the activity catalogue card in `js/studio.js` (the starter bank stays in `presets.js`);
8. `tests/game-style-contract.test.js`;
9. the playbook.

### Build once, before the games that need them

Each of these would otherwise be written three or four times.

| # | Missing component | Why once | Used by | Size |
|---|---|---|---|---|
| **N1 · done** | **Verdict recipient**: the desk marks *who* spoke (a player, a team, or "the room") before Correct/Accept | Prevents one spoken explanation crediting the whole class. Bowl already awards its board cells to a team. | Heads Up, Spin & Explain, Connection, Concept Chain, Random Challenge | M |
| **N2 · done** | **The draw** (`DRAW_STYLES` in `compileGame`; `drawNo`/`drawTotal`): take an unused item from a pool at random, with an animation on the wall, "N left", and no repeats until reshuffle | Four games promise randomness and follow authored order. | Spin & Explain, Random Challenge, Question Cube, Heads Up; later the Bingo caller | M |
| **N3 · done** | **Proposal queue** (`openProposals`, `useProposal`, the desk list; `quiet` prompts draw chain and bridge proposals on the slide): phones send a proposal; the desk approves, dismisses or spotlights; approved items land on the wall | The Q&A moderation queue already does this for questions. Generalise it rather than write another. | Connection Maker, Concept Chain, Odd One Out rules, Compare points | M |
| **N4 · done** | **Round clock** (`js/rounds.js`: Heads Up and Beat the Clock): one clock for a run of items, not per question | Stages (K6) already has a clock with +30s. A one-stage round is the same thing. | Beat the Clock, Heads Up, Low-Stakes | S |
| **N5 · existed** | **Line reveal** (`showPlacedValues`; first reused by Time Traveler): the room's answers placed on a number line or timeline against the true value | The slider's number line and stacked placings exist (`quiz-line`). Lift them into a reveal. | Time Traveler, Predict (numeric), Slider | S |
| **N6 · done** | **Sort input** (`sort`: tap a column per statement, not drag): drag items into two or three bins on the phone, with per-bin heat on the reveal | New input kind, like `tap` was. It also serves card-sort activities later. | Compare & Contrast; activities: concept card sort, alike/different | L |

### Built during the rebuild — reuse these too

The waves added shared pieces the kit above did not list. Each exists once;
a new game should reach for it rather than write its own.

| # | Component | Where | What it gives |
|---|---|---|---|
| K18 | **Passage inputs**: `fill` (a word-bank index per gap) and `sort` (a column per item) | `src/games/fill.js`, `src/games/compare.js`; relay validation; `lockedMessage` | Array answers the relay checks like an order; teacher entry records them by key |
| K19 | **Unmarked votes** (`unmarked`) | relay reveal, `sendReveal` | A pick that is never right or wrong, never counted in accuracy (Odd One Out) |
| K20 | **Mid-question moments**: `showdown` (split plus one switch) and `closeAnswers` (lock before reveal) | relay, `js/live.js` gate | A question with a beat between voting and the answer (T/F Showdown, Predict) |
| K21 | **Round runtime** | `js/rounds.js` | One clock, auto-advance, "Time!", skip the rest; counts, never names but a guesser |
| K22 | **Desk mirror** (`data-desk`) | `Player.gameControls`, `pressGameControl` | Any wall control appears on the desk with one attribute |
| K23 | **Per-phone spoken messages** (`spokenFanout`) | relay | A spoken item told to each phone in its own terms (Heads Up's term, hidden from the guesser) |
| K24 | **Shaped proposal boxes** (`shape: 'link' | 'bridge'`, `quiet`) | relay prompt, `join.html`, `paintProposalGhosts` | A proposal box framed like what it proposes, its replies drawn on the slide; honours the desk's hide |

## 4. Redesigns, game by game

Grouped by what they share. Each entry gives the gap, the redesign, the
kit it reuses and the size (S < a day, M a few days, L a week or more).

### Scoring fairness: fix before anything else

**Heads Up · Spin & Explain · Connection Maker · Concept Chain · Random
Challenge.** **N1 is done:** teacher entry selects a recipient; the relay
credits one team or counts the explanation; spoken phones get a listen/watch
job card. Draws, clocks and maps remain below.

**Quiz Bowl** already awarded board cells to one team, at each cell's own
value. Its separate game-level finish target is now stored and migrated.

**Word Reveal** records `dripShown` per answer as it arrives (the relay
already timestamps answers). Each phone gets 100, 75 or 50 for how early *it*
answered. Show the letters dripping on the phone too (P5), and make
`dripInterval` a setting, not 4. S.

### Thin formats that become games: transformational

- **Fill in the Blanks → "Fill the gaps".**
  - **Wall:** the passage with 1–4 gaps, drawn as slots.
  - **Phone:** tap a word from a shuffled word bank into each gap. The bank
    carries the right words plus two lures.
  - **Reveal:** gap by gap, the heat of what the room put in each slot (K4),
    then the correct word slides in.
  - **Reuses:** K2 `tap` (one tap question per gap, or a multi-gap payload),
    K3, K4, K5, K14, K15. M.
- **Predict the Outcome → "Commit, then watch".**
  - **Stages (K6):** Predict · 0:45 (a private written prediction, K8, plus a
    choice) → Reveal (the teacher plays the demo or video) → Explain
    (anonymous "why did it happen?", K9).
  - **Scoring:** a confidence slider on the choice. A confident right answer
    scores more, and a confident wrong one costs a little.
  - **Reveal:** the room's predictions against the outcome (K4).
  - M, almost entirely kit.
- **Time Traveler → "Place it in time".**
  - **Phone:** drag the event onto a timeline (the `number` input on a year
    scale).
  - **Reveal:** every phone's pin on the wall's timeline, with the true date
    struck in (N5). Each round adds the event to a growing timeline across
    the game. That is the travel.
  - **Scoring:** closer is better (slider marking).
  - M after N5.
- **True/False Showdown → "Hold or fold".**
  - **Showdown:** the statement is up; phones vote; at the half-way mark the
    wall shows the room's split (anonymous), and everyone may switch once.
  - **Reveal:** the split before and after, and who held their nerve (a count
    only).
  - **Reuses:** K3, K4, and a mid-question tally release. S–M.
- **Beat the Clock → "Against the clock".**
  - One round clock (N4) for the whole run; each phone moves through the
    questions at its own pace.
  - **Wall:** the clock and a room progress bar ("312 answers in"), not the
    questions.
  - **Reveal:** the room's hardest question, by wrong-answer heat.
  - **Relay:** needs a self-paced mode, since today the host pushes one
    question at a time. L. Worth it: it is the only game where the phone,
    not the wall, is the stage.
- **Question Cube → a cube.**
  - The draw (N2), shown as a cube roll, picks one of six question types from
    an unused pool.
  - Then a stages run (K6): Think (private note) → Share (anonymous idea box,
    K9) → Discuss.
  - It is Think-Pair-Share with a roll in front: S–M after N2.
- **Spin & Explain → a spinner.** N2 as a wheel, then N1 to mark the person
  who explained. Phones: "Listen: could you explain it better?", with a
  one-tap "I'd add something" signal counted on the desk. S after N1 and N2.
- **Random Challenge → a deck.** N2 as a card deck with "N left". The count
  stays (no competitive score), and N1 records who completed it. S after N1
  and N2.

### Discussion formats: give the phones a job

- **Odd One Out → "Vote, then defend".**
  - **Phones:** tap the odd one (K2 `tap` over the four tiles), then write the
    rule (K9).
  - **Reveal:** the vote heat across the four tiles (K4), then the prepared
    rule. Also the rules the room wrote, *including defensible ones for the
    other tiles*.
  - The discussion starts from data, not from whoever speaks first. M,
    mostly kit.
- **Compare & Contrast → "Sort it".** Phones sort statements into Alike /
  Different / Only A / Only B (N6). The reveal shows per-bin heat against the
  prepared answer. L, because N6 is new. Until then, an interim S: two
  anonymous idea boxes (Alike, Different) as stages.

### Solid games: bring to premium

- **Concept Chain.** Proposals come from phones (N3), not typed on the wall.
  More than one link per start term; the chain branches into a map. N1 marks
  who proposed. M after N1 and N3.
- **Connection Maker.** It shares Chain's map. The two ideas are on the wall;
  proposals arrive anonymously (N3); approved bridges are drawn as labelled
  lines. It is Concept Chain with two fixed ends: one engine, two presets.
  S after Chain.
- **Heads Up.**
  - **Round clock (N4):** 60 seconds, as many terms as the guesser can get.
  - **Desk:** Correct and Pass buttons; the next term comes from the draw
    (N2).
  - **Phones:** the class's phones show the term too, so the clue-givers can
    see it without turning to the wall.
  - **Result:** "Ana's round: 7" (named, because it is praise, and the
    teacher chooses who goes up).
  - M after N1, N2 and N4.
- **Emoji Guess.** Release the hint as a step (the emoji stepper pattern
  exists) rather than as the heading. A phone that asks for the hint scores
  less. S.
- **Definition Challenge.** Rebuild its read-then-recall on stages (K6):
  Read · 0:30 → Recall. That puts the clock and advance on the desk (P6),
  and "Ask" becomes Next. S.
- **Horse Race · Boss Battle.** Lanes and Hit/Miss go to the desk (K11). The
  room pane's crowd layout (K10) serves big races: top five lanes plus "your
  lane is on your phone". Boss gets a reveal moment per hit: damage number,
  boss reaction, and the room's accuracy as the attack. S each.
- **Ranking.** Reveal as a heat per slot: for each position, how many put
  the right item there (K4). "Most of you swapped 3 and 4" is the lesson. S.
- **Memory ×3 · Bingo · Low-Stakes.** Already boards. Missing:
  - desk controls for every wall control (K11);
  - a phone job card (K7) so phones aren't blank ("Study the board. Phones
    down");
  - a rehearsal with a class of 30.
  S each.

## 5. The order to build in

| Wave | What | Why first | Size |
|---|---|---|---|
| **0** | **Done 23 Sep.** Word Reveal per-answer scoring; Bowl game-level target; delete the `js/studio.js` preset copy. Teacher entry records `order` and `tap`, and shows the relay's refusal (E1, E2). | Wrong or lost results today; small fixes | S |
| **1** | **Done 23 Sep.** N1 verdict recipient in teacher entry, spoken phone job cards, and `plays` declarations with a contract test and library badges. | Fixed unfair spoken scoring and made P9 checkable | M |
| **2** | **Done 23 Sep.** N2 draw and N4 round clock | Unblock Spin, Random, Question Cube and Heads Up | M |
| **3** | **Done 23 Sep.** Fill the gaps; Odd One Out vote-then-defend; Predict commit-then-watch; T/F hold-or-fold | The thin-to-premium conversions that are mostly kit | M each |
| **4** | **Mostly done.** N3 proposal queue; Concept Chain and Connection proposals shaped and drawn on the slide. *Open: several links per term, a branching map (GA-19)* | The discussion games' phone jobs | M |
| **5** | **Done 23 Sep.** N5 line reveal; Time Traveler on one growing timeline, wall and phone | | M |
| **6** | **Mostly done.** Desk parity (`data-desk`), Emoji hint as a step, Ranking heat. *Open: the hint's point cost, Definition on stages (GA-22)* | P6 across the catalogue | S each |
| **7** | **Mostly done.** N6 sort input; Compare & Contrast sort; Beat the Clock as one round. *Open: per-phone self-pacing (GA-27)* | The two large new mechanics | L |
| **with 3** | **Not done — skipped.** Tally entry (E3), team rows (E5), saved class lists (E6): planned alongside wave 3 and passed over. Next. | Rooms with no devices, done at the speed of a show of hands | M |
| **after 7** | **Not done.** Solo practice (E8) | One learner, alone, at their own pace | M |

At the end of wave 3, the count would be roughly six premium and none
broken. At the end of wave 7, all 26 enabled formats would pass the bar.

## 6. Decided

Decided on 23 September from user experience and logic, at the user's
request. These are now part of the bar.

### Spoken formats score by team, and count in individual play

**The rule:**
- **Teams on:** an accepted explanation scores for the speaker's **team**.
  Before Correct or Accept, the desk's recipient control (N1) defaults to the
  team of the student last picked.
- **Individual play:** a spoken format **counts**; it does not score. The
  wall shows the room's total ("7 explanations accepted"), and nobody's
  points move.
- **An override** in Game settings, "Score spoken answers", turns individual
  points on for a teacher who wants them. It is off by default.
- **Heads Up** is a round, not a ledger. Its result is the round's count
  ("7 in 60 seconds"), whatever the mode. **Quiz Bowl** is a points game by
  name and always scores, to the recipient.

**Why:**
- **Fairness is solved by N1; motivation is not.** Speaking is the part of
  a lesson where confidence varies most. An individual leaderboard for it
  rewards the students who already talk and ranks the ones who don't.
- **A team score keeps the stakes and spreads the risk.** Your explanation
  helps your side, and a weak one costs nobody a place.
- **Counting in individual play keeps the one thing worth celebrating:**
  how much explaining the room did.
- **It matches what exists.** Random Challenge already counts, and Bowl
  already scores cell values.

### The wall may name someone only for something they chose to do and did well

**The rule:**
- **A name may appear on the wall with a positive outcome of a public act
  the student took on:** the Heads Up guesser's round ("Ana's round: 7"),
  an accepted explanation credited to them, the room pane's biggest climb.
- **A name never appears with:** a wrong answer, a Pass, a rejected
  explanation, accuracy, or a place below the top five.
- **When the outcome is not a success, the wall states it without the
  name:** "Round over: 2", "Not quite, anyone else?".

**Why:**
- **Recognition motivates when it is earned and chosen.** The guesser stood
  up; naming their seven is applause.
- **Naming a failure has the opposite effect**, and falls on the students a
  teacher is trying hardest to bring in.
- **It keeps P4 intact:** the room sees itself, and a person is seen only
  when they stepped forward and it went well.
- **One rule covers the cases that exist:** Heads Up, spoken credits, the
  climb.

### Memory Maze

It stays disabled. No spatial board engine is planned.

## 7. Who is playing: one learner, teams, and learners with no device

A game has to work in the room it lands in. That might be thirty phones,
four teams sharing four phones, a class where half the phones are flat, or
one learner revising at home. The part that makes most of this work is
**teacher entry**: `manual.html` and `js/manual.js`, opened as *Live
answers* on the desk or in its own window. This section says what it does
today, where it stops, and how each game should declare the rooms it
supports.

### What exists (read in code)

| Room | How it works now | Where |
|---|---|---|
| **Individual, on phones** | The default. Each phone answers; the relay marks, scores and ranks, and each phone is told its own place. | `server.js`, `join.html` |
| **Teams** | The host chooses teams in the lobby (two or more); each phone picks its team on joining. **A team's score is the sum of its per-question averages**, so team size doesn't matter and one phone per team is as fair as six. The race moves a lane on its members' majority (`teamAnswers`). | `server.js` reveal (averages), `live.js` race |
| **No device** | Teacher entry adds names (one per line, optionally on a team) as rows the relay marks like phones (`manualAdd`, `manual: true`). A question's roll call goes down the register by keyboard: **A–F or 1–6 records and moves on, Space skips, Backspace clears**. Text and number answers are typed per row. Rows can be renamed, moved between teams or removed. A timed question stops counting down while entered rows are in the room, so a teacher is never racing the clock. | `manual.js`, `server.js` `manualAdd` / `manualAnswer`, `questionTimeLimit` |
| **Mixed** | Phone rows and entered rows sit in one list. Phone rows are tagged "on a phone" and skipped by the roll call. | `manual.js` |
| **Desk tools** | A name picker that doesn't repeat until reset and leaves out disconnected devices; a private timer; lesson notes. | `manual.html` toolkit |
| **One learner, alone** | Present without a room: a quiz slide is answered by clicking on the wall, and a small "3 / 5" score keeps count. A share link's browse view renders the same slides. *Not checked here: whether every input kind (order, typed, tap) is answerable solo.* | `player.js` `wireQuiz`, `updateSolo` |

### Gaps found, and what remains

| # | Gap | Evidence | Effect |
|---|---|---|---|
| **G1 · fixed** | Teacher entry used to drop Ranking orders and Spot taps. It now records order key sequences and clickable passage words through the relay. | `manual.js`, `server.js`, `tests/manual.test.js` | No-device learners can play both formats |
| **G2 · fixed** | Invalid `manualAnswer` requests now return `manualError` with the row and question IDs. | `server.js`, `live.js`, `manual.js` | The affected row explains what was refused |
| **G3** | **Thirty paper answers means thirty rows per question.** The roll call is fast per row, but there is no way to record a show of hands or mini-whiteboards as a count. | `manual.js` roll call | No-device rooms are slow, so teachers skip the check |
| **G4 · fixed** | Spoken verdicts now credit a selected team, or count in individual play. An individual scoring override is off by default. | `live.js`, `server.js`, `tests/oral.test.js` | A whole room no longer scores for one speaker |
| **G5** | **A team sharing one answer** needs the teacher to add "one representative" by hand; nothing makes that a team row. | `manual.html` team note | Team games without phones are fiddly to set up |
| **G6** | **Entered names are retyped every lesson.** The names draft is kept for the tab session only. | `manual.js` `saveDraft` (sessionStorage) | Friction on the most common no-device setup |
| **G7 · fixed** | Every style declares phone, team, teacher-entry and solo support with a reason; the format library shows badges. | `src/games/rooms.js`, style contract test | A teacher can see room fit before inserting |

### What each game supports today

Derived from each engine's input and mechanic. ✓ works · ◐ works with
friction · ✗ does not · — not meaningful.

| Engines | Phones | Teams | No device (teacher entry) | One learner alone |
|---|---|---|---|---|
| Choice quizzes: `choice` (Predict, Question Cube), `truefalse` (T/F Showdown), `speed`, `boss`, `race` | ✓ | ✓ | ✓ roll call by key | ✓ |
| Typed or number: `type` (Fill in the Blanks, Time Traveler), `definition`, `emoji`, `wordreveal`, `slider` | ✓ | ✓ | ◐ one typed answer per row | ◐ not checked |
| `order` (Ranking) | ✓ | ✓ | ✓ key sequence | ◐ not checked |
| `spot` (Spot the Error) | ✓ | ✓ | ✓ tap the word | ✓ tap the wall |
| Boards: `memoryflip`, `memorymatch`, `knowledgeflip`, `bingo`, `bowl`, `lowstakes` | phones idle by design | ✓ (Match rotates teams; Bingo cards per team) | ✓ the teacher runs the board | — (Low-Stakes on paper: ✓) |
| Spoken: `headsup`, `spinexplain`, `connection`, `conceptchain`, `randomchallenge` | ◐ listen/watch card | ✓ selected speaker's team | ✓ select recipient and verdict | — |
| Discussion: `oddone`, `compare` | phones idle | ✓ | ✓ | — |

### The redesign: teacher entry as the engine for every room

| # | Change | Reuses | Size |
|---|---|---|---|
| **E1** | **Record every input kind.** For `order`, the row takes the order as keys (B D A C, shown as the items as they're pressed), with Backspace to undo one. For `tap`, the row shows the passage's words as small buttons: click the word the learner points at. The same keyboard roll call carries on to the next row after each. | the choice roll call; Spot's word list (`s.options`) | S |
| **E2** | **Say when an entry is refused.** Every `manualAnswer` refusal sends `manualError`, and the row shows it. | the existing `manualError` message | S |
| **E3** | **Tally entry.** For a room answering on paper or a show of hands: the teacher records counts per option ("A 12 · B 7 · C 3") instead of names. The counts feed the wall's tally, heat map and verdict line exactly as phone answers do, and nobody is scored. Offered automatically when there are more than about eight entered rows. | K3 held results, K4 heat reveal, the relay's `tally` | M |
| **E4** | **The verdict recipient lives here** (N1). In a spoken format the desk shows the roster and the name picker. *Pick* makes the picked name the recipient; Correct or Accept then credits them, or their team (section 6). | the name picker; the roster rows | part of N1 |
| **E5** | **Team rows.** In a teams room, one click adds "Team Red · shared answer" rows for every team without devices. They are marked on the roll call like any row, and averaged like any member. | `manualAdd` with `team` | S |
| **E6** | **Saved class lists.** Entered names are kept per class on this computer (localStorage, never sent anywhere), offered at the next lesson, and pasted in from a register in one go. | `saveDraft` → localStorage | S |
| **E7** | **Each style declares its rooms.** A `plays` field on the style contract, `{ phones, teams, entry, solo }`, each `'yes'`, `'partial'` or `'no'` with a one-line reason. The library shows it as badges ("Works without phones"). The style-contract test fails when a style that takes an input has no entry path. | K1 style contract, `tests/game-style-contract.test.js` | S |
| **E8** | **Solo practice.** A share link in *Practice* mode runs a game for one learner at their own pace: answer, see the reveal and the reason, move on, with the score at the end. It is offered for styles that declare `solo: 'yes'`; spoken and board formats say plainly that they need a room. | share link browse mode, `wireQuiz`, `updateSolo`, K5 | M |

**The rule this adds to the bar (P9):** a game is not premium until it
declares its rooms (E7) and teacher entry can record every answer it asks
for (E1). Both are implemented for Spot the Error; its desk heat-map preview
still leaves P6 partial.

## Change log

- **23 September 2026 — The doc checked against the work.**
  - **Section 5 was stale:** waves 2–7 were done, or mostly done, and
    unmarked. Each wave now says what is done and what is open.
  - **One row was skipped outright:** tally entry, team rows and saved class
    lists ("with 3"). It is marked so and comes next.
  - **The "build once" components** now say where they live.
  - **Seven more shared pieces built along the way** are listed (K18–K24),
    so the next game reuses them.
  - **Conflict with the activities work, fixed:** the chain and bridge
    branches drawn on the slide ignored the desk's hide (activities N12). A
    hidden proposal now leaves the wall there too.
- **23 September 2026 — Six square pegs, rounded.** Places where a game
  had been fitted into generic pieces, and what each one does now:
  1. **Question Cube** said "Complete / Skip" (Random Challenge's words). It
     now says **Answered / Pass**.
  2. **Heads Up** phones all said "listen and watch". Now, once a guesser is
     chosen, every clue-giver's phone **shows the term** and the guesser's
     says "face away". Nobody gets the term before a guesser is chosen. The
     relay tells each phone its own version (`spokenFanout`, the `guesser`
     message).
  3. **Predict** asked "how sure?" on a generic sheet after locking. The
     **bet is now placed with the pick** (I'm sure ×1.5/−½, Just a hunch
     ×1/0). A private "why" is kept on the phone and shown back with the
     result.
  4. **Odd One Out's defence** was only a line on the wall. After the reveal
     **every phone can defend a pick** with its rule; the rules arrive
     unnamed and the desk can put one on the table.
  5. **Concept Chain and Connection Maker** used the generic idea box, shown
     in the side pane. The phone now proposes **"energy → [next idea]
     because …"** or "A and B are connected because …". Proposals **grow on
     the chain or under the pair** as faint unnamed branches (the one on
     the table drawn solid), and the pane keeps the standings (a `quiet`
     prompt).
  6. **Time Traveler's phone** was a bare slider. It now **draws the game's
     timeline** with every earlier event pinned, the same line as the wall.

  Relay tests for each. `node --test` 518/518; the full `npm test` build
  check was blocked by another agent's uncommitted `src/activities` work.
  None of these were viewed on screen.
- **23 September 2026 — Compare & Contrast: sort it (GA-26, N6).**
  - **A new phone input, `sort`:** one column (A only, Both, B only) per
    statement. The relay validates it; teacher entry records it by key; the
    rehearsal class files one item's trait under Both, as a real room does.
  - **Authoring:** statements tagged Both:, A: or B:, one per line. The
    editor counts them per column as they are written.
  - **The wall** shows three columns named for the two items, with the
    statements in a pile. At the reveal each lands in its column with "4 ✓ ·
    2 Both" and one line: "The one to talk about: 'stores energy in
    glucose'. 3 put it under Both."
  - **Old comparisons** without statements still play as the discussion
    with the idea box.
  - **Screen check found a bug:** an early "discussion" return drew nothing
    but the heading. Fixed.
  - **Tests:** `npm test` 513/513.
- **23 September 2026 — Beat the Clock: against the clock (GA-27, without
  self-pacing).**
  - **One clock for the whole run:** the game's time, 1–3 minutes, 90 s if
    unset. No question has a countdown of its own. The clock shows on the
    wall, clear of the room pane and the question, and each phone's question
    label counts it down.
  - **Questions keep moving.** Each reveals as soon as the room has
    answered, or closes itself after 15 seconds, shows the answer for a
    beat, and the next arrives.
  - **At time,** "Time!" shows the room's right answers, and Next skips the
    questions nobody reached. This is Heads Up's round runtime
    (`js/rounds.js`), generalised.
  - **Scoring:** a right answer earns 10, plus up to 10 for speed timed from
    the question's own appearance; a wrong one costs 5.
  - **Playbook:** the overrides that described the old games (Beat the
    Clock, Heads Up, Fill, Time Traveler, Random Challenge) were hiding the
    new descriptions and are rewritten or removed.
  - **Tests:** round and relay tests. `npm test` 503/503. Viewed on screen,
    which found the clock under the pane and over the question; both fixed.
  - **Still open:** truly self-paced play, where each phone runs its own
    stream.
- **23 September 2026 — Spin lands; Compare's phones have a job.**
  - **Spin & Explain:** the wheel spins for two seconds and comes to rest on
    a sector of its own, different each draw. Then the concept slides in.
    It runs in the show only, so the editor, thumbnails and baselines see it
    at rest. The deck, Heads Up and cube entrances are scoped the same way.
  - **Compare & Contrast:** phones send "one way they are alike or differ",
    through the same idea box as the proposal queue: anonymous beside the
    slide, named on the desk, and "Use this" puts a point on the table. The
    proposal list is now its own block on the desk, not part of the spoken
    controls.
  - **Tests:** `npm test` 501/501. The sort-into-bins input (GA-26) is still
    the premium version of Compare.
- **23 September 2026 — Question Cube rolls (GA-25, in part).**
  - **It was a discussion prompt beside a slide.** It is now a game on the
    Random Challenge engine: drawn fresh each run with no repeats, spoken,
    with a chosen speaker, and counted.
  - **The wall** shows the face that came up, landing with a tumble, in its
    own colour so the room learns the six types by sight. Its question sits
    beneath, then "N faces left". The preset is six faces on one topic.
  - **Also refreshed:** the setup lines for nine formats that still
    described the old games (Fill in the Blanks, Time Traveler, Odd One
    Out, True/False, Predict, Heads Up, Connection, Concept Chain, Question
    Cube).
  - **Tests:** `npm test` 501/501.
- **23 September 2026 — Desk parity (GA-21) and Emoji's hint (GA-22, in part).**
  - **One mechanism, not three special cases.** A control a game draws on
    the projected wall carries `data-desk`: Boss's Reveal, Hit and Miss, a
    teacher-run race's lanes, Definition's Ask.
  - **The presenter view lists** whatever the current slide has as buttons
    beside Next, and pressing one presses the wall's own control
    (`Player.gameControls` and `pressGameControl`). A new wall control
    reaches the desk with nothing but the attribute.
  - **Emoji Guess:** the heading is now "Decode the symbols. What is it?" and
    the hint is the last step the teacher releases, after the letter
    pattern. As the heading from the start, a good hint all but named the
    answer.
  - **Tests:** `npm test` 500/500.
  - **Still open:** a hint that costs points, and Definition on the stages
    runtime.
- **23 September 2026 — Ranking's reveal (GA-23), and a live bug.**
  - **The bug:** the live reveal never showed the right order. The rows were
    drawn shuffled, and because a ranking has no single right option, the
    reveal pass muted every row and left them where they were.
  - **The fix:** the reveal now moves the rows into order and numbers them,
    fills each with its share of the room ("18 of 26 here"), and names the
    pair most often swapped ("7 swapped 3 and 4 (Norman conquest and English
    Civil War)"). The rehearsal does the same.
  - **Also:** Spin & Explain's verdict strip still said "Clear · 2 points";
    it now says what the points are.
  - **Tests:** `npm test` 500/500.
- **23 September 2026 — Time Traveler: place it in time (GA-20).**
  - **It now runs on the slider engine** on a year scale. Phones drag the
    named event to a year, and the reveal is the slider's own: every pin
    against the true year.
  - **One line for the whole game.** It spans every event, and each round's
    line carries the events already placed (above and below the line, year
    and label), so the timeline grows across the game.
  - **Old typed games heal:** the year comes out of the clue (it would give
    the answer away) into the target, and the clue moves to the reveal. The
    format remap now keeps a slider's line and a fill's lures.
  - **N5, the line reveal**, turned out to exist already
    (`showPlacedValues`); this is its first reuse.
  - **Tests:** `npm test` 500/500.
- **23 September 2026 — The proposal queue (N3, GA-18, part of GA-19).**
  - **Proposals from the phones.** While a Concept Chain or Connection Maker
    item is up, the phones get an idea box ("Propose a link from 'energy'
    ..."). Proposals arrive beside the slide without names, and on the desk
    with them.
  - **Use this** puts one "on the table" on the wall (still unnamed), makes
    its author the speaker, and in a chain makes its words the link.
  - **Accept** then grows the chain and credits the speaker's team, through
    the same held-verdict path as every spoken verdict.
  - **Reused, not rebuilt:** the brainstorm prompt, the anonymous room-pane
    cards, and the verdict recipient. The relay's host-only digest now
    carries each author's id.
  - **Tests:** relay test for attribution. `npm test` 499/499.
  - **Still open:** several links per start term and a branching map
    (GA-19), and Connection Maker's bridges drawn as lines.
- **23 September 2026 — Fill the gaps (GA-11).**
  - **A new style, `fill`**, with its own phone input. The answer is one
    word-bank index per gap, repeats allowed; the relay checks it like an
    order.
  - **Authoring:** one passage with the missing words in [brackets] (up to
    four), plus lures. The editor previews the phone. Old ______ games
    heal, and start with no borrowed lures.
  - **Phones** tap words into numbered slots.
  - **The wall** shows the passage large, with the bank quietly under it. At
    the reveal the right word lands in each slot, with "12 ✓ · 6 diffusion"
    beneath it and "Gap 2 was the hardest. 6 put 'diffusion' there."
  - **Scoring:** each right gap earns its share of the points.
  - **Rooms:** teacher entry picks a word per gap by key. The rehearsal class
    is drawn to a shared lure.
  - **Fixed on the way:** a phone rejoining with a Ranking answer was told it
    was a single choice. Every input now echoes through one
    `lockedMessage`.
  - **Tests:** `tests/fill.test.js`. `npm test` 498/498. Not viewed in a
    browser.
- **23 September 2026 — Predict the Outcome: commit, then watch (GA-13).**
  - **Phones commit** a prediction and how sure they are.
  - **The first Next locks** the predictions (the relay's new
    `closeAnswers`) and shows the room its split, never the answer. The wall
    says "Predictions are locked. Watch what happens", and the phones go quiet
    with "Look up".
  - **The teacher shows the outcome**, then Next reveals it.
  - **Scoring:** "sure" is a bet. Right and sure ×1.5, right and unsure ×1,
    wrong and unsure 0, wrong and sure −½ (never below zero). The first
    version had no cost to being sure and wrong, so every phone would have
    tapped "sure". That is the reason the relay never scores confidence
    anywhere else.
  - **Never auto-reveals.**
  - **Tests:** relay test for the lock and the refused late answer. `npm test`
    493/493.
- **23 September 2026 — True/False Showdown: hold or fold (GA-14).**
  - **The Showdown format** (not plain True or False) votes, then shows the
    room its own split on the wall and on every phone. It shows on the
    teacher's Next, or half-way through a timed clock.
  - **Each phone may switch once.** The relay's `showdown` message fixes the
    split, and the one switch is the only exception to one answer per
    question. The wall's bar follows the room as it moves, with a marker
    where it stood.
  - **The reveal** lights the right side and says "False: 38% at the split,
    62% at the end. 5 changed their minds." The final answer is what's
    marked. It never auto-reveals, and phones never learn who switched.
  - **Tests:** relay test in `tests/showdown.test.js`. `npm test` 492/492.
- **23 September 2026 — Odd One Out: vote, then defend (GA-12).**
  - **The phones vote.** It used to send phones an idle card. The vote is
    held on the wall until the teacher reveals, and never auto-reveals, so
    the talk comes first.
  - **The reveal** draws each tile's share of the vote as heat along its
    foot, marks the prepared odd one without muting the others, and adds one
    line: "14 of 26 picked Oxygen. 7 picked Zinc: what rule makes it the odd
    one out?"
  - **A pick is `unmarked`.** The host sends no marks, the relay reveals
    without waiting for any, and the vote never counts as a question asked,
    so a defensible other pick cannot pull a learner towards "needs a hand".
    Phones hear what they picked and are invited to defend it.
  - **Room support** is a new `vote` profile, and the rehearsal class votes.
  - **Tests:** `npm test` 490/490, with a relay test for the unmarked vote.
    The written rule as an anonymous idea is still to do.
- **23 September 2026 — Wave 2 (GA-09, GA-10, part of GA-25).**
  - **The draw is one mechanism** (`DRAW_STYLES` in `compileGame`). Spin &
    Explain, Random Challenge and Heads Up play in a fresh order every run,
    with no repeats, and every item carries `drawNo` / `drawTotal`. Spin had
    always shuffled (the audit said authored order, wrongly).
  - **Random Challenge is a deck:** "Card 3", the cards still to come behind
    it, "9 cards left in the deck", and a flip on each draw.
  - **Heads Up is a round** (`js/rounds.js`):
    - one clock for the whole pile (the game's time, 60 s if unset);
    - a verdict from the wall or the desk moves straight to the next term;
    - at time, "Time!" with the count and the guesser's name;
    - Next then skips the terms nobody reached.

    It counts and does not score. The term that was up closes through the
    existing `timeup` path, now allowed through when teacher-entered rows
    are in the room.
  - **Tests:** a compile test covers draw order, pile numbering and the
    round. `npm test` 489/489. Not viewed in a browser.
- **23 September 2026 — UX pass on wave 1 (GA-29).** The fair scoring was
  right, but the flow around it had five problems, now fixed:
  1. **One verdict path.** The wall's verdict pads used to skip the speaker
     check; in a teams game they credited nobody, silently.
  2. **Judge first, say who second.** A scoring verdict given with nobody
     chosen is *held* ("Correct is waiting"). Choosing the speaker completes
     it, and "Count it for the room" is the way out.
  3. **The speaker lasts one item.** They used to stay selected until the
     game changed, so the next student's answer could be credited to the last
     one. The exception is Heads Up, whose guesser owns the round.
  4. **A speaker picker, not a 30-name dropdown.** Teams as big buttons, the
     last five speakers as chips, type-ahead with Enter, and *Pick for me*,
     which prefers someone who has not spoken recently.
  5. **The credit is seen.**
     - The wall shows it large ("✓ Red +1", "✓ Ana +2" when individual
       scoring is on, "Ana's round: 7" in Heads Up) above the room's count.
     - Phones hear "Yours was accepted", "A point for your team" or "Accepted
       for Red", and never another student's name.

  Spot the Error entry is now one shared passage above the register, not a
  copy in every row (about 1,500 buttons for 30 learners). The A–H keys no
  longer record words 1–8. Relay test added: `npm test` 488/488. Not viewed
  in a browser. Still open: spoken team points (1–2) share a scale with quiz
  team averages (up to 1,000), so in a mixed lesson the credit barely
  registers (GA-30).
- **23 September 2026 — GA-30.** Spoken credit is on the quiz scale: an
  accepted explanation is worth one question (1,000) to the speaker's team,
  or half with a hint. §6's rule is unchanged; only the unit is.
- **23 September 2026 — Wave 1 implemented (GA-06–08).** Selected-recipient
  spoken verdicts now credit one team, or count without points in individual
  play unless the teacher opts in. Spoken phones receive job cards. All 25
  game styles declare room support, shown as badges in the format library and
  enforced by the style-contract test. The audit corrects its earlier Bowl
  claim: the board already awarded each cell to one team. `npm test` passed
  487/487. Draw, round clock and game-specific rebuilds remain open.
- **23 September 2026 — Wave 0 implemented (GA-01–05).** Word Reveal uses
  per-answer relay timing; Bowl's target moved to game settings with old-save
  migration, leaving cell point values independent. Studio now reads the
  model's single starter bank. Teacher entry records Ranking permutations and
  Spot word taps; the relay explains invalid entries on the affected row.
  `npm test` passed 484/484. The live server was restarted after the relay
  change. Verdict recipients, room declarations and the remaining premium
  work are still open in [BACKLOG.md](BACKLOG.md).
