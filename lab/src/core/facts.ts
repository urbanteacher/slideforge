import type { Deck, Layer, Slide } from './types';

// Facts to check before teaching (BACKLOG CS-03, docs/claude-slides-lessons.md). Two signs that a slide is not
// ready to be taught from:
// - a placeholder in its words: square brackets round two or more underscores, as `[€__]`, `[year __]` or
//   `[source __]`. Whoever writes a slide (a person, a builder script, an AI) leaves one where a figure, a name
//   or a source was not given, rather than inventing it;
// - the author's own mark, `slide.factCheck`: the facts on it came from memory and still need a source.
// The editor marks both on the filmstrip and in the Slide panel, and Present says which slides have them.

/** A placeholder: square brackets holding two or more underscores, on one line. */
export const PLACEHOLDER = /\[[^[\]\n]{0,60}?_{2,}[^[\]\n]{0,60}?\]/g;

/** Every string in a value, however deep (a layer's params hold lists and nested records). */
function strings(v: unknown, out: string[], depth = 0): void {
  if (depth > 6 || v == null) return;
  if (typeof v === 'string') { out.push(v); return; }
  if (Array.isArray(v)) { for (const x of v) strings(x, out, depth + 1); return; }
  if (typeof v === 'object') for (const x of Object.values(v as Record<string, unknown>)) strings(x, out, depth + 1);
}

/** The placeholders in a slide's visible words, each once, in the order they appear. Notes are not read: they
 *  are the teacher's, and the class never sees them. */
export function placeholdersOf(slide: Slide): string[] {
  const found: string[] = [];
  const all: string[] = [];
  const visible = (l: Layer) => l.visible !== false;
  for (const l of slide.layers.filter(visible)) strings(l.params, all);
  for (const s of all) for (const m of s.match(PLACEHOLDER) ?? []) if (!found.includes(m)) found.push(m);
  return found;
}

/** One slide with facts to check: its number in the deck (from 1), its placeholders and the author's note
 *  (`null` when it carries no mark). */
export interface FactsToCheck { slideId: string; number: number; name: string; placeholders: string[]; note: string | null }

/** The slide's facts to check, or null when it has none. */
export function factsOf(slide: Slide, number: number): FactsToCheck | null {
  const placeholders = placeholdersOf(slide);
  const note = slide.factCheck ? slide.factCheck.note : null;
  if (!placeholders.length && note === null) return null;
  return { slideId: slide.id, number, name: slide.name, placeholders, note };
}

/** Every shown slide with facts to check, in deck order. Hidden slides are left out: they are not presented. */
export function factsToCheck(deck: Deck): FactsToCheck[] {
  return deck.slides.flatMap((s, i) => (s.hidden ? [] : [factsOf(s, i + 1)].filter((f): f is FactsToCheck => !!f)));
}

/** "4", "4 and 7", "4, 7 and 12": slide numbers as a sentence says them. */
export function sayNumbers(ns: number[]): string {
  if (ns.length < 2) return ns.join('');
  return `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
}

/** A sentence per slide, for the Status row: what to check on each. */
export function describeFacts(list: FactsToCheck[]): string {
  return list.map((f) => {
    const parts = [
      f.placeholders.length ? `fill ${f.placeholders.join(', ')}` : '',
      f.note !== null ? (f.note.trim() ? `check: ${f.note.trim()}` : 'marked as not yet checked') : '',
    ].filter(Boolean);
    return `Slide ${f.number}${f.name ? ` (${f.name})` : ''}: ${parts.join('; ')}.`;
  }).join(' ');
}
