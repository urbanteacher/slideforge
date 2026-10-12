// Aurora: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const auroraDef: KindDef = {
  id: 'aurora', name: 'Aurora', category: 'generate', featured: true,
  description: 'Domain-warped noise that folds three colours into slow, liquid ribbons.',
  params: [
    { key: 'color1', label: 'Base', type: 'color', default: '#0b0a1a', group: 'Colours' },
    { key: 'color2', label: 'Mid', type: 'color', default: '#3a2cff', group: 'Colours' },
    { key: 'color3', label: 'Highlight', type: 'color', default: '#ff6ad5', group: 'Colours' },
    { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 4, step: 0.01, default: 1, group: 'Flow', decimals: 2 },
    { key: 'scale', label: 'Scale', type: 'number', min: 0.1, max: 3, step: 0.01, default: 0.6, group: 'Flow', decimals: 2 },
    { key: 'warp', label: 'Warp', type: 'number', min: 0, max: 4, step: 0.01, default: 1.2, group: 'Flow', decimals: 2 },
  ],
  glsl: `uniform vec3 u_color1; uniform vec3 u_color2; uniform vec3 u_color3;
uniform float u_speed; uniform float u_scale; uniform float u_warp;
float fbm3(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * snoise(p); p = p * 1.9 + 11.3; a *= 0.5; } return s; }
vec4 effect(vec2 uv) {
  vec2 p = uv * aspect() * u_scale + uSeed * 7.0;
  float t = uTime * u_speed * 0.06;
  vec2 q = vec2(fbm3(p + vec2(0.0, t)), fbm3(p + vec2(5.2, 1.3) - t));
  float f = fbm3(p + u_warp * q + vec2(t * 0.5, 0.0)) * 0.5 + 0.5;
  vec3 col = mix(u_color1, u_color2, smoothstep(0.25, 0.75, f));
  col = mix(col, u_color3, smoothstep(0.55, 0.95, f) * smoothstep(0.1, 0.8, length(q) + 0.25));
  return vec4(col + dither(), 1.0);
}`,
};
