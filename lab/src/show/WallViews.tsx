// The room's wall, in HTML over the slide the DeckPlayer draws (hard rule 4): real text, live regions for what
// changes (who joined, how many have answered, the answer, the scores), never painted into the canvas. What
// to show comes from wallModel.ts; this only paints it.

import { useEffect, useMemo, useState } from 'react';
import { qrSvg } from './qr';
import type { Wall } from './wallModel';

const TOP = 8;

export function Lobby({ wall, connected, error, onStart }: { wall: Wall; connected: boolean; error: string | null; onStart: () => void }) {
  const j = wall.join;
  const qr = useMemo(() => {
    if (!j) return '';
    try { return qrSvg(j.link, { quiet: 2, title: `Join the lesson at ${j.link}` }); } catch { return ''; }
  }, [j?.link]);
  const n = wall.players.length;
  return (
    <section className="wall wall-lobby" aria-label="Join the lesson">
      {!j ? (
        <p className="wall-status" role="status">{error ?? (connected ? 'Opening the room…' : 'Reaching the room server…')}</p>
      ) : (
        <>
          <div className="lobby-join">
            <p className="lobby-line">Join at <b className="lobby-url" data-testid="join-url">{j.address}</b></p>
            <p className="lobby-line">PIN <b className="lobby-pin" data-testid="pin">{j.pin}</b></p>
          </div>
          {qr && <div className="lobby-qr" data-testid="qr" dangerouslySetInnerHTML={{ __html: qr }} />}
          <div className="lobby-players">
            <p className="lobby-count" role="status" aria-live="polite" data-testid="player-count">{n === 0 ? 'Waiting for players…' : `${n} ${n === 1 ? 'player' : 'players'} in`}</p>
            <ul className="lobby-list" aria-label="Players who have joined">
              {wall.players.map((p) => <li key={p.id} className={p.connected ? '' : 'away'}>{p.name}</li>)}
            </ul>
          </div>
          <button className="wall-start" onClick={onStart} disabled={n === 0}>Start</button>
        </>
      )}
    </section>
  );
}

/** Seconds left on the question's clock, once a second. 0 when it has no clock. */
function useCountdown(timeLimit: number, key: string): number | null {
  const [left, setLeft] = useState<number | null>(timeLimit > 0 ? timeLimit : null);
  useEffect(() => {
    if (timeLimit <= 0) { setLeft(null); return; }
    const end = Date.now() + timeLimit * 1000;
    const tick = () => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timeLimit, key]);
  return left;
}

/** While the question is open: how many have answered, and the clock. The question itself is the slide. */
export function QuestionStrip({ q }: { q: NonNullable<Wall['question']> }) {
  const left = useCountdown(q.timeLimit, q.text);
  return (
    <div className="wall-strip" data-testid="strip">
      <span className="strip-answered" role="status" aria-live="polite" aria-atomic="true" data-testid="answered">{q.answered} of {q.players} answered</span>
      {left != null && <span className={`strip-timer${left <= 5 ? ' low' : ''}`} role="timer" aria-live="off" data-testid="timer">{left === 0 ? "Time's up" : `${left}s`}</span>}
    </div>
  );
}

/** After the reveal: the votes on each option, the right one marked, and the answer said aloud to a screen reader. */
export function RevealStrip({ q }: { q: NonNullable<Wall['question']> }) {
  const max = Math.max(1, ...q.options.map((o) => o.count));
  return (
    <div className="wall-strip wall-tally" data-testid="tally">
      <ul className="tally-list" aria-label="Votes for each option">
        {q.options.map((o) => (
          <li key={o.index} className={o.correct ? 'right' : ''} data-testid={`tally-${o.index}`}>
            <span className="tally-bar" style={{ ['--w' as string]: `${Math.round((o.count / max) * 100)}%` }} aria-hidden="true" />
            <span className="tally-label">{o.correct ? '✓ ' : ''}{o.label}</span>
            <b className="tally-count">{o.count}</b>
          </li>
        ))}
      </ul>
      <p className="tally-said" role="status" aria-live="polite" data-testid="reveal-said">
        Answer: {q.answer}. {q.right} of {q.answered} got it right.{q.explanation ? ` ${q.explanation}` : ''}
      </p>
    </div>
  );
}

export function Leaderboard({ wall }: { wall: Wall }) {
  const rows = wall.board.slice(0, TOP);
  return (
    <section className="wall wall-board" aria-label={wall.final ? 'Final scores' : 'Leaderboard'} data-testid="board">
      <h2>{wall.final ? 'Final scores' : 'Leaderboard'}</h2>
      {rows.length === 0 ? <p className="wall-status">No players yet.</p> : (
        <ol role="list" aria-live="polite">
          {rows.map((r) => (
            <li key={r.name} className={r.connected ? '' : 'away'} data-testid="board-row">
              <span className="board-rank">{r.rank}</span><span className="board-name">{r.name}</span><b className="board-score">{r.score}</b>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function Ended() {
  return <section className="wall wall-ended" aria-label="The room has ended"><p className="wall-status" role="status">The room has ended.</p></section>;
}
