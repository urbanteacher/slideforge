// The icon layer (BACKLOG CS-17): one of the studio's icons (assets/icons.json, from Lucide), in a colour.
import { opt, type KindDef } from '../../engine';

export const iconDef: KindDef = {
  id: 'icon', name: 'Icon', category: 'source', content: 'icon',
  description: 'An icon from the studio’s set, drawn as lines in any colour and size: an idea, a person, a chart, a clock. Optionally on a disc.',
  params: [
    { key: 'icon', label: 'Icon', type: 'text', default: 'lightbulb', group: 'Icon', info: 'Its name in the set (as on lucide.dev). The Icon tab shows them all.' },
    { key: 'color', label: 'Colour', type: 'color', default: '#161616', group: 'Icon' },
    { key: 'stroke', label: 'Line weight', type: 'number', min: 0.5, max: 4, step: 0.25, default: 2, group: 'Icon', decimals: 2 },
    { key: 'disc', label: 'Disc behind', type: 'color', default: '', group: 'Icon', info: 'A circle of colour behind the icon. Empty for none.' },
    { key: 'align', label: 'Sits', type: 'select', options: opt('center', 'left'), default: 'center', group: 'Icon' },
  ],
};
