// An activity on the wall (activityWall.ts is the model), in HTML over the slide the DeckPlayer draws (hard rule 4).
// The slide draws the routine itself (its columns or its track, a clock per stage); this strip says what the room is
// doing now: the stage and its job, the stage's clock and its time-up cue, the brief, the note count, the stage's
// idea box (no names) with a spotlight button per idea, and the ideas in the spotlight.

import { useEffect, useState } from 'react';
import { stageClock, type ActivityWall } from './activityWall';

export function ActivityStrip({ a, onSpot, onUnspot, onMore }: { a: ActivityWall; onSpot: (key: string) => void; onUnspot: (sid: string) => void; onMore: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!a.clock) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [a.clock]);
  const clock = stageClock(a, now);
  const st = a.stage;
  return (
    <>
      <div className={`wall-activity${st ? ` job-${st.job}` : ''}`} data-testid="activity">
        {a.track.length > 0 && (
          <ol className="wa-track" aria-label="Stages">
            {a.track.map((t) => <li key={t.name} className={t.on ? 'on' : t.done ? 'done' : ''} aria-current={t.on ? 'step' : undefined}>{t.name}{t.time && <span>{t.time}</span>}</li>)}
          </ol>
        )}
        {st ? (
          <p className="wa-stage" role="status" aria-live="polite"><span aria-hidden>{st.icon}</span> <strong>{st.name}</strong> · {st.wall}{a.written && <span className="wa-count"> · {a.written}</span>}</p>
        ) : a.intro ? <p className="wa-stage">{a.intro}</p> : null}
        {a.brief && <p className="wa-brief">{a.brief}</p>}
        {clock && (
          <span className={`wa-clock${clock.over ? ' done' : clock.left <= 10 ? ' hurry' : ''}`} role="timer" aria-live="off">
            <strong>{clock.face}</strong>{clock.note && <em>{clock.note}</em>}
            <button type="button" onClick={onMore} aria-label="Thirty more seconds">+30s</button>
          </span>
        )}
      </div>
      {a.ideas && (
        <aside className="wall-fb fb-rail wa-ideas" aria-label="Ideas from the room">
          <p className="fb-prompt">{st?.text || 'Ideas'}</p>
          <p className="fb-said">{a.ideas.length ? `${a.ideas.length} ${a.ideas.length === 1 ? 'idea' : 'ideas'}, without names` : 'Ideas arrive here, without names'}</p>
          <ul>{a.ideas.slice(0, 6).map((it) => <li key={it.key}><span>{it.text}</span><button type="button" aria-pressed={it.spot} onClick={() => onSpot(it.key)}>Spotlight</button></li>)}</ul>
        </aside>
      )}
      {a.spotlights.length > 0 && (
        <div className="wa-spots" aria-label="In the spotlight">
          {a.spotlights.map((s) => <figure key={s.sid}><figcaption>{s.label}</figcaption><blockquote>{s.text}</blockquote><button type="button" onClick={() => onUnspot(s.sid)} aria-label="Take it down">×</button></figure>)}
        </div>
      )}
    </>
  );
}
