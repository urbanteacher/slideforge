import { Clapperboard, Pause, Play, SkipBack, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { slideTimeline, type SlideTimeline } from '../../engine';
import type { Deck, Slide } from '../../core';
import { slideOf, useStore } from '../../store';
import './timeline.css';

// The timeline under the canvas, as Remotion Studio's: the slide's clock from its arrival to a hold
// after its last build, a bar for each layer's entrance, build steps, loop and exit (read from its
// Animate settings), a marker at each click, and a playhead to drag to any frame. The canvas draws the
// moment under the playhead (Stage reads `scrub`). It shows timing; it does not edit it — the Animate
// panel does, and the bars follow.

export const TIMELINE_FPS = 30;
const snap = (t: number) => Math.round(t * TIMELINE_FPS) / TIMELINE_FPS;

const cache = new WeakMap<Slide, { hold: number; tl: SlideTimeline }>();
export function timelineOf(slide: Slide, hold: number): SlideTimeline {
  const hit = cache.get(slide);
  if (hit && hit.hold === hold) return hit.tl;
  const tl = slideTimeline(slide, hold);
  cache.set(slide, { hold, tl });
  return tl;
}

/** The slide shown before this one (hidden slides are skipped, as in the show): its transition in comes from it. */
export function shownBefore(deck: Deck, slide: Slide): Slide | null {
  const shown = deck.slides.filter((s) => !s.hidden || s.id === slide.id);
  const i = shown.findIndex((s) => s.id === slide.id);
  return i > 0 ? shown[i - 1] : null;
}

/** What the canvas draws for the playhead: the slide's clock, its clicks, and its transition in. */
export function scrubFrame(deck: Deck, slide: Slide, scrub: number, hold: number) {
  const tl = timelineOf(slide, hold);
  const from = shownBefore(deck, slide), tr = slide.transition;
  const p = from && tr.type !== 'none' && tr.duration > 0 && scrub < tr.duration ? scrub / tr.duration : null;
  return { t: scrub, clicks: tl.clicks, from: p === null ? null : from, p };
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${String(Math.round((t % 1) * TIMELINE_FPS) % TIMELINE_FPS).padStart(2, '0')}`;

export function Timeline() {
  const open = useStore((s) => s.timelineOpen);
  const deck = useStore((s) => s.deck);
  const slide = useStore(slideOf);
  const scrub = useStore((s) => s.scrub);
  const hold = useStore((s) => s.hold);
  const selectedId = useStore((s) => s.selectedId);
  const { set, selectLayer } = useStore.getState();
  const [playing, setPlaying] = useState(false);
  const [width, setWidth] = useState(600);
  const lane = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = lane.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 600));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const tl = timelineOf(slide, hold);
  const len = tl.length;
  const from = shownBefore(deck, slide);
  const lead = from && slide.transition.type !== 'none' ? slide.transition.duration : 0;

  // Play from the playhead (from the start when it is at the end), a frame at a time on the wall clock.
  useEffect(() => {
    if (!playing) return;
    const st = useStore.getState();
    const at = st.scrub === null || st.scrub >= len - 1e-3 ? 0 : st.scrub;
    const t0 = performance.now() - at * 1000;
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= len) { set({ scrub: snap(len) }); setPlaying(false); return; }
      set({ scrub: Math.floor(t * TIMELINE_FPS) / TIMELINE_FPS });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [playing, len]);
  useEffect(() => setPlaying(false), [slide.id]);

  if (!open) return null;
  const x = (t: number) => (Math.max(0, Math.min(len, t)) / len) * width;
  const head = scrub ?? len;
  const frames = Math.round(len * TIMELINE_FPS);
  const step = len <= 12 ? 1 : len <= 30 ? 2 : len <= 75 ? 5 : 10;
  const ticks = Array.from({ length: Math.floor(len / step) + 1 }, (_, i) => i * step);

  const toTime = (clientX: number) => {
    const r = lane.current!.getBoundingClientRect();
    return snap(Math.max(0, Math.min(len, ((clientX - r.left) / r.width) * len)));
  };
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setPlaying(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    set({ scrub: toTime(e.clientX) });
  };
  const onMove = (e: React.PointerEvent) => { if (e.buttons & 1) set({ scrub: toTime(e.clientX) }); };
  const onKey = (e: React.KeyboardEvent) => {
    const f = 1 / TIMELINE_FPS, k = e.shiftKey ? 1 : f;
    const go = (t: number) => { e.preventDefault(); e.stopPropagation(); setPlaying(false); set({ scrub: snap(Math.max(0, Math.min(len, t))) }); };
    if (e.key === 'ArrowLeft') go(head - k);
    else if (e.key === 'ArrowRight') go(head + k);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(len);
    else if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); setPlaying((p) => !p); }
  };
  const close = () => {
    setPlaying(false);
    set({ timelineOpen: false, scrub: null });
    try { localStorage.setItem('sf-lab-timeline', 'closed'); } catch { /* storage off: it still closes */ }
  };

  return (
    <section className="timeline" aria-label="Slide timeline" tabIndex={0} onKeyDown={onKey}>
      <div className="tl-head">
        <button className="tb-btn icon" title={playing ? 'Pause (space)' : 'Play from the playhead (space)'} aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
        <button className="tb-btn icon" title="To the start (Home)" aria-label="To the start" onClick={() => { setPlaying(false); set({ scrub: 0 }); }}><SkipBack size={14} /></button>
        <span className="tl-time" aria-live="off"><b>{fmt(head)}</b> / {fmt(len)}<small>frame {Math.round(head * TIMELINE_FPS)} of {frames} · {TIMELINE_FPS} fps</small></span>
        <button className={`tb-btn tl-built${scrub === null ? ' active' : ''}`} title="Show the slide built, as it is edited" onClick={() => { setPlaying(false); set({ scrub: null }); }}>Built</button>
        <div className="spacer" />
        <label className="tl-hold" title="How long each build step is held before the next click, here and in the video">Hold
          <input type="number" min={0.2} max={20} step={0.1} value={hold} onChange={(e) => { const v = Number(e.target.value); if (v > 0) set({ hold: Math.min(20, v) }); }} onKeyDown={(e) => e.stopPropagation()} />s
        </label>
        <button className="tb-btn" title="Export this slide as a video (.mp4)" onClick={() => set({ videoOpen: 'slide' })}><Clapperboard size={14} />Video</button>
        <button className="tb-btn icon" title="Close the timeline" aria-label="Close the timeline" onClick={close}><X size={14} /></button>
      </div>
      <div className="tl-body">
        <div className="tl-names">
          <div className="tl-name tl-ruler-name">{tl.clicks.length ? `${tl.clicks.length} click${tl.clicks.length > 1 ? 's' : ''}` : 'No clicks'}</div>
          {tl.tracks.map((tr) => (
            <button key={tr.id} className={`tl-name${tr.id === selectedId ? ' on' : ''}`} title={tr.step ? `Arrives on click ${tr.step}` : 'Arrives with the slide'} onClick={() => selectLayer(tr.id)}>
              {tr.step > 0 && <i className="tl-step">{tr.step}</i>}{tr.name || tr.kind}
            </button>
          ))}
          {!tl.tracks.length && <div className="tl-name tl-empty">Nothing on this slide moves. Animate a layer in the Animate panel.</div>}
        </div>
        <div className="tl-lane" ref={lane} onPointerDown={onDown} onPointerMove={onMove}>
          <div className="tl-ruler">
            {lead > 0 && <span className="tl-trans" style={{ left: 0, width: x(lead) }} title={`Transition in: ${slide.transition.type}`}>{x(lead) > 60 ? 'transition' : ''}</span>}
            {ticks.map((t) => <span key={t} className="tl-tick" style={{ left: x(t) }}>{t}s</span>)}
            {tl.clicks.map((c, i) => <span key={i} className="tl-click" style={{ left: x(c) }} title={`Click ${i + 1} at ${fmt(c)}`}>{i + 1}</span>)}
          </div>
          {tl.tracks.map((tr) => (
            <div key={tr.id} className={`tl-row${tr.id === selectedId ? ' on' : ''}`}>
              {tr.loop && <span className="tl-bar loop" style={{ left: x(tr.loop[0]), width: Math.max(2, x(tr.loop[1]) - x(tr.loop[0])) }} title="Loop" />}
              {tr.in.map((s, i) => <span key={i} className={`tl-bar ${i ? 'build' : 'in'}`} style={{ left: x(s[0]), width: Math.max(3, x(s[1]) - x(s[0])) }} title={i ? `Build step ${i + 1}` : 'Entrance'} />)}
              {tr.out && <span className="tl-bar out" style={{ left: x(tr.out[0]), width: Math.max(3, x(tr.out[1]) - x(tr.out[0])) }} title="Exit" />}
            </div>
          ))}
          {tl.clicks.map((c, i) => <span key={i} className="tl-click-line" style={{ left: x(c) }} />)}
          <span className={`tl-head-line${scrub === null ? ' built' : ''}`} style={{ left: x(head) }} />
        </div>
      </div>
    </section>
  );
}
