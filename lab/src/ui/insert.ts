import { kind } from '../engine/registry';
import { createLayer } from '../model/defaults';
import { hasFlagshipTextImage, textImageForSlide } from '../model/frame';
import { headingClock } from '../model/designs/kit';
import { LAYOUT_STYLES, cell, gridFor, slideStyle, themeOf } from '../model/layouts';
import type { Slide } from '../model/types';
import { useStore } from '../model/store';
import { fileToDataUrl, readDataUrl } from './Inspector';

// Media arrives from the Add menu, a drop on the canvas or a paste. All three land here, sized to
// the file's own proportions and centred on (x, y), or on the slide when no point is given.

const VIDEO_LIMIT = 60e6;

function centreBox(iw: number, ih: number, x?: number, y?: number) {
  const { deck } = useStore.getState();
  const k = Math.min(1000 / iw, 700 / ih, 1.5);
  const w = Math.round(iw * k), h = Math.round(ih * k);
  const cx = x ?? deck.width / 2, cy = y ?? deck.height / 2;
  return { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h };
}

const layerName = (f: File, fallback: string) => f.name.replace(/\.[^.]+$/, '').slice(0, 28) || fallback;

export async function addImageFile(f: File, x?: number, y?: number) {
  const src = await fileToDataUrl(f);
  // Dropped on an empty picture box — a placeholder, a header or footer logo slot — it fills that box.
  if (x !== undefined && y !== undefined) {
    const st = useStore.getState();
    const slide = st.deck.slides.find((s) => s.id === st.slideId);
    const empty = slide && [...slide.layers].reverse().find((l) => l.kind === 'image' && l.visible && !l.params.src && l.box
      && x >= l.box.x && x <= l.box.x + l.box.w && y >= l.box.y && y <= l.box.y + l.box.h);
    if (empty) { st.updateLayer(empty.id, (l) => { l.params.src = src; }); st.selectLayer(empty.id); return; }
  }
  const img = new Image();
  img.src = src;
  await img.decode().catch(() => undefined);
  const box = centreBox(img.naturalWidth || 800, img.naturalHeight || 600, x, y);
  useStore.getState().insertLayer(createLayer('image', { name: layerName(f, 'Image'), params: { src, fit: 'contain' }, box, anim: { type: 'fade' } }));
}

/** The video is stored inside the deck, so it travels with the saved file and the HTML export. */
export async function addVideoFile(f: File, x?: number, y?: number) {
  const { showToast, insertLayer } = useStore.getState();
  if (f.size > VIDEO_LIMIT) {
    showToast(`That video is ${Math.round(f.size / 1e6)} MB. Keep clips under ${VIDEO_LIMIT / 1e6} MB, or paste a link to it instead.`);
    return;
  }
  const src = await readDataUrl(f);
  const dims = await new Promise<[number, number]>((res) => {
    const v = document.createElement('video');
    v.onloadedmetadata = () => res([v.videoWidth || 1280, v.videoHeight || 720]);
    v.onerror = () => res([1280, 720]);
    v.src = src;
  });
  const box = centreBox(dims[0], dims[1], x, y);
  insertLayer(createLayer('video', { name: layerName(f, 'Video'), params: { src }, box, anim: { type: 'fade' } }));
}

export function addMediaFile(f: File, x?: number, y?: number) {
  if (f.type.startsWith('image/')) return addImageFile(f, x, y);
  if (f.type.startsWith('video/')) return addVideoFile(f, x, y);
}

/** The flagship's editable left-text/right-image composition, on the current slide. */
export function addTextImage() {
  const st = useStore.getState();
  const slide = st.deck.slides.find((s) => s.id === st.slideId) ?? st.deck.slides[0];
  const present = slide.layers.find((l) => l.params.blockRole === 'text-image');
  if (present || hasFlagshipTextImage(slide)) {
    st.selectLayer(present?.id ?? slide.layers.find((l) => l.name === 'Question')?.id ?? null);
    st.showToast('This slide already has a text and image layout. Edit its text or replace the image.');
    return;
  }
  const source = st.deck.slides.find(hasFlagshipTextImage);
  const ink = luminance(slide.background) < 0.45 ? '#f6f4ed' : '#231f20';
  const layers = source ? textImageForSlide(source, slide) : [
    createLayer('text', { name: 'Eyebrow', params: { blockRole: 'text-image', blockField: 'eyebrow', text: 'YOUR TOPIC', size: 28, weight: '700', color: '#ffffff', uppercase: true }, box: { x: 78, y: 348, w: 1007, h: 36 } }),
    createLayer('text', { name: 'Title', params: { blockRole: 'text-image', blockField: 'title', text: 'A clear headline goes here.', size: 128, weight: '700', color: ink, fit: 'shrink' }, box: { x: 78, y: 402, w: 1007, h: 275 } }),
    createLayer('text', { name: 'Body', params: { blockRole: 'text-image', blockField: 'body', text: 'One sentence that supports the idea.', size: 42, color: ink, fit: 'shrink' }, box: { x: 78, y: 726, w: 1007, h: 60 } }),
    createLayer('image', { name: 'Image — replace me', params: { blockRole: 'text-image', blockField: 'image', src: '', fit: 'contain' }, box: { x: 1100, y: 186, w: 743, h: 756 } }),
  ];
  st.mutate((d) => {
    const s = d.slides.find((x) => x.id === st.slideId)!;
    let at = s.layers.length;
    while (at > 0 && !kind(s.layers[at - 1].kind).content && kind(s.layers[at - 1].kind).category !== 'generate') at--;
    s.layers.splice(at, 0, ...layers);
  });
  st.set({ selectedId: layers.find((l) => l.params.blockField === 'title')?.id ?? null, leftTab: 'layers' });
  st.showToast('Double-click the text to edit it. Select the image to replace it.');
}

// ─── SlideForge's "+ Item" menu ─────────────────────────────────────────────
// Heading and Bullet points are text with SlideForge's settings; the rest are their own layers.
// Each picks up the slide it lands on, so a note added to a dark slide is not dark on dark.

function luminance(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  if (Number.isNaN(n)) return 1;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
function toward(hex: string, target: number, t: number) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16) || 0;
  return '#' + [16, 8, 0].map((s) => Math.round(((n >> s) & 255) + (target - ((n >> s) & 255)) * t).toString(16).padStart(2, '0')).join('');
}

/* Where a new item goes: the first free band of rows on SlideForge's grid, below whatever is
   already on the slide, so a second item never lands on top of the first. A picture that fills the
   slide is a background here, not something to avoid. When nothing fits, the item keeps its default
   place and the caller says so, rather than quietly squeezing it somewhere wrong. */
function freeRow(slide: Slide, h: number, skip: string): number | null {
  const g = gridFor(useStore.getState().deck);
  const taken = slide.layers
    .filter((l) => l.id !== skip && l.visible && l.box && kind(l.kind).content && !(l.box.w >= g.width * 0.94 && l.box.h >= g.height * 0.93))
    .map((l) => [l.box!.y, l.box!.y + l.box!.h] as const)
    .sort((a, b) => a[0] - b[0]);
  const snap = (y: number) => g.top + Math.ceil((y - g.top) / g.stepY - 0.001) * g.stepY;
  let y = g.top;
  for (const [a, b] of taken) {
    if (b <= y) continue;
    if (a >= y + h) break;
    y = snap(b + g.stepY * 0.5);
  }
  return y + h <= g.foot ? y : null;
}
const WIDE = new Set(['chart', 'note', 'heading']);

export const ITEMS = ['heading', 'text', 'note', 'bullets', 'image', 'video', 'quote', 'chart', 'timer'] as const;
export type ItemId = (typeof ITEMS)[number];

export function addItem(id: Exclude<ItemId, 'image'>) {
  const st = useStore.getState();
  const slide = st.deck.slides.find((s) => s.id === st.slideId) ?? st.deck.slides[0];
  const dark = luminance(slide.background || '#ffffff') < 0.45;
  const ink = dark ? '#f5f4f2' : '#161616';
  const panel = dark ? toward(slide.background, 255, 0.1) : '#f3efe8';
  const colours = { textColor: ink };
  const make = (kindId: string, name: string, params: Record<string, unknown>, box?: Record<string, number>) => {
    const cols = WIDE.has(id) ? 12 : id === 'quote' ? 10 : 11;
    const at = cell(id === 'quote' ? 2 : 1, 1, cols, 1, gridFor(st.deck));
    const layer = createLayer(kindId, { name, params: params as never, box: { ...box, x: at.x, w: at.w }, anim: { type: 'fade', duration: 0.7 } });
    const y = freeRow(slide, layer.box!.h, layer.id);
    if (y !== null) layer.box!.y = y;
    else st.showToast('There is no room left on this slide, so it has gone on top. Move it, make it smaller, or start a new slide.');
    st.insertLayer(layer);
    if (id === 'bullets') st.showToast('Double-click to edit. Press Enter for each new bullet; use the list buttons to switch style.');
  };
  switch (id) {
    case 'heading': return make('text', 'Heading', { text: 'Heading', font: 'Fraunces', weight: '600', size: 88, color: ink, lineHeight: 1.05, tracking: -0.01 }, { x: 160, y: 140, w: 1600 });
    case 'text': return make('text', 'Text', { text: 'A sentence or two of text.', font: 'Inter', weight: '400', size: 40, color: ink, lineHeight: 1.35, tracking: 0 }, { x: 160, y: 420, w: 1200 });
    case 'bullets': return make('text', 'Bullet points', { text: 'First point\nSecond point\nThird point', font: 'Inter', weight: '400', size: 42, color: ink, list: 'bullets', lineHeight: 1.55, tracking: 0 }, { x: 160, y: 360, w: 1400 });
    case 'note': return make('note', 'Note', { ...colours, fill: panel });
    // An empty video at 16:9 in the middle of the slide, with its Video tab open for the address.
    case 'video': {
      const g = gridFor(st.deck), w = (g.right - g.left) * 0.7, h = (w * 9) / 16;
      const layer = createLayer('video', { name: 'Video', params: { src: '', fit: 'cover', frame: '16:9', muted: true } as never, box: { x: (st.deck.width - w) / 2, y: (st.deck.height - h) / 2, w, h, rot: 0 }, anim: { type: 'fade', duration: 0.6 } });
      st.insertLayer(layer);
      st.set({ inspectorTab: 'video' });
      st.showToast('In the Video tab, choose a file or paste a YouTube, Vimeo or .mp4 address, then full screen or framed.');
      return;
    }
    // A ring in the corner the room can read from the back, in the slide's own colours.
    // SlideForge's game clock, in the top right corner where its quiz and activity slides keep it.
    case 'timer': {
      // A designed slide (a game, an activity) keeps its clock in the heading row, flush right, where
      // its own clocks go: digits the height of the row, clear of the question under it.
      const eyebrowRow = slide.layers.find((l) => l.kind === 'text' && l.name === 'Eyebrow' && l.box && !l.params.hfSlot);
      if (eyebrowRow?.box) {
        if (slide.layers.some((l) => l.kind === 'timer')) { st.showToast('This slide already has its clock, in the heading row. Set its minutes in the panel.'); return; }
        // In the heading's own type and colour, at the end of its line.
        const theme = slideStyle(themeOf(st.deck) ?? LAYOUT_STYLES[0], slide);
        const layer = headingClock(theme, 5, eyebrowRow.box, String(eyebrowRow.params.color ?? theme.accent), st.deck.width);
        st.insertLayer(layer);
        st.showToast('The clock sits at the end of the heading row and starts when this slide comes up while presenting. Set its minutes in the panel.');
        return;
      }
      // Level with the slide's heading when it has one, its right edge on the heading's; else the grid's corner.
      const g = gridFor(st.deck), size = Math.round(st.deck.width * (195 / 1920));
      const head = slide.layers.find((l) => l.kind === 'text' && l.box && /heading|title/i.test(l.name) && !l.params.hfSlot);
      const row = head?.box ?? { x: g.left, y: g.top, w: g.right - g.left, h: size };
      const layer = createLayer('timer', { name: 'Timer', params: { textColor: ink, track: dark ? toward(slide.background, 255, 0.18) : '#d9d4cc', minutes: 5, style: 'game', label: '', done: '' } as never, box: { x: row.x + row.w - size, y: row.y + row.h / 2 - size / 2, w: size, h: size, rot: 0 }, anim: { type: 'fade', duration: 0.5 } });
      // The heading gives the clock its corner, so its words never run under it.
      if (head?.box && head.box.x + head.box.w > layer.box!.x - 48) st.updateLayer(head.id, (l) => { l.box!.w = layer.box!.x - 48 - l.box!.x; });
      st.insertLayer(layer);
      st.showToast('The timer starts when this slide comes up while presenting. Set its minutes in the panel.');
      return;
    }
    default: return make(id, id[0].toUpperCase() + id.slice(1), id === 'chart' ? { textColor: ink } : colours);
  }
}

// ─── Header, footer and slide number ────────────────────────────────────────
// Ordinary text boxes, snapped to the bands above and below the layout grid: the header sits over
// the grid's first row, the footer under its last. The slide number is written "{page}" (and
// "{pages}" for the total) and is filled in when the slide is drawn, so it stays right when slides
// move. Every box is edited on the slide like any other text.

export type Chrome = 'header' | 'footer' | 'number';
/** The header band sits over the grid's first row, the footer under its last, in any deck shape. */
const bands = () => {
  const g = gridFor(useStore.getState().deck);
  return { left: g.left, right: g.right, top: g.top * (52 / 132), foot: g.foot + (g.height - g.foot) * 0.21, w: g.width * 0.57 };
};

function chromeLayers(which: Chrome, slide: Slide, title: string) {
  const dark = luminance(slide.background || '#ffffff') < 0.45;
  const ink = dark ? '#f5f4f2' : '#161616';
  const small = { font: 'Inter', size: 22, weight: '600', color: ink, tracking: 0.1, uppercase: true, lineHeight: 1.2 };
  const t = (name: string, text: string, box: { x: number; y: number; w: number }, extra: Record<string, unknown> = {}) =>
    createLayer('text', { name, params: { ...small, text, ...extra } as never, box, opacity: 0.72 });
  const B = bands();
  if (which === 'header') return [t('Header', title, { x: B.left, y: B.top, w: B.w })];
  const number = t('Slide number', '{page} / {pages}', { x: B.right - 300, y: B.foot, w: 300 }, { align: 'right', uppercase: false, tracking: 0.04 });
  if (which === 'number') return [number];
  return [t('Footer', title, { x: B.left, y: B.foot, w: B.w }), number];
}

/** Add a header, footer or slide number to this slide, or to every slide that lacks one. */
export function addChrome(which: Chrome, everySlide = false) {
  const st = useStore.getState();
  const title = st.deck.title || 'Untitled';
  if (!everySlide) {
    const slide = st.deck.slides.find((s) => s.id === st.slideId) ?? st.deck.slides[0];
    for (const l of chromeLayers(which, slide, title)) { st.selectLayer(null); st.insertLayer(l); }
    return;
  }
  let added = 0;
  st.mutate((d) => {
    for (const s of d.slides) {
      const fresh = chromeLayers(which, s, title).filter((l) => !s.layers.some((x) => x.name === l.name));
      if (!fresh.length) continue;
      // Above the content, beneath any finishing effects (grain, vignette) stacked on top.
      let idx = s.layers.length;
      while (idx > 0 && !kind(s.layers[idx - 1].kind).content && kind(s.layers[idx - 1].kind).category !== 'generate') idx--;
      s.layers.splice(idx, 0, ...fresh);
      added++;
    }
  });
  st.showToast(added ? `Added to ${added} slide${added === 1 ? '' : 's'}.` : 'Every slide already has one.');
}
