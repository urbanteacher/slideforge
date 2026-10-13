// What the spoken styles share (live/spoken.ts): the phones are told to listen and watch, nothing is answered on them, the
// reveal carries no gains (the relay credits the verdict by the recipient), and the wall draws the verdict pads and who spoke.
import type { RoomQuiz } from '../show';
import { recipientName, speakerKey, type SpokenSpec } from '../spoken';
import { defineStyle, type Briefing, type SpokenWall, type StyleEntry, type WallContext, type WallDetail } from './types';

/** The phones' card for a spoken question (classic's phoneCompanion): their role, what to do, a heading. */
export const spokenBrief = (headPrompt: string): Briefing => ({ role: 'discuss', headPrompt, participation: 'Listen and watch. Be ready to explain aloud; the teacher records the verdict.' });

const IDEAS_SHOWN = 5;

/** The wall's model of a spoken question: the verdicts, the speaker, what the last verdict credited, the game's count. */
export function spokenModel(q: RoomQuiz, spec: SpokenSpec, revealed: boolean, ctx?: WallContext): SpokenWall {
  const room = ctx?.room, sp = room?.spoken;
  const open = room?.feedback, ideas = sp?.proposalPrompt && open?.prompt.id === sp.proposalPrompt && open.digest?.kind === 'brainstorm' ? open.digest.items : [];
  const held = sp?.pending && sp.pending.slideId === q.id ? q.options[sp.pending.choice] ?? '' : '';
  return {
    verdicts: q.options.map((label, index) => ({ index, label })),
    given: revealed ? sp?.verdicts[q.id] ?? null : null,
    who: room && sp ? recipientName(sp.recipient, room.players, room.teams) : '',
    credit: sp?.credit && sp.credit.slideId === q.id ? sp.credit.line : '',
    held,
    count: room ? room.oralCounts[q.gameId] ?? 0 : 0,
    counts: spec.counts,
    face: q.format === 'question-cube' ? String(q.category ?? '') : '',
    speakers: [{ key: 'room', label: 'The room' }, ...(room?.mode === 'teams' ? room.teams.map((name, i) => ({ key: `t${i}`, label: name })) : []), ...(room?.players ?? []).map((p) => ({ key: `p${p.id}`, label: p.name }))],
    speaker: sp ? speakerKey(sp.recipient) : 'room',
    ideas: ideas.slice(0, IDEAS_SHOWN).map((i) => ({ pid: i.pid, text: i.text })), ideasMore: Math.max(0, ideas.length - IDEAS_SHOWN),
    onTable: sp?.onTable && sp.onTable.slideId === q.id ? sp.onTable.text : '',
    speakerLabel: spec.heads ? 'Guesser' : 'Who spoke',
    term: spec.heads ? String(q.term || q.question || '') : '',
    guesser: spec.heads && room && sp ? recipientName(sp.recipient, room.players, room.teams) : '',
    round: spec.heads && sp?.round && sp.round.gameId === q.gameId ? { endsAt: sp.round.endsAt, total: sp.round.total, count: sp.round.count, over: sp.round.over } : null,
  };
}

type Given = Pick<StyleEntry, 'key' | 'name' | 'formats' | 'spoken'> & Partial<StyleEntry> & { headPrompt: string; options: string[] };

/** A spoken style: choice input (the verdict), the phones' brief, no gains, and the spoken wall. `options` are the engine's fixed verdicts. */
export function defineSpoken(g: Given): StyleEntry {
  const { headPrompt, options, ...rest } = g;
  const spec = g.spoken as SpokenSpec;
  return defineStyle({
    input: 'choice',
    // The engine's own compile (src/games): fixed verdicts, the first one right, and no "how sure" (nothing is answered on a phone).
    prepare(q) { q.options = options.slice(); q.correct = 0; q.confidence = false; },
    companion: () => spokenBrief(headPrompt),
    gains: () => [],
    wall: (q, _answers, revealed, ctx): WallDetail => ({ kind: 'spoken', spoken: spokenModel(q, spec, revealed, ctx) }),
    ...rest,
  });
}
