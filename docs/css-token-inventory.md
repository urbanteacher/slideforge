# SlideForge CSS Token & Component Inventory (Boundary 5)

**Date:** September 2026  
**Scope:** `css/app.css` (3,938 lines) + 12 feature stylesheets (1,277 lines) = 5,215 total CSS lines.

---

## 1. Design Token Inventory

SlideForge employs three distinct design token families with different lifecycles and scopes:

### Family A: Studio & Chrome Tokens (`--ui-*`)
Controls editor chrome, toolbars, sidebar rail, inspector panels, and dialogs.
Defined in `:root` in `css/app.css` (dark default) and overridden in `css/studio.css` (light editorial theme):

| Token | Dark (`app.css`) | Light Studio (`studio.css`) | Purpose |
|---|---|---|---|
| `--ui-bg` | `#14161a` | `#f6f6f3` | Outer canvas & app background |
| `--ui-panel` | `#1b1e24` | `#ffffff` | Primary panel surface (inspector, toolbar) |
| `--ui-panel-2` | `#22262e` | `#f5f5f2` | Secondary panel surface |
| `--ui-line` | `#2f343d` | `#e4e5df` | Divider lines and borders |
| `--ui-text` | `#e7e9ee` | `#252b26` | Primary body typography |
| `--ui-dim` | `#9aa1ad` | `#72796e` | Secondary labels, captions, shortcuts |
| `--ui-accent` | `#4c8dff` | `#526943` | Active selections, focus rings, primary CTA |
| `--ui-accent-soft`| `rgba(76,141,255,.16)` | `#edf2e8` | Hover fills, active button backgrounds |
| `--ui-good` | `#34c98a` | `#367b52` | Success badges, correct indicators |
| `--ui-warn` | `#ffc75a` | `#bb7831` | Warnings, low-stakes indicators |
| `--ui-bad` | `#ff5f6d` | `#c44650` | Error messages, missed answers |
| `--ui-radius` | `8px` | `8px` | Standard button and container rounding |
| `--ui-font` | `system-ui` | `'Avenir Next', system-ui` | UI typography |

### Family B: Presentation Slide Tokens (`--s-*`)
Scoped strictly within `.slide` (fixed `1280 × 720` coordinate box).
Swapped by theme classes (`.theme-midnight`, `.theme-paper`, `.theme-ocean`, `.theme-ember`, `.theme-mono`, `.theme-studio`):

| Token | Midnight | Paper | Ocean | Ember | Mono | Purpose |
|---|---|---|---|---|---|---|
| `--s-bg` | `#16233d` | `#fbf9f4` | `#0f6a72` | `#46202f` | `#0c0c0c` | Slide canvas background |
| `--s-fg` | `#eef2fb` | `#23201b` | `#eafcfb` | `#fdeef2` | `#f2f2f2` | Primary slide text |
| `--s-dim` | `#9fb0d0` | `#6c655a` | `#a5d6d6` | `#d6a8b6` | `#a0a0a0` | Subtitles, footnotes, captions |
| `--s-accent` | `#5b9dff` | `#b4531f` | `#58e0c8` | `#ff8a5c` | `#ffffff` | Headings, active marks, borders |
| `--s-accent-2`| `#a98bff` | `#1f6f5c` | `#ffd479` | `#ffd166` | `#ffcc00` | Secondary highlights |
| `--s-rule` | `rgba(255,255,255,.14)` | `rgba(0,0,0,.14)` | `rgba(255,255,255,.16)` | `rgba(255,255,255,.15)` | `rgba(255,255,255,.2)` | Dividers, card borders |
| `--s-card` | `rgba(255,255,255,.06)` | `rgba(0,0,0,.045)` | `rgba(255,255,255,.08)` | `rgba(255,255,255,.07)` | `rgba(255,255,255,.06)` | Tile/card background fills |
| `--s-scrim` | `rgba(0,0,0,.42)` | `rgba(255,255,255,.62)` | `rgba(0,0,0,.42)` | `rgba(0,0,0,.42)` | `rgba(0,0,0,.5)` | Overlays behind text on images |
| `--s-font` | `Segoe UI` | `Georgia, serif` | `Segoe UI` | `Segoe UI` | `Helvetica Neue` | Projection typography |

### Family C: Learner Mobile Pad Tokens (`--p-*`)
Scoped to mobile viewports (`join.html`, `css/learner.css`):
`--p-card`, `--p-rule`, `--p-fg`, `--p-dim`, `--p-accent`, `--p-key-fg`, `--p-accent-soft`.

---

## 2. Component Duplication — Measured, and What Was Removed

Four board stylesheets (`bingo.css`, `bowl.css`, `memory.css`, `lowstakes.css`)
styled the same four components four times over. Those declarations now live
once, in `css/board-common.css`, which both pages that render a board load
first (`index.html`, `presenter.html` — no other page links a board sheet).

| Component | Selectors | Shared now |
|---|---|---|
| Board container | `.{bingo,bowl,memory,lowstakes}-board-slide .pad` | `display`, `flex-direction`, `color` — each sheet keeps its own `padding` and `gap` |
| Header row | `.bingo-head`, `.bowl-head`, `.mem-header`, `.lsq-header` | the whole rule; all four were byte-identical |
| Clock / counter | `.bingo-count`, `.bowl-count`, `.mem-clock`, `.lsq-clock` | `display`, `align-items`, `border`, `color` — each keeps `gap`, `border-radius`, `padding`, `background` |
| Clock label / value | the `span` and `strong` children of the above | `span` entirely; `strong` keeps `font-variant-numeric`, each sheet keeps its own size |
| Button base | `.mem-button` and its `.primary`, `:focus-visible`, `:disabled`, `.theme-mono` variants | the whole set |

**Result:** 75 duplicated declarations and 13 now-empty rules removed. Board
CSS went from 637 to 580 lines.

**Verified as a no-op.** Every selector's effective declaration set — the
merge of all five sheets in load order — was captured before and after and
compared. No selector that matches a real element changed. The only removals
were `.board-slide` and `.board-btn`, two generic selectors `board-common.css`
introduced that no code path ever emits, and one `transition` on `.mem-button`
that no memory button previously had. Both boards were then exercised in a
real browser (`tools/smoke-lowstakes.mjs`, `tools/smoke-knowledge-flip.mjs`).

### What was deliberately *not* deduplicated

49 declarations still appear in three or more board sheets — `display: flex`,
`margin: 0`, `gap: 6px`, `color: var(--s-fg)` and the like. These are not
duplication. They are unrelated elements that happen to share a common value,
and collapsing them into shared classes would couple a bingo cell to a
low-stakes answer card so that neither could change without the other.

The distinction matters for the Tailwind question below: counting repeated
declarations overstates how much shared structure exists. What was genuinely
shared was four components, and those are now extracted.

## 3. Tailwind CSS Evaluation

### Strengths for SlideForge
1. **Editor Chrome & Panels (`#app`, `.topbar`, `.inspector`, `.rail`)**:
   - High utility value: replacing bespoke utility-like rules (`display: flex; align-items: center; gap: 8px; border-radius: 6px;`) with standard Tailwind classes.
   - Elimination of dead or overlapping CSS selectors across `app.css`, `studio.css`, and `customize.css`.

### Technical Constraints & Risks
1. **Fixed 1280 × 720 Slide Coordinate Geometry**:
   - All slide layouts, cards, fonts, and interactive elements assume a hard `1280px × 720px` coordinate box that is dynamically scaled via CSS transform:
     ```css
     .slide { width: 1280px; height: 720px; transform: scale(var(--sf-scale)); }
     ```
   - Standard Tailwind responsive utilities (`sm:`, `md:`, `lg:`) and fluid units (`vh`, `vw`, `%`) cannot be applied directly to `.slide` contents without breaking projection parity between host screens, student devices, and preview thumbnails.
2. **Dynamic CSS Variable Theming**:
   - The presentation engine relies on runtime CSS variable switching on `.slide` (`--s-bg`, `--s-fg`, etc.). Tailwind can reference custom properties (`bg-[var(--s-card)]`), but wholesale selector replacement requires careful preservation of theme overrides (such as `.theme-mono`, `.theme-paper`).

### Recommended Tailwind Migration Path
* **Phase 1: Token & board deduplication — done.**
  The four shared board components are extracted to `css/board-common.css`; see section 2. Class contracts are unchanged, so no markup moved.
* **Phase 2: Visual regression baseline — done.**
  All 24 game styles × 6 themes (144 baseline snapshots) are captured and
  stored in `tools/baselines/`. The automated regression runner
  (`tools/visual-regression.mjs`, scripts `npm run visual:check` and
  `npm run visual:update`) mounts deterministic 1280×720 slide fixtures,
  disables CSS animations, performs pixel-level OffscreenCanvas diffing with
  configurable mismatch thresholds, and highlights visual regressions in diff
  PNG artifacts.
* **Phase 3: Incremental Tailwind Chrome Adoption**:
  Introduce Tailwind utilities starting with isolated standalone views (`manual.html`, `presenter.html` action strips, and the editor `#app` topbar/inspector), leaving the `1280x720` slide renderer as dedicated design-token CSS.
