// The student PDF from the studio (lab-engine-plan M12): every shown slide fully built, as the lab draws it
// (renderStill), one to a page, in a print document the shell opens (window.print, with page CSS). The student copy
// has no speaker notes and no answers: a game's answer slides are left out. The teacher copy keeps them, with each
// slide's notes under it. It is the only handout: SlideForge's classic one (js/print.js) was removed on 14 Oct 2026, and the
// command-line PDFs (tools/export-teaching-pdf.mjs, AiAd27-Classic/export.mjs) save this one (SF.LabEngine.handoutHtml).
import type { Deck } from '../core';

/** `back`: the slide turned over (Flip to facts), its picture under `${id}:back`. */
export interface HandoutPage { id: string; name: string; notes: string; back?: boolean }

/** The pages of a handout: the shown slides, the answers only in the teacher copy, the notes only there too. A slide
 *  with facts on its back (Flip to facts) gets a second page, turned over, so the facts are on paper too. */
export function handoutPages(deck: Deck, teacher: boolean): HandoutPage[] {
  return deck.slides
    .filter((s) => !s.hidden && (teacher || s.game?.role !== 'answer'))
    .flatMap((s) => {
      const front: HandoutPage = { id: s.id, name: s.name, notes: teacher ? String(s.notes ?? '').trim() : '' };
      return s.layers.some((l) => l.face === 'back') ? [front, { id: `${s.id}:back`, name: `${s.name} (the facts)`, notes: '', back: true }] : [front];
    });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The print document: a toolbar (Print, and the switch between the copies, wired by the shell) and one page per
 *  picture. `images` are the slides' pictures by id. */
export function handoutHtml(title: string, pages: HandoutPage[], images: Record<string, string>, teacher: boolean, aspect = 16 / 9): string {
  const body = pages.map((p, i) => `<section class="page${p.notes ? ' with-notes' : ''}"><img src="${esc(images[p.id] ?? '')}" alt="Slide ${i + 1}: ${esc(p.name)}" />${p.notes ? `<div class="notes">${esc(p.notes)}</div>` : ''}</section>`).join('\n');
  const which = teacher ? 'Teacher copy: every slide with its speaker notes, the answers included.' : 'Student copy: every slide fully built, no speaker notes and no answers.';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>${esc(title)} — handout</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  html, body { margin: 0; background: #e9ebef; font: 14px/1.45 system-ui, sans-serif; color: #1c1f24; }
  .toolbar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: center; padding: 14px 18px; background: #fff; box-shadow: 0 1px 0 #0002; }
  .toolbar button { padding: 9px 16px; font: inherit; cursor: pointer; }
  .toolbar button:disabled { opacity: .55; cursor: wait; }
  .toolbar .hint { flex: 1; min-width: 16rem; color: #444; }
  .page { box-sizing: border-box; width: min(1100px, calc(100vw - 32px)); margin: 16px auto; background: #fff; padding: 0; box-shadow: 0 2px 10px #0002; }
  .page img { display: block; width: 100%; aspect-ratio: ${aspect}; object-fit: contain; }
  .notes { white-space: pre-wrap; padding: 10px 14px; border-top: 1px solid #ddd; font-size: 12px; }
  @media print {
    html, body { background: #fff; }
    .toolbar { display: none !important; }
    .page { width: auto; margin: 0; box-shadow: none; break-after: page; page-break-after: always; break-inside: avoid; height: 188mm; display: flex; flex-direction: column; justify-content: center; }
    .page:last-child { break-after: auto; page-break-after: auto; }
    .page img { max-height: 188mm; }
    .page.with-notes img { max-height: 150mm; }
    .notes { max-height: 36mm; overflow: hidden; border: 0; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head>
<body${teacher ? ' class="teacher"' : ''}>
<div class="toolbar"><button id="sf-print" type="button" disabled>Preparing…</button><button id="sf-copy" type="button">${teacher ? 'Teacher copy ▸ switch to student copy' : 'Student copy ▸ switch to teacher copy'}</button><span class="hint">${which} ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}.</span></div>
${body}
</body></html>`;
}
