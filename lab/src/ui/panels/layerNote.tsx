import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { designCheck } from '../../designs';
import { slideOf, useStore } from '../../store';

/** The design rules the selected item breaks (designs/designCheck.ts), said above its tabs while it is edited: its text
 *  too small, too faint on what is behind it, shrunk to fit or running over its box. Nothing when it breaks none. */
export function LayerDesignNote({ layerId, name }: { layerId: string; name: string }) {
  const slide = useStore(slideOf);
  const height = useStore((s) => s.deck.height);
  const notes = useMemo(() => {
    const own = slide.layers.find((l) => l.id === layerId);
    if (!own) return [];
    return designCheck({ ...slide, layers: slide.layers.filter((l) => l.id === layerId || slide.layers.indexOf(l) < slide.layers.indexOf(own)) }, { height })
      .filter((t) => t.startsWith(`“${name || 'Text'}”`));
  }, [slide, height, layerId, name]);
  if (!notes.length) return null;
  return (
    <div className="layer-note" role="status">
      {notes.map((t) => <p key={t}><AlertTriangle size={13} />{t.replace(/^“[^”]*” /, 'This ')}</p>)}
    </div>
  );
}
