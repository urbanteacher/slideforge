// Radial gradient: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const radialDef: KindDef = {
  // A glow from one point: SlideForge's grounds are radial-gradient(W H at x y, from, to stop).
  id: 'radial', name: 'Radial gradient', category: 'generate',
  description: 'A soft glow from any point, fading to a second colour — a lit corner, a spotlit centre.',
  params: [
    { key: 'colorA', label: 'Centre', type: 'color', default: '#1a1020', group: 'Colours' },
    { key: 'colorB', label: 'Outside', type: 'color', default: '#0a0b0f', group: 'Colours' },
    { key: 'cx', label: 'Centre across', type: 'number', min: -0.5, max: 1.5, step: 0.01, default: 0.8, group: 'Shape', decimals: 2, info: '0 is the left edge, 1 the right. Past either, only the edge of the glow shows.' },
    { key: 'cy', label: 'Centre down', type: 'number', min: -0.5, max: 1.5, step: 0.01, default: -0.1, group: 'Shape', decimals: 2 },
    { key: 'rx', label: 'Width', type: 'number', min: 0.05, max: 3, step: 0.01, default: 0.94, group: 'Shape', decimals: 2, info: 'Across the glow, from its centre, as a share of the slide’s width.' },
    { key: 'ry', label: 'Height', type: 'number', min: 0.05, max: 3, step: 0.01, default: 0.83, group: 'Shape', decimals: 2, info: 'Down the glow, from its centre, as a share of the slide’s height.' },
    { key: 'reach', label: 'Fades by', type: 'number', min: 0.05, max: 1, step: 0.01, default: 0.55, group: 'Shape', decimals: 2, info: 'How far out the centre colour has become the outside colour.' },
  ],
  glsl: `uniform vec3 u_colorA; uniform vec3 u_colorB; uniform float u_cx; uniform float u_cy; uniform float u_rx; uniform float u_ry; uniform float u_reach;
vec4 effect(vec2 uv) {
  float d = length((uv - vec2(u_cx, u_cy)) / max(vec2(u_rx, u_ry), vec2(0.001)));
  return vec4(mix(u_colorA, u_colorB, clamp(d / u_reach, 0.0, 1.0)) + dither(), 1.0);
}`,
};
