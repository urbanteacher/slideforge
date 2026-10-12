# Shell coupling inventory (M0.7)

12 October 2026.

## What this is

This is the M0.7 output of [lab-engine-plan.md](../lab-engine-plan.md). It sets out the engine interface the shell (`js/shell.js`) expects, what it expects from each part, and how the lab engine (`js/lab-engine.js`) meets each one today. It then lists every place the shell, the Library (`js/studio.js`) and the room's runtime (`js/lesson-runtime.js`) reach past that interface, with call sites, and brings the plan's known-couplings table up to date. The last section lists the shell features that sit behind a **Missing** row in [studio-feature-map.md](../studio-feature-map.md). Everything here is from reading the code at `f3c5bc6` plus the working tree; one claim was checked in Node and says so. Nothing was run in a browser.

## Changed since the plan

- **There is one engine, registered three times.** The classic studios (`js/editor.js`, `js/games.js`, `js/activities.js`, and `js/lesson-strip.js`) were deleted on 26 Sep 2026 (`058d1ae`). `js/lab-engine.js` registers `deck` (704), then `game` and `plan` as views of the same lesson (`studioView`, 709, 710, 835–847). The three share one `_dirty` flag (844). The workspace switch (index.html:76–80, `activate` in js/shell.js:511) now changes the lab's view (`setView('lesson' | 'quiz' | 'activities')`, js/lab-engine.js:628, 838), not the engine.
- **`SF.Editor` is gone from the shell.** No file outside `src/editor/customize.js` mentions it, and those three branches (682, 927, 964) can never run. `useLesson` and `findInDeck` have no callers. `openAiSmokeTest` survives as `SF.openAiSmokeTest` in js/lesson-runtime.js:121.
- **Host live goes through the interface.** The shell's Host live calls `active.hostLive()` (js/shell.js:1867–1880). The lab's `hostLive()` runs the bridge (js/lab-engine.js:588–590), not a "not available" message.
- **There is no classic Lesson engine to move the canvas code into.** The plan says to move `sizeCanvas`, `setZoom` and `installNotesStrip` into the classic engine. That engine is deleted, and the DOM they work on is hidden whenever a studio is on screen (css/studio.css:333–335). The code still runs, on hidden elements.
- **The shell now reaches into the lab by name.** Share, Export, the handout, practice notes, Import, History and Lecture setup all branch on `ws.lab` and call `SF.LabEngine.*` directly. These are new couplings, not in the plan's table.
- **`?classic=1` and `useClassic` are gone** (plan change log, 27 Sep). The "Where we are now" diagram and the bridge section still show `editor.js`, `games.js` and `activities.js`, and "The live stage" still says the lab's own Present remains in the stand-alone lab. `lab/src/ui/Present.tsx` was removed on 12 Oct.
- **The lab forwards five keys to the shell.** ⌘S, ⌘K, ⌘E, ⌘↵ and `?` typed inside the lab's frame are re-sent to SlideForge's page (lab/src/main.tsx:21–35). Without that, the shell's key handler (js/shell.js:1967) would never see them, because the lab is a frame.
- **The feature map's line numbers for `shell.js` are out of date** (for example, Lecture setup is at js/shell.js:1489, not 1425).

## 1. The engine interface

The shell's own comment (js/shell.js:8–28) lists the interface. The table below is what the shell actually reads, with every call site from:

```sh
grep -nE "(active|ws|deckWs|workspaces\.(deck|game)|workspaces\[k\])\.<field>\b" js/shell.js
```

| Field | What the shell expects | Shell call sites (js/shell.js) | How js/lab-engine.js does it |
|---|---|---|---|
| `key` | `'deck'`, `'game'` or `'plan'`. Picks body classes, labels, toasts and which File items show. | 508, 626, 631, 663, 682, 869, 890, 915, 919, 921, 1363, 1366, 1505, 1767, 1896–1903, 2002 | `'deck'` (617); `'game'` and `'plan'` for the two views (709, 710). |
| `railLabel`, `notesLabel`, `settingsLabel` | Text for the rail heading, the notes label and the Settings button. | 546, 548, 1907, 1910, 1921 | `'Slides'`, `'Speaker notes'`, `'Settings'` (620–622); the views set `railLabel` to Games or Activities. The rail and notes label are hidden under the lab, so two of the three land on hidden elements. |
| `doc()` | The open document, at once, with `id`, `title`, `libraryGroup`. The shell writes `libraryGroup` onto what it gets back (736). | 622, 659, 667, 683, 684, 689, 735, 811, 913, 916, 989, 1015, 1021, 1025, 1147, 1163, 1232, 1258, 1259, 1301, 1302, 1360, 1401, 1504, 1626, 1627, 1696, 1763, 1768, 1829, 1830 | A shallow copy of the lab's deck, or a placeholder before the lab is ready (133–136). The shell's write to `libraryGroup` lands on the copy, and `store.save` passes it on (150). |
| `setDoc(d)` | Adopt a document, now. The shell calls `draw()` straight after. | 816, 928, 1132, 1223, 1233, 1267, 1307, 1767, 1837, 1848 | `open(d)` (247–286): asynchronous. Takes a lab deck, a Library card, a shipped deck or a classic lesson (converted). Calls `SF.Shell.syncChrome()` itself when the deck is up (278). |
| `blank()` | A fresh, empty document. | 816, 1131, 1836, 1847 | The lab's blank deck, or the placeholder (627). |
| `store` | `{ list, get, save, remove }`, plus optional `sweepUnused`. `get` should return the document. `save` returns `false` when the write is refused. | list 815, 920, 1131, 1232; get 926, 1232; save 659, 1308, 1768, 1838, 1849; remove 813; sweepUnused 914 | 138–159. `list` is the lab's saved rows. `get` returns a stub (`{ id, title, labSaved: true }`), not the document; `setDoc` then opens it by id. `save` ignores its argument except `libraryGroup`, writes the Library card, flushes the lab, and returns `true` before the write lands; a failure is reported later through `SF.Shell.stored(false)` (152). `remove` is asynchronous. No `sweepUnused`. |
| `draw()` | Repaint the workspace. Also called on every window resize (1946) and after typing stops (1955). | 112, 552, 819, 931, 1136, 1236, 1271, 1311, 1770, 1841, 1852, 1946, 1955 | Shows the frame and sets the lab's view (628, 838). |
| `describe(d)` | One line for the Open list. | 922 | `n slides` (629–632). |
| `onTitle(v)` | The title field changed. | 1341 | `a.setTitle(v)` (633). |
| `onTheme(v)` | The theme changed. | none | A no-op (634). The shell never calls it; only the classic settings sheet did (src/editor/deck-settings.js:45). |
| `play()` | Present. | 1999 (⌘↵) | SlideForge's show, full screen, with the lab drawing live (638–642). The shell does not wire the Present buttons; the lab engine does (757–760). |
| `settings()` | Open the document's settings sheet. | 1802 | A toast pointing to the lab's left panel (643–645). |
| `fileSuffix` | Extension for File → Export → This presentation. | 1153 | `'.lesson.json'` (623). |
| `newDoc()` (optional) | New for a game ("a game picks its style first"). | 1834 | Not provided. File → New → Blank game falls back to `blank()` and `setDoc()` on the `game` view (1835–1842), which opens a new blank lesson in the Quiz studio view. |
| `flush()` (optional) | Commit edits in flight before the shell reads `doc()`. | 515, 734, 911, 993, 994, 1022, 1257, 1283, 1359, 1492, 1693, 1801, 1811, 1870, 1963 | `api.flush()` (646). It returns a promise the shell does not wait for. |
| `keydown(e)` (optional) | First refusal on a key the shell did not handle. | 2016 | A no-op (647). Undo is the lab's own, inside the frame. |
| `hostLive()` (optional) | Start a live room. | 1871, 1875 | The bridge: the lesson as a SlideForge show, into `SF.Live.host` (588–590). |
| `commands(query)` (optional) | The engine's entries for the palette. | 904 | Not provided, so the shell's palette has no lab commands (an M5 item still owed). |
| `cancelPendingSave()` (optional) | Stop a pending autosave before a delete. | 812 | Not provided. |
| `lab` | Not in the comment. A flag the shell reads to take the lab's own paths. | 1005, 1024, 1163, 1297, 1367, 1400, 1767 | `true` (619). |
| `_dirty` | Not in the comment. Set by the engine, read and cleared by the shell's Save. | 655, 661, 758, 817, 929, 1133, 1224, 1233, 1269, 1309, 1839, 1850 | Set on each edit (797); shared by the three views (844). |

`SF.Shell` members the lab engine calls back: `register` (704, 709, 710), `activate` (858), `current` (799, 804), `stored` (152), `syncChrome` (278, 799, 804, 905).

## 2. Where the shell reaches past the interface

55 call sites. "Classic" means SlideForge's own deck, game, store or renderer code (`src/model.js`, `js/model.js`, `js/render.js`, `js/print.js`, `js/share.js`, `js/lessons.js`, `js/live.js`, `js/player.js`). "Lab by name" means `SF.LabEngine.*` called directly instead of through the registered workspace.

### `js/shell.js`

| # | Lines | What | Reaches into |
|---|---|---|---|
| 1 | 82–104, 107–115 | `sizeCanvas`, `refitCanvas`: pin `#previewBox` to 16:9, refit a `.slide` with `SF.fit` | Classic canvas (hidden under the lab) |
| 2 | 117–131 | `setZoom`, `stepZoom` | Classic canvas |
| 3 | 138–152 | `setPanel`: toggles `#app.no-inspector` | Classic inspector (hidden) |
| 4 | 155–172, called 1928 | `installCanvasBar` | Classic canvas bar |
| 5 | 523–533 | `activate` clears `canvas-free` and re-sizes the canvas | Classic canvas |
| 6 | 1944–1957 | Resize and focus-out call `sizeCanvas()` and `active.draw()` | Classic canvas; for the lab every resize resets its view |
| 7 | 2007–2011 | ⌘\\ and ⌘⌥= / ⌘⌥− / ⌘⌥0 | Classic panel and zoom. The lab does not forward these keys. |
| 8 | 576–618, called 1888 | Notes strip: `SF.setNotes`, `SF.markNotes`, `SF.installNotesStrip` | Classic notes strip (hidden) |
| 9 | 309–339 | `themePicker`: draws each theme as a classic `.slide` with `SF.THEMES` and `SF.fit` | Classic renderer. Used by src/editor/deck-settings.js:44 |
| 10 | 641 | `syncChrome` calls `SF.Live.syncLobby` | Room (js/live.js:882) |
| 11 | 1001 | Share reads `SF.Live.active` | Room |
| 12 | 1968 | The key handler stands down while `SF.Player.open` | Classic player |
| 13 | 1005–1013 | Share: `SF.LabEngine.shareDeck()` (the bridge's lesson, pictures stepped down to fit 8 MB), then `SF.shareLessonDoc` | Lab by name; classic share (js/share.js, view.html) |
| 14 | 1015 | Share for a non-lab engine: `SF.shareLessonDoc(deckWs.doc())` | Classic share. No engine takes this path now. |
| 15 | 1019–1026 | `lessonDoc` (what the desk shares): `SF.LabEngine.lastShowDeck()` | Lab by name (the bridge) |
| 16 | 909–938, 915–921 | Open saved, in the `game` view: lists `SF.LessonBank.savedList(ws.doc())` (saved games), then opens the pick with `ws.store.get(id)` | Classic games (js/lessons.js:10796). The lab's `store.get` knows no game ids, so a pick ends in "no longer saved here" (read from the code, not run). |
| 17 | 1040–1076 | Export → Everything, into the app folder: `SF.Store.list()`, `SF.GameStore.list()` | Classic store. A lab lesson is written as its Library card: one title slide, not the lesson. |
| 18 | 1080–1145 | Import → From the app folder: clears and refills `SF.Store` and `SF.GameStore` through `normalizeDeck` / `normalizeGame` | Classic store and model |
| 19 | 1161–1173 | Practice notes: `SF.LabEngine.wordsDeck()`, then `SF.deckToMarkdown` | Lab by name; classic deck format |
| 20 | 1177–1190 | Backup: `SF.Docs.list`, `SF.Docs.bundle` | Both stores (js/docs.js reads the lab's too) |
| 21 | 1192–1243 | Restore a backup: `normalizeDeck`, `normalizeGame`, `SF.Store.list`, `SF.GameStore.list`, `SF.Docs.restore` | Classic store and model |
| 22 | 1255–1271 | Markdown import: `SF.markdownToDeck` makes a classic deck, handed to the lab's `setDoc`, which converts it | Classic model, through the converter |
| 23 | 1291–1311 | Import a file: a game file is normalised with `SF.normalizeGame` and handed to the `game` view's `setDoc`, which is the lab's `open()` | Classic game model into the lab |
| 24 | 1297 | Import a file: `ws.lab` skips `normalizeDeck` | Lab flag |
| 25 | 1363–1373 | Export menu: which items show depends on `active.key` and `SF.LabEngine.exportPptx` | Lab by name |
| 26 | 1400–1401 | PDF handout: `SF.LabEngine.printDeck()` (or `showDeck()`), into `SF.Print.open` | Lab by name; classic print |
| 27 | 1405–1417 | This slide, PowerPoint: `SF.LabEngine.saveSlide`, `SF.LabEngine.exportPptx` | Lab by name |
| 28 | 1503–1507 | Lecture setup: which built-in lesson is open, by matching `doc().title` against `SF.LESSONS` | Classic lesson bank |
| 29 | 1509–1515 | Lecture setup: counts `slideforge.decks.v1` in localStorage | Classic store's key, read directly |
| 30 | 1577 | Lecture setup: `SF.Reports.open` | Room reports |
| 31 | 1584 | Lecture setup: `SF.openAiSmokeTest` | js/lesson-runtime.js:121, built on the classic settings sheet |
| 32 | 1606–1610 | Lecture setup → Reload lesson: `SF.LabEngine.openKey` | Lab by name |
| 33 | 1632–1642 | Lecture setup → Clear everything: removes `slideforge.decks*`, `slideforge.games*` and other localStorage keys | Classic store's keys. The lab's IndexedDB lessons are not cleared. |
| 34 | 1680 | Folder chip: `SF.Studio.openLessons` | The Library (js/studio.js) |
| 35 | 1767 | History → Restore: `normalizeGame` when `active.key === 'game'`, the raw snapshot when `active.lab`, else `normalizeDeck` | Classic model. The `game` check comes first, so restoring in the Quiz studio view passes the lab deck through `normalizeGame`. Checked in Node: it keeps the slides and adds `kind: 'game'`, a default question and game settings. |
| 36 | 1808–1856 | New → Blank game: `workspaces.game.newDoc`, else `blank()` on the `game` view | Assumes a classic game engine at `game` |
| 37 | 2000–2004 | ⌘E: switch `deck` ↔ `game` | Assumes two engines |
| 38 | 1884 | Boot: `SF.startLessons` | js/lesson-runtime.js:137 (player and room) |
| 39 | 1887 | Boot: `SF.LabEngine.install()` | Lab by name. The engine is started by the shell, not self-registering. |

### `js/studio.js` (the Library)

| # | Lines | What | Reaches into |
|---|---|---|---|
| 40 | 10–12 | `makeLesson`: `SF.buildLesson`, `SF.makeDeck` | Classic lesson bank and model |
| 41 | 31–39 | Demo: `SF.LabEngine.openKey` | Lab by name |
| 42 | 49 | `SF.seedLibrary` | Classic store (js/lessons.js) |
| 43 | 80, 83 | `SF.LabEngine.currentId`, `SF.LabEngine.retitle` | Lab by name |
| 44 | 85–90 | Open: `SF.Store.get`, then `SF.LabEngine.openLesson` | Classic store; lab by name |
| 45 | 92–133 | Rename and move: `SF.Store.get` / `save` on the card | Classic store |
| 46 | 205–233 | Delete: `SF.Store.remove`, `SF.dismissLibrarySeed`, `SF.LabEngine.forget`, `hasCopy`, `openLesson` | Classic store; lab by name |
| 47 | 236–244 | List: `SF.Store.list`, hiding originals with `SF.LabEngine.hasCopy` | Classic store; lab by name |
| 48 | 334–335, 372–373 | `SF.LessonBank.folderChip`, `SF.LessonBank.deckFacts` | Classic games per folder (js/lessons.js) |

### `js/lesson-runtime.js`

| # | Lines | What | Reaches into |
|---|---|---|---|
| 49 | 26 | `SF.installCustom(SF)` | src/editor/customize.js, whose `SF.Editor` branches (682, 927, 964) are dead |
| 50 | 29–62 | `SF.createPresetGame`: `SF.Shell.current().doc()` (a lab deck) into `SF.LessonBank.stamp`, then `SF.GameStore.save`; classic `makeGame`, `makeQuestion`, `normalizeQuestion` | Classic game model and store, stamped with a lab deck |
| 51 | 81–117 | `SF.Activities.makeSlides`: `SF.createActivityFields`, `SF.makeSlide`, `SF.makeFeedback` | Classic slide model (read by the room and tools/lab-activities.mjs) |
| 52 | 121–132 | `SF.openAiSmokeTest`: `SF.createDeckSettings` with a stub editor, `SF.Shell.UI`, `SF.Shell.current` | Classic settings sheet (src/editor/deck-settings.js) |
| 53 | 137–157 | `SF.startLessons`: `SF.Player.forgetRun` / `restoreRun` / `open` / `deck`, `SF.Live.resumeHeldRoom` / `hasHeldRoom`, `SF.LabEngine.heldRoomDeck` | Classic player and room; lab by name |

### The other way: room code reaching into the shell

| # | Where | What |
|---|---|---|
| 54 | js/live.js:864–866 | The lobby warns when the open document is not the room's: `SF.Shell.current().doc().id` against `Live.deck.id`. It works because the bridge's lesson keeps the lab deck's id (js/lab-engine.js:478). |
| 55 | js/player.js:189 and src/presenter/window.js:416 | The wall's Share and the desk's share prep call `SF.Shell.shareLesson` and `SF.Shell.lessonDoc`. |

Count: 39 in the shell, 9 in the Library, 5 in the runtime, 2 the other way. Of the 55, 14 call `SF.LabEngine` by name, 8 work on hidden classic canvas or notes DOM, and 5 assume a classic game engine at `game`.

## 3. The plan's known couplings, as they are now

| Coupling in the plan | True now | Call sites | Fix, updated |
|---|---|---|---|
| `SF.Editor.install`, `useLesson` (LessonBank), `findInDeck`, `openAiSmokeTest` | `SF.Editor`, `useLesson` and `findInDeck` are gone. The AI smoke test is `SF.openAiSmokeTest`, still built on the classic settings sheet. | #31, #52; dead `SF.Editor` branches #49 | Give the smoke test a panel of its own, not the classic sheet. Delete the dead branches in src/editor/customize.js. |
| `SF.Store`, `SF.GameStore`, `normalizeDeck` / `normalizeGame` | Still there, and now beside a second store (the lab's IndexedDB) that two features miss. | #17, #18, #21, #23, #29, #33, #35, #44–#47, #50 | As planned: one library through `store`, each engine with its own normalizer. Until then, app-folder export (#17) and Clear everything (#33) should know about lab lessons. |
| `sizeCanvas`, `setZoom`, `installNotesStrip` | Still in the shell, now running on hidden DOM. There is no classic engine to move them into. | #1–#8 | Delete them, rather than move them. Keep `SF.Shell.sizeCanvas` only if something still calls it (nothing outside js/shell.js:2039 does). |
| `SF.Live` | Host live goes through `hostLive()`. Three reads of the room remain. | #10, #11, #12, #53, #54 | `syncLobby` becomes an event the live host listens to; the key handler asks "is a show running" through the engine or a shell event. |
| `markdownToDeck`, `LessonBank`, `shareLessonDoc` | Markdown makes a classic deck, which the lab converts. `LessonBank` is read by Open saved (game view), the Library and `createPresetGame`. Share sends the bridge's lesson to `view.html`. | #13, #16, #22, #48, #50 | Markdown can stay as it is while the converter exists (M13). `LessonBank` goes with `SF.GameStore` (M14). Share moves to the lab viewer (M5). |
| *(new)* The shell calls the lab by name | Share, practice notes, Export, the handout, Reload and boot branch on `ws.lab` and call `SF.LabEngine.*`. | #13, #15, #19, #24–#27, #32, #39, #41, #43, #44, #46, #47, #53 | Fold into the interface: `share()`, `exportItems()`, `printDeck()`, `wordsDeck()`, `openLesson()` on the registered workspace, and let the engine register itself. |
| *(new)* The shell assumes a classic game engine at `game` | Open saved quiz, Blank game, a game file on Import, Restore in the Quiz view, ⌘E. | #16, #23, #35, #36, #37 | Decide what each means for a lab view of one lesson. Restore (#35) and Open saved quiz (#16) look broken from the code. |
| *(new)* Classic renderers fed by the bridge | The handout, Share and practice notes render the bridge's SlideForge lesson. | #13, #19, #26 | Goes with the bridge (M5 viewer, M12 export). |

**Not a coupling, as the plan says:** `SF.History`. It snapshots `doc()` (js/shell.js:684, 738, 1259, 1302, 1627, 1698, 1763, 1830) and works for the lab, except for the restore branch in #35.

## 4. Shell features behind Missing rows in the feature map

| Feature map row | Shell code | What is true now |
|---|---|---|
| File → Lecture setup… (§1, Missing) | js/shell.js:1489–1647 | The shell's File menu shows it with the lab on screen, and Reload uses the lab (#32). The row looks out of date. Clear everything still misses lab lessons: it clears their Library cards but not the lessons in the lab's IndexedDB (#33). The saved count reads the classic store's key directly, which holds the cards (#29). |
| AI assistance status and smoke test (§6, Missing) | Lecture setup → `SF.openAiSmokeTest` (#31, #52) | Reachable through Lecture setup; not in the lab's settings. |
| Shortcut sheet ? (§5) and `?` (§7), Missing | `showShortcuts` (js/shell.js:825), `?` at 2013, forwarded from the lab (lab/src/main.tsx:27) | The key opens the shell's sheet. The sheet lists the classic editor's keys (index.html:312 says they are bound in js/editor.js), so its content is wrong for the lab. |
| ⌘E switch studio (§7, Missing) | js/shell.js:2000–2004, forwarded from the lab | Switches `deck` ↔ `game` only (#37). The row looks out of date. |
| ⌘⌥= / ⌘⌥− zoom (§7, Missing) | js/shell.js:2008–2011 | Acts on the hidden classic canvas (#2, #7), and the lab does not forward the keys. Missing stays true. |
| Settings: lesson logo, On dark slides, Finish on the final scores, AI status, Ready to teach (§6, Missing) | The shell's Settings calls `active.settings()` (js/shell.js:1802) | These were the classic settings sheet (src/editor/deck-settings.js). The lab's `settings()` is a toast, so the shell's Settings button reaches none of them. |
| Insert a saved game… (§3.8, Missing) | The shell's picker (js/shell.js:421) and Open saved (#16) | No shell path inserts a saved game into a lab lesson. The nearest, Open saved quiz in the Quiz view, cannot open what it lists. |

Not shell features, though Missing: Changed in another tab (it was the classic editor's; only js/manual.js listens for storage now), Review, the activity catalogue, Artwork, Header & footer, and the editing keys in §7 other than those above.
