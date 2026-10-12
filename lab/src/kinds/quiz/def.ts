// The quiz layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const quizDef: KindDef = {
  id: 'quiz', name: 'Quiz', category: 'source', content: 'quiz',
  description: 'A placeholder card for a quiz question: the question and its answer options, ready for a live quiz.',
  params: [
    { key: 'question', label: 'Question', type: 'text', default: 'Which chart best shows change over time?', group: 'Quiz' },
    { key: 'options', label: 'Options', type: 'text', default: 'Pie chart\nLine chart\nDonut chart\nScatter plot', group: 'Quiz', info: 'One option per line (up to six).' },
    { key: 'label', label: 'Label', type: 'text', default: 'Quiz', group: 'Quiz' },
    { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
    { key: 'size', label: 'Text size', type: 'number', min: 16, max: 120, step: 1, default: 52, group: 'Style', unit: 'px', decimals: 0 },
    { key: 'fill', label: 'Card', type: 'color', default: '#ffffff', group: 'Style' },
    { key: 'textColor', label: 'Text', type: 'color', default: '#141414', group: 'Style' },
    { key: 'accent', label: 'Accent', type: 'color', default: '#ff5a36', group: 'Style' },
    { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 120, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
  ],
};
