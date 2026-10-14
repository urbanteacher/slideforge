import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/** The studio's side columns, each dragged wider or narrower by its inner edge (double-click puts it back). The widths are
 *  this browser's (localStorage). Until one is dragged it follows the window, giving way on a narrow one so the slide in the
 *  middle keeps its room (styles.css). */
const KEY = 'sf.lab.columns';
const DEFAULT = { left: 272, right: 320 };
type Widths = { left?: number; right?: number };
const LIMIT = { left: [200, 520], right: [260, 600] } as const;
type Side = keyof typeof DEFAULT;

/** Only a width the teacher dragged is kept; an unset one follows the window (styles.css). */
function saved(): Widths {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Widths;
    return { ...(v.left ? { left: clamp('left', v.left) } : {}), ...(v.right ? { right: clamp('right', v.right) } : {}) };
  } catch { return {}; }
}
const clamp = (side: Side, w: number) => Math.round(Math.min(LIMIT[side][1], Math.max(LIMIT[side][0], Number(w) || DEFAULT[side])));

export function useColumns() {
  const [w, setW] = useState<Widths>(saved);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* a private window keeps them for now */ } }, [w]);
  const style = { ...(w.left ? { '--left-w': `${w.left}px` } : {}), ...(w.right ? { '--right-w': `${w.right}px` } : {}) } as React.CSSProperties;
  return { w, style, set: (side: Side, px: number) => setW((o) => ({ ...o, [side]: clamp(side, px) })),
    reset: (side: Side) => setW((o) => { const n = { ...o }; delete n[side]; return n; }) };
}

/** A thin handle over a column's inner edge: a grid item of the app, laid over that column's cell. */
export function ColumnHandle({ side, cols }: { side: Side; cols: ReturnType<typeof useColumns> }) {
  const ref = useRef<HTMLDivElement>(null);
  const down = (e: ReactPointerEvent) => {
    e.preventDefault();
    const app = ref.current?.parentElement;
    if (!app) return;
    const box = app.getBoundingClientRect();
    ref.current!.setPointerCapture(e.pointerId);
    document.body.classList.add('col-dragging');
    const move = (ev: PointerEvent) => cols.set(side, side === 'left' ? ev.clientX - box.left : box.right - ev.clientX);
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); document.body.classList.remove('col-dragging'); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = (e.key === 'ArrowRight' ? 16 : -16) * (side === 'left' ? 1 : -1);
    const now = (ref.current?.parentElement?.querySelector(side === 'left' ? '.left' : '.right') as HTMLElement | null)?.offsetWidth ?? DEFAULT[side];
    cols.set(side, now + step);
  };
  return (
    <div ref={ref} className={`col-handle col-handle-${side}`} role="separator" aria-orientation="vertical" tabIndex={0}
      aria-label={side === 'left' ? 'Resize the left panel' : 'Resize the right panel'} title="Drag to resize · double-click to reset"
      onPointerDown={down} onDoubleClick={() => cols.reset(side)} onKeyDown={key} />
  );
}
