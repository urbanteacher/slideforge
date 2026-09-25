import type { LayoutStyle } from '../layouts';
import type { Slide } from '../types';
import { stageBand, stageTrack, type Routine } from './stages';

// Think · Pair · Share, its starter copy tuned for the wall: the question on its own, and each stage
// with its job. Drawn by the routine designs in stages.ts, as a band or as SlideForge's track.

export const THINK_PAIR_SHARE: Routine = {
  title: 'Think · Pair · Share',
  prompt: 'Can two shapes have the same perimeter but different areas?',
  stages: [
    { name: 'Think', task: 'On your own. Sketch an idea.', minutes: 1, job: 'Silent thinking' },
    { name: 'Pair', task: 'Compare sketches. Find an example you both think works.', minutes: 2, job: 'With a partner' },
    { name: 'Share', task: 'Show your strongest example and explain how you checked it.', minutes: 3, job: 'With the room' },
    { name: 'Connect', task: 'What does this tell us about area and perimeter?', minutes: 1, job: 'Pulling it together' },
  ],
  notes: [
    'Think-Pair-Share — Starter activity, about 7 minutes. Individual thinking, then partner discussion, then the room.',
    'How to run it:\n1. Think alone (1 min): jot down ideas.\n2. Share with a partner (2 min): compare notes.\n3. Pairs share their best ideas (3 min): class discussion.\n4. Connect (1 min): tie it to today’s goal.',
    'Each click brings in the next stage and starts its clock.',
    'Example: 1 × 5 and 2 × 4 rectangles both have perimeter 12 units; their areas are 5 and 8 square units.',
    'Materials: the thinking prompt, discussion questions.',
  ].join('\n\n'),
};

const mark = (s: Slide) => { s.activity = { key: 'think-pair-share', page: 0 }; return s; };
export const thinkPairShareSlide = (st: LayoutStyle, o: Routine = THINK_PAIR_SHARE) => mark(stageBand(st, o));
export const thinkPairShareTrackSlide = (st: LayoutStyle, o: Routine = THINK_PAIR_SHARE) => mark(stageTrack(st, o));
