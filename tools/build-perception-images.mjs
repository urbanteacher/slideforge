/* Week 3: the five mark pairs the room estimates live (slider questions, "B is what % of A?").
 * Drawn from the channels kind itself, without the answer, so the picture on the phones is the
 * picture the experiment slide then reveals. Writes assets/lesson/ipdv/perception-<channel>.svg.
 *   node tools/build-perception-images.mjs */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIND_PRESETS, kindPicture } from '../lab/src/engine/experimentKinds.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INK = '#1a1a1a';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* Only the marks and their A / B labels: the slide already asks the question, so the picture is
 * cropped to the pair (x 40–560 of the 1000-wide plan). */
function svg(els) {
  const out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 20 520 350" width="1040" height="700">', '<rect x="40" y="20" width="520" height="350" fill="#ffffff"/>'];
  for (const e of els) {
    if (e.tag === 'poly') out.push(`<polygon points="${e.pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="${e.fill}" fill-opacity="${e.fo ?? 1}"${e.stroke ? ` stroke="${e.stroke}" stroke-width="${e.sw ?? 1}" stroke-opacity="${e.so ?? 1}"` : ''}/>`);
    else if (e.tag === 'line') out.push(`<line x1="${e.x}" y1="${e.y}" x2="${e.x2}" y2="${e.y2}" stroke="${e.stroke}" stroke-width="${e.sw ?? 1}" stroke-opacity="${e.so ?? 1}"/>`);
    else if (e.tag === 'text') out.push(`<text x="${e.x}" y="${e.y}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="${e.size ?? 20}" font-weight="${e.wt ?? 400}" text-anchor="${e.anchor ?? 'start'}" fill="${e.fill ?? INK}">${esc(e.text)}</text>`);
  }
  out.push('</svg>');
  return out.join('\n');
}

const p = KIND_PRESETS.channels;
p.states.filter((st) => st.mode !== 'ranking').forEach((st) => {
  const els = kindPicture(p.data, { ...st, labels: false }, INK).filter((e) => e.key !== 'ch:q' && e.key !== 'ch:title');
  const file = join(ROOT, 'assets/lesson/ipdv', `perception-${st.label.toLowerCase()}.svg`);
  writeFileSync(file, svg(els) + '\n');
  console.log('wrote', file.replace(ROOT + '/', ''));
});
