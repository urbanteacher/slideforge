/* SlideForge playbook — full engine + how to play for each catalogue format.
   Sourced from Games-Fullscreen-Mechanics-Audit.md. This is the rehearsal and
   teaching copy SlideForge shows; engines still live in GAME_STYLES / boards. */
(function (global) {
  'use strict';
  /** @type {import("../src/types.js").SlideForgeGlobal} */
  var SF = global.SF = global.SF || {};

  /* demo:
       board   — interactive board in Quiz studio preview
       paper   — worksheet board (Low-Stakes)
       class   — SAMPLE fake players auto-answering
       judge   — SAMPLE class + host marks / oracy (no self-score phones)
       discuss — play through for discussion; no competitive fake scores
  */
  var BOOK = {
    'true-false': {
      title: 'True/False Showdown',
      aim: 'Commit, see the room, then hold your nerve or change your mind — the misconception shows itself in the switch.',
      judgement: 'auto',
      demo: 'class',
      phases: 'vote → the split → one switch → reveal',
      timer: 'Optional. A timed statement shows its split half-way through the clock.',
      players: 'Individuals or teams; every phone votes and may switch once.',
      scoring: 'The final answer is marked. Switching is free; the reveal counts who switched, never who.',
      howToPlay: [
        'A statement appears. Every phone votes True or False.',
        'Next shows the room its own split, on the wall and on every phone.',
        'Each learner may switch once, or hold.',
        'Next reveals the answer: where the room stood at the split, where it ended, and how many changed their minds.'
      ]
    },
    'low-stakes-quiz': {
      title: 'Low-Stakes Quiz',
      aim: 'Retrieval practice without high-stakes pressure.',
      judgement: 'discuss',
      demo: 'paper',
      phases: 'ready → quiz (write) → reveal answers → complete',
      timer: 'Whole quiz 2 / 3 / 4 minutes (default 3). Auto or manual reveal.',
      players: 'Class writes on paper — no phone scoring.',
      scoring: 'None — retrieval practice only.',
      howToPlay: [
        'Questions stay on the board; answers stay hidden.',
        'Learners write answers on paper within the quiz clock.',
        'No notes — this is retrieval.',
        'When time is up (or you reveal early), answers appear.',
        'Discuss before moving on.'
      ]
    },
    'quiz-bowl': {
      title: 'Quiz Bowl',
      aim: 'Strategic recall across categories; team competition.',
      judgement: 'teacher',
      demo: 'judge',
      phases: 'setup → category board → end',
      timer: 'None.',
      players: 'Teams ≤6 or individual; teacher Correct/Wrong.',
      scoring: 'Correct = cell value · wrong = 0 (cell still used).',
      howToPlay: [
        'Pick an unused category and point value.',
        'The team answers aloud.',
        'Teacher marks Correct (award the value) or Wrong.',
        'Continue until a target score or the board is exhausted.'
      ]
    },
    'beat-the-clock': {
      title: 'Beat the Clock',
      aim: 'Speeded multiple-choice fluency under one round clock.',
      judgement: 'auto',
      demo: 'class',
      phases: 'setup → play → end',
      timer: 'Round countdown 30–120s (default 60). Ends at 0.',
      players: 'Teams ≤6 or individual; rotate every question.',
      scoring: 'Correct: 10 + floor(remaining÷10) · wrong −5 (floor 0).',
      howToPlay: [
        'One shared round clock runs for the whole sprint.',
        'Answer each multiple-choice item as it appears.',
        'Faster correct answers score more; wrong answers cost points.',
        'Round ends when time hits zero or questions run out.'
      ]
    },
    'boss-battle': {
      title: 'Boss Battle',
      aim: 'Sustained Q&A against a shared boss HP bar.',
      judgement: 'auto',
      demo: 'class',
      phases: 'setup → battle → defeated OR survived',
      timer: 'Per question 15–60s (default 30). Timeout = miss.',
      players: 'Teams or individual; difficulty sets damage.',
      scoring: 'Hit damage: easy 1, med 2, hard 3, boss 5 · player +1 per hit.',
      howToPlay: [
        'A shared boss starts with HP equal to total possible damage.',
        'Answer correctly to deal damage for that question’s difficulty.',
        'Bring HP to zero before questions run out to win.',
        'If questions finish first, the boss survives.'
      ]
    },
    'horse-race': {
      title: 'Horse Race',
      aim: 'Team engagement through quick competitive rounds on a track.',
      judgement: 'auto',
      demo: 'class',
      phases: 'setup → race → finish',
      timer: 'Per question 20–60s (default 30). Timeout = no move.',
      players: 'Teams ≤6.',
      scoring: 'Correct → +1 step along the track · wrong stay put.',
      howToPlay: [
        'Each team has a lane on the track.',
        'A correct majority (or answer) moves the team one step.',
        'First to the finish wins; otherwise furthest along wins.'
      ]
    },
    'memory-flip': {
      title: 'Memory Flip',
      aim: 'Encode then retrieve term↔definition pairs as one class collection.',
      judgement: 'teacher',
      demo: 'board',
      phases: 'ready → study → recall → complete',
      timer: 'Study 5–30s (default 10). Recall is untimed.',
      players: 'Whole class; teacher checks each claim.',
      scoring: '+1 per claimed card · misses can be retried.',
      howToPlay: [
        'Study the whole set of pairs.',
        'Cards hide — choose a card and explain the meaning aloud.',
        'Teacher reveals the definition, then claims or passes.',
        'Continue until every card is collected.'
      ]
    },
    'memory-match': {
      title: 'Memory Match',
      aim: 'Memorise pairs; turn-based recall with rotating teams.',
      judgement: 'teacher',
      demo: 'board',
      phases: 'ready → study → recall → complete',
      timer: 'Study 5–30s · recall = elapsed stopwatch.',
      players: 'Teams rotate after each claim or pass.',
      scoring: '1 card = 1 point · claimed cards lock.',
      howToPlay: [
        'Study the board, then hide the cards.',
        'On your turn, choose a hidden card and explain it.',
        'Teacher reveals and claims or passes; turn rotates.',
        'Misses stay available for another try.'
      ]
    },
    'memory-maze': {
      title: 'Memory Maze',
      aim: 'Working memory — hold a path, then navigate it.',
      judgement: 'auto',
      demo: 'discuss',
      phases: 'study sequence → navigate → next → done',
      timer: 'Study 5–15s (default 10).',
      players: 'Solo class.',
      scoring: 'Complete: moves×10 + 50 · wrong move −5 + reset.',
      howToPlay: [
        'Watch the arrow sequence on the board.',
        'When it hides, recreate the path exactly.',
        'A wrong move resets; finish all sequences to complete.'
      ],
      note: 'Out of scope in SlideForge for now (different runtime).'
    },
    'bingo': {
      title: 'Bingo',
      aim: 'Recognise terms from spoken definitions; a line wins.',
      judgement: 'teacher',
      demo: 'board',
      phases: 'ready → call/mark → bingo',
      timer: 'None.',
      players: 'Teams ≤6 (or one class card); teacher calls and verifies.',
      scoring: 'No points — a completed line wins.',
      howToPlay: [
        'Teacher calls a definition (term hidden).',
        'Teams with that term explain it to claim the square.',
        'Teacher marks claim or miss.',
        'First complete row, column or diagonal wins.'
      ]
    },
    'knowledge-flip': {
      title: 'Knowledge Flip',
      aim: 'Explain visible keywords; claim understanding.',
      judgement: 'teacher',
      demo: 'board',
      phases: 'ready → choose → explain → collect',
      timer: 'Elapsed stopwatch — does not end play. No study hide.',
      players: 'Class or rotating teams; teacher checks.',
      scoring: '+1 per claim · misses can be retried.',
      howToPlay: [
        'Keywords stay face-up; definitions stay off the board.',
        'Choose a keyword and explain it aloud.',
        'Teacher reveals the definition, then claims or passes.',
        'Collect every keyword to finish the set.'
      ]
    },
    'definition-challenge': {
      title: 'Definition Challenge',
      aim: 'Read a short passage, then answer from memory.',
      judgement: 'auto',
      demo: 'class',
      phases: 'reading → question → next → done',
      timer: 'Same limit for read and answer (20–60s, default 30) — clock resets on ask.',
      players: 'Whole class typed answers once the passage clears.',
      scoring: 'Typed match (case-insensitive) +1 · else 0.',
      howToPlay: [
        'Read the passage while it is on screen (phones stay closed).',
        'When it clears — Ask now or time up — answer the recall question without looking back.',
        'Discuss the explanation, then continue.'
      ]
    },
    'emoji-guess': {
      title: 'Emoji Guess',
      aim: 'Decode concepts from symbolic clues.',
      judgement: 'teacher',
      demo: 'judge',
      phases: 'guess → reveal → teacher mark → next',
      timer: 'Optional per puzzle.',
      players: 'Teams or individual; teacher-judged.',
      scoring: '+1 correct · 0 wrong/skip.',
      howToPlay: [
        'Read the emoji clue (and any hint).',
        'The class guesses the concept.',
        'Teacher marks correct or skip, then reveals.'
      ]
    },
    'word-reveal': {
      title: 'Word Reveal',
      aim: 'Guess from partial letters as they drip in.',
      judgement: 'auto',
      demo: 'class',
      phases: 'letter drip → guess → next → done',
      timer: 'Letter interval 3–15s (default 5) — not a hard deadline.',
      players: 'Class typed guess.',
      scoring: 'By fraction revealed: <50%→100 · <75%→75 · else 50 · wrong 0.',
      howToPlay: [
        'Letters appear gradually on the wall.',
        'Guess earlier for a higher score.',
        'Wrong guesses score 0; continue to the next word.'
      ]
    },
    'fill-in-the-blanks': {
      title: 'Fill in the Blanks',
      aim: 'Cloze comprehension; vocabulary in context.',
      judgement: 'discuss',
      demo: 'discuss',
      phases: 'reveal blanks → discuss → next',
      timer: 'None.',
      players: 'Class discussion — no competitive score.',
      scoring: 'None.',
      howToPlay: [
        'A sentence with gaps appears.',
        'Discuss what belongs in each blank before revealing.',
        'Optional word bank can support the room.'
      ]
    },
    'heads-up': {
      title: 'Heads Up',
      aim: 'Oral description → term retrieval; peer teaching.',
      judgement: 'teacher',
      demo: 'judge',
      phases: 'timed round → correct/pass → end',
      timer: 'Round 30–120s (default 60).',
      players: 'Clue-givers + guesser; host marks.',
      scoring: 'A round count: how many the guesser gets. No points.',
      howToPlay: [
        'Choose the guesser in Live answers; they stand with their back to the wall while the class describes the term.',
        'Correct or Pass moves straight to the next term, drawn in a fresh order each run.',
        'One clock for the round. At time, the wall shows the guesser’s count; Next moves on.'
      ]
    },
    'spin-explain': {
      title: 'Spin & Explain',
      aim: 'Oracy — explain a randomly selected concept.',
      judgement: 'teacher',
      demo: 'judge',
      phases: 'spin → explain → judge → next turn',
      timer: 'Per turn 15–60s (default 20).',
      players: 'Teams or individual; teacher-judged.',
      scoring: 'Teams: clear credits the speaker’s team one question’s worth, with a hint half, reject or timeout nothing. Individual play counts accepted explanations unless scoring is switched on.',
      howToPlay: [
        'Spin to draw an unused concept.',
        'The learner explains it aloud (hint optional).',
        'Teacher scores Clear, With hint, or Reject.'
      ]
    },
    'spot-the-error': {
      title: 'Spot the Error',
      aim: 'Find the mistake by reading for it; see where the room looked; repair it.',
      judgement: 'auto',
      demo: 'class',
      phases: 'read → tap the wrong word → reveal where the room tapped → repair → next',
      timer: 'A short clock per sentence (30 s in the preset).',
      players: 'Individuals, on their phones.',
      scoring: 'Points for a tap anywhere inside the wrong words.',
      howToPlay: [
        'The sentence fills the screen. There are no options to pick from.',
        'Everyone taps the word they think is wrong on their phone, and can change their mind before locking in.',
        'The reveal shows a bar under every word for how many tapped it, strikes out the error and slides in the correction.',
        'Talk about the second-tallest bar: that is the misconception in the room.'
      ]
    },
    'ranking': {
      title: 'Ranking Challenge',
      aim: 'Order items by criteria; comparative judgement.',
      judgement: 'auto',
      demo: 'class',
      phases: 'reorder → submit → next → end',
      timer: 'None.',
      players: 'Everyone attempts each set.',
      scoring: 'round(10 × exact positions / n) · max 10 per set.',
      howToPlay: [
        'Drag items into the order you judge correct.',
        'Submit and compare with the prepared order.',
        'Part marks for each item in the right place.'
      ]
    },
    'odd-one-out': {
      title: 'Odd One Out',
      aim: 'Categorisation — justify the classification rule.',
      judgement: 'discuss',
      /* A rehearsal class votes, so the reveal has a split to show. */
      demo: 'class',
      phases: 'vote on phones → reveal the split and the rule → defend other picks → next',
      timer: 'None. The teacher reveals when the room has voted and talked.',
      players: 'Every phone votes; nobody is marked right or wrong.',
      scoring: 'None — the justification is the lesson, and a pick never counts against accuracy.',
      howToPlay: [
        'Four equal items appear on the wall. Each learner taps the odd one on their phone.',
        'The votes stay hidden. Next reveals the room’s split across the tiles, the prepared odd one and its reason.',
        'The next most popular pick is invited to defend its rule — accept any rule that holds.'
      ]
    },
    'compare-contrast': {
      title: 'Compare & Contrast',
      aim: 'Analyse similarities and differences.',
      judgement: 'discuss',
      demo: 'discuss',
      phases: 'discuss → reveal prepared points → next',
      timer: 'None.',
      players: 'Class discussion — phones stay idle.',
      scoring: 'None — prepared points guide the reveal.',
      howToPlay: [
        'Two equal items appear side by side.',
        'Argue how they are alike and how they differ.',
        'Reveal the prepared similarities and differences.'
      ]
    },
    'predict-outcome': {
      title: 'Predict the Outcome',
      aim: 'Commit to a causal prediction before the reveal.',
      judgement: 'auto',
      demo: 'class',
      phases: 'commit a prediction and how sure → lock → watch what happens → reveal',
      timer: 'Thinking 20–60s (default 30).',
      players: 'Every phone commits; the room sees its own split before the outcome.',
      scoring: 'A right prediction scores the question’s points; half as much again if you were sure. Wrong scores nothing, however sure.',
      howToPlay: [
        'Read the scenario. Each learner picks the outcome they expect and says how sure they are.',
        'Next locks the predictions and shows the room’s split — the answer stays hidden.',
        'Show what happens: the demonstration, the video, the experiment.',
        'Next reveals the outcome, then explain the causal chain.'
      ]
    },
    'time-traveler': {
      title: 'Time Traveler',
      aim: 'Chronology / sequenced recall from a year or clue.',
      judgement: 'auto',
      demo: 'class',
      phases: 'show clue → type event → next',
      timer: 'Per event 30–120s (default 60).',
      players: 'Teams or individuals rotate.',
      scoring: 'Exact event name +1 · timeout 0.',
      howToPlay: [
        'A year or clue appears.',
        'Name the event from memory.',
        'Correct answers grow a timeline on screen.'
      ]
    },
    'connection-maker': {
      title: 'Connection Maker',
      aim: 'Link two concepts; explain the bridge.',
      judgement: 'teacher',
      demo: 'judge',
      phases: 'two ideas → explain → teacher accept',
      timer: 'None.',
      players: 'Class; teacher Accepts for +1.',
      scoring: 'Accept credits the speaker’s team one question’s worth · decline nothing. Individual play counts.',
      howToPlay: [
        'Two concept tiles appear.',
        'A learner explains the connection aloud.',
        'Teacher accepts a strong bridge or asks for another.'
      ]
    },
    'question-cube': {
      title: 'Question Cube',
      aim: 'Randomised discussion prompts.',
      judgement: 'discuss',
      demo: 'discuss',
      phases: 'roll → discuss → next → finish',
      timer: 'None.',
      players: 'Class discussion — no competitive score.',
      scoring: 'None (completion count only).',
      howToPlay: [
        'Roll the cube for an unused prompt.',
        'Discuss as a class.',
        'Continue until prompts are used or you finish.'
      ]
    },
    'random-challenge': {
      title: 'Random Challenge',
      aim: 'Varied open challenges; creativity + knowledge.',
      judgement: 'teacher',
      demo: 'judge',
      phases: 'draw → complete/pass → next → finish',
      timer: 'Optional text hint only — no engine clock.',
      players: 'Class; teacher marks Complete.',
      scoring: 'Completed count only — no scoreboard race.',
      howToPlay: [
        'Draw a challenge from the shuffled deck.',
        'The class attempts it.',
        'Teacher marks Complete or Pass; used cards do not recycle.'
      ]
    },
    'concept-chain': {
      title: 'Concept Chain',
      aim: 'Grow a justified chain of linked ideas.',
      judgement: 'teacher',
      demo: 'judge',
      phases: 'start term → add link → accept → grow',
      timer: 'Per link 30–90s (default 45).',
      players: 'Teams or individual; teacher Accepts.',
      scoring: 'An accepted link credits the speaker’s team one question’s worth · timeout nothing. Individual play counts.',
      howToPlay: [
        'Start from the given concept.',
        'Propose the next link and justify it aloud.',
        'Host types the link and Accepts; the chain grows on the wall.'
      ]
    },
    /* Bare engines (blank quiz studio) */
    'choice': {
      title: 'Multiple choice',
      aim: 'Check an idea; discuss the why.',
      judgement: 'auto',
      demo: 'class',
      phases: 'question → lock → reveal',
      timer: 'Optional per question.',
      players: 'Individuals or teams.',
      scoring: 'Points for correct (game default).',
      howToPlay: [
        'Read the question and choose an answer.',
        'Reveal and discuss the explanation.'
      ]
    },
    'type': {
      title: 'Type answer',
      aim: 'Recall without options.',
      judgement: 'auto',
      demo: 'class',
      phases: 'question → type → mark',
      timer: 'Optional.',
      players: 'Individuals or teams.',
      scoring: 'Accepted spellings mark correct.',
      howToPlay: [
        'Type the answer from memory.',
        'Near spellings can count if enabled.'
      ]
    },
    'slider': {
      title: 'Slider',
      aim: 'Estimate a value on a line.',
      judgement: 'auto',
      demo: 'class',
      phases: 'estimate → reveal band',
      timer: 'Optional.',
      players: 'Individuals or teams.',
      scoring: 'Inside the author’s tolerance counts.',
      howToPlay: [
        'Place a value on the line.',
        'Near enough (within tolerance) scores.'
      ]
    },
    'order': {
      title: 'Order / ranking',
      aim: 'Put items in the right sequence.',
      judgement: 'auto',
      demo: 'class',
      phases: 'reorder → submit → score',
      timer: 'Optional.',
      players: 'Individuals or teams.',
      scoring: 'Part marks per correct position.',
      howToPlay: [
        'Drag items into order.',
        'Submit and compare with the answer.'
      ]
    },
    /* Audience feedback (lesson studio) — same How to play treatment. */
    'poll': {
      title: 'Poll',
      aim: 'Take the pulse of the room quickly.',
      judgement: 'discuss',
      demo: 'discuss',
      phases: 'prompt → respond → discuss',
      timer: 'None (teacher closes when ready).',
      players: 'Whole class on phones or teacher entry.',
      scoring: 'None — share of votes only.',
      howToPlay: [
        'Show the prompt and the options.',
        'Learners tap one choice.',
        'Reveal the bars and discuss what the room thinks.'
      ]
    },
    'wordcloud': {
      title: 'Word cloud',
      aim: 'Surface patterns from short free responses.',
      judgement: 'discuss',
      demo: 'discuss',
      phases: 'prompt → collect words → discuss',
      timer: 'None.',
      players: 'Whole class.',
      scoring: 'None — bigger words were said more often.',
      howToPlay: [
        'Ask for one or two words each.',
        'Words grow as they repeat.',
        'Use the cloud to start a short discussion.'
      ]
    },
    'brainstorm': {
      title: 'Brainstorm',
      aim: 'Collect many ideas without ranking them yet.',
      judgement: 'discuss',
      demo: 'discuss',
      phases: 'prompt → collect → cluster / discuss',
      timer: 'None.',
      players: 'Whole class.',
      scoring: 'None.',
      howToPlay: [
        'Pose an open prompt.',
        'Learners send ideas (duplicates OK).',
        'Read a few aloud, group themes, then move on.'
      ]
    },
    'scale': {
      title: 'Scale',
      aim: 'Map confidence or agreement across the room.',
      judgement: 'discuss',
      demo: 'discuss',
      phases: 'prompt → place → discuss',
      timer: 'None.',
      players: 'Whole class.',
      scoring: 'None — distribution only.',
      howToPlay: [
        'Show the scale ends (e.g. not sure → ready).',
        'Learners place themselves on the line.',
        'Discuss the spread, not individuals.'
      ]
    },
    /* Last resort so Game settings never says “no rules written”. */
    '_default': {
      title: 'This check',
      aim: 'Check understanding, then discuss.',
      judgement: 'auto',
      demo: 'class',
      phases: 'question → respond → reveal → discuss',
      timer: 'Optional per question.',
      players: 'Individuals or teams.',
      scoring: 'As set in Game settings.',
      howToPlay: [
        'Pose the question to the room.',
        'Learners answer on phones or aloud.',
        'Reveal, discuss, then move on.'
      ]
    }
  };

  /* Engine style id → catalogue playbook key (New game has style, no format). */
  var STYLE_BOOK = {
    choice: 'choice',
    type: 'type',
    slider: 'slider',
    order: 'order',
    truefalse: 'true-false',
    speed: 'beat-the-clock',
    boss: 'boss-battle',
    race: 'horse-race',
    emoji: 'emoji-guess',
    wordreveal: 'word-reveal',
    memoryflip: 'memory-flip',
    memorymatch: 'memory-match',
    knowledgeflip: 'knowledge-flip',
    headsup: 'heads-up',
    spinexplain: 'spin-explain',
    connection: 'connection-maker',
    conceptchain: 'concept-chain',
    randomchallenge: 'random-challenge',
    bingo: 'bingo',
    bowl: 'quiz-bowl',
    lowstakes: 'low-stakes-quiz',
    definition: 'definition-challenge',
    oddone: 'odd-one-out',
    compare: 'compare-contrast'
  };

  /* Describe the implemented SlideForge flow, not promises from the source catalogue. */
  Object.assign(BOOK['true-false'], {
    players: 'Individuals or teams answer together.',
    scoring: 'Uses the points and countdown chosen in Game settings.'
  });
  Object.assign(BOOK['emoji-guess'], {
    judgement: 'auto', demo: 'class', players: 'Learners type an accepted concept name.',
    phases: 'emoji clue → optional support → type → reveal',
    scoring: 'Accepted answers use the game’s points settings.',
    howToPlay: ['Read the emoji clues.', 'Type the concept; the teacher can release the letter pattern or a hint.', 'Reveal the accepted answer and discuss the clues.']
  });
  Object.assign(BOOK['beat-the-clock'], {
    timer: 'Current version: a countdown for each question.',
    phases: 'timed question → feedback → next question',
    howToPlay: ['Answer each short question before its countdown ends.', 'Correct answers earn a time bonus; wrong answers cost 5.', 'Review the result, then advance to the next question.'],
    note: 'A continuous countdown across the whole question pool is not implemented yet.'
  });
  Object.assign(BOOK['heads-up'], {
    timer: 'Current version: countdown for each term.',
    howToPlay: ['The guesser faces away from the term on screen.', 'Classmates describe it without saying the term.', 'Teacher marks Correct or Pass, then advances.'],
    note: 'Keep the guesser’s phone out of view. A continuous whole-round timer is not implemented yet.'
  });
  Object.assign(BOOK['spin-explain'], {
    phases: 'shuffled draw → explanation → teacher verdict → next',
    howToPlay: ['Advance to draw the next concept from the shuffled deck.', 'Explain its meaning, give an example and make a connection. Open the hint if needed.', 'Teacher marks Clear, With hint or Reject.'],
    note: 'Concepts are shuffled when the game is compiled for play, without repeats. Each draw has its own countdown; going back revisits the same draw.'
  });
  Object.assign(BOOK['fill-in-the-blanks'], {
    judgement: 'auto', demo: 'class', phases: 'sentence → typed answer → reveal',
    players: 'Learners type the missing word.', timer: 'Optional question countdown.',
    scoring: 'Uses the game’s points settings.',
    howToPlay: ['Read the sentence and its gap.', 'Type the missing word.', 'Reveal the answer and explain why it fits.'],
    note: 'This is the typed, single-gap version. A word bank and separate reveals for multiple gaps are not available.'
  });
  Object.assign(BOOK['spot-the-error'], { scoring: 'A tap inside the wrong words earns the configured points.' });
  Object.assign(BOOK['predict-outcome'], { scoring: 'A right prediction scores the configured points, and half as much again when the learner said they were sure.' });
  Object.assign(BOOK['time-traveler'], {
    players: 'Individuals or teams type their answers.', scoring: 'Accepted event names earn the configured points.',
    howToPlay: ['Read the date and clue.', 'Type the event name from memory.', 'Reveal the accepted event and discuss its context.'],
    note: 'The current version does not build an interactive timeline.'
  });
  Object.assign(BOOK['question-cube'], {
    title: 'Question Cube · discussion prompt', phases: 'prompt → responses → discussion',
    scoring: 'None.',
    howToPlay: ['Add the prompt beside a teaching slide.', 'Invite written responses.', 'Discuss the ideas with the class.'],
    note: 'Cube rolling and a pool of unused prompts are not available in this version.'
  });
  Object.assign(BOOK['random-challenge'], {
    phases: 'prepared challenge → complete/pass → next', timer: 'Optional countdown per challenge.',
    howToPlay: ['Show the next prepared challenge.', 'Give the class time to attempt it.', 'Teacher marks Complete or Pass, then advances.'],
    note: 'The current version follows the authored order rather than shuffling a deck.'
  });

  /* Authoring language belongs to the activity, not its underlying input type.
     Recommendations guide setup; they never trim an existing lesson. */
  var SETUP = {
    'true-false': ['Statement', 'Statement to judge', 'Write one unambiguous claim and explain the misconception in the reveal.', 'Learners vote true or false', 'question'],
    'low-stakes-quiz': ['Question', 'Recall question', 'Prepare 3–10 short question-and-answer pairs for one readable worksheet.', 'Class writes on paper', 'board'],
    'quiz-bowl': ['Cell', 'Question behind this cell', 'Group questions into up to six categories. Set a value and a private answer for each cell.', 'Teacher awards spoken answers', 'board'],
    'beat-the-clock': ['Question', 'Quick-fire question', 'Keep prompts and choices short enough to read under pressure. Add a varied question pool.', 'Learners choose an answer', 'question'],
    'boss-battle': ['Challenge', 'Battle question', 'Mix easy, medium and hard questions. Difficulty sets damage, so check the total boss health.', 'Class works towards a shared win', 'question'],
    'horse-race': ['Leg', 'Question for this leg', 'Add enough legs for the finish distance. Use plausible distractors so team agreement matters.', 'Teams or individuals race', 'question'],
    'memory-flip': ['Pair', 'Term', 'Use distinct terms and concise definitions. Up to eight pairs fit on each study board.', 'Teacher checks a class collection', 'board'],
    'memory-match': ['Pair', 'Term', 'Prepare a memorable set of terms and definitions, then choose team names and study time.', 'Teacher checks rotating turns', 'board'],
    'memory-maze': ['Route', 'Sequence to remember', 'This spatial game is not yet available. Use Memory Match for a playable recall activity.', 'Not yet available', 'none'],
    'bingo': ['Term', 'Term to recognise', 'Write a spoken definition for every term. Include more terms than squares for varied cards.', 'Teacher calls and verifies', 'board'],
    'knowledge-flip': ['Keyword', 'Keyword to explain', 'Use keywords with meanings worth explaining. Definitions stay private until checking.', 'Explain aloud, then collect', 'none'],
    'definition-challenge': ['Passage', 'Recall question', 'Keep the passage short. Ask something that requires remembering it after it disappears.', 'Read first, then type from memory', 'board'],
    'emoji-guess': ['Puzzle', 'Emoji clues', 'Make each symbol contribute to the answer. Add accepted spellings and a useful optional hint.', 'Learners type the concept', 'question'],
    'word-reveal': ['Word', 'Clue or question', 'Use a recognisable term, a meaningful hint and accepted spellings. Set letter pace per word.', 'Learners guess as letters appear', 'none'],
    'fill-in-the-blanks': ['Sentence', 'Sentence with a gap', 'Use one gap per sentence in this typed-answer version. Add the missing word and accepted variants.', 'Typed cloze activity', 'question'],
    'heads-up': ['Term', 'Term to describe', 'Use describable terms. Position the guesser facing away from the projected term.', 'Class gives spoken clues', 'question'],
    'spin-explain': ['Concept', 'Concept to explain', 'Choose concepts that invite explanation, with a hint that supports rather than gives the answer.', 'Teacher judges explanations', 'question'],
    'spot-the-error': ['Sentence', 'Sentence containing the error', 'Write one plausible sentence with one mistake. Mark the wrong words exactly as written, and give the correction.', 'Learners tap the wrong word', 'question'],
    'ranking': ['Set', 'Ordering instruction', 'State the ordering criterion. Enter 3–8 distinct items in the correct order; play shuffles them.', 'Learners reorder and submit', 'question'],
    'odd-one-out': ['Set', 'Items to compare', 'Prepare four comparable items and a defensible reason. Welcome alternative rules in discussion.', 'Class discusses; no score', 'none'],
    'compare-contrast': ['Comparison', 'Items to compare', 'Choose two comparable ideas. Prepare similarities and differences separately for the reveal.', 'Class discusses; no score', 'none'],
    'predict-outcome': ['Scenario', 'Scenario and prediction question', 'Give enough context to reason from. Offer three plausible outcomes and explain the cause.', 'Learners choose an outcome', 'question'],
    'time-traveler': ['Event', 'Date and event clue', 'Include the year and a revealing clue without naming the event. List accepted event names.', 'Learners type an event name', 'question'],
    'connection-maker': ['Connection', 'Connection prompt', 'Choose two ideas with a meaningful bridge. Put acceptable reasoning in the explanation.', 'Teacher judges a spoken connection', 'question'],
    'question-cube': ['Prompt', 'Discussion prompt', 'This version adds an open discussion prompt beside a slide; it does not roll a cube.', 'Open written discussion', 'none'],
    'random-challenge': ['Challenge', 'Challenge to complete', 'Give a clear task and a visible success criterion. Keep preparation practical for the room.', 'Teacher records completion', 'question'],
    'concept-chain': ['Starting concept', 'Starting concept', 'Pick a concept with several possible links. Give the class a clear connection rule.', 'Class proposes; teacher accepts', 'board']
  };
  function setupForKey(key) {
    var row = SETUP[key] || SETUP[STYLE_BOOK[key]];
    if (!row) return null;
    return { item: row[0], prompt: row[1], guidance: row[2], participation: row[3], timing: row[4] };
  }
  function setupForGame(game) {
    return setupForKey(game.format) || setupForKey(game.style) ||
      { item: 'Question', prompt: 'Question', guidance: 'Write the prompt, prepare the answer, then try a demo before teaching.', participation: 'Learners answer', timing: 'question' };
  }

  function resolve(key) {
    if (!key) return null;
    if (BOOK[key]) return BOOK[key];
    if (STYLE_BOOK[key] && BOOK[STYLE_BOOK[key]]) return BOOK[STYLE_BOOK[key]];
    return null;
  }

  function forGame(game) {
    if (!game) return BOOK._default;
    var hit = resolve(game.format) || resolve(game.style);
    if (hit) return hit;
    /* Reverse catalogue map when format is empty but style is known. */
    var map = SF.FORMAT_STYLE || {};
    for (var key in map) {
      if (map[key] === game.style && BOOK[key]) return BOOK[key];
    }
    return BOOK._default;
  }

  function forKey(key) {
    return resolve(key) || BOOK[key] || null;
  }

  function howToLines(entry) {
    if (!entry || !entry.howToPlay) return [];
    return entry.howToPlay.slice();
  }

  function engineSummary(entry) {
    if (!entry) return '';
    return [
      entry.phases && ('Phases: ' + entry.phases),
      entry.timer && ('Timer: ' + entry.timer),
      entry.players && ('Players: ' + entry.players),
      entry.scoring && ('Scoring: ' + entry.scoring)
    ].filter(Boolean).join('\n');
  }

  function demoKind(game) {
    var e = forGame(game);
    return (e && e.demo) || (game && ['memorymatch', 'memoryflip', 'knowledgeflip', 'bingo', 'lowstakes', 'bowl'].indexOf(game.style) !== -1 ? 'board' : 'class');
  }

  SF.Playbook = {
    BOOK: BOOK,
    setupForKey: setupForKey,
    setupForGame: setupForGame,
    STYLE_BOOK: STYLE_BOOK,
    forGame: forGame,
    forKey: forKey,
    howToLines: howToLines,
    engineSummary: engineSummary,
    demoKind: demoKind
  };
})(typeof window !== 'undefined' ? window : globalThis);
