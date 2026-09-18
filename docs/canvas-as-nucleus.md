# The canvas as nucleus: what SlideForge has, what the clones do, and the smallest system that holds

Written 2026-09-18 from `northeastern-lecture-theme`. A position document, in the
same spirit as `design-system-and-the-canvas.md`: it exists so that the next
person or model picking this up starts from the same model of the system instead
of re-deriving it.

Every number below was measured by building the library and walking it, not
estimated. The method is at the end.

The brief was: review the canvas and whether the code scales, use the
open-source Slides / Kahoot / Canva clones as reference, aim at a system where
the canvas is the nucleus — **without being overwhelmed by all the options and
choices available**.

That last clause turns out to be the whole finding, and it points somewhere
other than where it sounds.

---

## Read this first

1. **The option problem is real, and it is not in the arrangements.** The
   authored surface is 38 slide types × 40 design keys × 16 compositions × 23
   themes. But of the 40 design keys, **17 have never been used by any of the 22
   library lessons**, while **16 of 16 compositions are used**. The abstraction
   that earns its keep is the one that names a whole arrangement. The bloat is
   in the individual knobs.
2. **So the fix is fewer knobs, not fewer layouts.** Cutting slide types would
   remove capability people use. Cutting unused design keys removes surface
   nobody has ever wanted, and each one is a control, a catalogue entry, a
   render branch and a test.
3. **The canvas cannot become Canva, and should not try.** The freeform element
   model that Canva, Polotno and PPTist use forfeits four things SlideForge
   currently has for free: reflow, re-theming, aspect/print export, and the live
   room. 418 authored slides depend on all four.
4. **There are now three answers to arrangement in this tree, and I added the
   third.** Compositions, the lab's line-tariff lattice, and the production
   region lattice I shipped this session. That is the most urgent thing in this
   document.
5. **The nucleus already exists — it is the contract, not a component.**
   `slide.type → layout() → a fixed DOM of known class names → --s-* tokens`.
   Everything good about this codebase falls out of that sentence. The canvas is
   where it becomes visible, not where it lives.

---

## 1. The measured surface

| | count | used by the library |
|---|---:|---:|
| slide types | 38 | **30** |
| design keys | 40 | **23** |
| compositions | 16 | **16** |
| themes | 23 | — |
| library lessons | 22 | 418 slides |

`js/render.js` is **6,249 lines**; `js/editor.js` is 4,036; the lab's
`demo-deck.js` is 2,310. The canvas code I added this session —
`arrange.js` 377, `artwork.js` 366 — is small, which is the only reason it was
safe to add at all.

**The eight unused slide types** are `orgchart`, `explore`, `simulation`,
`gallery`, `spotfake`, `quiz`, `explain`, `results`. Three of those —
`quiz`, `explain`, `results` — are generated at run time by the activity
engine, so they are not meant to be authored and are not dead. The other five
are: a capability with no specimen. Per *engine surface, not slide features*,
a capability with no specimen is undocumented by construction.

**The seventeen unused design keys** are `chromeLayout`, `logoSlot`,
`identitySlot`, `contextSlot`, `closingSlot`, `numberSlot`, `align`, `size`,
`textColor`, `background`, `placement`, `imageStep`, `cardPics`,
`funnelDirection`, `timelineMode`, `capFade`, `chartFocus`.

Read that list carefully, because it splits cleanly in two:

- **Six of them are the chrome-region family** (`chromeLayout` and the five
  `*Slot` keys). That is one feature, not six, and it is the feature the lab's
  header/footer controller drives. It is unused by the library because no
  library lesson moves its furniture — not because it is bad.
- **The rest are per-type knobs**: alignment, size, colour, background,
  placement, one-off direction switches on funnel and timeline. These are the
  overwhelm. Each is a select box that has never changed a slide anybody kept.

---

## 2. Three answers to arrangement, and one of them is mine

`design-system-and-the-canvas.md` recorded a fork: **Compositions**
(`slide.design.composition` → `root.dataset.composition` → CSS against the
existing DOM) versus **`layoutAwareness27`** (a theme-gated intercept before the
`LAYOUTS` dispatch, ten bespoke DOMs, fixed pixels). It recorded the resolution
order, and put *canvas arranging last*.

This session shipped canvas arranging. It is now item five arriving before items
one to four, and the tree holds three models:

| model | stores | reflows? | re-themes? | status |
|---|---|---|---|---|
| Compositions | a name (`poster`, `rail`, …) | yes | yes | shipped, 16/16 used |
| Line tariffs (lab) | rows per block, authored | yes | yes | prototype, `modular-canvas` |
| Region lattice (prod) | `{col,row,cols,rows}` per block | within the cell | yes | shipped this session |

They do not disagree about *values*; they disagree about **what a slide's
arrangement is**. A name, a budget, or a cell range. All three are defensible.
Three is not.

And they silently compose in a specific order: `applyRegions` runs *after*
`compositions.apply`, so a region map wins over a composition. **Nobody decided
that** — it fell out of where I put the call. That precedence is a real design
decision currently held by a line number.

**This is the most urgent item in this document.** Not because anything is
broken — 62 of 62 slides in the new Week 2 lesson fit, and the whole library
still renders — but because the next person to add an arrangement feature will
copy whichever shape they happen to find, exactly as the fork note predicted
about `layoutAwareness27`.

---

## 3. What the clones actually do

Two poles, and it is worth being precise about which costs what.

### The freeform element model — Canva, Polotno, PPTist

[PPTist](https://github.com/pipipi-pikachu/PPTist) is the closest thing to an
open-source PowerPoint: Vue 3, no UI component library, elements for text,
image, shape, line, chart, table, video, audio and LaTeX. [OpenPolotno](https://github.com/therutvikp/OpenPolotno)
is the Canva-shaped equivalent: text, image, SVG, video, GIF, figure, line,
HTML, audio, groups.

Both share one architecture. A slide is **a list of elements**, each carrying
its own transform — position, size, rotation. Nine-ish element kinds instead of
38 slide types. The kinds compose: anything you can build, you build by placing
elements.

PPTist adds one idea worth stealing outright: **polymorphic renderers per
context**. The same element model has a different component for editing, for
thumbnailing, and for presenting. SlideForge's equivalent is that `renderSlide`
serves all three from one function — which is a genuine strength (the rail
thumbnail is the same render as the projector, so what you edit is what you
present) and also why `render.js` is 6,249 lines.

What the freeform model costs, and this is not a small list:

- **Reflow.** A block cannot grow when its text does, because nothing knows what
  is below it.
- **Re-theming.** A pinned coordinate is not a design intent; switching theme
  restyles nothing meaningful.
- **Aspect and print.** 1280×720 is baked into every coordinate. `railSurface()`
  and the 92-page handout both stop working.
- **Accessibility and structure.** A list of positioned boxes has no reading
  order.

### The typed-template model — SlideForge, Slidev, reveal

A slide declares *what it is* and the engine decides how it looks. Slidev does
this with markdown plus named layouts; SlideForge does it with 38 types plus 23
themes. Content survives a theme change because content was never geometry.

What it costs: you can only make what has a type. Which is exactly the pressure
that produced `layoutAwareness27`, and the lab, and this session's lattice.

### Kahoot, and the thing nobody else has

The Kahoot-shaped clones are quiz engines: question bank, room code, phones,
scoreboard. SlideForge already has this — `join`, the games array, the live
relay, the presenter desk — and it is **fused with the slide engine** rather
than bolted beside it. A `game` slide is a slide.

That fusion is the actual differentiator, and it is the strongest argument
against drifting toward Canva. Canva has no room. Kahoot has no lecture. This
has both, and the live relay is the reason `deploy-render` exists at all.

---

## 4. The synthesis already shipped; it needs naming, not inventing

The middle position between "a name" and "a coordinate" is **a named region in
a grid** — which is what `design-system-and-the-canvas.md` already stated as the
canvas rule to hold, and what the lattice implements: a block stores
`{col,row,cols,rows}` on a 16×12 grid, and `SF.latticeFit` says in lines when
its content does not fit.

That is the right shape. Elements compose (the freeform win), and a region is
still a design intent rather than a pixel (the template win). Reflow survives
inside the cell; re-theming survives because a cell is not a coordinate; print
and aspect survive because the grid is proportional.

What it does **not** yet have:

1. **A decision about precedence** against compositions. See §2.
2. **A stack budget.** `latticeFit` is per block. Two blocks can each fit their
   own region while the stack runs off the slide. The lab's `budgets()` already
   counts a column group against 16 lines; production does not.
3. **An answer for out-of-flow art.** `artwork.js` stores free `{x,y}` for
   theme decoration, deliberately — decoration owes nothing to reflow. That
   exception is correct but undocumented, and it is exactly the kind of
   exception that becomes a precedent.

---

## 5. The overwhelm, and how to bound it

The brief asked for a nucleus without drowning in choices. The measurement says
the choices to remove are not the layouts.

**Retire the seventeen unused knobs** — or rather, retire the eleven per-type
ones and *finish* the six chrome-region ones. Eleven fewer controls is eleven
fewer catalogue entries, render branches, and test rows. Nothing anybody kept
ever used them.

**One control surface, not two.** `slide.design` is split across
`js/customize.js` (34 keys, the Look/Motion rail) and the editor's own Motion
tab (6). Nothing enumerates the union. That is how `wordFrom` stayed unreachable
for years. The declared `SlideDesign` plus a test that walks every surface is
already the recorded fix; it has not been built.

**Progressive disclosure, by frequency not by category.** The panes are called
Look and Motion, which is a taxonomy of *what a key is*. The useful axis is *how
often it is touched*. Composition, theme and image fit change constantly;
`funnelDirection` changes never. Put the measured-frequent ones first and the
rest behind one "more" affordance.

**Cap the type count by making types compose.** Five authored types have no
specimen. Rather than adding a sixth, ask which of the 38 are a *region
arrangement of existing blocks* — `compare`, `spectrum`, `iceberg`, `funnel` and
`timeline` all plausibly are. If the lattice can express them, they become data
instead of code, and `render.js` gets smaller instead of larger.

---

## 6. Does the code scale?

Honestly: the model scales and the files do not.

The contract is sound. `slide.type → layout() → fixed DOM → tokens` has absorbed
23 themes at a cost of about four lines each, and UKBT's 1,001-line stylesheet
has a renderer footprint of two `THEME_ART` entries. That is the definition of
scaling.

What does not scale is that `render.js` holds all 38 layouts, the lattice, the
artwork layer, the chrome regions and the fit check in one 6,249-line file, and
the split is the deferred structural target. Everything added this session went
into it. **The next canvas feature should not.**

The honest ordering, revising the one in the fork note now that arranging has
already landed:

1. **Decide the arrangement precedence** — composition versus region, written
   down and tested, not held by a call site. Half a day.
2. **Split `render.js`** — the deferred target, now overdue, and the blocker on
   a per-theme layout-defaults map.
3. **Declare `SlideDesign` and test every key reaches a surface** — then delete
   the eleven dead knobs with evidence.
4. **Give the production lattice a stack budget**, ported from the lab's
   `budgets()`, so the slide-level verdict exists where slides are authored.
5. **Then** ask whether `compare`, `spectrum`, `iceberg`, `funnel` and
   `timeline` can become lattice data.

---

## Method

Counts come from building all 22 library packs in a VM context with a stubbed
`localStorage` and walking every slide:

```
node -e "… SF.buildLesson(key).slides …"
```

Type and key usage is the union over 418 slides. Line counts are `wc -l`. Fit
results are `SF.measureSlideFit` against a slide rendered at 1280×720 in a real
browser. The comparator descriptions are from the projects' own repositories and
docs, linked in §3.

---

## Change log

Nothing in this document has been actioned. It is the review, not the work.
Items shipped this session that it critiques: the production region lattice
(`js/arrange.js`, `css/lattice.css`), its per-block fit check
(`SF.latticeFit` in `js/render.js`), and the artwork face (`js/artwork.js`).
