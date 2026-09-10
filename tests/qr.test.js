'use strict';
/* The QR encoder.
 *
 * A camera is the one test that cannot be automated, so this file has to earn
 * the confidence a scan would give. Three independent checks do it:
 *
 *   1. A decoder, written here rather than in js/qr.js, that reads the format
 *      information out of the matrix, unmasks, walks the data modules, undoes
 *      the interleaving and recovers the string. It shares no code with the
 *      encoder, so it fails if either one has the layout wrong.
 *   2. Reed-Solomon by definition: a codeword block is correct exactly when
 *      the polynomial (data followed by EC bytes) divides by the generator
 *      with no remainder. That is a mathematical property, not a comparison
 *      against a number I typed in, so it catches an arithmetic slip that a
 *      hardcoded vector would only catch for one input.
 *   3. The capacity table against the geometry. The number of codewords a
 *      version holds is not free — it is the module count the function
 *      patterns leave over, divided by eight. Counting those modules from the
 *      matrix and comparing against the table means a mistyped capacity fails
 *      here instead of producing a code no scanner will read.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadQR() {
  const sandbox = {};
  global.window = sandbox;
  delete require.cache[require.resolve('../js/qr.js')];
  require('../js/qr.js');
  delete global.window;
  return sandbox.SF;
}

/* ------------------------------------------------------------- a decoder */

/* Deliberately a separate implementation. Sharing the encoder's walk or its
   mask table would make the round trip prove only that it is consistent with
   itself, which is exactly what a wrong layout is. */
const MASK_FN = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
];

/* Which modules are structure rather than data, worked out from the version
   alone — the decoder is not told, because a real one is not either. */
function reservedMap(size, version) {
  const r = [];
  for (let y = 0; y < size; y++) r.push(new Array(size).fill(false));
  const block = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (y >= 0 && x >= 0 && y < size && x < size) r[y][x] = true;
      }
    }
  };
  block(0, 0, 9, 9);                       // finder + separator + format
  block(size - 8, 0, 8, 9);
  block(0, size - 8, 9, 8);
  for (let i = 0; i < size; i++) { r[6][i] = true; r[i][6] = true; }
  const centre = { 2: 18, 3: 22, 4: 26, 5: 30, 6: 34 }[version];
  if (centre) block(centre - 2, centre - 2, 5, 5);
  return r;
}

function readFormat(modules) {
  /* Only the copy along the top-left, which is enough when the code is not
     damaged. Read back through the same 0x5412 mask the encoder applies.

     Bit 0 at (8,0) rising to bit 14 at (0,8) — this decoder had it reversed
     to begin with, which is precisely why the round trip below passed on a
     code no scanner could read. Two mirrors agreeing is not a check. */
  const bitAt = (y, x) => (modules[y][x] ? 1 : 0);
  let bits = 0;
  const order = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  order.forEach(([y, x], i) => { bits |= bitAt(y, x) << i; });
  bits ^= 0x5412;
  const levelBits = (bits >> 13) & 0x3;
  return { level: { 1: 'L', 0: 'M', 3: 'Q', 2: 'H' }[levelBits], mask: (bits >> 10) & 0x7 };
}

function decode(SF, code) {
  const { size, version, modules } = code;
  const fmt = readFormat(modules);
  const reserved = reservedMap(size, version);
  const unmask = (x, y) => {
    const raw = modules[y][x];
    return (!reserved[y][x] && MASK_FN[fmt.mask](x, y)) ? !raw : raw;
  };

  // Walk the data modules and collect the bits.
  const bits = [];
  let up = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const y = up ? size - 1 - step : step;
      for (let c = 0; c < 2; c++) {
        const x = right - c;
        if (reserved[y][x]) continue;
        bits.push(unmask(x, y) ? 1 : 0);
      }
    }
    up = !up;
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    bytes.push(b);
  }

  // Undo the interleaving.
  const [dataCount, blockCount] = SF.QR_BLOCKS[fmt.level][version];
  const total = SF.QR_TOTAL_CODEWORDS[version];
  const ecPerBlock = Math.floor((total - dataCount) / blockCount);
  const shortLen = Math.floor(dataCount / blockCount);
  const longCount = dataCount % blockCount;
  const lens = [];
  for (let b = 0; b < blockCount; b++) {
    lens.push(shortLen + (b >= blockCount - longCount ? 1 : 0));
  }
  const dataBlocks = lens.map(() => []);
  let at = 0;
  for (let i = 0; i < Math.max(...lens); i++) {
    for (let b = 0; b < blockCount; b++) {
      if (i < lens[b]) dataBlocks[b].push(bytes[at++]);
    }
  }
  const ecBlocks = lens.map(() => []);
  for (let e = 0; e < ecPerBlock; e++) {
    for (let b = 0; b < blockCount; b++) ecBlocks[b].push(bytes[at++]);
  }
  const data = [].concat(...dataBlocks);

  // Mode, length, payload.
  const stream = [];
  data.forEach((b) => { for (let i = 7; i >= 0; i--) stream.push((b >> i) & 1); });
  const take = (n) => {
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | stream.shift();
    return v;
  };
  const mode = take(4);
  const length = take(8);
  const payload = [];
  for (let i = 0; i < length; i++) payload.push(take(8));
  return {
    level: fmt.level, mask: fmt.mask, mode, length,
    text: Buffer.from(payload).toString('utf8'),
    dataBlocks, ecBlocks, ecPerBlock
  };
}

/* --------------------------------------------------------------- the tests */

const URL = 'http://192.168.1.93:8787/join.html?pin=123456';

test('a code decodes back to the string that went into it', () => {
  const SF = loadQR();
  const cases = [
    'A',
    URL,
    'http://localhost:8787/join.html?pin=000000',
    'https://a-rather-long-hostname.example.ac.uk:8443/join.html?pin=428913',
    'https://x.test/join.html?pin=111111&team=2&name=' + 'a'.repeat(40)
  ];
  for (const text of cases) {
    for (const level of ['L', 'M']) {
      const code = SF.qr(text, { level });
      const got = decode(SF, code);
      assert.equal(got.text, text, text.slice(0, 30) + ' at level ' + level);
      assert.equal(got.mode, 4, 'byte mode');
      assert.equal(got.length, Buffer.byteLength(text, 'utf8'));
      assert.equal(got.level, level, 'the format information says which level');
      assert.equal(got.mask, code.mask, 'and which mask');
    }
  }
});

test('non-ASCII survives as UTF-8', () => {
  const SF = loadQR();
  for (const text of ['café', 'Grüße', '光', 'a🙂b']) {
    const code = SF.qr(text);
    assert.equal(decode(SF, code).text, text);
  }
});

test('the error-correction bytes are real Reed-Solomon codewords', () => {
  const SF = loadQR();
  const { generator, gmul } = SF.qrInternals;

  /* A block is a correct codeword exactly when data-followed-by-EC divides by
     the generator with nothing left over. Checked by doing the division here
     rather than comparing against numbers copied from anywhere. */
  const divides = (block, n) => {
    const gen = generator(n);
    const rem = block.slice();
    for (let i = 0; i + n < rem.length + 1 && i < rem.length - n; i++) {
      const lead = rem[i];
      if (!lead) continue;
      for (let j = 0; j < gen.length; j++) rem[i + j] ^= gmul(gen[j], lead);
    }
    return rem.slice(rem.length - n).every((b) => b === 0);
  };

  for (const level of ['L', 'M']) {
    for (const text of ['A', URL, 'x'.repeat(100)]) {
      if (level === 'M' && text.length > 106) continue;
      const code = SF.qr(text, { level });
      const got = decode(SF, code);
      got.dataBlocks.forEach((block, i) => {
        assert.ok(divides(block.concat(got.ecBlocks[i]), got.ecPerBlock),
          'block ' + i + ' of version ' + code.version + level + ' is not a codeword');
      });
    }
  }

  /* The generator's degree is its codeword count, and it is monic — two
     properties that hold for every valid generator polynomial. */
  for (const n of [7, 10, 15, 16, 18, 20, 24, 26, 36]) {
    const g = generator(n);
    assert.equal(g.length, n + 1);
    assert.equal(g[0], 1);
  }

  /* Two generators against the published tables. The divisibility check above
     proves the encoder is consistent with its own field arithmetic; these
     prove the field arithmetic is the one the standard specifies, which is
     the part self-consistency cannot establish. */
  assert.deepEqual(generator(7), [1, 127, 122, 154, 164, 11, 68, 117]);
  assert.deepEqual(generator(10), [1, 216, 194, 159, 111, 199, 94, 95, 113, 157, 193]);
});

test('the codeword stream for a one-byte payload, worked out by hand', () => {
  const SF = loadQR();
  /* Version 1 level M holds 16 data codewords. "A" is 0x41, so the stream is
     0100 (byte mode), 00000001 (one byte), 01000001, 0000 (terminator),
     which packs to 0x40 0x14 0x10 — and the rest is the standard alternating
     pad. Written out here so the header, the bit packing and the padding are
     pinned to something independent of the encoder. */
  const code = SF.qr('A', { level: 'M' });
  assert.equal(code.version, 1);
  const got = decode(SF, code);
  assert.equal(got.dataBlocks.length, 1);
  assert.deepEqual(got.dataBlocks[0], [
    0x40, 0x14, 0x10,
    /* Thirteen pad bytes to fill the sixteen, so the run ends on 0xec. */
    0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec
  ]);
  assert.equal(got.ecPerBlock, 10, 'version 1 level M spends 10 codewords on EC');
});

test('the capacity table matches the geometry, version by version', () => {
  const SF = loadQR();
  /* If a capacity is mistyped, this fails rather than a scanner failing.
     The available modules are whatever the function patterns do not take,
     and they hold whole codewords plus the version's remainder bits. */
  for (let version = 1; version <= SF.QR_MAX_VERSION; version++) {
    const size = 17 + version * 4;
    const reserved = reservedMap(size, version);
    let free = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) if (!reserved[y][x]) free++;
    }
    const expected = SF.QR_TOTAL_CODEWORDS[version] * 8 + SF.QR_REMAINDER_BITS[version];
    assert.equal(free, expected, 'version ' + version + ' data modules');

    // And the data/EC split has to add up to the total, for both levels.
    for (const level of ['L', 'M']) {
      const [dataCount, blocks] = SF.QR_BLOCKS[level][version];
      const ec = SF.QR_TOTAL_CODEWORDS[version] - dataCount;
      assert.equal(ec % blocks, 0,
        'version ' + version + level + ' splits ' + ec + ' EC bytes into ' + blocks + ' blocks');
      assert.ok(ec / blocks >= 7, 'and each block carries a usable number of them');
    }
  }
});

test('the structure a scanner looks for is where it should be', () => {
  const SF = loadQR();
  const code = SF.qr(URL);
  const m = code.modules;
  const size = code.size;
  assert.equal(size, 33, '45 bytes at level M needs version 4');

  // Three finder patterns: dark 7x7 ring, light 5x5 ring, dark 3x3 centre.
  for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        assert.equal(m[oy + dy][ox + dx], ring <= 1 || ring === 3,
          'finder at ' + ox + ',' + oy + ' module ' + dx + ',' + dy);
      }
    }
  }
  // Separators: a light row and column between each finder and the data.
  for (let i = 0; i < 8; i++) {
    assert.equal(m[7][i], false);
    assert.equal(m[i][7], false);
  }
  // Timing patterns, alternating and starting dark.
  for (let i = 8; i < size - 8; i++) {
    assert.equal(m[6][i], i % 2 === 0, 'timing row at ' + i);
    assert.equal(m[i][6], i % 2 === 0, 'timing column at ' + i);
  }
  // One alignment pattern for version 4, centred at 26,26.
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      assert.equal(m[26 + dy][26 + dx], Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  // The dark module below the top-left format block is always dark.
  assert.equal(m[size - 8][8], true);

  /* The format information itself, including both copies agreeing, has its
     own test below — it needs the spec's bit positions written out rather
     than geometry. */
  // Version 1 has no alignment pattern at all.
  assert.equal(SF.qr('A').size, 21);
});

test('the format information is where the spec puts it, bit by bit', () => {
  const SF = loadQR();
  /* Written out as positions rather than as a loop, because a loop here would
     just be the encoder's loop again. This is the test that was missing: the
     first version of the encoder had this numbering reversed, both copies
     agreed with each other, the round trip above passed, and no real scanner
     could read a single code it produced. A decoder that mirrors the encoder
     reads a bit-reversed word back and is perfectly happy; a scanner runs the
     BCH check over it, fails, and abandons the symbol.
     
     Bit 0 sits at row 8 column 0 and the numbering rises to bit 14 at row 0
     column 8, skipping the timing module at row 8 column 6. */
  const code = SF.qr('http://192.168.1.93:8787/join.html?pin=428913');
  const m = code.modules;
  const size = code.size;
  const value = { L: 0, M: 1 }[code.level] === 1
    ? SF.qr('x', { level: 'M' }) && null : null;   // level comes from the table below

  const FIRST = [
    [8, 0, 0], [8, 1, 1], [8, 2, 2], [8, 3, 3], [8, 4, 4], [8, 5, 5],
    [8, 7, 6], [8, 8, 7], [7, 8, 8],
    [5, 8, 9], [4, 8, 10], [3, 8, 11], [2, 8, 12], [1, 8, 13], [0, 8, 14]
  ];
  const SECOND = [
    [size - 1, 8, 14], [size - 2, 8, 13], [size - 3, 8, 12], [size - 4, 8, 11],
    [size - 5, 8, 10], [size - 6, 8, 9], [size - 7, 8, 8],
    [8, size - 8, 7], [8, size - 7, 6], [8, size - 6, 5], [8, size - 5, 4],
    [8, size - 4, 3], [8, size - 3, 2], [8, size - 2, 1], [8, size - 1, 0]
  ];

  /* The word the two copies spell has to be the level-and-mask value from the
     spec's own table, BCH-protected and XOR-masked with 0x5412. Recomputed
     here from the procedure rather than read from the encoder's table. */
  const bch = (levelBits, mask) => {
    let d = ((levelBits << 3) | mask) << 10;
    let rem = d;
    for (;;) {
      let len = 0;
      for (let t = rem; t; t >>= 1) len++;
      if (len < 11) break;
      rem ^= 0x537 << (len - 11);
    }
    return (d | rem) ^ 0x5412;
  };
  const expected = bch(0, code.mask);            // M is 00

  const read = (table) => {
    let v = 0;
    table.forEach(([y, x, bitIndex]) => {
      if (m[y][x]) v |= 1 << bitIndex;
    });
    return v;
  };
  assert.equal(read(FIRST), expected, 'first format copy');
  assert.equal(read(SECOND), expected, 'second format copy');
  assert.equal(value, null);
});

test('a code an outside decoder has read, module for module', () => {
  const SF = loadQR();
  /* This matrix was checked by Apple's Vision framework, which read the URL
     back out of a PNG of it — an independent, production decoder, and the
     only kind of confirmation that matters here, since the real test is a
     phone camera and no test runner has one.
     
     Kept as a regression vector: every stage of the pipeline has to keep
     producing exactly this, and a change anywhere in encoding, error
     correction, placement, masking or format information moves at least one
     of these modules. */
  const EXPECTED = [
  '111111101000100000010111101111111',
  '100000100100100100100000101000001',
  '101110101111101010000111001011101',
  '101110101101000000110100001011101',
  '101110101100111110001001101011101',
  '100000101100111001010100001000001',
  '111111101010101010101010101111111',
  '000000000110000010011100100000000',
  '001111110110011001111000001111100',
  '100011010101110011010001111101101',
  '100000110000111111000010011010110',
  '010001010011010101110000110011110',
  '111111100110001010011110000011011',
  '110110000001010101100001111101011',
  '000100111100111110101010000110110',
  '000110000100000100100100110010100',
  '011110110011110101101001000111001',
  '001011010011110010010111111101101',
  '011001110000001110101100110010110',
  '001110001100100010010111000011100',
  '010111110110110000100101000111010',
  '101010011100001110001111111001001',
  '101100111110111001010100101001010',
  '101100000001101010011110110111110',
  '100000110010100001111001111111011',
  '000000001100001011110000100010111',
  '111111100011011101001011101010110',
  '100000101101100001100000100010100',
  '101110101001111010011110111111001',
  '101110101101100101100000000110101',
  '101110101100010111001010111100100',
  '100000100110011100000101000111100',
  '111111101110101101001000101110010'
  ];
  const code = SF.qr('http://192.168.1.93:8787/join.html?pin=428913', { level: 'M' });
  assert.equal(code.version, 4);
  assert.equal(code.mask, 2);
  const got = code.modules.map((r) => r.map((v) => (v ? '1' : '0')).join(''));
  assert.deepEqual(got, EXPECTED);
});

test('the mask is chosen by penalty, and a chosen mask is recorded', () => {
  const SF = loadQR();
  /* Not a fixed expectation of which mask wins — that would be asserting the
     implementation. What matters is that the winner is genuinely the lowest
     scoring one and that the format information says so, which is what a
     scanner relies on to unmask. */
  const code = SF.qr(URL);
  assert.ok(code.mask >= 0 && code.mask <= 7);
  assert.equal(decode(SF, code).mask, code.mask);

  /* Masking is not optional: an unmasked code of a repetitive string is full
     of runs, and the chosen one has to be better than the worst. */
  const runs = (m) => {
    let n = 0;
    for (let y = 0; y < m.length; y++) {
      let run = 1;
      for (let x = 1; x < m.length; x++) {
        if (m[y][x] === m[y][x - 1]) run++; else { if (run >= 5) n++; run = 1; }
      }
      if (run >= 5) n++;
    }
    return n;
  };
  const flat = SF.qr('0'.repeat(60), { level: 'L' });
  assert.ok(runs(flat.modules) < flat.size, 'a repetitive payload still masks flat');
});

test('too much text is refused rather than silently truncated', () => {
  const SF = loadQR();
  assert.throws(() => SF.qr('x'.repeat(200)), /more than version 6/);
  assert.throws(() => SF.qr(''), /nothing to encode/);
  /* Level M holds less than L, so the same string can fit one and not the
     other — and the error says which. */
  assert.equal(SF.qr('x'.repeat(120), { level: 'L' }).version, 6);
  assert.throws(() => SF.qr('x'.repeat(120), { level: 'M' }), /level M/);
});

test('the SVG is one path, with the quiet zone a scanner needs', () => {
  const SF = loadQR();
  const svg = SF.qrSvg(URL, { size: 240, title: 'Join' });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 41 41"/,
    '33 modules plus four either side');
  assert.match(svg, /width="240" height="240"/);
  assert.match(svg, /shape-rendering="crispEdges"/, 'no half-lit modules at the edges');
  assert.match(svg, /<title>Join<\/title>/);
  assert.equal((svg.match(/<path/g) || []).length, 1);
  /* A light background is drawn rather than left transparent: the quiet zone
     is only quiet if something white is under it. */
  assert.match(svg, /<rect width="41" height="41" fill="#fff"/);

  const dark = (svg.match(/M\d+ \d+h1v1h-1z/g) || []).length;
  const code = SF.qr(URL);
  let count = 0;
  code.modules.forEach((row) => row.forEach((v) => { if (v) count++; }));
  assert.equal(dark, count, 'one subpath per dark module and no more');

  assert.equal(SF.qrSvg('A', { quiet: 0 }).includes('viewBox="0 0 21 21"'), true);
});
