import type { Deck, Slide } from '../core';
import { frameCount, imageSettled, reel, reelAt } from '../engine';
import { download, drawMoment, pruneMoments, slug } from './exporters';
import { mp4Blob, type Mp4Sample } from './mp4';

// Export → Video: the deck (or one slide) played as a show plays it, builds clicked for it a set hold
// after each step has arrived, drawn a frame at a time by the same renderer as the stills, and encoded
// in the browser (WebCodecs, H.264) into an .mp4. Nothing leaves the computer. The frame is the deck's
// own shape: typed layouts are laid out for it, so a square or upright video would only be the slide
// with bands, and is not offered.

export const VIDEO_FPS = 30;
export interface VideoOptions {
  /** The whole deck (its shown slides), or one slide. */
  slides: Slide[];
  /** Picture height in pixels: 1080 or 720. The width follows the deck's shape. */
  height: number;
  /** Seconds each build step is held before the next is clicked, and the last before the slide moves on. */
  hold: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export const canExportVideo = () => typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;

// High, then Main, then Baseline, at level 4 (1080p at 30 fps).
const CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.420028'];

async function encoderConfig(width: number, height: number): Promise<VideoEncoderConfig> {
  for (const codec of CODECS) {
    const config: VideoEncoderConfig = { codec, width, height, framerate: VIDEO_FPS, bitrate: height >= 1080 ? 8_000_000 : 5_000_000, avc: { format: 'avc' } };
    const ok = await VideoEncoder.isConfigSupported(config).catch(() => null);
    if (ok?.supported) return config;
  }
  throw new Error('This browser cannot encode H.264 video at this size');
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
const yieldToPage = () => new Promise<void>((r) => setTimeout(r, 0));
const bytes = (b: AllowSharedBufferSource) => (ArrayBuffer.isView(b) ? new Uint8Array(b.buffer, b.byteOffset, b.byteLength) : new Uint8Array(b)).slice();

/** Seconds of video the options make, for the dialog to say before it starts. */
export const videoLength = (o: Pick<VideoOptions, 'slides' | 'hold'>) => reel(o.slides, o.hold).length;

export async function makeVideo(deck: Deck, o: VideoOptions): Promise<Blob> {
  if (!canExportVideo()) throw new Error('This browser cannot make video: it needs WebCodecs (current Chrome or Edge, Safari 17 or later)');
  const r = reel(o.slides, o.hold);
  if (!r.parts.length) throw new Error('No slides to show: every slide is hidden');
  // Pictures and the deck's typefaces first: a frame drawn before they arrive leaves them out.
  const srcs = new Set<string>();
  for (const p of r.parts) for (const l of p.slide.layers) {
    const src = l.params?.src;
    if (typeof src === 'string' && src && l.kind !== 'video') srcs.add(src);
  }
  await Promise.all([...srcs].map(imageSettled));
  await document.fonts?.ready;

  const H = even(o.height), W = even((H * deck.width) / deck.height);
  // The renderer's picture is copied onto a frame of exactly W × H, which H.264 needs even.
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = W;
  frameCanvas.height = H;
  const ctx = frameCanvas.getContext('2d')!;

  const config = await encoderConfig(W, H);
  const samples: Mp4Sample[] = [];
  let avcC: Uint8Array | null = null;
  let failed: Error | null = null;
  let last = -1;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      const d = meta?.decoderConfig?.description;
      if (d && !avcC) avcC = bytes(d);
      // The writer times frames in the order they come; an encoder that reorders them is not supported.
      if (chunk.timestamp < last) failed = new Error('The encoder reordered frames');
      last = chunk.timestamp;
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      samples.push({ data, key: chunk.type === 'key' });
    },
    error: (e) => { failed = e instanceof Error ? e : new Error(String(e)); },
  });
  encoder.configure(config);

  const total = frameCount(r, VIDEO_FPS);
  const reduce = deck.motion === 'reduce';
  let part = -1;
  try {
    for (let n = 0; n < total; n++) {
      if (o.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (failed) throw failed;
      const t = n / VIDEO_FPS;
      const at = reelAt(r, t)!;
      const i = r.parts.indexOf(at.part);
      // Only this slide's and the one before's textures stay on the GPU, as the canvas keeps them.
      if (i !== part) { part = i; pruneMoments([at.part.slide, ...(at.part.prev ? [at.part.prev] : [])]); }
      const src = drawMoment(at.part.slide, deck, W, {
        t: at.local, clicks: at.part.clicks, time: t, reduce,
        from: at.trans !== null ? at.part.prev : null, p: at.trans ?? undefined,
      });
      ctx.drawImage(src, 0, 0, W, H);
      const frame = new VideoFrame(frameCanvas, { timestamp: Math.round((n * 1e6) / VIDEO_FPS), duration: Math.round(1e6 / VIDEO_FPS) });
      // A key frame every two seconds, so a player can seek.
      encoder.encode(frame, { keyFrame: n % (VIDEO_FPS * 2) === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 6) await yieldToPage();
      if (n % 3 === 0) { o.onProgress?.(n, total); await yieldToPage(); }
    }
    await encoder.flush();
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
  if (failed) throw failed;
  if (!avcC) throw new Error('The encoder gave no stream description');
  o.onProgress?.(total, total);
  return mp4Blob({ width: W, height: H, fps: VIDEO_FPS, avcC, samples });
}

export async function exportVideo(deck: Deck, o: VideoOptions & { name?: string }) {
  const blob = await makeVideo(deck, o);
  download(`${slug(o.name ?? deck.title)}.mp4`, blob);
  return blob;
}
