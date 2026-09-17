/* Generated from src/model.js. Do not edit; run npm run build. */
"use strict";
(() => {
  // src/render/body-region.js
  function declareBodyRegion(root, slide) {
    const body = root.querySelector(".cp-body");
    if (body) {
      body.dataset.bodyRegion = "composition";
      return;
    }
    const pad = root.querySelector(":scope > .pad");
    if (!pad) return;
    pad.dataset.bodyRegion = ["image", "video", "gallery", "split", "introduction"].includes(slide.type) ? "media-stage" : "content";
  }
  function origin(node, root) {
    let left = 0, top = 0, current = node;
    while (current && current !== root) {
      left += current.offsetLeft;
      top += current.offsetTop;
      current = current.offsetParent;
    }
    return current === root ? { left, top } : null;
  }
  function measureBodyRegion(root) {
    if (!root?.isConnected || !root.offsetWidth || !root.offsetHeight) return null;
    const body = root.querySelector("[data-body-region]");
    if (!body) return null;
    const position = origin(body, root);
    if (!position) return null;
    const style = getComputedStyle(body), px = (k) => parseFloat(style[k]) || 0;
    const content = body.dataset.bodyRegion === "content";
    const l = content ? px("paddingLeft") : 0, r = content ? px("paddingRight") : 0, t = content ? px("paddingTop") : 0, b = content ? px("paddingBottom") : 0;
    const rect = { left: position.left + body.clientLeft + l, top: position.top + body.clientTop + t, width: Math.max(0, body.clientWidth - l - r), height: Math.max(0, body.clientHeight - t - b) };
    const css = getComputedStyle(root), token = (k) => parseFloat(css.getPropertyValue(k)) || 0;
    const chromeTop = token("--sf-chrome-top") + token("--sf-header-h");
    const number = root.querySelector(":scope > .pagenum");
    const chromeBottom = number ? root.offsetHeight - (parseFloat(getComputedStyle(number).bottom) || 0) - token("--sf-footer-h") : root.offsetHeight;
    return {
      ...rect,
      kind: body.dataset.bodyRegion,
      element: body,
      // Contact with a reserved band is a diagnostic, not a claim of text overlap.
      headerOverlap: Math.max(0, chromeTop - rect.top),
      footerOverlap: Math.max(0, rect.top + rect.height - chromeBottom),
      rows: body.dataset.bodyRegion === "composition" && !root.classList.contains("chrome-regions") ? 16 : null
    };
  }

  // src/render/fit-check.js
  var FIT_TOLERANCE = 1;
  var LEGIBLE_FLOOR = 20;
  function svgScale(el) {
    const svg = el.ownerSVGElement;
    if (!svg) return 1;
    const view = svg.viewBox?.baseVal;
    const box2 = svg.getBoundingClientRect();
    if (!view || !view.width || !view.height || !box2.width) return 1;
    return Math.min(box2.width / view.width, box2.height / view.height);
  }
  function describe(el) {
    const cls = el.className?.baseVal ?? el.className;
    const first = String(cls || "").trim().split(/\s+/)[0];
    return first ? `${el.tagName.toLowerCase()}.${first}` : el.tagName.toLowerCase();
  }
  function clipper(el, root) {
    for (let node = el; node && node !== root.parentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/hidden|clip|auto|scroll/.test(style.overflowX + " " + style.overflowY)) return node;
    }
    return null;
  }
  function escapes(rect, frame, tolerance) {
    const out = [];
    if (rect.bottom > frame.bottom + tolerance) out.push(["bottom", rect.bottom - frame.bottom]);
    if (rect.right > frame.right + tolerance) out.push(["right", rect.right - frame.right]);
    if (rect.left < frame.left - tolerance) out.push(["left", frame.left - rect.left]);
    return out;
  }
  function measureSlideFit(root, opts = {}) {
    if (!root?.isConnected) return null;
    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const tolerance = opts.tolerance ?? FIT_TOLERANCE;
    const floor = opts.floor ?? LEGIBLE_FLOOR;
    const frame = (opts.frame ?? root).getBoundingClientRect();
    const issues = [];
    const seen = /* @__PURE__ */ new Set();
    const add = (element, direction, px, text2) => {
      const key = `${element}|${direction}`;
      if (seen.has(key)) return;
      seen.add(key);
      issues.push({ element, direction, px: Math.round(px * 10) / 10, text: text2 });
    };
    let smallest = null;
    let smallestIn = null;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const node = walk.currentNode;
      const words = node.textContent || "";
      if (!words.trim()) continue;
      const el = node.parentElement;
      if (!el) continue;
      const painted = el.getBoundingClientRect();
      if (!painted.height) continue;
      if (words.trim().length >= 3) {
        const size = parseFloat(getComputedStyle(el).fontSize) * svgScale(el);
        if (Number.isFinite(size) && (smallest === null || size < smallest)) {
          smallest = size;
          smallestIn = describe(el);
        }
      }
      const clip = clipper(el, root);
      const clipBox = clip && clip !== root ? clip.getBoundingClientRect() : null;
      for (const word of words.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, word.index ?? 0);
        range.setEnd(node, (word.index ?? 0) + word[0].length);
        for (const box2 of range.getClientRects()) {
          if (!box2.width || !box2.height) continue;
          for (const [direction, px] of escapes(box2, frame, tolerance)) {
            add(describe(el), direction, px, word[0]);
          }
          if (clipBox) {
            for (const [direction, px] of escapes(box2, clipBox, tolerance)) {
              add(describe(el), `clipped-${direction}`, px, word[0]);
            }
          }
        }
      }
    }
    return {
      fits: !issues.length,
      legible: smallest === null || smallest >= floor,
      issues,
      smallest: smallest === null ? null : Math.round(smallest * 10) / 10,
      smallestIn
    };
  }
  async function probeLayoutFit(deck, slide, type2, host, api) {
    const trial = api.prepareLayout(structuredClone(slide), type2);
    const root = api.renderSlide(deck, trial, {
      index: api.index ?? 0,
      total: api.total ?? 1,
      revealed: 99
    });
    host.replaceChildren(root);
    if (api.prepare) api.prepare(root, trial);
    if (api.settle) await api.settle();
    const verdict = measureSlideFit(root, { tolerance: api.tolerance, floor: api.floor });
    const extra = api.inspect ? api.inspect(root, trial) || {} : {};
    const title = String(slide.title || "").trim();
    const flat = (root.textContent || "").replace(/\s+/g, " ");
    const keepsHeading = !title || flat.includes(title.replace(/\s+/g, " "));
    host.replaceChildren();
    return {
      type: type2,
      rendered: !!verdict,
      fits: !!verdict?.fits,
      legible: !!verdict?.legible,
      keepsHeading,
      issues: verdict?.issues ?? [],
      smallest: verdict?.smallest ?? null,
      ...extra
    };
  }

  // src/themes.js
  var DEFAULT_THEME = "studio";
  var CAMPAIGN_COMPOSITIONS = {
    title: "poster-art",
    quote: "voice",
    cards: "ballot",
    statement: "prompt",
    journey: "rules",
    keyfact: "commitment",
    compare: "comparison",
    iceberg: "reveal-map",
    sourcecheck: "credits",
    spectrum: "lanes"
  };
  var THEMES = {
    studio: { name: "Studio · Sage & ink", swatch: "#dce8cc", art: { "className": "studio-art", "html": '<div class="art-orbit"></div><div class="art-tile">✳</div><div class="art-dot"></div><div class="art-caption">STAY CURIOUS.</div>', "layouts": ["title", "section"] }, ground: "light", defaults: {} },
    northeastern: { name: "Northeastern London", swatch: "#c8102e", ground: { default: "light", title: "dark", section: "dark", quote: "dark" }, art: { "className": "nu-art", "html": '<div class="nu-skyline"></div><div class="nu-n"></div>', "layouts": ["title", "section"], "eyebrow": { "className": "nu-eyebrow", "title": ["title", "org"], "section": ["org"] } }, defaults: {} },
    ukbt: { name: "UK Black Tech", swatch: "#264258", ground: "dark", art: { "className": "ukbt-art", "html": '<div class="ukbt-chev ukbt-chev-back"></div><div class="ukbt-chev ukbt-chev-front"></div><div class="ukbt-object"></div>', "layouts": ["title", "section"] }, defaults: {} },
    "ukbt-institute": { name: "UKBT Institute", swatch: "#2d3134", ground: "dark", art: { "className": "ukbt-art", "html": '<div class="ukbt-chev ukbt-chev-back"></div><div class="ukbt-chev ukbt-chev-front"></div><div class="ukbt-object"></div>', "layouts": ["title", "section"] }, defaults: {} },
    /* AI Awareness Day 2026. One design, five grounds: the campaign gives each
       of its principles a colour, and a starter deck belongs to exactly one of
       them, so the principle is the theme rather than a setting inside it.
       Picking "Safe" is how a deck gets the cyan badge and the cyan rules —
       there is nothing else to set. See css/aiad26.css. */
    "aiad26-safe": { name: "AI Awareness · Safe", swatch: "#00c4ee", art: { "className": "aiad-art", "html": '<div class="aiad-fold"></div><div class="aiad-seam"></div>', "layouts": ["title", "section"] }, ground: "light", defaults: {} },
    "aiad26-smart": { name: "AI Awareness · Smart", swatch: "#ff6734", art: { "className": "aiad-art", "html": '<div class="aiad-fold"></div><div class="aiad-seam"></div>', "layouts": ["title", "section"] }, ground: "light", defaults: {} },
    "aiad26-creative": { name: "AI Awareness · Creative", swatch: "#795bff", art: { "className": "aiad-art", "html": '<div class="aiad-fold"></div><div class="aiad-seam"></div>', "layouts": ["title", "section"] }, ground: "light", defaults: {} },
    "aiad26-responsible": { name: "AI Awareness · Responsible", swatch: "#00a896", art: { "className": "aiad-art", "html": '<div class="aiad-fold"></div><div class="aiad-seam"></div>', "layouts": ["title", "section"] }, ground: "light", defaults: {} },
    "aiad26-future": { name: "AI Awareness · Future", swatch: "#ff7eed", art: { "className": "aiad-art", "html": '<div class="aiad-fold"></div><div class="aiad-seam"></div>', "layouts": ["title", "section"] }, ground: "light", defaults: {} },
    /* AI Awareness Day 2027 — Keep Humans in the Loop. Five themes, one per
       strand. Colour is paired with the strand name on every slide, and each
       cover has a distinct graphic. See css/aiad27.css. */
    "aiad27-safe": { chromeIdentity: "Safe", name: "AIAD27 · Safe", swatch: "#00BEDD", ground: { default: "light", quote: "dark", journey: "dark" }, defaults: CAMPAIGN_COMPOSITIONS, art: null },
    "aiad27-smart": { chromeIdentity: "Smart", name: "AIAD27 · Smart", swatch: "#FF7038", ground: { default: "light", quote: "dark", journey: "dark" }, defaults: CAMPAIGN_COMPOSITIONS, art: null },
    "aiad27-creative": { chromeIdentity: "Creative", name: "AIAD27 · Creative", swatch: "#AC91FF", ground: { default: "light", quote: "dark", journey: "dark" }, defaults: CAMPAIGN_COMPOSITIONS, art: null },
    "aiad27-responsible": { chromeIdentity: "Responsible", name: "AIAD27 · Responsible", swatch: "#63DF93", ground: { default: "light", quote: "dark", journey: "dark" }, defaults: CAMPAIGN_COMPOSITIONS, art: null },
    "aiad27-future": { chromeIdentity: "Future", name: "AIAD27 · Future", swatch: "#FA83EB", ground: { default: "light", quote: "dark", journey: "dark" }, defaults: CAMPAIGN_COMPOSITIONS, art: null },
    product: { name: "Product · Keynote minimal", swatch: "#f5f5f7", art: { "className": "pd-art", "html": '<div class="pd-bloom"></div><div class="pd-ring"></div>', "layouts": ["title", "section"] }, ground: "light", defaults: {} },
    editorial: { name: "Editorial · Paper", swatch: "#f3efe6", art: { "className": "ed-art", "html": '<div class="ed-rules"></div><div class="ed-quote">”</div>', "layouts": ["title", "section"] }, ground: "light", defaults: {} },
    cinematic: { name: "Cinematic · Dark pitch", swatch: "#0a0b0f", ground: "dark", art: { "className": "cine-art", "html": '<div class="cine-bar cine-top"></div><div class="cine-bar cine-bottom"></div><div class="cine-streak"></div><div class="cine-vignette"></div>', "layouts": ["title", "section"] }, defaults: {} },
    brutal: { name: "Brutal · Mono", swatch: "#111111", ground: "dark", art: { "className": "brut-art", "html": '<div class="brut-grid"></div><div class="brut-marks"></div>', "layouts": ["title", "section"] }, defaults: {} },
    midnight: { name: "Midnight", swatch: "#1b2a4a", ground: "dark", art: null, defaults: {} },
    paper: { name: "Paper", swatch: "#f4f1ea", ground: "light", art: null, defaults: {} },
    ocean: { name: "Ocean", swatch: "#0d5c63", ground: "dark", art: null, defaults: {} },
    ember: { name: "Ember", swatch: "#3d1b2a", ground: "dark", art: null, defaults: {} },
    mono: { name: "Mono", swatch: "#111111", ground: "dark", art: null, defaults: {} }
  };
  function themeGround(theme, layout) {
    const ground = THEMES[theme]?.ground;
    const resolved = typeof ground === "object" && ground ? layout && ground[layout] || ground.default : ground;
    return resolved === "dark" ? "dark" : "light";
  }
  function resolveTheme(theme) {
    return Object.hasOwn(THEMES, theme) ? theme : DEFAULT_THEME;
  }

  // src/render/regions.js
  var CHROME_SLOTS = ["header-left", "header-center", "header-right", "footer-left", "footer-center", "footer-right"];
  var DEFAULTS = { identitySlot: "header-left", logoSlot: "header-right", contextSlot: "header-center", closingSlot: "footer-left", numberSlot: "footer-right" };
  function supportsChromeRegions(SF, deck, slide) {
    const choice3 = SF.slideComposition(deck, slide);
    return !!(choice3 && SF.COMPOSITIONS[choice3]?.structured);
  }
  function chromePositions(design = {}) {
    const result = { ...DEFAULTS }, used = /* @__PURE__ */ new Set();
    for (const key of Object.keys(DEFAULTS)) {
      const wanted = CHROME_SLOTS.includes(design[key]) ? design[key] : DEFAULTS[key];
      const slot = !used.has(wanted) ? wanted : CHROME_SLOTS.find((s) => !used.has(s));
      result[key] = slot;
      used.add(slot);
    }
    return result;
  }
  function setChromeSlot(slide, key, slot) {
    if (!Object.hasOwn(DEFAULTS, key) || !CHROME_SLOTS.includes(slot)) return false;
    const design = slide.design || (slide.design = {}), positions = chromePositions(design), previous = positions[key];
    const occupant = Object.keys(positions).find((k) => k !== key && positions[k] === slot);
    if (occupant) positions[occupant] = previous;
    positions[key] = slot;
    Object.assign(design, positions, { chromeLayout: "regions" });
    return true;
  }
  function applyChromeRegions(root, slide, deck) {
    if (slide.design?.chromeLayout !== "regions" || !root.classList.contains("composition-structured")) return;
    const header = root.querySelector(".cp-header"), footer = root.querySelector(".cp-footer");
    if (!header || !footer) return;
    const nodes = (
      /** @type {Record<string, HTMLElement|null>} */
      { logoSlot: root.querySelector(".slide-logo"), contextSlot: header.querySelector(".cp-beat"), closingSlot: footer.querySelector(".cp-footer-note"), numberSlot: root.querySelector(".pagenum") }
    );
    const identity = THEMES[resolveTheme(deck.theme)].chromeIdentity;
    if (identity) {
      const node = document.createElement("div");
      node.className = "chrome-identity";
      node.textContent = identity;
      nodes.identitySlot = node;
    }
    root.classList.add("chrome-regions");
    root.classList.remove("has-corner-mark");
    const slots = {};
    for (const name of CHROME_SLOTS) {
      const slot = document.createElement("div");
      slot.className = "chrome-slot";
      slot.dataset.region = name;
      (name.startsWith("header-") ? header : footer).appendChild(slot);
      slots[name] = slot;
    }
    const positions = chromePositions(slide.design);
    for (const [key, node] of Object.entries(nodes)) if (node) {
      node.dataset.chromeItem = key;
      slots[positions[key]].appendChild(node);
    }
    for (const region of [header, footer]) region.classList.toggle("region-empty", !region.querySelector("[data-chrome-item]"));
  }

  // src/render/canvas-regions.js
  var LABELS = { identitySlot: "theme identity", logoSlot: "logo", contextSlot: "slide context", closingSlot: "closing text", numberSlot: "page number" };
  var slotLabel = (slot) => slot.replace("-", " ").replace("center", "centre");
  function bindCanvasRegions(root, slide, onChange) {
    if (!root.classList.contains("chrome-regions")) return;
    let overlay = null, active = null;
    function dismiss(focus = true) {
      overlay?.remove();
      overlay = null;
      if (active) {
        active.setAttribute("aria-expanded", "false");
        if (focus) active.focus();
      }
      active = null;
    }
    function commit(key, slot) {
      if (chromePositions(slide.design)[key] === slot) {
        dismiss();
        return;
      }
      dismiss(false);
      if (setChromeSlot(slide, key, slot)) onChange(key);
    }
    function show(handle, key, keyboard) {
      dismiss(false);
      active = handle;
      handle.setAttribute("aria-expanded", "true");
      overlay = document.createElement("div");
      overlay.className = "canvas-region-targets";
      overlay.setAttribute("role", "group");
      overlay.setAttribute("aria-label", "Choose a position for " + LABELS[key]);
      const positions = chromePositions(slide.design);
      for (const [i, slot] of CHROME_SLOTS.entries()) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.snapSlot = slot;
        button.style.gridColumn = String(i % 3 + 1);
        button.style.gridRow = i < 3 ? "1" : "3";
        const occupant = Object.keys(positions).find((k) => k !== key && positions[k] === slot && root.querySelector("[data-chrome-item=" + k + "]"));
        button.textContent = slotLabel(slot) + (occupant ? " · swap " + LABELS[occupant] : "");
        button.setAttribute("aria-label", "Move " + LABELS[key] + " to " + slotLabel(slot) + (occupant ? ", swap with " + LABELS[occupant] : ""));
        button.onclick = (e) => {
          e.stopPropagation();
          commit(key, slot);
        };
        button.onkeydown = (e) => {
          if (e.metaKey || e.ctrlKey) return;
          e.stopPropagation();
          if (e.key === "Escape") {
            e.preventDefault();
            dismiss();
          }
          const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[e.key];
          if (delta) {
            e.preventDefault();
            const buttons = overlay.querySelectorAll("button");
            buttons[(i + delta + 6) % 6].focus();
          }
        };
        overlay.appendChild(button);
      }
      const hint = document.createElement("div");
      hint.className = "canvas-region-hint";
      hint.textContent = "Choose a slot · occupied items swap · Esc cancels";
      hint.setAttribute("role", "status");
      overlay.appendChild(hint);
      root.appendChild(overlay);
      if (keyboard) overlay.querySelector('button[data-snap-slot="' + positions[key] + '"]')?.focus();
    }
    root.querySelectorAll("[data-chrome-item]").forEach((item) => {
      const key = item.dataset.chromeItem, handle = document.createElement("button");
      handle.type = "button";
      handle.className = "canvas-region-handle";
      handle.dataset.moveItem = key;
      handle.textContent = "✥";
      handle.title = "Drag " + LABELS[key] + " to a slot, or click to choose";
      handle.setAttribute("aria-label", "Move " + LABELS[key]);
      handle.setAttribute("aria-expanded", "false");
      item.parentElement.appendChild(handle);
      let start = null, dragging = false, suppressClick = false;
      function hit(e) {
        return document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-snap-slot]");
      }
      function cancel() {
        if (start || dragging) suppressClick = true;
        start = null;
        dragging = false;
        dismiss();
      }
      handle.onpointerdown = (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        suppressClick = false;
        start = { x: e.clientX, y: e.clientY };
        handle.setPointerCapture(e.pointerId);
      };
      handle.onpointermove = (e) => {
        if (!start) return;
        if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) {
          dragging = true;
          show(handle, key, false);
        }
        if (!dragging) return;
        const target = hit(e);
        overlay.querySelectorAll("button").forEach((b) => b.classList.toggle("snap-active", b === target));
      };
      handle.onpointerup = (e) => {
        if (!start) return;
        start = null;
        if (!dragging) return;
        dragging = false;
        suppressClick = true;
        const target = hit(e);
        if (target && overlay?.contains(target)) commit(key, target.getAttribute("data-snap-slot"));
        else dismiss();
      };
      handle.onpointercancel = cancel;
      handle.onlostpointercapture = () => {
        if (start) cancel();
      };
      handle.onkeydown = (e) => {
        if (e.metaKey || e.ctrlKey) return;
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      };
      handle.onclick = (e) => {
        e.stopPropagation();
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        show(handle, key, true);
      };
    });
  }

  // src/render/compositions.js
  function createCompositionRenderer(SF, helpers) {
    const { el, rich, asStep, layoutQuote, layoutStatement, appendSlideDate } = helpers;
    const LETTERS = ["A", "B", "C", "D", "E", "F"];
    function layoutComposition(deck, slide, pad, root) {
      var choice3 = SF.slideComposition(deck, slide);
      if (!choice3 || !SF.COMPOSITIONS[choice3].structured) return false;
      root.classList.add("composition-structured", "cp", "cp-" + slide.type);
      var header = el("div", "cp-header");
      var beatAsEyebrow = ["title", "quote", "statement", "keyfact"].includes(slide.type);
      var beatAsClosing = slide.type === "journey";
      var beatInHeader = slide.subtitle && !beatAsEyebrow && !beatAsClosing && !["compare", "spectrum"].includes(slide.type);
      if (beatInHeader) header.appendChild(rich("div", "cp-beat", slide, "subtitle", slide.subtitle));
      pad.appendChild(header);
      var body = el("div", "cp-body");
      pad.appendChild(body);
      var footer = el("div", "cp-footer");
      var closing = deck.closingNote || deck.org;
      if (closing) footer.appendChild(el("span", "cp-footer-note", closing));
      pad.appendChild(footer);
      function field(tag, cls, key) {
        return rich(tag, cls, slide, key, slide[key] || "");
      }
      function heading() {
        body.appendChild(field("h2", "cp-heading", "title"));
      }
      function note() {
        if (slide.body) body.appendChild(field("p", "cp-source", "body"));
      }
      function parts(line) {
        return SF.parseInfoLine(line);
      }
      function bullet(tag, cls, i, text2) {
        return rich(tag, cls, slide, "bullets." + i, text2);
      }
      function artwork() {
        if (!SF.safeMedia(slide.image)) return null;
        var art2 = el("div", "cp-art");
        var img = el("img", "cp-prop");
        img.alt = "";
        img.src = SF.safeMedia(slide.image);
        art2.appendChild(img);
        return art2;
      }
      if (slide.type === "title") {
        var title = el("div", "cp-title-copy");
        if (slide.subtitle) title.appendChild(rich("p", "cp-eyebrow", slide, "subtitle", slide.subtitle));
        title.appendChild(field("h1", "", "title"));
        if (slide.body) title.appendChild(field("p", "cp-tagline", "body"));
        appendSlideDate(slide, title);
        body.appendChild(title);
        var art = artwork();
        if (art) body.appendChild(art);
        else root.classList.add("cp-title-unillustrated");
      } else if (slide.type === "quote") {
        body.appendChild(el("span", "cp-quote-mark", "“"));
        if (slide.subtitle) body.appendChild(rich("p", "cp-eyebrow", slide, "subtitle", slide.subtitle));
        layoutQuote(Object.assign({}, slide, { subtitle: "" }), body);
        body.querySelector(".q").classList.add("cp-scenario");
      } else if (slide.type === "cards") {
        heading();
        var choices = el("div", "cp-choices");
        (slide.bullets || []).forEach(function(line, i) {
          var p = SF.parseKeywordLine(line), card = asStep(el("div", "cp-choice"), slide);
          card.appendChild(el("span", "cp-letter", LETTERS[i] || String(i + 1)));
          var copy = el("div", "cp-choice-copy");
          copy.appendChild(bullet("h3", "", i, p.term));
          copy.appendChild(bullet("p", "", i, p.def));
          card.appendChild(copy);
          choices.appendChild(card);
        });
        body.appendChild(choices);
        if (slide.body) body.appendChild(field("p", "cp-prompt", "body"));
      } else if (slide.type === "statement") {
        if (slide.subtitle) body.appendChild(rich("p", "cp-eyebrow", slide, "subtitle", slide.subtitle));
        var discussion = el("div", "cp-discussion");
        discussion.appendChild(el("span", "cp-pair-mark", "↔"));
        layoutStatement(Object.assign({}, slide, { subtitle: "" }), discussion);
        discussion.querySelector(".statement").classList.add("cp-question");
        body.appendChild(discussion);
      } else if (slide.type === "journey") {
        heading();
        var rules = el("div", "cp-rules");
        (slide.bullets || []).forEach(function(line, i) {
          var p = SF.parseKeywordLine(line), row = asStep(el("div", "cp-rule"), slide);
          row.appendChild(el("span", "cp-rule-number", "0" + (i + 1)));
          var copy = el("div");
          copy.appendChild(bullet("h3", "", i, p.term));
          copy.appendChild(bullet("p", "", i, p.def));
          row.appendChild(copy);
          rules.appendChild(row);
        });
        body.appendChild(rules);
        if (slide.subtitle) body.appendChild(rich("p", "cp-closing-line", slide, "subtitle", slide.subtitle));
        note();
      } else if (slide.type === "keyfact") {
        var actionMark = el("div", "cp-action-number", "↗");
        actionMark.setAttribute("aria-hidden", "true");
        body.appendChild(actionMark);
        var action = el("div", "cp-action");
        if (slide.subtitle) action.appendChild(rich("p", "cp-eyebrow", slide, "subtitle", slide.subtitle));
        action.appendChild(field("h2", "", "title"));
        action.appendChild(field("p", "", "body"));
        (slide.bullets || []).forEach(function(line, i) {
          action.appendChild(asStep(bullet("p", "cp-write-line", i, line), slide));
        });
        body.appendChild(action);
      } else if (slide.type === "compare") {
        heading();
        var heads = parts(slide.subtitle), table = el("div", "cp-comparison");
        var labelled = (slide.bullets || []).some(function(line) {
          return !!parts(line).note;
        });
        var th = el("div", "cp-compare-head" + (labelled ? " labelled" : ""));
        if (labelled) th.appendChild(el("span"));
        th.appendChild(rich("h3", "", slide, "subtitle", heads.label));
        th.appendChild(rich("h3", "", slide, "subtitle", heads.value));
        table.appendChild(th);
        (slide.bullets || []).forEach(function(line, i) {
          var p = parts(line), row = asStep(el("div", "cp-compare-row" + (labelled ? " labelled" : "")), slide);
          if (labelled) row.appendChild(bullet("p", "", i, p.note));
          row.appendChild(bullet("p", "", i, p.label));
          row.appendChild(bullet("p", "", i, p.value));
          table.appendChild(row);
        });
        body.appendChild(table);
        note();
      } else if (slide.type === "iceberg") {
        heading();
        var reveal = el("div", "cp-risk-map");
        var risks = el("div", "cp-risks");
        (slide.bullets || []).forEach(function(line, i) {
          var p = parts(line), row = asStep(el("div", "cp-risk"), slide);
          row.appendChild(bullet("span", "cp-risk-number", i, p.value || String(i + 1)));
          row.appendChild(bullet("h3", "", i, p.label));
          row.appendChild(bullet("p", "", i, p.note));
          risks.appendChild(row);
        });
        reveal.appendChild(risks);
        body.appendChild(reveal);
        note();
      } else if (slide.type === "sourcecheck") {
        heading();
        var receipt = el("div", "cp-credits");
        (slide.bullets || []).forEach(function(line, i) {
          var p = parts(line), row = asStep(el("div", "cp-credit"), slide);
          row.appendChild(bullet("span", "", i, p.label));
          row.appendChild(bullet("strong", "", i, p.value));
          row.appendChild(bullet("p", "", i, p.note));
          receipt.appendChild(row);
        });
        body.appendChild(receipt);
        note();
      } else if (slide.type === "spectrum") {
        heading();
        var lanes = el("div", "cp-lanes");
        [parts(slide.subtitle).label, parts(slide.subtitle).value].forEach(function(label, side) {
          var lane = el("div", "cp-lane");
          lane.appendChild(rich("h3", "", slide, "subtitle", label));
          (slide.bullets || []).forEach(function(line, i) {
            var p = parts(line);
            if ((Number(p.value) >= 50 ? 1 : 0) !== side) return;
            var item = asStep(el("div", "cp-lane-item"), slide);
            item.dataset.step = String(i);
            item.appendChild(bullet("strong", "", i, p.label));
            item.appendChild(bullet("span", "cp-lane-position", i, p.value));
            if (p.note) item.appendChild(bullet("p", "", i, p.note));
            lane.appendChild(item);
          });
          lanes.appendChild(lane);
        });
        body.appendChild(lanes);
        note();
      }
      return true;
    }
    function applyComposition(root, deck, slide) {
      var choice3 = SF.slideComposition(deck, slide);
      if (!choice3) return;
      root.dataset.composition = choice3;
      var statement = root.querySelector(".statement-word");
      if (statement) statement.style.removeProperty("font-size");
      var words = String(slide.type === "quote" || slide.type === "statement" ? slide.body || "" : slide.title || "");
      root.style.setProperty("--composition-display", words.length > 95 ? "var(--composition-display-longest,60px)" : words.length > 65 ? "var(--composition-display-long,72px)" : words.length > 35 ? "var(--composition-display-medium,86px)" : "var(--composition-display-short,112px)");
      var n = (slide.bullets || []).filter(function(x) {
        return String(x).trim();
      }).length;
      root.style.setProperty("--composition-columns", String(n === 2 ? 2 : 3));
      root.dataset.compositionDensity = n > 4 ? "dense" : "normal";
    }
    return { render: layoutComposition, apply: applyComposition };
  }

  // src/design-controls.js
  var DESIGN_CONTROLS = {
    chromeLayout: { label: "Header and footer", pane: "Look", types: ["title", "section", "statement", "quote", "content", "cards", "journey", "keyfact", "compare", "iceberg", "sourcecheck", "spectrum"], when: "Structured composition", description: "Use named slots for slide furniture. Theme placement preserves the existing design." },
    logoSlot: { label: "Logo position", pane: "Look", types: ["title", "section", "statement", "quote", "content", "cards", "journey", "keyfact", "compare", "iceberg", "sourcecheck", "spectrum"], when: "Structured composition with named regions enabled", description: "Move the deck logo to a named slot. Logo visibility still follows the deck settings." },
    identitySlot: { label: "Theme identity position", pane: "Look", types: ["title", "section", "statement", "quote", "content", "cards", "journey", "keyfact", "compare", "iceberg", "sourcecheck", "spectrum"], when: "Structured composition with named regions enabled", description: "Move the theme identity to a named slot, when the theme supplies one." },
    contextSlot: { label: "Slide context position", pane: "Look", types: ["title", "section", "statement", "quote", "content", "cards", "journey", "keyfact", "compare", "iceberg", "sourcecheck", "spectrum"], when: "Structured composition with named regions enabled", description: "Move the context line when this composition places it in the header. Eyebrows and lane headings stay with their content." },
    closingSlot: { label: "Closing text position", pane: "Look", types: ["title", "section", "statement", "quote", "content", "cards", "journey", "keyfact", "compare", "iceberg", "sourcecheck", "spectrum"], when: "Structured composition with named regions enabled", description: "Move the deck closing note or organisation to a named slot." },
    numberSlot: { label: "Page number position", pane: "Look", types: ["title", "section", "statement", "quote", "content", "cards", "journey", "keyfact", "compare", "iceberg", "sourcecheck", "spectrum"], when: "Structured composition with named regions enabled", description: "Move the page number. Visibility still follows the deck settings." },
    composition: { label: "Composition", pane: "Look", types: ["title", "section", "statement", "quote", "content", "cards", "journey", "keyfact", "compare", "iceberg", "sourcecheck", "spectrum"], description: "Arrange the same content. Theme default follows the theme; Original layout opts out." },
    align: { label: "Text alignment", pane: "Look", types: "*", description: "Align text left, centre or right." },
    size: { label: "Text size", pane: "Look", types: "*", description: "Scale text relative to the theme. Display sizes grow only as far as the content fits." },
    textColor: { label: "Text colour · whole slide", pane: "Look", types: "*", description: "Set the slide text colour. Individual words use the text formatting toolbar." },
    background: { label: "Slide background", pane: "Look", types: "*", description: "Replace the background with a solid colour. Check contrast after changing it." },
    placement: { label: "Image placement", pane: "Look", types: ["split"], description: "Place the picture left, right, above or below the text. Left/right also updates the image-side field." },
    imageShare: { label: "Image share", pane: "Look", types: ["split"], description: "Give the picture 35%, 50% or 65% of the split." },
    mediaGround: { label: "Picture mount", pane: "Look", types: ["split"], description: "Mount the picture on a card or extend it to the edges." },
    imageStep: { label: "Image arrives", pane: "Look", types: ["split"], description: "Show the picture with the slide, before the points or after them." },
    cardsMode: { label: "Cards layout", pane: "Look", types: ["cards"], description: "Choose a grid, full-width rows, a stack or picture cards. Selecting one returns to the original cards layout. Stack enables progressive builds." },
    cardPics: { label: "Picture shape", pane: "Look", types: ["cards"], when: "Picture cards selected or card images supplied", description: "Crop to portrait covers or contain landscape plates." },
    statStyle: { label: "Tile style", pane: "Look", types: ["stats"], description: "Display statistics as numbers, rings or KPI bars." },
    funnelDirection: { label: "Direction", pane: "Look", types: ["funnel"], description: "Draw a descending funnel or an ascending pyramid." },
    timelineMode: { label: "Shape", pane: "Look", types: ["timeline"], description: "Arrange dated events across a rail or down a spine." },
    backdrop: { label: "Backdrop motion", pane: "Look", types: ["title", "section"], description: "Animate a drift, grid or glow using theme colours." },
    logoGround: { label: "Logo sits on", pane: "Look", types: ["image", "gallery", "video"], description: "Choose the logo variant for the image behind it. Overrides the deck preference." },
    imageFrame: { label: "Image frame", pane: "Look", types: ["image", "gallery"], description: "Use full bleed or a fixed image ratio with the caption below." },
    capStyle: { label: "Caption style", pane: "Look", types: ["image", "gallery", "video", "split"], when: "Split slides need a caption", description: "Place a gradient or colour bar behind the caption, use plain text or hide it." },
    capPos: { label: "Caption position", pane: "Look", types: ["image", "gallery", "video"], description: "Place the caption at the top or bottom." },
    capFade: { label: "Caption clears itself", pane: "Look", types: ["image"], description: "Keep the caption or clear it after 5–30 seconds in the show." },
    imageMotion: { label: "Image motion", pane: "Look", types: ["image"], description: "Keep the image still, zoom slowly or travel between two focal points. Motion plays in Present." },
    focalX: { label: "Image focus horizontal", pane: "Look", types: ["split", "image"], description: "Choose the horizontal focus, from 0 to 100 percent." },
    focalY: { label: "Image focus vertical", pane: "Look", types: ["split", "image"], description: "Choose the vertical focus, from 0 to 100 percent." },
    focalX2: { label: "Travels to horizontal", pane: "Look", types: ["image"], when: "Image motion is Travel", description: "Set the horizontal destination of the image move." },
    focalY2: { label: "Travels to vertical", pane: "Look", types: ["image"], when: "Image motion is Travel", description: "Set the vertical destination of the image move." },
    imageTravelSecs: { label: "How long the move takes", pane: "Look", types: ["image"], when: "Image motion is Travel", description: "Choose a 12, 20 or 30 second move." },
    chartMotion: { label: "Chart motion", pane: "Look", types: ["chart"], description: "Show the chart already drawn or animate it on arrival in Present." },
    chartFocus: { label: "Focus one series", pane: "Look", types: ["chart"], when: "Chart has more than one series", description: "Emphasise one series while retaining the others for comparison." },
    words: { label: "Words arrive", pane: "Motion", types: ["statement"], description: "Animate the statement with Rise, Fade or Reveal. Reduced-motion preferences are respected." },
    wordSpeed: { label: "Speed", pane: "Motion", types: ["statement"], when: "Word animation enabled", description: "Set the speed of the word movement and its hold." },
    wordStagger: { label: "Spacing", pane: "Motion", types: ["statement"], when: "Word animation enabled", description: "Bring the words together, in a wave or one at a time." },
    wordFrom: { label: "Direction", pane: "Motion", types: ["statement"], when: "Word animation enabled; spacing is not Together", description: "Start at the first word, last word or centre." },
    wordsLoop: { label: "And leave again", pane: "Motion", types: ["statement"], when: "Word animation enabled", description: "Repeat the arrival, hold and exit." },
    wordPlan: { label: "AI choreography", pane: "Motion", types: ["statement"], when: "Word animation enabled", description: "Request a movement plan for these words or letters. Editing the text retires the old plan; Clear choreography removes it." }
  };
  function designApplies(key, type2) {
    const control = DESIGN_CONTROLS[key];
    return !!control && (control.types === "*" ? !["quiz", "game"].includes(type2) : control.types.includes(type2));
  }

  // src/deck/exploration.js
  function bounded(value, fallback, min, max) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }
  function normalizeExploration(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const min = bounded(r.min, 0, -1e3, 999);
    const max = bounded(r.max, 10, min + 1, 1e3);
    return {
      before: String(r.before || ""),
      after: String(r.after || ""),
      beforeLabel: String(r.beforeLabel || "Before").slice(0, 80),
      afterLabel: String(r.afterLabel || "After").slice(0, 80),
      alt: String(r.alt || "Compare the two states").slice(0, 300),
      spots: (Array.isArray(r.spots) ? r.spots : []).slice(0, 8).map((p) => ({
        x: bounded(p && p.x, 50, 0, 100),
        y: bounded(p && p.y, 50, 0, 100),
        zoom: bounded(p && p.zoom, 2, 1, 4),
        title: String(p && p.title || "Detail").slice(0, 100),
        body: String(p && p.body || "").slice(0, 500)
      })),
      model: r.model === "quadratic" ? "quadratic" : "linear",
      min,
      max,
      initial: bounded(r.initial, min, min, max),
      a: bounded(r.a, 2, -100, 100),
      b: bounded(r.b, 0, -1e3, 1e3),
      inputLabel: String(r.inputLabel || "Input").slice(0, 80),
      outputLabel: String(r.outputLabel || "Output").slice(0, 80),
      prediction: r.prediction === true,
      prompt: String(r.prompt || "What pattern do you predict?").slice(0, 240)
    };
  }
  function valueOf(c, x) {
    const input = bounded(x, c.initial, c.min, c.max);
    return c.a * (c.model === "quadratic" ? input * input : input) + c.b;
  }
  function explorationValue(config, x) {
    return valueOf(normalizeExploration(config), x);
  }
  function explorationCurve(config, steps) {
    const c = normalizeExploration(config);
    const n = Math.max(1, Math.min(400, Number(steps) || 100));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const x = c.min + (c.max - c.min) * i / n;
      out.push([x, valueOf(c, x)]);
    }
    return out;
  }

  // src/boards/runtime.js
  function createBoardRuntime(namespace, styles, clock = {
    now: () => Date.now(),
    every: (callback, milliseconds) => setInterval(callback, milliseconds),
    cancel: (timer) => clearInterval(timer)
  }) {
    function definitions() {
      const unique = /* @__PURE__ */ new Map();
      for (const style of Object.values(styles)) {
        if (style.boardEngine) unique.set(style.boardEngine.key, style.boardEngine);
      }
      return [...unique.values()];
    }
    function forSlide(slide) {
      return slide && definitions().find((board5) => slide[board5.field]) || null;
    }
    function current(host, slide) {
      const board5 = forSlide(slide);
      return board5 && host[board5.states] && host[board5.states][slide.id] || null;
    }
    function unmountAll() {
      for (const board5 of definitions()) namespace()[board5.runtime]?.unmount();
    }
    function reset(host) {
      unmountAll();
      for (const board5 of definitions()) host[board5.states] = {};
    }
    function mount(host, slide, node) {
      const board5 = forSlide(slide);
      if (board5) namespace()[board5.runtime]?.mount(host, slide, node);
    }
    function render(pad, slide, options, root) {
      const board5 = forSlide(slide);
      const engine = board5 && namespace()[board5.runtime];
      if (!engine) return false;
      root.classList.add(board5.className);
      engine.render(pad, slide, options);
      return true;
    }
    function snapshot(host) {
      return Object.fromEntries(
        definitions().map((board5) => [board5.states, host[board5.states] || {}])
      );
    }
    function renderOptions(host, slide, sendCommand) {
      const options = {};
      for (const board5 of definitions()) {
        options[board5.state] = host && host[board5.states] && host[board5.states][slide.id];
        options[board5.command] = sendCommand ? (action, card) => {
          const payload = { action };
          if (card !== void 0) payload.card = card;
          sendCommand(board5.key, payload);
        } : null;
      }
      return options;
    }
    function command(key, action, card) {
      const board5 = definitions().find((board6) => board6.key === key);
      const engine = board5 && namespace()[board5.runtime];
      if (!engine) return false;
      engine.command(action, card);
      return true;
    }
    function stamp(host, slide, theme) {
      const state = current(host, slide);
      return state ? JSON.stringify([slide.id, theme, { ...state, elapsed: 0, remaining: 0 }]) : null;
    }
    function refreshClock(box2, host, slide) {
      const board5 = forSlide(slide);
      const state = current(host, slide);
      const clock2 = board5?.clock && box2.querySelector(board5.clock.selector);
      if (!clock2 || !state) return false;
      clock2.textContent = board5.clock.text(state, namespace()[board5.runtime]);
      return true;
    }
    function restoreFocus(node, slide) {
      const board5 = forSlide(slide);
      if (!board5) return;
      const target = node.querySelector(board5.focusPrimary) || node.querySelector(board5.focusFallback);
      target?.focus({ preventScroll: true });
    }
    function onVerdict(report) {
      for (const board5 of definitions()) {
        const engine = namespace()[board5.runtime];
        if (engine)
          engine[board5.reportEvent || "onVerdict"] = board5.reportValue ? (value) => report(board5.reportValue(value)) : report;
      }
    }
    function createSession(key, { player, slide, node, create, render: render2, command: command2, tick, interval = 1e3 }) {
      const board5 = definitions().find((board6) => board6.key === key);
      player[board5.states] = player[board5.states] || {};
      if (!player[board5.states][slide.id])
        player[board5.states][slide.id] = create(slide[board5.field]);
      let last = clock.now();
      let stopped = false;
      const session = { player, slide, node };
      const sync = () => {
        if (player.syncPresenter) player.syncPresenter();
      };
      session.paint = (focus) => {
        render2(node.querySelector(".pad"), slide, {
          [board5.state]: player[board5.states][slide.id],
          [board5.command]: command2
        });
        if (focus) restoreFocus(node, slide);
        sync();
      };
      session.tick = () => {
        if (stopped) return;
        const now = clock.now();
        const dt = Math.max(0, (now - last) / 1e3);
        last = now;
        const state = player[board5.states][slide.id];
        if (state.paused || player.blank) return;
        if (tick(session, dt)) {
          refreshClock(node, player, slide);
          sync();
        }
      };
      session.start = () => {
        session.paint(false);
        session.timer = clock.every(session.tick, interval);
      };
      session.stop = () => {
        if (stopped) return;
        session.tick();
        clock.cancel(session.timer);
        stopped = true;
      };
      return session;
    }
    return {
      forSlide,
      current,
      unmountAll,
      reset,
      mount,
      render,
      snapshot,
      renderOptions,
      command,
      stamp,
      refreshClock,
      restoreFocus,
      onVerdict,
      createSession
    };
  }

  // src/activities/presets.js
  var box = (label, value, i) => ({ label, value, type: "area", slide: `bullets.${i}.def` });
  var text = (label, value, slide = "title") => ({ label, value, type: "text", slide });
  var rows = (items) => items.map(([label, value], i) => box(label, value, i));
  var page = (title, items, minutes) => ({ title, layout: "keywords", fields: rows(items), minutes });
  var preset = (items, extra = {}) => ({ layout: "keywords", fields: rows(items), ...extra });
  var PRESETS = {
    "clear-objectives-slide": preset([
      ["Learning objectives", "Measure length · Calculate perimeter · Explain your method."],
      ["Success criteria", "I can label lengths, add every side and give the correct unit."],
      ["Key words", "Length: distance along a line. Perimeter: distance around a shape."]
    ], { fieldsTitle: "Measuring the world around us" }),
    "hook-objectives": preset([
      ["Stimulus", "Two gardens have the same area. Do they need the same amount of fencing?"],
      ["Big question", "How can we work out the distance around any shape?"],
      ["Today we will…", "Measure a shape · Find its perimeter · Design a garden."],
      ["By the end you’ll be able to…", "Calculate a perimeter and explain how you checked it."]
    ], { reason: "Four explicitly presented boxes need labels; split reserves half the slide for an image." }),
    "daily-review-routine": preset([
      ["Homework check", "Compare your method with a partner. Mark one step you want to discuss."],
      ["Common errors", "Did you miss a side, mix units or calculate area instead of perimeter?"],
      ["Guided practice", "A 6 cm × 4 cm rectangle: 6 + 4 + 6 + 4 = 20 cm. Try 7 cm × 3 cm."],
      ["Today’s link", "Today we’ll build on this by finding missing side lengths."]
    ], { reason: "Four stages overflow the three-card row; labelled rows preserve the sequence.", answer: "Practice answer: 20 cm. Bring the actual homework answer key and replace the example errors with those observed." }),
    "establish-talk-ground-rules": preset([
      ["What makes group discussions go well?", "Think of a time you felt heard. What did the group do?"],
      ["What makes them go badly?", "Describe a behaviour that stops people contributing."],
      ["Pair discussion", "Turn each problem into a positive rule. Choose your two most useful."],
      ["Our ground rules", "Draft to negotiate: listen fully; invite voices; give reasons; question ideas; build on answers."],
      ["Display and revisit", "Agree 5–7 rules together. Which rule will we practise first?"]
    ]),
    "think-pair-share": preset([
      ["Think · 1 min", "Can two shapes have the same perimeter but different areas? Sketch an idea."],
      ["Pair · 2 min", "Compare sketches. Find an example you both think works."],
      ["Share · 3 min", "Show your strongest example and explain how you checked it."],
      ["Connect · 1 min", "What does this tell us about area and perimeter?"]
    ], { answer: "Example: 1 × 5 and 2 × 4 rectangles both have perimeter 12 units; areas are 5 and 8 square units." }),
    "do-now-bell-ringer": preset([
      ["Recall", "Find the perimeter of a rectangle measuring 6 cm by 4 cm."],
      ["Connection", "Draw a different rectangle with the same perimeter."],
      ["Preview", "Do your two rectangles also have the same area? Explain."]
    ], { timer: 10, answer: "20 cm. For example, 7 × 3 cm has perimeter 20 cm. Areas: 24 cm² and 21 cm². Source estimate is 8 minutes; its timed steps require 10." }),
    "word-splash": preset([
      ["Key terms", "Length · Width · Perimeter · Area · Unit · Scale"],
      ["Mark your confidence", "On paper: circle what you know; underline what is familiar; leave new terms unmarked."],
      ["Explain to a partner", "Choose a circled term. Explain it using a drawing or example."],
      ["Working definitions", "Agree definitions as a class. Then check your confidence again."]
    ], { feedback: { prompt: "Which term would you most like us to explain?", max: 1 }, answer: "The cloud collects vocabulary needs; it cannot circle or underline words. Use the handout for the source’s marking task." }),
    "knowledge-activation-web": preset([
      ["Topic", "What do we already know about measurement?"],
      ["Contribute", "Offer a word, example or idea. Explain how it connects."],
      ["Find patterns", "Which ideas belong together? Which connection is missing?"],
      ["Learning goal", "Use our gaps to choose what we need to investigate today."]
    ], { feedback: { prompt: "Name one idea connected to measurement.", max: 3 }, answer: "Draw the connecting lines on the classroom board. A word cloud collects contributions but does not draw a concept web." }),
    "i-do-we-do-you-do": preset([
      ["I do · 5 min", "Watch: a 6 × 4 rectangle has perimeter 6 + 4 + 6 + 4 = 20 units."],
      ["We do · 8 min", "Find the perimeter of an 8 × 3 rectangle. Explain each step together."],
      ["You do together · 5 min", "Draw two different rectangles with perimeter 24 units. Check a partner."],
      ["You do alone · 7 min", "A rectangle has perimeter 30 cm and width 5 cm. Find its length."]
    ], { reason: "The source has four phases, including both You Do stages; three cards obscure that distinction.", timer: 25, answer: "We do: 22 units. Together: e.g. 8 × 4 and 7 × 5. Alone: 10 cm. Source estimate 20 min; timed steps total 25." }),
    "concept-development": preset([
      ["Show", "Perimeter is the distance around a shape. Trace the outside edge of a book."],
      ["Explain", "Measure every outside side in the same unit, then add the lengths."],
      ["Examples / non-examples", "Fencing a garden measures perimeter. Covering its ground measures area."],
      ["Guided application", "A triangle has sides 3 cm, 4 cm and 5 cm. What is its perimeter?"],
      ["Independent practice", "Draw a shape with perimeter 16 cm. Label every side."]
    ], { timer: 25, answer: "Triangle: 12 cm. Example independent response: a 4 cm square. Source estimate 20 min; timed steps total 25." }),
    "flipped-instruction": { pages: [
      page("Review the home learning", [["Recall", "What is perimeter? Explain without looking at your notes."], ["Check", "A 5 × 3 rectangle: is its perimeter 15 or 16 units? Why?"], ["Questions", "Which part of the home learning needs another explanation?"]], 3),
      page("Find the missing length", [["Deep dive", "A rectangle has perimeter 34 cm and width 6 cm. Find its length."], ["Think aloud", "Two widths use 12 cm. The two lengths share the remaining 22 cm."], ["Explain", "Why do we divide the remaining length by two?"]], 10),
      page("Apply and check", [["Core", "Find the length when perimeter is 42 cm and width is 8 cm."], ["Support", "Draw and label all four sides before calculating."], ["Challenge", "Find three rectangles with perimeter 42 cm. Which has the largest area?"]], 12)
    ], answer: "Review: 16 units. Deep dive: 11 cm. Core: 13 cm. With whole-number sides, 10 × 11 has the greatest area for perimeter 42 cm." },
    "question-cube-six-question-types": preset([
      ["Define", "What is perimeter?"],
      ["Compare", "How is it different from area?"],
      ["Why", "Why must all side lengths use the same unit?"],
      ["Example", "Give a real-world example of using perimeter."],
      ["What if", "What would happen if every side length doubled?"],
      ["Benefits / limits", "What can perimeter tell us about a garden? What can it not tell us?"]
    ], { fieldsTitle: "Six ways to question perimeter", feedback: { prompt: "Name your question type, then give your answer and reasoning.", max: 5 } }),
    "worked-example-analysis": preset([
      ["Completed example", "Rectangle 7 cm × 3 cm → 7 + 3 + 7 + 3 → 20 cm."],
      ["Identify the steps", "What happened? Why? Explain the unit and each number in the sum."],
      ["Create a recipe", "With a partner, write a method someone else could follow."],
      ["Test it", "Try your recipe on a rectangle measuring 9 cm by 2 cm."]
    ], { reason: "A text worked example plus analysis, recipe and transfer task needs four labelled rows; an empty image slot adds no teaching material.", timer: 12, answer: "New perimeter: 22 cm. Source estimate 10 min; timed steps total 12." }),
    "error-analysis": preset([
      ["Sample work · 3 errors", "A 6 cm × 4 cm rectangle: “Perimeter = 6 × 4 = 24 cm².”"],
      ["Spot", "Find the wrong operation, the wrong result and the wrong unit."],
      ["Correct", "Rewrite the solution. Explain why each change is needed."],
      ["Reflect", "Why might someone confuse area and perimeter? Sketch the difference."]
    ], { target: "slide", reason: "Odd One Out reveals one odd item; the source requires sample work with several errors and a correction. Use a labelled analysis slide with the answer in teacher notes.", answer: "Perimeter = 6 + 4 + 6 + 4 = 20 cm. Multiplication calculated area; 24 is therefore not the perimeter; cm² is an area unit. Distinguish boundary length from surface coverage." }),
    "quick-practice-stations": preset([
      ["Station 1 · Recall", "List the facts you need to calculate the perimeter of a rectangle."],
      ["Station 2 · Apply", "A noticeboard is 90 cm by 60 cm. How much edging does it need?"],
      ["Station 3 · Create", "Design a rectangle with perimeter 40 cm. Find a second possible design."]
    ], { layout: "cards", answer: "Apply: 300 cm. Create: e.g. 12 × 8 cm and 11 × 9 cm. Allow 3 minutes per station and 1 minute to share." }),
    "concept-card-sort": preset([
      ["Cards 1–4", "Fence length · Floor covering · Picture-frame edging · Carpet needed"],
      ["Cards 5–8", "Garden boundary · Paint for a wall · Ribbon around a box · Lawn turf"],
      ["Cards 9–12", "Track boundary · Tabletop covering · Window trim · Tile coverage"],
      ["Sort and justify", "Cut these into 12 cards. Group them by what is measured. Name your categories."],
      ["Compare", "Visit another group. Which organisation is most useful? Why?"]
    ], { target: "slide", reason: "Ranking enforces one linear order and at most eight items. The source requires 12–15 cards in student-chosen categories; use physical cards with the full bank on screen.", answer: "One defensible sort is boundary length versus surface area: cards 1,3,5,7,9,11 versus 2,4,6,8,10,12. Accept other justified organisations." }),
    "strategic-wait-time-questioning": preset([
      ["Question", "Can a shape have a larger perimeter but a smaller area than another shape?"],
      ["Think", "Wait 3–5 seconds. Prepare a reason before anyone is called on."],
      ["Respond", "Take 3 seconds to form your answer. Use a sketch if it helps."],
      ["Follow up", "Pause 2 seconds. Ask: “What example supports that?”"]
    ], { answer: "Use name sticks/cards. Seven questions: (1) Can a larger perimeter enclose less area? (2) Why does perimeter use linear units? (3) Can equal areas have different perimeters? (4) How would you find a missing side? (5) What happens when all lengths double? (6) Why must units match before adding? (7) How can a drawing check your answer? Example for Q1: 1 × 10 (P22, A10) versus 4 × 4 (P16, A16). Allow the source’s pauses for each response." }),
    "guided-inquiry-investigation": { pages: [
      page("Explore · same boundary, different space", [["Investigate", "Use 24 unit lengths to make different rectangles on squared paper."], ["Record", "List length, width, perimeter and area for each rectangle."], ["Look for patterns", "What happens to area when the sides become more equal?"]], 10),
      page("Explain the pattern", [["Claim", "Which rectangle encloses the greatest area in your results?"], ["Evidence", "Use at least two measurements to support your explanation."], ["Test", "Does your rule explain all the rectangles you tried?"]], 8),
      page("Apply to a new boundary", [["New situation", "You now have 32 unit lengths. Predict the best rectangle before drawing."], ["Check", "Calculate and compare at least three possible designs."], ["Refine", "Does the same pattern still hold?"]], 7),
      page("Share and refine", [["Present", "Show your claim, evidence and a labelled diagram."], ["Question", "Ask another group how they tested their prediction."], ["Conclude", "Agree a rule and state what shapes you tested it on."]], 5)
    ], answer: "For rectangles: perimeter 24 gives greatest area at 6 × 6 (36); perimeter 32 at 8 × 8 (64). Restrict the claim to rectangles; this investigation does not prove a rule for all shapes." },
    "jigsaw-expert-groups": preset([
      ["Home groups · 5 min", "Assign four experts: length, perimeter, area and units."],
      ["Expert groups · 12 min", "Use the reference notes. Prepare a definition, a worked example and a check question."],
      ["Return home · 12 min", "Each expert teaches for 3 minutes. Build one shared measurement guide."]
    ], { answer: "Reference notes: length measures a line (cm); perimeter sums boundary lengths (cm); rectangle area = length × width (cm²); 1 m = 100 cm. Supply rulers, squared paper and these four notes as expert cards." }),
    "problem-based-learning": preset([
      ["Problem", "A school has 40 m of fencing for a rectangular garden. Choose a design with room to grow."],
      ["What do we know?", "All four sides need fencing. The total boundary is 40 m."],
      ["What do we need to know?", "What are possible dimensions? What makes one design better?"],
      ["Research and plan", "Sketch three designs. Calculate their areas and note your assumptions."],
      ["Solve", "Choose a design and show the calculations that support it."],
      ["Present and justify", "Explain your choice. How would an entrance change your plan?"]
    ], { reason: "Six named stages cannot be expressed by one column plus an image; labelled rows retain every stage.", timer: 40, answer: "With four fully fenced sides, a 10 × 10 m square maximises rectangular area (100 m²). Other choices need a stated constraint. Source estimate 35 min; steps total 40." }),
    "differentiated-practice-menu": preset([
      ["Must do · 10 min", "Find the perimeter of 6 × 4, 8 × 3 and 5 × 5 cm rectangles. Show your method."],
      ["Consolidate", "Draw each shape and label all four sides before adding."],
      ["Apply", "A rectangle has perimeter 28 cm and width 5 cm. Find its length."],
      ["Extend", "Find all whole-number rectangles with perimeter 28 cm. Compare their areas."]
    ], { reason: "The compulsory task plus three choices needs four named boxes, beyond the three-card row.", answer: "Must do: 20, 22, 20 cm. Apply: 9 cm. Extend: 1×13 through 7×7; largest area 49 cm². Choose a route for the remaining 15 minutes; routes are not fixed ability labels." }),
    "design-and-create-task": preset([
      ["Brief", "Create a garden plan using 40 m of fencing. Show its dimensions and area."],
      ["Planning · 5 min", "Sketch two ideas. Choose a scale and gather a ruler and squared paper."],
      ["Creating · 20 min", "Draw your final design and explain why you chose it."],
      ["Self-assessment · 3 min", "Check: labelled sides, stated scale, correct perimeter and area, clear reasoning."],
      ["Gallery walk · 5 min", "Find a design unlike yours. Leave one question about its choices."]
    ], { reason: "Five source stages need five labels; cards wraps and hides the distinction between brief and success criteria.", answer: "Assume all four sides are fenced; no gate allowance. Example: 10 × 10 m, perimeter 40 m, area 100 m²; scale 1 cm to 1 m." }),
    "think-pair-square-share": preset([
      ["Think · 2 min", "What makes a mathematical explanation convincing? Write two features."],
      ["Pair · 3 min", "Compare your features. Add an example of each."],
      ["Square · 4 min", "Join another pair. Agree the three most useful features."],
      ["Share · 4 min", "Present one feature and an example. Explain your choice."]
    ]),
    "jigsaw-collaboration": preset([
      ["Home · 2 min", "Assign each person one part: length, perimeter, area or units."],
      ["Expert · 10 min", "Study your reference card. Prepare an example and one question to check understanding."],
      ["Return · 8 min", "Take turns teaching. Combine all four parts into a shared guide."]
    ], { answer: "Reference cards: length is distance along a line (cm); perimeter is boundary length (cm); rectangle area = length × width (cm²); 1 m = 100 cm. Ask experts to illustrate each with a 6 × 4 cm rectangle." }),
    "peer-teaching-carousel": preset([
      ["Setup", "Four stations: define perimeter; correct 6×4=24; design P=20; compare area and perimeter."],
      ["Rotate · every 4 min", "Read the previous work. Add a reason, a correction or a new example."],
      ["Final round · 5 min", "Return to your first station. Summarise what improved and what remains unclear."],
      ["Present", "Share the strongest contribution and explain why it helped."]
    ], { timer: 21, answer: "Four rotations take 16 minutes plus 5 to synthesise, before presentations. Source estimate is 20 minutes; allow additional sharing time. Station 2: perimeter is 20, not area 24." }),
    "socratic-seminar": preset([
      ["Discussion prompt", "“The best garden design is always the one with the greatest area.” Do you agree?"],
      ["Inner circle · 8 min", "Use a diagram, calculation or stated constraint as evidence. Build on another speaker."],
      ["Switch · 8 min", "Observers become speakers. Test an assumption from the first round."],
      ["Debrief · 4 min", "Which argument was convincing? What evidence changed your thinking?"]
    ], { answer: "Outer-circle observation: record one claim, its evidence and one unanswered question. Consider access, cost and purpose; there is no single predetermined stance." }),
    "dialogue-chain-discussion": preset([
      ["Discussion question", "Can two rectangles have equal area but different perimeters?"],
      ["Initial answer", "My answer is… My example is…"],
      ["Agree / disagree", "I agree/disagree because…"],
      ["Build on an idea", "Building on that idea…"],
      ["Synthesis", "Which example gives us the clearest answer?"]
    ], { reason: "A question and distinct sentence stems need labels; the source includes more than three contributions.", answer: "Example: 2 × 6 and 3 × 4 both have area 12; perimeters are 16 and 14. Invite 8–10 speakers; allow each 30 seconds." }),
    "real-world-connection-hunt": preset([
      ["Concept", "Perimeter: the distance around a shape."],
      ["In this room · 3 min", "Find an object where its boundary length matters."],
      ["At home · 3 min", "Think of something that needs edging, trim or a border."],
      ["In our community · 3 min", "Find a use for fencing or boundary measurement."],
      ["Reflect", "Why does this concept matter in real life?"]
    ], { feedback: { prompt: "Name the place, your example and why perimeter matters there.", max: 3 } }),
    "benefits-vs-limitations-battle": preset([
      ["Topic", "Should every school replace part of its playground with a garden?"],
      ["Benefits team", "Give a benefit and explain who would gain from it."],
      ["Limitations team", "Give a limitation and explain when it would matter."],
      ["Scoring", "Valid new point: 1. Repeated point: 0. Take 30 seconds to think before each round."],
      ["Balanced view", "What conditions would make the proposal work well?"]
    ], { reason: "Split is a text/image layout, not two equal text teams; labelled rows make both roles and scoring visible." }),
    "scenario-analysis-discussion": preset([
      ["Scenario 1", "A concert sells out quickly. More people want tickets than there are seats."],
      ["Scenario 2", "A large harvest puts many more apples on sale while demand stays steady."],
      ["Scenario 3", "A new phone attracts many buyers, but the first delivery is small."],
      ["Identify and explain", "Which scenarios show supply and demand? Pick one and explain how."],
      ["Predict and compare", "What might happen next? Which effect could be strongest? State your assumptions."]
    ], { fieldsTitle: "Supply and demand: three scenarios", reason: "The source explicitly asks for three scenarios and four guiding questions; a split image slot cannot hold them.", answer: "All three illustrate supply and demand. Other things equal, scarce concert tickets or phones create upward price pressure; an apple surplus creates downward pressure. No strongest case can be established without quantities and market rules." }),
    "whiteboards-on-walls": preset([
      ["Problem", "Find three rectangles with perimeter 24 units. Which has the greatest area?"],
      ["Discuss and draw · 5 min", "Show dimensions, calculations and your reasoning on the board."],
      ["Gallery walk · 3 min", "Find a useful method or a claim you want to question."],
      ["Refine · 2 min", "Improve your work. Mark the change and explain why you made it."],
      ["Debrief · 1 min", "Which representation made the reasoning easiest to follow?"]
    ], { answer: "Examples: 2×10 (area20), 4×8 (32), 6×6 (36). Maximum rectangular area is 36. Allow the source’s first minute for moving and posing the problem." }),
    "connect-four-concept-edition": {
      target: "slide",
      layout: "table",
      fieldsTitle: "Match two. Explain the connection.",
      reason: "Concept Chain grows spoken links and has no 4×4 matching grid. This activity supplies the source’s Mode A grid for classroom play; cover claimed pairs physically and score on the board.",
      fields: [{ label: "4 × 4 matching grid", type: "area", slide: "body", value: "1. Perimeter | 2. 100 cm | 3. Width | 4. 1 cm²\n5. Square | 6. Distance around | 7. Area | 8. 1 m\n9. Space covered | 10. Four equal sides | 11. Length | 12. Across a rectangle\n13. Along a rectangle | 14. Unit of area | 15. 1 m² | 16. 10,000 cm²" }],
      answer: "Mode A: number cells 1–16 left to right. Pairs: 1–6, 2–8, 3–12, 4–14, 5–10, 7–9, 11–13, 15–16. Teams claim and explain two cells; cover valid pairs with sticky notes or cross them off on a copied grid. First to four valid pairs wins. Mode B is the source’s optional alternative, not an automated mode."
    },
    "structured-reflection-protocol": preset([
      ["Got it", "Create a new example and explain why it works."],
      ["Mostly understand", "Solve one example, then check the step you are least sure about."],
      ["Getting there", "Use the worked example with a partner. Explain each step."],
      ["Need help", "Bring your first uncertain step to the teacher. Start with a labelled sketch."]
    ], { feedback: { prompt: "Which corner best describes your understanding?", options: ["Got it", "Mostly understand", "Getting there", "Need help"] }, answer: "Choose a corner or indicate a choice from your seat. Use 2 min to choose, 6 min for the task and 4 min for teacher support." }),
    "learning-log-entry": preset([
      ["New learning", "What’s one new thing?"],
      ["Connections", "How does this connect?"],
      ["Challenges", "What was difficult?"],
      ["Strategies", "What helped me learn?"],
      ["Next steps", "What do I want to work on?"]
    ], { reason: "Five named reflection prompts need visible labels; a generic content list loses those response categories." }),
    "muddiest-point": preset([
      ["Write · 3 min", "The muddiest point for me is…"],
      ["Be specific", "Name the step or idea. Explain where your understanding breaks down."],
      ["Listen and revisit", "After the class explanations, write what is clearer and what still needs work."]
    ], { feedback: { prompt: "The muddiest point for me is…", max: 1 } }),
    "plus-minus-interesting": preset([
      ["Plus", "What worked well?"],
      ["Minus", "What was challenging?"],
      ["Interesting", "What surprised me?"]
    ], { layout: "cards" }),
    "exit-ticket": preset([
      ["What?", "What did you learn today? Include one example."],
      ["So what?", "Why does this learning matter?"],
      ["Now what?", "What will you practise or ask about next?"]
    ], { feedbackKind: "brainstorm", reason: "Choose the source’s What–So What–Now What format. Written reflections need free text; a poll cannot collect them.", feedback: { prompt: "What did you learn? Why does it matter? What is your next step?", max: 1 } }),
    "preview-next-lesson": preset([
      ["Today we learned", "Perimeter measures the boundary. Area measures the space inside."],
      ["Next lesson we will", "Investigate how changing a shape affects its area."],
      ["Preparation task", "Sketch a rectangular object at home. Estimate its length and width."],
      ["Closing question", "If every side length doubles, does the area double too?"]
    ], { reason: "Section only renders a title and subtitle. Four explicit source boxes require labelled rows.", answer: "For similar shapes, doubling lengths multiplies area by four. Invite predictions; use them to open the next lesson." }),
    "exit-ticket-2": preset([
      ["3 ideas", "Write three things you learned from the activity."],
      ["2 connections", "Explain two links to something you already knew."],
      ["1 question", "Ask one question you still want answered."]
    ], { feedbackKind: "brainstorm", reason: "Choose the source’s 3–2–1 format; one written submission preserves all three responses, unlike a fixed poll.", feedback: { prompt: "Share 3 things learned, 2 connections and 1 remaining question.", max: 1 } }),
    "teach-someone": preset([
      ["Partner A · 2 min", "Today I learned… Explain one idea with an example."],
      ["Partner B · 1 min", "Ask: “Why does that work?” and “Can you show another example?”"],
      ["Switch · 3 min", "Partner B teaches; Partner A asks two questions."],
      ["Together · 2 min", "What would we tell someone who missed today?"]
    ]),
    "visual-summary": preset([
      ["Choose a format", "Mind Map · Comic Strip · Sketch Note · One-Pager"],
      ["Create · 6 min", "Show the key ideas using words, images and connections. Include an example."],
      ["Share · 2 min", "Ask a partner to explain your visual. What could you make clearer?"]
    ], { layout: "cards" }),
    "reflection-ladder": preset([
      ["Choose your level", "1: Need help → 3: Can practise with support → 5: Can teach others."],
      ["Explain", "I’m here because…"],
      ["Plan", "To move up I need to…"],
      ["Share", "Tell a partner one specific action you will take next."]
    ], { feedback: { prompt: "Where are you on the learning ladder?", points: 5, lowLabel: "Need help", highLabel: "Can teach others" } })
  };
  var PRESENTATIONS = {
    steps: [
      "think-pair-share",
      "do-now-bell-ringer",
      "jigsaw-expert-groups",
      "think-pair-square-share",
      "jigsaw-collaboration",
      "peer-teaching-carousel",
      "socratic-seminar",
      "strategic-wait-time-questioning",
      "whiteboards-on-walls",
      "teach-someone",
      "daily-review-routine",
      "dialogue-chain-discussion"
    ],
    panels: [
      "i-do-we-do-you-do",
      "differentiated-practice-menu",
      "structured-reflection-protocol",
      "reflection-ladder"
    ],
    brief: [
      "hook-objectives",
      "worked-example-analysis",
      "error-analysis",
      "problem-based-learning",
      "design-and-create-task",
      "benefits-vs-limitations-battle",
      "flipped-instruction",
      "guided-inquiry-investigation"
    ]
  };
  for (const [view, keys] of Object.entries(PRESENTATIONS)) {
    for (const key of keys) PRESETS[key].presentation = view;
  }

  // src/activities/game-presets.js
  var mc = (question, options, correct, explanation) => ({ question, options, correct, explanation });
  var recall = [
    ["What is the distance around a shape called?", "Perimeter"],
    ["How many centimetres are in one metre?", "100"],
    ["What is the perimeter of a square with side 4 cm?", "16 cm"],
    ["What is the area of a 6 cm × 3 cm rectangle?", "18 cm²"],
    ["What unit would you use for the area of a classroom floor?", "Square metres"]
  ];
  var choice = [
    mc("What does perimeter measure?", ["Space inside", "Distance around", "Number of corners", "Mass"], 1, "Perimeter measures the outside boundary."),
    mc("A rectangle is 6 cm by 4 cm. What is its perimeter?", ["10 cm", "24 cm", "20 cm", "20 cm²"], 2, "6 + 4 + 6 + 4 = 20 cm. 24 is its area; cm² is an area unit."),
    mc("A square has side 5 m. What is its area?", ["25 m²", "20 m", "10 m²", "5 m²"], 0, "Area = 5 × 5 = 25 m²."),
    mc("Which equals 2.5 m?", ["25 cm", "2,500 cm", "250 cm", "0.25 cm"], 2, "There are 100 cm in each metre: 2.5 × 100 = 250."),
    mc("A rectangle has perimeter 30 cm and width 5 cm. Its length is…", ["25 cm", "20 cm", "15 cm", "10 cm"], 3, "Two widths use 10 cm, leaving 20 cm shared by two lengths."),
    mc("Double both sides of a rectangle. Its area becomes…", ["Twice as large", "Four times as large", "Unchanged", "Eight times as large"], 1, "Both factors double: (2L) × (2W) = 4LW.")
  ];
  var statements = [
    ["Perimeter is the distance around a shape.", true, "Trace the boundary to measure perimeter."],
    ["Area is measured in centimetres rather than square centimetres.", false, "Area needs square units such as cm²."],
    ["One metre equals 100 centimetres.", true, "The prefix centi means one hundredth."],
    ["A 6 cm by 4 cm rectangle has perimeter 24 cm.", false, "Its perimeter is 20 cm; 24 cm² is its area."],
    ["A square has four equal sides.", true, "All four sides have equal length."],
    ["Rectangles with the same area always have the same perimeter.", false, "2×6 and 3×4 both have area 12, but perimeters 16 and 14."],
    ["Doubling every side length doubles the perimeter.", true, "Every term in the boundary sum doubles."],
    ["Doubling both sides of a rectangle doubles its area.", false, "The area becomes four times as large."],
    ["A rectangle with perimeter 20 cm can have sides 6 cm and 4 cm.", true, "6 + 4 + 6 + 4 = 20."],
    ["One square metre equals 100 square centimetres.", false, "100 cm × 100 cm = 10,000 cm²."]
  ];
  var tf = statements.map(([question, yes, explanation]) => ({ question, options: ["True", "False"], correct: yes ? 0 : 1, explanation }));
  var bank = (seeds, defaultTime, settings = {}) => ({ seeds, settings: { defaultTime, scoreboard: false, scoreSlide: false, ...settings } });
  var GAME_PRESETS = {
    "quick-retrieval-quiz": { game: bank(recall.map(([question, answer]) => ({ question, answer })), 120), answer: "Paper recall for 2 minutes, pair check for 2, whole-class review for 3. The answer key is revealed by the retrieval board." },
    "pre-assessment-quickfire": { game: bank(tf.slice(0, 8), 30, { confidence: true }), answer: "Use thumbs sideways for Unsure; the digital true/false engine has two answer buttons. Ask for an explanation before revealing. Note confident misconceptions and use them to set learning goals." },
    "interleaving-mixed-practice": { game: bank([
      choice[0],
      mc("Earlier learning: what is 7 × 8?", ["54", "56", "64", "48"], 1, "7 groups of 8 = 56."),
      choice[1],
      choice[2],
      mc("Earlier learning: half of 34 is…", ["16", "17", "18", "68"], 1, "34 ÷ 2 = 17."),
      choice[3],
      mc("Earlier learning: 0.5 is equivalent to…", ["1/5", "5/100", "1/2", "2/1"], 2, "0.5 = 5/10 = 1/2."),
      choice[4],
      choice[5],
      mc("Earlier learning: 36 ÷ 4 equals…", ["6", "8", "9", "12"], 2, "4 × 9 = 36.")
    ], 0), answer: "Ten questions: six measurement questions interleaved with four earlier arithmetic questions. For the source protocol, work on paper for 8 minutes before revealing; pair-check for 3 and discuss transfer for 3. Replace earlier topics with your class’s actual learning history." },
    "explanation-champion-challenge": { game: bank([
      { term: "Perimeter", category: "Measurement", hint: "Banned: around, outside, edge, boundary", explanation: "The total length of all sides of a shape." },
      { term: "Area", category: "Measurement", hint: "Banned: space, inside, square, surface", explanation: "How much flat covering a shape needs." },
      { term: "Rectangle", category: "Shapes", hint: "Banned: four, sides, right, angles", explanation: "A quadrilateral with each corner measuring 90 degrees." },
      { term: "Metre", category: "Units", hint: "Banned: length, hundred, centimetres, ruler", explanation: "A standard distance unit, equal to 1,000 millimetres." }
    ], 60), answer: "Allow 2 minutes to plan before the first explanation. Banned words appear as the hint. Run the source’s Clear=2 / Okay=1 / Unclear=0 class vote on paper; Heads Up’s Correct/Pass control does not implement that rubric." },
    "compare-and-contrast-venn-activity": { game: bank([
      { question: "Compare area and perimeter. Draw a Venn diagram before the reveal.", itemA: "Area", itemB: "Perimeter", similarities: "Both measure an aspect of a shape; both need stated units.", differences: "Area measures surface coverage in square units. Perimeter measures boundary length in linear units." },
      { question: "Compare these two rectangles. What belongs in the overlap?", itemA: "2 cm × 6 cm rectangle", itemB: "3 cm × 4 cm rectangle", similarities: "Both have four right angles and area 12 cm².", differences: "Perimeters are 16 cm and 14 cm respectively." },
      { question: "Compare these equal-perimeter rectangles.", itemA: "1 cm × 5 cm rectangle", itemB: "2 cm × 4 cm rectangle", similarities: "Both are rectangles with perimeter 12 cm.", differences: "Their areas are 5 cm² and 8 cm² respectively." }
    ], 0), answer: "Use the first comparison for the 15-minute source protocol; the board requires three comparisons, so two transfer examples are supplied for optional follow-up. Students draw Venn diagrams on paper; the engine displays two concepts and reveals similarities/differences." },
    "multiple-choice-quiz": { game: bank(choice, 40) },
    "true-false-rapid-fire": { game: bank(tf, 20, { confidence: true }), answer: "Ten statements mix recall and misconceptions. Accept sideways thumbs for Unsure; digital answers remain True/False. Discuss errors after the rapid round." },
    "short-answer-check": { game: bank(recall.map(([question, answer], i) => ({ question, accept: [answer, ...[[], ["one hundred"], ["16", "16 centimetres"], ["18", "18 square centimetres"], ["m²", "m2", "square meters"]][i]], explanation: answer })), 48), answer: "For the source’s peer-marking method, write answers on paper for 4 minutes, swap for 1, mark with the reveal for 2 and discuss for 1. Digital typing is also available; inspect accepted spellings in Quiz studio." },
    "diagnostic-question": { game: bank([
      mc("A 6 cm × 4 cm rectangle has perimeter… Explain your choice before the reveal.", ["10 cm", "24 cm", "20 cm", "20 cm²"], 2, "A adds two sides only. B calculates area. C correctly adds all four sides. D has the right number with an area unit. Ask each group to explain before reteaching."),
      mc("A 7 cm × 3 cm rectangle has perimeter… What changed in your method?", ["21 cm", "20 cm²", "10 cm", "20 cm"], 3, "21 calculates area; 20 cm² uses the wrong unit; 10 omits two sides; 20 cm is correct. Use this second question to check the correction.")
    ], 0, { confidence: true }), answer: "Take explanations before revealing. Use Q1 to diagnose, spend 2 minutes addressing the observed misconception, then use Q2 as the check." },
    "recap-quiz-game": { game: bank(choice, 40, { scoreboard: true, scoreSlide: true, defaultPoints: 1e3 }), answer: "Quick-Fire is the selected source option: six 40-second questions fill 4 minutes, followed by 2 minutes discussing common errors." }
  };

  // src/activities/source-meta.json
  var source_meta_default = {
    "Do Now / Bell Ringer": {
      sourceFile: "lib/templates/activation.ts",
      materials: [
        "Pre-written board questions",
        "Answer key"
      ],
      sourceSteps: [
        "On board: 3 questions (recall from last lesson, connection, preview)",
        "Silent individual work (5 mins)",
        "Quick pair check (2 mins)",
        "Whole class review (3 mins)",
        "Link to today's objective"
      ],
      sourceMinutes: 8,
      sourceBlurb: "Silent individual work on board when students enter"
    },
    "Knowledge Activation Web": {
      sourceFile: "lib/templates/activation.ts",
      materials: [
        "Whiteboard",
        "Markers"
      ],
      sourceSteps: [
        "Write topic in center of board (1 min)",
        "Students call out anything they know (3 mins)",
        "Teacher writes and draws connecting lines",
        "Look for patterns and gaps (2 mins)",
        "Set today's learning goal (1 min)"
      ],
      sourceMinutes: 7,
      sourceBlurb: "Build a web of connected ideas on the board"
    },
    "Pre-Assessment Quickfire": {
      sourceFile: "lib/templates/activation.ts",
      materials: [
        "Statement list (mix of known, preview, misconceptions)"
      ],
      sourceSteps: [
        "Teacher reads 8-10 statements",
        "Students show: 👍 True / 👎 False / 👉 Unsure",
        "Teacher notes misconceptions",
        "Clarify key terms",
        "Set learning goals based on gaps"
      ],
      sourceMinutes: 8,
      sourceBlurb: "Thumbs up/down/sideways for 8-10 true/false statements"
    },
    "Exit Ticket": {
      sourceFile: "lib/templates/activity-plenary.ts",
      materials: [
        "Exit ticket template",
        "Collection box/system"
      ],
      sourceSteps: [
        "Choose format: 3-2-1 / Traffic Light / What-So What-Now What",
        "Students write individual responses (3 mins)",
        "Submit on way out",
        "Teacher reviews for next lesson planning"
      ],
      sourceMinutes: 5,
      sourceBlurb: "Quick written reflection: 3-2-1 or Traffic Light or What-So What-Now What"
    },
    "Recap Quiz Game": {
      sourceFile: "lib/templates/activity-plenary.ts",
      materials: [
        "Quiz questions",
        "Mini whiteboards (for Quick-Fire)",
        "Question cards (for Quiz-Quiz-Trade)"
      ],
      sourceSteps: [
        "Choose format (Quiz-Quiz-Trade / Stand Up If / Quick-Fire)",
        "Play game with review questions (4 mins)",
        "Celebrate correct answers",
        "Address common errors (2 mins)"
      ],
      sourceMinutes: 6,
      sourceBlurb: "Fun, competitive review (Quiz-Quiz-Trade / Stand Up If / Quick-Fire)"
    },
    "Teach Someone": {
      sourceFile: "lib/templates/activity-plenary.ts",
      materials: [
        "Teaching prompts",
        "Question stems"
      ],
      sourceSteps: [
        "Partner A teaches (2 mins): Today I learned...",
        "Partner B asks 2 questions (1 min)",
        "Switch roles (3 mins)",
        "Together: What would we tell someone who missed today? (2 mins)"
      ],
      sourceMinutes: 8,
      sourceBlurb: "Explain today's learning to a partner"
    },
    "Visual Summary": {
      sourceFile: "lib/templates/activity-plenary.ts",
      materials: [
        "Blank paper",
        "Colored pens/pencils",
        "Visual examples"
      ],
      sourceSteps: [
        "Choose visual format (Mind Map / Comic Strip / Sketch Note / One-Pager)",
        "Create visual summary (6 mins)",
        "Optional: Share with partner (2 mins)"
      ],
      sourceMinutes: 8,
      sourceBlurb: "Create visual showing learning (Mind Map / Comic Strip / Sketch Note / One-Pager)"
    },
    "Reflection Ladder": {
      sourceFile: "lib/templates/activity-plenary.ts",
      materials: [
        "Reflection ladder template",
        "Writing materials"
      ],
      sourceSteps: [
        "Show ladder: Bottom (need help) → Top (can teach others)",
        "Students draw themselves on their level (1 min)",
        "Write: 'I'm here because...' (2 mins)",
        "Write: 'To move up I need to...' (2 mins)",
        "Share with partner (2 mins)",
        "Teacher notes who needs support (2 mins)"
      ],
      sourceMinutes: 9,
      sourceBlurb: "Self-assess learning journey from 'need help' to 'can teach others'"
    },
    "Think-Pair-Square-Share": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Discussion question",
        "Sharing protocol"
      ],
      sourceSteps: [
        "THINK (2 mins): Individual reflection",
        "PAIR (3 mins): Share with partner",
        "SQUARE (4 mins): Join another pair, synthesize",
        "SHARE (4 mins): Groups present to class"
      ],
      sourceMinutes: 13,
      sourceBlurb: "Progressive sharing: Individual → Pair → Group of 4 → Class"
    },
    "Jigsaw Collaboration": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Expert group resources",
        "Teaching guides"
      ],
      sourceSteps: [
        "Home groups split (2 mins)",
        "Expert groups learn one piece (10 mins)",
        "Return to home groups to teach (8 mins)"
      ],
      sourceMinutes: 20,
      sourceBlurb: "Home groups → Expert groups → Return to teach (see Main Activity for full version)"
    },
    "Peer Teaching Carousel": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Station task cards",
        "Large paper/posters",
        "Timer"
      ],
      sourceSteps: [
        "Setup: 4-5 stations with different tasks",
        "Groups rotate every 4 minutes",
        "At each station: Read previous work, add thinking, correct errors",
        "Final Round (5 mins): Return to starting station, review, synthesize",
        "Present to class"
      ],
      sourceMinutes: 20,
      sourceBlurb: "Rotate through stations, adding to and building on previous groups' work"
    },
    "Socratic Seminar (Simple)": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Discussion text/prompt",
        "Evidence markers",
        "Observation sheet"
      ],
      sourceSteps: [
        "Round 1 (8 mins): Inner circle discusses prompt with evidence",
        "Round 2 (8 mins): Switch circles, new discussion",
        "Debrief (4 mins): What strong arguments? What was convincing?"
      ],
      sourceMinutes: 20,
      sourceBlurb: "Student-led discussion: Inner circle discusses, outer circle observes"
    },
    "Dialogue Chain Discussion": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Discussion prompt",
        "Academic language stems poster",
        "Listening tracker"
      ],
      sourceSteps: [
        "Present discussion question to class (1 min)",
        "Student 1: Gives initial answer (30 seconds)",
        "Student 2: 'I agree/disagree because...' OR 'Building on that idea...' (30 seconds)",
        "Student 3: Continues chain using academic language (30 seconds)",
        "Continue for 8-10 students (10 mins)",
        "Teacher synthesizes key insights (2 mins)"
      ],
      sourceMinutes: 15,
      sourceBlurb: "Structured student-led discussion where each student builds on previous responses using academic connectors"
    },
    "Real-World Connection Hunt": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Concept cards",
        "Recording sheet",
        "Example categories poster"
      ],
      sourceSteps: [
        "Present concept (e.g., 'Friction' or 'Democracy') (2 mins)",
        "Challenge 1 (3 mins): Find examples in THIS ROOM",
        "Challenge 2 (3 mins): Think of examples AT HOME",
        "Challenge 3 (3 mins): Identify examples IN YOUR COMMUNITY",
        "Share out (3 mins): Students explain their connections",
        "Reflect (1 min): 'Why does this concept matter in real life?'"
      ],
      sourceMinutes: 15,
      sourceBlurb: "Students identify real-world examples of concepts in their classroom, school, home, and community"
    },
    "Explanation Champion Challenge": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Concept cards",
        "Banned words list",
        "Timer",
        "Voting system"
      ],
      sourceSteps: [
        "Display concept word (e.g., 'Photosynthesis') (1 min)",
        "Show 4-5 BANNED WORDS students can't use (e.g., 'sunlight', 'oxygen', 'plants') (1 min)",
        "Think time (2 mins): Students plan their explanation",
        "Volunteer explains to class (60 seconds)",
        "Class votes: Clear (2 pts), Okay (1 pt), Unclear (0 pts)",
        "Repeat with 3-4 more students and concepts (8 mins)",
        "Debrief (2 mins): What made explanations clear?"
      ],
      sourceMinutes: 15,
      sourceBlurb: "Students explain concepts without using banned words, forcing deeper articulation of understanding"
    },
    "Compare & Contrast Venn Activity": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Venn diagram template",
        "Concept cards",
        "Markers"
      ],
      sourceSteps: [
        "Present two concepts (e.g., 'Photosynthesis' vs 'Respiration') (1 min)",
        "Individual thinking (3 mins): List characteristics of each",
        "Pair work (5 mins): Create Venn diagram together",
        "Gallery walk (4 mins): View other pairs' work",
        "Class synthesis (2 mins): What patterns? What connections?"
      ],
      sourceMinutes: 15,
      sourceBlurb: "Visual comparison of two concepts using Venn diagram, focusing on similarities and differences"
    },
    "Benefits vs Limitations Battle": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Topic cards",
        "Score board",
        "Timer",
        "Validity criteria"
      ],
      sourceSteps: [
        "Present topic (e.g., 'Renewable Energy' or 'Social Media') (1 min)",
        "Team setup: Benefits Team vs Limitations Team (1 min)",
        "30-second think time before each round",
        "Teams alternate stating points (10 mins)",
        "Scoring: Valid point = 1 point, Repeat = no points",
        "Switch sides and continue (optional)",
        "Debrief (2 mins): Balanced view discussion"
      ],
      sourceMinutes: 15,
      sourceBlurb: "Two teams take turns stating benefits and limitations of a concept, practicing balanced analysis"
    },
    "Scenario Analysis Discussion": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Concept cards",
        "Scenario cards",
        "Analysis questions",
        "Recording sheet"
      ],
      sourceSteps: [
        "Present concept (e.g., 'Supply and Demand') (2 mins)",
        "Show 3 scenarios (e.g., concert tickets, crop harvest, iPhone release) (3 mins)",
        "Question 1 (4 mins): Which scenarios show the concept? (All/Some/One)",
        "Question 2 (4 mins): Pick one and explain HOW",
        "Question 3 (3 mins): Predict what happens next",
        "Question 4 (2 mins): Compare - which is most extreme?"
      ],
      sourceMinutes: 18,
      sourceBlurb: "Analyze real-world scenarios to identify concepts, explain applications, and predict outcomes"
    },
    "Whiteboards on Walls": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Wall-mounted whiteboards",
        "Whiteboard markers (multiple colors)",
        "Erasers",
        "Problem/question prompt"
      ],
      sourceSteps: [
        "Students move to wall whiteboards in pairs/groups (30 secs)",
        "Teacher poses problem/question (30 secs)",
        "Groups discuss and write their thinking on whiteboards (5 mins)",
        "Gallery walk - observe and learn from other groups' work (3 mins)",
        "Return to own board and refine thinking based on what you saw (2 mins)",
        "Whole class debrief of key ideas and strongest arguments (1 min)",
        "Note: Arrive early to start, revisit at lesson end for consolidation"
      ],
      sourceMinutes: 12,
      sourceBlurb: "Students discuss and write thinking on wall whiteboards - visible thinking and peer learning (Franklin Sixth Form approach)"
    },
    "Connect Four - Concept Edition": {
      sourceFile: "lib/templates/collaboration.ts",
      materials: [
        "Concept cards (16 cards: 8 pairs)",
        "Grid template (4x4)",
        "Scoring sheet",
        "Timer"
      ],
      sourceSteps: [
        "MODE A - Match Pairs (20 mins):",
        "Setup (2 mins): Create 4x4 grid with paired cards (definitions/terms, causes/effects, questions/answers, benefits/limitations)",
        "Teams take turns (15 mins): Claim two cards that match and explain the connection",
        "If correct: Cards disappear, team scores a connection",
        "If incorrect: Cards stay, next team's turn",
        "Win condition: First team to make 4 valid connections wins",
        "Debrief (3 mins): Discuss strongest connections and misconceptions",
        "MODE B - Category Conquest (Alternative):",
        "Setup: 4 columns, 4 rows of questions (Define, Compare, Example, Why)",
        "Students answer questions to 'claim' spaces",
        "First to get 4 in a row (vertical, horizontal, diagonal) wins"
      ],
      sourceMinutes: 20,
      sourceBlurb: "Competitive matching game where students connect related concepts (definitions/terms, causes/effects, questions/answers)"
    },
    "I Do, We Do, You Do": {
      sourceFile: "lib/templates/construction.ts",
      materials: [
        "Example problem",
        "Practice problems",
        "Success criteria"
      ],
      sourceSteps: [
        "I DO (5 mins): Teacher models with think-aloud",
        "WE DO (8 mins): Class solves together, teacher guides",
        "YOU DO Together (5 mins): Partner practice with support",
        "YOU DO Alone (7 mins): Independent practice, quick check"
      ],
      sourceMinutes: 20,
      sourceBlurb: "Gradual release: Teacher models → Guided practice → Independent practice"
    },
    "Concept Development": {
      sourceFile: "lib/templates/construction.ts",
      materials: [
        "Concept examples",
        "Non-examples",
        "Practice tasks"
      ],
      sourceSteps: [
        "SHOW: Present concept with clear example (3 mins)",
        "EXPLAIN: Break down - what, why, how (5 mins)",
        "EXAMPLES & NON-EXAMPLES: Identify features (5 mins)",
        "GUIDED APPLICATION: Apply concept (7 mins)",
        "INDEPENDENT PRACTICE: Create own examples (5 mins)"
      ],
      sourceMinutes: 20,
      sourceBlurb: "Build understanding: Show → Explain → Examples/Non-Examples → Apply"
    },
    "Flipped Instruction": {
      sourceFile: "lib/templates/construction.ts",
      materials: [
        "Home learning review",
        "Complex examples",
        "Application problems"
      ],
      sourceSteps: [
        "Home Learning Review (3 mins): Poll understanding, address questions",
        "Deep Dive (10 mins): Focus on hardest parts, work complex examples",
        "Application Practice (12 mins): Apply to challenging problems, differentiated support"
      ],
      sourceMinutes: 25,
      sourceBlurb: "Deepen understanding after home learning (Review → Deep Dive → Application)"
    },
    "Question Cube - Six Question Types": {
      sourceFile: "lib/templates/construction.ts",
      materials: [
        "Question cube visual/poster",
        "Topic cards",
        "Timer",
        "Question type guide"
      ],
      sourceSteps: [
        "Present topic/concept (e.g., 'Photosynthesis') (1 min)",
        "Explain the 6 question types (2 mins):",
        "🔵 DEFINE: What is [concept]?",
        "🟢 COMPARE: How is it different from [related concept]?",
        "🟡 WHY: Why is [concept] important/how does it work?",
        "🟣 EXAMPLE: Give a real-world example",
        "🔴 WHAT IF: What would happen if...?",
        "🟠 BENEFITS/LIMITS: What conditions are needed? What are the limitations?",
        "Round 1 (12 mins): Teacher or student picks question type, student answers (30s thinking, 30s response), rotate through all 6 types with 2-3 students per type",
        "Round 2 (optional): Students generate their own questions for each type",
        "Debrief (5 mins): Which questions were hardest? Which helped you understand most?"
      ],
      sourceMinutes: 20,
      sourceBlurb: "Deep questioning using Rosenshine's six question templates: Define, Compare, Why, Example, What If, Benefits/Limits"
    },
    "Guided Inquiry Investigation": {
      sourceFile: "lib/templates/main-activity.ts",
      materials: [
        "Investigation materials",
        "Observation sheet",
        "Analysis questions"
      ],
      sourceSteps: [
        "EXPLORE (10 mins): Investigate stimulus - What patterns? What happens when you change X?",
        "EXPLAIN (8 mins): Develop explanation - Why? What's the rule?",
        "ELABORATE (7 mins): Apply to new situation - Use understanding to solve problems",
        "SHARE & REFINE (5 mins): Present findings and build shared understanding"
      ],
      sourceMinutes: 30,
      sourceBlurb: "Students discover concepts through structured exploration (Explore → Explain → Elaborate → Share)"
    },
    "Jigsaw Expert Groups": {
      sourceFile: "lib/templates/main-activity.ts",
      materials: [
        "4 different resource sets",
        "Expert group guides",
        "Summary sheet"
      ],
      sourceSteps: [
        "Home Groups (5 mins): Groups of 4, assign each person a sub-topic",
        "Expert Groups (12 mins): All 1s together, become experts, create teaching plan",
        "Home Groups Return (12 mins): Each expert teaches their part (3 mins each), create complete picture"
      ],
      sourceMinutes: 29,
      sourceBlurb: "Students become experts and teach peers (Home → Expert → Home)"
    },
    "Problem-Based Learning": {
      sourceFile: "lib/templates/main-activity.ts",
      materials: [
        "Problem scenario",
        "Research resources",
        "Solution template"
      ],
      sourceSteps: [
        "Present Problem: Real-world scenario (3 mins)",
        "What do we KNOW? List given information (5 mins)",
        "What do we NEED to know? Identify gaps (5 mins)",
        "Research & Plan: Find information, develop strategy (10 mins)",
        "Solve: Implement solution, show working (10 mins)",
        "Present & Justify: Share solution and reasoning (7 mins)"
      ],
      sourceMinutes: 35,
      sourceBlurb: "Solve authentic, complex problem through structured inquiry"
    },
    "Differentiated Practice Menu": {
      sourceFile: "lib/templates/main-activity.ts",
      materials: [
        "Must-do task",
        "3 differentiated challenge options",
        "Success criteria"
      ],
      sourceSteps: [
        "Must Do: Core practice task - everyone (10 mins)",
        "Choose Your Challenge (15 mins):",
        "🟢 Consolidate: Easier version with scaffolding",
        "🟡 Apply: Standard problem-solving",
        "🔴 Extend: Complex multi-step challenge"
      ],
      sourceMinutes: 25,
      sourceBlurb: "Must-do task plus choice board (Consolidate/Apply/Extend)"
    },
    "Design & Create Task": {
      sourceFile: "lib/templates/main-activity.ts",
      materials: [
        "Creation materials",
        "Success criteria checklist",
        "Examples"
      ],
      sourceSteps: [
        "Brief: Design/create [product] that shows understanding (2 mins)",
        "Planning: Sketch ideas, gather resources (5 mins)",
        "Creating: Make your product (20 mins)",
        "Self-assessment: Check against criteria (3 mins)",
        "Gallery walk: View and learn from others (5 mins)"
      ],
      sourceMinutes: 35,
      sourceBlurb: "Create something that demonstrates understanding (poster/model/presentation/video)"
    },
    "Worked Example Analysis": {
      sourceFile: "lib/templates/mini-activity.ts",
      materials: [
        "Worked example",
        "Blank problem for practice"
      ],
      sourceSteps: [
        "Display completed example (1 min)",
        "Students identify each step (3 mins) - What happened? Why?",
        "Pairs create a 'recipe' for solving similar problems (3 mins)",
        "Test recipe on new problem (3 mins)",
        "Compare approaches (2 mins)"
      ],
      sourceMinutes: 10,
      sourceBlurb: "Analyze a completed example together to understand the process"
    },
    "Error Analysis": {
      sourceFile: "lib/templates/mini-activity.ts",
      materials: [
        "Sample work with errors",
        "Error types guide"
      ],
      sourceSteps: [
        "Show work with 3-4 deliberate errors (1 min)",
        "Individual: Spot the errors (3 mins)",
        "Pairs: Discuss and correct errors (3 mins)",
        "Share: What were the errors? (2 mins)",
        "Reflect: Why might someone make these mistakes? (1 min)"
      ],
      sourceMinutes: 10,
      sourceBlurb: "Find and fix mistakes in sample work to identify misconceptions"
    },
    "Quick Practice Stations": {
      sourceFile: "lib/templates/mini-activity.ts",
      materials: [
        "3 station task cards",
        "Timer",
        "Recording sheets"
      ],
      sourceSteps: [
        "Station 1: Recall task (3 mins)",
        "Station 2: Apply task (3 mins)",
        "Station 3: Create task (3 mins)",
        "Brief share out (1 min)"
      ],
      sourceMinutes: 10,
      sourceBlurb: "Rotate through 3 quick tasks: Recall, Apply, Create"
    },
    "Concept Card Sort": {
      sourceFile: "lib/templates/mini-activity.ts",
      materials: [
        "Card set (12-15 cards)",
        "Category labels (optional)"
      ],
      sourceSteps: [
        "Give each group 12-15 cards with terms/images/examples (1 min)",
        "Sort into categories (4 mins) - choose or create categories",
        "Groups walk around to see others' sorts (2 mins)",
        "Discuss: Different ways to organize (2 mins)",
        "Reflect: Which organization is most useful? Why? (1 min)"
      ],
      sourceMinutes: 10,
      sourceBlurb: "Organize information into categories to understand relationships"
    },
    "Interleaving Mixed Practice": {
      sourceFile: "lib/templates/mini-activity.ts",
      materials: [
        "Mixed practice problem set",
        "Answer key",
        "Previous topics reference sheet"
      ],
      sourceSteps: [
        "Present 10 problems: 6 from today's topic, 4 from previous weeks (1 min)",
        "Students solve independently (8 mins) - mix of old and new",
        "Pair-check answers (3 mins) - discuss strategies used",
        "Whole class: 'How did previous learning help today?' (3 mins)",
        "Reflect: Which problems were harder - new or old? Why?"
      ],
      sourceMinutes: 15,
      sourceBlurb: "Mix problems from today AND previous weeks for long-term retention (spaced learning)"
    },
    "Strategic Wait Time Questioning": {
      sourceFile: "lib/templates/mini-activity.ts",
      materials: [
        "Question list (5-7 questions)",
        "Random name selector",
        "Timer (optional)"
      ],
      sourceSteps: [
        "Pose question to whole class clearly",
        "⏱️ WAIT 3-5 seconds (no hands up yet) - give thinking time",
        "Call on student randomly (use name sticks/cards)",
        "⏱️ WAIT 3 seconds for student to formulate answer",
        "Student responds",
        "⏱️ WAIT 2 seconds before responding or asking follow-up",
        "Repeat 5-7 times with different students (10 mins total)",
        "Note: Increased wait time = better answers + more participation"
      ],
      sourceMinutes: 10,
      sourceBlurb: "Questioning with explicit 3-5 second wait time for deeper thinking and participation"
    },
    "Multiple Choice Quiz": {
      sourceFile: "lib/templates/mini-quiz.ts",
      materials: [
        "Quiz questions (MC format)",
        "Answer key",
        "Response method"
      ],
      sourceSteps: [
        "Present 5-8 multiple choice questions",
        "Students respond (paper/whiteboard/digital/fingers)",
        "Show correct answer after each (30-45 secs per question)",
        "Quick explanation if needed",
        "Move on - don't dwell"
      ],
      sourceMinutes: 6,
      sourceBlurb: "5-8 multiple choice questions with immediate feedback"
    },
    "True/False Rapid Fire": {
      sourceFile: "lib/templates/mini-quiz.ts",
      materials: [
        "True/false statement list"
      ],
      sourceSteps: [
        "Teacher reads 10-12 true/false statements",
        "Students show: 👍 True / 👎 False / 👉 Unsure",
        "Statements mix easy, challenging, and misconceptions",
        "Tally scores, address misconceptions"
      ],
      sourceMinutes: 5,
      sourceBlurb: "10-12 true/false statements with thumbs up/down/sideways"
    },
    "Short Answer Check": {
      sourceFile: "lib/templates/mini-quiz.ts",
      materials: [
        "Short answer questions",
        "Answer key"
      ],
      sourceSteps: [
        "Students write answers to 3-5 questions (4 mins)",
        "Swap with partner (1 min)",
        "Mark using answer key (2 mins)",
        "Discuss any disagreements (1 min)",
        "Self-assess: ___ / 5"
      ],
      sourceMinutes: 8,
      sourceBlurb: "3-5 short answer questions, pair mark with answer key"
    },
    "Diagnostic Question": {
      sourceFile: "lib/templates/mini-quiz.ts",
      materials: [
        "Diagnostic question(s)",
        "Common misconception guide"
      ],
      sourceSteps: [
        "Present 1-2 diagnostic questions (3 mins)",
        "Students answer with explanation",
        "Teacher analyzes common answers (2 mins)",
        "Address misconception immediately (2 mins)",
        "Group students by need if necessary"
      ],
      sourceMinutes: 7,
      sourceBlurb: "1-2 carefully designed questions that reveal thinking and misconceptions"
    },
    "Exit Ticket (Plenary)": {
      sourceFile: "lib/templates/plenary.ts",
      materials: [
        "Exit ticket template"
      ],
      sourceSteps: [
        "Choose format: 3-2-1 / Traffic Light / What-So What-Now What",
        "Students write responses (3 mins)",
        "Submit on way out",
        "Teacher reviews for planning"
      ],
      sourceMinutes: 5,
      sourceBlurb: "Quick written reflection before leaving (same as Activity Plenary #4)"
    },
    "Preview Next Lesson": {
      sourceFile: "lib/templates/plenary.ts",
      materials: [
        "Recap notes",
        "Preview slide",
        "Preparation task"
      ],
      sourceSteps: [
        "Today We Learned (2 mins): Quick recap",
        "Next Lesson We Will (2 mins): Preview and connect",
        "Preparation Task (1 min): Quick homework/prep",
        "Closing Question (2 mins): Leave them thinking"
      ],
      sourceMinutes: 7,
      sourceBlurb: "Recap today, preview tomorrow, set preparation task"
    },
    "Structured Reflection Protocol (Four-Corner)": {
      sourceFile: "lib/templates/reflection.ts",
      materials: [
        "Corner signs",
        "Task cards for each corner"
      ],
      sourceSteps: [
        "Explain corners: Got it / Mostly understand / Getting there / Need help",
        "Students move to their corner (2 mins)",
        "Each corner completes specific task (6 mins)",
        "Teacher visits each corner, addresses needs (4 mins)"
      ],
      sourceMinutes: 12,
      sourceBlurb: "Students move to corners based on confidence level"
    },
    "Learning Log Entry": {
      sourceFile: "lib/templates/reflection.ts",
      materials: [
        "Learning log template",
        "Writing materials"
      ],
      sourceSteps: [
        "Students complete structured reflection (8 mins):",
        "1. NEW LEARNING: What's one new thing?",
        "2. CONNECTIONS: How does this connect?",
        "3. CHALLENGES: What was difficult?",
        "4. STRATEGIES: What helped me learn?",
        "5. NEXT STEPS: What do I want to work on?",
        "Optional: Share one insight with partner (2 mins)"
      ],
      sourceMinutes: 10,
      sourceBlurb: "Structured journal: New Learning / Connections / Challenges / Strategies / Next Steps"
    },
    "Muddiest Point": {
      sourceFile: "lib/templates/reflection.ts",
      materials: [
        "Sticky notes",
        "Markers"
      ],
      sourceSteps: [
        "Individual (3 mins): Write 'The muddiest point for me is...' on sticky note",
        "Teacher collects & groups (2 mins): Sort by common themes",
        "Address Top 3 (8 mins): Clear up biggest confusions with student explanations"
      ],
      sourceMinutes: 13,
      sourceBlurb: "Identify what's unclear, teacher addresses top confusions"
    },
    "Plus-Minus-Interesting (PMI)": {
      sourceFile: "lib/templates/reflection.ts",
      materials: [
        "PMI template",
        "Writing materials"
      ],
      sourceSteps: [
        "Individual Reflection (5 mins):",
        "PLUS: What worked well?",
        "MINUS: What was challenging?",
        "INTERESTING: What surprised me?",
        "Share (5 mins): Pairs compare, class discusses themes"
      ],
      sourceMinutes: 10,
      sourceBlurb: "Edward de Bono thinking: What worked (+) / What was challenging (−) / What surprised (?)"
    },
    "Quick Retrieval Quiz": {
      sourceFile: "lib/templates/starter-activity.ts",
      materials: [
        "Quiz questions sheet",
        "Answer key"
      ],
      sourceSteps: [
        "Students answer 3-5 recall questions individually",
        "Pair check answers (2 mins)",
        "Whole class review and discussion (3 mins)",
        "Link to today's objective"
      ],
      sourceMinutes: 7,
      sourceBlurb: "Answer 3-5 questions from memory to recall prior learning"
    },
    "Think-Pair-Share": {
      sourceFile: "lib/templates/starter-activity.ts",
      materials: [
        "Thinking prompt",
        "Discussion questions"
      ],
      sourceSteps: [
        "Think alone (1 min) - jot down ideas about [topic]",
        "Share with partner (2 mins) - compare notes",
        "Pairs share best ideas (3 mins) - class discussion",
        "Teacher synthesizes (1 min) - connect to today's goal"
      ],
      sourceMinutes: 7,
      sourceBlurb: "Individual thinking → Partner discussion → Share out"
    },
    "Hook & Predict": {
      sourceFile: "lib/templates/starter-activity.ts",
      materials: [
        "Stimulus (image/video/scenario)",
        "Notice/Wonder template"
      ],
      sourceSteps: [
        "Show attention-grabbing stimulus (30 secs)",
        "Students write 2 things they notice (1 min)",
        "Students write 1 thing they wonder (1 min)",
        "Share out observations and questions (3 mins)",
        "Link to today's learning objective (1 min)"
      ],
      sourceMinutes: 7,
      sourceBlurb: "Present intriguing stimulus and ask 'What do you notice? What do you wonder?'"
    },
    "Word Splash": {
      sourceFile: "lib/templates/starter-activity.ts",
      materials: [
        "Word splash handout",
        "Key vocabulary list"
      ],
      sourceSteps: [
        "Display 5-8 key terms for today's lesson",
        "Students circle terms they know well",
        "Underline terms they've heard but unsure",
        "Leave blank terms they don't know",
        "Partner discussion (2 mins): Explain circled terms",
        "Class creates working definitions (3 mins)",
        "Self-assess confidence: 🟢🟡🔴"
      ],
      sourceMinutes: 7,
      sourceBlurb: "Connect key vocabulary to prior knowledge through self-assessment"
    },
    "Daily Review Routine": {
      sourceFile: "lib/templates/starter-activity.ts",
      materials: [
        "Homework answer key",
        "Common error examples",
        "Quick practice problem"
      ],
      sourceSteps: [
        "Quick homework check (2 mins) - scan for completion, spot common issues",
        "Address common errors (3 mins) - whole class discussion of 2-3 frequent mistakes",
        "Guided practice (3 mins) - reteach tricky concept with worked example",
        "Link to today's lesson (30 secs) - 'Today we'll build on this by...'"
      ],
      sourceMinutes: 8,
      sourceBlurb: "Check homework, address common errors, reteach concepts - daily routine for retention"
    },
    "Establish Talk Ground Rules": {
      sourceFile: "lib/templates/starter-activity.ts",
      materials: [
        "Chart paper",
        "Markers",
        "Optional: Ground rules template"
      ],
      sourceSteps: [
        "Ask: 'What makes group discussions go well?' (2 mins) - brainstorm ideas",
        "Ask: 'What makes them go badly?' (2 mins) - identify problems",
        "Students pair-discuss and share ideas (3 mins) - synthesize thinking",
        "Co-create list of 5-7 ground rules together (2 mins) - write on chart paper",
        "Display rules prominently in classroom (1 min)",
        "Note: Revisit these before each oracy activity throughout year"
      ],
      sourceMinutes: 10,
      sourceBlurb: "Co-create class ground rules for quality dialogue and oracy (use at start of year/unit)"
    },
    "Clear Objectives Slide": {
      sourceFile: "lib/templates/starter-slide.ts",
      materials: [
        "Prepared slide with objectives, criteria, keywords"
      ],
      sourceSteps: [
        "Display slide with: Title, Learning Objectives (3), Success Criteria (I can...), Key Words",
        "Teacher reads objectives aloud",
        "Get started with active learning"
      ],
      sourceMinutes: 2,
      sourceBlurb: "Display learning objectives, success criteria, and key words"
    },
    "Hook + Objectives": {
      sourceFile: "lib/templates/starter-slide.ts",
      materials: [
        "Hook stimulus",
        "Objectives slide"
      ],
      sourceSteps: [
        "Show engaging image/video/question",
        "Present Big Question that will be answered",
        "Show: Today we will... (3 activities)",
        "Show: By the end you'll be able to..."
      ],
      sourceMinutes: 2,
      sourceBlurb: "Engaging stimulus + big question + today's activities"
    },
    "Connection Slide": {
      sourceFile: "lib/templates/starter-slide.ts",
      materials: [
        "Connection slide with learning sequence"
      ],
      sourceSteps: [
        "Show: Last Lesson (brief recap)",
        "Show: Today (what we're learning)",
        "Show: Next Lesson (where we're going)",
        "Show: Why This Matters (real-world connection)",
        "Show: What You'll Do (3 activities)"
      ],
      sourceMinutes: 2,
      sourceBlurb: "Last lesson → Today → Next lesson + Why it matters"
    }
  };

  // src/activities/catalogue.js
  var PHASES = [
    { key: "starter-slide", label: "Starter Slide", icon: "▤", blurb: "Put the destination on the wall before anything else." },
    { key: "starter-activity", label: "Starter Activity", icon: "◎", blurb: "Settle the room and pull back what they already know." },
    { key: "activation", label: "Activation", icon: "✦", blurb: "Surface prior thinking, including the wrong kind." },
    { key: "construction", label: "Construction", icon: "◧", blurb: "Build the idea: model it, name its edges." },
    { key: "mini-activity", label: "Mini Activity", icon: "⚡", blurb: "A short go at it while the modelling is still warm." },
    { key: "main-activity", label: "Main Activity", icon: "▣", blurb: "The long piece of work the lesson is for." },
    { key: "collaboration", label: "Collaboration", icon: "▦", blurb: "Make them say it out loud to somebody." },
    { key: "mini-quiz", label: "Mini Quiz", icon: "?", blurb: "Find out who has it, while there is time to act." },
    { key: "reflection", label: "Reflection", icon: "↺", blurb: "What stuck, what did not, and what to do about it." },
    { key: "plenary", label: "Plenary", icon: "⚑", blurb: "Close it, and point at what comes next." },
    { key: "activity-plenary", label: "Activity Plenary", icon: "⚐", blurb: "Close on the work rather than on the clock." }
  ];
  var ACTIVITIES = [
    {
      key: "clear-objectives-slide",
      icon: "▤",
      title: "Clear Objectives Slide",
      blurb: "Display learning objectives, success criteria, and key words",
      phase: "starter-slide",
      minutes: 2,
      target: "slide",
      layout: "keywords",
      steps: [
        "Display slide with: Title, Learning Objectives (3), Success Criteria (I can...), Key Words",
        "Teacher reads objectives aloud",
        "Get started with active learning"
      ]
    },
    {
      key: "hook-objectives",
      icon: "▤",
      title: "Hook + Objectives",
      blurb: "Engaging stimulus + big question + today's activities",
      phase: "starter-slide",
      minutes: 2,
      target: "slide",
      layout: "split",
      steps: [
        "Show engaging image/video/question",
        "Present Big Question that will be answered",
        "Show: Today we will... (3 activities)",
        "Show: By the end you'll be able to..."
      ]
    },
    {
      key: "connection-slide",
      icon: "▤",
      title: "Connection Slide",
      blurb: "Last lesson → Today → Next lesson + Why it matters",
      phase: "starter-slide",
      minutes: 2,
      target: "slide",
      /* keywords, not the doc's cards. Each of the five steps names a box and
         what goes in it, and keywords is the layout that draws a label beside
         its text; cards draws five unlabelled tiles three-wide, so two wrap and
         none says which is which. The doc's own note reads "Yesterday → Today →
         Tomorrow" — three boxes — the shape it was written for before the
         source grew to five. */
      layout: "keywords",
      steps: [
        "Show: Last Lesson (brief recap)",
        "Show: Today (what we're learning)",
        "Show: Next Lesson (where we're going)",
        "Show: Why This Matters (real-world connection)",
        "Show: What You'll Do (3 activities)"
      ],
      /* One box per step. The labels are the steps' own, so all a teacher fills
         in is the content. */
      fields: [
        {
          label: "Last lesson",
          type: "text",
          slide: "bullets.0.def",
          value: "A one-line recap of where we got to.",
          hint: "Brief. They were there — a hook back, not a re-teach."
        },
        {
          label: "Today",
          type: "text",
          slide: "bullets.1.def",
          value: "What we are learning today."
        },
        {
          label: "Next lesson",
          type: "text",
          slide: "bullets.2.def",
          value: "Where this is going."
        },
        {
          label: "Why this matters",
          type: "text",
          slide: "bullets.3.def",
          value: "Where this shows up outside the room.",
          hint: "The real-world connection — the part they actually remember."
        },
        {
          label: "What you will do",
          type: "area",
          slide: "bullets.4.def",
          value: "Measure · Draw to scale · Check a partner",
          hint: "The three activities on one line. Separate them how you like."
        }
      ]
    },
    {
      key: "quick-retrieval-quiz",
      icon: "◎",
      title: "Quick Retrieval Quiz",
      blurb: "Answer 3-5 questions from memory to recall prior learning",
      phase: "starter-activity",
      minutes: 7,
      target: "game",
      style: "lowstakes",
      steps: [
        "Students answer 3-5 recall questions individually",
        "Pair check answers (2 mins)",
        "Whole class review and discussion (3 mins)",
        "Link to today's objective"
      ]
    },
    {
      key: "think-pair-share",
      icon: "◎",
      title: "Think-Pair-Share",
      blurb: "Individual thinking → Partner discussion → Share out",
      phase: "starter-activity",
      minutes: 7,
      target: "moment",
      steps: [
        "Think alone (1 min) - jot down ideas about [topic]",
        "Share with partner (2 mins) - compare notes",
        "Pairs share best ideas (3 mins) - class discussion",
        "Teacher synthesizes (1 min) - connect to today's goal"
      ]
    },
    {
      key: "hook-and-predict",
      icon: "◎",
      title: "Hook & Predict",
      blurb: "Present intriguing stimulus and ask 'What do you notice? What do you wonder?'",
      phase: "starter-activity",
      minutes: 7,
      target: "slide",
      layout: "split",
      steps: [
        "Show attention-grabbing stimulus (30 secs)",
        "Students write 2 things they notice (1 min)",
        "Students write 1 thing they wonder (1 min)",
        "Share out observations and questions (3 mins)",
        "Link to today's learning objective (1 min)"
      ],
      /* The two questions are the activity — the blurb states them verbatim —
         so they arrive written rather than as empty pits. The stimulus is the
         teacher's, because only they know what the lesson is about. */
      fields: [
        {
          label: "The stimulus",
          type: "text",
          slide: "title",
          value: "What is going on here?",
          hint: "The line above the image. Keep it short — the picture is doing the work."
        },
        {
          label: "Question 1",
          type: "text",
          slide: "bullets.0",
          value: "What do you notice?",
          hint: "Observation. Answerable by anyone looking at it."
        },
        {
          label: "Question 2",
          type: "text",
          slide: "bullets.1",
          value: "What do you wonder?",
          hint: "Curiosity. This is the one that opens the lesson."
        },
        {
          label: "Timer",
          type: "minutes",
          slide: "timeLimit",
          value: 7,
          hint: "Shown on the wall while they look. The five steps add up to this."
        }
      ]
    },
    {
      key: "word-splash",
      icon: "◎",
      title: "Word Splash",
      blurb: "Connect key vocabulary to prior knowledge through self-assessment",
      phase: "starter-activity",
      minutes: 7,
      target: "feedback",
      feedbackKind: "wordcloud",
      steps: [
        "Display 5-8 key terms for today's lesson",
        "Students circle terms they know well",
        "Underline terms they've heard but unsure",
        "Leave blank terms they don't know",
        "Partner discussion (2 mins): Explain circled terms",
        "Class creates working definitions (3 mins)",
        "Self-assess confidence: 🟢🟡🔴"
      ]
    },
    {
      key: "daily-review-routine",
      icon: "◎",
      title: "Daily Review Routine",
      blurb: "Check homework, address common errors, reteach concepts - daily routine for retention",
      phase: "starter-activity",
      minutes: 8,
      target: "slide",
      layout: "cards",
      steps: [
        "Quick homework check (2 mins) - scan for completion, spot common issues",
        "Address common errors (3 mins) - whole class discussion of 2-3 frequent mistakes",
        "Guided practice (3 mins) - reteach tricky concept with worked example",
        "Link to today's lesson (30 secs) - 'Today we'll build on this by...'"
      ]
    },
    {
      key: "establish-talk-ground-rules",
      icon: "◎",
      title: "Establish Talk Ground Rules",
      blurb: "Co-create class ground rules for quality dialogue and oracy (use at start of year/unit)",
      phase: "starter-activity",
      minutes: 10,
      target: "slide",
      layout: "keywords",
      steps: [
        "Ask: 'What makes group discussions go well?' (2 mins) - brainstorm ideas",
        "Ask: 'What makes them go badly?' (2 mins) - identify problems",
        "Students pair-discuss and share ideas (3 mins) - synthesize thinking",
        "Co-create list of 5-7 ground rules together (2 mins) - write on chart paper",
        "Display rules prominently in classroom (1 min)",
        "Note: Revisit these before each oracy activity throughout year"
      ]
    },
    {
      key: "do-now-bell-ringer",
      icon: "✦",
      title: "Do Now / Bell Ringer",
      blurb: "Silent individual work on board when students enter",
      phase: "activation",
      minutes: 8,
      target: "moment",
      steps: [
        "On board: 3 questions (recall from last lesson, connection, preview)",
        "Silent individual work (5 mins)",
        "Quick pair check (2 mins)",
        "Whole class review (3 mins)",
        "Link to today's objective"
      ]
    },
    {
      key: "knowledge-activation-web",
      icon: "✦",
      title: "Knowledge Activation Web",
      blurb: "Build a web of connected ideas on the board",
      phase: "activation",
      minutes: 7,
      target: "feedback",
      feedbackKind: "wordcloud",
      steps: [
        "Write topic in center of board (1 min)",
        "Students call out anything they know (3 mins)",
        "Teacher writes and draws connecting lines",
        "Look for patterns and gaps (2 mins)",
        "Set today's learning goal (1 min)"
      ]
    },
    {
      key: "pre-assessment-quickfire",
      icon: "✦",
      title: "Pre-Assessment Quickfire",
      blurb: "Thumbs up/down/sideways for 8-10 true/false statements",
      phase: "activation",
      minutes: 8,
      target: "game",
      style: "truefalse",
      steps: [
        "Teacher reads 8-10 statements",
        "Students show: 👍 True / 👎 False / 👉 Unsure",
        "Teacher notes misconceptions",
        "Clarify key terms",
        "Set learning goals based on gaps"
      ]
    },
    {
      key: "i-do-we-do-you-do",
      icon: "◧",
      title: "I Do, We Do, You Do",
      blurb: "Gradual release: Teacher models → Guided practice → Independent practice",
      phase: "construction",
      minutes: 20,
      target: "slide",
      layout: "cards",
      steps: [
        "I DO (5 mins): Teacher models with think-aloud",
        "WE DO (8 mins): Class solves together, teacher guides",
        "YOU DO Together (5 mins): Partner practice with support",
        "YOU DO Alone (7 mins): Independent practice, quick check"
      ]
    },
    {
      key: "concept-development",
      icon: "◧",
      title: "Concept Development",
      blurb: "Build understanding: Show → Explain → Examples/Non-Examples → Apply",
      phase: "construction",
      minutes: 20,
      target: "slide",
      layout: "keywords",
      steps: [
        "SHOW: Present concept with clear example (3 mins)",
        "EXPLAIN: Break down - what, why, how (5 mins)",
        "EXAMPLES & NON-EXAMPLES: Identify features (5 mins)",
        "GUIDED APPLICATION: Apply concept (7 mins)",
        "INDEPENDENT PRACTICE: Create own examples (5 mins)"
      ]
    },
    {
      key: "flipped-instruction",
      icon: "◧",
      title: "Flipped Instruction",
      blurb: "Deepen understanding after home learning (Review → Deep Dive → Application)",
      phase: "construction",
      minutes: 25,
      target: "slide-arc",
      steps: [
        "Home Learning Review (3 mins): Poll understanding, address questions",
        "Deep Dive (10 mins): Focus on hardest parts, work complex examples",
        "Application Practice (12 mins): Apply to challenging problems, differentiated support"
      ]
    },
    {
      key: "question-cube-six-question-types",
      icon: "◧",
      title: "Question Cube - Six Question Types",
      blurb: "Deep questioning using Rosenshine's six question templates: Define, Compare, Why, Example, What If, Benefits/Limits",
      phase: "construction",
      minutes: 20,
      target: "feedback",
      feedbackKind: "brainstorm",
      steps: [
        "Present topic/concept (e.g., 'Photosynthesis') (1 min)",
        "Explain the 6 question types (2 mins):",
        "🔵 DEFINE: What is [concept]?",
        "🟢 COMPARE: How is it different from [related concept]?",
        "🟡 WHY: Why is [concept] important/how does it work?",
        "🟣 EXAMPLE: Give a real-world example",
        "🔴 WHAT IF: What would happen if...?",
        "🟠 BENEFITS/LIMITS: What conditions are needed? What are the limitations?",
        "Round 1 (12 mins): Teacher or student picks question type, student answers (30s thinking, 30s response), rotate through all 6 types with 2-3 students per type",
        "Round 2 (optional): Students generate their own questions for each type",
        "Debrief (5 mins): Which questions were hardest? Which helped you understand most?"
      ]
    },
    {
      key: "worked-example-analysis",
      icon: "⚡",
      title: "Worked Example Analysis",
      blurb: "Analyze a completed example together to understand the process",
      phase: "mini-activity",
      minutes: 10,
      target: "slide",
      layout: "split",
      steps: [
        "Display completed example (1 min)",
        "Students identify each step (3 mins) - What happened? Why?",
        "Pairs create a 'recipe' for solving similar problems (3 mins)",
        "Test recipe on new problem (3 mins)",
        "Compare approaches (2 mins)"
      ]
    },
    {
      key: "error-analysis",
      icon: "⚡",
      title: "Error Analysis",
      blurb: "Find and fix mistakes in sample work to identify misconceptions",
      phase: "mini-activity",
      minutes: 10,
      target: "game",
      style: "oddone",
      steps: [
        "Show work with 3-4 deliberate errors (1 min)",
        "Individual: Spot the errors (3 mins)",
        "Pairs: Discuss and correct errors (3 mins)",
        "Share: What were the errors? (2 mins)",
        "Reflect: Why might someone make these mistakes? (1 min)"
      ]
    },
    {
      key: "quick-practice-stations",
      icon: "⚡",
      title: "Quick Practice Stations",
      blurb: "Rotate through 3 quick tasks: Recall, Apply, Create",
      phase: "mini-activity",
      minutes: 10,
      target: "slide",
      layout: "cards",
      steps: [
        "Station 1: Recall task (3 mins)",
        "Station 2: Apply task (3 mins)",
        "Station 3: Create task (3 mins)",
        "Brief share out (1 min)"
      ]
    },
    {
      key: "concept-card-sort",
      icon: "⚡",
      title: "Concept Card Sort",
      blurb: "Organize information into categories to understand relationships",
      phase: "mini-activity",
      minutes: 10,
      target: "game",
      style: "order",
      steps: [
        "Give each group 12-15 cards with terms/images/examples (1 min)",
        "Sort into categories (4 mins) - choose or create categories",
        "Groups walk around to see others' sorts (2 mins)",
        "Discuss: Different ways to organize (2 mins)",
        "Reflect: Which organization is most useful? Why? (1 min)"
      ]
    },
    {
      key: "interleaving-mixed-practice",
      icon: "⚡",
      title: "Interleaving Mixed Practice",
      blurb: "Mix problems from today AND previous weeks for long-term retention (spaced learning)",
      phase: "mini-activity",
      minutes: 15,
      target: "game",
      style: "choice",
      steps: [
        "Present 10 problems: 6 from today's topic, 4 from previous weeks (1 min)",
        "Students solve independently (8 mins) - mix of old and new",
        "Pair-check answers (3 mins) - discuss strategies used",
        "Whole class: 'How did previous learning help today?' (3 mins)",
        "Reflect: Which problems were harder - new or old? Why?"
      ]
    },
    {
      key: "strategic-wait-time-questioning",
      icon: "⚡",
      title: "Strategic Wait Time Questioning",
      blurb: "Questioning with explicit 3-5 second wait time for deeper thinking and participation",
      phase: "mini-activity",
      minutes: 10,
      target: "moment",
      steps: [
        "Pose question to whole class clearly",
        "⏱️ WAIT 3-5 seconds (no hands up yet) - give thinking time",
        "Call on student randomly (use name sticks/cards)",
        "⏱️ WAIT 3 seconds for student to formulate answer",
        "Student responds",
        "⏱️ WAIT 2 seconds before responding or asking follow-up",
        "Repeat 5-7 times with different students (10 mins total)",
        "Note: Increased wait time = better answers + more participation"
      ]
    },
    {
      key: "guided-inquiry-investigation",
      icon: "▣",
      title: "Guided Inquiry Investigation",
      blurb: "Students discover concepts through structured exploration (Explore → Explain → Elaborate → Share)",
      phase: "main-activity",
      minutes: 30,
      target: "slide-arc",
      steps: [
        "EXPLORE (10 mins): Investigate stimulus - What patterns? What happens when you change X?",
        "EXPLAIN (8 mins): Develop explanation - Why? What's the rule?",
        "ELABORATE (7 mins): Apply to new situation - Use understanding to solve problems",
        "SHARE & REFINE (5 mins): Present findings and build shared understanding"
      ]
    },
    {
      key: "jigsaw-expert-groups",
      icon: "▣",
      title: "Jigsaw Expert Groups",
      blurb: "Students become experts and teach peers (Home → Expert → Home)",
      phase: "main-activity",
      minutes: 29,
      target: "moment",
      steps: [
        "Home Groups (5 mins): Groups of 4, assign each person a sub-topic",
        "Expert Groups (12 mins): All 1s together, become experts, create teaching plan",
        "Home Groups Return (12 mins): Each expert teaches their part (3 mins each), create complete picture"
      ]
    },
    {
      key: "problem-based-learning",
      icon: "▣",
      title: "Problem-Based Learning",
      blurb: "Solve authentic, complex problem through structured inquiry",
      phase: "main-activity",
      minutes: 35,
      target: "slide",
      layout: "split",
      steps: [
        "Present Problem: Real-world scenario (3 mins)",
        "What do we KNOW? List given information (5 mins)",
        "What do we NEED to know? Identify gaps (5 mins)",
        "Research & Plan: Find information, develop strategy (10 mins)",
        "Solve: Implement solution, show working (10 mins)",
        "Present & Justify: Share solution and reasoning (7 mins)"
      ]
    },
    {
      key: "differentiated-practice-menu",
      icon: "▣",
      title: "Differentiated Practice Menu",
      blurb: "Must-do task plus choice board (Consolidate/Apply/Extend)",
      phase: "main-activity",
      minutes: 25,
      target: "slide",
      layout: "cards",
      steps: [
        "Must Do: Core practice task - everyone (10 mins)",
        "Choose Your Challenge (15 mins):",
        "🟢 Consolidate: Easier version with scaffolding",
        "🟡 Apply: Standard problem-solving",
        "🔴 Extend: Complex multi-step challenge"
      ]
    },
    {
      key: "design-and-create-task",
      icon: "▣",
      title: "Design & Create Task",
      blurb: "Create something that demonstrates understanding (poster/model/presentation/video)",
      phase: "main-activity",
      minutes: 35,
      target: "slide",
      layout: "cards",
      steps: [
        "Brief: Design/create [product] that shows understanding (2 mins)",
        "Planning: Sketch ideas, gather resources (5 mins)",
        "Creating: Make your product (20 mins)",
        "Self-assessment: Check against criteria (3 mins)",
        "Gallery walk: View and learn from others (5 mins)"
      ]
    },
    {
      key: "think-pair-square-share",
      icon: "▦",
      title: "Think-Pair-Square-Share",
      blurb: "Progressive sharing: Individual → Pair → Group of 4 → Class",
      phase: "collaboration",
      minutes: 13,
      target: "moment",
      steps: [
        "THINK (2 mins): Individual reflection",
        "PAIR (3 mins): Share with partner",
        "SQUARE (4 mins): Join another pair, synthesize",
        "SHARE (4 mins): Groups present to class"
      ]
    },
    {
      key: "jigsaw-collaboration",
      icon: "▦",
      title: "Jigsaw Collaboration",
      blurb: "Home groups → Expert groups → Return to teach (see Main Activity for full version)",
      phase: "collaboration",
      minutes: 20,
      target: "moment",
      steps: [
        "Home groups split (2 mins)",
        "Expert groups learn one piece (10 mins)",
        "Return to home groups to teach (8 mins)"
      ]
    },
    {
      key: "peer-teaching-carousel",
      icon: "▦",
      title: "Peer Teaching Carousel",
      blurb: "Rotate through stations, adding to and building on previous groups' work",
      phase: "collaboration",
      minutes: 20,
      target: "moment",
      steps: [
        "Setup: 4-5 stations with different tasks",
        "Groups rotate every 4 minutes",
        "At each station: Read previous work, add thinking, correct errors",
        "Final Round (5 mins): Return to starting station, review, synthesize",
        "Present to class"
      ]
    },
    {
      key: "socratic-seminar",
      icon: "▦",
      title: "Socratic Seminar (Simple)",
      blurb: "Student-led discussion: Inner circle discusses, outer circle observes",
      phase: "collaboration",
      minutes: 20,
      target: "moment",
      steps: [
        "Round 1 (8 mins): Inner circle discusses prompt with evidence",
        "Round 2 (8 mins): Switch circles, new discussion",
        "Debrief (4 mins): What strong arguments? What was convincing?"
      ]
    },
    {
      key: "dialogue-chain-discussion",
      icon: "▦",
      title: "Dialogue Chain Discussion",
      blurb: "Structured student-led discussion where each student builds on previous responses using academic connectors",
      phase: "collaboration",
      minutes: 15,
      target: "slide",
      layout: "cards",
      steps: [
        "Present discussion question to class (1 min)",
        "Student 1: Gives initial answer (30 seconds)",
        "Student 2: 'I agree/disagree because...' OR 'Building on that idea...' (30 seconds)",
        "Student 3: Continues chain using academic language (30 seconds)",
        "Continue for 8-10 students (10 mins)",
        "Teacher synthesizes key insights (2 mins)"
      ]
    },
    {
      key: "real-world-connection-hunt",
      icon: "▦",
      title: "Real-World Connection Hunt",
      blurb: "Students identify real-world examples of concepts in their classroom, school, home, and community",
      phase: "collaboration",
      minutes: 15,
      target: "feedback",
      feedbackKind: "brainstorm",
      steps: [
        "Present concept (e.g., 'Friction' or 'Democracy') (2 mins)",
        "Challenge 1 (3 mins): Find examples in THIS ROOM",
        "Challenge 2 (3 mins): Think of examples AT HOME",
        "Challenge 3 (3 mins): Identify examples IN YOUR COMMUNITY",
        "Share out (3 mins): Students explain their connections",
        "Reflect (1 min): 'Why does this concept matter in real life?'"
      ]
    },
    {
      key: "explanation-champion-challenge",
      icon: "▦",
      title: "Explanation Champion Challenge",
      blurb: "Students explain concepts without using banned words, forcing deeper articulation of understanding",
      phase: "collaboration",
      minutes: 15,
      target: "game",
      style: "headsup",
      steps: [
        "Display concept word (e.g., 'Photosynthesis') (1 min)",
        "Show 4-5 BANNED WORDS students can't use (e.g., 'sunlight', 'oxygen', 'plants') (1 min)",
        "Think time (2 mins): Students plan their explanation",
        "Volunteer explains to class (60 seconds)",
        "Class votes: Clear (2 pts), Okay (1 pt), Unclear (0 pts)",
        "Repeat with 3-4 more students and concepts (8 mins)",
        "Debrief (2 mins): What made explanations clear?"
      ]
    },
    {
      key: "compare-and-contrast-venn-activity",
      icon: "▦",
      title: "Compare & Contrast Venn Activity",
      blurb: "Visual comparison of two concepts using Venn diagram, focusing on similarities and differences",
      phase: "collaboration",
      minutes: 15,
      target: "game",
      style: "compare",
      steps: [
        "Present two concepts (e.g., 'Photosynthesis' vs 'Respiration') (1 min)",
        "Individual thinking (3 mins): List characteristics of each",
        "Pair work (5 mins): Create Venn diagram together",
        "Gallery walk (4 mins): View other pairs' work",
        "Class synthesis (2 mins): What patterns? What connections?"
      ]
    },
    {
      key: "benefits-vs-limitations-battle",
      icon: "▦",
      title: "Benefits vs Limitations Battle",
      blurb: "Two teams take turns stating benefits and limitations of a concept, practicing balanced analysis",
      phase: "collaboration",
      minutes: 15,
      target: "slide",
      layout: "split",
      steps: [
        "Present topic (e.g., 'Renewable Energy' or 'Social Media') (1 min)",
        "Team setup: Benefits Team vs Limitations Team (1 min)",
        "30-second think time before each round",
        "Teams alternate stating points (10 mins)",
        "Scoring: Valid point = 1 point, Repeat = no points",
        "Switch sides and continue (optional)",
        "Debrief (2 mins): Balanced view discussion"
      ]
    },
    {
      key: "scenario-analysis-discussion",
      icon: "▦",
      title: "Scenario Analysis Discussion",
      blurb: "Analyze real-world scenarios to identify concepts, explain applications, and predict outcomes",
      phase: "collaboration",
      minutes: 18,
      target: "slide",
      layout: "split",
      steps: [
        "Present concept (e.g., 'Supply and Demand') (2 mins)",
        "Show 3 scenarios (e.g., concert tickets, crop harvest, iPhone release) (3 mins)",
        "Question 1 (4 mins): Which scenarios show the concept? (All/Some/One)",
        "Question 2 (4 mins): Pick one and explain HOW",
        "Question 3 (3 mins): Predict what happens next",
        "Question 4 (2 mins): Compare - which is most extreme?"
      ]
    },
    {
      key: "whiteboards-on-walls",
      icon: "▦",
      title: "Whiteboards on Walls",
      blurb: "Students discuss and write thinking on wall whiteboards - visible thinking and peer learning (Franklin Sixth Form approach)",
      phase: "collaboration",
      minutes: 12,
      target: "moment",
      steps: [
        "Students move to wall whiteboards in pairs/groups (30 secs)",
        "Teacher poses problem/question (30 secs)",
        "Groups discuss and write their thinking on whiteboards (5 mins)",
        "Gallery walk - observe and learn from other groups' work (3 mins)",
        "Return to own board and refine thinking based on what you saw (2 mins)",
        "Whole class debrief of key ideas and strongest arguments (1 min)",
        "Note: Arrive early to start, revisit at lesson end for consolidation"
      ]
    },
    {
      key: "connect-four-concept-edition",
      icon: "▦",
      title: "Connect Four - Concept Edition",
      blurb: "Competitive matching game where students connect related concepts (definitions/terms, causes/effects, questions/answers)",
      phase: "collaboration",
      minutes: 20,
      target: "game",
      style: "conceptchain",
      steps: [
        "MODE A - Match Pairs (20 mins):",
        "Setup (2 mins): Create 4x4 grid with paired cards (definitions/terms, causes/effects, questions/answers, benefits/limitations)",
        "Teams take turns (15 mins): Claim two cards that match and explain the connection",
        "If correct: Cards disappear, team scores a connection",
        "If incorrect: Cards stay, next team's turn",
        "Win condition: First team to make 4 valid connections wins",
        "Debrief (3 mins): Discuss strongest connections and misconceptions",
        "MODE B - Category Conquest (Alternative):",
        "Setup: 4 columns, 4 rows of questions (Define, Compare, Example, Why)",
        "Students answer questions to 'claim' spaces",
        "First to get 4 in a row (vertical, horizontal, diagonal) wins"
      ]
    },
    {
      key: "multiple-choice-quiz",
      icon: "?",
      title: "Multiple Choice Quiz",
      blurb: "5-8 multiple choice questions with immediate feedback",
      phase: "mini-quiz",
      minutes: 6,
      target: "game",
      style: "choice",
      steps: [
        "Present 5-8 multiple choice questions",
        "Students respond (paper/whiteboard/digital/fingers)",
        "Show correct answer after each (30-45 secs per question)",
        "Quick explanation if needed",
        "Move on - don't dwell"
      ]
    },
    {
      key: "true-false-rapid-fire",
      icon: "?",
      title: "True/False Rapid Fire",
      blurb: "10-12 true/false statements with thumbs up/down/sideways",
      phase: "mini-quiz",
      minutes: 5,
      target: "game",
      style: "truefalse",
      steps: [
        "Teacher reads 10-12 true/false statements",
        "Students show: 👍 True / 👎 False / 👉 Unsure",
        "Statements mix easy, challenging, and misconceptions",
        "Tally scores, address misconceptions"
      ]
    },
    {
      key: "short-answer-check",
      icon: "?",
      title: "Short Answer Check",
      blurb: "3-5 short answer questions, pair mark with answer key",
      phase: "mini-quiz",
      minutes: 8,
      target: "game",
      style: "type",
      steps: [
        "Students write answers to 3-5 questions (4 mins)",
        "Swap with partner (1 min)",
        "Mark using answer key (2 mins)",
        "Discuss any disagreements (1 min)",
        "Self-assess: ___ / 5"
      ]
    },
    {
      key: "diagnostic-question",
      icon: "?",
      title: "Diagnostic Question",
      blurb: "1-2 carefully designed questions that reveal thinking and misconceptions",
      phase: "mini-quiz",
      minutes: 7,
      target: "game",
      style: "choice",
      steps: [
        "Present 1-2 diagnostic questions (3 mins)",
        "Students answer with explanation",
        "Teacher analyzes common answers (2 mins)",
        "Address misconception immediately (2 mins)",
        "Group students by need if necessary"
      ]
    },
    {
      key: "structured-reflection-protocol",
      icon: "↺",
      title: "Structured Reflection Protocol (Four-Corner)",
      blurb: "Students move to corners based on confidence level",
      phase: "reflection",
      minutes: 12,
      target: "feedback",
      feedbackKind: "poll",
      steps: [
        "Explain corners: Got it / Mostly understand / Getting there / Need help",
        "Students move to their corner (2 mins)",
        "Each corner completes specific task (6 mins)",
        "Teacher visits each corner, addresses needs (4 mins)"
      ]
    },
    {
      key: "learning-log-entry",
      icon: "↺",
      title: "Learning Log Entry",
      blurb: "Structured journal: New Learning / Connections / Challenges / Strategies / Next Steps",
      phase: "reflection",
      minutes: 10,
      target: "slide",
      layout: "content",
      steps: [
        "Students complete structured reflection (8 mins):",
        "1. NEW LEARNING: What's one new thing?",
        "2. CONNECTIONS: How does this connect?",
        "3. CHALLENGES: What was difficult?",
        "4. STRATEGIES: What helped me learn?",
        "5. NEXT STEPS: What do I want to work on?",
        "Optional: Share one insight with partner (2 mins)"
      ]
    },
    {
      key: "muddiest-point",
      icon: "↺",
      title: "Muddiest Point",
      blurb: "Identify what's unclear, teacher addresses top confusions",
      phase: "reflection",
      minutes: 13,
      target: "feedback",
      feedbackKind: "brainstorm",
      steps: [
        "Individual (3 mins): Write 'The muddiest point for me is...' on sticky note",
        "Teacher collects & groups (2 mins): Sort by common themes",
        "Address Top 3 (8 mins): Clear up biggest confusions with student explanations"
      ]
    },
    {
      key: "plus-minus-interesting",
      icon: "↺",
      title: "Plus-Minus-Interesting (PMI)",
      blurb: "Edward de Bono thinking: What worked (+) / What was challenging (−) / What surprised (?)",
      phase: "reflection",
      minutes: 10,
      target: "slide",
      layout: "cards",
      steps: [
        "Individual Reflection (5 mins):",
        "PLUS: What worked well?",
        "MINUS: What was challenging?",
        "INTERESTING: What surprised me?",
        "Share (5 mins): Pairs compare, class discusses themes"
      ]
    },
    {
      key: "exit-ticket",
      icon: "⚑",
      title: "Exit Ticket (Plenary)",
      blurb: "Quick written reflection before leaving (same as Activity Plenary #4)",
      phase: "plenary",
      minutes: 5,
      target: "feedback",
      feedbackKind: "poll",
      steps: [
        "Choose format: 3-2-1 / Traffic Light / What-So What-Now What",
        "Students write responses (3 mins)",
        "Submit on way out",
        "Teacher reviews for planning"
      ]
    },
    {
      key: "preview-next-lesson",
      icon: "⚑",
      title: "Preview Next Lesson",
      blurb: "Recap today, preview tomorrow, set preparation task",
      phase: "plenary",
      minutes: 7,
      target: "slide",
      layout: "section",
      steps: [
        "Today We Learned (2 mins): Quick recap",
        "Next Lesson We Will (2 mins): Preview and connect",
        "Preparation Task (1 min): Quick homework/prep",
        "Closing Question (2 mins): Leave them thinking"
      ]
    },
    {
      key: "exit-ticket-2",
      icon: "⚐",
      title: "Exit Ticket",
      blurb: "Quick written reflection: 3-2-1 or Traffic Light or What-So What-Now What",
      phase: "activity-plenary",
      minutes: 5,
      target: "feedback",
      feedbackKind: "poll",
      steps: [
        "Choose format: 3-2-1 / Traffic Light / What-So What-Now What",
        "Students write individual responses (3 mins)",
        "Submit on way out",
        "Teacher reviews for next lesson planning"
      ]
    },
    {
      key: "recap-quiz-game",
      icon: "⚐",
      title: "Recap Quiz Game",
      blurb: "Fun, competitive review (Quiz-Quiz-Trade / Stand Up If / Quick-Fire)",
      phase: "activity-plenary",
      minutes: 6,
      target: "game",
      style: "speed",
      steps: [
        "Choose format (Quiz-Quiz-Trade / Stand Up If / Quick-Fire)",
        "Play game with review questions (4 mins)",
        "Celebrate correct answers",
        "Address common errors (2 mins)"
      ]
    },
    {
      key: "teach-someone",
      icon: "⚐",
      title: "Teach Someone",
      blurb: "Explain today's learning to a partner",
      phase: "activity-plenary",
      minutes: 8,
      target: "moment",
      steps: [
        "Partner A teaches (2 mins): Today I learned...",
        "Partner B asks 2 questions (1 min)",
        "Switch roles (3 mins)",
        "Together: What would we tell someone who missed today? (2 mins)"
      ]
    },
    {
      key: "visual-summary",
      icon: "⚐",
      title: "Visual Summary",
      blurb: "Create visual showing learning (Mind Map / Comic Strip / Sketch Note / One-Pager)",
      phase: "activity-plenary",
      minutes: 8,
      target: "slide",
      layout: "cards",
      steps: [
        "Choose visual format (Mind Map / Comic Strip / Sketch Note / One-Pager)",
        "Create visual summary (6 mins)",
        "Optional: Share with partner (2 mins)"
      ]
    },
    {
      key: "reflection-ladder",
      icon: "⚐",
      title: "Reflection Ladder",
      blurb: "Self-assess learning journey from 'need help' to 'can teach others'",
      phase: "activity-plenary",
      minutes: 9,
      target: "feedback",
      feedbackKind: "scale",
      steps: [
        "Show ladder: Bottom (need help) → Top (can teach others)",
        "Students draw themselves on their level (1 min)",
        "Write: 'I'm here because...' (2 mins)",
        "Write: 'To move up I need to...' (2 mins)",
        "Share with partner (2 mins)",
        "Teacher notes who needs support (2 mins)"
      ]
    }
  ];
  for (const a of ACTIVITIES) {
    const source = source_meta_default[a.title];
    if (!source) throw new Error("Missing source record: " + a.title);
    a.materials = source.materials.slice();
    a.sourceFile = source.sourceFile;
    const p = PRESETS[a.key] || GAME_PRESETS[a.key];
    if (!p) continue;
    a.originalMapping = { target: a.target, layout: a.layout, style: a.style, feedbackKind: a.feedbackKind };
    a.mappingReason = p.reason;
    a.teacherNotes = p.answer || "";
    if (p.target) {
      a.target = p.target;
      delete a.style;
    }
    if (p.layout) a.layout = p.layout;
    if (p.feedbackKind) a.feedbackKind = p.feedbackKind;
    a.feedbackPreset = p.feedback;
    a.gamePreset = p.game;
    a.pages = p.pages;
    a.presentation = p.presentation;
    if (p.pages) {
      a.pages = p.pages.map((part) => ({ ...part, fields: [
        text("Heading", part.title),
        ...part.fields,
        { label: "Timer", type: "minutes", slide: "timeLimit", value: part.minutes }
      ] }));
    } else if (p.fields) {
      a.fields = [
        text("Heading", p.fieldsTitle || a.title),
        ...p.fields,
        {
          label: "Timer",
          type: "minutes",
          slide: "timeLimit",
          value: p.timer || a.minutes,
          hint: a.target === "moment" ? "Starts automatically when presented. Set 0 to leave it untimed." : "Minutes for this activity. Adjust to suit your class."
        }
      ];
    }
  }
  function activity(key) {
    return ACTIVITIES.find((a) => a.key === key) || null;
  }
  function activitiesInPhase(phase) {
    return ACTIVITIES.filter((a) => a.phase === phase && a.enabled !== false);
  }
  function phaseCounts() {
    return Object.fromEntries(PHASES.map((p) => [p.key, activitiesInPhase(p.key).length]));
  }
  function totalMinutes(keys) {
    return keys.reduce((sum, key) => sum + ((activity(key) || {}).minutes || 0), 0);
  }

  // src/deck/content.js
  var TABLE_MAX_COLS = 6;
  var TABLE_MAX_ROWS = 12;
  function parseTable(text2) {
    var lines = String(text2 == null ? "" : text2).split(/\r?\n/).filter(function(l) {
      return l.trim();
    }).slice(0, TABLE_MAX_ROWS);
    var rows2 = lines.map(function(line) {
      var cells = line.indexOf("	") !== -1 ? line.split("	") : line.split("|");
      return cells.map(function(c) {
        return c.trim();
      }).slice(0, TABLE_MAX_COLS);
    });
    var cols = rows2.reduce(function(n, r) {
      return Math.max(n, r.length);
    }, 0);
    rows2.forEach(function(r) {
      while (r.length < cols) r.push("");
    });
    return rows2;
  }
  function chartData(slide) {
    var rows2 = parseTable(slide && slide.body);
    if (rows2.length < 2) return { categories: [], series: [] };
    var head = rows2[0], body = rows2.slice(1);
    var names = head.slice(1).filter(function(h) {
      return String(h).trim();
    });
    var categories = body.map(function(r) {
      return String(r[0] || "").trim();
    });
    var series = names.map(function(name, i) {
      return {
        name: String(name).trim(),
        values: body.map(function(r) {
          var raw = String(r[i + 1] == null ? "" : r[i + 1]).replace(/[,\s%£$€]/g, "");
          if (!raw) return null;
          var n = Number(raw);
          return Number.isFinite(n) ? n : null;
        })
      };
    });
    return { categories, series };
  }
  var SERIES_LEGEND_KINDS = {
    bar: 1,
    stack: 1,
    hbar: 1,
    line: 1,
    area: 1,
    combo: 1,
    radar: 1,
    bullet: 1,
    scatter: 1,
    /* A dumbbell is two named series drawn as two coloured dots and nothing
       else. Without the key, which end is which is only in a tooltip, and a
       tooltip is not available to a room looking at a projector. */
    dumbbell: 1
  };
  function chartUsesSeriesLegend(kind, seriesCount) {
    return (seriesCount == null ? 2 : seriesCount) > 1 && !!SERIES_LEGEND_KINDS[kind];
  }
  var DATA_MAX_COLS = 200;
  var DATA_MAX_ROWS = 200;
  function dataRows(text2) {
    return String(text2 == null ? "" : text2).split(/\r?\n/).filter(function(l) {
      return l.trim();
    }).slice(0, DATA_MAX_ROWS).map(function(line) {
      var cells = line.indexOf("	") !== -1 ? line.split("	") : line.split("|");
      return cells.map(function(c) {
        return c.trim();
      }).slice(0, DATA_MAX_COLS);
    });
  }
  function chartNumber(cell) {
    var raw = String(cell == null ? "" : cell).replace(/[,\s%£$€]/g, "");
    if (!raw) return null;
    var n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  function chartPoints(slide) {
    var rows2 = dataRows(slide && slide.body);
    if (rows2.length < 2) return { series: [], xLabel: "", yLabel: "", labelled: false };
    var head = rows2[0], body = rows2.slice(1);
    var labelled = body.length > 0 && chartNumber(body[0][0]) == null;
    var xCol = labelled ? 1 : 0;
    var names = head.slice(xCol + 1).filter(function(h) {
      return String(h).trim();
    });
    var series = names.map(function(name, i) {
      var pts = [];
      body.forEach(function(r) {
        var x = chartNumber(r[xCol]), y = chartNumber(r[xCol + 1 + i]);
        if (x != null && y != null) {
          pts.push({ x, y, label: labelled ? String(r[0] || "").trim() : "" });
        }
      });
      return { name: String(name).trim(), points: pts };
    });
    return {
      series,
      xLabel: String(head[xCol] || "").trim(),
      yLabel: names.length === 1 ? names[0] : "",
      labelled
    };
  }
  function chartGroups(slide) {
    var rows2 = dataRows(slide && slide.body);
    if (!rows2.length) return [];
    var body = rows2.length > 1 && chartNumber(rows2[0][1]) == null ? rows2.slice(1) : rows2;
    return body.map(function(r) {
      var vals = r.slice(1).map(chartNumber).filter(function(v) {
        return v != null;
      });
      vals.sort(function(a, b) {
        return a - b;
      });
      return { name: String(r[0] || "").trim(), values: vals };
    }).filter(function(g) {
      return g.values.length;
    });
  }
  function fiveNumber(sorted) {
    if (!sorted.length) return null;
    function q(p) {
      var pos = (sorted.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
      return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    }
    var q1 = q(0.25), med = q(0.5), q3 = q(0.75), iqr = q3 - q1;
    var loFence = q1 - 1.5 * iqr, hiFence = q3 + 1.5 * iqr;
    var inside = sorted.filter(function(v) {
      return v >= loFence && v <= hiFence;
    });
    return {
      min: inside.length ? inside[0] : sorted[0],
      q1,
      median: med,
      q3,
      max: inside.length ? inside[inside.length - 1] : sorted[sorted.length - 1],
      outliers: sorted.filter(function(v) {
        return v < loFence || v > hiFence;
      }),
      n: sorted.length
    };
  }
  function chartFlows(slide) {
    var rows2 = dataRows(slide && slide.body);
    var links = [];
    rows2.forEach(function(r) {
      var from = String(r[0] || "").trim(), to = String(r[1] || "").trim();
      var v = chartNumber(r[2]);
      if (!from || !to || v == null || v <= 0) return;
      links.push({ from, to, value: v });
    });
    if (!links.length) return { nodes: [], links: [], layers: 0 };
    var names = [];
    links.forEach(function(l) {
      if (names.indexOf(l.from) < 0) names.push(l.from);
      if (names.indexOf(l.to) < 0) names.push(l.to);
    });
    var nodes = names.map(function(n) {
      return { name: n, depth: 0, in: 0, out: 0, total: 0, x: 0, y: 0, h: 0, inAt: 0, outAt: 0 };
    });
    var byName = {};
    nodes.forEach(function(n, i) {
      byName[n.name] = i;
    });
    for (var pass = 0; pass < nodes.length; pass++) {
      var moved = false;
      links.forEach(function(l) {
        var a = nodes[byName[l.from]], b = nodes[byName[l.to]];
        if (b.depth < a.depth + 1) {
          b.depth = a.depth + 1;
          moved = true;
        }
      });
      if (!moved) break;
    }
    links.forEach(function(l) {
      nodes[byName[l.from]].out += l.value;
      nodes[byName[l.to]].in += l.value;
    });
    nodes.forEach(function(n) {
      n.total = Math.max(n.in, n.out);
    });
    var layers = nodes.reduce(function(m, n) {
      return Math.max(m, n.depth);
    }, 0) + 1;
    return { nodes, links, layers, index: byName };
  }
  function chartValues(slide) {
    var rows2 = dataRows(slide && slide.body);
    var out = [];
    rows2.forEach(function(r) {
      r.forEach(function(c) {
        var n = chartNumber(c);
        if (n != null) out.push(n);
      });
    });
    return out.sort(function(a, b) {
      return a - b;
    });
  }
  function histogramBins(values, want) {
    if (!values.length) return [];
    var lo = values[0], hi = values[values.length - 1];
    if (hi === lo) return [{ from: lo, to: lo, count: values.length }];
    var n = want || Math.max(5, Math.min(14, Math.ceil(Math.log2(values.length) + 1)));
    var width = (hi - lo) / n, bins = [];
    for (var i = 0; i < n; i++) bins.push({ from: lo + i * width, to: lo + (i + 1) * width, count: 0 });
    values.forEach(function(v) {
      var idx = Math.min(n - 1, Math.floor((v - lo) / width));
      bins[idx].count++;
    });
    return bins;
  }
  function parsePerson(line) {
    var raw = String(line == null ? "" : line);
    var cells = (raw.indexOf("	") !== -1 ? raw.split("	") : raw.split("|")).map(function(c) {
      return c.trim();
    });
    return { name: cells[0] || "", role: cells[1] || "", boss: cells[2] || "", photo: safeMedia(cells[3] || "") };
  }
  function orgTree(lines) {
    var warnings = [];
    var seen = {};
    var people = [];
    (lines || []).map(parsePerson).forEach(function(p) {
      if (!p.name) return;
      var key = p.name.toLowerCase();
      if (seen[key]) {
        warnings.push("Two people are both named “" + p.name + "”. Only the first is kept.");
        return;
      }
      seen[key] = 1;
      people.push(p);
    });
    var byName = {};
    people.forEach(function(p) {
      byName[p.name.toLowerCase()] = p;
      p.reports = [];
    });
    var roots = [];
    people.forEach(function(p) {
      if (!p.boss) {
        roots.push(p);
        return;
      }
      if (p.boss.toLowerCase() === p.name.toLowerCase()) {
        warnings.push("“" + p.name + "” reports to themselves — drawn as top-level.");
        roots.push(p);
        return;
      }
      var boss2 = byName[p.boss.toLowerCase()];
      if (!boss2) {
        warnings.push("“" + p.boss + "” is not on this slide — “" + p.name + "” is drawn as top-level.");
        roots.push(p);
        return;
      }
      boss2.reports.push(p);
    });
    if (!roots.length && people.length) {
      warnings.push("Everyone reports in a loop — drawn as a flat team with no connectors.");
      people.forEach(function(p) {
        p.reports = [];
      });
      roots = people.slice();
    }
    var attached = {};
    function mark(p) {
      var k = p.name.toLowerCase();
      if (attached[k]) return;
      attached[k] = 1;
      (p.reports || []).forEach(mark);
    }
    roots.forEach(mark);
    var orphans = people.filter(function(p) {
      return !attached[p.name.toLowerCase()];
    });
    if (orphans.length) {
      warnings.push(orphans.length === 1 ? "“" + orphans[0].name + "” sits in a reporting loop and was not under any head — drawn as top-level." : orphans.length + " people sit in a reporting loop off the main tree — drawn as top-level.");
      orphans.forEach(function(p) {
        p.reports = [];
        roots.push(p);
      });
    }
    function depth(p, visiting, d) {
      if (d > people.length) return d;
      var k = p.name.toLowerCase();
      if (visiting[k]) return d;
      visiting[k] = 1;
      var max = d;
      (p.reports || []).forEach(function(c) {
        max = Math.max(max, depth(c, visiting, d + 1));
      });
      delete visiting[k];
      return max;
    }
    var levels = roots.reduce(function(m, r) {
      return Math.max(m, depth(r, {}, 1));
    }, 0);
    return { roots, people, levels, warnings };
  }
  function parseKeywordLine(line) {
    var s = String(line == null ? "" : line);
    var tab = s.indexOf("	");
    if (tab !== -1) {
      return { term: s.slice(0, tab).trim(), def: s.slice(tab + 1).trim() };
    }
    var m = s.match(/^(.+?)\s*[—–:\-|]\s+(.+)$/);
    if (m) return { term: m[1].trim(), def: m[2].trim() };
    return { term: s.trim(), def: "" };
  }
  function formatKeywordLine(term, def) {
    return String(term || "").trim() + "	" + String(def || "").trim();
  }
  function parseInfoLine(line) {
    var s = String(line == null ? "" : line).trim();
    var parts = s.indexOf("	") !== -1 ? s.split("	") : s.split("|");
    parts = parts.map(function(p) {
      return p.trim();
    });
    if (parts.length > 3) parts = [parts[0], parts[1], parts.slice(2).join(" · ")];
    return { label: parts[0] || "", value: parts[1] || "", note: parts[2] || "" };
  }
  function formatInfoLine(label, value, note) {
    return [label, value, note].map(function(p) {
      return String(p || "").trim();
    }).join("	").replace(/\t+$/, "");
  }
  function infoNumber(value) {
    var m = String(value || "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  }
  function safeHref(url) {
    var u = String(url || "").trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\/\//.test(u)) return "https:" + u;
    if (u.charAt(0) === "/" && u.indexOf("..") < 0 && /^\/[A-Za-z0-9._~/-]*(\?[A-Za-z0-9._~/\-=&%+]*)?(#[A-Za-z0-9._~/-]*)?$/.test(u)) return u;
    if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([\/?#][^\s]*)?$/i.test(u)) return "https://" + u;
    return "";
  }
  function safeMedia(url) {
    var u = String(url == null ? "" : url).replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (!u) return "";
    if (/^data:/i.test(u)) return /^data:(image|video|audio)\//i.test(u) ? u : "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) {
      return /^(https?|file|blob):/i.test(u) ? u : "";
    }
    return u;
  }
  var SLIDE_TYPES = {
    journey: {
      label: "Journey / handover",
      icon: "↝",
      deck: true,
      pits: 6,
      group: "explain",
      starters: [{ title: "Journey / handover", blurb: "Connect milestones, course topics or stages of a project." }]
    },
    orgchart: {
      label: "People & structure",
      icon: "⛬",
      deck: true,
      pits: 12,
      group: "explain",
      starters: [{ title: "Team or org chart", blurb: "Who reports to whom, with headshots. Also draws a flat team as one row." }]
    },
    mindmap: {
      label: "Mind map",
      icon: "✣",
      deck: true,
      pits: 6,
      group: "explain",
      starters: [{ title: "Mind map", blurb: "One central idea, connected branches, revealed as you teach." }]
    },
    introduction: {
      label: "Lecturer introduction",
      icon: "◎",
      deck: true,
      group: "introduce",
      starters: [{ title: "Lecturer introduction", blurb: "Headshot, name, job title and a short introduction." }]
    },
    title: {
      label: "Title",
      icon: "T",
      deck: true,
      group: "introduce",
      starters: [{
        title: "Opening title",
        blurb: "Big title at the top. Subtitle underneath.",
        seed: { title: "Lesson title", subtitle: "Your name" }
      }]
    },
    section: {
      label: "Section",
      icon: "S",
      deck: true,
      group: "introduce",
      starters: [{
        title: "Section break",
        blurb: "A clean pause between parts of the lesson.",
        seed: { title: "Next idea", subtitle: "A short bridge into what follows." }
      }]
    },
    /* One line, as big as it fits, in the middle of the slide.
       
       Title is a lesson's front door and Section is a divider — both carry an
       accent bar, an eyebrow and a subtitle, and both are sized for a sentence.
       Neither is the slide a teacher wants for a thought: six words, bold,
       centred, nothing else on it. That was being faked with a Section and the
       text-size control, which caps at the size the divider was designed for. */
    statement: {
      label: "Statement",
      icon: "❝",
      deck: true,
      group: "introduce",
      starters: [{
        title: "Statement",
        blurb: "One line, bold and as big as it fits. An opening thought, a provocation, a rule to remember.",
        seed: { body: "Every chart is a choice", subtitle: "" }
      }]
    },
    content: {
      label: "Bullets",
      icon: "•",
      deck: true,
      pits: 8,
      group: "explain",
      starters: [
        {
          title: "Title + content",
          blurb: "Classic teaching slide — heading, then bullet pits.",
          seed: { title: "Slide title", bullets: ["", "", ""] }
        },
        {
          title: "Steps",
          blurb: "Title plus four numbered teaching steps.",
          seed: { title: "How it works", bullets: ["Step one", "Step two", "Step three", "Step four"] }
        }
      ]
    },
    keyfact: {
      label: "Key fact",
      icon: "!",
      deck: true,
      pits: 4,
      group: "explain",
      starters: [{
        title: "Key fact",
        blurb: "One number or rule set large, with the detail beneath it.",
        seed: {
          title: "The thing they must leave with",
          subtitle: "What the fact is",
          body: "The fact, in a few words",
          bullets: ["", "", ""]
        }
      }]
    },
    keywords: {
      label: "Keywords",
      icon: "K",
      deck: true,
      pits: 8,
      group: "explain",
      starters: [{
        title: "Keywords",
        blurb: "Bold keyword + lowercase definition — vocabulary pits.",
        seed: { title: "Key vocabulary", bullets: ["	", "	", "	"] }
      }]
    },
    italics: {
      label: "Phrase + explanation",
      icon: "I",
      deck: true,
      pits: 8,
      group: "explain",
      starters: [{
        title: "Italics",
        blurb: "Italic phrase + plain explanation — emphasis pits.",
        seed: { title: "Phrases to notice", bullets: ["	", "	", "	"] }
      }]
    },
    links: {
      label: "Links",
      icon: "↗",
      deck: true,
      pits: 8,
      group: "show",
      starters: [{
        title: "Hyperlinks",
        blurb: "Label + URL — clickable further reading.",
        seed: { title: "Further reading", bullets: ["	", "	", "	"] }
      }]
    },
    split: {
      label: "Image + text",
      icon: "◫",
      deck: true,
      pits: 5,
      group: "show",
      starters: [{
        title: "Dual coding",
        blurb: "Half text, half image — say it and show it.",
        seed: { title: "Say it. Show it.", bullets: ["", "", ""] }
      }]
    },
    cards: {
      label: "Cards",
      icon: "▦",
      deck: true,
      pits: 6,
      group: "explain",
      starters: [{
        title: "Three cards",
        blurb: "Three idea pits side by side.",
        seed: { title: "Three ideas to hold onto.", bullets: ["", "", ""] }
      }]
    },
    table: {
      label: "Table",
      icon: "⊞",
      deck: true,
      group: "explain",
      starters: [{
        title: "Table",
        blurb: "Rows and columns — for when the exact value matters.",
        seed: { title: "Side by side" }
      }]
    },
    code: {
      label: "Code",
      icon: "</>",
      deck: true,
      group: "explain",
      starters: [{
        title: "Python / code typing",
        blurb: "Source that types itself on the wall — live-coding feel without sharing an IDE.",
        seed: { title: "Code that writes itself", language: "python", typewrite: true }
      }]
    },
    beforeafter: {
      label: "Before / after",
      icon: "◐",
      deck: true,
      group: "show",
      starters: [{ title: "Before / after", blurb: "Two states compared — the second lands on a press." }]
    },
    explore: {
      label: "Explore an image",
      icon: "◎",
      deck: true,
      group: "show",
      starters: [{ title: "Explore an image", blurb: "One picture the room examines, with details you reveal." }]
    },
    simulation: {
      label: "What if? graph",
      icon: "↗",
      deck: true,
      group: "show",
      starters: [{ title: "What if? graph", blurb: "A slider bound to a model — move it and the curve answers." }]
    },
    chart: {
      label: "Chart",
      icon: "▥",
      deck: true,
      group: "explain",
      starters: [{
        title: "Chart",
        blurb: "Bar, line or pie drawn from a range you paste in.",
        seed: {
          title: "What the numbers show",
          chartKind: "bar",
          body: "Day|Students\nMon|12\nTue|19\nWed|15"
        }
      }]
    },
    image: {
      label: "Image",
      icon: "▣",
      deck: true,
      group: "show",
      starters: [{
        title: "Full-bleed image",
        blurb: "One dominant image with a caption.",
        seed: { title: "Caption" }
      }]
    },
    gallery: {
      label: "Image stack",
      icon: "▤",
      deck: true,
      group: "show",
      starters: [{
        title: "Image stack",
        blurb: "Several pictures, revealed one press at a time.",
        seed: { title: "One at a time" }
      }]
    },
    video: {
      label: "Video",
      icon: "▶",
      deck: true,
      group: "show",
      starters: [{
        title: "Video",
        blurb: "A clip from YouTube, Vimeo or a file beside the deck.",
        seed: { title: "Watch this" }
      }]
    },
    quote: {
      label: "Quote",
      icon: "“",
      deck: true,
      group: "introduce",
      starters: [{
        title: "Quote",
        blurb: "A line the room can sit with.",
        seed: {
          body: "Replace this with the line you want the room to sit with.",
          subtitle: "Attribution"
        }
      }]
    },
    /* Infographic shapes. Each is still a bullet layout under the hood — a pit
       per element, revealed on Next — so they inherit reorder, bulk paste,
       spread-across-slides and the presenter excerpt for free. */
    stats: {
      label: "Stat tiles",
      icon: "％",
      deck: true,
      pits: 6,
      group: "infographic",
      starters: [{
        title: "Stat tiles",
        blurb: "Three to six big numbers, each with a label and a note.",
        seed: { title: "The numbers that matter", bullets: ["Label	Value	Note", "		", "		"] }
      }]
    },
    compare: {
      label: "Versus",
      icon: "⇄",
      deck: true,
      pits: 6,
      group: "infographic",
      starters: [{
        title: "Versus",
        blurb: "Two columns compared row by row — before/after, A/B, myth/fact.",
        seed: { title: "Side by side", subtitle: "Option A | Option B", bullets: ["	", "	", "	"] }
      }]
    },
    funnel: {
      label: "Funnel",
      icon: "▽",
      deck: true,
      pits: 6,
      group: "infographic",
      starters: [{
        title: "Funnel",
        blurb: "Stages that narrow — applicants to offers, awareness to action.",
        seed: { title: "Where the numbers thin out", bullets: ["Stage	Value	Note", "		", "		", "		"] }
      }]
    },
    timeline: {
      label: "Timeline",
      icon: "⟶",
      deck: true,
      pits: 8,
      group: "infographic",
      starters: [{
        title: "Timeline",
        blurb: "Dated events along a track — a history, a plan, a term.",
        seed: { title: "How we got here", bullets: ["Date	Event	Detail", "		", "		", "		"] }
      }]
    },
    /* What you see, and what is under it.
    
         The other infographics all lay their parts out side by side, which says
         "these are comparable". A great many things a school teaches are the
         opposite shape: one small visible fact sitting on a mass that is bigger
         than it and deliberately out of view. The cost of a t-shirt. What a
         headline leaves out. What one question to a chatbot actually spends.
    
         Above the waterline goes the subtitle — the thing everyone already sees.
         Below it the pits widen as they deepen, so the shape argues before the
         words do, and they reveal one at a time so a class meets the mass at the
         speed the teacher sets rather than all at once. */
    iceberg: {
      label: "What lies beneath",
      icon: "◭",
      deck: true,
      pits: 6,
      group: "infographic",
      starters: [{
        title: "What lies beneath",
        blurb: "One visible thing, and the mass underneath it — hidden costs, what a headline leaves out.",
        seed: {
          title: "The hidden costs",
          subtitle: "What you see",
          bullets: ["What it costs	Value	Note", "		", "		"]
        }
      }]
    },
    /* A continuum with named ends, and things placed along it.
    
       A compare slide asks "which of these two", and a stat tile asks "how big".
       Neither asks the question a class argues about best: where does this sit
       between two extremes, and does everyone agree? The pits carry a position
       rather than a magnitude, so two items 4 points apart are 4 points apart on
       the line — which is the whole claim the slide is making. */
    spectrum: {
      label: "Spectrum",
      icon: "⇹",
      deck: true,
      pits: 6,
      group: "infographic",
      starters: [{
        title: "Spectrum",
        blurb: "One end to the other, with things placed along it — never/always, cheap/costly, safe/risky.",
        seed: {
          title: "Where does each one sit?",
          subtitle: "Never worth it | Always worth it",
          bullets: ["Something	20	Why it sits there", "	50	", "	85	"]
        }
      }]
    },
    /* A claim, and what is actually behind it.
    
       The move every media-literacy lesson teaches and no layout supported: put
       the assertion up, then take it apart by provenance — who said it, when,
       what it is based on, and what it does not say. The last row is the one
       that matters and the one an author will skip, so the seed names it. */
    sourcecheck: {
      label: "Claim & source",
      icon: "⌕",
      deck: true,
      pits: 6,
      group: "infographic",
      starters: [{
        title: "Claim & source",
        blurb: "A claim, then who said it, when, on what basis, and what it leaves out.",
        seed: {
          title: '"The claim, quoted as it was made"',
          bullets: ["Who	The source", "When	The date", "Basis	What it rests on", "Gap	What it does not say"]
        }
      }]
    },
    /* One quantity, across three or four moments.
    
       A timeline puts events on a track and says when. This says how much, and
       prints the change between each pair — which is the number every reader is
       computing anyway and usually getting wrong. 500,000 to 8 million is not
       "a rise", it is sixteenfold, and the slide should say so. */
    shift: {
      label: "Then / now / next",
      icon: "⇗",
      deck: true,
      pits: 4,
      group: "infographic",
      starters: [{
        title: "Then / now / next",
        blurb: "One quantity across three moments, with the change between them worked out.",
        seed: { title: "How fast this moved", bullets: ["Then	100	Where it started", "Now	400	Where it is", "Next		Where it goes"] }
      }]
    },
    /* Two images, one of them not real.
    
       beforeafter is one image changing; this is two competing, and the room has
       to commit to one before the tells appear. That commitment is the entire
       pedagogy — a class shown the answer first learns that deepfakes are
       detectable, and a class made to guess first learns that they are not. */
    spotfake: {
      label: "Spot the fake",
      icon: "◐",
      deck: true,
      pits: 6,
      group: "show",
      starters: [{
        title: "Spot the fake",
        blurb: "Two images side by side. The room votes, then the tells are named one at a time.",
        seed: {
          title: "Which one is real?",
          subtitle: "A | B",
          correct: 0,
          bullets: ["The first tell", "The second tell", "The third tell"]
        }
      }]
    },
    join: { label: "Join QR & PIN", icon: "⌗", deck: true },
    game: { label: "Game", icon: "◈" },
    quiz: { label: "Quiz", icon: "?" },
    explain: { label: "Explanation", icon: "💡" },
    results: { label: "Score", icon: "⚑" }
  };
  var LAYOUT_GROUPS = [
    ["introduce", "Introduce"],
    ["explain", "Explain & organise"],
    ["show", "Show & explore"],
    ["infographic", "Infographic"]
  ];
  var INFO_LAYOUTS = ["stats", "compare", "funnel", "timeline", "iceberg", "spectrum", "sourcecheck", "shift"];
  function layoutKeys(test) {
    return Object.keys(SLIDE_TYPES).filter(function(k) {
      return test(SLIDE_TYPES[k]);
    });
  }
  var DECK_TYPES = layoutKeys(function(t) {
    return t.deck;
  });
  var BULLET_LAYOUTS = layoutKeys(function(t) {
    return t.pits > 0;
  });
  function prepareLayout(slide, type2) {
    if (DECK_TYPES.indexOf(type2) < 0) return slide;
    slide.type = type2;
    if (!Array.isArray(slide.bullets)) slide.bullets = [];
    if (BULLET_LAYOUTS.indexOf(type2) >= 0 && !slide.bullets.length) slide.bullets = ["", "", ""];
    if (BULLET_LAYOUTS.indexOf(type2) < 0 && slide.bullets.every(function(b) {
      return !String(b).trim();
    })) slide.bullets = [];
    if (type2 === "table" && !String(slide.body || "").trim()) slide.body = "Term | What it means\nFirst | \nSecond | ";
    if (type2 === "code") {
      if (slide.code == null) slide.code = String(slide.body || "");
      if (!String(slide.language || "").trim()) slide.language = "python";
      if (!slide.codeReveal) slide.codeReveal = "type";
      if (slide.typewrite == null) slide.typewrite = true;
      if (!Number.isFinite(Number(slide.typeSpeed)) || Number(slide.typeSpeed) <= 0) slide.typeSpeed = 55;
      if (!String(slide.code || "").trim()) {
        slide.code = 'import pandas as pd\n\ndf = pd.read_csv("attendance.csv")\nby_week = df["week"].value_counts().sort_index()\nprint(by_week.head())\n';
      }
    }
    return slide;
  }
  function pasteTarget(slide) {
    if (!slide || !slide.type) return null;
    var type2 = String(slide.type);
    if (type2 === "gallery") return { field: "layer", become: "gallery" };
    if (["image", "split", "introduction", "keyfact", "quote"].indexOf(type2) >= 0) {
      return { field: "image", become: type2 };
    }
    var lines = (slide.bullets || []).filter(function(b) {
      return String(b).trim();
    }).length;
    if (lines && BULLET_LAYOUTS.indexOf(type2) >= 0) return { field: "image", become: "split" };
    if (["title", "section", "content", "cards", "keywords", "italics"].indexOf(type2) >= 0) {
      return { field: "image", become: "image" };
    }
    return null;
  }
  function imagePlacement(slide) {
    var p = slide.design && slide.design.placement;
    return p === "top" || p === "bottom" ? p : slide.imageSide === "left" ? "left" : "right";
  }
  function setImagePlacement(slide, placement) {
    if (!["left", "right", "top", "bottom"].includes(placement)) return;
    if (!slide.design || typeof slide.design !== "object") slide.design = {};
    slide.design.placement = placement === "top" || placement === "bottom" ? placement : "side";
    if (placement === "left" || placement === "right") slide.imageSide = placement;
  }
  function swapImagePlacement(slide) {
    setImagePlacement(slide, { left: "right", right: "left", top: "bottom", bottom: "top" }[imagePlacement(slide)]);
  }
  function slideSteps(slide) {
    if (slide.type === "table") {
      var rows2 = parseTable(slide.body), start = slide.tableHeader !== false && rows2.length > 1 ? 1 : 0;
      return rows2.slice(start).map(function(r) {
        return r.join(" · ");
      });
    }
    if (slide.type === "quote") {
      return String(slide.body || "").split(/\n/).map(function(l) {
        return l.trim();
      }).filter(Boolean);
    }
    if (slide.type === "explain") {
      return String(slide.body || "").split(/\n{2,}/).map(function(l) {
        return l.trim();
      }).filter(Boolean);
    }
    if (slide.type === "chart") {
      var cd = chartData(slide);
      if (!cd.series.length) return [];
      if (cd.series.length > 1) return cd.series.map(function(x) {
        return x.name;
      });
      return cd.categories.slice();
    }
    if (slide.type === "gallery") {
      return (slide.layers || []).filter(function(l) {
        return l && l.image;
      }).map(function(l, i) {
        return String(l.caption || "").trim() || "Image " + (i + 1);
      });
    }
    if (slide.type === "code") {
      return String(slide.code || slide.body || "").split(/\n/).filter(function(l) {
        return l.length;
      });
    }
    if (["journey", "mindmap", "content", "cards", "split", "keywords", "italics"].concat(INFO_LAYOUTS).indexOf(slide.type) < 0) return [];
    return (slide.bullets || []).filter(function(b) {
      return String(b).trim();
    }).map(function(b) {
      if (INFO_LAYOUTS.indexOf(slide.type) >= 0) {
        var q = parseInfoLine(b);
        return [q.label, q.value, q.note].filter(Boolean).join(" · ");
      }
      if (slide.type === "journey" || slide.type === "mindmap" || slide.type === "keywords" || slide.type === "italics") {
        var p = parseKeywordLine(b);
        return [p.term, p.def].filter(Boolean).join(" — ");
      }
      return String(b).replace(/^(\s{2,}|\t|- )+/, "").trim();
    });
  }
  function slideExcerpt(slide, revealed) {
    if (slide.type === "chart" && slide.exploration && slide.exploration.prediction) return slide.exploration.prompt;
    if (["beforeafter", "explore", "simulation"].includes(slide.type)) return slide.title || "";
    if (slide.type === "quiz") return slide.question || "";
    if (slide.type === "code") {
      var src = String(slide.code || slide.body || "");
      if (slide.typewrite !== false && Number.isFinite(revealed)) return src.slice(0, Math.max(0, revealed));
      return src;
    }
    var steps = slideSteps(slide);
    if (steps.length || ["content", "cards", "split", "keywords", "italics", "table", "quote", "explain"].includes(slide.type)) {
      var n = slide.progressive === true && Number.isFinite(revealed) ? Math.max(0, revealed) : steps.length;
      var visible = steps.slice(0, n);
      if (slide.type === "table") {
        var rows2 = parseTable(slide.body);
        if (slide.tableHeader !== false && rows2.length > 1) visible.unshift(rows2[0].join(" · "));
      }
      return visible.join("\n");
    }
    if (slide.type === "links") return (slide.bullets || []).map(function(b) {
      var p = parseKeywordLine(b);
      return [p.term, p.def].filter(Boolean).join(" — ");
    }).join("\n");
    if (slide.type === "title" || slide.type === "section") return slide.subtitle || "";
    return "";
  }
  function questionTimeLimit(slide, teacherEntry) {
    return teacherEntry ? 0 : Math.max(0, Number(slide.timeLimit) || 0);
  }
  function correctAnswerLabel(slide) {
    if (slide.input === "text" || slide.input === "number") return String(slide.answer || "");
    return ("ABCDEF"[slide.correct] || "?") + " — " + ((slide.options || [])[slide.correct] || "");
  }

  // src/deck/feedback.js
  var FEEDBACK_KINDS = {
    poll: {
      key: "poll",
      label: "Poll",
      icon: "▤",
      blurb: "Fixed options. Results appear as bars in the rail.",
      needsOptions: true
    },
    wordcloud: {
      key: "wordcloud",
      label: "Word cloud",
      icon: "❋",
      blurb: "A word or short phrase each. Repeats grow larger.",
      needsOptions: false
    },
    brainstorm: {
      key: "brainstorm",
      label: "Brainstorm",
      icon: "✎",
      blurb: "Longer contributions, listed newest first with names.",
      needsOptions: false
    },
    /* A scale is a poll over a fixed run of points, so on the wire it is one:
       the room picks an index and the relay counts indices, unchanged. What
       makes it a scale is that the points are ordered, which is why it gets a
       mean and a distribution rather than a set of independent bars. */
    scale: {
      key: "scale",
      label: "Scale",
      icon: "≋",
      blurb: "One end to the other. Shows the spread and the average.",
      needsOptions: false,
      graded: true
    }
  };
  var SCALE_POINTS = [3, 4, 5, 6, 7];
  function scaleLabels(f) {
    var n = Math.max(3, Math.min(7, Number(f.points) || 5));
    var out = [];
    for (var i = 0; i < n; i++) out.push(String(i + 1));
    return out;
  }
  function isFeedbackKind(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(FEEDBACK_KINDS, value);
  }
  function makeFeedback(kind) {
    var f = {
      kind: isFeedbackKind(kind) ? kind : "poll",
      prompt: "",
      options: kind === "poll" || !kind ? ["Yes", "No", "Not sure"] : [],
      max: 1,
      // submissions allowed per person
      presentAs: "rail"
      // 'rail' beside the slide · 'focus' full screen when presenting
    };
    if (f.kind === "scale") {
      f.points = 5;
      f.lowLabel = "Not at all";
      f.highLabel = "Completely";
    }
    return f;
  }
  function normalizeFeedback(raw) {
    if (!raw || !raw.kind || !FEEDBACK_KINDS[raw.kind]) return null;
    var f = {
      kind: raw.kind,
      prompt: String(raw.prompt || ""),
      options: (
        /** @type {string[]} */
        []
      ),
      max: Math.max(1, Math.min(5, Number(raw.max) || 1)),
      presentAs: raw.presentAs === "focus" ? "focus" : "rail"
    };
    if (FEEDBACK_KINDS[f.kind].needsOptions) {
      f.options = (Array.isArray(raw.options) ? raw.options : []).map(function(o) {
        return String(o == null ? "" : o);
      }).slice(0, 6);
      while (f.options.length < 2) f.options.push("");
      f.max = 1;
    }
    if (f.kind === "scale") {
      f.points = SCALE_POINTS.indexOf(Number(raw.points)) > -1 ? Number(raw.points) : 5;
      f.lowLabel = String(raw.lowLabel == null ? "Not at all" : raw.lowLabel).slice(0, 40);
      f.highLabel = String(raw.highLabel == null ? "Completely" : raw.highLabel).slice(0, 40);
      f.max = 1;
    }
    return f;
  }
  function slideFeedback(slide) {
    var f = slide && slide.feedback;
    if (!f || !f.kind) return null;
    if (!String(f.prompt || "").trim()) return null;
    if (FEEDBACK_KINDS[f.kind].needsOptions && f.options.filter(function(o) {
      return String(o).trim();
    }).length < 2) {
      return null;
    }
    if (f.kind === "scale" && !(String(f.lowLabel || "").trim() && String(f.highLabel || "").trim())) {
      return null;
    }
    return f;
  }
  function sampleFeedbackDigest(f) {
    if (!f || !f.kind) return null;
    if (f.kind === "poll") {
      var live = (f.options || []).filter(function(o) {
        return String(o).trim();
      });
      var weights = [7, 11, 4, 2, 5, 1];
      var counts = live.map(function(_, i) {
        return weights[i % weights.length];
      });
      var total = counts.reduce(function(a, b) {
        return a + b;
      }, 0);
      return { kind: "poll", counts, total, answered: total, players: total, sample: true };
    }
    if (f.kind === "scale") {
      var shape = {
        3: [2, 5, 9],
        4: [2, 3, 7, 5],
        5: [1, 2, 4, 7, 3],
        6: [1, 2, 3, 6, 4, 2],
        7: [1, 1, 2, 4, 6, 3, 1]
      };
      var bars = shape[f.points || 5] || shape[5];
      var seen = bars.reduce(function(a, b) {
        return a + b;
      }, 0);
      return {
        kind: "scale",
        counts: bars,
        total: seen,
        answered: seen,
        players: seen + 3,
        sample: true
      };
    }
    if (f.kind === "wordcloud") {
      return {
        kind: "wordcloud",
        words: [
          { text: "useful", n: 6 },
          { text: "tricky", n: 4 },
          { text: "clear", n: 3 },
          { text: "fast", n: 2 },
          { text: "dense", n: 2 },
          { text: "new", n: 1 },
          { text: "daunting", n: 1 },
          { text: "fair", n: 1 }
        ],
        total: 20,
        unique: 8,
        answered: 14,
        players: 18,
        sample: true
      };
    }
    return {
      kind: "brainstorm",
      items: [
        { name: "Ana", text: "More worked examples in the seminars" },
        { name: "Ben", text: "A past paper walkthrough before the deadline" },
        { name: "Priya", text: "Share the slides the night before" },
        { name: "Tom", text: "Shorter reading list, more depth on each" }
      ],
      total: 4,
      answered: 4,
      players: 18,
      sample: true
    };
  }

  // src/games/choice.js
  var coreStyles = {
    choice: {
      key: "choice",
      label: "Multiple choice",
      icon: "?",
      blurb: "Two to six answers, one of them correct.",
      mechanic: "points",
      input: "choice",
      minOptions: 2,
      maxOptions: 6,
      fixedOptions: null,
      make: function() {
        return {
          question: "Which of these is correct?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correct: 0
        };
      },
      normalize: function(q) {
        if (!Array.isArray(q.options)) q.options = [];
        q.options = q.options.map(function(o) {
          return typeof o === "string" ? o : o && o.text || "";
        }).slice(0, 6);
        while (q.options.length < 2) q.options.push("");
        q.correct = Math.max(0, Math.min(q.options.length - 1, Number(q.correct) || 0));
        if (Array.isArray(q.misconceptions)) {
          q.misconceptions = q.options.map(function(_, i) {
            return String(q.misconceptions[i] == null ? "" : q.misconceptions[i]).slice(0, 120).trim();
          });
          if (!q.misconceptions.some(Boolean)) delete q.misconceptions;
        } else {
          delete q.misconceptions;
        }
        return q;
      },
      problems: function(q, n) {
        var opts = Array.isArray(q.options) ? q.options : [];
        var live = opts.filter(function(o) {
          return String(o).trim();
        });
        if (!String(q.question || "").trim()) return "Q" + n + " has no question text";
        if (live.length < 2) return "Q" + n + " needs at least two answers";
        if (!String(opts[q.correct] || "").trim()) {
          return "Q" + n + " has no correct answer marked";
        }
        return null;
      },
      /* Everything a question of this style contributes to its slide. */
      compile: function(q, settings, s) {
        s.question = q.question;
        var kept = [];
        s.options = q.options.filter(function(o, i) {
          var live = !!String(o).trim();
          if (live) kept.push(i);
          return live;
        });
        s.correct = Math.max(0, Math.min(s.options.length - 1, q.correct));
        if (Array.isArray(q.misconceptions) && q.misconceptions.some(Boolean)) {
          var labels = [];
          for (var k = 0; k < kept.length; k++) labels.push(q.misconceptions[kept[k]] || "");
          s.misconceptions = labels;
        }
      },
      mark: function(s, response) {
        return Number.isInteger(response) && response === s.correct;
      },
      /* One line about the question, for the editor's list of them. */
      summary: function(q) {
        var live = (q.options || []).filter(function(o) {
          return String(o).trim();
        });
        return live.length + " answers";
      }
    },
    truefalse: {
      key: "truefalse",
      label: "True or false",
      icon: "½",
      blurb: "A statement the room marks true or false.",
      mechanic: "points",
      input: "choice",
      minOptions: 2,
      maxOptions: 2,
      fixedOptions: ["True", "False"],
      make: function() {
        return {
          question: "A statement that is either true or false.",
          options: ["True", "False"],
          correct: 0
        };
      },
      normalize: function(q) {
        q.options = ["True", "False"];
        q.correct = Number(q.correct) === 1 ? 1 : 0;
        return q;
      },
      problems: function(q, n) {
        if (!String(q.question || "").trim()) return "Q" + n + " has no statement";
        return null;
      },
      compile: function(q, settings, s) {
        s.options = ["True", "False"];
        s.correct = q.correct === 1 ? 1 : 0;
        s.question = q.question;
      },
      mark: function(s, response) {
        return Number.isInteger(response) && response === s.correct;
      },
      summary: function(q) {
        return q.correct === 1 ? "False" : "True";
      }
    }
  };
  var choice2 = coreStyles.choice;
  var truefalse = coreStyles.truefalse;

  // src/games/race.js
  var race = {
    key: "race",
    label: "Horse race",
    icon: "🏇",
    blurb: "Multiple choice, but every right answer moves your team a step along the track. First past the post wins.",
    mechanic: "race",
    input: "choice",
    minOptions: 2,
    maxOptions: 6,
    fixedOptions: null,
    make: function() {
      return choice2.make();
    },
    normalize: function(q) {
      return choice2.normalize(q);
    },
    problems: function(q, n) {
      return choice2.problems(q, n);
    },
    compile: function(q, st, s) {
      choice2.compile(q, st, s);
    },
    mark: function(s, response) {
      return choice2.mark(s, response);
    },
    summary: function(q) {
      return choice2.summary(q);
    }
  };

  // src/games/speed.js
  var speed = {
    defaults: {
      "defaultTime": 60,
      "defaultPoints": 0,
      "confidence": false
    },
    key: "speed",
    label: "Beat the clock",
    icon: "◷",
    blurb: "Multiple choice against the countdown. Faster correct answers score more; wrong answers cost points.",
    mechanic: "speed",
    input: "choice",
    minOptions: 2,
    maxOptions: 6,
    fixedOptions: null,
    make: function() {
      var q = choice2.make();
      q.question = "Which answer is right — and fast?";
      return q;
    },
    normalize: function(q) {
      return choice2.normalize(q);
    },
    problems: function(q, n) {
      return choice2.problems(q, n);
    },
    compile: function(q, st, s) {
      choice2.compile(q, st, s);
    },
    mark: function(s, response) {
      return choice2.mark(s, response);
    },
    summary: function(q) {
      return choice2.summary(q);
    }
  };
  function speedPoints(right, remainingSec) {
    if (right) return 10 + Math.floor(Math.max(0, Number(remainingSec) || 0) / 10);
    return -5;
  }

  // src/samples/boss.json
  var boss_default = [
    {
      question: "Which organelle contains chlorophyll?",
      options: ["Nucleus", "Mitochondrion", "Chloroplast", "Ribosome"],
      correct: 2,
      difficulty: "easy",
      explanation: "Chloroplasts. An easy hit — 1 damage."
    },
    {
      question: "Which process releases energy from glucose?",
      options: ["Photosynthesis", "Respiration", "Diffusion", "Osmosis"],
      correct: 1,
      difficulty: "medium",
      explanation: "Respiration. A medium hit — 2 damage."
    },
    {
      question: "Why does an enzyme stop working above its optimum temperature?",
      options: ["It dissolves", "Its active site changes shape", "It runs out", "It freezes"],
      correct: 1,
      difficulty: "hard",
      explanation: "It denatures — the active site changes shape. A hard hit — 3 damage."
    },
    {
      question: "Explain why water moves into a cell placed in pure water.",
      options: [
        "Active transport",
        "Osmosis down a water potential gradient",
        "Diffusion of solutes",
        "It does not move"
      ],
      correct: 1,
      difficulty: "boss",
      explanation: "Osmosis, down a water potential gradient. The boss blow — 5 damage."
    }
  ];

  // src/games/boss.js
  var starters = (
    /** @type {Array<Partial<import("../types.js").Question>>} */
    /** @type {unknown} */
    boss_default
  );
  var BOSS_DAMAGE = { easy: 1, medium: 2, hard: 3, boss: 5 };
  var BOSS_LEVELS = ["easy", "medium", "hard", "boss"];
  function bossDamage(difficulty) {
    return BOSS_DAMAGE[difficulty] || BOSS_DAMAGE.medium;
  }
  function bossMaxHp(questions) {
    return (questions || []).reduce(function(n, q) {
      return n + bossDamage(q && q.difficulty);
    }, 0);
  }
  var boss = {
    /* One of each rung, so the boss starts on 11 HP and the damage ladder is
         visible before a word is rewritten.
    
         A single medium question gave the boss 2 HP and a right answer deals 2,
         so the boss died to the first answer — the format demonstrating the
         opposite of what it is for. Nothing flagged it: a one-question boss game
         is perfectly valid, it just is not a battle. */
    starters,
    defaults: {
      "defaultTime": 30,
      "confidence": false
    },
    key: "boss",
    label: "Boss battle",
    icon: "▲",
    blurb: "Multiple choice against a shared boss. Correct hits deal damage; bring HP to zero before the questions run out.",
    mechanic: "boss",
    input: "choice",
    minOptions: 2,
    maxOptions: 6,
    fixedOptions: null,
    make: function() {
      var q = choice2.make();
      q.question = "Strike the boss — which answer is right?";
      q.difficulty = "medium";
      return q;
    },
    normalize: function(q) {
      choice2.normalize(q);
      q.difficulty = BOSS_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : "medium";
      return q;
    },
    problems: function(q, n) {
      return choice2.problems(q, n);
    },
    compile: function(q, st, s) {
      choice2.compile(q, st, s);
      s.difficulty = q.difficulty;
      s.bossDamage = bossDamage(q.difficulty);
    },
    mark: function(s, response) {
      return choice2.mark(s, response);
    },
    summary: function(q) {
      return choice2.summary(q) + " · " + (q.difficulty || "medium") + " (" + bossDamage(q.difficulty) + " dmg)";
    }
  };

  // src/games/marking.js
  function normalizeAnswer(text2) {
    var t = String(text2 == null ? "" : text2);
    if (t.normalize) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
    t = t.toLowerCase().replace(/[‘’‛]/g, "'").replace(/[^a-z0-9'\s]+/g, " ").replace(/'/g, "").replace(/\s+/g, " ").trim();
    return t.replace(/^(?:the|a|an)\s+/, "");
  }
  function numeric(text2) {
    var t = String(text2 == null ? "" : text2).trim().replace(/[,\s]/g, "");
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function withUnit(text2, unit) {
    unit = String(unit == null ? "" : unit).trim();
    if (!unit) return text2;
    return /^[%°]/.test(unit) ? text2 + unit : text2 + " " + unit;
  }
  function formatValue(value, unit) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "";
    return withUnit(String(Math.round(n * 1e3) / 1e3), unit);
  }
  function editDistance(a, b) {
    if (a === b) return 0;
    if (!a.length || !b.length) return Math.max(a.length, b.length);
    if (Math.abs(a.length - b.length) > 2) return 3;
    var prev = [], row = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      row[0] = i;
      for (j = 1; j <= b.length; j++) {
        row[j] = Math.min(
          prev[j] + 1,
          row[j - 1] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
      }
      prev = row.slice();
    }
    return prev[b.length];
  }
  function typoAllowance(normalized, raw) {
    if (numeric(raw) != null || /\d/.test(normalized)) return 0;
    if (normalized.length >= 8) return 2;
    if (normalized.length >= 5) return 1;
    return 0;
  }
  function markTyped(accept, response, allowTypos) {
    var given = normalizeAnswer(response);
    var givenNum = numeric(response);
    var miss = (
      /** @type {{ right: boolean, matched: string | null, distance: number | null }} */
      {
        right: false,
        matched: null,
        distance: null
      }
    );
    if (!given) return miss;
    var list = (Array.isArray(accept) ? accept : [accept]).filter(function(a) {
      return String(a == null ? "" : a).trim();
    });
    var best = miss;
    for (var i = 0; i < list.length; i++) {
      var raw = String(list[i]);
      var want = normalizeAnswer(raw);
      if (!want) continue;
      if (given === want) return { right: true, matched: raw, distance: 0 };
      var wantNum = numeric(raw);
      if (givenNum != null && wantNum != null && givenNum === wantNum) {
        return { right: true, matched: raw, distance: 0 };
      }
      if (allowTypos === false) continue;
      var allowed = typoAllowance(want, raw);
      if (!allowed) continue;
      var d = editDistance(given, want);
      if (d <= allowed && (best.distance == null || d < best.distance)) {
        best = { right: true, matched: raw, distance: d };
      }
    }
    return best;
  }

  // src/games/slider.js
  var slider = {
    key: "slider",
    label: "Slider",
    icon: "↔",
    blurb: "Estimate a value on a line. Near enough counts.",
    mechanic: "points",
    input: "number",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "Estimate the value.",
        min: 0,
        max: 100,
        step: 1,
        target: 50,
        tolerance: 5,
        unit: ""
      };
    },
    normalize: function(q) {
      var num = function(v, fallback) {
        var n = Number(v);
        return Number.isFinite(n) ? n : fallback;
      };
      q.min = num(q.min, 0);
      q.max = num(q.max, 100);
      if (q.max <= q.min) q.max = q.min + 100;
      q.step = Math.max(0, num(q.step, 1));
      if (!q.step) q.step = 1;
      q.target = Math.min(q.max, Math.max(q.min, num(q.target, (q.min + q.max) / 2)));
      q.tolerance = Math.min(q.max - q.min, Math.max(0, num(q.tolerance, 0)));
      q.unit = String(q.unit == null ? "" : q.unit).slice(0, 12);
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.question || "").trim()) return "Q" + n + " has no question text";
      if (q.tolerance >= q.max - q.min) {
        return "Q" + n + " accepts the whole line — narrow the tolerance";
      }
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question;
      s.min = q.min;
      s.max = q.max;
      s.step = q.step;
      s.target = q.target;
      s.tolerance = q.tolerance;
      s.unit = q.unit;
      s.answer = formatValue(q.target, q.unit);
      s.options = [];
      s.correct = -1;
    },
    mark: function(s, response) {
      if (typeof response !== "number" || !Number.isFinite(response)) return false;
      if (typeof s.target !== "number" || typeof s.tolerance !== "number") return false;
      return Math.abs(response - s.target) <= s.tolerance;
    },
    summary: function(q) {
      var band = q.tolerance ? formatValue(q.target) + " ± " + formatValue(q.tolerance) : formatValue(q.target) + " exactly";
      return withUnit(band, q.unit);
    },
    describe: function(s, response) {
      return formatValue(response, s.unit);
    }
  };

  // src/games/type.js
  var type = {
    key: "type",
    label: "Type answer",
    icon: "Aa",
    blurb: "No options to choose from — the room types the answer from memory.",
    mechanic: "points",
    input: "text",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "What is the answer?",
        accept: [""],
        allowTypos: true
      };
    },
    normalize: function(q) {
      if (!Array.isArray(q.accept)) q.accept = [];
      q.accept = q.accept.map(function(a) {
        return String(a == null ? "" : a).slice(0, 200);
      }).slice(0, 8);
      if (!q.accept.some(function(a) {
        return a.trim();
      }) && Array.isArray(q.options)) {
        var carried = q.options[Number(q.correct) || 0];
        if (carried && String(carried).trim()) q.accept = [String(carried)];
      }
      if (!q.accept.length) q.accept = [""];
      q.allowTypos = q.allowTypos !== false;
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      var accept = Array.isArray(q.accept) ? q.accept : [];
      if (!String(q.question || "").trim()) return "Q" + n + " has no question text";
      if (!accept.some(function(a) {
        return String(a).trim();
      })) {
        return "Q" + n + " has no accepted answer";
      }
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question;
      s.accept = q.accept.filter(function(a) {
        return String(a).trim();
      });
      s.allowTypos = q.allowTypos !== false;
      s.answer = s.accept[0] || "";
      s.options = [];
      s.correct = -1;
    },
    mark: function(s, response) {
      if (typeof response !== "string") return false;
      return markTyped(s.accept, response, s.allowTypos).right;
    },
    summary: function(q) {
      var live = (q.accept || []).filter(function(a) {
        return String(a).trim();
      });
      if (!live.length) return "no answer set";
      return live.length > 1 ? live[0] + " +" + (live.length - 1) : live[0];
    },
    describe: function(s, response) {
      var hit = markTyped(s.accept, response, s.allowTypos);
      return hit.right ? hit.matched : String(response == null ? "" : response);
    }
  };

  // src/games/order.js
  var order = {
    defaults: {
      "defaultPoints": 10
    },
    key: "order",
    label: "Ranking",
    icon: "↕",
    blurb: "Put items in the right order. Part marks for the ones placed correctly.",
    mechanic: "points",
    input: "order",
    minOptions: 3,
    maxOptions: 8,
    make: function() {
      return {
        question: "Put these in order, first to last.",
        /* Authored in the correct order; the room is shown a shuffle. */
        options: ["First", "Second", "Third", "Fourth"],
        correct: 0
      };
    },
    normalize: function(q) {
      if (!Array.isArray(q.options)) q.options = [];
      q.options = q.options.map(function(o) {
        return typeof o === "string" ? o : o && o.text || "";
      }).slice(0, 8);
      while (q.options.length < 3) q.options.push("");
      return q;
    },
    problems: function(q, n) {
      var live = (q.options || []).filter(function(o) {
        return String(o).trim();
      });
      if (!String(q.question || "").trim()) return "Q" + n + " has no question text";
      if (live.length < 3) return "Q" + n + " needs at least three items to order";
      var seen = {};
      for (var i = 0; i < live.length; i++) {
        var k = live[i].trim().toLowerCase();
        if (seen[k]) return "Q" + n + ' has two items reading "' + live[i].trim() + '"';
        seen[k] = 1;
      }
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question;
      s.options = q.options.filter(function(o) {
        return String(o).trim();
      });
      s.correct = 0;
    },
    /* A response is an array of indices into s.options, in the learner's
       order. Right means every item in its authored place. */
    mark: function(s, response) {
      return orderScore(s, response) === 1;
    },
    summary: function(q) {
      var live = (q.options || []).filter(function(o) {
        return String(o).trim();
      });
      return live.length + " to order";
    },
    describe: function(s, response) {
      if (!Array.isArray(response)) return "";
      return response.map(function(i) {
        return (s.options || [])[i];
      }).filter(Boolean).join(" → ");
    }
  };
  function orderScore(slide, response) {
    var n = (slide.options || []).length;
    if (!n || !Array.isArray(response) || response.length !== n) return 0;
    var seen = {}, exact = 0;
    for (var i = 0; i < n; i++) {
      var v = response[i];
      if (!Number.isInteger(v) || v < 0 || v >= n || seen[v]) return 0;
      seen[v] = 1;
      if (v === i) exact++;
    }
    return exact / n;
  }
  function orderPoints(fractionOrSlide, response) {
    var frac = typeof fractionOrSlide === "number" ? fractionOrSlide : orderScore(fractionOrSlide, response);
    return Math.round(10 * Math.max(0, Math.min(1, Number(frac) || 0)));
  }

  // src/games/emoji.js
  function emojiCluePieces(text2) {
    var clueText = String(text2 || "");
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      return Array.from(
        new Intl.Segmenter(void 0, { granularity: "grapheme" }).segment(clueText),
        function(part) {
          return part.segment;
        }
      ).filter(function(part) {
        return part.trim();
      });
    }
    return Array.from(clueText).filter(function(part) {
      return part.trim();
    });
  }
  function emojiClueLayout(text2) {
    var clueText = String(text2 || "");
    var pieces = emojiCluePieces(clueText);
    var tiled = pieces.length > 0 && pieces.length <= 10 && !/[a-zA-Z0-9]/.test(clueText);
    return { tiled, pieces, text: clueText };
  }
  var EMOJI_LEVELS = ["easy", "medium", "hard"];
  function emojiHelp(slide) {
    var level = EMOJI_LEVELS.indexOf(slide.difficulty) > -1 ? slide.difficulty : "medium";
    return {
      hint: String(slide.hint == null ? "" : slide.hint).trim(),
      pattern: level === "easy" ? "shown" : level === "medium" ? "step" : "none"
    };
  }
  var emoji = {
    key: "emoji",
    label: "Emoji guess",
    icon: "☺",
    blurb: "Decode a concept from symbols. Release the letter pattern, then a hint, as the room gets stuck.",
    mechanic: "points",
    input: "text",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "🌱 ☀️ 💧 → 🌿",
        accept: ["photosynthesis"],
        hint: "How a plant makes its own food",
        difficulty: "medium",
        allowTypos: true
      };
    },
    normalize: function(q) {
      q.clues = String(q.clues == null ? q.question : q.clues).slice(0, 80);
      q.question = q.clues || "Emoji puzzle";
      q.hint = String(q.hint == null ? "" : q.hint).slice(0, 160);
      q.difficulty = EMOJI_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : "medium";
      if (!Array.isArray(q.accept)) q.accept = [];
      q.accept = q.accept.map(function(a) {
        return String(a == null ? "" : a).slice(0, 200);
      }).slice(0, 8);
      if (!q.accept.length) q.accept = [""];
      q.allowTypos = q.allowTypos !== false;
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.clues || "").trim()) return "Q" + n + " has no emoji clues";
      if (!q.accept.some(function(a) {
        return String(a).trim();
      })) {
        return "Q" + n + " has no accepted answer";
      }
      return null;
    },
    compile: function(q, settings, s) {
      s.clues = q.clues;
      s.question = q.clues;
      s.headPrompt = "What do these clues point to?";
      s.hint = q.hint;
      s.difficulty = q.difficulty;
      s.accept = q.accept.filter(function(a) {
        return String(a).trim();
      });
      s.allowTypos = q.allowTypos !== false;
      s.answer = s.accept[0] || "";
      s.options = [];
      s.correct = -1;
      s.hideAnswerUntilReveal = true;
    },
    mark: function(s, response) {
      if (typeof response !== "string") return false;
      return markTyped(s.accept, response, s.allowTypos).right;
    },
    summary: function(q) {
      var live = (q.accept || []).filter(function(a) {
        return String(a).trim();
      });
      var help = { easy: "pattern shown", medium: "pattern on request", hard: "no pattern" }[q.difficulty] || "pattern on request";
      return (live[0] || "no answer set") + " · " + help;
    },
    describe: type.describe
  };

  // src/samples/definition.json
  var definition_default = [
    {
      passage: "A catalyst speeds up a reaction by lowering the activation energy. It is not consumed, so the same catalyst can work again and again.",
      question: "What is not used up in the reaction?",
      accept: [
        "the catalyst",
        "catalyst"
      ],
      explanation: "Not being consumed is the defining property — it is why a small amount goes a long way."
    },
    {
      passage: "Osmosis is the diffusion of water across a partially permeable membrane, from a dilute solution to a more concentrated one.",
      question: "What substance moves in osmosis?",
      accept: [
        "water"
      ],
      explanation: "Only water moves through the membrane in osmosis."
    },
    {
      passage: "RAM is volatile memory: it stores data the CPU is using right now, and that data is lost when power is removed.",
      question: "What happens to data in RAM when the computer is switched off?",
      accept: [
        "it is lost",
        "lost",
        "it disappears",
        "cleared",
        "it is cleared"
      ],
      explanation: "Volatile means the contents vanish without power."
    }
  ];

  // src/games/definition.js
  var DEFINITION_TIMES = [20, 30, 45, 60];
  function clampDefinitionSeconds(n) {
    n = Number(n);
    return DEFINITION_TIMES.indexOf(n) > -1 ? n : 30;
  }
  function splitDefinitionPassage(text2) {
    var t = String(text2 || "").trim();
    if (!t) return { passage: "", question: "" };
    var quoted = t.match(/"([^"]+)"/);
    if (quoted) {
      var after = t.slice(t.indexOf(quoted[0]) + quoted[0].length).replace(/^\s+/, "");
      return {
        passage: quoted[1].trim(),
        question: after.replace(/^[\s\n]+/, "") || "What did you just read?"
      };
    }
    var parts = t.split(/\n\n+/).map(function(p) {
      return p.trim();
    }).filter(Boolean);
    if (parts.length >= 2) {
      var last = parts[parts.length - 1];
      var body = parts.slice(0, -1);
      if (/^read this/i.test(body[0]) && body.length > 1) body = body.slice(1);
      return { passage: body.join("\n\n"), question: last };
    }
    return { passage: t, question: "What did you just read?" };
  }
  function definitionCreate(seconds) {
    return { phase: "reading", seconds: clampDefinitionSeconds(seconds) };
  }
  function definitionTransition(state, action) {
    var s = Object.assign({}, state || definitionCreate(30));
    if (action === "restart") return definitionCreate(s.seconds);
    if ((action === "ask" || action === "expire") && s.phase === "reading") {
      s.phase = "asking";
    }
    return s;
  }
  var definition = {
    defaults: {
      "defaultTime": 30,
      "defaultPoints": 1,
      "confidence": false
    },
    starters: definition_default,
    key: "definition",
    label: "Definition challenge",
    icon: "¶",
    blurb: "Read a short passage, then answer from memory once it clears.",
    mechanic: "points",
    input: "text",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        passage: "A catalyst speeds up a reaction by lowering the activation energy. It is not consumed, so the same catalyst can work again and again.",
        question: "What is not used up in the reaction?",
        accept: ["the catalyst", "catalyst"],
        allowTypos: true
      };
    },
    normalize: function(q) {
      var passage = String(q.passage == null ? "" : q.passage).slice(0, 1200);
      var question = String(q.question == null ? "" : q.question).slice(0, 400);
      if (!String(passage).trim() && String(question).trim()) {
        var split = splitDefinitionPassage(question);
        passage = split.passage;
        question = split.question;
      }
      q.passage = passage;
      q.question = question || "What did you just read?";
      if (!Array.isArray(q.accept)) q.accept = [];
      q.accept = q.accept.map(function(a) {
        return String(a == null ? "" : a).slice(0, 200);
      }).slice(0, 8);
      if (!q.accept.some(function(a) {
        return a.trim();
      }) && Array.isArray(q.options)) {
        var carried = q.options[Number(q.correct) || 0];
        if (carried && String(carried).trim()) q.accept = [String(carried)];
      }
      if (!q.accept.length) q.accept = [""];
      q.allowTypos = q.allowTypos !== false;
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.passage || "").trim()) return "Q" + n + " has no passage to read";
      if (!String(q.question || "").trim()) return "Q" + n + " has no recall question";
      if (!q.accept.some(function(a) {
        return String(a).trim();
      })) {
        return "Q" + n + " has no accepted answer";
      }
      return null;
    },
    board: function(game) {
      var n = (game.questions || []).length;
      if (n < 3) return "needs at least 3 challenges and this has " + n;
      if (n > 20) return "can have at most 20 challenges and this has " + n;
      return null;
    },
    compile: function(q, settings, s) {
      s.passage = String(q.passage || "").trim();
      s.question = String(q.question || "").trim();
      s.headPrompt = s.question;
      s.accept = q.accept.filter(function(a) {
        return String(a).trim();
      });
      s.allowTypos = q.allowTypos !== false;
      s.answer = s.accept[0] || "";
      s.options = [];
      s.correct = -1;
      s.hideAnswerUntilReveal = true;
      s.definitionChallenge = true;
    },
    mark: function(s, response) {
      if (typeof response !== "string") return false;
      return markTyped(s.accept, response, s.allowTypos).right;
    },
    summary: function(q) {
      var live = (q.accept || []).filter(function(a) {
        return String(a).trim();
      });
      var tip = (String(q.passage || "").trim().slice(0, 40) || "passage") + (String(q.passage || "").trim().length > 40 ? "…" : "");
      return tip + " · " + (live[0] || "no answer set");
    },
    describe: type.describe
  };

  // src/samples/compare.json
  var compare_default = [
    {
      itemA: "Photosynthesis",
      itemB: "Respiration",
      similarities: "Both involve energy and gases moving in living cells.",
      differences: "Photosynthesis stores energy in glucose; respiration releases it.",
      category: "Science"
    },
    {
      itemA: "RAM",
      itemB: "SSD",
      similarities: "Both store data the computer uses.",
      differences: "RAM is volatile and fast for working memory; an SSD keeps files when power is off.",
      category: "ICT"
    },
    {
      itemA: "Democracy",
      itemB: "Dictatorship",
      similarities: "Both are ways a state can be governed.",
      differences: "In a democracy power is shared through voting; in a dictatorship one person or clique holds it.",
      category: "History"
    },
    {
      itemA: "Metaphor",
      itemB: "Simile",
      similarities: "Both compare one thing to another in writing.",
      differences: "A simile uses like or as; a metaphor says something is something else.",
      category: "Literature"
    }
  ];

  // src/games/compare.js
  var compare = {
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    starters: compare_default,
    key: "compare",
    label: "Compare & contrast",
    icon: "⇄",
    blurb: "Two items side by side. Discuss similarities and differences — then reveal the prepared points. No score.",
    mechanic: "points",
    input: "choice",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "Compare these two — how are they alike, and how do they differ?",
        itemA: "Photosynthesis",
        itemB: "Respiration",
        similarities: "Both involve energy and gases moving in living cells.",
        differences: "Photosynthesis stores energy in glucose; respiration releases it.",
        category: "",
        options: [],
        correct: -1
      };
    },
    normalize: function(q) {
      q.itemA = String(q.itemA == null ? "" : q.itemA).slice(0, 80);
      q.itemB = String(q.itemB == null ? "" : q.itemB).slice(0, 80);
      q.similarities = String(q.similarities == null ? "" : q.similarities).slice(0, 600);
      q.differences = String(q.differences == null ? "" : q.differences).slice(0, 600);
      q.category = String(q.category == null ? "" : q.category).slice(0, 40);
      if (!String(q.question || "").trim()) {
        q.question = "Compare these two — how are they alike, and how do they differ?";
      }
      q.question = String(q.question).slice(0, 280);
      q.options = [];
      q.correct = -1;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.itemA || "").trim() || !String(q.itemB || "").trim()) {
        return "Q" + n + " needs Item A and Item B";
      }
      if (String(q.itemA).trim().toLowerCase() === String(q.itemB).trim().toLowerCase()) {
        return "Q" + n + " needs two different items";
      }
      if (!String(q.similarities || "").trim()) {
        return "Q" + n + " needs similarities for the reveal";
      }
      if (!String(q.differences || "").trim()) {
        return "Q" + n + " needs differences for the reveal";
      }
      return null;
    },
    board: function(game) {
      var n = (game.questions || []).length;
      if (n < 3) return "needs at least 3 comparisons and this has " + n;
      if (n > 10) return "can have at most 10 comparisons and this has " + n;
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question || "Compare these two — how are they alike, and how do they differ?";
      s.headPrompt = s.question;
      s.itemA = String(q.itemA || "").trim();
      s.itemB = String(q.itemB || "").trim();
      s.similarities = String(q.similarities || "").trim();
      s.differences = String(q.differences || "").trim();
      s.category = String(q.category || "").trim();
      s.options = [];
      s.correct = -1;
      s.points = 0;
      s.voteOnly = true;
      s.hideAnswerUntilReveal = true;
      s.compareDiscuss = true;
      s.timeLimit = 0;
    },
    mark: function() {
      return false;
    },
    summary: function(q) {
      return (q.itemA || "?") + " · " + (q.itemB || "?");
    }
  };

  // src/samples/oddone.json
  var oddone_default = [
    {
      options: [
        "Iron",
        "Copper",
        "Oxygen",
        "Zinc"
      ],
      correct: 2,
      explanation: "Oxygen is a non-metal. Accept any defensible rule a learner can argue for — the reasoning is the point."
    },
    {
      options: [
        "Mitochondrion",
        "Chloroplast",
        "Nucleus",
        "Ribosome"
      ],
      correct: 1,
      explanation: "Chloroplasts are for photosynthesis; the others appear in typical animal cells too. Other rules may also work."
    },
    {
      options: [
        "Photosynthesis",
        "Respiration",
        "Diffusion",
        "Osmosis"
      ],
      correct: 0,
      explanation: "Photosynthesis builds glucose; the others move substances or release energy. Defend another grouping if you can."
    },
    {
      options: [
        "CPU",
        "RAM",
        "SSD",
        "HDMI"
      ],
      correct: 3,
      explanation: "HDMI is a display connection; the others are core computer components. Other rules welcome."
    }
  ];

  // src/games/oddone.js
  var oddone = {
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    starters: oddone_default,
    key: "oddone",
    label: "Odd one out",
    icon: "◇",
    blurb: "Four equal items. Discuss which does not belong and why — then reveal the prepared rationale. No score.",
    mechanic: "points",
    input: "choice",
    minOptions: 4,
    maxOptions: 4,
    fixedOptions: null,
    make: function() {
      return {
        question: "Which is the odd one out — and what is the rule?",
        options: ["Iron", "Copper", "Oxygen", "Zinc"],
        correct: 2,
        explanation: "Oxygen is a non-metal. Accept any defensible rule a learner can argue for — the reasoning is the point."
      };
    },
    normalize: function(q) {
      if (!Array.isArray(q.options)) q.options = [];
      q.options = q.options.map(function(o) {
        return typeof o === "string" ? o : o && o.text || "";
      }).slice(0, 4);
      while (q.options.length < 4) q.options.push("");
      q.correct = Math.max(0, Math.min(3, Number(q.correct) || 0));
      if (!String(q.question || "").trim()) {
        q.question = "Which is the odd one out — and what is the rule?";
      }
      q.question = String(q.question).slice(0, 280);
      return q;
    },
    problems: function(q, n) {
      var live = (q.options || []).filter(function(o) {
        return String(o).trim();
      });
      if (live.length < 4) return "Q" + n + " needs four items";
      if (!String(q.options[q.correct] || "").trim()) {
        return "Q" + n + " has no odd one marked";
      }
      var seen = {};
      for (var i = 0; i < 4; i++) {
        var k = String(q.options[i] || "").trim().toLowerCase();
        if (!k) return "Q" + n + " needs four items";
        if (seen[k]) return "Q" + n + ' has two items reading "' + q.options[i].trim() + '"';
        seen[k] = 1;
      }
      if (!String(q.explanation || "").trim()) {
        return "Q" + n + " needs an explanation for the reveal";
      }
      return null;
    },
    board: function(game) {
      var n = (game.questions || []).length;
      if (n < 3) return "needs at least 3 sets and this has " + n;
      if (n > 10) return "can have at most 10 sets and this has " + n;
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question || "Which is the odd one out — and what is the rule?";
      s.headPrompt = s.question;
      s.options = q.options.map(function(o) {
        return String(o).trim();
      }).slice(0, 4);
      s.correct = Math.max(0, Math.min(3, Number(q.correct) || 0));
      s.points = 0;
      s.voteOnly = true;
      s.hideAnswerUntilReveal = true;
      s.oddoneDiscuss = true;
      s.timeLimit = 0;
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === s.correct;
    },
    summary: function(q) {
      var odd = String((q.options || [])[q.correct] || "").trim();
      return (odd || "odd one") + " · discuss";
    }
  };

  // src/games/wordreveal.js
  var WR_LEVELS = ["easy", "medium", "hard"];
  var WR_DRIP = [3, 5, 10, 15];
  function wordRevealPreFraction(difficulty) {
    if (difficulty === "easy") return 0.6;
    if (difficulty === "medium") return 0.4;
    return 0;
  }
  function wordRevealPoints(fractionRevealed) {
    var f = Math.max(0, Math.min(1, Number(fractionRevealed) || 0));
    if (f < 0.5) return 100;
    if (f < 0.75) return 75;
    return 50;
  }
  function wordRevealMask(word, shownCount) {
    var chars = String(word || "").split("");
    var letterIdx = [];
    chars.forEach(function(ch, i2) {
      if (/\S/.test(ch)) letterIdx.push(i2);
    });
    var n = Math.max(0, Math.min(letterIdx.length, Number(shownCount) || 0));
    var open = {};
    for (var i = 0; i < n; i++) open[letterIdx[i]] = 1;
    return chars.map(function(ch, i2) {
      if (!/\S/.test(ch)) return ch;
      return open[i2] ? ch : "_";
    }).join("");
  }
  function wordRevealLetterCount(word) {
    return String(word || "").replace(/\s/g, "").length;
  }
  var wordreveal = {
    defaults: {
      "defaultTime": 0,
      "defaultPoints": 0,
      "confidence": false
    },
    key: "wordreveal",
    label: "Word reveal",
    icon: "…",
    blurb: "Guess the word as letters drip in. Earlier guesses score more.",
    mechanic: "wordreveal",
    input: "text",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "What word is being revealed?",
        word: "PHOTOSYNTHESIS",
        hint: "How plants make food",
        accept: ["photosynthesis"],
        allowTypos: true,
        difficulty: "medium",
        dripInterval: 5
      };
    },
    normalize: function(q) {
      q.word = String(q.word == null ? "" : q.word).slice(0, 40);
      q.hint = String(q.hint == null ? "" : q.hint).slice(0, 120);
      q.difficulty = WR_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : "medium";
      var drip = Number(q.dripInterval);
      q.dripInterval = WR_DRIP.indexOf(drip) > -1 ? drip : 5;
      if (!Array.isArray(q.accept)) q.accept = [];
      q.accept = q.accept.map(function(a) {
        return String(a == null ? "" : a).slice(0, 200);
      }).slice(0, 8);
      if (!q.accept.some(function(a) {
        return String(a).trim();
      }) && q.word.trim()) {
        q.accept = [q.word.trim()];
      }
      if (!q.accept.length) q.accept = [""];
      q.allowTypos = q.allowTypos !== false;
      if (!String(q.question || "").trim()) {
        q.question = q.hint ? q.hint : "What word is being revealed?";
      }
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.word || "").trim()) return "Q" + n + " needs a word to reveal";
      if (!q.accept.some(function(a) {
        return String(a).trim();
      })) {
        return "Q" + n + " has no accepted answer";
      }
      return null;
    },
    compile: function(q, settings, s) {
      s.question = q.question;
      s.word = q.word.trim();
      s.hint = q.hint;
      s.accept = q.accept.filter(function(a) {
        return String(a).trim();
      });
      if (!s.accept.length && s.word) s.accept = [s.word];
      s.answer = s.accept[0] || s.word;
      s.allowTypos = q.allowTypos !== false;
      s.difficulty = q.difficulty;
      s.dripInterval = q.dripInterval;
      s.preReveal = wordRevealPreFraction(q.difficulty);
      s.options = [];
      s.correct = -1;
      s.hideAnswerUntilReveal = true;
    },
    mark: function(s, response) {
      return markTyped(s.accept, response, s.allowTypos).right;
    },
    summary: function(q) {
      return (q.word || "word") + " · drip " + (q.dripInterval || 5) + "s";
    },
    describe: function(s, response) {
      var hit = markTyped(s.accept, response, s.allowTypos);
      return hit.right ? hit.matched || s.answer : String(response == null ? "" : response);
    }
  };

  // src/boards/memory.js
  function createMemoryBoard() {
    function compile(game, { makeSlide: makeSlide2 }) {
      const st = game.settings;
      const out = [];
      for (var first = 0; first < game.questions.length; first += 8) {
        var pairs = game.questions.slice(first, first + 8);
        var board5 = makeSlide2("content");
        board5.id = game.id + ":memory:" + pairs[0].id;
        board5.gameId = game.id;
        board5.gameTitle = game.title;
        board5.title = game.title;
        board5.bullets = [
          "Look at the shared board. Explain your answer aloud; your teacher checks each claim."
        ];
        board5.notes = pairs.map(function(q) {
          return q.notes || "";
        }).filter(Boolean).join("\n\n");
        board5.memoryBoard = {
          kind: game.style,
          set: Math.floor(first / 8) + 1,
          sets: Math.ceil(game.questions.length / 8),
          studySeconds: Math.max(0, Math.min(60, Number(pairs[0].studySeconds) || 0)),
          participants: game.style === "memoryflip" || st.mode !== "teams" ? ["Class"] : st.teams.map(function(t, i) {
            return String(t.name || "").trim() || "Team " + (i + 1);
          }),
          pairs: pairs.map(function(q) {
            return { id: q.id, term: q.term || q.question || "", definition: q.definition || "" };
          })
        };
        out.push(board5);
      }
      return out;
    }
    function decorateIntro(intro, game) {
      const st = game.settings;
      intro.subtitle = game.style === "knowledgeflip" ? game.questions.length + " keywords · explain aloud · no study timer" : game.questions.length + " cards · explain aloud · teacher checks";
      intro.notes = game.style === "knowledgeflip" ? "Open the board when ready. Keywords stay visible — choose, explain, reveal, claim." : "Start the board when the room is ready. Learners recall aloud; the teacher checks each claim.";
    }
    function authorQuestion(insp, question, context) {
      const { UI, game, touched, repaint } = context;
      if (game.style === "knowledgeflip") {
        insp.appendChild(
          UI.field(
            "Keyword",
            UI.text(question.term || "", function(v) {
              question.term = v.slice(0, 80);
              question.question = question.term;
              touched();
              repaint();
            })
          )
        );
        insp.appendChild(
          UI.field(
            "Definition (host only)",
            UI.area(
              question.definition || "",
              function(v) {
                question.definition = v.slice(0, 240);
                touched();
                repaint();
              },
              3
            ),
            "Stays off the board until you reveal it in the check panel. Learners explain from the keyword alone."
          )
        );
      } else {
        insp.appendChild(
          UI.field(
            "Term",
            UI.text(question.term || "", function(v) {
              question.term = v.slice(0, 80);
              question.question = question.term;
              touched();
              repaint();
            })
          )
        );
        insp.appendChild(
          UI.field(
            "Definition",
            UI.area(
              question.definition || "",
              function(v) {
                question.definition = v.slice(0, 240);
                touched();
                repaint();
              },
              3
            )
          )
        );
      }
    }
    function authorInspector(insp, question, context) {
      const { el, game, boardSettingLink, questionOps } = context;
      var boardHint = game.style === "knowledgeflip" ? "Keywords stay visible — there is no study timer. Learners choose a card, explain aloud, then you reveal and claim (+1). Edit each keyword in the rail; the preview shows the shared board." : game.style === "memoryflip" ? "Pairs become a shared board in sets of up to eight. Study, then recall. One class collection — teacher checks each claim." : "Pairs become a shared board in sets of up to eight. Study, then recall with rotating turns. Play the game (or use presenter view) to run the board.";
      if (game.style !== "knowledgeflip") {
        var study = Number(game.questions[0].studySeconds) || 0;
        insp.appendChild(
          boardSettingLink("Study time", study ? study + " seconds" : "no study phase")
        );
      }
      insp.appendChild(el("p", "hint", boardHint));
      insp.appendChild(questionOps());
      return;
    }
    function authorSettings(body, context) {
      const { UI, el, game, touched, drawRail, drawPreview, st, draw2 } = context;
      var classOnly = game.style === "memoryflip";
      body.appendChild(
        UI.field(
          "Play together",
          UI.segmented(
            [
              { value: "individual", label: "Whole class" },
              { value: "teams", label: "Rotating teams" }
            ],
            classOnly ? "individual" : st.mode,
            function(v) {
              st.mode = classOnly ? "individual" : v;
              touched();
              draw2();
              drawPreview();
            }
          ),
          classOnly ? "Memory Flip uses one shared class collection." : game.style === "knowledgeflip" ? "Keywords stay on the board. One card per turn — whole class or rotating teams after a claim or pass." : "One card per turn. Teams rotate after a claim or pass."
        )
      );
      if (st.mode === "teams" && !classOnly) {
        body.appendChild(
          UI.field(
            "Team names — one per line",
            UI.area(
              st.teams.map(function(t) {
                return t.name;
              }).join("\n"),
              function(v) {
                var names = v.split("\n").map(function(n) {
                  return n.trim().slice(0, 20);
                }).filter(Boolean).slice(0, 6);
                st.teams = names.length ? names.map(function(name) {
                  return { name };
                }) : [{ name: "Class" }];
                touched();
                drawPreview();
              },
              4
            )
          )
        );
      }
      if (game.style !== "knowledgeflip") {
        body.appendChild(
          UI.field(
            "Study time for the whole board (seconds)",
            UI.num(
              game.questions[0].studySeconds,
              function(v) {
                game.questions.forEach(function(pair) {
                  pair.studySeconds = Math.max(0, Math.min(60, v == null ? 10 : v));
                });
                touched();
                draw2();
                drawPreview();
                drawRail();
              },
              0,
              60
            ),
            "The whole set is visible during study, then the cards hide. Recall is untimed; 0 skips study."
          )
        );
      }
      body.appendChild(
        el(
          "p",
          "hint",
          game.style === "knowledgeflip" ? "No study phase. Open the board → choose a keyword → explain → reveal → claim. Collection scores stay on this board; they do not feed the live quiz leaderboard." : "Each accepted claim collects one card. The board shows collection scores and recognises ties. Learners answer aloud; the teacher controls the board or uses presenter view. These collection scores are local to this playthrough and do not change the live quiz leaderboard."
        )
      );
      return;
    }
    return {
      clock: {
        selector: ".mem-time",
        text: (state) => state.phase === "study" ? Math.ceil(state.remaining) + "s" : Math.floor(state.elapsed / 60) + ":" + String(Math.floor(state.elapsed % 60)).padStart(2, "0")
      },
      focusPrimary: ".mem-check button:not(:disabled)",
      focusFallback: ".mem-card:not(:disabled), .mem-actions button:not(:disabled)",
      key: "memory",
      runtime: "Memory",
      field: "memoryBoard",
      states: "memoryStates",
      state: "memoryState",
      command: "memoryCommand",
      className: "memory-board-slide",
      setSize: 8,
      showsQuestion: false,
      compile,
      decorateIntro,
      authorQuestion,
      authorInspector,
      authorSettings
    };
  }

  // src/samples/memory.json
  var memory_default = [
    {
      term: "Mitochondrion",
      question: "Mitochondrion",
      definition: "Where respiration releases energy"
    },
    {
      term: "Nucleus",
      question: "Nucleus",
      definition: "Contains the genetic instructions for the cell"
    },
    {
      term: "Cell membrane",
      question: "Cell membrane",
      definition: "Controls what enters and leaves the cell"
    },
    {
      term: "Chloroplast",
      question: "Chloroplast",
      definition: "Contains chlorophyll and absorbs light for photosynthesis"
    }
  ];

  // src/games/memory.js
  function normalizePairQuestion(q) {
    q.term = String(q.term == null ? "" : q.term).slice(0, 80);
    q.definition = String(q.definition == null ? "" : q.definition).slice(0, 240);
    if (!String(q.question || "").trim()) q.question = q.term || "Claim this pair";
    var study = Number(q.studySeconds);
    q.studySeconds = Number.isFinite(study) ? Math.max(0, Math.min(60, Math.round(study))) : 10;
    delete q.options;
    delete q.correct;
    return q;
  }
  function pairProblems(q, n) {
    if (!String(q.term || "").trim()) return "Q" + n + " needs a term";
    if (!String(q.definition || "").trim()) return "Q" + n + " needs a definition";
    return null;
  }
  function compilePairClaim(q, settings, s, hideAfterStudy) {
    s.question = q.question || q.term;
    s.term = q.term.trim();
    s.definition = q.definition.trim();
    s.answer = s.definition;
    s.accept = [s.definition];
    s.allowTypos = true;
    s.studySeconds = q.studySeconds;
    s.hideAfterStudy = !!hideAfterStudy;
    s.options = ["Claimed", "Not yet"];
    s.correct = 0;
  }
  var board = createMemoryBoard();
  var memoryflip = {
    boardEngine: board,
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 1,
      "scoreSlide": false,
      "confidence": false
    },
    starters: memory_default,
    key: "memoryflip",
    label: "Memory flip",
    icon: "🂠",
    blurb: "Study term↔definition pairs, then claim them. Host marks each claim.",
    mechanic: "claim",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Claimed", "Not yet"],
    make: function() {
      return {
        question: "Chloroplast",
        term: "Chloroplast",
        definition: "Organelle where photosynthesis happens",
        studySeconds: 10
      };
    },
    normalize: normalizePairQuestion,
    problems: pairProblems,
    compile: function(q, st, s) {
      compilePairClaim(q, st, s, true);
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === s.correct;
    },
    summary: function(q) {
      return (q.term || "pair") + " · study " + (q.studySeconds || 10) + "s";
    }
  };
  var memorymatch = {
    boardEngine: board,
    defaults: {
      "mode": "teams",
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 1,
      "scoreSlide": false,
      "confidence": false
    },
    starters: memory_default,
    key: "memorymatch",
    label: "Memory match",
    icon: "⧉",
    blurb: "Study the whole board, choose a hidden card and explain its meaning. Claim it for your team, or pass and retry.",
    mechanic: "claim",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Claimed", "Not yet"],
    make: function() {
      return {
        question: "Mitochondrion",
        term: "Mitochondrion",
        definition: "Where respiration releases energy",
        studySeconds: 10,
        rotateClaims: true
      };
    },
    normalize: function(q) {
      normalizePairQuestion(q);
      q.rotateClaims = q.rotateClaims !== false;
      return q;
    },
    problems: pairProblems,
    compile: function(q, st, s) {
      compilePairClaim(q, st, s, true);
      s.rotateClaims = q.rotateClaims !== false;
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === s.correct;
    },
    summary: function(q) {
      return (q.term || "pair") + " · rotate claims";
    }
  };
  var knowledgeflip = {
    boardEngine: board,
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 1,
      "scoreSlide": false,
      "confidence": false
    },
    starters: memory_default,
    key: "knowledgeflip",
    label: "Knowledge flip",
    icon: "↺",
    blurb: "Keywords stay on the board. Choose one, explain aloud, then claim. No study timer.",
    mechanic: "claim",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Claimed", "Not yet"],
    make: function() {
      return {
        question: "Osmosis",
        term: "Osmosis",
        definition: "Diffusion of water across a partially permeable membrane",
        studySeconds: 0
      };
    },
    normalize: function(q) {
      normalizePairQuestion(q);
      q.studySeconds = 0;
      return q;
    },
    problems: pairProblems,
    compile: function(q, st, s) {
      compilePairClaim(q, st, s, false);
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === s.correct;
    },
    summary: function(q) {
      return (q.term || "keyword") + " · always visible";
    }
  };

  // src/games/headsup.js
  var headsup = {
    defaults: {
      "defaultTime": 60,
      "defaultPoints": 1,
      "confidence": false
    },
    key: "headsup",
    label: "Heads up",
    icon: "↑",
    blurb: "Describe the term; peers retrieve it. Host marks Correct or Pass.",
    mechanic: "judge",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Correct", "Pass"],
    make: function() {
      return {
        question: "Photosynthesis",
        term: "Photosynthesis",
        category: "Biology",
        hint: "",
        options: ["Correct", "Pass"],
        correct: 0
      };
    },
    normalize: function(q) {
      q.term = String(q.term == null ? q.question : q.term).slice(0, 80);
      q.category = String(q.category == null ? "" : q.category).slice(0, 40);
      q.hint = String(q.hint == null ? "" : q.hint).slice(0, 120);
      q.question = q.term || q.question || "Term";
      q.options = ["Correct", "Pass"];
      q.correct = 0;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.term || q.question || "").trim()) return "Q" + n + " needs a term";
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.term || q.question;
      s.term = q.term || q.question;
      s.category = q.category;
      s.hint = q.hint;
      s.options = ["Correct", "Pass"];
      s.correct = 0;
      s.answer = "Correct";
      s.judgeKind = "headsup";
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === 0;
    },
    summary: function(q) {
      return q.term || q.question || "term";
    }
  };

  // src/games/spinexplain.js
  function spinExplainPoints(verdict) {
    if (verdict === "clear" || verdict === 0) return 2;
    if (verdict === "hint" || verdict === 1) return 1;
    return 0;
  }
  var spinexplain = {
    defaults: {
      "defaultPoints": 2,
      "confidence": false
    },
    key: "spinexplain",
    label: "Spin & explain",
    icon: "◉",
    blurb: "Spin a concept; explain it aloud. Host scores Clear, With hint, or Reject.",
    mechanic: "judge",
    input: "choice",
    minOptions: 3,
    maxOptions: 3,
    fixedOptions: ["Clear", "With hint", "Reject"],
    make: function() {
      return {
        question: "Respiration",
        term: "Respiration",
        hint: "Energy from glucose",
        category: "",
        options: ["Clear", "With hint", "Reject"],
        correct: 0
      };
    },
    normalize: function(q) {
      q.term = String(q.term == null ? q.question : q.term).slice(0, 80);
      q.hint = String(q.hint == null ? "" : q.hint).slice(0, 120);
      q.category = String(q.category == null ? "" : q.category).slice(0, 40);
      q.question = q.term || q.question || "Concept";
      q.options = ["Clear", "With hint", "Reject"];
      q.correct = 0;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.term || q.question || "").trim()) return "Q" + n + " needs a term";
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.term || q.question;
      s.term = q.term || q.question;
      s.hint = q.hint;
      s.category = q.category;
      s.options = ["Clear", "With hint", "Reject"];
      s.correct = 0;
      s.answer = "Clear";
      s.judgeKind = "spinexplain";
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === 0;
    },
    summary: function(q) {
      return q.term || "concept";
    }
  };

  // src/games/connection.js
  var connection = {
    defaults: {
      "defaultTime": 0,
      "defaultPoints": 1,
      "confidence": false
    },
    key: "connection",
    label: "Connection maker",
    icon: "⚭",
    blurb: "Pick two ideas and explain the bridge. Host Accepts for +1.",
    mechanic: "judge",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Accept", "Reject"],
    make: function() {
      return {
        question: "Link these two ideas",
        itemA: "Photosynthesis",
        itemB: "Respiration",
        options: ["Accept", "Reject"],
        correct: 0
      };
    },
    normalize: function(q) {
      q.itemA = String(q.itemA == null ? "" : q.itemA).slice(0, 80);
      q.itemB = String(q.itemB == null ? "" : q.itemB).slice(0, 80);
      q.question = q.question || "How do " + (q.itemA || "A") + " and " + (q.itemB || "B") + " connect?";
      q.options = ["Accept", "Reject"];
      q.correct = 0;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.itemA || "").trim() || !String(q.itemB || "").trim()) {
        return "Q" + n + " needs two items to connect";
      }
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.question;
      s.itemA = q.itemA.trim();
      s.itemB = q.itemB.trim();
      s.options = ["Accept", "Reject"];
      s.correct = 0;
      s.answer = "Accept";
      s.judgeKind = "accept";
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === 0;
    },
    summary: function(q) {
      return (q.itemA || "?") + " ↔ " + (q.itemB || "?");
    }
  };

  // src/samples/conceptchain.json
  var conceptchain_default = [
    {
      term: "Cell",
      prompt: "The basic unit of living things — what connects next?",
      question: "Chain from: Cell"
    },
    {
      term: "Tissue",
      prompt: "Groups of similar cells — how does this link onward?",
      question: "Chain from: Tissue"
    },
    {
      term: "Organ",
      prompt: "Tissues working together — what comes after?",
      question: "Chain from: Organ"
    },
    {
      term: "System",
      prompt: "Organs cooperating — how does this reach the organism?",
      question: "Chain from: System"
    }
  ];

  // src/games/conceptchain.js
  var CHAIN_TIMES = [30, 45, 60, 90];
  function clampChainSeconds(n) {
    n = Number(n);
    return CHAIN_TIMES.indexOf(n) > -1 ? n : 45;
  }
  var conceptchain = {
    defaults: {
      "defaultTime": 45,
      "defaultPoints": 1,
      "confidence": false
    },
    starters: conceptchain_default,
    key: "conceptchain",
    label: "Concept chain",
    icon: "⛓",
    blurb: "Start from a term; add a justified link. Host Accepts to grow the chain (+1).",
    mechanic: "judge",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Accept", "Reject"],
    make: function() {
      return {
        question: "Add the next justified link",
        term: "Cell",
        prompt: "The basic unit of living things — what connects next?",
        options: ["Accept", "Reject"],
        correct: 0
      };
    },
    normalize: function(q) {
      q.term = String(q.term == null ? "" : q.term).slice(0, 80);
      if (q.definition != null && String(q.definition).trim()) {
        q.prompt = q.definition;
      }
      q.prompt = String(q.prompt == null ? "" : q.prompt).slice(0, 280);
      delete q.definition;
      q.question = q.question || "Chain from: " + (q.term || "…");
      q.options = ["Accept", "Reject"];
      q.correct = 0;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.term || "").trim()) return "Q" + n + " needs a starting term";
      return null;
    },
    board: function(game) {
      var n = (game.questions || []).length;
      if (n < 3) return "needs at least 3 starting concepts and this has " + n;
      if (n > 10) return "can have at most 10 starting concepts and this has " + n;
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.question;
      s.term = String(q.term || "").trim();
      s.prompt = String(q.prompt || "").trim();
      s.options = ["Accept", "Reject"];
      s.correct = 0;
      s.answer = "Accept";
      s.judgeKind = "accept";
      s.conceptChain = true;
      s.timeLimit = clampChainSeconds(
        q.timeLimit == null ? st.defaultTime : q.timeLimit
      );
      s.points = 1;
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === 0;
    },
    summary: function(q) {
      return "Chain · " + (q.term || "term");
    }
  };

  // src/games/randomchallenge.js
  var randomchallenge = {
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    key: "randomchallenge",
    label: "Random challenge",
    icon: "✦",
    blurb: "Draw a challenge; host marks Complete. Count only — no competitive score.",
    mechanic: "count",
    input: "choice",
    minOptions: 2,
    maxOptions: 2,
    fixedOptions: ["Complete", "Skip"],
    make: function() {
      return {
        question: "Draw and take the challenge",
        challenge: "Explain this idea to someone who missed the last lesson.",
        options: ["Complete", "Skip"],
        correct: 0
      };
    },
    normalize: function(q) {
      q.challenge = String(q.challenge == null ? q.question : q.challenge).slice(0, 280);
      q.question = q.challenge || q.question || "Challenge";
      q.options = ["Complete", "Skip"];
      q.correct = 0;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.challenge || q.question || "").trim()) return "Q" + n + " needs a challenge";
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.challenge || q.question;
      s.challenge = q.challenge || q.question;
      s.options = ["Complete", "Skip"];
      s.correct = 0;
      s.answer = "Complete";
      s.judgeKind = "count";
    },
    mark: function(s, response) {
      return Number.isInteger(response) && response === 0;
    },
    summary: function(q) {
      return "Challenge";
    }
  };

  // src/boards/bingo.js
  function createBingoBoard() {
    function compile(game, { makeSlide: makeSlide2 }) {
      const st = game.settings;
      const out = [];
      var card = makeSlide2("content");
      card.id = game.id + ":bingo";
      card.gameId = game.id;
      card.gameTitle = game.title;
      card.title = game.title;
      card.bullets = [
        "Your teacher reads a definition. If the term is on your card, say what it means to claim the square."
      ];
      card.notes = game.questions.map(function(q) {
        return q.notes || "";
      }).filter(Boolean).join("\n\n");
      card.bingoBoard = {
        gridSize: Number(game.questions[0].gridSize) || 3,
        /* Teams only, capped at six — six 4×4 cards is already the most a
           projector can hold. On an individual game the room plays one card
           together, which is the shape a single-card class game takes. */
        participants: st.mode === "teams" ? st.teams.slice(0, 6).map(function(t, i) {
          return String(t.name || "").trim() || "Team " + (i + 1);
        }) : ["The class"],
        pool: game.questions.map(function(q) {
          return {
            id: q.id,
            term: String(q.term || "").trim(),
            definition: String(q.definition || "").trim()
          };
        }).filter(function(pair) {
          return pair.term && pair.definition;
        })
      };
      out.push(card);
      return out;
    }
    function decorateIntro(intro, game) {
      const st = game.settings;
      var gsz = Number(game.questions[0].gridSize) || 3;
      intro.subtitle = gsz + "×" + gsz + " cards · " + game.questions.length + " terms in the pool" + (st.mode === "teams" ? " · a card each" : " · one class card");
      intro.notes = "Call a definition, then ask the team that claims it to explain the term. A row, column or diagonal wins.";
    }
    function poolNote(size, game) {
      var need = size * size;
      var seen = {}, n = 0;
      game.questions.forEach(function(q) {
        var key = String(q.term || "").trim().toLowerCase();
        if (key && !seen[key]) {
          seen[key] = 1;
          n++;
        }
      });
      if (n < need)
        return need + " different terms needed · " + n + " so far · add " + (need - n) + " more";
      return n + " terms in the pool · every card is a different " + size + "×" + size + " deal · a row, column or diagonal wins";
    }
    function authorQuestion(insp, question, context) {
      const { UI, touched, repaint, drawRail } = context;
      insp.appendChild(
        UI.field(
          "Term (on the cards)",
          UI.text(question.term || "", function(v) {
            question.term = v.slice(0, 40);
            question.question = question.term;
            touched();
            repaint();
            drawRail();
          }),
          "One square. Every term in this game goes in the pool the cards are dealt from."
        )
      );
      insp.appendChild(
        UI.field(
          "Definition (what you read out)",
          UI.area(
            question.definition || "",
            function(v) {
              question.definition = v.slice(0, 240);
              touched();
              repaint();
            },
            3
          ),
          "Stays off the wall until you reveal it. The room hears the definition and finds the term."
        )
      );
    }
    function authorInspector(insp, question, context) {
      const { el, game, boardSettingLink, questionOps } = context;
      var size = Number(question.gridSize) || 3;
      insp.appendChild(boardSettingLink("Card size", size + " × " + size));
      insp.appendChild(el("p", "hint", poolNote(size, game)));
      insp.appendChild(
        el(
          "p",
          "hint",
          "Every team is dealt a different card from these terms, so the pool wants more terms than a card has squares. There is no countdown and no points: you call a definition, a team explains the term, and you mark the square. Play the game (or use presenter view) to run it."
        )
      );
      insp.appendChild(questionOps());
      return;
    }
    function authorSettings(body, context) {
      const { SF, UI, el, game, touched, drawRail, drawPreview, st, draw2 } = context;
      body.appendChild(
        UI.field(
          "Play as",
          UI.segmented(
            [
              { value: "individual", label: "One class card" },
              { value: "teams", label: "A card each" }
            ],
            st.mode,
            function(v) {
              st.mode = v;
              if (v === "teams" && st.teams.length < 2) {
                st.teams = SF.makeGame().settings.teams.slice(0, 2);
              }
              touched();
              draw2();
              drawPreview();
            }
          ),
          st.mode === "teams" ? "Every team is dealt a different card from the same pool, so the same call is on some cards and not others." : "The room plays one card together. Nobody competes; the class is trying to finish a line."
        )
      );
      if (st.mode === "teams") {
        body.appendChild(
          UI.field(
            "Team names — one per line",
            UI.area(
              st.teams.map(function(t) {
                return t.name;
              }).join("\n"),
              function(v) {
                var names = v.split("\n").map(function(n) {
                  return n.trim().slice(0, 20);
                }).filter(Boolean).slice(0, 6);
                st.teams = names.length ? names.map(function(name) {
                  return { name };
                }) : [{ name: "Class" }];
                touched();
                drawPreview();
              },
              4
            ),
            "Six at most — six cards is already as much as a projector holds."
          )
        );
      }
      body.appendChild(
        UI.field(
          "Card size",
          UI.segmented(
            [
              { value: "2", label: "2 × 2" },
              { value: "3", label: "3 × 3" },
              { value: "4", label: "4 × 4" }
            ],
            String(game.questions[0].gridSize || 3),
            function(v) {
              game.questions.forEach(function(pair) {
                pair.gridSize = Number(v);
              });
              touched();
              draw2();
              drawPreview();
              drawRail();
            }
          ),
          poolNote(Number(game.questions[0].gridSize) || 3, game)
        )
      );
      body.appendChild(
        el(
          "p",
          "hint",
          "No timer and no points: a row, column or diagonal wins. Each term is called once, so a square nobody could explain is gone. Claims are recorded in the session report as a spoken round, credited to the team — not to a learner, because a spoken answer has no name on it."
        )
      );
      return;
    }
    return {
      focusPrimary: ".bingo-verdicts button:not(:disabled)",
      focusFallback: ".bingo-actions button:not(:disabled)",
      key: "bingo",
      runtime: "Bingo",
      field: "bingoBoard",
      states: "bingoStates",
      state: "bingoState",
      command: "bingoCommand",
      className: "bingo-board-slide",
      setSize: Infinity,
      showsQuestion: false,
      compile,
      decorateIntro,
      authorQuestion,
      authorInspector,
      authorSettings
    };
  }

  // src/samples/bingo.json
  var bingo_default = [
    {
      term: "Nucleus",
      question: "Nucleus",
      definition: "Holds the cell’s DNA and controls what it makes",
      gridSize: 3
    },
    {
      term: "Cytoplasm",
      question: "Cytoplasm",
      definition: "The jelly where most of the cell’s reactions happen",
      gridSize: 3
    },
    {
      term: "Cell membrane",
      question: "Cell membrane",
      definition: "Controls what gets into and out of the cell",
      gridSize: 3
    },
    {
      term: "Mitochondrion",
      question: "Mitochondrion",
      definition: "Releases energy from glucose in respiration",
      gridSize: 3
    },
    {
      term: "Ribosome",
      question: "Ribosome",
      definition: "Builds proteins from amino acids",
      gridSize: 3
    },
    {
      term: "Vacuole",
      question: "Vacuole",
      definition: "Stores sap and keeps a plant cell firm",
      gridSize: 3
    },
    {
      term: "Chloroplast",
      question: "Chloroplast",
      definition: "Traps light so the plant can photosynthesise",
      gridSize: 3
    },
    {
      term: "Cell wall",
      question: "Cell wall",
      definition: "Stops a plant cell bursting when it fills with water",
      gridSize: 3
    },
    {
      term: "Chromosome",
      question: "Chromosome",
      definition: "A long coiled molecule of DNA carrying many genes",
      gridSize: 3
    },
    {
      term: "Enzyme",
      question: "Enzyme",
      definition: "A protein that speeds up one reaction and is not used up",
      gridSize: 3
    },
    {
      term: "Diffusion",
      question: "Diffusion",
      definition: "Particles spreading from where there are many to where there are few",
      gridSize: 3
    },
    {
      term: "Osmosis",
      question: "Osmosis",
      definition: "Water moving across a partially permeable membrane",
      gridSize: 3
    }
  ];

  // src/games/bingo.js
  function bingoHasLine(marked, size) {
    size = Math.max(2, Math.min(4, Number(size) || 3));
    var n = size * size;
    var cells = [];
    for (var i = 0; i < n; i++) cells[i] = !!marked[i];
    var r, c, ok;
    for (r = 0; r < size; r++) {
      ok = true;
      for (c = 0; c < size; c++) if (!cells[r * size + c]) {
        ok = false;
        break;
      }
      if (ok) return true;
    }
    for (c = 0; c < size; c++) {
      ok = true;
      for (r = 0; r < size; r++) if (!cells[r * size + c]) {
        ok = false;
        break;
      }
      if (ok) return true;
    }
    ok = true;
    for (i = 0; i < size; i++) if (!cells[i * size + i]) {
      ok = false;
      break;
    }
    if (ok) return true;
    ok = true;
    for (i = 0; i < size; i++) if (!cells[i * size + (size - 1 - i)]) {
      ok = false;
      break;
    }
    return ok;
  }
  var board2 = createBingoBoard();
  var bingo = {
    boardEngine: board2,
    /* Twelve pairs, because a 3×3 card needs nine different terms and a pool
         the same size as the card deals every team an identical one.
    
         Without a bank, makeGame('bingo') produced a single pair and the game was
         invalid the moment it existed: board() answered "a 3×3 card needs 9
         different terms and this has 1" before the teacher had typed anything.
         The other pair-based boards have shipped a bank since they were written;
         this one was the exception. */
    starters: bingo_default,
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    key: "bingo",
    label: "Bingo",
    icon: "▣",
    blurb: "Every team gets a different card. Call a definition; the team holding that term explains it to claim the square. A line wins — no points.",
    mechanic: "bingo",
    input: "choice",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    /* One pair per question, like the memory boards: the questions are the
       pool the cards are dealt from, not a run of slides. */
    make: function() {
      return {
        question: "Nucleus",
        term: "Nucleus",
        definition: "Holds the cell’s DNA",
        gridSize: 3
      };
    },
    normalize: function(q) {
      if (Array.isArray(q.terms)) {
        q.term = String(q.terms[0] || "");
        q.question = q.term;
        q.definition = "";
      }
      delete q.terms;
      normalizePairQuestion(q);
      q.studySeconds = 0;
      var size = Number(q.gridSize);
      q.gridSize = [2, 3, 4].indexOf(size) > -1 ? size : 3;
      return q;
    },
    problems: pairProblems,
    /* A card cannot be dealt from a pool smaller than itself, and duplicate
       terms would put the same square on a card twice. Neither is visible
       one question at a time, so it is asked of the whole game. */
    board: function(game) {
      var size = Number((game.questions[0] || {}).gridSize) || 3;
      var seen = {}, n = 0;
      game.questions.forEach(function(q) {
        var key = String(q.term || "").trim().toLowerCase();
        if (key && !seen[key]) {
          seen[key] = 1;
          n++;
        }
      });
      if (n < size * size) {
        return "a " + size + "×" + size + " card needs " + size * size + " different terms and this has " + n;
      }
      return null;
    },
    /* Never reached when running — compileGame builds one board slide for the
       whole game. This is for the editor preview, which compiles a single
       question to show what one square holds. */
    compile: function(q, st, s) {
      s.question = q.question || q.term;
      s.term = String(q.term || "").trim();
      s.definition = String(q.definition || "").trim();
      s.gridSize = q.gridSize || 3;
      s.options = [];
      s.correct = -1;
      s.points = 0;
    },
    mark: function() {
      return false;
    },
    // squares are claimed, not answered
    summary: function(q) {
      return (q.gridSize || 3) + "×" + (q.gridSize || 3) + " card · one square";
    }
  };

  // src/boards/lowstakes.js
  function createLowstakesBoard({ clampLowstakesSeconds: clampLowstakesSeconds2 }) {
    function compile(game, { makeSlide: makeSlide2 }) {
      const st = game.settings;
      const out = [];
      var sheet = makeSlide2("content");
      sheet.id = game.id + ":lowstakes";
      sheet.gameId = game.id;
      sheet.gameTitle = game.title;
      sheet.title = game.title;
      sheet.bullets = ["Write your answers on paper. No notes — this is retrieval practice."];
      sheet.notes = game.questions.map(function(q) {
        return q.notes || "";
      }).filter(Boolean).join("\n\n");
      sheet.lowstakesBoard = {
        kind: "lowstakes",
        timeLimit: clampLowstakesSeconds2(st.defaultTime),
        items: game.questions.map(function(q) {
          var question = String(q.question || "").trim();
          var answer = String(q.answer || "").trim();
          return {
            id: q.id,
            question,
            answer,
            gap: !question ? "question" : !answer ? "answer" : null
          };
        })
      };
      out.push(sheet);
      return out;
    }
    function decorateIntro(intro, game) {
      const st = game.settings;
      intro.subtitle = game.questions.length + " questions · write on paper · " + clampLowstakesSeconds2(st.defaultTime) + "s then reveal";
      intro.notes = "Start the quiz when ready. Learners write answers on paper. When time is up (or you reveal early), discuss the answers together.";
    }
    function authorQuestion(insp, question, context) {
      const { UI, touched, repaint } = context;
      insp.appendChild(
        UI.field(
          "Question",
          UI.area(
            question.question || "",
            function(v) {
              question.question = v.slice(0, 280);
              touched();
              repaint();
            },
            3
          )
        )
      );
      insp.appendChild(
        UI.field(
          "Answer (revealed after the quiz)",
          UI.area(
            question.answer || "",
            function(v) {
              question.answer = v.slice(0, 280);
              touched();
              repaint();
            },
            3
          ),
          "Hidden on the board while the class writes. Shown when time is up or you reveal early."
        )
      );
    }
    function authorInspector(insp, question, context) {
      const { el, questionOps } = context;
      insp.appendChild(
        el(
          "p",
          "hint",
          "The whole set is one worksheet (3–10 pairs). Learners write on paper during the quiz clock — no notes, this is retrieval. Answers appear together for discussion. Incomplete rows stay on the board as gaps. No phone scoring and no points. Set the quiz length under Game settings."
        )
      );
      insp.appendChild(questionOps());
      return;
    }
    function authorSettings(body, context) {
      const { UI, el, touched, drawRail, drawPreview, st, draw2 } = context;
      if ([120, 180, 240].indexOf(Number(st.defaultTime)) < 0) st.defaultTime = 180;
      body.appendChild(
        UI.field(
          "Quiz time limit",
          UI.segmented(
            [
              { value: "120", label: "2m" },
              { value: "180", label: "3m" },
              { value: "240", label: "4m" }
            ],
            String(st.defaultTime),
            function(v) {
              st.defaultTime = Number(v);
              touched();
              draw2();
              drawPreview();
              drawRail();
            }
          ),
          "Whole-quiz countdown. When it ends, answers are revealed for discussion."
        )
      );
      body.appendChild(
        el(
          "p",
          "hint",
          "Use 3–10 question–answer pairs. No scoreboard and no phone answers. The class writes on paper (no notes), then you reveal and discuss. A reveal leaves a session-report trace — not phone scores."
        )
      );
      return;
    }
    return {
      clock: {
        selector: ".lsq-time",
        text: (state, engine) => engine.formatClock(state.phase === "quiz" ? state.remaining : state.elapsed || 0)
      },
      focusPrimary: ".lsq-actions button:not(:disabled)",
      focusFallback: ".lsq-actions button:not(:disabled)",
      reportEvent: "onReveal",
      reportValue: (value) => ({
        slideId: value.slideId,
        title: value.title,
        kind: "lowstakes",
        set: 1,
        card: 0,
        term: (value.count || 0) + " questions" + (value.early ? " · early reveal" : " · time up"),
        participant: "The class",
        right: true,
        value: 0
      }),
      key: "lowstakes",
      runtime: "LowStakes",
      field: "lowstakesBoard",
      states: "lowstakesStates",
      state: "lowstakesState",
      command: "lowstakesCommand",
      className: "lowstakes-board-slide",
      setSize: Infinity,
      showsQuestion: false,
      compile,
      decorateIntro,
      authorQuestion,
      authorInspector,
      authorSettings
    };
  }

  // src/samples/lowstakes.json
  var lowstakes_default = [
    {
      question: "What does RAM stand for?",
      answer: "Random Access Memory"
    },
    {
      question: "What is the function of the CPU?",
      answer: "To process instructions and perform calculations"
    },
    {
      question: "What type of storage is an SSD?",
      answer: "Solid State Drive / Flash storage"
    },
    {
      question: "What does ROM contain?",
      answer: "Read Only Memory / Boot instructions / BIOS"
    },
    {
      question: "What is cache memory used for?",
      answer: "Storing frequently accessed data for quick retrieval"
    }
  ];

  // src/games/lowstakes.js
  var LOWSTAKES_TIMES = [120, 180, 240];
  function clampLowstakesSeconds(n) {
    n = Number(n);
    if (LOWSTAKES_TIMES.indexOf(n) > -1) return n;
    if (!Number.isFinite(n) || n <= 0) return 180;
    if (n <= 150) return 120;
    if (n <= 210) return 180;
    return 240;
  }
  var board3 = createLowstakesBoard({ clampLowstakesSeconds });
  var lowstakes = {
    boardEngine: board3,
    defaults: {
      "scoreboard": false,
      "defaultTime": 180,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    starters: lowstakes_default,
    key: "lowstakes",
    label: "Low-stakes quiz",
    icon: "◎",
    blurb: "Timed retrieval on paper. When time is up, answers are revealed for discussion — no scoreboard.",
    mechanic: "count",
    input: "choice",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    make: function() {
      return {
        question: "What does RAM stand for?",
        answer: "Random Access Memory"
      };
    },
    normalize: function(q) {
      q.question = String(q.question == null ? "" : q.question).slice(0, 280);
      var ans = q.answer;
      if (ans == null || ans === "") ans = q.explanation;
      if ((ans == null || ans === "") && Array.isArray(q.options) && q.options.length) {
        ans = q.options[q.correct] || q.options[0];
      }
      q.answer = String(ans == null ? "" : ans).slice(0, 280);
      delete q.options;
      delete q.correct;
      delete q.accept;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.question || "").trim()) return "Q" + n + " has no question text";
      if (!String(q.answer || "").trim()) return "Q" + n + " needs an answer for the reveal";
      return null;
    },
    /* Audit: 3–10 questions. Incomplete slots stay on the board as named gaps
       rather than vanishing, so the count here is every authored row. */
    board: function(game) {
      var n = (game.questions || []).length;
      if (n < 3) {
        return "needs at least 3 questions and this has " + n;
      }
      if (n > 10) {
        return "can have at most 10 questions and this has " + n;
      }
      return null;
    },
    compile: function(q, st, s) {
      s.question = q.question;
      s.answer = q.answer;
      s.options = [];
      s.correct = -1;
      s.points = 0;
    },
    mark: function() {
      return false;
    },
    summary: function(q) {
      return (String(q.question || "").trim() || "question") + " · retrieval";
    }
  };

  // src/boards/bowl.js
  function createBowlBoard({ bowlGrid: bowlGrid2 }) {
    function compile(game, { makeSlide: makeSlide2 }) {
      const st = game.settings;
      const out = [];
      var grid = bowlGrid2(game.questions);
      var bowl2 = makeSlide2("content");
      bowl2.id = game.id + ":bowl";
      bowl2.gameId = game.id;
      bowl2.gameTitle = game.title;
      bowl2.title = game.title;
      bowl2.bullets = [
        "Choose a category and a value. Answer aloud — your teacher checks it and awards the cell."
      ];
      bowl2.notes = game.questions.map(function(q) {
        return q.notes || "";
      }).filter(Boolean).join("\n\n");
      bowl2.bowlBoard = {
        categories: grid.categories,
        values: grid.values,
        cells: grid.cells,
        target: Number(game.questions[0].targetScore) || 1e3,
        participants: st.mode === "teams" ? st.teams.slice(0, 6).map(function(t, i) {
          return String(t.name || "").trim() || "Team " + (i + 1);
        }) : ["The class"]
      };
      out.push(bowl2);
      return out;
    }
    function decorateIntro(intro, game) {
      const st = game.settings;
      var bg = bowlGrid2(game.questions);
      intro.subtitle = bg.categories.length + (bg.categories.length === 1 ? " category · " : " categories · ") + game.questions.length + " cells · first to " + (Number(game.questions[0].targetScore) || 1e3);
      intro.notes = "Pick an unused cell, hear the answer, then reveal and award it. The board ends when it empties or a team reaches the target.";
    }
    function bowlNote(game, SF) {
      var grid = SF.bowlGrid(game.questions);
      var total = game.questions.reduce(function(n, q) {
        return n + (q.pointValue || 0);
      }, 0);
      var target = Number(game.questions[0] && game.questions[0].targetScore) || 1e3;
      var shape = grid.categories.length + (grid.categories.length === 1 ? " category · " : " categories · ") + game.questions.length + (game.questions.length === 1 ? " cell · " : " cells · ") + total + " points on the board";
      if (total < target) {
        return shape + " — less than the " + target + " target, so the board will empty first";
      }
      return shape + " · the board ends when someone reaches " + target;
    }
    function authorQuestion(insp, question, context) {
      const { UI, touched, drawRail } = context;
      insp.appendChild(
        UI.field(
          "Category",
          UI.text(question.category || "", function(v) {
            question.category = v.slice(0, 40);
            touched();
            drawRail();
          })
        )
      );
      insp.appendChild(
        UI.field(
          "Point value",
          UI.select(
            [100, 200, 300, 400, 500].map(function(n) {
              return { value: String(n), label: String(n) };
            }),
            String(question.pointValue || 200),
            function(v) {
              question.pointValue = Number(v);
              touched();
              drawRail();
            }
          )
        )
      );
      insp.appendChild(
        UI.field(
          "Answer (host only)",
          UI.text(question.answer || "", function(v) {
            question.answer = v.slice(0, 120);
            touched();
          }),
          "Off the wall until you reveal it. Then award the cell to a team."
        )
      );
    }
    function authorInspector(insp, question, context) {
      const { SF, el, game, boardSettingLink, questionOps } = context;
      insp.appendChild(
        boardSettingLink("Target score", String(Number(question.targetScore) || 1e3))
      );
      insp.appendChild(el("p", "hint", bowlNote(game, SF)));
      insp.appendChild(
        el(
          "p",
          "hint",
          "This question is one cell. Questions sharing a category and a value stack in the same cell and are asked one at a time. The answer is for you — it goes up only when you reveal it, and then you award the cell to whoever answered."
        )
      );
      insp.appendChild(questionOps());
      return;
    }
    function authorSettings(body, context) {
      const { SF, UI, el, game, touched, drawRail, drawPreview, st, draw2 } = context;
      body.appendChild(
        UI.field(
          "Play as",
          UI.segmented(
            [
              { value: "individual", label: "One class score" },
              { value: "teams", label: "Teams compete" }
            ],
            st.mode,
            function(v) {
              st.mode = v;
              if (v === "teams" && st.teams.length < 2) {
                st.teams = SF.makeGame().settings.teams.slice(0, 2);
              }
              touched();
              draw2();
              drawPreview();
            }
          ),
          st.mode === "teams" ? "Teams choose cells and you award each one to whoever answered it." : "The room plays one score against the target rather than each other."
        )
      );
      if (st.mode === "teams") {
        body.appendChild(
          UI.field(
            "Team names — one per line",
            UI.area(
              st.teams.map(function(t) {
                return t.name;
              }).join("\n"),
              function(v) {
                var names = v.split("\n").map(function(n) {
                  return n.trim().slice(0, 20);
                }).filter(Boolean).slice(0, 6);
                st.teams = names.length ? names.map(function(name) {
                  return { name };
                }) : [{ name: "Class" }];
                touched();
                drawPreview();
              },
              4
            ),
            "Six at most — six scores is as much as the board carries."
          )
        );
      }
      body.appendChild(
        UI.field(
          "Target score",
          UI.segmented(
            (SF.BOWL_TARGETS || [500, 1e3, 1500, 2e3]).map(function(n) {
              return { value: String(n), label: String(n) };
            }),
            String(game.questions[0].targetScore || 1e3),
            function(v) {
              game.questions.forEach(function(cell) {
                cell.targetScore = Number(v);
              });
              touched();
              draw2();
              drawPreview();
              drawRail();
            }
          ),
          bowlNote(game, SF)
        )
      );
      body.appendChild(
        el(
          "p",
          "hint",
          "Cells are worth what they say and are spent whether or not anyone answers them, which is what makes reaching for the five hundred a decision. The board ends when it empties or someone reaches the target; ties are named. Awards are recorded in the session report as a spoken round, credited to the team."
        )
      );
      return;
    }
    return {
      focusPrimary: ".bowl-team button:not(:disabled)",
      focusFallback: ".bowl-actions button:not(:disabled), .bowl-cell:not(:disabled)",
      key: "bowl",
      runtime: "Bowl",
      field: "bowlBoard",
      states: "bowlStates",
      state: "bowlState",
      command: "bowlCommand",
      className: "bowl-board-slide",
      setSize: Infinity,
      showsQuestion: true,
      compile,
      decorateIntro,
      authorQuestion,
      authorInspector,
      authorSettings
    };
  }

  // src/samples/bowl.json
  var bowl_default = [
    {
      category: "Cells",
      pointValue: 100,
      targetScore: 1e3,
      question: "What is the jelly inside a cell called?",
      answer: "Cytoplasm"
    },
    {
      category: "Cells",
      pointValue: 200,
      targetScore: 1e3,
      question: "What molecule carries genetic information?",
      answer: "DNA"
    },
    {
      category: "Cells",
      pointValue: 300,
      targetScore: 1e3,
      question: "Which organelle releases energy in respiration?",
      answer: "The mitochondrion"
    },
    {
      category: "Transport",
      pointValue: 100,
      targetScore: 1e3,
      question: "Which way do particles move in diffusion?",
      answer: "From high to low concentration"
    },
    {
      category: "Transport",
      pointValue: 200,
      targetScore: 1e3,
      question: "What is the movement of water across a partially permeable membrane?",
      answer: "Osmosis"
    },
    {
      category: "Transport",
      pointValue: 300,
      targetScore: 1e3,
      question: "Which kind of transport needs energy from respiration?",
      answer: "Active transport"
    },
    {
      category: "Enzymes",
      pointValue: 100,
      targetScore: 1e3,
      question: "What kind of molecule is an enzyme?",
      answer: "A protein"
    },
    {
      category: "Enzymes",
      pointValue: 200,
      targetScore: 1e3,
      question: "What happens to an enzyme above its optimum temperature?",
      answer: "It denatures"
    },
    {
      category: "Enzymes",
      pointValue: 300,
      targetScore: 1e3,
      question: "What is the molecule an enzyme acts on called?",
      answer: "The substrate"
    }
  ];

  // src/games/bowl.js
  var BOWL_VALUES = [100, 200, 300, 400, 500];
  var BOWL_TARGETS = [500, 1e3, 1500, 2e3];
  function bowlGrid(questions) {
    var categories = [], values = [], byKey = {};
    (questions || []).forEach(function(q) {
      var name = String(q.category || "").trim();
      var value = BOWL_VALUES.indexOf(Number(q.pointValue)) > -1 ? Number(q.pointValue) : 200;
      if (!name || !String(q.question || "").trim()) return;
      if (categories.indexOf(name) === -1) categories.push(name);
      if (values.indexOf(value) === -1) values.push(value);
      var key = name + "\0" + value;
      (byKey[key] || (byKey[key] = [])).push({
        id: q.id,
        question: q.question,
        answer: String(q.answer || "").trim(),
        value
      });
    });
    values.sort(function(a, b) {
      return a - b;
    });
    var cells = [];
    values.forEach(function(value, row) {
      categories.forEach(function(name, col) {
        cells.push({
          category: name,
          value,
          row,
          col,
          questions: (byKey[name + "\0" + value] || []).slice()
        });
      });
    });
    return { categories, values, cells };
  }
  var board4 = createBowlBoard({ bowlGrid });
  var bowl = {
    boardEngine: board4,
    defaults: {
      "defaultTime": 0,
      "confidence": false
    },
    key: "bowl",
    label: "Quiz bowl",
    icon: "▦",
    blurb: "A category and value board. Pick an unused cell, answer aloud, and the teacher awards the cell value.",
    mechanic: "bowl",
    input: "choice",
    minOptions: 0,
    maxOptions: 0,
    fixedOptions: null,
    /* Three categories by three values. A board with one cell is not a board —
         the whole move in Quiz Bowl is choosing which cell to take, and until
         there was a bank a new game offered exactly one. Nine is the smallest
         grid where that choice exists.
    
         board() never caught this: one category is still a category, so the game
         was valid and useless at the same time. */
    starters: bowl_default,
    make: function() {
      return {
        question: "What molecule carries genetic information?",
        category: "Cells",
        pointValue: 200,
        targetScore: 1e3,
        answer: "DNA"
      };
    },
    normalize: function(q) {
      q.category = String(q.category == null ? "" : q.category).slice(0, 40);
      q.answer = String(q.answer == null ? "" : q.answer).slice(0, 120);
      var v = Number(q.pointValue);
      q.pointValue = BOWL_VALUES.indexOf(v) > -1 ? v : 200;
      var t = Number(q.targetScore);
      q.targetScore = BOWL_TARGETS.indexOf(t) > -1 ? t : 1e3;
      if (!String(q.question || "").trim()) q.question = "Bowl question";
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      if (!String(q.question || "").trim()) return "Q" + n + " has no question text";
      if (!String(q.category || "").trim()) return "Q" + n + " needs a category";
      if (!String(q.answer || "").trim()) return "Q" + n + " needs an answer for the host";
      return null;
    },
    board: function(game) {
      var grid = bowlGrid(game.questions);
      if (!grid.categories.length) return "no question has a category to sit under";
      if (grid.categories.length > 6) {
        return grid.categories.length + " categories is wider than a board reads — six columns is the most a projector holds";
      }
      return null;
    },
    /* Never reached when running: compileGame emits one board for the game.
       Kept so a bowl question rendered as a slide anywhere still says what it
       is rather than throwing. */
    compile: function(q, st, s) {
      s.question = q.question;
      s.category = q.category.trim();
      s.pointValue = q.pointValue;
      s.answer = q.answer.trim();
      s.options = [];
      s.correct = -1;
      s.points = q.pointValue;
      s.judgeKind = "bowl";
    },
    mark: function() {
      return false;
    },
    // cells are awarded, not answered
    summary: function(q) {
      return (q.category || "Category") + " · " + (q.pointValue || 200);
    }
  };

  // src/games/registry.js
  function markResponse(slide, response) {
    var style = gameStyle(slide.style);
    if (typeof style.mark === "function") return !!style.mark(slide, response);
    return false;
  }
  function answerLabel(slide, response) {
    var style = gameStyle(slide.style);
    if (typeof style.describe === "function") return style.describe(slide, response);
    return String(response == null ? "" : response);
  }
  function gameStyle(key) {
    return GAME_STYLES[key] || GAME_STYLES.choice;
  }
  var GAME_STYLES = { choice: choice2, truefalse, race, speed, boss, slider, type, order, emoji, definition, compare, oddone, wordreveal, memoryflip, memorymatch, knowledgeflip, headsup, spinexplain, connection, conceptchain, randomchallenge, bingo, lowstakes, bowl };

  // src/deck/markdown.js
  function renderMarkdown(deck, lookupGame = (
    /** @type {(id: string) => any} */
    ((_id) => null)
  )) {
    var letters = ["A", "B", "C", "D", "E", "F"];
    var out = [];
    function line(s) {
      out.push(s == null ? "" : String(s));
    }
    function blank() {
      if (out.length && out[out.length - 1] !== "") line("");
    }
    line("# " + (deck.title || "Untitled lesson"));
    line("");
    line("_Practice notes from SlideForge. Live polls, games and scoring stay in the classroom room._");
    line("");
    (deck.slides || []).forEach(function(s, idx) {
      var n = idx + 1;
      blank();
      if (s.type === "game") {
        var g = s.gameId ? lookupGame(s.gameId) : null;
        line("## " + n + ". Knowledge check" + (g || s.gameTitle ? ": " + (g ? g.title : s.gameTitle) : ""));
        line("");
        if (!g) {
          line("*Game not found in this browser — open the lesson in SlideForge to review the questions.*");
          return;
        }
        line("*" + (GAME_STYLES[g.style] ? GAME_STYLES[g.style].label : g.style) + "*");
        line("");
        (g.questions || []).forEach(function(q, qi) {
          line("### Q" + (qi + 1) + ". " + (q.question || "Question"));
          line("");
          if (g.style === "truefalse") {
            line("- True");
            line("- False");
          } else if (Array.isArray(q.options) && q.options.length) {
            q.options.forEach(function(opt, oi) {
              var mark = q.correct === oi ? " *(answer)*" : "";
              line("- " + (letters[oi] || String(oi + 1)) + ". " + opt + mark);
            });
          } else if (q.answer) {
            line("Answer key: `" + q.answer + "`");
          }
          if (q.explanation) {
            line("");
            line("> " + String(q.explanation).replace(/\n+/g, " "));
          }
          line("");
        });
        return;
      }
      if (s.type === "title") {
        line("## " + n + ". " + (s.title || "Title").replace(/\n/g, " "));
        if (s.subtitle) {
          line("");
          line(s.subtitle);
        }
      } else if (s.type === "section") {
        line("## " + n + ". " + (s.title || "Section").replace(/\n/g, " "));
        if (s.subtitle) {
          line("");
          line(s.subtitle);
        }
      } else if (s.type === "quote") {
        line("## " + n + ". Quote");
        line("");
        line("> " + String(s.body || "").replace(/\n/g, " "));
        if (s.subtitle) {
          line("");
          line("— " + s.subtitle);
        }
      } else if (s.type === "image") {
        line("## " + n + ". " + (s.title || "Image").replace(/\n/g, " "));
        line("");
        line(s.image && String(s.image).indexOf("data:") === 0 ? "*Embedded image (open in SlideForge to view).*" : s.image ? "![](" + s.image + ")" : "*No image set.*");
      } else if (s.type === "cards") {
        line("## " + n + ". " + (s.title || "Cards").replace(/\n/g, " "));
        line("");
        (s.bullets || []).filter(function(b) {
          return String(b).trim();
        }).forEach(function(b, i) {
          line(i + 1 + ". " + String(b).replace(/^(\s{2,}|\t|- )+/, "").trim());
        });
      } else if (s.type === "journey" || s.type === "keywords" || s.type === "mindmap") {
        line("## " + n + ". " + (s.title || "Keywords").replace(/\n/g, " "));
        line("");
        (s.bullets || []).map(parseKeywordLine).filter(function(p) {
          return p.term || p.def;
        }).forEach(function(p) {
          line("- **" + p.term + "** — " + (p.def || ""));
        });
      } else if (s.type === "italics") {
        line("## " + n + ". " + (s.title || "Italics").replace(/\n/g, " "));
        line("");
        (s.bullets || []).map(parseKeywordLine).filter(function(p) {
          return p.term || p.def;
        }).forEach(function(p) {
          line("- *" + p.term + "* — " + (p.def || ""));
        });
      } else if (s.type === "links") {
        line("## " + n + ". " + (s.title || "Links").replace(/\n/g, " "));
        line("");
        (s.bullets || []).map(parseKeywordLine).filter(function(p) {
          return p.term || p.def;
        }).forEach(function(p) {
          var href = safeHref(p.def);
          if (href) line("- [" + (p.term || href) + "](" + href + ")");
          else line("- " + (p.term || "Link") + (p.def ? " — " + p.def : ""));
        });
      } else if (s.type === "split") {
        line("## " + n + ". " + (s.title || "Dual coding").replace(/\n/g, " "));
        line("");
        (s.bullets || []).filter(function(b) {
          return String(b).trim();
        }).forEach(function(b) {
          var tier = /^(\s{2,}|\t|- )/.test(b);
          var text2 = String(b).replace(/^(\s{2,}|\t|- )+/, "").trim();
          line((tier ? "  - " : "- ") + text2);
        });
        line("");
        line(s.image && String(s.image).indexOf("data:") === 0 ? "*Accompanying image (open in SlideForge to view).*" : s.image ? "![](" + s.image + ")" : "*Add an accompanying image for dual coding.*");
      } else {
        line("## " + n + ". " + (s.title || "Slide").replace(/\n/g, " "));
        line("");
        (s.bullets || []).filter(function(b) {
          return String(b).trim();
        }).forEach(function(b) {
          var tier = /^(\s{2,}|\t|- )/.test(b);
          var text2 = String(b).replace(/^(\s{2,}|\t|- )+/, "").trim();
          line((tier ? "  - " : "- ") + text2);
        });
      }
      var fb = slideFeedback(s);
      if (fb) {
        blank();
        line("### In-class activity · " + (FEEDBACK_KINDS[fb.kind] ? FEEDBACK_KINDS[fb.kind].label : fb.kind));
        line("");
        line("**Prompt:** " + (fb.prompt || ""));
        if (fb.kind === "poll" && fb.options && fb.options.length) {
          line("");
          fb.options.forEach(function(o) {
            line("- [ ] " + o);
          });
        } else {
          line("");
          line("*Respond in the live room (or jot a note here for practice).*");
        }
      }
      if (s.notes) {
        blank();
        line("<details><summary>Speaker notes</summary>");
        line("");
        line(s.notes);
        line("");
        line("</details>");
      }
    });
    blank();
    line("---");
    line("");
    line("_Exported for Canvas / Colab practice. Re-open the `.sfdeck.json` in SlideForge to host live._");
    return out.join("\n");
  }
  function parseMarkdownDeck(text2) {
    var raw = String(text2 || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    var lines = raw.split("\n");
    var i = 0;
    var frontTitle = "";
    if (lines[0] === "---") {
      i = 1;
      while (i < lines.length && lines[i] !== "---") {
        var fm = lines[i].match(/^\s*title\s*:\s*(.+?)\s*$/i);
        if (fm) frontTitle = fm[1].replace(/^["']|["']$/g, "").trim();
        i++;
      }
      if (i < lines.length && lines[i] === "---") i++;
    }
    function stripExportNum(t) {
      return String(t || "").replace(/^\d+\.\s+/, "").trim();
    }
    function isSkipLine(t) {
      var s2 = t.trim();
      if (!s2) return true;
      if (/^_Practice notes from SlideForge/i.test(s2)) return true;
      if (/^_Exported for Canvas/i.test(s2)) return true;
      if (/^<details/i.test(s2) || /^<\/details>/i.test(s2) || /^<summary/i.test(s2)) return true;
      if (/^###\s+In-class activity/i.test(s2)) return true;
      return false;
    }
    var slides = [];
    var deckTitle = frontTitle;
    var cur = null;
    function flush() {
      if (!cur) return;
      var title = stripExportNum(cur.title) || "Slide";
      var bullets = cur.bullets.filter(function(b) {
        return String(b).trim();
      });
      var paras = cur.body.split(/\n\n+/).map(function(p) {
        return p.trim();
      }).filter(Boolean);
      var image = cur.image || "";
      var quoteOnly = paras.length === 1 && /^>\s?/.test(paras[0]) && !bullets.length;
      var allQuotes = paras.length && paras.every(function(p) {
        return /^>\s?/.test(p);
      }) && !bullets.length;
      if ((/^quote$/i.test(title) || quoteOnly || allQuotes) && (paras.length || cur.body)) {
        var qBody = paras.map(function(p) {
          return p.replace(/^>\s?/, "").trim();
        }).join(" ");
        var attr2 = "";
        if (/^[—–\-]\s*/.test(cur.subtitle)) attr2 = cur.subtitle.replace(/^[—–\-]\s*/, "");
        slides.push({ type: "quote", title: "", body: qBody || title, subtitle: attr2 });
      } else if (image && !bullets.length && paras.length <= 1) {
        slides.push({
          type: "image",
          title: title === "Image" ? "" : title,
          image,
          subtitle: paras[0] || ""
        });
      } else if (bullets.length && bullets.every(function(b) {
        return /^\d+\.\s+/.test(b);
      })) {
        slides.push({
          type: "cards",
          title,
          bullets: bullets.map(function(b) {
            return b.replace(/^\d+\.\s+/, "").trim();
          })
        });
      } else if (bullets.length && bullets.every(function(b) {
        return /\*\*[^*]+\*\*\s*[—–\-:]/.test(b) || /\*[^*]+\*\s*[—–\-:]/.test(b);
      })) {
        slides.push({
          type: "keywords",
          title,
          bullets: bullets.map(function(b) {
            var m = b.match(/^\*\*?([^*]+)\*\*?\s*[—–\-:]\s*(.*)$/);
            return m ? m[1].trim() + "	" + m[2].trim() : b;
          })
        });
      } else if (bullets.length && bullets.every(function(b) {
        return /\[[^\]]+\]\([^)]+\)/.test(b);
      })) {
        slides.push({
          type: "links",
          title,
          bullets: bullets.map(function(b) {
            var m = b.match(/\[([^\]]+)\]\(([^)]+)\)/);
            return m ? m[1].trim() + "	" + m[2].trim() : b;
          })
        });
      } else if (!bullets.length && !image && paras.length <= 1) {
        var kind = slides.length === 0 ? "title" : "section";
        slides.push({ type: kind, title, subtitle: paras[0] || cur.subtitle || "" });
      } else {
        slides.push({
          type: "content",
          title,
          bullets: bullets.length ? bullets.map(function(b) {
            return b.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "").trim();
          }) : [],
          body: bullets.length ? "" : paras.join("\n\n"),
          image
        });
      }
      cur = null;
    }
    function startSlide(title) {
      flush();
      cur = { type: "content", title, subtitle: "", body: "", bullets: [], image: "" };
      return (
        /** @type {{ type: string, title: string, subtitle: string, body: string, bullets: string[], image: string }} */
        cur
      );
    }
    for (; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();
      if (/^---+$/.test(trimmed)) {
        if (cur) flush();
        continue;
      }
      if (isSkipLine(line) && !cur) continue;
      var h1 = line.match(/^#\s+(.+)$/);
      if (h1 && !cur && !deckTitle) {
        deckTitle = h1[1].trim();
        continue;
      }
      if (h1 && !cur && deckTitle) {
        startSlide(h1[1].trim());
        continue;
      }
      var h2 = line.match(/^##\s+(.+)$/);
      if (h2) {
        startSlide(h2[1].trim());
        continue;
      }
      var s;
      if (cur) {
        s = cur;
      } else {
        if (!trimmed || isSkipLine(line)) continue;
        s = startSlide(deckTitle || "Slide");
      }
      if (/^###\s+/.test(line)) continue;
      var img = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
      if (img) {
        if (!s.image) s.image = img[2];
        continue;
      }
      var attr = trimmed.match(/^[—–]\s+(.+)$/);
      if (attr && (s.body || s.bullets.length)) {
        s.subtitle = "— " + attr[1].trim();
        continue;
      }
      if (/^>\s?/.test(trimmed)) {
        s.body = (s.body ? s.body + "\n\n" : "") + trimmed;
        continue;
      }
      if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
        s.bullets.push(trimmed);
        continue;
      }
      if (!trimmed) {
        if (s.body && !/\n\n$/.test(s.body)) s.body += "\n\n";
        continue;
      }
      if (isSkipLine(line)) continue;
      if (!s.bullets.length && !s.body && !s.subtitle && s.title && trimmed.length < 120) {
        s.subtitle = trimmed;
        continue;
      }
      s.body = (s.body ? s.body.replace(/\n\n$/, "\n") + (s.body ? "\n" : "") : "") + trimmed;
    }
    flush();
    if (!deckTitle) deckTitle = slides[0] && slides[0].title || "Imported from Markdown";
    return { title: deckTitle, slides };
  }

  // src/samples/deck.json
  var deck_default = {
    title: "Sample deck & quiz",
    slides: [
      {
        type: "title",
        title: "SlideForge",
        subtitle: "Presentations and quizzes, straight from the browser",
        notes: "Press the right arrow or space to advance. Press ? during the show for all shortcuts."
      },
      {
        type: "content",
        title: "What this does",
        bullets: [
          "Build slides in the editor on the left",
          "Present full screen in 16:9, like a PowerPoint show",
          "Drop quiz slides anywhere in the deck",
          "Score the room live, or click through answers yourself"
        ]
      },
      {
        type: "section",
        title: "Quiz time",
        subtitle: "Three questions"
      },
      {
        type: "quiz",
        question: "What aspect ratio is a modern widescreen slide?",
        options: [
          "4:3",
          "16:9",
          "1:1",
          "21:9"
        ],
        correct: 1,
        timeLimit: 20
      },
      {
        type: "quiz",
        question: "Which key blanks the screen mid-presentation?",
        options: [
          "B",
          "Q",
          "X",
          "M"
        ],
        correct: 0,
        timeLimit: 15
      },
      {
        type: "results",
        title: "How did you do?"
      }
    ]
  };

  // src/core/identity.js
  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  // src/samples/quiz.json
  var quiz_default = [
    {
      question: "What aspect ratio is a modern widescreen slide?",
      options: [
        "4:3",
        "16:9",
        "1:1",
        "21:9"
      ],
      correct: 1,
      timeLimit: 20,
      points: null,
      image: "",
      notes: ""
    },
    {
      question: "Which key blanks the screen mid-presentation?",
      options: [
        "B",
        "Q",
        "X",
        "M"
      ],
      correct: 0,
      timeLimit: 15,
      points: null,
      image: "",
      notes: ""
    },
    {
      question: "How many teams can a SlideForge game have?",
      options: [
        "Two",
        "Four",
        "Six",
        "Unlimited"
      ],
      correct: 2,
      timeLimit: 15,
      points: null,
      image: "",
      notes: ""
    }
  ];

  // src/games/factories.js
  function makeQuestion(style) {
    var base = {
      id: uid(),
      timeLimit: null,
      // null = inherit the game default
      points: null,
      // null = inherit the game default
      image: "",
      imageAlt: "",
      // described to the phones and any screen reader
      /* 'band'    question above, image below it, answers under
         'first'   image first, question in its own box beneath it
         'overlay' image leads, question sits on it behind a gradient */
      imageLayout: "band",
      notes: "",
      /* What kind of thinking this question asks for. Per question, not per
         game: a quiz that checks recall and then application is exactly the
         shape the Adapt report can say something useful about, and it cannot
         if every question in the game shares one level. */
      bloom: "",
      /* Collect the vote and never show the answer.
         For peer instruction: the room commits, the split goes up, nobody is
         told who was right, they argue, and the *second* question of the pair
         is the one that resolves. Without this the app reveals as soon as
         everyone has answered and there is nothing left to discuss. */
      voteOnly: false,
      /* Shown after the answer is revealed. A multiple-choice answer is often
         one or two words, which teaches very little on its own. */
      explanation: "",
      source: ""
      // optional "where to read more"
    };
    return Object.assign(base, gameStyle(style).make());
  }
  function makeGame(title, style) {
    style = style && GAME_STYLES[style] ? style : "choice";
    var g = {
      id: uid(),
      kind: "game",
      style,
      title: title || "Untitled game",
      theme: DEFAULT_THEME,
      libraryGroup: "",
      sourceDeckId: "",
      created: Date.now(),
      modified: Date.now(),
      settings: {
        mode: "individual",
        teams: [{ name: "Red" }, { name: "Blue" }, { name: "Green" }, { name: "Yellow" }],
        scoreboard: true,
        defaultTime: 20,
        defaultPoints: 1e3,
        intro: true,
        // opening "get ready" slide
        /* The rules of the format, on the wall. The old app kept these in a
           sidebar the room never saw, so a class met a new game by being
           talked through it while the teacher read from their own screen. */
        howTo: true,
        // "how to play" slide before the first question
        scoreSlide: true,
        // closing score slide
        /* 'inline'  expand it inside the correct answer's box on reveal
           'slide'   a dedicated full-screen slide after the question
           'both'    inline first, then the slide for the detail */
        explainStyle: "inline",
        /* Horse race only: steps to the finish line. */
        trackLength: 5,
        /* Ask each player how sure they were, after their answer is in. Never
           scored — it tells the teacher which wrong answers were confident. */
        confidence: true,
        /* A bed under the thinking time. Referenced, not embedded, for the
           same reason as video — and it plays on the projector only. Sending
           it to the phones would be twenty speakers a beat apart. */
        music: "",
        musicVolume: 55
      },
      questions: [makeQuestion(style)]
    };
    const engine = gameStyle(style);
    Object.assign(g.settings, engine.defaults || {});
    if (engine.starters) {
      g.questions = JSON.parse(JSON.stringify(engine.starters)).map(
        (row) => Object.assign(makeQuestion(style), row)
      );
    }
    return g;
  }
  function starterGame() {
    var g = makeGame("Sample quiz");
    g.settings.mode = "teams";
    g.settings.teams = [{ name: "Red" }, { name: "Blue" }];
    g.questions = JSON.parse(JSON.stringify(quiz_default)).map(
      (question) => Object.assign({ id: uid() }, question)
    );
    return g;
  }

  // src/games/catalogue.js
  var FORMATS = {
    "predict-outcome": {
      label: "Predict the outcome",
      answersLabel: "Possible outcomes — mark the likely one",
      answersHint: "Three futures reads better than four. The value is in committing before you know."
    },
    "spot-the-error": {
      label: "Spot the error",
      answersLabel: "Candidate phrases — mark the wrong one",
      answersHint: 'Quote the phrases from the sentence in the question, and include a "nothing is wrong" option so agreeing is a choice too.'
    },
    "odd-one-out": {
      label: "Odd one out",
      answersLabel: "The four items — mark the prepared odd one",
      answersHint: "Four equal tiles for discussion. The marked odd one and explanation are for the reveal — accept other defensible rules."
    },
    "low-stakes-quiz": {
      label: "Low-stakes quiz",
      answersHint: "Questions stay on the board; answers stay hidden until the quiz clock ends. Learners write on paper — no phone scoring."
    },
    "beat-the-clock": {
      label: "Beat the clock",
      answersHint: "Short countdown. Correct answers score 10 plus remaining seconds ÷ 10; wrong answers cost 5."
    },
    "true-false": {
      label: "True / false showdown",
      answersHint: "Fast retrieval. Use a short countdown — 10 to 30 seconds — not a Beat the Clock round."
    },
    "truefalse": {
      label: "True or false",
      answersHint: "A statement and two pads. Mark whether it is true or false."
    },
    "horse-race": { label: "Horse race" },
    "boss-battle": {
      label: "Boss battle",
      answersHint: "Set difficulty on each question — that is the damage a hit deals to the shared boss."
    },
    "definition-challenge": {
      label: "Definition challenge",
      answersHint: "Passage for reading, then a recall question. Accepted spellings mark the typed answer."
    },
    "emoji-guess": {
      label: "Emoji guess",
      answersHint: "The symbols go in the question. Accept the spellings a learner will actually type."
    },
    "fill-in-the-blanks": {
      label: "Fill in the blanks",
      answersHint: "Write the sentence with ______ where the word goes."
    },
    "time-traveler": {
      label: "Time traveler",
      answersHint: "A clue and a date in the question; the event is the answer."
    },
    "ranking": {
      label: "Ranking challenge",
      answersHint: "Part marks: each item in the right place scores. Full set is 10 points."
    },
    "word-reveal": {
      label: "Word reveal",
      answersHint: "Letters drip onto the wall. Guessing with fewer letters shown scores more."
    },
    "memory-flip": {
      label: "Memory flip",
      answersHint: "Study the pairs, then claim. Host marks each claim for +1."
    },
    "memory-match": {
      label: "Memory match",
      answersHint: "Same pairs as Memory Flip; claims rotate between teams."
    },
    "knowledge-flip": {
      label: "Knowledge flip",
      answersHint: "Keywords stay visible. Explain, then claim for +1."
    },
    "heads-up": {
      label: "Heads up",
      answersHint: "Describe the term without saying it. Host marks Correct (+1) or Pass."
    },
    "spin-explain": {
      label: "Spin & explain",
      answersHint: "Clear explanation +2, with a hint +1, reject 0."
    },
    "connection-maker": {
      label: "Connection maker",
      answersHint: "Two ideas and a spoken bridge. Host Accepts for +1."
    },
    "concept-chain": {
      label: "Concept chain",
      answersHint: "Grow a justified chain from each start term. Type the spoken link, then Accept (+1) — the chain grows on the wall."
    },
    "quiz-bowl": {
      label: "Quiz bowl",
      answersHint: "Category and point value on each cell. Correct scores that value."
    },
    "bingo": {
      label: "Bingo",
      answersHint: "Fill the term bank. A complete line wins — no points."
    },
    "random-challenge": {
      label: "Random challenge",
      answersHint: "Draw varied open challenges. Count attempts — no competitive scoreboard."
    },
    "compare-contrast": {
      label: "Compare & contrast",
      answersHint: "Two equal items for discussion. Similarities and differences are for the reveal — no score."
    },
    "question-cube": {
      label: "Question cube",
      answersHint: "Roll a prompt; open class discussion. No score."
    }
  };
  function gameFormat(key) {
    return FORMATS[key] || null;
  }
  var FORMAT_STYLE = {
    "choice": "choice",
    "truefalse": "truefalse",
    "type": "type",
    "slider": "slider",
    "true-false": "truefalse",
    "low-stakes-quiz": "lowstakes",
    "quiz-bowl": "bowl",
    "beat-the-clock": "speed",
    "boss-battle": "boss",
    "horse-race": "race",
    "memory-flip": "memoryflip",
    "memory-match": "memorymatch",
    "knowledge-flip": "knowledgeflip",
    "definition-challenge": "definition",
    "emoji-guess": "emoji",
    "word-reveal": "wordreveal",
    "fill-in-the-blanks": "type",
    "heads-up": "headsup",
    "spin-explain": "spinexplain",
    "spot-the-error": "choice",
    "ranking": "order",
    "odd-one-out": "oddone",
    "predict-outcome": "choice",
    "time-traveler": "type",
    "connection-maker": "connection",
    "random-challenge": "randomchallenge",
    "concept-chain": "conceptchain",
    "bingo": "bingo",
    "compare-contrast": "compare",
    "question-cube": "choice"
  };
  var CORE_STYLES = ["choice", "type", "slider", "order"];
  var SPECIAL_STYLES = [
    "truefalse",
    "race",
    "speed",
    "boss",
    "wordreveal",
    "memoryflip",
    "memorymatch",
    "knowledgeflip",
    "headsup",
    "spinexplain",
    "connection",
    "conceptchain",
    "randomchallenge",
    "bingo",
    "bowl",
    "lowstakes",
    "emoji",
    "definition",
    "oddone",
    "compare"
  ];
  function formatStyle(formatKey) {
    var s = FORMAT_STYLE[formatKey];
    return s && GAME_STYLES[s] ? s : null;
  }
  function isSpecialStyle(styleKey) {
    return SPECIAL_STYLES.indexOf(styleKey) > -1;
  }
  var INPUTS = ["choice", "text", "number", "order"];

  // src/storage.js
  function unusedDraft(doc) {
    if (!doc || !doc.id) return false;
    var title = String(doc.title || "").trim();
    if (title && !/^(untitled(\s+(deck|presentation|lesson|game))?)$/i.test(title)) {
      return false;
    }
    if (Array.isArray(doc.slides)) {
      if (doc.slides.length > 1) return false;
      var slide = doc.slides[0];
      if (!slide) return true;
      var text2 = [slide.title, slide.subtitle, slide.body, slide.image, slide.notes].concat(slide.bullets || []).map(function(value) {
        var t = String(value || "").replace(/\s+/g, " ").trim();
        if (t === "Presentation title" || t === "Your name") return "";
        return t;
      }).join("");
      return !text2;
    }
    if (Array.isArray(doc.questions)) {
      return doc.questions.every(function(q) {
        return !q || !String(q.question || "").trim();
      });
    }
    return false;
  }
  var LIBRARY_GROUPS = [
    { id: "nul", label: "Northeastern" },
    { id: "ukbt", label: "UK Black Tech" },
    { id: "ukbt-institute", label: "UKBT Institute" },
    { id: "aiad26", label: "AI Awareness Day 2026" },
    { id: "aiad27", label: "AI Awareness Day 2027" },
    { id: "other", label: "Other" }
  ];
  function libraryGroupFromTheme(theme) {
    if (theme === "northeastern") return "nul";
    if (theme === "ukbt") return "ukbt";
    if (theme === "ukbt-institute") return "ukbt-institute";
    if (theme && theme.indexOf("aiad26-") === 0) return "aiad26";
    if (theme && theme.indexOf("aiad27-") === 0) return "aiad27";
    return "other";
  }
  function normalizeLibraryGroup(raw, theme) {
    const id = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
    return id || libraryGroupFromTheme(theme);
  }
  function slugLibraryFolder(label) {
    return normalizeLibraryGroup(label, "") || "folder";
  }
  var FOLDER_KEY = "slideforge.libraryFolders.v1";
  function createLibraryFolders({ storage, warn = console.warn }) {
    function read() {
      try {
        const raw = JSON.parse(storage().getItem(FOLDER_KEY) || "{}");
        return {
          folders: Array.isArray(raw.folders) ? raw.folders : [],
          collapsed: raw.collapsed && typeof raw.collapsed === "object" ? raw.collapsed : {},
          labels: raw.labels && typeof raw.labels === "object" ? raw.labels : {}
        };
      } catch (error) {
        warn("Could not read library folders:", error);
        return { folders: [], collapsed: {}, labels: {} };
      }
    }
    function write(state) {
      try {
        storage().setItem(FOLDER_KEY, JSON.stringify(state));
        return true;
      } catch (error) {
        warn("Could not save library folders:", error);
        return false;
      }
    }
    function catalog() {
      const state = read();
      const seen = /* @__PURE__ */ Object.create(null);
      const out = LIBRARY_GROUPS.map(function(g) {
        seen[g.id] = true;
        return { id: g.id, label: String(state.labels[g.id] || g.label), builtin: true };
      });
      state.folders.forEach(function(f) {
        const id = normalizeLibraryGroup(f && f.id, "");
        if (!id || seen[id]) return;
        seen[id] = true;
        out.push({ id, label: String(f && f.label || id), builtin: false });
      });
      return out;
    }
    return {
      catalog,
      collapsed: function() {
        return read().collapsed;
      },
      setCollapsed: function(id, on) {
        const state = read();
        if (on) state.collapsed[id] = true;
        else delete state.collapsed[id];
        write(state);
      },
      rename: function(id, label) {
        const name = String(label || "").trim();
        if (!id || !name) return false;
        const state = read();
        if (LIBRARY_GROUPS.some(function(g) {
          return g.id === id;
        })) {
          state.labels[id] = name;
        } else {
          const row = state.folders.filter(function(f) {
            return f.id === id;
          })[0];
          if (row) row.label = name;
          else state.folders.push({ id, label: name });
        }
        return write(state);
      },
      create: function(label) {
        const name = String(label || "").trim();
        if (!name) return null;
        let id = slugLibraryFolder(name);
        const used = /* @__PURE__ */ Object.create(null);
        catalog().forEach(function(g) {
          used[g.id] = true;
        });
        let n = 2;
        const base = id;
        while (used[id]) {
          id = base + "-" + n;
          n++;
        }
        const state = read();
        state.folders.push({ id, label: name });
        write(state);
        return id;
      },
      remove: function(id) {
        if (!id || LIBRARY_GROUPS.some(function(g) {
          return g.id === id;
        })) return false;
        const state = read();
        state.folders = state.folders.filter(function(f) {
          return f.id !== id;
        });
        delete state.labels[id];
        delete state.collapsed[id];
        return write(state);
      }
    };
  }
  function createStores({ normalizeDeck: normalizeDeck2, normalizeGame: normalizeGame2, storage, warn = console.warn }) {
    function documents(kind, key, lastKey, normalize) {
      function read() {
        try {
          const raw = JSON.parse(storage().getItem(key) || "[]");
          return Array.isArray(raw) ? raw.map(normalize).filter(Boolean) : [];
        } catch (error) {
          warn("Could not read saved " + kind + ":", error);
          return [];
        }
      }
      function write(items) {
        try {
          storage().setItem(key, JSON.stringify(items));
          return true;
        } catch (error) {
          warn("Could not save " + kind + ":", error);
          return false;
        }
      }
      return {
        list() {
          return read().sort((a, b) => b.modified - a.modified);
        },
        save(document2, opts) {
          if (!(opts && opts.force) && unusedDraft(document2)) {
            const all2 = read();
            if (!all2.some((item) => item.id === document2.id)) return true;
          }
          if (kind === "decks" && document2 && !document2.libraryGroup) {
            document2.libraryGroup = libraryGroupFromTheme(document2.theme);
          }
          document2.modified = Date.now();
          const all = read();
          const index = all.findIndex((item) => item.id === document2.id);
          if (index === -1) all.push(document2);
          else all[index] = document2;
          const ok = write(all);
          try {
            storage().setItem(lastKey, document2.id);
          } catch (error) {
          }
          return ok;
        },
        remove(id) {
          write(read().filter((item) => item.id !== id));
        },
        /* Drop untitled blanks that never got content. keepId stays, so the
           document on screen is not yanked out from under the editor. */
        sweepUnused(keepId) {
          const all = read();
          const next = all.filter((item) => keepId && item.id === keepId || !unusedDraft(item));
          if (next.length !== all.length) write(next);
          return all.length - next.length;
        },
        clear() {
          write([]);
        },
        get(id) {
          return read().find((item) => item.id === id) || null;
        },
        lastId() {
          try {
            return storage().getItem(lastKey);
          } catch (error) {
            return null;
          }
        },
        read
      };
    }
    const decks = documents("decks", "slideforge.decks.v1", "slideforge.lastDeckId", normalizeDeck2);
    const games = documents("games", "slideforge.games.v1", "slideforge.lastGameId", normalizeGame2);
    const { read: readDecks, ...Store2 } = decks;
    const { read: readGames, ...GameStoreBase } = games;
    const usedByDecks = (id) => readDecks().filter(
      (deck) => (deck.slides || []).some((slide) => slide.type === "game" && slide.gameId === id)
    );
    const GameStore2 = Object.assign(GameStoreBase, {
      usedByDecks,
      usedBy: (id) => usedByDecks(id).map((deck) => deck.title)
    });
    const LibraryFolders2 = createLibraryFolders({ storage, warn });
    return { Store: Store2, GameStore: GameStore2, LibraryFolders: LibraryFolders2 };
  }

  // src/games/scoring.js
  function claimPoints(accepted) {
    return accepted ? 1 : 0;
  }

  // src/games/presets.js
  var GAME_FORMAT_PRESETS = {
    "low-stakes-quiz": {
      style: "lowstakes",
      title: "Low-stakes quiz",
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 180, confidence: false, defaultPoints: 0 },
      seeds: [
        { question: "What does RAM stand for?", answer: "Random Access Memory" },
        { question: "What is the function of the CPU?", answer: "To process instructions and perform calculations" },
        { question: "What type of storage is an SSD?", answer: "Solid State Drive / Flash storage" },
        { question: "What does ROM contain?", answer: "Read Only Memory / Boot instructions / BIOS" },
        { question: "What is cache memory used for?", answer: "Storing frequently accessed data for quick retrieval" }
      ]
    },
    "beat-the-clock": {
      style: "speed",
      title: "Beat the clock",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 60, confidence: false },
      seeds: [
        { question: "Which process releases energy from glucose in cells?", options: ["Photosynthesis", "Respiration", "Diffusion", "Osmosis"], correct: 1, explanation: "Respiration. Fast correct answers score more." },
        { question: "What is the speed of light in a vacuum?", options: ["300,000 km/s", "150,000 km/s", "3,000 km/s", "30,000 km/s"], correct: 0, explanation: "Approximately 300,000 km/s. Quick thinking scores high!" },
        { question: "Which organ filters waste from the blood to make urine?", options: ["Liver", "Kidneys", "Heart", "Stomach"], correct: 1, explanation: "Kidneys filter blood and regulate water balance." }
      ]
    },
    "true-false": {
      style: "truefalse",
      title: "True / false showdown",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 15, confidence: false },
      seeds: [
        { question: "Mitochondria are found only in animal cells.", options: ["True", "False"], correct: 1, explanation: "Plant cells have them too — they respire as well as photosynthesise." },
        { question: "Light travels faster than sound in air.", options: ["True", "False"], correct: 0, explanation: "True! Light travels ~300,000 km/s while sound is ~343 m/s." },
        { question: "The human heart has five chambers.", options: ["True", "False"], correct: 1, explanation: "False — the human heart has four chambers: two atria and two ventricles." }
      ]
    },
    "truefalse": {
      style: "truefalse",
      title: "True or false",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 15 },
      seeds: [
        { question: "Mitochondria are found only in animal cells.", options: ["True", "False"], correct: 1, explanation: "Plant cells have them too — they respire as well as photosynthesise." },
        { question: "Water expands when it freezes into ice.", options: ["True", "False"], correct: 0, explanation: "True! Water molecules form an open crystalline lattice." },
        { question: "Light travels faster than sound in air.", options: ["True", "False"], correct: 0, explanation: "True! Light travels ~300,000 km/s while sound is ~343 m/s." }
      ]
    },
    "horse-race": {
      style: "race",
      title: "Horse race",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 20, mode: "teams", trackLength: 5 },
      seeds: [
        { question: "Which organelle is known as the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Vacuole"], correct: 1, explanation: "Mitochondria release cellular energy through respiration." },
        { question: "Which blood vessel carries oxygenated blood away from the heart?", options: ["Vein", "Artery", "Capillary", "Vena cava"], correct: 1, explanation: "Arteries carry blood away from the heart at higher pressure." },
        { question: "What gas do plants absorb from the air during photosynthesis?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], correct: 1, explanation: "Carbon dioxide enters leaves via stomata to build glucose." },
        { question: "What is the chemical formula for water?", options: ["CO2", "NaCl", "H2O", "O2"], correct: 2, explanation: "H2O: two hydrogen atoms bonded to one oxygen atom." },
        { question: "Which body system produces hormones to regulate functions?", options: ["Endocrine", "Nervous", "Digestive", "Respiratory"], correct: 0, explanation: "The endocrine system secretes hormones directly into the bloodstream." }
      ]
    },
    "boss-battle": {
      style: "boss",
      title: "Boss battle",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 30, confidence: false, mode: "teams" },
      seeds: [
        { question: "Which organelle contains chlorophyll?", options: ["Nucleus", "Mitochondrion", "Chloroplast", "Ribosome"], correct: 2, difficulty: "easy", explanation: "Chloroplasts. An easy hit — 1 damage." },
        { question: "Which process releases energy from glucose?", options: ["Photosynthesis", "Respiration", "Diffusion", "Osmosis"], correct: 1, difficulty: "medium", explanation: "Respiration. A medium hit — 2 damage." },
        { question: "Why does an enzyme stop working above its optimum temperature?", options: ["It dissolves", "Its active site changes shape", "It runs out", "It freezes"], correct: 1, difficulty: "hard", explanation: "It denatures — the active site changes shape. A hard hit — 3 damage." },
        { question: "Explain why water moves into a cell placed in pure water.", options: ["Active transport", "Osmosis down a water potential gradient", "Diffusion of solutes", "It does not move"], correct: 1, difficulty: "boss", explanation: "Osmosis, down a water potential gradient. The boss blow — 5 damage." }
      ]
    },
    "predict-outcome": {
      style: "choice",
      title: "Predict the outcome",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 30, confidence: true },
      seeds: [
        { question: "A plant is moved from a sunny window to a dark cupboard for two weeks. What happens?", options: ["It grows taller and paler, reaching for light", "It stops growing entirely and stays the same", "It grows shorter and greener"], correct: 0, explanation: "Etiolation: without light it invests in stem length rather than leaf, and makes less chlorophyll." },
        { question: "An ice cube is added to a cup of hot water. What happens to the thermal energy?", options: ["Thermal energy flows from hot water into the ice", "Cold energy flows from the ice into the water", "Energy is destroyed until temperatures balance"], correct: 0, explanation: "Heat naturally flows from the higher temperature region to the lower temperature region." }
      ]
    },
    "spot-the-error": {
      style: "choice",
      title: "Spot the error",
      settings: { scoreboard: true, scoreSlide: false, defaultTime: 0 },
      seeds: [
        { question: 'Which part of this is wrong?\n\n"Photosynthesis happens in the mitochondria, uses carbon dioxide and water, and releases oxygen."', options: ["happens in the mitochondria", "uses carbon dioxide and water", "releases oxygen", "nothing is wrong"], correct: 0, explanation: "Chloroplasts, not mitochondria. Mitochondria carry out respiration." }
      ]
    },
    "odd-one-out": {
      style: "oddone",
      title: "Odd one out",
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, defaultPoints: 0 },
      seeds: [
        { options: ["Iron", "Copper", "Oxygen", "Zinc"], correct: 2, explanation: "Oxygen is a non-metal. Accept any defensible rule a learner can argue for." },
        { options: ["Mitochondrion", "Chloroplast", "Nucleus", "Ribosome"], correct: 1, explanation: "Chloroplasts are for photosynthesis; the others appear in typical animal cells too." },
        { options: ["Photosynthesis", "Respiration", "Diffusion", "Osmosis"], correct: 0, explanation: "Photosynthesis builds glucose; the others move substances or release energy." },
        { options: ["CPU", "RAM", "SSD", "HDMI"], correct: 3, explanation: "HDMI is a display connection; the others are core computer components." }
      ]
    },
    "compare-contrast": {
      style: "compare",
      title: "Compare & contrast",
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, defaultPoints: 0 },
      seeds: [
        { itemA: "Photosynthesis", itemB: "Respiration", category: "Science", similarities: "Both involve energy and gases moving in living cells.", differences: "Photosynthesis stores energy in glucose; respiration releases it." },
        { itemA: "RAM", itemB: "SSD", category: "ICT", similarities: "Both store data the computer uses.", differences: "RAM is volatile and fast for working memory; an SSD keeps files when power is off." },
        { itemA: "Democracy", itemB: "Dictatorship", category: "History", similarities: "Both are ways a state can be governed.", differences: "In a democracy power is shared through voting; in a dictatorship one person or clique holds it." },
        { itemA: "Metaphor", itemB: "Simile", category: "Literature", similarities: "Both compare one thing to another in writing.", differences: "A simile uses like or as; a metaphor says something is something else." }
      ]
    },
    "definition-challenge": {
      style: "definition",
      title: "Definition challenge",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 30, confidence: false, defaultPoints: 1 },
      seeds: [
        { passage: "A catalyst speeds up a reaction by lowering the activation energy. It is not consumed, so the same catalyst can work again and again.", question: "What is not used up in the reaction?", accept: ["the catalyst", "catalyst"], explanation: "Not being consumed is the defining property — it is why a small amount goes a long way." },
        { passage: "Osmosis is the diffusion of water across a partially permeable membrane, from a dilute solution to a more concentrated one.", question: "What substance moves in osmosis?", accept: ["water"], explanation: "Only water moves through the membrane in osmosis." },
        { passage: "RAM is volatile memory: it stores data the CPU is using right now, and that data is lost when power is removed.", question: "What happens to data in RAM when the computer is switched off?", accept: ["it is lost", "lost", "it disappears", "cleared", "it is cleared"], explanation: "Volatile means the contents vanish without power." }
      ]
    },
    "emoji-guess": {
      style: "emoji",
      title: "Emoji guess",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 20 },
      seeds: [
        { clues: "🌱 ☀️ 💧 → 🌿", accept: ["photosynthesis"], hint: "How a plant makes its own food", difficulty: "easy", explanation: "Plant, light and water making growth." },
        { clues: "🧪 🔥 → ⚡", accept: ["respiration", "aerobic respiration"], hint: "Releasing energy from glucose", difficulty: "medium", explanation: "Cellular respiration releasing energy." },
        { clues: "💧 → 🧱 → 🌿", accept: ["osmosis"], hint: "Water across a partially permeable membrane", difficulty: "hard", explanation: "Water moving down a water potential gradient." }
      ]
    },
    "fill-in-the-blanks": {
      style: "type",
      title: "Fill in the blanks",
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0 },
      seeds: [
        { question: "Water moves into a cell by ______, from where there is more water to where there is less.", accept: ["osmosis"], explanation: "Diffusion of water specifically, across a partially permeable membrane." },
        { question: "The organelle where protein synthesis occurs is the ______.", accept: ["ribosome", "ribosomes"], explanation: "Ribosomes assemble amino acids into proteins." }
      ]
    },
    "ranking": {
      style: "order",
      title: "Ranking challenge",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0 },
      seeds: [
        { question: "Put these British history events in order, earliest first.", options: ["Roman invasion of Britain", "Norman conquest", "English Civil War", "First World War"], explanation: "AD 43, 1066, 1642, 1914. Part marks for items placed correctly." },
        { question: "Order these memory speeds from fastest to slowest.", options: ["CPU Registers", "Cache Memory", "RAM", "Hard Drive"], explanation: "Registers on the CPU die are fastest, followed by cache, main RAM, and secondary storage." }
      ]
    },
    "time-traveler": {
      style: "type",
      title: "Time traveler",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 60 },
      seeds: [
        { question: "1928 — a researcher returns from holiday to a contaminated petri dish and notices bacteria around mould have died. What was discovered?", accept: ["penicillin"], explanation: "Alexander Fleming discovered penicillin in 1928." }
      ]
    },
    "word-reveal": {
      style: "wordreveal",
      title: "Word reveal",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, defaultPoints: 0 },
      seeds: [
        { question: "What biological process is this?", word: "PHOTOSYNTHESIS", hint: "How plants make food using light", accept: ["photosynthesis"], difficulty: "medium", dripInterval: 5, explanation: "Fewer letters shown when you guess means a higher score." },
        { question: "Name this subatomic particle.", word: "ELECTRON", hint: "Carries a negative charge in an atom", accept: ["electron"], difficulty: "easy", dripInterval: 4, explanation: "Electrons orbit the nucleus of an atom." }
      ]
    },
    "memory-flip": {
      style: "memoryflip",
      title: "Memory flip",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, defaultPoints: 1 },
      seeds: [
        { term: "Chloroplast", question: "Chloroplast", definition: "Organelle where photosynthesis happens", studySeconds: 10 },
        { term: "Mitochondrion", question: "Mitochondrion", definition: "Where respiration releases energy", studySeconds: 10 },
        { term: "Nucleus", question: "Nucleus", definition: "Contains genetic material and controls the cell", studySeconds: 10 },
        { term: "Ribosome", question: "Ribosome", definition: "Site of protein synthesis", studySeconds: 10 }
      ]
    },
    "memory-match": {
      style: "memorymatch",
      title: "Memory match",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, mode: "teams", defaultPoints: 1 },
      seeds: [
        { term: "Mitochondrion", question: "Mitochondrion", definition: "Where respiration releases energy", studySeconds: 10, rotateClaims: true },
        { term: "Nucleus", question: "Nucleus", definition: "Contains DNA and instructions for the cell", studySeconds: 10, rotateClaims: true },
        { term: "Cell membrane", question: "Cell membrane", definition: "Controls what enters and exits the cell", studySeconds: 10, rotateClaims: true },
        { term: "Chloroplast", question: "Chloroplast", definition: "Traps sunlight for photosynthesis", studySeconds: 10, rotateClaims: true }
      ]
    },
    "knowledge-flip": {
      style: "knowledgeflip",
      title: "Knowledge flip",
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, defaultPoints: 1 },
      seeds: [
        { term: "Osmosis", question: "Osmosis", definition: "Diffusion of water across a partially permeable membrane", studySeconds: 0 },
        { term: "Active transport", question: "Active transport", definition: "Movement of substances against a concentration gradient using energy", studySeconds: 0 },
        { term: "Diffusion", question: "Diffusion", definition: "Net movement of particles from high to low concentration", studySeconds: 0 },
        { term: "Enzyme", question: "Enzyme", definition: "A biological catalyst that speeds up chemical reactions", studySeconds: 0 }
      ]
    },
    "heads-up": {
      style: "headsup",
      title: "Heads up",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 60, confidence: false, defaultPoints: 1 },
      seeds: [
        { term: "Photosynthesis", question: "Photosynthesis", category: "Biology", explanation: "Plants using sunlight, water and CO2 to create glucose and oxygen." },
        { term: "Mitochondrion", question: "Mitochondrion", category: "Biology", explanation: "The organelle responsible for aerobic cellular respiration." },
        { term: "Gravity", question: "Gravity", category: "Physics", explanation: "The attractive force between masses in the universe." }
      ]
    },
    "spin-explain": {
      style: "spinexplain",
      title: "Spin & explain",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 20, confidence: false, defaultPoints: 2 },
      seeds: [
        { term: "Respiration", question: "Respiration", hint: "Energy from glucose", explanation: "Cellular reaction releasing energy in the form of ATP." },
        { term: "Diffusion", question: "Diffusion", hint: "Particle spread", explanation: "Movement of particles from high to low concentration." },
        { term: "Osmosis", question: "Osmosis", hint: "Water movement", explanation: "Movement of water molecules across a partially permeable membrane." }
      ]
    },
    "connection-maker": {
      style: "connection",
      title: "Connection maker",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0, confidence: false, defaultPoints: 1 },
      seeds: [
        { itemA: "Photosynthesis", itemB: "Respiration", question: "How do photosynthesis and respiration connect?", explanation: "Photosynthesis produces glucose and oxygen, which respiration consumes to release energy." },
        { itemA: "CPU", itemB: "RAM", question: "How do the CPU and RAM connect?", explanation: "The CPU reads and executes instructions and data held in RAM." }
      ]
    },
    "concept-chain": {
      style: "conceptchain",
      title: "Concept chain",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 45, confidence: false, defaultPoints: 1 },
      seeds: [
        { term: "Cell", prompt: "The basic unit of living things — what connects next?" },
        { term: "Tissue", prompt: "Groups of similar cells — how does this link onward?" },
        { term: "Organ", prompt: "Tissues working together — what comes after?" },
        { term: "System", prompt: "Organs cooperating — how does this reach the organism?" }
      ]
    },
    "random-challenge": {
      style: "randomchallenge",
      title: "Random challenge",
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false },
      seeds: [
        { challenge: "Explain this idea to someone who missed the last lesson.", question: "Explain this idea to someone who missed the last lesson.", explanation: "Summarize the core concept clearly without jargon." },
        { challenge: "Draw a diagram of the process on the board in 30 seconds.", question: "Draw a diagram of the process on the board in 30 seconds.", explanation: "Sketch the key stages with accurate labels." }
      ]
    },
    "bingo": {
      style: "bingo",
      title: "Bingo",
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, mode: "teams" },
      seeds: [
        { term: "Nucleus", question: "Nucleus", definition: "Holds the cell’s DNA and controls what it makes", gridSize: 3 },
        { term: "Cytoplasm", question: "Cytoplasm", definition: "The jelly where most of the cell’s reactions happen", gridSize: 3 },
        { term: "Cell membrane", question: "Cell membrane", definition: "Controls what gets into and out of the cell", gridSize: 3 },
        { term: "Mitochondrion", question: "Mitochondrion", definition: "Releases energy from glucose in respiration", gridSize: 3 },
        { term: "Ribosome", question: "Ribosome", definition: "Builds proteins from amino acids", gridSize: 3 },
        { term: "Vacuole", question: "Vacuole", definition: "Stores sap and keeps a plant cell firm", gridSize: 3 },
        { term: "Chloroplast", question: "Chloroplast", definition: "Traps light so the plant can photosynthesise", gridSize: 3 },
        { term: "Cell wall", question: "Cell wall", definition: "Stops a plant cell bursting when it fills with water", gridSize: 3 },
        { term: "Chromosome", question: "Chromosome", definition: "A long coiled molecule of DNA carrying many genes", gridSize: 3 },
        { term: "Enzyme", question: "Enzyme", definition: "A protein that speeds up one reaction and is not used up", gridSize: 3 },
        { term: "Diffusion", question: "Diffusion", definition: "Particles spreading from where there are many to where there are few", gridSize: 3 },
        { term: "Osmosis", question: "Osmosis", definition: "Water moving across a partially permeable membrane", gridSize: 3 }
      ]
    },
    "quiz-bowl": {
      style: "bowl",
      title: "Quiz bowl",
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, mode: "teams" },
      seeds: [
        { category: "Cells", pointValue: 100, targetScore: 1e3, question: "What is the jelly inside a cell called?", answer: "Cytoplasm" },
        { category: "Cells", pointValue: 200, targetScore: 1e3, question: "What molecule carries genetic information?", answer: "DNA" },
        { category: "Cells", pointValue: 300, targetScore: 1e3, question: "Which organelle releases energy in respiration?", answer: "The mitochondrion" },
        { category: "Transport", pointValue: 100, targetScore: 1e3, question: "Which way do particles move in diffusion?", answer: "From high to low concentration" },
        { category: "Transport", pointValue: 200, targetScore: 1e3, question: "What is the movement of water across a partially permeable membrane?", answer: "Osmosis" },
        { category: "Transport", pointValue: 300, targetScore: 1e3, question: "Which kind of transport needs energy from respiration?", answer: "Active transport" },
        { category: "Enzymes", pointValue: 100, targetScore: 1e3, question: "What kind of molecule is an enzyme?", answer: "A protein" },
        { category: "Enzymes", pointValue: 200, targetScore: 1e3, question: "What happens to an enzyme above its optimum temperature?", answer: "It denatures" },
        { category: "Enzymes", pointValue: 300, targetScore: 1e3, question: "What is the molecule an enzyme acts on called?", answer: "The substrate" }
      ]
    },
    "slider": {
      style: "slider",
      title: "Numerical estimate",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 20 },
      seeds: [
        { question: "In what year was the World Wide Web invented at CERN?", min: 1970, max: 2010, target: 1989, tolerance: 3, unit: "year", explanation: "Tim Berners-Lee invented the World Wide Web in 1989." },
        { question: "What percentage of the Earth’s surface is covered by water?", min: 0, max: 100, target: 71, tolerance: 5, unit: "%", explanation: "Oceans and seas cover approximately 71% of Earth." }
      ]
    },
    "choice": {
      style: "choice",
      title: "Multiple choice quiz",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 20 },
      seeds: [
        { question: "What is the main gas found in Earth’s atmosphere?", options: ["Nitrogen", "Oxygen", "Carbon dioxide", "Argon"], correct: 0, explanation: "Nitrogen makes up approximately 78% of the atmosphere." },
        { question: "Which particle carries a positive electrical charge?", options: ["Proton", "Neutron", "Electron", "Photon"], correct: 0, explanation: "Protons are positively charged and located in the atomic nucleus." },
        { question: "What is the freezing point of water on the Celsius scale?", options: ["0°C", "32°C", "100°C", "-10°C"], correct: 0, explanation: "Pure water freezes at 0°C (32°F) at standard atmospheric pressure." }
      ]
    },
    "type": {
      style: "type",
      title: "Short answer retrieval",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 30 },
      seeds: [
        { question: "What organelle is known as the powerhouse of the cell?", accept: ["mitochondria", "mitochondrion"], explanation: "Mitochondria generate most of the chemical energy needed to power the cell." },
        { question: "What is the chemical symbol for gold?", accept: ["Au"], explanation: "From the Latin aurum, meaning shining dawn." },
        { question: "What gas do plants absorb during photosynthesis?", accept: ["carbon dioxide", "CO2"], explanation: "Plants use carbon dioxide and water to produce glucose and oxygen." }
      ]
    },
    "order": {
      style: "order",
      title: "Ranking challenge",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0 },
      seeds: [
        { question: "Put these British history events in order, earliest first.", options: ["Roman invasion of Britain", "Norman conquest", "English Civil War", "First World War"], explanation: "AD 43, 1066, 1642, 1914. Part marks for items placed correctly." },
        { question: "Order these memory speeds from fastest to slowest.", options: ["CPU Registers", "Cache Memory", "RAM", "Hard Drive"], explanation: "Registers on the CPU die are fastest, followed by cache, main RAM, and secondary storage." }
      ]
    }
  };
  function getShowcaseGame(gameOrStyle, opts) {
    opts = opts || {};
    var gameObj = typeof gameOrStyle === "object" && gameOrStyle !== null ? gameOrStyle : null;
    var style = (gameObj ? gameObj.style : (
      /** @type {import('../types.js').GameStyleKey} */
      gameOrStyle
    )) || "choice";
    var format = gameObj && gameObj.format ? gameObj.format : "";
    if (!format) {
      var mapped = formatStyle(style);
      format = mapped || style;
    }
    var theme = gameObj && gameObj.theme || /** @type {import('../types.js').ThemeKey} */
    (opts.theme || "midnight");
    if (!opts.forceSample && gameObj && Array.isArray(gameObj.questions) && gameObj.questions.length > 0) {
      var engine = (
        /** @type {any} */
        GAME_STYLES[style] || GAME_STYLES.choice
      );
      var probs = [];
      if (engine && typeof engine.problems === "function") {
        probs = gameObj.questions.map(function(q, i) {
          try {
            return engine.problems(q, i + 1, gameObj);
          } catch (_err) {
            return "Validation error in Q" + (i + 1);
          }
        }).filter(Boolean);
      }
      if (engine && typeof engine.board === "function") {
        try {
          var bp = engine.board(gameObj);
          if (bp) probs.push(bp);
        } catch (_err) {
          probs.push("Board validation error");
        }
      }
      if (probs.length === 0) {
        return gameObj;
      }
    }
    var pre = GAME_FORMAT_PRESETS[format] || GAME_FORMAT_PRESETS[style] || null;
    if (!pre) {
      for (var k in FORMAT_STYLE) {
        if (FORMAT_STYLE[k] === style && GAME_FORMAT_PRESETS[k]) {
          pre = GAME_FORMAT_PRESETS[k];
          break;
        }
      }
    }
    var targetStyle = (
      /** @type {import('../types.js').GameStyleKey} */
      pre && pre.style && GAME_STYLES[pre.style] ? pre.style : GAME_STYLES[style] ? style : "choice"
    );
    var eng = GAME_STYLES[targetStyle];
    var showcaseGame = makeGame(pre && pre.title || "Sample " + (eng ? eng.label : targetStyle), targetStyle);
    showcaseGame.theme = theme;
    showcaseGame.format = format;
    if (pre && pre.settings) {
      Object.assign(showcaseGame.settings, pre.settings);
    }
    if (pre && pre.seeds && pre.seeds.length) {
      showcaseGame.questions = pre.seeds.map(function(s) {
        var q = makeQuestion(targetStyle);
        Object.assign(q, s);
        if (eng && typeof eng.normalize === "function") eng.normalize(q);
        return q;
      });
    } else if (pre && pre.seed) {
      var qSingle = makeQuestion(targetStyle);
      Object.assign(qSingle, pre.seed);
      if (eng && typeof eng.normalize === "function") eng.normalize(qSingle);
      showcaseGame.questions = [qSingle];
    } else {
      if (eng && eng.starters && eng.starters.length) {
        showcaseGame.questions = JSON.parse(JSON.stringify(eng.starters)).map(function(row) {
          var qStar = makeQuestion(targetStyle);
          Object.assign(qStar, row);
          if (typeof eng.normalize === "function") eng.normalize(qStar);
          return qStar;
        });
      }
    }
    return showcaseGame;
  }

  // src/model.js
  var runtime = window;
  var SLIDE_W = 1280;
  var SLIDE_H = 720;
  var CHART_TAXONOMY = [
    {
      key: "correlation",
      label: "Correlation",
      question: "Do two things move together?",
      note: "Be mindful that readers will often assume the relationship you show is causal.",
      kinds: ["scatter", "combo", "matrix"],
      home: ["scatter", "matrix"],
      missing: ["bubble", "connected scatterplot", "numeric XY heatmap"]
    },
    {
      key: "distribution",
      label: "Distribution",
      question: "What values occur, and how often?",
      note: "The shape — the skew — is often the point, and the thing a summary statistic hides.",
      kinds: ["histogram", "box"],
      home: ["histogram", "box"],
      missing: ["violin plot", "dot strip", "beeswarm", "population pyramid", "cumulative curve"]
    },
    {
      key: "time",
      label: "Change over time",
      question: "What is the trend?",
      note: "Give the period enough context for the reader to judge the change.",
      kinds: ["line", "area", "combo", "multiples"],
      home: ["line", "area", "combo", "multiples"],
      missing: ["slope", "candlestick", "calendar heatmap", "streamgraph", "fan chart"]
    },
    {
      key: "magnitude",
      label: "Magnitude",
      question: "Which is bigger?",
      note: "A counted number — barrels, dollars, people — reads better here than a rate.",
      kinds: ["bar", "hbar", "pictogram", "bullet", "radar"],
      home: ["bar", "pictogram", "radar"],
      missing: ["paired column", "lollipop", "marimekko", "proportional symbol", "parallel coordinates"]
    },
    {
      key: "ranking",
      label: "Ranking",
      question: "What is the order?",
      note: "Use where position matters more than the value itself. Sort it, and label the points of interest.",
      kinds: ["hbar", "bar", "dumbbell"],
      home: ["hbar"],
      missing: ["ordered proportional symbol", "dot strip", "slope", "lollipop", "bump"]
    },
    {
      key: "part",
      label: "Part-to-whole",
      question: "How does one thing divide up?",
      note: "Only worth it when the reader cares about the components, not just the total.",
      kinds: ["stack", "pie", "donut", "treemap", "waffle"],
      home: ["stack", "pie", "donut", "treemap", "waffle"],
      missing: ["marimekko", "arc", "voronoi", "Venn"]
    },
    {
      key: "flow",
      label: "Flow",
      question: "Where does it go?",
      note: "Volumes or intensity of movement between states, conditions or places.",
      kinds: ["sankey"],
      home: ["sankey"],
      missing: ["waterfall", "chord", "network"]
    },
    {
      key: "deviation",
      label: "Deviation",
      question: "How far from a baseline?",
      note: "Variation above and below a fixed reference — a target, a long-run average, zero.",
      kinds: ["bullet", "dumbbell"],
      home: ["bullet", "dumbbell"],
      missing: ["diverging bar", "diverging stacked bar", "spine", "surplus/deficit filled line"]
    },
    {
      key: "spatial",
      label: "Spatial",
      question: "Where, on a map?",
      note: "Only when location matters more to the reader than anything else about the data.",
      kinds: [],
      home: [],
      missing: ["choropleth", "proportional symbol", "flow map", "contour", "cartogram", "dot density", "heat map"]
    }
  ];
  function chartCategories(kind) {
    return CHART_TAXONOMY.filter(function(c) {
      return c.kinds.indexOf(kind) >= 0;
    });
  }
  function chartPrimaryCategory(kind) {
    var owned = CHART_TAXONOMY.filter(function(c) {
      return (c.home || []).indexOf(kind) >= 0;
    })[0];
    return owned || chartCategories(kind)[0] || null;
  }
  var ASPECTS = {
    "16:9": { h: 720, label: "16:9 — widescreen, most projectors" },
    "16:10": { h: 800, label: "16:10 — a little taller, common on laptops" },
    "4:3": { h: 960, label: "4:3 — older lecture-theatre projectors" }
  };
  function slideHeight(deck) {
    var a = deck && ASPECTS[deck.aspect];
    return a ? a.h : SLIDE_H;
  }
  var COMPOSITIONS = {
    poster: { label: "Poster · bold headline and graphic", types: ["title", "section", "statement", "quote"] },
    editorial: { label: "Editorial · offset headline", types: ["title", "section", "statement", "quote"] },
    frame: { label: "Frame · centred with breathing room", types: ["title", "section", "statement", "quote"] },
    sidecar: { label: "Side by side · headline and support", types: ["title", "section"] },
    rail: { label: "Side heading · points alongside", types: ["content"] },
    columns: { label: "Columns · parallel ideas", types: ["content"] },
    "poster-art": { label: "Poster with artwork", types: ["title"], structured: true },
    voice: { label: "Voice · large quotation", types: ["quote"], structured: true },
    ballot: { label: "Ballot · lettered choices", types: ["cards"], structured: true },
    prompt: { label: "Discussion · one question", types: ["statement"], structured: true },
    rules: { label: "Rules · numbered steps", types: ["journey"], structured: true },
    commitment: { label: "Commitment · a next action", types: ["keyfact"], structured: true },
    comparison: { label: "Comparison · paired rows", types: ["compare"], structured: true },
    "reveal-map": { label: "Reveal map · labelled risks or factors", types: ["iceberg"], structured: true },
    credits: { label: "Credits · contribution record", types: ["sourcecheck"], structured: true },
    lanes: { label: "Decision lanes · below / at least 50", types: ["spectrum"], structured: true }
  };
  function compositionOptions(slide, _theme) {
    return Object.keys(COMPOSITIONS).filter(function(key) {
      return COMPOSITIONS[key].types.includes(slide.type);
    });
  }
  function slideComposition(deck, slide) {
    var explicit = (slide.design || {}).composition;
    if (explicit === "none") return "";
    var defaults = (THEMES[deck && deck.theme] || {}).defaults || {};
    var key = explicit || defaults[slide.type] || "";
    return compositionOptions(slide).includes(key) ? key : "";
  }
  var TRANSITIONS = (
    /** @type {const} */
    ["none", "fade", "push", "zoom", "wipe", "morph"]
  );
  var GALLERY_MAX = 8;
  var EXPLORATION_TYPES = ["beforeafter", "explore", "simulation", "chart", "spotfake"];
  var TEAM_COLORS = ["#e8474f", "#2b7ce9", "#e8a020", "#29a86b", "#8b5cf0", "#d4477f"];
  var MAX_TEAMS = 6;
  function teamColor(i) {
    return TEAM_COLORS[i % TEAM_COLORS.length];
  }
  function makeQuizConfig() {
    var config = {
      mode: "individual",
      // 'individual' | 'teams'
      teams: [{ name: "Red" }, { name: "Blue" }, { name: "Green" }, { name: "Yellow" }],
      scoreboard: true
      // keep the running score on screen
    };
    return config;
  }
  function normalizeQuizConfig(raw) {
    var q = Object.assign(makeQuizConfig(), raw || {});
    if (q.mode !== "teams") q.mode = "individual";
    q.teams = (Array.isArray(q.teams) ? q.teams : []).map(function(t) {
      return { name: String((typeof t === "string" ? t : t && t.name) || "").trim().slice(0, 20) };
    }).filter(function(t) {
      return t.name;
    }).slice(0, MAX_TEAMS);
    var seen = {};
    q.teams = q.teams.filter(function(t) {
      var k = t.name.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
    if (q.mode === "teams" && q.teams.length < 2) {
      q.teams = makeQuizConfig().teams.slice(0, 2);
    }
    q.scoreboard = q.scoreboard !== false;
    return q;
  }
  function isSlideType(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(SLIDE_TYPES, value);
  }
  function makeSlide(type2) {
    var s = {
      id: uid(),
      type: type2 || "content",
      title: "",
      subtitle: "",
      body: "",
      bullets: (
        /** @type {string[]} */
        []
      ),
      notes: "",
      image: "",
      imageFit: "cover",
      imageSide: "right",
      video: "",
      videoPoster: "",
      videoStart: 0,
      // seconds in, for a clip inside a longer file
      videoEnd: 0,
      // seconds, where to stop; 0 means play to the end
      videoLoop: false,
      videoMuted: false,
      videoAutoplay: false,
      // honoured on the projector, never in a preview
      tableHeader: true,
      /* Chart layout: bar, line or pie over the same text a table slide uses. */
      chartKind: (
        /** @type {'bar'|'stack'|'hbar'|'line'|'area'|'pie'|'donut'|'scatter'|'histogram'|'box'|'pictogram'|'radar'|'sankey'|'treemap'|'bullet'|'combo'|'waffle'} */
        "bar"
      ),
      /* Where the numbers came from, and what they are not. See the note in
         normalizeSlide. */
      chartSource: "",
      chartIcon: "",
      chartUnit: 1,
      /* Image stack: each layer is one picture with its own caption and source,
         shown one in front of the last. Empty on every other kind of slide. */
      layers: (
        /** @type {import('./types.js').GalleryLayer[]} */
        []
      ),
      /* Chart callouts: which categories to zoom to, in order, and what to say
         about each. Empty on every other layout. */
      callouts: (
        /** @type {{label: string, note: string}[]} */
        []
      ),
      transition: "fade",
      buildMode: (
        /** @type {'hide'|'dim'} */
        "hide"
      ),
      // quiz fields
      question: "",
      options: (
        /** @type {string[]} */
        []
      ),
      correct: 0,
      timeLimit: 0,
      points: 1e3,
      // game embed
      gameId: "",
      gameTitle: "",
      // audience feedback attached to this slide (null = none)
      feedback: null
    };
    if (EXPLORATION_TYPES.indexOf(s.type) >= 0) s.exploration = normalizeExploration(null);
    switch (s.type) {
      case "title":
        s.title = "Presentation title";
        s.subtitle = "Your name";
        break;
      case "journey":
        s.title = "The journey ahead";
        s.subtitle = "Reveal each milestone as you explain it";
        s.bullets = ["Start	Frame the question.", "Develop	Explore and build.", "Reflect	Evaluate and improve."];
        s.progressive = true;
        break;
      case "mindmap":
        s.title = "Central idea";
        s.bullets = ["Discover	What can we find?", "Explain	What does it mean?", "Decide	What should happen next?"];
        s.progressive = true;
        break;
      case "introduction":
        s.title = "Your name";
        s.subtitle = "Job title";
        s.body = "A little about your teaching, experience and interests.";
        break;
      case "section":
        s.title = "Section heading";
        break;
      case "cards":
      case "content":
        s.title = "Slide title";
        s.bullets = ["First point", "Second point", "Third point"];
        break;
      case "keywords":
        s.title = "Key vocabulary";
        s.bullets = [
          formatKeywordLine("Keyword", "a short plain-language definition"),
          formatKeywordLine("", ""),
          formatKeywordLine("", "")
        ];
        break;
      case "italics":
        s.title = "Phrases to notice";
        s.bullets = [
          formatKeywordLine("key phrase", "why this wording matters"),
          formatKeywordLine("", ""),
          formatKeywordLine("", "")
        ];
        break;
      case "links":
        s.title = "Further reading";
        s.bullets = [
          formatKeywordLine("Resource title", "https://"),
          formatKeywordLine("", ""),
          formatKeywordLine("", "")
        ];
        break;
      case "split":
        s.title = "Say it. Show it.";
        s.bullets = ["First point", "Second point", "Third point"];
        s.imageSide = "right";
        break;
      case "image":
        s.title = "Image slide";
        break;
      case "stats":
        s.title = "The numbers that matter";
        s.bullets = [
          formatInfoLine("Label", "Value", "Note"),
          formatInfoLine("", "", ""),
          formatInfoLine("", "", "")
        ];
        break;
      case "compare":
        s.title = "Side by side";
        s.subtitle = "Option A | Option B";
        s.bullets = [formatInfoLine("", ""), formatInfoLine("", ""), formatInfoLine("", "")];
        break;
      case "funnel":
        s.title = "Where the numbers thin out";
        s.bullets = [
          formatInfoLine("Stage", "Value", "Note"),
          formatInfoLine("", "", ""),
          formatInfoLine("", "", ""),
          formatInfoLine("", "", "")
        ];
        break;
      case "spectrum":
        s.title = "Where does each one sit?";
        s.subtitle = "Never worth it | Always worth it";
        s.bullets = [
          formatInfoLine("Something", "20", "Why it sits there"),
          formatInfoLine("", "50", ""),
          formatInfoLine("", "85", "")
        ];
        break;
      case "sourcecheck":
        s.title = '"The claim, quoted as it was made"';
        s.bullets = [
          formatInfoLine("Who", "The source", ""),
          formatInfoLine("When", "The date", ""),
          formatInfoLine("Basis", "What it rests on", ""),
          formatInfoLine("Gap", "What it does not say", "")
        ];
        s.progressive = true;
        break;
      case "shift":
        s.title = "How fast this moved";
        s.bullets = [
          formatInfoLine("Then", "100", "Where it started"),
          formatInfoLine("Now", "400", "Where it is"),
          formatInfoLine("Next", "", "Where it goes")
        ];
        break;
      case "spotfake":
        s.title = "Which one is real?";
        s.subtitle = "A | B";
        s.correct = 0;
        s.bullets = ["The first tell", "The second tell", "The third tell"];
        s.progressive = true;
        break;
      case "iceberg":
        s.title = "The hidden costs";
        s.subtitle = "What you see";
        s.bullets = [
          formatInfoLine("What it costs", "Value", "Note"),
          formatInfoLine("", "", ""),
          formatInfoLine("", "", "")
        ];
        s.progressive = true;
        break;
      case "timeline":
        s.title = "How we got here";
        s.bullets = [
          formatInfoLine("Date", "Event", "Detail"),
          formatInfoLine("", "", ""),
          formatInfoLine("", "", ""),
          formatInfoLine("", "", "")
        ];
        break;
      case "quote":
        s.body = "A quotation that makes the point better than a bullet list would.";
        s.subtitle = "Attribution";
        break;
      case "code":
        s.title = "Code that writes itself";
        s.language = "python";
        s.typewrite = true;
        s.typeSpeed = 55;
        s.code = 'import pandas as pd\n\ndf = pd.read_csv("attendance.csv")\nby_week = df["week"].value_counts().sort_index()\nprint(by_week.head())\n';
        break;
      case "quiz":
        s.question = "Which of these is correct?";
        s.options = ["Option A", "Option B", "Option C", "Option D"];
        s.correct = 0;
        s.timeLimit = 20;
        break;
      case "results":
        s.title = "Results";
        break;
      case "beforeafter":
        s.title = "What changed?";
        break;
      case "explore":
        s.title = "Look closer";
        break;
      case "simulation":
        s.title = "What happens when the input changes?";
        break;
      case "game":
        s.title = "Game";
        s.transition = "zoom";
        break;
    }
    return s;
  }
  function makeDeck(title) {
    var deck = {
      id: uid(),
      title: title || "Untitled deck",
      /* The house theme. This was midnight, so New blank document handed back
         a navy deck inside a sage app — and makeLesson had to override it to
         studio to get the default anyone actually sees. */
      theme: DEFAULT_THEME,
      /* Which catalogue format this game was created as.
         The engine is how it plays; the format is what it is for. Without
         this, every preset over `choice` authored as "Multiple choice" and a
         teacher who picked "Predict the Outcome" lost the name, the wording
         and the reason the moment the game existed. Free text rather than an
         enum: a format that is retired should leave old games readable. */
      format: "",
      showSlideNumbers: true,
      /* Close the lesson on the scores. An embedded game puts its own board up
         the moment that game ends — which is mid-lesson, and gone by the time
         anyone leaves. Off by default: a deck that ends on a reflection slide
         should keep ending there unless the teacher asks otherwise. */
      finalScores: false,
      /* '16:9' | '16:10' | '4:3' — see ASPECTS. */
      aspect: "16:9",
      logo: "",
      logoOn: "none",
      // 'none' | 'title' | 'all'
      quiz: makeQuizConfig(),
      created: Date.now(),
      modified: Date.now(),
      slides: (
        /** @type {any[]} */
        []
      )
    };
    deck.slides.push(makeSlide("title"));
    return deck;
  }
  function starterDeck() {
    const deck = makeDeck(deck_default.title);
    deck.slides = deck_default.slides.map(
      (template) => Object.assign(
        makeSlide(isSlideType(template.type) ? template.type : "content"),
        JSON.parse(JSON.stringify(template))
      )
    );
    return deck;
  }
  function normalizeSlide(raw) {
    var base = makeSlide(isSlideType(raw && raw.type) ? raw.type : "content");
    var s = Object.assign(base, raw || {});
    s.id = s.id || uid();
    if (!SLIDE_TYPES[s.type]) s.type = "content";
    if (!Array.isArray(s.bullets)) s.bullets = [];
    var rawOptions = raw && Array.isArray(raw.options) ? raw.options : [];
    s.options = rawOptions.map(function(o) {
      return typeof o === "string" ? o : o && o.text || "";
    });
    s.correct = Math.max(0, Math.min(s.options.length - 1, Number(s.correct) || 0));
    s.timeLimit = Math.max(0, Number(s.timeLimit) || 0);
    s.points = Number(s.points) || 1e3;
    if (TRANSITIONS.indexOf(s.transition) === -1) s.transition = "fade";
    if (s.journeyMode != null) s.journeyMode = s.journeyMode === "handover" || s.journeyMode === "stepper" ? s.journeyMode : "path";
    if (s.date != null) s.date = /^\d{4}-\d{2}-\d{2}$/.test(String(s.date)) && Number.isFinite(Date.parse(s.date)) ? String(s.date) : "";
    s.gameId = String(s.gameId || "");
    s.gameTitle = String(s.gameTitle || "");
    s.imageSide = s.imageSide === "left" ? "left" : "right";
    s.video = safeMedia(s.video);
    s.videoPoster = safeMedia(s.videoPoster);
    s.videoStart = Math.max(0, Number(s.videoStart) || 0);
    s.videoEnd = Math.max(0, Number(s.videoEnd) || 0);
    if (s.videoEnd && s.videoEnd <= s.videoStart) s.videoEnd = 0;
    s.videoLoop = s.videoLoop === true;
    s.videoMuted = s.videoMuted === true;
    s.videoAutoplay = s.videoAutoplay === true;
    s.tableHeader = s.tableHeader !== false;
    if (s.type === "code" || raw && (raw.code != null || raw.language != null)) {
      s.code = String(s.code != null ? s.code : s.body || "");
      var lang = String(s.language || "python").trim().toLowerCase();
      s.language = lang === "javascript" || lang === "js" ? "javascript" : lang === "text" || lang === "plain" ? "text" : "python";
      var asked = String(s.codeReveal || "").trim();
      var reveal = asked === "all" || asked === "type" || asked === "lines" ? (
        /** @type {'all'|'type'|'lines'} */
        asked
      ) : s.typewrite === false ? "all" : "type";
      s.codeReveal = reveal;
      s.typewrite = reveal === "type";
      s.typeSpeed = Math.max(8, Math.min(200, Number(s.typeSpeed) || 55));
      if (s.type !== "code") {
      }
    } else {
      delete s.code;
      delete s.language;
      delete s.typewrite;
      delete s.typeSpeed;
      delete s.codeReveal;
    }
    if (s.hidden === true) s.hidden = true;
    else delete s.hidden;
    if (EXPLORATION_TYPES.indexOf(s.type) >= 0 || raw && raw.exploration) {
      s.exploration = normalizeExploration(raw && raw.exploration);
      s.exploration.before = safeMedia(s.exploration.before);
      s.exploration.after = safeMedia(s.exploration.after);
    } else {
      delete s.exploration;
    }
    s.chartKind = [
      "bar",
      "stack",
      "hbar",
      "line",
      "area",
      "pie",
      "donut",
      "scatter",
      "histogram",
      "box",
      "pictogram",
      "radar",
      "sankey",
      "treemap",
      "bullet",
      "combo",
      "waffle",
      "dumbbell",
      "matrix",
      "multiples"
    ].indexOf(s.chartKind) >= 0 ? s.chartKind : "bar";
    s.chartSource = String(s.chartSource || "").trim().slice(0, 200);
    if (!s.chartSource) delete s.chartSource;
    s.chartIcon = String(s.chartIcon || "").trim().slice(0, 4);
    s.chartUnit = Math.max(1, Math.min(1e4, Number(s.chartUnit) || 1));
    var rawLayers = raw && Array.isArray(raw.layers) ? raw.layers : [];
    s.layers = rawLayers.slice(0, GALLERY_MAX).map(function(layer) {
      var l = layer && typeof layer === "object" ? layer : {};
      return {
        image: safeMedia(l.image),
        caption: String(l.caption || ""),
        source: String(l.source || "")
      };
    });
    var rawCallouts = raw && Array.isArray(raw.callouts) ? raw.callouts : [];
    var callouts = rawCallouts.slice(0, 6).map(function(callout) {
      var c = callout && typeof callout === "object" ? callout : {};
      return {
        label: String(c.label == null ? "" : c.label).trim().slice(0, 80),
        note: String(c.note == null ? "" : c.note).trim().slice(0, 160)
      };
    }).filter(function(c) {
      return c.label;
    });
    if (callouts.length) s.callouts = callouts;
    else delete s.callouts;
    s.buildMode = s.buildMode === "dim" || s.buildMode === "spot" ? s.buildMode : "hide";
    if (s.imageFit !== "contain") s.imageFit = "cover";
    s.feedback = normalizeFeedback(s.feedback);
    return s;
  }
  function normalizeDeck(raw) {
    if (!raw || typeof raw !== "object") return null;
    var d = Object.assign(makeDeck(), raw);
    d.id = d.id || uid();
    d.title = String(d.title || "Untitled deck");
    d.theme = resolveTheme(d.theme);
    d.quiz = normalizeQuizConfig(raw.quiz);
    d.slides = (Array.isArray(raw.slides) ? raw.slides : []).map(normalizeSlide);
    if (!d.slides.length) d.slides = [makeSlide("title")];
    d.showSlideNumbers = d.showSlideNumbers !== false;
    d.finalScores = d.finalScores === true;
    d.aspect = ASPECTS[d.aspect] ? d.aspect : "16:9";
    d.logo = String(d.logo || "");
    d.org = String(d.org || "");
    d.closingNote = String(d.closingNote || "");
    d.sourceKey = String(raw.sourceKey || "");
    d.libraryGroup = normalizeLibraryGroup(raw.libraryGroup, d.theme);
    d.logoSize = ["small", "medium", "large"].includes(raw.logoSize) ? raw.logoSize : "medium";
    if (d.logoOn !== "all" && d.logoOn !== "title" && d.logoOn !== "none") {
      d.logoOn = d.logo ? "all" : "none";
    }
    if (!d.logo) d.logoOn = "none";
    return d;
  }
  function firstShownIndex(deck) {
    var slides = deck && deck.slides || [];
    for (var i = 0; i < slides.length; i++) if (!slides[i].hidden) return i;
    return 0;
  }
  function deckShowsLogo(deck, slide, index) {
    if (!deck || !String(deck.logo || "").trim()) return false;
    if (slide && slide.hidden) return false;
    if (deck.logoOn === "all") return true;
    if (deck.logoOn !== "title") return false;
    if (typeof index === "number") return index === firstShownIndex(deck);
    return !!(slide && (slide.type === "title" || slide.type === "section"));
  }
  function normalizeQuestion(raw, style) {
    var q = Object.assign(makeQuestion(style), raw || {});
    q.id = q.id || uid();
    q.question = String(q.question || "");
    gameStyle(style).normalize(q);
    var rawTime = raw ? raw.timeLimit : null;
    var rawPoints = raw ? raw.points : null;
    q.timeLimit = rawTime == null || rawTime === "" ? null : Math.max(0, Number(rawTime) || 0);
    q.points = rawPoints == null || rawPoints === "" ? null : Math.max(0, Number(rawPoints) || 0);
    q.bloom = "";
    q.voteOnly = q.voteOnly === true;
    q.explanation = String(q.explanation || "");
    q.source = String(q.source || "");
    q.image = String(q.image || "");
    q.imageAlt = String(q.imageAlt || "");
    if (["band", "first", "overlay"].indexOf(q.imageLayout) === -1) q.imageLayout = "band";
    return q;
  }
  function normalizeGameSettings(raw) {
    var base = makeGame().settings;
    var g = Object.assign(base, raw || {});
    var q = normalizeQuizConfig({ mode: g.mode, teams: g.teams, scoreboard: g.scoreboard });
    g.mode = q.mode;
    g.teams = q.teams;
    g.scoreboard = q.scoreboard;
    g.defaultTime = Math.max(0, Number(g.defaultTime) || 0);
    g.defaultPoints = Math.max(0, Number(g.defaultPoints) || 1e3);
    g.intro = g.intro !== false;
    g.scoreSlide = g.scoreSlide !== false;
    if (["inline", "slide", "both"].indexOf(g.explainStyle) === -1) g.explainStyle = "inline";
    g.trackLength = Math.max(3, Math.min(12, Number(g.trackLength) || 5));
    g.music = safeMedia(g.music);
    g.musicVolume = Math.max(0, Math.min(
      100,
      g.musicVolume == null ? 55 : Number(g.musicVolume) || 0
    ));
    g.confidence = g.confidence !== false;
    return g;
  }
  function normalizeGame(raw) {
    if (!raw || typeof raw !== "object") return null;
    var rawStyle = GAME_STYLES[raw.style] ? raw.style : "choice";
    var format = String(raw.format || "").slice(0, 40);
    var mapped = formatStyle(format);
    var style = mapped || rawStyle;
    var remapped = !!(mapped && mapped !== rawStyle);
    var g = Object.assign(makeGame(void 0, style), raw);
    g.id = g.id || uid();
    g.kind = "game";
    g.style = style;
    g.title = String(g.title || "Untitled game");
    if (!format && isSpecialStyle(style) && FORMATS[style]) format = style;
    g.format = format;
    g.theme = resolveTheme(g.theme);
    g.libraryGroup = normalizeLibraryGroup(raw.libraryGroup, g.theme);
    g.sourceDeckId = String(raw.sourceDeckId || "").slice(0, 80);
    g.settings = normalizeGameSettings(raw.settings);
    g.questions = (Array.isArray(raw.questions) ? raw.questions : []).map(function(q) {
      if (!remapped) return normalizeQuestion(q, style);
      var fresh = makeQuestion(style);
      [
        "question",
        "answer",
        "explanation",
        "image",
        "imageAlt",
        "imageLayout",
        "notes",
        "bloom",
        "source",
        "timeLimit",
        "points",
        "voteOnly",
        "passage",
        "accept",
        "allowTypos",
        "itemA",
        "itemB",
        "similarities",
        "differences",
        "category",
        "term",
        "prompt",
        "definition"
      ].forEach(function(k) {
        if (q && q[k] != null && q[k] !== "") fresh[k] = q[k];
      });
      if (q && q.id) fresh.id = q.id;
      if (q && Array.isArray(q.options) && q.options.length) {
        var head = String(q.options[0] || "");
        if (head !== "Claimed" && head !== "Accept" && head !== "Complete" && head !== "Clear") {
          fresh.options = q.options.slice();
          if (q.correct != null) fresh.correct = q.correct;
        }
      }
      if (style === "lowstakes" && !(q && String(q.answer || "").trim()) && q && String(q.explanation || "").trim()) {
        fresh.answer = q.explanation;
      }
      if (style === "compare" && !(String(fresh.itemA || "").trim() && String(fresh.itemB || "").trim()) && q && Array.isArray(q.options) && q.options.length >= 2) {
        fresh.itemA = String(q.options[0] || "").trim();
        fresh.itemB = String(q.options[1] || "").trim();
      }
      if (style === "compare" && !String(fresh.similarities || "").trim() && q && String(q.explanation || "").trim()) {
        fresh.similarities = q.explanation;
      }
      return normalizeQuestion(fresh, style);
    });
    if (!g.questions.length) g.questions = [makeQuestion(style)];
    return g;
  }
  function fillQuestionSlide(q, styleKey, settings, s) {
    var style = gameStyle(styleKey);
    style.compile(q, settings, s);
    s.style = styleKey;
    s.input = INPUTS.indexOf(style.input) > -1 ? style.input : "choice";
    if ((styleKey === "memoryflip" || styleKey === "memorymatch") && s.hideAfterStudy) {
      s.timeLimit = Number(s.studySeconds) || 0;
    } else if (styleKey === "definition") {
      s.timeLimit = clampDefinitionSeconds(
        q.timeLimit == null ? settings.defaultTime : q.timeLimit
      );
    } else if (styleKey === "oddone" || styleKey === "compare") {
      s.timeLimit = 0;
    } else if (styleKey === "conceptchain") {
      s.timeLimit = clampChainSeconds(
        q.timeLimit == null ? settings.defaultTime : q.timeLimit
      );
    } else {
      s.timeLimit = q.timeLimit == null ? settings.defaultTime : q.timeLimit;
    }
    s.points = q.points == null ? settings.defaultPoints : q.points;
    if (style.mechanic === "boss" || q.difficulty) {
      s.difficulty = BOSS_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : "medium";
      s.bossDamage = bossDamage(s.difficulty);
    }
    QUESTION_SLIDE_FIELDS.forEach(function(k) {
      if (q[k] != null && q[k] !== "") s[k] = q[k];
    });
    s.explainStyle = settings.explainStyle;
    s.confidence = settings.confidence !== false;
    if (styleKey === "oddone") {
      s.points = 0;
      s.timeLimit = 0;
      s.voteOnly = true;
      s.confidence = false;
      s.hideAnswerUntilReveal = true;
      s.oddoneDiscuss = true;
    }
    if (styleKey === "compare") {
      s.points = 0;
      s.timeLimit = 0;
      s.voteOnly = true;
      s.confidence = false;
      s.hideAnswerUntilReveal = true;
      s.compareDiscuss = true;
      s.itemA = String(q.itemA || "").trim();
      s.itemB = String(q.itemB || "").trim();
      s.similarities = String(q.similarities || "").trim();
      s.differences = String(q.differences || "").trim();
      s.category = String(q.category || "").trim();
      s.options = [];
      s.correct = -1;
    }
    if (styleKey === "conceptchain") {
      s.conceptChain = true;
      s.term = String(q.term || "").trim();
      s.prompt = String(q.prompt || "").trim();
      s.confidence = false;
      s.options = ["Accept", "Reject"];
      s.correct = 0;
      s.judgeKind = "accept";
    }
    return s;
  }
  var QUESTION_SLIDE_FIELDS = [
    "image",
    "imageAlt",
    "imageLayout",
    "explanation",
    "source",
    "notes",
    "bloom",
    "voteOnly"
  ];
  function compileGame(game, opts = {}) {
    opts = opts || {};
    var st = game.settings;
    var engine = gameStyle(game.style);
    var out = [];
    if (opts.intro !== false && st.intro) {
      var intro = makeSlide("section");
      intro.title = game.title;
      intro.subtitle = game.questions.length + (game.questions.length === 1 ? " question" : " questions") + (st.mode === "teams" ? " · " + st.teams.length + " teams" : "");
      intro.transition = "zoom";
      intro.notes = "Game intro. The next " + game.questions.length + " slides are its questions.";
      if (engine.boardEngine) engine.boardEngine.decorateIntro(intro, game);
      intro.gameId = game.id;
      out.push(intro);
    }
    if (st.howTo !== false && runtime.SF && runtime.SF.Playbook) {
      var book = runtime.SF.Playbook.forGame(game);
      var steps = book && book.howToPlay ? book.howToPlay.slice(0, 6) : [];
      if (book && steps.length) {
        var rules = makeSlide("content");
        rules.id = game.id + ":howto";
        rules.gameId = game.id;
        rules.gameTitle = game.title;
        rules.title = "How to play — " + (book.title || game.title);
        rules.bullets = steps;
        rules.transition = "fade";
        rules.notes = [book.aim, runtime.SF.Playbook.engineSummary(book)].filter(Boolean).join("\n\n");
        out.push(rules);
      }
    }
    if (engine.boardEngine) return out.concat(engine.boardEngine.compile(game, { makeSlide }));
    var playQuestions = game.questions.slice();
    if (game.style === "spinexplain") {
      for (var draw = playQuestions.length - 1; draw > 0; draw--) {
        var pick = Math.floor(Math.random() * (draw + 1));
        var swap = playQuestions[draw];
        playQuestions[draw] = playQuestions[pick];
        playQuestions[pick] = swap;
      }
    }
    playQuestions.forEach(function(q, i) {
      var s = makeSlide("quiz");
      s.id = game.id + ":" + q.id;
      fillQuestionSlide(q, game.style, st, s);
      s.format = game.format || "";
      s.notes = q.notes || "";
      s.transition = "fade";
      s.gameId = game.id;
      s.gameTitle = game.title;
      s.questionNumber = i + 1;
      if (game.style === "spinexplain") {
        s.spinDraw = i + 1;
        s.spinTotal = playQuestions.length;
        s.headPrompt = "Spin & explain";
      }
      out.push(s);
      if (String(q.explanation || "").trim() && (st.explainStyle === "slide" || st.explainStyle === "both")) {
        var why = makeSlide("explain");
        why.id = game.id + ":" + q.id + ":why";
        why.question = q.question;
        why.body = q.explanation;
        why.subtitle = q.source || "";
        why.options = s.options;
        why.correct = s.correct;
        why.input = s.input;
        why.answer = s.answer || "";
        why.questionNumber = i + 1;
        why.gameId = game.id;
        why.gameTitle = game.title;
        why.transition = "fade";
        why.notes = "Explanation for Q" + (i + 1) + ".";
        out.push(why);
      }
    });
    if (opts.scoreSlide !== false && st.scoreSlide) {
      var res = makeSlide("results");
      res.id = game.id + ":scores";
      res.title = game.title + " — scores";
      res.gameId = game.id;
      out.push(res);
    }
    return out;
  }
  function buildRunDeck(deck, lookupGame) {
    const run = (
      /** @type {RunDeck} */
      Object.assign({}, deck)
    );
    run.slides = [];
    run.missingGames = [];
    run.games = [];
    deck.slides.forEach(function(s) {
      if (s.hidden === true) return;
      if (s.type !== "game") {
        run.slides.push(s);
        return;
      }
      var game = lookupGame(s.gameId);
      if (!game) {
        run.missingGames.push(s.gameTitle || s.gameId);
        var gone = makeSlide("section");
        gone.id = s.id;
        gone.title = "Game not found";
        gone.subtitle = s.gameTitle ? '"' + s.gameTitle + '" has been deleted' : "";
        run.slides.push(gone);
        return;
      }
      run.games.push(game);
      compileGame(game, { theme: deck.theme }).forEach(function(cs) {
        cs.sourceSlideId = s.id;
        cs.bloom = cs.bloom || s.bloom || "";
        run.slides.push(cs);
      });
    });
    if (deck.finalScores && run.games.length) {
      var closing = makeSlide("results");
      closing.id = deck.id + ":final-scores";
      closing.title = "Final scores";
      closing.subtitle = run.games.length === 1 ? run.games[0].title : run.games.length + " games this lesson";
      closing.transition = "zoom";
      closing.notes = "Everything scored in this lesson, added up.";
      run.slides.push(closing);
    }
    run.feedbackSlides = run.slides.filter(slideFeedback).length;
    var lead = run.games[0];
    run.mechanic = lead ? gameStyle(lead.style).mechanic : "points";
    run.trackLength = lead ? lead.settings.trackLength : 5;
    run.music = lead ? lead.settings.music : "";
    run.musicVolume = lead ? lead.settings.musicVolume : 55;
    run.quiz = normalizeQuizConfig(lead ? {
      mode: lead.settings.mode,
      teams: lead.settings.teams,
      scoreboard: lead.settings.scoreboard
    } : { mode: "individual", scoreboard: true });
    if (!run.slides.length) run.slides = [makeSlide("title")];
    return run;
  }
  function externalMedia(url) {
    var u = String(url || "").trim();
    if (!u || /^data:/i.test(u)) return null;
    if (/^https?:\/\//i.test(u)) return "internet";
    return "file";
  }
  function readiness(deck, lookupGame) {
    var items = [];
    var slides = deck && deck.slides || [];
    var seenExternal = {};
    function add(level, index, title, detail) {
      items.push({ level, slide: index, title, detail });
    }
    function media(index, label, url, what) {
      var kind = externalMedia(url);
      if (!kind) return;
      var key = kind + "|" + url;
      if (seenExternal[key]) return;
      seenExternal[key] = 1;
      add(
        "check",
        index,
        label,
        kind === "internet" ? what + " is loaded from the internet, so it will not play offline." : what + " is a file beside the app, not inside the deck. Move the deck without it and nothing plays."
      );
    }
    slides.forEach(function(s, i) {
      var label = "Slide " + (i + 1);
      if (s.type === "game") {
        var g = s.gameId && lookupGame ? lookupGame(s.gameId) : null;
        if (!g) {
          add("stop", i, label, s.gameId ? "The game on this slide has been deleted, so the slide is skipped." : "No game chosen, so the slide is skipped.");
          return;
        }
        if (!g.questions.length) {
          add("stop", i, label, '"' + g.title + '" has no questions.');
        }
        g.questions.forEach(function(q, n) {
          var bad = gameStyle(q.style || g.style).problems(q, n + 1);
          if (bad) add("stop", i, label, '"' + g.title + '" — ' + bad + ".");
          media(i, label, q.image, "A question image");
        });
        var boardCheck = gameStyle(g.style).board;
        var boardBad = boardCheck ? boardCheck(g) : null;
        if (boardBad) add("stop", i, label, '"' + g.title + '" — ' + boardBad + ".");
        media(i, label, g.settings.music, "The music bed");
        return;
      }
      if (s.type === "video") {
        if (!String(s.video || "").trim()) {
          add("stop", i, label, "A video slide with no video on it.");
        } else {
          media(i, label, s.video, "This clip");
          media(i, label, s.videoPoster, "The poster image");
        }
        return;
      }
      if (s.type === "beforeafter") {
        var comparison = normalizeExploration(s.exploration);
        if (!comparison.before || !comparison.after) add("stop", i, label, "Choose both a before image and an after image.");
        media(i, label, comparison.before, "The before image");
        media(i, label, comparison.after, "The after image");
        return;
      }
      if (s.type === "image" || s.type === "split" || s.type === "explore") {
        if (!String(s.image || "").trim()) {
          add("stop", i, label, "An image slide with no image on it.");
        } else {
          media(i, label, s.image, "This image");
          if (!String(s.imageAlt || "").trim()) {
            add("check", i, label, "The image has no description for anyone who cannot see it.");
          }
        }
        if (s.type === "image") return;
      }
      if (s.type === "table" && !parseTable(s.body).length) {
        add("stop", i, label, "A table slide with no rows.");
        return;
      }
      var words = [s.title, s.subtitle, s.body, s.question].concat(s.bullets || []).join(" ").replace(/\t/g, " ").trim();
      if (!words && !String(s.image || "").trim() && !String(s.video || "").trim()) {
        add("check", i, label, "This slide is empty.");
      }
    });
    if (!slides.length) add("stop", null, "The deck", "There are no slides.");
    var stop = items.filter(function(f) {
      return f.level === "stop";
    }).length;
    return { stop, check: items.length - stop, items };
  }
  function gameToRunDeck(game) {
    return {
      id: game.id,
      title: game.title,
      theme: game.theme,
      showSlideNumbers: false,
      quiz: normalizeQuizConfig({
        mode: game.settings.mode,
        teams: game.settings.teams,
        scoreboard: game.settings.scoreboard
      }),
      games: [game],
      missingGames: [],
      mechanic: gameStyle(game.style).mechanic,
      trackLength: game.settings.trackLength,
      music: game.settings.music,
      musicVolume: game.settings.musicVolume,
      slides: compileGame(game)
    };
  }
  function migrateDeckQuizzes(deck, saveGame) {
    var quizzes = deck.slides.filter(function(s) {
      return s.type === "quiz";
    });
    if (!quizzes.length) {
      deck.slides = deck.slides.filter(function(s) {
        return s.type !== "results";
      });
      if (!deck.slides.length) deck.slides = [makeSlide("title")];
      return null;
    }
    var game = makeGame(deck.title + " — quiz");
    game.theme = deck.theme;
    game.settings = normalizeGameSettings({
      mode: deck.quiz ? deck.quiz.mode : "individual",
      teams: deck.quiz ? deck.quiz.teams : null,
      scoreboard: deck.quiz ? deck.quiz.scoreboard : true,
      defaultTime: quizzes[0].timeLimit || 20,
      defaultPoints: quizzes[0].points || 1e3,
      intro: false,
      scoreSlide: deck.slides.some(function(s) {
        return s.type === "results";
      })
    });
    game.questions = quizzes.map(function(s) {
      return normalizeQuestion({
        question: s.question,
        options: s.options,
        correct: s.correct,
        timeLimit: s.timeLimit,
        points: s.points,
        notes: s.notes
      });
    });
    saveGame(game);
    var at = deck.slides.findIndex(function(s) {
      return s.type === "quiz";
    });
    var embed = makeSlide("game");
    embed.gameId = game.id;
    embed.gameTitle = game.title;
    embed.title = game.title;
    deck.slides = deck.slides.filter(function(s) {
      return s.type !== "quiz" && s.type !== "results";
    });
    deck.slides.splice(Math.min(at, deck.slides.length), 0, embed);
    if (!deck.slides.length) deck.slides = [embed];
    return game;
  }
  function deckToMarkdown(deck) {
    return renderMarkdown(normalizeDeck(deck || {}), (id) => GameStore.get(id));
  }
  function markdownToDeck(text2) {
    var parsed = parseMarkdownDeck(text2);
    var deck = makeDeck(parsed.title || "Imported from Markdown");
    deck.slides = (parsed.slides.length ? parsed.slides : [{ type: "title", title: deck.title }]).map(function(s) {
      return normalizeSlide(s);
    });
    if (!deck.slides.length) deck.slides = [makeSlide("title")];
    return normalizeDeck(deck);
  }
  var { Store, GameStore, LibraryFolders } = createStores({ normalizeDeck, normalizeGame, storage: () => localStorage });
  runtime.SF = Object.assign(runtime.SF || {}, {
    Boards: createBoardRuntime(() => runtime.SF, GAME_STYLES),
    /* The activity catalogue. Data only — studio.js reads target and builds. */
    Activities: { PHASES, ACTIVITIES, activity, activitiesInPhase, phaseCounts, totalMinutes },
    SLIDE_W,
    SLIDE_H,
    ASPECTS,
    CHART_TAXONOMY,
    chartCategories,
    chartPrimaryCategory,
    slideHeight,
    THEMES,
    DEFAULT_THEME,
    resolveTheme,
    createCompositionRenderer,
    bindCanvasRegions,
    declareBodyRegion,
    measureBodyRegion,
    measureSlideFit,
    probeLayoutFit,
    svgScale,
    FIT_TOLERANCE,
    LEGIBLE_FLOOR,
    CHROME_SLOTS,
    chromePositions,
    setChromeSlot,
    supportsChromeRegions,
    applyChromeRegions,
    DESIGN_CONTROLS,
    designApplies,
    COMPOSITIONS,
    compositionOptions,
    slideComposition,
    themeGround,
    TRANSITIONS,
    TEAM_COLORS,
    MAX_TEAMS,
    teamColor,
    makeQuizConfig,
    normalizeQuizConfig,
    SLIDE_TYPES,
    chartData,
    chartUsesSeriesLegend,
    chartPoints,
    chartFlows,
    parsePerson,
    orgTree,
    chartGroups,
    fiveNumber,
    chartValues,
    histogramBins,
    normalizeExploration,
    explorationValue,
    explorationCurve,
    GALLERY_MAX,
    uid,
    makeSlide,
    makeDeck,
    starterDeck,
    normalizeDeck,
    deckShowsLogo,
    normalizeSlide,
    TABLE_MAX_ROWS,
    TABLE_MAX_COLS,
    prepareLayout,
    pasteTarget,
    imagePlacement,
    setImagePlacement,
    swapImagePlacement,
    slideSteps,
    slideExcerpt,
    correctAnswerLabel,
    questionTimeLimit,
    parseTable,
    readiness,
    safeMedia,
    parseKeywordLine,
    formatKeywordLine,
    safeHref,
    deckToMarkdown,
    markdownToDeck,
    parseMarkdownDeck,
    DECK_TYPES,
    BULLET_LAYOUTS,
    LAYOUT_GROUPS,
    INFO_LAYOUTS,
    parseInfoLine,
    formatInfoLine,
    infoNumber,
    FEEDBACK_KINDS,
    SCALE_POINTS,
    scaleLabels,
    makeFeedback,
    normalizeFeedback,
    slideFeedback,
    sampleFeedbackDigest,
    // games
    makeGame,
    makeQuestion,
    GAME_STYLES,
    gameStyle,
    markResponse,
    answerLabel,
    markTyped,
    normalizeAnswer,
    formatValue,
    starterGame,
    normalizeGame,
    normalizeQuestion,
    FORMATS,
    FORMAT_STYLE,
    CORE_STYLES,
    SPECIAL_STYLES,
    isSpecialStyle,
    gameFormat,
    formatStyle,
    orderScore,
    orderPoints,
    wordRevealPoints,
    wordRevealPreFraction,
    wordRevealMask,
    emojiHelp,
    emojiCluePieces,
    emojiClueLayout,
    clampDefinitionSeconds,
    clampChainSeconds,
    splitDefinitionPassage,
    definitionCreate,
    definitionTransition,
    DEFINITION_TIMES,
    CHAIN_TIMES,
    EMOJI_LEVELS,
    wordRevealLetterCount,
    spinExplainPoints,
    claimPoints,
    bingoHasLine,
    bowlGrid,
    BOWL_TARGETS,
    bossDamage,
    bossMaxHp,
    speedPoints,
    BOSS_LEVELS,
    WR_LEVELS,
    BOWL_VALUES,
    compileGame,
    GAME_FORMAT_PRESETS,
    getShowcaseGame,
    INPUTS,
    QUESTION_SLIDE_FIELDS,
    fillQuestionSlide,
    buildRunDeck,
    gameToRunDeck,
    migrateDeckQuizzes,
    Store,
    GameStore,
    unusedDraft,
    libraryGroupFromTheme,
    normalizeLibraryGroup,
    LIBRARY_GROUPS,
    LibraryFolders
  });
})();
