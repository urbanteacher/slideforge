import { Keyboard, Search, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SHORTCUTS, chordLabel, type ShortcutGroup } from '../keys';
import { openOverlay, rank, useOverlay } from './commands';
import { LAYOUT_KEYS, RECENT_COLOURS_KEY, storageWorks, usePrefs } from './prefs';

// The sheets over the editor, one at a time: the shortcut sheet (?), the command palette (⌘K) and the editor's
// settings (⌘,). Escape or a press outside closes each.

export function Overlays({ embedded }: { embedded: boolean }) {
  const open = useOverlay((s) => s.open);
  if (!open) return null;
  return open === 'keys' ? <ShortcutSheet embedded={embedded} /> : open === 'palette' ? <Palette /> : <SettingsSheet embedded={embedded} />;
}

function Sheet({ title, icon, wide, children, label }: { title: string; icon: ReactNode; wide?: boolean; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); openOverlay(null); } };
    addEventListener('keydown', esc, true);
    const back = document.activeElement as HTMLElement | null;
    // The search field when there is one (the palette), else the first button.
    (ref.current?.querySelector<HTMLElement>('input') ?? ref.current?.querySelector<HTMLElement>('button'))?.focus();
    return () => { removeEventListener('keydown', esc, true); back?.focus?.(); };
  }, []);
  return (
    <div className="sheet-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) openOverlay(null); }}>
      <div ref={ref} className={`sheet${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-head">{icon}<b>{title}</b><button className="tb-btn icon" aria-label="Close" title="Close (Esc)" onClick={() => openOverlay(null)}><X size={16} /></button></div>
        {children}
      </div>
    </div>
  );
}

/** The groups in two columns of about the same height, in order: the first half of the rows on the left. */
function halves<T extends { list: unknown[] }>(groups: T[]): [T[], T[]] {
  const total = groups.reduce((n, g) => n + g.list.length + 1.5, 0);
  let run = 0;
  const at = Math.max(1, groups.findIndex((g) => (run += g.list.length + 1.5) > total / 2));
  return [groups.slice(0, at), groups.slice(at)];
}

const ORDER: ShortcutGroup[] = ['Panels', 'Editing', 'Text', 'Slides', 'View', 'Show', 'Help', 'SlideForge'];

/** Every key, read from the registry, so the sheet can't fall behind the handlers. */
function ShortcutSheet({ embedded }: { embedded: boolean }) {
  const groups = ORDER.map((g) => ({ g, list: SHORTCUTS.filter((s) => s.group === g && (!s.shell || embedded)) })).filter((x) => x.list.length);
  return (
    <Sheet title="Keyboard shortcuts" label="Keyboard shortcuts" icon={<Keyboard size={16} />} wide>
      <div className="keys-grid">
        {halves(groups).map((half, i) => <div key={i} className="keys-col">{half.map(({ g, list }) => (
          <section key={g} className="keys-group">
            <h3>{g === 'SlideForge' ? 'SlideForge (its shell)' : g}</h3>
            {list.map((s) => (
              <div key={s.id} className="keys-row">
                <span>{s.label}{s.when && <small>{s.when}</small>}</span>
                <span className="keys-chords">{s.chords.filter((ch, i, a) => a.findIndex((x) => chordLabel(x) === chordLabel(ch)) === i).map((ch) => <kbd key={chordLabel(ch)}>{chordLabel(ch)}</kbd>)}</span>
              </div>
            ))}
          </section>
        ))}</div>)}
      </div>
      <p className="sheet-foot">Press <kbd>?</kbd> any time you aren't typing. Every button that has a key shows it in its tooltip{embedded ? '; ⌘K is SlideForge\'s palette, and it lists these too' : ''}.</p>
    </Sheet>
  );
}

function Palette() {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const list = useMemo(() => rank(q).slice(0, 40), [q]);
  const run = (i: number) => { const c = list[i]; if (!c) return; openOverlay(null); setTimeout(c.run, 0); };
  return (
    <Sheet title="Commands" label="Command palette" icon={<Search size={16} />}>
      <input className="palette-field" placeholder="Type a command, or a slide number…" aria-label="Search commands" value={q}
        onChange={(e) => { setQ(e.target.value); setAt(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setAt((a) => Math.min(list.length - 1, a + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setAt((a) => Math.max(0, a - 1)); }
          if (e.key === 'Enter') { e.preventDefault(); run(at); }
          e.stopPropagation();
        }} />
      <ul className="palette-list" role="listbox" aria-label="Commands">
        {list.map((c, i) => (
          <li key={c.id} role="option" aria-selected={i === at} className={i === at ? 'on' : ''} onMouseMove={() => setAt(i)} onMouseDown={(e) => { e.preventDefault(); run(i); }}>
            <span>{c.label}</span><small>{c.group}</small>{c.keys && <kbd>{c.keys}</kbd>}
          </li>
        ))}
        {!list.length && <li className="palette-none">Nothing matches “{q}”.</li>}
      </ul>
    </Sheet>
  );
}

function Toggle({ label, help, on, set }: { label: string; help: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="pref-row">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <span><b>{label}</b><small>{help}</small></span>
    </label>
  );
}

/** The editor's own preferences, in one place, apart from Deck settings (which belong to the lesson). */
function SettingsSheet({ embedded }: { embedded: boolean }) {
  const p = usePrefs();
  const storage = storageWorks();
  const [done, setDone] = useState('');
  const clear = (keys: string[], what: string) => {
    try { keys.forEach((k) => localStorage.removeItem(k)); setDone(`${what} — reload to see it.`); } catch (e) { setDone(`Couldn't clear ${what.toLowerCase()}: ${(e as Error).message}`); }
  };
  return (
    <Sheet title="Editor settings" label="Editor settings" icon={<Settings size={16} />}>
      <p className="pref-where">These are how the editor behaves for you, in this browser. They don't travel with the lesson. The lesson's own settings (slide shape, theme, numbers) are in the left panel, under Layouts.</p>
      {!storage && <p className="inline-warn" role="alert">Can't keep these: this browser is refusing site storage (a private window, or site data blocked). Changes apply until you reload.</p>}
      <div className="pref-group">
        <h3>Keys</h3>
        <Toggle label="Name the shortcut in tooltips" help="“Hide the inspector (⌘⌥2)”. The ? sheet lists every key either way." on={p.keyHints} set={(v) => p.setPref('keyHints', v)} />
        <button className="btn-soft" onClick={() => openOverlay('keys')}><Keyboard size={14} />See every shortcut</button>
      </div>
      <div className="pref-group">
        <h3>Status</h3>
        <Toggle label="Bring the Status tab forward when something fails" help="Opens the inspector if it is hidden, so a failed save or export can't pass unseen. Off: the Status tab's badge still counts it." on={p.surfaceFailures} set={(v) => p.setPref('surfaceFailures', v)} />
      </div>
      <div className="pref-group">
        <h3>Address</h3>
        <Toggle label="Keep my place in the address" help={embedded ? 'The slide and the inspector tab go in SlideForge\'s address, so a reload lands where you were.' : 'The deck, the slide and the inspector tab go in the address, so a reload or a link lands where you were. A link opens a deck only in the browser it was saved in.'} on={p.placeInUrl} set={(v) => p.setPref('placeInUrl', v)} />
      </div>
      {p.unsaved && <p className="inline-warn" role="alert">Can't save that setting. {p.unsaved}</p>}
      <div className="pref-group">
        <h3>Reset</h3>
        <div className="pref-buttons">
          <button className="btn-soft" disabled={!storage} onClick={() => clear(LAYOUT_KEYS, 'Panel sizes and folds reset')}>Reset panel sizes and folds</button>
          <button className="btn-soft" disabled={!storage} onClick={() => clear([RECENT_COLOURS_KEY], 'Recent colours forgotten')}>Forget recent colours</button>
        </div>
        {done && <p className="pref-where" role="status">{done}</p>}
      </div>
      <p className="sheet-foot">Kept in this browser's local storage{storage ? '' : ' (refused here)'}. Your lessons are kept separately, in this browser's database.</p>
    </Sheet>
  );
}
