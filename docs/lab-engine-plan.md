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

Converting content is also a solved problem. `lab/src/model/fromSlideForge.ts` already turns about 30 classic slide types into native lab slides (the 93-slide Layout bank and the Motion lab). It stops at games (`default: return null`, line 205), because the lab has nothing to convert them into yet. For games, most of the cost is running them, not converting them.

## Where things stand (25 Sep 2026)

| Milestone | Status |
|---|---|
| M0–M4 | Not started. They come after the lesson side (see the order below). |
| M5 | **Done early, in a different form** (commits `d9b1e64`, `41d9ea3`, `7b7a67e`). The lab is the Lesson studio. See "M5 — status" below for what differs from the plan and what is left. |
| M6 | **Part done.** The lab bundle is committed in `lab-app/` and served by the relay's static server from the same origin. Not yet deployed to Render or tried from a phone. |
| M7–M15 | Not started. Until M7, **the bridge** stands in for the lab's own live host (see below). |
| Live stage | **Done** (`4b5c9a5`, speaker notes on the wall `9281d07`). Lab slides play live inside SlideForge's show, with its HUD, the room's rail and Teacher Presenter (see "The live stage" below). |
| **Next** | The converter keeps each slide's audience feedback and timer (below), then what M5 still owes. |

**Order (decided 25 Sep 2026): games and activities come last.** The lesson side goes first, in this order:

1. The HUD, Teacher Presenter and the rail. **Done** (the live stage).
2. **The converter keeps a slide's audience feedback and timer.** A SlideForge lesson converted into the lab lost its polls, word clouds, brainstorms and scales (`slide.feedback`) and its timed slides (`slide.timeLimit`): `fromSlideForge.ts` read neither. The original lesson kept them, but the lab copy that is taught from did not. Lab copies made before the fix get them back from their original, once.
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
  frames lab-app/         unchanged              unchanged
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
- **the classic Lesson studio loaded and hidden** as the way lessons are handed to the lab, until the Library, the demo and New talk to the engine interface directly (M5, still owed).

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
