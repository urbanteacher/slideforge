// The Power of AI, new edition: a Lesson-studio deck built layer by layer, in a fresh look
// (near-black, a moving mesh glow, film grain, chunky grotesque type, serif-italic asides, mono tags,
// and one sticker colour per kind of AI). Every word is a text layer, so all of it is editable in the studio.
//
//   node tools/power-of-ai-fresh/build.mjs
//
// writes assets/power-of-ai-fresh/Power-of-AI-Fresh.lesson.json, which tools/build-lab-decks.mjs ships.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import '../../lab/src/kinds';
import { DECK_VERSION, createLayer, createSlide, type Layer, type Slide } from '../../lab/src/core';
import { blankGuide } from '../../lab/src/theme';

// createLayer measures words to size a text box: in Node, a canvas that measures each character as half its size
// stands in (as the studio's own tests do). Every box here is set by hand, so the measure only has to exist.
const g = globalThis as unknown as { OffscreenCanvas?: unknown };
const stub = { font: '40px Inter', measureText(t: string) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 40); return { width: t.length * px * 0.5, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25 }; } };
g.OffscreenCanvas ??= class { getContext() { return stub; } };

// ─── The look ────────────────────────────────────────────────────────────────
const BG = '#0e0e11', INK = '#f5f3ee', MUTED = '#a7a7b2', CARD = '#1b1b21', LINE = '#2c2c34', BLACK = '#0e0e11';
const PURPLE = '#b97bf7', BLUE = '#4abffd', ORANGE = '#ff9667', LIME = '#cefd85', GREEN = '#00c57f';
// UK Black Tech's own typefaces (UKBT-Brand-Guide.md, section 4): Alpha Lyrae Medium for the one hero line on a
// slide, in capitals; Uncut Sans for everything else (Bold headings, Regular body, italic asides, Semibold labels).
const HERO = 'Alpha Lyrae', DISPLAY = 'Uncut Sans', SERIF = 'Uncut Sans', MONO = 'Uncut Sans', BODY = 'Uncut Sans';
/** One colour, icon and nickname per kind of AI, kept the same on every slide. */
const KINDS = {
  gen: { n: '01', name: 'Generative AI', nick: 'the public face', colour: PURPLE, icon: 'sparkles', tag: 'Generative' },
  pred: { n: '02', name: 'Predictive & analytical AI', nick: 'the quiet workhorse', colour: BLUE, icon: 'chart-line', tag: 'Predictive' },
  auto: { n: '03', name: 'Automation & workflow AI', nick: 'the efficiency engine', colour: ORANGE, icon: 'zap', tag: 'Automation' },
  agent: { n: '04', name: 'Autonomous AI agents', nick: 'the new frontier', colour: LIME, icon: 'bot', tag: 'Agents' },
} as const;
type Kind = keyof typeof KINDS;

// ─── Pieces ──────────────────────────────────────────────────────────────────
type A = Partial<Layer['anim']>;
const at = (x: number, y: number, w: number, h: number, rot = 0) => ({ x, y, w, h, rot });
const rise = (delay = 0): A => ({ type: 'rise', duration: 0.7, delay, easing: 'expoOut' });
const pop = (delay = 0): A => ({ type: 'pop', duration: 0.6, delay, easing: 'springPlayful' });
const click = (a: A): A => ({ ...a, trigger: 'onClick', delay: 0 });
const then = (a: A): A => ({ ...a, trigger: 'afterPrev', delay: 0 });

function text(name: string, value: string, box: ReturnType<typeof at>, p: Record<string, unknown> = {}, anim: A = rise()): Layer {
  const l = createLayer('text', { name, box, params: { text: value, font: BODY, size: 44, weight: '400', color: INK, lineHeight: 1.25, tracking: 0, fit: 'shrink', ...p }, anim });
  l.box = { ...box };
  return l;
}
const display = (name: string, value: string, box: ReturnType<typeof at>, size: number, p: Record<string, unknown> = {}, anim: A = rise()) =>
  text(name, value, box, { font: DISPLAY, weight: '700', size, lineHeight: 0.98, tracking: -0.02, balance: true, ...p }, anim);
const aside = (name: string, value: string, box: ReturnType<typeof at>, size: number, colour: string, anim: A = rise(0.3)) =>
  text(name, value, box, { font: SERIF, italic: true, weight: '400', size, color: colour, lineHeight: 1.05 }, anim);
const mono = (name: string, value: string, box: ReturnType<typeof at>, colour = MUTED, p: Record<string, unknown> = {}, anim: A = { type: 'fade', duration: 0.5 }) =>
  text(name, value, box, { font: MONO, weight: '600', size: 36, color: colour, uppercase: true, tracking: 0.1, lineHeight: 1.2, ...p }, anim);
/** A sticker: a word on a pill of colour, often at a tilt. */
const sticker = (name: string, value: string, x: number, y: number, w: number, colour: string, rot = 0, anim: A = pop(), size = 40, ink = BLACK) =>
  text(name, value, at(x, y, w, size * 1.4, rot), { font: MONO, weight: '700', size, color: ink, uppercase: true, tracking: 0.06, lineHeight: 1.1,
    block: 'hug', blockColor: colour, blockRadius: 80, blockPad: 22, fit: 'none' }, anim);
/** A label on a dark pill with a coloured edge: an example, a tool. */
const chip = (name: string, value: string, x: number, y: number, w: number, edge: string, anim: A = pop()) =>
  text(name, value, at(x, y, w, 58), { font: BODY, weight: '600', size: 38, color: INK, lineHeight: 1.1,
    block: 'hug', blockColor: CARD, blockRadius: 80, blockPad: 20, blockBorder: 2.5, blockBorderColor: edge, fit: 'none' }, anim);
const shape = (name: string, box: ReturnType<typeof at>, p: Record<string, unknown>, anim: A = { type: 'fade', duration: 0.6 }) =>
  createLayer('shape', { name, box, params: { shape: 'rect', radius: 40, fill: CARD, strokeWidth: 0, ...p }, anim });
const icon = (name: string, which: string, box: ReturnType<typeof at>, colour: string, anim: A = pop(0.2)) =>
  createLayer('icon', { name, box, params: { icon: which, color: colour, stroke: 2.25 }, anim });

/** The UKBT Institute's logo (assets/brand/ukbt-institute.svg, white and green, for dark grounds), at a given height. */
const instituteLogo = (name: string, x: number, y: number, h: number, anim: A = { type: 'fade', duration: 0.5 }) => {
  const l = createLayer('image', { name, params: { src: '/assets/brand/ukbt-institute.svg', fit: 'contain', tone: 'light' }, anim });
  l.box = { x, y, w: Math.round((h * 221.6) / 32), h, rot: 0 };
  return l;
};
/** A QR code for a link, drawn when the deck is built by SlideForge's own encoder (js/qr.js, the one the live rooms
   use) and written beside the deck. Returns its address, for an image layer. */
function qrCode(url: string, file: string, light: string, dark: string, title: string): string {
  const win: { SF?: { qrSvg: (text: string, opts?: object) => string } } = {};
  vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), 'js', 'qr.js'), 'utf8'), { window: win });
  fs.writeFileSync(path.join(process.cwd(), 'assets', 'power-of-ai-fresh', file), win.SF!.qrSvg(url, { level: 'M', quiet: 4, light, dark, title }) + '\n');
  return `/assets/power-of-ai-fresh/${file}`;
}
/** The ground: near-black with a glow in one corner, or the moving mesh on the big moments. */
function ground(glow: string | null): Layer[] {
  if (!glow) return [
    createLayer('mesh', { name: 'Ground', params: { color1: BG, color2: '#2a1650', color3: PURPLE, color4: BLUE, w1: 46, w2: 26, w3: 16, w4: 12, speed: 0.35, softness: 0.85, scale: 0.8 } }),
    createLayer('grain', { name: 'Grain', params: { amount: 0.07, size: 1.4, speed: 0.6 } }),
  ];
  return [
    createLayer('radial', { name: 'Ground', params: { colorA: glow, colorB: BG, cx: 0.92, cy: -0.08, rx: 0.9, ry: 0.95, reach: 0.62 } }),
    createLayer('grain', { name: 'Grain', params: { amount: 0.05, size: 1.4, speed: 0.6 } }),
  ];
}
/** Where we are, top left (the running order at the foot of this file writes "2 of 5 · …"); whose talk, top right. */
const chrome = (where: string): Layer[] => [
  mono('Section', where, at(110, 64, 1100, 48)),
  mono('Brand', 'UK Black Tech', at(1310, 64, 500, 48), MUTED, { align: 'right' }),
];
/** A deep tint of a kind's colour for the glow behind its slides. */
const deep = (hex: string) => {
  const c = hex.replace('#', '');
  const ch = (i: number) => Math.round(parseInt(c.slice(i, i + 2), 16) * 0.28 + 14 * 0.72).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(2)}${ch(4)}`;
};
function page(name: string, layers: Layer[], notes: string, extra: Partial<Slide> = {}): Slide {
  const s = createSlide(name, layers, BG, { type: 'fade', duration: 0.6 });
  s.notes = notes;
  return Object.assign(s, extra);
}

// ─── Opening, and 1 · What even is AI? ────────────────────────────────────────
const slides: Slide[] = [];

// The cover: the talk's one opening (it replaces the four part covers).
slides.push(page('The Power of AI', [
  ...ground(null),
  mono('Kicker', 'UK Black Tech · UKBT Institute', at(110, 150, 1100, 48), LIME),
  display('Title', 'The Power\nof AI', at(104, 250, 1120, 560), 215, {}, { type: 'words', duration: 0.9, stagger: 0.08, easing: 'expoOut' }),
  aside('Aside', '(spoiler: it’s not just a chatbot)', at(110, 830, 1200, 110), 84, LIME, rise(0.9)),
  sticker('Sticker · generative', 'Generative', 1350, 250, 520, PURPLE, -6, { ...pop(1.1), loop: 'float', loopSpeed: 0.6, loopAmount: 0.6 }),
  sticker('Sticker · predictive', 'Predictive', 1440, 420, 460, BLUE, 5, { ...pop(1.25), loop: 'float', loopSpeed: 0.5, loopAmount: 0.6 }),
  sticker('Sticker · automation', 'Automation', 1330, 590, 520, ORANGE, -3, { ...pop(1.4), loop: 'float', loopSpeed: 0.55, loopAmount: 0.6 }),
  sticker('Sticker · agents', 'Agents', 1520, 760, 360, LIME, 7, { ...pop(1.55), loop: 'float', loopSpeed: 0.65, loopAmount: 0.6 }),
  mono('Speaker', 'Mark Martin MBE CITP', at(110, 975, 900, 48), MUTED, {}, { type: 'fade', duration: 0.5, delay: 1.2 }),
], 'THE POWER OF AI · ABOUT 40 MINUTES · FIVE QUESTIONS.\n\nLet the title and the spoiler land. "Artificial intelligence" is a broad umbrella term, but public conversation has shrunk it to one narrow branch: generative AI chatbots such as ChatGPT, Claude and Microsoft Copilot. The four stickers are the four kinds of AI we meet first; their colours stay the same all talk.'));

// Your speaker, before any data: who Mark is, and AI Awareness Day. The day's 2027 logo sits on its cream working
// ground with the words beside it in its ink and deep green (docs/aiad27-style-guide.md, sections 2 to 4); next
// year's ask sits on its Future strand, in black, as its contrast rules ask.
{
  const AIAD_INK = '#231F20', AIAD_CREAM = '#F6F4ED', AIAD_DIM = '#54504E', AIAD_FUTURE = '#FA83EB', AIAD_RESPONSIBLE_DEEP = '#176E3B';
  const aiadMark = createLayer('image', { name: 'AI Awareness Day logo', params: { src: '/assets/power-of-ai-fresh/aiad27-mark.svg', fit: 'contain', tone: 'light' }, anim: rise(0.6) });
  aiadMark.box = at(772, 461, 248, 248);
  const aiadQr = createLayer('image', { name: 'AI Awareness Day QR code', params: { src: qrCode('https://aiawarenessday.co.uk/', 'qr-aiawarenessday.svg', AIAD_CREAM, AIAD_INK, 'aiawarenessday.co.uk'), fit: 'contain', tone: 'light' }, anim: rise(0.9) });
  aiadQr.box = at(1540, 440, 236, 236);
  const portrait = createLayer('image', { name: 'Portrait', params: { src: '/assets/power-of-ai-fresh/mark-portrait.jpg', fit: 'cover', radius: 36, tone: 'light', focus: [0.5, 0.4] }, anim: { type: 'fade', duration: 0.7 } });
  portrait.box = at(110, 170, 580, 810);
  slides.push(page('Your speaker', [
    ...ground(deep(GREEN)), ...chrome('The Power of AI · Your speaker'),
    portrait,
    display('Title', 'Mark Martin MBE', at(740, 170, 1070, 130), 112, {}, rise(0.2)),
    chip('Field · education', 'Education', 740, 320, 260, GREEN, pop(0.4)),
    chip('Field · R&D', 'R&D', 981, 320, 150, GREEN, pop(0.5)),
    chip('Field · computer science', 'Computer Science', 1121, 320, 420, GREEN, pop(0.6)),
    // AI Awareness Day's own logo (aiad27-mark.svg, from its site's brand folder), on its cream working ground.
    shape('AIAD panel', at(740, 410, 1070, 350), { radius: 28, fill: AIAD_CREAM }, rise(0.5)),
    aiadMark,
    mono('Founder', 'Founder', at(1052, 456, 460, 44), AIAD_RESPONSIBLE_DEEP, { size: 30 }, rise(0.6)),
    text('Reach', 'Supporting AI literacy for over 1 million children across the country.', at(1052, 506, 460, 186), { size: 38, weight: '700', color: AIAD_INK, lineHeight: 1.18 }, rise(0.7)),
    text('AIAD · theme', '2027 theme: Keep Humans in the Loop', at(1052, 700, 460, 40), { size: 26, weight: '500', color: AIAD_DIM }, rise(0.8)),
    aiadQr,
    text('AIAD · site', 'aiawarenessday.co.uk', at(1516, 684, 284, 40), { size: 26, weight: '600', color: AIAD_INK, align: 'center' }, rise(0.9)),
    shape('Next year card', at(740, 790, 1070, 190), { radius: 28, fill: AIAD_FUTURE }, click(rise())),
    mono('Next year', 'Next year · Thursday 29 April 2027', at(790, 818, 970, 44), AIAD_INK, { size: 30 }, then({ type: 'fade', duration: 0.3 })),
    text('Next year · ask', 'We’re encouraging businesses like yours to take part.', at(790, 868, 970, 96), { size: 44, weight: '700', color: AIAD_INK, lineHeight: 1.1 }, then(rise())),
  ], 'YOUR SPEAKER · ABOUT 30 SECONDS. The QR code in the box opens the AI Awareness Day website, aiawarenessday.co.uk. Who you are, before any data: Mark Martin MBE, in education, R&D and computer science. Founder of AI Awareness Day, a nationwide campaign that builds AI literacy across schools; it supports over 1 million children across the country (its site says "we estimate we’re already reaching over 1,000,000 students").\n\nClick for the ask. Next year’s AI Awareness Day is on Thursday 29 April 2027, and its theme is "Keep Humans in the Loop", the same message as this talk. This time it is asking businesses like the ones in this room to take part.\n\nThen: "So, five questions."',
  { factCheck: { note: 'The date: AI Awareness Day’s site gives Thursday 29 April 2027 at the top of its page, but Friday 4 June 2027 in its display-board guidance. Confirm which is right before the day.' } }));
}

// Five questions: the one agenda, so no part needs a cover of its own. The labels over the slides repeat them.
const QUESTIONS = ['What even is AI?', 'Who’s actually using it?', 'What happens to my job?', 'Borrowed or owned?', 'How do I make it stick?'];
slides.push(page('Five questions', [
  ...ground(deep(LIME)), ...chrome('The Power of AI · Today'),
  display('Title', 'Five questions.', at(110, 300, 620, 330), 150),
  aside('Aside', '(and one thing to try tomorrow)', at(110, 660, 620, 200), 72, LIME, rise(0.5)),
  ...QUESTIONS.flatMap((q, i) => {
    const y = 180 + i * 162, d = 0.4 + i * 0.14;
    return [
      shape(`Row · ${i + 1}`, at(800, y, 1010, 140), { radius: 36, fill: CARD }, rise(d)),
      display(`Number · ${i + 1}`, `0${i + 1}`, at(846, y + 30, 130, 84), 76, { color: LIME, balance: false }, rise(d + 0.05)),
      display(`Question · ${i + 1}`, q, at(990, y + 38, 790, 66), 56, { balance: false }, rise(d + 0.08)),
    ];
  }),
], 'One talk, five questions. Read them out; the label at the top of every slide says which one we are on.\n\n01 What even is AI? (about 9 minutes). 02 Who’s actually using it? The UK numbers (about 8). 03 What happens to my job? A look inside the company that makes Claude (about 10). 04 Borrowed or owned? The idea the UKBT Institute is built on (about 6). 05 How do I make it stick? AI in your routine, without borrowing your skill: ten minutes a day from tomorrow, and the Institute’s method (about 7).\n\nBridge: "First question. When I say AI, what do you picture?"'));

// What people picture.
slides.push(page('What people picture', [
  ...ground(deep(PURPLE)), ...chrome(''),
  display('Title', 'Say “AI” and most people picture this:', at(110, 160, 1500, 260), 120),
  shape('Chat box', at(230, 470, 1460, 170), { radius: 85, fill: CARD, strokeWidth: 3, stroke: LINE }, rise(0.3)),
  text('Prompt', 'Ask me anything…', at(320, 518, 1100, 80), { size: 56, color: MUTED }, { type: 'typewriter', duration: 1.6, delay: 0.7, caret: true }),
  shape('Send', at(1556, 497, 116, 116), { shape: 'ellipse', fill: LIME }, pop(0.5)),
  icon('Send arrow', 'arrow-up', at(1574, 515, 80, 80), BLACK, pop(0.6)),
  chip('Tool · ChatGPT', 'ChatGPT', 230, 720, 330, PURPLE, pop(1.4)),
  chip('Tool · Claude', 'Claude', 580, 720, 300, PURPLE, pop(1.5)),
  chip('Tool · Copilot', 'Microsoft Copilot', 900, 720, 520, PURPLE, pop(1.6)),
  text('Prompt label', '↑ What you type here is called a prompt.', at(790, 646, 900, 66), { font: SERIF, italic: true, size: 46, color: LIME, align: 'right' }, rise(1.8)),
  aside('That’s one branch', 'That’s one branch of AI. There are at least four.', at(230, 830, 1500, 110), 84, LIME, click(rise())),
], 'Ask the room: "When I say AI, what do you picture?" Most people picture a chat box.\n\nBecause business owners and the public have mostly met conversational chatbots, many SMEs assume "adopting AI" simply means typing prompts into a box. Point at the box: "What you type here is called a prompt." Say that assumption out loud. Think that, and you miss the wider toolkit that does the real work: the forecasting, the document reading, the routing, the agents.\n\nClick: that is one branch. Over the next few slides we meet the other three, and why the difference matters for a business.'));

// The umbrella.
{
  const order: Kind[] = ['gen', 'pred', 'auto', 'agent'];
  const tiles = order.flatMap((k, i) => {
    const t = KINDS[k], x = 820 + (i % 2) * 510, y = 170 + Math.floor(i / 2) * 420;
    const a = click(pop());
    return [
      shape(`Tile · ${t.tag}`, at(x, y, 490, 400), { radius: 44, fill: t.colour }, a),
      mono(`Number · ${t.tag}`, t.n, at(x + 40, y + 36, 200, 48), BLACK, {}, then({ type: 'fade', duration: 0.2 })),
      icon(`Icon · ${t.tag}`, t.icon, at(x + 370, y + 30, 84, 84), BLACK, then({ type: 'fade', duration: 0.2 })),
      display(`Name · ${t.tag}`, t.name, at(x + 40, y + 150, 410, 150), 60, { color: BLACK, balance: false }, then({ type: 'fade', duration: 0.2 })),
      aside(`Nickname · ${t.tag}`, t.nick, at(x + 40, y + 308, 410, 66), 52, BLACK, then({ type: 'fade', duration: 0.2 })),
    ];
  });
  slides.push(page('AI is an umbrella', [
    ...ground(deep(LIME)), ...chrome(''),
    display('Title', 'AI is an umbrella.', at(110, 300, 650, 360), 150),
    aside('Aside', 'Four kinds sit under it. You’ve met one.', at(110, 690, 650, 200), 72, LIME, rise(0.4)),
    ...tiles,
  ], 'Four kinds, one click each. Give each its nickname as it lands.\n\n01 Generative: the public face. 02 Predictive and analytical: the quiet workhorse. 03 Automation and workflow: the efficiency engine. 04 Autonomous agents: the new frontier.\n\nOn the last click, ask the room: "Hands up for each kind you’ve used. One hand for one, two for two…"\n\nKeep the colours in mind: they stay the same for the rest of the talk.'));
}

// One kind each: a colour panel with its number, icon, name and nickname; what it does on the right.
function kindSlide(k: Kind, rows: { label: string; body?: string; chips?: string[] }[], notes: string, factCheck?: string): Slide {
  const t = KINDS[k];
  const layers: Layer[] = [
    ...ground(deep(t.colour)),
    shape('Panel', at(0, 0, 720, 1080), { radius: 0, fill: t.colour }, { type: 'wipeRight', duration: 0.7, easing: 'expoOut' }),
    mono('Number', `${t.n} / 04`, at(90, 90, 400, 48), BLACK),
    icon('Icon', t.icon, at(84, 230, 210, 210), BLACK, pop(0.3)),
    display('Name', t.name, at(90, 500, 560, 300), 96, { color: BLACK, balance: false }, rise(0.35)),
    aside('Nickname', t.nick, at(90, 830, 580, 110), 76, BLACK, rise(0.5)),
    mono('Brand', 'UK Black Tech', at(1310, 64, 500, 48), MUTED, { align: 'right' }),
  ];
  let y = 170;
  rows.forEach((r, i) => {
    const d = 0.6 + i * 0.25;
    layers.push(mono(`Label · ${r.label}`, r.label, at(820, y, 990, 48), t.colour, {}, { type: 'fade', duration: 0.5, delay: d }));
    y += 66;
    if (r.body) {
      const h = r.body.length > 76 ? 190 : r.body.length > 45 ? 130 : 70;
      layers.push(text(`Text · ${r.label}`, r.body, at(820, y, 990, h), { size: 52, weight: '500', lineHeight: 1.18 }, rise(d + 0.1)));
      y += h + 56;
    }
    if (r.chips) {
      let x = 820, line = 0;
      r.chips.forEach((c, j) => {
        const w = Math.min(990, 70 + c.length * 22);
        if (x + w > 1820) { x = 820; line++; }
        layers.push(chip(`Example · ${c}`, c, x, y + line * 84, w, t.colour, pop(d + 0.15 + j * 0.08)));
        x += w + 18;
      });
      y += (line + 1) * 84 + 48;
    }
  });
  return page(t.name, layers, notes, factCheck ? { factCheck: { note: factCheck } } : {});
}
slides.push(kindSlide('gen', [
  { label: 'What it does', body: 'Creates new text, images, code or audio, on demand.' },
  { label: 'You’ll know it as', chips: ['ChatGPT', 'Claude', 'Microsoft Copilot'] },
  { label: 'Watch out', body: 'Easy and impressive, so it owns the headlines. It can make things up (hallucinate), so a person checks its work.' },
], '01 · GENERATIVE AI, THE PUBLIC FACE. Tools that create new text, images, code or audio on demand. They are accessible and impressive, which is why they dominate the headlines. They are also prone to hallucinations and need constant human supervision.'));
slides.push(kindSlide('pred', [
  { label: 'What it does', body: 'Software that learns patterns from your past data.' },
  { label: 'It can', chips: ['Forecast cash flow', 'Predict stock demand', 'Flag late payers', 'Spot customers leaving'] },
  { label: 'Where it lives', body: 'Quietly, inside the accounting, customer records and stock software you may already use.' },
], '02 · PREDICTIVE AND ANALYTICAL AI, THE QUIET WORKHORSE. Machine-learning models that spot patterns in historical data: forecasting cash flow, predicting stock demand, flagging late-paying invoices, identifying customer churn (customers about to leave). These tools run quietly inside existing accounting, CRM and inventory software.'));
slides.push(kindSlide('auto', [
  { label: 'What it does', body: 'Does the routine work, with nobody typing a prompt.' },
  { label: 'It can', chips: ['Read invoices', 'Pull data from PDFs', 'Route support tickets', 'Transcribe meetings', 'Summarise meetings'] },
  { label: 'Why it matters', body: 'It works in the background of the job, not in a chat window.' },
], '03 · AUTOMATION AND WORKFLOW AI, THE EFFICIENCY ENGINE. Systems that extract data from PDFs, read invoices, route customer support tickets, or transcribe and summarise meetings, without anyone prompting them.'));
slides.push(kindSlide('agent', [
  { label: 'What it does', body: 'Goal-driven systems that plan multi-step tasks, use software tools and carry out workflows on their own.' },
  { label: 'It can', chips: ['Plan the steps', 'Use your tools', 'Finish the job'] },
  { label: 'Why now', body: 'Anthropic has measured the shift in its own company. We’ll look inside later.' },
], '04 · AUTONOMOUS AI AGENTS, THE NEW FRONTIER. Goal-driven systems that can plan multi-step tasks, use software tools and execute workflows independently.\n\nThis is the shift examined in Anthropic’s "How employment is changing at Anthropic" (16 October 2026), the third question of the talk. Keep its numbers for then: don’t give them away here.'));

// Why the mix-up costs you.
{
  const cards = [
    { n: '01', head: 'Wrong tool, wrong job', body: 'Chatbots are bad at exact sums, forecasts and strict look-ups. Force them and the errors pile up.', colour: ORANGE },
    { n: '02', head: 'AI you pay for but never switched on', body: 'Accounting, customer records and shop software often has AI built in. It sits unused because “AI” sounds like a new licence.', colour: BLUE },
    { n: '03', head: 'Getting the risk wrong', body: 'A chatbot fluffing a blog post is low stakes. AI deciding about a customer brings UK GDPR duties.', colour: PURPLE },
  ];
  slides.push(page('Why the mix-up costs you', [
    ...ground(deep(ORANGE)), ...chrome(''),
    display('Title', 'Why the mix-up costs you', at(110, 150, 1600, 150), 120),
    ...cards.flatMap((c, i) => {
      const x = 110 + i * 580;
      return [
        shape(`Card · ${c.n}`, at(x, 370, 550, 600), { radius: 44, fill: CARD }, click(rise())),
        shape(`Band · ${c.n}`, at(x, 370, 550, 16), { radius: 8, fill: c.colour }, then({ type: 'wipeRight', duration: 0.4 })),
        display(`Number · ${c.n}`, c.n, at(x + 44, 420, 300, 120), 110, { color: c.colour }, then({ type: 'fade', duration: 0.2 })),
        display(`Heading · ${c.n}`, c.head, at(x + 44, 560, 470, 150), 56, { balance: false }, then({ type: 'fade', duration: 0.2 })),
        text(`Text · ${c.n}`, c.body, at(x + 44, 730, 470, 220), { size: 40, color: MUTED, lineHeight: 1.28, fitGroup: 'mixup-cards' }, then({ type: 'fade', duration: 0.2 })),
      ];
    }),
  ], 'Three reasons, one click each.\n\n1. Using the wrong tool for the job: when a firm thinks AI equals a chatbot, staff force large language models to do tasks they are bad at, such as deterministic accounting, stock forecasting or strict database look-ups. Frustration and errors follow.\n\n2. Overlooking built-in tools: many UK SMEs already pay for predictive or automation AI inside platforms such as Xero, Sage, HubSpot or Shopify without switching those features on, because they assume AI means buying a separate chatbot licence.\n\n3. Misjudging risk and governance: a chatbot hallucinating a marketing blog post is low risk; an autonomous agent or a predictive credit-scoring model making decisions on customer data carries serious UK GDPR and compliance implications.\n\nThe legal hook, if asked: under the UK GDPR, people have rights around significant decisions made about them by automated means, including the right to have a person review them. The ICO’s guidance on AI and data protection covers it.',
  { factCheck: { note: 'Card 2: that many UK SMEs pay for unused AI features in platforms such as Xero, Sage, HubSpot or Shopify. Find a source before saying it as a finding.' } }));
}

// Which AI is it? The room shouts, the click shows the answer.
{
  const tasks: { task: string; kind: Kind }[] = [
    { task: 'Forecast next quarter’s cash flow', kind: 'pred' },
    { task: 'Pull the totals off a pile of supplier invoices', kind: 'auto' },
    { task: 'Critique my draft proposal', kind: 'gen' },
    { task: 'Handle a refund start to finish, with a human for anything odd', kind: 'agent' },
    { task: 'Spot the customers about to leave', kind: 'pred' },
    { task: 'Transcribe and summarise the team meeting', kind: 'auto' },
  ];
  const layers: Layer[] = [
    ...ground(deep(LIME)), ...chrome(''),
    display('Title', 'Which AI is it?', at(110, 130, 1100, 150), 130),
    sticker('Shout', 'Shout it out', 1420, 160, 390, LIME, 4, { ...pop(0.3), loop: 'pulse', loopSpeed: 0.6, loopAmount: 0.4 }),
  ];
  tasks.forEach((q, i) => {
    const x = 110 + (i % 3) * 580, y = 340 + Math.floor(i / 3) * 330, t = KINDS[q.kind];
    layers.push(
      shape(`Task card · ${i + 1}`, at(x, y, 550, 300), { radius: 40, fill: CARD }, rise(0.2 + i * 0.06)),
      display(`Task · ${i + 1}`, q.task, at(x + 40, y + 36, 470, 170), 48, { balance: false, lineHeight: 1.05 }, rise(0.25 + i * 0.06)),
    );
  });
  tasks.forEach((q, i) => {
    const x = 110 + (i % 3) * 580, y = 340 + Math.floor(i / 3) * 330, t = KINDS[q.kind];
    layers.push(sticker(`Answer · ${i + 1}`, t.tag, x + 40, y + 216, 420, t.colour, i % 2 ? 3 : -3, click(pop()), 38));
  });
  slides.push(page('Which AI is it?', layers, 'A quick-fire round. Read each task, let the room shout the kind, then click to show the answer sticker.\n\n1 Forecast cash flow: predictive. 2 Pull totals off supplier invoices: automation and workflow. 3 Critique a draft: generative. 4 Handle a refund end to end with a human for exceptions: an agent. 5 Spot customers about to leave: predictive. 6 Transcribe and summarise a meeting: automation. If someone shouts "generative" for the summary, they have a point: the summary is usually written by generative AI inside the meeting tool. Use it: the kinds overlap, and the skill is matching the tool to the task.\n\nThe chatbot habit against the right AI, if you want an example per answer:\n- Forecasting cash flow or sales: not pasting spreadsheets into a chatbot to guess next quarter, but the predictive AI built into accounting or ERP tools, modelling historical trends.\n- Processing supplier invoices: not copying invoice text into a prompt one by one, but document and workflow AI (OCR plus automated rules) extracting and matching the data.\n- Writing and brainstorming: not blindly handing over final client proposals, but generative AI as a sparring partner to critique drafts and test ideas.\n- Multi-step customer support: not an unsupervised chatbot making refund promises, but an agent with strict standing instructions and a human for exceptions.\n\nLand it: only one of the six is a chatbot job. AI is not a chatbot. It is a toolkit, and the skill is matching the type of intelligence to the job.\n\nBridge: "AI is a toolkit, not a chatbot. So who’s actually using the toolkit? Five big UK reports landed this year."'));
}

// ─── 2 · Who’s actually using it? The UK picture ─────────────────────────────
// Every figure here was checked against its source on 16 November 2026, except FSB's, which come from
// trade-press reports of its report (that slide carries a fact check).
const count = (delay = 0): A => ({ type: 'count', duration: 1.4, delay, easing: 'expoOut' });
const source = (value: string) => text('Source', value, at(110, 984, 1700, 50), { font: MONO, size: 30, color: MUTED, lineHeight: 1.2 }, { type: 'fade', duration: 0.5, delay: 0.6 });
/** A bar drawn to scale: its track, then its fill wiping in to the value. */
function bar(name: string, value: number, x: number, y: number, w: number, h: number, colour: string, anim: A = { type: 'wipeRight', duration: 1, delay: 0.4, easing: 'expoOut' }): Layer[] {
  return [
    shape(`Track · ${name}`, at(x, y, w, h), { radius: h / 2, fill: CARD }, { type: 'fade', duration: 0.4 }),
    shape(`Bar · ${name}`, at(x, y, Math.max(h, (w * value) / 100), h), { radius: h / 2, fill: colour }, anim),
  ];
}

// It doubled in a year (DSIT).
slides.push(page('It doubled in a year', [
  ...ground(deep(LIME)), ...chrome(''),
  mono('Kicker', 'Government (DSIT) · AI adoption survey · October 2026', at(110, 170, 1500, 48), LIME),
  display('Title', 'It doubled in a year.', at(110, 230, 1700, 150), 120),
  display('Number', '32%', at(96, 410, 860, 380), 380, { color: LIME, balance: false }, count(0.3)),
  text('Caption', 'of UK businesses used at least one AI tool in 2026', at(110, 800, 760, 140), { size: 48, weight: '500' }, rise(0.6)),
  mono('Label · 2025', '2025', at(1010, 450, 300, 48), MUTED),
  ...bar('2025', 16, 1010, 510, 800, 84, MUTED),
  display('Value · 2025', '16%', at(1010 + 800 * 0.16 + 30, 512, 260, 84), 72, { color: MUTED, balance: false }, rise(1)),
  mono('Label · 2026', '2026', at(1010, 660, 300, 48), LIME),
  ...bar('2026', 32, 1010, 720, 800, 84, LIME, { type: 'wipeRight', duration: 1, delay: 0.9, easing: 'expoOut' }),
  display('Value · 2026', '32%', at(1010 + 800 * 0.32 + 30, 722, 260, 84), 72, { color: LIME, balance: false }, rise(1.5)),
  source('Source: DSIT, AI adoption survey 2026 (29 October 2026) · 3,503 businesses, January to April 2026'),
], 'SECOND QUESTION · WHO’S ACTUALLY USING IT? · ABOUT 8 MINUTES. Five major UK reports on small-business AI landed in 2026: the government (DSIT), the statisticians (ONS), a bank (NatWest), the chambers (BCC) and the small-business federation (FSB). Use roughly doubled in a year, but there is a sharp divide between trying the tools and changing how the business works.\n\nAsk first, then let the number land: "Hands up if your business uses at least one AI tool."\n\nDSIT, "AI adoption survey 2026" (29 October 2026): 3,503 telephone interviews between 7 January and 21 April 2026, plus 50 in-depth interviews and 7 site visits. 32% of UK businesses used at least one AI technology, against 16% in 2025. Larger firms: 52%.\n\nNot on the slide: a breakdown of 27% micro, 34% small and 47% medium is quoted in coverage, but it is not in DSIT’s executive summary. Check the full report before quoting it.'));

// It depends who you ask: five surveys on one scale.
{
  const marks = [
    { who: 'DSIT', v: 32, what: 'UK firms', colour: PURPLE, up: true, lift: 0 },
    { who: 'ONS', v: 35, what: 'firms, 10+ staff', colour: BLUE, up: false, lift: 0 },
    { who: 'NatWest', v: 44, what: 'firms', colour: ORANGE, up: true, lift: 0 },
    { who: 'BCC', v: 54, what: 'mostly SMEs', colour: LIME, up: false, lift: 0 },
    { who: 'FSB', v: 55, what: 'small firms', colour: GREEN, up: true, lift: 0 },
  ];
  // A dot plot, so the scale can start above zero: 25% to 60%, where the five surveys fall.
  const LO = 25, HI = 60, X0 = 160, W = 1600, Y = 600, x = (v: number) => X0 + (W * (v - LO)) / (HI - LO);
  const layers: Layer[] = [
    ...ground(deep(BLUE)), ...chrome(''),
    display('Title', 'Depends who you ask.', at(110, 140, 1700, 150), 120),
    text('Who’s who', 'DSIT: the government · ONS: national statistics · NatWest: a bank · BCC: chambers of commerce · FSB: small-business federation', at(110, 296, 1700, 76), { size: 30, color: MUTED, lineHeight: 1.2 }, rise(0.3)),
    shape('Scale', at(X0, Y - 6, W, 12), { radius: 6, fill: LINE }, { type: 'wipeRight', duration: 0.8 }),
    ...[25, 30, 40, 50, 60].map((t) => mono(`Tick · ${t}%`, `${t}%`, at(x(t) - 60, Y + 26, 120, 48), MUTED, { align: 'center' })),
  ];
  marks.forEach((m, i) => {
    const a = click(pop());
    const stemH = 100 + m.lift, top = m.up ? Y - stemH - 128 : Y + stemH + 6;
    layers.push(
      shape(`Dot · ${m.who}`, at(x(m.v) - 22, Y - 22, 44, 44), { shape: 'ellipse', fill: m.colour }, a),
      shape(`Stem · ${m.who}`, at(x(m.v) - 2, m.up ? Y - stemH : Y + 22, 4, stemH - 22), { radius: 2, fill: m.colour }, then({ type: 'fade', duration: 0.2 })),
      display(`Value · ${m.who}`, `${m.v}%`, at(x(m.v) - 200, top, 400, 76), 72, { color: m.colour, align: 'center', balance: false }, then({ type: 'fade', duration: 0.2 })),
      text(`Who · ${m.who}`, `${m.who} · ${m.what}`, at(x(m.v) - 220, top + 76, 440, 48), { font: MONO, size: 30, color: INK, align: 'center' }, then({ type: 'fade', duration: 0.2 })),
    );
    void i;
  });
  layers.push(aside('Aside', 'A third to a half of firms, depending on who’s counting, and how.', at(110, 930, 1700, 80), 64, LIME, then(rise())));
  slides.push(page('Depends who you ask', layers, 'Five surveys, five numbers, and they are not contradicting each other: each asks a different question of different firms. Say the range, not one figure.\n\nDSIT 32% of UK businesses used at least one AI technology (October 2026). ONS about 35% of businesses with 10 or more staff (June 2026). NatWest 44% of firms use AI (September 2026). BCC 54% of firms actively using AI, 94% of them SMEs (March 2026). FSB 55% of small firms, up from 20% in 2023 (July 2026; from press reports of the FSB’s "The Confidence Code").',
  { factCheck: { note: 'The FSB figure (55%) comes from press reports of “The Confidence Code” (July 2026); the FSB report itself was not opened. Check it before the day.' } }));
}

// Size matters (ONS and NatWest): columns drawn to scale.
{
  const cols = [
    { label: '0–9 staff', v: 28, who: 'ONS', x: 150, colour: MUTED },
    { label: '250+ staff', v: 49, who: 'ONS', x: 420, colour: BLUE },
    { label: 'Smaller firms', v: 36, who: 'NatWest', x: 1060, colour: MUTED },
    { label: '100+ staff', v: 67, who: 'NatWest', x: 1330, colour: ORANGE },
  ];
  const base = 880, full = 560, w = 220;
  const layers: Layer[] = [
    ...ground(deep(BLUE)), ...chrome(''),
    display('Title', 'Bigger firms are further ahead.', at(110, 140, 1700, 150), 112),
    shape('Baseline', at(110, base, 1700, 4), { radius: 2, fill: LINE }),
    mono('Group · ONS', 'ONS · June 2026', at(150, base + 70, 520, 48), BLUE),
    mono('Group · NatWest', 'NatWest · September 2026', at(1060, base + 70, 640, 48), ORANGE),
  ];
  cols.forEach((c, i) => {
    const h = (full * c.v) / 100;
    layers.push(
      shape(`Column · ${c.label}`, at(c.x, base - h, w, h), { radius: 24, fill: c.colour }, { type: 'wipeUp', duration: 0.9, delay: 0.3 + i * 0.15, easing: 'expoOut' }),
      display(`Value · ${c.label}`, `${c.v}%`, at(c.x - 20, base - h - 100, w + 40, 90), 84, { color: c.colour === MUTED ? INK : c.colour, align: 'center', balance: false }, count(0.4 + i * 0.15)),
      text(`Label · ${c.label}`, c.label, at(c.x - 30, base + 14, w + 60, 50), { size: 36, weight: '600', align: 'center' }, rise(0.5 + i * 0.15)),
    );
  });
  slides.push(page('Bigger firms are further ahead', layers, 'Ask: "Hands up if you have fewer than ten staff." The smallest firms are furthest behind, and that is most of this room.\n\nONS, "Artificial intelligence in UK businesses: 2023 to 2026" (20 July 2026, BICS wave 159, fieldwork 5 to 28 June 2026): 28% of firms with 0 to 9 employees use AI, against 49% of those with 250 or more.\n\nNatWest Group, AI growth gap research (25 September 2026, 1,400 UK SMEs and mid-market firms): 36% of smaller firms use AI, against 67% of those with more than 100 staff. NatWest does not state the cut-off for "smaller".\n\nAnd by sector, in one line: ONS (20 July 2026, firms with 10 or more staff) finds adoption highest in information and communication, where almost three-fifths (58%) use AI, and as low as 13% in construction, about one in eight. The ONS article does not call construction the lowest of all industries, so do not say it is.'));
}

// Wide, not deep (NatWest): six dots in a hundred.
{
  const layers: Layer[] = [...ground(deep(LIME)), ...chrome(''),
    display('Title', 'Wide, not deep.', at(110, 140, 1700, 150), 120)];
  const X = 110, Y = 330, D = 46, G = 14;
  for (let i = 0; i < 100; i++) {
    const lit = i < 6, cx = X + (i % 10) * (D + G), cy = Y + Math.floor(i / 10) * (D + G);
    layers.push(shape(`Dot ${i + 1}`, at(cx, cy, D, D), { shape: 'ellipse', fill: lit ? LIME : LINE },
      lit ? click({ type: 'pop', duration: 0.5, delay: 0, easing: 'springPlayful' }) : { type: 'fade', duration: 0.3, delay: 0.2 + i * 0.006 }));
  }
  // The lit dots come one after another on the click.
  for (let i = 1; i < 6; i++) layers[layers.length - 100 + i].anim = { ...layers[layers.length - 100 + i].anim, trigger: 'afterPrev', delay: 0, duration: 0.25 };
  layers.push(
    display('Number', '6%', at(800, 320, 600, 240), 240, { color: LIME, balance: false }, then(count())),
    text('Caption', 'of firms have reached “transforming”: AI built into how they work.', at(810, 570, 1000, 140), { size: 48, weight: '500' }, then(rise())),
    sticker('Exploring', 'Exploring', 810, 760, 340, MUTED, -2, then(pop()), 34, BLACK),
    text('Exploring saves', 'saves 1–10% of working time', at(1180, 762, 640, 56), { size: 44 }, then(rise())),
    sticker('Transforming', 'Transforming', 810, 860, 380, LIME, 2, then(pop()), 34, BLACK),
    text('Transforming saves', 'saves 61–70%', at(1220, 862, 600, 56), { size: 44, weight: '700', color: LIME }, then(rise())),
    source('Source: NatWest Group, AI growth gap research (25 September 2026) · 1,400 UK SMEs and mid-market firms'),
  );
  slides.push(page('Wide, not deep', layers, 'NatWest Group (25 September 2026): 44% of businesses use AI, but 29% of those using it are still in the earliest piloting and awareness stages, saving 1 to 10% of working time. Only 6% have reached the transforming stage, where savings average 61 to 70%. NatWest’s own release is unclear whether the 6% is of all firms or of users, so say "about one in twenty". The barriers it names: skills, cost, uncertainty over which tools to use, in-house expertise, and security.\n\nOne click lights the six dots.\n\nLand the UK picture here: everyone’s trying it, almost nobody’s transformed. Trying AI is now normal, a third to a half of firms; changing how the business works with it is rare, about one in twenty. Surface use, not deep: most firms use chat tools for admin and marketing (DSIT, NatWest), not new ways of working. That gap is the opportunity.\n\nBridge, which also squares the 95% with what comes next: "In small firms today, jobs haven’t gone. At the frontier, the shape of jobs is changing. Here’s a glimpse, inside the company that makes Claude."',
  // Hidden by the speaker in the studio (16 November); "It’s helping. It’s worrying." carries its landing line.
  { hidden: true }));
}

// What it’s used for (DSIT): generative, mostly.
{
  const rows = [{ label: 'Admin', v: 81 }, { label: 'Marketing', v: 71 }, { label: 'IT', v: 66 }];
  const layers: Layer[] = [
    ...ground(deep(PURPLE)), ...chrome(''),
    display('Title', 'Mostly admin and marketing.', at(110, 140, 1700, 150), 112),
    mono('Kicker', 'Of firms using, or planning to use, AI', at(110, 300, 1400, 48), PURPLE),
  ];
  rows.forEach((r, i) => {
    const y = 390 + i * 150;
    layers.push(
      display(`Label · ${r.label}`, r.label, at(110, y + 6, 420, 90), 72, { balance: false }, rise(0.2 + i * 0.15)),
      ...bar(r.label, r.v, 560, y, 1000, 96, PURPLE, { type: 'wipeRight', duration: 1, delay: 0.4 + i * 0.15, easing: 'expoOut' }),
      display(`Value · ${r.label}`, `${r.v}%`, at(1590, y + 4, 230, 92), 84, { color: PURPLE, balance: false }, count(0.5 + i * 0.15)),
    );
  });
  layers.push(
    sticker('Generative', 'Generative', 110, 860, 330, PURPLE, -3, click(pop()), 34),
    text('LLMs', '77% use large language models: the chat tools from the start of the talk.', at(480, 862, 1340, 64), { size: 48, weight: '600' }, then(rise())),
    source('Source: DSIT, AI adoption survey 2026 (29 October 2026)'),
  );
  slides.push(page('Mostly admin and marketing', layers, 'DSIT (October 2026), among businesses using or planning to use AI: administration 81%, marketing 71%, IT 66%. Use is concentrated in natural language processing and text generation; large language models account for 77% of users or planned users.\n\nThe link back to the four kinds: most firms are using the public face of AI, generative chat tools, for admin and marketing. The other three kinds are mostly untouched.'));
}

// Helping, worrying, and not replacing people (FSB and BCC): three numbers, one each.
{
  const stats = [
    { v: '59%', what: 'of small firms using AI say it has improved productivity', who: 'FSB · July 2026', colour: LIME },
    { v: '92%', what: 'worry about the risks: data, copyright and liability', who: 'FSB · July 2026', colour: ORANGE },
    { v: '95%', what: 'of SMEs using AI say their headcount hasn’t changed', who: 'BCC · March 2026', colour: BLUE },
  ];
  const layers: Layer[] = [
    ...ground(deep(ORANGE)), ...chrome(''),
    display('Title', 'It’s helping. It’s worrying. It isn’t replacing people.', at(110, 140, 1700, 230), 104),
  ];
  stats.forEach((s, i) => {
    const x = 110 + i * 580, y = 410, first = i === 0;
    layers.push(
      shape(`Card · ${s.v}`, at(x, y, 550, 470), { radius: 44, fill: CARD }, first ? rise(0.2) : click(rise())),
      mono(`Who · ${s.v}`, s.who, at(x + 44, y + 40, 470, 44), s.colour, { size: 30 }, first ? rise(0.3) : then({ type: 'fade', duration: 0.2 })),
      display(`Value · ${s.v}`, s.v, at(x + 36, y + 100, 480, 200), 200, { color: s.colour, balance: false }, first ? count(0.4) : then(count())),
      text(`Caption · ${s.v}`, s.what, at(x + 44, y + 310, 470, 140), { size: 42, weight: '500', lineHeight: 1.22, fitGroup: 'uk-captions' }, first ? rise(0.6) : then(rise())),
    );
  });
  layers.push(source('Sources: FSB, The Confidence Code (July 2026), from press reports · BCC, Future of Work: AI in the Workplace (March 2026)'));
  slides.push(page('It’s helping. It’s worrying.', layers, 'Three numbers, one per click. Ask on the second: "Hands up if data, copyright or liability worries you."\n\nFSB, "The Confidence Code: The Challenges and Opportunities of AI for Small Firms" (July 2026), as reported in the trade press: AI use among small firms has risen to 55%, from 20% in 2023; 59% of users say it has improved their productivity; 92% worry about the risks, with fears around data, liability and copyright holding many back. FSB estimates wider and deeper adoption could add more than £42 billion a year to the UK economy; that is a projection built on assumptions, so say it as one. Not on the slide: a 24% revenue-growth figure is quoted in some coverage but could not be confirmed.\n\nBritish Chambers of Commerce with Atos, analysis by ISER/MiSoC at the University of Essex, "Future of Work: AI in the Workplace" (19 March 2026; 668 firms, 94% SMEs): 54% actively use AI; 95% of SMEs using AI report no change to workforce size over the past year; 86% say job roles are unchanged. About one in ten has gone further, into AI built for their business.\n\nONS (20 July 2026): of businesses citing a lack of AI expertise, around 62% train or retrain existing staff, against around 26% of businesses reporting no barriers. Train, don’t just hire.\n\nSo far, small firms are using AI to back their people, not to replace them.\n\nLand the UK picture here (Wide, not deep is hidden): everyone’s trying it, almost nobody’s transformed. Trying AI is now normal, a third to a half of firms; changing how the business works with it is rare, about one in twenty (NatWest). That gap is the opportunity.\n\nBridge, which also squares the 95% with what comes next: "In small firms today, jobs haven’t gone. At the frontier, the shape of jobs is changing. Here’s a glimpse, inside the company that makes Claude."',
  { factCheck: { note: 'The FSB figures (59%, 92% and the £42bn projection) come from press reports of “The Confidence Code” (July 2026); the FSB report itself was not opened. Check them before the day.' } }));
}

// ─── 3 · What happens to my job? Over the horizon, inside Anthropic ──────────
// From Anthropic, "How employment is changing at Anthropic" (Wilmers, Catipon, Massenkoff and McCrory,
// 16 October 2026), checked against the report on 16 November 2026. Left out because the report does not
// say them: an output range of 1.4× to 5.1× across departments, AI tool mentions "in job listings" (they are
// in hiring managers' interview notes), and staff "pressured to delegate the tasks they were hired to do".
const ANTHROPIC = 'Source: Anthropic, How employment is changing at Anthropic (16 October 2026)';

// Why look at an AI company?
slides.push(page('Why look at an AI company?', [
  ...ground(deep(LIME)), ...chrome(''),
  display('Title', 'Why look at an AI company?', at(110, 150, 900, 330), 120),
  aside('Aside', 'Jobs in small firms haven’t gone. Where agents arrive first, their shape is changing. A glimpse, not a forecast.', at(110, 520, 840, 330), 62, LIME, rise(0.4)),
  shape('Report card', at(1010, 170, 800, 760), { radius: 44, fill: CARD }, rise(0.3)),
  icon('Compass', 'compass', at(1070, 220, 110, 110), LIME, pop(0.5)),
  mono('Date', 'Anthropic · 16 October 2026', at(1070, 370, 700, 48), LIME, {}, rise(0.5)),
  display('Report title', 'How employment is changing at Anthropic', at(1070, 430, 680, 200), 64, { balance: false }, rise(0.6)),
  mono('Read', 'What they looked at', at(1070, 660, 700, 48), MUTED, {}, rise(0.7)),
  // The chips sit where the speaker moved them in the studio (16 November).
  chip('Hiring records', 'Hiring records', 1070, 738, 330, LIME, pop(0.8)),
  chip('Software logs', 'Software logs', 1420, 738, 320, LIME, pop(0.9)),
  chip('Calendars', 'Calendars', 1070, 845, 260, LIME, pop(1)),
  chip('17 interviews', '17 staff interviews', 1350, 845, 400, LIME, pop(1.1)),
], 'THIRD QUESTION · WHAT HAPPENS TO MY JOB? · ABOUT 10 MINUTES. The question everyone in the room has: what happens to my job, and my team’s? Most small firms are only starting with AI, and their jobs haven’t gone: 95% say headcount hasn’t changed (BCC). What changes first, at the frontier, is the shape of the work. One company is years ahead, because it makes the tools: Anthropic studied what happened inside it as AI agents spread. That is our look over the horizon.\n\nAnthropic, "How employment is changing at Anthropic" (Wilmers, Catipon, Massenkoff and McCrory, 16 October 2026). It drew on hiring records, output measures, surveys, communications, calendars and 17 employee interviews.\n\nSay why it matters: this is a company where AI agents are already part of everyone’s day, so it shows what a workplace looks like when they scale. It is not typical, and the authors say so (we come back to their caveats before the lessons).'));

// Six agent hours for every human hour.
{
  const layers: Layer[] = [
    ...ground(deep(LIME)), ...chrome(''),
    display('Title', 'Six agent hours for every human hour.', at(110, 150, 1700, 150), 112),
    aside('Agent hours', 'Agent hours: time the AI spent working on tasks by itself.', at(110, 316, 1700, 76), 52, LIME, rise(0.3)),
  ];
  for (let i = 0; i < 6; i++) {
    layers.push(shape(`Agent disc ${i + 1}`, at(110 + i * 180, 420, 160, 160), { shape: 'ellipse', fill: LIME }, pop(0.3 + i * 0.1)));
    layers.push(icon(`Agent ${i + 1}`, 'bot', at(140 + i * 180, 450, 100, 100), BLACK, pop(0.35 + i * 0.1)));
  }
  layers.push(
    display('To', 'to', at(1210, 445, 160, 110), 96, { color: MUTED, align: 'center', balance: false }, rise(1)),
    shape('Person disc', at(1400, 420, 160, 160), { shape: 'ellipse', fill: INK }, pop(1.1)),
    icon('Person', 'user', at(1430, 450, 100, 100), BLACK, pop(1.15)),
    text('Caption', 'By August 2026, staff’s own AI agents logged six hours of work for every hour their people worked.', at(110, 650, 1500, 150), { size: 56, weight: '600', lineHeight: 1.2 }, rise(1.2)),
    text('First', 'Agent hours first passed human hours in March 2026. That’s hours of activity, not business value.', at(110, 830, 1600, 120), { size: 44, color: MUTED, lineHeight: 1.25 }, rise(1.4)),
    source(ANTHROPIC),
  );
  slides.push(page('Six agent hours for every human hour', layers, 'The headline number: across the company, agent hours first passed human hours in March 2026; by August, staff’s own agents were logging about six hours for every hour their human handlers worked.\n\nSay what it measures: hours of activity, not business value. The authors are careful about that, and so should we be.\n\nAgent hours, plainly: time the AI spent working on tasks by itself.\n\nFor you: these are engineers, but the room works in admin and marketing. Picture an assistant drafting your emails, quotes and posts by itself all week. That is what agent hours are.'));
}

// The agent is mostly waiting for you, and how that feels.
slides.push(page('Most of the time, the agent is waiting', [
  ...ground(deep(BLUE)), ...chrome(''),
  display('Title', 'Most of the time, the agent is waiting for you.', at(110, 150, 1700, 240), 112),
  shape('Waiting', at(110, 430, 1360, 150), { radius: 40, fill: BLUE }, { type: 'wipeRight', duration: 1, delay: 0.3, easing: 'expoOut' }),
  shape('The rest', at(1490, 430, 320, 150), { radius: 40, fill: LINE }, { type: 'fade', duration: 0.5, delay: 1 }),
  icon('Hourglass', 'hourglass', at(150, 465, 80, 80), BLACK, pop(0.9)),
  display('Value · waiting', '~80%', at(250, 452, 400, 110), 104, { color: BLACK, balance: false }, count(0.8)),
  text('Label · waiting', 'of every stretch of work with an agent, spent waiting for a person', at(660, 452, 790, 110), { size: 40, weight: '600', color: BLACK, lineHeight: 1.15 }, rise(1)),
  text('Label · rest', 'the agent actually working', at(1505, 450, 290, 110), { size: 34, color: MUTED, align: 'center', lineHeight: 1.1 }, rise(1.1)),
  mono('Label · babysitting', 'How it feels', at(110, 650, 900, 48), PURPLE, {}, click(rise())),
  aside('Quote', '“…every child brings to you concerns with an equal demand for your attention.”', at(110, 710, 1700, 170), 76, INK, then(rise())),
  text('Who · quote', 'An Anthropic employee, on running several agents at once: like babysitting.', at(110, 890, 1700, 60), { size: 40, color: MUTED }, then(rise())),
  source(ANTHROPIC),
], 'The bottleneck has moved. Around 80% of a Claude session is spent idly waiting for human input: review, clarification, approval. And for non-technical groups, reading all the output their interactive sessions produce would take over half the work week (the authors’ estimate, from text volume and an assumed reading speed of 250 words a minute).\n\nClick: how it feels. Staff running several agents in parallel described a stream of notifications and approval requests; one compared it to babysitting, where every child "brings to you concerns with an equal demand for your attention". Others described themselves as "bottlenecking the agents": the slow part, holding the agents up.\n\nAsk the room: "Who here already feels like the bottleneck for their own team?"\n\nFor you: it’s the AI-drafted quotes, replies and posts sitting in a queue, waiting for your yes.\n\nThe point for the room: agents don’t remove the work. They move it, from doing to checking.'));

// More output, and a new job: managing the agents.
slides.push(page('More output, and a new job', [
  ...ground(deep(PURPLE)), ...chrome(''),
  display('Title', 'More output. And a new job: managing it.', at(110, 150, 1700, 150), 104),
  shape('Card · commits', at(110, 350, 800, 600), { radius: 44, fill: CARD }, rise(0.2)),
  display('Value · commits', '5×', at(160, 370, 700, 210), 210, { color: LIME, balance: false }, count(0.4)),
  text('Caption · commits', 'pieces of finished work saved per engineer, against six months before', at(160, 590, 700, 120), { size: 40, weight: '500', lineHeight: 1.2 }, rise(0.6)),
  text('Caption · undone', 'And undone later no more often than work people did by hand.', at(160, 720, 700, 100), { size: 36, color: MUTED, lineHeight: 1.25 }, rise(0.8)),
  sticker('Caveat', 'More output ≠ better output', 160, 856, 680, ORANGE, -2, pop(1), 32),
  mono('Head · meta', 'The new job: “meta-work”', at(1000, 360, 810, 48), PURPLE, {}, click({ type: 'fade', duration: 0.4 })),
  text('Meta · what', 'Writing rules for the AI, building checks, reviewing the output.', at(1000, 420, 810, 110), { size: 40, weight: '500', lineHeight: 1.22 }, then(rise())),
  mono('Label · autumn', 'Autumn 2025', at(1000, 560, 400, 44), MUTED, { size: 30 }, then({ type: 'fade', duration: 0.2 })),
  ...bar('autumn', 10 * 3, 1000, 606, 560, 64, MUTED, then({ type: 'wipeRight', duration: 0.7 })),
  display('Value · autumn', '10%', at(1000 + 560 * 0.3 + 24, 606, 200, 64), 60, { color: MUTED, balance: false }, then({ type: 'fade', duration: 0.2 })),
  mono('Label · spring', 'Spring 2026', at(1000, 700, 400, 44), PURPLE, { size: 30 }, then({ type: 'fade', duration: 0.2 })),
  ...bar('spring', 22 * 3, 1000, 746, 560, 64, PURPLE, then({ type: 'wipeRight', duration: 0.9 })),
  display('Value · spring', '22%', at(1000 + 560 * 0.66 + 24, 746, 200, 64), 60, { color: PURPLE, balance: false }, then({ type: 'fade', duration: 0.2 })),
  text('Bar note', 'of the average person’s work sessions with AI', at(1000, 824, 810, 50), { size: 32, color: MUTED }, then({ type: 'fade', duration: 0.2 })),
  text('Instructions', '8,500 written rules the AI follows every time,\nup from a few hundred a year before', at(1000, 870, 810, 96), { size: 38, weight: '700', color: LIME, lineHeight: 1.2 }, then(rise())),
  source(ANTHROPIC),
], 'Output went up sharply. Each engineer saved about five times as many code commits (saved code changes) as six months earlier. Comparing 192 engineers who adopted coding agents with 74 who did not, agent-written code was no more likely to be deleted or rolled back later. Other teams (data scientists, lawyers, accounts payable, sales) also rose, but the report gives no multiples for them, so neither do we. The authors’ own warning, on the sticker in plain words: more code is not necessarily better code, and AI errors may be harder to spot.\n\nClick: the new job. When reviewing raw output is exhausting, people build the system instead. "Meta-work" (managing the AI: writing standing instructions, written rules for the agents, monitoring, reviewing output) rose from 10% of the average employee’s AI sessions in autumn 2025 to 22% in spring 2026. Standing instructions grew from a few hundred in July 2025 to 8,500 a year later.\n\nThe bars are drawn to scale against a third of all sessions, so 22% is just over twice 10%, as it should be.\n\nFor you: five times the drafts is five times the checking. Meta-work is your brand guide, your email templates, the checklist you write once for the AI to follow every time.'));

// Who gets hired is changing.
{
  const cols = [
    { label: 'Junior share of tech hires', from: 27, to: 9, x: 110 },
    { label: 'Junior share of tech staff', from: 21, to: 14, x: 760 },
  ];
  const base = 820, full = 440, w = 220;
  const layers: Layer[] = [
    ...ground(deep(ORANGE)), ...chrome(''),
    display('Title', 'Who gets hired is changing.', at(110, 150, 1700, 150), 112),
    shape('Baseline', at(110, base, 1240, 4), { radius: 2, fill: LINE }),
    shape('Key · before', at(760, 338, 30, 30), { radius: 6, fill: MUTED }, rise(0.2)),
    text('Key · before label', 'Early 2025', at(804, 326, 230, 52), { size: 34, weight: '600' }, rise(0.2)),
    shape('Key · after', at(1050, 338, 30, 30), { radius: 6, fill: ORANGE }, rise(0.3)),
    text('Key · after label', 'By the 2026 report', at(1094, 326, 310, 52), { size: 34, weight: '600', color: ORANGE }, rise(0.3)),
  ];
  cols.forEach((c, i) => {
    const h1 = (full * c.from) / 30, h2 = (full * c.to) / 30;
    layers.push(
      shape(`Before · ${c.label}`, at(c.x, base - h1, w, h1), { radius: 24, fill: MUTED }, { type: 'wipeUp', duration: 0.8, delay: 0.3 + i * 0.3 }),
      display(`Before value · ${c.label}`, `${c.from}%`, at(c.x - 20, base - h1 - 96, w + 40, 86), 80, { color: INK, align: 'center', balance: false }, rise(0.5 + i * 0.3)),
      shape(`After · ${c.label}`, at(c.x + w + 30, base - h2, w, h2), { radius: 24, fill: ORANGE }, { type: 'wipeUp', duration: 0.8, delay: 0.5 + i * 0.3 }),
      display(`After value · ${c.label}`, `${c.to}%`, at(c.x + w + 10, base - h2 - 96, w + 40, 86), 80, { color: ORANGE, align: 'center', balance: false }, count(0.7 + i * 0.3)),
      text(`Label · ${c.label}`, c.label, at(c.x, base + 20, w * 2 + 30, 60), { size: 36, weight: '600', align: 'center' }, rise(0.8 + i * 0.3)),
    );
  });
  layers.push(
    text('Tripled', 'while the company tripled in size', at(110, 900, 1240, 60), { size: 40, color: MUTED, align: 'center' }, rise(1.4)),
    shape('Card · interviews', at(1420, 330, 390, 590), { radius: 44, fill: CARD }, click(rise())),
    icon('Briefcase', 'briefcase', at(1460, 370, 90, 90), LIME, then(pop())),
    display('Value · interviews', '3–4×', at(1460, 480, 320, 150), 130, { color: LIME, balance: false }, then(rise())),
    text('Caption · interviews', 'more mentions of a candidate’s AI tool use in interview notes, 2024 to 2026', at(1460, 650, 320, 250), { size: 36, weight: '500', lineHeight: 1.3 }, then(rise())),
    source(ANTHROPIC),
  );
  slides.push(page('Who gets hired is changing', layers, 'The junior share of technical hires fell from 27% to 9%, and the junior share of technical staff from 21% to 14% since early 2025, while the company tripled in size. So the share falling does not by itself mean fewer juniors. Junior postings fell sharply after December 2025, and administrative hiring has not grown with the company, which the authors call "clerical-light".\n\nIn hiring managers’ interview notes, mentions of a candidate’s AI tool use tripled for technical roles and quadrupled for non-technical roles between 2024 and 2026 (from about 5% and 7% of assessments). These are interview notes, not job adverts. What it signals: judgement, autonomy and directing AI matter more; narrow manual execution matters less.\n\nThe columns are drawn to scale, from zero to 30%: grey is early 2025, orange is the share by the October 2026 report.\n\nFor you: think of the routine admin and marketing tasks a junior used to learn the job on. If AI does them, how does your next junior learn?\n\nTurn to your neighbour, 30 seconds: "Which entry-level job in your firm changes first?"'));
}

// Read it with care.
{
  const cards = [
    { head: 'An unusual company', body: 'Much of what happens there can’t be copied across the economy.', colour: LIME },
    { head: 'Activity isn’t value', body: 'More code, more agent hours: not the same as better work.', colour: BLUE },
    { head: 'Errors hide better', body: 'AI mistakes may be harder to spot, so quality checks can miss them.', colour: ORANGE },
    { head: 'Growth muddies it', body: 'The company grew fast at the same time, which explains some of the gain.', colour: PURPLE },
  ];
  slides.push(page('Read it with care', [
    ...ground(deep(ORANGE)), ...chrome(''),
    display('Title', 'Read it with care.', at(110, 150, 1100, 150), 120),
    sticker('Whose', 'The authors’ own caveats', 1260, 190, 550, ORANGE, 3, pop(0.4), 34),
    ...cards.flatMap((c, i) => {
      const x = 110 + (i % 2) * 870, y = 350 + Math.floor(i / 2) * 310;
      return [
        shape(`Card · ${c.head}`, at(x, y, 830, 280), { radius: 40, fill: CARD }, click(rise())),
        shape(`Band · ${c.head}`, at(x, y, 12, 280), { radius: 6, fill: c.colour }, then({ type: 'fade', duration: 0.2 })),
        display(`Heading · ${c.head}`, c.head, at(x + 50, y + 40, 740, 80), 60, { color: c.colour, balance: false }, then({ type: 'fade', duration: 0.2 })),
        text(`Text · ${c.head}`, c.body, at(x + 50, y + 140, 740, 110), { size: 42, lineHeight: 1.25, fitGroup: 'card-words' }, then({ type: 'fade', duration: 0.2 })),
      ];
    }),
  ], 'Be the honest one in the room. These are the authors’ own caveats: Anthropic is unusual, and many of its practices cannot be replicated across the economy; more code does not necessarily mean better code or business impact; AI errors may be harder to spot than human ones; business growth at the same time may explain some of the gains; employees chose when to adopt the tools; and the hours figures rest on assumptions (40-hour weeks, 250 words read a minute).\n\nIf asked about outside critics: commentators have pointed out that high activity is not the same as value if tired reviewers rubber-stamp the work. That is the next slide’s first lesson.'));
}

// What it means for your team.
{
  const cards = [
    { head: 'Checking becomes the bottleneck', body: 'Batch approvals and automate the routine checks, or seniors drown in review queues.', icon: 'hourglass', colour: BLUE },
    { head: 'Watch for rubber-stamping', body: 'A flooded, tired reviewer waves subtle errors through. Check less, but check properly.', icon: 'triangle-alert', colour: ORANGE },
    { head: 'Rethink the first job', body: 'Routine entry-level work is shrinking. Hire for judgement and problem framing, and keep growing juniors.', icon: 'graduation-cap', colour: PURPLE },
    { head: 'Write the rules once', body: 'Prompt templates, brand rules and checklists, not one message at a time.', icon: 'list-checks', colour: LIME },
  ];
  slides.push(page('What it means for your team', [
    ...ground(deep(LIME)), ...chrome(''),
    display('Title', 'What it means for your team', at(110, 150, 1700, 150), 112),
    ...cards.flatMap((c, i) => {
      const x = 110 + (i % 2) * 870, y = 330 + Math.floor(i / 2) * 330;
      return [
        shape(`Card · ${c.head}`, at(x, y, 830, 300), { radius: 40, fill: CARD }, click(rise())),
        shape(`Icon disc · ${c.head}`, at(x + 40, y + 44, 96, 96), { shape: 'ellipse', fill: c.colour }, then(pop())),
        icon(`Icon · ${c.head}`, c.icon, at(x + 60, y + 64, 56, 56), BLACK, then({ type: 'fade', duration: 0.1 })),
        display(`Heading · ${c.head}`, c.head, at(x + 170, y + 50, 620, 90), 52, { color: c.colour, balance: false }, then({ type: 'fade', duration: 0.2 })),
        text(`Text · ${c.head}`, c.body, at(x + 40, y + 160, 750, 120), { size: 40, lineHeight: 1.25 }, then({ type: 'fade', duration: 0.2 })),
      ];
    }),
  ], 'What a small team takes from Anthropic’s report: an early warning not to confuse agent activity with productivity.\n\nYour bottleneck shifts from doing to checking: deploying agents will not cure a small team’s workload if every output needs a manual sign-off; batch the approvals and automate the routine quality checks.\n\nProtect against rubber-stamp risk: a lean team flooded with AI-made proposals, financial models or code gets review fatigue fast, and tired people approve subtle errors.\n\nRethink entry-level roles: routine execution work is shrinking, so future hires need judgement and problem-framing skills to direct the tools. Small firms still need to grow their own people, because the checker of tomorrow is today’s junior.\n\nInvest in guardrails, "meta-work": Anthropic’s staff answered the surge with standing instructions and automated checks; for an SME that means reusable prompt templates, brand guardrails and checklists, not managing AI one message at a time.\n\nTwo more from the UK numbers, if there is time. Shadow AI: staff on personal AI accounts nobody approved, with nobody checking the work, which brings the same checking risks. Say this as what we see in firms: DSIT’s published summary does not measure it. Train, don’t just hire: around 62% of firms short of AI expertise train their own staff (ONS), so build judgement and AI supervision in the people you have.'));
}

// The takeaway.
slides.push(page('Your job moves', [
  ...ground(null),
  mono('Kicker', 'So, what happens to my job?', at(110, 250, 1200, 48), LIME),
  display('Takeaway', 'Your job doesn’t disappear.\nIt moves.', at(104, 310, 1720, 380), 132, {}, { type: 'words', duration: 0.9, stagger: 0.1, easing: 'expoOut' }),
  aside('Aside', 'From doing the work to directing it, and checking it.', at(110, 720, 1700, 100), 76, LIME, rise(1)),
  text('Bridge', 'Checking takes the skill to spot its mistakes. That’s the skill AI can quietly erode.', at(110, 846, 1300, 130), { font: SERIF, italic: true, size: 52, color: INK, lineHeight: 1.15 }, click(rise())),
], 'The answer to the third question. Land it, then pause: AI is more than a chatbot; most firms are trying it but few have changed how they work; and where agents arrive first, the work moves from doing to directing and checking. The skill to protect, in yourself and your team, is judgement.\n\nClick, the bridge the whole talk turns on: "If your job becomes checking the AI’s work, you need the skill to spot its mistakes. And that’s exactly the skill AI can quietly erode." Then: "That’s the idea the UKBT Institute is built on."'));

/** Where the room finds the Institute: a QR code for ukblacktech.com/contact (where the Institute's own page sends
   "De-risk your R&D" and "Partner with us"), up through questions and the close. The code is drawn when the deck
   is built, by SlideForge's own encoder (js/qr.js, the one the live rooms use), and written beside the deck. */
const QR_SRC = qrCode('https://ukblacktech.com/contact/', 'qr-ukblacktech-contact.svg', '#f5f3ee', '#0e0e11', 'ukblacktech.com/contact');
const auditCard = (anim: A): Layer[] => {
  const qr = createLayer('image', { name: 'QR code', params: { src: QR_SRC, fit: 'contain', radius: 12, tone: 'light' }, anim: then({ type: 'fade', duration: 0.3 }) });
  qr.box = at(1490, 260, 280, 280);
  return [
    shape('Audit card', at(1450, 220, 360, 640), { radius: 40, fill: CARD, strokeWidth: 3, stroke: LINE }, anim),
    qr,
    mono('Scan', 'Scan to ask about the audit', at(1490, 568, 280, 116), LIME, { size: 28, lineHeight: 1.25, align: 'center' }, then({ type: 'fade', duration: 0.3 })),
    text('Audit link', 'ukblacktech.com\n/contact', at(1490, 700, 280, 84), { size: 32, weight: '600', align: 'center', lineHeight: 1.2 }, then({ type: 'fade', duration: 0.3 })),
  ];
};

// Questions, before the Institute's line, so the talk closes on its message, not on the last question.
slides.push(page('Questions', [
  ...ground(null),
  display('Thanks', 'Questions?', at(104, 280, 1300, 300), 240, {}, { type: 'words', duration: 0.9, stagger: 0.1, easing: 'expoOut' }),
  aside('Questions', 'Thank you.', at(110, 620, 1000, 150), 130, LIME, rise(0.6)),
  sticker('Sticker · generative', 'Generative', 110, 880, 330, PURPLE, -4, pop(0.9), 34),
  sticker('Sticker · predictive', 'Predictive', 470, 880, 320, BLUE, 3, pop(1), 34),
  sticker('Sticker · automation', 'Automation', 820, 880, 340, ORANGE, -2, pop(1.1), 34),
  sticker('Sticker · agents', 'Agents', 1190, 880, 240, LIME, 4, pop(1.2), 34),
  ...auditCard(rise(0.8)),
], 'Thank the partners and the room, then take questions. The QR code (ukblacktech.com/contact, where to ask about the audit) stays up while you do.\n\nAfter the last question, close on the Institute’s line: "Before you go…"'));

// ─── 5 · How do I make it stick? The slump, and how to push past it ──────────
// The last question: the curve that shows why people stall, then the fixes, the streak, the Institute's line
// and thanks. The "dopamine" explanation is popular psychology, so it stays in the notes as a way of
// thinking, not on a slide as a finding.

// The learning curve: experience over time, its highs and lows joined by S-curves (each level at both
// ends, so the joins read as one line), drawn a stretch per click, with what you think at each point.
const stallCurve = (() => {
  const P = [
    { x: 200, y: 880 }, { x: 470, y: 650 }, { x: 650, y: 720 }, { x: 880, y: 450 }, { x: 1250, y: 760 }, { x: 1790, y: 330 },
  ];
  const peaks = [
    { i: 1, say: 'Looks like fun.', colour: LIME, dx: -150, dy: -110, rot: -4 },
    { i: 2, say: 'This is hard!', colour: ORANGE, dx: -110, dy: 40, rot: 3 },
    { i: 3, say: 'Now I get it!', colour: BLUE, dx: -40, dy: -110, rot: -3 },
    { i: 4, say: 'I know nothing!', colour: ORANGE, dx: -200, dy: 40, rot: 2 },
    { i: 5, say: 'I did it!', colour: LIME, dx: -340, dy: -110, rot: -4 },
  ];
  const thoughts = [
    { after: 2, say: 'No idea what I’m doing. But I keep going.', x: 230, y: 360, w: 480 },
    { after: 3, say: '…or not.', x: 1070, y: 520, w: 260 },
    { after: 4, say: 'This actually makes sense.', x: 1560, y: 650, w: 340 },
    { after: 4, say: 'Did I do that?', x: 1240, y: 400, w: 380 },
  ];
  const layers: Layer[] = [
    ...ground(deep(LIME)), ...chrome(''),
    display('Title', 'Learning feels like this.', at(110, 140, 1250, 150), 112),
    shape('Axis · experience', at(150, 330, 4, 560), { radius: 2, fill: LINE }),
    shape('Axis · time', at(150, 886, 1680, 4), { radius: 2, fill: LINE }),
    aside('Label · experience', 'Confidence', at(-110, 570, 420, 80), 64, MUTED, { type: 'fade', duration: 0.5 }),
    aside('Label · time', 'Time', at(900, 900, 300, 80), 64, MUTED, { type: 'fade', duration: 0.5 }),
    text('Illustration', 'An illustration of how learning feels, not data from a study', at(110, 990, 1300, 44), { font: MONO, size: 28, color: MUTED }, { type: 'fade', duration: 0.5, delay: 0.6 }),
  ];
  layers.find((l) => l.name === 'Label · experience')!.box!.rot = -90;
  for (let k = 0; k < P.length - 1; k++) {
    const a = P[k], b = P[k + 1], up = b.y < a.y;
    const seg = shape(`Line · ${k + 1}`, at(a.x, Math.min(a.y, b.y), b.x - a.x, Math.max(14, Math.abs(b.y - a.y))), { shape: 'curve', rise: up ? 'up' : 'down', fill: LIME, strokeWidth: 14 },
      k === 0 ? { type: 'wipeRight', duration: 0.8, delay: 0.4, easing: 'cubicInOut' } : click({ type: 'wipeRight', duration: 0.8, easing: 'cubicInOut' }));
    layers.push(seg);
    for (const t of thoughts.filter((t) => t.after === k)) layers.push(aside(`Thought · ${t.say}`, t.say, at(t.x, t.y, t.w, 130), 52, INK, then(rise())));
    const pk = peaks.find((p) => p.i === k + 1)!;
    layers.push(sticker(`Point · ${pk.say}`, pk.say, b.x + pk.dx, b.y + pk.dy, 460, pk.colour, pk.rot, then(pop()), 34));
  }
  return page('Why people stall', layers, 'FIFTH QUESTION · HOW DO I MAKE IT STICK? · ABOUT 7 MINUTES. Say what "it" is: make AI part of your routine, without borrowing your skill.\n\nLearning a new tool is not a straight line up, and this is why so many firms stall (NatWest found 29% of firms using AI still in the earliest piloting stage).\n\nWalk the curve, a click at a time. "Looks like fun": the first quick wins. "This is hard!": the first dip. "No idea what I’m doing, but I keep going": the climb. "Now I get it!" ... "or not": the novelty wears off right as the real work begins. "I know nothing!": the low point, where most people quit. Then "This actually makes sense", "Did I do that?", and "I did it!".\n\nThe curve is an illustration of how learning feels, not data from a study, and the slide says so. The point: the low point is normal, and it comes before fluency, not instead of it. The usual explanation is the brain’s novelty reward (the buzz of a quick win) fading once the tool feels familiar; that is popular psychology, so offer it as a way of thinking, not as a research finding.\n\nFour reasons the buzz wears off, if you want them. The novelty cliff: exploring new features gives easy rewards; once the interface feels familiar, that reward stops. The competency dip: learning the basics feels fast, mastering the complex edge cases feels slow, and the gap between knowing how a tool works and being fluent with it causes frustration. Setup feels like progress ("tool-shifting procrastination"): setting up a new app or workflow feels like productive work; once it is done, you have to face the actual, often harder task the tool was meant to solve. Too many settings (decision fatigue): new tools come with endless customisation; spending energy tweaking settings drains the willpower needed for real work.\n\nAsk the room: "Hands up if you’ve spent longer setting up a tool than using it."');
})();

// The fixes, as the room's next two weeks.
const pushPast = (() => {
  const steps = [
    { n: '01', head: 'Build one real output', body: 'Skip the tutorials. Finish one small task that matters.', colour: LIME },
    { n: '02', head: 'Cap the tinkering', body: 'Time-limit the settings. Use a basic setup, as it is, for two weeks.', colour: BLUE },
    { n: '03', head: 'Lower the friction', body: 'Keep it open, so starting is easy. Keep the thinking hard.', colour: ORANGE },
    { n: '04', head: 'Ten minutes a day', body: 'Small daily reps, not big breakthroughs.', colour: PURPLE },
  ];
  return page('Push past the slump', [
    ...ground(deep(LIME)), ...chrome(''),
    display('Title', 'Push past the slump.', at(110, 140, 1700, 150), 120),
    ...steps.flatMap((s, i) => {
      const x = 110 + i * 430;
      return [
        shape(`Tile · ${s.n}`, at(x, 340, 400, 600), { radius: 44, fill: s.colour }, click(pop())),
        display(`Number · ${s.n}`, s.n, at(x + 36, 380, 300, 130), 120, { color: BLACK, balance: false }, then({ type: 'fade', duration: 0.2 })),
        display(`Heading · ${s.n}`, s.head, at(x + 36, 560, 330, 150), 56, { color: BLACK, balance: false }, then({ type: 'fade', duration: 0.2 })),
        text(`Text · ${s.n}`, s.body, at(x + 36, 730, 330, 190), { size: 40, color: BLACK, weight: '500', lineHeight: 1.25 }, then({ type: 'fade', duration: 0.2 })),
      ];
    }),
  ], 'That low point on the curve: here is how to get past it, starting this week.\n\n01 Build one real output: stop watching tutorials and use the tool to finish one small, meaningful task. A real result replaces the lost novelty with real progress.\n\n02 Cap the tinkering: set a strict time limit for themes, plug-ins and settings; lock in a basic setup and use it as it is for two weeks.\n\n03 Lower the friction: keep the tool open or pinned to your workspace, so starting takes no effort and habit does the work, not willpower. Make starting easy, but keep the thinking hard: the struggle is what makes the skill stick, so the ease is in opening the tool, not in handing it the thinking.\n\n04 Ten minutes a day: use the tool for ten minutes a day rather than aiming for big breakthroughs. Small daily reps bridge the gap. The next slide gives the ten minutes a shape that keeps the skill owned.');
})();

const streak = (() => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // The ten minutes, done so the skill stays owned: strands 02, 03 and 04 of the Institute's method.
  const routine = [
    { n: '1', say: 'Try it yourself first', colour: LIME, w: 620 },
    { n: '2', say: 'Ask the AI why', colour: BLUE, w: 460 },
    { n: '3', say: 'Check its answer', colour: ORANGE, w: 510 },
  ];
  const layers: Layer[] = [
    ...ground(null), ...chrome(''),
    display('Title', 'Ten minutes a day.', at(110, 150, 1700, 160), 140),
    aside('Aside', 'Two weeks. One tool. One real task. Every day:', at(110, 316, 1700, 90), 68, LIME, rise(0.3)),
  ];
  let rx = 110;
  routine.forEach((r, i) => {
    layers.push(sticker(`Routine · ${r.n}`, `${r.n} · ${r.say}`, rx, 424, r.w, r.colour, i % 2 ? 2 : -2, pop(0.6 + i * 0.15), 34));
    rx += r.w + 40;
  });
  for (let i = 0; i < 14; i++) {
    const x = 110 + (i % 7) * 245, y = 540 + Math.floor(i / 7) * 180;
    layers.push(
      shape(`Day ${i + 1}`, at(x, y, 215, 160), { radius: 36, fill: CARD, strokeWidth: 3, stroke: LINE }, { type: 'fade', duration: 0.3, delay: 0.4 + i * 0.03 }),
      mono(`Day label ${i + 1}`, `${days[i % 7]} · ${i + 1}`, at(x + 24, y + 16, 170, 44), MUTED, {}, { type: 'fade', duration: 0.3, delay: 0.45 + i * 0.03 }),
    );
  }
  for (let i = 0; i < 14; i++) {
    const x = 110 + (i % 7) * 245, y = 540 + Math.floor(i / 7) * 180;
    const a: A = i === 0 ? click({ type: 'pop', duration: 0.35, easing: 'springPlayful' }) : then({ type: 'pop', duration: 0.18, easing: 'springPlayful' });
    layers.push(shape(`Done ${i + 1}`, at(x + 70, y + 68, 76, 76), { shape: 'ellipse', fill: LIME }, a));
    layers.push(icon(`Tick ${i + 1}`, 'check', at(x + 85, y + 83, 46, 46), BLACK, then({ type: 'fade', duration: 0.05 })));
  }
  layers.push(text('Second nature', 'Day 14: it’s starting to feel normal.', at(110, 910, 1700, 70), { size: 48, weight: '700', color: LIME }, then(rise())));
  return page('Ten minutes a day', layers, 'The streak. One click fills the fortnight, a day at a time.\n\nThe ten minutes have a shape, on the stickers: try it yourself first, then ask the AI why, then check its answer. That keeps the skill owned, not borrowed. It is three of the Institute’s strands (try it yourself first, ask why, test without the AI), which the next slide shows.\n\nAsk the room to commit now: "Pick one tool, one real task, and your ten minutes: try it, ask why, check it. Tell your neighbour when tomorrow you’ll do it."\n\nWhy "starting to feel normal", not "it’s just how you work": in Lally and colleagues’ habit study (European Journal of Social Psychology, 2010), a new habit took 66 days on average to become automatic, anywhere from 18 to 254. Two weeks is a start, not the finish.\n\nThen the Institute’s method: "That habit is free. Making it stick across a whole team, without borrowing anyone’s skill, is what our method is for."',
  { factCheck: { note: 'Notes: Lally et al. (2010), 66 days on average to become automatic, from 18 to 254. Written from memory; check the paper before quoting the numbers.' } });
})();

// ─── 4 · Borrowed or owned? The UKBT Institute's model ───────────────────────
// Productivity and independence are the theory; the eight strands show it rests on evidence, pedagogy and
// measured impact. Checked on 16 November 2026: Bastani et al., "Generative AI without guardrails can harm
// learning", PNAS 122(26), 2025 (the 17% figure is the preprint's), and Shen and Tamkin's paper (arXiv
// 2601.20245). Two claims in the brief were corrected against that paper: it was the group WITHOUT AI that
// reported learning more (the AI group found the task easier), and it does not show experienced developers
// resisting the deficit (the no-AI group scored higher at every level of experience).
const WHARTON = 'Source: Bastani et al., Generative AI without guardrails can harm learning, PNAS (2025) · about 1,000 high-school maths students';

const p4Claim = page('Borrowed, not owned', [
  ...ground(deep(ORANGE)), ...chrome(''),
  instituteLogo('Institute logo', 110, 236, 50),
  mono('Kicker', 'Core claim', at(480, 250, 700, 48), LIME),
  // One line per word, each in the colour it carries all talk: orange for borrowed, the owned green for owned.
  display('Line 1 · borrowed', 'Fast with AI is borrowed.', at(110, 320, 1700, 170), 140, { color: ORANGE, fitGroup: 'claim' }, rise(0.2)),
  display('Line 2 · owned', 'Good without it is owned.', at(110, 510, 1700, 170), 140, { color: LIME, fitGroup: 'claim' }, click(rise())),
  aside('Aside', 'Output and skill can move in opposite directions. So we measure both.', at(110, 760, 1700, 170), 76, INK, then(rise())),
], 'FOURTH QUESTION · BORROWED OR OWNED? · ABOUT 6 MINUTES. The idea the UKBT Institute is built on: what happens to people’s own skill as they lean on AI. Productivity and independence are the theory; the next few slides show it is grounded in evidence, pedagogy and measured impact.\n\nThe core claim, in the talk’s two words. Fast with AI is borrowed: if you can only do the task with AI, the skill is the AI’s. Good without it is owned: if you can still do it without AI, the skill is yours. Click for the second line. (The Institute’s own wording is "AI productivity without independence is borrowed, not owned"; on the slide it is said plainly, with each colour on its own meaning: orange for borrowed, green for owned, as on the map.) Speed and skill can move in opposite directions, so the Institute measures both, not just speed.');

const p4Wharton = page('Faster with it. Worse without it.', [
  ...ground(deep(ORANGE)), ...chrome(''),
  mono('Kicker', 'Wharton · high-school maths · PNAS 2025', at(110, 150, 1400, 48), ORANGE),
  display('Title', 'Better with it. Worse without it.', at(110, 210, 1700, 150), 112),
  mono('Head · with', 'With a ChatGPT-style tool (practice)', at(110, 400, 830, 48), LIME),
  text('Label · base with', 'Plain version', at(110, 470, 300, 60), { size: 38, weight: '600', fitGroup: 'wharton-labels' }),
  ...bar('base with', 48 / 1.4, 420, 470, 440, 56, ORANGE),
  display('Value · base with', '+48%', at(420 + 440 * 0.34 + 20, 466, 220, 64), 60, { color: ORANGE, balance: false }, count(0.6)),
  text('Label · tutor with', 'Hints-only tutor', at(110, 560, 300, 60), { size: 38, weight: '600', fitGroup: 'wharton-labels' }),
  ...bar('tutor with', 127 / 1.4, 420, 560, 440, 56, LIME, { type: 'wipeRight', duration: 1, delay: 0.7, easing: 'expoOut' }),
  display('Value · tutor with', '+127%', at(420 + 440 * 0.907 - 180, 566, 170, 50), 44, { color: BLACK, align: 'right', balance: false }, count(1)),
  text('Note · with', 'better grades than students without AI', at(110, 650, 760, 60), { size: 36, color: MUTED }, rise(1.1)),
  shape('Divider', at(960, 400, 4, 480), { radius: 2, fill: LINE }),
  mono('Head · without', 'Then AI taken away (the exam)', at(1010, 400, 800, 48), ORANGE, {}, click({ type: 'fade', duration: 0.4 })),
  text('Without · base', 'Students on the plain version did worse than students who never had it.', at(1010, 470, 800, 170), { size: 44, weight: '700', color: ORANGE, balance: true, fitGroup: 'wharton-without' }, then(rise())),
  text('Without · tutor', 'The tutor, set up to give hints, not answers, largely removed the harm.', at(1010, 660, 800, 170), { size: 44, weight: '700', color: LIME, balance: true, fitGroup: 'wharton-without' }, then(rise())),
  text('Why', 'Most plain-version students just asked it for the answer.', at(110, 760, 760, 120), { size: 44, weight: '500' }, then(rise())),
  source(WHARTON),
], 'Before the click, a vote: "Hands up if you think the students on the plain version did better once AI was taken away. Now worse?" Then click.\n\nOn the slide, "a ChatGPT-style tool" is the study’s GPT-4, in an interface made to work like ChatGPT. The "plain version" is its GPT Base, and the "hints-only tutor" is its GPT Tutor, set up to give hints, not answers.\n\nHamsa Bastani and colleagues (Wharton), "Generative AI without guardrails can harm learning: Evidence from high school mathematics", PNAS 122(26), 2025: nearly a thousand high-school maths students. With GPT-4 during practice, grades rose 48% with a plain ChatGPT-style tool ("GPT Base") and 127% with a tutor designed to safeguard learning ("GPT Tutor"), against students without AI. When access was taken away for the exam, the plain-GPT students did worse than students who never had it (17% worse, in the preprint); the tutor students did about as well as those who never had it. The chat logs showed most plain-GPT students simply asked for the answer.\n\nThe bars are drawn to scale against each other.',
{ factCheck: { note: 'The size of the exam drop (17%) is the preprint’s figure; check the published PNAS version before saying a number.' } });

// The 2×2: productivity across, independence up.
const p4Matrix = (() => {
  const X = 360, Y = 230, W = 1440, H = 700, mx = X + W / 2, my = Y + H / 2;
  const quad = (name: string, sub: string, x: number, y: number, colour: string, ink: string, a: A) => [
    shape(`Quadrant · ${name}`, at(x + 10, y + 10, W / 2 - 20, H / 2 - 20), { radius: 36, fill: colour }, a),
    display(`Name · ${name}`, name, at(x + 50, y + 50, W / 2 - 100, 100), 76, { color: ink, balance: false }, then({ type: 'fade', duration: 0.2 })),
    text(`What · ${name}`, sub, at(x + 50, y + 160, W / 2 - 100, 140), { size: 40, color: ink, weight: '500', lineHeight: 1.25 }, then({ type: 'fade', duration: 0.2 })),
  ];
  return page('Productivity and independence', [
    ...ground(deep(LIME)), ...chrome(''),
    text('Axis · independence', 'Your own skill ↑\n(without AI)', at(110, 230, 230, 200), { font: MONO, size: 30, color: MUTED, uppercase: true, lineHeight: 1.3 }),
    text('Axis · productivity', 'Speed with AI →', at(X, 950, 1100, 50), { font: MONO, size: 30, color: MUTED, uppercase: true }),
    ...quad('Not yet using AI', 'Good without it, but not yet using AI’s speed.', X, Y, CARD, INK, rise(0.2)),
    ...quad('Owned', 'Fast, and still good without it. The goal.', mx, Y, LIME, BLACK, rise(0.3)),
    ...quad('Stuck', 'Neither faster nor more capable.', X, my, CARD, MUTED, rise(0.4)),
    ...quad('Borrowed', 'Fast, but lost without it. Looks like success: the mirage.', mx, my, ORANGE, BLACK, click(pop())),
    text('Most training', 'Most AI training pushes this way', at(X + 50, my + 226, 700, 44), { font: MONO, size: 30, color: INK, uppercase: true, tracking: 0.1 }, click(rise())),
    shape('Training arrow', at(X + 50, my + 280, 780, 40), { shape: 'arrow', fill: INK }, then({ type: 'wipeRight', duration: 0.7, easing: 'expoOut' })),
    sticker('Our job', 'Our job: up and right ↗', mx - 280, my - 40, 560, LIME, -4, click(pop()), 34),
  ], 'The model that anchors everything, in two words: owned and borrowed. Across: speed with AI. Up: your own skill, what you can still do without it.\n\nOwned (top right) is the goal: fast, and still good without it. Borrowed (bottom right) is the danger, because it looks like success: fast, but lost without it. That is the mirage, and it is what the last two slides showed: the students on the plain version, and the developers who found the task easier. Click: most AI training pushes people right, towards speed, so the arrow runs from Stuck straight into Borrowed. Click: the Institute’s job is to move them up and right, into Owned.\n\nBridge: "Knowing the trap isn’t enough. Here’s why most people stall, and how to make it stick: AI in your routine, without borrowing your skill."');
})();

const p4Mirage = page('The mirage feels like progress', [
  ...ground(deep(ORANGE)), ...chrome(''),
  mono('Kicker', 'Anthropic’s trial · developers learning a new coding tool', at(110, 150, 1600, 48), ORANGE),
  display('Title', 'It feels easier. That’s the trap.', at(110, 210, 1700, 150), 112),
  shape('Card · easier', at(110, 390, 540, 500), { radius: 44, fill: CARD }, rise(0.2)),
  icon('Easier', 'face-slightly-smiling', at(160, 430, 110, 110), LIME, pop(0.3)),
  text('Text · easier', 'People using AI found the task easier.', at(160, 580, 440, 260), { size: 52, weight: '700', lineHeight: 1.15 }, rise(0.4)),
  shape('Card · scored', at(690, 390, 540, 500), { radius: 44, fill: CARD }, click(rise())),
  display('Value · scored', '−17', at(740, 420, 440, 160), 160, { color: ORANGE, balance: false }, then(count())),
  text('Text · scored', 'points on a test of what they’d learned, afterwards: 50% against 67%.', at(740, 600, 440, 260), { size: 44, weight: '600', lineHeight: 1.2 }, then(rise())),
  shape('Card · felt', at(1270, 390, 540, 500), { radius: 44, fill: CARD }, click(rise())),
  icon('Felt', 'brain', at(1320, 430, 110, 110), BLUE, then(pop())),
  text('Text · felt', 'The group without AI was the one that said it learned more.', at(1320, 580, 440, 260), { size: 48, weight: '700', lineHeight: 1.18, color: BLUE }, then(rise())),
  aside('Agents', 'Its authors expect the loss to be even greater with agent-style tools.', at(110, 904, 1700, 62), 42, LIME, then(rise())),
  source('Source: Shen and Tamkin, How AI assistance impacts the formation of coding skills, Anthropic (January 2026) · 52 developers'),
], 'Why this is dangerous: it feels fine from the inside. Before the last click, a vote: "Which group said it learned more: with AI, or without?"\n\nIn Anthropic’s skill trial (Shen and Tamkin, January 2026, 52 mostly junior developers learning a new library), people with the AI assistant found the task easier, then scored 50% on the quiz against 67% for those coding by hand. Both groups enjoyed the task, and it was the group without AI that reported learning more.\n\nNote: some summaries say the AI users felt they learned more. The paper says the opposite ("The control group (No AI) reported higher self-reported learning", section 5.2.2), so say it this way.\n\nThe last line links the agents back to this: the authors write that "the loss in knowledge is likely even greater in an agentic or autocomplete setting where composing queries is not required" (section 6.1), and that "accomplishing a task with new knowledge or skills does not necessarily lead to the same productive gains" (section 7). It is their expectation, not a finding. Your own gloss, said as yours, not theirs: with agents, you don’t even have to ask. And your advice from it: agents are fine for the craft you’ve already mastered, and risky for the one you’re still learning.\n\nBoth cards were checked in the paper (section 5.2.2): "participants in the treatment group (AI Assistance) found the task easier than the control group", and "The control group (No AI) reported higher self-reported learning".');

// The method, on one slide, before questions and the Institute's line. Its colour is the brand green, not one of
// the four kinds' colours, so no strand reads as a kind of AI: the eight strands in plain words (the technical name
// under each) round the goal, the three pillars as plain promises, and the honest note on the evidence. Each
// strand's evidence and measure are in the notes, so the slide stays readable for a room of business owners.
const STRANDS = [
  { n: '01', plain: 'Know where you start', name: 'Baseline first', full: 'Baseline before tools', field: 'prior knowledge', evidence: 'Nobody was immune: without AI, people scored higher at every level of experience (Anthropic).', measure: 'An audit score before training' },
  { n: '02', plain: 'Try it yourself first', name: 'Effortful practice', full: 'Effortful practice', field: 'active learning', evidence: 'Bjork’s desirable difficulties: struggle makes skills stick.', measure: 'The task done with and without AI' },
  { n: '03', plain: 'Ask why, not just what', name: 'Engaged use', full: 'Engaged use, not delegation', field: 'engagement', evidence: 'Conceptual questioners scored 65%+; delegators under 40% (Anthropic).', measure: 'How people use AI in real work' },
  { n: '04', plain: 'Test without the AI', name: 'AI-off checks', full: 'AI-off checks', field: 'formative assessment', evidence: 'Wharton: the dependency only showed once AI was removed.', measure: 'Performance unplugged, over time' },
  { n: '05', plain: 'Know when to doubt it', name: 'Calibrated trust', full: 'Calibrated trust', field: 'metacognition', evidence: 'Trust in AI went with less critical thinking; self-confidence with more (CHI 2025).', measure: 'Errors caught in AI output' },
  { n: '06', plain: 'Pick tools that teach', name: 'Guardrailed tools', full: 'Guardrailed tools', field: 'instructional design', evidence: 'Wharton: a tutor built to protect learning largely removed the harm.', measure: 'Tool stress-test ratings' },
  { n: '07', plain: 'Learn together', name: 'Peer learning', full: 'Peer learning and safety', field: 'collaboration, belonging', evidence: 'Self-determination theory: autonomy, competence and connection sustain motivation.', measure: 'Shared practices and adoption' },
  { n: '08', plain: 'Measure speed and skill', name: 'Dual metrics', full: 'Dual-metric impact', field: 'data-informed', evidence: 'Productivity and learning can move in opposite directions.', measure: 'Speed and skill without AI, before and after' },
];
const PILLARS = [
  { plain: 'Backed by research', term: 'evidence-based', says: 'we only teach what research supports', w: 430 },
  { plain: 'Built on how people learn', term: 'pedagogy-driven', says: 'training designed around how adults actually build skill, not around tool features', w: 580 },
  { plain: 'We prove it worked', term: 'impact-measured', says: 'every engagement reports speed and skill without AI, before and after', w: 430 },
];
const p4Wheel = (() => {
  const cx = 1600, cy = 560, r = 190, d = 84;
  const layers: Layer[] = [
    ...ground(deep(PURPLE)), ...chrome(''),
    instituteLogo('Institute logo', 110, 132, 44),
    mono('Kicker', 'Method', at(439, 140, 700, 48), LIME),
    display('Title', 'Eight strands, three pillars.', at(110, 196, 1160, 120), 96),
    shape('Orbit', at(cx - r, cy - r, r * 2, r * 2), { shape: 'ring', ringWidth: 0.014, fill: LINE }, { type: 'fade', duration: 0.6 }),
    shape('Centre', at(cx - 105, cy - 105, 210, 210), { shape: 'ellipse', fill: LIME }, pop(0.3)),
    display('Centre · owned', 'Owned', at(cx - 105, cy - 58, 210, 70), 58, { color: BLACK, align: 'center', balance: false }, pop(0.4)),
    text('Centre · what', 'fast, and good\nwithout it', at(cx - 92, cy + 14, 184, 64), { size: 24, color: BLACK, align: 'center', weight: '600', lineHeight: 1.15 }, pop(0.45)),
  ];
  STRANDS.forEach((s, i) => {
    const a = (-90 + i * 45) * Math.PI / 180, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a), dl = 0.6 + i * 0.08;
    const lx = 110 + Math.floor(i / 4) * 610, ly = 360 + (i % 4) * 118;
    layers.push(
      shape(`Strand disc · ${s.n}`, at(x - d / 2, y - d / 2, d, d), { shape: 'ellipse', fill: GREEN }, pop(dl)),
      display(`Strand number · ${s.n}`, s.n, at(x - d / 2, y - 22, d, 44), 38, { color: BLACK, align: 'center', balance: false }, pop(dl)),
      shape(`List disc · ${s.n}`, at(lx, ly + 8, 60, 60), { shape: 'ellipse', fill: GREEN }, rise(dl)),
      display(`List number · ${s.n}`, s.n, at(lx, ly + 21, 60, 34), 28, { color: BLACK, align: 'center', balance: false }, rise(dl)),
      display(`Strand · ${s.n}`, s.plain, at(lx + 84, ly, 500, 54), 42, { balance: false, fitGroup: 'strand-plain' }, rise(dl + 0.05)),
      text(`Strand term · ${s.n}`, s.name, at(lx + 84, ly + 58, 500, 38), { font: MONO, size: 28, color: MUTED }, rise(dl + 0.1)),
    );
  });
  let px = 110;
  PILLARS.forEach((pl, i) => {
    layers.push(chip(`Pillar · ${pl.term}`, pl.plain, px, 872, pl.w, GREEN, i ? then(pop()) : click(pop())));
    px += pl.w + 24;
  });
  layers.push(aside('Honest note', 'The evidence is early, and mostly short-term: a model we’re testing and refining.', at(110, 966, 1700, 64), 40, LIME, click(rise())));
  const strands = STRANDS.map((s) => `${s.n} ${s.plain} (${s.full}; ${s.field}). Evidence: ${s.evidence} We measure: ${s.measure}.`).join('\n');
  const pillars = PILLARS.map((pl) => `${pl.plain} (${pl.term}): ${pl.says}.`).join(' ');
  return page('Eight strands, three pillars', layers, `THE UKBT INSTITUTE’S METHOD. Bridge in, from the streak: "That habit is free. Making it stick across a whole team, without borrowing anyone’s skill, is what our method is for."\n\nAt the centre, the goal: owned, fast and still good without AI. Round it, eight strands, each pairing evidence, a teaching practice and a measure. The slide gives each in plain words, with the technical name under it.\n\n${strands}\n\nStrand 01’s evidence, said carefully: Anthropic’s trial found the group without AI scored higher at every level of prior coding experience, so experience did not make anyone immune. (Some summaries say experienced developers were more resilient; the paper does not test that.) Strand 05 is Lee et al., Microsoft Research and Carnegie Mellon, CHI 2025: higher confidence in AI went with less critical thinking, higher self-confidence with more. Strand 07 is Deci and Ryan’s self-determination theory, a theory of motivation rather than an AI study.\n\nClick: the three pillars, the outer ring of the original wheel (they replace "digitally-enabled" there). ${pillars} The last is the commercial edge: measuring dependence, not just speed, which the Institute’s audit already does.\n\nLast click, the honest note. Say it plainly, because it is what makes the rest credible: the studies behind the strands are small and short-term (52 developers; one school system), and their authors say so. The Institute presents this as a research-informed model it is testing and refining, the way it stress-tests everything.\n\nThen: "So who is the Institute for? More of you than you’d think."`);
})();

// Who the Institute is for, in its own words (ukblacktech.com/ukbt-institute, read 16 November 2026): its four
// residents, each with the page's tagline, its opening line and its call to action. Industry is this room, so its
// card is the one picked out.
const p4Who = (() => {
  const who = [
    { name: 'Academics', tag: 'From research to real-world use', line: 'Hard problems don’t respect disciplinary boundaries.', ask: 'Bring your research →' },
    { name: 'Technologists', tag: 'A real-world test bed for what you build', line: 'Stop building in a vacuum.', ask: 'Test your technology →' },
    { name: 'Industry', tag: 'Evidence before investment', line: 'R&D is expensive when technology fails at adoption.', ask: 'De-risk your R&D →', you: true },
    { name: 'Practitioners', tag: 'Step outside your day job. Come back sharper.', line: 'For clinicians, lawyers, engineers, planners and other practitioners.', ask: 'Join as a practitioner →' },
  ];
  const layers: Layer[] = [
    ...ground(deep(GREEN)), ...chrome(''),
    instituteLogo('Institute logo', 110, 126, 50),
    display('Title', 'Who the Institute is for', at(110, 196, 1700, 130), 112),
    aside('Aside', 'A townhouse needs more than one kind of resident.', at(110, 334, 1700, 70), 56, LIME, rise(0.3)),
  ];
  who.forEach((w, i) => {
    const x = 110 + (i % 2) * 870, y = 430 + Math.floor(i / 2) * 270, a = click(rise());
    layers.push(
      shape(`Card · ${w.name}`, at(x, y, 830, 250), { radius: 36, fill: CARD, strokeWidth: w.you ? 4 : 0, stroke: GREEN }, a),
      display(`Name · ${w.name}`, w.name, at(x + 40, y + 30, 420, 64), 54, { color: GREEN, balance: false }, then({ type: 'fade', duration: 0.2 })),
      text(`Ask · ${w.name}`, w.ask, at(x + 440, y + 44, 350, 40), { font: MONO, size: 24, weight: '600', color: GREEN, uppercase: true, tracking: 0.08, align: 'right' }, then({ type: 'fade', duration: 0.2 })),
      text(`Tag · ${w.name}`, w.tag, at(x + 40, y + 104, 750, 56), { size: 40, weight: '700', fitGroup: 'who-tags' }, then({ type: 'fade', duration: 0.2 })),
      text(`Line · ${w.name}`, w.line, at(x + 40, y + 170, 750, 52), { size: 34, color: MUTED, fitGroup: 'who-lines' }, then({ type: 'fade', duration: 0.2 })),
    );
    if (w.you) layers.push(sticker('That’s you', 'That’s this room', x + 560, y - 26, 300, LIME, 3, then(pop()), 28));
  });
  layers.push(text('Find us', 'ukblacktech.com/ukbt-institute', at(110, 984, 1700, 50), { font: MONO, size: 30, color: GREEN }, { type: 'fade', duration: 0.5, delay: 0.6 }));
  return page('Who the Institute is for', layers, 'WHO THE INSTITUTE IS FOR. From its own page: "The UKBT Institute is a townhouse for technologists, academics, industry and communities." And: "A townhouse needs more than one kind of resident." The Institute brings academics, technologists, industry and practitioners into the same building.\n\nOne card per click.\n- Academics, "From research to real-world use": your research meets clinicians, lawyers, engineers and the people who will use it. (Bring your research.)\n- Technologists, "A real-world test bed for what you build": test it with real users, real workflows and real regulation. (Test your technology.)\n- Industry, "Evidence before investment": R&D is expensive when technology fails at adoption, so the Institute puts practitioner pull before technology push. This is the room. (De-risk your R&D.)\n- Practitioners, "Step outside your day job. Come back sharper." (Join as a practitioner.)\n\nWhere to go: the contact page (ukblacktech.com/contact) to bring research, test technology, de-risk R&D or partner; the register page (ukblacktech.com/register) to join as a practitioner or become a member. Its active campaigns, if asked: Living in a Digital World, Cyber & Digital Trust, and Smart Cities & Infrastructure.\n\nThen: "Thank you. Questions?"');
})();

// The close: what the Institute is, as the speaker puts it. A multidisciplinary townhouse that brings professionals
// together on the hardest problems. The site's own line is that hard problems don't respect disciplinary boundaries.
const p4Pitch = page('One townhouse, many disciplines', [
  ...ground(null),
  instituteLogo('Institute logo', 110, 204, 56),
  display('Pitch 1', 'One townhouse. Many disciplines.', at(104, 290, 1300, 200), 120),
  display('Pitch 2', 'We bring professionals together to take on the hardest problems.', at(104, 500, 1300, 220), 84, { color: LIME }, click(rise())),
  aside('Pitch 3', 'Academics, technologists, industry and practitioners, under one roof.', at(110, 696, 1300, 180), 72, INK, then(rise())),
  ...auditCard(rise(0.6)),
], 'The line to end on, after questions, so the talk closes on what the Institute is. Bridge in: "Before you go, the Institute in one line."\n\nSay it: the UKBT Institute is multidisciplinary. It brings professionals together, in a townhouse, to take on the hardest problems, because, in the Institute’s own words, "hard problems don’t respect disciplinary boundaries". Academics, technologists, industry and practitioners work in the same building. Click for the second line, then the third.\n\nThe tie back to the talk, if you want it: AI in your firm is one of those problems. It needs the people who use it, not just the people who sell it, and the Institute measures speed and skill, so your team stays good at its job when the AI is wrong, down, or replaced next year.\n\nThe QR code for ukblacktech.com/contact stays up as the room leaves.');

/* The running order (docs/power-of-ai-fresh-running-order.md, after 25 reviews): one talk in five questions,
   with one cover and one agenda in place of a cover per part. Every slide built above is listed once, and the
   label over each content slide says which question it answers ("3 of 5 · What happens to my job?"). */
const ORDER: [number, string[]][] = [
  [0, ['The Power of AI', 'Your speaker', 'Five questions']],
  [1, ['What people picture', 'AI is an umbrella', 'Generative AI', 'Predictive & analytical AI', 'Automation & workflow AI', 'Autonomous AI agents', 'Why the mix-up costs you', 'Which AI is it?']],
  [2, ['It doubled in a year', 'Depends who you ask', 'Bigger firms are further ahead', 'Mostly admin and marketing', 'It’s helping. It’s worrying.', 'Wide, not deep']],
  [3, ['Why look at an AI company?', 'Six agent hours for every human hour', 'Most of the time, the agent is waiting', 'More output, and a new job', 'Who gets hired is changing', 'Read it with care', 'What it means for your team', 'Your job moves']],
  [4, ['Borrowed, not owned', 'Faster with it. Worse without it.', 'The mirage feels like progress', 'Productivity and independence']],
  [5, ['Why people stall', 'Push past the slump', 'Ten minutes a day', 'Eight strands, three pillars', 'Who the Institute is for', 'Questions', 'One townhouse, many disciplines']],
];
{
  const pool = [...slides, stallCurve, pushPast, streak, p4Claim, p4Wharton, p4Matrix, p4Mirage, p4Wheel, p4Who, p4Pitch];
  const byName = new Map(pool.map((s) => [s.name, s]));
  if (byName.size !== pool.length) throw new Error('two slides share a name');
  const ordered = ORDER.flatMap(([n, names]) => names.map((name) => {
    const s = byName.get(name);
    if (!s) throw new Error(`ORDER names a slide that is not built: ${name}`);
    byName.delete(name);
    const label = s.layers.find((l) => l.name === 'Section');
    if (label && n) label.params.text = `${n} of 5 · ${QUESTIONS[n - 1]}`;
    return s;
  }));
  if (byName.size) throw new Error(`built but not in ORDER: ${[...byName.keys()].join(', ')}`);
  slides.splice(0, slides.length, ...ordered);
}

/* The hero line: on each big moment (a cover, a takeaway, the pitch, the thanks: the slides on the moving
   mesh), its headline is set in Alpha Lyrae Medium, in capitals, as the brand guide asks. Only that one line. */
for (const s of slides) {
  if (s.layers[0]?.kind !== 'mesh') continue;
  const hero = s.layers.find((l) => ['Title', 'Takeaway', 'Thanks', 'Pitch 1'].includes(l.name));
  if (hero) Object.assign(hero.params, { font: HERO, weight: '500', uppercase: true, tracking: 0, lineHeight: 0.95 });
}

/* Every slide's title in Alpha Lyrae too: the speaker set eight in the studio (16 November), then asked for all.
   Weight and case are left as they are; the big moments keep their capitals from the hero pass above. The four
   kinds of AI count their name on the colour panel as their title. */
{
  let n = 0;
  for (const s of slides) for (const l of s.layers) if (l.name === 'Title' || l.name === 'Name') { l.params.font = HERO; n++; }
  if (n < 25) throw new Error(`only ${n} titles found to set in Alpha Lyrae`);
}

/* UK Black Tech's logo on every slide: the full-name wordmark, the version made for dark grounds
   (assets/brand/ukbt-wordmark.png: the green chevron, "UK", "Black" in its white box, "Tech"). Small at the
   top right where a slide has its labels, larger at the bottom right on the covers and the big statements.
   It takes the place of the "UK Black Tech" text the slides were first built with. */
{
  const LOGO = '/assets/brand/ukbt-wordmark.png', RATIO = 1800 / 425;
  const logo = (x: number, y: number, h: number) => {
    // tone 'light': keep the logo's own colours (left to the theme, a dark ground would show it all white).
    const l = createLayer('image', { name: 'Logo', params: { src: LOGO, fit: 'contain', tone: 'light' }, anim: { type: 'fade', duration: 0.6 } });
    l.box = { x, y, w: Math.round(h * RATIO), h, rot: 0 };
    return l;
  };
  for (const s of slides) {
    const brand = s.layers.filter((l) => l.name === 'Brand');
    const top = brand.some((l) => (l.box?.y ?? 1080) < 200) || s.layers.some((l) => l.name === 'Section');
    s.layers = s.layers.filter((l) => l.name !== 'Brand');
    const h = top ? 54 : 80, w = Math.round(h * RATIO);
    s.layers.push(top ? logo(1810 - w, 60, h) : logo(1810 - w, 975 - h / 2, h));
  }
}

// ─── The deck ────────────────────────────────────────────────────────────────
const ROOT = process.cwd(); // build.mjs runs this from the repository's root
const guide = blankGuide({ ground: BG, ink: INK, muted: MUTED, accent: LIME, accent2: PURPLE, panel: CARD, display: DISPLAY, displayWeight: '700', body: BODY });
guide.theme.hero = HERO;
guide.name = 'Power of AI · fresh';
const deck = {
  id: 'power-of-ai-fresh', title: 'The Power of AI · new edition', width: 1920, height: 1080, version: DECK_VERSION,
  libraryGroup: 'ukbt', theme: 'guide', styleGuide: guide, slides,
};
const out = path.join(ROOT, 'assets', 'power-of-ai-fresh', 'Power-of-AI-Fresh.lesson.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(deck, null, 1) + '\n');
console.log(`${path.relative(ROOT, out)} (${slides.length} slides, ${slides.reduce((n, s) => n + s.layers.length, 0)} layers)`);
