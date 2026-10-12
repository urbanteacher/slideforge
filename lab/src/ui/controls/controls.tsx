import { ChevronDown, Info } from 'lucide-react';
import { PalettePopover } from './palette';
import { useRef, useState, type ReactNode } from 'react';

let gestureSeq = 0;
export const newGesture = () => `g${++gestureSeq}`;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '0');

/**
 * Designly-style scrub field: drag horizontally to scrub (Shift = fine), click to type.
 * One drag = one undo step (via the merge key).
 */
export function Scrub({ value, min, max, step = 0.01, decimals = 2, unit, onChange, disabled, prefix }: {
  value: number; min: number; max: number; step?: number; decimals?: number; unit?: string;
  onChange: (v: number, merge: string) => void; disabled?: boolean; prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; v: number; moved: boolean; g: string } | null>(null);
  const pct = clamp((value - min) / (max - min || 1), 0, 1);

  const snap = (v: number) => clamp(Math.round(v / step) * step, min, max);

  if (editing) {
    return (
      <input
        className="scrub-input"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseFloat(draft);
          if (Number.isFinite(n)) onChange(snap(n), newGesture());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditing(false);
          e.stopPropagation();
        }}
      />
    );
  }

  return (
    <div
      ref={ref}
      className={`scrub${disabled ? ' disabled' : ''}`}
      onPointerDown={(e) => {
        if (disabled) return;
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
        drag.current = { x: e.clientX, v: value, moved: false, g: newGesture() };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        if (!d.moved && Math.abs(dx) < 3) return;
        d.moved = true;
        const w = ref.current?.clientWidth ?? 120;
        const k = e.shiftKey ? 0.1 : 1;
        onChange(snap(d.v + (dx / w) * (max - min) * k), d.g);
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (d && !d.moved) { setDraft(fmt(value, decimals)); setEditing(true); }
      }}
    >
      <div className="scrub-fill" style={{ width: `${pct * 100}%` }} />
      <div className="scrub-tick" style={{ left: `${pct * 100}%` }} />
      <span className="scrub-val">
        {prefix && <em>{prefix}</em>}
        {fmt(value, decimals)}{unit ? <em>{unit}</em> : null}
      </span>
    </div>
  );
}

export function ColorField({ value, onChange, weight, onWeight }: {
  value: string; onChange: (v: string, merge: string) => void; weight?: number; onWeight?: (v: number, merge: string) => void;
}) {
  const g = useRef(newGesture());
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="color-field">
      {/* The swatch opens the theme's palette; its "More colours…" is the full picker. */}
      <span className="swatch-wrap">
        <button className="swatch" style={{ background: value }} title="Choose a colour" onClick={() => { g.current = newGesture(); setOpen((o) => !o); }} />
        {open && <PalettePopover value={value} onPick={(c) => onChange(c, g.current)} onClose={() => setOpen(false)} align="right" />}
      </span>
      <input
        className="hex"
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft && /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(draft.trim())) onChange(draft.trim().startsWith('#') ? draft.trim() : `#${draft.trim()}`, newGesture());
          setDraft(null);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
      />
      {onWeight && weight !== undefined && (
        <div className="weight"><Scrub value={weight} min={0} max={100} step={1} decimals={0} unit="%" onChange={onWeight} /></div>
      )}
    </div>
  );
}

export function Select<T extends string>({ value, options, onChange, disabled }: { value: T; options: { value: T; label: string }[] | readonly { value: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className={`select${disabled ? ' disabled' : ''}`}>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)} onKeyDown={(e) => e.stopPropagation()}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} />
    </div>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <button className={`toggle${value ? ' on' : ''}`} onClick={() => onChange(!value)} role="switch" aria-checked={value}><span /></button>;
}

export function Tip({ text }: { text?: string }) {
  if (!text) return null;
  return <span className="tip" data-tip={text}><Info size={12} /></span>;
}

export function Row({ label, info, children, wide }: { label: string; info?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`row${wide ? ' wide' : ''}`}>
      <div className="row-label" title={label}>{label}<Tip text={info} /></div>
      <div className="row-ctrl">{children}</div>
    </div>
  );
}

export function Section({ title, children, defaultOpen = true, right }: { title: string; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`section${open ? '' : ' closed'}`}>
      <header onClick={() => setOpen(!open)}>
        <ChevronDown size={12} className="chev" />
        <span>{title}</span>
        {right && <div className="section-right" onClick={(e) => e.stopPropagation()}>{right}</div>}
      </header>
      {open && <div className="section-body">{children}</div>}
    </section>
  );
}
