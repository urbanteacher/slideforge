import { ChartGantt, Minus, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Plus } from 'lucide-react';
import { keyProps } from '../../keys';
import { useStore } from '../../store';
import { AddMenu, AnimateButton } from '../controls/AddMenu';
import { focusBrowse } from '../panels/Browse';

// The bar along the foot of the canvas, above the slide strip, as SlideForge's: what acts on the slide
// on the left (Add), Animate, the panel button (fold the right-hand panel away), and the
// zoom on the right: out, the size (press it to fit the slide to the window again), and in.
export function CanvasBar() {
  const zoomSetting = useStore((s) => s.zoom);
  const fitZoom = useStore((s) => s.fitZoom);
  const panelHidden = useStore((s) => s.panelHidden);
  const view = useStore((s) => s.view);
  const timelineOpen = useStore((s) => s.timelineOpen);
  const { set } = useStore.getState();
  const leftHidden = useStore((s) => s.leftHidden);
  // The timeline under the canvas: the slide's clock, its layers' bars and a playhead to drag.
  const toggleTimeline = () => {
    const next = !timelineOpen;
    set(next ? { timelineOpen: true } : { timelineOpen: false, scrub: null });
    try { localStorage.setItem('sf-lab-timeline', next ? 'open' : 'closed'); } catch { /* storage off: it still toggles */ }
  };
  const zoom = zoomSetting === 'fit' ? fitZoom : zoomSetting;
  return (
    <div className="canvas-bar" role="toolbar" aria-label="Slide and zoom">
      <button className={`tb-btn icon${leftHidden ? ' active' : ''}`} {...keyProps(leftHidden ? 'Show the left panel' : 'Hide the left panel', 'panel.left')} aria-label={leftHidden ? 'Show the left panel' : 'Hide the left panel'} aria-pressed={leftHidden} onClick={() => toggleSide('left')}>{leftHidden ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
      {view === 'lesson' ? <AddMenu /> : (
        // The Quiz studio and Activities add what they make: Engage's list, on the right, opens on it.
        <button className="tb-btn add-view" onClick={focusBrowse} title={view === 'quiz' ? 'Browse the games, on the left' : view === 'nodes' ? 'Browse the Nodes formats, on the left' : 'Browse the activities, on the left'}><Plus size={15} /><span className="add-label">{view === 'quiz' ? 'Game' : view === 'nodes' ? 'Nodes format' : 'Activity'}</span></button>
      )}
      <div className="spacer" />
      <AnimateButton />
      <button className={`tb-btn icon${timelineOpen ? ' active' : ''}`} title={timelineOpen ? 'Hide the timeline' : 'Timeline: scrub through the slide frame by frame'} aria-label="Timeline" aria-pressed={timelineOpen} onClick={toggleTimeline}><ChartGantt size={16} /></button>
      <span className="fmt-sep" />
      <button className="tb-btn icon" {...keyProps('Zoom out', 'view.zoomOut')} aria-label="Zoom out" onClick={() => stepZoom(1 / 1.25)}><Minus size={15} /></button>
      <button className={`zoom-val${zoomSetting === 'fit' ? ' fit' : ''}`} {...keyProps('Fit to window', 'view.zoomFit')} onClick={() => set({ zoom: 'fit' })}>{Math.round(zoom * 100)}%</button>
      <button className="tb-btn icon" {...keyProps('Zoom in', 'view.zoomIn')} aria-label="Zoom in" onClick={() => stepZoom(1.25)}><Plus size={15} /></button>
      <span className="fmt-sep" />
      <button className={`tb-btn icon${panelHidden ? ' active' : ''}`} {...keyProps(panelHidden ? 'Show the inspector' : 'Hide the inspector', 'panel.right')} aria-label={panelHidden ? 'Show the inspector' : 'Hide the inspector'} aria-pressed={panelHidden} onClick={() => toggleSide('right')}>{panelHidden ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}</button>
    </div>
  );
}

/** Fold a side panel away, or bring it back, and remember it in this browser: the left (the slide list and layers)
 *  or the right (the inspector and Status). The old studio's "◨ Panel" was the right one. */
export function toggleSide(side: 'left' | 'right'): void {
  const st = useStore.getState();
  const key = side === 'left' ? 'leftHidden' : 'panelHidden';
  const next = !st[key];
  st.set({ [key]: next });
  try { localStorage.setItem(side === 'left' ? 'sf-lab-left' : 'sf-lab-panel', next ? 'hidden' : 'shown'); } catch { /* storage off: it still toggles, and Settings says it can't be kept */ }
}

/** Zoom by a step (in: 1.25, out: 0.8), from whatever the slide is shown at now. */
export function stepZoom(k: number): void {
  const { zoom: z, fitZoom, set } = useStore.getState();
  const zoom = z === 'fit' ? fitZoom : z;
  set({ zoom: Math.max(0.1, Math.min(4, Math.round(zoom * k * 20) / 20)) });
}
