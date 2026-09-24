import type { BlendMode, Params, ParamValue } from '../model/types';

export type Category = 'source' | 'generate' | 'distort' | 'colour' | 'light' | 'stylise';

interface BaseParam { key: string; label: string; info?: string; group?: string; when?: (p: Params) => boolean }
export type ParamDef =
  | (BaseParam & { type: 'number'; min: number; max: number; step: number; default: number; unit?: string; decimals?: number })
  | (BaseParam & { type: 'color'; default: string; weightKey?: string })
  | (BaseParam & { type: 'select'; options: { value: string; label: string }[]; default: string })
  | (BaseParam & { type: 'bool'; default: boolean })
  | (BaseParam & { type: 'vec2'; default: [number, number] })
  | (BaseParam & { type: 'text'; default: string })
  | (BaseParam & { type: 'font'; default: string })
  | (BaseParam & { type: 'image'; default: string });

export interface KindDef {
  id: string;
  name: string;
  category: Category;
  featured?: boolean;
  description: string;
  content?: 'text' | 'image' | 'shape';
  params: ParamDef[];
  glsl?: string;
  needsMips?: boolean;
  mouseParam?: string; // vec2 param that can follow the pointer
  defaultBlend?: BlendMode;
  defaultFollowMouse?: boolean;
}

export const FONTS = [
  'Inter', 'Instrument Serif', 'Playfair Display', 'DM Serif Display', 'Fraunces',
  'Space Grotesk', 'Syne', 'Unbounded', 'Bebas Neue', 'JetBrains Mono', 'Georgia',
];

export const CATEGORIES: { id: Category | 'featured'; label: string }[] = [
  { id: 'source', label: 'Sources' },
  { id: 'featured', label: 'Featured' },
  { id: 'generate', label: 'Generate' },
  { id: 'distort', label: 'Distort' },
  { id: 'colour', label: 'Colour' },
  { id: 'light', label: 'Light' },
  { id: 'stylise', label: 'Stylise' },
];

const opt = (...v: string[]) => v.map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }));

const KINDS: KindDef[] = [
  // ─── Sources ──────────────────────────────────────────────────────────────
  {
    id: 'text', name: 'Text', category: 'source', content: 'text',
    description: 'Live, editable type. Double-click on the canvas to edit. Animate by letter, word or line.',
    params: [
      { key: 'text', label: 'Text', type: 'text', default: 'Say something bold', group: 'Text' },
      { key: 'font', label: 'Font', type: 'font', default: 'Instrument Serif', group: 'Text' },
      { key: 'size', label: 'Size', type: 'number', min: 8, max: 480, step: 1, default: 120, group: 'Text', unit: 'px', decimals: 0 },
      { key: 'weight', label: 'Weight', type: 'select', options: ['300', '400', '500', '600', '700', '800', '900'].map((v) => ({ value: v, label: v })), default: '400', group: 'Text' },
      { key: 'italic', label: 'Italic', type: 'bool', default: false, group: 'Text' },
      { key: 'color', label: 'Colour', type: 'color', default: '#111111', group: 'Text' },
      { key: 'align', label: 'Align', type: 'select', options: opt('left', 'center', 'right'), default: 'left', group: 'Text' },
      { key: 'lineHeight', label: 'Line height', type: 'number', min: 0.6, max: 2.4, step: 0.01, default: 1.0, group: 'Spacing', decimals: 2 },
      { key: 'tracking', label: 'Tracking', type: 'number', min: -0.15, max: 0.6, step: 0.005, default: -0.01, group: 'Spacing', decimals: 3, info: 'Letter spacing, in em.' },
      { key: 'uppercase', label: 'Uppercase', type: 'bool', default: false, group: 'Spacing' },
    ],
  },
  {
    id: 'image', name: 'Image', category: 'source', content: 'image',
    description: 'A photo or illustration. Drop a file on the canvas, paste one, or pick it here.',
    params: [
      { key: 'src', label: 'Image', type: 'image', default: '', group: 'Image' },
      { key: 'fit', label: 'Fit', type: 'select', options: opt('cover', 'contain'), default: 'contain', group: 'Image' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 400, step: 1, default: 0, group: 'Image', unit: 'px', decimals: 0 },
    ],
  },
  {
    id: 'shape', name: 'Shape', category: 'source', content: 'shape',
    description: 'Vector shapes for cards, badges and accents. Fills can be solid or gradient.',
    params: [
      { key: 'shape', label: 'Shape', type: 'select', options: opt('rect', 'ellipse', 'triangle', 'star', 'ring', 'arrow', 'line'), default: 'rect', group: 'Shape' },
      { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 400, step: 1, default: 24, group: 'Shape', unit: 'px', decimals: 0, when: (p) => p.shape === 'rect' },
      { key: 'points', label: 'Points', type: 'number', min: 3, max: 16, step: 1, default: 5, group: 'Shape', decimals: 0, when: (p) => p.shape === 'star' },
      { key: 'fill', label: 'Fill', type: 'color', default: '#ff5a36', group: 'Fill' },
      { key: 'gradient', label: 'Gradient', type: 'bool', default: false, group: 'Fill' },
      { key: 'fill2', label: 'Fill 2', type: 'color', default: '#ffb199', group: 'Fill', when: (p) => !!p.gradient },
      { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 360, step: 1, default: 135, group: 'Fill', unit: '°', decimals: 0, when: (p) => !!p.gradient },
      { key: 'stroke', label: 'Stroke', type: 'color', default: '#111111', group: 'Stroke' },
      { key: 'strokeWidth', label: 'Width', type: 'number', min: 0, max: 60, step: 0.5, default: 0, group: 'Stroke', unit: 'px', decimals: 1 },
    ],
  },

  // ─── Generate ─────────────────────────────────────────────────────────────
  {
    id: 'solid', name: 'Solid colour', category: 'generate',
    description: 'A flat field of colour. Replaces what is below unless you change its blend mode.',
    params: [{ key: 'color', label: 'Colour', type: 'color', default: '#f6efe9', group: 'Colour' }],
    glsl: `uniform vec3 u_color; vec4 effect(vec2 uv) { return vec4(u_color, 1.0); }`,
  },
  {
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
  },
  {
    id: 'mesh', name: 'Mesh gradient', category: 'generate', featured: true,
    description: 'Soft, slowly flowing colour fields. Replaces what is below unless you change its blend mode.',
    params: [
      { key: 'color1', label: 'Colour 1', type: 'color', default: '#c988c7', weightKey: 'w1', group: 'Colours' },
      { key: 'color2', label: 'Colour 2', type: 'color', default: '#ec66e2', weightKey: 'w2', group: 'Colours' },
      { key: 'color3', label: 'Colour 3', type: 'color', default: '#f7d3c2', weightKey: 'w3', group: 'Colours' },
      { key: 'color4', label: 'Colour 4', type: 'color', default: '#fff1b8', weightKey: 'w4', group: 'Colours' },
      { key: 'w1', label: 'Weight 1', type: 'number', min: 0, max: 100, step: 1, default: 18, group: '_hidden' },
      { key: 'w2', label: 'Weight 2', type: 'number', min: 0, max: 100, step: 1, default: 24, group: '_hidden' },
      { key: 'w3', label: 'Weight 3', type: 'number', min: 0, max: 100, step: 1, default: 26, group: '_hidden' },
      { key: 'w4', label: 'Weight 4', type: 'number', min: 0, max: 100, step: 1, default: 30, group: '_hidden' },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 5, step: 0.01, default: 1.2, group: 'Shape', decimals: 2, info: 'How quickly the colour fields drift.' },
      { key: 'softness', label: 'Softness', type: 'number', min: 0, max: 1, step: 0.01, default: 0.6, group: 'Shape', decimals: 2, info: 'Sharper edges at 0, fully blended at 1.' },
      { key: 'scale', label: 'Scale', type: 'number', min: 0.1, max: 2, step: 0.01, default: 0.7, group: 'Shape', decimals: 2, info: 'Amount of organic warping.' },
    ],
    glsl: `uniform vec3 u_color1; uniform vec3 u_color2; uniform vec3 u_color3; uniform vec3 u_color4;
uniform float u_w1; uniform float u_w2; uniform float u_w3; uniform float u_w4;
uniform float u_speed; uniform float u_softness; uniform float u_scale;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 p = uv * as;
  float t = uTime * u_speed * 0.12 + uSeed * 13.0;
  vec2 q = p * 1.3;
  p += u_scale * 0.35 * vec2(snoise(q + vec2(t * 0.8, -t * 0.4)), snoise(q + vec2(4.7 - t * 0.5, 2.1 + t * 0.6)));
  vec2 c1 = vec2(0.20 + 0.18 * sin(t * 1.1), 0.25 + 0.20 * cos(t * 0.9)) * as;
  vec2 c2 = vec2(0.80 + 0.15 * cos(t * 0.8), 0.22 + 0.18 * sin(t * 1.3)) * as;
  vec2 c3 = vec2(0.25 + 0.20 * cos(t * 0.7), 0.80 + 0.15 * sin(t * 1.0)) * as;
  vec2 c4 = vec2(0.78 + 0.17 * sin(t * 0.6), 0.78 + 0.16 * cos(t * 1.2)) * as;
  float s = mix(0.02, 0.9, u_softness * u_softness);
  float w1 = (u_w1 + 0.5) * exp(-dot(p - c1, p - c1) / s);
  float w2 = (u_w2 + 0.5) * exp(-dot(p - c2, p - c2) / s);
  float w3 = (u_w3 + 0.5) * exp(-dot(p - c3, p - c3) / s);
  float w4 = (u_w4 + 0.5) * exp(-dot(p - c4, p - c4) / s);
  float sum = w1 + w2 + w3 + w4 + 1e-6;
  vec3 col = (u_color1 * w1 + u_color2 * w2 + u_color3 * w3 + u_color4 * w4) / sum;
  return vec4(col + dither(), 1.0);
}`,
  },
  {
    id: 'aurora', name: 'Aurora', category: 'generate', featured: true,
    description: 'Domain-warped noise that folds three colours into slow, liquid ribbons.',
    params: [
      { key: 'color1', label: 'Base', type: 'color', default: '#0b0a1a', group: 'Colours' },
      { key: 'color2', label: 'Mid', type: 'color', default: '#3a2cff', group: 'Colours' },
      { key: 'color3', label: 'Highlight', type: 'color', default: '#ff6ad5', group: 'Colours' },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 4, step: 0.01, default: 1, group: 'Flow', decimals: 2 },
      { key: 'scale', label: 'Scale', type: 'number', min: 0.1, max: 3, step: 0.01, default: 0.6, group: 'Flow', decimals: 2 },
      { key: 'warp', label: 'Warp', type: 'number', min: 0, max: 4, step: 0.01, default: 1.2, group: 'Flow', decimals: 2 },
    ],
    glsl: `uniform vec3 u_color1; uniform vec3 u_color2; uniform vec3 u_color3;
uniform float u_speed; uniform float u_scale; uniform float u_warp;
float fbm3(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * snoise(p); p = p * 1.9 + 11.3; a *= 0.5; } return s; }
vec4 effect(vec2 uv) {
  vec2 p = uv * aspect() * u_scale + uSeed * 7.0;
  float t = uTime * u_speed * 0.06;
  vec2 q = vec2(fbm3(p + vec2(0.0, t)), fbm3(p + vec2(5.2, 1.3) - t));
  float f = fbm3(p + u_warp * q + vec2(t * 0.5, 0.0)) * 0.5 + 0.5;
  vec3 col = mix(u_color1, u_color2, smoothstep(0.25, 0.75, f));
  col = mix(col, u_color3, smoothstep(0.55, 0.95, f) * smoothstep(0.1, 0.8, length(q) + 0.25));
  return vec4(col + dither(), 1.0);
}`,
  },
  {
    id: 'grid', name: 'Grid', category: 'generate',
    description: 'Lines, dots or crosses on a precise grid. Drifts slowly and fades at the edges.',
    defaultBlend: 'normal',
    params: [
      { key: 'style', label: 'Style', type: 'select', options: opt('lines', 'dots', 'crosses'), default: 'lines', group: 'Pattern' },
      { key: 'color', label: 'Colour', type: 'color', default: '#ffffff', group: 'Pattern' },
      { key: 'spacing', label: 'Spacing', type: 'number', min: 8, max: 300, step: 1, default: 64, group: 'Pattern', unit: 'px', decimals: 0 },
      { key: 'thickness', label: 'Thickness', type: 'number', min: 0.5, max: 12, step: 0.1, default: 1, group: 'Pattern', unit: 'px', decimals: 1 },
      { key: 'fade', label: 'Edge fade', type: 'number', min: 0, max: 1, step: 0.01, default: 0.7, group: 'Motion', decimals: 2 },
      { key: 'drift', label: 'Drift', type: 'number', min: -3, max: 3, step: 0.01, default: 0.3, group: 'Motion', decimals: 2 },
    ],
    glsl: `uniform vec3 u_color; uniform float u_style; uniform float u_spacing; uniform float u_thickness; uniform float u_fade; uniform float u_drift;
vec4 effect(vec2 uv) {
  vec2 p = uv * uRes + vec2(0.0, uTime * u_drift * 20.0);
  vec2 g = mod(p, u_spacing) - u_spacing * 0.5;
  float px = uRes.x / uPx.x;
  float a;
  if (u_style < 0.5) {
    float d = min(abs(g.x), abs(g.y));
    a = 1.0 - smoothstep(u_thickness * 0.5, u_thickness * 0.5 + px, d);
  } else if (u_style < 1.5) {
    a = 1.0 - smoothstep(u_thickness, u_thickness + px, length(g));
  } else {
    float arm = u_spacing * 0.12;
    float d = min(max(abs(g.x), abs(g.y) - arm + u_thickness), max(abs(g.y), abs(g.x) - arm + u_thickness));
    a = 1.0 - smoothstep(u_thickness * 0.5, u_thickness * 0.5 + px, d);
  }
  a *= mix(1.0, 1.0 - smoothstep(0.15, 0.85, length((uv - 0.5) * aspect())), u_fade);
  return vec4(u_color, a);
}`,
  },

  // ─── Distort ──────────────────────────────────────────────────────────────
  {
    id: 'ripple', name: 'Ripple', category: 'distort', featured: true, mouseParam: 'centre', defaultFollowMouse: true,
    description: 'Rings travel out from a point and bend everything below.',
    params: [
      { key: 'strength', label: 'Strength', type: 'number', min: 0, max: 0.08, step: 0.001, default: 0.012, group: 'Waves', decimals: 3, info: 'How far pixels are pushed.' },
      { key: 'frequency', label: 'Frequency', type: 'number', min: 1, max: 80, step: 0.1, default: 24, group: 'Waves', decimals: 1, info: 'Rings per screen height.' },
      { key: 'harmonics', label: 'Harmonics', type: 'number', min: 1, max: 5, step: 1, default: 2, group: 'Waves', decimals: 0, info: 'Stacked wave layers for a richer surface.' },
      { key: 'speed', label: 'Speed', type: 'number', min: -6, max: 6, step: 0.01, default: 1.5, group: 'Waves', decimals: 2 },
      { key: 'falloff', label: 'Falloff', type: 'number', min: 0, max: 10, step: 0.1, default: 2.5, group: 'Waves', decimals: 1, info: 'How quickly rings fade away from the origin.' },
      { key: 'shape', label: 'Shape', type: 'select', options: opt('radial', 'linear'), default: 'radial', group: 'Origin' },
      { key: 'centre', label: 'Centre', type: 'vec2', default: [0.5, 0.5], group: 'Origin' },
    ],
    glsl: `uniform float u_strength; uniform float u_frequency; uniform float u_harmonics; uniform float u_speed; uniform float u_falloff; uniform float u_shape; uniform vec2 u_centre;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 d = (uv - u_centre) * as;
  float r = u_shape < 0.5 ? length(d) : abs(d.y);
  float w = 0.0;
  for (int i = 1; i <= 5; i++) {
    float fi = float(i);
    if (fi > u_harmonics + 0.5) break;
    w += sin(r * u_frequency * fi - uTime * u_speed * 3.0 * fi + fi * 1.7) / fi;
  }
  vec2 dir = u_shape < 0.5 ? (r > 1e-5 ? d / r : vec2(0.0)) : vec2(0.0, sign(d.y));
  vec2 off = dir * w * u_strength * exp(-r * u_falloff) / as;
  return vec4(below(uv + off).rgb, 1.0);
}`,
  },
  {
    id: 'wave', name: 'Liquid', category: 'distort', featured: true,
    description: 'Organic noise displacement, like looking through moving water or heat haze.',
    params: [
      { key: 'strength', label: 'Strength', type: 'number', min: 0, max: 0.1, step: 0.001, default: 0.02, group: 'Flow', decimals: 3 },
      { key: 'scale', label: 'Scale', type: 'number', min: 0.2, max: 12, step: 0.1, default: 3, group: 'Flow', decimals: 1 },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 5, step: 0.01, default: 0.8, group: 'Flow', decimals: 2 },
    ],
    glsl: `uniform float u_strength; uniform float u_scale; uniform float u_speed;
vec4 effect(vec2 uv) {
  vec2 p = uv * aspect() * u_scale;
  float t = uTime * u_speed * 0.3;
  vec2 off = vec2(snoise(p + vec2(t, 0.0)), snoise(p + vec2(3.1, -t))) * u_strength;
  return vec4(below(uv + off).rgb, 1.0);
}`,
  },
  {
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
  },
  {
    id: 'lens', name: 'Lens', category: 'distort', featured: true, mouseParam: 'centre', defaultFollowMouse: true,
    description: 'A magnifying bubble. Negative strength pinches instead of bulging.',
    params: [
      { key: 'strength', label: 'Strength', type: 'number', min: -1, max: 1, step: 0.01, default: 0.45, group: 'Lens', decimals: 2 },
      { key: 'radius', label: 'Radius', type: 'number', min: 0.03, max: 0.8, step: 0.01, default: 0.18, group: 'Lens', decimals: 2 },
      { key: 'fringe', label: 'Fringe', type: 'number', min: 0, max: 1, step: 0.01, default: 0.25, group: 'Lens', decimals: 2, info: 'Colour separation at the rim.' },
      { key: 'centre', label: 'Centre', type: 'vec2', default: [0.5, 0.5], group: 'Origin' },
    ],
    glsl: `uniform float u_strength; uniform float u_radius; uniform float u_fringe; uniform vec2 u_centre;
vec4 effect(vec2 uv) {
  vec2 as = aspect();
  vec2 d = (uv - u_centre) * as;
  float r = length(d) / u_radius;
  if (r >= 1.0) return vec4(below(uv).rgb, 1.0);
  float k = u_strength * (1.0 - r * r);
  vec2 dd = d * (1.0 - k * 0.7);
  float f = u_fringe * 0.012 * r * r * k;
  vec2 base = u_centre + dd / as;
  vec2 dir = r > 1e-4 ? normalize(d) / as : vec2(0.0);
  vec3 c = vec3(below(base + dir * f).r, below(base).g, below(base - dir * f).b);
  return vec4(c, 1.0);
}`,
  },

  // ─── Colour ───────────────────────────────────────────────────────────────
  {
    id: 'gradientMap', name: 'Gradient map', category: 'colour', featured: true,
    description: 'Remaps the brightness of everything below onto a three-stop colour ramp.',
    params: [
      { key: 'shadow', label: 'Shadows', type: 'color', default: '#2b0a3d', group: 'Ramp' },
      { key: 'mid', label: 'Midtones', type: 'color', default: '#e83f6f', group: 'Ramp' },
      { key: 'highlight', label: 'Highlights', type: 'color', default: '#ffe8d6', group: 'Ramp' },
      { key: 'contrast', label: 'Contrast', type: 'number', min: 0.2, max: 3, step: 0.01, default: 1.1, group: 'Tone', decimals: 2 },
      { key: 'shift', label: 'Shift', type: 'number', min: -0.5, max: 0.5, step: 0.01, default: 0, group: 'Tone', decimals: 2 },
    ],
    glsl: `uniform vec3 u_shadow; uniform vec3 u_mid; uniform vec3 u_highlight; uniform float u_contrast; uniform float u_shift;
vec4 effect(vec2 uv) {
  float l = clamp((luma(below(uv).rgb) - 0.5) * u_contrast + 0.5 + u_shift, 0.0, 1.0);
  vec3 c = l < 0.5 ? mix(u_shadow, u_mid, l * 2.0) : mix(u_mid, u_highlight, (l - 0.5) * 2.0);
  return vec4(c + dither(), 1.0);
}`,
  },
  {
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
  },

  // ─── Light ────────────────────────────────────────────────────────────────
  {
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
  },
  {
    id: 'glow', name: 'Glow', category: 'light', needsMips: true,
    description: 'Blooms the brightest parts of everything below for a luminous, filmic finish.',
    params: [
      { key: 'threshold', label: 'Threshold', type: 'number', min: 0, max: 1, step: 0.01, default: 0.55, group: 'Bloom', decimals: 2 },
      { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 4, step: 0.01, default: 1.2, group: 'Bloom', decimals: 2 },
      { key: 'radius', label: 'Radius', type: 'number', min: 0.3, max: 2, step: 0.01, default: 1, group: 'Bloom', decimals: 2 },
      { key: 'tint', label: 'Tint', type: 'color', default: '#ffffff', group: 'Bloom' },
    ],
    glsl: `uniform float u_threshold; uniform float u_intensity; uniform float u_radius; uniform vec3 u_tint;
vec4 effect(vec2 uv) {
  vec3 base = below(uv).rgb;
  vec3 acc = vec3(0.0);
  for (int i = 1; i <= 5; i++) {
    float fi = float(i);
    vec3 c = softLod(uv, fi * u_radius + 0.5);
    acc += max(c - u_threshold, 0.0) / (1.0 - u_threshold + 1e-3) * (1.2 / fi);
  }
  return vec4(base + acc * u_intensity * 0.35 * u_tint, 1.0);
}`,
  },
  {
    id: 'leak', name: 'Light leak', category: 'light', defaultBlend: 'screen',
    description: 'Warm, drifting film light bleeding in from the edges.',
    params: [
      { key: 'color1', label: 'Colour 1', type: 'color', default: '#ff6a2b', group: 'Light' },
      { key: 'color2', label: 'Colour 2', type: 'color', default: '#ffd166', group: 'Light' },
      { key: 'intensity', label: 'Intensity', type: 'number', min: 0, max: 2, step: 0.01, default: 0.8, group: 'Light', decimals: 2 },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 4, step: 0.01, default: 0.6, group: 'Light', decimals: 2 },
    ],
    glsl: `uniform vec3 u_color1; uniform vec3 u_color2; uniform float u_intensity; uniform float u_speed;
vec4 effect(vec2 uv) {
  float t = uTime * u_speed * 0.25 + uSeed * 9.0;
  vec2 p = uv * aspect();
  float n = snoise(p * 1.1 + vec2(t, -t * 0.7)) * 0.5 + 0.5;
  float n2 = snoise(p * 2.3 - vec2(t * 0.6, t)) * 0.5 + 0.5;
  float edgeL = pow(max(1.0 - uv.x * (1.4 + 0.4 * sin(t + uv.y * 3.0)), 0.0), 2.0);
  float edgeR = pow(max(uv.x * 1.5 - 0.8 + 0.2 * cos(t * 0.8 + uv.y * 2.0), 0.0), 2.0);
  float a = (edgeL + edgeR * 0.8) * (0.4 + n) * u_intensity;
  return vec4(mix(u_color1, u_color2, n2), clamp(a, 0.0, 1.0));
}`,
  },

  // ─── Stylise ──────────────────────────────────────────────────────────────
  {
    id: 'grain', name: 'Film grain', category: 'stylise', featured: true,
    description: 'Fine, animated photographic grain. Adds texture and hides gradient banding.',
    params: [
      { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 0.5, step: 0.005, default: 0.09, group: 'Grain', decimals: 3 },
      { key: 'size', label: 'Size', type: 'number', min: 0.5, max: 6, step: 0.1, default: 1.4, group: 'Grain', unit: 'px', decimals: 1 },
      { key: 'speed', label: 'Speed', type: 'number', min: 0, max: 2, step: 0.01, default: 1, group: 'Grain', decimals: 2 },
      { key: 'colour', label: 'Colour grain', type: 'bool', default: false, group: 'Grain' },
    ],
    glsl: `uniform float u_amount; uniform float u_size; uniform float u_speed; uniform float u_colour;
vec4 effect(vec2 uv) {
  vec3 c = below(uv).rgb;
  vec2 p = floor(uv * uRes / u_size);
  float t = floor(uTime * u_speed * 24.0);
  vec3 n = vec3(hash12(p + t * 17.13) + hash12(p * 1.7 + t * 5.31) - 1.0);
  if (u_colour > 0.5) n = vec3(n.x, hash12(p + t * 3.1 + 11.0) + hash12(p * 0.7 + t) - 1.0, hash12(p + t * 7.7 + 23.0) + hash12(p * 1.3 - t) - 1.0);
  c += n * u_amount * (1.0 - 0.7 * abs(luma(c) - 0.5) * 2.0);
  return vec4(c, 1.0);
}`,
  },
  {
    id: 'halftone', name: 'Halftone', category: 'stylise',
    description: 'Print-style dot screen. Mono ink or full colour.',
    params: [
      { key: 'size', label: 'Dot size', type: 'number', min: 3, max: 60, step: 0.5, default: 10, group: 'Screen', unit: 'px', decimals: 1 },
      { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 90, step: 1, default: 45, group: 'Screen', unit: '°', decimals: 0 },
      { key: 'mode', label: 'Mode', type: 'select', options: opt('mono', 'colour'), default: 'mono', group: 'Ink' },
      { key: 'ink', label: 'Ink', type: 'color', default: '#141414', group: 'Ink', when: (p) => p.mode === 'mono' },
      { key: 'paper', label: 'Paper', type: 'color', default: '#f4ede4', group: 'Ink' },
    ],
    glsl: `uniform float u_size; uniform float u_angle; uniform float u_mode; uniform vec3 u_ink; uniform vec3 u_paper;
vec4 effect(vec2 uv) {
  float a = radians(u_angle);
  mat2 R = mat2(cos(a), sin(a), -sin(a), cos(a));
  vec2 p = R * (uv * uRes);
  vec2 cell = floor(p / u_size);
  vec2 f = fract(p / u_size) - 0.5;
  vec2 cp = transpose(R) * ((cell + 0.5) * u_size) / uRes;
  vec3 s = below(cp).rgb;
  float l = luma(s);
  float d = length(f);
  float aa = (uRes.x / uPx.x) / u_size;
  if (u_mode < 0.5) {
    float rad = sqrt(1.0 - l) * 0.72;
    float ink = 1.0 - smoothstep(rad - aa, rad + aa, d);
    return vec4(mix(u_paper, u_ink, ink), 1.0);
  }
  float rad = sqrt(clamp(1.0 - l * 0.6, 0.0, 1.0)) * 0.72;
  float ink = 1.0 - smoothstep(rad - aa, rad + aa, d);
  return vec4(mix(u_paper, s, ink), 1.0);
}`,
  },
  {
    id: 'pixelate', name: 'Pixelate', category: 'stylise',
    description: 'Chunky pixel mosaic. Try it as a slide transition by animating opacity.',
    params: [{ key: 'size', label: 'Cell size', type: 'number', min: 2, max: 120, step: 1, default: 16, group: 'Mosaic', unit: 'px', decimals: 0 }],
    glsl: `uniform float u_size;
vec4 effect(vec2 uv) {
  vec2 p = (floor(uv * uRes / u_size) + 0.5) * u_size / uRes;
  return vec4(below(p).rgb, 1.0);
}`,
  },
  {
    id: 'chroma', name: 'Chromatic shift', category: 'stylise',
    description: 'Splits red and blue channels apart like a cheap lens or a glitch.',
    params: [
      { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 3, step: 0.01, default: 0.6, group: 'Shift', decimals: 2 },
      { key: 'mode', label: 'Mode', type: 'select', options: opt('radial', 'linear'), default: 'radial', group: 'Shift' },
      { key: 'angle', label: 'Angle', type: 'number', min: 0, max: 360, step: 1, default: 0, group: 'Shift', unit: '°', decimals: 0, when: (p) => p.mode === 'linear' },
    ],
    glsl: `uniform float u_amount; uniform float u_mode; uniform float u_angle;
vec4 effect(vec2 uv) {
  float a = radians(u_angle);
  vec2 dir = u_mode < 0.5 ? (uv - 0.5) : vec2(cos(a), sin(a)) * 0.5;
  vec2 o = dir * u_amount * 0.02;
  return vec4(below(uv + o).r, below(uv).g, below(uv - o).b, 1.0);
}`,
  },
  {
    id: 'vignette', name: 'Vignette', category: 'stylise',
    description: 'Darkens (or tints) the corners to pull the eye to the centre.',
    params: [
      { key: 'amount', label: 'Amount', type: 'number', min: 0, max: 1, step: 0.01, default: 0.55, group: 'Vignette', decimals: 2 },
      { key: 'radius', label: 'Radius', type: 'number', min: 0, max: 1.2, step: 0.01, default: 0.45, group: 'Vignette', decimals: 2 },
      { key: 'softness', label: 'Softness', type: 'number', min: 0.01, max: 1.5, step: 0.01, default: 0.7, group: 'Vignette', decimals: 2 },
      { key: 'color', label: 'Colour', type: 'color', default: '#000000', group: 'Vignette' },
    ],
    glsl: `uniform float u_amount; uniform float u_radius; uniform float u_softness; uniform vec3 u_color;
vec4 effect(vec2 uv) {
  float r = length(uv - 0.5) * 1.4142;
  float v = smoothstep(u_radius, u_radius + u_softness, r) * u_amount;
  return vec4(mix(below(uv).rgb, u_color, v), 1.0);
}`,
  },
  {
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
  },
];

export const REGISTRY: Record<string, KindDef> = Object.fromEntries(KINDS.map((k) => [k.id, k]));
export const ALL_KINDS = KINDS;

export function kind(id: string): KindDef {
  return REGISTRY[id] ?? REGISTRY.solid;
}

export function defaultParams(k: KindDef): Params {
  const p: Params = {};
  for (const d of k.params) p[d.key] = (Array.isArray(d.default) ? [...d.default] : d.default) as ParamValue;
  return p;
}

export function kindsIn(cat: Category | 'featured'): KindDef[] {
  if (cat === 'featured') return KINDS.filter((k) => k.featured);
  return KINDS.filter((k) => k.category === cat);
}

export const CATEGORY_LABEL: Record<Category, string> = {
  source: 'Source', generate: 'Generate', distort: 'Distort', colour: 'Colour', light: 'Light', stylise: 'Stylise',
};
