import { ChevronDown, Play } from 'lucide-react';
import { Menu } from './Menu';

// SlideForge's second header row, on the lab's tools row so the two are one line: Library and the
// demo on the left, Host live and Present on the right, the lab's formatting between them. Each
// presses the shell's own button (js/lab-engine.js, SF.LabEngine.act), which the shell hides while
// the lab is the Lesson studio, so what they do is SlideForge's, unchanged.
type Shell = { act?: (name: string, arg?: number) => void };
const shell = (): Shell | undefined =>
  window.parent !== window ? (window.parent as unknown as { SF?: { LabEngine?: Shell } }).SF?.LabEngine : undefined;
const act = (name: string, arg?: number) => shell()?.act?.(name, arg);

export const hasShell = () => !!shell()?.act;

export function ShellLeft() {
  return (
    <div className="shell-group">
      <button className="shell-btn" title="Templates, lessons and brand packs — everything saved, in one place" onClick={() => act('library')}>▦ Library</button>
      <button className="shell-btn" title="The demo deck: every layout, chart, activity and live moment" onClick={() => act('demo')}>✧ See the demo</button>
    </div>
  );
}

export function ShellRight() {
  return (
    <div className="shell-group">
      <button className="shell-btn shell-live" title="Run live with phones in the room" onClick={() => act('live')}>◉ Host live</button>
      <div className="shell-present">
        <button className="shell-btn shell-primary" title="Slideshow on the wall / projector (⌘↵)" onClick={() => act('present')}><Play size={12} fill="currentColor" strokeWidth={0} />Present</button>
        <Menu right trigger={(open, t) => <button className={`shell-btn shell-primary shell-more${open ? ' active' : ''}`} aria-label="More ways to present" title="More ways to present" onClick={t}><ChevronDown size={13} /></button>}>
          {(close) => (
            <>
              <button onClick={() => { act('presenter'); close(); }}>Teacher Presenter<small>notes on your screen</small></button>
              <button onClick={() => { act('rehearse'); close(); }}>▷ Rehearse<small>with a sample class</small></button>
              <div className="menu-note">Rehearse with a class of</div>
              <div className="shell-sizes">
                {[8, 30, 120].map((n) => <button key={n} onClick={() => { act('rehearse', n); close(); }}>{n}</button>)}
              </div>
            </>
          )}
        </Menu>
      </div>
    </div>
  );
}
