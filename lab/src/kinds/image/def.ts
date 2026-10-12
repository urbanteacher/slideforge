// The image layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { opt, type KindDef } from '../../engine';

export const imageDef: KindDef = {
  id: 'image', name: 'Image', category: 'source', content: 'image',
  description: 'A photo or illustration. Drop a file on the canvas, paste one, or pick it here.',
  params: [
    { key: 'src', label: 'Image', type: 'image', default: '', group: 'Image' },
    { key: 'fit', label: 'Fit', type: 'select', options: opt('cover', 'contain'), default: 'contain', group: 'Image' },
    { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 400, step: 1, default: 0, group: 'Image', unit: 'px', decimals: 0 },
    { key: 'border', label: 'Border', type: 'number', min: 0, max: 40, step: 1, default: 0, group: 'Image', unit: 'px', decimals: 0, info: 'A line round the picture, inside its edge, following its corners. Round the picture itself when it is contained.' },
    { key: 'borderColor', label: 'Border colour', type: 'color', default: '#ffffff', group: 'Image', when: (p) => Number(p.border) > 0 },
    // SlideForge's picture settings, from "Logo sits on" down.
    { key: 'frame', label: 'Image frame', type: 'select', group: 'Picture', default: 'free', info: 'Reshapes the box to a fixed ratio, or fills the slide. Drag its handles afterwards to change it again.',
      options: [{ value: 'free', label: 'As drawn' }, { value: 'bleed', label: 'Full bleed — the whole slide' }, { value: '16:9', label: '16:9 landscape' }, { value: '4:3', label: '4:3 landscape' }, { value: '1:1', label: '1:1 square' }, { value: '4:5', label: '4:5 portrait' }] },
    { key: 'flip', label: 'Flip image', type: 'select', group: 'Picture', default: 'none', options: [{ value: 'none', label: 'As it was taken' }, { value: 'mirror', label: 'Mirrored' }] },
    { key: 'tone', label: 'Logo sits on', type: 'select', group: 'Picture', default: 'auto', info: 'For a logo. On a dark background it is shown white so it stays visible.',
      options: [{ value: 'auto', label: 'Let the theme decide' }, { value: 'dark', label: 'A dark background — show the logo white' }, { value: 'light', label: 'A light background — keep the logo as it is' }] },
    { key: 'focus', label: 'Image focus', type: 'vec2', default: [0.5, 0.5], group: 'Picture', inBox: true, info: 'The part of the picture that matters: it stays in view when the frame crops, and a slow zoom closes in on it. Drag the handle on the picture.', when: (p) => p.fit === 'cover' || (p.motion ?? 'none') !== 'none' },
    // Image effects — shown in the Animate tab, not here.
    { key: 'motion', label: 'Image motion', type: 'select', group: '_motion', default: 'none', options: [{ value: 'none', label: 'Stays still' }, { value: 'zoom', label: 'Slow zoom in' }, { value: 'travel', label: 'Travel — from one point to another' }, { value: 'detail', label: 'Zoom to a detail — SlideForge’s Explore hotspot' }] },
    { key: 'focus2', label: 'Travels to', type: 'vec2', default: [0.7, 0.4], group: '_motion', inBox: true, when: (p) => p.motion === 'travel' },
    // Explore: the picture moves from where the last detail left it (or the whole picture) to this one.
    { key: 'zoom', label: 'Zoom on the detail', type: 'number', min: 1, max: 4, step: 0.1, default: 2, group: '_motion', decimals: 1, when: (p) => p.motion === 'detail', info: 'The detail is the image focus. SlideForge allows 1× to 4×.' },
    { key: 'fromFocus', label: 'Comes from', type: 'vec2', default: [0.5, 0.5], group: '_motion', inBox: true, when: (p) => p.motion === 'detail' },
    { key: 'fromZoom', label: 'Zoom it comes from', type: 'number', min: 1, max: 4, step: 0.1, default: 1, group: '_motion', decimals: 1, when: (p) => p.motion === 'detail', info: '1 is the whole picture.' },
    { key: 'motionSecs', label: 'How long the move takes', type: 'select', group: '_motion', when: (p) => p.motion !== 'detail', default: '20', options: [{ value: '12', label: '12 seconds' }, { value: '20', label: '20 seconds' }, { value: '30', label: '30 seconds' }] },
  ],
};
