// Glow: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const glowDef: KindDef = {
  id: 'glow', name: 'Glow', category: 'light', needsMips: true,
  description: 'Blooms the brightest parts of everything below for a luminous, filmic finish.',
  params: [
    { key: 'threshold', label: 'Threshold', type: 'number', min: 0, max: 1, step: 0.01, default: 0.55, group: 'Bloom', decimals: 2 },
    { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 4, step: 0.01, default: 1.2, group: 'Bloom', decimals: 2 },
    { key: 'radius', label: 'Radius', type: 'number', min: 0.3, max: 2, step: 0.01, default: 1, group: 'Bloom', decimals: 2 },
    { key: 'tint', label: 'Tint', type: 'color', default: '#ffffff', group: 'Bloom' },
  ],
  glsl: `uniform float u_threshold; uniform float u_intensity; uniform float u_radius; uniform vec3 u_tint;
vec4 effect(vec2 uv) {
  vec3 base = below(uv).rgb;
  vec3 acc = vec3(0.0);
  for (int i = 1; i <= 5; i++) {
    float fi = float(i);
    vec3 c = softLod(uv, fi * u_radius + 0.5);
    acc += max(c - u_threshold, 0.0) / (1.0 - u_threshold + 1e-3) * (1.2 / fi);
  }
  return vec4(base + acc * u_intensity * 0.35 * u_tint, 1.0);
}`,
};
