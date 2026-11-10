// The connector's own inspector: which two layers it joins, chosen by name from the slide's layers.
import { joinable, type Layer } from '../../core';
import { Row, Section, Select, useLayerParams } from '../../ui';
import { slideOf, useStore } from '../../store';

export function ConnectorPanel({ layer }: { layer: Layer }) {
  const set = useLayerParams(layer);
  const slide = useStore(slideOf);
  const others = slide.layers.filter((l) => l.id !== layer.id && joinable(l));
  const options = [{ value: '', label: 'Choose a layer…' }, ...others.map((l) => ({ value: l.id, label: l.name || l.kind }))];
  const lost = layer.params._lost === true;
  return (
    <>
      <div className="picture-head">A line between two layers on this slide. Move either one and the line follows.</div>
      {lost && <div className="inline-warn slide-limits" role="status">It is not joined to two layers: choose both below, or delete it.</div>}
      <Section title="Joins">
        <Row label="From"><Select value={String(layer.params.from ?? '')} options={options} onChange={(v) => set('from', v)} /></Row>
        <Row label="To"><Select value={String(layer.params.to ?? '')} options={options} onChange={(v) => set('to', v)} /></Row>
      </Section>
    </>
  );
}
