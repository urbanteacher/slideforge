# Demo · layout-bank positioning deck

Open `/modular-canvas/preview.html#demo-deck`.

Demo applies the same **Safe** slot lattice (16 rows × 12 columns inside the pad)
to every slide in the NUL `layout-bank` lesson (97 slides). It is the stress test
for a professional positioning tool: recipes declare spans; measured fit fails
when content outgrows a span. Production northeastern CSS is not modified.

## Controls

- Filter by slide type, step through slides, toggle **Original design** vs slotted.
- **Show slots** outlines the lattice.
- **Audit all 97** measures every slide and prints fail-by-type + first failures.
- **Flip · artwork** locks content slots and opens a **Stack** panel beside the
  canvas (back → front). Select an asset, toggle **Plane / Hide / Lock**, reorder
  with Back/Front, drag on the canvas to snap. **Flip · content** returns to slot
  editing. Poses live on `slide.mockArt` (`plane`, `hidden`, `locked`, `order`, `x`, `y`).
  This is not the reverted always-on Layers panel — the stack only appears on the art face.
- Edit text on the canvas; **drag the ⠿ grip** on a slot to move it on the
  lattice (snaps to columns/rows) or drop onto another slot to swap. **Reset this
  slide** / **Download mock JSON**.

## Latest audit (lab)

Two independent verdicts. **Fit** is about space; **legibility** is about size. A
slide can pass one and fail the other, so neither number is allowed to hide the other.

| Result | Count |
|--------|------:|
| Fit | 96 |
| Need space | 1 |
| Under the 20px legibility floor | 44 |

### Fit

| # | Type | Slot | Verdict |
|---|------|------|---------|
| 94 | `compare` | Compare | **Over budget.** No recipe change closes it — see below |

Re-fit, without shrinking any type:

| # | Type | Was | Fix |
|---|------|-----|-----|
| 70 | `split` | Copy needed 594px in 576 | Copy takes **7 of 12 columns** (570px → 671px measure). The wider measure drops the extra line; the picture loses 101px and still reads |
| 97 | `content` | List needed 512px in 504 | Inter-item margin `0.22em` → `0.12em` (512 → 502). Rhythm is layout, not legibility, so it gives way before type size does |

#### Why #94 cannot be re-fitted

Measured, not assumed. `compare-labelled` with 4 steps needs **597px** in a 504px
(14-row) slot. Sweeping its internal spacing:

| Row gap | Row padding | Needs |
|---------|-------------|------:|
| 10px | 4px 8px | 597px |
| 4px | 2px 8px | 575px |
| 0 | 0 8px | 557px |
| 0 | 0 4px | 540px |

Zero gap and zero padding still leaves it 36px — exactly one lattice row — over a
14-row slot, and the block is already at 15px type, below the floor. It only fits
if it takes all 16 rows with no internal spacing at all, which removes the heading
and the visual separation that makes the rows read as rows.

**So this is a content-budget verdict, not a recipe bug: four labelled comparison
steps of this length do not fit one slide at a readable size.** The row model is
supposed to refuse here. Split the content or shorten the cells.

### Legibility

44 of 97 slides paint text under 20px — on a 1280x720 slide, 20px is 2.8% of slide
height. Only 5 of 97 use smaller type than the original renderer, and three of
those are table headers: Demo is not buying its fit with shrinkage, the lattice is
exposing sizes production already ships.

| Type | Slides | Smallest painted |
|------|-------:|-----------------:|
| `chart` | 20 | 14.7px |
| `image` | 4 | 17px |
| `game` | 4 | 17px |
| `table` | 3 | 12.2px |
| `stats` | 3 | 19px |
| `funnel` | 2 | 17px |
| `code` | 1 | 12px |
| `split` | 1 | 13px |
| `join` | 1 | 14px |
| `orgchart` | 1 | 16px |
| `gallery` | 1 | 16px |
| `timeline` | 1 | 18px |
| `introduction` | 1 | 19px |
| `journey` | 1 | 19px |

#### Painted size, not declared size

The first version of this check read `getComputedStyle(el).fontSize` and gated on
`el.offsetHeight`. Both were wrong for charts. `offsetHeight` is undefined on SVG
elements, so **all 20 chart slides were skipped silently**, and the declared size
overstates what the room sees: an SVG paints its text at the viewBox scale. Slide
42's flow chart declares 19px and paints 17.5px at full width.

**This matters more than the numbers.** An SVG block in a slot can never fail the
fit check, because it scales to its box instead of overflowing. Transplant that
same chart into a 7-column slot and it paints at roughly 11px with **zero measured
overflow**. For vector blocks, illegibility is the only failure mode there is, so a
painted-size floor is not a nicety — it is the whole contract.

## What Demo informs for production

1. **Body lattice** — pad-owned 16×12 (Safe pitch), not freeform coordinates.
2. **Dense lists** — AiAd27’s `li { min-height:108px }` must not leak into NUL;
   Demo overrides that for the bank.
3. **Headings** — long titles need 2–3 rows at ~40px; 2-row headings fail when copy wraps.
4. **BLEED** — `image` / `split` / `video` still sit on the lattice so overflow stays visible;
   full-bleed chrome work comes later.
5. **Columns are the second axis** — #70 was fixed by moving the split from 6/6 to
   7/5 columns, not by shrinking type. Column share belongs in the authoring
   surface alongside row spans.
6. **Legibility needs a floor in code** — 13 types ship text under 20px. Geometry
   fit and readable size are separate contracts and both need checking.
7. **Recipes live in** `demo-deck.js` — promote accepted spans into shared model/CSS
   once AiAd27 re-fit and NUL body work land.

## Smoke

With the server on 8787:

```bash
node tools/smoke-demo-deck.mjs
```

Expects 97 slides, need-space ≤ 1 (the one known over-budget slide) and no more
than 44 slides under the 20px floor. Both budgets equal the current state on
purpose: any slack lets a regression hide inside it. The legibility budget is a
ratchet against getting worse, not a claim that 24 is acceptable.

## How rearranging should work

`node tools/stack-audit.mjs` answers this by measurement rather than taste, and
the answer is unusually clean:

**30 of 30 slide types express as vertical stacks. Only 2 put stacks side by side
(`introduction`, `split`). The only gaps used anywhere are 1, 2 and 3 rows.**

So the body is not a 192-cell canvas that happens to have things on it. It is a
stack of 1–5 items with small explicit gaps, and in two cases two such stacks.

### Why the chrome map does not generalise

The chrome map works because the header and footer have **three slots each, a
closed set, and one operation** — swap. Six cells drawn as two rows *is* the thing
it represents, so there is nothing to translate.

The body has 16 x 12 = 192 cells. A map of 192 cells is a spreadsheet, not a map.
But the body's *slots* number 1–5 and sit in one stack, so **the body's map is a
list, not a grid.**

### Derive position, do not author it

This is the part that decides whether the feature is cheap or a nightmare.

Recipes today author the row: `['h1', 'Headline', 1, 12, 3, 6]` puts the headline
at row 3. Row 3 is a consequence of what sits above it, so authoring it means every
reorder rewrites every coordinate below the moved item — which is exactly the
coordinate-shuffling that made the reverted canvas editor unworkable.

If an item declares only its span and its column share, and row position is derived
by stacking, then the gaps become items too:

```
title: [{ space: 2 }, { headline: 6 }, { space: 1 },
        { subtitle: 3 }, { space: 1 }, { date: 2 }, { space: 1 }]   // = 16
```

That is slide 1 exactly. And then:

| Operation | Implementation | Invariant |
|-----------|----------------|-----------|
| Reorder | array move | spans + spacers = 16 |
| Insert | splice | same |
| Delete | splice | same |
| Resize | change one span | same |

One assertion covers all four, and no coordinate is ever written.

### Canvas or panel

Both, split by what each is actually good at.

**Canvas owns arrangement.** Every gesture a stack needs is one-dimensional and
snapped: drag up/down to reorder, drag the bottom edge to change span, drag a side
edge to change column share. There is no free positioning, so there is no pixel
precision to get wrong — which is why this is not a repeat of the reverted editor.
That attempt put freeform handles on the same surface as content, so the two
competed for clicks and it needed a pointer-transparency mode with an unguessable
side effect. A snapped stack needs none of that, and you can see what you are
editing because it is the slide.

**Panel owns the budget and the palette.** A row counter (`16 rows: 2 + 6 + 1 + 3
+ 1 + 2 + 1`) and the list of items you can add. Those are lists, not positions.

**Chrome keeps its map.** Six cells is genuinely a map, and swapping is genuinely
the only operation it needs.

### Build order

Convert one recipe from authored rows to a derived stack and prove a drag-reorder
against it. Do that before anything else: if position is still authored when the
first drag lands, every drag becomes a coordinate rewrite and the rest of the work
is built on the thing we already reverted once.

Blocks also need a **minimum readable size** next to their span, because an SVG
block cannot fail the fit check — it shrinks instead of overflowing. A chart is not
"12 rows"; it is "12 rows and at least 8 columns".
