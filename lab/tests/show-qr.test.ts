// The lab's QR encoder (src/show/qr.ts) is a typed port of classic's js/qr.js. This loads classic's file as a
// script and checks the port draws the same modules for the strings a room encodes, at both levels, so the two
// cannot drift while classic's player still ships (the classic file's own decoder test is tests/qr.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { qr, qrSvg } from '../src/show/qr';

type Classic = { qr(t: string, o?: object): { version: number; mask: number; modules: boolean[][] }; qrSvg(t: string, o?: object): string };
const sandbox: { SF?: Classic } = {};
vm.runInNewContext(readFileSync(resolve(process.cwd(), '..', 'js/qr.js'), 'utf8'), { window: sandbox });
const classic = sandbox.SF!;

const SAMPLES = [
  'http://10.0.0.5:8787/join.html?pin=123456',
  'https://slideforge.onrender.com/join.html?pin=042913',
  'a',
  'http://192.168.100.200:8787/join.html?pin=999999&x=é',
];

test('the lab QR draws the same modules as classic\'s', () => {
  for (const text of SAMPLES) {
    for (const level of ['L', 'M'] as const) {
      // (through JSON: the arrays come from the script's own realm, which deepEqual would count as different)
      const a = qr(text, { level }), b = JSON.parse(JSON.stringify(classic.qr(text, { level }))) as ReturnType<typeof qr>;
      assert.equal(a.version, b.version, `${text} ${level}: version`);
      assert.equal(a.mask, b.mask, `${text} ${level}: mask`);
      assert.deepEqual(a.modules, b.modules, `${text} ${level}: modules`);
    }
  }
});

test('the SVG is the same markup, and a payload too long for version 6 throws rather than draw a bad code', () => {
  assert.equal(qrSvg(SAMPLES[0], { quiet: 3, title: 'Join' }), classic.qrSvg(SAMPLES[0], { quiet: 3, title: 'Join' }));
  assert.throws(() => qr('x'.repeat(200)), /QR/);
});
