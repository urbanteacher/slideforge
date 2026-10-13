// Draw (M11b): a transparent 2D canvas laid over the slide, never in the DeckPlayer's WebGL canvas, and the small bar of tools.
// The marks are ink.ts's; this paints them and turns the pointer into strokes. The canvas takes the pointer only while Draw is on
// (otherwise a click on the slide is still Next), and a click on it never reaches the stage underneath.

import { Eraser, Highlighter, PenLine, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { HIGHLIGHTER_ALPHA, INK_COLORS, type Ink, type InkTool, type Stroke } from './ink';

/** Paint strokes on a canvas of `w` by `h` pixels. A highlighter is one path drawn at one opacity, so a mark does not darken where it crosses itself. */
export function paintInk(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[], w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    ctx.save();
    ctx.globalAlpha = s.tool === 'highlighter' ? HIGHLIGHTER_ALPHA : 1;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = Math.max(1, s.width * w);
    if (s.tool === 'highlighter') ctx.lineCap = 'butt';
    const [first, ...rest] = s.points.map((p) => [p[0] * w, p[1] * h] as const);
    if (rest.length === 0) { ctx.beginPath(); ctx.arc(first[0], first[1], ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(first[0], first[1]); for (const p of rest) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
    ctx.restore();
  }
}

export function InkCanvas({ ink, on, w, h, version, onChange }: { ink: Ink; on: boolean; w: number; h: number; version: number; onChange: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current;
    if (!c || w <= 0 || h <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d');
    if (ctx) paintInk(ctx, ink.strokes, c.width, c.height);
  }, [ink, w, h, version]);
  const at = (e: React.PointerEvent): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  return (
    <canvas ref={ref} className={`ink-canvas${on ? ' on' : ''}`} style={{ width: w, height: h }} aria-hidden="true" data-testid="ink-canvas"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => { if (!on) return; e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; ink.setAspect(h / w); ink.begin(at(e)); onChange(); }}
      onPointerMove={(e) => { if (!drawing.current) return; ink.extend(at(e)); onChange(); }}
      onPointerUp={() => { if (!drawing.current) return; drawing.current = false; ink.end(); onChange(); }}
      onPointerCancel={() => { drawing.current = false; ink.end(); onChange(); }} />
  );
}

const TOOLS: { tool: InkTool; label: string; icon: typeof PenLine }[] = [
  { tool: 'pen', label: 'Pen', icon: PenLine }, { tool: 'highlighter', label: 'Highlighter', icon: Highlighter }, { tool: 'eraser', label: 'Eraser', icon: Eraser },
];

/** The tools: pen, highlighter, eraser, a few colours, undo (Z), clear (X), done (D or Esc). */
export function InkBar({ ink, version, onChange, onDone }: { ink: Ink; version: number; onChange: () => void; onDone: () => void }) {
  void version;
  return (
    <div className="ink-bar" role="toolbar" aria-label="Draw on the slide" data-testid="ink-bar">
      {TOOLS.map(({ tool, label, icon: Icon }) => (
        <button key={tool} onClick={() => { ink.tool = tool; onChange(); }} aria-pressed={ink.tool === tool} aria-label={label} title={label}><Icon size={16} /></button>
      ))}
      <span className="ink-sep" aria-hidden="true" />
      {INK_COLORS.map((c) => (
        <button key={c} className="ink-swatch" style={{ background: c }} onClick={() => { ink.color = c; if (ink.tool === 'eraser') ink.tool = 'pen'; onChange(); }}
          aria-pressed={ink.color === c && ink.tool !== 'eraser'} aria-label={`Colour ${c}`} title={c} />
      ))}
      <span className="ink-sep" aria-hidden="true" />
      <button onClick={() => { ink.undo(); onChange(); }} disabled={!ink.canUndo} aria-label="Undo the last mark (Z)" title="Undo the last mark (Z)"><Undo2 size={16} /></button>
      <button onClick={() => { ink.clear(); onChange(); }} disabled={ink.count === 0} aria-label="Clear the marks on this slide (X)" title="Clear the marks on this slide (X)"><Trash2 size={16} /></button>
      <button className="ink-done" onClick={onDone} aria-label="Done drawing (D or Esc)" title="Done drawing (D or Esc)">Done</button>
    </div>
  );
}
