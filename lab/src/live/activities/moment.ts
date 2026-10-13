// A slide or a moment the phones only follow (Do now, Flipped instruction's pages, a brief, the stations): the room
// is told what is on the wall and the phones wait (classic: `at`, then `idle`). Its clock, when it has one, is the
// slide's own (a timer layer), as classic's one clock on a moment sends nothing to the room.

import type { ActivityKind } from './types';

export const momentKind: ActivityKind = {
  key: 'moment',
  name: 'Slide',
  runs: (p) => ['keywords', 'cards', 'split', 'table'].includes(p.type),
};
