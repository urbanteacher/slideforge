// The show bar's extras (lab-engine-plan M11a), each small: the screen blanked to black or white, the slide
// overview grid, the typed jump to a slide, the elapsed clock, and the card for notes on another device.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Slide } from '../core';
import type { Screen } from '../presenter';
import { clock } from '../presenter';
import { gridColumns } from './desk';
import type { PrompterLink } from './prompter';
import { qrSvg } from './qr';

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

/** Every slide as a tile (its number and name). The show's key handler moves `at` (gridMove); a click or Enter goes there. */
export function Overview({ slides, current, at, onGo, onClose }: { slides: Slide[]; current: number; at: number; onGo: (i: number) => void; onClose: () => void }) {
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const cols = useMemo(() => gridColumns(slides.length), [slides.length]);
  useEffect(() => { tiles.current[at]?.focus(); }, [at]);
  return (
    <div className="show-overview" role="dialog" aria-label="Slide overview" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="show-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {slides.map((s, i) => (
          <button key={s.id} ref={(el) => { tiles.current[i] = el; }} className={i === current ? 'now' : undefined} onClick={() => onGo(i)} aria-label={`Slide ${i + 1}: ${s.name}`}>
            <b>{i + 1}</b><span>{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Notes on another device: the link and QR to open on a phone or a prompt screen, how many are following, and stop. */
export function NotesCard({ link, onStop, onClose, onCopy }: { link: PrompterLink | null; onStop: () => void; onClose: () => void; onCopy: (url: string) => void }) {
  const url = link?.ready ? link.url : '';
  const svg = useMemo(() => { try { return url ? qrSvg(url, { quiet: 2, title: 'Notes link' }) : ''; } catch { return ''; } }, [url]);
  return (
    <aside className="show-card" role="dialog" aria-label="Notes on another device">
      <div className="card-head"><b>Notes on another device</b><button onClick={onClose} aria-label="Close">×</button></div>
      {!link || link.closed ? <p>Notes on another device are off.</p> : !url ? <p>Connecting…</p> : (
        <>
          <div className="card-qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <p>Scan it on your phone, or open the link on the prompt screen. Your notes follow every move, and the phone can press Next and Back.</p>
          <input readOnly value={url} aria-label="Notes link" onFocus={(e) => e.currentTarget.select()} />
          <div className="card-row"><button onClick={() => onCopy(url)}>Copy link</button><button className="stop" onClick={onStop}>Stop sharing notes</button></div>
          <p className="card-count">{link.watchers ? `${link.watchers} ${link.watchers === 1 ? 'screen' : 'screens'} following` : 'Nothing following yet'}</p>
          <p className="card-private">Private: only this link shows your notes. Nobody in the room sees it, and it stops when the show ends.</p>
        </>
      )}
    </aside>
  );
}
