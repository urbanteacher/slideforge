#!/usr/bin/env node
'use strict';
/* Builds "Why Does AI Make Things Up?" — a worked example of a lesson designed
 * around evidence rather than around slides.
 *
 *   node tools/demo-lesson.js            # writes the bundle next to the app
 *   node tools/demo-lesson.js --out /tmp # somewhere else
 *
 * Then in SlideForge: File → Import → From a file. The bundle format keeps
 * document ids, which single-file import deliberately does not — so the deck's
 * link to its embedded game survives.
 *
 * What it is demonstrating, and where to look for it:
 *
 *   Backward design      the exit task was written first; no slide delivers it
 *   Pretesting           slide 1, silent and uncollected — see its notes
 *   Predict-observe      slides 2 and 3 are one move split across two slides
 *   Modality             slides 4-6 are a diagram and three words; the
 *                        sentences are in the speaker notes, never on the wall
 *   Peer instruction     one question asked twice, the first vote-only
 *   Misconceptions       the distractors are the four wrong models students
 *                        actually arrive with, so the Adapt report can name
 *                        the one they picked
 *   Worked example       slide 8 annotated, slide 9 bare — the fade is the point
 *   Retrieval close      no summary slide; the notes say press B
 *
 * The diagrams are generated here as SVG data URIs so the bundle needs no
 * external files and stays small enough to read.
 */
const fs = require('node:fs');
const path = require('node:path');

global.window = global;
require(path.join(__dirname, '..', 'js', 'model.js'));
const SF = global.SF;

/* ---------------------------------------------------------------- diagrams */

const FONT = "font-family='Segoe UI,-apple-system,Inter,sans-serif'";
const INK = '#e8edf7', DIM = '#8fa0c0', HOT = '#5b9dff', WARM = '#e8a020', BAD = '#ff6b76';

function svg(inner, w, h) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + w + ' ' + h + "'" +
    " width='" + w + "' height='" + h + "'>" + inner + '</svg>');
}

/* All three are drawn at slide size and keep the bottom ~190px clear.
   layout-image is full-bleed with the label in a gradient overlaid at the
   foot — about 110px of it solid — so a diagram that uses its whole canvas
   gets its last row written over. The slides also ask for imageFit:contain,
   because the default 'cover' crops the sides once the sidebar narrows the
   image box, and a cropped diagram loses the part being explained. */
const W = 1280, H = 720;

/** A sentence with its last word missing, and the distribution over candidates. */
function diagramDistribution() {
  const bars = [['Paris', 0.62, HOT], ['Lyon', 0.14, DIM], ['Nice', 0.09, DIM],
    ['Berlin', 0.04, DIM], ['bicycle', 0.01, DIM]];
  let d = "<text x='150' y='150' " + FONT + " font-size='46' fill='" + INK + "'>The capital of France is</text>" +
    "<rect x='700' y='108' width='130' height='56' rx='9' fill='none' stroke='" + DIM + "' stroke-dasharray='7 6'/>" +
    "<text x='757' y='150' " + FONT + " font-size='40' fill='" + DIM + "'>?</text>";
  bars.forEach(function (b, i) {
    const y = 235 + i * 64;
    const w = Math.max(5, Math.round(b[1] * 560));
    d += "<text x='150' y='" + (y + 27) + "' " + FONT + " font-size='28' fill='" + INK + "'>" + b[0] + '</text>' +
      "<rect x='330' y='" + y + "' width='560' height='38' rx='7' fill='#ffffff14'/>" +
      "<rect x='330' y='" + y + "' width='" + w + "' height='38' rx='7' fill='" + b[2] + "'/>" +
      "<text x='" + (346 + w) + "' y='" + (y + 27) + "' " + FONT + " font-size='25' fill='" + DIM + "'>" +
      Math.round(b[1] * 100) + '%</text>';
  });
  return svg(d, W, H);
}

/** The same, five words later: each choice becomes part of the next input. */
function diagramLoop() {
  const toks = ['The', 'capital', 'of', 'France', 'is', 'Paris', ','];
  let d = '';
  toks.forEach(function (t, i) {
    const x = 130 + i * 150;
    const lit = i === 5;
    d += "<rect x='" + x + "' y='170' width='132' height='68' rx='11' fill='#ffffff10' stroke='" +
      (lit ? HOT : '#ffffff26') + "' stroke-width='2'/>" +
      "<text x='" + (x + 66) + "' y='214' " + FONT + " font-size='27' fill='" +
      (lit ? HOT : INK) + "' text-anchor='middle'>" + t + '</text>';
    if (i < toks.length - 1) {
      d += "<path d='M" + (x + 132) + ' 204 L' + (x + 148) + " 204' stroke='" + DIM + "' stroke-width='2.5'/>";
    }
  });
  d += "<path d='M896 246 C896 400 196 400 196 254' fill='none' stroke='" + HOT +
    "' stroke-width='3' stroke-dasharray='9 8'/>" +
    "<path d='M186 268 L196 248 L206 268' fill='none' stroke='" + HOT + "' stroke-width='3'/>" +
    "<text x='613' y='432' " + FONT + " font-size='30' fill='" + HOT + "' text-anchor='middle'>" +
    'its own output, back in as input</text>';
  return svg(d, W, H);
}

/** Two paths from one prompt. To the model they are the same kind of thing. */
function diagramPaths() {
  const d = "<rect x='120' y='265' width='260' height='76' rx='12' fill='#ffffff12' stroke='#ffffff2e' stroke-width='2'/>" +
    "<text x='250' y='313' " + FONT + " font-size='29' fill='" + INK + "' text-anchor='middle'>one prompt</text>" +
    "<path d='M380 303 C500 303 500 180 620 180' fill='none' stroke='" + WARM + "' stroke-width='4'/>" +
    "<path d='M380 303 C500 303 500 426 620 426' fill='none' stroke='" + BAD + "' stroke-width='4'/>" +
    "<rect x='620' y='142' width='430' height='76' rx='12' fill='none' stroke='" + WARM + "' stroke-width='3'/>" +
    "<text x='835' y='190' " + FONT + " font-size='29' fill='" + WARM + "' text-anchor='middle'>true, and likely</text>" +
    "<rect x='620' y='388' width='430' height='76' rx='12' fill='none' stroke='" + BAD + "' stroke-width='3'/>" +
    "<text x='835' y='436' " + FONT + " font-size='29' fill='" + BAD + "' text-anchor='middle'>false, and likely</text>" +
    "<text x='560' y='325' " + FONT + " font-size='72' fill='" + DIM + "' text-anchor='middle'>=</text>";
  return svg(d, W, H);
}

/* ------------------------------------------------------------------- game */

/* Peer instruction is one question asked twice. The first is vote-only: the
   split goes up, the answer does not, and "next" advances instead of
   revealing. The second resolves it and is the one that scores — the vote
   after the argument is the measurement. */
const STEM = 'A model is asked for a quotation from a novel it was trained on. ' +
  'It produces something that sounds right but is not in the book. Why?';

/* The distractors are the misconceptions, not filler: A is the data-coverage
   model, B is the retrieval model, D is the folk memory model. Wrong answers
   that concentrate on one of them tell the Adapt report which wrong model the
   room is holding. */
const OPTIONS = [
  'The quotation was missing from its training data',
  'It found the wrong passage',
  'It never stored the quotation — it generated a likely-sounding one',
  'It ran out of memory'
];

const WHY = 'It never stored the quotation. Every word is chosen for how likely ' +
  'it is to follow the ones before it, so a sentence that is plausible and one ' +
  'that is true are produced by exactly the same process. A assumes coverage ' +
  'and B assumes retrieval — both assume something was looked up.';

function buildGame() {
  const g = SF.makeGame('Peer instruction — the quotation', 'choice');
  g.theme = 'midnight';
  g.settings.defaultTime = 0;        // no countdown: thinking time is the point
  g.settings.intro = false;
  g.settings.scoreSlide = false;
  g.settings.scoreboard = true;
  g.settings.confidence = true;      // "sure and wrong" is this lesson's subject
  g.settings.explainStyle = 'inline';
  g.questions = [
    SF.normalizeQuestion({
      question: STEM, options: OPTIONS, correct: 2,
      voteOnly: true,
      notes: [
        'VOTE 1 — everyone commits privately, nobody is told the answer.',
        '',
        'Read the split aloud. Do not resolve it; the app will not either.',
        '',
        'If more than 70% have it, skip the discussion and move on — dwelling is',
        'wasted time. Otherwise: "find someone who chose differently and convince',
        'them." Two minutes. Then next slide to re-vote.',
        '',
        'The distractors are the four misconceptions. A is data-coverage, B is',
        'retrieval, D is the folk memory model. Which wrong one they pick matters',
        'more than how many are wrong.'
      ].join('\n')
    }, 'choice'),
    SF.normalizeQuestion({
      question: STEM, options: OPTIONS, correct: 2,
      explanation: WHY,
      notes: [
        'VOTE 2 — after the discussion. This one resolves and scores.',
        '',
        'The shift between the two splits is the measurement, not the final',
        'percentage. A peer who has just crossed the threshold explains it better',
        'than you can; you have forgotten what it is like not to know this.',
        '',
        'Check the presenter cue for "sure and wrong". A confident wrong answer',
        'here is a misconception to re-explain, not a gap to drill.'
      ].join('\n')
    }, 'choice')
  ];
  return SF.normalizeGame(g);
}

/* ------------------------------------------------------------------- deck */

function slide(type, props) {
  return Object.assign(SF.makeSlide(type), props);
}

function buildDeck(gameId, gameTitle) {
  const d = SF.makeDeck('Why Does AI Make Things Up?');
  d.theme = 'midnight';
  d.quiz.mode = 'individual';
  d.quiz.scoreboard = true;
  /* Last wall: the room’s scores, after the exit ticket. */
  d.finalScores = true;

  d.slides = [
    /* 0–5 min. One question, no title, no bullets. */
    slide('section', {
      title: 'An AI is asked for the population\nof a town of 400 people.\n\nWhat does it do?',
      notes: [
        'PRETEST — before any teaching. 5 minutes.',
        '',
        'Everyone writes an answer. Silently. No hands, no discussion. Then it',
        'goes face-down and is never collected.',
        '',
        'Deliberately NOT a live activity. Typing it into the app would collect it',
        'and write it to the session journal with names attached, which is the',
        'opposite of the design. Paper.',
        '',
        'Kornell: wrong guesses before instruction improve later encoding. The',
        'instinct to stop them learning it wrong is the wrong instinct here. It is',
        'also the only honest read on prior knowledge you will get before talking.'
      ].join('\n')
    }),

    /* 5–12 min, part one: the prompt alone. */
    slide('section', {
      title: '"Cite a peer-reviewed study on\nthe effect of sleep on exam results."',
      subtitle: 'Predict what it says. Write it down.',
      notes: [
        'PREDICT — show only this.',
        '',
        'They write a prediction before seeing anything. The commitment is',
        'load-bearing: without it they absorb the surprise and move on. With it,',
        'they have staked something and the mismatch has to be resolved.',
        '',
        'Two slides rather than an on-click reveal, on purpose — the transient',
        'information effect says material that appears and disappears costs more',
        'than material that just sits there.'
      ].join('\n')
    }),

    /* 5–12 min, part two: the output. */
    slide('quote', {
      body: 'Walker, M. & Chen, L. (2019). "Sleep duration and academic ' +
        'attainment in adolescents." Journal of Educational Psychology, 111(4), ' +
        '612–627.',
      subtitle: 'Fluent. Correctly formatted. Entirely invented.',
      notes: [
        'OBSERVE, then EXPLAIN.',
        '',
        'Reveal. Then: "whatever you predicted — why did it do that instead?"',
        'Two minutes with a neighbour.',
        '',
        'Do not explain it yet. This is the confrontation the misconceptions need;',
        'teaching over the top of them leaves them intact.',
        '',
        'The volume number and page range are the giveaway that it is generated,',
        'not retrieved — they are the shape of a citation, not a citation.'
      ].join('\n')
    }),

    /* 12–24 min. A diagram and three words. The sentences stay here. */
    slide('image', {
      title: 'It predicts the next word',
      image: diagramDistribution(),
      imageFit: 'contain',
      imageAlt: 'A sentence with its final word missing, beside a bar chart of ' +
        'candidate next words with probabilities.',
      notes: [
        'MECHANISM 1 of 3. You talk; the slide holds the picture.',
        '',
        'Say: it is not looking anything up. It has one job — given everything so',
        'far, how likely is each possible next word. That is the whole operation.',
        '',
        'Mayer\'s modality effect: a graphic plus narration spreads load across two',
        'channels; a graphic plus the same words on screen collides in one. Do not',
        'put these sentences on the wall and read them.'
      ].join('\n')
    }),

    slide('image', {
      title: 'Then does it again',
      image: diagramLoop(),
      imageFit: 'contain',
      imageAlt: 'A row of word tokens with an arrow feeding the chosen word back ' +
        'in as part of the next input.',
      notes: [
        'MECHANISM 2 of 3.',
        '',
        'Say: whatever it picks becomes part of the input for the next choice. A',
        'sentence is that loop run a few hundred times. Nothing checks back',
        'against a source, because there is no source to check.',
        '',
        'This is where "there is no database inside it" becomes concrete rather',
        'than asserted.'
      ].join('\n')
    }),

    slide('image', {
      title: 'True and false look the same',
      image: diagramPaths(),
      imageFit: 'contain',
      imageAlt: 'Two paths leaving one prompt, one labelled true and likely, the ' +
        'other false and likely, joined by an equals sign.',
      notes: [
        'MECHANISM 3 of 3 — THE THRESHOLD SLIDE.',
        '',
        'Built so the point is visible rather than claimed: both paths are just',
        '"likely continuation". Truth is not a property the mechanism can see.',
        '',
        'Say nothing else here. Let them look at it.',
        '',
        'This is the slide to watch the pace signal on. If the room taps "lost"',
        'anywhere, it will be here — and the session report groups signals by',
        'slide, so you will know afterwards even if you miss it live.'
      ].join('\n')
    }),

    /* 24–32 min. The vote pair. */
    slide('game', {
      title: gameTitle,
      gameTitle: gameTitle,
      gameId: gameId,
      notes: [
        'PEER INSTRUCTION — two votes on the same question.',
        '',
        'The first is marked vote-only: the split goes up, the answer does not,',
        'and next advances rather than revealing. The second resolves it.',
        '',
        'The vote split is the diagnostic data — that is the real reason to run it.',
        'The discussion is where the learning happens.'
      ].join('\n')
    }),

    /* 32–43 min. Worked, then faded. */
    slide('cards', {
      title: 'Where did each claim come from?',
      bullets: [
        '"Studies consistently show…" — the shape of an evidence claim, with no evidence behind it. A likely opening.',
        '"…a 23% improvement…" — a plausible-looking number. Precision is cheap to generate and reads as authority.',
        '"…(Harrison, 2021)" — a citation-shaped object. Author, year, no paper.'
      ],
      notes: [
        'WORKED EXAMPLE. Trace each claim back to the mechanism, out loud.',
        '',
        'This is the fully-supported version. The next slide withdraws the support',
        'on purpose.',
        '',
        'No ink in this app, so annotate by pointing and talking rather than',
        'drawing — or pre-mark a screenshot if you would rather it were visible.'
      ].join('\n')
    }),

    slide('quote', {
      body: 'Recent work in cognitive science has established that spaced ' +
        'repetition improves retention by roughly 40% compared with massed ' +
        'practice (Bell & Okafor, 2020), particularly in adolescent learners.',
      subtitle: 'Your turn. Same three questions.',
      notes: [
        'FADED. No annotations. They do it.',
        '',
        'Expertise reversal is the reason: scaffolding that helps a novice',
        'obstructs someone who has already built the schema — they have to',
        'reconcile your walkthrough with a model they already hold. Support that',
        'does not withdraw becomes an obstacle. The fade is the point.'
      ].join('\n')
    }),

    /* 43–52 min. Join on the wall, then the exit task on the same slide. */
    slide('join', {
      title: 'Three outputs. Which is which?',
      bullets: [
        'Right.',
        'Confidently wrong.',
        'Right, for the wrong reason.'
      ],
      subtitle: 'Identify each, and explain how the mechanism produced it.',
      feedback: SF.normalizeFeedback({
        kind: 'scale',
        prompt: 'Could you explain to someone else why a model can be fluent and wrong?',
        points: 5,
        lowLabel: 'Not yet',
        highLabel: 'Confidently',
        presentAs: 'focus'
      }),
      notes: [
        'APPLICATION. Host live first so this slide shows the real QR and PIN.',
        'Phones join here; the written task is the three lines on the wall.',
        '',
        'Individually first, then pairs. Circulate and listen rather than teach.',
        '',
        'This is the task the whole lesson was built backwards from. Note that no',
        'slide could deliver it — the deck only stages it.',
        '',
        'Encoding specificity: they will meet AI output in the wild as',
        'undifferentiated confident text, so that is the form the practice takes.',
        '',
        'Circulating is the only real defence against the expert blind spot.',
        'Hinds: experts systematically underestimate novice difficulty, and',
        'knowing about the bias does not correct it. Watching someone attempt it',
        'does.',
        '',
        'The scale is a diagnostic, not a summary.',
        '',
        'NEXT is Final scores — the room sees how they did. After that, press B',
        'to blank if you want silence before they leave. Do not add a spoken',
        'summary slide: a summary is one more exposure, and exposure produces',
        'fluency, which reads as learning and is not. Ask for three sentences',
        'from memory instead if you still want production without a recap.'
      ].join('\n')
    })
  ];

  return SF.normalizeDeck(d);
}

/* ------------------------------------------------------------------ export */

function buildBundle() {
  const game = buildGame();
  const deck = buildDeck(game.id, game.title);
  return {
    kind: 'slideforge-bundle',
    version: 1,
    exported: new Date().toISOString(),
    decks: [deck],
    games: [game]
  };
}

module.exports = { buildBundle: buildBundle };

if (require.main === module) {
  const outDir = (function () {
    const i = process.argv.indexOf('--out');
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : path.join(__dirname, '..');
  })();

  const bundle = buildBundle();
  const file = path.join(outDir, 'why-does-ai-make-things-up.sfbundle.json');
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2));

  const deck = bundle.decks[0];
  const game = bundle.games[0];
  const notes = deck.slides.filter(function (s) { return String(s.notes || '').trim(); }).length;
  console.log('Wrote ' + file);
  console.log('  ' + deck.slides.length + ' slides, ' + notes + ' carrying speaker notes');
  console.log('  ' + game.questions.length + ' vote questions (' +
    game.questions.filter(function (q) { return q.voteOnly; }).length + ' vote-only)');
  console.log('');
  console.log('In SlideForge: File → Open demo lesson (one click).');
  console.log('Or File → Import → From a file, and pick the .sfbundle.json.');
}
