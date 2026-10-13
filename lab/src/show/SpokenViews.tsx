// A spoken game's wall (live/spoken.ts): the verdict pads, who is speaking, and the game's count, in HTML over the slide the
// DeckPlayer draws (hard rule 4). The phones answer nothing; the teacher judges aloud and presses a verdict here (or in the
// teacher-entry window), naming who spoke. A verdict that would put points somewhere waits for the speaker ("Complete: who
// spoke?"). A pass or a reject names nobody. Real buttons, a labelled picker, live regions for what changes.

import { useEffect, useState } from 'react';
import { speakerOf, type Recipient } from '../live/spoken';
import type { Wall } from './wallModel';

export interface SpokenActions {
  onVerdict: (index: number) => void;
  onSpeaker: (r: Recipient) => void;
  onVerdictRoom: () => void;
  /** Put a proposal from the room on the table: its author becomes the speaker (the author's name is never on the wall). */
  onProposal?: (pid: number, text: string) => void;
  /** Concept chain: the link being weighed, typed in the wall's box. */
  onLink?: (text: string) => void;
}

type SpokenDetail = Extract<NonNullable<Wall['question']>['detail'], { kind: 'spoken' }>;
type Round = NonNullable<SpokenDetail['spoken']['round']>;

/** Heads up's one clock for the whole pile: the seconds left, the count, whose round it is, and what to do once time is up. */
function RoundClock({ round, guesser }: { round: Round; guesser: string }) {
  const left = () => (round.over ? 0 : Math.max(0, Math.round((round.endsAt - Date.now()) / 1000)));
  const [secs, setSecs] = useState(left);
  useEffect(() => {
    setSecs(left());
    if (round.over) return;
    const id = setInterval(() => setSecs(left()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.endsAt, round.over]);
  return (
    <span className={`round-clock${secs <= 10 && !round.over ? ' low' : ''}${round.over ? ' over' : ''}`} data-testid="round" role="timer" aria-live="off">
      {round.over ? `Time! ${round.count} ${round.count === 1 ? 'term' : 'terms'}${guesser ? ` in ${guesser}\u2019s round` : ' in the round'}. Next to move on` : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} · ${round.count} correct${guesser ? ` · ${guesser} is guessing` : ''}`}
    </span>
  );
}

/** Concept chain's map: each term the game has reached with the links accepted from it, and a dashed branch for the one being weighed. */
function ChainMap({ chain, open, onLink }: { chain: NonNullable<SpokenDetail['spoken']['chain']>; open: boolean; onLink?: (text: string) => void }) {
  return (
    <div className="chain" data-testid="chain">
      {chain.earlier > 0 && <p className="chain-earlier">+{chain.earlier} earlier {chain.earlier === 1 ? 'term' : 'terms'}</p>}
      <ol className="chain-map" aria-label="The chain so far">
        {chain.rows.map((r, i) => (
          <li key={i} className={r.now ? 'now' : 'past'} data-testid={r.now ? 'chain-now' : 'chain-past'}>
            <b className="chain-term">{r.term}</b>
            <ul className="chain-branches">
              {r.more > 0 && <li className="chain-more">+{r.more} more</li>}
              {r.links.map((l, j) => <li key={j} className={r.now && j === r.links.length - 1 ? 'fresh' : ''} data-testid="chain-link">{l}</li>)}
              {r.now && open && <li className="ghost" data-testid="chain-ghost">{chain.pending.trim() || 'next link'}</li>}
            </ul>
          </li>
        ))}
      </ol>
      {open && onLink && (
        <label className="chain-capture">Proposed link
          <input type="text" maxLength={160} value={chain.pending} onChange={(e) => onLink(e.target.value)} placeholder="Type the proposed link and justification" data-testid="chain-input" />
        </label>
      )}
    </div>
  );
}

/** The wall's spoken strip: before the reveal the pads and the speaker's picker, after it the verdict that was given. */
export function SpokenPad({ q, actions, revealed }: { q: NonNullable<Wall['question']>; actions: SpokenActions; revealed: boolean }) {
  const s = (q.detail as SpokenDetail).spoken;
  const count = `${s.count} ${s.counts}`;
  if (revealed) {
    const given = s.given != null ? s.verdicts[s.given]?.label : null;
    return (
      <div className="wall-strip wall-spoken" data-testid="spoken">
        {s.round && <RoundClock round={s.round} guesser={s.guesser} />}
        {s.chain && <ChainMap chain={s.chain} open={false} />}
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
      {s.round && <RoundClock round={s.round} guesser={s.guesser} />}
      <label className="spoken-who">{s.speakerLabel}
        <select value={s.speaker} onChange={(e) => actions.onSpeaker(speakerOf(e.target.value))} aria-label={s.speakerLabel} data-testid="spoken-who">
          {s.speakers.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </label>
      <div className="spoken-pads" role="group" aria-label="Verdict">
        {s.verdicts.map((v) => <button key={v.index} type="button" onClick={() => actions.onVerdict(v.index)} data-testid={`verdict-${v.index}`}>{v.label}</button>)}
      </div>
      {s.onTable && <p className="spoken-table" data-testid="spoken-table"><i>On the table</i> {'\u201c'}{s.onTable}{'\u201d'}</p>}
      {s.ideas.length > 0 && (
        <ul className="spoken-ideas" aria-label="Proposals from the room" data-testid="spoken-ideas">
          {s.ideas.map((i, k) => (
            <li key={`${i.pid}-${k}`}>{actions.onProposal
              ? <button type="button" onClick={() => actions.onProposal!(i.pid, i.text)} title="Put this on the table" data-testid="spoken-idea">{i.text}</button>
              : i.text}</li>
          ))}
          {s.ideasMore > 0 && <li className="spoken-more">+{s.ideasMore} more</li>}
        </ul>
      )}
      {s.chain && <ChainMap chain={s.chain} open onLink={actions.onLink} />}
      {s.notice && <p className="spoken-notice" role="status" aria-live="polite" data-testid="spoken-notice">{s.notice}</p>}
      {s.held && (
        <p className="spoken-held" role="status" aria-live="polite" data-testid="spoken-held">
          {s.held}: who spoke? Choose them, or <button type="button" onClick={actions.onVerdictRoom} data-testid="verdict-room">count it for the room</button>.
        </p>
      )}
      <span className="spoken-count" aria-live="polite" data-testid="spoken-count">{count}</span>
    </div>
  );
}
