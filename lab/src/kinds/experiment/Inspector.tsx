// The predict-and-compare layer's own inspector, shown in its tab by the inspector frame (ui/panels/Inspector.tsx).
import type { Layer } from '../../core';
import { EXPERIMENTS, experimentPreset, experimentStates, type ExpState } from '../../experiments';
import { useStore } from '../../store';
import { Area, Chips, Input, List, Row, Section, Select, useLayerParams } from '../../ui';
import { RefreshCw } from 'lucide-react';

// ─── Predict and compare ─────────────────────────────────────────────────────
const KINDS = ['bar', 'pie', 'line', 'dot', 'bubbles', 'hue', 'shape', 'tiles', 'table', 'network', 'field', 'geometry', 'classification'].map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }));
export function ExperimentPanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer);
  const states = experimentStates(p);
  const setStates = (next: ExpState[]) => set('states', JSON.stringify(next));
  return (
    <>
      <div className="picture-head">One dataset in several encodings. The room predicts first; each Next — or a press of a step on the slide — moves the marks into the next state.</div>
      <Section title="Demonstration">
        <Select value={experimentPreset(p) || 'polling'} options={Object.entries(EXPERIMENTS).map(([k, v]) => ({ value: k, label: v.label }))}
          onChange={(v) => useStore.getState().updateLayer(layer.id, (l) => { l.params.preset = v; l.params.data = EXPERIMENTS[v].data; l.params.states = ''; })} />
        <div className="desc">Choosing one brings its own data and states; edit either below.</div>
      </Section>
      <Section title="Steps">
        <List noun="state" items={states} max={8} onChange={setStates} make={() => ({ label: 'New state', kind: 'bar', explanation: '' })}
          render={(st, put) => (
            <>
              <Row label="Button"><Input value={st.label} onChange={(v) => put({ ...st, label: v })} /></Row>
              <Row label="Shows as"><Select value={st.kind} options={KINDS} onChange={(v) => put({ ...st, kind: v })} /></Row>
              <Area rows={2} value={st.explanation ?? ''} onChange={(v) => put({ ...st, explanation: v })} placeholder="What this state shows, in a sentence or two" />
            </>
          )} />
        {String(p.states ?? '') && <button className="btn-soft" onClick={() => set('states', '')}><RefreshCw size={13} />Back to the demonstration’s own states</button>}
      </Section>
      <Section title="Data" defaultOpen={false}>
        <Area rows={6} value={String(p.data ?? '')} onChange={(v) => set('data', v, true)} />
        <div className="desc">Headings in the first row, categories in the first column, a tab between cells.</div>
        <Row label="Source"><Input value={String(p.source ?? '')} onChange={(v) => set('source', v, true)} /></Row>
      </Section>
      <Section title="Pace">
        <Chips value={String(p.duration ?? '1600')} options={[{ value: '800', label: 'Quick' }, { value: '1600', label: 'Teaching' }, { value: '3000', label: 'Slow observation' }]} onChange={(v) => set('duration', v)} />
      </Section>
    </>
  );
}
