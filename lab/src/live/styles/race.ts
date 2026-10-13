// Horse race (style 'race', format 'horse-race'): Multiple choice with a mechanic that belongs to the lesson. The question is
// asked, marked and revealed as Multiple choice is; the track (a lane a team, or a lane a phone) is the host's, kept across the
// lesson's questions (live/mechanics.ts Race), and every question the room asks takes part. Nothing is the style's own.
import { defineStyle } from './types';

export const race = defineStyle({ key: 'race', name: 'Horse race', formats: ['horse-race'], input: 'choice' });
