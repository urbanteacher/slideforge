import { kind } from '../engine/registry';
import { useStore } from '../model/store';
import type { Layer } from '../model/types';

/** Whether the layer's kind has this param, so a format control can act on it. */
export const has = (l: Layer | null, key: string) => !!l && kind(l.kind).params.some((d) => d.key === key);

export type FormatToggle = 'bold' | 'italic' | 'underline';

/** Bold, italic and underline, shared by the format bar and the ⌘B / ⌘I / ⌘U shortcuts. */
export function toggleFormat(l: Layer, what: FormatToggle) {
  const { updateLayer } = useStore.getState();
  if (what === 'bold' && has(l, 'weight')) updateLayer(l.id, (x) => { x.params.weight = Number(x.params.weight) >= 600 ? '400' : '700'; });
  if (what !== 'bold' && has(l, what)) updateLayer(l.id, (x) => { x.params[what] = !x.params[what]; });
}
