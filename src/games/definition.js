import { ROOM_PLAY } from "./rooms.js";
import starters from "../samples/definition.json" with { type: "json" };
/* SlideForge — games/definition. Edit source here; npm run build updates js/model.js. */
import { markTyped } from "./marking.js";
import { type } from "./type.js";

/* Definition Challenge — read a passage, then answer from memory once it
   clears. Quiz-shaped (typed mark), not a board. The distinctive part is
   the reading→ask gate; phones stay idle until Ask. */
var DEFINITION_TIMES = [20, 30, 45, 60];

function clampDefinitionSeconds(n) {
  n = Number(n);
  return DEFINITION_TIMES.indexOf(n) > -1 ? n : 30;
}

/** Split older mashed question text: intro + "passage" + recall. */
function splitDefinitionPassage(text) {
  var t = String(text || '').trim();
  if (!t) return { passage: '', question: '' };
  var quoted = t.match(/"([^"]+)"/);
  if (quoted) {
    var after = t.slice(t.indexOf(quoted[0]) + quoted[0].length).replace(/^\s+/, '');
    return {
      passage: quoted[1].trim(),
      question: after.replace(/^[\s\n]+/, '') || 'What did you just read?'
    };
  }
  var parts = t.split(/\n\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
  if (parts.length >= 2) {
    var last = parts[parts.length - 1];
    /* Drop a leading instruction line if it is only framing. */
    var body = parts.slice(0, -1);
    if (/^read this/i.test(body[0]) && body.length > 1) body = body.slice(1);
    return { passage: body.join('\n\n'), question: last };
  }
  return { passage: t, question: 'What did you just read?' };
}

function definitionCreate(seconds) {
  return { phase: 'reading', seconds: clampDefinitionSeconds(seconds) };
}

function definitionTransition(state, action) {
  var s = Object.assign({}, state || definitionCreate(30));
  if (action === 'restart') return definitionCreate(s.seconds);
  if ((action === 'ask' || action === 'expire') && s.phase === 'reading') {
    s.phase = 'asking';
  }
  return s;
}

/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'accept'|'passage'|'term'|'definition'>>} */
const definition = {
  /* The most of these a teacher can add. Declared here rather than
     spelled out twice in js/games.js, where five styles were named in
     two identical twenty-line blocks. */
  maxQuestions: 20,
  /* No generic Question field in the editor. Declared here rather than
     named in a list inside js/games.js, where nine styles were spelled
     out to answer a question each of them can answer about itself. */
  showsQuestion: false,
  defaults: {
    "defaultTime": 30,
    "defaultPoints": 1,
    "confidence": false
  },
  starters,
  key: 'definition',
  plays: ROOM_PLAY.typed,
  label: 'Definition challenge',
  icon: '\u00b6',
  blurb: 'Read a short passage, then answer from memory once it clears.',
  mechanic: 'points',
  input: 'text',
  minOptions: 0,
  maxOptions: 0,
  fixedOptions: null,
  make: function () {
    return {
      passage: 'A catalyst speeds up a reaction by lowering the activation energy. It is not consumed, so the same catalyst can work again and again.',
      question: 'What is not used up in the reaction?',
      accept: ['the catalyst', 'catalyst'],
      allowTypos: true
    };
  },
  normalize: function (q) {
    var passage = String(q.passage == null ? '' : q.passage).slice(0, 1200);
    var question = String(q.question == null ? '' : q.question).slice(0, 400);
    /* Old catalogue seed mashed passage into question text. */
    if (!String(passage).trim() && String(question).trim()) {
      var split = splitDefinitionPassage(question);
      passage = split.passage;
      question = split.question;
    }
    q.passage = passage;
    q.question = question || 'What did you just read?';
    if (!Array.isArray(q.accept)) q.accept = [];
    q.accept = q.accept.map(function (a) {
      return String(a == null ? '' : a).slice(0, 200);
    }).slice(0, 8);
    if (!q.accept.some(function (a) { return a.trim(); }) && Array.isArray(q.options)) {
      var carried = q.options[Number(q.correct) || 0];
      if (carried && String(carried).trim()) q.accept = [String(carried)];
    }
    if (!q.accept.length) q.accept = [''];
    q.allowTypos = q.allowTypos !== false;
    delete q.options;
    delete q.correct;
    return q;
  },
  problems: function (q, n) {
    if (!String(q.passage || '').trim()) return 'Q' + n + ' has no passage to read';
    if (!String(q.question || '').trim()) return 'Q' + n + ' has no recall question';
    if (!q.accept.some(function (a) { return String(a).trim(); })) {
      return 'Q' + n + ' has no accepted answer';
    }
    return null;
  },
  board: function (game) {
    var n = (game.questions || []).length;
    if (n < 3) return 'needs at least 3 challenges and this has ' + n;
    if (n > 20) return 'can have at most 20 challenges and this has ' + n;
    return null;
  },
  compile: function (q, settings, s) {
    s.passage = String(q.passage || '').trim();
    s.question = String(q.question || '').trim();
    s.headPrompt = s.question;
    s.accept = q.accept.filter(function (a) { return String(a).trim(); });
    s.allowTypos = q.allowTypos !== false;
    s.answer = s.accept[0] || '';
    s.options = [];
    s.correct = -1;
    s.hideAnswerUntilReveal = true;
    s.definitionChallenge = true;
  },
  mark: function (s, response) {
    if (typeof response !== 'string') return false;
    return markTyped(s.accept, response, s.allowTypos).right;
  },
  summary: function (q) {
    var live = (q.accept || []).filter(function (a) { return String(a).trim(); });
    var tip = (String(q.passage || '').trim().slice(0, 40) || 'passage') +
      (String(q.passage || '').trim().length > 40 ? '\u2026' : '');
    return tip + ' \u00b7 ' + (live[0] || 'no answer set');
  },
  describe: type.describe
};

export { DEFINITION_TIMES, clampDefinitionSeconds, splitDefinitionPassage, definitionCreate, definitionTransition, definition };
