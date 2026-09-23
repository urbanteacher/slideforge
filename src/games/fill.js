import { ROOM_PLAY } from "./rooms.js";
/* SlideForge — games/fill. Edit source here; npm run build updates js/model.js. */

/* Fill the gaps.

   Fill in the Blanks used to be one typed answer per sentence: recall with
   no reveal worth watching, and a spelling test by accident. Now a passage
   carries up to four gaps and every phone gets a word bank — the right
   words and a few lures, shuffled — and taps a word into each slot. The
   reveal slides the right word into each gap on the wall and shows, gap by
   gap, what the room put there: a lure that half the room chose is the
   misconception, named without naming anyone.

   Authored as one line with the missing words in square brackets —
   "Water moves into a cell by [osmosis]" — plus a list of lures. An older
   game written with ______ and an accepted answer is read the same way.

   On the wire the answer is one word-bank index per gap (input 'fill'),
   checked by the relay like an order. Marked on the host; each gap that is
   right earns its share of the points. */

var FILL_MAX_GAPS = 4;
var FILL_MAX_BANK = 12;

/** A passage split at its [gaps]: the text around them and what goes in each. */
function fillParts(passage) {
  var text = String(passage || '');
  var parts = [];
  var gaps = [];
  var re = /\[([^\]\n]{1,60})\]/g;
  var at = 0;
  var m;
  while ((m = re.exec(text))) {
    parts.push(text.slice(at, m.index));
    gaps.push(m[1].trim());
    at = m.index + m[0].length;
  }
  parts.push(text.slice(at));
  return { parts: parts, gaps: gaps };
}

function lureList(raw) {
  var list = Array.isArray(raw) ? raw : String(raw || '').split(/[,\n]/);
  return list.map(function (w) { return String(w).trim(); }).filter(Boolean);
}

/** The share of gaps a response gets right, 0 to 1. */
function fillScore(s, response) {
  var want = s.gapAnswers || [];
  if (!Array.isArray(response) || response.length !== want.length || !want.length) return 0;
  var right = 0;
  for (var i = 0; i < want.length; i++) if (response[i] === want[i]) right++;
  return right / want.length;
}

/** @type {import("../types.js").GameEngine<any>} */
const fill = {
  defaults: {
    "defaultPoints": 1000,
    "defaultTime": 0,
    "confidence": false
  },
  key: 'fill',
  plays: ROOM_PLAY.fill,
  label: 'Fill the gaps',
  icon: '▭',
  blurb: 'A passage with gaps and a word bank with lures. Phones tap a word into each gap; the reveal shows, gap by gap, what the room chose.',
  mechanic: 'points',
  input: 'fill',
  /* The passage is written in the fill editor's own field. */
  showsQuestion: false,
  /* Its options are the word bank, built from the gaps and the lures. */
  minOptions: 0,
  maxOptions: 0,

  make: function () {
    return {
      question: 'Water moves into a cell by [osmosis], from where there is more [water] to where there is less, across a partially permeable [membrane].',
      lures: 'diffusion, glucose, cell wall',
      explanation: 'Osmosis is the diffusion of water, across a partially permeable membrane.'
    };
  },

  normalize: function (q) {
    var text = String(q.question || '');
    /* An older Fill in the Blanks: ______ and an accepted answer. It has no
       lures of its own, and the starter's would be about another subject, so
       it starts with none and the editor asks for them. */
    var converted = false;
    if (text.indexOf('[') < 0 && /_{3,}/.test(text)) {
      var accepted = Array.isArray(q.accept) && q.accept[0] ? q.accept[0] : q.answer;
      if (String(accepted || '').trim()) {
        text = text.replace(/_{3,}/, '[' + String(accepted).trim() + ']');
        converted = true;
      }
    }
    q.question = text.slice(0, 600);
    var lures = lureList(q.lures).slice(0, FILL_MAX_BANK).join(', ');
    if (converted && lures === lureList(fill.make().lures).join(', ')) lures = '';
    q.lures = lures;
    delete q.options;
    delete q.correct;
    return q;
  },

  problems: function (q, n) {
    var split = fillParts(q.question);
    if (!split.gaps.length) return 'Q' + n + ' has no gaps — put each missing word in [square brackets]';
    if (split.gaps.length > FILL_MAX_GAPS) return 'Q' + n + ' has ' + split.gaps.length + ' gaps — keep it to ' + FILL_MAX_GAPS;
    if (split.gaps.some(function (g) { return !g; })) return 'Q' + n + ' has an empty [ ]';
    var bank = {};
    split.gaps.concat(lureList(q.lures)).forEach(function (w) { bank[w.toLowerCase()] = 1; });
    if (Object.keys(bank).length > FILL_MAX_BANK) return 'Q' + n + ' has more than ' + FILL_MAX_BANK + ' words in its bank';
    if (Object.keys(bank).length < 2) return 'Q' + n + ' needs a lure, or there is nothing to choose between';
    return null;
  },

  compile: function (q, settings, s) {
    var split = fillParts(q.question);
    /* The bank: every gap's word once, then the lures, then shuffled — the
       order would otherwise read the answers out left to right. */
    var seen = {};
    var bank = [];
    split.gaps.concat(lureList(q.lures)).forEach(function (w) {
      var k = w.toLowerCase();
      if (!seen[k] && bank.length < FILL_MAX_BANK) { seen[k] = 1; bank.push(w); }
    });
    for (var i = bank.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = bank[i]; bank[i] = bank[j]; bank[j] = t;
    }
    var lower = bank.map(function (w) { return w.toLowerCase(); });
    s.question = split.parts.join('_____');
    s.fillParts = split.parts;
    s.options = bank;
    s.gapAnswers = split.gaps.map(function (g) { return lower.indexOf(g.toLowerCase()); });
    s.answer = split.gaps.join(' · ');
    s.correct = -1;
    /* What the room put in each gap is the reveal: it waits for it. */
    s.holdResults = true;
    s.headPrompt = split.gaps.length === 1 ? 'Fill the gap' : 'Fill the ' + split.gaps.length + ' gaps';
  },

  /* Right when every gap is; partial credit is in the points (fillScore). */
  mark: function (s, response) {
    return fillScore(s, response) === 1;
  },

  summary: function (q) {
    var n = fillParts(q.question).gaps.length;
    return n === 1 ? '1 gap' : n + ' gaps';
  },

  describe: function (s, response) {
    return Array.isArray(response)
      ? response.map(function (i) { return (s.options || [])[i] || '?'; }).join(' · ')
      : '';
  }
};

export { fill, fillParts, fillScore, FILL_MAX_GAPS, FILL_MAX_BANK };
