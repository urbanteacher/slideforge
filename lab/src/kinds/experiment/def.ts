// The predict and compare layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { type KindDef } from '../../engine';
import { EXPERIMENTS } from '../../experiments';

export const experimentDef: KindDef = {
  // Keep the internal kind for saved decks; the author-facing name is Predict and compare.
  id: 'experiment', name: 'Predict and compare', category: 'source', content: 'experiment',
  description: 'One dataset shown in several encodings in turn — pies to bars, a moving baseline, clutter removed — each Next transforming the chart into the next.',
  params: [
    { key: 'preset', label: 'Demonstration', type: 'select', default: 'polling', group: 'Demonstration',
      options: Object.entries(EXPERIMENTS).map(([value, preset]) => ({ value, label: preset.label })) },
    { key: 'data', label: 'Data', type: 'text', default: 'Candidate\tPoll A\tPoll B\tPoll C\n1\t17\t20\t23\n2\t18\t20\t22\n3\t20\t19\t20\n4\t22\t21\t18\n5\t23\t20\t17', group: 'Demonstration', info: 'Headings in the first row, categories in the first column, tab between cells.' },
    { key: 'states', label: 'States', type: 'text', default: '', group: 'Demonstration', info: 'Empty uses the demonstration’s own states. Otherwise a list of states, each with a label, a kind (bar, pie, line, dot, bubbles, hue, shape, tiles, table, network, field, geometry, classification, grid, long, groups, lines, balance, oblique, donut, exploded, rose, units, nested, stream, area, heatmap) and an explanation.' },
    { key: 'duration', label: 'Transformation pace', type: 'select', default: '1600', group: 'Demonstration', options: [{ value: '800', label: 'Quick — 0.8 seconds' }, { value: '1600', label: 'Teaching — 1.6 seconds' }, { value: '3000', label: 'Slow observation — 3 seconds' }] },
    { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
    { key: 'size', label: 'Text size', type: 'number', min: 18, max: 80, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
    { key: 'textColor', label: 'Text', type: 'color', default: '#1a1a1a', group: 'Style' },
    { key: 'source', label: 'Source', type: 'text', default: 'Illustrative teaching data', group: 'Demonstration', info: 'Where the numbers come from, set small at the foot of the steps.' },
    { key: 'accent', label: 'Lit button', type: 'color', default: '#0072b2', group: 'Style', info: 'The state showing now is lit in this colour.' },
  ],
};
