/* SlideForge — games/choice. Edit source here; npm run build updates js/model.js. */

/* Core choice schemas. Presets import these hooks instead of copying them. */

/** @type {Record<string, import("../types.js").GameEngine<import("../types.js").QuestionWith<'options'|'correct'>>>} */
const coreStyles = {
  choice: {
    key: 'choice',
    label: 'Multiple choice',
    icon: '?',
    blurb: 'Two to six answers, one of them correct.',
    mechanic: 'points',
    input: 'choice',
    minOptions: 2,
    maxOptions: 6,
    fixedOptions: null,

    make: function () {
      return {
        question: 'Which of these is correct?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: 0
      };
    },

    normalize: function (q) {
      if (!Array.isArray(q.options)) q.options = [];
      q.options = q.options
        .map(function (o) { return typeof o === 'string' ? o : (o && o.text) || ''; })
        .slice(0, 6);
      while (q.options.length < 2) q.options.push('');
      q.correct = Math.max(0, Math.min(q.options.length - 1, Number(q.correct) || 0));
      return q;
    },

    problems: function (q, n) {
      /* Both guards below look defensive but fix real holes. `options` can be
         absent on a question carried over from another engine's shape, and a
         validator that throws reports nothing at all. And `String(undefined)`
         is "undefined" — truthy — so the old check let a question with no
         text through as valid.

         What this deliberately does not do is accept other field names for
         these two. Reading `answers` or `prompt` here would pass a question
         that compile, mark and summary all read as empty, because they go to
         `options` and `question`. A shape that needs translating is the
         normalizer's job, so that everything downstream sees one shape. */
      var opts = Array.isArray(q.options) ? q.options : [];
      var live = opts.filter(function (o) { return String(o).trim(); });
      if (!String(q.question || '').trim()) return 'Q' + n + ' has no question text';
      if (live.length < 2) return 'Q' + n + ' needs at least two answers';
      if (!String(opts[q.correct] || '').trim()) {
        return 'Q' + n + ' has no correct answer marked';
      }
      return null;
    },

    /* Everything a question of this style contributes to its slide. */
    compile: function (q, settings, s) {
      s.question = q.question;
      s.options = q.options.filter(function (o) { return String(o).trim(); });
      s.correct = Math.max(0, Math.min(s.options.length - 1, q.correct));
    },

    mark: function (s, response) {
      return Number.isInteger(response) && response === s.correct;
    },

    /* One line about the question, for the editor's list of them. */
    summary: function (q) {
      var live = (q.options || []).filter(function (o) { return String(o).trim(); });
      return live.length + ' answers';
    }
  },

  truefalse: {
    key: 'truefalse',
    label: 'True or false',
    icon: '½',
    blurb: 'A statement the room marks true or false.',
    mechanic: 'points',
    input: 'choice',
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ['True', 'False'],

    make: function () {
      return {
        question: 'A statement that is either true or false.',
        options: ['True', 'False'],
        correct: 0
      };
    },

    normalize: function (q) {
      /* The options are the style's, not the author's — so a game converted
         from multiple choice lands on a valid pair rather than keeping four
         stale answers. */
      q.options = ['True', 'False'];
      q.correct = Number(q.correct) === 1 ? 1 : 0;
      return q;
    },

    problems: function (q, n) {
      /* `|| ''` for the same reason as choice above: String(undefined) is
         "undefined", so the bare check called a blank statement valid. */
      if (!String(q.question || '').trim()) return 'Q' + n + ' has no statement';
      return null;
    },

    compile: function (q, settings, s) {
      s.options = ['True', 'False'];
      s.correct = q.correct === 1 ? 1 : 0;
      s.question = q.question;
    },

    mark: function (s, response) {
      return Number.isInteger(response) && response === s.correct;
    },

    summary: function (q) { return q.correct === 1 ? 'False' : 'True'; }
  }
};
const choice = coreStyles.choice;
const truefalse = coreStyles.truefalse;

export { coreStyles, choice, truefalse };
