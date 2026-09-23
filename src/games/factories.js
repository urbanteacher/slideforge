import { DEFAULT_THEME } from '../themes.js';
import sampleQuiz from "../samples/quiz.json" with { type: "json" };
/* SlideForge — games/factories. Edit source here; npm run build updates js/model.js. */
import { uid } from "../core/identity.js";
import { gameStyle, GAME_STYLES } from "./registry.js";

/**
 * @typedef {import("../types.js").Question} Question
 * @typedef {import("../types.js").Game} Game
 * @typedef {import("../types.js").GameStyleKey} GameStyleKey
 */

/**
 * A blank question: the fields every style shares, plus whatever this
 * style's own make() adds on top.
 *
 * @param {GameStyleKey} [style] defaults to choice
 * @returns {Question}
 */
function makeQuestion(style) {
  var base = {
    id: uid(),
    timeLimit: null,       // null = inherit the game default
    points: null,          // null = inherit the game default
    image: '',
    imageAlt: '',        // described to the phones and any screen reader
    /* 'band'    question above, image below it, answers under
       'first'   image first, question in its own box beneath it
       'overlay' image leads, question sits on it behind a gradient */
    imageLayout: 'band',
    notes: '',
    /* What kind of thinking this question asks for. Per question, not per
       game: a quiz that checks recall and then application is exactly the
       shape the Adapt report can say something useful about, and it cannot
       if every question in the game shares one level. */
    bloom: '',
    /* Collect the vote and never show the answer.
       For peer instruction: the room commits, the split goes up, nobody is
       told who was right, they argue, and the *second* question of the pair
       is the one that resolves. Without this the app reveals as soon as
       everyone has answered and there is nothing left to discuss. */
    voteOnly: false,
    /* Shown after the answer is revealed. A multiple-choice answer is often
       one or two words, which teaches very little on its own. */
    explanation: '',
    source: ''             // optional "where to read more"
  };
  return Object.assign(base, gameStyle(style).make());
}

/**
 * A new game, with one blank question or the style's starter bank.
 *
 * @param {string} [title]
 * @param {GameStyleKey} [style] defaults to choice
 * @returns {Game}
 */
function makeGame(title, style) {
  style = style && GAME_STYLES[style] ? style : 'choice';
  /** @type {Game} */
  var g = {
    id: uid(),
    kind: 'game',
    style: style,
    title: title || 'Untitled game',
    theme: DEFAULT_THEME,
    libraryGroup: '',
    sourceDeckId: '',
    created: Date.now(),
    modified: Date.now(),
    settings: {
      mode: 'individual',
      teams: [{ name: 'Red' }, { name: 'Blue' }, { name: 'Green' }, { name: 'Yellow' }],
      scoreboard: true,
      defaultTime: 20,
      defaultPoints: 1000,
      intro: true,           // opening "get ready" slide
      /* The rules of the format, on the wall. The old app kept these in a
         sidebar the room never saw, so a class met a new game by being
         talked through it while the teacher read from their own screen. */
      howTo: true,           // "how to play" slide before the first question
      scoreSlide: true,      // closing score slide
      /* 'inline'  expand it inside the correct answer's box on reveal
         'slide'   a dedicated full-screen slide after the question
         'both'    inline first, then the slide for the detail */
      explainStyle: 'inline',
      /* Horse race only: steps to the finish line. */
      trackLength: 5,
      /* Ask each player how sure they were, after their answer is in. Never
         scored — it tells the teacher which wrong answers were confident. */
      confidence: true,
      resultsOnReveal: false,
      /* A bed under the thinking time. Referenced, not embedded, for the
         same reason as video — and it plays on the projector only. Sending
         it to the phones would be twenty speakers a beat apart. */
      music: '',
      musicVolume: 55
    },
    questions: [makeQuestion(style)]
  };
  const engine = gameStyle(style);
  Object.assign(g.settings, engine.defaults || {});
  if (engine.starters) {
    // Each document owns its arrays; authoring must never edit the shared bank.
    g.questions = JSON.parse(JSON.stringify(engine.starters)).map(row =>
      Object.assign(makeQuestion(style), row)
    );
  }
  return g;
}

/** The sample quiz a first-time user opens. @returns {Game} */
function starterGame() {
  var g = makeGame('Sample quiz');
  g.settings.mode = 'teams';
  g.settings.teams = [{ name: 'Red' }, { name: 'Blue' }];
  g.questions = JSON.parse(JSON.stringify(sampleQuiz)).map(question =>
    Object.assign({ id: uid() }, question)
  );
  return g;
}

export { makeQuestion, makeGame, starterGame };
