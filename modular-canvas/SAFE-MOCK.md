# Safe deck acceptance mock

Open `/modular-canvas/preview.html#safe-deck`.

For the same slot engine on all 97 NUL layout-bank slides, see
[`DEMO.md`](./DEMO.md) (`#demo-deck`).

**Named chrome (default on):** header and footer bands stay fixed; furniture
items (theme identity, optional context, logo · closing text, page number) move
between left / centre / right via ✥ drag handles or the Chrome map beside the
canvas. Occupied slots swap. This reuses `SF.setChromeSlot` /
`SF.bindCanvasRegions` — the same contract as Look → Header and footer in the
editor. Toggle **Named chrome** off to compare theme placement.

All nine original Safe slides are available; Audience sequence hides the teacher
preparation and vocabulary slides. The seven audience slides carry their own
numbering and progress. Original design switches back to the campaign renderer
with the current edited wording.

`safe-deck.js` declares slot recipes by semantic slide type, reusing DOM blocks
from `SF.renderSlide`. Text stacks on the cover and commitment are separated into
slots. Voting, discussion, risk diagrams, numbered rules and vocabulary retain
their existing internal renderer. This is a lab adapter, not a new production
rendering contract. No slide-index CSS exceptions are used.

The mock supports direct canvas text editing, cover column splits, slot outlines, fit warnings,
per-slide reset and a JSON snapshot download. Changes are in memory. The snapshot
contains the deck and recipe definitions; it is not yet an editor import format.
Live voting, new asset selection, content flips, backdrop editing and production
save/load/export are not implemented by this mock.

Fit and legibility come from `SF.measureSlideFit` — the same module Demo and
production use — called once per slot with the slot as its own frame. That is
what stopped the two engines diverging: Safe carried its own copy of the check
and so missed the painted-size reading and the legibility floor entirely. It now
reports the smallest painted text per slide, and **two campaign slides paint at
18px**, under the 20px floor.

Slot callers pass `allowAscent`. A word's client rect starts at the top of its
line box and a font's ascent reaches above that, so a heading in a box sized to
its own text reports 3–7px of "overflow" with nothing clipped — every one of the
nine slides failed on that edge alone the first time the shared check ran. A
caller measuring against the slide frame does not pass it, because text above the
slide really is off the slide.

Fit checks wait for fonts, image decode and layout. Text Range top edges are not
used as line-box boundaries: font ascent can extend above a tight line-height
without overflowing painted text. Horizontal and bottom extents and scroll sizes
are checked. Fit is geometry evidence, not a contrast or visual-quality verdict.

Chrome is measured as well as the grid. Some content renders into the header or
footer rather than a slot — the Risk reveal subtitle is the header context line —
and those nodes are editable, so they are checked against the band they sit in
(slide top to grid top, grid bottom to slide bottom). Without that check a long
header grows down into the first slot and every slot still reports as fitting.
Slots whose name contains "mark" are exempt from the per-word check, because the
quote glyph and the action mark are drawn to exceed their box on purpose.

Run `node tools/smoke-safe-slot-mock.mjs` with the local server running on 8787
(or set SF_BASE_URL). It checks nine fits, audience filtering, page numbers,
long-copy overflow, reset, original comparison, and JSON snapshot integrity.

Before transfer to the main site:
- Review the nine slides visually with slots hidden and against Original design.
- Decide which layout controls to expose beyond the current cover split.
- Move the accepted recipes into a shared model/renderer rather than copying
  preview DOM manipulation into the editor.
- Add production persistence and test present/print/export parity and existing
  activity behaviour. The local visual voting block does not prove live voting.

Click visible text to edit in place. Tab moves between fields; Escape restores the
value from when that field received focus. Compound blocks update each part
independently. Presenter notes stay below the canvas. No content sidebar is used.
