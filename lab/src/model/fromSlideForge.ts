import { createLayer, uid } from './defaults';
import { CHART_DARK, CHART_LIGHT } from '../engine/chartKinds';
import {
  LAYOUTS, beforeAfterSlide, bulletsSlide, cardsSlide, chartSlide, codeSlide, columnsSlide, compareSlide, exploreSlide, framedPictureSlide, simulationSlide, funnelSlide,
  gallerySlide, introductionSlide, journeySlide, keyfactSlide, keywordsSlide, mindmapSlide, orgchartSlide, pointsSlide, quoteSlide,
  railSlide, sectionSlide, sidecarTitleSlide, splitSlide, statsSlide, tableSlide, timelineSlide, titleSlide, type LayoutStyle,
} from './layouts';
import { gameClock } from './layouts';
import type { Deck, FeedbackKind, Slide, SlideFeedback } from './types';
import { finish, framed, kit } from './ukbtDeck';

// SlideForge slides, built in the lab. A SlideForge slide is content with a type — a title, points,
// a table, chart data — and the lab has a layout for each type, on its own standard rules. This
// reads the content and hands it to the matching layout, so a SlideForge deck comes in native:
// every word editable, every set sized together, the deck's palette and grounds applied. Nothing
// is measured off SlideForge's screen. Where the lab draws a thing differently (a chart kind it
// does not have, a live moment it cannot run) the slide's notes say what it was and what it is here.

/** A SlideForge slide's content: only the fields the lab reads. */
export interface SFSlide {
  id?: string;
  type: string;
  /** The room's say on the slide: a poll, word cloud, brainstorm or scale, with its settings. */
  feedback?: Record<string, unknown> | null;
  /** Seconds the slide is timed for: SlideForge draws its game clock and counts it down. */
  timeLimit?: number;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  notes?: string;
  image?: string;
  chartKind?: string;
  chartSource?: string;
  design?: Record<string, unknown>;
  exploration?: Record<string, unknown>;
  progressive?: boolean;
  code?: string;
  language?: string;
  typewrite?: boolean;
  videoPoster?: string;
}
export interface SFDeck { key: string; title: string; theme: string; slides: SFSlide[]; images: Record<string, string> }

const cells = (line: string) => line.split('\t').map((c) => c.trim());
const pairs = (b: string[] = []) => b.filter((l) => l.trim()).map((l) => { const [a = '', c = ''] = cells(l); return [a, c] as [string, string]; });
const triples = (b: string[] = []) => b.filter((l) => l.trim()).map((l) => { const [a = '', c = '', d = ''] = cells(l); return [a, c, d] as [string, string, string]; });
const hasPairs = (b: string[] = []) => b.some((l) => l.includes('\t'));

// The lab's chart draws columns, bars, lines, pies and donuts, one series each. SlideForge's other
// kinds come in as the nearest of those, with the reason in the notes.
/** SlideForge's table-shaped chart data as the lab's "label, value" lines: the first series. */
function chartData(kind: string, body: string): string {
  const rows = String(body ?? '').split('\n').map((r) => r.trim()).filter(Boolean).map(cells);
  if (kind === 'histogram') {
    const vals = rows.slice(1).map((r) => parseFloat(r[0])).filter(Number.isFinite);
    if (!vals.length) return '';
    const lo = Math.floor(Math.min(...vals) / 10) * 10, bins = new Map<number, number>();
    vals.forEach((v) => { const b = Math.floor((v - lo) / 10); bins.set(b, (bins.get(b) ?? 0) + 1); });
    return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([b, n]) => `${lo + b * 10}–${lo + b * 10 + 9}, ${n}`).join('\n');
  }
  if (kind === 'sankey') {
    const into = new Map<string, number>();
    rows.slice(1).forEach(([, to, v]) => { const n = parseFloat(v); if (to && Number.isFinite(n)) into.set(to, (into.get(to) ?? 0) + n); });
    return [...into.entries()].map(([k, v]) => `${k}, ${v}`).join('\n');
  }
  if (kind === 'box') {
    return rows.slice(1).map((r) => { const v = r.slice(1).map(parseFloat).filter(Number.isFinite).sort((a, b) => a - b); return `${r[0]}, ${v[Math.floor(v.length / 2)] ?? 0}`; }).join('\n');
  }
  return rows.slice(1).filter((r) => r.length > 1).map((r) => `${r[0]}, ${parseFloat(String(r[1]).replace(/[^0-9.-]/g, '')) || 0}`).join('\n');
}

/** Whether a ground is dark, so a chart takes SlideForge's dark-ground steps. */
function dark(hex: string): boolean {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return Number.isFinite(n) && ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 128;
}

/** A full-bleed picture with its caption on a scrim. */
function photo(st: LayoutStyle, src: string, caption: string, credit: string): Slide {
  const s = LAYOUTS.find((l) => l.id === 'image')!.make(st);
  const pic = s.layers.find((l) => l.kind === 'image')!;
  pic.name = 'Picture';
  Object.assign(pic.params, { src, fit: 'cover', frame: 'bleed', capStyle: 'gradient' });
  s.layers.find((l) => l.name === 'Caption band')!.params.captionOf = pic.id;
  s.layers.find((l) => l.name === 'Caption')!.params.text = caption;
  const cr = s.layers.find((l) => l.name === 'Caption credit')!;
  if (credit) cr.params.text = credit; else s.layers = s.layers.filter((l) => l !== cr);
  return s;
}

/** A statement in SlideForge's framed composition. */
function statement(st: LayoutStyle, line: string, credit: string): Slide {
  const s = LAYOUTS.find((l) => l.id === 'statement-frame')!.make(st);
  s.layers.find((l) => l.name === 'Statement')!.params.text = line;
  const c = s.layers.find((l) => l.name === 'Credit')!;
  if (credit) c.params.text = credit; else s.layers = s.layers.filter((l) => l !== c);
  return s;
}

type Ground = 'working' | 'quiet' | 'loud';
/** Where a SlideForge theme sets a type on its dark ground (Northeastern: title, section, quote). */
const QUIET = new Set(['title', 'section', 'quote']);

/** One SlideForge slide as a lab slide, or null for what the lab leaves out (games). */
function convert(s: SFSlide, on: (g: Ground) => LayoutStyle, img: (p?: string) => string, mark: string): { slide: Slide; ground: Ground; note?: string } | null {
  const g: Ground = QUIET.has(s.type) && s.design?.composition !== 'sidecar' ? 'quiet' : 'working';
  const st = on(g);
  const t = s.title ?? '', sub = s.subtitle ?? '', b = s.bullets ?? [];
  const comp = String(s.design?.composition ?? '');
  switch (s.type) {
    case 'title':
      return { slide: comp === 'sidecar' ? sidecarTitleSlide(st, t, sub, mark) : titleSlide(st, t, sub), ground: g };
    case 'statement': return { slide: statement(st, s.body ?? t, sub), ground: g };
    case 'section': return { slide: sectionSlide(st, t, sub), ground: g };
    case 'introduction': return { slide: introductionSlide(st, t, sub, s.body ?? ''), ground: g };
    case 'quote': return { slide: quoteSlide(st, s.body ?? '', sub), ground: g };
    case 'content':
      if (comp === 'columns') return { slide: columnsSlide(st, t, b), ground: g };
      if (comp === 'rail') return { slide: railSlide(st, t, b), ground: g };
      if (hasPairs(b)) return { slide: pointsSlide(st, t, pairs(b)), ground: g };
      {
        const slide = bulletsSlide(st, t, b);
        // Built a point per press in SlideForge: the same here, one line per click.
        if (s.progressive) { const l = slide.layers.find((x) => x.name === 'Bullet points'); if (l) l.anim = { ...l.anim, type: 'fade', build: 'lines' }; }
        return { slide, ground: g };
      }
    case 'journey': return { slide: journeySlide(st, t, sub, pairs(b)), ground: g };
    case 'mindmap': return { slide: mindmapSlide(st, t, pairs(b)), ground: g };
    case 'keyfact': return { slide: keyfactSlide(st, t, s.body ?? '', sub, b), ground: g };
    case 'orgchart': return { slide: orgchartSlide(st, t, triples(b)), ground: g };
    case 'stats': return { slide: statsSlide(st, t, triples(b).map(([label, value, note]) => [value, note ? `${label} — ${note}` : label] as [string, string]), s.body ?? ''), ground: g };
    case 'compare': {
      const heads = (sub.split('|').map((x) => x.trim()) as [string, string]);
      return { slide: compareSlide(st, t, [heads[0] ?? 'One', heads[1] ?? 'Two'], triples(b)), ground: g };
    }
    case 'funnel': return { slide: funnelSlide(st, t, sub, triples(b)), ground: g };
    case 'timeline': return { slide: timelineSlide(st, t, sub, triples(b)), ground: g };
    case 'cards': {
      const items = pairs(b);
      return { slide: cardsSlide(st, t, items), ground: g, note: items.length > 4 ? `SlideForge shows ${items.length} cards here; the lab's cards take four a slide, so the rest are in these notes: ${items.slice(4).map((x) => x.join(' — ')).join('; ')}.` : undefined };
    }
    case 'keywords': return { slide: keywordsSlide(st, t, pairs(b)), ground: g };
    case 'italics': {
      const slide = keywordsSlide(st, t, pairs(b));
      slide.layers.filter((l) => l.name === 'Keyword').forEach((l) => { l.params.italic = true; });
      return { slide, ground: g };
    }
    case 'links': return { slide: pointsSlide(st, t, pairs(b)), ground: g };
    case 'join': return { slide: bulletsSlide(st, t, b), ground: g, note: 'In SlideForge this slide shows the live session’s join code and QR code; the lab has no live session, so it keeps the words.' };
    case 'table': return { slide: tableSlide(st, t, s.body ?? ''), ground: g };
    case 'code': return { slide: codeSlide(st, t, s.code ?? '', s.language ?? 'code', !!s.typewrite), ground: g };
    case 'chart': {
      const kind = String(s.chartKind ?? 'bar');
      const body = s.body ?? '';
      const slide = chartSlide(st, t, s.chartSource ? `Source: ${s.chartSource}` : '');
      const chart = slide.layers.find((l) => l.kind === 'chart')!;
      // One series draws as the lab's own column, bar, line, pie or donut; more, and every other idiom,
      // is SlideForge's, read from the same table (engine/chartKinds.ts).
      const series = (body.split('\n').find((r) => r.trim()) ?? '').split(/\t|\|/).length - 1;
      const single: Record<string, string> = { bar: 'column', column: 'column', hbar: 'bar', line: 'line', pie: 'pie', donut: 'donut' };
      const own = single[kind] && (series <= 1 || kind === 'pie' || kind === 'donut');
      const lab = own ? single[kind] : kind === 'bar' || kind === 'column' || kind === 'hbar' ? 'grouped' : kind === 'line' ? 'lines' : kind;
      Object.assign(chart.params, own
        ? { chart: lab, data: chartData(kind, body) }
        : { chart: lab, data: body, palette: (dark(st.ground) ? CHART_DARK : CHART_LIGHT).join(','), surface: st.ground, icon: String((s as { chartIcon?: string }).chartIcon ?? '●'), unit: Number((s as { chartUnit?: number }).chartUnit ?? 0) || 0 });
      if (!s.chartSource) slide.layers = slide.layers.filter((l) => l.name !== 'Source');
      return { slide, ground: g };
    }
    case 'image': {
      // A frame (16:9, 4:3, 1:1…) or facts on the back make it SlideForge's framed picture; else full bleed.
      const frame = String((s.design as { imageFrame?: string } | undefined)?.imageFrame ?? '');
      const facts = String(s.body ?? '').trim();
      if (frame || facts) {
        const cap = (s.design as { capStyle?: string } | undefined)?.capStyle === 'bar' ? 'bar' : 'plain';
        return { slide: framedPictureSlide(st, t, sub, img(s.image), frame || '4:3', cap, facts), ground: g };
      }
      return { slide: photo(st, img(s.image), t, sub), ground: g };
    }
    case 'split': {
      const slide = splitSlide(st, t, b, s.design?.imageSide === 'left' ? 'left' : 'right');
      Object.assign(slide.layers.find((l) => l.kind === 'image')!.params, { src: img(s.image), fit: 'cover' });
      return { slide, ground: g };
    }
    case 'gallery': {
      const figs = ((s as { layers?: { image?: string; caption?: string; source?: string }[] }).layers ?? []).filter((l) => l.image)
        .map((l) => ({ src: img(l.image), caption: l.caption ?? '', source: l.source ?? '' }));
      const design = (s.design ?? {}) as { imageFrame?: string; capStyle?: string };
      const fit = (s as { imageFit?: string }).imageFit === 'cover' ? 'cover' : 'contain';
      return { slide: gallerySlide(st, t, figs.length ? figs : ['First picture', 'Second picture', 'Third picture'], design.imageFrame || '4:3', design.capStyle === 'bar' ? 'bar' : 'plain', fit), ground: g };
    }
    case 'beforeafter': {
      const e = s.exploration ?? {};
      const before = img(String(e.before ?? ''));
      return { slide: beforeAfterSlide(st, t, before, img(String(e.after ?? '')), [String(e.beforeLabel ?? 'Before'), String(e.afterLabel ?? 'After')], before ? aspectOf(before) : 0), ground: g };
    }
    case 'explore': {
      const spots = ((s.exploration?.spots ?? []) as { x: number; y: number; zoom?: number; title: string; body?: string }[]);
      const src = img(s.image);
      return { slide: exploreSlide(st, t, src, spots, aspectOf(src)), ground: g };
    }
    case 'simulation': return { slide: simulationSlide(st, t, (s.exploration ?? {}) as Parameters<typeof simulationSlide>[2]), ground: g };
    case 'video': {
      // The clip plays muted on a loop over its poster, which shows until the first frame decodes.
      const slide = photo(st, img(s.videoPoster), t, '');
      const pic = slide.layers.find((l) => l.kind === 'image')!;
      const clip = img((s as { video?: string }).video);
      if (clip) slide.layers.splice(slide.layers.indexOf(pic) + 1, 0, createLayer('video', { name: 'Video', box: { ...pic.box! }, params: { src: clip, fit: 'cover' }, anim: { type: 'fade', duration: 0.6 } }));
      return { slide, ground: g };
    }
    default: return null; // games and activities are SlideForge's, not the lab's
  }
}

const KINDS: FeedbackKind[] = ['poll', 'wordcloud', 'brainstorm', 'scale'];

/** A SlideForge slide's feedback, as the lab keeps it: the known fields only, each checked. */
/** A SlideForge slide's audience feedback, with its settings, as the lab keeps it. */
export function feedbackOf(f: SFSlide['feedback']): SlideFeedback | null {
  if (!f || !KINDS.includes(f.kind as FeedbackKind)) return null;
  const out: SlideFeedback = { kind: f.kind as FeedbackKind };
  if (typeof f.prompt === 'string' && f.prompt.trim()) out.prompt = f.prompt;
  if (Array.isArray(f.options)) out.options = f.options.map(String).filter((o) => o.trim());
  if (Number(f.max) > 0) out.max = Number(f.max);
  if (f.presentAs === 'rail' || f.presentAs === 'focus') out.presentAs = f.presentAs;
  if (Number(f.points) > 0) out.points = Number(f.points);
  if (typeof f.lowLabel === 'string') out.lowLabel = f.lowLabel;
  if (typeof f.highLabel === 'string') out.highLabel = f.highLabel;
  return out;
}

/** What a SlideForge slide does in the room, onto the lab slide built from it: its audience feedback,
 *  and its time as the game clock level with the heading (the Timed task's clock), the heading kept
 *  clear of it. Nothing already there is replaced. */
export function carryLive(s: SFSlide, slide: Slide, st: LayoutStyle): boolean {
  let changed = false;
  const f = feedbackOf(s.feedback);
  if (f && !slide.feedback) { slide.feedback = f; changed = true; }
  const secs = Number(s.timeLimit);
  if (secs > 0 && !slide.layers.some((l) => l.kind === 'timer')) {
    const head = slide.layers.find((l) => l.kind === 'text' && l.box && /^(Heading|Hero|Title)$/i.test(l.name) && !l.params.hfSlot);
    const row = head?.box ? { ...head.box } : undefined;
    const clock = gameClock(st, Math.max(0.5, Math.round((secs / 60) * 2) / 2), row);
    if (head?.box && clock.box && head.box.x + head.box.w > clock.box.x - 48) head.box.w = Math.max(120, clock.box.x - 48 - head.box.x);
    slide.layers.push(clock);
    changed = true;
  }
  return changed;
}

/** A lab copy made before converted slides kept their feedback and timers, given them from its
 *  SlideForge lesson: each lab slide matched to its source by `sourceSlideId`, or, for a copy older
 *  than that, in order when the counts agree. How many slides took something. */
export function carryDeckLive(deck: Deck, source: SFSlide[], paletteId = 'nul'): number {
  const { on } = kit(paletteId);
  const byId = new Map(source.filter((s) => s.id).map((s) => [s.id as string, s]));
  let pairs: [Slide, SFSlide][] = [];
  if (deck.slides.some((s) => s.sourceSlideId)) {
    for (const s of deck.slides) { const src = s.sourceSlideId ? byId.get(s.sourceSlideId) : undefined; if (src) pairs.push([s, src]); }
  } else {
    const built = source.filter(convertsSlide);
    if (built.length === deck.slides.length) pairs = deck.slides.map((s, i) => [s, built[i]] as [Slide, SFSlide]);
  }
  let n = 0;
  for (const [slide, s] of pairs) {
    const g: Ground = slide.ground === 'quiet' || slide.ground === 'loud' ? slide.ground : 'working';
    if (carryLive(s, slide, on(g))) n++;
  }
  return n;
}

/** Whether the lab can build this SlideForge slide. What it cannot (games, activities) stays SlideForge's. */
let probe: ReturnType<typeof kit> | null = null;
export function convertsSlide(s: SFSlide): boolean {
  probe ??= kit('nul');
  try { return !!convert(s, probe.on, (p) => p ?? '', ''); } catch { return false; }
}

/** A SlideForge deck, built in the lab in a palette (NU London's for the Northeastern theme). */
export function deckFromSlideForge(data: SFDeck, paletteId = 'nul', opts: { frame?: boolean; games?: string } = {}): Deck {
  const { guide, on, put } = kit(paletteId);
  const img = (p?: string) => (p && data.images[p]) || '';
  const slides: Slide[] = [];
  let skipped = 0;
  for (const s of data.slides) {
    const out = convert(s, on, img, guide.marks[1]?.src ?? guide.marks[0]?.src ?? '');
    if (!out) { skipped++; continue; }
    const notes = [s.notes ?? '', out.note ? `LAB — ${out.note}` : ''].filter(Boolean).join('\n\n');
    const made = put(out.slide, out.ground, notes);
    if (s.id) made.sourceSlideId = s.id;
    carryLive(s, made, on(out.ground));
    slides.push(made);
  }
  const deck: Deck = { carried: 1, id: uid(), title: `${data.title}${skipped ? (opts.games ?? ` (without its ${skipped} games)`) : ''}`, width: 1920, height: 1080, version: 1, theme: 'guide', styleGuide: guide, slides: finish(slides) };
  return opts.frame === false ? deck : framed(deck, guide.marks[0]?.src ?? '', 'Northeastern University London');
}

/** One of the Slide designs: a SlideForge slide with a special feature, built natively in the lab. */
export interface SlideDesign { id: string; name: string; group: string; blurb: string; slide: Slide }

const DESIGN_GROUPS: [string, (s: SFSlide) => boolean][] = [
  ['Pictures that move', (s) => ['explore', 'gallery', 'beforeafter', 'video'].includes(s.type) || (s.type === 'image' && !!String(s.body ?? '').trim())],
  ['Things the room drives', (s) => s.type === 'simulation'],
  ['Charts', (s) => s.type === 'chart'],
  ['Structures', (s) => ['mindmap', 'orgchart', 'timeline', 'funnel', 'journey'].includes(s.type)],
];

/**
 * The Slide designs: every slide in the Layout bank whose point is a feature — a picture explored,
 * flipped, piled or wiped; a model the room drives; each chart idiom; the structures — built by the
 * same converter as the bank, in the style given, its SlideForge notes kept as speaker notes.
 */
export function slideDesigns(data: SFDeck, st: LayoutStyle): SlideDesign[] {
  const img = (p?: string) => (p && data.images[p]) || '';
  const out: SlideDesign[] = [];
  data.slides.forEach((s, i) => {
    const group = DESIGN_GROUPS.find(([, is]) => is(s))?.[0];
    if (!group) return;
    const made = convert(s, () => st, img, '');
    if (!made) return;
    const note = String(s.notes ?? '');
    made.slide.notes = note;
    const name = String(s.title ?? s.type).replace(/^Chart\s*[·—-]\s*/, '').replace(/^\w/, (c) => c.toUpperCase());
    const blurb = (note.split('\n')[0] ?? '').replace(/^[A-Z /&-]+ — /, '').slice(0, 220);
    out.push({ id: `${s.type}-${i}`, name, group, blurb, slide: made.slide });
  });
  return out;
}
export const SLIDE_DESIGN_GROUPS = DESIGN_GROUPS.map(([g]) => g);

/** A picture's width over height, read from the PNG or JPEG header in its data address, so a slide can
 *  fit its frame to the picture without waiting for it to load. 16:9 when it can't be read. */
export function aspectOf(src: string): number {
  const b64 = src.split(',')[1];
  if (!b64) return 16 / 9;
  const bin = atob(b64.slice(0, 80000));
  const at = (i: number) => bin.charCodeAt(i);
  // SVG: its viewBox, or its width and height.
  if (/^\s*(<\?xml|<svg)/.test(bin)) {
    const vb = bin.match(/viewBox=["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/);
    if (vb && +vb[2] > 0) return +vb[1] / +vb[2];
    const wh = bin.match(/<svg[^>]*\swidth=["']([\d.]+)[^>]*\sheight=["']([\d.]+)/);
    if (wh && +wh[2] > 0) return +wh[1] / +wh[2];
    return 16 / 9;
  }
  if (bin.startsWith('\x89PNG')) return ((at(16) << 24) | (at(17) << 16) | (at(18) << 8) | at(19)) / ((at(20) << 24) | (at(21) << 16) | (at(22) << 8) | at(23));
  if (at(0) === 0xff && at(1) === 0xd8) {
    for (let i = 2; i < bin.length - 9;) {
      if (at(i) !== 0xff) { i++; continue; }
      const m = at(i + 1), len = (at(i + 2) << 8) | at(i + 3);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return ((at(i + 7) << 8) | at(i + 8)) / ((at(i + 5) << 8) | at(i + 6));
      i += 2 + len;
    }
  }
  return 16 / 9;
}
