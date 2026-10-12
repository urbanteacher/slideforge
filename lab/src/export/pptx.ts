import type { Deck, Layer, Slide } from '../core';
import { groupSizes, layoutText, textSize } from '../engine';
import { download, exportPng, renderStill, slug } from './exporters';

/** A text box PowerPoint can edit, in the slide's own pixels and the layer's own type. */
export interface PptxText {
  text: string; x: number; y: number; w: number; h: number; rot: number;
  font: string; size: number; bold: boolean; italic: boolean; underline: boolean; color: string; opacity: number;
  align: 'left' | 'center' | 'right'; valign: 'top' | 'middle' | 'bottom';
  lineHeight: number; tracking: number; list: 'none' | 'bullets' | 'numbers'; name: string;
}

/** One slide as the PowerPoint carries it: a picture, what goes in PowerPoint's notes, and, in the
 *  editable file, the words set as text boxes over the picture (which is then drawn without them). */
export interface PptxSlide { image: string; notes: string; hidden: boolean; name?: string; texts?: PptxText[] }

/** PowerPoint's widescreen width, in inches; the height follows the deck's own shape. */
const WIDTH_IN = 13.333;
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Whether a layer's words can become a PowerPoint text box that looks as it does here: plain text in
 * one colour, on the front of the slide. Words painted with what PowerPoint has no match for (a
 * gradient, outline-only or outlined letters, a highlighter, a panel behind them) stay in the picture,
 * as do the header and footer, so the page numbers keep their place. Shadow and glow are left off.
 */
export function editable(l: Layer): boolean {
  const p = l.params as Record<string, unknown>;
  if (l.kind !== 'text' || !l.visible || l.face === 'back' || !l.box || l.opacity <= 0) return false;
  if (typeof p.hfSlot === 'string' || !String(p.text ?? '').trim()) return false;
  if ((p.fillMode ?? 'solid') !== 'solid' || p.hollow || Number(p.outline ?? 0) > 0 || p.highlight) return false;
  if ((p.block ?? 'none') !== 'none' || !HEX.test(String(p.color ?? '#111111'))) return false;
  return true;
}

/** A layer's box as the slide shows it, turned: the upright rectangle round it. */
function bounds(l: Layer) {
  const b = l.box!, a = ((b.rot || 0) * Math.PI) / 180;
  const w = Math.abs(b.w * Math.cos(a)) + Math.abs(b.h * Math.sin(a)), h = Math.abs(b.w * Math.sin(a)) + Math.abs(b.h * Math.cos(a));
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  return { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
}

/**
 * The layers set as text on this slide. PowerPoint draws its text boxes over the picture, so words
 * that something in the picture covers (a panel, a photo, words with an effect, laid over them) would
 * come out on top of it. Those stay in the picture with what covers them, and the slide keeps its
 * order. Layers with no box (grain, a backdrop, an effect over the whole slide) are not counted.
 * Layers are drawn first to last, so the last is on top.
 */
export function editableIds(slide: Slide): Set<string> {
  const out = new Set<string>();
  const above: ReturnType<typeof bounds>[] = [];
  for (let i = slide.layers.length - 1; i >= 0; i--) {
    const l = slide.layers[i];
    if (!l.visible || l.face === 'back' || !l.box) continue;
    const b = bounds(l);
    const covered = above.some((o) => o.x0 < b.x1 && b.x0 < o.x1 && o.y0 < b.y1 && b.y0 < o.y1);
    if (editable(l) && !covered) out.add(l.id);
    else above.push(b);
  }
  return out;
}

/** The slide's editable words, measured as the renderer draws them: the size it fits them to and the
 *  height its lines take, so a box sits where the words were. */
export function slideTexts(slide: Slide): PptxText[] {
  const groups = groupSizes(slide.layers);
  const ids = editableIds(slide);
  return slide.layers.filter((l) => ids.has(l.id)).map((l) => {
    const p = l.params as Record<string, unknown>;
    const g = p.fitGroup ? groups.get(String(p.fitGroup)) : undefined;
    const size = g ?? textSize(l);
    const box = l.box!;
    const lines = layoutText({ ...l.params, size }, box.w);
    const h = Math.max(box.h, lines.height);
    const text = p.uppercase ? String(p.text).toUpperCase() : String(p.text);
    const align = (['left', 'center', 'right'].includes(String(p.align)) ? p.align : 'left') as PptxText['align'];
    const valign = (['top', 'middle', 'bottom'].includes(String(p.valign)) ? p.valign : 'top') as PptxText['valign'];
    const list = (['bullets', 'numbers'].includes(String(p.list)) ? p.list : 'none') as PptxText['list'];
    return {
      text, x: box.x, y: box.y, w: box.w, h, rot: box.rot || 0,
      font: String(p.font ?? 'Inter'), size, bold: Number(p.weight ?? 400) >= 600, italic: !!p.italic, underline: !!p.underline,
      color: String(p.color ?? '#111111'), opacity: l.opacity, align, valign,
      lineHeight: Number(p.lineHeight ?? 1.1), tracking: Number(p.tracking ?? 0), list, name: l.name,
    };
  });
}

/** Every slide of the deck as the editable file has it: the picture drawn without its editable words,
 *  and those words as text. Drawn here rather than taken from the show's stills, which have the words in. */
/** One slide as the editable file has it. Drawn against the whole deck, so its page number is its own. */
function editableSlide(deck: Deck, s: Slide, width = 1920, quality = 0.92): PptxSlide {
  return { image: renderStill(s, deck, width, 'image/jpeg', 2, quality, editableIds(s)), notes: s.notes ?? '', hidden: !!s.hidden, name: s.name, texts: slideTexts(s) };
}

export async function editableSlides(deck: Deck, onProgress?: (done: number, total: number) => void, width = 1920, quality = 0.92): Promise<PptxSlide[]> {
  const out: PptxSlide[] = [];
  for (const s of deck.slides) {
    out.push(editableSlide(deck, s, width, quality));
    onProgress?.(out.length, deck.slides.length);
    // A breath between slides, so the page stays responsive while a long deck is drawn.
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}

/** The deck as a PowerPoint file, each slide one full-size picture exactly as SlideForge draws it fully
 *  built, its speaker notes in PowerPoint's notes and hidden slides kept hidden. With `texts`, a slide's
 *  plain words are text boxes over a picture drawn without them, so they can be edited in PowerPoint;
 *  everything else stays the picture. PptxGenJS is loaded only when a file is made. */
export async function buildPptx(deck: Deck, slides: PptxSlide[]): Promise<Blob> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  const k = WIDTH_IN / deck.width; // inches per slide pixel
  const pt = (px: number) => Math.round(px * k * 72 * 10) / 10; // a slide pixel in points
  const h = Math.round(deck.height * k * 1000) / 1000;
  pptx.defineLayout({ name: 'SLIDEFORGE', width: WIDTH_IN, height: h });
  pptx.layout = 'SLIDEFORGE';
  pptx.title = deck.title || 'Untitled lesson';
  pptx.company = 'SlideForge';
  for (const s of slides) {
    const slide = pptx.addSlide();
    // PptxGenJS takes the picture without its data: prefix.
    slide.addImage({ data: s.image.replace(/^data:/, ''), x: 0, y: 0, w: WIDTH_IN, h, altText: s.name || undefined });
    for (const t of s.texts ?? []) {
      const runs = t.list === 'none'
        ? t.text
        : t.text.split('\n').filter((line) => line.trim()).map((line) => ({ text: line, options: { bullet: t.list === 'numbers' ? { type: 'number' as const } : true, breakLine: true } }));
      slide.addText(runs, {
        x: t.x * k, y: t.y * k, w: t.w * k, h: t.h * k, rotate: t.rot || undefined,
        fontFace: t.font, fontSize: pt(t.size), bold: t.bold, italic: t.italic, underline: t.underline ? { style: 'sng' } : undefined,
        color: t.color.slice(1), transparency: t.opacity < 1 ? Math.round((1 - t.opacity) * 100) : undefined,
        align: t.align, valign: t.valign, lineSpacing: pt(t.size * t.lineHeight), charSpacing: t.tracking ? pt(t.tracking * t.size) : undefined,
        margin: 0, fit: 'none', wrap: true, objectName: t.name || undefined,
      });
    }
    if (s.notes.trim()) slide.addNotes(s.notes);
    if (s.hidden) slide.hidden = true;
  }
  return (await pptx.write({ outputType: 'blob' })) as Blob;
}

export type SlideFormat = 'png' | 'pptx' | 'pptx-edit';

/** One slide on its own: its picture at full size, or a one-slide PowerPoint, as a picture or with its
 *  words editable. A hidden slide comes out shown: it is the one asked for. */
export async function exportSlide(deck: Deck, slideId: string, format: SlideFormat) {
  const i = deck.slides.findIndex((s) => s.id === slideId);
  if (i < 0) return;
  const s = deck.slides[i];
  if (format === 'png') { await exportPng(s, deck, i); return; }
  const one = format === 'pptx-edit'
    ? editableSlide(deck, s)
    : { image: renderStill(s, deck, 1920, 'image/jpeg', 2, 0.92), notes: s.notes ?? '', hidden: false, name: s.name };
  download(`${slug(deck.title)}-slide-${i + 1}${format === 'pptx-edit' ? '-editable' : ''}.pptx`, await buildPptx(deck, [{ ...one, hidden: false }]));
}

export async function exportPptx(deck: Deck, slides: PptxSlide[], editableText = false) {
  download(`${slug(deck.title)}${editableText ? '-editable' : ''}.pptx`, await buildPptx(deck, slides));
}
