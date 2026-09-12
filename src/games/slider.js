/* SlideForge — games/slider. Edit source here; npm run build updates js/model.js. */
import { formatValue, withUnit } from "./marking.js";

/* Slider. An estimate rather than a choice: the room places a value on a
   line, and it counts if it lands inside the band the author allows. Being
   close is the skill being tested, so "close" is a number the author sets
   rather than something inferred. */
/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'min'|'max'|'target'|'tolerance'|'step'|'unit'>>} */
const slider = {
  key: 'slider',
  label: 'Slider',
  icon: '↔',
  blurb: 'Estimate a value on a line. Near enough counts.',
  mechanic: 'points',
  input: 'number',
  minOptions: 0,
  maxOptions: 0,
  fixedOptions: null,

  make: function () {
    return {
      question: 'Estimate the value.',
      min: 0,
      max: 100,
      step: 1,
      target: 50,
      tolerance: 5,
      unit: ''
    };
  },

  normalize: function (q) {
    var num = function (v, fallback) {
      var n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    q.min = num(q.min, 0);
    q.max = num(q.max, 100);
    /* A line that does not go anywhere cannot be answered, so an inverted or
       collapsed range is opened out rather than left to fail at showtime. */
    if (q.max <= q.min) q.max = q.min + 100;
    q.step = Math.max(0, num(q.step, 1));
    if (!q.step) q.step = 1;
    q.target = Math.min(q.max, Math.max(q.min, num(q.target, (q.min + q.max) / 2)));
    /* Tolerance is capped at the whole span: wider than the line would mark
       every possible answer right, which is not a question. */
    q.tolerance = Math.min(q.max - q.min, Math.max(0, num(q.tolerance, 0)));
    q.unit = String(q.unit == null ? '' : q.unit).slice(0, 12);
    delete q.options;
    delete q.correct;
    return q;
  },

  problems: function (q, n) {
    /* `|| ''` because String(undefined) is "undefined" — truthy — so the
       bare check called a question with no text valid. */
    if (!String(q.question || '').trim()) return 'Q' + n + ' has no question text';
    if (q.tolerance >= q.max - q.min) {
      return 'Q' + n + ' accepts the whole line — narrow the tolerance';
    }
    return null;
  },

  compile: function (q, settings, s) {
    s.question = q.question;
    s.min = q.min;
    s.max = q.max;
    s.step = q.step;
    s.target = q.target;
    s.tolerance = q.tolerance;
    s.unit = q.unit;
    s.answer = formatValue(q.target, q.unit);
    s.options = [];
    s.correct = -1;
  },

  mark: function (s, response) {
    if (typeof response !== 'number' || !Number.isFinite(response)) return false;
    /* A slide that reached the room without its band cannot mark anything
       right. The arithmetic already said so — NaN <= undefined is false —
       but by accident rather than on purpose, so it is said here instead. */
    if (typeof s.target !== 'number' || typeof s.tolerance !== 'number') return false;
    return Math.abs(response - s.target) <= s.tolerance;
  },

  summary: function (q) {
    /* The unit once, at the end: "206 ± 8 bones", not "206 bones ± 8 bones". */
    var band = q.tolerance
      ? formatValue(q.target) + ' ± ' + formatValue(q.tolerance)
      : formatValue(q.target) + ' exactly';
    return withUnit(band, q.unit);
  },

  describe: function (s, response) { return formatValue(response, s.unit); }
};

export { slider };
