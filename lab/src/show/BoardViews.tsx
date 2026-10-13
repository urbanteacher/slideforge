// The boards on the wall (live/boards; each kind's `wall` is the model), in HTML over the slide the DeckPlayer draws (hard rule 4).
// A board is played on the wall: its clock and its buttons are the teacher's, as classic's board runtime draws them. A new board
// adds its view here (or in a file beside it), keyed by its kind.

import type { BoardAction, BoardWallBase, LowStakesWall, MemoryWall } from '../live';

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

/** Low-stakes quiz: the whole-quiz clock, what to do now, and the buttons. The questions are on the slide, and the reveal puts the
 *  game's answers slide up (Show.tsx), so the bar does not repeat them. */
function LowStakesBoard({ wall, onCommand }: { wall: LowStakesWall; onCommand: OnCommand }) {
  return (
    <div className={`paper-board phase-${wall.phase}${wall.paused ? ' is-paused' : ''}`} data-testid="board">
      <div className="pb-head">
        <span className="pb-eyebrow">LOW-STAKES QUIZ · NO NOTES — RETRIEVAL</span>
        <span className="pb-clock" role="timer" aria-live="off"><span>{wall.clockLabel}</span> <strong>{wall.clock}</strong></span>
      </div>
      <p className="pb-caption" role="status" aria-live="polite"><strong>{wall.caption}</strong> <span>{wall.status}</span></p>
      <Actions actions={wall.actions} onCommand={onCommand} />
    </div>
  );
}

/** The memory boards: the cards (face down, face up, collected), the check strip for the chosen card, the turn and the buttons. */
function MemoryBoard({ wall, onCommand }: { wall: MemoryWall; onCommand: OnCommand }) {
  return (
    <div className={`full-board mem phase-${wall.phase}${wall.paused ? ' is-paused' : ''}`} data-testid="board">
      <BoardHead eyebrow={wall.eyebrow} title={wall.title} clockLabel={wall.clockLabel} clock={wall.clock} />
      <div className="gb-progress">{wall.progress.map((p) => <span key={p.label} className={p.on ? 'on' : ''}>{p.label}</span>)}<strong>{wall.collected}</strong></div>
      <div className="mem-cards" style={{ gridTemplateColumns: `repeat(${wall.cards.length <= 4 ? 2 : wall.cards.length <= 6 ? 3 : 4}, minmax(0, 1fr))` }}>
        {wall.cards.map((c, i) => (
          <button key={c.n} type="button" className={`mem-card${c.face ? ' up' : ' down'}${c.collected ? ' collected' : ''}${c.selected ? ' selected' : ''}`} disabled={!c.selectable} onClick={() => onCommand('select', i)}
            aria-label={c.face ? `${c.term}${c.collected ? ', collected' : ''}` : `Choose card ${i + 1}`}>
            <span className="mc-n">{c.n}</span>
            {c.face ? <strong>{c.term}</strong> : <span className="mc-sym" aria-hidden>✳</span>}
            {c.definition && <span className="mc-def">{c.definition}</span>}
            {c.owner && <span className="mc-owner">{c.owner}</span>}
            {c.prompt && <span className="mc-prompt">{c.prompt}</span>}
          </button>
        ))}
      </div>
      {wall.check && (
        <div className="gb-check" role="group" aria-label="Check this claim">
          <div className="gb-eyebrow">{wall.check.eyebrow}</div><h3>{wall.check.term}</h3><p>{wall.check.text}</p>
          <Actions actions={wall.check.actions} onCommand={onCommand} />
        </div>
      )}
      <div className="gb-foot">
        <p role="status" aria-live="polite"><strong>{wall.caption}</strong> <span>{wall.status}</span></p>
        {wall.tally.length > 0 && <div className="gb-tally">{wall.tally.map((t) => <span key={t}>{t}</span>)}</div>}
        <Actions actions={wall.actions} onCommand={onCommand} />
      </div>
    </div>
  );
}

export function BoardView({ wall, onCommand }: { wall: BoardWallBase; onCommand: OnCommand }) {
  if (wall.key === 'lowstakes') return <LowStakesBoard wall={wall as LowStakesWall} onCommand={onCommand} />;
  if (wall.key === 'memory') return <MemoryBoard wall={wall as MemoryWall} onCommand={onCommand} />;
  return <div className="paper-board"><Actions actions={wall.actions} onCommand={onCommand} /></div>;
}
