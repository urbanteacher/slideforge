import { ChartColumn, ChevronDown, CircleHelp, Heading, ImagePlus, List, Play, Plus, Quote, Shapes, StickyNote, Timer, Type, Video } from 'lucide-react';
import { useRef } from 'react';
import { useStore } from '../model/store';
import { addImageFile, addItem, addVideoFile } from './insert';
import { Menu } from './Menu';

// Add, on the canvas bar at the foot of the canvas (where SlideForge's canvas bar keeps "+ Item"):
// the things a slide can hold, in SlideForge's order, and the pickers for a picture or a clip.
export function AddMenu() {
  const { addLayer } = useStore.getState();
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  return (
    <>
        <Menu trigger={(open, t) => <button className={`tb-btn${open ? ' active' : ''}`} onClick={t}><Plus size={15} />Add<ChevronDown size={13} /></button>}>
          {(close) => {
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

/** Play this slide's animations in the editor: a green block with a white play mark, its name in the tooltip. */
export function AnimateButton() {
  return (
    <button className="btn-play" title="Animate: play this slide's animations in the editor" aria-label="Animate" onClick={() => useStore.setState((s) => ({ playToken: s.playToken + 1 }))}><Play size={12} fill="currentColor" strokeWidth={0} /></button>
  );
}
