// Entry for the standalone player bundle that is inlined into exported .html decks.
import type { Deck } from '../model/types';
import { DeckPlayer } from './player';

function boot() {
  const data = document.getElementById('sf-deck')?.textContent;
  if (!data) return;
  const deck = JSON.parse(data) as Deck;
  const stage = document.getElementById('sf-stage') as HTMLDivElement;
  const canvas = document.getElementById('sf-canvas') as HTMLCanvasElement;
  const bar = document.getElementById('sf-progress') as HTMLDivElement;
  const count = document.getElementById('sf-count') as HTMLDivElement;
  const hash = parseInt(location.hash.slice(1), 10);

  const fit = () => {
    const k = Math.min(innerWidth / deck.width, innerHeight / deck.height);
    canvas.style.width = `${deck.width * k}px`;
    canvas.style.height = `${deck.height * k}px`;
  };
  addEventListener('resize', fit);
  fit();

  const player = new DeckPlayer(canvas, deck, {
    start: Number.isFinite(hash) ? hash - 1 : 0,
    onChange: (i) => {
      bar.style.width = `${((i + 1) / deck.slides.length) * 100}%`;
      count.textContent = `${i + 1} / ${deck.slides.length}`;
      history.replaceState(null, '', `#${i + 1}`);
    },
  });

  addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); player.next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); player.prev(); }
    else if (e.key === 'Home') player.goto(0, -1, true);
    else if (e.key === 'End') player.goto(deck.slides.length - 1, 1, true);
    else if (e.key === 'f' || e.key === 'F') {
      if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen?.();
    }
  });

  let tx = 0;
  canvas.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) { e.preventDefault(); dx < 0 ? player.next() : player.prev(); }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
