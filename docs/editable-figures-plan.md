# Every word editable: live figures in the Lesson studio: plan

Status: built, 11 November 2026 (parts 1–3, and drawn pictures). Not committed yet. Section 6 says what was built and how it differs from the plan.

## 1. The bug

A teacher opens Week 9 in the Lesson studio, clicks "What makes it a story", and can't change a word. The
slide is one picture.

That slide is a **live figure** (`src/figures/`): drawn by SlideForge's figure code from the lesson's data,
stepped by Next, hovered by the room. The converter (`lab/src/decks/fromSlideForge.ts`, `case 'figure'`) brings
each one into the studio as a **stand-in**: a picture of its last step. The show swaps the live figure back in,
so presenting works, but in the editor there is only the picture. The real words sit in `slide.figure` (kept
since converter version 15), and nothing in the studio edits them.

How far it reaches (slides per lesson, one copy each):

| Lesson | Live-figure slides | Kinds |
|---|---|---|
| IPDV Week 5 | 11 | bubbles, codechart, linked, motion, rowtable, worldmap |
| IPDV Week 7 | 7 | worldmap |
| IPDV Week 8 | 23 | network, panels, reveal, bridges, tree |
| IPDV Week 9 | 21 | story, reveal, panels |
| Youth charter | 7 | stadium |

About 69 slides in five lessons, in 14 figure kinds. Every student copy has the same problem.

It is also a **guidance** bug. AGENTS.md says the studio is the main app, but nothing says a slide's words
must be editable there. So the IPDV builders put words inside figures and drawn SVGs. Week 9 did too.

## 2. The fix, in three parts

### Part 1. Every figure's words editable, in every lesson (first)

One change in the studio covers all 14 kinds, with no per-kind code:

- **The stage draws the live figure itself**, not its stand-in, using `Figures.render` as the show does
  (`lab/src/show/FigureLayer.tsx`). It is drawn still, at the step chosen in the inspector, so the editor shows
  what the room will see.
- **A Figure tab in the Inspector** lists every word of the figure, grouped by step:
  - the title, the eyebrow, the alt text and the credit;
  - each step's caption and explanation;
  - each row's name, words and tag (reveal);
  - the headline, the sub-line and each note (story);
  - the labels (maps, networks).

  Editing a field writes to `slide.figure` and redraws.
- **The words are found by walking the figure's data.** A key is a word if it is named like one (`caption`,
  `explain`, `title`, `name`, `say`, `text`, `headline`, `sub`, `label`, `credit`, `alt`, `eyebrow`, `why`).
  Markup, colours, ids and numbers are skipped. Inside a drawn SVG (the `svg` of a panels figure), each
  `<text>`/`<tspan>` is listed as a field and edited in place. So a panel's words are editable too.
- **Click a word on the stage** to jump to its field.
- **Edits save with the lesson.** The show, the handout, the PDF and the student export all draw from
  `slide.figure`, so they carry the edited words. The stand-in picture is redrawn on save.

### Part 2. Lists become ordinary studio layers

A `reveal` figure is a list that builds one row per click. The studio already does this with its own layers:
`anim.step { set, i, mode: 'on' | 'dim' }` with an `onClick` trigger (`lab/src/core/types.ts`). So the converter
turns each reveal into real layers:

- the title and the sub-line;
- per row: its icon as a picture, then the name, the words and the tag as text layers;
- `mode: 'build'`: each row arrives on its click;
- `mode: 'answers'`: names show from the start, and the tag and text arrive on the click;
- the figure's `dim: false` maps to `mode: 'on'`.

Teachers can then move, restyle, add and delete rows like any slide. The figure is kept beside it, unused, so
nothing is lost. Panels and the charts (story, network, maps…) stay live figures with Part 1's editing,
because layers can't step a chart.

### Part 3. Guidance

- AGENTS.md: every word on a slide is editable in the studio. Build slides from studio layers (a lesson file,
  the studio's layouts). Use a live figure only for what layers can't do, such as a chart that steps or a
  picture the room hovers. A figure's words go in its data, never only inside a drawn picture.
- The IPDV builders follow it from Week 10 on. Week 9's reveal slides are fixed by Part 2 without a rebuild.

## 3. Copies already in Libraries

Bumping the converter version re-converts a built-in lesson's unchanged copies. A copy a teacher has edited
keeps its edits; it gets Part 1's editing at once (the figure is already on the slide), and Part 2 only if
they re-file it from Built-in lessons.

## 4. Checks

- A lab test for the word walker: every kind in the five lessons gives a non-empty list, no markup or colour
  is listed, and an edit round-trips into the drawn figure.
- A converter test: a reveal becomes layers whose click order and text match the figure's rows.
- A smoke: open each of the five lessons, edit one word on a figure slide, present it, and see the word.
- The Week 9 handout PDF exported again and compared with the one on the Desktop.

## 5. Decisions

| # | Question | Recommendation |
|---|---|---|
| D1 | Part 1 alone, or Parts 1 and 2? | **Both, Part 1 first.** Part 1 fixes every lesson; Part 2 gives the lists full layout freedom |
| D2 | Should a figure's step captions also be studio layers? | **No.** They stay in the figure's frame and are edited in the Figure tab, so the frame's look stays one design |
| D3 | The stand-in picture | **Keep it** for thumbnails and exports, redrawn from the edited figure on save |

## 6. What was built

- **The Figure tab** (`lab/src/ui/panels/figure.tsx`, `lab/src/core/figureWords.ts`):
  - **What it lists.** Every live-figure slide has a Figure tab, whatever is selected on it. The tab lists the figure's words: the slide's, the figure's, then each step's. Data lists of more than 40 items (a country table, a network's stations) are left out.
  - **Typing.** Typing writes to `slide.figure`, which the show and the exports play from. A moment later the stand-in picture is drawn again (`figureStill`, `lab/src/show/figure.ts`), so the canvas and the thumbnails change too.
  - **Double-click.** Double-clicking a word on the slide opens the tab at that word (`figureTextAt`). Double-click no longer opens "replace picture" on a stand-in.
  - **Checked.** Words were found in all 14 kinds across the five lessons, and every field round-trips (`lab/tests/editable-figures.test.ts`).
- **Revealed lists are layers** (`lab/src/layouts/reveal.ts`, `lab/src/decks/reveals.ts`):
  - **What a list becomes.** A list is built from the studio's own layers: eyebrow, title, sub-line, then per row an icon picture, name, words, a tag pill and the answer. Each row arrives on its click (`anim.step`); `dim: false` keeps the shown rows full strength.
  - **Captions.** The figure's per-step captions are not stacked on the slide. The opening caption stays when the list opens on a question; the rest go into the speaker notes ("What the slide said at each click").
  - **Copies.** A new copy is built this way. An older copy's lists are rebuilt in place as it opens (`carryDeckReveals`): same id, the teacher's notes kept.
  - **Converter version.** The version (`CARRIED`) was not bumped, so the 36 shipped Lesson-studio copies did not need rebuilding (none has a revealed list).
- **Drawn pictures onto the slide** (added after the plan, `unpackPicture` in `figure.tsx`):
  - **Double-click.** Double-clicking a drawn picture, or **Put the words on the slide** in its Words tab, turns each of its words into a text layer.
  - **Fidelity.** Each layer sits where the word was drawn, at its size, colour, weight and face. The drawing stays a picture under them, with its words taken out, and the word under the pointer opens for typing.
  - **What it can't keep.** A line that mixes weights ("**nodes** for the dots") becomes one text layer in one weight.
  - **Undo.** One undo puts the picture back.
- **Drawn pictures, from the side panel** (added after the plan):
  - **What changed.** A picture that is an SVG (Week 9's arc, spectrum and tests table, and other drawn diagrams) has a **Words** tab listing its `<text>`s. Double-clicking a word goes to it.
  - **Saving.** The edited picture is kept in the lesson as its own SVG data URL; the file in `assets/` is not changed.
- **Not done:**
  - Words inside a PNG or JPEG photo can't be edited, since they are pixels.
  - A panel's wrapped line is one field per line, as drawn.

## Change log

- 11 November 2026: built. Also:
  - **Drawn pictures.** Asked for when the arc slide turned out to be a locked picture too, so drawn SVG pictures now have a Words tab.
  - **Captions.** A first version put every step's caption on a list slide at once (stacked at the foot). Captions now go to the notes. A copy converted by that first version in this browser keeps the stacked captions until it is filed again from Built-in lessons.


- 11 November 2026: plan written, after a teacher could not edit a Week 9 slide in the studio.
