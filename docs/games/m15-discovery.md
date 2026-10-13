# M15 discovery: what classic can go now, what must stay

13 October 2026.

## What this is

This is the discovery for M15 ("Lesson parity and removal of the classic engine") in [lab-engine-plan.md](../lab-engine-plan.md). It is read-only analysis. No code was changed. It answers one question: with the studio able to run lessons whose games are Multiple choice, True or false, Type answer and Slider, how much classic code can be deleted, in what order, and what must stay while the other 22 game styles, the 54 activities and the classic live room still run.

The base is the local branch `m15` (commit `a653921`, "M11a"). Nothing is pushed.

Short answer:

- **Deletable now: about 1,200 lines of dead editor code** (the editing half of `src/editor/customize.js`) **and one script tag** (`view.html` loads the 683 KB `js/lessons.js` and never uses it). Section 3, steps 1 and 2.
- **The big classic files cannot go yet.** `js/player.js`, `js/live.js`, `presenter.html`, `src/render/quiz.js` and `src/render/live.js` serve the unported games and the classic room, and the shell's fallback for any lesson that holds one. About 25,600 lines stay (section 4).
- **The studio does not yet replace everything a teacher uses.** Draw, Rehearse, native student PDF, Share and the shared-link viewer, and resume after a reload are missing (section 1). Switching the shell's Present before Draw exists would be a loss for teachers.
- **The one change that unlocks the rest is a guarded switch.** Present, Teacher Presenter and Notes on another device go to the studio for lessons with nothing unported, and stay classic for the rest. Only 5 of the 31 shipped lessons (the two Week 5 copies, the two Week 7 copies, and the layout bank) carry something unported.

Two corrections to the brief this discovery started from:

- **Draw and Rehearse are not built in the studio.** The plan's change log says so for M11a ("Not ported (M11b and later): Draw and ink, Rehearse…"), and `lab/src/show/` and `lab/src/presenter/` hold no ink, laser, spotlight or rehearsal code (grep for `ink`, `rehears`, `freeze` finds nothing).
- **The shell's Present is not switched, and the studio show is hidden.** It is only offered with `?studioShow=1` (`lab/src/show/state.ts:41-49`, `lab/src/app/TopBar.tsx:91`).

## How this was measured

```sh
wc -l js/*.js src/*.js src/*/*.js src/render/figures/*.js presenter.html view.html join.html
grep -nE "^  (Player\.[A-Za-z_]+ = |function [A-Za-z_]+\()" js/player.js        # the player's members and their lines
grep -n "SF\.Player\|SF\.Live\|SF\.Demo\|SF\.Print" js/shell.js js/lab-engine.js
grep -rhoE "from '[^']*@sf[^']*'" lab/src lab/tests | sort | uniq -c            # what the lab takes from src/
node -e "…"    # over assets/lab-lessons/*.lesson.json: games by format, figures, activities, layer kinds
```

Counts are from the tree at `a653921`. Line ranges are from grep and `sed`, not from a full read of each file, so a range may be a few lines out at its edges.

What the 31 shipped lab lessons hold (1,224 slides):

| Content | Count | Notes |
|---|---|---|
| Game slides | 109 | Multiple choice 78, Slider 10 (both ported); Ranking 3, Horse race 7, Boss battle 11 (unported) |
| Live figures (`liveFigure`) | 36 | Only in the Week 5 and Week 7 lessons, teacher and student copies |
| Activity slides, SlideForge check layers | 0 | Nothing in the shipped copies uses them |
| Slides with audience feedback | 40 | Ported (M9) |
| Timer layers | 26 | The converter turns `slide.timeLimit` into a timer layer (`lab/src/decks/fromSlideForge.ts:387`) |

Lessons with something the studio cannot run: `ipdv-ia-w5`, `ipdv-ia-w5-student`, `ipdv-maps-w7`, `ipdv-maps-w7-student` (figures) and `layout-bank` (21 unported game slides). The other 26 run whole in the studio. *Since 13 Oct 2026 the studio's show plays the live figures (`lab/src/show/figure.ts`), so Weeks 5 and 7 run whole in it too.*

## 1. Feature map: what a teacher uses for a lesson

Status: **Done** (in the studio), **Partly**, **Missing**, **Bridge** (works through the classic player; not a studio feature). "Studio" paths are under `lab/src/`.

| Feature | Classic home | Studio status | Where, and what is missing |
|---|---|---|---|
| Present (full-screen show) | `js/player.js` `Player.start` (3059), shell `ws.play` (`js/lab-engine.js:751-755`), ⌘↵ (`js/shell.js:1843`) | **Partly** | `app/embed.ts:380` `presentInStudio`, `show/Show.tsx`. Behind `?studioShow=1` only. Shell still starts the classic player. |
| Builds, word timing, transitions, moving backgrounds | Lab drawn over the classic player by `js/lab-stage.js` (452 lines) | **Done** | The lab's own `DeckPlayer` in the studio show |
| Teacher Presenter | `Player.openPresenter` (`src/presenter/window.js:157`), `presenter.html` | **Partly** | `presenter/PresenterWindow.tsx`, `protocol.ts`, `timer.ts`; opened from the bar's monitor button (`show/Show.tsx:368`). Shows slides settled, no builds, no thumbnails; a countdown does not survive closing the window. Shell's Teacher Presenter button (`js/lab-engine.js:884-885`) is still classic. |
| Notes on another device | `Player.notesElsewhere` (`js/player.js:2996`), menu item added by `js/player.js:3031-3052` | **Done** | `show/prompter.ts`, `show/ShowTools.tsx:44` `NotesCard`, `show/Show.tsx:299-308`. The shell's menu item still starts the classic one. |
| Speaker notes on the wall (N) | `js/lab-stage.js:311-330` notes card | **Done** | `show/Show.tsx:254` |
| Rehearse (sample class, no room) | `js/demo.js` (575 lines), `js/lab-engine.js:703-714` | **Missing** | Nothing in the lab. It can stay on the bridge for every lesson. |
| Draw (ink, spotlight) | `js/teaching.js` (255 lines), HUD `ink` control (`js/player.js`, `controls.ink`) | **Missing** | The plan lists it as M11b. |
| Black and white screen | `Player.toggleBlank` (2858) | **Done** | `show/Show.tsx:246-247` (B, `.`, W, `,`) |
| Jump to a slide | `SF.jumpToSlide` (`js/render.js:156`), rail "go" box | **Done** | `show/Show.tsx:234-245` (digits, Enter); overview Enter |
| Overview | `Player.toggleOverview` (`js/player.js:262`) | **Partly** | `show/Show.tsx:248`. Tiles show number and name, no thumbnails. |
| Timers | `startSlideTimer` (`js/player.js:1438`), question clock | **Partly** | Timer layer kind `kinds/timer`; question clock `show/clock.ts`; countdown in the desk `presenter/timer.ts`. Missing: classic's "30 seconds more" (`controls.stageMore`). |
| Full screen | `Player.toggleFullscreen` (2883) | **Done** | `show/Show.tsx:209-210`; the shell asks inside the click (`js/lab-engine.js:643-648`) |
| Solo answer on a game slide (tap, reveal, score) | `js/player.js:808-1100` (quiz slides) | **Missing** (no-room show) | In a no-room studio show a question is a slide, then the answer slide. No tap-to-reveal. **Owner decision needed.** |
| Solo audience-feedback sample | `toggleSoloFeedback` (`js/player.js:1900`) | **Missing** (no-room show) | A feedback slide asks nothing without a room. |
| Freeze the wall | `Player.toggleFreeze` (2818) | **Missing** | |
| Show comes back after a reload | `saveRun`/`restoreRun` (`js/player.js:42-65`), `js/lesson-runtime.js:137-157` | **Missing** | The plan notes held-room resume is not ported (M7 slice 3). |
| Student PDF handout | `js/print.js` (280 lines), `SF.Print.open` (`js/shell.js:1260-1261`) | **Bridge** | `js/lab-engine.js:580-612` (`printsAsPages`, `buildPrintDeck`) prints lab pictures and puts SlideForge originals back for experiments and games. No native PDF in `lab/src/export`. |
| Share link, read only | `js/share.js` (141 lines), `view.html` (242 lines) | **Bridge** | `js/lab-engine.js:1053-1066` `shareDeck` (pictures stepped down to 8 MB). No lab viewer (M5 owed it). |
| Share, practice mode | `view.html:124-140` (games carried in the copy) | **Bridge** | Needs the classic solo quiz. |
| Share, follow the room | `view.html:178-235`, relay `watch` | **Bridge, classic room only** | `lab/src/live` has no share id or watch (grep finds none). A studio room has no follow link. |
| HTML export | none in the shell's Export menu | **Partly** | `lab/src/export/exporters.ts:24-62` `exportHtml`, reached only from the hidden lab TopBar (`app/TopBar.tsx:63`). No game runtime (M12). |
| PNG, PowerPoint, JSON | `js/shell.js:1226-1277` | **Done** | `lab/src/export/` |
| Library, File, Save, Open, Import | `js/shell.js`, `js/studio.js` | **Done** | Kept by design (hard rule 2). Lab decks through `ws.store` (`js/lab-engine.js:133-166`). |
| Restore points | `js/history.js` (210 lines) | **Done** | `restoreDoc` (`js/lab-engine.js:739`) |
| Demo deck | `btnTemplate`, `SF.LabEngine.openKey` | **Done** | 31 shipped copies in `assets/lab-lessons/` (18 MB) |
| Practice notes (.md) | `SF.deckToMarkdown` (`src/deck/markdown.js`, 342 lines) | **Partly** | Through the bridge's words deck (`js/lab-engine.js:614`). Needs the classic deck format. |
| Reports | `js/reports.js` (755), `manual.html` | **Done** | The studio room hands its session to the shell's Reports (`show/reports.ts`, `js/lab-engine.js:657-678`) |
| Host live | `SF.Live.host` | **Partly** | Studio for the four styles and feedback (`show/canHost.ts`); classic for anything else. |

Count: of 28 rows, 11 are Done, 7 Partly, 6 Missing, 4 Bridge. The feature-map doc (`docs/studio-feature-map.md`) lists 45 Missing rows today, mostly editor features, which this discovery does not cover.

## 2. Dependency graph: who needs what

Key:

- **(a)** serves only lessons the studio can run whole.
- **(b)** serves only unported games, activities and the classic room.
- **(c)** serves both.

The rule that decides most rows: there is no hybrid (hard rule 1). A lesson with one unported game plays wholly through classic. So the classic player still needs every ordinary slide feature. Almost nothing in classic is (a) only.

### What the lab itself takes from `src/`

Only three places (`grep` of `@sf` in `lab/src` and `lab/tests`): `src/games/registry.js` (5 imports), `src/games/marking.js` (2), `src/games/scoring.js` (1), `src/deck/feedback.js` (1), `src/activities/fields.js` (1). The lab never imports `js/player.js`, `js/live.js` or `src/render/`. So deleting the classic renderer, editor and player does not break the lab's build. It does break the bridge and the tests.

### `js/player.js` (3,218 lines)

| Lines | What | Class | Why |
|---|---|---|---|
| 1-157 | State, `saveRun`/`restoreRun`, events, DOM build | c | Both fallback shows and the room |
| 158-247 | HUD controls (`controls`, `control`) | c | Ink, share, freeze are lesson controls; join, reactions, poll are room controls |
| 248-317 | Overview | c | Fallback shows use it |
| 318-440 | Quiz maths, `wallSlide`, spontaneous pill | b | Games and the desk |
| 441-697 | `renderCurrent`, morph | c | Draws every slide |
| 698-806 | Race and boss | b | |
| 808-1100 | Quiz slides: `wireQuiz`, `paintAnswer`, fit | b | Once Present is switched, the four ported styles stop using it |
| 1101-1222 | Media | c | Video and music |
| 1223-1406 | `answer`, chain, `timeUp`, definition | b | |
| 1407-1489 | Countdown, slide timer | c | |
| 1490-2094 | Score rail and room rail | b | Room |
| 2095-2675 | Live extras (tally, reveals, leaderboard, race track, boss bar, study cards) | b | Room |
| 2676-2900 | Navigation, freeze, blank, full screen | c | |
| 2901-3056 | Notes on another device | c | Studio has its own; fallback shows use this |
| 3057-3218 | `start`, `close`, presenter view, toast | c | |

About 1,900 of the 3,218 lines are (b) and the rest (c). Nothing is (a) only. After every style and activity is ported, the whole file goes (M14 and M15).

### The other classic files

| File | Lines | Class | Notes |
|---|---|---|---|
| `js/live.js` | 3,542 | b | 192 uses of `SF.Player` (64 members, see `player-usage.md`). Also the fallback Host live for studio lessons. |
| `js/live-activities.js`, `js/presenter-activities.js`, `js/presenter-live.js` | 236, 245, 315 | b | Desk and activity room |
| `presenter.html` | 1,743 (CSS 23-315, body 321-562, scripts 563-1743) | b, plus the notes and timer panels (c) | Nine panels (`presenter.html:366-374`): quick, activities, pulse, slides, mark, roster, questions, tools, Q and A. Only `slides` and the timer in `tools` serve a plain lesson; the studio has its own window. |
| `src/presenter/window.js` | 748 | c | `SF.Player.openPresenter` and the 35-command `sf-presenter-cmd` desk; 40 uses of `SF.Live` |
| `js/demo.js` (Rehearse) | 575 | c | Lesson rehearsal and game rehearsal. Used by `js/lab-engine.js:703` |
| `js/teaching.js` (ink, steps) | 255 | c | Draw is missing in the studio |
| `js/stages.js`, `js/rounds.js`, `js/quick-poll.js`, `js/lesson-moments.js` | 233, 199, 133, 74 | b | Activity stages, rounds, the teacher's quick poll |
| `js/render.js` | 2,736 | c | Layouts 255-1063, charts 1064-1593, infographic 1594-2085, code colouring 2086-2376, `renderSlide` entry 2377-2681, "a question, shown" 2682-2736. A bridge show uses only image, quiz, game, figure and activity slides, so the layouts, charts, infographic and code parts (about 2,100 lines) are used only by the handout (see below), `view.html` for old classic links, the review tool and the tests. |
| `src/render/quiz.js`, `src/render/live.js` | 1,322, 1,273 | b | The room's wall |
| `src/figures/` (was `src/render/figures/`) | 1,513 | c | The 36 live figures in Weeks 5 and 7. Moved out of `src/render/` on 13 Oct 2026; the studio's show imports them (hard rule 1), so they stay after the classic renderers go |
| other `src/render/*` (charts 1,485, lattice 961, words 346, layout-slots 322, experiments 278, explore 273, fit-check 270, compositions 181, motion-lab 174, art 128, and the region files) | about 3,060 | a (gated) | Drawn only for classic content slides. The handout prints SlideForge originals for experiments and games through them (`js/lab-engine.js:580-588`), so they wait for a native PDF. |
| `src/games/`, `src/activities/`, `src/boards/` | 3,630, 1,547, 1,088 | b | The lab imports a few files in place (above). The 22 unported styles' logic is here. |
| `src/model.js` / `js/model.js` | 1,939 / 23,523 | c | The converter's input, `SF.compileGame`, `SF.buildRunDeck` (`src/model.js:1433`), the store, the room. Bundles everything above. |
| `js/lessons.js` | 10,499 (data 13-10149, bank code 10150-10490) | c | `SF.LESSONS` is the source of the shipped lab copies and of the Library's seed. `view.html` loads it and uses none of it. |
| `js/lab-engine.js`, `js/lab-stage.js` | 1,111, 452 | c | The bridge (section 5) |
| `js/print.js` | 280 | c | `SF.Print.pagesFor` and `open`; 15 uses in `tests/print.test.js` |
| `js/share.js`, `view.html` | 141, 242 | c | |
| `join.html`, `manual.html`, `js/manual.js` | 2,811, n/a, 858 | b and the studio's room | Frozen phone and entry clients (hard rule 5). Not for deletion. |
| `src/editor/customize.js` | 1,305 | a (about 1,150 dead) | Only `SF.Custom.paint`, `layout`, `entry`, `apply`, `rebase` are used by the renderer. The Look pane and canvas editing (about 700 lines) call `SF.Editor`, which no longer exists (`src/editor/customize.js:682, 927, 964`). Their only callers are `tests/customize.test.js` and one assertion in `tools/smoke/demo-deck.mjs:458`. |
| `src/editor/deck-settings.js` | 547 | b-ish | Only the AI smoke test (`js/lesson-runtime.js:121`) and `SF.Shell.themePicker` (`js/shell.js:177-208`) use it. |
| `js/shell.js` | 1,880 | shell | Keep (hard rule 2). The classic canvas, zoom and notes-strip code has already gone from it. |

### The bridge pieces

See section 5.

## 3. What can be deleted safely now, in dependency order

"Safely" means: nothing the studio or an unported game, activity or the classic room calls reaches it. Each item names what proves it.

### Step 1. Stop `view.html` loading `js/lessons.js`

| | |
|---|---|
| What | Remove `<script src="js/lessons.js?v=56">` (`view.html:75`). |
| Size | 1 line. Saves a 683 KB download on every shared-link open. |
| Shell change needed | None. |
| Why it is safe | Nothing `view.html` loads uses `SF.LESSONS` or `SF.LessonBank` (grep of `LESSONS\|LessonBank\|buildLesson\|seedLibrary` over every script `view.html` loads, and over `view.html`, finds no match). |
| Risk | Low. A script that quietly relies on something the file sets (it assigns `SF.LESSONS`, `SF.LessonBank`, `SF.buildLesson`, `SF.seedLibrary`, `SF.keepOneDemoCopy`, `SF.dismissLibrarySeed`, `SF.restoreLibrarySeed`) would fail on load. |
| Check | `node tools/smoke/run.mjs share` and `node --test tests/share.test.js`. |

### Step 2. Delete the editing half of `src/editor/customize.js`

| | |
|---|---|
| What | The Look pane, canvas block editing, `tagControls`, `bind`, `editCanvasBlock`, `openCanvasEditor`, `removeBullet`, inline editing, and the matching names in `SF.Custom` (`src/editor/customize.js:1304`). Keep `paint`, `layout`, `entry`, `apply`, `rebase`, `motion` and what they share (`color`, `entry`, `value`). |
| Size | About 1,150 of 1,305 lines, plus `css/customize.css` (508 lines) once its class names are checked against what is left. `npm run build` shrinks `js/model.js` by the same. |
| Shell change needed | None. `SF.Editor` is already gone; the three references are dead branches. |
| Risk | Medium. The file says the split "does not separate cleanly" (header comment): the kept functions share helpers with the removed ones. `tests/customize.test.js` tests the removed functions and must be cut down with them. |
| Check | `npm test` (build check, typecheck, unit tests), `node tools/smoke/run.mjs demo-deck design-foundations`, and a grep that no name left out of `SF.Custom` is referenced: `grep -rn "SF\.Custom\.\(tagControls\|bind\|editCanvasBlock\|openCanvasEditor\|removeBullet\)" js src tools tests`. |

### Step 3. The hidden classic stage in `index.html`

| | |
|---|---|
| What | The rail, canvas bar, strip and inspector markup (`index.html:174-232`, about 58 lines), and the CSS rules for them in `css/app.css` (7,520 lines; the share is not measured). |
| Size | About 58 lines of HTML and an unmeasured amount of CSS. |
| Shell change needed | `js/shell.js:399-400` and `1780-1781` write `#railLabel`; those lines go or are guarded. `tools/smoke/cover-motion.mjs` and `src/editor/customize.js` read `#previewBox`. |
| Risk | **Medium to high without a browser.** The page's grid layout (`#app`) probably expects those slots, and the lab frame sits over them (`js/lab-engine.js:763-772`). A layout break is invisible to unit tests. |
| Check | `node tools/smoke/run.mjs lab-lesson cold-start refresh` and a look in a browser. Do last, or skip. |

### After the shell switch (steps 4 to 6 in section 6): what then goes

These are not safe today. They become safe in this order, each gated on the studio doing the job.

| Order | What | Lines | Gate |
|---|---|---|---|
| A | The bridge's lesson-only pieces: for a lesson with no unported content, the shell stops calling `withShow`, `buildShow`, `drawShowDeck`'s pictures for Present, Teacher Presenter and Notes. Nothing is deleted yet, because the fallback still needs them. | 0 | Present, Teacher Presenter, Notes on the studio |
| B | `js/print.js`, `buildPrintDeck`, `printsAsPages`, the handout path | about 280 + 35 | A native student PDF in the studio |
| C | The classic content renderers: other `src/render/*` (about 3,060) and the layouts, charts, infographic and code parts of `js/render.js` (about 2,100), and the classic theme CSS they alone use | about 5,200 JS | B done, and a tests-and-smokes pass on a minimal renderer for `image`, `quiz`, `game`, `figure`, `activity` slide types |
| D | `src/editor/deck-settings.js`, `themePicker` | about 580 | The AI smoke test rehomed |
| E | `js/lab-stage.js`, the bridge, `js/lessons.js` data | about 450 + 1,100 + 10,100 | Every style, activity and figure ported, and lessons stored as lab data |
| F | `js/player.js`, `js/live.js`, `presenter.html`, the quiz and live renderers, `src/games`, `src/activities`, `src/boards`, `src/model.js` | about 25,000 | M14 |

## 4. What must stay until the games and activities are ported

The smallest classic that keeps the 22 unported styles, the 54 activities and the classic room running:

| Keep | Lines | Why |
|---|---|---|
| `js/player.js` | 3,218 | The wall for the room (192 uses of it in `js/live.js`), the solo show for any lesson with an unported game, activity or figure |
| `js/live.js`, `js/live-activities.js` | 3,542 + 236 | The classic room |
| `presenter.html`, `js/presenter-live.js`, `js/presenter-activities.js`, `src/presenter/window.js` | 1,743 + 315 + 245 + 748 | The desk for the room and the activities |
| `join.html`, `manual.html`, `js/manual.js` | 2,811 + n/a + 858 | Phones and teacher entry; the studio's room uses them too (hard rule 5) |
| `src/render/quiz.js`, `src/render/live.js` | 1,322 + 1,273 | The wall's game drawing |
| `src/figures/` | 1,513 | The 36 live figures (Weeks 5 and 7); also the studio show's, since 13 Oct 2026 |
| `src/games`, `src/activities`, `src/boards` | 3,630 + 1,547 + 1,088 | The logic for the 22 styles and 54 activities. The lab imports from it in place. |
| `js/stages.js`, `js/rounds.js`, `js/quick-poll.js`, `js/lesson-moments.js`, `js/teaching.js`, `js/demo.js` | 233 + 199 + 133 + 74 + 255 + 575 | Stages, rounds, quick poll, Draw and Rehearse, until the studio has them |
| `js/lab-engine.js`, `js/lab-stage.js` | 1,111 + 452 | The bridge |
| `js/render.js` (reduced later) | 2,736 | Draws image, quiz, game, figure and activity slides |
| `src/model.js` and the built `js/model.js` | 1,939 + 23,523 | Everything above runs on it |
| `js/lessons.js` | 10,499 | The source of the shipped copies and the Library's seed |
| `js/print.js`, `js/share.js`, `view.html` | 280 + 141 + 242 | Handout and Share, until native |
| `js/reports.js`, `js/history.js`, `js/studio.js`, `js/docs.js`, `js/palette.js`, `js/shell.js` | shell | Kept by design |

The classic player, room and renderer parts of that table add to about 25,600 lines. This is "must stay".

## 5. The bridge

### How a studio lesson becomes a classic lesson

`js/lab-engine.js` builds a SlideForge lesson from the lab deck, so the classic room, player, Teacher Presenter, Rehearse, Share and the handout can run it. The pieces, in the order they run:

| Step | Function (`js/lab-engine.js`) | What it does |
|---|---|---|
| Warm up | `warmShow` (538-544), `drawShowDeck` (550-578) | Draws every lab slide as a JPEG (`api.stills(1600, …)`), cached per slide by the lab (`embed.ts` stills). Reports progress every 10 slides for a lesson over 12. |
| Games | `SF.labShowSlides(stills)` (`src/deck/labshow.js`, 124 lines) | Turns each lab game question into a SlideForge quiz slide with the lab drawing over it (`design.labStill`, `labReveal`, `labAsk`). Boards, rounds played in one go, and Word reveal play on SlideForge's own wall. |
| One slide each | `pictureSlide` (402-437) | A full-bleed `image` slide, `imageFit: 'contain'`, no title or body, no header or footer, `transition: 'none'`, `design.labStill`. Notes and hidden carry over. The slide's feedback is rebuilt with `SF.makeFeedback`. |
| Put the originals back | `ordered` (481-518), `carried` (439-448) | The lab records each slide's `sourceSlideId`. Slides the lab could not build (`api.cannotBuild`, `embed.ts:414`, via `convertsSlide` at `fromSlideForge.ts:422`) go back after the slide they followed. A lab game that the lab built itself is not put back a second time. A deck with no `sourceSlideId` is matched in order when the counts agree. |
| Live figures | `figureSlide` (475-479), `ordered` (`item.liveFigure`) | The lab slide's `slide.figure` becomes SlideForge's figure slide, so it can hover and Next steps it. A figure's SVG still (`figureStills`, 198-220) stands in the lab. |
| Make the lesson | `lessonFrom` (520-531) | `SF.normalizeDeck` over the original lesson's settings plus the new slides. The lab deck's own id is kept, because the lobby checks the room is for the lesson on screen (`js/live.js:864-866`). |
| Hand a lesson in | `gameForLab` (170-196), `lessonGames` (222-238) | The reverse direction: a classic lesson's games are compiled with `SF.compileGame` and given to the converter. |
| Run | `buildShow` (616-625), `withShow` (627-635) | `SF.buildRunDeck(deck, SF.GameStore.get)` (`src/model.js:1433`), then the slide the editor is on. |

Entry points that call it: `ws.play` (751), `classicHostLive` (637), `rehearse` (703), `teacherPresenter` (716), `shareDeck` (1053), `showDeck` (1044), `printDeck` (1048), `heldRoomDeck` (1069), `wordsDeck` (1102).

### What the unported games need from the bridge

- **Compiled games** (`SF.compileGame`, `src/model.js:1154`) and `SF.GameStore`, so Ranking, Horse race, Boss battle and the other 19 styles play on SlideForge's wall with the room's state.
- **`labShowSlides`** to turn each lab question into a quiz slide, and board games into boards.
- **The stills**, for every non-game slide, because the classic player draws a lab slide as a picture and `js/lab-stage.js` draws the lab live over it.
- **`SF.buildRunDeck`**, which resolves each game slide to its game.
- **`SF.Live.host`**, which the fallback `classicHostLive` calls.
- **The lab's frame hiding while the show runs** (`SF.LabStage` and `js/lab-stage.js`).

### What part of the bridge can go for a lesson with only studio-supported games

For such a lesson (no unported game, no activity, no live figure, no SlideForge check), the shell can run Present, Teacher Presenter and Notes in the studio with no bridge at all: no stills, no `lessonFrom`, no `buildRunDeck`, no `labShowSlides`, no `lab-stage`. That saves the pause while the pictures are drawn ("Preparing the show…", `js/lab-engine.js:555-561`) and the doubled drawing.

What does **not** leave, even for such a lesson:

- Share and the student PDF, until they are native (they use the stills).
- Rehearse, until `SF.Demo` is ported.
- The classic Host live, because the room falls back to it on failure (`js/lab-engine.js:658-664`).

The bridge code itself cannot be deleted until every lesson is studio-runnable, because the same functions serve the fallback. That is step E in section 3.

## 6. Hard blockers, and the order of the steps

### Blockers (what stops a clean switch)

| # | Blocker | Why it matters | Plan |
|---|---|---|---|
| 1 | **Fallback for lessons with unported content.** The shell's Present, Teacher Presenter and Notes must still go through classic for them. | A lesson with one Boss battle slide would otherwise lose the game on Present. | A guard `whyNotPresentInStudio(deck)`, modelled on `canHostInStudio` (`lab/src/show/canHost.ts:23-45`), without the "must ask a question" clause. |
| 2 | **Draw is missing.** | A teacher's most visible loss on switching. | Build M11b Draw before the default flips; keep the switch behind a flag until then. |
| 3 | **No solo answer on a question in the no-room show.** | Classic Present lets the teacher tap an answer and reveal it. | Owner decision: is a question slide, then the answer slide, enough? |
| 4 | **Share, shared-link viewer and follow link.** | The classic viewer needs the classic player; the studio room offers no follow link. | Keep the bridge for Share. A lab viewer is a separate milestone. |
| 5 | **Native student PDF.** | `js/print.js` and the whole classic renderer stay alive for it. | Build it in the lab, then delete (section 3, B and C). |
| 6 | **Rehearse.** | `js/demo.js` stays until a sample class exists in the studio. | Leave Rehearse on classic for every lesson. It is not a gate on the Present switch. |
| 7 | **Resume after reload.** | `restoreRun` brings a show back; the studio's show does not. Held room resume is not ported either. | Port `restoreRun` for the studio show, or accept the loss. |
| 8 | **The editor follows the show.** `followShow` (`js/lab-engine.js:933-950`) moves the editor to the slide the show ended on, using `SF.Player` events. The studio show's `exited` hook (`js/lab-engine.js:659`) says nothing about where it ended. | "Present again goes on from there" would regress. | Add the end slide to the `exited` hook and call `api.showSlide(id)` (`embed.ts`). |
| 9 | **The shell stands down while `SF.Player.open`** (`js/shell.js:1812`). | With the studio show open, `SF.Player.open` is false. If focus returns to the parent page, shell shortcuts would act on the hidden editor. | The studio show already focuses its frame (`js/lab-engine.js:691`); add a `lab-show` check at `js/shell.js:1812`. |
| 10 | **Menu items are classic DOM.** `btnNotesElsewhere` is created and wired by `js/player.js:3031-3052`, and `btnPresenter` and `btnRehearse` are wired at `js/lab-engine.js:884-889`. | The hooks cannot be switched in one place. | Wrap the three `onclick`s in `install` (`js/lab-engine.js:814-890`). |

### Recommended order of M15 steps

Small, independent commits. Each is reversible: it is one revert, or a flag.

| # | Commit | Reversible by | Size |
|---|---|---|---|
| 1 | `view.html` stops loading `js/lessons.js` (section 3, step 1). | Revert. | 1 line |
| 2 | Delete the editing half of `src/editor/customize.js`, cut `tests/customize.test.js` and the one smoke assertion, rebuild `js/model.js` (step 2). | Revert. | -1,150 lines |
| 3 | Add `whyNotPresentInStudio(deck)` to `lab/src/show/` with unit tests, and a `labApi.whyNotPresentInStudio` (`lab/src/app/embed.ts`). No behaviour change yet. | Revert. | +40 lines |
| 4 | Make `presentInStudio` accept the shell's hooks like `hostInStudio` does and report where the show ended (blocker 8). Still behind `?studioShow=1`. | Revert. | +30 lines |
| 5 | In `js/lab-engine.js` change `ws.play` (751-755) to: if the guard passes and the flag `slideforge.studioPresent` is on, `enterStudioShow` then `a.presentInStudio(studioHooks())`; otherwise unchanged (`withShow` and `Player.start`). **Flag off by default.** | Turn the flag off. | +20 lines |
| 6 | Same switch for `teacherPresenter` (716-725) and `btnNotesElsewhere`. In the studio show these are the monitor and phone buttons (`show/Show.tsx:368`), so the shell menu item just opens the show with the desk or the notes card up. | Flag. | +30 lines |
| 7 | Build Draw in the studio show (M11b). | Revert. | lab only |
| 8 | Owner tries the flagged Present, Teacher Presenter and Notes on the five kinds of lesson. Flip the default to on. | Flag. | 1 line |
| 9 | Native student PDF in `lab/src/export`, then a flag to use it for lessons that pass the guard. | Flag. | lab only |
| 10 | Remove `js/print.js` and the handout bridge for guarded lessons; then the classic content renderers (section 3, C). | Revert. | about -5,500 lines |
| 11 | Rehome the AI smoke test, then delete `src/editor/deck-settings.js` and `themePicker`. | Revert. | about -580 |
| 12 | Hand off to M14: ports of the other styles and activities, then delete the rest (section 3, E and F). | n/a | about -37,000 |

Steps 1 and 2 are deletions that need nothing else. Steps 3 to 8 are the switch. Everything after step 8 is gated on ports the plan already schedules.

## 7. Risks of deleting without browser tests, and the cheapest checks

### Risks specific to this repo

| Risk | Why |
|---|---|
| **`js/model.js` is generated and committed.** | A source edit in `src/` that is not rebuilt, or a build that picks up another agent's unfinished work (AGENTS.md: run `git status src/` first), ships the wrong bundle. `npm test` fails on a stale build. |
| **Load order.** | The scripts are loaded in a fixed order (`index.html:438-485`) and attach to `SF` as they run. Removing a file or a name that a later file reads at load throws before anything draws, and a unit test does not run the page. |
| **Names reached through `SF.*` strings.** | The shell, the room and the bridge reach each other through `SF.Player`, `SF.Live`, `SF.Print`, `SF.Demo`, `SF.Custom`. A grep for a deleted name misses `SF[name]` and `guard ? a() : b()` fallbacks (40 such guards in `js/live.js`). |
| **Layout without a browser.** | The hidden classic DOM, the lab frame and `html.lab-show` (`css/studio.css`) share one grid. Nothing in `npm test` renders it. |
| **The lab bundle is committed.** | `lab-app/` and `lab-app/stage.js` must be rebuilt (`npm --prefix lab run build:app`) after a lab change, and are not merged by hand (AGENTS.md). |
| **Two copies of the viewer scripts.** | `view.html` and `presenter.html` carry their own `?v=` numbers, already out of step with `index.html` (`view.html:94` has `render.js?v=65`, `index.html:462` has `?v=71`). |
| **Tests that load the classic model.** | 54 of 91 root tests load `js/model.js`. Deleting a name used by one of them fails the suite, which is a useful signal but also a reason to run them. |
| **Owner has asked for no more browser testing in recent slices** (change log, M8 and M11a). | Browser smokes were not run for the last four slices; any switch should be checked by the owner by hand. |

### Cheapest checks after each step

| Check | Command | Proves |
|---|---|---|
| Build is current | `npm run build:check` | `js/model.js` matches `src/` |
| Types | `npm run typecheck` and `npm --prefix lab run typecheck` | No dangling import or property |
| Unit tests | `node --test tests/*.test.js` (all 91), `npm --prefix lab test` | Logic still holds |
| Targeted tests | `node --test tests/lab-engine-default.test.js tests/lab-handout.test.js tests/lab-lessons.test.js tests/print.test.js tests/share.test.js tests/presenter.test.js tests/presenter-keys.test.js tests/customize.test.js` | The bridge, handout, share and desk |
| Dangling references | `grep -rn "SF\.<name>\b" js src lab/src tools tests *.html` for each name removed; also `grep -rn "SF\[" js src` for computed access | No caller left |
| Render surface | `npm run audit:render-surface` | No name added to `SF` from the renderer; re-record with `--update` and note it in `docs/render-split.md` §7 if deliberate |
| Smokes (names from `node tools/smoke/run.mjs --list`) | `lab-lesson`, `share`, `handout`, `exports`, `refresh`, `cold-start`, `live-quiz`, `studio-room`, `studio-room-truefalse`, `studio-room-type`, `rehearse`, `presenter-controls`, `desk-ink`, `room-output`, `demo-deck`, `design-foundations` | Present, share, handout, the room, the desk and Rehearse in a real browser |
| The CI set | `npm run smoke:ci` | Runs `campaign-chrome, chrome-region, demo-deck, desk-overlay, exports, fit-check, handout, lab-lesson, live-quiz, refresh, review-tool, share, slide-review, type-scale` |

Per step:

| Step | Cheapest proof |
|---|---|
| 1 | `node tools/smoke/run.mjs share`; `node --test tests/share.test.js` |
| 2 | `npm test`; `node tools/smoke/run.mjs demo-deck design-foundations`; the `SF.Custom` grep above |
| 3 | `npm --prefix lab test` (a new test beside `lab/tests/show-presenter.test.ts`) and `npm --prefix lab run typecheck` |
| 4 | Same, plus `lab/tests/live-*.test.ts` unchanged |
| 5, 6 | `node --test tests/lab-engine-default.test.js`, then by hand: flag on, Present a pure lesson, a Week 5 lesson (must stay classic) and `layout-bank` (must stay classic) |
| 8 | `npm run smoke:ci` and the owner's manual run of `docs/games/m7-acceptance.md` |
| 9, 10 | `node tools/smoke/run.mjs handout exports`; `node --test tests/print.test.js tests/lab-handout.test.js` |

## Where this leaves the plan

- The lab has the four games, feedback, Teacher Presenter, notes elsewhere, black and white and the overview. It lacks Draw, Rehearse, native PDF and Share, solo play and reload resume.
- The deletable-now set is small and mostly dead code: about 1,200 lines and one script tag.
- The large deletions (about 5,200 lines of renderers, then about 37,000 more) each wait on a named port.
- The first useful M15 commit with user-visible value is the guarded Present switch behind a flag (steps 3 to 6), after Draw (step 7).
