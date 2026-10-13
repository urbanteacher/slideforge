// Time traveler (format 'time-traveler', on the slider engine). The phones place an event on one line for the whole
// game (the span of every event in it); each round's line carries the events already placed, so the timeline grows
// across the game. The question frame says so (`timeTravel`, `timeline`) and the phone draws the same growing line.
// Marking, the reveal and the teacher's number entry are Slider's. On the reveal the wall draws Slider's line with the
// events already on it named under the line.
import { slider } from './slider';
import { defineStyle } from './types';

const num = (v: unknown): number => Number(v);
const finite = (v: unknown): boolean => Number.isFinite(num(v));
type Event = { label: string; year: number };

/** The game's questions as one set (src/model.js compile, "Time Traveler's line spans every event in the game"). */
function link(qs: { [field: string]: unknown }[]): void {
  let min = Infinity, max = -Infinity;
  for (const q of qs) {
    if (finite(q.min)) min = Math.min(min, num(q.min));
    if (finite(q.max)) max = Math.max(max, num(q.max));
  }
  if (!(max > min)) { min = 0; max = 100; }
  qs.forEach((q, i) => {
    q.min = min;
    q.max = max;
    q.timeline = qs.slice(0, i)
      .map((prev): Event => ({ label: String(prev.question || '').replace(/^Place it in time:\s*/i, '').slice(0, 60), year: num(prev.target) }))
      .filter((e) => Number.isFinite(e.year) && e.year >= min && e.year <= max);
  });
}

export const timetraveler = defineStyle({
  ...slider,
  key: 'slider', name: 'Time traveler', formats: ['time-traveler'], input: 'number',
  match: (q) => q.format === 'time-traveler',
  link,
  flags: (q) => ({ timeTravel: true, timeline: Array.isArray(q.timeline) ? (q.timeline as unknown[]).slice() : [] }),
  wall(q, answers, revealed, ctx) {
    const d = slider.wall(q, answers, revealed, ctx);
    if (d.kind !== 'line' || !d.line) return d;
    const { min, max } = d.line, span = max - min || 1;
    const events = (Array.isArray(q.timeline) ? q.timeline : []) as Event[];
    return { kind: 'line', line: { ...d.line, timeline: events.map((e) => ({ label: e.label, year: e.year, pct: Math.round(Math.min(100, Math.max(0, ((e.year - min) / span) * 100)) * 10) / 10 })) } };
  },
});
