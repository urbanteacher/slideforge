# Player usage inventory (M0.1)

12 October 2026.

## What this is

This is the M0.1 output of [lab-engine-plan.md](../lab-engine-plan.md). It lists every member of `SF.Player` that the live host (`js/live.js`) uses, how often, and where. Each member is given a class (navigation, room state, presenter/rail, game drawing, dead) and a home in the lab: the player contract (M3), a registry slot (M4), the live host (M7), the presenter (M11), or nowhere. A second table does the same for the other room files. The last section marks which parts of `js/player.js` and `presenter.html` serve games, activities and the room only, and go at M14, and which also serve lessons and stay until M15. Every count comes from a grep, given with each table. Nothing here was run in a browser.

## Changed since the plan

- **The count holds: 64 members.** The plan said 64. The grep below finds 64 distinct members, used 308 times on 192 lines of `js/live.js`. 119 of those uses are calls.
- **No member is dead.** Every one of the 64 is defined and is read somewhere. What is dead is guarding. 40 places in `js/live.js` check that a member exists before using it on the same line (`if (SF.Player.syncPresenter) SF.Player.syncPresenter()`, `SF.Player.wallSlide ? SF.Player.wallSlide() : …`). 39 of them check a function that `js/player.js` or `src/presenter/window.js` always defines; the other checks `_current`, which can really be null. A few more checks span two lines (`definitionPhase` at 2436, 2463, 2777, 3125). The class *dead/unused* is therefore empty.
- **`SF.Player` is two files now, not one.** `src/presenter/window.js` (built into `js/model.js`) hangs `openPresenter`, `hasPresenter`, `syncPresenter`, `tellPresenter` and `quickPoll` on the same object (src/presenter/window.js:42, 157, 182, 434, 448). The presenter's half of the split below includes it.
- **`presenter.html` does not touch `SF.Player`.** It loads no `js/player.js`. It talks to the wall by `sf-presenter-cmd` messages, which src/presenter/window.js:382 (`handlePresenterCommand`) turns into player calls. So its usage is by message, not by member.
- **The classic studios are gone** (`058d1ae`, 26 Sep 2026). `js/editor.js`, `js/games.js`, `js/activities.js` and `js/lesson-strip.js` no longer use the player. `js/lab-engine.js` and `js/lab-stage.js` do instead, and they are in the second table.
- **The lab's own Present is gone** (`lab/src/ui/Present.tsx`, 12 Oct 2026). M3 names its YouTube iframe as the precedent for the game stage. That file no longer exists.
- **The lab player already has part of M3.** `lab/src/engine/player.ts` has `next()`, `prev()`, `goto()`, `build()`, `settle()`, `state()` (index and step) and `setInset()` (room for the rail). It does not yet have typed events, a game stage or a presenter hook.

## How it was counted

Members and their use counts:

```sh
grep -oE "SF\.Player\.[A-Za-z_\$][A-Za-z0-9_\$]*" js/live.js | sort | uniq -c | sort -rn
```

For each member `m`, the lines and the calls:

```sh
grep -nE "SF\.Player\.$m\b" js/live.js | cut -d: -f1          # lines
grep -oE "SF\.Player\.$m\s*\(" js/live.js | wc -l              # calls
```

`js/live.js` has no alias for the player (no `var P = SF.Player`), so these greps see every use. "Uses" counts each mention, so `a && a()` is two. "Lines" lists each line once. "Calls" counts a member followed by `(`.

Where a member is defined: `grep -nE "Player\.$m\s*=" js/player.js src/presenter/window.js`.

## 1. `SF.Player` in `js/live.js`

64 members. 11 navigation, 7 room state, 19 presenter/rail, 27 game drawing, 0 dead. Homes: 11 in M3, 20 in M4, 7 in M7, 19 in M11, 7 nowhere.

How the classes were drawn:

- **Navigation:** where the show is and how it moves. The lab player answers these.
- **Room state:** facts about the room that live.js writes onto the player so another part (the desk, the player's own Next) can read them. The live host should own them.
- **Presenter/rail:** the desk, the HUD's room buttons, the rail and the full-screen room view.
- **Game drawing:** painting a question, its tally or its reveal on the wall. One style's own drawing goes to its registry slot (M4). Drawing that belongs to the room, not a style (leaderboard, race, boss battle), goes to M11.

| Member | Uses | Calls | Lines in `js/live.js` | Class | Lab home | What it does, and notes |
|---|---|---|---|---|---|---|
| `deck` | 59 | 0 | 66, 74, 326, 362, 367, 376, 385, 395, 505, 557, 592, 767, 1149, 1180, 1181, 1246, 1288, 1808, 1827, 1916, 1964, 1983, 2238, 2433, 2703, 2831, 2892, 2915, 3009, 3067, 3195, 3307, 3337 | Navigation | M3 | The run deck on the wall. Read on almost every room message to find the current slide (`deck.slides[idx]`). The lab's `DeckPlayer.deck` already exists. |
| `idx` | 31 | 0 | 66, 74, 362, 367, 376, 385, 395, 505, 557, 592, 767, 787, 1149, 1181, 1184, 1246, 1288, 1808, 1983, 2238, 2433, 2703, 2831, 2867, 2892, 2915, 3009, 3067, 3195, 3307, 3337 | Navigation | M3 | The slide index. Always read with `deck`. `DeckPlayer.state().index` already exists. |
| `on` | 16 | 16 | 2227, 2228, 2233, 2244, 2253, 2254, 2255, 2256, 2257, 2258, 2259, 2260, 2261, 2890, 2913, 2936 | Navigation | M3 | 16 subscriptions: `slide` (x2), `answer`, `timeup`, `definitionAsk`, `close`, `step`, `stage`, and eight HUD buttons that are really room commands (`joinToggle`, `focusToggle`, `sidebarShow`, `qaCommand`, `reactionsToggle`, `blankPhonesToggle`, `blankPhonesSoon`, `floorCycle`). The first group is M3's typed events; the HUD group is M7/M11 commands. |
| `wallSlide` | 16 | 8 | 2237, 2432, 2830, 2892, 2915, 3009, 3067, 3336 | Navigation | M3 | The slide actually on the wall, which is a desk-launched game or activity when one is running. Always guarded with a fall-back to `deck.slides[idx]`. |
| `open` | 7 | 0 | 74, 75, 144, 156, 174, 326, 1180 | Navigation | M3 | Is a show running. Becomes `presentstart` / `presentend` and a read-only flag. |
| `gate` | 4 | 0 | 1096, 1148, 2324, 3426 | Navigation | M3 | A function live.js hangs on the player so Next is held while a question still needs its reveal (set 1148, 2324; cleared 1096, 3426; read at player.js:2756, 2787). In the lab this is the step hook: `next()` asks the host first. |
| `goTo` | 3 | 3 | 787, 1184, 1964 | Navigation | M3 | Redraws the current slide (`goTo(idx, 0)`, 787, 1184) or skips past a game (1964). `DeckPlayer.goto()` already exists. |
| `emit` | 2 | 2 | 729, 3270 | Navigation | M3 | Emits `spokenVerdict` (729) and `roundReveal` (3270) for the rest of the page to hear. |
| `revealStep` | 2 | 0 | 2875, 2880 | Navigation | M3 | How many builds are shown, read for the phone's follow-along excerpt (2875, 2880). Written by js/teaching.js:30. The lab's `step`. |
| `wallPos` | 2 | 1 | 2867 | Navigation | M3 | Position and total for the wall, counting a spontaneous session's own slides (2867). |
| `start` | 1 | 1 | 2325 | Navigation | M7 | Starts the show when the room begins (2325). The live host starts the lab's show. |
| `spontaneous` | 5 | 0 | 1907, 2519, 2526 | Room state | M7 | A game or activity launched from the desk, shown without changing the lesson (1907, 2519, 2526). Belongs to the live host's room state; the presenter starts it (M11). |
| `stage` | 5 | 0 | 559, 2887 | Room state | M3 | The activity stage now running, read to know whether a note stage is open (559) and sent with follow-along (2887). Written by js/stages.js:120. Lab: steps (M3) driven by the activity layer (M10). |
| `answers` | 2 | 0 | 3368 | Room state | M7 | Marks a revealed question answered (3368) so the player does not mark it again. Room state in the live host. |
| `qa` | 2 | 0 | 974, 1307 | Room state | M7 | The Q&A queue, written (974, 1307) so the presenter sync can send it (src/presenter/window.js:297). |
| `confidence` | 1 | 0 | 1235 | Room state | M7 | The confidence split, written (1235) for the presenter sync (src/presenter/window.js:301). |
| `pace` | 1 | 0 | 1300 | Room state | M7 | The pace signal, written (1300) for the presenter sync (src/presenter/window.js:300). |
| `waiting` | 1 | 0 | 1195 | Room state | M7 | How many phones are still to answer, written (1195) for the presenter sync (src/presenter/window.js:311). |
| `syncPresenter` | 27 | 18 | 638, 711, 754, 1236, 1292, 1296, 1302, 1310, 1319, 1326, 2326, 2366, 2384, 2688, 2705, 3033, 3043, 3412 | Presenter/rail | M11 | Push wall state to the desk. 18 calls; 9 of them guarded with `if (SF.Player.syncPresenter)` though it always exists. Defined in src/presenter/window.js:434. |
| `syncHudRoomButtons` | 17 | 9 | 1151, 1473, 1594, 1601, 1616, 1626, 1647, 2300, 2564 | Presenter/rail | M11 | Repaints the HUD's room buttons after a room change. 9 calls, 8 guarded. |
| `closeFocus` | 5 | 5 | 1593, 1664, 2584, 2699, 2716 | Presenter/rail | M11 | Close the full-screen room view (5 calls). |
| `openPresenter` | 5 | 4 | 144, 156, 2320, 2934 | Presenter/rail | M11 | Open the desk, on a named panel (`roster` 144, 156; `mark` 2934) or on Begin (2320). src/presenter/window.js:157. |
| `showFeedbackFocus` | 4 | 4 | 1600, 2562, 2713, 3482 | Presenter/rail | M11 | Feedback full screen (4 calls). Kinds are M9. |
| `_railWanted` | 3 | 0 | 1418, 2291, 2558 | Presenter/rail | nowhere | Private flag: the host hid the rail with S (read 1418, 2558; set 2291). Internal state of the new rail, not part of any contract. |
| `disableRail` | 3 | 3 | 608, 1420, 3102 | Presenter/rail | M11 | Takes the rail down (608, 1420, 3102). The lab already makes room for it (`DeckPlayer.setInset`). |
| `hasPresenter` | 2 | 1 | 2929 | Presenter/rail | M11 | Is the desk open (2929). src/presenter/window.js:42. |
| `railNote` | 2 | 2 | 1374, 1377 | Presenter/rail | M11 | A line in the rail ("3 more joined", 1374, 1377). |
| `_focus` | 1 | 0 | 1664 | Presenter/rail | nowhere | Private: is the full-screen view up (1664). Internal. |
| `_railChosen` | 1 | 0 | 1419 | Presenter/rail | nowhere | Private: the teacher chose the rail by hand (1419). Also read by js/demo.js:70. Internal. |
| `_railMode` | 1 | 0 | 1420 | Presenter/rail | nowhere | Private: which rail is up (1420). Internal. |
| `clearReactions` | 1 | 1 | 2408 | Presenter/rail | M11 | Clears them when reactions are switched off (2408). |
| `setFeedback` | 1 | 1 | 2563 | Presenter/rail | M11 | Paints a poll, cloud or scale in the rail (2563). The kinds themselves are M9. |
| `setPaceCue` | 1 | 1 | 1349 | Presenter/rail | M11 | The pace cue on the wall (1349). |
| `setQACue` | 1 | 1 | 1348 | Presenter/rail | M11 | The Q&A count on the wall's cue bar (1348). |
| `setScoreboard` | 1 | 1 | 1455 | Presenter/rail | M11 | Paints the scores rail (1455). |
| `showQuestionCard` | 1 | 1 | 1668 | Presenter/rail | M11 | A learner's question pinned on the wall (1668). |
| `showReaction` | 1 | 1 | 1291 | Presenter/rail | M11 | Floats a reaction on the wall (1291). |
| `_current` | 11 | 0 | 645, 1183, 1982, 2795, 2815, 2832, 2902, 3030, 3369, 3370 | Game drawing | nowhere | The DOM node of the slide on the wall. live.js adds classes and paints reveals straight onto it (645, 1982, 2795, 2815, 2832, 2902, 3030, 3369, 3370) and nulls it to force a redraw (1183). Lab game walls own their own DOM (hard rule 4), so nothing outside reaches in. |
| `definitionPhase` | 8 | 4 | 2436, 2437, 2463, 2464, 2777, 2778, 3125, 3126 | Game drawing | M4 | Definition challenge: reading or asking (2437, 2464, 2778, 3126). Also read by js/lab-stage.js:51. |
| `chainCommand` | 4 | 2 | 403, 3083 | Game drawing | M4 | Concept chain: `pending` (403), `clear` (3083). |
| `releaseTally` | 4 | 2 | 3031, 3361 | Game drawing | M4 | Shows the held tally at reveal (3031, 3361). |
| `setShowdown` | 4 | 2 | 1229, 3363, 3364 | Game drawing | M4 | The showdown panel, live and at reveal (1229, 3364). |
| `tryAcceptChain` | 4 | 2 | 770, 777 | Game drawing | M4 | Concept chain: does this link hold (770, 777). |
| `showRaceTrack` | 3 | 3 | 1609, 1781, 3150 | Game drawing | M11 | The race mechanic's track (1609, 1781, 3150). Cross-cutting (rounds, race). |
| `chainBranches` | 2 | 1 | 3345 | Game drawing | M4 | Concept chain: how many branches are right (3345). |
| `lanesProvider` | 2 | 0 | 2310, 3427 | Game drawing | M11 | Race lanes, installed by live.js (2310) and cleared (3427); read at player.js:700, 724, 785. |
| `paintChain` | 2 | 1 | 751 | Game drawing | M4 | Concept chain: repaint the links (751). |
| `showBossBar` | 2 | 1 | 1884, 1885 | Game drawing | M11 | The boss battle's bar (1885). Cross-cutting (boss battle). |
| `showFillReveal` | 2 | 1 | 3358 | Game drawing | M4 | Reveal for `fill` input (3358). |
| `showLeaderboard` | 2 | 2 | 1625, 3164 | Game drawing | M11 | Standings and final scores (1625, 3164). Cross-cutting: leaderboards belong to the room, not one style. |
| `showOrderReveal` | 2 | 1 | 3399 | Game drawing | M4 | Reveal for `order` input (3399). |
| `showPlacedValues` | 2 | 2 | 1252, 3357 | Game drawing | M4 | Reveal for `number` input (1252, 3357). |
| `showSortReveal` | 2 | 1 | 3359 | Game drawing | M4 | Reveal for `sort` input (3359). |
| `showStudyCards` | 2 | 1 | 2208, 2209 | Game drawing | M4 | Study cards' wall (2209). |
| `showTypedAnswers` | 2 | 2 | 1251, 3356 | Game drawing | M4 | Reveal for `text` input (1251, 3356). |
| `showWordReveal` | 2 | 1 | 2183, 2184 | Game drawing | M4 | A word game's reveal (2184). |
| `chainLinks` | 1 | 0 | 506 | Game drawing | M4 | Concept chain: the links made, sent to the desk (506). |
| `chainPending` | 1 | 0 | 2241 | Game drawing | M4 | Concept chain: cleared on time up (2241). |
| `definitionCommand` | 1 | 1 | 2469 | Game drawing | M4 | Moves Definition challenge to its ask (2469). |
| `flattenOverlay` | 1 | 1 | 3401 | Game drawing | nowhere | Quiz-slide layout helper on the revealed node (3401). The lab lays out its own walls. |
| `openTally` | 1 | 1 | 3405 | Game drawing | M4 | Opens the tally on the revealed node (3405). |
| `scheduleFit` | 1 | 1 | 3403 | Game drawing | nowhere | Quiz-slide fit helper (3403). As above. |
| `setTally` | 1 | 1 | 1226 | Game drawing | M4 | Live answer counts on the question (1226). The style's wall component. |
| `stopMusic` | 1 | 1 | 3408 | Game drawing | M4 | Stops a game's music bed at reveal (3408). |

### What the table says

- **The live host leans on two members.** `deck` and `idx` are 90 of the 308 uses, nearly always as `SF.Player.deck && SF.Player.deck.slides[SF.Player.idx]` ("the slide on the wall"). In the lab that is one read of the player's state, or one event payload. M3 should give the current slide directly.
- **The desk is told by hand.** `syncPresenter` is called 18 times after a room change. M3's presenter hook should push state on change instead.
- **live.js paints the wall itself.** `_current` is the slide's DOM node, and live.js adds classes and reveal markup to it at 10 places. Hard rule 4 puts game walls in their own components, so this has no lab home.
- **Eight HUD buttons are room commands in disguise.** They arrive as player events (`joinToggle`, `focusToggle`, `sidebarShow`, `qaCommand`, `reactionsToggle`, `blankPhonesToggle`, `blankPhonesSoon`, `floorCycle`; js/live.js:2254–2261) but nothing about them is the player's. They belong to the live host's commands (M7) and the presenter (M11).
- **Seven members are written by live.js for someone else to read.** `qa`, `pace`, `confidence` and `waiting` exist only so `syncPresenter` can send them (src/presenter/window.js:297–311). `gate`, `answers` and `lanesProvider` are read by the player's own Next and race code. In the lab they belong in the live host's room store (M7), read by the presenter and the registry.

## 2. `SF.Player` in the other room files

These files reach the player too. Counted per file with the alias each one uses:

```sh
grep -noE "(SF\.Player|\bplayer)\.[A-Za-z_\$][A-Za-z0-9_\$]*" js/live-activities.js   # var player = SF.Player (170)
grep -noE "SF\.Player\.[A-Za-z_\$][A-Za-z0-9_\$]*" js/lab-stage.js js/lab-engine.js js/demo.js
grep -noE "\bP\.[A-Za-z_\$][A-Za-z0-9_\$]*" js/teaching.js js/rounds.js js/stages.js js/lab-stage.js   # var P = SF.Player, or step(P, dir)
grep -noE "\bplayer\.[A-Za-z_\$][A-Za-z0-9_\$]*" js/rounds.js                                     # step(player, dir), 178
grep -c "SF\.Player" presenter.html js/manual.js                                                   # 0 and 0
```

`presenter.html` and `js/manual.js` use no player member. `js/demo.js` uses one.

| File | Member | Uses | Lines | Class | Lab home |
|---|---|---|---|---|---|
| `js/live-activities.js` | `started` | 4 | 16, 17, 170, 175 | Room state | M7 (a show's identity, to tell one run from the next) |
| | `deck` | 2 | 170, 175 | Navigation | M3 |
| | `idx` | 2 | 200, 211 | Navigation | M3 |
| | `open` | 2 | 171, 175 | Navigation | M3 |
| | `spontaneous` | 2 | 12, 165 | Room state | M7 |
| | `openSpontaneous` | 2 | 198, 205 | Presenter/rail | M11 (a desk-launched activity on the wall) |
| | `endSpontaneous` | 1 | 166 | Presenter/rail | M11 |
| | `emit` | 1 | 225 (`joinToggle`) | Navigation | M3 events; the command itself is M7 |
| | `syncPresenter` | 1 | 226 | Presenter/rail | M11 |
| `js/lab-stage.js` | `on` | 10 | 417, 418 (`slide`); 419, 432 (`close`); 426 (`answer`); 427 (`timeup`); 428 (`definitionAsk`); 433, 440 (`open`); 416 (exists) | Navigation | M3 events. The whole file goes when the lab has its own show. |
| | `deck` | 9 | 61, 115, 270, 271, 319 | Navigation | M3 |
| | `open` | 4 | 220, 311, 386, 436 | Navigation | M3 |
| | `idx` | 3 | 61, 319, 323 | Navigation | M3 |
| | `answers` | 2 | 44 | Room state | M7 (has this question been revealed) |
| | `definitionPhase` | 2 | 51 | Game drawing | M4 |
| | `wallSlide` | 2 | 61 | Navigation | M3 |
| | `next`, `prev` | 1 each | 123 (the lab player's host buttons call back into SlideForge's) | Navigation | M3 |
| | `P.deck`, `P.idx` | 1 each | 399 (`step(P, dir)`, the Next hook js/player.js:2732 calls) | Navigation | M3 (steps) |
| `js/lab-engine.js` | `start` | 3 | 600, 611, 641 | Navigation | M7 (Host live, Rehearse), M3 (Present) |
| | `on` | 3 | 814, 815 (`slide`), 824 (`close`) | Navigation | M3 events |
| | `syncPresenter` | 2 | 612 | Presenter/rail | M11 |
| | `tellPresenter` | 2 | 510 (a progress line on the desk while pictures are drawn) | Presenter/rail | nowhere: it exists only because of the bridge's pictures |
| | `openPresenter` | 1 | 608 | Presenter/rail | M11 |
| | `open` | 1 | 611 | Navigation | M3 |
| | `deck`, `idx` | 1 each | 816, 819 | Navigation | M3 |
| `js/teaching.js` | `syncPresenter` | 5 | 30, 156, 225 | Presenter/rail | M11 |
| | `on` | 2 | 176 (`slide`), 206 (`close`) | Navigation | M3 |
| | `showHud` | 2 | 145 | Presenter/rail | M11 (the HUD) |
| | `revealStep` | 1 | 30 (written) | Navigation | M3 (step) |
| | `emit` | 1 | 30 (`step`) | Navigation | M3 (`stepchange`) |
| `js/rounds.js` | `on` | 5 | 100 (`slide`), 149 (`roundReveal`), 164 (`spokenVerdict`), 165 (`answer`), 171 (`close`) | Navigation | M3 events |
| | `_currentSlide` | 4 (+1) | 96, 129, 145, 157 (+ `player._currentSlide` 180) | Navigation | M3 (current slide) |
| | `emit` | 3 | 96 (`timeup`), 97, 132 | Navigation | M3 |
| | `next` | 2 | 146, 158 | Navigation | M3 |
| | `_current` | 1 | 73 | Game drawing | nowhere |
| | `player.spontaneous`, `.deck`, `.idx`, `.goTo` | 1–2 each | 179, 182, 183, 186, 187 (`step(player, dir)`, called at js/player.js:2738) | Navigation | M3 (steps); rounds themselves are M11 |
| `js/stages.js` | `stage` | 4 | 120, 134, 162, 167 (written) | Room state | M3 steps, driven by M10 |
| | `on` | 3 | 190 (`slide`), 191 (`step`), 192 (`close`) | Navigation | M3 |
| | `_currentSlide` | 2 | 175, 222 | Navigation | M3 |
| | `emit` | 2 | 134, 168 (`stage`) | Navigation | M3 |
| | `syncPresenter` | 2 | 135 | Presenter/rail | M11 |
| | `_current` | 1 | 176 | Game drawing | nowhere |
| | `revealStep` | 1 | 178 | Navigation | M3 |
| `js/demo.js` | `start` | 1 | 556 | Navigation | M7 (rehearsal class) |

Also found, outside the list the plan gives:

| File | Members (line) |
|---|---|
| `js/lesson-runtime.js` | `forgetRun` (144), `restoreRun` (145), `open` and `deck` (150): the page's start puts a running show back and walks a held room back in. |
| `js/shell.js` | `open` (1968): the shell's keys stand down while a show runs. |
| `js/quick-poll.js` | `on` (13, 126), `deck` and `idx` (59), `quickPoll` (109). |
| `js/render.js` | `open`, `deck` (187). |
| `src/render/quiz.js` | `fitQuizSlide` (885, 886). |
| `src/render/live.js` | `control` (1257, 1258). |
| `view.html` | `start` (141), `idx` (198, 199), `goTo` (199), `next` and `revealStep` (207). |

## 3. What goes at M14 and what stays until M15

After M14, `js/live.js` and the classic game and activity code are deleted, and rooms run on the lab's live host. The classic player then only shows lessons, with no room. So anything in `js/player.js` or `presenter.html` that serves a game, an activity **or the room** has no caller after M14. Only what plays a lesson stays, until M15 removes the player itself.

Until M7, M11 and M12, lab lessons are taught through this player too (the bridge and the live stage, `js/lab-engine.js` and `js/lab-stage.js`). The "lessons" rows are what those need.

### `js/player.js` (3,218 lines)

Ranges follow the file's own section markers (`/* ---- name */`).

| Lines | Section | Serves | Goes |
|---|---|---|---|
| 12–66 | State and the saved run (`saveRun`, `forgetRun`, `restoreRun`) | Lessons. The fields `answers`, `qa`, `lanesProvider`, `spontaneous`, `_liveTally`, `_rail`, `_solo` are games and room. | M15; those fields at M14 |
| 67–84 | Events (`on`, `off`, `emit`) | Lessons | M15 |
| 85–247 | DOM, HUD, `Player.control`, `showHud` | Lessons. The HUD's room controls in `controlEnabled` and `Player.control` (focus, join, Q&A, reactions, teacher entry: 158–230) are room. | M15; room controls at M14 |
| 248–317 | Overview | Lessons | M15 |
| 318–438 | Quiz maths, `score`, `wallSlide`, `wallPos`, spontaneous sessions (`openSpontaneous`, `endSpontaneous`) | Games and activities | M14 |
| 439–506 | Morph between slides | Lessons | M15 |
| 507–697 | `renderCurrent` | Both. Its quiz, race and boss branches (live and revealed flags at 552–557) are games. | M15; game branches at M14 |
| 698–807 | Race field, boss fight (`raceField`, `bossFight`, `bossCommand`, `raceStep`) | Games | M14 |
| 808–1100 | Quiz slides: `wireQuiz`, `paintAnswer`, `fitQuizSlide`, `scheduleFit`, `flattenOverlay` | Games | M14 |
| 1101–1222 | Media: video and the music bed | Lessons (video). The music bed is a game's (`musicTrack`, 1118). | M15; music at M14 |
| 1223–1406 | `answer`, Concept chain, `timeUp`, Definition challenge, `resetScores` | Games | M14 |
| 1407–1489 | Countdown: `startTimer` (a question's clock) and `startSlideTimer` (a timed slide) | `startTimer` games; `startSlideTimer` lessons | M14 / M15 |
| 1490–1940 | Score rail, room sidebar, `syncHudRoomButtons`, authored feedback on its own (`syncAuthoredFeedback`, `toggleSoloFeedback`, `updateSolo`) | Room and feedback | M14 |
| 1941–2094 | Overlay scaling, cue bar, Q&A cue, reactions, pace cue | Room | M14 |
| 2095–2675 | Live extras: tallies, every reveal, showdown, verdicts, game controls, leaderboard, focus overlays, question card, race track, boss bar, word reveal, study cards | Games and room | M14 |
| 2676–2900 | Navigation: `goTo`, `next`, `prev`, freeze, blank, full screen | Lessons. Inside `next` and `prev`, the `gate`, quiz and spontaneous branches (2740–2790) and the `SF.Rounds` hook (2738) are games. | M15; those branches at M14 |
| 2901–3056 | Speaker notes on another device | Lessons | M15 |
| 3057–3180 | `start`, `close` | Lessons. The resets of chain, rail and focus state (3069, 3091–3100) are games and room. | M15 |
| 3181–3198 | The presenter window (`SF.createPresenterWindow`) | Both: see `presenter.html` below | M15 |
| 3199–3218 | Toast, exports | Lessons. `fitInlineWhy`, `scheduleFit`, `fitQuizSlide`, `openTally`, `flattenOverlay` (3211–3215) are games. | M15; those five at M14 |

Rough share: about 1,900 of the 3,218 lines (318–438, 698–807, 808–1100, 1223–1406, 1490–2094, 2095–2675) are games, activities or the room, and go at M14, before the branches inside the sections that stay.

### `src/presenter/window.js` (748 lines, built into `js/model.js`)

The wall's side of the desk. `syncPresenter` (235) builds the state the desk draws; `handlePresenterCommand` (382) runs what the desk asks. Lessons need the window itself (opening and placing it, 100–200), the slide, notes and next slide in the state, and the `prev`, `next`, `goto`, blank, freeze, ink and full-screen commands. The room's fields in the state (`qa`, `pace`, `confidence`, `waiting`, `answers`, `chainPending`, 290–311; `teacherUrl`, 245), and the `qa`, `ask`, `quickPoll`, `quizGen`, `activity`, `moment` and `gameControl` commands (src/presenter/window.js:399–412), go at M14. `explore` (402) is a lesson slide's, and stays.

### `presenter.html` (1,743 lines)

| Lines | Part | Serves | Goes |
|---|---|---|---|
| 23–315 | Styles | Both | Split with the parts below |
| 323–340 | Waiting card | Lessons | M15 |
| 341–375 | Bar: clock, wall, position; "On screen now" and the strip | Lessons | M15 |
| 365–375 | Tabs: Notes (`slides`) is lessons; Quick, Activities, Pulse, Answers (`mark`), Class (`roster`), Insights (`questions`), Tools, Q&A are room, games or activities | Mixed | Notes tab M15; the rest M14 |
| 376–377 | Room cues | Room | M14 |
| 378–442 | Quick pane: task, polls, AI quiz draft, pause and extend | Room and games | M14 |
| 443–473 | Activities pane | Activities | M14 |
| 474–477 | Pulse pane: reactions, slide responses | Room | M14 |
| 478–492 | Slide pane: next slide and notes | Lessons. The room's ask card inside it (`deskAsk`, 481–487) is room. | M15; `deskAsk` at M14 |
| 493–497 | Insight views and the teacher workspace frame (manual.html's views) | Room and games | M14 |
| 498–504 | Q&A pane | Room | M14 |
| 505–517 | Foot, first row: Previous, Next, +30s for a stage, Blank, White, Freeze, Who | Lessons; +30s is activities | M15; +30s at M14 |
| 518–532 | Room tools: PIN, away and needs flags, Join QR, Share, Ink, Room view, Full screen | Share, Ink and Full screen are lessons; the rest room | Mixed |
| 533–541 | Ink tools | Lessons | M15 |
| 542–560 | Room tools, second row: poll, leaderboard, timer, break, reactions, blank phones, floor, reset scores; shortcuts, reset time, End show | Room and games; shortcuts, reset time and End show are lessons | Mixed |
| 563–590 | Scripts: `js/presenter-live.js`, `js/live-activities.js`, `js/presenter-activities.js` | Room and activities | M14 |
| 604–773 | Toast, the send bus (`deskSend`, `cmd`), `paintAsk`, share from the desk | Bus and share are lessons; `paintAsk` is room | Mixed |
| 774–941 | Ink | Lessons | M15 |
| 942–999 | Q&A commands, panel switching, the Next label | Q&A room; switching both | Mixed |
| 1000–1192 | `roomViewIn`, `syncRoomTools` | Room | M14 |
| 1193–1308 | `drawCues`, `drawQA` | Room | M14 |
| 1309–1418 | `onWallState`: what the wall sent | Both | M15 |
| 1419–1485 | `into` (a slide into a box); `quizNum`, `marks` | `into` lessons; `quizNum` and `marks` games | M15 / M14 |
| 1486–1562 | `paintWallOverlay`, `paintWallRail`, `paintWallChrome` | Overlay and rail are games and room; chrome is both | Mixed |
| 1563–1651 | `draw`, `drawStrip` | Lessons | M15 |
| 1652–1743 | Helpers, the pacing clock, the start | Lessons | M15 |

The M11 presenter window replaces everything marked M14 here. What is marked M15 is the lesson desk, which lab lessons still use through the bridge until M11.
