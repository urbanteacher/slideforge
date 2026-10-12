// Fields the bespoke inspectors share: a line, a box of text, chips, a picture tile, a list of items, and a
// layer's params set as one gesture (from ui/panels/special.tsx).
import type { Layer, ParamValue } from '../../core';
import { useStore } from '../../store';
import { newGesture } from './controls';
import { fileToDataUrl } from './files';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useRef, type ReactNode } from 'react';

const stop = (e: React.KeyboardEvent) => e.stopPropagation();
export function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="text-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={stop} />;
}
export function Area({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <textarea className="textarea" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={stop} />;
}
export function Chips<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; swatch?: [string, string] }[]; onChange: (v: T) => void }) {
  return (
    <div className="sp-chips">
      {options.map((o) => (
        <button key={o.value} className={`sp-chip${o.value === value ? ' on' : ''}`} onClick={() => onChange(o.value)}>
          {o.swatch && <i style={{ background: o.swatch[0], borderColor: o.swatch[1] }}><b style={{ background: o.swatch[1] }} /></i>}{o.label}
        </button>
      ))}
    </div>
  );
}
/** A picture tile: its preview, and a button to replace it from a file. */
export function PictureTile({ src, label, onChange }: { src: string; label?: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="sp-tile">
      <button className="sp-tile-pv" style={{ backgroundImage: src ? `url("${src}")` : undefined }} onClick={() => ref.current?.click()} title="Choose a picture">{!src && <span>Choose a picture</span>}</button>
      {label && <div className="sp-tile-label">{label}</div>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onChange(await fileToDataUrl(f)); }} />
    </div>
  );
}
/** A list whose rows can be reordered, removed and added to. */
export function List<T>({ items, render, onChange, make, max = 8, noun }: { items: T[]; render: (item: T, set: (v: T) => void, i: number) => ReactNode; onChange: (v: T[]) => void; make: () => T; max?: number; noun: string }) {
  const move = (i: number, d: number) => { const n = [...items]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onChange(n); };
  return (
    <div className="sp-list">
      {items.map((it, i) => (
        <div className="sp-row" key={i}>
          <div className="sp-row-head">
            <span className="sp-num">{i + 1}</span>
            <span className="sp-row-tools">
              <button disabled={i === 0} onClick={() => move(i, -1)} title="Earlier"><ArrowUp size={12} /></button>
              <button disabled={i === items.length - 1} onClick={() => move(i, 1)} title="Later"><ArrowDown size={12} /></button>
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} title={`Remove this ${noun}`}><Trash2 size={12} /></button>
            </span>
          </div>
          {render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}
        </div>
      ))}
      {items.length < max && <button className="btn-soft" onClick={() => onChange([...items, make()])}><Plus size={13} />Add a {noun}</button>}
    </div>
  );
}

export function useLayerParams(layer: Layer) {
  const update = useStore((s) => s.updateLayer);
  const gesture = useRef(newGesture());
  return (key: string, v: ParamValue, merge = false) => update(layer.id, (l) => { l.params[key] = v; }, merge ? gesture.current : undefined);
}
