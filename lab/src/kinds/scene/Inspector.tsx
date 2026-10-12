// The motion experiment's own inspector, shown in its tab by the inspector frame (ui/panels/Inspector.tsx).
import type { Layer } from '../../core';
import { LOOKS, SCENES, sceneItems } from '../../experiments';
import { useStore } from '../../store';
import { Area, Chips, Input, List, PictureTile, Row, Scrub, Section, Select, useLayerParams } from '../../ui';

// ─── Motion experiment ──────────────────────────────────────────────────────
const SCENE_HINT: Record<string, string> = {
  mask: 'The picture grows out of a circle. Drag across it, or press Next in quarters.', draw: 'Nodes and their connections, one per Next.',
  cards: 'Press a card to open it; its neighbours keep the context.', annotate: 'Numbered callouts over the picture, one per Next.',
  scrub: 'Circles become aligned bars. The detail of each point is its number.', cause: 'y = a × x: drag the input, watch the sum.',
  branch: 'Choices whose consequence shows only when chosen.', explode: 'The parts of a system pulled apart by dragging.',
  lens: 'A magnifier the room drags over the picture.', panels: 'Story panels; the chosen one gets room.',
};
export function ScenePanel({ layer }: { layer: Layer }) {
  const p = layer.params, set = useLayerParams(layer), mode = String(p.mode ?? 'cards');
  const items = sceneItems(p).map((r) => [r.label, r.detail] as [string, string]);
  const setItems = (rows: [string, string][]) => set('items', rows.map(([a, b]) => `${a}\t${b}`).join('\n'));
  return (
    <>
      <div className="picture-head">{SCENE_HINT[mode] ?? 'An interactive stage.'}</div>
      <Section title="Behaviour">
        <Select value={mode} options={Object.entries(SCENES).map(([k, v]) => ({ value: k, label: v }))} onChange={(v) => set('mode', v)} />
      </Section>
      <Section title="Look">
        <Chips value={String(p.look ?? 'editorial')} options={Object.entries(LOOKS).map(([k, v]) => ({ value: k, label: v.name, swatch: [v.paper, v.accent] as [string, string] }))} onChange={(v) => {
          set('look', v);
          // The slide takes the look's ground, as SlideForge's specimens do.
          const lk = LOOKS[v];
          useStore.getState().updateSlide((s) => { s.background = lk.bg; const g = s.layers.find((l) => l.name === 'Ground'); if (g) g.params.color = lk.bg; for (const l of s.layers) { if (l.name === 'Kicker') l.params.color = lk.accent; if (l.name === 'Heading') l.params.color = lk.ink; } });
        }} />
      </Section>
      <Section title={mode === 'scrub' ? 'Values' : 'Points'}>
        <List noun="point" items={items} max={4} onChange={setItems} make={(): [string, string] => ['New point', '']}
          render={([a, b], put) => (
            <>
              <Input value={a} onChange={(v) => put([v, b])} placeholder="Label" />
              {mode === 'scrub' ? <Input value={b} onChange={(v) => put([a, v])} placeholder="A number, 1–100" /> : <Area rows={2} value={b} onChange={(v) => put([a, v])} placeholder="What it means" />}
            </>
          )} />
      </Section>
      {['mask', 'annotate', 'lens'].includes(mode) && <Section title="Picture"><PictureTile src={String(p.image ?? '')} onChange={(v) => set('image', v)} /></Section>}
      {mode === 'cause' && <Section title="The model"><Row label="Multiplier a"><Scrub value={Number(p.factor ?? 2)} min={-10} max={10} step={0.5} decimals={1} onChange={(v, m) => useStore.getState().updateLayer(layer.id, (l) => { l.params.factor = v; }, m)} /></Row></Section>}
    </>
  );
}
