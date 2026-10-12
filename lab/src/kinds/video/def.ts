// The video layer: its params and their defaults, for the inspector, new layers and the player (from engine/registry.ts).
import { opt, type KindDef } from '../../engine';

export const videoDef: KindDef = {
  id: 'video', name: 'Video', category: 'source', content: 'video',
  description: 'A video clip. Upload a file or paste a link to an .mp4 or .webm and it plays muted on a loop; paste a YouTube or Vimeo link and the canvas shows its still while Preview frames the real player.',
  params: [
    { key: 'src', label: 'Video', type: 'video', default: '', group: 'Video', info: 'A file, or a YouTube or Vimeo link. YouTube is framed from youtube-nocookie.com, which sets no cookie until the clip is played.' },
    { key: 'frame', label: 'Frame', type: 'select', group: 'Video', default: 'free', info: 'Full screen fills the slide; a ratio reshapes the box about its centre.',
      options: [{ value: 'free', label: 'As drawn' }, { value: 'bleed', label: 'Full screen — the whole slide' }, { value: '16:9', label: '16:9 landscape' }, { value: '4:3', label: '4:3 landscape' }, { value: '1:1', label: '1:1 square' }] },
    { key: 'poster', label: 'Still', type: 'image', default: '', group: 'Video', info: 'The frame shown before it plays. Empty takes YouTube’s own thumbnail for a YouTube link.' },
    { key: 'start', label: 'Start at', type: 'number', min: 0, max: 36000, step: 1, default: 0, group: 'Video', unit: ' s', decimals: 0, info: 'A link shared "at current time" already carries its start.' },
    { key: 'end', label: 'Stop at', type: 'number', min: 0, max: 36000, step: 1, default: 0, group: 'Video', unit: ' s', decimals: 0, info: '0 plays to the end. YouTube only.' },
    { key: 'muted', label: 'Start muted', type: 'bool', default: true, group: 'Video', info: 'Off: a file plays with its sound in the show, once through unless Loop is on, and stops when the show moves on. Pressing it pauses and plays it.' },
    { key: 'autoplay', label: 'Play when the slide appears', type: 'bool', default: false, group: 'Video', info: 'A file with its sound on plays as its slide arrives in the show and carries on through the transition; off, it waits for a press on it. A YouTube or Vimeo link honours this only when muted.' },
    { key: 'loop', label: 'Loop', type: 'bool', default: false, group: 'Video' },
    { key: 'fit', label: 'Fit', type: 'select', options: opt('cover', 'contain'), default: 'cover', group: 'Video' },
    { key: 'radius', label: 'Corner radius', type: 'number', min: 0, max: 400, step: 1, default: 0, group: 'Video', unit: 'px', decimals: 0 },
    { key: 'speed', label: 'Speed', type: 'number', min: 0.25, max: 2, step: 0.05, default: 1, group: 'Video', unit: '×', decimals: 2 },
  ],
};
