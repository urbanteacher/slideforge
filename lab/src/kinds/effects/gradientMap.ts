// Gradient map: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const gradientMapDef: KindDef = {
  id: 'gradientMap', name: 'Gradient map', category: 'colour', featured: true,
  description: 'Remaps the brightness of everything below onto a three-stop colour ramp.',
  params: [
    { key: 'shadow', label: 'Shadows', type: 'color', default: '#2b0a3d', group: 'Ramp' },
    { key: 'mid', label: 'Midtones', type: 'color', default: '#e83f6f', group: 'Ramp' },
    { key: 'highlight', label: 'Highlights', type: 'color', default: '#ffe8d6', group: 'Ramp' },
    { key: 'contrast', label: 'Contrast', type: 'number', min: 0.2, max: 3, step: 0.01, default: 1.1, group: 'Tone', decimals: 2 },
    { key: 'shift', label: 'Shift', type: 'number', min: -0.5, max: 0.5, step: 0.01, default: 0, group: 'Tone', decimals: 2 },
  ],
  glsl: `uniform vec3 u_shadow; uniform vec3 u_mid; uniform vec3 u_highlight; uniform float u_contrast; uniform float u_shift;
vec4 effect(vec2 uv) {
  float l = clamp((luma(below(uv).rgb) - 0.5) * u_contrast + 0.5 + u_shift, 0.0, 1.0);
  vec3 c = l < 0.5 ? mix(u_shadow, u_mid, l * 2.0) : mix(u_mid, u_highlight, (l - 0.5) * 2.0);
  return vec4(c + dither(), 1.0);
}`,
};
