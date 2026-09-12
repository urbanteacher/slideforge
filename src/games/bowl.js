import { createBowlBoard } from "../boards/bowl.js";
import starters from "../samples/bowl.json" with { type: "json" };
/* SlideForge — games/bowl. Edit source here; npm run build updates js/model.js. */

/* Quiz Bowl — Jeopardy-style cell value. Correct = cell value. */
var BOWL_VALUES = [100, 200, 300, 400, 500];

var BOWL_TARGETS = [500, 1000, 1500, 2000];

/**
 * The board a quiz bowl game plays on: one column per category, one row per
 * value that is actually used.
 *
 * Two questions may share a cell — the audit allows it and a teacher writing
 * six questions across two categories will do it without thinking — so a
 * cell holds a queue and is picked once per question in it. Values that
 * nobody wrote are not rows: an empty 300 line across the board is a row of
 * cells that can never be chosen.
 *
 * @param {Array} questions authored bowl questions
 * @returns {{categories: Array, values: Array, cells: Array}}
 */
function bowlGrid(questions) {
  var categories = [], values = [], byKey = {};
  (questions || []).forEach(function (q) {
    var name = String(q.category || '').trim();
    var value = BOWL_VALUES.indexOf(Number(q.pointValue)) > -1 ? Number(q.pointValue) : 200;
    if (!name || !String(q.question || '').trim()) return;
    if (categories.indexOf(name) === -1) categories.push(name);
    if (values.indexOf(value) === -1) values.push(value);
    var key = name + '\u0000' + value;
    (byKey[key] || (byKey[key] = [])).push({
      id: q.id, question: q.question, answer: String(q.answer || '').trim(), value: value
    });
  });
  values.sort(function (a, b) { return a - b; });
  var cells = [];
  values.forEach(function (value, row) {
    categories.forEach(function (name, col) {
      cells.push({
        category: name, value: value, row: row, col: col,
        questions: (byKey[name + '\u0000' + value] || []).slice()
      });
    });
  });
  return { categories: categories, values: values, cells: cells };
}

const board = createBowlBoard({ bowlGrid });

/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'answer'|'category'|'pointValue'>>} */
const bowl = {
  boardEngine: board,
  defaults: {
    "defaultTime": 0,
    "confidence": false
  },
  key: 'bowl',
  label: 'Quiz bowl',
  icon: '▦',
  blurb: 'A category and value board. Pick an unused cell, answer aloud, and the teacher awards the cell value.',
  mechanic: 'bowl',
  input: 'choice',
  minOptions: 0,
  maxOptions: 0,
  fixedOptions: null,
  /* Three categories by three values. A board with one cell is not a board —
     the whole move in Quiz Bowl is choosing which cell to take, and until
     there was a bank a new game offered exactly one. Nine is the smallest
     grid where that choice exists.

     board() never caught this: one category is still a category, so the game
     was valid and useless at the same time. */
  starters,
  make: function () {
    return {
      question: 'What molecule carries genetic information?',
      category: 'Cells',
      pointValue: 200,
      targetScore: 1000,
      answer: 'DNA'
    };
  },
  normalize: function (q) {
    q.category = String(q.category == null ? '' : q.category).slice(0, 40);
    q.answer = String(q.answer == null ? '' : q.answer).slice(0, 120);
    var v = Number(q.pointValue);
    q.pointValue = BOWL_VALUES.indexOf(v) > -1 ? v : 200;
    var t = Number(q.targetScore);
    q.targetScore = BOWL_TARGETS.indexOf(t) > -1 ? t : 1000;
    if (!String(q.question || '').trim()) q.question = 'Bowl question';
    /* The old shape gave the phones a Correct/Wrong vote to press. The
       teacher awards a cell; nobody else can. */
    delete q.options;
    delete q.correct;
    return q;
  },
  problems: function (q, n) {
    if (!String(q.question || '').trim()) return 'Q' + n + ' has no question text';
    if (!String(q.category || '').trim()) return 'Q' + n + ' needs a category';
    if (!String(q.answer || '').trim()) return 'Q' + n + ' needs an answer for the host';
    return null;
  },
  board: function (game) {
    var grid = bowlGrid(game.questions);
    if (!grid.categories.length) return 'no question has a category to sit under';
    if (grid.categories.length > 6) {
      return grid.categories.length + ' categories is wider than a board reads — six columns is the most a projector holds';
    }
    return null;
  },
  /* Never reached when running: compileGame emits one board for the game.
     Kept so a bowl question rendered as a slide anywhere still says what it
     is rather than throwing. */
  compile: function (q, st, s) {
    s.question = q.question;
    s.category = q.category.trim();
    s.pointValue = q.pointValue;
    s.answer = q.answer.trim();
    s.options = [];
    s.correct = -1;
    s.points = q.pointValue;
    s.judgeKind = 'bowl';
  },
  mark: function () { return false; },   // cells are awarded, not answered
  summary: function (q) {
    return (q.category || 'Category') + ' · ' + (q.pointValue || 200);
  }
};

export { BOWL_VALUES, BOWL_TARGETS, bowlGrid, bowl };
