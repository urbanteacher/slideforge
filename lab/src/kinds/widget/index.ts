// kinds/widget/: the widget layer. Its public interface: what kinds/index.ts registers.
import { rasterWidget } from './raster';
import { widgetDef } from './def';
import { WIDGET_SANDBOX, widgetDoc, widgetRuns, type LayerKind } from '../../engine';

export { WIDGET_STARTER } from './starter';
// A web layer: the show runs its page, sandboxed, where the canvas draws its card (engine/web.ts).
export const widgetKind: LayerKind = {
  def: widgetDef, raster: rasterWidget,
  web: (l) => (widgetRuns(l.params.html)
    ? { kind: 'page', doc: widgetDoc(String(l.params.html)), sandbox: WIDGET_SANDBOX, background: String(l.params.background ?? '#ffffff'), radius: Number(l.params.radius ?? 24) }
    : null),
};
