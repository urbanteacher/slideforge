import type { Deck, Layer, Slide } from '../model/types';
import { EASE, schedule } from './anim';
import { ALL_KINDS } from './registry';
import { MODEL_PLOT } from './raster';
import { sceneControls, sceneHit, sceneIsContinuous, sceneIsSelectable, sceneSteps } from './scene';
import { experimentControls, experimentStates } from './experiment';
import { hitButton } from './controls';
import { Renderer, type FrameOpts } from './renderer';

export interface PlayerOptions {
  start?: number;
  onChange?: (index: number, step: number, steps: number) => void;
  maxPixels?: number;
  /** Inside SlideForge's player (js/lab-stage.js), which owns Next and Previous: a click the slide
   *  does not use is left to bubble up to it, and a layer's own next / previous is handed to it. */
  host?: { next: () => void; prev: () => void };
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
  /** Turned over to the back face, and when the turn began (for its half-second ease). */
  private flipped = false;
  /** Values dragged in the show (before / after handles, simulation inputs), by layer id. */
  private live = new Map<string, number>();
  private dragging: Layer | null = null;
  /** The scene slider being dragged, in the layer's pixels. */
  private sliding: { x: number; w: number } | null = null;
  private slideTo(l: Layer, u: number) {
    const x = u * this.deck.width - l.box!.x, s = this.sliding!;
    this.live.set(`${l.id}:value`, Math.max(0, Math.min(100, ((x - s.x) / s.w) * 100)));
  }
  private flipAt = -9;
  private raf = 0;
  private paused = false;
  private insetTarget = 0;
  private lastFrame = 0;
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
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointerup', this.onUp);
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
    // A layer a button has taken over carries on from where it was sent: Next moves it one further,
    // and past its last state moves the show on.
    for (const l of this.slide.layers) {
      if (!this.live.has(`${l.id}:state`)) continue;
      const cur = this.live.get(`${l.id}:state`)!, last = l.kind === 'experiment' ? experimentStates(l.params).length - 1 : sceneSteps(l.params);
      if (cur < last) { this.setState(l, cur + 1); return; }
      this.clearLive(l);
      this.goto(this.index + 1, 1);
      return;
    }
    // Otherwise Next hands a motion scene back to its clicks: what was dragged or pressed gives way.
    for (const l of this.slide.layers) if (l.kind === 'scene') for (const k of ['value', 'x', 'y', 'choice']) this.live.delete(`${l.id}:${k}`);
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
    // Keep the textures of the slides around this one (the transition draws the last), drop the rest.
    this.renderer.prune(new Set(this.deck.slides.slice(Math.max(0, i - 2), i + 3).flatMap((x) => x.layers.map((l) => l.id))));
    this.clicks = [];
    this.flipped = false;
    this.flipAt = -9;
    this.live.clear();
    this.sliding = null;
    this.built = built;
    this.slideStart = this.now();
    this.emit();
  }

  private finishTransition() { this.trans = null; }

  private toSlide(e: PointerEvent | MouseEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    // With room made for a rail, the slide's content is drawn smaller; a press is read against it.
    const s = 1 - this.renderer.inset;
    return s < 1 ? [u / s, (v - (1 - s) / 2) / s] : [u, v];
  }

  // ─── Inside SlideForge's player (js/lab-stage.js) ─────────────────────────
  /** Where the show is: the slide, the builds shown and how many it has. */
  state() { return { index: this.index, step: this.built ? this.steps() : this.clicks.length, steps: this.steps(), built: this.built }; }
  /** One build further on this slide, if it has one left. False: the slide is built. */
  build(): boolean {
    if (this.trans) this.finishTransition();
    if (this.built || this.clicks.length >= this.steps()) return false;
    this.clicks.push(this.now() - this.slideStart);
    this.emit();
    return true;
  }
  /** Straight to a slide, with no transition: SlideForge's player has just cut to it. */
  cut(i: number, built = false) {
    if (i < 0 || i >= this.deck.slides.length) return;
    this.trans = null;
    if (i === this.index) { this.clicks = []; this.built = built; this.slideStart = this.now(); this.emit(); return; }
    const tr = this.deck.slides[i].transition;
    this.deck.slides[i].transition = { ...tr, type: 'none' };
    try { this.goto(i, 1, built); } finally { this.deck.slides[i].transition = tr; }
  }
  /** Room on the right for SlideForge's rail, as a fraction of the slide's width. It eases across. */
  setInset(fraction: number) { this.insetTarget = Math.max(0, Math.min(0.6, fraction)); }
  /** Stop drawing while SlideForge's player shows one of its own slides, and start again. */
  pause() { this.paused = true; }
  resume() { this.paused = false; }

  // ─── On-slide controls ─────────────────────────────────────────────────────
  /** The state an experiment (−1: predict) or a scene (its step) is showing: a button's, or its clicks'. */
  private stateOf(l: Layer): number {
    const live = this.live.get(`${l.id}:state`);
    if (live !== undefined) return live;
    const starts = schedule(this.slide, this.clicks).lines.get(l.id) ?? [];
    const t = this.built ? Infinity : this.now() - this.slideStart;
    let i = -1;
    starts.forEach((s, j) => { if (t >= s) i = j; });
    if (!Number.isFinite(t)) i = starts.length - 1;
    return l.kind === 'experiment' ? i - 1 : Math.max(0, i);
  }
  /** Send a layer to a state, moving from the one it shows now (or from `from`). */
  private setState(l: Layer, to: number, from = this.stateOf(l)) {
    this.live.set(`${l.id}:prev`, from);
    this.live.set(`${l.id}:from`, from);
    this.live.set(`${l.id}:state`, to);
    this.live.set(`${l.id}:at`, this.now());
    if (l.kind === 'scene') for (const k of ['value', 'choice']) this.live.delete(`${l.id}:${k}`);
  }
  private clearLive(l: Layer) { for (const k of ['state', 'from', 'prev', 'at', 'value', 'x', 'y', 'choice']) this.live.delete(`${l.id}:${k}`); }
  /** The params a layer is drawn with now, so its buttons are laid out and lit as they are shown. */
  private shown(l: Layer) {
    const p: Record<string, unknown> = { ...l.params, _step: this.stateOf(l) };
    for (const k of ['value', 'choice']) { const v = this.live.get(`${l.id}:${k}`); if (v !== undefined) p[`_${k}`] = v; }
    return p as Layer['params'];
  }
  /** The control under a point on an experiment or scene layer, if any. */
  private controlAt(u: number, v: number) {
    const X = u * this.deck.width, Y = v * this.deck.height;
    for (let i = this.slide.layers.length - 1; i >= 0; i--) {
      const l = this.slide.layers[i];
      if ((l.kind !== 'experiment' && l.kind !== 'scene') || !l.visible || !l.box) continue;
      const b = l.box, x = X - b.x, y = Y - b.y;
      if (x < 0 || y < 0 || x > b.w || y > b.h) continue;
      const ctl = l.kind === 'experiment' ? experimentControls(this.shown(l), b.w, b.h) : sceneControls(this.shown(l), b.w, b.h);
      const hit = hitButton(ctl.buttons, x, y);
      const sl = (ctl as { slider?: { x: number; y: number; w: number; h: number } | null }).slider;
      const slider = sl && x >= sl.x && y >= sl.y && y <= sl.y + sl.h ? sl : null;
      if (hit || slider) return { layer: l, action: hit?.action ?? 'slider', slider, x };
    }
    return null;
  }
  private press(l: Layer, action: string) {
    const cur = this.stateOf(l);
    if (action.startsWith('state:')) { this.setState(l, Number(action.slice(6)), cur); return; }
    if (action === 'replay') { const prev = this.live.get(`${l.id}:prev`); this.setState(l, cur, prev !== undefined && prev !== cur ? prev : Math.max(0, cur - 1)); return; }
    const steps = sceneSteps(l.params);
    if (action === 'prev') this.setState(l, Math.max(0, cur - 1), cur);
    else if (action === 'next') this.setState(l, Math.min(steps, cur + 1), cur);
    else if (action === 'reset') { if (l.params.mode === 'lens') { this.live.delete(`${l.id}:x`); this.live.delete(`${l.id}:y`); } else this.setState(l, 0, cur); }
    else if (action === 'overview') this.live.set(`${l.id}:choice`, -1);
  }

  /** A before / after, a simulation or a draggable motion scene under the pointer: things the room drags. */
  private wipeAt(u: number, v: number) {
    return hitLayer(this.slide, u * this.deck.width, v * this.deck.height, (l) => l.kind === 'wipe' || l.kind === 'model' || (l.kind === 'scene' && (sceneIsContinuous(String(l.params.mode)) || l.params.mode === 'lens')));
  }
  private dragTo(l: Layer, u: number, v = 0.5) {
    const b = l.box!, f = (u * this.deck.width - b.x) / b.w, g = (v * this.deck.height - b.y) / b.h;
    if (l.kind === 'wipe') { this.live.set(l.id, Math.max(0, Math.min(100, 100 - f * 100))); return; }
    if (l.kind === 'scene') {
      // The lens follows the pointer; a transformation runs left to right across the stage.
      if (l.params.mode === 'lens') { this.live.set(`${l.id}:x`, Math.max(0, Math.min(100, f * 100))); this.live.set(`${l.id}:y`, Math.max(0, Math.min(100, (g / 0.82) * 100))); }
      else this.live.set(`${l.id}:value`, Math.max(0, Math.min(100, f * 100)));
      return;
    }
    // A simulation's input follows the pointer across its plot.
    const lo = Number(l.params.min ?? 0), hi = Math.max(lo + 1, Number(l.params.max ?? 10));
    const k = Math.max(0, Math.min(1, (f - MODEL_PLOT[0]) / (MODEL_PLOT[1] - MODEL_PLOT[0])));
    this.live.set(l.id, lo + (hi - lo) * k);
  }
  private onDown = (e: PointerEvent) => {
    const [u, v] = this.toSlide(e);
    // A button is pressed on click; the slider drags like the stage does.
    const c = this.controlAt(u, v);
    if (c && c.action !== 'slider') return;
    if (c?.slider) { this.dragging = c.layer; this.sliding = c.slider; this.canvas.setPointerCapture(e.pointerId); this.slideTo(c.layer, u); return; }
    const l = this.wipeAt(u, v);
    if (!l) return;
    this.dragging = l;
    this.canvas.setPointerCapture(e.pointerId);
    this.dragTo(l, u, v);
  };
  private onUp = (e: PointerEvent) => {
    this.sliding = null;
    if (!this.dragging) return;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    this.dragging = null;
  };

  private onMove = (e: PointerEvent) => {
    this.mouseTarget = this.toSlide(e);
    const [u, v] = this.mouseTarget;
    if (this.dragging && this.sliding) { this.slideTo(this.dragging, u); return; }
    if (this.dragging) { this.dragTo(this.dragging, u, v); return; }
    if (this.controlAt(u, v)) { this.canvas.style.cursor = 'pointer'; return; }
    if (this.wipeAt(u, v)) { this.canvas.style.cursor = 'ew-resize'; return; }
    const hit = hitLayer(this.slide, u * this.deck.width, v * this.deck.height, (l) => l.interact.hover !== 'none' || l.interact.click !== 'none');
    this.hovered = hit?.id ?? null;
    this.canvas.style.cursor = hit && hit.interact.click !== 'none' ? 'pointer' : '';
  };

  private onLeave = () => { this.mouseTarget = [0.5, 0.5]; this.hovered = null; };

  private onClick = (e: MouseEvent) => {
    const [u, v] = this.toSlide(e);
    // A press on an on-slide control does what it says; it never advances the show.
    const c = this.controlAt(u, v);
    if (c) { if (this.opts.host) e.stopPropagation(); if (c.action !== 'slider') this.press(c.layer, c.action); return; }
    // A press on a before / after moves its handle there; it never advances the show.
    if (this.wipeAt(u, v)) { if (this.opts.host) e.stopPropagation(); return; }
    // A press on a scene's card chooses it, or, chosen already, returns to the overview.
    const card = hitLayer(this.slide, u * this.deck.width, v * this.deck.height, (l) => l.kind === 'scene' && sceneIsSelectable(String(l.params.mode)));
    if (card) {
      const b = card.box!, cur = this.live.get(`${card.id}:choice`);
      const at = sceneHit({ ...card.params, _choice: cur ?? -1 }, b.w, b.h, (u * this.deck.width - b.x) / b.w, (v * this.deck.height - b.y) / b.h);
      if (at >= 0) { if (this.opts.host) e.stopPropagation(); this.live.set(`${card.id}:choice`, cur === at ? -1 : at); return; }
    }
    const hit = hitLayer(this.slide, u * this.deck.width, v * this.deck.height, (l) => l.interact.click !== 'none');
    if (hit) {
      const it = hit.interact;
      if (this.opts.host && (it.click === 'next' || it.click === 'prev')) { e.stopPropagation(); if (it.click === 'next') this.opts.host.next(); else this.opts.host.prev(); return; }
      if (this.opts.host) e.stopPropagation();
      if (it.click === 'next') this.next();
      else if (it.click === 'prev') this.prev();
      else if (it.click === 'goto') this.goto(it.gotoSlide - 1, it.gotoSlide - 1 > this.index ? 1 : -1);
      else if (it.click === 'link' && /^https?:\/\//.test(it.url)) window.open(it.url, '_blank', 'noopener');
      else if (it.click === 'flip') this.flip();
      return;
    }
    // In SlideForge's player the click goes on up to it, and it decides what Next means.
    if (this.opts.host) return;
    this.next();
  };

  /** Turn the slide over to its facts, or back. It does not use up a Next. */
  flip() {
    if (!this.slide.layers.some((l) => l.face === 'back')) return;
    const now = this.now(), k = Math.min(1, (now - this.flipAt) / 0.5);
    // Pressed mid-turn, it turns back from where it is.
    this.flipAt = now - (1 - k) * 0.5;
    this.flipped = !this.flipped;
  }

  private flipAmount(time: number) {
    const k = EASE.cubicInOut(Math.max(0, Math.min(1, (time - this.flipAt) / 0.5)));
    return this.flipped ? k : 1 - k;
  }

  private frameOpts(slide: Slide, start: number, clicks: number[], built: boolean, time: number): FrameOpts {
    return { time, mouse: this.mouse, t: built ? Infinity : time - start, clicks, interactive: true, hover: this.hover, live: slide === this.slide ? this.live : undefined, flip: slide === this.slide ? this.flipAmount(time) : 0 };
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    if (this.paused) return;
    const r = this.renderer;
    const time = this.now();
    // The room for the rail eases across over about the half-second the rail itself takes, by the
    // clock rather than by frames, so a slow machine gets there as soon as a fast one.
    const dt = Math.min(0.1, Math.max(0, time - this.lastFrame));
    this.lastFrame = time;
    if (Math.abs(r.inset - this.insetTarget) > 0.0005) r.inset += (this.insetTarget - r.inset) * (1 - Math.exp(-dt / 0.12));
    else r.inset = this.insetTarget;
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
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.renderer.dispose();
  }
}
