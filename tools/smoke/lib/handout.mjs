// The studio's handout (lab/src/export/handout.ts) as the app makes it: a lesson opened in the studio, then its print
// document (SF.LabEngine.handoutHtml, the page Export → PDF handout opens) loaded in a page of its own, ready to read
// or save as a PDF. Shared by the handout and exports smokes and the command-line PDFs.

/** Open a built-in lesson in the studio and wait until it is the lesson on screen. */
export async function openInStudio(page, key, timeout = 90000) {
  await page.waitForFunction(() => window.SF?.LabEngine?.openKey && SF.Shell?.current()?.doc(), null, { timeout });
  const before = await page.evaluate(() => SF.Shell.current().doc().id);
  await page.evaluate((k) => { if (!SF.LabEngine.openKey(k)) throw new Error('The studio could not open ' + k); }, key);
  await page.waitForFunction((id) => { const d = SF.LabEngine.labDeck && SF.LabEngine.labDeck(); return !!(d && d.slides.length && SF.Shell.current().doc().id !== id); }, before, { timeout });
}

/** Open a SlideForge deck (a classic lesson, as a bundle holds it) in the studio, which converts it. */
export async function openDeckInStudio(page, deck, timeout = 90000) {
  await page.waitForFunction(() => window.SF?.LabEngine?.openLesson && SF.Shell?.current()?.doc(), null, { timeout });
  await page.evaluate((d) => { if (!SF.LabEngine.openLesson(d)) throw new Error('The studio could not open ' + d.title); }, deck);
  await page.waitForFunction((title) => { const d = SF.LabEngine.labDeck && SF.LabEngine.labDeck(); return !!(d && d.slides.length && d.title.startsWith(title)); }, deck.title, { timeout });
}

/** The lesson on screen's handout, loaded in a new page of the same browser context; every picture has arrived. */
export async function handoutPage(page, { teacher = false, timeout = 180000 } = {}) {
  const html = await page.evaluate((t) => SF.LabEngine.handoutHtml(t), teacher);
  const doc = await page.context().newPage();
  await doc.setContent(html, { waitUntil: 'load', timeout });
  await doc.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout });
  return doc;
}
