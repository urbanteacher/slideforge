// The motion experiment layer drawn into a canvas for the renderer: its own drawing, in experiments/.
import type { Layer } from '../../core';
import { boxCanvas, getImage, type Raster } from '../../engine';
import { drawScene } from '../../experiments';

export function rasterScene(layer: Layer): Raster { const { canvas, ctx, w, h, rect } = boxCanvas(layer); drawScene(ctx, w, h, layer.params, (src) => getImage(src)); return { canvas, rect }; }
