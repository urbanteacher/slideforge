// SlideForge's activities as the room reads them: each activity's slides as SF.Activities.makeSlides makes them
// (lab/src/assets/activities.json, written by tools/lab-activities.mjs), the same slides the lab's designs are
// built from (designs/engage). The room speaks of a page as classic does: its title, its excerpt, its rows.

import data from '../../assets/activities.json';
import type { CataloguePage } from './types';

interface Entry { key: string; title: string; slides?: SFActivitySlide[]; game?: unknown }
const ENTRIES = ((data as unknown as { activities: Entry[] }).activities ?? []);

/** The catalogue's page `page` of activity `key`, or null when there is none. */
export function cataloguePage(key: string, page = 0): CataloguePage | null {
  const a = ENTRIES.find((x) => x.key === key);
  if (!a) return null;
  const p = a.slides?.[page];
  return p ? { key, title: a.title, page: p, game: !!a.game } : a.game ? { key, title: a.title, page: { type: 'game' }, game: true } : null;
}

/** Every activity's key, in the catalogue's order. */
export const activityKeys = (): string[] => ENTRIES.map((a) => a.key);
