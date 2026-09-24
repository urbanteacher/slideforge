import { ChevronLeft, ChevronRight, Maximize, StickyNote, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DeckPlayer } from '../engine/player';
import { useStore } from '../model/store';
import { videoEmbed } from '../model/video';

export function Present() {
  // The show is the deck without its hidden slides; starting on a hidden one starts at the next shown.
  const full = useStore((s) => s.deck);
  const deck = useMemo(() => ({ ...full, slides: full.slides.filter((x) => !x.hidden) }), [full]);
  const startIndex = useStore((s) => {
    const at = s.deck.slides.findIndex((x) => x.id === s.slideId);
    const next = s.deck.slides.slice(Math.max(0, at)).find((x) => !x.hidden) ?? s.deck.slides.find((x) => !x.hidden);
    return Math.max(0, s.deck.slides.filter((x) => !x.hidden).findIndex((x) => x.id === next?.id));
  });
  const set = useStore((s) => s.set);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const player = useRef<DeckPlayer | null>(null);
  const [state, setState] = useState({ index: startIndex, step: 0, steps: 0 });
  const [notes, setNotes] = useState(false);
  const [idle, setIdle] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const fit = () => {
      const k = Math.min(innerWidth / deck.width, innerHeight / deck.height);
      setSize({ w: Math.floor(deck.width * k), h: Math.floor(deck.height * k) });
    };
    fit();
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, [deck.width, deck.height]);

  useEffect(() => {
    const p = new DeckPlayer(canvasRef.current!, deck, { start: startIndex, onChange: (index, step, steps) => setState({ index, step, steps }) });
    player.current = p;
    if (import.meta.env.DEV) (window as unknown as { __player?: DeckPlayer }).__player = p;
    return () => { p.destroy(); player.current = null; };
  }, []);

  useEffect(() => {
    const exit = () => { if (document.fullscreenElement) document.exitFullscreen(); set({ presenting: false, slideId: deck.slides[player.current?.index ?? 0].id, selectedId: null }); };
    const on = (e: KeyboardEvent) => {
      const p = player.current;
      if (!p) return;
      // The show has the keyboard: a key pressed here never reaches a control left focused in the
      // panels behind it (an arrow would change a dropdown there, Enter would press a button).
      e.stopPropagation();
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); p.next(); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); p.prev(); }
      else if (e.key === 'Escape') { if (!document.fullscreenElement) exit(); }
      else if (e.key === 'Home') p.goto(0, -1, true);
      else if (e.key === 'End') p.goto(deck.slides.length - 1, 1, true);
      else if (e.key === 'n' || e.key === 'N') setNotes((v) => !v);
      else if (e.key === 'f' || e.key === 'F') toggleFs();
    };
    const toggleFs = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
    (window as unknown as { __sfExit?: () => void }).__sfExit = exit;
    (document.activeElement as HTMLElement | null)?.blur?.();
    addEventListener('keydown', on, true);
    let t = 0;
    const move = () => { setIdle(false); clearTimeout(t); t = window.setTimeout(() => setIdle(true), 2200); };
    addEventListener('pointermove', move);
    move();
    return () => { removeEventListener('keydown', on, true); removeEventListener('pointermove', move); clearTimeout(t); };
  }, []);

  const slide = deck.slides[state.index];
  // A YouTube or Vimeo layer plays in the real player, framed where the layer sits on the slide.
  const embeds = slide.layers.filter((l) => l.kind === 'video' && l.visible && l.box && videoEmbed(l.params)).map((l) => ({ id: l.id, box: l.box!, src: videoEmbed(l.params), title: l.name }));
  const exit = () => (window as unknown as { __sfExit?: () => void }).__sfExit?.();

  return (
    <div className="present">
      <div className="present-stage" style={{ width: size.w, height: size.h }}>
        <canvas ref={canvasRef} style={{ width: size.w, height: size.h }} />
        {embeds.map((e) => (
          <iframe key={`${state.index}-${e.id}`} className="present-embed" src={e.src} title={e.title}
            style={{ left: `${(e.box.x / deck.width) * 100}%`, top: `${(e.box.y / deck.height) * 100}%`, width: `${(e.box.w / deck.width) * 100}%`, height: `${(e.box.h / deck.height) * 100}%` }}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ))}
      </div>
      <div className="present-progress" style={{ width: `${((state.index + 1) / deck.slides.length) * 100}%` }} />
      {notes && <div className="notes"><h4>Notes · slide {state.index + 1}</h4>{slide.notes || <span style={{ color: '#777' }}>No notes for this slide.</span>}</div>}
      <div className={`present-hud${idle ? ' idle' : ''}`}>
        <button title="Previous (←)" onClick={() => player.current?.prev()}><ChevronLeft size={16} /></button>
        <span className="present-count">{state.index + 1} / {deck.slides.length}</span>
        {state.steps > 0 && <span className="steps" title="Build steps on this slide">{Array.from({ length: state.steps }, (_, i) => <i key={i} className={i < state.step ? 'on' : ''} />)}</span>}
        <button title="Next (→ / click)" onClick={() => player.current?.next()}><ChevronRight size={16} /></button>
        <button title="Speaker notes (N)" onClick={() => setNotes((v) => !v)}><StickyNote size={15} /></button>
        <button title="Fullscreen (F)" onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }}><Maximize size={15} /></button>
        <button title="Exit (Esc)" onClick={exit}><X size={16} /></button>
      </div>
    </div>
  );
}
