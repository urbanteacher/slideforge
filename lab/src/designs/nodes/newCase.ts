import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, barCard, chain, heading, label, pill, still } from './look';
import { marked, type NodesFormat } from './types';

// Same link, new case: transfer. Exams test joining, not transfer — of 495 exam parts, 0 asked for strict
// transfer (Nodes). So each link is tried again unsupported, first on a near case, then a far one, where
// only the link stays the same.

export interface NewCase { relation: string; near: string; far: string; same: string }

// GCSE Computer Science, stage 3 (Nodes src/data/stage-ladders.ts).
const STARTER: NewCase = {
  relation: 'Frequency → one cycle is its reciprocal → convert seconds to nanoseconds',
  near: 'Calculate the time for one clock cycle at 2.5 GHz, in nanoseconds.',
  far: 'A wheel turns 50 times a second. How long is one turn, in milliseconds?',
  same: 'The time for one event is the reciprocal of a rate.',
};

export const newCase: NodesFormat<NewCase> = {
  id: 'new-case', label: 'Same link, new case', part: 'Transfer',
  aim: 'The link, then a near case and a far one, with no support: exams test joining, not transfer, so transfer is practised here.',
  howTo: ['The link, as a chain.', 'A near case: same topic, new numbers or words. No support.', 'A far case: another context, the same link. What stays the same?'],
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
    const task = (lbl: string, words: string, near: boolean) => slideOf(`Same link, new case · ${near ? 'near' : 'far'}`, [
      ground(st), label(st, `Same link, new case · ${lbl}`, LEFT, EY, 1300, LINK.J, 30), phonesCue(st, 'answer on your own'),
      ...pill(st, 'Kind', near ? 'Near: same topic, new case' : 'Far: another context, the same link', LEFT, HY, { fill: rgba(LINK.J, 0.18), size: 28 }, still),
      heading(st, words, HY + 110, 72, W - LEFT * 2, 320),
      ...pill(st, 'No support', 'No hints on this one', LEFT, FOOT - 80, { fill: rgba(st.ink, 0.08), size: 26 }, still),
    ], st, `${near ? 'Near' : 'Far'} transfer, unsupported: ${words}`);
    return marked('new-case', [{ slide: linkSlide, role: 'link' }, { slide: task('near', o.near, true), role: 'near' }, { slide: task('far', o.far, false), role: 'far' }], o, { open: { near: o.near, far: o.far } });
  },
};
