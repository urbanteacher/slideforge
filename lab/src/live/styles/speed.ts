// Beat the clock (style 'speed', format 'beat-the-clock'): multiple choice against one clock for the whole run (src/games/speed.js).
// Its question is Multiple choice's; what is its own is the clock and the scoring. The game's time is the round's (30 to 600
// seconds, 90 when unset) and no question has a countdown of its own; a question closes itself after its pace (SPEED_PACE).
// How the run plays (the relay-marked sprint, or the wall-paced round with a teacher-entered learner in the room) is the
// host's (live/speedroom.ts). On a wall-paced reveal the host hands the relay speed points (`gains`): 10 and up to 10 more for
// how fast the answer came after its question appeared, -5 for a wrong one (src/games/speed.js; js/live.js speedGains).
import { markResponse } from '@sf/games/registry.js';
import { roundSpeedPoints, speedPoints, SPEED_PACE } from '@sf/games/speed.js';
import { defineStyle } from './types';

export const speed = defineStyle({
  key: 'speed', name: 'Beat the clock', formats: ['beat-the-clock'], input: 'choice',
  prepare(q) {
    // src/model.js compileGame for 'speed': the Game panel's seconds are the round's.
    const secs = Number(q.timeLimit);
    q.roundSeconds = secs > 0 ? Math.max(30, Math.min(600, secs)) : Number(q.roundSeconds) > 0 ? Number(q.roundSeconds) : 90;
    q.timeLimit = 0;
    q.paceSeconds = SPEED_PACE;
  },
  gains(q, answers) {
    const limit = Number(q.timeLimit) || 0;
    return answers.map((a) => {
      const right = markResponse(q, a.response);
      const elapsed = typeof a.elapsedMs === 'number' ? a.elapsedMs / 1000 : 0;
      return [a.id, Number(q.roundSeconds) > 0 ? roundSpeedPoints(right, elapsed) : speedPoints(right, limit > 0 ? Math.max(0, limit - elapsed) : 0)] as [number, number];
    });
  },
});
