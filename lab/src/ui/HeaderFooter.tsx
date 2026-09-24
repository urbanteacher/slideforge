import { produce } from 'immer';
import { useState } from 'react';
import { HF_KINDS, HF_SLOTS, carryCanvasEdits, editHeaderFooter, hfConfig, hfDefaults, headerFooterStale, syncHeaderFooter } from '../model/headerFooter';
import { slideOf, useStore } from '../model/store';
import type { HFKind, HFSlot, HeaderFooter } from '../model/types';
import { Row, Section, Select, Toggle } from './controls';

// SlideForge's Header & footer pane, without its text fields. The panel says which slot holds what;
// the words are typed on the slide, in the box that lands in the slot.

/* Keep every slide's frame in step with its setting: carry a word typed on one slide back to the
   setting, and fill in a slide that was just added or moved. The fix is folded into the change that
   caused it rather than pushed as a step of its own, so undo and redo still walk the author's steps. */
useStore.subscribe((s, prev) => {
  if (s.deck === prev.deck) return;
  const next = produce(s.deck, (d) => {
    if (carryCanvasEdits(d) || headerFooterStale(d)) syncHeaderFooter(d);
  });
  if (next !== s.deck) useStore.setState({ deck: next });
});

const LABEL: Record<HFSlot, string> = {
  'header-left': 'Header left', 'header-center': 'Header centre', 'header-right': 'Header right',
  'footer-left': 'Footer left', 'footer-center': 'Footer centre', 'footer-right': 'Footer right',
};

/** The Header & footer controls. `bare` draws them without a section header, for the left panel's fold. */
export function HeaderFooterSection({ bare = false }: { bare?: boolean }) {
  const deck = useStore((s) => s.deck);
  const slide = useStore(slideOf);
  const mutate = useStore((s) => s.mutate);
  const [scope, setScope] = useState<'deck' | 'slide'>(slide.headerFooter ? 'slide' : 'deck');
  const [slot, setSlot] = useState<HFSlot>('header-left');
  const cfg: HeaderFooter = scope === 'slide' ? hfConfig(deck, slide).cfg : deck.headerFooter ?? hfDefaults();
  const edit = (change: (c: HeaderFooter) => void) => mutate((d) => editHeaderFooter(d, slide.id, scope, change));
  const item = cfg.slots[slot] ?? { kind: 'empty' as HFKind };

  const body = (
    <>
      <Row label="Apply to" info="Presentation defaults set every slide. This slide overrides them here only.">
        <Select value={scope} options={[{ value: 'deck', label: 'Presentation defaults' }, { value: 'slide', label: 'This slide' }]} onChange={setScope} />
      </Row>
      <Row label="Show"><Toggle value={cfg.enabled} onChange={(v) => edit((c) => { c.enabled = v; })} /></Row>
      <Row label="Hide on covers" info="Title and section slides keep their own identity, without the frame."><Toggle value={cfg.hideOnCover} onChange={(v) => edit((c) => { c.hideOnCover = v; })} /></Row>
      <div className="hf-slots" role="group" aria-label="Header and footer slots">
        {HF_SLOTS.map((s) => {
          const k = cfg.slots[s]?.kind ?? 'empty';
          return (
            <button key={s} className={`hf-slot${s === slot ? ' on' : ''}${k === 'empty' ? ' empty' : ''}`} aria-pressed={s === slot} onClick={() => setSlot(s)}>
              <b>{LABEL[s]}</b><span>{HF_KINDS.find((x) => x.value === k)?.label}</span>
            </button>
          );
        })}
      </div>
      <Row label="Content">
        <Select value={item.kind} options={HF_KINDS} onChange={(v) => edit((c) => {
          c.slots[slot] = { ...(c.slots[slot] ?? {}), kind: v };
          if (v !== 'empty') c.enabled = true;
        })} />
      </Row>
      <div className="hint hf-hint">{cfg.enabled ? 'Type the words on the slide; every slide that shares this setting follows. Drop a picture on an image slot to fill it.' : 'Turn on Show to put the header and footer on the slides.'}</div>
      <button className="btn-soft tidy" onClick={() => mutate((d) => {
        if (scope === 'slide') { const s = d.slides.find((x) => x.id === slide.id); if (s) delete s.headerFooter; setScope('deck'); }
        else d.headerFooter = { ...hfDefaults(), enabled: !!d.headerFooter?.enabled };
        syncHeaderFooter(d);
      })}>{scope === 'slide' ? 'Use the presentation defaults here' : 'Restore defaults'}</button>
    </>
  );
  return bare ? <div className="panel-scroll hf-panel">{body}</div> : <Section title="Header & footer">{body}</Section>;
}
