import { ChartColumn, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Heading, ImagePlus, List, Play, Plus, Quote, Shapes, Sparkles, StickyNote, Timer, Type, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ActivityData } from '../model/activities';
import { LAYOUT_STYLES, themeOf } from '../model/layouts';
import { useStore } from '../model/store';
import { addImageFile, addItem, addVideoFile } from './insert';
import { Menu } from './Menu';

// Add, on the canvas bar at the foot of the canvas (where SlideForge's canvas bar keeps "+ Item"):
// the things a slide can hold, in SlideForge's order, and the pickers for a picture or a clip.
// "Activity ›" turns the menu into SlideForge's activities, by phase: one press puts the activity's
// slides into the lesson after this one, built by the lab, to be edited on the slide.
export function AddMenu() {
  const { addLayer } = useStore.getState();
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<'items' | 'activities'>('items');
  return (
    <>
        <Menu trigger={(open, t) => <button className={`tb-btn${open ? ' active' : ''}`} onClick={() => { setView('items'); t(); }}><Plus size={15} />Add<ChevronDown size={13} /></button>}>
          {(close) => {
            if (view === 'activities') return <ActivityList back={() => setView('items')} close={close} />;
            const add = (id: string) => () => { addLayer(id); close(); };
            const item = (id: Parameters<typeof addItem>[0]) => () => { addItem(id); close(); };
            return (
              <>
                {/* SlideForge's "+ Item" list, in its order */}
                <button onClick={item('heading')}><Heading size={15} />Heading</button>
                <button onClick={item('text')}><Type size={15} />Text<small>T</small></button>
                <button onClick={item('note')}><StickyNote size={15} />Note</button>
                <button onClick={item('bullets')}><List size={15} />Bullet points</button>
                <button onClick={() => { imageRef.current?.click(); close(); }}><ImagePlus size={15} />Image…</button>
                <button onClick={item('video')}><Video size={15} />Video — a clip or a YouTube link</button>
                <button onClick={item('quote')}><Quote size={15} />Quote</button>
                <button onClick={item('chart')}><ChartColumn size={15} />Chart</button>
                <button onClick={item('timer')}><Timer size={15} />Timer</button>
                <hr />
                <button onClick={() => { videoRef.current?.click(); close(); }}><Video size={15} />Video…</button>
                <button onClick={add('shape')}><Shapes size={15} />Shape</button>
                <hr />
                <button onClick={() => setView('activities')}><Sparkles size={15} />Activity<small><ChevronRight size={13} /></small></button>
                <button onClick={add('quiz')}><CircleHelp size={15} />Quiz<small>placeholder</small></button>
                <button onClick={add('activity')}><Timer size={15} />Activity<small>placeholder</small></button>
                <div className="menu-note">Layouts, backgrounds &amp; effects, headers and footers are in the left panel. You can also drop or paste an image or video straight onto the slide.</div>
              </>
            );
          }}
        </Menu>
      <input ref={imageRef} type="file" accept="image/*" multiple hidden onChange={async (e) => {
        for (const f of [...(e.target.files ?? [])]) await addImageFile(f);
        e.target.value = '';
      }} />
      <input ref={videoRef} type="file" accept="video/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (f) await addVideoFile(f);
      }} />
    </>
  );
}

/** SlideForge's activities, by phase, loaded the first time the list opens. A press builds the
 *  activity in the deck's style and adds its slides, in order, after the slide on screen. */
function ActivityList({ back, close }: { back: () => void; close: () => void }) {
  const [lib, setLib] = useState<{ data: ActivityData; m: typeof import('../model/activities') } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([import('../model/activities'), import('../assets/activities.json')]).then(([m, d]) => {
      const data = (d as { default: ActivityData }).default ?? (d as unknown as ActivityData);
      if (live) setLib({ data, m });
    });
    return () => { live = false; };
  }, []);
  const insert = (key: string) => {
    if (!lib) return;
    const a = lib.data.activities.find((x) => x.key === key);
    if (!a) return;
    const { deck, addSlide, showToast } = useStore.getState();
    const st = themeOf(deck) ?? LAYOUT_STYLES[0];
    const slides = lib.m.activitySlides(a, st);
    // Each goes after the one before it: addSlide puts a slide after the one on screen and moves there.
    slides.forEach((s) => addSlide(s));
    showToast(`${a.title} added: ${slides.length} ${slides.length === 1 ? 'slide' : 'slides'}. Its steps are in the speaker notes.`);
    close();
  };
  return (
    <div className="menu-activities">
      <button className="menu-back" onClick={back}><ChevronLeft size={15} />Activities</button>
      <hr />
      {!lib && <div className="menu-note">Loading the activities…</div>}
      {lib && lib.m.byPhase(lib.data).map((g) => (
        <div key={g.phase}>
          <div className="menu-label">{g.icon} {g.label}</div>
          {g.items.map((a) => (
            <button key={a.key} title={a.blurb} onClick={() => insert(a.key)}>
              <span className="menu-act-icon">{a.icon}</span>{a.title}<small>{a.target === 'game' ? 'game' : a.minutes ? `${a.minutes} min` : ''}</small>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Play this slide's animations in the editor: a green block with a white play mark, its name in the tooltip. */
export function AnimateButton() {
  return (
    <button className="btn-play" title="Animate: play this slide's animations in the editor" aria-label="Animate" onClick={() => useStore.setState((s) => ({ playToken: s.playToken + 1 }))}><Play size={12} fill="currentColor" strokeWidth={0} /></button>
  );
}
