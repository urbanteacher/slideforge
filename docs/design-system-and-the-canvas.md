# SlideForge's design system: what it is, what AiAd27 did to it, and where the canvas goes

Written 2026-09-16 from the `northeastern-lecture-theme` branch with its
uncommitted work in place. A position document: it exists so that anyone —
person or model — picking this up later starts from the same model of the system
instead of re-deriving it.

Every number below was measured, not estimated — mostly by rendering slides in
a browser and reading the DOM. The method for each figure is in the appendix.

The body describes the **current** state of the code. Two of the defects it
identifies have since been fixed; §17 is the change log, and each fix is also
described in the section it belongs to rather than only at the end.

---

## Read this first

1. **The engine is the product; the decks are its documentation.** The two
   showcase lessons — `motion-lab` (16 design keys, 5 slide types) and
   `pace-nul` (6 design keys, 8 slide types) — are a capability catalogue
   published as *data*. One engine key, `wordFrom`, was read by the renderer,
   demonstrated only by `motion-lab`, and settable by no interface — **fixed
   2026-09-16**, see §17. None of the motion surface appears in `manual.html`,
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
| `js/customize.js` — "Customise this slide" rail | **28** | align, backdrop, background, capFade, capPos, capStyle, cardPics, cardsMode, chartFocus, chartMotion, composition, focalX, focalY, focalX2, focalY2, funnelDirection, imageFrame, imageMotion, imageShare, imageStep, imageTravelSecs, logoGround, mediaGround, **placement**, size, statStyle, textColor, timelineMode |
| `js/editor.js` — the Motion tab, for word animation | **6** | words, wordSpeed, wordStagger, wordsLoop, wordPlan, **wordFrom** (added 2026-09-16) |
| **nowhere** | **0** | — |

**34 settings in total** — and arriving at that number took three attempts, which
is the argument for the declared inventory rather than a footnote to it. See the
census warning below.

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
back"* — the control was designed and never written. Fixed; see §17.

**A caution for anyone re-running this census — it defeated three attempts.**
A design key can be written in at least **five** syntactically different ways,
and each missed form invents a phantom gap or hides a real setting:

| Form | Example | What missing it costs |
| --- | --- | --- |
| direct | `d.imageMotion = v` | — |
| delete-to-default | `delete d.wordFrom` | — |
| picker helper | `choose('Text size','size',…)` | — |
| computed property | `d['focal' + axis + '2'] = n` | reported `focalX2`/`focalY2` as unreachable orphans when they have sliders |
| **model helper** | `SF.setImagePlacement(s, v)` → `slide.design.placement` | missed `placement` entirely — the 34th setting |

Counting reads is harder still: most layout code aliases `var d = slide.design
|| {}` and then reads `d.X`, so a grep for `slide.design.X` finds a fifth of
them. **No regex pass over this codebase produces a trustworthy total.** That is
the case for step 3 of §15: the number should come from a declared
`SlideDesign` and a test that walks the editor, not from pattern-matching.

**And none of it is documented anywhere a user could reach.** `wordFrom`,
`focalX2`, `wordStagger`, "word animation" and "Image motion" appear **zero**
times in `docs/` or the 88 KB `README.md`, and **the app ships no design
reference page at all**. The engine surface is knowable by reading
`js/render.js`, or by opening the specimen deck and copying a slide out of it.
Nothing else.

*Correction:* an earlier revision also counted zero hits in `manual.html` as
evidence. That was a category error — `manual.html` is titled "Private teacher
controls" and is the **live classroom desk** (name picker, timer, roster,
reveal controls, Toolkit). It was never documentation, so finding nothing in it
proves nothing. The right target is a generated reference page of its own; see
§15 step 3.

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

So the rule to write down, and the one the plan in §15 follows:

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
`ThemeKey` from `THEMES` (doc §15 step 3) is the theme-shaped twin of this
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
The `ground: 'dark'` fix (§10 / §17) raised cinematic's worst chart step above
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

### And what it did not prove: the frame has never met a picture

Measured 2026-09-17, across all 45 campaign slides: **zero images, zero charts,
zero tables.** AiAd27 is a text-and-shape system. Everything above about the
frame holding — the 40px header, the 32px closing rule, the repeated 52px
content edge — is evidence about type and flat colour only. It is genuinely
unknown whether that frame survives a photograph or a bar chart, because no
campaign slide has ever contained one.

That is worth stating plainly because the discipline is easy to over-read. The
decks look systematic partly because they declined the hardest case.

**Worse, the question cannot currently be asked inside the campaign.** The
chrome is a property of the *composition*, not of the theme, and the campaign's
composition table names ten slide types. A type outside that list gets no
composition at all, which means no `composition-structured`, which means no
`.cp-header`, no `.cp-footer`, no lockup and no closing rule:

| Slide type on an aiad27 theme | Composition | Campaign frame |
| --- | --- | --- |
| title, quote, statement, cards, journey, keyfact, compare, iceberg, sourcecheck, spectrum | yes | ✅ |
| **split** | none | **✗ falls back to `layout-split`** |
| **content** | none | **✗ falls back to `layout-content`** |
| **chart** | none | **✗ falls back to `layout-chart`** |

So the three types that would carry an image or a graph are exactly the three
that drop out of the campaign. Add a picture to a 2027 deck today and the slide
does not bend the system — it silently leaves it, losing the identity, the
closing line and the page number with no warning anywhere.

This is the same fault family as everything in Part III: *the frame is attached
to the wrong noun.* It is hung off the composition, so it is only as complete
as the composition table, when what a reader sees is a theme.

Two consequences for the plan:

1. **`imageShare` — the 35/50/65 control — lives only on `split`,** the one
   type the campaign never uses. Any claim that the campaign's proportions are
   settled does not cover images, because that control has never run inside it.
2. **The split canvas work in §15 is being built against the legacy path** for
   campaign decks, not against the composition path, and the two do not share
   chrome. Whichever way that is resolved, it should be a decision rather than
   a discovery.

`tools/smoke-campaign-chrome.mjs` now fails if a campaign slide renders
without its header or closing rule, so the trap is caught at the point somebody
falls into it rather than on a projector.

### And the table itself is written down twice

Found while trying to make the check above fail on purpose — it would not,
which is its own finding.

There are **two copies of the type-to-composition map**:

| Where | Name | How it is used |
| --- | --- | --- |
| `AiAd27/starters27.js` | `COMPOSITION_DEFAULTS` | baked into every slide's `design.composition` at build time |
| `src/themes.js` | `CAMPAIGN_COMPOSITIONS` | the theme's `defaults` |

Same ten pairs today. Nothing links them, and **the baked one wins** —
`slideComposition` reads `slide.design.composition` first. So editing
`src/themes.js` changes nothing for a deck that already exists: the edit looks
applied, every existing deck carries on as before, and the two only disagree
somewhere nobody is looking. Removing `compare` from `src/themes.js` entirely
and rebuilding changed no rendered slide.

That is this document's recurring fault in its purest form, and it was hiding
behind a test that could not fail. `tests/campaign-builders.test.js` now
asserts the two agree for every real starter slide, checked against what the
renderer resolves rather than by parsing both files.

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
| 1 | `--s-*` tokens + `.theme-X` | `'midnight'` as the literal fallback at **10** call sites in `render.js` plus one in `editor.js`, while the model defaulted to `studio` — decks and games had different house themes | **retired.** `themedRoot()` reduced ten copies to one, then `resolveTheme()` / `DEFAULT_THEME` in `src/themes.js` removed the literal entirely. Games resolve through the same function, so there is now one house theme. |
| 3 | `.theme-X.layout-Y` scoping, `slide.design`, `SF.Custom.layout` | `northeastern` as a hardcoded `else if` in `renderSlide`, beside the `THEME_ART` table invented later to do the same job | **retired.** Theme art moved into the manifest's `art` descriptor; `THEME_ART` is gone from `render.js` too. |
| 1–3 | *nothing — never generalised* | **Four** independent name-lists in `css/app.css` answering "is this theme dark?", with divergent membership | **retired.** One `ground` declaration, now per-layout — see §10. |
| 6 | `slide.design.composition` + `applyComposition` | `layoutAwareness27` — a second dispatch path whose guard excluded the first | **retired.** Replaced by composition-gated `layoutComposition`; see §12 and §17. |

**All four are now closed.** Worth recording what actually cleared them,
because it was not diligence: in every case the one-off survived because
nothing in the build could see it, and it died when something could. The dark
lists went when a theme had to *declare* a ground. The `northeastern` branch
went when art became a manifest field. The `midnight` literals went when ten
copies became one function. `layoutAwareness27` went when arrangement became
data with a picker.

The standing lesson for era 7: **a one-off survives exactly as long as no
check can name it.** The three bindings added in §17 — `SlideDesign` ↔
catalogue by `@satisfies`, catalogue ↔ behavioural probes by assertion, and
the theme manifest test — are the first mechanisms in this codebase that would
fail on a new one rather than wait for somebody to notice it.

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
the plan in §15 calls the theme manifest, and it is worth naming what made it
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
by hand again. **That is the gap the reachability check in §15 step 3 closes,
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

## 14. Slide chrome: two regions, not six absolute things

Proposed, not built. This is the step between compositions and the canvas, and
it is the smallest useful version of the region model the canvas needs.

### What chrome is today

Six things can appear around a slide's content, and no two are placed the same
way:

| Thing | Controlled by | How it is placed |
| --- | --- | --- |
| `.pagenum` | `showSlideNumbers` | absolute, bottom-right — except on a composition, where it is moved into the footer |
| `.slide-logo` | `logoOn`, `logoSize`, `logoGround`, `logoReverse` | absolute, top-right |
| `.track` | nothing — always on | absolute, full-width foot |
| `.slide-date` | a per-slide field | in the flow |
| `.cp-header` | the composition | in the flow |
| `.cp-footer` | the composition | in the flow |

Four settings for one of them, none for another, and two that exist only if a
composition happens to draw them.

### The 330px, as the worked example

`.cp-header` reserves `padding-right: 330px` so its text cannot collide with
the corner mark. The mark is `position: absolute`, so the two are not related
in any way a browser can see — the number is a guess that has to be kept true
by hand.

Everything that went wrong with it in one afternoon:

- It reserved the space on **every** slide and on every theme, so a deck with
  no logo got a 330px hole. Fixed by stamping `has-corner-mark` and scoping
  the rule to it — but that is a second fact kept in step with the first.
- The lockup was drawn on a 300×72 artboard and capped to 42px tall by a
  third rule, so it rendered at 0.58 and its 20px heading arrived at 10px.
  Three separate places had an opinion about the mark's size and none of them
  knew what was inside the artwork.
- Aligning the lockup's first line with the strand name opposite it meant
  computing a `top` from the pad's padding, the header's height and the
  artboard's internal baseline — four numbers in three files.

None of these are hard. All of them are the same shape: **a spatial
relationship expressed as arithmetic in two places instead of as structure in
one.**

### The proposal

Two declared regions, each holding named slots the author fills:

```
header   [ identity ]   [ context ]   [ mark ]
footer   [ mark/text ]  [ context ]   [ number ]
```

- **Slots take a named thing, never a free text box.** The mark, the page
  number, the deck's organisation, the slide's own context line. The moment a
  slot accepts arbitrary type at arbitrary size, overflow is back — in a 40px
  strip, where there is no room to reflow out of it.
- **The mark becomes a child of its region.** No reservation, no gap when it
  is absent, no magic number to keep in step, and the artwork is drawn to a
  slot whose height is declared once.
- **Chrome stops belonging to a composition.** The AiAd27 footer was lost
  entirely in the composition rewrite — carrying the campaign line and the
  page count — because it lived inside one renderer branch. A declared region
  cannot disappear that way.
- **One control surface.** `showSlideNumbers`, `logoOn`, `logoSize`,
  `logoGround` and `logoReverse` become "what is in footer-right" and "what is
  in header-right".

### Why it is the right first canvas gesture

Dragging the mark from `header-right` to `footer-left` is drag-and-snap with
three targets in a strip, nothing free-form, and nothing that can overflow. It
proves the region model on the safest surface in the app before anything
touches the body of a slide.

It also settles a question the campaign work kept re-asking by hand: the beat
line sits in the header on four layouts, above the words on three, and below
the list on one. Today that is a list of slide types in `compositions.js`.
Under slots it is a per-composition default — data, visible in the picker,
changeable without a renderer edit.

### A smaller idea that belongs with it

`slide.timeLimit` already exists in the model, and the teacher desk already
has a timer. The campaign beat says "· 30 seconds" as *text*, so the deck and
the timer can disagree and nothing notices. If the context slot read the
slide's own `timeLimit`, the label on the wall and the countdown on the desk
would agree by construction rather than by proofreading.

## 14b. The row model: compose blocks into a frame, not onto a plane

Proposed 2026-09-17, after freeform canvas editing was built and reverted.
Nothing here is implemented. The numbers are measured; the design is not yet
argued with, which is the point of writing it down.

### The idea, as an analogy

A good marketing page is sections in a grid. It is not a Photoshop artboard.
The same distinction separates this proposal from what was reverted:

| Web, modular and responsive | This proposal |
| --- | --- |
| Independent sections — header, card, gallery | Blocks in the body's own grid |
| Fluid width: `%`, `fr`, `max-width` | **Spans of a row and column pitch**, never free `{x,y}` |
| Flex and Grid for structure | The composition grid content already sits in |
| Reflow when the viewport changes | Refit when theme, aspect or span changes — **structure stays** |
| Absolute `top/left` posters | Freeform handles — what this is deliberately *not* |

**The twist a slide adds:** a page is endlessly tall and breakpoint-fluid; a
slide is a fixed stage. So "responsive" here means blocks share a row and
column system *inside* 1280×720, and content that outgrows its span fails a
measured check at authoring time rather than overflowing on a projector.

### Why this rather than the freeform model

Freeform gave every object five continuous, unbounded degrees of freedom —
x, y, width, height, rotation. A span model gives a block two small integers.
Bounded, serialisable, diffable, and it *reflows*, because a row is a ratio of
the body rather than a pixel count. It also survives a theme change, which
free coordinates cannot.

The engine is already half-way there on one axis and nowhere on the other.
Counted in `css/customize.css`:

| | Occurrences |
| --- | --- |
| `grid-template-columns` | **17** |
| `grid-template-rows` | **0** |

The campaign has always thought in columns and has never once thought in
rows. Vertical rhythm is flex, gaps, padding and `justify-content:center`,
which is exactly why nothing snaps vertically today.

The arithmetic is available: the body is `720 − 40 header − 32 footer −
32/24 pad` = **exactly 592px**, a definite height. 8×74, 16×37 and 12×42+8
all divide it exactly.

### The measurement that should stop a retrofit

Run `node tools/smoke-row-grid.mjs` against a live server. It renders the 35
campaign body slides plus 78 pad-only ones, measures every block edge against
four candidate pitches, and reports the distance to the nearest row line.

Corrected 2026-09-17 after two errors, one in each direction.

**First correction — the measurement.** An earlier pass generated row lines at
band tops only, which unfairly penalised the guttered pitches: with a gap,
an edge can legitimately sit on a band's *bottom* too. `smoke-row-grid.mjs`
emits both. The figures below are the corrected ones.

**Second correction — the comparison.** Distance to the nearest line is biased
towards whichever grid has the most lines, and the four candidates differ by
more than five times. Against a uniform-random null model over the same body:

| Grid | Lines | ±6px covers | Random mean | AiAd27 observed | vs chance |
| --- | --- | --- | --- | --- | --- |
| 8×74 | 9 | 18% | 18.5 | 18.8 / worst 36.5 | **1.02×** |
| 12×42+8 | 24 | 49% | 9.2 | 8.0 / worst 18.8 | 0.87× |
| 16×37 | 17 | 34% | 9.3 | 8.3 / worst 18.1 | 0.90× |
| 24×17+8 | 48 | **97%** | 3.6 | 3.6 / worst 8.0 | **1.01×** |

**AiAd27 is at chance on two of the four pitches, and at best 13% better than
random on the others.** The apparent strength of 24×17+8 is entirely line
density: its ±6px windows cover 97% of the 592px body, so "within 6px of a
line" is very close to vacuous there. On that pitch 45.7% of slides have every
edge inside tolerance — which sounds like the best result in the table until
you notice random placement would score higher.

So the conclusion is firmer than "looks regular but is not yet formal". There
is **no latent row structure to formalise.** The campaign reads as
well-proportioned because its blocks are internally consistent — a 26px
eyebrow gap, a 32px tagline gap, a 40px column gutter — not because they land
on a shared vertical lattice. They do not.

That reframes step 1 below. It is not a nudge onto a pitch the deck is nearly
on. It is **imposing a vertical rhythm the deck has never had**, which is a
real design act on 35 finished slides and should be decided as one.

*Two caveats on the figures.* Only `.cp-body` slides (592px) are comparable to
the campaign arithmetic; the 78 pad-only slides were measured against `.pad`
at 720px and are a weaker signal. And the fit checker reports **0 failures**
today, which is a statement about slide boundaries, not about spans — it
becomes the span guardrail only once a pitch exists to measure against.

### The same test on NUL, and why it lands the same way

`node tools/smoke-nul-row-middle.mjs --lesson layout-bank` measures the 97
slides of the layout bank against a header / middle / footer band model.

| Metric | Result |
| --- | --- |
| Fully snapped (every edge ≤6px) | **0 / 97** |
| Mean / worst middle error | 9.9 / 18px |
| Full-bleed slides that ignore the chrome bands | 9 / 97 |
| Slides with media in the middle | 32 (21 of them charts) |
| Fit-check failures | 0 |

**Read against chance, 9.9px is nothing.** Random placement over that geometry
gives 9.14px, so the layout bank sits at **1.08× chance** — marginally worse
than random. Exactly the same answer as the campaign, by the same
null-model correction, and the second time the raw millimetres have looked
more encouraging than they are.

**The band model as proposed cannot be built.** Header 37 + middle 646 +
footer 37 does total 720, but 646/37 = **17.46 rows**. There is no such thing
as 17.46 rows. Several clean decompositions of 720 do exist — `40 + 16×40 +
40`, `27 + 18×37 + 27`, `64 + 16×37 + 64` — but inventing one for the generic
layouts is the wrong instinct, because:

**the campaign already has a working decomposition.** `40 header + 592 body +
32 footer + 56 pad = 720`, and **592 = 16 × 37 exactly**. The campaign's body
is already sixteen whole rows. What NUL lacks is not a pitch, it is a *body
region* — it has no `.cp-body` equivalent at all, which is why its figures had
to be taken against the full 720px stage and were never comparable.

So the honest sequence for the generic layouts is: give them the campaign's
chrome-and-body decomposition first, then one pitch serves both families and
the measurement becomes apples-to-apples. Not a second geometry.

### The finding that actually sets the scope

Chrome is easy. The middle is **thirty-odd different recipes**, and a row
model does not reduce that number — each recipe still needs its own span map
authored. Charts alone are 20 of the 97 slides, all heading-plus-plot, none
of them on a lattice.

And the 9 full-bleed slides are not failures. Image, split and video
deliberately claim the whole stage and ignore the chrome bands. A row model
therefore needs an explicit **full-bleed escape** as a first-class state,
rather than treating those slides as things to be corrected.

### The order that follows

1. **Choose the pitch, then make the campaign land on it.** AiAd27 is already
   within ~8px mean at 16×37. Moving its paddings and gaps onto the pitch is
   a stylesheet change, not an engine change, and `check fit` verifies all 45
   slides afterwards.
2. **Then add spans**, because only now does a span mean something.
3. **Then decide per theme** whether NUL and UKBT re-fit — as a deliberate,
   reviewed reflow, never a silent one.

Recommended pitch: **16 rows × 37px** — but on design grounds now, not
measurement, because the measurement does not favour any of them. Sixteen is
coarse enough that a span means something and fine enough for a caption;
24×17+8 is too fine to author with, and its better-looking numbers are the
line-density artefact above.

### The guardrail

`Look → Review slides & check fit` is the reason this is safe to attempt. It
measures rendered boxes rather than counting characters, so "this block needs
five rows and has four" is a number, not an opinion — and it already runs
across both aspect ratios. A span model without a measured fit check is just
a new way to overflow.

### 2026-09-17 — the header now fits its contents, and the body arithmetic moved

The header band was 40px while the campaign lockup beside it is 56px, so the
mark hung 16px below its own header and into the body. It never showed,
because the body padded its top by 32px and held content clear — the band was
not containing its contents, the body was covering for it.

Fixed by moving the 16px out of every body's top padding and into the header:
`.cp-header` 40 → 56, and the four `.cp-body` top paddings each down by 16
(32→16, 26→10, 35→19, 26→10). Measured before and after across all 35
campaign slides: **content-box tops and heights are identical** (98/104/107
and 527/534/536/540), the header bottom now equals the lockup bottom at 88px,
and all 597 visual baselines pass unchanged. Zero visual change, by
construction and by measurement.

**But it moves the arithmetic the span map was built on.** The body is now
**576px, not 592** — which is 16 rows of 36 exactly, so the band decomposition
gets cleaner:

```
32 pad + 56 header + 576 body + 32 footer + 24 pad = 720
576 = 16 x 36
```

The catch is that 36px fits the content *worse* than 37px did. A two-line
heading is 183px: that is 4.95 rows of 37 — which is why 5 rows looked so
convincing — but 5.08 rows of 36, so it would need 6 and gain 33px of slack.
The 37px fit was a coincidence of the old body height, not a property of the
design.

Candidate pitches on 576 (`576 = 2^6 x 9`): **18 rows x 32px**, 16 x 36,
12 x 48, 24 x 24. On the 183px heading, 32 / 48 / 24 all round to 192px — 9px
of slack — and 36 is the worst of them at 216.

**So the pitch is open again, and the span map below is stale.** Its row counts
were computed against the 592px body at 37px and need redoing at whatever
pitch is chosen for 576. The method in it stands: spans round up, the heading
span is variable, margins become gaps, and centring becomes an anchor.

### The chrome is not consistent across the app, measured

`modular-canvas/preview.html` now draws the header and footer as **measured**
bands on every tile, with their slots named — identity, context, mark above;
note, context, number below — because the proposal is that those positions are
interchangeable, so which slot a thing sits in is the thing worth seeing.

Doing that to all eight tiles surfaced the gap:

| Slide | Header band | Footer band | Slots found |
| --- | --- | --- | --- |
| campaign `poster-art`, `voice` | **real, 56px** | **real, 32px** | identity, mark, note, number |
| NUL `sidecar` | implied, 36px | — (no page number) | mark |
| NUL `editorial`, `introduction`, `chart` | implied, 36px | implied, 22px | mark, number |
| `split`, `full-bleed-image` | implied, 36px · *claimed by full bleed* | implied, 22px · *claimed* | mark, number |

**Only the campaign has a frame.** Everything else has the furniture without
it: a mark and usually a page number, placed per layout rather than into a
region. And they are placed inconsistently — measured across the six generic
slides, the mark's top is **24, 26 or 28px** and its left is **1088, 1092 or
1100**; the page number's left is **1181 or 1191**. The campaign's mark is at a
fixed `top:32 / right:52` on all thirty-five.

That is the concrete version of "generic layouts are not on the modular chrome
yet". It is not that they are 9px off a lattice; it is that there is no region
for them to be in, so each layout re-decides where its furniture goes to the
nearest few pixels.

Which reorders the work again. A shared **header and footer region** for the
generic layouts is worth more than a row pitch, comes first, and is a much
smaller change: it gives the marks one place to be, makes the bands real
rather than implied, and only then is there a body region for rows to divide.

Full-bleed keeps its escape. Those two tiles draw the same bands and label
them *claimed*, because the chrome is still there — the media simply runs over
it. Drawing nothing made an escape look like an absence.

### 2026-09-17 — the generic layouts got a chrome region

Built. `--sf-chrome-top`, `--sf-chrome-side`, `--sf-header-h`,
`--sf-footer-h` on `.slide`, consumed by `.slide-logo` and `.pagenum`.

The mark's inset was set in **five places**, three of them on `.slide-logo`
alone — so the page number never came with it:

| Was | Now |
| --- | --- |
| base `top:28 right:36`, number `right:40` | region `28/40`, both |
| `[data-composition]` `top:26 right:40` | dropped; inherits the region |
| `.layout-title/.layout-section` `top:36 right:48` | region override `36/48` |
| `.layout-image` `top:24 right:28` | region override `24/28` |
| `theme-aiad26-*` `top:30 right:34` | region override on the theme |

Measured across the Library afterwards: **307 of 309** slides carrying both a
mark and a number now have them on the same right edge. The two exceptions are
the `has-clock` slides, where the clock takes the corner and the mark steps
aside deliberately. Generic insets are down to a declared set of three —
`24/28`, `28/40`, `36/48` — from five sources and a spread of nine values.

Size stayed on the mark; only position moved to the region. How big a mark is,
is its own business.

**The visual baselines could not have caught any of this.**
`tools/visual-regression.mjs` builds its decks with no `logo` and no
`showSlideNumbers`, and renders with no `index` — so not one of the 597
baselines contains a mark or a page number. They all pass, which proves only
that the bodies were left alone. `tools/smoke-chrome-region.mjs` is the check
that actually covers it, and it is mutation-verified: putting `top/right` back
on `.slide-logo` fails it with "mark and page number on different right edges:
41 of 309 slides".

**What this unlocks.** The generic layouts now have a declared region where
their furniture lives, which was the precondition recorded above — not a row
pitch. `--sf-header-h` and `--sf-footer-h` exist and are not yet load-bearing;
the next step is a body region measured between them, and only then is there
something for rows to divide.

### 2026-09-17 — `poster-art` re-fitted onto the rows

Done, for one composition. `16 x 36` on the 576px body.

**The pitch was chosen by measuring the re-fit, not the fit.** No pitch has
lines where the blocks already are — across 298 campaign blocks every
candidate sits at or near chance (48px 1.01x, 36px 0.90x, 32px 1.11x, 24px
1.02x, 18px 1.11x, 16px 0.90x). So the question is not which pitch matches,
it is which pitch is cheapest to move to:

| Pitch | eyebrow | heading | tagline | art |
| --- | --- | --- | --- | --- |
| **36px** | +14 | **+3** | +4 | +3 |
| 32px | −2 | **+15** | −8 | −1 |

Similar totals, but 32px puts its movement in the headline and 36px puts it in
the eyebrow. Moving an 88px headline 15px is visible; moving a 20px label 14px
is not. 36px also lands the two-line heading within 3px of five whole rows,
which 32px cannot.

**`align-items: center` had to go.** A centred item's offset is a function of
its own height, so two items of different heights — a copy stack and a 490px
artboard — can never both sit on a line. The body is `align-items: start` now
and each item is placed explicitly, which answers the anchor question from the
span map for this composition:

```
art          rows 2-15   (margin-top 36, height 504 = 14 rows exactly)
eyebrow      row 5       (stack margin-top 144)
heading      row 6       (eyebrow margin-bottom 15, was 26)
tagline      row 12      (heading margin-top 33, was 32)
```

**Result: 19 of 20 block tops sit on a row line.** The one miss is Smart's
tagline, 17px off — and it is the variable-span problem, now with a number
against it. Smart is the three-line headline: 274.5px is 7.63 rows, so
anything below it lands off the lattice no matter what the margins say. The
fix is a heading padded to whole rows, which needs either an authored span or
a `ceil()` CSS cannot do.

So the rule earned here: **a block can only put the block after it on a line
if its own height is a whole number of rows.** Fixed-height things — the art,
the eyebrow, the tagline — are easy. Text that wraps is the whole problem, and
it is one composition in, not ten.

*Verified:* 433 tests, 45 campaign slides fit with 0 overflow, 63
campaign-chrome checks. All 597 visual baselines pass, which again is not
evidence — `visual-regression.mjs` builds decks with no composition, so no
baseline renders a `.cp-*` slide at all. The evidence is the measurement.

### The span map for `poster-art`, measured across all five covers

*(Row counts below are against the retired 592px/37px body — see the entry
above. The reasoning holds; the numbers need recomputing.)*

Sketch, not an implementation. 16 rows x 37px in the 592px body; the two
columns stay as they are (668.672 | 495.328, 12px gap).

```
         col A  text (668px)              col B  art (495px)
row 1    ·                                ·                     ← 1 spare row
row 2    ·                                ┌ art span, 14 rows ┐
row 3    eyebrow      1 row   (21px ink)  │                   │
row 4    · gap        1 row               │  490px artboard,  │
row 5    ┌ heading    5 rows (2-line)     │  centred in its   │
  …      │            or 8 rows (3-line)  │  span, NOT        │
row 9/12 └                                │  stretched        │
row 10   · gap        1 row               │                   │
row 11   tagline      1 row   (32px ink)  │                   │
  …      ·                                └───────────────────┘
row 16   ·                                ·                     ← 1 spare row
```

**Spans round UP, because a span contains its block.** 275px of heading does
not fit 7 rows (259px); it needs 8. This is the rule that makes the model
honest — a span is never smaller than its content, so overflow is impossible
by construction rather than by luck.

| Block | Ink | Span | Slack |
| --- | --- | --- | --- |
| eyebrow | 21px | **1 row** (37) | 16px |
| heading, 2 lines | 183px | **5 rows** (185) | 2px |
| heading, 3 lines | 275px | **8 rows** (296) | 21px |
| tagline | 32px | **1 row** (37) | 5px |
| art | 490px | **14 rows** (518) | 28px |

Stack totals **9 rows** on a 2-line cover and **12** on a 3-line one.

> **Corrected 2026-09-17.** An earlier version of this section had Safe and
> Smart both at three lines. Measured on `AiAd27/preview.html`, which is the
> page that actually shows the deck, **only Smart is three lines** — Safe,
> Creative, Responsible and Future are all two. The wrong figure came from a
> headless probe that rendered the slide into the app's index page instead,
> where the heading laid out narrower and wrapped to three. The lesson is
> worth more than the number: **measure in the page that shows the deck.** A
> detached render is a different layout context and can change a line count,
> which changes a span, which changes the map.

### The three decisions, answered by measurement

**1. The heading span is variable, not fixed.** Safe, Creative, Responsible
and Future are two lines (5 rows); Smart is three (8 rows). Forcing three
lines into five rows means dropping the type to about 72px, which
contradicts the 88px top step the campaign deliberately set — see the change
log for `--a27-display-short`. So the span follows the content.

The consequence is the actual model: because the stack length varies, **you
cannot author absolute row lines.** You author *spans plus an anchor rule*,
and let the stack flow. A fixed lattice map would need one per headline
length.

**2. Margins become row gaps.** The rhythm today is `margin-bottom: 26px` on
the eyebrow and `margin-top: 32px` on the tagline. Both become a 1-row gap and
the margins go to 0. Cost: 26 → 37 (+11px) and 32 → 37 (+5px). The stack grows
16px, which the anchor absorbs.

**3. `align-items: center` becomes centre-to-nearest-whole-row.** This is the
cheapest anchor available, and it is cheap because the current design is
already nearly there:

| Cover | Lines | Heading | Stack rows | Start row | Shift |
| --- | --- | --- | --- | --- | --- |
| safe | 2 | 5 rows | 9 | 5 | **+2px** |
| creative | 2 | 5 rows | 9 | 5 | **+1px** |
| responsible | 2 | 5 rows | 9 | 5 | **+1px** |
| future | 2 | 5 rows | 9 | 5 | **+1px** |
| smart | 3 | **8 rows** | 12 | 3 | **−27px** |
| art (all five) | — | 14 rows | — | 2 | **+2px** |

**Four of the five covers move by one or two pixels.** The art moves by two,
because the span *contains* the 490px artboard rather than stretching it. Only
Smart moves visibly, up 27px, because it is the one three-line headline.

That makes the re-fit cheaper than it first looked — and leaves the variable
span just as necessary, because Smart still needs eight rows where the others
need five.

The alternative anchor — top-align every stack at a fixed row — was rejected
on this evidence: it would move the 2-line covers up 74px.

### What this sketch does not settle

- It is **one composition of ten**. The other nine — `voice`, `ballot`,
  `prompt`, `rules`, `commitment`, `comparison`, `reveal-map`, `credits`,
  `lanes` — each need the same treatment, and the layout bank adds thirty-odd
  more recipes on top.
- Columns are left alone. Whether they get a pitch too is still open.
- Full-bleed stays an escape from the grid, not a span.
- Nothing here is worth building until a second composition is mapped and the
  anchor rule survives it. One slide type agreeing is not a system.

### Open questions

- What happens when content exceeds its span: refuse, auto-grow and push, or
  shrink type? Each is defensible; the deck's promise is that the room can
  read it, which argues against shrink.
- Do columns get a pitch too, or stay per-composition as today?
- Is a span authored per slide, or per composition with per-slide override?
- Decorative artwork stays out of this. Freeform remains the right model for
  a decorative plane, and the wrong one for content.

## 15. The plan, in order

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

- **Declare `SlideDesign`** with all **34** keys — 28 in the rail, 6 in the
  Motion tab — each carrying which slide types it applies to. It appears
  nowhere in `src/types.d.ts` today. `TransitionKey` is also still five of six
  (`morph` missing); `ThemeKey` is now derived from the manifest and the same
  one-line treatment fixes it.
- **Generate `ThemeKey` from `THEMES`** rather than hand-listing it, and add
  the test the other two generated artefacts already have: a theme missing a
  required manifest field fails `npm test`.
- **Add the reachability check.** Every key in `SlideDesign` must be settable
  from some surface, and every design key a library lesson uses must be in
  `SlideDesign`. This is the test that turns the specimen decks from
  documentation into coverage. It would have found `wordFrom` immediately;
  a hand census took an afternoon and got the answer wrong once first.
- **Generate a design reference page** from the same declaration, and link it
  from the **Look** tab and from the teacher desk's **Toolkit** pane. Not into
  `manual.html` itself — that file is the live classroom desk, and a control
  reference does not belong in the surface a teacher is driving a room from.
  The motion engine is currently documented nowhere outside the specimen deck.

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

**7a. Then slide chrome as two regions (§14).** The smallest version of the
region model, on the safest surface: header and footer as declared slots, the
corner mark as a child of one rather than an absolute thing the header dodges
with a hardcoded 330px. Do this before the canvas — it is the same mechanism
at a tenth of the risk, and it retires a family of arithmetic bugs that cost
most of an afternoon on 2026-09-16.

**8. Then the canvas, on top of compositions and regions.** Once arrangement is a named
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

## 16. Open decisions

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

## 17. Change log

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
*beyond* the platform spine). Two matching open decisions were added to §16.
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

### 2026-09-16 — campaign chrome, and six faults behind it

The AI Awareness Day header and footer were rebuilt slide by slide against a
live review. Six defects surfaced, all of the same family — a fact held in two
places that had drifted:

| Fault | Cause |
| --- | --- |
| Corner mark on the hidden teacher page, not the cover | `logoOn: 'title'` meant editor row 0, not the first slide the room sees |
| Strand mark invisible on three of seven slides | an SVG with the strand colour baked in, on a ground of that colour |
| 330px of empty header on every slide | the reservation could not tell whether a mark was coming |
| Page number "3 / 9" in the editor, "3 / 7" in Present | one counted deck rows, the other the running order |
| `closingNote` never reached the deck | `buildLesson` copies deck fields by an allowlist |
| Lockup rendering at 0.58 of its stated size | three rules with an opinion about its size, none aware of the artboard |

Also restored the closing rule the composition rewrite had lost entirely, and
moved the beat line onto the words it introduces — an eyebrow above the cover,
scenario, discussion and commitment slides; a closing line under the rules.

**The structure stayed shared.** Verified after the fact: all ten structured
compositions still apply on northeastern, ukbt, studio and midnight, each
taking its own `closingNote`, with no overflow. Only the colour decisions are
scoped to the campaign — the white eyebrow, the inked strand mark, the rule
that follows its ground. That is the right line, and it is the line this
document exists to defend.

`tools/smoke-campaign-chrome.mjs` now holds 53 assertions across the five
strands covering every fault above, plus one that is not about any of them:
**nothing may be set in a colour its own ground would swallow**, measured by
luminance rather than by eye. Three of the six were re-introduced deliberately
to confirm the check fails on them.

Two limits worth recording. The fit checker caught the keyfact overflow this
work caused and could not catch the misalignment that came with it — a label
orphaned at the far left is inside the box. And half the faults above were
found by a person looking at a screen, not by any tool.

### 2026-09-16 — four corrections found by review

All four are errors in this document's own analysis, found by the agent
implementing against it. Recorded rather than quietly patched, because each one
is a reusable lesson about how the codebase misleads a reader.

| What this doc said | What is true | Why it was missed |
| --- | --- | --- |
| northeastern is dark on `title` and `section` | also on **`quote`** | `.theme-northeastern.layout-quote` was in my own grep output and I did not read it |
| the composition opt-out hides theme art | `.product-art` and `.editorial-art` **never matched** — the real classes are `pd-art` and `ed-art`, so Product and Editorial art was never hidden | the `THEME_ART` table naming them was on screen at the time |
| `slide.design` has 33 keys | **34** — `placement` is written only through `SF.setImagePlacement()` | a fifth write form, model-helper indirection, not covered by the census |
| the motion surface appears zero times in `manual.html` | `manual.html` is the **live teacher desk**, not documentation, so the count was meaningless | assumed from the filename |

The last one also invalidated a plan step: "put the surface in `manual.html`"
would have placed a control reference inside the surface a teacher drives a
room from. Step 3 now specifies a generated reference page linked from **Look**
and the desk's **Toolkit**.

### An earlier correction to this document

An earlier revision reported **three** unreachable design keys: `wordFrom`,
`focalX2` and `focalY2`. Only `wordFrom` was. The focal pair is set by two
range sliders in `customize.js` labelled *"Travels to horizontal / vertical"*,
written as `d['focal' + axis + '2']` — a form that a search for `d.focalX2`
does not match. Any future census of the design surface has to scan the
computed-property assignments too, or it will invent gaps. The caveat is
recorded in §2 next to the census it belongs to.

### 2026-09-16 — shared compositions, first foundation repair

The measurements above describe the pre-repair implementation. This pass closes
step 1 of §15 and repairs the main data losses in step 5; it does not claim to
complete the rest of the roadmap.

- `src/model.js` now owns `COMPOSITIONS`, compatibility and resolution. Six
  existing arrangements and ten structured arrangements are offered independently
  of theme. The five campaign themes declare type-to-composition defaults.
  `design.composition: 'none'` opts out; starter slides store explicit choices
  so re-theming preserves arrangement.
- `layoutAwareness27` is replaced by theme-independent `layoutComposition`.
  Shared geometry lives in `css/customize.css`; campaign CSS owns its palette,
  local font declaration and identity. No campaign names, lesson instructions
  or artwork paths remain in the composition renderer.
- Subtitles and parsed bullet text use `rich()`. Ballots participate in reveal
  steps. Quote and statement compositions reuse their shared rendering/motion
  functions. Normal logo, backdrop, track and page-number rendering remain.
  Dates render on poster titles; extra poster/ballot copy is editable in Content,
  and artwork is settable in Look. Explicit text size/alignment remain effective.
- Comparison rows retain the original left / right / optional row-label meaning.
  Decision lanes display numeric positions and group them below / at least 50;
  the picker names that threshold. The spatial scale is intentionally replaced
  by groups only when that named composition is selected.
- `tools/smoke-design-foundations.mjs` checks refreshed demos and all 16
  compositions across all themes (436 renders), plus editable fields, step
  counts, opt-out, persistence, chrome, dates, size/alignment and comparison
  semantics. These checks do not replace visual review or pixel baselines.

Still open: manifest art/per-layout ground, typed design-surface inventory and
reachability, renderer module boundaries, shared preview tooling, dedicated
composition pixel baselines, and canvas regions. The refreshed gallery, NUL and
Motion Lab demos remain specimens rather than a definition of the engine.
No blanket visual-baseline update was made.

### 2026-09-16 — theme manifest completed

Step 2 of §15 now uses `src/themes.js` as the single manifest, imported into
the existing model build. It contains each theme's identity, explicit ground,
art descriptor (or `null`), and composition defaults. `ThemeKey` is derived from
its keys instead of the old six-item union.

- `themeGround(theme, layout)` resolves per-layout overrides with a default for
  other slides and non-slide boards. NUL declares title, section **and quote**
  dark; AIAD27 declares quote and journey dark. The earlier descriptions of NUL
  mentioning only title/section omitted the navy quote ground.
- Theme decoration moved out of `render.js`. The renderer mounts the manifest's
  trusted static markup and binds optional deck title/organisation as text.
  This retires the NUL branch without losing its course eyebrow. All decorative
  containers carry `.theme-art`, which is also the composition opt-out selector;
  this fixes the old Product/Editorial selector names that missed their art.
- The shared ground rule now handles NUL logo reversal, replacing its separate
  CSS list. Explicit logo overrides remain. AIAD27's white-paper print treatment
  resets automatic inversion so its logo remains visible in PDF/print output.
- `tests/theme-manifest.test.js` checks required fields, valid grounds, layout
  keys and compatible composition defaults. `tools/smoke-theme-manifest.mjs`
  checks 184 theme/layout renders, artwork, safe eyebrow text, logo overrides,
  and the actual editor, player and handout/print surfaces. Run it with the
  local server running. No visual baselines were rewritten.

Verification: 420 unit tests pass; the 184 manifest checks and existing 436
composition/demo render checks pass. Dark-screen and white-print screenshots
were visually inspected. This validates intrinsic theme grounds; it does not
infer arbitrary photo backgrounds or replace the author's logo-ground override.

The next milestone is §15 step 3: the complete typed design-surface declaration,
control reachability checks and generated manual. The renderer module split and
canvas regions remain separate work.

### 2026-09-16 — declared design surface and live control checks

Step 3 of §15 now has a typed `SlideDesign` with all 34 settings, attached to
`Slide.design`. `src/design-controls.js` declares each setting's label, pane,
applicable slide types, explanatory text and conditional availability. Its
`@satisfies` contract requires exactly the keys of `SlideDesign`; the catalogue
is exposed as `SF.DESIGN_CONTROLS` through the existing model build.

`TransitionKey` now derives from the runtime transition tuple, including morph.
The missing statement layout was added to `DeckSlideType` when the catalogue's
type check exposed that omission. Imported decks retain inactive settings when
switching layouts; this work does not introduce destructive normalization.

The editor tags its actual fields with catalogue identifiers. `npm test` runs
`tools/smoke-design-controls.mjs` on a temporary local server and operates all
34 controls, checking the resulting stored design values. It exercises the
computed focal-point sliders, image-placement helper, conditional word controls,
and generation/clearing of choreography. Choreography uses a deterministic
service stub: no credits or external AI calls are needed. Seeded library decks
are checked for undeclared design keys as well.

These checks found and fixed three authoring defects:

- Enabling word animation now redraws its dependent controls immediately.
- Opening picture cards no longer moves an input before replacing it, which
  threw `NotFoundError` and prevented the inspector from opening.
- Choosing a cards layout explicitly opts out of a composition such as Ballot,
  so the selected rows/stack/pictures arrangement can actually take effect.

`design-guide.html` renders a searchable reference directly from the catalogue,
linked from Look and the classroom desk's Toolkit. It shows user-facing control
names, slide types and prerequisites. The classroom desk remains a live tool.
The browser test checks guide completeness and filtering; its layout was also
visually inspected.

These are reachability and persistence tests, not a claim that every value on
every layout has been visually verified. Rendering checks and visual regression
remain separate. Future settings must join the typed catalogue and receive a
real editor interaction probe. The next work is the remaining theme typography
and renderer/tooling cleanup before composition-region canvas gestures.

### 2026-09-16 — shared typography and the composition renderer boundary

The shared composition CSS now reads named type-role tokens instead of embedding
font sizes in each arrangement. The five AIAD27 themes supply a private scale
and map it to those roles. Adaptive cover sizes also resolve theme tokens; the
renderer chooses a length band rather than writing an unchangeable pixel size.
The previous unused `--cp-display` declaration was removed.

The composition renderer and its sizing pass moved to
`src/render/compositions.js`. It is bundled through the existing model entry
point and receives the browser's DOM, rich-text, step and standard text-layout
helpers. No extra script tag or second build entry point is needed. The main
renderer retains dispatch and chrome. This establishes a module boundary for
compositions; it is not a claim that the remaining 6,000-line renderer is fully
split.

`DEFAULT_THEME` and `resolveTheme` in the theme manifest now govern deck/game
factories, normalization, editor game creation and rendered roots. Missing or
retired names consistently use Studio. Explicitly saved themes, including
Midnight, remain unchanged. Game factories already used Studio; the earlier
Midnight normalization fallback was inconsistent with those factories.

Validation: computed text sizes match exactly before/after on all 78 AIAD27,
NUL and Motion Lab slides. All 423 tests, 436 composition/demo render checks,
184 manifest render checks and 45 campaign slide-fit checks pass. Browser checks
also verify that overriding a typography token changes the actual rendered size,
and that fallback theme artwork agrees with the fallback root. No blanket
visual-baseline update was made.

Remaining before canvas work: generalise the campaign fit/preview tools to the
platform and continue the broader renderer split where it has a concrete
boundary. Authored campaign poster images remain authored images; this pass
does not silently replace them with index-selected decoration.

### 2026-09-17 — platform review and fit checker completed

The review introduced before the pause now has a general command-line entry
point (`tools/check-fit.mjs`) for deck/bundle files and library lesson keys.
The campaign command is a compatibility wrapper. Both paths use the same
`SF.Review.check`; missing files and zero-slide inputs fail instead of reporting
an empty successful run.

The browser regression test exposed a measurement bug: the offscreen stage was
`aria-hidden`, and a `closest()` exclusion consequently skipped every text node.
The exclusion now applies only to hidden decoration *inside* the rendered slide.
A regression moves text beyond the left edge without increasing scroll width,
so this error cannot be masked by the separate scroll check.

Review detail now fits the viewport for the deck's aspect ratio. Thumbnail and
detail slide controls are inert, preventing nested slide buttons from taking
keyboard focus. Imports remain snapshots; hidden-slide selection and errors are
covered. `tests/slide-review.test.js` adds the browser workflow and 46 file/campaign
slides to `npm test`. The full suite passes 430 tests; the standalone campaign
wrapper passes all 45 slides, and NUL/Motion Lab pass all 33.

See `docs/slide-review.md` for usage and limits. This is an overflow check, not an
overlap/contrast/motion certification. The campaign's branded preview remains
available; general deck review lives in the editor's Look panel.

### 2026-09-17 — first named header and footer regions

Structured compositions now offer **Look → Header and footer → Named regions**.
This is opt-in: existing decks keep their authored placement. Six slots span
header/footer × left/centre/right; five named items can occupy them: theme
identity, logo, header context, closing text and page number. `chromeLayout`
and the five slot fields join the typed design catalogue (40 controls total).

`src/render/regions.js` owns slot resolution, swaps and the DOM arrangement.
Moving an item to an occupied slot swaps the two saved names. Invalid or
colliding imported names resolve deterministically without rewriting the input.
Unused settings stay dormant when changing composition or returning to Theme
placement. Logo and page-number visibility still follows existing deck rules.

AIAD's strand identity is declared in the theme manifest for this mode; its
legacy CSS label is suppressed only after the real identity node enters a slot.
The existing composition header and footer stay in document flow. Their slot
children own the mark and text, removing the corner-mark reservation in this
mode. Context used as an eyebrow, lane heading or body content stays there;
this feature does not duplicate or detach it from its composition.

Scope: the ten structured compositions, including campaign defaults and those
same compositions selected with UKBlackTech or other themes. Original UKBT
layouts and other unstructured layouts retain their existing arrangement.
There are no drag handles yet. This establishes the semantic values and shared
setter for the next canvas gesture; the Edit panel remains available alongside
existing double-click canvas text editing.

Validation: 431 tests pass, including real editor probes for all 40 design
controls. Named-region checks cover 98 campaign/UKBT slide-and-aspect cases
(16:9 and 4:3), occupied-slot swaps, serialization, disabled visibility, malformed
imports and legacy fallback. Additional checks move four visible furniture
items through all six slots and confirm the region containers do not overlap.
A moved-logo editor view was visually inspected. These checks do not guarantee
arbitrary imported content will fit; the shared review checker remains useful.

### 2026-09-17 — canvas gestures for named chrome regions

The editor now binds move handles to visible region items after rendering.
Hover over a header/footer item to reveal its handle; drag to one of six
labelled targets. The active target highlights and identifies any visible item
that will swap. Touch pointers use the same path. Only the named destination
is persisted; pointer coordinates never enter the deck.

Clicking a handle (or pressing Enter/Space on it) opens the same target chooser.
Arrow keys move focus, Enter/Space chooses and Escape cancels. Dropping outside
the targets cancels. A completed move uses the editor's normal history/save
path, supports Undo and restores focus to the moved item's handle. Cancelling
writes nothing. Handles and targets are bound only in the editor; shared
rendering, review, presenter and exports receive no interactive furniture.

This remains header/footer arrangement on structured compositions. Body content
keeps existing double-click editing and bullet reordering; body-region dragging
is separate work. The Edit panel remains available. NUL (`northeastern`) and
Studio (`studio`, currently labelled “Studio · Sage & ink”) share this capability
when using supported compositions, as do UKBT and the AIAD themes. There is no
separate theme key named Studio Hue in the current manifest.

Validation extends the region coverage to 126 AIAD/UKBT/NUL/Studio slide-and-aspect
checks. Browser interaction checks drag on the scaled canvas, swap an occupied
slot, Undo the move, choose a slot by keyboard, restore focus, cancel with Escape
and an outside drop, and verify clean shared rendering. The active snap-target
view was visually inspected.

### 2026-09-17 — canvas editing reverted

Split-layout gestures, the card canvas, the artwork layer stack and the
direct-manipulation handles are reverted. The decision was the complexity
they were adding against the value they returned: four new modules, four
smokes and a growing set of interaction rules stacked up over a day, on top of
a slide engine whose actual strength is that `slide.type` decides the layout.

Reverted with `git revert`, not a reset, so the work is in history and can be
brought back a piece at a time if a narrower version earns its place.

**Kept, because neither is canvas editing:**

- The shared slide review tool and fit checker (`Look → Review slides & check
  fit`), which measures rendered boxes rather than counting characters.
- Named chrome regions, and specifically the **corrected** coverage test. The
  revert would have restored the version that manufactured its own
  precondition — building a campaign deck, relabelling its theme and injecting
  the campaign's compositions before measuring — which is how NUL and UKBT
  came to be reported as region-capable. That file was pinned to its fixed
  state deliberately.

**The finding that survives the revert**, and is the more useful thing to keep
in mind than any of the gestures: measured across all 31 Library decks, region
coverage is 35/45 for the 2027 campaign and **0** for everything else — 0/252
NUL, 0/70 UKBT, 0/39 Studio. Structured compositions are the gate, and only
the campaign themes carry them. Any future canvas work aimed at the existing
decks has to answer that first, because a gesture nothing can reach is not a
feature.

Three tests went with the features they covered: `canvas-split`,
`canvas-cards`, `artwork` and `artwork-transform`. 432 tests pass.

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
