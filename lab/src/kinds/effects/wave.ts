// Liquid: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const waveDef: KindDef = {
  id: 'wave', name: 'Liquid', category: 'distort', featured: true,
  description: 'Organic noise displacement, like looking through moving water or heat haze.',
  params: [
    { key: 'strength', label: 'Strength', type: 'number', min: 0, max: 0.1, step: 0.001, default: 0.02, group: 'Flow', decimals: 3 },
    { key: 'scale', label: 'Scale', type: 'number', min: 0.2, max: 12, step: 0.1, default: 3, group: 'Flow', decimals: 1 },
    { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 5, step: 0.01, default: 0.8, group: 'Flow', decimals: 2 },
  ],
  glsl: `uniform float u_strength; uniform float u_scale; uniform float u_speed;
vec4 effect(vec2 uv) {
  vec2 p = uv * aspect() * u_scale;
  float t = uTime * u_speed * 0.3;
  vec2 off = vec2(snoise(p + vec2(t, 0.0)), snoise(p + vec2(3.1, -t))) * u_strength;
  return vec4(below(uv + off).rgb, 1.0);
}`,
};
