// The shape layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { opt, type KindDef } from '../../engine';

export const shapeDef: KindDef = {
  id: 'shape', name: 'Shape', category: 'source', content: 'shape',
  description: 'Vector shapes for cards, badges and accents. Fills can be solid or gradient.',
  params: [
    { key: 'shape', label: 'Shape', type: 'select', options: opt('rect', 'ellipse', 'triangle', 'star', 'ring', 'arrow', 'line', 'curve'), default: 'rect', group: 'Shape' },
    { key: 'label', label: 'Label', type: 'text', default: '', group: 'Label', info: 'A few characters in the middle of the shape — a number, initials, a symbol — centred on the letters themselves.', when: (p) => p.shape !== 'line' && p.shape !== 'curve' },
    { key: 'labelColor', label: 'Label colour', type: 'color', default: '#ffffff', group: 'Label', when: (p) => !!String(p.label ?? '').trim() },
    { key: 'labelSize', label: 'Label size', type: 'number', min: 0, max: 400, step: 1, default: 0, group: 'Label', unit: 'px', decimals: 0, info: '0 sizes it to half the shape.', when: (p) => !!String(p.label ?? '').trim() },
    { key: 'labelFont', label: 'Label font', type: 'font', default: 'Inter', group: 'Label', when: (p) => !!String(p.label ?? '').trim() },
    { key: 'labelWeight', label: 'Label weight', type: 'select', options: opt('400', '600', '700', '800'), default: '700', group: 'Label', when: (p) => !!String(p.label ?? '').trim() },
    { key: 'rise', label: 'Curve goes', type: 'select', group: 'Shape', default: 'down', when: (p) => p.shape === 'curve', info: 'An S-curve from one side of the box to the other, level at both ends — a connector in a mind map.',
      options: [{ value: 'down', label: 'Top left to bottom right' }, { value: 'up', label: 'Bottom left to top right' }] },
    { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 400, step: 1, default: 24, group: 'Shape', unit: 'px', decimals: 0, when: (p) => p.shape === 'rect' },
    { key: 'points', label: 'Points', type: 'number', min: 3, max: 16, step: 1, default: 5, group: 'Shape', decimals: 0, when: (p) => p.shape === 'star' },
    { key: 'ringWidth', label: 'Ring thickness', type: 'number', min: 0.02, max: 1, step: 0.01, default: 0.32, group: 'Shape', decimals: 2, when: (p) => p.shape === 'ring', info: 'How much of the radius the band takes: 1 is a solid disc.' },
    { key: 'fill', label: 'Fill', type: 'color', default: '#ff5a36', group: 'Fill' },
    { key: 'fillOpacity', label: 'Fill opacity', type: 'number', min: 0, max: 1, step: 0.01, default: 1, group: 'Fill', decimals: 2, info: '0 leaves only the stroke: an outline, or a frame.' },
    { key: 'gradient', label: 'Gradient', type: 'bool', default: false, group: 'Fill' },
    { key: 'fill2', label: 'Fill 2', type: 'color', default: '#ffb199', group: 'Fill', when: (p) => !!p.gradient },
    { key: 'fill2Opacity', label: 'Fill 2 opacity', type: 'number', min: 0, max: 1, step: 0.01, default: 1, group: 'Fill', decimals: 2, when: (p) => !!p.gradient, info: 'Fade the gradient out to nothing for a scrim under a caption.' },
    { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 360, step: 1, default: 135, group: 'Fill', unit: '°', decimals: 0, info: 'Fill to Fill 2: 0° runs left to right, 90° top to bottom, 180° right to left. (A text gradient counts from the top instead: 90° is left to right there.) For words over a photo, the picture’s Fade for text sets this for you.', when: (p) => !!p.gradient },
    { key: 'stroke', label: 'Stroke', type: 'color', default: '#111111', group: 'Stroke' },
    { key: 'strokeWidth', label: 'Width', type: 'number', min: 0, max: 60, step: 0.5, default: 0, group: 'Stroke', unit: 'px', decimals: 1 },
    { key: 'strokeOpacity', label: 'Stroke opacity', type: 'number', min: 0, max: 1, step: 0.01, default: 1, group: 'Stroke', decimals: 2, when: (p) => Number(p.strokeWidth) > 0 },
  ],
};
