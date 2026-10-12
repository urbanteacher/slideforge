// Halftone: an effect layer's params and its GLSL (from engine/registry.ts).
import { opt, type KindDef } from '../../engine';

export const halftoneDef: KindDef = {
  id: 'halftone', name: 'Halftone', category: 'stylise',
  description: 'Print-style dot screen. Mono ink or full colour.',
  params: [
    { key: 'size', label: 'Dot size', type: 'number', min: 3, max: 60, step: 0.5, default: 10, group: 'Screen', unit: 'px', decimals: 1 },
    { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 90, step: 1, default: 45, group: 'Screen', unit: '°', decimals: 0 },
    { key: 'mode', label: 'Mode', type: 'select', options: opt('mono', 'colour'), default: 'mono', group: 'Ink' },
    { key: 'ink', label: 'Ink', type: 'color', default: '#141414', group: 'Ink', when: (p) => p.mode === 'mono' },
    { key: 'paper', label: 'Paper', type: 'color', default: '#f4ede4', group: 'Ink' },
  ],
  glsl: `uniform float u_size; uniform float u_angle; uniform float u_mode; uniform vec3 u_ink; uniform vec3 u_paper;
vec4 effect(vec2 uv) {
  float a = radians(u_angle);
  mat2 R = mat2(cos(a), sin(a), -sin(a), cos(a));
  vec2 p = R * (uv * uRes);
  vec2 cell = floor(p / u_size);
  vec2 f = fract(p / u_size) - 0.5;
  vec2 cp = transpose(R) * ((cell + 0.5) * u_size) / uRes;
  vec3 s = below(cp).rgb;
  float l = luma(s);
  float d = length(f);
  float aa = (uRes.x / uPx.x) / u_size;
  if (u_mode < 0.5) {
    float rad = sqrt(1.0 - l) * 0.72;
    float ink = 1.0 - smoothstep(rad - aa, rad + aa, d);
    return vec4(mix(u_paper, u_ink, ink), 1.0);
  }
  float rad = sqrt(clamp(1.0 - l * 0.6, 0.0, 1.0)) * 0.72;
  float ink = 1.0 - smoothstep(rad - aa, rad + aa, d);
  return vec4(mix(u_paper, s, ink), 1.0);
}`,
};
