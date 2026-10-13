// The wall's views for the styles beyond Multiple choice's bars, a number line and typed groups (WallViews.tsx):
// each paints a view model the style's `wall` made (live/styles). Real text and ARIA, no canvas (hard rule 4).

import type { GapsModel, HeatModel, SlotsModel, SortModel, SplitModel } from '../live';

/** A Ranking's reveal: the right order, a heat bar a place for how many of the room had the right item there,
 *  and the pair the room swapped most often. */
export function SlotsView({ model }: { model: SlotsModel }) {
  const { slots, total, swap } = model;
  return (
    <div className="slots" data-testid="slots">
      <ol className="slots-list" aria-label="The right order, and how many put each item in its place">
        {slots.map((s) => (
          <li key={s.place} data-testid="slot">
            <span className="slot-place">{s.place + 1}</span>
            <span className="slot-heat" style={{ ['--w' as string]: `${total ? Math.round((s.here / total) * 100) : 0}%` }} aria-hidden="true" />
            <span className="slot-label">{s.label}</span>
            <b className="slot-count" data-testid="slot-count">{s.here} of {total}</b>
          </li>
        ))}
      </ol>
      {swap && <p className="slots-swap" data-testid="slots-swap">Most swapped: {swap.labels[0]} and {swap.labels[1]} ({swap.n})</p>}
    </div>
  );
}

/** The Showdown: one bar across the two answers, sized by the room's votes now, with a marker where the room stood when
 *  the split was shown; the right side is marked once revealed. Real text beside the bar for a screen reader. */
export function SplitView({ model }: { model: SplitModel }) {
  const { sides, total, switched } = model;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 50);
  const was = sides[0]?.was;
  const wasAt = was != null && total ? Math.round((was / total) * 100) : null;
  return (
    <div className="split" data-testid="split">
      <div className="split-bar" role="img" aria-label={sides.map((s) => `${s.label} ${s.now}`).join(', ')}>
        {sides.map((s, i) => (
          <span key={i} className={`split-seg split-${i}${s.right ? ' right' : ''}`} style={{ ['--w' as string]: `${pct(s.now)}%` }} data-testid="split-seg">
            <span className="split-label">{s.right ? '✓ ' : ''}{s.label}</span><b className="split-n">{s.now}</b>
          </span>
        ))}
        {wasAt != null && <span className="split-was" style={{ left: `${wasAt}%` }} data-testid="split-was" aria-hidden="true" />}
      </div>
      <p className="split-note" data-testid="split-note">
        {was != null ? `When the split was shown: ${sides.map((s) => `${s.label} ${s.was ?? 0}`).join(', ')}. ` : ''}{switched} {switched === 1 ? 'switch' : 'switches'}
      </p>
    </div>
  );
}

/** Spot the error's reveal: the passage in reading order, a bar under every word for how many tapped it (the heat), the
 *  error's words struck out, and the correction said. Real text; the bars are decoration beside the counts. */
export function HeatView({ model }: { model: HeatModel }) {
  const max = Math.max(1, ...model.words.map((w) => w.count));
  return (
    <div className="heat" data-testid="heat">
      <ol className="heat-words" aria-label="Every word, and how many tapped it">
        {model.words.map((w) => (
          <li key={w.index} className={w.error ? 'error' : ''} data-testid="heat-word">
            <span className="heat-label">{w.error ? <s>{w.label}</s> : w.label}</span>
            <span className="heat-bar" style={{ ['--h' as string]: `${Math.round((w.count / max) * 100)}%` }} aria-hidden="true" />
            <b className="heat-count" data-testid="heat-count">{w.count}</b>
          </li>
        ))}
      </ol>
      <p className="heat-answer" data-testid="heat-answer">{model.answer}</p>
    </div>
  );
}

/** Fill the gaps' reveal: the passage with the right word in each gap, and under it, gap by gap, what the room put there
 *  (most chosen first, the right word marked). A lure many chose is the misconception, named without naming anyone. */
export function GapsView({ model }: { model: GapsModel }) {
  const { parts, gaps, total } = model;
  return (
    <div className="gaps" data-testid="gaps">
      <p className="gaps-text" data-testid="gaps-text">
        {parts.map((p, i) => (
          <span key={i}>{p}{gaps[i] && <b className="gaps-word">{gaps[i].word}</b>}</span>
        ))}
      </p>
      <ol className="gaps-picks" aria-label="What the room put in each gap">
        {gaps.map((g, i) => (
          <li key={i} data-testid="gap">
            <span className="gap-no">Gap {i + 1}</span>
            {g.picks.length === 0 && <i className="gap-none">no picks</i>}
            {g.picks.map((p, k) => (
              <span key={k} className={`gap-pick${p.right ? ' right' : ''}`} data-testid="gap-pick">{p.right ? '✓ ' : ''}{p.text} <b>{p.n}</b></span>
            ))}
          </li>
        ))}
      </ol>
      <p className="gaps-total" data-testid="gaps-total">{total} {total === 1 ? 'answer' : 'answers'}</p>
    </div>
  );
}

/** Compare & contrast's reveal: a column for each of the three, each statement in the column it belongs in with how the room
 *  sorted it (a count under each column), and the statement the room misfiled most named. */
export function SortView({ model }: { model: SortModel }) {
  const { bins, rows, total, misfiled } = model;
  return (
    <div className="sort" data-testid="sort">
      <ol className="sort-rows" aria-label="Each statement, its column, and how the room sorted it">
        {rows.map((r, i) => (
          <li key={i} data-testid="sort-row">
            <span className="sort-text">{r.text}</span>
            <span className="sort-cols">
              {bins.map((b, k) => (
                <span key={k} className={`sort-col${k === r.right ? ' right' : ''}`} data-testid="sort-col" title={b}>
                  <span className="sort-bin">{k === r.right ? '✓ ' : ''}{b}</span> <b>{r.counts[k] ?? 0}</b>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
      {misfiled && <p className="sort-misfiled" data-testid="sort-misfiled">Most misfiled: {misfiled.text} ({misfiled.n} of {total})</p>}
    </div>
  );
}
