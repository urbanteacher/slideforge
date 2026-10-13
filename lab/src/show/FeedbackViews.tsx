// The wall's audience-feedback views (model: feedbackWall.ts): the prompt, then a poll's bars, a scale's spread
// with its two ends named, a word cloud, or idea cards. 'rail' sits beside the slide (as the standings do),
// 'focus' fills the screen. Real text with a live region for the count, never painted into the canvas (hard rule 4).

import type { FbBar, FeedbackWall } from './feedbackWall';

function Bars({ bars, label }: { bars: FbBar[]; label: string }) {
  return (
    <ul className="fb-bars" aria-label={label} data-testid="fb-bars">
      {bars.map((b) => (
        <li key={b.index} className={b.leading ? 'lead' : ''} data-testid={`fb-bar-${b.index}`}>
          <span className="fb-fill" style={{ ['--w' as string]: `${b.pct}%` }} aria-hidden="true" />
          <span className="fb-label">{b.label}</span>
          <b className="fb-n">{b.count}</b>
        </li>
      ))}
    </ul>
  );
}

function Scale({ fb }: { fb: FeedbackWall }) {
  const s = fb.scale!;
  const top = Math.max(1, ...s.points.map((p) => p.count));
  return (
    <figure className="fb-scale" data-testid="fb-scale" aria-label={`Scale from ${s.low} to ${s.high}`}>
      <div className="fb-cols">
        {s.points.map((p) => (
          <div key={p.index} className={`fb-col${p.leading ? ' lead' : ''}`} data-testid={`fb-point-${p.index}`}>
            <b className="fb-n">{p.count}</b>
            <span className="fb-colbar" style={{ ['--h' as string]: `${Math.round((p.count / top) * 100)}%` }} aria-hidden="true" />
            <span className="fb-label">{p.label}</span>
          </div>
        ))}
      </div>
      <div className="fb-ends"><span data-testid="fb-low">{s.low}</span><span data-testid="fb-high">{s.high}</span></div>
      {s.mean && <p className="fb-mean" data-testid="fb-mean">Average {s.mean}</p>}
    </figure>
  );
}

export function FeedbackView({ fb }: { fb: FeedbackWall }) {
  const focus = fb.presentAs === 'focus';
  return (
    <section className={`wall-fb ${focus ? 'fb-focus' : 'fb-rail'}`} aria-label="Audience feedback" data-testid="feedback" data-kind={fb.kind} data-present={fb.presentAs}>
      <h2 className="fb-prompt" data-testid="fb-prompt">{fb.prompt}</h2>
      <p className="fb-said" role="status" aria-live="polite" aria-atomic="true" data-testid="fb-said">{fb.said}</p>
      {fb.held && <p className="fb-held" data-testid="fb-held">The results are held until you show them.</p>}
      {fb.kind === 'poll' && !fb.held && <Bars bars={fb.bars} label="Votes for each option" />}
      {fb.kind === 'scale' && fb.scale && <Scale fb={fb} />}
      {fb.kind === 'wordcloud' && (
        <p className="fb-cloud" aria-label="Words from the room" data-testid="fb-cloud">
          {fb.words.length === 0 && <span className="fb-none">No words yet.</span>}
          {fb.words.map((w) => <span key={w.text} className="fb-word" style={{ fontSize: `calc(var(--u) * ${w.size})` }} title={`${w.n}`} data-testid="fb-word">{w.text}</span>)}
        </p>
      )}
      {fb.kind === 'brainstorm' && (
        <ul className="fb-ideas" aria-label="Ideas from the room" data-testid="fb-ideas">
          {fb.ideas.length === 0 && <li className="fb-none">No ideas yet.</li>}
          {fb.ideas.map((it) => <li key={it.key} data-testid="fb-idea"><span className="fb-text">{it.text}</span>{it.name && <i className="fb-name">{it.name}</i>}</li>)}
        </ul>
      )}
    </section>
  );
}
