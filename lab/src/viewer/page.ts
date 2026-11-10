// The studio viewer's page (lab-app/view.html, lab-engine-plan M12): a shared lab lesson played by the lab's own
// player. Read at your own pace (Next, Back, the slide list), follow a live room (the relay's watcher seat, as
// view.html has it), or practise its questions alone. The speaker notes never reach it (sharedDeck).
import type { Deck } from '../core';
import { DeckPlayer, refreshAssets } from '../engine';
import { registerGuideFonts } from '../theme';
import { cloudPicture, cloudShare } from './cloud';
import { followIndex, practiceCount, practiceOf, PracticeScore, readLink, sharedDeck, slideHash, withPictures, type PracticeAsk } from './state';

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
  const link = readLink(location.search, location.hash);
  if (!link) { message('That link is not complete', 'A shared lesson address ends in ?s= followed by the code from the link you were sent.'); return; }
  // A share is on the relay (made signed out, or before shares went online) or online (CS-06, made signed in).
  let doc: unknown;
  let onlineCopy = false;
  let why = '';
  try {
    const r = await fetch(`/api/share/${link.id}`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (r.ok) doc = (j as { doc?: unknown }).doc;
    else why = (j as { error?: string }).error || 'Not found.';
  } catch (e) { why = e instanceof Error ? e.message : String(e); }
  if (doc === undefined) {
    const online = await cloudShare(link.id).catch(() => null);
    if (online?.private && online.doc === undefined) {
      const box = document.getElementById('sf-msg')!;
      const go = el('a', 'sf-signin', 'Open SlideForge to sign in');
      go.href = '/';
      box.replaceChildren(el('h1', '', 'This lesson is for teachers'),
        el('p', '', 'It was shared with signed-in teachers only. Sign in to SlideForge with your work email in this browser, then open this link again.'), go);
      box.hidden = false;
      return;
    }
    if (online?.doc !== undefined) { doc = online.doc; onlineCopy = true; }
  }
  if (doc === undefined) {
    message('This link no longer works', `${why ? why.replace(/\.?$/, '.') : 'It may have been withdrawn.'} A copy shared without signing in is held on the server, and a hosted server loses it when the app is updated.`);
    return;
  }
  // Its pictures, when they travel apart from it (CS-14 step 2), from wherever the share itself came from.
  // The relay sends each picture as itself, kept by the browser (a picture under its number never changes); it is put
  // back into the lesson as the data address it was shared as.
  const relayPicture = (n: number) => fetch(`/api/share/${link.id}/picture/${n}`)
    .then((r) => (r.ok ? r.blob() : null))
    .then((b) => (b ? new Promise<string | null>((done) => { const fr = new FileReader(); fr.onload = () => done(typeof fr.result === 'string' ? fr.result : null); fr.onerror = () => done(null); fr.readAsDataURL(b); }) : null))
    .catch(() => null);
  const filled = await withPictures(doc, onlineCopy ? (n) => cloudPicture(link.id, n) : relayPicture);
  doc = filled.doc;
  if (filled.missing) console.warn(`${filled.missing} picture(s) of this share could not be loaded.`);
  const shared = sharedDeck(doc);
  if (!shared) {
    // A copy shared from the classic slideshow, which SlideForge no longer has (M14): it cannot be played here.
    message('This link is from an older version of SlideForge', 'It was shared before SlideForge moved to the Lesson studio, and it cannot be opened any more. Ask your teacher to share the lesson again.');
    return;
  }
  document.getElementById('sf-msg')!.hidden = true;
  play(shared.deck, link.follow ? 'follow' : shared.practice ? 'practice' : 'read', link.id, link.slide);
}

function play(deck: Deck, mode: 'read' | 'follow' | 'practice', id: string, startAt: number | null = null) {
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
  const share = el('button', '', 'Link'); share.title = 'Copy a link that opens at this slide';
  const status = el('span', 'sf-status');
  const score = el('span', 'sf-score');
  const nav = el('span', 'sf-nav');
  if (mode !== 'follow') nav.append(back, pos, next, slides, share);
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

  // Before the player: its constructor reports the first slide (onChange) at once.
  let drawn = -1;
  const player = new DeckPlayer(canvas, deck, {
    onChange: (i) => {
      pos.textContent = `${i + 1} / ${deck.slides.length}`;
      list.querySelectorAll('button').forEach((b, k) => b.classList.toggle('now', k === i));
      if (drawn !== i) { drawn = i; drawPractice(i); }
      // The address follows the slide, so a copied or bookmarked address opens here again (not in follow mode,
      // where the room decides the slide).
      if (mode !== 'follow') { try { history.replaceState(null, '', slideHash(i)); } catch { /* a sandboxed frame */ } }
    },
  });
  if (mode !== 'follow' && startAt !== null && startAt > 0 && startAt < deck.slides.length) player.cut(startAt, true);
  drawPractice(player.index);
  drawScore();

  share.onclick = async () => {
    const url = `${location.origin}${location.pathname}${location.search}${slideHash(player.index)}`;
    try { await navigator.clipboard.writeText(url); share.textContent = 'Copied'; }
    catch { window.prompt('Copy this link to the slide:', url); }
    setTimeout(() => { share.textContent = 'Link'; }, 1600);
  };
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
