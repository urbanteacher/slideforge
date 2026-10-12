#!/usr/bin/env node
/**
 * The Lesson studio's visual baseline (lab-engine-plan M1.5): every slide the lab ships drawn as a
 * still, so a refactor can show it changed nothing on screen.
 *
 *   node tools/lab-baseline.mjs <out-dir>            draw every slide; writes <out-dir>/hashes.json and PNGs
 *   node tools/lab-baseline.mjs --compare <a> <b>    compare two runs; slides whose hashes differ are
 *                                                    compared pixel by pixel (≤ 0.1% differing allowed)
 *   node tools/lab-baseline.mjs --compare <a> <b> <a2>  as above, where <a2> is a second run of the same
 *                                                    build as <a>: slides that differ between <a> and <a2>
 *                                                    (a random seed, a playing clip) are counted as unstable
 *
 * The decks: the gallery's layouts in every style, the lab originals, the slide designs (three styles),
 * and the shipped lessons in assets/lab-lessons/ (the Layout bank and the Motion-lab-built decks among
 * them). It serves the app itself (server/server.js on a spare port) and draws with the committed
 * build in lab-app/, through the lab's embedded api (checkDecks, checkStills in lab/src/app/embed.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8800 + Math.floor(Math.random() * 90);
const ARGS = ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];
const LESSONS = (process.env.LAB_BASELINE_LESSONS || '').split(',').filter(Boolean);
const WIDTH = 960;

const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

async function draw(out) {
  fs.mkdirSync(out, { recursive: true });
  const server = spawn(process.execPath, ['server/server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  const browser = await chromium.launch({ args: ARGS });
  const hashes = {};
  const video = [];
  try {
    await new Promise((r) => setTimeout(r, 800));
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    page.on('pageerror', (e) => console.error('page error:', e.message));
    // The lab hands the shell its api through SF.LabEngine.ready; keep a copy of it.
    await page.addInitScript(() => {
      const t = setInterval(() => {
        const L = window.SF && window.SF.LabEngine;
        if (!L || L.__wrapped) return;
        const ready = L.ready;
        L.ready = (a) => { window.__labApi = a; return ready(a); };
        L.__wrapped = true;
        clearInterval(t);
      }, 1);
    });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__labApi && window.__labApi.checkStills, null, { timeout: 120000 });
    const builtIn = await page.evaluate(async () => (await window.__labApi.checkDecks()).map((d) => d.id));
    const files = fs.readdirSync(path.join(ROOT, 'assets', 'lab-lessons')).filter((f) => f.endsWith('.lesson.json'))
      .filter((f) => !LESSONS.length || LESSONS.some((k) => f.startsWith(k + '.')));
    const jobs = [...builtIn.map((id) => ({ id })), ...files.map((f) => ({ id: f.replace('.lesson.json', ''), file: f }))];
    for (const job of jobs) {
      const shots = await page.evaluate(async ({ id, file, width }) => {
        const api = window.__labApi;
        let deck;
        if (file) {
          deck = await (await fetch('/assets/lab-lessons/' + file)).json();
          const pics = deck.pictures;
          delete deck.pictures;
          const walk = (v) => {
            if (typeof v === 'string') { const m = /^@picture:(\d+)$/.exec(v); return m && pics && pics[+m[1]] !== undefined ? pics[+m[1]] : v; }
            if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = walk(v[i]); return v; }
            if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = walk(v[k]); return v; }
            return v;
          };
          if (Array.isArray(pics)) walk(deck);
          deck.id = 'check-' + id;
        } else {
          deck = (await api.checkDecks()).find((d) => d.id === id);
        }
        await api.open(deck);
        const video = api.getDeck().slides.map((s) => s.layers.some((l) => l.kind === "video" && l.visible));
        return { urls: await api.checkStills(width), video };
      }, { ...job, width: WIDTH });
      const dir = path.join(out, job.id);
      fs.mkdirSync(dir, { recursive: true });
      shots.urls.forEach((url, i) => {
        const buf = Buffer.from(url.split(',')[1], 'base64');
        const name = `${job.id}#${i}`;
        hashes[name] = sha(buf);
        if (shots.video[i]) video.push(name);
        fs.writeFileSync(path.join(dir, `${String(i).padStart(3, '0')}.png`), buf);
      });
      console.log(`${job.id}: ${shots.urls.length} slides`);
    }
    fs.writeFileSync(path.join(out, 'hashes.json'), JSON.stringify(hashes, null, 1));
    fs.writeFileSync(path.join(out, "video.json"), JSON.stringify(video));
    console.log(`${Object.keys(hashes).length} slides drawn into ${out}`);
  } finally {
    await browser.close();
    server.kill();
  }
}

async function differing(a, b) {
  const ha = JSON.parse(fs.readFileSync(path.join(a, 'hashes.json'), 'utf8'));
  const hb = JSON.parse(fs.readFileSync(path.join(b, 'hashes.json'), 'utf8'));
  const names = [...new Set([...Object.keys(ha), ...Object.keys(hb)])];
  const missing = names.filter((n) => !ha[n] || !hb[n]);
  const differ = names.filter((n) => ha[n] && hb[n] && ha[n] !== hb[n]);
  let near = 0;
  const far = [];
  if (differ.length) {
    const browser = await chromium.launch({ args: ARGS });
    const page = await browser.newPage();
    for (const n of differ) {
      const [deck, i] = n.split('#');
      const file = (d) => 'data:image/png;base64,' + fs.readFileSync(path.join(d, deck, `${String(i).padStart(3, '0')}.png`)).toString('base64');
      const r = await page.evaluate(async ([x, y]) => {
        const load = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.src = src; });
        const [p, q] = await Promise.all([load(x), load(y)]);
        if (p.width !== q.width || p.height !== q.height) return { share: 1 };
        const px = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
        const da = px(p), db = px(q);
        let n = 0;
        for (let k = 0; k < da.length; k += 4) if (Math.abs(da[k] - db[k]) > 8 || Math.abs(da[k + 1] - db[k + 1]) > 8 || Math.abs(da[k + 2] - db[k + 2]) > 8 || Math.abs(da[k + 3] - db[k + 3]) > 8) n++;
        return { share: n / (da.length / 4) };
      }, [file(a), file(b)]);
      if (r.share <= 0.001) near++; else far.push(`${n} (${(r.share * 100).toFixed(2)}%)`);
    }
    await browser.close();
  }
  return { total: names.length, identical: names.length - differ.length - missing.length, near, far, missing };
}

async function compare(a, b, noiseRun) {
  const r = await differing(a, b);
  // A playing clip is drawn at whatever frame it has reached: those slides cannot be compared.
  const clips = new Set(fs.existsSync(path.join(a, "video.json")) ? JSON.parse(fs.readFileSync(path.join(a, "video.json"), "utf8")) : []);
  const unstable = noiseRun ? new Set((await differing(a, noiseRun)).far.map((f) => f.split(" ")[0])) : new Set();
  const name = (f) => f.split(" ")[0];
  const far = r.far.filter((f) => !unstable.has(name(f)) && !clips.has(name(f)));
  const video = r.far.filter((f) => clips.has(name(f))).length;
  console.log(`${r.total} slides: ${r.identical} identical, ${r.near} within 0.1%, ${far.length} differing; not comparable: ${video} with a playing clip, ${r.far.length - far.length - video} unstable between two runs of the first build; ${r.missing.length} only in one run`);
  for (const f of far) console.log('  differs:', f);
  for (const m of r.missing) console.log('  only in one run:', m);
  process.exitCode = far.length || r.missing.length ? 1 : 0;
}

const [, , first, ...rest] = process.argv;
if (first === '--compare') await compare(rest[0], rest[1], rest[2]);
else if (first) await draw(first);
else { console.error('usage: node tools/lab-baseline.mjs <out-dir> | --compare <a> <b>'); process.exit(2); }
