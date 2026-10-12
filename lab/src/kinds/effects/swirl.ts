// Swirl: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const swirlDef: KindDef = {
  id: 'swirl', name: 'Swirl', category: 'distort', mouseParam: 'centre',
  description: 'Twists everything below around a point. Animate the angle for a hypnotic vortex.',
  params: [
    { key: 'angle', label: 'Angle', type: 'number', min: -720, max: 720, step: 1, default: 140, group: 'Twist', unit: '°', decimals: 0 },
    { key: 'radius', label: 'Radius', type: 'number', min: 0.05, max: 1.5, step: 0.01, default: 0.45, group: 'Twist', decimals: 2 },
    { key: 'speed', label: 'Oscillate', type: 'number', min: 0, max: 4, step: 0.01, default: 0.4, group: 'Twist', decimals: 2 },
    { key: 'centre', label: 'Centre', type: 'vec2', default: [0.5, 0.5], group: 'Origin' },
  ],
  glsl: `uniform float u_angle; uniform float u_radius; uniform float u_speed; uniform vec2 u_centre;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 d = (uv - u_centre) * as;
  float k = 1.0 - smoothstep(0.0, u_radius, length(d));
  float a = radians(u_angle) * (0.75 + 0.25 * sin(uTime * u_speed)) * k * k;
  float c = cos(a), s = sin(a);
  d = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
  return vec4(below(u_centre + d / as).rgb, 1.0);
}`,
};
