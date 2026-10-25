// A motion HTML file -> stills, a contact sheet, or an MP4 for a video slide.
//   node tools/motion/render.mjs <anim.html> --check     # contract, seam, errors
//   node tools/motion/render.mjs <anim.html> --stills 0.5,2,3.75
//   node tools/motion/render.mjs <anim.html> --sheet
//   node tools/motion/render.mjs <anim.html> --out assets/lesson/x/clip.mp4 [--poster 2.5]
//   node tools/motion/render.mjs <anim.html> --format all --out x.mp4   # x-16x9.mp4, x-1x1.mp4, x-9x16.mp4
// Other flags: --duration s, --fps 24, --size 1920x1080, --workers 4, --loop,
//   --bitrate 1400000, --work <dir> (frames and stills; default a temp folder).
//
// Cues: window.MOTION.cues names the clip's event times in seconds
// ({ title: { in: 0.3 }, exit: 4.9 }), so the page reads its timing from one
// place. --stills takes a cue as well as a time (title.in, exit+0.2), --sheet
// labels the cell each cue falls in, and --check proves every cue lies inside
// the clip.
//
// Formats: --format 16x9 | 1x1 | 9x16 | all draws the page at that size, with
// window.MOTION_FORMAT = { name, width, height } set before it runs. Each is
// the page's own composition, not a crop, so it must list the format in
// window.MOTION.formats. With --format, --check also fails a page whose layout
// spills past the frame.
//
// The page is drawn at exact times, never played. It either exposes
// window.renderAt(t) (seconds; may return a promise), or animates with CSS /
// the Web Animations API, which are paused and seeked to t. window.MOTION =
// { duration, fps, width, height } supplies defaults the flags override.
// Date, performance.now and Math.random are frozen and seeded before the page
// runs, so a stray clock reads t rather than the wall.
//
// Frames are i / fps for i = 0 … N-1, never N, so a loop joins without a
// doubled frame; with MOTION.loop (or --loop), --check also proves the seam:
// t = duration must be frame 0, pixel for pixel. Any page error, console
// error, failed request or lost WebGL context fails --check and stops --out
// before it encodes. Encoding is tools/video/frames-to-mp4.swift: no ffmpeg.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const file = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : null;
if (!file || !fs.existsSync(file)) {
  console.error('usage: node tools/motion/render.mjs <anim.html> [--check | --stills t,t | --sheet | --out clip.mp4]');
  process.exit(2);
}
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const has = k => args.includes('--' + k);
const work = path.resolve(opt('work', path.join(os.tmpdir(), 'slideforge-motion', path.basename(file, '.html'))));

/* The social shapes. A page opts into each by listing it in MOTION.formats. */
const FORMATS = { '16x9': { width: 1920, height: 1080 }, '1x1': { width: 1080, height: 1080 }, '9x16': { width: 1080, height: 1920 } };
const format = opt('format', null);
if (format && format !== 'all' && !FORMATS[format]) {
  console.error(`--format ${format}: use ${Object.keys(FORMATS).join(', ')} or all`);
  process.exit(2);
}
if (format && has('size')) { console.error('--format and --size both set the frame: pass one'); process.exit(2); }

/* Served over http rather than file:// so the page can import its own
   modules and fetch its own assets; the folder it sits in is the root. */
const root = path.dirname(file);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.glsl': 'text/plain' };
const server = http.createServer((req, res) => {
  /* Full Chrome asks for an icon the headless shell does not; its 404 is not the page's error. */
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(path.basename(file))}`;

/* Runs before any page script. Every clock answers window.__t (ms), and
   Math.random is a seeded generator, so two renders of one t are one picture. */
function freeze() {
  window.__t = 0;
  const start = 1767225600000; // 2026-01-01, a fixed "now"
  const RealDate = Date;
  class FrozenDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(start + window.__t); }
    static now() { return start + window.__t; }
  }
  window.Date = FrozenDate;
  performance.now = () => window.__t;
  let s = 0x2545f491;
  Math.random = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let size = format && format !== 'all' ? FORMATS[format] : null, meta = null;
/* Every one of these is a frame that may be wrong, so each must read zero. */
const errors = { page: 0, console: 0, request: 0, http: 0, webgl: 0 };
const firstSeen = [];
function count(kind, text) {
  errors[kind]++;
  if (firstSeen.length < 5) firstSeen.push(`${kind}: ${String(text).slice(0, 200)}`);
}
async function newPage() {
  const probe = size || { width: 1920, height: 1080 };
  const page = await browser.newPage({ viewport: probe, deviceScaleFactor: 1 });
  page.on('pageerror', e => count('page', e.message));
  page.on('console', m => {
    if (/CONTEXT_LOST|context lost/i.test(m.text())) count('webgl', m.text());
    else if (m.type() === 'error') count('console', m.text());
  });
  page.on('requestfailed', r => count('request', `${r.url()} ${r.failure()?.errorText || ''}`));
  page.on('response', r => { if (r.status() >= 400) count('http', `${r.status()} ${r.url()}`); });
  await page.addInitScript(freeze);
  if (size && format !== 'all') await page.addInitScript(f => { window.MOTION_FORMAT = f; }, { name: format || 'custom', ...size });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (!meta) {
    meta = await page.evaluate(() => ({ ...(window.MOTION || {}), renderAt: typeof window.renderAt === 'function' }));
    if (!size) {
      const [w, h] = String(opt('size', `${meta.width || 1920}x${meta.height || 1080}`)).split('x').map(Number);
      size = { width: w, height: h };
      if (w !== probe.width || h !== probe.height) await page.setViewportSize(size);
    }
  }
  return page;
}

/* Cues flattened to dotted names: { title: { in: 0.3 } } reads as title.in. */
function flatCues(o, pre = '', out = {}) {
  for (const [k, v] of Object.entries(o || {})) {
    if (v && typeof v === 'object') flatCues(v, pre + k + '.', out);
    else out[pre + k] = v;
  }
  return out;
}
/* A moment: seconds ("2.5"), a cue ("title.in"), or a cue and an offset ("exit+0.2"). */
function moment(s, cues) {
  const str = String(s).trim();
  if (str !== '' && Number.isFinite(Number(str))) return { t: Number(str), name: '' };
  const m = str.match(/^([A-Za-z_][\w.]*?)\s*([+-]\s*\d*\.?\d+)?$/);
  if (!m || !(m[1] in cues)) {
    throw new Error(`"${str}" is not a time or a cue; the cues are ${Object.keys(cues).join(', ') || 'none (set window.MOTION.cues)'}`);
  }
  return { t: Number(cues[m[1]]) + Number((m[2] || '0').replace(/\s/g, '')), name: str.replace(/\s/g, '') };
}

/* Spill: a layout that does not reflow overflows a frame it was not written for. */
async function spill(page) {
  return page.evaluate(({ width, height }) => {
    const r = document.documentElement, b = document.body;
    const w = Math.max(r.scrollWidth, b ? b.scrollWidth : 0), h = Math.max(r.scrollHeight, b ? b.scrollHeight : 0);
    return w > width || h > height ? `${w}x${h}` : '';
  }, size);
}
async function seek(page, t) {
  await page.evaluate(async t => {
    window.__t = t * 1000;
    if (typeof window.renderAt === 'function') await window.renderAt(t);
    else for (const a of document.getAnimations()) { a.pause(); a.currentTime = t * 1000; }
    /* Two frames, so a canvas or WebGL draw made in renderAt reaches the compositor. */
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t);
}
function errorTotal() { return Object.values(errors).reduce((a, b) => a + b, 0); }
function reportErrors() {
  const total = errorTotal();
  console.log('  errors: ' + Object.entries(errors).map(([k, v]) => `${k} ${v}`).join(', '));
  firstSeen.forEach(x => console.log('    ' + x));
  return total;
}
async function shot(page, t, dest) {
  await seek(page, t);
  return page.screenshot({ path: dest, type: 'png' });
}

const first = await newPage();
const declared = Array.isArray(meta.formats) ? meta.formats : [];
if (format === 'all') {
  /* One run per format, each in a process of its own, with its own size,
     output (x-1x1.mp4) and work folder. */
  if (!declared.length) {
    console.error('--format all: the page lists no formats; set window.MOTION.formats, e.g. [\'16x9\', \'1x1\', \'9x16\']');
    await browser.close(); server.close();
    process.exit(2);
  }
  const set = (list, k, v) => { const i = list.indexOf('--' + k); if (i < 0) list.push('--' + k, v); else list[i + 1] = v; return list; };
  let failed = 0;
  for (const f of declared) {
    const child = set(args.slice(1), 'format', f);
    set(child, 'work', path.join(work, f));
    if (opt('out')) set(child, 'out', path.resolve(opt('out')).replace(/(\.mp4)?$/i, `-${f}.mp4`));
    console.log(`\n${f}`);
    try { execFileSync(process.execPath, [fileURLToPath(import.meta.url), file, ...child], { stdio: 'inherit' }); }
    catch { failed++; }
  }
  await browser.close(); server.close();
  process.exit(failed ? 1 : 0);
}
if (format && !declared.includes(format)) {
  console.error(`--format ${format}: the page lists ${declared.length ? declared.join(', ') : 'no formats'} in window.MOTION.formats. ` +
    'Lay it out for this shape first: a format is its own composition, not a crop.');
  await browser.close(); server.close();
  process.exit(2);
}
const cues = flatCues(meta.cues);
const fps = Number(opt('fps', meta.fps || 24));
const duration = Number(opt('duration', meta.duration || 0));
const n = Math.round(duration * fps);
const loop = has('loop') || meta.loop === true;
const stamp = t => t.toFixed(2).padStart(7, '0');
fs.mkdirSync(work, { recursive: true });
console.log(`${path.basename(file)}: ${format ? format + ' ' : ''}${size.width}x${size.height}, ${duration || '?'} s at ${fps} fps` +
  (meta.renderAt ? ', window.renderAt' : ', CSS/WAAPI seek'));

if (has('check')) {
  /* The render contract: a frame depends on t alone. Draw t, then elsewhere,
     then t again; any difference is a clock, a timer or state carried over. */
  const ts = duration ? [duration * 0.5, duration * 0.25, 0] : [1, 0.5, 0];
  let bad = 0;
  for (const t of ts) {
    const a = await shot(first, t);
    await shot(first, (t + duration * 0.37 + 0.3) % (duration || 2));
    const b = await shot(first, t);
    const same = a.equals(b);
    if (!same) bad++;
    console.log(`  t=${t.toFixed(2)}s ${same ? 'same' : 'DIFFERS on a second visit'}`);
  }
  if (!duration) { console.log('  no duration: set window.MOTION.duration or pass --duration'); bad++; }
  if (loop && duration) {
    /* The seam: the frame after the last is the first again, so a loop
       shows no cut. Frame N is never rendered; it is drawn here to compare. */
    const a = await shot(first, 0), b = await shot(first, duration);
    console.log(`  seam: t=0 and t=${duration}s ${a.equals(b) ? 'are the same picture' : 'DIFFER, so the loop shows a cut'}`);
    if (!a.equals(b)) bad++;
  }
  /* Cues: every named moment is a time inside the clip. */
  const names = Object.keys(cues);
  if (names.length) {
    const out = names.filter(k => !Number.isFinite(cues[k]) || cues[k] < 0 || (duration && cues[k] > duration));
    out.forEach(k => console.log(`  cue ${k} = ${cues[k]} is not a time inside 0–${duration} s`));
    if (out.length) bad++;
    else console.log(`  cues: ${names.length}, all inside the clip`);
  }
  if (format) {
    const over = await spill(first);
    console.log(over ? `  layout spills to ${over}, past the ${size.width}x${size.height} frame` : '  layout fits the frame');
    if (over) bad++;
  }
  if (reportErrors()) bad++;
  console.log(bad ? 'fails the render contract' : 'passes the render contract');
  process.exitCode = bad ? 1 : 0;
} else if (opt('stills')) {
  const dir = path.join(work, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const { t, name } of opt('stills').split(',').map(s => moment(s, cues))) {
    const dest = path.join(dir, `${stamp(t)}s-f${Math.round(t * fps)}${name ? '-' + name.replace(/[^\w.+-]/g, '_') : ''}.png`);
    await shot(first, t, dest);
    console.log('  ' + dest);
  }
} else if (has('sheet')) {
  /* Every Nth frame as a labelled grid: the review sheet notes are written
     against ("frame 84 peaks late"). */
  if (!n) throw new Error('--sheet needs a duration');
  const step = Number(opt('every', Math.max(1, Math.round(n / 12))));
  const cells = [];
  for (let i = 0; i < n; i += step) {
    const png = await shot(first, i / fps);
    /* The cues that fall in this cell's span, so a note can name the beat. */
    const at = Object.keys(cues).filter(k => Math.round(cues[k] * fps) >= i && Math.round(cues[k] * fps) < i + step);
    cells.push({ i, t: i / fps, at, src: 'data:image/png;base64,' + png.toString('base64') });
  }
  const cols = 4, cw = 480, ch = Math.round(cw * size.height / size.width);
  const sheet = await browser.newPage({ viewport: { width: cols * (cw + 8) + 8, height: 200 } });
  await sheet.setContent(`<body style="margin:0;padding:8px;background:#111;font:600 13px system-ui;color:#ddd;
    display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:8px">${cells.map(c =>
    `<figure style="margin:0"><img src="${c.src}" style="width:${cw}px;height:${ch}px;display:block">
     <figcaption style="padding:3px 0">f${c.i} · ${c.t.toFixed(2)}s${c.at.length
       ? ` <span style="color:#a99cff">· ${c.at.join(', ')}</span>` : ''}</figcaption></figure>`).join('')}</body>`);
  const dest = path.join(work, 'sheet.png');
  await sheet.screenshot({ path: dest, fullPage: true });
  console.log(`  ${dest} (${cells.length} frames, every ${step})`);
} else if (opt('out')) {
  if (!n) throw new Error('--out needs a duration: set window.MOTION.duration or pass --duration');
  const out = path.resolve(opt('out'));
  const dir = path.join(work, 'frames');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const workers = Math.max(1, Math.min(Number(opt('workers', 4)), n));
  const pages = [first, ...await Promise.all(Array.from({ length: workers - 1 }, newPage))];
  let done = 0; const t0 = Date.now();
  await Promise.all(pages.map(async (page, w) => {
    for (let i = w; i < n; i += workers) {
      await shot(page, i / fps, path.join(dir, String(i).padStart(6, '0') + '.png'));
      if (++done % 100 === 0) console.log(`  ${done}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }));
  if (errorTotal()) {
    reportErrors();
    console.error('not encoded: the page reported errors while rendering, so some frames may be wrong');
    await browser.close(); server.close();
    process.exit(1);
  }

  /* The encoder is compiled once per change of its source. */
  const swift = path.join(here, '..', 'video', 'frames-to-mp4.swift');
  const enc = path.join(os.tmpdir(), 'slideforge-motion', 'frames-to-mp4');
  if (!fs.existsSync(enc) || fs.statSync(enc).mtimeMs < fs.statSync(swift).mtimeMs) {
    fs.mkdirSync(path.dirname(enc), { recursive: true });
    execFileSync('swiftc', ['-O', swift, '-o', enc], { stdio: 'inherit' });
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync(enc, [dir, out, String(fps), String(opt('bitrate', 1400000))], { stdio: 'inherit' });

  /* The poster is what shows before the clip plays, and what prints. */
  const poster = out.replace(/\.mp4$/i, '') + '-poster.jpg';
  await seek(first, moment(opt('poster', '0'), cues).t);
  await first.screenshot({ path: poster, type: 'jpeg', quality: 85 });
  console.log(`  ${poster}\n  ${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${n} frames`);
} else {
  console.error('nothing to do: pass --check, --stills, --sheet or --out');
  process.exitCode = 2;
}
if (!has('check') && errorTotal()) reportErrors();
await browser.close();
server.close();
