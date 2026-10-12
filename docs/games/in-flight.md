# In-flight work (M0.6)

## What this is

12 October 2026. Discovery for [lab-engine-plan.md](../lab-engine-plan.md), M0.6. It lists the games, activities and live-room work that is still open in the classic app, says where each item stands, and recommends one of two routes:

- **Finish in classic first.** It is built now, and its behaviour becomes a parity criterion for the lab (hard rule 12, `lab-engine-plan.md:265`).
- **Move to the lab backlog.** Classic stops here, and the lab builds it when it ports that game or activity.

Once the owner decides, classic is frozen to bug fixes (hard rule 7, `lab-engine-plan.md:260`). The games and activities audits belong to their own sessions, so the decision has to be passed on to them.

**One rule shapes most of the recommendations.** Hard rule 5 (`lab-engine-plan.md:258`) says the relay (`server/server.js`), the phone page (`join.html`) and teacher entry (`manual.html`) do not change during the lab work. So an item that needs any of those three can only be built in classic, before the freeze, or after an explicit exception. Items that are only about the wall, the desk or the rehearsal are better built once, in the lab.

No code was changed.

## The named items

| # | Item | State (with sources) | Recommendation | Why |
|---|---|---|---|---|
| 1 | **GA-19, second half: Connection Maker's approved bridges drawn as labelled lines** | Open. Phones propose a bridge; the teacher puts one on the table and credits its author. The wall shows two tiles, a "↔" and proposals as chips (`src/render/quiz.js:542-557`, `js/live.js:478-484`, `paintProposalGhosts` at `js/live.js:2794-2811`). Nothing draws an approved bridge as a line. Sources: `docs/games-premium-audit.md:65, 73, 557`; `docs/BACKLOG.md:45, 1286` | **Move to the lab backlog** | Wall drawing only, no relay or phone change; the lab rebuilds game walls as React (hard rule 4), so drawing it in classic would be done twice |
| 2 | **AC-13: tally entry for polls and scales, and a typed idea from teacher entry** | Deferred by Mark, 23 September. Tally entry exists for quiz questions only (`manualTally`, GA-15). Reasoning: two activities would use it, nothing breaks without it, a show of hands undoes the self-assessments' hold. Sources: `docs/activities-premium-audit.md:415-438, 468-476`; `docs/BACKLOG.md:46, 1334` | **Finish in classic first, if the deferral is ever lifted.** Otherwise close it | It needs the relay (`feedbackDigest`) and teacher entry, which hard rule 5 freezes for the lab |
| 3 | **AC-14: the Stations clock** (Quick Practice Stations, a clock that knows a rotation) | Blocked. Built on stages and reverted on 23 September: groups are at different stations at once, so the wall cannot name one, and the "Write it" guardrail wants a real task in each station's box (`js/ai.js:745-751`). Today it is a cards slide with timings in the notes (`src/activities/presets.js:95-99`). The Peer-Teaching Carousel already runs rotations as stages with the stations pinned as the brief (`src/activities/presets.js:149-154`). Sources: `docs/activities-premium-audit.md:132, 303-309, 532-539`; `docs/BACKLOG.md:46, 1335` | **Move to the lab backlog** | It is a new kind of clock, not a fix; the lab plan already has a slot for it (`lab-engine-plan.md:619`) |
| 4 | **AC-15, second half: Word Splash confidence sorted on the phone** | Blocked on "custom sort columns". **Smaller than recorded:** the relay already takes three named columns per question (`server/server.js:1829-1831, 1849`), the host sends them (`js/live.js:2998`), and the phone draws them (`join.html:2122`). Word Splash's three marks (know it, familiar, new) fit three columns. What is fixed is the Compare engine's meaning of them (`src/games/compare.js:156-161`). Sources: `docs/activities-premium-audit.md:263-266`; `docs/BACKLOG.md:46, 1336` | **Move to the lab backlog** | It needs no relay or phone change after all, so the lab can do it with the sort input it ports anyway |
| 5 | **AC-17: Connect Four as a board** | To do, size L, "later". Today a 4 × 4 table on a slide, claims on paper (`src/activities/presets.js:195-199`). Would score by team (§6). Sources: `docs/activities-premium-audit.md:317-318, 400-413`; `docs/BACKLOG.md:1338` | **Move to the lab backlog** | A new board game is new classic work, which the freeze rules out; it needs the boards the lab will port |

Closed, so not in flight: AC-14's Battle stays a slide (Mark, 23 September, `docs/activities-premium-audit.md:400-413`); AC-16 is done; Memory Maze stays disabled (`docs/games-premium-audit.md:399-401`).

## Other open items found

### Games

| # | Item | State (with sources) | Recommendation | Why |
|---|---|---|---|---|
| 6 | Beat the Clock: the rehearsal class does not sprint; a phone that joins mid-run waits for the next game | Open. `js/demo.js` has no sprint path. Sources: `docs/games-premium-audit.md:56, 495-497` | **Move to the lab backlog** (the rehearsal); keep the mid-run wait as the behaviour to match | The lab builds its own rehearsal; changing the join would touch the relay |
| 7 | Concept Chain: the rehearsal class never proposes a link | Open. Sources: `docs/games-premium-audit.md:66, 557-558` | **Move to the lab backlog** | Rehearsal only |
| 8 | Spot the Error: the desk has no heat-map preview (P6) | Open. Sources: `docs/games-premium-audit.md:43, 463-466` | **Move to the lab backlog** | The desk is rebuilt at M11 |
| 9 | Heads Up: clue-givers' phones could show the term | Open idea. Sources: `docs/games-premium-audit.md:63` | **Finish in classic first, if wanted** | It changes what a phone shows, which hard rule 5 freezes |
| 10 | Word Reveal: reveal polish | Open, not specified. Sources: `docs/games-premium-audit.md:54` | **Move to the lab backlog** | Wall only, and vague; specify it when porting |
| 11 | Predict's private written prediction (K8) and Odd One Out's written rule (K9) | **Built, but the audit still says open.** Predict: the phone keeps "why" and shows it at the reveal (`join.html:1429-1433, 2438-2442`, commit `20a70e8`). Odd One Out: a defence box after the reveal (`openDefence`, `js/live.js:487-495`, commit `53f5c3c`). Audit rows `docs/games-premium-audit.md:58, 61`; `docs/BACKLOG.md` GA-12, GA-13 | **Finish in classic first**: look at both on screen, then correct the audit | They are parity criteria either way; the record should say what exists |
| 12 | Viewing pass: most waves since GA-29 have not been seen on screen (only Fill, Beat the Clock and Compare have); GA-24 and GA-27 "not tested or viewed"; RP-01–03 not run in a browser; RP-04 and TPS-03 still to check | Sources: `docs/BACKLOG.md:45, 47-48, 1290-1309`; `docs/games-premium-audit.md:73` | **Finish in classic first** | Parity is measured against classic; if classic is not known to work, the lab has nothing true to match. The M0.2 recordings depend on it too |

The games audit's gaps table also lists G3, G5 and G6 as open (`docs/games-premium-audit.md:430-433`), but GA-15, GA-16 and GA-17 built them (`docs/BACKLOG.md:1282-1284`). That is a correction for the games session, not work.

### Activities

| # | Item | State (with sources) | Recommendation | Why |
|---|---|---|---|---|
| 13 | The rehearsal has no spotlight, and shows sample bars for a held prompt (A8) | Open. What keeps the 8 near-premium activities from premium. Sources: `docs/activities-premium-audit.md:355-358`; `docs/BACKLOG.md` AC-08 | **Move to the lab backlog** | Rehearsal only; the lab builds its own |
| 14 | Word clouds: single words cannot be spotlighted or hidden (A6) | Open. Sources: `docs/activities-premium-audit.md:95-97, 632` | **Move to the lab backlog** | A host and wall feature, ported with feedback kinds at M9 |
| 15 | Muddiest Point: the wall says "Spotlight", not "We'll fix this one" | Open copy change. Sources: `docs/activities-premium-audit.md:80, 252` | **Finish in classic first** | A one-line wording fix; then the lab copies the right words |
| 16 | Talk Ground Rules: three spotlights at most, the plan wanted five | Open. Limit is `Live.spotlights`, "three at most per slide" (`js/live.js:526`). Sources: `docs/activities-premium-audit.md:110` | **Move to the lab backlog** | Changing a shared limit late risks the PMI layout that relies on three |
| 17 | Flipped Instruction and Guided Inquiry: no "part 2 of 3" on the wall | Open. Sources: `docs/activities-premium-audit.md:119-120` | **Move to the lab backlog** | Wall only |
| 18 | Five staged routines where nothing lands (A7 ✗): both Jigsaws, Peer-Teaching Carousel, Socratic Seminar, Teach Someone | Open, with no plan written. Sources: `docs/activities-premium-audit.md:59-63` | **Move to the lab backlog** | It needs design first; there is nothing to finish |

### Live rooms (from BACKLOG *Open now*)

| # | Item | State (with sources) | Recommendation | Why |
|---|---|---|---|---|
| 19 | #8 Learner theming: the deck's theme has no route to the phone | Deferred, shared files. `docs/BACKLOG.md:49` | **Finish in classic first, if wanted** | It changes the phone page and what the relay sends |
| 20 | #10 Lesson-level standings, teacher-controlled | Deferred, shared files. `docs/BACKLOG.md:50` | **Move to the lab backlog** | It belongs with the lab's live host and room features (M7, M11); check then whether the host alone can do it |
| 21 | #11 Coda: exit ticket second to last, wrap last | Deferred, needs a privacy decision. `docs/BACKLOG.md:51, 84` | **Move to the lab backlog** | It is about how a lesson ends, which is the lab's job; the privacy question comes first either way |
| 22 | UX-63 Lobby with optional generated nicknames | Needs a decision. `docs/BACKLOG.md:52, 84, 139` | **Finish in classic first, if wanted** | Nicknames are made in the relay and shown on phones |
| 23 | UX-64 Student-paced mode with its own code | Needs a decision; depends on sessions surviving a deploy. GA-28 solo practice is the smaller version, done. `docs/BACKLOG.md:53, 90, 140` | **Move to the lab backlog** | It waits on durable storage ([data-storage-plan.md](../data-storage-plan.md)) whatever happens |
| 24 | UX-65 Per-student takeaway | Needs a decision on where one student's answers are kept, and for how long. `docs/BACKLOG.md:54, 91, 141` | **Move to the lab backlog** | It waits on the same storage and privacy answers |
| 25 | A live room from a lab lesson, joined from a phone by QR code | Not tried (M6 status, `lab-engine-plan.md:41`) | **Finish in classic first** | It is the bridge teachers use today; a check, not a build |

## Summary

- **25 items in flight**: 5 named, 7 games, 6 activities, 7 live rooms.
- **Finish in classic first: 8.** Three are checks or a record fix (11, 12, 25), one is a wording fix (15), and four need the relay or the phones and are only worth doing if wanted (2, 9, 19, 22).
- **Move to the lab backlog: 17**, including the Stations clock, Connect Four, Word Splash and Connection Maker's bridges.

## Decision needed

For Mark, at gate 1. Each is a yes or no.

1. **Before classic is frozen, should we check on screen the game and activity changes that were built but never seen?** Recommended: yes. The lab has to copy how they work, so we need to know they work.
2. **Is a room where most learners have no phone common enough that you want polls and scales filled in by a show of hands or paper slips?** If not, tally entry for them (AC-13) is closed for good. If yes, it has to be built now, in the current app.
3. **Do you want any of these phone changes before the freeze?** After it, the phone screen stays as it is until the lab is done.
   - In Heads Up, the clue-givers' phones show the word.
   - The phone takes the lesson's colours and look.
   - Students can be given made-up nicknames in a waiting room.
4. **Are you happy for these to wait for the new studio, rather than be built in the current app?** The Stations rotation clock, Connect Four as a game, Word Splash's "know it / seen it / new" sort on phones, and Connection Maker drawing each accepted link between the two ideas.
5. **Real names on the wall and in reports:** is that ever a problem in your classes? The end-of-lesson Coda, nicknames and per-student takeaways all wait on this answer.

## Change log

- 12 October 2026: written.
