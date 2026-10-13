// The boards against the classic host's recordings (lab-engine-plan M8; the harness and what it normalises are in replay-kit.ts and
// live-replay.test.ts). A board is played on the wall and no phone answers: the room's frames are the step's `at` and `idle` (with
// the board's companion for the phones) and, for each verdict, an `oral` record for the journal. The teacher's presses on the
// board's buttons are the recorder's `board: click` steps, played here as the board's commands.
//
// Differences kept visible, none removed: (1) the steps around the board carry the game's skin ('count'), as SlideForge's show
// gives them and recordedShow does not know to. (2) recordedShow builds every content slide as a plain step; the board's step is
// set here from the starter's compiled board slide, as the lab's show builds it from `game.board` (live-boards.test.ts checks that).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RoomShow } from '../src/live';
import { assertSame, list, load, replay, type Step } from './replay-kit';

/** The board's buttons, by the label the recorder clicked (src/boards/runtimes/lowstakes.js render). */
const LOWSTAKES: Record<string, string> = {
  'Start the quiz →': 'start', 'Reveal answers now': 'reveal', 'Pause': 'pause', 'Resume': 'pause', 'Reveal answers →': 'reveal',
  'Finish': 'finish', 'Play again': 'restart', 'Play this quiz again': 'restart',
};

/** `style`: the board step's skin (classic phoneStyle: the board's key, or a memory board's own kind). */
function boardOn(format: string, field: string, key: string, skin: string, style = key) {
  return (show: RoomShow) => {
    const starter = list.find((g) => g.format === format)!;
    const compiled = starter.slides.find((s) => s[field])!;
    for (const s of show.slides) {
      if (s.text === (compiled.bullets as string[]).join('\n') && s.title === compiled.title) { s.board = { key, slide: { ...compiled, id: s.id } }; s.style = style; }
      else if (!s.quiz) s.style = skin;
    }
  };
}

/** A pressed button as the board's command: by its label, or (`card`) a card or cell read off the label. */
type Press = { action: string; card?: number };
const click = (labels: Record<string, string>, card?: (label: string, cls: string) => Press | null) => (s: Step, host: { boardCommand(action: string, card?: number): boolean }) => {
  if (s.what !== 'board: click') return;
  const [cls, label] = String(s.button ?? '').split(' | ');
  const press = labels[label] ? { action: labels[label] } : card?.(label, cls) ?? null;
  assert.ok(press, `a button the board has: ${label}`);
  assert.equal(host.boardCommand(press.action, press.card), true);
};

/** The memory boards' buttons (src/boards/runtimes/memory.js render); a card's label starts with its number. */
const MEMORY: Record<string, string> = {
  'Start studying →': 'start', 'Open the board →': 'start', 'Ready to recall →': 'hide', 'Pause': 'pause', 'Resume': 'pause',
  'Play this set again': 'restart', 'Reveal definition': 'reveal', '✓ Claim card · +1': 'claim', 'Pass this turn': 'pass', 'Try again next turn': 'pass',
};
const memoryCard = (label: string, cls: string): Press | null => (/mem-card/.test(cls) ? { action: 'select', card: Number(label.slice(0, 2)) - 1 } : null);

// Low-stakes quiz (style 'lowstakes', format 'low-stakes-quiz'): the class writes on paper against one clock for the whole quiz, then
// the answers are revealed. The board's step tells the phones `role: 'paper'`; each early reveal (Reveal answers before the clock ran
// out) sends an `oral` record, "5 questions · early reveal" by "The class", which the relay journals. Six rounds of start, reveal,
// finish and play again: six records. No scores slide and no `finish`: the game has no scoreboard.
test('the lab host sends what the classic host sent for a Low-stakes quiz board', async () => {
  const rec = load('game-low-stakes-quiz');
  const { host, classic, lab } = await replay(rec, 'low-stakes-quiz', false, boardOn('low-stakes-quiz', 'lowstakesBoard', 'lowstakes', 'count'), click(LOWSTAKES));
  assertSame(lab, classic);
  const oral = lab.filter((f) => f.t === 'oral');
  assert.equal(oral.length, 6);
  for (const o of oral) { assert.equal(o.kind, 'lowstakes'); assert.equal(o.term, '5 questions · early reveal'); assert.equal(o.participant, 'The class'); }
  const idle = lab.filter((f) => f.t === 'idle').pop()!;
  assert.equal(idle.role, 'paper');
  const entry = Object.values(host.state.boards)[0];
  assert.equal(entry.state.phase, 'ready', 'the last press was Play this quiz again');
  assert.ok(host.state.ended);
});

// The memory boards (board 'memory', one engine, three presets): the class or the teams recall aloud and the teacher checks each
// claim on the wall. The board's step tells the phones `role: 'watch'` with the board's own kind as its skin ('memoryflip', …),
// the steps around it the style's 'claim'. Each claim of a chosen card sends an `oral` record: the card, its term, and the team
// whose turn it was (none for one class collection). The recorder played two rounds (the second cut off by its click budget).
const MEMORY_GAMES: [string, string, string, number, (string | null)[]][] = [
  ['game-memory-flip', 'memory-flip', 'memoryflip', 6, [null]],
  ['game-memory-match', 'memory-match', 'memorymatch', 6, ['Red', 'Blue', 'Green', 'Yellow', 'Red', 'Blue']],
  ['game-knowledge-flip', 'knowledge-flip', 'knowledgeflip', 7, [null]],
];
for (const [name, format, kind, n, who] of MEMORY_GAMES) {
  test(`the lab host sends what the classic host sent for a ${format} board`, async () => {
    const { host, classic, lab } = await replay(load(name), format, false, boardOn(format, 'memoryBoard', 'memory', 'claim', kind), click(MEMORY, memoryCard));
    assertSame(lab, classic);
    const oral = lab.filter((f) => f.t === 'oral');
    assert.equal(oral.length, n);
    oral.forEach((o, i) => { assert.equal(o.kind, kind); assert.equal(o.right, true); assert.equal(o.participant, who[i % who.length]); });
    assert.equal(lab.filter((f) => f.t === 'idle').pop()!.role, 'watch');
    const entry = Object.values(host.state.boards)[0];
    assert.equal(entry.state.phase, 'recall', 'the second round was left in recall');
    assert.ok(host.state.ended);
  });
}
