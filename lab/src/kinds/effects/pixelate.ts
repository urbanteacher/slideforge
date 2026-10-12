// Pixelate: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const pixelateDef: KindDef = {
  id: 'pixelate', name: 'Pixelate', category: 'stylise',
  description: 'Chunky pixel mosaic. Try it as a slide transition by animating opacity.',
  params: [{ key: 'size', label: 'Cell size', type: 'number', min: 2, max: 120, step: 1, default: 16, group: 'Mosaic', unit: 'px', decimals: 0 }],
  glsl: `uniform float u_size;
vec4 effect(vec2 uv) {
  vec2 p = (floor(uv * uRes / u_size) + 0.5) * u_size / uRes;
  return vec4(below(p).rgb, 1.0);
}`,
};
