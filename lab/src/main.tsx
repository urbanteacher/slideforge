import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './ui/App';

const gl = document.createElement('canvas').getContext('webgl2');
const root = createRoot(document.getElementById('root')!);
root.render(
  gl ? (
    <App />
  ) : (
    <div className="fatal">
      SlideForge Studio could not start its graphics (WebGL2). If this browser ran it before, it has switched WebGL off for now —
      usually after the graphics card ran out of memory. Close this tab and open the lab again; if that does not do it, quit and
      reopen the browser. Your work is saved in this browser and will be there.
    </div>
  ),
);
