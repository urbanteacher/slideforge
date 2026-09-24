import { ChevronRight, Copy, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { renderStill } from '../export/exporters';
import { getAssetVersion } from '../engine/raster';
import { useStore } from '../model/store';
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
  const slides = useStore((s) => s.deck.slides);
  const slideId = useStore((s) => s.slideId);
  const { selectSlide, addSlide, duplicateSlide, deleteSlide, moveSlide } = useStore.getState();
  const thumb = useSlideThumbs(slides);
  const [drag, setDrag] = useState<{ id: string; over: string | null } | null>(null);
  const selRef = useRef<HTMLDivElement>(null);
  useEffect(() => { selRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }, [slideId]);

  return (
    <div className="filmstrip">
      {slides.map((s, i) => (
        <div
          key={s.id}
          ref={s.id === slideId ? selRef : undefined}
          className={`thumb${s.id === slideId ? ' sel' : ''}${drag?.over === s.id ? ' drop' : ''}`}
          draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDrag({ id: s.id, over: null }); }}
          onDragOver={(e) => { if (drag) { e.preventDefault(); if (drag.over !== s.id) setDrag({ ...drag, over: s.id }); } }}
          onDragEnd={() => setDrag(null)}
          onDrop={(e) => { e.preventDefault(); if (drag && drag.id !== s.id) moveSlide(drag.id, i); setDrag(null); }}
          onPointerDown={(e) => { if (e.button === 0 && !(e.target as HTMLElement).closest('.thumb-acts')) selectSlide(s.id); }}
        >
          {i > 0 && s.transition.type !== 'none' && <div className="thumb-trans" title={`Transition: ${s.transition.type}`}><ChevronRight size={12} /></div>}
          <div className="thumb-img">{thumb(s.id) && <img src={thumb(s.id)} alt="" draggable={false} />}</div>
          <div className="thumb-meta"><b>{i + 1}</b><span>{s.name}</span></div>
          <div className="thumb-acts" onClick={(e) => e.stopPropagation()}>
            <button title="Duplicate slide" onClick={() => duplicateSlide(s.id)}><Copy size={12} /></button>
            <button title="Delete slide" onClick={() => deleteSlide(s.id)}><Trash2 size={12} /></button>
          </div>
        </div>
      ))}
      <button className="add-slide" title="New slide" onClick={() => addSlide()}><Plus size={18} /></button>
    </div>
  );
}
