/* The shared kit for The Power of AI's clips (tools/build-ai-sme-productivity.js).
   Each clip is one HTML file in this folder written to the render contract in
   tools/motion/README.md: renderAt(t) draws frame t from scratch.
     node tools/motion/render.mjs tools/ai-sme/clips/<clip>.html --sheet
   fonts/ is a link to assets/fonts/ukbt, because the renderer serves only this
   folder. The colours are the UK Black Tech theme's (css/ukbt.css). */
(function (root) {
  'use strict';
  const INK = {
    navy: '#254258', deep: '#1b3245', card: 'rgba(255,255,255,.07)', line: 'rgba(255,255,255,.16)',
    white: '#ffffff', mist: '#c9d6df', green: '#00c57f', lime: '#cefd85',
    coral: '#ff9667', violet: '#b97bf7', sky: '#4abffd'
  };

  /* The motion README's curves, solved for y at x. */
  function bezier(x1, y1, x2, y2) {
    const f = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 30; i++) { t = (lo + hi) / 2; if (f(x1, x2, t) < x) lo = t; else hi = t; }
      return f(y1, y2, t);
    };
  }
  const outExpo = bezier(0.16, 1, 0.3, 1);
  const outQuint = bezier(0.22, 1, 0.36, 1);
  const inOutQuart = bezier(0.76, 0, 0.24, 1);
  const inExpo = bezier(0.7, 0, 0.84, 0);
  const span = (t, a, d) => Math.min(1, Math.max(0, (t - a) / d));
  const mix = (a, b, k) => a + (b - a) * k;

  /* A damped spring in closed form (see tools/motion/examples/title-reveal.html). */
  function spring(s, damping = 0.75, hz = 1.6) {
    if (s <= 0) return 0;
    const w = 2 * Math.PI * hz;
    if (damping >= 1) return 1 - Math.exp(-w * s) * (1 + w * s);
    const wd = w * Math.sqrt(1 - damping * damping);
    return 1 - Math.exp(-damping * w * s) * (Math.cos(wd * s) + damping * w / wd * Math.sin(wd * s));
  }

  /* A line of words that rise in one after another: build once, then reveal(t). */
  function words(el, text) {
    el.innerHTML = text.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
    const spans = [...el.querySelectorAll('.w')];
    return (t, start, gap = 0.09, out = Infinity) => {
      const e = inExpo(span(t, out, 0.4));
      spans.forEach((s, i) => {
        const k = outExpo(span(t, start + i * gap, 0.7));
        s.style.opacity = k * (1 - e);
        s.style.transform = `translateY(${(1 - k) * 40 - e * 20}px)`;
      });
    };
  }

  /* Show or hide an element by a 0–1 amount, with an optional lift. */
  function fade(el, k, lift = 0) {
    el.style.opacity = k;
    el.style.transform = `translateY(${(1 - k) * lift}px)`;
  }

  /* Load the three weights before the first frame. document.fonts.ready alone
     can resolve before a face has even been asked for. */
  const fontsReady = Promise.all(['400', '600', '700'].map(w => document.fonts.load(`${w} 40px "Uncut Sans"`)))
    .then(() => document.fonts.ready);

  root.KIT = { INK, fontsReady, bezier, outExpo, outQuint, inOutQuart, inExpo, span, mix, spring, words, fade };
})(window);
