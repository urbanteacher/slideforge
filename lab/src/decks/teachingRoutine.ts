import type { Slide } from '../core';
import { diagramSlide, type LayoutStyle } from '../layouts';

// The Teaching Routine as diagrams (the diagram layer, kinds/diagram). Its eight stages are more than a
// loop holds at slide size (six), so it is split, the way diagram-design splits a loop past its budget:
// an overview loop of the stages in pairs round the lesson they serve, Reflect focal, and then the
// eight in order as a flow, Reflect carrying into the next lesson's Plan.

export const TEACHING_ROUTINE_LOOP = [
  'hub: One real lesson | Y8 micro:bit step counter',
  'Plan, Connect',
  'Demonstrate, Activate',
  'Facilitate, Collaborate',
  '*Consolidate, Reflect',
].join('\n');

export const TEACHING_ROUTINE_FLOW = ['Plan', 'Connect', 'Demonstrate', 'Activate', 'Facilitate', 'Collaborate', 'Consolidate', '*Reflect -> Plan [next lesson]'].join('\n');

/** The two slides: the overview loop, then the stages in order. Each builds a step at a time. */
export function teachingRoutineSlides(st: LayoutStyle): Slide[] {
  return [
    diagramSlide(st, 'The Teaching Routine', 'loop', TEACHING_ROUTINE_LOOP, { size: 40 }),
    diagramSlide(st, 'The Teaching Routine, stage by stage', 'flowchart', TEACHING_ROUTINE_FLOW, { size: 46 }),
  ];
}
