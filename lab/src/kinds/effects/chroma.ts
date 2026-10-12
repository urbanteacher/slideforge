// Chromatic shift: an effect layer's params and its GLSL (from engine/registry.ts).
import { opt, type KindDef } from '../../engine';

export const chromaDef: KindDef = {
  id: 'chroma', name: 'Chromatic shift', category: 'stylise',
  description: 'Splits red and blue channels apart like a cheap lens or a glitch.',
  params: [
    { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 3, step: 0.01, default: 0.6, group: 'Shift', decimals: 2 },
    { key: 'mode', label: 'Mode', type: 'select', options: opt('radial', 'linear'), default: 'radial', group: 'Shift' },
    { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 360, step: 1, default: 0, group: 'Shift', unit: '°', decimals: 0, when: (p) => p.mode === 'linear' },
  ],
  glsl: `uniform float u_amount; uniform float u_mode; uniform float u_angle;
vec4 effect(vec2 uv) {
  float a = radians(u_angle);
  vec2 dir = u_mode < 0.5 ? (uv - 0.5) : vec2(cos(a), sin(a)) * 0.5;
  vec2 o = dir * u_amount * 0.02;
  return vec4(below(uv + o).r, below(uv).g, below(uv - o).b, 1.0);
}`,
};
