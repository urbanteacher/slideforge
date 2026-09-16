# SlideForge's design system: what it is, what AiAd27 did to it, and where the canvas goes

Written 2026-09-16 from the `northeastern-lecture-theme` branch with its
uncommitted work in place. A position document: it exists so that anyone —
person or model — picking this up later starts from the same model of the system
instead of re-deriving it.

Every number below was measured, not estimated — mostly by rendering slides in
a browser and reading the DOM. The method for each figure is in the appendix.

The body describes the **current** state of the code. Two of the defects it
identifies have since been fixed; §16 is the change log, and each fix is also
described in the section it belongs to rather than only at the end.

---

## Read this first

1. **The engine is the product; the decks are its documentation.** The two
   showcase lessons — `motion-lab` (16 design keys, 5 slide types) and
   `pace-nul` (6 design keys, 8 slide types) — are a capability catalogue
   published as *data*. One engine key, `wordFrom`, was read by the renderer,
   demonstrated only by `motion-lab`, and settable by no interface — **fixed
   2026-09-16**, see §16. None of the motion surface appears in `manual.html`,
   `docs/` or the README. **This platform scales through structure, not through
   slide features** — and the rule that follows is *structure first, theme
   second*.
2. **NUL is not the spine.** The spine is a contract:
   `slide.type → layoutX() → a fixed DOM of known class names → --s-* tokens`.
   A theme picks token values and restyles those class names. It does not pick
   the DOM. NUL just uses more of that contract than anything else.
3. **The ceiling is much higher than it looks.** UK Black Tech is the most
   visually distant theme in the app and the one that touches the renderer
   least: 1,001 lines of CSS, 19 layouts restyled, **two** `THEME_ART` entries
   and nothing else. It keeps 100% of the platform's editing capability.
4. **The codebase converged; it did not decay.** Shared-code cost per theme era:
   **522 → 4 → 16 → 30 → 68**, then **+184** for the uncommitted AiAd27 rewrite.
   AiAd27 is a regression against the codebase's own trend, not the latest step
   in a decline.
5. **AiAd27 escaped the contract, and the bill is measurable**: 7 editable
   fields where every other theme gives 16, 28 authored subtitles that never
   render, a ballot that cannot be built one option at a time.
6. **What is actually accumulating is unretired scaffolding**, not bad practice.
   Each era invents a general mechanism *and* leaves a one-off; the mechanism
   gets adopted and the one-off never gets removed. Four such pairs were in the
   tree; **two are now retired** — see §9.
7. **The design contract is declared almost nowhere.** One field of it now
   exists — a theme's `ground` — but `ThemeKey` in `src/types.d.ts` still
   covers 6 of 23 themes, `slide.design`'s 33 keys are entirely untyped, and
   `npm run typecheck` exits 0. Declaring a field was the smaller half of the
   job; the check that would notice a missing one does not exist yet.
8. **Two competing answers to slide arrangement are uncommitted in the same
   branch.** Resolving that fork is the decision that governs everything else.
9. **The canvas is the right direction, with one rule**: drag manipulates a
   *named region in a grid*, never a coordinate.

---

# Part I — How the system actually works

## 1. The contract, and why NUL is not it

If the university theme were load-bearing, freedom would mean dislodging a
brand. It isn't. `northeastern` appears in shared code exactly twice:

- once in the `THEMES` map at [src/model.js:176](src/model.js:176), the same as
  the other 22 themes;
- once as a hardcoded `else if` in `renderSlide` at
  [js/render.js:5104](js/render.js:5104) that appends its skyline and monogram —
  itself a leftover, since every other theme's decoration goes through the
  `THEME_ART` table that was invented later.

The house theme for a new blank document is `studio`
([src/model.js:538](src/model.js:538)), and an unknown theme falls back to
`studio` ([src/model.js:755](src/model.js:755)).

What is load-bearing is this:

```
slide.type  →  layoutX()  →  a fixed DOM of known class names  →  --s-* tokens
```

Everything the platform does for a deck depends on that DOM being predictable:
inline editing (`data-content-key`), drag-to-reorder, progressive reveals
(`.step`), the feedback rail borrowing the slide's own ink, text-size fitting,
print, and the inspector.

NUL *feels* like the spine because it is a near-complete expression of the
contract — 33 token declarations, 84 layout-scoped rules, three grounds (navy
title, red section, warm white teaching), only 15 hand-written font sizes in
499 lines. The constraint being felt is the contract, not the university.

## 2. The engine is the product. The showcase decks are its only documentation.

This is the axis the rest of the document should be read on, and it is not the
theme axis.

Two lessons in the Library exist to show what the engine can do, and they
divide the job between them:

| | `motion-lab` (Library → Other) | `pace-nul` (Library → NUL) |
| --- | --- | --- |
| Theme | `cinematic` | `northeastern` |
| Slides | 22 | 11 |
| Slide types covered | **5** (chart, content, image, statement, video) | **8** (content, image, introduction, journey, quote, section, split, title) |
| `slide.design` keys exercised | **16** | 6 |
| Transitions used | `fade`, `morph` | `fade` |
| What it is really for | depth on a few types — animated text, backdrops, image movement, chart motion, morphs | breadth across types — bold openers, full-bleed images, red section breaks, a layout range |

`LIBRARY_SEED_KEYS` says so in its own comment: *"Filed, unlike the demo: this
one is a specimen sheet a teacher is meant to open, page through and copy
slides out of."*

Across all 21 library lessons there are **356 slides**, covering **27 of the 38
slide types** and **23 distinct `slide.design` keys**. That corpus is the
platform's capability catalogue. It is also, for a large part of the engine,
the *only* record that the capability exists.

### The engine's surface is real, split, and partly unreachable

`slide.design` is the engine's control surface. Counting where its keys can
actually be set:

| Where | Keys | Which |
| --- | --- | --- |
| `js/customize.js` — "Customise this slide" rail | **27** | align, backdrop, background, capFade, capPos, capStyle, cardPics, cardsMode, chartFocus, chartMotion, composition, focalX, focalY, focalX2, focalY2, funnelDirection, imageFrame, imageMotion, imageShare, imageStep, imageTravelSecs, logoGround, mediaGround, size, statStyle, textColor, timelineMode |
| `js/editor.js` — the Motion tab, for word animation | **6** | words, wordSpeed, wordStagger, wordsLoop, wordPlan, **wordFrom** (added 2026-09-16) |
| **nowhere** | **0** | — |

Two observations follow, and they are the substance of the point.

**The controls are split across two files with no single place that says what a
slide can be told.** The rail in `customize.js` handles 27 keys; word animation
lives in the editor's own Motion tab and handles 6 more. Neither knows about
the other, and nothing enumerates the union — which is how a gap goes unseen.

**One key the engine read that nothing could set.** `wordFrom` has a dedicated
function at [js/render.js:282](js/render.js:282) and three orders in
`WORD_FROMS`; `motion-lab` demonstrated all three; there was no control, so the
only way to ask for anything but `first` was to hand-edit the deck JSON. The
`wordStagger` handler even called `drawInspector()` with the comment *"choosing
Together takes the direction control away, and choosing a wave brings it
back"* — the control was designed and never written. Fixed; see §16.

A caution for anyone re-running this census: the first pass of it also reported
`focalX2` and `focalY2` as orphans, and they are not. They are set by two
range sliders in `customize.js` labelled *"Travels to horizontal / vertical"*,
written as `d['focal' + axis + '2']`, which a search for `d.focalX2` does not
find. Grep the computed-property forms too, or the census will invent
gaps. `slide.design` has **33** keys in total and, as of this fix, every one of
them is reachable.

**And none of it is documented outside the deck.** `wordFrom`, `focalX2`,
`wordStagger`, "word animation" and "Image motion" each appear **zero** times
in `manual.html`, in `docs/`, and in the 88 KB `README.md`. The engine surface
is knowable by reading `js/render.js`, or by opening the specimen deck and
copying a slide out of it. Nothing else.

### Why a deck cannot do the job of a check

`motion-lab` runs on `cinematic` and contains **3 chart slides**. Verified:
those charts render with `--chart-1: #BA0428` — the **light**-ground palette,
because `cinematic` is missing from the dark-theme name-list (§10). The app's
own motion showcase is demonstrating charts at 2.94:1 worst-case contrast on a
near-black ground, and has been all along.

A specimen deck proves a capability exists. It cannot assert that the
capability is *correct*, because it is data, not a test. That is the difference
between the two things the platform currently conflates.

### The consequence for how this platform scales

Themes are consumers of the engine, and a theme is cheap when the structure is
right: 4 lines for four of them, 16 for the two UKBTs (§5). What raises the
ceiling is **structural** capability — a composition, a reveal shape, a motion,
a snap region — because every theme gets it at once, for free, forever.

AiAd27 made the opposite trade: **252 shared lines to raise the ceiling for
five themes only**, and it had to break the editing contract to do it.

So the rule to write down, and the one the plan in §14 follows:

> **Structure first, theme second.** A capability enters the platform as an
> engine feature with a name, a control and a check. A theme then chooses
> *defaults* for it. Never: a campaign needs a shape, so the renderer learns
> that campaign's name.

This is also why the canvas (§13) matters more than any individual layout. The
canvas is not a feature — it is the missing *instrument* for the engine surface
that already exists. With `wordFrom` closed, the remaining instrument gap is
not a missing key but a missing *kind* of control: aiming travel endpoints on
a picture is what a rail is bad at (§13 / plan step 8).

### Further issues the §2 census still leaves open

Re-running the surface analysis against the live tree (2026-09-16) found gaps
the capability tables above do not yet name. They belong here as open
structure debt — not as theme work.

**1. `Slide` has no typed `design` field.** [`src/types.d.ts`](../src/types.d.ts)
documents decks that have been through `normalizeDeck`, but `Slide` still has
no `design?: …` and there is no `SlideDesign` interface. The 33-key surface
exists only as scattered writes in `customize.js` / `editor.js` and reads in
`render.js`. `npm run typecheck` cannot catch a typo in a design key; a
specimen deck can still carry one forever. Plan step 3 (declare `SlideDesign`
+ reachability check) is exactly this hole.

**2. `ThemeKey` is a parallel lie.** The same types file lists six themes
(`studio | midnight | paper | ocean | ember | mono`). Runtime `THEMES` has
on the order of twenty-three. That is the same class of defect as an undeclared
`SlideDesign`: the type claims to be the catalogue and is not. Generating
`ThemeKey` from `THEMES` (doc §14 step 3) is the theme-shaped twin of this
section's engine-shaped fix — listed here so it is not forgotten when someone
opens only §2.

**3. `placement` is a 34th key the census of 33 missed.**
[`setImagePlacement`](../src/deck/content.js) writes `slide.design.placement`
(`side` | top/bottom via the helper); the Customise rail's *Image placement*
control calls it for `split` slides. It is reachable, used by the engine, and
absent from the 27+6 table above because the writer is
`SF.setImagePlacement(s, v)` rather than `d.placement = …` or `choose(…,
'placement')`. Any future reachability check must treat helper writers as
first-class, or it will invent a second false orphan — or, worse, bless a
catalogue that quietly omits a real key.

**4. Nested `wordPlan` fields are not design keys.** Specimen JSON under
`design.wordPlan[]` carries choreography properties (`arc`, `blur`, `delay`,
`dy`, `note`, `scale`, `text`, `unit`, …). A naive
`Object.keys(slide.design)` walk, or a regex over lesson source that flattens
nested objects, will report them as top-level design keys and either fail a
reachability test or inflate the catalogue. The unit of the engine surface is
the **top-level** key; `wordPlan` is one key whose value is structured.

**5. Four write patterns, not one — and `choose()` is the loudest.** A census
that only greps `d.X =` under-counts badly: most rail fields go through the
local `choose(label, key, …)` helper, which assigns `d[key]` inside a closure.
The complete set, already noted in the appendix, is: `d.X =`, `delete d.X`,
`choose(…, 'X')`, `d['pre' + var + 'post']`, **plus** helpers like
`setImagePlacement`. Missing any one invents gaps or drops keys.

**6. The surface is still undocumented outside this file and the decks.**
Zero hits in `manual.html` / `README.md` for `wordFrom`, `focalX2`,
`wordStagger`, "word animation", "Image motion" remain. Declaring
`SlideDesign` without a generated manual section leaves the teacher-facing
record as "open the specimen deck". That is acceptable only as a temporary
state after step 3's type+test land.

**7. Specimen decks still cannot police contrast.** Closing the `wordFrom`
control does not retire the earlier finding: `motion-lab` on `cinematic` was
demonstrating sub-3:1 chart ink on a near-black ground because a deck is data.
The `ground: 'dark'` fix (§10 / §16) raised cinematic's worst chart step above
the floor; the *category* of bug — capability shown in a deck, defect invisible
to the deck — still needs a check, not another slide.

**8. AiAd27 (era 6) is the obvious counter-example to what this platform is.**
SlideForge is not a poster tool that happens to store JSON. It is an *engine*:
`slide.type → a fixed DOM → --s-* tokens`, with themes as consumers and
specimen decks as documentation of capability (§2 opening, "Read this first"
§1–2). AI Awareness Day 2027 — era 6 on the shared-code curve — saw a campaign
and treated that spine as optional. It did not ask *"which composition and
which `slide.design` keys express Keep Humans in the Loop?"* It asked *"what
would look right for this day?"* and invented `layoutAwareness27`: ten
arrangements locked to five theme names, a second dispatch path in front of
`LAYOUTS`, its own DOM, and a measurable loss of editing (7 fields where NUL
gives 16). That is design opportunity seized *beyond* the product — and the
bill is exactly the regression the rest of this document measures. AiAd26, by
contrast, stayed inside the contract (five grounds, shared CSS variables, no
private layout function) and is the well-behaved precedent in §3. The rule is
not "do not innovate"; it is **innovate on the engine, then let the campaign
pick defaults**. Era 6 innovated on the campaign and forced the engine to
learn five theme names.

## 3. The five brand systems side by side

| | studio (house) | Northeastern | **UK Black Tech** | AiAd26 | AiAd27 |
| --- | --- | --- | --- | --- | --- |
| Themes | 1 | 1 | 2 (shared base) | 5 | 5 |
| Stylesheet lines | 269 | 499 | **1,001** | 421 | 115 |
| Layouts restyled | 9 | 7 | **19** | 3 | 0 |
| `.layout-*` rules | 16 | 84 | **176** | 21 | **0** |
| Private tokens | 0 | 9 (`--nu-*`) | **21 (`--ukbt-*`), incl. a 9-step type ramp** | 5 (`--aiad-*`) | 3 (`--a27-*`) |
| Bundled fonts | — | — | **2 families, 8 `@font-face`, 420 KB woff2** | — | borrows UKBT's |
| Renderer code | `THEME_ART` entry | hardcoded `else if` | **2 `THEME_ART` entries — that is all** | 5 `THEME_ART` entries | `layoutAwareness27`, ~120 lines |
| Own DOM? | No | No | **No** | No | **Yes — 10 layouts** |
| Visual baselines | yes | yes | yes | 120 | 120 (game boards only — none for its own compositions) |

**AiAd26 is the well-behaved precedent.** It faced the same problem as 2027 —
five bright brand accents, none of which can carry type — and solved it inside
the contract: a private `--aiad-accent` for graphics, `--aiad-deep` wired to
`--s-accent` at exactly 4.5:1, and the campaign badge redrawn as two CSS
`clip-path`s so it recolours per theme. AiAd27 inherited that specific lesson
correctly (`--a27-color` / `--a27-deep`, `--s-accent:var(--a27-deep)`). It did
not inherit the structural discipline.

---

# Part II — The evidence

## 4. UK Black Tech: where the ceiling actually is

`css/ukbt.css` is the largest theme stylesheet in the app — twice NUL, nine
times AiAd27 — and its entire footprint in `js/render.js` is two identical
`THEME_ART` entries. No dispatch intercept, no bespoke DOM, no compiled copy.

What it gets for that:

- **Its own typography, shipped.** Alpha Lyrae on the two full-bleed layouts,
  Uncut Sans from the slide `h2` down — the split the organisation's own site
  makes between its hero and its H2s — bundled as woff2 because "a deck is
  presented from whatever machine is in the room".
- **A private type ramp.** `--ukbt-xs: 14px` through `--ukbt-5xl`, the brand's
  own desktop ramp (72 / 58 / 48 / 32 / 24 / 22). Only 14 `font-size`
  declarations in 1,001 lines, because the sizes are tokens.
- **Nineteen layouts restyled** — 44 rules on `title`, 36 on `section`, 24 on
  `cards`, 18 on `split`, and real work through `stats`, `funnel`, `timeline`,
  `table`, `compare`, `chart`.
- **Structural-looking results from non-structural CSS.** The `cards` slide
  rotates four brand colours across the list
  (`li:nth-child(4n+1) { background: var(--ukbt-purple) }` …) and promotes the
  list counter to a section flag. It reads as four designed tiles; it is the
  same `<ul>` of `<li>`s a studio-theme `cards` slide uses. Total structural
  change in the whole file: one `justify-content: center` and one `flex: 1`.
- **Per-slide variation with no control to set.** UKBT is the only consumer of
  `data-art-index` and `data-art-slot`, which `renderSlide` stamps on every
  slide as `index % 4` and `index % 5`. Four brand objects against five corner
  positions means the pair does not repeat for twenty slides.
- **Accent-as-ground solved by override, not escape.** UKBT green is `#00c57f`,
  about 2:1 on white, so the file overrides `.cap-bar`, `.flip-toggle` and
  `.image-facts-toggle` to `var(--ukbt-ink)` wherever `css/app.css` sets white
  type on the accent.
- **Two organisations from one file.** Parent on Dark Blue, Institute on UKBT
  Black; the green, chevron and wave are common. The five 2027 strands are
  exactly this shape and could have been built the same way.

### The decisive measurement

Rendering the same six-slide deck under each theme and counting what the
platform can still do with it:

| Theme | Editable fields | Step nodes | Subtitles rendered |
| --- | --- | --- | --- |
| `studio` | 16 | 8 | 5 / 6 |
| `northeastern` | 16 | 8 | 5 / 6 |
| `ukbt` | 16 | 8 | 5 / 6 |
| `ukbt-institute` | 16 | 8 | 5 / 6 |
| `aiad26-safe` | 16 | 8 | 5 / 6 |
| `aiad27-safe` | **7** | **5** | **0 / 6** |

Five themes spanning the app's full visual range return identical capability.
One does not. **The cost is the price of the mechanism, not the price of
ambition.**

UKBT's one real limit — and it is the honest case for AiAd27 — is that it
restyles but never **restructures**. It cannot turn a `<ul>` into a two-by-two
ballot with chamfered letter tiles, or into two labelled decision lanes. That
gap is real. It is also much narrower than a theme-gated renderer branch
implies: the four-colour cards slide above is most of the way to the ballot.

One thing to fix regardless: **AiAd27 declares no `@font-face` at all.**
`--s-font:'Uncut Sans'` resolves only because `css/ukbt.css` bundles it, and
`AiAd27/preview.html` loads `css/ukbt.css` explicitly to get it. Uncut Sans is
OFL, so this is not a licensing problem — it is a coupling problem: scope or
move UKBT's font block and the 2027 campaign silently drops to Arial.

## 5. Six eras, and what each cost

Themes in the order they were designed, with the lines each era added to
*shared* code (`js/render.js`, `css/app.css`, `src/model.js`,
`js/customize.js`, `js/player.js`, `js/shell.js`) as opposed to its own files.

| Era | Date | Theme(s) | Own stylesheet | Shared code added |
| --- | --- | --- | --- | --- |
| 1 | 2026-09-10 | **midnight** + paper, ocean, ember, mono | in `app.css` | — it *was* the shared code |
| 2 | 2026-09-10 | **studio** (sage) | 269 | not separable — shipped inside another change |
| 3 | 2026-09-13 | **northeastern** | 499 | **522** |
| 4 | 2026-09-15 | **ukbt**, ukbt-institute | 1,001 | **16** |
| 4b | 2026-09-15 | product, editorial, cinematic, brutal | 463 | **4** |
| 5 | 2026-09-16 | **aiad26** ×5 | 421 | **30** |
| 6 | 2026-09-16 | **aiad27** ×5 | 115 | **68**, then **+184** uncommitted |

Read the last column as a curve: **522 → 4 → 16 → 30 → 68 → 252.**

That is convergence, not accretion. Northeastern was expensive because it had
to invent the machinery — layout-scoped theming, per-layout token flips, the
`slide.design` pass, dark-ground handling in `player.js`. UKBT then produced
the largest theme stylesheet in the app for **sixteen** shared lines, and four
more complete themes arrived for **four**. By era 4 the mechanism was working
almost perfectly.

Era 6 reversed it. The uncommitted AiAd27 rewrite adds more shared-code lines
than eras 4, 4b and 5 combined, for the five themes with the smallest
stylesheet of the set. **AiAd27 is a regression against the codebase's own
trend line** — a better argument for fixing it than "it broke the rules".

## 6. AiAd27: the mechanism

One line does it, at [js/render.js:5145](js/render.js:5145):

```js
if (!layoutAwareness27(deck, slide, pad, root) && (!SF.Boards || !SF.Boards.render(...)))
  (LAYOUTS[slide.type] || layoutContent)(slide, pad, opts, root);
```

`layoutAwareness27` runs *before* the `LAYOUTS` dispatch table and returns
`true` to swallow it. Its guard:

```js
if (!/^aiad27-(safe|smart|creative|responsible|future)$/.test(deck.theme) || slide.hidden) return false;
var types = ['title','quote','cards','statement','iceberg','compare','sourcecheck','spectrum','journey','keyfact'];
if (types.indexOf(slide.type) < 0) return false;
```

Three consequences follow from that shape:

1. **Layout became a function of theme, not of slide type.** `iceberg` means an
   iceberg everywhere except under an aiad27 theme, where it means a risk map.
   The platform's one stable promise — a slide type renders the same
   composition regardless of palette — no longer holds.
2. **The intercept is invisible and only accidentally reversible.** Applying an
   aiad27 theme to an existing deck silently reinterprets up to 10 of its slide
   types. Moving an AiAd27 deck to any other theme silently discards the design
   it was written for.
3. **A mixed deck renders as two design systems.** Verified: under
   `aiad27-safe`, `cards` and `spectrum` render with `class="slide a27 …"`;
   add a `chart` and it falls through to the standard renderer.

Below that, the layout stops treating the data model as a data model. Roughly
thirty strings are compiled into the renderer instead of read from the deck:
`'Your AI. Your choices.'`, `'Picture yourself in this situation.'`,
`'Choose A, B, C or D. Be ready to say why.'`, `'Feels private'`,
`'What else could be happening?'`, `'AI can support'`, `'A person must decide'`,
`'Keep humans in the loop'`, `'One choice I will make:'`, the per-strand poster
words (`PRIVATE?`, `ASK FIRST`, …) and the whole `beat` map. All built with
`el()`, not `rich()` — so none carries a `data-content-key` and none is
reachable by any editing surface. Asset paths are compiled the same way
(`'AiAd27/assets/props/' + {safe:'prop 11.png', …}`), so a deck is no longer
self-contained: it depends on a folder inside this repository.

And one field was quietly redefined. `spectrum` carries a
label / value / note triple where the value is a position on a scale; the
authored data uses 12, 20, 34, 84, 96. `layoutAwareness27` reduces it to
`Number(p.value) >= 50 ? 1 : 0` and drops each item into one of two lanes. The
numbers still exist, still look meaningful, and now mean something else.
Nothing in the interface says so.

## 7. What it cost, measured

Same normalized slide data, rendered under `aiad27-safe` and `northeastern`:

| Slide type | Editable fields, AiAd27 | Editable fields, NUL |
| --- | --- | --- |
| `title` | `title` | `title`, `subtitle` |
| `quote` | `body` | `body`, `subtitle` |
| `statement` | `body` | `body`, `subtitle` |
| `journey` | `title` | `title`, `subtitle` |
| `iceberg` | `title` | `title`, `subtitle`, `bullets.0`, `bullets.1` |
| `sourcecheck` | `title` | `title`, `subtitle`, `bullets.0` |
| `keyfact` | `title`, `body` | `title`, `subtitle`, `body`, `bullets.0`, `bullets.1` |
| `compare` | `title` | `title` |

`compare` is even because bullet editing on `compare` is a pre-existing gap in
the standard renderer, not something AiAd27 broke. Everything else is a
regression: **no list content on an AiAd27 deck is editable on the canvas at
all** — no double-click to edit, no drag-to-reorder, which
[js/editor.js:1105](js/editor.js:1105) attaches to `bullets.N` keys.

**`slide.subtitle` is read exactly once in the whole function** (for `compare`'s
column heads). Across the five built decks that leaves **28 subtitles written,
saved, and never shown**:

```
title       "Five Minutes to Think"                         ×5
quote       "The scenario · 30 seconds"                     ×5
statement   "Discuss in pairs · 75 seconds"                 ×5
journey     "Three things, in the order you would use them"  ×5
keyfact     "Your choice · 45 seconds"                      ×5
iceberg     "A message you would never say out loud"
sourcecheck "The same claim, with its working shown"
spectrum    "AI can support this | This must stay human"
```

The last is the sharpest: the author wrote the two lane labels as a
pipe-separated pair, and the slide displays the renderer's hardcoded
`'AI can support'` / `'A person must decide'` instead. The wall disagrees with
the file.

Other confirmed defects:

- **Double slide numbers.** With `showSlideNumbers` on, an a27 slide renders
  both the platform's `.pagenum` and its own footer counter. Verified: one
  `.pagenum` node plus a footer reading `01 / 03` on the same slide.
- **The ballot cannot be built.** `cards` with `progressive: true` produces 3
  `.step` nodes under NUL and **0** under aiad27 — the `cards` branch is the one
  that forgets `asStep`. The vote-before-the-reveal slide, which
  [AiAd27/starters27.js:27](AiAd27/starters27.js:27) calls the load-bearing
  slide of the lesson, cannot reveal its options one at a time.
- **Three dead controls.** `css/aiad27.css` hides `.slide-logo`,
  `.slide-motion` and `.track`. The inspector still offers "Backdrop motion" on
  `title` slides, all five decks still set
  `logo: 'assets/brand/aiad27/aiad27-lockup.svg'`, and the progress-bar setting
  still exists. All three are silently discarded.
- **Orphaned committed assets.** `AiAd27/make-marks.js` generates five
  `assets/brand/aiad27/icon-*.svg`; the rewrite replaced them with CSS geometry
  and PNG props, and nothing references them.
- **`keyfact` always numbers itself `01`.**
- **No composition options.** `compositionOptions()` returns `[]` for any
  aiad27 theme ([js/render.js:5032](js/render.js:5032)), and
  `tools/smoke-design-foundations.mjs` *asserts* that (`campaign: 0`) and
  excludes aiad27 from its theme matrix. The carve-out is already a codified
  contract, not an oversight.

The design also gave up reflow. `css/aiad27.css` is a grid of fixed pixels —
`88px`, `68px`, `62px`, `230px` type; `650px 1fr`, `310px 1fr`,
`240px 180px 1fr` columns — so content length has no give. That is why
`AiAd27/check-fit.mjs` exists, and why the authored data carries comments like
*"Four rows, not five. The 20-million figure was a fifth band until the 28pt
accessibility floor went in and pushed the stack 80px off the slide."* The decks
are pinned to their copy: changing a word is a design review.

## 8. What it genuinely proved

None of the above is an argument for stopping. The decks are good, and good in
ways the shared layout DOM could not have produced:

- **The composition carries the pedagogy.** The A–D ballot is a ballot on the
  wall, not a bullet list; the scenario is a dark slide with one voice on it;
  the commitment slide has a line to write on. The shape of each slide *is* the
  teaching move.
- **Content-specific reveals beat one generic reveal.** A risk map, a credits
  receipt, two decision lanes and a numbered rule stack are four different
  arguments, and they got four different shapes.
- **Five palettes over one composition works.** Strand identity is one token
  pair plus one `clip-path` chamfer — five decks reading as one campaign from
  about eight lines of CSS.
- **Density and scale are under-served by the platform.** 88px headlines, 24px
  body, a 40px header and a 32px footer with a rule is a poster grammar. The
  shared layouts assume a 46–56px heading, and the only escape hatch is the
  text-size control, which fits-then-shrinks and cannot restructure.
- **The tooling generalises.** `check-fit.mjs` (measure the rendered box, not
  the character count), `contact-sheet.mjs` (all 45 slides as one sheet) and
  `preview.html` (review that renders real `SF.renderSlide` output rather than
  an approximation) are reusable platform tools that happen to live in a
  campaign folder.

---

# Part III — The foundations: what was wrong, and what still is

## 9. The pattern: unretired scaffolding

Not bad practice in general. One specific habit, visible in every era:

> **Each era invents a general mechanism and also leaves a one-off. The next
> era adopts the mechanism. Nobody ever retires the one-off.**

Two of the four rows below have now been retired, which is the useful part: in
both cases the fix was small, and in both cases the reason it had survived was
that nothing in the build could see it. The dark lists were four CSS selectors
that were individually correct and collectively wrong; the ten `'midnight'`
literals were ten correct lines nobody had a reason to read together.

| Era | The generalisation it invented | The one-off it left | State |
| --- | --- | --- | --- |
| 1 | `--s-*` tokens + `.theme-X` | `'midnight'` as the literal fallback, written out at **10** call sites in `render.js`, while `normalizeDeck` and `makeDeck` default to `studio` | **partly retired.** `themedRoot()` reduced ten copies to one. The fallback value is deliberately unchanged — see §16. One copy remains in `editor.js`, and games still default to `midnight` ([src/model.js:878](src/model.js:878), [js/editor.js:3830](js/editor.js:3830)), so decks and games still have different house themes. |
| 3 | `.theme-X.layout-Y` scoping, `slide.design`, `SF.Custom.layout` | `northeastern` as a hardcoded `else if` at [js/render.js:5104](js/render.js:5104), beside the `THEME_ART` table invented later to do exactly that job | **still there.** Never migrated. |
| 1–3 | *nothing — never generalised* | **Four** independent name-lists in `css/app.css` answering "is this theme dark?", with divergent membership | **retired.** Now one `ground: 'dark'` declaration — see §10. |
| 6 | `slide.design.composition` + `applyComposition` | `layoutAwareness27` — a second dispatch path in the same function, whose guard excludes the first | **still there**, and the open decision — see §12. |

## 10. Darkness: one declaration now, and the four lists it replaced

**Current state.** A theme declares `ground: 'dark'` in `THEMES`.
`themedRoot()` in `js/render.js` stamps it as `data-ground` on every themed
root, `railSurface()` copies it off the live slide beside the tokens it already
copies, and `css/app.css` asks for it once per rule as `[data-ground="dark"]`.
Eight themes declare it: midnight, ocean, ember, mono, cinematic, brutal, ukbt,
ukbt-institute.

It is worth keeping the history, because the shape of the mistake is the most
transferable thing in this document.

**What it was.** Four separate selector lists in `css/app.css`, each naming
themes by hand, each answering the same question, and their membership had
drifted apart:

| What it decided | Location | Members |
| --- | --- | --- |
| Dark chart palette | `app.css:811` | midnight, ocean, ember, mono |
| Dark code-syntax colours | `app.css:1688–1702` | midnight, ocean, ember, mono, **ukbt, ukbt-institute** |
| Invert the logo | `app.css:2084–2091` | midnight, ocean, ember, mono |
| Score-rail leader row | `app.css:2577–2580` | midnight, ocean, ember, mono |

Eight themes have a dark ground; four were on the lists. Measured by rendering
a `chart` slide under every theme in `THEMES` and reading computed background
luminance and `--chart-N` steps off the live element:

| Theme | Ground | Luminance | Worst chart step, before | After |
| --- | --- | --- | --- | --- |
| midnight | `#0a1020` | 0.017 | 3.22:1 | 3.22:1 |
| mono | `#0c0c0c` | 0.004 | 3.32:1 | 3.32:1 |
| ocean | gradient | 0.116 | — | — |
| ember | gradient | 0.025 | — | — |
| ukbt | `#254258` | 0.050 | 3.62:1 | 3.62:1 — own palette, untouched |
| ukbt-institute | `#292c2f` | 0.025 | 4.84:1 | 4.84:1 — own palette, untouched |
| **cinematic** | `#0a0b0f` | **0.007** | **2.94:1** | **3.34:1** |
| **brutal** | `#111111` | **0.006** | **2.82:1** | **3.21:1** |

`cinematic` and `brutal` are the two darkest grounds in the application —
darker than `midnight`, which the lists were written for — and they were on
none of the four, so they drew from the **light**-ground palette. `brutal`'s
worst series read **2.82:1**, below the 3:1 floor for non-text graphics, on the
darkest slide the app can draw. Nothing caught it, because nothing anywhere
*asked* a theme whether it was dark: four places guessed by name, and the two
themes that arrived later were never added to any of them.

**UKBT is the one theme that was handled deliberately, and the detail matters.**
It was on the chart list and was taken off, with the reason recorded in
`app.css` itself: five of the twelve combinations of those steps against its two
grounds fall under 3:1, so it carries the brand's own highlight colours
instead. A measured decision, not a miss. The problem was never UKBT — it was
that expressing the decision meant editing a hand-kept list of names, which is
the same mechanism that let cinematic and brutal fall off four of them.

That carve-out now costs nothing to maintain. `css/ukbt.css` loads after
`css/app.css`, so a theme with better `--chart-*` of its own simply wins the
cascade. Beating the shared steps means declaring better ones, not being
remembered by a list.

**Three things the fix had to get right, and how.**

- **The logo rule could have broken UKBT.** Marking it dark newly qualifies its
  slides for `filter: brightness(0) invert(1)`, and the brand ships its
  wordmark *already reversed* — inverting a white logo makes it black. Checked
  before changing: every UKBT factory deck sets `logoReverse: 'never'`, which
  is what `:not(.logo-normal)` in that rule already exists for. Verified after:
  `filter: none` on all of them.
- **The score-rail rule looked like it was not about darkness.** It replaces
  `var(--s-card)` plus an accent outline with a flat 17% white lift, which
  reads like compensation for a card colour authored for a light ground. It is
  not: all four original dark themes already set `--s-card` to translucent
  white at 6–8%, the same as UKBT and cinematic. It is a genuine dark-ground
  emphasis choice, so applying it to every dark theme is the consistent
  outcome rather than a regression.
- **Per-layout ground was left out on purpose.** Northeastern is dark on
  `title` and `section` and light elsewhere; AiAd27 is dark on `quote` and
  `journey` only. Both already handle themselves in their own stylesheets, and
  extending `ground` to `{ default: 'light', title: 'dark' }` would newly apply
  all four rules to those layouts. That is a real improvement and a separate
  change, and it needs its own visual review of a lecture that has already been
  taught.

`railSurface()` was the model for all of this and had been sitting there the
whole time. It reads resolved tokens off the live slide element rather than
being told, and its own comment says why: *"Read off the slide rather than told
separately, so a new theme or a new layout cannot drift out of step."* The fix
extends it by one line to carry `data-ground` too — which is what makes a
future per-layout flip work on the rail for free.

## 11. Where the contract is governed from: one field, and otherwise nowhere

**The editor is not the source of truth and should not become it.** The editor
*reads* the contract in at least three places — the theme picker iterates
`THEMES`, the inspector switches on `slide.type`,
`bindCanvasContent` looks for `data-content-key` — and each is a consumer.
Putting governance in the editor would mean the presentation layer defines what
a theme is, which is how you get a design system that works in one view only:
presenter view, print, `join.html`, the live relay and the review tools would
each need telling separately.

It should live where the platform already looks: `src/model.js`, beside
`THEMES`, typed in `src/types.d.ts`, checked by `npm test`.

**One field of it now does.** `ground: 'dark'` (§10) is the first entry in what
the plan in §14 calls the theme manifest, and it is worth naming what made it
work, because the next field should be added the same way: it is declared in
one place, it is *asked* rather than enumerated, a theme can override the
consequence with something better of its own, and shared CSS reads it through
a single attribute. Nothing outside `THEMES` names a theme in order to find
out.

**The rest is still undeclared, and the type file proves the drift precisely:**

```ts
/** Theme keys in `THEMES`. */
export type ThemeKey = 'studio' | 'midnight' | 'paper' | 'ocean' | 'ember' | 'mono';
```

Six themes. `THEMES` has **23** — every theme from era 3 onward is absent,
seventeen in total. `TransitionKey` lists five; `TRANSITIONS` has six (`morph`
missing). `slide.design` — all **33** keys the inspector writes and the
renderer reads — **does not appear in `src/types.d.ts` at all**, and neither
does `ground`, the field just added.

`npm run typecheck` exits 0.

So the declared contract froze at era 2 and nothing has failed since. The check
that should have noticed cannot: `ThemeKey` is only consulted where a theme key
is annotated, and `design` is annotated nowhere. Adding `ground` did not change
that — a ninth theme could be given a dark ground tomorrow and forget to
declare it, and the only thing that would notice is somebody measuring contrast
by hand again. **That is the gap the reachability check in §14 step 3 closes,
and it is why declaring the field was the smaller half of the work.**

Worth being fair about the contrast. `js/model.js` *cannot* drift from
`src/model.js`, because `npm run build:check` is the first step of `npm test`
and fails if it does. The AI Awareness lessons cannot drift from the starters,
because `tools/build-aiad-lessons.mjs --check` exists for exactly that reason.
The codebase understands this class of problem and has solved it twice. It never
pointed the same discipline at the theme contract.

---

# Part IV — What to do

## 12. The fork to resolve first

Two unfinished answers to the same question are in this branch, and they
disagree.

**Compositions** — uncommitted, in `css/customize.css` (+44),
`js/customize.js` (+11), and `SF.COMPOSITIONS` / `compositionOptions` /
`applyComposition` in `render.js`, verified by
`tools/smoke-design-foundations.mjs`. Six arrangements (`poster`, `editorial`,
`frame`, `sidecar`, `rail`, `columns`) offered per slide type, stored as
`slide.design.composition`, applied as `root.dataset.composition`, styled
entirely in CSS against the *existing* DOM. Theme-independent, opt-in,
reversible, token-driven, and it keeps every editable field and step marker. The
smoke test asserts the composition survives a JSON round trip, cannot leak onto
a slide type that does not offer it, and that all 3 step markers still render.

**`layoutAwareness27`** — also uncommitted. Ten arrangements, theme-locked, in
JavaScript, against its own DOM, with the controls suppressed.

They answer the same need — *let the arrangement change without changing the
content or the theme*. Note that compositions make the same moves AiAd27 makes:
`.slide[data-composition] > :is(.nu-art,.studio-art,.ukbt-art,…) { display:none }`
suppresses theme decoration exactly as `.slide.a27::before,::after` does. The
difference is not ambition. **One is data and one is code.**

## 13. The canvas: the rule to hold

The rail cannot express what AiAd27 needed. `inspector()` in
[js/customize.js:292](js/customize.js:292) is a switch on `slide.type`: a
control exists for a slide type or it does not. It can offer *"Cards layout:
side by side / rows / stack / pictures"*. It cannot offer *"this card is the
ballot letter and it goes in a chamfered square at 76px"*. Arrangement is
spatial, and a list of dropdowns is the wrong instrument — you set a value, then
look elsewhere to see what happened.

Two canvas affordances already exist and are the beachhead: double-click a
field on the slide to edit in place (`bindCanvasContent` → `openCanvasEditor`,
for anything the renderer marked with `rich()`), and drag a bullet to reorder
it. The canvas is already an *editing* surface. It is not yet an *arranging*
one.

**The magnet instinct is not a nicety — it is what makes the feature
affordable.** Free-form absolute positioning would cost the platform everything
§7 is about. A slide whose elements carry `{x, y, w, h}` cannot reflow when the
text changes, cannot be re-themed, cannot export to 4:3 or 9:16, cannot be
checked by `check-fit` except after the fact, and cannot be read back by
`railSurface()` / print / `presenter.html` with confidence. AiAd27 is already
the small version of that bill: fixed pixels, copy pinned to the layout, a
dedicated overflow checker, and *"the floor is not negotiable"* written into the
content file.

The productive form of the constraint:

> **The canvas manipulates a named region in a grid, not a coordinate.**

Drag a heading and it snaps into one of the regions the composition defines;
drag the divider and the grid template changes; drag a card between lanes and
the underlying field changes. What gets saved is still a small, named,
themeable, reflowable value — the same class of thing
`slide.design.composition` already is. The canvas becomes the *instrument* for
setting design values, not a new storage model.

## 14. The plan, in order

Each step depends on the one before.

**1. Resolve the fork.** Adopt compositions as the mechanism and re-express
AiAd27's ten arrangements as compositions available to any theme. The risk map,
credits receipt, decision lanes, numbered rule stack and A–D ballot are all
generally useful and none is about AI Awareness Day. They become `reveal-map`,
`credits`, `lanes`, `rules`, `ballot` in `COMPOSITIONS`, offered on `iceberg` /
`sourcecheck` / `spectrum` / `journey` / `cards`, and the five campaign themes
simply *default* to them.

**2. Finish the theme manifest, and make it the only thing anyone enumerates.**
`ground` is in place as a whole-theme flag (§10). The remaining two fields:

```js
northeastern: {
  name: 'Northeastern London',
  swatch: '#c8102e',
  ground: { default: 'light', title: 'dark', section: 'dark' },  // widen
  art: ['nu-art', NU_ART],                                        // new
  defaults: { /* which composition each slide type prefers */ }   // new
}
```

- **Widen `ground` from a string to a per-layout map.** This is what
  northeastern and AiAd27 need and the only reason they still carry their own
  arrangements for it. `railSurface()` already forwards `data-ground` to the
  rail, so the rail side is done.
- **`art`** retires the `northeastern` `else if` — the last surviving row of
  §9's table that is purely mechanical.
- **`defaults`** is where step 1's per-theme preference lands: a theme saying
  *"my `cards` default to `ballot`"* without a renderer branch.

And the principle the `ground` fix confirmed, worth applying to both new
fields: **prefer measuring to declaring wherever the platform can.** For
anything that only needs light-or-dark *after* render, read the resolved
background off the live element as `railSurface()` does — it cannot drift and it
handles per-layout flips for free. Declare only what must be known *before*
anything is painted, which for `ground` is the chart palette, the logo variant
and the syntax colours.

**3. Declare the engine surface, and make the specimen decks answer to it.**
The structure-first step, and the one with no theme in it at all. `wordFrom`
now has a control and `ground` is the manifest's first field, so what remains
is the part that makes both self-maintaining:

- **Declare `SlideDesign`** with all **33** keys — 27 in the rail, 6 in the
  Motion tab — each carrying which slide types it applies to. It appears
  nowhere in `src/types.d.ts` today.
- **Generate `ThemeKey` from `THEMES`** rather than hand-listing it, and add
  the test the other two generated artefacts already have: a theme missing a
  required manifest field fails `npm test`.
- **Add the reachability check.** Every key in `SlideDesign` must be settable
  from some surface, and every design key a library lesson uses must be in
  `SlideDesign`. This is the test that turns the specimen decks from
  documentation into coverage. It would have found `wordFrom` immediately;
  a hand census took an afternoon and got the answer wrong once first.
- **Put the surface in `manual.html`**, generated from the same declaration.
  The motion engine is still documented nowhere outside the specimen deck.

This is the step that stops era 7 leaving its own one-off.

**4. Rebuild the five 2027 themes on UKBT's pattern.** Two UKBT themes share
one base in one file; five strands differing only by `--a27-color` /
`--a27-deep` are the same shape and should be one base plus five colour blocks.
Adopt UKBT's other two habits at the same time: a private type ramp
(`--a27-xs` … `--a27-5xl`) instead of 88px/68px/62px literals, and a declared
`@font-face` of its own rather than borrowing UKBT's. Use `data-art-index` /
`data-art-slot` for the poster props — they already exist, already vary per
slide, and need no control.

**5. Repair the AiAd27 data model regardless of how step 1 goes.** These are
defects under any architecture: render `subtitle` (the campaign's own timings
are in those 28 strings, so render them rather than delete them), move the ~30
hardcoded strings into deck fields so they are editable and translatable, mark
bullets with `rich()`, add `asStep` to `cards`, suppress `.pagenum` when the
a27 footer is numbering, and either show the logo or stop setting it.

**6. Retire the four one-offs in §9 as one change.** Each is small. Doing them
together matters because the *pattern* is the problem — a codebase where the
previous era's scaffolding is always still standing teaches the next author that
leaving scaffolding is normal.

**7. Bring the tooling up to the platform.** `check-fit.mjs` generalised to any
deck and wired into `npm test` would have caught the overlaps visible in
`AiAd27/aiad27-sample.png` before they were screenshotted. `preview.html` is a
better design-review surface than anything the app currently has. Neither
belongs in a campaign folder.

**8. Then the canvas, on top of compositions.** Once arrangement is a named
value in `slide.design`, the canvas has something to manipulate: snap targets
are the composition's regions, and the gesture writes a design value. Building
the canvas first, against no composition model, is how the coordinate trap gets
entered.

### One dependency to settle before step 2

`js/render.js` has gone from 3,233 lines to **6,251**; `renderSlide` itself is
166 lines with six distinct extension mechanisms plus two hardcoded specials,
and `layoutAwareness27` is ~120 lines. The split deferred on 2026-09-14 is now
more urgent, and the decision named then is on the critical path: a second
esbuild entry point versus plain scripts with a registry. A per-theme
layout-defaults map wants to live next to the layouts, so step 2 needs this
answered.

## 15. Open decisions

- **Is AiAd27 allowed to ship as-is, with the regressions documented?** These
  are five fixed teaching decks and a teacher who edits them is not the main
  case. That is a legitimate call — but it should be a stated exception with a
  date on it, not the platform's new normal. The risk is precedent: the next
  campaign copies `layoutAwareness27` because it is the shape that is there.
- **Do compositions carry a theme default, or is arrangement always the
  author's?** Step 2 assumes the former. It is the difference between a theme
  being a palette and a theme being a design.
- **How much of a composition may be its own DOM?** Not all ten AiAd27 layouts
  are reachable by restyling alone — the credits receipt is a three-column grid
  over a `bullets` array with three parts per line, which the standard
  `sourcecheck` DOM does not expose as three cells. Some compositions will need
  to add structure. The rule to write down: whatever structure they add still
  marks its fields with `rich()` and still reads its copy from the deck.
- **`render.js`: entry point or registry?** Unresolved since 2026-09-14, now
  blocking.
- **Does `placement` join the declared 33, or stay a helper-only key?** It is
  already on `slide.design` and reachable (§2 further issues). Folding it into
  `SlideDesign` makes the catalogue honest; leaving it out preserves the
  published 33 count and teaches the next census to miss helper writers again.
- **When does `ThemeKey` stop being hand-listed?** Same defect class as
  undeclared `SlideDesign`; currently six typed themes against ~23 runtime
  ones. Bound to step 3's "generate from `THEMES`" bullet once the engine
  surface is declared.

---

## 16. Change log

The body of this document describes the current state. This is what has moved
since it was written, so a reader can tell the analysis from the work.

### 2026-09-16 — `wordFrom` got a control

`js/editor.js`, Motion tab, between **Spacing** and **AI choreography**:
*"Direction — From the first word / From the last word / From the centre —
outwards to both ends."* Hidden when Spacing is *Together*, where every word
shares one beat and a direction would order nothing. Choosing `first` deletes
the key rather than storing the default, matching the controls around it.

Verified through the real UI and the rendered DOM: the three values produce
per-word `--d` delays of `0→650ms`, `650→0ms` and `650 509 0 509 650`; an
unknown value falls back to `first`; the control writes through to
`slide.design`; the Together/wave toggle removes it and brings it back.

Detail in §2. `slide.design` now has 33 keys and every one is reachable.

### 2026-09-16 — the four dark-theme lists became one declaration

`ground: 'dark'` in `THEMES` for eight themes, stamped as `data-ground` by a
new `themedRoot()` helper that also absorbed the ten hand-written
`'theme-' + (deck.theme || 'midnight')` call sites; `railSurface()` extended by
one line to carry the ground to the rail; the four `css/app.css` selector lists
collapsed to `[data-ground="dark"]`.

cinematic's worst chart step went 2.94:1 → **3.34:1**, brutal's 2.82:1 →
**3.21:1**, and all eight dark themes now clear the 3:1 floor for non-text
graphics. UKBT is untouched in both the places it mattered — its own
`--chart-*` still win by cascade order, and its pre-reversed logos are still
excluded by `logoReverse: 'never'`.

Detail in §10. `npm test` clean at 418.

### 2026-09-16 — further issues filed under §2 (analysis only)

No code. The engine-axis spine in §2 was re-checked against the tree; eight
further issues were written under *Further issues the §2 census still leaves
open* (undeclared `SlideDesign`, stale `ThemeKey`, missed `placement` via
helper writer, nested `wordPlan` false keys, full write-pattern set,
undocumented motion surface, specimen≠check, and AiAd27/era 6 designing
*beyond* the platform spine). Two matching open decisions were added to §15.
Plan step 3 remains the place the type/test debt turns into a catalogue —
this entry only stops the findings living in chat.

### Left undone on purpose

- **Per-layout ground** (northeastern `title`/`section`, AiAd27
  `quote`/`journey`). §10 explains why it needs its own visual review.
- **The `'midnight'` fallback value.** `themedRoot()` keeps it byte-identical.
  It only fires for a deck object that never went through `normalizeDeck`,
  which resolves unknown themes to `studio`, and changing what those get is the
  era-1 one-off in §9 rather than part of this fix.
- **Light-ground chart steps on a tinted light ground.** `studio`'s sage
  `#e5ecd9` gives the light steps a worst case of **2.80:1** — the same class
  of problem at the other end of the range, found while measuring this one.
  Not in scope here; worth its own look.
- **Declaring `SlideDesign` / reachability test / generated manual section.**
  Documented as open structure debt in §2; not implemented in this pass.

### A note on the visual baselines

`npm run visual:check` reports **120 failures, all of them aiad27**, and they
predate this work: the committed baselines were measured against the previous
`css/aiad27.css`, which the uncommitted rewrite in this tree replaced
(−508 / +114 lines). No baseline for any theme touched by these fixes changed.
**Do not run a bare `npm run visual:update`** while that rewrite is in the
tree — it would bless its current state along with everything else. Filter by
theme, and look at the results.

### One correction to this document

An earlier revision reported **three** unreachable design keys: `wordFrom`,
`focalX2` and `focalY2`. Only `wordFrom` was. The focal pair is set by two
range sliders in `customize.js` labelled *"Travels to horizontal / vertical"*,
written as `d['focal' + axis + '2']` — a form that a search for `d.focalX2`
does not match. Any future census of the design surface has to scan the
computed-property assignments too, or it will invent gaps. The caveat is
recorded in §2 next to the census it belongs to.

## Appendix — how the figures were produced

- **Editable fields / step nodes / subtitles rendered**: `SF.renderSlide` called
  on identical `SF.normalizeSlide` output per theme, counting
  `[data-content-key]`, `.step`, and whether the subtitle text appears in
  `textContent`.
- **Dark-ground luminance and chart contrast**: a `chart` slide rendered under
  every key in `SF.THEMES`, reading computed `background-color` (or the first
  colour stop of `background-image` for gradients) and `--chart-1…6`, then WCAG
  relative luminance and contrast ratios.
- **Shared-code cost per era**: `git show --stat` on each theme's introducing
  commit, restricted to `js/render.js`, `css/app.css`, `src/model.js`,
  `js/customize.js`, `js/player.js`, `js/shell.js`.
- **Stylesheet metrics**: `grep` counts of `.layout-*` selectors, `--s-*`
  references, private token declarations, `font-size` declarations and
  `@font-face` blocks per file.
- **Engine surface census**: every key of `SF.LIBRARY_SEED_KEYS` built with
  `SF.buildLesson`, collecting `Object.keys(slide.design)` and the capability
  fields per lesson; cross-referenced against keys assigned in
  `js/customize.js` and `js/editor.js` to find the ones the engine reads and
  nothing writes. Five write patterns have to be matched, not one — `d.X =`,
  `delete d.X`, `choose(…,'X')`, `d['pre' + var + 'post']`, **and helpers**
  such as `SF.setImagePlacement` (which is how `placement` is written). Missing
  the fourth invented the false `focalX2`/`focalY2` orphans; missing the fifth
  dropped `placement` from the published 33. Nested keys under `wordPlan[]`
  must not be counted as top-level design keys.
- **Verifying the `ground` fix**: the four rules measured separately off the
  live DOM — `--chart-1…6` against each theme's ground for contrast; the
  computed `color` of a `.ct-com` span inside a rendered `code` slide; the
  computed `filter` on `.slide-logo img` for a deck with `logoOn: 'all'`, both
  with and without the `logoReverse: 'never'` escape; and the computed
  `background-color` / `outline-style` of a `.srow.lead` injected into a
  rendered `SF.scoreRail`.
- **Verifying the `wordFrom` control**: `SF.Editor.openDeck` on a saved deck
  with a `statement` slide, the Motion tab clicked, then each `select`
  dispatched a real `change` event and `SF.Editor.deck()` re-read to confirm
  the write — including that returning to the default *deletes* the key. Wave
  order read as the per-word `--d` custom property.
- **Dead subtitles**: every slide in `AiAd27/bundles/AiAd27-All-Five.sfbundle.json`
  filtered to the 10 intercepted types, counting non-empty `subtitle` on the
  9 types the renderer never reads.
