import { cloneLayer, createLayer } from '../model/defaults';
import { LAYOUT_STYLES, themeOf } from '../model/layouts';
import { hasFlagshipFrame, isFlagshipFrameLayer, setFramePage } from '../model/frame';
import { slideOf, useStore } from '../model/store';
import { kind } from '../engine/registry';
import type { Layer } from '../model/types';

const choiceNames = /^[ABCD] · (rule|tile|letter|choice|detail)$/;
const choiceLetters = ['A', 'B', 'C', 'D'] as const;
const isChoiceLayer = (layer: Layer) => choiceNames.test(layer.name);
const numberedNames = /^0[1-6] · (rule|number|heading|detail)$/;
const isNumberedLayer = (layer: Layer) => numberedNames.test(layer.name);

/** The lesson's faces and accent, for a block made fresh (one copied keeps the style it has). */
type BlockStyle = { display: string; body: string; accent: string };
const FALLBACK: BlockStyle = { display: 'Uncut Sans', body: 'Uncut Sans', accent: '#00BEDD' };

function numberedLayers(source: Layer[], current: Layer[], count: number, width: number, height: number, background: string, style: BlockStyle = FALLBACK): Layer[] {
  const hex = background.replace('#', '');
  const rgb = Number.parseInt(hex, 16);
  const dark = Number.isFinite(rgb) && (0.299 * ((rgb >> 16) & 255) + 0.587 * ((rgb >> 8) & 255) + 0.114 * (rgb & 255)) < 110;
  const ink = dark ? '#F6F4ED' : '#231F20';
  // The numbers keep the colour the block already has (a lesson's strand colour); cyan, Safe's, for a new block.
  const accent = String(source.find((l) => l.name === '01 · number')?.params.color ?? current.find((l) => l.name === '01 · number')?.params.color ?? style.accent);
  const compact = count > 3;
  const stride = compact ? 104 : 216;
  return Array.from({ length: count }, (_, i) => {
    const number = String(i + 1).padStart(2, '0');
    return (['rule', 'number', 'heading', 'detail'] as const).map((part) => {
      const name = `${number} · ${part}`;
      const original = source.find((l) => l.name === name) ?? source.find((l) => l.name === `01 · ${part}`);
      const base = original ? cloneLayer(original) : createLayer(part === 'rule' ? 'shape' : 'text', {
        name,
        params: part === 'rule' ? { shape: 'rect', fill: dark ? '#686366' : '#8A8586', strokeWidth: 0 } : {
          text: part === 'number' ? number : part === 'heading' ? `Point ${number}` : 'Add a short explanation.',
          font: part === 'detail' ? style.body : style.display, size: part === 'number' ? 99 : part === 'heading' ? 50 : 38,
          weight: part === 'detail' ? '400' : '700', color: part === 'number' ? accent : ink, fit: 'shrink',
        },
        box: part === 'rule' ? { x: 78, y: 294, w: 1764, h: 2 } : part === 'number' ? { x: 78, y: 354, w: 183, h: 99 }
          : part === 'heading' ? { x: 273, y: 327, w: 1572, h: 53 } : { x: 273, y: 392, w: 1461, h: 88 },
      });
      base.name = name;
      base.params.blockRole = 'numbered';
      if (part === 'number') base.params.text = number;
      if (part === 'heading' || part === 'detail') base.params.text = String(current.find((l) => l.name === name)?.params.text ?? (part === 'heading' ? `Point ${number}` : 'Add a short explanation.'));
      if (part === 'heading' || part === 'detail') base.params.color = ink;
      if (part === 'number') base.params.color = accent;
      if (part === 'rule') base.params.fill = dark ? '#686366' : '#8A8586';
      if (base.box) {
        if (compact) {
          base.box.y = 294 + i * stride + (part === 'rule' ? 0 : part === 'number' ? 27 : part === 'heading' ? 19 : 61);
          base.box.h = part === 'rule' ? 2 : part === 'number' ? 58 : part === 'heading' ? 43 : 34;
          if (part === 'number') base.params.size = 58;
          if (part === 'heading') base.params.size = 39;
          if (part === 'detail') base.params.size = 29;
        } else {
          base.box.y = part === 'rule' ? 294 + i * 216 : part === 'number' ? 354 + i * 216
            : part === 'heading' ? [327, 564, 780][i] : [392, 630, 846][i];
          base.box.h = part === 'rule' ? 2 : part === 'number' ? 99 : part === 'heading' ? 53 : i === 0 ? 88 : 44;
          if (part === 'number') base.params.size = 99;
          if (part === 'heading') base.params.size = 50;
          if (part === 'detail') base.params.size = 38;
        }
        base.box.x *= width / 1920; base.box.y *= height / 1080;
        base.box.w *= width / 1920; base.box.h *= height / 1080;
      }
      if (part === 'heading' || part === 'detail') base.params.fit = 'shrink';
      return base;
    });
  }).flat();
}

function choiceLayers(source: Layer[], current: Layer[], count: number, width: number, height: number, background: string, style: BlockStyle = FALLBACK): Layer[] {
  const value = (name: string, fallback: string) => String(current.find((l) => l.name === name)?.params.text ?? fallback);
  const hex = background.replace('#', '');
  const rgb = Number.parseInt(hex, 16);
  const dark = Number.isFinite(rgb) && (0.299 * ((rgb >> 16) & 255) + 0.587 * ((rgb >> 8) & 255) + 0.114 * (rgb & 255)) < 110;
  const ink = dark ? '#F6F4ED' : '#231F20';
  return choiceLetters.slice(0, count).flatMap((letter, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = col ? 989 : 78, y = row ? 672 : 348;
    const sourcePart = (part: string) => source.find((l) => l.name === `${letter} · ${part}`);
    const make = (part: string, fallback: () => Layer) => {
      const original = sourcePart(part) ?? (row ? source.find((l) => l.name === `${col ? 'B' : 'A'} · ${part}`) : undefined);
      if (!original) return fallback();
      const copy = cloneLayer(original);
      copy.name = `${letter} · ${part}`;
      if (row && !sourcePart(part) && copy.box) copy.box.y += 324;
      if (part === 'letter') copy.params.text = letter;
      return copy;
    };
    const parts = [
      make('rule', () => createLayer('shape', { name: `${letter} · rule`, params: { shape: 'rect', fill: ink, strokeWidth: 0 }, box: { x, y, w: 854, h: 3 } })),
      make('tile', () => createLayer('shape', { name: `${letter} · tile`, params: { shape: 'rect', fill: style.accent, strokeWidth: 0 }, box: { x, y: y + 80, w: 114, h: 114 } })),
      make('letter', () => createLayer('text', { name: `${letter} · letter`, params: { text: letter, font: style.display, size: 72, weight: '700', color: '#231F20', align: 'center', fit: 'shrink' }, box: { x, y: y + 96, w: 117, h: 90 } })),
      make('choice', () => createLayer('text', { name: `${letter} · choice`, params: { text: `Choice ${letter}`, font: style.display, size: 41, weight: '700', color: ink, fit: 'shrink' }, box: { x: x + 147, y: y + 86, w: col ? 675 : 710, h: 50 } })),
      make('detail', () => createLayer('text', { name: `${letter} · detail`, params: { text: 'Explain this option.', font: style.body, size: 31, color: ink, fit: 'shrink' }, box: { x: x + 147, y: y + 146, w: col ? 675 : 710, h: 82 } })),
    ];
    for (const layer of parts) {
      layer.params.blockRole = 'choices';
      if (layer.name.endsWith(' · choice')) layer.params.text = value(layer.name, `Choice ${letter}`);
      if (layer.name.endsWith(' · detail')) layer.params.text = value(layer.name, 'Explain this option.');
      if (layer.kind === 'text' && !layer.name.endsWith(' · letter')) layer.params.color = ink;
      if (layer.name.endsWith(' · rule')) layer.params.fill = ink;
      if (layer.box) {
        layer.box.x *= width / 1920; layer.box.y *= height / 1080;
        layer.box.w *= width / 1920; layer.box.h *= height / 1080;
      }
    }
    return parts;
  });
}

/** Insert related layers as one undo step, underneath the slide's finishing effects. */
function replaceBlock(role: string, layers: Layer[], every: boolean, background?: string) {
  const st = useStore.getState();
  st.mutate((d) => {
    for (const [index, slide] of d.slides.entries()) {
      if (!every && slide.id !== st.slideId) continue;
      slide.layers = slide.layers.filter((l) => l.params.blockRole !== role && !(role === 'choices' && isChoiceLayer(l)) && !(role === 'numbered' && isNumberedLayer(l)) &&
        !(role === 'header' && hasFlagshipFrame(slide) && isFlagshipFrameLayer(l)));
      if (role === 'numbered') {
        const closing = slide.layers.find((l) => l.name === 'Closing line');
        if (closing && /^(One|Two|Three|Four|Five|Six) things?, in the order you would use them$/.test(String(closing.params.text))) {
          const word = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'][layers.filter((l) => l.name.endsWith(' · number')).length - 1];
          closing.params.text = `${word} ${word === 'One' ? 'thing' : 'things'}, in the order you would use them`;
        }
      }
      if (background) {
        slide.background = background;
        // Gallery layouts put a full-slide Solid layer over the slide background.
        // Recolour it too, or the chosen flagship theme stays hidden underneath.
        for (const layer of slide.layers)
          if (layer.kind === 'solid') layer.params.color = background;
      }
      let at = slide.layers.length;
      while (at > 0 && !kind(slide.layers[at - 1].kind).content && kind(slide.layers[at - 1].kind).category !== 'generate') at--;
      const fresh = slide.id === st.slideId ? structuredClone(layers) : layers.map(cloneLayer);
      if (role === 'header' && fresh.some((l) => isFlagshipFrameLayer(l)))
        setFramePage(fresh, index + 1, d.slides.length, d.width);
      slide.layers.splice(at, 0, ...fresh);
    }
  });
  st.set({ selectedId: (layers.find((l) => l.kind !== 'shape') ?? layers[0])?.id ?? null, editingTextId: null, leftTab: 'layers' });
}

/* Cards, choice boxes and numbered points go straight onto the slide: no dialog, no form. How many
   there are is changed on the canvas — "+" on a box adds another in the next slot and the row
   reflows; delete one and Tidy up closes the gap — and colours and type are the side panel's. A
   slide that already has the block gets it selected, rather than a second copy on top. */
export type BlockMode = 'cards' | 'choices' | 'numbered';
const STARTING_COUNT: Record<BlockMode, number> = { cards: 3, choices: 4, numbered: 3 };

export function insertBlock(mode: BlockMode) {
  const st = useStore.getState();
  const slide = slideOf(st);
  const present = slide.layers.filter((l) => l.params.blockRole === mode || (mode === 'choices' && isChoiceLayer(l)) || (mode === 'numbered' && isNumberedLayer(l)));
  if (present.length) {
    st.selectLayer((present.find((l) => l.kind !== 'shape') ?? present[0]).id);
    st.showToast('This slide already has them. Select one and press + to add another, or delete one and Tidy up closes the gap.');
    return;
  }
  const count = STARTING_COUNT[mode];
  // The deck's theme when it has one; otherwise whichever reads on this slide's ground.
  const bg = Number.parseInt(slide.background.replace('#', ''), 16);
  const darkGround = Number.isFinite(bg) && (0.299 * ((bg >> 16) & 255) + 0.587 * ((bg >> 8) & 255) + 0.114 * (bg & 255)) < 110;
  const theme = themeOf(st.deck) ?? LAYOUT_STYLES.find((s) => s.id === (darkGround ? 'midnight' : 'paper'))!;
  const look: BlockStyle = { display: theme.display, body: theme.body, accent: theme.accent };
  let layers: Layer[];
  if (mode === 'numbered') {
    const source = st.deck.slides.find((s) => s.layers.some((l) => l.name === '01 · heading'))?.layers.filter(isNumberedLayer) ?? [];
    layers = numberedLayers(source, [], count, st.deck.width, st.deck.height, slide.background, look);
  } else if (mode === 'choices') {
    const source = st.deck.slides.find((s) => choiceLetters.every((letter) => s.layers.some((l) => l.name === `${letter} · choice`)))?.layers.filter(isChoiceLayer) ?? [];
    layers = choiceLayers(source, [], count, st.deck.width, st.deck.height, slide.background, look);
  } else {
    // The deck's theme when it has one; otherwise whichever reads on this slide's ground.
    const hex = slide.background.replace('#', '');
    const n = Number.parseInt(hex, 16);
    const dark = Number.isFinite(n) && (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110;
    const style = themeOf(st.deck) ?? LAYOUT_STYLES.find((s) => s.id === (dark ? 'midnight' : 'paper'))!;
    const gap = 36, margin = 78;
    const width = (st.deck.width - margin * 2 - gap * (count - 1)) / count;
    layers = Array.from({ length: count }, (_, i) => createLayer('note', {
      name: `Card ${i + 1}`,
      params: { blockRole: 'cards', label: `Card ${i + 1}`, text: 'Add your idea here.', fill: style.panel, textColor: style.ink, accent: style.accent, font: style.body, size: 40, panel: true, fit: 'shrink', radius: 24 },
      box: { x: margin + i * (width + gap), y: st.deck.height * 0.36, w: width, h: st.deck.height * 0.48 },
      anim: { type: 'rise', duration: 0.7 },
    }));
  }
  replaceBlock(mode, layers, false);
  st.showToast(mode === 'cards' ? 'Double-click a card to write in it. Select one and press + to add another.' : 'Double-click a title or detail to write in it.');
}

const MAX: Record<'numbered' | 'choices', number> = { numbered: 6, choices: 4 };

/** One more point or choice: the block is rebuilt a row longer, keeping everything already typed and styled. */
export function growBlock(mode: 'numbered' | 'choices') {
  const st = useStore.getState();
  const slide = slideOf(st);
  const current = slide.layers.filter(mode === 'numbered' ? isNumberedLayer : isChoiceLayer);
  const count = new Set(current.map((l) => l.name.split(' · ')[0])).size;
  if (count >= MAX[mode]) {
    st.showToast(mode === 'numbered' ? 'Six points is as many as fit at a readable size. Start the rest on a new slide.' : 'A choice grid holds four, A to D.');
    return;
  }
  const layers = mode === 'numbered'
    ? numberedLayers(current, current, count + 1, st.deck.width, st.deck.height, slide.background)
    : choiceLayers(current, current, count + 1, st.deck.width, st.deck.height, slide.background);
  replaceBlock(mode, layers, false);
  const fresh = layers.filter((l) => l.name.startsWith(mode === 'numbered' ? String(count + 1).padStart(2, '0') : 'ABCD'[count]));
  const text = fresh.find((l) => /· (heading|choice)$/.test(l.name));
  if (text) st.set({ selectedId: text.id, editingTextId: text.id });
  if (mode === 'numbered' && count + 1 === 4) st.showToast('Four or more points sit closer together so all of them fit.');
}
