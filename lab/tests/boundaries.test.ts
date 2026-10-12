// Hard rule 13 (docs/lab-engine-plan.md, from M1.5): clear boundaries in the lab.
// - core/ and engine/ never import a kind, a game style, an activity or the live room: they reach them only
//   through the lists the kinds register into (kinds/index.ts).
// - Each folder's index.ts is its public interface: code outside a folder imports only that index. A folder is
//   a top-level folder of src/, or one kind's folder in kinds/. assets/ and generated/ are data, imported as
//   they are. A dynamic import() may name a file inside a folder, so that file stays a chunk of its own.
//   A kind's folder has a second public file, its Inspector.tsx: the inspector frame (ui/) shows it, and
//   it stays out of the kind's index.ts so the export player, which imports every kind, never bundles React.
// - The files at the top of src/ are entries: nothing imports them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importsOf, sourceFiles, unitOf } from './source';

const NO_KINDS = ['core', 'engine'];
const KIND_SIDE = ['kinds', 'games', 'activities', 'live'];
const DATA = ['assets', 'generated'];

/** Folders that have no index.ts yet, so are still imported file by file. Empty when M1.5 is done. */
const NO_INDEX_YET: string[] = [];
/** Entries still imported from a folder, until they move into app/. Empty when M1.5 is done. */
const ENTRY_IMPORTS: string[] = [];
/** core/ or engine/ files still reaching into a kind, until the kind's code moves out of them. Empty when M1.5 is done. */
const REACHES_KINDS: string[] = [];

const all = () => sourceFiles().flatMap(importsOf);

test('every relative import names a file that exists', () => {
  const lost = all().filter((i) => !i.to && !DATA.some((d) => i.spec.includes(`${d}/`))).map((i) => `${i.from} → ${i.spec}`);
  assert.deepEqual(lost, []);
});

test('core/ and engine/ import no kind, game, activity or live code', () => {
  const bad = all().filter((i) => i.to && NO_KINDS.includes(unitOf(i.from)) && KIND_SIDE.includes(i.to.split('/')[0])).map((i) => `${i.from} → ${i.to}`).filter((b) => !REACHES_KINDS.includes(b));
  assert.deepEqual(bad, []);
});

test('code outside a folder imports only its index.ts', () => {
  const bad = all().filter((i) => {
    if (!i.to || i.dynamic) return false;
    const to = unitOf(i.to);
    if (!to || to === unitOf(i.from) || DATA.includes(to.split('/')[0]) || NO_INDEX_YET.includes(to)) return false;
    const file = i.to.slice(to.length + 1);
    return !(/^index\.tsx?$/.test(file) || (to.startsWith('kinds/') && file === 'Inspector.tsx'));
  }).map((i) => `${i.from} → ${i.to}`);
  assert.deepEqual(bad, []);
});

test('nothing in a folder imports the files at the top of src/ (they are entries)', () => {
  const bad = all().filter((i) => i.to && unitOf(i.to) === '' && unitOf(i.from) !== '' && !ENTRY_IMPORTS.includes(i.to)).map((i) => `${i.from} → ${i.to}`);
  assert.deepEqual(bad, []);
});

test('no index.ts reaches a kind’s Inspector.tsx (the player imports the indexes)', () => {
  const bad = all().filter((i) => i.to && /(^|\/)index\.ts$/.test(i.from) && /^kinds\/[^/]+\/Inspector\.tsx$/.test(i.to)).map((i) => `${i.from} → ${i.to}`);
  assert.deepEqual(bad, []);
});

test('the allowlists hold nothing stale', () => {
  const files = new Set(sourceFiles());
  const units = new Set([...files].map(unitOf));
  const stale = NO_INDEX_YET.filter((u) => !units.has(u) || files.has(`${u}/index.ts`) || files.has(`${u}/index.tsx`));
  const entries = ENTRY_IMPORTS.filter((e) => !all().some((i) => i.to === e && unitOf(i.from) !== ''));
  const reaches = REACHES_KINDS.filter((r) => !all().some((i) => `${i.from} → ${i.to}` === r));
  assert.deepEqual([...stale, ...entries, ...reaches], []);
});
