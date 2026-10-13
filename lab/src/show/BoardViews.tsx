// The boards on the wall (live/boards; each kind's `wall` is the model), in HTML over the slide the DeckPlayer draws (hard rule 4).
// A board is played on the wall: its clock and its buttons are the teacher's, as classic's board runtime draws them. A new board
// adds its view here, keyed by its kind.

import type { BoardWallBase, LowStakesWall } from '../live';

/** The board's buttons: real buttons, the primary one first in the row. */
function Actions({ wall, onCommand }: { wall: BoardWallBase; onCommand: (action: string) => void }) {
  return (
    <div className="board-actions">
      {wall.actions.map((a) => <button key={a.action + a.label} type="button" className={a.primary ? 'primary' : ''} onClick={() => onCommand(a.action)}>{a.label}</button>)}
    </div>
  );
}

/** Low-stakes quiz: the whole-quiz clock, what to do now, and the buttons. The questions are on the slide, and the reveal puts the
 *  game's answers slide up (Show.tsx), so the bar does not repeat them. */
function LowStakesBoard({ wall, onCommand }: { wall: LowStakesWall; onCommand: (action: string) => void }) {
  return (
    <div className={`paper-board phase-${wall.phase}${wall.paused ? ' is-paused' : ''}`} data-testid="board">
      <div className="pb-head">
        <span className="pb-eyebrow">LOW-STAKES QUIZ · NO NOTES — RETRIEVAL</span>
        <span className="pb-clock" role="timer" aria-live="off"><span>{wall.clockLabel}</span> <strong>{wall.clock}</strong></span>
      </div>
      <p className="pb-caption" role="status" aria-live="polite"><strong>{wall.caption}</strong> <span>{wall.status}</span></p>
      <Actions wall={wall} onCommand={onCommand} />
    </div>
  );
}

export function BoardView({ wall, onCommand }: { wall: BoardWallBase; onCommand: (action: string) => void }) {
  if (wall.key === 'lowstakes') return <LowStakesBoard wall={wall as LowStakesWall} onCommand={onCommand} />;
  return <div className="paper-board"><Actions wall={wall} onCommand={onCommand} /></div>;
}
