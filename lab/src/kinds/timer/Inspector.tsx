// The timer's own inspector, shown in its tab by the inspector frame (ui/panels/Inspector.tsx).
import type { Layer } from '../../core';
import { useStore } from '../../store';
import { Chips, ColorField, Input, Row, Scrub, Section, useLayerParams } from '../../ui';

// ─── Timer ──────────────────────────────────────────────────────────────────
export function TimerPanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer), style = String(p.style ?? 'ring');
  return (
    <>
      <div className="picture-head">It starts when the slide comes up in Preview and resets when you leave it.</div>
      <Section title="How long">
        <Chips value={String(p.minutes ?? 5)} options={[0.25, 0.5, 1, 2, 3, 5, 10, 15, 20].map((m) => ({ value: String(m), label: m < 1 ? `${m * 60} s` : `${m} min` }))} onChange={(v) => set('minutes', Number(v))} />
        <Row label="Or exactly"><Scrub value={Number(p.minutes ?? 5)} min={0.1} max={120} step={0.25} decimals={2} unit=" min" onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.minutes = v; }, m)} /></Row>
      </Section>
      <Section title="Style">
        <Chips value={style} options={[{ value: 'game', label: 'Game clock' }, { value: 'ring', label: 'Ring' }, { value: 'digits', label: 'Time only' }, { value: 'bar', label: 'Bar' }]} onChange={(v) => set('style', v)} />
        {style !== 'game' && <>
          <Row label="Label"><Input value={String(p.label ?? '')} onChange={(v) => set('label', v, true)} placeholder="Time left" /></Row>
          <Row label="At zero"><Input value={String(p.done ?? '')} onChange={(v) => set('done', v, true)} placeholder="Time’s up" /></Row>
        </>}
        <Row label="Colour"><ColorField value={String(p.accent ?? '#d94f2b')} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.accent = v; }, m)} /></Row>
        {style === 'game' && <div className="desc">SlideForge’s game clock: the ring turns red in the last minute, and the time at zero.</div>}
      </Section>
    </>
  );
}
