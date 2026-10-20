/*
 * Slide transitions: one shader, every type a branch. The moves (push, zoom, camera) are motion-blurred
 * over a 180° shutter — the motion studio's 3-subframe blur (lib/js/motion.js), done as taps in the shader
 * so it costs one pass. Edges that glow (dissolve, iris, shape) take the incoming slide's accent, so a
 * transition is in the theme's colours rather than a fixed orange. Reduced motion never reaches here: the
 * renderer turns every transition into a crossfade first.
 */
import type { Deck, Slide, TransitionType } from '../core';
import { PRELUDE } from './glsl';

export const TRANSITION_INDEX: Record<TransitionType, number> = {
  none: 0, fade: 1, push: 2, zoom: 3, ripple: 4, dissolve: 5, wipe: 6, pixelate: 7, blur: 8, morph: 1,
  iris: 9, shape: 10, camera: 11,
};

/** The edge colour a transition uses when no theme gives one: the original burn-dissolve orange. */
export const DEFAULT_EDGE = '#ff7333';

/** What a transition draws with besides the two slides. */
export interface TransitionLook {
  /** The incoming slide's accent: the burn edge, the iris ring, the shape's outline. */
  edge?: string;
  /** What shows between the slides while the camera travels: the incoming slide's ground. */
  gap?: string;
  /** How far progress moves in half a frame (motion blur span); 0 = sharp. See transitionSpread. */
  spread?: number;
  /** Where an iris opens from, 0..1 across and down the slide. */
  centre?: [number, number];
}

/**
 * The motion-blur span for an eased transition at `raw` (0..1) of `dur` seconds: how far eased progress
 * travels across a 180° shutter (±¼ frame). Fast in the middle of the move, nothing at rest.
 */
export function transitionSpread(ease: (u: number) => number, raw: number, dur: number, fps = 60): number {
  if (!(dur > 0)) return 0;
  const h = 0.25 / fps / dur;
  const lo = Math.max(0, raw - h), hi = Math.min(1, raw + h);
  return Math.abs(ease(hi) - ease(lo));
}

/**
 * The accent a transition's edge takes for a slide. The engine knows no themes (layouts/ does, and the
 * engine may not import it), so layouts registers how to read one when it loads, as kinds register
 * themselves. Without it — the bare export player — edges keep DEFAULT_EDGE.
 */
type EdgeResolver = (deck: Pick<Deck, 'theme' | 'styleGuide'>, slide: Slide) => string | undefined;
let resolveEdge: EdgeResolver | null = null;
export function setEdgeResolver(fn: EdgeResolver | null) { resolveEdge = fn; }
export function transitionEdge(deck: Pick<Deck, 'theme' | 'styleGuide'>, slide: Slide): string {
  const c = resolveEdge?.(deck, slide);
  return c && /^#[0-9a-f]{3,8}$/i.test(c) ? c : DEFAULT_EDGE;
}

/** Types whose movement is blurred. */
export const BLURRED: TransitionType[] = ['push', 'zoom', 'camera'];

export const TRANSITION_FRAG = PRELUDE + /* glsl */ `
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uP;
uniform int uType;
uniform float uDir;
uniform float uSpread;
uniform vec3 uEdge;
uniform vec3 uGap;
uniform vec2 uCenter;
vec3 SA(vec2 uv, float l) { if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec3(0.0); return textureLod(uA, vec2(uv.x, 1.0 - uv.y), l).rgb; }
vec3 SB(vec2 uv, float l) { if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec3(0.0); return textureLod(uB, vec2(uv.x, 1.0 - uv.y), l).rgb; }
bool inside(vec2 q) { return q.x >= 0.0 && q.x <= 1.0 && q.y >= 0.0 && q.y <= 1.0; }

vec3 pushAt(vec2 uv, float p) {
  float x = uv.x + p * uDir;
  vec3 a = SA(vec2(uv.x + p * uDir, uv.y), 0.0);
  vec3 b = SB(vec2(uv.x + (p - 1.0) * uDir, uv.y), 0.0);
  bool inB = uDir > 0.0 ? x > 1.0 : x < 0.0;
  float edge = uDir > 0.0 ? x - 1.0 : -x;
  return inB ? b * (0.85 + 0.15 * smoothstep(0.0, 0.08, edge)) : a * (1.0 - 0.35 * p);
}
vec3 zoomAt(vec2 uv, float p) {
  vec3 a = SA((uv - 0.5) / (1.0 + p * 0.35) + 0.5, 0.0);
  vec3 b = SB((uv - 0.5) / (0.88 + 0.12 * p) + 0.5, 0.0);
  return mix(a, b, smoothstep(0.15, 0.85, p));
}
// Camera travel: both slides sit side by side in one world, a gutter apart. The camera pulls back,
// pans across, and pushes in on the next — one world, one camera, rather than a cut.
vec3 cameraAt(vec2 uv, float p) {
  float gutter = 1.08;
  float z = 1.0 - 0.22 * sin(p * PI);
  vec2 w = (uv - 0.5) / z + 0.5;
  w.x += p * uDir * gutter;
  if (inside(w)) return SA(w, 0.0);
  vec2 wb = vec2(w.x - uDir * gutter, w.y);
  if (inside(wb)) return SB(wb, 0.0);
  return uGap;
}
// Each move sampled across ±half the spread: five taps make a 180° shutter.
vec3 blurred(vec2 uv, float p) {
  vec3 c = vec3(0.0);
  for (int k = 0; k < 5; k++) {
    float q = clamp(p + uSpread * (float(k) / 4.0 - 0.5), 0.0, 1.0);
    if (uType == 2) c += pushAt(uv, q);
    else if (uType == 3) c += zoomAt(uv, q);
    else c += cameraAt(uv, q);
  }
  return c / 5.0;
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float p = uP;
  vec3 c;
  if (uType == 1) {
    c = mix(SA(uv, 0.0), SB(uv, 0.0), p);
  } else if (uType == 2 || uType == 3 || uType == 11) {
    c = blurred(uv, p);
  } else if (uType == 4) {
    vec2 as = aspect();
    vec2 d = (uv - 0.5) * as;
    float r = length(d);
    float R = p * 1.25;
    float env = sin(p * PI);
    vec2 off = (r > 1e-4 ? d / r : vec2(0.0)) * sin((r - R) * 38.0) * 0.022 * env * exp(-abs(r - R) * 5.0) / as;
    float m = smoothstep(R + 0.04, R - 0.04, r);
    c = mix(SA(uv + off, 0.0), SB(uv + off, 0.0), m);
  } else if (uType == 5) {
    float n = fbm(uv * aspect() * 3.0 + uSeed) * 0.5 + 0.5;
    float th = p * 1.3 - 0.15;
    float m = smoothstep(th + 0.03, th - 0.03, n);
    float e = smoothstep(0.06, 0.0, abs(n - th)) * (1.0 - p) * step(0.001, p);
    c = mix(SA(uv, 0.0), SB(uv, 0.0), m) + uEdge * e * 1.4;
  } else if (uType == 6) {
    float x = uDir > 0.0 ? uv.x + (uv.y - 0.5) * 0.2 : 1.0 - uv.x + (uv.y - 0.5) * 0.2;
    float m = smoothstep(p * 1.3 - 0.15 + 0.06, p * 1.3 - 0.15 - 0.06, x);
    c = mix(SA(uv, 0.0), SB(uv, 0.0), m);
  } else if (uType == 7) {
    float s = mix(1.0, 64.0, sin(p * PI));
    vec2 q = (floor(uv * uRes / s) + 0.5) * s / uRes;
    c = p < 0.5 ? SA(q, 0.0) : SB(q, 0.0);
  } else if (uType == 8) {
    float l = sin(p * PI) * 5.0;
    c = mix(SA(uv, l), SB(uv, l), smoothstep(0.3, 0.7, p));
  } else if (uType == 9) {
    // Iris: the next slide opens in a circle from uCenter, a thin ring of the accent on its edge.
    vec2 as = aspect();
    float r = length((uv - uCenter) * as);
    vec2 far = max(uCenter, 1.0 - uCenter) * as;
    float R = p * (length(far) + 0.02);
    float px = 1.5 / uRes.y;
    float m = smoothstep(R + px, R - px, r);
    c = mix(SA(uv, 0.0), SB(uv, 0.0), m);
    float ring = smoothstep(4.0 * px, 0.0, abs(r - R)) * sin(p * PI);
    c = mix(c, uEdge, ring * 0.9);
  } else if (uType == 10) {
    // Shape wipe: the signature shape, a rectangle with its top-right and bottom-left corners cut,
    // grows from the middle until it holds the whole of the next slide; its outline is the accent.
    vec2 as = aspect();
    vec2 q = (uv - 0.5) * as;
    vec2 hw = 0.5 * as * (p * 1.55);
    vec2 dd = abs(q) - hw;
    float box = max(dd.x, dd.y);
    float cut = 0.35 * min(hw.x, hw.y);
    float ch = (abs(q.x - q.y) - (hw.x + hw.y - cut)) * 0.70710678; // y runs down: x − y cuts top-right and bottom-left
    float d = max(box, ch);
    float px = 1.5 / uRes.y;
    float m = smoothstep(px, -px, d) * step(0.0001, p);
    c = mix(SA(uv, 0.0), SB(uv, 0.0), m);
    float line = smoothstep(4.0 * px, 0.0, abs(d)) * sin(p * PI);
    c = mix(c, uEdge, line * 0.9);
  } else {
    c = SB(uv, 0.0);
  }
  outColor = vec4(c, 1.0);
}`;
