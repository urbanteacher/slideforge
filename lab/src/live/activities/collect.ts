// An activity that asks the room for feedback (Exit ticket, Muddiest point, Word splash, the Reflection ladder):
// its slide carries the prompt (slide.feedback, which the lab keeps as SlideForge made it), and the room runs it as
// any feedback slide (live/feedback.ts). What `at` says is SlideForge's slide, as classic says it.

import type { ActivityKind } from './types';

export const collectKind: ActivityKind = {
  key: 'collect',
  name: 'Feedback from the room',
  runs: (p) => !!p.feedback && p.activityPresentation !== 'stages',
};
