// The shapes a diagram is made of, and the sizes every type shares.
//
// The geometry and connector rules are ported from diagram-design by Cathryn Lavery
// (github.com/cathrynlavery/diagram-design, MIT): its loop layout math, its orthogonal r=8 elbows,
// its timeline conventions and its six connector rules. Its type ramp is not: diagram-design sets
// names at 16px and sublabels at 12px on a 1040-wide page, under SlideForge's floor once on a slide.
// Here the type is the slide's (never under FLOOR) and every other length — strokes, radii, gaps,
// arrowheads — is diagram-design's scaled by `u`, the name size over its 16px.

export type DiagramType = 'loop' | 'flowchart' | 'timeline';

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

/** A straight piece, or a piece of a circle from angle a0 to a1 (clockwise on screen unless ccw). */
export type Seg = { k: 'line'; a: Pt; b: Pt } | { k: 'arc'; c: Pt; r: number; a0: number; a1: number; ccw: boolean };

export type Shape = 'box' | 'hub' | 'oval' | 'diamond' | 'dot' | 'label';
export interface DNode {
  id: string;
  shape: Shape;
  rect: Rect;
  name: string[];
  sub: string[];
  /** A timeline event's date, set small above its name. */
  eyebrow?: string;
  focal: boolean;
  beat: number;
}

/** ring: a loop's arc between stations; spoke: its dashed write-back; flow: a flowchart's elbow;
 *  drop: a timeline's hairline from dot to label; axis: a timeline's baseline and ticks. */
export type Role = 'ring' | 'spoke' | 'flow' | 'drop' | 'axis';
export interface Conn {
  from: string;
  to: string;
  role: Role;
  segs: Seg[];
  dashed: boolean;
  /** Where the arrowhead's tip lands and which way it points (radians). */
  head?: { tip: Pt; dir: number };
  beat: number;
  /** lead: drawn before its beat's node arrives (the arrow into it); trail: after (the arrow out). */
  phase: 'lead' | 'trail';
  label?: { text: string; rect: Rect };
}

export interface Diagram {
  type: DiagramType;
  w: number; h: number;
  /** diagram-design's px, scaled to this diagram: name size / 16. */
  u: number;
  size: number; sub: number; label: number;
  nodes: DNode[];
  conns: Conn[];
  beats: number;
  /** What would not fit or was cut, in words for the inspector. Empty when the diagram is sound. */
  problems: string[];
  /** What the reader should know but is not wrong: a timeline read as an order, not a scale. */
  notes: string[];
}

/** Text width at a size and weight: the canvas's measureText in the studio, an estimate in tests. */
export type Measure = (text: string, px: number, weight: number) => number;

/** SlideForge's legibility floor (src/render/fit-check.js LEGIBLE_FLOOR): 20px on a 720px slide, so 30
 *  on the lab's 1080. No text in a diagram is set smaller. */
export const FLOOR = 30;
/** Most stations a loop holds at the slide's type size. diagram-design allows eight; at 30px and up,
 *  past six the stations crowd the hub. Split into an overview and a detail instead. */
export const LOOP_MAX = 6;
export const FLOW_MAX = 9;
export const TIMELINE_MAX = 8;

/** The type sizes: names at `size`, sublabels and arrow labels at four fifths, never under the floor. */
export function typeSizes(size: number) {
  const s = Math.max(FLOOR, Math.round(size));
  return { size: s, sub: Math.max(FLOOR, Math.round(s * 0.8)), label: Math.max(FLOOR, Math.round(s * 0.8)), u: s / 16 };
}

export const LINE = 1.2; // a name's line height, in ems
export const SUB_LINE = 1.25;

/** Height of a node's words: its name lines, then its sublabel lines after a small gap. */
export function textHeight(nameLines: number, subLines: number, size: number, sub: number) {
  return nameLines * size * LINE + (subLines ? sub * 0.3 + subLines * sub * SUB_LINE : 0);
}

export const snap4 = (v: number) => Math.round(v / 4) * 4;
export const ceil4 = (v: number) => Math.ceil(v / 4) * 4;

/**
 * Word-wrap to a width, at most `max` lines. A word wider than the width keeps its own line and is
 * reported through `long`, since the type is never brought down to make it fit.
 */
export function wrap(text: string, px: number, weight: number, maxW: number, measure: Measure, max = 2): { lines: string[]; over: boolean } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let over = false;
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last !== undefined && measure(`${last} ${w}`, px, weight) <= maxW) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
    if (measure(w, px, weight) > maxW) over = true;
  }
  if (lines.length > max) { over = true; lines.splice(max - 1, lines.length, lines.slice(max - 1).join(' ')); }
  return { lines, over };
}

/** A rough measure for code without a canvas (tests, the converter): Inter-like widths. */
export const roughMeasure: Measure = (t, px, weight) => t.length * px * (weight >= 600 ? 0.6 : 0.55);
