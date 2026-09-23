import { ROOM_PLAY } from "./rooms.js";
/* SlideForge — games/spot. Edit source here; npm run build updates js/model.js. */

/* Spot the Error, as its name says.

   It used to be multiple choice: the sentence sat in the question and the
   four answers were its three suspect phrases plus "nothing is wrong". The
   buttons did the spotting — nobody read the sentence looking for an error,
   they picked a letter. Here there are no candidates. The passage is split
   into words, the room taps the one that is wrong, and the answer is only
   reachable by reading.

   On the wire it is a choice question whose options are the words (input
   'tap'): the relay already takes an index and already counts answers per
   option, and a count per word is exactly the heat map the reveal draws. What
   the relay cannot know is that the error may be more than one word, so a tap
   is marked here, on the host, against the error's span.

   Where the room tapped stays off the wall until the reveal (holdResults), or
   the tallest bar would be the answer. */

/** Split a passage into the words a phone can tap. Punctuation stays on the
    word it follows, so "mitochondria," is one tap and reads as written. */
function spotWords(passage) {
  return String(passage || '').split(/\s+/).map(function (w) { return w.trim(); }).filter(Boolean);
}

/** A word with the punctuation around it taken off, for comparing. */
function bare(word) {
  return String(word || '').toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/**
 * Where the error sits among the passage's words: the first run of words that
 * matches the author's "wrong words", compared without case or punctuation.
 * @returns {{from: number, to: number}|null}
 */
function spotSpan(passage, error) {
  var words = spotWords(passage).map(bare);
  var want = spotWords(error).map(bare).filter(Boolean);
  if (!want.length) return null;
  for (var i = 0; i + want.length <= words.length; i++) {
    var hit = true;
    for (var k = 0; k < want.length; k++) {
      if (words[i + k] !== want[k]) { hit = false; break; }
    }
    if (hit) return { from: i, to: i + want.length - 1 };
  }
  return null;
}

/* A phone shows every word as a button; past this a passage stops being a
   sentence to read and becomes a page to scroll. */
var SPOT_MAX_WORDS = 80;

/** @type {import("../types.js").GameEngine<any>} */
const spot = {
  defaults: {
    "defaultPoints": 1000
  },
  key: 'spot',
  plays: ROOM_PLAY.spot,
  label: 'Spot the error',
  icon: '⌖',
  blurb: 'A sentence with one mistake in it. The room taps the wrong word; the reveal shows where everyone looked.',
  mechanic: 'points',
  input: 'tap',
  /* The passage is written in the spot editor's own Sentence field. */
  showsQuestion: false,
  /* Its options are the passage's words, which the author never edits as a
     list — these bound the engine's generic option controls, not the words. */
  minOptions: 0,
  maxOptions: 0,

  make: function () {
    return {
      question: 'Photosynthesis happens in the mitochondria, uses carbon dioxide and water, and releases oxygen.',
      error: 'mitochondria',
      fix: 'chloroplasts',
      explanation: 'Mitochondria carry out respiration. Photosynthesis happens in the chloroplasts.'
    };
  },

  normalize: function (q) {
    q.error = String(q.error || '').slice(0, 120);
    q.fix = String(q.fix || '').slice(0, 120);
    /* Not choice's fields: a spot question has no options of its own. */
    delete q.options;
    delete q.correct;
    return q;
  },

  problems: function (q, n) {
    var words = spotWords(q.question);
    if (!words.length) return 'Q' + n + ' has no sentence to search';
    if (words.length > SPOT_MAX_WORDS) return 'Q' + n + ' is ' + words.length + ' words — keep it under ' + SPOT_MAX_WORDS + ' so it fits a phone';
    if (!String(q.error || '').trim()) return 'Q' + n + ' has no wrong words marked';
    if (!spotSpan(q.question, q.error)) return 'Q' + n + ': "' + String(q.error).trim() + '" is not in the sentence, word for word';
    return null;
  },

  compile: function (q, settings, s) {
    var words = spotWords(q.question).slice(0, SPOT_MAX_WORDS);
    var span = spotSpan(q.question, q.error) || { from: 0, to: 0 };
    s.question = q.question;
    s.options = words;
    s.correct = span.from;
    s.errorFrom = span.from;
    s.errorTo = span.to;
    s.fix = q.fix || '';
    /* The wrong words as the reveal names them: without the comma or full
       stop the sentence happened to put after them. */
    var wrong = words.slice(span.from, span.to + 1).join(' ').replace(/[,.;:!?)"'\u201d\u2019]+$/u, '');
    s.answer = wrong + (q.fix ? ' → ' + q.fix : '');
    /* Where the room tapped is the answer, so it waits for the reveal. */
    s.holdResults = true;
    /* The heading says what to do; the passage itself is the stage. */
    s.headPrompt = 'There is one error in this sentence. Find it.';
  },

  /* A tap anywhere inside the error's words is a find. */
  mark: function (s, response) {
    var i = Number(response);
    if (!Number.isInteger(i)) return false;
    var from = typeof s.errorFrom === 'number' ? s.errorFrom : Number(s.correct) || 0;
    var to = typeof s.errorTo === 'number' ? s.errorTo : from;
    return i >= from && i <= to;
  },

  summary: function (q) {
    var e = String(q.error || '').trim();
    return e ? 'find "' + e + '"' : 'no error marked';
  },

  describe: function (s, response) {
    return (s.options || [])[Number(response)] || '';
  }
};

export { spot, spotWords, spotSpan, SPOT_MAX_WORDS };
