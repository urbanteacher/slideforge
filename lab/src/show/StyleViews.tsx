// The wall's views for the styles beyond Multiple choice's bars, a number line and typed groups (WallViews.tsx):
// each paints a view model the style's `wall` made (live/styles). Real text and ARIA, no canvas (hard rule 4).

import type { SlotsModel, SplitModel } from '../live';

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
