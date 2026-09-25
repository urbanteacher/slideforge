import * as MotionLab from './render/motion-lab.js';
import {declareBodyRegion,measureBodyRegion} from './render/body-region.js';
import {measureSlideFit,probeLayoutFit,svgScale,FIT_TOLERANCE,LEGIBLE_FLOOR} from './render/fit-check.js';
import {bindCanvasRegions} from './render/canvas-regions.js';
import { CHROME_SLOTS, chromePositions, setChromeSlot, supportsChromeRegions, applyChromeRegions } from './render/regions.js';
import { createActivityFields } from './activities/fields.js';
import { labShowSlides as labShowOf } from './deck/labshow.js';
import { createCompositionRenderer } from './render/compositions.js';
import { createChartRenderer } from './render/charts.js';
import { installExplore } from './render/explore.js';
import { installExperiments } from './render/experiments.js';
import { createWordRenderer } from './render/words.js';
import { createLiveRenderer } from './render/live.js';
import { createQuizRenderer } from './render/quiz.js';
import { installArtRenderer } from './render/art.js';
import { installLatticeRenderer } from './render/lattice.js';
import { createPresenterWindow } from './presenter/window.js';
import { createDeckSettings } from './editor/deck-settings.js';
import { createContentFields } from './editor/content-fields.js';
import { installArrange } from './editor/arrange.js';
import { createPanes } from './editor/panes.js';
import { createRail } from './editor/rail.js';
import { installHeaderFooterUI } from './editor/header-footer.js';
import { installArtwork } from './editor/artwork.js';
import { installCustom } from './editor/customize.js';
import { installBingo } from './boards/runtimes/bingo.js';
import { installBowl } from './boards/runtimes/bowl.js';
import { installMemory } from './boards/runtimes/memory.js';
import { installLowStakes } from './boards/runtimes/lowstakes.js';
import { installBoss } from './boards/runtimes/boss.js';
import { installRace } from './boards/runtimes/race.js';
import { hasLayoutTemplate, layoutRegionsFor, insertionRegionFor, LAYOUT_SLOT_TEMPLATES } from './render/layout-slots.js';
import { DESIGN_CONTROLS, designApplies } from './design-controls.js';
import { THEMES, themeGround, DEFAULT_THEME, resolveTheme } from './themes.js';
import { normalizeExploration, explorationValue, explorationCurve } from './deck/exploration.js';
import { createBoardRuntime } from "./boards/runtime.js";
import { PHASES, ACTIVITIES, activity, activitiesInPhase, phaseCounts, totalMinutes } from "./activities/catalogue.js";
import { STAGE_JOBS, stageJob, stripDeclaredJob, stageCopy, parseStageLabel, activityStages, activityBrief } from "./activities/stages.js";
import { activityPlays } from "./activities/rooms.js";
import { parsePerson, orgTree, chartUsesSeriesLegend, chartFlows, chartPoints, chartGroups, fiveNumber, chartValues, histogramBins, SLIDE_TYPES, LAYOUT_GROUPS, INFO_LAYOUTS, DECK_TYPES, TABLE_MAX_COLS, TABLE_MAX_ROWS, parseTable, chartData, parseKeywordLine, formatKeywordLine, parseInfoLine, formatInfoLine, infoNumber, safeHref, safeMedia, cssUrl, BULLET_LAYOUTS, prepareLayout, pasteTarget, imagePlacement, setImagePlacement, swapImagePlacement, slideSteps, slideExcerpt, questionTimeLimit, correctAnswerLabel } from "./deck/content.js";
import { FEEDBACK_KINDS, SCALE_POINTS, scaleLabels, makeFeedback, normalizeFeedback, slideFeedback, sampleFeedbackDigest } from "./deck/feedback.js";
import { renderMarkdown, parseMarkdownDeck } from "./deck/markdown.js";
import sampleDeck from "./samples/deck.json" with { type: "json" };
/* SlideForge — model. Edit source here; npm run build updates js/model.js. */
import { uid } from "./core/identity.js";
import { makeQuestion, makeGame, starterGame } from "./games/factories.js";
import { gameStyle, GAME_STYLES, markResponse, answerLabel } from "./games/registry.js";
import { spotWords, spotSpan, SPOT_MAX_WORDS } from './games/spot.js';
import { fillParts, fillScore, FILL_MAX_GAPS } from './games/fill.js';
import { sortStatements, sortScore } from './games/compare.js';
import { formatStyle, isSpecialStyle, FORMATS, INPUTS, FORMAT_STYLE, CORE_STYLES, SPECIAL_STYLES, gameFormat } from "./games/catalogue.js";
import { clampDefinitionSeconds, splitDefinitionPassage, definitionCreate, definitionTransition, DEFINITION_TIMES } from "./games/definition.js";
import { clampChainSeconds, CHAIN_TIMES } from "./games/conceptchain.js";
import { BOSS_LEVELS, bossDamage, bossMaxHp } from "./games/boss.js";
import { bowlGrid, BOWL_TARGETS, BOWL_VALUES } from "./games/bowl.js";
import { clampLowstakesSeconds } from "./games/lowstakes.js";
import { createStores, unusedDraft, libraryGroupFromTheme, normalizeLibraryGroup, LIBRARY_GROUPS } from "./storage.js";
import { markTyped, normalizeAnswer, formatValue } from "./games/marking.js";
import { orderScore, orderPoints } from "./games/order.js";
import { wordRevealPoints, wordRevealPreFraction, wordRevealMask, wordRevealLetterCount, wordRevealShownAt, wordRevealGains, WR_LEVELS } from "./games/wordreveal.js";
import { emojiHelp, emojiCluePieces, emojiClueLayout, EMOJI_LEVELS } from "./games/emoji.js";
import { spinExplainPoints } from "./games/spinexplain.js";
import { claimPoints } from "./games/scoring.js";
import { bingoHasLine } from "./games/bingo.js";
import { speedPoints, roundSpeedPoints, SPEED_PACE } from "./games/speed.js";
import { GAME_FORMAT_PRESETS, getShowcaseGame } from "./games/presets.js";

/* Which rooms each activity works in, from its final shape; a game borrows
   its engine's (activities/rooms.js). Here rather than in the catalogue,
   which does not know the engines. */
for (const a of ACTIVITIES) a.plays = activityPlays(a, (style) => /** @type {any} */ (GAME_STYLES)[style] || null);

/**
 * Shapes these functions promise. Declared in `src/types.d.ts`; nothing is
 * imported at runtime. A type here describes data that has already been
 * through the normalizers below — it never replaces them.
 *
 * @typedef {import('./types.js').Slide} Slide
 * @typedef {import('./types.js').SlideType} SlideType
 * @typedef {import('./types.js').Deck} Deck
 * @typedef {import('./types.js').RunDeck} RunDeck
 * @typedef {import('./types.js').Question} Question
 * @typedef {import('./types.js').Game} Game
 * @typedef {import('./types.js').GameSettings} GameSettings
 * @typedef {import('./types.js').GameStyleKey} GameStyleKey
 * @typedef {import('./types.js').QuizConfig} QuizConfig
 * @typedef {import('./types.js').ReadinessReport} ReadinessReport
 */

// Keep the host reference after Node test loaders release global.window.
const runtime = window;

var SLIDE_W = 1280;

var SLIDE_H = 720;

/* A stage is 1280 wide whatever shape it is, and the shape is set by its
   height. Width is held constant on purpose: every layout in the app is
   composed against 1280, so varying it would reflow seventy slides, while
   varying the height only ever hands them more room than they were drawn
   for. 16:9 is the default and what a modern projector wants; 4:3 is still
   what a good many lecture theatres have bolted to the ceiling. */
/* The Financial Times' Visual Vocabulary, as far as this app can draw it.

   The poster's whole argument is the order of the questions: decide which
   relationship in your data matters, then choose a chart inside that
   family. A flat list of seventeen types invites picking by appearance,
   which on a module about choosing idioms is the wrong lesson to teach by
   accident.

   Categories and their framing follow the FT's. Two honest notes carried in
   the data rather than hidden: Spatial is empty, because SlideForge draws no
   maps, and every category lists the FT types it cannot draw — so an author
   reaching for a violin plot learns that it exists and that this tool has
   no violin, instead of concluding a violin is not a thing.

   Some kinds appear under more than one heading, as they do on the poster:
   a bar answers magnitude and, once sorted, ranking. */
var CHART_TAXONOMY = [
  { key: 'correlation', label: 'Correlation',
    question: 'Do two things move together?',
    note: 'Be mindful that readers will often assume the relationship you show is causal.',
    kinds: ['scatter', 'combo', 'matrix'],
    home: ['scatter', 'matrix'],
    missing: ['bubble', 'connected scatterplot', 'numeric XY heatmap'] },
  { key: 'distribution', label: 'Distribution',
    question: 'What values occur, and how often?',
    note: 'The shape — the skew — is often the point, and the thing a summary statistic hides.',
    kinds: ['histogram', 'box'],
    home: ['histogram', 'box'],
    missing: ['violin plot', 'dot strip', 'beeswarm', 'population pyramid', 'cumulative curve'] },
  { key: 'time', label: 'Change over time',
    question: 'What is the trend?',
    note: 'Give the period enough context for the reader to judge the change.',
    kinds: ['line', 'area', 'combo', 'multiples'],
    home: ['line', 'area', 'combo', 'multiples'],
    missing: ['slope', 'candlestick', 'calendar heatmap', 'streamgraph', 'fan chart'] },
  { key: 'magnitude', label: 'Magnitude',
    question: 'Which is bigger?',
    note: 'A counted number — barrels, dollars, people — reads better here than a rate.',
    kinds: ['bar', 'hbar', 'pictogram', 'bullet', 'radar'],
    home: ['bar', 'pictogram', 'radar'],
    missing: ['paired column', 'lollipop', 'marimekko', 'proportional symbol', 'parallel coordinates'] },
  { key: 'ranking', label: 'Ranking',
    question: 'What is the order?',
    note: 'Use where position matters more than the value itself. Sort it, and label the points of interest.',
    kinds: ['hbar', 'bar', 'dumbbell'],
    home: ['hbar'],
    missing: ['ordered proportional symbol', 'dot strip', 'slope', 'lollipop', 'bump'] },
  { key: 'part', label: 'Part-to-whole',
    question: 'How does one thing divide up?',
    note: 'Only worth it when the reader cares about the components, not just the total.',
    kinds: ['stack', 'pie', 'donut', 'treemap', 'waffle'],
    home: ['stack', 'pie', 'donut', 'treemap', 'waffle'],
    missing: ['marimekko', 'arc', 'voronoi', 'Venn'] },
  { key: 'flow', label: 'Flow',
    question: 'Where does it go?',
    note: 'Volumes or intensity of movement between states, conditions or places.',
    kinds: ['sankey'],
    home: ['sankey'],
    missing: ['waterfall', 'chord', 'network'] },
  { key: 'deviation', label: 'Deviation',
    question: 'How far from a baseline?',
    note: 'Variation above and below a fixed reference — a target, a long-run average, zero.',
    kinds: ['bullet', 'dumbbell'],
    home: ['bullet', 'dumbbell'],
    missing: ['diverging bar', 'diverging stacked bar', 'spine', 'surplus/deficit filled line'] },
  { key: 'spatial', label: 'Spatial',
    question: 'Where, on a map?',
    note: 'Only when location matters more to the reader than anything else about the data.',
    kinds: [],
    home: [],
    missing: ['choropleth', 'proportional symbol', 'flow map', 'contour', 'cartogram', 'dot density', 'heat map'] }
];

/** Which FT categories a chart kind belongs to — in poster order. */
function chartCategories(kind) {
  return CHART_TAXONOMY.filter(function (c) { return c.kinds.indexOf(kind) >= 0; });
}

/* Where a kind lives in a list that may only hold it once.

   The poster cross-lists deliberately: a bar answers magnitude and, sorted,
   ranking. A <select> cannot. Two options with the same value are not two
   choices — picking the second makes the control jump to the first, so a
   lecturer choosing "Bar" under Ranking watches it relocate to Magnitude.

   So the menu takes the first listing and the chooser keeps the whole truth.
   That also stops the chooser being a second route to the same place: it
   now shows what the menu structurally cannot. */
function chartPrimaryCategory(kind) {
  /* `home` says which heading owns a kind in a list that may only hold it
     once. Set deliberately rather than taken from poster order, because
     order alone emptied two categories: the only ranking charts here are
     bars, and the only deviation chart is the bullet, so letting Magnitude
     claim all three made Ranking and Deviation disappear from the menu
     entirely — which teaches their absence rather than their purpose.
     A sorted horizontal bar is the FT's own canonical ranking chart, so
     Ranking gets it, and Magnitude keeps the plain bar. */
  var owned = CHART_TAXONOMY.filter(function (c) {
    return (c.home || []).indexOf(kind) >= 0;
  })[0];
  return owned || chartCategories(kind)[0] || null;
}

var ASPECTS = {
  '16:9': { h: 720, label: '16:9 — widescreen, most projectors' },
  '16:10': { h: 800, label: '16:10 — a little taller, common on laptops' },
  '4:3': { h: 960, label: '4:3 — older lecture-theatre projectors' }
};

/** The stage height this deck presents at. */
function slideHeight(deck) {
  var a = deck && ASPECTS[deck.aspect];
  return a ? a.h : SLIDE_H;
}

// Layout choices belong to the engine; themes may choose defaults.
var COMPOSITIONS = {
  poster: { label: 'Poster · bold headline and graphic', types: ['title','section','statement','quote'] },
  editorial: { label: 'Editorial · offset headline', types: ['title','section','statement','quote'] },
  frame: { label: 'Frame · centred with breathing room', types: ['title','section','statement','quote'] },
  sidecar: { label: 'Side by side · headline and support', types: ['title','section'] },
  rail: { label: 'Side heading · points alongside', types: ['content'] },
  columns: { label: 'Columns · parallel ideas', types: ['content'] },
  'poster-art': { label: 'Poster with artwork', types: ['title'], structured: true },
  voice: { label: 'Voice · large quotation', types: ['quote'], structured: true },
  ballot: { label: 'Ballot · lettered choices', types: ['cards'], structured: true },
  prompt: { label: 'Discussion · one question', types: ['statement'], structured: true },
  rules: { label: 'Rules · numbered steps', types: ['journey'], structured: true },
  commitment: { label: 'Commitment · a next action', types: ['keyfact'], structured: true },
  comparison: { label: 'Comparison · paired rows', types: ['compare'], structured: true },
  'reveal-map': { label: 'Reveal map · labelled risks or factors', types: ['iceberg'], structured: true },
  credits: { label: 'Credits · contribution record', types: ['sourcecheck'], structured: true },
  lanes: { label: 'Decision lanes · below / at least 50', types: ['spectrum'], structured: true }
};
function compositionOptions(slide, _theme) {
  return Object.keys(COMPOSITIONS).filter(function (key) { return COMPOSITIONS[key].types.includes(slide.type); });
}
function slideComposition(deck, slide) {
  var explicit = (slide.design || {}).composition;
  if (explicit === 'none') return '';
  var defaults = (THEMES[deck && deck.theme] || {}).defaults || {};
  var key = explicit || defaults[slide.type] || '';
  return compositionOptions(slide).includes(key) ? key : '';
}
/* Morph is last because it is the only one that is a claim about the
   material rather than a way of getting from A to B: it carries the shared
   thing — the same heading, picture or chart — across the cut, and falls back
   to a fade where the browser cannot (or where less motion was asked for). */
var TRANSITIONS = /** @type {const} */ (['none', 'fade', 'push', 'zoom', 'wipe', 'morph']);

/* A stack is narrated layer by layer; past about eight the slide has stopped
   being a stack and become a folder. */
var GALLERY_MAX = 8;

/* The slide kinds that read exploration settings. A chart is here because
   prediction is a chart setting; everything else never looks at them. */
/* spotfake is here for `exploration.before` / `.after` only: it needs two
   images and labels, which is exactly what that block already holds. It uses
   none of the zoom, model or prediction fields. */
var EXPLORATION_TYPES = ['beforeafter', 'explore', 'simulation', 'chart', 'spotfake'];

/* Team colours line up with the coloured answer pads on the phones. */
var TEAM_COLORS = ['#e8474f', '#2b7ce9', '#e8a020', '#29a86b', '#8b5cf0', '#d4477f'];

var MAX_TEAMS = 6;

function teamColor(i) { return TEAM_COLORS[i % TEAM_COLORS.length]; }

/* How a live quiz is played. Deck-level, because it has to be the same for
   every question in the deck. */
/** @returns {QuizConfig} */
function makeQuizConfig() {
  /** @type {QuizConfig} */
  var config = {
    mode: 'individual',        // 'individual' | 'teams'
    teams: [{ name: 'Red' }, { name: 'Blue' }, { name: 'Green' }, { name: 'Yellow' }],
    scoreboard: true           // keep the running score on screen
  };
  return config;
}

/**
 * How the room plays, made safe. @param {any} raw @returns {QuizConfig}
 */
function normalizeQuizConfig(raw) {
  /** @type {QuizConfig} */
  var q = Object.assign(makeQuizConfig(), raw || {});
  if (q.mode !== 'teams') q.mode = 'individual';
  q.teams = (Array.isArray(q.teams) ? q.teams : [])
    .map(function (t) {
      return { name: String((typeof t === 'string' ? t : (t && t.name)) || '').trim().slice(0, 20) };
    })
    .filter(function (t) { return t.name; })
    .slice(0, MAX_TEAMS);
  // de-duplicate, case-insensitively: two "Red"s would be unpickable
  var seen = {};
  q.teams = q.teams.filter(function (t) {
    var k = t.name.toLowerCase();
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });
  if (q.mode === 'teams' && q.teams.length < 2) {
    q.teams = makeQuizConfig().teams.slice(0, 2);
  }
  q.scoreboard = q.scoreboard !== false;
  return q;
}

/* Every slide kind the runtime can render. `quiz` and `results` are not
   authored in the presentation editor any more — they are produced by
   compiling a game — but the player and renderer still handle them, which is
   what lets an embedded game expand into ordinary slides at showtime. */

/**
 * Is this one of the slide kinds this build can render?
 *
 * Written as a predicate rather than an inline check so the same runtime test
 * both guards the data and tells the type checker what survived it. Anything
 * else — an older save, a hand-edited bundle, a typo — is not a slide type.
 *
 * @param {unknown} value
 * @returns {value is SlideType}
 */
function isSlideType(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SLIDE_TYPES, value);
}

/**
 * A blank slide of the given kind, with the per-kind placeholder content the
 * editor opens on.
 *
 * @param {SlideType} [type] defaults to 'content'
 * @returns {Slide}
 */
function makeSlide(type) {
  /** @type {Slide} */
  var s = {
    id: uid(),
    type: type || 'content',
    title: '',
    subtitle: '',
    body: '',
    bullets: /** @type {string[]} */ ([]),
    notes: '',
    image: '',
    imageFit: 'cover',
    imageSide: 'right',
    video: '',
    videoPoster: '',
    videoStart: 0,          // seconds in, for a clip inside a longer file
    videoEnd: 0,            // seconds, where to stop; 0 means play to the end
    videoLoop: false,
    videoMuted: false,
    videoAutoplay: false,   // honoured on the projector, never in a preview
    tableHeader: true,
    /* Chart layout: bar, line or pie over the same text a table slide uses. */
    chartKind: /** @type {'bar'|'stack'|'hbar'|'line'|'area'|'pie'|'donut'|'scatter'|'histogram'|'box'|'pictogram'|'radar'|'sankey'|'treemap'|'bullet'|'combo'|'waffle'} */ ('bar'),
    /* Where the numbers came from, and what they are not. See the note in
       normalizeSlide. */
    chartSource: '',
    chartIcon: '',
    chartUnit: 1,
    /* Image stack: each layer is one picture with its own caption and source,
       shown one in front of the last. Empty on every other kind of slide. */
    layers: /** @type {import('./types.js').GalleryLayer[]} */ ([]),
    /* Chart callouts: which categories to zoom to, in order, and what to say
       about each. Empty on every other layout. */
    callouts: /** @type {{label: string, note: string}[]} */ ([]),
    transition: 'fade',
    buildMode: /** @type {'hide'|'dim'} */ ('hide'),
    // quiz fields
    question: '',
    options: /** @type {string[]} */ ([]),
    correct: 0,
    timeLimit: 0,
    points: 1000,
    // game embed
    gameId: '',
    gameTitle: '',
    // audience feedback attached to this slide (null = none)
    feedback: null
  };

  /* Carried only by the kinds that read it, so a blank title slide does not
     ship sixteen fields nothing will ever look at. */
  if (EXPLORATION_TYPES.indexOf(s.type) >= 0) s.exploration = normalizeExploration(null);

  switch (s.type) {
    case 'title':
      s.title = 'Presentation title';
      s.subtitle = 'Your name';
      break;
    case 'journey':
      s.title = 'The journey ahead';
      s.subtitle = 'Reveal each milestone as you explain it';
      s.bullets = ['Start\tFrame the question.', 'Develop\tExplore and build.', 'Reflect\tEvaluate and improve.'];
      s.progressive = true;
      break;
    case 'mindmap':
      s.title = 'Central idea';
      s.bullets = ['Discover\tWhat can we find?', 'Explain\tWhat does it mean?', 'Decide\tWhat should happen next?'];
      s.progressive = true;
      break;
    case 'introduction':
      s.title = 'Your name';
      s.subtitle = 'Job title';
      s.body = 'A little about your teaching, experience and interests.';
      break;
    case 'section':
      s.title = 'Section heading';
      break;
    case 'cards':
    case 'content':
      s.title = 'Slide title';
      s.bullets = ['First point', 'Second point', 'Third point'];
      break;
    case 'keywords':
      s.title = 'Key vocabulary';
      s.bullets = [
        formatKeywordLine('Keyword', 'a short plain-language definition'),
        formatKeywordLine('', ''),
        formatKeywordLine('', '')
      ];
      break;
    case 'italics':
      s.title = 'Phrases to notice';
      s.bullets = [
        formatKeywordLine('key phrase', 'why this wording matters'),
        formatKeywordLine('', ''),
        formatKeywordLine('', '')
      ];
      break;
    case 'links':
      s.title = 'Further reading';
      s.bullets = [
        formatKeywordLine('Resource title', 'https://'),
        formatKeywordLine('', ''),
        formatKeywordLine('', '')
      ];
      break;
    case 'split':
      s.title = 'Say it. Show it.';
      s.bullets = ['First point', 'Second point', 'Third point'];
      s.imageSide = 'right';
      break;
    case 'image':
      s.title = 'Image slide';
      break;
    case 'stats':
      s.title = 'The numbers that matter';
      s.bullets = [
        formatInfoLine('Label', 'Value', 'Note'),
        formatInfoLine('', '', ''),
        formatInfoLine('', '', '')
      ];
      break;
    case 'compare':
      s.title = 'Side by side';
      s.subtitle = 'Option A | Option B';
      s.bullets = [formatInfoLine('', ''), formatInfoLine('', ''), formatInfoLine('', '')];
      break;
    case 'funnel':
      s.title = 'Where the numbers thin out';
      s.bullets = [
        formatInfoLine('Stage', 'Value', 'Note'),
        formatInfoLine('', '', ''),
        formatInfoLine('', '', ''),
        formatInfoLine('', '', '')
      ];
      break;
    case 'spectrum':
      s.title = 'Where does each one sit?';
      s.subtitle = 'Never worth it | Always worth it';
      s.bullets = [
        formatInfoLine('Something', '20', 'Why it sits there'),
        formatInfoLine('', '50', ''),
        formatInfoLine('', '85', '')
      ];
      break;
    case 'sourcecheck':
      s.title = '"The claim, quoted as it was made"';
      s.bullets = [
        formatInfoLine('Who', 'The source', ''),
        formatInfoLine('When', 'The date', ''),
        formatInfoLine('Basis', 'What it rests on', ''),
        formatInfoLine('Gap', 'What it does not say', '')
      ];
      s.progressive = true;
      break;
    case 'shift':
      s.title = 'How fast this moved';
      s.bullets = [
        formatInfoLine('Then', '100', 'Where it started'),
        formatInfoLine('Now', '400', 'Where it is'),
        formatInfoLine('Next', '', 'Where it goes')
      ];
      break;
    case 'spotfake':
      s.title = 'Which one is real?';
      s.subtitle = 'A | B';
      s.correct = 0;
      s.bullets = ['The first tell', 'The second tell', 'The third tell'];
      s.progressive = true;
      break;
    case 'iceberg':
      s.title = 'The hidden costs';
      s.subtitle = 'What you see';
      s.bullets = [
        formatInfoLine('What it costs', 'Value', 'Note'),
        formatInfoLine('', '', ''),
        formatInfoLine('', '', '')
      ];
      s.progressive = true;
      break;
    case 'timeline':
      s.title = 'How we got here';
      s.bullets = [
        formatInfoLine('Date', 'Event', 'Detail'),
        formatInfoLine('', '', ''),
        formatInfoLine('', '', ''),
        formatInfoLine('', '', '')
      ];
      break;
    case 'quote':
      s.body = 'A quotation that makes the point better than a bullet list would.';
      s.subtitle = 'Attribution';
      break;
    case 'code':
      s.title = 'Code that writes itself';
      s.language = 'python';
      s.typewrite = true;
      s.typeSpeed = 55;
      s.code =
        'import pandas as pd\n\n' +
        'df = pd.read_csv("attendance.csv")\n' +
        'by_week = df["week"].value_counts().sort_index()\n' +
        'print(by_week.head())\n';
      break;
    case 'quiz':
      s.question = 'Which of these is correct?';
      s.options = ['Option A', 'Option B', 'Option C', 'Option D'];
      s.correct = 0;
      s.timeLimit = 20;
      break;
    case 'results':
      s.title = 'Results';
      break;
    case 'beforeafter':
      s.title = 'What changed?';
      break;
    case 'explore':
      s.title = 'Look closer';
      break;
    case 'simulation':
      s.title = 'What happens when the input changes?';
      break;
    case 'game':
      s.title = 'Game';
      s.transition = 'zoom';
      break;
  }
  return s;
}

/** A new deck with one title slide. @param {string} [title] @returns {Deck} */
function makeDeck(title) {
  /** @type {Deck} */
  var deck = {
    id: uid(),
    title: title || 'Untitled deck',
    /* The house theme. This was midnight, so New blank document handed back
       a navy deck inside a sage app — and makeLesson had to override it to
       studio to get the default anyone actually sees. */
    theme: DEFAULT_THEME,
    /* Which catalogue format this game was created as.
       The engine is how it plays; the format is what it is for. Without
       this, every preset over `choice` authored as "Multiple choice" and a
       teacher who picked "Predict the Outcome" lost the name, the wording
       and the reason the moment the game existed. Free text rather than an
       enum: a format that is retired should leave old games readable. */
    format: '',
    showSlideNumbers: true,
    /* Close the lesson on the scores. An embedded game puts its own board up
       the moment that game ends — which is mid-lesson, and gone by the time
       anyone leaves. Off by default: a deck that ends on a reflection slide
       should keep ending there unless the teacher asks otherwise. */
    finalScores: false,
    /* '16:9' | '16:10' | '4:3' — see ASPECTS. */
    aspect: '16:9',
    logo: '',
    logoOn: 'none', // 'none' | 'title' | 'all'
    quiz: makeQuizConfig(),
    created: Date.now(),
    modified: Date.now(),
    slides: /** @type {any[]} */ ([])
  };
  deck.slides.push(makeSlide('title'));
  return deck;
}

function starterDeck() {
  const deck = makeDeck(sampleDeck.title);
  deck.slides = sampleDeck.slides.map(template =>
    Object.assign(
      makeSlide(isSlideType(template.type) ? template.type : 'content'),
      JSON.parse(JSON.stringify(template))
    )
  );
  return deck;
}

/* ---------- normalising decks loaded from disk / older versions ---------- */

/**
 * A slide from disk, an import, or an older version of this app, made safe to
 * render.
 *
 * `raw` is `any` on purpose and not `Slide`: it is whatever was in
 * localStorage or an .sfbundle.json, and the whole job of this function is
 * that it cannot be trusted. The guarantee is on the way out.
 *
 * @param {any} raw
 * @returns {Slide}
 */
function normalizeSlide(raw) {
  var base = makeSlide(isSlideType(raw && raw.type) ? raw.type : 'content');
  /** @type {Slide} */
  var s = Object.assign(base, raw || {});
  s.id = s.id || uid();
  if (!SLIDE_TYPES[s.type]) s.type = 'content';
  if (!Array.isArray(s.bullets)) s.bullets = [];
  /* Options are read back off `raw` rather than off `s`. An older build
     stored them as { text } objects, and by this line `s` already claims to
     be a Slide — whose options are strings. The untrusted shape belongs on
     the untrusted side. */
  var rawOptions = raw && Array.isArray(raw.options) ? raw.options : [];
  s.options = rawOptions.map(function (o) {
    return typeof o === 'string' ? o : (o && o.text) || '';
  });
  s.correct = Math.max(0, Math.min(s.options.length - 1, Number(s.correct) || 0));
  s.timeLimit = Math.max(0, Number(s.timeLimit) || 0);
  s.points = Number(s.points) || 1000;
  if (TRANSITIONS.indexOf(s.transition) === -1) s.transition = 'fade';
  if (s.journeyMode != null) s.journeyMode = s.journeyMode === 'handover' || s.journeyMode === 'stepper' ? s.journeyMode : 'path';
  if (s.date != null) s.date = /^\d{4}-\d{2}-\d{2}$/.test(String(s.date)) && Number.isFinite(Date.parse(s.date)) ? String(s.date) : '';
  s.gameId = String(s.gameId || '');
  s.gameTitle = String(s.gameTitle || '');
  s.imageSide = s.imageSide === 'left' ? 'left' : 'right';
  s.video = safeMedia(s.video);
  s.videoPoster = safeMedia(s.videoPoster);
  s.videoStart = Math.max(0, Number(s.videoStart) || 0);
  s.videoEnd = Math.max(0, Number(s.videoEnd) || 0);
  /* A stop before the start is not a clip, it is a typo, and honouring it
     would play nothing at all with no sign why. */
  if (s.videoEnd && s.videoEnd <= s.videoStart) s.videoEnd = 0;
  s.videoLoop = s.videoLoop === true;
  s.videoMuted = s.videoMuted === true;
  s.videoAutoplay = s.videoAutoplay === true;
  s.tableHeader = s.tableHeader !== false;
  /* Code viewer: source lives on `code`. Older drafts may have put it in
     `body`; promote once so the inspector and the wall agree. */
  if (s.type === 'code' || (raw && (raw.code != null || raw.language != null))) {
    s.code = String(s.code != null ? s.code : (s.body || ''));
    var lang = String(s.language || 'python').trim().toLowerCase();
    s.language = (lang === 'javascript' || lang === 'js') ? 'javascript'
      : (lang === 'text' || lang === 'plain') ? 'text'
      : 'python';
    /* How the code arrives. Three answers, because a lecturer wants a
       different one at different moments: the whole cell to talk over, the
       typewriter for a live-coding feel, or one line per press when the
       walk-through IS the teaching.

       typewrite stays as the older on/off so decks written before this still
       mean what they said — with no mode chosen, false reads as 'all' and
       anything else as 'type'. */
    var asked = String(s.codeReveal || '').trim();
    var reveal = asked === 'all' || asked === 'type' || asked === 'lines'
      ? /** @type {'all'|'type'|'lines'} */ (asked)
      : (s.typewrite === false ? 'all' : 'type');
    s.codeReveal = reveal;
    s.typewrite = reveal === 'type';
    /* 200 rather than 120: the slow end is the point of the control, and a
       room reading along wants about a tenth of a second a character. */
    s.typeSpeed = Math.max(8, Math.min(200, Number(s.typeSpeed) || 55));
    if (s.type !== 'code') {
      /* Authored code settings on a non-code slide are kept only while the
         fields exist — prepareLayout will reattach when the type returns. */
    }
  } else {
    delete s.code;
    delete s.language;
    delete s.typewrite;
    delete s.typeSpeed;
    delete s.codeReveal;
  }
  /* Kept off the slide unless it is true, for the reason the note below
     gives about unused fields: a boolean stamped on all 74 slides of a
     lecture is bytes in localStorage bought for nothing. */
  if (s.hidden === true) s.hidden = true; else delete s.hidden;
  /* Only the kinds that read it. Stamping the defaults onto every slide put
     sixteen unused fields on every title, section and quiz slide: on the
     29-slide LDSCI6253 deck, none of which uses an exploration, that was
     8,294 bytes — 22% of the saved deck. Decks live in localStorage beside
     embedded images, so the space is not free. Authored settings already on
     a slide are kept whatever its type, so changing a slide's layout and
     changing it back does not throw the settings away. */
  if (EXPLORATION_TYPES.indexOf(s.type) >= 0 || (raw && raw.exploration)) {
    s.exploration = normalizeExploration(raw && raw.exploration);
    s.exploration.before = safeMedia(s.exploration.before);
    s.exploration.after = safeMedia(s.exploration.after);
  } else {
    delete s.exploration;
  }
  /* Seven idioms over one data shape. Stacked and horizontal are the bar
     renderer under options, area is the line renderer, donut is the pie —
     the drawing is shared because the question a lecturer is answering is
     "which of these reads best", not "which of these is implemented". */
  s.chartKind = ['bar', 'stack', 'hbar', 'line', 'area', 'pie', 'donut',
                 'scatter', 'histogram', 'box', 'pictogram', 'radar', 'sankey',
                 'treemap', 'bullet', 'combo', 'waffle', 'dumbbell', 'matrix', 'multiples'].indexOf(s.chartKind) >= 0 ? s.chartKind : 'bar';
  /* One icon per unit, for the pictogram. A single character so a count of
     them is a count of things; an emoji that renders as two glyphs would
     make eleven look like twenty-two. */
  /* A line under the chart for where the data came from and what it does
     not show. Two hundred characters, because the useful version of this is
     a sentence — "Selected platform peaks, not annual means" — and a
     paragraph under a chart on a wall is not read by anybody.

     Absent unless written, like the other optional fields: a blank string on
     seventy slides is bytes in localStorage bought for nothing. */
  s.chartSource = String(s.chartSource || '').trim().slice(0, 200);
  if (!s.chartSource) delete s.chartSource;
  s.chartIcon = String(s.chartIcon || '').trim().slice(0, 4);
  s.chartUnit = Math.max(1, Math.min(10000, Number(s.chartUnit) || 1));
  /* Layers come off `raw` for the same reason options do: whatever was on disk
     may be strings, may be half-built, may be nothing. Capped because a stack
     is read one layer at a time and nobody narrates twelve. */
  var rawLayers = raw && Array.isArray(raw.layers) ? raw.layers : [];
  s.layers = rawLayers.slice(0, GALLERY_MAX).map(function (layer) {
    var l = layer && typeof layer === 'object' ? layer : {};
    return {
      image: safeMedia(l.image),
      caption: String(l.caption || ''),
      source: String(l.source || '')
    };
  });
  /* Callouts come off `raw` like layers do, and for the same reasons: whatever
     is on disk may be half-built. Capped at six — a chart a teacher walks
     through six times is a chart that wanted to be six slides.

     The label is a category name rather than a coordinate, so a callout still
     points at the right thing after the table is edited, re-sorted or has a
     row inserted above it. */
  var rawCallouts = raw && Array.isArray(raw.callouts) ? raw.callouts : [];
  var callouts = rawCallouts.slice(0, 6).map(function (callout) {
    var c = callout && typeof callout === 'object' ? callout : {};
    return {
      label: String(c.label == null ? '' : c.label).trim().slice(0, 80),
      note: String(c.note == null ? '' : c.note).trim().slice(0, 160)
    };
  }).filter(function (c) { return c.label; });
  if (callouts.length) s.callouts = callouts; else delete s.callouts;
  /* How a build treats the points it has already been through. Kept separate
     from `progressive` so the gate stays a boolean: every existing deck says
     progressive:true and means 'hide', which is still the default here. */
  /* Three ways a build treats what it has already been through: hide them,
     hold them back, or hold them back and put the room's eye on the live one.
     Still a string with a default rather than two booleans — every existing
     deck says progressive:true and means 'hide'. */
  s.buildMode = s.buildMode === 'dim' || s.buildMode === 'spot' ? s.buildMode : 'hide';
  if (s.imageFit !== 'contain') s.imageFit = 'cover';
  s.feedback = normalizeFeedback(s.feedback);
  return s;
}

/**
 * A deck from storage or an import, made safe to open.
 *
 * `raw` is `any` for the same reason as {@link normalizeSlide}: it is
 * whatever was on disk. Returns null when it is not a deck at all.
 *
 * @param {any} raw
 * @returns {Deck | null}
 */
function normalizeDeck(raw) {
  if (!raw || typeof raw !== 'object') return null;
  /** @type {Deck} */
  var d = Object.assign(makeDeck(), raw);
  d.id = d.id || uid();
  d.title = String(d.title || 'Untitled deck');
  d.theme = resolveTheme(d.theme);
  d.quiz = normalizeQuizConfig(raw.quiz);
  d.slides = (Array.isArray(raw.slides) ? raw.slides : []).map(normalizeSlide);
  if (!d.slides.length) d.slides = [makeSlide('title')];
  d.showSlideNumbers = d.showSlideNumbers !== false;
  d.finalScores = d.finalScores === true;
  d.aspect = ASPECTS[d.aspect] ? d.aspect : '16:9';
  d.logo = String(d.logo || '');
  /* Who the deck belongs to. A theme may print it; none may invent it. */
  d.org = String(d.org || '');
  /* The line a composition sets on its closing rule. A campaign's own words
     — "Keep humans in the loop" — belong to the deck, not to the renderer;
     the first draft of these layouts compiled about thirty such strings into
     js/render.js and none of them could be edited or translated. */
  d.closingNote = String(d.closingNote || '');
  d.sourceKey = String(raw.sourceKey || '');
  d.libraryGroup = normalizeLibraryGroup(raw.libraryGroup, d.theme);
  d.logoSize = ['small','medium','large'].includes(raw.logoSize) ? raw.logoSize : 'medium';
  if (d.logoOn !== 'all' && d.logoOn !== 'title' && d.logoOn !== 'none') {
    d.logoOn = d.logo ? 'all' : 'none';
  }
  if (!d.logo) d.logoOn = 'none';
  return d;
}

/** Index of the first slide the room will see, ignoring hidden ones. */
function firstShownIndex(deck) {
  var slides = (deck && deck.slides) || [];
  for (var i = 0; i < slides.length; i++) if (!slides[i].hidden) return i;
  return 0;
}

/**
 * Whether this slide carries the deck's corner mark.
 *
 * @param {object} deck
 * @param {object} [slide]
 * @param {number} [index] position in the deck, when the caller knows it
 *
 * 'title' means the front of the deck, decided by position and not by
 * layout. Matching slide.type === 'title' looked equivalent and was not: a
 * deck that opens on a Section \u2014 which is how most of them open, and how
 * every lesson built from the example does \u2014 has no slide of that type at
 * all, so the option put the logo on none of them and said nothing about why.
 * Falls back to the layout test when there is no index to go on, so a preview
 * rendered on its own still shows the mark.
 *
 * The front of the deck is the first slide the room will see.
 *
 * This used to be `index === 0`, which is the first row of the editor — not
 * the same thing. Every AI Awareness Day deck opens with a hidden teacher
 * preparation page, so the mark was painted onto a slide nobody could ever
 * see and withheld from the cover behind it. Present was right and the editor
 * was wrong, because the running order has already dropped the hidden slides
 * by then; the two surfaces disagreed about the same deck.
 *
 * The old signature also answered differently depending on whether a caller
 * passed an index at all — position for some, slide type for others. One
 * question deserves one answer, so the deck is consulted either way.
 */
function deckShowsLogo(deck, slide, index) {
  if (!deck || !String(deck.logo || '').trim()) return false;
  /* Nothing is chrome on a slide the room never reaches. A hidden page is
     usually a teacher's own layout with no corner reserved for a mark, so
     drawing one lands it on top of their notes. */
  if (slide && slide.hidden) return false;
  if (deck.logoOn === 'all') return true;
  if (deck.logoOn !== 'title') return false;
  if (typeof index === 'number') return index === firstShownIndex(deck);
  /* No index to place it by — fall back to the shape of the slide, which is
     what a standalone renderer (a review page, a thumbnail) can still see. */
  return !!(slide && (slide.type === 'title' || slide.type === 'section'));
}

/**
 * A question made safe, and made to fit the style it will be played as.
 *
 * Normalizing against the game's style rather than the question's own is
 * what makes converting a game between styles safe.
 *
 * @param {any} raw
 * @param {GameStyleKey} [style]
 * @returns {Question}
 */
function normalizeQuestion(raw, style) {
  /** @type {Question} */
  var q = Object.assign(makeQuestion(style), raw || {});
  q.id = q.id || uid();
  q.question = String(q.question || '');
  gameStyle(style).normalize(q);
  /* Both read off `raw`: an empty string is what a cleared number field puts
     in the save, and it means "inherit the game default" rather than zero.
     No engine's normalize() touches either, so this is the same value the
     merged question holds. */
  var rawTime = raw ? raw.timeLimit : null;
  var rawPoints = raw ? raw.points : null;
  q.timeLimit = rawTime == null || rawTime === '' ? null : Math.max(0, Number(rawTime) || 0);
  q.points = rawPoints == null || rawPoints === '' ? null : Math.max(0, Number(rawPoints) || 0);
  q.bloom = '';
  q.voteOnly = q.voteOnly === true;
  q.explanation = String(q.explanation || '');
  q.source = String(q.source || '');
  q.image = String(q.image || '');
  q.imageAlt = String(q.imageAlt || '');
  if (['band', 'first', 'overlay'].indexOf(q.imageLayout) === -1) q.imageLayout = 'band';
  return q;
}

/** Game-wide settings, made safe. @param {any} raw @returns {GameSettings} */
function normalizeGameSettings(raw) {
  var base = makeGame().settings;
  /** @type {GameSettings} */
  var g = Object.assign(base, raw || {});
  var q = normalizeQuizConfig({ mode: g.mode, teams: g.teams, scoreboard: g.scoreboard });
  g.mode = q.mode;
  g.teams = q.teams;
  g.scoreboard = q.scoreboard;
  g.defaultTime = Math.max(0, Number(g.defaultTime) || 0);
  g.defaultPoints = Math.max(0, Number(g.defaultPoints) || 1000);
  g.intro = g.intro !== false;
  g.scoreSlide = g.scoreSlide !== false;
  if (['inline', 'slide', 'both'].indexOf(g.explainStyle) === -1) g.explainStyle = 'inline';
  g.trackLength = Math.max(3, Math.min(12, Number(g.trackLength) || 5));
  g.music = safeMedia(g.music);
  g.musicVolume = Math.max(0, Math.min(100,
    g.musicVolume == null ? 55 : Number(g.musicVolume) || 0));
  g.confidence = g.confidence !== false;
  g.scoreSpoken = g.scoreSpoken === true;
  g.resultsOnReveal = g.resultsOnReveal === true;
  if (g.bowlTarget != null) {
    var target = Number(g.bowlTarget);
    g.bowlTarget = BOWL_TARGETS.indexOf(target) > -1 ? target : 1000;
  }
  return g;
}

/**
 * A game from storage or an import, made safe to open. Null when it is not
 * a game at all.
 *
 * @param {any} raw
 * @returns {Game | null}
 */
function normalizeGame(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var rawStyle = GAME_STYLES[raw.style] ? raw.style : 'choice';
  var format = String(raw.format || '').slice(0, 40);
  /* Catalogue format owns the engine — keep them aligned. */
  var mapped = formatStyle(format);
  var style = mapped || rawStyle;
  var remapped = !!(mapped && mapped !== rawStyle);
  /** @type {Game} */
  var g = Object.assign(makeGame(undefined, style), raw);
  g.id = g.id || uid();
  g.kind = 'game';
  g.style = style;
  g.title = String(g.title || 'Untitled game');
  /* Heal older True/False (and other special) games that had an engine but
     no catalogue format — without this, Game settings treated them as a
     blank quiz and offered Beat the Clock beside them. */
  if (!format && isSpecialStyle(style) && FORMATS[style]) format = style;
  g.format = format;
  g.theme = resolveTheme(g.theme);
  g.libraryGroup = normalizeLibraryGroup(raw.libraryGroup, g.theme);
  g.sourceDeckId = String(raw.sourceDeckId || '').slice(0, 80);
  var settings = Object.assign({}, raw.settings || {});
  if (style === 'bowl' && settings.bowlTarget == null) {
    /* Older bowls stored this game-wide choice on question one. Migrate it
       before normalising questions, which now discard that legacy field. */
    var oldFirst = Array.isArray(raw.questions) && raw.questions[0];
    settings.bowlTarget = oldFirst && oldFirst.targetScore;
  }
  g.settings = normalizeGameSettings(settings);
  /* An older Time Traveler was a typed answer: a clue with the year in it,
     and the event to name. Now the event is named and the year is what the
     room places, so the year comes out of the clue (which would give it
     away) into the target, and the clue moves to the reveal. */
  if (format === 'time-traveler' && style === 'slider' && rawStyle === 'type' && Array.isArray(raw.questions)) {
    raw = Object.assign({}, raw, { questions: raw.questions.map(healTimeTraveler) });
  }
  /* Every question is normalised against the game's style, which is what
     makes converting a game between styles safe. */
  g.questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .map(function (q) {
      if (!remapped) return normalizeQuestion(q, style);
      /* Engine changed because of the format map — rebuild answer shape so
         Memory Flip "Claimed / Not yet" cannot stick on Beat the Clock. */
      var fresh = makeQuestion(style);
      ['question', 'answer', 'explanation', 'image', 'imageAlt', 'imageLayout',
        'notes', 'bloom', 'source', 'timeLimit', 'points', 'voteOnly',
        'passage', 'accept', 'allowTypos',
        'itemA', 'itemB', 'similarities', 'differences', 'category',
        'term', 'prompt', 'definition',
        /* A slider's line and a fill's lures, for the formats that heal into
           them (Time Traveler, Fill the gaps). */
        'min', 'max', 'step', 'target', 'tolerance', 'unit', 'lures'].forEach(function (k) {
        if (q && q[k] != null && q[k] !== '') fresh[k] = q[k];
      });
      if (q && q.id) fresh.id = q.id;
      /* Keep real MCQ options across remap — never host-verdict pairs
         (Claimed / Accept / Complete) or they stick on Beat the Clock. */
      if (q && Array.isArray(q.options) && q.options.length) {
        var head = String(q.options[0] || '');
        if (head !== 'Claimed' && head !== 'Accept' && head !== 'Complete' &&
            head !== 'Clear') {
          fresh.options = q.options.slice();
          if (q.correct != null) fresh.correct = q.correct;
        }
      }
      if (style === 'lowstakes' && !(q && String(q.answer || '').trim()) &&
          q && String(q.explanation || '').trim()) {
        fresh.answer = q.explanation;
      }
      /* Old choice odd-one / compare saves: salvage two options as items. */
      if (style === 'compare' && !(String(fresh.itemA || '').trim() && String(fresh.itemB || '').trim()) &&
          q && Array.isArray(q.options) && q.options.length >= 2) {
        fresh.itemA = String(q.options[0] || '').trim();
        fresh.itemB = String(q.options[1] || '').trim();
      }
      if (style === 'compare' && !String(fresh.similarities || '').trim() &&
          q && String(q.explanation || '').trim()) {
        fresh.similarities = q.explanation;
      }
      return normalizeQuestion(fresh, style);
    });
  if (!g.questions.length) g.questions = [makeQuestion(style)];
  return g;
}

/** Fields a question contributes to its compiled slide. Kept in one place
    because the game editor's preview builds the same slide and the two lists
    have already drifted twice. */
/**
 * Everything a question contributes to its slide, in one place.
 *
 * The game editor's preview and the compiler both go through this. They
 * used to build the slide separately and drifted twice — the preview
 * silently lost explanations, then images — so there is now one function
 * and no second copy to forget.
 *
 * @param {object} q question
 * @param {string} styleKey game style
 * @param {object} settings game settings
 * @param {object} s slide to fill
 */
function fillQuestionSlide(q, styleKey, settings, s) {
  var style = gameStyle(styleKey);
  style.compile(q, settings, s);
  s.style = styleKey;
  /* How the room answers. Read off the style rather than written by each
     compile(), so a style declares it once. */
  s.input = INPUTS.indexOf(style.input) > -1 ? style.input : 'choice';
  /* Memory Flip / Match: study length is the wall countdown — same clock
     ring as every other quiz, not a second timer UI. */
  if ((styleKey === 'memoryflip' || styleKey === 'memorymatch') &&
      s.hideAfterStudy) {
    s.timeLimit = Number(s.studySeconds) || 0;
  } else if (styleKey === 'definition') {
    s.timeLimit = clampDefinitionSeconds(
      q.timeLimit == null ? settings.defaultTime : q.timeLimit
    );
  } else if (styleKey === 'oddone' || styleKey === 'compare') {
    s.timeLimit = 0;
  } else if (styleKey === 'conceptchain') {
    s.timeLimit = clampChainSeconds(
      q.timeLimit == null ? settings.defaultTime : q.timeLimit
    );
  } else {
    s.timeLimit = q.timeLimit == null ? settings.defaultTime : q.timeLimit;
  }
  s.points = q.points == null ? settings.defaultPoints : q.points;
  /* The room's bars wait for the reveal, so nobody answers by following the
     tallest one. Off by default — live bars are how every game has played. */
  if (settings.resultsOnReveal === true) s.holdResults = true;
  if (style.mechanic === 'boss' || q.difficulty) {
    s.difficulty = BOSS_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : 'medium';
    s.bossDamage = bossDamage(s.difficulty);
  }
  QUESTION_SLIDE_FIELDS.forEach(function (k) {
    if (q[k] != null && q[k] !== '') s[k] = q[k];
  });
  s.explainStyle = settings.explainStyle;
  s.confidence = settings.confidence !== false;
  s.scoreSpoken = settings.scoreSpoken === true;
  /* Odd One Out is a vote that is never scored or marked: no points, no
     clock, no confidence question. Next reveals the split (it is not
     voteOnly, which never reveals). See games/oddone.js. */
  if (styleKey === 'oddone') {
    s.points = 0;
    s.timeLimit = 0;
    s.voteOnly = false;
    s.confidence = false;
    s.hideAnswerUntilReveal = true;
    s.oddoneDiscuss = true;
    s.holdResults = true;
    s.unmarked = true;
  }
  if (styleKey === 'compare') {
    s.points = 0;
    s.timeLimit = 0;
    s.confidence = false;
    s.hideAnswerUntilReveal = true;
    s.itemA = String(q.itemA || '').trim();
    s.itemB = String(q.itemB || '').trim();
    s.similarities = String(q.similarities || '').trim();
    s.differences = String(q.differences || '').trim();
    s.category = String(q.category || '').trim();
    /* A sort (tagged statements) keeps what compare.compile built; only a
       discussion is the no-options vote it always was. */
    if (s.compareSort) s.input = 'sort';
    if (!s.compareSort) {
      s.voteOnly = true;
      s.compareDiscuss = true;
      s.options = [];
      s.correct = -1;
    }
  }
  if (styleKey === 'conceptchain') {
    s.conceptChain = true;
    s.term = String(q.term || '').trim();
    s.prompt = String(q.prompt || '').trim();
    s.confidence = false;
    s.options = ['Accept', 'Reject'];
    s.correct = 0;
    s.judgeKind = 'accept';
  }
  return s;
}

var QUESTION_SLIDE_FIELDS = [
  'image', 'imageAlt', 'imageLayout', 'explanation', 'source', 'notes', 'bloom',
  'voteOnly'
];

/**
 * Turn a game into slides the player can run.
 * @param {object} game
 * @param {object} opts { theme, intro, scoreSlide, label }
 * @returns {Array} slides
 */
/**
 * @param {Game} game
 * @param {{theme?: string, intro?: boolean, scoreSlide?: boolean, label?: string}} [opts]
 * @returns {Slide[]} slides the player can run
 */
/** A typed Time Traveler question as a slider on a year scale. */
function healTimeTraveler(q) {
  if (!q || typeof q !== 'object' || q.target != null) return q;
  var clue = String(q.question || '');
  var year = /\b(\d{3,4})\b/.exec(clue);
  var event = String((Array.isArray(q.accept) && q.accept[0]) || q.answer || '').trim();
  if (!year || !event) return q;
  var y = Number(year[1]);
  var min = Math.floor(y / 100) * 100 - 100;
  return {
    question: 'Place it in time: ' + event,
    min: min, max: min + 300, step: 1, target: y, tolerance: 10, unit: '',
    explanation: [clue, q.explanation].filter(function (x) { return String(x || '').trim(); }).join(' ')
  };
}

/* Styles whose items are drawn at random each run — see compileGame. */
var DRAW_STYLES = ['spinexplain', 'randomchallenge', 'headsup'];

function compileGame(game, opts = {}) {
  opts = opts || {};
  var st = game.settings;
  var engine = gameStyle(game.style);
  var out = [];

  if (opts.intro !== false && st.intro) {
    var intro = makeSlide('section');
    intro.title = game.title;
    intro.subtitle = game.questions.length +
      (game.questions.length === 1 ? ' question' : ' questions') +
      (st.mode === 'teams' ? ' · ' + st.teams.length + ' teams' : '');

    intro.transition = 'zoom';
    intro.notes = 'Game intro. The next ' + game.questions.length + ' slides are its questions.';
    if (engine.boardEngine) engine.boardEngine.decorateIntro(intro, game);
    intro.gameId = game.id;      // marks the round boundary for live mode
    out.push(intro);
  }

  /* The rules, for the room rather than for the teacher's own screen. The
     copy is the playbook's, baked in here so the slide travels: the
     presenter window and a saved deck do not load the playbook. */
  if (st.howTo !== false && runtime.SF && runtime.SF.Playbook) {
    var book = runtime.SF.Playbook.forGame(game);
    var steps = book && book.howToPlay ? book.howToPlay.slice(0, 6) : [];
    if (book && steps.length) {
      var rules = makeSlide('content');
      rules.id = game.id + ':howto';
      rules.gameId = game.id;
      rules.gameTitle = game.title;
      /* Named in the title, because a content slide has no subtitle line to
         put it on and the room should know which game this is the rules for. */
      rules.title = 'How to play \u2014 ' + (book.title || game.title);
      rules.bullets = steps;
      /* All of it at once, not step-revealed. Four short rules are not a
         wall of text, and a rules slide that arrives blank until the
         teacher presses looks like a slide that failed to load. */
      rules.transition = 'fade';
      rules.notes = [book.aim, runtime.SF.Playbook.engineSummary(book)]
        .filter(Boolean).join('\n\n');
      out.push(rules);
    }
  }

  if (engine.boardEngine) return out.concat(engine.boardEngine.compile(game, { makeSlide }));

  var playQuestions = game.questions.slice();
  /* The draw. A format whose name promises chance — a spin, a random
     challenge, a pile of Heads Up terms — plays its items in a fresh order
     every run, with no repeats, and each item knows its place in the pile
     ("Card 3 · 9 left"). Whole questions are shuffled, so an explanation
     stays with its item; the authored order and the IDs are untouched. */
  var drawn = DRAW_STYLES.indexOf(game.style) >= 0;
  /* Time Traveler's line spans every event in the game. */
  var travelSpan = { min: Infinity, max: -Infinity };
  if (game.format === 'time-traveler') {
    playQuestions.forEach(function (q) {
      if (Number.isFinite(Number(q.min))) travelSpan.min = Math.min(travelSpan.min, Number(q.min));
      if (Number.isFinite(Number(q.max))) travelSpan.max = Math.max(travelSpan.max, Number(q.max));
    });
    if (!(travelSpan.max > travelSpan.min)) travelSpan = { min: 0, max: 100 };
  }
  if (drawn) {
    for (var draw = playQuestions.length - 1; draw > 0; draw--) {
      var pick = Math.floor(Math.random() * (draw + 1));
      var swap = playQuestions[draw];
      playQuestions[draw] = playQuestions[pick]; playQuestions[pick] = swap;
    }
  }
  playQuestions.forEach(function (q, i) {
    var s = makeSlide('quiz');
    s.id = game.id + ':' + q.id;      // stable across runs, unique per game
    fillQuestionSlide(q, game.style, st, s);
    s.format = game.format || '';
    s.notes = q.notes || '';
    s.transition = 'fade';
    s.gameId = game.id;
    s.gameTitle = game.title;
    s.questionNumber = i + 1;
    if (drawn) { s.drawNo = i + 1; s.drawTotal = playQuestions.length; }
    /* Question Cube runs on Random Challenge's engine, whose verdicts are a
       challenge's — Complete or Skip. A rolled question is answered. */
    if (game.format === 'question-cube' && game.style === 'randomchallenge') {
      s.options = ['Answered', 'Pass'];
      s.answer = 'Answered';
      s.headPrompt = 'Question cube';
    }
    /* True/False Showdown — "hold or fold". The room votes; the teacher (or
       half the clock) shows the room its split; each phone may switch once;
       the reveal shows before against after. The plain True or False format
       stays a plain two-option question. */
    /* Predict the Outcome — commit, then watch. Predictions are locked and
       the room's split shown before the outcome; the teacher then shows
       what happens, and only then the answer. How sure you were counts. */
    if (game.format === 'predict-outcome' && s.input === 'choice') {
      s.predict = true;
      s.holdResults = true;
      s.confidence = true;
    }
    if (game.style === 'truefalse' && game.format === 'true-false') {
      s.showdown = true;
      s.holdResults = true;
    }
    if (game.style === 'spinexplain') { s.spinDraw = i + 1; s.spinTotal = playQuestions.length; s.headPrompt = 'Spin & explain'; }
    /* Time Traveler: each round's line carries the events already placed,
       so the timeline grows across the game — the travel. */
    if (game.format === 'time-traveler' && s.input === 'number') {
      /* One line for the whole game, wide enough for every event on it. */
      s.min = travelSpan.min;
      s.max = travelSpan.max;
      s.timeline = playQuestions.slice(0, i).map(function (prev) {
        return {
          label: String(prev.question || '').replace(/^Place it in time:\s*/i, '').slice(0, 60),
          year: Number(prev.target)
        };
      }).filter(function (e) { return Number.isFinite(e.year) && e.year >= Number(s.min) && e.year <= Number(s.max); });
    }
    /* Heads Up is a round, not a run of timed terms: one clock for the
       whole pile, set by the game's time. A term has no clock of its own. */
    if (game.style === 'headsup') {
      s.roundSeconds = Number(st.defaultTime) > 0 ? Math.min(600, Number(st.defaultTime)) : 60;
      s.timeLimit = 0;
    }
    /* Beat the Clock is a round too: the game's time is the round's, and
       no question has a countdown of its own. See games/speed.js. */
    if (game.style === 'speed') {
      s.roundSeconds = Number(st.defaultTime) > 0 ? Math.max(30, Math.min(600, Number(st.defaultTime))) : 90;
      s.timeLimit = 0;
      s.paceSeconds = SPEED_PACE;
    }
    out.push(s);

    /* A dedicated slide only when asked for. On 'inline' the reasoning
       expands inside the answer box instead, which keeps the question and
       the other options on screen while it is read. */
    if (String(q.explanation || '').trim() &&
        (st.explainStyle === 'slide' || st.explainStyle === 'both')) {
      var why = makeSlide('explain');
      why.id = game.id + ':' + q.id + ':why';
      why.question = q.question;
      why.body = q.explanation;
      why.subtitle = q.source || '';
      why.options = s.options;
      why.correct = s.correct;
      /* A typed question has no option to point at, so the answer travels
         as text — otherwise this slide showed an empty box and a "?". */
      why.input = s.input;
      why.answer = s.answer || '';
      why.questionNumber = i + 1;
      why.gameId = game.id;
      why.gameTitle = game.title;
      why.transition = 'fade';
      why.notes = 'Explanation for Q' + (i + 1) + '.';
      out.push(why);
    }
  });

  if (opts.scoreSlide !== false && st.scoreSlide) {
    var res = makeSlide('results');
    res.id = game.id + ':scores';
    res.title = game.title + ' — scores';
    res.gameId = game.id;
    out.push(res);
  }
  return out;
}

/**
 * Expand every game embed in a deck into the game's compiled slides, so the
 * player only ever sees plain slides. Returns a throwaway deck; the stored
 * one is untouched.
 */
/* The number the room sees on a slide: its place among the slides the show
   plays, with each game counted as every step it expands into, and the total
   the show will reach. render.js already chose the room's count over the
   editor's rows for hidden slides — "the room's count is the true one" — but
   counted a game as one slide, so from the first game on, the canvas footer
   in the editor said 79 / 98 where the wall said 90 / 110 for the same slide.
   A run deck has no game slides left, so there this is the plain count.
   Step counts are cached per game version: the rail renders every row. */
var gameStepCache = new Map();
/**
 * @param {Deck} deck
 * @param {Slide} slide
 * @param {(id: string) => Game | null} [lookupGame]
 * @returns {{ place: number, total: number }|null}  place is 1-based; null if the slide is not shown
 */
function showNumber(deck, slide, lookupGame) {
  var place = 0, total = 0, games = 0;
  (deck.slides || []).forEach(function (s) {
    if (s.hidden === true) return;
    var steps = 1;
    if (s.type === 'game') {
      var game = lookupGame ? lookupGame(s.gameId) : null;
      if (game) {
        var key = game.id + ':' + (game.modified || 0) + ':' + (deck.theme || '');
        if (!gameStepCache.has(key)) {
          if (gameStepCache.size > 200) gameStepCache.clear();
          gameStepCache.set(key, compileGame(game, { theme: deck.theme }).length);
        }
        steps = gameStepCache.get(key);
        games++;
      }
    }
    if (s === slide) place = total + 1;
    total += steps;
  });
  if (deck.finalScores && games) total += 1;
  return place ? { place: place, total: total } : null;
}

/* Where authored slide i lands in a run deck. Asked of the run deck itself,
   by id, rather than re-counted from the authored list: a count has to repeat
   every rule buildRunDeck applies, and it did not — hidden slides were counted
   here and dropped there, so a hidden slide above the selection started the
   show one slide late, and a hidden game started it a whole game late.
   A hidden selection starts at the next slide the room would see, and failing
   that the last one before it. */
/**
 * @param {Deck} deck
 * @param {RunDeck} run
 * @param {number} i
 * @returns {number}
 */
function runIndexOf(deck, run, i) {
  function at(k) {
    var s = deck.slides[k];
    if (!s || s.hidden === true) return -1;
    for (var r = 0; r < run.slides.length; r++) {
      var rs = run.slides[r];
      if (rs.id === s.id || rs.sourceSlideId === s.id) return r;
    }
    return -1;
  }
  for (var k = i; k < deck.slides.length; k++) { var f = at(k); if (f >= 0) return f; }
  for (var b = i - 1; b >= 0; b--) { var p = at(b); if (p >= 0) return p; }
  return 0;
}

/**
 * @param {Deck} deck
 * @param {(id: string) => Game | null} lookupGame
 * @returns {RunDeck}
 */
/**
 * A copy of a lesson for one learner practising alone (a share link's
 * Practice mode, E8). Games that can be played solo travel inside it, whole;
 * a game that needs a room — spoken, a board, a discussion, or one answered
 * on phones — is replaced by a card that says so, rather than a slide that
 * silently does nothing.
 *
 * @param {Deck} deck
 * @param {function(string): (Game|null)} lookupGame
 */
function practiceDoc(deck, lookupGame) {
  var copy = JSON.parse(JSON.stringify(deck));
  var games = {};
  var skipped = [];
  copy.slides = copy.slides.map(function (s) {
    if (s.type !== 'game') return s;
    var game = lookupGame(s.gameId);
    var style = game ? GAME_STYLES[game.style] : null;
    var solo = style && style.plays && style.plays.solo;
    if (game && solo && solo.status === 'yes') {
      games[s.gameId] = game;
      return s;
    }
    var title = (game && game.title) || s.gameTitle || 'A game';
    skipped.push(title);
    var note = makeSlide('section');
    note.title = title;
    note.subtitle = 'Played together in class — this one needs a room.';
    return note;
  });
  copy.practice = { games: games, skipped: skipped };
  return copy;
}

function buildRunDeck(deck, lookupGame) {
  /* A RunDeck is a Deck plus what the room needs to play it — the games that
     were expanded, the mechanic, the music. Built by widening a copy, so the
     stored deck keeps none of it. */
  const run = /** @type {RunDeck} */ (Object.assign({}, deck));
  run.slides = [];
  run.missingGames = [];
  run.games = [];

  deck.slides.forEach(function (s) {
    /* A hidden slide is kept in the deck and left out of the show. This is
       the one place that decides what the room sees, so present, presenter,
       rehearsal and the live wall all agree without being told separately —
       and a slide cannot be hidden on the wall while still counting on a
       phone. */
    if (s.hidden === true) return;
    if (s.type !== 'game') { run.slides.push(s); return; }
    var game = lookupGame(s.gameId);
    if (!game) {
      run.missingGames.push(s.gameTitle || s.gameId);
      var gone = makeSlide('section');
      gone.id = s.id;
      gone.title = 'Game not found';
      gone.subtitle = s.gameTitle ? '"' + s.gameTitle + '" has been deleted' : '';
      run.slides.push(gone);
      return;
    }
    /* The same game embedded a second time — Cmd+D on its slide, or picked
       again from the catalogue — compiled to the same slide ids as the first,
       and answers, reveals and live results are all keyed by slide id: the
       second round arrived already answered and already revealed. The first
       appearance keeps its ids, which are stable across runs; each later one
       is qualified by the slide that embeds it. */
    var gameId = game.id;
    var again = run.games.some(function (g) { return g.id === gameId; });
    run.games.push(game);
    compileGame(game, { theme: deck.theme }).forEach(function (cs) {
      if (again) cs.id = cs.id + '@' + s.id;
      cs.sourceSlideId = s.id;
      cs.bloom = cs.bloom || s.bloom || '';
      run.slides.push(cs);
    });
  });

  /* One board at the end, covering every game in the lesson. Each game's own
     board still lands where that game finishes; this is the one the room is
     looking at when the lesson stops. */
  if (deck.finalScores && run.games.length) {
    var closing = makeSlide('results');
    closing.id = deck.id + ':final-scores';
    closing.title = 'Final scores';
    closing.subtitle = run.games.length === 1
      ? run.games[0].title
      : run.games.length + ' games this lesson';
    closing.transition = 'zoom';
    closing.notes = 'Everything scored in this lesson, added up.';
    run.slides.push(closing);
  }

  /* Teams and the scoreboard belong to the room, not to a question, so the
     live session takes its settings from the first embedded game. A deck with
     several games shares one set of teams — which is what you want when the
     same room plays all of them. */
  run.feedbackSlides = run.slides.filter(slideFeedback).length;

  var lead = run.games[0];
  run.mechanic = lead ? gameStyle(lead.style).mechanic : 'points';
  run.trackLength = lead ? lead.settings.trackLength : 5;
  /* Same rule as the teams above: the music belongs to the room, so a deck
     with several games plays the first one's bed throughout rather than
     switching track between rounds. */
  run.music = lead ? lead.settings.music : '';
  run.musicVolume = lead ? lead.settings.musicVolume : 55;
  run.quiz = normalizeQuizConfig(lead ? {
    mode: lead.settings.mode,
    teams: lead.settings.teams,
    scoreboard: lead.settings.scoreboard
  } : { mode: 'individual', scoreboard: true });

  if (!run.slides.length) run.slides = [makeSlide('title')];
  return run;
}

/* ====================================================================
   Readiness — what will go wrong in the room, found before the room
   ==================================================================== */

/** Media that is a reference to something outside the deck. */
function externalMedia(url) {
  var u = String(url || '').trim();
  if (!u || /^data:/i.test(u)) return null;
  if (/^https?:\/\//i.test(u)) return 'internet';
  return 'file';                       // a path beside the app
}

/**
 * Everything about a deck that would show up as a problem mid-lesson.
 *
 * Pure, and separate from the UI that shows it, because the interesting
 * cases are combinatorial — an embedded game that was deleted, a clip
 * referenced by a path, a question with no correct answer — and a check
 * nobody can test is a check nobody should trust.
 *
 * Two levels only. `stop` is something that will visibly fail in front of a
 * class; `check` is something that depends on the room. A third level would
 * just be a place to hide things.
 *
 * @param {object} deck
 * @param {function} lookupGame  id -> game | null
 * @returns {{stop:number, check:number, items:Array}}
 */
function readiness(deck, lookupGame) {
  var items = [];
  var slides = (deck && deck.slides) || [];
  var seenExternal = {};

  function add(level, index, title, detail) {
    items.push({ level: level, slide: index, title: title, detail: detail });
  }

  function media(index, label, url, what) {
    var kind = externalMedia(url);
    if (!kind) return;
    var key = kind + '|' + url;
    if (seenExternal[key]) return;      // one deck, one warning per file
    seenExternal[key] = 1;
    add('check', index, label,
      kind === 'internet'
        ? what + ' is loaded from the internet, so it will not play offline.'
        : what + ' is a file beside the app, not inside the deck. Move the deck ' +
          'without it and nothing plays.');
  }

  slides.forEach(function (s, i) {
    var label = 'Slide ' + (i + 1);

    if (s.type === 'game') {
      var g = s.gameId && lookupGame ? lookupGame(s.gameId) : null;
      if (!g) {
        add('stop', i, label, s.gameId
          ? 'The game on this slide has been deleted, so the slide is skipped.'
          : 'No game chosen, so the slide is skipped.');
        return;
      }
      if (!g.questions.length) {
        add('stop', i, label, '"' + g.title + '" has no questions.');
      }
      g.questions.forEach(function (q, n) {
        var bad = gameStyle(q.style || g.style).problems(q, n + 1);
        if (bad) add('stop', i, label, '"' + g.title + '" — ' + bad + '.');
        media(i, label, q.image, 'A question image');
      });
      /* Some faults belong to the whole game rather than one question — a
         bingo card dealt from too small a pool is the only one so far. */
      var boardCheck = gameStyle(g.style).board;
      var boardBad = boardCheck ? boardCheck(g) : null;
      if (boardBad) add('stop', i, label, '"' + g.title + '" — ' + boardBad + '.');
      media(i, label, g.settings.music, 'The music bed');
      return;
    }

    if (s.type === 'video') {
      if (!String(s.video || '').trim()) {
        add('stop', i, label, 'A video slide with no video on it.');
      } else {
        media(i, label, s.video, 'This clip');
        media(i, label, s.videoPoster, 'The poster image');
      }
      return;
    }

    if (s.type === 'beforeafter') {
      var comparison = normalizeExploration(s.exploration);
      if (!comparison.before || !comparison.after) add('stop', i, label, 'Choose both a before image and an after image.');
      media(i, label, comparison.before, 'The before image');
      media(i, label, comparison.after, 'The after image');
      return;
    }

    if (s.type === 'image' || s.type === 'split' || s.type === 'explore') {
      if (!String(s.image || '').trim()) {
        add('stop', i, label, 'An image slide with no image on it.');
      } else {
        media(i, label, s.image, 'This image');
        /* Not decoration: on a diagram it is the only description a screen
           reader has, and slides 4-6 of a mechanism are all diagram. */
        if (!String(s.imageAlt || '').trim()) {
          add('check', i, label, 'The image has no description for anyone who cannot see it.');
        }
      }
      if (s.type === 'image') return;
    }

    if (s.type === 'table' && !parseTable(s.body).length) {
      add('stop', i, label, 'A table slide with no rows.');
      return;
    }

    /* Nothing on it at all. Checked last, because the type-specific rules
       above say something more useful about the same slide. */
    var words = [s.title, s.subtitle, s.body, s.question].concat(s.bullets || [])
      .join(' ').replace(/\t/g, ' ').trim();
    if (!words && !String(s.image || '').trim() && !String(s.video || '').trim()) {
      add('check', i, label, 'This slide is empty.');
    }
  });

  if (!slides.length) add('stop', null, 'The deck', 'There are no slides.');

  var stop = items.filter(function (f) { return f.level === 'stop'; }).length;
  return { stop: stop, check: items.length - stop, items: items };
}

/** A standalone game, dressed as a deck so the player can run it unchanged. */
/** @param {Game} game @returns {RunDeck} */
function gameToRunDeck(game) {
  return {
    id: game.id,
    title: game.title,
    theme: game.theme,
    showSlideNumbers: false,
    quiz: normalizeQuizConfig({
      mode: game.settings.mode,
      teams: game.settings.teams,
      scoreboard: game.settings.scoreboard
    }),
    games: [game],
    missingGames: [],
    mechanic: gameStyle(game.style).mechanic,
    trackLength: game.settings.trackLength,
    music: game.settings.music,
    musicVolume: game.settings.musicVolume,
    slides: compileGame(game)
  };
}

/**
 * Older decks authored quiz and score slides directly. Pull them out into a
 * game so there is exactly one place questions live, and leave a game embed
 * where the first quiz slide was.
 */
function migrateDeckQuizzes(deck, saveGame) {
  var quizzes = deck.slides.filter(function (s) { return s.type === 'quiz'; });
  if (!quizzes.length) {
    // a deck with only a stray score slide: drop it, nothing to score
    deck.slides = deck.slides.filter(function (s) { return s.type !== 'results'; });
    if (!deck.slides.length) deck.slides = [makeSlide('title')];
    return null;
  }

  var game = makeGame(deck.title + ' — quiz');
  game.theme = deck.theme;
  game.settings = normalizeGameSettings({
    mode: deck.quiz ? deck.quiz.mode : 'individual',
    teams: deck.quiz ? deck.quiz.teams : null,
    scoreboard: deck.quiz ? deck.quiz.scoreboard : true,
    defaultTime: quizzes[0].timeLimit || 20,
    defaultPoints: quizzes[0].points || 1000,
    intro: false,
    scoreSlide: deck.slides.some(function (s) { return s.type === 'results'; })
  });
  game.questions = quizzes.map(function (s) {
    return normalizeQuestion({
      question: s.question,
      options: s.options,
      correct: s.correct,
      timeLimit: s.timeLimit,
      points: s.points,
      notes: s.notes
    });
  });
  saveGame(game);

  var at = deck.slides.findIndex(function (s) { return s.type === 'quiz'; });
  var embed = makeSlide('game');
  embed.gameId = game.id;
  embed.gameTitle = game.title;
  embed.title = game.title;

  deck.slides = deck.slides.filter(function (s) {
    return s.type !== 'quiz' && s.type !== 'results';
  });
  deck.slides.splice(Math.min(at, deck.slides.length), 0, embed);
  if (!deck.slides.length) deck.slides = [embed];
  return game;
}

/* ======================================================================
   Audience feedback

   Attached to an ordinary content slide rather than being a slide of its
   own: the slide keeps its title, bullets or image, and the responses
   collect in the side rail while it is on screen. Unscored — a game is for
   scoring, this is for hearing the room.
   ====================================================================== */

/** One-way practice pack for Canvas / Colab. Live interaction is omitted on purpose. */
function deckToMarkdown(deck) {
  return renderMarkdown(normalizeDeck(deck || {}), id => GameStore.get(id));
}

/**
 * Starter deck from a Markdown outline. Supports title / section / content /
 * cards / quote / image / keywords / links — not games or live activities.
 * @param {string} text
 */
function markdownToDeck(text) {
  var parsed = parseMarkdownDeck(text);
  var deck = makeDeck(parsed.title || 'Imported from Markdown');
  deck.slides = (parsed.slides.length ? parsed.slides : [{ type: 'title', title: deck.title }])
    .map(function (s) { return normalizeSlide(s); });
  if (!deck.slides.length) deck.slides = [makeSlide('title')];
  return normalizeDeck(deck);
}

const { Store, GameStore, LibraryFolders } = createStores({ normalizeDeck, normalizeGame, storage: () => localStorage });

/* One statement rather than "create, then fill": the namespace is not a
   valid SF until Boards is on it, and splitting the two left a gap where it
   was neither. */
runtime.SF = Object.assign(runtime.SF || {}, {
  MotionLab,
  Boards: createBoardRuntime(() => runtime.SF, GAME_STYLES),
  /* The activity catalogue. Data only — studio.js reads target and builds. */
  Activities: { PHASES, ACTIVITIES, activity, activitiesInPhase, phaseCounts, totalMinutes },
  SLIDE_W: SLIDE_W,
  SLIDE_H: SLIDE_H,
  ASPECTS: ASPECTS,
  CHART_TAXONOMY: CHART_TAXONOMY,
  chartCategories: chartCategories,
  chartPrimaryCategory: chartPrimaryCategory,
  slideHeight: slideHeight,
  THEMES: THEMES,
  DEFAULT_THEME, resolveTheme,
  createActivityFields, createCompositionRenderer, createChartRenderer, createWordRenderer, createLiveRenderer, createQuizRenderer, installArtRenderer, installLatticeRenderer, createPresenterWindow, createDeckSettings, createContentFields, installArrange, createPanes, createRail, installHeaderFooterUI, installArtwork, installCustom, installExplore, installExperiments, bindCanvasRegions, declareBodyRegion, measureBodyRegion,
  hasLayoutTemplate, layoutRegionsFor, insertionRegionFor, LAYOUT_SLOT_TEMPLATES,
  measureSlideFit, probeLayoutFit, svgScale, FIT_TOLERANCE, LEGIBLE_FLOOR,
  CHROME_SLOTS, chromePositions, setChromeSlot, supportsChromeRegions, applyChromeRegions,
  DESIGN_CONTROLS, designApplies,
  COMPOSITIONS: COMPOSITIONS,
  compositionOptions: compositionOptions,
  slideComposition: slideComposition, themeGround,
  TRANSITIONS: TRANSITIONS,
  TEAM_COLORS: TEAM_COLORS,
  MAX_TEAMS: MAX_TEAMS,
  teamColor: teamColor,
  makeQuizConfig: makeQuizConfig,
  normalizeQuizConfig: normalizeQuizConfig,
  SLIDE_TYPES: SLIDE_TYPES,
  chartData: chartData,
  chartUsesSeriesLegend: chartUsesSeriesLegend,
  chartPoints: chartPoints,
  chartFlows: chartFlows,
  parsePerson: parsePerson,
  orgTree: orgTree,
  chartGroups: chartGroups,
  fiveNumber: fiveNumber,
  chartValues: chartValues,
  histogramBins: histogramBins,
  normalizeExploration: normalizeExploration,
  explorationValue: explorationValue,
  explorationCurve: explorationCurve,
  GALLERY_MAX: GALLERY_MAX,
  uid: uid,
  makeSlide: makeSlide,
  /* A lab lesson's games as SlideForge plays them live (src/deck/labshow.js). */
  labShowSlides: function (/** @type {any[]} */ stills) { return labShowOf(stills, makeSlide); },
  makeDeck: makeDeck,
  starterDeck: starterDeck,
  normalizeDeck: normalizeDeck,
  deckShowsLogo: deckShowsLogo,
  normalizeSlide: normalizeSlide,
  TABLE_MAX_ROWS: TABLE_MAX_ROWS,
  TABLE_MAX_COLS: TABLE_MAX_COLS,
  prepareLayout: prepareLayout,
  pasteTarget: pasteTarget,
  imagePlacement: imagePlacement,
  setImagePlacement: setImagePlacement,
  swapImagePlacement: swapImagePlacement,
  slideSteps: slideSteps,
  slideExcerpt: slideExcerpt,
  correctAnswerLabel: correctAnswerLabel,
  questionTimeLimit: questionTimeLimit,
  parseTable: parseTable,
  readiness: readiness,
  safeMedia: safeMedia,
  cssUrl: cssUrl,
  parseKeywordLine: parseKeywordLine,
  formatKeywordLine: formatKeywordLine,
  /* An activity slide's rows as stages: name, seconds, prompt, phone job. */
  activityStages: function (slide) { return activityStages(slide, parseKeywordLine); },
  /* Its leading untimed row, which stays up through every stage, or null. */
  activityBrief: function (slide) { return activityBrief(slide, parseKeywordLine); },
  stageCopy: stageCopy,
  /* "At home · 3 min [send]" as it is shown: the job is for the phones. */
  stripDeclaredJob: stripDeclaredJob,
  STAGE_JOBS: STAGE_JOBS,
  stageJob: stageJob,
  parseStageLabel: parseStageLabel,
  safeHref: safeHref,
  deckToMarkdown: deckToMarkdown,
  markdownToDeck: markdownToDeck,
  parseMarkdownDeck: parseMarkdownDeck,
  DECK_TYPES: DECK_TYPES,
  BULLET_LAYOUTS: BULLET_LAYOUTS,
  LAYOUT_GROUPS: LAYOUT_GROUPS,
  INFO_LAYOUTS: INFO_LAYOUTS,
  parseInfoLine: parseInfoLine,
  formatInfoLine: formatInfoLine,
  infoNumber: infoNumber,
  FEEDBACK_KINDS: FEEDBACK_KINDS,
  SCALE_POINTS: SCALE_POINTS,
  scaleLabels: scaleLabels,
  makeFeedback: makeFeedback,
  normalizeFeedback: normalizeFeedback,
  slideFeedback: slideFeedback,
  sampleFeedbackDigest: sampleFeedbackDigest,
  // games
  makeGame: makeGame,
  makeQuestion: makeQuestion,
  GAME_STYLES: GAME_STYLES,
  gameStyle: gameStyle,
  markResponse: markResponse,
  answerLabel: answerLabel,
  markTyped: markTyped,
  normalizeAnswer: normalizeAnswer,
  formatValue: formatValue,
  starterGame: starterGame,
  normalizeGame: normalizeGame,
  normalizeQuestion: normalizeQuestion,
  FORMATS: FORMATS,
  FORMAT_STYLE: FORMAT_STYLE,
  CORE_STYLES: CORE_STYLES,
  SPECIAL_STYLES: SPECIAL_STYLES,
  isSpecialStyle: isSpecialStyle,
  gameFormat: gameFormat,
  formatStyle: formatStyle,
  orderScore: orderScore,
  orderPoints: orderPoints,
  wordRevealPoints: wordRevealPoints,
  wordRevealPreFraction: wordRevealPreFraction,
  wordRevealMask: wordRevealMask,
  emojiHelp: emojiHelp,
  emojiCluePieces: emojiCluePieces,
  emojiClueLayout: emojiClueLayout,
  clampDefinitionSeconds: clampDefinitionSeconds,
  clampChainSeconds: clampChainSeconds,
  splitDefinitionPassage: splitDefinitionPassage,
  definitionCreate: definitionCreate,
  definitionTransition: definitionTransition,
  DEFINITION_TIMES: DEFINITION_TIMES,
  CHAIN_TIMES: CHAIN_TIMES,
  EMOJI_LEVELS: EMOJI_LEVELS,
  wordRevealLetterCount: wordRevealLetterCount,
  wordRevealShownAt: wordRevealShownAt,
  wordRevealGains: wordRevealGains,
  spinExplainPoints: spinExplainPoints,
  claimPoints: claimPoints,
  bingoHasLine: bingoHasLine,
  bowlGrid: bowlGrid,
  BOWL_TARGETS: BOWL_TARGETS,
  bossDamage: bossDamage,
  bossMaxHp: bossMaxHp,
  speedPoints: speedPoints,
  roundSpeedPoints: roundSpeedPoints,
  SPEED_PACE: SPEED_PACE,
  BOSS_LEVELS: BOSS_LEVELS,
  WR_LEVELS: WR_LEVELS,
  BOWL_VALUES: BOWL_VALUES,
  compileGame: compileGame,
  GAME_FORMAT_PRESETS: GAME_FORMAT_PRESETS,
  getShowcaseGame: getShowcaseGame,
  INPUTS: INPUTS,
  QUESTION_SLIDE_FIELDS: QUESTION_SLIDE_FIELDS,
  fillQuestionSlide: fillQuestionSlide,
  buildRunDeck: buildRunDeck,
  runIndexOf: runIndexOf,
  spotWords: spotWords,
  spotSpan: spotSpan,
  SPOT_MAX_WORDS: SPOT_MAX_WORDS,
  fillParts: fillParts,
  practiceDoc: practiceDoc,
  sortStatements: sortStatements,
  sortScore: sortScore,
  fillScore: fillScore,
  FILL_MAX_GAPS: FILL_MAX_GAPS,
  showNumber: showNumber,
  gameToRunDeck: gameToRunDeck,
  migrateDeckQuizzes: migrateDeckQuizzes,
  Store: Store,
  GameStore: GameStore,
  unusedDraft: unusedDraft,
  libraryGroupFromTheme: libraryGroupFromTheme,
  normalizeLibraryGroup: normalizeLibraryGroup,
  LIBRARY_GROUPS: LIBRARY_GROUPS,
  LibraryFolders: LibraryFolders
});

/* The six board runtimes. They are the engine's own, so the model installs
   them rather than each page doing it: SF.Boards resolves them lazily by name
   and every page that draws a board already loads this bundle. Nothing in them
   runs but declarations and one SF assignment each. */
for (const install of [installBingo, installBowl, installMemory, installLowStakes, installBoss, installRace]) {
  install(runtime.SF);
}

export { DEFAULT_THEME, resolveTheme, DESIGN_CONTROLS, designApplies, COMPOSITIONS, compositionOptions, slideComposition, SLIDE_W, SLIDE_H, ASPECTS, parsePerson, orgTree, CHART_TAXONOMY, chartCategories, chartPrimaryCategory, slideHeight, chartUsesSeriesLegend, chartFlows, chartPoints, chartGroups, fiveNumber, chartValues, histogramBins, THEMES, themeGround, TRANSITIONS, GALLERY_MAX, LAYOUT_GROUPS, INFO_LAYOUTS, parseInfoLine, formatInfoLine, infoNumber, chartData, TEAM_COLORS, MAX_TEAMS, teamColor, makeQuizConfig, normalizeQuizConfig, SLIDE_TYPES, DECK_TYPES, TABLE_MAX_COLS, TABLE_MAX_ROWS, parseTable, parseKeywordLine, formatKeywordLine, safeHref, safeMedia, BULLET_LAYOUTS, prepareLayout, pasteTarget, imagePlacement, setImagePlacement, swapImagePlacement, slideSteps, slideExcerpt, questionTimeLimit, correctAnswerLabel, makeSlide, makeDeck, starterDeck, normalizeSlide, normalizeDeck, deckShowsLogo, normalizeQuestion, normalizeGameSettings, normalizeGame, fillQuestionSlide, QUESTION_SLIDE_FIELDS, compileGame, buildRunDeck, runIndexOf, showNumber, externalMedia, readiness, gameToRunDeck, migrateDeckQuizzes, FEEDBACK_KINDS, SCALE_POINTS, scaleLabels, makeFeedback, normalizeFeedback, slideFeedback, sampleFeedbackDigest, deckToMarkdown, Store, GameStore, unusedDraft, libraryGroupFromTheme, normalizeLibraryGroup, LIBRARY_GROUPS, LibraryFolders, GAME_FORMAT_PRESETS, getShowcaseGame };
