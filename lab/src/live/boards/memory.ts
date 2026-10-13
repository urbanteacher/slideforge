// The memory boards (board 'memory', one engine, three presets): Memory flip (study clock, then recall from hidden cards, one
// class collection), Memory match (the same with teams taking turns, a point per claim) and Knowledge flip (no study clock: the
// keywords stay up, a team chooses one and explains it). The state and its moves are SlideForge's (src/boards/runtimes/memory.js:
// create, transition, scores, winner); the tick and the command are its runtime's mount and command without the drawing: the
// study clock runs down into recall, the recall clock counts up, and a claim or a pass of a chosen card is reported to the
// journal as classic's onVerdict does (participant: the team whose turn it was, none for one class collection).
import { installMemory } from '@sf/boards/runtimes/memory.js';
import type { BoardCtx, BoardKind, BoardState, BoardWallBase } from './types';

const ns: { Memory?: SFMemoryEngine } = {};
installMemory(ns);
const engine = ns.Memory!;

type Pair = { term: string; definition: string };
type Phase = 'ready' | 'study' | 'recall' | 'complete';
interface MemState extends BoardState { phase: Phase; selected: number; revealed: boolean; turn: number; owners: (number | null)[]; remaining: number; paused: boolean; elapsed: number; attempts: number }
interface MemBoard { kind: 'memoryflip' | 'memorymatch' | 'knowledgeflip'; set: number; sets: number; studySeconds: number; participants: string[]; pairs: Pair[] }

export interface MemoryCard { n: string; face: boolean; term: string | null; definition: string | null; owner: string | null; prompt: string | null; selected: boolean; collected: boolean; selectable: boolean }
export interface MemoryWall extends BoardWallBase {
  kind: MemBoard['kind']; eyebrow: string; phase: Phase; paused: boolean;
  clockLabel: string; clock: string; progress: { label: string; on: boolean }[]; collected: string;
  cards: MemoryCard[];
  /** The check strip for the chosen card: say it first, then reveal and claim (or pass). */
  check: { eyebrow: string; term: string; text: string; actions: { label: string; action: string; primary: boolean }[] } | null;
  caption: string; status: string; tally: string[];
}

const TITLES = { memorymatch: 'MEMORY MATCH', memoryflip: 'MEMORY FLIP', knowledgeflip: 'KNOWLEDGE FLIP' };
const asBoard = (b: Record<string, unknown>) => b as unknown as MemBoard;
const clockText = (s: MemState) => (s.phase === 'study' ? `${Math.ceil(s.remaining)}s` : `${Math.floor(s.elapsed / 60)}:${String(Math.floor(s.elapsed % 60)).padStart(2, '0')}`);

export const memory: BoardKind<MemoryWall> = {
  key: 'memory', formats: ['memory-flip', 'memory-match', 'knowledge-flip'], style: 'memorymatch', interval: 1000, wholeGame: true,
  // classic phoneStyle: the board's own kind.
  styleOf: (b) => String(b.kind || 'memorymatch'),
  companion: { role: 'watch', headPrompt: 'Memory', participation: 'Watch the cards. Explain aloud when it is your turn — the teacher marks the claim.' },
  create: (board) => engine.create(board),
  tick(ctx, dt) {
    const s = ctx.state as MemState;
    if (s.phase === 'study') {
      s.remaining = Math.max(0, s.remaining - dt);
      if (!s.remaining) { ctx.state = engine.transition(ctx.board, s, 'hide'); ctx.paint(); return; }
    } else if (s.phase === 'recall') s.elapsed += dt;
    else return;
    return true;
  },
  command(ctx: BoardCtx, action, card) {
    const b = asBoard(ctx.board), before = ctx.state as MemState;
    const after = engine.transition(ctx.board, before, action, card) as MemState;
    ctx.state = after;
    if ((action === 'claim' || action === 'pass') && before.selected !== -1 && after.selected === -1) {
      ctx.report({
        slideId: ctx.slide.id, title: ctx.slide.title, kind: b.kind, set: b.set, card: before.selected, term: b.pairs[before.selected].term,
        participant: b.participants.length > 1 ? b.participants[before.turn] : null, right: action === 'claim',
      });
    }
    ctx.paint();
  },
  coverText: (b) => {
    const m = asBoard(b);
    // src/boards/memory.js decorateIntro.
    return m.kind === 'knowledgeflip' ? `${m.pairs.length} keywords · explain aloud · no study timer` : `${m.pairs.length} cards · explain aloud · teacher checks`;
  },
  wall(slide, board, state) {
    const b = asBoard(board), s = state as MemState, knowledge = b.kind === 'knowledgeflip';
    const allVisible = knowledge ? s.phase === 'complete' : s.phase === 'study' || s.phase === 'complete';
    const current = s.phase === 'ready' || s.phase === 'study' ? 0 : s.phase === 'complete' ? 2 : 1;
    const cards = b.pairs.map((p, i): MemoryCard => {
      const owned = s.owners[i] !== null, selected = s.selected === i, face = allVisible || owned || selected || knowledge;
      return {
        n: String(i + 1).padStart(2, '0'), face, selected, collected: owned,
        selectable: s.phase === 'recall' && !s.paused && !owned && s.selected === -1,
        term: face ? p.term : null, definition: face && allVisible ? p.definition : null,
        owner: face && !allVisible && owned ? `✓ ${b.participants[s.owners[i]!]}` : null,
        prompt: face ? (allVisible || owned ? null : selected ? 'Explain it aloud' : 'Choose & explain') : 'What do you remember?',
      };
    });
    const actions = [
      ...(s.phase === 'ready' ? [{ label: knowledge ? 'Open the board →' : 'Start studying →', action: 'start', primary: true }] : []),
      ...(s.phase === 'study' ? [{ label: 'Ready to recall →', action: 'hide', primary: true }] : []),
      ...(s.phase === 'study' || s.phase === 'recall' ? [{ label: s.paused ? 'Resume' : 'Pause', action: 'pause', primary: false }] : []),
      ...(s.phase === 'complete' ? [{ label: 'Play this set again', action: 'restart', primary: true }] : []),
    ];
    const pick = s.selected !== -1 && s.phase === 'recall' && !s.paused ? b.pairs[s.selected] : null;
    const check = pick ? {
      eyebrow: knowledge ? 'EXPLAIN FIRST · THEN CHECK' : 'SAY IT FIRST · THEN CHECK', term: pick.term,
      text: s.revealed ? pick.definition : 'Explain the meaning before revealing the definition.',
      actions: [s.revealed ? { label: '✓ Claim card · +1', action: 'claim', primary: true } : { label: 'Reveal definition', action: 'reveal', primary: true },
        { label: s.revealed ? 'Try again next turn' : 'Pass this turn', action: 'pass', primary: false }],
    } : null;
    const many = b.participants.length > 1;
    const caption = s.paused ? 'Paused. Take a moment.'
      : s.phase === 'ready' ? (knowledge ? 'Keywords stay on the board. Choose one, explain it, then collect the card.' : 'Ready? Study the whole set, then recall from the hidden cards.')
        : s.phase === 'study' ? 'Make a connection between each term and its meaning.'
          : s.phase === 'complete' ? engine.winner(board, s)
            : s.selected < 0 ? `${b.participants[s.turn]} — choose a keyword.` : `${b.participants[s.turn]} — explain “${b.pairs[s.selected].term}”.`;
    const status = s.phase === 'complete' ? `${s.attempts} attempts · ${b.pairs.length} cards collected`
      : knowledge ? (many ? 'No study timer · 1 point per claim · turns rotate · misses can be retried' : 'No study timer · explain aloud · teacher checks · misses can be retried')
        : (many ? '1 point per claim · turns rotate after a claim or pass · misses can be retried' : 'One class collection · explain aloud · teacher checks · misses can be retried');
    return {
      key: 'memory', kind: b.kind, title: String(slide.title ?? ''), eyebrow: `${TITLES[b.kind] ?? 'MEMORY'} / SET ${b.set} OF ${b.sets}`, phase: s.phase, paused: s.paused,
      clockLabel: s.phase === 'ready' ? 'READY' : s.phase === 'study' ? 'STUDY' : s.phase === 'complete' ? 'FINISHED' : 'RECALL', clock: clockText(s),
      progress: ['1 · Study', '2 · Recall', '3 · Collect'].map((label, i) => ({ label: knowledge && i === 0 ? '1 · Choose' : label, on: i <= current })),
      collected: `${s.owners.filter((o) => o !== null).length} / ${b.pairs.length} collected`,
      cards, check, caption, status, actions,
      tally: s.phase === 'complete' ? engine.scores(board, s).map((r) => `${r.name} · ${r.score}`) : [],
    };
  },
};
