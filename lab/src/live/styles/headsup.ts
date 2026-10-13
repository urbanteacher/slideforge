// Heads up (style 'headsup', format 'heads-up'): one guesser faces away, the room gives clues for the term on every other phone, and the
// teacher says Correct or Pass by voice (src/games/headsup.js). A spoken game with a guesser: choosing the speaker sends `guesser` (the
// relay keeps the term from that phone), the question frame carries the `term` and the `roundLeft` of one clock for the whole pile
// (started when the first term lands, js/rounds.js), a verdict moves straight on to the next term after a beat, and when the clock runs
// out the open term closes and Next skips the terms nobody reached. It counts and never scores: the relay pays this engine 0 in every
// mode. The guesser keeps the whole round, so the speaker is not cleared between terms.
import { defineSpoken } from './spoken';

export const headsup = defineSpoken({
  key: 'headsup', name: 'Heads up', formats: ['heads-up'],
  headPrompt: 'Heads up', options: ['Correct', 'Pass'],
  spoken: { accepts: [0], scores: false, counts: 'correct', heads: true },
  prepare(q) {
    q.options = ['Correct', 'Pass'];
    q.correct = 0;
    q.confidence = false;
    q.term = String(q.term ?? q.question ?? '');
    q.question = q.term as string;
    // The round, not the term, is what is timed: the Game panel's seconds are the round's (src/model.js: 60 when nothing says).
    const secs = Number(q.timeLimit);
    q.roundSeconds = secs > 0 ? Math.min(600, secs) : Number(q.roundSeconds) > 0 ? Number(q.roundSeconds) : 60;
    q.timeLimit = 0;
  },
});
