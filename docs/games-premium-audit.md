# Games to a premium standard: audit, redesigns and the shared kit — 23 September 2026

Two things now meet a high standard: one game (**Spot the Error**) and one
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

From the two flagships. A game is premium when it passes all eight.

| # | Test | What it means | Where it was proven |
|---|---|---|---|
| **P1** | **The name is the mechanic** | The only way to answer is to do what the title says. | Spot: you can only answer by finding the word. |
| **P2** | **The wall is a stage** | One big thing at a time. Options and small print go on the phone. | Spot's passage; the TPS stage prompt at 54px. |
| **P3** | **Tension → reveal → reason** | Results are held until the reveal. The reveal shows where the room was against the answer, then the reason in one sentence. | Spot's heat map, strike-through and verdict line. |
| **P4** | **The room sees itself, never one person** | Distributions and counts are anonymous. Judgements about a person go to the desk. | Room pane: needs-a-hand moved to the desk; anonymous ideas. |
| **P5** | **The phone does the verb** | Tap, drag, place or type: the same shape as the wall. | Spot's tap-the-word; TPS stage jobs. |
| **P6** | **The teacher drives from the desk** | Every control the game needs exists in the presenter view, not only on the projected wall. | TPS +30s on the desk; stage moves on Next. |
| **P7** | **Fair, legible scoring** | Points reach the person who earned them, for the thing they did. Counts and accuracy are never confused with points. | Spot: points on a find, no speed bonus; the pane labels its column. |
| **P8** | **Authored and rehearsed safely** | The editor shows what the phones will get and `problems()` catches mistakes. The rehearsal class behaves like a real one, lures included. It is tested through the relay harness. | Spot's editor preview, lure-seeking demo class and relay test. |

## 2. The scorecard

✓ passes · ◐ partly · ✗ fails. The tier follows from the row.
- **Premium:** all eight.
- **Solid:** P1–P3 pass.
- **Thin:** P1 fails.
- **Broken:** P7 fails in a way that gives wrong results.

| Format | Engine | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| **Spot the Error** | `spot` | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ | **Premium** (desk has no heat-map preview) |
| Ranking Challenge | `order` | ✓ | ◐ | ◐ | ✓ | ✓ | ◐ | ✓ | ◐ | Solid |
| Horse Race | `race` | ✓ | ✓ | ◐ | ◐ | ◐ | ✗ | ✓ | ◐ | Solid, but lanes are wall-only |
| Boss Battle | `boss` | ✓ | ✓ | ◐ | ✓ | ◐ | ✗ | ✓ | ◐ | Solid, but Hit/Miss is wall-only |
| Memory Flip | `memoryflip` | ✓ | ✓ | ✓ | ✓ | ✗ | ◐ | ◐ | ✓ | Solid (board) |
| Memory Match | `memorymatch` | ✓ | ✓ | ✓ | ✓ | ✗ | ◐ | ◐ | ✓ | Solid (board) |
| Knowledge Flip | `knowledgeflip` | ✓ | ✓ | ✓ | ✓ | ✗ | ◐ | ◐ | ✓ | Solid (board) |
| Bingo | `bingo` | ✓ | ✓ | ✓ | ✓ | ✗ | ◐ | ✓ | ✓ | Solid (board) |
| Quiz Bowl | `bowl` | ✓ | ✓ | ◐ | ✓ | ✗ | ◐ | ✗ | ◐ | **Broken**: target from Q1 only; a verdict pays everyone |
| Low-Stakes Quiz | `lowstakes` | ✓ | ✓ | ✓ | ✓ | n/a (paper) | ◐ | ✓ | ✓ | Solid (paper by design) |
| Definition Challenge | `definition` | ✓ | ✓ | ◐ | ✓ | ✓ | ✗ | ✓ | ◐ | Solid, but "Ask" is wall-only |
| Word Reveal | `wordreveal` | ✓ | ✓ | ◐ | ✓ | ◐ | ◐ | ✗ | ◐ | **Broken**: everyone scores by the letters showing at the reveal |
| Emoji Guess | `emoji` | ◐ | ✓ | ◐ | ✓ | ✓ | ◐ | ✓ | ◐ | Solid, but the hint is shown from the start, which the blurb contradicts |
| Beat the Clock | `speed` | ◐ | ◐ | ◐ | ✓ | ✓ | ◐ | ✓ | ◐ | Thin: the clock restarts per question, so there is no clock to beat |
| True/False Showdown | `truefalse` | ◐ | ◐ | ◐ | ✓ | ✓ | ◐ | ✓ | ◐ | Thin: a two-option quiz, no showdown |
| Predict the Outcome | `choice` | ✗ | ◐ | ◐ | ✓ | ◐ | ◐ | ✓ | ◐ | Thin: plain multiple choice |
| Fill in the Blanks | `type` | ◐ | ◐ | ✗ | ✓ | ◐ | ◐ | ✓ | ◐ | Thin: one typed gap, no gap reveal |
| Time Traveler | `type` | ✗ | ◐ | ✗ | ✓ | ✗ | ◐ | ✓ | ◐ | Thin: typed recall, no time |
| Odd One Out | `oddone` | ✓ | ✓ | ◐ | ✓ | ✗ | ◐ | n/a | ◐ | Thin on phones: they sit idle |
| Compare & Contrast | `compare` | ✓ | ✓ | ◐ | ✓ | ✗ | ◐ | n/a | ◐ | Thin on phones: they sit idle |
| Heads Up | `headsup` | ◐ | ✓ | ✗ | ✓ | ✗ | ◐ | ✗ | ◐ | **Broken**: one Correct pays the whole room; phones get verdict pads |
| Spin & Explain | `spinexplain` | ✗ | ◐ | ✗ | ✓ | ✗ | ◐ | ✗ | ◐ | **Broken**: no spin (authored order); a verdict pays everyone |
| Connection Maker | `connection` | ◐ | ◐ | ✗ | ✓ | ✗ | ◐ | ✗ | ◐ | **Broken**: Accept pays everyone; no map grows |
| Concept Chain | `conceptchain` | ✓ | ✓ | ◐ | ✓ | ✗ | ✗ | ✗ | ◐ | **Broken**: one link per start term; the link is typed on the wall; Accept pays everyone |
| Random Challenge | `randomchallenge` | ✗ | ◐ | ✗ | ✓ | ✗ | ◐ | ◐ | ◐ | Thin: not random |
| Question Cube | brainstorm prompt | ✗ | ✗ | ✗ | ✓ | ◐ | ◐ | n/a | ◐ | Thin: no cube, no pool |
| Memory Maze | — | — | — | — | — | — | — | — | — | Disabled; out of scope |

**Totals:**
- 1 premium.
- 10 solid.
- 9 thin.
- 6 broken.
- 1 disabled.

Four of the six broken games fail for one reason: a host verdict pays the
whole room. Word Reveal scores at the wrong moment, and Bowl has both
problems. They come first (section 5).

### Verified in code for this audit

- **A host verdict pays everyone.** `js/live.js` `hostVerdictGains` gives
  every player in `Live.players` the same points, and `judgeGains` routes
  Heads Up, Spin & Explain, Connection, Concept Chain, Bowl and the claim
  formats through it. One student explains well and all thirty score.
- **Word Reveal scores by the reveal, not the answer.** `wordRevealGains`
  reads `Live.dripShown` once, when marking. Guessing early earns what
  guessing late earns, which defeats the game.

The other defects in the table come from the 23 September inventory. They
are re-read in code, not re-run:
- Bowl's target comes from Q1 only.
- Concept Chain allows one link per start term.
- The Emoji hint is on from the start.
- `dripInterval: 4`.
- Boss Hit/Miss, the race lanes, the chain input and Definition's "Ask" are
  all wall-only.
- `js/studio.js` keeps a second copy of the game presets.

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
7. the `js/studio.js` preset deferral;
8. `tests/game-style-contract.test.js`;
9. the playbook.

### Build once, before the games that need them

Each of these would otherwise be written three or four times.

| # | Missing component | Why once | Used by | Size |
|---|---|---|---|---|
| **N1** | **Verdict recipient**: the desk marks *who* spoke (a player, a team, or "the room") before Correct/Accept | This is the single cause of four broken games. Built on the roster the desk already has. | Heads Up, Spin & Explain, Connection, Concept Chain, Random Challenge, Bowl | M |
| **N2** | **The draw**: take an unused item from a pool at random, with an animation on the wall, "N left", and no repeats until reshuffle | Four games promise randomness and follow authored order. | Spin & Explain, Random Challenge, Question Cube, Heads Up; later the Bingo caller | M |
| **N3** | **Proposal queue**: phones send a proposal; the desk approves, dismisses or spotlights; approved items land on the wall | The Q&A moderation queue already does this for questions. Generalise it rather than write another. | Connection Maker, Concept Chain, Odd One Out rules, Compare points | M |
| **N4** | **Round clock**: one clock for a run of items, not per question | Stages (K6) already has a clock with +30s. A one-stage round is the same thing. | Beat the Clock, Heads Up, Low-Stakes | S |
| **N5** | **Line reveal**: the room's answers placed on a number line or timeline against the true value | The slider's number line and stacked placings exist (`quiz-line`). Lift them into a reveal. | Time Traveler, Predict (numeric), Slider | S |
| **N6** | **Sort input**: drag items into two or three bins on the phone, with per-bin heat on the reveal | New input kind, like `tap` was. It also serves card-sort activities later. | Compare & Contrast; activities: concept card sort, alike/different | L |

## 4. Redesigns, game by game

Grouped by what they share. Each entry gives the gap, the redesign, the
kit it reuses and the size (S < a day, M a few days, L a week or more).

### Scoring fairness: fix before anything else

**Heads Up · Spin & Explain · Connection Maker · Concept Chain · Random
Challenge · Quiz Bowl.** Build **N1**, and send spoken-format phones a "Listen
and watch" job card (K7) instead of verdict pads.

**Quiz Bowl** also takes each cell's own value rather than Q1's. S after N1.

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
| **0** | Word Reveal per-answer scoring; Bowl per-cell target; delete the `js/studio.js` preset copy | Wrong results today; small fixes | S |
| **1** | **N1 verdict recipient**, and a spoken-format phone job card | Fixes four broken games at once | M |
| **2** | **N2 draw** and **N4 round clock** | Unblock Spin, Random, Question Cube and Heads Up | M |
| **3** | Fill the gaps; Odd One Out vote-then-defend; Predict commit-then-watch; T/F hold-or-fold | The thin-to-premium conversions that are mostly kit | M each |
| **4** | **N3 proposal queue**; Concept Chain map and Connection Maker | The discussion games' phone jobs | M |
| **5** | **N5 line reveal**; Time Traveler | | M |
| **6** | Desk parity sweep (K11) across Race, Boss, Definition, boards; Emoji hint; Ranking heat | P6 across the catalogue | S each |
| **7** | **N6 sort input**; Compare & Contrast; self-paced Beat the Clock | The two large new mechanics | L |

At the end of wave 3, the count would be roughly six premium and none
broken. At the end of wave 7, all 26 enabled formats would pass the bar.

## 6. What this audit does not decide

- **Whether spoken formats score at all.** N1 makes the scores fair. Some
  teachers would rather Heads Up and Spin & Explain had no points, like
  Random Challenge. Proposed: a per-game "count only" switch, off by
  default.
- **Named praise.** Heads Up's "Ana's round: 7" names a person on the wall.
  It is praise and the teacher chooses who goes up, but it is the one
  exception to P4. Proposed: allowed for spoken rounds, never for
  accuracy.
- **Memory Maze.** It stays disabled. No spatial board engine is planned.
