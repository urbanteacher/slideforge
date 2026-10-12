// Solid colour: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const solidDef: KindDef = {
  id: 'solid', name: 'Solid colour', category: 'generate',
  description: 'A flat field of colour. Replaces what is below unless you change its blend mode.',
  params: [{ key: 'color', label: 'Colour', type: 'color', default: '#f6efe9', group: 'Colour' }],
  glsl: `uniform vec3 u_color; vec4 effect(vec2 uv) { return vec4(u_color, 1.0); }`,
};
