'use strict';
/* Week 10 · What does the model see? Visualisation for machine learning: every slide, in teaching order.
 * The plan is docs/ipdv-week10-plan.md. Five stops along a model's life; at each, see it, name it, the
 * library's one line, then build it in Altair. One dataset throughout: about 30,000 songs and their Spotify
 * audio features (TidyTuesday, 21 January 2020). Every number comes from data/facts.json, which
 * code/steps.py computes from songs.csv: none is typed by hand. */
const D = require('./drawings.js');
const P = require('./power.js');
const F = D.FACTS, pct = D.pct, n = D.n;

const DIR = 'assets/lesson/ipdv/week10';
const asset = name => `${DIR}/${name}`;
const drawn = (title, file, notes, extra) => Object.assign({ type: 'image', title, image: asset(file), imageFit: 'contain', design: { capStyle: 'none' }, notes }, extra || {});
const photo = (title, file, facts, notes) => ({ type: 'image', title, image: asset(file), imageFit: 'contain', design: { capStyle: 'top' }, body: facts.join('\n'), notes });
const section = (title, part, notes) => ({ type: 'section', title, subtitle: part, notes });
const statement = (title, notes) => ({ type: 'statement', title, body: title, notes });
const reveal = (title, eyebrow, key, captions, notes) => {
  const data = D.REVEAL[key], start = data.mode === 'answers' ? -1 : 0;
  return { type: 'figure', figure: 'reveal', title, figureGround: 'paper', figureEyebrow: eyebrow, notes,
    figureAlt: `${title}: ${data.rows.map(r => [r.name || r.say, r.tag && r.tag.text, r.text].filter(Boolean).join(', ')).join('; ')}`, figureData: { ...data, dim: false },
    figureSteps: captions.map((caption, i) => ({ caption, upto: start + i })) };
};
const panelFig = (title, fn, k, captions, notes) => ({
  type: 'figure', figure: 'panels', title, figureGround: 'paper', figureWhy: false, notes,
  figureAlt: `${title}: ${captions.join(' ')}`,
  figureData: { svg: D[fn]().replace(/^<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">'), boxes: D.panelBoxes(k, { sub: true }), ground: '#fbfaf8', dim: false },
  figureSteps: captions.map((caption, i) => ({ caption, upto: i }))
});


/* A picture of the power-of-ML part, revealed one part per click (a panels figure; its words are in the Figure tab). */
const pfig = (title, svg, boxes, captions, notes) => ({
  type: 'figure', figure: 'panels', title, figureGround: 'paper', figureWhy: false, notes,
  figureAlt: `${title}: ${captions.join(' ')}`,
  figureData: { svg: svg.replace(/^<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">'), boxes, ground: '#fbfaf8', dim: false },
  figureSteps: captions.map((caption, i) => ({ caption, upto: i }))
});
const top = Object.keys(F.permutation), own = Object.keys(F.builtIn);
/* A part's closing card: what to remember, in three lines (the 50-learner review asked for more than a headline). */
const remember = (title, lines, notes) => ({ type: 'content', title, bullets: lines, notes });
/* What each Build-it's new parts do, in plain English. */
const BUILDS = {
  setup: { title: 'Set up: the songs, their ten numbers, one colour per genre', caption: 'The picture this code drew: rows per genre in the file', words: [
    'FEATURES\tThe ten numbers a model reads about each song: its features.',
    'genre = alt.Color\tOne colour per genre, safe for colour-blind readers, on every chart.',
    'count()\tSix genres, each with about 5,000 to 6,000 rows.'] },
  'lib-look': { title: 'Look first, in three lines', words: [
    'isna().sum()\tHow many blanks in each column.',
    'duplicated(…)\tThe same song more than once.',
    'sns.histplot\tA histogram in one line, with seaborn’s defaults.'] },
  look: { title: 'Look first: what does popularity look like?', words: [
    'drop_duplicates\tOne row per song, then shuffled: the file is sorted.',
    'sample(4000)\tAltair draws up to 5,000 rows: plenty for a shape.',
    'bin=alt.Bin(step=2)\tA histogram: songs counted per band.',
    'The picture\tA tower at 0. Not rated yet? We keep them and say so.'] },
  box: { title: 'Look first: one feature, six genres', caption: 'The picture this code drew, from the same sample', words: [
    'mark_boxplot\tThe box holds the middle half of each genre’s songs; the line is the median.',
    'genre.legend(None)\tThe setup’s colours; the axis names the genres.',
    'The picture\tRap is the wordiest, rock the least. A model can use that.'] },
  'lib-pair': { title: 'Many columns in one line', words: [
    'sns.pairplot\tEvery pair of columns as a scatter. Three of the ten here, or it is unreadable.',
    'hue=\tColour by genre. Fast, but you can’t ask it anything.'] },
  matrix: { title: 'Many columns at once: a matrix you can brush', words: [
    'selection_interval\tDrag a box on any panel to pick songs (Week 5’s brush).',
    'alt.repeat\tOne chart, repeated for each pair: three of the ten columns.',
    'alt.when(brush)\tPicked songs keep their genre colour in every panel; the rest go grey.'] },
  pca: { title: 'Ten columns on one map: PCA', words: [
    'StandardScaler\tPut every column on one scale first, or tempo (about 120) swamps danceability (0 to 1).',
    'PCA(n_components=2)\tTwo new axes that keep as much of the spread between songs (“variation”) as two axes can.',
    'explained_variance_ratio_\tHow much spread the map keeps: in the title.'] },
  kmeans: { title: 'Let the model find the groups: k-means', words: [
    'KMeans(n_clusters=5)\tFind five groups of similar songs, with no genres given.',
    'groupby(…).mean()\tEach group’s average on every feature; 0 is the average song.',
    `The picture\tRed above average, blue below. Group ${F.clusters.find(c => c.topGenre === 'rap').group} is wordy (mostly rap).`] },
  corr: { title: 'Which columns move together?', words: [
    '.corr()\tr for each pair: +1 rise together, −1 opposite, 0 no straight-line link.',
    '.melt(…)\tOne row per pair, the shape Altair needs.',
    'redblue, domain=[-1, 1]\tRed and blue meet at white for 0 (Week 4’s diverging scale).'] },
  importance: { title: 'What does the model rely on?', words: [
    'train_test_split\tTraining songs (3 in 4) to learn from; test songs (1 in 4) kept hidden.',
    'RandomForestClassifier\tA model of 300 decision trees (yes/no questions) that vote.',
    'permutation_importance\tShuffle one column in the test songs: a big drop means the model relied on it.'] },
  both: { title: 'Two ways to rank the same features', caption: 'The picture this code drew: the same model, ranked two ways', words: [
    'feature_importances_\tThe forest’s own count, made while it trained.',
    'importances_mean\tShuffle and see, on the hidden test songs.',
    `The picture\t${own[0]} tops one, ${top[0]} the other. Trust the shuffle: it is measured on songs the model never saw.`] },
  score: { title: 'Score it: right, compared with what, for whom?', caption: 'The picture this code drew: each genre’s score, with the two lines to compare', words: [
    `accuracy\tShare of test songs it got right: ${n(F.testRight)} of ${n(F.testSongs)}, ${pct(F.accuracy)}.`,
    `baseline\tAlways guess the commonest genre: ${pct(F.baseline)}. Beat it, or nothing was learnt.`,
    'recall\tFor one genre: the share of its real songs the model got right.'] },
  'lib-confusion': { title: 'A confusion matrix in one call', words: [
    'ConfusionMatrixDisplay\tscikit-learn draws it straight from the model.',
    'normalize=\'true\'\tEach row as shares of that genre, so rows compare fairly.',
    'How to read it\tA row is a real genre; a cell, the share of its songs given that guess. The diagonal is each genre’s recall.'] },
  confusion: { title: 'Where is it wrong? A confusion matrix in Altair', words: [
    'confusion_matrix\tCount, for each real genre, what the model guessed.',
    'counts.sum(axis=1, …)\tTurn each row into shares, so each row adds up to 100%.',
    'mark_rect + mark_text\tA heatmap with its numbers on it.'] },
  depth: { title: 'Is it learning, or memorising?', words: [
    'max_depth\tHow many yes/no questions one tree may ask in a row.',
    'validation_curve\tThree rounds, each hiding a different third of the songs to score on.',
    `The picture\tGrey (songs it learnt from) climbs to 100%. Red (new songs) peaks at depth ${F.depth.best}, then slips: overfitting.`] },
  boundary: { title: 'Where does the model draw the line?', words: [
    'meshgrid\tA grid of made-up songs covering the chart.',
    'tree.predict(grid…)\tAsk the tree about each one: its answers paint the boundary.',
    'mark_square + mark_circle\tThe boundary underneath, real songs on top.',
    'depth = 3\tThe slide before showed depths 2, 6 and 20.'] },
  'lib-boundary': { title: 'Paint the boundary in one call', words: [
    'DecisionBoundaryDisplay\tscikit-learn paints the boundary for you.',
    'eps=0.02\tThe margin round the data. The default, 1, zooms far out of 0-to-1 features.',
    'scatter\tAdd the songs yourself, on its matplotlib axes.'] },
  'lib-tree': { title: 'Draw the tree’s questions', caption: 'The picture this code drew: the depth-2 tree as a flowchart', words: [
    'plot_tree\tDraws a decision tree as a flowchart of yes/no questions.',
    'max_depth=2\tThe “too simple” tree from the last slide: two rounds of questions.',
    'proportion=True\tEach box: the share of songs that reach it.',
    `The picture\tFirst: is ${F.tree.root} at most ${F.tree.threshold}? Each end box names a genre.`] },
  hit: { title: 'Tell the public: the honest comparison', words: [
    '>= 80\tA “hit”, as the headline means it.',
    'stratify=hit\tKeep the same few hits in the test songs as in the data.',
    '1 - h_te.mean()\tThe baseline: always say “not a hit”.',
    'The picture\tAccuracy, the baseline and hits found, on one 0–100% axis.'] }
};
const lower = t => t.charAt(0).toLowerCase() + t.slice(1);
const build = (id, notes) => drawn(`${id.startsWith('lib') ? 'The library way' : 'Build it'}: ${lower(BUILDS[id].title)}`, `build-${id}.svg`, notes);
const [SUGE] = F.songs;

function lesson() {
  return [
  /* ======================================================== Opening */
  { type: 'title', title: 'What does\nthe model see?',
    subtitle: 'LDSCI6253 Advanced Information Presentation & Visualisation · Week 10 · Visualisation for machine learning',
    notes: 'Up as they arrive. Same promise as every week since 5: every idea seen, named, then built in Altair; this week the library one-liner comes first too. Rebuilt from the 2025 Week 10 deck (01_Lecture_IPDV_10.pdf, Iris, Plotly screenshots) and Dimitris Mylonas\'s LDSCI5209 lecture, whose four parts (exploration, high dimensions, features, performance) are stops 1 to 4.' },

  { type: 'content', title: 'Before we start',
    bullets: [
      'Reading\tMunzner, Visualization Analysis and Design, chapter 15: analysis case studies',
      'AE2\tDue 27 November. Weeks 8–11, and one AE1 visual reworked. AI is not allowed',
      'Worksheets\tOn Canvas by midday on the Friday after the lab',
      'Data and code\tsongs.csv, and week10_build_its.py: every Build-it, ready to run'
    ],
    notes: '1 min. The AE2 brief (2026–27) lists "visualisation for machine learning" among the Weeks 8–11 ideas it marks, and asks for at least one AE1 visual reused or reworked. Fix from the 2025 deck: its recap slide repeated the Week 9 outcomes, and its reading slide had a Week 9 footer.' },

  reveal('One question on last week', 'Recall first', 'recall', ['Talk to the person next to you: 30 seconds.', 'Stem, then bowl.'],
    '1 min. Recall before new learning. Link to today: last week the author decided what the reader sees. Today a model decides, and charts are how we see what it decided.'),

  drawn('Ten weeks in: from telling a story to checking a model', 'route.svg',
    '1 min. The route, Week 10 marked. Week 11 is evaluation and storytelling, then AE2 and the infographic. Next: today\'s data, before the guess.'),

  { type: 'content', title: 'Today’s data: songs from Spotify playlists',
    bullets: [
      `${n(F.rows)} rows\tsongs from Spotify playlists, shared by TidyTuesday on 21 January 2020`,
      `Six genres\t${Object.entries(F.genreCounts).map(([g, c]) => `${g === 'edm' ? 'EDM' : g === 'r&b' ? 'R&B' : g.charAt(0).toUpperCase() + g.slice(1)} ${n(c)}`).join(', ')}`,
      'The genre\tcomes from the playlist the song was in, not from the song itself',
      'One row\tis one song in one playlist, so a song can appear more than once',
      'Ten numbers\tSpotify measured from each song’s sound: the next slide says what they mean'
    ],
    notes: '1 min. Asked for after teaching: the guess was hard because students had not met the data. Say what one row is, then the genres, then that the label is the playlist\'s: the hook\'s third song depends on it. File: TidyTuesday 2020-01-21, spotify_songs.csv (CC0), every row kept.' },

  { type: 'content', title: 'The numbers Spotify gives each song',
    bullets: [
      'Danceability\t0 to 1: how suitable for dancing (tempo, rhythm, beat strength)',
      'Energy\t0 to 1: how intense and active it feels: fast, loud, noisy',
      'Speechiness\t0 to 1: how much is spoken words. Above 0.33, often rap',
      'Acousticness\t0 to 1: how sure Spotify is that it is acoustic',
      'Valence\t0 to 1: how positive it sounds: happy near 1, sad near 0',
      'Tempo\tBeats per minute. Also: loudness, instrumentalness, liveness, length'
    ],
    notes: '1.5 min. Before the guess: read each line, and say what a high and a low value means. Spotify\'s own definitions, from the data dictionary that comes with the file (TidyTuesday, 21 January 2020). These ten are the FEATURES in the code. They are Spotify\'s estimates, made by its own models: a model of a model.' },

  reveal('Guess the genre from the numbers', 'Hook', 'guess', ['Read A’s numbers. Rap, rock, pop, Latin, R&B or EDM?', 'A: rap.', 'B: rock.', 'C: filed as Latin. No one could get it from the numbers.'],
    `3 min. The model\'s view of a song: numbers, no sound. The last slide said what each means: point back to speechiness (above 0.33, often rap) and energy. Take guesses for each before clicking. Speechiness: how much of the track is spoken words (0 to 1). C is the twist: Ed Sheeran\'s Perfect sits only in a playlist filed as Latin, so the "right answer" the model learns from is the playlist\'s label. The file has ${n(F.multiGenre)} songs filed under more than one genre (KAROL G\'s Tusa under five). ` +
    `Values from songs.csv (Spotify audio features, collected January 2020). Each song\'s genres in the file: ${F.songs.map(s => `${s.name}: ${s.genres.join(', ')}`).join('; ')}.`),

  statement('A model sees only numbers. Charts are how we see what it sees.', '30 s. The whole lecture in one line. Every stop today is a chart that answers one question about a model.'),

  { type: 'content', title: 'Six words for today, on one song',
    bullets: [
      `Feature\tOne number the model reads about a song. Suge’s speechiness is ${SUGE.speechiness}`,
      'Label\tThe answer it should learn. Suge’s label is rap',
      'Model\tA rule learnt from labelled songs that turns features into a guessed label',
      'Training, test songs\tIt learns from 3 songs in 4; the other 1 in 4 stay hidden, to score it on songs it never saw',
      `Accuracy\tThe share of test songs it gets right: ${n(F.testRight)} of ${n(F.testSongs)} is ${pct(F.accuracy)}`,
      'Correlation (r)\tFrom −1 to 1: how closely two columns follow a straight line together'
    ],
    notes: '2 min. Added after a review by 50 simulated learners: every one of them said these words were used without being defined. Read each with its example. The words for checking a model (baseline, recall, precision, overfitting, boundary) wait for stop 4, where they are first used. The model in this lecture is a random forest (300 decision trees that vote), but the words hold for any model.' },

  drawn('A chart at every stage of a model’s life', 'pipeline.svg',
    '1 min. Today\'s map, before anything else: five stops, each a chart that answers one question about a model. Each section slide names its stop on this map. The model in the middle is a few lines of scikit-learn: a box. This is a visualisation course; the charts around the box are what we learn. Munzner\'s Why? from Week 3 names each: discover a distribution, locate outliers, compare, and present.'),

  { type: 'content', title: 'By the end of today you can',
    bullets: [
      'Choose\tthe right kind of model for an everyday question',
      'Check\twhether data is fit to learn from, and see ten columns at once',
      'Read\twhich features a model relies on, and why that isn’t cause',
      'Find\twhere a model is wrong, and whether it is memorising',
      'Tell\tthe public what a model’s score means, honestly',
      'Build\teach chart in Altair, and know the library one-liner too'
    ], progressive: true,
    notes: '1 min. Rewritten from the 2025 overview (data exploration, high-dimensional data, feature engineering, performance and tuning), kept in that order as stops 1 to 4; stop 5 is new, and is the AE2 skill.' },

  /* ======================================================== Why a model, and which kind */
  section('Why use a model, and which kind?', 'Before the stops · what machine learning is for', '20 s. Show the power of ML, and which kind suits which everyday question, before checking any of it.'),

  { type: 'content', title: 'Four ways machine learning meets data visualisation',
    bullets: [
      `Simplify\tsqueeze many columns into one map, or colour the groups a model finds: stop 2`,
      'Flag\tmark the odd values a model finds; with a time series, add a forecast and its range',
      'Explain\tchart what a model relies on, and draw the questions it asks: stops 3 and 4',
      'Make charts\tsome tools suggest a chart, or draw one from a typed question: stop 5 checks it',
      'Today\tall four meet one rule: a chart is how we check what the model did'
    ], progressive: true,
    notes: '1 min. The big picture before the ladder, from a common overview of ML in data visualisation. Point to where each is today. Flag: the anomaly detector appears in the next few slides and the before-and-after; forecasting needs dates in order, which the songs file does not have, so it is named and not shown. Simplify also covers t-SNE (van der Maaten and Hinton, 2008) and UMAP (McInnes, Healy and Melville, 2018): tighter maps, harder-to-trust distances.' },

  pfig('How often can you name a song’s genre?', P.ladderSvg(), P.ladderBoxes(), ['Just guess.', 'Read one chart.', 'Read one scatter plot.', 'Ask a model.'],
    `2 min. One bar per click; ASK before the last: "What will a model that sees all ten numbers at once get?" Computed on the same test songs: the best depth-3 tree on one column (${F.ladder.oneFeature}), the best depth-4 tree on any two columns (${F.ladder.scatterFeatures.join(', ')}), then the random forest on all ten. This is why ML is worth having: it finds what no single chart can show. It is still wrong ${pct(1 - F.accuracy)} of the time, which is why the rest of the lecture checks it.`),

  pfig('Five kinds of machine learning', P.kindsSvg(), P.rowBoxes(5), ['Classification: which label?', 'Regression: how much?', 'Clustering: what groups are there?', 'Similarity: what is like this?', 'Anomaly detection: what is unusual?'],
    '1.5 min. One per click. The question decides the kind: a label, a number, groups nobody named, the nearest things, or the rare odd one out. Classification and regression learn from examples with the answer given (supervised); the other three find patterns with no answers (unsupervised). The 2025 deck had three of these (classification, regression, clustering) on Iris.'),

  reveal('Which kind would you use?', 'Everyday', 'scenarios', ['Pairs: one minute to match all six, then we check.', 'A: classification.', 'B: regression.', 'C: clustering.', 'D: similarity.', 'E: anomaly detection.', 'F: classification.'],
    '2.5 min. One minute in pairs, then reveal. These are kinds of task, not claims about how any named company builds its product. E is the hit model again: rare cases, where accuracy misleads and recall matters. F surprises people: predicting the next word is choosing one label from thousands. Then straight into stop 1: the rest of the lecture checks the classifier, chart by chart.'),

  /* ======================================================== ① Look first */
  section('Is the data fit to learn from?', 'Stop 1 of 5 · Look before you model · first, the data', '20 s. Point back to the map: stop 1. Munzner: discover the distribution; locate the outliers.'),

  build('setup', '1 min. The setup every later Build-it starts from: read the file, name the ten features, one colour per genre. It is the first cell of week10_build_its.py.'),

  panelFig('Which of these has the strongest relationship?', 'anscombeSvg', 4, ['I: a cloud around a line.', 'II: a smooth curve.', 'III: a line, and one point off it.', 'IV: one point does all the work. So: none is strongest.'],
    '3 min. Ask first, before any click: "Which has the strongest relationship?" Take hands for I to IV. Then reveal one at a time. ' +
    'Anscombe, F. J. (1973), Graphs in statistical analysis, The American Statistician 27(1), 17–21. Every set: mean of x 9, mean of y 7.5, correlation 0.82, best line y = 3 + 0.5x (steps checked by computing them). A model given only the numbers treats all four the same.'),

  statement(`None is strongest: all four have the same averages, the same r = ${F.anscombe.r} and the same line. Only the picture tells them apart.`, '30 s. So: look before you model. A summary table is not a look. r is correlation, from −1 to 1 (slide "Six more").'),

  { type: 'content', title: 'The songs, before any model',
    bullets: [
      `${n(F.rows)} rows\tbut ${n(F.tracks)} different songs: ${n(F.rows - F.tracks)} rows are repeats`,
      `${n(F.multiGenre)} songs\tsit in more than one genre: the genre is the playlist’s, not the song’s`,
      `${n(F.zeroPopularityUnique)} songs\thave popularity 0. Not rated yet? Spotify doesn’t say, so we keep them and say so`,
      `${F.zeroTempo} song\thas a tempo of 0; the shortest “song” lasts ${F.shortestSeconds} seconds`,
      `${F.missingNames} songs\thave no name or artist`,
      'So\tdrop the repeats, report the zeros, and know the labels are noisy'
    ], progressive: true,
    notes: `2 min. Every count computed from songs.csv by tools/ipdv-week10/code/steps.py. Release years run ${F.years[0]} to ${F.years[2]} (median ${F.years[1]}). ASK at the popularity line: "Is 0 a real score, or a missing one?" Nobody knows: Spotify does not say. That uncertainty is the point. The 2025 deck said Iris "is already clean": real data never is.` },

  build('lib-look', '1 min. The library way first: what most notebooks do. Fast, and enough to find the problems.'),
  build('look', '2 min. The shuffle matters: the file is sorted by playlist, so the first 4,000 rows would be nearly all one genre. A real "look first" lesson. ASK: "What is the tower at 0?"'),
  build('box', `1.5 min. How to read a box plot: the box is the middle half of the songs, the line inside is the median, the whiskers the usual range, dots the unusual songs. Mean speechiness: rap ${F.byGenre.rap.speechiness}, rock ${F.byGenre.rock.speechiness}. A feature that differs between groups is one a model can use: that is stop 3.`),

  remember('Remember from stop 1: look first', [
    'Same numbers\tcan hide different pictures (Anscombe): draw it',
    'Count\tthe repeats, the blanks and the odd values before any model',
    'Labels\tare only as good as whoever wrote them: here, playlists'
  ], '30 s. Card 1. Next: once the data is fit, how do we see all ten columns at once?'),

  /* ======================================================== ② Too many columns */
  section('How do you see ten columns at once?', 'Stop 2 of 5 · Too many columns · then, all the columns together', '20 s. Point back to the map: stop 2. Mylonas\'s "high-dimensional data": every song is a point in ten dimensions; we can draw two. seaborn\'s one-line pairplot is in the tutorial.'),

  { type: 'content', title: 'Predict with your neighbour, then we check',
    bullets: [
      'The chart\tthree columns, every pair as a scatter: speechiness, danceability, energy',
      'You drag\ta box round the wordiest songs in one panel',
      'Predict\twhich genre lights up in the other panels?',
      `Answer\tmostly rap: its average speechiness is ${F.byGenre.rap.speechiness}, rock’s ${F.byGenre.rock.speechiness}`
    ], progressive: true,
    notes: '1.5 min. Thirty seconds of silent thinking, thirty with a neighbour; take two guesses, then click the answer line. The next slide shows the brush that proves it. A break in the run of code: the room does something before reading more.' },

  build('matrix', '2 min. Week 5\'s brush, on a matrix. Drag a box round the high-speechiness songs in one panel: they light up in every other panel, and they are mostly rap. That is linked brushing doing discovery. Altair draws up to 5,000 rows, so a sample of 1,500.'),
  build('pca', `2 min. PCA finds the two directions that keep the most variation; scale first, or tempo dominates. The title is computed: ${pct(F.pca[0] + F.pca[1])} kept (${pct(F.pca[0])} + ${pct(F.pca[1])}). The genres overlap: there are no clean islands. t-SNE and UMAP make tighter clusters, but their distances are harder to trust (sklearn.manifold.TSNE).`),

  reveal('What a map of ten columns loses', 'Name it', 'projection', ['It keeps only part.', 'Its axes have no units.', 'Near isn’t always near.', 'Use it to find, then check.'],
    '2 min. One row per click. The honest use of a projection: find a group, then go back to the real columns (the matrix) to check it.'),

  build('kmeans', `2 min. k-means gets the ten numbers and no genres, and finds five groups of songs that sit close together: clustering, the unsupervised kind. Read the heatmap by row: red is above the average song, blue below. Point to group ${F.clusters.find(c => c.topGenre === 'rap').group}: wordy, mostly rap. The groups cut across genres, like moods. k = 5 is a choice; try 3 or 8 in the tutorial. (Each group in full: ${F.clusters.map(c => `${c.group}, ${n(c.size)} songs, ${c.traits.join(', ')}, ${pct(c.topShare)} ${c.topGenre}`).join('; ')}.)`),

  photo('Spot the problem: last year’s clustering slide', 'orig-2025-clustering.png', [
    'From this course’s 2025 Week 10 slides. k-means is a model that sorts rows into k groups by similarity, with no labels given.',
    'Here it put the Iris flowers in three groups, numbered 0, 1 and 2, on a continuous blue scale with a colour bar.',
    'But a group’s number is a name, not an amount: group 2 is not “more” than group 1.',
    'And the lightest group almost vanishes on the white background.',
    'Week 4’s fix: one distinct, colour-blind-safe hue per group, a legend of names, or labels on the groups.'
  ], '1.5 min. Straight after our own k-means. ASK first: "What is wrong with the left chart?" Own the mistake: it is ours, from last year. Plotly gave a number column a continuous scale by default; the fix in Altair is :N (nominal) on the cluster column. Cropped from 01_Lecture_IPDV_10.pdf, slide 21.'),

  remember('Remember from stop 2: many columns', [
    'A matrix\tshows every pair; brush one panel to follow songs through all of them',
    `A PCA map\tsquashes ten columns into two, and keeps only ${pct(F.pca[0] + F.pca[1])} of the spread`,
    'k-means\tfinds groups with no labels given: here, five song moods that cut across genres',
    'So\tfind groups on the map, then check them in the real columns'
  ], '30 s. Card 2. Next: the model itself. Which of these columns does it rely on?'),

  /* ======================================================== ③ What it relies on */
  section('What does the model rely on?', 'Stop 3 of 5 · Which features matter · then, the model', '20 s. Point back to the map: stop 3. Mylonas\'s "feature engineering and importance". The correlation heatmap (which columns move together) is in the tutorial.'),

  build('importance', `2.5 min. The first model. Three hundred trees, three songs in four to learn from. Shuffling a column breaks its link to the genre; the accuracy lost is how much the model relied on it. Top three: ${top.slice(0, 3).join(', ')}. Liveness: ${pct(F.permutation.liveness, 1)}. Columns that move together (energy and loudness, r = ${F.corrEnergyLoudness}) can share or hide each other\'s importance.`),
  build('both', `2.5 min. The two rankings side by side, so the disagreement can be seen. The forest\'s own count (impurity importance) is computed on the training songs and favours columns with many different values; the shuffle is computed on test songs. Its own count ranks ${own.slice(0, 3).join(', ')}; shuffling ranks ${top.slice(0, 3).join(', ')}. Trust the shuffle, and only for this model: importance is about the model, not the world. Strobl, Boulesteix, Zeileis and Hothorn (2007), BMC Bioinformatics 8:25, showed impurity importance is biased towards variables with more distinct values; scikit-learn\'s user guide (Permutation feature importance) recommends permutation importance on held-out data. Beyond today: SHAP values (Lundberg and Lee, 2017, NeurIPS) split one song\'s guess into each feature\'s share, from the shap library; not used here, to keep the lab to scikit-learn.`),

  remember('Remember from stop 3: what the model relies on', [
    'Shuffle\ta column on test songs: the drop in accuracy is how much the model relied on it',
    'Two methods\tcan rank features differently: trust the one measured on unseen songs',
    'Important\tis not cause: speechiness helps spot rap; it doesn’t make a song rap'
  ], '30 s. Card 3. Next: how good is the model, and for whom?'),

  /* ======================================================== ④ Where it's wrong */
  section('Where is the model wrong?', 'Stop 4 of 5 · Is it any good · then, its mistakes', '20 s. Point back to the map: stop 4. Mylonas\'s "model performance": evaluation, overfitting, decision boundaries.'),

  { type: 'content', title: 'Five words for checking a model',
    bullets: [
      `Baseline\tThe score of a rule that learns nothing, such as always guessing the commonest genre: ${pct(F.baseline)}`,
      `Recall\tOf one genre’s real songs, the share the model finds: rock ${pct(F.recall.rock)}, R&B ${pct(F.recall['r&b'])}`,
      `Precision\tOf the songs it called a hit, the share that really were: ${F.hitsFoundCount} of ${F.hitsCalled}`,
      'Overfitting\tMemorising: near 100% on training songs, worse on new ones',
      'Decision boundary\tThe line where the model’s answer changes from one label to another'
    ],
    notes: '1.5 min. Taught here, where they are first used, not at the start (the flow review). Each has its slide in this stop or the next: baseline and recall on the next two, overfitting on the depth curve, the boundary on the three trees, precision at stop 5 with the hits. Precision is here because Google\'s Machine Learning Crash Course pairs it with recall for rare cases like hits.' },

  reveal(`${pct(F.accuracy)} right: good or bad?`, 'Guess first', 'accuracy', ['Good, bad, or it depends? Ten seconds, then hands up.', 'Compared with what?', 'Right for whom?', 'The verdict.'],
    `2 min. The baseline is what a model that learns nothing gets: always the commonest genre, ${pct(F.baseline)}. Logistic regression, a straight-line model, gets ${pct(F.logistic)}. So the forest learnt something; but one number hides which genres it fails. Scored on ${n(F.testSongs)} test songs it never saw.`),

  build('score', `2 min. The code behind the last slide\'s numbers: accuracy on the test songs, the baseline, and each genre\'s recall, with the two lines to compare against. Recall per genre: ${Object.entries(F.recall).map(([g, v]) => `${g} ${pct(v)}`).join(', ')}.`),
  build('lib-confusion', '1 min. The library way: one call. Read a row: of the real Latin songs, what did the model call them? The diagonal is the last slide\'s bars.'),
  build('confusion', `2 min. The same matrix, built, so you choose the colours, the order and the words. Most often confused: ${Object.entries(F.mostConfusedWith).map(([g, o]) => `${g} with ${o}`).join('; ')}. ASK: "Why might Latin and pop be hard?" (Reggaeton and Latin pop playlists sit in both; the hook\'s Perfect is filed as Latin.)`),

  { type: 'content', title: 'Predict with your neighbour: a tree that asks more questions',
    bullets: [
      'Depth\thow many yes/no questions one tree may ask in a row',
      'Predict\tas depth grows from 1 to 25, what happens to its score on the songs it learnt from? On new songs?',
      `Answer\ton songs it learnt from it climbs to ${pct(F.depth.at['25'][0])}; on new songs it peaks at depth ${F.depth.best} (${pct(F.depth.bestTest)}), then slips to ${pct(F.depth.at['25'][1])}`
    ], progressive: true,
    notes: '1.5 min. Thirty seconds silent, thirty with a neighbour: ask them to sketch the two lines in the air or on paper. Take two sketches, then click the answer. The next slide is the chart that proves it.' },

  build('depth', `2 min. Over- and underfitting in one picture. The gap between grey and red is overfitting. This curve scores on rounds of hidden songs (cross-validation); a depth picked this way still needs one last check on test songs nobody has looked at. One tree scores less than the forest\'s ${pct(F.accuracy)}: a forest of 300 trees voting is a stronger model. The validation_curve code is explained again in the tutorial.`),

  panelFig('One tree, grown deeper: where it draws the line', 'boundarySvg', 3, ['Too simple: two straight cuts.', 'About right: the shape of the data.', 'Too complex: a line round single songs.'],
    `2 min. One per click. Three genres and two features, so it fits on a page; so the scores are lower than the forest\'s on six genres and ten features. Always guessing the commonest of the three scores ${pct(F.threeBaseline)}. Each panel's key names its colours, so it reads without telling hues apart. ASK at the third: "Would this boundary work on next year\'s songs?" How it is drawn (a grid of made-up songs, each coloured by the tree's answer) is in the lab, with the code.`),

  build('lib-tree', `2 min. The model's questions, drawn out: the depth-2 tree from the "too simple" panel. Read it from the top: first question, ${F.tree.root} at most ${F.tree.threshold}; follow yes to the left. Its four end boxes guess ${F.tree.leaves.join(', ')}. It gets ${pct(F.tree.accuracy)} of these three genres right. A tree this small can be read like a flowchart; the forest has 300 deep trees, which is why we chart what it does instead of reading it.`),

  remember('Remember from stop 4: where it is wrong', [
    'Score\ton test songs, beside the baseline, and genre by genre',
    'Read\ta confusion matrix by rows: the diagonal is what it gets right',
    'Overfitting\tshows as a gap: near 100% on training songs, worse on new ones',
    'A small tree\tcan be drawn as its questions; a forest of 300 can only be charted'
  ], '30 s. Card 4. Next: how to tell the public what a score means.'),

  /* ======================================================== ⑤ Tell the public */
  section('What does “98% accurate” hide?', 'Stop 5 of 5 · Tell the public · last, the headline', '20 s. Point back to the map: stop 5. Munzner: present. Week 9 again: honest context.'),

  reveal('“AI predicts hits with 98% accuracy”', 'Guess first', 'hit', ['Would you trust it? Ten seconds, then hands up.', `Only ${pct(F.hitShare, 1)} of songs are hits.`, 'The baseline wins.', `It found ${F.hitsFoundCount} of ${F.hitsInTest}.`, 'So: no.'],
    `3 min. The headline is true, and useless. With so few hits, "not a hit" is almost always right: accuracy rewards that. Recall (the share of real hits found) is the number that matters here: ${pct(F.hitsFound, 1)}. ` +
    `Predicting the popularity score itself from the audio does little better than guessing the average: R² ${F.popularityR2}, an average error of ${F.popularityMAE} points against ${F.guessMeanMAE} for always guessing the mean. The 2025 deck said "95% accurate" is easier to understand than a loss value: it is easier, and that is the danger.`),

  build('hit', '2 min. The chart a reader needs: the model, the baseline and what it was for, on one axis from 0 to 100%. Week 9\'s five tests: honest context means the comparison is on the chart.'),

  { type: 'content', title: 'The headline, rewritten for the public',
    bullets: [
      'Not this\t“AI predicts hit songs with 98% accuracy”',
      `But this\t“An AI spotted ${F.hitsFoundCount} of ${F.hitsInTest} hit songs it had not seen before”`,
      `Then\t“Saying ‘not a hit’ to every song is right ${pct(F.alwaysNo, 1)} of the time, so accuracy says little here”`,
      'And\t“It learnt from 2020 playlists, whose genres and hits may not be yours”'
    ],
    notes: '1.5 min. A worked rewrite. Each line adds what a reader needs to disagree: what it was for (recall), the baseline, and what it learnt from.' },

  reveal('Telling the public about a model', 'Name it', 'public', ['A baseline.', 'Errors per group.', 'A range.', 'What it learnt from.', 'What it can’t say.'],
    '2 min. One per click. Each row is a thing a reader needs to disagree with the headline. Then straight to AE2: this is the skill it marks.'),

  { type: 'content', title: 'The data can disappear',
    bullets: [
      'These numbers\tdanceability, energy, speechiness… came from Spotify’s Web API',
      '27 November 2024\tSpotify restricted Audio Features and Audio Analysis for apps registered from that day',
      'So\tthis dataset could not be collected the same way today',
      'For your work\tsay where the data came from, when, and what you can’t check'
    ],
    notes: '1 min. Source: Spotify for Developers blog, "Introducing some changes to our Web API", 27 November 2024 (developer.spotify.com/blog/2024-11-27-changes-to-the-web-api); TechCrunch reported it the same day. Apps already in extended mode kept access. The file itself: TidyTuesday, 21 January 2020 (CC0), collected with the spotifyr R package. A model trained on it inherits its date: songs from 2020 playlists.' },

  { type: 'content', title: 'A chart from a typed question still needs checking',
    bullets: [
      'What it is\tsome tools suggest a chart from the columns, or draw one from a typed question',
      'How\ta language model writes the chart’s code for you, as we wrote Altair today',
      'Check the code\tdid it filter, count and average the way you meant?',
      'Check the chart\tis it the right chart for the question, on an honest scale (Weeks 3 and 9)?',
      'Check the claim\tthe five rules on the last slide apply to it too',
      'For AE2\tAI is not allowed: build and explain every chart yourself'
    ], progressive: true,
    notes: '1 min. The fourth way from the opening overview, as a caution. Kinds of tool, not named products. The point: the model that makes the chart can be wrong in the same ways as the one we checked today, so read its code. For AE2, the brief prohibits AI.' },

  { type: 'content', title: 'For AE2: one model-check chart',
    bullets: [
      'Choose\tone question from today that fits your green-jobs data',
      'Build\tthe chart in Altair, with a finding as its title',
      'Compare\tput the baseline beside it',
      'Say\twhat it shows, and what it can’t (cause, the future, who is missing)',
      'Link\tto your AE1 visual: what changed, and why'
    ], progressive: true,
    notes: '1.5 min. Moved up beside the public rewrite (the flow review): the brief asks how design choices affect trust. AE2 is a report (2,500 words, due 27 Nov): a model-check chart is one concrete example of Week 10 for its "Design principles" or "Understanding the problem" sections. Small samples in the ONS green-jobs estimates are a stop 1 and stop 5 story: a score from a few hundred responses needs its range.' },

  remember('Remember from stop 5: tell the public', [
    'Put\tthe baseline beside the model’s score',
    'Say\twho it fails, with recall per group, and give a range',
    'Name\twhat it learnt from, and what it cannot tell you'
  ], '30 s. Card 5.'),

  /* ======================================================== Arriving */
  section('What did machine learning help us do?', 'Arriving · before and after', '20 s. One slide of wins, the honest way: beside what we had without it.'),

  pfig('What machine learning changed', P.beforeAfterSvg(), P.beforeAfterBoxes(), ['Genres named right.', 'Rock songs recognised.', 'R&B songs recognised.', 'Hits among its picks.', 'Popularity: barely changed.'],
    `2.5 min. One row per click. Grey: without machine learning (the best single chart, or picking at random). Red: with it. Rock and R&B: the best rule from one chart (${F.ladder.oneFeature}) never says either, because no single number separates them. Hits: ${pct(F.hitPrecision)} of the model\'s picks are hits (${F.hitsFoundCount} of ${F.hitsCalled}) against ${pct(F.hitShare, 1)} at random, about ${F.hitLift} times better, yet it finds only ${F.hitsFoundCount} of ${F.hitsInTest} real hits. The last row matters as much as the first: an honest before-and-after includes where ML did not help. For AE2: a before-and-after like this shows what an advanced technique adds over a basic chart.`),

  { type: 'compare', title: 'A chart alone, or a chart with a model?', subtitle: 'Charts alone\tCharts with a model', progressive: true,
    bullets: [
      'What it shows\tWhat happened\tA guess for new songs: not why',
      `Patterns\tOne chart: ${pct(F.ladder.oneChart)} of genres\tAll ten columns: ${pct(F.accuracy)}`,
      `Many columns\tTwo or three per chart\tTen on one map: ${pct(F.pca[0] + F.pca[1])} kept`,
      `Odd values\tIf you chose the right axes\t${n(F.anomalies.flagged)} flagged across all ten`,
      'Making charts\tYou wrote it, so you know\tFrom a typed question: read its code',
      'Needed?\tA small table: no model\tToo big or wide to read by eye'
    ],
    notes: '2 min. The recap after the before-and-after: every number in it was earned at a stop (the ladder, the PCA map, the anomaly detector). One row per click. Adapted from a common "traditional against ML-powered dashboards" table, made honest: such tables say a model "explains why" and forecasts "with confidence". A model shows what it relies on, not the cause (stop 3), and its guesses need a baseline, a range and a date (stop 5). The last row matters: no model is needed when one chart answers the question.' },

  reveal('Six questions, six charts', 'Check', 'quiz', ['Call out the chart for each, fast.', 'Look first.', 'Matrix, then map.', 'Shuffle importance.', 'The depth curve.', 'The confusion matrix.', 'The honest comparison.'],
    '1.5 min. A flash round: read each question, take the first answer called out, click. One question per stop, and two at stop 4. These are the toolkit to keep.'),

  statement('Tell your neighbour: what would you ask before believing “98% accurate”?', '1.5 min. One question each, to the person next to them. Listen for "compared with what?" and "for whom?". Take two answers.'),

  { type: 'content', title: 'In the lab: R&B or rap? Check a model in five charts',
    bullets: [
      'Tutorial\tevery Build-it from today, with a Try-it after each, and the code we skipped: the boundary grid, the depth curve',
      'Challenge\tcan the audio tell R&B from rap? The same five checks, on two genres',
      `What changes\twith two genres, the baseline is the bigger genre’s share: about half, not ${pct(F.baseline)}`,
      'So\tbefore any accuracy, work out the baseline; then give recall for each genre, not one number',
      'Hand in\tone chart per stop and a sentence on what each shows',
      'Stretch\tthe green-jobs data: a first model-check chart for AE2'
    ], progressive: true,
    notes: '3 min. The bridge to the lab, given time (the flow review). Walk through each line. The challenge\'s Solutions compute the R&B-or-rap baseline at about 53%, so a model at 60% has learnt little. Ask: "Which genre do you think it will miss more?" and leave it open: they find out in the lab. Notebooks: 10_Notebook_IPDV_Machine_Learning.ipynb (tutorial) and 10_Activity_IPDV_Model_Check.ipynb (challenge), with the teacher\'s solutions. scikit-learn is needed next to Altair and pandas. For students who are ahead: the tutorial\'s Try-its include changing k and the depth.' },

  statement('A model sees only numbers. Charts are how we see what it sees, and how we check it before anyone believes it.', '30 s. The lecture\'s opening line, finished. End here.')
  ];
}

/* The student copy: room-only slides hidden. */
const STUDENT = [['Tell your neighbour: what would you ask before believing “98% accurate”?', 'none']];
/* Optional slides: "OPTIONAL: skip if short of time" in their notes. */
const REFERENCE = [];
/* Build-its taught in the lab, not the lecture (the flow review cut them for time): the tutorial notebook and week10_build_its.py keep them. */
const LAB_ONLY = ['lib-pair', 'corr', 'boundary', 'lib-boundary'];

module.exports = { lesson, STUDENT, REFERENCE, BUILDS, LAB_ONLY };
