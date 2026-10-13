// The studio viewer's page (lab-app/view.html, lab-engine-plan M12): a shared lab lesson played by the lab's own
// player. Read at your own pace (Next, Back, the slide list), follow a live room (the relay's watcher seat, as
// view.html has it), or practise its questions alone. The speaker notes never reach it (sharedDeck).
import type { Deck } from '../core';
import { DeckPlayer, refreshAssets } from '../engine';
import { registerGuideFonts } from '../theme';
import { followIndex, practiceCount, practiceOf, PracticeScore, readLink, sharedDeck, type PracticeAsk } from './state';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
};

function message(title: string, detail: string) {
  const box = document.getElementById('sf-msg')!;
  box.replaceChildren(el('h1', '', title), el('p', '', detail));
  box.hidden = false;
}

export async function startViewer(): Promise<void> {
  const link = readLink(location.search);
  if (!link) { message('That link is not complete', 'A shared lesson address ends in ?s= followed by the code from the link you were sent.'); return; }
  let doc: unknown;
  try {
    const r = await fetch(`/api/share/${link.id}`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j as { error?: string }).error || 'Not found');
    doc = (j as { doc?: unknown }).doc;
  } catch (e) {
    message('This link no longer works', `${e instanceof Error ? e.message : String(e)} Shared copies are held on the server, and a hosted server loses them when the app is updated.`);
    return;
  }
  const shared = sharedDeck(doc);
  if (!shared) {
    // A classic copy: SlideForge's own viewer plays it.
    location.replace(`/view.html${location.search}`);
    return;
  }
  document.getElementById('sf-msg')!.hidden = true;
  play(shared.deck, link.follow ? 'follow' : shared.practice ? 'practice' : 'read', link.id);
}

function play(deck: Deck, mode: 'read' | 'follow' | 'practice', id: string) {
  document.title = `${deck.title || 'A shared lesson'} — SlideForge`;
  document.body.classList.add(`mode-${mode}`);
  registerGuideFonts(deck.styleGuide);
  document.fonts?.addEventListener('loadingdone', () => refreshAssets());

  const canvas = document.getElementById('sf-canvas') as HTMLCanvasElement;
  const bar = document.getElementById('sf-bar')!;
  const list = document.getElementById('sf-list')!;
  const card = document.getElementById('sf-practice')!;
  const fit = () => {
    const room = bar.offsetHeight || 0;
    const k = Math.min(innerWidth / deck.width, (innerHeight - room) / deck.height);
    canvas.style.width = `${deck.width * k}px`;
    canvas.style.height = `${deck.height * k}px`;
  };

  const title = el('span', 'sf-title');
  title.append(el('b', '', deck.title || 'Shared lesson'), ` · ${mode === 'follow' ? 'following the room' : mode === 'practice' ? 'practice' : 'read only'}`);
  const back = el('button', '', '‹'); back.setAttribute('aria-label', 'Previous slide');
  const pos = el('span', 'sf-pos'); pos.setAttribute('aria-live', 'polite');
  const next = el('button', '', '›'); next.setAttribute('aria-label', 'Next slide');
  const slides = el('button', '', 'Slides'); slides.setAttribute('aria-expanded', 'false');
  const full = el('button', '', '⛶'); full.setAttribute('aria-label', 'Full screen');
  const status = el('span', 'sf-status');
  const score = el('span', 'sf-score');
  const nav = el('span', 'sf-nav');
  if (mode !== 'follow') nav.append(back, pos, next, slides);
  nav.append(full);
  bar.append(title, nav, mode === 'follow' ? status : mode === 'practice' ? score : el('span', 'sf-hint', '← → to move'));
  addEventListener('resize', fit);
  fit();

  const practice = new PracticeScore();
  const total = practiceCount(deck);
  const drawScore = () => { score.textContent = `${practice.right} / ${total} right · your score stays on this device`; };

  const drawPractice = (i: number) => {
    card.replaceChildren();
    card.hidden = true;
    if (mode !== 'practice') return;
    const p = practiceOf(deck.slides[i]);
    if (!p) return;
    card.hidden = false;
    if (p.kind === 'room') { card.append(el('p', 'sf-room', p.reason)); return; }
    ask(p);
  };
  const ask = (p: PracticeAsk) => {
    card.append(el('p', 'sf-q', p.question));
    const opts = el('div', 'sf-options');
    const said = el('p', 'sf-said'); said.setAttribute('aria-live', 'polite');
    const show = (choice: number) => {
      const m = practice.answer(p, choice);
      opts.querySelectorAll('button').forEach((b, k) => {
        b.disabled = true;
        if (p.options[k] === m.answer) b.classList.add('right');
        else if (k === practice.picked(p.id)) b.classList.add('wrong');
      });
      said.textContent = `${m.right ? 'Right.' : `Not this time. The answer is ${m.answer}.`}${m.explanation ? ` ${m.explanation}` : ''}`;
      drawScore();
    };
    p.options.forEach((o, k) => {
      const b = el('button', '', o);
      b.onclick = (e) => { e.stopPropagation(); show(k); };
      opts.append(b);
    });
    card.append(opts, said);
    const before = practice.picked(p.id);
    if (before !== undefined) show(before);
  };

  const player = new DeckPlayer(canvas, deck, {
    onChange: (i) => {
      pos.textContent = `${i + 1} / ${deck.slides.length}`;
      list.querySelectorAll('button').forEach((b, k) => b.classList.toggle('now', k === i));
      if (drawn !== i) { drawn = i; drawPractice(i); }
    },
  });
  let drawn = -1;
  drawPractice(player.index);
  drawScore();

  back.onclick = () => player.prev();
  next.onclick = () => player.next();
  full.onclick = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); };
  deck.slides.forEach((s, k) => {
    const b = el('button', '', `${k + 1}. ${s.name || 'Slide'}`);
    b.onclick = () => { player.goto(k, k > player.index ? 1 : -1, true); list.hidden = true; slides.setAttribute('aria-expanded', 'false'); };
    list.append(b);
  });
  slides.onclick = () => { list.hidden = !list.hidden; slides.setAttribute('aria-expanded', String(!list.hidden)); };

  if (mode === 'follow') { follow(deck, player, id, (t) => { status.textContent = t; }); return; }
  addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement | null)?.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); player.next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); player.prev(); }
    else if (e.key === 'Home') player.goto(0, -1, true);
    else if (e.key === 'End') player.goto(deck.slides.length - 1, 1, true);
    else if (e.key === 'f' || e.key === 'F') full.click();
    else if (e.key === 'Escape') list.hidden = true;
  });
}

/** A spectator seat on the room (the relay's `watch`): no PIN, no name, answers nothing, and cannot run ahead.
 *  The slide is shown built, since the studio's room says which slide is up, not how far it is built. */
function follow(deck: Deck, player: DeckPlayer, id: string, say: (t: string) => void) {
  const land = (at: unknown) => {
    const i = followIndex(deck, at as { slideId?: unknown; n?: unknown });
    if (i < 0) return;
    if (i !== player.index) player.cut(i, true);
    const n = Number((at as { n?: unknown }).n), total = Number((at as { total?: unknown }).total);
    say(`Slide ${i + 1}${total > 0 && n > 0 ? ` of ${deck.slides.length}` : ''}`);
  };
  let tries = 0;
  let sock: WebSocket | null = null;
  const connect = () => {
    say('Connecting…');
    try { sock = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`); }
    catch { say('Could not connect.'); return; }
    const s = sock;
    s.onopen = () => { tries = 0; s.send(JSON.stringify({ t: 'watch', s: id })); };
    s.onmessage = (e) => {
      let m: { t?: string; at?: unknown; message?: string };
      try { m = JSON.parse(String(e.data)); } catch { return; }
      if (m.t === 'watching') { say(m.at ? '' : 'Waiting for the presenter…'); if (m.at) land(m.at); }
      else if (m.t === 'context') land(m);
      else if (m.t === 'watchEnd') { say(m.message || 'The lesson has ended.'); sock = null; s.close(); }
      else if (m.t === 'error') say(m.message || 'Not presenting right now.');
    };
    // A projector left on all morning drops: reconnect, backing off to half a minute.
    s.onclose = () => {
      if (sock !== s) return;
      sock = null;
      tries++;
      say('Reconnecting…');
      setTimeout(connect, Math.min(30000, 800 * 2 ** Math.min(tries, 5)));
    };
  };
  connect();
}
