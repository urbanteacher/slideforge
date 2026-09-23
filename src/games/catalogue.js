/* SlideForge — games/catalogue. Edit source here; npm run build updates js/model.js. */
import { GAME_STYLES } from "./registry.js";

/* Every way a room can answer. The phone switches control on this, the
   relay validates the response against it, and it is the one thing a new
   style has to pick from an existing set rather than invent. */
/**
 * What a catalogue format calls itself, and what it calls its fields.
 *
 * Several formats share one engine — Predict the Outcome, Spot the Error
 * and Odd One Out are all multiple choice underneath — and that is the
 * point: one marking path, one relay shape, one set of tests. But the
 * engine's own wording ("Answers — pick the correct one") erases the
 * format, so a teacher who chose "Spot the Error" found themselves editing
 * a generic question and could not tell the two apart.
 *
 * Declared as data rather than code, and only the parts that differ. The
 * same idea as the manualEntryFields in the catalog app's per-game configs,
 * kept to labels and hints because the fields themselves are the engine's.
 */
var FORMATS = {
  'predict-outcome': { label: 'Predict the outcome',
    answersLabel: 'Possible outcomes — mark the likely one',
    answersHint: 'Three futures reads better than four. The value is in committing before you know.' },
  'spot-the-error': { label: 'Spot the error',
    answersHint: 'One sentence, one mistake. The room taps the wrong word on their phones; nothing on the wall points at it.' },
  'odd-one-out': { label: 'Odd one out',
    answersLabel: 'The four items — mark the prepared odd one',
    answersHint: 'Four equal tiles for discussion. The marked odd one and explanation are for the reveal — accept other defensible rules.' },
  'low-stakes-quiz': { label: 'Low-stakes quiz',
    answersHint: 'Questions stay on the board; answers stay hidden until the quiz clock ends. Learners write on paper — no phone scoring.' },
  'beat-the-clock': { label: 'Beat the clock',
    answersHint: 'Short countdown. Correct answers score 10 plus remaining seconds ÷ 10; wrong answers cost 5.' },
  'true-false': { label: 'True / false showdown',
    answersHint: 'Fast retrieval. Use a short countdown — 10 to 30 seconds — not a Beat the Clock round.' },
  'truefalse': { label: 'True or false',
    answersHint: 'A statement and two pads. Mark whether it is true or false.' },
  'horse-race': { label: 'Horse race' },
  'boss-battle': { label: 'Boss battle',
    answersHint: 'Set difficulty on each question — that is the damage a hit deals to the shared boss.' },
  'definition-challenge': { label: 'Definition challenge',
    answersHint: 'Passage for reading, then a recall question. Accepted spellings mark the typed answer.' },
  'emoji-guess': { label: 'Emoji guess',
    answersHint: 'The symbols go in the question. Accept the spellings a learner will actually type.' },
  'fill-in-the-blanks': { label: 'Fill in the blanks',
    answersHint: 'Write the passage with each missing word in [square brackets], up to four, and add a few lures. Phones tap a word into each gap.' },
  'time-traveler': { label: 'Time traveler',
    answersHint: 'Name the event; the year is the answer. Phones place it on a timeline, and each round adds it to the line.' },
  'ranking': { label: 'Ranking challenge',
    answersHint: 'Part marks: each item in the right place scores. Full set is 10 points.' },
  'word-reveal': { label: 'Word reveal',
    answersHint: 'Letters drip onto the wall. Guessing with fewer letters shown scores more.' },
  'memory-flip': { label: 'Memory flip',
    answersHint: 'Study the pairs, then claim. Host marks each claim for +1.' },
  'memory-match': { label: 'Memory match',
    answersHint: 'Same pairs as Memory Flip; claims rotate between teams.' },
  'knowledge-flip': { label: 'Knowledge flip',
    answersHint: 'Keywords stay visible. Explain, then claim for +1.' },
  'heads-up': { label: 'Heads up',
    answersHint: 'Describe the term without saying it. Mark Correct or Pass; the round counts how many the guesser gets.' },
  'spin-explain': { label: 'Spin & explain',
    answersHint: 'Clear explanation scores one question’s worth for the speaker’s team; with a hint, half; reject, nothing. Individual play counts unless you switch scoring on.' },
  'connection-maker': { label: 'Connection maker',
    answersHint: 'Two ideas and a spoken bridge. Accept credits the speaker’s team; individual play counts.' },
  'concept-chain': { label: 'Concept chain',
    answersHint: 'Grow a justified chain from each start term. Type the spoken link, then Accept — the chain grows on the wall and the speaker’s team is credited.' },
  'quiz-bowl': { label: 'Quiz bowl',
    answersHint: 'Category and point value on each cell. Correct scores that value.' },
  'bingo': { label: 'Bingo',
    answersHint: 'Fill the term bank. A complete line wins — no points.' },
  'random-challenge': { label: 'Random challenge',
    answersHint: 'Draw varied open challenges. Count attempts — no competitive scoreboard.' },
  'compare-contrast': { label: 'Compare & contrast',
    answersHint: 'Two equal items for discussion. Similarities and differences are for the reveal — no score.' },
  'question-cube': { label: 'Question cube',
    answersHint: 'Roll a prompt; open class discussion. No score.' }
};

function gameFormat(key) { return FORMATS[key] || null; }

/**
 * Catalogue format → engine style.
 *
 * The library picks a format; the engine is how it plays. Old Lesson Planner
 * mapped slug → component the same way. Without this, Game settings listed
 * every engine and a Beat the Clock run could be switched to Memory Flip
 * while the title still said Beat the Clock.
 */
var FORMAT_STYLE = {
  'choice': 'choice',
  'truefalse': 'truefalse',
  'type': 'type',
  'slider': 'slider',
  'true-false': 'truefalse',
  'low-stakes-quiz': 'lowstakes',
  'quiz-bowl': 'bowl',
  'beat-the-clock': 'speed',
  'boss-battle': 'boss',
  'horse-race': 'race',
  'memory-flip': 'memoryflip',
  'memory-match': 'memorymatch',
  'knowledge-flip': 'knowledgeflip',
  'definition-challenge': 'definition',
  'emoji-guess': 'emoji',
  'word-reveal': 'wordreveal',
  /* Its own engine since 23 Sep 2026: a word bank tapped into gaps. */
  'fill-in-the-blanks': 'fill',
  'heads-up': 'headsup',
  'spin-explain': 'spinexplain',
  /* Its own engine since 23 Sep 2026: tap the wrong word, not pick a phrase. */
  'spot-the-error': 'spot',
  'ranking': 'order',
  'odd-one-out': 'oddone',
  'predict-outcome': 'choice',
  /* A slider on a year scale since 23 Sep 2026: place the event in time. */
  'time-traveler': 'slider',
  'connection-maker': 'connection',
  'random-challenge': 'randomchallenge',
  'concept-chain': 'conceptchain',
  'bingo': 'bingo',
  'compare-contrast': 'compare',
  'question-cube': 'choice'
};

/** Engines offered when a game has no catalogue format (blank quiz).
    Specialized games (True/False, Beat the Clock, Boss…) come from the
    library and stay locked — switching them here was how True/False settings
    sprouted a Beat the Clock picker. */
var CORE_STYLES = ['choice', 'type', 'slider', 'order'];

/** Styles that are activities in their own right, not blank-quiz engines. */
var SPECIAL_STYLES = [
  'truefalse', 'race', 'speed', 'boss', 'wordreveal',
  'memoryflip', 'memorymatch', 'knowledgeflip',
  'headsup', 'spinexplain', 'connection', 'conceptchain',
  'randomchallenge', 'bingo', 'bowl', 'lowstakes', 'emoji', 'definition', 'oddone', 'compare', 'spot', 'fill'
];

function formatStyle(formatKey) {
  var s = FORMAT_STYLE[formatKey];
  return s && GAME_STYLES[s] ? s : null;
}

function isSpecialStyle(styleKey) {
  return SPECIAL_STYLES.indexOf(styleKey) > -1;
}

var INPUTS = ['choice', 'text', 'number', 'order', 'tap', 'fill'];

export { FORMATS, gameFormat, FORMAT_STYLE, CORE_STYLES, SPECIAL_STYLES, formatStyle, isSpecialStyle, INPUTS };
