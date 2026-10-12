/* What each recording leaves out on purpose, and why, for the README. Kept
   by hand: the table in the README shows what was captured, this says why a
   blank in it is the style's nature and not a recorder gap. */

const SPOKEN = 'no phone answers, `locked` or manualAnswer: the answer is spoken, so the relay ignores phone answers and refuses teacher entry ("Use the teacher verdict"). The verdict is recorded instead, from the teacher window (`recipient`, then `revealWith`).';
const BOARD = 'no questions, phone answers, `locked`, manualAnswer or mid-question reconnect: an oral board never reaches a phone (`idle` only). What the relay hears is the host\'s `oral` verdicts, recorded by clicking the board on the wall.';

export const GAPS = {
  'game-heads-up': SPOKEN + ' Heads Up also sends `guesser`.',
  'game-spin-explain': SPOKEN,
  'game-connection-maker': SPOKEN + ' Proposals arrive as a brainstorm prompt.',
  'game-random-challenge': SPOKEN,
  'game-question-cube': SPOKEN,
  'game-concept-chain': 'phones stay idle (host oracy): no question goes out, so no answers, `locked`, manualAnswer or mid-question reconnect. Proposals arrive as a prompt per link, and the verdict comes from the teacher window.',
  'game-memory-flip': BOARD,
  'game-memory-match': BOARD,
  'game-knowledge-flip': BOARD,
  'game-bingo': BOARD,
  'game-quiz-bowl': BOARD,
  'game-low-stakes-quiz': BOARD + ' (The low-stakes quiz is answered on paper.)',
  'game-beat-the-clock': 'no manualAnswer: a teacher-entered learner turns the sprint off (`sprintSlide` in js/live.js), so this recording has none; `game-beat-the-clock-wall-paced` records that case. Bo rejoins mid-sprint and is not handed his next sprint question (the relay\'s resume path re-sends an open `question` or `prompt`, not a sprint), so he sits out the rest of the sprint. That is the current behaviour, recorded as it is.',
  'feedback-poll': 'no manualAnswer or `locked`: teacher entry is for quiz questions only, and a reply is acknowledged with `replied`.',
  'feedback-wordcloud': 'no manualAnswer or `locked` (as for feedback-poll).',
  'feedback-brainstorm': 'no manualAnswer or `locked` (as for feedback-poll).',
  'feedback-scale': 'no manualAnswer or `locked` (as for feedback-poll).',
  'feedback-quick-poll': 'no manualAnswer or `locked` (as for feedback-poll).'
};

export const NOT_RECORDED = `Not recorded, with the reason:

- **Teams in every style.** Teams are recorded in \`game-choice-teams\`, and wherever a format's preset is a teams room (horse race, boss battle, quiz bowl, bingo: see the Teams column). The other styles run individually; teams change the relay's scoring and \`teamAnswers\`, not the style's own messages.
- **Rounds per style.** Rounds are recorded once, in \`rounds-two-games\` (two games in one deck, with a learner held in \`waiting\` and admitted at round 2). Every other game recording is one round.
- **The activities that are games** (quick-retrieval-quiz, pre-assessment-quickfire, question-cube-six-question-types, concept-card-sort, interleaving-mixed-practice, explanation-champion-challenge, compare-and-contrast-venn-activity, multiple-choice-quiz, true-false-rapid-fire, short-answer-check, diagnostic-question, recap-quiz-game). \`SF.Activities.makeSlides\` gives them a placeholder slide; the game itself is made by the Lesson studio. They run on the same engines as the \`game-*\` recordings.
- **The other activities.** Twelve of the 54 are recorded, chosen to cover every target that reaches the room (moment, feedback, slide-arc) and every feedback kind; the plain slide activities send only \`at\` and \`idle\`.
- **Host reconnect** (\`rehost\` after a host reload or a relay restart). Only phone reconnects are recorded.
- **Room features outside a style:** moderated Q&A (\`ask\`, \`qaModerate\`, \`qaPin\`, \`qaVote\`), reactions, pace signals, bookmarks, blank phones, the floor, hints (\`hintOut\`), oral credit, the Teacher Presenter window (\`sf-presenter-cmd\`) and \`watch\`. Some of these frames appear incidentally (\`bookmarks\`, \`floor\`, \`at\`); none is driven.
- **Timeouts.** Every phone answers well inside the time limit; no recording lets a question time out.
- **join.html as a page.** Phones are raw sockets speaking its protocol, so its own reconnect timing and rendering are not in these logs.
`;
