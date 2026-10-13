// Random challenge (style 'randomchallenge', format 'random-challenge'): a card drawn from the deck, one person takes it, and the
// teacher says Complete or Skip by voice (src/games/randomchallenge.js). It counts and never scores: the relay pays this engine 0 in
// every mode, so a verdict is a count the wall keeps ("3 completed") and, with a named speaker, the report records who. The phones
// are told to listen and watch. No scores slide. Question cube (format 'question-cube') is the same engine with its own faces:
// the verdicts read Answered and Pass, and the wall names the face that came up (the question's category).
import { defineSpoken } from './spoken';

export const randomchallenge = defineSpoken({
  key: 'randomchallenge', name: 'Random challenge', formats: ['random-challenge', 'question-cube'],
  headPrompt: 'Random challenge', options: ['Complete', 'Skip'],
  spoken: { accepts: [0], scores: false, counts: 'completed' },
  scoreSlide: false,
  prepare(q) {
    // The cube's verdicts are an answer's: a rolled question is answered or passed (src/model.js compileGame).
    q.options = q.format === 'question-cube' ? ['Answered', 'Pass'] : ['Complete', 'Skip'];
    q.correct = 0;
    q.confidence = false;
    q.question = String(q.challenge ?? q.question ?? '');
  },
});
