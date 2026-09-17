# The modular canvas — what we are trying to do

Written 2026-09-17 for whoever picks this up next, model or person.
Read this before `docs/design-system-and-the-canvas.md` §14b, which has the
detail. This is the intent and the state.

---

## The goal, in one sentence

**Adding a heading should bring its measurements with it.**

You choose "heading", and it arrives already the right size, already sitting
flush on the page, already knowing how much room it takes and what moves down
to make space. Same for an image, a list, a quote. The author picks *what*, not
*how many pixels*.

That is the whole ambition. Everything below is in service of it.

The test ground is **`localhost:8787/modular-canvas/preview.html`** — a safe
preview that renders real slides through the real renderer and draws the grid,
the slots and the chrome bands over the top. Production CSS is untouched by the
page itself; it only measures.

---

## What was tried and reverted, so nobody rebuilds it

A freeform canvas editor was built and **reverted** (`21e44ca`): split-layout
drag gestures, a card canvas, an artwork layer stack, and direct-manipulation
handles with click-to-select, eight resize handles and rotate.

It worked. It was reverted anyway, for two reasons worth keeping:

1. **Complexity against value.** Four modules, four smoke suites and a growing
   set of interaction rules, on top of an engine whose strength is that
   `slide.type` decides the layout.
2. **It reached almost nothing.** Named chrome regions — the same family of
   idea — are region-capable on **35 of 45** campaign slides and **0** of
   everything else: 0/252 NUL, 0/70 UKBT, 0/39 Studio. A gesture no existing
   deck can reach is not a feature.

It is all in git history. Bring back a piece if it earns its place; do not
start it again from scratch.

**Freeform still belongs to decorative artwork only.** Never to content. Free
`{x, y}` fights the layout contract that makes themes, reflow and print parity
work — and that contract is the product.

---

## The model we settled on

Three layers, and it matters which is which.

### 1. Chrome region — where the furniture lives

`--sf-chrome-top`, `--sf-chrome-side`, `--sf-header-h`, `--sf-footer-h` on
`.slide`, consumed by `.slide-logo` and `.pagenum`.

Before this, the mark's inset was set in five places, three of them on
`.slide-logo` alone — so the page number never came with it. The mark's top was
24, 26, 28, 30 or 36 across the Library; its right edge 28, 34, 40 or 48. Now
three declared insets and **307 of 309** slides have the mark and number on one
right edge. The two exceptions are `has-clock`, where the clock takes the
corner on purpose.

The campaign keeps its own edge: a real `.cp-header` (56px) and `.cp-footer`
(32px) at a 52px content edge.

### 2. Body lattice — what the boundaries land on

The campaign body is `720 − 32 pad − 56 header − 32 footer − 24 pad` =
**576px**, which is **16 rows of 36** exactly.

The header was 40px while the lockup beside it is 56, so the mark hung into the
body; the body had been covering for it with 32px of its own padding. Moving
that 16px from body padding into the header made the band contain its contents
**and** made the body divide cleanly — at zero visual cost, verified block by
block.

### 3. Slot table — what a person actually places

Every composition is **two or three top-level slots**, each a whole number of
rows. Declared in `css/customize.css`, not derived:

```
poster-art  copy 11 · art 14        voice       label 1 · voice 6
ballot      2 · 11 · 1              prompt      label 1 · discussion 6
reveal-map  2 · 8 · 1               rules       2 · 12 · 1
commitment  mark 9 · action 11      comparison  2 · 12
credits     2 · 12 · 1              lanes       2 · 11 · 1
```

Repeated items are whole rows too — a choice 5, a rule 4, a credit 2 — so the
sixth is as predictable as the first.

**A slot is what you place; a row is what its boundary lands on.** Slots are
the content model and are interchangeable (that is what makes "swap these
around" mean something). Rows are the rhythm. You need both, doing different
jobs.

**The rule that makes it work:** a slot's height must not depend on its
wording. A heading that grows by a line used to push everything below it off
the lattice. A heading in a two-row *box* does not. Boxes, not margins.

---

## Where it stands

| | |
| --- | --- |
| Block tops on a row line | **141 / 148 (95%)** — was 30/148 |
| Perfect compositions | ballot, rules, voice, prompt, commitment |
| Reference implementation | **`poster-art`** — see below |
| Campaign slides fitting | 45 / 45, 0 overflow |
| Tests | 433 pass |

### `poster-art` is the reference — start there

It was re-fitted first and by hand, and everything else was derived from what
it taught. If you want to see the model working, open the first tile in the
lab and look at that slide.

```
safe         4/4   eyebrow r5 · heading r6 · tagline r12 · art r2
creative     4/4   eyebrow r5 · heading r6 · tagline r12 · art r2
responsible  4/4   eyebrow r5 · heading r6 · tagline r12 · art r2
future       4/4   eyebrow r5 · heading r6 · tagline r12 · art r2
smart        3/4   tagline off 20
```

**Four of the five covers are exact**, and the fifth is off for a structural
reason rather than a layout mistake — see the note below. Every block sits on
its line, the art is 14 whole rows, and the whole re-fit cost the design about
three pixels of visible movement.

Three things it established, which the other nine compositions then inherited:

- `align-items: center` cannot coexist with a lattice. A centred item's offset
  is a function of its own height, so a copy stack and a 490px artboard can
  never both sit on a line. Start-aligned, placed explicitly.
- Whole-row boxes, not margins. The eyebrow's 26px margin became a one-row box
  and the tagline's 32px a row gap.
- A span contains its block, so **round up, never to nearest**. 275px of
  heading does not fit 7 rows of 36; it needs 8. Overflow becomes impossible by
  construction rather than by luck.

The 7 remaining misses are two separate things:

- **Six** are the bottom `source` / `note` line sitting 14px low. One more
  shared fix.
- **One** is Smart's tagline, and it is structural: Smart is the only
  three-line cover headline, 274.5px = 7.63 rows, so nothing below it can land
  until the heading gets a whole-row box like everything else. Fixing that
  makes it 148/148.

---

## The instruments — use these, do not eyeball

| Tool | What it answers |
| --- | --- |
| `node tools/row-audit.mjs [--detail]` | every campaign block against the lattice, per composition |
| `modular-canvas/preview.html` | the grid, slots and chrome bands drawn over real slides |
| `node AiAd27/check-fit.mjs` | does anything overflow its slide |
| `node tools/smoke-chrome-region.mjs` | mark and number share one declared inset |
| `node tools/smoke-campaign-chrome.mjs` | header, closing rule, both marks |
| `node tools/smoke-row-grid.mjs` | how well content matches a candidate pitch |

---

## Traps that have already cost time

**The visual baselines do not cover any of this.**
`tools/visual-regression.mjs` builds decks with no `logo`, no
`showSlideNumbers`, and renders with no `index` — so **no baseline contains a
mark, a page number, or a `.cp-*` composition slide**. All 597 passing proves
only that the generic bodies were left alone. It is not evidence about chrome
or campaign layout. Use `row-audit` and the smokes.

**Measure in the page that shows the deck.** A detached render is a different
layout context. A headless probe rendering into the app's index page reported a
cover headline as three lines when it is two, and that wrong number reached the
design doc before it was caught.

**Distrust a pitch that looks good.** Ranking grids by "distance to nearest
line" rewards whichever grid has the most lines. Against a random null model,
every candidate pitch sits at or near chance — 36px at 0.90×, 32px at 1.11×,
24px at 1.02×. There is no latent row structure in the decks; the lattice was
*imposed*, and the pitch was chosen by measuring which re-fit moves the least
(36px moves the headline 3px; 32px moves it 15px).

**Competing declarations are the recurring bug, not the pitch.** A single
`.slide.layout-journey h2 { margin: 0 0 10px }` in `app.css` outranked
`.cp .cp-heading` — two classes and an element beating two classes — and put
every rule row and the whole comparison table off its line. Fixing that one
specificity took the audit from 57% to 82%. When something is off by a constant
small number, look for a rule you do not know about before changing geometry.

**Decoration must stay out of the flow.** A 5px `border-top` on the credits
group put every row below it 5px low. A 12px one on a lane did the same.
Pseudo-elements draw the rule without entering the lattice. The big quote mark
and the artwork plane are already `position: absolute` and correctly outside.

**A measurement tool that races the layout is worse than none**, because it
looks like an answer. The lab twice reported errors on CSS that was exact —
once from dividing a transformed rect by the tile scale, once from painting
before the font and artwork landed. It now measures in layout units
(`offsetHeight`) and repaints after `fonts.ready` and image decode.

---

## What to do next, in order

1. **Finish the lattice.** The six `source`/`note` lines and Smart's heading
   box. Target 148/148. Small, and `row-audit` names each one.
2. **Give the generic layouts a body region.** They have a chrome region now
   but no `.cp-body` equivalent, which is why their row figures were never
   comparable to the campaign's — they had to be measured against the whole
   720px stage. This is the precondition for anything row-based reaching NUL,
   UKBT or Studio, and it is worth more than any further campaign polish.
3. **Then the payoff: author from the slot table.** Once every composition is a
   declared list of slots with row counts, "add a heading" can mean "insert a
   two-row heading slot and push the rest down" — which is the goal at the top
   of this document, and the same list an editor would need to let someone
   reorder slots.
4. **Regions need their own lattice.** The slot table is scoped
   `:not(.chrome-regions)` because regions reassemble the chrome and change the
   body height. Applying the campaign lattice there overflowed the ballot
   slide.

## What not to do

- Do not rebuild freeform content editing. Artwork only.
- Do not add a row pitch to a theme that has no body region yet.
- Do not trust the visual baselines as evidence for chrome or compositions.
- Do not set `top`/`right` on `.slide-logo`; move the region tokens instead.
- Do not express slot spacing as margins. Boxes.
