// The note layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { FIT, style, type KindDef } from '../../engine';

export const noteDef: KindDef = {
  id: 'note', name: 'Note', category: 'source', content: 'note',
  description: 'A takeaway, a source line or a caution: a short label and a sentence, with an accent rule down its side.',
  params: [
    { key: 'label', label: 'Label', type: 'text', default: 'Takeaway', group: 'Note', info: 'Leave empty for no label.' },
    { key: 'text', label: 'Text', type: 'text', default: 'The one thing to remember from this slide.', group: 'Note' },
    ...style(36),
    { key: 'panel', label: 'Panel behind', type: 'bool', default: true, group: 'Style' },
    { key: 'fill', label: 'Panel', type: 'color', default: '#f3efe8', group: 'Style', when: (p) => p.panel !== false },
    { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 60, step: 1, default: 14, group: 'Style', unit: 'px', decimals: 0, when: (p) => p.panel !== false },
    FIT,
  ],
};
