import { normalizeExploration, explorationValue } from './deck/exploration.js';
import { createBoardRuntime } from "./boards/runtime.js";
import { PHASES, ACTIVITIES, activity, activitiesInPhase, phaseCounts, totalMinutes } from "./activities/catalogue.js";
import { DECK_TYPES, TABLE_MAX_COLS, TABLE_MAX_ROWS, parseTable, chartData, parseKeywordLine, formatKeywordLine, safeHref, safeMedia, BULLET_LAYOUTS, prepareLayout, imagePlacement, setImagePlacement, swapImagePlacement, slideSteps, slideExcerpt, questionTimeLimit, correctAnswerLabel } from "./deck/content.js";
import { FEEDBACK_KINDS, SCALE_POINTS, scaleLabels, makeFeedback, normalizeFeedback, slideFeedback, sampleFeedbackDigest } from "./deck/feedback.js";
import { renderMarkdown } from "./deck/markdown.js";
import sampleDeck from "./samples/deck.json" with { type: "json" };
/* SlideForge — model. Edit source here; npm run build updates js/model.js. */
import { uid } from "./core/identity.js";
import { makeQuestion, makeGame, starterGame } from "./games/factories.js";
import { gameStyle, GAME_STYLES, markResponse, answerLabel } from "./games/registry.js";
import { formatStyle, isSpecialStyle, FORMATS, INPUTS, FORMAT_STYLE, CORE_STYLES, SPECIAL_STYLES, gameFormat } from "./games/catalogue.js";
import { clampDefinitionSeconds, splitDefinitionPassage, definitionCreate, definitionTransition, DEFINITION_TIMES } from "./games/definition.js";
import { clampChainSeconds, CHAIN_TIMES } from "./games/conceptchain.js";
import { BOSS_LEVELS, bossDamage, bossMaxHp } from "./games/boss.js";
import { bowlGrid, BOWL_TARGETS, BOWL_VALUES } from "./games/bowl.js";
import { clampLowstakesSeconds } from "./games/lowstakes.js";
import { createStores } from "./storage.js";
import { markTyped, normalizeAnswer, formatValue } from "./games/marking.js";
import { orderScore, orderPoints } from "./games/order.js";
import { wordRevealPoints, wordRevealPreFraction, wordRevealMask, wordRevealLetterCount, WR_LEVELS } from "./games/wordreveal.js";
import { emojiHelp, emojiCluePieces, emojiClueLayout, EMOJI_LEVELS } from "./games/emoji.js";
import { spinExplainPoints } from "./games/spinexplain.js";
import { claimPoints } from "./games/scoring.js";
import { bingoHasLine } from "./games/bingo.js";
import { speedPoints } from "./games/speed.js";
import { GAME_FORMAT_PRESETS, getShowcaseGame } from "./games/presets.js";

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

var THEMES = {
  studio: { name: 'Studio · Sage & ink', swatch: '#dce8cc' },
  northeastern: { name: 'Northeastern London', swatch: '#c8102e' },
  midnight: { name: 'Midnight', swatch: '#1b2a4a' },
  paper:    { name: 'Paper',    swatch: '#f4f1ea' },
  ocean:    { name: 'Ocean',    swatch: '#0d5c63' },
  ember:    { name: 'Ember',    swatch: '#3d1b2a' },
  mono:     { name: 'Mono',     swatch: '#111111' }
};

var TRANSITIONS = ['none', 'fade', 'push', 'zoom', 'wipe'];

/* A stack is narrated layer by layer; past about eight the slide has stopped
   being a stack and become a folder. */
var GALLERY_MAX = 8;

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
var SLIDE_TYPES = {
  title:    { label: 'Title',        icon: 'T' },
  section:  { label: 'Section',      icon: 'S' },
  content:  { label: 'Bullets',      icon: '•' },
  keywords: { label: 'Keywords',     icon: 'K' },
  italics:  { label: 'Phrase + explanation',      icon: 'I' },
  links:    { label: 'Links',        icon: '↗' },
  split:    { label: 'Image + text',         icon: '◫' },
  cards:    { label: 'Cards',        icon: '▦' },
  table:    { label: 'Table',        icon: '⊞' },
  beforeafter: { label: 'Before / after', icon: '◐' },
  explore: { label: 'Explore an image', icon: '◎' },
  simulation: { label: 'What if? graph', icon: '↗' },
  chart:    { label: 'Chart',        icon: '▥' },
  image:    { label: 'Image',        icon: '▣' },
  gallery:  { label: 'Image stack',   icon: '▤' },
  video:    { label: 'Video',        icon: '▶' },
  quote:    { label: 'Quote',        icon: '“' },
  game:     { label: 'Game',         icon: '◈' },
  quiz:     { label: 'Quiz',         icon: '?' },
  explain:  { label: 'Explanation',  icon: '💡' },
  results:  { label: 'Score',        icon: '⚑' },
  join:     { label: 'Join QR & PIN', icon: '⌗' }
};

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
    videoLoop: false,
    videoMuted: false,
    videoAutoplay: false,   // honoured on the projector, never in a preview
    tableHeader: true,
    /* Chart layout: bar, line or pie over the same text a table slide uses. */
    exploration: normalizeExploration(null),
    chartKind: /** @type {'bar'|'line'|'pie'} */ ('bar'),
    /* Image stack: each layer is one picture with its own caption and source,
       shown one in front of the last. Empty on every other kind of slide. */
    layers: /** @type {import('./types.js').GalleryLayer[]} */ ([]),
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

  switch (s.type) {
    case 'title':
      s.title = 'Presentation title';
      s.subtitle = 'Your name · ' + new Date().toLocaleDateString();
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
    case 'quote':
      s.body = 'A quotation that makes the point better than a bullet list would.';
      s.subtitle = 'Attribution';
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
    theme: 'studio',
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
  s.gameId = String(s.gameId || '');
  s.gameTitle = String(s.gameTitle || '');
  s.imageSide = s.imageSide === 'left' ? 'left' : 'right';
  s.video = safeMedia(s.video);
  s.videoPoster = safeMedia(s.videoPoster);
  s.videoStart = Math.max(0, Number(s.videoStart) || 0);
  s.videoLoop = s.videoLoop === true;
  s.videoMuted = s.videoMuted === true;
  s.videoAutoplay = s.videoAutoplay === true;
  s.tableHeader = s.tableHeader !== false;
  s.exploration = normalizeExploration(raw && raw.exploration);
  s.exploration.before = safeMedia(s.exploration.before);
  s.exploration.after = safeMedia(s.exploration.after);
  s.chartKind = ['bar', 'line', 'pie'].indexOf(s.chartKind) >= 0 ? s.chartKind : 'bar';
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
  /* How a build treats the points it has already been through. Kept separate
     from `progressive` so the gate stays a boolean: every existing deck says
     progressive:true and means 'hide', which is still the default here. */
  s.buildMode = s.buildMode === 'dim' ? 'dim' : 'hide';
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
  if (!THEMES[d.theme]) d.theme = 'studio';
  d.quiz = normalizeQuizConfig(raw.quiz);
  d.slides = (Array.isArray(raw.slides) ? raw.slides : []).map(normalizeSlide);
  if (!d.slides.length) d.slides = [makeSlide('title')];
  d.showSlideNumbers = d.showSlideNumbers !== false;
  d.finalScores = d.finalScores === true;
  d.logo = String(d.logo || '');
  d.logoSize = ['small','medium','large'].includes(raw.logoSize) ? raw.logoSize : 'medium';
  if (d.logoOn !== 'all' && d.logoOn !== 'title' && d.logoOn !== 'none') {
    d.logoOn = d.logo ? 'all' : 'none';
  }
  if (!d.logo) d.logoOn = 'none';
  return d;
}

/**
 * Whether this slide carries the deck's corner mark.
 *
 * @param {number} [index] position in the deck, when the caller knows it
 *
 * 'title' means the front of the deck, decided by position and not by
 * layout. Matching slide.type === 'title' looked equivalent and was not: a
 * deck that opens on a Section \u2014 which is how most of them open, and how
 * every lesson built from the example does \u2014 has no slide of that type at
 * all, so the option put the logo on none of them and said nothing about
 * why. Falls back to the layout test when there is no index to go on, so a
 * preview rendered on its own still shows the mark.
 */
function deckShowsLogo(deck, slide, index) {
  if (!deck || !String(deck.logo || '').trim()) return false;
  if (deck.logoOn === 'all') return true;
  if (deck.logoOn !== 'title') return false;
  if (typeof index === 'number') return index === 0;
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
  if (!THEMES[g.theme]) g.theme = 'midnight';
  g.settings = normalizeGameSettings(raw.settings);
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
        'term', 'prompt', 'definition'].forEach(function (k) {
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
  if (style.mechanic === 'boss' || q.difficulty) {
    s.difficulty = BOSS_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : 'medium';
    s.bossDamage = bossDamage(s.difficulty);
  }
  QUESTION_SLIDE_FIELDS.forEach(function (k) {
    if (q[k] != null && q[k] !== '') s[k] = q[k];
  });
  s.explainStyle = settings.explainStyle;
  s.confidence = settings.confidence !== false;
  /* Discuss contract — never reopen as a scored phone quiz. */
  if (styleKey === 'oddone') {
    s.points = 0;
    s.timeLimit = 0;
    s.voteOnly = true;
    s.confidence = false;
    s.hideAnswerUntilReveal = true;
    s.oddoneDiscuss = true;
  }
  if (styleKey === 'compare') {
    s.points = 0;
    s.timeLimit = 0;
    s.voteOnly = true;
    s.confidence = false;
    s.hideAnswerUntilReveal = true;
    s.compareDiscuss = true;
    s.itemA = String(q.itemA || '').trim();
    s.itemB = String(q.itemB || '').trim();
    s.similarities = String(q.similarities || '').trim();
    s.differences = String(q.differences || '').trim();
    s.category = String(q.category || '').trim();
    s.options = [];
    s.correct = -1;
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
  if (game.style === 'spinexplain') {
    /* Shuffle whole questions before compiling so explanations follow their
       concept. Authored order and IDs remain untouched. */
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
    if (game.style === 'spinexplain') { s.spinDraw = i + 1; s.spinTotal = playQuestions.length; s.headPrompt = 'Spin & explain'; }
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
/**
 * @param {Deck} deck
 * @param {(id: string) => Game | null} lookupGame
 * @returns {RunDeck}
 */
function buildRunDeck(deck, lookupGame) {
  /* A RunDeck is a Deck plus what the room needs to play it — the games that
     were expanded, the mechanic, the music. Built by widening a copy, so the
     stored deck keeps none of it. */
  const run = /** @type {RunDeck} */ (Object.assign({}, deck));
  run.slides = [];
  run.missingGames = [];
  run.games = [];

  deck.slides.forEach(function (s) {
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
    run.games.push(game);
    compileGame(game, { theme: deck.theme }).forEach(function (cs) {
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

const { Store, GameStore } = createStores({ normalizeDeck, normalizeGame, storage: () => localStorage });

/* One statement rather than "create, then fill": the namespace is not a
   valid SF until Boards is on it, and splitting the two left a gap where it
   was neither. */
runtime.SF = Object.assign(runtime.SF || {}, {
  Boards: createBoardRuntime(() => runtime.SF, GAME_STYLES),
  /* The activity catalogue. Data only — studio.js reads target and builds. */
  Activities: { PHASES, ACTIVITIES, activity, activitiesInPhase, phaseCounts, totalMinutes },
  SLIDE_W: SLIDE_W,
  SLIDE_H: SLIDE_H,
  THEMES: THEMES,
  TRANSITIONS: TRANSITIONS,
  TEAM_COLORS: TEAM_COLORS,
  MAX_TEAMS: MAX_TEAMS,
  teamColor: teamColor,
  makeQuizConfig: makeQuizConfig,
  normalizeQuizConfig: normalizeQuizConfig,
  SLIDE_TYPES: SLIDE_TYPES,
  chartData: chartData,
  normalizeExploration: normalizeExploration,
  explorationValue: explorationValue,
  GALLERY_MAX: GALLERY_MAX,
  uid: uid,
  makeSlide: makeSlide,
  makeDeck: makeDeck,
  starterDeck: starterDeck,
  normalizeDeck: normalizeDeck,
  deckShowsLogo: deckShowsLogo,
  normalizeSlide: normalizeSlide,
  prepareLayout: prepareLayout,
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
  parseKeywordLine: parseKeywordLine,
  formatKeywordLine: formatKeywordLine,
  safeHref: safeHref,
  deckToMarkdown: deckToMarkdown,
  DECK_TYPES: DECK_TYPES,
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
  spinExplainPoints: spinExplainPoints,
  claimPoints: claimPoints,
  bingoHasLine: bingoHasLine,
  bowlGrid: bowlGrid,
  BOWL_TARGETS: BOWL_TARGETS,
  bossDamage: bossDamage,
  bossMaxHp: bossMaxHp,
  speedPoints: speedPoints,
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
  gameToRunDeck: gameToRunDeck,
  migrateDeckQuizzes: migrateDeckQuizzes,
  Store: Store,
  GameStore: GameStore
});

export { SLIDE_W, SLIDE_H, THEMES, TRANSITIONS, GALLERY_MAX, chartData, TEAM_COLORS, MAX_TEAMS, teamColor, makeQuizConfig, normalizeQuizConfig, SLIDE_TYPES, DECK_TYPES, TABLE_MAX_COLS, TABLE_MAX_ROWS, parseTable, parseKeywordLine, formatKeywordLine, safeHref, safeMedia, BULLET_LAYOUTS, prepareLayout, imagePlacement, setImagePlacement, swapImagePlacement, slideSteps, slideExcerpt, questionTimeLimit, correctAnswerLabel, makeSlide, makeDeck, starterDeck, normalizeSlide, normalizeDeck, deckShowsLogo, normalizeQuestion, normalizeGameSettings, normalizeGame, fillQuestionSlide, QUESTION_SLIDE_FIELDS, compileGame, buildRunDeck, externalMedia, readiness, gameToRunDeck, migrateDeckQuizzes, FEEDBACK_KINDS, SCALE_POINTS, scaleLabels, makeFeedback, normalizeFeedback, slideFeedback, sampleFeedbackDigest, deckToMarkdown, Store, GameStore, GAME_FORMAT_PRESETS, getShowcaseGame };
