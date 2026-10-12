// Backdrop motion: an effect layer's params and its GLSL (from engine/registry.ts).
import { type KindDef } from '../../engine';

export const backdropDef: KindDef = {
  // SlideForge's cover motion (css/app.css, "generated cover motion"), drawn on the GPU: the same
  // three blurred washes of the theme's own colours on the same closed paths and periods, so a
  // slide that moves in SlideForge moves the same way here. Every colour is laid over the ground
  // at low strength, so it is pale on paper and a glow on midnight.
  id: 'backdrop', name: 'Backdrop motion', category: 'generate', featured: true,
  description: 'Drift, Grid or Glow — slow motion behind the words, made from the slide’s own colours. Speed 1 is SlideForge’s own pace, a cycle of half a minute or more; it starts faster, so the movement shows.',
  defaultBlend: 'normal',
  params: [
    { key: 'mode', label: 'Motion', type: 'select', options: [{ value: 'drift', label: 'Drift — colour moving slowly' }, { value: 'grid', label: 'Grid — a ruled plane travelling' }, { value: 'glow', label: 'Glow — one slow breath' }], default: 'drift', group: 'Motion' },
    { key: 'accent', label: 'Accent', type: 'color', default: '#ff5a36', group: 'Colours' },
    { key: 'accent2', label: 'Second accent', type: 'color', default: '#ffb199', group: 'Colours' },
    { key: 'ink', label: 'Ink', type: 'color', default: '#161616', group: 'Colours', info: 'The text colour: the third wash and the grid lines.' },
    { key: 'strength', label: 'Strength', type: 'number', min: 0, max: 2.5, step: 0.01, default: 1, group: 'Motion', decimals: 2 },
    // SlideForge's periods (31, 43, 37 and 19 s) move a colour a few pixels a second: behind a lecture
    // that is the point, but on the canvas it reads as a still picture. It starts at 2.5×, a cycle of
    // 12 to 17 s; 1 is SlideForge's own pace.
    { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 6, step: 0.01, default: 2.5, group: 'Motion', decimals: 2, info: '1 is SlideForge’s own pace: a cycle of half a minute or more.' },
  ],
  glsl: `uniform float u_mode; uniform vec3 u_accent; uniform vec3 u_accent2; uniform vec3 u_ink; uniform float u_strength; uniform float u_speed;
// ease-in-out there and back over one period, as the CSS keyframes do
float swing(float period) { return 0.5 - 0.5 * cos(6.2831853 * uTime * u_speed / period); }
// a disc of diameter d, blurred by b, centred at c (slide px)
float blob(vec2 p, vec2 c, float d, float b) { return 1.0 - smoothstep(d * 0.5 - b * 1.6, d * 0.5 + b * 1.6, length(p - c)); }
vec4 over(vec4 acc, vec3 col, float a) { return vec4(col * a + acc.rgb * (1.0 - a), a + acc.a * (1.0 - a)); }
vec4 effect(vec2 uv) {
  vec2 p = uv * uRes;
  float W = uRes.x, H = uRes.y, k = W / 1920.0;
  float blur = 96.0 * k;
  vec4 acc = vec4(0.0);
  if (u_mode < 1.5) {
    // mo-1: 58% wide, top-left; mo-2: 58%, right; periods 31 s and 43 s
    float s1 = swing(31.0), s2 = swing(43.0);
    float d1 = 0.58 * W * (1.0 + 0.08 * s1), d2 = 0.58 * W * (1.04 - 0.04 * s2);
    vec2 c1 = vec2(0.21 * W, -0.14 * H + 0.29 * W) + vec2(0.14, 0.10) * 0.58 * W * s1;
    vec2 c2 = vec2(0.83 * W, 0.12 * H + 0.29 * W) + vec2(-0.12, 0.14) * 0.58 * W * s2;
    acc = over(acc, u_accent, 0.40 * blob(p, c1, d1, blur));
    acc = over(acc, u_accent2, 0.34 * blob(p, c2, d2, blur));
    if (u_mode < 0.5) {
      // mo-3: 66% wide, ink, low along the bottom; 37 s
      float s3 = swing(37.0);
      float d3 = 0.66 * W * (1.0 + 0.1 * s3);
      vec2 c3 = vec2(0.59 * W, 1.26 * H - 0.33 * W) + vec2(0.08, -0.12) * 0.66 * W * s3;
      acc = over(acc, u_ink, 0.14 * blob(p, c3, d3, blur));
    } else {
      // a ruled plane, one 120px cell every 24 s, so each cycle is the same picture again
      float cell = 120.0 * k, t = fract(uTime * u_speed / 24.0) * cell;
      vec2 g = mod(p - vec2(t), cell);
      float px = uRes.x / uPx.x, w = 1.5 * k;
      float line = max(1.0 - smoothstep(w, w + px, g.x), 1.0 - smoothstep(w, w + px, g.y));
      acc = over(acc, u_ink, 0.09 * line);
    }
  } else {
    // one breath behind the words: 92% wide, opacity .55 → .9, scale 1 → 1.12, 19 s
    float s = swing(19.0);
    float r = 0.46 * W * (1.0 + 0.12 * s);
    float f = 1.0 - smoothstep(0.0, 1.0, length(p - vec2(0.5 * W, 0.5 * H)) / r);
    acc = over(acc, u_accent, 0.34 * mix(0.55, 0.9, s) * f * f * (3.0 - 2.0 * f));
  }
  float a = clamp(acc.a * u_strength, 0.0, 1.0);
  return vec4((acc.a > 0.0 ? acc.rgb / acc.a : u_accent) + dither(), a);
}`,
};
