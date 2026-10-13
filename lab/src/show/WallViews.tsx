// The room's wall, in HTML over the slide the DeckPlayer draws (hard rule 4): real text, live regions for what
// changes (who joined, how many have answered, the answer, the scores), never painted into the canvas. What
// to show comes from wallModel.ts; this only paints it.

import { useEffect, useMemo, useState } from 'react';
import { qrSvg } from './qr';
import { clockOf, type Clock } from './clock';
import type { Rail } from './rail';
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

/** The question's clock, once a quarter second, counted from when the question was asked (clock.ts). */
function useClock(timeLimit: number, askedAt: number): Clock | null {
  const [clock, setClock] = useState(() => clockOf(timeLimit, Date.now() - askedAt));
  useEffect(() => {
    const tick = () => setClock(clockOf(timeLimit, Date.now() - askedAt));
    tick();
    if (timeLimit <= 0) return;
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timeLimit, askedAt]);
  return clock;
}

/** While the question is open: how many have answered, and the clock. The question itself is the slide. At zero
 *  the answer is revealed by itself (useRoom), so "Time's up" is on the wall only for the moment before it. */
export function QuestionStrip({ q, askedAt }: { q: NonNullable<Wall['question']>; askedAt: number }) {
  const clock = useClock(q.timeLimit, askedAt);
  return (
    <div className="wall-strip" data-testid="strip">
      <span className="strip-answered" role="status" aria-live="polite" aria-atomic="true" data-testid="answered">{q.answered} of {q.players} answered</span>
      {clock && <span className={`strip-timer${clock.low ? ' low' : ''}${clock.over ? ' over' : ''}`} role="timer" aria-live="off" data-testid="timer">{clock.over ? "Time's up" : `${clock.left}s`}</span>}
    </div>
  );
}

/** After the reveal: the votes on each option, the right one marked, and the answer said aloud to a screen reader.
 *  A Type answer question has no options: it shows what the room typed, one row per answer. */
export function RevealStrip({ q }: { q: NonNullable<Wall['question']> }) {
  const typed = q.typed;
  const rows = typed ? typed.map((g, i) => ({ key: i, label: g.text, count: g.n, right: g.right })) : q.options.map((o) => ({ key: o.index, label: o.label, count: o.count, right: o.correct }));
  const max = Math.max(1, ...rows.map((o) => o.count));
  return (
    <div className={`wall-strip wall-tally${q.style === 'truefalse' ? ' tally-pair' : ''}${typed ? ' tally-typed' : ''}`} data-testid="tally">
      <ul className="tally-list" aria-label={typed ? 'What the room typed' : q.style === 'truefalse' ? 'Votes for True and False' : 'Votes for each option'}>
        {rows.map((o) => (
          <li key={o.key} className={o.right ? 'right' : ''} data-testid={typed ? `typed-${o.key}` : `tally-${o.key}`}>
            <span className="tally-bar" style={{ ['--w' as string]: `${Math.round((o.count / max) * 100)}%` }} aria-hidden="true" />
            <span className="tally-label">{o.right ? '✓ ' : ''}{o.label}</span>
            <b className="tally-count">{o.count}</b>
          </li>
        ))}
        {typed && rows.length === 0 && <li className="tally-none" data-testid="typed-none">Nobody typed an answer.</li>}
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

/** The standings beside the slide through the game, as classic's rail is: a few rows, what each gained on the last
 *  question, and the way in for latecomers. */
export function RailView({ rail }: { rail: Rail }) {
  return (
    <aside className="wall-rail" aria-label="Standings" data-testid="rail">
      <h2>{rail.scoreLabel}</h2>
      <p className="rail-sub">{rail.subtitle}</p>
      {rail.rows.length === 0 ? <p className="rail-sub">Waiting for players</p> : (
        <ol role="list" aria-live="polite">
          {rail.rows.map((r) => (
            <li key={r.id} className={r.connected ? '' : 'away'} data-testid="rail-row">
              <span className="board-rank">{r.rank}</span><span className="board-name">{r.name}</span>
              <b className="board-score">{r.score}</b>{r.gained > 0 && <i className="rail-gain" data-testid="rail-gain">+{r.gained}</i>}
            </li>
          ))}
        </ol>
      )}
      {rail.more > 0 && <p className="rail-sub">+{rail.more} more</p>}
      {rail.join && <p className="rail-join">{rail.join.address} · PIN {rail.join.pin}</p>}
    </aside>
  );
}

/** The room has ended (or is ending): the final standings, and the way to the session report. The report itself is
 *  the relay's, read by the shell's Reports (hooks.reports): it is not drawn here. */
export function Ended({ wall, closing, onReport, onClose }: { wall: Wall; closing: boolean; onReport?: () => void; onClose: () => void }) {
  const rows = wall.board.slice(0, TOP);
  return (
    <section className="wall wall-board wall-ended" aria-label="The room has ended" data-testid="ended">
      <h2>{closing ? 'Ending the room…' : 'The room has ended'}</h2>
      {rows.length > 0 && (
        <ol role="list" aria-label="Final scores">
          {rows.map((r) => (
            <li key={r.id} className={r.connected ? '' : 'away'} data-testid="final-row">
              <span className="board-rank">{r.rank}</span><span className="board-name">{r.name}</span><b className="board-score">{r.score}</b>
            </li>
          ))}
        </ol>
      )}
      <div className="ended-actions">
        {onReport && <button className="wall-start" onClick={onReport} disabled={closing}>Open the report</button>}
        <button className="wall-start" onClick={onClose}>Back to the lesson</button>
      </div>
    </section>
  );
}
