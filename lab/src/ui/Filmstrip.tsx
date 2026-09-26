import { ChevronRight, Copy, Plus, Trash2, Eye, EyeOff, LayoutGrid, LayoutTemplate, X } from 'lucide-react';
import { toggleHidden, useSlideContextMenu } from './SlideMenu';
import { FEEDBACK } from './Engagement';
import { useEffect, useRef, useState } from 'react';
import { renderStill } from '../export/exporters';
import { getAssetVersion } from '../engine/raster';
import { inView, useStore } from '../model/store';
import type { Slide } from '../model/types';

/** Slide thumbnails are rendered by the real engine, lazily, only when a slide (or its assets) change. */
const thumbCache = new Map<string, { ref: Slide; url: string; asset: number }>();

function useSlideThumbs(slides: Slide[]) {
  const [, force] = useState(0);
  const [asset, setAsset] = useState(getAssetVersion());
  const deck = useStore((s) => s.deck);
  useEffect(() => {
    const iv = setInterval(() => { if (getAssetVersion() !== asset) setAsset(getAssetVersion()); }, 1200);
    return () => clearInterval(iv);
  }, [asset]);
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const step = () => {
      if (cancelled) return;
      const s = slides.find((x) => { const c = thumbCache.get(x.id); return !c || c.ref !== x || c.asset !== asset; });
      if (!s) return;
      try { thumbCache.set(s.id, { ref: s, url: renderStill(s, deck, 288, 'image/jpeg'), asset }); } catch (e) { console.warn(e); thumbCache.set(s.id, { ref: s, url: '', asset }); }
      force((n) => n + 1);
      raf = requestAnimationFrame(step);
    };
    const t = setTimeout(step, 200);
    return () => { cancelled = true; clearTimeout(t); cancelAnimationFrame(raf); };
  }, [slides, asset]);
  return (id: string) => thumbCache.get(id)?.url;
}

export function Filmstrip() {
  const all = useStore((s) => s.deck.slides);
  const view = useStore((s) => s.view);
  // The Quiz studio and Activities show the lesson's games or activities, each at its place in the lesson.
  const slides = view === 'lesson' ? all : all.filter((s) => inView(s, view));
  const slideId = useStore((s) => s.slideId);
  const { selectSlide, addSlide, duplicateSlide, deleteSlide, moveSlide } = useStore.getState();
  const thumb = useSlideThumbs(slides);
  const [drag, setDrag] = useState<{ id: string; over: string | null } | null>(null);
  const [menu, openMenu] = useSlideContextMenu();
  const selRef = useRef<HTMLDivElement>(null);
  useEffect(() => { selRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }, [slideId]);
  const sorter = useStore((s) => s.sorterOpen);
  const setSorter = (v: boolean | ((was: boolean) => boolean)) => useStore.setState((s) => ({ sorterOpen: typeof v === 'function' ? v(s.sorterOpen) : v }));
  // ⌘G, as in SlideForge: the whole deck at once.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g' && !useStore.getState().presenting) { e.preventDefault(); setSorter((v) => !v); }
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);
  const index = Math.max(0, slides.findIndex((s) => s.id === slideId));

  return (
    <div className="filmstrip">
      {/* SlideForge's rail head: where you are, a number you can type to go anywhere, and Block view. */}
      <div className="strip-head">
        <span className="strip-label">Slides</span>
        <label className="strip-go" title="Type a slide number and press Enter to go there">
          <input type="number" min={1} max={slides.length} key={`${slideId}-${slides.length}`} defaultValue={index + 1} aria-label="Go to slide"
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key !== 'Enter') return;
              const n = Math.round(Number((e.target as HTMLInputElement).value));
              if (n >= 1 && n <= slides.length) selectSlide(slides[n - 1].id); else (e.target as HTMLInputElement).value = String(index + 1);
              (e.target as HTMLInputElement).blur();
            }}
            onBlur={(e) => { e.target.value = String(index + 1); }} />
          <span aria-hidden="true">/</span><span>{slides.length}</span>
        </label>
        {/* Under the count, the two ways to see many slides at once: the Gallery of starting slides, and Block view. */}
        <div className="strip-tools">
          <button className="strip-sorter" title="Gallery — starting slides and layouts" aria-label="Gallery" onClick={() => useStore.setState({ galleryOpen: true })}><LayoutTemplate size={15} /></button>
          <button className="strip-sorter" title="Block view — the whole deck at once, to rearrange it (⌘G)" aria-label="Block view of all slides" onClick={() => setSorter(true)}><LayoutGrid size={15} /></button>
        </div>
      </div>
      {sorter && <SlideSorter close={() => setSorter(false)} thumb={thumb} />}
      {slides.map((s) => { const i = all.indexOf(s); return (
        <div
          key={s.id}
          ref={s.id === slideId ? selRef : undefined}
          className={`thumb${s.id === slideId ? ' sel' : ''}${drag?.over === s.id ? ' drop' : ''}${s.hidden ? ' hidden-slide' : ''}`}
          onContextMenu={(e) => { selectSlide(s.id); openMenu(e, s.id); }}
          draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDrag({ id: s.id, over: null }); }}
          onDragOver={(e) => { if (drag) { e.preventDefault(); if (drag.over !== s.id) setDrag({ ...drag, over: s.id }); } }}
          onDragEnd={() => setDrag(null)}
          onDrop={(e) => { e.preventDefault(); if (drag && drag.id !== s.id) moveSlide(drag.id, i); setDrag(null); }}
          onPointerDown={(e) => { if (e.button === 0 && !(e.target as HTMLElement).closest('.thumb-acts')) selectSlide(s.id); }}
        >
          {i > 0 && s.transition.type !== 'none' && <div className="thumb-trans" title={`Transition: ${s.transition.type}`}><ChevronRight size={12} /></div>}
          <div className="thumb-img">{thumb(s.id) && <img src={thumb(s.id)} alt="" draggable={false} />}{s.hidden && <span className="thumb-hidden" title="Hidden from the presentation"><EyeOff size={12} />Hidden</span>}{s.feedback && <span className="thumb-feedback" title={`Audience feedback: ${FEEDBACK.find((f) => f.value === s.feedback!.kind)?.label}`}>{FEEDBACK.find((f) => f.value === s.feedback!.kind)?.icon}</span>}</div>
          <div className="thumb-meta"><b>{i + 1}</b><span>{s.name}</span></div>
          <div className="thumb-acts" onClick={(e) => e.stopPropagation()}>
            <button title={s.hidden ? 'Show in the presentation' : 'Hide from the presentation'} aria-pressed={!!s.hidden} onClick={() => toggleHidden(s.id)}>{s.hidden ? <Eye size={12} /> : <EyeOff size={12} />}</button>
            <button title="Duplicate slide" onClick={() => duplicateSlide(s.id)}><Copy size={12} /></button>
            <button title="Delete slide" onClick={() => deleteSlide(s.id)}><Trash2 size={12} /></button>
          </div>
        </div>
      ); })}
      {view === 'lesson'
        ? <button className="add-slide" title="New slide" onClick={() => addSlide()}><Plus size={18} /></button>
        : <button className="add-slide" title={view === 'quiz' ? 'A game, after the slide on screen' : 'An activity, after the slide on screen'} onClick={() => useStore.getState().set({ addOpen: true, inspectorTab: 'engage' })}><Plus size={18} /></button>}
      {menu}
    </div>
  );
}

/** Block view: every slide at once, big enough to read, to rearrange the deck. Drag a slide to a new
 *  place; click one to go to it; right-click for its menu; Esc or ⌘G to close. */
function SlideSorter({ close, thumb }: { close: () => void; thumb: (id: string) => string | undefined }) {
  const slides = useStore((s) => s.deck.slides);
  const ratio = useStore((s) => `${s.deck.width} / ${s.deck.height}`);
  const slideId = useStore((s) => s.slideId);
  const { selectSlide, moveSlide } = useStore.getState();
  const [drag, setDrag] = useState<{ id: string; over: string | null } | null>(null);
  const [menu, openMenu] = useSlideContextMenu();
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    addEventListener('keydown', on, true);
    return () => removeEventListener('keydown', on, true);
  }, [close]);
  return (
    <div className="sorter" role="dialog" aria-label="All slides">
      <div className="sorter-head">
        <b>All slides</b><span>{slides.length} slides · drag to rearrange, click to open · Esc to close</span>
        <button className="tb-btn icon" title="Close (Esc)" onClick={close}><X size={16} /></button>
      </div>
      <div className="sorter-grid">
        {slides.map((s, i) => (
          <div key={s.id}
            className={`sorter-card${s.id === slideId ? ' sel' : ''}${drag?.over === s.id ? ' drop' : ''}${s.hidden ? ' hidden-slide' : ''}`}
            draggable
            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDrag({ id: s.id, over: null }); }}
            onDragOver={(e) => { if (drag) { e.preventDefault(); if (drag.over !== s.id) setDrag({ ...drag, over: s.id }); } }}
            onDragEnd={() => setDrag(null)}
            onDrop={(e) => { e.preventDefault(); if (drag && drag.id !== s.id) moveSlide(drag.id, i); setDrag(null); }}
            onClick={() => { selectSlide(s.id); close(); }}
            onContextMenu={(e) => { selectSlide(s.id); openMenu(e, s.id); }}>
            <div className="thumb-img" style={{ aspectRatio: ratio }}>{thumb(s.id) && <img src={thumb(s.id)} alt="" draggable={false} />}{s.hidden && <span className="thumb-hidden"><EyeOff size={12} />Hidden</span>}</div>
            <div className="thumb-meta"><b>{i + 1}</b><span>{s.name}</span></div>
          </div>
        ))}
      </div>
      {menu}
    </div>
  );
}
