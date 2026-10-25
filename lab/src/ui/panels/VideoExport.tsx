import { Clapperboard, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { aspectOf } from '../../core';
import { canExportVideo, exportVideo, videoLength, VIDEO_FPS } from '../../export';
import { slideOf, useStore } from '../../store';

// Export → Video: the deck, or the slide on the canvas, played as the show plays it and saved as an
// .mp4. Builds are clicked for it, each step held for the timeline's Hold. Made in this browser.

const SIZES = [1080, 720] as const;
const mins = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${s.toFixed(1)} s`);

export function VideoExport() {
  const scope = useStore((s) => s.videoOpen);
  const deck = useStore((s) => s.deck);
  const slide = useStore(slideOf);
  const hold = useStore((s) => s.hold);
  const { set, showToast } = useStore.getState();
  const [which, setWhich] = useState<'deck' | 'slide'>(scope ?? 'deck');
  const [height, setHeight] = useState<number>(1080);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  if (!scope) return null;

  const shown = deck.slides.filter((s) => !s.hidden);
  const slides = which === 'deck' ? shown : [slide];
  const secs = videoLength({ slides, hold });
  const width = (h: number) => Math.round((h * deck.width) / deck.height / 2) * 2;
  const busy = progress !== null;
  const close = () => { abort.current?.abort(); set({ videoOpen: null }); };

  const run = async () => {
    setError('');
    setProgress(0);
    const ac = new AbortController();
    abort.current = ac;
    try {
      await exportVideo(deck, {
        slides, height, hold, signal: ac.signal,
        name: which === 'slide' ? `${deck.title} ${slide.name || 'slide'}` : deck.title,
        onProgress: (d, t) => setProgress(d / t),
      });
      set({ videoOpen: null });
      showToast(`Exported a ${mins(secs)} video`);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      abort.current = null;
      setProgress(null);
    }
  };

  return (
    <div className="modal-bg" onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) close(); }}>
      <div className="modal video-export" role="dialog" aria-label="Export video" onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape' && !busy) close(); }}>
        <div className="modal-head">
          <div><h2>Export video</h2><p>Plays the lesson as the show does, its builds clicked for it, and saves an .mp4. Made in this browser: nothing is uploaded.</p></div>
          <button className="tb-btn icon" aria-label="Close" onClick={close}><X size={16} /></button>
        </div>
        <div className="ve-body">
          <div className="ve-row"><span>What</span>
            <div className="ve-seg">
              <button className={which === 'deck' ? 'on' : ''} disabled={busy} onClick={() => setWhich('deck')}>The deck<small>{shown.length} slide{shown.length === 1 ? '' : 's'}</small></button>
              <button className={which === 'slide' ? 'on' : ''} disabled={busy} onClick={() => setWhich('slide')}>This slide<small>{slide.name || 'Untitled'}</small></button>
            </div>
          </div>
          <div className="ve-row"><span>Size</span>
            <div className="ve-seg">
              {SIZES.map((h) => <button key={h} className={height === h ? 'on' : ''} disabled={busy} onClick={() => setHeight(h)}>{h}p<small>{width(h)} × {h}</small></button>)}
            </div>
          </div>
          <div className="ve-row"><span>Shape</span><p className="ve-note">{aspectOf(deck)}, the deck's own. Square and upright videos are not offered: typed layouts are laid out for the slide's shape, so they would be this picture with bands.</p></div>
          <label className="ve-row"><span>Hold</span>
            <span className="ve-hold"><input type="number" min={0.2} max={20} step={0.1} value={hold} disabled={busy} onChange={(e) => { const v = Number(e.target.value); if (v > 0) set({ hold: Math.min(20, v) }); }} /> seconds on each build step before the next click, and on each slide before it moves on</span>
          </label>
          <p className="ve-note">{mins(secs)} at {VIDEO_FPS} fps. Video clips on a slide are not played in it, and a room's live results are not in it.</p>
          {!canExportVideo() && <p className="ve-error">This browser cannot make video: it needs WebCodecs (current Chrome or Edge, Safari 17 or later).</p>}
          {error && <p className="ve-error">{error}</p>}
          {busy && <div className="ve-progress" role="progressbar" aria-valuenow={Math.round(progress! * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress! * 100}%` }} /><span>{Math.round(progress! * 100)}%</span></div>}
        </div>
        <div className="ve-foot">
          {busy ? <button className="btn-outline" onClick={() => abort.current?.abort()}>Cancel</button> : <button className="btn-outline" onClick={close}>Close</button>}
          <button className="btn-accent" disabled={busy || !canExportVideo()} onClick={run}><Clapperboard size={14} />{busy ? 'Making the video…' : 'Export .mp4'}</button>
        </div>
      </div>
    </div>
  );
}
