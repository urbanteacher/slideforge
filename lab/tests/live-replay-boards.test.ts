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

function boardOn(format: string, field: string, key: string, skin: string) {
  return (show: RoomShow) => {
    const starter = list.find((g) => g.format === format)!;
    const compiled = starter.slides.find((s) => s[field])!;
    for (const s of show.slides) {
      if (s.text === (compiled.bullets as string[]).join('\n') && s.title === compiled.title) { s.board = { key, slide: { ...compiled, id: s.id } }; s.style = key; }
      else if (!s.quiz) s.style = skin;
    }
  };
}

const click = (labels: Record<string, string>) => (s: Step, host: { boardCommand(action: string): boolean }) => {
  if (s.what !== 'board: click') return;
  const label = String(s.button ?? '').split(' | ').pop()!;
  assert.ok(labels[label], `a button the board has: ${label}`);
  assert.equal(host.boardCommand(labels[label]), true);
};

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
