'use strict';
/* Week 9 · Who drives the story? Narrative and experiential visualisation: every slide, in teaching order.
 * The plan is docs/ipdv-week9-plan.md; the live figure is src/figures/story.js (one chart, told, then
 * opened). Every technique runs See it → Name it → Build it, and every Build it shows its code beside the
 * picture that code drew. The data spine is London's air: NO2 at every London Air Quality Network
 * monitor, 2010–2025, with Marylebone Road as the line the author tells. */
const D = require('./drawings.js');

/* Week 3's Munzner slides (lesson ipdv-da in js/lessons.js), brought back as they are rather than
   redrawn: the four-level walk-through and her Why? diagram. Read from the source each build, so a
   fix in Week 3 reaches Week 9. The builder has loaded js/model.js (window.SF) before this runs. */
function fromWeek3(title, change) {
  const SF = global.window && global.window.SF;
  if (!SF || !SF.LESSONS || !SF.LESSONS.some(l => l.key === 'ipdv-da')) require('../../js/lessons.js');
  const week3 = global.window.SF.LESSONS.find(l => l.key === 'ipdv-da');
  const slide = week3 && week3.slides.find(x => x.title === title);
  if (!slide) throw new Error(`Week 3 (ipdv-da) has no slide "${title}"`);
  const copy = JSON.parse(JSON.stringify(slide));
  delete copy.id;
  return Object.assign(copy, change);
}

const DIR = 'assets/lesson/ipdv/week9';
const asset = name => `${DIR}/${name}`;
const drawn = (title, file, notes, extra) => Object.assign({ type: 'image', title, image: asset(file), imageFit: 'contain', design: { capStyle: 'none' }, notes }, extra || {});
/* An outside picture: the red title above it and plain-English facts on its back. */
const photo = (title, file, facts, notes) => ({ type: 'image', title, image: asset(file), imageFit: 'contain', design: { capStyle: 'top' }, body: facts.join('\n'), notes });
const section = (title, part, notes) => ({ type: 'section', title, subtitle: part, notes });
const statement = (title, notes) => ({ type: 'statement', title, body: title, notes });
const reveal = (title, eyebrow, key, captions, notes) => {
  const data = D.REVEAL[key], start = data.mode === 'answers' ? -1 : 0;
  return { type: 'figure', figure: 'reveal', title, figureGround: 'paper', figureEyebrow: eyebrow, notes,
    figureAlt: `${title}: ${data.rows.map(r => r.name || r.say).join('; ')}`, figureData: data,
    figureSteps: captions.map((caption, i) => ({ caption, upto: start + i })) };
};
/* A row of panels, shown one per click (src/figures/panels.js); the boxes follow drawings.js panelsSvg. */
const panelFig = (title, fn, n, o, captions, notes) => ({
  type: 'figure', figure: 'panels', title, figureGround: 'paper', figureWhy: false, notes,
  figureAlt: `${title}: ${captions.join(' ')}`,
  figureData: { svg: D[fn]().replace(/^<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">'), boxes: D.panelBoxes(n, o), ground: '#fbfaf8' },
  figureSteps: captions.map((caption, i) => ({ caption, upto: i }))
});

/* ------------------------------------------------------------ the story figure's data */
/* Okabe and Ito's colour-blind-safe set: warm for the road monitors, cool away from roads; dark then light in each pair */
const TYPES = { Kerbside: '#d55e00', Roadside: '#e69f00', 'Urban Background': '#0072b2', Suburban: '#56b4e9', Industrial: '#8c8c8c' };
const series = filter => D.AIR.sites.filter(filter).map(s => {
  const [borough, site] = s.name.includes(' - ') ? s.name.split(' - ') : [s.name, s.name];
  return { id: s.code, name: site, borough, type: s.type, v: s.no2 };
});
const ROADS = series(s => /Roadside|Kerbside/.test(s.type));
const ALL = series(() => true);
/* The notes sit high, above the lines, on a chart that runs to 180. Marylebone Road (A501) is part of the
   Inner Ring Road, the edge of the 2019 central zone, so the zone reached the road itself only in Oct 2021. */
/* Short, because each note's words start at its rule and run right, towards the story panel. */
const NOTES = [{ year: 2019, text: 'Central ULEZ', at: 172 }, { year: 2020, text: 'Lockdown', at: 157 }, { year: 2021, text: 'ULEZ reaches here', at: 142 }, { year: 2023, text: 'ULEZ: all London', at: 127 }];
const REFS = [{ y: 40, text: 'Legal limit: 40' }, { y: 10, text: 'WHO guideline: 10' }];
const STORY = { x: 892, y: 150, w: 330 };
/* The hero line is named on the chart, beside its start; the other roads get a one-line key inside the chart. */
const HERO_LABEL = 'Marylebone Road, Westminster (kerbside)';
const GREY_KEY = { mark: 'line', colour: '#cfd5dc', text: 'every other London road monitor' };
const fig = (title, eyebrow, data, steps, notes, extra) => Object.assign({
  type: 'figure', figure: 'story', title, figureGround: 'paper', figureEyebrow: eyebrow, figureWhy: false, figureStory: STORY, figureCaptionTop: true,
  figureCredit: 'London Air Quality Network · NO₂ yearly average, µg/m³',
  figureAlt: `${title}: Marylebone Road's yearly NO₂, 98 µg/m³ in 2010, 89 in 2016, 31 in 2025.`,
  figureData: Object.assign({ years: D.AIR.years, hero: 'MY1', unit: 'NO₂ (µg/m³)', refs: REFS, notes: NOTES, types: TYPES }, data),
  figureSteps: steps, notes }, extra || {});
const HEADLINE = 'Marylebone Road’s air has a third of the NO₂ it had in 2010';
const SUB = 'Yearly average at the kerb. Legal limit 40 µg/m³.';
const BANDS = [{ from: 80, to: 100, text: 'A  above 80' }, { from: 60, to: 80, text: 'B  60 to 80' }, { from: 40, to: 60, text: 'C  40 to 60' }, { from: 0, to: 40, text: 'D  below 40' }];

/* What each Build-it's new parts do, in plain English. */
const BUILDS = {
  bare: { title: 'Start with the bare line', caption: 'The picture this code drew (text enlarged for the slide). The first five lines are the setup every Build-it uses.', words: [
    'read_csv\tOne row per monitor per year, from the London Air Quality Network.',
    'my1\tThe rows for one monitor: Marylebone Road (code MY1).',
    'mark_line\tA line through the years: Week 2’s chart.',
    'The picture\tCorrect, but silent: what should I see?'] },
  headline: { title: 'Say the finding in the title', words: [
    'alt.Title\tThe finding as a sentence, and a subtitle that says how to read it.',
    'alt.datum(40)\tA line at one value, not a column: the legal limit.',
    'line + limit\tLayers: two charts drawn on one.'] },
  annotate: { title: 'Write on the chart where it happened', caption: 'The picture this code drew, added to the last slide’s', words: [
    'notes\tA tiny table of your own: a year, a height (at), the words.',
    'mark_rule, y2\tA line from the axis up to its note.',
    'mark_text\tThe words, starting at the top of the line (align=\'left\').'] },
  highlight: { title: 'One line in colour, the rest grey', caption: 'The picture this code drew, added to the last two slides’', words: [
    'others\tEvery road monitor, grey and thin: the context.',
    'others + line + …\tThe layer added last is drawn on top: grey first, then red.',
    'detail=\'code:N\'\tOne line per monitor, without a colour each.'] },
  explore: { title: 'Let the reader drive: tooltip and legend', words: [
    'tooltip=[…]\tPoint at a line: its site, borough and value. Week 5.',
    'selection_point\tClick a type in the legend: the rest fade.',
    'scale=alt.Scale(…)\tColours a colour-blind reader can tell apart, as on the live chart.'] },
  stepper: { title: 'A martini glass: chapters, then open', caption: 'Drawn at chapter 1, as it opens; built on the highlight slide’s parts', words: [
    'alt.param + binding_radio\tButtons 1 to 3 under the chart: the chapter.',
    'chapter >= 2\tThe stem: the notes arrive at chapter 2.',
    'chapter >= 3\tThe bowl: every road, at the end.',
    'point=…\tPoints, so the tooltip answers for the year you point at.'] },
  guess: { title: 'Guess first, then show', words: [
    'binding_range\tA slider: the reader sets their guess.',
    'YDatum(guess, …)\tA moving number, so Altair is told its type.',
    'binding_checkbox + & show\tThe real line appears only once “Show me” is ticked.',
    'The picture\tAs it opens: the guess, before the truth.'] }
};
const build = (id, notes) => drawn(`Build it: ${BUILDS[id].title.charAt(0).toLowerCase()}${BUILDS[id].title.slice(1)}`, `build-${id}.svg`, notes);

function lesson() {
  return [
  /* ======================================================== Opening */
  /* Two lines, so the title stays clear of the theme's red N on the right */
  { type: 'title', title: 'Who drives\nthe story?',
    subtitle: 'LDSCI6253 Advanced Information Presentation & Visualisation · Week 9 · Narrative and experiential visualisation',
    notes: 'Up as they arrive. Same promise as every week since 5: every idea seen in a real picture, named, then built in Altair. Rebuilt from the 2025 Week 9 deck (01_Lecture_IPDV_8.pdf, "Experiential Data Vis"), whose slides were about narrative; "experiential" now has its own part (Part 4).' },

  { type: 'content', title: 'Before we start',
    bullets: [
      'Reading\tSegel and Heer (2010), Narrative Visualization: Telling Stories with Data (free PDF on Canvas)',
      'Set book\tMunzner, chapter 3, Why?: present, discover, enjoy (Week 3)',
      'Worksheets\tOn Canvas by midday on the Friday after the lab',
      'Data and code\tno2_london.csv, and week9_build_its.py: every Build-it, ready to run'
    ],
    notes: '1 min. Fixes carried over from the 2025 deck: it set "Chapter 9" as the reading, which is Munzner\'s networks chapter (last week); Munzner has no chapter on narrative, so the reading is Segel and Heer, with Munzner ch. 1 as the link. Its slide 6 said "Analysis Farmwork", and slides 8–9 carried a "Lecture 7: Network and Trees" footer. The 2025 lab notebook gave a different deadline (Monday 23:59): check which one Canvas shows.' },

  reveal('Three questions on last week', 'Recall first', 'recall', ['Talk to the person next to you: 20 seconds a question.', 'One root, no loops.', 'When the lines tangle.', 'True distances.'],
    '3 min. Recall before new learning. The questions show first: 20 seconds in pairs for each, take two answers, then click to reveal that answer. Link Beck to today: he decided what the reader should see. Today, that decision has a name: the author drives.'),

  drawn('Nine weeks in: from making a chart to telling with it', 'route.svg',
    '1 min. The route. Eight weeks taught them to make a correct chart. Today is about the reader: what they see first, in what order, and who controls it. The final infographic is author-driven: every panel will need what today teaches.'),

  photo('Meet Marylebone Road', 'orig-marylebone-road.jpg', [
    'One of central London’s busiest roads: about 90,000 vehicles a day.',
    'Tall buildings on both sides make a street canyon about 40 metres wide, which traps exhaust.',
    'Since June 1997 a monitoring cabin has stood one metre from the kerb, run for the London boroughs and the government (Defra).',
    'Scientists study it closely: ten years of its data (2009–2018) show traffic pollution peaks at rush hour, on weekdays and in winter (Kamara and Harrison, 2021).',
    'Its readings are the line you are about to guess.'
  ], '1 min. Before the guess, the place: let them look at it. ASK: "Would you walk here every day? Live here?" Facts checked against Defra\'s site page (uk-air.defra.gov.uk/data/maryleboneroad): installed by King\'s College London\'s Environmental Research Group in June 1997, about 90,000 vehicles a day, a street canyon about 40 metres across, the cabin one metre from the kerb on the south side. ' +
    'The study: Kamara, A. A. and Harrison, R. M. (2021) Analysis of the air pollution climate of a central urban roadside supersite: London, Marylebone Road. Atmospheric Environment 258, 118479, doi:10.1016/j.atmosenv.2021.118479; free author copy at research.birmingham.ac.uk. 2009–2018 data: most traffic pollutants (particles, nitrogen oxides, carbon monoxide, black carbon) fell; they peak at rush hour, on weekdays and in winter; ozone does the opposite, because traffic exhaust uses it up near the road. A good one for the curious: the same road, read three ways (by hour, by day of week, by season). ' +
    'PHOTO SOURCE NOT YET KNOWN: credit it here once found (a news agency picture of the road in traffic), and keep it out of anything shared beyond the room until then. It is hidden in the student copy.'),

  fig('Guess first: Marylebone Road', 'Hook', { yMax: 100, series: ALL.filter(s => s.id === 'MY1'), heroLabel: HERO_LABEL }, [
    { caption: 'Hands up: where is Marylebone Road’s NO₂ in 2025? A, B, C or D?', upto: 2016, bands: BANDS, bandsFrom: 2017,
      explain: 'Marylebone Road is one of London’s busiest roads, and its monitor sits at the kerb.\nThe line is nitrogen dioxide (NO₂) from traffic exhausts, the yearly average in µg/m³ (micrograms per cubic metre of air). It inflames airways, especially children’s.\nIn 2016 it was 89. Pick one band for 2025.' },
    { caption: 'The real line: 31 in 2025. The answer is D.', upto: 2025, bands: BANDS, bandsFrom: 2017, bandAnswer: 3, reveal: { year: 2025, text: '31' },
      explain: 'The big drop came in 2019 and 2020.\nMost students guess B or C.\nGuessing first makes a number easier to remember.' },
    { caption: 'Under the legal limit since 2024; still three times the WHO guideline.', upto: 2025, refs: 2, reveal: { year: 2025, text: '31' },
      explain: 'The dashed line is the UK legal limit, 40.\nThe dotted line is the World Health Organization’s guideline, 10 (2021); harm is seen even below it.\nSo: much better, not yet safe. (2025 is provisional: 78% of its hours measured.)' }
  ], '5 min. Do not show a title or a number first: the guess is the lesson. Step 1: hands up for A, B, C, D (or fingers against the chest, so guesses stay private); count roughly aloud. Step 2: click and let the line draw; pause before 2019. Step 3: the two lines. ' +
    'ASK: "Will you remember the number tomorrow? Why?" (Because you committed to a guess: Kim, Reinecke and Hullman, CHI 2017, had people draw their prediction before seeing the data, and they recalled the data better.) ' +
    'WHO 2021 air-quality guideline for NO₂, annual mean: 10 µg/m³. It is a guideline, not a safe level: WHO found health effects at lower levels too. NO₂ is one pollutant; fine particles (PM2.5) are above WHO\'s guideline (5) across London too.' +
    'Data: London Air Quality Network (Imperial College London\'s Environmental Research Group), site MY1, NO₂ annual mean, 75% data capture or more. 2010: 98, 2016: 89, 2019: 63, 2020: 44, 2023: 42, 2024: 32, 2025: 31. 2025 is provisional: 78% of hours captured, December only 27%; the ratified figure may move. 2020 includes lockdown; it did not bounce back in 2021 (43).'),

  statement('You guessed before you saw. That makes 31 easier to remember.', '30 s. Kim, Reinecke and Hullman (CHI 2017). This is the "experiential" in the week\'s title: the reader takes part, and the number sticks. Part 4 comes back to it. First: the author\'s tools.'),

  { type: 'table', title: 'Six words for today', tableHeader: true,
    body: 'Word\tWhat it means\tExample\n' +
      'Narrative\ta chart with an order\tguess first, then see\n' +
      'Annotation\twords on the chart, at a place\t“Lockdown” at 2020\n' +
      'Highlight\tone thing in colour, the rest grey\tMarylebone Road in red\n' +
      'Author-driven\tthe maker picks what you see, and when\ta poster, a talk\n' +
      'Reader-driven\tthe reader picks where to look\ta dashboard\n' +
      'Martini glass\tthe author leads, then the reader explores\ta news chart to search',
    notes: '2 min. Define before use. Each word is used from the next slide on. "Martini glass" gets its picture in Part 3: a thin stem (a few steps in order), then a wide bowl (explore).' },

  { type: 'content', title: 'By the end of today you can',
    bullets: [
      'Place\ta chart on the line from author-driven to reader-driven',
      'Choose\ta structure for an audience: lead, let go, or both',
      'Build\ta headline, a note and a highlight in Altair',
      'Build\ta chart that tells in chapters, then opens up',
      'Make\ta number felt: guess first, count it out, human scale',
      'Critique\ta published story: who drives, and is it honest?'
    ], progressive: true,
    notes: '1 min. Rewritten from the 2025 deck\'s overview (slide 5), which had three long outcomes on narrative only.' },

  { type: 'journey', title: 'Today’s route', subtitle: 'Four stops, one question each', progressive: false,
    bullets: [
      'Lead\tHow do you make sure they see what you saw?',
      'Let go\tWhen should the reader drive?',
      'Both\tCan you lead first, then let go?',
      'Make it felt\tHow do you make a number land?'
    ],
    notes: '30 s.' },

  /* ======================================================== Munzner, from Week 3 */
  fromWeek3('Four levels, three questions', {
    experiment: Object.assign({}, fromWeek3('Four levels, three questions').experiment, {
      prompt: 'Marylebone Road’s air, for a bus-stop poster or for a researcher’s tool: which level decides who drives?' }),
    notes: '2 min. Recall, brought back from Week 3 as it was (lesson ipdv-da). Take answers to the prompt, then step through the levels. ' +
      'The answer: the top two. Domain (who reads it: a passer-by or an expert) and abstraction, the Why (are they being shown something, or looking for something?). ' +
      'Who drives is decided there, before any chart is drawn. Idiom is where today\'s tools live (headline, note, highlight, tooltip); algorithm is Altair.' }),

  { type: 'image', title: 'Munzner’s Why? names today’s four parts',
    image: 'assets/lesson/ipdv/munzner-why-tasks.png', imageFit: 'contain', design: { capStyle: 'top' },
    body: [
      'Week 3’s Why? diagram. Find Consume, top left: Munzner’s three reasons to look at a chart.',
      'Present: the author has a finding to show. Today, Lead (Part 1).',
      'Discover: the reader looks for something new. Today, Let go (Part 2).',
      'Present, then discover: Both (Part 3).',
      'Enjoy: casual looking, for curiosity. Part 4 borrows its spirit, but its aim is present: a number you remember.',
      'Under Produce sits Annotate: that is the reader writing on a chart. Today’s notes are the author’s, part of present.',
      'Source: Tamara Munzner, Visualization Analysis and Design (2014), chapter 3.'
    ].join('\n'),
    notes: '2 min. The same figure as Week 3\'s "Why? Task abstraction" slide (assets/lesson/ipdv/munzner-why-tasks.png). Point at Consume: Discover, Present, Enjoy. ' +
      'Munzner 3.4.1.1: present is "for the succinct communication of information, for telling a story with data"; discover is finding something new or confirming a hypothesis; enjoy is casual use driven by curiosity. ' +
      'Today runs in that order with a twist: Part 3 does present then discover in one chart. Then point at Produce → Annotate: in Munzner it is the reader adding notes; today the author adds them, as part of present. ' +
      'Enjoy is the loosest fit: guess-first is present made memorable, not casual use; say so. The four levels (previous slide) are Munzner (2009), "A nested model for visualization design and validation"; the words Domain, What, Why, How, Idiom are from the 2014 book.' },

  { type: 'table', title: 'Munzner’s words, today’s words', tableHeader: true,
    body: 'Munzner asks\tHer word\tToday\tOn Marylebone Road\n' +
      'Who reads it?\tDomain\tdecides who drives\ta parent at the school gate, or a researcher\n' +
      'What is the data?\tWhat?\ta table\tone row per monitor per year, NO₂\n' +
      'Why are they looking?\tPresent\tLead\tthe finding: a third of 2010’s NO₂\n' +
      '\tDiscover\tLet go\t“where’s my road?”\n' +
      '\tEnjoy (nearest)\tMake it felt\tguess first, then see\n' +
      'How is it shown?\tIdiom\tthe author’s tools\theadline, note, highlight, tooltip',
    notes: '1 min. The bridge: every part of today is a Why? from Week 3, and every Build-it is a How?. Students who missed Week 3 can read this row by row.' },

  /* ======================================================== ① Lead */
  section('How do you make sure they see what you saw?', 'Part 1 · Lead · Munzner: present', '20 s. The author drives: Munzner\'s present.'),

  fig('One chart, three moves of the author', 'See it', { yMax: 180, series: ROADS, heroLabel: HERO_LABEL, key: [GREY_KEY], keyOnChart: true }, [
    { caption: 'The bare chart: correct, but it says nothing.', upto: 2025,
      explain: 'This is the same data as the hook, with no help.\nYou have to work out for yourself what matters: the fall? 2019? the end?' },
    { caption: 'Move 1: a headline that says the finding.', upto: 2025, refs: 1, headline: HEADLINE, sub: SUB,
      explain: 'Read only the title and you still have the point.\nThe dashed line gives the number meaning: the legal limit.\nThe subtitle says how to read it.' },
    { caption: 'Move 2: notes, written where things happened.', upto: 2025, refs: 1, notes: 4, headline: HEADLINE, sub: SUB,
      explain: 'Four events, at their years: the central ULEZ (2019), whose edge is this road; lockdown (2020); the ULEZ reaching this road (2021); then all London (2023).\nULEZ, the Ultra Low Emission Zone: older, dirtier vehicles pay a daily charge.\nA note says what happened, not that it caused the drop.' },
    { caption: 'Move 3: highlight. Every other road in grey, ours in red.', upto: 2025, refs: 1, notes: 4, others: 'grey', headline: HEADLINE, sub: SUB,
      explain: 'The grey gives context.\nNearly every road fell, and some were worse. Brixton Road: 174 in 2010, still 48 in 2025, the one London monitor over the limit.\nThe colour tells the eye where to look; the grey says “and the rest”.' }
  ], '5 min. Step through slowly. After step 1, ASK: "What should I take from this?" Take two answers; they will differ. That is the problem the author solves. ' +
    'Step 3: be careful with cause. The fall began before ULEZ and happened everywhere (cleaner buses, newer cars, the T-charge from Oct 2017). Notes mark events; they do not prove cause. ULEZ dates from TfL: central 8 April 2019, inner (to the North and South Circular) 25 Oct 2021, London-wide 29 Aug 2023. ' +
    'Marylebone Road (A501) is part of the Inner Ring Road, the boundary of the central zone (the same as the Congestion Charge\'s), and boundary roads are not charged: so the zone sat at this road\'s edge from 2019 and covered it from October 2021. Check TfL\'s zone map before class. ' +
    'Step 4: Brixton Road (LB4), Lambeth: London\'s worst monitor in 2010 (174), and in 2025 the only one over the legal limit (48). Putney High Street (WA7) was 168 in 2010 and 35 in 2025.'),

  panelFig('The author’s four tools', 'authorSvg', 4, {}, ['A headline that says the finding.', 'Notes on the chart, where it happened.', 'One thing in colour, the rest grey.', 'An order: first this, then that.'],
    '2 min. One panel per click. These four are what an author adds to a correct chart. The fourth, order, is what makes it a story and not a picture: the hook had an order (guess, then see). Credit: Segel and Heer (2010) call these narrative tactics: messaging (headlines, notes), highlighting, and ordering.'),

  reveal('Which title tells?', 'Name it', 'titles', ['Hands up: A, B or C?', 'A labels the chart.', 'B claims, but vaguely.', 'C tells the finding.'],
    '2 min. Hands up first, then reveal one at a time. C has a place, a measure, a direction, a size and a time. Push them: "Write a C-title for one chart in your Week 7 map." The 2025 deck called this "editorial guidance".'),

  build('bare', '1 min. The starting point, Week 2\'s chart on this week\'s data. Code: tools/ipdv-week9/code/steps.py; no2_london.csv has one row per monitor per year (code, site, borough, type, year, no2).'),
  build('headline', '2 min. alt.Title takes a subtitle. alt.datum(40) puts a mark at a value rather than a column (Altair 5). The title states the finding, not the topic.'),
  build('annotate', '2 min. It grows from the last slide: the line, the limit and the title stay, and only the new lines are printed. Notes are data: a small DataFrame of your own. Each rule rises only to its own note (y2=alt.datum(0) is the axis) and the words start at its top; "at" sets the height, falling from note to note, so no line crosses an earlier note\'s words (they did, in the first draft). ASK before showing the picture: "Where will \'Lockdown\' sit?"'),
  build('highlight', '2 min. It grows again: add the grey roads underneath, and this is slide 15\'s chart. In a layer, the chart added last is drawn on top, so grey goes first and red after. (alt.Order would not do it: on a line it orders the points along the line, not which line is on top.) detail splits lines without colouring them. ASK: "What happens if you write (line + others)?" (The grey covers the red.)'),

  statement('Say the finding in the title, then point at it on the chart', '30 s. Card 1.'),

  /* ======================================================== ② Let go */
  section('When should the reader drive?', 'Part 2 · Let go · Munzner: discover', '20 s. The reader drives: Munzner\'s discover.'),

  fig('Every monitor in London: find your road', 'See it', { yMax: 180, series: ALL, keyOnChart: true, key: [{ mark: 'line', colour: TYPES.Kerbside, text: 'kerbside' }, { mark: 'line', colour: TYPES.Roadside, text: 'roadside' }, { mark: 'line', colour: TYPES['Urban Background'], text: 'urban background' }, { mark: 'line', colour: TYPES.Suburban, text: 'suburban' }] }, [
    { caption: 'No headline, no notes: every monitor, coloured by where it stands. Point at any line.', upto: 0, others: 'type', hover: true,
      explain: 'This is the reader-driven end: the 163 monitors that have run since 2010 (59 still reported in 2025).\nColour says where the monitor stands: at the kerb, by a road, or in the background, away from busy roads.\nPoint at a line and it tells you its numbers, as Altair’s tooltip does.' },
    { caption: 'Mile End Road, Tower Hamlets, near our campus: 65 in 2010, 20 in 2025.', upto: 0, others: 'type', hover: true, lit: { id: 'TH2', year: 2025 },
      explain: 'A reader finds the road they know. That is why people stay with a dashboard.\nBut nothing here tells you the finding. You might never notice that nearly every line fell.' }
  ], '4 min. Let a student come up and point, or ask the room to call out a borough. Then step 2. ' +
    'Careful with "every line fell": part of the falling cloud is the worst sites closing (87 monitors reported in 2010, 59 in 2025). Of the 59 still running in 2025, one is over the legal limit: Brixton Road, 48. ' +
    'ASK: "What is the main finding of this chart?" Answers will be scattered: some see the fall, some the spread, some nothing. That is the cost of letting go. Mile End Road (TH2): 65 in 2010, 20 in 2025; Northeastern University London is in Tower Hamlets.'),

  panelFig('What a reader needs to drive', 'mantraSvg', 3, { arrows: true, sub: true }, ['Overview first: everything at once.', 'Zoom and filter: only what you ask for.', 'Details on demand: point, and it tells you.'],
    '2 min. Shneiderman\'s "visual information-seeking mantra" (1996). Each is a Week 5 tool: overview is the chart, zoom and filter are .interactive() and a selection, details are the tooltip.'),

  panelFig('One road, three rhythms', 'rhythmSvg', 3, { sub: true }, ['By hour: worst at 5 pm on weekdays.', 'By day: Sunday is cleanest.', 'By month: one year can’t show the seasons.'],
    '2 min. Discover in action: drill into one line of the dashboard (Marylebone Road) and it has rhythms the yearly average hides. 2025 hourly data from the London Air Quality Network (tools/ipdv-week9/fetch-hourly.mjs), London clock time. ' +
      `Weekdays: ${Math.min(...D.PAT.hour.weekday)} µg/m³ at 3 am, rising through the morning to a broad daytime plateau that peaks at ${Math.max(...D.PAT.hour.weekday)} at 5 pm; not two separate rush hours. Weekends lower and flatter. Days: weekdays ${D.PAT.day[0].no2}–${D.PAT.day[4].no2}, Sunday ${D.PAT.day[6].no2}; Friday is highest this year, but its gap over Thursday is within one year\'s noise, so do not claim it. ` +
      'Months: February, March and December are missing over a quarter of their hours (December has only 27%), so one year cannot show the seasons; Kamara and Harrison (2021), with ten years (2009–2018), found traffic pollution highest in winter. ASK: "When would you walk down Marylebone Road?"'),

  build('explore', '2 min. Nothing new in Altair: it is Week 5. The point is the decision, not the code: here we hand the reader the controls, and say nothing.'),

  reveal('What letting go costs', 'Name it', 'cost', ['They may miss your point.', 'They must know what to ask.', 'It takes time.', 'But they find themselves.'],
    '2 min. One row per click. The last row is why reader-driven charts work: people look for their own place first.'),

  statement('A dashboard answers the reader’s questions, not yours', '30 s. Card 2.'),

  /* ======================================================== ③ Both */
  section('Can you lead first, then let go?', 'Part 3 · Both · present, then discover', '20 s.'),

  drawn('Every data story sits somewhere on one line', 'spectrum.svg',
    '3 min. Segel and Heer (2010) studied 58 published stories and described the space between author-driven and reader-driven. They name the three hybrid structures in the middle (interactive slideshow, martini glass, drill-down story); the two end labels, linear story and dashboard, are ours, to give the ends an example. They also name seven genres (magazine style, annotated chart, partitioned poster, flow chart, comic strip, slide show, film/video/animation): the final infographic is a partitioned poster. The 2025 deck named three structures (linear, martini glass, interactive slideshow). ASK: "Where is the hook chart? Where is London Air\'s map?" (Linear; dashboard.) Fix from the 2025 deck: its slide 13 numbered the structures 1, 3, 2 and said "Example: The uses martini glass structure frequently", with the subject missing.'),

  drawn('The martini glass: lead first, then let go', 'martini.svg',
    '2 min. Read it from the bottom up: three steps up the stem, then the bowl. The stem must be short, or nobody reaches the bowl. The 2025 deck linked data.europa.eu\'s guide to the martini glass structure: keep the link on Canvas.'),

  fig('A martini glass, live', 'Both', { yMax: 180, series: ROADS, heroLabel: HERO_LABEL, key: [GREY_KEY], keyOnChart: true }, [
    { caption: 'The stem: the author tells the finding first.', upto: 2025, refs: 1, notes: 4, headline: HEADLINE, sub: SUB,
      explain: 'Marylebone Road fell to a third: no reader can miss it.\nThe notes say what happened when.\nIf they stop here, they still have the story.' },
    { caption: 'The bowl: every road appears. Point at any line.', upto: 2025, refs: 1, notes: 4, others: 'grey', hover: true, headline: HEADLINE, sub: SUB,
      explain: 'Now the reader drives: any line answers when you point at it.\nThey can find their own road, already knowing the story.' },
    { caption: 'A reader finds their road: Mile End Road, 20 in 2025.', upto: 2025, refs: 1, notes: 4, others: 'grey', hover: true, lit: { id: 'TH2', year: 2025 }, headline: HEADLINE, sub: SUB,
      explain: 'They see their road against the author’s story.\nThat is the martini glass: everyone gets the finding, and the curious get their own answer.' }
  ], '3 min. Let someone point. Compare with the dashboard slide: the same lines, but now everyone knows the finding before they explore.'),

  panelFig('Three ways to lead, then let go', 'structuresSvg', 3, {}, ['Martini glass: a stem, then a bowl.', 'Interactive slideshow: chapters, explore within each.', 'Drill-down: the reader picks the story, the author tells it.'],
    '2 min. Segel and Heer\'s three reader-driven-but-guided structures. A drill-down example: a map of London where clicking a borough opens that borough\'s story.'),

  build('stepper', '3 min. The martini glass of the last two slides, in code, grown from the highlight Build-it. The new idea: one parameter (chapter) drives both the stem and the bowl. It opens at chapter 1, the headline and the red line; chapter 2 adds the notes; chapter 3 is the bowl: the grey roads appear, with points the tooltip can answer from. ' +
    'Why the points: a tooltip on a bare line answers with the line\'s first row (2010) wherever you point; points give each year its own answer. ASK: "What will chapter 2 add?" Then change value=1 to value=3 and run it again: it opens on the bowl, a dashboard.'),

  reveal('Why a martini glass for the public?', 'Three answers', 'martini', ['Hands up: A, B or C?', 'A is weak: about looks.', 'B is stable: a point and a reason.', 'C is excellent: every link of the chain.'],
    '2 min. The point, because, so, in this case chain, as in Week 8. Ask them to rewrite B into C in pairs before you reveal C.'),

  statement('Lead first, then let go', '30 s. Card 3.'),

  /* ======================================================== ④ Make it felt */
  section('How do you make a number land?', 'Part 4 · Make it felt · present, made memorable', '20 s. "Experiential": the reader takes part, or feels the size. Nearest to Munzner\'s enjoy in spirit, but the aim is present: a number the reader remembers.'),

  panelFig('Four stories that made data felt', 'famousSvg', 4, {}, ['Snow Fall: told by scrolling.', 'You Draw It: you draw, then see.', 'Out of Sight, Out of Mind: one mark per strike.', 'Dear Data: drawn by hand.'],
    '4 min. Drawn as sketches of the move each one makes, not copies: open the real ones from Canvas. ' +
    'Snow Fall: The Avalanche at Tunnel Creek, John Branch, New York Times, December 2012; won the 2013 Pulitzer Prize for feature writing; the piece that made "scrollytelling" common. ' +
    'You Draw It: How Family Income Predicts Children\'s College Chances, Gregor Aisch, Amanda Cox and Kevin Quealy, NYT The Upshot, May 2015. ' +
    'Out of Sight, Out of Mind, Pitch Interactive, 2013: every US drone strike in Pakistan since 2004, each falling as a line, with the people killed below. ' +
    'Dear Data, Giorgia Lupi and Stefanie Posavec: a year of weekly hand-drawn postcards (2014–15), book 2016; the postcards are in MoMA\'s collection. Check each fact before class.'),

  panelFig('Four ways to make a number land', 'feltSvg', 4, { sub: true }, ['Guess first: then the truth beside it.', 'Count it out: one square per thing.', 'Human scale: in units people know.', 'Make it physical: a thing you can hold.'],
    '3 min. All four on the hook\'s story. ASK after each: "Which would work on a poster people pass quickly? Which in a museum?" ' +
    'Count it out needs things you can count: a concentration is not a count, so the squares are monitors, one each, red when over the legal limit (2010: 60 of 87; 2025: 1 of 59, Brixton Road). ' +
    'Human scale: the WHO 2021 guideline for NO₂, annual mean, is 10 µg/m³, so each block is one guideline\'s worth: about ten in 2010, three in 2025. ' +
    'Making it physical: a bar chart of LEGO or sugar cubes, a printed model; Jansen et al. (CHI 2015) call this data physicalisation.'),

  build('guess', '3 min. Altair cannot take a hand-drawn line (You Draw It used D3), so a slider stands in for the guess: one point at 2025, where the guess is about. The tick box shows the truth, drawn thicker than anything else. Try it: the picture is how it opens, with only the guess; tick "Show me" and the red line appears from 2016. ' +
    'alt.datum(40) on the headline slide was a fixed number; the guess is a parameter that moves, so Altair needs alt.YDatum(guess, type=\'quantitative\') to know what kind of number it is.'),

  reveal('An experience can mislead, too', 'Care', 'care', ['Show the truth, clearly.', 'Feeling is not evidence.', 'Keep the scale honest.', 'Never shame a guess.'],
    '2 min. One row per click. The air data has its own trap: where a monitor stands. In 2025 kerbside monitors averaged 31, roadside 23, urban background (away from busy roads) 17: kerbside is about twice background, roadside about 1.4 times. Never compare them as if they were the same.'),

  statement('Ask before you tell: a guess makes the answer stick', '30 s. Card 4.'),

  /* ======================================================== Arriving */
  section('Who reads it, and who should drive?', 'Arriving', '20 s.'),

  reveal('Lead, let go, or both?', 'Check', 'quiz', ['Hands up for each: Lead, Let go or Both?', 'A poster: lead.', 'A researcher: let go.', 'A news story: both.', 'A council meeting: lead.', 'Your infographic: lead.'],
    '3 min. Answer first, then reveal. Question 5 matters for the assessment: a printed page has no buttons, so every panel must lead.'),

  reveal('Take the next step, only as far as you need', 'Got one wrong?', 'ladder', ['First, ask yourself who reads it.', 'Still stuck? A hint.', 'Still stuck? A worked example.', 'Then try a new one.'],
    '2 min. The missing-link ladder. Answer to step 4: both. Parents want the finding (is the air safe?), then to find their own street.'),

  { type: 'content', title: 'Four cards, one sentence',
    bullets: [
      '1\tSay the finding in the title, then point at it on the chart.',
      '2\tA dashboard answers the reader’s questions, not yours.',
      '3\tLead first, then let go.',
      '4\tAsk before you tell: a guess makes the answer stick.'
    ], progressive: true,
    notes: '1 min. Read as one: decide who drives, lead with the finding, open it up when the reader is ready, and make the number felt.' },

  { type: 'content', title: 'On your final infographic',
    bullets: [
      'Headline\tEach panel’s title is a finding, not a topic',
      'Note\tAt least one note written on a chart, where it happened',
      'Highlight\tOne thing in colour per panel, the rest grey',
      'Order\tRead top to bottom: what comes first, and why?',
      'Felt\tOne number made human: a count, a scale, a comparison'
    ], progressive: true,
    notes: '1 min. Ties Week 9 to the final piece. An infographic is author-driven: it cannot let go.' },

  { type: 'content', title: 'In the lab: one air-quality story, five steps',
    bullets: [
      'Concept\tWho is your reader, and what should they know in 3 seconds?',
      'Data\tno2_london.csv, or the WHO air-quality database for world cities',
      'Sketch\tOn paper first: the headline, the highlight, the order',
      'Design\tGrey for context, one colour for the point, notes on the chart',
      'Build\tIn Altair: a martini glass, chapters, then open'
    ],
    notes: '1 min. The 2025 lab (10_Lab_IPDV_Experiential_Data_Vis-Live.ipynb) has the same five steps on the WHO data. Its known problems: it geocodes thousands of cities through Nominatim (against its one-request-a-second policy; hours to run), drops most rows with dropna on pm25 and no2 together, and uses seaborn rather than Altair. Point students to no2_london.csv for the Altair build.' },

  statement('Tell your neighbour: when should a chart stop telling and start listening?', '2 min. Instead of "any questions?": one sentence each, to the person next to them. Listen for "after the main point is made". Then open the floor.')
  ];
}

/* The student copy: room-only slides hidden. */
/* The Marylebone Road photo's source is not yet known, so it stays out of the copy that goes on Canvas. */
const STUDENT = [['Tell your neighbour: when should a chart stop telling and start listening?', 'none'], ['Meet Marylebone Road', 'none']];
/* Optional slides: "OPTIONAL: skip if short of time" in their notes. */
const REFERENCE = ['Build it: start with the bare line', 'Three ways to lead, then let go', 'On your final infographic'];

module.exports = { lesson, STUDENT, REFERENCE, BUILDS };
