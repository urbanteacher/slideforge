// The keyboard shortcuts sheet (?): every key of the show, by group, generated from the one table (controls.ts), so
// it lists what the keys do and never drifts. The wall shows it over the slide; the Teacher Presenter shows the same.

import { CONTROLS, CONTROL_GROUPS, KEY_NOTES, keyLabel } from './controls';
import './keysheet.css';

export function KeySheet({ onClose, room }: { onClose: () => void; room: boolean }) {
  return (
    <div className="key-sheet" role="dialog" aria-label="Keyboard shortcuts" data-testid="key-sheet" onClick={onClose}>
      <div className="key-sheet-card" onClick={(e) => e.stopPropagation()}>
        <div className="key-sheet-head"><b>Keyboard shortcuts</b><button onClick={onClose} aria-label="Close">×</button></div>
        <div className="key-sheet-groups">
          {CONTROL_GROUPS.map((g) => (
            <section key={g} aria-label={g}>
              <h4>{g}{g === 'Room' || g === 'Phones' ? (room ? '' : ' · with a live room') : ''}</h4>
              <table><tbody>
                {CONTROLS.filter((c) => c.group === g).map((c, i) => (
                  <tr key={`${c.action}-${i}`}>
                    <td>{c.keys.map((k, j) => <span key={k}>{j ? ' ' : ''}<kbd>{keyLabel(k)}</kbd></span>)}</td>
                    <td>{c.says}</td>
                  </tr>
                ))}
                {g === 'Slides' && KEY_NOTES.map((n) => <tr key={n.keys}><td><kbd>{n.keys}</kbd></td><td>{n.says}</td></tr>)}
              </tbody></table>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
