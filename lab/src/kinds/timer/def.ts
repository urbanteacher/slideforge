// The timer layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { style, type KindDef } from '../../engine';

export const timerDef: KindDef = {
  // SlideForge's authored countdown: it starts when its slide comes up (the slide clock, which a
  // redraw does not restart), clears when the slide is left, and caps at two hours so a lesson
  // activity can outlast a quick task. In the editor it shows the full time.
  id: 'timer', name: 'Timer', category: 'source', content: 'timer',
  description: 'A countdown that starts when its slide comes up and resets when you leave it.',
  params: [
    { key: 'minutes', label: 'Minutes', type: 'number', min: 0.1, max: 120, step: 0.25, default: 5, group: 'Timer', decimals: 2, unit: ' min', info: 'From a few seconds to two hours. It starts when the slide appears while presenting.' },
    { key: 'style', label: 'Style', type: 'select', default: 'ring', group: 'Timer', options: [{ value: 'game', label: 'Game clock — SlideForge’s countdown ring' }, { value: 'ring', label: 'Ring and time' }, { value: 'digits', label: 'Time only' }, { value: 'bar', label: 'Bar and time' }] },
    { key: 'label', label: 'Label', type: 'text', default: 'Time left', group: 'Timer', info: 'Leave empty for none.' },
    { key: 'done', label: 'When it ends', type: 'text', default: 'Time’s up', group: 'Timer' },
    ...style(96),
    { key: 'track', label: 'Track', type: 'color', default: '#d9d4cc', group: 'Style' },
  ],
};
