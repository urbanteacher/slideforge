# Week 9 · Who drives the story? Narrative and experiential visualisation: lesson plan

A plan for the Week 9 lecture of LDSCI6253 Advanced Information Presentation & Visualisation, before anything is
built. It draws on two sources:

- **The 2025 Week 9 deck** (`01_Lecture_IPDV_8.pptx` / `.pdf`, 25 slides, titled "Week 9: Experiential Data Vis").
  Despite the title, it is about **narrative visualisation**: author-driven against reader-driven, linear, martini
  glass and interactive slideshow, a TfL map critique worksheet (five parts), and London City Hall's air-quality pages
  as a case. Most slides are text with no picture.
- **The 2025 Week 9 lab** (`10_Lab_IPDV_Experiential_Data_Vis-Live.ipynb`): one air-pollution project, in five steps:
  Concept, Data, Sketch, Design, Build. It uses the WHO Ambient Air Quality Database, and its code is pandas, seaborn and
  matplotlib, with geocoding through `geopy`.

There is no Altair guide for this week, so the Build-it code is new and is checked by running it, as in Week 8.

The proposed lesson key is `ipdv-story-w9`. It is built in the `northeastern` theme by its own script,
`tools/build-ipdv-week9.js`, with its slides in `tools/ipdv-week9/`. It reuses the Week 5 and Week 8 helpers (route
drawing, `reveal`, `panels`, `rowsSvg`, `codeSvg`). Nothing in `tools/ipdv-week5/` or `tools/ipdv-week8/` changes.

**Status:** built (7 Nov 2026): 45 slides, 44 in the student copy, from `node tools/build-ipdv-week9.js`, key `ipdv-story-w9`. The decisions in §9 went as recommended, except: D3, a hands-up vote on four ranges (no live room); D5, the lab notebook is not built yet; D8, not used. See the change log.

---

## 1. The journey in one line

> Students walk in thinking **a chart is finished once it is correct**. They walk out able to say, for any chart,
> **who is driving: the author, the reader, or first one and then the other**, to pick a structure to suit the
> audience, and to make a number felt as well as read. They can build the author's tools (a headline title,
> an annotation, a highlight) and a guided-then-open chart in Altair.

The spine is Segel and Heer's *Narrative Visualization: Telling Stories with Data* (2010). They put every data story
on one line, from **author-driven** to **reader-driven**, and name three structures between the two ends:

| Structure | The idea | Who drives | Good for | Breaks when… |
|---|---|---|---|---|
| **Author-driven** (linear: a slideshow, an annotated chart, a scrollytelling story) | A fixed order with one message | The author | One clear finding, an audience that won't explore | The reader's question isn't yours |
| **Martini glass** | A short guided story (the stem), then the chart opens up to explore (the bowl) | The author first, then the reader | Giving context, then letting people find themselves in the data | The stem is so long nobody reaches the bowl |
| **Interactive slideshow** | Chapters in order, with exploring allowed inside each one | Both, in turns | Several related findings | The chapters don't add up to one story |
| **Drill-down story** | A general view, and the reader picks which story to open | The reader picks, the author tells | Many stories in one dataset (one per city, one per school) | Nobody knows where to start |
| **Reader-driven** (a dashboard, an explorer) | No set path | The reader | Experts with their own questions | The reader doesn't know what to look for |

**"Experiential"** is the course's name for the week, and it gets its own part: ways to make a reader *feel* a
number rather than just read it. Guess before you see, count it one by one, see it at human scale, hold it. The
evidence is short and fits a nervous room: people who sketch their own guess first remember the real data better
(Kim, Reinecke and Hullman, 2017).

Every technique follows the Week 5 rule: **See it** (a real, published case) → **Name it** (who drives, and what it
does to the reader) → **Build it** (Altair, one line lit at a time, beside the chart it makes).

**The data spine is London's air.** It continues the 2025 deck's City Hall case and leads straight into the lab's
WHO air-quality data:
- **One chart, told three ways:** the annual mean nitrogen dioxide (NO₂) at London roadside monitors, 2010 to the latest
  year, with the legal limit (40 µg/m³) and the WHO 2021 guideline (10 µg/m³). The same data is drawn as an author-driven
  annotated line (ULEZ starts, the line falls), as a martini glass (that story, then every monitor to explore), and as a
  reader-driven explorer (pick a borough).
- **Felt, not just read:** the hook is a guess. "How far has roadside NO₂ in London fallen since 2016?" The room
  guesses first, then the line is drawn over their guesses.
- **The lab picks it up:** the same pollutant in the WHO database, for London and the world's cities, in five steps
  from concept to build, ending in a martini glass of their own.

## 2. What carries over, so we don't repeat it

| Already taught | Where | Week 9 builds on it by… |
|---|---|---|
| Target audience | Week 5 | Who drives depends on who reads: the public gets the stem, experts the bowl |
| Tooltip, select, highlight, filter, `alt.when` | Week 5 | These are the reader's controls. This week asks **when** to hand them over, not how |
| Animation and tweening | Week 5 | Animation is the author holding the reader's hand: a sequence they can't skip |
| Colour as data; navy, red and warm white otherwise | Week 4 | Red is now the author's pen: one highlighted line, everything else grey |
| Maps | Week 7 | The pollution map is the bowl of the martini glass: "find your street" |
| The Tube map critique | Week 8 | Not repeated. The 2025 deck's five-part TfL worksheet is dropped, because Week 8 did the Tube in depth |
| Five-chart infographic | Final piece | An infographic is author-driven. The close asks which of their five panels they would open up |

**Kept for Week 11 (storytelling):** the three-act structure, the seven elements of a data story, emotion, ethics of
sensitive topics and the infographic blueprint. Week 9 is about **structure and control**; Week 11 is about the story's
**content and voice**. The plan names the line so neither week repeats the other (D2).

## 3. The student journey

### 3.1 Five stops, one question each

| Stop | Min | The question they carry | See it (real world) | Build it (Altair) | Card earned |
|---|---|---|---|---|---|
| Recall + hook | 0–10 | Has London's air got better? By how much? | The room's guesses, then the real line drawn over them | — | — |
| ① Lead | 10–30 | How do you make sure they see what you saw? | An annotated chart from the FT or ONS; NYT *Snow Fall* (2012) as scrollytelling | A title that says the finding; `mark_text` and `mark_rule` annotations; London in red with `alt.when`, the rest grey | **Say the finding in the title, then point at it** |
| ② Let go | 30–42 | When should the reader drive? | A dashboard (London Air, Breathe London's map); Shneiderman's "overview first, zoom and filter, then details" | Tooltip and a legend selection, recalled from Week 5 in two lines | **A dashboard answers the reader's questions, not yours** |
| ③ Both | 42–62 | Can you lead first, then let go? | Segel and Heer's martini glass; one published martini glass (to be chosen, §10); the interactive slideshow | A chapter stepper (`alt.param` bound to radio buttons) that brings the annotations in one at a time, then the open chart | **Lead first, then let go** |
| ④ Make it felt | 62–80 | How do you make a number land? | NYT *You Draw It* (2015); Pitch Interactive *Out of Sight, Out of Mind* (2013), one dot per strike; Lupi and Posavec's *Dear Data* (2016); a data physicalisation | Guess first: a slider draws the reader's guess, a checkbox reveals the truth | **Ask before you tell: a guess makes the answer stick** |
| Arriving | 80–90 | Can you pick the structure from the audience? | Five briefs; hands up for Lead, Let go or Both | Lab hook | All four cards, read as one sentence |

### 3.2 Words arrive after the experience

As in Week 8, a word appears after the room has used the idea. They guess before they hear "experiential". They see
the annotated chart before they hear "author-driven", and the explorer before "reader-driven". "Six words for today"
comes straight after the hook, each with an example: **narrative** (a chart with an order), **annotation** (words on
the chart, pointing), **highlight** (one thing in colour, the rest grey), **author-driven**, **reader-driven**,
**martini glass**. "Scrollytelling" and "physicalisation" are explained where they first appear.

### 3.3 Learning outcomes

By the end, students can:
1. Place a published visualisation on the line from author-driven to reader-driven, and say why it sits there.
2. Choose a structure (author-driven, martini glass, interactive slideshow, drill-down, reader-driven) for a given
   audience and message, and say what it costs.
3. Add the author's tools to an Altair chart: a title that states the finding, a text annotation, a reference line
   and a highlight.
4. Build a guided-then-open chart in Altair: a stepper for the story, then a tooltip and a selection for exploring.
5. Name three ways to make a number felt (guess first, count it out, human scale) and critique one published example.

## 4. Running order (90 minutes)

- **Recall (0–4).** Three questions on Week 8, asked before each answer shows (`reveal`): network or tree? why a
  grid? what does Beck's map give up?
- **Hook (4–10).** No title, one question: "Roadside NO₂ in London, 2016 to now: has it gone up or down, and by how
  much?" The room answers on phones (D3) or by hands up on four ranges. Their guesses go on the wall as dots. Then the
  real line is drawn over them, one year at a time. ASK: "Who was surprised? Will you remember this number tomorrow?"
  Then the route slide with Week 9 marked, then the six words.
- **① Lead (10–30).** See it: the same NO₂ data as a bare line, then with a headline title, then with two
  annotations (ULEZ central, 2019; ULEZ London-wide, 2023), then with London's line red and other cities grey. A
  `panels` figure shows the four steps side by side. See it: one published annotated chart and *Snow Fall* (a still and
  a link). Name it: four tools of the author: headline, annotation, highlight, order. Build it: three Build-it slides,
  each one word or one layer at a time, with the picture it draws.
- **② Let go (30–42).** See it: London Air's map and Breathe London's sensor map as the reader-driven end. Name it:
  Shneiderman's mantra, overview first, then zoom and filter, then details on demand. The cost: the reader has to
  know what to ask. Build it: a recall slide, the Week 5 tooltip and legend selection on this week's data.
- **③ Both (42–62).** See it: the Segel and Heer line drawn as one picture, with the 2025 deck's three structures
  placed on it and two more added (drill-down, reader-driven). A new live figure, `story`, runs the NO₂ chart from stem
  to bowl: three guided steps, then the chart opens (every monitor appears, the hover card wakes up). A published
  martini glass as the real case. Build it: a stepper that shows annotations up to the chosen chapter, then the same
  chart with tooltip and selection. Three answers to "Why a martini glass for the public?" (weak, stable, excellent),
  voted on.
- **④ Make it felt (62–80).** See it, one each: *You Draw It* (guess first), *Out of Sight, Out of Mind* (count it out:
  one mark per event), a human-scale comparison (to be chosen and checked, §10), *Dear Data* (personal, hand-made),
  and one physicalisation (to be chosen, §10). A `panels` figure puts the four moves side by side on the NO₂ data.
  Name it: guess first, count it out, human scale, make it physical. Build it: the guess slider and the reveal
  checkbox. Care: an experience can mislead as well as move; a guess-first chart must show the truth clearly.
- **Arriving (80–90).** Which structure? Five briefs (a public-health poster, a council meeting, a researcher's
  explorer, a news story about one street, the final infographic), hands up for Lead, Let go or Both. The ladder for
  anyone who got one wrong. The four cards as one sentence. The lab hook: the WHO data, five steps, end on a martini
  glass. Close: "Tell your neighbour: which of your five infographic panels would you open up for the reader, and
  why?"

The Week 8 rules apply. Recall comes first. Words are defined before use. A picture comes before a word. One `reveal`
slide per question. Statements have their words in `body`. Picture slides have a red title above and facts on the back.
Optional slides are marked "OPTIONAL: skip if short of time" in the notes, and `tests/week9.test.js` holds the
non-optional slides under 95 minutes.

## 5. Set pieces: live figures

Reused: `reveal` (recall, six words, the three answers, the briefs quiz, the ladder), `panels` (the author's four
tools, the four ways to make it felt) and `network`/`tree` are not needed. One new figure kind:

| Figure | What the room does | Steps |
|---|---|---|
| `story` | Watches one chart go from bare to told to open: headline, then annotations one by one, then the highlight, then the bowl opens (every monitor drawn, hover card on) | bare line → headline → annotation 1 → annotation 2 → highlight → open (hover a monitor to see its name and value) |
| `guess` (in the hook) | The room's guesses appear as dots on the empty chart, then the real line draws over them, year by year | empty axes → guesses → the line, year by year → the gap named |

`guess` may be `story` with a first "guesses" step, rather than a new kind. That is decided at build time; the smaller
change wins. Each figure has `figureWhy: false` and a `figureStory` panel. The words for each step go in the notes, as in
Week 8, and the last step is the still for the student copy.

## 6. Build plan

1. **Data, at build time.** London roadside and background NO₂ annual means from the London Air Quality Network (King's
   College London's Environmental Research Group) or Defra UK-AIR, 2010 to the latest full year, checked by hand against
   the source. The ULEZ dates are from TfL. The WHO Ambient Air Quality Database (2022 update) gives London beside other
   cities, the same file the lab uses. Sources go in the notes.
2. **The `story` figure** in `src/figures/`, then `npm run build`. Run `git status src/` first.
3. **Altair**, written and run in `tools/ipdv-week9/code/` through `uv`, as in Week 8. The pictures come from that run,
   so the code on every slide is the code that drew the chart beside it. Altair 5.5 syntax: `alt.when`, `alt.param`,
   `alt.selection_point`, `alt.binding_radio`, `alt.binding_range`, `alt.binding_checkbox`.
4. **Slides**, in the running order, in batches, each checked in the browser.
5. **Student copy, slide list and tests:** `tests/week9.test.js` covers the slide count, a picture beside every
   Build-it's code, no `foreignObject` and no bare `&` in SVG, at most four cards, and the time cap.
6. **The Lesson-studio copy** with `node tools/build-lab-lessons.mjs ipdv-story-w9`, once `js/lab-lessons.js` is
   clean.
7. **The lab notebook** (D5), if agreed: `Week9_Story_Lab_STUDENT.ipynb` and `_TEACHER`.

Outputs: `lessons/09_Lecture_IPDV_Narrative_Experiential.sfbundle.json` and `_STUDENT`, `js/lessons-ipdv-week9.js`
seeded into the Northeastern folder, and assets in `assets/lesson/ipdv/week9/`. The route drawing gains Week 9.

## 7. Corrections to carry over from the source deck and lab

Each fix is recorded in the slide's speaker notes, or in the notebook's teacher copy.

1. The deck is titled "Experiential Data Vis", but every slide is about narrative. The new title names both, and Part ④
   is where "experiential" now has its own content.
2. "Reading: Chapter 9". Munzner's chapter 9 is networks and trees, which was last week, and Munzner has no chapter on
   narrative. This week's reading is Segel and Heer (2010), with Munzner chapter 3's Why? (present, discover, enjoy) as
   the link back to the set book (D6).
3. Slide 6 says "Analysis Farmwork"; it should be "Framework" (the same typo as Week 8's source).
4. Slides 8 and 9 carry the footer "Lecture 7: Network and Trees".
5. Slide 13 reads "Example: The uses martini glass structure frequently": the subject is missing. It also numbers the
   structures 1, 3, 2 across the slide.
6. Slide 25 quotes City Hall: legal NO₂ limits were met "184 years earlier than predicted". That is City Hall's own
   claim, so it is checked against the *Air quality in London 2016–2024* report and attributed, not stated as fact.
7. The reminder slide says worksheets are due "the Friday after the lab at Midday". The lab notebook says "the Monday
   after the lab at 23:59". Ask which is right (D7).
8. **Lab:** "correlation martrix" is misspelt. `dropna(subset=['pm25', 'no2'])` silently drops most cities, because
   few report both. Geocoding thousands of cities through Nominatim breaks its usage policy (one request a second) and
   would take hours. The code is seaborn and matplotlib in an Altair course. If D5 goes ahead, all four are fixed.

## 8. Cautions

- **Published stories are copyright.** *Snow Fall*, *You Draw It*, *Out of Sight, Out of Mind* and *Dear Data* are
  shown as one still each, credited and linked, with the facts on the back checked online, as for every outside
  picture.
- **Air-quality numbers are easy to overclaim.** Roadside and background monitors differ by a factor of two. The WHO
  database mixes years and monitor types across cities. The lecture says which monitors it uses, and it turns "can you
  compare these cities?" into a question for the lab, not a hidden flaw.
- **ULEZ is political.** The slides draw the dates and the measurements and stop there. Cause is not claimed on a
  slide. The notes say that the fall began before ULEZ and that City Hall and its critics read it differently.
- **Guess-first can embarrass.** Guesses are anonymous (dots, no names), and the wall never shows who guessed what.
- **Altair cannot take a freehand line from the reader.** *You Draw It* lets you draw; the Build-it uses a slider for
  the guess. That limit is said plainly, and the notes link to the D3 code behind the original.

## 9. Decisions before building

| # | Decision | Recommendation |
|---|---|---|
| D1 | The data spine: London's NO₂, leading into the lab's WHO data, or generic examples? | **London's air.** The room's city, and it is the 2025 case and the lab's dataset |
| D2 | Where Week 9 stops and Week 11 starts | **Week 9: structure and control** (who drives, annotation, sequence, experience). **Week 11: content and voice** (three acts, emotion, ethics, the infographic blueprint) |
| D3 | The hook's guess: on phones through a live room (the `number` input), or by hands up on four ranges? | **Phones if a lecture lesson can open a room without leaving the deck; hands up otherwise.** To be checked at build time. The guess is the lesson's point, so it is worth the effort |
| D4 | A new figure kind `story` in `src/figures/` (and maybe `guess`) | Build `story`. Fold `guess` into it if it fits. Week 11 can reuse it |
| D5 | A lab notebook this week: the 2025 lab rewritten in Altair, the same five steps, the four fixes in §7.8, ending in a martini glass? | **Yes.** Week 8 skipped its notebook, and this lab already exists and is broken in places |
| D6 | The reading: Segel and Heer (2010), a free PDF, with Munzner ch. 1 as the link to the set book | Yes |
| D7 | Worksheet deadline: Friday midday or Monday 23:59? | Yours to say. The deck and lab both use it |
| D8 | Your own air-pollution work (the *Air Pollution Project* deck in the Library) as a guest case in Part ④? | Optional. It is a real story from the room's own teacher, but the slides would credit you by name. Say if you want it |

## 10. References (to be checked before they go on slides)

- Segel, E., & Heer, J. (2010). Narrative visualization: telling stories with data. *IEEE TVCG*, 16(6).
- Hullman, J., & Diakopoulos, N. (2011). Visualization rhetoric: framing effects in narrative visualization. *IEEE
  TVCG*, 17(12).
- Hullman, J., Drucker, S., Riche, N. H., Lee, B., Fisher, D., & Adar, E. (2013). A deeper understanding of sequence
  in narrative visualization. *IEEE TVCG*, 19(12).
- Kim, Y.-S., Reinecke, K., & Hullman, J. (2017). Explaining the gap: visualizing one's predictions improves recall
  and comprehension of data. *CHI 2017*.
- Shneiderman, B. (1996). The eyes have it: a task by data type taxonomy for information visualizations. *IEEE VL*.
- Jansen, Y., et al. (2015). Opportunities and challenges for data physicalization. *CHI 2015*.
- Lupi, G., & Posavec, S. (2016). *Dear Data*. Particular Books.
- Munzner, T. (2014). *Visualization Analysis and Design*, ch. 1. CRC Press.
- Branch, J. (2012). *Snow Fall: The Avalanche at Tunnel Creek*. The New York Times.
- Aisch, G., Cox, A., & Quealy, K. (2015). *You Draw It: How Family Income Predicts Children's College Chances*. The New
  York Times.
- Pitch Interactive (2013). *Out of Sight, Out of Mind*.
- data.europa.eu, *Data visualisation guide: the martini glass story structure* (linked in the 2025 deck).
- Kamara, A. A., & Harrison, R. M. (2021). Analysis of the air pollution climate of a central urban roadside supersite:
  London, Marylebone Road. *Atmospheric Environment*, 258, 118479.
- Still to choose: one published martini glass, one human-scale comparison, and one physicalisation, each checked online.
- Data: London Air Quality Network (Environmental Research Group, King's College London) or Defra UK-AIR; WHO Ambient
  Air Quality Database (2022 update); TfL for the ULEZ dates; Mayor of London, *Air quality in London 2016–2024*.

## Change log

- **7 November 2026:** first draft, for review. Nothing built.
- **7 November 2026, built.** 45 slides (44 in the student copy), about 81 minutes by the notes' timings, built by `tools/build-ipdv-week9.js` from `tools/ipdv-week9/`, seeded into the Northeastern folder by `js/lessons-ipdv-week9.js` (loaded in `index.html`); tests in `tests/week9.test.js`.
  - **Data:** every London Air Quality Network monitor's NO₂ annual mean, 2010–2025, with at least 75% data capture: 163 monitors, fetched once by `fetch-air.mjs` into `data/no2.json`. Marylebone Road (MY1) is the line the author tells: 98 µg/m³ in 2010, 89 in 2016, 31 in 2025, over the legal limit every year until 2024. Mile End Road (TH2, Tower Hamlets, near the campus) is the reader's road: 65 to 20. Putney High Street (WA7) was 168 in 2010. The student file is `assets/lesson/ipdv/week9/no2_london.csv`.
  - **The live figure `story`** (`src/figures/story.js`): one line chart, stepped. The hero line draws itself year by year. A headline, reference lines (legal limit 40, WHO 10) and notes arrive in turn. The other monitors fade in, grey or coloured by type. Hover gives Altair's tooltip card. The hook uses the same figure, with answer bands A–D to vote on before the line draws, so `guess` was not needed as a separate kind. It is used on four slides: the hook, the author's three moves, the dashboard and the live martini glass. `lab-app/` was rebuilt so the Lesson studio draws it.
  - **Build it:** seven Altair steps run for real (`code/steps.py` through `uv`, Altair 5.5): the bare line, a headline with `alt.Title` and `alt.datum(40)`, notes from a small DataFrame, a highlight with `alt.when`, the Week 5 tooltip and legend selection, a chapter stepper (`alt.param` with `binding_radio` driving both the stem and the bowl), and guess-first (`binding_range` and `binding_checkbox`).
  - **Drawn:** the route with Week 9 marked, Segel and Heer's line with five structures on it, the martini glass, and four panel slides (the author's four tools; overview, zoom and filter, details; three structures in between; four ways to make a number land). The four published cases (*Snow Fall*, *You Draw It*, *Out of Sight, Out of Mind*, *Dear Data*) are drawn as sketches of the move each one makes, not copies. Their facts are in the notes, to check before class.
  - **Recall, three answers and the ladder** follow the Week 8 routine: `reveal` slides, a question with its answer revealed on the same slide.
  - **Not done:** the lab notebook (D5); the Lesson-studio copy (`tools/build-lab-lessons.mjs`), because `js/lab-lessons.js` has another session's unfinished edits; until it is built, the browser converts the lesson when it opens. A browser that already opened Week 9 keeps the copy it saved then.

- **7 November 2026, Marylebone Road seen before it is guessed.** A photo slide, "Meet Marylebone Road", now comes before the hook: the road in traffic, with a red title above and four facts on its back, checked against Defra's site page (uk-air.defra.gov.uk/data/maryleboneroad): installed June 1997 by King's College London's Environmental Research Group, about 90,000 vehicles a day, a street canyon about 40 metres across, the cabin one metre from the kerb. The photo's source is not yet known, so it is hidden in the student copy until it is credited (as Week 8 did for the Gupta graphic). 46 slides; the student copy stays at 44.
- **7 November 2026, the Marylebone Road study.** The photo slide's facts gain one from Kamara and Harrison (2021), *Analysis of the air pollution climate of a central urban roadside supersite: London, Marylebone Road*, Atmospheric Environment 258, 118479 (doi:10.1016/j.atmosenv.2021.118479; free author copy in the University of Birmingham repository): over 2009–2018 traffic pollution there fell, and it peaks at rush hour, on weekdays and in winter. The full reference and its other findings are in the notes. The publisher's and repository's full text could not be downloaded, so only the abstract's findings are used.
- **7 November 2026, Munzner brought back from Week 3, and one road read three ways.** 50 slides (48 in the student copy), about 89 minutes, 85 without the optional ones.
  - **Munzner, not redrawn:** after the route, two Week 3 slides are pulled from Week 3's own source (lesson `ipdv-da` in `js/lessons.js`) by `fromWeek3()` in `lesson.js`, each build. They are the four-level walk-through (the `nested` experiment, with a new prompt: which level decides who drives?) and her Why? diagram (`munzner-why-tasks.png`, now with a red title above and facts on its back). Her Consume actions are this lecture's parts: present is Lead, discover is Let go, present then discover is Both, enjoy is Make it felt. Under Produce, Annotate is the author's notes. A table, "Munzner's words, today's words", lays this out on Marylebone Road, and each Part's divider names its Munzner word. `tests/week9.test.js` fails if Week 3 loses either slide. The reading line now says chapter 3 (it said chapter 1, which was wrong).
  - **One road, three rhythms** (Part 2, after the mantra): Marylebone Road's 2025 hourly NO₂ (`fetch-hourly.mjs` → `data/my1-patterns.json`, London clock time, 6,870 of 8,760 hours). Weekdays run from 15.9 at 3 am to 41.3 at 5 pm, with weekends lower and flatter. Friday is the worst day (35.6) and Sunday the cleanest (23.7). By month, one year is too patchy (February, March and December are under 75% capture, December 27%), so the slide shows those months pale and points to Kamara and Harrison's ten years for the winter peak.
- **7 November 2026, the question stands out; the key moves onto the chart.** A new figure option, `figureCaptionTop` (`kit.js stage`, carried by the Lesson studio in `fromSlideForge.ts`): the step's caption, the question the room answers, stands under the title in bold, larger, with a red marker, kept clear of the story panel; the source line moves to the foot. Week 9's four NO₂ chart slides use it; no other week changes. The story figure's chart starts lower to make room. The "How to read it" panel is gone from those slides: Marylebone Road's line is named on the chart beside its start (`heroLabel`), and the other roads' key is one row along the chart's top edge (`keyOnChart`), shown only while those lines are.

- **7 November 2026, the chart slides de-cluttered.** On the hook's answer step the right band (D) is lit with a tick and the other three fade, so the line reads over them. Marylebone Road's end value sits below its point with a halo (it sat on the legal-limit line), and steps back when a reader's road is lit. Questions above a chart headline are kept to one line, and `tests/week9.test.js` checks it. Note for presenting: a browser keeps the copy of a built-in lesson it first filed (`js/builtins.js` seeds a lesson only when its key is missing), so a rebuilt Week 9 reaches a browser only once that copy is deleted from the Library.
- **8 November 2026, the review's facts and code fixed** (sections A and B of `docs/ipdv-week9-review.md`, ten personas).
  - **Facts:**
    - WHO's 10 is a guideline, not "safe": harm is seen below it.
    - The 2019 ULEZ is noted as stopping at Marylebone Road. The road is the Inner Ring Road, the zone's uncharged boundary; the notes now mark 2019 (central zone, this road its edge), 2020, 2021 (ULEZ reaches this road) and 2023.
    - The dashboard says 163 monitors have run since 2010 and 59 reported in 2025, and "nearly every line fell".
    - Brixton Road is added: 174 in 2010, 48 in 2025, the one monitor over the limit.
    - 2025 is marked provisional.
    - Segel and Heer's end labels are credited as ours, with their tactics and genres in the notes.
    - Munzner's Annotate is the reader's. Enjoy is "nearest", and Part 4 is "present, made memorable".
    - Kim et al. is described as drawn predictions.
    - "Count it out" now counts monitors over the limit (60 of 87 in 2010, 1 of 59 in 2025). "Human scale" uses blocks of the WHO guideline, not people.
    - Kerbside is about twice background, not "a park".
    - The rhythm panels state only what one year shows.
    - NO₂, µg/m³ and ULEZ are defined where they are first used, with one line on health.
  - **Code** (`code/steps.py`):
    - Build-its 19–21 and the martini glass now grow one chart, and each slide prints only its new lines.
    - Highlight layers grey then red; `alt.Order` was wrong.
    - The martini glass opens at chapter 1 (headline, then notes, then the bowl) and keeps its axis still. Its bowl has points, so the tooltip answers for the year pointed at.
    - The guess is one point at 2025, with a thicker truth line.
    - The dashboard's colours match the live chart.
    - Each code panel says it runs after the first Build-it's setup.
  - **Tests:** `tests/week9.test.js` adds two tests, the facts and the code.
- **8 November 2026, the review's layout and accessibility fixed** (section C).
  - **Story figure** (`src/figures/story.js`, rebuilt into `js/model.js` and `lab-app/`):
    - Each note's rule now rises only to its own note, and the words start at its top. Notes fall in height from left to right, so no rule crosses another note's words. The note labels are short ("Central ULEZ", "Lockdown", "ULEZ reaches here", "ULEZ: all London"), and the card gives the detail.
    - Once the hook is answered, only the right band keeps its words.
    - The WHO line is blue, not green.
    - The other lines are a darker grey (#aab4bf), and the key and subtitle are a size larger.
  - **Story cards:** the bold first lines no longer repeat the question above them.
  - **Colours:** the monitor types use Okabe and Ito's colour-blind-safe set. Road monitors are warm and the rest cool, dark then light in each pair. The same colours are used on the live chart and in the Altair dashboard code.
  - **Altair pictures:**
    - Rendered with larger text and level year labels every five years. This is display only, and the bare Build-it's caption says so.
    - Every printed code line is 66 characters or fewer, so the code prints larger.
    - The notes' rules stop at their note (`y2=alt.datum(0)`).
  - **New file for Canvas:** `assets/lesson/ipdv/week9/week9_build_its.py` has every Build-it as one runnable file (checked by running it). The "Before we start" slide names it.
  - **Drawings:** text under 15px raised to 15, and the martini and line-slide grey print raised to 18.
  - **Title slide:** the title is set on two lines, so it stays clear of the theme's red N. Its low contrast in the review was a still caught mid-animation.
  - **Tests:** `tests/week9.test.js` holds code line length, falling notes and the type colours.
