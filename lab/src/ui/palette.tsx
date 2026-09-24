import { Pipette } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { paletteOf } from '../model/guide';
import { themeOf } from '../model/layouts';
import { useStore } from '../model/store';
import type { Deck } from '../model/types';

/*
 * The deck's colours, one click away wherever a colour is chosen: the theme's (or the palette's)
 * named colours first, its other colour sets, the colours used lately, and "More colours…" for the
 * full picker. Choosing from the palette keeps a deck in its own colours instead of a near miss.
 */
export interface Swatch { name: string; value: string }

const norm = (c: string) => c.trim().toLowerCase().slice(0, 7);

/** The deck's own colours: a style guide's palette, or the theme's ground, text, accents and grounds. */
export function themeSwatches(deck: Deck): { main: Swatch[]; more: Swatch[] } {
  const seen = new Set<string>();
  const keep = (list: Swatch[]) => list.filter((s) => /^#[0-9a-f]{3,8}$/i.test(s.value) && !seen.has(norm(s.value)) && seen.add(norm(s.value)));
  const g = deck.theme === 'guide' ? deck.styleGuide : undefined;
  if (g) {
    const main = keep(paletteOf(g));
    const more = keep(g.sets.filter((s) => s !== g.set).flatMap((s) => paletteOf(g, s).map((x) => ({ name: `${x.name} · set ${s}`, value: x.value }))));
    return { main, more: [...more, ...keep([{ name: 'white', value: '#ffffff' }, { name: 'black', value: '#000000' }])] };
  }
  const st = themeOf(deck);
  if (!st) return { main: keep([{ name: 'white', value: '#ffffff' }, { name: 'black', value: '#000000' }]), more: [] };
  const main = keep([
    { name: 'ground', value: st.ground }, { name: 'text', value: st.ink }, { name: 'quiet text', value: st.muted },
    { name: 'accent', value: st.accent }, ...(st.accent2 ? [{ name: 'second accent', value: st.accent2 }] : []), { name: 'panel', value: st.panel },
  ]);
  const more = keep([
    ...(st.grounds ?? []).flatMap((gr) => [{ name: `${gr.name} ground`, value: gr.ground }, { name: `${gr.name} text`, value: gr.ink }, { name: `${gr.name} accent`, value: gr.accent }]),
    { name: 'white', value: '#ffffff' }, { name: 'black', value: '#000000' },
  ]);
  return { main, more };
}

// The colours chosen lately, across fields and sessions.
const RECENT_KEY = 'sf-recent-colours';
function readRecent(): string[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; } }
export function rememberColour(c: string) {
  if (!/^#[0-9a-f]{6}$/i.test(c)) return;
  const list = [norm(c), ...readRecent().filter((x) => x !== norm(c))].slice(0, 8);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage full: not worth failing over */ }
}

/**
 * The palette itself, as a small panel under whatever opened it. `onPick` gets a colour; the panel
 * closes itself on a pick, on Escape and on a press outside it. Its buttons do not take focus, so
 * choosing a colour while typing on the canvas does not end the edit.
 */
export function PalettePopover({ value, onPick, onClose, align = 'left' }: { value: string; onPick: (c: string) => void; onClose: () => void; align?: 'left' | 'right' }) {
  const deck = useStore((s) => s.deck);
  const { main, more } = themeSwatches(deck);
  const recent = readRecent().filter((c) => !main.some((m) => norm(m.value) === c));
  const ref = useRef<HTMLDivElement>(null), picker = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Set up once: a press outside the panel, or Escape, closes it. (The press that opened it has
  // already happened by the time the listener goes on.)
  useEffect(() => {
    const out = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); } };
    const t = setTimeout(() => addEventListener('pointerdown', out), 0);
    addEventListener('keydown', esc, true);
    return () => { clearTimeout(t); removeEventListener('pointerdown', out); removeEventListener('keydown', esc, true); };
  }, []);
  const pick = (c: string) => { rememberColour(c); onPick(c); onClose(); };
  const chip = (s: Swatch, i: number) => (
    <button key={`${s.value}-${i}`} className={`pal-chip${norm(value) === norm(s.value) ? ' on' : ''}`} style={{ background: s.value }} title={`${s.name} · ${s.value}`}
      onPointerDown={(e) => e.preventDefault()} onClick={() => pick(s.value)} />
  );
  return (
    <div ref={ref} className={`pal-pop ${align}`} onPointerDown={(e) => e.stopPropagation()}>
      <div className="pal-label">{deck.theme === 'guide' && deck.styleGuide ? deck.styleGuide.name : 'Theme colours'}</div>
      <div className="pal-grid">{main.map(chip)}</div>
      {more.length > 0 && <><div className="pal-label">More from the theme</div><div className="pal-grid">{more.map(chip)}</div></>}
      {recent.length > 0 && <><div className="pal-label">Recent</div><div className="pal-grid">{recent.map((c, i) => chip({ name: 'recent', value: c }, i))}</div></>}
      <button className="pal-more" onPointerDown={(e) => e.preventDefault()} onClick={() => { const i = picker.current; if (!i) return; if (typeof i.showPicker === 'function') { try { i.showPicker(); return; } catch { /* fall through */ } } i.click(); }}><Pipette size={13} />More colours…</button>
      <input ref={picker} type="color" className="pal-native" value={norm(value) || '#000000'} onChange={(e) => onPick(e.target.value)} onBlur={(e) => rememberColour(e.target.value)} />
    </div>
  );
}

/** A colour button that opens the palette: the swatch shows the current colour. */
export function usePalette() {
  const [open, setOpen] = useState(false);
  return { open, toggle: () => setOpen((o) => !o), close: () => setOpen(false) };
}
