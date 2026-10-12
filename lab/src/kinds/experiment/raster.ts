// The predict and compare layer drawn into a canvas for the renderer: its own drawing, in experiments/.
import type { Layer } from '../../core';
import { boxCanvas, type Raster } from '../../engine';
import { drawExperiment } from '../../experiments';

export function rasterExperiment(layer: Layer): Raster { const { canvas, ctx, w, h, rect } = boxCanvas(layer); ctx.textBaseline = 'alphabetic'; drawExperiment(ctx, w, h, layer.params); return { canvas, rect }; }
