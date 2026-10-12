// The Interact tab: what a layer does on hover and on click.
import type { ClickAction, HoverType, Layer } from '../../core';
import { kind } from '../../engine';
import { useStore } from '../../store';
import { Row, Scrub, Section, Select, Toggle } from '../controls/controls';

const HOVERS: { value: HoverType; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'lift', label: 'Lift' }, { value: 'grow', label: 'Grow' }, { value: 'glow', label: 'Glow' }, { value: 'tilt', label: 'Tilt to pointer' },
];
const CLICKS: { value: ClickAction; label: string }[] = [
  { value: 'none', label: 'Advance (default)' }, { value: 'next', label: 'Next slide' }, { value: 'prev', label: 'Previous slide' },
  { value: 'goto', label: 'Go to slide…' }, { value: 'link', label: 'Open link…' }, { value: 'flip', label: 'Flip to facts — turn the slide over' },
];

// ─── Interact ───────────────────────────────────────────────────────────────
export function LayerInteract({ layer }: { layer: Layer }) {
  const k = kind(layer.kind);
  const update = useStore((s) => s.updateLayer);
  const n = useStore((s) => s.deck.slides.length);
  // A link made by id (a game board's cells) shows the slide it reaches now.
  const it = layer.interact;
  const linked = useStore((s) => (it.gotoId ? s.deck.slides.findIndex((x) => x.id === it.gotoId) + 1 : 0));
  const up = (fn: (x: Layer['interact']) => void, m?: string) => update(layer.id, (l) => fn(l.interact), m);
  return (
    <>
      {k.mouseParam && (
        <Section title="Pointer">
          <Row label="Follow mouse" info="The effect origin tracks the pointer."><div><Toggle value={it.followMouse} onChange={(v) => up((x) => { x.followMouse = v; })} /></div></Row>
        </Section>
      )}
      {k.content && (
        <>
          <Section title="Depth">
            <Row label="Parallax" info="Moves against the pointer. Positive = closer to the viewer."><Scrub value={it.parallax} min={-1} max={1} step={0.01} onChange={(v, m) => up((x) => { x.parallax = v; }, m)} /></Row>
          </Section>
          <Section title="Hover">
            <Row label="State"><Select value={it.hover} options={HOVERS} onChange={(v) => up((x) => { x.hover = v; })} /></Row>
          </Section>
          <Section title="Click">
            <Row label="Action"><Select value={it.click} options={CLICKS} onChange={(v) => up((x) => { x.click = v; })} /></Row>
            {it.click === 'goto' && <Row label="Slide"><Scrub value={linked || it.gotoSlide} min={1} max={Math.max(1, n)} step={1} decimals={0} onChange={(v, m) => up((x) => { x.gotoSlide = v; delete x.gotoId; }, m)} /></Row>}
            {it.click === 'link' && <Row label="URL"><input className="text-input" placeholder="https://…" value={it.url} onChange={(e) => up((x) => { x.url = e.target.value; }, 'url')} onKeyDown={(e) => e.stopPropagation()} /></Row>}
          </Section>
          <Section title="Flip to facts">
            <Row label="On the back" info="Shown only while the slide is turned over by a layer whose click is Flip. Select it to edit it on the canvas.">
              <div><Toggle value={layer.face === 'back'} onChange={(v) => update(layer.id, (l) => { if (v) l.face = 'back'; else delete l.face; })} /></div>
            </Row>
          </Section>
        </>
      )}
      {!k.mouseParam && !k.content && <div className="hint">This effect has no pointer controls. Try Ripple, Lens, Swirl, Spotlight or Blur for mouse-reactive effects.</div>}
      <div className="hint">Interactions run live in <b>Preview</b> and in exported HTML decks. Follow-mouse effects also react in the editor.</div>
    </>
  );
}
