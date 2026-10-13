// The show bar's extras (lab-engine-plan M11a), each small: the screen blanked to black or white, the slide
// overview grid, the typed jump to a slide, the elapsed clock, and the card for notes on another device.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Deck, Slide } from '../core';
import { renderStill } from '../export';
import { slideBadge } from './badge';
import type { Screen } from '../presenter';
import { clock } from '../presenter';
import { gridColumns } from './desk';
import { SIZES } from '../rehearse';

/** The screen blanked: black or white over the slide (and the wall). Any click, or the same key, brings it back. */
export function ScreenCover({ screen, onResume }: { screen: Screen; onResume: () => void }) {
  if (screen === 'none') return null;
  return <div className={`show-cover ${screen}`} role="button" aria-label="Screen blanked. Click to resume" onClick={onResume} />;
}

/** The elapsed time since the show began. */
export function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return <span className="show-elapsed" title="Time since the show began" aria-label={`Elapsed ${clock((now - since) / 1000)}`}>{clock((now - since) / 1000)}</span>;
}

/** The overview's pictures, drawn by the real engine at 240 px and kept per slide (a slide edited since is drawn again). */
const stills = new Map<string, { ref: Slide; url: string }>();
const stillOf = (s: Slide) => { const c = stills.get(s.id); return c && c.ref === s ? c.url : undefined; };

/** Draws the overview's pictures one a frame, the tiles on screen first, so the show never waits for them. */
function useStills(slides: Slide[], deck: Deck, tiles: { current: (HTMLButtonElement | null)[] }) {
  const [, force] = useState(0);
  useEffect(() => {
    const seen = new Set<number>();
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => {
      for (const e of es) { const i = Number((e.target as HTMLElement).dataset.i); if (e.isIntersecting) seen.add(i); else seen.delete(i); }
    }) : null;
    tiles.current.forEach((el) => { if (el) io?.observe(el); });
    let raf = 0, stop = false;
    const step = () => {
      if (stop) return;
      const todo = slides.map((s, i) => ({ s, i })).filter(({ s }) => stillOf(s) === undefined);
      if (!todo.length) return;
      const { s } = todo.find(({ i }) => seen.has(i)) ?? todo[0];
      try { stills.set(s.id, { ref: s, url: renderStill(s, deck, 240, 'image/jpeg', 2, 0.8) }); } catch (e) { console.warn(e); stills.set(s.id, { ref: s, url: '' }); }
      force((n) => n + 1);
      raf = requestAnimationFrame(step);
    };
    // A beat first, so the observer has said which tiles are on screen and the grid is up before any drawing.
    const t = setTimeout(() => { raf = requestAnimationFrame(step); }, 60);
    return () => { stop = true; clearTimeout(t); cancelAnimationFrame(raf); io?.disconnect(); };
  }, [slides, deck, tiles]);
}

/** Every slide as a tile: its picture, its number and name, and a badge on a game, question or feedback slide. The show's
 *  key handler moves `at` (gridMove); a click or Enter goes there. */
export function Overview({ slides, deck, current, at, onGo, onClose }: { slides: Slide[]; deck: Deck; current: number; at: number; onGo: (i: number) => void; onClose: () => void }) {
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const cols = useMemo(() => gridColumns(slides.length), [slides.length]);
  useEffect(() => { tiles.current[at]?.focus(); }, [at]);
  useStills(slides, deck, tiles);
  return (
    <div className="show-overview" role="dialog" aria-label="Slide overview" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="show-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {slides.map((s, i) => {
          const badge = slideBadge(s), url = stillOf(s);
          return (
            <button key={s.id} data-i={i} ref={(el) => { tiles.current[i] = el; }} className={i === current ? 'now' : undefined} onClick={() => onGo(i)} aria-label={`Slide ${i + 1}: ${s.name}${badge ? ` (${badge.label})` : ''}`}>
              <div className="ov-pic" style={{ aspectRatio: `${deck.width} / ${deck.height}` }}>
                {url ? <img src={url} alt="" /> : null}
                {badge && <em className={`ov-badge ${badge.kind}`}>{badge.label}</em>}
              </div>
              <b>{i + 1}</b><span>{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Rehearse: run the lesson against a simulated class that joins the real room, so the wall fills as a class would. */
export function RehearseCard({ size, inRoom, onPick, onStop, onClose }: { size: number; inRoom: boolean; onPick: (n: number) => void; onStop: () => void; onClose: () => void }) {
  return (
    <aside className="show-card" role="dialog" aria-label="Rehearse" data-testid="rehearse-card">
      <div className="card-head"><b>Rehearse with a simulated class</b><button onClick={onClose} aria-label="Close">×</button></div>
      <p>Sample learners join the room by its PIN and answer as a class would: most right, some wrong, some slow. {inRoom ? 'Press Start when they are in.' : 'This opens the lesson as a live room.'}</p>
      <div className="card-row">
        {SIZES.map((n) => <button key={n} onClick={() => onPick(n)} aria-pressed={size === n} data-testid={`rehearse-${n}`}>{n}</button>)}
        {size > 0 && <button className="stop" onClick={onStop} data-testid="rehearse-stop">Send them home</button>}
      </div>
      <p className="card-private">They are marked as a simulation by their names only. Their answers are in the room's report, so end a rehearsal before teaching the real class.</p>
    </aside>
  );
}
