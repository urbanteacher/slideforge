// Film grain: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const grainDef: KindDef = {
  id: 'grain', name: 'Film grain', category: 'stylise', featured: true,
  description: 'Fine, animated photographic grain. Adds texture and hides gradient banding.',
  params: [
    { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 0.5, step: 0.005, default: 0.09, group: 'Grain', decimals: 3 },
    { key: 'size', label: 'Size', type: 'number', min: 0.5, max: 6, step: 0.1, default: 1.4, group: 'Grain', unit: 'px', decimals: 1 },
    { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 2, step: 0.01, default: 1, group: 'Grain', decimals: 2 },
    { key: 'colour', label: 'Colour grain', type: 'bool', default: false, group: 'Grain' },
  ],
  glsl: `uniform float u_amount; uniform float u_size; uniform float u_speed; uniform float u_colour;
vec4 effect(vec2 uv) {
  vec3 c = below(uv).rgb;
  vec2 p = floor(uv * uRes / u_size);
  float t = floor(uTime * u_speed * 24.0);
  vec3 n = vec3(hash12(p + t * 17.13) + hash12(p * 1.7 + t * 5.31) - 1.0);
  if (u_colour > 0.5) n = vec3(n.x, hash12(p + t * 3.1 + 11.0) + hash12(p * 0.7 + t) - 1.0, hash12(p + t * 7.7 + 23.0) + hash12(p * 1.3 - t) - 1.0);
  c += n * u_amount * (1.0 - 0.7 * abs(luma(c) - 0.5) * 2.0);
  return vec4(c, 1.0);
}`,
};
