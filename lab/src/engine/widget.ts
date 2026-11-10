// The live widget's page (BACKLOG CS-15, from Claude Slides' sandboxed embeds): one small web page on a slide, run
// in the show and Preview inside a frame that can do almost nothing. The frame is sandboxed with scripts only (no
// same origin, so no SlideForge, no lesson, no sign-in, no storage, no pop-ups, no forms, no navigating the page
// around it), and the page carries a content policy that loads nothing from anywhere: no network at all, so a
// widget an AI wrote cannot send anything out, and it runs the same offline.

/** A widget's page may be this many characters, as Claude Slides' embeds are: enough for an interactive, not an app. */
export const WIDGET_MAX = 16 * 1024;

/** The frame's sandbox: scripts may run, and nothing else is allowed. */
export const WIDGET_SANDBOX = 'allow-scripts';

const POLICY = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:";

/** The page the frame runs: the widget's own HTML after a policy that loads nothing, and a plain base style. The page
 *  is laid out at the size of its box on a 1920-wide slide and scaled to fit, so it looks the same on every screen;
 *  its text starts at 36px, as a slide's body text does. */
export function widgetDoc(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${POLICY}">`
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<style>html,body{margin:0;height:100%;font:36px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#161616;background:transparent}*{box-sizing:border-box}</style>'
    + `</head><body>${html}</body></html>`;
}

/** Whether the widget can run: it has a page, and the page is within WIDGET_MAX. */
export const widgetRuns = (html: unknown): html is string => typeof html === 'string' && html.trim() !== '' && html.length <= WIDGET_MAX;
