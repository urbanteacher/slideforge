import { ROOM_PLAY } from "./rooms.js";
import { createMemoryBoard } from "../boards/memory.js";
import starters from "../samples/memory.json" with { type: "json" };
/* SlideForge — games/memory. Edit source here; npm run build updates js/model.js. */

/* Shared pair content for Memory Flip / Match / Knowledge Flip. */
function normalizePairQuestion(q) {
  q.term = String(q.term == null ? '' : q.term).slice(0, 80);
  q.definition = String(q.definition == null ? '' : q.definition).slice(0, 240);
  if (!String(q.question || '').trim()) q.question = q.term || 'Claim this pair';
  var study = Number(q.studySeconds);
  q.studySeconds = Number.isFinite(study) ? Math.max(0, Math.min(60, Math.round(study))) : 10;
  delete q.options;
  delete q.correct;
  return q;
}

function pairProblems(q, n) {
  if (!String(q.term || '').trim()) return 'Q' + n + ' needs a term';
  if (!String(q.definition || '').trim()) return 'Q' + n + ' needs a definition';
  return null;
}

function compilePairClaim(q, settings, s, hideAfterStudy) {
  s.question = q.question || q.term;
  s.term = q.term.trim();
  s.definition = q.definition.trim();
  s.answer = s.definition;
  s.accept = [s.definition];
  s.allowTypos = true;
  s.studySeconds = q.studySeconds;
  s.hideAfterStudy = !!hideAfterStudy;
  s.options = ['Claimed', 'Not yet'];
  s.correct = 0;
}

const board = createMemoryBoard();

/** @type {import("../types.js").GameEngine} */
const memoryflip = {
  /* No Explanation field in the editor. js/games.js worked this out from
     whether the style had a board engine, with bowl named as the board
     that does take one and two more named as the non-boards that do
     not. Declared, the board question stops being a proxy for it. */
  showsExplanation: false,
  /* Studied as two-sided pairs before they are claimed, which is what
     knowledgeflip is not — its keywords stand alone. js/games.js asked
     this twice by naming both styles: once to build the pair bank for
     the board, once to word the time hint. */
  studyPairs: true,
  boardEngine: board,
  defaults: {
    "scoreboard": false,
    "defaultTime": 0,
    "defaultPoints": 1,
    "scoreSlide": false,
    "confidence": false
  },
  starters,
  key: 'memoryflip',
  plays: ROOM_PLAY.board,
  label: 'Memory flip',
  icon: '🂠',
  blurb: 'Study term↔definition pairs, then claim them. Host marks each claim.',
  mechanic: 'claim',
  input: 'choice',
  minOptions: 2,
  maxOptions: 2,
  fixedOptions: ['Claimed', 'Not yet'],
  make: function () {
    return {
      question: 'Chloroplast',
      term: 'Chloroplast',
      definition: 'Organelle where photosynthesis happens',
      studySeconds: 10
    };
  },
  normalize: normalizePairQuestion,
  problems: pairProblems,
  compile: function (q, st, s) { compilePairClaim(q, st, s, true); },
  mark: function (s, response) {
    return Number.isInteger(response) && response === s.correct;
  },
  summary: function (q) { return (q.term || 'pair') + ' · study ' + (q.studySeconds || 10) + 's'; }
};

/** @type {import("../types.js").GameEngine} */
const memorymatch = {
  /* No Explanation field in the editor. js/games.js worked this out from
     whether the style had a board engine, with bowl named as the board
     that does take one and two more named as the non-boards that do
     not. Declared, the board question stops being a proxy for it. */
  showsExplanation: false,
  /* Studied as two-sided pairs before they are claimed, which is what
     knowledgeflip is not — its keywords stand alone. js/games.js asked
     this twice by naming both styles: once to build the pair bank for
     the board, once to word the time hint. */
  studyPairs: true,
  boardEngine: board,
  defaults: {
    "mode": "teams",
    "scoreboard": false,
    "defaultTime": 0,
    "defaultPoints": 1,
    "scoreSlide": false,
    "confidence": false
  },
  starters,
  key: 'memorymatch',
  plays: ROOM_PLAY.board,
  label: 'Memory match',
  icon: '⧉',
  blurb: 'Study the whole board, choose a hidden card and explain its meaning. Claim it for your team, or pass and retry.',
  mechanic: 'claim',
  input: 'choice',
  minOptions: 2,
  maxOptions: 2,
  fixedOptions: ['Claimed', 'Not yet'],
  make: function () {
    return {
      question: 'Mitochondrion',
      term: 'Mitochondrion',
      definition: 'Where respiration releases energy',
      studySeconds: 10,
      rotateClaims: true
    };
  },
  normalize: function (q) {
    normalizePairQuestion(q);
    q.rotateClaims = q.rotateClaims !== false;
    return q;
  },
  problems: pairProblems,
  compile: function (q, st, s) {
    compilePairClaim(q, st, s, true);
    s.rotateClaims = q.rotateClaims !== false;
  },
  mark: function (s, response) {
    return Number.isInteger(response) && response === s.correct;
  },
  summary: function (q) { return (q.term || 'pair') + ' · rotate claims'; }
};

/** @type {import("../types.js").GameEngine} */
const knowledgeflip = {
  /* No Explanation field in the editor. js/games.js worked this out from
     whether the style had a board engine, with bowl named as the board
     that does take one and two more named as the non-boards that do
     not. Declared, the board question stops being a proxy for it. */
  showsExplanation: false,
  boardEngine: board,
  defaults: {
    "scoreboard": false,
    "defaultTime": 0,
    "defaultPoints": 1,
    "scoreSlide": false,
    "confidence": false
  },
  starters,
  key: 'knowledgeflip',
  plays: ROOM_PLAY.board,
  label: 'Knowledge flip',
  icon: '↺',
  blurb: 'Keywords stay on the board. Choose one, explain aloud, then claim. No study timer.',
  mechanic: 'claim',
  input: 'choice',
  minOptions: 2,
  maxOptions: 2,
  fixedOptions: ['Claimed', 'Not yet'],
  make: function () {
    return {
      question: 'Osmosis',
      term: 'Osmosis',
      definition: 'Diffusion of water across a partially permeable membrane',
      studySeconds: 0
    };
  },
  normalize: function (q) {
    normalizePairQuestion(q);
    q.studySeconds = 0;
    return q;
  },
  problems: pairProblems,
  compile: function (q, st, s) { compilePairClaim(q, st, s, false); },
  mark: function (s, response) {
    return Number.isInteger(response) && response === s.correct;
  },
  summary: function (q) { return (q.term || 'keyword') + ' · always visible'; }
};

export { normalizePairQuestion, pairProblems, compilePairClaim, memoryflip, memorymatch, knowledgeflip };
