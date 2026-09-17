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
- Edit text on the canvas; **Reset this slide** / **Download mock JSON**.

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
