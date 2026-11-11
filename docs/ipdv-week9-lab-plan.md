# Week 9 lab · Who drives the story? Tutorial, challenge and sample solution: plan

Status: built for a **one-hour** lab, 11 November 2026 (section 9 says what was built and how it differs from this plan). Not committed yet.

## The aim

**Advanced charts in Altair: add marks and channels, and isolate part of the data, so a story stands out.**
Weeks 1–8 built single charts: one mark, a few channels. Week 9 layers them. A reference line, notes, a
shaded band, a highlighted line over grey ones, labels at the end of a line, and a parameter that reveals a
chapter. Each technique answers one storytelling job from the lecture (say the finding, point at it, show
the context). The story is the reason for each technique; the technique is what students practise.

Week 9's lecture is built (`tools/ipdv-week9/`, plan in [ipdv-week9-plan.md](ipdv-week9-plan.md), theory in
[ipdv-week9-theory-plan.md](ipdv-week9-theory-plan.md)). Its seven Build-its are the tutorial's spine.

## 1. What students get

| File | What it is | Who |
|---|---|---|
| `09_Notebook_IPDV_Narrative_Experiential.ipynb` | **Tutorial.** Each advanced technique worked once on Marylebone Road: the code, the picture, a *try it*, a folded model answer | Students |
| `09_Activity_IPDV_Brixton_Road_Story.ipynb` | **Challenge.** The same techniques on a new road, with blanks (`___`) and ✅/❌ checks, and one technique the tutorial only hints at | Students |
| `09_Activity_IPDV_Brixton_Road_Story_Solutions.ipynb` | **Sample solution.** Every blank filled and run, with what each cell should show, the expected numbers, an error guide, plan-B pictures and a marking guide | Teacher only |
| `no2_london.csv`, `week9_build_its.py` | The data and the lecture's code (both already built) | Students |

They go in `lessons/`, and a Canvas folder beside Week 8's:
`Adv Data Vis Materials /LDSCI6253_Week_9_Canvas/`, with `LDSCI6253_Week_9/` (student files and a zip) and
`Teacher_only/` (the solutions, and the tutorial run with outputs).

## 2. How it is built (one source, no drift)

As in Week 8 (`tools/ipdv-week8/code/notebook.py` and `activity.py`):

- `tools/ipdv-week9/code/notebook.py` writes the tutorial. The Build-it cells come from `steps.json`, so they
  are the code the slides print.
- `tools/ipdv-week9/code/activity.py` writes the challenge **and** its solutions from one source. `⟦…⟧` marks
  what a student writes: the student copy shows `___`, the teacher copy shows the answer. The build runs the
  teacher copy end to end, so every answer is known to work.
- Every number in a check, a title or a sample answer is computed from `no2_london.csv` at build time, never
  typed in.
- A new test file (`tests/week9-lab.test.js`) checks three things. Both notebooks exist. The student copy holds
  no answers. The teacher copy ran with no error.

## 3. The toolkit: what is advanced this week

Three kinds of move, each tied to the lecture's storytelling job.

| Kind | Altair | Story job (lecture) |
|---|---|---|
| **More marks, layered** | `+` to layer; `mark_rule` (a limit line, a note's stem); `mark_text` (notes, end-of-line labels); `mark_rect` / `mark_area` (a shaded band: "over the limit", the ULEZ years); `mark_point` (one dot made big); layer order (last is on top) | Point at it; show context |
| **Advanced channels** | Conditional encoding `alt.when(...).then(...).otherwise(...)` on `color`, `opacity`, `strokeWidth`; `detail` (one line per monitor, no colour); `strokeDash`; `tooltip`; a fixed `scale(domain=...)` so the axis never moves | Highlight one thing; keep the scale honest |
| **Isolating data** | `transform_filter` (one road, the last year, a chapter); `transform_calculate` (a flag: over the limit?); `transform_window` / `transform_joinaggregate` (each road's value as % of its 2010, a rank, the London median); `alt.param` and `selection_point` (isolate by click or by chapter) | Say the finding; let the reader drive |

## 4. The tutorial: "One road, built up move by move" (about 45 min)

Marylebone Road throughout, as in the lecture. Each section is: what the move does (one line) → the
code → the picture → **Try it** → folded model answer. Sections 1–7 are the lecture's Build-its; 3b, 4b and 5b
are new, and fill gaps in the toolkit above.

| § | Move | New Altair | Try it |
|---|---|---|---|
| 0 | Setup | `read_csv`, boolean filters | How many monitors, how many years? |
| 1 | The bare line | `mark_line(point=True)` | — |
| 2 | Say the finding in the title, add the limit | `alt.Title`, `mark_rule` on `alt.datum(40)`, `+` | Make the limit line say "Legal limit" with a `mark_text` |
| 3 | Write on the chart where it happened | a small DataFrame of notes, `mark_rule` with `y2`, `mark_text(align, dx)` | Add a fifth note |
| **3b** | **Shade a period** | `mark_rect` with `x`/`x2` (the ULEZ years) under the line, layered first | Shade "over the limit" (40 upwards) instead |
| 4 | One in colour, the rest grey | a second layer from `road` with `detail`, then layer order | Put the grey layer last: what breaks? |
| **4b** | **Highlight with one chart, not two** | `alt.when(alt.datum.code == 'MY1')` on `color`, `opacity`, `strokeWidth` | Highlight a different road by changing one string |
| **4c** | **Label the line, drop the legend** | `transform_filter` to the last year, `mark_text` at the line's end | Label the London median too (via `transform_joinaggregate`) |
| 5 | Let the reader drive | `selection_point(bind='legend')`, `tooltip` | Add a hover highlight: `selection_point(on='pointerover', fields=['code'])` |
| **5b** | **Compare from a common start** | `transform_window` / `joinaggregate` for each road's 2010 value, `transform_calculate` for % of 2010 | Which road fell the most? |
| 6 | A martini glass | `alt.param` + `binding_radio`, `transform_filter(chapter >= n)`, a fixed scale | Add a fourth chapter |
| 7 | Guess first, then show | `binding_range`, `binding_checkbox`, `XDatum`/`YDatum` | Change the year the line stops at |
| 8 | **Spot the trick** | five small charts, each with one of the lecture's five tricks | Name the trick, fix it with one change (most fixes are one channel or one filter) |

## 5. The challenge: "Brixton Road: still London's worst road" (about 75 min)

**Why Brixton Road** (Lambeth, kerbside, `LB4`). From `no2_london.csv`:

- 174 µg/m³ in 2010, the highest of the 47 roadside monitors that year;
- 48 in 2025, still the highest of the 39 reporting, and the only one over the legal limit of 40;
- the roadside median fell from 55 to 23 over the same years;
- no data for 2011–2013 or 2018, and 2025 is provisional.

The story needs both halves at once: the road fell about 72%, but it is still the worst. Isolating it from
the others is the only way to show that, so the techniques are the story. The gaps give the honesty point.
With `year:O`, Altair drops missing years from the axis, so 2010 sits next to 2014 and the fall looks steeper.
The fix is one channel type: `year:Q`.

In pairs, one typing and one checking, swapping at each letter (as Week 8). Each part ends on a chart.

| Part | Technique | Students… | Tutorial | Time |
|---|---|---|---|---|
| Warm-up | — | from memory: what `+` does, which layer is on top, what `detail` is for | — | 3 min |
| **A** | Isolate | filter `LB4` out of `road`; compute 2010, 2025, the % fall, its rank in 2025, the median ✅ | §0, 5b | 10 min |
| **B** | Honest axis | draw it with `year:O`, see the jump, fix it with `year:Q` and say why ✅ | §1 | 7 min |
| **C** | Marks, layered | the limit rule and label, a shaded "over the limit" band, the two-part finding in the title | §2, 3b | 12 min |
| **D** | Notes | Brixton's own notes (the ULEZ dates the lecture used; Brixton Road should be inside the October 2021 zone; check against TfL's map before it goes in) | §3 | 8 min |
| **E** | Highlight by condition | every road in one chart, Brixton in red via `alt.when`, the rest grey and thin; end labels for Brixton and the median, no legend | §4b, 4c | 15 min |
| **F** | Isolate interactively | a martini glass: chapter 1 Brixton alone, 2 the notes, 3 every road; then a hover that isolates any road | §5, 6 | 15 min |
| **G** | Index (stretch) | redraw every road as % of its 2010 value: does Brixton still look the worst? Write one sentence on which chart tells the truer story | §5b | 5 min + home |

**Hand-in:** the finished chart from F and, for G, one sentence. The written part is kept small because the
aim is the code.

## 6. The sample solution (teacher copy)

The same notebook with every blank filled and run, plus, as in Week 8:

- a top table: part, technique, time, *the point*;
- under every code cell, 👀 what students should see;
- a picture of each expected chart (plan B: if Python won't run, show these and talk through the code);
- the expected numbers from A (computed by the build);
- the error guide ("they see / it means / say") for this week's errors. Examples: `alt.when` on a field
  without quotes; a parameter used in `transform_filter` but never added with `add_params`; a layered chart
  whose layers have different data and need the chart's data passed to each; `mark_text` with no `text`;
- a marking guide by technique: layered marks, conditional channel, isolation by filter, isolation by
  parameter, honest axis, each worth a mark, plus one for the finding in the title.

## 7. Decisions before building

| # | Question | Recommendation |
|---|---|---|
| D1 | Which road for the challenge? | **Brixton Road for everyone**, so the ✅ checks work for all; any monitor as the stretch |
| D2 | London only, or also the 2025 WHO world file? | **London only.** The WHO file needs geocoding (hours, against Nominatim's policy) and drops most rows |
| D3 | How long is the lab? | Plan assumes **2 hours**: tutorial 45 min, challenge 75 min. If shorter, the tutorial becomes pre-lab work |
| D4 | Hand-in | The worksheet on Canvas **by midday on the Friday after the lab** (as the lecture says) |
| D5 | Tutorial §3b, 4b, 4c, 5b (shaded bands, conditional highlight, end labels, indexing): new code not in the lecture | **Include them.** They are the advanced moves the challenge needs; the lecture's Build-its alone don't cover them |
| D6 | The lab slide's Sketch and Critique steps | **Fold them in lightly**: the title's finding (C) is the sketch, and Spot the trick (§8) is the critique. Change the lecture's lab slide to match the lab: "add marks, isolate the data, highlight the story" |

## 8. Build order

1. `steps.py`: add the new tutorial steps (3b, 4b, 4c, 5b, 8), so their pictures are rendered and checked like
   the lecture's.
2. `notebook.py` → tutorial; run it end to end (`--run`).
3. `activity.py` → challenge and solutions; the teacher copy runs as part of the build.
4. `tests/week9-lab.test.js`.
5. Canvas folder and zip on the Desktop.
6. If D6 is taken: the lecture's lab slide, rebuilt.

## 9. What was built (one-hour lab)

The lab is one hour and the lecture's Build-it slides already show the code, so the build is shorter than sections
4 and 5 planned:

- **Challenge** (`tools/ipdv-week9/code/activity.py` writes `lessons/09_Activity_IPDV_Brixton_Road_Story.ipynb` and
  `..._Solutions.ipynb`): six parts in about 55 minutes, 16 blanks, ✅/❌ checks.
  - **A, isolate (8 min):** find the fall, 174 → 48, which is 72%, and the rank: no road worse, 1 of 39 over the limit.
  - **B, honest axis (5 min):** `year:O` hides the missing years, so the fix is `year:Q`.
  - **C, layered marks (12 min):** a `mark_rect` band "over the limit", the limit rule and its label, and a two-part finding as the title.
  - **D, conditional channel (15 min):** every road in one chart, Brixton red via `alt.when`. A median line from `transform_aggregate` and end labels replace the legend.
  - **E, martini glass (12 min):** an `alt.param` with three chapters, and a hover stretch.
  - **F, hand-in (3 min):** the chart and one sentence: what it tells, and what a reader would need to disagree.
  - **The teacher copy:** every blank filled and run in the build, what each cell should show, a picture of each chart (plan B), an error guide, sample titles from weak to excellent, and a 6-mark marking guide. The numbers are computed from `no2_london.csv`, and the build stops if the story stops being true.
- **Tutorial** (`tools/ipdv-week9/code/notebook.py` writes `lessons/09_Notebook_IPDV_Narrative_Experiential.ipynb`, and with `--run` a run copy):
  - **What it holds:** the seven Build-its as on the slides, each with a *Try it* and a model answer. All of it runs, and so do the model answers.
  - **Not built:** the planned new sections 3b, 4b, 4c and 5b. The challenge teaches the band and `alt.when` itself.
- **Tutorial, sections 8 and 9** (added at the teacher's request, from lecture slides 37 and 43):
  - **8, three ways to lead, then let go:** an interactive slideshow (three chapters, with captions worked out from the data) and a drill-down story (click a type in the overview, and its monitors open below with `&`). The martini glass is §6.
  - **9, four ways to make a number land:** count it out (one square per monitor, 60 of 87 over the limit in 2010 and 1 of 59 in 2025), human scale (WHO-guideline blocks, 10 and then 3 for Marylebone Road) and make it physical (a printable tower). Guess first is §7.
  - Each has a *Try it* with a model answer.
- **Canvas folder:** `Adv Data Vis Materials /LDSCI6253_Week_9_Canvas/`.
  - `LDSCI6253_Week_9/` holds the tutorial, the challenge, `no2_london.csv` and `week9_build_its.py`, and there is a zip of it.
  - `Teacher_only/` holds the solutions and the run tutorial.
- **The ULEZ notes in E** are London-wide events (central 2019, widened October 2021, London-wide 2023), worded as
  when, not as causes. This avoids the unchecked claim that Brixton Road is inside the 2021 zone.
- **Not done:** the lecture's lab slide still lists Concept, Sketch and Critique (D6), and `tests/week9-lab.test.js`.

## Change log

- 11 November 2026: built for a one-hour lab (section 9).

- 11 November 2026: plan written. Same day: refocused on the session's aim (advanced marks and channels,
  isolating data to highlight a story); Brixton Road facts checked against `no2_london.csv`.
