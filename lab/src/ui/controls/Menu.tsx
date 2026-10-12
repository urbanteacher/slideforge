import { useEffect, useRef, useState, type ReactNode } from 'react';

// A button with a menu under it (or above it: `.canvas-bar .menu` opens upward), closed by a press
// anywhere else. The File menu (TopBar) and the Add menu (AddMenu) share it.
function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, [open]);
  return ref;
}

export function Menu({ trigger, children, right, className = '' }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; right?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {trigger(open, () => setOpen(!open))}
      {open && <div className={`menu${right ? ' right' : ''}${className ? ' ' + className : ''}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

