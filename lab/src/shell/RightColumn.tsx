import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ariaKeys, tip } from '../keys';
import { layerOf, slideOf, useStore } from '../store';
import { Inspector } from '../ui';
import { showStatus, unseenFailures, useStatus, type Job } from './status';

// The right-hand column: the inspector, and beside it the Status tab (Remotion Studio's Composition / Jobs pair).
// The Status tab's badge counts failures not yet looked at.

export function RightColumn({ embedded }: { embedded: boolean }) {
  const side = useStatus((s) => s.side);
  const bad = useStatus(unseenFailures);
  // Looking at the list counts as having seen what's on it.
  useEffect(() => { if (side === 'status' && bad) useStatus.setState({ seenAt: Date.now() }); }, [side, bad]);
  return (
    <aside className="right">
      <div className="side-tabs" role="tablist" aria-label="Right panel">
        <button role="tab" aria-selected={side === 'inspect'} className={`side-tab${side === 'inspect' ? ' sel' : ''}`} onClick={() => useStatus.setState({ side: 'inspect' })}>Inspector</button>
        <button role="tab" aria-selected={side === 'status'} className={`side-tab${side === 'status' ? ' sel' : ''}`} onClick={showStatus}
          title={tip('Saves, exports, sync and errors', 'panel.status')} aria-keyshortcuts={ariaKeys('panel.status')}>
          Status{bad > 0 && <span className="side-badge" aria-label={`${bad} failed`}>{bad}</span>}
        </button>
      </div>
      {side === 'inspect' ? <Inspector banner={<Where embedded={embedded} />} /> : <StatusList embedded={embedded} />}
    </aside>
  );
}

/** What the inspector is showing, and where a change to it is kept. When a change can't be kept, it says why here. */
function Where({ embedded }: { embedded: boolean }) {
  const layer = useStore(layerOf);
  const slide = useStore(slideOf);
  const n = useStore((s) => s.deck.slides.indexOf(slideOf(s)) + 1);
  const total = useStore((s) => s.deck.slides.length);
  const saveFailed = useStatus((s) => s.jobs.find((j) => j.id === 'autosave' && j.state === 'failed'));
  const where = embedded ? 'saved with the lesson in this browser; SlideForge’s Library lists it' : 'saved with the deck in this browser';
  return (
    <div className="insp-where">
      <p>{layer ? <>This layer, on slide {n} of {total} · {where}.</> : <>Slide {n} of {total}: settings here change this slide only · {where}.</>}</p>
      {saveFailed && <p className="inline-warn" role="alert">Can't save changes: {saveFailed.detail ?? 'the browser refused the write'}. What you see is on screen only until a save works{embedded ? '; File → Export keeps a copy now.' : '; File → Save deck file keeps a copy now.'}</p>}
      {layer?.locked && <p className="inline-note">Locked: it can't be dragged on the slide. Changes here still apply.</p>}
      {layer && !layer.visible && <p className="inline-note">Hidden in Layers: changes here are kept, but you won't see them until it is shown.</p>}
      {!layer && slide.hidden && <p className="inline-note">This slide is hidden from the show: its settings are kept, but the room won't see it.</p>}
    </div>
  );
}

const ICON = { running: Loader2, done: CheckCircle2, failed: XCircle, info: Info } as const;
const KIND: Record<Job['kind'], string> = { save: 'Save', export: 'Export', open: 'Open', sync: 'Sync', error: 'Error', note: 'Note' };
const time = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function StatusList({ embedded }: { embedded: boolean }) {
  const jobs = useStatus((s) => s.jobs);
  const [filter, setFilter] = useState<'all' | 'failed'>('all');
  const shown = filter === 'failed' ? jobs.filter((j) => j.state === 'failed') : jobs;
  const failed = jobs.filter((j) => j.state === 'failed').length;
  return (
    <div className="panel-scroll status-pane">
      <p className="insp-where-p">Everything the editor saved, exported or synced since this page opened, and anything that went wrong. Rows stay until you reload.</p>
      <div className="status-filter" role="group" aria-label="Show">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All {jobs.length}</button>
        <button className={filter === 'failed' ? 'on' : ''} onClick={() => setFilter('failed')}>Failed {failed}</button>
      </div>
      {!embedded && !jobs.some((j) => j.kind === 'sync') && (
        <div className="status-row info"><Info size={14} /><div><b>Online sync: not in the lab on its own</b><span>Here decks are kept in this browser only. Inside SlideForge, its account sync is listed here.</span></div></div>
      )}
      {shown.length === 0 && <p className="status-empty">{filter === 'failed' ? 'Nothing has failed.' : 'Nothing yet. Saves, exports and errors appear here.'}</p>}
      {shown.map((j) => {
        const I = ICON[j.state];
        return (
          <div key={j.id} className={`status-row ${j.state}`}>
            <I size={14} className={j.state === 'running' ? 'spin' : undefined} />
            <div>
              <b>{j.title}</b>
              {j.detail && <span>{j.detail}</span>}
              <small>{KIND[j.kind]} · {j.state === 'running' ? 'working…' : j.state} · {time(j.at)}</small>
            </div>
          </div>
        );
      })}
      {failed > 0 && <p className="status-foot"><AlertTriangle size={12} /> A failure stays listed after a later try works, so you can see what happened.</p>}
    </div>
  );
}
