// The simulation layer's own inspector, shown in its tab by the inspector frame (ui/panels/Inspector.tsx).
import type { Layer } from '../../core';
import { useStore } from '../../store';
import { Chips, ColorField, Input, Row, Scrub, Section, useLayerParams } from '../../ui';

// ─── Simulation ─────────────────────────────────────────────────────────────
export function SimulationPanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer);
  const num = (k: string, d: number) => Number(p[k] ?? d);
  const scrub = (k: string, d: number, min: number, max: number, step: number, dec: number) => <Scrub value={num(k, d)} min={min} max={max} step={step} decimals={dec} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params[k] = v; }, m)} />;
  const inL = String(p.inputLabel ?? 'Input'), outL = String(p.outputLabel ?? 'Output');
  return (
    <>
      <div className="picture-head">A model drawn as its curve. In Preview the room drags the input and the output redraws — for when the relationship is the lesson.</div>
      <div className="sp-formula">{outL} = {num('a', 2)} × {inL}{p.model === 'quadratic' ? '²' : ''} {num('b', 0) < 0 ? '−' : '+'} {Math.abs(num('b', 0))}</div>
      <Section title="The model">
        <Chips value={String(p.model ?? 'linear')} options={[{ value: 'linear', label: 'Straight line' }, { value: 'quadratic', label: 'Curve' }]} onChange={(v) => set('model', v)} />
        <Row label="a">{scrub('a', 2, -100, 100, 0.1, 1)}</Row>
        <Row label="b">{scrub('b', 0, -1000, 1000, 1, 0)}</Row>
      </Section>
      <Section title="The input">
        <Row label="Called"><Input value={inL} onChange={(v) => set('inputLabel', v, true)} /></Row>
        <Row label="From">{scrub('min', 0, -1000, 999, 1, 0)}</Row>
        <Row label="To">{scrub('max', 10, -999, 1000, 1, 0)}</Row>
        <Row label="Starts at">{scrub('initial', 0, -1000, 1000, 0.5, 1)}</Row>
      </Section>
      <Section title="The output">
        <Row label="Called"><Input value={outL} onChange={(v) => set('outputLabel', v, true)} /></Row>
        <Row label="Curve colour"><ColorField value={String(p.accent ?? '#ff5a36')} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.accent = v; }, m)} /></Row>
      </Section>
    </>
  );
}
