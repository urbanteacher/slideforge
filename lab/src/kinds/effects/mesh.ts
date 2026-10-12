// Mesh gradient: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const meshDef: KindDef = {
  id: 'mesh', name: 'Mesh gradient', category: 'generate', featured: true,
  description: 'Soft, slowly flowing colour fields. Replaces what is below unless you change its blend mode.',
  params: [
    { key: 'color1', label: 'Colour 1', type: 'color', default: '#c988c7', weightKey: 'w1', group: 'Colours' },
    { key: 'color2', label: 'Colour 2', type: 'color', default: '#ec66e2', weightKey: 'w2', group: 'Colours' },
    { key: 'color3', label: 'Colour 3', type: 'color', default: '#f7d3c2', weightKey: 'w3', group: 'Colours' },
    { key: 'color4', label: 'Colour 4', type: 'color', default: '#fff1b8', weightKey: 'w4', group: 'Colours' },
    { key: 'w1', label: 'Weight 1', type: 'number', min: 0, max: 100, step: 1, default: 18, group: '_hidden' },
    { key: 'w2', label: 'Weight 2', type: 'number', min: 0, max: 100, step: 1, default: 24, group: '_hidden' },
    { key: 'w3', label: 'Weight 3', type: 'number', min: 0, max: 100, step: 1, default: 26, group: '_hidden' },
    { key: 'w4', label: 'Weight 4', type: 'number', min: 0, max: 100, step: 1, default: 30, group: '_hidden' },
    { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 5, step: 0.01, default: 1.2, group: 'Shape', decimals: 2, info: 'How quickly the colour fields drift.' },
    { key: 'softness', label: 'Softness', type: 'number', min: 0, max: 1, step: 0.01, default: 0.6, group: 'Shape', decimals: 2, info: 'Sharper edges at 0, fully blended at 1.' },
    { key: 'scale', label: 'Scale', type: 'number', min: 0.1, max: 2, step: 0.01, default: 0.7, group: 'Shape', decimals: 2, info: 'Amount of organic warping.' },
  ],
  glsl: `uniform vec3 u_color1; uniform vec3 u_color2; uniform vec3 u_color3; uniform vec3 u_color4;
uniform float u_w1; uniform float u_w2; uniform float u_w3; uniform float u_w4;
uniform float u_speed; uniform float u_softness; uniform float u_scale;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 p = uv * as;
  float t = uTime * u_speed * 0.12 + uSeed * 13.0;
  vec2 q = p * 1.3;
  p += u_scale * 0.35 * vec2(snoise(q + vec2(t * 0.8, -t * 0.4)), snoise(q + vec2(4.7 - t * 0.5, 2.1 + t * 0.6)));
  vec2 c1 = vec2(0.20 + 0.18 * sin(t * 1.1), 0.25 + 0.20 * cos(t * 0.9)) * as;
  vec2 c2 = vec2(0.80 + 0.15 * cos(t * 0.8), 0.22 + 0.18 * sin(t * 1.3)) * as;
  vec2 c3 = vec2(0.25 + 0.20 * cos(t * 0.7), 0.80 + 0.15 * sin(t * 1.0)) * as;
  vec2 c4 = vec2(0.78 + 0.17 * sin(t * 0.6), 0.78 + 0.16 * cos(t * 1.2)) * as;
  float s = mix(0.02, 0.9, u_softness * u_softness);
  float w1 = (u_w1 + 0.5) * exp(-dot(p - c1, p - c1) / s);
  float w2 = (u_w2 + 0.5) * exp(-dot(p - c2, p - c2) / s);
  float w3 = (u_w3 + 0.5) * exp(-dot(p - c3, p - c3) / s);
  float w4 = (u_w4 + 0.5) * exp(-dot(p - c4, p - c4) / s);
  float sum = w1 + w2 + w3 + w4 + 1e-6;
  vec3 col = (u_color1 * w1 + u_color2 * w2 + u_color3 * w3 + u_color4 * w4) / sum;
  return vec4(col + dither(), 1.0);
}`,
};
