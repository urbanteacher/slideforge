import type { InspectorTab } from '../store';

// The place as it is written in the address (#deck=…&slide=…&tab=…&side=status): read and written here, with no
// store, so it is tested on its own. shell/url.ts keeps the address in step with the editor.

export interface Place { deck?: string; slide?: string; tab?: InspectorTab; side?: 'status' }

const TABS: InspectorTab[] = ['design', 'picture', 'video', 'special', 'animate', 'interact', 'engage'];

export function parsePlace(hash: string): Place {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const tab = q.get('tab') as InspectorTab | null;
  return {
    ...(q.get('deck') ? { deck: q.get('deck')! } : {}),
    ...(q.get('slide') ? { slide: q.get('slide')! } : {}),
    ...(tab && TABS.includes(tab) ? { tab } : {}),
    ...(q.get('side') === 'status' ? { side: 'status' as const } : {}),
  };
}

export function formatPlace(p: Place): string {
  const q = new URLSearchParams();
  if (p.deck) q.set('deck', p.deck);
  if (p.slide) q.set('slide', p.slide);
  if (p.tab && p.tab !== 'design') q.set('tab', p.tab);
  if (p.side) q.set('side', p.side);
  return q.toString();
}
