/*
 * Video links, SlideForge's way (js/render.js: youtubeId, videoEmbed, videoStill).
 *
 * YouTube and Vimeo hand out a watch page, not a media file, so a video element can never play one.
 * Both publish an embed designed to be framed, so a link is recognised and framed instead: YouTube
 * from youtube-nocookie.com (the same player, setting no tracking cookie until the clip is played —
 * the right default for a room of students), Vimeo from player.vimeo.com. The canvas shows the
 * service's own still with a note that the link was understood; the show frames the real player.
 */
import type { Params } from './types';

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
