# Splitting the renderer

`js/render.js` is 7,215 lines. This document is the plan for breaking it into
six files, and the reference for operating the result. It is written so that a
model which picks the work up cold — or resumes after failing part-way — can
establish where it is and continue without re-deriving the analysis.

Read §6 first if you are resuming an interrupted split.

## 1. Why

The file is not merely large, it is past the point where a reader can work in
it. At ~90k tokens it is half a context window for one file, and a model
looking for a single layout has to page through chunk after chunk to find it.
The practical ceiling for a module a model can hold is around 2,000 lines.

It is also the fastest-growing file in the project: **3,233 lines in September
2025, 7,215 now** — +123% in a year, while the split was deferred waiting on a
build decision that §3 shows is not actually needed.

## 2. The target

| Location | Responsibility |
| --- | --- |
| `js/render.js` | Primitives (`el`, `themedRoot`, `rich`, `ring`, `clockFace`), the ~25 static layouts, the `LAYOUTS` registry, `renderSlide`, `fit` |
| `js/render-charts.js` | 19 chart builders, `svgEl`, `chartKey`, `chartTable`, `chartSvgFor` |
| `js/render-words.js` | Word and letter animation: the `WORD_*` tables, `wordPlan`, `wrapWords`, `statementBand` |
| `js/render-regions.js` | The lattice, block keys, region application, stacking and paint order |
| `js/render-live.js` | Score rails, race track, boss bar, feedback rails, join line |
| `js/render-quiz.js` | `layoutQuiz`, `layoutResults`, `layoutExplain`, `layoutGame`, `layoutJoin` |

Expected result: no file over ~2,100 lines, and `render.js` becomes a file
about rendering a slide rather than a file about everything.

Band boundaries are stated as line ranges in §5, but **those line numbers are
from the pre-split file and go stale the moment the first commit lands.** Use
the method in the appendix to re-derive them, never the numbers alone.

## 3. What this does *not* require

`js/render.js` is a plain IIFE assigning onto the global `SF`, loaded by a
versioned `<script src>` tag in `index.html` among 33 siblings. `tools/build.mjs`
has exactly one entry point, `src/model.js`, and never touches it.

So **the split needs no build change.** The new files can be plain scripts in
the same style, added to `index.html` in load order.

### 3.1 But there is a second route, and the repo already uses it

`src/render/` exists and holds **seven ES modules, 1,026 lines** — renderer
code already living behind the build:

| Module | Exports |
| --- | --- |
| `src/render/compositions.js` | `createCompositionRenderer` — called by `render.js` itself |
| `src/render/layout-slots.js` | `layoutRegionsFor`, `insertionRegionFor`, `LAYOUT_SLOT_TEMPLATES` |
| `src/render/regions.js` | `applyChromeRegions`, `chromePositions`, `CHROME_SLOTS` |
| `src/render/fit-check.js` | `measureSlideFit`, `probeLayoutFit`, `svgScale` |
| `src/render/motion-lab.js` | `MOTION_SCENES`, `MOTION_LOOKS`, scene state |
| `src/render/canvas-regions.js` | `bindCanvasRegions` |
| `src/render/body-region.js` | `declareBodyRegion`, `measureBodyRegion` |

They are imported by `src/model.js` and ship inside the generated `js/model.js`
bundle. So the esbuild route is not hypothetical or blocked — it is the
established path for new renderer code, and it needs **no new script tag and no
load-order reasoning**, which are the two ongoing costs of the plain-script
route.

**This is an open decision and §5 does not assume either answer.** The trade:

- **Plain scripts** (`js/render-charts.js` …) — pure moves, code lands
  byte-identical, reviewable as `git mv`. Costs a `<script>` tag and a manual
  `?v=` bump per file, and order becomes the dependency graph.
- **`src/render/` modules** — real imports, no load-order problem, and the
  renderer stops being the last big thing outside the build. But every moved
  function must be converted to ESM and re-exported onto `SF` through
  `src/model.js`, so the commits are no longer pure moves and are harder to
  bisect.

A reasonable hybrid: charts (step 1) as an ESM module in `src/render/`, since
it has a one-name contract and is the natural test of the harder route; fall
back to plain scripts for the rest if that proves painful.

**DECIDED 2026-09-20: the `src/render/` ESM route.** `index.html` already
carries 33 script tags with hand-bumped `?v=` numbers; adding five more would
have made one hygiene problem worse in the course of fixing another. Step 1
took this route and it worked out — see §7.

The plain-script fallback in this table stays documented because a later band
may not convert as cleanly as charts did. If one doesn't, take the fallback for
that band and say so in §7 rather than forcing it.

### 3.2 Two different things called "regions"

`src/render/regions.js` is **chrome** regions — header and footer slots.
`js/render.js`'s region code is the **lattice/block** regions — where content
blocks sit on the slide. Adjacent names, unrelated jobs. Do not merge them
because they match on a grep.

## 4. The contract

### 4.1 The invariant

The renderer puts **93 names onto `SF`**, and lays out **36 slide types**. After
the split the union across all six files must be exactly those sets.

They are recorded in `tools/baselines/render-surface.json` and checked by
`npm run audit:render-surface` (§5, step 0). Do not maintain a copy of the list
by hand here — the earlier draft of this document did, said 47, and was wrong.

**Why 47 was wrong, and why it matters for the split.** Only 47 names come from
the single `Object.assign(global.SF, {…})` at the end of the file. Another 46
are assigned *directly* onto `SF` as the file goes — `SF.artKeyOf` at line 53,
`SF.LATTICE` at 162, `SF.applyRegions` at 501, `SF.chartSvgFor` at 3712, and so
on. A split planned from the closing assign alone would have moved those lines
without noticing they were public, and broken consumers with a green test run.

The consequence for §5's ordering: roughly **40 of the 93 names are region,
block and placed-art functions** living between lines 53 and 1253. The regions
band therefore has by far the largest external contract of the six, which is
why it moves last rather than first.

Nothing outside the renderer reaches inside it; consumers read the flat `SF`
namespace. `SF.el` is used by 14 other files, `SF.renderSlide` by 9, `SF.fit`
by 7. If the 93 names are intact and behave the same, consumers cannot tell the
split happened.

### 4.2 Cross-file dependencies, measured

Each extracted band was probed for which out-of-band functions it calls, and
which names outside it call in. The surfaces are small, which is why this is a
move and not a redesign:

| Band | calls out to | called in by |
| --- | --- | --- |
| charts | `el` | `chartKey`, `chartTable`, `chartSvgFor`, `svgEl` |
| live | `el`, `themedRoot` | `focusCloud`, `focusPoll`, `focusScale`, `paintJoinLine`, `tint` |
| words | `el`, `rich` | `clockFace`, `ring`, `wordEffect`, `wordFrom`, `wordPlan`, `wordPlanUnit`, `wordSpeed`, `wordStagger`, `wordsLoop`, `wrapWords` |

Everything a band calls outward is a primitive that stays in `render.js`.
Everything called inward becomes either an `SF.*` export or, where it is
internal-only, an explicit entry on a shared object.

Charts have the narrowest external contract of the three — **one** name,
`SF.chartSvgFor`, assigned at line 3712 — which is why they go first. (An
earlier draft said charts exported nothing at all. They do; see §4.1.)

Note `clockFace` (line 1211) and `ring` (1216) sit inside the word band's line
range but are primitives. They stay in `render.js`. Boundaries are by
responsibility, not by line number.

### 4.3 The registry — not needed after all

`js/render.js` dispatches through a table:

```js
var LAYOUTS = { blank: layoutBlank, stats: layoutStats, /* … 36 entries */ };
…
(LAYOUTS[slide.type] || layoutContent)(slide, pad, opts, root);
```

The plan originally called for converting this into a registry
(`SF.registerLayout(type, fn)`), because on the plain-script route a layout in
another file could not get into an object literal closing over local function
declarations.

**The ESM route removed that problem, so the conversion was never made.** A
moved layout comes back out of its factory and is unpacked into a local `var`
in `js/render.js`, so the literal still closes over a local name exactly as
before. Step 4 moved five layouts this way and `LAYOUTS` is untouched.

Keep it that way unless something actually needs it. A registry that nothing
registers into from outside is indirection for its own sake, and the single
dispatch point is easier to read than a table assembled from five places.

**The silent-failure warning still stands, whichever form it takes.** A layout
missing from `LAYOUTS` does not throw: `LAYOUTS[slide.type] || layoutContent`
falls back, so a quiz slide renders as a bullet list with a clean console. The
probe's static scan reads both the literal and any `registerLayout` calls, so
it catches this either way.

### 4.4 Load order

`index.html` loads these as ordinary scripts with manual `?v=` cache-busting.
Nothing declares its dependencies, so order is the dependency graph.

The new files define functions but call nothing at load time except
`SF.registerLayout`, so the only hard rule is:

> `js/render.js` must load **first** among the six — it defines `SF.el`,
> `SF.registerLayout` and the `LAYOUTS` table the others write into.

Place the five new tags immediately after the existing `render.js` tag, keeping
its position in the wider file order unchanged. Each new tag needs a `?v=1`,
and `render.js` itself needs its `?v=` bumped on every commit of this split.

## 5. The steps

Six commits. Each is independently revertable and independently verified.
**Commit after each one** — that is what makes a failure mid-split recoverable.

Verification after every step is the same three commands:

```bash
npm test && npm run smoke && npm run visual:check
```

`npm test` runs `build:check`, `tsc --noEmit` and the node test suite.
`visual:check` has **10 known pre-existing failures** — those are the baseline,
not regressions. Record the failure count before starting and compare against
it, rather than expecting zero. From a worktree it attaches to the main
checkout's server unless you pass `SF_URL`.

| # | Commit | Moves | Why this order |
| --- | --- | --- | --- |
| 0 | Surface probe | nothing | Build the guard before moving anything |
| 1 | `src/render/charts.js` | 1,453 lines | **DONE 2026-09-20.** One export, one outbound dep — the narrowest contract of the six |
| 2 | `src/render/words.js` | 324 lines | **DONE 2026-09-20.** One coherent cluster; 16 names, all but one already public |
| 3 | `src/render/live.js` | 920 lines | **DONE 2026-09-20.** Session furniture, not slide layout |
| 4 | `src/render/quiz.js` | 1,007 lines | **DONE 2026-09-20.** `layoutQuiz` alone was 670 lines |
| 5a | `src/render/art.js` | 113 lines | **DONE 2026-09-20.** Placed pictures and theme poses; 7 SF names |
| 5b | `src/render/regions.js`* | ~1,000 lines | **BLOCKED** — the other agent is editing inside this band |

### Step 0 — the surface probe — **DONE 2026-09-20**

`tools/render-surface-probe.mjs`, run as `npm run audit:render-surface`.

It reads the `js/render*.js` script tags out of `index.html` to get load order
— so a split file nobody wired into the page fails here rather than in the
browser — loads them into a DOM shim after `js/model.js`, and takes the names
they *add* to `SF` as the renderer's surface. Layout registration is a static
scan of both forms, the `LAYOUTS` object literal and `SF.registerLayout` calls,
because `LAYOUTS` is a local and stays one.

It fails in **both directions**. A missing name breaks a consumer; an added one
widens a surface that is meant to be shrinking, and would let a split "succeed"
by exporting every internal it happened to move.

Baseline in `tools/baselines/render-surface.json`; re-record with `--update`
only for a deliberate change, and log it in §7.

Verified against injected faults before being trusted: dropping `quiz` from
`LAYOUTS` and adding one stray `SF.` name were both caught, exit 1.

Run it at the end of every subsequent step. A step that moves code and keeps
this green has not broken any consumer.

**Five slide types have no layout and that is correct** — `beforeafter`,
`experiment`, `motion`, `explore`, `simulation` are drawn by `js/explore.js`
and `js/experiments.js` through `SF.Explore.render` inside `renderSlide`, not
through `LAYOUTS`. The probe prints them as information, not as a failure. Do
not "fix" them by adding layouts.

### Step 1 — charts — **DONE 2026-09-20**

`src/render/charts.js`, 1,453 lines out of `js/render.js`, which went from
**7,247 to 5,795 lines**. Wired in through `src/model.js` beside
`createCompositionRenderer`; no new script tag.

The shape, which the remaining bands should copy:

```js
export function createChartRenderer(SF, helpers) {
  const {el} = helpers;
  /* … 31 names, moved verbatim … */
  return {chartKey, chartTable, chartSvgFor, svgEl};
}
```

`el` is injected because it is the browser renderer's DOM helper and stays
there. Everything else the charts need is model code — `chartValues`,
`histogramBins`, `parseTable` and six more — reached through the injected `SF`,
so not one `SF.x` call site had to change.

**31 names went in, 4 came out.** The other 27 were never used outside and are
now genuinely private. That is the part worth repeating for the other bands:
the point is not that the lines moved, it is that the contract shrank.

Verified as a *pure* move, not merely a working one: every one of the 20 chart
kinds was rendered in a real browser against the pre-move file and the current
one, and the SVG is **byte-identical** for all 20. The unit suite does not
cover this — it tests `chartData`, which is model code — so passing tests alone
would not have been evidence.

### Step 2 — word motion — **DONE 2026-09-20**

`src/render/words.js`, 324 lines. `js/render.js` **5,795 → 5,491**.

**This band did not shrink its contract, and that is worth being honest
about.** Seventeen names live there and sixteen leave; only `WORD_SPAN_MS` is
private. Word motion is configured from the Motion pane in `js/customize.js`,
so it was already almost entirely public. The gain here is locating the whole
motion system in one findable file, not encapsulation. Do not expect every band
to behave like charts did.

It needs nothing from the model, so the factory takes helpers alone:

```js
export function createWordRenderer(helpers) { const {el} = helpers; … }
```

That is a deliberate difference from `createChartRenderer(SF, helpers)` — an
unused `SF` parameter would be noise. Match the band, not the previous step.

Verified the same way as step 1, and the checking matters more than it looks:
978 cases were rendered before and after — every combination of effect ×
direction × speed × stagger × arc × unit across statement and title slides,
plus `wrapWords` called directly — and all 978 are identical. `wordPlan` also
has genuine unit coverage in `tests/word-plan.test.js`, which charts did not.

### Step 3 — live session furniture — **DONE 2026-09-20**

`src/render/live.js`, 920 lines. `js/render.js` **5,491 → 4,591**.

Score rails, race track, boss bar, word-reveal wall, study cards, feedback
rails and their focus views, the join line. None of it lays out a slide.

**34 names in, 16 out — eighteen stop being reachable**, the largest reduction
in the split so far. Fifteen of the sixteen are public `SF` names the player and
relay call; `tint` is the exception, used only by layouts still in
`js/render.js`.

`el` and `themedRoot` are injected. Everything else goes through `SF` at call
time — including `SF.Player`, which is defined by a script that loads *after*
`js/render.js`. Reading it through the live `SF` rather than capturing it at
module scope is what keeps that ordering from mattering.

**One line was not a verbatim move, and `tsc` is what caught it.** The join
line's QR handler read `global.SF` — `global` being the parameter of the IIFE
in `js/render.js`, which does not exist in a module. It now reads the injected
`SF`, the same object. Expect more of these as the remaining bands move; the
typecheck step of `npm test` finds them, so do not skip it.

Verified: 31 components rendered before and after — score rails across two
themes, race track, boss bar, word wall, study cards, feedback rails, question
cards, the join line in each open/roomy state, the paint functions, and every
feedback kind — all identical, none threw.

### Step 4 — quizzes and games — **DONE 2026-09-20**

`src/render/quiz.js`, 1,007 lines. `js/render.js` **4,591 → 3,596**.

Five layouts and their scaffolding: the question and answer grid, results,
explain, the game stage, the join screen. `layoutQuiz` alone was 670 lines.
Twelve names in, seven out.

**No registry was needed** — see §4.3. This was planned as the step that
introduced `SF.registerLayout`, and on the ESM route it turned out to be a pure
move like the others.

**The live seam had to move.** `src/render/quiz.js` needs `tint`, which comes
out of `src/render/live.js`, and the live factory call sat *below* the quiz
code at line 4522 — so `tint` would have been captured as `undefined`. The live
seam was relocated above the quiz seam. Its own dependencies (`el`,
`themedRoot`) are hoisted function declarations, so it runs correctly anywhere.

> **Rule for the remaining step.** A factory call must execute before anything
> that captures its results into another factory call. Function declarations
> hoist and are safe; a `var` unpacked from a seam is not. When in doubt, put
> the seam higher.

Verified: 124 slides rendered before and after — quiz, results, explain, game
and join, each across timed/untimed, progressive/not, three reveal steps and
chrome on/off — identical over 110KB of DOM once the randomly minted
`data-slide-id` is normalised out. That attribute is why a first run showed 120
of 124 "differing"; it is nondeterminism in the check, not in the renderer.

### Step 5a — placed art — **DONE 2026-09-20**

`src/render/art.js`, 113 lines. `js/render.js` **3,562 → 3,488**. Seven `SF`
names: `artKeyOf`, `applyArtPoses`, `artOrder`, `artPlacement`, `artBlockKey`,
`artBlockId`, `placedArtLayers`.

Small, but it establishes a second factory shape, and the naming carries it:

> **`create*` is pure** — it returns its names and `js/render.js` unpacks them.
> **`install*` writes onto `SF` itself.** Read the prefix as the contract.

This band is the only one so far whose body *is* `SF.x = …` assignments — seven
of them and one local. A `create*` factory would have meant rewriting every one
of those statements into declarations and a return, which would have been the
first non-mechanical edit in a refactor whose whole discipline is that code
moves unchanged. `installArtRenderer(SF, {el})` keeps it verbatim.

The cost is honest: those seven `SF.x =` lines are no longer greppable in
`js/render.js`, and grepping `^  SF\.` there is how this document's first
census found them (§4.1). The seam comment names the file so the trail does not
go cold.

Verified: 102 cases before and after, 41KB — every branch of the five pure
functions including null and malformed input, `artKeyOf` against both a div and
the SVG `className` case it guards, layers across side and placement, poses
applied to every theme that has art, and whole slides across every theme.
Identical throughout.

**Note for step 5b: `src/render/regions.js` already exists** and is *chrome*
regions — header and footer slots (§3.2). The lattice/block regions want a
different filename; `lattice.js` is the honest one.

### Step 5b — regions — **NOT STARTED**

**Blocked on 2026-09-20, deliberately.** A second agent works this same tree
(see the parallel-agent notes), and its uncommitted edits to `js/render.js` sit
at lines 574–840 — `FREE_KINDS` and `renderFreeBlocks`, squarely inside this
band. Moving it would relocate the exact code being edited into another file
and leave those working-tree changes pointing at lines that no longer exist.
The other four steps were committable around that work because their bands were
nowhere near it. This one is not. **Wait until that work lands.**

**It is also not one band, which the earlier plan got wrong.** A census of the
file before 5a was taken out:

| Lines | What | Verdict |
| --- | --- | --- |
| 20–44 | `themedRoot`, `el` | primitives — stay |
| 45–160 | placed art | **done — step 5a** |
| 161–174 | `LATTICE`, `anchorRegion` | with regions |
| 175–266 | `headerFooterConfig`, `renderHeaderFooter` | chrome, not regions — stay |
| 267–944 | block keys, lattice geometry, placement, hidden blocks, `applyRegions`, `FREE_KINDS`, free blocks, restacking | the real regions module |
| 945–1152 | paint order, occlusion, `linesFor`/`latticeFit` | with regions |
| 1153–1197 | `slideJumpTarget`, `jumpToSlide` | navigation, unrelated — stay |

So step 5 was really **two** modules. Placed art went first (5a) because it is
7 names against roughly 30 and sits furthest from the other agent's work. What
remains for 5b is the lattice, block keys, placement, hidden and free blocks,
`applyRegions`, restacking, paint order, occlusion and `latticeFit`.



Each step is mechanically the same:

1. Create the new file with the same IIFE header and `'use strict'`.
2. Cut the band's functions across verbatim. **Verbatim** — no tidying, no
   renaming, no "while I'm here". A move commit that also changes behaviour is
   unreviewable and unbisectable.
3. Add the file's own `Object.assign(global.SF, {…})` for the names it owns,
   and delete those names from `render.js`'s assign.
4. For internal-only names crossing the new boundary (§4.2), export them on
   `SF` too and note them in §7 as surface that was widened deliberately.
5. Add the `<script>` tag; bump `render.js`'s `?v=`.
6. Run the three verification commands plus the probe. Commit.

Do not batch two bands into one commit, however tempting steps 2 and 3 look
together.

### Where the split stands

| | |
| --- | --- |
| `js/render.js` | **3,488 lines**, from 7,215 when this began |
| Steps done | 0–4, and 5a |
| Remaining | step 5b only — blocked, see above |
| Guard | `npm run audit:render-surface` — 93 names, 36 layouts, green |

## 6. Resuming after a failure

If you are picking this up mid-way and do not know how far it got:

```bash
ls js/render-*.js                               # which bands have moved
wc -l js/render.js                              # 7215 = nothing started
git log --oneline -15 -- js/render.js index.html  # what landed
grep -n "registerLayout" js/render.js            # registry converted yet?
npm run audit:render-surface                     # does step 0 exist, is it green
git status                                       # a half-finished step 
```

Read the result like this:

- **`render.js` is 7,215 lines and no `render-*.js` exist** — nothing has
  started. Begin at step 0.
- **Some `render-*.js` exist, working tree clean, probe green** — the last
  listed step finished. Continue with the next one in the §5 table.
- **Working tree dirty** — a step was interrupted. Do not try to finish it from
  the diff. `git checkout -- .` back to the last commit and redo that step from
  the top; each step is small enough that restarting is cheaper than
  reconstructing intent.
- **Probe red on a clean tree** — a step was committed broken. Revert that
  commit rather than patching forward; the invariant in §4.1 is the thing being
  protected and a green baseline matters more than progress.
- **Probe green but a slide renders as bullets** — a layout lost its
  registration. See the warning in §4.3.

If `docs/render-split.md` and the code disagree, the code is right and this
document is stale — fix §7 as part of the step that corrects it.

## 7. Change log

- **2026-09-20** — Document created. Analysis only; no code moved. Established
  that the split needs no build change (§3), that the `LAYOUTS` registry
  already exists (§4.3), and measured the cross-band dependency surfaces (§4.2)
  rather than assuming them.
- **2026-09-20** — Step 0 built: `tools/render-surface-probe.mjs` +
  `npm run audit:render-surface` + baseline. Verified against injected faults.
- **2026-09-20** — Three corrections, all found by building the probe rather
  than by reading:
  - **The surface is 93 names, not 47.** The first draft counted only the
    closing `Object.assign`; 46 more names are assigned directly onto `SF`
    through the body of the file. §4.1 rewritten, and the list is now machine-
    checked rather than kept by hand here.
  - **Charts do export.** `SF.chartSvgFor` is assigned at line 3712. The claim
    that charts had a zero-width contract was wrong; it is one name. Step
    ordering is unchanged — one is still the narrowest of the six.
  - **`src/render/` already exists**, with seven bundled ES modules. The
    esbuild route is therefore a live option rather than out of scope, and the
    route decision is now open in §3.1 instead of settled by omission.
  - Consequence of the first: ~40 of the 93 names are region/block/art
    functions, so the regions band has the largest contract of the six. It was
    already scheduled last for a different reason; now there is a measured one.
- **2026-09-20** — Route decided: `src/render/` ES modules, not plain scripts
  (§3.1). `index.html` already has 33 hand-versioned script tags and adding
  five more would have worsened the problem being fixed.
- **2026-09-20** — Step 5a done. `src/render/art.js`; `js/render.js` 3,562 →
  **3,488 lines**. Introduced the `install*` factory shape for a band whose
  body is `SF.x =` assignments, so the move stayed verbatim. Census method
  corrected again: strip comments before matching identifiers.
- **2026-09-20** — Step 5b **not started**, blocked on the other agent's
  uncommitted edits inside the band. Also re-censused: it is two modules, not
  one, and two things in the line range (header/footer chrome, slide
  navigation) do not belong in either.
- **2026-09-20** — Step 4 done. `src/render/quiz.js`; `js/render.js` 4,591 →
  **3,596 lines**. Two findings: the `SF.registerLayout` conversion this step
  was meant to introduce is **not needed** on the ESM route (§4.3), and the
  census method in the appendix was missing bare identifier references, which
  is how `LETTERS` was overlooked until `tsc` failed.
- **2026-09-20** — Step 3 done. `src/render/live.js`; `js/render.js` 5,491 →
  **4,591 lines**. 34 names in, 16 out. First non-verbatim line of the split: a
  `global.SF` reference that only a module would reject, found by `tsc`.
- **2026-09-20** — Step 2 done. `src/render/words.js`; `js/render.js` 5,795 →
  **5,491 lines**. Contract unchanged at 16 public names — this band was
  already public, so the gain was findability, not encapsulation. 978 rendered
  motion combinations identical before and after.
- **2026-09-20** — Step 1 done. `src/render/charts.js`; `js/render.js` 7,247 →
  **5,795 lines**. Contract shrank from 31 names to 4. SVG output proven
  byte-identical across all 20 chart kinds before and after.
- Deliberately not done: moving the renderer to `src/` behind esbuild, or to ES
  modules. Both are real, both are out of scope here, and treating the first as
  a prerequisite is what let the file double in a year (§3).
- Deliberately not done: any tidying of the moved code. Steps 1–5 are pure
  moves so that behaviour changes stay bisectable.

## Appendix — method

Figures in this document can be re-derived; do not trust them after the file
changes.

**Band line ranges and function sizes.** List the top-level declarations, which
sit at exactly two spaces of indentation inside the IIFE:

```bash
grep -nE "^  (function|var [A-Z_]+ =)" js/render.js
```

**The export surface.** Read the names from the final assign:

```bash
sed -n "$(grep -n 'Object.assign(global.SF' js/render.js | cut -d: -f1),\$p" js/render.js | grep -oE "^\s+[a-zA-Z_]+:"
```

**Cross-band dependency surfaces (§4.2).** Build a map of name → definition
line from the grep above, assign each line to a band, then compare the band of
each reference to the band of its definition. Pairs where they differ are the
boundary. Rerun before each step — a band's surface changes as earlier steps
move code out from under it.

> **Strip comments first.** The corrected census reported the art band
> depending on `words`; the only occurrence was the word "words" in a prose
> comment. Match code, not commentary.

> **Match bare identifiers, not just `name(`.** The first version of this
> census looked only for call sites, and so missed `LETTERS` — a constant the
> quiz band reads and never calls. `tsc` caught it, but only after the code had
> moved. Constants, regexes and lookup tables are all referenced this way.

**External consumers.** For any name, `grep -rl "SF\.<name>\b" js/ --exclude=render.js`.
