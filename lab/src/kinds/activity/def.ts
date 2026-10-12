// The activity layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const activityDef: KindDef = {
  id: 'activity', name: 'Activity', category: 'source', content: 'activity',
  description: 'A placeholder card for a class activity: its title and timed steps. Minutes in the steps add up to the total.',
  params: [
    { key: 'title', label: 'Title', type: 'text', default: 'Think, pair, share', group: 'Activity' },
    { key: 'steps', label: 'Steps', type: 'text', default: 'Think on your own · 1 min\nCompare with a partner · 3 min\nShare with the room · 2 min', group: 'Activity', info: 'One step per line. Write "· 3 min" to time a step.' },
    { key: 'label', label: 'Label', type: 'text', default: 'Activity', group: 'Activity' },
    { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
    { key: 'size', label: 'Text size', type: 'number', min: 16, max: 120, step: 1, default: 44, group: 'Style', unit: 'px', decimals: 0 },
    { key: 'fill', label: 'Card', type: 'color', default: '#ffffff', group: 'Style' },
    { key: 'textColor', label: 'Text', type: 'color', default: '#141414', group: 'Style' },
    { key: 'accent', label: 'Accent', type: 'color', default: '#2f6bff', group: 'Style' },
    { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 120, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
  ],
};
