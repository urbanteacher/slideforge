import { produce } from 'immer';
import { create } from 'zustand';
import { measureTextHeight } from '../engine/raster';
import { kind } from '../engine/registry';
import { blankSlide, cloneLayer, cloneSlide, createLayer, demoDeck } from './defaults';
import type { Deck, Layer, Slide } from './types';

export type LeftTab = 'layers' | 'add';
export type InspectorTab = 'design' | 'animate' | 'interact';

interface State {
  deck: Deck;
  slideId: string;
  selectedId: string | null;
  leftTab: LeftTab;
  inspectorTab: InspectorTab;
  zoom: number | 'fit';
  fitZoom: number;
  past: Deck[];
  future: Deck[];
  lastMerge: { key: string; t: number } | null;
  saveState: 'saved' | 'saving' | 'unsaved';
  presenting: boolean;
  playToken: number;
  editingTextId: string | null;
  galleryOpen: boolean;
  clipboard: Layer | null;
  toast: string | null;

  mutate: (recipe: (d: Deck) => void, merge?: string) => void;
  undo: () => void;
  redo: () => void;
  loadDeck: (d: Deck) => void;
  set: (p: Partial<State>) => void;
  selectSlide: (id: string) => void;
  selectLayer: (id: string | null) => void;
  addLayer: (kindId: string, init?: Partial<Layer>) => string;
  insertLayer: (layer: Layer) => void;
  updateLayer: (id: string, recipe: (l: Layer) => void, merge?: string) => void;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  moveLayer: (id: string, toIndex: number) => void;
  addSlide: (slide?: Slide) => void;
  duplicateSlide: (id: string) => void;
  deleteSlide: (id: string) => void;
  moveSlide: (id: string, toIndex: number) => void;
  updateSlide: (recipe: (s: Slide) => void, merge?: string) => void;
  showToast: (msg: string) => void;
}

const HISTORY = 120;

export function slideOf(s: Pick<State, 'deck' | 'slideId'>): Slide {
  return s.deck.slides.find((x) => x.id === s.slideId) ?? s.deck.slides[0];
}
export function layerOf(s: Pick<State, 'deck' | 'slideId' | 'selectedId'>): Layer | null {
  if (!s.selectedId) return null;
  return slideOf(s).layers.find((l) => l.id === s.selectedId) ?? null;
}

const isFinish = (l: Layer) => { const k = kind(l.kind); return !k.content && k.category !== 'generate'; };

function refitText(l: Layer) {
  if (l.kind === 'text' && l.box) l.box.h = measureTextHeight(l.params, l.box.w);
}

const initial = demoDeck();
let toastTimer = 0;

export const useStore = create<State>((set, get) => ({
  deck: initial,
  slideId: initial.slides[0].id,
  selectedId: null,
  leftTab: 'layers',
  inspectorTab: 'design',
  zoom: 'fit',
  fitZoom: 0.5,
  past: [],
  future: [],
  lastMerge: null,
  saveState: 'saved',
  presenting: false,
  playToken: 0,
  editingTextId: null,
  galleryOpen: false,
  clipboard: null,
  toast: null,

  set: (p) => set(p),

  mutate: (recipe, merge) => {
    const { deck, past, lastMerge } = get();
    const next = produce(deck, recipe);
    if (next === deck) return;
    const now = performance.now();
    const coalesce = merge && lastMerge && lastMerge.key === merge && now - lastMerge.t < 1200;
    set({
      deck: next,
      past: coalesce ? past : [...past.slice(-HISTORY + 1), deck],
      future: [],
      lastMerge: merge ? { key: merge, t: now } : null,
      saveState: 'unsaved',
    });
  },

  undo: () => {
    const { past, deck, future, slideId } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    set({
      deck: prev, past: past.slice(0, -1), future: [deck, ...future], lastMerge: null, saveState: 'unsaved',
      slideId: prev.slides.some((s) => s.id === slideId) ? slideId : prev.slides[0].id,
    });
  },

  redo: () => {
    const { past, deck, future, slideId } = get();
    if (!future.length) return;
    const nxt = future[0];
    set({
      deck: nxt, past: [...past, deck], future: future.slice(1), lastMerge: null, saveState: 'unsaved',
      slideId: nxt.slides.some((s) => s.id === slideId) ? slideId : nxt.slides[0].id,
    });
  },

  loadDeck: (d) => set({ deck: d, slideId: d.slides[0].id, selectedId: null, past: [], future: [], lastMerge: null, saveState: 'unsaved', editingTextId: null }),

  selectSlide: (id) => set({ slideId: id, selectedId: null, editingTextId: null }),

  selectLayer: (id) => set({ selectedId: id, editingTextId: get().editingTextId === id ? id : null }),

  addLayer: (kindId, init) => {
    const layer = { ...createLayer(kindId), ...(init ?? {}) };
    get().insertLayer(layer);
    return layer.id;
  },

  insertLayer: (layer) => {
    const { slideId, selectedId } = get();
    get().mutate((d) => {
      const s = d.slides.find((x) => x.id === slideId)!;
      const at = selectedId ? s.layers.findIndex((l) => l.id === selectedId) : -1;
      let idx = at >= 0 ? at + 1 : s.layers.length;
      // With nothing selected, new content slides in beneath the finishing effects stacked on top
      // (grain, ripple, vignette…) so the slide's look carries over to it.
      if (at < 0 && kind(layer.kind).content) {
        while (idx > 0 && isFinish(s.layers[idx - 1])) idx--;
      }
      s.layers.splice(idx, 0, layer);
    });
    set({ selectedId: layer.id, leftTab: 'layers' });
  },

  updateLayer: (id, recipe, merge) => {
    const { slideId } = get();
    get().mutate((d) => {
      const s = d.slides.find((x) => x.id === slideId)!;
      const l = s.layers.find((x) => x.id === id);
      if (!l) return;
      recipe(l);
      refitText(l);
    }, merge);
  },

  deleteLayer: (id) => {
    const { slideId } = get();
    get().mutate((d) => {
      const s = d.slides.find((x) => x.id === slideId)!;
      s.layers = s.layers.filter((l) => l.id !== id);
    });
    if (get().selectedId === id) set({ selectedId: null, editingTextId: null });
  },

  duplicateLayer: (id) => {
    const s = slideOf(get());
    const l = s.layers.find((x) => x.id === id);
    if (!l) return;
    const c = cloneLayer(l);
    c.name = `${l.name} copy`;
    if (c.box) { c.box.x += 30; c.box.y += 30; }
    set({ selectedId: id });
    get().insertLayer(c);
  },

  moveLayer: (id, toIndex) => {
    const { slideId } = get();
    get().mutate((d) => {
      const s = d.slides.find((x) => x.id === slideId)!;
      const from = s.layers.findIndex((l) => l.id === id);
      if (from < 0) return;
      const [l] = s.layers.splice(from, 1);
      s.layers.splice(Math.max(0, Math.min(s.layers.length, toIndex)), 0, l);
    });
  },

  addSlide: (slide) => {
    const { slideId } = get();
    const ns = slide ?? blankSlide();
    get().mutate((d) => {
      const i = d.slides.findIndex((s) => s.id === slideId);
      d.slides.splice(i + 1, 0, ns);
    });
    set({ slideId: ns.id, selectedId: null });
  },

  duplicateSlide: (id) => {
    const s = get().deck.slides.find((x) => x.id === id);
    if (!s) return;
    const c = cloneSlide(s);
    c.name = `${s.name} copy`;
    set({ slideId: id });
    get().addSlide(c);
  },

  deleteSlide: (id) => {
    const { deck } = get();
    if (deck.slides.length <= 1) return get().showToast('A deck needs at least one slide');
    const i = deck.slides.findIndex((s) => s.id === id);
    get().mutate((d) => { d.slides = d.slides.filter((s) => s.id !== id); });
    const slides = get().deck.slides;
    if (get().slideId === id) set({ slideId: slides[Math.max(0, i - 1)].id, selectedId: null });
  },

  moveSlide: (id, toIndex) => {
    get().mutate((d) => {
      const from = d.slides.findIndex((s) => s.id === id);
      const [s] = d.slides.splice(from, 1);
      d.slides.splice(Math.max(0, Math.min(d.slides.length, toIndex)), 0, s);
    });
  },

  updateSlide: (recipe, merge) => {
    const { slideId } = get();
    get().mutate((d) => { recipe(d.slides.find((s) => s.id === slideId)!); }, merge);
  },

  showToast: (msg) => {
    set({ toast: msg });
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => set({ toast: null }), 2600);
  },
}));

/** Re-measure every text box once web fonts have arrived (without touching undo history). */
export function refitAllText() {
  const st = useStore.getState();
  const next = produce(st.deck, (d) => {
    for (const s of d.slides) for (const l of s.layers) {
      if (l.kind !== 'text' || !l.box) continue;
      const h = measureTextHeight(l.params, l.box.w);
      if (Math.abs(h - l.box.h) > 0.5) l.box.h = h;
    }
  });
  if (next !== st.deck) useStore.setState({ deck: next });
}

export const isContent = (l: Layer | null) => !!l && !!kind(l.kind).content;

// Dev-only handle for debugging in the console.
if (import.meta.env.DEV) (window as unknown as { __sf: typeof useStore }).__sf = useStore;
