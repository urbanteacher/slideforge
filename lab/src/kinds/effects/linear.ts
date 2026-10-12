// Linear gradient: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const linearDef: KindDef = {
  id: 'linear', name: 'Linear gradient', category: 'generate',
  description: 'A smooth two-colour ramp at any angle.',
  params: [
    { key: 'colorA', label: 'From', type: 'color', default: '#1b1030', group: 'Colours' },
    { key: 'colorB', label: 'To', type: 'color', default: '#ff5a36', group: 'Colours' },
    { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 360, step: 1, default: 90, group: 'Shape', unit: '°', decimals: 0 },
    { key: 'bias', label: 'Midpoint', type: 'number', min: 0.05, max: 0.95, step: 0.01, default: 0.5, group: 'Shape', decimals: 2 },
  ],
  glsl: `uniform vec3 u_colorA; uniform vec3 u_colorB; uniform float u_angle; uniform float u_bias;
vec4 effect(vec2 uv) {
  float a = radians(u_angle);
  vec2 dir = vec2(cos(a), sin(a));
  vec2 p = (uv - 0.5) * aspect();
  float ext = abs(dir.x) * aspect().x * 0.5 + abs(dir.y) * 0.5;
  float t = clamp(dot(p, dir) / ext * 0.5 + 0.5, 0.0, 1.0);
  t = pow(t, log(0.5) / log(u_bias));
  return vec4(mix(u_colorA, u_colorB, smoothstep(0.0, 1.0, t)) + dither(), 1.0);
}`,
};
