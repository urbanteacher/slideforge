# Model modularization

The September 2026 audit identifies real maintenance pressure, but the existing
code already shares game creation, normalization, compilation, and marking hooks.
The first migration makes those boundaries explicit instead of replacing working
game behavior and the UI in one change.

## What changed

| Location | Responsibility |
| --- | --- |
| `src/model.js` | Deck structure, normalization, game-to-slide orchestration, public compatibility API |
| `src/games/registry.js` | Explicit engine imports, style lookup, marking dispatch |
| `src/games/<style>.js` | Game schema hooks, defaults, and mechanic-specific helpers |
| `src/games/memory.js` | Shared pair hooks and three memory variants |
| `src/games/choice.js` | Choice and true/false hooks reused by presets |
| `src/games/marking.js` | Shared typed-answer comparison rules |
| `src/games/factories.js` | Common document/question fields and application of engine defaults |
| `src/games/catalogue.js` | Catalogue labels and format-to-style mapping |
| `src/samples/*.json` | Six question banks, sample deck, and sample quiz |
| `src/storage.js` | Shared persistence with injected normalization and storage access |
| `tools/build.mjs` | Reproducible esbuild bundle, watch mode, and stale-output check |
| `src/types.d.ts` | Declared shapes for every boundary; checked, never emitted |
| `tools/type-probe.mjs` | Injects known mistakes to measure what the types actually catch |
| `css/board-common.css` | The four board components that were styled four times |
| `js/model.js` | Generated browser compatibility bundle; do not edit directly |

The hand-maintained model shrank from 4,036 to 1,560 lines. This is a source
organization improvement, not a claim that moving code removes its download
cost. Generated bundles and JSON should be counted separately from authored
JavaScript when tracking future source growth. Actual duplication was removed
from storage and the game factory's default-setting branches.

There are 24 registered styles. The audit's 27 catalogue formats are a different
count: several formats map to one style, and some are stand-ins or out of scope.

## Engine contract

An engine exports an object with `key`, labels, `mechanic`, `input`, and these
existing hooks:

```js
make()                         // new question-specific fields
normalize(question)            // normalize fields; may mutate the question
problems(question, number)     // validation message or null
compile(question, settings, slide) // contribute fields to a compiled slide
mark(slide, response)          // correctness
summary(question)             // editor list description
describe(slide, response)     // optional response label
```

`defaults` optionally overrides common game settings. `starters` optionally
references a JSON question bank. Factories copy that bank before applying it, so
editing one game cannot mutate a later game's starter questions.

To add a style, create its module and import it in `registry.js`. No extra HTML
script tags are needed. Add a catalogue mapping if applicable. Authoring controls,
board compilation, rendering, and runtime controls still require their existing
integration points; this is not yet a universal render/player plugin interface.

## Compatibility decisions

- Existing `window.SF` consumers, script URLs, synchronous factories, and Node
  fixture loaders keep working through the generated bundle.
- The relay remains CommonJS and has no production package dependencies. Only
  `src/` uses native ES modules; build and browser test tools are dev dependencies.
- JSON is bundled synchronously. Fetching samples on demand would require an
  asynchronous authoring API and a defined offline/error-loading experience.
- Saved document formats, storage keys, last-opened behavior, and scoring formulas
  are preserved. Normalization remains necessary for imported and saved data.
- TypeScript checks `src/` but emits nothing: no runtime dependency, no build
  change, and the normalizers still do the validating. Types describe data that
  has already been through them.
- Tailwind remains deferred, and the reason is now measured rather than assumed:
  the component inventory is done, but there is no visual regression baseline to
  rewrite selectors against. See `docs/css-token-inventory.md`.

## Verification

Run `npm ci`, `npm run build`, and `npm test`. The test command checks bundle
freshness and typechecks before testing. `npm run typecheck:probe` reports how
much the types actually catch. Existing direct `node --test tests/*.test.js` commands
still work when the bundle is current. The new module tests cover DOM-free engine
imports, independent starter data, storage namespaces, and storage failures.

During extraction, 147 deterministic comparisons against the original model
checked the public API, all 24 styles' question and game factories, normalization,
compilation, run decks, sample documents, and Markdown output. The original model
was kept outside the repository for that one-time comparison, rather than adding
a second implementation to maintain.

## Next boundaries

1. **[Completed] Extract board compilation and authoring controls behind explicit engine hooks**:
   Extracted into `src/boards/bingo.js`, `src/boards/bowl.js`, `src/boards/lowstakes.js`, and `src/boards/memory.js`.
2. **[Completed] Split deck content helpers and Markdown export out of the remaining model**:
   Extracted into `src/deck/content.js`, `src/deck/feedback.js`, and `src/deck/markdown.js`. `src/model.js` dropped to ~1,000 lines.
3. **[Completed] Centralize shared board lifecycle and presenter synchronization across roles**:
   Created `src/boards/runtime.js` (`SF.Boards`) orchestrating mounting, rendering, unmounting, snapshots, and commands across player, host, renderer, and studio.
4. **[Completed] Add types at those boundaries while preserving runtime input validation**:
   `src/types.d.ts` declares the shapes; `tsconfig.json` checks `src/` with
   `checkJs` and `strict`; `npm test` runs `build:check && typecheck` before
   the tests. Nothing is emitted and no runtime dependency was added.

   The types are attached to the implementations rather than sitting beside
   them: all 24 engines are annotated `GameEngine<Q>`, the four board modules
   `BoardEngine`, and every factory and normalizer carries its input and
   output types. `GameEngine` is generic over its question shape, which is
   where the contract that *every hook but `make` assumes `normalize` has
   already run* is now written down.

   Normalizers take `any` and return a declared type, on purpose. That is the
   boundary: `normalizeDeck`, `normalizeGame`, `normalizeQuestion`,
   `normalizeSlide` and each engine's `normalize` are handed whatever was in
   localStorage or an `.sfbundle.json`, and typing their input would assert
   the very thing they exist to establish. Where a runtime check narrows a
   type it is written as a predicate (`isSlideType`, `isFeedbackKind`) so one
   test serves both the data and the checker. `safeHref`, `safeMedia`, the
   clamps and the storage try/catch are untouched.

   A passing `tsc` does not by itself mean the types are doing anything — a
   codebase with no annotations passes too. `npm run typecheck:probe` injects
   twelve realistic mistakes one at a time and reports which the checker
   catches: **12/12**, against 1/5 when the declarations existed but nothing
   referenced them. Add a probe when you add a boundary.

   Two findings came out of attaching them: `clues` was declared `string[]`
   and is a string everywhere, and `slider.mark` read `s.target`/`s.tolerance`
   without checking them, returning false only through `NaN` arithmetic.

5. **[Completed] Inventory shared CSS tokens/components and remove demonstrated duplication; evaluate Tailwind against that inventory and visual regression coverage**:
   `docs/css-token-inventory.md` covers the three token families (`--ui-*`,
   `--s-*`, `--p-*`), what was deduplicated, and what was deliberately left.

   Four board components — container, header row, clock/counter, button base —
   were styled identically in `bingo.css`, `bowl.css`, `memory.css` and
   `lowstakes.css`. They now live once in `css/board-common.css`: 75
   declarations and 13 empty rules removed, board CSS 637 → 580 lines. Every
   selector's effective declaration set was diffed before and after and no
   selector matching a real element changed; both boards were then driven in
   a browser.

   49 declarations still repeat across three or more board sheets and were
   left alone. They are unrelated elements sharing a value, not shared
   components, and collapsing them would couple a bingo cell to a low-stakes
   card.

   On Tailwind: it fits the editor chrome and does not fit the slide canvas,
   which is a fixed 1280×720 coordinate box scaled by transform. The blocker
   is coverage, not fit — the three Playwright smoke tools save screenshots
   but compare them to nothing, so a purely visual regression passes today.
   The deduplication above was safe to do without baselines only because no
   selector changed. A Tailwind rewrite changes every selector, so real
   baselines come first.

These steps target coupling and repetition. File length alone does not show
whether a feature is duplicated or how expensive it is to change.
