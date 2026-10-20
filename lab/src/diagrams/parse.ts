// A diagram's data: one item a line, the way a chart's table is written.
//
//   loop       hub: Name | sublabel            the one hub (accumulated state), then the stations,
//              Station | sublabel              clockwise from the top
//   flowchart  (Start) | sublabel              (…) an oval start or end; a name ending ? a decision
//              Ready? -> Teach [yes], Plan [no] where it goes; without ->, to the next line
//   timeline   1858 | Name | sublabel          a date, a year, a number, or "Week 3": numbers are
//                                              placed to scale
//
// A * before an item marks it focal: at most one.
import { FLOW_MAX, LOOP_MAX, TIMELINE_MAX, type DiagramType } from './types';

export interface Item { name: string; sub: string; focal: boolean }
export interface FlowItem extends Item { shape: 'box' | 'oval' | 'diamond'; links: { to: string; label: string }[] | null }
export interface TimeItem extends Item { when: string }

const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);
function item(raw: string): Item & { cells: string[] } {
  const focal = raw.startsWith('*');
  const cells = (focal ? raw.slice(1) : raw).split('|').map((c) => c.trim());
  return { name: cells[0] ?? '', sub: cells.slice(1).join(' · '), focal, cells };
}
/** Only the first focal item stays focal. */
function oneFocal<T extends Item>(items: T[]): T[] {
  let seen = false;
  for (const it of items) { if (it.focal && seen) it.focal = false; if (it.focal) seen = true; }
  return items;
}

export function parseLoop(text: string): { hub: Item | null; stations: Item[] } {
  let hub: Item | null = null;
  const stations: Item[] = [];
  for (const l of lines(text)) {
    const m = l.match(/^hub\s*:\s*(.*)$/i);
    if (m) { const it = item(m[1]); hub = { name: it.name, sub: it.sub, focal: false }; continue; }
    const it = item(l);
    stations.push({ name: it.name, sub: it.sub, focal: it.focal });
  }
  return { hub, stations: oneFocal(stations) };
}

export function parseFlow(text: string): FlowItem[] {
  return oneFocal(lines(text).map((l) => {
    const [node, to] = l.split(/\s*->\s*/, 2);
    const it = item(node);
    let name = it.name, shape: FlowItem['shape'] = 'box';
    if (/^\(.*\)$/.test(name)) { shape = 'oval'; name = name.slice(1, -1).trim(); }
    else if (name.endsWith('?')) shape = 'diamond';
    const links = to === undefined ? null : to.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
      const m = x.match(/^(.*?)\s*[[(]([^\])]*)[\])]\s*$/);
      return m ? { to: m[1].trim(), label: m[2].trim() } : { to: x, label: '' };
    });
    return { name, sub: it.sub, focal: it.focal, shape, links };
  }));
}

export function parseTimeline(text: string): TimeItem[] {
  return oneFocal(lines(text).map((l) => {
    const it = item(l);
    return { when: it.cells[0] ?? '', name: it.cells[1] ?? '', sub: it.cells.slice(2).join(' · '), focal: it.focal };
  }));
}

/**
 * Times as numbers, when every one reads as one: a year or a number, a date (2026-09 or 2026-09-14), or
 * the same words round a number ("Week 3", "10 min"). Otherwise null: the events are a sequence, set
 * at equal steps, and the dates stay labels.
 */
export function timesOf(whens: string[]): number[] | null {
  const date = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/;
  const out: number[] = [];
  let frame: string | null = null;
  for (const w of whens) {
    const d = w.match(date);
    if (d) { out.push(Number(d[1]) + (Number(d[2]) - 1) / 12 + (d[3] ? (Number(d[3]) - 1) / 365 : 0)); continue; }
    const m = w.match(/^(.*?)(-?\d+(?:\.\d+)?)(.*)$/);
    if (!m) return null;
    const f = `${m[1].trim().toLowerCase()}#${m[3].trim().toLowerCase()}`;
    if (frame !== null && f !== frame) return null;
    frame = f;
    out.push(Number(m[2]));
  }
  return out.length ? out : null;
}

/** How many beats a diagram builds in: what its draw entrance lays down, one after another. */
export function diagramBeats(type: string, text: string): number {
  if (type === 'flowchart') return Math.max(1, Math.min(FLOW_MAX, parseFlow(text).length));
  if (type === 'timeline') return 1 + Math.min(TIMELINE_MAX, parseTimeline(text).length);
  const { hub, stations } = parseLoop(text);
  return Math.max(1, (hub ? 1 : 0) + Math.min(LOOP_MAX, stations.length));
}

export const DIAGRAM_TYPES: DiagramType[] = ['loop', 'flowchart', 'timeline'];
