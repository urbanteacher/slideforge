// Slider (style 'slider': a numeric estimate; the 'time-traveler' format is a different format on the same
// engine and is not run here). The phones place a number on a line (`input` 'number', with the range classic
// sends); an answer is right when it lands within the tolerance of the target (SlideForge's own mark). The wall
// counts the answers while the question is open; on the reveal it draws the line, the band, and each answer.
import { formatValue, withUnit } from '@sf/games/marking.js';
import { gameStyle } from '@sf/games/registry.js';
import { defineStyle, type LineModel } from './types';

const num = (v: unknown, fallback = 0): number => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };

export const slider = defineStyle({
  key: 'slider', name: 'Slider', formats: ['slider'], input: 'number',
  // The style's own normalize and compile (src/games/slider.js): an opened-out range, the target inside it, the answer said with its unit.
  prepare(q) {
    const st = gameStyle('slider');
    st.normalize?.(q);
    st.compile?.(q, {}, q);
  },
  range: (q) => ({ min: num(q.min, 0), max: num(q.max, 100), step: num(q.step, 1) || 1, unit: String(q.unit ?? '') }),
  wall(q, answers, revealed) {
    if (!revealed) return { kind: 'line', line: null };
    const min = num(q.min, 0), max = num(q.max, 100), span = max - min || 1;
    const target = num(q.target, min), tol = Math.max(0, num(q.tolerance, 0)), unit = String(q.unit ?? '');
    const pct = (v: number) => Math.round(Math.min(100, Math.max(0, ((v - min) / span) * 100)) * 10) / 10;
    const seen = new Map<number, number>();
    const values: { id: number; response: number }[] = [];
    for (const a of answers) if (typeof a.response === 'number' && Number.isFinite(a.response)) values.push({ id: a.id, response: a.response });
    const marks = values.sort((a, b) => a.response - b.response).map((a) => {
      const row = seen.get(a.response) ?? 0;
      seen.set(a.response, row + 1);
      return { id: a.id, value: a.response, pct: pct(a.response), row, right: slider.mark(q, a.response) };
    });
    const line: LineModel = {
      min, max, unit, target, targetPct: pct(target), lo: target - tol, hi: target + tol, loPct: pct(target - tol), hiPct: pct(target + tol),
      band: withUnit(tol ? `${formatValue(target)} ± ${formatValue(tol)}` : `${formatValue(target)} exactly`, unit), marks,
    };
    return { kind: 'line', line };
  },
});
