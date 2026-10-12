import { useStore } from '../model/store';
import { act, hasShell } from './ShellRow';

// One show: SlideForge's player, with its own bar (Room view, Quick poll, Freeze, Draw, Blank,
// Join QR, Teacher Presenter). Inside SlideForge the lab presses the shell's Present. A lab window
// on its own opens SlideForge beside it and hands this lesson over (js/lab-engine.js, labPresent);
// only when the browser refuses that window does the lab's own show stand in, so Present never
// does nothing.

/** Where SlideForge is: the app the lab is served from, or the local server in development. */
function slideForgeAddress(): string {
  const p = location.pathname;
  if (p.includes('/lab-app/')) return new URL(p.slice(0, p.indexOf('/lab-app/') + 1), location.origin).href;
  return 'http://localhost:8787/';
}

export function present() {
  const st = useStore.getState();
  if (hasShell()) { act('present'); return; }
  const target = slideForgeAddress();
  const show = window.open(`${target}?labPresent=1`, 'sf_show');
  if (!show) { st.set({ presenting: true }); return; }
  const origin = new URL(target).origin;
  const reply = (e: MessageEvent) => {
    if (e.source !== show || e.origin !== origin || (e.data as { type?: string } | null)?.type !== 'sf-lab-ready') return;
    removeEventListener('message', reply);
    const now = useStore.getState();
    show.postMessage({ type: 'sf-lab-present', deck: now.deck, slideId: now.slideId }, origin);
  };
  addEventListener('message', reply);
  setTimeout(() => removeEventListener('message', reply), 60000);
  st.showToast('Presenting in SlideForge, in a new window.');
}
