// A spoken game's wall (live/spoken.ts): the verdict pads, who is speaking, and the game's count, in HTML over the slide the
// DeckPlayer draws (hard rule 4). The phones answer nothing; the teacher judges aloud and presses a verdict here (or in the
// teacher-entry window), naming who spoke. A verdict that would put points somewhere waits for the speaker ("Complete: who
// spoke?"). A pass or a reject names nobody. Real buttons, a labelled picker, live regions for what changes.

import { speakerOf, type Recipient } from '../live/spoken';
import type { Wall } from './wallModel';

export interface SpokenActions {
  onVerdict: (index: number) => void;
  onSpeaker: (r: Recipient) => void;
  onVerdictRoom: () => void;
}

type SpokenDetail = Extract<NonNullable<Wall['question']>['detail'], { kind: 'spoken' }>;

/** The wall's spoken strip: before the reveal the pads and the speaker's picker, after it the verdict that was given. */
export function SpokenPad({ q, actions, revealed }: { q: NonNullable<Wall['question']>; actions: SpokenActions; revealed: boolean }) {
  const s = (q.detail as SpokenDetail).spoken;
  const count = `${s.count} ${s.counts}`;
  if (revealed) {
    const given = s.given != null ? s.verdicts[s.given]?.label : null;
    return (
      <div className="wall-strip wall-spoken" data-testid="spoken">
        <p className="spoken-said" role="status" aria-live="polite" data-testid="spoken-said">
          {given ? `${given}${s.credit ? ` · ${s.credit}` : ''}` : `${q.answer || 'Closed without a verdict'}`}
        </p>
        <span className="spoken-count" data-testid="spoken-count">{count}</span>
      </div>
    );
  }
  return (
    <div className="wall-strip wall-spoken" data-testid="spoken">
      {s.face && <span className="spoken-face" data-testid="spoken-face">{s.face}</span>}
      <label className="spoken-who">Who spoke
        <select value={s.speaker} onChange={(e) => actions.onSpeaker(speakerOf(e.target.value))} aria-label="Who spoke" data-testid="spoken-who">
          {s.speakers.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </label>
      <div className="spoken-pads" role="group" aria-label="Verdict">
        {s.verdicts.map((v) => <button key={v.index} type="button" onClick={() => actions.onVerdict(v.index)} data-testid={`verdict-${v.index}`}>{v.label}</button>)}
      </div>
      {s.held && (
        <p className="spoken-held" role="status" aria-live="polite" data-testid="spoken-held">
          {s.held}: who spoke? Choose them, or <button type="button" onClick={actions.onVerdictRoom} data-testid="verdict-room">count it for the room</button>.
        </p>
      )}
      <span className="spoken-count" aria-live="polite" data-testid="spoken-count">{count}</span>
    </div>
  );
}
