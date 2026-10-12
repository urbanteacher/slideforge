// Ripple: an effect layer's params and its GLSL (from engine/registry.ts).
import { opt, type KindDef } from '../../engine';

export const rippleDef: KindDef = {
  id: 'ripple', name: 'Ripple', category: 'distort', featured: true, mouseParam: 'centre', defaultFollowMouse: true,
  description: 'Rings travel out from a point and bend everything below.',
  params: [
    { key: 'strength', label: 'Strength', type: 'number', min: 0, max: 0.08, step: 0.001, default: 0.012, group: 'Waves', decimals: 3, info: 'How far pixels are pushed.' },
    { key: 'frequency', label: 'Frequency', type: 'number', min: 1, max: 80, step: 0.1, default: 24, group: 'Waves', decimals: 1, info: 'Rings per screen height.' },
    { key: 'harmonics', label: 'Harmonics', type: 'number', min: 1, max: 5, step: 1, default: 2, group: 'Waves', decimals: 0, info: 'Stacked wave layers for a richer surface.' },
    { key: 'speed', label: 'Speed', type: 'number', min: -6, max: 6, step: 0.01, default: 1.5, group: 'Waves', decimals: 2 },
    { key: 'falloff', label: 'Falloff', type: 'number', min: 0, max: 10, step: 0.1, default: 2.5, group: 'Waves', decimals: 1, info: 'How quickly rings fade away from the origin.' },
    { key: 'shape', label: 'Shape', type: 'select', options: opt('radial', 'linear'), default: 'radial', group: 'Origin' },
    { key: 'centre', label: 'Centre', type: 'vec2', default: [0.5, 0.5], group: 'Origin' },
  ],
  glsl: `uniform float u_strength; uniform float u_frequency; uniform float u_harmonics; uniform float u_speed; uniform float u_falloff; uniform float u_shape; uniform vec2 u_centre;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 d = (uv - u_centre) * as;
  float r = u_shape < 0.5 ? length(d) : abs(d.y);
  float w = 0.0;
  for (int i = 1; i <= 5; i++) {
    float fi = float(i);
    if (fi > u_harmonics + 0.5) break;
    w += sin(r * u_frequency * fi - uTime * u_speed * 3.0 * fi + fi * 1.7) / fi;
  }
  vec2 dir = u_shape < 0.5 ? (r > 1e-5 ? d / r : vec2(0.0)) : vec2(0.0, sign(d.y));
  vec2 off = dir * w * u_strength * exp(-r * u_falloff) / as;
  return vec4(below(uv + off).rgb, 1.0);
}`,
};
