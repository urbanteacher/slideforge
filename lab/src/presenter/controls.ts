// Every control of the studio's show in one table: its key on the wall, what it does, its group, and the Teacher
// Presenter's button for it. The show's key handler reads its keys from here, the shortcuts sheet (?) lists them from
// here, and the Teacher Presenter labels its buttons from here, so the three never drift. Pure: no DOM, no React.
// Classic's keys (index.html #cheats, js/player.js) are kept where the studio has the same control, except: D is Draw
// (I too) and P the Teacher Presenter, E cycles the room view and S toggles the full board, and W stays white screen,
// so who answered what is Shift+W.

import type { PresenterCmd } from './protocol';

/** What the show can be asked to do: everything the Teacher Presenter sends, and what only the wall's keys and bar do. */
export type ShowAction = PresenterCmd
  | 'first' | 'last' | 'overview' | 'notes' | 'full' | 'exit' | 'presenter' | 'who' | 'entry' | 'questions' | 'help'
  | 'undo' | 'clearInk' | 'drawDone';

/** Where a key works: outside Draw, inside it, or both. */
export type KeyMode = 'show' | 'draw' | 'any';
export type ControlGroup = 'Slides' | 'Screen' | 'Room' | 'Phones' | 'Draw';
export const CONTROL_GROUPS: readonly ControlGroup[] = ['Slides', 'Screen', 'Room', 'Phones', 'Draw'];

export interface Control {
  action: ShowAction;
  /** Keys as `keyName` names them: a lower-case letter, `Shift+b`, `Alt+f`, or the key's own name (`ArrowRight`, `?`, ` `). */
  keys: string[];
  mode: KeyMode;
  group: ControlGroup;
  /** What it does, as the sheet says it. */
  says: string;
  /** Only with a live room. */
  room?: boolean;
  /** The Teacher Presenter's button for it, or null when the window has none (the wall's own screen or pointer). */
  desk: string | null;
}

export const CONTROLS: readonly Control[] = [
  { action: 'next', keys: ['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'], mode: 'any', group: 'Slides', says: 'Next: a build, the room\'s next step (ask, reveal), or the next slide', desk: 'Next' },
  { action: 'prev', keys: ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'], mode: 'any', group: 'Slides', says: 'Back', desk: 'Back' },
  { action: 'first', keys: ['Home'], mode: 'any', group: 'Slides', says: 'First slide (without a room)', desk: null },
  { action: 'last', keys: ['End'], mode: 'any', group: 'Slides', says: 'Last slide (without a room)', desk: null },
  { action: 'overview', keys: ['o'], mode: 'any', group: 'Slides', says: 'Every slide at once: arrows and Enter go to one', desk: null },
  { action: 'steps', keys: ['a'], mode: 'any', group: 'Slides', says: 'Show every step on this slide', desk: 'Every step' },
  { action: 'freeze', keys: ['z'], mode: 'show', group: 'Slides', says: 'Freeze the wall: it holds this picture while you move on here; again to catch up', desk: 'Freeze' },
  { action: 'freeze', keys: ['Alt+f'], mode: 'any', group: 'Slides', says: 'Freeze the wall (also inside Draw)', desk: null },
  { action: 'exit', keys: ['Escape'], mode: 'show', group: 'Slides', says: 'Exit the show (a room is ended first, its standings stay up)', desk: 'End show' },
  { action: 'black', keys: ['b', '.'], mode: 'any', group: 'Screen', says: 'Black screen; again to come back', desk: 'Black' },
  { action: 'white', keys: ['w', ','], mode: 'any', group: 'Screen', says: 'White screen, for writing on the board', desk: 'White' },
  { action: 'full', keys: ['f'], mode: 'any', group: 'Screen', says: 'Full screen on or off', desk: null },
  { action: 'notes', keys: ['n'], mode: 'any', group: 'Screen', says: 'Speaker notes on the wall', desk: null },
  { action: 'notesElsewhere', keys: ['Shift+n'], mode: 'any', group: 'Screen', says: 'Notes on another device: the Teacher Presenter shows the private link and QR, and a phone follows your notes', desk: 'Notes on a phone' },
  { action: 'presenter', keys: ['p'], mode: 'any', group: 'Screen', says: 'Open the Teacher Presenter: notes, next slide and every control', desk: null },
  { action: 'draw', keys: ['d', 'i'], mode: 'any', group: 'Draw', says: 'Draw on the slide; again (or Esc) when done', desk: 'Draw' },
  { action: 'spot', keys: ['l'], mode: 'any', group: 'Draw', says: 'Spotlight: drag over what to look at, the rest goes dark; click to put it out', desk: 'Spotlight' },
  { action: 'undo', keys: ['z'], mode: 'draw', group: 'Draw', says: 'Undo the last mark (in Draw)', desk: null },
  { action: 'clearInk', keys: ['x'], mode: 'draw', group: 'Draw', says: 'Clear the marks and the spotlight (in Draw)', desk: 'Clear marks' },
  { action: 'drawDone', keys: ['Escape'], mode: 'draw', group: 'Draw', says: 'Done drawing', desk: null },
  { action: 'join', keys: ['j'], mode: 'any', group: 'Room', room: true, says: 'Join card: the PIN, address and QR over the slide for latecomers; J or Esc closes it', desk: 'Join card' },
  { action: 'roomView', keys: ['e'], mode: 'any', group: 'Room', room: true, says: 'Room view: hidden, beside the slide (standings), full screen (scores)', desk: 'Room view' },
  { action: 'scores', keys: ['s'], mode: 'any', group: 'Room', room: true, says: 'The full scores board on or off', desk: 'Scores' },
  { action: 'open', keys: ['h'], mode: 'any', group: 'Room', room: true, says: 'Show a prompt\'s held results', desk: 'Show results' },
  { action: 'close', keys: ['c'], mode: 'any', group: 'Room', room: true, says: 'Close the prompt or the quick poll (the phones are thanked)', desk: 'Close prompt' },
  { action: 'again', keys: ['r'], mode: 'any', group: 'Room', room: true, says: 'Clear the answers and score again: the question is asked afresh', desk: 'Ask again' },
  { action: 'more', keys: ['+', '='], mode: 'any', group: 'Room', room: true, says: '30 seconds more for the stage on the wall', desk: '+30s' },
  { action: 'poll', keys: ['v'], mode: 'any', group: 'Room', room: true, says: 'Quick poll: ask the room something on the fly', desk: 'Quick poll' },
  { action: 'questions', keys: ['q'], mode: 'any', group: 'Room', room: true, says: 'Questions from the room: approve, show, answer, hide', desk: 'Questions' },
  { action: 'who', keys: ['Shift+w'], mode: 'any', group: 'Room', room: true, says: 'Who answered what: in the Teacher Presenter only, never on the wall', desk: 'Who answered' },
  { action: 'reactions', keys: ['t'], mode: 'any', group: 'Room', room: true, says: 'Phone reactions on or off', desk: 'Reactions' },
  { action: 'entry', keys: ['k'], mode: 'any', group: 'Room', room: true, says: 'Teacher entry: add names, enter answers by key', desk: 'Teacher entry' },
  { action: 'blankPhones', keys: ['Shift+b'], mode: 'any', group: 'Phones', room: true, says: 'Blank every phone (not the wall); again to bring them back', desk: 'Blank phones' },
  { action: 'blankSoon', keys: ['Shift+c'], mode: 'any', group: 'Phones', room: true, says: 'Phones down in 10: a warning, then every phone goes dark; again to cancel', desk: 'Blank in 10 s' },
  { action: 'floor', keys: ['Shift+h'], mode: 'any', group: 'Phones', room: true, says: 'Who may speak: follows the lesson, always open, closed', desk: 'Floor' },
  { action: 'help', keys: ['?'], mode: 'any', group: 'Screen', says: 'This list of keys; ? or Esc closes it', desk: null },
];

/** Keys the sheet lists that are not one control's: the typed jump. */
export const KEY_NOTES: readonly { keys: string; says: string }[] = [
  { keys: '1 2 … then Enter', says: 'Go to that slide (Esc forgets the number)' },
];

/** A key press as the table names it: letters lower case, with Shift+ or Alt+ when held (Alt by the key's place, as a Mac's
 *  Alt+F types ƒ). Null for a press with Ctrl or Cmd, which is the browser's. */
export function keyName(e: { key: string; code?: string; shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }): string | null {
  if (e.ctrlKey || e.metaKey) return null;
  if (e.altKey) {
    const letter = e.code && /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : e.key.length === 1 ? e.key.toLowerCase() : e.key;
    return `Alt+${letter}`;
  }
  if (/^[a-z]$/i.test(e.key)) return (e.shiftKey ? 'Shift+' : '') + e.key.toLowerCase();
  return e.key;
}

/** The control a key does, in Draw or outside it; null when the key is not the show's. */
export function controlFor(key: string, drawing: boolean): Control | null {
  const mode: KeyMode = drawing ? 'draw' : 'show';
  return CONTROLS.find((c) => (c.mode === mode || c.mode === 'any') && c.keys.includes(key)) ?? null;
}

const KEY_LABELS: Record<string, string> = { ArrowRight: '→', ArrowLeft: '←', ArrowUp: '↑', ArrowDown: '↓', ' ': 'Space', PageDown: 'PgDn', PageUp: 'PgUp', Escape: 'Esc', Backspace: '⌫' };
/** A key as the sheet prints it: `Shift+B`, `→`, `Space`. */
export function keyLabel(key: string): string {
  const m = /^(Shift|Alt)\+(.+)$/.exec(key);
  if (m) return `${m[1]}+${m[2].toUpperCase()}`;
  return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

/** The first key of an action, for a button's title ("Freeze (Z)"). */
export function keyOf(action: ShowAction): string {
  const c = CONTROLS.find((x) => x.action === action);
  return c ? keyLabel(c.keys[0]) : '';
}

/** The room on the wall (classic's rail): hidden, the standings beside the slide, or the scores board over it. */
export type RoomView = 'hidden' | 'beside' | 'full';
export const ROOM_VIEWS: readonly RoomView[] = ['hidden', 'beside', 'full'];
export const ROOM_VIEW_SAYS: Record<RoomView, string> = { hidden: 'Room view hidden', beside: 'Standings beside the slide', full: 'Scores full screen' };
/** E: the next room view, round and round. */
export function nextRoomView(v: RoomView): RoomView { return ROOM_VIEWS[(ROOM_VIEWS.indexOf(v) + 1) % ROOM_VIEWS.length]; }
/** S: the full board, or back beside the slide. */
export function toggleBoard(v: RoomView): RoomView { return v === 'full' ? 'beside' : 'full'; }
