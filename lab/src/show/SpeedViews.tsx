// Beat the clock on the wall (speedWall.ts is the model), in HTML over the slide the DeckPlayer draws (hard rule 4). The sprint:
// "Against the clock", the clock, the room's progress, and at time the room's right answers and the hardest question; a real
// Stop the clock button. The wall-paced round: its clock and count in a strip beside the question.

import { useEffect, useState } from 'react';
import type { RoundWall, SprintWall } from './speedWall';

/** Seconds left to `endsAt`, ticking while it runs. */
function useLeft(endsAt: number, over: boolean): number {
  const left = () => (over ? 0 : Math.max(0, (endsAt - Date.now()) / 1000));
  const [secs, setSecs] = useState(left);
  useEffect(() => {
    setSecs(left());
    if (over) return;
    const id = setInterval(() => setSecs(left()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, over]);
  return secs;
}

const face = (secs: number) => { const n = Math.ceil(secs); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };

export function SprintBoard({ sprint, onStop }: { sprint: SprintWall; onStop: () => void }) {
  const secs = useLeft(sprint.endsAt, sprint.over);
  const over = sprint.over || secs <= 0;
  return (
    <div className={`sprint-board${over ? ' over' : secs <= 10 ? ' hurry' : ''}`} data-testid="sprint">
      <div className="spb-kicker">AGAINST THE CLOCK</div>
      <div className="spb-clock" role="timer" aria-live="off">{over ? 'Time!' : face(secs)}</div>
      <div className="spb-bar" aria-hidden="true"><i style={{ width: `${sprint.pct}%` }} /></div>
      <div className="spb-stats" role="status" aria-live="polite">{sprint.stats}</div>
      <div className="spb-sub">{sprint.sub}</div>
      {sprint.result && (
        <div className="spb-result" role="status" aria-live="polite">
          {sprint.hardest ? (
            <>
              <div className="spb-hard-label">The hardest</div>
              <div className="spb-hard-q">{sprint.hardest.question}</div>
              <div className="spb-hard-a">{'✓'} {sprint.hardest.answer}</div>
              <div className="spb-hard-n">{sprint.hardest.line}</div>
            </>
          ) : <div className="spb-hard-n">Nobody got one wrong. A clean run.</div>}
          <div className="spb-next">Next {'→'} to move on</div>
        </div>
      )}
      {!over && <button type="button" className="spb-stop" onClick={onStop}>Stop the clock</button>}
      {sprint.notice && <div className="spb-notice" role="status">{sprint.notice}</div>}
    </div>
  );
}

/** The wall-paced round's one clock and its count of right answers, as a room. */
export function SpeedClock({ round }: { round: RoundWall }) {
  const secs = useLeft(round.endsAt, round.over);
  const over = round.over || secs <= 0;
  return (
    <div className="wall-strip speed-strip" data-testid="speed-round">
      <span className={`round-clock${!over && secs <= 10 ? ' low' : ''}${over ? ' over' : ''}`} role="timer" aria-live="off">
        {over ? `Time! ${round.count} ${round.count === 1 ? 'right answer' : 'right answers'}, as a room. Next to move on` : `${face(secs)} · ${round.count} right`}
      </span>
    </div>
  );
}
