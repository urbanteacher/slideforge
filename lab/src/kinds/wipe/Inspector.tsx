// The before / after layer's own inspector, shown in its tab by the inspector frame (ui/panels/Inspector.tsx).
import type { Layer } from '../../core';
import { useStore } from '../../store';
import { ColorField, Input, PictureTile, Row, Scrub, Section, Select, useLayerParams } from '../../ui';
import { ArrowLeftRight } from 'lucide-react';

// ─── Before / after ─────────────────────────────────────────────────────────
export function WipePanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer);
  return (
    <>
      <div className="picture-head"><ArrowLeftRight size={14} />Two pictures of the same framing, and a handle that wipes one over the other. In Preview the room drags it.</div>
      <Section title="The two pictures">
        <div className="sp-pair">
          <div><PictureTile src={String(p.before ?? '')} onChange={(v) => set('before', v)} /><Input value={String(p.beforeLabel ?? '')} onChange={(v) => set('beforeLabel', v, true)} placeholder="Before" /></div>
          <div><PictureTile src={String(p.after ?? '')} onChange={(v) => set('after', v)} /><Input value={String(p.afterLabel ?? '')} onChange={(v) => set('afterLabel', v, true)} placeholder="After" /></div>
        </div>
        <button className="btn-soft" onClick={() => useStore.getState().updateLayer(layer.id, (l) => { const q = l.params; [q.before, q.after] = [q.after, q.before]; [q.beforeLabel, q.afterLabel] = [q.afterLabel, q.beforeLabel]; })}><ArrowLeftRight size={13} />Swap before and after</button>
        <div className="desc">Only worth it when the two are registered — same framing, same scale — so the wipe compares like with like.</div>
      </Section>
      <Section title="The handle">
        <Row label="Rests at" info="How much of the after picture shows before anyone drags it."><Scrub value={Number(p.position ?? 50)} min={0} max={100} step={1} decimals={0} unit="%" onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.position = v; }, m)} /></Row>
        <Row label="Fit"><Select value={String(p.fit ?? 'contain')} options={[{ value: 'contain', label: 'Whole picture' }, { value: 'cover', label: 'Fill the frame' }]} onChange={(v) => set('fit', v)} /></Row>
        <Row label="Colour"><ColorField value={String(p.accent ?? '#ff5a36')} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.accent = v; }, m)} /></Row>
      </Section>
    </>
  );
}
