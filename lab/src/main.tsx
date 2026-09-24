import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './ui/App';

const gl = document.createElement('canvas').getContext('webgl2');
const root = createRoot(document.getElementById('root')!);
root.render(
  gl ? (
    <App />
  ) : (
    <div className="fatal">SlideForge Studio needs WebGL2. Please open it in a current version of Chrome, Edge, Safari or Firefox.</div>
  ),
);
