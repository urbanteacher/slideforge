import type { Deck, Layer, Slide } from '../model/types';
import { EASE, schedule } from './anim';
import { ALL_KINDS } from './registry';
import { Renderer, type FrameOpts } from './renderer';

export interface PlayerOptions {
  start?: number;
  onChange?: (index: number, step: number, steps: number) => void;
  maxPixels?: number;
}

interface Trans { from: Slide; fromStart: number; fromClicks: number[]; fromBuilt: boolean; start: number; dur: number; type: Slide['transition']['type']; dir: 1 | -1 }

/** Hit-test content layers (topmost first) at a slide-space point. */
export function hitLayer(slide: Slide, x: number, y: number, filter?: (l: Layer) => boolean): Layer | null {
  for (let i = slide.layers.length - 1; i >= 0; i--) {
    const l = slide.layers[i];
    if (!l.visible || !l.box) continue;
    if (filter && !filter(l)) continue;
    const b = l.box;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const a = (-b.rot * Math.PI) / 180;
    const dx = x - cx, dy = y - cy;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= b.w / 2 && Math.abs(ly) <= b.h / 2) return l;
  }
  return null;
}

/**
 * Plays a deck on a canvas: builds on click, shader transitions between slides, pointer-driven
 * interactions (follow-mouse effects, parallax, hover states, click actions).
 */
export class DeckPlayer {
  readonly renderer: Renderer;
  index = 0;
  private clicks: number[] = [];
  private slideStart = 0;
  private built = false;
  private trans: Trans | null = null;
  private mouse: [number, number] = [0.5, 0.5];
  private mouseTarget: [number, number] = [0.5, 0.5];
  private hover = new Map<string, number>();
  private hovered: string | null = null;
  private raf = 0;
  private t0 = performance.now();
  private ro: ResizeObserver;

  constructor(readonly canvas: HTMLCanvasElement, public deck: Deck, private opts: PlayerOptions = {}) {
    this.renderer = new Renderer(canvas, deck.width, deck.height);
    this.renderer.order = deck.slides.filter((s) => !s.hidden).map((s) => s.id);
    this.renderer.warm(ALL_KINDS.map((k) => k.id));
    this.index = Math.max(0, Math.min(deck.slides.length - 1, opts.start ?? 0));
    this.slideStart = this.now();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('click', this.onClick);
    this.loop();
    this.emit();
  }

  private now() { return (performance.now() - this.t0) / 1000; }

  get slide() { return this.deck.slides[this.index]; }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = r.width * dpr, h = r.height * dpr;
    const max = this.opts.maxPixels ?? 3840 * 2160;
    if (w * h > max) { const k = Math.sqrt(max / (w * h)); w *= k; h *= k; }
    this.renderer.setSize(w, h);
  }

  private steps(slide = this.slide) { return schedule(slide, []).steps; }

  private emit() { this.opts.onChange?.(this.index, this.built ? this.steps() : this.clicks.length, this.steps()); }

  next() {
    if (this.trans) this.finishTransition();
    if (!this.built && this.clicks.length < this.steps()) {
      this.clicks.push(this.now() - this.slideStart);
      this.emit();
      return;
    }
    this.goto(this.index + 1, 1);
  }

  prev() {
    if (this.trans) this.finishTransition();
    this.goto(this.index - 1, -1, true);
  }

  goto(i: number, dir: 1 | -1 = 1, built = false) {
    if (i < 0 || i >= this.deck.slides.length || i === this.index) return;
    const to = this.deck.slides[i];
    const tr = dir > 0 ? to.transition : this.slide.transition;
    if (tr.type !== 'none' && tr.duration > 0) {
      this.trans = { from: this.slide, fromStart: this.slideStart, fromClicks: this.clicks, fromBuilt: this.built, start: this.now(), dur: tr.duration, type: tr.type, dir };
    }
    this.index = i;
    this.clicks = [];
    this.built = built;
    this.slideStart = this.now();
    this.emit();
  }

  private finishTransition() { this.trans = null; }

  private toSlide(e: PointerEvent | MouseEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  private onMove = (e: PointerEvent) => {
    this.mouseTarget = this.toSlide(e);
    const [u, v] = this.mouseTarget;
    const hit = hitLayer(this.slide, u * this.deck.width, v * this.deck.height, (l) => l.interact.hover !== 'none' || l.interact.click !== 'none');
    this.hovered = hit?.id ?? null;
    this.canvas.style.cursor = hit && hit.interact.click !== 'none' ? 'pointer' : '';
  };

  private onLeave = () => { this.mouseTarget = [0.5, 0.5]; this.hovered = null; };

  private onClick = (e: MouseEvent) => {
    const [u, v] = this.toSlide(e);
    const hit = hitLayer(this.slide, u * this.deck.width, v * this.deck.height, (l) => l.interact.click !== 'none');
    if (hit) {
      const it = hit.interact;
      if (it.click === 'next') this.next();
      else if (it.click === 'prev') this.prev();
      else if (it.click === 'goto') this.goto(it.gotoSlide - 1, it.gotoSlide - 1 > this.index ? 1 : -1);
      else if (it.click === 'link' && /^https?:\/\//.test(it.url)) window.open(it.url, '_blank', 'noopener');
      return;
    }
    this.next();
  };

  private frameOpts(slide: Slide, start: number, clicks: number[], built: boolean, time: number): FrameOpts {
    return { time, mouse: this.mouse, t: built ? Infinity : time - start, clicks, interactive: true, hover: this.hover };
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const time = this.now();
    // Critically-damped-ish smoothing keeps pointer-driven motion silky rather than jittery.
    this.mouse = [this.mouse[0] + (this.mouseTarget[0] - this.mouse[0]) * 0.12, this.mouse[1] + (this.mouseTarget[1] - this.mouse[1]) * 0.12];
    for (const l of this.slide.layers) {
      const target = l.id === this.hovered ? 1 : 0;
      const cur = this.hover.get(l.id) ?? 0;
      const nxt = cur + (target - cur) * 0.18;
      if (Math.abs(nxt) < 0.001 && target === 0) this.hover.delete(l.id); else this.hover.set(l.id, nxt);
    }
    const to = this.frameOpts(this.slide, this.slideStart, this.clicks, this.built, time);
    if (this.trans) {
      const raw = (time - this.trans.start) / this.trans.dur;
      if (raw >= 1) this.trans = null;
      else {
        const tr = this.trans;
        const from = this.frameOpts(tr.from, tr.fromStart, tr.fromClicks, tr.fromBuilt, time);
        this.renderer.drawTransition(tr.from, from, this.slide, to, tr.type, EASE.cubicInOut(raw), tr.dir);
        return;
      }
    }
    this.renderer.drawSlide(this.slide, to, null);
  };

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    this.canvas.removeEventListener('click', this.onClick);
    this.renderer.dispose();
  }
}
