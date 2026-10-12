// Adjust: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const adjustDef: KindDef = {
  id: 'adjust', name: 'Adjust', category: 'colour',
  description: 'Brightness, contrast, saturation, hue and temperature for everything below.',
  params: [
    { key: 'brightness', label: 'Brightness', type: 'number', min: -0.5, max: 0.5, step: 0.01, default: 0, group: 'Tone', decimals: 2 },
    { key: 'contrast', label: 'Contrast', type: 'number', min: 0, max: 2.5, step: 0.01, default: 1.1, group: 'Tone', decimals: 2 },
    { key: 'saturation', label: 'Saturation', type: 'number', min: 0, max: 2.5, step: 0.01, default: 1.2, group: 'Colour', decimals: 2 },
    { key: 'hue', label: 'Hue', type: 'number', min: -180, max: 180, step: 1, default: 0, group: 'Colour', unit: '°', decimals: 0 },
    { key: 'temperature', label: 'Temperature', type: 'number', min: -1, max: 1, step: 0.01, default: 0, group: 'Colour', decimals: 2 },
  ],
  glsl: `uniform float u_brightness; uniform float u_contrast; uniform float u_saturation; uniform float u_hue; uniform float u_temperature;
vec4 effect(vec2 uv) {
  vec3 c = below(uv).rgb + u_brightness;
  c = (c - 0.5) * u_contrast + 0.5;
  c = mix(vec3(luma(c)), c, u_saturation);
  vec3 h = rgb2hsv(clamp(c, 0.0, 1.0)); h.x = fract(h.x + u_hue / 360.0); c = hsv2rgb(h);
  c += vec3(0.08, 0.02, -0.08) * u_temperature;
  return vec4(c, 1.0);
}`,
};
