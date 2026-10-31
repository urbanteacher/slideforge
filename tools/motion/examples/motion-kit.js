/* The motion kit: timing and drawing helpers for clips written to the render
   contract in tools/motion/README.md. Every function is a pure function of t,
   so any frame can be drawn first and nothing is stepped.
   The renderer serves only the clip's own folder, so copy this file (or link
   it) beside the clip and load it with <script src="motion-kit.js">. It sets
   window.MotionKit; in Node, require() returns the same object.

   Where each piece comes from (Opus 5.5 motion studios, Sept 2026):
     track, blur ........ the "motion design studio" course (@0xMovez) and
                          buildwithhanif/claude-animation-skill (lib/film.mjs)
     kick, keys, arc .... JohnHeibel/ClaudeAnimationBase (src/core.js)
     exposure, timeWarp,
     shake, afterimages . buildwithhanif/claude-animation-skill (lib/film.mjs, lib/fx.mjs)
     path ............... WinterArc21/Battle-of-Austerlitz-Film (web/film.js camPath) */
(function (root) {
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => { k = clamp(k); return k * k * (3 - 2 * k); };

  /* The README's curves (cubic-bezier x1, y1, x2, y2), solved for y at x. */
  function bezier(x1, y1, x2, y2) {
    const f = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 30; i++) { t = (lo + hi) / 2; if (f(x1, x2, t) < x) lo = t; else hi = t; }
      return f(y1, y2, t);
    };
  }
  const ease = {
    outExpo: bezier(0.16, 1, 0.3, 1), outQuint: bezier(0.22, 1, 0.36, 1),
    inOutQuart: bezier(0.76, 0, 0.24, 1), inExpo: bezier(0.7, 0, 0.84, 0),
    outBack: bezier(0.34, 1.56, 0.64, 1), smooth,
  };
  /* 0..1 progress of t through a move that starts at a and lasts d. */
  const span = (t, a, d) => clamp((t - a) / d);

  /* A damped spring released at 0, heading for 1, s seconds later. damping 1
     never overshoots; 0.7–0.85 settles calmly; 0.4–0.6 bounces. hz is how fast
     it swings. */
  function spring(s, damping = 0.75, hz = 1.6) {
    if (s <= 0) return 0;
    const w = 2 * Math.PI * hz;
    if (damping >= 1) return 1 - Math.exp(-w * s) * (1 + w * s);
    const wd = w * Math.sqrt(1 - damping * damping);
    return 1 - Math.exp(-damping * w * s) * (Math.cos(wd * s) + damping * w / wd * Math.sin(wd * s));
  }

  /* A value that is sent to a new target several times: keys [[t, v], ...] by
     time. One spring per change, each from its own time, summed, so a change of
     target mid-flight stays smooth and the value never restarts from rest. */
  function track(t, keys, damping, hz) {
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], damping, hz);
    return v;
  }

  /* A wobble kicked at each time in `times`: 0 at rest, swinging about 0 and
     dying away. For secondary motion: what jiggles after a landing, a label
     that sways when the bar under it stops. Scale it by an amplitude. */
  function kick(t, times, decay = 6, hz = 3) {
    let v = 0;
    for (const t0 of [].concat(times)) {
      const s = t - t0;
      if (s > 0) v += Math.exp(-decay * s) * Math.sin(2 * Math.PI * hz * s);
    }
    return v;
  }

  /* Keyframes [[t, v], ...] eased between; v may be a number or an array. */
  function keys(t, list, e = smooth) {
    if (t <= list[0][0]) return list[0][1];
    for (let i = 1; i < list.length; i++) {
      if (t < list[i][0]) {
        const [a, va] = list[i - 1], [b, vb] = list[i], k = e((t - a) / (b - a));
        return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
      }
    }
    return list[list.length - 1][1];
  }

  /* A point on a thrown arc from p0 to p1, peaking h above the straight line;
     k is 0..1 along the flight. */
  const arc = (p0, p1, h, k) => [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) - h * 4 * k * (1 - k)];

  /* A smooth path through points: keys [[t, [x, y, ...]], ...]. Catmull-Rom
     between the keys, so it passes through every one without a corner, and
     eased at the two ends so it leaves and arrives gently. For a camera, a
     pointer or anything that travels through several places. */
  function path(t, list) {
    const L = list.length;
    if (t <= list[0][0]) return list[0][1].slice();
    if (t >= list[L - 1][0]) return list[L - 1][1].slice();
    let i = 0;
    while (i < L - 2 && t > list[i + 1][0]) i++;
    let u = (t - list[i][0]) / (list[i + 1][0] - list[i][0]);
    if (i === 0) u = (smooth(u) + u) / 2;
    if (i === L - 2) u = (smooth(u) + u) / 2;
    const p = j => list[clamp(j, 0, L - 1)][1];
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2), u2 = u * u, u3 = u2 * u;
    return p1.map((_, d) => 0.5 * (2 * p1[d] + (p2[d] - p0[d]) * u
      + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3));
  }

  /* Which moment the drawing shows at t: on ones (every frame), on twos (each
     drawing held two frames, the hand-drawn cadence), or held still. Pass the
     result to the drawing and the raw t to the camera, so the camera stays
     smooth. track: [{ at: 0, on: 2 }, { at: 3, on: 1 }, { at: 5, hold: true }]. */
  function exposure(t, list, fps) {
    fps = fps || (root.MOTION && root.MOTION.fps) || 24;
    let cur = list[0];
    for (const e of list) if (t >= e.at) cur = e;
    if (cur.hold) return cur.at;
    const n = cur.on || 1, f = Math.floor((t - cur.at) * fps + 1e-6);
    return cur.at + Math.floor(f / n) * n / fps;
  }

  /* Hit-stop: story time freezes for a moment on each stop while the real
     clock runs on. stops: [[storyTime, seconds], ...]. game(t) is the story
     time at real time t; real(g) is when story time g is reached, so a cue
     written in story time lands on the freeze. Effects that should keep
     moving during a freeze (a ring, a word) run on t. */
  function timeWarp(stops) {
    const S = [...stops].sort((a, b) => a[0] - b[0]);
    return {
      game(t) { let acc = 0; for (const [s, d] of S) { if (t < s + acc) break; if (t < s + acc + d) return s; acc += d; } return t - acc; },
      real(g) { let acc = 0; for (const [s, d] of S) { if (s >= g) break; acc += d; } return g + acc; },
      frozen(t) { let acc = 0; for (const [s, d] of S) { if (t < s + acc) break; if (t < s + acc + d) return true; acc += d; } return false; },
    };
  }

  /* A shake that decays: events [[t0, amplitude px], ...]. Returns [dx, dy]. */
  function shake(t, events, dur = 0.45) {
    let x = 0, y = 0;
    for (const [t0, amp] of events) {
      const d = t - t0;
      if (d < 0 || d > dur) continue;
      const k = Math.exp(-d * 9) * amp;
      x += Math.sin(d * 97 + t0) * k; y += Math.cos(d * 83 + t0 * 3) * k * 0.8;
    }
    return [x, y];
  }

  /* Seeded randomness. rng(seed) is a stream (mulberry32); hash(n) is one
     value for a whole number; noise(x) is smooth value noise in -1..1. Seed by
     something fixed (an index), never by the frame, or the picture flickers. */
  function rng(seed) {
    return () => {
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const noise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1; };

  /* Motion blur on a canvas: draw(c, t) is called for `samples` moments spread
     across the shutter around t, and their average is laid over ctx. shutter
     is the share of a frame the shutter is open: 0.5 is film's 180°. Use it
     where something moves fast enough to strobe, not on still shots: it costs
     `samples` draws a frame. The average is premultiplied, so transparent
     edges don't darken. Canvas drawing only; the DOM isn't blurred. */
  const scratch = {};
  function surface(w, h, name) {
    const key = name + w + 'x' + h;
    if (!scratch[key]) {
      const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement('canvas'), { width: w, height: h });
      scratch[key] = { c, x: c.getContext('2d', { willReadFrequently: true }) };
    }
    return scratch[key];
  }
  function blur(ctx, t, draw, o = {}) {
    const n = o.samples || 4, shutter = o.shutter ?? 0.5, fps = o.fps || (root.MOTION && root.MOTION.fps) || 24;
    if (n <= 1 || shutter <= 0) { draw(ctx, t); return; }
    const w = ctx.canvas.width, h = ctx.canvas.height, s = surface(w, h, 'sample'), out = surface(w, h, 'out');
    const acc = new Float32Array(w * h * 4);
    for (let k = 0; k < n; k++) {
      s.x.setTransform(1, 0, 0, 1, 0, 0); s.x.globalAlpha = 1; s.x.clearRect(0, 0, w, h);
      draw(s.x, t + ((k + 0.5) / n - 0.5) * shutter / fps);
      const d = s.x.getImageData(0, 0, w, h).data;
      for (let j = 0; j < d.length; j += 4) {
        const a = d[j + 3];
        if (!a) continue;
        acc[j] += d[j] * a; acc[j + 1] += d[j + 1] * a; acc[j + 2] += d[j + 2] * a; acc[j + 3] += a;
      }
    }
    const img = out.x.createImageData(w, h), p = img.data;
    for (let j = 0; j < acc.length; j += 4) {
      const a = acc[j + 3];
      if (!a) continue;
      p[j] = acc[j] / a; p[j + 1] = acc[j + 1] / a; p[j + 2] = acc[j + 2] / a; p[j + 3] = a / n;
    }
    out.x.putImageData(img, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(out.c, 0, 0); ctx.restore();
  }

  /* Fading copies of a fast move at earlier moments, drawn under it: a dash,
     a flick. draw(ctx, t, i) draws the moment t; i counts back from 1. */
  function afterimages(ctx, t, draw, { n = 4, gap = 0.035, alpha = 0.35 } = {}) {
    for (let i = n; i >= 1; i--) {
      ctx.save(); ctx.globalAlpha *= alpha * (1 - i / (n + 1)); draw(ctx, t - i * gap, i); ctx.restore();
    }
  }

  const kit = {
    clamp, lerp, span, ease, bezier, spring, track, kick, keys, arc, path,
    exposure, timeWarp, shake, rng, hash, noise, blur, afterimages,
  };
  root.MotionKit = kit;
  if (typeof module !== 'undefined' && module.exports) module.exports = kit;
})(typeof window !== 'undefined' ? window : globalThis);
