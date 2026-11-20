# From first visit to a great deck: a ten-part review

20 November 2026. Ten read-only reviewers each took one stage of the journey, from a
new user opening the tool to delivering a finished presentation. The key claims were
checked against the source (marked ✓). Nothing was changed in the code.

The three suspicions going in:

1. **Developers hand-code features into particular decks that a non-technical user
   can't reproduce.** Confirmed. The polish lives in builder scripts and in
   importer-only slide builders, not in anything a user can pick.
2. **The default slides need unifying.** Confirmed. There are about 60 slide builders
   in three design families. Titles sit in four positions, type comes in 30 distinct
   sizes, and there are three different minimum sizes.
3. **The app makes too many slides and leaves default options unused.** Confirmed,
   for specific causes. Nothing auto-splits a slide. Slides multiply because builds
   are made by copying a slide per click, and because every quiz answer gets its own
   slide. Most built features never reach a default.

---

## 1. The core finding: three tiers of capability

| Tier | What it can reach | Who uses it |
|---|---|---|
| Builder scripts (`tools/build-*.js`, `tools/power-of-ai-fresh/deck.ts`) | Everything: pixel boxes, SVG posters, glyph tables, mesh grounds, stickers | Developers only |
| Importer-only builders (`layouts/keynote.ts`, `reveal.ts`, `rich.ts` code and closer, `themeArt.ts`, about 27 builders) | Keynote cards, tiles and before/after rows, reveal lists, the code slide, brand art | Only decks converted from SlideForge |
| Studio Gallery (33 layouts ✓) and lesson file (16 layouts ✓) | Plain bullets, cards, stats and a split picture, with no builds, charts, diagrams, video or code | Teachers |

Measured evidence:

- **No flagship builder writes a lesson file or uses a studio layout.**
  - Week 4 is 85 image slides out of about 109, made from 47 hand-made SVG templates
    with the words baked in.
  - `power-of-ai-fresh/deck.ts` is 1,059 lines with 176 hand-placed pixel boxes.
  - In the football and Premier League decks, about half the slides are pictures with
    no editable text. AGENTS.md already counts this as a bug.
- **Some fields only work for one deck.** `design.keynote` and `design.kicker` are set
  only by `build-ai-sme-productivity.js`. The AiAd27 compositions switch on only for
  theme ids that start with `aiad27`.
- **The studio's own built-in decks are fine.** nulDeck, ukbtDeck, teachingRoutine and
  motionLab are built from catalogue layouts. The pattern to copy is the 12 story
  designs: a `slide.recipe` plus a form, which rebuilds the slide in the current theme.

## 2. Ranked findings

### P0: fix first

| # | Finding | Evidence |
|---|---|---|
| 1 | **First run is a blank "Untitled" slide whose only layer is "Ground".** There is no prompt and no starter, and the left panel opens on Layers. | `app/App.tsx:62-67`, `core/defaults.ts:220-237` |
| 2 | **The 52 "templates" are personal course decks.** They include LDSCI weeks, "(student copy)" twins, "earlier version" duplicates and brand packs. There are no thumbnails and no neutral starters. | `js/builtins.js:115-133` |
| 3 | **A slide's layout can't be changed.** A layout only ever adds a new slide. ✓ | `layoutFor` is called only from `LeftPanel.tsx:138` and `Gallery.tsx:55` |
| 4 | **The lesson file covers 16 of 33 layouts** ✓ and has no builds, charts, diagrams, video, code, brand themes, logo or slide numbers. An unknown theme quietly becomes Paper. | `decks/lessonFormat.ts:53-70`, `fromLesson.ts:89` |
| 5 | **There is no in-app "write a lesson with AI".** `js/ai.js` writes only games and activities. The prompt for an outside AI is in a repo doc the app never links to. | `js/ai.js:1720-1735`, `js/shell.js:1362` |
| 6 | **Text can shrink to 25% of its set size** ✓, despite the 36px (18pt) floor. The warning fires only below 24px ✓, so text at 24–35px passes silently. | `engine/raster.ts:210,229-231`, `designs/designCheck.ts:13` |
| 7 | **Brand accent colours used as text fail contrast**, at 1.1–2.5:1. Examples: AiAd27 on cream, NUL gold on paper, the Youth Charter highlighter. | `theme/guide.ts:61`, `theme/palettes.ts:232-237` |
| 8 | **One `hidden` flag controls the show, both handouts, the viewer and the exports.** ✓ So trimming a deck for students hides those slides from your own show, which is why builders write separate `-student` duplicate decks. | `export/handout.ts:15`, `tools/build-ipdv-week5.js:160-190` |

### P1: next

| # | Finding | Evidence |
|---|---|---|
| 9 | **Every quiz question becomes two slides** ✓ (the question, then an answer slide). That is about 50 answer slides in shipped decks. | `designs/engage/games.ts:564` |
| 10 | **Picture builds are made by copying the slide.** About 60 slides could be about 17 stepped slides. Only 11% of slides use any build at all. | `tools/build-ipdv-week4.js:1742,1892` |
| 11 | **Items past a layout's cap are silently dropped.** Cards stop at 4, and points and keywords at 6, through 26 `slice(0, N)` calls. | `layouts/system.ts:38,61,93` |
| 12 | **The best big-type slides (keynote cards, tiles, before/after rows) can't be picked anywhere.** | `layouts/keynote.ts:32,63,110` |
| 13 | **Brand material sits in generic menus.** "Structures · from AI Awareness Day 2027" appears in every deck, the 9 campaign palettes come first in the picker, and the UKBT and NUL packs are under File → New. | `LeftPanel.tsx:97-99,145`, `palettes.ts:266`, `TopBar.tsx:62-64` |
| 14 | **Theme art (skyline, waves, badges) works only for 5 brands** and is applied only by the importer. Generic themes get no decoration. | `theme/themeArt.ts:355`, `fromSlideForge.ts:582` |
| 15 | **The layouts are inconsistent.** "Image + text" puts the picture on the right ✓. There are six near-duplicate pairs, titles at four y positions, 13 sizes below the floor, and hard-coded hex colours and fonts. | `catalogue.ts:78-84`, `blocks.ts:84`, `system.ts:271` |
| 16 | **Changing the theme guesses colour roles by saturation.** Code loses its mono font. In Spot the fake, "Real" and "AI" can end up the same colour. | `layouts/applyTheme.ts:36-70` |
| 17 | **Bold, italic and colour apply to the whole text box** ✓, never to one word. | `ui/controls/FormatBar.tsx:13` |
| 18 | **The design checks are hidden below five panel sections.** Thumbnail badges ignore them, and nothing checks for text running off the slide. | `ui/panels/inspectorSlide.tsx:103-115`, `Filmstrip.tsx:174` |
| 19 | **Avenir Next, Iowan and Impact are never loaded.** They fall back to other faces on Windows and Chromebooks. | `layouts/style.ts:69`, `lab/index.html:10` |
| 20 | **The presenter can't see build position** (how many reveals are left), and teacher-handout notes are cut off at 36mm ✓. | `presenter/protocol.ts:62-84`, `export/handout.ts:48` |
| 21 | **"See the demo" opens the 97-slide layout bank**, not a model lesson. | `index.html:129`, `js/studio.js:31-39` |

### P2–P3: worth doing

- **Unused capability.** In 1,454 shipped slides:
  - Effects: 20 of 22 are never used.
  - Transitions: 11 of 13 are never used.
  - Text-unit entrances (letters, words, scramble, count), exits and loops: never used.
  - Diagrams: 0.
  - Charts: 35, of which 20 are in the layout bank.
- **Jargon in the editor:** Layers, Ground, Source, Blend, Easing (with "Quint out" and "ζ 0.8"), the "C1" step codes, slideLeft and zoomIn, and a simulation's "a" and "b". Renames are in section 4.
- **Exports are pictures.** PPTX and PDF are pictures, with editable PPTX text only for plain text boxes. Builds and flip backs are lost, and fonts aren't embedded.
- **Four ways to add a slide**, and none says how it differs from the others. The strip's "+" adds a blank slide.
- **Panels with too many entries.** Slide designs holds about 92 entries, 12 of them variants of one chart experiment, and the AiAd27 compositions appear in two panels.
- **Studio layouts have no committed visual baselines.** `tools/check-fit.mjs`, `row-audit.mjs` and `stack-audit.mjs` are tied to the classic renderer or to particular decks.
- **Import errors are unhelpful.** Bad JSON gives only "That file is not valid JSON or Markdown", with no line number. That is the commonest way an AI-written file fails.

## 3. Recommended plan

**Wave 1 is built** (20 November 2026, branch `wave1-first-run`):
- the starter screen;
- the eight neutral starters (`lab/src/decks/starters.ts`);
- Change layout (`lab/src/layouts/relayout.ts`);
- the teacher-only flag (`Slide.audience`).

**Wave 2 is mostly built** (same branch):
- **One floor (item 5):** shrinking text stops at 36px. The design check warns under 36px and when text runs past its box.
- **One scale (item 5):** `lab/src/layouts/scale.ts`. Every layout's small labels are raised to the floor, and a test holds every gallery layout to it.
- **Readable themes (item 6):**
  - the five built-in themes have quiet and loud grounds (`lab/src/layouts/grounds.ts`), spread over lesson and starter decks;
  - accents used as words are deepened to read at 4.5:1;
  - every theme and palette is contrast-tested.

**Wave 3 is mostly built** (same branch):
- **Builds (item 8):** the lesson file's `build` field reveals items a click at a time. The `pictures` layout swaps a figure's steps in one frame.
- **More of the catalogue (item 11):** 13 more layouts in the lesson file. Palette ids work as `theme`.
- **Overflow (item 10):** a slide past its layout's cap carries on onto more slides instead of being refused.
- **AI route:** the starter screen's "Or have an AI write it" copies a prompt and builds the pasted reply. This was owed from Wave 1.

**Wave 4 is partly built** (same branch):
- the plain-language renames in section 4, most of them;
- design-check warnings on thumbnails, at the top of the slide panel and on the selected item, plus the overflow check from Wave 2;
- the presenter's build position;
- flip backs in PowerPoint.

Not done in Wave 4:
- **Bold or colour on selected words.** The text kind has no runs, so it needs a renderer change.
- **Opacity, Blend, X/Y and easing moved behind "More".**
- **Native tables and charts in PowerPoint, and kept shadow and glow.**
- **Default transitions by slide type, and word entrances on statements.** These are taste calls to make with you.
- **Committed visual baselines for studio layouts.** These need Docker.

Not done in Wave 3:
- **Quiz answers on the question's own slide (item 9).** That is the games' design, which belongs to the games session.
- **Rebuilding the Week 4, 5 and 7 picture runs with `pictures`.** Their builder scripts would each need rewriting.
- **Deck → lesson-file export (the round trip).**
- **Raising the layouts' own caps** (six cards in a 3 × 2 grid, eight keywords). These are in `system.ts`, which the other session is editing.
- **Logo and slide numbers in the lesson file.**

Not done in Wave 2:
- **The unified catalogue (item 7).** It waits for the other session's layout work in `catalogue.ts` and `system.ts`, so that the two don't rewrite the same files.
- **Brand theme art behind "Brand kits".** Also waiting on that work.
- **Web-served font stacks** for Avenir Next, Iowan Old Style and Impact.
- **Shipped lesson copies.** They keep their converted sizes until `CARRIED` is next raised; a fresh conversion takes the new sizes.

Not done in Wave 1, and carried forward:
- multi-select hide in the filmstrip, and a student-copy preview (the toast gives the count);
- the share link still carries teacher-only slides, because a follower's position goes by the slide's place;
- the `studentCopy` builders and `-student` decks are not yet retired.

**Wave 1: a first-time user can start well (P0).**

1. **Starter screen on an empty deck.** Offer three choices: pick a theme and title,
   start from a neutral starter, or start from a topic or outline (AI, with a
   **Copy prompt** fallback and a paste box). Fold Layers away by default.
2. **About 8 neutral starters** built only from studio layouts and themes, with
   thumbnails. Move the personal, course and brand decks behind "Examples", drop the
   duplicates and student copies, and point "See the demo" at a model lesson of about
   12 slides.
3. **Change layout** for the current slide, carrying its words across through the
   `blockRole`/`blockField` mapping. The strip's "+" opens the layout picker.
4. **An audience flag on each slide** (`show`, `student`, `teacher`), with multi-select
   hide and a "Student copy: 50 of 104" preview. This retires the `studentCopy`
   builders and the `-student` duplicate decks.

**Wave 2: unify the defaults.**

5. **One scale module.** The steps are hero 150, display 110, title 88, sub 56,
   body 48, label 40 and min 36, with footer chrome at 24 as the only exception.
   Raster, designCheck and the layouts all use one floor, and a test fails on any
   literal size in `lab/src/layouts`.
6. **One theme type.** Each ground (working, quiet, loud) carries ink, muted and
   accent, with `accentText` contrast-checked separately from `accentFill`. Add font
   stacks the web actually serves, plus positive, negative and code roles. Give the 5
   built-in themes all three grounds, and add a contrast test over every theme and
   palette.
7. **A unified catalogue of about 24 entries with variants.** Merge the Statement and
   Section variants, the two Quotes, points with keywords, Cards with Columns, and
   Stats with Stat panels. Fix the picture-side names. Use one title row everywhere.
   Promote keynote cards, tiles, before/after, reveal list, code, diagram, closer and
   video through the recipe pattern. Move brand compositions and theme art behind
   "Brand kits", and generalise their mechanisms (rail, motif, cover gradient) as
   options any theme can use.

**Wave 3: say more per slide, not more slides.**

8. **Builds in the lesson file.** Add `"build": "click" | "dim" | "spot"` on cards,
   keywords, stats, timeline and icons, plus a picture-steps layout using
   `step.mode: 'swap'`. Rebuild the Week 4, 5 and 7 picture runs with it (60 slides
   become about 17, with their words as layers).
9. **The quiz answer on the question's own slide**, as a build step. Keep "walls" as an
   option.
10. **Overflow becomes a choice, not a cut.** Warn when a layout's cap is reached, and
    offer two rows, steps or a second slide. Raise the cards cap to 6 and keywords
    to 8.
11. **The lesson file reaches the full catalogue.** Generate `LESSON_LAYOUTS` from
    `catalogue.ts`. Add charts and diagrams, brand theme ids, `logo` and
    `slideNumbers`, and a deck → lesson-file export so a deck can round-trip
    through an AI.

**Wave 4: polish.**

- **Plain-language editor:** apply the renames in section 4, and move Opacity, Blend,
  X/Y and easing behind "More". Allow bold and colour on selected words.
- **Design-check warnings where you edit:** on the selected item and as thumbnail
  badges, plus an overflow check.
- **Presenter and exports:** build position in the presenter, notes that are never
  clipped, back faces in PPTX, and native tables and charts in PPTX.
- **Defaults that use what's built:** vary the default transition by slide type, use
  text-unit entrances on statements, and commit studio visual baselines.

## 4. Plain-language renames

| Now | Plain |
|---|---|
| Layers · slide N | On this slide |
| Source (heading for a selected item) | Text / Picture |
| Ground · working / quiet / loud | Background · light / soft / bold |
| Blend | Mix with what's behind (Advanced) |
| Easing · Quint out | Feel · Smooth / Snappy / Bouncy |
| Start: With previous / After previous / On click | Appears: with the slide / after the last item / when I click |
| Build on Next / Build the set | Reveal one at a time |
| Sequence · C1 | Click order · click 1 |
| Tracking | Letter spacing |
| Choreography / Plan | Word timing |
| Structures · from AI Awareness Day 2027 | (remove from generic decks) |

## 5. Not verified

The reviewers read code; nobody opened the app in a browser.

- **Inferred from code, not seen on screen:** the theme-change colour clashes (#16) and
  the per-slide size drift from `fit: 'fill'`.
- **Not run:** "Six sizes" designCheck firing on defaults.
- **Measured with node scripts:** the 52-template count and the 97-slide demo.
- **Spot-checked against source:** the shrink floor, the 24px warning, the lesson
  layout count, the picture-side names, paired quiz slides, the shared `hidden` flag,
  the notes clip, the two-item New menu, "change layout" missing, and whole-box
  formatting.
