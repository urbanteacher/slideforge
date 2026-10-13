import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, LINKS, T, barCard, chain, heading, label, onClick, after, pill } from './look';
import { marked, type NodesFormat } from './types';

// Join it up: the join a question needs, then the link to build, as the Nodes decks draw it — a size
// pill, the join as a chain of boxes, and the link to build as a chain filled a link per click. Answers
// lose marks for the link they leave out, not the facts.

export interface JoinItUp {
  question: string;
  /** The command word, for the eyebrow. */
  command: string;
  /** How much the answer needs, in a pill ("Explain: a point, why, and so what"). */
  size: string;
  /** The chain's links in order, each with its name ("Because") and the words that fill it. */
  links: { name: string; text: string }[];
  /** What an answer without the chain gets refused for. */
  refused?: string;
}

const STARTER: JoinItUp = {
  command: 'Explain',
  question: 'Explain why a higher clock speed can improve a CPU’s performance.',
  size: 'Explain: a point, the reason, and what follows from it',
  links: [
    { name: 'Point', text: 'A higher clock speed' },
    { name: 'Because', text: 'means more clock cycles each second' },
    { name: 'So', text: 'the CPU can fetch, decode and execute more instructions each second' },
    { name: 'In this case', text: 'so programs run faster' },
  ],
  refused: 'naming the clock speed without the because and the so: a point with nothing joining it to performance',
};

export const joinItUp: NodesFormat<JoinItUp> = {
  id: 'join-it-up', label: 'Join it up', part: 'The relationship required',
  aim: 'Build the join the question needs, link by link: answers lose marks for the link they leave out, not the facts.',
  howTo: ['Read the question and the join it needs.', 'On phones, put the links in order.', 'Each click builds the next link of the answer.'],
  phones: 'Put the links in order',
  starter: STARTER,
  slides: (st, o) => {
    const links = o.links.slice(0, 5);
    const top = (extra: ReturnType<typeof label>[] = []) => [
      ground(st), label(st, `Join it up · ${o.command}`, LEFT, EY, 1100, st.accent, 30), ...extra,
      heading(st, o.question, HY, 60, W - LEFT * 2, 150),
      ...pill(st, 'Size', o.size, LEFT, HY + 168, { fill: rgba(LINK.A, 0.16), size: 28 }),
      T(st, 'The join', 'The join this question needs:', LEFT, HY + 262, 1200, 50, { weight: '800', size: 38 }),
      ...chain(st, links.map((l) => l.name), LEFT, HY + 326, { h: 92, size: 38, gap: 80, strokes: LINKS, build: 'still', name: 'Join' }),
      T(st, 'The link', 'Here, the link to build:', LEFT, HY + 478, 1200, 50, { weight: '800', size: 38 }),
    ];
    const n = links.length, gap = 64, room = W - LEFT * 2;
    const widths = links.map(() => Math.floor((room - gap * (n - 1)) / n));
    const y2 = HY + 542, h2 = Math.min(220, FOOT - y2);
    const ask = slideOf('Join it up', [
      ...top([phonesCue(st, 'put the links in order')]),
      ...chain(st, links.map(() => '…'), LEFT, y2, { h: h2, size: 40, gap, widths, strokes: LINKS, build: 'still', weight: '400', name: 'Link' }),
    ], st, `Join it up. ${o.question}\nThe join it needs: ${links.map((l) => l.name).join(' → ')}.`);
    const reveal = slideOf('Join it up · the link', [
      ...top(),
      ...chain(st, links.map((l) => l.text), LEFT, y2, { h: h2, size: 34, gap, widths, strokes: LINKS, firstOnClick: true, name: 'Link' }),
    ], st, `Each click builds the next link.\n${links.map((l) => `${l.name}: ${l.text}`).join('\n')}`);
    const slides = [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }];
    if (o.refused) {
      const r = o.refused.charAt(0).toUpperCase() + o.refused.slice(1);
      slides.push({ slide: slideOf('Join it up · refused without it', [
        ground(st), label(st, 'Join it up', LEFT, EY, 1100, st.accent, 30),
        heading(st, 'Refused without it', HY, 64, W - LEFT * 2, 90),
        T(st, 'Refused', `${r}.`, LEFT, HY + 130, W - LEFT * 2, 200, { weight: '600', size: 46 }),
        ...barCard(st, 'The chain', LEFT, HY + 370, W - LEFT * 2, Math.min(300, FOOT - HY - 370), LINK.A, rgba(LINK.A, 0.12), onClick()),
        T(st, 'The chain — label', 'WITH THE CHAIN', LEFT + 50, HY + 400, 1200, 40, { weight: '800', size: 26, color: LINK.A, tracking: 0.08 }, after()),
        T(st, 'The chain — words', links.map((l) => l.text).join(' → '), LEFT + 50, HY + 450, W - LEFT * 2 - 100, Math.min(220, FOOT - HY - 470), { weight: '600', size: 40 }, after()),
      ], st, `Refused without it: ${o.refused}.`), role: 'refused' });
    }
    return marked('join-it-up', slides, o);
  },
};
