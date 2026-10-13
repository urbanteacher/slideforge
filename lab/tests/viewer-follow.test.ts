// A follow link on a studio room (lab-engine-plan M12), through the real relay (tests/harness.js): the room's host
// turns the big-screen seat on with the share's id (`watchOn`, as classic's js/live.js does), a watcher (the studio
// viewer's socket) is told where the room is, and each `context` lands it on the shared deck's own slide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { Deck, Slide } from '../src/core';
import { LiveHost, showFromDeck } from '../src/live';
import { followIndex, shareCopy, sharedDeck } from '../src/viewer/state';

interface Sock { send(m: unknown): void; next(t: string): Promise<Record<string, any>>; close(): Promise<void> }
const harness = createRequire(import.meta.url)(resolve(process.cwd(), '..', 'tests/harness.js')) as {
  freePort(): Promise<number>; start(port: number, dir: string): Promise<ChildProcess>; stop(c: ChildProcess, sig?: string): Promise<void>; connect(port: number): Promise<Sock>;
};

const slide = (id: string, extra: Partial<Slide> = {}) =>
  ({ id, name: id, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: `notes for ${id}`, ...extra }) as unknown as Slide;

test('a watcher follows a studio room by the share id, onto the shared deck\'s slides', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sf-lab-follow-'));
  const port = await harness.freePort();
  const relay = await harness.start(port, dir);
  const game = (role: NonNullable<Slide['game']>['role'], extra = {}) => ({ id: 'g', format: 'choice', label: 'Check', role, settings: {}, ...extra });
  const deck = { id: 'd', title: 'Follow me', width: 1920, height: 1080, slides: [
    slide('intro'), slide('hid', { hidden: true }), slide('cover', { game: game('cover') }),
    slide('q', { game: game('question', { key: '0', quiz: { type: 'quiz', style: 'choice', input: 'choice', question: 'Yes?', options: ['Yes', 'No'], correct: 0 } }) }),
    slide('a', { game: game('answer', { key: '0' }) }), slide('end'),
  ] } as unknown as Deck;
  const shared = sharedDeck(JSON.parse(JSON.stringify(shareCopy(deck))))!;
  const host = new LiveHost({ url: `ws://127.0.0.1:${port}`, show: showFromDeck(deck) });
  const id = 'f'.repeat(32);
  let watcher: Sock | null = null;
  try {
    await host.start();
    assert.equal(host.watchOn(id), true);
    watcher = await harness.connect(port);
    watcher.send({ t: 'watch', s: id });
    const hello = await watcher.next('watching');
    assert.equal(hello.title, 'Follow me');
    host.begin();
    let at = await watcher.next('context');
    assert.equal(shared.deck.slides[followIndex(shared.deck, at)].id, 'intro');
    host.next();
    at = await watcher.next('context');
    assert.equal(shared.deck.slides[followIndex(shared.deck, at)].id, 'cover', 'the hidden slide is in neither');
    host.next();
    at = await watcher.next('context');
    assert.equal(shared.deck.slides[followIndex(shared.deck, at)].id, 'q');
    assert.equal(JSON.stringify(at).includes('notes for'), false, 'a watcher is told no notes');
    assert.equal(host.watchOn(''), true);
    await watcher.next('watchEnd');
  } finally {
    await watcher?.close().catch(() => {});
    await host.end().catch(() => {});
    await harness.stop(relay);
    rmSync(dir, { recursive: true, force: true });
  }
});
