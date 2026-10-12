# Data sources (M0.5)

## What this is

12 October 2026. Discovery for [lab-engine-plan.md](../lab-engine-plan.md), M0.5. It lists every place SlideForge keeps a teacher's or a learner's data in the browser, what each holds, how big it gets, and how to read each one in bulk. M5 (one library) and M13 (batch conversion) depend on it. No code was changed.

Read with [data-storage-plan.md](../data-storage-plan.md), which plans the move online. This doc describes what is there today.

Line numbers are from the working tree on 12 October 2026. Another agent had uncommitted edits in `js/lessons.js`, `js/model.js` and `lab/src/embed.ts` at the time, so a few lines may move.

## 1. The stores at a glance

| Store | Kind | What it holds | Written by | Size today |
|---|---|---|---|---|
| `slideforge.decks.v1` | localStorage, one JSON array | Every classic lesson, plus a one-slide **card** for each Lesson-studio lesson | `SF.Store` (`src/storage.js:229`) | 0.73 M characters for a fresh library (section 4) |
| `slideforge.games.v1` | localStorage, one JSON array | Every saved game (Quiz studio) | `SF.GameStore` (`src/storage.js:230`) | 0.04 M characters fresh |
| `slideforge.libraryFolders.v1` | localStorage, one object | The teacher's own folders, renamed built-in folders, collapsed state | `createLibraryFolders` (`src/storage.js:76-164`) | Tiny |
| IndexedDB `slideforge-studio`, store `kv` | IndexedDB key-value | Lesson-studio lessons, whole, with their pictures | `lab/src/embed.ts`, `lab/src/persist/idb.ts` | Up to 4.5 MB per lesson (section 4) |
| IndexedDB `slideforge`, store `snapshots` | IndexedDB, auto-increment | Restore points: up to 16 full copies per document | `SF.History` (`js/history.js`) | Up to 16 × the document |
| `assets/lab-lessons/*.lesson.json` | Files shipped with the app | Ready-made Lesson-studio copies of 31 built-in lessons | `tools/build-lab-lessons.mjs`, listed in `js/lab-lessons.js` | 17.5 MB on disk |
| `js/lab-decks.js` | Code shipped with the app | Lesson-studio decks that exist only as lab decks (today: the Air Pollution story) | `tools/build-lab-decks.mjs` | 0.46 MB |
| `js/lessons.js` | Code shipped with the app | The 36 built-in classic lessons, built on demand by `SF.buildLesson` | hand-written and generated sections | 0.71 MB |
| `data/decks/`, `data/games/` | Files on the laptop (git-ignored, `.gitignore:12`) | Export to folder: one JSON file per document | `/api/data` (`server/server.js:584-586`) | 9.6 MB on this laptop (section 4) |
| Share shelf, session journals | Server files | Shares (max 40, 8 MB each) and live-session reports | `server/server.js:137-210`, `Sessions` | Lost on each Render deploy (data-storage-plan §1) |

## 2. localStorage keys

### Documents (the library)

| Key | Holds | Where |
|---|---|---|
| `slideforge.decks.v1` | Array of classic decks, each run through `normalizeDeck` on every read. Lesson-studio lessons appear here only as cards (`labCard: true`, one title slide, the lab deck's id and folder) | `src/storage.js:166-229`; card built in `js/lab-engine.js:47-59` |
| `slideforge.lastDeckId` | Id of the deck saved last | `src/storage.js:208, 229` |
| `slideforge.games.v1` | Array of games, each run through `normalizeGame` on every read | `src/storage.js:230` |
| `slideforge.lastGameId` | Id of the game saved last | `src/storage.js:230` |
| `slideforge.libraryFolders.v1` | `{ folders: [{id,label}], collapsed: {id:true}, labels: {builtinId:label} }` | `src/storage.js:76-101` |
| `slideforge.dismissedSeeds.v1` | Keys of built-in lessons and shipped decks this browser deleted, so they are not re-seeded | `js/lessons.js:10581`, `js/lab-engine.js:88` |

### Teacher's tools and records

| Key | Holds | Where |
|---|---|---|
| `slideforge.shares.v1` | The teacher's share links and their **delete keys** (up to 40) | `js/share.js:98-100` |
| `slideforge.session-library.v1` | References and access keys for live-session reports on the relay | `js/reports.js:4-10` |
| `sf-class-lists` | Saved class lists for teacher entry (GA-17), this computer only | `js/manual.js:57-71` |
| `sf-teacher-notes-<room>` | The desk's lesson notes for a room | `js/manual.js:819-822` |
| `slideforge.plannedMinutes.<deckId>` | The presenter's planned lesson length | `presenter.html:1659-1674` |
| `slideforge.prompter` | Prompter preferences (size, speed) | `prompter.html:65-72` |
| `slideforge.rehearseSize` | Rehearsal class size: 8, 30 or 120 | `js/lab-engine.js:595-596` |

### Interface preferences

| Key | Holds | Where |
|---|---|---|
| `slideforge.workspace` | Which studio was open last | `js/shell.js:40`, `index.html:14` |
| `slideforge.canvasZoom` | Classic editor zoom | `js/shell.js:41, 124` |
| `slideforge.canvasPanel` | Classic editor side panel | `js/shell.js:42, 150` |
| `sf.notes.open` | Notes strip open or closed | `js/shell.js:567` |
| `sf-lab-panel` | Lesson-studio panel hidden | `lab/src/model/store.ts:120`, `lab/src/ui/CanvasBar.tsx:19` |
| `sf-left-folds` | Lesson-studio left panel folds | `lab/src/ui/LeftPanel.tsx:27-29` |
| `sf-browse-open` | Lesson-studio Browse sections open | `lab/src/ui/Browse.tsx:125-129` |
| `sf-recent-colours` | Recent colours in the lab's picker | `lab/src/ui/palette.tsx:41-46` |

### On the phone (`join.html`)

These are written by the learner's page. It is the same origin as the app, so a teacher who opens `join.html` in their own browser (or rehearses) shares the same 5 MB.

| Key | Holds | Where |
|---|---|---|
| `slideforge.note.<session>.<slide>[.<n>]`, `….last` | A learner's private notes (K8, AK4). Never sent | `join.html:824-831` |
| `slideforge.predict.<session>.<slide>.<n>` | A learner's private prediction | `join.html:2071` |
| `slideforge.saved.<session>` | Slides the learner bookmarked | `join.html:915-989` |

### sessionStorage (one tab only)

| Key | Holds | Where |
|---|---|---|
| `slideforge.presentation` | The show in progress, so a reload resumes it | `js/player.js:40-55` |
| `slideforge.hostedRoom` | The room PIN and host token, so a reload keeps the room | `js/live.js:992-1004` |
| `sf-entry-draft-<room>` | Teacher entry's names draft | `js/manual.js:9, 23-26` |
| `slideforge.resume.<pin>`, `slideforge.resume.pin` | A phone's resume token and name | `join.html:1151-1152` |

### Names that are not storage

- `slideforge.presenter.v1` is a `BroadcastChannel` (`src/presenter/window.js:40`, `js/presenter-activities.js:13`).
- `slideforge-teacher` is a window name (`js/live.js:170`).
- `slideforge.selection.*` is cleared by "Clear everything" (`js/shell.js:1639`) but nothing writes it any more.
- "Clear everything" removes `slideforge.presentation` from localStorage (`js/shell.js:1638`), but it lives in sessionStorage. Harmless, and a sign the list is out of date.

## 3. How the library works

### SF.Store and SF.GameStore

- `createStores` (`src/storage.js:166-242`) builds both from one pattern. It is wired to `localStorage` in `src/model.js:1748`.
- **Every read parses the whole array and normalizes every document** (`src/storage.js:168-176`). `list()`, `get(id)` and `save()` all do this. `save()` then writes the whole array back (`:190-210`). So saving one deck rewrites every deck, and a restore of *n* decks does *n* full reads and writes (`js/docs.js:59-60`).
- A write that fails (the quota) is caught, warned and returns `false` (`src/storage.js:178-186`). The shell's own Save checks it (`js/shell.js:659`). `SF.Docs.restore`, `seedLibrary` and the lab's card writes do not.
- `save()` skips an untouched blank (`unusedDraft`, `:11-38`, `:195-198`) and fills `libraryGroup` from the theme (`:199-201`).
- `GameStore.usedByDecks(id)` scans every deck for `slide.type === 'game'` with that `gameId` (`:233-239`).

### normalizeDeck and normalizeGame

- `normalizeDeck` (`src/model.js:784-813`) merges the raw deck over `makeDeck()`, normalizes each slide, resolves the theme, folder (`normalizeLibraryGroup`), aspect and logo. It returns `null` for anything that is not an object. It does not know lab decks: a lab deck in this store would lose its layers, which is why the lab keeps cards here and lessons in IndexedDB.
- `normalizeGame` (`src/model.js:933` on) picks the engine from the catalogue format (`formatStyle`), heals old True/False games, migrates Quiz Bowl's target, and normalizes each question against the game's style (`normalizeQuestion`, `:874-897`).
- Both are applied on every read, on import (`js/shell.js:1193-1194`), on restore (`js/docs.js:56-57`) and on restore from folder (`js/shell.js:1117`).

### Folders

- Six built-in folders (`LIBRARY_GROUPS`, `src/storage.js:41-48`). A deck with no folder gets one from its theme (`:50-61`).
- The teacher's folders, renamed labels and collapsed state are in `slideforge.libraryFolders.v1` (`:76-164`).
- A document's folder is its own field, `libraryGroup`. The folder list does not list its documents. Moving a lesson changes `libraryGroup`; it does not copy (data-storage-plan §1).

### Seeding

- On first load, `seedLibrary` (`js/lessons.js:10631-10659`) builds every lesson in `LIBRARY_SEED_KEYS` (`:10530`) with `SF.buildLesson` and saves it whole into `slideforge.decks.v1`, with its games into `slideforge.games.v1`. That is 26 decks and 32 games, 0.77 M characters, before the teacher has made anything.
- `seedShipped` (`js/lab-engine.js:86-97`) adds a card for each shipped lab deck (`SF.LAB_DECKS`).
- A deleted seed is remembered in `slideforge.dismissedSeeds.v1`.

### Lesson-studio lessons: IndexedDB `slideforge-studio`

`lab/src/persist/idb.ts:2-3` opens database `slideforge-studio`, version 1, one object store `kv` with out-of-line keys.

| Key | Holds | Where |
|---|---|---|
| `deck:<id>` | One whole lab deck, pictures inlined as data URLs. The id of a converted classic lesson is `lab-<classic id>` | `lab/src/embed.ts:20, 36-46` |
| `index` | `SavedRow[]`: `{ id, title, modified, slides, sourceId, libraryGroup }`, newest first | `lab/src/embed.ts:16-19, 31-46` |
| `current` | `{ deck, slideId }`: the lesson on screen, a **second full copy** of it | `lab/src/embed.ts:48-51`, read at `lab/src/ui/App.tsx:48` |

- Writes go through one queue (`serial`, `embed.ts:24-29`), so the index is never written by two saves at once.
- The Library shows a lab lesson through its card in `slideforge.decks.v1` (`js/lab-engine.js:41-59, 99-102`). The card and the deck share an id.
- When a built-in lesson is first opened in the lab, the shipped copy is used if its fingerprint and converter version still match (`js/lab-engine.js:240-246`, `embed.ts:253-276`). Otherwise it is converted in the browser (`convertClassic`, `embed.ts:125-136`).

### Restore points: IndexedDB `slideforge`

- Database `slideforge`, version 1, store `snapshots`, key `id` (auto-increment), index `docId` (`js/history.js:23, 49-66`).
- Each row: `{ id, docId, at, label, title, slides, fp, doc }`, where `doc` is a full copy (`:125-152`).
- Kept: 16 per document, oldest dropped first (`KEEP`, `:27`; `prune`, `:100-109`).
- Taken before Save, Save to Library, imports, clearing the browser, restoring, starting something new, and opening another lab lesson (`js/shell.js:684, 738, 1259, 1302, 1627, 1698, 1763, 1830`; `js/lab-engine.js:298-299`). The last one stores **lab decks**, pictures and all.
- `noteChange` (`js/history.js:158-184`), the "While editing" restore point, **is never called** anywhere in the repo. The quiet autosave points it describes do not happen.

### Backup: SF.Docs, exportBundle, importBundle

- `SF.Docs` (`js/docs.js:20-70`) is the one door to both stores:
  - `list()`: every document as `{ id, kind, title, folder, modified }`, kind `lesson` (a card), `classic` or `game`;
  - `bundle()`: `{ kind: 'slideforge-bundle', version: 2, exported, decks, games, labDecks }`;
  - `restore(b)`: games and decks saved by id, then lab decks filed with their cards (`js/lab-engine.js:891-897`).
- `bundle()` gets `labDecks` from `SF.LabEngine.savedDecks()` (`js/lab-engine.js:883-889`), which flushes the open lesson, then reads `index` and each `deck:<id>`.
- File → Export → backup calls `exportBundle` (`js/shell.js:1177-1189`): downloads `slideforge-backup-<date>.sfbundle.json`.
- Import sniffs a bundle (`js/shell.js:1284-1288`) and calls `importBundle` (`:1192-1240`). A bundle with exactly one deck and no lab decks is treated as "import this lesson" and opened in the studio.
- Version 1 bundles (no `labDecks`) still restore.

### Export to folder: /api/data

- File → Export → All to the app folder (`exportAllToFolder`, `js/shell.js:1040-1076`) POSTs each document, one at a time, to `/api/data` as `{ kind, slug, doc }`.
- The relay writes `data/decks/<slug>.json` or `data/games/<slug>.json`, pretty-printed (`server/server.js:104, 489-520`). Each POST is capped at 8 MB (`MAX_DOC`, `:115`).
- Restore from folder (`restoreFromFolder`, `js/shell.js:1080-1135`) lists with `GET /api/data` (`listData`, `server/server.js:259-279`), **clears both stores**, then fetches each file and saves it.
- `SLIDEFORGE_HOSTED=1` turns both off with a 403 (`server/server.js:113, 584-586`). Render runs with it set, so this is a laptop-only feature.
- **It reads only `SF.Store` and `SF.GameStore`.** Lesson-studio lessons go to the folder as their one-slide cards. A restore from folder then brings back cards whose lessons may no longer be in IndexedDB.
- Files are never deleted from `data/`. Each export adds a file per document under a slug of its title and id, so old copies pile up (section 4).

### Shipped content

| Source | What | How it is used |
|---|---|---|
| `js/lessons.js` (`SF.LESSONS`, 36 lessons) | Classic lesson specs | `SF.buildLesson(key)` (`:10671`) builds a deck with fresh ids; `seedLibrary` files 26 of them |
| `js/lab-lessons.js` (`SF.LAB_LESSONS`) | For 31 lessons: `{ file, hash, carried }` | `js/lab-engine.js:240-246` fetches the file when the classic lesson's hash (`js/lesson-hash.js`) and the converter version (`CARRIED`) still match |
| `assets/lab-lessons/*.lesson.json` | Lab decks with pictures packed once (`pictures: []`, slides reference `@picture:<n>`) | `unpackPictures` (`lab/src/embed.ts:112-123`) inlines them before the deck is saved |
| `js/lab-decks.js` (`SF.LAB_DECKS`) | Shipped lab-only decks: `air-pollution-story`, with the deck inline and a file fallback | `seedShipped` and `shippedDeck` (`js/lab-engine.js:62-97`); `?lesson=<key>` opens one |

## 4. What libraries weigh

**The limit.** Browsers give each origin about 5 million characters of localStorage, keys and values together: about 10 MB in Chrome, which counts two bytes per character, and 5 MiB in Firefox and Safari. IndexedDB has a separate, much larger budget (a share of free disk). Sizes below are characters of compact JSON (`JSON.stringify`), which is what `SF.Store` writes. One character per byte for this content, which is almost all ASCII and base64.

### Method

- **Built-in lessons:** `js/model.js` and `js/lessons.js` loaded in a Node `vm` with a stand-in `localStorage`, as `tests/lab-convert.test.js:47-60` does. Each lesson built with `SF.buildLesson` and measured. Then `SF.seedLibrary()` run on an empty store, and every key measured.
- **Lab copies:** each file in `assets/lab-lessons/` read, its `@picture` references inlined as `unpackPictures` does, and measured. That is the size of its `deck:<id>` record.
- **Real libraries:** `data/decks/` (this laptop's exports) and the bundles in `lessons/` (exported or built backups of real lectures).
- The scripts were run from the session scratchpad and not kept.

### Classic library in localStorage

| What | Characters | Share of 5 M |
|---|---|---|
| Fresh library after seeding: 26 decks, 32 games (all four keys) | 787,339 | 15% |
| Largest built-in lesson: Layout bank (97 slides) | 109,918 | 2% |
| Then ipdv-vc-hybrid (70 slides), ipdv-intro (74), ipdv-da (56) | 92,001 · 79,901 · 76,032 | under 2% each |
| All 36 built-in lessons together | 928,426 | 18% |

Built-in classic lessons carry no data URLs: their pictures are paths to `assets/`. They are small.

**Pasted pictures are what fill the store.** The real lecture decks in `lessons/` were made with pasted or generated pictures:

| Bundle (one classic deck each) | Deck characters | Data URLs | Fits in localStorage? |
|---|---|---|---|
| `04_Lecture_IPDV_Colour.sfbundle.json` (and `_STUDENT`) | 14,187,000 (13.5 MiB) | 115 (the largest four about 1.15 M each) | **No: nearly three times the limit on its own** |
| `critical-text-3.sfbundle.json` | 6.6 M (6.3 MiB) | 38 | **No** |
| `03_Lecture_IPDV_Data_Abstraction.sfbundle.json` | 5.7 M (5.44 MiB) | 13 | **No** |
| `02_Lecture_IPDV_Visual_Communication.sfbundle.json` | 4.4 M (4.17 MiB) | 10 | Only alone, in an otherwise empty browser |
| `07_…Maps`, `05_…Interaction_Animation` | 2.4 M, 2.2 M | 11, 25 | One at a time, beside the seeded library |
| `Nodes_CPU_Lesson.sfbundle.json` | 1.6 M | 7 | Yes |

So one picture-heavy classic lecture already exceeds what localStorage can hold. Such a lesson can live only as a lab deck in IndexedDB.

**Likely silent failure (read in code, not run in a browser):** importing the Colour bundle goes through `SF.Docs.restore`, whose `SF.Store.save` fails on the quota and is ignored (`js/docs.js:60`, `src/storage.js:178-186`). The lesson still opens in the studio from memory, and the lab saves its own copy, so the teacher sees no error. The classic original is not kept.

**The exported library on this laptop.** `data/decks/` has 97 files: 96 copies of "LDSCI6253 Advanced Information Presentation & Visualisation" (each 75,000 characters, distinct ids, modified 14–25 September) and one sample. Together they are 7.2 M characters, 1.4 times the limit. They may never have been in one browser at once, because export to folder never deletes old files. They do show duplicate copies piling up with fresh ids.

### Lesson-studio lessons in IndexedDB

The shipped files are packed. A deck saved in IndexedDB is not: each use of a picture is inlined again.

| Lab copy | Slides | File | As saved (`deck:<id>`) | Pictures |
|---|---|---|---|---|
| layout-bank | 117 | 1.83 MiB | **4.53 MiB** | 2 |
| ipdv-ia-w5 (and student) | 79 | 1.85 MiB | 4.08 MiB | 13 |
| ipdv-col-w4 (and student) | 132 | 1.02 MiB | 3.70 MiB | 2 |
| ipdv-intro | 90 | 1.31 MiB | 3.14 MiB | 2 |
| ipdv-da | 77 | 1.11 MiB | 2.68 MiB | 2 |
| All 31 shipped copies | | 17.46 MiB | **40.53 MiB** | |

- The open lesson is held twice (`deck:<id>` and `current`).
- Each restore point of a lab lesson is another full copy (up to 16).
- A teacher who has opened every shipped lesson has about 40 MiB in `slideforge-studio`, and a backup of about 41 MiB. That is fine for IndexedDB. It is eight times what localStorage could hold, which is why M5 must not put lab decks into `SF.Store`.
- Layout bank's two pictures become 4.5 MiB because the same pictures are inlined on many slides. De-duplicating by content (data-storage-plan §5, item 3) would shrink lab records the most.

## 5. Reading each store in bulk

| Store | How to read all of it | Notes |
|---|---|---|
| Classic decks and games | `SF.Store.list()`, `SF.GameStore.list()`; or `JSON.parse(localStorage.getItem('slideforge.decks.v1'))` for the raw, un-normalized form | Synchronous. `list()` normalizes everything, so read once and keep the result: each call reparses the whole array |
| Everything, as one list | `SF.Docs.list()` (rows only), `SF.Docs.bundle()` (whole documents, async) | `bundle()` is the closest thing to "the library" today. It flushes the open lab lesson first |
| Lesson-studio lessons | `SF.LabEngine.savedDecks()` (whole decks), or `labApi.listSaved()` then `labApi.readSaved(id)` (`lab/src/embed.ts:299-302`) | Needs the lab frame loaded (`whenReady`). Outside the frame, open IndexedDB `slideforge-studio` / `kv` and read `index` then each `deck:<id>`. `idbKeys()` (`lab/src/persist/idb.ts:43-50`) lists every key but is not used |
| Restore points | Per document: `SF.History.list(docId)` (no document bodies), `SF.History.get(id)` (one body) | No "all documents" call. For a full read, open IndexedDB `slideforge` / `snapshots` and walk a cursor. Bodies can be megabytes each |
| Shipped lessons | `SF.LESSONS` + `SF.buildLesson(key)`; `SF.LAB_LESSONS[key].file`; `SF.LAB_DECKS[key].deck` or `.file` | Node can build classic lessons in a `vm` (as in section 4); the lab files are plain JSON |
| Folder export | `GET /api/data` then each `data/<kind>/<file>`, or read `data/` from disk | Laptop only. Classic and games only; lab lessons appear as cards |
| Folders | `SF.LibraryFolders.catalog()` | Built-in and the teacher's own |

## 6. What this means for M5 and M13

- **One library cannot live in localStorage.** A single real lecture with pictures is 3–14 M characters. The library has to move to IndexedDB (hard rule 3), and the move has to carry classic decks, games, cards and folders together.
- **Batch conversion (M13) should read through `SF.Docs.bundle()`**, not `SF.Store.list()`, so it sees the lab's lessons as well as cards. It should skip cards (`labCard: true`): their lesson is already a lab deck.
- **Check write results.** Every caller of `SF.Store.save` should treat `false` as a failure, starting with `SF.Docs.restore` (`js/docs.js:59-60`).
- **Export to folder misses lab lessons.** Either route it through `SF.Docs` or say so in its menu item.
- **Pictures need de-duplicating** before or during M5: the lab's inlining multiplies them.
- **Restore points for lab decks** cost up to 16 full copies each. Worth a smaller `KEEP` for lab decks, or storing pictures once.

## Change log

- 12 October 2026: written. Measured from the working tree.
