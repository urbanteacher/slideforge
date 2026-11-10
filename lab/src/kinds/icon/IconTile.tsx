// One icon in the picker, drawn by the same code that draws it on the slide.
import { useEffect, useRef } from 'react';
import type { Ctx } from '../../engine';
import { drawIcon } from './draw';

export function IconTile({ name, on, onPick }: { name: string; on: boolean; onPick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d') as Ctx | null;
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawIcon(ctx, name, 8, 8, 40, getComputedStyle(c).color || '#ddd', 2);
  }, [name]);
  return (
    <button className={`icon-tile${on ? ' on' : ''}`} title={name} aria-label={name} aria-pressed={on} onClick={onPick}>
      <canvas ref={ref} width={56} height={56} />
    </button>
  );
}
