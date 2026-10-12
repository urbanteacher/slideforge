// The table layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { FIT, style, type KindDef } from '../../engine';

export const tableDef: KindDef = {
  // SlideForge's table slide: rows of cells, a header row, the row labels down the left. Hairline
  // rules between rows and no box, so it reads as a comparison rather than a spreadsheet.
  id: 'table', name: 'Table', category: 'source', content: 'table',
  description: 'Rows and columns for when the exact value matters: a header row, labels down the left, a hairline under each row.',
  params: [
    { key: 'data', label: 'Rows', type: 'text', default: '\tOne\tTwo\tThree\nFirst row\tYes\tNo\tSome\nSecond row\t12\t18\t25', group: 'Table', info: 'One row per line; separate the cells with a tab (or " | ").' },
    { key: 'header', label: 'Header row', type: 'bool', default: true, group: 'Table' },
    { key: 'labels', label: 'Labels down the left', type: 'bool', default: true, group: 'Table' },
    ...style(28),
    FIT,
  ],
};
