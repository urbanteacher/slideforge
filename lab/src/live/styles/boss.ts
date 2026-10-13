// Boss battle (style 'boss', format 'boss-battle'): Multiple choice against a boss the whole room shares. A question's
// difficulty is the hit a right answer deals (easy 1, medium 2, hard 3, boss 5); the boss's health, and what each reveal does to
// it, are the host's (live/mechanics.ts Boss). The one thing the style adds to the reveal is its credit: +1 to each player who
// was right (classic's bossGains). The desk's Hit and Miss are not in the room: classic leaves its own fight off a live room too.
import { bossDamage } from '@sf/games/boss.js';
import { defineStyle } from './types';

const LEVELS = ['easy', 'medium', 'hard', 'boss'];

export const boss = defineStyle({
  key: 'boss', name: 'Boss battle', formats: ['boss-battle'], input: 'choice',
  // The style's compile (src/games/boss.js): a difficulty from the four, and the damage it deals.
  prepare(q) {
    q.difficulty = LEVELS.includes(String(q.difficulty)) ? String(q.difficulty) : 'medium';
    if (!Number(q.bossDamage)) q.bossDamage = bossDamage(q.difficulty);
  },
  gains: (q, answers) => answers.map((a) => [a.id, boss.mark(q, a.response) ? 1 : 0]),
});
