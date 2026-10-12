// Spotlight: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const spotlightDef: KindDef = {
  id: 'spotlight', name: 'Spotlight', category: 'light', mouseParam: 'centre', defaultFollowMouse: true, defaultBlend: 'screen',
  description: 'A soft pool of light. Follows the pointer by default — great for guiding attention.',
  params: [
    { key: 'color', label: 'Colour', type: 'color', default: '#ffd9c2', group: 'Light' },
    { key: 'radius', label: 'Radius', type: 'number', min: 0.02, max: 1.5, step: 0.01, default: 0.35, group: 'Light', decimals: 2 },
    { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 2, step: 0.01, default: 0.7, group: 'Light', decimals: 2 },
    { key: 'centre', label: 'Centre', type: 'vec2', default: [0.5, 0.45], group: 'Origin' },
  ],
  glsl: `uniform vec3 u_color; uniform float u_radius; uniform float u_intensity; uniform vec2 u_centre;
vec4 effect(vec2 uv) {
  float r = length((uv - u_centre) * aspect()) / u_radius;
  return vec4(u_color, exp(-r * r * 2.2) * u_intensity);
}`,
};
