/*
 * The activity catalogue: what a teacher picks from, and what picking it builds.
 *
 * This is data, not behaviour. Choosing an entry does not run anything — it
 * says which of four things to make, and `js/studio.js` does the making:
 *
 *   game      a quiz game, created by SF.Editor.insertNewGame(style, preset)
 *   feedback  an audience prompt attached to the slide already on screen
 *   slide     an ordinary deck slide in a particular layout
 *   moment    a slide carrying a timed protocol, run by SF.LessonMoments
 *
 * `category` is what the activity does to the room and is what the existing
 * library filters on. `phase` is where it sits in a lesson, and is what the
 * activities workspace groups by. They are different questions: Low-Stakes
 * Quiz checks understanding (category) but belongs at the start of a lesson
 * as retrieval (phase).
 *
 * There is deliberately no `research` field. The catalogue these entries came
 * from records name, duration, description and steps — it carries no citation
 * data at all, and the Rosenshine / EEF / Voice 21 attributions that appear in
 * docs/pedagogy-architecture-and-catalogue.md were written alongside it rather
 * than drawn from it. A citation a teacher might repeat to a head of
 * department should be sourced before it is stored, so the field is left for
 * whoever can source it.
 */

/**
 * @typedef {import("../types.js").Activity} Activity
 * @typedef {import("../types.js").Phase} Phase
 * @typedef {import("../types.js").PhaseKey} PhaseKey
 */

/** Ordered phases of a lesson. The activities workspace groups by these. */
/** @type {Phase[]} */
const PHASES = [
  { key: 'starter',     label: 'Starter',       icon: '◎', blurb: 'Settle the room and pull back what they already know.' },
  { key: 'activate',    label: 'Activate',      icon: '✦', blurb: 'Surface prior thinking, including the wrong kind.' },
  { key: 'construct',   label: 'Construct',     icon: '◧', blurb: 'Build the idea: model it, take it apart, show the errors.' },
  { key: 'collaborate', label: 'Collaborate',   icon: '▦', blurb: 'Make them say it out loud to somebody.' },
  { key: 'check',       label: 'Check',         icon: '?',      blurb: 'Find out who has it, while there is still time to act.' },
  { key: 'reflect',     label: 'Reflect',       icon: '↺', blurb: 'Close the loop: what stuck, what did not.' }
];

/**
 * Every activity the library offers.
 *
 * The first block is the existing set from js/studio.js, unchanged in key,
 * icon, title, blurb and category so the current modal keeps working, with
 * phase and a planning estimate added. The second block is new: timed
 * classroom protocols that have no screen component beyond a prompt and a
 * countdown, which is the gap that made the library look like a quiz picker.
 *
 * `minutes` is a planning estimate for the phase rail, not a timer. Nothing
 * reads it at runtime.
 */
/** @type {Activity[]} */
const ACTIVITIES = [
  { key: 'choice', icon: '?', title: 'Multiple choice', blurb: 'Check an idea. Discuss the why.', category: 'check', phase: 'check', target: 'game' },
  { key: 'truefalse', icon: '½', title: 'True / False', blurb: 'Uncover a common misconception.', category: 'check', phase: 'check', target: 'game' },
  { key: 'type', icon: 'Aa', title: 'Type answer', blurb: 'Recall it without the clues — no options to pick from.', category: 'check', phase: 'check', target: 'game' },
  { key: 'slider', icon: '↔', title: 'Slider', blurb: 'Estimate a value on a line — near enough counts.', category: 'check', phase: 'check', target: 'game' },
  { key: 'poll', icon: '▤', title: 'Poll', blurb: 'Take the pulse of the room.', category: 'feedback', phase: 'check', target: 'feedback' },
  { key: 'wordcloud', icon: '✳', title: 'Word cloud', blurb: 'Turn individual thoughts into patterns.', category: 'feedback', phase: 'activate', target: 'feedback' },
  { key: 'brainstorm', icon: '✎', title: 'Brainstorm', blurb: 'Make space for everyone’s ideas.', category: 'feedback', phase: 'reflect', target: 'feedback' },
  { key: 'scale', icon: '≋', title: 'Scale', blurb: 'Explore confidence and agreement.', category: 'feedback', phase: 'reflect', target: 'feedback' },
  { key: 'true-false', icon: '⚡', title: 'True/False Showdown', blurb: 'Fast retrieval under time pressure.', category: 'check', phase: 'check', target: 'game' },
  { key: 'low-stakes-quiz', icon: '◎', title: 'Low-Stakes Quiz', blurb: 'Timed paper retrieval. Reveal answers when the clock ends — no scoreboard.', category: 'check', phase: 'starter', minutes: 7, target: 'game' },
  { key: 'quiz-bowl', icon: '▦', title: 'Quiz Bowl', blurb: 'A category and value board. Pick an unused cell, answer aloud, the teacher awards it.', category: 'check', phase: 'check', minutes: 10, target: 'game' },
  { key: 'beat-the-clock', icon: '◷', title: 'Beat the Clock', blurb: 'Speeded multiple-choice fluency.', category: 'check', phase: 'check', minutes: 6, target: 'game' },
  { key: 'boss-battle', icon: '▲', title: 'Boss Battle', blurb: 'Shared goal: bring the boss HP down.', category: 'check', phase: 'check', minutes: 10, target: 'game' },
  { key: 'horse-race', icon: '♘', title: 'Horse Race', blurb: 'Team race across quick competitive rounds.', category: 'check', phase: 'check', minutes: 8, target: 'game' },
  { key: 'memory-flip', icon: '🂠', title: 'Memory Flip', blurb: 'Study the board, then build one class collection. Teacher checks each recall.', category: 'check', phase: 'check', minutes: 10, target: 'game' },
  { key: 'memory-match', icon: '⧉', title: 'Memory Match', blurb: 'Study, choose a hidden card, explain and claim. Teams rotate; misses can be retried.', category: 'check', phase: 'check', minutes: 10, target: 'game' },
  { key: 'memory-maze', icon: '⎇', title: 'Memory Maze', blurb: 'Hold a sequence, then navigate it.', category: 'check', phase: 'check', minutes: 8, target: 'game', enabled: false },
  { key: 'bingo', icon: '▣', title: 'Bingo', blurb: 'Call a definition; the team holding that term explains it to claim the square. A line wins — no points.', category: 'check', phase: 'check', minutes: 12, target: 'game' },
  { key: 'knowledge-flip', icon: '↺', title: 'Knowledge Flip', blurb: 'Choose a visible keyword, explain it and collect the card. No study timer.', category: 'check', phase: 'check', minutes: 10, target: 'game' },
  { key: 'definition-challenge', icon: '¶', title: 'Definition Challenge', blurb: 'Read a passage, then answer from memory once it clears.', category: 'check', phase: 'check', minutes: 8, target: 'game' },
  { key: 'emoji-guess', icon: '☺', title: 'Emoji Guess', blurb: 'Decode a concept from symbols. Release the letter pattern, then a hint, as they get stuck.', category: 'check', phase: 'activate', minutes: 6, target: 'game' },
  { key: 'word-reveal', icon: '…', title: 'Word Reveal', blurb: 'Guess from letters as they drip in.', category: 'check', phase: 'activate', minutes: 6, target: 'game' },
  { key: 'fill-in-the-blanks', icon: '_', title: 'Fill in the Blanks', blurb: 'Type the missing word in a sentence, then discuss why it fits.', category: 'check', phase: 'check', target: 'game' },
  { key: 'heads-up', icon: '↑', title: 'Heads Up', blurb: 'Describe a term; peers retrieve it.', category: 'check', phase: 'collaborate', minutes: 8, target: 'game' },
  { key: 'spin-explain', icon: '◉', title: 'Spin & Explain', blurb: 'Spin a concept; explain it aloud.', category: 'check', phase: 'collaborate', minutes: 8, target: 'game' },
  { key: 'spot-the-error', icon: '✗', title: 'Spot the Error', blurb: 'Find the mistake; explain the fix.', category: 'check', phase: 'construct', target: 'game' },
  { key: 'ranking', icon: '↕', title: 'Ranking Challenge', blurb: 'Order items by criteria — part marks on the scoreboard.', category: 'check', phase: 'construct', target: 'game' },
  { key: 'odd-one-out', icon: '◇', title: 'Odd One Out', blurb: 'Four equal items. Discuss the rule, then reveal the prepared odd one. No score.', category: 'check', phase: 'activate', minutes: 6, target: 'game' },
  { key: 'compare-contrast', icon: '⇄', title: 'Compare & Contrast', blurb: 'Two equal items. Discuss alike and differ, then reveal prepared points. No score.', category: 'check', phase: 'collaborate', minutes: 10, target: 'game' },
  { key: 'predict-outcome', icon: '→', title: 'Predict the Outcome', blurb: 'Choose what happens next, and why.', category: 'check', phase: 'activate', target: 'game' },
  { key: 'time-traveler', icon: '☽', title: 'Time Traveler', blurb: 'Recall events from year or clue.', category: 'check', phase: 'check', target: 'game' },
  { key: 'connection-maker', icon: '⚭', title: 'Connection Maker', blurb: 'Link two ideas; explain the bridge.', category: 'check', phase: 'collaborate', target: 'game' },
  { key: 'question-cube', icon: '⚀', title: 'Question Cube · discussion prompt', blurb: 'Add a discussion prompt beside your slide. Cube rolling is not available yet.', category: 'feedback', phase: 'construct', target: 'feedback' },
  { key: 'random-challenge', icon: '✦', title: 'Random Challenge', blurb: 'Draw varied open challenges. Count only — no scoreboard.', category: 'check', phase: 'check', target: 'game' },
  { key: 'concept-chain', icon: '⛓', title: 'Concept Chain', blurb: 'Grow a justified chain. Type the link, Accept — it appears on the wall.', category: 'check', phase: 'collaborate', minutes: 12, target: 'game' },
  {
    key: 'think-pair-square', icon: '◫', title: 'Think-Pair-Square-Share',
    blurb: 'Progressive sharing: Individual → Pair → Group of 4 → Class',
    category: 'moment', phase: 'collaborate', minutes: 13, target: 'moment',
    steps: [
      'THINK (2 mins): Individual reflection',
      'PAIR (3 mins): Share with partner',
      'SQUARE (4 mins): Join another pair, synthesize',
      'SHARE (4 mins): Groups present to class'
    ]
  },
  {
    key: 'jigsaw', icon: '▨', title: 'Jigsaw Collaboration',
    blurb: 'Home groups → Expert groups → Return to teach (see Main Activity for full version)',
    category: 'moment', phase: 'collaborate', minutes: 20, target: 'moment',
    steps: [
      'Home groups split (2 mins)',
      'Expert groups learn one piece (10 mins)',
      'Return to home groups to teach (8 mins)'
    ]
  },
  {
    key: 'peer-carousel', icon: '⟳', title: 'Peer Teaching Carousel',
    blurb: 'Rotate through stations, adding to and building on previous groups\' work',
    category: 'moment', phase: 'collaborate', minutes: 20, target: 'moment',
    steps: [
      'Setup: 4-5 stations with different tasks',
      'Groups rotate every 4 minutes',
      'At each station: Read previous work, add thinking, correct errors',
      'Final Round (5 mins): Return to starting station, review, synthesize',
      'Present to class'
    ]
  },
  {
    key: 'socratic-seminar', icon: '◎', title: 'Socratic Seminar (Simple)',
    blurb: 'Student-led discussion: Inner circle discusses, outer circle observes',
    category: 'moment', phase: 'collaborate', minutes: 20, target: 'moment',
    steps: [
      'Round 1 (8 mins): Inner circle discusses prompt with evidence',
      'Round 2 (8 mins): Switch circles, new discussion',
      'Debrief (4 mins): What strong arguments? What was convincing?'
    ]
  },
  {
    key: 'dialogue-chain', icon: '⛓', title: 'Dialogue Chain Discussion',
    blurb: 'Structured student-led discussion where each student builds on previous responses using academic connectors',
    category: 'moment', phase: 'collaborate', minutes: 15, target: 'moment',
    steps: [
      'Present discussion question to class (1 min)',
      'Student 1: Gives initial answer (30 seconds)',
      'Student 2: \'I agree/disagree because...\' OR \'Building on that idea...\' (30 seconds)',
      'Student 3: Continues chain using academic language (30 seconds)',
      'Continue for 8-10 students (10 mins)',
      'Teacher synthesizes key insights (2 mins)'
    ]
  },
  {
    key: 'real-world-hunt', icon: '⚭', title: 'Real-World Connection Hunt',
    blurb: 'Students identify real-world examples of concepts in their classroom, school, home, and community',
    category: 'moment', phase: 'collaborate', minutes: 15, target: 'moment',
    steps: [
      'Present concept (e.g., \'Friction\' or \'Democracy\') (2 mins)',
      'Challenge 1 (3 mins): Find examples in THIS ROOM',
      'Challenge 2 (3 mins): Think of examples AT HOME',
      'Challenge 3 (3 mins): Identify examples IN YOUR COMMUNITY',
      'Share out (3 mins): Students explain their connections',
      'Reflect (1 min): \'Why does this concept matter in real life?\''
    ]
  },
  {
    key: 'benefits-limits', icon: '⚖', title: 'Benefits vs Limitations Battle',
    blurb: 'Two teams take turns stating benefits and limitations of a concept, practicing balanced analysis',
    category: 'moment', phase: 'collaborate', minutes: 15, target: 'moment',
    steps: [
      'Present topic (e.g., \'Renewable Energy\' or \'Social Media\') (1 min)',
      'Team setup: Benefits Team vs Limitations Team (1 min)',
      '30-second think time before each round',
      'Teams alternate stating points (10 mins)',
      'Scoring: Valid point = 1 point, Repeat = no points',
      'Switch sides and continue (optional)',
      'Debrief (2 mins): Balanced view discussion'
    ]
  },
  {
    key: 'scenario-analysis', icon: '▦', title: 'Scenario Analysis Discussion',
    blurb: 'Analyze real-world scenarios to identify concepts, explain applications, and predict outcomes',
    category: 'moment', phase: 'collaborate', minutes: 18, target: 'moment',
    steps: [
      'Present concept (e.g., \'Supply and Demand\') (2 mins)',
      'Show 3 scenarios (e.g., concert tickets, crop harvest, iPhone release) (3 mins)',
      'Question 1 (4 mins): Which scenarios show the concept? (All/Some/One)',
      'Question 2 (4 mins): Pick one and explain HOW',
      'Question 3 (3 mins): Predict what happens next',
      'Question 4 (2 mins): Compare - which is most extreme?'
    ]
  },
  {
    key: 'whiteboards-on-walls', icon: '▤', title: 'Whiteboards on Walls',
    blurb: 'Students discuss and write thinking on wall whiteboards - visible thinking and peer learning (Franklin Sixth Form approach)',
    category: 'moment', phase: 'collaborate', minutes: 12, target: 'moment',
    steps: [
      'Students move to wall whiteboards in pairs/groups (30 secs)',
      'Teacher poses problem/question (30 secs)',
      'Groups discuss and write their thinking on whiteboards (5 mins)',
      'Gallery walk - observe and learn from other groups\' work (3 mins)',
      'Return to own board and refine thinking based on what you saw (2 mins)',
      'Whole class debrief of key ideas and strongest arguments (1 min)',
      'Note: Arrive early to start, revisit at lesson end for consolidation'
    ]
  },
  {
    key: 'learning-log', icon: '✎', title: 'Learning Log Entry',
    blurb: 'Structured journal: New Learning / Connections / Challenges / Strategies / Next Steps',
    category: 'moment', phase: 'reflect', minutes: 10, target: 'moment',
    steps: [
      'Students complete structured reflection (8 mins):',
      '1. NEW LEARNING: What\'s one new thing?',
      '2. CONNECTIONS: How does this connect?',
      '3. CHALLENGES: What was difficult?',
      '4. STRATEGIES: What helped me learn?',
      '5. NEXT STEPS: What do I want to work on?',
      'Optional: Share one insight with partner (2 mins)'
    ]
  },
  {
    key: 'plus-minus-interesting', icon: '±', title: 'Plus-Minus-Interesting (PMI)',
    blurb: 'Edward de Bono thinking: What worked (+) / What was challenging (−) / What surprised (?)',
    category: 'moment', phase: 'reflect', minutes: 10, target: 'moment',
    steps: [
      'Individual Reflection (5 mins):',
      'PLUS: What worked well?',
      'MINUS: What was challenging?',
      'INTERESTING: What surprised me?',
      'Share (5 mins): Pairs compare, class discusses themes'
    ]
  },
  {
    key: 'do-now', icon: '◷', title: 'Do Now / Bell Ringer',
    blurb: 'Silent individual work on board when students enter',
    category: 'moment', phase: 'activate', minutes: 8, target: 'moment',
    steps: [
      'On board: 3 questions (recall from last lesson, connection, preview)',
      'Silent individual work (5 mins)',
      'Quick pair check (2 mins)',
      'Whole class review (3 mins)',
      'Link to today\'s objective'
    ]
  }];

/** @param {string} key @returns {Activity | null} */
function activity(key) {
  return ACTIVITIES.find((a) => a.key === key) || null;
}

/**
 * Activities in one phase, in catalogue order. Disabled entries are omitted:
 * an activity that cannot run should not be offered.
 * @param {PhaseKey} phase
 * @returns {Activity[]}
 */
function activitiesInPhase(phase) {
  return ACTIVITIES.filter((a) => a.phase === phase && a.enabled !== false);
}

/** How many runnable activities each phase offers, keyed by phase.
 *  @returns {Record<string, number>} */
function phaseCounts() {
  return Object.fromEntries(PHASES.map((p) => [p.key, activitiesInPhase(p.key).length]));
}

/** Rough minutes for a run of activities, for the plan rail's time budget.
 *  @param {string[]} keys @returns {number} */
function totalMinutes(keys) {
  return keys.reduce((sum, key) => sum + ((activity(key) || {}).minutes || 0), 0);
}

export { PHASES, ACTIVITIES, activity, activitiesInPhase, phaseCounts, totalMinutes };
