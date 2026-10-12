// The before / after layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { opt, type KindDef } from '../../engine';

export const wipeDef: KindDef = {
  // SlideForge's Before / after: two registered pictures, one wiped over the other by a handle.
  // In Preview the handle is dragged, or a click sends it there; here it rests where Position says.
  id: 'wipe', name: 'Before / after', category: 'source', content: 'wipe',
  description: 'Two pictures of the same framing, and a handle that wipes between them. Drag it in Preview.',
  params: [
    { key: 'before', label: 'Before', type: 'image', default: '', group: 'Pictures' },
    { key: 'after', label: 'After', type: 'image', default: '', group: 'Pictures' },
    { key: 'beforeLabel', label: 'Before label', type: 'text', default: 'Before', group: 'Pictures' },
    { key: 'afterLabel', label: 'After label', type: 'text', default: 'After', group: 'Pictures' },
    { key: 'position', label: 'Handle rests at', type: 'number', min: 0, max: 100, step: 1, default: 50, group: 'Pictures', unit: '%', decimals: 0, info: 'How much of the after picture shows: 0 is all before, 100 all after.' },
    { key: 'fit', label: 'Fit', type: 'select', options: opt('contain', 'cover'), default: 'contain', group: 'Pictures' },
    { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
    { key: 'size', label: 'Label size', type: 'number', min: 18, max: 80, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
    { key: 'accent', label: 'Handle', type: 'color', default: '#ff5a36', group: 'Style' },
    { key: 'textColor', label: 'Label text', type: 'color', default: '#ffffff', group: 'Style' },
  ],
};
