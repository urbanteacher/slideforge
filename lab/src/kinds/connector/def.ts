// The connector layer (BACKLOG CS-17): a line joining two layers on the slide, kept on them by the store
// (core/connectors.ts). Its `from` and `to` are layer ids; its ends (`_x1` … `_side`) are written by the store.
import { opt, type KindDef } from '../../engine';

export const connectorDef: KindDef = {
  id: 'connector', name: 'Connector', category: 'source', content: 'connector',
  description: 'A line from one layer to another that follows them when they move: straight, with an elbow, or curved, with an arrowhead.',
  params: [
    { key: 'from', label: 'From', type: 'text', default: '', group: 'Connector', info: 'The layer it starts at. Choose it in the Connector tab.' },
    { key: 'to', label: 'To', type: 'text', default: '', group: 'Connector' },
    { key: 'route', label: 'Line', type: 'select', options: opt('straight', 'elbow', 'curve'), default: 'elbow', group: 'Connector' },
    { key: 'arrow', label: 'Arrowhead', type: 'select', options: opt('end', 'both', 'none'), default: 'end', group: 'Connector' },
    { key: 'color', label: 'Colour', type: 'color', default: '#5f5a52', group: 'Connector' },
    { key: 'width', label: 'Weight', type: 'number', min: 1, max: 24, step: 1, default: 5, group: 'Connector', unit: 'px', decimals: 0 },
    { key: 'dash', label: 'Dashed', type: 'bool', default: false, group: 'Connector' },
  ],
};
