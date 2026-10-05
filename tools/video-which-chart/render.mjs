// Frames for "Which Chart?", drawn by scenes.html in headless Chromium.
//   node tools/video-which-chart/render.mjs <outDir> --stills 5,20.5,63
//   node tools/video-which-chart/render.mjs <outDir> [--fps 25] [--workers 4]
// Reads <outDir>/timeline.json (from voice.mjs); writes <outDir>/stills/*.png
// or <outDir>/frames/000001.jpg …
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = path.resolve(args[0] || path.join(here, 'out'));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const timeline = JSON.parse(fs.readFileSync(path.join(out, 'timeline.json'), 'utf8'));
const fps = Number(opt('fps', 25)), workers = Number(opt('workers', 4));
const page_url = pathToFileURL(path.join(here, 'scenes.html')).href;

const browser = await chromium.launch();
async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(page_url);
  await page.evaluate(tl => { window.TL = tl; }, timeline);
  await page.evaluate(() => document.fonts.ready);
  return page;
}
async function frame(page, t, file, type) {
  await page.evaluate(t => window.renderAt(t), t);
  await page.screenshot({ path: file, type, quality: type === 'jpeg' ? 92 : undefined });
}

if (opt('stills')) {
  fs.mkdirSync(path.join(out, 'stills'), { recursive: true });
  const page = await newPage();
  for (const t of opt('stills').split(',').map(Number)) {
    await frame(page, t, path.join(out, 'stills', t.toFixed(1).padStart(6, '0') + '.png'), 'png');
  }
} else {
  const dir = path.join(out, 'frames');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.ceil(timeline.total * fps);
  let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const page = await newPage();
    for (let i = w; i < n; i += workers) {
      await frame(page, i / fps, path.join(dir, String(i + 1).padStart(6, '0') + '.jpg'), 'jpeg');
      if (++done % 500 === 0) console.log(done + '/' + n, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
  }));
  console.log('frames', n, 'at', fps, 'fps');
}
await browser.close();
