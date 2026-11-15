# Week 10 · What does the model see? Visualisation for machine learning: lesson plan

A plan for the Week 10 lecture and lab of LDSCI6253 Advanced Information Presentation & Visualisation, written before anything is built. It draws on three sources:

- **The 2025 Week 10 deck** (`01_Lecture_IPDV_10.pptx`, 27 slides, "Week 10: Machine Learning").
  - It walks through the Iris dataset: missing values, histograms and box plots, a correlation matrix, petal against sepal, cleaning, then the three tasks (classification, regression, clustering), building models, feature engineering, tuning and evaluation.
  - Most slides are text. Its recap slide repeats the Week 9 outcomes.
- **Dimitris Mylonas's LDSCI5209 lecture** (`Story telling/Data Vis Stories/11_Lecture_IPDV_Machine_Learning.pdf`, 30 slides). It has the stronger spine, in four parts:
  1. exploration and preprocessing;
  2. high-dimensional data and reduction;
  3. feature engineering and importance;
  4. model performance: residuals, over- and underfitting, ROC and confusion matrix, decision boundaries, tuning.
- **The AE2 brief for 2026–27** (hand-in 27 November 2026). It names "visualisation for machine learning" among the Weeks 8–11 ideas that AE2 must show. The green-jobs data on Canvas is the AE2 data, so the lab should use it.

The proposed key is `ipdv-ml-w10`, in the `northeastern` theme, as with Weeks 8 and 9.

**Status:** built, reviewed and restructured to fit (15 Nov 2026): 59 slides (58 in the student copy), 83 planned minutes from `node tools/build-ipdv-week10.js`, key `ipdv-ml-w10`; the lab tutorial, challenge and solutions in `lessons/10_*`. §10 says what was built and where it differs from this plan. Not committed yet.

---

## 1. The journey in one line

> Students walk in thinking **a model's result is a number** ("95% accurate"). They walk out able to use a chart at each stage of the model: **before it** (is the data fit to learn from?), **inside it** (what does it pay attention to?), and **after it** (where is it wrong, and how sure is it?). They can say what a model's claim hides, and build each check in Altair.

The course stays a visualisation course. The model is three lines of scikit-learn, treated as a box. The charts are what we teach.

## 2. What carries over, so we don't repeat it

- **Distributions, binning and box plots:** Weeks 2–3. Here they become the "look before you model" check, not a new chart.
- **Linked brushing** (`selection_interval`): Week 5. Here it is used on a scatter-plot matrix to find a cluster.
- **Colour for categories and diverging scales:** Week 4. Used on the correlation heatmap and the confusion matrix.
- **Honest context and the reader's trust:** Week 9. It returns at stop 5 as "what a model's headline hides".
- **Left for Week 11:** the three acts, emotion and the infographic blueprint.

## 3. The student journey

### 3.0 One theme students know: songs

The lecture is **rebuilt**, not patched. It keeps the parts of the 2025 deck listed in §7, but runs on one dataset students already have opinions about, instead of Iris.

**Chosen: songs and their audio features.**

- **Source.** TidyTuesday, 21 January 2020, `spotify_songs.csv`:
  - URL: `https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2020/2020-01-21/spotify_songs.csv`, 8.0 MB.
  - Collected from Spotify's API with the `spotifyr` package, after Kaylin Pavlik's genre-classification blog post.
  - The TidyTuesday repository is CC0. The data itself came from Spotify's API.
- **Shape.** 23 columns:
  - names: track, artist, album and playlist;
  - `track_popularity` (0–100);
  - `playlist_genre` and its subgenre;
  - the audio features danceability, energy, key, loudness, mode, speechiness, acousticness, instrumentalness, liveness, valence, tempo and duration.

**What the data shows.** Each figure below was computed on 14 Nov 2026 (scikit-learn 1.9, `random_state=0`, a 25% test split, one row per unique track). The build computes them again; none is typed onto a slide.

| Stop | With songs (computed) |
|---|---|
| 1 Look before you model | **32,833 rows but only 28,356 different tracks.** 1,687 tracks sit in more than one genre, because the genre is the *playlist's*, not the song's: the label itself is noisy. Also: 2,703 songs with popularity 0, one with tempo 0, a 4-second "track", and 5 missing names. Release years run from 1957 to 2020 (median 2016) |
| 2 Too many columns | Ten features. **PCA's two axes keep only 38% of the variation** on the lecture's 4,000-song sample (22% + 15%), so the "map of songs" loses most of it. Energy and loudness are correlated (r = 0.68); energy and acousticness are opposed (r = −0.55) |
| 3 What does the model listen to? | Permutation importance for genre: **danceability, speechiness, tempo**, then energy. Liveness adds nothing. The forest's built-in importance ranks tempo first and is flatter, which shows why two "importance" charts can disagree. Rap has the highest mean speechiness (0.20 against rock's 0.06) |
| 4 Where is it wrong? | Genre from audio alone: **a random forest gets 56% right** (logistic regression 46%). Guessing the commonest genre gets 19%. Rock, rap and EDM are about 70% recalled; **Latin only 38% and pop 40%**. Pop is confused with rock and R&B, Latin with pop and rap. The confusion matrix shows it at a glance |
| 5 Tell the public | **"AI predicts hits with 98% accuracy."** A model for "popularity 80 or more" (1.8% of songs) scores 98.1%. Always answering "not a hit" scores 98.2%, and the model finds only 7 of the 127 real hits in the test set (5.5%). Predicting the popularity number from audio gives R² = 0.07, with a mean error of 19.1 points against 20.0 for guessing the average |

Two hooks:
- **Opening: "Guess the genre from the numbers."** Show one song's feature values, take the room's guess, then name the song.
- **Ending: the data can disappear.** On 27 November 2024 Spotify withdrew Audio Features and Audio Analysis from new Web API apps (Spotify for Developers blog, "Introducing some changes to our Web API"). A dataset like this one can't be collected again the same way.

**Other themes considered:**
- **London Airbnb listings** (Inside Airbnb): rent-price prediction, lots of missing values, and a map. It's close to students' lives, but the files are large.
- **Premier League player stats:** popular, but the data's licence is unclear.
- **Student grades** (UCI): relatable, but about students themselves, so marking them feels uncomfortable.
- **Penguins:** clean and safe, but nobody cares. It's kept as the fallback if the songs file doesn't check out.

### 3.0b The ML libraries, beside Altair

Each stop shows **the one-line library chart first, then the Altair build.** Students see what the ML world uses, and still learn to build and control the chart themselves:

| Stop | The library way (one line) | Then in Altair |
|---|---|---|
| 1 | `seaborn.histplot`, `df.isna()` with `missingno` | Binned histogram, box plot, missing-values bar |
| 2 | `seaborn.pairplot`; `sklearn.decomposition.PCA`, `sklearn.manifold.TSNE` | `repeat` matrix with a brush; PCA scatter with tooltips |
| 3 | `df.corr()` with `seaborn.heatmap`; `model.feature_importances_`, `sklearn.inspection.permutation_importance` | Heatmap `mark_rect` with values; a sorted importance bar |
| 4 | `ConfusionMatrixDisplay`, `DecisionBoundaryDisplay`, `learning_curve` / `validation_curve` | Confusion matrix, boundary grid, a training-against-test curve |
| 5 | SHAP or `PartialDependenceDisplay`, named as further steps | A per-group error chart for the public |

The models come from **scikit-learn**: `train_test_split`, `StandardScaler`, `KMeans`, `LogisticRegression` and `RandomForestClassifier`. Altair 6.3 and scikit-learn 1.9 both run here. SHAP and missingno are optional extras, not lab requirements.

### 3.1 Five stops, one question each

| # | Stop | The question | What they see | What they build in Altair |
|---|---|---|---|---|
| 1 | Look before you model | Is the data fit to learn from? | Datasets with near-identical summary statistics but different shapes (the opener); then the songs: duplicates, genre labels that disagree, zero popularity, a 0 tempo | Histogram and box plot per feature; a missing-values chart |
| 2 | Too many columns | How do you see eight columns at once? | A scatter-plot matrix; the same data squashed to two axes (PCA) | `repeat` matrix with a brush; a PCA scatter with tooltips |
| 3 | What does the model listen to? | Which features matter? | A correlation heatmap; a feature-importance bar chart | `mark_rect` heatmap with values; a sorted importance bar |
| 4 | Where is it wrong? | Is the model any good? | A confusion matrix; residuals; a too-simple and a too-wiggly fit; a decision boundary | Confusion matrix as `mark_rect`; residual plot; boundary as a coloured grid under the points |
| 5 | Tell the public | What does "95% accurate" hide? | One headline accuracy against the same model's errors, per group | A per-group error bar chart with uncertainty |

### 3.2 Words arrive after the experience

As in Week 9, each stop opens with something to look at or guess. The terms come after: dimensionality, feature importance, overfitting, confusion matrix.

- Stop 1 opens with "Which of these four has the strongest relationship?". All four have the same correlation.
- Stop 4 opens with "This model is 98% accurate at spotting hits. Would you use it?". Only 1.8% of songs are hits, and saying "no" every time scores 98.2%.

### 3.3 Learning outcomes

By the end, students can:

1. Use distribution, missing-value and outlier charts to judge whether data is ready for a model.
2. Explore high-dimensional data with a linked scatter-plot matrix and a two-axis projection, and say what a projection loses.
3. Read and build a correlation heatmap and a feature-importance chart, and say why neither shows cause.
4. Read and build a confusion matrix, a residual plot and a decision boundary, and recognise over- and underfitting.
5. Explain a model's result to a general audience without hiding its errors or its uncertainty, which is an AE2 skill.

## 4. Running order (90 minutes)

| Time | Part | Notes |
|---|---|---|
| 0–12 | Opening | Recall, the route, the "guess the genre" hook, the lecture's one line, outcomes, six words, Spotify's features, the five-stop map |
| 12–18 | Why use a model, and which kind? | The ladder (guess, one chart, one scatter, a model), the five kinds, six everyday scenarios matched in pairs |
| 18–30 | Stop 1: Look before you model | Anscombe, the songs before any model; the setup, histogram and box plot built |
| 30–42 | Stop 2: Too many columns | A pair-predict, the brushable matrix, PCA, k-means, then last year's k-means colour mistake |
| 42–48 | Stop 3: What does the model rely on? | Shuffle importance, then both rankings side by side and which to trust |
| 48–62 | Stop 4: Where is it wrong? | Five words for checking a model; 56% good or bad; the score, the confusion matrix both ways; a pair-predict, the depth curve; three trees' boundaries |
| 62–74 | Stop 5: Tell the public | The 98% hit model, the honest comparison, the rewrite, five rules, AE2, the data can disappear |
| 74–83 | Arriving | One before-and-after, a quiz flash round, the neighbour question, the lab bridge (R&B or rap), the lecture's line finished |

The times are the speaker notes' planned minutes. The flow review found delivery runs 10–15% over the notes, which brings this to about 90.

## 5. Set pieces

The rule from AGENTS.md is that every word on a slide is editable in the studio. So the lecture is built from studio layers (a lesson file where its layouts fit). A live figure is used only where layers can't do the job:

- **The complexity slider** (stop 4): one dataset, a fit whose wiggliness steps on Next, with training and test error drawn beside it. This is a stepping chart, so it is a live figure, with its words in its data.
- **The guess-the-correlation opener** (stop 1): four scatters, and the shared statistics revealed on the next click. This is layers with build steps.
- **The Build-its:** code beside the chart it makes, one line lit at a time, as in Weeks 5–9.

## 6. The lab (one hour)

Tutorial, challenge and solutions, built like Week 9's (`nbformat`, the teacher copy run end to end, blanks marked `⟦…⟧`).

- **Tutorial:** the five stops' Build-its on the songs data, each with the library one-liner, the Altair build and a Try-it.
- **Challenge: "R&B or rap? Check the model"**, the same five checks on a new question (D3, as built). The green-jobs data is a stretch on the lecture's AE2 slide.
- **What it hands to AE2:** one model-check chart with a paragraph on what it shows and what it can't.

## 7. The 2025 deck, slide by slide: what to keep and what to fix

All 25 pages of `01_Lecture_IPDV_10.pdf` were looked at, pictures included. Every chart in it is a Plotly or Streamlit screenshot with no code beside it, which students said they wanted (the See → mechanics → build rule).

**Keep:**
- **Munzner's What / Why / How** (slides 6–8) and **Chapter 15** as the reading. Use them to frame each ML chart as a task: *discover distribution*, *compare*, *locate outliers*.
- **The three tasks** (classification, regression, clustering) with London examples: poverty rate by borough, clustering boroughs (slide 19). An earlier draft (`01_Lecture_IPDV_8.pptx`, slides 9–10) began a "London poverty data" thread. A local example beats flowers. Its data and figures would need a source.
- **Feature transforms** (slide 24): original, standardised, square root and log of one feature. Standardising doesn't change a histogram's shape, which is worth saying out loud.
- **The tuning curve** (slide 25: training and test loss against the regularisation strength). This is stop 4's over- and underfitting idea.
- **Predicted against actual** with a "perfect" diagonal, and the **error histogram** (slide 26).

**Turn into teaching moments.** These are real mistakes in the deck, so they make good "spot the problem" slides:
- **The clustering slide (21)** colours cluster numbers 0, 1 and 2 on a **continuous blue scale**, with a colour bar running 0–2. The lightest cluster almost vanishes. Cluster labels are categories, so this is the Week 4 lesson. Recolour it with a categorical palette.
- **"Building models" (23)** fits one straight line through all three species: petal length falls as sepal width rises. Within each species, the relationship looks positive. The groups hide the trend, a Simpson's-paradox case. It belongs at stop 4 ("where is it wrong?"), with the per-species lines added. **Check it** by computing the slopes in the build before saying so on a slide.
- **"95% accurate is easier to understand than loss = 25"** (26) is shown as good practice. Stop 5 questions it, since accuracy hides which errors and for whom.

**Fix:**
- The recap slide (3) lists the Week 9 outcomes under a Week 10 heading.
- The reading slide's footer says "Week 9".
- Typos: "Dectected" (12).
- It calls the Iris dataset "The Star data" (15).
- "Iris has no missing values" (11, 16) means stop 1 has nothing to show. That's one reason for D1.
## 8. Cautions

- **Don't invent figures.** The datasets' statistics are computed in the build, and nothing is typed from memory.
- **Check citations before they go on slides:** the "same statistics, different picture" datasets (Anscombe 1973; Matejka and Fitzmaurice 2017), PCA, and any ROC or confusion-matrix reference.
- **Keep the ML light.** Every model is a scikit-learn call. No maths beyond "the model draws a line" and "the model draws a boundary".
- **Dependencies:** the lab needs `scikit-learn` next to Altair and pandas. Check it's in the students' environment.

## 9. Decisions before building

| # | Question | Recommendation |
|---|---|---|
| D1 | The lecture dataset | **Songs (TidyTuesday Spotify, §3.0)**: relatable, six genres, ten features. Penguins is the fallback. Iris is dropped |
| D1b | Library first, then Altair? | **Yes, at every stop (§3.0b).** The scikit-learn and seaborn one-liners, then the Altair build |
| D2 | Lab data | **The AE2 green-jobs files**, so the lab feeds the assessment. Penguins stays for the tutorial |
| D3 | The challenge task | **Built as: R&B or rap, on the songs.** The five checks need a dataset big enough to train on; the green-jobs files are small summary tables. The green-jobs data stays a stretch for AE2 |
| D4 | ROC curves | **Leave out.** The confusion matrix carries the idea with less to explain; ROC stays a "further" note |
| D5 | A live room activity (guess the correlation on phones) | **A hands-up vote** as in Week 9, unless you want the room |
| D6 | Week 11 split | **Week 10: models and their checks. Week 11: evaluation and storytelling**, as in the AE2 brief |

## 10. What was built

- **The lecture** (`tools/build-ipdv-week10.js`, slides in `tools/ipdv-week10/lesson.js`, drawings in `drawings.js` and `power.js`): 59 slides in the `northeastern` theme, keyed `ipdv-ml-w10`, with a student copy that hides only the neighbour question. §4 gives the running order.
  - **Opening:** recall, the route (Week 10 marked, then Week 11 and AE2), the "guess the genre" hook, the one-line statement, outcomes, six words (feature, label, model, training and test songs, accuracy, correlation), Spotify's features, the five-stop map.
  - **Why a model, and which kind:** the ladder, the five kinds, six everyday scenarios.
  - **Each stop:** a section naming its place on the map ("Stop 2 of 5"), a see-it or guess-first opener, the library one-liner where it adds something, the Altair build, a card. Two pair-predict slides, at the matrix and the depth curve, with the answer on the slide.
  - **The hook's songs:** Suge (DaBaby) as rap, Highway to Hell (AC/DC) as rock, and Ed Sheeran's Perfect, filed as Latin: the label is the playlist's. Each is filed under one genre only; the first draft used Life Is Good and Blinding Lights, which the file puts under four genres each.
  - **Stop 1 opener:** Anscombe's quartet (1973), four panels; its statistics checked by computing them.
  - **Stop 2:** the k-means Build-it, then last year's clustering slide as "spot the problem".
  - **Stop 4:** five words for checking a model (baseline, recall, precision, overfitting, boundary), the 56% opener, the confusion matrix both ways, the depth curve, one tree at depths 2, 6 and 20 (panels).
  - **Stop 5:** the 98% hit model, the honest comparison, the public rewrite, five rules, AE2, and "the data can disappear" (Spotify's 27 November 2024 change).
  - **Arriving:** one before-and-after chart, a quiz flash round, the lab bridge, and the opening line finished.
  - **Taught in the lab, not the lecture:** seaborn's pairplot, the correlation heatmap, and the boundary grid both ways. Their Build-its are in the tutorial and `week10_build_its.py`; `LAB_ONLY` in `lesson.js` lists them and the test checks they are there.
- **Every word editable:** the revealed lists become studio layers (the reveal converter); the two panel slides (Anscombe, the boundaries) stay live figures whose words are in the Figure tab; the Build-its are SVG pictures that unpack to text layers on double-click.
- **Every number computed:** `tools/ipdv-week10/code/steps.py` runs each slide's code, draws its picture and writes `data/facts.json`, which the slides read. It asserts the stories still hold (rap the wordiest, the hit model no better than "no", the depth curve overfitting, the opener's songs single-genre).
- **Pictures kept small:** every chart PNG is cut to 64 colours, so `js/lessons-ipdv-week10.js` is about 0.4 MB (5.7 MB before), like Week 9's.
- **Data:** `assets/lesson/ipdv/week10/songs.csv` (5.9 MB, every row kept, three id and name columns dropped), from `fetch-songs.py`.
- **Two fixes found by running the code:**
  - The file is sorted by playlist, so the first draft's depth curve (unshuffled folds) peaked at 41% instead of 47%. The setup now shuffles once, and the Build-it says why.
  - The boundary grid was 80 × 80 (6,400 rows), over Altair's 5,000-row limit in a notebook. It's now 60 × 60.
- **The lab** (`lessons/`):
  - `10_Notebook_IPDV_Machine_Learning.ipynb` (`code/notebook.py`): every code slide in order, with Try-its and folded model answers. It runs end to end (`--run` writes the teacher's `_RUN` copy, not committed). It also writes `week10_build_its.py`.
  - `10_Activity_IPDV_Model_Check.ipynb` and `_Solutions` (`code/activity.py`): "R&B or rap?", parts A–F, 16 blanks, checks, an error guide, plan-B pictures and a 6-mark marking guide. Its numbers: 201 songs filed as both, 78% against 53%, rap recognised 84% and R&B 72%, best depth 9.
- **Test:** `tests/week10.test.js` (6 tests): built in and seeded, under 1 MB, every Build-it's picture, plain SVG, the spoken numbers match `facts.json`, the lab files.
- **Not done:**
  - The Simpson's-paradox slide from §7 (last year's "Building models" line) was left out, because its slopes would need the Iris data.
  - The Canvas folder hasn't been made yet.

## Change log

- 15 November 2026: restructured after the 20-reviewer flow review, from 66 slides and 96 planned minutes to 59 and 83 (§4):
  - **Opening:** one definitions slide of six words; the other five move to stop 4, where they are first used. The map comes before the why-ML section. "Each kind, tried on the songs" and its card were cut.
  - **Stops:** the pairplot, the correlation heatmap and the boundary code (both ways) moved to the lab. The importance "disagree" list was folded into the Build-it that shows both rankings. Last year's k-means slide moved beside our own k-means. There are two pair-predict slides, and each section says "Stop n of 5".
  - **Ending:** "What did ML help us do?" and the hits grid were folded into one before-and-after. AE2 moved up beside the public rewrite. The quiz is a flash round. The lab bridge is three minutes, on what changes with two genres. The last slide finishes the opening line.
  - **Notes:** every slide has its minutes, and slide 31's notes are short enough to say aloud. A hand-typed 44% is now computed.
- 14 November 2026: the power-of-ML slides redrawn as pictures for a reader who isn't technical (`tools/ipdv-week10/power.js`, all from `facts.json`). They are revealed one part per click:
  - the genre ladder as bars;
  - five kinds of ML, each as a small picture of what it does;
  - each kind on the songs, as real mini-charts;
  - six big numbers for what ML helped us do;
  - a before-and-after dumbbell chart, without ML in grey and with it in red;
  - 100 picks at random against the model's 100 picks.

  The everyday scenarios have icons. New facts: a one-chart rule's recall per genre (rock 0%, R&B 0%); an isolation forest's 284 odd songs, which include the tempo-0 song and both very short tracks; and the hit shortlist, 29% hits against 1.8% at random.

- 14 November 2026: a new opening section, "Why use a model, and which kind?" (6 slides), asked for so students see the power of ML and which kind suits which everyday question before checking any of it:
  - **the ladder:** always the commonest genre 19%, the best one-chart rule (tempo) 32%, the best scatter rule 37%, the forest on all ten numbers 56%;
  - **five kinds of model**, each with an everyday question: classification, regression, clustering, similarity, anomaly detection;
  - **"Which kind would you use?":** six everyday scenarios, each with its answer and the reason;
  - **each kind tried on the songs.** Regression on popularity fails (R² 0.07);
  - **a Remember card**.

  Also a k-means Build-it at stop 2: five groups, no genres given, that cut across genres like moods. It is in the tutorial too (§2d). All figures are computed in `steps.py`, which asserts the ladder still climbs. The deck is now 62 slides, about 12 minutes more than the 90-minute slot; the optional slides are marked.

- 14 November 2026: reviewed by 50 simulated learners and a research check ([ipdv-week10-review.md](ipdv-week10-review.md)). Added: two definitions slides, Spotify's features, a setup Build-it, both importance charts, a scoring Build-it, verdicts on every question slide, "Remember" cards, a worked public rewrite, precision and a range. 55 slides (54 in the student copy).

- 14 November 2026: built (§10). The figures in §3.0 updated to the built ones: 56% genre accuracy (shuffled), PCA 38% on the sample, 7 of 127 hits found. D3 changed: the challenge is R&B or rap.

- 14 November 2026: songs file downloaded and checked; §3.0 now gives the computed figures (57% genre accuracy, the 98% hit model, PCA 37%), the source and the licence; the Spotify API date checked.
- 14 November 2026: a relatable theme (songs, §3.0) and the ML libraries beside Altair (§3.0b) added; D1 changed from penguins to songs.
- 14 November 2026: §7 rewritten after looking at every page of the 2025 deck, pictures included, and its earlier draft (`01_Lecture_IPDV_8.pptx`, London poverty).
- 14 November 2026: plan written from the 2025 Week 10 deck, the LDSCI5209 ML lecture and the 2026–27 AE2 brief.
