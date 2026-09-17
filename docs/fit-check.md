# Fit check

Production module, not a lab note — it moved here out of `modular-canvas/` when
`js/editor.js` started calling it.

`src/render/fit-check.js`, exposed as `SF.measureSlideFit`, `SF.probeLayoutFit`,
`SF.svgScale`, `SF.FIT_TOLERANCE`, `SF.LEGIBLE_FLOOR`.

Built into `js/model.js` and covered by `npm test`
(`tests/fit-check.test.js` → `tools/smoke-fit-check.mjs`), which exercises it on
**production rendering with no lab page involved**. That independence is the
point: these are the two functions `js/editor.js` calls, so they have to hold up
without the lattice, the recipes, or anything else the lab adds.

## Two verdicts, because they fail for different reasons

| Verdict | Question | Field |
|---------|----------|-------|
| Fit | does content escape its box or the slide? | `fits`, `issues[]` |
| Legibility | is the smallest painted text readable? | `legible`, `smallest`, `smallestIn` |

Geometry never catches the second: a chart passes every box test and paints its
labels at 16px. Field names follow OPF (`minFontSize`) and the reports follow the
slide overflow checkers (direction plus pixels, not a boolean).

## Measure painted glyphs, not scroll size

A `scrollHeight > clientHeight` sweep is the obvious first instrument. It was
wrong twice over, and **96 of 97 real slides failed it**:

- `.theme-art` is oversized and clipped **on purpose** — it reported 170px of
  "overflow" by design.
- A tight `line-height` makes a heading's `scrollHeight` exceed its `clientHeight`
  by the font's **descent**, with nothing actually cut. Every `h1` failed.

What a viewer sees is where the glyphs land, so that is what gets measured: each
word's client rects against the slide frame, and against the nearest ancestor
that would clip it. Comparing the ancestor **by rect** is what separates a glyph
that is genuinely hidden from one sitting in a box whose scroll size is simply
larger than its client size.

With that instrument, **1 of 97 slides overflows: #43 `chart`.**

## Trials: two hooks, and the order matters

`probeLayoutFit` renders the converted slide off screen. The conversion is
`prepareLayout` on a clone — the same call the editor makes — so the estimate and
the result cannot run different code.

| Hook | When | For |
|------|------|-----|
| `prepare(root, trial)` | before settling | rearranging the render |
| `inspect(root, trial)` | after settling | extra measurement; merged into the verdict |

Passing a rearrangement to `inspect` measures a layout that has not been laid out
yet. The lab learned this by doing it: its lattice check ran before the grid had
a frame to lay out in, and every block looked like it fitted.

The lab also has to `delete trial.mockRecipe` in `prepare`. `structuredClone`
carries the source slide's recipe, whose selectors were written for the old
shape — left in place, a quote trial looked for an `h2` and a `ul`, found
neither, and reported "needs a picture".

## In use

`js/editor.js` · `markLayoutFit` labels every thumbnail in the layout picker.
The picker already renders a trial of each candidate shape and threw the render
away; these are those renders, measured where they sit. Only problems are
labelled — `may not fit` with the direction and pixels on hover, or `small text`
for the separate legibility verdict. The thumbnail is scaled and
`getBoundingClientRect` is post-transform, so the tolerance scales with it: a
flat 1px would allow roughly eight slide pixels through at thumbnail size.

`modular-canvas/demo-deck.js` calls it once per Engine 3 slot with the slot as
its own frame, but only for the legibility verdict. Engine 3 counts fit in lines
of its own lattice instead: a display face paints an inline box half a leading
taller than its element box, and `escapes` reads a bottom overhang as an overflow
while ignoring an identical one at the top, so the same block passed or failed on
where it sat in its slot. That asymmetry is right for a whole slide, which has no
line below it to spill into, and wrong for one slot in a stack.

## What is deliberately not in here

No lattice, no recipes, no spans, no slots. The lab passes its stricter
slot-level test through `inspect`, so that stricture does not leak into the
production answer. When this lands in `js/editor.js`, the layout picker already
renders a trial of every candidate shape — it just throws the render away instead
of measuring it. Measuring a render that already happens is the whole change.
