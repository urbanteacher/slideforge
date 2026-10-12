/*
 * Video links, SlideForge's way (js/render.js: youtubeId, videoEmbed, videoStill).
 *
 * YouTube and Vimeo hand out a watch page, not a media file, so a video element can never play one.
 * Both publish an embed designed to be framed, so a link is recognised and framed instead: YouTube
 * from youtube-nocookie.com (the same player, setting no tracking cookie until the clip is played —
 * the right default for a room of students), Vimeo from player.vimeo.com. The canvas shows the
 * service's own still with a note that the link was understood; the show frames the real player.
 */
import type { Layer, Params } from '../core';
import { bump } from './raster';

/** The YouTube id in a link, or ''. */
export function youtubeId(raw: unknown): string {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  let u: URL;
  try { u = new URL(text, 'https://x.invalid'); } catch { return ''; }
  const host = u.hostname.toLowerCase();
  let id = '';
  if (/(^|\.)youtu\.be$/.test(host)) id = u.pathname.slice(1).split('/')[0];
  else if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
    if (u.pathname === '/watch') id = u.searchParams.get('v') ?? '';
    else id = u.pathname.match(/^\/(?:embed|v|shorts|live)\/([^/?#]+)/)?.[1] ?? '';
  }
  return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : '';
}

/** The service's still for a clip: the layer's own poster, else YouTube's thumbnail. hqdefault,
 *  because every video has one and a clip uploaded below 720p has no maxresdefault. */
export function videoStill(p: Params): string {
  if (p.poster) return String(p.poster);
  const id = youtubeId(p.src);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

/** The address to frame for a YouTube or Vimeo link, with the layer's start, end, sound and loop;
 *  '' when the source is a file the lab plays itself. */
export function videoEmbed(p: Params): string {
  const raw = String(p.src ?? '').trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return '';
  let u: URL;
  try { u = new URL(raw, 'https://x.invalid'); } catch { return ''; }
  const host = u.hostname.toLowerCase();
  let id = '', base = '';
  if (/(^|\.)vimeo\.com$/.test(host)) { id = u.pathname.match(/\/(\d+)/)?.[1] ?? ''; base = 'https://player.vimeo.com/video/'; }
  else id = youtubeId(raw);
  if (!id) return '';
  const vimeo = !!base;
  base = base || 'https://www.youtube-nocookie.com/embed/';
  // "Share at current time" puts the start in the link (90, 1m30s or 90s); the layer's own wins.
  let start = Number(p.start) > 0 ? Math.floor(Number(p.start)) : 0;
  if (!start) {
    const t = u.searchParams.get('t') ?? u.searchParams.get('start') ?? (u.hash.indexOf('t=') === 1 ? u.hash.slice(3) : '');
    const hms = String(t).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
    if (hms && (hms[1] || hms[2] || hms[3])) start = +(hms[1] ?? 0) * 3600 + +(hms[2] ?? 0) * 60 + +(hms[3] ?? 0);
  }
  const q: string[] = [];
  // rel=0: without it a clip ends on a grid of somebody else's videos, in front of the room.
  if (!vimeo) q.push('rel=0', 'modestbranding=1', 'playsinline=1');
  if (start > 0) q.push(vimeo ? `#t=${start}s` : `start=${start}`);
  if (!vimeo && Number(p.end) > start) q.push(`end=${Math.floor(Number(p.end))}`);
  if (p.muted !== false) q.push(vimeo ? 'muted=1' : 'mute=1');
  // Autoplay is only honoured when muted, on both services.
  if (p.autoplay) q.push('autoplay=1');
  if (p.loop) q.push(vimeo ? 'loop=1' : `loop=1&playlist=${id}`);
  const hash = q.find((x) => x.startsWith('#')) ?? '';
  const search = q.filter((x) => !x.startsWith('#')).join('&');
  return `${base}${id}${search ? `?${search}` : ''}${hash}`;
}

/** The service a link belongs to, for the note on the still. */
export const videoService = (p: Params) => (youtubeId(p.src) ? 'YouTube' : /vimeo\.com/i.test(String(p.src ?? '')) ? 'Vimeo' : '');


// ─── Clips: the video elements the player runs (from engine/raster.ts) ──────

// ─── Video ──────────────────────────────────────────────────────────────────
// Videos play muted on a loop (the only way a browser will autoplay them). The renderer
// re-uploads a video layer whenever `contentFrame` moves on, so the texture follows playback.
// A clip with its sound on ("Start muted" off) is the show's to run instead (showMedia): it plays
// from its start when its slide comes up and stops when the show moves on, so it is left alone here.
const videos = new Map<string, HTMLVideoElement>();
const voiced = new Set<string>();
// Silent clips the presenter has paused. A silent clip otherwise starts itself again whenever it
// is drawn, so without this a pause would last one frame.
const held = new Set<string>();
export function getVideo(src: string): HTMLVideoElement | null {
  if (!src || typeof document === 'undefined') return null;
  let v = videos.get(src);
  if (!v) {
    v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.onloadeddata = bump;
    v.src = src;
    if (!voiced.has(src) && !held.has(src)) v.play().catch(() => undefined);
    videos.set(src, v);
  }
  if (v.paused && v.readyState >= 2 && !voiced.has(src) && !held.has(src)) v.play().catch(() => undefined);
  return v.readyState >= 2 && v.videoWidth > 0 ? v : null;
}

/** A video layer that plays its own sound in a show: a file (not YouTube or Vimeo) with "Start muted" off. */
export function voicedVideo(layer: Layer): boolean {
  return layer.kind === 'video' && layer.visible && layer.params.muted === false && !!layer.params.src && !videoEmbed(layer.params);
}

/**
 * A show's sound, for the slide it has just come to (engine/player.ts). The slide's clips with sound
 * play, unmuted, from where they were (from their start the first time, or once one has finished)
 * when "Play when the slide appears" is on, and wait at their start for a press when it is off. The
 * transition does not stop them: they start as the slide arrives and carry on. Every other clip with
 * sound is paused, so nothing talks over the next slide. `null` silences them all (the show paused or ended).
 */
export function showMedia(layers: Layer[] | null) {
  // A new slide (or the show coming back to the lab) starts its clips afresh.
  held.clear();
  const here = new Map((layers ?? []).filter(voicedVideo).map((l) => [String(l.params.src), l]));
  for (const src of voiced) if (!here.has(src)) { const v = videos.get(src); if (v) { v.pause(); v.muted = true; } }
  for (const [src, l] of here) {
    voiced.add(src);
    getVideo(src);
    const v = videos.get(src)!;
    v.loop = !!l.params.loop;
    const start = Math.max(0, Number(l.params.start ?? 0));
    if (v.ended || (v.currentTime < start && v.paused)) v.currentTime = start;
    v.muted = false;
    if (l.params.autoplay === false) continue;
    // A browser can refuse sound before the page has been pressed: the clip then plays silent.
    v.play().catch(() => { v.muted = true; v.play().catch(() => undefined); });
  }
}

/** A clip the lab plays itself: a file, not a YouTube or Vimeo link (those play in the service's own player). */
export function fileClip(layer: Layer): boolean {
  return layer.kind === 'video' && layer.visible && !!layer.params.src && !videoEmbed(layer.params);
}

/** Whether a clip is playing now. */
export function mediaPlaying(layer: Layer): boolean {
  const v = videos.get(String(layer.params.src ?? ''));
  return !!v && !v.paused && !v.ended;
}

/** Play or pause a clip, from a press on it in the show or the presenter's key. `play` forces the way. */
export function toggleMedia(layer: Layer, play?: boolean) {
  const src = String(layer.params.src ?? '');
  const v = videos.get(src);
  if (!v) return;
  const start = play ?? (v.paused || v.ended);
  if (start) {
    held.delete(src);
    if (voicedVideo(layer)) v.muted = false;
    if (v.ended) v.currentTime = Math.max(0, Number(layer.params.start ?? 0));
    v.play().catch(() => { v.muted = true; v.play().catch(() => undefined); });
  } else {
    if (!voiced.has(src)) held.add(src);
    v.pause();
  }
}

/** Changes whenever a content layer needs redrawing without its params changing (a playing video). */
export function contentFrame(layer: Layer): number {
  if (layer.kind !== 'video') return 0;
  const v = videos.get(String(layer.params.src ?? ''));
  return v ? v.currentTime : 0;
}
