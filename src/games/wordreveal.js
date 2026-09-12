/* SlideForge — games/wordreveal. Edit source here; npm run build updates js/model.js. */
import { markTyped } from "./marking.js";

/* Word Reveal — typed guess while letters drip onto the wall.
   Audit: score by fraction revealed — <50%→100, <75%→75, else 50; wrong 0.
   Pre-reveal start: easy 60%, medium 40%, hard 0%. */
var WR_LEVELS = ['easy', 'medium', 'hard'];

var WR_DRIP = [3, 5, 10, 15];

function wordRevealPreFraction(difficulty) {
  if (difficulty === 'easy') return 0.6;
  if (difficulty === 'medium') return 0.4;
  return 0;
}

function wordRevealPoints(fractionRevealed) {
  var f = Math.max(0, Math.min(1, Number(fractionRevealed) || 0));
  if (f < 0.5) return 100;
  if (f < 0.75) return 75;
  return 50;
}

/** Letter indices to show at a given drip step (letters only — spaces stay open). */
function wordRevealMask(word, shownCount) {
  var chars = String(word || '').split('');
  var letterIdx = [];
  chars.forEach(function (ch, i) {
    if (/\S/.test(ch)) letterIdx.push(i);
  });
  var n = Math.max(0, Math.min(letterIdx.length, Number(shownCount) || 0));
  var open = {};
  for (var i = 0; i < n; i++) open[letterIdx[i]] = 1;
  return chars.map(function (ch, i) {
    if (!/\S/.test(ch)) return ch;
    return open[i] ? ch : '_';
  }).join('');
}

function wordRevealLetterCount(word) {
  return String(word || '').replace(/\s/g, '').length;
}

/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'accept'|'word'>>} */
const wordreveal = {
  defaults: {
    "defaultTime": 0,
    "defaultPoints": 0,
    "confidence": false
  },
  key: 'wordreveal',
  label: 'Word reveal',
  icon: '…',
  blurb: 'Guess the word as letters drip in. Earlier guesses score more.',
  mechanic: 'wordreveal',
  input: 'text',
  minOptions: 0,
  maxOptions: 0,
  fixedOptions: null,

  make: function () {
    return {
      question: 'What word is being revealed?',
      word: 'PHOTOSYNTHESIS',
      hint: 'How plants make food',
      accept: ['photosynthesis'],
      allowTypos: true,
      difficulty: 'medium',
      dripInterval: 5
    };
  },

  normalize: function (q) {
    q.word = String(q.word == null ? '' : q.word).slice(0, 40);
    q.hint = String(q.hint == null ? '' : q.hint).slice(0, 120);
    q.difficulty = WR_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : 'medium';
    var drip = Number(q.dripInterval);
    q.dripInterval = WR_DRIP.indexOf(drip) > -1 ? drip : 5;
    if (!Array.isArray(q.accept)) q.accept = [];
    q.accept = q.accept.map(function (a) { return String(a == null ? '' : a).slice(0, 200); }).slice(0, 8);
    if (!q.accept.some(function (a) { return String(a).trim(); }) && q.word.trim()) {
      q.accept = [q.word.trim()];
    }
    if (!q.accept.length) q.accept = [''];
    q.allowTypos = q.allowTypos !== false;
    if (!String(q.question || '').trim()) {
      q.question = q.hint ? q.hint : 'What word is being revealed?';
    }
    delete q.options;
    delete q.correct;
    return q;
  },

  problems: function (q, n) {
    if (!String(q.word || '').trim()) return 'Q' + n + ' needs a word to reveal';
    if (!q.accept.some(function (a) { return String(a).trim(); })) {
      return 'Q' + n + ' has no accepted answer';
    }
    return null;
  },

  compile: function (q, settings, s) {
    s.question = q.question;
    s.word = q.word.trim();
    s.hint = q.hint;
    s.accept = q.accept.filter(function (a) { return String(a).trim(); });
    if (!s.accept.length && s.word) s.accept = [s.word];
    s.answer = s.accept[0] || s.word;
    s.allowTypos = q.allowTypos !== false;
    s.difficulty = q.difficulty;
    s.dripInterval = q.dripInterval;
    s.preReveal = wordRevealPreFraction(q.difficulty);
    s.options = [];
    s.correct = -1;
    /* Same defect as emoji guess, next door: the word is what the room is
       guessing, so it waits for a reveal rather than sitting in the answer
       box from the start. */
    s.hideAnswerUntilReveal = true;
  },

  mark: function (s, response) {
    return markTyped(s.accept, response, s.allowTypos).right;
  },

  summary: function (q) {
    return (q.word || 'word') + ' · drip ' + (q.dripInterval || 5) + 's';
  },

  describe: function (s, response) {
    var hit = markTyped(s.accept, response, s.allowTypos);
    return hit.right ? (hit.matched || s.answer) : String(response == null ? '' : response);
  }
};

export { WR_LEVELS, WR_DRIP, wordRevealPreFraction, wordRevealPoints, wordRevealMask, wordRevealLetterCount, wordreveal };
