// Present and Host live put the page in full screen. In a real browser the first Esc is the browser's (it leaves full
// screen) and the show takes the next one; headless Chrome stays in full screen on a pressed Esc, so the show never gets
// it. A smoke that ends a show with Esc leaves full screen first, as the teacher's first Esc would.
export async function leaveFullscreen(page) {
  for (const frame of page.frames()) {
    await frame.evaluate(() => (document.fullscreenElement ? document.exitFullscreen().catch(() => {}) : null)).catch(() => {});
  }
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 3000 }).catch(() => {});
}
