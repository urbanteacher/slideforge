import { createLayer } from '../model/defaults';
import { slideOf, useStore } from '../model/store';
import type { Box, Deck, Layer, Slide } from '../model/types';

// SlideForge's picture settings, the lab's way. A caption is not a field of the picture: it is any
// text sitting on the picture, which is what it looks like on the slide and how it is edited there.
// These helpers read that off the canvas and act on the boxes; nothing new is stored beyond the
// choice itself, so every caption stays an ordinary text box you type into.

const centreIn = (a: Box, b: Box) => {
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
  return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h;
};

/** Text sitting on the picture — its caption — in reading order. Header and footer text is not. */
export function captionsOf(slide: Slide, img: Layer): Layer[] {
  if (!img.box) return [];
  return slide.layers
    .filter((l) => l.kind === 'text' && l.box && !l.params.hfSlot && centreIn(l.box, img.box!))
    .sort((a, b) => a.box!.y - b.box!.y);
}
const bandOf = (slide: Slide, img: Layer) => slide.layers.find((l) => l.params.captionOf === img.id);

const RATIOS: Record<string, number> = { '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1, '4:5': 4 / 5 };

/** Reshape a picture's box for its frame: fill the slide, or take a fixed ratio about its centre. */
export function applyFrame(l: Layer, frame: string, deck: Pick<Deck, 'width' | 'height'>) {
  const b = l.box;
  if (!b) return;
  if (frame === 'bleed') { Object.assign(b, { x: 0, y: 0, w: deck.width, h: deck.height, rot: 0 }); l.params.fit = 'cover'; return; }
  const r = RATIOS[frame];
  if (!r) return;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  let w = b.w, h = w / r;
  const maxH = deck.height * 0.86;
  if (h > maxH) { h = maxH; w = h * r; }
  Object.assign(b, { x: cx - w / 2, y: Math.max(0, Math.min(deck.height - h, cy - h / 2)), w, h });
  l.params.fit = 'cover';
}

function edit(imgId: string, fn: (s: Slide, img: Layer) => void) {
  const st = useStore.getState();
  const slideId = slideOf(st).id;
  st.mutate((d) => {
    const s = d.slides.find((x) => x.id === slideId)!;
    const img = s.layers.find((l) => l.id === imgId);
    if (img?.box) fn(s, img);
  });
}

/** The band behind a caption, fitted around the caption's lines and out to the picture's edge. */
function fitBand(s: Slide, img: Layer, band: Layer) {
  const caps = captionsOf(s, img);
  if (!caps.length) return;
  const ib = img.box!, atTop = img.params.capPos === 'top';
  // A shade needs room to fade in before the words: about 150px of runway, as SlideForge's has.
  const runway = band.params.gradient ? 150 : 36;
  const top = Math.min(...caps.map((c) => c.box!.y)) - (atTop ? 36 : runway), bottom = Math.max(...caps.map((c) => c.box!.y + c.box!.h)) + (atTop ? runway : 36);
  const y0 = atTop ? ib.y : Math.max(ib.y, top), y1 = atTop ? Math.min(ib.y + ib.h, bottom) : ib.y + ib.h;
  band.box = { x: ib.x, y: y0, w: ib.w, h: Math.max(8, y1 - y0), rot: 0 };
}

export type CaptionStyle = 'gradient' | 'bar' | 'plain' | 'hidden';

export function setCaptionStyle(imgId: string, style: CaptionStyle) {
  edit(imgId, (s, img) => {
    img.params.capStyle = style;
    const caps = captionsOf(s, img);
    caps.forEach((c) => { c.visible = style !== 'hidden'; });
    let band = bandOf(s, img);
    if (style === 'plain' || style === 'hidden') {
      if (band) s.layers = s.layers.filter((l) => l.id !== band!.id);
      return;
    }
    if (!band) {
      band = createLayer('shape', { name: 'Caption band', params: { shape: 'rect', radius: 0, strokeWidth: 0, captionOf: img.id } });
      // Just above the picture, beneath its caption, so the words sit on the band.
      s.layers.splice(s.layers.findIndex((l) => l.id === img.id) + 1, 0, band);
    }
    band.params.fill = style === 'bar' ? String(img.params.barColour ?? '#14181f') : '#000000';
    band.opacity = 1;
    // SlideForge's scrim: clear at the picture's side, 82% black at its edge, so it reads over any image.
    const shade = style === 'gradient';
    Object.assign(band.params, { gradient: shade, fill2: '#000000', fillOpacity: shade ? 0 : 1, fill2Opacity: shade ? 0.82 : 1, angle: img.params.capPos === 'top' ? 270 : 90 });
    band.anim = { ...band.anim, clearAfter: caps[0]?.anim.clearAfter };
    caps.forEach((c) => { c.params.color = '#ffffff'; });
    fitBand(s, img, band);
  });
}

export function setCaptionPos(imgId: string, pos: 'top' | 'bottom') {
  edit(imgId, (s, img) => {
    img.params.capPos = pos;
    const caps = captionsOf(s, img);
    if (!caps.length) return;
    const ib = img.box!, margin = 44;
    const top = Math.min(...caps.map((c) => c.box!.y)), bottom = Math.max(...caps.map((c) => c.box!.y + c.box!.h));
    const dy = pos === 'top' ? ib.y + margin - top : ib.y + ib.h - margin - bottom;
    caps.forEach((c) => { c.box!.y += dy; });
    const band = bandOf(s, img);
    if (band?.params.gradient) band.params.angle = pos === 'top' ? 270 : 90;
    if (band) fitBand(s, img, band);
  });
}

/** "Caption clears itself": the caption, and its band, fade away this long after arriving. */
export function setCaptionClear(imgId: string, secs: number) {
  edit(imgId, (s, img) => {
    img.params.capClear = secs;
    for (const l of [...captionsOf(s, img), bandOf(s, img)]) if (l) l.anim = { ...l.anim, clearAfter: secs || undefined };
  });
}

/** Put a caption on the picture — an ordinary text box on its lower edge — and open it for typing. */
export function addCaption(imgId: string) {
  const st = useStore.getState();
  const img = slideOf(st).layers.find((l) => l.id === imgId);
  if (!img?.box) return;
  const b = img.box;
  const cap = createLayer('text', {
    name: 'Caption',
    params: { text: 'What the picture shows', font: 'Inter', size: Math.round(Math.max(24, Math.min(40, b.w / 28))), weight: '600', color: '#ffffff', lineHeight: 1.25, tracking: 0 },
    box: { x: b.x + 44, y: b.y + b.h - 110, w: b.w - 88 },
  });
  st.mutate((d) => {
    const s = d.slides.find((x) => x.id === slideOf(st).id)!;
    s.layers.splice(s.layers.findIndex((l) => l.id === imgId) + 1, 0, cap);
  });
  setCaptionStyle(imgId, (img.params.capStyle as CaptionStyle) && img.params.capStyle !== 'plain' ? (img.params.capStyle as CaptionStyle) : 'gradient');
  useStore.getState().set({ selectedId: cap.id, editingTextId: cap.id });
}

/** "Build on Next": the lab's own click trigger — hold the picture back, or bring it with the slide. */
export function setArrival(imgId: string, on: 'slide' | 'click') {
  edit(imgId, (_s, img) => {
    img.anim.trigger = on === 'click' ? 'onClick' : 'withSlide';
    if (on === 'click' && img.anim.type === 'none') { img.anim.type = 'fade'; img.anim.duration = Math.max(0.6, img.anim.duration); }
  });
}
