/* The scenarios tools/record-sessions/record.mjs records.
 *
 * `build` runs inside the host page (it is serialised, so it must not close
 * over anything here). It builds a deck with the app's own factories and
 * hosts it with SF.Live.host, as the Library's Host live does, and returns a
 * short description of what it hosted for the fixture's `deck` field.
 *
 * Default for every scenario: three phones (Ada, Bo, Cy) joining, Bo dropping
 * on the first question and rejoining with his resume token, the teacher
 * window open with one teacher-entered learner (Dee) whose first answer is
 * recorded by key (manualAnswer), plus one manualAnswer the relay refuses
 * (a phone's row), then the session journal fetched at the end. */

/* The 30 formats of src/games/catalogue.js FORMAT_STYLE, with their engine. */
export const FORMATS = {
  'choice': 'choice', 'truefalse': 'truefalse', 'type': 'type', 'slider': 'slider',
  'true-false': 'truefalse', 'low-stakes-quiz': 'lowstakes', 'quiz-bowl': 'bowl',
  'beat-the-clock': 'speed', 'boss-battle': 'boss', 'horse-race': 'race',
  'memory-flip': 'memoryflip', 'memory-match': 'memorymatch', 'knowledge-flip': 'knowledgeflip',
  'definition-challenge': 'definition', 'emoji-guess': 'emoji', 'word-reveal': 'wordreveal',
  'fill-in-the-blanks': 'fill', 'heads-up': 'headsup', 'spin-explain': 'spinexplain',
  'spot-the-error': 'spot', 'ranking': 'order', 'odd-one-out': 'oddone',
  'predict-outcome': 'choice', 'time-traveler': 'slider', 'connection-maker': 'connection',
  'random-challenge': 'randomchallenge', 'concept-chain': 'conceptchain', 'bingo': 'bingo',
  'compare-contrast': 'compare', 'question-cube': 'randomchallenge'
};

function hostGame(a) {
  const g = SF.getShowcaseGame({ style: a.style, format: a.format, questions: [] }, { forceSample: true });
  g.format = a.format;
  if (a.teams) {
    g.settings.mode = 'teams';
    g.settings.teams = [{ name: 'Red' }, { name: 'Blue' }];
  }
  if (a.settings) Object.assign(g.settings, a.settings);
  SF.GameStore.save(g);
  const deck = SF.gameToRunDeck(g);
  deck.slides.forEach((s) => { s.transition = 'none'; });
  SF.Live.host(deck);
  return {
    format: a.format, style: g.style, title: g.title, mode: g.settings.mode,
    teams: g.settings.mode === 'teams' ? g.settings.teams.map((t) => t.name) : [],
    questions: g.questions.length,
    slides: deck.slides.map((s) => s.type + (s.style ? ':' + s.style : '') + (s.input && s.input !== 'choice' ? ':' + s.input : ''))
  };
}

function hostFeedback(a) {
  const d = SF.makeDeck('Feedback ' + a.kind);
  const open = SF.makeSlide('title');
  open.title = 'Feedback: ' + a.kind;
  const ask = SF.makeSlide('content');
  ask.title = 'Check in';
  ask.feedback = SF.makeFeedback(a.kind);
  ask.feedback.prompt = a.prompt;
  if (a.kind === 'poll') ask.feedback.options = ['Yes', 'No', 'Not sure'];
  if (a.kind === 'brainstorm' || a.kind === 'wordcloud') ask.feedback.max = 2;
  const after = SF.makeSlide('content');
  after.title = 'Thanks';
  d.slides = [open, ask, after];
  d.slides.forEach((s) => { s.transition = 'none'; });
  SF.Store.save(d);
  const run = SF.buildRunDeck(d, (id) => SF.GameStore.get(id));
  SF.Live.host(run);
  return { kind: a.kind, feedback: ask.feedback, slides: run.slides.map((s) => s.type) };
}

function hostActivity(a) {
  const d = SF.makeDeck('Activity ' + a.key);
  const act = SF.Activities.activity(a.key);
  d.slides = SF.Activities.makeSlides(act).map((s) => Object.assign(s, { transition: 'none' }));
  SF.Store.save(d);
  const run = SF.buildRunDeck(d, (id) => SF.GameStore.get(id));
  SF.Live.host(run);
  return {
    activity: a.key, target: act.target, title: act.title,
    slides: run.slides.map((s) => s.type + (s.feedback ? ':' + s.feedback.kind : '') +
      (s.activityPresentation ? ':staged' : ''))
  };
}

function hostRounds() {
  const make = (style, format) => {
    const g = SF.getShowcaseGame({ style, format, questions: [] }, { forceSample: true });
    g.format = format;
    g.questions = g.questions.slice(0, 2);
    SF.GameStore.save(g);
    return g;
  };
  const g1 = make('choice', 'choice');
  const g2 = make('truefalse', 'truefalse');
  const d = SF.makeDeck('Two rounds');
  const t = SF.makeSlide('title');
  t.title = 'Two rounds';
  const e1 = SF.makeSlide('game'); e1.gameId = g1.id; e1.gameTitle = g1.title;
  const mid = SF.makeSlide('content'); mid.title = 'Between rounds';
  const e2 = SF.makeSlide('game'); e2.gameId = g2.id; e2.gameTitle = g2.title;
  d.slides = [t, e1, mid, e2];
  SF.Store.save(d);
  const run = SF.buildRunDeck(d, (id) => SF.GameStore.get(id));
  run.slides.forEach((s) => { s.transition = 'none'; });
  SF.Live.host(run);
  return { games: [g1.style, g2.style], slides: run.slides.map((s) => s.type + (s.style ? ':' + s.style : '')) };
}

const DEFAULT_PHONES = { Bo: { dropOn: 1 } };

function gameScenario(format, extra = {}) {
  const style = FORMATS[format];
  return Object.assign({
    name: 'game-' + format,
    kind: 'game',
    covers: { format, style },
    description: `Game format "${format}" (engine ${style}) from its showcase starter: 3 phones, Bo reconnects on Q1, teacher-entered learner answered by key, journal.`,
    build: hostGame,
    args: { format, style },
    phoneOpts: DEFAULT_PHONES
  }, extra);
}

const games = Object.keys(FORMATS).map((format) => {
  if (format === 'beat-the-clock') {
    return gameScenario(format, {
      description: 'Beat the Clock, self-paced sprint (K29): the relay marks each phone\'s taps from the key the host hands it in `sprint`. No teacher-entered learner, because one turns the sprint off (js/live.js sprintSlide). Bo drops on sprint question 2 and rejoins.',
      manual: false,
      phoneOpts: { Bo: { dropOnSprint: 2 } },
      quietMs: 1200
    });
  }
  return gameScenario(format);
});

const extras = [
  Object.assign(gameScenario('choice'), {
    name: 'game-choice-teams',
    covers: { format: 'choice', style: 'choice', teams: true },
    description: 'Multiple choice in a two-team room: phones are refused an untagged join and rejoin with a team; the teacher-entered learner is added to team 0.',
    args: { format: 'choice', style: 'choice', teams: true }
  }),
  Object.assign(gameScenario('beat-the-clock'), {
    name: 'game-beat-the-clock-wall-paced',
    covers: { format: 'beat-the-clock', style: 'speed', sprint: false },
    description: 'Beat the Clock with a teacher-entered learner in the room, which keeps it wall-paced (no sprint): questions, manualAnswer and reconnect as for the other styles.',
    manual: true,
    phoneOpts: DEFAULT_PHONES
  }),
  {
    name: 'rounds-two-games',
    kind: 'rounds',
    covers: { rounds: true },
    description: 'A deck holding two games (choice, then true/false): `round` per game. Eve joins after the first question has opened, is held (`waiting`), and is admitted when round 2 opens.',
    build: hostRounds,
    phoneOpts: DEFAULT_PHONES,
    async onQuestion(ctx) {
      if (ctx.n !== 1) return;
      const eve = new ctx.Phone(ctx.rec, 'Eve', ctx.port, { index: 3 });
      ctx.phones.push(eve);
      ctx.rec.step('late join', { name: 'Eve' });
      await eve.join(ctx.pin);
    }
  }
];

const FEEDBACK = {
  poll: 'Ready to move on?',
  wordcloud: 'One word for today',
  brainstorm: 'What would you try first?',
  scale: 'How confident are you?'
};
const feedback = Object.entries(FEEDBACK).map(([kind, prompt]) => ({
  name: 'feedback-' + kind,
  kind: 'feedback',
  covers: { feedback: kind },
  description: `An authored ${kind} on a content slide: the prompt opens as the slide comes up, three phones reply, Bo drops while it is open and rejoins (the prompt and his reply are handed back), the teacher-entered learner is in the room, journal.`,
  build: hostFeedback,
  args: { kind, prompt },
  phoneOpts: { Bo: { dropOnPrompt: 1 } }
}));
feedback.push({
  name: 'feedback-quick-poll',
  kind: 'feedback',
  covers: { feedback: 'poll', impromptu: true },
  description: 'Impromptu quick poll and quick word cloud (SF.Player.quickPoll), asked over a plain deck mid-lesson and ended by the teacher.',
  build: (a) => {
    const d = SF.makeDeck('Quick poll');
    d.slides = ['One', 'Two'].map((t) => { const s = SF.makeSlide('content'); s.title = t; s.transition = 'none'; return s; });
    SF.Store.save(d);
    SF.Live.host(SF.buildRunDeck(d, (id) => SF.GameStore.get(id)));
    return { slides: ['content', 'content'] };
  },
  phoneOpts: { Bo: { dropOnPrompt: 2 } },
  async afterBegin(ctx) {
    ctx.rec.step('quick poll start');
    await ctx.page.evaluate(() => SF.Player.quickPoll({
      action: 'start', kind: 'poll', prompt: 'Another example, or move on?',
      options: ['Another example', 'Move on'], presentAs: 'focus'
    }));
    await new Promise((r) => setTimeout(r, 2500));
    ctx.rec.step('quick poll end');
    await ctx.page.evaluate(() => SF.Player.quickPoll({ action: 'end' }));
    await new Promise((r) => setTimeout(r, 800));
    ctx.rec.step('quick word cloud start');
    await ctx.page.evaluate(() => SF.Player.quickPoll({
      action: 'start', kind: 'wordcloud', prompt: 'One word for that example', presentAs: 'rail'
    }));
    await new Promise((r) => setTimeout(r, 2500));
    ctx.rec.step('quick word cloud end');
    await ctx.page.evaluate(() => SF.Player.quickPoll({ action: 'end' }));
    await new Promise((r) => setTimeout(r, 800));
  }
});

/* A spread of targets and stage jobs: a staged moment with a private note
   (think-pair-share), a held self-assessment poll, a word cloud, a scale,
   brainstorms, a split-layout prediction, other timed moments and a
   slide-arc. */
const ACTIVITY_KEYS = [
  'think-pair-share', 'structured-reflection-protocol', 'word-splash', 'reflection-ladder',
  'exit-ticket', 'hook-and-predict', 'muddiest-point', 'do-now-bell-ringer',
  'jigsaw-expert-groups', 'socratic-seminar', 'flipped-instruction', 'think-pair-square-share'
];
const activities = ACTIVITY_KEYS.map((key) => ({
  name: 'activity-' + key,
  kind: 'activity',
  covers: { activity: key },
  description: `Activity "${key}" from SF.Activities.makeSlides, stepped through stage by stage with three phones answering whatever it asks (notes, replies), Bo dropping on its first prompt or at stage 2 (whichever comes first), the teacher-entered learner in the room, journal.`,
  build: hostActivity,
  args: { key },
  phoneOpts: { Bo: { dropOnPrompt: 1, dropOnStage: 1 } },
  maxSteps: 60
}));

export const SCENARIOS = [...games, ...extras, ...feedback, ...activities];
