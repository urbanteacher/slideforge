import { defaultAnim, defaultInteract } from '../engine/anim';
import { contentHeight } from '../engine/raster';
import { defaultParams, kind } from '../engine/registry';
import type { Anim, Box, Deck, Interact, Layer, Params, Slide } from './types';

export const DECK_W = 1920;
export const DECK_H = 1080;

export const uid = () => Math.random().toString(36).slice(2, 10);

interface LayerOpts {
  name?: string;
  params?: Params;
  box?: Partial<Box>;
  anim?: Partial<Anim>;
  interact?: Partial<Interact>;
  opacity?: number;
  blend?: Layer['blend'];
}

export function createLayer(kindId: string, o: LayerOpts = {}): Layer {
  const k = kind(kindId);
  const params = { ...defaultParams(k), ...(o.params ?? {}) };
  let box: Box | undefined;
  if (k.content) {
    const BOXES: Record<string, Omit<Box, 'rot'>> = {
      text: { x: 200, y: 420, w: 1200, h: 120 },
      image: { x: 610, y: 190, w: 700, h: 700 },
      video: { x: 320, y: 180, w: 1280, h: 720 },
      chart: { x: 360, y: 220, w: 1200, h: 640 },
      quiz: { x: 260, y: 270, w: 1400, h: 540 },
      activity: { x: 360, y: 250, w: 1200, h: 580 },
      note: { x: 360, y: 760, w: 1200, h: 160 },
      quote: { x: 300, y: 300, w: 1320, h: 420 },
    };
    const base: Box = { ...(BOXES[k.content] ?? { x: 760, y: 340, w: 400, h: 400 }), rot: 0 };
    box = { ...base, ...(o.box ?? {}) };
    box.h = contentHeight({ kind: k.id, params }, box.w) ?? box.h;
  }
  return {
    id: uid(),
    kind: k.id,
    name: o.name ?? (k.content === 'text' ? String(params.text).split('\n')[0].slice(0, 28) : k.name),
    visible: true,
    locked: false,
    opacity: o.opacity ?? 1,
    blend: o.blend ?? k.defaultBlend ?? 'normal',
    params,
    box,
    anim: { ...defaultAnim(), ...(o.anim ?? {}) },
    interact: { ...defaultInteract(), followMouse: !!k.defaultFollowMouse, ...(o.interact ?? {}) },
  };
}

export function createSlide(name = 'Slide', layers: Layer[] = [], background = '#f6efe9', transition: Slide['transition'] = { type: 'fade', duration: 0.9 }): Slide {
  return { id: uid(), name, background, layers, transition, notes: '' };
}

/** Deep-copy a slide/layer with fresh ids (for duplicate / insert-from-gallery). */
export function cloneLayer(l: Layer): Layer {
  return { ...structuredClone(l), id: uid() };
}
export function cloneSlide(s: Slide): Slide {
  return { ...structuredClone(s), id: uid(), layers: s.layers.map(cloneLayer) };
}

// ─── Artwork ────────────────────────────────────────────────────────────────
// An original folk-art rosette, drawn procedurally so the demo ships with a hero image.
export function rosetteSvg(): string {
  const cx = 500, cy = 500;
  const petal = (r: number, len: number, wid: number, n: number, fill: string, rot = 0, stroke = 'none') => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (360 / n) * i + rot;
      s += `<path transform="rotate(${a} ${cx} ${cy})" d="M ${cx} ${cy - r} C ${cx + wid} ${cy - r - len * 0.35}, ${cx + wid * 0.7} ${cy - r - len * 0.9}, ${cx} ${cy - r - len} C ${cx - wid * 0.7} ${cy - r - len * 0.9}, ${cx - wid} ${cy - r - len * 0.35}, ${cx} ${cy - r} Z" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
    }
    return s;
  };
  const dots = (r: number, n: number, size: number, fill: string, rot = 0) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = ((360 / n) * i + rot) * (Math.PI / 180);
      s += `<circle cx="${cx + Math.cos(a) * r}" cy="${cy + Math.sin(a) * r}" r="${size}" fill="${fill}"/>`;
    }
    return s;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
${petal(250, 230, 70, 12, '#111', 15)}
${petal(245, 200, 52, 12, '#c8102e', 15)}
${petal(250, 120, 22, 12, '#f3e3c3', 15)}
${petal(200, 250, 90, 12, '#111', 0)}
${petal(200, 215, 70, 12, '#e23b3b', 0)}
${petal(205, 150, 30, 12, '#f7d9a8', 0)}
${dots(470, 24, 9, '#111', 7.5)}
<circle cx="${cx}" cy="${cy}" r="215" fill="#111"/>
<circle cx="${cx}" cy="${cy}" r="200" fill="#c8102e"/>
${petal(40, 150, 46, 10, '#111', 18)}
${petal(44, 128, 36, 10, '#f3e3c3', 18)}
${petal(50, 95, 18, 10, '#e89b3a', 18)}
${dots(178, 30, 6, '#f3e3c3')}
<circle cx="${cx}" cy="${cy}" r="62" fill="#111"/>
<circle cx="${cx}" cy="${cy}" r="48" fill="#f3c969"/>
${dots(30, 8, 7, '#111', 22)}
<circle cx="${cx}" cy="${cy}" r="12" fill="#c8102e"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ─── Templates ──────────────────────────────────────────────────────────────
const T = (text: string, font: string, size: number, color: string, box: Partial<Box>, extra: Params = {}, anim: Partial<Anim> = {}, interact: Partial<Interact> = {}) =>
  createLayer('text', { params: { text, font, size, color, ...extra }, box, anim, interact });

export const TEMPLATES: { id: string; name: string; make: () => Slide }[] = [
  {
    id: 'editorial', name: 'Editorial title',
    make: () => createSlide('Editorial title', [
      createLayer('mesh', {}),
      T('SLIDEFORGE STUDIO', 'Inter', 22, '#b3122e', { x: 110, y: 70, w: 500 }, { weight: '700', tracking: 0.18 }, { type: 'fade', duration: 0.8 }),
      T('2026 — 2027', 'Inter', 20, '#b3122e', { x: 1510, y: 72, w: 300 }, { weight: '600', align: 'right', tracking: 0.12 }, { type: 'fade', duration: 0.8, delay: 0.2 }),
      T('Motion Culture', 'Instrument Serif', 300, '#b3122e', { x: 80, y: 330, w: 1760 }, { align: 'center', tracking: -0.03 }, { type: 'rise', duration: 0.9 }),
      createLayer('image', { name: 'Rosette', params: { src: rosetteSvg(), fit: 'contain' }, box: { x: 700, y: 280, w: 520, h: 520 }, anim: { type: 'fade', duration: 0.9, delay: 0.4 }, interact: { parallax: 0.35, hover: 'tilt' } }),
      T('DESIGN SLIDES WITH CONTEXT,\nCOMPOSITION AND STYLE —\nLIKE A CREATIVE DIRECTOR WOULD.', 'Inter', 22, '#b3122e', { x: 110, y: 900, w: 600 }, { weight: '700', lineHeight: 1.25, tracking: 0.02 }, { type: 'fade', duration: 0.8, delay: 0.6 }),
      createLayer('ripple', {}),
      createLayer('grain', { params: { amount: 0.06 } }),
    ], '#f6e7ef', { type: 'fade', duration: 1 }),
  },
  {
    id: 'statement', name: 'Dark statement',
    make: () => createSlide('Statement', [
      createLayer('aurora', {}),
      T('Every slide is a stage.\nEvery build is a beat.', 'Fraunces', 120, '#fff4ec', { x: 200, y: 330, w: 1520 }, { lineHeight: 1.05, weight: '400', italic: false }, { type: 'rise', duration: 0.9 }),
      T('— The first rule of presenting with motion', 'Inter', 28, '#c9c1ff', { x: 204, y: 660, w: 900 }, { weight: '500' }, { type: 'fade', trigger: 'afterPrev', delay: 0.1, duration: 0.8 }),
      createLayer('vignette', { params: { amount: 0.6 } }),
      createLayer('grain', { params: { amount: 0.08 } }),
    ], '#0b0a1a', { type: 'fade', duration: 0.7 }),
  },
  {
    id: 'three', name: 'Three-point build',
    make: () => {
      const card = (i: number, title: string, body: string) => {
        const x = 150 + i * 555;
        return [
          createLayer('shape', { name: `Card ${i + 1}`, params: { shape: 'rect', radius: 28, fill: '#ffffff', gradient: true, fill2: '#fff4ee', angle: 120, strokeWidth: 1.5, stroke: '#e8dcd2' }, box: { x, y: 400, w: 510, h: 480 }, anim: { type: 'rise', trigger: 'onClick', duration: 0.9, easing: 'expoOut' } }),
          T(`0${i + 1}`, 'Inter', 26, '#ff5a36', { x: x + 50, y: 450, w: 300 }, { weight: '700', tracking: 0.1 }, { type: 'fade', delay: 0.15, duration: 0.6 }),
          T(title, 'Instrument Serif', 88, '#141414', { x: x + 46, y: 500, w: 420 }, {}, { type: 'rise', delay: 0.12, duration: 0.9 }),
          T(body, 'Inter', 28, '#5b5550', { x: x + 50, y: 640, w: 410 }, { lineHeight: 1.4, weight: '400' }, { type: 'fade', delay: 0.3, duration: 0.8 }),
        ];
      };
      return createSlide('Three moves', [
        createLayer('solid', { params: { color: '#f4ede4' } }),
        createLayer('grid', { params: { color: '#141414', spacing: 80, fade: 0.8 }, opacity: 0.08 }),
        T('Three moves that land', 'DM Serif Display', 100, '#141414', { x: 150, y: 150, w: 1400 }, {}, { type: 'rise', duration: 1 }),
        T('Click to reveal each one', 'Inter', 26, '#8a8178', { x: 154, y: 290, w: 800 }, { weight: '500' }, { type: 'fade', trigger: 'afterPrev', duration: 0.6 }),
        ...card(0, 'Hook', 'Open with a question the room wants answered.'),
        ...card(1, 'Build', 'Reveal one idea per click. Let each one breathe.'),
        ...card(2, 'Land', 'Close on one line people will repeat later.'),
      ], '#f4ede4', { type: 'fade', duration: 0.7 });
    },
  },
  {
    id: 'number', name: 'Big number',
    make: () => createSlide('Big number', [
      createLayer('linear', { params: { colorA: '#0e0b1f', colorB: '#3a0f3f', angle: 125 } }),
      createLayer('grid', { params: { style: 'dots', color: '#ffffff', spacing: 48, thickness: 1.4, fade: 0.9 }, opacity: 0.18 }),
      T('74%', 'Unbounded', 380, '#ffe8d6', { x: 160, y: 250, w: 1600 }, { weight: '800', align: 'center', tracking: -0.04 }, { type: 'rise', duration: 0.9 }),
      T('of audiences remember the slide that moved.', 'Inter', 44, '#e8c9ff', { x: 360, y: 740, w: 1200 }, { align: 'center', weight: '400' }, { type: 'fade', trigger: 'afterPrev', duration: 0.8 }),
      createLayer('glow', { params: { threshold: 0.62, intensity: 1.4 } }),
      createLayer('lens', { params: { strength: 0.35, radius: 0.16 } }),
      createLayer('grain', { params: { amount: 0.07 } }),
    ], '#0e0b1f', { type: 'fade', duration: 0.7 }),
  },
  {
    id: 'image', name: 'Image feature',
    make: () => createSlide('Image feature', [
      createLayer('solid', { params: { color: '#15100f' } }),
      createLayer('image', { name: 'Rosette', params: { src: rosetteSvg(), fit: 'contain' }, box: { x: 110, y: 110, w: 860, h: 860 }, anim: { type: 'fade', duration: 0.9 }, interact: { parallax: 0.5 } }),
      createLayer('gradientMap', { params: { shadow: '#15100f', mid: '#d7263d', highlight: '#ffe8d6', contrast: 1.2 } }),
      createLayer('halftone', { params: { size: 9, mode: 'colour', paper: '#15100f' }, opacity: 0.45 }),
      T('Treat pixels\nlike type.', 'Playfair Display', 124, '#ffe8d6', { x: 1060, y: 330, w: 760 }, { italic: true, lineHeight: 1.0 }, { type: 'rise', duration: 0.9, delay: 0.3 }),
      T('Gradient map, halftone and parallax — all live, all editable, all above or below whatever you choose.', 'Inter', 28, '#bfa9a0', { x: 1064, y: 640, w: 640 }, { lineHeight: 1.45 }, { type: 'fade', trigger: 'afterPrev', duration: 0.8 }),
      createLayer('grain', { params: { amount: 0.07 } }),
    ], '#15100f', { type: 'fade', duration: 0.7 }),
  },
  {
    id: 'blueprint', name: 'Blueprint',
    make: () => createSlide('Blueprint', [
      createLayer('solid', { params: { color: '#0d2b5c' } }),
      createLayer('grid', { params: { color: '#8fb8ff', spacing: 40, thickness: 1, fade: 0.3, drift: 0.2 }, opacity: 0.35 }),
      createLayer('grid', { params: { color: '#bcd4ff', spacing: 200, thickness: 1.5, fade: 0.3, drift: 0.2 }, opacity: 0.45 }),
      T('SYSTEM / ARCHITECTURE', 'JetBrains Mono', 24, '#bcd4ff', { x: 140, y: 120, w: 800 }, { weight: '500', tracking: 0.12 }, { type: 'fade', duration: 0.8 }),
      T('How the pieces\nfit together', 'Space Grotesk', 132, '#ffffff', { x: 136, y: 220, w: 1200 }, { weight: '600', lineHeight: 1.0, tracking: -0.03 }, { type: 'rise', duration: 0.9, delay: 0.2 }),
      createLayer('shape', { name: 'Node A', params: { shape: 'ellipse', fill: '#ffffff', strokeWidth: 0 }, box: { x: 1280, y: 620, w: 120, h: 120 }, anim: { type: 'fade', trigger: 'onClick', duration: 0.6 }, interact: { hover: 'grow' } }),
      createLayer('shape', { name: 'Link', params: { shape: 'arrow', fill: '#8fb8ff' }, box: { x: 1420, y: 655, w: 180, h: 50 }, anim: { type: 'wipeRight', trigger: 'afterPrev', duration: 0.6, easing: 'cubicOut' } }),
      createLayer('shape', { name: 'Node B', params: { shape: 'rect', radius: 20, fill: '#ff5a36' }, box: { x: 1620, y: 610, w: 140, h: 140 }, anim: { type: 'fade', trigger: 'afterPrev', duration: 0.6 }, interact: { hover: 'grow' } }),
      createLayer('spotlight', { params: { color: '#8fb8ff', radius: 0.4, intensity: 0.35 } }),
    ], '#0d2b5c', { type: 'fade', duration: 0.7 }),
  },
  {
    id: 'closing', name: 'Closing',
    make: () => createSlide('Thank you', [
      createLayer('mesh', { params: { color1: '#0f4c5c', color2: '#5fa8d3', color3: '#cae9ff', color4: '#1b263b', speed: 0.9 } }),
      T('Thank you.', 'Instrument Serif', 280, '#ffffff', { x: 160, y: 360, w: 1600 }, { italic: true, align: 'center' }, { type: 'rise', duration: 0.9 }),
      T('Back to the start  ↺', 'Inter', 30, '#ffffff', { x: 760, y: 760, w: 400 }, { align: 'center', weight: '600', tracking: 0.04 }, { type: 'fade', trigger: 'afterPrev', duration: 0.8 }, { hover: 'lift', click: 'goto', gotoSlide: 1 }),
      createLayer('wave', { params: { strength: 0.008, scale: 2.5, speed: 0.6 } }),
      createLayer('chroma', { params: { amount: 0.35 } }),
      createLayer('grain', { params: { amount: 0.06 } }),
    ], '#0f4c5c', { type: 'fade', duration: 0.7 }),
  },
];

export function blankSlide(): Slide {
  return createSlide('Untitled', [createLayer('solid', { name: 'Ground', params: { color: '#f6efe9' } })], '#f6efe9');
}

export function demoDeck(): Deck {
  const ids = ['editorial', 'statement', 'three', 'number', 'image', 'blueprint', 'closing'];
  return {
    id: uid(),
    title: 'Motion Culture — demo',
    width: DECK_W,
    height: DECK_H,
    version: 1,
    slides: ids.map((id) => TEMPLATES.find((t) => t.id === id)!.make()),
  };
}

export function blankDeck(): Deck {
  return { id: uid(), title: 'Untitled', width: DECK_W, height: DECK_H, version: 1, slides: [blankSlide()] };
}
