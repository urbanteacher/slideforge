// The Teacher Presenter's controls: every control of the show as a button, in four groups (Slides, Screen, Room,
// Phones), each labelled from the one table (controls.ts) with its wall key in its title, and pressed when it is on.
// A button sends the show the command its key would; the window's own panels (questions, quick poll, who answered
// what, the keys) open here.

import { useState } from 'react';
import { CONTROLS, keyOf, type ShowAction } from './controls';
import type { CmdData, PresenterCmd, PresenterState, WhoRow } from './protocol';

const FLOOR_LABEL = { auto: 'follows the lesson', open: 'open', shut: 'closed' } as const;
const VIEW_LABEL = { hidden: 'hidden', beside: 'beside', full: 'full screen' } as const;

export type DeskPanel = '' | 'qa' | 'poll' | 'who' | 'keys';

function Btn({ action, onClick, pressed, disabled, label, primary }: { action: ShowAction; onClick: () => void; pressed?: boolean; disabled?: boolean; label?: string; primary?: boolean }) {
  const c = CONTROLS.find((x) => x.action === action && x.desk);
  const key = keyOf(action);
  return (
    <button className={primary ? 'pw-primary' : undefined} onClick={onClick} aria-pressed={pressed} disabled={disabled}
      title={`${c?.says ?? ''}${key ? ` (${key} on the wall)` : ''}`} data-testid={`desk-${action}`}>{label ?? c?.desk ?? action}</button>
  );
}

/** The state the desk reads out: frozen, phones blanked, the floor, the room view. */
export function DeskState({ st, now }: { st: PresenterState; now: number }) {
  const r = st.room;
  const soon = r?.blankSoonAt && r.blankSoonAt > now ? Math.ceil((r.blankSoonAt - now) / 1000) : 0;
  const bits = [
    st.frozenAt != null ? `Wall frozen on slide ${st.frozenAt + 1}` : '',
    st.screen !== 'none' ? `Wall ${st.screen}` : '',
    st.ink?.on ? (st.ink.spot ? 'Spotlight on' : 'Drawing') : '',
    r?.phonesBlank ? 'Phones blanked' : soon ? `Phones dark in ${soon} s` : '',
    r ? `Floor ${FLOOR_LABEL[r.floor ?? 'auto']}` : '',
    r ? `Room view ${VIEW_LABEL[r.roomView ?? 'beside']}` : '',
    r?.joinCard ? 'Join card up' : '',
    r && r.reactions === false ? 'Reactions off' : '',
  ].filter(Boolean);
  return <p className="pw-state" role="status" data-testid="desk-state">{bits.join(' · ') || 'Showing the slide'}</p>;
}

/** Who answered what: private, this window only. */
export function WhoList({ rows }: { rows: WhoRow[] }) {
  if (!rows.length) return <p className="pw-dim">No answers yet for the question on the wall.</p>;
  return (
    <ul className="pw-who" data-testid="who-list">
      {rows.map((r, i) => <li key={`${r.name}-${i}`}><b>{r.name}</b><span>{r.answer}</span>{r.sure != null && <span className="pw-dim">{r.sure ? 'sure' : 'unsure'}</span>}</li>)}
    </ul>
  );
}

export function DeskControls({ st, now, send, panel, setPanel }: { st: PresenterState; now: number; send: (cmd: PresenterCmd, n?: number, data?: CmdData) => void; panel: DeskPanel; setPanel: (p: DeskPanel) => void }) {
  const [jump, setJump] = useState('');
  const r = st.room;
  const toggle = (p: DeskPanel) => setPanel(panel === p ? '' : p);
  const soon = !!r?.blankSoonAt && r.blankSoonAt > now;
  const openEntry = () => { if (!r?.entry) return; const w = window.open(r.entry, 'slideforge-teacher', 'width=760,height=780'); w?.focus(); };
  return (
    <footer className="pw-controls" role="toolbar" aria-label="Show controls">
      <div className="pw-group" role="group" aria-label="Slides"><span className="pw-group-name">Slides</span>
        <Btn action="prev" onClick={() => send('prev')} />
        <Btn action="next" primary onClick={() => send('next')} />
        <Btn action="steps" onClick={() => send('steps')} />
        <Btn action="freeze" onClick={() => send('freeze')} pressed={st.frozenAt != null} label={st.frozenAt != null ? 'Catch up' : 'Freeze'} />
        <form onSubmit={(e) => { e.preventDefault(); const n = Number(jump); if (n >= 1) send('goto', n); setJump(''); }}>
          <input aria-label="Jump to slide number" inputMode="numeric" placeholder="Slide #" value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))} />
          <button type="submit">Go</button>
        </form>
        <Btn action="exit" onClick={() => send('end')} />
      </div>
      <div className="pw-group" role="group" aria-label="Screen"><span className="pw-group-name">Screen</span>
        <Btn action="black" onClick={() => send(st.screen === 'black' ? 'resume' : 'black')} pressed={st.screen === 'black'} />
        <Btn action="white" onClick={() => send(st.screen === 'white' ? 'resume' : 'white')} pressed={st.screen === 'white'} />
        <Btn action="draw" onClick={() => send('draw')} pressed={!!st.ink?.on && !st.ink.spot} />
        <Btn action="spot" onClick={() => send('spot')} pressed={!!st.ink?.on && !!st.ink.spot} />
        <Btn action="clearInk" onClick={() => send('clearInk')} />
        <Btn action="notesElsewhere" onClick={() => send('notesElsewhere')} />
        <Btn action="help" onClick={() => toggle('keys')} pressed={panel === 'keys'} label="Keys" />
      </div>
      {r && (
        <div className="pw-group" role="group" aria-label="Room"><span className="pw-group-name">Room</span>
          <button onClick={() => send('reveal')} disabled={!r.open} title="Reveal the answer (Next on the wall)" data-testid="desk-reveal">Reveal</button>
          <Btn action="open" onClick={() => send('open')} disabled={!r.canShow} />
          <Btn action="close" onClick={() => send('close')} disabled={!r.canClose && !r.quick} />
          <Btn action="again" onClick={() => send('again')} disabled={!r.canAgain} />
          {r.stage && <Btn action="more" onClick={() => send('more')} />}
          <Btn action="poll" onClick={() => toggle('poll')} pressed={panel === 'poll' || !!r.quick} disabled={!r.quick && !r.canPoll} />
          {r.qa && <Btn action="questions" onClick={() => toggle('qa')} pressed={panel === 'qa'} label={`Questions${r.qa.pending ? ` (${r.qa.pending})` : ''}`} />}
          <Btn action="who" onClick={() => toggle('who')} pressed={panel === 'who'} />
          <Btn action="roomView" onClick={() => send('roomView')} label={`Room view: ${VIEW_LABEL[r.roomView ?? 'beside']}`} />
          <Btn action="scores" onClick={() => send('scores')} pressed={r.roomView === 'full'} />
          <Btn action="join" onClick={() => send('join')} pressed={!!r.joinCard} disabled={!r.pin} />
          <Btn action="reactions" onClick={() => send('reactions')} pressed={r.reactions !== false} />
          <Btn action="entry" onClick={openEntry} disabled={!r.entry} />
        </div>
      )}
      {r && (
        <div className="pw-group" role="group" aria-label="Phones"><span className="pw-group-name">Phones</span>
          <Btn action="blankPhones" onClick={() => send('blankPhones')} pressed={!!r.phonesBlank} label={r.phonesBlank ? 'Phones back' : 'Blank phones'} />
          <Btn action="blankSoon" onClick={() => send('blankSoon')} pressed={soon} disabled={!!r.phonesBlank} label={soon ? `Cancel (${Math.ceil((r.blankSoonAt! - now) / 1000)} s)` : 'Blank in 10 s'} />
          <Btn action="floor" onClick={() => send('floor')} label={`Floor: ${FLOOR_LABEL[r.floor ?? 'auto']}`} />
        </div>
      )}
    </footer>
  );
}
