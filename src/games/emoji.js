/* SlideForge — games/emoji. Edit source here; npm run build updates js/model.js. */
import { markTyped } from "./marking.js";
import { type } from "./type.js";

/**
 * Split emoji/clue text into grapheme pieces for tiled display.
 * Shared by the wall stage and the learner phone companion.
 * @param {string} text
 * @returns {string[]}
 */
function emojiCluePieces(text) {
  var clueText = String(text || '');
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(clueText),
      function (part) { return part.segment; }).filter(function (part) { return part.trim(); });
  }
  return Array.from(clueText).filter(function (part) { return part.trim(); });
}

/**
 * Whether clues should tile, and the pieces to show.
 * @param {string} text
 * @returns {{ tiled: boolean, pieces: string[], text: string }}
 */
function emojiClueLayout(text) {
  var clueText = String(text || '');
  var pieces = emojiCluePieces(clueText);
  var tiled = pieces.length > 0 && pieces.length <= 10 && !/[a-zA-Z0-9]/.test(clueText);
  return { tiled: tiled, pieces: pieces, text: clueText };
}

/* Emoji Guess — symbols in, concept out.
   Quiz-shaped, not a board: one puzzle at a time on the existing quiz slide.
   What it owns is the scaffolding. The clues alone are often not enough, so
   help is released a step at a time — the letter pattern, then a hint — and
   the difficulty decides how much help exists to release. It used to be the
   typed engine with emoji pasted into the question text, which is a typed
   question in a larger font and nothing else. */
var EMOJI_LEVELS = ['easy', 'medium', 'hard'];

/**
 * The help a puzzle carries: the hint, which is its heading, and what the
 * letter pattern does.
 *
 * The hint is on every puzzle at every difficulty — it is the title line, and
 * a puzzle whose title line is blank is a slide with a bare "Q2" on it. What
 * the difficulty decides is the letter pattern: easy shows it from the start,
 * medium makes the teacher release it, and hard does without it.
 *
 * @param {object} slide compiled emoji slide
 * @returns {{hint: string, pattern: 'shown'|'step'|'none'}}
 */
function emojiHelp(slide) {
  var level = EMOJI_LEVELS.indexOf(slide.difficulty) > -1 ? slide.difficulty : 'medium';
  return {
    hint: String(slide.hint == null ? '' : slide.hint).trim(),
    pattern: level === 'easy' ? 'shown' : level === 'medium' ? 'step' : 'none'
  };
}

/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'accept'|'clues'|'hint'|'difficulty'>>} */
const emoji = {
  /* No generic Question field in the editor. Declared here rather than
     named in a list inside js/games.js, where nine styles were spelled
     out to answer a question each of them can answer about itself. */
  showsQuestion: false,
  key: 'emoji',
  label: 'Emoji guess',
  icon: '\u263a',
  blurb: 'Decode a concept from symbols. Release the letter pattern, then a hint, as the room gets stuck.',
  mechanic: 'points',
  input: 'text',
  minOptions: 0,
  maxOptions: 0,
  fixedOptions: null,

  make: function () {
    /* The sample goes in the question text, not in clues. makeQuestion fills
       missing keys from here before normalize runs, so a clues value here
       would overwrite the emoji of a game saved on the old typed engine —
       where the clues only ever lived in the question. Leaving it out means
       one rule covers both: clues come from the question when they are not
       already set. */
    return {
      question: '\ud83c\udf31 \u2600\ufe0f \ud83d\udca7 \u2192 \ud83c\udf3f',
      accept: ['photosynthesis'],
      hint: 'How a plant makes its own food',
      difficulty: 'medium',
      allowTypos: true
    };
  },

  normalize: function (q) {
    /* The clues are the question. Older saves put them in the question text,
       so that is where they are read back from rather than lost. */
    q.clues = String(q.clues == null ? q.question : q.clues).slice(0, 80);
    q.question = q.clues || 'Emoji puzzle';
    q.hint = String(q.hint == null ? '' : q.hint).slice(0, 160);
    q.difficulty = EMOJI_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : 'medium';
    if (!Array.isArray(q.accept)) q.accept = [];
    q.accept = q.accept.map(function (a) { return String(a == null ? '' : a).slice(0, 200); }).slice(0, 8);
    if (!q.accept.length) q.accept = [''];
    q.allowTypos = q.allowTypos !== false;
    delete q.options;
    delete q.correct;
    return q;
  },

  problems: function (q, n) {
    if (!String(q.clues || '').trim()) return 'Q' + n + ' has no emoji clues';
    if (!q.accept.some(function (a) { return String(a).trim(); })) {
      return 'Q' + n + ' has no accepted answer';
    }
    return null;
  },

  compile: function (q, settings, s) {
    s.clues = q.clues;
    /* The clues stay the question for everything that has to tell one
       puzzle from another — the rail, the report, a CSV row. Nothing is
       printed on the title line, though: the emoji are the prompt, printing
       them again small in the corner said the same thing twice, and an
       instruction line reads as filler by the second puzzle. An empty
       headPrompt means the format has no title of its own.

       The title line asks what to do with the clues, and gives that line up
       to the hint once the hint is released — by then nobody needs telling
       to look at the clues. One line, always filled: with the instruction
       gone entirely, a puzzle with no hint had a bare Q2 and no heading. */
    s.question = q.clues;
    s.headPrompt = 'What do these clues point to?';
    s.hint = q.hint;
    s.difficulty = q.difficulty;
    s.accept = q.accept.filter(function (a) { return String(a).trim(); });
    s.allowTypos = q.allowTypos !== false;
    s.answer = s.accept[0] || '';
    s.options = [];
    s.correct = -1;
    /* The answer is the puzzle here, so it is not on the wall until asked
       for — with or without phones in the room. */
    s.hideAnswerUntilReveal = true;
  },

  mark: function (s, response) {
    if (typeof response !== 'string') return false;
    return markTyped(s.accept, response, s.allowTypos).right;
  },

  summary: function (q) {
    var live = (q.accept || []).filter(function (a) { return String(a).trim(); });
    var help = { easy: 'pattern shown', medium: 'pattern on request', hard: 'no pattern' }[q.difficulty] || 'pattern on request';
    return (live[0] || 'no answer set') + ' \u00b7 ' + help;
  },

  describe: type.describe
};

export { emojiCluePieces, emojiClueLayout, EMOJI_LEVELS, emojiHelp, emoji };
