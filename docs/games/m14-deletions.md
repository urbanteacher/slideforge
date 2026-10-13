# M14 deletions: what goes, what stays, and why

Written for M14 (`docs/lab-engine-plan.md`), following `docs/games/m15-discovery.md`. It covers the classic room, player and presenter code, and the bridge in `js/lab-engine.js`. The test for each row: is the file still reachable from `view.html`, Share, print, the handout or the PDF exports (M12 was skipped, so those stay classic), or from a fallback that M14 step 2 could not close? If it is, the file stays.

## 1. Where the shell now sends each entry point

The studio's show is the default (M14 step 1). The File menu's **Use the classic slideshow** is the way back. It stores `slideforge.studioPresent=0`, and `?studioPresent=0/1` switches it too.

| Entry point | Goes to the studio when | Otherwise |
|---|---|---|
| Present | `whyNotPresentInStudio` and `classicOnly` say nothing | the classic player (`classicPlay`, the bridge) |
| Teacher Presenter | the same | `presenter.html` and the classic player |
| Notes on another device | the same | `js/player.js`'s notes link |
| Rehearse | `canHostInStudio` and `classicOnly` say nothing (the studio's Rehearse is a room with a simulated class) | `SF.Demo` (`js/demo.js`) |
| Host live | `canHostInStudio` and `classicOnly` say nothing | the classic room (`classicHostLive`, `SF.Live.host`) |
| A studio show or room that fails to start | | the classic player, rehearsal or room (`hooks.fallback`) |

## 2. The reasons a lesson still falls back (M14 step 2)

| Reason (as the guard words it) | Show | Room | Decision |
|---|---|---|---|
| `"X" is a SlideForge <type> slide the studio does not build` (`classicOnly`, new in M14) | falls back | falls back | **Must stay.** The lab copy of a SlideForge lesson leaves behind slides the converter has no form for: `motion`, `quiz`, `explain`, `results`, `spotfake`, `blank`, and a `game` the lab has no copy of (`convertsSlide`, `lab/src/decks/fromSlideForge.ts`). The bridge's `ordered` puts them back into the classic show and room. The studio never sees them, so before M14 a studio show or room silently dropped them. Host live had this gap too. The shipped Motion lab has 10 such slides, and any teacher's older lesson can have them. Closing this means porting those slide types to the converter. |
| `"X" has a live figure the lesson does not carry` | falls back | falls back | **Must stay.** The classic show plays the figure from the original lesson. The studio has only the still. |
| `"X" has a live figure (name) SlideForge does not draw` | falls back | falls back | Kept as it was (conservative). |
| `"X" is a game slide that also asks the room for … feedback` | **closed** | falls back | The show has no phones. The room cannot ask both at once yet. |
| Activity blockers (`… SlideForge's catalogue does not have`, `… a game without its game`, `… does not run yet`) | **closed** | falls back | The show draws the slide as the lab draws it, which is what the classic show showed too: a picture. Every non-game activity runs in the room (16 staged, 9 collect, 22 moment pages), so in practice the room reasons come only from damaged data. |
| `"X" holds a SlideForge check or activity` (the quiz and activity placeholder cards) | **closed** | **closed** | They are placeholder layers (`lab/src/kinds/quiz`, `kinds/activity`). The classic show and room draw them as part of the slide's picture and ask nothing, so they gain nothing from classic. |
| `"X" is <format>, not …` | **closed** | falls back | Every SlideForge format runs in the room. The only format left is the lab's own **Mind reveal** (a paper recall game). In the room, its end slide would be taken as a scores step. |
| `… has a question that is not <style>` / round mixes styles | **closed** | falls back | Damaged or hand-mixed games. The room cannot mark them. |
| `… its discussion mode is still SlideForge's to run` (Compare & contrast) | **closed** | falls back | The room runs only the sort. |
| `the lesson has no … question or feedback prompt to ask, or activity to run` | n/a | falls back | **Must stay.** A teacher hosts a lesson that asks nothing to use the classic room's quick poll, questions box and reactions. The studio's room has none of them. |
| `the lesson has no shown slide` | nothing to show | | Kept. |
| The relay never answers, or the studio's show throws | falls back | falls back | **Must stay.** This is the safety net (`hooks.fallback`). |

## 3. Inventory

"Reached from" lists the pages that load the file, and the fallbacks in section 2 that run it.

| File | Lines | Reached from | Verdict |
|---|---|---|---|
| `js/live.js` | 3,542 | `index.html` (classic Host live: classicOnly, uncarried figures, no-question lessons, every room-only reason, the safety net), `view.html` (loaded beside the player, which calls `SF.Live` 31 times), `presenter.html`; 4 tests and 1 tool | **Stays** |
| `js/live-activities.js` | 236 | `index.html`, `presenter.html` (the classic room's activities) | **Stays** with the classic room |
| `js/rounds.js` | 199 | `index.html`, `view.html` | **Stays** (`view.html`) |
| `js/stages.js` | 233 | `index.html`, `view.html` | **Stays** (`view.html`) |
| `js/teaching.js` | 255 | `index.html`, `view.html`; Draw and steps in `js/player.js`; 1 test | **Stays** (`view.html`, the classic show) |
| `js/quick-poll.js` | 133 | `index.html`, `view.html`; the classic room's quick poll, the reason a no-question lesson stays classic | **Stays** |
| `js/manual.js` | 858 | `manual.html`, which the studio's room uses too (hard rule 5) | **Stays** |
| `js/demo.js` | 575 | `index.html` (classic Rehearse for every lesson the room guard refuses, and its fallback), `view.html` | **Stays** |
| `js/lab-stage.js` | 452 | `index.html`: the classic show draws lab slides live over their pictures | **Stays** while the classic show falls back for lab lessons |
| `presenter.html` | 1,743 | the classic Teacher Presenter and room desk (`src/presenter/window.js`); 3 tests, 1 smoke | **Stays** |
| `js/presenter-live.js`, `js/presenter-activities.js` | 315, 245 | `presenter.html` | **Stay** |
| `js/player.js` | 3,218 | `index.html` (every classic fallback), `view.html` (Share's viewer: `SF.Player.start`, `goTo`, `next`, `revealStep`), `presenter.html`; 2 tests | **Stays** (M12 skipped) |
| `js/lesson-moments.js` | 74 | `index.html`, `view.html`, `presenter.html` | **Stays** |
| `src/render/quiz.js`, `src/render/live.js` | 1,322, 1,273 | bundled into `js/model.js`; the classic wall, which `view.html` uses for a shared lesson's games | **Stay** |
| `src/presenter/window.js` | 748 | bundled; `SF.Player.openPresenter` | **Stays** |
| Bridge in `js/lab-engine.js`: `pictureSlide` (426), `carried` (463), `figureSlide` (499), `ordered` (505), `lessonFrom` (544), `warmShow` (562), `buildShowDeck`/`drawShowDeck` (570-), `wordsDeck` (638), `buildShow` (640), `withShow` (651), `classicHostLive` (661), `classicPlay` (729), `classicRehearse` (836), `teacherPresenter`'s classic half (844), `followShow` (1079) | about 450 of 1,260 | every classic fallback; Share (`shareDeck`), the handout and print (`printDeck`, `printsAsPages`), the held room (`heldRoomDeck`), the practice notes (`wordsDeck`); `tests/lab-handout.test.js` | **Stays** |

Nothing listed is unreachable. Each file is loaded by `view.html` (Share), or by a fallback that cannot close until the converter builds the leftover slide types and the studio's room has the quick poll and questions box, or by both.

## 4. What M14 deleted

Nothing. Section 3 has the reasons. These deletions could happen next, in this order:

1. **Port the leftover slide types** to the converter (a `CARRIED` bump, rebuilt shipped copies): `blank` first (trivial), then `motion` (the Motion lab), then the classic `quiz`, `explain` and `results` slides as a lab game question. After that, `classicOnly` says nothing for any lesson.
2. **Give the studio's room a quick poll and a questions box**, then let it host a lesson that asks nothing.
3. **Carry every live figure** (re-convert the lessons whose stand-ins have no `slide.figure`).
4. With 1 to 3 done, classic Present, Teacher Presenter, Rehearse and Host live serve only the safety net. Retire the safety net by owner decision, then remove `classicHostLive`, `classicPlay`, `classicRehearse`, `teacherPresenter`'s classic half, `js/lab-stage.js`, `js/live-activities.js`, `presenter.html` and its scripts, and the `index.html` script tags for `js/live.js` and `js/demo.js`.
5. `js/player.js`, `js/live.js`, `js/demo.js`, `js/teaching.js`, `js/rounds.js`, `js/stages.js`, `js/quick-poll.js` and the quiz and live renderers then stay only for `view.html`, and go with M12 (a lab viewer for Share).

## 5. Final state (end of M14 in this pass)

- **Commits:** `52490d2` classicOnly; `91f0820` the default flip and Rehearse in the studio; `704b8d1` the closed fallbacks; `2bef3d9` lab-app; `f277d58` smokes; `532009f` the shell takes no keys under the studio's show (m15-discovery blocker 9).
- **Deleted:** no files and no shell branches. `git diff --shortstat origin/deploy-render -- ':!lab-app' ':!js/model.js'`: 12 files, +211 / -72 (guards, tests, smokes and this doc).
- **Tests changed, none deleted.** `lab/tests/show-present-guard.test.ts` and `lab/tests/show-entry.test.ts` now cover the new show/room split. `tests/lab-engine-default.test.js` covers the default and `classicOnly`. `tools/smoke/lab-lesson.mjs` opts into the classic slideshow for its bridge checks and checks that the studio's show is the default. `studio-room-truefalse`, `studio-room-type` and `handout` had been failing since the Showdown and Ranking ports and the handout's second toolbar button; they now check the current behaviour.

## Change log

- **13 Oct 2026.** Written for M14 steps 1 to 5. The studio's show is the default, `classicOnly` was added, the plain show's fallbacks were closed, and the shell takes no keys under the studio's show. No file was deleted (section 3).
