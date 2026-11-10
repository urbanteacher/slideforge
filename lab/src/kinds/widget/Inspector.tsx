// The widget's own inspector, shown in its tab by the inspector frame (ui/panels/special.tsx): its page, how much of
// the 16 KB it uses, and the page running as the show will run it. A page written or changed here is the teacher's,
// so it runs without asking (engine/widget.ts); one that came with a lesson from elsewhere waits for Run.
import type { Layer } from '../../core';
import { WIDGET_KEEP_MAX, WIDGET_MAX, WIDGET_SANDBOX, trustWidget, widgetDoc, widgetRuns, widgetTrusted } from '../../engine';
import { Area, ColorField, Row, Section, useLayerParams } from '../../ui';
import { useStore } from '../../store';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { WIDGET_STARTER } from './starter';

/** How long Try It waits after the last keystroke before it runs the page again: a half-typed loop is not run. */
const SETTLE_MS = 600;

export function WidgetPanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer);
  const html = String(p.html ?? '');
  const kb = (html.length / 1024).toFixed(1);
  const over = html.length > WIDGET_MAX;
  const [refused, setRefused] = useState(0);
  const write = (v: string) => {
    // Far past what the show runs, it is not a widget: it would sit in the lesson, its undo and every share.
    if (v.length > WIDGET_KEEP_MAX) { setRefused(v.length); return; }
    setRefused(0);
    trustWidget(v);
    set('html', v, true);
  };
  return (
    <>
      <div className="picture-head">A small web page that runs on the slide in the show and Preview. It is walled off from the lesson, your sign-in and your files, and it loads nothing itself, but it can open a web page in its own frame. A widget that came with someone else's lesson asks before it runs.</div>
      <Section title="Page">
        <Area value={html} rows={12} onChange={write} placeholder="<button>Press me</button><script>…</script>" />
        {refused > 0 && <div className="inline-warn" role="alert">That page is {(refused / 1024).toFixed(0)} KB, so it was not kept. A widget's page may be {WIDGET_MAX / 1024} KB.</div>}
        <div className={over ? 'inline-warn' : 'desc'}>{kb} KB of {WIDGET_MAX / 1024} KB{over ? ': too large, so the show will not run it. Make it smaller.' : '.'}</div>
      </Section>
      <Section title="Try it">
        {widgetRuns(html)
          ? <TryIt layer={layer} html={html} />
          : <div className="desc">{over ? 'Too large to run.' : 'Write a page above to try it here.'}</div>}
      </Section>
      <Section title="Look">
        <Row label="Background"><ColorField value={String(p.background ?? '#ffffff')} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.background = v; }, m)} /></Row>
      </Section>
    </>
  );
}

/** The page as the show runs it: laid out at the layer's own size on the slide, scaled down to the panel's width.
 *  It runs once typing has settled, and a page from elsewhere only once the teacher presses Run. */
function TryIt({ layer, html }: { layer: Layer; html: string }) {
  const box = layer.box ?? { x: 0, y: 0, w: 1152, h: 648, rot: 0 };
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(280);
  const [shown, setShown] = useState(html);
  const [, setOk] = useState(0);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (html === shown) return;
    const t = setTimeout(() => setShown(html), SETTLE_MS);
    return () => clearTimeout(t);
  }, [html, shown]);
  const k = width / box.w;
  const bg = String(layer.params.background ?? '#ffffff');
  if (!widgetTrusted(shown, WIDGET_STARTER)) {
    return (
      <div className="desc">
        This page came with the lesson. <button type="button" className="btn" onClick={() => { trustWidget(shown); setOk((v) => v + 1); }}>Run it here</button>
      </div>
    );
  }
  return (
    <div ref={wrap} className="widget-try" style={{ height: box.h * k, background: bg }}>
      <iframe title={`${layer.name} (preview)`} sandbox={WIDGET_SANDBOX} srcDoc={widgetDoc(shown)} style={{ width: box.w, height: box.h, transform: `scale(${k})` }} />
    </div>
  );
}
