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
- Edit text on the canvas. **⠿** moves a slot; **⇄** opens the feature picker.
  **Reset this slide** / **Download mock JSON**.

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

## Swapping the feature

**⇄** pops a picker of every shape this slide can become. It is the app's own
layout machinery, not a lab copy: `SF.SLIDE_TYPES` supplies the labels and icons,
`SF.LAYOUT_GROUPS` the grouping, `SF.DECK_TYPES` the authorable set, and
`SF.prepareLayout` does the conversion — the same call `js/editor.js` makes.

**The heading always carries over, and nothing is deleted.** `prepareLayout` only
sets the type and seeds fields the new shape needs; a field the new shape cannot
render stays in the data, so the swap is reversible. Options that take bullet pits
are marked *keeps points*, which is exactly `SF.BULLET_LAYOUTS` — so bullets to a
table shows the heading and table, with the points still there if you swap back.

Positions are dropped on a swap (`delete slide.mockRecipe`), because spans measured
for the old shape mean nothing to the new one. Fit is re-checked immediately.

### Each option says whether it will fit

On opening, the picker renders every offered shape off screen with your actual
words — `prepareLayout` on a clone, the same conversion the swap performs — and
labels it **should fit**, **too tight** or **needs a picture**. 33 shapes measure
in about a second. A too-tight shape asks once more before it commits.

It is a prediction, so it can be wrong, and when it is the status says so rather
than letting the two disagree in silence: *"the picker expected this to fit; it
does not."* One shape in 256 swaps does this — chart to Statement, where the
chart's data ends up as 58px display type. A quiet wrong "should fit" would be
worse than no estimate at all.

### What ⇄ actually changes

**The whole slide, not the box it sits on.** Every slot carries a ⇄ and they all
do the same thing, because a feature is a property of the slide. The picker says
so at the top; the slot name only appears in the report, to say where you asked
from.

A shape that shows no heading is flagged **drops the heading** — `quote` and
`statement` carry the words but not the title. The title stays in the data, so a
swap back restores it, but the slide loses it, and that reads as the app eating
your heading unless it is said first. Those choices ask once more before
committing, and the report says what happened.

### Bugs this found

A 256-swap sweep across eight source slides turned up three:

- **A slide with no slots reported a pass.** `measure()` loops over the slot
  boxes, so zero boxes meant zero failures: swapping a wordy slide to Image,
  Image stack or Video claimed *"All 0 slots fit"* while the recipe line said
  *"No recipe matches"* — the two contradicted each other in the same breath. The
  layout renders a placeholder with no `.img`/`.vid` for the recipe to find, so
  nothing is placed. Zero slots is now a failure that names the cause.
- **The picker outlived its own slide.** Nothing closed it on re-render, and it
  closes over the slide it was opened on, so navigating with it open would apply
  the next choice to the previous slide. `render()` closes it.
- **The trial normalized and the swap did not**, so the two ran different
  conversions. The trial now matches `applyFeature` exactly.
- **Trial renders joined the live DOM.** The trial host was mounted inside
  `#demo-deck`, so every trial's `.safe-slot` boxes sat alongside the slide's:
  opening the picker on a two-slot slide made the page report three slots, then
  five. Off screen and invisible, but anything asking `#demo-deck .safe-slot` —
  including a test — saw the trial. The host now lives outside the section.
- **"The heading always carries over" was wrong**, and the picker said it in
  print. `prepareLayout` keeps the field; it is the layout that decides whether
  to render it, and `quote` and `statement` do not.

An authorable type with **no** group is excluded on purpose, matching the editor:
`join` is inserted by the live flow rather than chosen as a shape. The smoke
asserts the picker and the editor agree on that set, so neither can drift.

This replaced a two-click arm that exchanged **slot geometry** between two slots —
including across slides. That moved boxes around; it never changed what the slide
was, which is what "swap this for a chart" means.

## Formatting text

Double-click any text on the canvas and the app's own editor opens:
`SF.Custom.openCanvasEditor` with the shared **B / I / U / ▰ / Clear / Link**
toolbar, colour picker and ⌘B/⌘I/⌘U. Marks land in `slide.formatting` and paint
through `SF.Custom.paint` inside `rich()`, so they survive a re-render and behave
the same here as in the editor. Typing stays in place; only formatting needs the
toolbar.

The lab loads `js/customize.js` for this. It calls `SF.toast` and
`SF.slideJumpTarget`, which the shell owns and this page does not load, so both
are shimmed — without them "select the words you want to format first" throws
instead of reporting. Loading it does not move the audit: still 96 of 97.

## Rearranging

Drag a slot's grip. Within a stack the others are **pushed aside**; across stacks
the **sides swap**. The row budget is shown next to the recipe line, and it cannot
move under a rearrange — each gap travels with its item, so the multiset of spans
and gaps is unchanged and its sum cannot change. The smoke asserts that over five
moves and one real pointer drag rather than trusting the argument.

Vector blocks carry a readable minimum width (`MIN_COLS`) alongside their span,
and too-narrow is reported like a bad fit. Nothing else catches it: a chart cannot
overflow, it scales to its box, so illegibility is its only failure mode.

## Why it works this way

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

### Position is derived at the moment of a move

This is the part that decides whether the feature is cheap or a nightmare.

Recipes still store a row, because the renderer needs one. But no row is ever
*authored by hand* after a move: `magneticMove` reads the group's gaps, reorders
the list, and re-stacks. Authoring row 3 by hand would mean every reorder rewrites
every coordinate below the moved item, which is the coordinate-shuffling that made
the reverted canvas editor unworkable.

Read as gaps-plus-spans, slide 1 is:

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

### Canvas, with a panel for the budget

Split by what each is actually good at.

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

### Engines

Three, and no more: **playground** for free-typed content and theme switching,
**Safe** for the AiAd27 campaign deck, **Demo** for the NUL layout bank. A fourth
engine briefly held the derived-stack prototype; it is gone, and its behaviour and
its tests live here instead. New positioning work belongs in Demo, because that is
where all 97 slides can contradict it.
