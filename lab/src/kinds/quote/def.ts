// The quote layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { FIT, opt, style, type KindDef } from '../../engine';

export const quoteDef: KindDef = {
  id: 'quote', name: 'Quote', category: 'source', content: 'quote',
  description: 'Someone else\u2019s words, set large, with who said it underneath.',
  params: [
    { key: 'text', label: 'Quote', type: 'text', default: 'The purpose of visualisation is insight, not pictures.', group: 'Quote' },
    { key: 'attribution', label: 'Who said it', type: 'text', default: 'Ben Shneiderman', group: 'Quote' },
    { key: 'mark', label: 'Quotation mark', type: 'bool', default: true, group: 'Quote' },
    { key: 'align', label: 'Align', type: 'select', options: opt('left', 'center'), default: 'left', group: 'Quote' },
    ...style(72, 'Instrument Serif', 16, 240),
    { key: 'italic', label: 'Italic', type: 'bool', default: true, group: 'Style' },
    FIT,
  ],
};
