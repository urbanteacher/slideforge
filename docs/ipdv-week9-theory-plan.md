# Week 9 · Adding the theory: what a data story is, and why

**Status:** built, 8 November 2026, with the recommended decisions (D1 b, D2 end of Part 1, D3 as below, D4 plain)
and the additions in §9. The lecture is now 52 slides, 85.7 minutes by the notes without the optional ones (95.7 with
them). Where the build differs from this plan, the change log says so; the plan below is kept as written.

The built lecture (`tools/ipdv-week9/lesson.js`, 50 slides) has plenty of examples but little rationale. A student who
has never done this sees *how* to tell a story with a chart, but is never told:

- what makes a chart a story;
- why we tell stories with data at all;
- what separates a strong story from a weak one;
- how the same tools can be used to mislead.

The storytelling spectrum, which should frame the whole lecture, arrives at slide 31, about 55 minutes in.

| The question | Where it is now | Gap |
|---|---|---|
| What is narrative vis? | One row of slide 8's word table: "a chart with an order" | No definition, and no chart set beside a story |
| Why is it used? | Guess-first only (slides 6–7) | No attention, understanding or persuasion, and no evidence |
| Strong vs weak | Slide 17 judges titles; slide 36 judges an answer | No tests for judging a whole story |
| Manipulation | Slide 42 (2 min, Part 4) and a spoken caveat on slide 15 | Students never take a misleading story apart |
| The spectrum | Slide 31, at minute ~55 | It is the lecture's map, but it comes in the middle |

## 1. The idea

Add two blocks, and move one slide.

- **A foundation block** of five slides straight after the hook (after slide 7), about 15 minutes. It covers what a
  story is, why we tell one, the spectrum as the map, and how to judge a story.
- **A "tricks" block** of two slides at the end of Part 1 (after slide 21), about 6 minutes. Students have just
  learned the author's tools, and now see the same tools used to mislead.
- **The spectrum** moves from slide 31 into the foundation block. Slide 31's place gets a 30-second "where are we on
  the line" callback instead.

Everything uses the lecture's own Marylebone Road data, so no new dataset is needed.

## 2. The foundation block (after slide 7)

### F1 · A chart, or a story? (3 min, live story figure)

The same data, Marylebone Road's NO₂ for 2010–2025, shown twice.

- **Step 1, the chart:** the bare line, titled "NO₂ at Marylebone Road, 2010–2025".
- **Step 2, the story:** the same line, with the headline (a third of 2010's), the legal limit, and the notes.

ASK: "What does each one want you to know?" The chart answers *what are the numbers?* The story answers *so what?*
This is slide 15's step 1 against its step 3, brought forward, so slide 15 later becomes "how the author did it"
rather than the first time students see it.

### F2 · What makes it a story (2 min, drawn)

Four parts, one per click, each pointed out on F1's story chart.

| Part | In plain words | On Marylebone Road |
|---|---|---|
| Data | the evidence | yearly NO₂ at one monitor |
| A message | the one point | "a third of the NO₂ it had in 2010" |
| An order | what you see first, then next | the fall, then what happened when |
| A reader | who it is for | the public, in seconds |

The line under it: *a narrative visualisation puts data in an order to bring a reader to a point.* This is our wording,
after Segel and Heer (2010), who use "narrative visualization" for visualisations meant to tell a story, and describe
the author's order as what separates them from a chart the reader explores alone. Kosara and Mackinlay (2013) make
the case that presenting findings this way, not only exploring data, is part of visualisation's job.

The "Six words for today" table (slide 8) goes. Each word is defined where it is first used instead: annotation and
highlight on slide 15, author-driven and reader-driven on the spectrum (F4), and martini glass on slide 32.

### F3 · Why tell a story with data? (3 min, reveal, one reason per click)

| Reason | What it means | Evidence |
|---|---|---|
| Attention | Readers glance. A headline and one colour tell them where to look. | Borkin et al. (2016), *Beyond Memorability*: titles and text are where eyes go first, and what readers recall. |
| Understanding | An order breaks a hard idea into steps. | Hullman et al. (2013), *A Deeper Understanding of Sequence in Narrative Visualization*. |
| Memory | Taking part makes data stick. | Kim, Reinecke and Hullman (2017): drawing a prediction first improves recall. The hook just did this. |
| Persuasion | A story can change what people think. | Pandey et al. (2014), *The Persuasive Power of Data Visualization*: charts shifted attitudes most where views weren't strongly held. |

The last row turns: **persuasion is where the risk starts.** A story chooses what you see, so it can choose badly.
This sets up the tricks block.

### F4 · Who drives? The spectrum, as today's map (3 min, drawn)

This is slide 31's spectrum (`spectrumSvg`), moved here and made into the map.

- **The ends:** the author drives (one message, a fixed order) and the reader drives (their own questions). Under each
  end goes Munzner's word from Week 3: *present* and *discover*.
- **Today's four parts are marked on the line:**
  - Lead, at the author's end
  - Let go, at the reader's end
  - Both, at the martini glass
  - Make it felt, an author's tool that asks the reader to take part
- **It replaces** the "Today's route" slide (slide 10) and, depending on decision D1, Week 3's Munzner slides (11–13).

The footer stays: "After Segel and Heer (2010): they name the three in the middle; the end labels are ours."

### F5 · Strong or weak? Five tests (4 min, drawn plus reveal)

Two versions of the Marylebone Road chart stand side by side:

- **A, weak:** a topic title, every monitor in rainbow colours, no limit line, no notes.
- **B, strong:** slide 15's final step.

The tests are revealed one per click. The room says A or B for each before the tick appears.

| Test | Ask |
|---|---|
| 1. One message | Can a reader say the point in one sentence? |
| 2. Evidence on the chart | Can you *see* the point in the marks, not only read it in the title? |
| 3. An order | Does each step set up the next? |
| 4. Honest context | The whole time range, a reference line, a comparison, a source? |
| 5. Fits the reader | Right for their time, what they know, and where they meet it? |

These five tests come back three times:

- in the tricks block, where each trick fails test 4;
- on "On your final infographic" (slide 48), as the checklist for each panel;
- in the lab, as a pair critique of a published story.

The critique answers review D6: the outcome "critique a published story" is now practised.

Sources, in the notes:

- Segel and Heer (2010), for messaging and ordering
- Knaflic (2015), *Storytelling with Data*, for "the big idea" in one sentence
- Cairo (2019), *How Charts Lie*, for honest context

## 3. The tricks block (after slide 21, end of Part 1)

### T1 · Same data, three tricks (4 min, live story figure)

One honest chart, then three dishonest versions of it. ASK at each: "What is this chart telling you? What did it
leave out?"

| Step | The trick | What the reader is told | Which test it fails |
|---|---|---|---|
| 1 | Honest: 2010–2025, from zero, both reference lines, hedged notes | "A third of 2010's NO₂; not yet safe" | none |
| 2 | **Pick the window:** show only 2018–2020 | "Halved in two years" (85 → 44). The flat years after (44, 43, 42, 42) are gone. | Honest context: the whole range |
| 3 | **Claim a cause:** "ULEZ cleaned this road's air" at 2019 | ULEZ did it. Yet the zone stopped at this road until October 2021, and every road fell. | Evidence on the chart |
| 4 | **Cut the axis:** start it at 30 | "NO₂ is almost gone": 31 looks like zero | Honest context: from zero |
| 5 | **Drop the context:** remove the WHO line | "Under the limit, so safe" | Honest context: a reference line |

Step 3 is the one this lecture nearly made: its first draft's "ULEZ starts" note invited the same reading (review A2).
Saying so is the honest lesson.

**Build cost:** the story figure needs two new step options, a year window (`range: [2018, 2020]`) and a
y-axis floor (`yMin: 30`). Both go in `src/figures/story.js`, with a test that a step can narrow and widen the axes.

### T2 · Persuade, or mislead? Where the line is (2 min, reveal)

- **Every story frames.** Choosing a headline, a start year and a highlight is unavoidable. Hullman and
  Diakopoulos (2011), *Visualization Rhetoric: Framing Effects in Narrative Visualization*, show that these choices
  change what readers conclude.
- **It is misleading when** the frame hides evidence the reader would need to disagree.
- **The tricks work:** Pandey et al. (2015), *How Deceptive are Deceptive Visualizations?*, found that a truncated
  axis and similar distortions changed what people believed.
- **The checklist** is test 4, honest context: the whole range, from zero (or say why not), a reference line, the
  source, and notes that say what happened, not why.

Card 1 (slide 22) gains a second line: *"…and show the reader what they'd need to disagree."*

Slide 42, "An experience can mislead, too", stays in Part 4 but gets shorter. Its "keep the scale honest" row now
points back to T1.

## 4. Changes elsewhere

- **Outcomes (slide 9):** add "Explain what makes a chart a story, and why we tell one", "Judge a story strong or weak
  with five tests" and "Spot four ways a story can mislead". "Critique a published story" stays, and is now practised.
- **Slide 15:** step 1's card no longer introduces the bare chart (F1 did). It names the move: "Start where F1 started."
- **Slide 31:** replaced by a 30-second callback, "Where are we on the line?", which is F4 again with Both lit.
- **The four cards (slide 47):** replaced by "Five tests, one checklist". This is F5's tests, the summary students
  keep. It also removes the repeat the reviewers flagged (D7).
- **The lab (slide 49):** a sixth step, *Critique*: score one published story (from slide 39's four) with the five
  tests, in pairs.
- **The student copy:** unchanged rules. The tricks block is in it, since it is the part students most need to revise.

## 5. Time

The notes' timings now total 88.7 minutes (4 optional), and the reviewers measured about 100 in the room. The target is
about 80 by the notes, so the lecture lands near 90 in practice.

| | Minutes |
|---|---|
| Now, by the notes | 88.7 |
| Add F1, F2, F3, F5, T1, T2 (F4 is moved, not new) | +18 |
| Cut slide 8 (word table; defined where used) | −2 |
| Cut slide 10 (route; F4 is the map) | −0.5 |
| Cut slides 11–13 (Munzner; her words go on F4), if D1 says so | −5 |
| Cut slide 16 (the four tools repeat slide 15) | −2 |
| Slide 31 becomes a 30-second callback | −2.5 |
| Slide 47 replaced by the five tests (same time) | 0 |
| Slide 26 (rhythms) made optional | −2 |
| Slide 46 (ladder) cut; slide 45's answers carry it | −2 |
| Slide 39 (four famous stories) shortened to the two the lecture uses | −2 |
| **Result** | **about 88.7 + 18 − 18 = 88.7** |

That still leaves it about 10 minutes long in the room. Decision D3 chooses the rest.

## 6. Decisions before building

- **D1 · Munzner.** You asked for her framework to be brought back, not reinvented. Options:
  - (a) Keep Week 3's three slides as now (no time saved).
  - (b) Keep only the Why? diagram (slide 12) and put her words on F4 (saves 3 minutes).
  - (c) Her words on F4 only (saves 5 minutes).

  Recommended: **(b)**. The diagram is the visual link to Week 3, and F4 does the rest.
- **D2 · Where the tricks go.** End of Part 1 (recommended: they use the tools just taught), or inside the foundation
  block (theory all in one place, but before students know the tools).
- **D3 · The last 10 minutes.** Pick from:
  - Part 4's "Four ways to make a number land" (3) and its Build-it (3) merged into one slide;
  - "What a reader needs to drive" (2) made optional;
  - the martini answers (slide 36, 2) made optional;
  - the recall quiz (slide 3, 3) cut to one question.

  Recommended: the first two (−5) and the recall quiz to one question (−2), which brings it to about 82 by the
  notes.
- **D4 · F5's weak chart.** A rainbow of every monitor (it fails tests 1, 2 and 4), or a plainer weak chart (a topic
  title only), so the contrast is the story and not the colours. Recommended: **plain**, because the rainbow is
  slide 24's honest dashboard and shouldn't be cast as "weak".

## 7. Build order

1. `src/figures/story.js`: the `range` and `yMin` step options, with a test. Then `npm run build`.
2. `tools/ipdv-week9/lesson.js` and `drawings.js`:
   - F1–F5 and T1–T2
   - the moved spectrum and the cuts chosen in §6
   - the outcomes, slide 22's card and slide 47
3. `tests/week9.test.js`:
   - every reason on F3 has a source
   - T1's trick numbers are the data's (85 → 44; 44, 43, 42, 42)
   - the notes total stays within the target
4. Rebuild and render every new slide's steps to check them. Then refresh the Library copies and update this
   doc's change log.

## 8. References (check before they go on slides)

- Segel, E. and Heer, J. (2010) Narrative visualization: telling stories with data. *IEEE TVCG* 16(6).
- Hullman, J. and Diakopoulos, N. (2011) Visualization rhetoric: framing effects in narrative visualization.
  *IEEE TVCG* 17(12).
- Hullman, J., Drucker, S., Henry Riche, N., Lee, B., Fisher, D. and Adar, E. (2013) A deeper understanding of
  sequence in narrative visualization. *IEEE TVCG* 19(12).
- Kosara, R. and Mackinlay, J. (2013) Storytelling: the next step for visualization. *IEEE Computer* 46(5).
- Borkin, M. et al. (2016) Beyond memorability: visualization recognition and recall. *IEEE TVCG* 22(1).
- Pandey, A. V., Manivannan, A., Nov, O., Satterthwaite, M. and Bertini, E. (2014) The persuasive power of data
  visualization. *IEEE TVCG* 20(12).
- Pandey, A. V., Rall, K., Satterthwaite, M., Nov, O. and Bertini, E. (2015) How deceptive are deceptive
  visualizations? *CHI 2015*.
- Kim, Y.-S., Reinecke, K. and Hullman, J. (2017) Explaining the gap: visualizing one's predictions improves recall
  and comprehension of data. *CHI 2017*.
- Knaflic, C. N. (2015) *Storytelling with Data*. Wiley.
- Cairo, A. (2019) *How Charts Lie*. W. W. Norton.

## 9. What the wider literature adds (checked 8 November 2026)

A search of the visualisation and data-storytelling literature, after this plan's first draft, found twelve ideas the
lecture and this plan still miss. Each is placed below on a slide that already exists in the plan, so most cost no
extra time. The ones marked **new** add a slide.

### Definitions the plan should add

1. **Exploratory and explanatory** (Knaflic 2015). Exploring is the analyst opening a hundred oysters to find two
   pearls; explaining is showing the audience the pearls. This is the plainest form of the whole lecture. It is
   Munzner's discover and present, and the two ends of the spectrum. **Goes on F4**, under the two ends, beside
   Munzner's words. Her "Big Idea" (the point in one complete sentence, with what is at stake) becomes **F5's test 1**.
2. **The storytelling process** (Lee, Riche, Isenberg and Carpendale 2015): explore the data and find insights, make
   a story from them, then tell it to an audience. The story comes *after* the analysis, never instead of it. **Goes on
   F2** as one line, and it orders the lab's steps.
3. **"Data story" has no agreed definition.** Recent reviews count dozens of definitions, and many papers use data
   story, data-driven storytelling and narrative visualisation as if they meant the same thing. A common working
   definition: a sequence of related events, in a meaningful context. **Goes in F2's notes.** It tells Level 7
   students honestly that this is a young field, and why our definition says "after Segel and Heer".
4. **A story has a shape** (**new**, F2b, 2 min).
   - Amini et al. (2015) analysed 50 professional data videos and found the film-making arc: an *establisher* (the
     context), an *initial* (what sets it moving), a *peak* (the key moment) and a *release* (what follows).
   - Kosara (2017) describes data stories that open with a claim or question and hold back the answer until the
     evidence has built up.
   - The hook is exactly this shape: the road (establisher), 2016 and the guess (initial), the 2019–20 drop (peak),
     still above WHO's guideline (release). Showing students the arc on their own hook gives "an order" in F2 and
     test 3 in F5 real content.

### Rationale and evidence the plan should add

5. **Titles frame what people remember** (Kong, Liu and Karahalios, CHI 2018).
   - When a title stated the chart's main message, readers recalled it; with a generic title, fewer did.
   - A slanted title shifted how readers interpreted the same chart.
   - Most readers still judged the chart neutral, and a follow-up (CHI 2019) found that held even when the title
     contradicted the chart.

   This is the single best study for this lecture: it is the evidence for *both* the headline (F3, attention and
   memory) *and* the danger (T2). **Goes on F3 and T2.**
6. **Rhetoric works at four layers** (Hullman and Diakopoulos 2011): the data, the visual representation, the
   annotations and the interactivity. Framing can happen at any layer, and the techniques combine. **T1's tricks are
   regrouped by layer:**
   - pick the window: the data layer (omission);
   - cut the axis: the visual layer;
   - claim a cause: the annotation layer;
   - **add a fourth trick**, the interactivity layer: a martini glass whose bowl opens on a view that hides the roads
     that didn't fall.

   T2 then names the four layers as the places to check.
7. **Graphical integrity and the lie factor** (Tufte 1983): the size of the effect drawn, divided by the size of the
   effect in the data, should be near 1. **On T1's cut axis**, students can work it out:
   - in the data, Marylebone Road fell from 98 to 31, a 68% drop;
   - with the axis starting at 30, the drawn line falls from 68 to 1, a 98.5% drop;
   - so the lie factor is about 1.4: the chart exaggerates the fall by 40%.

   This gives "honest context" (test 4) a number.
8. **Leaving out uncertainty is a frame too** (Hullman 2019). Authors say they value showing uncertainty but usually
   leave it out, partly to look confident. In our data, 2025's 31 is provisional (78% of hours). **Goes in T2** as a
   fifth trick students *don't* see: what isn't drawn. It ties to test 4.

### Counter-evidence: where storytelling doesn't work (the external examiner asked for this, review F5)

9. **Stories don't make people explore** (Boy, Détienne and Fekete, CHI 2015). In three field experiments on a news
   site and a gallery site, adding an introductory story to an exploratory chart did not raise engagement with
   exploring it. This qualifies the martini glass. Slide 36's "excellent" answer says "the bowl lets the curious find
   their own road": the evidence says most won't, so the stem must carry the message alone. **Goes on slide 33's
   card and slide 36's notes, and makes F5's test 5 sharper.**
10. **Human-shaped icons don't add empathy** (Boy et al., CHI 2017). Across seven experiments with human-rights
    data, charts drawn with human shapes ("anthropographics") had much the same effect on empathy as standard charts.
    This supports the review's change to "Human scale" (blocks, not people), and should be said aloud on slide 40,
    not left in the code.
11. **Memorable is not the same as understood** (Borkin et al. 2013). Colour, human-recognisable objects and
    unusual chart types made visualisations more memorable, but the authors warn this is not comprehension. **Goes in
    Part 4's notes and on slide 42** ("feeling is not evidence").

### For the experiential part (Part 4), which has the least theory

12. **Numbers are felt** (Kennedy and Hill 2018, *Sociology*). In the Seeing Data study, people's engagement with
    everyday visualisations was emotional as well as rational: not only the numbers, but how they feel. This is the
    rationale Part 4 is missing for why "make it felt" belongs in a data course at all. **Goes on the Part 4 divider's
    notes and in a new one-line "why" on slide 40.** McKenna et al. (2017) add the reading experience: across 80
    published stories, how a reader moves through one (scrolling or stepping, with or without animated transitions)
    shaped engagement more than how much control they had. **Goes in slide 39's notes, beside Snow Fall.**

### Optional reading for Level 7 (on Canvas, not slides)

- Segel and Heer's seven genres and their tactics are already in the notes.
- Stolper, Lee, Riche and Stasko (2016) group 20 storytelling techniques into four kinds: communicating the
  narrative, linking story elements, structure and navigation, and controlled exploration.
- Bach et al. (2018) give 18 narrative design patterns, each with a purpose such as engaging the audience, evoking
  empathy or creating flow.
- Correll (2019), *Ethical Dimensions of Visualization Research*, for the ethics row the external examiner asked for
  (review F6).

### What this changes in the plan

- **F2** gains the process (2) and the contested definition (3), and F2b (4) is added: **+2 min**.
- **F3** gains Kong et al. (5).
- **F4** gains exploratory and explanatory (1).
- **F5's tests** are sharpened: test 1 is the Big Idea, test 3 is the arc, and test 5 adds "and if they stop after
  the first screen?" (9).
- **T1** becomes four tricks, one per rhetorical layer, with the lie factor on the cut axis (6, 7): **+1 min**.
- **T2** adds the unseen fifth trick, uncertainty left out (8).
- **Slides 33, 36, 39, 40 and 42 and the Part 4 divider** gain the counter-evidence and the rationale in their cards
  or notes (9–12).
- **About +3 minutes**, which decision D3 has to find.

### Sources for §9

- [Knaflic, *Storytelling with Data*, ch. 1 (exploratory vs explanatory)](https://www.oreilly.com/library/view/storytelling-with-data/9781119002253/c01.xhtml)
- [Lee, Riche, Isenberg and Carpendale (2015), *More than Telling a Story*, IEEE CG&A 35(5)](https://www.microsoft.com/en-us/research/?p=336053)
- [*Telling stories with data: a systematic review* (2023)](https://arxiv.org/pdf/2312.01164), and a 2025 survey of 333 publications on how data storytelling is defined ([arXiv 2510.04761](https://arxiv.org/html/2510.04761v2))
- [Amini et al. (2015), *Understanding Data Videos*, CHI](https://hci.cs.umanitoba.ca/assets/publication_files/DataVideoStorytellingCHI2015_Revision_Final.pdf)
- [Kosara (2017), *An Argument Structure for Data Stories*, EuroVis short papers](https://www.tableau.com/research/publications/argument-structure-data-stories)
- [Kong, Liu and Karahalios (2018), *Frames and Slants in Titles of Visualizations on Controversial Topics*, CHI](https://mail.zcliu.cs.umd.edu/vistitles/CHI18-VisTitles.pdf), and the 2019 follow-up on [title–visualisation misalignment](https://experts.illinois.edu/en/publications/trust-and-recall-of-information-across-varying-degrees-of-title-v/)
- [Hullman and Diakopoulos (2011), *Visualization Rhetoric*, IEEE TVCG](https://mucollective.northwestern.edu/files/2011-VisRhetoric-InfoVis.pdf)
- Tufte (1983), *The Visual Display of Quantitative Information*: the lie factor ([lecture summary](https://www.cs.usfca.edu/~apjoshi/cs686-grad-vis/lectures/Graphical_Integrity.pdf); check the book before citing)
- [Hullman (2019), *Why Authors Don't Visualize Uncertainty*, IEEE TVCG](https://arxiv.org/pdf/1908.01697)
- [Boy, Détienne and Fekete (2015), *Storytelling in Information Visualizations: Does it Engage Users to Explore Data?*, CHI](https://hal-imt.archives-ouvertes.fr/hal-01133595)
- [Boy et al. (2017), *Showing People Behind Data*, CHI](https://dblp1.uni-trier.de/rec/conf/chi/BoyPESNB17.html); [Morais et al. (2022), anthropographics design space](https://hal.archives-ouvertes.fr/hal-02931257v2/file/Morais_et_al_Anthropographics_Design_Space.pdf)
- [Borkin et al. (2013), *What Makes a Visualization Memorable?*, IEEE InfoVis](https://vcg.seas.harvard.edu/publications/20130101-what-makes-a-visualization-memorable)
- [Kennedy and Hill (2018), *The Feeling of Numbers*, Sociology 52(4)](https://eprints.whiterose.ac.uk/id/eprint/106567/)
- [McKenna et al. (2017), *Visual Narrative Flow*, Computer Graphics Forum 36(3)](https://users.cs.utah.edu/~miriah/publications/narrative-flow.pdf)
- [Stolper, Lee, Riche and Stasko (2016), *Emerging and Recurring Data-Driven Storytelling Techniques*](https://microsoft.com/en-us/research/wp-content/uploads/2016/04/MSR-TR-2016-14-Storytelling-Techniques.pdf)
- [Bach et al. (2018), *Narrative Design Patterns for Data-Driven Storytelling*](https://benjbach.github.io/papers/bach2018narrative.pdf)
- [Correll (2019), *Ethical Dimensions of Visualization Research*, CHI](https://www.tableau.com/research/publications/ethical-dimensions-visualization-research)

Most of these were checked from abstracts and publisher pages, not full texts. Before a claim goes on a slide, read
the paper. This applies especially to Amini's arc names, the layer names in Hullman and Diakopoulos, and Tufte's
wording.

## Change log

- **8 November 2026:** first draft, for review. Nothing built.
- **8 November 2026:** §9 added. A literature search found twelve missing definitions, rationales and
  counter-evidence, each placed on a slide the plan already has; it adds about 3 minutes.
- **8 November 2026, built.**
  - **The foundation**, after the hook and the outcomes:
    - "A chart, or a story?" (live)
    - "What makes it a story" (four parts, with Lee et al.'s process as its sub-line)
    - "A story has a shape" (the hook as Amini's arc, with Kosara)
    - "Why tell a story with data?" (five rows, each with its source)
    - "Who drives? The line every story sits on" (the map, with explain/explore and present/discover at the ends,
      and today's four parts on the line)
    - Munzner's Why? diagram
    - "Strong or weak? Five tests" (chart A and chart B, scored one test per click)
  - **The tricks**, at the end of Part 1:
    - "Same data, five tricks" (live): honest, then the data window, a claimed cause, the cut axis (lie factor 1.4),
      a filtered bowl that leaves out Brixton Road, and what isn't drawn
    - "Persuade, or mislead? Where the line is" (the five layers, with Hullman and Diakopoulos, Pandey et al.,
      Hullman 2019 and Tufte)
  - **The story figure** (`src/figures/story.js`) gains the step options the tricks need: `range`, `yMin`, `yMax`,
    `noteList` and `hide`. Lines are clipped to the plot.
  - **Cut:**
    - Six words
    - Today's route
    - Week 3's four-level walk-through
    - Munzner's words table
    - The author's four tools
    - The ladder
    - The four cards, replaced by "Five tests for any data story"
    - The recall quiz, cut to one question
  - **Made optional:** "What a reader needs to drive", "One road, three rhythms" and the martini answers.
  - **Shortened:** the four famous stories (3 min), "Four ways to make a number land" (2) and its Build-it (2).
    Slide 31's spectrum became a 30-second callback with Both lit.
  - **Counter-evidence and rationale**, in cards and notes:
    - Boy et al. 2015 on the martini glass's live card and the martini answers
    - Kennedy and Hill on the Part 4 divider and the felt panel
    - McKenna et al. on the famous stories
    - Boy et al. 2017 and Borkin et al. 2013 on the felt panel and "An experience can mislead"
  - **Outcomes** rewritten. The lab gains a sixth step, Critique; the final-infographic slide gains "Test".
  - **Differences from the plan:**
    - The tricks became five, one per rhetorical layer (§9), not three.
    - "Make it felt" sits on the map at the interactive slideshow, an author who asks the reader to take part.
  - **Tests:** `tests/week9.test.js` adds three tests (the foundation's order and sources, the tricks' numbers, and
    Munzner on the map). The four-level test is replaced, since that slide is cut.
- **8 November 2026, presenting fixes, from the teacher's run-through.**
  - **No dimming:** a row or panel once shown stays full strength; the red marker shows the one in hand. This is a
    new `dim: false` option on the reveal and panels figures, set on every Week 9 list and panel slide.
  - **The five tests (slide 15):** charts and tests show from the start; only the A/B ticks are covered, and each
    click reveals one test's answer after the room has guessed.
  - **Chart slides:** the chart sits in a white frame with its own, smaller title, so the question is the only
    slide heading. The axis label steps back while a sub-line names the measure.
  - Every question above a chart fits on one line (tested), and the last note is now "London-wide".
