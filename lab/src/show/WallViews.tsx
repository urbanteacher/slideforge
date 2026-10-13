// The room's wall, in HTML over the slide the DeckPlayer draws (hard rule 4): real text, live regions for what
// changes (who joined, how many have answered, the answer, the scores), never painted into the canvas. What
// to show comes from wallModel.ts; this only paints it.

import { useEffect, useMemo, useState } from 'react';
import { qrSvg } from './qr';
import { clockOf, type Clock } from './clock';
import type { Rail } from './rail';
import { parseRoster, type LineModel, type TeamRow } from '../live';
import { GapsView, HeatView, SlotsView, SortView, SplitView } from './StyleViews';
import type { Wall } from './wallModel';

const TOP = 8;

/** The teams as the lobby and the boards list them: a colour, a name, who is in it. */
function TeamChips({ teams, names }: { teams: TeamRow[]; names?: boolean }) {
  return (
    <ul className="team-chips" aria-label="Teams" data-testid="teams">
      {[...teams].sort((a, b) => a.index - b.index).map((t) => (
        <li key={t.index} style={{ ['--team' as string]: t.color }} data-testid="team-chip">
          <span className="team-swatch" aria-hidden="true" /><b>{t.name}</b><i>{t.members} {t.members === 1 ? 'player' : 'players'}</i>
          {names && t.names.length > 0 && <span className="team-names">{t.names.join(', ')}</span>}
        </li>
      ))}
    </ul>
  );
}

/** The teacher's class list: names pasted a line each, added to the room (to a team, in a teams room). Not for the wall's audience, so it is small. */
function RosterPaste({ teams, have, onAdd }: { teams: TeamRow[] | null; have: string[]; onAdd: (names: string[], team: number) => void }) {
  const [text, setText] = useState('');
  const [team, setTeam] = useState(0);
  const [said, setSaid] = useState('');
  const add = () => {
    const r = parseRoster(text, have);
    if (r.names.length === 0) { setSaid(r.skipped ? 'Those names are already in the room' : 'Paste some names first'); return; }
    onAdd(r.names, team);
    setText('');
    setSaid(`Added ${r.names.length}${r.skipped ? `, ${r.skipped} already in` : ''}`);
  };
  return (
    <details className="roster-paste" data-testid="roster">
      <summary>Add a class list</summary>
      <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={'One name a line, or paste a column from a spreadsheet'} aria-label="Class list" data-testid="roster-text" />
      <div className="roster-row">
        {teams && (
          <label>Team <select value={team} onChange={(e) => setTeam(Number(e.target.value))} aria-label="Team for these names">
            {teams.map((t) => <option key={t.index} value={t.index}>{t.name}</option>)}
          </select></label>
        )}
        <button type="button" onClick={add} data-testid="roster-add">Add names</button>
        <span role="status" aria-live="polite" data-testid="roster-said">{said}</span>
      </div>
    </details>
  );
}

export function Lobby({ wall, connected, error, onStart, onRoster }: { wall: Wall; connected: boolean; error: string | null; onStart: () => void; onRoster?: (names: string[], team: number) => void }) {
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
            {wall.teams && <TeamChips teams={wall.teams} names />}
            {!wall.teams && (
              <ul className="lobby-list" aria-label="Players who have joined">
                {wall.players.map((p) => <li key={p.id} className={p.connected ? '' : 'away'}>{p.name}</li>)}
              </ul>
            )}
            {onRoster && <RosterPaste teams={wall.teams} have={wall.players.map((p) => p.name)} onAdd={onRoster} />}
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

/** After the reveal, by the question's view (live/styles `wall`): bars of votes, what the room typed, or a number
 *  line. The right answer is said aloud to a screen reader. */
export function RevealStrip({ q }: { q: NonNullable<Wall['question']> }) {
  const d = q.detail;
  const unmarked = d.kind === 'bars' && d.unmarked;
  const said = (
    <p className="tally-said" role="status" aria-live="polite" data-testid="reveal-said">
      {q.locked ? (d.kind === 'split' ? 'The split is up. Every phone may switch once; the answer comes next.' : `Predictions locked: ${q.answered} of ${q.players}. The answer comes next.`) : unmarked ? `The prepared odd one out: ${q.answer}.` : `Answer: ${q.answer}. ${q.right} of ${q.answered} got it right.`}{q.explanation ? ` ${q.explanation}` : ''}
    </p>
  );
  if (d.kind === 'line') return <div className="wall-strip wall-tally tally-line" data-testid="tally">{d.line && <NumberLine line={d.line} />}{said}</div>;
  if (d.kind === 'split') return <div className="wall-strip wall-tally tally-split" data-testid="tally"><SplitView model={d.split} />{said}</div>;
  if (d.kind === 'sort') return <div className="wall-strip wall-tally tally-sort" data-testid="tally">{d.sort && <SortView model={d.sort} />}{said}</div>;
  if (d.kind === 'gaps') return <div className="wall-strip wall-tally tally-gaps" data-testid="tally">{d.gaps && <GapsView model={d.gaps} />}{said}</div>;
  if (d.kind === 'heat') return <div className="wall-strip wall-tally tally-heat" data-testid="tally">{d.heat && <HeatView model={d.heat} />}{said}</div>;
  if (d.kind === 'slots') return <div className="wall-strip wall-tally tally-slots" data-testid="tally">{d.slots && <SlotsView model={d.slots} />}{said}</div>;
  const typed = d.kind === 'typed' ? d.groups : null;
  const pair = d.kind === 'bars' && d.pair;
  const rows = typed ? typed.map((g, i) => ({ key: i, label: g.text, count: g.n, right: g.right })) : q.options.map((o) => ({ key: o.index, label: o.label, count: o.count, right: o.correct }));
  const max = Math.max(1, ...rows.map((o) => o.count));
  return (
    <div className={`wall-strip wall-tally${pair ? ' tally-pair' : ''}${typed ? ' tally-typed' : ''}`} data-testid="tally">
      <ul className="tally-list" aria-label={typed ? 'What the room typed' : pair ? 'Votes for True and False' : 'Votes for each option'}>
        {rows.map((o) => (
          <li key={o.key} className={o.right ? 'right' : ''} data-testid={typed ? `typed-${o.key}` : `tally-${o.key}`}>
            <span className="tally-bar" style={{ ['--w' as string]: `${Math.round((o.count / max) * 100)}%` }} aria-hidden="true" />
            <span className="tally-label">{o.right ? '✓ ' : ''}{o.label}</span>
            <b className="tally-count">{o.count}</b>
          </li>
        ))}
        {typed && rows.length === 0 && <li className="tally-none" data-testid="typed-none">Nobody typed an answer.</li>}
      </ul>
      {said}
    </div>
  );
}

/** A Slider's reveal: the line, the band the target allows, the target, and each answer as a dot (right ones
 *  filled green); dots on the same value stack. The accepted answer and its unit are said in words below. */
function NumberLine({ line }: { line: LineModel }) {
  const rows = Math.max(1, ...line.marks.map((m) => m.row + 1));
  return (
    <figure className="numline" data-testid="numline" aria-label={`Number line from ${line.min} to ${line.max}. Accepted: ${line.band}`} style={{ ['--rows' as string]: rows }}>
      <div className="numline-track">
        <span className="numline-band" style={{ left: `${line.loPct}%`, width: `${Math.max(0.5, line.hiPct - line.loPct)}%` }} data-testid="numline-band" aria-hidden="true" />
        <span className="numline-target" style={{ left: `${line.targetPct}%` }} data-testid="numline-target" aria-hidden="true" />
        {line.marks.map((m) => (
          <span key={m.id} className={`numline-dot${m.right ? ' right' : ''}`} style={{ left: `${m.pct}%`, bottom: `calc(var(--u) * ${14 + m.row * 22})` }} data-testid="numline-dot" title={`${m.value}`} />
        ))}
      </div>
      {line.timeline && line.timeline.length > 0 && (
        <ul className="numline-events" aria-label="Already on the timeline" data-testid="numline-events">
          {line.timeline.map((e, i) => <li key={i} style={{ left: `${e.pct}%` }}><i aria-hidden="true" />{e.label} <b>{e.year}</b></li>)}
        </ul>
      )}
      <div className="numline-ends" aria-hidden="true"><span>{line.min}</span><b data-testid="numline-band-label">{line.band}</b><span>{line.max}</span></div>
    </figure>
  );
}

/** Team standings: a row a team, best first, with the team's colour. */
function TeamBoard({ teams, label = 'Team scores' }: { teams: TeamRow[]; label?: string }) {
  return (
    <ol role="list" className="team-board" aria-label={label} aria-live="polite">
      {teams.map((t) => (
        <li key={t.index} style={{ ['--team' as string]: t.color }} data-testid="team-row">
          <span className="board-rank">{t.rank}</span><span className="board-name"><span className="team-swatch" aria-hidden="true" />{t.name} <i>{t.members}</i></span><b className="board-score">{t.score}</b>
        </li>
      ))}
    </ol>
  );
}

export function Leaderboard({ wall }: { wall: Wall }) {
  const rows = wall.board.slice(0, TOP);
  return (
    <section className="wall wall-board" aria-label={wall.final ? 'Final scores' : 'Leaderboard'} data-testid="board">
      <h2>{wall.final ? 'Final scores' : 'Leaderboard'}</h2>
      {wall.teams && <TeamBoard teams={wall.teams} />}
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
            <li key={r.id} className={r.connected ? '' : 'away'} style={r.color ? { ['--team' as string]: r.color } : undefined} data-testid="rail-row">
              <span className="board-rank">{r.rank}</span><span className="board-name">{r.color && <span className="team-swatch" aria-hidden="true" />}{r.name}</span>
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

/** The room has ended (or is ending): the final standings, and the way to the class report (ReportScreen), and to the shell's Reports. */
/** A question from the room, on the wall while the teacher has it there (classic's question card). */
export function QaCard({ qa }: { qa: NonNullable<Wall['qa']> }) {
  return (
    <section className="wall-qa" aria-label="A question from the room" aria-live="polite" data-testid="wall-qa">
      <p className="wall-qa-label">From the room</p>
      <p className="wall-qa-text">{qa.text}</p>
      <p className="wall-qa-foot">{qa.name && <span>{qa.name}</span>}{qa.votes > 1 && <span>▲ {qa.votes} also asked this</span>}</p>
    </section>
  );
}

export function Ended({ wall, closing, onReport, onShellReport, onClose }: { wall: Wall; closing: boolean; onReport?: () => void; onShellReport?: () => void; onClose: () => void }) {
  const rows = wall.board.slice(0, TOP);
  return (
    <section className="wall wall-board wall-ended" aria-label="The room has ended" data-testid="ended">
      <h2>{closing ? 'Ending the room…' : 'The room has ended'}</h2>
      {wall.teams && <TeamBoard teams={wall.teams} label="Final team scores" />}
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
        {onReport && <button className="wall-start" onClick={onReport} disabled={closing} data-testid="open-report">Class report</button>}
        {onShellReport && <button className="wall-start" onClick={onShellReport} disabled={closing}>Open in Reports</button>}
        <button className="wall-start" onClick={onClose}>Back to the lesson</button>
      </div>
    </section>
  );
}
