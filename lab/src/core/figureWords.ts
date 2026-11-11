// The words of a live figure (slide.figure, src/figures/), so the studio can edit them (docs/editable-figures-plan.md).
// A figure is drawn by SlideForge's figure code from its data; the studio holds a picture of it. Every word a reader
// sees is somewhere in that data, under a key that names it as words (a caption, a row's name, a note's text), or
// inside a drawn picture's SVG as a <text>. This finds them all, for any of the figure kinds, with no code per kind,
// and writes one back. Data that is not words (a country table, ids, colours, formats) is left alone. Pure: no DOM.

import type { LiveFigure } from './types';

/** One word field of a figure: where it is, what to call it, what it says, and which group it is listed under. */
export interface FigureWord {
  /** Where it is: a path into the figure, and for a word inside a drawn SVG, which of its texts. */
  path: (string | number)[];
  svgText?: number;
  /** The group it is listed under: 'Slide', 'Figure', or 'Step 3'. */
  group: string;
  /** What to call it, in the group: 'Row 2 · words'. */
  label: string;
  value: string;
  /** Longer words (an explanation, code): a box of several lines. */
  long: boolean;
}

/** The keys whose string is words a reader sees, and what to call each. */
const WORDS: Record<string, string> = {
  title: 'title', eyebrow: 'eyebrow', caption: 'caption', explain: 'explanation', headline: 'headline', sub: 'sub-line',
  text: 'words', say: 'words', name: 'name', label: 'label', heroLabel: 'label', source: 'source', valueTitle: 'label',
  unit: 'unit', ask: 'question', does: 'what it does', decides: 'who decides', how: 'how', risk: 'risk', ai: 'AI',
  code: 'code', input: 'input', parameter: 'parameter', predicate: 'predicate', response: 'response',
};
/** The figure's own fields, outside its data. */
const OWN: [keyof LiveFigure, string, boolean][] = [['title', 'Title', false], ['figureEyebrow', 'Eyebrow', false], ['figureCredit', 'Credit', false], ['figureAlt', 'Description for screen readers', true]];
/** Lists longer than this are data (a table of countries, a network's stations), not words to edit one by one. */
const MAX_LIST = 40;
const LONG = new Set(['explain', 'code', 'figureAlt']);
/** Containers named for what they hold, for the label: rows → 'Row 2'. */
const ITEM: Record<string, string> = { rows: 'Row', notes: 'Note', refs: 'Line', bands: 'Band', key: 'Key', panels: 'Panel', columns: 'Column', children: 'Part', noteList: 'Note', zones: 'Zone', groups: 'Group', categories: 'Group', ai: 'AI' };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A label from a path inside the data or a step: ['rows', 1, 'say'] → 'Row 2 · words'. */
function labelOf(path: (string | number)[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i], before = path[i - 1];
    if (typeof p === 'number') { parts.push(`${ITEM[String(before)] ?? cap(String(before ?? 'Item'))} ${p + 1}`); continue; }
    if (i === path.length - 1) { parts.push(WORDS[p] ?? p); continue; }
    if (typeof path[i + 1] === 'number') continue; // named by its item: 'Row 2'
    if (ITEM[p] && typeof path[i + 1] === 'string' && i + 1 < path.length - 1) continue; // named by its key: 'Group south asia'
    parts.push(ITEM[String(before)] ? `${ITEM[String(before)]} ${p.replace(/[_-]+/g, ' ')}` : p.replace(/[_-]+/g, ' '));
  }
  // 'Row 2 · words' rather than 'Row 2 · Tag · words' for a tag's text: say 'tag'.
  return cap(parts.join(' · ').replace(/ · tag · words$/i, ' · tag'));
}

// ── Words inside a drawn SVG ─────────────────────────────────────────────────────────────────────────────
/** Each run of words straight after a <text> or <tspan> opens: where it starts and ends in the markup. */
const RUN = /<(text|tspan)\b[^>]*>([^<]*)/g;
const decode = (s: string) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const encode = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The words drawn in an SVG's texts, in order: each run's words and where they sit in the markup. */
export function svgTexts(svg: string): { value: string; start: number; end: number }[] {
  const out: { value: string; start: number; end: number }[] = [];
  for (const m of svg.matchAll(RUN)) {
    if (!m[2].trim()) continue;
    const start = m.index! + m[0].length - m[2].length;
    out.push({ value: decode(m[2]), start, end: start + m[2].length });
  }
  return out;
}

const isSvg = (s: string) => /^\s*<svg[\s>]/i.test(s);

/** Every word field of a figure: its own (title, eyebrow, credit, description), its data's, then each step's. */
export function figureWords(fig: LiveFigure | undefined | null): FigureWord[] {
  if (!fig) return [];
  const out: FigureWord[] = [];
  for (const [k, label, long] of OWN) {
    const v = fig[k];
    if (typeof v === 'string') out.push({ path: [k], group: 'Slide', label, value: v, long });
  }
  const walk = (v: unknown, path: (string | number)[], inside: (string | number)[], group: string) => {
    if (typeof v === 'string') {
      const key = [...inside].reverse().find((p) => typeof p === 'string') as string | undefined;
      if (key === 'svg' && isSvg(v)) {
        svgTexts(v).forEach((t, i) => out.push({ path, svgText: i, group, label: `In the picture · ${i + 1}`, value: t.value, long: false }));
        return;
      }
      if (key && WORDS[key] && v.trim()) out.push({ path, group, label: labelOf(inside), value: v, long: LONG.has(key) || v.length > 90 });
      return;
    }
    if (Array.isArray(v)) {
      if (v.length > MAX_LIST) return;
      v.forEach((x, i) => walk(x, [...path, i], [...inside, i], group));
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, [...path, k], [...inside, k], group);
    }
  };
  walk(fig.figureData, ['figureData'], [], 'Figure');
  (Array.isArray(fig.figureSteps) ? fig.figureSteps : []).forEach((s, i) => walk(s, ['figureSteps', i], [], `Step ${i + 1}`));
  return out;
}

/** The figure with one word field changed: a copy, the original untouched. */
export function setFigureWord(fig: LiveFigure, word: Pick<FigureWord, 'path' | 'svgText'>, value: string): LiveFigure {
  const copy = structuredClone(fig) as unknown as Record<string | number, unknown>;
  let at: Record<string | number, unknown> = copy;
  for (const p of word.path.slice(0, -1)) {
    const next = at[p];
    if (!next || typeof next !== 'object') return fig;
    at = next as Record<string | number, unknown>;
  }
  const last = word.path[word.path.length - 1];
  const now = at[last];
  if (typeof now !== 'string') return fig;
  if (word.svgText == null) { at[last] = value; return copy as unknown as LiveFigure; }
  const run = svgTexts(now)[word.svgText];
  if (!run) return fig;
  at[last] = now.slice(0, run.start) + encode(value) + now.slice(run.end);
  return copy as unknown as LiveFigure;
}

/** The word field whose words are these drawn words: the one that says them, or the longest that
 *  contains them (a figure wraps long words across lines, each line its own text). */
export function wordFor(words: FigureWord[], drawn: string): FigureWord | undefined {
  const t = drawn.replace(/\s+/g, ' ').trim();
  if (!t) return undefined;
  const flat = (w: FigureWord) => w.value.replace(/\s+/g, ' ').trim();
  return words.find((w) => flat(w) === t) ?? words.filter((w) => flat(w).includes(t)).sort((a, b) => a.value.length - b.value.length)[0];
}
