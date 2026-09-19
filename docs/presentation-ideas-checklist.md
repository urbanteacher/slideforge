# What we have, against Figma's 60 presentation ideas

Checked on 2026-09-19 against
<https://www.figma.com/resource-library/presentation-ideas/>.

Measured, not remembered. The counts below come from the running app:
**39 slide types**, **20 chart kinds** across 9 families, **16 compositions**,
**23 themes**, **24 quiz and game styles**, 3 free-block kinds.

Sixteen of the sixty are things a **room** does rather than things a tool can
provide — props, body language, surprise guests, humour, personal stories. They
are listed at the end rather than counted as gaps, because calling them missing
features would flatter the list and tell us nothing.

The rows below cover all 60 ideas exactly once: **27 supported**, **13 partly
supported**, **4 missing**, and **16 presenter-led**. Supported means the named
SlideForge workflow is available; it does not mean every Figma implementation
or template can be imported.

---

## Have it

| # | Figma's idea | Where it lives |
| --- | --- | --- |
| 1 | Go bold with fonts and text | 23 themes own the type scale; B / I / U / highlight / colour per selection |
| 4 | Highlight key data with colour | chart series isolation, callouts, the highlight mark |
| 5 | Explore typography for storytelling | `statement`, `quote`, the `voice` composition |
| 6 | Embrace vibrant colours | `brutal`, `ember`, `ocean`, `cinematic`, `midnight` |
| 7 | Use lines to break up data | `table`, `compare`, the accent bar, the lattice gutters |
| 10 | Create a two-tone presentation | every theme is built two-tone; per-slide text and background colour |
| 11 | Highlight key points with pops of colour | highlight mark, text colour, chart focus |
| 12 | Keep fonts and sizing consistent | the theme owns type; the fit check and the design-catalogue tests hold it |
| 13 | Split slides side to side | `split`, plus `columns` / `sidecar` / `rail` / `lanes`, plus Split 50·50 / 40·60 / 20·80 on the lattice |
| 16 | Break up with Q&A | live Q&A with moderation (`qaCommand`) |
| 17 | Gamify | 24 game styles, live with phones |
| 19 | Open with a thought-provoking question | the `prompt` composition, response slides, starters |
| 22 | Visualise progress with a timeline | `timeline`, `journey` |
| 24 | Showcase a live demo or prototype | `experiment`, `simulation`, `explore`, the code typewriter |
| 32 | Integrate other media | `video`, `image`, `gallery`, `code`, 20 chart kinds |
| 36 | Create a layout that draws interest | 39 types, 16 compositions, the 16×12 lattice |
| 41 | Make your presentation easy to follow | progressive builds, `section` slides, page numbers, header and footer slots |
| 42 | Create a photo story | `gallery`, revealing one picture at a time |
| 43 | Keep it simple | the line budget, the fit check, the deck review |
| 47 | Explore different themes | 23 |
| 49 | Start with a powerful quote | `quote`, the `voice` composition |
| 50 | Use diagrams for clarity | `orgchart`, `mindmap`, `journey`, `funnel`, `iceberg`, Sankey |
| 51 | Don't fear the white space | the lattice reports spare lines; ⌗ Centre puts the air round the content |
| 53 | Use infographics for complex data | 8 infographic layouts |
| 55 | Begin with a statistic | `keyfact`, `stats` |
| 58 | Incorporate quizzes | 24 styles, live or rehearsed |
| 60 | Create mind maps | `mindmap`, with six reveal steps |

## Partly

| # | Figma's idea | What is there | What is missing |
| --- | --- | --- | --- |
| 2 | A unique colour palette | 23 themes; per-slide text and background colour | no deck-level palette editor — you pick a theme, you do not build one |
| 3 | Animated illustrations | 6 motion presets, cover motion, chart motion | no way to author an illustration's animation |
| 14 | Simple background patterns | theme art layers, and artwork can be placed behind content | no pattern picker |
| 18 | Highlight your call to action | `statement`, the `commitment` composition | no CTA component that knows it is one |
| 21 | Real-world examples from social media | `sourcecheck`, `spotfake`, `links` | no embed of a live post |
| 23 | Break out into group activities | teams mode, `race`, `bingo`, live activities | no breakout-room structure or per-group brief |
| 26 | Animated GIFs | a GIF plays wherever an image goes | no GIF library or search |
| 27 | Start with a table of contents | build one by hand on a `content` or `journey` slide | no agenda type that derives itself from the deck |
| 28 | End with a concise summary | `closingNote`, the `credits` composition | nothing that gathers the deck's own points |
| 34 | Digital whiteboard, real-time | teaching ink over the wall, live from the desk | ink is the presenter's; the room cannot draw, and authoring is single-writer |
| 35 | Level up your screenshots | image frames, focal point, captions, staged numbered image callouts and a focus lens | annotations have fixed anchors; no general arrow placement or blur editor |
| 57 | Comic book style | Motion Lab comic panels, numbered frames and speech-style detail boxes | an experiment style for content slides; not a complete deck theme |
| 59 | Switch up your pacing | transitions, progressive builds, rehearsal timing | no per-slide timing plan or pacing report |

## Not at all

| # | Figma's idea | Note |
| --- | --- | --- |
| 9 | Creative borders | no border control on a slide or a block |
| 25 | Custom illustrations | you place pictures; there is nothing to draw with |
| 39 | Augmented reality | no |
| 48 | Set the stage with maps | **the `spatial` chart family is empty.** `reveal-map` is a conceptual map for `iceberg` — labelled risks, not geography. The taxonomy already names what is missing: choropleth, proportional symbol, flow map, contour, cartogram, dot density, heat map |

`48` is the one worth arguing about. The chart taxonomy carries a `missing`
list for every family — 40-odd named idioms across nine families — and
`spatial` is the only one with **nothing at all** behind it. On a course that
teaches choosing between chart types, a whole family answering "we cannot draw
that" is the largest single gap on this page.

## Not a software feature

Sixteen ideas depend primarily on the presenter and their content:
colour psychology (15), relatable examples (20), tailoring to the audience (31), a personal story
(33), role-play (37), expert tips (38), narrative (40), props (44), audience
demonstrations (45), multiple senses (46), surprise guests (52), humour (54),
body language (56), keeping it focused as a discipline (29), classic
storytelling structure (30), unique photography as a craft (8).

Two of those the app could *prompt* for without pretending to do them — a deck
could ask whether it opens with a question and closes with a summary, which is
(19) and (28), and it already has the layouts for both.

## Motion Lab additions — 2026-09-19

Eight original specimens now follow the existing motion catalogue. They use
the existing renderer and editable slide fields. This is content coverage;
none of the missing engine capabilities above has been marked complete.

- [x] Design-section opener with a moving grid.
- [x] Ink-on-lime poster with a single word reveal.
- [x] Reversed-colour poster for a controlled visual comparison.
- [x] Four-beat narrative with earlier points dimmed during builds.
- [x] Photograph and staged observation prompts.
- [x] Diagram branches revealed one at a time.
- [x] Audience poll comparing the experiments.
- [x] Closing commitment with one practical action.

Open a fresh factory copy using `?lesson=motion-lab`. Existing saved copies are
not overwritten by library seeding. Copy the new slides into an edited copy
if you want to keep its changes.

## Remaining extensions after the interactive presets

| Priority | Experiment | Acceptance criterion |
| --- | --- | --- |
| 1 | General screenshot annotation | Extend the fixed callout preset with arbitrary arrow placement and blur. |
| 2 | Border controls | Extend the comic specimen with adjustable border weight and treatment across layouts. |
| 3 | Agenda and recap | Derive from selected deck sections; update after reorder without rewriting authored text. |
| 4 | Geographic view | Real boundaries, explicit joins, legend, missing-data treatment and source attribution. |
| 5 | Reusable palette | Save deck-wide colours with contrast previews and consistent chart semantics. |

AR, collaborative drawing and illustration choreography require separate
interaction engines. The current examples do not claim to implement them.

## Interactive expansion

Motion Lab now has 59 slides. Slides 45–54 contain the ten working interaction
presets; slides 55–59 compare the five visual styles. Slide 44 introduces them.
See [controls and limits](motion-lab-experiments.md). Presets include a mask,
draw-on connections, expanding cards, image callouts, scrubbing, a linear model,
local scenario choices, separating panels, a lens, and responsive story panels.
