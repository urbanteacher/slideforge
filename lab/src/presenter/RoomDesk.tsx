// The room's desk tools the show's bar and the Teacher Presenter window share: the quick poll (live/quick.ts), asked
// on the fly as classic's quick poll sheet asks it (js/quick-poll.js), and the questions box (live/questions.ts), moderated
// as classic's presenter moderates it. The show and the window each say what to do with them: the show acts on its room,
// the window sends the show a command.

import { useState } from 'react';
import { FLOOR_MODES, FLOOR_SAYS, QA_SAYS, QUICK_PRESETS, qaButtons, quickProblem, type FloorMode, type QaAction, type QaBox, type QuickAsk, type QuickKind } from '../live';
import './roomdesk.css';

/** The quick poll sheet: a shape, the question, the answers (a poll's), where the wall shows it. `open`: one is up,
 *  so the sheet offers only to end it. `onAsk` returns '' when the poll went up, or why it did not. */
export function QuickPollForm({ open, onAsk, onEnd }: { open: boolean; onAsk: (a: QuickAsk) => string; onEnd: () => void }) {
  const [kind, setKind] = useState<QuickKind>('poll');
  const [preset, setPreset] = useState('');
  const [prompt, setPrompt] = useState('');
  const [answers, setAnswers] = useState('Yes\nNo');
  const [where, setWhere] = useState<'focus' | 'rail'>('focus');
  const [guard, setGuard] = useState('');
  if (open) {
    return (
      <div className="rd-poll" data-testid="quick-open">
        <p>A quick poll is on the wall.</p>
        <button className="rd-go" onClick={onEnd} data-testid="quick-end">End the poll</button>
      </div>
    );
  }
  const ask = () => {
    const a: QuickAsk = { kind, prompt, options: answers.split('\n').map((l) => l.trim()).filter(Boolean), presentAs: where };
    const why = quickProblem(a) || onAsk(a);
    setGuard(why);
  };
  return (
    <div className="rd-poll" data-testid="quick-form">
      <div className="rd-pills" role="group" aria-label="Ask">
        {QUICK_PRESETS.map((p) => (
          <button key={p.key} aria-pressed={preset === p.key} data-testid={`quick-${p.key}`} onClick={() => {
            setPreset(p.key); setKind(p.kind); setAnswers(p.options.join('\n'));
            if (p.prompt && !prompt.trim()) setPrompt(p.prompt);
          }}>{p.label}</button>
        ))}
      </div>
      <label>Question
        <textarea rows={2} maxLength={240} value={prompt} placeholder="Shall we do another example, or move on?" onChange={(e) => setPrompt(e.target.value)} data-testid="quick-prompt" />
      </label>
      <label>Answers <span className="rd-dim">one per line; not for a scale or a word cloud</span>
        <textarea rows={3} maxLength={400} value={answers} disabled={kind !== 'poll'} onChange={(e) => setAnswers(e.target.value)} data-testid="quick-answers" />
      </label>
      <label>Show it
        <select value={where} onChange={(e) => setWhere(e.target.value === 'rail' ? 'rail' : 'focus')}>
          <option value="focus">Full screen</option>
          <option value="rail">Beside the slide</option>
        </select>
      </label>
      <button className="rd-go" onClick={ask} data-testid="quick-ask">Ask the room</button>
      <p className="rd-guard" role="status">{guard}</p>
    </div>
  );
}

const FLOOR_LABELS: Record<FloorMode, string> = { auto: 'Auto', open: 'Open', shut: 'Shut' };

/** The questions box: who may ask, then every question, most wanted first, with what the teacher can do with each. */
export function QuestionsList({ qa, floor, onQa, onFloor }: { qa: QaBox; floor: FloorMode; onQa: (id: number, action: QaAction) => void; onFloor: (mode: FloorMode) => void }) {
  const pinnedId = qa.pinned?.id ?? null;
  const shown = qa.items.filter((q) => q.state !== 'dismissed');
  return (
    <div className="rd-qa" data-testid="qa-list">
      <div className="rd-floor" role="group" aria-label="Who may ask">
        <span className="rd-dim">Floor</span>
        {FLOOR_MODES.map((m) => <button key={m} aria-pressed={floor === m} title={FLOOR_SAYS[m]} onClick={() => onFloor(m)} data-testid={`floor-${m}`}>{FLOOR_LABELS[m]}</button>)}
      </div>
      <p className="rd-dim">{FLOOR_SAYS[floor]}.</p>
      {shown.length === 0 ? <p className="rd-dim">No questions yet. Phones ask with their Ask button while the floor is open.</p> : (
        <ul className="rd-list">
          {shown.map((q) => (
            <li key={q.id} className={`${q.state}${q.id === pinnedId ? ' pinned' : ''}`} data-testid={`qa-${q.id}`}>
              <span>{q.text}</span>
              <span className="rd-meta"><span>{q.name || 'anonymous'}</span>{q.votes > 0 && <span>▲ {q.votes}</span>}<span>{q.id === pinnedId ? 'on the wall' : QA_SAYS[q.state]}</span></span>
              <span className="rd-acts">
                {qaButtons(q, pinnedId).map((b) => <button key={b.action} className={b.tone ?? ''} onClick={() => onQa(q.id, b.action)} data-testid={`qa-${q.id}-${b.action}`}>{b.label}</button>)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
