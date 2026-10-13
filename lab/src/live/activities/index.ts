// The activities the studio's room runs (lab-engine-plan M10), and the desk that runs a routine. A lab slide made
// from one of SlideForge's activities carries which one and which page (slide.activity {key, page, settings}); the
// room reads that page as SlideForge made it (catalogue.ts) and runs it by its kind, the first in ACTIVITY_KINDS
// that runs it. A new kind is one file here and one line in the list. An activity page no kind runs, or one a kind
// says it cannot run yet (`unsupported`), keeps its lesson on SlideForge's own host (canHostInStudio).

import { slideExcerpt } from '@sf/deck/content.js';
import type { Slide } from '../../core';
import { cataloguePage } from './catalogue';
import { collectKind } from './collect';
import { momentKind } from './moment';
import { stagesKind } from './stages';
import type { ActivityKind, RoomActivity } from './types';
import { ownPage } from './words';

/** In the order they are tried: a routine first (it may also carry feedback), then feedback, then a plain slide. */
export const ACTIVITY_KINDS: ActivityKind[] = [stagesKind, collectKind, momentKind];

const kindOf = (page: SFActivitySlide) => ACTIVITY_KINDS.find((k) => k.runs(page)) ?? null;

type ActivitySlide = Pick<Slide, 'activity'> & Partial<Pick<Slide, 'layers'>>;

/** Why the studio's room cannot run this activity slide, or '' when it can (a game made from an activity is a game: its slides say so). */
export function activityBlocker(s: ActivitySlide): string {
  const a = s.activity;
  if (!a) return '';
  const c = cataloguePage(a.key, a.page);
  if (!c) return `is an activity (${a.key}) SlideForge's catalogue does not have`;
  if (c.game) return `is the activity ${c.title}, a game without its game`;
  const kind = kindOf(c.page);
  if (!kind) return `is the activity ${c.title}, which the studio's room does not run yet`;
  const why = kind.unsupported?.(c.page);
  return why ? `is the activity ${c.title}, which ${why}` : '';
}

/** The activity slide as the room runs it, or null (not an activity, or one the room does not run). Its kind is
 *  the catalogue page's; its words are the lab slide's own where it has them (words.ts), the catalogue's otherwise. */
export function activityOf(s: ActivitySlide): RoomActivity | null {
  const a = s.activity;
  if (!a || activityBlocker(s)) return null;
  const c = cataloguePage(a.key, a.page)!;
  const kind = kindOf(c.page)!;
  const own = ownPage(s, c.page, c.title);
  const r = kind.stages?.(own, a.settings);
  const page = r?.page ?? own;
  return { key: a.key, page: a.page, kind: kind.key, title: String(page.title || c.title), text: slideExcerpt(page, 0), stages: r?.stages ?? [], brief: r?.brief ?? '' };
}

export { ActivityDesk, type ActivityDeps } from './desk';
export { activityKeys, cataloguePage } from './catalogue';
export type { ActivityKind, ActivityView, CataloguePage, RoomActivity, RoomStage, StageFrame } from './types';
