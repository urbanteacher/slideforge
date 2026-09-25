import { Minus, PanelRightClose, PanelRightOpen, Plus } from 'lucide-react';
import { useStore } from '../model/store';
import { AddMenu, AnimateButton } from './AddMenu';

// The bar along the foot of the canvas, above the slide strip, as SlideForge's: what acts on the slide
// on the left (Add), Animate, the panel button (fold the right-hand panel away), and the
// zoom on the right: out, the size (press it to fit the slide to the window again), and in.
export function CanvasBar() {
  const zoomSetting = useStore((s) => s.zoom);
  const fitZoom = useStore((s) => s.fitZoom);
  const panelHidden = useStore((s) => s.panelHidden);
  const { set } = useStore.getState();
  // The old studio's "◨ Panel": fold the right-hand panel away for the whole width, and back.
  const togglePanel = () => {
    const next = !panelHidden;
    set({ panelHidden: next });
    try { localStorage.setItem('sf-lab-panel', next ? 'hidden' : 'shown'); } catch { /* storage off: it still toggles */ }
  };
  const zoom = zoomSetting === 'fit' ? fitZoom : zoomSetting;
  const stepZoom = (k: number) => set({ zoom: Math.max(0.1, Math.min(4, Math.round(zoom * k * 20) / 20)) });
  return (
    <div className="canvas-bar" role="toolbar" aria-label="Slide and zoom">
      <AddMenu />
      <div className="spacer" />
      <AnimateButton />
      <span className="fmt-sep" />
      <button className="tb-btn icon" title="Zoom out" aria-label="Zoom out" onClick={() => stepZoom(1 / 1.25)}><Minus size={15} /></button>
      <button className={`zoom-val${zoomSetting === 'fit' ? ' fit' : ''}`} title="Fit to window" onClick={() => set({ zoom: 'fit' })}>{Math.round(zoom * 100)}%</button>
      <button className="tb-btn icon" title="Zoom in" aria-label="Zoom in" onClick={() => stepZoom(1.25)}><Plus size={15} /></button>
      <span className="fmt-sep" />
      <button className={`tb-btn icon${panelHidden ? ' active' : ''}`} title={panelHidden ? 'Show the panel' : 'Hide the panel'} aria-label={panelHidden ? 'Show the panel' : 'Hide the panel'} aria-pressed={panelHidden} onClick={togglePanel}>{panelHidden ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}</button>
    </div>
  );
}
