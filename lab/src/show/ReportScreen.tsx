// The class report screen (M11b): when the room has ended, who answered what on each question, accuracy, attendance
// and two CSV downloads, read from the relay's session record (classReport.ts). It says, on the screen, that on the
// free plan the record lasts only until the relay next restarts.

import { Download, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SessionRef } from './hooks';
import { answersCsv, attendanceCsv, fetchReport, FREE_PLAN_NOTE, reportView, type SessionReport } from './classReport';

/** Hand a text to the browser as a file. */
function save(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportScreen({ relay, session, points, onClose }: { relay: string; session: SessionRef; points: Record<number, number>; onClose: () => void }) {
  const [report, setReport] = useState<SessionReport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const load = useCallback(() => {
    setBusy(true); setError('');
    // The relay finishes writing the journal a moment after the room closes (classic waits 250 ms).
    setTimeout(() => {
      fetchReport(relay, session).then((r) => { setReport(r); setBusy(false); }, (e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setBusy(false); });
    }, 300);
  }, [relay, session]);
  useEffect(load, [load]);
  const view = useMemo(() => (report ? reportView(report, points) : null), [report, points]);
  const file = `slideforge-${session.id.slice(0, 8)}`;
  const pc = (n: number | null) => (n == null ? '–' : `${n}%`);
  return (
    <section className="report-screen" role="dialog" aria-label="Class report" data-testid="report">
      <header>
        <h2>Class report{view ? ` · ${view.title}` : ''}</h2>
        <button className="report-close" onClick={onClose} aria-label="Close the report"><X size={18} /></button>
      </header>
      <p className="report-note" role="note" data-testid="report-note">{FREE_PLAN_NOTE}</p>
      {busy && <p role="status">Loading the session record…</p>}
      {error && <p className="report-error" role="alert">{error} <button onClick={load}>Try again</button></p>}
      {view && report && (
        <>
          <p className="report-sum" data-testid="report-sum">
            {view.players} {view.players === 1 ? 'person' : 'people'} · {view.questions.length} {view.questions.length === 1 ? 'question' : 'questions'} · accuracy {pc(view.accuracy)} · {view.attendance.neverAnswered} never answered
            {!view.persisted && ' · some events could not be saved'}
          </p>
          <div className="report-actions">
            <button onClick={() => save(`${file}-answers.csv`, answersCsv(report, view))} data-testid="csv-answers"><Download size={14} /> Answers (CSV)</button>
            <button onClick={() => save(`${file}-attendance.csv`, attendanceCsv(report, view))} data-testid="csv-attendance"><Download size={14} /> Attendance (CSV)</button>
          </div>
          <h3>Questions</h3>
          <ol className="report-questions">
            {view.questions.map((q) => (
              <li key={q.n}>
                <details>
                  <summary><span className="rq-text">{q.n}. {q.question}</span><b className="rq-acc">{pc(q.accuracy)}</b><span className="rq-n">{q.answered} of {q.eligible} answered</span></summary>
                  {q.correct && <p className="rq-right">Answer: {q.correct}</p>}
                  <table><thead><tr><th>Name</th>{view.teams.length > 0 && <th>Team</th>}<th>Answer</th><th></th></tr></thead>
                    <tbody>{q.answers.map((a, i) => (
                      <tr key={i} className={a.outcome}><td>{a.name}</td>{view.teams.length > 0 && <td>{a.team}</td>}<td>{a.answer || '–'}{a.sure ? ` (${a.sure})` : ''}</td><td>{a.outcome}</td></tr>
                    ))}</tbody></table>
                </details>
              </li>
            ))}
          </ol>
          <h3>Attendance and scores</h3>
          <table className="report-people" data-testid="report-people">
            <thead><tr><th>Name</th>{view.teams.length > 0 && <th>Team</th>}<th>Points</th><th>Correct</th><th>Answered</th><th>Time in room</th></tr></thead>
            <tbody>{view.people.map((p) => (
              <tr key={p.id}><td>{p.name}{p.source === 'teacher' ? ' · teacher entry' : ''}</td>{view.teams.length > 0 && <td>{p.team}</td>}<td>{p.points ?? '–'}</td><td>{p.correct}/{p.eligible}</td><td>{p.answered}/{p.eligible}</td><td>{Math.floor(p.connectedSeconds / 60)} min</td></tr>
            ))}</tbody>
          </table>
        </>
      )}
    </section>
  );
}
