// kinds/text/: the text layer. Its public interface: what kinds/index.ts registers.
import { rasterText } from './raster';
import { layoutText, type KindDrawing } from '../../engine';

// A word wider than the box does not fit, however short the text: it would be cut off.
export const textDrawing: KindDrawing = { raster: rasterText, measure: (_c, p, w) => { const L = layoutText(p, w); return Math.max(0, ...L.lines.map((l) => l.width)) > w + 0.5 ? { height: Infinity } : L; } };
