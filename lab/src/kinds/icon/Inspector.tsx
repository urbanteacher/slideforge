// The icon's own inspector: every icon in the set, in its groups, to pick from, with a filter by name.
import { useState } from 'react';
import type { Layer } from '../../core';
import { Input, Section, useLayerParams } from '../../ui';
import { ICON_GROUPS } from './draw';
import { IconTile } from './IconTile';

export function IconPanel({ layer }: { layer: Layer }) {
  const set = useLayerParams(layer);
  const [find, setFind] = useState('');
  const now = String(layer.params.icon ?? '');
  const q = find.trim().toLowerCase();
  return (
    <>
      <div className="picture-head">Icons from Lucide, drawn as lines in the layer’s colour. Colour, weight and a disc are in Design.</div>
      <Section title="Icon">
        <Input value={find} onChange={setFind} placeholder="Find an icon (chart, clock, user…)" />
        {Object.entries(ICON_GROUPS).map(([group, names]) => {
          const shown = names.filter((n) => !q || n.includes(q));
          if (!shown.length) return null;
          return (
            <div key={group} className="icon-group">
              <div className="desc">{group}</div>
              <div className="icon-grid">
                {shown.map((n) => <IconTile key={n} name={n} on={n === now} onPick={() => set('icon', n)} />)}
              </div>
            </div>
          );
        })}
      </Section>
    </>
  );
}
