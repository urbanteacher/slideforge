// The simulation layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const modelDef: KindDef = {
  // SlideForge's Simulation: a model drawn as its curve, and an input the room changes. In Preview
  // the input is dragged across the graph and the output redraws; here it rests at its start.
  id: 'model', name: 'Simulation', category: 'source', content: 'model',
  description: 'A model drawn as a curve, with an input you drag in Preview while the output redraws.',
  params: [
    { key: 'model', label: 'Model', type: 'select', default: 'linear', group: 'Model', options: [{ value: 'linear', label: 'Straight line — a × input + b' }, { value: 'quadratic', label: 'Curve — a × input² + b' }] },
    { key: 'a', label: 'a', type: 'number', min: -100, max: 100, step: 0.1, default: 2, group: 'Model', decimals: 1 },
    { key: 'b', label: 'b', type: 'number', min: -1000, max: 1000, step: 1, default: 0, group: 'Model', decimals: 0 },
    { key: 'min', label: 'Input from', type: 'number', min: -1000, max: 999, step: 1, default: 0, group: 'Model', decimals: 0 },
    { key: 'max', label: 'Input to', type: 'number', min: -999, max: 1000, step: 1, default: 10, group: 'Model', decimals: 0 },
    { key: 'initial', label: 'Starts at', type: 'number', min: -1000, max: 1000, step: 0.5, default: 0, group: 'Model', decimals: 1 },
    { key: 'inputLabel', label: 'Input is', type: 'text', default: 'Input', group: 'Model' },
    { key: 'outputLabel', label: 'Output is', type: 'text', default: 'Output', group: 'Model' },
    { key: 'font', label: 'Font', type: 'font', default: 'Inter', group: 'Style' },
    { key: 'size', label: 'Label size', type: 'number', min: 18, max: 80, step: 1, default: 36, group: 'Style', unit: 'px', decimals: 0 },
    { key: 'accent', label: 'Curve', type: 'color', default: '#ff5a36', group: 'Style' },
    { key: 'textColor', label: 'Text', type: 'color', default: '#1a1a1a', group: 'Style' },
  ],
};
