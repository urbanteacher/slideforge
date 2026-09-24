import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EASE, schedule } from '../engine/anim';
import { hitLayer } from '../engine/player';
import { fontString } from '../engine/raster';
import { ALL_KINDS, kind } from '../engine/registry';
import { Renderer } from '../engine/renderer';
import { createLayer } from '../model/defaults';
import { slideOf, useStore } from '../model/store';
import type { Box, Layer, Slide } from '../model/types';
import { newGesture } from './controls';
import { fileToDataUrl } from './Inspector';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLES: { h: Handle; sx: number; sy: number; cur: string }[] = [
  { h: 'nw', sx: -1, sy: -1, cur: 'nwse-resize' }, { h: 'n', sx: 0, sy: -1, cur: 'ns-resize' }, { h: 'ne', sx: 1, sy: -1, cur: 'nesw-resize' },
  { h: 'e', sx: 1, sy: 0, cur: 'ew-resize' }, { h: 'se', sx: 1, sy: 1, cur: 'nwse-resize' }, { h: 's', sx: 0, sy: 1, cur: 'ns-resize' },
  { h: 'sw', sx: -1, sy: 1, cur: 'nesw-resize' }, { h: 'w', sx: -1, sy: 0, cur: 'ew-resize' },
];

type Drag =
  | { mode: 'move'; id: string; p0: [number, number]; box0: Box; g: string }
  | { mode: 'resize'; id: string; p0: [number, number]; box0: Box; size0: number; sx: number; sy: number; g: string }
  | { mode: 'rotate'; id: string; p0: [number, number]; box0: Box; g: string }
  | { mode: 'vec'; id: string; key: string; g: string };

const CLOCK0 = performance.now();
const clock = () => (performance.now() - CLOCK0) / 1000;

interface PlayState { start: number; clicks: number[]; end: number; from: Slide | null; trans: Slide['transition'] }

const capture = (el: HTMLElement | null, id: number) => { try { el?.setPointerCapture(id); } catch { /* synthetic or stale pointer */ } };

const rot = (x: number, y: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};

export function Stage() {
  const deck = useStore((s) => s.deck);
  const slide = useStore(slideOf);
  const selectedId = useStore((s) => s.selectedId);
  const zoomSetting = useStore((s) => s.zoom);
  const fitZoom = useStore((s) => s.fitZoom);
  const editingId = useStore((s) => s.editingTextId);
  const playToken = useStore((s) => s.playToken);
  const { selectLayer, updateLayer, set, insertLayer } = useStore.getState();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ target: [0.5, 0.5] as [number, number], cur: [0.5, 0.5] as [number, number] });
  const play = useRef<PlayState | null>(null);
  const drag = useRef<Drag | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [dragging, setDragging] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zoom = zoomSetting === 'fit' ? fitZoom : zoomSetting;
  const cssW = deck.width * zoom, cssH = deck.height * zoom;
  const selected = slide.layers.find((l) => l.id === selectedId) ?? null;

  // Fit-to-window zoom
  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => {
      const fz = Math.max(0.05, Math.min((el.clientWidth - 96) / deck.width, (el.clientHeight - 96) / deck.height));
      set({ fitZoom: fz });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [deck.width, deck.height]);

  // Ctrl/⌘ + wheel zoom (non-passive so we can stop the browser zooming)
  useEffect(() => {
    const el = wrapRef.current!;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const st = useStore.getState();
      const z = st.zoom === 'fit' ? st.fitZoom : st.zoom;
      set({ zoom: Math.max(0.1, Math.min(4, z * Math.exp(-e.deltaY * 0.01))) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Renderer + frame loop. Reads the store directly each frame (no React re-render per frame).
  // Survives WebGL context loss (GPU reset, too many contexts): waits, then rebuilds.
  useEffect(() => {
    const canvas = canvasRef.current!;
    let r: Renderer | null = null;
    let raf = 0;
    let frame = 0;
    const init = () => {
      try {
        r = new Renderer(canvas, deck.width, deck.height);
        r.warm(ALL_KINDS.map((k) => k.id));
        setError(null);
      } catch (e) {
        r = null;
        setError((e as Error).message);
      }
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const st = useStore.getState();
      if (st.presenting || !r || r.gl.isContextLost()) return;
      const s = slideOf(st);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      r.setSize(canvas.clientWidth * dpr, canvas.clientHeight * dpr);
      const m = mouse.current;
      m.cur = [m.cur[0] + (m.target[0] - m.cur[0]) * 0.14, m.cur[1] + (m.target[1] - m.cur[1]) * 0.14];
      const time = clock();
      const hidden = st.editingTextId ? new Set([st.editingTextId]) : undefined;
      const p = play.current;
      if (p) {
        const t = time - p.start;
        if (t > p.end) {
          play.current = null;
          setPlaying(false);
        } else {
          const opts = { time, mouse: m.cur, t, clicks: p.clicks, hidden };
          if (p.from && t < p.trans.duration && p.trans.type !== 'none') {
            r.drawTransition(p.from, { time, mouse: m.cur, t: Infinity, clicks: [] }, s, opts, p.trans.type, EASE.cubicInOut(Math.max(0, t) / p.trans.duration), 1);
          } else {
            r.drawSlide(s, opts, null);
          }
          return;
        }
      }
      r.drawSlide(s, { time, mouse: m.cur, t: Infinity, clicks: [], hidden }, null);
      if (++frame % 240 === 0) r.prune(new Set(st.deck.slides.flatMap((x) => x.layers.map((l) => l.id))));
    };
    const onLost = (e: Event) => { e.preventDefault(); r = null; };
    const onRestored = () => init();
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    init();
    loop();
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      (r as Renderer | null)?.dispose(false);
    };
  }, []);

  // "Play" — run the slide's timeline with builds auto-clicked, preceded by its transition in.
  useEffect(() => {
    if (!playToken) return;
    const st = useStore.getState();
    const s = slideOf(st);
    const idx = st.deck.slides.findIndex((x) => x.id === s.id);
    const from = idx > 0 && !st.selectedId ? st.deck.slides[idx - 1] : null;
    const lead = from && s.transition.type !== 'none' ? s.transition.duration : 0;
    const sch = schedule(s, []);
    const clicks: number[] = [];
    let acc = sch.stepEnds[0] + 0.6;
    for (let i = 1; i <= sch.steps; i++) { clicks.push(acc); acc += (sch.stepEnds[i] ?? 0) + 0.6; }
    play.current = { start: clock(), clicks, end: acc + 0.8 + lead, from, trans: s.transition };
    setPlaying(true);
  }, [playToken]);

  // Stop playing when the slide changes.
  useEffect(() => { play.current = null; setPlaying(false); }, [slide.id]);

  const toSlide = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = overlayRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / zoom, (e.clientY - r.top) / zoom];
  };

  const updateMouse = (e: { clientX: number; clientY: number }) => {
    const [x, y] = toSlide(e);
    mouse.current.target = [x / deck.width, y / deck.height];
    return [x, y] as [number, number];
  };

  // ── Pointer: select / move / resize / rotate ────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const [x, y] = updateMouse(e);
    if (editingId) { set({ editingTextId: null }); }
    const hit = hitLayer(slide, x, y, (l) => !l.locked);
    if (!hit) { selectLayer(null); return; }
    selectLayer(hit.id);
    capture(overlayRef.current, e.pointerId);
    drag.current = { mode: 'move', id: hit.id, p0: [x, y], box0: { ...hit.box! }, g: newGesture() };
  };

  const startHandle = (e: React.PointerEvent, l: Layer, sx: number, sy: number) => {
    e.stopPropagation();
    capture(overlayRef.current, e.pointerId);
    drag.current = { mode: 'resize', id: l.id, p0: toSlide(e), box0: { ...l.box! }, size0: Number(l.params.size ?? 0), sx, sy, g: newGesture() };
    setDragging(true);
  };

  const startRotate = (e: React.PointerEvent, l: Layer) => {
    e.stopPropagation();
    capture(overlayRef.current, e.pointerId);
    drag.current = { mode: 'rotate', id: l.id, p0: toSlide(e), box0: { ...l.box! }, g: newGesture() };
    setDragging(true);
  };

  const startVec = (e: React.PointerEvent, l: Layer, key: string) => {
    e.stopPropagation();
    capture(overlayRef.current, e.pointerId);
    drag.current = { mode: 'vec', id: l.id, key, g: newGesture() };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const [x, y] = updateMouse(e);
    const d = drag.current;
    if (!d) {
      const h = hitLayer(slide, x, y, (l) => !l.locked);
      if ((h?.id ?? null) !== hoverId) setHoverId(h?.id ?? null);
      return;
    }
    if (d.mode === 'vec') {
      updateLayer(d.id, (l) => { l.params[d.key] = [Math.max(0, Math.min(1, x / deck.width)), Math.max(0, Math.min(1, y / deck.height))]; }, d.g);
      return;
    }
    const b0 = d.box0;
    let dx = x - d.p0[0], dy = y - d.p0[1];
    if (d.mode === 'move') {
      if (!dragging && Math.hypot(dx, dy) * zoom < 3) return;
      if (!dragging) setDragging(true);
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      let nx = b0.x + dx, ny = b0.y + dy;
      const gv: number[] = [], gh: number[] = [];
      if (!(e.metaKey || e.ctrlKey)) {
        const thr = 6 / zoom;
        const others = slide.layers.filter((l) => l.box && l.id !== d.id && l.visible).map((l) => l.box!);
        const xs = [0, deck.width / 2, deck.width, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
        const ys = [0, deck.height / 2, deck.height, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
        const snap = (pos: number, size: number, lines: number[], out: number[]) => {
          let best = thr, delta = 0, line: number | null = null;
          for (const edge of [pos, pos + size / 2, pos + size]) for (const s of lines) {
            const dd = s - edge;
            if (Math.abs(dd) < best) { best = Math.abs(dd); delta = dd; line = s; }
          }
          if (line !== null) out.push(line);
          return pos + delta;
        };
        nx = snap(nx, b0.w, xs, gv);
        ny = snap(ny, b0.h, ys, gh);
      }
      setGuides({ v: gv, h: gh });
      updateLayer(d.id, (l) => { l.box!.x = Math.round(nx); l.box!.y = Math.round(ny); }, d.g);
    } else if (d.mode === 'resize') {
      const layer = slide.layers.find((l) => l.id === d.id);
      if (!layer) return;
      const [lx, ly] = rot(dx, dy, -b0.rot);
      const sym = e.altKey ? 2 : 1;
      let w = b0.w + d.sx * lx * sym, h = b0.h + d.sy * ly * sym;
      const isText = layer.kind === 'text';
      const corner = d.sx !== 0 && d.sy !== 0;
      const keep = e.shiftKey || (corner && (layer.kind === 'image' || isText));
      if (keep && corner) {
        const k = Math.max(w / b0.w, h / b0.h);
        w = b0.w * k; h = b0.h * k;
      }
      w = Math.max(12, w); h = Math.max(12, h);
      const [cdx, cdy] = e.altKey ? [0, 0] : rot((d.sx * (w - b0.w)) / 2, (d.sy * (h - b0.h)) / 2, b0.rot);
      const cx = b0.x + b0.w / 2 + cdx, cy = b0.y + b0.h / 2 + cdy;
      updateLayer(d.id, (l) => {
        l.box!.w = Math.round(w);
        if (isText) {
          if (corner) l.params.size = Math.max(6, Math.round(d.size0 * (w / b0.w)));
        } else l.box!.h = Math.round(h);
        l.box!.x = Math.round(cx - w / 2);
        l.box!.y = Math.round(cy - (isText ? l.box!.h : h) / 2);
        if (isText && !corner) l.box!.y = b0.y;
      }, d.g);
    } else if (d.mode === 'rotate') {
      const cx = b0.x + b0.w / 2, cy = b0.y + b0.h / 2;
      const a0 = Math.atan2(d.p0[1] - cy, d.p0[0] - cx), a1 = Math.atan2(y - cy, x - cx);
      let r = b0.rot + ((a1 - a0) * 180) / Math.PI;
      r = ((r + 540) % 360) - 180;
      if (e.shiftKey) r = Math.round(r / 15) * 15;
      updateLayer(d.id, (l) => { l.box!.rot = Math.round(r * 10) / 10; }, d.g);
    }
  };

  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
    setGuides({ v: [], h: [] });
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const [x, y] = toSlide(e);
    const hit = hitLayer(slide, x, y, (l) => !l.locked);
    if (hit?.kind === 'text') { selectLayer(hit.id); set({ editingTextId: hit.id }); }
  };

  // ── Drag & drop images ──────────────────────────────────────────────────
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropping(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    const [x, y] = toSlide(e);
    for (const f of files) await addImageFile(f, x, y);
  };

  const addImageFile = async (f: File, x: number, y: number) => {
    const src = await fileToDataUrl(f);
    const img = new Image();
    img.src = src;
    await img.decode().catch(() => undefined);
    const iw = img.naturalWidth || 800, ih = img.naturalHeight || 600;
    const k = Math.min(1000 / iw, 700 / ih, 1.5);
    const w = Math.round(iw * k), h = Math.round(ih * k);
    insertLayer(createLayer('image', { name: f.name.replace(/\.[^.]+$/, '').slice(0, 28) || 'Image', params: { src, fit: 'contain' }, box: { x: Math.round(x - w / 2), y: Math.round(y - h / 2), w, h }, anim: { type: 'fade' } }));
  };

  // expose for paste handler in App
  useEffect(() => {
    (window as unknown as { __sfAddImage?: (f: File) => void }).__sfAddImage = (f: File) => addImageFile(f, deck.width / 2, deck.height / 2);
  });

  const k = selected ? kind(selected.kind) : null;
  const vecDefs = selected && k && !k.content ? k.params.filter((d) => d.type === 'vec2' && (!d.when || d.when(selected.params))) : [];
  const hovered = hoverId && hoverId !== selectedId ? slide.layers.find((l) => l.id === hoverId) : null;

  return (
    <div
      ref={wrapRef}
      className={`stage-wrap${dropping ? ' drop' : ''}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDropping(true); } }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
      onPointerDown={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('stage-center')) selectLayer(null); }}
    >
      {playing && <div className="play-pill"><i />Playing slide timeline</div>}
      <div className="stage-center" style={{ minWidth: '100%', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, width: cssW + 96, height: cssH + 96 }}>
        <div className="stage-inner" style={{ width: cssW, height: cssH }}>
          <div className="stage-label">{deck.title || 'Untitled'} <span>{deck.width} × {deck.height}</span></div>
          <canvas ref={canvasRef} className="stage-canvas" />
          {error && <div className="stage-empty">{error}</div>}
          <div
            ref={overlayRef}
            className="overlay"
            style={{ cursor: hoverId ? 'move' : 'default' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onDoubleClick}
          >
            {hovered?.box && !dragging && <BoxOutline box={hovered.box} zoom={zoom} className="sel-box hover" />}
            {selected?.box && editingId !== selected.id && (
              <div
                className={`sel-box${selected.locked ? ' locked' : ''}`}
                style={{ left: selected.box.x * zoom, top: selected.box.y * zoom, width: selected.box.w * zoom, height: selected.box.h * zoom, transform: `rotate(${selected.box.rot}deg)` }}
              >
                {!selected.locked && HANDLES.filter((hd) => !(selected.kind === 'text' && hd.sy !== 0 && hd.sx === 0)).map((hd) => (
                  <div key={hd.h} className="handle" style={{ left: `${(hd.sx + 1) * 50}%`, top: `${(hd.sy + 1) * 50}%`, cursor: hd.cur }} onPointerDown={(e) => startHandle(e, selected, hd.sx, hd.sy)} />
                ))}
                {!selected.locked && (
                  <>
                    <div className="rot-stem" />
                    <div className="handle rot" style={{ left: '50%', top: -28 }} onPointerDown={(e) => startRotate(e, selected)} />
                  </>
                )}
                {dragging && <div className="size-tag" style={{ transform: `translateX(-50%) rotate(${-selected.box.rot}deg)` }}>{Math.round(selected.box.w)} × {Math.round(selected.box.h)}{selected.box.rot ? ` · ${Math.round(selected.box.rot)}°` : ''}</div>}
              </div>
            )}
            {vecDefs.map((d) => {
              const follow = k!.mouseParam === d.key && selected!.interact.followMouse;
              const [vx, vy] = (selected!.params[d.key] as [number, number]) ?? [0.5, 0.5];
              return (
                <div
                  key={d.key}
                  className={`vec-handle${follow ? ' follow' : ''}`}
                  title={follow ? `${d.label} is following the mouse — turn off "Follow mouse" to place it` : `Drag to move ${d.label.toLowerCase()}`}
                  style={{ left: vx * cssW, top: vy * cssH }}
                  onPointerDown={(e) => { if (!follow) startVec(e, selected!, d.key); }}
                />
              );
            })}
            {guides.v.map((g, i) => <div key={`v${i}`} className="guide v" style={{ left: g * zoom }} />)}
            {guides.h.map((g, i) => <div key={`h${i}`} className="guide h" style={{ top: g * zoom }} />)}
            {editingId && selected?.id === editingId && selected.kind === 'text' && <TextEditor layer={selected} zoom={zoom} />}
          </div>
        </div>
      </div>
    </div>
  );
}


function BoxOutline({ box, zoom, className }: { box: Box; zoom: number; className: string }) {
  return <div className={className} style={{ left: box.x * zoom, top: box.y * zoom, width: box.w * zoom, height: box.h * zoom, transform: `rotate(${box.rot}deg)` }} />;
}

function TextEditor({ layer, zoom }: { layer: Layer; zoom: number }) {
  const updateLayer = useStore((s) => s.updateLayer);
  const set = useStore((s) => s.set);
  const ref = useRef<HTMLTextAreaElement>(null);
  const g = useRef(newGesture());
  const p = layer.params;
  const b = layer.box!;
  useEffect(() => {
    const el = ref.current!;
    el.focus();
    el.select();
  }, []);
  useLayoutEffect(() => {
    const el = ref.current!;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  });
  const size = Number(p.size) * zoom;
  return (
    <textarea
      ref={ref}
      className="text-editor"
      value={String(p.text)}
      spellCheck={false}
      onChange={(e) => updateLayer(layer.id, (l) => { l.params.text = e.target.value; }, g.current)}
      onBlur={() => set({ editingTextId: null })}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur(); }}
      style={{
        left: b.x * zoom, top: b.y * zoom, width: b.w * zoom, minHeight: b.h * zoom,
        font: fontString(p, size), color: String(p.color), lineHeight: String(p.lineHeight ?? 1),
        letterSpacing: `${Number(p.tracking ?? 0)}em`, textAlign: String(p.align ?? 'left') as 'left',
        textTransform: p.uppercase ? 'uppercase' : 'none', transform: `rotate(${b.rot}deg)`,
      }}
    />
  );
}
