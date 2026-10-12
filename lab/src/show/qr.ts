// A QR code for the room's join link, as an SVG string. A typed port of js/qr.js (SlideForge's own encoder:
// byte mode, versions 1-6, levels L and M), kept here because lab code may not reach into classic's files
// (hard rule 1) and js/qr.js is a browser global, not a module. It is a port and not a dependency on purpose:
// the encoder is 250 lines, a join link is ~50 bytes, and lab/tests/show-qr.test.ts loads classic's js/qr.js
// and checks this one produces the same modules, so the two cannot drift (the classic file's own
// tests/qr.test.js decodes its output). When classic's player goes, so does the reason to keep both.

type Level = 'L' | 'M';
type Cell = boolean | null;
type Matrix = Cell[][];

const MAX_VERSION = 6;
const TOTAL_CODEWORDS: Record<number, number> = { 1: 26, 2: 44, 3: 70, 4: 100, 5: 134, 6: 172 };
/** [data codewords, blocks] per version. */
const BLOCKS: Record<Level, Record<number, [number, number]>> = {
  L: { 1: [19, 1], 2: [34, 1], 3: [55, 1], 4: [80, 1], 5: [108, 1], 6: [136, 2] },
  M: { 1: [16, 1], 2: [28, 1], 3: [44, 1], 4: [64, 2], 5: [86, 2], 6: [108, 4] },
};
const ALIGN: Record<number, number> = { 2: 18, 3: 22, 4: 26, 5: 30, 6: 34 };
/** Format information (level + mask, BCH-protected, XOR 0x5412), read off the spec. */
const FORMAT_BITS: Record<Level, number[]> = {
  L: [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976],
  M: [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0],
};

// GF(256) with the QR polynomial 0x11d, as log and antilog tables.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
}
const gmul = (a: number, b: number) => (!a || !b ? 0 : EXP[LOG[a] + LOG[b]]);

function generator(n: number): number[] {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { next[j] ^= g[j]; next[j + 1] ^= gmul(g[j], EXP[i]); }
    g = next;
  }
  return g;
}

/** The error-correction bytes: the remainder of the message divided by the generator. */
function ecBytes(data: number[], n: number): number[] {
  const gen = generator(n), rem = new Array<number>(data.length + n).fill(0);
  data.forEach((v, i) => { rem[i] = v; });
  for (let k = 0; k < data.length; k++) {
    const lead = rem[k];
    if (!lead) continue;
    for (let j = 0; j < gen.length; j++) rem[k + j] ^= gmul(gen[j], lead);
  }
  return rem.slice(data.length);
}

function pickVersion(byteLength: number, level: Level): number {
  for (let v = 1; v <= MAX_VERSION; v++) if (byteLength + 2 <= BLOCKS[level][v][0]) return v;
  throw new Error(`QR: ${byteLength} bytes is more than version ${MAX_VERSION} level ${level} can hold`);
}

/** Mode indicator, length, payload, terminator, then the pad pattern. */
function codewords(bytes: number[], version: number, level: Level): number[] {
  const capacity = BLOCKS[level][version][0];
  const bits: number[] = [];
  const put = (value: number, length: number) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  put(0x4, 4);
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, capacity * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) { let byte = 0; for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j]; out.push(byte); }
  const pad = [0xec, 0x11];
  for (let k = 0; out.length < capacity; k++) out.push(pad[k % 2]);
  return out;
}

/** Split into blocks, add error correction to each, interleave. */
function interleave(data: number[], version: number, level: Level): number[] {
  const spec = BLOCKS[level][version], blockCount = spec[1];
  const ecPerBlock = Math.floor((TOTAL_CODEWORDS[version] - spec[0]) / blockCount);
  const shortLen = Math.floor(spec[0] / blockCount), longCount = spec[0] % blockCount;
  const dataBlocks: number[][] = [], ecBlocks: number[][] = [];
  let at = 0;
  for (let b = 0; b < blockCount; b++) {
    const len = shortLen + (b >= blockCount - longCount ? 1 : 0);
    const block = data.slice(at, at + len);
    at += len;
    dataBlocks.push(block);
    ecBlocks.push(ecBytes(block, ecPerBlock));
  }
  const out: number[] = [];
  const longest = Math.max(...dataBlocks.map((x) => x.length));
  for (let i = 0; i < longest; i++) for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  for (let e = 0; e < ecPerBlock; e++) for (const block of ecBlocks) out.push(block[e]);
  return out;
}

const blank = (size: number): Matrix => Array.from({ length: size }, () => new Array<Cell>(size).fill(null));

function finder(m: Matrix, x: number, y: number) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const px = x + dx, py = y + dy;
      if (px < 0 || py < 0 || px >= m.length || py >= m.length) continue;
      const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      m[py][px] = ring <= 1 || ring === 3;
    }
  }
}

function alignment(m: Matrix, cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) m[cy + dy][cx + dx] = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
}

function functionPatterns(m: Matrix, version: number) {
  const size = m.length;
  finder(m, 0, 0); finder(m, size - 7, 0); finder(m, 0, size - 7);
  for (let i = 8; i < size - 8; i++) { m[6][i] = i % 2 === 0; m[i][6] = i % 2 === 0; }
  if (ALIGN[version]) alignment(m, ALIGN[version], ALIGN[version]);
  // The format areas are reserved now and written after masking.
  for (let k = 0; k <= 8; k++) { if (m[8][k] === null) m[8][k] = false; if (m[k][8] === null) m[k][8] = false; }
  for (let j = 0; j < 8; j++) { if (m[8][size - 1 - j] === null) m[8][size - 1 - j] = false; if (m[size - 1 - j][8] === null) m[size - 1 - j][8] = false; }
  m[size - 8][8] = true;
}

/** Two-module columns from the right, up then down, skipping the timing column. */
function placeData(m: Matrix, bytes: number[], reserved: boolean[][]) {
  const size = m.length, bits: number[] = [];
  bytes.forEach((b) => { for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1); });
  let at = 0, up = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const y = up ? size - 1 - step : step;
      for (let c = 0; c < 2; c++) {
        const x = right - c;
        if (reserved[y][x]) continue;
        m[y][x] = at < bits.length ? bits[at] === 1 : false;
        at++;
      }
    }
    up = !up;
  }
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** The four penalty rules: the least patterned mask wins. */
function penalty(m: Matrix): number {
  const size = m.length;
  let score = 0;
  for (const flip of [false, true]) {
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        const same = flip ? m[b][a] === m[b - 1][a] : m[a][b] === m[a][b - 1];
        if (same) run++; else { if (run >= 5) score += run - 2; run = 1; }
      }
      if (run >= 5) score += run - 2;
    }
  }
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const v = m[y][x]; if (v === m[y][x + 1] && v === m[y + 1][x] && v === m[y + 1][x + 1]) score += 3; }
  const PAT = [true, false, true, true, true, false, true];
  const line = (get: (i: number) => Cell) => {
    for (let i = 0; i + 7 <= size; i++) {
      let hit = true;
      for (let k = 0; k < 7; k++) if (get(i + k) !== PAT[k]) { hit = false; break; }
      if (!hit) continue;
      let before = true, after = true;
      for (let b = 1; b <= 4; b++) if (i - b < 0 || get(i - b)) { before = false; break; }
      for (let a = 7; a <= 10; a++) if (i + a >= size || get(i + a)) { after = false; break; }
      if (before || after) score += 40;
    }
  };
  for (let y = 0; y < size; y++) line((x) => m[y][x]);
  for (let x = 0; x < size; x++) line((y) => m[y][x]);
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (m[y][x]) dark++;
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

/** Both copies of the format word: bit 0 at (8,0), rising anticlockwise to bit 14 at (0,8). */
function writeFormat(m: Matrix, level: Level, mask: number) {
  const size = m.length, bits = FORMAT_BITS[level][mask];
  const bit = (i: number) => ((bits >> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) m[8][i] = bit(i);
  m[8][7] = bit(6); m[8][8] = bit(7); m[7][8] = bit(8);
  for (let j = 9; j <= 14; j++) m[14 - j][8] = bit(j);
  for (let k = 0; k <= 6; k++) m[size - 1 - k][8] = bit(14 - k);
  for (let n = 7; n <= 14; n++) m[8][size - 15 + n] = bit(14 - n);
}

export interface Qr { size: number; version: number; level: Level; mask: number; modules: boolean[][] }

/** Encode text (UTF-8, byte mode) as a QR code; `modules[row][col]` is true for dark. Throws past version 6. */
export function qr(text: string, opts: { level?: Level; minVersion?: number } = {}): Qr {
  const level: Level = opts.level === 'L' ? 'L' : 'M';
  const bytes = [...new TextEncoder().encode(text)];
  if (!bytes.length) throw new Error('QR: nothing to encode');
  let version = pickVersion(bytes.length, level);
  if (opts.minVersion) version = Math.max(version, Math.min(MAX_VERSION, opts.minVersion));
  const payload = interleave(codewords(bytes, version, level), version, level);
  const size = 17 + version * 4;
  const base = blank(size);
  functionPatterns(base, version);
  const reserved = base.map((row) => row.map((v) => v !== null));
  placeData(base, payload, reserved);
  let best: { score: number; mask: number; modules: Matrix } | null = null;
  for (let mask = 0; mask < 8; mask++) {
    const m = base.map((row) => row.slice());
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!reserved[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
    writeFormat(m, level, mask);
    const score = penalty(m);
    if (!best || score < best.score) best = { score, mask, modules: m };
  }
  return { size, version, level, mask: best!.mask, modules: best!.modules as boolean[][] };
}

/** The code as an SVG: one path, four modules of quiet space, black on white (a camera reads it off a projector). */
export function qrSvg(text: string, opts: { level?: Level; quiet?: number; title?: string } = {}): string {
  const code = qr(text, opts);
  const quiet = opts.quiet == null ? 4 : Math.max(0, opts.quiet);
  const span = code.size + quiet * 2, d: string[] = [];
  for (let y = 0; y < code.size; y++) for (let x = 0; x < code.size; x++) if (code.modules[y][x]) d.push(`M${x + quiet} ${y + quiet}h1v1h-1z`);
  const label = opts.title ? `<title>${opts.title.replace(/[<&>]/g, '')}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${span} ${span}" shape-rendering="crispEdges" role="img">${label}<rect width="${span}" height="${span}" fill="#fff"/><path fill="#000" d="${d.join('')}"/></svg>`;
}
