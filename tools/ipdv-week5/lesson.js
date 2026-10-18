'use strict';
/* Week 5 · Charts that answer back: every slide, in teaching order.
 * The plan is docs/ipdv-week5-plan.md; the figures are src/figures/.
 * Every technique runs See it → Name the mechanics → Build it, and every
 * Build it points to the same pattern in the student's guide. */
const F = require('./figures.js');
const { STRIP } = require('./drawings.js');
const { STEPS: PAGE_STEPS, MAP_STEPS } = require('./page.js');

const DIR = 'assets/lesson/ipdv/week5';
const asset = name => `${DIR}/${name}`;
const WORLD_FILE = asset('world-110m.json');
const pic = (title, file, notes, extra) => Object.assign({ type: 'image', title, image: asset(file), imageFit: 'contain', design: { capStyle: 'none' }, notes }, extra || {});
/** A drawing built one part at a time: each state its own slide, the later ones cut with no transition. */
const built = (title, files, notes) => files.map((f, i) => pic(title, f, notes[i] || '', i ? { transition: 'none' } : {}));
const section = (title, part, notes) => ({ type: 'section', title, subtitle: part, notes });
/* Build the page: the final infographic one week at a time, the Altair beside the panel it makes
   (tools/ipdv-week5/page.js; the code runs in page/steps.py). Same slides in both lectures, marked for `here`. */
const PAGE_NOTES = {
  w1: 'Week 1: lead with the finding. Three tiles, each mark_text layered (big value over caption), set side by side with hconcat. The numbers are computed, never typed: growth from the totals, the leaders with idxmax.',
  w2: 'Week 2: data → mark → encode → chart. One line of city totals. 2023 is missing for District C, so its total is NaN (min_count=6) and the line breaks: unknown is not zero.',
  w3: 'Week 3: pick the channel by the task. "Who is highest?" is a comparison, so length on a shared baseline, ranked with sort="-x". Per 1,000 residents, not raw counts.',
  w4: 'Week 4: colour is data. A sequential blues scale with a fixed domain, so the heatmap and the map can share it. Missing data gets its own grey, layered on top, never the lightest blue.',
  w5: 'Week 5: the chart answers back. A tooltip with chosen fields and formats, and a hover selection (input → parameter → predicate → response) that turns one point red. Labels so the page still reads in print.',
  w7: 'Week 7: maps. mark_geoshape, a join with transform_lookup on the district code, a projection. It reuses Week 4\'s rate_colour, so one legend serves both. The squares run clockwise: d3 fills an anticlockwise ring inside out.',
  page: 'Compose. vconcat stacks the rows, hconcat pairs the panels; configure once, on the whole page. ASK: "Which week taught each panel?" Then save to HTML. The full file, every block in order, is infographic-by-week.py beside the slides.'
};
const buildPage = (here, PAGE, between = []) => [
  section('How does every week end up on one page?', 'Build the page · week by week',
    '20 s. The final piece, one panel per week, the code that makes each. All of it runs, on the workbook\'s synthetic city: assets/lesson/ipdv/week5/infographic-by-week.py.'),
  ...between,
  /* Before any code, for a room new to it: each chart is a piece of paper, | glues side by side, & underneath. */
  pic('Cut and glue: how Altair makes a page', 'page-cut.svg',
    '2 min. For anyone nervous about code: no new syntax yet, just the idea. SAY: "Every chart you have made is a piece of paper with a name. ' +
    'A bar between two names puts them side by side. An and-sign puts one under the other. That is all a page is." ' +
    'Point at each picture, left to right. Then: "You never move anything by hand, and if the order is wrong you swap two names and run it again. Nothing breaks." ' +
    'The | and & are shorthand for alt.hconcat and alt.vconcat, which the compose slide uses.'),
  ...PAGE.map((st, i) => pic(st.week === '★' ? 'Compose: one page, every week' : `Build the page · Week ${st.week}`, `page-${st.id}-w${here}.svg`,
    `1 min. ${PAGE_NOTES[st.id]}`, i ? { transition: 'none' } : {}))
];
/* Before the lecture: a map of London on made-up data, one move at a time, then the hand-over into the maps lecture's three parts. */
const MAP_NOTES = {
  m1: 'Before the lecture. Move 1, shapes: load the 33 boroughs (GeoJSON), one feature each, its name in properties. No data yet, so every borough is the same grey. Today\'s Part 1 asks whether this geometry adds meaning at all. If a map ever fills the whole frame, the rings run the wrong way round: d3 wants outer rings clockwise (this copy is fixed).',
  m2: 'Move 2, data and the join. Made-up numbers, one row per borough, from a seeded generator so everyone gets the same map. transform_lookup brings each row to its shape by name. Colour by name is a check, not the map: any grey borough found no row. Fix the key, never the colour. The lab joins by GSS code instead (guide §3–4), which survives spelling.',
  m3: 'Move 3, fill: a sequential blues scale, darker means more. A rate per 1,000 residents, not a count, or the biggest boroughs win. Today\'s Part 3 is about this choice: rates, class breaks, palettes.',
  m4: 'Move 4, flatten and answer back: a projection and a tooltip, saved to HTML so it can be hovered. Try type="identity" with reflectY: London squashes. Choosing the projection is today\'s Part 2.'
};
const makeMap = () => [
  ...MAP_STEPS.map((st, i) => pic(`Make a map of London · move ${st.move}`, `page-${st.id}.svg`, `1 min. ${MAP_NOTES[st.id]}`, i ? { transition: 'none' } : {})),
  pic('Four moves, and why each one matters', 'page-bridge.svg',
    '1 min. The hand-over. SAY: "You can write every move already. Today is why: does geography add meaning (Part 1), what the flattening lies about (Part 2), how to fill it honestly (Part 3). The join you practise in the lab."')
];
/* An animated demonstration as a silent clip that loops: the Lesson studio draws a GIF as one
   still frame, so each GIF is made into an MP4 (tools/ipdv-week5/gif2mp4.swift) and plays here. */
const clip = (title, file, notes, extra) => Object.assign({ type: 'video', title, video: asset(file), videoAutoplay: true, videoLoop: true, videoMuted: true, design: { capStyle: 'none' }, notes }, extra || {});

/* ------------------------------------------------------------- shared */

const W15 = extra => F.world2015(extra);
const WORLD_COLUMNS = ['country', 'income', 'health', 'population', 'region'];
const TIP = {
  country: { field: 'country', title: 'Country' },
  income: { field: 'income', title: 'Income', format: '$,.0f' },
  health: { field: 'health', title: 'Life expectancy', format: '.1f' },
  population: { field: 'population', title: 'Population', format: ',' }
};
const FULL_TIP = [TIP.country, TIP.income, TIP.health, TIP.population];

/* The tooltip, built a line at a time (Code ↔ chart), the guide's §3 pattern. */
const TOOLTIP_CODE = [
  'import altair as alt',                                                  // 0
  'from vega_datasets import data',                                        // 1
  'world = data.gapminder_health_income()',                                // 2
  '',                                                                      // 3
  'detail = [',                                                            // 4
  "    alt.Tooltip('country:N', title='Country'),",                        // 5
  "    alt.Tooltip('income:Q', title='Income', format='$,.0f'),",          // 6
  "    alt.Tooltip('health:Q', title='Life expectancy', format='.1f'),",   // 7
  "    alt.Tooltip('population:Q', title='Population', format=','),",      // 8
  ']',                                                                     // 9
  '',                                                                      // 10
  'alt.Chart(world).mark_circle().encode(',                                // 11
  'alt.Chart(world).mark_circle(tooltip=True).encode(',                    // 12
  "    x=alt.X('income:Q', scale=alt.Scale(type='log')),",                 // 13
  "    y=alt.Y('health:Q', scale=alt.Scale(zero=False)),",                 // 14
  "    size='population:Q',",                                              // 15
  "    tooltip='country:N',",                                              // 16
  '    tooltip=detail,',                                                   // 17
  ')'                                                                      // 18
];
const TOOLTIP_STRIP = { input: 'pointer over a bubble', parameter: 'the row under it', predicate: 'none: show that row', response: 'a card of chosen fields' };

const BUG_CODE = [
  'alt.Chart(world).mark_bar().encode(',               // 0
  "    x='sum(population):Q',",                       // 1
  "    y='region:N',",                                // 2
  "    tooltip=['region:N', 'country:N'],",           // 3
  "    tooltip=['region:N',",                         // 4
  "             alt.Tooltip('sum(population):Q',",    // 5
  "                         format=',')],",           // 6
  ')'                                                 // 7
];

const MOTION = () => F.motion();
const MAP = extra => Object.assign({ world: WORLD_FILE, tooltip: F.MAP_TOOLTIP, source: 'Natural Earth 1:110m (public domain) · ' + F.GAPMINDER + ' · 2015' }, extra || {});

/* ------------------------------------------------------------- slides */

function week5() {
  return [
  /* ======================================================== Opening */
  { type: 'title', title: 'Charts that answer back',
    subtitle: 'LDSCI6253 Advanced Information Presentation & Visualisation · Week 5 · Audience, interaction and animation',
    notes: 'Up as they arrive.\nThe promise for today: every technique, we see it in a real chart, name its mechanics, then build it in Altair. ' +
      'Students asked for exactly that: "how does that work in Altair, and what are the mechanics of building with tooltip?"' },

  /* ======================================================== Hook */
  pic('Starter: a static chart', 'starter-static.png',
    '1 min. From the 2025 deck\'s starter. Leave it up for 20 seconds. ASK: "What is this chart telling you?"'),

  clip('Starter: the same chart, moving', 'starter-animated.mp4',
    '1 min. The animated Gapminder version. ASK: "Which one feels clearer? Which one keeps your attention longer? Why?" Take three answers, then: "Let\'s test that."', { transition: 'none' }),

  { type: 'figure', figure: 'bubbles', title: 'Find the United Kingdom',
    figureEyebrow: 'Before we start', figureAlt: 'A bubble chart of 187 countries, income per person against life expectancy in 2015, every bubble grey and unlabelled.',
    figureData: W15(),
    figureSteps: [
      { caption: '187 countries. One of them is the United Kingdom. Hands up when you have found it.', clock: 'run' },
      { caption: 'One hover. That card is a tooltip: details on demand.', point: 'United Kingdom', clock: 'stop' },
      { caption: 'Now hover any country yourself. The chart answers whatever you ask it.', point: 'United Kingdom', clock: 'stop', colour: true, legend: true }
    ],
    notes: '2 min. LIVE: the clock starts when the slide arrives.\nASK: "Hands up when you have found the UK." Let it run 20–30 seconds.\n' +
      'NEXT: a pointer glides to one bubble and its tooltip opens; the clock stops in red. SAY: "Same chart, one hover."\n' +
      'NEXT: region colours. Hover a few countries (Qatar top right, Lesotho bottom, India, the big one in the middle). The card is drawn as Altair\'s tooltip looks in Jupyter.\n' +
      'Data: vega_datasets gapminder-health-income.csv (Gapminder, 2015). Bubble area is population.' },

  { type: 'video', title: 'The best stats you’ve ever seen', subtitle: 'Hans Rosling · TED, 2006',
    video: 'https://www.youtube.com/watch?v=hVimVzgtD6w', videoAutoplay: false, design: { capStyle: 'none' },
    notes: 'The full talk is about 20 minutes: play only the stretch where the bubbles move, a few minutes at most. Set its start and stop on this slide (Start at / Stop at) once you have picked them. It waits for a press: ask first, then press K or the play button in the bar to play and pause.\nASK before: "Watch what he can do that you couldn\'t on the last slide."\n' +
      'ASK after, and write the answers up. Three come every time: HE COULD POINT, HE COULD PICK, IT MOVED. And it is the whole world. That is today\'s route.' },

  { type: 'cards', title: 'What did he have that you didn’t?', progressive: true,
    bullets: [
      'He could point\tOne country, its numbers, when he wanted them. Details on demand: the tooltip.',
      'He could pick\tOne country lit while the rest stayed as context. Selection, and views that answer each other.',
      'It moved\tFifty years in a minute, and he could follow one country through them. Animation, and identity.',
      'He knew his audience\tA room of non-specialists, one story at a time. Who it is for decides what it does.'
    ],
    notes: '1 min. Their answers, named. These become today\'s four stops, starting with the last: the audience. First, where today sits in the course. (His regions were places too: that is next lecture, maps.)' },

  { type: 'content', title: 'Before we start',
    bullets: [
      'Reading\tMunzner, Visualization Analysis and Design: 6.5–6.8 (rules of thumb) and Chapter 11 (manipulate view)',
      'Worksheets\tOn Canvas by midday on the Friday after the lab',
      'Your guide\tThe Interaction & Animation guide: every Build it slide today points into it',
      'Stuck?\tAsk early. Don’t wait until the last minute'
    ],
    notes: '1 min.\nREADING, checked against the book: 6.5 Eyes Beat Memory (why animation is hard to analyse), 6.6 Resolution over Immersion, ' +
      '6.7 Overview First, Zoom and Filter, Details on Demand, 6.8 Responsiveness Is Required; Chapter 11 Manipulate View.\n' +
      'Fixes carried over from the 2025 deck: its reading slide said 8.3 is "animation as a design choice" and Chapter 11 is "evaluation methods". ' +
      'In the book 8.3 is Geometry (next lecture, maps) and Chapter 11 is Manipulate View. The lab sheet said Monday 23:59; the hand-in is midday Friday.' },

  { type: 'content', title: 'Last week: why colour?',
    bullets: [
      'Separate\tdifferent data: categories you can tell apart',
      'Pattern\tshow patterns easily: lightness orders, hue labels',
      'Meaning\tadd meaning and emotion, carefully: meanings are learned',
      'Attention\tone colour against grey points the way'
    ],
    notes: '1 min. The 2025 deck\'s recap of Week 4. Today colour stays the same; the chart starts to respond.' },

  /* The route: Week 4's pipeline, as the course. Two pictures so each has room. */
  ...built('One chart at a time',
    ['route-1.svg', 'route-2.svg', 'route-3.svg', 'route-4.svg', 'route-5.svg', 'route.svg'],
    ['2 min for the six states. The course so far, from the code and the picture side by side. Each column: what you write, what you see, what it means.\n' +
      'WEEK 1: alt.Chart(...).mark_circle(): a chart shows what a table hides. You met Rosling\'s Gapminder with a year slider (Intro guide §4).',
     'WEEK 2: encode(x=, y=): data → mark → encode → chart. The six-step pipeline (Building guide §0, §2).',
     'WEEK 3: more channels, one at a time: colour and shape for category, size for quantity. Pick the channel by the task (Encoding guide §0).',
     'WEEK 4: alt.Color with a scheme: colour is data, and lightness orders (Colour guide §0).',
     'WEEK 5, YOU ARE HERE: tooltip=, add_params, key=. The same chart learns to answer back.',
     'All five lit. SAY: "Every week has added one line to the same chart."']),

  ...built('Then one page',
    ['ahead-1.svg', 'ahead-2.svg', 'ahead-3.svg', 'ahead.svg'],
    ['1 min for the four states. STILL TO COME.\nWEEK 6, reading week: no new code. Rebuild one chart from each guide.',
     'WEEK 7, MAPS: mark_geoshape, a join with transform_lookup, a projection. Today ends with a first look.',
     'THE FINAL PIECE: an infographic where every week becomes one panel. Point at the badges: stat tiles and the insight title from Week 1, the line from Week 2, ' +
       'ranked bars from Week 3, the heatmap\'s colour from Week 4, the scatter you can hover from Week 5, the map grid from Week 7.',
     'All three. SAY: "At the end you compose them: one page, every week." Then the real one.']),

  pic('Where it ends: one page, every week', 'infographic-final.png',
    '1 min. The final piece, from the guides (alt_Week5_visualisation_infographic.png; the notebook is student_five_visualisation_infographic.ipynb). ' +
    'Five charts and three stat tiles composed with alt.vconcat / hconcat (Interaction guide §15). Synthetic teaching data, and it says so. ' +
    'ASK: "Which week taught each panel?" Then: "What would you change before it goes to a reader?"'),

  { type: 'content', title: 'By the end of today you can',
    bullets: [
      'Design\tfor a target audience: write a persona, and say what it needs from a chart',
      'Explain\tthe role of interaction, and its main techniques: select, explore, reconfigure, encode, filter, abstract, connect',
      'Build\ta tooltip in Altair, with chosen fields, titles and formats, and spot its two classic bugs',
      'Link\tviews with hover, click, legend and brush, and read any of them as input → parameter → predicate → response',
      'Analyse\tanimation as a visual variable: attention, dynamics, state transitions, engagement',
      'Judge\twhen animation helps and when small multiples beat it; keep identity with key='
    ], progressive: true,
    notes: '1 min. Outcome 2 is the one to repeat: every interaction we meet today gets the same four boxes.' },

  { type: 'journey', title: 'Today’s route', subtitle: 'Four stops, one question each', progressive: false,
    bullets: [
      'Audience\tWho is the chart for, and what will they ask?',
      'Point\tWhat belongs in a tooltip?',
      'Pick\tHow do views talk to each other?',
      'Move\tWhen should a chart move?',
      'Next lecture\tMaps: does geography add meaning?'
    ],
    notes: '30 s. Four stops today. Each one: see it, name the mechanics, build it.' },

  /* ======================================================== ① Ask */
  section('Who is the chart for?', 'Part 1 · Audience', '20 s. Interaction is for a reader. Which reader, and which question?'),

  { type: 'split', title: 'A persona is a user, made specific', image: asset('persona-portrait.jpg'),
    bullets: [
      'Illustrate who the users are, and how they differ',
      'Compare groups: a typical commuter against a remote worker',
      'Highlight the needs, behaviours and challenges tied to the data',
      'Built from research, interviews and surveys, and updated as you learn'
    ], progressive: true,
    notes: '2 min. Originally proposed to represent perceived users or customers; in practice often current, real ones (2025 deck). Creating personas: gather data, find segments, write a name, background and motivation, keep updating (2025 Week 5 PDF).' },

  { type: 'split', title: 'Why–Persona–Why', image: asset('persona-group.jpg'),
    bullets: [
      'Humanise data: abstract numbers feel relatable',
      'Invoke empathy: the audience connects with the data',
      'Communicate fast: a persona is grasped quicker than a raw chart',
      'Make it memorable: in presentations, reports and stories'
    ], progressive: true,
    notes: '2 min. From the 2025 deck. WHY (purpose): personas are simplified, fictional but data-informed representations of user groups, customers or audiences.' },

  { type: 'compare', title: 'One chart, two readers', subtitle: 'Amira · policy analyst\tSam · reading the news', progressive: true,
    bullets: [
      'Goal\tCompare countries precisely, year by year\tGet the one story, fast',
      'Question\t"Which countries gained most since 1990?"\t"Are we getting healthier?"',
      'Device\tLaptop, two screens\tPhone, on the bus',
      'Needs\tTooltips, filters, a year slider\tA good default view; one highlight',
      'Risk\tToo few controls\tToo many controls'
    ],
    notes: '3 min. PERSONAS in use (Guide §1): a persona is a design hypothesis built from research, not evidence about a whole group. ' +
      'It ties to Munzner\'s domain level: who are the users? Interaction is only worth its cost if a reader needs to ask the chart something.\n' +
      'ASK: "Which of you is Sam? Which is Amira? What would you add for each?"' },

  { type: 'compare', title: 'When a persona helps, and when it misleads', subtitle: 'Works for\tWatch out for', progressive: true,
    bullets: [
      'Purpose\tPersuasion and storytelling\tOversimplifying a whole group',
      'Audience\tNon-technical readers\tStereotypes not grounded in data',
      'Use\tAdvocacy and policy, e.g. public health\tExploratory analysis: better for communication than discovery'
    ],
    notes: '2 min. From the 2025 deck\'s "Why (effectiveness)". A persona is a design hypothesis to test, not evidence (guide §1).' },

  { type: 'content', title: 'Your turn: one persona, one chart', subtitle: 'Pairs · 3 minutes · Lab Task 1', progressive: true,
    bullets: [
      'Who\tName, role, how much they know about data',
      'Goal\tThe one question they bring to the chart',
      'Where\tDevice and setting: phone on a bus, two screens at a desk',
      'Needs\tWhich interaction would help them, and which would get in the way'
    ],
    notes: '4 min with feedback. Pairs write a persona for the Gapminder chart (or their own project). Take two back: "What interaction did your persona need?" ' +
      'This is the Lab sheet\'s Task 1, Understanding your audience.' },

  { type: 'quote', body: 'Overview first, zoom and filter, then details-on-demand.', subtitle: 'Ben Shneiderman, The Eyes Have It (1996)',
    notes: '30 s. The visual information-seeking mantra. Munzner 6.7. Next slide plays it out on Rosling\'s chart.' },

  { type: 'figure', figure: 'bubbles', title: 'The mantra, on one chart',
    figureEyebrow: 'Overview first, zoom and filter, details on demand', figureAlt: 'The Gapminder chart shown whole, then zoomed to rich countries, then filtered to Europe, then one country\'s tooltip.',
    figureData: W15(),
    figureSteps: [
      { caption: 'Overview first: every country at once. The shape of the world: richer, longer lives.', colour: true, legend: true },
      { caption: 'Zoom: just the rich, long-lived corner. Same data, more room.', colour: true, focus: { x: [8000, 160000], y: [70, 86] } },
      { caption: 'Filter: only Europe & Central Asia. Everything else steps aside.', colour: true, focus: { x: [8000, 160000], y: [70, 86] }, only: 'europe_central_asia' },
      { caption: 'Details on demand: one country, its exact numbers.', colour: true, focus: { x: [8000, 160000], y: [70, 86] }, only: 'europe_central_asia', point: 'United Kingdom' }
    ],
    notes: '2 min. Four presses, four stages of the mantra on one dataset.\nZOOM changes the scale (in Altair: bind=\'scales\' or a domain). ' +
      'FILTER removes items (transform_filter). DETAILS shows one item\'s values (tooltip).\nAfter the last step, hover: the filtered-out countries no longer answer.' },

  ...built('Every interaction is four boxes', ['strip-1.svg', 'strip-2.svg', 'strip-3.svg', 'strip-4.svg', 'strip.svg'],
    [`2 min. THE MECHANICS STRIP, the grammar of the guide (§5). Every interaction today gets these four boxes.\n${STRIP[0].key}: ${STRIP[0].ask} In the hover example: ${STRIP[0].eg}.`,
     `${STRIP[1].key}: ${STRIP[1].ask} A selection stores a value: here, which country is under the pointer. In Altair: selection_point(fields=['country']).`,
     `${STRIP[2].key}: ${STRIP[2].ask} For each mark: is it the stored one? alt.when(hover).`,
     `${STRIP[3].key}: ${STRIP[3].ask} .then(...) for the marks that pass, .otherwise(...) for the rest.`,
     'All four. SAY: "Hover, click, legend, brush, slider: only the INPUT box changes. Learn the strip once."']),

  { type: 'table', title: 'Seven things interaction lets a reader do', tableHeader: true,
    body: 'Technique\tThe reader…\tFor example\tIn Altair\n' +
      'Select\tmarks something as interesting\thighlight a country\tselection_point\n' +
      'Explore\tshows something else\tpan and zoom\tbind=\'scales\'\n' +
      'Reconfigure\tshows a different arrangement\tre-sort the bars\ta radio that changes the sort\n' +
      'Encode\tshows a different representation\tswitch the measure\tbinding_select on a field\n' +
      'Abstract / elaborate\tshows more or less detail\toverview + detail; a tooltip\ttooltip=, interval on x\n' +
      'Filter\tshows something conditionally\tonly one region\ttransform_filter\n' +
      'Connect\tshows related items\tbrushing and linking\tthe same selection in two charts',
    notes: '3 min. The 2025 deck\'s list of core techniques. Its source is Yi, Kang, Stasko & Jacko (2007), "Toward a deeper understanding of the role of interaction in information visualization" ' +
      '(the 2025 slide credited VAD 6.6–6.8; Munzner\'s own treatment is Chapter 11). Every row is in the guide: §5–13.' },

  /* ======================================================== ② Point */
  section('What belongs in a tooltip?', 'Part 2 · Point', '20 s. The students\' question: what are the mechanics of building with tooltip?'),

  { type: 'links', title: 'See it: tooltips in the wild',
    bullets: [
      'Gapminder Tools\thttps://www.gapminder.org/tools/#$chart-type=bubbles',
      'Our World in Data · CO₂ emissions\thttps://ourworldindata.org/co2-emissions',
      'Our World in Data · life expectancy\thttps://ourworldindata.org/life-expectancy'
    ],
    notes: '2 min. Open one live and hover. ASK each time: "What is in the card? What is NOT in it? Why those fields, in that order?" ' +
      'OWID\'s card leads with the country and the value with its unit and year; the source is one line under it.' },

  { type: 'figure', figure: 'rowtable', title: 'A tooltip is the row under the pointer',
    figureEyebrow: 'Name the mechanics', figureAlt: 'The Gapminder chart beside its data table; the United Kingdom\'s bubble and its row are lit, with its tooltip.',
    figureData: W15({ columns: [{ field: 'country' }, { field: 'income', format: ',d' }, { field: 'health', format: '.1f' }, { field: 'population', format: '.3s' }] }),
    figureSteps: [
      { caption: 'Every bubble is one row of the table. Hover one: its row lights.', demo: 'United Kingdom', card: false },
      { caption: 'The card is that row, printed: the fields you chose, in your order. Nothing is computed.', demo: 'United Kingdom' }
    ],
    notes: '2 min. HOVER live: the table follows. SAY: "Vega keeps the row (the datum) behind every mark. A tooltip just prints fields from it." ' +
      'So: a field that is not in the data cannot be in the tooltip. And an aggregated mark has no single row; it has a group. That is the bug in a few slides.' },

  { type: 'figure', figure: 'codechart', title: 'Build the tooltip, one line at a time', figureGround: 'split',
    figureEyebrow: 'Build it · Altair', figureAlt: 'Altair code on the left building a tooltip; the bubble chart it makes on the right, with a tooltip card on the United Kingdom.',
    figureData: F.world2015({ code: TOOLTIP_CODE, chart: 'scatter', columns: WORLD_COLUMNS, guide: 'Your guide §3 · The mechanics of tooltip=', strip: { input: '', parameter: '', predicate: '', response: '' } }),
    figureSteps: [
      { caption: 'The chart from the start of the lesson, in Altair. Hover it: nothing answers.', show: [0, 1, 2, 3, 11, 13, 14, 15, 18], tooltip: null },
      { caption: 'One line. Now every bubble answers, with the raw field and its column name.', show: [0, 1, 2, 3, 11, 13, 14, 15, 16, 18], tooltip: 'country', demo: 'United Kingdom', strip: 'response', stripText: TOOLTIP_STRIP },
      { caption: 'A list of alt.Tooltip: you choose the fields, their order and their titles.', show: [0, 1, 2, 3, 4, 5, 9, 10, 11, 13, 14, 15, 17, 18], tooltip: [TIP.country], demo: 'United Kingdom', strip: 'response', stripText: TOOLTIP_STRIP },
      { caption: 'Type says what the field is; format says how to print it. $,.0f gives $38,225.', show: [0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 13, 14, 15, 17, 18], tooltip: [TIP.country, TIP.income], demo: 'United Kingdom', strip: 'response', stripText: TOOLTIP_STRIP },
      { caption: 'A field can be in the card without being on the chart. Population is only in the size.', show: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 17, 18], tooltip: FULL_TIP, demo: 'United Kingdom', strip: 'parameter', stripText: TOOLTIP_STRIP },
      { caption: 'The shortcut, tooltip=True: every field, raw. No titles, no formats, and region in code.', show: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 18], lit: [12], tooltip: 'all', demo: 'United Kingdom', strip: 'response', stripText: TOOLTIP_STRIP },
      { caption: 'Back to the list. Now hover any country: the card is the list on the left.', show: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 17, 18], lit: [4, 5, 6, 7, 8, 9, 17], tooltip: FULL_TIP, strip: 'response', stripText: TOOLTIP_STRIP }
    ],
    notes: '5 min. THE STUDENTS\' QUESTION, answered. Each Next types a line on the left and the chart on the right changes to match. Hover it at any step.\n' +
      '1 No tooltip. 2 tooltip=\'country:N\': one field, titled by its column name. 3 A list of alt.Tooltip with titles (the guide calls it detail). ' +
      '4 Type vs format: :Q says it is a number; format=\'$,.0f\' prints $38,225 (guide §3.4). 5 Population is in the card although it is only size on the chart. ' +
      '6 mark_circle(tooltip=True): every field raw: "region europe_central_asia". 7 The finished list.\nLAB: the same pattern on London boroughs is guide §3; §3.5 adds missing values.' },

  ...built('Tooltip, exploded', ['anatomy-1.svg', 'anatomy-2.svg', 'anatomy-3.svg', 'anatomy-4.svg', 'anatomy.svg'],
    ['2 min. The card from the last slide, blown up. Four choices made it.\nTHE FIELD: which column fills the value. country:N → United Kingdom.',
     'THE TITLE: what the key says. Leave it out and the key is the column name ("health"), which a reader should never have to decode.',
     'THE FORMAT: how the value prints, in d3-format. $,.0f → $38,225; .1f → 81.4; , → 64,715,810; .1% → 12.3%.',
     'THE ORDER: the list order is the card order. Lead with identity (which country), then the numbers the chart is about.',
     'All four. SAY: "Field, title, format, order. Four decisions per row. That is the whole mechanism."']),

  { type: 'figure', figure: 'codechart', title: 'Spot the bug', figureGround: 'split',
    figureEyebrow: 'Build it · debug', figureAlt: 'A bar chart of population by region whose bars are sliced into countries, beside the Altair that made it.',
    figureData: { code: BUG_CODE, chart: 'bars', plot: F.regionBars(), guide: 'Your guide §4 · Aggregated marks need aggregated tooltips',
      strip: { input: 'pointer over a bar', parameter: 'the row(s) under it', predicate: 'none', response: 'a card' } },
    figureSteps: [
      { caption: 'Population by region. Why is every bar sliced into pieces? Hover one.', show: [0, 1, 2, 3, 7], lit: [], tooltip: [{ field: 'region', title: 'region' }, { field: 'country', title: 'country' }], split: true },
      { caption: 'country:N is not aggregated, so Vega groups by it too: one stacked bar per country.', show: [0, 1, 2, 3, 7], lit: [3], bug: [3], tooltip: [{ field: 'region', title: 'region' }, { field: 'country', title: 'country' }], split: true, strip: 'parameter', stripText: { parameter: 'one row per COUNTRY' } },
      { caption: 'The fix: an aggregate tooltip at the same grain as the bar. One bar, one card.', show: [0, 1, 2, 4, 5, 6, 7], lit: [4, 5, 6], tooltip: [{ field: 'region', title: 'region' }, { field: 'total', title: 'Sum of population', format: ',' }], split: false, demo: 'east_asia_pacific', strip: 'parameter', stripText: { parameter: 'one row per REGION' } }
    ],
    notes: '3 min. ASK first: "What went wrong?" Let them hover: each slice is a country.\n' +
      'WHY: in Vega-Lite every unaggregated field in the encoding (tooltip included) becomes a group-by key. Adding country:N to the tooltip of an aggregated bar splits it by country.\n' +
      'FIX: aggregate in the tooltip too (sum(population)), or aggregate first with transform_aggregate and tooltip the result. Guide §4.' },

  { type: 'compare', title: 'Where a tooltip fails', subtitle: 'The problem\tThe fix', progressive: true,
    bullets: [
      'Touch\tNo hover on a phone: the card never opens\tLabel the key values; make the mark a tap target',
      'Keyboard\tA mouse-only card shuts out keyboard users\tNative controls; values in a table or the caption',
      'Print and PNG\tA picture keeps no hover at all\tA deliberate static version, with labels (guide §17)',
      'Hiding the message\tThe point is only in the card\tPut the message in the title; the card holds detail',
      'Missing values\tA blank card, or "NaN"\tSay so: "not available" (guide §3.5)'
    ],
    notes: '2 min. WCAG 2.1, 1.4.13 Content on Hover or Focus: content that appears on hover must be dismissable, hoverable and persistent, and reachable without a mouse.' },

  { type: 'statement', title: 'If everyone needs it, label it. A tooltip is for what some readers want.',
    notes: '20 s. The rule to leave stop 2 with.' },

  /* ======================================================== ③ Pick */
  section('How do views talk to each other?', 'Part 3 · Pick · input → stored value → test → response',
    '20 s. Selection: one choice, and every view answers. The same four boxes as Part 1: only the input changes. Straight into the live figure.'),

  { type: 'figure', figure: 'linked', title: 'Be the brush',
    figureEyebrow: 'See it, name it, build it', figureAlt: 'A scatter of countries beside a bar chart of countries per region; selections in the scatter filter the bars.',
    figureData: W15({ bars: { title: 'Countries selected, by region' } }),
    figureSteps: [
      { caption: 'Hover: the country under the pointer lights, and the bars count it.', mode: 'hover',
        code: ["hover = alt.selection_point(", "    fields=['country'],", "    on='pointerover', empty=False)", "color=alt.when(hover)", "    .then('region:N')", "    .otherwise(alt.value('grey'))"], guide: 'Your guide §5 · Hover highlighting' },
      { caption: 'Click to compare: clicked countries stay lit. Click again to drop one; double-click clears.', mode: 'click', preset: { ids: ['United Kingdom', 'India', 'Brazil'] },
        code: ["picked = alt.selection_point(", "    fields=['country'],", "    toggle=True, clear='dblclick')", ".add_params(picked)"], guide: 'Your guide §6 · Click selection' },
      { caption: 'The legend as a control: click a region in the legend.', mode: 'legend', preset: { group: 'sub_saharan_africa' },
        code: ["region = alt.selection_point(", "    fields=['region'],", "    bind='legend')", "opacity=alt.when(region)", "    .then(alt.value(1))", "    .otherwise(alt.value(0.15))"], guide: 'Your guide §7 · Click the legend' },
      { caption: 'Brush: drag a rectangle. The bars on the right are filtered by it, live.', mode: 'brush', preset: { box: [2000, 60, 20000, 80] },
        code: ["brush = alt.selection_interval()", "scatter = base.add_params(brush)", "bars = alt.Chart(world)", "    .transform_filter(brush)", "    .mark_bar()", "scatter | bars"], guide: 'Your guide §8–9 · Brush and link' },
      { caption: 'The bug: empty=True (the default) lights everything until you brush. Is nothing selected, or everything?', mode: 'brush', empty: true,
        code: ["brush = alt.selection_interval()", "# empty=True by default:", "# no brush = everything selected", "", "brush = alt.selection_interval(", "    empty=False)"], guide: 'Your guide §5 · empty=False' }
    ],
    notes: '6 min. THE CENTREPIECE OF STOP 3. Drag and click live; invite a volunteer to the laptop for the brush.\n' +
      'Each step: the same strip. HOVER: input pointerover, parameter the country, predicate alt.when(hover), response colour. CLICK: input click, parameter a SET of countries (toggle). ' +
      'LEGEND: input a legend click, parameter a region. BRUSH: input a drag, parameter a RANGE of x and y; the bars use the same brush in transform_filter: that is linking.\n' +
      'EMPTY: Vega\'s default treats an empty selection as "all selected"; for highlight-on-hover you want empty=False, or everything is lit at the start.' },

  { type: 'table', title: 'One grammar, every selection', tableHeader: true,
    body: 'Interaction\tInput\tParameter (what is stored)\tPredicate\tVisual response\n' +
      'Hover\tpointer over a mark\tone value: the country\talt.when(hover)\tcolour, size, stroke\n' +
      'Click\tclick (toggle=True)\ta set of countries\talt.when(picked)\topacity\n' +
      'Legend\tclick on the legend\tone region\talt.when(region)\topacity\n' +
      'Brush\tdrag\ta range of x and y\talt.when(brush) / transform_filter(brush)\tlit marks; filtered bars\n' +
      'Slider\tdrag a slider\ta number: the year\talt.datum.year == year\tthe frame shown',
    notes: '2 min. Names what they just did in Be the brush, as the strip. Only the input column changes much. The slider row is the one they already know: the Week 1 query, next but one.' },

  { type: 'code', title: 'Build it: one brush, two views', language: 'python', typewrite: true,
    code: "brush = alt.selection_interval()          # input: a drag; stored: a range of x and y\n\nscatter = alt.Chart(world).mark_circle().encode(\n    x=alt.X('income:Q', scale=alt.Scale(type='log')),\n    y='health:Q',\n    color=alt.when(brush)                 # test: is the mark inside the range?\n        .then('region:N')                 # response: lit\n        .otherwise(alt.value('lightgrey')),\n).add_params(brush)\n\nbars = alt.Chart(world).mark_bar().encode(\n    x='count():Q',\n    y='region:N',\n).transform_filter(brush)                 # the second view answers the first\n\nscatter | bars",
    notes: '2 min. Guide §8–9. The whole of Be the brush\'s last steps in one cell. The brush is declared once, added to the scatter with add_params, and used twice: alt.when(brush) colours the scatter, transform_filter(brush) filters the bars. That second use is linking.\n' +
      'ASK: "Which line makes the views talk to each other?" transform_filter(brush). Before the first drag every mark is lit (empty=True, the default): add empty=False to start with nothing lit.' },

  { type: 'code', title: 'You built a dynamic query in Week 1', language: 'python', typewrite: true,
    code: "year = alt.selection_point(\n    name='year', fields=['year'], value=1955,\n    bind=alt.binding_range(min=1955, max=2005, step=5))\n\nalt.Chart(data.gapminder()).mark_circle().encode(\n    x='fertility:Q',\n    y='life_expect:Q',\n    size='pop:Q',\n    color='cluster:N',\n    tooltip=['country:N', 'year:O'],\n).add_params(year).transform_filter(year)",
    notes: '2 min. The table\'s last row: they have built one already. From the Week 1 guide, §4 (Rosling with a year slider). INPUT the slider, PARAMETER the year, PREDICATE transform_filter keeps rows of that year, RESPONSE the frame. ' +
      'A widget is a selection whose input is an HTML control: binding_range, binding_select, binding_radio, binding_checkbox (guide §12).' },

  { type: 'cards', title: 'Navigate: change where you are looking', progressive: true,
    bullets: [
      'Pan and zoom\tDrag and scroll, as on OpenStreetMap. In Altair: selection_interval(bind=\'scales\'), or .interactive().',
      'Overview + detail\tA small whole chart to brush; a big chart of the brushed window (guide §11).',
      'Semantic zoom\tCloser in, more is drawn, not just bigger: a map adds street names (Munzner 11.5).'
    ],
    notes: '2 min. Navigation is the "zoom" of the mantra. Munzner 11.5 separates geometric zoom (things get bigger) from semantic zoom (things change what they show).' },

  clip('See it: a story you step through', 'flourish-selection.mp4',
    '1 min. Flourish (flourish.studio/blog/animated-charts), the pound against the dollar. Each press of Next zooms the chart to a window (1985, Black Wednesday, 2016) and annotates it, then the last step zooms back out to 1982–2022: navigation the reader drives. ASK: "Input? What is stored? What changes?" A button; which step you are on; the x window and the note.'),

  { type: 'links', title: 'Try it yourself: selection, linking and queries',
    bullets: [
      'Select · NYT, the 2016 campaign staff network\thttp://www.nytimes.com/interactive/2015/05/17/us/elections/2016-presidential-campaigns-staff-connections-clinton-bush-cruz-paul-rubio-walker.html',
      'Brush and link · Refugee scholars dashboard\thttps://refugeescholars.netlify.app/home',
      'Query and filter · rome2rio, London to Boston\thttps://www.rome2rio.com/map/London/Boston#trips',
      'Navigate · OpenStreetMap, Tower Bridge\thttps://www.openstreetmap.org/#map=17/51.507464/-0.071647'
    ],
    notes: '2 min, or set for after the lecture. The four cases from the 2025 Week 5 deck, now they have the strip. Open one live. For each, ASK: "What did I do (input)? What is stored? What changed (response)?"' },

  /* ======================================================== ④ Move */
  section('When should a chart move?', 'Part 4 · Move', '20 s. Animation: motion, transitions, change over time.'),

  { type: 'cards', title: 'Why animate a chart?', progressive: true,
    bullets: [
      'Show change\tA state becoming another: before to after, one year to the next.',
      'Direct attention\tMotion is seen before almost anything else on the screen.',
      'Keep identity\tA tween lets the eye follow one item between two views.',
      'Tell a story\tA presenter can pace it: Rosling talks while the world moves.'
    ],
    notes: '1 min. From the 2025 Week 5 deck: encode data, direct attention, understand dynamics and transitions, engagement.' },

  { type: 'keyfact', title: 'Motion is seen first', body: '~100 ms', subtitle: 'Motion reads as continuous at about 10 frames a second',
    bullets: ['Pre-attentive: stronger than colour or shape', 'Strongest in the corner of your eye', 'Things that move together are seen as a group'],
    notes: '1 min. From the 2025 deck\'s motion-perception slide (Zeki 1993). Common fate (Gestalt): what moves together is grouped. That is why a moving chart is powerful, and why a moving decoration is a distraction.' },

  { type: 'figure', figure: 'motion', title: 'Fifty years in ten seconds',
    figureEyebrow: 'See it', figureAlt: 'Rosling\'s chart of fertility against life expectancy for 62 countries, animated from 1955 to 2005.',
    figureData: MOTION(),
    figureSteps: [
      { caption: '1955. Most of the world: many children, short lives. Where will it go?', year: 1955 },
      { caption: 'Play. Watch the cloud move to the top left: fewer children, longer lives.', play: { from: 1955, to: 2005, seconds: 10 } },
      { caption: 'Again, following one country: the United Kingdom, in red.', play: { from: 1955, to: 2005, seconds: 10 }, trail: 'United Kingdom' }
    ],
    notes: '2 min. Rosling\'s 2006 TED chart (vega_datasets gapminder.json). PREDICT first: "Where will the cloud be in 2005?" ' +
      'Then play. Then play again with a trail on the UK: the trail is only possible because each bubble stays the same country.' },

  clip('See it: transitions', 'flourish-transitions.mp4',
    '1 min. Flourish. A chart moves from one state to the next: the same marks, re-arranged. The eye keeps hold of each line through the change.'),

  clip('See it: morphing', 'flourish-morph.mp4',
    '1 min. Flourish. Units regroup by category: morphing between layouts. Each dot is still the same item: object constancy, the idea in two slides.'),

  { type: 'video', title: 'Tweening: one state becomes the next', subtitle: 'German election results, transitioned',
    video: asset('german-elections-tweening.mp4'), videoAutoplay: true, design: { capStyle: 'none' },
    notes: '1 min. A transition between two states of the same data. Heer & Robertson (2007): staged transitions (one change at a time) are easier to follow than everything at once.' },

  clip('See it: scrollytelling', 'flourish-scrolly.mp4',
    '1 min. Flourish. The reader\'s scroll is the clock: each step of the story reveals the next state. Interaction and animation together: the reader controls the pace.'),

  clip('See it: the bar chart race', 'flourish-race.mp4',
    '1 min. A bar chart race: popular, and a good test. ASK: "What can you read here that you couldn\'t from a line chart? What can\'t you?" ' +
    'You see rank changes; you lose the values and the comparison across years. Fine to present, poor to analyse.'),

  { type: 'video', title: 'Which one feels easier to follow?', subtitle: 'FT · Hurricane Milton, animated map (Observable: effective animation)',
    video: asset('ft-milton-map.mp4'), videoAutoplay: true, design: { capStyle: 'none' },
    notes: '1 min. The 2025 deck\'s pair (observablehq.com/blog/effective-animation): this and the election tween. ASK: "Which was easier to follow, and why?" ' +
      'The election tween changes one thing at a time; the storm moves a lot at once. (The map itself is next lecture.)' },

  { type: 'figure', figure: 'motion', title: 'Frames or tweens?',
    figureEyebrow: 'Name the mechanics', figureAlt: 'The Gapminder chart played twice: jumping from frame to frame, then tweened smoothly.',
    figureData: MOTION(),
    figureSteps: [
      { caption: 'Same data, same 50 years, played on one clock. Follow Iran, the red bubble, on both.', panels: 'frames-tweens', play: { from: 1955, to: 2005, seconds: 10 }, trail: 'Iran', label: true,
        explain: [['Frames', 'One picture every 5 years.', 'Iran jumps, then waits.'], ['Tweens', 'The in-between positions', 'are drawn too: Iran glides.']] },
      { caption: 'The dots are the data. The line is drawn between them: every point on it is invented.', panels: 'frames-tweens', trace: { from: 1955, to: 2005 }, trail: 'Iran', label: true, dim: true, measured: true,
        explain: [['What was measured', 'One dot per measured year:', 'eleven dots, 1955 to 2005.'], ['What was drawn', 'The same eleven years (rings),', 'joined by an invented line.']] }
    ],
    notes: '2 min. Both charts run on one clock, so nobody has to remember the first while watching the second. Iran crosses the whole chart, 7 babies and 41 years to under 2 and 74.\n' +
      'ASK while it plays: "Which one can you follow?" The right, because the eye tracks smooth motion; the left makes it find the bubble again after every jump.\n' +
      'NEXT: the trails stand still. ASK: "Which one is the data?" The dots: Gapminder measured every fifth year. The line is a tween: it invents every position in between.\n' +
      'Altair alone gives FRAMES: a slider changes the year and the chart redraws (guide §18). Smooth TWEENS need interpolated positions and a timer: the guide\'s player (§19). ' +
      'Be honest about which you are showing.' },

  { type: 'figure', figure: 'motion', title: 'The UK became Bangladesh',
    figureEyebrow: 'Object constancy', figureAlt: 'Two animated charts side by side: without a key the red bubble jumps from the UK to Bangladesh, Pakistan, Japan and Nigeria; with key=country it stays the UK.',
    figureData: MOTION(),
    figureSteps: [
      { caption: 'Same data, one difference: the right has key=\'country:N\'. Both start at 1955 with the UK in red. Press Next to play.', panels: 'pair', year: 1955, trail: 'United Kingdom', label: true,
        explain: [['No key', 'Each year, the red mark takes', 'whichever country is 8th in size.'], ['key=\'country:N\'', 'Each mark is one country', 'for all fifty years.']] },
      { caption: 'Watch the name on the red bubble. Left: it changes country. Right: it stays the United Kingdom.', panels: 'pair', play: { from: 1955, to: 2005, seconds: 14 }, trail: 'United Kingdom', label: true,
        explain: [['No key', 'Each year, the red mark takes', 'whichever country is 8th in size.'], ['key=\'country:N\'', 'Each mark is one country', 'for all fifty years.']] },
      { caption: 'The left trail is five countries stitched together. Only the right one is the UK.', panels: 'pair', trace: { from: 1955, to: 2005 }, trail: 'United Kingdom', label: true, dim: true,
        explain: [['No key: one red trail,', 'five countries: the UK, Bangladesh,', 'Pakistan, Japan, then Nigeria.'], ['With key: one red trail,', 'one country: the UK,', '1955 to 2005.']] }
    ],
    notes: '3 min. OBJECT CONSTANCY (Bostock, 2012). Without a key, Vega pairs old marks with new rows by their index. Here each year\'s rows arrive sorted by population, largest first. ' +
      'The UK is 8th in 1955; as Bangladesh, Pakistan and Nigeria grow past it, the 8th mark is a different country: Bangladesh in 1965, Pakistan in 1980, Japan in 2000, Nigeria in 2005. The red trail leaps across the chart.\n' +
      'With key=\'country:N\' each mark is one country all the way through. In the guide: encode(..., key=\'borough:N\') (§18).\nASK: "Which chart would you trust to tell you what happened to the UK?"' },

  { type: 'code', title: 'Build it: a year you can play', language: 'python', typewrite: true,
    code: "frame = alt.param(name='frame_year', value=1955)\n\nalt.Chart(data.gapminder()).mark_circle().encode(\n    x=alt.X('fertility:Q', scale=alt.Scale(domain=[0, 9])),\n    y=alt.Y('life_expect:Q', scale=alt.Scale(domain=[25, 85])),\n    size='pop:Q',\n    color='cluster:N',\n    key='country:N',              # identity: one mark, one country\n).add_params(frame).transform_filter(\n    alt.datum.year == frame       # the frame shown\n)\n# playback: a timer calls view.signal('frame_year', y)  (guide §19)",
    notes: '2 min. Guide §18–19. Fixed domains so the axes do not jump between frames; key= for identity; a parameter for the year; transform_filter for the frame. ' +
      'Altair writes the chart; the guide\'s small player script drives the parameter on a timer (export_player).' },

  { type: 'code', title: 'Demo: a bar chart race in Python', language: 'python', typewrite: true,
    code: "# pip install bar_chart_race\nimport bar_chart_race as bcr\n\n# wide data: one row per date, one column per country\nbcr.bar_chart_race(\n    df=population_wide,\n    filename='population_race.mp4',\n    n_bars=10,\n    period_length=600,          # ms per period: the pace\n    title='Population growth race · top 10',\n)",
    notes: '2 min. From the 2025 deck\'s demo (pypi.org/project/bar-chart-race). Not Altair: a matplotlib animation saved as video. ' +
      'Ask what it costs: the values are hard to read, and the reader cannot pause a video on their own terms.' },

  clip('Demo: what it makes', 'barchartrace-demo.mp4', '30 s. The output of bar_chart_race. Then: "Where would you use this, and where would a line chart be better?"'),

  { type: 'figure', figure: 'motion', title: 'Which country changed most?',
    figureEyebrow: 'Animation vs small multiples', figureAlt: 'Eleven small Gapminder charts, one per five years, with the UK in red.',
    figureData: MOTION(),
    figureSteps: [
      { caption: 'Same question, all eleven years at once. Now you can compare without remembering.', multiples: true, trail: 'United Kingdom' }
    ],
    notes: '2 min. ASK after the animation: "Which country changed most?" Hard: animation asks you to remember the earlier frames. Munzner 6.5: Eyes Beat Memory.\n' +
      'Robertson et al. (2008): animation was the most enjoyed but the slowest and least accurate for analysis; small multiples and trails did better. Use animation to PRESENT change, small multiples to ANALYSE it.' },

  { type: 'compare', title: 'Animation: what it gives, what it costs', subtitle: 'Gives\tCosts', progressive: true,
    bullets: [
      'Attention\tEngages the room\tCognitive overload when too much moves',
      'Change\tShows change over time\tSlower to read values; relies on memory',
      'Story\tA presenter can pace it\tA reader alone cannot pause what is not pausable',
      'Insight\tHighlights a key moment\tAccessibility: motion sickness, missed frames'
    ],
    notes: '1 min. The 2025 deck\'s pros and cons. ASK: "Which cost did Rosling avoid, and how?" (He paused, pointed, and talked over it.)' },

  { type: 'compare', title: 'Design choices for animation', subtitle: 'Do\tAvoid', progressive: true,
    bullets: [
      'Purpose\tKnow whether it is for communication, exploration or explanation\tAnimation as decoration',
      'Pace\tTransitions slow enough to follow, one change at a time\tToo fast, too slow, or everything at once',
      'Identity\tObject constancy: key= so each mark stays itself\tMarks that swap mid-flight',
      'Attention\tHighlight to guide the eye\tMotion that hides information',
      'Test\tWith users; compare against small multiples\tMotion sensitivity ignored'
    ],
    notes: '2 min. The 2025 deck\'s "Design choices" and "When designing with animation": define purpose, match task to interaction, choose transitions carefully, test with users.' },

  { type: 'cards', title: 'Move responsibly', progressive: true,
    bullets: [
      'Pause and replay\tA reader controls the clock: a slider, a play button, a reset.',
      'A still version\tSmall multiples or the last frame, for print and for analysis.',
      'Reduced motion\tRespect prefers-reduced-motion: jump to the end (WCAG 2.3.3).',
      'Fixed scales\tAxes that never move, so only the data does.'
    ],
    notes: '1 min. These live figures do the first and third: they can be stepped, and with reduced motion on they jump straight to the end.' },

  /* ======================================================== Arriving */
  section('What did you see today?', 'Arriving', '20 s.'),

  { type: 'content', title: 'Four things to keep', progressive: true,
    bullets: [
      'Audience\tInteraction answers the reader\'s question, not yours: start from a persona.',
      'Point\tShow less and let them ask, but never hide the message in a tooltip.',
      'Pick\tOne choice can light every view: input, parameter, predicate, response.',
      'Move\tMotion is seen first; spend it on change, and keep identity with key=.'
    ],
    notes: '2 min. One card per stop.' },

  ...buildPage('5', PAGE_STEPS),

  { type: 'content', title: 'Next: Lab 5 · Interaction and animation',
    bullets: [
      'Audience\tTask 1: a persona for your chart (guide §1)',
      'Tooltips\tGuide §3–4: fields, titles, formats; aggregate tooltips',
      'Selections\tGuide §5–12: hover, click, legend, brush, linked views, widgets',
      'Motion\tGuide §18–20: frames, key=, the player, then judge whether to keep it',
      'Hand in\tOn Canvas by midday on the Friday after the lab'
    ],
    notes: 'The lab sheet\'s tasks: audience (persona), interactive scatter, animated line, interactive bar, animated histogram, interactive map. Task 6, the map, is a first look at Week 7.' },

  { type: 'figure', figure: 'worldmap', title: 'Next lecture: the bubbles fly home',
    figureEyebrow: 'Coming up · Week 7 · Maps', figureAlt: 'Rosling\'s bubbles flying from their places on the chart to their countries on the world map.',
    figureData: MAP(F.flight()),
    figureSteps: [
      { caption: 'Rosling\'s chart: every country a bubble, keyed by country.', projection: 'equalEarth', fly: 'scatter' },
      { caption: 'Same marks, same keys, a different layout. Next lecture: what that map is doing.', projection: 'equalEarth', fly: 'home' }
    ],
    notes: '1 min. The bridge to Week 7. Object constancy across two idioms: the same keyed marks move from a scatter to geographic position. "Next time: when a map adds meaning, and how it lies."' },

  { type: 'statement', title: 'Questions?', notes: 'Q&A.' }
  ];
}

function maps() {
  const income = F.fill('income', 'quantile', 'Income per person', '$,.0f');
  return [
  /* ======================================================== Opening */
  { type: 'title', title: 'Where in the world?',
    subtitle: 'LDSCI6253 Advanced Information Presentation & Visualisation · Week 7 · Maps',
    notes: 'Up as they arrive. Same promise as Week 5: every technique seen in a real map, its mechanics named, then built in Altair.' },

  { type: 'content', title: 'Before we start',
    bullets: [
      'Reading\tMunzner, Visualization Analysis and Design: Chapter 8 (arrange spatial data), 8.3 Geometry; 6.6–6.8 again',
      'Worksheets\tOn Canvas by midday on the Friday after the lab',
      'Your guide\tThe Maps guide: London boroughs, the GSS join, a choropleth beside a ranking',
      'Stuck?\tAsk early. Don’t wait until the last minute'
    ],
    notes: '1 min. Fixes carried over from the 2025 maps deck: it said "Week 6 / Lecture 6" throughout, "Analysis Farmwork", and its recap slide listed interaction goals rather than last lecture.' },

  { type: 'content', title: 'Last lecture: charts that answer back',
    bullets: [
      'Audience\tStart from a persona: who asks, and what',
      'Point\ttooltip= prints the row under the pointer',
      'Pick\tselections: input → parameter → predicate → response',
      'Move\tmotion for change; key= for identity'
    ],
    notes: '1 min. A real recap this time (the 2025 maps deck\'s recap slide listed interaction goals instead).' },

  /* Moved here by the user: the pack opens the lecture. The section, the route, the page built
     week by week, then the map panel one move at a time, handing over to today's three parts. */
  ...buildPage('7', PAGE_STEPS, [
    pic('One chart at a time', 'route-maps.svg',
      '1 min. The route so far: five weeks behind them. Week 5 taught the chart to answer back.'),
    pic('Then one page', 'ahead-maps.svg',
      '1 min. Reading week is done; today, Week 7, the chart learns where. The map grid is one panel of the final infographic.', { transition: 'none' })
  ]),
  ...makeMap(),


  { type: 'content', title: 'By the end of today you can',
    bullets: [
      'Explain\twhy maps matter, and when to use given spatial position',
      'Choose\ta projection by what it must keep: shape, area, distance or direction',
      'Design\ta choropleth: normalised rates, honest class breaks, an accessible palette',
      'Pick\tthe map type for the data: choropleth, symbols, dot density, flow',
      'Build\ta map in Altair with mark_geoshape, a join and a tooltip',
      'Map\tresponsibly: privacy, disputed borders, colour-blind readers'
    ], progressive: true,
    notes: '1 min. Rewritten from the 2025 maps deck\'s overview (slide 5).' },

  { type: 'figure', figure: 'worldmap', title: 'The bubbles flew home',
    figureEyebrow: 'Last lecture, again', figureAlt: 'Rosling\'s bubbles flying from their places on the chart to their countries on the world map.',
    figureData: MAP(F.flight()),
    figureSteps: [
      { caption: 'Week 5 ended here: Rosling\'s chart, every country a bubble.', projection: 'equalEarth', fly: 'scatter' },
      { caption: 'Same marks, a different layout: geography. Today: when that adds meaning, and what the map lies about.', projection: 'equalEarth', fly: 'home' }
    ],
    notes: '1 min. The hook: the last thing they saw last time, the bubbles landing on a map. Then what they will be able to do by the end, and the page this map joins.' },

  { type: 'journey', title: 'Today’s route', subtitle: 'Three stops, one question each', progressive: false,
    bullets: [
      'Place\tDoes geography add meaning?',
      'Flatten\tWhat does the map lie about?',
      'Fill\tHow do I colour a map honestly?'
    ],
    notes: '30 s.' },

  /* ======================================================== ⑤ Place */
  section('Does geography add meaning?', 'Part 1 · Place', '20 s. Maps: when position is the place.'),

  { type: 'figure', figure: 'worldmap', title: 'The world was there all along',
    figureEyebrow: 'See it', figureAlt: 'A world map in Equal Earth projection, countries coloured by Gapminder region.',
    figureData: MAP(),
    figureSteps: [
      { caption: 'Rosling\'s colours were regions. Regions are places.', projection: 'equalEarth', fill: { field: 'region', categories: require('./data.js').REGIONS } },
      { caption: 'Hover any country: the map is a chart too, and it can answer back.', projection: 'equalEarth', fill: { field: 'region', categories: require('./data.js').REGIONS }, lit: 'United Kingdom' }
    ],
    notes: '1 min. The bridge from Week 5: the bubbles\' colours were regions all along. Hover live: the same tooltip, on a map.' },

  { type: 'compare', title: 'Maps excel at, maps struggle with', subtitle: 'Excel at\tStruggle with', progressive: true,
    bullets: [
      'Pattern\tSpatial patterns and clusters\tPrecise comparison of values',
      'Relation\tProximity: what is near what\tRelationships that are not spatial',
      'Flow\tMovement and routes\tTrends over time',
      'Context\tPutting data in a place people know\tHierarchies and many attributes at once'
    ],
    notes: '2 min. From the maps deck (slide 10). The question to carry: does geography add meaning, or just decoration?' },

  { type: 'cards', title: 'Use given spatial position', progressive: true,
    bullets: [
      'Given\tCities, countries, roads, weather stations: the data IS somewhere. Use that place as the layout.',
      'Not given\tCompany HQs, birthplaces, product origins: a place exists, but may not matter.',
      'The test\tWould the insight change if you moved the dots? If not, a chart may be clearer.'
    ],
    notes: '2 min. Munzner\'s rule: when data has inherent spatial semantics, use given position as the layout substrate (Chapter 8).' },

  pic('Data', 'election-data.png', '1 min. From the maps deck, "The power of spatial context". The 2017 result as a chart of seats: who won.'),
  pic('Map', 'election-map.png', '1 min. The same result as a map: WHERE. Now you see geography: urban and rural, Scotland, the south. Same data, a different question answered.', { transition: 'none' }),

  { type: 'content', title: 'Should this be a map?', progressive: true,
    bullets: [
      'Q1\tDoes it have real geographic coordinates? No: consider another chart.',
      'Q2\tIs a spatial pattern part of the goal? No: a simple chart may be clearer.',
      'Q3\tWill the audience know the places? Unsure: add labels and context.',
      'Q4\tPrecise values, or the pattern? Precise: a bar chart beside the map. Pattern: map it.'
    ],
    notes: '2 min. The decision tree from the maps deck (slide 18), as four questions. The answer to Q4 is often "both": a map beside a ranking (Maps guide §10).' },

  { type: 'statement', title: 'A map spends your best channel on where.',
    notes: '1 min. The Week 2 callback: position is the strongest channel. On a map, x and y are already taken by longitude and latitude, so the value has to go into a weaker channel: colour (choropleth) or size (symbols). That is why maps are hard to read precisely.' },

  { type: 'code', title: 'Build it: one line makes a world', language: 'python', typewrite: true,
    code: "from vega_datasets import data\n\ncountries = alt.topo_feature(data.world_110m.url, 'countries')\n\nalt.Chart(countries).mark_geoshape(\n    fill='lightgrey', stroke='white'\n).project(type='equalEarth')",
    notes: '1 min. topo_feature reads a TopoJSON layer; mark_geoshape draws each feature; project chooses the projection. The Maps guide does the same with London boroughs (GeoJSON, §2).' },

  /* ======================================================== ⑥ Flatten */
  section('What does the map lie about?', 'Part 2 · Flatten', '20 s. Projections.'),

  pic('You cannot flatten a sphere without tearing it', 'projection-surfaces.jpg',
    '1 min. The orange peel: a globe onto a plane, cylinder or cone. Every projection distorts at least one of shape, area, distance or direction (maps deck slide 24).'),

  { type: 'figure', figure: 'worldmap', title: 'Watch the world change shape',
    figureEyebrow: 'Projections, live', figureAlt: 'The world map morphing from Mercator to Equal Earth to Robinson.',
    figureData: MAP(),
    figureSteps: [
      { caption: 'Mercator: shapes and angles kept. Made for navigation. Look at Greenland and Africa.', projection: 'mercator', lit: [304, 'Congo, Dem. Rep.'] },
      { caption: 'Equal Earth: areas kept. Greenland shrinks; Africa grows. Same countries, every point moved.', projection: 'equalEarth', lit: [304, 'Congo, Dem. Rep.'] },
      { caption: 'Robinson: a compromise. Nothing exactly right, nothing badly wrong.', projection: 'robinson', lit: [304, 'Congo, Dem. Rep.'] }
    ],
    notes: '2 min. Every coastline moves point by point between projections (the same vertices, projected three ways at build time).\n' +
      'Greenland has no Gapminder name, so it is lit by code in the next slide; here watch the north stretch on Mercator.' },

  { type: 'figure', figure: 'worldmap', title: 'Drag Greenland',
    figureEyebrow: 'Mercator, live', figureAlt: 'A Mercator world map; Greenland in red moves south and shrinks to its true size beside Africa.',
    figureData: MAP(),
    figureSteps: [
      { caption: 'On Mercator, Greenland looks as big as Africa. Drag it south and watch.', projection: 'mercator', greenland: true },
      { caption: 'At Africa\'s latitude it is its true size: Africa is about fourteen times larger.', projection: 'mercator', greenland: [-5, 8] }
    ],
    notes: '2 min. LIVE: drag Greenland with the mouse; it is re-projected as it moves (Mercator stretches by 1/cos(latitude)). NEXT moves it beside West Africa.\n' +
      'Greenland 2.2 million km², Africa 30.4 million km²: about 14 times. The true size of: thetruesize.com.' },

  pic('See it: Is Greenland bigger than Africa?', 'greenland-africa.jpg',
    '30 s. From the maps deck. The question everyone has asked once. It opens Part 2 as a question: ASK "Hands up if you think Greenland is about Africa\'s size." Don\'t flip yet: the next slides answer it live (Drag Greenland). Come back and press ⇄ for the facts afterwards, or now if time is short.\n' +
    'Checked: Greenland 2,166,086 km², Africa about 30.37 million km² (WorldAtlas; truesize.net).',
    { body: [
      'No. Africa is about 14 times bigger than Greenland.',
      'Greenland: about 2.17 million km². Africa: about 30.4 million km².',
      'On a Mercator map they look the same size, because Mercator stretches land more the further it is from the equator.',
      'Greenland is far north, so it is stretched a lot. Africa sits on the equator, so it is hardly stretched at all.',
      'Mercator was made in 1569 for sailors: it keeps shapes and directions right, and gives up true areas to do it.',
      'For data maps, pick an equal-area projection such as Equal Earth, so a bigger shape really means a bigger place.'
    ].join('\n') }),

  { type: 'table', title: 'What each projection keeps', tableHeader: true,
    body: 'Family\tKeeps\tDistorts\tUse for\n' +
      'Conformal (Mercator)\tShape and angles\tArea, badly near the poles\tNavigation, web street maps\n' +
      'Equal-area (Equal Earth, Albers)\tArea\tShape\tStatistical maps: choropleths, densities\n' +
      'Equidistant\tDistance from the centre\tShape and area\tDistance from one place\n' +
      'Compromise (Robinson)\tNothing exactly\tEverything a little\tGeneral world maps',
    notes: '2 min. From the maps deck (slides 28–29). The rule: choose the projection by what the map must keep. For data, that is usually area.' },

  { type: 'code', title: 'Build it: change one word', language: 'python', typewrite: true,
    code: "base = alt.Chart(countries).mark_geoshape(stroke='white')\n\nbase.project(type='mercator')     # shapes kept, areas wrong\nbase.project(type='equalEarth')   # areas kept: use for data\n\n# London-scale maps: Mercator is fine at a city's size\n# .project(type='mercator', fit=map_geojson)   (Maps guide §2)",
    notes: '1 min. One parameter. At city scale (the Maps guide\'s London) the distortion is negligible, which is why the guide uses Mercator there.' },

  { type: 'statement', title: 'Never Mercator for statistics.',
    notes: '20 s. From the maps deck\'s technical summary. Equal-area for anything where size means something.' },

  /* ======================================================== ⑦ Fill */
  section('How do I colour a map honestly?', 'Part 3 · Fill', '20 s. Choropleths: Week 4\'s colour, on a map.'),

  { type: 'figure', figure: 'worldmap', title: 'Map rates, not people', figureGround: 'paper',
    figureEyebrow: 'Counts or rates?', figureAlt: 'Two world choropleths: total GDP, which mostly shows population, then GDP per person.',
    figureData: MAP(),
    figureSteps: [
      { caption: 'Total GDP: the big, populous countries are darkest. Mostly a map of where people live.', projection: 'equalEarth', fill: F.fill('gdp', 'quantile', 'Total GDP ($)', '$.2s') },
      { caption: 'GDP per person: a different world. Divide by population, and the map shows the rate.', projection: 'equalEarth', fill: income }
    ],
    notes: '2 min. THE POPULATION-MAP TRAP. Any raw count (cases, sales, crimes) mostly maps population. Normalise: per person, per km², per 1,000. ' +
      'The number line under the map shows where each country\'s value falls (each tick a country).' },

  pic('See it: not ideal, better', 'dw-choropleth.png', '1 min. Datawrapper\'s pair (maps deck slide 31): raw counts against a rate.'),

  { type: 'figure', figure: 'worldmap', title: 'Break it three ways', figureGround: 'paper',
    figureEyebrow: 'Class breaks', figureAlt: 'One choropleth of income per person, recoloured with equal-interval, quantile and natural breaks.',
    figureData: MAP(),
    figureSteps: [
      { caption: 'Equal interval: five equal ranges. Qatar stretches the top, so almost every country lands in the lightest class.', projection: 'equalEarth', fill: F.fill('income', 'equal', 'Income per person', '$,.0f') },
      { caption: 'Quantile: the same number of countries in each class. Every colour used, but a $15k gap can look like a $100k one.', projection: 'equalEarth', fill: F.fill('income', 'quantile', 'Income per person', '$,.0f') },
      { caption: 'Natural breaks: classes where the data has gaps. Usually the honest default.', projection: 'equalEarth', fill: F.fill('income', 'natural', 'Income per person', '$,.0f') }
    ],
    notes: '3 min. Same data, same colours, three stories. ASK on each: "Which country looks worst off?" Watch the breaks move along the number line.\n' +
      'Altair: alt.Scale(type=\'quantize\') is equal interval; type=\'quantile\'; type=\'threshold\' with domain=[your breaks] for natural breaks computed in pandas (e.g. jenkspy).' },

  pic('See it: four maps, one dataset', 'class-breaks-four.png', '1 min. From the maps deck (slide 30): the class-break choice, in the wild.'),

  { type: 'cards', title: 'Three more ways a map misleads', progressive: true,
    bullets: [
      'MAUP\tThe same points give different patterns with different boundaries: boroughs, wards, postcodes (Openshaw 1984).',
      'Big empty places\tLarge, sparsely populated areas dominate the ink. Consider a cartogram or symbols.',
      'No data\tA place with no data gets its own grey, never the lightest colour: unknown is not low.'
    ],
    notes: '2 min. MAUP: the modifiable areal unit problem. Land is not people: Russia and Canada dominate any world choropleth.' },

  { type: 'figure', figure: 'worldmap', title: 'Counts belong in symbols', figureGround: 'paper',
    figureEyebrow: 'Map types', figureAlt: 'Proportional circles sized by population over a world map, then a life-expectancy choropleth.',
    figureData: MAP(),
    figureSteps: [
      { caption: 'Proportional symbols: a count goes in the size of a circle at each country, not in its fill.', projection: 'equalEarth', symbols: { field: 'population', max: 1.4e9, color: '#c8102e' } },
      { caption: 'A rate goes in the fill: life expectancy. Hover: the tooltip carries the exact values.', projection: 'equalEarth', fill: F.fill('health', 'natural', 'Life expectancy (years)', '.1f') }
    ],
    notes: '2 min. The pair from the maps deck (Datawrapper, slide 32): symbols for counts, choropleth for rates. Altair: mark_circle with longitude/latitude encodings, size=\'population:Q\'.' },

  pic('Map types for different data', 'map-types.jpg',
    '1 min. Dot density for distribution; proportional symbols for quantities; choropleth for rates; cartogram for size; flow maps for movement; density maps for concentration.'),

  { type: 'code', title: 'Build it: a choropleth that answers back', language: 'python', typewrite: true,
    code: "world = data.gapminder_health_income()   # + an iso_n column joined in pandas\n\nalt.Chart(countries).mark_geoshape(stroke='white').transform_lookup(\n    lookup='id',\n    from_=alt.LookupData(world, 'iso_n', ['country', 'health', 'income'])\n).encode(\n    color=alt.Color('health:Q', scale=alt.Scale(scheme='blues')),\n    tooltip=[alt.Tooltip('country:N', title='Country'),\n             alt.Tooltip('health:Q', title='Life expectancy', format='.1f')]\n).project(type='equalEarth')",
    notes: '2 min. Everything today in one chart: geoshape, a join (transform_lookup by the shape\'s id), a sequential colour, and a tooltip.\n' +
      'The join is where maps break: the guide\'s §4 checks every mismatch (here 22 small states have no shape at 1:110m). LAB: Maps guide §2–§5, London boroughs by GSS code.' },

  pic('Every map is a set of white lies', 'boston-road-satellite.png',
    '1 min. Moved here from the 2025 deck\'s projection section, where it did not belong: it is about SYMBOLISATION. A road map of Boston beside the satellite view: colours and widths for road types are deliberate simplifications. Monmonier, How to Lie with Maps (1991).'),

  /* ======================================================== Arriving */
  section('Can you read the mechanics of any chart now?', 'Arriving', '20 s.'),

  { type: 'video', title: 'Name every mechanic', subtitle: 'FT · Hurricane Milton, animated map',
    video: asset('ft-milton-map.mp4'), videoAutoplay: true, design: { capStyle: 'none' },
    notes: '3 min. Play once. ASK, hands up: "What moves? What could you point at? What is encoded in colour, in size? Which projection? What would the strip say?"' },

  { type: 'content', title: 'Three things to keep', progressive: true,
    bullets: [
      'Place\tA map spends your best channel on where: use it when geography adds meaning.',
      'Flatten\tEvery flat map distorts: choose the projection by what it must keep; equal-area for data.',
      'Fill\tMap rates, not people; choose class breaks honestly; symbols for counts.'
    ],
    notes: '2 min. One card per stop. ASK someone to read the strip for the Milton map.' },

  { type: 'content', title: 'Next: the maps lab',
    bullets: [
      'Draw\tMaps guide §2: London boroughs with mark_geoshape',
      'Join\tMaps guide §3–4: derive a percentage; join by GSS code; inspect every mismatch',
      'Colour\tMaps guide §5–9: the choropleth, labels, a dropdown, counts at points, missing data',
      'Compose\tMaps guide §10–11: a map beside a ranking; a map-led infographic',
      'Hand in\tOn Canvas by midday on the Friday after the lab'
    ],
    notes: 'The map grid is one panel of the final infographic.' },

  { type: 'statement', title: 'Questions?', notes: 'Q&A.' }
  ];
}

/* Every outside picture in the maps lecture gets a title on the slide and plain-English facts
   on its back (Flip to facts, ⇄), so a student who has not seen it before knows what it shows
   and why it is here. Keyed by picture; the title replaces the slide's own. */
const SEE = {
  'election-data.png': {
    title: 'As a chart: how many seats each party held',
    facts: [
      'This is a chart, not a map: one dot for each of the 650 seats in Parliament.',
      'It shows the seats each party held just before the 2019 general election (BBC).',
      'It answers "who has the most?": Conservatives 298, Labour 243, then the smaller parties.',
      'It cannot answer "where?". Every seat looks the same, wherever it is.'
    ],
    notes: '1 min. The chart half of the pair: seats before the 2019 election (BBC). It tells you who, not where. Note: the map on the next slide is the 2017 result, so the numbers are not meant to match; the point is what each picture can answer.' },
  'election-map.png': {
    title: 'As a map: where each party won',
    facts: [
      'The same kind of data, results by seat, drawn as a map: each shape is one constituency, coloured by the party that won it (BBC, 2017 general election).',
      'Now you can see where: Labour (red) in the big cities, the SNP (yellow) across Scotland, Conservatives (blue) across most of rural England.',
      'Watch out: big rural seats look important, but each seat counts once. Tiny city seats (London, Birmingham) almost disappear.',
      'So a map answers "where?" well, and "how many?" badly. Many maps put a chart beside them for that reason.'
    ] },
  'projection-surfaces.jpg': {
    title: 'Flattening the globe: plane, cone, cylinder',
    facts: [
      'A projection is a recipe for flattening the round Earth onto a flat page.',
      'Imagine a light inside the globe throwing the outlines onto a flat sheet (plane), a cone, or a cylinder wrapped around it.',
      'Mercator is a cylinder projection. Many maps of countries, like the USA, use a cone.',
      'You cannot flatten a sphere without stretching or tearing it, so every flat map gets something wrong: shape, area, distance or direction.'
    ] },
  'dw-choropleth.png': {
    title: 'Smaller areas show more of the pattern',
    facts: [
      'Both maps show the same measure across the USA. Left: one colour per state (about 50 areas). Right: one colour per county (about 3,000).',
      'The state map averages everything inside each state, so a whole state turns one colour and the detail inside it is lost.',
      'The county map shows where values are really high or low, inside each state.',
      'Datawrapper\'s advice: use the smallest areas your data has. Exception: for US presidential elections states matter, because each state\'s votes are counted as a whole.'
    ],
    notes: '1 min. Datawrapper\'s choropleth guide: choose the smallest units you can ("a more refined image of the data"), states vs counties. The exception they give is US presidential elections (winner takes all by state).' },
  'class-breaks-four.png': {
    title: 'Same data, four maps: where you cut the colours',
    facts: [
      'All four maps show the same data: unemployment rate in every US county. Only the colour groups (class breaks) change.',
      'Min/Max: one smooth scale from lowest to highest. A few extreme counties stretch it, so most of the map looks pale.',
      'Min/Medium/Max: the middle of the scale moves to the middle value, so more of the map gets darker.',
      'Quartiles and quintiles: each colour holds the same number of counties (a quarter, or a fifth). The map looks evenly mixed, even where the real differences are small.',
      'None of them is "the truth". Pick the breaks for the question you are asking, and say which you used.'
    ] },
  'boston-road-satellite.png': {
    title: 'Same place, two pictures: every map tells white lies',
    facts: [
      'Both show the same part of Boston. Left: a Google road map. Right: a satellite photo of what is really there.',
      'The road map looks simple and tidy, but the ground is not: it is packed with buildings, trees, water and many small streets.',
      'The map invents things to help you: main roads drawn thick and yellow, smaller ones thin or left out. Real roads are not those colours or widths.',
      'It leaves out almost everything else, so the routes and places like Cambridge or the airport stand out.',
      'Mark Monmonier: "to present a useful and truthful picture, an accurate map must tell white lies" (How to Lie with Maps).',
      'Those lies help here: you could not drive around Boston with the photo. The same tricks can mislead when they hide something that matters.'
    ],
    notes: '1 min. The example from the open textbook Mapping, Society, and Technology (Manson, ed.), ch. 7 Lying With Maps (Deluca and Nelson): Google road map vs satellite imagery of Boston. Symbolisation (road size and colour) and generalisation are the white lies. ASK: "What has the left map left out? Would you want it back?"' }
};
/* The three world Build-it slides, drawn with the picture each makes (page.js BUILDS). */
const BUILD_OF = { 'Build it: one line makes a world': 'world', 'Build it: change one word': 'projection', 'Build it: a choropleth that answers back': 'choropleth' };
/* Why?: a plain-English explanation behind each step of every live figure (the figure's Why? button,
   src/figures/kit.js explainer), for a room meeting the idea for the first time. Keyed by title. */
const WHY = {
  'The bubbles flew home': [
    'Last week every country was a bubble on a chart: how rich it is (across) against how long people live (up).\nThe bubbles keep their colour and size. Only their position changes.',
    'Now each bubble has moved to where its country is on a map.\nSame data, a different layout: on a chart, position means a number. On a map, position means a place.\nToday asks when that swap is worth it.'
  ],
  'The world was there all along': [
    'Each colour is a region of the world, the same colours as last week\'s bubbles.\nBecause regions are places, a map shows them more naturally than a chart: you can see which countries sit together.',
    'A map can answer back like any chart: point at a country to read its name and numbers.\nThe tooltip is the same Altair code as last week: tooltip=.'
  ],
  'Watch the world change shape': [
    'This is the Mercator projection. A projection is the recipe for flattening the round Earth onto a flat screen.\nMercator keeps shapes and directions right, which is why sailors used it. But it stretches land the further it is from the equator, so Greenland, Canada and Russia look huge.',
    'This is Equal Earth. It keeps every country\'s area right, so size can be trusted.\nThe price: shapes near the edges look squashed or bent. Every point on the map has moved, but no country has changed.',
    'This is Robinson, a compromise: shapes and sizes are both a little wrong, nothing badly wrong.\nIt is common on wall maps. For data, where size must mean something, an equal-area projection like Equal Earth is the safer choice.'
  ],
  'Drag Greenland': [
    'On this Mercator map Greenland looks about as big as Africa.\nDrag it south towards the equator and watch it shrink: Mercator only exaggerates size far from the equator.',
    'At Africa\'s latitude Greenland is drawn at its true size. Africa is about 14 times bigger (30.4 million km² against 2.2 million km²).\nThe land did not change. Only the map\'s stretching did.'
  ],
  'Map rates, not people': [
    'Each country is coloured by its total GDP: the whole value of everything it produces in a year.\nThe darkest countries are mostly just the biggest ones, with the most people. So this map mainly shows where people live, not how rich they are.\nThe strip under the map is the colour key: each tick is a country.',
    'Now each country is coloured by GDP per person: total GDP divided by population. That is a rate.\nA very different world appears: small rich countries go dark, big populous ones get lighter.\nRule of thumb: fill a map with rates (per person, per cent), never raw counts.'
  ],
  'Break it three ways': [
    'A choropleth sorts countries into a few colour groups (classes). Where you cut the groups changes the map.\nEqual interval: the range from lowest to highest is cut into five equal slices. A few very rich countries (Qatar) stretch the top, so almost everyone lands in the palest group.',
    'Quantile: each colour gets the same number of countries. Every colour is used and the map looks lively.\nBut countries only a little apart can land in different colours, and very far apart ones in the same colour.',
    'Natural breaks: the cuts are placed where the data has gaps, so similar countries share a colour.\nIt is usually the most honest default. Whatever you choose, say which method you used in the legend.'
  ],
  'Counts belong in symbols': [
    'A count, like population, goes in the size of a circle drawn at each country, not in its fill.\nIf you filled the shapes by count, big countries would look important just because they are big.',
    'A rate, like life expectancy, goes in the fill colour, because it does not depend on how big the country is.\nPoint at a country: the tooltip shows the exact numbers behind the colour.'
  ]
};
function withSee(slides) {
  return slides.map(sl => {
    /* The six map types as cards, each with what it is good for and what to watch out for (maptypes.js). */
    if (sl.type === 'image' && /map-types\.jpg$/.test(sl.image || '')) {
      return pic('Six kinds of map: good for, watch out', 'map-types-cards.svg',
        '2 min. One card at a time, left to right. For each: what data it suits, and the trap. ASK: "Which would you use for London\'s population? For commuting into the City?"');
    }
    if (sl.type === 'figure' && WHY[sl.title]) {
      return { ...sl, figureSteps: sl.figureSteps.map((st, i) => (WHY[sl.title][i] ? { ...st, explain: WHY[sl.title][i] } : st)),
        notes: sl.notes + '\nWhy? (top right) opens a plain-English explanation of this step over the figure.' };
    }
    if (sl.type === 'code' && BUILD_OF[sl.title]) {
      return pic(sl.title, `build-${BUILD_OF[sl.title]}.svg`, sl.notes + '\nThe code to copy:\n' + sl.code);
    }
    const file = sl.type === 'image' && String(sl.image || '').split('/').pop();
    const see = file && SEE[file];
    /* The caption on a fade over the picture (capStyle 'scrim'), not on a bar beneath it: the
       picture keeps the slide's height, so the back row can read it. Every outside picture with
       facts, from here on. */
    if (!see) return sl.body && /\.(png|jpe?g)$/i.test(file || '') ? { ...sl, design: { ...(sl.design || {}), capStyle: 'scrim' } } : sl;
    return { ...sl, title: see.title, body: see.facts.join('\n'), design: { ...(sl.design || {}), capStyle: 'scrim' },
      notes: (see.notes || sl.notes) + '\nPress ⇄ to turn the slide over for the facts.' };
  });
}

/* The maps lecture in scaffold order (18 Oct 2026): the hook and the outcomes before the pack; the
   London map taught before the infographic's map panel uses it; in each part the concrete example
   before the rule, the question before the demo that answers it. Positions are the slides as
   maps() lists them (1-based); every slide appears once. */
/* What the 2025 maps deck taught that this lecture had dropped (compared on 18 Oct 2026, its PDF
   01_Lecture_IPDV_6): each piece in plain words, placed where it builds on what comes before. */
const ADDED = {
  london: pic('Same place, three different jobs', 'london-three.svg',
    '2 min. From the 2025 deck (slides 14–16). ASK: "What is each one for?" A map to find your way (Tirion, 1754, after John Rocque\'s survey), a map to explore, a map to compare data (Kousoulis and Goldie, The Lancet Psychiatry, 2017). Only the last is a data visualisation; today is about that kind.'),
  uses: { type: 'content', title: 'Why maps matter: where they are used', progressive: true,
    bullets: [
      'Decisions\tWhere to build, spend money or send help.',
      'Deliveries\tShorter routes and live apps: less fuel, faster vans, taxis on time.',
      'Environment\tFloods, wildfires and pollution tracked, and people warned early.',
      'Cities\tTraffic, buses and trains, shops, and where crime happens.'
    ],
    notes: '2 min. From the 2025 deck (slide 11), in plain words. Also from that slide: shops choose new sites from who lives nearby and footfall; ride-sharing and delivery firms compete on real-time maps. ASK: "Which map did you use today?" Most have: a bus app, a delivery tracker, the weather.' },
  whatwhyhow: { type: 'cards', title: 'What? Why? How? for a map', progressive: true,
    bullets: [
      'What?\tThe data: places (shapes or points) with a value for each, like bike hires per 1,000 residents in each borough.',
      'Why?\tThe task: find where values are high or low, spot clusters, compare neighbours.',
      'How?\tThe idiom: use the real position as the layout, then put the value into colour or size.'
    ],
    notes: '2 min. Munzner\'s What–Why–How, the frame from Week 3 (the 2025 deck spent slides 6–9 on her three diagrams). The map decides How: x and y are taken by the place, so the value must go into a weaker channel.' },
  story: { type: 'content', title: 'When geography is the story', progressive: true,
    bullets: [
      'Nearby\tWhere things are matters to each other: a shop next to its competitors.',
      'Pattern\tThe insight is a pattern of places: cities and countryside vote differently.',
      'Questions\tPeople ask by place: "Which areas voted for X?"',
      'Movement\tThings flow between places: migration, shipping routes.'
    ],
    notes: '1 min. From the 2025 deck (slide 13), each with its example. If none of the four fits, a chart is probably clearer.' },
  mental: { type: 'cards', title: 'Everyone carries a map in their head', progressive: true,
    bullets: [
      'Recognise\tPeople know familiar shapes at once, with no training: the UK, the Thames, their own borough.',
      'Varies\tWhat people know about places depends on where they grew up and what they learned.',
      'Label\tSo label the places that matter. Don\'t assume everyone knows where Hackney or Bratislava is.'
    ],
    notes: '1 min. Mental models and geographic literacy (2025 deck, slide 17). It is question 3 of "Should this be a map?" (two slides on): will the audience understand the places?' },
  colour: { type: 'content', title: 'Choose the colours', progressive: true,
    bullets: [
      'Sequential\tOne colour, light to dark, for low to high: rates and percentages.',
      'Diverging\tTwo colours out from a middle, for above or below average.',
      'Colour-blind\tAbout 1 in 12 men cannot tell red from green: never rely on red against green.',
      'Context\tHow many colours, and where to cut them, always depends on the data and the question.'
    ],
    notes: '2 min. From the 2025 deck (slides 30 and 32). Week 4 taught these schemes; here they meet a map. About 8% of men (and about 0.5% of women) have red–green colour-vision deficiency.' },
  brewer: { type: 'content', title: 'Try it: ColorBrewer',
    bullets: [
      'Open\tcolorbrewer2.org',
      'Set\t5 classes, and "sequential" for the nature of your data',
      'Tick\t"colorblind safe": which schemes are left?',
      'Use\tThe same names work in Altair: scheme=\'blues\', \'greens\', \'purples\''
    ],
    notes: '3 min. The 2025 deck\'s activity (slide 30). Pairs. Then switch to "diverging" and tick colour-blind safe again: fewer survive. ColorBrewer is Cynthia Brewer\'s tool, made for maps.' },
  formats: { type: 'content', title: 'Map files and coordinates', progressive: true,
    bullets: [
      'GeoJSON\tShapes written as text: what you load in Altair (our London file).',
      'TopoJSON\tGeoJSON made smaller: shared borders stored once (our world map).',
      'Others\tShapefile (the GIS format, several files: open with GeoPandas); KML (Google Earth).',
      'Coordinates\tDegrees (longitude, latitude) are not metres: check before you join or measure.'
    ],
    notes: '2 min. From the 2025 deck (slide 33). Detail: simplify shapes for the web, since fewer points draw faster. Our London file keeps one point in four of the original, and draws instantly. A projected file (British National Grid, in metres) will not line up with longitude and latitude until it is converted.' },
  europe: pic('See it: calls across Europe', 'europe-bubbles.png',
    '1 min. From the 2025 deck (slide 22), from the Online Journalism Blog\'s guide to when to use maps (2015). ASK: "Does this need to be a map?"',
    { body: [
      'Each circle is a country, coloured by its call volume: normal, warning or high.',
      'Circles, not filled countries, so a big country does not look busier just because it is big.',
      'But the colours are green, orange and red: colour-blind readers may not tell them apart.',
      'And the question is "which countries are busiest?": a ranked bar chart would answer it faster.',
      'A map earns its place only when where the countries are helps the answer.'
    ].join('\n'), design: { capStyle: 'scrim' } }),
  responsible: { type: 'cards', title: 'Map responsibly', progressive: true,
    bullets: [
      'Privacy\tA dot on a map can be someone\'s home. Group points into areas, or blur them, before you publish.',
      'Borders\tSome borders and names are disputed. Drawing one takes a side: say whose borders you used.',
      'Access\tColour-blind-safe palettes, labels on the map, and a sentence that says what it shows.'
    ],
    notes: '2 min. The 2025 deck promised "ethical and responsible practice: privacy, geopolitical and accessibility considerations" (slide 5) but never taught it. Disputed borders: Natural Earth, our world file, draws the borders as they are in practice.' }
};
/* The order: numbers are the slides as maps() lists them (1-based), names are ADDED. */
const MAPS_ORDER = [1, 2, 3, 21, 20, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 18, 13, 14, 19, 22,
  /* Part 1: why maps matter, then kinds of map, then a data map against a chart; then the frame, and the four
     ideas in the order the decision tree asks them (Q1 given position, Q2 the story, Q3 the audience, Q4 precise
     values), so "Should this be a map?" recaps them. */
  23, 24, 'uses', 'london', 27, 28, 'whatwhyhow', 26, 'story', 'mental', 25, 29, 30, 31,
  32, 49, 36, 33, 34, 35, 37, 38, 39,
  /* Part 3: ColorBrewer asks for a number of classes, so it follows the class breaks. */
  40, 41, 'colour', 44, 43, 'brewer', 42, 45, 48, 'formats', 'europe', 46, 47, 'responsible',
  50, 51, 52, 53, 54];
function inOrder(slides) {
  const nums = MAPS_ORDER.filter(n => typeof n === 'number');
  if (nums.length !== slides.length || new Set(nums).size !== slides.length) throw new Error(`MAPS_ORDER has ${nums.length} places for ${slides.length} slides`);
  return MAPS_ORDER.map(n => (typeof n === 'number' ? slides[n - 1] : ADDED[n]));
}

module.exports = { week5, maps: () => inOrder(withSee(maps())) };
