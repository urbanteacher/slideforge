import { cloneLayer, createLayer, createSlide } from './defaults';
import type { Layer, Slide } from './types';

// The AI Awareness flagship is the reference for this reusable slide frame. Keeping the
// original layers preserves its exact logo, strand, lockup and footer positions.
export const FLAGSHIP_FRAME = [
  'Strand icon', 'Strand', 'Lockup', 'Lockup rule', 'Lockup line',
  'Footer rule', 'Footer', 'Progress track', 'Progress', 'Page',
] as const;
const frameNames = new Set<string>(FLAGSHIP_FRAME);
const bodyNames = ['Eyebrow', 'Question', 'Tagline', 'Poster'] as const;

export function hasFlagshipTextImage(slide: Slide): boolean {
  return bodyNames.every((name) => slide.layers.some((l) => l.name === name));
}

/** Editable cover composition, placed exactly as in the flagship but ready for new copy. */
export function flagshipTextImage(reference: Slide): Layer[] {
  return reference.layers.filter((l) => bodyNames.includes(l.name as typeof bodyNames[number])).map((layer) => {
    const copy = cloneLayer(layer);
    copy.params.blockRole = 'text-image';
    if (copy.name === 'Eyebrow') { copy.params.text = 'YOUR TOPIC'; copy.params.blockField = 'eyebrow'; }
    if (copy.name === 'Question') { copy.params.text = 'A clear headline goes here.'; copy.params.blockField = 'title'; }
    if (copy.name === 'Tagline') { copy.params.text = 'One sentence that supports the idea.'; copy.params.blockField = 'body'; }
    if (copy.name === 'Poster') { copy.name = 'Image — replace me'; copy.params.blockField = 'image'; }
    return copy;
  });
}

export function textImageForSlide(source: Slide, target: Slide): Layer[] {
  const layers = flagshipTextImage(source);
  if (source.background.toLowerCase() === target.background.toLowerCase()) return layers;
  const hex = target.background.replace('#', '');
  const n = Number.parseInt(hex, 16);
  const dark = Number.isFinite(n) &&
    (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110;
  const ink = dark ? '#F6F4ED' : '#231F20';
  const accent = String(target.layers.find((l) => l.name === 'Progress')?.params.fill ?? '#00BEDD');
  for (const layer of layers) {
    if (layer.kind !== 'text') continue;
    layer.params.color = layer.params.blockField === 'eyebrow' && dark ? accent : ink;
  }
  if (dark) {
    const image = layers.find((l) => l.params.blockField === 'image');
    if (image?.box) layers.splice(layers.indexOf(image), 0, createLayer('shape', {
      name: 'Image panel',
      params: { blockRole: 'text-image', blockField: 'image-panel', shape: 'rect', fill: accent, strokeWidth: 0 },
      box: image.box,
    }));
  }
  return layers;
}

export function hasFlagshipFrame(slide: Slide): boolean {
  return slide.layers.some((l) => l.name === 'Strand icon') &&
    slide.layers.some((l) => l.name === 'Lockup') &&
    slide.layers.some((l) => l.name === 'Footer rule');
}

export function isFlagshipFrameLayer(layer: Layer): boolean { return frameNames.has(layer.name); }

export function setFramePage(layers: Layer[], position: number, total: number, width: number): void {
  const progress = layers.find((l) => l.name === 'Progress');
  if (progress?.box) progress.box.w = Math.round(width * position / total);
  const page = layers.find((l) => l.name === 'Page');
  if (page) page.params.text = '{page} / {pages}';
  else if (position > 1) {
    const footer = layers.find((l) => l.name === 'Footer');
    layers.push(createLayer('text', {
      name: 'Page',
      params: { font: footer?.params.font ?? 'Uncut Sans', size: 27, weight: '400',
        color: footer?.params.color ?? '#231F20', align: 'right', text: '{page} / {pages}', fit: 'shrink' },
      box: { x: width * 0.88, y: width * 0.523, w: width * 0.08, h: width * 0.025 },
    }));
  }
}

export function syncFrameCounters(slides: Slide[], width: number): void {
  slides.forEach((slide, index) => {
    if (hasFlagshipFrame(slide)) setFramePage(slide.layers, index + 1, slides.length, width);
  });
}

export function newSlideWithFrame(reference: Slide, position: number, total: number, width: number, bodyReference?: Slide): Slide {
  if (!hasFlagshipFrame(reference)) return createSlide('Untitled', [], reference.background);
  const layers = reference.layers.filter(isFlagshipFrameLayer).map(cloneLayer);
  setFramePage(layers, position, total, width);
  if (bodyReference && hasFlagshipTextImage(bodyReference)) layers.push(...textImageForSlide(bodyReference, reference));
  return createSlide('Untitled', layers, reference.background, structuredClone(reference.transition));
}
