// A small MP4 writer for the video export: one H.264 track, every frame the same length, the whole of
// it in memory. The index (moov) goes before the pictures (mdat), so QuickTime and a browser can start
// playing before the file has all arrived. Enough for a lesson: no audio, no edit lists, under 4 GB.

export interface Mp4Sample { data: Uint8Array; key: boolean }
export interface Mp4Track {
  width: number;
  height: number;
  fps: number;
  /** The encoder's AVCDecoderConfigurationRecord (VideoEncoder's decoderConfig.description). */
  avcC: Uint8Array;
  samples: Mp4Sample[];
}

const enc = new TextEncoder();
const u8 = (...b: number[]) => new Uint8Array(b);
const u16 = (n: number) => u8((n >>> 8) & 255, n & 255);
const u32 = (n: number) => u8((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
const zeros = (n: number) => new Uint8Array(n);
const fourcc = (s: string) => enc.encode(s);

function cat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

function box(type: string, ...parts: Uint8Array[]): Uint8Array {
  const body = cat(parts);
  return cat([u32(8 + body.length), fourcc(type), body]);
}
/** A full box: version and flags before the body. */
const full = (type: string, version: number, flags: number, ...parts: Uint8Array[]) =>
  box(type, u8(version, (flags >>> 16) & 255, (flags >>> 8) & 255, flags & 255), ...parts);

// The identity matrix, in 16.16 and 2.30 fixed point.
const MATRIX = cat([u32(0x10000), u32(0), u32(0), u32(0), u32(0x10000), u32(0), u32(0), u32(0), u32(0x40000000)]);

function moov(t: Mp4Track, before: number): Uint8Array {
  const n = t.samples.length;
  const timescale = t.fps * 1000, delta = 1000, duration = n * delta;
  const mvhd = full('mvhd', 0, 0, u32(0), u32(0), u32(timescale), u32(duration), u32(0x10000), u16(0x100), zeros(10), MATRIX, zeros(24), u32(2));
  const tkhd = full('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(duration), zeros(8), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(t.width << 16), u32(t.height << 16));
  const mdhd = full('mdhd', 0, 0, u32(0), u32(0), u32(timescale), u32(duration), u16(0x55c4) /* und */, u16(0));
  const hdlr = full('hdlr', 0, 0, u32(0), fourcc('vide'), zeros(12), enc.encode('VideoHandler\0'));
  const vmhd = full('vmhd', 0, 1, zeros(8));
  const dinf = box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1)));
  const name = zeros(32);
  const avc1 = box('avc1',
    zeros(6), u16(1), // reserved, data reference 1
    zeros(16), u16(t.width), u16(t.height),
    u32(0x480000), u32(0x480000), u32(0), u16(1), name, u16(0x18), u16(0xffff),
    box('avcC', t.avcC));
  const stsd = full('stsd', 0, 0, u32(1), avc1);
  const stts = full('stts', 0, 0, u32(1), u32(n), u32(delta));
  const keys = t.samples.flatMap((s, i) => (s.key ? [i + 1] : []));
  const stss = full('stss', 0, 0, u32(keys.length), ...keys.map(u32));
  const stsc = full('stsc', 0, 0, u32(1), u32(1), u32(n), u32(1));
  const stsz = full('stsz', 0, 0, u32(0), u32(n), ...t.samples.map((s) => u32(s.data.length)));
  const stco = (offset: number) => full('stco', 0, 0, u32(1), u32(offset));
  const build = (offset: number) => box('moov', mvhd, box('trak', tkhd, box('mdia', mdhd, hdlr, box('minf', vmhd, dinf, box('stbl', stsd, stts, stss, stsc, stsz, stco(offset))))));
  // The pictures start straight after ftyp, moov and mdat's own header: moov's size does not depend on the offset.
  const size = build(0).length;
  return build(before + size + 8);
}

const FTYP = box('ftyp', fourcc('isom'), u32(0x200), fourcc('isom'), fourcc('iso2'), fourcc('avc1'), fourcc('mp41'));

/** The file, as the parts of a Blob: the pictures are not copied. */
export function mp4Parts(t: Mp4Track): Uint8Array[] {
  if (!t.samples.length) throw new Error('No frames to write');
  if (!t.samples[0].key) throw new Error('The first frame must be a key frame');
  const bytes = t.samples.reduce((n, s) => n + s.data.length, 0);
  if (bytes + 1e6 > 0xffffffff) throw new Error('Too long for one file: export fewer slides, or a smaller size');
  return [FTYP, moov(t, FTYP.length), u32(8 + bytes), fourcc('mdat'), ...t.samples.map((s) => s.data)];
}

export const mp4Blob = (t: Mp4Track) => new Blob(mp4Parts(t) as BlobPart[], { type: 'video/mp4' });
