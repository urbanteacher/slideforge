import { useEffect, useState } from 'react';
import { createLayer, createSlide, rosetteSvg } from '../model/defaults';
import type { Deck, Slide } from '../model/types';
import { kind } from '../engine/registry';
import { renderStill } from '../export/exporters';
import { getImage } from '../engine/raster';

const FX_DECK = { width: 1920, height: 1080 } as Deck;

/** A representative mini-scene for each layer kind, rendered once with the real engine. */
function sampleSlide(kindId: string): Slide {
  const k = kind(kindId);
  const base = [
    createLayer('mesh', { params: { color1: '#ff8a5b', color2: '#ea526f', color3: '#25ced1', color4: '#fceade', softness: 0.7 } }),
    createLayer('image', { params: { src: rosetteSvg() }, box: { x: 560, y: 140, w: 800, h: 800 } }),
  ];
  if (k.content === 'text') return createSlide('', [createLayer('solid', { params: { color: '#f4ede4' } }), createLayer('text', { params: { text: 'Aa', font: 'Instrument Serif', size: 620, color: '#141414', align: 'center', italic: true }, box: { x: 360, y: 120, w: 1200 } })], '#f4ede4');
  if (k.content === 'image') return createSlide('', [createLayer('solid', { params: { color: '#f6e7ef' } }), base[1]], '#fff');
  if (k.content === 'shape') return createSlide('', [createLayer('solid', { params: { color: '#141417' } }), createLayer('shape', { params: { shape: 'star', points: 6, fill: '#ff5a36', gradient: true, fill2: '#ffc15e' }, box: { x: 610, y: 190, w: 700, h: 700 } })], '#141417');
  if (k.content === 'video') return createSlide('', [createLayer('solid', { params: { color: '#2a2a30' } }), createLayer('video', { box: { x: 260, y: 150, w: 1400, h: 780 } })], '#2a2a30');
  if (k.content === 'chart') return createSlide('', [createLayer('solid', { params: { color: '#f4ede4' } }), createLayer('chart', { params: { values: false, grid: false }, box: { x: 260, y: 160, w: 1400, h: 760 } })], '#f4ede4');
  if (k.content === 'note' || k.content === 'quote') {
    const box = k.content === 'quote' ? { x: 260, y: 200, w: 1400, h: 600 } : { x: 160, y: 220, w: 1600, h: 600 };
    return createSlide('', [createLayer('solid', { params: { color: '#f4ede4' } }), createLayer(kindId, { box, params: { size: k.content === 'quote' ? 110 : 60 } })], '#f4ede4');
  }
  if (k.content === 'quiz' || k.content === 'activity') return createSlide('', [createLayer('solid', { params: { color: '#e9e4f5' } }), createLayer(kindId, { box: { x: 240, y: 110, w: 1440, h: 860 } })], '#e9e4f5');
  if (k.category === 'generate') {
    const bg = kindId === 'grid' ? [createLayer('solid', { params: { color: '#0d2b5c' } })] : [];
    return createSlide('', [...bg, createLayer(kindId, kindId === 'grid' ? { params: { spacing: 90, thickness: 2 } } : {})], '#000');
  }
  const extra: Record<string, object> = {
    ripple: { params: { strength: 0.03, frequency: 30 }, interact: { followMouse: false } },
    lens: { params: { strength: 0.8, radius: 0.35 }, interact: { followMouse: false } },
    spotlight: { interact: { followMouse: false }, params: { intensity: 1.2 } },
    grain: { params: { amount: 0.3, size: 3 } },
    pixelate: { params: { size: 60 } },
    halftone: { params: { size: 34 } },
    chroma: { params: { amount: 2.5 } },
    blur: { params: { type: 'uniform', amount: 0.55 } },
    swirl: { params: { angle: 300, radius: 0.7 } },
    wave: { params: { strength: 0.05, scale: 2 } },
    glow: { params: { threshold: 0.4, intensity: 3 } },
  };
  return createSlide('', [...base, createLayer(kindId, extra[kindId] ?? {})], '#000');
}

const cache = new Map<string, string>();

function assetsReady(kindId: string) {
  if (!getImage(rosetteSvg())) return false;
  if (kindId === 'text' && document.fonts && !document.fonts.check('italic 400 100px "Instrument Serif"')) return false;
  return true;
}

export function kindThumb(kindId: string): string | undefined {
  let url = cache.get(kindId);
  if (!url) {
    if (!assetsReady(kindId)) return undefined;
    url = renderStill(sampleSlide(kindId), FX_DECK, 320, 'image/jpeg', 3.2);
    cache.set(kindId, url);
  }
  return url;
}

/** Renders thumbnails progressively (one per frame) so opening the panel never janks. */
export function useKindThumbs(ids: string[], fontsReady: number) {
  const [, force] = useState(0);
  useEffect(() => {
    let i = 0;
    let raf = 0;
    const pending = ids.filter((id) => !cache.has(id));
    let tries = 0;
    const step = () => {
      if (i >= pending.length) return;
      if (kindThumb(pending[i]) || ++tries > 90) { i++; tries = 0; force((n) => n + 1); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ids.join(','), fontsReady]);
  return (id: string) => cache.get(id);
}

export function clearKindThumbs() { cache.clear(); }
