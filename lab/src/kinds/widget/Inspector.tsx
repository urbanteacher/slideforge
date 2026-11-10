// The widget's own inspector, shown in its tab by the inspector frame (ui/panels/special.tsx): its page, how much of
// the 16 KB it uses, and the page running as the show will run it.
import type { Layer } from '../../core';
import { WIDGET_MAX, WIDGET_SANDBOX, widgetDoc, widgetRuns } from '../../engine';
import { Area, ColorField, Row, Section, useLayerParams } from '../../ui';
import { useStore } from '../../store';
import { useLayoutEffect, useRef, useState } from 'react';

export function WidgetPanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer);
  const html = String(p.html ?? '');
  const kb = (html.length / 1024).toFixed(1);
  const over = html.length > WIDGET_MAX;
  return (
    <>
      <div className="picture-head">A small web page that runs on the slide in the show and Preview. It is sandboxed: it cannot reach the lesson, your sign-in or the internet.</div>
      <Section title="Page">
        <Area value={html} rows={12} onChange={(v) => set('html', v, true)} placeholder="<button>Press me</button><script>…</script>" />
        <div className={over ? 'inline-warn' : 'desc'}>{kb} KB of 16 KB{over ? ': too large, so the show will not run it. Make it smaller.' : '.'}</div>
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

/** The page as the show runs it: laid out at the layer's own size on the slide, scaled down to the panel's width. */
function TryIt({ layer, html }: { layer: Layer; html: string }) {
  const box = layer.box ?? { x: 0, y: 0, w: 1152, h: 648, rot: 0 };
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(280);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const k = width / box.w;
  return (
    <div ref={wrap} className="widget-try" style={{ height: box.h * k, background: String(layer.params.background ?? '#ffffff') }}>
      <iframe title={`${layer.name} (preview)`} sandbox={WIDGET_SANDBOX} srcDoc={widgetDoc(html)} style={{ width: box.w, height: box.h, transform: `scale(${k})` }} />
    </div>
  );
}
