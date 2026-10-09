# Week 5 · Charts that answer back: lesson plan

A plan for the Week 5 lecture of LDSCI6253 Advanced Information Presentation & Visualisation, before anything is
built. It merges three sources:

- **The 2025 Week 5 deck** (`05_Lecture_IPDV_Interaction_Animation.pdf`, 22 pages, written for LDSCI5209 by
  Dimitris Mylonas): personas, Shneiderman's mantra, select, navigate, brush and link, query, and animation's pros
  and cons. Most of its slides are links out (Gapminder, NYT, OpenStreetMap, rome2rio, Our World in Data).
- **The 2025 maps deck** (`01_Lecture_IPDV_6.pptx`, 37 slides, titled "Week 6: Maps"): when to map, given
  spatial position, a decision tree, projections, choropleth design and map types.
- **Your Altair guides** (`Guides for info vis/alt_Interaction_Animation_guide.ipynb`, 60 cells, and
  `alt_Week5_Maps_guide.ipynb`, 32 cells). They give the code the lab uses: Altair 5.5, `selection_point`,
  `alt.when`, London boroughs.

The proposed lesson id is `ipdv-im`. Like Week 4 it is built by its own script (`tools/build-ipdv-week5.js`), in the
`northeastern` theme.

**Status:** built and split (9 Oct 2026): Week 5 (audience, interaction, animation; 75 slides) and Week 7 (maps; 39 slides), from one builder, `node tools/build-ipdv-week5.js`. See the change log.

---

## 1. The journey in one line

> Students walk in thinking **interaction and maps are features you switch on**. They walk out able to say, for any
> interactive chart they meet, **what the reader does, what the chart stores, what it tests and what changes**, and
> to build it in Altair.

**Why the lesson is shaped this way:** students said the examples weren't linked to how they're built: "how does that
work in Altair, and how do you actually build a tooltip?" So every technique runs the same three beats:

| Beat | What students see | Example (tooltip) |
|---|---|---|
| **See it** | A real, published chart doing it | Hovering a bubble on Gapminder shows "United Kingdom, 2005" |
| **Name the mechanics** | The guide's grammar as a four-box strip: **input → parameter → predicate → visual response** | Pointer over a mark → the row under it → (none) → a card with that row's fields |
| **Build it** | The Altair, one line lit at a time, then the same pattern in the guide | `tooltip=[alt.Tooltip('country:N'), alt.Tooltip('life_expect:Q', format='.1f')]` → Guide §3 |

Every "Build it" slide carries a footer saying where the same pattern is in the student's guide (for example
"Your guide §5 · Hover highlighting"). The lecture is the way into the lab rather than a separate story.

**The data spine is Rosling.** One dataset runs through the whole lecture: Gapminder (life expectancy, fertility,
population and region, by country and year), as in Hans Rosling's TED talk (2006) and *200 Countries, 200 Years,
4 Minutes* (BBC Four, *The Joy of Stats*, 2010). It gets a tooltip, then a selection, then motion, then a map. The
same file is in `vega_datasets` (`data.gapminder()`), so students can run every lecture snippet as written.

## 2. What carries over, so we don't repeat it

| Already taught | Where | Week 5 builds on it by… |
|---|---|---|
| Position is the strongest channel | Week 2 (marks and channels) | A map **spends position on geography**, so the data has to go into colour or size. That is why choropleths are hard |
| Munzner's What / Why / How and data abstraction | Week 3 | Geographic data is *given spatial position* (Munzner ch. 8); interaction is the *How* of manipulating views (ch. 11) |
| Sequential vs diverging maps, colour-vision-deficiency (CVD) checks, "lightness orders, hue doesn't" | Week 4, Part 6 *Map* and Part 8 *Check* | The choropleth section uses them without re-teaching. It adds class breaks, normalising and MAUP |
| Northeastern navy, red and warm white, so any other colour is data | Week 4 rule | Unchanged. Gapminder's four region colours are the only other colours on screen |

## 3. The student journey

### 3.1 Seven stops, one question each

| Stop | Min | The question they carry | See it (real world) | Build it (Altair) | Card earned |
|---|---|---|---|---|---|
| Hook | 0–5 | What would you ask this chart? | Rosling's bubbles, static and unlabelled: "Find the UK." Then 40 s of the BBC clip | — | — |
| ① Ask | 5–12 | Who is asking, and what for? | Personas; the mantra played out on Gapminder | The mechanics strip, introduced once | **Interaction answers the reader's question, not yours** |
| ② Point | 12–30 | What belongs in a tooltip? | Gapminder and Our World in Data hover cards | `tooltip=` in six steps (§5, V2) | **Show less and let them ask, but never hide the message** |
| ③ Pick | 30–44 | How do views talk to each other? | NYT campaign staff network (select), refugee-scholars dashboard (brush and link), rome2rio (query) | `selection_point`, `selection_interval`, `bind='legend'`, `transform_filter`, widgets | **One choice can light up every view** |
| ④ Move | 44–60 | When should a chart move? | Rosling again, now explained; German election tweening; FT animated map | `key=`, a frame `param`, the HTML player (Guide §18–19) | **Motion is seen first, so spend it on change** |
| ⑤ Place | 60–68 | Does geography add meaning? | Cases where the map *is* the story, and one where it isn't | `mark_geoshape` + `alt.topo_feature` | **A map spends your best channel on where** |
| ⑥ Flatten | 68–76 | What does the map lie about? | The orange peel; Greenland vs Africa | `.project(type='equalEarth')` vs `'mercator'` | **Every flat map is a distortion you choose** |
| ⑦ Fill | 76–86 | How do I colour a map honestly? | The "population map" trap; the same data with three class breaks | `transform_lookup`, `alt.Scale(type='quantile')`, tooltip on the map | **Map rates, not people** |
| Arriving | 86–90 | Can you read the mechanics of any chart now? | FT Milton map: students name every mechanic in it | Lab hook: Guide §15 and Maps guide §11 | All seven cards, read as one sentence |

### 3.2 The thread: follow one bubble

The hook asks students to find the UK among 200 unlabelled bubbles, and they can't. The UK then comes back at each
stop:

- **② Point:** a tooltip finds it.
- **③ Pick:** a click lights it in every view.
- **④ Move:** its key keeps it the same bubble through fifty years (object constancy).
- **⑤ Place:** the map puts it where students already know it is.
- **⑦ Fill:** the choropleth colours it by a rate, with a tooltip on the map.

By the end, one bubble has picked up every technique in the lecture.

### 3.3 Words arrive after the experience

| Stop | Experience first | Then the word |
|---|---|---|
| ① Ask | Failing to find the UK | details on demand, overview first, persona |
| ② Point | Hovering, and reading the card | tooltip, field type (`:N :O :Q :T`), format string, aggregate grain |
| ③ Pick | Clicking one view and watching another change | selection, parameter, predicate, brushing, linking, cross-filter, dynamic query |
| ④ Move | The keyed and unkeyed versions side by side | frame, tween, object constancy, staging, reduced motion |
| ⑤ Place | Finding London on a map vs in a table | given spatial position, geoshape, TopoJSON / GeoJSON |
| ⑥ Flatten | The orange peel | projection; conformal, equal-area, compromise |
| ⑦ Fill | Two maps of the same data that disagree | choropleth, normalise, class breaks (equal interval, quantile, natural breaks), MAUP, proportional symbol |

### 3.4 Learning outcomes

By the end, students can:

1. **Explain** Shneiderman's mantra and say which interaction answers which reader task.
2. **Decompose** any interactive chart into input → parameter → predicate → visual response.
3. **Build** a tooltip in Altair with chosen fields, types, titles and formats. Spot the two common bugs: an
   aggregate tooltip that splits bars, and missing values shown as blanks.
4. **Build** hover, click, legend and brush selections, and link them across views.
5. **Judge** when animation helps (presenting change) and when small multiples or a slider are better (analysis).
   Keep identity with `key=`.
6. **Decide** whether a map adds meaning, choose a projection by what it must preserve, and build a normalised,
   accessible choropleth with `mark_geoshape`.

## 4. Running order (90 minutes)

The slide count isn't capped. Expect 100+ in the teaching deck, cut to about 50 in the student copy.

### Hook (0–5)
- Title and reminder slides (fixed: §7).
- **Find the UK.** Gapminder 2005, 140-odd unlabelled grey bubbles. Hands up when you've found it.
- **40 s of Rosling** (BBC clip by YouTube URL). "What did he have that you didn't?" Take answers on the board.
  Three come up every time: *he could point, he could pick, it moved*. Those are stops ②, ③ and ④. *And it's the
  world* is stops ⑤–⑦.

### ① Ask (5–12)
- **Personas**, brief (from the 2025 deck and Guide §1). "A persona is a design hypothesis, not evidence."
- **The mantra on one dataset.** A bird's-eye view, then one zoom per stage: overview (all bubbles) → zoom (one
  region) → filter (one year) → details (one bubble's card).
- **The mechanics strip** (V1): four boxes, used on every Build-it slide from here on.

### ② Point · tooltips (12–30), the longest stop because it is the students' question
- **See it:** Gapminder and Our World in Data hover cards, full-screen with a red corner tag.
- **Name the mechanics:** *the row under the pointer* (V2). The data table sits behind the chart. Hovering a mark
  lights its row, and the tooltip prints that row's fields.
- **Build it in six steps**, one code line lit at a time, with the chart beside it changing:
  1. One field: `tooltip='country:N'`.
  2. A list with titles: `alt.Tooltip('country:N', title='Country')`.
  3. Type and format are separate choices: `:Q` + `format=',d'`, `'.1f'`, `'.1%'`. This uses the Guide §3.4 table.
  4. Fields that aren't on the chart: population in the card even though size already shows it.
  5. The shortcut and its cost: `mark_circle(tooltip=True)` shows every field, raw.
  6. Missing values: `transform_calculate` with `isValid(...)`, so the card says "not available" (Guide §3.5).
- **When it goes wrong:**
  - An aggregated bar with a `country` field in its tooltip splits into slivers (Guide §4).
  - The tooltip has nothing on touch screens or keyboard focus, and nothing in a PNG or print (Guide §17).
  - WCAG 1.4.13 (content on hover or focus) applies.
- **The rule:** if everyone needs it, label it; tooltips are for the detail some readers want.
- **Live demo:** a hotspot slide, where each press opens a tooltip card at the bubble (N1).

### ③ Pick · selection and linking (30–44)
Each pattern is a real case, its strip, its Altair, and a pointer to the guide section:

| Pattern | Real case | Altair | Guide |
|---|---|---|---|
| Hover highlight | NYT campaign staff network | `selection_point(on='pointerover', empty=False)` + `alt.when(...).then(...)` | §5 |
| Click to compare | Gapminder "select countries" | `selection_point(toggle=True)` | §6 |
| Legend as a control | OWID region filter | `selection_point(fields=['cluster'], bind='legend')` | §7 |
| Brush | refugee-scholars dashboard | `selection_interval()` | §8 |
| Link views | refugee-scholars dashboard | the same brush in `transform_filter(brush)` on a second chart | §9 |
| Dynamic query | rome2rio | `alt.param(bind=alt.binding_range(...))`, `binding_select` | §12 |
| Navigate | OpenStreetMap | `selection_interval(bind='scales')`, overview + detail | §11 |

- **The multi-part idea** (dim one part at a time, then all lit): selection is always *input → stored value →
  test → response*. Only the input changes.
- **Syntax note:** the 2025 code notebook uses `selection_single` and `alt.condition`. The slides use the guide's
  Altair 5.5 forms (`selection_point`, `alt.when`), and the speaker notes give the old form.

### ④ Move · animation (44–60)
- **Why motion is strong:** pre-attentive, perceived at about 10 frames a second, very sensitive in the periphery,
  and things that move together are seen as a group (the 2025 deck's motion-perception slide).
- **See it:** Rosling again, and now we say what he did. Then the German election tweening video, then a bar chart
  race.
- **Frames vs tweens** (V3): five frames (jumps) vs the same five years tweened.
- **Object constancy, live** (N2): one Gapminder chart animated twice, with and without a key. Without a key the
  bubbles swap identities mid-flight. "The UK became Bangladesh." With `key='country:N'`, they don't.
- **Animation vs small multiples** (V4), from Robertson et al. (2008): animation is enjoyed and good for
  *presenting*, but slower and less accurate for *analysis*. Trails or small multiples are better for that.
- **Accessibility:** offer pause and a static view, and respect `prefers-reduced-motion` (WCAG 2.3.3).
- **Build it** (Guide §18–19), and say plainly what Altair does and doesn't do:
  - Altair alone gives a **slider-driven state change**: `alt.param` + `transform_filter(alt.datum.year == frame)`
    + `key=`.
  - **Playback** needs the small JavaScript player in the guide, which calls `view.signal(...)` on a timer.
  - Students then see the guide's own `altair_frame_player.html` and `altair_smooth_player.html`, recorded as video
    (N4).
- **The pros and cons table** from the 2025 deck, used as the closing check: "which con did Rosling avoid, and
  how?"

### ⑤ Place · when is a map the answer? (60–68)
- **Bridge:** Gapminder's region legend *is* a little world map, so the world was there all along.
- **Maps excel at / struggle with** (maps deck slide 10), with the question "Does geography add meaning or just
  decoration?"
- **Given spatial position** (Munzner): cities and weather have it; company HQs often don't.
- **The decision tree** as a four-step build (Q1–Q4), then two cases run through it.
- **Position is spent:** the Week 2 callback. With the map using x and y for where, the value goes to colour or
  size.
- **Build it:** `alt.topo_feature(data.world_110m.url, 'countries')` + `mark_geoshape()`. One line gives a world.

### ⑥ Flatten · projections (68–76)
- **The orange peel:** you can't flatten a sphere without tearing or stretching it.
- **Mercator ↔ Equal Earth, live** (`beforeafter`, drag to compare): Greenland shrinks from Africa's size to
  one-fourteenth of it.
- **What each preserves:** a 2×2 grid, then one zoom per box (conformal, equal-area, equidistant, compromise).
  "Use for" appears on each.
- **Build it:** `.project(type='mercator')` vs `'equalEarth'`, the one change shown side by side.
- **Rule:** never Mercator for statistics.

### ⑦ Fill · choropleths and map types (76–86)
- **The population-map trap** (V6): raw counts mostly show where people live. Mapping per person changes the
  story.
- **Same data, three class breaks** (V7): equal interval, quantile and natural breaks. Students vote on which
  country "looks worst", and the answer changes with the breaks.
- **MAUP,** in one slide: the same points give different patterns depending on the boundaries.
- **Colour:** a Week 4 callback, sequential or diverging plus the CVD check, in one slide.
- **Build it:** `transform_lookup` joins the Gapminder values onto the countries by ISO code, then
  `alt.Color(..., scale=alt.Scale(type='quantile', scheme='blues'))`. Then the tooltip from stop ② comes back on the
  map, so the thread closes.
- **Map types** (V8): choropleth, proportional symbol, dot density and flow. A bird's-eye view, then one zoom per
  box: what each shows and its Altair mark (`mark_geoshape`, `mark_circle` with `longitude`/`latitude`, and
  `mark_rule`/`mark_line` for flows).
- **Lab bridge:** "You'll do this with London boroughs" (Maps guide §2–§10: joining by GSS code, finding
  mismatches, the dropdown).

### Arriving (86–90)
- **FT Milton animated map, played once.** Then students name its mechanics: what moves, what you can point at,
  what's encoded, and which projection.
- **Seven cards** on the route slide.
- **Lab hook:** Guide §15 (the five-chart infographic), and Guide §16's four challenges.

## 5. Breaking the hard ideas down visually

| V | Idea | Visual |
|---|---|---|
| V1 | The mechanics strip | Four boxes, input → parameter → predicate → response. Each box lights in turn, and the strip is reused on every Build-it slide with that case's words filled in |
| V2 | The row under the pointer | Chart on the left, data table on the right. One bubble lit, its row lit, and a line from the row to the tooltip card |
| V3 | Frames vs tweens | The same five years twice: five jumps, then a smooth path with ghost trails |
| V4 | Animation vs small multiples | One animated chart beside five small panels, with the task: "Which country changed most?" |
| V5 | Projections | Orange peel → Mercator ↔ Equal Earth → Greenland vs Africa at true size → the 2×2 of what each preserves |
| V6 | Counts vs rates | Two world maps side by side, total population and life expectancy, with the same colour ramp |
| V7 | Three class breaks | One dataset, three maps, with each one's legend breaks drawn as a number line beneath |
| V8 | Map-type chooser | A 2×2 grid, then one zoom per box, each with its Altair mark |

All are drawn in navy, red and warm white, so the only other colours are data. Most are now **live scenes** (§5A)
rather than still pictures.

## 5A. Set pieces: the lecture practises what it teaches

A lecture about interaction shouldn't be a stack of screenshots. This one leaves the default layouts behind where
they get in the way. Its key moments are **live scenes**: purpose-built canvases with real hover, dragging, playback
and morphing, presented on the projector (§6.2). Two looks alternate, so students can feel the rhythm:

- **The stage** (deep navy, full-bleed, no title bar) is where something live happens. Data colours glow on it.
- **The page** (warm white, editorial type, generous margins) is where ideas are named and code is read.

| # | Set piece | Stop | What happens on the projector |
|---|---|---|---|
| S1 | **Find the UK** | Hook | 140-odd grey bubbles on the stage, and a clock counting up in the corner. Hands up when found. Nobody finds it. Press: a pointer glides in, and *one* hover answers it, with a card in Vega's own tooltip style. The clock stops |
| S2 | **The X-ray** | every See-it | A published chart full-screen (red corner tag). Press: a navy X-ray sweeps across it and leaves the mechanics strip drawn over the real interface, so you see *what the reader does* and *what the chart stores* on the actual product |
| S3 | **Tooltip, exploded** | ② | One tooltip card blown up to fill the slide, drawn like an engineering diagram. Dimension lines run from each row to the `alt.Tooltip(...)` that made it, and from each title and format string to the text it produced |
| S4 | **The row under the pointer** | ② | Chart left, the data table right. The presenter really hovers, and the lit row follows the pointer live. The card is visibly *copied* out of the table |
| S5 | **Code ↔ chart**, the signature format | ② ③ ④ ⑦ | Code on the page side, live chart on the stage side, the mechanics strip along the bottom. Each press lights one more line of Altair. The chart changes to match, and the strip box that line belongs to lights. It's used for every Build-it, so students learn to read it |
| S6 | **Spot the bug** | ② ③ | A Code ↔ chart with a planted bug: the sliver bars from an aggregate tooltip, or `empty=True` lighting everything at start. The room finds the line. Press: the fix, and the chart heals |
| S7 | **Be the brush** | ③ | Scatter, world map and bar chart, all live. The presenter (or a volunteer) drags a brush across the scatter, and the map and bars answer as it moves. Then a click on the legend |
| S8 | **The UK became Bangladesh** | ④ | Fifty years of Rosling played twice side by side: without `key=` (rows arrive sorted by population, so the UK's mark becomes Bangladesh in 1965, Pakistan in 1980, Japan in 2000 and Nigeria in 2005; its red trail leaps across the chart) and with it (the trail flows). Scrub with a slider, or play |
| S9 | **Peel the orange** | ⑥ | A globe outline unwraps into a flat world. Then the world **morphs live** Mercator → Equal Earth → Robinson, every coastline moving vertex by vertex, with a slider between projections |
| S10 | **Drag Greenland** | ⑥ | On the Mercator stage, the presenter drags Greenland south. It shrinks as it goes, and parks beside Africa at its true size: one-fourteenth |
| S11 | **Break it three ways** | ⑦ | One choropleth with a three-way switch: equal interval, quantile, natural breaks. Countries recolour in place, and the legend's break ticks slide along a number line beneath. "Which country looks worst?" changes before their eyes |
| S12 | **Counts, then rates** | ⑦ | A population map that is really a map of where people live, then a flip to a per-person measure, and the story changes |
| S13 | **Bubbles fly home**, the finale | Arriving | Rosling's scatter, and then every bubble flies from its chart position to its country on the world map. That is object constancy across two idioms, keyed by country. Then play the years *on the map*, hover one country, and the UK's card appears for the last time |
| S14 | **The route as a world** | route slides | The seven stops as a voyage drawn across an Equal Earth outline. Each finished stop is pinned with its card |

Pages between the scenes stay quiet: one idea, big type, and plenty of room. Case pictures stay full-screen with
the small red corner tag. Multi-part ideas still dim one part at a time, then all light.

## 6. Build plan

### 6.1 What SlideForge can and can't do here (checked 9 Oct 2026)

- **There are no hover tooltips.** The `explore` slide zooms to a hotspot and shows its text in a caption *under*
  the image, not at the point (`src/render/explore.js:166-178`).
- **There are no live HTML pages or Vega charts.** The only iframe is the YouTube/Vimeo player
  (`js/render.js:1318-1351`), so Altair HTML exports can't be embedded. They're recorded as video instead.
- **There is no map drawing.** Nothing in `src/`, `lab/src` or `node_modules` does projections or TopoJSON. The
  Spatial chart family is listed as missing (`src/model.js:168-172`).
- **What exists and fits:**
  - `experiment` steps between states with animated transitions (`src/render/experiments.js:211-231`).
  - `beforeafter` gives a drag-to-compare slider.
  - `gallery` reveals layers one at a time.
  - `journey` works for route slides.
  - `video` plays local MP4s and YouTube.

### 6.2 New work

| N | What | Where | Why |
|---|---|---|---|
| N1 | **A `scene` slide type: live figures.** It hooks in the way `explore` does (installed in `src/model.js`, rendered after the layout at `js/render.js:2464`, run state on the player, Next/Prev step it). A slide names a scene and its data: `{type:'scene', scene:'brush', sceneData:{…}, steps:[…]}`. It draws with plain SVG and DOM: real pointer hover and drag, play/scrub and keyboard steps. Animation respects `prefers-reduced-motion` (it jumps to the end state) | `src/render/scenes/` (one file per scene family: `bubbles`, `codechart`, `brush`, `worldmap`, `tooltip`), `src/deck/content.js` declaration, `npm run build` | Every set piece in §5A is one of these. Live hover and motion are the point of the lecture |
| N2 | **Fallbacks for everything that can't run a scene:** the student export, PDF, the lab app and thumbnails get a still of each scene's final state, made by the builder and stored on the slide (`image`) | builder + the scene's `still()` | The student copy and the lab must still make sense |
| N3 | **Map data prepared at build time:** d3-geo projects world-110m once per projection *with the same vertex order*, so the scene morphs between them by interpolating points. Greenland's raw lon/lat travels with the slide, so dragging it applies the Mercator scale factor live. The browser needs no map library | `tools/build-ipdv-week5.js`, dev-only `d3-geo`, `d3-geo-projection`, `topojson-client`, `vega-datasets` | No map code exists, and nothing new ships to the browser |
| N4 | **Screen recordings** of the guide's `altair_frame_player.html`, `altair_smooth_player.html` and the five-chart infographic, made with Playwright like the Week 4 video | `tools/` (reusing `tools/video-which-chart/render.mjs`) | Students see the thing they'll build, in motion |
| N5 | **Code ↔ chart steps** (S5/S6) live in the `codechart` scene: each step lists the lines lit, the chart state and the strip box. The code is the real Altair, syntax-coloured like the existing `code` slide | `src/render/scenes/codechart.js` | The students' question, answered on one slide |
| N6 | **A shared IPDV helper module:** lift `svgOpen`, `heading`, `dimmed`, `taggedPhoto`, `wrapText`, the zoom pattern and `studentCopy` out of the Week 4 builder | `tools/ipdv-kit.js`; Week 4 then requires it | So the two builders aren't copies. Week 4's output must stay byte-identical (check with a diff) |

### 6.3 Outputs (same as Week 4)
- `lessons/05_Lecture_IPDV_Interaction_Maps.sfbundle.json`, and `_STUDENT` (built with `STUDENT_RULES`).
- `js/lessons-ipdv-week5.js` with keys `ipdv-im-w5` / `ipdv-im-w5-student`, seeded into the `nul` folder and
  loaded by `index.html` after `js/lessons-ipdv-week4.js`.
- Assets in `assets/lesson/ipdv/week5/`.
- `docs/ipdv-week5-slide-list.md`, one line per slide.
- `INTERACTIVE = false` (live in-slide demos only; no phone games or polls), as decided on 9 Oct.

### 6.4 Order of work
1. N6 (the helper module), checked with the Week 4 byte diff.
2. N3 data: Gapminder + world-110m, projected, with the ISO join checked country by country.
3. **N1 scene engine with one scene end to end** (S1 *Find the UK*), presented in the browser pane, before anything
   else is built on it. Run `git status src/` before `npm run build`.
4. The remaining scenes in story order: `codechart` (S5, S6), `tooltip` (S3, S4), `brush` (S7), `bubbles` (S8, S13),
   `worldmap` (S9–S12, S14). Each is checked live on the projector size and at phone width.
5. Slides in tens, in the running order, each batch rendered and checked.
6. N2 stills, then N4 recordings.
7. Student copy, slide list, and tests: `tests/scenes.test.js` (every scene renders its steps and its still) and
   `tests/week5.test.js` (slide count, each Build-it slide has a guide footer, no `foreignObject`, no bare `&` in
   SVG).

## 7. Corrections to carry over from the source decks
Each fix is recorded in the slide's speaker notes.

1. The maps deck says "Week 6" and "Lecture 6" on every slide.
2. Slide 6 says "Analysis Farmwork"; it should be "Framework".
3. Slide 3's "Lesson Recap" lists interaction goals (navigate, drill down, switch perspective), not what last week
   covered. It becomes a real Week 4 recap.
4. Slide 26 (Google road map vs satellite, the "white lies" passage, from Monmonier's *How to Lie with Maps*) is
   about **symbolisation**, but it sits under "The Projection Problem". It moves to ⑦.
5. Slide 33 (performance and data formats) sits under "Choropleth Design Principles". It moves to ⑤ as "what a
   map file is".
6. Slides 30 and 31 are duplicates.
7. **The hand-in dates clash:** the decks say "Canvas by the Friday after the lab at midday", but
   `05_Lab_IPDV_Interaction_Animation-1.ipynb` says "the Monday after the lab at 23:59". This needs your call (D5).
8. The interaction PDF carries LDSCI5209 and Dimitris's name. Credit him for anything reused.
9. The reading slide's Munzner section numbers ("6.6–6.8") will be checked against the book in the materials
   folder before the slide is written.
10. `05_Code_IPDV_Interaction_Animation.ipynb` uses `selection_single` / `alt.condition`. The slides use Altair 5.5
    syntax, to match the guide.

## 8. Cautions
- **Copyright of case media:** the FT, NYT and German election videos are third-party. They're used for teaching
  with credit. The student copy links rather than embeds where unsure.
- **Gapminder data** is CC BY 4.0 (credit "Free data from Gapminder.org"). Natural Earth (world-110m) is public
  domain.
- The guide's interaction data is **synthetic**, and it says so. The lecture's real data comes from Gapminder, so
  the two never get mixed on one slide.
- `vega_datasets` gapminder runs 1955–2005 in five-year steps. Say "to 2005" on every chart.

## 9. Decisions before building

| # | Decision | Recommendation |
|---|---|---|
| D1 | The Build-it code: re-code each technique on **Gapminder** (the chart students just saw), or show the guide's **London** code verbatim? | **Gapminder on the slide, with a footer pointing to the guide section.** The real example becomes the code, which answers the students' complaint directly. The guide then repeats the pattern on London in the lab |
| D2 | Install the dev-only map packages (`d3-geo`, `d3-geo-projection`, `topojson-client`, `vega-datasets`) from npm? | Yes. They're build-time only |
| D3 | The `scene` slide type (N1) is new shared code in `src/`. It's a real feature, reusable in later weeks (networks, trees) | Build it. Given creative freedom, it's what makes the set pieces possible |
| D4 | Rosling clip: YouTube embed (BBC's upload) or link only? | Embed by URL, `videoStart`/`videoEnd` to about 40 s |
| D5 | Hand-in: Friday midday or Monday 23:59? | Your call |
| D6 | Add a BACKLOG row for `ipdv-im`? | Yes, once approved. `docs/BACKLOG.md` has another session's uncommitted edits, so it wasn't touched here |

## 10. References (to be checked before they go on slides)

- Bostock, M. (2012). *Object Constancy*. bost.ocks.org.
- Heer, J., & Robertson, G. (2007). Animated transitions in statistical data graphics. *IEEE TVCG*, 13(6).
- Monmonier, M. (1991). *How to Lie with Maps*. University of Chicago Press.
- Munzner, T. (2014). *Visualization Analysis and Design*, ch. 6, 8, 11–13. CRC Press.
- Openshaw, S. (1984). *The Modifiable Areal Unit Problem*. Geo Books.
- Robertson, G., Fernandez, R., Fisher, D., Lee, B., & Stasko, J. (2008). Effectiveness of animation in trend
  visualization. *IEEE TVCG*, 14(6).
- Rosling, H. (2006). *The best stats you've ever seen*. TED. Rosling, H. (2010). *200 Countries, 200 Years,
  4 Minutes*. BBC Four, *The Joy of Stats*.
- Šavrič, B., Patterson, T., & Jenny, B. (2019). The Equal Earth map projection. *IJGIS*, 33(3).
- Shneiderman, B. (1996). The eyes have it: a task by data type taxonomy for information visualizations.
  *IEEE Symposium on Visual Languages*.
- Snyder, J. P. (1987). *Map Projections: A Working Manual*. USGS.
- Tversky, B., Morrison, J. B., & Bétrancourt, M. (2002). Animation: can it facilitate? *IJHCS*, 57(4).
- W3C (2018). WCAG 2.1: 1.4.13 Content on Hover or Focus; 2.3.3 Animation from Interactions.

## Change log

- **9 Oct 2026 (later):** Split, at the user's request: Week 5 is **target audience, interaction and animation**; maps are their own lecture, **Week 7 · Where in the world? Maps** (Week 6 is reading week).
  - **Week 5** (`ipdv-ia-w5`, 75 slides) adds the 2025 Week 5 deck (`01_Lecture_IPDV_5 [Auto-saved].pptx`):
    - the static/animated starter, and Why–Persona–Why with when personas help or mislead;
    - a persona activity (Lab Task 1);
    - the seven interaction techniques (credited to Yi et al. 2007, not VAD 6.6–6.8 as the deck had it);
    - the Flourish gifs for selection, transitions, morphing, scrollytelling and the bar chart race;
    - the Observable "which is easier to follow?" pair, the design choices, and the `bar_chart_race` demo.
  - It ends on the bubbles flying home as a teaser for Week 7.
  - **Week 7** (`ipdv-maps-w7`, 39 slides) is stops ⑤–⑦ with its own opening (reading, route, a real recap, outcomes, the bubbles flying home as the hook) and close (the Milton map, three takeaways, the maps lab).
  - **The route slide** now runs Weeks 1–7 and ends on **the final piece**, the five-chart infographic, each panel tagged with the week it came from. The real infographic follows it.
  - **New keys:** so no browser keeps a stale copy. The bundles are `lessons/05_Lecture_IPDV_Interaction_Animation*.sfbundle.json` and `lessons/07_Lecture_IPDV_Maps*.sfbundle.json`; the built-in lessons are `js/lessons-ipdv-week5.js` and `js/lessons-ipdv-week7.js`.

- **9 Oct 2026:** Built, the whole 90 minutes: 85 slides (70 in the student copy), 17 live figures.
  - **Engine:** a `figure` slide type in `src/render/figures/`, with seven figures: `bubbles`, `codechart`, `rowtable`, `linked`, `motion` and `worldmap`, on a shared kit (`kit.js`, `plots.js`). The Lesson studio cannot build the type, so it plays it as SlideForge's own slide inside the same show. Clicks on a figure stay with the figure; Next stays on the keys.
  - **Builder:** `tools/build-ipdv-week5.js`, with `tools/ipdv-week5/` holding the data (`data.js`, `iso.js`, `world.js`), the figure data (`figures.js`), the drawings (`journey.js`, `drawings.js`) and the slides (`lesson.js`).
  - **Map data:** the world is projected three ways at build time into `assets/lesson/ipdv/week5/world-110m.json` (450 KB). Greenland is rotated across the globe when dragged, not slid, so its true size is honest.
  - **Additions after the plan:**
    - *Five weeks, one chart at a time*, the course so far from the code and the picture, built week by week like Week 4's pipeline (the user's request).
    - *A tooltip is the row under the pointer*, *Spot the bug* and *Be the brush*.
    - S8 is now *The UK became Bangladesh*: population-ordered rows make the swaps large enough to see.
  - **Left out for now:** S2, the X-ray over live published charts. It needs screenshots of third-party sites, so the "See it" cases are live links instead, opened in class.
  - **Caught on the way:**
    - Chrome painted unchanged SVG text at its pre-scale size; the figure host now rewrites the text once the slide has settled.
    - An attribute given twice blanked a whole picture; the builder now refuses duplicates.

- **9 Oct 2026:** Creative freedom given ("we are not fixed to using default layouts"). Added §5A: fourteen set
  pieces on two alternating looks (the navy stage for live moments, the warm-white page for ideas and code). The
  `explore` tooltip tweak and the `bubbles` experiment kind are replaced by one new `scene` slide type, with real
  hover, drag, playback and projection morphing, plus stills for exports. The finale flies Rosling's bubbles onto the
  world map.

- **9 Oct 2026:** First plan, from the 2025 Week 5 interaction deck, the maps deck and the two Altair guides. One
  merged 90-minute lecture with world data (Rosling / Gapminder) and live in-slide demos (no phone games). Students
  said real-world examples weren't linked to how they're built, so every technique runs See it → Name the
  mechanics → Build it, and each Build-it slide points to the matching guide section.
