import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, after, barCard, chain, heading, label, onClick, pill, still } from './look';
import { marked, type NodesFormat } from './types';

// Same link, new case: transfer. Exams test joining, not transfer — of 495 exam parts, 0 asked for strict
// transfer (Nodes). So each link is tried again unsupported, first on a near case, then a far one, where
// only the link stays the same.

export interface NewCase { relation: string; near: string; far: string; same: string; /** Each case worked through: a step per link of the relation, written into the link's chain on that case's slide (as one
   *  sentence each, from an older AI answer: a slide of their own after the far case). */
  worked?: { near: string | string[]; far: string | string[] } }

// GCSE Computer Science, stage 3 (Nodes src/data/stage-ladders.ts).
const STARTER: NewCase = {
  relation: 'Frequency → one cycle is its reciprocal → convert to the unit asked for',
  near: 'Calculate the time for one clock cycle at 2.5 GHz, in nanoseconds.',
  far: 'A wheel turns 50 times a second. How long is one turn, in milliseconds?',
  same: 'The time for one event is the reciprocal of a rate.',
  worked: {
    near: ['f = 2.5 GHz = 2.5 × 10⁹ Hz', 't = 1 ÷ f = 4 × 10⁻¹⁰ s', '4 × 10⁻¹⁰ s = 0.4 ns'],
    far: ['f = 50 turns a second', 't = 1 ÷ 50 = 0.02 s', '0.02 s = 20 ms'],
  },
};

export const newCase: NodesFormat<NewCase> = {
  id: 'new-case', label: 'Same link, new case', part: 'Transfer',
  aim: 'The link, then a near case and a far one, with no support: exams test joining, not transfer, so transfer is practised here.',
  howTo: ['The link, as a chain.', 'A near case: same topic, new numbers or words. No support.', 'A far case: another context, the same link. What stays the same?', 'On each case, then, its working in the link’s chain: a step per link, a click each.'],
  phones: 'Answer on your own',
  starter: STARTER,
  slides: (st, o) => {
    const links = o.relation.split(/\s*→\s*/).filter(Boolean);
    const linkSlide = slideOf('Same link, new case', [
      ground(st), label(st, 'Same link, new case', LEFT, EY, 1300, LINK.J, 30),
      heading(st, 'The link to carry', HY, 64, W - LEFT * 2, 90),
      ...chain(st, links, LEFT, HY + 160, { h: 170, size: 36, gap: 80, strokes: [LINK.U, LINK.A, LINK.A, LINK.C], build: 'still', name: 'Link' }),
      ...barCard(st, 'Same', LEFT, HY + 400, W - LEFT * 2, 160, LINK.J, rgba(LINK.J, 0.1), still),
      T(st, 'Same — words', `What stays the same: ${o.same}`, LEFT + 44, HY + 424, W - LEFT * 2 - 88, 112, { weight: '700', size: 38, valign: 'middle' }, still),
      T(st, 'Note', 'Exams test joining, not transfer: of 495 exam parts, none asked for strict transfer. Practise it here.', LEFT, FOOT - 70, W - LEFT * 2, 60, { size: 28, color: st.muted }, still),
    ], st, `The link: ${o.relation}. What stays the same: ${o.same}`);
    // A case's working when it has a step per link: drawn as the link's chain, the link's own words as labels above.
    const stepsOf = (v: unknown) => (Array.isArray(v) && v.length === links.length && v.every((x) => typeof x === 'string' && x.trim()) ? v as string[] : null);
    const task = (lbl: string, words: string, near: boolean) => {
      const steps = stepsOf(near ? o.worked?.near : o.worked?.far), gap = 80, bw = Math.floor((W - LEFT * 2 - gap * (links.length - 1)) / Math.max(1, links.length));
      const strokes = [LINK.U, LINK.A, LINK.A, LINK.C];
      return slideOf(`Same link, new case · ${near ? 'near' : 'far'}`, [
        ground(st), label(st, `Same link, new case · ${lbl}`, LEFT, EY, 1300, LINK.J, 30), phonesCue(st, 'answer on your own'),
        ...pill(st, 'Kind', near ? 'Near: same topic, new case' : 'Far: another context, the same link', LEFT, HY, { fill: rgba(LINK.J, 0.18), size: 28 }, still),
        heading(st, words, HY + 100, 64, W - LEFT * 2, steps ? 200 : 320),
        ...(steps ? [
          ...links.map((l, k) => T(st, `Link ${k + 1} — label`, l, LEFT + k * (bw + gap), HY + 340, bw, 34, { weight: '700', size: 24, color: strokes[k] ?? LINK.A, align: 'center', fit: 'shrink' }, k ? after() : onClick())),
          ...chain(st, steps, LEFT, HY + 384, { h: 150, size: 34, gap, strokes, widths: links.map(() => bw), firstOnClick: true, name: 'Step' }),
          ...(near ? [] : [...barCard(st, 'Same', LEFT, HY + 560, W - LEFT * 2, 110, LINK.J, rgba(LINK.J, 0.1), onClick()),
            T(st, 'Same — words', `What stayed the same: ${o.same}`, LEFT + 44, HY + 574, W - LEFT * 2 - 88, 82, { weight: '700', size: 34, valign: 'middle' }, after())]),
        ] : [...pill(st, 'No support', 'No hints on this one', LEFT, FOOT - 80, { fill: rgba(st.ink, 0.08), size: 26 }, still)]),
      ], st, `${near ? 'Near' : 'Far'} transfer, unsupported: ${words}${steps ? `\nWorked, a click a step: ${steps.join(' → ')}` : ''}`);
    };
    // The answers, after both cases: each worked through on a click, then the link that carried across.
    const worked = typeof o.worked?.near === 'string' && typeof o.worked?.far === 'string' && o.worked.near && o.worked.far ? slideOf('Same link, new case · worked', [
      ground(st), label(st, 'Same link, new case · worked', LEFT, EY, 1300, LINK.J, 30),
      heading(st, 'Both cases, worked through', HY, 64, W - LEFT * 2, 90),
      ...[['Near', o.near, o.worked.near], ['Far', o.far, o.worked.far]].flatMap(([k, q, a], i) => {
        const y = HY + 140 + i * 250, anim = onClick();
        return [
          ...barCard(st, `${k} — worked`, LEFT, y, W - LEFT * 2, 220, i ? LINK.C : LINK.A, st.panel, anim),
          T(st, `${k} — question`, `${k.toUpperCase()} · ${q}`, LEFT + 44, y + 22, W - LEFT * 2 - 88, 60, { weight: '700', size: 28, color: st.muted }, after()),
          T(st, `${k} — answer`, a, LEFT + 44, y + 92, W - LEFT * 2 - 88, 100, { weight: '700', size: 44, valign: 'middle' }, after()),
        ];
      }),
      ...barCard(st, 'Same', LEFT, FOOT - 150, W - LEFT * 2, 130, LINK.J, rgba(LINK.J, 0.1), onClick()),
      T(st, 'Same — words', `What stayed the same: ${o.same}`, LEFT + 44, FOOT - 130, W - LEFT * 2 - 88, 90, { weight: '700', size: 36, valign: 'middle' }, after()),
    ], st, `Worked answers. Near: ${o.worked.near}. Far: ${o.worked.far}. What stayed the same: ${o.same}`) : null;
    return marked('new-case', [{ slide: linkSlide, role: 'link' }, { slide: task('near', o.near, true), role: 'near' }, { slide: task('far', o.far, false), role: 'far' },
      ...(worked ? [{ slide: worked, role: 'worked' }] : [])], o, { open: { near: o.near, far: o.far } });
  },
};
