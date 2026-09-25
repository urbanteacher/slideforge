import { createRoot } from 'react-dom/client';
import './styles.css';
import { labApi } from './embed';
import { App } from './ui/App';

// ?embed=1: SlideForge's shell has loaded the lab in a frame as its lesson engine (js/lab-engine.js).
const embedded = new URLSearchParams(location.search).get('embed') === '1';
type Host = { SF?: { LabEngine?: { ready: (api: typeof labApi) => void; failed?: (why: string) => void } } };
const host = embedded && window.parent !== window ? (window.parent as unknown as Host) : null;

if (embedded) {
  // The shell's own shortcuts still work with the focus in here: Save, the command palette,
  // the studio switch and the shortcut list are the shell's, so they go up to it.
  addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    const shells = (mod && (k === 's' || k === 'k' || k === 'e')) || (!mod && !typing && e.key === '?');
    if (!shells || !host) return;
    e.preventDefault();
    const doc = (window.parent as Window).document;
    doc.dispatchEvent(new (window.parent as Window & typeof globalThis).KeyboardEvent('keydown', {
      key: e.key, code: e.code, metaKey: e.metaKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, bubbles: true,
    }));
  }, true);
}

const gl = document.createElement('canvas').getContext('webgl2');
// No WebGL2, no lab: say so to the shell now, so it offers the classic studio instead of waiting.
if (!gl) host?.SF?.LabEngine?.failed?.('webgl');
const root = createRoot(document.getElementById('root')!);
root.render(
  gl ? (
    <App embedded={embedded} onReady={() => host?.SF?.LabEngine?.ready(labApi)} />
  ) : (
    <div className="fatal">
      SlideForge Studio could not start its graphics (WebGL2). If this browser ran it before, it has switched WebGL off for now —
      usually after the graphics card ran out of memory. Close this tab and open the lab again; if that does not do it, quit and
      reopen the browser. Your work is saved in this browser and will be there.
    </div>
  ),
);
