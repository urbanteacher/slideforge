import type { LayoutStyle } from '../../layouts';
import type { Layer } from '../../core';
import { BASE, FOOT, HY, LEFT, LIFT, PAD, W, box, eyebrow, ground, hero, part, phonesCue, rect, slideOf, tint, txt } from '../engage/kit';
import { marked, type NodesFormat } from './types';

// Join it up: the chain a question needs, link by link. Nodes' finding is that answers lose marks for
// the relationship they leave out, not the facts. The wall shows the empty chain under the question;
// the phones put the links in order; the reveal fills the chain a link per click.

export interface JoinItUp {
  question: string;
  /** The command word, for the eyebrow. */
  command: string;
  /** The chain's links in order, each with its name ("Because") and the words that fill it. */
  links: { name: string; text: string }[];
  /** What an answer without the chain gets refused for, for the notes. */
  refused?: string;
}

const STARTER: JoinItUp = {
  command: 'Explain',
  question: 'Explain why a higher clock speed can improve a CPU’s performance.',
  links: [
    { name: 'Point', text: 'A higher clock speed' },
    { name: 'Because', text: 'means more clock cycles each second' },
    { name: 'So', text: 'the CPU can fetch, decode and execute more instructions each second' },
    { name: 'In this case', text: 'so programs run faster' },
  ],
  refused: 'Naming the clock speed without the because and so: a point with no relationship to performance.',
};

/** The chain as columns under the question, each link's name at the top; filled when `filled`. */
function chain(st: LayoutStyle, o: JoinItUp, top: number, filled: boolean): Layer[] {
  const links = o.links.slice(0, 5);
  const n = Math.max(1, links.length), colW = W / n;
  const out: Layer[] = [];
  links.forEach((l, i) => {
    const x0 = Math.round(i * colW), x1 = Math.round((i + 1) * colW);
    const col = box(x0, top, x1 - x0, BASE - top);
    const pad = i === 0 ? LEFT : PAD;
    const inner = (dy: number, h: number) => box(col.x + pad, col.y + dy, col.w - pad - PAD, h);
    out.push(
      rect(`${l.name} — column`, col, tint(st, i), { type: 'fade', duration: 0.6 }),
      rect(`${l.name} — bar`, box(col.x, col.y, col.w, 12), st.accent, { type: 'wipeRight', duration: 0.6 }),
      txt(`${l.name} — name`, l.name, inner(44, 90), { font: st.display, weight: st.displayWeight, size: n >= 5 ? 64 : 76, color: st.accent, lineHeight: 1, fitGroup: 'link-name' }, { type: 'fade', duration: 0.6 }),
    );
    if (i) out.push(txt(`${l.name} — arrow`, '→', box(col.x - 34, col.y + 50, 68, 76), { font: st.body, weight: '700', size: 60, color: st.accent, align: 'center' }));
    if (filled) {
      const p = part('links', i, 'on', 0);
      out.push(txt(`${l.name} — link`, l.text, inner(160, FOOT - col.y - 160), { font: st.body, weight: '600', size: n >= 5 ? 44 : 52, color: st.ink, lineHeight: 1.25, fitGroup: 'link-text' }, p.lead('rise')));
    } else {
      out.push(txt(`${l.name} — blank`, '…', inner(160, 90), { font: st.body, weight: '400', size: 64, color: st.muted }));
    }
  });
  return out;
}

export const joinItUp: NodesFormat<JoinItUp> = {
  id: 'join-it-up', label: 'Join it up', part: 'The relationship required',
  aim: 'Build the chain the question needs, link by link: answers lose marks for the link they leave out, not the facts.',
  howTo: ['Read the question: what must the answer connect?', 'On phones, put the links in order.', 'Each click fills the next link on the wall.'],
  phones: 'Put the links in order',
  starter: STARTER,
  slides: (st, o) => {
    const top = 520 - LIFT;
    const ask = slideOf('Join it up', [
      ground(st), eyebrow(st, `Join it up · ${o.command}`), phonesCue(st, 'put the links in order'),
      hero(st, 'Question', o.question, box(LEFT, HY, W - LEFT * 2, top - HY - 36), 104),
      ...chain(st, o, top, false),
    ], st, `Join it up. ${o.question}\nThe chain: ${o.links.map((l) => `${l.name}: ${l.text}`).join(' → ')}`);
    const reveal = slideOf('Join it up · the chain', [
      ground(st), eyebrow(st, `Join it up · the chain`),
      hero(st, 'Question', o.question, box(LEFT, HY, W - LEFT * 2, top - HY - 36), 84),
      ...chain(st, o, top, true),
    ], st, [`Each click fills the next link.`, o.links.map((l) => `${l.name}: ${l.text}`).join('\n'), o.refused ? `Refused without it: ${o.refused}` : ''].filter(Boolean).join('\n\n'));
    return marked('join-it-up', [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }], o);
  },
};
