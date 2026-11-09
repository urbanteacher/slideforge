import { describeFacts, factsToCheck, sayNumbers } from '../core';
import { report } from '../shell';
import { useStore } from '../store';

// Before a show opens (BACKLOG CS-03): which shown slides still have a placeholder in their words or the author's
// "not yet checked" mark (core/facts.ts). It never stops the show, since the teacher may be in front of the class.
// The show says it in one line in its own toast (openStudioShow's `notice`); the Status tab keeps the full list,
// slide by slide, after the toast has gone.

/** The line the show opens with, or '' when nothing is left to check. Lists the slides in Status as it goes. */
export function factsNotice(): string {
  const list = factsToCheck(useStore.getState().deck);
  if (!list.length) return '';
  const ns = list.map((f) => f.number);
  const many = ns.length > 1 ? 's' : '';
  report({ id: 'facts-to-check', kind: 'note', state: 'info', title: `Facts to check on ${ns.length} slide${many}`, detail: describeFacts(list) });
  return `Facts to check on slide${many} ${sayNumbers(ns)}. The list is in Status.`;
}
