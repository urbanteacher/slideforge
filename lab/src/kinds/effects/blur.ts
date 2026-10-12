// Blur: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const blurDef: KindDef = {
  id: 'blur', name: 'Blur', category: 'stylise', needsMips: true, mouseParam: 'focus',
  description: 'Uniform, tilt-shift or focus blur. Focus blur can follow the pointer.',
  params: [
    { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 1, step: 0.01, default: 0.4, group: 'Blur', decimals: 2 },
    { key: 'type', label: 'Type', type: 'select', options: [{ value: 'uniform', label: 'Uniform' }, { value: 'tilt', label: 'Tilt-shift' }, { value: 'focus', label: 'Focus' }], default: 'tilt', group: 'Blur' },
    { key: 'band', label: 'Focus size', type: 'number', min: 0, max: 1, step: 0.01, default: 0.3, group: 'Blur', decimals: 2, when: (p) => p.type !== 'uniform' },
    { key: 'focus', label: 'Focus', type: 'vec2', default: [0.5, 0.5], group: 'Blur', when: (p) => p.type !== 'uniform' },
  ],
  glsl: `uniform float u_amount; uniform float u_type; uniform float u_band; uniform vec2 u_focus;
vec4 effect(vec2 uv) {
  float amt = u_amount;
  if (u_type > 0.5 && u_type < 1.5) amt *= smoothstep(u_band * 0.5, u_band * 0.5 + 0.25, abs(uv.y - u_focus.y));
  if (u_type > 1.5) amt *= smoothstep(u_band * 0.5, u_band * 0.5 + 0.3, length((uv - u_focus) * aspect()));
  if (amt < 0.01) return vec4(below(uv).rgb, 1.0);
  return vec4(softLod(uv, amt * 5.5), 1.0);
}`,
};
