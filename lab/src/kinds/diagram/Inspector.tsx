// The diagram's own inspector, shown in its tab by the inspector frame (ui/panels/Inspector.tsx): what
// it shows, written as a list, and what its checks found — diagram-design's connector rules, the type
// floor, and the WCAG contrast of every colour against the surface it sits on.
import type { Layer } from '../../core';
import { FLOOR, checkDiagram } from '../../diagrams';
import { contrast } from '../../theme';
import { Area, Chips, Section, useLayerParams } from '../../ui';
import { SAMPLES } from './def';
import { layerDiagram } from './raster';
import { diagramSkin, skinPairs } from './skin';

const TYPES = [{ value: 'loop', label: 'Loop' }, { value: 'flowchart', label: 'Flowchart' }, { value: 'timeline', label: 'Timeline' }];
const HOW: Record<string, string> = {
  loop: 'A “hub:” line for what every pass builds up, then three to six stations, clockwise from the top. A * marks the one focal station.',
  flowchart: '(Start) is an oval, a name ending ? a decision. “-> Next [yes], Back [no]” says where a step goes; without it, the next line. Up to nine steps.',
  timeline: '“1858 | name | sublabel”. Years, dates (2026-09) and “Week 3” are placed to scale; words are set in order. Up to eight events; a * marks the milestone.',
};

export function DiagramPanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer), type = String(p.diagram ?? 'loop');
  const d = layerDiagram(layer), broken = [...d.problems, ...checkDiagram(d)];
  const pairs = skinPairs(diagramSkin(p)).map((x) => ({ ...x, ratio: contrast(x.fg, x.bg) }));
  return (
    <>
      <div className="picture-head">Drawn from the list below, in the slide’s colours. Geometry and connector rules from diagram-design (MIT, Cathryn Lavery).</div>
      <Section title="What it shows">
        <Chips value={type} options={TYPES} onChange={(v) => { set('diagram', v); if (!String(p.data ?? '').trim() || Object.values(SAMPLES).includes(String(p.data))) set('data', SAMPLES[v]); }} />
        <Area value={String(p.data ?? '')} rows={8} onChange={(v) => set('data', v, true)} />
        <div className="desc">{HOW[type]}</div>
      </Section>
      <Section title="Checks">
        {broken.length ? broken.map((b, i) => <div key={i} className="desc warn">{b}</div>) : <div className="desc">Fits its box, nothing is under {FLOOR}px, and every connector passes diagram-design’s rules.</div>}
        {d.notes.map((n, i) => <div key={i} className="desc">{n}</div>)}
        {pairs.map((x) => (
          <div key={x.role} className="desc">{x.ratio >= x.min ? '✓' : '✗'} {x.role}: {x.ratio.toFixed(1)}:1 (needs {x.min}:1)</div>
        ))}
      </Section>
    </>
  );
}
