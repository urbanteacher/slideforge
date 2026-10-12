// Vignette: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const vignetteDef: KindDef = {
  id: 'vignette', name: 'Vignette', category: 'stylise',
  description: 'Darkens (or tints) the corners to pull the eye to the centre.',
  params: [
    { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 1, step: 0.01, default: 0.55, group: 'Vignette', decimals: 2 },
    { key: 'radius', label: 'Radius', type: 'number', min: 0, max: 1.2, step: 0.01, default: 0.45, group: 'Vignette', decimals: 2 },
    { key: 'softness', label: 'Softness', type: 'number', min: 0.01, max: 1.5, step: 0.01, default: 0.7, group: 'Vignette', decimals: 2 },
    { key: 'color', label: 'Colour', type: 'color', default: '#000000', group: 'Vignette' },
  ],
  glsl: `uniform float u_amount; uniform float u_radius; uniform float u_softness; uniform vec3 u_color;
vec4 effect(vec2 uv) {
  float r = length(uv - 0.5) * 1.4142;
  float v = smoothstep(u_radius, u_radius + u_softness, r) * u_amount;
  return vec4(mix(below(uv).rgb, u_color, v), 1.0);
}`,
};
