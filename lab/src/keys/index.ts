// keys/: the editor's one list of shortcuts. The key handler (app/App.tsx), the tooltips and aria-keyshortcuts on the
// buttons, the ? sheet and the ⌘K palette all read it, so a key is written down once and every place that names it
// agrees. Pure: no React, no store; anything can import it.

export type ShortcutGroup = 'Panels' | 'Slides' | 'Editing' | 'Text' | 'View' | 'Show' | 'Help' | 'SlideForge';

/** One way to press a shortcut. `mod` is ⌘ on a Mac and Ctrl elsewhere. `mod` and `alt` must match exactly; `shift`
 *  only when it is given, so ? (Shift+/ on most keyboards) and the arrows' Shift-for-10px still count. `code` is for
 *  keys whose character ⌥ changes on a Mac (⌥1 types ¡), so ⌘⌥1 is matched by the key, not the letter. */
export interface Chord { key?: string; code?: string; mod?: boolean; alt?: boolean; shift?: boolean }

export interface Shortcut {
  id: string;
  label: string;
  group: ShortcutGroup;
  chords: Chord[];
  /** When it applies, in words, for the sheet ("a layer selected"). */
  when?: string;
  /** Handled by SlideForge's shell, not the lab: listed on the sheet only inside SlideForge. */
  shell?: boolean;
}

const c = (key: string, more: Omit<Chord, 'key'> = {}): Chord => ({ key, ...more });

export const SHORTCUTS: Shortcut[] = [
  // Panels: one fixed shell, list left, stage centre, inspector right. ⌘B is Bold, so the sides take ⌘⌥1 and ⌘⌥2.
  { id: 'panel.left', label: 'Show or hide the left panel', group: 'Panels', chords: [{ code: 'Digit1', mod: true, alt: true }] },
  { id: 'panel.right', label: 'Show or hide the inspector', group: 'Panels', chords: [{ code: 'Digit2', mod: true, alt: true }, c('\\', { mod: true })] },
  { id: 'panel.status', label: 'Open the Status tab', group: 'Panels', chords: [{ code: 'Digit3', mod: true, alt: true }] },
  { id: 'app.settings', label: 'Editor settings', group: 'Panels', chords: [{ code: 'KeyP', mod: true, alt: true }] },
  { id: 'app.palette', label: 'Command palette', group: 'Help', chords: [c('k', { mod: true })] },
  { id: 'app.keys', label: 'Keyboard shortcuts', group: 'Help', chords: [c('?')] },

  { id: 'edit.undo', label: 'Undo', group: 'Editing', chords: [c('z', { mod: true, shift: false })] },
  { id: 'edit.redo', label: 'Redo', group: 'Editing', chords: [c('z', { mod: true, shift: true }), c('y', { mod: true })] },
  { id: 'edit.duplicate', label: 'Duplicate', group: 'Editing', chords: [c('d', { mod: true })], when: 'a layer selected' },
  { id: 'edit.copy', label: 'Copy', group: 'Editing', chords: [c('c', { mod: true })], when: 'a layer, or the slide when nothing is selected' },
  { id: 'edit.paste', label: 'Paste', group: 'Editing', chords: [c('v', { mod: true, shift: false })], when: 'a copied layer or slide; pictures paste too' },
  { id: 'edit.delete', label: 'Delete', group: 'Editing', chords: [c('Backspace'), c('Delete')], when: 'a layer selected' },
  { id: 'edit.deselect', label: 'Deselect, or step out of a group', group: 'Editing', chords: [c('Escape')] },
  { id: 'edit.nudge', label: 'Nudge (Shift: 10px)', group: 'Editing', chords: [c('ArrowUp'), c('ArrowDown'), c('ArrowLeft'), c('ArrowRight')], when: 'a layer selected' },
  { id: 'edit.order', label: 'Move earlier or later among its kind', group: 'Editing', chords: [c('ArrowUp', { alt: true }), c('ArrowDown', { alt: true })], when: 'a layer selected' },
  { id: 'edit.addText', label: 'New text', group: 'Editing', chords: [c('t')] },
  { id: 'edit.effects', label: 'Backgrounds & effects', group: 'Editing', chords: [c('a')] },

  { id: 'text.edit', label: 'Edit the selected text', group: 'Text', chords: [c('Enter')], when: 'a text layer selected' },
  { id: 'text.bold', label: 'Bold', group: 'Text', chords: [c('b', { mod: true })], when: 'text selected' },
  { id: 'text.italic', label: 'Italic', group: 'Text', chords: [c('i', { mod: true })], when: 'text selected' },
  { id: 'text.underline', label: 'Underline', group: 'Text', chords: [c('u', { mod: true })], when: 'text selected' },

  { id: 'slide.next', label: 'Next slide', group: 'Slides', chords: [c('ArrowRight'), c('PageDown')], when: 'nothing selected' },
  { id: 'slide.prev', label: 'Previous slide', group: 'Slides', chords: [c('ArrowLeft'), c('PageUp')], when: 'nothing selected' },
  { id: 'slide.sorter', label: 'Block view (every slide at once)', group: 'Slides', chords: [c('g', { mod: true })] },

  { id: 'view.zoomIn', label: 'Zoom in', group: 'View', chords: [c('=', { mod: true, alt: true }), { code: 'Equal', mod: true, alt: true }] },
  { id: 'view.zoomOut', label: 'Zoom out', group: 'View', chords: [c('-', { mod: true, alt: true }), { code: 'Minus', mod: true, alt: true }] },
  { id: 'view.zoomFit', label: 'Fit the slide to the window', group: 'View', chords: [{ code: 'Digit0', mod: true, alt: true }] },

  { id: 'show.present', label: 'Present', group: 'Show', chords: [c('Enter', { mod: true })] },

  { id: 'shell.save', label: 'Save to the Library', group: 'SlideForge', chords: [c('s', { mod: true })], shell: true },
  { id: 'shell.studio', label: 'Switch studio', group: 'SlideForge', chords: [c('e', { mod: true })], shell: true },
];

const BY_ID = new Map(SHORTCUTS.map((s) => [s.id, s]));
export const shortcut = (id: string): Shortcut | undefined => BY_ID.get(id);

export const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad)/.test(navigator.platform || navigator.userAgent || '');

function chordMatches(ch: Chord, e: KeyboardEvent): boolean {
  if (!!ch.mod !== (e.metaKey || e.ctrlKey)) return false;
  if (!!ch.alt !== e.altKey) return false;
  if (ch.shift !== undefined && ch.shift !== e.shiftKey) return false;
  if (ch.code) return e.code === ch.code;
  return !!ch.key && (ch.key.length === 1 ? e.key.toLowerCase() === ch.key.toLowerCase() : e.key === ch.key);
}

/** Whether a key event is one of this shortcut's chords. */
export const is = (id: string, e: KeyboardEvent): boolean => !!BY_ID.get(id)?.chords.some((ch) => chordMatches(ch, e));

const NAMES: Record<string, [mac: string, other: string]> = {
  Enter: ['↵', 'Enter'], Escape: ['Esc', 'Esc'], Backspace: ['⌫', 'Backspace'], Delete: ['⌦', 'Delete'],
  '−': ['−', '−'], ArrowUp: ['↑', '↑'], ArrowDown: ['↓', '↓'], ArrowLeft: ['←', '←'], ArrowRight: ['→', '→'], PageUp: ['PgUp', 'PgUp'], PageDown: ['PgDn', 'PgDn'],
};
const keyText = (ch: Chord) => {
  const k = ch.code ? ch.code.replace(/^(Digit|Key)/, '').replace('Equal', '=').replace('Minus', '−') : ch.key ?? '';
  const n = NAMES[k === '-' ? '−' : k];
  return n ? n[isMac ? 0 : 1] : k.length === 1 ? k.toUpperCase() : k;
};

/** A chord as it is printed: ⌘⌥1 on a Mac, Ctrl+Alt+1 elsewhere. */
export function chordLabel(ch: Chord): string {
  if (isMac) return `${ch.mod ? '⌘' : ''}${ch.alt ? '⌥' : ''}${ch.shift ? '⇧' : ''}${keyText(ch)}`;
  return [ch.mod && 'Ctrl', ch.alt && 'Alt', ch.shift && 'Shift', keyText(ch)].filter(Boolean).join('+');
}

/** The shortcut's first chord, printed; '' for an unknown id. */
export const keysOf = (id: string): string => { const s = BY_ID.get(id); return s ? chordLabel(s.chords[0]) : ''; };

/** The aria-keyshortcuts value (WAI-ARIA names: Meta, Control, Alt, Shift), every chord, space-separated. */
export function ariaKeys(id: string): string | undefined {
  const s = BY_ID.get(id);
  if (!s) return undefined;
  return s.chords.map((ch) => {
    const key = ch.code ? ch.code.replace(/^(Digit|Key)/, '').replace('Equal', '=').replace('Minus', '-') : ch.key === ' ' ? 'Space' : ch.key ?? '';
    return [ch.mod && (isMac ? 'Meta' : 'Control'), ch.alt && 'Alt', ch.shift && 'Shift', key].filter(Boolean).join('+');
  }).join(' ');
}

// Editor settings can turn the key hints in tooltips off (shell/prefs.ts sets this).
let hints = true;
export const setKeyHints = (on: boolean) => { hints = on; };

/** A tooltip that names its shortcut: "Hide the inspector (⌘⌥2)". */
export const tip = (label: string, id: string): string => (hints && BY_ID.has(id) ? `${label} (${keysOf(id)})` : label);

/** title + aria-keyshortcuts for a button, from one id. */
export const keyProps = (label: string, id: string) => ({ title: tip(label, id), 'aria-keyshortcuts': ariaKeys(id) });
