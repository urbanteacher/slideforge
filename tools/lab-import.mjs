#!/usr/bin/env node
/* Carry a SlideForge library deck into the lab (SlideForge Studio) as layers.
 *
 * An experiment rather than a migration: it answers "what would these slides
 * be in the lab?" by drawing every slide in the real renderer and reading what
 * landed where. Text, boxes, pictures, simple charts and file videos become
 * native lab layers you can move and edit. Whatever the lab has no layer for —
 * theme art, icons, SVG drawings, the other chart idioms, QR codes, game
 * boards — is kept as a flattened picture, so the slide still looks right and
 * the report says exactly how much of it stopped being editable.
 *
 * Layers go bottom to top: background art, boxes and pictures, the flattened
 * leftovers, then text. A progressive slide's steps come last, one click each,
 * with their own leftovers captured separately so a step's art arrives with it.
 *
 *   node tools/lab-import.mjs                     layout-bank → lab/exports
 *   node tools/lab-import.mjs --lesson motion-lab
 *   node tools/lab-import.mjs --stills            also render every slide in
 *                                                 the lab and write a
 *                                                 side-by-side contact sheet
 *
 * Needs the app on SF_URL (default http://localhost:8787) and, for --stills,
 * the lab dev server on LAB_URL (default http://localhost:5299). Both run in a
 * fresh headless profile, so nothing is written to anyone's saved lab deck.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const LESSON = arg('lesson', 'layout-bank');
const SF_URL = process.env.SF_URL || 'http://localhost:8787';
const LAB_URL = process.env.LAB_URL || 'http://localhost:5299';
const STILLS = process.argv.includes('--stills');
const OUT_DIR = root + 'lab/exports/';
const W = 1920, H = 1080;

/* The lab's own font list. A family the SlideForge page loaded as a web font
   will not exist on the lab's page, so it is swapped for the nearest of these;
   a family installed on the machine is kept, because canvas can use it. */
const LAB_FONTS = ['Inter', 'Instrument Serif', 'Playfair Display', 'DM Serif Display', 'Fraunces',
  'Space Grotesk', 'Syne', 'Unbounded', 'Bebas Neue', 'JetBrains Mono', 'Georgia'];

const CHART_KINDS = { bar: 'column', hbar: 'bar', line: 'line', pie: 'pie', donut: 'donut' };
const TRANSITIONS = { none: 'none', fade: 'fade', push: 'push', zoom: 'zoom', wipe: 'wipe', morph: 'fade' };

const CAPTURE_CSS = `
html, body { background: transparent !important; }
body > *:not(#labStage) { display: none !important; }
#labStage { position: fixed; left: 0; top: 0; width: ${W}px; height: ${H}px; z-index: 2147483647; }
#labStage > .slide { width: ${W}px !important; height: ${H}px !important; }
/* Every entrance runs to its end at once, so the slide is read as it finally stands. */
#labStage, #labStage *, #labStage *::before, #labStage *::after {
  animation-duration: 1ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important;
  animation-fill-mode: both !important; transition: none !important;
}
#labStage .step { opacity: 1 !important; visibility: visible !important; transform: none !important; }

/* Background art: the slide's own ground and generated boxes, nothing else. */
#labStage.lab-bg > .slide * { visibility: hidden !important; }

/* Leftovers: everything that did not become a native layer. */
#labStage.lab-res > .slide { background: transparent !important; }
#labStage.lab-res > .slide::before, #labStage.lab-res > .slide::after { visibility: hidden !important; }
#labStage.lab-base .step, #labStage.lab-base .step * { visibility: hidden !important; }
#labStage.lab-step > .slide * { visibility: hidden !important; }
#labStage.lab-step [data-lab-step-on], #labStage.lab-step [data-lab-step-on] * { visibility: visible !important; }
/* The opaque boxes already on screen at this step still hide what lies under them, as key colour. */
#labStage.lab-step [data-lab-key-on] { visibility: visible !important; }

#labStage.lab-res [data-lab-text], #labStage.lab-res [data-lab-text] * {
  color: transparent !important; -webkit-text-fill-color: transparent !important;
  text-shadow: none !important; text-decoration-color: transparent !important; caret-color: transparent !important;
}
#labStage.lab-res [data-lab-li]::marker { color: transparent !important; }
#labStage.lab-res [data-lab-bg] { background-color: transparent !important; }
#labStage.lab-res [data-lab-bg][data-lab-key] { background-color: #ff00ff !important; }
#labStage.lab-res [data-lab-bgimg] { background-image: none !important; }
#labStage.lab-res [data-lab-border] { border-color: transparent !important; }
#labStage.lab-res [data-lab-hide], #labStage.lab-res [data-lab-hide] * { visibility: hidden !important; }
#labStage.lab-res [data-lab-pb]::before, #labStage.lab-res [data-lab-pa]::after { visibility: hidden !important; }
`;

/* ─── In the SlideForge page ─────────────────────────────────────────────── */

async function setup(page) {
  await page.evaluate(({ css, lesson }) => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const stage = document.createElement('div');
    stage.id = 'labStage';
    document.body.appendChild(stage);
    window.__labDeck = window.SF.buildLesson(lesson);
    return window.__labDeck.slides.length;
  }, { css: CAPTURE_CSS, lesson: LESSON });
  return page.evaluate(() => ({
    title: window.__labDeck.title, theme: window.__labDeck.theme, count: window.__labDeck.slides.length,
    transition: window.__labDeck.transition
  }));
}

/** Draw slide i and read it into a plan: native layers plus the captures still to take. */
async function extract(page, i, labFonts) {
  return page.evaluate(async ({ i, labFonts, W, CHART_KINDS }) => {
    const SF = window.SF;
    const deck = window.__labDeck;
    const slide = deck.slides[i];
    const stage = document.getElementById('labStage');
    stage.className = '';
    stage.innerHTML = '';
    const node = SF.renderSlide(deck, slide, { interactive: false });
    stage.appendChild(node);

    // Pictures and fonts, the way the visual baselines wait for them.
    const urls = new Set();
    for (const el of [node, ...node.querySelectorAll('*')]) {
      for (const pseudo of [null, '::before', '::after']) {
        const v = getComputedStyle(el, pseudo).backgroundImage;
        if (v && v !== 'none') for (const m of v.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) urls.add(m[2]);
      }
    }
    await Promise.all([...urls].map((u) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = u; })));
    await Promise.all([...node.querySelectorAll('img')].map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })));
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 250));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const R = node.getBoundingClientRect();
    const k = W / R.width;
    const X = (v) => (v - R.left) * k, Y = (v) => (v - R.top) * k;
    const report = { index: i + 1, type: slide.type, title: String(slide.title || '').slice(0, 80),
      text: 0, shapes: 0, images: 0, charts: 0, videos: 0, lists: 0, mixed: 0, skippedText: 0,
      fonts: {}, lost: [] };

    const hex = (c) => {
      const m = String(c).match(/rgba?\(([^)]+)\)/);
      if (!m) return { hex: '#000000', a: 0 };
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      const h = '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
      return { hex: h, a: p.length > 3 ? p[3] : 1 };
    };
    const px = (v) => parseFloat(v) || 0;
    /* One opaque linear-gradient is the lab's own two-colour ramp. CSS measures
       the angle from "up"; the lab from "right", both clockwise. Anything with
       transparency (a caption scrim) or more layers stays in the picture. */
    const linear = (bgi) => {
      const g = bgi && bgi.match(/^linear-gradient\((\d+(?:\.\d+)?)deg, (.*)\)$/);
      if (!g || /url\(|gradient/.test(g[2])) return null;
      const cols = [...g[2].matchAll(/rgba?\([^)]+\)/g)].map((m) => hex(m[0]));
      if (cols.length < 2 || cols.some((c) => c.a < 0.98)) return null;
      return { a: cols[0].hex, b: cols[cols.length - 1].hex, angle: (Number(g[1]) - 90 + 360) % 360 };
    };
    const visible = (el) => {
      let o = 1;
      for (let e = el; e && e !== stage; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none') return 0;
        if (cs.clip && cs.clip !== 'auto') return 0;   // screen-reader-only: rect(0 0 0 0)
        o *= parseFloat(cs.opacity);
      }
      return getComputedStyle(el).visibility === 'hidden' ? 0 : o;
    };
    const clipOf = (el) => {
      let r = el.getBoundingClientRect();
      let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
      for (let e = el.parentElement; e && e !== stage; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.overflow !== 'visible' || e === node) {
          const c = e.getBoundingClientRect();
          x0 = Math.max(x0, c.left); y0 = Math.max(y0, c.top); x1 = Math.min(x1, c.right); y1 = Math.min(y1, c.bottom);
        }
      }
      return { x: X(x0), y: Y(y0), w: (x1 - x0) * k, h: (y1 - y0) * k };
    };
    const steps = [...node.querySelectorAll('.step')];
    const stepOf = (el) => { const s = el.closest('.step'); return s && node.contains(s) ? steps.indexOf(s) + 1 : 0; };

    // Which family the page actually painted with: the first one in the stack that exists.
    const probe = document.createElement('canvas').getContext('2d');
    const width = (f) => { probe.font = `72px ${f}`; return probe.measureText('mmmmwwwwiiiilllQQ@').width; };
    const webFonts = new Set([...document.fonts].map((f) => f.family.replace(/["']/g, '')));
    const fontCache = new Map();
    const resolveFont = (stack) => {
      if (fontCache.has(stack)) return fontCache.get(stack);
      const fams = stack.split(',').map((s) => s.trim().replace(/["']/g, ''));
      let used = null;
      for (const f of fams) {
        if (['serif', 'sans-serif', 'monospace', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', '-apple-system', 'BlinkMacSystemFont'].includes(f)) { used = f; break; }
        if (width(`"${f}", monospace`) !== width('monospace') || width(`"${f}", serif`) !== width('serif')) { used = f; break; }
      }
      used = used || fams[fams.length - 1];
      let out = used;
      const generic = /mono/i.test(stack) ? 'JetBrains Mono' : fams.includes('serif') && !fams.includes('sans-serif') ? 'Georgia' : 'Inter';
      if (labFonts.includes(used)) out = used;
      else if (webFonts.has(used)) out = generic;                 // a web font the lab page will not have
      else if (['system-ui', '-apple-system', 'BlinkMacSystemFont', 'ui-sans-serif', 'sans-serif'].includes(used)) out = 'Inter';
      else if (['serif', 'ui-serif'].includes(used)) out = 'Georgia';
      else if (['monospace', 'ui-monospace'].includes(used)) out = 'JetBrains Mono';
      const r = { font: out, from: used };
      fontCache.set(stack, r);
      return r;
    };

    const items = [];   // native layers in paint order: { z, step, band, layer, gk }
    /* What reads as one thing on the slide — a list item, a build step, a card — becomes a lab group,
       so its marker, number, heading and detail pick up and move as one. A box that fills most of
       the slide is a background, not a card, and groups nothing. */
    const slideArea = node.getBoundingClientRect().width * node.getBoundingClientRect().height;
    const gIds = new Map();
    const groupKey = (el) => {
      for (let a = el; a && a !== node; a = a.parentElement) {
        const r = a.getBoundingClientRect();
        if (r.width * r.height > slideArea * 0.6) return null;
        if (a.tagName === 'LI' || a.classList.contains('step') || a.dataset.labBg) {
          if (!gIds.has(a)) gIds.set(a, gIds.size + 1);
          return gIds.get(a);
        }
      }
      return null;
    };
    const all = [node, ...node.querySelectorAll('*')];
    const zOf = new Map(all.map((el, n) => [el, n]));

    // Charts the lab can draw natively replace their SVG.
    let chartDone = false;
    const chartKind = slide.type === 'chart' && CHART_KINDS[slide.chartKind];

    /* A shape cut by a mask or a clip-path — the monogram, the skyline — has
       no lab equivalent, and neither has anything inside one. Those stay in
       the flattened picture; only their text comes across. */
    const cut = (cs) => cs.clipPath !== 'none' || [cs.maskImage, cs.webkitMaskImage].some((m) => m && m !== 'none') || cs.mixBlendMode !== 'normal';
    /* The same for a picture under a tint or scrim its own ::before/::after
       paints: the lab keeps flattened leftovers above pictures, so the tint
       would come out opaque and hide the photo. They stay flattened together. */
    const tinted = (el) => ['::before', '::after'].some((p) => {
      const ps = getComputedStyle(el, p);
      if (!ps.content || ps.content === 'none' || ps.content === 'normal') return false;
      if (ps.mixBlendMode !== 'normal') return true;
      // Only a pseudo-element that covers the box is a tint; a marker square or a rule is not.
      const r = el.getBoundingClientRect();
      const covers = px(ps.width) >= r.width * 0.8 && px(ps.height) >= r.height * 0.8;
      return ps.position === 'absolute' && covers && (hex(ps.backgroundColor).a > 0.03 || ps.backgroundImage !== 'none');
    });
    const masked = new Set();
    for (const el of all) {
      if (el === node) continue;
      if (masked.has(el.parentElement) || cut(getComputedStyle(el)) || tinted(el)) masked.add(el);
    }

    for (const el of all) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      if (masked.has(el)) { report.masked = (report.masked || 0) + 1; continue; }
      const op = visible(el);
      if (op < 0.02) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const box = { x: X(r.left), y: Y(r.top), w: r.width * k, h: r.height * k, rot: 0 };
      const z = zOf.get(el);
      const step = stepOf(el);
      const tag = el.tagName.toLowerCase();
      const push = (band, layer) => items.push({ z, step, band, gel: el, layer: { opacity: Math.min(1, op), ...layer } });

      if (tag === 'svg' || tag === 'canvas') {
        if (chartKind && !chartDone && el.closest('.chart, [class*="chart"]') && r.width > 300) {
          const data = SF.chartData(slide);
          const series = data.series[0] || { values: [] };
          if (data.series.length > 1) report.lost.push(`chart: ${data.series.length - 1} of ${data.series.length} series dropped`);
          const rs = getComputedStyle(node);
          const tok = (n, d) => (rs.getPropertyValue(n).trim() || d);
          const col = (v) => { const t = document.createElement('i'); t.style.color = v; node.appendChild(t); const c = hex(getComputedStyle(t).color).hex; t.remove(); return c; };
          push('art', { kind: 'chart', name: `Chart · ${slide.chartKind}`, box, params: {
            chart: chartKind,
            data: data.categories.map((c, n) => `${c}, ${series.values[n] ?? 0}`).join('\n'),
            color: col(tok('--chart-1', tok('--s-accent', '#c8102e'))),
            color2: col(tok('--chart-2', tok('--s-accent', '#c8102e'))),
            textColor: col(tok('--s-fg', rs.color)),
            font: resolveFont(rs.fontFamily).font, size: 26, values: true, grid: true } });
          el.dataset.labHide = '1';
          chartDone = true;
          report.charts++;
        }
        continue;
      }
      if (tag === 'img') {
        const c = clipOf(el);
        if (c.w < 2 || c.h < 2) continue;
        push('art', { kind: 'image', name: (el.alt || 'Image').slice(0, 28), box: { ...c, rot: 0 },
          params: { src: el.currentSrc || el.src, fit: cs.objectFit === 'contain' || cs.objectFit === 'scale-down' ? 'contain' : 'cover', radius: px(cs.borderTopLeftRadius) * k, _filter: cs.filter !== 'none' ? cs.filter : '' } });
        el.dataset.labHide = '1';
        report.images++;
        continue;
      }
      if (tag === 'video') {
        const src = el.currentSrc || el.src || el.querySelector('source')?.src;
        if (src) {
          push('art', { kind: 'video', name: 'Video', box, params: { src, fit: cs.objectFit === 'contain' ? 'contain' : 'cover', radius: 0, speed: 1 } });
          el.dataset.labHide = '1';
          report.videos++;
        }
        continue;
      }
      if (tag === 'iframe') { report.lost.push('embedded player (iframe)'); continue; }
      if (el === node) continue;

      // A box: its fill, border and any photo painted as a background.
      const bg = hex(cs.backgroundColor);
      const bgi = cs.backgroundImage;
      // A percentage radius is a share of the box, not pixels: 50% is an oval, whatever its proportions.
      const pct = /%/.test(cs.borderTopLeftRadius) ? parseFloat(cs.borderTopLeftRadius) : null;
      const radius = pct !== null ? (pct / 100) * Math.min(box.w, box.h) : px(cs.borderTopLeftRadius) * k;
      const round = pct !== null ? pct >= 50 : radius >= Math.min(box.w, box.h) / 2 - 1;
      const bw = ['Top', 'Right', 'Bottom', 'Left'].map((s) => px(cs[`border${s}Width`]) * k);
      const bc = ['Top', 'Right', 'Bottom', 'Left'].map((s) => hex(cs[`border${s}Color`]));
      const uniform = bw.every((w) => Math.abs(w - bw[0]) < 0.5) && bc.every((c) => c.hex === bc[0].hex);
      const hasBorder = bw.some((w, n) => w > 0.4 && bc[n].a > 0.05);
      const shapeParams = (fill, a) => ({ shape: round && (pct !== null || Math.abs(box.w - box.h) < 2) ? 'ellipse' : 'rect', radius: Math.min(radius, 400), fill, gradient: false, strokeWidth: 0, stroke: '#000000', _a: a });
      const ramp = linear(bgi);
      if (ramp && el !== node) {
        const p = { ...shapeParams(ramp.a, 1), gradient: true, fill2: ramp.b, angle: ramp.angle };
        push('art', { kind: 'shape', name: 'Gradient panel', box, params: p });
        el.dataset.labBgimg = '1';
        report.shapes++;
      }
      if (bg.a > 0.03) {
        const p = shapeParams(bg.hex, bg.a);
        if (hasBorder && uniform) { p.stroke = bc[0].hex; p.strokeWidth = Math.min(60, bw[0]); el.dataset.labBorder = '1'; }
        push('art', { kind: 'shape', name: typeof el.className === 'string' && el.className ? el.className.split(' ')[0].slice(0, 28) : 'Box', box,
          params: p, opacity: Math.min(1, op) * bg.a });
        el.dataset.labBg = '1';
        // An opaque box hides whatever SlideForge drew beneath it — a mind map's connectors run under
        // its nodes. The lab stacks a step's flattened picture above its boxes, so the capture paints
        // these boxes in a key colour and cuts it out: the picture keeps only what was really visible.
        if (bg.a >= 0.98 && op >= 0.98 && (!bgi || bgi === 'none')) el.dataset.labKey = '1';
        report.shapes++;
      }
      if (hasBorder && !(bg.a > 0.03 && uniform)) {
        // Rules — an outline, the accent bar down the left of a card, a divider.
        // The lab's shapes always fill, so an outline arrives as its four sides.
        const sides = [
          { w: box.w, h: bw[0], x: box.x, y: box.y }, { w: bw[1], h: box.h, x: box.x + box.w - bw[1], y: box.y },
          { w: box.w, h: bw[2], x: box.x, y: box.y + box.h - bw[2] }, { w: bw[3], h: box.h, x: box.x, y: box.y }];
        sides.forEach((s, n) => {
          if (bw[n] > 0.4 && bc[n].a > 0.05) {
            push('art', { kind: 'shape', name: 'Rule', box: { ...s, rot: 0 }, params: { shape: 'rect', radius: 0, fill: bc[n].hex, gradient: false, strokeWidth: 0, stroke: '#000000' }, opacity: Math.min(1, op) * bc[n].a });
            report.shapes++;
          }
        });
        el.dataset.labBorder = '1';
      }
      const url = bgi && bgi !== 'none' && !/gradient/.test(bgi) && bgi.match(/url\((['"]?)([^'")]+)\1\)/);
      // A small mark a theme draws with ::before/::after — a bullet square, a dash — as a box of its own.
      for (const [pseudo, attr] of [['::before', 'labPb'], ['::after', 'labPa']]) {
        const ps = getComputedStyle(el, pseudo);
        if (!ps.content || ps.content === 'none' || ps.content === 'normal' || ps.position !== 'absolute') continue;
        const fill = hex(ps.backgroundColor);
        if (fill.a < 0.03 || ps.backgroundImage !== 'none' || ps.transform !== 'none') continue;
        if ([ps.left, ps.top, ps.width, ps.height].some((v) => !/px$/.test(v))) continue;
        const pr = el.getBoundingClientRect();
        const mb = { x: X(pr.left + px(cs.borderLeftWidth) + px(ps.left)), y: Y(pr.top + px(cs.borderTopWidth) + px(ps.top)), w: px(ps.width) * k, h: px(ps.height) * k, rot: 0 };
        const round = px(ps.borderTopLeftRadius) * k >= Math.min(mb.w, mb.h) / 2 - 0.5;
        push('art', { kind: 'shape', name: 'Marker', box: mb, params: { shape: round ? 'ellipse' : 'rect', radius: px(ps.borderTopLeftRadius) * k, fill: fill.hex, gradient: false, strokeWidth: 0, stroke: '#000000' }, opacity: Math.min(1, op) * fill.a });
        el.dataset[attr] = '1';
        report.shapes++;
      }
      // Only a picture that fills its box comes across; a sized, placed or tiled one stays in the picture.
      const fills = ['cover', 'contain'].includes(cs.backgroundSize) && /no-repeat/.test(cs.backgroundRepeat);
      if (url && fills && !url[2].startsWith('data:image/svg')) {
        const c = clipOf(el);
        push('art', { kind: 'image', name: 'Background picture', box: { ...c, rot: 0 },
          params: { src: new URL(url[2], location.href).href, fit: cs.backgroundSize === 'contain' ? 'contain' : 'cover', radius } });
        el.dataset.labBgimg = '1';
        report.images++;
      }
    }

    // Text: every run of text grouped under the nearest block that holds it.
    const blocks = new Map();
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.data.trim() || t.parentElement.closest('svg')) continue;
      let b = t.parentElement;
      while (b !== node && ['inline', 'contents'].includes(getComputedStyle(b).display)) b = b.parentElement;
      if (!blocks.has(b)) blocks.set(b, []);
      blocks.get(b).push(t);
    }
    for (const [b, nodes] of blocks) {
      const op = visible(b);
      if (op < 0.02) continue;
      const rects = [];
      let chars = new Map();
      for (const t of nodes) {
        const range = document.createRange();
        range.selectNodeContents(t);
        for (const rr of range.getClientRects()) if (rr.width > 0.5 && rr.height > 0.5) rects.push(rr);
        const pe = t.parentElement, pcs = getComputedStyle(pe);
        if (visible(pe) < 0.02 || hex(pcs.color).a < 0.02) continue;
        const sig = [pcs.fontFamily, pcs.fontSize, pcs.fontWeight, pcs.fontStyle, pcs.color].join('|');
        const e = chars.get(sig) || { n: 0, pe, cs: pcs };
        e.n += t.data.trim().length;
        chars.set(sig, e);
      }
      if (!rects.length || !chars.size) { report.skippedText++; continue; }
      const bcs0 = getComputedStyle(b);
      const hiddenClip = (bcs0.clip && bcs0.clip !== 'auto') || (bcs0.clipPath && bcs0.clipPath.startsWith('inset(50%'));
      const clipBox = clipOf(b);
      if (hiddenClip || clipBox.w < 3 || clipBox.h < 3 || rects.every((rr) => rr.width < 3 || rr.height < 3)) { report.skippedText++; continue; }
      const main = [...chars.values()].sort((a, b2) => b2.n - a.n)[0];
      if (chars.size > 1) report.mixed++;
      const bcs = getComputedStyle(b);
      const pre = /^pre/.test(bcs.whiteSpace);
      // Text in reading order; <br> is a line break, nested blocks are their own layers.
      let text = '';
      // Words a stylesheet adds in flow — the space SlideForge puts between a bold lead-in and the
      // rest of its point is `.lead-rest::before { content: ' ' }` — are part of what the line says.
      const flowText = (el, pseudo) => {
        const ps = getComputedStyle(el, pseudo);
        if (ps.position === 'absolute' || ps.display === 'none' || !/^".*"$/.test(ps.content)) return '';
        try { return JSON.parse(ps.content); } catch { return ''; }
      };
      const read = (n) => {
        for (const c of n.childNodes) {
          if (c.nodeType === 3) text += c.data;
          else if (c.nodeType === 1) {
            if (c.tagName === 'BR') text += '\n';
            else if (!blocks.has(c) && !c.closest('svg')) { text += flowText(c, '::before'); read(c); text += flowText(c, '::after'); }
            else if (blocks.has(c) && c !== b) { /* its own layer */ }
          }
        }
      };
      read(b);
      text = pre ? text.replace(/\s+$/, '') : text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n').trim();
      if (!text) continue;
      const cs = main.cs;
      // Text a layout has scaled to fit is drawn larger or smaller than its font-size says.
      const scaled = b.offsetWidth ? b.getBoundingClientRect().width / b.offsetWidth : 1;
      const size = px(cs.fontSize) * k * (Math.abs(scaled - 1) > 0.02 ? scaled : 1);
      const lh = cs.lineHeight === 'normal' ? 1.2 : px(cs.lineHeight) / px(cs.fontSize);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const rr of rects) { x0 = Math.min(x0, rr.left); y0 = Math.min(y0, rr.top); x1 = Math.max(x1, rr.right); y1 = Math.max(y1, rr.bottom); }
      const firstH = rects[0].height * k;
      let box = { x: X(x0), y: Y(y0) - Math.max(0, (size * lh - firstH) / 2), w: (x1 - x0) * k, h: (y1 - y0) * k, rot: 0 };
      const align = { center: 'center', right: 'right', end: 'right', '-webkit-center': 'center' }[bcs.textAlign] || 'left';
      const lines = new Set(rects.map((rr) => Math.round(rr.top))).size;
      if (lines > 1) {
        // Wrapped text wraps where its container does, not where its longest line ended.
        const br = b.getBoundingClientRect();
        const sc = b.offsetWidth ? br.width / b.offsetWidth : 1;
        const l = (px(bcs.paddingLeft) + px(bcs.borderLeftWidth)) * sc, rr2 = (px(bcs.paddingRight) + px(bcs.borderRightWidth)) * sc;
        box.x = X(br.left + l);
        box.w = (br.width - l - rr2) * k + 2;
      } else {
        const slack = size * 0.2 + 4;
        box.w += slack;
        if (align === 'center') box.x -= slack / 2; else if (align === 'right') box.x -= slack;
      }
      // A list item keeps its bullet as the lab's own list marker.
      // A real list marker becomes the lab's own; a bar or dash the theme draws stays in the picture.
      let list = 'none';
      if ((bcs.display === 'list-item' || b.tagName === 'LI') && bcs.listStyleType !== 'none') {
        list = /decimal|alpha|roman/.test(bcs.listStyleType) ? 'numbers' : 'bullets';
        const indent = size * (list === 'numbers' ? 1.1 : 0.8);
        box.x -= indent; box.w += indent;
        b.dataset.labLi = '1';
        report.lists++;
      }
      const f = resolveFont(cs.fontFamily);
      if (f.from !== f.font) report.fonts[`${f.from} → ${f.font}`] = (report.fonts[`${f.from} → ${f.font}`] || 0) + 1;
      const color = hex(cs.color);
      items.push({ z: zOf.get(b) + 0.5, step: stepOf(b), band: 'text', gel: b, layer: {
        kind: 'text', name: text.split('\n')[0].slice(0, 28), box, opacity: Math.min(1, op * color.a),
        params: { text, font: f.font, size: Math.round(size * 10) / 10,
          weight: String(Math.min(900, Math.max(300, Math.round(px(cs.fontWeight) / 100) * 100))),
          italic: cs.fontStyle === 'italic', color: color.hex, underline: /underline/.test(cs.textDecorationLine),
          align, list, lineHeight: Math.round(lh * 100) / 100,
          tracking: cs.letterSpacing === 'normal' ? 0 : Math.round(px(cs.letterSpacing) / px(cs.fontSize) * 1000) / 1000,
          uppercase: cs.textTransform === 'uppercase' } } });
      nodes.forEach((t) => { t.parentElement.dataset.labText = '1'; });
      b.dataset.labText = '1';
      report.text++;
    }

    // What the slide is for, when the lab has nothing to carry it.
    const LIVE = { join: 'room join code and QR (live)', game: 'live game (phones answer)', explore: 'explore panels (clickable)',
      simulation: 'simulation (interactive)', beforeafter: 'before/after slider (draggable)', code: 'syntax colours',
      mindmap: 'mind-map drawing', orgchart: 'org-chart drawing' };
    if (LIVE[slide.type]) report.lost.push(LIVE[slide.type]);
    if (slide.type === 'chart' && !chartKind) report.lost.push(`chart idiom "${slide.chartKind}" has no lab equivalent`);
    if (slide.feedback && slide.feedback.kind) report.lost.push(`live ${slide.feedback.kind} from phones`);

    const rcs = getComputedStyle(node);
    const bgc = hex(rcs.backgroundColor);
    const pseudoArt = ['::before', '::after'].some((p) => { const c = getComputedStyle(node, p).content; return c && c !== 'none' && c !== 'normal'; });
    // A theme's two-or-three-stop ground is the lab's own Linear gradient layer.
    const ramp = !pseudoArt && linear(rcs.backgroundImage);
    const gradient = ramp ? { colorA: ramp.a, colorB: ramp.b, angle: ramp.angle, bias: 0.5 } : null;
    // Worked out once the whole slide is read, when every card has been marked as one.
    for (const it of items) { it.gk = it.gel ? groupKey(it.gel) : null; delete it.gel; }
    const gCount = new Map();
    for (const it of items) if (it.gk) gCount.set(it.gk, (gCount.get(it.gk) || 0) + 1);
    for (const it of items) if (it.gk && gCount.get(it.gk) > 1) it.layer.params = { ...it.layer.params, group: `s${i + 1}g${it.gk}` };
    report.groups = [...gCount.values()].filter((n) => n > 1).length;
    return {
      report,
      items,
      gradient,
      background: bgc.a > 0.02 ? bgc.hex : gradient ? gradient.colorB : '#ffffff',
      bgCapture: !gradient && ((rcs.backgroundImage && rcs.backgroundImage !== 'none') || pseudoArt),
      steps: steps.length,
      name: `${i + 1} · ${slide.type}${slide.title ? ' — ' + String(slide.title).replace(/\s+/g, ' ').slice(0, 40) : ''}`,
      notes: slide.notes || '',
      transition: slide.transition
    };
  }, { i, labFonts, W, CHART_KINDS });
}

/** Screenshot the stage in a capture mode and crop to what it painted. */
async function capture(page, mode, stepIndex) {
  await page.evaluate(({ mode, stepIndex }) => {
    const stage = document.getElementById('labStage');
    stage.className = mode;
    stage.querySelectorAll('[data-lab-step-on]').forEach((e) => delete e.dataset.labStepOn);
    if (stepIndex) stage.querySelectorAll('.step')[stepIndex - 1].dataset.labStepOn = '1';
    stage.querySelectorAll('[data-lab-key-on]').forEach((e) => delete e.dataset.labKeyOn);
    if (stepIndex) {
      const steps = [...stage.querySelectorAll('.step')];
      stage.querySelectorAll('[data-lab-key]').forEach((e) => {
        const own = e.closest('.step');
        if ((own ? steps.indexOf(own) + 1 : 0) <= stepIndex) e.dataset.labKeyOn = '1';
      });
    }
  }, { mode, stepIndex });
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H }, omitBackground: true });
  return page.evaluate(async (b64) => {
    const im = new Image();
    im.src = 'data:image/png;base64,' + b64;
    await im.decode();
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
    // Cut the key colour out: where an opaque box stood, the picture is empty.
    let keyed = false;
    for (let n = 0; n < d.length; n += 4) {
      if (d[n + 3] && d[n] > 200 && d[n + 1] < 60 && d[n + 2] > 200 && Math.abs(d[n] - d[n + 2]) < 60) { d[n + 3] = 0; keyed = true; }
    }
    if (keyed) g.putImageData(img, 0, 0);
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1, lit = 0;
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
      if (d[(y * c.width + x) * 4 + 3] > 10) { lit++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(c.width, x1 + 3); y1 = Math.min(c.height, y1 + 3);
    const o = document.createElement('canvas');
    o.width = x1 - x0; o.height = y1 - y0;
    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return { src: o.toDataURL('image/png'), box: { x: x0, y: y0, w: o.width, h: o.height, rot: 0 }, area: lit / ((c.width / 2) * (c.height / 2)) };
  }, png.toString('base64'));
}

/** The whole slide as SlideForge draws it, for the contact sheet. */
async function original(page) {
  await page.evaluate(() => { document.getElementById('labStage').className = ''; });
  const jpg = await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H }, type: 'jpeg', quality: 80, scale: 'css' });
  return page.evaluate(async (b64) => {
    const im = new Image(); im.src = 'data:image/jpeg;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = 640; c.height = 360;
    c.getContext('2d').drawImage(im, 0, 0, 640, 360);
    return c.toDataURL('image/jpeg', 0.82);
  }, jpg.toString('base64'));
}

/** Pictures travel inside the deck file, the way the lab stores a dropped photo. */
async function embed(page, src, box, filter = '') {
  return page.evaluate(async ({ src, box, filter }) => {
    window.__labImg = window.__labImg || new Map();
    const key = src + '@' + Math.round(box.w) + 'x' + Math.round(box.h) + filter;
    if (window.__labImg.has(key)) return window.__labImg.get(key);
    try {
      const blob = await (await fetch(src)).blob();
      if (blob.type.startsWith('video/')) {
        const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
        window.__labImg.set(key, url);
        return url;
      }
      const svg = blob.type.includes('svg');
      const im = new Image();
      im.src = URL.createObjectURL(blob);
      await im.decode();
      const nw = im.naturalWidth || box.w * 2, nh = im.naturalHeight || box.h * 2;
      const scale = svg ? Math.max(2 * box.w / nw, 2 * box.h / nh, 1) : Math.min(1, 2400 / Math.max(nw, nh));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(nw * scale)); c.height = Math.max(1, Math.round(nh * scale));
      const g = c.getContext('2d');
      if (filter) g.filter = filter;   // the logo reversed for a dark ground, baked in
      g.drawImage(im, 0, 0, c.width, c.height);
      const url = filter || blob.type.includes('png') || svg ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.86);
      window.__labImg.set(key, url);
      return url;
    } catch { return ''; }
  }, { src, box, filter });
}

/* ─── Assemble ───────────────────────────────────────────────────────────── */

let seq = 0;
const uid = () => 'imp' + (++seq).toString(36) + Math.random().toString(36).slice(2, 6);
const anim = (o = {}) => ({ type: 'none', duration: 0.9, delay: 0, easing: 'expoOut', trigger: 'withSlide', stagger: 0.03, loop: 'none', loopSpeed: 1, loopAmount: 1, ...o });
const interact = () => ({ followMouse: false, parallax: 0, hover: 'none', click: 'none', gotoSlide: 1, url: '' });
const layer = (l) => {
  const params = { ...l.params };
  delete params._a;
  delete params._filter;
  return { filter: l.params?._filter || '', id: uid(), kind: l.kind, name: l.name || l.kind, visible: true, locked: false,
    opacity: Math.round((l.opacity ?? 1) * 1000) / 1000, blend: 'normal', params, box: l.box, anim: anim(l.anim), interact: interact() };
};
const picture = (cap, name) => layer({ kind: 'image', name, box: cap.box, params: { src: cap.src, fit: 'contain', radius: 0 } });

/** Say which server is missing and how to start it, rather than a Playwright stack trace. */
async function preflight() {
  const up = async (url) => { try { await fetch(url, { signal: AbortSignal.timeout(3000) }); return true; } catch { return false; } };
  const missing = [];
  if (!(await up(SF_URL))) missing.push(`SlideForge is not answering on ${SF_URL}. Start it with \`npm start\`, or set SF_URL.`);
  if (STILLS && !(await up(LAB_URL))) missing.push(`The lab is not answering on ${LAB_URL}. Start it with \`npm --prefix lab run dev\`, or set LAB_URL (e.g. LAB_URL=http://localhost:5300).`);
  if (missing.length) { console.error(missing.join('\n')); process.exit(1); }
}

async function main() {
  await preflight();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(SF_URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.SF && window.SF.buildLesson && window.SF.renderSlide);
  const info = await setup(page);
  console.log(`${info.title} — ${info.count} slides on ${info.theme}`);

  const slides = [], reports = [], originals = [];
  for (let i = 0; i < info.count; i++) {
    const plan = await extract(page, i, LAB_FONTS);
    const r = plan.report;
    r.pictures = 0; r.pictureArea = 0;
    originals.push(STILLS ? await original(page) : null);

    const layers = [];
    if (plan.bgCapture) {
      const cap = await capture(page, 'lab-bg');
      if (cap) { layers.push(picture(cap, 'Theme background')); r.themeBackground = true; }
    }
    if (plan.gradient) { layers.push(layer({ kind: 'linear', name: 'Theme ground', params: plan.gradient })); r.nativeGround = true; }
    const base = plan.items.filter((it) => !it.step);
    const byZ = (a, b) => a.z - b.z;
    for (const it of base.filter((x) => x.band === 'art').sort(byZ)) layers.push(layer(it.layer));
    const left = await capture(page, 'lab-res lab-base');
    if (left) { layers.push(picture(left, 'Flattened · theme art & drawings')); r.pictures++; r.pictureArea += left.area; }
    for (const it of base.filter((x) => x.band === 'text').sort(byZ)) layers.push(layer(it.layer));

    // Each build step: its boxes, its leftovers, its text; the first one waits for a click.
    for (let s = 1; s <= plan.steps; s++) {
      const mine = plan.items.filter((it) => it.step === s);
      const stepLayers = [];
      for (const it of mine.filter((x) => x.band === 'art').sort(byZ)) stepLayers.push(layer(it.layer));
      const cap = await capture(page, 'lab-res lab-step', s);
      if (cap) { stepLayers.push(picture(cap, `Flattened · step ${s}`)); r.pictures++; r.pictureArea += cap.area; }
      for (const it of mine.filter((x) => x.band === 'text').sort(byZ)) stepLayers.push(layer(it.layer));
      stepLayers.forEach((l, n) => { l.anim = anim({ type: 'rise', duration: 0.7, trigger: n === 0 ? 'onClick' : 'withSlide', delay: n === 0 ? 0 : Math.min(0.3, n * 0.04) }); });
      layers.push(...stepLayers);
    }
    r.steps = plan.steps;

    for (const l of layers) {
      if ((l.kind === 'image' || l.kind === 'video') && l.params.src && !l.params.src.startsWith('data:')) {
        l.params.src = await embed(page, l.params.src, l.box, l.filter);
        if (!l.params.src) r.lost.push('a picture that could not be fetched');
      }
    }
    for (const l of layers) delete l.filter;
    r.layers = layers.length;
    r.pictureArea = Math.round(Math.min(1, r.pictureArea) * 100);
    slides.push({ id: uid(), name: plan.name, background: plan.background, layers,
      transition: { type: TRANSITIONS[plan.transition || info.transition] || 'fade', duration: 0.7 }, notes: plan.notes });
    reports.push(r);
    const flags = [r.lost.length ? `lost: ${r.lost.join('; ')}` : '', r.mixed ? `${r.mixed} mixed-style blocks flattened` : ''].filter(Boolean).join(' · ');
    console.log(`  ${String(i + 1).padStart(3)} ${r.type.padEnd(12)} ${String(r.layers).padStart(3)} layers  ${r.text} text · ${r.shapes} boxes · ${r.images} pictures · ${r.charts} charts · ${r.pictureArea}% flattened${flags ? '  ' + flags : ''}`);
  }

  const deck = { id: uid(), title: `${info.title} (imported)`, width: W, height: H, slides, version: 1 };
  mkdirSync(OUT_DIR, { recursive: true });
  const base = OUT_DIR + LESSON;
  writeFileSync(base + '.sfstudio.json', JSON.stringify(deck));
  writeFileSync(base + '.import-report.json', JSON.stringify(reports, null, 2));
  console.log(`\nWrote ${base}.sfstudio.json (${(JSON.stringify(deck).length / 1e6).toFixed(1)} MB) and the report.`);

  if (STILLS) {
    const lab = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await lab.goto(LAB_URL, { waitUntil: 'load' });
    const stills = await lab.evaluate(async (file) => {
      const { renderStill } = await import('/src/export/exporters.ts');
      const d = await (await fetch(file)).json();
      d.slides.forEach((s) => renderStill(s, d, 320, 'image/jpeg'));   // start fonts, pictures and videos loading
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 4000));
      d.slides.forEach((s) => renderStill(s, d, 320, 'image/jpeg'));
      await new Promise((r) => setTimeout(r, 1500));
      return d.slides.map((s) => renderStill(s, d, 640, 'image/jpeg'));
    }, `/exports/${LESSON}.sfstudio.json?${Date.now()}`);
    writeFileSync(base + '-compare.html', sheet(info, reports, originals, stills));
    console.log(`Wrote ${base}-compare.html`);
  }
  await browser.close();
}

function sheet(info, reports, originals, stills) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sum = (k) => reports.reduce((a, r) => a + r[k], 0);
  const clean = reports.filter((r) => r.pictureArea <= 15 && !r.lost.length).length;
  const rows = reports.map((r, n) => `<tr>
  <td class="n">${r.index}</td>
  <td><img src="${originals[n]}" alt=""></td>
  <td><img src="${stills[n]}" alt=""></td>
  <td class="meta"><b>${esc(r.type)}</b><br>${esc(r.title)}<br><br>
    ${r.text} text · ${r.shapes} boxes · ${r.images} pictures${r.charts ? ` · ${r.charts} chart` : ''}${r.videos ? ` · ${r.videos} video` : ''}${r.steps ? ` · ${r.steps} click steps` : ''}<br>
    <span class="${r.pictureArea > 30 ? 'bad' : r.pictureArea > 10 ? 'mid' : 'ok'}">${r.pictureArea}% of the slide flattened to a picture</span>
    ${r.mixed ? `<br>${r.mixed} mixed-style text blocks reduced to one style` : ''}
    ${Object.keys(r.fonts).length ? `<br>Fonts: ${esc(Object.keys(r.fonts).join(', '))}` : ''}
    ${r.lost.length ? `<br><span class="bad">Lost: ${esc(r.lost.join('; '))}</span>` : ''}</td></tr>`).join('\n');
  return `<!doctype html><meta charset="utf-8"><title>${esc(info.title)} — SlideForge vs lab</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;margin:24px;background:#f4f2ee;color:#1c1c1c}
h1{font-size:20px;margin:0 0 6px} p{margin:0 0 16px;max-width:900px}
table{border-collapse:collapse;width:100%} th{position:sticky;top:0;background:#f4f2ee;text-align:left;padding:8px;font-weight:600}
td{padding:8px;vertical-align:top;border-top:1px solid #ddd} td img{width:400px;border:1px solid #ccc;display:block}
.n{font-weight:700;width:30px} .meta{font-size:13px} .ok{color:#1d7a3a} .mid{color:#9a6700} .bad{color:#b3261e}
</style>
<h1>${esc(info.title)}: SlideForge (left) and the same slide imported into the lab (right)</h1>
<p>${reports.length} slides. ${sum('text')} text layers, ${sum('shapes')} boxes, ${sum('images')} pictures, ${sum('charts')} native charts. ${clean} slides came across with at most 15% flattened and nothing lost; the rest keep part of the slide as a picture or lose something live.</p>
<table><tr><th>#</th><th>SlideForge</th><th>Lab</th><th>What came across</th></tr>
${rows}
</table>`;
}

main().catch((e) => { console.error(e); process.exit(1); });
