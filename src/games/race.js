/* SlideForge — games/race. Edit source here; npm run build updates js/model.js. */
import { choice } from "./choice.js";

/* Horse race asks exactly the same thing as multiple choice — the whole
   difference is what happens to the answer. So it borrows choice's question
   shape wholesale rather than duplicating it, and only declares a different
   mechanic. Defined after the literal so it can reference choice. */
/** @type {import("../types.js").GameEngine<import("../types.js").QuestionWith<'options'|'correct'>>} */
const race = {
  key: 'race',
  label: 'Horse race',
  icon: '🏇',
  blurb: 'Multiple choice, but every right answer moves your team a step along the track. First past the post wins.',
  mechanic: 'race',
  input: 'choice',
  minOptions: 2,
  maxOptions: 6,
  fixedOptions: null,
  make: function () { return choice.make(); },
  normalize: function (q) { return choice.normalize(q); },
  problems: function (q, n) { return choice.problems(q, n); },
  compile: function (q, st, s) { choice.compile(q, st, s); },
  mark: function (s, response) { return choice.mark(s, response); },
  summary: function (q) { return choice.summary(q); }
};

export { race };
