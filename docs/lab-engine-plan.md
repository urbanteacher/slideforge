# Plan: Make the lab the engine, with games, activities and live rooms native to it

## Goal

SlideForge becomes **one shell driving one engine**. The shell (`js/shell.js`) is kept: it was built for this ("Two engines share one window"). The lab becomes the engine that plugs into it through `SF.Shell.register(ws)`, replacing the Lesson studio (`editor.js`), the Quiz studio (`games.js`) and the Activities studio (`activities.js`).

Games, activities, audience feedback and live rooms run natively in the lab engine: one deck format, one player, one live host, one game-style registry. Games become layers inside a lesson, so there is one engine with one workspace, not three.

Deletion happens in two stages:
- **M14 (this plan):** delete the classic Quiz and Activities studios and the classic game, activity and live code, once the lab matches them.
- **M15 (separate plan, gated):** delete the classic Lesson studio, deck model and player once the lab matches the whole feature map. After that, the lab is the only engine registered with the shell.

## Scope and size

This is a rewrite of roughly **15,000–20,000 lines**. It will take **months, not weeks**. Plan and report progress on that basis.

| Classic part | Lines |
|---|---|
| `js/live.js` | 3,500 |
| `js/player.js` | 3,063 |
| `js/games.js` (Quiz studio) | 2,316 |
| `js/activities.js` | 1,187 |
| Quiz and live renderers (`src/render/quiz.js`, `src/render/live.js`) | 2,587 |
| `presenter.html` | 1,735 |
| `js/manual.js`, `js/demo.js`, `js/live-activities.js`, `js/presenter-activities.js`, `js/stages.js` | about 2,100 |

On top of that come **30 game styles** and **54 activities**. The premium audits from the GA and AC waves set the quality bar. Each one becomes a parity acceptance criterion that the lab version must meet again in React.

Two things make it smaller than it looks:
- **The shell stays.** It already provides the title, theme, File menu, Library, Share, Host live, command palette, shortcuts and restore points. It fills several of the lab's **Missing** rows (Studio switch, File → New, Share, Host live) once the lab registers with it.
- **The game logic is already pure.** Every file in `src/games/` is an ES module with no DOM or `SF.*` use. In `src/activities/`, only `fields.js` touches either. The lab can import them as they are.

Converting content is also a solved problem. `lab/src/model/fromSlideForge.ts` already turns about 30 classic slide types into native lab slides (the 93-slide Layout bank and the Motion lab). It builds the chart experiments too, and a lab copy made before a slide type converted gets those slides when it next opens (`CARRIED`, `carryDeckMissing`). It stops at games (`default: return null` in `convert`), because the lab has nothing to run them with yet. For games, most of the cost is running them, not converting them.

## Where things stand (25 Sep 2026)

| Milestone | Status |
|---|---|
| M0–M4 | Not started. They come after the lesson side (see the order below). |
| M5 | **Done early, in a different form** (commits `d9b1e64`, `41d9ea3`, `7b7a67e`). The lab is the Lesson studio. See "M5 — status" below for what differs from the plan and what is left. |
| M6 | **Part done.** The lab bundle is committed in `lab-app/` and served by the relay's static server from the same origin. Pushed to `deploy-render` on 25 Sep 2026 (`d52e31e`). Not yet tried from a phone with a QR code from a lab lesson. |
| M7–M15 | Not started. Until M7, **the bridge** stands in for the lab's own live host (see below). |
| Live stage | **Done** (`4b5c9a5`, speaker notes on the wall `9281d07`). Lab slides play live inside SlideForge's show, with its HUD, the room's rail and Teacher Presenter (see "The live stage" below). |
| Converter keeps feedback and timers | **Done** (`1453965`). |
| Quiz studio and Activities in the Lesson studio's frame | **Done** (`a60f79e`, `d52e31e`). Layout only: how the two studios work is unchanged (see "The three studios, one frame" below). |
| **Next** | What M5 still owes (see "M5 — status"), then the lesson features the feature map still marks Missing. |

**Order (decided 25 Sep 2026): games and activities come last.** The lesson side goes first, in this order:

1. The HUD, Teacher Presenter and the rail. **Done** (the live stage).
2. **The converter keeps a slide's audience feedback and timer.** **Done** (`1453965`). A SlideForge lesson converted into the lab lost its polls, word clouds, brainstorms and scales (`slide.feedback`) and its timed slides (`slide.timeLimit`): `fromSlideForge.ts` read neither. The original lesson kept them, but the lab copy that is taught from did not. Lab copies made before the fix get them back from their original, once.
3. What M5 still owes (see "M5 — status").
4. The lesson features the feature map still marks Missing, starting with the feedback settings (prompt, poll options, scale ends and points, responses each, beside the slide or full screen) and the phone preview.

The game and activity milestones (M0's game inventories, M2–M4, M7–M14) follow after that. Until then, games and activities in a lab lesson run as SlideForge's own, through the bridge. M1.5 (the lab restructure) still comes before anything adds game code to the lab.

## Where we are now

```
┌──────────────── Shell (js/shell.js) — now in the lab's dark chrome ─────────────┐
│  Title · New/Open/Save/Export/Import · Library · History · Settings · Share ·  │
│  Host live · Present ▾ (Teacher Presenter, Rehearse) · palette · shortcuts      │
│  Workspaces: deck / game / plan                                                 │
└───────┬───────────────────────┬──────────────────────┬──────────────────────────┘
        │ register(ws)          │                      │
  Lab engine (deck)       Quiz studio            Activities studio
  js/lab-engine.js        (games.js)             (activities.js)
  frames lab-app/         the Lesson studio's frame, working as before:
                          a strip of questions or activities, or the lesson
                          (js/lesson-strip.js); the rail to write, the panel
                          for how it looks and runs
        │
        ├─ lab: layers, WebGL engine, its own Present   (lab/src, built to lab-app/)
        │    decks in the lab's IndexedDB ('slideforge-studio'); a Library card
        │    for each in SF.Store, so folders, rename, move and delete work
        │
        ├─ classic Lesson studio (editor.js): loaded, hidden. Still the way the
        │    Library, the demo and New hand a lesson over; the lab converts it
        │    into its own copy and never writes the original
        │
        └─ the bridge: for Host live, Teacher Presenter, Rehearse, Share and the
             PDF handout, the lab draws its slides as pictures and the original
             lesson's games go back in place, as a SlideForge lesson
                                ▼
          Classic player + HTML renderer   (js/player.js, src/render/*)
          Live host   (js/live.js) · presenter.html · manual.html · view.html
                                │ WebSocket (unchanged)
          Relay server (server/server.js) → Phones (join.html)
          Render: free plan, one instance, rooms held in memory
```

The lab is what teachers edit lessons in. The classic player still runs the room, fed by the bridge. `?classic=1` on the address (or `SF.LabEngine.useClassic(true)`) brings the classic Lesson studio back for a browser.

### The bridge (temporary)

- **What it is:** `js/lab-engine.js` builds a SlideForge lesson from the lab deck. Each lab slide becomes a full-bleed `image` slide (a JPEG from the lab's renderer, cached per slide). The original lesson's game and activity slides go back after the slide they followed; each lab slide records its `sourceSlideId`. `SF.buildRunDeck` then feeds Host live, Teacher Presenter and Rehearse. Share and the PDF handout use the same lesson, and the practice notes use each slide's words.
- **What it costs:** less than it did. The pictures now show only in Teacher Presenter's thumbnails, shared links and the PDF handout; on the wall the live stage draws each lab slide over its picture. Page numbers differ: the lab's footer counts its own slides, SlideForge's player counts the games too. The first show of a large lesson waits a few seconds while the pictures are drawn.
- **Why it is allowed:** it is the rejected "classic player presents lab decks" design, taken as a **temporary** step. It goes when the lab has its own live host (M7), presenter window (M11) and viewer and export (M5's lab viewer, M12).

### The live stage

- **What it is:** `js/lab-stage.js` loads the lab's player into SlideForge's page (`lab-app/stage.js`, built by `lab/vite.stage.config.ts`, as `window.SFLabStage`) and puts it over each lab slide in SlideForge's show. It draws the slide live: builds, word timing, transitions, moving backgrounds and on-slide controls. One canvas and one lab player serve the whole show; the canvas moves into whichever lab slide is on the wall and pauses while a game is.
- **How it fits SlideForge's player:** Next asks `SF.LabStage.step` first (the hook Explore and chart callouts use), so a lab slide's builds are walked before the show moves on; Previous returns to a slide fully built. A click the lab slide does not use goes on to SlideForge's player; the lab's own controls keep theirs. The HUD, the rail, Teacher Presenter and the live room are SlideForge's and are unchanged. The lab's fonts are copied into SlideForge's page when the stage starts.
- **Room for the rail:** when the rail opens (the room, a brainstorm, a poll, a word cloud), the lab keeps a slide's full-size backdrops and every effect in place and draws the content smaller, centred on the height, in the space left of the rail (`--rail-w` plus SlideForge's 54px gap). It eases across by the clock over about the time the rail takes.
- **Present** is this show too, full screen, asked for inside the click. ⌘↵ inside the lab goes to it. The lab's own Present remains in the stand-alone lab.

### The three studios, one frame

- **What it is:** Quiz studio and Activities are laid out as the Lesson studio is, so moving between the three feels like one app. The second row is the same on all three: Library on the left, the studio's tools (Quiz studio and Activities: Saved, Lesson bank, Undo, Redo), Host live and Present with its menu on the right, all sized as the lab's. Under the canvas is a bar (Add, Browse, the green demo, zoom, the panel switch) and a strip. The strip shows the game's questions or the lesson's activities as slides, with duplicate and delete on each, or, from the icon under its count, the whole lesson in the show's order with this game or activity outlined. With the lab as the Lesson studio, the lesson's slides are small pictures from the lab (`SF.LabEngine.stripDeck`) and its games and activities are SlideForge's own. The rail is where the question or activity is written, in folds as the lab's left panel is (Instructions with How to play, the question, answers, explanation, slide notes). The panel on the right is settings: timing, picture, look, engage. Activities' catalogue opens from Browse activities.
- **Why it is allowed:** it is layout. Nothing new is added to how games or activities work (hard rule 7), and the one new read of the lab, the strip's pictures, goes through the engine's interface. The code goes when the classic studios do (M14).
- **A gap it shows:** with the lab as the Lesson studio, an activity added in Activities goes into SlideForge's copy of the lesson, which is often the Library card, not the lab lesson, so it does not play. The strip's lesson view says so ("Not in the lesson"). It closes when activities are layers in the lab lesson (M10), or sooner if Activities is pointed at the lesson the lab came from.

## Where we are heading

```
┌──────────────── Shell (js/shell.js, kept, plain JS) ────────────────────────────┐
│  Title · theme · New/Open/Save/Export/Import · Library (folders, bundles,       │
│  export to folder) · Share · Host live · command palette · shortcuts ·          │
│  restore points                                                                 │
│  Engine-agnostic: every action is handed to the active engine                   │
│  Library stored in IndexedDB (moved from localStorage at M5)                    │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │ SF.Shell.register(ws)
                                     │ doc · setDoc · blank · store · draw · play ·
                                     │ settings · hostLive · flush · keydown
                                     ▼
┌──────────────── Lab engine (React bundle, mounted in the shell's workspace) ────┐
│  One workspace: design layers + game / activity / feedback layers               │
│  Own filmstrip, layers panel and inspector (the shell hides its rail and        │
│  inspector while the lab is active)                                             │
│  Lab toolbar = editing tools only (File/export/present live in the shell)       │
│  Own undo, reached through keydown() · saves through the shell's library        │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     ▼
┌────────────────────────────── Lab player ───────────────────────────────────────┐
│   WebGL canvas: design layers        HTML game stage on top: lab React walls    │
│                                      from the registry                          │
│         Player contract: navigation · steps inside a slide · typed events       │
│         Presenter window (lab) · rail · shared-lesson viewer (lab player)       │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │ events
              Lab live host (lab/src/live/): room state, host commands,
              teams/rosters, rounds, boards, class reports
              Game core: src/games, src/activities (imported in place;
              moved into lab/ at M14)
                                     │ WebSocket (protocol unchanged)
              Relay server → Phones (join.html)          (no change)
              manual.html                                (no change)
              Served from ONE origin: shell + lab bundle + relay + join.html

  Deleted at M14: Quiz studio (games.js), Activities studio, js/live.js,
                  src/render/quiz.js, src/render/live.js, classic activity stage
                  code, game/activity parts of the player and presenter
  Deleted at M15: Lesson studio (editor.js), classic deck model, SF.Player,
                  presenter.html, classic view.html; one workspace left
```

## Infrastructure the plan runs on

These are facts about the current site. Every milestone has to work within them.

**Hosting (`render.yaml`)**
- Render web service, **free plan, one instance**. Rooms live in a `Map` in the relay's memory, so a second instance would break PINs. Nothing in this plan may need more than one instance.
- The free plan **spins down when idle** and cold-starts on the next request. The first Host live after a quiet spell waits for that. Deployed acceptance tests (M6, M7) must note the cold start rather than count it as a failure.
- Session journals (`.slideforge/`) and shares (`SHARE_DIR`) are written to the container filesystem, which is **discarded at every deploy and restart**. Class reports in the lab inherit this. Don't promise durable reports until a disk is added (`render.yaml` has the lines ready, commented out).
- The build is `npm ci --omit=dev && node AiAd27/build.js`. It installs **no dev dependencies**, and it doesn't touch `lab/`. Vite is a lab dev dependency, so Render cannot build the lab — which is why the built lab is committed (below).
- `SLIDEFORGE_HOSTED=1` turns off `/api/data` (saving into the project folder). The hosted app saves only in the browser and by File → Export.

**Serving (`server/server.js`)**
- A hand-written static server serves any file under the repo root, except dotfiles and the sessions folder. A built lab bundle under the root is served with **no server change**, so hard rule 5 holds.
- The server's APIs are `/api/ai/generate`, `/api/ai/status`, `/api/share`, `/api/sessions/` and `/api/data`. The lab uses the same endpoints; it adds none.
- `/api/share` accepts documents up to **8 MB** (`MAX_DOC`). Lab decks embed images as data URLs of up to 2400px, so a photo-heavy lab deck can exceed it.

**Building**
- The classic bundle `js/model.js` is **committed**, and `npm test` fails if it is stale (`build:check`). `index.html` loads it with a hand-bumped `?v=` query.
- `lab/dist` and `lab/src/generated/player.iife.js` are **gitignored**. The lab that SlideForge serves is built by `npm run build:app` in `lab/` (`lab/vite.app.config.ts`, `base: '/lab-app/'`) into **`lab-app/`, which is committed** (about 7.5 MB). After any change to `lab/src`, rebuild it and commit it. Nothing checks yet that it is current; that check is still owed (M5).
- Two TypeScript versions: the root is on 5.9 and the lab on 7.0. Declarations shared between them (for `src/games`) must typecheck in both.

**Testing**
- Root: `npm test` runs `build:check`, the typecheck and `node --test` over 86 files (about 570 tests). `tests/harness.js` runs a real relay with real sockets. `npm run smoke` runs Playwright scenarios; `npm run visual:check` runs Docker baselines against port 8787 (pass `SF_URL` from a worktree).
- Lab: **no unit test runner yet** (M1). Its checks are `tsc --noEmit` and `vite build`. The `lab-lesson` smoke (`tools/smoke/lab-lesson.mjs`, in the `ci` set) covers the lab as the Lesson studio and the bridge.
- Under automation (`navigator.webdriver`) SlideForge opens the **classic** Lesson studio, because the other smokes drive its rail, stage and inspector. A smoke for the lab opts in with `?classic=0`.

**Storage**
- The shell's library (`createStores` in `src/storage.js`) keeps each store as one JSON array in **localStorage**, rewritten whole on every save. `js/history.js` already calls localStorage "the one storage in this app under real pressure".
- Restore points (`js/history.js`) are in IndexedDB, database `slideforge`. They snapshot whatever the engine's `doc()` returns, so they already work for any engine.
- The lab keeps its decks in its own IndexedDB store (`lab/src/persist/idb.ts`): each deck under `deck:<id>`, an `index` of them, and `current`. SlideForge's store holds only a **Library card** for each (name, folder, one title slide), never the deck.

**Windows beside the host**

These are clients with their own message protocols, just like the phones:
- `presenter.html` talks to the player by `postMessage` (`sf-presenter-cmd`).
- `manual.html`, the teacher's answer-entry window, talks to `js/live.js` by `BroadcastChannel('sf-manual-<key>')` and `postMessage`.
- `view.html`, the shared read-only lesson, loads `js/model.js` and the classic player. It cannot show a lab deck; a lab lesson is shared as the bridge's lesson instead, its pictures stepped down in size until the copy fits 8 MB.
- The lab itself runs in a same-origin frame (`#labFrame`), so its styles and its keyboard and paste handling stay its own. It hands Save, the palette, the studio switch and `?` up to the shell.

**How the lab's code is laid out**
- No lab file is over 2,000 lines yet. The largest are `engine/raster.ts` (1,409), `model/layouts.ts` (1,119), `engine/registry.ts` (878), `ui/Inspector.tsx` (761) and `engine/chartKinds.ts` (757).
- Those files grow with every kind: `raster.ts` has one drawing function per content kind, `registry.ts` lists all 44 layer and effect kinds with their GLSL, `layouts.ts` holds all 45 layouts, and `Inspector.tsx` branches per kind. Adding 30 game styles and 54 activities the same way would push them far past 2,000 lines, and every agent would be editing the same few files. M1.5 fixes this before games land.

**Working in this tree**
- More than one agent works here. Follow `AGENTS.md`: commit with `git commit --only <paths>`, keep code and docs in separate commits, and run `git status src/` before committing `js/model.js`.

## Anti-drift: designs we have rejected

The designs below have come up before and were rejected. If you find yourself building any of them, or a document, diagram or PR proposes one, **stop and ask**. Don't continue.

| Rejected design | Why it's rejected | What we do instead |
|---|---|---|
| Game slides that carry classic JSON inside a lab slide | It keeps two deck formats, one hidden inside the other | Typed `game` / `activity` / `feedback` layers (M2), filled by the converter |
| Mounting `src/render/quiz.js` or `src/render/live.js` over the lab canvas | It keeps the classic renderers alive inside the lab | Lab React wall components from the registry (M4, M8–M10) |
| A "player adapter" that exposes the 64 `SF.Player` hooks so `js/live.js` runs unchanged | It keeps the classic host and its coupling to the player forever | A small player contract (M3) and a new lab live host (M7) |
| Handing lab decks to the classic player to present, or to classic `view.html` to share | It means two players for good | The lab player is the only player, including for shared lessons |
| Rasterising game screens into WebGL textures | It breaks accessibility and text input, and it's slow for live updates | An HTML game stage over the canvas (M3) |
| The lab keeping its own File / export / present chrome inside the shell | It means two sets of controls | The shell owns them; the lab toolbar is editing tools only (M5) |
| Two stores or two libraries (shell library plus lab IndexedDB) | It means two sources of truth for saved work | One library, the shell's, stored in IndexedDB (M5) |
| Separate lab engines or workspaces for lessons, games and activities | It rebuilds the three-studio split | One lab engine, one workspace; games are layers in a lesson |
| Rewriting the shell in React, or replacing it with a lab-only app shell | Needless work; the shell is already engine-agnostic by design | Keep the plain-JS shell and mount the lab bundle into it (M5) |
| New shell code that calls lab internals directly | It recreates the coupling the shell has today with `SF.Editor` | The shell only talks to engines through the registered interface |
| Classic studios gaining features to feed the lab (for example Quiz studio writing lab layers) | It breaks the freeze and makes classic write lab data | The lab reads classic data through the converter |
| A logging tap, new endpoint or protocol change in `server/server.js` for this plan | It breaks hard rule 5 | Record and test from the host side (M0.2) |
| Anything needing a second Render instance | Rooms live in one process's memory | Keep one instance |
| Adding a kind, style, activity, layout or chart by editing a shared file (`raster.ts`, `registry.ts`, `Inspector.tsx`, `layouts.ts`) | The shared files grow without limit, and parallel agents collide in them | Add a folder or file and one line in its list (M1.5) |
| A lab file over 800 lines, or an import into another folder's internals | Agents can't read the file whole, and the boundaries stop meaning anything | Split it; import through the folder's `index.ts` (hard rule 13) |

**The test:** at the end, is there exactly **one shell driving one engine**, with one deck format, one player, one live host and one registry, and no classic engine code left? If a change makes that answer "no" for good, rather than temporarily during migration, it's drift.

These are planned temporary steps, not drift:
- importing the pure logic in `src/games` and `src/activities` in place until M14;
- the classic Lesson engine staying registered with the shell until M15;
- classic `view.html` staying for classic decks until M15;
- **the bridge** (see "Where we are now") running Host live, Teacher Presenter, Rehearse, Present, Share and the handout on the classic player, with the **live stage** drawing lab slides inside it, until M7, M11 and M12;
- **the lab in a frame** rather than mounted in the page, until the lab's styles are scoped so they cannot collide with SlideForge's;
- **the lab's own store, with Library cards** in SlideForge's, until the shell's library moves to IndexedDB (M5, still owed). This is the "two stores" row, taken temporarily: the card is only a pointer, so there is still one copy of each lesson;
- **the classic Lesson studio loaded and hidden** as the way lessons are handed to the lab, until the Library, the demo and New talk to the engine interface directly (M5, still owed);
- **Quiz studio and Activities in the Lesson studio's frame** (`js/lesson-strip.js` and the two studios' layout), until the classic studios go (M14).

## Read first

Before writing any code, read these:

- `AGENTS.md`, for repo conventions and every per-style registration point.
- `docs/studio-feature-map.md`. It has 66 **Missing** rows in total; Engagement, Host live, Studio switch, File → New and Share are among them.
- `js/shell.js`, especially the header comment, `SF.Shell.register` and every place the shell reaches into classic code. Also `js/history.js` and `src/storage.js`.
- `lab/src/engine/player.ts` (`DeckPlayer`), `lab/src/engine/raster.ts`, `lab/src/ui/Present.tsx`, `lab/src/ui/Engagement.tsx`, `lab/src/model/fromSlideForge.ts`, the lab TopBar, the lab store and `lab/src/persist/idb.ts`.
- `js/live.js`, `js/player.js`, `src/render/quiz.js`, `src/render/live.js`, `presenter.html`, `manual.html` and `view.html`.
- `js/editor.js`, `js/games.js`, `js/activities.js`, `js/stages.js`, `src/activities/stages.js` (`PRESENTATIONS.stages`), `js/manual.js`, `js/demo.js` and `js/ai.js` (`AI_SPECS`).
- `index.html` and `src/model.js`, for how the shell and classic engines load and the classic deck model.
- `server/server.js` (including the relay-side marking, K29, and `MAX_DOC`), `join.html`, `src/games/` and `src/activities/`.
- The build and deploy setup: `tools/build.mjs`, `render.yaml`, `lab/vite.config.ts` and `lab/vite.player.config.ts`.

## Hard rules

1. **No hybrid.** Never hand a lab deck to the classic player. Never store classic slide JSON inside a lab slide. Never import from `js/live.js`, `js/player.js`, `src/render/` or `SF.Player` in lab code. The one allowed exception is importing the pure logic in `src/games` and `src/activities` in place until M14.
2. **The shell is kept, and it stays engine-agnostic.** The shell owns the title, theme, File (New, Open, Save, Export, Import), Library, Share, Host live, restore points, the command palette and shortcuts. The lab provides none of these itself. The shell talks to engines only through the registered interface. Don't rewrite the shell in React.
3. **One library.** The lab saves through the shell's library. The library moves to IndexedDB before any lab deck is saved into it (M5). The lab's separate store is retired once its decks are migrated.
4. **Game UI is HTML, not WebGL.** Game walls are React components in an HTML layer positioned over the canvas, like the YouTube iframe in `Present.tsx`. Don't rasterise game screens into textures. Keep them accessible, with real text, focus order and ARIA live regions for reveals and timers.
5. **The server, phones and teacher-entry window don't change.** `server/server.js`, `join.html` and `manual.html` keep their current protocols, including the relay-side marking (K29). No new endpoints and no logging taps. If a milestone seems to need a change, stop and ask.
6. **It stays on one Render instance, and the build stays reproducible.** The deployed lab bundle is committed and checked by `npm test`, the same way `js/model.js` is (M5).
7. **Classic is frozen once the in-flight decision is made** (see M0.6). After that, classic gets bug fixes only, with no new game styles, activities or features. Shell work needed to host the lab engine is allowed.
8. **One milestone at a time.** Use small PRs, each with tests and a short note in the PR description saying what was verified and how.
9. **Keep the feature map current.** Update `docs/studio-feature-map.md` whenever a row changes status. Record each finished milestone in `docs/BACKLOG.md` (*Open now*, its series table and the change log), as `AGENTS.md` asks.
10. **Stop at the review gates** marked below and wait for approval before continuing.
11. **Check for drift at every PR.** Each PR description ends with one line confirming it follows the target structure and matches no row in the anti-drift table.
12. **Parity means the audited behaviour.** For every ported style or activity, the acceptance criteria include its GA or AC audit items, not just "it runs".
13. **Small files and clear boundaries in the lab** (from M1.5 on, checked by a test):
    - Aim for under 400 lines per file. The test fails above 800. A 2,000-line file is about 25,000 tokens: an agent can't read it whole, edits it from partial views, and collides with other agents working in it.
    - `core/` and `engine/` never import a kind, style or activity. They reach them only through the lists (`kinds/index.ts`, the game and activity registries).
    - Each folder's `index.ts` is its public interface. Code outside a folder imports only from that `index.ts`.
    - Adding a kind, style, activity, layout or chart is a new folder or file plus one line in its list.

---

## M0 — Discovery (no production code)

Every later milestone depends on these outputs.

**M0.1 Player usage inventory:** `docs/games/player-usage.md`
- List every `SF.Player` member used in `js/live.js`, with its call count and call sites. There are 64 today.
- Classify each member as one of these: *navigation*, *presenter/rail*, *game drawing*, *room state*, or *dead/unused*.
- For each member, say where it will live in the lab: the player contract (M3), a registry slot (M4), the live host (M7), the presenter (M11), or nowhere.
- Mark which parts of `js/player.js` and `presenter.html` serve games and activities only (deleted at M14) and which also serve lessons (kept until M15).

**M0.2 Protocol spec and recorded sessions:** `docs/games/protocol.md` and `tests/fixtures/sessions/`
- Document every message between host, server and phone: its name, direction, payload shape and when it's sent.
- Document the window protocols too: `presenter.html` (`sf-presenter-cmd`) and `manual.html` (`sf-manual-<key>` and `sf-manual-error`).
- **Record real message logs** from the classic host for every game style, every feedback kind and a representative set of activities.
  - Record **from the host side, never the server.** Wrap `WebSocket` in the classic page (a test-only script loaded by the smoke runner), or drive sessions through `tests/harness.js`. This keeps hard rule 5.
  - Each recording must include a phone reconnect mid-question, locked messages, `manualAnswer` (teacher entry by key), journal records, relay-side marking (K29), and teams and rounds where the style supports them.
- Store each log as a fixture with a short README describing the scenario. These are the replay tests for M7 onward.

**M0.3 Style, activity and feedback inventory:** `docs/games/style-inventory.md`

For each of the **30 game styles**, record:
- its classic slide fields, stages and steps;
- its scoring function and phone mode;
- its wall screens;
- every registration point listed in `AGENTS.md`, with file paths;
- its teacher entry by key (`manual.js`), rehearsal class (`demo.js`), AI writing spec (`ai.js` `AI_SPECS`) and playbook entry;
- its solo practice support (GA-28) and whether the relay marks it (K29);
- whether it supports teams/rosters, the boss battle, rounds, boards and class reports;
- its GA audit items, which become its parity criteria.

For the **feedback kinds** (poll, word cloud, brainstorm, scale), record the same, as they apply.

For the **54 activities**, record:
- their timed stages;
- their row jobs (`[note]`, `[talk]`, `[send]`, `[work]`, `[down]`, and how jobs are read from a row's words);
- the pinned brief;
- how `stages.js` and `PRESENTATIONS.stages` drive them;
- their AC audit items.

Also list the **cross-cutting room features** that don't belong to one style: teams and rosters, the boss battle, rounds, boards, class reports and the presenter window. Record where each one lives in classic today.

Finally, rank everything by porting difficulty and recommend the simplest quiz style for the M7 pilot.

**M0.4 Classic deck fields:** add a section to `style-inventory.md` listing every field a classic game, activity or feedback slide can hold, and every field a saved game in `SF.GameStore` can hold. The converter (M2, M13) depends on this.

**M0.5 Data sources:** `docs/games/data-sources.md`
- Document the shell's library: its localStorage keys, folders, bundles, export to folder, and how `SF.Store`, `SF.GameStore`, `normalizeDeck` and `normalizeGame` use it.
- Measure what real libraries weigh today, and how close the largest are to the browser's localStorage limit.
- Document restore points (`js/history.js`) and the lab's IndexedDB store, and what each holds.
- Document how each can be read in bulk. M5 and M13 use this.

**M0.6 In-flight work (a decision for the human):** list the open classic items, and include any others found:
- GA-19 (Connection Maker's drawn bridges);
- AC-13 to AC-17;
- the Stations clock.

For each one, give its state and a recommendation: *finish in classic first* (its behaviour then becomes a parity criterion) or *move to the lab backlog*. The human decides at gate 1 and tells the games and activities sessions, since those audits belong to them. Hard rule 7 takes effect once this decision is made.

**M0.7 Shell coupling inventory:** `docs/games/shell-coupling.md`
- Document the engine interface: `doc()`, `setDoc()`, `blank()`, `store`, `draw()`, `play()`, `settings()`, `hostLive()`, `flush()` and `keydown()`, and what the shell expects from each.
- List every place the shell reaches past that interface into classic code, with call sites. Known so far:

  | Coupling | Planned fix (M5) |
  |---|---|
  | `SF.Editor.install`, `useLesson` (LessonBank), `findInDeck`, `openAiSmokeTest` | Route through the engine interface, or make them commands the engine registers |
  | `SF.Store`, `SF.GameStore`, `normalizeDeck` / `normalizeGame` | One library through the shell; each engine provides its own normalizer through `store` |
  | `sizeCanvas`, `setZoom`, `installNotesStrip` | Move into the classic Lesson engine; the lab has its own stage |
  | `SF.Live` | The shell's Host live calls the active engine's `hostLive()` |
  | `markdownToDeck`, `LessonBank`, `shareLessonDoc` | Retarget at the lab deck format behind the engine interface |

- **Not a coupling:** `SF.History` is restore points, not undo. It snapshots whatever `doc()` returns, so it already works for any engine and stays in the shell. Undo belongs to each engine and is reached through `keydown()`. Only add `undo()` and `redo()` to the interface if the shell has an Undo menu item.
- Confirm the file paths of the three classic studios and the workspace switch (`deck` / `game` / `plan`).
- List every shell feature that maps to a **Missing** row in the feature map.

**Done when:** all outputs exist, every one of the 64 player members is classified, every shell coupling is listed, and there is a recording for every game style and feedback kind.
**⛔ Review gate 1.** Stop and wait for approval, including the in-flight decision.

---

## M1 — Lab test runner and game logic in place

**A test runner for the lab**
- Add a test runner to `lab/` and wire it into the root `npm test` and `npm run test:all`, so one command still checks everything. The root already uses `node --test`; use it too if TypeScript can be run without adding a build step, or add Vitest as a lab dev dependency.

**Game logic in place**
- Make the lab import `src/games` and `src/activities` **where they are**, through a Vite alias or path mapping. Don't move them yet; moving them would cross two build systems (the esbuild bundle into `js/model.js`, and Vite).
- Add TypeScript declarations (`.d.ts`) for the parts the lab uses. They must typecheck under both the root's TypeScript 5.9 and the lab's 7.0.
- `src/games` is already pure. Fix `src/activities/fields.js`, the one file that touches the DOM or `SF.*`, so it is importable. Classic behaviour must not change, and `npm run build` must leave `js/model.js` byte-identical apart from what the fix itself changes.
- Add unit tests for every scoring function, run from the lab, using fixtures taken from current classic behaviour.

**Done when:** the lab builds and calls the game logic, the classic build is unchanged, and the lab's scoring tests run from the root `npm test` and pass.

---

## M1.5 — Restructure the lab into kind folders

Do this before M2, while it is still mostly moving code. After games land there would be three times as much to move.

**Why:** the lab's shared files grow with every kind (see "How the lab's code is laid out"). The pattern that fixes it is the one tldraw uses for shapes: each shape type is one `ShapeUtil` that owns its rendering, geometry and default props, the editor keeps a registry of them, and a shape's component may be HTML. bulletproof-react applies the same idea to React apps: feature folders, each with an `index.ts` as its public interface.

**Target layout**

```
lab/src/
  app/          App, TopBar, the shell engine adapter (M5)
  core/         types, store, undo, persistence            — knows no kinds
  engine/       compositor, GLSL prelude, animation, player — knows no kinds
  kinds/        one folder per layer kind
    text/       def.ts (params, defaults) · raster.ts · Inspector.tsx · index.ts
    shape/  image/  video/  chart/  table/  timer/  quote/  note/ …
    effects/    one file per effect: params + GLSL
    index.ts    the list of kinds, one line per kind
  charts/       one file per chart type (from chartKinds.ts)
  layouts/      one file per layout family (from layouts.ts)
  decks/        fromSlideForge and the NUL, UKBT and Motion lab importers
  games/        core/ · registry.ts · styles/<style>/  (M4, M8)
  activities/   the same shape as games (M10)
  live/         host, room store, protocol (M7)
  ui/           panels/ · stage/ · controls/
  export/
```

**Steps**
- Split `engine/raster.ts`: shared text layout and canvas helpers go to `engine/`, and each kind's drawing function goes to `kinds/<kind>/raster.ts`.
- Split `engine/registry.ts`: each layer kind's definition goes to its folder, and each effect to `kinds/effects/`. `kinds/index.ts` collects them. The inspector, thumbnails, randomise, export and player keep reading from the one list, as they do now.
- Split `model/layouts.ts` into `layouts/` by family, and `engine/chartKinds.ts` into `charts/` by type.
- Make `ui/Inspector.tsx` a frame that shows the selected kind's own `Inspector.tsx`, carrying on what `ui/special.tsx` started.
- The `quiz` and `activity` placeholder kinds move into `kinds/` for now. M2 replaces them with the real layers, which live under `games/` and `activities/`.
- Check that the export player (`vite.player.config.ts`) still builds and plays after the move.

**Checks, added to the lab's tests (M1) and run from the root `npm test`**
- **File budget:** fail when a lab source file is over 800 lines, with a short allowlist for files still being split. The list must be empty at the end of M1.5.
- **Boundaries:** fail when `core/` or `engine/` imports from `kinds/`, `games/`, `activities/` or `live/`, or when code imports another folder's internals instead of its `index.ts`.

**Coordination:** this moves nearly every lab file. Start only when no other agent has uncommitted work under `lab/` (check `git status lab/`; LAB-14 and LAB-15 were open when this was written), and tell the other sessions before you start and when you finish.

**Done when:** the layout above is in place, both checks pass with an empty allowlist, `npm run build` and the export player build in `lab/` succeed, and every deck and slide design still renders as it did (compare the Layout bank, the Motion lab and the Slide designs before and after).

---

## M2 — Game, activity and feedback layers, and the converter's first version

**Layers**
- Add first-class `game`, `activity` and `feedback` layer types to the lab deck model, with typed fields based on M0.3 and M0.4.
- Activity layers must model timed stages, row jobs and the pinned brief. Don't flatten them into game fields.
- Add schema validation, defaults, serialization and a version number.
- Replace the placeholder cards in `Engagement.tsx` with real editing of the common layer fields. Style-specific panels come from the registry.

**Converter, first version**
- Extend `fromSlideForge.ts` so the `default: return null` case fills the new layers from classic game, activity and feedback slides, instead of dropping them. Replace the `join` slide's bullets-and-a-note stand-in with a real join layer.
- "Insert a saved game…" in the Engagement tab reads a saved game from the library and converts it into a layer. **Classic's Quiz studio is not changed** (hard rule 7).
- Import the four game slides the Layout bank currently drops, and every classic game you can find, as fixtures. M7 onward is tested against real decks, not made-up ones.

**Done when:** a lab deck with all three layer types saves, reloads and validates, round-trip tests pass, and every fixture converts without loss or with its loss reported.

---

## M3 — Player contract

Extend `DeckPlayer` in `lab/src/engine/player.ts`. Keep it small; game drawing does not belong here.

- **Steps inside a slide**, so a game can move through question, answering, reveal and leaderboard, and an activity can move through its timed stages. Add `step`, `nextStep()` and `prevStep()`, and have `next()` move through steps before moving to the next slide. The lab's existing click-builds are steps too; both must use the same mechanism.
- **Typed events** to replace the single `onChange`: `slideenter`, `slideleave`, `stepchange` and `presentstart`/`presentend`.
- **A game stage.** Add an HTML mount point that sits exactly over the canvas and follows its transform through resizing, letterboxing and fullscreen. Expose the slide-to-screen transform so game components can position themselves in slide coordinates. `Present.tsx`'s YouTube iframe is the precedent.
- **Hooks for a presenter window and the rail.** The presenter runs in its own window, as `presenter.html` does today, so the contract must work across windows, through `BroadcastChannel` or `postMessage` as the classic windows already do.
- **The same contract runs in the export player** (`player-entry.ts`, built by `vite.player.config.ts`), so M5's shared-lesson viewer and M12's export get it for free.

**Done when:** a dummy HTML component placed on a slide stays aligned at every window size and in fullscreen, a second window follows slide and step state, and steps and events have tests.

---

## M4 — Registry

Create `lab/src/games/registry.ts`. It replaces every classic per-style registration point with one definition per style:

```ts
interface GameStyleDefinition {
  id: string;
  kind: 'game' | 'feedback' | 'activity';
  label: string;

  // Data and flow
  schema: /* validator + defaults for the layer fields */;
  steps: (layer) => StepId[];
  fromClassic: (slide) => LayerFields;      // the converter's per-style part (M2, M13)

  // Authoring
  Editor: React.FC<EditorProps>;            // Engagement tab panel
  aiSpec: AiSpec;                           // from ai.js AI_SPECS; calls /api/ai/generate
  playbook: PlaybookEntry;                  // playbook entry

  // Presenting
  Wall: React.FC<WallProps>;                // HTML wall, driven by room state
  presenterPanel?: React.FC<PresenterProps>;

  // Room
  phoneMode: string;                        // must match existing join.html modes
  score: (answers, layer) => Results;       // from src/games core
  relayMarked: boolean;                     // true only where the relay marks (K29)
  manualEntry?: ManualEntrySpec;            // teacher entry by key (manual.html protocol)
  supports: {
    teams?: boolean; bossBattle?: boolean; rounds?: boolean;
    boards?: boolean; classReport?: boolean;
  };

  // Practice
  rehearsal?: RehearsalSpec;                // rehearsal class (demo.js)
  solo?: SoloSpec;                          // solo practice (GA-28)
}
```

- Activities extend this with their stage and row-job definitions from M0.3.
- If M0.3 finds any other per-style registration point in `AGENTS.md`, add a slot for it. **Nothing a style needs may live outside its definition.**
- Adding a style must mean adding one folder, `games/styles/<style>/`, and registering it once. The folder follows M1.5: a definition file, `Wall.tsx`, `Editor.tsx`, the scoring and the AI spec, each within the file budget.
- Document how to add a style in `AGENTS.md`, in a new lab section.

**Done when:** the registry exists with its types, tests and docs, and a dummy style fills in every slot and renders.

---

## M5 — The lab registers as a shell engine

**M5 — status (25 Sep 2026).** Done early, before M0–M4, and differently in four places:

| The plan says | What was built | Why |
|---|---|---|
| Mount the bundle into the page | A same-origin frame over the workspace (`js/lab-engine.js`) | The lab's CSS shares class names with SlideForge's (`.thumb`, `.row`, `.modal`, `.hint`); a frame keeps both working without scoping every rule first |
| One library, moved to IndexedDB | The lab keeps its IndexedDB store; SlideForge's store gets a Library card per lab lesson | The localStorage library cannot hold lab decks; cards made the Library work now without moving it |
| A lab viewer for shared lessons | Share sends the bridge's lesson to `view.html` | Read, practice and follow links all work, and a follow link matches the live room |
| `hostLive()` says "not available" until M7 | The bridge runs Host live, Teacher Presenter and Rehearse | So lab lessons can be taught with a room now |

**Done:** the lab is the `deck` engine, in the whole workspace, with one set of File controls (the lab's own document row and Present are hidden in the frame). Name, Save, ⌘S and the palette work on the lab deck. File → Open saved lesson lists lab decks, and File → Import takes lab or classic files. Restore points work. The classic editor's paste and context menu stand down while the lab is on screen. A loading state covers the lab's start, and a clear failure message (for example, no WebGL2) links to the classic studio. The PDF handout and practice notes work for lab lessons.

**Still owed from M5:** the shell library in IndexedDB (and with it, retiring the cards); routing `SF.Editor`'s other uses and the Library's opening through the engine interface; moving `sizeCanvas`, `setZoom` and the notes strip into the classic engine; the lab's commands in the palette; the check that `lab-app/` is current; acceptance items 4–6 and 8 as written; and the feature map rows.

**Building the bundle**
- Build the lab as a bundle the shell loads from `index.html`. Set Vite's `base` for the path it is served from, and use hashed file names so the hand-bumped `?v=` queries aren't needed for it.
- **Commit the built bundle**, as `js/model.js` is committed, and add a check to `npm test` that fails when it is stale (the lab equivalent of `build:check`). Render's `npm ci --omit=dev` then needs no change, because it never builds the lab. Check `git status lab/` before committing the bundle: another agent's unfinished lab work would be built into it.

**Mounting**
- The bundle mounts into the **whole workspace area below the shell bar**, not only the stage. The lab has its own filmstrip, layers panel and inspector. While the lab is the active engine, the shell hides its rail and `#inspector`.
- It calls `SF.Shell.register(...)` with the full engine interface: `doc()`, `setDoc()`, `blank()`, `store`, `draw()`, `play()`, `settings()`, `hostLive()`, `flush()` and `keydown()`.
- The lab engine has **one workspace**. Games, activities and feedback are layers inside it. During migration the classic engines stay registered beside it (hard rule 7: nothing new is added to them).

**Controls**
- Remove File, export and present from the lab TopBar. It keeps editing tools only. The shell's File menu, Library, Share, palette and shortcuts drive the lab through the interface.
- Register the lab's commands with the shell's command palette.
- Undo stays in the lab's store and is reached through `keydown()`. Restore points (`SF.History`) work on the lab deck unchanged.

**Decoupling the shell** (from M0.7)
- Route the `SF.Editor` calls (`install`, `useLesson`, `findInDeck`, `openAiSmokeTest`) through the engine interface or the palette.
- Replace the shell's direct use of `SF.Store`, `SF.GameStore`, `normalizeDeck` and `normalizeGame` with one library. Each engine supplies its own normalizer through `store`.
- Move `sizeCanvas`, `setZoom` and `installNotesStrip` out of the shell into the classic Lesson engine. They go when that engine goes (M15).
- Make the shell's Host live call the active engine's `hostLive()` instead of `SF.Live`. The lab's `hostLive()` shows a clear "not available yet" message until M7.
- Retarget `markdownToDeck`, `LessonBank` and `shareLessonDoc` so they produce and read the lab deck format when the lab engine is active.

**One library, in IndexedDB**
- **Move the shell library's storage from localStorage to IndexedDB first.** Its features (folders, bundles, export to folder, Open) stay the same. Migrate the existing localStorage stores on first load, keep them until the migration is confirmed, and keep working without IndexedDB, as `js/history.js` already does.
- Then the lab saves through the shell's library. Migrate any decks in the lab's IndexedDB store into it, and retire the lab's separate store.

**Sharing a lab deck**
- Classic `view.html` can't show a lab deck. Add a lab viewer page that loads the export player (M3) and reads `/api/share/<id>`. The shell's Share sends a lab deck there and a classic deck to `view.html`.
- Shares are capped at 8 MB (`MAX_DOC`). When a lab deck is too big, Share says so and offers File → Export instead. Don't raise the cap (hard rule 5).

**Acceptance test**
1. Switch to the lab engine in the shell.
2. New, Open, Save, Export, Import, Library, Share and the command palette all work on a lab deck.
3. Undo and redo work through the shell's shortcuts, and a restore point can be taken and restored.
4. A deck saved from the lab appears in the shell library, in a folder and in a bundle.
5. A lab deck with ten full-size photos saves, reloads and appears in the library.
6. A shared lab deck opens in the lab viewer on another device.
7. Only one set of File controls is visible.
8. `grep` confirms the shell no longer references `SF.Editor`, `SF.GameStore`, `sizeCanvas`, `setZoom` or `installNotesStrip` outside the classic engine code.
9. The classic engines still work as before, and `npm test`, `npm run smoke` and `npm run visual:check` pass.

Update the feature map rows the shell now fills: Studio switch, File → New and Share. Host live is filled at M7.

---

## M6 — Deploy on the relay origin

- The committed lab bundle is served by the existing static server from the **same origin** as the relay and `join.html` on Render. No server or `render.yaml` change should be needed. If one is, stop and ask.
- Check that the WebSocket address, join links and QR codes are all derived from that origin and work.
- Document the build and deploy steps: how the lab bundle and `js/model.js` are built and checked together, and that `deploy-render` is pushed only when asked, as a fast-forward.

**Done when:** the deployed shell loads the lab engine, the lab opens a WebSocket to the relay, and a phone on a real network reaches `join.html` from a lab-generated QR code. Note how long the first request took after the service had spun down.

---

## M7 — Live host and pilot style (end to end)

- Build the host in `lab/src/live/`. It covers the room connection, a reconnect policy, a room state store, host commands, locked messages, `manualAnswer` and journal records. It speaks the protocol exactly as documented in M0.2, including the `manual.html` window protocol, so the existing teacher-entry window works unchanged.
- The reconnect policy must cover the relay restarting (a deploy or a spin-down drops every room), not only a phone dropping.
- The lab engine's `hostLive()` starts it, so rooms are started from the **shell's Host live**.
- The host listens to player events from M3 and sends the matching room messages.
- Port the pilot quiz style from M0.3 as the first registered style, filling in every registry slot.
- Add **solo play in Preview**, so the style can be played without phones.
- **Build the replay test harness.** It feeds a recorded M0.2 session into the lab host and compares the messages the lab host sends against the recording. Timestamps and ids are normalised before comparison. It runs from the root `npm test`.

**Acceptance test.** Do this manually on the deployed app from M6, and write down the steps:
1. Open a lab deck in the shell and choose Host live.
2. Join from two or more phones using the existing `join.html`.
3. Answer. The tallies update live, and reveal, leaderboard and advance all work.
4. Refresh a phone mid-question. It rejoins.
5. Enter an answer by key as the teacher, from the existing `manual.html`.
6. The pilot style's replay tests pass.
7. `grep` confirms no lab file imports `js/live.js`, `js/player.js`, `src/render/` or `SF.Player`.

Update the feature map: Host live.

**⛔ Review gate 2: architecture check.** Stop here. If anything in the engine interface, the player contract, the registry, the host or the replay harness needed a workaround, report it before porting more styles.

---

## M8 — Port the remaining game styles (30 in total)

- Port one style per PR, in the difficulty order from M0.3.
- Each PR includes:
  - the style definition with every slot filled;
  - its wall component and editor panel;
  - scoring tests;
  - passing replay tests against its M0.2 recordings;
  - a parity checklist covering its GA audit items.
- Tick the style off in `style-inventory.md`, the feature map and `docs/games-premium-audit.md`.

**Done when:** all 30 game styles run live from the lab and pass their replay tests.

---

## M9 — Audience feedback kinds

- Port poll, word cloud, brainstorm and scale through the registry as `kind: 'feedback'`.
- Each one includes its replay tests and parity checklist.

**Done when:** every feedback kind runs live and passes its replay tests.

---

## M10 — Activities system (54 activities)

This is a separate system from games. Port it on its own terms:

- **Timed stages**, driven by player steps (M3) and the activity layer (M2), following the logic in `stages.js` and `PRESENTATIONS.stages`.
- **Row jobs**: `[note]`, `[talk]`, `[send]`, `[work]`, `[down]`, and a row's job read from its words.
- **The pinned brief.**
- The **Stations clock**, if M0.6 moved it to the lab backlog.

Port one activity family per PR, with replay tests where the activity uses the room, and a parity checklist covering its AC audit items. Tick each one off in `docs/activities-premium-audit.md` as well as the inventory, and tell the activities session, which owns that audit.

**Done when:** all 54 activities run from the lab and meet their AC criteria.

---

## M11 — Cross-cutting room features and the presenter window

- Build teams and rosters, the boss battle, rounds, boards and class reports in the lab live host, using the `supports` flags in the registry.
- Class reports are read from `/api/sessions/`, as today. On the free plan they last until the next deploy or restart; say so in the report screen rather than implying they're kept.
- Build the presenter window as its own window, replacing the game and activity parts of `presenter.html`. Include room status, player count, timer controls, reveal controls and the rail.

**Done when:** every cross-cutting feature listed in M0.3 works in the lab, and the presenter window can drive a full session.

---

## M12 — HTML export with the game runtime

- The shell's Export, run on a lab deck, bundles the game runtime and live host into the export player, following the same approach as LAB-15 for YouTube.
- An exported deck opened from a file can't reach a relay by a relative address. It needs the relay's address baked in (the deployed origin by default), and it has to say clearly when it can't connect.
- Test that an exported deck hosts a room with no editor or shell loaded.

---

## M13 — Classic-to-lab converter, complete

M2 built the converter's first version. This milestone completes it.

- Cover every game, activity and feedback field from M0.4.
- Make the converter self-contained. It reads the classic format from its own schema description, not by importing `src/model.js`, so that it keeps working after the classic model is deleted.
- **Batch mode** reads classic decks and games from the shell library (M0.5) and writes lab decks back into it. It never deletes the originals, and it produces a report of anything it couldn't convert.
- Build a fixture set with at least one classic deck per game style, feedback kind and activity family. Test that converted decks validate and play.

---

## M14 — Parity check and deletion of the classic game, activity and live code

- Confirm that the feature map has no **Missing** rows for Engagement, Host live, activities or feedback.
- Confirm that the replay tests pass for every style and feedback kind, and that every GA and AC parity criterion is met.
- Confirm that batch conversion (M13) has been run on real libraries and its report reviewed.
- Move `src/games` and `src/activities` into `lab/src/games/core/`, and update the imports.

**⛔ Review gate 3.** Stop and get explicit approval before deleting anything.

After approval, delete these:
- the Quiz studio (`js/games.js`) and the Activities studio (`js/activities.js`), with their shell registrations and the `game` and `plan` workspaces;
- `js/live.js`, `js/live-activities.js`, `js/presenter-activities.js`, `src/render/quiz.js` and `src/render/live.js`;
- the classic activity stage code;
- the game and activity parts of `js/player.js` and `presenter.html` (as marked in M0.1);
- `SF.GameStore`, `normalizeGame` and every old per-style registration point.

Keep `manual.html`: it is a client, like `join.html`, and the lab host speaks its protocol.

Then update `AGENTS.md` so that games, activities and feedback are described only in their lab form. Run `npm run audit:render-surface` and record the removals in `docs/render-split.md` §7.

**Done when:** the shell hosts two engines (the lab and the classic Lesson studio), no classic game, activity or live code remains, the classic Lesson studio still works for non-game decks, and all tests pass.

---

## M15 — Lesson parity and removal of the classic engine (separate plan, gated)

This is out of scope for this plan. It is listed here so the end state is clear.

- Condition: the feature map has **zero Missing rows anywhere**. There are 66 today; the shell fills some of them at M5 and M7.
- Then delete the classic Lesson studio (`js/editor.js`) and its shell registration, the classic deck model (`src/model.js`, and with it the committed `js/model.js`), `js/player.js`, `presenter.html`, classic `view.html`, and the classic stage code moved out of the shell in M5 (`sizeCanvas`, `setZoom`, `installNotesStrip`).
- Reduce the workspace switch to one workspace. The shell keeps its engine interface.
- It needs its own plan and discovery. **Don't start it under this plan.**

---

## Definition of done (this plan)

- One shell driving the lab engine, which has one workspace, one deck format, one player and one registry for games, activities and feedback. There is also one live host and one library, the shell's, stored in IndexedDB.
- All 30 game styles, 4 feedback kinds and 54 activities work live from the deployed app, on one Render instance. Rooms are started from the shell's Host live, and phones and the teacher-entry window use the unchanged `join.html`, `manual.html` and relay server.
- Replay tests pass against the recorded classic sessions, and every GA and AC parity criterion is met.
- Adding a new game style touches one folder and one registry entry.
- No lab file is over 800 lines, and the boundary check passes (hard rule 13).
- Lab decks can be shared, and exported decks can host rooms.
- Classic decks and saved games convert automatically.
- The classic Quiz and Activities studios and the classic game, activity and live code are deleted. Removing the classic Lesson engine waits for M15.

---

## Change log

- **25 Sep 2026.** The plan moved into `docs/` and was reviewed against the site's current code and infrastructure. Changes:
  - **New section, "Infrastructure the plan runs on":** the Render free plan and its single instance, spin-down and throwaway filesystem; the committed `js/model.js` and the uncommitted lab build; the static server; the 8 MB share cap; two TypeScript versions; the lab's missing test runner; localStorage under pressure; and the `presenter.html`, `manual.html` and `view.html` window protocols.
  - **Restore points are not undo.** `SF.History` is `js/history.js`'s restore points and stays in the shell. The earlier plan to route it through the engine interface was dropped, and it was removed from the M5 grep check.
  - **The library moves to IndexedDB in M5**, before any lab deck is saved into it. Its features stay the same. Lab decks embed large images, and the localStorage library would stop saving.
  - **The lab bundle is committed and checked**, like `js/model.js`, because Render's build installs no dev dependencies and never builds `lab/`.
  - **The converter's first version moved to M2.** It fills the new layers from `fromSlideForge.ts`, and it provides real fixtures for M7 onward. M13 completes it.
  - **M2 no longer changes the Quiz studio.** "Insert a saved game…" reads saved games through the converter instead.
  - **Recordings are made from the host side**, never with a server tap.
  - **The lab mounts into the whole workspace**, and the shell hides its rail and inspector while the lab is active.
  - **`SF.Editor`'s other uses** (`useLesson`, `findInDeck`, `openAiSmokeTest`, `install`) were added to the coupling table.
  - **Sharing a lab deck** needs a lab viewer, because classic `view.html` can't show one (M5).
  - **`manual.html` is treated as a frozen client**, like `join.html`.
  - **The M1 test runner** is new. **M7's reconnect policy** covers relay restarts. **M12's export** gets the relay's address. **M11's class reports** say they don't outlast a deploy.
  - **Anti-drift:** three new rows were added (classic features that feed the lab, server taps, a second instance), and the classic-player row now covers `view.html`. **Hard rules:** rule 6 (one instance, committed bundle) is new, and rules 5 (`manual.html`) and 9 (`BACKLOG.md`) were extended.
- **25 Sep 2026, later.** **M1.5, restructuring the lab into kind folders**, was added before M2, following tldraw's one-util-per-shape registry and bulletproof-react's feature folders. The infrastructure section now records which lab files grow with every kind. Hard rule 13 adds a file budget (aim for under 400 lines, fail above 800) and import boundaries, both checked by a test. Two anti-drift rows were added for them. M4 now describes a game style as a folder, not a file.
- **25 Sep 2026, evening.** The plan now records what was built. "Where things stand" and the "Where we are now" diagram show the lab as the Lesson studio (commits `d9b1e64`, `41d9ea3`, `7b7a67e`). A new section describes **the bridge**, the temporary way Host live, Teacher Presenter, Rehearse, Share and the handout run a lab lesson on the classic player, and when it goes (M7, M11, M12). M5 has a status table of the four places it differs from the plan, and a list of what it still owes. The infrastructure section covers the committed `lab-app/` bundle, the `lab-lesson` smoke, the classic studio under automation, the lab's store and Library cards, and the frame. Four temporary steps were added to the anti-drift section, each with its exit condition.
- **25 Sep 2026, later.** **The live stage** is added (`4b5c9a5`): lab slides play live inside SlideForge's show, with its HUD, the rail and Teacher Presenter, and the lab makes room beside the rail. The bridge's section now says the pictures remain only for Teacher Presenter's thumbnails, shared links and the handout. A decision on order is recorded: **games and activities come last**, after the lesson side.
- **25 Sep 2026, later still.** The status table said M0 was next, which the order decision had overtaken; it now names the next step. The order is written out as a list, with a new item: **the converter keeps each slide's audience feedback and timer**, which converted lessons were losing.
- **25 Sep 2026, night.** Status brought up to date: the converter keeping feedback and timers is done (`1453965`), and "Next" is what M5 still owes, then the Missing lesson features. M6 records the push to `deploy-render`. A new section, **The three studios, one frame**, describes Quiz studio and Activities laid out as the Lesson studio (`a60f79e`, `d52e31e`), why that is not new classic work, and the gap it shows: activities added in Activities do not reach the lab lesson. The diagram and the temporary steps list include it. The feature map was brought up to date the same day.
- **26 Sep 2026.** **The converter builds experiments** (`d1921a0`): the 15 "Transform the chart" slides in Week 2 were being dropped, and now come in on the lab's experiment layer with their presets and states (62 of 67 slides, up from 47). **Lab copies are versioned** (`036281b`): `carried` is the converter's version, and an older copy gets the slide types later versions first build, put back in the lesson's order, without restoring a slide its author deleted. **`?lesson=` opens its lesson in the lab**: the editor opened it before the lab was registered, so the lab showed its last deck. The Checks stay SlideForge's, in line with the order decision: converting them before M7 would put a picture of the question on the wall in place of the playable game.
- **26 Sep 2026, later.** **Converted lessons keep their theme** (`fb70ad6`). Three losses, found from a SlideForge handout of Week 2: every lesson picture 404'd in the lab (SlideForge's relative `assets/…` addresses, read from `lab-app/`), now resolved from the site root; the themes' stylesheet artwork never reached the converter, now built as editable "Theme · …" layers by `lab/src/model/themeArt.ts` (NU London, UK Black Tech and the Institute, AI Awareness Day 2026, 2027's poster covers), with each theme's ground per slide type; and every AI Awareness strand came in as Safe's colour, now its own set. `carried: 3` brings older copies up to date when they open.
- **26 Sep 2026, evening.** **The classic studio is the default Lesson studio again**, decided with the owner after this morning's converted lessons lost their pictures and artwork. The lab is opt-in per browser: `?lab=1` (or `?classic=0`) turns it on and is remembered, `?classic=1` turns it off. With the classic studio showing, the lab's Library cards are left out of the Library and passed over at start-up. **A lab lesson's handout prints every step** (`SF.LabEngine.printDeck`): Week 2 is 102 pages again, as SlideForge's own handout is. The default goes back to the lab when it shows a lesson as SlideForge designed it.
- **26 Sep 2026, night.** **A lesson's games come into the lab** (converter version 4). `js/lab-engine.js` hands the lesson over with its games compiled by `SF.compileGame`; the converter builds them with `gameSlides`, the lab's own game code, so they play in the room through `src/deck/labshow.js`. Week 2's five Checks are each a question and its answer, without a cover as SlideForge plays them. The bridge no longer re-inserts a game the lab has built, and the handout prints it from its original. The `default: return null` note above now covers only games not in this browser's game store.
- **27 Sep 2026.** **The lab is the default Lesson studio again**, at the owner's word that its Engage is ready for use in the app (the classic studio's activity picker being the older catalogue). `?classic=1` turns the classic studio on for a browser and is remembered; `?lab=1` turns it off.
- **27 Sep 2026, later.** **The classic studios are retired** (`?classic=1` and a stored choice no longer bring them back; `useClassic` is gone). Only the browser smokes, under automation, still drive them until they are rewritten for the lab. Next in step 1: open lessons from the Library, the demo and New in the lab directly rather than through `js/editor.js`, then remove the classic studios' code.
- **27 Sep 2026, later still.** **Lessons open in the lab directly** (`5c72235`). The Library, the demo, File → reload and a `?lesson=` link call `SF.LabEngine.openLesson` / `openKey`; the classic editor's hand-over when it drew (`classicDeck`) is gone. The Library's rename, move and delete act on the lab's open lesson (`currentId`, `retitle`). New already opened in the lab. What still reads `SF.Editor`: the classic Quiz studio and Activities code (`js/games.js`, `js/activities.js`), the lesson strip and a few player look-ups (`js/render.js`, `js/model.js`), all for the classic copy only. Next in step 1: remove the classic studios' code and rewrite the smokes for the lab.
- **12 Oct 2026.** One app, before M7. Four changes:
  - **Dead code removed.** The last classic editor modules nothing called are gone: `src/editor/` panes, rail, arrange, artwork, header-footer and content-fields, plus `js/content-tools.js` and `js/slide-clip.js`, and their art and arrange bars in `index.html`. They are archived as the git tag `archive/classic-editor-2026-10-12`. `customize` and `deck-settings` stay, because the renderer and the room use them.
  - **The lab's own show is gone** (`lab/src/ui/Present.tsx`, the `presenting` state). Present is SlideForge's player everywhere; a blocked pop-up now says so instead of falling back to a second show.
  - **The built lab opened on its own** (`lab-app/index.html`) goes to SlideForge, which opens the same studio with the same saved lessons. The Vite development server keeps a bare lab.
  - **`SF.Docs`** (`js/docs.js`) reads both stores, and the backup carries Lesson-studio lessons ([data-storage-plan.md](data-storage-plan.md), step 1).

  Shipping the built-in lessons as lab decks was measured and **not done** yet. Measured again the same day, opening each lesson with its games as the Library does (the first count asked the converter without them, and wrongly put 39 game slides among the losses): **36 of the 42 lessons convert whole**. What the lab cannot build yet is 36 live figures (Weeks 5 and 7, both copies; they come in as a picture, and the show puts the live figure back), 15 motion slides (the Motion lab demo deck) and 4 AIAD 2026 slides (source check, shift, iceberg, spectrum). A frozen lab copy would also stop picking up converter fixes (`carryOnce`), so shipping them needs a build that reconverts on every converter change.
- **12 Oct 2026, later.** The lesson side, steps 1 to 3:
  - **The four AIAD 2026 infographics** (claim & source, then / now / next, iceberg, spectrum) are lab layouts (`layouts.ts`; converter version 14). Every AIAD 2026 lesson now converts whole.
  - **A live figure's data is on its lab slide** (`slide.figure`; version 15). The show plays the figure from there (`js/lab-engine.js` `figureSlide`), so a lab lesson no longer needs its SlideForge original for its figures. The figure is still drawn by `src/render/figures` in SlideForge's player. Drawing it on the lab's own canvas belongs with M7.
  - **The built-in lessons ship as lab copies:** 31 of them, in `assets/lab-lessons/`, built by `tools/build-lab-lessons.mjs`. A browser with no copy of its own takes the shipped one while the lesson's fingerprint (`js/lesson-hash.js`) and the converter version match, and converts otherwise. `tests/lab-lessons.test.js` says when to rebuild.
  - **What still converts in the browser:** the Motion lab demo (15 motion slides), and any lesson edited or changed since its copy was made.
- **12 Oct 2026, evening.** **M0 done; review gate 1 passed.** The discovery outputs are in `docs/games/` (player usage, shell coupling, protocol, style inventory, data sources, in-flight work). The session recordings (M0.2) are started but not complete: the recorder is in `tools/record-sessions/`. The bugs the discovery found are fixed in classic (live room, shell and saving, game content). Gate 1 decisions are in `docs/games/in-flight.md`: a viewing pass first, then classic is frozen to bug fixes (hard rule 7); no phone or teacher-entry changes before the freeze; real names are fine; the M7 pilot is plain Multiple choice.
- **12 Oct 2026, night.** **M1.5 done.** `lab/src` is in folders, each with an `index.ts`: `app/`, `core/`, `engine/`, `kinds/` (each kind's definition and drawing, with effects in `kinds/effects/`), `layouts/` by family, `charts/` by type, `decks/`, `designs/`, `experiments/`, `store/`, `theme/`, `ui/`, `export/`. The inspector is a frame that shows a kind's own panel. Two checks run from the root `npm test` (`lab/tests/file-budget.test.ts`, `lab/tests/boundaries.test.ts`); the file-budget allowlist is empty. A visual baseline (`tools/lab-baseline.mjs`) drew 1,670 slides before and after: 919 identical, 734 within 0.1% (antialiasing), 0 changed; 16 not comparable (a playing clip, or different between two runs of the old build). The export player builds; 594 tests pass.

- **13 Oct 2026.** **M7 slice 3: the shell's Host live runs the studio's own room for Multiple-choice lessons.**
  - **Routed.** `js/lab-engine.js` `hostLive()` asks the lab (`labApi.whyNotInStudio` / `hostInStudio`, `lab/src/app/embed.ts`). `canHostInStudio(deck)` (`lab/src/show/canHost.ts`, tested) says yes when every game on the shown slides is plain Multiple choice, at least one asks a question, and no slide has audience feedback, an activity, a live figure or a SlideForge check stand-in. Then the page asks for full screen inside the click, the lab's frame fills the viewport (`html.lab-show`), and the studio's show opens with its room. `?studioRoom=1` still works as a developer entry.
  - **Falls back to the classic Host live, unchanged:** any lesson with another game style, feedback, an activity, a live figure or a check; and any failure to start. The show's safety net: a relay that gives no PIN in 10 s, a host that throws, or a render error before Start closes the show, toasts the reason and runs the classic Host live. After Start a failure only ends the room, with a toast. Present, Teacher Presenter, Rehearse and Share are classic as before.
  - **Parity.** The question's clock counts from the ask, turns urgent at 5 s, and at zero reveals the answer, as classic's does (no clock while the teacher enters answers by key: the host sends 0). Classic has no lock step for a plain question (locking is Predict the Outcome's), so the press sequence is the one already matched: Next swallowed for 1.5 s, reveal, advance. The standings stay beside the slide through the game as classic's rail does (top 8, gain per question, join details, off above 60 people); S is the full leaderboard. Teacher entry: the show's bar opens `manual.html#<key>`, and the lab host (`lab/src/live/manual.ts`) serves its window protocol on the `sf-manual-<key>` channel (hello, add, rename, team, kick, delete, answer, tally, reveal, revealWith, report; state and errors back), tested against the real relay. The session is handed to the shell's Reports as classic does (`SF.Reports.track`, `recording`, `receive`, `refresh`), through hooks the shell passes in (`lab/src/show/hooks.ts`), so the lab names no shell global. Ending shows the final standings with "Open the report" and "Back to the lesson".
  - **Not ported yet:** resuming a studio room after the teacher's page reloads (classic's `slideforge.hostedRoom`); Teacher Presenter, notes on another device and Rehearse; the spoken-format commands of the entry window (ignored: not this style); the wall's bars do not include hand tallies; "revealWith" marks the room against the chosen option but the show still moves to the lesson's keyed answer slide. Replay tests cover the host; the browser path is `tools/smoke/studio-room.mjs`. The owner's acceptance steps are in `docs/games/m7-acceptance.md`.
  - **For review gate 2:** the shell lends the show hooks (so no lab import of classic); the frame is made full-viewport by a class on the shell's page; fullscreen is the page's, so the first Esc in full screen leaves full screen only.
- **13 Oct 2026.** **M8, first style after the pilot: plain True or false** runs in the studio's own room. The host needed no change (its question frame already matches the classic recording); the wall draws the reveal as two tiles. `canHostInStudio` now routes a lesson whose games are only Multiple choice and/or plain True or false; Showdown (the split and switch version) and every other style still open the classic Host live. Checked by a replay test against the classic recording, a routing test, a wall test, and `tools/smoke/studio-room-truefalse.mjs` through the real Host live button with two phones. Not checked on the deployed app or with real phones.
- **13 Oct 2026, later.** **M8: Type answer** (style `type`, typed recall) runs in the studio's own room.
  - **Host.** The question frame has `input: 'text'` and no options, as classic sends it. Typed responses are marked with `markResponse` (accents, case, articles, numbers, accepted spellings). The reveal sends `correct: -1` and the first accepted spelling. The teacher's typed entry from `manual.html` (`answer.text`) is sent as `manualAnswer.text`. The relay sends no `teamAnswers` for a typed reveal, so the room takes the `players` frame that follows as the confirmation, and a `markStale` takes it back.
  - **Wall.** On reveal it lists what the room typed, grouped by `answerLabel` as classic groups it (`live/typed.ts`), the right group marked, with the accepted answer said. While the question is open it shows only the count, as classic does, so phones cannot copy.
  - **Routing.** `canHostInStudio` accepts Multiple choice, plain True or false and Type answer; every other style, feedback, activity, live figure or check still opens the classic Host live.
  - **Checks.** The replay against `game-type.json`, `lab/tests/live-type.test.ts`, `tools/smoke/studio-room-type.mjs` and the `live-quiz boss lab-lesson studio-room` smokes passed before the owner asked for no more testing. The root `npm test` was not run for this change.
  - **Not ported.** Hand tallies are ignored for a typed question.

- **13 Oct 2026, later still.** **M8: a registry of room styles, and Slider on it.** The studio's room now runs Multiple choice, True or false, Type answer and Slider.
  - **The registry.** `lab/src/live/styles/` holds one file per style (`choice`, `truefalse`, `type`, `slider`), listed once in `styles/index.ts` (`STYLES`). An entry says its style key and game formats, the question frame (`input`, `range`), how a response is marked and written (`markResponse` and `answerLabel` by default) and what the reveal says, the wall's view model (`wall`: bars, typed groups or a number line), and how the teacher's entry by key is read (`manual`). The host, the manual bridge, the wall model and `canHostInStudio` read only from it. The three existing styles moved onto it with the same frames and wall (the replay tests are unchanged and pass). A new style is one file and one line in `STYLES`; one that needs a wall view the wall lacks also adds that view in `show/WallViews.tsx`. Time traveler is a different format on the same engine and is not covered.
  - **Slider.** The question goes out with `input: 'number'` and the line's range `{min, max, step, unit}`, as classic sends it. Answers are marked by the tolerance (`markResponse`); the reveal sends `correct: -1` and the answer with its unit (`1989 year`). The wall counts "n of m answered" while open; on the reveal it draws a number line with the band the target allows, the target and a dot per answer (right ones green, equal values stacked), and says the accepted answer. The teacher's number from `manual.html` (`answer.value`) is sent as `manualAnswer.value`, and the entry window is told `input: 'number'` with the range.
  - **Routing.** `canHostInStudio` accepts a lesson whose games are any of the four; everything else still opens the classic Host live.
  - **Checks.** `npm --prefix lab test` (116 pass), including `lab/tests/live-slider.test.ts` (registry, routing, frame, marking, manual entry, the wall's model) and a replay of `game-slider.json`. Both typechecks pass. Not run: the browser smokes, the root `npm test`, the deployed app or real phones. Hand tallies are ignored for a number question.
- **13 Oct 2026, last.** **M9: audience feedback runs in the studio's own room.** Poll, word cloud, brainstorm and scale, from a slide's `slide.feedback`.
  - **Host.** A slide with complete feedback (`live/feedback.ts`, through SlideForge's `normalizeFeedback`/`slideFeedback`/`scaleLabels` in `src/deck/feedback.js`, imported by the `@sf` alias) is a show step of activity `feedback`. Landing on it sends classic's frames (`at`, `prompt` {id `<slide>:fb`, kind, prompt, options, ends, max, presentAs, hold}, `idle`); leaving it sends `promptEnd`. The relay's `responses` are kept in the room state (`room.feedback`: the prompt, answered, players, the digest). `LiveHost.closeFeedback()` (classic's desk Close) ends the prompt and keeps it closed until the show leaves the slide; `showFeedback()` shows a held poll or scale. After a relay restart the prompt is sent again with the new room.
  - **Wall.** `show/feedbackWall.ts` (pure) turns the digest into poll bars, the scale's spread with both ends and the average, a sized word cloud (largest in the middle, deterministic) or idea cards (newest first); `show/FeedbackViews.tsx` paints it. `presentAs` rail sits beside the slide in a 560-wide panel in the standings' place; focus fills the screen. Wall text is 36px of a 1920 screen or more; the count is an aria-live region. The show bar gets **Show** (a held result) and **Close**.
  - **Routing.** `canHostInStudio` now accepts feedback slides: a lesson of studio-supported games and/or feedback prompts opens the studio's room (one with neither still says so and goes to classic). Feedback that is not complete (no prompt, a poll with fewer than two options, a scale without both ends) asks nothing, as in SlideForge, so the slide is only shown. A game slide that also carries feedback, an activity, a live figure and a check stand-in still open the classic Host live.
  - **Checks.** `lab/tests/live-feedback.test.ts` replays the host against the four classic recordings (`feedback-poll`, `-wordcloud`, `-brainstorm`, `-scale`: the frames match, the digests are kept) and covers close/hold, routing and the wall models; `npm --prefix lab test` passes (128) and both typechecks pass. Not run: the browser smokes, the root `npm test`, the deployed app or real phones. Steps for the owner are in `docs/games/m7-acceptance.md`.
  - **Not ported.** The teacher's quick poll (`feedback-quick-poll`, a prompt that is not on a slide); the idea spotlight and hide of the presenter desk; a Share stage's idea box and the proposals of Concept Chain, Connection and Compare (M10/M11); the teacher-entry window does not list replies.

- **13 Oct 2026, M11a: the studio's show has a presenter side.** Teacher Presenter window, notes on another device, and bar tools, in `lab/src/show/` and the new `lab/src/presenter/`.
  - **Teacher Presenter.** The bar's monitor button opens the lab-app as `?presenter=1` (`main.tsx` renders only `PresenterWindow`, no editor). It follows the show over a same-origin BroadcastChannel (`presenter/protocol.ts`: `hello`, then `deck` and `state` from the show; `cmd` from the window). It draws this slide and the next with DeckPlayers, the notes large and scrollable, slide x / y, elapsed time and a countdown the teacher sets (`10`, `5:30`, `90s`), the room's PIN, players, answers and reveal state, and the controls: next, back, reveal, show results, close prompt, black, white, jump to a slide, end. The show does a command as its own key would (`runCmd` in `Show.tsx`). With no window open the show does nothing extra. This is the lab's own protocol, not classic's `sf-presenter-cmd` desk (about 35 commands).
  - **Notes on another device.** The phone button opens a private channel (`show/prompter.ts`): its own WebSocket (a socket's role is fixed by its first message, so it cannot share the room host's), `prompterOpen`, then a `prompterState` per slide (title, notes, next, index, total, deck, startedAt, as `Player.prompterSend` builds it), `prompterCmd` next and prev from the device, closed with the show. The card shows the link and QR (`qr.ts`) and the number of screens following. `prompter.html` and the relay are unchanged.
  - **Bar tools.** Black screen (`B`, `.`) and white (`W`, `,`): the same key or a click brings it back, and a Next or Back on a blanked screen resumes it first. Overview (`O`): a tile per slide with arrow keys, Enter or a click to go. Typed jump: digits then Enter. Elapsed clock in the bar. In a room that has begun, a jump moves the room to that slide's step.
  - **Entry.** `?studioShow=1` adds Present (studio) to the TopBar: a show with no room. `labApi.presentInStudio(hooks)` is what the shell's Present will call at M15. The shell's classic Present is not replaced.
  - **Checks.** `lab/tests/show-presenter.test.ts` (protocol, desk state, notes frames and link against a fake socket, jump, overview, clocks); `npm --prefix lab test` and both typechecks pass. Not run, at the owner's request: browser smokes, replays, the root `npm test`; the window, the QR scan and a real phone were not tried.
  - **Not ported (M11b and later).** Draw and ink, Rehearse, the room tools of the classic desk (poll, break, reactions, blank phones, floor, reset scores), laser and spotlight (classic has none), the desk's Share stage and reading panels, slide thumbnails in the overview (tiles show number and name), the window's slide drawn live with builds (it shows each slide settled), a countdown that survives closing the window.

- **13 Oct 2026, M11b: teams and rosters, class reports, Rehearse and Draw in the studio's own show and room.**
  - **Teams and rosters.** A game slide's settings carry `mode` (individual or teams) and `teams` (two to six names), edited in the Slide panel's Game section (Room). The room takes them from the first game in the lesson, as classic's `buildRunDeck` does, and the host opens the room with them (`live/teams.ts`: `roomPlay`, `normalizeTeams`; `RoomShow.mode`, `teams`). The lobby lists each team in its colour with its players; the teacher can paste a class list (a name a line, `parseRoster`) and add it to a team (the host's `manualAdd`, as manual.html does). The standings rail and the final board show team points: the relay's own `players.rows` (it averages each team's gains) with the members' average as a fallback (`teamBoardOf`), with each team's gain on the question. Show keys are not taken while a text box has focus.
  - **Class report.** The ended room's screen has **Class report**, which reads `/api/sessions/<id>` with the host's token (`show/classReport.ts`, `ReportScreen.tsx`): each question's accuracy and who answered what, attendance and points, two CSVs (answers, attendance; a leading `=`, `+`, `-` or `@` is quoted away as classic's export does), and a note that on the free plan the record lasts until the next deploy or restart. The projection is the relay's (`server/sessions.js`); nothing is recomputed. The shell's own Reports stays beside it as **Open in Reports**. The Adapt report is not ported.
  - **Rehearse.** The bar's people button runs the lesson with 8, 16 or 24 simulated learners (`lab/src/rehearse/`): phones that join the real relay by its PIN over WebSockets, pick a team when asked, and answer choice, true or false, type answer and slider questions and feedback prompts with the model's accuracy (about two thirds on average, wrong choices leaning to one lure) and timing (spread over the question's time), then say how sure they were. From a plain show the button reopens the lesson as a room with the class set to join. This is not classic's local demo (`js/demo.js`, which never touches the relay): the answers, scores and report are the relay's, so a rehearsal is ended before teaching.
  - **Draw.** The pen button or **D**: a transparent 2D canvas over the slide, never in the WebGL canvas (`show/ink.ts`, `InkLayer.tsx`). Pen, highlighter, eraser (takes the marks it passes), six colours, undo (Z), clear (X), Done (D, Esc). Points are fractions of the stage, so marks survive a resize. Marks belong to their slide and are cleared on leaving it, as classic's ink is (`Ink.keep` keeps them for the show; no control for it yet). The canvas takes the pointer only while Draw is on.
  - **Checks.** `lab/tests/live-teams.test.ts`, `show-report.test.ts`, `rehearse.test.ts` (a simulated class against fake sockets) and `show-ink.test.ts`; `npm --prefix lab test` and both typechecks pass. Not run, at the owner's request: browser smokes, replays, the root `npm test`, a real relay, real phones, the report against a real session. Steps are in `docs/games/m7-acceptance.md`.
  - **Not ported.** The boss battle, rounds and boards, the Adapt report, race lanes per team, saved class lists (`sf-class-lists`), a team picked or moved from the lobby wall, roster management in the report, ink drawn from the presenter window, spotlight, and a keep-marks toggle. The rehearsal class answers only the styles and feedback kinds the studio's room runs.
- **13 Oct 2026, M15 steps 1 to 6 (of `games/m15-discovery.md` section 6): two deletions, and the flagged switch for Present.**
  - **Deleted.** `view.html` no longer loads `js/lessons.js` (one line; a 683 KB download saved on every shared-link open). The editing half of `src/editor/customize.js` is gone: the Look pane (`inspector`), canvas block editing, inline editing, `tagControls`, `bind` and `removeBullet`. `SF.Custom` keeps `motion`, `paint`, `layout`, `rebase`, `apply` and `entry`. The file went from 1,305 to 314 lines, and `js/model.js` shrank with it (about 2,060 lines deleted in all, counting the bundle). `tests/customize.test.js` lost the `removeBullet` test; `tests/charts.test.js` and `tests/cover-motion.test.js` lost the assertions that read removed source (the chart inspector's dropped-rows warning, and the size ramp's option list; the scales and the fit check stay); `tools/smoke/demo-deck.mjs` lost its canvas-editor and format-toolbar block and now checks that `SF.Custom` has `paint` and `apply`. `css/customize.css` was **kept**: 135 of its 147 class names are still used by the renderer, the shell or the lab (the composition `cp-*` rules among them); a trim of the dead rules is not done.
  - **Not done.** The hidden classic stage in `index.html` (discovery step 3): too risky without a browser.
  - **The switch.** `whyNotPresentInStudio(deck)` (`lab/src/show/canHost.ts`, with `lab/tests/show-present-guard.test.ts`) is the guard: `canHostInStudio`'s blockers without the must-ask clause, and it also refuses a lesson with every slide hidden. `labApi.whyNotPresentInStudio` and `presentInStudio(hooks, first)` (`lab/src/app/embed.ts`) lend it to the shell; `first` puts the Teacher Presenter window (`'desk'`) or the notes card (`'notes'`) up as the show opens. The show's `exited` hook now carries the slide it ended on (the show already selected that slide in the editor, so Present again goes on from there: blocker 8). In `js/lab-engine.js`, `ws.play`, `teacherPresenter` and `btnNotesElsewhere` open the studio's show **only** when the flag `slideforge.studioPresent` is `'1'` and the guard passes; otherwise, and if the show fails to start (it then falls back to the classic player), nothing changes. **The flag is off by default.** The owner turns it on from File → "Use the studio's slideshow (trial)", or `?studioPresent=1` (`0` turns it off). `?labPresent=1` (the lab window's "Present in SlideForge") stays classic. Rehearse stays classic (blocker 6).
  - **Checks.** With the flag off, nothing behaves differently: `npm test` (609), `npm --prefix lab test` (165) and both typechecks pass; smokes `share`, `demo-deck`, `design-foundations`, `lab-lesson`, `live-quiz` and `refresh` pass. `studio-room` fails at its last step ("Open the report" times out) **on `m15` without these commits too**; not caused by this work, not yet looked into. The flag-on path is not run in any browser test: it is for the owner's spot check (`games/m15-spot-check.md`).
  - **Still gated.** Resume after a reload (blocker 7), the shell standing down while the studio's show is up (blocker 9, `js/shell.js:1812`), solo answers on a question slide (blocker 3), the native student PDF (blocker 5), and the classic content renderers and `js/print.js`, which wait on the owner's trial and on the PDF. Draw (blocker 2) was built in M11b.

- **13 Oct 2026, M8: five more styles in the room's registry.** Ranking, Odd one out, Predict the outcome, True / false showdown and Time traveler run in the studio's own room, each as a file in `lab/src/live/styles/`. The studio's room now runs ten entries (Multiple choice, True or false, Type answer, Slider and these five); every other game format, activity, live figure or check still opens the classic Host live.
  - **What the registry gained.** `gains` (part marks and bets sent beside the verdicts), `gate` (the one step before a reveal: `closeAnswers` or `showdown`, sent on the first Next; `host.gate()` also serves a timed Showdown's half-way split), `match` (an entry told by a flag on the question, not by its key: `predict`, `showdown`, or the game format), `flags` (fields on the question frame), `companion` (role, text and heading the phones are told), `held` (never revealed by itself), `afterReveal` (a brainstorm prompt the room is asked once revealed), `scoreSlide` and `link` (a game's questions made into one set). `RoomState` has `gated` (ids whose gate step was sent) and the tally keeps the relay's `split` and `switched`. A reveal for any question that is not a choice is confirmed by the relay's `players`, not by `teamAnswers` (it sends that for choice only).
  - **Ranking** (`order`): input `order`; the reveal carries `gains` of round(10 x share in place); the wall draws the right order with a heat bar a place and the most swapped pair. The teacher's entry sends `order`.
  - **Odd one out** (`oddone`): `role` `discuss` and its text on `at` and the question; unmarked; the reveal then a custom brainstorm "Defend a pick" prompt, closed on the next step; no scores step.
  - **Predict the outcome** (the `choice` engine with `predict`): `closeAnswers` on the first Next; bet gains; the wall shows the split once locked, the answer hidden.
  - **True / false showdown** (`truefalse` with `showdown`): `showdown` on the first Next; the wall draws one bar with the room's votes now and a marker where it stood; the second Next reveals.
  - **Time traveler** (`slider` with the game format): one span for the game and a timeline that grows, built from the game's questions when the show is made; `timeTravel` and `timeline` on the question; the wall names the events already placed under the line.
  - **Checks.** `lab/tests/live-replay.test.ts` replays `game-ranking`, `game-odd-one-out`, `game-predict-outcome`, `game-true-false` and `game-time-traveler`: the frames match the classic recordings with the existing normalisation (the replay now names the first differing frame, with keys sorted). Unit tests in `live-order`, `live-oddone`, `live-predict`, `live-showdown` and `live-timetraveler`. `npm --prefix lab test` (181) and both typechecks pass. Steps are in `docs/games/m7-acceptance.md`. Not run: browser smokes, the root `npm test`, real phones or a real relay.
  - **Differences from classic, kept.** The replay's show is the starter's questions, so the Time traveler span and timeline are checked by a unit test, not by the replay. A Showdown with a time limit shows its split half-way by a timer in the show (not replayed). Time up still reveals a held style (classic's time-up path for Odd one out, Predict and the Showdown was not checked). The Odd one out wall shows its ideas as cards beside the reveal; the classic desk's spotlight and hide are not ported. Rehearse answers a Ranking with the right order or two swapped, and the other new styles as choices or numbers; it does not lock or switch.
- **13 Oct 2026, M8: five more styles in the room's registry (Spot the error, Definition challenge, Emoji guess, Fill in the blanks, Compare & contrast's sort).** They run in the studio's own room, each a file in `lab/src/live/styles/`; the room now runs fifteen entries. **Still the classic Host live:** the other game formats (Quiz bowl, Beat the clock, Boss battle, Horse race, the memory games, Heads up, Spin & explain, Connection maker, Random challenge, Concept chain, Bingo, Question cube, Word reveal, Low-stakes quiz), Compare & contrast's discussion mode (a question with `compareDiscuss`, which the new `unsupported` hook of the entry sends to classic), activities, live figures and checks.
  - **What the registry and host gained.** Inputs `tap`, `fill` and `sort` (`QuestionFields`, `ManualChoice`, `ManualEntry`; the teacher window is told `gaps` and `bins` through the entry's `manualQuestion`); `reading` (a phase before the question: `at` and `idle` say `watch`, the question is asked on Next or when the clock runs out, `host.ask()`); `help` (steps released one a Next before the reveal, `host.release()`: `hintOut` ahead of the hint, then `at` with the next `step`); `unsupported`; `companion(q, phase)`; the question frame's `clueMode`, `clues`, `fillParts` and `bins`; and `at.headPrompt` falls back to the question's own heading, as classic's phone companion does. Three host corrections the recordings showed: a `markStale` is answered only for the question still on the wall and not after `end`; a Next moves on from a reveal the host has sent even if the relay has not confirmed it (classic's own record of what it revealed). A lab question is held compiled (its starter carries `errorFrom`, `gapAnswers`, `sortAnswers`), so Spot, Fill and Compare compile an authored question only when it still has the author's fields, and leave a compiled one (and its drawn bank order) alone.
  - **Spot the error** (`spot`, input `tap`): the words are the options; a tap inside the error's span is right; the reveal says `mitochondria -> chloroplasts`; no scores slide; the wall's heat (a bar under each word, the error struck out) appears at the reveal only.
  - **Definition challenge** (`definition`, input `text`): the reading phase above, its clock the question's time (20, 30, 45 or 60 s, else 30), then "Recall from memory" and a typed reveal. The lab's three slides of one question (read, recall, answer) are one step; the wall shows the recall slide once the question is asked (`Step.ask`).
  - **Emoji guess** (`emoji`, input `text`): the pattern is a step only on a medium puzzle (easy shows it from the start, hard has none), then the hint, last; the relay halves answers after `hintOut`, so no gains. The lab's support layers (`emojiSupport`) now release in that order, and a build of the slide on an open question is forwarded to the room (`Show.tsx`, `host.release()`), so the wall and the relay agree on when the hint is out. Lessons saved before this keep the old click order until the difficulty is set again in the Game panel.
  - **Fill in the blanks** (`fill`, input `fill`): the bank in `options`, the text around the gaps in `fillParts`; `gains` of round(points x gaps right); the wall holds the picks until the reveal, then the passage with the right words and, gap by gap, what the room put there.
  - **Compare & contrast, the sort** (`compare`, input `sort`): the columns in `bins`; no role and the heading "Sort it"; `gains` of round(points x statements right) (the sort's points are 0 unless the Game panel sets them); the reveal says no answer in words; the wall lands each statement in its column with the room's counts and names the one most misfiled.
  - **Checks.** `lab/tests/live-replay.test.ts` replays `game-spot-the-error`, `game-definition-challenge`, `game-emoji-guess`, `game-fill-in-the-blanks` and `game-compare-contrast`: every frame matches. Unit tests in `live-spot`, `live-definition` (the reading phase with a mock clock), `live-emoji`, `live-fill`, `live-compare`, and `live-starters` (each style's real starter game, hosted, marked right by its own answer and by a simulated learner). `npm --prefix lab test` (207) and both typechecks pass. Steps are in `docs/games/m7-acceptance.md`. Not run: browser smokes, the root `npm test`, real phones or a real relay.
  - **Differences from classic, kept.** (1) Classic sends each Definition recall `question` twice (the slide, then its `definitionAsk` event); the lab sends it once, and the replay drops an identical consecutive `question` from the recording on that ground. (2) The recording's two teacher entries for Definition came during the reading, before the question: the relay refuses them; the lab sends them too. (3) Classic's compile shuffles the Fill bank and the Compare statements at random, so each recording has its own draw; the replay puts the recorded draw on the show (the starter's own column for each statement), and says so. (4) In the Compare recording the relay refused the last two reveals as stale; neither host sends them again (one arrives for a question the show has left, one after `end`). The lab's `revealed` therefore reads 2 of 4 there. (5) Definition's reading clock is the host's, not the classic desk's: the desk's "+30 s to read", the reading countdown on the wall, and classic's grace before the first Next asks are not ported. (6) The wall does not say "HINT - answers now score half" when the hint is out (the lab's own hint layer is the cue). (7) The Teacher Presenter's Reveal command goes through Next, so on an Emoji puzzle with help left it releases the next step first. (8) Rehearse answers Fill and Sort questions with the right picks or one wrong; it does not use help or the reading phase beyond waiting for the question.
- **13 Oct 2026, M8: Horse race, Boss battle and Word reveal in the room's registry.** The room now runs eighteen entries (`lab/src/live/styles/race.ts`, `boss.ts`, `wordreveal.ts`). **Still the classic Host live:** Quiz bowl, Beat the clock, the memory games, Heads up, Spin & explain, Connection maker, Random challenge, Concept chain, Bingo, Question cube, Low-stakes quiz, Compare & contrast's discussion mode, activities, live figures and checks.
  - **Deck-level mechanics.** The room takes its mechanic from the first game in the lesson (`RoomShow.mechanic`, `trackLength`, `bossHp`, read by `showFromDeck`), as classic's `buildRunDeck` does, and every question the room asks takes part. The host keeps the state across the questions (`lab/src/live/mechanics.ts`: `Race`, `Boss`), publishes it to the wall through `RoomState.mech` (not on the wire), and starts it again in a new room after a relay restart. A game's cover and scores steps now take the style of the game's questions (`horse-race` is the style `race`; before, a format name that is not a style gave `quiz`).
  - **Horse race.** On each `teamAnswers` the lanes move (a team whose members mostly picked the right answer; a tie, a wrong majority or nobody answering does not), the host sends `raceLanes` (leaders first), and the scores slide sends `finish` of kind `race` ("<name> finishes furthest along", or who is past the post). An individual race runs on each player's own right-answer count, from the `players` list the relay sends after `teamAnswers`. The track is 3 to 12 steps (`GameSettings.trackLength`, 5 when absent; the Game panel does not offer it yet).
  - **Boss battle.** The boss's HP is its own game's questions only (each by difficulty: 1, 2, 3, 5; two a question when nothing says). A question's difficulty is its damage, and the Game panel's difficulty and damage win. A reveal carries `gains` +1 for each right player; the hit lands on `teamAnswers` (team majority in a teams room, most of an individual room), the host tells the report (`oral`: "Q2 · medium · 8/11 HP left") and the scores slide sends `finish` of kind `boss`. The wall draws the health bar with the blow and the attack line. **Not ported:** the desk's Hit and Miss (classic's own fight is off in a live room: its HP is the room's).
  - **Word reveal.** The host drips the word (the opening letters by difficulty, then one more each `dripInterval`) and stops at the reveal or when the show leaves the question. Points are SlideForge's `wordRevealGains`, by the letters showing when each answer arrived (the answer's own time). The wall draws the dripping word and its hint as HTML over the question; once revealed, the lab's answer slide spells it out. Lessons with Word reveal no longer go to the classic host.
  - **Checks.** `lab/tests/live-replay.test.ts` replays `game-horse-race`, `game-boss-battle` and `game-word-reveal`: every frame matches. Unit tests in `live-race`, `live-boss` (HP from its own game, damage, hit rules, the wall) and `live-wordreveal` (the drip on a mock clock, points by letters shown, the wall). `npm --prefix lab test` (225) and both typechecks pass. Steps are in `docs/games/m7-acceptance.md`. Not run: browser smokes, the root `npm test`, and the new wall views (race track, boss bar, dripping word) in a browser: their layout was not looked at.
  - **Differences from classic, kept.** (1) The replay's show carries the recorded room's mode, teams and lead mechanic, and each step's phone skin is that mechanic (as classic's slides are). (2) Classic starts the drip when the question lands and lets it run on after the reveal; the lab stops it at the reveal (the wall shows the answer slide then). (3) Classic's boss and race tracks are drawn on the wall by SlideForge's player; the lab's are HTML panels at the top right (the word, in the middle) over the lab's own drawing, and the lab's slide for Word reveal still draws its own tiles under the word. (4) The race's winner note and the boss's blow lines are the wall's words, not a frame, so the replay cannot compare them; unit tests pin them. (5) The desk's Hit and Miss are not in the room (above).
- **13 Oct 2026, M8: the six spoken games in the room's registry (Random challenge, Question cube, Spin & explain, Heads up, Connection maker, Concept chain).** The room now runs twenty-three entries (`lab/src/live/styles/randomchallenge.ts` for both Random challenge and the cube, `spinexplain.ts`, `headsup.ts`, `connection.ts`, `conceptchain.ts`, on `spoken.ts`). **Still the classic Host live:** Quiz bowl, Beat the clock, the memory games, Bingo, Low-stakes quiz, Compare & contrast's discussion mode, activities, live figures and checks.
  - **The spoken desk** (`live/spoken.ts` pure, `live/spokenroom.ts` held by the host). The phones answer nothing (the question frame says `spoken: true` and the phone shows its listen-and-watch card). The teacher judges by voice: a verdict pad on the wall (a picker for who spoke, one button a verdict), or the entry window's `recipient` and `revealWith`. A verdict sets the question's `correct`, the reveal carries it with `gains: []` and `spoken: { recipient }`, and the relay credits it (one team in a teams room, the named player only when the game scores spoken; Random challenge, the cube and Heads up only count) and answers `oralCount`, which the wall shows. A verdict that would score waits for the speaker ("Clear: who spoke?") and the speaker completes it, or "count it for the room" lands it with no points; a Reject or Pass names nobody. A question closed by Next or its clock with no verdict takes the last option. The speaker is chosen per item and cleared after it, except Heads up's guesser, who keeps the round. The entry window now gets the speaker, the held verdict, the last credit, the count and the proposals.
  - **Random challenge and Question cube** are one entry on one engine (the cube's own verdicts Answered and Pass, and the wall names its face, the question's category). No scores slide.
  - **Spin & explain.** Three verdicts, With hint at half credit (500 of the relay's 1,000).
  - **Heads up.** One round clock for the whole pile, started when the first term lands (`roundSeconds`, which is the Game panel's seconds when set); the question frame carries `term`, `guesser` and `roundLeft`; choosing a speaker sends `guesser` (the relay keeps the term from that phone); a verdict moves straight on after 650 ms; when the clock runs out the open term closes with no verdict and Next skips the terms nobody reached. The host takes an injectable clock (`HostOptions.now`, `after`) for these timers, and the replay runs them on the recording's clock.
  - **Connection maker.** While the question is up an idea box opens (a quick prompt, `shape: 'bridge'`, `quiet`), and closes right after the verdict. The teacher puts a proposal on the table (the entry window's `useProposal`, or a chip on the wall): its author becomes the speaker. The wall shows the proposals without names. **Not here:** the drawn approved-bridge lines (a known open classic item).
  - **Concept chain.** Classic never asks the relay a question for a term: the phones stay `idle` and take part through the idea box (`shape: 'link'`). The lab does the same: the room holds the term as asked itself (`Room.askLocal`), and its reveal needs no word back from the relay (which sends none). Accept needs a typed link (the wall's box) or one put on the table; it adds a branch to the map and credits its author as it lands (`oralCredit`) and the term stays open; Accept with no link does nothing and says so; Reject puts the proposal down. Next closes the box first and then the term: Accept if the chain grew from it, else Reject. The wall draws the map (terms in order, the latest links, a dashed branch for the one being weighed).
  - **Checks.** `lab/tests/live-replay-spoken.test.ts` replays `game-random-challenge`, `game-question-cube`, `game-spin-explain`, `game-heads-up`, `game-connection-maker` and `game-concept-chain`: every frame matches. Unit tests in `live-spoken` (credit rules, a verdict, the held verdict, a question closed without one, the cube's face, the skins), `live-spoken-heads` (the round on a mock clock) and `live-spoken-proposals` (proposals, the table, an accepted link, the chain map). The replay harness moved to `tests/replay-kit.ts`. `npm --prefix lab test` (253) and both typechecks pass. Steps are in `docs/games/m7-acceptance.md`. Not run: browser smokes, the root `npm test`, real phones or a real relay, and the wall's new views (verdict pads, round clock, chain map, proposal chips) in a browser: their layout was not looked at.
  - **Differences from classic, kept.** (1) Classic draws the items of Random challenge, the cube, Spin & explain and Heads up in a fresh random order every run; the lab room asks them in the lesson's order (the order the author sees on the slides, whose own drawings say "Card 3 · 9 left"). The replay puts the recorded draw on the show, as the Fill and Compare replays do. (2) The replay runs Heads up's timers on the recording's clock: the move-on lands at the verdict plus 650 ms (classic's came about 10 ms later) and `roundLeft` matches (60, 57, 55). (3) Classic's wall shows Heads up's term, the wheel and the dice in its own drawing; the lab's slide draws those, and the wall adds the pads, the clock, the count and the proposals. (4) The Concept chain and Connection recordings hold no accepted link and no proposal (the recorded Accept had no link typed, and nobody sent an idea): an accepted link and the proposals' wall are covered by unit tests, not by the replay. (5) Classic sends every `at` twice (the existing normalisation drops the repeat). (6) The wall's pads, the speaker picker and the chain's box are the lab's own: the entry window is the classic one.
- **13 Oct 2026, M8: Beat the clock (the sprint and the wall-paced round) and the first board, Low-stakes quiz.** The room now runs twenty-five formats, twenty-four on the style registry and one board (`lab/src/live/styles/speed.ts`, `lab/src/live/speedroom.ts`, `lab/src/live/boards/`). **Still the classic Host live:** Quiz bowl, the memory games, Bingo, Compare & contrast's discussion mode, activities, live figures and checks.
  - **Beat the clock, the sprint (K29).** With every learner on a phone, landing on the run's first question sends `at` and then `sprint`: the run's questions with their key, the round's seconds and a sprint id (`<game>:<ms>`). The relay marks the phones' taps and reports `sprintProgress`; the first Next asks for a second ("Press Next again to stop the clock"), the second within 3 s (or the wall's Stop the clock) sends `sprintEnd`, and the relay's `sprintResult` (on `sprintEnd`, or at time on its own clock) closes the run: its questions count as revealed and Next goes past them. Leaving the game's slides with the run open sends `sprintEnd`. The wall shows the clock, the progress bar and "n answers in · n% right · n of n finished", then the room's right answers and the hardest question with its most-chosen wrong answer (classic's `sprintHardest`). The relay marks here and only here; nothing is extended to typed or ordered answers.
  - **Beat the clock, wall-paced.** With a teacher-entered learner in the room the run is not a sprint: ordinary Multiple choice questions under one round clock (`roundLeft` on each question frame), a pace per question (`paceSeconds`, SlideForge's `SPEED_PACE`) that closes it only when no learner is entered by key, the reveal's `gains` from SlideForge's `roundSpeedPoints` (10 and up to 10 for speed, -5 wrong), and the room's right answers added to the round's count and a move on after 1.5 s. When the round's clock runs out the open question closes and Next skips the questions nobody reached. The round is the speed desk's own (not `js/rounds.js`). The wall shows the round's clock and count at the top.
  - **The lab's deck shape.** The lab builds Beat the clock as a cover, the sprint slide (role `board`) holding SlideForge's compiled questions in `game.board`, and the answers slide. The room's show now makes each of a round's questions a step of that slide (`<slide>:<n>` for the second on, placed on the slide by `steps.ts`); the Game panel's seconds become the round's (30 to 600, 90 unset; `styles/speed.ts prepare`). The answers slide is the scores step. `canHostInStudio` accepts a round's questions and checks their style.
  - **Boards (`lab/src/live/boards/`).** Generic for the next batch (memory, bingo, quiz bowl): the board desk runs a board on SlideForge's own runtime (`@sf/boards/runtime.js` `createBoardRuntime`): the board's definition found among the game styles (`boardEngine`), a session for the board on the wall with its state per slide kept, frozen, while the show is elsewhere (time away is not counted), a clock on the host's clock (the replay runs it on the recording's), and a tick before each command. A board kind (one file and one line in `BOARDS`) says what classic's DOM engine does: its tick and commands, the phones' companion, whether its reveal draws the game's answer slide, the cover's text, and its wall model. A verdict goes to the journal as `oral` through the definition's `reportValue`. A board is a step of its own (`RoomSlide.board`): the room sends `at` and `idle` with the board's companion (`role: 'paper'` for Low-stakes); its buttons are `LiveHost.boardCommand`. The wall's board view is `show/BoardViews.tsx`.
  - **Low-stakes quiz.** The state and its moves are SlideForge's (`installLowStakes`: create, transition, formatClock); the whole-quiz clock runs only in the quiz phase; a reveal (early, or the clock running out) reports "5 questions · early reveal" or "· time up" by "The class". The reveal draws the game's answers slide, which is not a step of its own, and there is no scores step (the game has no scoreboard). The wall's bar shows the clock, the caption and the buttons (Start, Pause/Resume, Reveal, Finish, Play again).
  - **Checks.** `lab/tests/live-replay-speed.test.ts` replays `game-beat-the-clock` (the sprint) and `game-beat-the-clock-wall-paced`; `lab/tests/live-replay-boards.test.ts` replays `game-low-stakes-quiz`, its `board: click` steps played as the board's commands (the replay kit now hands steps it does not know to the test). Every frame matches. Unit tests in `live-speed` (the lab's deck shape, the sprint's wall and its hardest question) and `live-boards` (the lab's deck shape, the board's clock frozen away and its expiry reported). `npm --prefix lab test` (260) and both typechecks pass. Steps are in `docs/games/m7-acceptance.md`. Not run: browser smokes, the root `npm test`, real phones or a real relay, and the new wall views (the sprint's board, the round's clock, the board's bar) in a browser.
  - **Differences from classic, kept.** (1) The replays give the steps around a game its skin (`speed`, `count`), as the lab's show does and the replay's generic show does not. (2) The sprint's recording lands on only one of its questions, so the replay reads the other two ids off its `sprint` frame; the sprint id is the host's clock in each, and both normalise to "#n". (3) The replay's board step is set from the starter's compiled board slide (the lab's show builds it from `game.board`, checked by the unit test). (4) The rehearsal class does not sprint (as in classic), and the teacher-entry window has nothing to enter for a sprint or a board.
- **13 Oct 2026, M8: the memory boards, Bingo and Quiz bowl; and the show's overview shows each slide.** The room now runs all thirty formats: twenty-four on the style registry and six boards (`lab/src/live/boards/`: Low-stakes quiz, `memory.ts` for Memory flip, Memory match and Knowledge flip, `bingo.ts`, `bowl.ts`). **Still the classic Host live:** Compare & contrast's discussion mode, Mind reveal, activities, live figures and checks.
  - **The memory boards.** One kind for SlideForge's one engine (`installMemory`: create, transition, scores, winner) and its three presets: Memory flip (a study clock that runs into recall, one class collection), Memory match (the same with teams taking turns, a point a claim) and Knowledge flip (no study clock, the keywords stay up). The tick and the command are classic's runtime without the drawing: a claim or a pass of the chosen card goes to the journal as `oral` (the card, its term, and the team whose turn it was, none for one class collection). The board's step has the board's own kind as its skin (`memoryflip`, …; classic phoneStyle), so a kind can now say its step's style from its board (`BoardKind.styleOf`).
  - **Bingo.** A card per team dealt by SlideForge's engine (`installBingo`, with `bingoHasLine`), and the teacher as the caller: call a definition (the term hidden, every team "Waiting on an answer"), reveal it, then Claim or Missed on each team's card that has it. A line, and the next call finishes the round. A claim or a miss that changed a square goes to the journal (the square, the term, the team).
  - **Quiz bowl.** Cells by category and value to a target (`installBowl`): a cell opens its question in place of the grid, the reveal offers each team its award, and a cell is spent either way; the board ends when it empties or a team reaches the target. An award or "Nobody scored" goes to the journal with the cell's category, value and question, the team and the value awarded.
  - **The lab's deck shape.** A board that plays the whole game (`BoardKind.wholeGame`: memory, Bingo, Quiz bowl) is one step, on the slide that holds SlideForge's compiled board (`game.board`); the game's other slides (a study, the board, a card's answer, the set) are not steps, and there is no scores step, as in classic. Every board's game now has its board's mechanic around it ('count', 'claim', 'bingo', 'bowl'), as classic sends; before, the lab's show gave a Low-stakes quiz's cover Multiple choice's. The wall's full boards (`show/BoardViews.tsx`, `show/BoardGrids.tsx`) cover the slide and take card and team commands (`LiveHost.boardCommand(action, card)`).
  - **The show's overview (O, or the grid button).** Each tile draws a picture of its slide at 240 px (`renderStill`), one a frame, the tiles on screen first, cached per slide, so the show never waits; and a badge names a game, question, activity or feedback slide ("Quiz · Multiple choice", "Horse race", "Low-stakes quiz", "Activity · Think-Pair-Share", "Poll", "Word cloud"), from the style registry, a board's label, SlideForge's activity catalogue and the feedback kind (`show/badge.ts`). The number and name stay.
  - **Checks.** `lab/tests/live-replay-boards.test.ts` replays `game-memory-flip`, `game-memory-match` and `game-knowledge-flip`; `lab/tests/live-replay-bingo-bowl.test.ts` replays `game-bingo` and `game-quiz-bowl`; every frame matches. The board helpers moved into `replay-kit.ts`. Unit tests in `live-boards-games` (the lab's deck shape for all five, the memory study clock into recall and a team's claim, a bingo round to its line, a Quiz bowl award) and `show-overview` (the badges). The guard tests that used Bingo as a game the room does not run now use Mind reveal. `npm --prefix lab test` (277) and both typechecks pass. Steps are in `docs/games/m7-acceptance.md`. Not run: browser smokes, the root `npm test`, real phones or a real relay, and the new full boards and the overview's pictures in a browser.
  - **Differences from classic, kept.** (1) As for Low-stakes quiz, the replays give the steps around the board its skin and set the board's step from the starter's compiled board slide (recordedShow knows neither). (2) Bingo deals its cards and makes its calls at random, and the recording keeps only the verdicts, so the replay deals each round and makes each call from the recorded `oral` records (each verdict's term on its team's card at its square and on no other card; the recorder's last call, which no verdict names, takes a term on no card); the engine's moves are otherwise its own, and the frames are compared in full. (3) The lab's deck has no "How to play" step (its cover carries the steps), where classic's starter has one; the replays use classic's shape. (4) The teacher-entry window has nothing to enter for a board.
- **13 Oct 2026, M10 part 1: SlideForge's activities in the studio's room.** A lesson made of activities (with or without games and feedback) is now hosted by the studio's own room. The twelve recorded activities match classic frame for frame, and every activity that is not a game runs on the same code.
  - **The registry.** `lab/src/live/activities/` holds one file per kind, listed once in `index.ts` (`ACTIVITY_KINDS`), tried in order: `stages` (a timed routine: `keywords` with `activityPresentation: 'stages'`, 16 activities), `collect` (an activity that asks the room for feedback, 9 pages), `moment` (a slide or moment the phones only follow: steps, a brief, panels, stations, a grid, a hook, 22 pages). A lab slide made from an activity carries `slide.activity {key, page, settings}`; the room reads that page as SlideForge made it (`catalogue.ts`, from `lab/src/assets/activities.json`, now in the main chunk) and says what classic says of it: the page's title, and its excerpt (`slideExcerpt` from `src/deck/content.js`). A routine's stages are SlideForge's own (`activityStages` and `activityBrief` from `src/activities/stages.js`: jobs read from a row's words or declared with `[note]` … `[down]`, group talk, the pinned brief); the Activity panel's minutes and job win, stage by stage, and a stage given another time has its row say it.
  - **The desk (`activities/desk.ts`).** Next walks the stages (the first press enters the first; a routine has as many steps as stages, the brief is not one). Each stage starts its own clock, which never moves the show on; `at` carries the stage (`i`, `of`, `name`, `job`, `group`, `text`, `brief`, `seconds`, `left`, `next`), sent twice as classic sends it: the build step first with the stage it leaves, then the stage it enters. A `send` stage opens one idea box (classic's quick prompt: brainstorm, one each, `origin: 'stage'`, `stage: <name>`) for as long as it lasts, one box per stage; a teacher's own prompt wins; leaving the stage sends `promptEnd`, ending the room does not (classic sends only `end`). The relay's `wrote` is the note count ("2 of 3 have written something"), its `signals` (`lost`) the help asks in a work stage. +30s (the wall's clock button, the Teacher Presenter's +30s) lengthens a running stage, or restarts one whose time was up with only the extra. Up to three ideas from a stage's box go in the spotlight, each named for its stage, for the rest of the slide.
  - **The wall.** Over the slide (which draws the routine itself, a build per stage): the track with the stage lit, the stage's job as the wall says it (`stageCopy`), its clock and the time-up cue ("Time. Next: Pair"), the brief, the note count; in a send stage the idea box in the rail without names, each idea with a Spotlight button; the spotlights across the top (`show/activityWall.ts`, `show/ActivityViews.tsx`). The Teacher Presenter shows the stage, the note count and how many ask for help (only the desk says it), and +30s. A feedback activity's prompt is the feedback view, as any feedback slide.
  - **Routing.** `canHostInStudio` (and `whyNotPresentInStudio`) accept an activity slide the room runs, and a lesson whose only room work is activities. A game made from an activity is its game (its slides carry `slide.game`, so the game's style decides). Still classic: an activity slide whose key SlideForge's catalogue does not have, and a game's activity without its game slides. No activity kind says `unsupported` today; the hook is there for one that needs what the room lacks. The show's Host live button and the TopBar's appear for a lesson of activities.
  - **Checks.** `lab/tests/live-replay-activities.test.ts` replays the twelve recordings (`do-now-bell-ringer`, `exit-ticket`, `flipped-instruction`, `hook-and-predict`, `jigsaw-expert-groups`, `muddiest-point`, `reflection-ladder`, `socratic-seminar`, `structured-reflection-protocol`, `think-pair-share`, `think-pair-square-share`, `word-splash`) through a lab deck made as the lab adds each activity (its lab look; Think-Pair-Share and the Socratic seminar in SlideForge's look too); every frame matches, normalised as before (ids by first use, `report` dropped, repeated `at` folded). `lab/tests/live-activities.test.ts`: every non-game activity has a kind, the panel's settings reach the phones, +30s, one box per send stage (Plus, Minus, Interesting), the note count, help, spotlights, the wall's model and routing. `npm --prefix lab test` (297) and both typechecks pass. Steps are in `docs/games/m7-acceptance.md`. Not run: browser smokes, the root `npm test`, real phones or a real relay, the wall strip and the presenter's stage line in a browser.
  - **Differences from classic, kept.** (1) The phones are told SlideForge's words for the page (the catalogue's), not the lab slide's: Think-Pair-Share's lab copy is tuned for the wall and differs, a teacher's edits to an activity slide's words do not reach the phones, and an activity written on a topic (the Activity panel's Write it) sends the catalogue's words. (2) The lab keeps at most five stages' settings (its designs draw five); a sixth to eighth stage runs on SlideForge's own times and jobs. (3) The recordings step forward only, so going back inside a routine, +30s and spotlights are tested by unit tests, not against classic. (4) Classic's per-viewer stage extras (lighting the track in the desk preview, the Stations clock, which classic blocks too) are not ported; nor is the activities session's audit ticked (the activities session owns it).
- **13 Oct 2026, M10 part 2 and an M15 blocker: the activities' own words, eight stages, and live figures in the studio's show.**
  - **The phones get the activity slide's own words** (`15852c8`, `lab/src/live/activities/words.ts`). The room still reads the page as SlideForge made it (its kind, its rows' times and jobs), then puts the lab slide's words over it, read from the layers the designs name: the heading or the track's cover title (`Heading`, `Cover — title`), the prompt or brief (`Prompt`, `Brief`, `Brief — text`), and each row's or stage's text and name (`Think — task`, `Think — name` or `— heading`, `Step 2 — text`, `Recall — text`). A word the slide does not have, or still says as the catalogue does, stays the catalogue's; a question split off the first stage as the band's prompt goes back in front of that stage's task, as classic sends it. So Think-Pair-Share's lab copy, a teacher's edits and an activity written on a topic reach `at` (title, excerpt, stage), the stage's idea box and the pinned brief. This closes difference (1) of the entry above.
  - **Stages six to eight take the Activity panel's times and jobs** (`78c263c`). The cap was in the settings the designs record (`settingsOf` kept five, the most they draw); it is now `MAX_STAGES` (eight, as `src/activities/stages.js` reads). The panel lists every stage and the room ran any count already. This closes difference (2). No catalogue routine has more than five stages today; the test builds one of eight.
  - **The live figures move to `src/figures/`** (`314aa40`, `git mv`; `src/model.js` imports them there, `js/model.js` rebuilt, `?v=` bumped for `js/model.js` and `js/lab-engine.js`). Classic plays them as before through `SF.Figures` (`src/render/explore.js`); the paths in comments, the figure-clock test and the Week 5 tools follow.
  - **Live figures play in the studio's show** (`5008e9e`, `lab/src/show/figure.ts`, `FigureLayer.tsx`). A lab slide that carries `slide.figure` mounts SlideForge's figure (`installFigures`, `render` from `@sf/figures/index.js`, typed in `lab/src/sf.d.ts`) as an SVG in an HTML layer over the slide, above the canvas and under the ink (hard rule 4). It is live: hover, drag and click are the figure's and never the show's Next. Next and Back walk `figureSteps` before the show moves on (as `src/render/explore.js` `step` does), in a plain show and in a room, and a figure keeps the step it was left on (classic's `exploreStates`). The Teacher Presenter says "Figure · step 2 of 4 · caption". `canHostInStudio` and `whyNotPresentInStudio` accept a slide with its figure; a stand-in without one (a copy older than converter version 15) or a figure SlideForge does not draw still keeps the lesson on classic. Weeks 5 and 7, teacher and student copies as they ship, are now presented in the studio.
  - **Checks.** `lab/tests/live-activities.test.ts`: an edited Think-Pair-Share (prompt, two tasks, a stage's name) and an edited Do Now (a row, the heading) tell the phones their words, including the Share stage's box; every unedited activity in both looks (those that can be built without a canvas) says exactly the catalogue's words; a routine of eight stages keeps eight settings and runs stages six to eight on them. `lab/tests/live-replay-activities.test.ts`: the twelve recordings still match frame for frame; for Think-Pair-Share, classic's frames are compared with the lab's copy put in (its Think stage, and on the track its cover title), since the lab's own copy is what reaches the phones now. `lab/tests/show-figure.test.ts`: the stepping (forward, back, the ends, a figure left mid-way, a figure with no steps, non-object steps), what the presenter is told, routing, and the four shipped Week 5 and 7 lessons accepted with every figure playable. `npm --prefix lab test` (305), both typechecks and the root `npm test` (637) pass. `lab-app/` rebuilt (`a41eda7`); `lab-app/stage.js` did not change (the stage bundle has no show code).
  - **Not verified.** No browser: the figure's layer over a real show (its size at the wall's scale, the text refresh, hover and drag through the layer, the ink over it), Next and Back on a figure with a room running, the presenter line in the window. Real phones and a real relay for the activities' words.
  - **Differences from classic, kept.** A figure appears at once on arrival, without the slide's transition. Arriving on a figure by going back shows the step it was left on (classic's), not its last. The figure's caption on the presenter is the step's own `caption`; figures that write a caption another way show only the step count.
- **13 Oct 2026. M14, first pass: the studio's show is the default, and nothing classic could be deleted yet.** Details are in `docs/games/m14-deletions.md`.
  - **The default.** Present, Teacher Presenter, Notes on another device and Rehearse go to the studio's show whenever its guard passes. Rehearse uses the room guard: it opens the studio's room with a simulated class of 8, 16 or 24, the size nearest the one asked for. The File menu's item reads **Use the classic slideshow** and is the way back (`slideforge.studioPresent=0`; `?studioPresent=0/1`). A studio show, rehearsal or room that cannot start falls back to the classic one. The shell takes no keys while the studio's show is up.
  - **A new guard, `classicOnly` (`js/lab-engine.js`).** A lab copy of a SlideForge lesson can leave slides behind that the converter cannot build: motion, quiz, explain, results, spot-the-fake and blank slides, and a game the lab has no copy of. The bridge puts them back into the classic show and room; the studio never sees them. Present (once the trial was on) and Host live (always) could drop them. Such a lesson now stays classic.
  - **Fallbacks closed.** The plain show has no phones, so these no longer keep it on classic: a game, activity or feedback prompt the room cannot ask (Mind reveal, Compare & contrast's discussion, feedback on a game slide, an activity the room does not run). For the show and the room both, the quiz and activity placeholder cards no longer count either, because classic draws them as pictures too.
  - **Still classic, and why.** Slides the lab cannot build (`classicOnly`). A live figure the lesson does not carry, or that is not known. For the room only: what it cannot ask, and a lesson that asks nothing, which keeps SlideForge's quick poll and questions box. The safety net when a studio show or room fails.
  - **Deleted: nothing.** Every file in the M14 list (`js/live.js`, `js/live-activities.js`, `js/rounds.js`, `js/stages.js`, `js/teaching.js`, `js/quick-poll.js`, `js/manual.js`, `js/demo.js`, `js/lab-stage.js`, `presenter.html`, `js/player.js`, the bridge, `src/render/quiz.js`, `src/render/live.js`, `src/presenter/`) is still reachable. Each one is loaded by `view.html` (Share; M12 was skipped), or run by a fallback that cannot close yet, or both. `git diff --shortstat origin/deploy-render -- ':!lab-app' ':!js/model.js'`: 12 files, +211 / -72. The order that unblocks deletion is in m14-deletions §4: port the leftover slide types, give the studio's room a quick poll and a questions box, carry every figure, retire the safety net, then the lab viewer (M12).
  - **Checks.** Root `npm test` (638), `npm --prefix lab test` (306), both typechecks, and the smokes studio-room, studio-room-truefalse, studio-room-type, lab-lesson, share, refresh, cold-start, exports, handout, rehearse, desk-ink, presenter-controls, quick-poll, exploration and presenter-activities. studio-room-truefalse, studio-room-type and handout had been failing since the Showdown and Ranking ports and the handout's teacher-copy button; they were brought up to date.
  - **Not verified.** A teacher's own Library in a real browser: which lessons now take the studio's show, and how often `classicOnly` keeps one classic. The studio's Rehearse needs the relay, where classic's ran offline.
- **13 Oct 2026. M12, the share and print half: Share links, the student view and the student PDF from the studio.** The HTML export's game runtime (M12's first bullets) is not part of this pass.
  - **The studio viewer** (`2d17857`, `lab/view.html` built as `lab-app/view.html`, `lab/src/view.ts`, `lab/src/viewer/`). A second page of the app build plays a shared lab deck from `/api/share/<id>` with the lab's own player (`DeckPlayer`), with none of the classic player, renderer or room. Read at your own pace: Next, Back, the keys, a slide list. Follow live: the relay's watcher seat, as `view.html` uses it (`watch`, `watching`, `context`, `watchEnd`, reconnecting with back-off); the follower lands on the room's slide by its id, else by its place, and cannot run ahead. Practice: on a question whose style plays solo (`plays.solo.status` 'yes', answered by an option, as classic's `practiceDoc` keeps), the learner picks, sees right or wrong, the answer and the explanation, marked by SlideForge's `markResponse` through `@sf`; the score stays on the device; a game that needs a room says so. Hidden slides and every speaker note are left out (`sharedDeck`). A classic copy opened there goes on to `/view.html`.
  - **Share uploads the lab deck** (`37b6cea`). For a lesson the studio shows (`whyNotPresentInStudio` and `classicOnly` say nothing, the classic slideshow not chosen), `shareCopy` uploads its shown slides, with every `notes` field taken off at any depth and each picture kept once (`core/pictures.ts`, the packing the shipped copies use, now shared), marked `studio: 1`; the link is `/lab-app/view.html?s=<id>`, and practice is a flag on the copy. `view.html` sends a `studio` copy on to the studio viewer, so both kinds of link work wherever they are opened. Follow live from a studio room: the room's host sends the relay's own `watchOn` (`LiveHost.watchOn`; the show's room is reachable through `roomRunning` and `roomWatchOn`), and the studio's show has a Share button in a room, which opens the shell's dialog over the show (`ShowHooks.share`). The relay, `join.html` and `manual.html` are unchanged.
  - **The student PDF from the studio** (`97de4e3`, `lab/src/export/handout.ts`). File, Export, Student PDF handout, for a lesson the studio shows: every shown slide fully built as `renderStill` draws it, one to an A4 landscape page, in a window the shell opens inside the click and prints with `window.print`. The student copy leaves out the notes and a game's answer slides; the teacher copy keeps both, each slide's notes under it, and the toolbar switches copies as SlideForge's handout does.
  - **Still classic.** A lesson that fails the studio guard (`classicOnly`, an uncarried figure), one over 7.5 MB packed, and a lab lesson a classic room is running all keep the classic share (`shareDeck`, `view.html`) and the classic handout (`printDeck`, `js/print.js`). Old classic links keep working. Teacher Presenter's classic desk shares the classic way.
  - **Differences from classic, kept.** A follower sees each slide fully built: the studio's room says which slide is up, not how far it is built. Practice offers only option questions, as classic (typed, order and the rest are 'partial' solo). Live figures show as their stills in the viewer and the handout. The studio handout prints a slide as one picture: an experiment's states, a game's questions as paper rows and the teacher copy's "check as its answer" pages are classic's own and are not reproduced.
  - **Checks.** `lab/tests/viewer.test.ts` (the packing, a shipped lesson round-tripped and shared under the limit, the link, the shared deck, following, practice and its score), `lab/tests/viewer-follow.test.ts` (a watcher follows a studio room by the share id through the real relay onto the shared deck's slides, and is told no notes), `lab/tests/handout.test.ts` (each copy's pages, the print document). `npm --prefix lab test` (320), both typechecks and the root `npm test` (641) pass. The smokes share, handout, exports and refresh pass (run against a copy of the tree with the lab built; none of them was changed; they drive classic decks, so they check that the classic share, view.html and handout still work). `lab-app/` is not rebuilt in these commits: the coordinator rebuilds it.
  - **Not verified.** No browser on the studio path: the viewer page itself (its fonts, the slide list, the practice card over a slide, full screen, a phone), a real follow link from a studio room, the Share button over the show, the studio handout's print and its page breaks.
- **13 Oct 2026. M13: the converter builds SlideForge's last slide types, so `classicOnly` no longer keeps a built-in lesson on classic.** Converter version 16 (`CARRIED`). These types are now in `FIRST_BUILT`, so an older lab copy gets them in the lesson's order when it next opens.
  - **Built.**
    - `motion` is built on the scene layer (`sceneSlide`), with the same ten behaviours and five looks. An unknown scene is drawn as its points.
    - A `quiz` slide left in a lesson becomes what SlideForge's `migrateDeckQuizzes` makes of it (`lab/src/decks/fromQuiz.ts`): one lab game per SlideForge game (or per lesson). Each question is asked where it stands and answered on the slide after. Multiple choice uses the buttons look.
    - `results` is that game's `end` slide, so the studio's room shows the scores there. With no question before it, it is a plain titled slide.
    - `explain`, `spotfake` and `blank` are built from lab layers in a new layout family (`lab/src/layouts/leftovers.ts`). Spot the fake is a reveal on Next in SlideForge too, with no phone vote, so plain layers carry all of it. A blank slide's free blocks keep their cells, because SlideForge's 12 × 16 lattice is the lab's grid.
    - `cannotBuild` takes the lesson's compiled games (`js/lab-engine.js` `buildable`). A game the lab can build that its copy lacks was deleted there, so neither `classicOnly` nor `ordered` puts it back.
  - **Still classic.**
    - A game the lab cannot make (a board format with no board).
    - Every game of a lab copy too old to name its slides' sources.
    - Any slide type outside the converter's list.
  - **Built-in lessons passing `classicOnly`** (all 41 in `SF.LESSONS`, measured in Node with the converter and each lesson's compiled games): 40 before, 41 after. The Motion lab's 15 specimens were the only blocker.
  - **Checks.** Both typechecks, `npm --prefix lab test` (306), and root `npm test`: 645 of 646 pass. The one failure is `tests/lab-lessons.test.js`, because the shipped copies were made at version 15. They need `lab-app/` rebuilt, then `node tools/build-lab-lessons.mjs`. That was left to the merge, with M12. New tests: eight in `tests/lab-convert.test.js` (motion-lab, layout-bank) and three cases in `tests/lab-engine-default.test.js`.
  - **Not verified.** No browser smokes were run. The new slides have not been checked by eye in the studio, and the leftover quiz game has not been checked in a real room.
- **13 Oct 2026. The studio's room gets the quick poll and the questions box, so a lesson that asks nothing is hosted in the studio.** `docs/games/m14-deletions.md` §4b says what this unblocks.
  - **Quick poll** (`lab/src/live/quick.ts`, `LiveHost.quickPoll`). It has classic's presets (`js/quick-poll.js`), and it is built with `src/deck/feedback.js`, as `startCustomPrompt` builds it. It is asked from the show's bar (a card, or V) and from the Teacher Presenter (a `poll` command carrying it). The wall shows it with the existing feedback views, full screen or beside the slide (`RoomState.quick`, `wallOf`). Close, or the window's Close prompt, ends it. Like classic, it closes when the slide moves.
  - **Questions box** (`lab/src/live/questions.ts`, `LiveHost.qa` and `floor`). The relay's `qa` frame becomes `RoomState.qa`. The desk's buttons are classic's presenter buttons: Approve and Hide for a waiting question; Show on the wall or Take off the wall, Mark answered and Hide for an approved one; Reopen for an answered one. The pinned question fills the wall (`QaCard`, classic's question card). The floor (auto, open, shut) is resent to a new room after a relay restart. The phones' list on a fresh join is the relay's, unchanged (`qaForPlayer`). The shared desk components are in `lab/src/presenter/RoomDesk.tsx`.
  - **`canHostInStudio`** refuses only a lesson with no shown slide. The plain show offers Host live for any lesson.
  - **Not ported.** The classic room's reactions (the wall's animation and the desk's on and off switch), and the quick poll's AI Suggest.
  - **Checks.** Both typechecks pass, `npm --prefix lab test` passes (327), and root `npm test` passes (651). The `studio-room` smoke passes. New tests: `lab/tests/live-quick.test.ts`, which replays `feedback-quick-poll.json` with no frame difference after the existing normalising, and `lab/tests/live-questions.test.ts`, which covers the room state, frames, buttons, wall and presenter commands.
  - **Not verified.** The quick poll card, the Questions card and the wall's question card have not been checked by eye, and no browser smoke drives them. The questions box has not been run against real phones. No recording has Q&A frames, so those are unit-tested only.
