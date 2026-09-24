import { Plus, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { chartSpots, parseChartData } from '../engine/raster';
import { kind } from '../engine/registry';
import { useStore } from '../model/store';
import type { Layer } from '../model/types';
import { newGesture } from './controls';

// Words are edited where they are read: on the slide. Double-click a layer and its words become
// editable in place; the side panel keeps only how it looks. Plain text has its own editor in
// Stage.tsx; these cover the layers whose words live in several fields, and the chart.

/** The words a layer holds, in the order they appear on it. */
export const wordFields = (l: Layer) => kind(l.kind).params.filter((d) => d.type === 'text');
export const editsOnCanvas = (l: Layer) => l.kind === 'chart' || (l.kind !== 'text' && wordFields(l).length > 0);

function useClose(ref: React.RefObject<HTMLElement | null>) {
  const set = useStore((s) => s.set);
  useEffect(() => {
    const down = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) set({ editingTextId: null }); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') set({ editingTextId: null }); };
    addEventListener('pointerdown', down, true);
    addEventListener('keydown', key);
    return () => { removeEventListener('pointerdown', down, true); removeEventListener('keydown', key); };
  }, []);
}

/** Note, quote, quiz, activity: each of its words fields, stacked where the layer sits. */
export function FieldsEditor({ layer, zoom }: { layer: Layer; zoom: number }) {
  const update = useStore((s) => s.updateLayer);
  const ref = useRef<HTMLDivElement>(null);
  const g = useRef(newGesture());
  useClose(ref);
  const b = layer.box!;
  const p = layer.params;
  const fields = wordFields(layer);
  const size = Number(p.size ?? 40) * zoom;
  const ink = String(p.textColor ?? p.color ?? '#141414');
  const fill = String(p.fill ?? '#ffffff');
  useEffect(() => { ref.current?.querySelector('textarea')?.focus(); }, []);
  return (
    <div ref={ref} className="field-editor" style={{ left: b.x * zoom, top: b.y * zoom, width: b.w * zoom, minHeight: b.h * zoom, background: fill, color: ink }}
      onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      {fields.map((d, i) => {
        const main = i === (fields.length > 1 && /label/i.test(fields[0].key) ? 1 : 0);
        const px = Math.max(11, main ? size : size * 0.6);
        return (
          <textarea
            key={d.key}
            rows={Math.max(1, String(p[d.key] ?? '').split('\n').length)}
            placeholder={d.label}
            value={String(p[d.key] ?? '')}
            style={{ fontSize: px, fontWeight: main ? 600 : 500 }}
            onFocus={() => (g.current = newGesture())}
            onChange={(e) => { const v = e.target.value; update(layer.id, (l) => { l.params[d.key] = v; }, g.current); }}
            onKeyDown={(e) => e.stopPropagation()}
          />
        );
      })}
    </div>
  );
}

/** The chart edited on itself: each label under its bar, each value on top of it, + to add one. */
export function ChartEditor({ layer, zoom }: { layer: Layer; zoom: number }) {
  const update = useStore((s) => s.updateLayer);
  const ref = useRef<HTMLDivElement>(null);
  const g = useRef(newGesture());
  useClose(ref);
  const b = layer.box!;
  const { spots, add, size } = chartSpots(layer);
  const px = Math.max(11, size * zoom * 0.9);
  const write = (fn: (rows: { label: string; value: number | string }[]) => void, merge?: string) =>
    update(layer.id, (l) => {
      const rows: { label: string; value: number | string }[] = parseChartData(String(l.params.data ?? ''));
      fn(rows);
      l.params.data = rows.map((r) => `${r.label}, ${r.value}`).join('\n');
    }, merge);
  const at = (x: number, y: number, align: 'left' | 'center' | 'right') => ({
    left: (b.x + x) * zoom, top: (b.y + y) * zoom,
    transform: `translate(${align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0'}, -50%)`,
  });
  useEffect(() => { ref.current?.querySelector('input')?.focus(); }, []);
  return (
    <div ref={ref} className="chart-editor" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      {spots.map((s) => (
        <div key={`l${s.i}`} className="ce-label" style={{ ...at(s.lx, s.ly, s.la), width: Math.max(60, s.lw * zoom) }}>
          <input value={s.label} style={{ fontSize: px, textAlign: s.la }} aria-label={`Label ${s.i + 1}`}
            onFocus={() => (g.current = newGesture())} onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => { const v = e.target.value; write((r) => { r[s.i].label = v.replace(/,/g, ' '); }, g.current); }} />
          <button title="Remove this one" onClick={() => write((r) => { r.splice(s.i, 1); })}><X size={12} /></button>
        </div>
      ))}
      {spots.map((s) => (
        <input key={`v${s.i}`} className="ce-value" value={String(s.value)} inputMode="decimal" aria-label={`Value ${s.i + 1}`}
          style={{ ...at(s.vx, s.vy, s.va), fontSize: px, width: Math.max(48, px * 4) }}
          onFocus={(e) => { g.current = newGesture(); e.target.select(); }} onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => { const v = e.target.value.replace(/[^\d.-]/g, ''); write((r) => { r[s.i].value = v === '' ? 0 : v; }, g.current); }} />
      ))}
      <button className="ce-add" title="Add a bar" style={at(add[0], add[1], 'center')}
        onClick={() => write((r) => { r.push({ label: `Item ${r.length + 1}`, value: r.length ? Number(r[r.length - 1].value) || 10 : 10 }); })}>
        <Plus size={14} />
      </button>
    </div>
  );
}
