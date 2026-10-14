import type { BlendMode, Params, ParamValue } from '../core';
import type { Measure, RasterFn } from './raster';
import { registerRaster } from './raster';

export type Category = 'source' | 'generate' | 'distort' | 'colour' | 'light' | 'stylise';

interface BaseParam { key: string; label: string; info?: string; group?: string; when?: (p: Params) => boolean; /** vec2 measured across the layer's own box, not the slide */ inBox?: boolean }
export type ParamDef =
  | (BaseParam & { type: 'number'; min: number; max: number; step: number; default: number; unit?: string; decimals?: number })
  | (BaseParam & { type: 'color'; default: string; weightKey?: string })
  | (BaseParam & { type: 'select'; options: { value: string; label: string }[]; default: string })
  | (BaseParam & { type: 'bool'; default: boolean })
  | (BaseParam & { type: 'vec2'; default: [number, number] })
  | (BaseParam & { type: 'text'; default: string })
  | (BaseParam & { type: 'font'; default: string })
  | (BaseParam & { type: 'image'; default: string })
  | (BaseParam & { type: 'video'; default: string });

export interface KindDef {
  id: string;
  name: string;
  category: Category;
  featured?: boolean;
  description: string;
  content?: 'text' | 'image' | 'shape' | 'video' | 'chart' | 'quiz' | 'activity' | 'note' | 'quote' | 'table' | 'timer' | 'wipe' | 'model' | 'experiment' | 'scene';
  params: ParamDef[];
  glsl?: string;
  needsMips?: boolean;
  mouseParam?: string; // vec2 param that can follow the pointer
  defaultBlend?: BlendMode;
  defaultFollowMouse?: boolean;
}

export const FONTS = [
  'Inter', 'Instrument Serif', 'Playfair Display', 'DM Serif Display', 'Fraunces',
  'Space Grotesk', 'Syne', 'Unbounded', 'Bebas Neue', 'JetBrains Mono', 'Georgia', 'Uncut Sans',
  // Installed on every Mac and iPhone: SlideForge's Cinematic theme sets its type in it.
  'Avenir Next',
  // UK Black Tech's hero face (served from public/fonts, SIL OFL).
  'Alpha Lyrae',
  // Installed on every Mac: Northeastern University London's display serif.
  'Iowan Old Style',
  // AI Awareness Day's face.
  'Poppins',
  // Nodes' face (Google Fonts), wide for the wordmark.
  'Archivo',
  // Installed on every Windows and Mac machine: Youth Charter's headline face (css/youth-charter.css).
  'Impact',
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

export const opt = (...v: string[]) => v.map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }));

/** Grow the box to the content, or keep the box and bring the type down until it fits — the way a
 *  SlideForge layout region holds its copy on the slide. */
export const FIT: ParamDef = {
  key: 'fit', label: 'Fit', type: 'select', group: 'Fit', default: 'grow',
  options: [{ value: 'grow', label: 'Grow the box' }, { value: 'shrink', label: 'Shrink to fit the box' }, { value: 'fill', label: 'Fill the box' }],
  info: 'Grow: the box follows the words. Shrink: the box stays put and the words get smaller when there are more of them. Fill: the words are sized to fill the box — bigger when there are few, smaller when there are many, never under 18pt.',
};
export const style = (size: number, font = 'Inter', min = 12, max = 200): ParamDef[] => [
  { key: 'font', label: 'Font', type: 'font', default: font, group: 'Style' },
  { key: 'size', label: 'Text size', type: 'number', min, max, step: 1, default: size, group: 'Style', unit: 'px', decimals: 0 },
  { key: 'textColor', label: 'Text', type: 'color', default: '#141414', group: 'Style' },
  { key: 'accent', label: 'Accent', type: 'color', default: '#d94f2b', group: 'Style' },
];

export const REGISTRY: Record<string, KindDef> = {};
/** A layer kind as kinds/index.ts lists it: its definition, and for the content kinds how it is drawn. */
export interface LayerKind { def: KindDef; raster?: RasterFn; measure?: Measure }

// Every kind's definition, in the list's order: filled by kinds/index.ts (registerKinds), never written here.
const KINDS: KindDef[] = [];

/** The kinds, from kinds/index.ts: the engine reaches them only through what is registered here. */
export function registerKinds(list: LayerKind[]) {
  for (const k of list) {
    KINDS.push(k.def);
    REGISTRY[k.def.id] = k.def;
    if (k.raster) registerRaster(k.def.id, { raster: k.raster, measure: k.measure });
  }
}

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
