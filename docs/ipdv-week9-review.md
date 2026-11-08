# Week 9 · Who drives the story? Review by ten personas

Ten reviewers read the built lecture on 7–8 November 2026: all 96 slide and step images, every slide's words and
speaker notes, the Altair code (`tools/ipdv-week9/code/steps.py`) and the plan. Each read it as one persona. None
edited anything. Slide numbers are the lecture's (50 slides). This file merges their findings, ranked by
how much each one matters for teaching and by how many reviewers raised it. Claims that change a fact were checked
before they went in (see "Checked").

| Persona | Score | Their one line |
|---|---|---|
| Priya, nervous first-year, no code before | 6.5 | The chart half is memorable; the code half and the Munzner block lose me |
| Wei, international student, revising alone | 6.5 | Clear structure, but idioms and prompts that need the speaker |
| Sam, accessibility adviser, colour-blind | 6 | Colour carries meaning alone; small grey print fails at the back |
| Dr Ruiz, visualisation researcher | 6.5 | Segel & Heer and Munzner flattened or misattributed in places |
| Dr Okafor, air-quality scientist | 7 | Careful data; the ULEZ note and "WHO calls safe" mislead |
| Prof. Mensah, teaching and learning lead | 7 | Strong hook and spine; overfull, framework front-loaded |
| Tom, Altair developer | 7 | Real code, but two slides don't do what their notes say |
| Lena, presentation designer | 7 | Collisions on the hero chart; Altair pictures break the deck's own rules |
| Dr Bell, external examiner | 6 | Level 7 Altair, Level 5 theory and citation; photo uncredited |
| Marcus, career-changer and course rep | 6.5 | Best hook on the course; never says where this lands in a job |

Average 6.6. **Kept by almost everyone:** the guess-first hook (slides 6–7), slide 15's bare → headline → notes →
highlight build on one chart, the "a note says what happened, not that it caused the drop" caveat, the WEAK /
STABLE / EXCELLENT answers, slide 26's honest pale months, and slide 35's one parameter driving stem and bowl.

## Checked

- **Brixton Road (LB4)** was London's worst monitor in 2010 (174) and is the **only** monitor over the legal limit in
  2025 (48). Confirmed in `data/no2.json`.
- **Monitors:** 163 ran at some point since 2010; 87 reported in 2010 and **59 in 2025**. Confirmed.
- **ULEZ and Marylebone Road:** the 2019 central ULEZ followed the Congestion Charge boundary, the Inner Ring Road,
  and Marylebone Road (A501) is that ring road's northern side. So "ULEZ starts" at 2019 on its chart invites a
  cause the road may not have had until the October 2021 inner expansion. Confirm on TfL's boundary map before the
  slide states it.
- **Not a finding:** Lena's "panel slides look the same on every step" comes from the review stills, which always
  show every panel. When presented, each click reveals the next panel.

## A. Facts to correct before it is taught

1. **"WHO calls safe" is wrong** (Okafor, Bell, Ruiz). WHO's 10 µg/m³ is a guideline; harm is seen below it. Slide 6
   step 3: "Under the legal limit since 2024; still three times the WHO guideline (2021)." Slide 40: "one block = WHO
   guideline, 10". Story words: "much better; still above what WHO recommends."
2. **The ULEZ note on Marylebone Road** (Okafor). See Checked. Mark both 2019 (central zone, road on its edge) and Oct
   2021 (inner expansion), and change step 3's "the reader no longer has to guess why the line drops" to "the notes
   mark what happened; they don't prove why".
3. **"Every one of London's 163 monitors"** (Okafor). "163 monitors that ran since 2010 (59 in 2025)"; "nearly every
   line fell", because part of the falling cloud is high sites closing.
4. **Brixton Road belongs in the story** (Okafor). "Brixton Road: 174 in 2010, still 48 in 2025, the one road over
   the limit" fits "much better, not yet safe" exactly.
5. **2025's 31 is provisional** (Okafor). 78% of hours, December only 27%. A footnote on slide 6.
6. **Segel & Heer's line** (Ruiz, Bell). They name three hybrid structures (martini glass, interactive slideshow,
   drill-down); "linear story" and "dashboard" at the ends are ours. Footer: "After Segel & Heer (2010); end labels
   ours." Credit their tactics on slide 16 (messaging, highlighting, ordering) and their seven genres somewhere (the
   final infographic is a *partitioned poster*).
7. **Munzner** (Ruiz). Produce → Annotate is the *reader's* action, not the author's notes; Enjoy is casual use, and
   guess-first is *present* made memorable. Slide 11's footer: "Munzner (2009); terms from Munzner (2014)."
8. **Guess-first evidence** (Ruiz). Kim, Reinecke & Hullman (2017) had people *draw* predictions. Slide 7: "Predicting
   first helps people remember data (Kim, Reinecke & Hullman, CHI 2017)."
9. **Slide 40's "count it out" and "human scale"** (Ruiz, Okafor, Bell). A concentration is not a count, and person
   icons read as people. Count something discrete (hours over a limit), use blocks for "times the guideline", and
   drop "Marylebone Road breathed".
10. **Kerbside vs background** (Okafor). 2025: kerbside 31, roadside 23, urban background 17. "Kerbside is about twice
    background; roadside about 1.4 times." Background means "away from busy roads", not "a park".
11. **Slide 26's rhythms** (Okafor, Lena). Weekdays rise to a broad daytime plateau peaking at 5 pm, not two rush
    hours; Friday vs Thursday is within one year's noise; "winter is worst" isn't on the chart. Retitle panels as
    findings ("Worst at 5 pm on weekdays", "One year can't show the seasons").
12. **Health context** (Okafor). One line: NO₂ inflames airways, especially children's; it is one pollutant (PM2.5 is
    also above WHO's guideline).

## B. Code that doesn't do what the slide says (Tom)

1. **Slide 21:** `alt.Order` on `mark_line` orders the points, not which line is drawn on top. Layer grey then red:
   "the layer added last sits on top". The notes' "drawn last (order)" is wrong.
2. **Slide 35:** the grey lines are bare `mark_line`, so their tooltip shows the first row (2010). Add `point=...`.
3. **Slide 35 isn't the martini glass taught on 32–33:** it opens at chapter 4, has no headline or limit line, and
   places notes by pixel (contradicting slide 20's `at` column), and "ULEZ: all London" runs off the edge.
4. **"Run as it is printed"** isn't true for a fresh notebook: slides 19–41 need slide 18's setup. Say so in each panel.
5. **The build never arrives at slide 15's chart:** each Build-it drops the previous one's layers. Make 21 grow from 20.
6. **Slide 41:** the guess is a dashed rule, the legal limit's style, across years already shown; draw it as one point
   at 2025 and make the truth line bolder. `alt.datum(40)` vs `alt.YDatum(guess, type=…)` needs one sentence.
7. **Slide 27's colours** are Altair's defaults, swapped against slide 24; set the scale.

## C. Layout and accessibility (Lena, Sam)

1. **Note labels crossed by their own rules** (slides 15 step 3–4, 33): put them at one height, left-aligned just
   right of each rule, short ("ULEZ central", "Lockdown", "ULEZ London-wide"), with a halo.
2. **Slide 6 step 2:** the line still strikes the faded A–C labels. Move the letters to a gutter right of 2025, or drop
   A–C on the reveal.
3. **Four tiers of type compete** on the story slides (eyebrow, title, question, chart headline), and the story card's
   bold first line repeats the question. Make one thing the largest; cut the repeat.
4. **Altair pictures are too small** (axis text ~7px, rotated years): render larger, `labelAngle=0`, fewer year labels.
5. **Code walls** (20, 21, 35, 41): show only the new lines, larger; full code on Canvas.
6. **Colour alone** (Sam): the dashboard's red/orange/green type colours merge for red-green colour blindness; the WHO
   line is green dotted next to red. Use a colour-blind-safe set plus a second cue; label lines directly.
7. **Small grey print** under ~18px across panels, keys, sub-lines, pills and the martini drawing; grey #d3d3d3 lines
   are under 2:1 on warm white.
8. **Slide 1:** title low-contrast on navy and running into the N.

## D. Flow and timing (Mensah, Marcus, Priya)

1. **It runs about 100 minutes, not 89:** the interactive slides are under-costed. Cut about 10 minutes.
2. **The Munzner block (11–13) stalls the start:** cut 11 (Week 3's walk-through), merge 12 into 13, put Munzner's
   word under each stop on the route slide (10).
3. **The martini glass appears too often and out of order:** 32 names it before 33 shows it (swap them); 34 repeats
   31; drop "martini glass" from slide 8's six words (used 24 slides later).
4. **Segel & Heer's line (31) arrives 55 minutes in** though outcome 1 depends on it: show it after slide 10 as the
   map, and again at 30.
5. **Slide 26 sits oddly in "Let go"** (it is author-made). Move or cut.
6. **Outcomes overpromise:** "critique a published story" is never practised. Add a 3–4 minute pair critique at slide
   39 ("who drives, where on the line, one way it could mislead").
7. **Repeats:** four card slides plus slide 47 repeating them; guess-first restated on 7, 40, 41, 43; slide 46's
   worked example is slide 45's item 1.
8. **The close:** 45 → 46 → 50 (pair talk) → 47 (cards) → 49 (lab); slide 48 compulsory, not optional.
9. **Long passive code stretch** (18–21): add one "predict before you see" prompt per Build-it.

## E. Words (Priya, Wei)

1. Define **NO₂, µg/m³, annual average, legal limit** on slide 6 (slide 5 is hidden in the student copy).
2. Define **ULEZ** once ("older, dirtier vehicles pay a daily charge"), and **lockdown (COVID-19, 2020)**.
3. Gloss Altair's **`:O` `:Q` `:N`**, **tooltip**, **dashboard**, **parameter** before they're used.
4. Replace idioms and London-only references for the student copy: "most rooms guess" → "most students guess"; "a
   parent at the school gate"; "bus-stop poster" → "a poster people pass quickly"; "hands up" → "choose, then click".
5. Put on the slide what is only in the notes where students revise alone: the point → because → so → case chain
   (36), the ladder's answer (46), one line per published story (39).

## F. Integrity and level (Bell)

1. **The Marylebone Road photo** is uncredited and still shown in a likely recorded session; use an openly licensed
   picture with a credit line, or cut it.
2. **References live only in the notes:** add a references slide, and put citations on slides 7 and 26.
3. **Unhedged claims** ("most people glance, then leave", "most of the public won't explore"): cite or hedge.
4. **"Guesses are anonymous" vs a show of hands:** use a poll or fingers against the chest.
5. **Level 7 depth:** one slide "Does storytelling work?" (Boy, Detienne & Fekete 2015; Hullman & Diakopoulos 2011,
   framing), so the excellent answer on 36 has something to argue against.
6. **Ethics for AE2** (women's and girls' health data): one row on slide 42 on sensitive data (people are not icons;
   small counts identify people).
7. **The WHO-database lab option** on slide 49 points to a notebook known to be broken; remove until it is rebuilt.

## G. Relevance (Marcus)

1. Explain the tooltip's mechanics on slide 27 (`alt.Tooltip(..., title=, format=)`, how `add_params` links).
2. One "same moves, your job" slide: a Power BI or Tableau dashboard's title, annotation and highlight.
3. A data-prep step: from hourly readings to yearly means, with the 75% capture rule.
4. A sixth lab step, Publish: `chart.save('story.html')` → a portfolio link.
5. One current example beside the 2012–2016 classics (FT, Reuters, BBC, Our World in Data).

## Suggested order of work

1. **A and B**, the facts and the code: they change what students learn, and each is small. **Done 8 November 2026**
   (see the plan's change log). The ULEZ boundary reading still needs one look at TfL's zone map before class.
2. **C1–C4 and C6**, the collisions and the colour-blind fixes, on the story figure and the Altair renders. **Done 8
   November 2026, with C5, C7 and C8** (see the plan's change log). C3's four tiers of type stay: only the repeats were cut.
3. **D**, the restructure: decisions for the teacher (what to cut to reach 90 minutes).
4. **E, F, G** as the teacher chooses.
