import { DEFAULT_THEME, layoutFor, relayout, relayoutBlocked, syncHeaderFooter, themeOf, type LayoutDef } from '../../layouts';
import { addCommands } from '../../shell';
import { useStore } from '../../store';

/** Opens the Gallery to pick a new layout for a slide that exists (the slide menu, the Layouts panel, ⌘K). */
export function openChangeLayout(slideId?: string) {
  const st = useStore.getState();
  const id = slideId ?? st.slideId;
  const s = st.deck.slides.find((x) => x.id === id);
  if (!s) return;
  const blocked = relayoutBlocked(s);
  if (blocked) { st.showToast(blocked); return; }
  st.set({ slideId: id, galleryOpen: true, galleryMode: 'change', galleryTab: 'layouts' });
}

/** The slide on the canvas, rebuilt in `layout` with its own words and pictures (layouts/relayout.ts). One undo step. */
export function changeLayout(layout: LayoutDef) {
  const st = useStore.getState();
  const old = st.deck.slides.find((x) => x.id === st.slideId);
  if (!old) return;
  const blocked = relayoutBlocked(old);
  if (blocked) { st.showToast(blocked); return; }
  const theme = themeOf(st.deck) ?? DEFAULT_THEME;
  const { slide, leftover, picturesLeft } = relayout(old, layoutFor(layout, theme, st.deck), st.deck.height);
  st.mutate((d) => {
    const i = d.slides.findIndex((x) => x.id === old.id);
    if (i < 0) return;
    d.slides[i] = slide;
    if (d.headerFooter?.enabled || slide.headerFooter) syncHeaderFooter(d);
  });
  st.set({ selectedId: null, galleryOpen: false, galleryMode: 'insert' });
  const lost = [
    leftover.length ? `${leftover.length} ${leftover.length === 1 ? 'line' : 'lines'} with no place moved to the speaker notes` : '',
    picturesLeft ? `${picturesLeft} ${picturesLeft === 1 ? 'picture has' : 'pictures have'} no place on this layout` : '',
  ].filter(Boolean).join('; ');
  st.showToast(`Now a “${layout.name}” slide${lost ? `: ${lost}` : ''}. Undo puts the old layout back.`);
}

addCommands([{ id: 'slide.changeLayout', label: 'Change this slide’s layout…', group: 'Slides', keys: '', words: 'relayout layout switch template', run: () => openChangeLayout() }]);
