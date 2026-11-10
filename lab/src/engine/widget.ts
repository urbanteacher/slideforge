// The live widget's page (BACKLOG CS-15, from Claude Slides' sandboxed embeds): one small web page on a slide, run
// in the show and Preview inside a frame that can do very little. What it cannot do, and what it can:
//   - The frame is sandboxed with scripts only, with no same origin. So it cannot reach SlideForge, the lesson, the
//     teacher's sign-in, storage or cookies, and it cannot open pop-ups, send forms or move the page around it.
//   - Its page carries a content policy that loads nothing (no fetch, no pictures or scripts from elsewhere), so a
//     widget runs the same offline.
//   - It can still load another web page inside its own frame (`location = …`). A content policy does not cover
//     where a frame goes, and that page has no policy of ours. So a widget can show a page from the internet, and
//     that page can tell its server it was opened. That is why a widget that came with someone else's lesson asks
//     before it runs (widgetTrusted), and a teacher's own widget, written or changed in its tab, runs at once.
//   - Keys pressed in it that move the show (a clicker's Page Down, the arrows, Esc) are passed to the show, so
//     clicking into a widget does not stop the clicker.

/** A widget's page may be this many characters, as Claude Slides' embeds are: enough for an interactive, not an app. */
export const WIDGET_MAX = 16 * 1024;

/** The frame's sandbox: scripts may run, and nothing else is allowed. */
export const WIDGET_SANDBOX = 'allow-scripts';

const POLICY = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:";

/** The keys a widget passes to the show: a clicker's, and the show's own Next, Back and Esc. Arrows and Space stay
 *  with a form control the widget has focused (a slider, a text box), where they mean something. */
export const WIDGET_SHOW_KEYS = ['PageDown', 'PageUp', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', ' ', 'Escape', 'Home', 'End', 'b', 'B', '.'];
const ALWAYS = ['PageDown', 'PageUp', 'Escape'];
/** Run before the widget's own script: passes the show's keys up, as `{ sfWidgetKey }`. */
const FORWARD = `<script>addEventListener('keydown',function(e){var k=e.key,t=e.target,f=t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));`
  + `if(${JSON.stringify(ALWAYS)}.indexOf(k)<0&&(f||${JSON.stringify(WIDGET_SHOW_KEYS)}.indexOf(k)<0))return;`
  + `parent.postMessage({sfWidgetKey:k,shiftKey:e.shiftKey},'*');},true);</script>`;

/** A key a widget passed up, when it came from one of the show's widget frames and is one the show takes; null
 *  otherwise. `frames` are the windows of the widgets on the slide: a message from anywhere else is not one. */
export function widgetKey(data: unknown, source: unknown, frames: unknown[]): { key: string; shiftKey: boolean } | null {
  if (!source || !frames.includes(source) || !data || typeof data !== 'object') return null;
  const { sfWidgetKey: key, shiftKey } = data as { sfWidgetKey?: unknown; shiftKey?: unknown };
  return typeof key === 'string' && WIDGET_SHOW_KEYS.includes(key) ? { key, shiftKey: shiftKey === true } : null;
}

/** The page the frame runs: the widget's own HTML after a policy that loads nothing, and a plain base style. The page
 *  is laid out at the size of its box on a 1920-wide slide and scaled to fit, so it looks the same on every screen;
 *  its text starts at 36px, as a slide's body text does. */
export function widgetDoc(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${POLICY}">`
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<style>html,body{margin:0;height:100%;font:36px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#161616;background:transparent}*{box-sizing:border-box}</style>'
    + `${FORWARD}</head><body>${html}</body></html>`;
}

/** What a widget's tab keeps at most. The show runs pages up to WIDGET_MAX; much more than that is not a widget, and
 *  would sit in the lesson, its undo history and every share. */
export const WIDGET_KEEP_MAX = 4 * WIDGET_MAX;

// ─── Which widgets run without asking ────────────────────────────────────────
// A widget this teacher wrote or changed in its tab, or Add's own starter, runs at once. One that came with a lesson
// from elsewhere (a lesson file, a share, a deck file) asks first, once: the teacher's yes is kept in this browser.

const TRUST_KEY = 'sf-widgets-ok';
const TRUST_KEEP = 400;

/** A fingerprint of a widget's page: two 32-bit FNV-1a hashes, 16 hex digits. */
export function widgetPrint(html: string): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ html.length;
  for (let i = 0; i < html.length; i++) {
    const c = html.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193 + 0x100) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

function trusted(): string[] {
  try { const v = JSON.parse(localStorage.getItem(TRUST_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}

/** Whether this widget runs in the show without asking: this browser's teacher wrote it, changed it, or said yes. */
export function widgetTrusted(html: string, starter?: string): boolean {
  return (starter !== undefined && html === starter) || trusted().includes(widgetPrint(html));
}

/** This widget runs from now on without asking, in this browser. */
export function trustWidget(html: string): void {
  if (!html.trim()) return;
  const p = widgetPrint(html);
  const list = [p, ...trusted().filter((x) => x !== p)].slice(0, TRUST_KEEP);
  try { localStorage.setItem(TRUST_KEY, JSON.stringify(list)); } catch { /* storage blocked: it asks again next time */ }
}

/** Whether the widget can run: it has a page, and the page is within WIDGET_MAX. */
export const widgetRuns = (html: unknown): html is string => typeof html === 'string' && html.trim() !== '' && html.length <= WIDGET_MAX;
