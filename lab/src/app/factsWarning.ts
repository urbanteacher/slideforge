import { describeFacts, factsToCheck, lessonNeeds, sayNumbers } from '../core';
import { report } from '../shell';
import { useStore } from '../store';

// Before a show opens (BACKLOG CS-03): which shown slides still have a placeholder in their words or the author's
// "not yet checked" mark (core/facts.ts). It never stops the show, since the teacher may be in front of the class.
// The show says it in one line in its own toast (openStudioShow's `notice`); the Status tab keeps the full list,
// slide by slide, after the toast has gone.

/** What the lesson needs that this show will not have (core/needs.ts, BACKLOG CS-13): a room for its games when the
 *  show opens without one, and the internet when this computer is offline. '' when every need is met. */
export function needsNotice(room: boolean): string {
  const needs = lessonNeeds(useStore.getState().deck);
  const lines: string[] = [];
  const s = (ns: number[]) => `slide${ns.length > 1 ? 's' : ''} ${sayNumbers(ns)}`;
  if (needs.room && !room) lines.push(`${s(needs.room)} ${needs.room.length > 1 ? 'are' : 'is'} for the room: use Host live to run ${needs.room.length > 1 ? 'them' : 'it'} with phones.`);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (needs.internet && offline) lines.push(`${s(needs.internet)} need${needs.internet.length > 1 ? '' : 's'} the internet, and this computer is offline.`);
  return lines.map((l) => l[0].toUpperCase() + l.slice(1)).join(' ');
}

/** The show's opening line: what the lesson needs and does not have (needsNotice), then the facts still to check. */
export function showNotice(room: boolean): string {
  return [needsNotice(room), factsNotice()].filter(Boolean).join(' ');
}

/** The line the show opens with, or '' when nothing is left to check. Lists the slides in Status as it goes. */
export function factsNotice(): string {
  const list = factsToCheck(useStore.getState().deck);
  if (!list.length) return '';
  const ns = list.map((f) => f.number);
  const many = ns.length > 1 ? 's' : '';
  report({ id: 'facts-to-check', kind: 'note', state: 'info', title: `Facts to check on ${ns.length} slide${many}`, detail: describeFacts(list) });
  return `Facts to check on slide${many} ${sayNumbers(ns)}. The list is in Status.`;
}
