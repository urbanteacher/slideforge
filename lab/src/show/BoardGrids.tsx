// The grid boards on the wall: Bingo (a card per team, the call, the verdicts on each card's name line) and Quiz bowl (the grid of
// categories by values, the question it opens in place of the grid, the teams' scores and their awards). The models are the
// kinds' `wall` (live/boards/bingo.ts, bowl.ts), as classic's runtimes draw them. The boards' buttons and head are here too.

import type { BingoWall, BoardAction, BoardWallBase, BowlWall } from '../live';

export type OnCommand = (action: string, card?: number) => void;

/** The board's buttons: real buttons, the primary one first in the row. */
export function Actions({ actions, onCommand }: { actions: BoardAction[]; onCommand: OnCommand }) {
  return (
    <div className="board-actions">
      {actions.map((a) => <button key={a.action + a.label} type="button" className={a.primary ? 'primary' : ''} onClick={() => onCommand(a.action)}>{a.label}</button>)}
    </div>
  );
}

/** A full board's head: what it is, its title, and its clock. */
export function BoardHead({ eyebrow, title, clockLabel, clock }: { eyebrow: string; title: string; clockLabel: string; clock: string }) {
  return (
    <header className="gb-head">
      <div><div className="gb-eyebrow">{eyebrow}</div><h2>{title}</h2></div>
      <div className="gb-clock" role="timer" aria-live="off"><span>{clockLabel}</span> <strong>{clock}</strong></div>
    </header>
  );
}


export const isBingo = (w: BoardWallBase): w is BingoWall => w.key === 'bingo';
export const isBowl = (w: BoardWallBase): w is BowlWall => w.key === 'bowl';

export function BingoBoard({ wall, onCommand }: { wall: BingoWall; onCommand: OnCommand }) {
  const across = wall.cards.length <= 3 ? wall.cards.length : wall.cards.length === 4 ? 2 : 3;
  return (
    <div className={`full-board bingo phase-${wall.phase}${wall.paused ? ' is-paused' : ''}`} data-testid="board">
      <BoardHead eyebrow={wall.eyebrow} title={wall.title} clockLabel={wall.clockLabel} clock={wall.count} />
      <div className={`bingo-call${wall.call.term != null || wall.call.eyebrow === 'WHICH TERM IS THIS?' ? ' on' : ''}`} aria-live="polite">
        <div className="gb-eyebrow">{wall.call.eyebrow}</div>
        <p>{wall.call.text}</p>
        {wall.call.term && <strong>{wall.call.term}</strong>}
      </div>
      <div className="bingo-cards" style={{ gridTemplateColumns: `repeat(${Math.max(1, across)}, minmax(0, 1fr))` }}>
        {wall.cards.map((c, team) => (
          <section key={c.name} className={`bingo-card${c.won ? ' won' : ''}`} aria-label={`${c.name}'s card`}>
            <div className="bingo-card-head">
              <strong>{c.name}</strong>
              {wall.phase === 'calling' && (c.canMark
                ? <span className="bingo-verdicts"><button type="button" className="primary" onClick={() => onCommand('claim', team)}>✓ Claim</button><button type="button" onClick={() => onCommand('miss', team)}>✗ Missed</button></span>
                : <span className="bingo-why">{c.why}</span>)}
              <span className="bingo-tick">{c.tick}</span>
            </div>
            <div className="bingo-grid" style={{ gridTemplateColumns: `repeat(${wall.size}, minmax(0, 1fr))` }}>
              {c.squares.map((q, i) => <div key={i} className={`bingo-square is-${q.state}${q.gap ? ' is-gap' : ''}${q.calling ? ' calling' : ''}`}>{q.term}</div>)}
            </div>
          </section>
        ))}
      </div>
      <div className="gb-foot">
        <p role="status" aria-live="polite"><strong>{wall.caption}</strong> <span>{wall.status}</span></p>
        {wall.tally.length > 0 && <div className="gb-tally">{wall.tally.map((t) => <span key={t}>{t}</span>)}</div>}
        <Actions actions={wall.actions} onCommand={onCommand} />
      </div>
    </div>
  );
}

export function BowlBoard({ wall, onCommand }: { wall: BowlWall; onCommand: OnCommand }) {
  return (
    <div className={`full-board bowl phase-${wall.phase}${wall.paused ? ' is-paused' : ''}`} data-testid="board">
      <BoardHead eyebrow={wall.eyebrow} title={wall.title} clockLabel={wall.clockLabel} clock={wall.left} />
      {wall.ask ? (
        <div className="bowl-ask" aria-live="polite">
          <div className="gb-eyebrow">{wall.ask.eyebrow}</div>
          <p className="bowl-question">{wall.ask.question}</p>
          {wall.ask.answer != null ? <div className="bowl-answer"><span className="gb-eyebrow">THE ANSWER</span> <strong>{wall.ask.answer}</strong></div> : <p className="bowl-hint">Take an answer from the room, then reveal.</p>}
        </div>
      ) : (
        <div className="bowl-grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, wall.categories.length)}, minmax(0, 1fr))` }}>
          {wall.categories.map((c) => <div key={c} className="bowl-category">{c}</div>)}
          {wall.cells.map((c, i) => (c.waiting
            ? <button key={i} type="button" className="bowl-cell" disabled={!c.open} aria-label={c.label} onClick={() => onCommand('pick', i)}>{c.value}{c.waiting > 1 && <span className="bowl-stack">×{c.waiting}</span>}</button>
            : <div key={i} className="bowl-cell is-spent" aria-label={`${c.label}, spent`}>·</div>))}
        </div>
      )}
      <div className="bowl-teams">
        {wall.teams.map((t, i) => (
          <section key={t.name} className={`bowl-team${t.won ? ' won' : ''}`}>
            <strong>{t.name}</strong> <span className="bowl-score">{t.score}</span>
            {t.award && <button type="button" className="primary" onClick={() => onCommand('award', i)}>{t.award}</button>}
          </section>
        ))}
      </div>
      <div className="gb-foot">
        <p role="status" aria-live="polite"><strong>{wall.caption}</strong> <span>{wall.status}</span></p>
        <Actions actions={wall.actions} onCommand={onCommand} />
      </div>
    </div>
  );
}
