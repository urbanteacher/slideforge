/* SlideForge — QR codes, from scratch.
 *
 * A join URL on the wall that a phone camera can read, in a project with no
 * dependencies and no build step. So this is the encoder, written from the
 * spec rather than pulled in.
 *
 * Scope is deliberately narrow, because a narrow encoder can be checked and a
 * general one mostly cannot:
 *
 *   - Byte mode only. A URL has lowercase letters, "?" and "=", none of which
 *     alphanumeric mode can hold, so the other modes would never be used.
 *   - Versions 1 to 6 — up to 136 bytes, where a join URL is around 45. The
 *     cut-off is not arbitrary: version 7 and up carry an extra version
 *     information block, and stopping below it removes a whole mechanism
 *     rather than leaving an untested one in.
 *   - Error correction levels L and M. M is the default: a projected code is
 *     read at a few metres off a bright screen, and the redundancy costs
 *     capacity that a short URL does not need.
 *
 * Anything outside that throws rather than producing a code that scanners
 * quietly reject.
 *
 * How it is checked, since a camera is the one test that cannot be automated:
 * tests/qr.test.js decodes its own output back to the input string, verifies
 * the error-correction bytes are genuine Reed-Solomon codewords by polynomial
 * division, and cross-checks the capacity table against module counts derived
 * from the geometry — so a wrong number in a table fails rather than shipping.
 */
(function (global) {
  'use strict';

  var SF = global.SF = global.SF || {};

  var MIN_VERSION = 1;
  var MAX_VERSION = 6;

  /* Total codewords per version, from the spec. Cross-checked in the tests
     against the number of data modules the geometry actually leaves. */
  var TOTAL_CODEWORDS = { 1: 26, 2: 44, 3: 70, 4: 100, 5: 134, 6: 172 };

  /* Remainder bits: modules left over after the codewords, always zero. */
  var REMAINDER_BITS = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7 };

  /* [data codewords, blocks] per version. Every version/level here divides
     into equal blocks, which is why there is no group-two column — the
     interleaver below is written for the general case anyway. */
  var BLOCKS = {
    L: { 1: [19, 1], 2: [34, 1], 3: [55, 1], 4: [80, 1], 5: [108, 1], 6: [136, 2] },
    M: { 1: [16, 1], 2: [28, 1], 3: [44, 1], 4: [64, 2], 5: [86, 2], 6: [108, 4] }
  };

  /* Alignment pattern centre, one per version from 2 up. Version 1 has none. */
  var ALIGN = { 2: 18, 3: 22, 4: 26, 5: 30, 6: 34 };

  /* Format information, pre-computed: 15 bits of level + mask, BCH-protected
     and XOR-masked with 0x5412. Held as a table because the two levels this
     encoder supports come to sixteen values, and a table can be read off the
     spec and checked, where the BCH arithmetic can only be trusted. */
  var FORMAT_BITS = {
    L: [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976],
    M: [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0]
  };

  /* ---------------------------------------------------------------- GF(256) */

  /* Reed-Solomon lives in GF(256) with the QR primitive polynomial 0x11d.
     Built once as log/antilog tables so multiplication is two lookups. */
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gmul(a, b) {
    if (!a || !b) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  /* The generator polynomial for `n` error-correction codewords, which is
     (x - a^0)(x - a^1)...(x - a^(n-1)) multiplied out. Computed rather than
     tabulated: the recurrence is short enough to read, and a table of these
     is a long list of numbers nobody can check by eye. */
  function generator(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++) {
        next[j] ^= g[j];
        next[j + 1] ^= gmul(g[j], EXP[i]);
      }
      g = next;
    }
    return g;
  }

  /** The remainder of dividing the message by the generator: the EC bytes. */
  function ecBytes(data, n) {
    var gen = generator(n);
    var rem = new Array(data.length + n).fill(0);
    for (var i = 0; i < data.length; i++) rem[i] = data[i];
    for (var k = 0; k < data.length; k++) {
      var lead = rem[k];
      if (!lead) continue;
      for (var j = 0; j < gen.length; j++) rem[k + j] ^= gmul(gen[j], lead);
    }
    return rem.slice(data.length);
  }

  /* -------------------------------------------------------------- bitstream */

  function BitWriter() { this.bits = []; }
  BitWriter.prototype.put = function (value, length) {
    for (var i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  };

  /* ------------------------------------------------------------- encoding */

  function utf8Bytes(text) {
    var out = [];
    var s = String(text);
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) { out.push(c); continue; }
      if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); continue; }
      /* Surrogate pair, kept together so a character above the BMP does not
         become two invalid three-byte sequences. */
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var lo = s.charCodeAt(i + 1);
        if (lo >= 0xdc00 && lo <= 0xdfff) {
          var cp = 0x10000 + ((c - 0xd800) << 10) + (lo - 0xdc00);
          out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f),
            0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
          i++;
          continue;
        }
      }
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return out;
  }

  function pickVersion(byteLength, level) {
    for (var v = MIN_VERSION; v <= MAX_VERSION; v++) {
      /* Four bits of mode, eight of length, and the terminator has to fit
         somewhere — the byte-count check below is on whole codewords, so the
         header is counted in bytes here. */
      if (byteLength + 2 <= BLOCKS[level][v][0]) return v;
    }
    throw new Error('QR: ' + byteLength + ' bytes is more than version ' +
      MAX_VERSION + ' level ' + level + ' can hold (' +
      BLOCKS[level][MAX_VERSION][0] + ' including the header)');
  }

  /** Mode indicator, length, payload, terminator, then the pad pattern. */
  function codewords(bytes, version, level) {
    var capacity = BLOCKS[level][version][0];
    var w = new BitWriter();
    w.put(0x4, 4);                       // byte mode
    w.put(bytes.length, 8);              // versions 1-9 use an 8-bit count
    bytes.forEach(function (b) { w.put(b, 8); });

    var room = capacity * 8;
    w.put(0, Math.min(4, room - w.bits.length));       // terminator
    while (w.bits.length % 8) w.bits.push(0);          // to a byte boundary

    var out = [];
    for (var i = 0; i < w.bits.length; i += 8) {
      var byte = 0;
      for (var j = 0; j < 8; j++) byte = (byte << 1) | w.bits[i + j];
      out.push(byte);
    }
    /* The spec's pad bytes, alternating, until the block is full. */
    var pad = [0xec, 0x11];
    for (var k = 0; out.length < capacity; k++) out.push(pad[k % 2]);
    return out;
  }

  /**
   * Split into blocks, add EC to each, then interleave.
   *
   * Interleaving is what makes the error correction worth having: a thumb over
   * one corner damages a run of consecutive modules, and spreading each
   * block's bytes across the whole code turns that into a few errors in every
   * block instead of every error in one.
   */
  function interleave(data, version, level) {
    var spec = BLOCKS[level][version];
    var blockCount = spec[1];
    var total = TOTAL_CODEWORDS[version];
    var ecPerBlock = Math.floor((total - spec[0]) / blockCount);
    var shortLen = Math.floor(spec[0] / blockCount);
    var longCount = spec[0] % blockCount;          // blocks with one byte more

    var dataBlocks = [], ecBlocks = [], at = 0;
    for (var b = 0; b < blockCount; b++) {
      var len = shortLen + (b >= blockCount - longCount ? 1 : 0);
      var block = data.slice(at, at + len);
      at += len;
      dataBlocks.push(block);
      ecBlocks.push(ecBytes(block, ecPerBlock));
    }

    var out = [];
    var longest = Math.max.apply(null, dataBlocks.map(function (x) { return x.length; }));
    for (var i = 0; i < longest; i++) {
      dataBlocks.forEach(function (block) {
        if (i < block.length) out.push(block[i]);
      });
    }
    for (var e = 0; e < ecPerBlock; e++) {
      ecBlocks.forEach(function (block) { out.push(block[e]); });
    }
    return out;
  }

  /* --------------------------------------------------------------- matrix */

  /* Three states per module: null is "not yet placed", which is what tells
     the data walk and the mask apart from the function patterns. */
  function blank(size) {
    var m = new Array(size);
    for (var y = 0; y < size; y++) m[y] = new Array(size).fill(null);
    return m;
  }

  function finder(m, x, y) {
    for (var dy = -1; dy <= 7; dy++) {
      for (var dx = -1; dx <= 7; dx++) {
        var px = x + dx, py = y + dy;
        if (px < 0 || py < 0 || px >= m.length || py >= m.length) continue;
        /* Distance from the centre as a square ring. The pattern is a 3x3
           dark block (rings 0-1), a light 5x5 ring (2), a dark 7x7 ring (3)
           and the light separator around it (4). */
        var ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        m[py][px] = ring <= 1 || ring === 3;
      }
    }
  }

  function alignment(m, cx, cy) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        var ring = Math.max(Math.abs(dx), Math.abs(dy));
        m[cy + dy][cx + dx] = ring !== 1;
      }
    }
  }

  function functionPatterns(m, version) {
    var size = m.length;
    finder(m, 0, 0);
    finder(m, size - 7, 0);
    finder(m, 0, size - 7);

    // timing patterns, alternating along row and column 6
    for (var i = 8; i < size - 8; i++) {
      m[6][i] = i % 2 === 0;
      m[i][6] = i % 2 === 0;
    }
    if (ALIGN[version]) alignment(m, ALIGN[version], ALIGN[version]);

    /* Format information areas are reserved now and written after masking,
       because which mask won is not known until the penalties are scored. */
    for (var k = 0; k <= 8; k++) {
      if (m[8][k] === null) m[8][k] = false;
      if (m[k][8] === null) m[k][8] = false;
    }
    for (var j = 0; j < 8; j++) {
      if (m[8][size - 1 - j] === null) m[8][size - 1 - j] = false;
      if (m[size - 1 - j][8] === null) m[size - 1 - j][8] = false;
    }
    m[size - 8][8] = true;               // the always-dark module
  }

  /**
   * The data walk: two-module columns from the right, alternating upwards and
   * downwards, skipping column 6 because the timing pattern owns it.
   */
  function placeData(m, bytes, reserved) {
    var size = m.length;
    var bits = [];
    bytes.forEach(function (b) {
      for (var i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    });

    var at = 0, up = true;
    for (var right = size - 1; right > 0; right -= 2) {
      if (right === 6) right = 5;        // the timing column is not a column
      for (var step = 0; step < size; step++) {
        var y = up ? size - 1 - step : step;
        for (var c = 0; c < 2; c++) {
          var x = right - c;
          if (reserved[y][x]) continue;
          m[y][x] = at < bits.length ? bits[at] === 1 : false;
          at++;
        }
      }
      up = !up;
    }
    return at;
  }

  var MASKS = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; },
    function (x, y) { return ((x * y) % 2) + ((x * y) % 3) === 0; },
    function (x, y) { return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; },
    function (x, y) { return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; }
  ];

  /**
   * The four penalty rules, scored so the least patterned mask wins.
   *
   * The point is not aesthetics: a code with long same-colour runs or big
   * blocks is harder for a scanner to lock onto, and anything resembling a
   * finder pattern in the data can be mistaken for one.
   */
  function penalty(m) {
    var size = m.length, score = 0, x, y, run, i;

    // 1: runs of five or more of the same colour, in both directions
    for (y = 0; y < size; y++) {
      run = 1;
      for (x = 1; x < size; x++) {
        if (m[y][x] === m[y][x - 1]) { run++; } else { if (run >= 5) score += run - 2; run = 1; }
      }
      if (run >= 5) score += run - 2;
    }
    for (x = 0; x < size; x++) {
      run = 1;
      for (y = 1; y < size; y++) {
        if (m[y][x] === m[y - 1][x]) { run++; } else { if (run >= 5) score += run - 2; run = 1; }
      }
      if (run >= 5) score += run - 2;
    }

    // 2: every 2x2 block of one colour
    for (y = 0; y < size - 1; y++) {
      for (x = 0; x < size - 1; x++) {
        var v = m[y][x];
        if (v === m[y][x + 1] && v === m[y + 1][x] && v === m[y + 1][x + 1]) score += 3;
      }
    }

    // 3: the finder-like 1:1:3:1:1 sequence with four light modules beside it
    var PAT = [true, false, true, true, true, false, true];
    var line = function (get) {
      for (i = 0; i + 7 <= size; i++) {
        var hit = true;
        for (var k = 0; k < 7; k++) if (get(i + k) !== PAT[k]) { hit = false; break; }
        if (!hit) continue;
        var before = true, after = true;
        for (var b = 1; b <= 4; b++) {
          if (i - b < 0 || get(i - b)) { before = false; break; }
        }
        for (var a = 7; a <= 10; a++) {
          if (i + a >= size || get(i + a)) { after = false; break; }
        }
        if (before || after) score += 40;
      }
    };
    for (y = 0; y < size; y++) line(function (x2) { return m[y][x2]; });
    for (x = 0; x < size; x++) line(function (y2) { return m[y2][x]; });

    // 4: how far the proportion of dark modules is from half
    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (m[y][x]) dark++;
    var away = Math.abs((dark * 100) / (size * size) - 50);
    score += Math.floor(away / 5) * 10;
    return score;
  }

  function writeFormat(m, level, mask) {
    var size = m.length;
    var bits = FORMAT_BITS[level][mask];
    var bit = function (i) { return ((bits >> i) & 1) === 1; };

    /* Written twice, in two L-shapes, so losing one corner does not lose the
       code's own description of itself.
       
       Bit 0 sits at (8,0) and the numbering rises anticlockwise to bit 14 at
       (0,8). Getting this backwards is not a bug any round-trip test can see
       — a decoder that mirrors the encoder reads the reversed word back and
       agrees with itself — and a real scanner reads a bit-reversed 15-bit
       word, fails the BCH check on it and gives up on the whole symbol. It
       cost this encoder its first two attempts. */
    for (var i = 0; i <= 5; i++) m[8][i] = bit(i);
    m[8][7] = bit(6);
    m[8][8] = bit(7);
    m[7][8] = bit(8);
    for (var j = 9; j <= 14; j++) m[14 - j][8] = bit(j);

    /* The same fifteen bits again: seven up the bottom-left column and eight
       along the top-right row. Seven and eight, not eight and seven — the
       split is what leaves row size-8 of column 8 free for the always-dark
       module. */
    for (var k = 0; k <= 6; k++) m[size - 1 - k][8] = bit(14 - k);
    for (var n = 7; n <= 14; n++) m[8][size - 15 + n] = bit(14 - n);
  }

  /**
   * Encode text as a QR code.
   *
   * @param {string} text
   * @param {object} [opts] { level: 'L'|'M', minVersion }
   * @returns {object} { size, version, level, mask, modules }
   *   modules is [row][col] of booleans, true meaning dark.
   */
  function qr(text, opts) {
    opts = opts || {};
    var level = opts.level === 'L' ? 'L' : 'M';
    var bytes = utf8Bytes(text);
    if (!bytes.length) throw new Error('QR: nothing to encode');

    var version = pickVersion(bytes.length, level);
    if (opts.minVersion) version = Math.max(version, Math.min(MAX_VERSION, opts.minVersion));

    var payload = interleave(codewords(bytes, version, level), version, level);
    var size = 17 + version * 4;

    /* Built once with the function patterns, then copied per mask: which
       modules are data and which are structure has to be decided before the
       data goes in, and the mask must never touch the structure. */
    var base = blank(size);
    functionPatterns(base, version);
    var reserved = base.map(function (row) {
      return row.map(function (v) { return v !== null; });
    });
    placeData(base, payload, reserved);

    var best = null;
    for (var mask = 0; mask < 8; mask++) {
      var m = base.map(function (row) { return row.slice(); });
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          if (!reserved[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
        }
      }
      writeFormat(m, level, mask);
      var score = penalty(m);
      if (!best || score < best.score) best = { score: score, mask: mask, modules: m };
    }

    return {
      size: size, version: version, level: level,
      mask: best.mask, modules: best.modules
    };
  }

  /**
   * The same code as an SVG string.
   *
   * One path rather than a rect per module: a version 4 code is over a
   * thousand modules and half of them are dark, and five hundred elements in
   * a slide that is already being scaled is a lot of nodes for a square.
   *
   * @param {string} text
   * @param {object} [opts] { level, quiet, size, light, dark, title }
   */
  function qrSvg(text, opts) {
    opts = opts || {};
    var code = qr(text, opts);
    /* Four modules of clear space on every side, which the spec requires and
       scanners genuinely need — a code butted against other content often
       will not read at all. */
    var quiet = opts.quiet == null ? 4 : Math.max(0, opts.quiet);
    var span = code.size + quiet * 2;
    var d = [];
    for (var y = 0; y < code.size; y++) {
      for (var x = 0; x < code.size; x++) {
        if (code.modules[y][x]) d.push('M' + (x + quiet) + ' ' + (y + quiet) + 'h1v1h-1z');
      }
    }
    var px = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
    var label = opts.title
      ? '<title>' + String(opts.title).replace(/[<&>]/g, '') + '</title>' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + span + ' ' + span + '"' +
      px + ' shape-rendering="crispEdges" role="img">' + label +
      '<rect width="' + span + '" height="' + span + '" fill="' + (opts.light || '#fff') + '"/>' +
      '<path fill="' + (opts.dark || '#000') + '" d="' + d.join('') + '"/></svg>';
  }

  SF.qr = qr;
  SF.qrSvg = qrSvg;
  SF.QR_MAX_VERSION = MAX_VERSION;
  SF.QR_TOTAL_CODEWORDS = TOTAL_CODEWORDS;
  SF.QR_REMAINDER_BITS = REMAINDER_BITS;
  SF.QR_BLOCKS = BLOCKS;
  SF.qrInternals = { generator: generator, ecBytes: ecBytes, gmul: gmul, utf8Bytes: utf8Bytes };
})(window);
