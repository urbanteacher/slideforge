import type { LayoutStyle } from '../../layouts';
import { uid, type Slide } from '../../core';

// A Nodes format: one part of the Nodes method (docs/nodes-studio-plan.md) as something students do,
// designed in the lesson's own style the way the games and activities are (designs/engage/kit.ts). It
// has a starter, the slides it draws from its content, and what Browse says about it.

export interface NodesFormat<C = unknown> {
  id: string;
  label: string;
  /** The part of the Nodes method it teaches, for Browse. */
  part: string;
  aim: string;
  howTo: string[];
  /** What the phones do, in a few words (the wall's ON PHONES cue). */
  phones: string;
  starter: C;
  slides: (st: LayoutStyle, content: C) => Slide[];
}

/** Mark a format's slides as one Nodes challenge (slide.nodes), as a game marks slide.game. */
export function marked(format: string, slides: { slide: Slide; role: string }[], content: unknown): Slide[] {
  const id = uid();
  return slides.map(({ slide, role }) => { slide.nodes = { id, format, role, content: structuredClone(content) }; return slide; });
}
