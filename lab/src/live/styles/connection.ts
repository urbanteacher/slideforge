// Connection maker (style 'connection', format 'connection-maker'): two concepts, and the room finds the bridge between them
// (src/games/connection.js). While the question is up an idea box opens beside it (a quick prompt: a brainstorm of up to two
// proposals a phone, `shape: 'bridge'`, `quiet`), and the wall shows what arrives without names. The teacher puts one proposal on the
// table (its author becomes the speaker, who explains it aloud) and says Accept or Reject by voice; the box closes with the verdict.
// An accepted bridge is credited to the speaker's team in a teams room, and to the named player when the game scores spoken; a Reject
// names nobody. The wall counts the bridges made. The drawn approved-bridge lines are a known open classic item and not part of this.
import { defineSpoken } from './spoken';

export const connection = defineSpoken({
  key: 'connection', name: 'Connection maker', formats: ['connection-maker'],
  headPrompt: 'Connection maker', options: ['Accept', 'Reject'],
  spoken: { accepts: [0], scores: true, counts: 'bridges made', proposals: 'bridge' },
  prepare(q) {
    q.options = ['Accept', 'Reject'];
    q.correct = 0;
    q.confidence = false;
    q.itemA = String(q.itemA ?? '').trim();
    q.itemB = String(q.itemB ?? '').trim();
  },
});
