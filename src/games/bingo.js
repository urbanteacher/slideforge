import { ROOM_PLAY } from "./rooms.js";
import { createBingoBoard } from "../boards/bingo.js";
/* SlideForge — games/bingo. Edit source here; npm run build updates js/model.js. */
import { normalizePairQuestion, pairProblems } from "./memory.js";
import starters from "../samples/bingo.json" with { type: "json" };

/* Bingo — term bank; line wins; no points. */
function bingoHasLine(marked, size) {
  size = Math.max(2, Math.min(4, Number(size) || 3));
  var n = size * size;
  var cells = [];
  for (var i = 0; i < n; i++) cells[i] = !!marked[i];
  var r, c, ok;
  for (r = 0; r < size; r++) {
    ok = true;
    for (c = 0; c < size; c++) if (!cells[r * size + c]) { ok = false; break; }
    if (ok) return true;
  }
  for (c = 0; c < size; c++) {
    ok = true;
    for (r = 0; r < size; r++) if (!cells[r * size + c]) { ok = false; break; }
    if (ok) return true;
  }
  ok = true;
  for (i = 0; i < size; i++) if (!cells[i * size + i]) { ok = false; break; }
  if (ok) return true;
  ok = true;
  for (i = 0; i < size; i++) if (!cells[i * size + (size - 1 - i)]) { ok = false; break; }
  return ok;
}

const board = createBingoBoard();

/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'term'|'definition'|'gridSize'>>} */
const bingo = {
  /* No Explanation field in the editor. js/games.js worked this out from
     whether the style had a board engine, with bowl named as the board
     that does take one and two more named as the non-boards that do
     not. Declared, the board question stops being a proxy for it. */
  showsExplanation: false,
  boardEngine: board,
  /* Twelve pairs, because a 3×3 card needs nine different terms and a pool
     the same size as the card deals every team an identical one.

     Without a bank, makeGame('bingo') produced a single pair and the game was
     invalid the moment it existed: board() answered "a 3×3 card needs 9
     different terms and this has 1" before the teacher had typed anything.
     The other pair-based boards have shipped a bank since they were written;
     this one was the exception. */
  starters,
  defaults: {
    "scoreboard": false,
    "defaultTime": 0,
    "defaultPoints": 0,
    "scoreSlide": false,
    "confidence": false
  },
  key: 'bingo',
  plays: ROOM_PLAY.board,
  label: 'Bingo',
  icon: '▣',
  blurb: 'Every team gets a different card. Call a definition; the team holding that term explains it to claim the square. A line wins — no points.',
  mechanic: 'bingo',
  input: 'choice',
  minOptions: 0,
  maxOptions: 0,
  fixedOptions: null,
  /* One pair per question, like the memory boards: the questions are the
     pool the cards are dealt from, not a run of slides. */
  make: function () {
    return { question: 'Nucleus', term: 'Nucleus',
      definition: 'Holds the cell’s DNA', gridSize: 3 };
  },
  normalize: function (q) {
    /* The old shape kept the whole term bank on every question and gave the
       phones a two-button vote to press. Neither survives a normalize.
       A bank is the signal that this game predates the rewrite, and it wins
       over the sample pair that makeQuestion has already filled in — the
       teacher's own first term is kept, with the definition blanked so the
       readiness check asks for it. Handing back a term they wrote paired
       with a definition they did not would be worse than an empty field. */
    if (Array.isArray(q.terms)) {
      q.term = String(q.terms[0] || '');
      q.question = q.term;
      q.definition = '';
    }
    delete q.terms;
    normalizePairQuestion(q);
    q.studySeconds = 0;
    var size = Number(q.gridSize);
    q.gridSize = [2, 3, 4].indexOf(size) > -1 ? size : 3;
    return q;
  },
  problems: pairProblems,
  /* A card cannot be dealt from a pool smaller than itself, and duplicate
     terms would put the same square on a card twice. Neither is visible
     one question at a time, so it is asked of the whole game. */
  board: function (game) {
    var size = Number((game.questions[0] || {}).gridSize) || 3;
    var seen = {}, n = 0;
    game.questions.forEach(function (q) {
      var key = String(q.term || '').trim().toLowerCase();
      if (key && !seen[key]) { seen[key] = 1; n++; }
    });
    if (n < size * size) {
      return 'a ' + size + '×' + size + ' card needs ' + (size * size) +
        ' different terms and this has ' + n;
    }
    return null;
  },
  /* Never reached when running — compileGame builds one board slide for the
     whole game. This is for the editor preview, which compiles a single
     question to show what one square holds. */
  compile: function (q, st, s) {
    s.question = q.question || q.term;
    s.term = String(q.term || '').trim();
    s.definition = String(q.definition || '').trim();
    s.gridSize = q.gridSize || 3;
    s.options = [];
    s.correct = -1;
    s.points = 0;
  },
  mark: function () { return false; },   // squares are claimed, not answered
  summary: function (q) {
    return (q.gridSize || 3) + '×' + (q.gridSize || 3) + ' card · one square';
  }
};

export { bingoHasLine, bingo };
