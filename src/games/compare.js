import { ROOM_PLAY } from "./rooms.js";
import starters from "../samples/compare.json" with { type: "json" };
/* SlideForge — games/compare. Edit source here; npm run build updates js/model.js. */

/* Compare & Contrast — sort it.

   Two items side by side and a set of statements. Every phone sorts each
   statement into A only, Both or B only; the wall shows a three-column
   board, and at the reveal each statement lands in its column with how the
   room sorted it — the statement the room put in the wrong column most is
   the one worth the discussion. Authored as lines tagged "Both:", "A:" or
   "B:"; the prose similarities and differences are the reveal's summary.

   A comparison with no tagged statements (every one written before
   23 Sep 2026) still plays as before: a discussion, with the phones sending
   points to an idea box, and the prepared points revealed. */

var SORT_BINS = 3;          // A only, Both, B only
var SORT_MAX = 10;

/** "Both: x" / "A: x" / "B: x", one per line → [{ text, bin }]. */
function sortStatements(raw) {
  return String(raw || '').split('\n').map(function (line) {
    var m = /^\s*(both|a|b)\s*[:\-–—]\s*(.+)$/i.exec(line);
    if (!m) return null;
    var tag = m[1].toLowerCase();
    return { text: m[2].trim().slice(0, 160), bin: tag === 'a' ? 0 : tag === 'both' ? 1 : 2 };
  }).filter(function (x) { return !!(x && x.text); }).slice(0, SORT_MAX)
    .map(function (x) { return /** @type {{text: string, bin: number}} */ (x); });
}

/** The share of statements a response sorts right, 0 to 1. */
function sortScore(s, response) {
  var want = s.sortAnswers || [];
  if (!Array.isArray(response) || response.length !== want.length || !want.length) return 0;
  var right = 0;
  for (var i = 0; i < want.length; i++) if (response[i] === want[i]) right++;
  return right / want.length;
}
/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'itemA'|'itemB'>>} */
const compare = {
  /* No Explanation field in the editor. js/games.js worked this out from
     whether the style had a board engine, with bowl named as the board
     that does take one and two more named as the non-boards that do
     not. Declared, the board question stops being a proxy for it. */
  showsExplanation: false,
  /* The most of these a teacher can add. Declared here rather than
     spelled out twice in js/games.js, where five styles were named in
     two identical twenty-line blocks. */
  maxQuestions: 10,
  /* No generic Question field in the editor. Declared here rather than
     named in a list inside js/games.js, where nine styles were spelled
     out to answer a question each of them can answer about itself. */
  showsQuestion: false,
  defaults: {
    "scoreboard": false,
    "defaultTime": 0,
    "defaultPoints": 0,
    "scoreSlide": false,
    "confidence": false
  },
  starters,
  key: 'compare',
  plays: ROOM_PLAY.sort,
  label: 'Compare & contrast',
  icon: '\u21c4',
  blurb: 'Two items and a set of statements. Phones sort each into A only, Both or B only; the reveal lands each in its column with how the room sorted it.',
  mechanic: 'points',
  input: 'choice',
  minOptions: 0,
  maxOptions: 0,
  fixedOptions: null,
  make: function () {
    return {
      question: 'Compare these two — how are they alike, and how do they differ?',
      itemA: 'Photosynthesis',
      itemB: 'Respiration',
      similarities: 'Both involve energy and gases moving in living cells.',
      differences: 'Photosynthesis stores energy in glucose; respiration releases it.',
      statements: 'Both: happens in living cells\nBoth: involves carbon dioxide and oxygen\nA: stores energy in glucose\nA: needs light\nB: releases energy from glucose\nB: happens day and night',
      category: '',
      options: [],
      correct: -1
    };
  },
  normalize: function (q) {
    q.itemA = String(q.itemA == null ? '' : q.itemA).slice(0, 80);
    q.itemB = String(q.itemB == null ? '' : q.itemB).slice(0, 80);
    q.similarities = String(q.similarities == null ? '' : q.similarities).slice(0, 600);
    q.differences = String(q.differences == null ? '' : q.differences).slice(0, 600);
    q.category = String(q.category == null ? '' : q.category).slice(0, 40);
    q.statements = String(q.statements == null ? '' : q.statements).slice(0, 2000);
    if (!String(q.question || '').trim()) {
      q.question = 'Compare these two — how are they alike, and how do they differ?';
    }
    q.question = String(q.question).slice(0, 280);
    q.options = [];
    q.correct = -1;
    return q;
  },
  problems: function (q, n) {
    if (!String(q.itemA || '').trim() || !String(q.itemB || '').trim()) {
      return 'Q' + n + ' needs Item A and Item B';
    }
    if (String(q.itemA).trim().toLowerCase() === String(q.itemB).trim().toLowerCase()) {
      return 'Q' + n + ' needs two different items';
    }
    var sorted = sortStatements(q.statements);
    if (String(q.statements || '').trim() && sorted.length < 2) {
      return 'Q' + n + ' needs at least two statements, each starting Both:, A: or B:';
    }
    /* A sort needs its statements; a discussion needs its prose. */
    if (sorted.length >= 2) return null;
    if (!String(q.similarities || '').trim()) {
      return 'Q' + n + ' needs similarities for the reveal';
    }
    if (!String(q.differences || '').trim()) {
      return 'Q' + n + ' needs differences for the reveal';
    }
    return null;
  },
  board: function (game) {
    var n = (game.questions || []).length;
    if (n < 3) return 'needs at least 3 comparisons and this has ' + n;
    if (n > 10) return 'can have at most 10 comparisons and this has ' + n;
    return null;
  },
  compile: function (q, settings, s) {
    s.question = q.question || 'Compare these two — how are they alike, and how do they differ?';
    s.headPrompt = s.question;
    s.itemA = String(q.itemA || '').trim();
    s.itemB = String(q.itemB || '').trim();
    s.similarities = String(q.similarities || '').trim();
    s.differences = String(q.differences || '').trim();
    s.category = String(q.category || '').trim();
    s.options = [];
    s.correct = -1;
    s.points = 0;
    s.voteOnly = true;
    s.hideAnswerUntilReveal = true;
    s.compareDiscuss = true;
    s.timeLimit = 0;
    var sorted = sortStatements(q.statements);
    if (sorted.length >= 2) {
      /* Shuffled, or the author's order would hand the room the bins. */
      for (var i = sorted.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = sorted[i]; sorted[i] = sorted[j]; sorted[j] = t;
      }
      s.input = 'sort';
      s.compareSort = true;
      s.compareDiscuss = false;
      s.voteOnly = false;
      s.options = sorted.map(function (x) { return x.text; });
      s.sortAnswers = sorted.map(function (x) { return x.bin; });
      var bins = [(s.itemA || 'A') + ' only', 'Both', (s.itemB || 'B') + ' only'];
      s.sortBins = bins;
      /* How the room sorted is the reveal: it waits for it. */
      s.holdResults = true;
      s.headPrompt = 'Sort each statement: ' + (s.itemA || 'A') + ', ' + (s.itemB || 'B') + ', or both?';
      s.answer = sorted.map(function (x) { return x.text + ' → ' + bins[x.bin]; }).join(' · ');
    }
  },
  /* A sort is right when every statement is in its column; partial credit
     is in the points (sortScore). A discussion is never marked. */
  mark: function (s, response) {
    return !!s.compareSort && sortScore(s, response) === 1;
  },
  summary: function (q) {
    return (q.itemA || '?') + ' · ' + (q.itemB || '?');
  }
};

export { compare, sortStatements, sortScore, SORT_BINS };
