// Grid: an effect layer's params and its GLSL (from engine/registry.ts).
import { opt, type KindDef } from '../../engine';

export const gridDef: KindDef = {
  id: 'grid', name: 'Grid', category: 'generate',
  description: 'Lines, dots or crosses on a precise grid. Drifts slowly and fades at the edges.',
  defaultBlend: 'normal',
  params: [
    { key: 'style', label: 'Style', type: 'select', options: opt('lines', 'dots', 'crosses'), default: 'lines', group: 'Pattern' },
    { key: 'color', label: 'Colour', type: 'color', default: '#ffffff', group: 'Pattern' },
    { key: 'spacing', label: 'Spacing', type: 'number', min: 8, max: 300, step: 1, default: 64, group: 'Pattern', unit: 'px', decimals: 0 },
    { key: 'thickness', label: 'Thickness', type: 'number', min: 0.5, max: 12, step: 0.1, default: 1, group: 'Pattern', unit: 'px', decimals: 1 },
    { key: 'fade', label: 'Edge fade', type: 'number', min: 0, max: 1, step: 0.01, default: 0.7, group: 'Motion', decimals: 2 },
    { key: 'drift', label: 'Drift', type: 'number', min: -3, max: 3, step: 0.01, default: 0.3, group: 'Motion', decimals: 2 },
  ],
  glsl: `uniform vec3 u_color; uniform float u_style; uniform float u_spacing; uniform float u_thickness; uniform float u_fade; uniform float u_drift;
vec4 effect(vec2 uv) {
  vec2 p = uv * uRes + vec2(0.0, uTime * u_drift * 20.0);
  vec2 g = mod(p, u_spacing) - u_spacing * 0.5;
  float px = uRes.x / uPx.x;
  float a;
  if (u_style < 0.5) {
    float d = min(abs(g.x), abs(g.y));
    a = 1.0 - smoothstep(u_thickness * 0.5, u_thickness * 0.5 + px, d);
  } else if (u_style < 1.5) {
    a = 1.0 - smoothstep(u_thickness, u_thickness + px, length(g));
  } else {
    float arm = u_spacing * 0.12;
    float d = min(max(abs(g.x), abs(g.y) - arm + u_thickness), max(abs(g.y), abs(g.x) - arm + u_thickness));
    a = 1.0 - smoothstep(u_thickness * 0.5, u_thickness * 0.5 + px, d);
  }
  a *= mix(1.0, 1.0 - smoothstep(0.15, 0.85, length((uv - 0.5) * aspect())), u_fade);
  return vec4(u_color, a);
}`,
};
