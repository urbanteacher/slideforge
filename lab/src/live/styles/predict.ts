// Predict the outcome (format 'predict-outcome', on the choice engine: a question that carries `predict`). The room
// commits to an outcome and bets on it ("I'm sure" or "Just a hunch"); the teacher's first Next locks the predictions
// (`closeAnswers`: the phones wait, the wall shows the room's split with the answer still hidden), the second reveals.
// It never reveals by itself. The bet can lose: the reveal carries the host's `gains` (classic's predictGains): right and
// sure is half as much again, right and unsure the points, wrong and unsure nothing, wrong and sure half the points off.
import { defineStyle } from './types';

export const predict = defineStyle({
  key: 'choice', name: 'Predict the outcome', formats: ['predict-outcome'], input: 'choice',
  match: (q) => q.predict === true,
  gate: 'closeAnswers',
  held: true,
  flags: () => ({ predict: true }),
  gains: (q, answers) => {
    const pts = Number(q.points) || 0;
    return answers.map((a) => {
      const sure = a.sure === true;
      if (predict.mark(q, a.response)) return [a.id, sure ? Math.round(pts * 1.5) : pts] as [number, number];
      return [a.id, sure ? -Math.round(pts * 0.5) : 0] as [number, number];
    });
  },
});
