// Lens: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const lensDef: KindDef = {
  id: 'lens', name: 'Lens', category: 'distort', featured: true, mouseParam: 'centre', defaultFollowMouse: true,
  description: 'A magnifying bubble. Negative strength pinches instead of bulging.',
  params: [
    { key: 'strength', label: 'Strength', type: 'number', min: -1, max: 1, step: 0.01, default: 0.45, group: 'Lens', decimals: 2 },
    { key: 'radius', label: 'Radius', type: 'number', min: 0.03, max: 0.8, step: 0.01, default: 0.18, group: 'Lens', decimals: 2 },
    { key: 'fringe', label: 'Fringe', type: 'number', min: 0, max: 1, step: 0.01, default: 0.25, group: 'Lens', decimals: 2, info: 'Colour separation at the rim.' },
    { key: 'centre', label: 'Centre', type: 'vec2', default: [0.5, 0.5], group: 'Origin' },
  ],
  glsl: `uniform float u_strength; uniform float u_radius; uniform float u_fringe; uniform vec2 u_centre;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 d = (uv - u_centre) * as;
  float r = length(d) / u_radius;
  if (r >= 1.0) return vec4(below(uv).rgb, 1.0);
  float k = u_strength * (1.0 - r * r);
  vec2 dd = d * (1.0 - k * 0.7);
  float f = u_fringe * 0.012 * r * r * k;
  vec2 base = u_centre + dd / as;
  vec2 dir = r > 1e-4 ? normalize(d) / as : vec2(0.0);
  vec3 c = vec3(below(base + dir * f).r, below(base).g, below(base - dir * f).b);
  return vec4(c, 1.0);
}`,
};
