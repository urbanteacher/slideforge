/* SlideForge — games/type. Edit source here; npm run build updates js/model.js. */
import { markTyped } from "./marking.js";

/* Type answer. No options at all, which is the point: recall without the
   clues. The author lists every spelling they will accept and the marking
   rules above do the rest. */
/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'accept'|'answer'>>} */
const type = {
  key: 'type',
  label: 'Type answer',
  icon: 'Aa',
  blurb: 'No options to choose from — the room types the answer from memory.',
  mechanic: 'points',
  input: 'text',
  minOptions: 0,
  maxOptions: 0,
  fixedOptions: null,

  make: function () {
    /* Blank, not a sample. A placeholder answer here would be an answer the
       question silently accepts, and the author would never see it. */
    return {
      question: 'What is the answer?',
      accept: [''],
      allowTypos: true
    };
  },

  normalize: function (q) {
    if (!Array.isArray(q.accept)) q.accept = [];
    q.accept = q.accept.map(function (a) { return String(a == null ? '' : a).slice(0, 200); }).slice(0, 8);
    /* Converted from a game with options: the answer that was marked
       correct is the obvious thing to accept, rather than dropping the
       author's work and leaving the question unmarkable. */
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
    if (!String(q.question).trim()) return 'Q' + n + ' has no question text';
    if (!q.accept.some(function (a) { return String(a).trim(); })) {
      return 'Q' + n + ' has no accepted answer';
    }
    return null;
  },

  compile: function (q, settings, s) {
    s.question = q.question;
    s.accept = q.accept.filter(function (a) { return String(a).trim(); });
    s.allowTypos = q.allowTypos !== false;
    /* The first accepted spelling is the one put on the screen, so the room
       reads a single answer rather than a list of tolerances. */
    s.answer = s.accept[0] || '';
    s.options = [];
    s.correct = -1;
  },

  mark: function (s, response) {
    if (typeof response !== 'string') return false;
    return markTyped(s.accept, response, s.allowTypos).right;
  },

  summary: function (q) {
    var live = (q.accept || []).filter(function (a) { return String(a).trim(); });
    if (!live.length) return 'no answer set';
    return live.length > 1 ? live[0] + ' +' + (live.length - 1) : live[0];
  },

  describe: function (s, response) {
    var hit = markTyped(s.accept, response, s.allowTypos);
    return hit.right ? hit.matched : String(response == null ? '' : response);
  }
};

export { type };
