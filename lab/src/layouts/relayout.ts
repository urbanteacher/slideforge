// Change layout: the words and pictures of a slide that exists, poured into another layout.
// The new layout is built in the deck's theme with its sample words, then its title takes the old
// slide's title, its other text places take the old slide's other words in order, and its picture
// places take the old pictures. Whatever has no place on the new layout goes to the speaker notes,
// so nothing the teacher wrote is lost (Undo puts the old slide back as well).
import type { Layer, Slide } from '../core';
import { reflowCards } from './cards';

/** Slides that are more than words and pictures: a game, an activity, a live figure, a Nodes stage
 *  or a slide design with its own form. Their layout belongs to what made them. */
export function relayoutBlocked(s: Slide): string | null {
  if (s.game) return 'This slide is a game. Change its look in the Game tab.';
  if (s.activity) return 'This slide is an activity. Change its look in the Activity tab.';
  if (s.nodes) return 'This slide is a Nodes stage, laid out by its format.';
  if (s.figure || s.liveFigure) return 'This slide is a live figure, laid out by the figure itself.';
  if (s.recipe) return 'This slide is a slide design. Change it in the Slide tab, where its form rebuilds it.';
  return null;
}

const textOf = (l: Layer) => (typeof l.params.text === 'string' ? l.params.text : '');
/** Header and footer chrome (layouts/headerFooter.ts) is the deck's, not the slide's words. */
const isChrome = (l: Layer) => typeof l.params.hfSlot === 'string';
const isWords = (l: Layer) => l.kind === 'text' && !isChrome(l) && l.visible !== false && l.face !== 'back';
const size = (l: Layer) => Number(l.params.size ?? 0);
/** A bulleted or numbered list: its lines are separate points. A text layer's list is 'none' when it is not one. */
const isList = (l: Layer) => !!l.params.list && l.params.list !== 'none';

/** The slide's title: the layer the layouts mark as one, else its biggest words. */
function titleOf(layers: Layer[]): Layer | undefined {
  const words = layers.filter(isWords);
  const marked = words.find((l) => l.params.fitGroup === 'title');
  if (marked) return marked;
  return [...words].sort((a, b) => size(b) - size(a))[0];
}

/** A heading set smaller than the title: the head of a card, a term, a step. */
const isHead = (l: Layer, title?: Layer) => l !== title && (l.name === 'Heading' || l.params.cardPart === 'head');

export interface Relayout { slide: Slide; leftover: string[]; picturesLeft: number }

/**
 * `fresh` is the new layout as built (layoutFor); `old` is the slide it replaces. Returns the new
 * slide, keeping the old one's id, notes and show settings, with what did not find a place.
 */
export function relayout(old: Slide, fresh: Slide, slideHeight = 1080): Relayout {
  const s: Slide = structuredClone(fresh);
  s.id = old.id;
  s.notes = old.notes;
  if (old.hidden) s.hidden = true;
  if (old.audience) s.audience = old.audience;
  if (old.headerFooter) s.headerFooter = old.headerFooter;

  const oldTitle = titleOf(old.layers);
  // The old slide's other words, in the order they were laid down (a layout lays each card's head
  // before its words). A list's lines are separate points.
  const oldBody = old.layers.filter((l) => isWords(l) && l !== oldTitle && textOf(l).trim());
  type Unit = { text: string; head: boolean };
  const units: Unit[] = oldBody.flatMap((l) => (isList(l) ? textOf(l).split('\n').filter((t) => t.trim()).map((t) => ({ text: t, head: false })) : [{ text: textOf(l), head: isHead(l, oldTitle) }]));

  const newTitle = titleOf(s.layers);
  const slots = s.layers.filter((l) => isWords(l) && l !== newTitle);
  if (newTitle && oldTitle && textOf(oldTitle).trim()) newTitle.params.text = textOf(oldTitle);
  else if (!newTitle && oldTitle && textOf(oldTitle).trim()) units.unshift({ text: textOf(oldTitle), head: true });

  // A head and the words after it read as one point when they have to share a line.
  const joined = (list: Unit[]) => {
    const out: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const u = list[i], next = list[i + 1];
      if (u.head && next && !next.head) { out.push(`${u.text}: ${next.text}`); i++; } else out.push(u.text);
    }
    return out;
  };

  const leftover: string[] = [];
  // The new layout's places in head-and-words pairs (cards, terms, steps), when every place is in one.
  const pairs: [Layer, Layer][] = [];
  for (let i = 0; i + 1 < slots.length && isHead(slots[i]) && !isHead(slots[i + 1]); i += 2) pairs.push([slots[i], slots[i + 1]]);
  const allPaired = pairs.length > 1 && pairs.length * 2 === slots.length;
  if (allPaired && !units.some((u) => u.head)) {
    // Plain points into pairs: each point is a card's words, numbered, rather than split between a head and its words.
    pairs.forEach(([head, words], i) => { if (units[i]) { head.params.text = String(i + 1); words.params.text = units[i].text; } });
    leftover.push(...units.slice(pairs.length).map((u) => u.text));
  } else if (slots.length === 1 || (slots.length && isList(slots[slots.length - 1]) && units.length > slots.length)) {
    // Fill the places before the last one a unit each; the last (a list, or the only place) takes the rest.
    const lead = slots.slice(0, -1);
    lead.forEach((slot, i) => { if (units[i]) slot.params.text = units[i].text; });
    const rest = units.slice(lead.length);
    const last = slots[slots.length - 1];
    if (rest.length) last.params.text = joined(rest).join('\n');
  } else {
    slots.forEach((slot, i) => { if (units[i]) slot.params.text = units[i].text; });
    leftover.push(...joined(units.slice(slots.length)));
  }

  // Pictures go to the new layout's empty picture places, in order.
  const pictures = old.layers.filter((l) => l.kind === 'image' && typeof l.params.src === 'string' && l.params.src);
  const places = s.layers.filter((l) => l.kind === 'image' && !l.params.src);
  pictures.forEach((p, i) => {
    const place = places[i];
    if (!place) return;
    place.params.src = p.params.src;
    if (p.params.alt) place.params.alt = p.params.alt;
    place.name = p.name;
  });
  const picturesLeft = Math.max(0, pictures.length - places.length);

  if (leftover.length) s.notes = [s.notes, `From the old layout:\n${leftover.join('\n')}`].filter((t) => t && t.trim()).join('\n\n');
  reflowCards(s, slideHeight);
  return { slide: s, leftover, picturesLeft };
}
