// diagrams/: its public interface. Code outside diagrams/ imports from here, never from its files (lab-engine-plan hard rule 13).
// Structural diagrams — loop, flowchart, timeline — laid out from data and drawn in code, with geometry and
// connector rules ported from diagram-design (MIT, © Cathryn Lavery, github.com/cathrynlavery/diagram-design).
import { flowLayout } from './flowchart';
import { loopLayout } from './loop';
import { timelineLayout } from './timeline';
import type { Diagram, Measure } from './types';

export { drawDiagram, type Skin } from './draw';
export { DIAGRAM_TYPES, diagramBeats, parseFlow, parseLoop, parseTimeline, timesOf } from './parse';
export { checkDiagram, toOutline } from './rules';
export { FLOOR, FLOW_MAX, LOOP_MAX, TIMELINE_MAX, roughMeasure, typeSizes } from './types';
export type { Conn, DNode, Diagram, DiagramType, Measure, Seg } from './types';

/** Lay a diagram out in a box of w × h, its names at `size` (never under FLOOR). */
export function layoutDiagram(type: string, text: string, w: number, h: number, size: number, measure: Measure, columns = 0): Diagram {
  if (type === 'flowchart') return flowLayout(text, w, h, size, measure, columns);
  if (type === 'timeline') return timelineLayout(text, w, h, size, measure);
  return loopLayout(text, w, h, size, measure);
}
