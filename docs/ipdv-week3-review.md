# Week 3 · Data Abstraction: the review, item by item

The lesson is `ipdv-da` in `js/lessons.js`, built from `01_Lecture_IPDV_3.pptx`. A review of the original
deck (27 September 2026) proposed corrections, missing content, a new running order and ten WebGL
treatments. This file maps each item onto the lesson as it stands.

- **5a7167d** means it was done when the lesson was first built, before the review arrived.
- **27 Sep** means it was done in answer to the review (this change).

## A. Corrections

| # | Item | Status |
|---|---|---|
| A1 | Consistent numbering (Week / Lecture / Lab) | 5a7167d: "Week 3 · Lecture 3", closing slide "Lab 3" |
| A2 | "Analysis Farmwork", double colon | 5a7167d |
| A3 | How? figure titled "What?" | 5a7167d |
| A4 | Duplicate music Data/How? slide | 5a7167d (dropped) |
| A5 | Table cells copied from another project | 5a7167d |
| A6 | Uncited "24.44%" | 5a7167d (dropped, noted in the speaker notes) |
| A7 | Credit Amar, Stasko & Eagan (2005) | 5a7167d |
| A8 | Check "Czarnecki et al., 2005b" | 5a7167d: figure credited to its 2024 JSS paper, Czarnecki as the notation |
| A9 | NCSS 3D charts framed as critique | 5a7167d ("Critique these charts", then "Rescue the 3D chart") |
| A10 | Correlate example was a trend | 5a7167d |
| A11 | Filter example needed an awards attribute | 5a7167d |
| A12 | Data Visualisation Literacy promised but not addressed | 5a7167d: the How? section is framed as it |

## B. Missing content

| # | Item | Status |
|---|---|---|
| B1 | Align the reading | 27 Sep: Chapter 5 is marked as assigned; Chapters 2 and 3 are labelled optional context for the lecture |
| B2 | Definitions: items, attributes, N/O/Q with everyday examples | 27 Sep: "Attribute types, with everyday examples" |
| B3 | Keys versus values | 27 Sep: "Keys and values" (leads into the reshape) |
| B4 | Semantics determines type | 27 Sep: "Check · Semantics decides the type" (postcode, shirt number, star rating, month) |
| B5 | Ordering direction linked to colour scale | 27 Sep: the `scales` experiment, "Colour follows the ordering" |
| B6 | Action–target pairs and the search matrix | 5a7167d: Why? slide, search matrix table, tasks experiment |
| B7 | Amar's tasks linked to Munzner | 5a7167d: "Analytic task taxonomy, in songs" |
| B8 | Bridge: expressiveness, effectiveness, channel ranking | 27 Sep: "From abstraction to idiom", live estimates, the `perception` experiment |
| B9 | Derived attributes as a response to the task | 5a7167d: derive and tasks experiments |
| B10 | Other dataset types | 27 Sep: "Tables are one of four dataset types", then the `network` experiment |
| B11 | Takeaways and Lab preview | 27 Sep: "Takeaways"; the Lab 3 preview was already there |
| B12 | Fruit teaching points (reshape, Total derived, April 394) | 5a7167d: reshape and tasks experiments, pinned by `tests/week3.test.js` |

## C. Restructure

| # | Item | Status |
|---|---|---|
| C1 | Validity threats in one place, after the nested model | 5a7167d |
| C2 | Cycle slide to the start as a roadmap | 5a7167d ("From raw data to insight") |
| C3 | A purpose for the heatmap and chart-identification slides | 5a7167d (Cluster framing); 27 Sep adds the colour-scale lab after the colour critique |

## D. The WebGL treatments

| Review treatment | In the lesson |
|---|---|
| Nested model fly-through with clickable levels | `nested` experiment: focus steps through the levels, then the four threats (5a7167d) |
| Wide-to-long reshape | `reshape` experiment (5a7167d) |
| Multidimensional cube assembling itself | Not built. "Keys and values" names the Fruit × Month → Quantity table instead |
| 3D chart: rotate, then flatten | `rescue3d`: oblique 3D, then flattened, grouped and sorted (5a7167d). It does not rotate freely |
| Live perception experiment (Cleveland & McGill) | 27 Sep: slider game "Estimate · B is what % of A?" (five mark pairs on the phones), then the `perception` experiment reveals each ratio and the ranking |
| Pie-family morph | `pies` experiment (5a7167d) |
| Colour-scale lab with colour blindness toggle | 27 Sep: `scales`: sequential, red–green, deuteranopia simulated (Machado et al. 2009), blue–orange, cyclic months |
| Derived-attribute slider | `derive` experiment, in steps (5a7167d) |
| Attribute-type sorting game | 27 Sep: a four-question choice check. SlideForge's sorting input has two bins, not three |
| Search matrix explorer | Not built: the search matrix stays a static table |
| Lyrics co-occurrence network | 27 Sep: `network`: songs × words → derived co-occurrence → network → communities. Invented counts, no real lyrics |

## Cautions

- **Canvas upload.** The handout already prints every state of every experiment side by side, and each game as questions on paper (`js/lab-engine.js` `printsAsPages`, `js/print.js`). The three new experiments paginate: `perception` 3 pages, `scales` 3, `network` 4.
- **Accessibility.** Keyboard navigation works in the show. Question pictures carry alt text to the phones. The lab engine does not yet honour `prefers-reduced-motion`, although SlideForge's classic player and CSS do. This is open.
- **Test on the room's machine.** Still to do: the lesson has not been run on the lecture-room PC or a mid-range laptop.
- **One interactive per concept.** The lesson now has 13 experiments and 7 checks in 90 minutes. The speaker notes carry timings, and "Another route: feature models" is marked optional. Cut `idioms` or `emoji` if time runs short.

## What changed in code (27 Sep)

- `lab/src/engine/experimentKinds.ts`: kinds `channels`, `scales` and `network`; the perception preset is now `perception`, distinct from the older `channels` preset.
- `lab/src/model/designs/games.ts`, `formats.ts` and `fromSlideForge.ts`: an Estimate question's picture now reaches the lab. The lab had dropped every question image. It is drawn between the question and the line, and kept above the pin on the answer.
- `tools/build-perception-images.mjs` draws the five mark pairs from the `channels` kind in the `perception` preset, without the answer, into `assets/lesson/ipdv/perception-*.svg`.
- `tools/build-ipdv-week3.js` now embeds the games' pictures in the portable bundle too.
- Tests: `tests/week3.test.js` (ratios, deuteranopia collapse, network communities) and `tests/lab-convert.test.js` (preset list, the Estimate picture).

## Layout review in the lab (27 Sep, afternoon)

The teacher went through the 76-slide lab build and set four standards. Each is now applied.

- **A dense figure is full screen, with its words on the flip.** What?, Why? and How?, the empires timeline, the FT Visual Vocabulary and the feature models were splits. Each is now a 16:9 framed picture with the bullets as the facts on its back (`33652c2`). The reading cover, the threats diagram, the pie sketch and the lab artwork stay as splits, because they read at half the slide.
- **The question leads its answers.** On the multiple-choice walls the options are at most three-quarters of the question's size (`38d95c0`, `96fa3ba`). True or false keeps the statement at its doors' size. The Which-level check's question is shortened so its options are not squeezed (`33652c2`).
- **A picture moves over for the rail.** In the lesson player a full-bleed picture was treated as a backdrop and stayed under the brainstorm and word-cloud rail (`bc6c171`).
- **The experiment slide is the template** for charts and interactions: title with its rule, a one-line prompt, the chart centred, the controls bottom left and the source bottom right. No slide needed changing for it.

Also: the seven references fit their slide, one line each (`6fad22f`), and the movie-to-music comparison fits (`a1184e1`).

## Second review: the four lesson changes (27 Sep, evening)

A second review asked for one dominant visual per demonstration, a consistent predict → observe → explain → apply sequence, attribute types shown by example, and fewer, stronger centrepieces.

- **One dominant visual.** Every chart except the nested model uses slide 28's focus layout (`dadfbf8`, `609487e`). Each step's caption is cut to one takeaway, and the full wording is in the speaker notes (`c6f350d`).
- **Predict, observe, explain, apply.** The prompt over the data is the prediction, the steps observe, and the caption explains. *Which channel reads best?* now opens on an Estimate step without the percentage, so predicting does not give the answer away. Apply is still the check after a chart for only *Find the attributes* and *Rescue the 3D chart*. The other charts' apply tasks are not yet written.
- **Attribute types by example.** *Three kinds of attribute* shows genre, shirt size and apples sold as cards, one per click, before the table, which becomes the recap (`609487e`). The lab now reveals a staged cards slide card by card (`c7c94cd`).
- **Centrepieces and pacing.** The speaker notes mark three centrepieces (the reshape, perception and the colour scales) and four optional demos (the three idioms, units as icons, the pictogram chart and feature models).

Found on the way: Codex's perception preset shared the name `channels` with Week 2's *Marks and channels*, and it had replaced Week 2's chart in both engines. It is now `perception` (`c6f350d`).

## Change log

- **27 Sep 2026:** Clarified slide 3 so Chapter 5 is the assigned reading and Chapters 2 and 3 are optional context, matching slide 2 and the supplied lecture materials.
- **27 Sep 2026:** Renamed Week 3's perception preset so saved Week 2 `channels` slides keep their original marks demonstration. Older Week 3 copies are recognized and upgraded on open.
