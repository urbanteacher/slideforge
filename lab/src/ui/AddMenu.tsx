import { ChartColumn, ChevronDown, Heading, ImagePlus, LayoutGrid, List, ListOrdered, Minus, Play, Plus, Quote, Rows2, Shapes, SquareSplitHorizontal, StickyNote, Table, Timer, Type, Video } from 'lucide-react';
import { useRef } from 'react';
import { useStore } from '../model/store';
import { addImageFile, addItem, addTextImage } from './insert';
import { insertBlock } from './SlideBlocks';
import { Menu } from './Menu';

// Add, on the canvas bar at the foot of the canvas (where SlideForge's canvas bar keeps "+ Item"):
// the things a slide is built from, quickest first: words, then pictures and data, then the lab's
// blocks (the same ones Layouts has on this slide), then timing and drawing. One Video: its Video tab
// takes a file or a link. Games and activities are chosen in Browse, in the Quiz studio and Activities.
export function AddMenu() {
  const { addLayer } = useStore.getState();
  const imageRef = useRef<HTMLInputElement>(null);
  return (
    <>
        <Menu trigger={(open, t) => <button className={`tb-btn${open ? ' active' : ''}`} onClick={t}><Plus size={15} />Add<ChevronDown size={13} /></button>}>
          {(close) => {
            const add = (id: string) => () => { addLayer(id); close(); };
            const item = (id: Parameters<typeof addItem>[0]) => () => { addItem(id); close(); };
            return (
              <>
                <button onClick={item('heading')}><Heading size={15} />Heading</button>
                <button onClick={item('text')}><Type size={15} />Text<small>T</small></button>
                <button onClick={item('bullets')}><List size={15} />Bullet points</button>
                <button onClick={item('numbers')}><ListOrdered size={15} />Numbered list</button>
                <button onClick={item('quote')}><Quote size={15} />Quote</button>
                <button onClick={item('note')}><StickyNote size={15} />Note</button>
                <hr />
                <button onClick={() => { imageRef.current?.click(); close(); }}><ImagePlus size={15} />Image…</button>
                <button onClick={item('video')}><Video size={15} />Video</button>
                <button onClick={item('chart')}><ChartColumn size={15} />Chart</button>
                <button onClick={item('table')}><Table size={15} />Table</button>
                <hr />
                <button onClick={() => { addTextImage(); close(); }}><SquareSplitHorizontal size={15} />Text + image</button>
                <button onClick={() => { insertBlock('cards'); close(); }}><LayoutGrid size={15} />Cards</button>
                <button onClick={() => { insertBlock('numbered'); close(); }}><ListOrdered size={15} />Numbered points</button>
                <button onClick={() => { insertBlock('choices'); close(); }}><Rows2 size={15} />Choice boxes · A–D</button>
                <hr />
                <button onClick={item('timer')}><Timer size={15} />Timer</button>
                <button onClick={add('shape')}><Shapes size={15} />Shape</button>
                <button onClick={item('line')}><Minus size={15} />Line</button>
              </>
            );
          }}
        </Menu>
      <input ref={imageRef} type="file" accept="image/*" multiple hidden onChange={async (e) => {
        for (const f of [...(e.target.files ?? [])]) await addImageFile(f);
        e.target.value = '';
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
