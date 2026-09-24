import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, GripVertical, Plus } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EASE, schedule } from '../engine/anim';
import { hitLayer } from '../engine/player';
import { autoHeight, fontString, textSize } from '../engine/raster';
import { ChartEditor, FieldsEditor, editsOnCanvas } from './CanvasEditors';
import { addAnother, canAddAnother, editIntent, groupOf, nextDirection, unitFrame } from './snap';
import { ALL_KINDS, kind } from '../engine/registry';
import { Renderer } from '../engine/renderer';
import { slideOf, useStore } from '../model/store';
import type { Box, Layer, Slide } from '../model/types';
import { newGesture } from './controls';
import { toggleFormat } from './format';
import { addMediaFile } from './insert';
import { moveInOrder, moveLine, moveUnit, siblingsOf, type Unit } from './order';
import { useSlideContextMenu } from './SlideMenu';
import { FEEDBACK } from './Engagement';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLES: { h: Handle; sx: number; sy: number; cur: string }[] = [
  { h: 'nw', sx: -1, sy: -1, cur: 'nwse-resize' }, { h: 'n', sx: 0, sy: -1, cur: 'ns-resize' }, { h: 'ne', sx: 1, sy: -1, cur: 'nesw-resize' },
  { h: 'e', sx: 1, sy: 0, cur: 'ew-resize' }, { h: 'se', sx: 1, sy: 1, cur: 'nwse-resize' }, { h: 's', sx: 0, sy: 1, cur: 'ns-resize' },
  { h: 'sw', sx: -1, sy: 1, cur: 'nesw-resize' }, { h: 'w', sx: -1, sy: 0, cur: 'ew-resize' },
];

type Drag =
  | { mode: 'move'; id: string; p0: [number, number]; box0: Box; group?: { id: string; x: number; y: number }[]; sib?: { units: Unit[]; index: number; dir: 'row' | 'column' | 'grid' } | null; g: string }
  | { mode: 'resize'; id: string; p0: [number, number]; box0: Box; size0: number; sx: number; sy: number; g: string }
  | { mode: 'rotate'; id: string; p0: [number, number]; box0: Box; g: string }
  | { mode: 'vec'; id: string; key: string; g: string };

/** The box around several layers, for a group's selection and for dragging it by its edges. */
function unionBox(ls: Layer[]): Box {
  const bs = ls.map((l) => l.box!).filter(Boolean);
  const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
  const x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, rot: 0 };
}

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
  const partId = useStore((s) => s.partId);
  const playToken = useStore((s) => s.playToken);
  const { selectLayer, updateLayer, set } = useStore.getState();

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
  const [slideMenu, openSlideMenu] = useSlideContextMenu();
  const [dropping, setDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zoom = zoomSetting === 'fit' ? fitZoom : zoomSetting;
  const cssW = deck.width * zoom, cssH = deck.height * zoom;
  const selected = slide.layers.find((l) => l.id === selectedId) ?? null;
  // A selected layer that belongs to a group selects the group, until a double-click goes inside.
  const selGroup = selected && partId !== selected.id ? groupOf(slide, selected) : [];
  const groupBox = selGroup.length > 1 ? unionBox(selGroup) : null;

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
      // The slide shape can change under a running renderer.
      if (r.deckW !== st.deck.width || r.deckH !== st.deck.height) { r.deckW = st.deck.width; r.deckH = st.deck.height; }
      r.setSize(canvas.clientWidth * dpr, canvas.clientHeight * dpr);
      const m = mouse.current;
      m.cur = [m.cur[0] + (m.target[0] - m.cur[0]) * 0.14, m.cur[1] + (m.target[1] - m.cur[1]) * 0.14];
      const time = clock();
      // The layer being edited is hidden under its editor — except a chart, whose bars stay in view.
      const editing = st.editingTextId ? slideOf(st).layers.find((l) => l.id === st.editingTextId) : undefined;
      const hidden = editing && editing.kind !== 'chart' ? new Set([editing.id]) : undefined;
      // Page numbers count the slides that will be shown, as Preview and the export do.
      const shown = st.deck.slides.filter((x) => !x.hidden);
      if (r.order.length !== shown.length || r.order.some((id, i) => id !== shown[i].id)) r.order = shown.map((x) => x.id);
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
    // Inside a group already (after a double-click), a click on a sibling stays inside: it picks
    // that part. Anywhere else a click picks up the whole group.
    const cur = partId ? slide.layers.find((l) => l.id === partId) : undefined;
    const inside = !!cur && groupOf(slide, cur).some((l) => l.id === hit.id);
    selectLayer(hit.id);
    if (inside) set({ partId: hit.id });
    const members = inside ? [hit] : groupOf(slide, hit);
    capture(overlayRef.current, e.pointerId);
    drag.current = { mode: 'move', id: hit.id, p0: [x, y], box0: unionBox(members), group: members.map((l) => ({ id: l.id, x: l.box!.x, y: l.box!.y })), sib: inside ? null : siblingsOf(slide, hit), g: newGesture() };
  };

  /** Pick an item up by its grip: the same as pressing on the item, but never inside a part. */
  const startGrip = (e: React.PointerEvent, l: Layer) => {
    e.stopPropagation();
    const [x, y] = toSlide(e);
    const members = groupOf(slide, l);
    set({ partId: null });
    capture(overlayRef.current, e.pointerId);
    drag.current = { mode: 'move', id: l.id, p0: [x, y], box0: unionBox(members), group: members.map((m) => ({ id: m.id, x: m.box!.x, y: m.box!.y })), sib: siblingsOf(slide, l), g: newGesture() };
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
      updateLayer(d.id, (l) => {
        const inBox = kind(l.kind).params.find((pd) => pd.key === d.key)?.inBox && l.box;
        const [u, v] = inBox ? [(x - l.box!.x) / l.box!.w, (y - l.box!.y) / l.box!.h] : [x / deck.width, y / deck.height];
        l.params[d.key] = [Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v))];
      }, d.g);
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
        const moving = new Set(d.group?.map((g) => g.id) ?? [d.id]);
        const others = slide.layers.filter((l) => l.box && !moving.has(l.id) && l.visible).map((l) => l.box!);
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
      if (d.group && d.group.length > 1) {
        const ddx = Math.round(nx - b0.x), ddy = Math.round(ny - b0.y), members = d.group;
        useStore.getState().mutate((dk) => {
          const s = dk.slides.find((x) => x.id === slide.id)!;
          for (const m of members) { const l = s.layers.find((x) => x.id === m.id); if (l?.box) { l.box.x = m.x + ddx; l.box.y = m.y + ddy; } }
        }, d.g);
      } else updateLayer(d.id, (l) => { l.box!.x = Math.round(nx); l.box!.y = Math.round(ny); }, d.g);
    } else if (d.mode === 'resize') {
      const layer = slide.layers.find((l) => l.id === d.id);
      if (!layer) return;
      const [lx, ly] = rot(dx, dy, -b0.rot);
      const sym = e.altKey ? 2 : 1;
      let w = b0.w + d.sx * lx * sym, h = b0.h + d.sy * ly * sym;
      const isText = autoHeight(layer); // height follows content; a corner drag scales the type
      const corner = d.sx !== 0 && d.sy !== 0;
      const keep = e.shiftKey || (corner && (layer.kind === 'image' || layer.kind === 'video' || isText));
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
    // Dropped on another of its set: the two change places, and their build order with them.
    const d = drag.current;
    if (d?.mode === 'move' && d.sib && dragging) {
      const st = useStore.getState();
      const live = slideOf(st);
      const moved = (d.group ?? [{ id: d.id }]).map((m) => live.layers.find((l) => l.id === m.id)).filter((l): l is Layer => !!l?.box);
      if (moved.length) {
        const c = unionBox(moved), cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const to = d.sib.units.findIndex((u, k) => k !== d.sib!.index && cx >= u.box.x && cx <= u.box.x + u.box.w && cy >= u.box.y && cy <= u.box.y + u.box.h);
        if (to >= 0) {
          const { units, index, dir } = d.sib, back = d.group ?? [];
          st.mutate((dk) => {
            const s = dk.slides.find((x) => x.id === live.id)!;
            for (const m of back) { const l = s.layers.find((x) => x.id === m.id); if (l?.box) { l.box.x = m.x; l.box.y = m.y; } }
            moveUnit(dk, live.id, units, dir, index, to);
          }, d.g);
        }
      }
    }
    drag.current = null;
    setDragging(false);
    setGuides({ v: [], h: [] });
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const [x, y] = toSlide(e);
    const hit = hitLayer(slide, x, y, (l) => !l.locked);
    if (!hit) return;
    // Double-click goes inside a group to the part under the pointer, and straight into its words.
    selectLayer(hit.id);
    set({ partId: hit.id });
    if (hit.kind === 'text' || editsOnCanvas(hit)) set({ editingTextId: hit.id });
  };

  // ── Drag & drop images and videos ──────────────────────────────────────
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropping(false);
    const files = [...e.dataTransfer.files].filter((f) => /^(image|video)\//.test(f.type));
    const [x, y] = toSlide(e);
    for (const f of files) await addMediaFile(f, x, y);
  };

  const k = selected ? kind(selected.kind) : null;
  // Effect origins sit on the slide; a picture's focus points sit on the picture (inBox).
  const vecDefs = selected && k ? k.params.filter((d) => d.type === 'vec2' && (!k.content || d.inBox) && (!d.when || d.when(selected.params))) : [];
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
      {slideMenu}
      <div className="stage-center" style={{ minWidth: '100%', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, width: cssW + 96, height: cssH + 96 }}>
        <div className="stage-inner" style={{ width: cssW, height: cssH }}>
          <div className="stage-label">{deck.title || 'Untitled'} <span>{deck.width} × {deck.height}</span></div>
          {slide.feedback && (() => { const f = FEEDBACK.find((x) => x.value === slide.feedback!.kind); return f ? (
            <button className="feedback-tag" title={`${f.hint} Runs beside the slide in a live SlideForge session — nothing is drawn on the slide.`} onClick={() => set({ inspectorTab: 'engage' })}>{f.icon}{f.label}<small>beside the slide, live</small></button>
          ) : null; })()}
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
            onContextMenu={(e) => {
              // On the slide's ground (not a box) a right-click is the slide's own menu.
              const [x, y] = toSlide(e);
              if (!hitLayer(slide, x, y, (l) => !l.locked)) openSlideMenu(e, slide.id);
            }}
          >
            {hovered?.box && !dragging && <BoxOutline box={partId && groupOf(slide, hovered).some((l) => l.id === partId) ? hovered.box : unionBox(groupOf(slide, hovered))} zoom={zoom} className="sel-box hover" />}
            {groupBox && !dragging && <div className="sel-box group" style={{ left: groupBox.x * zoom, top: groupBox.y * zoom, width: groupBox.w * zoom, height: groupBox.h * zoom }}><span className="group-tag">Group · double-click to edit a part</span></div>}
            {groupBox && dragging && <BoxOutline box={groupBox} zoom={zoom} className="sel-box group" />}
            {selected?.box && editingId !== selected.id && !groupBox && (
              <div
                className={`sel-box${selected.locked ? ' locked' : ''}`}
                style={{ left: selected.box.x * zoom, top: selected.box.y * zoom, width: selected.box.w * zoom, height: selected.box.h * zoom, transform: `rotate(${selected.box.rot}deg)` }}
              >
                {!selected.locked && HANDLES.filter((hd) => !(autoHeight(selected) && hd.sy !== 0 && hd.sx === 0)).map((hd) => (
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
            {selected?.box && !selected.locked && !dragging && editingId !== selected.id && partId !== selected.id && (() => {
              // Order: beside an item that is one of a set, a grip to drag it to another's place and
              // arrows for one place earlier or later. Alt + ↑ or ↓ does the same.
              const sib = siblingsOf(slide, selected);
              if (!sib) return null;
              const f = groupBox ?? selected.box;
              const across = sib.dir === 'row';
              const Prev = across ? ArrowLeft : ArrowUp, Next = across ? ArrowRight : ArrowDown;
              return (
                <div className="order-pill" style={{ left: f.x * zoom - 34, top: f.y * zoom }} onPointerDown={(e) => e.stopPropagation()}>
                  <button className="grip" title="Drag onto another to swap places" onPointerDown={(e) => startGrip(e, selected)}><GripVertical size={13} /></button>
                  <button title="Move earlier (Alt + ↑)" disabled={sib.index === 0} onClick={() => moveInOrder(selected.id, -1)}><Prev size={13} /></button>
                  <button title="Move later (Alt + ↓)" disabled={sib.index === sib.units.length - 1} onClick={() => moveInOrder(selected.id, 1)}><Next size={13} /></button>
                </div>
              );
            })()}
            {selected?.box && !selected.locked && !dragging && editingId !== selected.id && k?.content && canAddAnother(slide, selected) && (() => {
              // "Add another like this": beside a card in a row, under a point in a column.
              const f = unitFrame(slide, selected);
              const row = nextDirection(slide, selected) === 'row';
              const style = row
                ? { left: (f.x + f.w) * zoom + 14, top: (f.y + f.h / 2) * zoom }
                : { left: (f.x + f.w / 2) * zoom, top: (f.y + f.h) * zoom + 14 };
              return (
                <button className={`add-another ${row ? 'dir-row' : 'dir-col'}`} style={style} title={row ? 'Add another beside it' : 'Add another below it'}
                  onPointerDown={(e) => e.stopPropagation()} onClick={() => addAnother(selected.id)}>
                  <Plus size={14} />
                </button>
              );
            })()}
            {vecDefs.map((d) => {
              const follow = k!.mouseParam === d.key && selected!.interact.followMouse;
              const [vx, vy] = (selected!.params[d.key] as [number, number]) ?? [0.5, 0.5];
              return (
                <div
                  key={d.key}
                  className={`vec-handle${follow ? ' follow' : ''}`}
                  title={follow ? `${d.label} is following the mouse — turn off "Follow mouse" to place it` : `Drag to move ${d.label.toLowerCase()}`}
                  data-label={d.inBox ? d.label : undefined}
                  style={d.inBox && selected!.box ? { left: (selected!.box.x + vx * selected!.box.w) * zoom, top: (selected!.box.y + vy * selected!.box.h) * zoom } : { left: vx * cssW, top: vy * cssH }}
                  onPointerDown={(e) => { if (!follow) startVec(e, selected!, d.key); }}
                />
              );
            })}
            {guides.v.map((g, i) => <div key={`v${i}`} className="guide v" style={{ left: g * zoom }} />)}
            {guides.h.map((g, i) => <div key={`h${i}`} className="guide h" style={{ top: g * zoom }} />)}
            {editingId && selected?.id === editingId && selected.kind === 'text' && <TextEditor layer={selected} zoom={zoom} />}
            {editingId && selected?.id === editingId && selected.kind === 'chart' && <ChartEditor layer={selected} zoom={zoom} />}
            {editingId && selected?.id === editingId && selected.kind !== 'text' && selected.kind !== 'chart' && editsOnCanvas(selected) && <FieldsEditor layer={selected} zoom={zoom} />}
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
    // "+" on a list opens the editor on the new point's words, selected so typing replaces them.
    if (editIntent.range) { el.setSelectionRange(...editIntent.range); editIntent.range = null; }
    else el.select();
  }, []);
  useLayoutEffect(() => {
    const el = ref.current!;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  });
  const size = textSize(layer) * zoom; // the drawn size, which Fit may have brought down
  // A point in a list moves up or down with the caret on it: Alt + ↑ / ↓, or the pill beside the box.
  const shiftLine = (delta: -1 | 1) => {
    const el = ref.current!;
    const r = moveLine(el.value, el.selectionStart, delta);
    if (!r) return;
    updateLayer(layer.id, (l) => { l.params.text = r.text; }, g.current);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.caret, r.caret); });
  };
  const lines = String(p.text).includes('\n');
  return (
    <>
    {lines && (
      <div className="order-pill line" style={{ left: (b.x + b.w) * zoom + 8, top: b.y * zoom }} onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}>
        <button title="Move this line up (Alt + ↑)" onClick={() => shiftLine(-1)}><ArrowUp size={13} /></button>
        <button title="Move this line down (Alt + ↓)" onClick={() => shiftLine(1)}><ArrowDown size={13} /></button>
      </div>
    )}
    <textarea
      ref={ref}
      className="text-editor"
      value={String(p.text)}
      spellCheck={false}
      onChange={(e) => updateLayer(layer.id, (l) => { l.params.text = e.target.value; }, g.current)}
      onBlur={() => set({ editingTextId: null })}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); shiftLine(e.key === 'ArrowUp' ? -1 : 1); return; }
        if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
        const k = e.key.toLowerCase();
        if ((e.metaKey || e.ctrlKey) && (k === 'b' || k === 'i' || k === 'u')) { e.preventDefault(); toggleFormat(layer, k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline'); }
      }}
      style={{
        left: b.x * zoom, top: b.y * zoom, width: b.w * zoom, minHeight: b.h * zoom,
        font: fontString(p, size), color: String(p.color), lineHeight: String(p.lineHeight ?? 1),
        letterSpacing: `${Number(p.tracking ?? 0)}em`, textAlign: String(p.align ?? 'left') as 'left',
        textTransform: p.uppercase ? 'uppercase' : 'none', textDecoration: p.underline ? 'underline' : 'none', transform: `rotate(${b.rot}deg)`,
        textWrap: p.balance ? 'balance' : undefined,
      }}
    />
    </>
  );
}
