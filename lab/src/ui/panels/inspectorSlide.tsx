// The inspector with nothing selected: the slide's ground, its face and its design.
import { themeOf, setSlideGround } from '../../layouts';
import { slideOf, useStore } from '../../store';
import { ColorField, Row, Section, Select, newGesture } from '../controls/controls';
import { tidySlide } from '../stage/snap';
import { ActivityPanel } from './activity';
import { NodesPanel } from './nodes';
import { GamePanel } from './game';
import { RecipePanel } from './recipe';
import { WandSparkles } from 'lucide-react';
import { useRef } from 'react';

/** Front | Back, on a slide with Flip to facts: which face the canvas shows, so the back's heading and
 *  words are edited where they are, on the canvas, like the front's. The show still turns it over on a
 *  click. Only which face is in view changes here; nothing on the slide does. */
function FaceRow() {
  const slide = useStore(slideOf);
  const backOf = useStore((s) => s.backOf);
  const set = useStore((s) => s.set);
  if (!slide.layers.some((l) => l.face === 'back')) return null;
  return (
    <Row label="Showing" info="A slide with Flip to facts has a back. Show it to edit its words on the canvas; the show turns it over when its Flip layer is clicked.">
      <Select value={backOf === slide.id ? 'back' : 'front'} options={[{ value: 'front', label: 'Front' }, { value: 'back', label: 'Back — the facts' }]}
        onChange={(v) => set({ backOf: v === 'back' ? slide.id : null, selectedId: null })} />
    </Row>
  );
}

/** Which of the theme's grounds this slide sits on: working, quiet or loud. Text and accents follow. */
function GroundRow() {
  const slide = useStore(slideOf);
  const deck = useStore((s) => s.deck);
  const st = themeOf(deck);
  if (!st?.grounds?.length) return null;
  const set = (id: string | null) => useStore.getState().mutate((d) => setSlideGround(d, slide.id, id));
  const chip = (id: string | null, bg: string, ink: string, name: string) => (
    <button key={name} className={`guide-ground${(slide.ground ?? null) === id ? ' on' : ''}`} style={{ background: bg, color: ink }} onClick={() => set(id)} title={`Set this slide on the ${name.toLowerCase()} ground`}>Aa<small>{name}</small></button>
  );
  return (
    <Row label="Ground" info="The palette's three grounds. The text and accents on the slide change with it.">
      <div className="guide-grounds compact">
        {chip(null, st.ground, st.ink, 'Working')}
        {st.grounds.map((g) => chip(g.id, g.ground, g.ink, g.name))}
      </div>
    </Row>
  );
}

export function SlideDesign() {
  const slide = useStore(slideOf);
  const { updateSlide } = useStore.getState();
  const nm = useRef(newGesture());
  return (
    <>
      <RecipePanel />
      <GamePanel />
      <ActivityPanel />
      <NodesPanel />
      <Section title="Slide">
        <Row label="Name"><input className="text-input" value={slide.name} onFocus={() => (nm.current = newGesture())} onChange={(e) => updateSlide((s) => { s.name = e.target.value; }, nm.current)} onKeyDown={(e) => e.stopPropagation()} /></Row>
        <Row label="Background" info="Shown beneath all layers."><ColorField value={slide.background} onChange={(v, m) => updateSlide((s) => { s.background = v; }, m)} /></Row>
        <GroundRow />
        <FaceRow />
        <button className="btn-soft tidy" onClick={tidySlide} title="Even out every row and column on this slide: one gap, one edge, one width each."><WandSparkles size={13} />Tidy up this slide</button>
      </Section>
      <Section title="Speaker notes">
        <textarea className="textarea" placeholder="What you want to say on this slide… (press N while presenting)" value={slide.notes} onFocus={() => (nm.current = newGesture())} onChange={(e) => updateSlide((s) => { s.notes = e.target.value; }, nm.current)} onKeyDown={(e) => e.stopPropagation()} />
      </Section>
      <div className="hint">Transition, backdrop motion and the build order are in <b>Animate</b>. Drop an image anywhere on the canvas, or paste one with <kbd>⌘V</kbd>. Double-click a picture to replace it, or text to edit it in place.</div>
    </>
  );
}
