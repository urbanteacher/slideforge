# Week 10 review: could a student learn it without the teacher?

A review of the Week 10 lecture ("What does the model see?", key `ipdv-ml-w10`), done 14 November 2026, before it was taught. The plan is [ipdv-week10-plan.md](ipdv-week10-plan.md).

## 1. How it was reviewed

- **Fifty simulated learners**, each an AI agent given one persona. The personas ran from the top of the class to learners who only grasp concepts, in five bands of ten:
  - top of the class;
  - solid;
  - average;
  - struggling;
  - concepts only.

  Within the bands were traits such as English as a second language, dyslexia, deuteranopia, missed weeks, no programming before this year, and studying on a phone.
- **What each learner had.** The student copy as text (every slide's words, every revealed answer, every Build-it's code and notes, and no teacher notes), and the student PDF as page images. The first twenty couldn't open the PDF, so they judged from the text alone.
- **The same three questions for each learner:**
  1. Is every question a slide asks answered on the slides, and does the answer match the question?
  2. Is every term defined, with an example?
  3. What can't be followed alone?
- **One research check** compared the approach with Google's Machine Learning Crash Course, scikit-learn's user guide, and work on teaching AI literacy (Long and Magerko, 2020). It also checked the slides' factual claims against their sources.

## 2. What they found

**Scores.** Out of 10, the scores ran from 3 to 7, with a median of 6 (tallied from the 50 reports; the other counts below are approximate, from reading them). They fell with the persona: the top of the class gave 5–6, while struggling learners gave 3–5 (no idea what a model is, a weak coder, a mature student new to code).

The findings, most-reported first:

| # | Finding | How many raised it |
|---|---|---|
| 1 | **The core words were never defined:** model, feature, label, training and test songs, accuracy, baseline, recall, overfitting, decision boundary, correlation (r). Baseline was named only at the end; recall and overfitting were never named at all | All 50 |
| 2 | **"Two charts of importance disagree" showed one chart.** The forest's own count was described but never drawn, and nothing said which ranking to trust | Almost all |
| 3 | **Questions without a stated answer on their slide:** "strongest relationship?" (Anscombe), "56% right: good or bad?", "would you trust it?" | Most |
| 4 | **The boundary slide's numbers (32–46%) looked like they contradicted the forest's 56%,** with no word that they come from one tree on three genres and two features | Many |
| 5 | **Nothing on a slide computed 56% or the 19% baseline,** and the depth curve's best depth was never stated | Many |
| 6 | **"Change it to 2 or 20: the next slide" pointed the wrong way** (the pictures were on the slide before) | Several |
| 7 | **"A range, not a point" was asked for and never shown** | Several |
| 8 | **The ten features were never listed or explained,** and "ten columns" slides showed three | Several |
| 9 | **The summary cards were bare headlines,** with nothing to revise from | Several |
| 10 | **Others:** idioms ("listens to", "lazy model", "too wiggly") for readers whose first language isn't English; no genre key on the boundary panels for a colour-blind reader; overlapping axis labels; k-means not explained; the closing quiz had no row for stop 5; no worked "tell the public" rewrite; references to Weeks 4, 5 and 9 with no reminder | One to a few each |

**The research check's verdict was "mostly yes".**
- **What fits:** teaching ML through charts at each stage, in the order data, columns, features, errors, then honest reporting, fits the standard courses. The 98% hit model is the standard accuracy-on-rare-cases warning.
- **What was missing:** the definitions (finding 1); precision beside recall; the point that importance belongs to one model; and the note that a depth chosen by cross-validation needs a final test.
- **Facts confirmed:**
  - Anscombe (1973);
  - Strobl et al. (2007);
  - impurity importance's bias;
  - PCA needing scaled features;
  - the Spotify change. It should say "restricted for apps registered from that day", not "removed".

## 3. What was changed

- **Definitions.** Three new slides after the outcomes, each term with an example from the songs:
  - six words on one song (feature, label, model, training songs, test songs, accuracy);
  - six more for when it's wrong (baseline, recall, precision, overfitting, decision boundary, correlation);
  - the six main numbers Spotify gives each song, in its own words.
- **A setup Build-it** that names the ten features and the colours, with a chart of songs per genre.
- **Every question answered on its own slide:**
  - Anscombe's last click says "none is strongest";
  - "56% right" gets a verdict row;
  - the hit model gets "So: no";
  - the hook says that C couldn't be guessed.
- **The missing code and charts:**
  - a Build-it that draws both importance rankings side by side, before the "disagree" list. The list now says which to trust: the shuffle, and only for this model;
  - a Build-it that computes accuracy, the baseline and each genre's recall, before the confusion matrix.
- **Numbers tied together:**
  - the depth curve says its best depth;
  - the boundary panels say they are one tree on two features and three genres, give the three-genre baseline, and name each colour;
  - "the next slide" is fixed;
  - "a range" now gives one, from five different splits.
- **Precision added beside recall,** and every "lazy model" is now "the baseline".
- **The five summary cards became "Remember" lists** of three lines each, and each part's subtitle says how it follows the last.
- **A worked rewrite of the 98% headline** for the public.
- **Wording:**
  - "listens to" became "relies on";
  - "too wiggly" became "too complex";
  - Week 4, 5 and 9 references each carry a one-line reminder;
  - k-means is defined on the clustering slide;
  - the Spotify sentence follows the source.
- **Charts:**
  - the boundary panels' axes have fewer ticks, so their labels don't overlap;
  - the hit chart lost a repeated text channel;
  - the quiz has a sixth row, for stop 5.

## 4. Not changed, and why

- **Code on the slides is still dense for weak coders.** Each Build-it keeps its plain-English notes, and the tutorial notebook explains each part again. Splitting every Build-it into one idea per slide would double the deck.
- **The library way still comes before the Altair build.** That order is the lecture's design (the one-liner, then building it yourself).
- **The PCA percentage** was said to be typed by hand. It isn't: the slide and the chart's title both come from the same computed value.
- **Wider ethics** (fairness, privacy, the cultural bias of genre labels) is left for Week 11, apart from one line on who labelled the genres.

## 5. After the review: the power of ML, and which kind

The review asked whether students could follow the slides. It didn't ask whether the slides show what ML is for. A new opening section now does that (see the plan's change log):
- a ladder from one chart to a model of all ten columns;
- the five kinds of model;
- six everyday scenarios to match to a kind;
- each kind tried on the songs.

Stop 2 gained a k-means Build-it.

**The student PDF hides each slide's answers, by design:** it is a practice sheet, and the teacher PDF has the answers. So the ladder's percentages and the five kinds' questions were moved into the visible text, where they aren't hidden. The hidden answer tags still show faintly as white text in that PDF, a small glitch in the studio's handout, which hasn't been changed.

## 6. Flow, structure and delivery: 20 reviewers

Run on 14 November 2026 against the 66-slide deck: the teacher copy with its speaker notes and planned minutes, and every page as an image. There were twenty roles:
- an experienced lecturer;
- an instructional designer;
- a cognitive-load specialist;
- a narrative coach;
- a timing auditor;
- a transitions reviewer;
- an active-learning specialist;
- a presentation designer;
- a programming educator;
- a non-technical observer;
- a struggling student and a strong student;
- an external examiner;
- an accessibility adviser;
- an editor;
- a first-time presenter;
- an openings-and-closings specialist;
- a sequencing critic;
- a lab coordinator;
- a data storyteller.

**Verdicts:** from 5 to 7 out of 10, median 6. Every one says the five-stop structure is sound but that the deck can't be delivered in 90 minutes as written.

| # | Finding | How many raised it |
|---|---|---|
| 1 | **Too long.** The notes plan 95.7 minutes; with questions and reading code, 100–110 is realistic. The closing slides (quiz, AE2, lab, pair question) fall after 90 | All 20 |
| 2 | **Too much before stop 1.** About 25 minutes of front matter come first (route, outcomes, twelve definitions, Spotify's features, the why-ML section, the map). The second six definitions are needed 30–60 minutes later | Almost all |
| 3 | **The wins are told three times.** Slides 12 and 15 at the start, then 59, 60 and 61 at the end, use the same numbers (56%, 32%, 71%, 16×). The ending feels like a second lap | Almost all |
| 4 | **Slides 37 and 38 make one point twice** (the importance disagreement), and 38 has no planned minutes | Most |
| 5 | **The optional library slides (28, 35, 48) should be cut, not skipped.** Some also suggested 23 and 43 | Most |
| 6 | **Long runs of code with nothing for the room to do:** 28–31 and 42–48. Validation-curve and meshgrid code (45, 47) is lab material; slide 53 needs its chart, not its code | Many |
| 7 | **Slide 49 (last year's k-means colour mistake) is in the wrong place.** It belongs next to the k-means Build-it (31) | Many |
| 8 | **Two endings.** "What did ML help us do?" comes after stop 5's card, then a quiz. The lab hand-off (65) gets one minute, and the lecture doesn't end on a line that returns to slide 6 | Several |
| 9 | **"Hands up" is a weak interaction.** Add pair or poll moments, with the question on the slide, inside the code runs, and some silent think time | Several |
| 10 | **Others:** slide 31's notes are too long to say aloud; no read-aloud or skip cues on the code slides; colour-only cues on the boundary and heatmap; AE2 met late; a challenge for students who are ahead; the map shown at each divider | One to a few each |

### What was changed (15 November 2026)

| # | Finding | Change |
|---|---|---|
| 1 | Too long | 59 slides, 83 planned minutes (was 66 and 96) |
| 2 | Too much before stop 1 | Stop 1 now starts at 18 minutes, not 25. The front keeps six words; the other five are taught at stop 4. The map comes earlier, and two why-ML slides were cut |
| 3 | The wins told three times | One before-and-after at the end. The achievements tiles and the hits grid were cut, and their numbers moved into its notes |
| 4 | 37 and 38 make one point twice | The list was folded into the Build-it that shows both rankings |
| 5 | Optional library slides | Cut: the pairplot, the correlation heatmap and the boundary code went to the lab, and the test checks they are there |
| 6 | Code runs with nothing to do | Two pair-predict slides, with the answer on the slide (the matrix, the depth curve). The boundary code went to the lab |
| 7 | Slide 49 misplaced | Moved beside the k-means Build-it |
| 8 | Two endings | One ending: before-and-after, the quiz flash round, the neighbour question, a 3-minute lab bridge, then the opening line finished |
| 9 | Hands up | The scenarios are done in pairs, and the two predicts include silent thinking time |
| 10 | Others | Slide 31's notes were cut to what can be said; every section says "Stop n of 5" and points back to the map. Not changed: read-aloud cues on code slides, and colour on the heatmap (each boundary panel's key already names its colours) |

## 7. Slide order: 50 reviewers

Run on 15 November 2026 against the 64-slide deck, after the slides from two outside overviews of ML in data visualisation were added. The reviewers were 30 learner personas (six from each band in §1) and 20 teaching roles (the 20 in §6, with an ML lecturer and a student representative in place of two). Each reviewer proposed a full order of all 64 slides. All 50 orders were valid. The average score was 6.0 now and 7.8 after their own order.

| Move | How many proposed it | Done? |
|---|---|---|
| The outcomes (was 9) after the five-stop map, so they follow the six words and the map they rely on | All 50 moved it; 40 to after the map | Yes |
| "A chart alone, or a chart with a model?" (was 15) after the before-and-after, since its numbers (38% kept, 284 flagged) are only taught in the stops | 43 (39 after the before-and-after, 4 just before it) | Yes. Its notes now call it the recap |
| "The data can disappear" (was 57) beside "Telling the public", whose "learnt from what" row it supports | 29 moved it, most of them next to that slide | Yes, straight after it |
| "What a map of ten columns loses" (was 33) straight after PCA, before k-means | 12 | Yes: nobody argued against it, and it matches the stop 2 card |
| "Four ways ML meets data visualisation" after the five kinds | 15 | No: 33 kept it first, as the frame for the section |
| The AE2 slide just before the lab bridge | 12 | No: most kept it with stop 5 |
| Cuts: the table (13), the neighbour question (13), the route (7), the data can disappear (7) | Each under a third | No. The route is in every week's lecture |

The order changes no minutes: the planned total is still about 91.

## Change log

- 15 November 2026: §7 added: the 50-reviewer slide-order review, and the four moves made.

- 15 November 2026: §6 "What was changed" added: the restructure.

- 14 November 2026: §6 added: the 20-reviewer flow review.

- 14 November 2026: §5 added, on the new opening section.

- 14 November 2026: written after the 50-learner review and the research check, with the changes in §3.
