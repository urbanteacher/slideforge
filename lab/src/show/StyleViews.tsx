// The wall's views for the styles beyond Multiple choice's bars, a number line and typed groups (WallViews.tsx):
// each paints a view model the style's `wall` made (live/styles). Real text and ARIA, no canvas (hard rule 4).

import type { SlotsModel } from '../live';

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
