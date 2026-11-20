import { kind } from '../../engine';
import { useStore } from '../../store';
import type { Layer } from '../../core';

/** Whether the layer's kind has this param, so a format control can act on it. */
export const has = (l: Layer | null, key: string) => !!l && kind(l.kind).params.some((d) => d.key === key);

export type FormatToggle = 'bold' | 'italic' | 'underline';

/** The text box being typed in, when words are selected in it: its element and the selection. */
function selection(): { el: HTMLTextAreaElement; a: number; b: number } | null {
  const el = document.querySelector('textarea.text-editor') as HTMLTextAreaElement | null;
  if (!el || document.activeElement !== el || el.selectionStart === el.selectionEnd) return null;
  return { el, a: el.selectionStart, b: el.selectionEnd };
}

/** Words selected while typing, marked bold (**…**) or in the emphasis colour (==…==), or the mark taken off when they
 *  have it. True when it acted on a selection; false when nothing was selected (the caller formats the whole box). */
export function markSelection(l: Layer, mark: '**' | '=='): boolean {
  const s = selection();
  if (!s || l.kind !== 'text') return false;
  const text = String(l.params.text ?? '');
  // Leading and trailing spaces stay outside the marks, so the words keep their gaps.
  let { a, b } = s;
  while (a < b && /\s/.test(text[a])) a++;
  while (b > a && /\s/.test(text[b - 1])) b--;
  if (a === b) return false;
  const inside = text.slice(a, b);
  const wrapped = text.slice(a - 2, a) === mark && text.slice(b, b + 2) === mark;
  const next = wrapped
    ? text.slice(0, a - 2) + inside + text.slice(b + 2)
    : inside.startsWith(mark) && inside.endsWith(mark) && inside.length > 4
      ? text.slice(0, a) + inside.slice(2, -2) + text.slice(b)
      // Marked line by line, so a mark never runs across a line break.
      : text.slice(0, a) + inside.split('\n').map((line) => (line.trim() ? `${mark}${line}${mark}` : line)).join('\n') + text.slice(b);
  useStore.getState().updateLayer(l.id, (x) => { x.params.text = next; });
  requestAnimationFrame(() => { s.el.focus(); s.el.setSelectionRange(a, b + (next.length - text.length)); });
  return true;
}

/** Bold, italic and underline, shared by the format bar and the ⌘B / ⌘I / ⌘U shortcuts. */
export function toggleFormat(l: Layer, what: FormatToggle) {
  const { updateLayer } = useStore.getState();
  // Bold with words selected while typing: those words only.
  if (what === 'bold' && markSelection(l, '**')) return;
  if (what === 'bold' && has(l, 'weight')) updateLayer(l.id, (x) => { x.params.weight = Number(x.params.weight) >= 600 ? '400' : '700'; });
  if (what !== 'bold' && has(l, what)) updateLayer(l.id, (x) => { x.params[what] = !x.params[what]; });
}
