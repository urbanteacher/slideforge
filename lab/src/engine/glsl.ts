// Shared GLSL used by every layer pass. Each layer supplies `vec4 effect(vec2 uv)` returning a
// straight-alpha colour; `main` blends it over the composite below using the layer blend mode.
// `uv` is slide space: (0,0) top-left, (1,1) bottom-right.

export const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const PRELUDE = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uBelow;
uniform vec2 uRes;      // logical slide size in px (e.g. 1920x1080)
uniform vec2 uPx;       // physical render size in px
uniform float uTime;
uniform vec2 uMouse;
uniform float uOpacity;
uniform int uBlend;
uniform float uSeed;

#define PI 3.14159265359
vec2 aspect() { return vec2(uRes.x / uRes.y, 1.0); }
vec4 below(vec2 uv) { return textureLod(uBelow, vec2(uv.x, 1.0 - uv.y), 0.0); }
vec4 belowLod(vec2 uv, float l) { return textureLod(uBelow, vec2(uv.x, 1.0 - uv.y), l); }
// Soft mip sample: a few jittered taps hide the blockiness of high mip levels.
vec3 softLod(vec2 uv, float l) {
  vec2 o = exp2(l) / uPx;
  vec3 c = belowLod(uv, l).rgb * 0.36;
  c += belowLod(uv + vec2( o.x,  o.y) * 0.7, l).rgb * 0.16;
  c += belowLod(uv + vec2(-o.x,  o.y) * 0.7, l).rgb * 0.16;
  c += belowLod(uv + vec2( o.x, -o.y) * 0.7, l).rgb * 0.16;
  c += belowLod(uv + vec2(-o.x, -o.y) * 0.7, l).rgb * 0.16;
  return c;
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float dither() { return (hash12(gl_FragCoord.xy) - 0.5) / 255.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * snoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`;

export const MAIN = /* glsl */ `
float softLightCh(float b, float s) {
  return s < 0.5 ? b - (1.0 - 2.0 * s) * b * (1.0 - b)
                 : b + (2.0 * s - 1.0) * ((b < 0.25 ? ((16.0 * b - 12.0) * b + 4.0) * b : sqrt(b)) - b);
}
vec3 blendMode(vec3 b, vec3 s, int m) {
  if (m == 1) return b * s;
  if (m == 2) return 1.0 - (1.0 - b) * (1.0 - s);
  if (m == 3) return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(0.5, b));
  if (m == 4) return vec3(softLightCh(b.r, s.r), softLightCh(b.g, s.g), softLightCh(b.b, s.b));
  if (m == 5) return mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(0.5, s));
  if (m == 6) return min(b, s);
  if (m == 7) return max(b, s);
  if (m == 8) return min(b / max(1.0 - s, 1e-4), 1.0);
  if (m == 9) return 1.0 - min((1.0 - b) / max(s, 1e-4), 1.0);
  if (m == 10) return abs(b - s);
  if (m == 11) return b + s - 2.0 * b * s;
  if (m == 12) return min(b + s, 1.0);
  return s;
}
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec4 b = textureLod(uBelow, vUv, 0.0);
  vec4 s = effect(uv);
  float a = clamp(s.a * uOpacity, 0.0, 1.0);
  vec3 c = mix(b.rgb, clamp(blendMode(b.rgb, s.rgb, uBlend), 0.0, 1.0), a);
  outColor = vec4(c, 1.0);
}
`;

// Content layers (text / image / shape) sample a rasterised texture through the layer's
// animated transform. Everything is computed per-pixel, so rotation/scale stay crisp.
export const CONTENT_GLSL = /* glsl */ `
uniform sampler2D uTex;
uniform vec4 uBox;      // x, y, w, h (slide px)
uniform vec4 uTexRect;  // texture rect relative to box top-left (slide px)
uniform float uRot;     // radians
uniform vec2 uScale;
uniform vec2 uOffset;   // px
uniform float uBlur;    // mip level
uniform vec4 uClip;     // visible window in box-normalised coords
uniform float uGlow;
vec4 effect(vec2 uv) {
  vec2 p = uv * uRes;
  vec2 c = uBox.xy + uBox.zw * 0.5 + uOffset;
  vec2 d = p - c;
  float cs = cos(-uRot), sn = sin(-uRot);
  d = vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs) / uScale;
  vec2 local = d + uBox.zw * 0.5;
  vec2 bn = local / uBox.zw;
  vec2 t = (local - uTexRect.xy) / uTexRect.zw;
  // Gradients are taken in uniform control flow and sampling is branch-free: an early return here
  // lets the compiler sink dFdx into divergent quads, which picks a garbage mip at the box edge.
  vec2 gx = dFdx(t), gy = dFdy(t);
  float inside = step(0.0, t.x) * step(0.0, t.y) * step(t.x, 1.0) * step(t.y, 1.0);
  t = clamp(t, 0.0, 1.0);
  vec4 col;
  if (uBlur > 0.02) {
    vec2 ts = vec2(textureSize(uTex, 0));
    vec2 o = exp2(uBlur) / ts;
    col = textureLod(uTex, t, uBlur) * 0.2;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * PI / 4.0;
      col += textureLod(uTex, t + vec2(cos(a), sin(a)) * o, uBlur) * 0.1;
    }
  } else {
    col = textureGrad(uTex, t, gx, gy);
  }
  col *= inside;
  float e = 0.004;
  float m = smoothstep(uClip.x - e, uClip.x + e, bn.x) * (1.0 - smoothstep(uClip.z - e, uClip.z + e, bn.x))
          * smoothstep(uClip.y - e, uClip.y + e, bn.y) * (1.0 - smoothstep(uClip.w - e, uClip.w + e, bn.y));
  vec3 rgb = col.a > 1e-4 ? col.rgb / col.a : vec3(0.0);
  rgb += uGlow * 0.18;
  return vec4(rgb, col.a * m);
}
`;
