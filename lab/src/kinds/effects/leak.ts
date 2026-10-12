// Light leak: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const leakDef: KindDef = {
  id: 'leak', name: 'Light leak', category: 'light', defaultBlend: 'screen',
  description: 'Warm, drifting film light bleeding in from the edges.',
  params: [
    { key: 'color1', label: 'Colour 1', type: 'color', default: '#ff6a2b', group: 'Light' },
    { key: 'color2', label: 'Colour 2', type: 'color', default: '#ffd166', group: 'Light' },
    { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 2, step: 0.01, default: 0.8, group: 'Light', decimals: 2 },
    { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 4, step: 0.01, default: 0.6, group: 'Light', decimals: 2 },
  ],
  glsl: `uniform vec3 u_color1; uniform vec3 u_color2; uniform float u_intensity; uniform float u_speed;
vec4 effect(vec2 uv) {
  float t = uTime * u_speed * 0.25 + uSeed * 9.0;
  vec2 p = uv * aspect();
  float n = snoise(p * 1.1 + vec2(t, -t * 0.7)) * 0.5 + 0.5;
  float n2 = snoise(p * 2.3 - vec2(t * 0.6, t)) * 0.5 + 0.5;
  float edgeL = pow(max(1.0 - uv.x * (1.4 + 0.4 * sin(t + uv.y * 3.0)), 0.0), 2.0);
  float edgeR = pow(max(uv.x * 1.5 - 0.8 + 0.2 * cos(t * 0.8 + uv.y * 2.0), 0.0), 2.0);
  float a = (edgeL + edgeR * 0.8) * (0.4 + n) * u_intensity;
  return vec4(mix(u_color1, u_color2, n2), clamp(a, 0.0, 1.0));
}`,
};
