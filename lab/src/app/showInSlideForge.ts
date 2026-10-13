import { openStudioShow } from '../show';
import { useStore } from '../store';
import { act, hasShell } from './ShellRow';

// Present. Inside SlideForge the lab presses the shell's Present, which opens the studio's show over this frame
// with the shell's hooks (js/lab-engine.js). A lab window on its own (the development server) opens the same show
// itself, with none.

export function present() {
  if (hasShell()) { act('present'); return; }
  const st = useStore.getState();
  if (!st.deck.slides.some((s) => !s.hidden)) { st.showToast('Present cannot start: the lesson has no shown slide.'); return; }
  openStudioShow({ room: false, slideId: st.slideId });
}
