/* Generated from src/model.js. Do not edit; run npm run build. */
"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/render/motion-lab.js
  var motion_lab_exports = {};
  __export(motion_lab_exports, {
    MOTION_LOOKS: () => MOTION_LOOKS,
    MOTION_SCENES: () => MOTION_SCENES,
    active: () => active,
    items: () => items,
    render: () => render,
    state: () => state,
    update: () => update
  });
  var MOTION_SCENES = {
    mask: "Mask reveal",
    draw: "Draw-on diagram",
    cards: "Card to detail",
    annotate: "Animated annotations",
    scrub: "Scrubbable transformation",
    cause: "Cause and effect",
    branch: "Branching scenario",
    explode: "Exploded diagram",
    lens: "Focus lens",
    panels: "Responsive story panels"
  };
  var MOTION_LOOKS = {
    editorial: "Editorial",
    paper: "Layered paper",
    technical: "Technical drawing",
    cinema: "Cinematic depth",
    comic: "Comic sequence"
  };
  function scene(slide) {
    return slide?.motionScene || slide?.design?.motionScene || "";
  }
  function active(slide) {
    return (slide?.type === "motion" || slide?.type === "content") && Object.hasOwn(MOTION_SCENES, scene(slide));
  }
  function items(slide) {
    return (slide.bullets || []).filter((x) => String(x).trim()).slice(0, 4).map((x) => {
      const [label, ...detail] = String(x).split("	");
      return { label: label.slice(0, 100), detail: detail.join(" ").slice(0, 350) };
    });
  }
  function state(slide, raw = {}) {
    const count = Math.max(1, items(slide).length);
    const clamp = (x, lo, hi, fallback) => Number.isFinite(Number(x)) ? Math.max(lo, Math.min(hi, Number(x))) : fallback;
    return {
      sceneStep: Math.round(clamp(raw.sceneStep, 0, count, 0)),
      sceneChoice: Math.round(clamp(raw.sceneChoice, -1, count - 1, -1)),
      sceneValue: clamp(raw.sceneValue, 0, 100, 0),
      sceneX: clamp(raw.sceneX, 0, 100, 50),
      sceneY: clamp(raw.sceneY, 0, 100, 50)
    };
  }
  function update(slide, previous, action, value) {
    const fields = { motionStep: "sceneStep", motionChoice: "sceneChoice", motionValue: "sceneValue", motionX: "sceneX", motionY: "sceneY" };
    if (action === "motionReset") return state(slide);
    if (!Object.hasOwn(fields, action) || !Number.isFinite(Number(value))) return null;
    return state(slide, { ...previous, [fields[action]]: Number(value) });
  }
  function render(root, pad, slide, opts, safeMedia2) {
    const mode = scene(slide);
    const rows2 = items(slide);
    if (!rows2.length) rows2.push({ label: "Add a point", detail: "Use the slide’s bullet fields. Separate label and explanation with a tab." });
    const enabled = !!opts.exploreCommand;
    let view = state(slide, enabled ? opts.exploreState : { sceneStep: rows2.length, sceneValue: 100 });
    const el = (tag, cls = "", text2 = "") => {
      const n = document.createElement(tag);
      n.className = cls;
      n.textContent = text2;
      return n;
    };
    const send = (action, value = 0) => {
      if (enabled) opts.exploreCommand(action, value);
    };
    const button = (parent, label, fn) => {
      const b = el("button", "ml-button", label);
      b.type = "button";
      b.disabled = !enabled;
      b.onclick = fn;
      parent.append(b);
      return b;
    };
    const range = (parent, label, key, action) => {
      const wrap = el("label", "ml-range", label), input = document.createElement("input");
      input.type = "range";
      input.min = "0";
      input.max = "100";
      input.step = "1";
      input.disabled = !enabled;
      input.setAttribute("aria-label", label);
      input.value = String(view[key]);
      input.oninput = () => send(action, Number(input.value));
      wrap.append(input);
      parent.append(wrap);
      return input;
    };
    pad.replaceChildren();
    root.classList.add("motion-specimen");
    root.classList.toggle("ml-live", enabled);
    const look = (slide.design || {}).motionLook || "";
    root.dataset.motionLook = Object.hasOwn(MOTION_LOOKS, look) ? look : "editorial";
    root.dataset.motionMode = mode;
    pad.append(el("div", "ml-kicker", MOTION_SCENES[mode]), el("h2", "ml-title", slide.title || MOTION_SCENES[mode]));
    const stage = el("div", "ml-stage");
    pad.append(stage);
    const status = el("p", "ml-status");
    status.setAttribute("aria-live", enabled ? "polite" : "off");
    pad.append(status);
    const controls = el("div", "ml-controls");
    pad.append(controls);
    controls.addEventListener("keydown", (e) => e.stopPropagation());
    stage.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) e.stopPropagation();
    });
    const parts = [];
    let slider2, xSlider, ySlider, photo, lens, detail, svg, markNodes = [], connectorNodes = [];
    const imageURL = safeMedia2(slide.image || "");
    function addPhoto() {
      const img = document.createElement("img");
      img.className = "ml-photo";
      img.src = imageURL;
      img.alt = slide.subtitle || slide.title || "Scene image";
      img.draggable = false;
      img.onerror = () => {
        img.hidden = true;
        status.textContent = "Image unavailable — choose an image in Look.";
      };
      stage.append(img);
      return img;
    }
    function svgNode(tag, attrs) {
      const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
      return n;
    }
    if (["mask", "annotate", "lens"].includes(mode)) {
      if (imageURL) photo = addPhoto();
      else stage.append(el("p", "ml-empty", "Choose an image in Look to try this effect."));
      if (mode === "annotate") rows2.forEach((row, i) => {
        const n = el("div", "ml-annotation");
        n.style.left = `${10 + i % 2 * 48}%`;
        n.style.top = `${12 + Math.floor(i / 2) * 44}%`;
        n.append(el("span", "ml-ring", String(i + 1)), el("strong", "", row.label));
        stage.append(n);
        parts.push(n);
      });
      if (mode === "lens") {
        let move2 = function(e) {
          const r = stage.getBoundingClientRect();
          send("motionX", (e.clientX - r.left) / r.width * 100);
          send("motionY", (e.clientY - r.top) / r.height * 100);
        };
        var move = move2;
        lens = el("div", "ml-lens");
        if (imageURL) lens.style.backgroundImage = `url(${JSON.stringify(imageURL)})`;
        stage.append(lens);
        stage.tabIndex = enabled ? 0 : -1;
        stage.setAttribute("aria-label", "Focus lens. Use the horizontal and vertical sliders below, or drag on the image.");
        stage.onpointerdown = (e) => {
          if (!enabled) return;
          stage.setPointerCapture(e.pointerId);
          move2(e);
        };
        stage.onpointermove = (e) => {
          if (stage.hasPointerCapture(e.pointerId)) move2(e);
        };
        xSlider = range(controls, "Lens horizontal", "sceneX", "motionX");
        ySlider = range(controls, "Lens vertical", "sceneY", "motionY");
      }
    } else if (mode === "scrub" || mode === "draw") {
      svg = svgNode("svg", { viewBox: "0 0 1000 360", role: "img", "aria-label": mode === "scrub" ? "The same values change from circles to aligned bars." : "Connections appear in sequence." });
      stage.append(svg);
      rows2.forEach((row, i) => {
        if (mode === "draw") {
          if (i) {
            const line = svgNode("path", { d: `M ${100 + (i - 1) * 250} 180 L ${100 + i * 250} 180`, stroke: "currentColor", "stroke-width": 4, fill: "none", pathLength: 1 });
            line.classList.add("ml-connector");
            svg.append(line);
            connectorNodes.push(line);
          }
          const group = svgNode("g", {});
          group.classList.add("ml-node");
          const circle = svgNode("circle", { cx: 100 + i * 250, cy: 180, r: 50, fill: "var(--ml-accent)" });
          const label = svgNode("text", { x: 100 + i * 250, y: 270, "text-anchor": "middle", fill: "currentColor", "font-size": 22 });
          label.textContent = row.label;
          group.append(circle, label);
          svg.append(group);
          parts.push(group);
        } else {
          const value = Number(row.detail);
          const number = Number.isFinite(value) && value > 0 ? Math.min(100, value) : 25 * (i + 1);
          const rect = svgNode("rect", { fill: "var(--ml-accent)" });
          const label = svgNode("text", { x: 30, y: 60 + i * 80, fill: "currentColor", "font-size": 22 });
          label.textContent = `${row.label}: ${number}`;
          svg.append(rect, label);
          markNodes.push({ rect, number, i });
        }
      });
    } else if (mode === "cause") {
      const meter = el("div", "ml-meter");
      detail = el("div", "ml-equation");
      stage.append(meter, detail);
      parts.push(meter);
    } else {
      stage.classList.add("ml-card-stage");
      rows2.forEach((row, i) => {
        const card = el("button", "ml-card");
        card.type = "button";
        card.disabled = !enabled;
        card.append(el("span", "ml-number", String(i + 1).padStart(2, "0")), el("strong", "", row.label), el("span", "ml-detail", row.detail));
        card.onclick = () => send("motionChoice", view.sceneChoice === i ? -1 : i);
        stage.append(card);
        parts.push(card);
      });
    }
    const continuous = ["mask", "scrub", "cause", "explode"].includes(mode);
    if (continuous) slider2 = range(controls, mode === "cause" ? "Input x" : "Transformation", "sceneValue", "motionValue");
    const selectable = ["cards", "branch", "panels"].includes(mode);
    const previous = button(controls, "Previous state", () => send(continuous ? "motionValue" : selectable ? "motionChoice" : "motionStep", continuous ? view.sceneValue - 25 : selectable ? view.sceneChoice - 1 : view.sceneStep - 1));
    const next = button(controls, "Next state", () => send(continuous ? "motionValue" : selectable ? "motionChoice" : "motionStep", continuous ? view.sceneValue + 25 : selectable ? view.sceneChoice + 1 : view.sceneStep + 1));
    if (mode === "lens") {
      previous.hidden = true;
      next.hidden = true;
    }
    button(controls, "Reset / replay", () => send("motionReset"));
    if (["cards", "branch", "panels", "explode"].includes(mode)) button(controls, "Return to overview", () => send("motionChoice", -1));
    function refresh(raw) {
      view = state(slide, raw);
      const t = view.sceneValue / 100;
      if (slider2) slider2.value = String(view.sceneValue);
      if (xSlider) xSlider.value = String(view.sceneX);
      if (ySlider) ySlider.value = String(view.sceneY);
      previous.disabled = !enabled || (continuous ? view.sceneValue <= 0 : selectable ? view.sceneChoice < 0 : view.sceneStep <= 0);
      next.disabled = !enabled || (continuous ? view.sceneValue >= 100 : selectable ? view.sceneChoice >= rows2.length - 1 : view.sceneStep >= rows2.length);
      root.style.setProperty("--ml-progress", String(t));
      if (mode === "mask" && photo) photo.style.clipPath = `circle(${t * 75}% at 50% 50%)`;
      if (mode === "lens" && lens) {
        lens.style.left = `${view.sceneX}%`;
        lens.style.top = `${view.sceneY}%`;
        const width = stage.clientWidth || 1168, height = stage.clientHeight || 420;
        const naturalW = photo?.naturalWidth || width, naturalH = photo?.naturalHeight || height;
        const cover = Math.max(width / naturalW, height / naturalH), fullW = naturalW * cover, fullH = naturalH * cover;
        lens.style.backgroundSize = `${fullW * 2}px ${fullH * 2}px`;
        lens.style.backgroundPosition = `${110 - (view.sceneX / 100 * width + (fullW - width) / 2) * 2}px ${110 - (view.sceneY / 100 * height + (fullH - height) / 2) * 2}px`;
      }
      if (mode === "draw" || mode === "annotate") {
        parts.forEach((p, i) => p.classList.toggle("ml-revealed", i < view.sceneStep));
        connectorNodes.forEach((p, i) => p.style.strokeDashoffset = i + 1 < view.sceneStep ? "0" : "1");
      }
      if (mode === "scrub") markNodes.forEach(({ rect, number, i }) => {
        const diameter = 2 * Math.sqrt(number / Math.PI) * 8, width = diameter + (number * 6 - diameter) * t, height = diameter + (36 - diameter) * t;
        rect.setAttribute("x", String(250));
        rect.setAttribute("y", String(40 + i * 80 - height / 2));
        rect.setAttribute("width", String(width));
        rect.setAttribute("height", String(height));
        rect.setAttribute("rx", String((1 - t) * diameter / 2));
      });
      if (mode === "cause") {
        const a = Number(slide.body);
        const factor = Number.isFinite(a) && String(slide.body).trim() ? Math.max(-10, Math.min(10, a)) : 2;
        const output = Math.round(view.sceneValue * factor * 100) / 100;
        detail.textContent = `${factor} × ${Math.round(view.sceneValue)} = ${output}`;
        parts[0].style.transform = `scaleX(${t})`;
      }
      if (["cards", "branch", "panels", "explode"].includes(mode)) {
        stage.classList.toggle("ml-selected", view.sceneChoice >= 0);
        parts.forEach((p, i) => {
          const selected2 = view.sceneChoice === i;
          p.classList.toggle("ml-selected-card", selected2);
          p.setAttribute("aria-pressed", String(selected2));
          if (mode === "explode") p.style.transform = `translate(${(i - (rows2.length - 1) / 2) * t * 50}px, ${(i % 2 ? 1 : -1) * t * 65}px) rotate(${(i - (rows2.length - 1) / 2) * t * 5}deg)`;
        });
      }
      const selected = rows2[view.sceneChoice];
      status.textContent = selected ? `${selected.label} — ${selected.detail}` : mode === "scrub" ? "Illustrative values. Circle area and bar length encode the same quantity; intermediate shapes are transition frames." : mode === "cause" ? "Illustrative linear model: y = ax. Edit the multiplier in the slide body." : mode === "lens" ? "Drag over the image or use the sliders to inspect a detail." : mode === "branch" ? "Choose a response to reveal its authored consequence. Return to overview to try another." : rows2[Math.max(0, view.sceneStep - 1)]?.detail || slide.subtitle || "Use the controls to explore.";
    }
    root._exploreRefresh = refresh;
    refresh(view);
    if (mode === "lens") {
      if (photo) photo.onload = () => refresh(view);
      requestAnimationFrame(() => {
        if (root.isConnected) refresh(view);
      });
    }
  }

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
    for (const region2 of [header, footer]) region2.classList.toggle("region-empty", !region2.querySelector("[data-chrome-item]"));
  }

  // src/render/canvas-regions.js
  var LABELS = { identitySlot: "theme identity", logoSlot: "logo", contextSlot: "slide context", closingSlot: "closing text", numberSlot: "page number" };
  var slotLabel = (slot) => slot.replace("-", " ").replace("center", "centre");
  function bindCanvasRegions(root, slide, onChange) {
    if (!root.classList.contains("chrome-regions")) return;
    let overlay = null, active2 = null;
    function dismiss(focus = true) {
      overlay?.remove();
      overlay = null;
      if (active2) {
        active2.setAttribute("aria-expanded", "false");
        if (focus) active2.focus();
      }
      active2 = null;
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
      active2 = handle;
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

  // src/activities/fields.js
  var KEYWORD_HALF = /^(bullets\.\d+)\.(term|def)$/;
  function createActivityFields(SF) {
    function read(slide, path) {
      const half = String(path).match(KEYWORD_HALF);
      if (half) {
        const line = SF.parseKeywordLine(read(slide, half[1]) || "");
        return half[2] === "term" ? line.term : line.def;
      }
      return String(path).split(".").reduce(function(at, key) {
        return at == null ? void 0 : at[key];
      }, slide);
    }
    function write(slide, path, value) {
      const half = String(path).match(KEYWORD_HALF);
      if (half) {
        const line = SF.parseKeywordLine(read(slide, half[1]) || "");
        write(slide, half[1], half[2] === "term" ? SF.formatKeywordLine(value, line.def) : SF.formatKeywordLine(line.term, value));
        return;
      }
      const parts = String(path).split(".");
      const last = parts.pop();
      if (last === void 0) return;
      const at = parts.reduce(function(node, key) {
        return node[key];
      }, slide);
      if (Array.isArray(at)) {
        const i = Number(last);
        while (at.length <= i) at.push("");
        at[i] = value;
      } else {
        at[last] = value;
      }
    }
    function applyFields(a, slide) {
      const fields = a && a.fields || [];
      if (fields.some(function(f) {
        return /^bullets\./.test(f.slide);
      })) slide.bullets = [];
      fields.forEach(function(f) {
        const half = String(f.slide).match(KEYWORD_HALF);
        if (half && half[2] === "def") write(slide, half[1] + ".term", f.label);
        if (f.value !== void 0) write(slide, f.slide, f.type === "minutes" ? Number(f.value) * 60 : f.value);
      });
    }
    function steps(a) {
      return a.blurb + "\n\n" + a.steps.map(function(step, i) {
        return i + 1 + ". " + step;
      }).join("\n") + (a.materials ? "\n\nMaterials (source):\n" + a.materials.join(" · ") : "") + (a.teacherNotes ? "\n\nTeacher guidance / example answers (draft):\n" + a.teacherNotes : "") + (a.mappingReason ? "\n\nImplementation note:\n" + a.mappingReason : "");
    }
    return { read, write, applyFields, steps };
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

  // src/render/charts.js
  function createChartRenderer(SF, helpers) {
    const { el } = helpers;
    var CHART = { w: 1180, h: 430, padL: 92, padR: 40, padT: 22, padB: 62 };
    function chartColor(i) {
      return "var(--chart-" + (i % 6 + 1) + ")";
    }
    function svgEl(tag, attrs) {
      var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.keys(attrs || {}).forEach(function(k) {
        n.setAttribute(k, String(attrs[k]));
      });
      return n;
    }
    function niceMax(v) {
      if (!(v > 0)) return 1;
      var mag = Math.pow(10, Math.floor(Math.log10(v)));
      var step = [1, 2, 2.5, 5, 10].filter(function(s) {
        return s * mag >= v;
      })[0] || 10;
      return step * mag;
    }
    function niceStep(rough) {
      if (!(rough > 0)) return 1;
      var mag = Math.pow(10, Math.floor(Math.log10(rough)));
      return ([1, 2, 2.5, 5, 10].filter(function(m) {
        return m * mag >= rough;
      })[0] || 10) * mag;
    }
    function niceRange(lo, hi) {
      if (!(hi > lo)) return { lo: Math.min(0, lo), hi: (hi || 0) + 1 };
      var span = hi - lo, pad = span * 0.1;
      var step = niceStep(span / 4);
      var top = Math.ceil((hi + pad) / step) * step;
      var bottom = lo >= 0 && lo <= span * 0.15 ? 0 : Math.floor(lo / step) * step;
      return { lo: bottom, hi: top };
    }
    function axisTicks(max) {
      var out = [], n = 4;
      for (var i = 0; i <= n; i++) out.push(max * i / n);
      return out;
    }
    function fmt(v) {
      if (v == null) return "";
      var a = Math.abs(v);
      if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
      if (a >= 1e4) return (v / 1e3).toFixed(0) + "k";
      return String(Math.round(v * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    function chartKey(data, slide) {
      var wrap = el("div", "chart-key");
      if (!SF.chartUsesSeriesLegend || !SF.chartUsesSeriesLegend(slide && slide.chartKind, data.series.length)) {
        return wrap;
      }
      data.series.forEach(function(s, i) {
        var item = el("span", "ck-item");
        var dot = el("i", "ck-dot");
        dot.style.background = chartColor(i);
        item.appendChild(dot);
        item.appendChild(el("span", null, s.name));
        wrap.appendChild(item);
      });
      return wrap;
    }
    function chartTable(data, slide) {
      if (slide && slide.chartKind === "sankey" && SF.chartFlows) {
        var flows = SF.chartFlows(slide);
        var ft = el("table", "chart-data-table");
        var fh = el("tr");
        ["From", "To", "Amount"].forEach(function(h) {
          fh.appendChild(el("th", null, h));
        });
        ft.appendChild(fh);
        flows.links.forEach(function(l) {
          var tr = el("tr");
          tr.appendChild(el("td", null, l.from));
          tr.appendChild(el("td", null, l.to));
          tr.appendChild(el("td", null, fmt(l.value)));
          ft.appendChild(tr);
        });
        return ft;
      }
      var t = el("table", "chart-data-table");
      var head = el("tr");
      head.appendChild(el("th", null, ""));
      data.series.forEach(function(s) {
        head.appendChild(el("th", null, s.name));
      });
      t.appendChild(head);
      data.categories.forEach(function(c, r) {
        var tr = el("tr");
        tr.appendChild(el("th", null, c));
        data.series.forEach(function(s) {
          tr.appendChild(el("td", null, fmt(s.values[r])));
        });
        t.appendChild(tr);
      });
      return t;
    }
    function barChart(data, slide, stepOf) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var all = [];
      data.series.forEach(function(s) {
        s.values.forEach(function(v) {
          if (v != null) all.push(v);
        });
      });
      var max = niceMax(Math.max.apply(null, all.concat([0])));
      axisTicks(max).forEach(function(t) {
        var y = P.padT + plotH - t / max * plotH;
        svg.appendChild(svgEl("line", { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: "ch-grid" }));
        var lab = svgEl("text", { x: P.padL - 14, y: y + 7, class: "ch-tick", "text-anchor": "end" });
        lab.textContent = fmt(t);
        svg.appendChild(lab);
      });
      var band = plotW / Math.max(1, data.categories.length);
      var n = data.series.length;
      var groups = [];
      var beats = n > 1 ? n : data.categories.length;
      for (var b = 0; b < beats; b++) {
        var gg = svgEl("g", { class: "ch-beat", "data-step": b });
        groups.push(gg);
        svg.appendChild(gg);
      }
      var beatFor = function(si, ci) {
        return groups[n > 1 ? si : ci];
      };
      var groupW = Math.min(band * 0.62, 78 * n);
      var barW = Math.max(6, (groupW - (n - 1) * 2) / n);
      data.categories.forEach(function(cat, ci) {
        var x0 = P.padL + band * ci + (band - groupW) / 2;
        data.series.forEach(function(s, si) {
          var v = s.values[ci];
          if (v == null) return;
          var hgt = Math.max(0, v / max * plotH);
          var x = x0 + si * (barW + 2);
          var y = P.padT + plotH - hgt;
          var g = svgEl("g", { class: "ch-bar" });
          var r = Math.min(4, barW / 2);
          var d = "M" + x + " " + (y + hgt) + " V" + (y + r) + " Q" + x + " " + y + " " + (x + r) + " " + y + " H" + (x + barW - r) + " Q" + (x + barW) + " " + y + " " + (x + barW) + " " + (y + r) + " V" + (y + hgt) + " Z";
          var path = svgEl("path", { d, fill: chartColor(si) });
          g.appendChild(path);
          g.setAttribute("data-series", String(si));
          if (n === 1) {
            var val = svgEl("text", { x: x + barW / 2, y: y - 12, class: "ch-value", "text-anchor": "middle" });
            val.textContent = fmt(v);
            g.appendChild(val);
          }
          beatFor(si, ci).appendChild(g);
        });
        var cl = svgEl("text", { x: P.padL + band * ci + band / 2, y: H - P.padB + 30, class: "ch-cat", "text-anchor": "middle" });
        cl.textContent = cat;
        svg.appendChild(cl);
      });
      svg.appendChild(svgEl("line", { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: "ch-axis" }));
      return svg;
    }
    function stackedBar(data, slide, stepOf) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var totals = data.categories.map(function(_, ci) {
        return data.series.reduce(function(sum, s) {
          var v = s.values[ci];
          return sum + (v == null ? 0 : Math.max(0, v));
        }, 0);
      });
      var max = niceMax(Math.max.apply(null, totals.concat([0])));
      axisTicks(max).forEach(function(t) {
        var y = P.padT + plotH - t / max * plotH;
        svg.appendChild(svgEl("line", { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: "ch-grid" }));
        var lab = svgEl("text", { x: P.padL - 14, y: y + 7, class: "ch-tick", "text-anchor": "end" });
        lab.textContent = fmt(t);
        svg.appendChild(lab);
      });
      var band = plotW / Math.max(1, data.categories.length);
      var barW = Math.min(band * 0.62, 120);
      var groups = data.series.map(function(_, si) {
        var gg = svgEl("g", { class: "ch-beat", "data-step": si });
        svg.appendChild(gg);
        return gg;
      });
      data.categories.forEach(function(cat, ci) {
        var x = P.padL + band * ci + (band - barW) / 2;
        var run = 0;
        data.series.forEach(function(sr, si) {
          var v = sr.values[ci];
          if (v == null || v <= 0) return;
          var hgt = v / max * plotH;
          var y = P.padT + plotH - (run + hgt) / 1 * 1 - 0;
          y = P.padT + plotH - (run + v) / max * plotH;
          var g = svgEl("g", { class: "ch-bar" });
          g.setAttribute("data-series", String(si));
          g.appendChild(svgEl("rect", { x, y, width: barW, height: Math.max(0, hgt), fill: chartColor(si) }));
          if (hgt > 26) {
            var val = svgEl("text", { x: x + barW / 2, y: y + hgt / 2 + 6, class: "ch-value ch-on-fill", "text-anchor": "middle" });
            val.textContent = fmt(v);
            g.appendChild(val);
          }
          groups[si].appendChild(g);
          run += v;
        });
        var cl = svgEl("text", { x: P.padL + band * ci + band / 2, y: H - P.padB + 30, class: "ch-cat", "text-anchor": "middle" });
        cl.textContent = cat;
        svg.appendChild(cl);
      });
      svg.appendChild(svgEl("line", { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: "ch-axis" }));
      return svg;
    }
    function horizontalBar(data, slide) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var longest = data.categories.reduce(function(n2, c) {
        return Math.max(n2, String(c).length);
      }, 0);
      var padL = Math.min(320, 40 + longest * 10);
      var plotW = W - padL - P.padR, plotH = H - P.padT - P.padB;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var all = [];
      data.series.forEach(function(sr) {
        sr.values.forEach(function(v) {
          if (v != null) all.push(v);
        });
      });
      var max = niceMax(Math.max.apply(null, all.concat([0])));
      axisTicks(max).forEach(function(t) {
        var x = padL + t / max * plotW;
        svg.appendChild(svgEl("line", { x1: x, y1: P.padT, x2: x, y2: P.padT + plotH, class: "ch-grid" }));
        var lab = svgEl("text", { x, y: P.padT + plotH + 28, class: "ch-tick", "text-anchor": "middle" });
        lab.textContent = fmt(t);
        svg.appendChild(lab);
      });
      var band = plotH / Math.max(1, data.categories.length);
      var n = data.series.length;
      var groupH = Math.min(band * 0.64, 70 * n);
      var barH = Math.max(6, (groupH - (n - 1) * 2) / n);
      var groups = [];
      var beats = n > 1 ? n : data.categories.length;
      for (var b = 0; b < beats; b++) {
        var gg = svgEl("g", { class: "ch-beat", "data-step": b });
        groups.push(gg);
        svg.appendChild(gg);
      }
      data.categories.forEach(function(cat, ci) {
        var y0 = P.padT + band * ci + (band - groupH) / 2;
        data.series.forEach(function(sr, si) {
          var v = sr.values[ci];
          if (v == null) return;
          var wdt = Math.max(0, v / max * plotW);
          var y = y0 + si * (barH + 2);
          var g = svgEl("g", { class: "ch-bar" });
          g.setAttribute("data-series", String(si));
          g.appendChild(svgEl("rect", { x: padL, y, width: wdt, height: barH, rx: Math.min(4, barH / 2), fill: chartColor(si) }));
          if (n === 1) {
            var val = svgEl("text", { x: padL + wdt + 10, y: y + barH / 2 + 6, class: "ch-value" });
            val.textContent = fmt(v);
            g.appendChild(val);
          }
          groups[n > 1 ? si : ci].appendChild(g);
        });
        var cl = svgEl("text", { x: padL - 14, y: P.padT + band * ci + band / 2 + 6, class: "ch-cat", "text-anchor": "end" });
        cl.textContent = cat;
        svg.appendChild(cl);
      });
      svg.appendChild(svgEl("line", { x1: padL, y1: P.padT, x2: padL, y2: P.padT + plotH, class: "ch-axis" }));
      return svg;
    }
    function scatterChart(slide) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var d = SF.chartPoints(slide);
      var padL = P.padL, plotW = W - padL - P.padR, plotH = H - P.padT - P.padB;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var xs = [], ys = [];
      d.series.forEach(function(sr) {
        sr.points.forEach(function(pt) {
          xs.push(pt.x);
          ys.push(pt.y);
        });
      });
      if (!xs.length) return svg;
      var xr = niceRange(Math.min.apply(null, xs), Math.max.apply(null, xs));
      var yr = niceRange(Math.min.apply(null, ys), Math.max.apply(null, ys));
      var x0 = xr.lo, xMax = xr.hi, y0 = yr.lo, yMax = yr.hi;
      var xAt = function(v) {
        return padL + (v - x0) / (xMax - x0 || 1) * plotW;
      };
      var yAt = function(v) {
        return P.padT + plotH - (v - y0) / (yMax - y0 || 1) * plotH;
      };
      axisTicks(yMax - y0).forEach(function(t) {
        var y = yAt(y0 + t);
        svg.appendChild(svgEl("line", { x1: padL, y1: y, x2: padL + plotW, y2: y, class: "ch-grid" }));
        var lab = svgEl("text", { x: padL - 14, y: y + 7, class: "ch-tick", "text-anchor": "end" });
        lab.textContent = fmt(y0 + t);
        svg.appendChild(lab);
      });
      axisTicks(xMax - x0).forEach(function(t) {
        var x = xAt(x0 + t);
        var lab = svgEl("text", { x, y: H - P.padB + 30, class: "ch-tick", "text-anchor": "middle" });
        lab.textContent = fmt(x0 + t);
        svg.appendChild(lab);
      });
      var placed = [];
      d.series.forEach(function(sr, si) {
        var g = svgEl("g", { class: "ch-line ch-points", "data-step": si, "data-series": String(si) });
        sr.points.forEach(function(pt) {
          var cx = xAt(pt.x), cy = yAt(pt.y), r = 9;
          var dot = svgEl("circle", { cx: cx.toFixed(1), cy: cy.toFixed(1), r, fill: chartColor(si), class: "ch-point" });
          if (pt.label) {
            var tip = svgEl("title", {});
            tip.textContent = pt.label + " · " + d.xLabel + " " + fmt(pt.x) + " · " + fmt(pt.y);
            dot.appendChild(tip);
          }
          g.appendChild(dot);
          if (!pt.label) return;
          var wide = pt.label.length * 7.4;
          var ly = cy - r - 9;
          var guard = 0;
          while (guard++ < 24 && placed.some(function(q) {
            return Math.abs(q.y - ly) < 16 && Math.abs(q.x - cx) < (q.w + wide) / 2 + 6;
          })) ly -= 17;
          placed.push({ x: cx, y: ly, w: wide });
          if (cy - r - ly > 13) {
            g.appendChild(svgEl("line", { x1: cx, y1: cy - r, x2: cx, y2: ly + 4, class: "ch-leader" }));
          }
          var lab = svgEl("text", { x: cx.toFixed(1), y: ly.toFixed(1), class: "ch-point-label", "text-anchor": "middle" });
          lab.textContent = pt.label;
          g.appendChild(lab);
        });
        svg.appendChild(g);
      });
      if (d.xLabel) {
        var xl = svgEl("text", { x: padL + plotW / 2, y: H - 6, class: "ch-axis-label", "text-anchor": "middle" });
        xl.textContent = d.xLabel;
        svg.appendChild(xl);
      }
      svg.appendChild(svgEl("line", { x1: padL, y1: P.padT + plotH, x2: padL + plotW, y2: P.padT + plotH, class: "ch-axis" }));
      svg.appendChild(svgEl("line", { x1: padL, y1: P.padT, x2: padL, y2: P.padT + plotH, class: "ch-axis" }));
      return svg;
    }
    function histogramChart(slide) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var vals = SF.chartValues(slide);
      var bins = SF.histogramBins(vals);
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      if (!bins.length) return svg;
      var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
      var max = niceMax(Math.max.apply(null, bins.map(function(b) {
        return b.count;
      })));
      axisTicks(max).forEach(function(t) {
        var y = P.padT + plotH - t / max * plotH;
        svg.appendChild(svgEl("line", { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: "ch-grid" }));
        var lab = svgEl("text", { x: P.padL - 14, y: y + 7, class: "ch-tick", "text-anchor": "end" });
        lab.textContent = fmt(t);
        svg.appendChild(lab);
      });
      var bw = plotW / bins.length;
      var g = svgEl("g", { class: "ch-beat", "data-step": 0, "data-series": "0" });
      bins.forEach(function(b, i) {
        var hgt = b.count / max * plotH;
        g.appendChild(svgEl("rect", {
          x: P.padL + i * bw,
          y: P.padT + plotH - hgt,
          width: Math.max(1, bw - 1),
          height: Math.max(0, hgt),
          fill: chartColor(0),
          class: "ch-bin"
        }));
        if (i === 0 || i === bins.length - 1 || i % 2 === 0) {
          var lab = svgEl("text", { x: P.padL + i * bw, y: H - P.padB + 30, class: "ch-tick", "text-anchor": "middle" });
          lab.textContent = fmt(Math.round(b.from * 10) / 10);
          svg.appendChild(lab);
        }
      });
      svg.appendChild(g);
      var n = svgEl("text", { x: P.padL + plotW, y: P.padT - 12, class: "ch-tick", "text-anchor": "end" });
      n.textContent = vals.length + " values · " + bins.length + " bins";
      svg.appendChild(n);
      svg.appendChild(svgEl("line", { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: "ch-axis" }));
      return svg;
    }
    function boxChart(slide) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var groups = SF.chartGroups(slide);
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      if (!groups.length) return svg;
      var summaries = groups.map(function(g) {
        return SF.fiveNumber(g.values);
      });
      var all = [];
      groups.forEach(function(g) {
        g.values.forEach(function(v) {
          all.push(v);
        });
      });
      var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
      var rng = niceRange(lo, hi);
      var base = rng.lo, top = rng.hi;
      var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
      var yAt = function(v) {
        return P.padT + plotH - (v - base) / (top - base || 1) * plotH;
      };
      axisTicks(top - base).forEach(function(t) {
        var y = yAt(base + t);
        svg.appendChild(svgEl("line", { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: "ch-grid" }));
        var lab = svgEl("text", { x: P.padL - 14, y: y + 7, class: "ch-tick", "text-anchor": "end" });
        lab.textContent = fmt(base + t);
        svg.appendChild(lab);
      });
      var band = plotW / groups.length;
      var bw = Math.min(band * 0.5, 130);
      groups.forEach(function(grp, i) {
        var f = summaries[i];
        var cx = P.padL + band * i + band / 2, x = cx - bw / 2;
        var g = svgEl("g", { class: "ch-beat ch-box", "data-step": i, "data-series": String(i) });
        var col = chartColor(i);
        g.appendChild(svgEl("line", { x1: cx, y1: yAt(f.min), x2: cx, y2: yAt(f.max), class: "ch-whisker", stroke: col }));
        g.appendChild(svgEl("line", { x1: cx - bw / 4, y1: yAt(f.min), x2: cx + bw / 4, y2: yAt(f.min), class: "ch-whisker", stroke: col }));
        g.appendChild(svgEl("line", { x1: cx - bw / 4, y1: yAt(f.max), x2: cx + bw / 4, y2: yAt(f.max), class: "ch-whisker", stroke: col }));
        g.appendChild(svgEl("rect", {
          x,
          y: yAt(f.q3),
          width: bw,
          height: Math.max(1, yAt(f.q1) - yAt(f.q3)),
          fill: col,
          opacity: 0.32,
          stroke: col,
          "stroke-width": 2,
          rx: 3
        }));
        g.appendChild(svgEl("line", { x1: x, y1: yAt(f.median), x2: x + bw, y2: yAt(f.median), class: "ch-median", stroke: col }));
        f.outliers.forEach(function(v) {
          g.appendChild(svgEl("circle", { cx, cy: yAt(v), r: 5, class: "ch-outlier", stroke: col }));
        });
        svg.appendChild(g);
        var cl = svgEl("text", { x: cx, y: H - P.padB + 30, class: "ch-cat", "text-anchor": "middle" });
        cl.textContent = grp.name + " · n=" + f.n;
        svg.appendChild(cl);
      });
      svg.appendChild(svgEl("line", { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: "ch-axis" }));
      return svg;
    }
    function pictogramChart(data, slide) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg ch-picto", role: "img" });
      var icon = String(slide.chartIcon || "").trim() || "●";
      var vals = (data.series[0] ? data.series[0].values : []).map(function(v) {
        return v == null ? 0 : Math.max(0, v);
      });
      if (!vals.length) return svg;
      var max = Math.max.apply(null, vals);
      var unit = Number(slide.chartUnit) > 1 ? Number(slide.chartUnit) : Math.max(1, Math.pow(10, Math.max(0, Math.ceil(Math.log10(Math.max(1, max / 20))))));
      var labelRoom = Math.min(300, 40 + data.categories.reduce(function(n, c) {
        return Math.max(n, String(c).length);
      }, 0) * 10);
      var rowH = Math.min(78, (H - P.padT - P.padB) / Math.max(1, data.categories.length));
      var size = Math.min(rowH * 0.74, 46);
      data.categories.forEach(function(cat, ci) {
        var y = P.padT + rowH * ci + rowH / 2;
        var lab = svgEl("text", { x: labelRoom - 16, y: y + 7, class: "ch-cat", "text-anchor": "end" });
        lab.textContent = cat;
        svg.appendChild(lab);
        var g = svgEl("g", { class: "ch-beat", "data-step": ci, "data-series": "0" });
        var whole = Math.floor(vals[ci] / unit);
        var part = vals[ci] % unit / unit;
        for (var i = 0; i < whole && i < 40; i++) {
          var t = svgEl("text", {
            x: labelRoom + i * (size * 0.92),
            y: y + size * 0.34,
            class: "ch-icon",
            "font-size": size
          });
          t.textContent = icon;
          g.appendChild(t);
        }
        if (part > 0.08 && whole < 40) {
          var cid = "picto-clip-" + ci;
          var clip = svgEl("clipPath", { id: cid });
          clip.appendChild(svgEl("rect", {
            x: labelRoom + whole * (size * 0.92),
            y: y - size * 0.7,
            width: Math.max(1, size * part),
            height: size * 1.3
          }));
          svg.appendChild(clip);
          var ht = svgEl("text", {
            x: labelRoom + whole * (size * 0.92),
            y: y + size * 0.34,
            class: "ch-icon",
            "font-size": size,
            "clip-path": "url(#" + cid + ")"
          });
          ht.textContent = icon;
          g.appendChild(ht);
        }
        var vlab = svgEl("text", {
          x: labelRoom + Math.min(whole + 1, 41) * (size * 0.92) + 12,
          y: y + 7,
          class: "ch-value"
        });
        vlab.textContent = fmt(vals[ci]);
        g.appendChild(vlab);
        svg.appendChild(g);
      });
      var key = svgEl("text", { x: labelRoom, y: H - 10, class: "ch-tick" });
      key.textContent = icon + " = " + fmt(unit) + (data.series[0] && data.series[0].name ? " " + data.series[0].name.toLowerCase() : "");
      svg.appendChild(key);
      return svg;
    }
    function radarChart(data, slide) {
      var W = CHART.w, H = CHART.h;
      var cx = W / 2, cy = H / 2 + 6, R = Math.min(H / 2 - 34, 168);
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var axes = data.categories.length;
      if (axes < 3) return svg;
      var all = [];
      data.series.forEach(function(sr) {
        sr.values.forEach(function(v) {
          if (v != null) all.push(v);
        });
      });
      var max = niceMax(Math.max.apply(null, all.concat([0])));
      var ang = function(i2) {
        return -Math.PI / 2 + i2 / axes * Math.PI * 2;
      };
      var at = function(i2, v) {
        var r = Math.max(0, v) / max * R;
        return [cx + r * Math.cos(ang(i2)), cy + r * Math.sin(ang(i2))];
      };
      [0.25, 0.5, 0.75, 1].forEach(function(f) {
        var pts = [];
        for (var i2 = 0; i2 < axes; i2++) {
          pts.push((cx + R * f * Math.cos(ang(i2))).toFixed(1) + "," + (cy + R * f * Math.sin(ang(i2))).toFixed(1));
        }
        svg.appendChild(svgEl("polygon", { points: pts.join(" "), class: "ch-grid ch-web", fill: "none" }));
      });
      for (var i = 0; i < axes; i++) {
        var e = at(i, max);
        svg.appendChild(svgEl("line", { x1: cx, y1: cy, x2: e[0].toFixed(1), y2: e[1].toFixed(1), class: "ch-grid" }));
        var lr = R + 26, lx = cx + lr * Math.cos(ang(i)), ly = cy + lr * Math.sin(ang(i));
        var cosv = Math.cos(ang(i));
        var lab = svgEl("text", {
          x: lx.toFixed(1),
          y: (ly + 5).toFixed(1),
          class: "ch-cat",
          "text-anchor": cosv < -0.25 ? "end" : cosv > 0.25 ? "start" : "middle"
        });
        lab.textContent = data.categories[i];
        svg.appendChild(lab);
      }
      var tick = svgEl("text", { x: cx + 6, y: cy - R + 4, class: "ch-tick" });
      tick.textContent = fmt(max);
      svg.appendChild(tick);
      data.series.forEach(function(sr, si) {
        var pts = [];
        for (var i2 = 0; i2 < axes; i2++) {
          var v = sr.values[i2];
          var p = at(i2, v == null ? 0 : v);
          pts.push(p[0].toFixed(1) + "," + p[1].toFixed(1));
        }
        var g = svgEl("g", { class: "ch-line ch-radar", "data-step": si, "data-series": String(si) });
        g.appendChild(svgEl("polygon", {
          points: pts.join(" "),
          fill: chartColor(si),
          opacity: 0.18,
          stroke: chartColor(si),
          "stroke-width": 3,
          "stroke-linejoin": "round"
        }));
        for (var j = 0; j < axes; j++) {
          var vv = sr.values[j], pp = at(j, vv == null ? 0 : vv);
          g.appendChild(svgEl("circle", {
            cx: pp[0].toFixed(1),
            cy: pp[1].toFixed(1),
            r: 5,
            fill: chartColor(si),
            class: "ch-dot"
          }));
        }
        svg.appendChild(g);
      });
      return svg;
    }
    function sankeyChart(slide) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var f = SF.chartFlows(slide);
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      if (!f.links.length) return svg;
      var padT = 18, padB = 26, left = 6, right = 6;
      var plotH = H - padT - padB;
      var nodeW = 16;
      var gap = 16;
      var byLayer = [];
      for (var d = 0; d < f.layers; d++) byLayer.push(f.nodes.filter(function(n) {
        return n.depth === d;
      }));
      var heaviest = byLayer.reduce(function(m, col) {
        return Math.max(m, col.reduce(function(t, n) {
          return t + n.total;
        }, 0));
      }, 0);
      var tallest = byLayer.reduce(function(m, col) {
        return Math.max(m, col.length);
      }, 0);
      var perUnit = (plotH - (tallest - 1) * gap) / (heaviest || 1);
      var colX = function(d2) {
        return left + (f.layers === 1 ? 0 : d2 * ((W - left - right - nodeW) / (f.layers - 1)));
      };
      byLayer.forEach(function(col, d2) {
        col.sort(function(a, b) {
          return b.total - a.total;
        });
        var used = col.reduce(function(t, n) {
          return t + n.total * perUnit;
        }, 0) + (col.length - 1) * gap;
        var y = padT + (plotH - used) / 2;
        col.forEach(function(n) {
          n.x = colX(d2);
          n.y = y;
          n.h = Math.max(2, n.total * perUnit);
          n.inAt = n.y;
          n.outAt = n.y;
          y += n.h + gap;
        });
      });
      var idx = f.index;
      var ribbons = f.links.slice().sort(function(a, b) {
        return b.value - a.value;
      });
      var g = svgEl("g", { class: "ch-beat", "data-step": 0, "data-series": "0" });
      ribbons.forEach(function(l) {
        var a = f.nodes[idx[l.from]], b = f.nodes[idx[l.to]];
        var t = l.value * perUnit;
        var x1 = a.x + nodeW, x2 = b.x;
        var y1 = a.outAt, y2 = b.inAt;
        a.outAt += t;
        b.inAt += t;
        var mx = (x1 + x2) / 2;
        var d2 = "M" + x1 + " " + y1 + " C" + mx + " " + y1 + " " + mx + " " + y2 + " " + x2 + " " + y2 + " L" + x2 + " " + (y2 + t) + " C" + mx + " " + (y2 + t) + " " + mx + " " + (y1 + t) + " " + x1 + " " + (y1 + t) + " Z";
        var band = svgEl("path", { d: d2, class: "ch-flow", fill: chartColor(a.depth % 6) });
        var tip = svgEl("title", {});
        tip.textContent = l.from + " → " + l.to + ": " + fmt(l.value);
        band.appendChild(tip);
        g.appendChild(band);
      });
      svg.appendChild(g);
      f.nodes.forEach(function(n) {
        svg.appendChild(svgEl("rect", {
          x: n.x,
          y: n.y,
          width: nodeW,
          height: n.h,
          class: "ch-node",
          fill: chartColor(n.depth % 6)
        }));
        var last = n.depth === f.layers - 1;
        var lab = svgEl("text", {
          x: last ? n.x - 10 : n.x + nodeW + 10,
          y: n.y + n.h / 2 + 5,
          class: "ch-cat ch-node-label",
          "text-anchor": last ? "end" : "start"
        });
        lab.textContent = n.name + " · " + fmt(n.total);
        svg.appendChild(lab);
      });
      return svg;
    }
    function dumbbellChart(data, slide) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      if (data.series.length < 2) return svg;
      var a = data.series[0], b = data.series[1];
      var vals = [];
      [a, b].forEach(function(sr) {
        sr.values.forEach(function(v) {
          if (v != null) vals.push(v);
        });
      });
      if (!vals.length) return svg;
      var rng = niceRange(Math.min.apply(null, vals), Math.max.apply(null, vals));
      var longest = data.categories.reduce(function(n, c) {
        return Math.max(n, String(c).length);
      }, 0);
      var padL = Math.min(330, 40 + longest * 9.5);
      var plotW = W - padL - P.padR, plotH = H - P.padT - P.padB;
      var sx = function(v) {
        return padL + (v - rng.lo) / (rng.hi - rng.lo || 1) * plotW;
      };
      var rowH = plotH / Math.max(1, data.categories.length);
      axisTicks(rng.hi - rng.lo).forEach(function(t) {
        var x = sx(rng.lo + t);
        svg.appendChild(svgEl("line", { x1: x, y1: P.padT - 6, x2: x, y2: P.padT + plotH - rowH / 2 + 6, class: "ch-grid" }));
        var lab = svgEl("text", { x, y: P.padT + plotH + 18, class: "ch-tick", "text-anchor": "middle" });
        lab.textContent = fmt(rng.lo + t);
        svg.appendChild(lab);
      });
      data.categories.forEach(function(cat, i) {
        var va = a.values[i], vb = b.values[i];
        if (va == null || vb == null) return;
        var y = P.padT + rowH * i + rowH / 2 - rowH / 2 + 10;
        var g = svgEl("g", { class: "ch-beat ch-dumbbell", "data-step": i, "data-series": "0" });
        var lo = Math.min(sx(va), sx(vb)), hi = Math.max(sx(va), sx(vb));
        g.appendChild(svgEl("line", { x1: lo, y1: y, x2: hi, y2: y, class: "ch-bell-bar" }));
        [[va, 0], [vb, 1]].forEach(function(pair) {
          var dot = svgEl("circle", { cx: sx(pair[0]), cy: y, r: 8, fill: chartColor(pair[1]), class: "ch-bell-dot" });
          var tip = svgEl("title", {});
          tip.textContent = cat + " · " + (pair[1] ? b.name : a.name) + ": " + fmt(pair[0]);
          dot.appendChild(tip);
          g.appendChild(dot);
        });
        var diff = Math.abs(va - vb);
        if (hi - lo > 54) {
          var dl = svgEl("text", { x: (lo + hi) / 2, y: y - 12, class: "ch-tick", "text-anchor": "middle" });
          dl.textContent = fmt(diff);
          g.appendChild(dl);
        }
        var cl = svgEl("text", { x: padL - 14, y: y + 6, class: "ch-cat", "text-anchor": "end" });
        cl.textContent = cat;
        g.appendChild(cl);
        svg.appendChild(g);
      });
      return svg;
    }
    var ORDINAL_WORDS = [
      "none",
      "very low",
      "weak",
      "low",
      "l",
      "medium",
      "med",
      "moderate",
      "m",
      "high",
      "h",
      "strong",
      "very high",
      "severe"
    ];
    function matrixChart(slide) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var rows2 = SF.parseTable(slide.body);
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      if (rows2.length < 2) return svg;
      var head = rows2[0], body = rows2.slice(1);
      var cols = head.slice(1).filter(function(h) {
        return String(h).trim();
      });
      if (!cols.length) return svg;
      var seen = [];
      body.forEach(function(r) {
        cols.forEach(function(_, j) {
          var v = String(r[j + 1] || "").trim();
          if (v && seen.indexOf(v) < 0) seen.push(v);
        });
      });
      var ordered = seen.slice().sort(function(x, y) {
        var ix = ORDINAL_WORDS.indexOf(x.toLowerCase()), iy = ORDINAL_WORDS.indexOf(y.toLowerCase());
        if (ix >= 0 && iy >= 0) return ix - iy;
        if (ix >= 0) return -1;
        if (iy >= 0) return 1;
        return seen.indexOf(x) - seen.indexOf(y);
      });
      var rank = {};
      ordered.forEach(function(v, i) {
        rank[v] = ordered.length > 1 ? i / (ordered.length - 1) : 1;
      });
      var longest = body.reduce(function(n, r) {
        return Math.max(n, String(r[0] || "").length);
      }, 0);
      var padL = Math.min(300, 30 + longest * 9.5);
      var plotW = W - padL - P.padR, plotH = H - P.padT - 42;
      var cw = plotW / cols.length, rh = Math.min(34, plotH / Math.max(1, body.length + 1));
      cols.forEach(function(c, j) {
        var lab = svgEl("text", { x: padL + cw * j + cw / 2, y: P.padT + 16, class: "ch-cat", "text-anchor": "middle" });
        lab.textContent = c;
        svg.appendChild(lab);
      });
      body.forEach(function(r, i) {
        var y = P.padT + 30 + rh * i;
        var g = svgEl("g", { class: "ch-beat", "data-step": i, "data-series": "0" });
        var rl = svgEl("text", { x: padL - 12, y: y + rh * 0.62, class: "ch-cat", "text-anchor": "end" });
        rl.textContent = String(r[0] || "");
        g.appendChild(rl);
        cols.forEach(function(_, j) {
          var v = String(r[j + 1] || "").trim();
          if (!v) return;
          var t = rank[v] == null ? 0 : rank[v];
          var cell = svgEl("rect", {
            x: padL + cw * j + 4,
            y,
            width: Math.max(8, cw - 8),
            height: rh - 6,
            rx: 5,
            class: "ch-cell",
            fill: chartColor(0),
            "fill-opacity": (0.16 + t * 0.78).toFixed(2)
          });
          g.appendChild(cell);
          var tx = svgEl("text", {
            x: padL + cw * j + cw / 2,
            y: y + rh * 0.62,
            class: "ch-cell-label" + (t > 0.55 ? " on-dark" : ""),
            "text-anchor": "middle"
          });
          tx.textContent = v;
          g.appendChild(tx);
        });
        svg.appendChild(g);
      });
      return svg;
    }
    function multiplesChart(data, slide) {
      var W = CHART.w, H = CHART.h;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var panels = data.categories.map(function(name, i) {
        return { name, values: data.series.map(function(sr) {
          return sr.values[i];
        }) };
      }).filter(function(p) {
        return p.values.some(function(v) {
          return v != null;
        });
      });
      if (!panels.length || data.series.length < 2) return svg;
      var all = [];
      panels.forEach(function(p) {
        p.values.forEach(function(v) {
          if (v != null) all.push(v);
        });
      });
      var rng = niceRange(Math.min.apply(null, all), Math.max.apply(null, all));
      var cols = Math.min(panels.length, panels.length <= 4 ? panels.length : Math.ceil(Math.sqrt(panels.length * 1.9)));
      var rows2 = Math.ceil(panels.length / cols);
      var padTop = 26, padBottom = 34;
      var cellW = (W - 36) / cols, cellH = (H - padTop - padBottom) / rows2;
      var plotW = cellW - 30, plotH = Math.max(22, cellH - 48);
      panels.forEach(function(p, i) {
        var cx = 18 + i % cols * cellW, cy = padTop + Math.floor(i / cols) * cellH;
        var g = svgEl("g", { class: "ch-beat ch-multiple", "data-step": i, "data-series": "0" });
        var n = p.values.length;
        var sx = function(j) {
          return cx + 14 + (n < 2 ? plotW / 2 : plotW * j / (n - 1));
        };
        var sy = function(v) {
          return cy + 26 + plotH - (v - rng.lo) / (rng.hi - rng.lo || 1) * plotH;
        };
        var lab = svgEl("text", { x: cx + 14, y: cy + 12, class: "ch-cat ch-multiple-title" });
        lab.textContent = p.name;
        g.appendChild(lab);
        [rng.lo, rng.hi].forEach(function(v) {
          g.appendChild(svgEl("line", { x1: sx(0), x2: sx(n - 1), y1: sy(v), y2: sy(v), class: "ch-grid" }));
        });
        var first = null;
        var last = null;
        p.values.forEach(function(v) {
          if (v != null) {
            if (first === null) first = v;
            last = v;
          }
        });
        var slack = (rng.hi - rng.lo) * 0.02;
        var dir = first === null || last === null || Math.abs(last - first) <= slack ? "flat" : last > first ? "up" : "down";
        var pts = [];
        p.values.forEach(function(v, j) {
          if (v != null) pts.push([sx(j), sy(v)]);
        });
        if (pts.length > 1) {
          g.appendChild(svgEl("polyline", {
            points: pts.map(function(q) {
              return q[0].toFixed(1) + "," + q[1].toFixed(1);
            }).join(" "),
            fill: "none",
            class: "ch-mult-line dir-" + dir,
            "stroke-width": 2.5,
            "stroke-linejoin": "round"
          }));
        }
        p.values.forEach(function(v, j) {
          if (v == null) return;
          g.appendChild(svgEl("circle", { cx: sx(j), cy: sy(v), r: 3.5, class: "ch-mult-dot dir-" + dir }));
          if (j === 0 || j === n - 1) {
            var vl = svgEl("text", {
              x: sx(j),
              y: sy(v) - 8,
              class: "ch-mult-value",
              "text-anchor": j === 0 ? "start" : "end"
            });
            vl.textContent = fmt(v);
            g.appendChild(vl);
          }
        });
        [0, n - 1].forEach(function(j) {
          var t = svgEl("text", {
            x: sx(j),
            y: cy + 26 + plotH + 15,
            class: "ch-mult-axis",
            "text-anchor": j === 0 ? "start" : "end"
          });
          t.textContent = data.series[j] && data.series[j].name || "";
          g.appendChild(t);
        });
        svg.appendChild(g);
      });
      var note = svgEl("text", { x: 18, y: H - 10, class: "ch-tick" });
      note.textContent = "Every panel on the same " + fmt(rng.lo) + "–" + fmt(rng.hi) + " scale · rose, fell or held is shown by colour";
      svg.appendChild(note);
      return svg;
    }
    function lineChart(data, slide, area) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var longest = data.series.reduce(function(n, x) {
        return Math.max(n, x.name.length);
      }, 0);
      var labelRoom = Math.min(230, 18 + longest * 10.5);
      var padR = P.padR + labelRoom;
      var plotW = W - P.padL - padR, plotH = H - P.padT - P.padB;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var all = [];
      data.series.forEach(function(s) {
        s.values.forEach(function(v) {
          if (v != null) all.push(v);
        });
      });
      var max = niceMax(Math.max.apply(null, all.concat([0])));
      axisTicks(max).forEach(function(t) {
        var y = P.padT + plotH - t / max * plotH;
        svg.appendChild(svgEl("line", { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: "ch-grid" }));
        var lab = svgEl("text", { x: P.padL - 14, y: y + 7, class: "ch-tick", "text-anchor": "end" });
        lab.textContent = fmt(t);
        svg.appendChild(lab);
      });
      var cols = Math.max(1, data.categories.length - 1);
      var xAt = function(i) {
        return P.padL + (cols ? plotW * i / cols : plotW / 2);
      };
      var yAt = function(v) {
        return P.padT + plotH - v / max * plotH;
      };
      data.categories.forEach(function(cat, i) {
        var cl = svgEl("text", { x: xAt(i), y: H - P.padB + 30, class: "ch-cat", "text-anchor": "middle" });
        cl.textContent = cat;
        svg.appendChild(cl);
      });
      var ends = [];
      data.series.forEach(function(s, si) {
        var g = svgEl("g", { class: "ch-line", "data-step": si, "data-series": String(si) });
        var pts = [];
        s.values.forEach(function(v, i) {
          if (v != null) pts.push([xAt(i), yAt(v)]);
        });
        if (!pts.length) return;
        var d = pts.map(function(p, i) {
          return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
        }).join(" ");
        if (area) {
          var base = P.padT + plotH;
          var fillD = d + " L" + pts[pts.length - 1][0].toFixed(1) + " " + base + " L" + pts[0][0].toFixed(1) + " " + base + " Z";
          g.appendChild(svgEl("path", { d: fillD, fill: chartColor(si), opacity: 0.22, stroke: "none" }));
        }
        g.appendChild(svgEl("path", {
          d,
          fill: "none",
          stroke: chartColor(si),
          "stroke-width": 3,
          "stroke-linejoin": "round",
          "stroke-linecap": "round"
        }));
        pts.forEach(function(p) {
          g.appendChild(svgEl("circle", { cx: p[0], cy: p[1], r: 6, fill: chartColor(si), class: "ch-dot" }));
        });
        ends.push({ y: pts[pts.length - 1][1], x: pts[pts.length - 1][0], name: s.name, g });
        svg.appendChild(g);
      });
      var sorted = ends.slice().sort(function(a, b) {
        return a.y - b.y;
      });
      var crowded = sorted.some(function(e, i) {
        return i && e.y - sorted[i - 1].y < 26;
      });
      if (!crowded) {
        ends.forEach(function(e) {
          var lab = svgEl("text", { x: e.x + 14, y: e.y + 6, class: "ch-end" });
          lab.textContent = e.name;
          e.g.appendChild(lab);
        });
      }
      svg.appendChild(svgEl("line", { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: "ch-axis" }));
      return svg;
    }
    function pieChart(data, slide, donut) {
      var W = CHART.w, H = CHART.h;
      var cx = W / 2, cy = H / 2 + 4, R = Math.min(H / 2 - 14, 200);
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var vals = (data.series[0] ? data.series[0].values : []).map(function(v) {
        return v == null ? 0 : Math.max(0, v);
      });
      var total = vals.reduce(function(a, b) {
        return a + b;
      }, 0);
      if (!total) return svg;
      var angle = -Math.PI / 2;
      vals.forEach(function(v, i) {
        var sweep = v / total * Math.PI * 2;
        var a0 = angle, a1 = angle + sweep;
        angle = a1;
        if (!v) return;
        var large = sweep > Math.PI ? 1 : 0;
        var d = "M" + cx + " " + cy + " L" + (cx + R * Math.cos(a0)).toFixed(1) + " " + (cy + R * Math.sin(a0)).toFixed(1) + " A" + R + " " + R + " 0 " + large + " 1 " + (cx + R * Math.cos(a1)).toFixed(1) + " " + (cy + R * Math.sin(a1)).toFixed(1) + " Z";
        var g = svgEl("g", { class: "ch-slice", "data-step": i });
        g.appendChild(svgEl("path", { d, fill: chartColor(i), class: "ch-wedge" }));
        var mid = (a0 + a1) / 2, lr = R + 34;
        var lx = cx + lr * Math.cos(mid), ly = cy + lr * Math.sin(mid);
        var pct = Math.round(v / total * 100);
        var lab = svgEl("text", {
          x: lx,
          y: ly,
          class: "ch-slice-label",
          "text-anchor": Math.cos(mid) < -0.2 ? "end" : Math.cos(mid) > 0.2 ? "start" : "middle"
        });
        lab.textContent = (data.categories[i] || "") + " · " + pct + "%";
        g.appendChild(lab);
        svg.appendChild(g);
      });
      if (donut) {
        svg.appendChild(svgEl("circle", { cx, cy, r: R * 0.58, class: "ch-donut-hole" }));
        var tot = svgEl("text", { x: cx, y: cy + 2, class: "ch-donut-total", "text-anchor": "middle" });
        tot.textContent = fmt(total);
        svg.appendChild(tot);
        var cap = svgEl("text", { x: cx, y: cy + 30, class: "ch-donut-cap", "text-anchor": "middle" });
        cap.textContent = "total";
        svg.appendChild(cap);
      }
      return svg;
    }
    function layoutTreemap(nodes, x, y, w, h) {
      if (!nodes.length) return [];
      if (nodes.length === 1) {
        return [{ name: nodes[0].name, value: nodes[0].value, i: nodes[0].i, x, y, w, h }];
      }
      var total = 0;
      nodes.forEach(function(n) {
        total += n.value;
      });
      var acc = 0, mid = 0;
      for (var i = 0; i < nodes.length; i++) {
        acc += nodes[i].value;
        mid = i;
        if (acc >= total / 2) break;
      }
      var left = nodes.slice(0, mid + 1);
      var right = nodes.slice(mid + 1);
      if (!right.length) {
        return [{ name: nodes[0].name, value: nodes[0].value, i: nodes[0].i, x, y, w, h }];
      }
      var leftSum = 0;
      left.forEach(function(n) {
        leftSum += n.value;
      });
      var ratio = leftSum / total;
      if (w >= h) {
        return layoutTreemap(left, x, y, w * ratio, h).concat(layoutTreemap(right, x + w * ratio, y, w * (1 - ratio), h));
      }
      return layoutTreemap(left, x, y, w, h * ratio).concat(layoutTreemap(right, x, y + h * ratio, w, h * (1 - ratio)));
    }
    function treemapChart(data, slide) {
      var W = CHART.w, H = CHART.h;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var series = data.series[0];
      if (!series) return svg;
      var nodes = [];
      data.categories.forEach(function(cat, i) {
        var v = series.values[i];
        if (v == null || v <= 0) return;
        nodes.push({ name: cat, value: v, i });
      });
      nodes.sort(function(a, b) {
        return b.value - a.value;
      });
      var total = 0;
      nodes.forEach(function(n) {
        total += n.value;
      });
      if (!total) return svg;
      var gap = 3;
      var rects = layoutTreemap(nodes, gap, gap, W - gap * 2, H - gap * 2);
      rects.forEach(function(r) {
        var g = svgEl("g", { class: "ch-cell ch-beat", "data-step": r.i, "data-series": "0" });
        var pad = 1.5;
        g.appendChild(svgEl("rect", {
          x: r.x + pad,
          y: r.y + pad,
          width: Math.max(0, r.w - pad * 2),
          height: Math.max(0, r.h - pad * 2),
          fill: chartColor(r.i % 6),
          class: "ch-tree-rect",
          rx: 4
        }));
        if (r.w > 70 && r.h > 42) {
          var name = svgEl("text", {
            x: r.x + 14,
            y: r.y + 28,
            class: "ch-tree-label",
            "text-anchor": "start"
          });
          name.textContent = r.name;
          g.appendChild(name);
          var pct = Math.round(r.value / total * 100);
          var val = svgEl("text", {
            x: r.x + 14,
            y: r.y + 52,
            class: "ch-tree-value",
            "text-anchor": "start"
          });
          val.textContent = fmt(r.value) + " · " + pct + "%";
          g.appendChild(val);
        }
        svg.appendChild(g);
      });
      return svg;
    }
    function bulletChart(data, slide) {
      var W = CHART.w, H = CHART.h, P = { padL: 160, padR: 40, padT: 18, padB: 28 };
      var plotW = W - P.padL - P.padR;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var actual = data.series[0];
      var target = data.series[1] || null;
      if (!actual) return svg;
      var all = [];
      data.series.forEach(function(s) {
        s.values.forEach(function(v) {
          if (v != null) all.push(Math.abs(v));
        });
      });
      var max = niceMax(Math.max.apply(null, all.concat([0])));
      var rowH = Math.min(72, (H - P.padT - P.padB) / Math.max(1, data.categories.length));
      var trackH = Math.min(22, rowH * 0.38);
      var barH = Math.min(12, trackH * 0.55);
      data.categories.forEach(function(cat, ci) {
        var y = P.padT + rowH * ci + rowH / 2;
        var lab = svgEl("text", { x: P.padL - 16, y: y + 6, class: "ch-cat", "text-anchor": "end" });
        lab.textContent = cat;
        svg.appendChild(lab);
        var g = svgEl("g", { class: "ch-beat", "data-step": ci });
        g.appendChild(svgEl("rect", {
          x: P.padL,
          y: y - trackH / 2,
          width: plotW,
          height: trackH,
          class: "ch-bullet-track",
          rx: 2
        }));
        var av = actual.values[ci];
        if (av != null) {
          var bw = Math.max(0, Math.abs(av) / max * plotW);
          var bar = svgEl("g", { class: "ch-bar", "data-series": "0" });
          bar.appendChild(svgEl("rect", {
            x: P.padL,
            y: y - barH / 2,
            width: bw,
            height: barH,
            fill: chartColor(0),
            rx: 2
          }));
          g.appendChild(bar);
          var vlab = svgEl("text", {
            x: P.padL + bw + 10,
            y: y + 5,
            class: "ch-value",
            "text-anchor": "start"
          });
          vlab.textContent = fmt(av);
          g.appendChild(vlab);
        }
        if (target) {
          var tv = target.values[ci];
          if (tv != null) {
            var tx = P.padL + Math.abs(tv) / max * plotW;
            var mark = svgEl("g", { class: "ch-bullet-target", "data-series": "1" });
            mark.appendChild(svgEl("line", {
              x1: tx,
              y1: y - trackH * 0.7,
              x2: tx,
              y2: y + trackH * 0.7,
              class: "ch-bullet-tick"
            }));
            g.appendChild(mark);
          }
        }
        svg.appendChild(g);
      });
      return svg;
    }
    function comboChart(data, slide) {
      var W = CHART.w, H = CHART.h, P = CHART;
      var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      if (!data.series.length) return svg;
      var all = [];
      data.series.forEach(function(s) {
        s.values.forEach(function(v) {
          if (v != null) all.push(v);
        });
      });
      var max = niceMax(Math.max.apply(null, all.concat([0])));
      axisTicks(max).forEach(function(t) {
        var y = P.padT + plotH - t / max * plotH;
        svg.appendChild(svgEl("line", { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: "ch-grid" }));
        var lab = svgEl("text", { x: P.padL - 14, y: y + 7, class: "ch-tick", "text-anchor": "end" });
        lab.textContent = fmt(t);
        svg.appendChild(lab);
      });
      var band = plotW / Math.max(1, data.categories.length);
      var barW = Math.min(band * 0.48, 64);
      var cols = data.series[0];
      var colG = svgEl("g", { class: "ch-beat", "data-step": 0, "data-series": "0" });
      data.categories.forEach(function(cat, ci) {
        var v = cols.values[ci];
        if (v == null) return;
        var hgt = Math.max(0, v / max * plotH);
        var x = P.padL + band * ci + (band - barW) / 2;
        var y = P.padT + plotH - hgt;
        var g = svgEl("g", { class: "ch-bar" });
        var r = Math.min(4, barW / 2);
        var d = "M" + x + " " + (y + hgt) + " V" + (y + r) + " Q" + x + " " + y + " " + (x + r) + " " + y + " H" + (x + barW - r) + " Q" + (x + barW) + " " + y + " " + (x + barW) + " " + (y + r) + " V" + (y + hgt) + " Z";
        g.appendChild(svgEl("path", { d, fill: chartColor(0) }));
        colG.appendChild(g);
        var cl = svgEl("text", {
          x: P.padL + band * ci + band / 2,
          y: H - P.padB + 30,
          class: "ch-cat",
          "text-anchor": "middle"
        });
        cl.textContent = cat;
        svg.appendChild(cl);
      });
      svg.appendChild(colG);
      data.series.slice(1).forEach(function(s, mi) {
        var si = mi + 1;
        var g = svgEl("g", { class: "ch-markers ch-beat", "data-step": si, "data-series": String(si) });
        var pts = [];
        data.categories.forEach(function(cat, ci) {
          var v = s.values[ci];
          if (v == null) return;
          var cx = P.padL + band * ci + band / 2;
          var cy = P.padT + plotH - v / max * plotH;
          pts.push([cx, cy]);
          g.appendChild(svgEl("circle", {
            cx,
            cy,
            r: 7,
            fill: chartColor(si),
            class: "ch-marker",
            stroke: "var(--s-bg, #fff)",
            "stroke-width": 2
          }));
        });
        if (pts.length > 1) {
          var path = pts.map(function(p, i) {
            return (i ? "L" : "M") + p[0] + " " + p[1];
          }).join(" ");
          g.insertBefore(svgEl("path", {
            d: path,
            fill: "none",
            stroke: chartColor(si),
            "stroke-width": 2.5,
            class: "ch-marker-line",
            "stroke-dasharray": "4 5"
          }), g.firstChild);
        }
        svg.appendChild(g);
      });
      svg.appendChild(svgEl("line", {
        x1: P.padL,
        y1: P.padT + plotH,
        x2: P.padL + plotW,
        y2: P.padT + plotH,
        class: "ch-axis"
      }));
      return svg;
    }
    function waffleChart(data, slide) {
      var W = CHART.w, H = CHART.h;
      var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, class: "chart-svg", role: "img" });
      var series = data.series[0];
      if (!series) return svg;
      var parts = [];
      var total = 0;
      data.categories.forEach(function(cat, i2) {
        var v = series.values[i2];
        if (v == null || v <= 0) return;
        parts.push({ name: cat, value: v, i: i2 });
        total += v;
      });
      if (!total) return svg;
      var cells = [];
      if (parts.length === 1 && parts[0].value <= 100) {
        var n = Math.max(0, Math.min(100, Math.round(parts[0].value)));
        for (var a = 0; a < n; a++) cells.push(parts[0].i);
        for (var b = n; b < 100; b++) cells.push(-1);
      } else {
        var assigned = 0;
        parts.forEach(function(p, pi) {
          var count = pi === parts.length - 1 ? 100 - assigned : Math.round(p.value / total * 100);
          count = Math.max(0, Math.min(100 - assigned, count));
          for (var c = 0; c < count; c++) cells.push(p.i);
          assigned += count;
        });
        while (cells.length < 100) cells.push(-1);
        cells = cells.slice(0, 100);
      }
      parts.forEach(function(p) {
        var pct = parts.length === 1 && p.value <= 100 ? Math.round(p.value) : Math.round(p.value / total * 100);
        p.label = p.name + " · " + pct + "%";
      });
      var labelW = Math.max(160, Math.min(380, 52 + parts.reduce(function(m, p) {
        return Math.max(m, p.label.length);
      }, 0) * 9 + 24));
      var gridSize = Math.min(H - 40, W - labelW - 80);
      var cell = gridSize / 10;
      var gap = Math.max(2, cell * 0.08);
      var ox = labelW;
      var oy = (H - gridSize) / 2;
      for (var i = 0; i < 100; i++) {
        var col = i % 10;
        var row = Math.floor(i / 10);
        var idx = cells[i];
        var g = svgEl("g", {
          class: "ch-waffle-cell" + (idx < 0 ? " ch-waffle-empty" : " ch-cell"),
          "data-step": idx < 0 ? 0 : idx,
          "data-series": "0"
        });
        g.appendChild(svgEl("rect", {
          x: ox + col * cell + gap / 2,
          y: oy + row * cell + gap / 2,
          width: cell - gap,
          height: cell - gap,
          rx: 2,
          fill: idx < 0 ? "var(--s-muted, #ccc)" : chartColor(idx % 6),
          opacity: idx < 0 ? 0.22 : 1,
          class: "ch-waffle-sq"
        }));
        svg.appendChild(g);
      }
      parts.forEach(function(p, pi) {
        var y = oy + 22 + pi * 36;
        var item = svgEl("g", { class: "ch-beat", "data-step": p.i, "data-series": "0" });
        item.appendChild(svgEl("rect", {
          x: 24,
          y: y - 12,
          width: 18,
          height: 18,
          rx: 3,
          fill: chartColor(p.i % 6)
        }));
        var t = svgEl("text", { x: 52, y: y + 2, class: "ch-cat", "text-anchor": "start" });
        t.textContent = p.label;
        item.appendChild(t);
        svg.appendChild(item);
      });
      return svg;
    }
    function chartSvgFor(kind, data, slide, stepOf) {
      return kind === "multiples" ? multiplesChart(data, slide) : kind === "dumbbell" ? dumbbellChart(data, slide) : kind === "matrix" ? matrixChart(slide) : kind === "sankey" ? sankeyChart(slide) : kind === "radar" ? radarChart(data, slide) : kind === "scatter" ? scatterChart(slide) : kind === "histogram" ? histogramChart(slide) : kind === "box" ? boxChart(slide) : kind === "pictogram" ? pictogramChart(data, slide) : kind === "treemap" ? treemapChart(data, slide) : kind === "bullet" ? bulletChart(data, slide) : kind === "combo" ? comboChart(data, slide) : kind === "waffle" ? waffleChart(data, slide) : kind === "line" ? lineChart(data, slide, false) : kind === "area" ? lineChart(data, slide, true) : kind === "pie" ? pieChart(data, slide, false) : kind === "donut" ? pieChart(data, slide, true) : kind === "stack" ? stackedBar(data, slide, slide.progressive ? stepOf : null) : kind === "hbar" ? horizontalBar(data, slide) : barChart(data, slide, slide.progressive ? stepOf : null);
    }
    return { chartKey, chartTable, chartSvgFor, svgEl };
  }

  // src/render/explore.js
  function installExplore(SF) {
    var kinds = ["beforeafter", "explore", "simulation", "experiment"];
    function active2(slide) {
      return SF.MotionLab && SF.MotionLab.active(slide) || kinds.includes(slide.type) || slide.type === "chart" && slide.exploration && slide.exploration.prediction;
    }
    function config(slide) {
      return SF.normalizeExploration(slide.exploration);
    }
    function initial(slide) {
      return { position: 50, spot: -1, input: config(slide).initial, revealed: false, experimentStep: -1 };
    }
    function state2(player, slide) {
      return Object.assign(initial(slide), (player.exploreStates || {})[slide.id] || {});
    }
    function command(player, action, value) {
      var slide = player.deck && player.deck.slides[player.idx];
      if (!slide || !active2(slide) || player.frozen) return;
      var c = config(slide), next = state2(player, slide), n = Number(value);
      if (SF.MotionLab && SF.MotionLab.active(slide)) {
        var motionNext = SF.MotionLab.update(slide, next, action, value);
        if (!motionNext) return;
        Object.assign(next, motionNext);
      } else if (action === "experiment" && slide.type === "experiment" && SF.Experiments && Number.isInteger(n)) next.experimentStep = Math.max(-1, Math.min(SF.Experiments.config(slide).states.length - 1, n));
      else if (action === "experimentReplay" && slide.type === "experiment") next.experimentReplay = (next.experimentReplay || 0) + 1;
      else if (action === "reveal" && slide.type === "chart") next.revealed = value === true;
      else if (action === "position" && slide.type === "beforeafter" && Number.isFinite(n)) next.position = Math.max(0, Math.min(100, n));
      else if (action === "spot" && slide.type === "explore" && Number.isInteger(n)) next.spot = Math.max(-1, Math.min(c.spots.length - 1, n));
      else if (action === "input" && slide.type === "simulation" && Number.isFinite(n)) next.input = Math.max(c.min, Math.min(c.max, n));
      else return;
      player.exploreStates = player.exploreStates || {};
      player.exploreStates[slide.id] = next;
      if (player._current && player._current._exploreRefresh) player._current._exploreRefresh(next);
      queueSync(player);
    }
    var raf = typeof window !== "undefined" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : null;
    var syncQueued = false;
    function queueSync(player) {
      if (!raf) {
        player.syncPresenter();
        return;
      }
      if (syncQueued) return;
      syncQueued = true;
      raf(function() {
        syncQueued = false;
        player.syncPresenter();
      });
    }
    function nextAction(player) {
      var s = player.deck && player.deck.slides[player.idx];
      if (!s || !active2(s)) return null;
      var v = state2(player, s);
      if (SF.MotionLab && SF.MotionLab.active(s)) {
        var mv = SF.MotionLab.state(s, v), mode = s.motionScene;
        if (["mask", "scrub", "cause", "explode"].includes(mode)) return mv.sceneValue < 100 ? "comparison" : null;
        if (["draw", "annotate"].includes(mode)) return mv.sceneStep < SF.MotionLab.items(s).length ? "comparison" : null;
        return null;
      }
      if (s.type === "experiment") return v.experimentStep < SF.Experiments.config(s).states.length - 1 ? "comparison" : null;
      if (s.type === "chart" && !v.revealed) return "prediction";
      if (s.type === "explore" && v.spot < config(s).spots.length - 1) return "hotspot";
      if (s.type === "beforeafter" && v.position < 100) return "comparison";
      return null;
    }
    function step(player, direction) {
      var s = player.deck && player.deck.slides[player.idx];
      if (!s || !active2(s)) return false;
      var v = state2(player, s);
      if (SF.MotionLab && SF.MotionLab.active(s)) {
        var mv = SF.MotionLab.state(s, v), mode = s.motionScene;
        if (["mask", "scrub", "cause", "explode"].includes(mode)) {
          if (direction > 0 && mv.sceneValue < 100 || direction < 0 && mv.sceneValue > 0) {
            command(player, "motionValue", mv.sceneValue + direction * 25);
            return true;
          }
        } else if (["draw", "annotate"].includes(mode)) {
          if (direction > 0 && mv.sceneStep < SF.MotionLab.items(s).length || direction < 0 && mv.sceneStep > 0) {
            command(player, "motionStep", mv.sceneStep + direction);
            return true;
          }
        }
        return false;
      }
      if (s.type === "experiment") {
        var next = v.experimentStep + direction;
        if (next >= -1 && next < SF.Experiments.config(s).states.length) {
          command(player, "experiment", next);
          return true;
        }
        return false;
      }
      if (s.type === "chart" && v.revealed === direction < 0) {
        command(player, "reveal", direction > 0);
        return true;
      }
      if (s.type === "explore" && (direction > 0 && v.spot < config(s).spots.length - 1 || direction < 0 && v.spot >= 0)) {
        command(player, "spot", v.spot + direction);
        return true;
      }
      if (s.type === "beforeafter" && (direction > 0 && v.position < 100 || direction < 0 && v.position > 0)) {
        command(player, "position", direction > 0 ? 100 : 0);
        return true;
      }
      return false;
    }
    function node(tag, className, text2) {
      var n = document.createElement(tag);
      if (className) n.className = className;
      if (text2 != null) n.textContent = text2;
      return n;
    }
    function svg(tag, attrs) {
      var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.keys(attrs || {}).forEach(function(k) {
        n.setAttribute(k, attrs[k]);
      });
      return n;
    }
    function photo(url, alt) {
      var image = node("img", "explore-image");
      image.src = SF.safeMedia(url);
      image.alt = alt;
      image.draggable = false;
      image.onerror = function() {
        image.hidden = true;
        var host = image.parentElement;
        if (host) host.appendChild(node("p", "explore-empty", "Choose an image in Design & content."));
      };
      return image;
    }
    function render2(root, pad, slide, opts) {
      if (!active2(slide)) return;
      if (SF.MotionLab && SF.MotionLab.active(slide)) {
        SF.MotionLab.render(root, pad, slide, opts, SF.safeMedia);
        return;
      }
      if (slide.type === "experiment" && SF.Experiments) {
        SF.Experiments.render(root, pad, slide, opts);
        return;
      }
      var c = config(slide), view = Object.assign(initial(slide), opts.exploreState || {});
      var enabled = !!(opts.interactive || opts.exploreCommand);
      function send(action, value) {
        if (opts.exploreCommand) opts.exploreCommand(action, value);
      }
      function button(parent, text2, action) {
        var b = node("button", "explore-button", text2);
        b.type = "button";
        b.disabled = !enabled;
        b.onclick = action;
        parent.appendChild(b);
        return b;
      }
      function range(parent, label, min, max, value, action) {
        var wrap = node("label", "explore-range"), text2 = node("span", null, label);
        var input2 = node("input");
        input2.type = "range";
        input2.min = String(min);
        input2.max = String(max);
        input2.step = String((max - min) / 100);
        input2.value = String(value);
        input2.disabled = !enabled;
        input2.setAttribute("aria-label", label);
        input2.oninput = function() {
          send(action, Number(input2.value));
        };
        wrap.append(text2, input2);
        parent.appendChild(wrap);
        return input2;
      }
      root.classList.add("exploration-slide");
      if (slide.type === "chart") {
        var result = node("div", "explore-chart-result");
        Array.from(pad.children).forEach(function(child) {
          if (child.tagName !== "H2") result.appendChild(child);
        });
        var cover = node("div", "explore-predict");
        cover.append(node("span", "explore-eyebrow", "PREDICT FIRST"), node("h3", null, c.prompt), node("p", null, slide.feedback ? "Commit to a prediction. Discuss your reasoning, then compare with the data." : "Think, discuss, then compare your prediction with the data."));
        button(cover, "Reveal the chart", function() {
          send("reveal", true);
        });
        pad.append(cover, result);
        var again = button(pad, "Hide data · predict again", function() {
          send("reveal", false);
        });
        root._exploreRefresh = function(next) {
          view = Object.assign(view, next);
          result.hidden = !view.revealed;
          cover.hidden = view.revealed;
          again.hidden = !view.revealed;
          result.classList.toggle("explore-revealed", view.revealed);
        };
      } else {
        pad.replaceChildren();
        pad.appendChild(node("h2", null, slide.title || SF.SLIDE_TYPES[slide.type].label));
        if (slide.type === "beforeafter") {
          var frame = node("div", "explore-compare");
          frame.appendChild(photo(c.before, c.beforeLabel + ": " + c.alt));
          var after = node("div", "explore-after");
          after.appendChild(photo(c.after, c.afterLabel + ": " + c.alt));
          frame.appendChild(after);
          var divider = node("div", "explore-divider");
          frame.appendChild(divider);
          var beforeLabel = node("span", "explore-before-label", c.beforeLabel), afterLabel = node("span", "explore-after-label", c.afterLabel);
          frame.append(beforeLabel, afterLabel);
          if (enabled) {
            let drag2 = function(event) {
              var rect = frame.getBoundingClientRect();
              send("position", 100 - (event.clientX - rect.left) / rect.width * 100);
            };
            var drag = drag2;
            frame.style.touchAction = "none";
            frame.onpointerdown = function(event) {
              frame.setPointerCapture(event.pointerId);
              drag2(event);
            };
            frame.onpointermove = function(event) {
              if (frame.hasPointerCapture(event.pointerId)) drag2(event);
            };
            frame.onpointerup = frame.onpointercancel = function(event) {
              if (frame.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId);
            };
          }
          pad.appendChild(frame);
          var slider2 = range(pad, "Reveal after image", 0, 100, view.position, "position");
          var actions = node("div", "explore-actions");
          button(actions, c.beforeLabel, function() {
            send("position", 0);
          });
          button(actions, "Compare", function() {
            send("position", 50);
          });
          button(actions, c.afterLabel, function() {
            send("position", 100);
          });
          pad.appendChild(actions);
          root._exploreRefresh = function(next) {
            view = Object.assign(view, next);
            after.style.clipPath = "inset(0 0 0 " + (100 - view.position) + "%)";
            divider.style.left = 100 - view.position + "%";
            slider2.value = String(view.position);
            beforeLabel.hidden = view.position === 100;
            afterLabel.hidden = view.position === 0;
          };
        } else if (slide.type === "explore") {
          var scene2 = node("div", "explore-scene"), moving = node("div", "explore-moving"), mainImage = photo(slide.image, c.alt);
          moving.appendChild(mainImage);
          scene2.appendChild(moving);
          pad.appendChild(scene2);
          var caption = node("div", "explore-caption");
          caption.setAttribute("aria-live", "polite");
          pad.appendChild(caption);
          var spots = c.spots.map(function(spot2, i) {
            var b = button(moving, String(i + 1), function() {
              send("spot", i);
            });
            b.className = "explore-hotspot";
            b.style.left = spot2.x + "%";
            b.style.top = spot2.y + "%";
            b.setAttribute("aria-label", spot2.title);
            return b;
          });
          button(pad, "Whole image", function() {
            send("spot", -1);
          });
          root._exploreRefresh = function(next) {
            view = Object.assign(view, next);
            var spot2 = c.spots[view.spot];
            var width = scene2.clientWidth || 1160, height = scene2.clientHeight || 360;
            var iw = mainImage.naturalWidth || width, ih = mainImage.naturalHeight || height;
            var scale = Math.min(width / iw, height / ih), imageWidth = iw * scale, imageHeight = ih * scale;
            function point(p) {
              return { x: ((width - imageWidth) / 2 + p.x / 100 * imageWidth) / width * 100, y: ((height - imageHeight) / 2 + p.y / 100 * imageHeight) / height * 100 };
            }
            var target = spot2 ? point(spot2) : { x: 50, y: 50 };
            moving.style.transformOrigin = "0 0";
            moving.style.transform = spot2 ? "translate(" + (50 - target.x * spot2.zoom) + "%," + (50 - target.y * spot2.zoom) + "%) scale(" + spot2.zoom + ")" : "translate(0,0) scale(1)";
            caption.replaceChildren(node("strong", null, spot2 ? spot2.title : "Explore the image"), node("p", null, spot2 ? spot2.body : c.spots.length ? "Choose a numbered detail, or use Next to explore in order." : "Add image details in Design & content."));
            spots.forEach(function(b, i) {
              var p = point(c.spots[i]);
              b.style.left = p.x + "%";
              b.style.top = p.y + "%";
              b.setAttribute("aria-pressed", String(i === view.spot));
              b.style.transform = "translate(-50%,-50%) scale(" + 1 / (spot2 ? spot2.zoom : 1) + ")";
            });
          };
          mainImage.onload = function() {
            root._exploreRefresh(view);
          };
          requestAnimationFrame(function() {
            root._exploreRefresh(view);
          });
        } else {
          let X2 = function(x) {
            return 90 + (x - c.min) / (c.max - c.min) * 830;
          }, Y2 = function(y) {
            return 290 - (y - low) / (high - low) * 250;
          };
          var X = X2, Y = Y2;
          var graph = svg("svg", { viewBox: "0 0 1000 360", class: "explore-graph", role: "img" });
          var values = SF.explorationCurve(c, 100);
          var low = Math.min(0, ...values.map(function(p) {
            return p[1];
          })), high = Math.max(1, ...values.map(function(p) {
            return p[1];
          }));
          graph.append(svg("path", { d: "M90 30 V290 H930", fill: "none", stroke: "currentColor", "stroke-width": 2 }));
          [[90, 325, String(c.min)], [900, 325, String(c.max)], [15, 45, String(Math.round(high))], [15, 292, String(Math.round(low))]].forEach(function(a) {
            var t = svg("text", { x: a[0], y: a[1], fill: "currentColor", "font-size": 20 });
            t.textContent = String(a[2]);
            graph.appendChild(t);
          });
          graph.appendChild(svg("path", { d: values.map(function(p, i) {
            return (i ? "L" : "M") + X2(p[0]) + " " + Y2(p[1]);
          }).join(" "), fill: "none", stroke: "var(--accent,#1d6b45)", "stroke-width": 5 }));
          var marker = svg("circle", { r: 10, fill: "var(--accent,#1d6b45)", stroke: "currentColor", "stroke-width": 2 });
          graph.appendChild(marker);
          pad.appendChild(graph);
          var reading = node("output", "explore-reading");
          reading.setAttribute("aria-live", "polite");
          pad.appendChild(reading);
          var input = range(pad, c.inputLabel, c.min, c.max, view.input, "input");
          pad.appendChild(node("p", "explore-formula", c.outputLabel + " = " + c.a + " × " + c.inputLabel + (c.model === "quadratic" ? "²" : "") + " + " + c.b));
          button(pad, "Reset input", function() {
            send("input", c.initial);
          });
          root._exploreRefresh = function(next) {
            view = Object.assign(view, next);
            var output = SF.explorationValue(c, view.input);
            marker.setAttribute("cx", String(X2(view.input)));
            marker.setAttribute("cy", String(Y2(output)));
            input.value = String(view.input);
            reading.textContent = c.inputLabel + ": " + Number(view.input.toFixed(2)) + " → " + c.outputLabel + ": " + Number(output.toFixed(2));
            graph.setAttribute("aria-label", reading.textContent);
          };
        }
      }
      root._exploreRefresh(view);
    }
    function inspector(parent, slide, UI, changed, redraw) {
      if (slide.type === "experiment" && SF.Experiments) return SF.Experiments.inspector(parent, slide, UI, changed, redraw);
      if (!kinds.includes(slide.type) && slide.type !== "chart") return false;
      var c = config(slide);
      function commit(then) {
        slide.exploration = c;
        (then || changed)();
      }
      function text2(label, key, object) {
        var o = object || c;
        parent.appendChild(UI.field(label, UI.text(o[key] || "", function(v) {
          if (key === "prompt" && slide.feedback && slide.feedback.prompt === o[key]) slide.feedback.prompt = v;
          o[key] = v;
          commit();
        })));
      }
      function number(label, key, object) {
        var o = object || c;
        var input = node("input");
        input.type = "number";
        input.value = String(o[key]);
        input.oninput = function() {
          if (Number.isFinite(input.valueAsNumber)) {
            o[key] = input.valueAsNumber;
            commit();
          }
        };
        input.onchange = function() {
          Object.assign(c, SF.normalizeExploration(c));
          commit(redraw);
        };
        parent.appendChild(UI.field(label, input));
      }
      function image(label, key, object) {
        var o = object || c;
        text2(label + " URL", key, o);
        var file = node("input");
        file.type = "file";
        file.accept = "image/*";
        file.setAttribute("aria-label", "Upload " + label);
        file.onchange = function() {
          var f = file.files && file.files[0];
          if (!f) return;
          if (f.size > 3.5 * 1024 * 1024) {
            SF.toast("Choose an image smaller than 3.5 MB.");
            return;
          }
          var reader = new FileReader();
          reader.onload = function() {
            o[key] = String(reader.result);
            commit(redraw);
          };
          reader.readAsDataURL(f);
        };
        parent.appendChild(UI.field("Upload " + label, file));
        if (String(o[key] || "").trim()) {
          parent.appendChild(UI.button("Remove " + label.toLowerCase(), "ghost", function() {
            o[key] = "";
            commit(redraw);
          }));
        }
      }
      if (slide.type === "chart") {
        parent.appendChild(UI.check("Predict before revealing the chart", c.prediction, function(v) {
          c.prediction = v;
          commit(redraw);
        }));
        if (c.prediction) {
          text2("Prediction question", "prompt");
          parent.appendChild(UI.check("Collect predictions on learner devices", !!slide.feedback, function(v) {
            slide.feedback = v ? Object.assign(SF.makeFeedback("poll"), { prompt: c.prompt, options: ["Increasing", "Staying similar", "Decreasing"] }) : null;
            redraw();
          }));
          parent.appendChild(node("p", "hint", "Next reveals the whole chart. Edit response choices in Engagement. Results stay beside the data."));
        }
        return false;
      }
      text2("Title", "title", slide);
      if (slide.type === "beforeafter") {
        image("Before image", "before");
        image("After image", "after");
        text2("Before label", "beforeLabel");
        text2("After label", "afterLabel");
        text2("Image description", "alt");
      }
      if (slide.type === "explore") {
        image("Main image", "image", slide);
        text2("Image description", "alt");
        c.spots.forEach(function(spot2, i) {
          parent.appendChild(node("h4", null, "Detail " + (i + 1)));
          text2("Detail title", "title", spot2);
          text2("Explanation", "body", spot2);
          number("Horizontal position (%)", "x", spot2);
          number("Vertical position (%)", "y", spot2);
          number("Zoom (1–4)", "zoom", spot2);
          parent.appendChild(UI.button("Remove detail", "ghost", function() {
            c.spots.splice(i, 1);
            commit(redraw);
          }));
        });
        if (c.spots.length < 8) parent.appendChild(UI.button("Add image detail", "", function() {
          c.spots.push({ x: 50, y: 50, zoom: 2, title: "New detail", body: "What should learners notice?" });
          commit(redraw);
        }));
        parent.appendChild(node("p", "hint", "Positions are percentages of the image. Next visits details in order; Previous steps back."));
      }
      if (slide.type === "simulation") {
        parent.appendChild(UI.field("Relationship", UI.select([{ value: "linear", label: "Linear: y = ax + b" }, { value: "quadratic", label: "Quadratic: y = ax² + b" }], c.model, function(v) {
          c.model = v;
          commit();
        })));
        text2("Input label", "inputLabel");
        text2("Output label", "outputLabel");
        number("Minimum input", "min");
        number("Maximum input", "max");
        number("Starting input", "initial");
        number("Multiplier (a)", "a");
        number("Offset (b)", "b");
        parent.appendChild(node("p", "hint", "Present to drag the input and explore the graph. Input range is bounded to −1000…1000; multiplier to −100…100."));
      }
      return true;
    }
    SF.Explore = { ownsSteps: active2, render: render2, inspector, command, step, nextAction };
  }

  // src/render/experiments.js
  function installExperiments(SF) {
    var presets = {
      polling: { label: "Polling: pies to bars", prompt: "Which candidate gains most across the polls?", data: "Candidate	Poll A	Poll B	Poll C\n1	17	20	23\n2	18	20	22\n3	20	19	20\n4	22	21	18\n5	23	20	17", states: [
        { label: "Poll A", kind: "pie", series: 0, explanation: "Compare candidates 5 and 3. How confident are you?" },
        { label: "Poll B", kind: "pie", series: 1, explanation: "Which candidates improved? Comparing separate angles requires memory." },
        { label: "Poll C", kind: "pie", series: 2, explanation: "Now consider the trend across all three polls." },
        { label: "Same poll, lengths", kind: "bar", series: 2, categorical: true, explanation: "Watch each coloured slice become a bar. The Poll C values stay unchanged: only the encoding changes from angle to aligned length." },
        { label: "All polls together", kind: "bar", all: true, series: 2, explanation: "Now introduce all three polls; colour identifies the poll. Candidate 1 gains 6 percentage points from A to C. Candidate 2 gains 4. All bars share zero." }
      ] },
      integrity: { label: "Integrity: change the baseline", prompt: "The values stay at 100 and 110. How much bigger does the second bar look?", data: "Group	Value\nA	100\nB	110", states: [
        { label: "Zero baseline", kind: "bar", baseline: 0, explanation: "110 is 10% greater than 100. Bar lengths preserve that comparison." },
        { label: "Baseline at 90", kind: "bar", baseline: 90, explanation: "DELIBERATE DISTORTION: visible lengths are 10 and 20. A 10% data increase appears as a 100% length increase. Lie factor = 10." },
        { label: "Baseline at 95", kind: "bar", baseline: 95, explanation: "DELIBERATE DISTORTION: visible lengths are 5 and 15. The graphic shows a 200% increase. Lie factor = 20." },
        { label: "Restore context", kind: "bar", baseline: 0, explanation: "A bar encodes length. Restoring zero restores the relationship between length and quantity." }
      ] },
      clutter: { label: "Clutter: clean up a chart", prompt: "What gets your attention before you can compare the values?", data: "Day	Hires\nMon	42\nTue	58\nWed	47\nThu	70\nFri	64", states: [
        { label: "Cluttered", kind: "bar", clutter: true, explanation: "Heavy gridlines and decorative labels compete with the data." },
        { label: "Remove decoration", kind: "bar", heavyGrid: true, explanation: "Watch the decorative labels disappear. The values, bar positions and scale have not changed. What still competes for attention?" },
        { label: "Clear comparison", kind: "bar", explanation: "Same values and scale. Direct labels and a quiet baseline remain because they support the comparison." }
      ] },
      distortion: { label: "Distortion: shape and range", prompt: "Can the same observations appear to tell different stories?", data: "Period	Value\n1	30\n2	42\n3	38\n4	55\n5	44\n6	48", states: [
        { label: "Complete series", kind: "line", explanation: "The whole six-period series shows fluctuations and an overall increase." },
        { label: "Compressed width", kind: "line", narrow: true, explanation: "The values and scale are unchanged. A narrow plot makes the slopes look steeper." },
        { label: "Selected ending", kind: "line", start: 3, explanation: "DELIBERATELY SELECTED RANGE: periods 4–6 suggest decline. The earlier observations provide different context." }
      ] },
      channels: { label: "Marks and channels", prompt: "Which encoding makes close quantities easiest to compare?", data: "Item	Value\nA	20\nB	24\nC	38\nD	42", states: [
        { label: "Position", kind: "dot", explanation: "Points share a vertical scale. Compare their positions." },
        { label: "Area", kind: "bubbles", explanation: "Circle AREA represents value, so radius scales with the square root. Close comparisons become harder." },
        { label: "Hue only", kind: "hue", explanation: "Hue identifies categories but has no inherent numerical order. Labels are doing the quantitative work here." },
        { label: "Shape", kind: "shape", explanation: "Different symbols identify categories. Their shapes do not encode the numeric values." },
        { label: "Length", kind: "bar", explanation: "Bars encode the same quantities by length from a shared zero baseline." }
      ] },
      colour: { label: "Colour schemes", prompt: "Which palette expresses the structure of each attribute?", data: "Region	Count	Change\nNorth	20	-12\nEast	45	-4\nSouth	70	5\nWest	95	16", states: [
        { label: "Categorical", kind: "tiles", palette: "categorical", explanation: "Different regions have different identities. The hues imply no order." },
        { label: "Sequential counts", kind: "tiles", palette: "sequential", explanation: "Light to dark follows increasing counts. Values remain directly labelled." },
        { label: "Change in one ramp", kind: "tiles", palette: "sequential", series: 1, explanation: "Switch attribute from counts to signed change. A single light-to-dark ramp orders values but does not emphasise zero. Predict how two colour directions could help." },
        { label: "Diverging change", kind: "tiles", palette: "diverging", series: 1, explanation: "Blue and orange depart from a neutral zero midpoint. Negative and positive changes remain labelled." }
      ] },
      accessibility: { label: "Colour plus a second cue", prompt: "Can you still identify each group when the colour disappears?", data: "Group	Value\nNorth	20\nEast	24\nSouth	38\nWest	42", states: [
        { label: "Colour and labels", kind: "bar", categorical: true, explanation: "Every group has a direct label as well as a colour." },
        { label: "Without colour", kind: "bar", mono: true, explanation: "Position and labels preserve meaning in greyscale. This demonstration is not a colour-vision-deficiency simulation." }
      ] },
      structures: { label: "Dataset structures", prompt: "What is an item, a link, a field or a spatial boundary?", data: "Station	Hires\nA	20\nB	35\nC	60\nD	80", states: [
        { label: "Table", kind: "table", explanation: "Each row is an item. Station is an identifier and hires is an attribute." },
        { label: "Network", kind: "network", explanation: "Nodes represent stations; lines represent hypothetical connections. Links need their own data." },
        { label: "Field", kind: "field", explanation: "A synthetic temperature field sampled across space. Each location has a value, rather than a named station." },
        { label: "Geometry", kind: "geometry", explanation: "Illustrative region boundaries describe shape and position. These are not real borough boundaries." }
      ] },
      types: { label: "Attribute classification", prompt: "Do the values have order, meaningful differences, or meaningful ratios?", data: "Example	Value\nStation ID	0", states: [
        { label: "Nominal", kind: "classification", example: "Station 12 • Station 7 • Station 3", explanation: "Numbers can be names. Station 12 is not four times Station 3." },
        { label: "Ordinal", kind: "classification", example: "Low  ·  Medium  ·  High", explanation: "Order is meaningful. Equal gaps are not guaranteed." },
        { label: "Interval", kind: "classification", example: "10°C  ·  20°C  ·  30°C", explanation: "Equal temperature differences are meaningful. 20°C is not twice as hot as 10°C on an absolute scale." },
        { label: "Ratio", kind: "classification", example: "10 hires  ·  20 hires  ·  30 hires", explanation: "Zero means no hires. Twenty hires is twice ten hires." }
      ] },
      zoom: { label: "Chart overview and detail", prompt: "What changes when we focus on part of the series?", data: "Day	Hires\nMon	20\nTue	38\nWed	32\nThu	70\nFri	64\nSat	90", states: [
        { label: "Overview", kind: "line", explanation: "Start with the complete series." },
        { label: "Focus on Thu–Sat", kind: "line", start: 3, explanation: "This is a filtered detail, not missing data. The visible range is labelled and the vertical scale stays fixed." },
        { label: "Return to overview", kind: "line", explanation: "Restore the whole series to judge the detail in context." }
      ] }
    };
    function config(s) {
      var raw = s.experiment || {}, key = Object.prototype.hasOwnProperty.call(presets, raw.preset) ? raw.preset : "polling", preset2 = presets[key];
      var states = Array.isArray(raw.states) ? raw.states.filter(function(x) {
        return x && typeof x === "object" && !Array.isArray(x);
      }) : [];
      return { prompt: String(raw.prompt || preset2.prompt), states: (states.length ? states : preset2.states).slice(0, 8), preset: key, duration: Math.max(200, Math.min(4e3, Number(raw.duration) || 1600)) };
    }
    function node(tag, text2, parent) {
      var n = document.createElement(tag);
      if (text2 != null) n.textContent = text2;
      if (parent) parent.appendChild(n);
      return n;
    }
    function svg(tag, attrs, parent, text2) {
      var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.keys(attrs || {}).forEach(function(k) {
        n.setAttribute(k, attrs[k]);
      });
      if (text2 != null) n.textContent = text2;
      if (parent) parent.appendChild(n);
      return n;
    }
    function mark(parent, key, kind, a) {
      var points = [], vertices;
      if (kind === "rect") vertices = [[a.x, a.y], [a.x + a.width, a.y], [a.x + a.width, a.y + a.height], [a.x, a.y + a.height]];
      if (kind === "polygon") vertices = a.vertices;
      for (var i = 0; i < 64; i++) {
        if (kind === "circle") {
          var angle = -Math.PI / 2 + i / 64 * Math.PI * 2;
          points.push([a.cx + a.r * Math.cos(angle), a.cy + a.r * Math.sin(angle)]);
        } else if (kind === "sector") {
          var angle = (
            /** @type {number} */
            a.start + (a.end - a.start) * Math.max(0, Math.min(1, (i - 8) / 47))
          ), radius = i < 8 ? a.r * i / 8 : i > 55 ? a.r * (64 - i) / 9 : a.r;
          points.push([a.cx + radius * Math.cos(angle), a.cy + radius * Math.sin(angle)]);
        } else {
          var p = i / 64 * vertices.length, j = Math.floor(p), t = p - j, u = vertices[j], v = vertices[(j + 1) % vertices.length];
          points.push([u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t]);
        }
      }
      return svg("polygon", { "data-motion": key, points: points.map(function(p2) {
        return p2.join(",");
      }).join(" "), fill: a.fill, stroke: a.stroke || "none", "stroke-width": a.stroke ? 2 : 0 }, parent);
    }
    var colours = ["#0072b2", "#d55e00", "#009e73", "#cc79a7", "#8a6500", "#5b4ba8"];
    function draw(host, s, c, state2) {
      var data = SF.chartData(s), series = data.series;
      var current = series[Math.max(0, Math.min(series.length - 1, Number(state2.series) || 0))];
      var rows2 = data.categories.slice(0, 12).map(function(name, i) {
        return { name, index: i, value: current && current.values[i] };
      }).filter(function(r) {
        return Number.isFinite(r.value);
      });
      var chart = svg("svg", { viewBox: "0 0 1000 370", role: "img", "aria-label": state2.label || "Predict and compare" }, host);
      svg("title", {}, chart, (state2.label || "Chart") + ": " + rows2.map(function(r) {
        return r.name + " " + r.value;
      }).join(", "));
      var ink = "currentColor";
      function text2(x, y2, value2, size, anchor, key) {
        var attrs = { x, y: y2, fill: ink, "font-size": size || 22, "text-anchor": anchor || "start" };
        if (key) attrs["data-motion"] = key;
        if (typeof value2 === "number") attrs["data-number"] = "true";
        return svg("text", attrs, chart, String(value2));
      }
      function colour(i) {
        return state2.mono ? "#636363" : colours[i % colours.length];
      }
      if (state2.kind === "classification") {
        text2(500, 150, state2.example || "", 36, "middle");
        text2(500, 220, state2.label, 26, "middle");
        return;
      }
      if (!rows2.length) {
        text2(500, 180, "Add a table with category labels and numeric values.", 24, "middle");
        return;
      }
      var max = Math.max(1, ...series.flatMap(function(a) {
        return a.values.filter(Number.isFinite);
      }));
      var min = Math.min(0, ...state2.all ? series.flatMap(function(a) {
        return a.values.filter(Number.isFinite);
      }) : rows2.map(function(r) {
        return r.value;
      }));
      var baseline = Number.isFinite(Number(state2.baseline)) ? Number(state2.baseline) : min;
      if (baseline >= max) baseline = min;
      var top = 50, bottom = 300, left = 100, right = 930;
      if (state2.narrow) {
        left = 350;
        right = 650;
      }
      function y(v) {
        return bottom - (v - baseline) / (max - baseline) * (bottom - top);
      }
      if (state2.kind === "pie") {
        var sum = rows2.reduce(function(a, r) {
          return a + Math.max(0, r.value);
        }, 0), angle = -Math.PI / 2;
        if (!sum || rows2.some(function(r) {
          return r.value < 0;
        })) {
          text2(500, 180, "A pie needs positive parts of a whole.", 24, "middle");
          return;
        }
        rows2.forEach(function(r, i) {
          var end = angle + r.value / sum * Math.PI * 2, cx = 350, cy = 175, rad = 145;
          mark(chart, "mark:" + r.index, "sector", { cx, cy, r: rad, start: angle, end, fill: colour(i), stroke: "white" });
          text2(570, 65 + i * 32, r.name, 21, "start", "category:" + r.index);
          text2(760, 65 + i * 32, r.value, 21, "middle", "value:" + r.index);
          angle = end;
        });
        text2(350, 355, current.name, 22, "middle");
        return;
      }
      if (state2.kind === "table") {
        text2(180, 40, "Station", 24);
        text2(620, 40, current.name, 24);
        var rowHeight = Math.min(55, 270 / rows2.length);
        rows2.forEach(function(r, i) {
          text2(180, 80 + i * rowHeight, r.name, 20, "start", "category:" + r.index);
          text2(620, 80 + i * rowHeight, r.value, 20, "middle", "value:" + r.index);
        });
        return;
      }
      if (state2.kind === "network") {
        var locations = rows2.map(function(r, i) {
          var a = i / rows2.length * Math.PI * 2;
          return { x: 500 + 330 * Math.cos(a), y: 175 + 115 * Math.sin(a) };
        });
        locations.forEach(function(p, i) {
          if (!i) return;
          var prev = locations[i - 1];
          svg("line", { x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, stroke: ink, "stroke-width": 3 }, chart);
        });
        rows2.forEach(function(r, i) {
          var p = locations[i];
          mark(chart, "mark:" + r.index, "circle", { cx: p.x, cy: p.y, r: 24, fill: colour(i) });
          text2(p.x, p.y + 45, r.name, 20, "middle", "category:" + r.index);
        });
        return;
      }
      if (state2.kind === "geometry") {
        ["100,70 390,50 430,170 120,190", "390,50 790,80 870,220 430,170", "120,190 430,170 480,320 150,290", "430,170 870,220 800,330 480,320"].forEach(function(p, i) {
          svg("polygon", { points: p, fill: colour(i), "fill-opacity": 0.22, stroke: ink, "stroke-width": 3 }, chart);
        });
        text2(500, 360, "Illustrative boundaries; no measured quantity encoded", 19, "middle");
        return;
      }
      if (state2.kind === "field") {
        for (var yy = 0; yy < 6; yy++) for (var xx = 0; xx < 12; xx++) {
          var temp = 10 + xx + yy;
          svg("rect", { x: 100 + xx * 65, y: 20 + yy * 46, width: 64, height: 45, fill: "hsl(205,65%," + (93 - (temp - 10) * 3.5) + "%)" }, chart);
          text2(132 + xx * 65, 49 + yy * 46, temp, 16, "middle");
        }
        text2(500, 340, "Synthetic temperature samples (°C) across space", 22, "middle");
        return;
      }
      if (["tiles", "bubbles", "hue", "shape"].includes(state2.kind)) {
        var abs = Math.max(1, ...rows2.map(function(r) {
          return Math.abs(r.value);
        }));
        rows2.forEach(function(r, i) {
          var x = 90 + (i + 0.5) * 820 / rows2.length, fill2 = colour(i);
          if (state2.palette === "sequential") fill2 = "hsl(205,65%," + (92 - (r.value - min) / (max - min) * 60) + "%)";
          if (state2.palette === "diverging") fill2 = "hsl(" + (r.value < 0 ? 210 : 28) + ",70%," + (95 - Math.abs(r.value) / abs * 55) + "%)";
          if (state2.kind === "bubbles") mark(chart, "mark:" + r.index, "circle", { cx: x, cy: 150, r: Math.sqrt(Math.max(0, r.value) / max) * Math.min(85, 340 / rows2.length), fill: fill2 });
          else if (state2.kind === "hue") mark(chart, "mark:" + r.index, "circle", { cx: x, cy: 150, r: Math.min(55, 340 / rows2.length), fill: fill2 });
          else if (state2.kind === "shape") {
            var radius = Math.min(45, 300 / rows2.length);
            if (i % 4 === 0) mark(chart, "mark:" + r.index, "circle", { cx: x, cy: 150, r: radius, fill: fill2 });
            else if (i % 4 === 1) mark(chart, "mark:" + r.index, "rect", { x: x - radius, y: 150 - radius, width: radius * 2, height: radius * 2, fill: fill2 });
            else mark(chart, "mark:" + r.index, "polygon", { vertices: i % 4 === 2 ? [[x, 150 - radius], [x - radius, 150 + radius], [x + radius, 150 + radius]] : [[x, 150 - radius], [x + radius, 150], [x, 150 + radius], [x - radius, 150]], fill: fill2 });
          } else {
            var tileWidth = Math.min(130, 720 / rows2.length);
            mark(chart, "mark:" + r.index, "rect", { x: x - tileWidth / 2, y: 80, width: tileWidth, height: 140, fill: fill2 });
          }
          text2(x, 270, r.name, 21, "middle", "category:" + r.index);
          text2(x, 305, r.value, 24, "middle", "value:" + r.index);
        });
        text2(500, 360, state2.palette === "diverging" ? "Blue: negative · neutral: zero · orange: positive" : current.name, 19, "middle");
        return;
      }
      var start = Math.min(rows2.length - 1, Math.max(0, Math.floor(Number(state2.start) || 0)));
      var shown = rows2.slice(start);
      for (var tick = 0; tick <= 4; tick++) {
        var value = baseline + (max - baseline) * tick / 4, py = y(value);
        svg("line", { "data-motion": "grid:" + tick, x1: left, y1: py, x2: right, y2: py, stroke: ink, "stroke-opacity": state2.clutter || state2.heavyGrid ? 0.7 : 0.15, "stroke-width": state2.clutter || state2.heavyGrid ? 3 : 1 }, chart);
        text2(left - 12, py + 6, Math.round(value * 10) / 10, 18, "end", "tick:" + tick);
      }
      text2(left, 25, current.name, 19);
      var points = [];
      shown.forEach(function(r, i) {
        var x = left + (i + 0.5) * (right - left) / shown.length;
        if (state2.kind === "line" || state2.kind === "dot") {
          points.push({ x, y: y(r.value), id: r.index });
          mark(chart, "mark:" + r.index, "circle", { cx: x, cy: y(r.value), r: 7, fill: colour(state2.kind === "dot" ? r.index : 0) });
          text2(x, y(r.value) - 15, r.value, 19, "middle", "value:" + r.index);
        } else {
          var ss = state2.all ? series.slice(0, 4) : [current], space = (right - left) / shown.length * 0.7, w = space / ss.length;
          ss.forEach(function(a, j) {
            var v = a.values[r.index];
            if (!Number.isFinite(v)) return;
            if (v < baseline) {
              text2(x, 280, "Below axis", 15, "middle");
              return;
            }
            var zero = y(Math.max(0, baseline));
            var suffix = state2.all && j !== (Number(state2.series) || 0) ? ":series" + j : "";
            mark(chart, "mark:" + r.index + suffix, "rect", { x: x - space / 2 + j * w, y: Math.min(y(v), zero), width: Math.max(2, w - 4), height: Math.abs(zero - y(v)), fill: colour(state2.all ? j : state2.categorical || c.preset === "channels" ? r.index : 0) });
            text2(x - space / 2 + j * w + w / 2, y(v) - 9, v, 17, "middle", "value:" + r.index + suffix);
          });
        }
        text2(x, 330, r.name, 19, "middle", "category:" + r.index);
        if (state2.clutter) text2(x, 65, "★ WOW ★", 18, "middle", "clutter:" + r.index);
      });
      if (state2.kind === "line") points.forEach(function(p, i) {
        if (!i) return;
        var q = points[i - 1];
        svg("line", { "data-motion": "connection:" + q.id + ":" + p.id, x1: q.x, y1: q.y, x2: p.x, y2: p.y, stroke: colour(0), "stroke-width": 3 }, chart);
      });
      if (state2.all) series.slice(0, 4).forEach(function(a, i) {
        svg("rect", { x: 220 + i * 200, y: 349, width: 15, height: 15, fill: colour(i) }, chart);
        text2(245 + i * 200, 363, a.name, 18);
      });
      else text2(500, 364, start ? "Visible range: " + shown[0].name + "–" + shown[shown.length - 1].name + " (filtered from " + rows2.length + " observations)" : "Baseline: " + baseline, 18, "middle");
    }
    function render2(root, pad, s, opts) {
      var c = config(s), step = opts.exploreState && Number.isInteger(opts.exploreState.experimentStep) ? opts.exploreState.experimentStep : -1;
      var lastStep = -1, fromStep = -1, replayToken = opts.exploreState && opts.exploreState.experimentReplay || 0;
      var staticView = opts.interactive === false && !opts.exploreCommand;
      if (staticView && !opts.exploreState) step = c.states.length - 1;
      root.classList.add("experiment-slide", "exploration-slide");
      pad.replaceChildren();
      node("h2", s.title || "Predict and compare", pad).className = "ve-title";
      var prompt = node("p", c.prompt, pad);
      prompt.className = "ve-prompt";
      var plot = node("div", "", pad);
      plot.className = "ve-plot";
      var controls = node("div", "", pad);
      controls.className = "ve-controls";
      if (staticView) controls.hidden = true;
      var explanation = node("p", "", pad);
      explanation.className = "ve-explanation";
      explanation.setAttribute("aria-live", "polite");
      var source = node("p", s.chartSource || "Illustrative teaching data", pad);
      source.className = "ve-source";
      if (SF.chartData(s).categories.length > 12) source.textContent += " Showing the first 12 categories only.";
      function send(n) {
        if (opts.exploreCommand) opts.exploreCommand("experiment", n);
        else {
          step = n;
          paint();
        }
      }
      var predict = node("button", "Predict first", controls);
      predict.type = "button";
      predict.onclick = function() {
        send(-1);
      };
      var buttons = c.states.map(function(st, i) {
        var b = node("button", st.label || "State " + (i + 1), controls);
        b.type = "button";
        b.onclick = function() {
          send(i);
        };
        return b;
      });
      var replay = node("button", "↻ Replay change", controls);
      replay.type = "button";
      replay.onclick = function() {
        if (opts.exploreCommand) opts.exploreCommand("experimentReplay", 0);
        else paint(true);
      };
      function picture(n) {
        var buffer = document.createElement("div"), st = c.states[n];
        draw(buffer, s, c, st);
        if (st.hideValues) {
          buffer.querySelectorAll('[data-motion^="value:"]').forEach(function(el) {
            el.remove();
          });
          var title = buffer.querySelector("title");
          if (title) title.textContent = st.label + " — estimate the quantities before revealing the labels.";
        }
        return buffer.firstElementChild;
      }
      function paint(replaying) {
        step = Math.max(-1, Math.min(c.states.length - 1, step));
        if (!replaying && step !== lastStep) {
          fromStep = lastStep;
          lastStep = step;
        }
        predict.setAttribute("aria-pressed", String(step < 0));
        buttons.forEach(function(b, i) {
          b.setAttribute("aria-pressed", String(i === step));
        });
        replay.disabled = step < 0 || fromStep < 0;
        if (step < 0) {
          if (SF.ChartMotion) SF.ChartMotion.cancel(plot);
          plot.replaceChildren();
          var wait = node("p", "Make a prediction. Explain your reasoning, then reveal the first state.", plot);
          wait.className = "ve-predict";
          explanation.textContent = "";
        } else {
          var st = c.states[step], target = picture(step);
          if (SF.ChartMotion) {
            if (replaying && fromStep >= 0) SF.ChartMotion.transition(plot, picture(fromStep), { instant: true });
            SF.ChartMotion.transition(plot, target, { duration: c.duration, instant: staticView });
          } else plot.replaceChildren(target);
          explanation.textContent = String(st.explanation || "");
        }
      }
      root._exploreRefresh = function(next) {
        var n = Number.isInteger(next.experimentStep) ? next.experimentStep : -1, token = next.experimentReplay || 0;
        if (n === step && token === replayToken) return;
        var replaying = n === step && token !== replayToken;
        step = n;
        replayToken = token;
        paint(replaying);
      };
      paint();
    }
    function inspector(parent, s, UI, changed, redraw) {
      var c = config(s);
      parent.appendChild(UI.field("Demonstration", UI.select(Object.keys(presets).map(function(k) {
        return { value: k, label: presets[k].label };
      }), c.preset, function(v) {
        s.experiment = { preset: v };
        s.body = presets[v].data;
        s.chartSource = "Illustrative teaching data";
        redraw();
      })));
      parent.appendChild(UI.field("Title", UI.text(s.title || "", function(v) {
        s.title = v;
        changed();
      })));
      parent.appendChild(UI.field("Prediction prompt", UI.text(c.prompt, function(v) {
        s.experiment = Object.assign({}, s.experiment, { prompt: v });
        changed();
      })));
      parent.appendChild(UI.field("Transformation pace", UI.select([{ value: "800", label: "Quick — 0.8 seconds" }, { value: "1600", label: "Teaching — 1.6 seconds" }, { value: "3000", label: "Slow observation — 3 seconds" }], String(c.duration), function(v) {
        s.experiment = Object.assign({}, s.experiment, { duration: Number(v) });
        changed();
      })));
      var table = node("textarea");
      table.rows = 7;
      table.value = s.body || presets[c.preset].data;
      table.setAttribute("aria-label", "Dataset");
      table.onchange = function() {
        s.body = table.value;
        changed();
      };
      parent.appendChild(UI.field("Data: tab-separated headings and values", table));
      parent.appendChild(UI.field("Data source / units", UI.text(s.chartSource || "", function(v) {
        s.chartSource = v;
        changed();
      })));
      ["changes", "constants", "takeaway", "caveat"].forEach(function(key) {
        var labels = { changes: "PDF: what changes", constants: "PDF: what stays fixed", takeaway: "PDF: key takeaway", caveat: "PDF: limitations / caution" };
        parent.appendChild(UI.field(labels[key], UI.text(((s.experiment || {}).print || {})[key] || "", function(v) {
          s.experiment = Object.assign({}, s.experiment, { print: Object.assign({}, (s.experiment || {}).print, { [key]: v }) });
          changed();
        })));
      });
      c.states.forEach(function(st, i) {
        function save(key, v) {
          var states = c.states.map(function(x) {
            return Object.assign({}, x);
          });
          states[i][key] = v;
          c.states = states;
          s.experiment = Object.assign({}, s.experiment, { states });
          changed();
        }
        parent.appendChild(UI.field("State " + (i + 1) + " label", UI.text(st.label || "", function(v) {
          save("label", v);
        })));
        parent.appendChild(UI.field("Explanation", UI.text(st.explanation || "", function(v) {
          save("explanation", v);
        })));
        parent.appendChild(UI.check("Hide values for an estimation challenge", !!st.hideValues, function(v) {
          save("hideValues", v);
        }));
        parent.appendChild(UI.field("Visual", UI.select(["bar", "pie", "line", "dot", "bubbles", "hue", "shape", "tiles", "table", "network", "field", "geometry", "classification"].map(function(k) {
          return { value: k, label: k };
        }), st.kind || "bar", function(v) {
          save("kind", v);
        })));
        var choices = SF.chartData(s).series.map(function(a, j) {
          return { value: String(j), label: a.name };
        });
        if (choices.length) parent.appendChild(UI.field("Data series", UI.select(choices, String(st.series || 0), function(v) {
          save("series", Number(v));
        })));
        if (st.kind === "tiles") parent.appendChild(UI.field("Palette", UI.select(["categorical", "sequential", "diverging"].map(function(k) {
          return { value: k, label: k };
        }), st.palette || "categorical", function(v) {
          save("palette", v);
        })));
        if (st.kind === "bar") {
          parent.appendChild(UI.check("Compare all series", !!st.all, function(v) {
            save("all", v);
          }));
          parent.appendChild(UI.check("Show deliberate clutter", !!st.clutter, function(v) {
            save("clutter", v);
          }));
          parent.appendChild(UI.check("Greyscale", !!st.mono, function(v) {
            save("mono", v);
          }));
        }
        if (["bar", "line", "dot"].includes(st.kind)) {
          var base = node("input");
          base.type = "number";
          base.value = String(st.baseline || 0);
          base.onchange = function() {
            if (Number.isFinite(base.valueAsNumber)) save("baseline", base.valueAsNumber);
          };
          parent.appendChild(UI.field("Axis minimum", base));
        }
        parent.appendChild(UI.button("Remove state " + (i + 1), "ghost", function() {
          if (c.states.length < 2) {
            SF.toast("Keep at least one state.");
            return;
          }
          s.experiment = Object.assign({}, s.experiment, { states: c.states.filter(function(_, j) {
            return j !== i;
          }) });
          redraw();
        }));
      });
      if (c.states.length < 8) parent.appendChild(UI.button("Add visual state", "", function() {
        s.experiment = Object.assign({}, s.experiment, { states: c.states.concat([{ label: "New state", kind: "bar", explanation: "" }]) });
        redraw();
      }));
      parent.appendChild(node("p", "Present: Next reveals each state; Previous steps back. Up to 12 categories and 4 grouped series display. Edit explanations when changing data. Field and geometry are illustrative examples. Changing the experiment resets its data and states."));
      return true;
    }
    function staticState(s, index) {
      var host = document.createElement("div"), c = config(s), st = c.states[index];
      draw(host, s, c, st);
      if (st.hideValues) {
        host.querySelectorAll('[data-motion^="value:"]').forEach(function(el) {
          el.remove();
        });
        host.querySelector("title").textContent = st.label + " — estimate before reading the reveal.";
      }
      return host.firstElementChild;
    }
    SF.Experiments = { config, render: render2, inspector, presets, staticState };
  }

  // src/render/words.js
  function createWordRenderer(helpers) {
    const { el } = helpers;
    function statementBand(text2) {
      var n = String(text2 || "").trim().length;
      return n <= 24 ? "xs" : n <= 48 ? "sm" : n <= 90 ? "md" : n <= 170 ? "lg" : "xl";
    }
    function statementWordSize(word) {
      return Math.min(320, Math.floor(1088 / (0.58 * Math.max(1, word.length))));
    }
    var WORD_EFFECTS = ["rise", "fade", "reveal"];
    var WORD_SPAN_MS = 900;
    var WORD_ARCS = {
      settle: { on: "sf-word-plan", loop: "sf-cycle-plan" },
      bounce: { on: "sf-word-plan-bounce", loop: "sf-cycle-plan" },
      mist: { on: "sf-word-plan-mist", loop: "sf-cycle-mist" }
    };
    var LETTER_CAP = 30;
    var WORD_SPEEDS = {
      gentle: { dur: 1300, cycle: 13e3, span: 1.8, lift: "0.85em" },
      medium: { dur: 700, cycle: 7e3, span: 1, lift: "0.55em" },
      quick: { dur: 320, cycle: 3600, span: 0.45, lift: "0.34em" }
    };
    var WORD_STAGGERS = { together: 0, wave: 1, one: 2.5 };
    var WORD_FROMS = {
      first: function(i, last) {
        return last ? i / last : 0;
      },
      last: function(i, last) {
        return last ? 1 - i / last : 0;
      },
      /* Distance from the middle, normalised so the centre word is 0 and both
         ends are 1. An even number of words has no middle word, so the two
         nearest it share the first beat — which is what "from the centre"
         means when there is no centre. */
      center: function(i, last) {
        if (!last) return 0;
        var middle = last / 2;
        return Math.abs(i - middle) / middle;
      }
    };
    function wordFrom(slide) {
      var want = String((slide.design || {}).wordFrom || "").trim();
      return Object.prototype.hasOwnProperty.call(WORD_FROMS, want) ? want : "first";
    }
    function wordSpeed(slide) {
      var want = String((slide.design || {}).wordSpeed || "").trim();
      return WORD_SPEEDS[want] ? want : "medium";
    }
    function wordStagger(slide) {
      var want = String((slide.design || {}).wordStagger || "").trim();
      return Object.prototype.hasOwnProperty.call(WORD_STAGGERS, want) ? want : "wave";
    }
    function wrapWords(node, opts) {
      var texts = [];
      (function walk(n) {
        for (var i = 0; i < n.childNodes.length; i++) {
          var kid = n.childNodes[i];
          if (kid.nodeType === 3) {
            if (String(kid.nodeValue).trim()) texts.push(kid);
          } else if (kid.nodeType === 1) walk(kid);
        }
      })(node);
      var letters = !!(opts && opts.unit === "letter");
      var said = texts.map(function(t) {
        return String(t.nodeValue);
      }).join("").trim();
      var total = 0;
      texts.forEach(function(text2) {
        String(text2.nodeValue).split(/(\s+)/).forEach(function(part) {
          if (part.trim()) total += letters ? part.length : 1;
        });
      });
      if (!total || total > (letters ? LETTER_CAP : 40)) return 0;
      var stretch = opts && Number.isFinite(opts.stretch) ? opts.stretch : 1;
      var order2 = WORD_FROMS[opts && opts.from || "first"] || WORD_FROMS.first;
      var span = Math.min(WORD_SPAN_MS * 3, Math.max(240, total * (letters ? 48 : 130))) * stretch;
      var seen = 0;
      texts.forEach(function(text2) {
        var frag = document.createDocumentFragment();
        String(text2.nodeValue).split(/(\s+)/).forEach(function(part) {
          if (!part) return;
          if (!part.trim()) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          var host = letters ? el("span", "wword") : frag;
          if (letters) host.setAttribute("aria-hidden", "true");
          (letters ? part.split("") : [part]).forEach(function(piece) {
            var at = order2(seen, total - 1);
            var delay = Math.round((1 - Math.pow(1 - at, 2.2)) * span);
            var w = el("span", "w");
            w.style.setProperty("--i", String(seen));
            w.style.setProperty("--d", delay + "ms");
            w.textContent = piece;
            host.appendChild(w);
            seen++;
          });
          if (letters) frag.appendChild(host);
        });
        if (text2.parentNode) text2.parentNode.replaceChild(frag, text2);
      });
      if (letters && seen) {
        node.insertBefore(el("span", "sr-only", said), node.firstChild);
      }
      return seen;
    }
    function wordPlanUnit(slide) {
      var plan = (slide && slide.design || {}).wordPlan;
      return plan && plan.unit === "letter" ? "letter" : "word";
    }
    function wordPlan(slide, said, count) {
      var plan = (slide.design || {}).wordPlan;
      if (!plan || !Array.isArray(plan.words) || !plan.words.length) return null;
      if (String(plan.text || "").trim() !== String(said || "").trim()) return null;
      if (plan.words.length !== count) return null;
      var num = function(v, lo, hi, fallback) {
        if (v === null || v === void 0 || v === "") return fallback;
        var n = Number(v);
        return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
      };
      return plan.words.map(function(w) {
        var step = w && typeof w === "object" ? w : {};
        var arc = WORD_ARCS[step.arc] ? step.arc : "settle";
        return {
          arc,
          keys: WORD_ARCS[arc],
          /* em rather than px: a word set at 320px and one at 44px should not
             travel the same distance. */
          dx: num(step.dx, -3, 3, 0).toFixed(2) + "em",
          dy: num(step.dy, -3, 3, 0).toFixed(2) + "em",
          rot: num(step.rot, -30, 30, 0).toFixed(1) + "deg",
          scale: num(step.scale, 0.4, 1.8, 1),
          blur: num(step.blur, 0, 14, 0).toFixed(1) + "px",
          delay: Math.round(num(step.delay, 0, 3e3, 0))
        };
      });
    }
    function wordEffect(slide) {
      var want = String((slide.design || {}).words || "").trim();
      return WORD_EFFECTS.indexOf(want) >= 0 ? want : "";
    }
    function wordsLoop(slide) {
      return !!(slide.design && slide.design.wordsLoop) && !!wordEffect(slide);
    }
    return { LETTER_CAP, WORD_ARCS, WORD_EFFECTS, WORD_FROMS, WORD_SPEEDS, WORD_STAGGERS, statementBand, statementWordSize, wordEffect, wordFrom, wordPlan, wordPlanUnit, wordSpeed, wordStagger, wordsLoop, wrapWords };
  }

  // src/render/live.js
  function createLiveRenderer(SF, helpers) {
    const { el, themedRoot } = helpers;
    function questionCard(deck, item) {
      var node = themedRoot("slide", deck, "layout-question", "question");
      var pad = el("div", "pad");
      pad.appendChild(el("div", "qc-label", "From the room"));
      pad.appendChild(el("div", "qc-text", item.text || ""));
      var foot = el("div", "qc-foot");
      if (item.name) foot.appendChild(el("span", "qc-who", item.name));
      if (item.votes > 1) {
        foot.appendChild(el("span", "qc-votes", "▲ " + item.votes + " also asked this"));
      }
      pad.appendChild(foot);
      node.appendChild(pad);
      return node;
    }
    function feedbackFocus(deck, digest, opts) {
      opts = opts || {};
      var node = themedRoot("slide", deck, "layout-feedback", "feedback");
      var pad = el("div", "pad");
      if (opts.join && opts.join.pin) {
        var jl = el("div", "joinline fk-join");
        pad.appendChild(jl);
        paintJoinLine(jl, opts.join);
      }
      var head = el("div", "fk-head");
      head.appendChild(el("div", "fk-kind", opts.title || "Feedback"));
      if (opts.subtitle) head.appendChild(el("div", "fk-prompt", opts.subtitle));
      pad.appendChild(head);
      var body = el("div", "fk-body");
      body.dataset.kind = digest && digest.kind || "";
      if (!digest || !digest.kind) {
        body.appendChild(el("div", "fk-empty", "Waiting for the room"));
      } else if (digest.kind === "poll") {
        focusPoll(body, digest, opts);
      } else if (digest.kind === "scale") {
        focusScale(body, digest, opts);
      } else if (digest.kind === "wordcloud") {
        focusCloud(body, digest);
      } else {
        focusBrainstorm(body, digest);
      }
      pad.appendChild(body);
      var foot = el("div", "fk-foot");
      foot.appendChild(el("span", null, opts.footnote || ""));
      if (opts.sample) foot.appendChild(el("span", "fk-tag", "SAMPLE"));
      else foot.appendChild(el("span", "fk-hint", "E or S to close"));
      pad.appendChild(foot);
      node.appendChild(pad);
      return node;
    }
    function focusPoll(body, digest, opts) {
      var counts = digest.counts || [];
      var labels = opts.options || [];
      var max = Math.max(1, Math.max.apply(null, counts.concat([1])));
      var total = digest.total || 0;
      var lead = counts.indexOf(Math.max.apply(null, counts.concat([0])));
      counts.forEach(function(n, i) {
        var row = el("div", "fk-poll" + (total && i === lead && n > 0 ? " lead" : ""));
        row.appendChild(el("div", "fk-plabel", labels[i] || "Option " + (i + 1)));
        var bar = el("div", "fk-pbar");
        var fill2 = el("i");
        fill2.style.width = n / max * 100 + "%";
        bar.appendChild(fill2);
        row.appendChild(bar);
        var num = el("div", "fk-pnum");
        num.appendChild(el("span", "fk-pn", String(n)));
        num.appendChild(el("span", "fk-ppct", total ? Math.round(n / total * 100) + "%" : "0%"));
        row.appendChild(num);
        body.appendChild(row);
      });
    }
    function focusCloud(body, digest) {
      var words = digest.words || [];
      if (!words.length) {
        body.appendChild(el("div", "fk-empty", "No words yet"));
        return;
      }
      var cloud = el("div", "fk-cloud");
      var top = words[0].n;
      words.slice(0, 32).forEach(function(w) {
        var scale = 0.34 + 0.66 * (w.n / top);
        var chip = el("span", "fk-word", w.text);
        chip.style.fontSize = "calc(var(--fk-cloud) * " + scale.toFixed(2) + ")";
        if (w.n > 1) chip.appendChild(el("sup", null, String(w.n)));
        cloud.appendChild(chip);
      });
      body.appendChild(cloud);
    }
    function focusBrainstorm(body, digest) {
      var items2 = digest.items || [];
      if (!items2.length) {
        body.appendChild(el("div", "fk-empty", "Nothing yet"));
        return;
      }
      var grid = el("div", "fk-cards");
      grid.dataset.cols = items2.length > 6 ? "3" : "2";
      items2.slice(0, 9).forEach(function(it) {
        var card = el("div", "fk-card");
        card.appendChild(el("div", "fk-ctext", it.text));
        grid.appendChild(card);
      });
      body.appendChild(grid);
      if (items2.length > 9) {
        body.appendChild(el("div", "fk-more", "+ " + (items2.length - 9) + " more not shown"));
      }
    }
    function feedbackViewOpts(f) {
      var kind = f && f.kind ? SF.FEEDBACK_KINDS[f.kind] : null;
      return {
        title: kind ? kind.label : "Feedback",
        subtitle: f.prompt,
        /* A scale's points are generated from how many the author chose; what
           they name is the two ends. */
        options: f.kind === "scale" ? SF.scaleLabels(f) : f.options || [],
        ends: f.kind === "scale" ? { low: f.lowLabel, high: f.highLabel } : null
      };
    }
    function sampleFeedbackDigest2(f) {
      if (!f || !f.kind) return null;
      if (f.kind === "poll") {
        var live = f.options.filter(function(o) {
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
        var bars = shape[f.points] || shape[5];
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
    function feedbackRail(deck) {
      var root = themedRoot("scorerail fbrail", deck);
      root.appendChild(el("div", "rail-title", "Feedback"));
      root.appendChild(el("div", "rail-sub", ""));
      root.appendChild(el("div", "rail-news"));
      root.appendChild(el("div", "rail-join"));
      root.appendChild(el("div", "fb-body"));
      var foot = el("div", "foot");
      foot.appendChild(el("div", "joinline"));
      foot.appendChild(el("div", "notes", ""));
      root.appendChild(foot);
      return root;
    }
    function paintFeedbackRail(rail, digest, opts) {
      opts = opts || {};
      rail.querySelector(".rail-title").textContent = opts.title || "Feedback";
      rail.querySelector(".rail-sub").textContent = opts.subtitle || "";
      rail.querySelector(".foot .notes").textContent = opts.footnote || "";
      paintJoinLine(rail.querySelector(".joinline"), opts.join);
      var busy = feedbackDigestBusy(digest);
      var joining = !!(opts.join && opts.join.pin);
      var slot = ensureRailJoin(rail);
      paintRailJoin(slot, opts.join, !busy);
      paintFbMeter(rail, digest);
      var body = rail.querySelector(".fb-body");
      body.textContent = "";
      body.classList.remove("tight", "tighter");
      rail.dataset.kind = digest && digest.kind || "";
      if (!busy) {
        if (opts.roster && opts.roster.length) paintFbRoster(body, opts.roster);
        else if (!joining) {
          body.appendChild(el("div", "empty-rail", opts.emptyText || "Waiting for the room"));
        }
        return;
      }
      if (digest.kind === "poll") paintPoll(body, digest, opts);
      else if (digest.kind === "scale") paintScale(body, digest, opts);
      else if (digest.kind === "wordcloud") paintCloud(body, digest, opts);
      else paintBrainstorm(body, digest);
      fitFeedback(body, digest.kind);
    }
    function paintFbMeter(rail, digest) {
      var meter = rail.querySelector(".fb-meter");
      var players = digest ? Number(digest.players) || 0 : 0;
      var answered = digest ? Math.min(players, Number(digest.answered) || 0) : 0;
      if (!players) {
        if (meter) meter.remove();
        return;
      }
      if (!meter) {
        meter = el("div", "fb-meter");
        var sub = rail.querySelector(".rail-sub");
        if (sub && sub.parentNode) sub.parentNode.insertBefore(meter, sub.nextSibling);
        else rail.appendChild(meter);
      }
      meter.textContent = "";
      var line = el("div", "fbm-line");
      line.appendChild(el("strong", "fbm-n", String(answered)));
      line.appendChild(el("span", "fbm-of", " of " + players + " answered"));
      if (answered === players) line.appendChild(el("span", "fbm-all", "Everyone"));
      meter.appendChild(line);
      var bar = el("div", "fbm-bar");
      var fill2 = el("i");
      fill2.style.width = Math.round(answered / players * 100) + "%";
      bar.appendChild(fill2);
      meter.appendChild(bar);
    }
    function fitFeedback(body, kind) {
      if (!body.clientHeight) return;
      var over = function() {
        return overflowing(body);
      };
      if (kind === "poll") {
        if (over()) body.classList.add("tight");
        if (over()) body.classList.add("tighter");
        return;
      }
      if (kind === "wordcloud") {
        var cloud = (
          /** @type {HTMLElement|null} */
          body.querySelector(".cloud")
        );
        if (cloud) fitByDropping(cloud, ".word", 3);
        return;
      }
      if (kind === "brainstorm") {
        var more = body.querySelector(".more");
        var total = Number(body.dataset.total) || 0;
        if (!more && over()) {
          more = el("div", "more", "");
          body.appendChild(more);
        }
        fitByDropping(body, ".fbcard", 1, function() {
          var left = body.querySelectorAll(".fbcard").length;
          if (more) {
            more.textContent = "+ " + (total - left) + " more";
            body.appendChild(more);
          }
        });
      }
    }
    function ensureRailJoin(rail) {
      var body = rail.querySelector(".fb-body");
      var join = rail.querySelector(".rail-join");
      if (!join) {
        join = el("div", "rail-join");
        if (body) rail.insertBefore(join, body);
        else rail.appendChild(join);
        return join;
      }
      if (body && join.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_PRECEDING) {
        rail.insertBefore(join, body);
      }
      return join;
    }
    function feedbackDigestBusy(digest) {
      if (!digest || !digest.kind) return false;
      if (Number(digest.total) > 0 || Number(digest.answered) > 0) return true;
      if (digest.words && digest.words.length) return true;
      if (digest.items && digest.items.length) return true;
      if (digest.counts && digest.counts.some(function(n) {
        return Number(n) > 0;
      })) return true;
      return false;
    }
    function paintFbRoster(body, roster) {
      if (roster.length > 12) {
        body.appendChild(el("div", "fb-room-n", String(roster.length)));
        body.appendChild(el("div", "fb-room-lbl", "in the room, waiting for the first answer"));
        return;
      }
      body.appendChild(el(
        "div",
        "fb-roster-lbl",
        roster.length === 1 ? "1 person in" : roster.length + " people in"
      ));
      roster.forEach(function(p) {
        body.appendChild(el("div", "fb-who-in", p.name || "Player"));
      });
    }
    function paintPoll(body, digest, opts) {
      var counts = digest.counts || [];
      var labels = opts.options || [];
      var max = Math.max(1, Math.max.apply(null, counts.concat([1])));
      var total = digest.total || 0;
      if (!total) {
        var joining = !!(opts.join && opts.join.pin);
        if (!joining) body.appendChild(el("div", "empty-rail", "No votes yet"));
        return;
      }
      counts.forEach(function(n, i) {
        var row = el("div", "pollrow");
        var head = el("div", "pollhead");
        head.appendChild(el("span", "plabel", labels[i] || "Option " + (i + 1)));
        head.appendChild(el("span", "pn", String(n)));
        row.appendChild(head);
        var bar = el("div", "pbar");
        var fill2 = el("i");
        fill2.style.width = n / max * 100 + "%";
        bar.appendChild(fill2);
        row.appendChild(bar);
        row.appendChild(el("div", "ppct", total ? Math.round(n / total * 100) + "%" : "0%"));
        body.appendChild(row);
      });
    }
    function scaleStats(counts) {
      var total = 0, sum = 0;
      counts.forEach(function(n, i) {
        total += n;
        sum += n * (i + 1);
      });
      if (!total) return { total: 0, mean: 0, split: false };
      var mean = sum / total;
      var edges = (counts[0] || 0) + (counts[counts.length - 1] || 0);
      var middle = total - edges;
      return { total, mean, split: counts.length > 2 && edges > middle };
    }
    function scaleChart(counts, opts, cls) {
      var stats = scaleStats(counts);
      var max = Math.max(1, Math.max.apply(null, counts.concat([1])));
      var wrap = el("div", cls);
      var cols = el("div", cls + "-cols");
      counts.forEach(function(n, i) {
        var col = el("div", cls + "-col");
        var bar = el("div", cls + "-bar");
        var fill2 = el("i");
        fill2.style.height = n / max * 100 + "%";
        bar.appendChild(fill2);
        col.appendChild(el("div", cls + "-n", n ? String(n) : ""));
        col.appendChild(bar);
        col.appendChild(el("div", cls + "-p", String(i + 1)));
        cols.appendChild(col);
      });
      wrap.appendChild(cols);
      var ends = opts.ends || {};
      var foot = el("div", cls + "-ends");
      foot.appendChild(el("span", null, ends.low || ""));
      foot.appendChild(el("span", null, ends.high || ""));
      wrap.appendChild(foot);
      var read = el("div", cls + "-read");
      if (stats.total) {
        read.appendChild(el("strong", null, stats.mean.toFixed(1)));
        read.appendChild(el("span", null, " average of " + stats.total));
        if (stats.split) read.appendChild(el("span", cls + "-split", "ROOM IS SPLIT"));
      }
      wrap.appendChild(read);
      return wrap;
    }
    function paintScale(body, digest, opts) {
      if (!digest.total) {
        var joining = !!(opts && opts.join && opts.join.pin);
        if (!joining) body.appendChild(el("div", "empty-rail", "Nobody has placed themselves yet"));
        return;
      }
      body.appendChild(scaleChart(digest.counts || [], opts, "sc"));
    }
    function focusScale(body, digest, opts) {
      body.appendChild(scaleChart(digest.counts || [], opts, "fksc"));
    }
    function paintCloud(body, digest, opts) {
      var words = digest.words || [];
      if (!words.length) {
        var joining = !!(opts && opts.join && opts.join.pin);
        if (!joining) body.appendChild(el("div", "empty-rail", "No words yet"));
        return;
      }
      var cloud = el("div", "cloud");
      var top = words[0].n;
      words.slice(0, 24).forEach(function(w) {
        var scale = 0.5 + 0.5 * (w.n / top);
        var chip = el("span", "word", w.text);
        chip.style.fontSize = "calc(var(--cloud-f) * " + scale.toFixed(2) + ")";
        if (w.n > 1) chip.appendChild(el("sup", null, String(w.n)));
        cloud.appendChild(chip);
      });
      body.appendChild(cloud);
    }
    function paintBrainstorm(body, digest) {
      var items2 = digest.items || [];
      if (!items2.length) {
        body.appendChild(el("div", "empty-rail", "Nothing yet"));
        return;
      }
      var total = Math.max(items2.length, Number(digest.total) || 0);
      body.dataset.total = String(total);
      items2.slice(0, 8).forEach(function(it) {
        var card = el("div", "fbcard");
        card.appendChild(el("div", "fbtext", it.text));
        body.appendChild(card);
      });
      if (total > 8) {
        body.appendChild(el("div", "more", "+ " + (total - 8) + " more"));
      }
    }
    function tint(hex, alpha) {
      var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ""));
      if (!m) return "rgba(255,255,255,.18)";
      return "rgba(" + parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16) + "," + alpha + ")";
    }
    function raceTrack(deck, lanes, opts) {
      opts = opts || {};
      var len = Math.max(1, opts.length || 5);
      var node = themedRoot("slide", deck, "layout-race", "race");
      var pad = el("div", "pad");
      pad.appendChild(el("div", "race-title", opts.title || "The race"));
      if (opts.note) pad.appendChild(el("div", "race-note", opts.note));
      var board5 = el("div", "racetrack");
      board5.style.setProperty("--steps", String(len));
      lanes.forEach(function(lane) {
        var row = el("div", "lane" + (lane.moved ? " moved" : "") + ((opts.winners || []).indexOf(lane.key) > -1 ? " won" : ""));
        var colour = lane.color || "var(--s-accent)";
        row.style.setProperty("--lane-color", colour);
        row.style.setProperty("--lane-tint", tint(lane.color, 0.34));
        var label = el("div", "lane-name");
        var dot = el("span", "lane-dot");
        dot.style.background = colour;
        label.appendChild(dot);
        label.appendChild(el("span", "lane-text", lane.name));
        row.appendChild(label);
        var rail = el("div", "lane-rail");
        for (var i = 1; i <= len; i++) {
          var cell = el("div", "step" + (i === len ? " finish" : ""));
          if (i <= lane.pos) cell.classList.add("done");
          rail.appendChild(cell);
        }
        var runner = el("div", "runner", lane.pos >= len ? "🏆" : "🏇");
        runner.style.left = (lane.pos <= 0 ? 0 : (lane.pos - 0.5) / len * 100) + "%";
        rail.appendChild(runner);
        row.appendChild(rail);
        row.appendChild(el("div", "lane-pos", lane.pos + " / " + len));
        board5.appendChild(row);
      });
      pad.appendChild(board5);
      node.appendChild(pad);
      return node;
    }
    function bossBar(deck, opts) {
      opts = opts || {};
      var max = Math.max(1, Number(opts.max) || 1);
      var hp = Math.max(0, Math.min(max, Number(opts.hp) || 0));
      var pct = Math.round(hp / max * 100);
      var node = themedRoot("slide", deck, "layout-boss" + (opts.hit ? " boss-hit" : "") + (hp <= 0 ? " boss-down" : ""), "boss");
      var pad = el("div", "pad");
      pad.appendChild(el("div", "boss-title", opts.title || "Boss battle"));
      if (opts.note) pad.appendChild(el("div", "boss-note", opts.note));
      var meter = el("div", "boss-meter");
      var fill2 = el("div", "boss-fill");
      fill2.style.width = pct + "%";
      meter.appendChild(fill2);
      pad.appendChild(meter);
      pad.appendChild(el("div", "boss-hp", hp + " / " + max + " HP"));
      node.appendChild(pad);
      return node;
    }
    function wordRevealWall(deck, opts) {
      opts = opts || {};
      var node = themedRoot("slide", deck, "layout-wordreveal", "wordreveal");
      var pad = el("div", "pad");
      pad.appendChild(el("div", "wr-title", "Word reveal"));
      if (opts.hint) pad.appendChild(el("div", "wr-hint", opts.hint));
      pad.appendChild(el("div", "wr-mask", opts.mask || ""));
      pad.appendChild(el(
        "div",
        "wr-meta",
        (opts.shown || 0) + " / " + (opts.total || 0) + " letters"
      ));
      node.appendChild(pad);
      return node;
    }
    function studyCards(deck, opts) {
      opts = opts || {};
      var node = themedRoot("slide", deck, "layout-study", "study");
      var pad = el("div", "pad");
      pad.appendChild(el("div", "study-term", opts.term || ""));
      if (opts.definition) pad.appendChild(el("div", "study-def", opts.definition));
      if (opts.seconds > 0) {
        pad.appendChild(el(
          "div",
          "study-note",
          opts.hideAfter ? "Study · " + opts.seconds + "s then hide" : "Keywords stay visible"
        ));
      }
      node.appendChild(pad);
      return node;
    }
    function scoreRail(deck) {
      var root = themedRoot("scorerail", deck);
      root.appendChild(el("div", "rail-title", "The room"));
      root.appendChild(el("div", "rail-sub", ""));
      root.appendChild(el("div", "rail-news"));
      root.appendChild(el("div", "rows"));
      root.appendChild(el("div", "rail-join"));
      var foot = el("div", "foot");
      foot.appendChild(el("div", "joinline"));
      foot.appendChild(el("div", "notes", ""));
      root.appendChild(foot);
      return root;
    }
    var RAIL_INK = ["--s-fg", "--s-dim", "--s-rule", "--s-card", "--s-accent", "--s-accent-2", "--s-scrim"];
    function railSurface(rail, slideEl) {
      if (!rail || !slideEl) return;
      var cs = getComputedStyle(slideEl);
      var img = cs.backgroundImage;
      rail.style.backgroundColor = cs.backgroundColor;
      rail.style.backgroundImage = img.indexOf("url(") === -1 ? img : "none";
      RAIL_INK.forEach(function(token) {
        var value = cs.getPropertyValue(token).trim();
        if (value) rail.style.setProperty(token, value);
        else rail.style.removeProperty(token);
      });
      if (slideEl.dataset.ground) rail.dataset.ground = slideEl.dataset.ground;
    }
    function paintRailJoin(node, join, roomy) {
      if (!node) return;
      var live = !!(join && join.pin);
      node.classList.toggle("on", !!live);
      node.classList.toggle("big", !!live && roomy);
      var rail = node.closest ? node.closest(".scorerail") : null;
      if (rail) rail.classList.toggle("joining-big", !!live && roomy);
      if (rail) rail.classList.toggle("has-join", !!live);
      if (!live) {
        node.textContent = "";
        node.dataset.for = "";
        return;
      }
      var open = join.open !== false;
      var link = join.link || join.url || "";
      var waiting = open ? 0 : Math.max(0, Number(join.waiting) || 0);
      var key = link + "|" + (roomy ? "big" : "small") + "|" + (open ? "open" : "shut") + "|" + waiting;
      if (node.dataset.for === key && node.childElementCount) return;
      node.dataset.for = key;
      node.textContent = "";
      if (link && SF.qrSvg) {
        var code = el("div", "rj-qr");
        try {
          code.innerHTML = SF.qrSvg(link, { quiet: 4, title: "Join at " + link });
          node.appendChild(code);
        } catch (e) {
        }
      }
      var side = el("div", "rj-side");
      side.appendChild(el(
        "div",
        "rj-lbl" + (open ? "" : " shut"),
        open ? roomy ? "Point a camera here" : "Still joining?" : roomy ? "Scan to join the next round" : "Joining next round"
      ));
      side.appendChild(el("div", "rj-pin", join.pin));
      if (roomy) side.appendChild(el("div", "rj-url", join.url || ""));
      if (waiting) {
        side.appendChild(el(
          "div",
          "rj-wait",
          waiting + (waiting === 1 ? " person is" : " people are") + " in the queue"
        ));
      }
      node.appendChild(side);
    }
    var RAIL_MAX_ROWS = 10;
    var CROWD_AT = 8;
    var CROWD_TOP = 5;
    var SLIM_TOP = 3;
    function overflowing(box2) {
      box2.classList.add("sf-measuring");
      var over = box2.scrollHeight > box2.clientHeight + 1;
      box2.classList.remove("sf-measuring");
      return over;
    }
    function fitByDropping(box2, selector, keep, onDrop) {
      if (!box2 || !box2.clientHeight) return 0;
      var dropped = 0;
      var items2 = box2.querySelectorAll(selector);
      var n = items2.length;
      while (n > keep && overflowing(box2)) {
        items2[n - 1].remove();
        n--;
        dropped++;
        if (onDrop) onDrop(dropped);
      }
      return dropped;
    }
    function nameScale(name) {
      var longest = String(name).split(/\s+/).reduce(function(m, w) {
        return Math.max(m, w.length);
      }, 0);
      if (longest <= 6) return 1;
      if (longest <= 9) return 0.86;
      if (longest <= 12) return 0.74;
      return 0.62;
    }
    function wallName(name, people) {
      var text2 = String(name || "");
      if (!people || nameScale(text2) >= 0.86) return text2;
      var parts = text2.trim().split(/\s+/);
      if (parts.length < 2) return text2;
      return parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
    }
    function railDensity(n) {
      if (n <= 2) return "xl";
      if (n <= 4) return "lg";
      if (n <= 6) return "md";
      if (n <= 8) return "sm";
      return "xs";
    }
    function paintScoreRail(rail, rows2, opts) {
      opts = opts || {};
      var sub = rail.querySelector(".rail-sub");
      if (sub) sub.textContent = opts.subtitle || "";
      var legend = rail.querySelector(".rail-legend");
      if (!legend) {
        var newLegend = el("div", "rail-legend");
        var rowsBox = rail.querySelector(".rows");
        if (rowsBox && rowsBox.parentNode) {
          rowsBox.parentNode.insertBefore(newLegend, rowsBox);
        }
        legend = newLegend;
      }
      if (legend) {
        legend.replaceChildren();
        legend.appendChild(el("span", "lg-score", String(opts.scoreLabel || "Game points").toUpperCase()));
        legend.hidden = !rows2.length;
      }
      var footNotes = rail.querySelector(".foot .notes");
      if (footNotes) footNotes.textContent = opts.footnote || "";
      var joinLine = rail.querySelector(".joinline");
      if (joinLine) paintJoinLine(joinLine, opts.join);
      var railJoin = rail.querySelector(".rail-join");
      if (railJoin) paintRailJoin(railJoin, opts.join, !rows2.length);
      var box2 = rail.querySelector(".rows");
      if (!box2) return;
      if (!rows2.length) {
        rail.dataset.density = "lg";
        box2.innerHTML = "";
        var joining = !!(opts.join && opts.join.pin);
        if (!joining) {
          box2.appendChild(el("div", "empty-rail", opts.emptyText || "Nobody has joined yet."));
        }
        return;
      }
      rail._last = { rows: rows2, opts };
      var slim = rail.dataset.size === "slim";
      var crowd = rows2.length > CROWD_AT;
      rail.classList.toggle("crowd", crowd && !slim);
      var limit = slim ? SLIM_TOP : crowd ? CROWD_TOP : RAIL_MAX_ROWS;
      var shown = rows2.slice(0, limit);
      var hidden = rows2.length - shown.length;
      var climb = crowd && !slim ? biggestClimb(rail, rows2, shown.length) : null;
      rail.dataset.density = slim ? "slim" : railDensity(shown.length + (hidden ? crowd ? 2 : 1 : 0) + (climb ? 1 : 0));
      var roomForMembers = ["xl", "lg", "md"].indexOf(rail.dataset.density) !== -1;
      var existing = {};
      Array.prototype.forEach.call(box2.children, function(n) {
        if (n.dataset.key) existing[n.dataset.key] = n;
      });
      var order2 = [];
      shown.forEach(function(r, i) {
        var node = existing[r.key];
        if (!node) {
          node = el("div", "srow");
          node.dataset.key = r.key;
          node.appendChild(el("div", "rk", ""));
          var who = el("div", "who");
          who.appendChild(el("div", "nm", ""));
          node.appendChild(who);
          node.appendChild(el("div", "sc", ""));
        }
        delete existing[r.key];
        node.querySelector(".rk").textContent = String(i + 1);
        var nm = node.querySelector(".nm");
        var shownName = wallName(r.name, opts.people);
        nm.textContent = shownName;
        nm.title = r.name;
        nm.style.fontSize = "calc(var(--nm-f) * " + nameScale(shownName) + ")";
        var who = node.querySelector(".who");
        var mem = who.querySelector(".mem");
        if (r.members != null && roomForMembers) {
          if (!mem) {
            mem = el("div", "mem", "");
            who.appendChild(mem);
          }
          mem.textContent = r.members === 1 ? "1 player" : r.members + " players";
        } else if (mem) {
          mem.remove();
        }
        var learn = node.querySelector(".learn");
        if (learn) learn.remove();
        var sc = node.querySelector(".sc");
        sc.textContent = String(r.score);
        sc.title = opts.scoreLabel || "Game points";
        sc.setAttribute("aria-label", (opts.scoreLabel || "Game points") + ": " + r.score);
        node.style.borderLeftColor = r.color || "";
        node.classList.toggle("lead", i === 0 && r.score > 0);
        if (r.gained) {
          node.classList.remove("gain");
          void node.offsetWidth;
          node.classList.add("gain");
        }
        order2.push(node);
      });
      Object.keys(existing).forEach(function(k) {
        existing[k].remove();
      });
      var moreEl = box2.querySelector(".more");
      var more = null;
      if (hidden > 0) {
        more = moreEl || el("div", "more", "");
        order2.push(more);
      } else if (moreEl) {
        moreEl.remove();
      }
      var tellMore = function(n) {
        if (!more) return;
        more.textContent = "";
        more.appendChild(el("span", "more-n", "+ " + n + " more"));
        if (crowd && !slim) more.appendChild(el("span", "more-where", "Your place is on your phone"));
      };
      tellMore(hidden);
      var oldClimb = box2.querySelector(".climb");
      var climbEl = null;
      if (climb) {
        climbEl = /** @type {HTMLElement} */
        oldClimb || el("div", "climb", "");
        climbEl.textContent = "";
        climbEl.appendChild(el("span", "cl-up", "▲ " + climb.by));
        climbEl.appendChild(el("span", "cl-nm", wallName(climb.name, opts.people)));
        climbEl.appendChild(el("span", "cl-lbl", "biggest climb"));
        order2.push(climbEl);
      } else if (oldClimb) {
        oldClimb.remove();
      }
      for (var oi = 0; oi < order2.length; oi++) {
        if (order2[oi]) box2.appendChild(order2[oi]);
      }
      var list = box2;
      if (!more && list.clientHeight && overflowing(list)) {
        more = el("div", "more", "");
        list.appendChild(more);
        tellMore(0);
      }
      fitByDropping(list, ".srow", 1, function(dropped) {
        tellMore(hidden + dropped);
        if (more) list.appendChild(more);
        if (climbEl) list.appendChild(climbEl);
      });
    }
    function biggestClimb(rail, rows2, shown) {
      var store = (
        /** @type {any} */
        rail
      );
      var now = {};
      rows2.forEach(function(r, i) {
        now[r.key] = i;
      });
      var sig = rows2.map(function(r) {
        return r.key;
      }).join("|");
      if (store._rankSig === sig) return store._climb || null;
      var before = store._ranks;
      store._ranks = now;
      store._rankSig = sig;
      store._climb = null;
      if (!before) return null;
      var best = null;
      rows2.forEach(function(r, i) {
        if (i < shown || !(r.key in before)) return;
        var by = before[r.key] - i;
        if (by >= 2 && (!best || by > best.by)) best = { name: r.name, by };
      });
      store._climb = best;
      return best;
    }
    function paintJoinLine(node, join) {
      if (!join || !join.pin) {
        node.textContent = "";
        node.style.display = "none";
        return;
      }
      node.style.display = "";
      node.textContent = "";
      node.classList.toggle("shut", join.open === false);
      if (join.open === false) {
        node.appendChild(el("span", "jl-lbl", "CLOSED"));
        node.appendChild(el(
          "span",
          "jl-url",
          join.waiting ? join.waiting + " waiting for next round" : "joining reopens next round"
        ));
        return;
      }
      node.appendChild(el("span", "jl-lbl", "JOIN"));
      node.appendChild(el("span", "jl-url", join.url || ""));
      node.appendChild(el("span", "jl-pin", join.pin));
      if (node.classList.contains("fk-join")) {
        node.title = "Click or press J for full-screen QR code";
        node.style.cursor = "pointer";
        var qrHint = el("span", "jl-qr-hint", "⛶ QR (J)");
        node.appendChild(qrHint);
        node.onclick = function() {
          if (SF && SF.Player && SF.Player.control) {
            SF.Player.control("join");
          }
        };
      }
    }
    function soloScore(deck) {
      var root = themedRoot("soloscore", deck);
      root.appendChild(el("span", "lbl", "Score"));
      root.appendChild(el("span", "val", "0 / 0"));
      return root;
    }
    return { bossBar, feedbackFocus, feedbackRail, feedbackViewOpts, paintFeedbackRail, paintRailJoin, paintScoreRail, questionCard, raceTrack, railSurface, sampleFeedbackDigest: sampleFeedbackDigest2, scoreRail, soloScore, studyCards, tint, wordRevealWall };
  }

  // src/render/quiz.js
  function createQuizRenderer(SF, helpers) {
    const { LETTERS, asStep, el, rich, ring, stableShuffle, tint } = helpers;
    function sampleJoinInfo() {
      var origin2 = "";
      try {
        origin2 = String(location.origin || "");
      } catch (e) {
        origin2 = "";
      }
      if (!/^https?:/i.test(origin2)) origin2 = "http://localhost:8787";
      var pin = "4821";
      return {
        pin,
        url: origin2.replace(/^https?:\/\//i, ""),
        link: origin2.replace(/\/$/, "") + "/join.html?pin=" + pin,
        open: true,
        sample: true
      };
    }
    function layoutJoin(slide, pad, opts) {
      var join = opts && opts.join || sampleJoinInfo();
      var stage = el("div", "join-stage");
      if (slide.title) stage.appendChild(rich("h2", "join-title", slide, "title", slide.title));
      if (slide.subtitle) stage.appendChild(rich("div", "join-sub", slide, "subtitle", slide.subtitle));
      var lines = (slide.bullets || []).map(function(t) {
        return String(t).trim();
      }).filter(Boolean);
      if (lines.length) {
        var list = el("ul", "join-bullets");
        lines.forEach(function(line, i) {
          list.appendChild(rich("li", null, slide, "bullets." + i, line));
        });
        stage.appendChild(list);
      }
      var board5 = el("div", "join-board");
      var code = el("div", "join-qr");
      if (join.link && SF.qrSvg) {
        try {
          code.innerHTML = SF.qrSvg(join.link, {
            quiet: 4,
            title: "Join at " + (join.url || join.link)
          });
        } catch (e) {
        }
      }
      board5.appendChild(code);
      var side = el("div", "join-side");
      side.appendChild(el(
        "div",
        "join-lead",
        join.sample ? "Sample — Host live for the real code" : "Join at"
      ));
      side.appendChild(el("div", "join-url", join.url || "—"));
      side.appendChild(el("div", "join-lead pin-lead", "Game PIN"));
      side.appendChild(el("div", "join-pin", join.pin || "----"));
      board5.appendChild(side);
      stage.appendChild(board5);
      pad.appendChild(stage);
    }
    function layoutGame(slide, pad, opts) {
      var game = opts.game || null;
      var card = el("div", "gamecard");
      var top = el("div", "gc-top");
      top.appendChild(el("span", "gc-badge", "GAME"));
      top.appendChild(el("span", "gc-note", game ? "plays here, then the deck continues" : ""));
      card.appendChild(top);
      card.appendChild(el("div", "gc-title", game ? game.title : slide.gameTitle || "No game selected"));
      if (game) {
        var facts = el("div", "gc-facts");
        var n = game.questions.length;
        facts.appendChild(el("span", "gc-fact", SF.gameStyle(game.style).label));
        facts.appendChild(el("span", "gc-fact", n + (n === 1 ? " question" : " questions")));
        facts.appendChild(el(
          "span",
          "gc-fact",
          game.settings.mode === "teams" ? game.settings.teams.length + " teams" : "individual scoring"
        ));
        if (game.settings.defaultTime) {
          facts.appendChild(el("span", "gc-fact", game.settings.defaultTime + "s per question"));
        }
        card.appendChild(facts);
        if (game.settings.mode === "teams") {
          var teams = el("div", "gc-teams");
          game.settings.teams.forEach(function(t, i) {
            var chip = el("span", "gc-team", t.name);
            chip.style.background = SF.teamColor(i);
            if (i === 2) chip.style.color = "#1d1204";
            teams.appendChild(chip);
          });
          card.appendChild(teams);
        }
      } else {
        card.appendChild(el(
          "div",
          "gc-facts",
          "Pick a game in Design & content, or this slide is skipped."
        ));
      }
      pad.appendChild(card);
    }
    function layoutExplain(slide, pad, opts) {
      var head = el("div", "ex-head");
      if (slide.questionNumber) head.appendChild(el("span", "ex-qn", "Q" + slide.questionNumber));
      head.appendChild(el("span", "ex-q", slide.question || ""));
      pad.appendChild(head);
      var answer = el("div", "ex-answer");
      var typed = slide.input === "text" || slide.input === "number";
      answer.appendChild(el(
        "span",
        "key",
        slide.input === "number" ? "↔" : typed ? "✎" : LETTERS[slide.correct] || "?"
      ));
      answer.appendChild(el("span", "txt", typed ? slide.answer || "" : (slide.options || [])[slide.correct] || ""));
      answer.appendChild(el("span", "tick", "✓"));
      pad.appendChild(answer);
      var body = el("div", "ex-body");
      String(slide.body || "").split(/\n{2,}/).forEach(function(para) {
        if (!para.trim()) return;
        body.appendChild(asStep(el("p", null, para.trim()), slide));
      });
      var len = String(slide.body || "").length;
      body.dataset.len = len > 420 ? "xl" : len > 240 ? "lg" : "md";
      pad.appendChild(body);
      if (slide.subtitle) pad.appendChild(el("div", "ex-source", slide.subtitle));
    }
    function numberLine(slide) {
      var wrap = el("div", "numberline");
      var line = el("div", "nl-line");
      line.appendChild(el("div", "nl-band"));
      line.appendChild(el("div", "nl-marks"));
      line.appendChild(el("div", "nl-target"));
      if (slide.timeline && slide.timeline.length) {
        var past = el("div", "nl-past");
        var span = Number(slide.max) - Number(slide.min) || 1;
        slide.timeline.forEach(function(e, k) {
          var pin = el("div", "nl-past-pin" + (k % 2 ? " low" : ""));
          pin.style.left = Math.max(0, Math.min(100, (e.year - slide.min) * 100 / span)) + "%";
          pin.appendChild(el("span", "npp-year", String(e.year)));
          pin.appendChild(el("span", "npp-label", e.label));
          past.appendChild(pin);
        });
        line.appendChild(past);
      }
      wrap.appendChild(line);
      var ends = el("div", "nl-ends");
      ends.appendChild(el("span", null, SF.formatValue(slide.min, slide.unit)));
      ends.appendChild(el("span", null, SF.formatValue(slide.max, slide.unit)));
      wrap.appendChild(ends);
      return wrap;
    }
    function raceStrip(lanes, len, command) {
      var strip = el("div", "race-strip");
      if (command) strip.classList.add("runnable");
      lanes.forEach(function(lane) {
        var row = el(command ? "button" : "div", "rlane" + (lane.moved ? " moved" : "") + (lane.won ? " won" : ""));
        if (command) {
          row.type = "button";
          row.setAttribute("aria-label", "Move " + lane.name + " forward a step");
          row.title = lane.pos >= len ? lane.name + " is home" : "Move " + lane.name + " on";
          row.disabled = lane.pos >= len;
          row.onclick = function(e) {
            command(lane.key, e.shiftKey ? "back" : "advance");
          };
          row.dataset.desk = "lane:" + lane.key;
          row.dataset.deskLabel = "Move " + lane.name + " on";
        }
        row.style.setProperty("--lane-color", lane.color || "var(--s-accent)");
        row.style.setProperty("--lane-tint", tint(lane.color, 0.32));
        row.appendChild(el("div", "rname", lane.name));
        var rail = el("div", "rrail");
        var fill2 = el("div", "rfill");
        fill2.style.width = Math.min(lane.pos, len) / len * 100 + "%";
        rail.appendChild(fill2);
        var mark = el("div", "rmark", lane.pos >= len ? "🏆" : "🏇");
        mark.style.left = (lane.pos <= 0 ? 0 : (lane.pos - 0.5) / len * 100) + "%";
        rail.appendChild(mark);
        row.appendChild(rail);
        row.appendChild(el("div", "rpos", lane.pos + "/" + len));
        strip.appendChild(row);
      });
      return strip;
    }
    function quizPresent(slide) {
      var f = slide.format || "";
      if (f === "emoji-guess") return "emoji";
      if (f === "fill-in-the-blanks" && slide.input !== "fill") return "blanks";
      if (f === "odd-one-out") return "oddone";
      if (f === "compare-contrast") return "compare";
      if (f === "spot-the-error") return "spoterror";
      if (f === "predict-outcome") return "predict";
      if (f === "low-stakes-quiz") return "lowstakes";
      if (f === "definition-challenge") return "definition";
      if (f === "time-traveler") return "timetravel";
      if (f === "true-false" || f === "truefalse") return "truefalse";
      if (f === "beat-the-clock") return "speed";
      if (f === "boss-battle") return "boss";
      if (f === "horse-race") return "race";
      if (f === "word-reveal") return "wordreveal";
      if (f === "memory-flip") return "claim";
      if (f === "memory-match") return "memorymatch";
      if (f === "knowledge-flip") return "knowledge";
      if (f === "heads-up") return "headsup";
      if (f === "spin-explain") return "spin";
      if (f === "connection-maker") return "connection";
      if (f === "concept-chain") return "chain";
      if (f === "random-challenge") return "challenge";
      if (f === "quiz-bowl") return "bowl";
      if (f === "ranking") return "ranking";
      var s = slide.style || "";
      if (s === "truefalse") return "truefalse";
      if (s === "speed") return "speed";
      if (s === "boss") return "boss";
      if (s === "race") return "race";
      if (s === "wordreveal") return "wordreveal";
      if (s === "memoryflip") return "claim";
      if (s === "memorymatch") return "memorymatch";
      if (s === "knowledgeflip") return "knowledge";
      if (s === "headsup") return "headsup";
      if (s === "spinexplain") return "spin";
      if (s === "connection") return "connection";
      if (s === "conceptchain") return "chain";
      if (s === "randomchallenge") return "challenge";
      if (s === "bowl") return "bowl";
      if (s === "emoji") return "emoji";
      if (s === "definition") return "definition";
      if (s === "oddone") return "oddone";
      if (s === "compare") return "compare";
      if (s === "order") return "ranking";
      if (slide.input === "order") return "ranking";
      if (slide.input === "number") return "slider";
      if (slide.input === "text") return "typed";
      return "choice";
    }
    function appendJudgeStrip(pad, slide, opts, inlineWhy, whyBox) {
      var opts_ = (slide.options || []).filter(function(o) {
        return String(o).trim();
      });
      var wrap = el("div", "opts judge-strip");
      wrap.appendChild(el("div", "judge-caption", slide.style === "spinexplain" ? "Clear · a question’s worth / With a hint · half / Try again · nothing" : "Host marks the claim"));
      opts_.forEach(function(text2, i) {
        var yes = i === slide.correct;
        var b = el("button", "opt judge " + (yes ? "yes" : "skip"));
        b.type = "button";
        b.dataset.choice = String(i);
        if (!opts.interactive) b.classList.add("locked");
        var line = el("span", "opt-line");
        line.appendChild(el("span", "judge-mark", yes ? "✓" : "○"));
        line.appendChild(el("span", "txt", text2));
        b.appendChild(line);
        if (inlineWhy && yes) b.appendChild(whyBox());
        wrap.appendChild(b);
      });
      pad.appendChild(wrap);
    }
    function matchBoardTiles(slide, opts) {
      var bank2 = opts && opts.pairBank || [];
      var tiles;
      if (bank2.length) {
        tiles = bank2.slice(0, 8);
      } else {
        tiles = [{ term: slide.term || slide.question || "·", active: true }];
      }
      while (tiles.length < 6) tiles.push({ term: "", ghost: true });
      return tiles;
    }
    function layoutQuiz(slide, pad, opts) {
      var present = quizPresent(slide);
      pad.parentNode.classList.add("present-" + present);
      if (opts.lanes && opts.lanes.length) {
        pad.parentNode.classList.add("is-race");
        pad.appendChild(raceStrip(opts.lanes, opts.trackLength || 5, opts.laneCommand));
      }
      if (present === "wordreveal") {
        var wrHero = el("div", "stage-hero wr-stage");
        wrHero.appendChild(el("div", "stage-atmosphere", ""));
        if (slide.hint) wrHero.appendChild(el("div", "stage-kicker", slide.hint));
        var letters = String(slide.word || slide.answer || "");
        var pre = slide.preReveal != null ? slide.preReveal : 0.4;
        var showN = Math.round(SF.wordRevealLetterCount(letters) * pre);
        var mask = SF.wordRevealMask ? SF.wordRevealMask(letters, showN) : letters.replace(/\S/g, "_");
        var board5 = el("div", "wr-board");
        String(mask).split("").forEach(function(ch2, i) {
          if (ch2 === " ") {
            board5.appendChild(el("span", "wr-gap", ""));
            return;
          }
          var tile = el("span", "wr-tile" + (ch2 === "_" ? " blank" : " lit"), ch2 === "_" ? "" : ch2);
          tile.style.animationDelay = i * 0.04 + "s";
          board5.appendChild(tile);
        });
        wrHero.appendChild(board5);
        wrHero.appendChild(el("div", "stage-note", "Letters drip in · type your guess"));
        pad.appendChild(wrHero);
      } else if (present === "memorymatch") {
        var match = el("div", "stage-hero match-stage");
        match.appendChild(el("div", "stage-atmosphere", ""));
        var board5 = el("div", "match-board");
        matchBoardTiles(slide, opts).forEach(function(tile, ti) {
          var cell = el("button", "match-tile" + (tile.active ? " active" : "") + (tile.ghost ? " ghost" : " back"));
          cell.type = "button";
          cell.tabIndex = -1;
          cell.setAttribute("aria-hidden", "true");
          cell.appendChild(el("span", "match-tile-back", tile.ghost ? "" : "◈"));
          if (tile.active && tile.term) {
            cell.appendChild(el("span", "match-tile-front", String(tile.term).slice(0, 18)));
          }
          cell.style.animationDelay = ti * 0.05 + "s";
          board5.appendChild(cell);
        });
        match.appendChild(board5);
        var duo = el("div", "match-duo");
        var termCard = el("div", "match-card term open");
        termCard.appendChild(el("div", "match-face-label", "Term"));
        termCard.appendChild(el("div", "match-face-text", slide.term || slide.question || ""));
        var defOpen = !!(opts.revealed || slide.hideAfterStudy === false);
        var defCard = el("div", "match-card def" + (defOpen ? " open" : " shut"));
        defCard.appendChild(el("div", "match-face-label", "Definition"));
        if (defOpen && slide.definition) {
          defCard.appendChild(el("div", "match-face-text", slide.definition));
        } else {
          defCard.appendChild(el("div", "match-face-hidden", "?"));
          defCard.appendChild(el("div", "match-face-hint", "Study · then recall"));
        }
        duo.appendChild(termCard);
        duo.appendChild(el("div", "match-link", "⟷"));
        duo.appendChild(defCard);
        match.appendChild(duo);
        match.appendChild(el(
          "div",
          "stage-note",
          "Memorise the pair. Host marks Claimed when a learner has it (+1)."
        ));
        pad.appendChild(match);
      } else if (present === "claim") {
        var claim = el("div", "stage-hero claim-stage");
        claim.appendChild(el("div", "stage-atmosphere", ""));
        var flip = el("div", "flip-card" + (opts.revealed || slide.hideAfterStudy === false ? " open" : ""));
        var faceA = el("div", "flip-face front");
        faceA.appendChild(el("div", "match-face-label", "Term"));
        faceA.appendChild(el("div", "claim-term", slide.term || slide.question || ""));
        var faceB = el("div", "flip-face back");
        faceB.appendChild(el("div", "match-face-label", "Definition"));
        faceB.appendChild(el(
          "div",
          "claim-def",
          slide.definition || "Flip after study"
        ));
        flip.appendChild(faceA);
        flip.appendChild(faceB);
        claim.appendChild(flip);
        if (!opts.revealed && slide.hideAfterStudy !== false) {
          claim.appendChild(el(
            "div",
            "stage-note",
            "Study while the clock runs · then the definition hides"
          ));
        }
        pad.appendChild(claim);
      } else if (present === "knowledge") {
        var know = el("div", "stage-hero knowledge-stage");
        know.appendChild(el("div", "stage-atmosphere", ""));
        var chip = el("div", "knowledge-chip");
        chip.appendChild(el("div", "claim-term", slide.term || slide.question || ""));
        know.appendChild(chip);
        if (slide.definition) {
          know.appendChild(el("div", "claim-def soft", slide.definition));
        }
        know.appendChild(el("div", "stage-note", "Keywords stay visible. Host marks Claimed for +1."));
        pad.appendChild(know);
      } else if (present === "spin") {
        var spin = el("div", "spin-room");
        var dial = el("div", "spin-dial");
        dial.setAttribute("aria-hidden", "true");
        var wheel = el("div", "spin-disc");
        for (var segment = 0; segment < 8; segment++) {
          var mark = el("span", "spin-segment", ["✦", "◎", "✳", "◇"][segment % 4]);
          mark.style.setProperty("--sector", segment);
          wheel.appendChild(mark);
        }
        dial.appendChild(wheel);
        dial.appendChild(el("div", "spin-pointer", "▼"));
        dial.appendChild(el("div", "spin-hub", "SPIN"));
        var counter = el("div", "spin-counter", slide.spinTotal ? "DRAW " + slide.spinDraw + " / " + slide.spinTotal : "CONCEPT DRAW");
        dial.appendChild(counter);
        spin.appendChild(dial);
        var challenge = el("div", "spin-challenge");
        challenge.appendChild(el("div", "spin-eyebrow", slide.category || "YOUR CONCEPT"));
        challenge.appendChild(el("h2", "spin-concept", slide.term || slide.question || ""));
        var steps = el("div", "spin-scaffold");
        ["Explain the meaning", "Give a real example", "Connect it to what you know"].forEach(function(text2, i) {
          var step = el("div", "spin-prompt");
          step.appendChild(el("span", null, String(i + 1)));
          step.appendChild(el("strong", null, text2));
          steps.appendChild(step);
        });
        challenge.appendChild(steps);
        if (slide.hint) {
          var hint = el("details", "spin-hint");
          hint.appendChild(el("summary", null, "Need a hint?"));
          hint.appendChild(el("p", null, slide.hint));
          challenge.appendChild(hint);
        }
        challenge.appendChild(el("div", "spin-deck-note", slide.spinTotal ? slide.spinTotal - slide.spinDraw + " concepts left · no repeat draws" : "Explain aloud · the teacher marks your response"));
        spin.appendChild(challenge);
        pad.appendChild(spin);
      } else if (present === "headsup") {
        var oracy = el("div", "stage-hero oracy-stage heads-stage");
        oracy.appendChild(el("div", "stage-atmosphere", ""));
        if (slide.category) oracy.appendChild(el("div", "stage-kicker", slide.category));
        oracy.appendChild(el("div", "oracy-term", slide.term || slide.question || ""));
        if (slide.hint) oracy.appendChild(el("div", "stage-note", slide.hint));
        if (slide.roundSeconds) {
          var round = el("div", "round-clock");
          round.setAttribute("aria-hidden", "true");
          round.appendChild(el("span", "rc-n", SF.clockFace ? SF.clockFace(slide.roundSeconds) : String(slide.roundSeconds)));
          var track = el("span", "rc-track");
          track.appendChild(el("span", "rc-fill"));
          round.appendChild(track);
          round.appendChild(el("span", "rc-count", ""));
          oracy.appendChild(round);
        }
        if (slide.drawTotal) {
          oracy.appendChild(el("div", "heads-pile", "Term " + slide.drawNo + " of " + slide.drawTotal));
        }
        pad.appendChild(oracy);
      } else if (present === "connection") {
        var pair = el("div", "stage-hero connection-stage");
        pair.appendChild(el("div", "stage-atmosphere", ""));
        var row = el("div", "conn-pair");
        var ca = el("div", "conn-tile a");
        ca.appendChild(el("div", "conn-label", "A"));
        ca.appendChild(el("div", "conn-text", slide.itemA || "A"));
        var cb = el("div", "conn-tile b");
        cb.appendChild(el("div", "conn-label", "B"));
        cb.appendChild(el("div", "conn-text", slide.itemB || "B"));
        row.appendChild(ca);
        row.appendChild(el("div", "conn-bridge", "↔"));
        row.appendChild(cb);
        pair.appendChild(row);
        pair.appendChild(el("div", "stage-note", "Explain the bridge aloud"));
        pad.appendChild(pair);
      } else if (present === "compare") {
        var cmp = el("div", "stage-hero compare-stage");
        cmp.appendChild(el("div", "stage-atmosphere", ""));
        if (slide.category) {
          cmp.appendChild(el("div", "stage-kicker", slide.category));
        }
        var crow = el("div", "compare-pair");
        var cta = el("div", "compare-tile");
        cta.appendChild(el("div", "compare-label", "Item A"));
        cta.appendChild(el("div", "compare-text", slide.itemA || "A"));
        var ctb = el("div", "compare-tile");
        ctb.appendChild(el("div", "compare-label", "Item B"));
        ctb.appendChild(el("div", "compare-text", slide.itemB || "B"));
        crow.appendChild(cta);
        crow.appendChild(ctb);
        cmp.appendChild(crow);
        if (!opts.revealed) {
          cmp.appendChild(el(
            "p",
            "compare-discuss",
            "Discuss: what are the similarities and differences?"
          ));
        }
        var panels = el("div", "compare-panels" + (opts.revealed ? " on" : ""));
        var alike = el("div", "compare-panel alike");
        alike.appendChild(el("div", "compare-panel-label", "Similarities"));
        alike.appendChild(el(
          "div",
          "compare-panel-body",
          slide.similarities || "Needs similarities"
        ));
        var differ = el("div", "compare-panel differ");
        differ.appendChild(el("div", "compare-panel-label", "Differences"));
        differ.appendChild(el(
          "div",
          "compare-panel-body",
          slide.differences || "Needs differences"
        ));
        panels.appendChild(alike);
        panels.appendChild(differ);
        cmp.appendChild(panels);
        pad.appendChild(cmp);
      } else if (present === "chain") {
        var links = (opts.chainLinks || []).slice();
        var chain = el("div", "stage-hero chain-stage");
        chain.appendChild(el("div", "stage-atmosphere", ""));
        var steps = el("div", "chain-steps");
        links.forEach(function(step) {
          steps.appendChild(el("div", "chain-node done", step.term || ""));
          steps.appendChild(el("div", "chain-arrow", ""));
          steps.appendChild(el("div", "chain-node link", step.link || ""));
          steps.appendChild(el("div", "chain-arrow", ""));
        });
        steps.appendChild(el("div", "chain-node seed", slide.term || slide.question || ""));
        if (!opts.revealed) {
          steps.appendChild(el("div", "chain-arrow", ""));
          var pendingLabel = String(opts.chainPending || "").trim();
          steps.appendChild(el(
            "div",
            "chain-node ghost",
            pendingLabel || "next link"
          ));
        }
        chain.appendChild(steps);
        if (slide.prompt) {
          chain.appendChild(el("div", "stage-note chain-prompt", slide.prompt));
        }
        if (!opts.revealed && opts.chainCommand) {
          var wrap = el("div", "chain-capture");
          var inp = el("input", "chain-link-input");
          inp.type = "text";
          inp.maxLength = 160;
          inp.placeholder = "Type the proposed link and justification";
          inp.value = opts.chainPending || "";
          inp.setAttribute("aria-label", "Proposed chain link");
          inp.addEventListener("input", function() {
            opts.chainCommand("pending", inp.value);
            var ghost = steps.querySelector(".chain-node.ghost");
            if (ghost) ghost.textContent = String(inp.value || "").trim() || "next link";
          });
          inp.addEventListener("click", function(e) {
            e.stopPropagation();
          });
          wrap.appendChild(inp);
          wrap.appendChild(el(
            "p",
            "chain-capture-hint",
            "Accept grows the chain (+1). Reject or timeout skips."
          ));
          chain.appendChild(wrap);
        }
        pad.appendChild(chain);
      } else if (present === "challenge") {
        var ch = el("div", "stage-hero challenge-stage");
        ch.appendChild(el("div", "stage-atmosphere", ""));
        var left = slide.drawTotal ? slide.drawTotal - slide.drawNo : 0;
        var deckEl = el("div", "challenge-deck");
        deckEl.dataset.left = String(Math.min(3, left));
        var poster = el("div", "challenge-poster");
        if (slide.drawTotal) poster.appendChild(el("div", "challenge-card-no", "Card " + slide.drawNo));
        poster.appendChild(el("div", "challenge-body", slide.challenge || slide.question || ""));
        deckEl.appendChild(poster);
        ch.appendChild(deckEl);
        if (slide.drawTotal) {
          ch.appendChild(el("div", "challenge-left", left ? left + (left === 1 ? " card left" : " cards left") + " in the deck" : "Last card"));
        }
        pad.appendChild(ch);
      } else if (present === "bowl") {
        var bowl2 = el("div", "stage-hero bowl-stage");
        bowl2.appendChild(el("div", "stage-atmosphere", ""));
        var bcell = el("div", "bowl-cell");
        bcell.appendChild(el("div", "bowl-cat", slide.category || "Category"));
        bcell.appendChild(el("div", "bowl-val", String(slide.pointValue || slide.points || 200)));
        bowl2.appendChild(bcell);
        pad.appendChild(bowl2);
      } else if (present === "boss") {
        var fight = opts.boss || null;
        var boss2 = el("div", "stage-hero boss-stage" + (fight ? " is-" + fight.stage : ""));
        boss2.appendChild(el("div", "stage-atmosphere", ""));
        var crest = el("div", "boss-crest");
        crest.appendChild(el(
          "div",
          "boss-glyph",
          fight && fight.stage === "defeated" ? "☠" : "▲"
        ));
        var dmg = slide.bossDamage || 2;
        crest.appendChild(el(
          "div",
          "boss-hit-badge",
          (slide.difficulty || "medium") + " · " + dmg + " dmg"
        ));
        boss2.appendChild(crest);
        if (fight) {
          var hp = el("div", "boss-hp");
          var bar = el("div", "boss-hp-rail");
          var fill2 = el("div", "boss-hp-fill");
          fill2.style.width = Math.round(fight.hp / Math.max(1, fight.max) * 100) + "%";
          bar.appendChild(fill2);
          hp.appendChild(bar);
          hp.appendChild(el("div", "boss-hp-n", fight.hp + " / " + fight.max + " HP"));
          boss2.appendChild(hp);
          if (fight.gap) {
            boss2.appendChild(el("div", "boss-turn boss-gap", fight.gap + " — the boss cannot be hit with a blank question."));
          } else if (fight.marked) {
            boss2.appendChild(el("div", "boss-turn", "Already marked — move on."));
          } else if (fight.turnName) {
            boss2.appendChild(el(
              "div",
              "boss-turn",
              fight.stage === "defeated" ? fight.verdict : fight.turnName + " — " + (fight.revealed ? fight.expired ? "out of time" : "did they earn the hit?" : "answer before the clock")
            ));
          }
        }
        pad.appendChild(boss2);
        if (opts.bossCommand && fight && !fight.marked && fight.phase !== "complete") {
          let bossBtn2 = function(text2, action, cls) {
            var b = el("button", "boss-button " + (cls || ""), text2);
            b.type = "button";
            b.dataset.desk = "boss:" + action;
            b.onclick = function() {
              opts.bossCommand(action);
            };
            return b;
          };
          var bossBtn = bossBtn2;
          var acts = el("div", "boss-actions");
          if (!fight.revealed) acts.appendChild(bossBtn2("Reveal the answer", "reveal", "primary"));
          else {
            if (!fight.expired) acts.appendChild(bossBtn2("✓ Hit · −" + dmg, "hit", "primary"));
            acts.appendChild(bossBtn2(fight.expired ? "Out of time — move on" : "✗ Miss", "miss"));
          }
          pad.appendChild(acts);
        }
      } else if (present === "truefalse") {
        var tf2 = el("div", "stage-atmosphere tf-atmosphere", "");
        pad.appendChild(tf2);
      } else if (present === "emoji") {
        var em = el("div", "stage-hero emoji-stage");
        em.appendChild(el("div", "stage-atmosphere", ""));
        var clueText = String(slide.clues || slide.question || "");
        var hero = el("div", "emoji-hero");
        var layout = SF.emojiClueLayout ? SF.emojiClueLayout(clueText) : { tiled: false, pieces: [], text: clueText };
        var pieces = layout.pieces;
        var tiled = layout.tiled;
        hero.classList.toggle("emoji-tiled", tiled);
        if (tiled) {
          hero.setAttribute("role", "img");
          hero.setAttribute("aria-label", clueText);
          hero.style.setProperty("--clue-count", pieces.length);
          pieces.forEach(function(piece, i) {
            var operator = /^[+＝=→➜➡↔&]$/.test(piece);
            var tile = el("span", operator ? "emoji-operator" : "emoji-clue", piece);
            tile.setAttribute("aria-hidden", "true");
            tile.style.setProperty("--clue-index", i);
            hero.appendChild(tile);
          });
        } else hero.textContent = clueText;
        var prompt = el("div", "emoji-mission");
        prompt.appendChild(el("span", "emoji-thinking", "DECODE THE CLUES"));
        prompt.appendChild(el("span", "emoji-solved", "THE CONNECTION REVEALED"));
        em.appendChild(prompt);
        em.appendChild(hero);
        var nudge = el("p", "emoji-nudge");
        nudge.appendChild(el("span", "emoji-thinking", "Name the clues. Find the connection. Make your guess."));
        nudge.appendChild(el("span", "emoji-solved", "Can you explain how each clue fits?"));
        em.appendChild(nudge);
        var help = SF.emojiHelp ? SF.emojiHelp(slide) : { pattern: "step", hint: "" };
        var pattern = help.pattern;
        if (pattern !== "none") {
          var blanks = el("div", "emoji-help emoji-help-blanks" + (pattern === "step" ? " step" : ""));
          blanks.dataset.step = "1";
          blanks.appendChild(el("span", "emoji-help-label", "LETTERS"));
          blanks.appendChild(el(
            "strong",
            "emoji-blanks",
            SF.wordRevealMask(slide.answer || "", 0)
          ));
          em.appendChild(blanks);
        }
        if (help.hint) {
          var hintStep = el("div", "emoji-help emoji-help-hint step");
          hintStep.dataset.step = "2";
          hintStep.appendChild(el("span", "emoji-help-label", "HINT"));
          hintStep.appendChild(el("strong", "emoji-hint-text", help.hint));
          em.appendChild(hintStep);
        }
        pad.appendChild(em);
      } else if (present === "definition") {
        var defPhase = opts.definitionPhase || "reading";
        var def = el("div", "stage-hero definition-stage phase-" + defPhase);
        def.appendChild(el("div", "stage-atmosphere", ""));
        if (defPhase === "reading") {
          def.appendChild(el("div", "definition-eyebrow", "READING · NO NOTES"));
          def.appendChild(el(
            "p",
            "definition-passage",
            slide.passage || "Needs a passage"
          ));
          if (!String(slide.passage || "").trim()) {
            def.appendChild(el(
              "p",
              "definition-gap",
              "Add a passage in Quiz studio before you play"
            ));
          }
          if (opts.definitionCommand) {
            var askBtn = el("button", "definition-ask", "Ask now — hide the passage");
            askBtn.type = "button";
            askBtn.dataset.desk = "definition:ask";
            askBtn.onclick = function() {
              opts.definitionCommand("ask");
            };
            def.appendChild(askBtn);
          } else {
            def.appendChild(el(
              "p",
              "definition-caption",
              "When time is up the passage clears and the recall question appears."
            ));
          }
        } else {
          def.appendChild(el("div", "definition-eyebrow", "RECALL · FROM MEMORY"));
          def.appendChild(el(
            "p",
            "definition-caption",
            "The passage is gone. Answer from what you just read."
          ));
        }
        pad.appendChild(def);
      } else if (present === "blanks") {
        var bl = el("div", "stage-hero blanks-stage");
        bl.appendChild(el("div", "stage-atmosphere", ""));
        var line = el("div", "blanks-line");
        String(slide.question || "").split(/(_{2,}|……+|…+)/).forEach(function(part) {
          if (/^(_+|……+|…+)$/.test(part)) line.appendChild(el("span", "blank-pill", "_____"));
          else if (part) line.appendChild(document.createTextNode(part));
        });
        bl.appendChild(line);
        pad.appendChild(bl);
      }
      var head = el("div", "qhead");
      if (opts.quizNumber) {
        head.appendChild(el(
          "div",
          "qnum",
          (opts.lanes ? "LEG " : "Q") + opts.quizNumber
        ));
      }
      var title = typeof slide.headPrompt === "string" ? slide.headPrompt : slide.question || " ";
      var defReading = present === "definition" && (opts.definitionPhase || "reading") === "reading";
      if (present === "emoji") {
        head.appendChild(el("div", "q q-ask", "Decode the symbols. What is it?"));
      } else if (defReading) {
        head.appendChild(el(
          "div",
          "q q-ask",
          "Read carefully. The passage will clear for the recall question."
        ));
      } else if (title) {
        head.appendChild(el("div", "q q-ask", title));
      }
      var pic = String(slide.image || "").trim();
      var picLayout = pic ? slide.imageLayout || "band" : null;
      var media = null;
      if (pic) {
        media = el("div", "qmedia");
        var pimg = document.createElement("img");
        pimg.src = slide.image;
        pimg.alt = slide.imageAlt || "";
        pimg.onerror = function() {
          media.classList.add("broken");
          var root = media.closest ? media.closest(".slide") : null;
          if (!root) return;
          root.classList.remove("has-media");
          root.classList.add("media-band");
          root.classList.remove("media-overlay", "media-first");
          if (media.contains(head)) pad.insertBefore(head, pad.firstChild);
          try {
            if (SF.Player && SF.Player.fitQuizSlide && root.parentNode) {
              SF.Player.fitQuizSlide(root);
            }
          } catch (e) {
          }
        };
        media.appendChild(pimg);
        pad.parentNode.classList.add("has-media", "media-" + picLayout);
      }
      if (picLayout === "overlay" && media) {
        media.appendChild(head);
        pad.appendChild(media);
      } else if (picLayout === "first" && media) {
        pad.insertBefore(head, pad.firstChild);
        if (head.nextSibling) pad.insertBefore(media, head.nextSibling);
        else pad.appendChild(media);
      } else {
        pad.insertBefore(head, pad.firstChild);
        if (media) pad.appendChild(media);
      }
      if (slide.timeLimit > 0) {
        var clock = el("div", "clock");
        clock.appendChild(ring(84, 8, 1));
        clock.appendChild(el("div", "n", String(slide.timeLimit)));
        pad.parentNode.appendChild(clock);
        pad.parentNode.classList.add("has-clock");
      }
      var opts_ = (slide.options || []).filter(function(o) {
        return String(o).trim();
      });
      var why = String(slide.explanation || "").trim();
      var inlineWhy = why && slide.explainStyle !== "slide";
      if (inlineWhy) pad.parentNode.classList.add("has-why");
      function whyBox() {
        var box2 = el("span", "why");
        why.split(/\n{2,}/).forEach(function(para) {
          if (!para.trim()) return;
          box2.appendChild(el("span", "p", para.trim()));
        });
        if (slide.source) box2.appendChild(el("span", "src", slide.source));
        box2.dataset.len = why.length > 320 ? "xl" : why.length > 170 ? "lg" : "md";
        return box2;
      }
      var judgePresents = {
        claim: 1,
        memorymatch: 1,
        knowledge: 1,
        headsup: 1,
        spin: 1,
        connection: 1,
        chain: 1,
        challenge: 1,
        bowl: 1
      };
      if (judgePresents[present] && slide.input === "choice") {
        appendJudgeStrip(pad, slide, opts, inlineWhy, whyBox);
        return;
      }
      if (present === "compare") return;
      if (slide.input === "fill") {
        pad.parentNode.classList.add("is-fill");
        var parts = slide.fillParts || [slide.question || ""];
        var gapsAt = slide.gapAnswers || [];
        var passageF = el("div", "fill-passage");
        passageF.dataset.len = String(slide.question || "").length <= 90 ? "short" : String(slide.question || "").length <= 200 ? "medium" : "long";
        parts.forEach(function(text2, i) {
          if (text2) passageF.appendChild(el("span", "fill-text", text2));
          if (i < parts.length - 1) {
            var slot = el("span", "fill-gap");
            slot.dataset.i = String(i);
            slot.appendChild(el("span", "fg-n", String(i + 1)));
            slot.appendChild(el("span", "fg-word", opts.revealed ? (slide.options || [])[gapsAt[i]] || "" : ""));
            slot.appendChild(el("span", "fg-heat", ""));
            passageF.appendChild(slot);
          }
        });
        pad.appendChild(passageF);
        var bankF = el("div", "fill-bank");
        (slide.options || []).forEach(function(w) {
          bankF.appendChild(el("span", "fb-word", w));
        });
        pad.appendChild(bankF);
        pad.appendChild(el("div", "fill-verdict", ""));
        if (inlineWhy) {
          var fw = el("div", "spot-why");
          fw.appendChild(whyBox());
          pad.appendChild(fw);
        }
        pad.appendChild(el("div", "answered-count", ""));
        return;
      }
      if (slide.input === "tap") {
        pad.parentNode.classList.add("is-spot");
        var from = typeof slide.errorFrom === "number" ? slide.errorFrom : Number(slide.correct) || 0;
        var to = typeof slide.errorTo === "number" ? slide.errorTo : from;
        var passage = el("div", "spot-passage tally");
        passage.dataset.errorFrom = String(from);
        passage.dataset.errorTo = String(to);
        var nWords = (slide.options || []).length;
        passage.dataset.len = nWords <= 16 ? "short" : nWords <= 36 ? "medium" : "long";
        (slide.options || []).forEach(function(word, i) {
          var w = el("button", "opt spot-cell" + (i >= from && i <= to ? " in-error" : ""));
          w.type = "button";
          w.dataset.choice = String(i);
          if (!opts.interactive) w.classList.add("locked");
          if (opts.revealed && i === from) w.classList.add("correct");
          w.appendChild(el("span", "spot-text", word));
          var col = el("span", "col");
          var bar2 = el("span", "bar");
          bar2.style.height = "0px";
          col.appendChild(bar2);
          col.appendChild(el("span", "cnt", ""));
          w.appendChild(col);
          passage.appendChild(w);
          if (i === to && slide.fix) passage.appendChild(el("span", "spot-fix", slide.fix));
        });
        pad.appendChild(passage);
        pad.appendChild(el("div", "spot-verdict", ""));
        if (inlineWhy) {
          var sw = el("div", "spot-why");
          sw.appendChild(whyBox());
          pad.appendChild(sw);
        }
        pad.appendChild(el("div", "answered-count", ""));
        return;
      }
      if (slide.input === "order") {
        pad.parentNode.classList.add("is-order");
        var showing = (slide.options || []).map(function(text2, i) {
          return { i, text: text2 };
        });
        if (!opts.revealed) showing = stableShuffle(showing, slide.id);
        else showing.sort(function(a, b) {
          return a.i - b.i;
        });
        var ow = el("div", "opts stack ordered");
        showing.forEach(function(item, pos) {
          var row2 = el("button", "opt" + (opts.revealed ? " correct" : ""));
          row2.type = "button";
          row2.dataset.choice = String(item.i);
          row2.classList.add("locked");
          var line2 = el("span", "opt-line");
          line2.appendChild(el("span", "key", opts.revealed ? String(pos + 1) : "↕"));
          line2.appendChild(el("span", "txt", item.text));
          row2.appendChild(line2);
          ow.appendChild(row2);
        });
        pad.appendChild(ow);
        var ol = el("div", "typedlist");
        ol.appendChild(el("div", "typedcount", ""));
        pad.appendChild(ol);
        if (inlineWhy) pad.appendChild(whyBox());
        return;
      }
      if (slide.input === "text" || slide.input === "number") {
        var placing = slide.input === "number";
        var defPhaseNow = present === "definition" ? opts.definitionPhase || "reading" : null;
        if (defPhaseNow === "reading") {
          var wait = el("div", "definition-wait");
          wait.appendChild(el(
            "strong",
            null,
            opts.live ? "Phones stay closed until the passage clears." : "Answers open when the passage clears."
          ));
          pad.appendChild(wait);
          return;
        }
        pad.parentNode.classList.add("is-typed");
        var hold = !opts.revealed && (opts.live || slide.hideAnswerUntilReveal === true);
        var tw = el("div", "opts stack typed");
        var ab = el("button", "opt answer");
        ab.type = "button";
        ab.dataset.choice = "0";
        if (!opts.interactive) ab.classList.add("locked");
        if (hold) ab.classList.add("held");
        var aline = el("span", "opt-line");
        aline.appendChild(el("span", "key", placing ? "↔" : "✎"));
        aline.appendChild(el("span", "txt", hold ? opts.live ? placing ? "Placing their answers…" : "Typing on your phones…" : "Hidden until you reveal it" : slide.answer || " "));
        aline.appendChild(el("span", "tick", "✓"));
        ab.appendChild(aline);
        if (inlineWhy) ab.appendChild(whyBox());
        tw.appendChild(ab);
        pad.appendChild(tw);
        var tl = el("div", "typedlist");
        tl.appendChild(el("div", "typedcount", ""));
        if (placing) {
          tl.appendChild(numberLine(slide));
        } else {
          tl.appendChild(el("div", "typedgroups"));
        }
        pad.appendChild(tl);
        return;
      }
      var wrap = el("div", "opts" + (present === "truefalse" ? " tf-duo" : present === "oddone" ? " odd-grid" : opts_.length > 4 || opts_.some(longOption) ? " stack" : "") + (present === "speed" ? " speed-opts" : "") + (present === "spoterror" ? " spot-opts" : "") + (present === "predict" ? " predict-opts" : ""));
      opts_.forEach(function(text2, i) {
        var b = el("button", "opt");
        b.type = "button";
        b.dataset.choice = String(i);
        if (!opts.interactive || present === "oddone") b.classList.add("locked");
        if (present === "oddone" && opts.revealed && i === slide.correct) {
          b.classList.add("odd-marked");
        }
        var line2 = el("span", "opt-line");
        if (present === "oddone") {
          line2.appendChild(el("span", "txt", text2));
          if (opts.revealed) {
            line2.appendChild(el("span", "tick", i === slide.correct ? "odd one" : ""));
          }
        } else {
          line2.appendChild(el("span", "key", LETTERS[i] || String(i + 1)));
          line2.appendChild(el("span", "txt", text2));
          line2.appendChild(el("span", "tick", i === slide.correct ? "✓" : "✗"));
        }
        b.appendChild(line2);
        if (present === "oddone") {
          var col = el("span", "col");
          col.appendChild(el("span", "bar"));
          col.appendChild(el("span", "cnt", ""));
          b.appendChild(col);
        }
        if (inlineWhy && i === slide.correct) b.appendChild(whyBox());
        wrap.appendChild(b);
      });
      if (present === "oddone") {
        wrap.classList.add("tally", "odd-heat");
        wrap.dataset.correct = String(slide.correct);
      }
      pad.appendChild(wrap);
      if (present === "oddone") {
        if (!opts.revealed) {
          pad.appendChild(el(
            "p",
            "oddone-discuss",
            "Which one does not belong? Vote on your phone, and have your rule ready."
          ));
        }
        pad.appendChild(el("p", "odd-verdict", ""));
        if (slide.explanation && !inlineWhy) pad.appendChild(whyBox());
        pad.appendChild(el("div", "answered-count", ""));
        return;
      }
      if (slide.predict && !opts.revealed) {
        var pn = el("p", "predict-note");
        pn.appendChild(el("span", "pn-commit", "Commit to a prediction on your phone — and say how sure you are."));
        pn.appendChild(el("span", "pn-watch", "Predictions are locked. Watch what happens."));
        pad.appendChild(pn);
      }
      if (slide.showdown) {
        var sd = el("div", "showdown");
        sd.setAttribute("aria-live", "polite");
        var sdBar = el("div", "sd-bar");
        opts_.forEach(function(text2, i) {
          var seg = el("div", "sd-seg sd-" + i);
          seg.dataset.i = String(i);
          seg.appendChild(el("span", "sd-label", text2));
          seg.appendChild(el("span", "sd-pct", ""));
          sdBar.appendChild(seg);
        });
        sdBar.appendChild(el("span", "sd-was"));
        sd.appendChild(sdBar);
        sd.appendChild(el("p", "sd-note", "Votes are in when you are ready. Next shows the room its split."));
        pad.appendChild(sd);
      }
      var tally = el("div", "tally");
      opts_.forEach(function(_, i) {
        var col = el("div", "col" + (i === slide.correct ? " right" : ""));
        var bar2 = el("div", "bar");
        bar2.style.height = "0px";
        col.appendChild(bar2);
        col.appendChild(el("div", "cnt", "0"));
        tally.appendChild(col);
      });
      pad.appendChild(tally);
      pad.appendChild(el("div", "answered-count", ""));
    }
    function longOption(t) {
      return String(t).length > 42;
    }
    function layoutResults(slide, pad, opts) {
      if (slide.title) pad.appendChild(rich("h2", null, slide, "title", slide.title));
      var marks = opts.marks || [];
      if (!marks.length) {
        pad.appendChild(el("div", "none", "Answer the quiz slides during the show and the score lands here."));
        return;
      }
      var right = marks.filter(function(m) {
        return m.correct;
      }).length;
      var pct = Math.round(right / marks.length * 100);
      var hero = el("div", "score-hero");
      var donut = el("div", "donut");
      donut.appendChild(ring(260, 22, right / marks.length));
      var mid = el("div", "mid");
      var box2 = el("div");
      box2.appendChild(el("div", "pct", pct + "%"));
      box2.appendChild(el("div", "of", right + " of " + marks.length + " correct"));
      mid.appendChild(box2);
      donut.appendChild(mid);
      hero.appendChild(donut);
      var bd = el("div", "breakdown");
      marks.slice(0, 7).forEach(function(m, i) {
        var row = el("div", "row " + (m.correct ? "ok" : "no"));
        row.appendChild(el("div", "qi", "Q" + (i + 1)));
        row.appendChild(el("div", "qt", m.question || ""));
        row.appendChild(el("div", "mk", m.correct ? "✓" : "✗"));
        bd.appendChild(row);
      });
      if (marks.length > 7) {
        bd.appendChild(el("div", "row", "+ " + (marks.length - 7) + " more"));
      }
      hero.appendChild(bd);
      pad.appendChild(hero);
    }
    return { layoutExplain, layoutGame, layoutJoin, layoutQuiz, layoutResults, quizPresent, sampleJoinInfo };
  }

  // src/render/art.js
  function installArtRenderer(SF, helpers) {
    const { el } = helpers;
    function artKeyOf(node, i) {
      var raw = node.className;
      if (raw && typeof raw === "object" && "baseVal" in raw) raw = raw.baseVal;
      var cls = String(raw || "").split(/\s+/).filter(Boolean)[0];
      return cls || "art-" + i;
    }
    SF.artKeyOf = artKeyOf;
    SF.applyArtPoses = function(layer, poses) {
      if (!layer) return;
      Array.prototype.forEach.call(layer.children, function(node, i) {
        var key = artKeyOf(node, i);
        node.setAttribute("data-art-key", key);
        var pose = poses && poses[key];
        if (!pose) return;
        if (pose.x != null && pose.y != null) {
          node.style.left = pose.x + "px";
          node.style.top = pose.y + "px";
          node.style.right = "auto";
          node.style.bottom = "auto";
        }
        if (pose.scale != null) {
          node.style.transform = "scale(" + pose.scale + ")";
          node.style.transformOrigin = "top left";
        }
        var side = SF.artOrder(pose, "back");
        node.setAttribute("data-art-order", side);
        if (pose.hidden) node.style.display = "none";
      });
    };
    SF.artOrder = function(item, fallback) {
      return item && item.order === "back" ? "back" : item && item.order === "front" ? "front" : fallback;
    };
    SF.artPlacement = function(pic) {
      return pic && pic.place === "lattice" ? "lattice" : "free";
    };
    SF.artBlockKey = function(id) {
      return "picture." + id;
    };
    SF.artBlockId = function(key) {
      var m = /^picture\.(.+)$/.exec(String(key || ""));
      return m ? m[1] : null;
    };
    SF.placedArtLayers = function(pictures) {
      var list = Array.isArray(pictures) ? pictures.filter(function(p) {
        return p && p.src && SF.artPlacement(p) === "free";
      }) : [];
      var layers = {};
      list.forEach(function(pic, i) {
        var side = SF.artOrder(pic, "front");
        var layer = layers[side] || (layers[side] = el("div", "slide-art slide-art-" + side));
        layer.setAttribute("data-art-order", side);
        var img = el("img", "slide-art-img");
        img.src = pic.src;
        img.alt = String(pic.alt || "");
        img.setAttribute("data-art-pic", String(pic.id == null ? i : pic.id));
        img.setAttribute("data-art-order", side);
        if (pic.hidden) img.style.display = "none";
        img.style.left = (pic.x || 0) + "px";
        img.style.top = (pic.y || 0) + "px";
        if (pic.w) img.style.width = pic.w + "px";
        layer.appendChild(img);
      });
      return ["back", "front"].map(function(side) {
        return layers[side];
      }).filter(Boolean);
    };
  }

  // src/render/lattice.js
  function installLatticeRenderer(SF, helpers) {
    const { el, IMAGE_FRAMES, travelFrom } = helpers;
    var LATTICE = { left: 52, top: 88, w: 1176, h: 576, cols: 12, rows: 16, stepX: 101, stepY: 36 };
    SF.LATTICE = LATTICE;
    SF.anchorRegion = function(region2) {
      var r = Object.assign({}, region2);
      function cells(v, lo, hi) {
        var n = Math.round(Number(v));
        if (!isFinite(n)) n = lo;
        return Math.max(lo, Math.min(hi, n));
      }
      r.cols = cells(r.cols, 1, LATTICE.cols);
      r.col = cells(r.col, 1, LATTICE.cols - r.cols + 1);
      r.rows = cells(r.rows, 1, Infinity);
      r.row = cells(r.row, 1, Infinity);
      if (r.anchorX === "left") r.col = 1;
      if (r.anchorX === "center") r.col = Math.floor((LATTICE.cols - r.cols) / 2) + 1;
      if (r.anchorX === "right") r.col = LATTICE.cols - r.cols + 1;
      if (r.anchorY === "top") r.row = 1;
      if (r.anchorY === "middle") r.row = Math.floor((LATTICE.rows - r.rows) / 2) + 1;
      if (r.anchorY === "bottom") r.row = LATTICE.rows - r.rows + 1;
      return r;
    };
    function blockKeyOf(node, i) {
      if (!node.getAttribute) return "block-" + i;
      var named = node.getAttribute("data-block-key");
      if (named) return named;
      var kept = node.getAttribute("data-lattice-key");
      if (kept) return kept;
      var key = node.getAttribute("data-content-key");
      if (key) return key;
      var raw = node.className;
      if (raw && typeof raw === "object" && "baseVal" in raw) raw = raw.baseVal;
      var cls = String(raw || "").split(/\s+/).filter(Boolean)[0];
      return cls || "block-" + i;
    }
    SF.blockKeyOf = blockKeyOf;
    SF.latticeHost = function(root) {
      return root.querySelector(".cp-body") || root.querySelector(".pad") || null;
    };
    SF.latticeGeometry = function(root) {
      var g = Object.assign({}, LATTICE);
      var grid = root && root.querySelector(".sf-lattice");
      if (!grid) return g;
      var base = root.getBoundingClientRect(), rect = grid.getBoundingClientRect();
      var scale = base.width / 1280;
      if (!scale || !rect.height) return g;
      g.left = (rect.left - base.left) / scale;
      g.top = (rect.top - base.top) / scale;
      g.w = rect.width / scale;
      g.h = rect.height / scale;
      g.stepX = (g.w + 36) / g.cols;
      g.stepY = g.h / g.rows;
      return g;
    };
    SF.regionsOverlap = function(a, b) {
      return !!a && !!b && a.col < b.col + b.cols && b.col < a.col + a.cols && a.row < b.row + b.rows && b.row < a.row + a.rows;
    };
    SF.overlapsIn = function(regions) {
      var keys = Object.keys(regions || {});
      var out = [];
      keys.forEach(function(a, i) {
        keys.slice(i + 1).forEach(function(b) {
          if (SF.regionsOverlap(regions[a], regions[b])) out.push([a, b]);
        });
      });
      return out;
    };
    SF.freePlacement = function(want, occupied, grid) {
      if (!want) return null;
      var cols = grid && grid.cols || 12;
      var rows2 = grid && grid.rows || 16;
      var busy = (occupied || []).filter(Boolean);
      var clear = function(r) {
        return !busy.some(function(b) {
          return SF.regionsOverlap(r, b);
        });
      };
      if (want.col >= 1 && want.row >= 1 && want.col + want.cols - 1 <= cols && want.row + want.rows - 1 <= rows2 && clear(want)) return { ...want };
      var best = null, bestD = Infinity;
      for (var row = 1; row + want.rows - 1 <= rows2; row++) {
        for (var col = 1; col + want.cols - 1 <= cols; col++) {
          var here = { col, row, cols: want.cols, rows: want.rows };
          if (!clear(here)) continue;
          var d = Math.abs(col - want.col) + Math.abs(row - want.row) * 1.35;
          if (d < bestD) {
            bestD = d;
            best = here;
          }
        }
      }
      return best ? { ...best, moved: true } : null;
    };
    SF.resolvePlacement = function(regions, key, want, grid, fixed) {
      if (!regions || !key || !want) return null;
      var cols = grid && grid.cols || 12;
      var rows2 = grid && grid.rows || 16;
      if (want.col < 1 || want.row < 1 || want.col + want.cols - 1 > cols || want.row + want.rows - 1 > rows2) return null;
      var immovable = {};
      (fixed || []).forEach(function(k) {
        immovable[k] = true;
      });
      var next = {};
      Object.keys(regions).forEach(function(k) {
        next[k] = { ...regions[k] };
      });
      next[key] = { col: want.col, row: want.row, cols: want.cols, rows: want.rows };
      var settled = Object.keys(next).length + 4;
      for (var pass = 0; pass < settled; pass++) {
        var clash = [];
        Object.keys(next).forEach(function(a) {
          if (clash.length) return;
          Object.keys(next).forEach(function(b) {
            if (clash.length || a === b) return;
            if (SF.regionsOverlap(next[a], next[b])) clash = [a, b];
          });
        });
        if (!clash.length) return next;
        var shove = clash.filter(function(k) {
          return k !== key && !immovable[k];
        })[0];
        if (!shove) return null;
        var others = Object.keys(next).filter(function(k) {
          return k !== shove;
        }).map(function(k) {
          return next[k];
        });
        var spot2 = SF.freePlacement(next[shove], others, { cols, rows: rows2 });
        if (!spot2) return null;
        next[shove] = { col: spot2.col, row: spot2.row, cols: spot2.cols, rows: spot2.rows };
      }
      return null;
    };
    SF.hiddenBlocksOf = function(slide) {
      var list = slide && slide.design && slide.design.hidden;
      return Array.isArray(list) ? list.filter(Boolean).map(String) : [];
    };
    SF.isBlockHidden = function(slide, key) {
      return !!key && SF.hiddenBlocksOf(slide).indexOf(String(key)) >= 0;
    };
    SF.dropHiddenBlocks = function(root, slide) {
      var hidden = SF.hiddenBlocksOf(slide);
      if (!hidden.length) return 0;
      var host = SF.latticeHost(root);
      if (!host) return 0;
      var kids = Array.prototype.slice.call(host.children).filter(function(n) {
        return n.nodeType === 1;
      });
      kids.forEach(function(node, i) {
        if (node.setAttribute) node.setAttribute("data-lattice-key", String(blockKeyOf(node, i)));
      });
      var gone = 0;
      kids.forEach(function(node) {
        if (hidden.indexOf(String(blockKeyOf(node, 0))) >= 0) {
          node.remove();
          gone++;
        }
      });
      return gone;
    };
    SF.applyRegions = function(root, slide) {
      var regions = slide && slide.design && slide.design.regions;
      if (!regions || !Object.keys(regions).length) return false;
      var host = SF.latticeHost(root);
      if (!host) return false;
      var kids = Array.prototype.slice.call(host.children).filter(function(n) {
        return n.nodeType === 1;
      });
      if (!kids.length) return false;
      var grid = el("div", "sf-lattice");
      kids.forEach(function(node, i) {
        var key = blockKeyOf(node, i);
        var r = regions[key] && SF.anchorRegion(regions[key]);
        var slot = el("div", "sf-slot");
        slot.setAttribute("data-block-key", key);
        if (r) {
          slot.style.gridArea = r.row + " / " + r.col + " / span " + r.rows + " / span " + r.cols;
          slot.setAttribute("data-region", r.row + "," + r.col + "," + r.rows + "," + r.cols);
          var dx = r.anchorX === "center" && (LATTICE.cols - r.cols) % 2 ? LATTICE.stepX / 2 : 0;
          var dy = r.anchorY === "middle" && (LATTICE.rows - r.rows) % 2 ? 50 / r.rows : 0;
          if (dx || dy) slot.style.transform = "translate(" + dx + "px, " + dy + "%)";
          if (/^(top|middle|bottom)$/.test(r.alignY || "")) slot.setAttribute("data-align-y", r.alignY);
          if (/^(left|center|right)$/.test(r.alignX || "")) slot.setAttribute("data-align-x", r.alignX);
        }
        slot.appendChild(node);
        grid.appendChild(slot);
      });
      host.replaceChildren(grid);
      root.classList.add("sf-latticed");
      return true;
    };
    var FREE_KINDS = {
      heading: {
        tag: "h3",
        cls: "free-heading",
        label: "Heading",
        rows: 1,
        cols: 10,
        size: "heading",
        edits: "inline",
        resizes: true,
        duplicates: true
      },
      text: {
        tag: "p",
        cls: "free-text",
        label: "Text",
        rows: 1,
        cols: 9,
        size: "body",
        edits: "inline",
        resizes: true,
        duplicates: true
      },
      note: {
        tag: "div",
        cls: "free-note",
        label: "Note",
        rows: 1,
        cols: 4,
        size: "small",
        edits: "inline",
        resizes: true,
        duplicates: true
      },
      bullets: {
        tag: "ul",
        cls: "free-bullets",
        label: "Bullet points",
        rows: 8,
        cols: 10,
        edits: "rail",
        resizes: true,
        duplicates: true,
        hint: "One point per line.",
        draw: function(node, text2) {
          text2.split("\n").map(function(l) {
            return l.trim();
          }).filter(Boolean).forEach(function(line) {
            node.appendChild(el("li", null, line));
          });
        }
      },
      image: {
        tag: "div",
        cls: "free-image",
        label: "Image",
        rows: 11,
        cols: 8,
        edits: false,
        resizes: true,
        duplicates: true,
        hint: "A URL, or a path to a file beside index.html.",
        draw: function(node, text2, block) {
          var src = SF.safeMedia(text2);
          if (!src) return;
          var travel = travelFrom(block);
          var motion = travel ? " img-motion-travel" : block.imageMotion === "zoom" ? " img-motion-zoom" : "";
          var img = el("img", "free-image-img" + motion);
          img.src = src;
          img.alt = String(block.alt || "");
          img.draggable = false;
          img.style.objectFit = block.fit === "contain" ? "contain" : "cover";
          if (Object.prototype.hasOwnProperty.call(IMAGE_FRAMES, block.frame || "")) {
            img.style.aspectRatio = IMAGE_FRAMES[block.frame];
            img.style.width = "auto";
            img.style.height = "auto";
            img.style.maxWidth = "100%";
            img.style.maxHeight = "100%";
          }
          var pct = function(v) {
            var n = Number(v);
            return (Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50) + "%";
          };
          img.style.setProperty("--img-fx", pct(block.focalX));
          img.style.setProperty("--img-fy", pct(block.focalY));
          if (travel) {
            img.style.setProperty("--kb-from", travel.from);
            img.style.setProperty("--kb-to", travel.to);
            img.style.setProperty("--kb-dur", travel.secs + "s");
          }
          node.appendChild(img);
        }
      },
      /* Reverse-engineered from the slide types rather than invented. Keywords,
         stat tiles, timeline entries, links and compare rows each carry their
         own private classes — kw-term/kw-def, stat-value/stat-label,
         timeline-date/timeline-title — and share none of them, but they are all
         the same shape: a label and the thing it names, repeated. 777 of the
         1223 authored bullets in the library already write that shape as
         label TAB value, and cards and tiered bullets already parse it. So this
         is the existing idiom given a block of its own, not a new one. */
      pairs: {
        tag: "dl",
        cls: "free-pairs",
        label: "Label and value list",
        rows: 8,
        cols: 10,
        edits: "rail",
        resizes: true,
        duplicates: true,
        hint: "One per line: the label, a tab, then the value.",
        draw: function(node, text2) {
          text2.split("\n").map(function(l) {
            return l.trim();
          }).filter(Boolean).forEach(function(line) {
            var at = line.indexOf("	");
            var term = at < 0 ? line : line.slice(0, at);
            var def = at < 0 ? "" : line.slice(at + 1).trim();
            node.appendChild(el("dt", "free-pair-term", term));
            if (def) node.appendChild(el("dd", "free-pair-def", def));
          });
        }
      },
      quote: {
        tag: "figure",
        cls: "free-quote",
        label: "Quote",
        rows: 4,
        cols: 8,
        edits: "inline",
        resizes: true,
        duplicates: true,
        hint: "The words, a tab, then who said them.",
        draw: function(node, text2) {
          var at = text2.indexOf("	");
          var words = at < 0 ? text2 : text2.slice(0, at);
          var who = at < 0 ? "" : text2.slice(at + 1).trim();
          node.appendChild(el("blockquote", "free-quote-words", words.trim()));
          if (who) node.appendChild(el("figcaption", "free-quote-attrib", who));
        }
      },
      chart: {
        tag: "div",
        cls: "free-chart",
        label: "Chart",
        rows: 11,
        cols: 11,
        edits: "rail",
        resizes: true,
        duplicates: true,
        hint: "Tab-separated, a heading row then the values.",
        draw: function(node, text2, block) {
          var stand = { chartKind: block.chartKind || "bar", body: text2, design: {} };
          var data = SF.chartData(stand);
          if (!data.categories.length) return;
          node.appendChild(SF.chartSvgFor(stand.chartKind, data, stand, function(si, ci) {
            return data.series.length > 1 ? si : ci;
          }));
        }
      }
    };
    SF.FREE_SIZES = ["display", "title", "heading", "body", "small"];
    SF.FREE_KINDS = FREE_KINDS;
    SF.freeBlockKey = function(id) {
      return "blocks." + id;
    };
    SF.freeBlockId = function(key) {
      var m = /^blocks\.(.+)$/.exec(String(key || ""));
      return m ? m[1] : null;
    };
    SF.freeBlocksOf = function(slide, make) {
      if (!slide) return [];
      if (!Array.isArray(slide.blocks)) {
        if (!make) return [];
        slide.blocks = [];
      }
      return slide.blocks;
    };
    SF.freeBlockById = function(slide, id) {
      return SF.freeBlocksOf(slide).find(function(b) {
        return String(b.id) === String(id);
      }) || null;
    };
    SF.canRemoveBlock = function(slide, key) {
      var id = SF.freeBlockId(key);
      return !!(slide && id && SF.freeBlockById(slide, id));
    };
    SF.removeFreeBlock = function(slide, key) {
      if (!SF.canRemoveBlock(slide, key)) return false;
      var id = SF.freeBlockId(key);
      slide.blocks = SF.freeBlocksOf(slide).filter(function(b) {
        return String(b.id) !== String(id);
      });
      if (slide.design && slide.design.regions) delete slide.design.regions[key];
      if (slide.formatting) delete slide.formatting[key];
      return true;
    };
    SF.canDeleteBlock = function(slide, key) {
      if (!slide || !key) return false;
      if (SF.canRemoveBlock(slide, key)) return true;
      return !SF.freeBlockId(key) && !SF.isBlockHidden(slide, key);
    };
    SF.deleteBlock = function(slide, key) {
      if (!SF.canDeleteBlock(slide, key)) return null;
      if (SF.canRemoveBlock(slide, key)) {
        SF.removeFreeBlock(slide, key);
        return "item";
      }
      if (!slide.design) slide.design = {};
      if (!Array.isArray(slide.design.hidden)) slide.design.hidden = [];
      slide.design.hidden.push(String(key));
      return "layout";
    };
    SF.restoreBlock = function(slide, key) {
      if (!SF.isBlockHidden(slide, key)) return false;
      slide.design.hidden = SF.hiddenBlocksOf(slide).filter(function(k) {
        return k !== String(key);
      });
      if (!slide.design.hidden.length) delete slide.design.hidden;
      return true;
    };
    SF.restoreAllBlocks = function(slide) {
      var n = SF.hiddenBlocksOf(slide).length;
      if (n && slide.design) delete slide.design.hidden;
      return n;
    };
    SF.renderFreeBlocks = function(root, slide) {
      var list = SF.freeBlocksOf(slide).filter(function(b) {
        return b && b.id;
      });
      var pictures = (slide && slide.art && slide.art.pictures || []).filter(function(p) {
        return p && p.src && p.id && SF.artPlacement(p) === "lattice";
      });
      if (!list.length && !pictures.length) return 0;
      var host = SF.latticeHost(root);
      if (!host) return 0;
      pictures.forEach(function(pic) {
        var frame = el("div", "art-block");
        frame.setAttribute("data-block-key", SF.artBlockKey(pic.id));
        frame.dataset.artPic = String(pic.id);
        var img = el("img", "art-block-img");
        img.src = pic.src;
        img.alt = String(pic.alt || "");
        img.draggable = false;
        img.style.objectFit = pic.fit === "contain" ? "contain" : "cover";
        if (pic.hidden) frame.style.display = "none";
        frame.appendChild(img);
        host.appendChild(frame);
      });
      list.forEach(function(block) {
        var spec = FREE_KINDS[block.kind] || FREE_KINDS.text;
        var key = SF.freeBlockKey(block.id);
        var composed = !!(root.getAttribute && root.getAttribute("data-composition")) || !!root.querySelector("[data-composition]");
        var AS_TAG = { title: ["h2", ""], subtitle: ["div", composed ? "cp-eyebrow" : "sub"] };
        var asSlot = block.as && AS_TAG[block.as];
        var size = block.size || spec.size;
        var node = asSlot ? el(asSlot[0], "free-block " + spec.cls + (asSlot[1] ? " " + asSlot[1] : "")) : el(spec.tag, "free-block " + spec.cls + (size ? " free-size-" + size : ""));
        node.dataset.contentKey = key;
        if (block.as) node.dataset.as = String(block.as);
        node.dataset.freeBlock = String(block.id);
        var text2 = String(block.text == null ? "" : block.text);
        if (!text2.trim()) node.dataset.placeholder = spec.label;
        if (spec.draw) {
          node.dataset.blockKind = block.kind;
          if (text2.trim()) spec.draw(node, text2, block);
          host.appendChild(node);
          return;
        }
        node.textContent = text2;
        if (SF.Custom) SF.Custom.paint(node, slide, key, text2);
        host.appendChild(node);
      });
      return list.length + pictures.length;
    };
    SF.regionColumnGroup = function(regions, key) {
      var subject = regions && regions[key];
      if (!subject) return [];
      var lo = subject.col, hi = subject.col + subject.cols - 1;
      return Object.keys(regions).filter(function(k) {
        var r = regions[k];
        return r && r.col <= hi && lo <= r.col + r.cols - 1;
      }).map(function(k) {
        return { key: k, region: regions[k] };
      }).sort(function(a, b) {
        return a.region.row - b.region.row || (a.key < b.key ? -1 : 1);
      });
    };
    SF.restackRegions = function(regions, key, rows2) {
      var group = SF.regionColumnGroup(regions, key);
      if (!group.length) return null;
      var cursor = 1;
      group.forEach(function(entry) {
        entry.gap = Math.max(0, entry.region.row - cursor);
        cursor = entry.region.row + entry.region.rows;
      });
      if (rows2 != null) regions[key].rows = Math.max(1, Math.round(rows2));
      var row = 1;
      group.forEach(function(entry) {
        row += entry.gap;
        if (entry.region.anchorY) {
          row = Math.max(row, entry.region.row + entry.region.rows);
          return;
        }
        entry.region.row = row;
        row += entry.region.rows;
      });
      var used = row - 1;
      return {
        used,
        budget: LATTICE.rows,
        over: Math.max(0, used - LATTICE.rows),
        moved: group.filter(function(e) {
          return !e.region.anchorY;
        }).length
      };
    };
    function paintBand(node) {
      var cs = getComputedStyle(node);
      if (cs.position === "static") return [2, 0];
      var z = cs.zIndex === "auto" ? null : Number(cs.zIndex);
      if (z == null || z === 0 || !Number.isFinite(z)) return [3, 0];
      return z < 0 ? [1, z] : [4, z];
    }
    function isStackingContext(node) {
      var cs = getComputedStyle(node);
      if (cs.position === "fixed" || cs.position === "sticky") return true;
      if (cs.position !== "static" && cs.zIndex !== "auto") return true;
      if (parseFloat(cs.opacity) < 1) return true;
      if (cs.transform !== "none" || cs.filter !== "none" || cs.perspective !== "none") return true;
      if (cs.isolation === "isolate" || cs.mixBlendMode !== "normal") return true;
      if (/paint|layout|strict|content/.test(cs.contain || "")) return true;
      return /transform|opacity|filter/.test(cs.willChange || "");
    }
    function orderDecider(node, stop) {
      var decider = node;
      for (var n = node.parentElement; n && n !== stop; n = n.parentElement) {
        if (isStackingContext(n)) decider = n;
      }
      return decider;
    }
    SF.paintsAbove = function(a, b) {
      if (!a || !b || a === b) return false;
      if (a.contains(b)) return false;
      if (b.contains(a)) return true;
      var up = function(n) {
        var out = [];
        for (; n; n = n.parentElement) out.unshift(n);
        return out;
      };
      var ca = up(a), cb = up(b), i = 0;
      while (i < ca.length && i < cb.length && ca[i] === cb[i]) i++;
      var lca = ca[i - 1];
      if (!lca) return false;
      var ba = paintBand(orderDecider(a, lca)), bb = paintBand(orderDecider(b, lca));
      if (ba[0] !== bb[0]) return ba[0] > bb[0];
      if (ba[1] !== bb[1]) return ba[1] > bb[1];
      var sibs = Array.prototype.slice.call(lca.children);
      return sibs.indexOf(ca[i]) > sibs.indexOf(cb[i]);
    };
    var OPAQUE = 0.85;
    SF.occludingArt = function(root) {
      if (!root) return [];
      return Array.prototype.filter.call(
        root.querySelectorAll(".slide-art-img, .theme-art > *"),
        function(n) {
          var cs = getComputedStyle(n);
          if (cs.display === "none" || cs.visibility === "hidden") return false;
          var o = parseFloat(cs.opacity);
          return !(Number.isFinite(o) && o < OPAQUE);
        }
      );
    };
    SF.artOcclusion = function(root, opts) {
      var out = [];
      if (!root) return out;
      var art = SF.occludingArt(root).map(function(n) {
        return { node: n, rect: n.getBoundingClientRect() };
      }).filter(function(a) {
        return a.rect.width > 2 && a.rect.height > 2;
      });
      if (!art.length) return out;
      var floor = opts && opts.floor || 0.15;
      var pad = root.querySelector(".pad") || root;
      Array.prototype.forEach.call(pad.querySelectorAll("[data-content-key]"), function(block) {
        var said = (block.textContent || "").trim();
        if (!said) return;
        var runs = [];
        var walk = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        var t;
        while (t = walk.nextNode()) {
          if (!(t.textContent || "").trim()) continue;
          var range = document.createRange();
          range.selectNodeContents(t);
          Array.prototype.forEach.call(range.getClientRects(), function(r) {
            if (r.width > 1 && r.height > 1) runs.push(r);
          });
        }
        if (!runs.length) return;
        var above = art.filter(function(a) {
          return SF.paintsAbove(a.node, block);
        });
        if (!above.length) return;
        var area = 0, hidden = 0;
        var blamed = [];
        runs.forEach(function(r) {
          area += r.width * r.height;
          var worst = 0, name = "";
          above.forEach(function(a) {
            var w = Math.min(a.rect.right, r.right) - Math.max(a.rect.left, r.left);
            var h = Math.min(a.rect.bottom, r.bottom) - Math.max(a.rect.top, r.top);
            if (w <= 0 || h <= 0 || w * h <= worst) return;
            worst = w * h;
            name = a.node.getAttribute("data-art-key") || a.node.getAttribute("data-art-pic") || "artwork";
          });
          hidden += worst;
          if (name) blamed.push(name);
        });
        if (!area || hidden / area < floor) return;
        out.push({
          key: block.getAttribute("data-content-key"),
          text: said.slice(0, 100),
          pct: Math.round(hidden / area * 1e3) / 10,
          by: blamed[0] || "artwork"
        });
      });
      return out;
    };
    SF.linesFor = function(px) {
      var tol = SF.FIT_TOLERANCE == null ? 1 : SF.FIT_TOLERANCE;
      return Math.max(1, Math.ceil((px - tol) / LATTICE.stepY));
    };
    SF.linesNeeded = function(slot) {
      var node = slot.firstElementChild;
      if (!node) return null;
      var pos = getComputedStyle(node).position;
      if (pos === "absolute" || pos === "fixed") return null;
      return SF.linesFor(node.scrollHeight);
    };
    SF.latticeFit = function(root) {
      var out = [];
      if (!root) return out;
      root.querySelectorAll(".sf-slot").forEach(function(slot) {
        var parts = (slot.getAttribute("data-region") || "").split(",");
        var have = Number(parts[2]) || Math.max(1, Math.round(slot.clientHeight / LATTICE.stepY));
        var need = SF.linesNeeded(slot);
        if (need != null && root.classList.contains("sf-hf-managed")) {
          need = Math.max(1, Math.ceil((slot.firstElementChild.scrollHeight - 1) / SF.latticeGeometry(root).stepY));
        }
        var node = slot.firstElementChild;
        var wide = need != null && !!node && node.scrollWidth > slot.clientWidth + 1;
        var over = need != null && (need > have || wide);
        slot.setAttribute("data-fit", over ? "over" : "ok");
        if (need != null) slot.setAttribute("data-need", String(need));
        out.push({
          key: slot.getAttribute("data-block-key"),
          need,
          have,
          wide,
          over
        });
      });
      return out;
    };
  }

  // src/presenter/window.js
  function createPresenterWindow(SF, helpers) {
    const { Player, els, showHud, toast, toggleSoloFeedback } = helpers;
    var presenterWin = null;
    var ROOM_VIEW_WIRE = { hidden: "hidden", rail: "beside", focus: "full" };
    var requestedPresenterPanel = null;
    var PRESENTER_BUS = "slideforge.presenter.v1";
    var presenterBus = null;
    Player.hasPresenter = function() {
      return !!(presenterWin && !presenterWin.closed);
    };
    function presenterChannel() {
      if (presenterBus) return presenterBus;
      if (typeof BroadcastChannel === "undefined") return null;
      try {
        presenterBus = new BroadcastChannel(PRESENTER_BUS);
      } catch (e) {
        return null;
      }
      presenterBus.onmessage = function(ev) {
        var d = ev.data;
        if (!d || d.type !== "sf-presenter-cmd") return;
        handlePresenterCommand(d, null);
      };
      return presenterBus;
    }
    function postPresenter(payload, sourceWin) {
      if (sourceWin) {
        try {
          sourceWin.postMessage(payload, location.origin);
        } catch (e) {
        }
        return;
      }
      if (presenterWin && !presenterWin.closed) {
        try {
          presenterWin.postMessage(payload, location.origin);
        } catch (e) {
        }
      }
      var ch = presenterChannel();
      if (ch) {
        try {
          ch.postMessage(payload);
        } catch (e) {
        }
      }
    }
    function screenBox() {
      var scr = typeof screen !== "undefined" && screen ? screen : {};
      return {
        w: Math.max(1100, Number(scr.availWidth) || 1280),
        h: Math.max(680, Number(scr.availHeight) || 800),
        x: typeof scr.availLeft === "number" ? scr.availLeft : 0,
        y: typeof scr.availTop === "number" ? scr.availTop : 0
      };
    }
    function presenterWindowFeatures() {
      var box2 = screenBox();
      var editorX = window.screenX || window.screenLeft || 0;
      var left = box2.x;
      if (editorX > 80 && box2.x === 0) left = 0;
      return "popup=yes,width=" + box2.w + ",height=" + box2.h + ",left=" + left + ",top=" + box2.y + ",menubar=no,toolbar=no,location=no,status=no";
    }
    function placePresenterWindow(win) {
      if (!win || win.closed) return;
      function apply(left, top, w, h) {
        try {
          if (typeof win.moveTo === "function") win.moveTo(left, top);
        } catch (e) {
        }
        try {
          if (typeof win.resizeTo === "function") win.resizeTo(w, h);
        } catch (e) {
        }
        try {
          if (typeof win.focus === "function") win.focus();
        } catch (e) {
        }
      }
      var box2 = screenBox();
      var getDetails = (
        /** @type {{ getScreenDetails?: function(): Promise<any> }} */
        window.getScreenDetails
      );
      if (typeof getDetails !== "function") {
        apply(box2.x, box2.y, box2.w, box2.h);
        return;
      }
      var pending;
      try {
        pending = getDetails.call(window);
      } catch (e) {
        apply(box2.x, box2.y, box2.w, box2.h);
        return;
      }
      Promise.resolve(pending).then(function(details) {
        if (!win || win.closed) return;
        var screens = details && details.screens || [];
        var current = details && details.currentScreen;
        var other = null;
        for (var i = 0; i < screens.length; i++) {
          var s = screens[i];
          if (!current || s.left !== current.left || s.top !== current.top) {
            other = s;
            break;
          }
        }
        var target = other || current;
        if (!target) {
          apply(box2.x, box2.y, box2.w, box2.h);
          return;
        }
        apply(
          typeof target.availLeft === "number" ? target.availLeft : target.left,
          typeof target.availTop === "number" ? target.availTop : target.top,
          target.availWidth || target.width || box2.w,
          target.availHeight || target.height || box2.h
        );
      }).catch(function() {
        apply(box2.x, box2.y, box2.w, box2.h);
      });
    }
    Player.openPresenter = function(panel) {
      if (typeof panel === "string") requestedPresenterPanel = panel;
      presenterChannel();
      if (presenterWin && !presenterWin.closed) {
        presenterWin.focus();
        syncPresenter();
        return presenterWin;
      }
      presenterWin = window.open("presenter.html", "sf_presenter", presenterWindowFeatures());
      if (!presenterWin || presenterWin.closed) {
        presenterWin = null;
        toast("Teacher Presenter needs a pop-up window. Allow pop-ups for this page, then try again.");
        return null;
      }
      placePresenterWindow(presenterWin);
      setTimeout(syncPresenter, 500);
      return presenterWin;
    };
    function closePresenter() {
      if (presenterWin && !presenterWin.closed) presenterWin.close();
      presenterWin = null;
    }
    function wallOverlayMarkup() {
      if (typeof document === "undefined") return null;
      var card = document.getElementById("joincard");
      if (card && card.classList.contains("on")) {
        var body = card.firstElementChild || card;
        var join = document.createElement("div");
        join.className = "desk-join-mirror";
        join.appendChild(body.cloneNode(true));
        var dismiss = join.querySelector(".dismiss");
        if (dismiss) dismiss.textContent = "On the wall — J or Esc to dismiss";
        return join.outerHTML;
      }
      if (!Player._focus || !els.viewport()) return null;
      var node = els.viewport().querySelector("[data-overlay]");
      if (!node) return null;
      var copy = node.cloneNode(true);
      copy.classList.remove("entering", "tr-fade");
      copy.removeAttribute("data-overlay");
      copy.removeAttribute("style");
      return copy.outerHTML;
    }
    function wallRailMarkup() {
      if (!Player._rail || Player._focus) return null;
      var card = document.getElementById("joincard");
      if (card && card.classList.contains("on")) return null;
      var copy = Player._rail.cloneNode(true);
      copy.classList.add("desk-wall-rail");
      copy.removeAttribute("style");
      return copy.outerHTML;
    }
    function syncPresenter() {
      var deck = Player.deck;
      if (!deck) return;
      if (presenterWin && presenterWin.closed) presenterWin = null;
      if ((!presenterWin || presenterWin.closed) && !presenterChannel()) return;
      try {
        var payload = {
          type: "sf-presenter-state",
          teacherUrl: SF.Live && SF.Live.teacherWorkspaceUrl ? SF.Live.teacherWorkspaceUrl() : null,
          requestedPanel: requestedPresenterPanel,
          moment: Player.lessonMoment ? Player.lessonMoment() : null,
          /* The desk shows how many have answered and offers to end it, so it
             needs the poll's own state rather than inferring one from the
             room pulse — which is silent when nobody has replied yet. */
          quizGenBusy: !!Player.quizGenBusy,
          quickPoll: SF.Live && SF.Live.customPromptOpen && SF.Live.customPromptOpen() ? {
            prompt: SF.Live.prompt.prompt,
            kind: SF.Live.prompt.kind,
            presentAs: SF.Live.prompt.presentAs,
            /* What the room is choosing between. The desk used to be told
               the question and the count of replies but never the answers
               on offer, so a teacher running a poll from the desk could see
               that eleven people had voted without being able to see what
               they were voting on — the options were only ever on the wall
               and on the phones. */
            options: (SF.Live.prompt.options || []).slice(),
            /* A scale's options are just '1'..'n'; what the numbers mean is
               in `ends`, and without it "1 to 5" tells a teacher nothing. */
            ends: SF.Live.prompt.ends || null,
            max: SF.Live.prompt.max || 1,
            answered: SF.Live.digest ? SF.Live.digest.answered || 0 : 0,
            players: SF.Live.digest ? SF.Live.digest.players || 0 : (SF.Live.players || []).length,
            live: !!SF.Live.active
          } : null,
          roomPulse: SF.Live && SF.Live.presenterPulse ? SF.Live.presenterPulse() : null,
          deck: Player.spontaneous ? Object.assign({}, deck, { slides: Player.spontaneous.slides, title: Player.spontaneous.title || deck.title }) : deck,
          index: Player.spontaneous ? Player.spontaneous.index : Player.idx,
          lessonIndex: Player.idx,
          spontaneous: Player.spontaneous ? {
            id: Player.spontaneous.id,
            title: Player.spontaneous.title,
            index: Player.spontaneous.index,
            total: Player.spontaneous.slides.length
          } : null,
          answers: Player.answers,
          ...SF.Boards && SF.Boards.snapshot ? SF.Boards.snapshot(Player) : {},
          chainLinks: Player.chainLinks || [],
          chainPending: Player.chainPending || "",
          startedAt: Player.started,
          /* Pending questions travel to presenter view and nowhere else: the
             host's own screen is usually the projected one. */
          qa: Player.qa || null,
          /* Pace and confidence go the same way. The wall gets a count on a
             spike; the detail is for whoever is teaching. */
          pace: Player.pace || null,
          confidence: Player.confidence || null,
          /* What the next press will do, so the private screen can say it in
             words rather than a tooltip nobody hovers mid-lesson. */
          exploreStates: Player.exploreStates || {},
          nextAction: SF.Explore && SF.Explore.nextAction(Player) || (SF.Live && SF.Live.nextAction ? SF.Live.nextAction() : "advance"),
          /* "3 unanswered", "12 waiting" — the cues that tell the host whether
             to wait or move on. Only meaningful live, null otherwise. */
          progress: Player._liveProgress || null,
          revealStep: Player.revealStep || 0,
          effectiveTimeLimit: SF.questionTimeLimit(deck.slides[Player.idx], SF.Live && SF.Live.active && SF.Live.players.some(function(p) {
            return p.manual;
          })),
          waiting: Player.waiting || 0,
          frozen: !!Player.frozen,
          /* Desk mirrors HUD labels — blank wall, room rail, live toggles. */
          blank: !!Player.blank,
          live: !!(SF.Live && SF.Live.active),
          /* Desk chrome shows the PIN without forcing Join QR on the wall. */
          pin: SF.Live && SF.Live.pin || null,
          joinUrl: SF.Live && SF.Live.joinUrl || "",
          reactions: !(SF.Live && SF.Live.reactions === false),
          phonesBlank: !!(SF.Live && SF.Live.phonesBlank),
          blankSoonAt: SF.Live && SF.Live.blankSoonAt || 0,
          /* Who has put the lesson in the background, for this screen only. */
          away: SF.Live && SF.Live.active ? (SF.Live.players || []).filter(function(p) {
            return p.away && p.connected !== false;
          }).map(function(p) {
            return p.name;
          }) : [],
          /* Who is struggling, for this screen only — it used to be printed
             under their name on the wall. See Live.needsHand. */
          needsHand: SF.Live && SF.Live.needsHand ? SF.Live.needsHand() : [],
          /* The stage of a staged activity, so the desk can offer more time. */
          stage: Player.stage || null,
          /* The game's wall controls, offered on the desk (data-desk). */
          gameControls: Player.gameControls ? Player.gameControls() : [],
          floor: SF.Live && SF.Live.floor || "auto",
          /* Legacy tokens on the wire: a desk still open from before the
             rename compares against these. New desks accept either. */
          roomView: ROOM_VIEW_WIRE[Player.roomSidebarState ? Player.roomSidebarState() : "hidden"],
          /* So the desk can show the pen as held, and which tool it is. */
          inkOn: !!(SF.Teaching && SF.Teaching.isOpen && SF.Teaching.isOpen()),
          inkMode: SF.Teaching && SF.Teaching.mode ? SF.Teaching.mode() : "",
          /* The leaderboard, the responses, the race track and the Join QR card
             all cover the wall; the room rail sits beside it. All of them used
             to be invisible from the desk — its preview drew only the slide and
             called itself "On screen now". Send the live markup so the desk
             shows the same thing without leaving Presenter. */
          wallOverlay: wallOverlayMarkup(),
          wallRail: wallRailMarkup(),
          focusOn: !!Player._focus,
          focusKind: SF.Live && SF.Live.active && SF.Live.expandKind ? SF.Live.expandKind() : null,
          pollOpen: !!(SF.Live && SF.Live.customPromptOpen && SF.Live.customPromptOpen()),
          joinCard: (function() {
            if (typeof document === "undefined") return false;
            var card = document.getElementById("joincard");
            return !!(card && card.classList.contains("on"));
          })(),
          fullscreen: typeof document !== "undefined" && !!(document.fullscreenElement || /** @type {any} */
          document.webkitFullscreenElement)
        };
        postPresenter(payload);
        requestedPresenterPanel = null;
      } catch (e) {
      }
    }
    var seenCmds = [];
    function alreadyHandled(d) {
      if (!d || !d.id) return false;
      if (seenCmds.indexOf(d.id) >= 0) return true;
      seenCmds.push(d.id);
      if (seenCmds.length > 60) seenCmds.shift();
      return false;
    }
    function handlePresenterCommand(d, sourceWin) {
      if (!d || d.type !== "sf-presenter-cmd") return;
      if (alreadyHandled(d)) return;
      if (d.cmd === "goto") Player.goTo(d.index);
      else if (d.cmd === "hello") syncPresenter();
      else if (d.cmd === "ink" && d.action && SF.Teaching && SF.Teaching.remote) {
        SF.Teaching.remote(d.action, d);
        if (d.action !== "begin" && d.action !== "move" && d.action !== "end") syncPresenter();
      } else if (SF.Boards && SF.Boards.command && SF.Boards.command(d.cmd, d.action, d.card)) {
      } else if (d.cmd === "moment" && Player.momentCommand) Player.momentCommand(d);
      else if (d.cmd === "quickPoll") Player.quickPoll(d);
      else if (d.cmd === "explore" && SF.Explore) SF.Explore.command(Player, d.action, d.value);
      else if (d.cmd === "quizGen") Player.quizGen(d);
      else if (d.cmd === "activity" && SF.LiveActivities) {
        Promise.resolve().then(function() {
          return SF.LiveActivities.handle(d);
        }).then(function(result) {
          postPresenter({ type: "sf-activity-result", requestId: d.requestId, result }, sourceWin);
        }).catch(function(error) {
          postPresenter({ type: "sf-activity-result", requestId: d.requestId, error: error.message || "Could not complete this activity action." }, sourceWin);
        });
      } else if (d.cmd === "qa") Player.emit("qaCommand", d);
      else if (d.cmd === "gameControl" && Player.pressGameControl) Player.pressGameControl(String(d.id || ""));
      else if (d.cmd === "sharePrep") {
        var doc = null;
        try {
          if (SF.Shell && typeof SF.Shell.lessonDoc === "function") doc = SF.Shell.lessonDoc();
        } catch (e) {
          doc = null;
        }
        if (!doc && Player.deck) doc = Player.deck;
        postPresenter({
          type: "sf-share-prep",
          doc,
          live: !!(SF.Live && SF.Live.active)
        }, sourceWin);
      } else if (d.cmd === "shareWatch") {
        var ok = !!(SF.Live && SF.Live.watchOn && SF.Live.watchOn(d.id));
        postPresenter({ type: "sf-share-watch", ok, id: d.id || null }, sourceWin);
      } else if (typeof Player.control === "function") Player.control(d.cmd);
    }
    Player.syncPresenter = syncPresenter;
    window.addEventListener("message", function(ev) {
      var d = ev.data;
      if (ev.origin !== location.origin || !d || d.type !== "sf-presenter-cmd") return;
      if (presenterWin && ev.source !== presenterWin) return;
      handlePresenterCommand(d, ev.source);
    });
    Player.quickPoll = function(d) {
      d = d || {};
      if (!SF.Live) return false;
      if (d.action === "end") return SF.Live.endCustomPrompt();
      if (d.action === "where") {
        if (!SF.Live.customPromptOpen || !SF.Live.customPromptOpen()) return false;
        SF.Live.setPromptPresentAs(d.presentAs === "rail" ? "rail" : "focus");
        syncPresenter();
        return true;
      }
      if (d.action === "join") {
        Player.emit("joinToggle", {});
        return true;
      }
      return SF.Live.startCustomPrompt(d);
    };
    Player.quizGen = function(d) {
      d = d || {};
      if (!Player.open || !Player.deck) return Promise.resolve({ error: "Nothing is being presented." });
      if (!SF.AI || !SF.AI.generateQuestionsForGame || !SF.createPresetGame) {
        return Promise.resolve({ error: "The AI engine is not loaded." });
      }
      var topic = String(d.topic || "").trim();
      if (!topic) return Promise.resolve({ error: "Give it a theme to write about." });
      var style = d.style || "choice";
      var game = SF.createPresetGame(style, { title: topic }, Player.deck.theme);
      game.questions = [];
      Player.quizGenBusy = true;
      syncPresenter();
      return Promise.resolve(SF.AI.generateQuestionsForGame(game, {
        topic,
        notes: d.keywords,
        count: d.count
      })).then(function(res) {
        Player.quizGenBusy = false;
        if (!res || res.error) {
          syncPresenter();
          return res || { error: "Nothing came back." };
        }
        game.questions = res.questions;
        if (SF.GameStore) SF.GameStore.save(game);
        game.settings.howTo = false;
        var slides = SF.compileGame(game, { intro: false, scoreSlide: false });
        if (!slides.length) {
          syncPresenter();
          return { error: "Nothing to show." };
        }
        Player.openSpontaneous({
          id: game.id || SF.uid(),
          title: topic,
          slides,
          game
        });
        syncPresenter();
        return { added: slides.length, rejected: res.rejected, gameId: game.id, overlay: true };
      }).catch(function() {
        Player.quizGenBusy = false;
        syncPresenter();
        return { error: "Could not write a quiz just now." };
      });
    };
    var jumpDigits = "";
    var jumpTimer = null;
    function clearJump() {
      jumpDigits = "";
      clearTimeout(jumpTimer);
      jumpTimer = null;
    }
    function goToTyped() {
      var n = parseInt(jumpDigits, 10);
      clearJump();
      var count = Player.deck ? Player.deck.slides.length : 0;
      if (n >= 1 && n <= count) Player.goTo(n - 1, n - 1 >= Player.idx ? 1 : -1);
      else toast("There is no slide " + n + " — this show has " + count);
      showHud();
    }
    document.addEventListener("keydown", function(e) {
      if (!Player.open) return;
      var target = (
        /** @type {Element | null} */
        e.target
      );
      var k = e.key;
      if (target && target.closest("input,textarea,select,[contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey && k !== "f" && k !== "F") return;
      if (k === "Enter" && jumpDigits && !Player.shareMode && Player.deck) {
        e.preventDefault();
        goToTyped();
        return;
      }
      if (target && target.closest("button,a") && (k === "Enter" || k === " ")) return;
      if (Player.shareMode) {
        switch (k) {
          case "ArrowRight":
          case "ArrowDown":
          case " ":
          case "PageDown":
          case "Enter":
          case "n":
            e.preventDefault();
            Player.next();
            break;
          case "ArrowLeft":
          case "ArrowUp":
          case "PageUp":
          case "p":
            e.preventDefault();
            Player.prev();
            break;
          case "Home":
            e.preventDefault();
            Player.goTo(0, -1);
            break;
          case "End":
            e.preventDefault();
            if (Player.deck) Player.goTo(Player.deck.slides.length - 1, 1);
            break;
          case "f":
          case "F":
            e.preventDefault();
            Player.control("full");
            break;
          case "Escape":
            e.preventDefault();
            break;
          default:
            break;
        }
        showHud();
        return;
      }
      if ((k === "f" || k === "F") && e.altKey) {
        e.preventDefault();
        Player.control("freeze");
        showHud();
        return;
      }
      if ((k === "+" || k === "=") && SF.Stages && SF.Stages.active) {
        e.preventDefault();
        Player.control("stageMore");
        showHud();
        return;
      }
      var hudMore = document.getElementById("hudMore");
      if (k === "Escape" && hudMore && !hudMore.hidden) {
        e.preventDefault();
        hudMore.hidden = true;
        var moreBtn = els.hud() && els.hud().querySelector("[data-act=more]");
        if (moreBtn) moreBtn.setAttribute("aria-expanded", "false");
        return;
      }
      if (!Player.shareMode && !Player.spontaneous && Player.deck) {
        if (/^[0-9]$/.test(k)) {
          var onWall = Player.wallSlide();
          var answering = !jumpDigits && /^[1-6]$/.test(k) && !(SF.Live && SF.Live.active) && onWall && onWall.type === "quiz" && Player.answers[onWall.id] == null;
          if (!answering && (jumpDigits || k !== "0")) {
            e.preventDefault();
            jumpDigits = (jumpDigits + k).slice(0, 4);
            clearTimeout(jumpTimer);
            jumpTimer = setTimeout(clearJump, 2500);
            toast("Go to slide " + jumpDigits + " — press Enter");
            return;
          }
        } else if (k === "Escape" && jumpDigits) {
          e.preventDefault();
          clearJump();
          return;
        } else if (k === "Backspace" && jumpDigits) {
          e.preventDefault();
          jumpDigits = jumpDigits.slice(0, -1);
          if (jumpDigits) toast("Go to slide " + jumpDigits + " — press Enter");
          else clearJump();
          return;
        }
      }
      if (els.cheats() && els.cheats().classList.contains("on") && k !== "?" && k !== "/") {
        els.cheats().classList.remove("on");
        if (k === "Escape") {
          e.preventDefault();
          return;
        }
      }
      if (!Player.deck) return;
      var live = Player.wallSlide();
      if (!(SF.Live && SF.Live.active) && live && live.type === "quiz" && Player.answers[live.id] == null && /^[a-f]$/i.test(k)) {
        var pick = SF.LETTERS.indexOf(k.toUpperCase());
        if (pick > -1 && pick < live.options.length) {
          e.preventDefault();
          Player.answer(pick);
          showHud();
          return;
        }
      }
      switch (k) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "PageDown":
        case "Enter":
        case "n":
          e.preventDefault();
          Player.next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
        case "p":
          e.preventDefault();
          Player.prev();
          break;
        case "Home":
          e.preventDefault();
          Player.goTo(0, -1);
          break;
        case "End":
          e.preventDefault();
          if (Player.deck) Player.goTo(Player.deck.slides.length - 1, 1);
          break;
        case "v":
        case "V":
          e.preventDefault();
          Player.control("poll");
          break;
        case "Escape":
          e.preventDefault();
          var jc = document.getElementById("joincard");
          if (jc && jc.classList.contains("on")) {
            Player.emit("joinToggle", { close: true });
          } else if (Player._focus) {
            if (SF.Live && SF.Live.active) Player.emit("focusToggle", { close: true });
            else toggleSoloFeedback({ close: true });
          } else if (SF.Teaching && SF.Teaching.isOpen && SF.Teaching.isOpen()) {
            SF.Teaching.toggleBar(false);
          } else if (Player.spontaneous) {
            Player.endSpontaneous();
          } else {
            Player.close();
          }
          break;
        /* B and . blank the wall; Shift+B blanks the phones. Two screens, two
           blanks, and one case for the letter — a switch cannot hold two
           `case 'B'`, because the first one wins and the second is dead code.
           It did: Shift+B blanked the wall and the phones could not be blanked
           at all. Caps Lock sends 'B' with shiftKey false, so the wall is the
           default rather than the shifted branch. */
        case "b":
        case "B":
        case ".":
          e.preventDefault();
          if (e.shiftKey) Player.emit("blankPhonesToggle", {});
          else Player.control("blank");
          break;
        case "f":
        case "F":
          e.preventDefault();
          Player.control("full");
          break;
        case "r":
        case "R":
          e.preventDefault();
          Player.resetScores();
          break;
        case "d":
        case "D":
          e.preventDefault();
          Player.control("presenter");
          break;
        case "e":
        case "E":
          e.preventDefault();
          Player.control("focus");
          break;
        case "s":
        case "S":
          e.preventDefault();
          Player.control("rail");
          break;
        case "j":
        case "J":
          e.preventDefault();
          Player.control("join");
          break;
        /* T for thumbs. A live control rather than a setting, because switching
           reactions off matters in the moment they are being abused. */
        case "t":
        case "T":
          e.preventDefault();
          Player.emit("reactionsToggle", {});
          break;
        case "H":
          if (e.shiftKey) {
            e.preventDefault();
            Player.emit("floorCycle", {});
          }
          break;
        case "w":
        case "W":
          e.preventDefault();
          Player.control("who");
          break;
        /* I opens the pen, not P — P is already Previous, and a pen that also
           went back a slide would be found the hard way. X clears the ink,
           which is the one thing that has to work without looking. */
        case "i":
        case "I":
          e.preventDefault();
          Player.control("ink");
          break;
        case "z":
        case "Z":
          e.preventDefault();
          if (SF.Teaching && SF.Teaching.isOpen && SF.Teaching.isOpen()) {
            SF.Teaching.undo();
          } else {
            Player.control("freeze");
          }
          break;
        case "x":
        case "X":
          e.preventDefault();
          if (SF.Teaching) SF.Teaching.clear();
          break;
        case "o":
        case "O":
          e.preventDefault();
          if (Player.toggleOverview) Player.toggleOverview();
          break;
        case "?":
        case "/":
          e.preventDefault();
          if (els.cheats()) els.cheats().classList.toggle("on");
          break;
        default:
          if (!(SF.Live && SF.Live.active) && /^[1-6]$/.test(k)) {
            e.preventDefault();
            Player.answer(Number(k) - 1);
          }
      }
      showHud();
    });
    return {
      syncPresenter,
      presenterChannel,
      closePresenter,
      /* The live handle, not a copy: js/player.js focuses this window and asks
         whether the teacher has closed it. */
      win: function() {
        return presenterWin;
      }
    };
  }

  // src/editor/deck-settings.js
  function createDeckSettings(SF, helpers) {
    const { $, el, current, touched, draw, pick, select } = helpers;
    function openDeckSettings() {
      var deck = helpers.deck(), UI = helpers.UI(), ws = helpers.ws();
      var body = $("settingsBody");
      var title = $("settingsTitle");
      if (title) title.textContent = "Presentation settings";
      if (!body) return;
      var bodyEl = body;
      function draw2() {
        bodyEl.innerHTML = "";
        bodyEl.appendChild(UI.field("Theme", SF.Shell.themePicker(deck.theme, function(v) {
          ws.onTheme(v);
          draw2();
        }), "Sets the default colours for the presentation. Customise this slide can override text and background colours."));
        drawLogoFields(bodyEl, draw2);
        drawAspect(bodyEl, draw2);
        drawNumbers(bodyEl);
        drawEnding(bodyEl, draw2);
        drawAiSettings(bodyEl, draw2);
        drawReadiness(bodyEl);
      }
      draw2();
      SF.Shell.openModal("settingsModal", function() {
        SF.Store.save(deck);
        draw();
      });
    }
    function drawAspect(body, draw2) {
      var deck = helpers.deck(), UI = helpers.UI();
      var current2 = SF.ASPECTS && SF.ASPECTS[deck.aspect] ? deck.aspect : "16:9";
      var opts = Object.keys(SF.ASPECTS || { "16:9": 1 }).map(function(k) {
        return { value: k, label: SF.ASPECTS[k].label };
      });
      body.appendChild(UI.field(
        "Slide shape",
        UI.select(opts, current2, function(v) {
          deck.aspect = v;
          touched();
          draw2();
          draw();
        }),
        current2 === "16:9" ? "What most projectors and every laptop want." : "Slides keep their width and gain height, so nothing you have written moves — there is simply more room under it. Check a busy slide before you teach."
      ));
    }
    function drawNumbers(body) {
      var deck = helpers.deck(), UI = helpers.UI();
      var box2 = el("div");
      box2.appendChild(UI.check("Show slide numbers", deck.showSlideNumbers !== false, function(v) {
        deck.showSlideNumbers = v;
        touched();
        draw();
      }));
      box2.appendChild(el("div", "hint", "A small counter in the corner of every slide but the title, on the projector and in the shared link."));
      body.appendChild(UI.field("Slide numbers", box2));
    }
    function drawEnding(body, draw2) {
      var deck = helpers.deck(), UI = helpers.UI();
      var games = deck.slides.filter(function(s) {
        return s.type === "game";
      });
      if (!games.length) return;
      var box2 = el("div");
      box2.appendChild(UI.check("Finish on the final scores", deck.finalScores === true, function(v) {
        deck.finalScores = v;
        touched();
        draw2();
        draw();
      }));
      box2.appendChild(el("div", "hint", games.length === 1 ? "Adds one scoreboard after your last slide, covering the whole lesson." : "Adds one scoreboard after your last slide, adding up all " + games.length + " games rather than showing each in turn."));
      body.appendChild(UI.field(
        "How the lesson ends",
        box2,
        deck.finalScores ? "Your own last slide still plays; the scores come after it." : "Off, so the lesson ends on the slide you wrote."
      ));
    }
    function drawAiSettings(body, draw2) {
      var UI = helpers.UI();
      var box2 = el("div", "ai-settings-box");
      var badge = el("div", "ai-badge");
      badge.style.marginBottom = "8px";
      badge.style.fontSize = "13px";
      badge.style.fontWeight = "600";
      box2.appendChild(badge);
      var note = el("div", "hint", "");
      note.style.marginTop = "6px";
      box2.appendChild(note);
      function paint(live) {
        badge.textContent = live ? "● Live AI active — generated on this server" : "○ Smart pedagogical heuristics active (no setup needed)";
        badge.style.color = live ? "var(--s-accent, #38bdf8)" : "var(--s-dim, #94a3b8)";
        note.textContent = live ? "Suggestions are generated by this SlideForge server, which holds the API key. Nothing is sent from this browser to the AI provider, and the key is never loaded into the page." : "Instant polls and checks work with no setup, from the wording on your slide. For generated questions and distractors, set GEMINI_API_KEY in the environment of the server running SlideForge, then restart it.";
      }
      paint(!!(SF.AI && SF.AI.liveAIKnown && SF.AI.liveAIKnown()));
      if (SF.AI && SF.AI.checkLiveAI) SF.AI.checkLiveAI().then(paint);
      var actions = el("div", "ai-smoke-actions");
      actions.style.marginTop = "10px";
      actions.appendChild(UI.button("Open AI smoke test…", "primary", function() {
        openAiSmokeTest();
      }));
      box2.appendChild(actions);
      box2.appendChild(el(
        "div",
        "hint",
        "Checks /api/ai/status and runs one small generate call. Use it before class to confirm the key and model are live."
      ));
      body.appendChild(UI.field("AI assistance", box2));
    }
    function openAiSmokeTest() {
      var UI = helpers.UI();
      var body = $("settingsBody");
      var title = $("settingsTitle");
      if (title) title.textContent = "AI smoke test";
      if (!body) return;
      var bodyEl = body;
      var pollTimer = null;
      var inFlight = false;
      function stopPoll() {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }
      function line(logEl, kind, msg) {
        var row = el("div", "ai-smoke-line ai-smoke-" + (kind || "info"));
        var stamp = /* @__PURE__ */ new Date();
        var hh = String(stamp.getHours()).padStart(2, "0");
        var mm = String(stamp.getMinutes()).padStart(2, "0");
        var ss = String(stamp.getSeconds()).padStart(2, "0");
        row.appendChild(el("span", "ai-smoke-time", hh + ":" + mm + ":" + ss));
        row.appendChild(el("span", "ai-smoke-msg", msg));
        logEl.insertBefore(row, logEl.firstChild);
        while (logEl.children.length > 40) logEl.removeChild(logEl.lastChild);
      }
      function paintStatus(card, s) {
        card.innerHTML = "";
        var live = !!(s && s.available);
        var badge = el("div", "ai-badge");
        badge.style.fontSize = "13px";
        badge.style.fontWeight = "600";
        badge.style.color = live ? "var(--s-accent, #38bdf8)" : "var(--s-dim, #94a3b8)";
        badge.textContent = live ? "● AI is live" : "○ AI offline (heuristics only)";
        card.appendChild(badge);
        var dl = el("div", "ai-smoke-meta");
        function meta(k, v) {
          var row = el("div", "ai-smoke-meta-row");
          row.appendChild(el("span", "ai-smoke-k", k));
          row.appendChild(el("span", "ai-smoke-v", v == null || v === "" ? "—" : String(v)));
          dl.appendChild(row);
        }
        meta("Origin", s && s.origin);
        meta("Model", s && s.model);
        meta("Available", s ? String(!!s.available) : "—");
        meta("HTTP", s && s.httpStatus ? String(s.httpStatus) : "—");
        meta("Probe", s && s.ms != null ? s.ms + " ms" : "—");
        meta("lastError", s && s.lastError != null ? String(s.lastError) : "none");
        if (s && s.error) meta("Error", s.error);
        meta("Checked", s && s.at ? s.at.replace("T", " ").replace(/\.\d+Z$/, " Z") : "—");
        card.appendChild(dl);
      }
      function refreshStatus(card, logEl, quiet) {
        if (!SF.AI || !SF.AI.probeStatus) {
          if (!quiet) line(logEl, "fail", "SF.AI.probeStatus is missing in this build.");
          return Promise.resolve(null);
        }
        return SF.AI.probeStatus().then(function(s) {
          paintStatus(card, s);
          if (!quiet) {
            line(
              logEl,
              s.available ? "ok" : "warn",
              s.available ? "Status OK — " + (s.model || "model?") + " in " + s.ms + " ms" : "Status offline" + (s.error ? ": " + s.error : "") + (s.lastError != null ? " (lastError " + s.lastError + ")" : "") + " · " + s.ms + " ms"
            );
          }
          return s;
        });
      }
      function drawPanel() {
        bodyEl.innerHTML = "";
        var intro = el(
          "div",
          "hint",
          "Realtime check of this deployment’s AI. Status refreshes every few seconds while this panel is open. Run the generate test once before class."
        );
        intro.style.marginBottom = "12px";
        bodyEl.appendChild(intro);
        var statusCard = el("div", "ai-smoke-card");
        bodyEl.appendChild(UI.field("Live status", statusCard));
        var topicBox = el("div");
        var topicInput = UI.text("SlideForge", null, "Topic for the smoke reply");
        topicBox.appendChild(topicInput);
        bodyEl.appendChild(UI.field(
          "Generate topic",
          topicBox,
          "Sent in a tiny fixed prompt. Does not touch your lesson."
        ));
        var logEl = el("div", "ai-smoke-log");
        bodyEl.appendChild(UI.field("Event log", logEl));
        var resultEl = el("pre", "ai-smoke-result");
        resultEl.textContent = "Generate result will appear here.";
        bodyEl.appendChild(UI.field("Last generate", resultEl));
        var row = el("div", "ai-smoke-actions");
        var btnRefresh = UI.button("Refresh status", "ghost", function() {
          refreshStatus(statusCard, logEl, false);
        });
        var btnRun = UI.button("Run generate test", "primary", function() {
          if (inFlight) {
            line(logEl, "warn", "Already running a generate test.");
            return;
          }
          inFlight = true;
          btnRun.disabled = true;
          btnRun.textContent = "Generating…";
          line(logEl, "info", "POST /api/ai/generate…");
          var topic = topicInput.value || "SlideForge";
          (SF.AI && SF.AI.runSmokeTest ? SF.AI.runSmokeTest({ topic }) : Promise.resolve({ ok: false, error: "SF.AI.runSmokeTest missing", ms: 0, httpStatus: 0, text: null, parsed: null })).then(function(r) {
            if (r.ok) {
              line(logEl, "ok", "Generate OK in " + r.ms + " ms (HTTP " + r.httpStatus + ")");
              SF.toast("AI smoke test passed — " + r.ms + " ms");
            } else {
              line(
                logEl,
                "fail",
                "Generate failed" + (r.httpStatus ? " HTTP " + r.httpStatus : "") + (r.error ? ": " + r.error : "") + " · " + r.ms + " ms"
              );
              SF.toast("AI smoke test failed" + (r.error ? ": " + r.error : ""));
            }
            try {
              resultEl.textContent = JSON.stringify({
                ok: r.ok,
                httpStatus: r.httpStatus,
                ms: r.ms,
                error: r.error,
                parsed: r.parsed,
                text: r.text
              }, null, 2);
            } catch (e) {
              resultEl.textContent = String(r && r.text || r && r.error || e);
            }
            return refreshStatus(statusCard, logEl, true);
          }).finally(function() {
            inFlight = false;
            btnRun.disabled = false;
            btnRun.textContent = "Run generate test";
          });
        });
        var btnBack = UI.button("← Presentation settings", "ghost", function() {
          stopPoll();
          openDeckSettings();
        });
        row.appendChild(btnRun);
        row.appendChild(btnRefresh);
        row.appendChild(btnBack);
        bodyEl.appendChild(row);
        line(logEl, "info", "Panel open — probing status…");
        refreshStatus(statusCard, logEl, false);
        stopPoll();
        pollTimer = setInterval(function() {
          refreshStatus(statusCard, logEl, true);
        }, 4e3);
      }
      drawPanel();
      SF.Shell.openModal("settingsModal", function() {
        stopPoll();
      });
    }
    function drawReadiness(insp) {
      var deck = helpers.deck(), UI = helpers.UI();
      var r = SF.readiness(deck, function(id) {
        return SF.GameStore.get(id);
      });
      var box2 = el("div", "ready-box");
      if (!r.items.length) {
        box2.appendChild(el("div", "ready-ok", "✓ Nothing to fix. Every slide has something on it and no media is missing."));
        insp.appendChild(UI.field("Ready to teach", box2));
        return;
      }
      r.items.forEach(function(f) {
        var row = el("button", "ready-row ready-" + f.level);
        row.type = "button";
        row.appendChild(el("span", "ready-dot", f.level === "stop" ? "!" : "?"));
        var t = el("span", "ready-text");
        t.appendChild(el("strong", null, f.title));
        t.appendChild(el("span", null, " " + f.detail));
        row.appendChild(t);
        if (f.slide != null) {
          row.title = "Go to slide " + (f.slide + 1);
          row.onclick = function() {
            select(f.slide);
            var close = (
              /** @type {HTMLElement|null} */
              document.querySelector("#settingsModal [data-close]")
            );
            if (close) close.click();
          };
        } else {
          row.disabled = true;
        }
        box2.appendChild(row);
      });
      insp.appendChild(UI.field(
        "Ready to teach",
        box2,
        r.stop ? r.stop + (r.stop === 1 ? " thing will" : " things will") + " visibly fail in front of a class." : "Nothing will break. The rest depends on the room you are in."
      ));
    }
    function drawLogoFields(insp, redraw) {
      var deck = helpers.deck(), UI = helpers.UI();
      var wrap = el("div", "logo-fields");
      if (deck.logo) {
        var preview = el("div", "logo-preview");
        var img = document.createElement("img");
        img.src = deck.logo;
        img.alt = "Lesson logo";
        preview.appendChild(img);
        var clear = UI.button("Remove logo", "ghost", function() {
          deck.logo = "";
          deck.logoOn = "none";
          touched();
          if (redraw) redraw();
          else draw();
        });
        preview.appendChild(clear);
        wrap.appendChild(preview);
      }
      var pick2 = el("input");
      pick2.type = "file";
      pick2.accept = "image/png,image/jpeg,image/svg+xml,image/webp,image/gif";
      pick2.style.fontSize = "12px";
      pick2.addEventListener("change", function() {
        var f = pick2.files && pick2.files[0];
        if (!f) return;
        if (f.size > 1.5 * 1024 * 1024) {
          SF.toast("That file is " + (f.size / 1024 / 1024).toFixed(1) + " MB. Logos have to stay under 1.5 MB, or the lesson outgrows the browser storage it is saved in.");
          pick2.value = "";
          return;
        }
        var fr = new FileReader();
        fr.onerror = function() {
          SF.toast("That file could not be read.");
        };
        fr.onload = function() {
          if (typeof fr.result !== "string") return;
          var dataUrl = fr.result;
          var test = new Image();
          test.onload = function() {
            deck.logo = dataUrl;
            if (deck.logoOn === "none") deck.logoOn = "all";
            touched();
            if (redraw) redraw();
            else draw();
          };
          test.onerror = function() {
            SF.toast("That file is named like an image but the browser cannot draw it, so it would leave an empty corner. Try a PNG or SVG.");
            pick2.value = "";
          };
          test.src = dataUrl;
        };
        fr.readAsDataURL(f);
      });
      wrap.appendChild(pick2);
      insp.appendChild(UI.field(
        "Lesson logo",
        wrap,
        "Corner mark on slides. PNG or SVG works best."
      ));
      var url = UI.text("", function() {
      }, "https://…");
      insp.appendChild(UI.field("Or use a logo image URL", url));
      insp.appendChild(UI.button("Use logo URL", "ghost", function() {
        var src = SF.safeHref(url.value);
        if (!src) {
          SF.toast("Enter an http or https image URL");
          return;
        }
        var image = new Image();
        image.onload = function() {
          deck.logo = src;
          if (deck.logoOn === "none") deck.logoOn = "all";
          touched();
          if (redraw) redraw();
          else draw();
        };
        image.onerror = function() {
          SF.toast("Could not load that image. Check the URL or upload a file.");
        };
        image.src = src;
      }));
      if (!deck.logo) return;
      var managed = !!(deck.headerFooter && deck.headerFooter.enabled);
      if (managed) {
        insp.appendChild(el(
          "p",
          "hint",
          "Header and footer slots are on, so they decide where this logo sits and how big it is. Put it in a slot from Header & footer in the slide panel."
        ));
      }
      if (!managed) insp.appendChild(UI.field("Logo size", UI.select([{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }], deck.logoSize || "medium", function(v) {
        deck.logoSize = v;
        touched();
        if (redraw) redraw();
        else draw();
      })));
      insp.appendChild(UI.field(
        "Organisation",
        UI.text(deck.org || "", function(v) {
          deck.org = v.trim();
          touched();
          if (redraw) redraw();
          else draw();
        }, "Northeastern University London"),
        "Printed by themes that carry an institution line — on this theme, across the top of section slides. Leave it empty and nothing is printed."
      ));
      insp.appendChild(UI.field(
        "On dark slides",
        UI.select(
          [
            { value: "auto", label: "Let the theme decide" },
            { value: "always", label: "Always show the logo white" },
            { value: "never", label: "Never change it — my logo is already light" }
          ],
          deck.logoReverse === "always" || deck.logoReverse === "never" ? deck.logoReverse : "auto",
          function(v) {
            deck.logoReverse = v;
            touched();
            if (redraw) redraw();
            else draw();
          }
        ),
        "Your logo is one colour, and a dark title or section slide swallows a dark one. Auto turns it white only where this theme paints a dark ground; a picture slide can still be set on its own in Customise this slide."
      ));
      if (!managed) insp.appendChild(UI.field("Show logo on", UI.select(
        [
          { value: "all", label: "Every slide" },
          /* Was "Title slide only", which named a layout rather than a position
             and so did nothing at all on a deck that opens on a Section. */
          { value: "title", label: "First slide only" },
          { value: "none", label: "Hidden" }
        ],
        deck.logoOn === "title" || deck.logoOn === "none" ? deck.logoOn : "all",
        function(v) {
          deck.logoOn = v;
          touched();
          if (redraw) redraw();
          else draw();
        }
      )));
      var shown = deck.slides.filter(function(sl, i2) {
        return SF.deckShowsLogo(deck, sl, i2);
      }).length;
      var sample = 0;
      for (var i = 0; i < deck.slides.length; i++) {
        if (SF.deckShowsLogo(deck, deck.slides[i], i)) {
          sample = i;
          break;
        }
      }
      if (shown) {
        var frame = el("div", "logo-shot");
        var slide = SF.renderSlide(deck, deck.slides[sample], {
          index: sample,
          total: deck.slides.length
        });
        frame.appendChild(slide);
        SF.fit(frame, slide);
        insp.appendChild(UI.field(
          "On the slide",
          frame,
          "Slide " + (sample + 1) + " of " + deck.slides.length + " · on " + shown + (shown === 1 ? " slide" : " slides") + ". The slide list on the left leaves it off, along with the numbers."
        ));
      } else {
        insp.appendChild(UI.field(
          null,
          null,
          "Set to Hidden, so it appears on no slides."
        ));
      }
    }
    return { openDeckSettings, openAiSmokeTest };
  }

  // src/editor/content-fields.js
  function createContentFields(SF, helpers) {
    const { CHART_LABELS, chartTypeOptions, draw, drawCallouts, drawImageFields, drawInfoPits, drawLayers, drawPairPits, drawPits, drawVideoFields, el, repaint, richField, touched } = helpers;
    function drawContentFields(insp, s) {
      var UI = helpers.UI();
      if (SF.MotionLab && SF.MotionLab.active(s)) {
        var sceneOpts = Object.entries(SF.MotionLab.MOTION_SCENES).map(function(e) {
          return { value: e[0], label: e[1] };
        });
        insp.appendChild(UI.field(
          "Motion experiment",
          UI.select(
            sceneOpts,
            s.motionScene,
            function(v) {
              s.motionScene = v;
              touched();
              repaint();
            }
          ),
          "Each specimen asks for the slide’s title, points and image in its own way."
        ));
      }
      var composition = SF.slideComposition(helpers.deck(), s);
      if (composition === "poster-art" || composition === "ballot") {
        insp.appendChild(UI.field(
          composition === "poster-art" ? "Supporting line" : "Voting instruction",
          richField(s, "body", "area", function(v) {
            s.body = v;
            touched();
            repaint();
          }, 2)
        ));
      }
      if (composition === "ballot") {
        insp.appendChild(UI.field(
          "Context",
          richField(s, "subtitle", "text", function(v) {
            s.subtitle = v;
            touched();
            repaint();
          })
        ));
      }
      if (s.type === "journey") {
        insp.appendChild(UI.field(
          "Journey title",
          richField(s, "title", "text", function(v) {
            s.title = v;
            touched();
            repaint();
          })
        ));
        insp.appendChild(UI.field(
          "Context",
          richField(s, "subtitle", "text", function(v) {
            s.subtitle = v;
            touched();
            repaint();
          })
        ));
        insp.appendChild(UI.field("Show as", UI.select(
          [
            { value: "path", label: "Route with milestones" },
            { value: "handover", label: "Connected stages" },
            { value: "stepper", label: "Stepper — numbered discs on one rail" }
          ],
          s.journeyMode || "path",
          function(v) {
            s.journeyMode = v;
            touched();
            repaint();
          }
        )));
        var stops = el("div");
        drawPairPits(stops, s, "journey");
        insp.appendChild(UI.field(
          "Milestones · heading and detail",
          stops,
          "Use up to six short stops for a route, or two to three connected stages. Next reveals each one."
        ));
        insp.appendChild(UI.field(
          "Takeaway / reading",
          richField(s, "body", "area", function(v) {
            s.body = v;
            touched();
            repaint();
          }, 2)
        ));
        return;
      }
      if (s.type === "mindmap") {
        insp.appendChild(UI.field("Central idea", richField(s, "title", "area", function(v) {
          s.title = v;
          touched();
          repaint();
        }, 2)));
        var branches = el("div");
        drawPairPits(branches, s, "mindmap");
        insp.appendChild(UI.field(
          "Branches · heading and explanation",
          branches,
          "Keep to six short branches for a readable map. Build on Next reveals one branch at a time."
        ));
        return;
      }
      if (s.type === "orgchart") {
        insp.appendChild(UI.field(
          "Title",
          richField(s, "title", "area", function(v) {
            s.title = v;
            touched();
            repaint();
          }, 2)
        ));
        insp.appendChild(UI.field(
          "Subtitle",
          richField(s, "subtitle", "text", function(v) {
            s.subtitle = v;
            touched();
            repaint();
          })
        ));
        var people = el("div");
        drawPits(people, s);
        insp.appendChild(UI.field(
          "People · one per line",
          people,
          "Name | Role | Reports to | photo. Reports-to is a name on this slide, not a row number — reorder freely. Leave Reports to blank for a flat team (no connectors)."
        ));
        var tree = SF.orgTree(s.bullets || []);
        insp.appendChild(el(
          "p",
          "hint",
          tree.people.length ? tree.people.length + (tree.people.length === 1 ? " person" : " people") + (tree.levels > 1 ? " · " + tree.levels + " levels" : " · flat team") : "No people yet."
        ));
        (tree.warnings || []).forEach(function(w) {
          insp.appendChild(el("p", "hint field-warn", w));
        });
        if (tree.levels > 4) {
          insp.appendChild(el(
            "p",
            "hint field-warn",
            "This tree is " + tree.levels + " levels deep — it still draws, but cards shrink. Prefer fewer layers on a lecture slide."
          ));
        }
        return;
      }
      if (s.type === "keyfact") {
        insp.appendChild(UI.field(
          "Heading",
          richField(s, "title", "text", function(v) {
            s.title = v;
            touched();
            repaint();
          })
        ));
        insp.appendChild(UI.field(
          "What the fact is",
          richField(s, "subtitle", "text", function(v) {
            s.subtitle = v;
            touched();
            repaint();
          }),
          'The small line above the fact — "Canvas deadline", "Pass mark", "Word limit". A number on its own does not mean anything.'
        ));
        insp.appendChild(UI.field(
          "The fact",
          richField(s, "body", "area", function(v) {
            s.body = v;
            touched();
            repaint();
          }, 2),
          "Keep it to a few words. This is set large, and long sentences stop being one thing the room can hold."
        ));
        var notes = el("div");
        drawPits(notes, s);
        insp.appendChild(UI.field(
          "Supporting points",
          notes,
          "Everything that matters less than the fact above. Three or four at most."
        ));
        return;
      }
      if (SF.INFO_LAYOUTS && SF.INFO_LAYOUTS.indexOf(s.type) >= 0) {
        var INFO_HINTS = {
          stats: ["Stats · label, value, note", 'Three to six. The value is set large — "92%", "£1.2m", "3 of 5". Ring and bar styles read the leading number.'],
          compare: ["Rows · left, right, optional label", 'Each row is one point of comparison. Add a row label when the rows need naming ("Cost", "Speed").'],
          funnel: ["Stages · name, value, note", "Top to bottom. Numeric values set the band widths; without numbers the bands narrow evenly."],
          timeline: ["Events · date, event, detail", 'Up to eight. Dates can be years, terms or "Week 3" — they are labels, not parsed.'],
          iceberg: ["Layers · label, value, note", "Top to bottom: what the room already sees first, then what sits underneath it."],
          spectrum: ["Positions · label, value, note", "Left to right along the spectrum. Name both ends before the points between them."],
          sourcecheck: ["Checks · label, value, note", "One row per thing worth verifying about the claim above."],
          shift: ["Stages · label, value, note", "Then, now and next — the same story at three points, in that order."]
        };
        var hint = INFO_HINTS[s.type] || ["Rows · label, value, note", "One row per point."];
        insp.appendChild(UI.field(
          "Heading",
          richField(s, "title", "text", function(v) {
            s.title = v;
            touched();
            repaint();
          })
        ));
        if (s.type === "compare") {
          insp.appendChild(UI.field(
            "Column headings",
            richField(s, "subtitle", "text", function(v) {
              s.subtitle = v;
              touched();
              repaint();
            }),
            'Left | Right — "Before | After", "Myth | Fact", "Option A | Option B".'
          ));
        } else {
          insp.appendChild(UI.field(
            "Context line",
            richField(s, "subtitle", "text", function(v) {
              s.subtitle = v;
              touched();
              repaint();
            }),
            "Optional. Where the numbers come from, or the period they cover."
          ));
        }
        var pits = el("div");
        drawInfoPits(pits, s);
        insp.appendChild(UI.field(hint[0], pits, hint[1]));
        insp.appendChild(UI.field(
          "Takeaway",
          richField(s, "body", "area", function(v) {
            s.body = v;
            touched();
            repaint();
          }, 2),
          "Optional line under the graphic — the one sentence the numbers add up to."
        ));
        return;
      }
      if (s.type === "introduction") {
        insp.appendChild(UI.field("Lecturer name", richField(s, "title", "text", function(v) {
          s.title = v;
          touched();
          repaint();
        })));
        insp.appendChild(UI.field("Job title", richField(s, "subtitle", "text", function(v) {
          s.subtitle = v;
          touched();
          repaint();
        })));
        insp.appendChild(UI.field("Introduction", richField(s, "body", "area", function(v) {
          s.body = v;
          touched();
          repaint();
        }, 4)));
        drawImageFields(insp, s, { caption: false, credit: false });
        return;
      }
      if (SF.Explore && SF.Explore.inspector(insp, s, UI, function() {
        touched();
        repaint();
      }, function() {
        touched();
        draw();
      })) return;
      if (s.type === "video") {
        drawVideoFields(insp, s);
        return;
      }
      if (s.type === "chart") {
        insp.appendChild(UI.field(
          "Chart title",
          richField(s, "title", "area", function(v) {
            s.title = v;
            touched();
            repaint();
          }, 2)
        ));
        var chartOpts = chartTypeOptions();
        insp.appendChild(UI.field(
          "Chart type",
          UI.select(
            chartOpts,
            s.chartKind,
            function(v) {
              s.chartKind = v;
              touched();
              repaint();
            }
          ),
          "Grouped by what the chart is for, after the FT’s Visual Vocabulary."
        ));
        var chooser = UI.button("Not sure which? Start from the question →", "ghost", function() {
          SF.Shell.picker({
            title: "What matters most in this data?",
            wide: true,
            items: function() {
              return (SF.CHART_TAXONOMY || []).map(function(cat) {
                var can = cat.kinds.length;
                var lacks = (cat.missing || []).length ? "  Not drawn here: " + cat.missing.join(", ") + "." : "";
                return {
                  id: cat.key,
                  title: cat.label + " · " + cat.question,
                  blurb: cat.note + (can ? "  — " + can + (can === 1 ? " chart here." : " charts here.") : "  — SlideForge draws no maps, so nothing here yet.") + lacks
                };
              });
            },
            describe: function(it2) {
              return it2.blurb;
            },
            onPick: function(it2) {
              var cat = (SF.CHART_TAXONOMY || []).filter(function(c) {
                return c.key === it2.id;
              })[0];
              if (!cat) return;
              if (!cat.kinds.length) {
                SF.toast(cat.label + ": " + cat.missing.slice(0, 3).join(", ") + " and others are the usual answers, and none of them is drawn here. Use an image for now.");
                return;
              }
              SF.Shell.picker({
                title: cat.label + " · " + cat.question,
                wide: true,
                items: function() {
                  return cat.kinds.map(function(k) {
                    var also = SF.chartCategories(k).filter(function(c) {
                      return c.key !== cat.key;
                    }).map(function(c) {
                      return c.label.toLowerCase();
                    });
                    return {
                      id: k,
                      title: CHART_LABELS[k] || k,
                      blurb: (k === s.chartKind ? "What this slide uses now." : "Switch this slide to it.") + (also.length ? "  Also answers " + also.join(" and ") + "." : "")
                    };
                  });
                },
                describe: function(it3) {
                  return it3.blurb;
                },
                onPick: function(it3) {
                  if (!it3.id) return;
                  s.chartKind = it3.id;
                  touched();
                  repaint();
                  SF.toast("Now a " + (CHART_LABELS[it3.id] || it3.id).split(" — ")[0].toLowerCase() + ".");
                }
              });
            }
          });
        });
        chooser.style.cssText = "font-size:11.5px;margin:-4px 0 10px;padding:2px 0;border:0;background:none;text-decoration:underline;text-underline-offset:3px;opacity:.72;width:auto";
        insp.appendChild(chooser);
        var SHAPES = {
          scatter: "Two numeric columns: the first is x, the second y. One row per point.",
          histogram: "One column of numbers. SlideForge counts them into bins.",
          box: "One row per group: its name, then every value measured in it.",
          pictogram: "One row per category, with the count beside it.",
          treemap: "One series of parts that make a whole — same paste as a pie. Largest block draws the eye first.",
          waffle: "One series of parts that make a whole. A single percentage (≤100) fills that many of 100 squares; several categories share the grid.",
          bullet: "First series is Actual, second is Target. One row per category.",
          combo: "First series draws as columns; every series after that draws as markers on the same axis.",
          radar: "At least three categories (the spokes). Each series is one polygon.",
          sankey: "Three columns: from, to, amount. One row per flow.",
          dumbbell: "One row per category, then exactly two numbers — the two states being compared.",
          matrix: "First row names the conditions. Then one row per item, with a rating in each cell.",
          multiples: "One row per panel; the columns become the axis inside every panel. Read transposed."
        };
        if (SHAPES[s.chartKind]) insp.appendChild(el("p", "hint", SHAPES[s.chartKind]));
        if (s.chartKind === "pictogram") {
          insp.appendChild(UI.field("Icon", UI.text(s.chartIcon || "", function(v) {
            s.chartIcon = String(v).trim().slice(0, 4);
            touched();
            repaint();
          }), "One emoji or character, repeated once per unit. A person, a book, a bus — something the room can count at a glance."));
          insp.appendChild(UI.field(
            "One icon is worth",
            UI.num(s.chartUnit > 1 ? s.chartUnit : null, function(v) {
              s.chartUnit = Math.max(1, Number(v) || 1);
              touched();
              repaint();
            }, 1, null, "chosen for you"),
            "Left empty, a unit is picked that keeps the longest row under twenty icons — past that nobody counts, they estimate."
          ));
        }
        insp.appendChild(UI.field(
          "Data — one row per line",
          richField(s, "body", "area", function(v) {
            s.body = v;
            touched();
            repaint();
          }, 9),
          "First row names the series, first column the categories. Separate cells with | — or paste a range straight from a spreadsheet, which arrives tab-separated and needs no editing."
        ));
        insp.appendChild(UI.field(
          "Source & caveat",
          UI.text(s.chartSource || "", function(v) {
            s.chartSource = String(v).slice(0, 200);
            touched();
            repaint();
          }),
          'Printed under the chart and carried into the handout. Where the numbers came from, and what they are not — "Selected platform peaks, not annual means" does more for a room than a citation.'
        ));
        var cd = SF.chartData(s);
        var note = cd.series.length ? cd.series.length + (cd.series.length === 1 ? " series" : " series") + " × " + cd.categories.length + (cd.categories.length === 1 ? " category" : " categories") : "No data yet — needs a header row and at least one row of values.";
        insp.appendChild(el("p", "hint", note));
        if (["pie", "donut", "pictogram", "treemap", "waffle"].indexOf(s.chartKind) >= 0 && cd.series.length > 1) {
          var oneName = s.chartKind === "donut" ? "donut" : s.chartKind === "treemap" ? "treemap" : s.chartKind === "waffle" ? "waffle" : s.chartKind === "pictogram" ? "pictogram" : "pie";
          insp.appendChild(el(
            "p",
            "hint field-warn",
            "A " + oneName + " shows one series. Only “" + cd.series[0].name + "” is drawn; the rest are ignored. Bar compares them all."
          ));
        }
        if (s.chartKind === "combo" && cd.series.length < 2) {
          insp.appendChild(el(
            "p",
            "hint field-warn",
            "Columns + markers needs at least two series — the first for the columns, another for the markers."
          ));
        }
        if (s.chartKind === "bullet" && cd.series.length < 1) {
          insp.appendChild(el(
            "p",
            "hint field-warn",
            "A bullet needs an Actual series; add a Target series as the second column to mark the goal."
          ));
        }
        if (s.chartKind === "stack" && cd.series.some(function(sr) {
          return sr.values.some(function(v) {
            return v != null && v < 0;
          });
        })) {
          insp.appendChild(el(
            "p",
            "hint field-warn",
            "Stacked bars add values up, so negatives are left out of the stack. Use grouped bars to show them."
          ));
        }
        if (s.chartKind === "dumbbell" && cd.series.length !== 2) {
          insp.appendChild(el("p", "hint field-warn", cd.series.length < 2 ? "A dumbbell needs two numbers per row — the two states you are comparing." : "A dumbbell draws the first two series. The bar joins a pair, so the rest are left out; use grouped bars to show them all."));
        }
        if (s.chartKind === "matrix") {
          insp.appendChild(el(
            "p",
            "hint",
            "Shade carries an order, not a distance. Low / Medium / High are ordinal — the gap between them is not a number, so say so in the source line."
          ));
        }
        if (s.chartKind === "multiples" && cd.categories.length > 12) {
          insp.appendChild(el(
            "p",
            "hint field-warn",
            cd.categories.length + " panels is past the point where each one is readable on a wall. Around eight is the most a room can compare at once."
          ));
        }
        if (cd.series.length > 6) {
          insp.appendChild(el(
            "p",
            "hint field-warn",
            "Six series is the ceiling — past that the colours stop being tellable apart. Group the tail into “Other”, or split the chart."
          ));
        }
        drawCallouts(insp, s, cd);
        return;
      }
      if (s.type === "table") {
        insp.appendChild(UI.field(
          "Table title",
          richField(s, "title", "area", function(v) {
            s.title = v;
            touched();
            repaint();
          }, 2)
        ));
        insp.appendChild(UI.field(
          "Rows — one per line",
          richField(s, "body", "area", function(v) {
            s.body = v;
            touched();
            repaint();
          }, 9),
          "Separate cells with | — or paste a range straight from a spreadsheet, which arrives tab-separated and needs no editing. Up to 12 rows and 6 columns."
        ));
        insp.appendChild(UI.check(
          "First row is a header",
          s.tableHeader,
          function(v) {
            s.tableHeader = v;
            touched();
            repaint();
          }
        ));
        var rows2 = SF.parseTable(s.body);
        insp.appendChild(el("p", "hint", rows2.length ? rows2.length + (rows2.length === 1 ? " row" : " rows") + " × " + rows2[0].length + (rows2[0].length === 1 ? " column" : " columns") + (s.tableHeader && rows2.length > 1 ? ", the first a header" : "") : "Nothing parsed yet."));
        return;
      }
      if (s.type === "code") {
        insp.appendChild(UI.field(
          "Slide title",
          richField(s, "title", "text", function(v) {
            s.title = v;
            touched();
            repaint();
          })
        ));
        insp.appendChild(UI.field(
          "Language",
          UI.select(
            [
              { value: "python", label: "Python" },
              { value: "javascript", label: "JavaScript" },
              { value: "text", label: "Plain text" }
            ],
            s.language === "javascript" ? "javascript" : s.language === "text" ? "text" : "python",
            function(v) {
              s.language = v;
              touched();
              repaint();
            }
          ),
          "Label only — nothing runs on the wall. This is a viewer, not an editor."
        ));
        if (s.code == null) s.code = String(s.body || "");
        insp.appendChild(UI.field(
          "Source",
          UI.area(s.code || "", function(v) {
            s.code = v;
            touched();
            repaint();
          }, 12),
          "What the projector types. Keep it short enough to read from the back of the room."
        ));
        var box2 = el("div");
        box2.appendChild(UI.check("Type on enter", s.typewrite !== false, function(v) {
          s.typewrite = v;
          touched();
          repaint();
        }));
        box2.appendChild(el(
          "div",
          "hint",
          "In Present, the code drips in character by character. Next skips to the finished source. The Lesson studio preview always shows the full text."
        ));
        insp.appendChild(UI.field("Playback", box2));
        insp.appendChild(UI.field(
          "Speed (ms per character)",
          UI.num(s.typeSpeed || 28, function(v) {
            s.typeSpeed = Math.max(8, Math.min(120, Number(v) || 28));
            touched();
          }, 8, 120),
          "Lower is faster. Around 24–36 feels like someone typing."
        ));
        return;
      }
      if (s.type === "quote") {
        insp.appendChild(UI.field(
          "Quotation",
          richField(s, "body", "area", function(v) {
            s.body = v;
            touched();
            repaint();
          }, 4)
        ));
        insp.appendChild(UI.field(
          "Attribution",
          richField(s, "subtitle", "text", function(v) {
            s.subtitle = v;
            touched();
            repaint();
          })
        ));
        return;
      }
      if (s.type === "statement") {
        insp.appendChild(UI.field(
          "The line",
          richField(s, "body", "area", function(v) {
            s.body = v;
            touched();
            repaint();
          }, 3),
          "Six words reads best — it is set as large as it fits, so a sentence steps down."
        ));
        insp.appendChild(UI.field(
          "Underneath (optional)",
          richField(s, "subtitle", "text", function(v) {
            s.subtitle = v;
            touched();
            repaint();
          }),
          "Who said it, or what it is from. Left empty, nothing is drawn."
        ));
        return;
      }
      if (s.type === "image") {
        drawImageFields(insp, s);
        insp.appendChild(UI.field("Flip to facts", UI.area(s.body || "", function(v) {
          s.body = v;
          touched();
          repaint();
        }, 4), "Optional: one short fact per line. Adds a button to reveal a clean facts panel."));
        return;
      }
      if (s.type === "gallery") {
        insp.appendChild(UI.field(
          "Title",
          richField(s, "title", "area", function(v) {
            s.title = v;
            touched();
            repaint();
          }, 2)
        ));
        var stackBox = el("div");
        drawLayers(stackBox, s);
        insp.appendChild(UI.field(
          "Pictures · one moment each",
          stackBox,
          "Shown one in front of the last. Turn on Build on Next to step through them."
        ));
        insp.appendChild(UI.field("Fit", UI.select(
          [
            { value: "cover", label: "Fill the frame (crop)" },
            { value: "contain", label: "Fit inside (letterbox)" }
          ],
          s.imageFit,
          function(v) {
            s.imageFit = v;
            touched();
            repaint();
          }
        )));
        return;
      }
      if (s.type === "split") {
        insp.appendChild(UI.field(
          "Title",
          richField(s, "title", "area", function(v) {
            s.title = v;
            touched();
            repaint();
          }, 2)
        ));
        var pits = el("div");
        drawPits(pits, s);
        insp.appendChild(UI.field(
          "Points · drag to reorder",
          pits,
          "Keep it short — the image carries half the meaning."
        ));
        drawImageFields(insp, s, { caption: false, side: true });
        return;
      }
      if (s.type === "keywords") {
        insp.appendChild(UI.field(
          "Title",
          richField(s, "title", "area", function(v) {
            s.title = v;
            touched();
            repaint();
          }, 2)
        ));
        var kw = el("div");
        drawPairPits(kw, s, "keywords");
        insp.appendChild(UI.field(
          "Keywords — bold term, lowercase definition",
          kw,
          "The slide shows the term in bold and the definition in lowercase."
        ));
        return;
      }
      if (s.type === "italics") {
        insp.appendChild(UI.field(
          "Title",
          richField(s, "title", "area", function(v) {
            s.title = v;
            touched();
            repaint();
          }, 2)
        ));
        var it = el("div");
        drawPairPits(it, s, "italics");
        insp.appendChild(UI.field(
          "Italics — emphasised phrase, plain note",
          it,
          "The slide shows the phrase in italics and the explanation in regular type."
        ));
        return;
      }
      if (s.type === "links") {
        insp.appendChild(UI.field(
          "Title",
          richField(s, "title", "area", function(v) {
            s.title = v;
            touched();
            repaint();
          }, 2)
        ));
        var ln = el("div");
        drawPairPits(ln, s, "links");
        insp.appendChild(UI.field(
          "Links — label + http(s) URL",
          ln,
          "Only http and https links become clickable. Opens in a new tab."
        ));
        return;
      }
      insp.appendChild(UI.field(
        s.type === "content" ? "Title" : "Heading",
        richField(s, "title", "area", function(v) {
          s.title = v;
          touched();
          repaint();
        }, 2)
      ));
      if (s.type === "title" || s.type === "section" || s.type === "join") {
        insp.appendChild(UI.field(
          "Subtitle",
          richField(s, "subtitle", "text", function(v) {
            s.subtitle = v;
            touched();
            repaint();
          })
        ));
      }
      if (s.type === "join") {
        var joinPits = el("div");
        drawPits(joinPits, s);
        insp.appendChild(UI.field(
          "Lines under the heading (optional)",
          joinPits,
          "Keep short — the QR and PIN own the slide. Host live replaces the sample code."
        ));
        return;
      }
      if (s.type === "content" || s.type === "cards") {
        var bulletPits = el("div");
        drawPits(bulletPits, s);
        insp.appendChild(UI.field(
          s.type === "cards" ? "Cards · drag to reorder" : "Bullets — click a pit to fill",
          bulletPits,
          'Empty pits stay off the slide until you type. Prefix with "- " for a sub-bullet.'
        ));
      }
    }
    return { drawContentFields };
  }

  // src/editor/arrange.js
  function installArrange(SF) {
    var SLIDE_W2 = 1280;
    var SLIDE_H2 = 720;
    var GUIDE_NEAR = 6;
    var arranging = false;
    var selected = null;
    var selectedSlide = null;
    var cancelDrag = null;
    var arrangedSlide = null;
    function L() {
      return SF.latticeGeometry ? SF.latticeGeometry(root()) : SF.LATTICE;
    }
    function box2() {
      return document.getElementById("previewBox");
    }
    function slide() {
      return SF.Editor && SF.Editor.currentSlide && SF.Editor.currentSlide();
    }
    function root() {
      var b = box2();
      return b && b.querySelector(".slide");
    }
    function commit(repaint) {
      if (SF.Editor && SF.Editor.commitActivityChange) SF.Editor.commitActivityChange();
      if (repaint && SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
    }
    function clamp(v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    }
    function scaleOf(node) {
      var w = node.getBoundingClientRect().width;
      return w > 0 ? w / SLIDE_W2 : 1;
    }
    function regionsOf(s, make) {
      if (!s) return null;
      var d = s.design || (make ? s.design = {} : null);
      if (!d) return null;
      if (!d.regions && make) d.regions = {};
      return d.regions || null;
    }
    function measuredRegions() {
      var s = slide();
      var deck = SF.Editor && SF.Editor.deck && SF.Editor.deck();
      if (!s || !deck || !SF.renderSlide) return null;
      var stage = document.createElement("div");
      stage.style.cssText = "position:fixed;left:-20000px;top:0;width:1280px;height:720px;pointer-events:none";
      document.body.appendChild(stage);
      var rt, host;
      try {
        rt = SF.renderSlide(deck, s, { index: 0, total: 1, interactive: false });
        stage.appendChild(rt);
        host = SF.latticeHost(rt);
      } catch (e) {
        host = null;
      }
      if (!rt || !host || host.querySelector(".sf-lattice")) {
        stage.remove();
        return null;
      }
      var rb = rt.getBoundingClientRect();
      if (!rb.width || !rb.height) {
        stage.remove();
        return null;
      }
      var g = SF.LATTICE;
      var scale = rb.width / 1280;
      var stepX = g.w / g.cols, stepY = g.h / g.rows;
      var out = {};
      Array.prototype.slice.call(host.children).forEach(function(n, i) {
        if (n.nodeType !== 1) return;
        var b = n.getBoundingClientRect();
        if (!b.height || !b.width) return;
        var x = (b.left - rb.left) / scale - g.left;
        var y = (b.top - rb.top) / scale - g.top;
        var col = clamp(Math.round(x / stepX) + 1, 1, g.cols);
        var row = clamp(Math.round(y / stepY) + 1, 1, g.rows);
        var rows2 = SF.linesFor ? SF.linesFor(b.height / scale) : Math.max(1, Math.ceil(b.height / scale / stepY));
        out[blockKeyOfNode(n, i)] = {
          col,
          row,
          cols: clamp(Math.max(1, Math.ceil(b.width / scale / stepX - 0.06)), 1, g.cols - col + 1),
          rows: clamp(rows2, 1, g.rows - row + 1)
        };
      });
      stage.remove();
      return Object.keys(out).length ? out : null;
    }
    function blockKeyOfNode(n, i) {
      return SF.blockKeyOf ? SF.blockKeyOf(n, i) : "block-" + i;
    }
    function resolvedComposition(s) {
      var d = SF.Editor && SF.Editor.deck && SF.Editor.deck();
      return d && SF.slideComposition ? SF.slideComposition(d, s) : void 0;
    }
    function seed() {
      var s = slide();
      if (!s || !SF.layoutRegionsFor) return false;
      var map = regionsOf(s, true);
      if (Object.keys(map).length) return false;
      var resolved = resolvedComposition(s);
      var composed = !!(s.design && s.design.composition) || !!resolved;
      var declared = SF.layoutRegionsFor(s, resolved);
      var measured = measuredRegions() || {};
      Object.assign(map, declared);
      Object.keys(measured).forEach(function(k) {
        if (composed || !declared[k]) {
          map[k] = measured[k];
          return;
        }
        map[k] = {
          col: declared[k].col,
          cols: declared[k].cols,
          row: measured[k].row,
          rows: measured[k].rows
        };
        if (declared[k].anchorX) map[k].anchorX = declared[k].anchorX;
        if (declared[k].anchorY) map[k].anchorY = declared[k].anchorY;
        if (declared[k].alignY) map[k].alignY = declared[k].alignY;
      });
      if (composed && Object.keys(measured).length) {
        Object.keys(map).forEach(function(k) {
          if (k.indexOf("cp-") === 0 && !measured[k]) delete map[k];
        });
      }
      growToFit(s, map);
      commit(true);
      return true;
    }
    function growToFit(s, map) {
      var deck = SF.Editor && SF.Editor.deck && SF.Editor.deck();
      if (!deck || !SF.renderSlide || !SF.latticeFit) return;
      var was = s.design && s.design.regions;
      var stage = document.createElement("div");
      stage.style.cssText = "position:fixed;left:-20000px;top:0;width:1280px;height:720px;pointer-events:none";
      document.body.appendChild(stage);
      try {
        if (!s.design) s.design = {};
        s.design.regions = map;
        var rt = SF.renderSlide(deck, s, { index: 0, total: 1, interactive: false });
        stage.appendChild(rt);
        SF.latticeFit(rt).forEach(function(f) {
          var r = map[f.key];
          if (!r || f.need == null || f.need <= r.rows) return;
          r.rows = Math.min(f.need, L().rows - r.row + 1);
        });
      } catch (e) {
      }
      stage.remove();
      if (was === void 0 && s.design) delete s.design.regions;
      else if (s.design) s.design.regions = was;
    }
    function guideLayer(rt) {
      var layer = rt.querySelector(".sf-guides");
      if (!layer) {
        layer = document.createElement("div");
        layer.className = "sf-guides";
        rt.appendChild(layer);
      }
      return layer;
    }
    function clearGuides() {
      var rt = root();
      var layer = rt && rt.querySelector(".sf-guides");
      if (layer) layer.remove();
    }
    function guideLines(exceptKey) {
      var g = L();
      var xs = [0, SLIDE_W2 / 2, SLIDE_W2, g.left, g.left + g.w];
      var ys = [0, SLIDE_H2 / 2, SLIDE_H2, g.top, g.top + g.h];
      var kinds = { x: {}, y: {} };
      xs.forEach(function(v) {
        kinds.x[v] = "edge";
      });
      ys.forEach(function(v) {
        kinds.y[v] = "edge";
      });
      var s = slide();
      var map = regionsOf(s);
      if (map) {
        Object.keys(map).forEach(function(k) {
          if (k === exceptKey) return;
          var r = map[k];
          var x1 = g.left + (r.col - 1) * g.stepX;
          var x2 = x1 + r.cols * g.stepX - (g.stepX - 65);
          var y1 = g.top + (r.row - 1) * g.stepY;
          var y2 = y1 + r.rows * g.stepY;
          [x1, x2].forEach(function(v) {
            xs.push(v);
            if (!kinds.x[v]) kinds.x[v] = "block";
          });
          [y1, y2].forEach(function(v) {
            ys.push(v);
            if (!kinds.y[v]) kinds.y[v] = "block";
          });
        });
      }
      return { xs, ys, kinds };
    }
    function drawGuides(region2, key) {
      var rt = root();
      if (!rt) return;
      var g = L();
      var layer = guideLayer(rt);
      layer.replaceChildren();
      var lines = guideLines(key);
      var x1 = g.left + (region2.col - 1) * g.stepX;
      var x2 = x1 + region2.cols * g.stepX - (g.stepX - 65);
      var y1 = g.top + (region2.row - 1) * g.stepY;
      var y2 = y1 + region2.rows * g.stepY;
      function mark(axis, mine, pool) {
        mine.forEach(function(v) {
          pool.forEach(function(t) {
            if (Math.abs(v - t) > GUIDE_NEAR) return;
            var line = document.createElement("div");
            line.className = "sf-guide";
            line.setAttribute("data-axis", axis);
            line.setAttribute("data-kind", lines.kinds[axis][t] || "block");
            line.style[axis === "x" ? "left" : "top"] = t + "px";
            layer.appendChild(line);
          });
        });
      }
      mark("x", [x1, x2], lines.xs);
      mark("y", [y1, y2], lines.ys);
    }
    function select(slot) {
      var rt = root();
      if (rt) rt.querySelectorAll("[data-arrange-selected]").forEach(function(n) {
        n.removeAttribute("data-arrange-selected");
      });
      selected = slot ? slot.getAttribute("data-block-key") : null;
      selectedSlide = selected ? slide() : null;
      if (slot) slot.setAttribute("data-arrange-selected", "");
      paintBar();
      if (SF.Editor && SF.Editor.refreshInspector) SF.Editor.refreshInspector();
    }
    var CORNERS = ["nw", "ne", "sw", "se"];
    function paintHandles(rt) {
      if (!rt) return;
      rt.querySelectorAll(".sf-handle").forEach(function(n) {
        n.remove();
      });
      if (!selected || String(selected).indexOf("blocks.") !== 0) return;
      var held = SF.Arrange && SF.Arrange.selectedBlock && SF.Arrange.selectedBlock();
      var kind = held && SF.FREE_KINDS && SF.FREE_KINDS[held.kind];
      if (kind && kind.resizes === false) return;
      var slot = rt.querySelector('[data-block-key="' + selected + '"]');
      if (!slot) return;
      CORNERS.forEach(function(corner) {
        var h = document.createElement("span");
        h.className = "sf-handle sf-handle-" + corner;
        h.dataset.corner = corner;
        h.setAttribute("aria-hidden", "true");
        slot.appendChild(h);
      });
    }
    function beginResize(e) {
      var h = e.target.closest && e.target.closest(".sf-handle");
      if (!h || e.button !== 0 || e.isPrimary === false) return;
      var slot = h.closest(".sf-slot");
      var key = slot && slot.getAttribute("data-block-key");
      var s = slide();
      var map = regionsOf(s, true);
      var start = key && map[key];
      if (!start) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var corner = h.dataset.corner;
      var g = L();
      var scale = scaleOf(root());
      var fromX = e.clientX, fromY = e.clientY;
      var landed = start, moved = false;
      function move(ev) {
        var dCol = Math.round((ev.clientX - fromX) / scale / g.stepX);
        var dRow = Math.round((ev.clientY - fromY) / scale / g.stepY);
        if (!dCol && !dRow && !moved) return;
        moved = true;
        var west = corner === "nw" || corner === "sw";
        var north = corner === "nw" || corner === "ne";
        var col = start.col, row = start.row, cols = start.cols, rows2 = start.rows;
        if (west) {
          col = clamp(start.col + dCol, 1, start.col + start.cols - 1);
          cols = start.col + start.cols - col;
        } else {
          cols = clamp(start.cols + dCol, 1, g.cols - start.col + 1);
        }
        if (north) {
          row = clamp(start.row + dRow, 1, start.row + start.rows - 1);
          rows2 = start.row + start.rows - row;
        } else {
          rows2 = Math.max(1, start.rows + dRow);
        }
        landed = { col, row, cols, rows: rows2 };
        slot.style.gridArea = landed.row + " / " + landed.col + " / span " + landed.rows + " / span " + landed.cols;
        slot.setAttribute("data-span", landed.rows + "r x " + landed.cols + "c");
        drawGuides(landed, key);
      }
      function cleanup() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", cancel);
        window.removeEventListener("blur", cancel);
        if (cancelDrag === cancel) cancelDrag = null;
        clearGuides();
      }
      function cancel() {
        cleanup();
        if (moved && SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
      }
      function up() {
        cleanup();
        if (slide() !== s || !moved) return;
        var settled = settle(key, landed);
        if (!settled) {
          if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
          SF.toast && SF.toast("No room to grow it that far.");
          return;
        }
        var shoved = Object.keys(settled).filter(function(k) {
          return k !== key && map[k] && (map[k].col !== settled[k].col || map[k].row !== settled[k].row);
        }).length;
        applySettled(map, settled);
        commit(true);
        afterPaint();
        if (shoved) SF.toast && SF.toast(shoved === 1 ? "Resized. The item in the way shifted over." : "Resized. " + shoved + " items shifted over.");
      }
      if (cancelDrag) cancelDrag();
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", cancel);
      window.addEventListener("blur", cancel);
      cancelDrag = cancel;
    }
    function beginDrag(e) {
      if (e.button !== 0 || e.isPrimary === false) return;
      if (e.target.closest && e.target.closest(".sf-handle")) return;
      if (e.target.isContentEditable) return;
      var slot = e.target.closest && e.target.closest(".sf-slot");
      var freeItem = !arranging && slot && String(slot.getAttribute("data-block-key") || "").indexOf("blocks.") === 0;
      if (!arranging && !freeItem) return;
      if (cancelDrag) cancelDrag();
      if (!slot) {
        select(null);
        return;
      }
      if (!freeItem) {
        e.preventDefault();
        select(slot);
      }
      var rt = root();
      var s = slide();
      var map = regionsOf(s, true);
      var key = slot.getAttribute("data-block-key");
      var start = map[key];
      if (!start) return;
      var g = L();
      var scale = scaleOf(rt);
      var fromX = e.clientX;
      var fromY = e.clientY;
      var landed = start;
      var moved = false;
      function move(ev) {
        var dCol = Math.round((ev.clientX - fromX) / scale / g.stepX);
        var dRow = Math.round((ev.clientY - fromY) / scale / g.stepY);
        if (!dCol && !dRow && !moved) return;
        if (!moved && freeItem) {
          select(slot);
          slot.addEventListener("click", function once(ev2) {
            ev2.stopPropagation();
            ev2.preventDefault();
            slot.removeEventListener("click", once, true);
          }, true);
        }
        moved = true;
        slot.style.transform = "";
        landed = {
          col: clamp(start.col + dCol, 1, g.cols - start.cols + 1),
          row: clamp(start.row + dRow, 1, g.rows - start.rows + 1),
          cols: start.cols,
          rows: start.rows
        };
        slot.style.gridArea = landed.row + " / " + landed.col + " / span " + landed.rows + " / span " + landed.cols;
        slot.setAttribute("data-span", landed.rows + "r x " + landed.cols + "c");
        drawGuides(landed, key);
      }
      function cleanup() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", cancel);
        window.removeEventListener("blur", cancel);
        cancelDrag = null;
        clearGuides();
      }
      function cancel() {
        cleanup();
        if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
      }
      function up() {
        cleanup();
        if (slide() !== s || !arranging && !freeItem) return;
        if (!moved) return;
        var settled = settle(key, landed);
        if (!settled) {
          if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
          SF.toast && SF.toast("No room there — something that cannot move is in the way.");
          return;
        }
        var shoved = Object.keys(settled).filter(function(k) {
          return k !== key && map[k] && (map[k].col !== settled[k].col || map[k].row !== settled[k].row);
        }).length;
        applySettled(map, settled);
        commit(true);
        afterPaint();
        if (shoved) SF.toast && SF.toast(shoved === 1 ? "Moved. The item in the way shifted over." : "Moved. " + shoved + " items shifted over.");
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", cancel);
      window.addEventListener("blur", cancel);
      cancelDrag = cancel;
    }
    function resize(dCols, dRows) {
      if (!selected) return;
      var s = slide();
      var map = regionsOf(s);
      var r = map && map[selected];
      if (!r) return;
      var g = L();
      var wasCols = r.cols;
      r.cols = clamp(r.cols + dCols, 1, r.anchorX ? g.cols : g.cols - r.col + 1);
      if (dCols < 0 && wasCols >= g.cols && r.cols < g.cols && !r.anchorX) r.col = 1;
      if (dRows) {
        var cost = SF.restackRegions(map, selected, Math.max(1, r.rows + dRows));
        if (cost && cost.over) {
          SF.toast && SF.toast("That is " + cost.used + " of " + cost.budget + " lines — " + cost.over + " past the slide.");
        }
      }
      Object.assign(r, SF.anchorRegion(r));
      commit(true);
      afterPaint();
    }
    var overlaps = function(a, b) {
      return SF.regionsOverlap(a, b);
    };
    function occupants(exceptKey) {
      var rt = root();
      var map = regionsOf(slide());
      if (!rt || !map) return [];
      return Array.prototype.slice.call(rt.querySelectorAll(".sf-slot[data-block-key]")).map(function(n) {
        return n.getAttribute("data-block-key");
      }).filter(function(k) {
        return k && k !== exceptKey && map[k];
      }).map(function(k) {
        return map[k];
      });
    }
    function immovable() {
      var rt = root();
      if (!rt) return [];
      return Array.prototype.slice.call(rt.querySelectorAll(".sf-slot[data-block-key]")).map(function(n) {
        return n.getAttribute("data-block-key");
      }).filter(function(k) {
        return k && k.indexOf("blocks.") !== 0;
      });
    }
    function settle(key, want) {
      var rt = root();
      var map = regionsOf(slide());
      if (!rt || !map) return null;
      var drawn = {};
      Array.prototype.slice.call(rt.querySelectorAll(".sf-slot[data-block-key]")).forEach(function(n) {
        var k = n.getAttribute("data-block-key");
        if (k && map[k]) drawn[k] = map[k];
      });
      if (!drawn[key]) drawn[key] = map[key] || want;
      return SF.resolvePlacement(drawn, key, want, L(), immovable());
    }
    function applySettled(map, settled) {
      Object.keys(settled).forEach(function(k) {
        if (!map[k]) return;
        map[k].col = settled[k].col;
        map[k].row = settled[k].row;
        map[k].cols = settled[k].cols;
        map[k].rows = settled[k].rows;
      });
    }
    function makeRoom(map, want) {
      var drawn = occupants(null);
      var keys = Object.keys(map || {}).filter(function(k) {
        return k.indexOf("blocks.") === 0 && drawn.some(function(r2) {
          return r2 === map[k];
        });
      });
      var clash = keys.filter(function(k) {
        return map[k] && overlaps(map[k], want);
      });
      if (!clash.length) return want;
      clash.sort(function(a, b) {
        return map[b].cols * map[b].rows - map[a].cols * map[a].rows;
      });
      var key = clash[0], r = map[key];
      if (r.cols >= r.rows) {
        var keep = Math.floor(r.cols / 2);
        if (keep < 1 || r.cols - keep < 1) return want;
        map[key] = { col: r.col, row: r.row, cols: keep, rows: r.rows };
        return { col: r.col + keep, row: r.row, cols: r.cols - keep, rows: r.rows };
      }
      var keepRows = Math.floor(r.rows / 2);
      if (keepRows < 1 || r.rows - keepRows < 1) return want;
      map[key] = { col: r.col, row: r.row, cols: r.cols, rows: keepRows };
      return { col: r.col, row: r.row + keepRows, cols: r.cols, rows: r.rows - keepRows };
    }
    function addBlock(kind) {
      var s = slide();
      if (!s) return;
      var spec = SF.FREE_KINDS && SF.FREE_KINDS[kind] || SF.FREE_KINDS && SF.FREE_KINDS.text;
      if (!spec) return;
      var list = SF.freeBlocksOf(s, true);
      var id = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      var map = regionsOf(s, true);
      if (!Object.keys(map).length) seed();
      map = regionsOf(s, true);
      var placedBlocks = occupants(null);
      var want = SF.insertionRegionFor && SF.insertionRegionFor(s, list.length, kind, placedBlocks, resolvedComposition(s)) || { col: 1, row: 1, cols: spec.cols, rows: spec.rows };
      var before = Object.keys(map).length;
      var placed = makeRoom(map, { col: want.col, row: want.row, cols: want.cols, rows: want.rows });
      var took = { id, kind, text: "" };
      if (want && want.slot) took.as = want.slot;
      list.push(took);
      map[SF.freeBlockKey(id)] = placed;
      var shared = before === Object.keys(map).length;
      selected = SF.freeBlockKey(id);
      selectedSlide = s;
      commit(true);
      afterPaint();
      SF.toast && SF.toast(spec.label + (shared ? " added beside what was there — both now take half the space." : " added. Click it to type, drag to move."));
    }
    function centreInGrid() {
      var s = slide();
      var map = regionsOf(s);
      var keys = map ? Object.keys(map).filter(function(k) {
        return map[k];
      }) : [];
      if (!keys.length) return;
      var g = L();
      var minRow = Infinity, maxRow = -Infinity;
      keys.forEach(function(k) {
        var r = map[k];
        minRow = Math.min(minRow, r.row);
        maxRow = Math.max(maxRow, r.row + r.rows - 1);
      });
      var usedRows = maxRow - minRow + 1;
      var wantRow = clamp(Math.floor((g.rows - usedRows) / 2) + 1, 1, Math.max(1, g.rows - usedRows + 1));
      var dRow = wantRow - minRow;
      if (!dRow) {
        SF.toast && SF.toast("Already centred in the grid.");
        return;
      }
      keys.forEach(function(k) {
        var r = map[k];
        if (!r.anchorY) r.row += dRow;
      });
      commit(true);
      afterPaint();
      SF.toast && SF.toast("Centred — " + usedRows + " of " + g.rows + " lines used, " + (g.rows - usedRows) + " split above and below.");
    }
    var SPLITS = [
      { value: "50", label: "50 · 50" },
      { value: "40", label: "40 · 60" },
      { value: "60", label: "60 · 40" },
      { value: "20", label: "20 · 80" },
      { value: "80", label: "80 · 20" }
    ];
    function splitRegion(axis, firstPercent) {
      if (!selected) return;
      var s = slide();
      var map = regionsOf(s, true);
      var r = map && map[selected];
      if (!r) return;
      var down = axis === "row";
      var span = down ? r.rows : r.cols;
      if (span < 2) {
        SF.toast && SF.toast(down ? "Too short to split — one line cannot become two." : "Too narrow to split — one column cannot become two.");
        return;
      }
      var first = clamp(Math.round(span * firstPercent / 100), 1, span - 1);
      var second = span - first;
      var id = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      SF.freeBlocksOf(s, true).push({ id, kind: "text", text: "" });
      map[SF.freeBlockKey(id)] = down ? { col: r.col, row: r.row + first, cols: r.cols, rows: second } : { col: r.col + first, row: r.row, cols: second, rows: r.rows, alignY: r.alignY };
      if (down) delete r.anchorY;
      else delete r.anchorX;
      if (down) delete r.alignY;
      if (down) r.rows = first;
      else r.cols = first;
      selected = SF.freeBlockKey(id);
      selectedSlide = s;
      commit(true);
      afterPaint();
      SF.toast && SF.toast("Split " + first + " · " + second + (down ? " lines" : " columns") + ". Click the new block to type into it.");
    }
    function duplicateBlock() {
      var s = slide();
      var id = selected && SF.freeBlockId && SF.freeBlockId(selected);
      if (!s || !id) return;
      var block = SF.freeBlockById(s, id);
      var map = regionsOf(s, true);
      var from = map[selected];
      if (!block || !from) return;
      var copyId = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      SF.freeBlocksOf(s, true).push({ id: copyId, kind: block.kind, text: block.text });
      var g = L();
      map[SF.freeBlockKey(copyId)] = {
        col: from.col,
        row: Math.min(g.rows, from.row + from.rows),
        cols: from.cols,
        rows: from.rows,
        alignY: from.alignY
      };
      selected = SF.freeBlockKey(copyId);
      commit(true);
      afterPaint();
      SF.toast && SF.toast("Copied, one row below.");
    }
    function syncRail() {
      if (!SF.Editor) return;
      if (SF.Editor.clearBlockFocus) SF.Editor.clearBlockFocus();
      if (SF.Editor.refreshInspector) SF.Editor.refreshInspector();
    }
    function deselect() {
      if (!selected) return;
      selected = null;
      selectedSlide = null;
      afterPaint();
      syncRail();
    }
    function removeBlock() {
      var s = slide();
      var what = s && SF.deleteBlock(s, selected);
      if (!what) return false;
      selected = null;
      syncRail();
      commit(true);
      afterPaint();
      SF.toast && SF.toast(what === "item" ? "Item removed. Undo brings it back." : "Taken off this slide. Its words are kept — Undo, or Bring back in Layout.");
      return true;
    }
    function fitToText() {
      if (!selected) return;
      var v = verdictFor(selected);
      if (!v || v.need == null) return;
      var map = regionsOf(slide());
      var r = map && map[selected];
      if (!r) return;
      if (v.need === r.rows) {
        SF.toast && SF.toast("Already " + r.rows + " lines.");
        return;
      }
      var was = r.rows;
      var cost = SF.restackRegions(map, selected, v.need);
      Object.assign(r, SF.anchorRegion(r));
      commit(true);
      afterPaint();
      SF.toast && SF.toast(was + " lines to " + v.need + (cost && cost.over ? " — the slide is now " + cost.over + " lines over" : ""));
    }
    function resetArrangement() {
      var s = slide();
      if (!s || !s.design || !s.design.regions) return;
      delete s.design.regions;
      selected = null;
      commit(false);
      setArranging(false);
      SF.toast && SF.toast("Arrangement reset — this slide follows its theme again.");
    }
    var verdict = [];
    function measure() {
      var rt = root();
      if (!rt || !arranging) return;
      requestAnimationFrame(function() {
        if (!arranging || rt !== root()) return;
        verdict = SF.latticeFit(rt);
        paintBar();
      });
    }
    function verdictFor(key) {
      return verdict.find(function(v) {
        return v.key === key;
      }) || null;
    }
    function paintBar() {
      var bar = document.getElementById("arrangeBar");
      if (!bar) return;
      bar.hidden = !arranging;
      bar.querySelectorAll("[data-arrange-needs-selection]").forEach(function(b) {
        b.disabled = !selected;
      });
      var map = regionsOf(slide());
      var region2 = selected && map && map[selected];
      var ax = (
        /** @type {HTMLSelectElement|null} */
        document.getElementById("arrangeAnchorX")
      );
      var ay = (
        /** @type {HTMLSelectElement|null} */
        document.getElementById("arrangeAnchorY")
      );
      if (ax) ax.value = region2 && region2.anchorX || "";
      if (ay) ay.value = region2 && region2.anchorY || "";
      var al = (
        /** @type {HTMLSelectElement|null} */
        document.getElementById("arrangeAlignY")
      );
      if (al) al.value = region2 && region2.alignY || "";
      var splitSel = (
        /** @type {HTMLSelectElement|null} */
        document.getElementById("arrangeSplit")
      );
      if (splitSel) {
        var canCut = !!region2 && (region2.cols > 1 || region2.rows > 1);
        splitSel.disabled = !canCut;
        splitSel.title = !region2 ? "Select a block to split" : !canCut ? "A single cell cannot become two — make it wider or taller first" : "Cut this block's " + region2.cols + " columns or " + region2.rows + " lines in two, and put a new block in the rest";
      }
      var isFree = !!(selected && SF.freeBlockId && SF.freeBlockId(selected));
      var dup = (
        /** @type {HTMLButtonElement|null} */
        document.getElementById("btnArrangeDuplicate")
      );
      if (dup) {
        var held = SF.Arrange.selectedBlock && SF.Arrange.selectedBlock();
        var kindOf = held && SF.FREE_KINDS && SF.FREE_KINDS[held.kind];
        dup.disabled = !isFree || (kindOf ? kindOf.duplicates === false : false);
        dup.title = isFree ? "Copy this block, one row below" : "Only a block you added can be copied — this one is part of the layout";
      }
      var kill = (
        /** @type {HTMLButtonElement|null} */
        document.getElementById("btnArrangeRemove")
      );
      if (kill) {
        var can = !!(selected && SF.canDeleteBlock(slide(), selected));
        kill.disabled = !can;
        kill.title = !selected ? "Select a block to take off the slide" : isFree ? "Remove this item from the slide" : "Take this off the slide. Its words are kept and the rail still edits them.";
      }
      var back = (
        /** @type {HTMLButtonElement|null} */
        document.getElementById("btnArrangeRestore")
      );
      if (back) {
        var off = SF.hiddenBlocksOf(slide()).length;
        back.hidden = !off;
        back.textContent = off > 1 ? "↩ Bring back " + off : "↩ Bring back";
        back.title = off === 1 ? "Bring back the block taken off this slide" : "Bring back the " + off + " blocks taken off this slide";
      }
      var fitBtn = (
        /** @type {HTMLButtonElement|null} */
        document.getElementById("btnArrangeFit")
      );
      if (fitBtn) {
        var v0 = selected && verdictFor(selected);
        var need = v0 && v0.need;
        fitBtn.disabled = !selected || need == null || !region2 || need === region2.rows;
        fitBtn.textContent = need != null && region2 && need !== region2.rows ? "↕ Fit to text (" + need + ")" : "↕ Fit to text";
        fitBtn.title = need != null && region2 && need !== region2.rows ? "Give this block " + need + " lines instead of " + region2.rows + ", and push what is below it down" : "This block already has the lines its words need";
      }
      var what = document.getElementById("arrangeWhat");
      if (!what) return;
      var over = verdict.filter(function(v2) {
        return v2.over;
      });
      if (selected) {
        var s = slide();
        var r = regionsOf(s) && regionsOf(s)[selected];
        var v = verdictFor(selected);
        var where = r ? " · row " + r.row + ", col " + r.col + " · " + r.rows + "r x " + r.cols + "c" : "";
        var fit = !v ? "" : v.wide && v.need <= v.have ? " — overflows sideways" : v.over ? " — needs " + v.need + " lines, has " + v.have : v.need != null && v.have > v.need ? " — " + v.need + " of " + v.have + " lines used, " + (v.have - v.need) + " spare" : "";
        what.textContent = selected + where + fit;
        what.dataset.fit = v && v.over ? "over" : "ok";
        return;
      }
      what.textContent = !verdict.length ? "Click a block" : over.length ? over.length + (over.length === 1 ? " block does not fit" : " blocks do not fit") : "Click a block · all " + verdict.length + " fit";
      what.dataset.fit = over.length ? "over" : "ok";
    }
    function sameSlide(a, b) {
      return !!(a && b && a.id === b.id);
    }
    function afterPaint() {
      var now = slide();
      if (arranging && !sameSlide(arrangedSlide, now)) {
        setArranging(false);
        return;
      }
      if (arranging) arrangedSlide = now;
      if (selectedSlide && sameSlide(selectedSlide, now)) selectedSlide = now;
      if (selectedSlide && !sameSlide(selectedSlide, now)) {
        selected = null;
        selectedSlide = null;
        verdict = [];
        if (cancelDrag) cancelDrag();
      }
      var rt = root();
      var b = box2();
      if (b) b.classList.toggle("arranging", arranging);
      paintHandles(rt);
      if (!rt || !arranging) {
        paintBar();
        return;
      }
      var s = slide();
      var map = regionsOf(s);
      rt.querySelectorAll(".sf-slot").forEach(function(slot) {
        var key = slot.getAttribute("data-block-key");
        if (!key) return;
        var r = map && map[key];
        if (r) slot.setAttribute("data-span", r.rows + "r x " + r.cols + "c");
        if (key === selected) slot.setAttribute("data-arrange-selected", "");
      });
      paintBar();
      measure();
    }
    function setArranging(on) {
      if (on && SF.HeaderFooterUI) SF.HeaderFooterUI.close();
      if (on && SF.Artwork && SF.Artwork.isEditing()) SF.Artwork.setEditing(false);
      if (cancelDrag) cancelDrag();
      arranging = !!on;
      arrangedSlide = arranging ? slide() : null;
      var hadSelection = !!selected;
      if (!arranging) {
        selected = null;
        verdict = [];
        clearGuides();
      }
      var toggle = document.getElementById("btnArrange");
      if (toggle) {
        toggle.setAttribute("aria-pressed", String(arranging));
        toggle.textContent = arranging ? "▦ Arrange" : "▤ Arrange";
      }
      if (arranging && !seed() && SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
      else if (!arranging && SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
      if (!arranging && hadSelection) syncRail();
      afterPaint();
    }
    var installed = false;
    function install() {
      if (installed) return;
      installed = true;
      var b = box2();
      if (b) b.addEventListener("pointerdown", beginResize);
      if (b) b.addEventListener("pointerdown", beginDrag);
      var flip = document.getElementById("btnArrange");
      if (flip) flip.addEventListener("click", function() {
        setArranging(!arranging);
      });
      var sizers = [
        { id: "btnArrangeWider", cols: 1, rows: 0 },
        { id: "btnArrangeNarrower", cols: -1, rows: 0 },
        { id: "btnArrangeTaller", cols: 0, rows: 1 },
        { id: "btnArrangeShorter", cols: 0, rows: -1 }
      ];
      sizers.forEach(function(sizer) {
        var el = document.getElementById(sizer.id);
        if (el) el.addEventListener("click", function() {
          resize(sizer.cols, sizer.rows);
        });
      });
      var reset = document.getElementById("btnArrangeReset");
      if (reset) reset.addEventListener("click", resetArrangement);
      var fit = document.getElementById("btnArrangeFit");
      if (fit) fit.addEventListener("click", fitToText);
      var centre = document.getElementById("btnArrangeCentre");
      if (centre) centre.addEventListener("click", centreInGrid);
      function wireAdder(id) {
        var found = (
          /** @type {HTMLSelectElement|null} */
          document.getElementById(id)
        );
        if (!found) return;
        var picker = found;
        var keep = picker.options[0];
        picker.innerHTML = "";
        if (keep) picker.appendChild(keep);
        Object.keys(SF.FREE_KINDS || {}).forEach(function(kind) {
          var opt = document.createElement("option");
          opt.value = kind;
          opt.textContent = SF.FREE_KINDS[kind].label || kind;
          picker.appendChild(opt);
        });
        picker.addEventListener("change", function() {
          var kind = picker.value;
          picker.value = "";
          if (kind) addBlock(kind);
        });
      }
      wireAdder("arrangeAdd");
      wireAdder("canvasAddItem");
      var splitter = (
        /** @type {HTMLSelectElement|null} */
        document.getElementById("arrangeSplit")
      );
      if (splitter) {
        var splitPicker = splitter;
        splitPicker.addEventListener("change", function() {
          var choice3 = String(splitPicker.value || "").split(":");
          splitPicker.value = "";
          if (choice3.length === 2) splitRegion(choice3[0], Number(choice3[1]));
        });
      }
      var dup = document.getElementById("btnArrangeDuplicate");
      if (dup) dup.addEventListener("click", duplicateBlock);
      var kill = document.getElementById("btnArrangeRemove");
      if (kill) kill.addEventListener("click", removeBlock);
      var back = document.getElementById("btnArrangeRestore");
      if (back) back.addEventListener("click", function() {
        var s = slide();
        var n = s && SF.restoreAllBlocks(s);
        if (!n) return;
        commit(true);
        if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
        afterPaint();
        SF.toast && SF.toast(n === 1 ? "Block brought back." : n + " blocks brought back.");
      });
      ["X", "Y"].forEach(function(axis) {
        var control = (
          /** @type {HTMLSelectElement|null} */
          document.getElementById("arrangeAnchor" + axis)
        );
        if (!control) return;
        var picker = control;
        picker.addEventListener("change", function() {
          var map = regionsOf(slide()), r = selected && map && map[selected];
          if (!r) return;
          r["anchor" + axis] = picker.value;
          Object.assign(r, SF.anchorRegion(r));
          commit(true);
          afterPaint();
        });
      });
      var align = (
        /** @type {HTMLSelectElement|null} */
        document.getElementById("arrangeAlignY")
      );
      if (align) {
        var alignPicker = align;
        alignPicker.addEventListener("change", function() {
          var map = regionsOf(slide()), r = selected && map && map[selected];
          if (!r) return;
          if (alignPicker.value) r.alignY = alignPicker.value;
          else delete r.alignY;
          commit(true);
          afterPaint();
        });
      }
      document.addEventListener("keydown", function(e) {
        var host = box2();
        if (!arranging && !selected || SF.Player && SF.Player.open || !host || !host.getClientRects().length) return;
        var from = (
          /** @type {Element|null} */
          e.target
        );
        if (from && from.closest && from.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], dialog')) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (arranging) setArranging(false);
          else deselect();
          return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          if (!selected) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          if (!removeBlock()) {
            SF.toast && SF.toast("Nothing to delete here.");
          }
          return;
        }
        if (!selected || e.metaKey || e.ctrlKey || e.altKey || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
        var map = regionsOf(slide());
        var r = map && map[selected];
        if (!r) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        var dx = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        var dy = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (e.shiftKey) {
          resize(dx, dy);
          return;
        }
        var g = L();
        var want = {
          col: clamp(r.col + dx, 1, g.cols - r.cols + 1),
          row: clamp(r.row + dy, 1, g.rows - r.rows + 1),
          cols: r.cols,
          rows: r.rows
        };
        var settled = settle(selected, want);
        if (!settled) {
          SF.toast && SF.toast("Something that cannot move is in the way.");
          return;
        }
        if (dx) delete r.anchorX;
        if (dy) delete r.anchorY;
        applySettled(map, settled);
        commit(true);
        afterPaint();
      }, true);
      paintBar();
    }
    SF.Arrange = {
      install,
      afterPaint,
      /* The canvas bar offers the same ＋ Item the arrange bar does, so both
         call this rather than each growing their own copy of it. */
      addBlock,
      /* Select an item from outside — a click on the canvas goes to the rail,
         and the corner handles have to come with it. Without this the rail said
         an item was selected while the canvas showed nothing to grab. */
      selectKey: function(key) {
        if (!key || String(key).indexOf("blocks.") !== 0) return;
        selected = key;
        selectedSlide = slide();
        afterPaint();
        if (SF.Editor && SF.Editor.refreshInspector) SF.Editor.refreshInspector();
      },
      /* Drop the canvas selection — the rail calls this when it deletes the
         block, so the handles do not outlive it. */
      deselect,
      /* Delete the selected item, if the selection is one that can go.
         @returns {boolean} whether it did. */
      removeSelected: removeBlock,
      /* Whether an item is selected on the canvas at all, Layout or not. */
      hasSelection: function() {
        return !!selected;
      },
      /* Which block the canvas has selected, so the inspector can edit it. */
      selectedBlock: function() {
        var id = selected ? SF.freeBlockId(selected) : null;
        var s = id ? slide() : null;
        return s && SF.freeBlockById(s, id) || null;
      },
      isArranging: function() {
        return arranging;
      },
      setArranging
    };
  }

  // src/editor/panes.js
  function createPanes(SF, helpers) {
    const {
      el,
      touched,
      draw,
      drawInspector,
      repaint,
      drawLayoutPicker,
      drawUnusedOnLayout
    } = helpers;
    const drawRail = function() {
      return helpers.drawRail.apply(null, arguments);
    };
    function drawMotion(insp, s) {
      var UI = helpers.UI();
      insp.appendChild(el(
        "p",
        "hint",
        "How this slide arrives on the screen. The words stay as they are."
      ));
      insp.appendChild(UI.field("Transition in", UI.select(
        SF.TRANSITIONS.map(function(t) {
          return { value: t, label: t[0].toUpperCase() + t.slice(1) };
        }),
        s.transition,
        function(v) {
          s.transition = v;
          touched();
          drawRail();
          drawInspector();
        }
      )));
      if (s.transition === "morph") {
        insp.appendChild(el(
          "p",
          "hint",
          "Morph carries one thing across the cut instead of dissolving the slide: the same picture, the same chart table, or the same heading text as the slide before this one. With nothing shared — or in a browser without view transitions, or when less motion has been asked for — it is a fade."
        ));
      }
      if (s.type === "statement") {
        var d = s.design || (s.design = {});
        insp.appendChild(UI.field("Words arrive", UI.select([
          { value: "", label: "All at once" },
          { value: "rise", label: "Rise — up from below, one at a time" },
          { value: "fade", label: "Fade — in place, one at a time" },
          { value: "reveal", label: "Reveal — wiped up, one at a time" }
        ], String(d.words || ""), function(v) {
          if (v) d.words = v;
          else delete d.words;
          touched();
          repaint();
          drawRail();
          drawInspector();
        }), "Plays when the slide arrives in the show — eased, with a little motion blur. Held still for anyone who asked for less motion."));
        if (d.words) {
          insp.appendChild(UI.field("Speed", UI.select([
            { value: "gentle", label: "Gentle — slower, and holds longer" },
            { value: "medium", label: "Medium" },
            { value: "quick", label: "Quick" }
          ], String(d.wordSpeed || "medium"), function(v) {
            if (v && v !== "medium") d.wordSpeed = v;
            else delete d.wordSpeed;
            touched();
            repaint();
          }), "Moves the whole thing together — each word, the wave between them, and the hold if they leave again."));
          insp.appendChild(UI.field("Spacing", UI.select([
            { value: "together", label: "Together — the line arrives as one" },
            { value: "wave", label: "Wave — eased, a little apart" },
            { value: "one", label: "One at a time — the widest spread" }
          ], String(d.wordStagger || "wave"), function(v) {
            if (v && v !== "wave") d.wordStagger = v;
            else delete d.wordStagger;
            touched();
            repaint();
            drawInspector();
          }), "How far apart the words are. The wave is always eased — it starts quickly and slows as it finishes."));
          if ((d.wordStagger || "wave") !== "together") {
            insp.appendChild(UI.field("Direction", UI.select([
              { value: "first", label: "From the first word" },
              { value: "last", label: "From the last word" },
              { value: "center", label: "From the centre — outwards to both ends" }
            ], String(d.wordFrom || "first"), function(v) {
              if (v && v !== "first") d.wordFrom = v;
              else delete d.wordFrom;
              touched();
              repaint();
            }), "Which end the wave starts from. From the centre sends it outwards both ways at once; with an even number of words the middle two share the first beat."));
          }
          var planBox = el("div", "word-plan");
          var plan = d.wordPlan;
          var planFresh = plan && String(plan.text || "").trim() === String(s.body || "").trim();
          var planSummary = function() {
            var n = (plan.words || []).length;
            var arcs = [];
            (plan.words || []).forEach(function(w) {
              var a = w && w.arc || "settle";
              if (arcs.indexOf(a) < 0) arcs.push(a);
            });
            return n + " " + (plan.unit === "letter" ? "letter" : "word") + (n === 1 ? "" : "s") + " placed, landing " + arcs.join(" and ") + ".";
          };
          var planStatus = el(
            "p",
            "hint",
            planFresh ? "✨ Choreographed" + (plan.note ? ": " + plan.note : "") + " — " + planSummary() : plan ? "The choreography was written for different words. Ask again, or clear it." : "Per-word coordinates: where each word comes from, how it turns, when, and how it lands — settling, bouncing, or condensing out of mist. Ask for letter by letter and it works in letters."
          );
          var brief = UI.text("", function() {
          });
          brief.placeholder = "Optional: bounce in, out of smoke, one letter at a time…";
          var ask = UI.button("✨ Choreograph these words", "primary", function() {
            if (!SF.AI || !SF.AI.generateWordMotion) {
              planStatus.textContent = "The AI engine is not loaded in this build.";
              return;
            }
            ask.disabled = true;
            planStatus.textContent = "✨ Placing the words…";
            Promise.resolve(SF.AI.generateWordMotion(s.body, { mood: brief.value })).then(function(res) {
              if (!res || res.error) {
                planStatus.textContent = res && res.error || "Nothing came back.";
                return;
              }
              d.wordPlan = {
                text: String(s.body || "").trim(),
                note: res.note,
                unit: res.unit === "letter" ? "letter" : "word",
                words: res.words
              };
              if (!d.words) d.words = "rise";
              touched();
              repaint();
              drawInspector();
            }).catch(function() {
              planStatus.textContent = "Could not write a choreography just now.";
            }).finally(function() {
              ask.disabled = false;
            });
          });
          planBox.appendChild(brief);
          planBox.appendChild(ask);
          if (plan) {
            planBox.appendChild(UI.button("Clear choreography", "ghost", function() {
              delete d.wordPlan;
              touched();
              repaint();
              drawInspector();
            }));
          }
          planBox.appendChild(planStatus);
          insp.appendChild(UI.field("AI choreography", planBox));
          insp.appendChild(UI.field("And leave again", UI.select([
            { value: "", label: "No — they arrive and stay" },
            { value: "loop", label: "Yes — in, hold, out, round again" }
          ], d.wordsLoop ? "loop" : "", function(v) {
            if (v) d.wordsLoop = true;
            else delete d.wordsLoop;
            touched();
            repaint();
            drawRail();
          }), "For a cover on screen while the room fills. Four seconds of the six are the hold, so the line is readable every time round."));
        }
      }
    }
    var PANES = [
      {
        key: "edit",
        icon: "✎",
        label: "Edit",
        tab: true,
        title: "Edit the words on this slide",
        draw: function(insp, s) {
          helpers.drawContentFields()(insp, s);
          drawUnusedOnLayout(insp, s);
        }
      },
      {
        key: "customise",
        icon: "✦",
        label: "Look",
        tab: true,
        title: "Customise this slide",
        draw: function(insp, s) {
          SF.Custom.inspector(insp, s, function() {
            touched();
            draw();
          }, { bare: true });
        }
      },
      /* \u25A5, not \u25A6: \u25A6 belongs to Arrange in the face row above, which
         edits the lattice this glyph depicts. */
      {
        key: "layout",
        icon: "▥",
        label: "Layout",
        tab: true,
        title: "Choose a different layout",
        draw: function(insp, s) {
          drawLayoutPicker(insp, s);
        }
      },
      {
        key: "transition",
        icon: "↝",
        label: "Motion",
        tab: true,
        title: "How this slide arrives",
        draw: drawMotion,
        /* Ran after the chain in js/editor.js, guarded on the same key. */
        after: function(insp, s) {
          SF.Custom.tagControls(insp, s, "Motion");
        }
      },
      /* Opened by the face row, not the tab strip. The panel is built once by
         js/header-footer.js and re-parented on every draw, so it keeps focus. */
      {
        key: "chrome",
        tab: false,
        draw: function(insp) {
          if (SF.HeaderFooterUI) SF.HeaderFooterUI.mount(insp);
        }
      }
    ];
    function paneFor(key) {
      for (var i = 0; i < PANES.length; i++) if (PANES[i].key === key) return PANES[i];
      return PANES[0];
    }
    function drawPane(insp, s, key) {
      var pane = paneFor(key);
      pane.draw(insp, s);
      if (pane.after) pane.after(insp, s);
    }
    function tabs() {
      return PANES.filter(function(p) {
        return p.tab;
      });
    }
    return { PANES, paneFor, drawPane, tabs };
  }

  // src/editor/rail.js
  function createRail(SF, helpers) {
    const {
      el,
      $,
      touched,
      draw,
      current,
      drawInspector,
      addSlide,
      restoreHistory,
      gameFor,
      slideOpts,
      openActivityLibrary,
      setSel
    } = helpers;
    var dragFrom = null;
    var placing = null;
    var placeAt = null;
    var caretAt = null;
    function reorder(indices, at) {
      var deck = helpers.deck();
      var picked2 = indices.slice().sort(function(a, b) {
        return a - b;
      });
      if (!picked2.length) return -1;
      at = Math.max(0, Math.min(deck.slides.length, at));
      var taken = {};
      picked2.forEach(function(i2) {
        taken[i2] = true;
      });
      var moved = picked2.map(function(i2) {
        return deck.slides[i2];
      });
      var next = [], landed = -1;
      for (var i = 0; i <= deck.slides.length; i++) {
        if (i === at) {
          landed = next.length;
          next = next.concat(moved);
        }
        if (i < deck.slides.length && !taken[i]) next.push(deck.slides[i]);
      }
      if (next.length !== deck.slides.length) return -1;
      var same = next.every(function(slide, i2) {
        return slide === deck.slides[i2];
      });
      if (same) return -1;
      deck.slides.length = 0;
      for (var n = 0; n < next.length; n++) deck.slides.push(next[n]);
      return landed;
    }
    function moveSlide(from, at) {
      var deck = helpers.deck();
      if (from == null || at == null || !deck.slides[from]) return false;
      var landed = reorder([from], at);
      if (landed < 0) return false;
      setSel(landed);
      return true;
    }
    function slotFor(row, clientY) {
      var i = Number(row.dataset.i);
      var box2 = row.getBoundingClientRect();
      return clientY < box2.top + box2.height / 2 ? i : i + 1;
    }
    function showCaret(at) {
      var rail = $("railList");
      if (!rail) return null;
      if (at === caretAt) return at == null ? null : (
        /** @type {HTMLElement|null} */
        rail.querySelector(".rail-slot.at")
      );
      caretAt = at;
      var was = rail.querySelectorAll(".rail-slot.at");
      for (var i = 0; i < was.length; i++) was[i].classList.remove("at");
      var slot = (
        /** @type {HTMLElement|null} */
        at == null ? null : rail.querySelector('.rail-slot[data-at="' + at + '"]')
      );
      if (slot) slot.classList.add("at");
      return slot;
    }
    var folds = { deck: "", ids: (
      /** @type {Record<string, boolean>} */
      {}
    ) };
    function foldsFor(deck) {
      if (folds.deck !== deck.id) {
        folds.deck = deck.id;
        folds.ids = {};
        try {
          folds.ids = JSON.parse(sessionStorage.getItem("slideforge.folds." + deck.id) || "{}") || {};
        } catch (e) {
        }
      }
      return folds.ids;
    }
    function saveFolds(deck) {
      try {
        sessionStorage.setItem("slideforge.folds." + deck.id, JSON.stringify(folds.ids));
      } catch (e) {
      }
    }
    function sectionOf(deck, i) {
      for (var k = i; k >= 0; k--) if (deck.slides[k] && deck.slides[k].type === "section") return k;
      return -1;
    }
    function sectionLength(deck, i) {
      var n = 0;
      for (var k = i + 1; k < deck.slides.length && deck.slides[k].type !== "section"; k++) n++;
      return n;
    }
    function toggleFold(i) {
      var deck = helpers.deck();
      var s = deck.slides[i];
      if (!s || s.type !== "section") return;
      var ids = foldsFor(deck);
      if (ids[s.id]) delete ids[s.id];
      else ids[s.id] = true;
      saveFolds(deck);
      var sel = helpers.sel();
      if (ids[s.id] && sel > i && sectionOf(deck, sel) === i) setSel(i);
      draw();
      focusThumb(i);
    }
    function moveSection(i, dir) {
      var deck = helpers.deck();
      var s = deck.slides[i];
      if (!s || s.type !== "section") return false;
      var len = sectionLength(deck, i);
      var block = [];
      for (var k = i; k <= i + len; k++) block.push(k);
      var at;
      if (dir < 0) {
        if (i === 0) return false;
        var prev = sectionOf(deck, i - 1);
        at = prev < 0 ? 0 : prev;
      } else {
        var next = i + len + 1;
        if (next >= deck.slides.length) return false;
        at = deck.slides[next].type === "section" ? next + sectionLength(deck, next) + 1 : next + 1;
      }
      var landed = reorder(block, at);
      if (landed < 0) return false;
      setSel(landed);
      touched();
      draw();
      focusThumb(landed);
      return true;
    }
    function focusThumb(i) {
      var rail = $("railList");
      var row = (
        /** @type {HTMLElement|null} */
        rail && rail.querySelector('.thumb[data-i="' + i + '"]')
      );
      if (!row) return;
      row.focus();
      row.scrollIntoView({ block: "nearest" });
    }
    function beginPlacing(i) {
      var deck = helpers.deck();
      if (!deck.slides[i] || placing != null) return;
      setSel(i);
      placing = i;
      placeAt = i;
      draw();
      var slot = showCaret(placeAt);
      if (slot) slot.focus();
    }
    function movePlaceTo(at) {
      var deck = helpers.deck();
      if (placing == null) return;
      placeAt = Math.max(0, Math.min(deck.slides.length, at));
      var slot = showCaret(placeAt);
      if (slot) {
        slot.focus();
        slot.scrollIntoView({ block: "nearest" });
      }
      drawPlacingBar();
    }
    function commitPlacing(at) {
      var sel = helpers.sel();
      if (placing == null) return;
      var from = placing;
      var to = at == null ? placeAt : at;
      placing = null;
      placeAt = null;
      caretAt = null;
      if (moveSlide(from, to)) touched();
      draw();
      focusThumb(sel);
    }
    function cancelPlacing() {
      var sel = helpers.sel();
      if (placing == null) return;
      placing = null;
      placeAt = null;
      caretAt = null;
      draw();
      focusThumb(sel);
    }
    function drawPlacingBar() {
      var deck = helpers.deck();
      var UI = helpers.UI();
      var rail = $("railList");
      var host = rail && rail.parentNode;
      if (!rail || !host) return;
      var found = host.querySelector(".rail-placing");
      if (placing == null) {
        if (found) host.removeChild(found);
        return;
      }
      var bar = (
        /** @type {HTMLElement} */
        found || el("div", "rail-placing")
      );
      if (!found) host.insertBefore(bar, rail);
      bar.innerHTML = "";
      var s = deck.slides[placing];
      var lands = placeAt > placing ? placeAt : placeAt + 1;
      bar.appendChild(el("strong", null, "Carrying slide " + (placing + 1) + " → lands at " + lands));
      bar.appendChild(el("span", "rail-placing-what", s.title || SF.SLIDE_TYPES[s.type].label));
      bar.appendChild(el(
        "span",
        "rail-placing-hint",
        "↑ ↓ Home End to choose a place · Enter to drop it · Esc to cancel"
      ));
      bar.appendChild(UI.button("Cancel", "ghost", cancelPlacing));
    }
    var scroller = { y: null, raf: 0 };
    function autoScroll() {
      scroller.raf = 0;
      var rail = $("railList");
      if (!rail || scroller.y == null) return;
      var box2 = rail.getBoundingClientRect();
      var margin = 56, top = 0;
      if (scroller.y < box2.top + margin) top = (scroller.y - box2.top - margin) / margin;
      else if (scroller.y > box2.bottom - margin) top = (scroller.y - box2.bottom + margin) / margin;
      if (top) rail.scrollTop += Math.max(-1, Math.min(1, top)) * 18;
      scroller.raf = requestAnimationFrame(autoScroll);
    }
    function endDrag() {
      dragFrom = null;
      scroller.y = null;
      if (scroller.raf) cancelAnimationFrame(scroller.raf);
      scroller.raf = 0;
      showCaret(placing == null ? null : placeAt);
      var rail = $("railList");
      if (rail) rail.classList.remove("dragging");
    }
    function dropAt(at) {
      var sel = helpers.sel();
      var from = dragFrom;
      endDrag();
      if (!moveSlide(from, at)) return;
      touched();
      draw();
      focusThumb(sel);
    }
    function wireDrag(row) {
      row.addEventListener("dragstart", function(e) {
        dragFrom = Number(row.dataset.i);
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(dragFrom));
        } catch (err) {
        }
        var rail = $("railList");
        if (rail) rail.classList.add("dragging");
      });
      row.addEventListener("dragend", endDrag);
      row.addEventListener("dragover", function(e) {
        if (dragFrom == null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        showCaret(slotFor(row, e.clientY));
      });
      row.addEventListener("drop", function(e) {
        if (dragFrom == null) return;
        e.preventDefault();
        dropAt(slotFor(row, e.clientY));
      });
    }
    function railSlot(at) {
      var deck = helpers.deck();
      var slot = el("div", "rail-slot");
      slot.dataset.at = String(at);
      if (placing != null) {
        slot.tabIndex = 0;
        slot.setAttribute("role", "button");
        slot.setAttribute("aria-label", at >= deck.slides.length ? "Drop after the last slide" : "Drop before slide " + (at + 1));
        slot.onclick = function(e) {
          e.stopPropagation();
          commitPlacing(at);
        };
        slot.onfocus = function() {
          placeAt = at;
          showCaret(at);
          drawPlacingBar();
        };
      }
      slot.addEventListener("dragover", function(e) {
        if (dragFrom == null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        showCaret(at);
      });
      slot.addEventListener("drop", function(e) {
        if (dragFrom == null) return;
        e.preventDefault();
        dropAt(at);
      });
      return slot;
    }
    function toggleHidden(i) {
      var deck = helpers.deck();
      var s = deck.slides[i];
      if (!s) return;
      if (s.hidden === true) delete s.hidden;
      else s.hidden = true;
      touched();
      draw();
      SF.toast(s.hidden === true ? '"' + (s.title || SF.SLIDE_TYPES[s.type].label) + '" is hidden from the show. It stays in the deck.' : '"' + (s.title || SF.SLIDE_TYPES[s.type].label) + '" is back in the show.');
    }
    function drawRail() {
      var deck = helpers.deck();
      var sel = helpers.sel();
      var UI = helpers.UI();
      var rail = $("railList");
      if (!rail) return;
      if (placing != null && !deck.slides[placing]) {
        placing = null;
        placeAt = null;
      }
      rail.innerHTML = "";
      rail.classList.toggle("placing", placing != null);
      caretAt = null;
      var count = $("railCount");
      var go = (
        /** @type {HTMLInputElement|null} */
        $("railGo")
      );
      var total = $("railTotal");
      var off = deck.slides.filter(function(x) {
        return x.hidden === true;
      }).length;
      var n = deck.slides.length;
      if (go && go !== document.activeElement) {
        go.max = String(Math.max(1, n));
        go.value = String(sel + 1);
      }
      if (total) total.textContent = String(n);
      if (count) {
        count.textContent = off ? n - off + " of " + n : String(n);
        count.title = off ? off + " slide" + (off === 1 ? "" : "s") + " hidden from the show" : "";
      }
      drawSorterButton();
      var foldIds = foldsFor(deck);
      var home = sectionOf(deck, sel);
      if (home >= 0 && home !== sel && foldIds[deck.slides[home].id]) {
        delete foldIds[deck.slides[home].id];
        saveFolds(deck);
      }
      rail.ondragover = function(e) {
        if (dragFrom == null) return;
        e.preventDefault();
        scroller.y = e.clientY;
        if (!scroller.raf) scroller.raf = requestAnimationFrame(autoScroll);
      };
      var list = (
        /** @type {HTMLElement} */
        rail
      );
      list.appendChild(railSlot(0));
      deck.slides.forEach(function(s, i) {
        var row = el("div", "thumb" + (i === sel ? " sel" : "") + (i === placing ? " carried" : "") + (s.hidden === true ? " hidden-slide" : ""));
        row.draggable = true;
        row.tabIndex = 0;
        row.dataset.index = String(i);
        row.setAttribute("role", "button");
        row.setAttribute("aria-label", "Slide " + (i + 1) + ": " + (s.title || SF.SLIDE_TYPES[s.type].label) + (s.hidden === true ? " — hidden from the show" : ""));
        row.setAttribute("aria-current", i === sel ? "true" : "false");
        row.onkeydown = function(e) {
          if (e.target !== row) return;
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          if (placing != null) commitPlacing(slotFor(row, row.getBoundingClientRect().top));
          else select(i);
        };
        row.dataset.i = String(i);
        var owner = sectionOf(deck, i);
        if (owner >= 0 && owner !== i && foldIds[deck.slides[owner].id]) row.hidden = true;
        var gutter = el("div", "thumb-gutter");
        gutter.appendChild(el("div", "num", String(i + 1)));
        if (s.type === "section") {
          var inside = sectionLength(deck, i);
          var shut = !!foldIds[s.id];
          row.classList.add("section-row");
          if (shut) {
            row.classList.add("section-folded");
            row.dataset.folded = inside + " slide" + (inside === 1 ? "" : "s") + " folded";
          }
          if (inside) {
            var fold = UI.button(shut ? "▸" : "▾", "thumb-fold", function(e) {
              e.stopPropagation();
              toggleFold(i);
            });
            fold.setAttribute("aria-expanded", String(!shut));
            var what = (s.title || "this section").replace(/\s+/g, " ");
            fold.setAttribute("aria-label", (shut ? "Show " : "Fold ") + inside + " slide" + (inside === 1 ? "" : "s") + " in " + what);
            fold.title = shut ? "Show the " + inside + " slides in this section" : "Fold this section away (" + inside + " slides)";
            gutter.appendChild(fold);
          }
        }
        var grip = UI.button("⠿", "thumb-grip", function(e) {
          e.stopPropagation();
          beginPlacing(i);
        });
        grip.title = "Pick this slide up to move it (⌘X). Drag to nudge it a place or two.";
        grip.setAttribute("aria-label", "Move slide " + (i + 1));
        gutter.appendChild(grip);
        var eye = UI.button(s.hidden === true ? "⦸" : "👁", "thumb-hide", function(e) {
          e.stopPropagation();
          toggleHidden(i);
        });
        eye.title = s.hidden === true ? "Hidden from the show — click to put it back (H)" : "Hide from the show, keeping it in the deck (H)";
        eye.setAttribute("aria-label", (s.hidden === true ? "Show" : "Hide") + " slide " + (i + 1));
        eye.setAttribute("aria-pressed", String(s.hidden === true));
        gutter.appendChild(eye);
        row.appendChild(gutter);
        var body = el("div", "thumb-body");
        var frame = el("div", "frame");
        if (s.type === "game") {
          var g = gameFor(s);
          frame.appendChild(el("div", "badge quiz", g ? "GAME" : "MISSING"));
        } else if (s.feedback && s.feedback.kind) {
          var live = SF.slideFeedback(s);
          frame.appendChild(el(
            "div",
            "badge fb" + (live ? "" : " warn"),
            SF.FEEDBACK_KINDS[s.feedback.kind].icon + (live ? "" : " !")
          ));
        }
        var act = s.activity && SF.Activities && SF.Activities.activity(s.activity);
        if (act) {
          var ph = SF.Activities.PHASES.find(function(p) {
            return p.key === act.phase;
          });
          var mark = el(
            "div",
            "badge act" + (act.target === "moment" ? " timed" : ""),
            (ph ? ph.label : "Activity").toUpperCase()
          );
          mark.title = act.title + (act.minutes ? " · about " + act.minutes + " min" : "");
          frame.appendChild(mark);
        }
        body.appendChild(frame);
        var node = SF.renderSlide(deck, s, Object.assign(slideOpts(i), { chrome: false }));
        frame.appendChild(node);
        row.appendChild(body);
        var tx = s.transition || "fade";
        var txIcon = { none: "—", fade: "◌", push: "→", zoom: "⊕", wipe: "▭" }[tx] || "◌";
        var txLabel = tx === "none" ? "None" : tx.charAt(0).toUpperCase() + tx.slice(1);
        var txMark = el("span", "thumb-tx", txIcon);
        txMark.title = "Transition: " + txLabel;
        txMark.setAttribute("aria-label", "Transition " + txLabel);
        row.appendChild(txMark);
        row.onclick = function(e) {
          if (placing != null) commitPlacing(slotFor(row, e.clientY));
          else select(i);
        };
        wireDrag(row);
        list.appendChild(row);
        list.appendChild(railSlot(i + 1));
        requestAnimationFrame(function() {
          SF.fit(frame, node);
        });
      });
      drawPlacingBar();
      if (placing != null) showCaret(placeAt);
    }
    function drawSorterButton() {
      var deck = helpers.deck();
      var btn = $("btnSorter");
      if (!btn) return;
      btn.title = "Block view — the whole deck at once, to rearrange it (⌘G)";
      btn.setAttribute("aria-label", "Block view of all slides");
      btn.onclick = openSorter;
    }
    function select(i) {
      var deck = helpers.deck();
      setSel(Math.max(0, Math.min(deck.slides.length - 1, i)));
      draw();
    }
    function nudge(delta) {
      var sel = helpers.sel();
      if (!moveSlide(sel, sel + (delta > 0 ? delta + 1 : delta))) return;
      touched();
      draw();
      focusThumb(sel);
    }
    function sendTo(at) {
      var deck = helpers.deck();
      var sel = helpers.sel();
      if (!moveSlide(sel, at)) return;
      touched();
      draw();
      focusThumb(sel);
    }
    var sorter = null;
    var picked = [];
    var anchor = 0;
    var sorterDrag = false;
    var sorterAt = null;
    function sorterOpen() {
      return !!sorter;
    }
    function openSorter() {
      var sel = helpers.sel();
      if (sorter) return;
      picked = [sel];
      anchor = sel;
      sorter = el("div", "sorter");
      document.body.appendChild(sorter);
      document.body.classList.add("sorter-on");
      drawSorter();
      var tile = sorter.querySelector(".sorter-tile.sel");
      if (tile) {
        tile.focus();
        tile.scrollIntoView({ block: "center" });
      }
    }
    function closeSorter() {
      var sel = helpers.sel();
      if (!sorter) return;
      sorter.remove();
      sorter = null;
      sorterDrag = false;
      sorterAt = null;
      document.body.classList.remove("sorter-on");
      draw();
      focusThumb(sel);
    }
    function pick(i, e) {
      if (e && e.shiftKey) {
        var lo = Math.min(anchor, i), hi = Math.max(anchor, i);
        picked = [];
        for (var n = lo; n <= hi; n++) picked.push(n);
      } else if (e && (e.metaKey || e.ctrlKey)) {
        var at = picked.indexOf(i);
        if (at < 0) picked.push(i);
        else if (picked.length > 1) picked.splice(at, 1);
        anchor = i;
      } else {
        picked = [i];
        anchor = i;
      }
      setSel(i);
      drawSorter();
    }
    function sorterSlotFor(tile, clientX) {
      var i = Number(tile.dataset.i);
      var box2 = tile.getBoundingClientRect();
      return clientX < box2.left + box2.width / 2 ? i : i + 1;
    }
    function showSorterCaret(at) {
      if (!sorter) return;
      sorterAt = at;
      var bar = (
        /** @type {HTMLElement|null} */
        sorter.querySelector(".sorter-caret")
      );
      if (!bar) return;
      if (at == null) {
        bar.hidden = true;
        return;
      }
      var tiles = sorter.querySelectorAll(".sorter-tile");
      var last = at >= tiles.length;
      var tile = (
        /** @type {HTMLElement|null} */
        tiles[last ? tiles.length - 1 : at]
      );
      if (!tile) {
        bar.hidden = true;
        return;
      }
      bar.hidden = false;
      bar.style.top = tile.offsetTop + "px";
      bar.style.height = tile.offsetHeight + "px";
      bar.style.left = (last ? tile.offsetLeft + tile.offsetWidth + 5 : tile.offsetLeft - 7) + "px";
    }
    function sorterDrop(at) {
      var count = picked.length;
      var landed = reorder(picked, at);
      sorterDrag = false;
      showSorterCaret(null);
      if (landed < 0) return;
      picked = [];
      for (var n = 0; n < count; n++) picked.push(landed + n);
      setSel(landed);
      anchor = landed;
      touched();
      drawSorter();
      var tile = sorter && sorter.querySelector(".sorter-tile.sel");
      if (tile) tile.focus();
    }
    function drawSorter() {
      var deck = helpers.deck();
      var sel = helpers.sel();
      var UI = helpers.UI();
      if (!sorter) return;
      picked = picked.filter(function(i) {
        return deck.slides[i];
      });
      if (!picked.length) picked = [Math.min(sel, deck.slides.length - 1)];
      sorter.innerHTML = "";
      var head = el("div", "sorter-head");
      head.appendChild(el("strong", null, "Slide sorter"));
      head.appendChild(el(
        "span",
        "sorter-count",
        deck.slides.length + " slides" + (picked.length > 1 ? " · " + picked.length + " selected" : "")
      ));
      head.appendChild(el(
        "span",
        "sorter-hint",
        "Drag to move · shift-click for a run · ⌘-click to add · ↵ to edit · esc to close"
      ));
      head.appendChild(UI.button("Done", "primary", closeSorter));
      sorter.appendChild(head);
      var grid = el("div", "sorter-grid");
      var bar = el("div", "sorter-caret");
      bar.hidden = true;
      grid.appendChild(bar);
      deck.slides.forEach(function(s, i) {
        var on = picked.indexOf(i) >= 0;
        var tile = el("div", "sorter-tile" + (on ? " sel" : ""));
        tile.dataset.i = String(i);
        tile.draggable = true;
        tile.tabIndex = 0;
        tile.setAttribute("role", "button");
        tile.setAttribute("aria-label", "Slide " + (i + 1) + ": " + (s.title || SF.SLIDE_TYPES[s.type].label));
        tile.setAttribute("aria-pressed", on ? "true" : "false");
        if (s.type === "section") {
          tile.classList.add("sorter-section");
          tile.setAttribute("data-section", "Section · " + (sectionLength(deck, i) + 1) + " slides");
        }
        var frame = el("div", "frame");
        var node = SF.renderSlide(deck, s, Object.assign(slideOpts(i), { chrome: false }));
        frame.appendChild(node);
        tile.appendChild(frame);
        var foot = el("div", "sorter-foot");
        foot.appendChild(el("span", "sorter-num", String(i + 1)));
        foot.appendChild(el("span", "sorter-title", oneLine(s.title) || SF.SLIDE_TYPES[s.type].label));
        tile.appendChild(foot);
        tile.onclick = function(e) {
          pick(i, e);
        };
        tile.ondblclick = function() {
          setSel(i);
          closeSorter();
        };
        tile.addEventListener("dragstart", function(e) {
          if (picked.indexOf(i) < 0) {
            picked = [i];
            anchor = i;
            drawSorter();
          }
          sorterDrag = true;
          e.dataTransfer.effectAllowed = "move";
          try {
            e.dataTransfer.setData("text/plain", String(i));
          } catch (err) {
          }
        });
        tile.addEventListener("dragend", function() {
          sorterDrag = false;
          showSorterCaret(null);
        });
        tile.addEventListener("dragover", function(e) {
          if (!sorterDrag) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          showSorterCaret(sorterSlotFor(tile, e.clientX));
        });
        tile.addEventListener("drop", function(e) {
          if (!sorterDrag) return;
          e.preventDefault();
          sorterDrop(sorterSlotFor(tile, e.clientX));
        });
        grid.appendChild(tile);
        requestAnimationFrame(function() {
          SF.fit(frame, node);
        });
      });
      grid.addEventListener("dragover", function(e) {
        if (!sorterDrag || e.target !== grid) return;
        e.preventDefault();
        showSorterCaret(deck.slides.length);
      });
      grid.addEventListener("drop", function(e) {
        if (!sorterDrag || e.target !== grid) return;
        e.preventDefault();
        sorterDrop(deck.slides.length);
      });
      sorter.appendChild(grid);
    }
    function oneLine(text2) {
      return String(text2 || "").replace(/\s+/g, " ").trim();
    }
    function sorterColumns() {
      if (!sorter) return 1;
      var tiles = sorter.querySelectorAll(".sorter-tile");
      if (tiles.length < 2) return 1;
      var top = (
        /** @type {HTMLElement} */
        tiles[0].offsetTop
      ), n = 0;
      for (var i = 0; i < tiles.length; i++) {
        if (
          /** @type {HTMLElement} */
          tiles[i].offsetTop !== top
        ) break;
        n++;
      }
      return Math.max(1, n);
    }
    function sorterKeys(e) {
      var deck = helpers.deck();
      var sel = helpers.sel();
      var mod = e.metaKey || e.ctrlKey;
      var last = deck.slides.length - 1;
      var step = null;
      if (e.key === "Escape") {
        e.preventDefault();
        closeSorter();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        closeSorter();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        picked = deck.slides.map(function(s, i) {
          return i;
        });
        drawSorter();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        restoreHistory(e.shiftKey);
        drawSorter();
        return;
      }
      if (e.key === "ArrowRight") step = sel + 1;
      else if (e.key === "ArrowLeft") step = sel - 1;
      else if (e.key === "ArrowDown") step = sel + sorterColumns();
      else if (e.key === "ArrowUp") step = sel - sorterColumns();
      else if (e.key === "Home") step = 0;
      else if (e.key === "End") step = last;
      if (step == null) return;
      e.preventDefault();
      var to = Math.max(0, Math.min(last, step));
      if (e.altKey) {
        var group = picked.length ? picked : [sel];
        var lo = Math.min.apply(null, group), hi = Math.max.apply(null, group);
        var cols = sorterColumns();
        var at = e.key === "ArrowRight" ? hi + 2 : e.key === "ArrowLeft" ? lo - 1 : e.key === "ArrowDown" ? hi + cols + 1 : e.key === "ArrowUp" ? lo - cols : e.key === "Home" ? 0 : last + 1;
        if (!picked.length) picked = [sel];
        var landed = reorder(picked, at);
        if (landed < 0) return;
        var count = picked.length;
        picked = [];
        for (var n = 0; n < count; n++) picked.push(landed + n);
        setSel(landed);
        anchor = landed;
        touched();
        drawSorter();
      } else {
        pick(to, e.shiftKey ? { shiftKey: true } : null);
      }
      var tile = sorter && sorter.querySelector(".sorter-tile.sel");
      if (tile) {
        tile.focus();
        tile.scrollIntoView({ block: "nearest" });
      }
    }
    function drawFoot() {
      var UI = helpers.UI();
      var foot = $("railFoot");
      if (!foot) return;
      foot.innerHTML = "";
      var s = current();
      if (s) {
        var txWrap = el("div", "rail-tx");
        var lab = el("label", null, "Transition in");
        var txSel = UI.select(
          SF.TRANSITIONS.map(function(t) {
            return { value: t, label: t[0].toUpperCase() + t.slice(1) };
          }),
          s.transition,
          function(v) {
            s.transition = v;
            touched();
            drawRail();
            drawInspector();
          }
        );
        if (!txSel.id) txSel.id = "rail-tx-" + SF.uid();
        lab.htmlFor = txSel.id;
        txWrap.appendChild(lab);
        txWrap.appendChild(txSel);
        txWrap.addEventListener("click", function(e) {
          e.stopPropagation();
        });
        foot.appendChild(txWrap);
      }
      var actions = el("div", "rail-actions");
      var addSlideBtn = UI.button("+ Slide", "primary", function() {
        if (SF.Studio && SF.Studio.openStarters) SF.Studio.openStarters();
        else addSlide("content");
      });
      addSlideBtn.title = "Insert a slide starter, then pick a layout";
      actions.appendChild(addSlideBtn);
      addSlideBtn.title = "Add a slide — a layout, or a game or activity";
      foot.appendChild(actions);
    }
    function isPlacing() {
      return placing != null;
    }
    function placeTarget() {
      return placeAt;
    }
    function resetPlacing() {
      placing = null;
      placeAt = null;
    }
    return {
      focusThumb,
      beginPlacing,
      movePlaceTo,
      commitPlacing,
      cancelPlacing,
      toggleHidden,
      drawRail,
      select,
      nudge,
      sendTo,
      sorterOpen,
      openSorter,
      closeSorter,
      pick,
      sorterKeys,
      drawFoot,
      isPlacing,
      placeTarget,
      resetPlacing,
      /* Sections, for the slide menu and the sorter. */
      sectionOf: function(i) {
        return sectionOf(helpers.deck(), i);
      },
      sectionLength: function(i) {
        return sectionLength(helpers.deck(), i);
      },
      toggleFold,
      moveSection,
      isFolded: function(i) {
        var deck = helpers.deck(), s = deck.slides[i];
        return !!(s && s.type === "section" && foldsFor(deck)[s.id]);
      }
    };
  }

  // src/editor/header-footer.js
  function installHeaderFooterUI(SF) {
    var open = false, scope = "deck", selected = "header-left";
    var panel, fields = {}, warning;
    function deck() {
      return SF.Editor && SF.Editor.deck();
    }
    function slide() {
      return SF.Editor && SF.Editor.currentSlide();
    }
    function clone2(value) {
      return JSON.parse(JSON.stringify(value));
    }
    function defaults() {
      return { enabled: false, hideOnCover: true, slots: {
        "header-left": { kind: "title" },
        "header-right": { kind: "logo" },
        "footer-left": { kind: "tagline" },
        "footer-right": { kind: "pages" }
      } };
    }
    function config() {
      if (!deck() || !slide()) return defaults();
      return (scope === "slide" ? SF.headerFooterConfig(deck(), slide()) : deck().headerFooter) || defaults();
    }
    function save(change) {
      var target = scope === "deck" ? deck() : slide();
      if (!target) return;
      var value = clone2(config());
      if (!value.slots || typeof value.slots !== "object") value.slots = {};
      change(value);
      target.headerFooter = value;
      SF.Editor.commitActivityChange();
      SF.Editor.refreshCanvas();
      refresh();
    }
    function updateItem(key, value) {
      save(function(c) {
        var item = c.slots[selected] || { kind: "empty" };
        item[key] = value;
        c.slots[selected] = item;
      });
    }
    function node(tag, text2, parent) {
      var n = document.createElement(tag);
      if (text2) n.textContent = text2;
      if (parent) parent.appendChild(n);
      return n;
    }
    function selectField(parent, label, name, choices, change) {
      var wrap = node("label", label, parent), input = node("select", "", wrap);
      choices.forEach(function(pair) {
        var o = node("option", pair[1], input);
        o.value = pair[0];
      });
      input.addEventListener("change", function() {
        change(input.value);
      });
      fields[name] = input;
      return input;
    }
    function textField(parent, label, name) {
      var wrap = node("label", label, parent), input = node("input", "", wrap);
      input.type = "text";
      input.addEventListener("change", function() {
        updateItem(name, input.value);
      });
      fields[name] = input;
    }
    function mount(host) {
      if (!host) return;
      if (!panel) install();
      if (!panel) return;
      host.appendChild(panel);
      open = true;
      refresh();
    }
    function refresh() {
      if (!panel) return;
      var preview = document.getElementById("previewBox");
      if (preview) preview.classList.toggle("hf-editing", open);
      if (!open || !deck() || !slide()) return;
      var c = config(), item = (c.slots || {})[selected] || { kind: "empty" };
      fields.enabled.checked = !!c.enabled;
      fields.hideOnCover.checked = !!c.hideOnCover;
      fields.scope.value = scope;
      fields.kind.value = item.kind || "empty";
      fields.placement.value = item.placement || "slot";
      fields.anchor.value = item.anchor || "middle-center";
      ["text", "alt"].forEach(function(k) {
        if (document.activeElement !== fields[k]) fields[k].value = item[k] || "";
      });
      fields.text.parentElement.hidden = item.kind !== "text";
      fields.alt.parentElement.hidden = item.kind !== "image" && item.kind !== "logo";
      fields.picture.parentElement.hidden = item.kind !== "image";
      fields.tagline.parentElement.hidden = item.kind !== "tagline";
      if (document.activeElement !== fields.tagline) fields.tagline.value = deck().closingNote || "";
      if (fields.date && document.activeElement !== fields.date) fields.date.value = slide().date || "";
      fields.anchor.parentElement.hidden = item.placement !== "canvas";
      panel.querySelectorAll("[data-hf-choice]").forEach(function(el) {
        var b = (
          /** @type {HTMLElement} */
          el
        );
        b.setAttribute("aria-pressed", String(b.dataset.hfChoice === selected));
      });
      if (preview) preview.querySelectorAll("[data-hf-slot]").forEach(function(el) {
        var n = (
          /** @type {HTMLElement} */
          el
        );
        n.toggleAttribute("data-hf-selected", n.dataset.hfSlot === selected);
      });
      var inherited = scope === "slide" && !slide().headerFooter;
      warning.textContent = inherited ? "Following presentation defaults. Your next edit creates a slide override." : scope === "deck" && slide().headerFooter ? "This slide has its own override. Choose This slide and Restore defaults to follow the presentation." : c.hideOnCover && (slide().type === "title" || deck().slides.indexOf(slide()) === 0) ? "Headers and footers are hidden on this cover." : !c.enabled ? "Enable headers and footers to display these slots." : "Empty neighbouring slots release space. Canvas placement may overlap content.";
      warning.classList.remove("hf-warning");
      requestAnimationFrame(function() {
        if (!open || !preview) return;
        var overflow = Array.from(preview.querySelectorAll(".sf-furniture-cell")).some(function(n) {
          return n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1;
        });
        if (overflow) {
          warning.textContent = "A slot is too full. Shorten its text or free a neighbouring slot.";
          warning.classList.add("hf-warning");
        }
        var body = preview.querySelector(".sf-hf-managed > .pad");
        if (body && (body.scrollHeight > body.clientHeight + 2 || body.scrollWidth > body.clientWidth + 2)) {
          warning.textContent = "Slide content exceeds the reserved body area. Adjust its layout or shorten the content.";
          warning.classList.add("hf-warning");
        }
      });
    }
    function setOpen(on) {
      open = !!on;
      if (open) {
        if (SF.Artwork && SF.Artwork.isEditing()) SF.Artwork.setEditing(false);
        if (SF.Arrange && SF.Arrange.isArranging()) SF.Arrange.setArranging(false);
      }
      refresh();
    }
    function install() {
      panel = node("section", "");
      panel.className = "hf-panel";
      panel.id = "headerFooterPanel";
      panel.setAttribute("aria-label", "Header and footer slots");
      var toolbar = node("div", "", panel);
      toolbar.className = "hf-toolbar";
      selectField(toolbar, "Apply to", "scope", [["deck", "Presentation defaults"], ["slide", "This slide"]], function(v) {
        scope = v;
        refresh();
      });
      ["enabled", "hideOnCover"].forEach(function(k) {
        var label2 = node("label", k === "enabled" ? "Enabled" : "Hide on covers", toolbar), input = node("input", "", label2);
        input.type = "checkbox";
        fields[k] = input;
        input.onchange = function() {
          save(function(c) {
            c[k] = input.checked;
          });
        };
      });
      var reset = node("button", "Restore defaults", toolbar);
      reset.type = "button";
      reset.className = "canvas-bar-btn";
      reset.onclick = function() {
        var target = scope === "deck" ? deck() : slide();
        if (!target) return;
        delete target.headerFooter;
        SF.Editor.commitActivityChange();
        SF.Editor.refreshCanvas();
        refresh();
        SF.toast(scope === "deck" ? "Theme header and footer restored." : "This slide follows the presentation defaults.");
      };
      var done = node("button", "Done", toolbar);
      done.type = "button";
      done.className = "canvas-bar-btn";
      done.onclick = function() {
        setOpen(false);
      };
      var slots = node("div", "", panel);
      slots.className = "hf-slots";
      ["header", "footer"].forEach(function(band) {
        ["left", "center", "right"].forEach(function(side) {
          var key = band + "-" + side, b = node("button", (band === "header" ? "Header" : "Footer") + " " + (side === "center" ? "centre" : side), slots);
          b.type = "button";
          b.dataset.hfChoice = key;
          b.onclick = function() {
            selected = key;
            refresh();
          };
        });
      });
      var form = node("div", "", panel);
      form.className = "hf-fields";
      selectField(form, "Content", "kind", [["empty", "Empty"], ["text", "Text"], ["image", "Image"], ["logo", "Presentation logo"], ["number", "Page number"], ["pages", "Page / total"], ["date", "Slide date"], ["tagline", "Theme tagline"], ["title", "Presentation title"], ["section", "Section title"]], function(v) {
        updateItem("kind", v);
      });
      selectField(form, "Place", "placement", [["slot", "Header / footer slot"], ["canvas", "Canvas anchor"]], function(v) {
        updateItem("placement", v);
      });
      var anchors = [];
      ["top", "middle", "bottom"].forEach(function(y) {
        ["left", "center", "right"].forEach(function(x) {
          anchors.push([y + "-" + x, y + " " + (x === "center" ? "centre" : x)]);
        });
      });
      selectField(form, "Anchor", "anchor", anchors, function(v) {
        updateItem("anchor", v);
      });
      textField(form, "Text", "text");
      textField(form, "Image description", "alt");
      var taglineLabel = node("label", "Presentation tagline", form), tagline = node("input", "", taglineLabel);
      tagline.type = "text";
      fields.tagline = tagline;
      tagline.placeholder = "Uses organisation name when blank";
      tagline.onchange = function() {
        if (!deck()) return;
        deck().closingNote = tagline.value;
        SF.Editor.commitActivityChange();
        SF.Editor.refreshCanvas();
        refresh();
      };
      var label = node("label", "Choose image", form), picture = node("input", "", label);
      picture.type = "file";
      picture.accept = "image/*";
      fields.picture = picture;
      picture.onchange = function() {
        var file = picture.files && picture.files[0];
        picture.value = "";
        if (!file) return;
        if (!/^image\//.test(file.type)) {
          SF.toast("Choose an image file.");
          return;
        }
        if (file.size > 3.5 * 1024 * 1024) {
          SF.toast("That file is " + (file.size / 1024 / 1024).toFixed(1) + " MB. Slot images have to stay under 3.5 MB, or the lesson outgrows the browser storage it is saved in.");
          return;
        }
        var owner = scope === "deck" ? deck() : slide(), selectedAtStart = selected, scopeAtStart = scope;
        var reader = new FileReader();
        reader.onload = function() {
          if (scope !== scopeAtStart || selected !== selectedAtStart || owner !== (scope === "deck" ? deck() : slide())) {
            SF.toast("Selection changed. Choose the image again in the intended slot.");
            return;
          }
          if (typeof reader.result !== "string") return;
          var dataUrl = reader.result, test = new Image();
          test.onload = function() {
            updateItem("src", dataUrl);
          };
          test.onerror = function() {
            SF.toast("That file is named like an image but the browser cannot draw it, so the slot would stay empty. Try a PNG or SVG.");
          };
          test.src = dataUrl;
        };
        reader.onerror = function() {
          SF.toast("Could not read that image.");
        };
        reader.readAsDataURL(file);
      };
      var dateWrap = node("div", "", panel);
      dateWrap.className = "hf-fields hf-date";
      var dateLabel = node("label", "Slide date", dateWrap), dateInput = node("input", "", dateLabel);
      dateInput.type = "date";
      fields.date = dateInput;
      dateInput.onchange = function() {
        var sl = slide();
        if (!sl) return;
        sl.date = dateInput.value;
        SF.Editor.commitActivityChange();
        SF.Editor.refreshCanvas();
        refresh();
      };
      var today = node("button", "Insert today", dateWrap);
      today.type = "button";
      today.className = "canvas-bar-btn";
      today.onclick = function() {
        var sl = slide();
        if (!sl) return;
        var d = /* @__PURE__ */ new Date();
        sl.date = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        SF.Editor.commitActivityChange();
        SF.Editor.refreshCanvas();
        refresh();
      };
      warning = node("p", "", panel);
      warning.className = "hf-hint";
      warning.setAttribute("aria-live", "polite");
      var preview = document.getElementById("previewBox");
      if (preview) preview.addEventListener("click", function(e) {
        if (!open) return;
        var from = (
          /** @type {Element|null} */
          e.target
        );
        var hit = from && from.closest ? from.closest("[data-hf-slot]") : null;
        if (!hit) return;
        selected = /** @type {string} */
        /** @type {HTMLElement} */
        hit.dataset.hfSlot;
        refresh();
      });
      document.addEventListener("keydown", function(e) {
        if (open && e.key === "Escape" && !e.defaultPrevented) {
          setOpen(false);
          e.preventDefault();
        }
      });
    }
    SF.HeaderFooterUI = {
      refresh,
      mount,
      /* Called on every draw of a different pane, so it has to be cheap and
         idempotent — only the canvas outlines and the open flag come off. */
      close: function() {
        if (open) setOpen(false);
      }
    };
  }

  // src/editor/artwork.js
  function installArtwork(SF) {
    var SLIDE_W2 = 1280;
    var BIG_IMAGE = 3.5 * 1024 * 1024;
    var editing = false;
    var selected = null;
    var selectedSlide = null;
    var cancelDrag = null;
    function box2() {
      return document.getElementById("previewBox");
    }
    function slide() {
      return SF.Editor && SF.Editor.currentSlide && SF.Editor.currentSlide();
    }
    function commit(repaint) {
      if (SF.Editor && SF.Editor.commitActivityChange) SF.Editor.commitActivityChange();
      if (repaint && SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
    }
    function artOf(s, make) {
      if (!s) return null;
      if (!s.art && make) s.art = { poses: {}, pictures: [] };
      if (s.art && make) {
        if (!s.art.poses) s.art.poses = {};
        if (!Array.isArray(s.art.pictures)) s.art.pictures = [];
      }
      return s.art || null;
    }
    function scaleOf(root) {
      var node = root && root.matches && root.matches(".slide") ? root : root && root.querySelector && root.querySelector(".slide") || root;
      var w = node ? node.getBoundingClientRect().width : 0;
      return w > 0 ? w / SLIDE_W2 : 1;
    }
    function targetOf(node) {
      var shape = node.closest && node.closest(".theme-art > *");
      if (shape) return { kind: "shape", key: shape.getAttribute("data-art-key"), node: shape };
      var pic = node.closest && node.closest(".slide-art-img");
      if (pic) return { kind: "picture", key: pic.getAttribute("data-art-pic"), node: pic };
      return null;
    }
    function pictureById(s, id) {
      var art = artOf(s);
      if (!art || !Array.isArray(art.pictures)) return null;
      return art.pictures.find(function(p) {
        return String(p.id) === String(id);
      }) || null;
    }
    function originOf(target, root) {
      if (target.kind === "picture") {
        var pic = pictureById(slide(), target.key);
        return { x: pic && pic.x || 0, y: pic && pic.y || 0 };
      }
      var node = target.node;
      if (node.offsetParent) return { x: Math.round(node.offsetLeft), y: Math.round(node.offsetTop) };
      var pose = readPose(target);
      return { x: Math.round(pose.x || 0), y: Math.round(pose.y || 0) };
    }
    function writePose(target, patch) {
      var s = slide();
      var art = artOf(s, true);
      if (!art) return;
      if (target.kind === "picture") {
        var pic = pictureById(s, target.key);
        if (pic) Object.assign(pic, patch);
        return;
      }
      art.poses[target.key] = Object.assign({}, art.poses[target.key], patch);
    }
    function readPose(target) {
      var s = slide();
      if (target.kind === "picture") return pictureById(s, target.key) || {};
      var art = artOf(s);
      return art && art.poses && art.poses[target.key] || {};
    }
    function select(target) {
      var root = box2();
      if (!root) return;
      root.querySelectorAll("[data-art-selected]").forEach(function(n) {
        n.removeAttribute("data-art-selected");
      });
      selected = target;
      selectedSlide = target ? slide() : null;
      if (target) target.node.setAttribute("data-art-selected", "");
      paintBar();
    }
    function markHidden(root) {
      if (!root) return;
      var s = slide();
      var art = artOf(s);
      root.querySelectorAll("[data-art-key]").forEach(function(n) {
        var pose = art && art.poses && art.poses[n.getAttribute("data-art-key")];
        if (pose && pose.hidden) {
          n.setAttribute("data-art-hidden", "");
          n.style.display = "block";
        } else n.removeAttribute("data-art-hidden");
      });
      root.querySelectorAll("[data-art-pic]").forEach(function(n) {
        var pic = pictureById(s, n.getAttribute("data-art-pic"));
        n.toggleAttribute("data-art-hidden", !!(pic && pic.hidden));
      });
    }
    function beginDrag(e) {
      if (!editing || e.button !== 0 || e.isPrimary === false) return;
      if (cancelDrag) cancelDrag();
      var root = box2();
      if (!root) return;
      var target = targetOf(e.target);
      if (!target) {
        select(null);
        return;
      }
      e.preventDefault();
      select(target);
      var picked = target;
      var owner = slide();
      var scale = scaleOf(root);
      var start = originOf(picked, root);
      var fromX = e.clientX;
      var fromY = e.clientY;
      var moved = false;
      function move(ev) {
        var dx = Math.round((ev.clientX - fromX) / scale);
        var dy = Math.round((ev.clientY - fromY) / scale);
        if (!moved && Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
        moved = true;
        var x = start.x + dx;
        var y = start.y + dy;
        picked.node.style.left = x + "px";
        picked.node.style.top = y + "px";
        picked.node.style.right = "auto";
        picked.node.style.bottom = "auto";
        picked.node.dataset.artDragX = String(x);
        picked.node.dataset.artDragY = String(y);
      }
      function cleanup() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", cancel);
        window.removeEventListener("blur", cancel);
        cancelDrag = null;
      }
      function cancel() {
        cleanup();
        if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
      }
      function up() {
        cleanup();
        if (slide() !== owner || !editing) return;
        if (!moved) return;
        writePose(picked, {
          x: Number(picked.node.dataset.artDragX),
          y: Number(picked.node.dataset.artDragY)
        });
        commit(false);
        SF.toast && SF.toast("Moved. This slide only — other slides keep the theme.");
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", cancel);
      window.addEventListener("blur", cancel);
      cancelDrag = cancel;
    }
    function setOrder(side) {
      if (!selected || side !== "back" && side !== "front") return;
      writePose(selected, { order: side });
      commit(true);
      afterPaint();
      if (side === "front" && selected && selected.kind === "picture") {
        SF.toast && SF.toast("In front of the words. Review slides & check fit will say if it covers them.");
      }
    }
    function setPlacement(where) {
      if (!selected || selected.kind !== "picture") return;
      var s = slide();
      var pic = pictureById(s, selected.key);
      if (!pic) return;
      var key = SF.artBlockKey(pic.id);
      var map = s.design && s.design.regions || null;
      if (where === "lattice") {
        pic.place = "lattice";
        if (!s.design) s.design = {};
        if (!s.design.regions) s.design.regions = {};
        map = s.design.regions;
        if (!map[key]) {
          var host = box2();
          var g = SF.latticeGeometry(host && host.querySelector(".slide"));
          var col = Math.max(1, Math.min(g.cols, Math.round((pic.x || 0) / g.stepX) + 1));
          var row = Math.max(1, Math.min(g.rows, Math.round((pic.y || 0) / g.stepY) + 1));
          var cols = Math.max(1, Math.min(g.cols - col + 1, Math.round((pic.w || 360) / g.stepX)));
          map[key] = { col, row, cols, rows: Math.max(2, Math.round(cols * 0.6)) };
        }
        SF.toast && SF.toast("On the lattice. Use Layout to move and size it.");
      } else {
        delete pic.place;
        SF.toast && SF.toast("Free again. Drag to move it.");
      }
      selected = null;
      commit(true);
      afterPaint();
    }
    function toggleHidden() {
      if (!selected) return;
      var pose = readPose(selected);
      writePose(selected, { hidden: !pose.hidden });
      commit(true);
      afterPaint();
    }
    function removeSelected() {
      if (!selected) return;
      if (selected.kind === "shape") return toggleHidden();
      var s = slide();
      var art = artOf(s);
      if (!art) return;
      art.pictures = art.pictures.filter(function(p) {
        return String(p.id) !== String(selected.key);
      });
      selected = null;
      commit(true);
      afterPaint();
    }
    function resizeSelected(by) {
      if (!selected) return;
      var pose = readPose(selected);
      if (selected.kind === "picture") {
        var w = Math.max(40, Math.round((pose.w || selected.node.getBoundingClientRect().width / scaleOf(box2())) + by));
        writePose(selected, { w });
      } else {
        var scale = Math.max(0.2, Math.round(((pose.scale || 1) + by / 200) * 100) / 100);
        writePose(selected, { scale });
      }
      commit(true);
      afterPaint();
    }
    function resetArt() {
      var s = slide();
      if (!s || !s.art) return;
      var kept = (s.art.pictures || []).length;
      s.art.poses = {};
      selected = null;
      if (!kept) delete s.art;
      commit(true);
      afterPaint();
      SF.toast && SF.toast(kept ? "Theme artwork reset. Your pictures are still here." : "Theme artwork reset.");
    }
    function addPicture(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        SF.toast && SF.toast("Choose an image file.");
        return;
      }
      var owner = slide();
      if (!owner) return;
      if (file.size > BIG_IMAGE) {
        SF.toast && SF.toast("That image is over 3.5 MB — it may exceed the browser storage limit.");
      }
      var fr = new FileReader();
      fr.onload = function() {
        if (slide() !== owner) {
          SF.toast && SF.toast("Slide changed. Select the picture again on the intended slide.");
          return;
        }
        var s = owner;
        var art = artOf(s, true);
        if (!art) return;
        var id = "pic-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        art.pictures.push({
          id,
          src: String(fr.result),
          x: 120,
          y: 120,
          w: 360,
          alt: ""
        });
        commit(true);
        afterPaint();
        var host = box2();
        var node = host && host.querySelector('[data-art-pic="' + id + '"]');
        if (node && editing) select({ kind: "picture", key: id, node });
        SF.toast && SF.toast("Picture placed. Drag to move it, − / + to size it.");
      };
      fr.onerror = function() {
        SF.toast && SF.toast("Could not read that picture. Please try another file.");
      };
      fr.readAsDataURL(file);
    }
    function paintBar() {
      var bar = document.getElementById("artBar");
      if (!bar) return;
      bar.hidden = !editing;
      var has = !!selected;
      var isShape = has && selected.kind === "shape";
      var pose = has ? readPose(selected) : {};
      bar.querySelectorAll("[data-art-needs-selection]").forEach(function(b) {
        b.disabled = !has;
      });
      var hide = document.getElementById("btnArtHide");
      if (hide) hide.textContent = pose.hidden ? "◉ Show" : "◌ Hide";
      var order2 = (
        /** @type {HTMLSelectElement|null} */
        document.getElementById("artOrder")
      );
      if (order2) {
        order2.value = SF.artOrder(pose, isShape ? "back" : "front");
        order2.disabled = !has;
        order2.title = "Whether this artwork paints behind the words or over them";
      }
      var place = (
        /** @type {HTMLSelectElement|null} */
        document.getElementById("artPlace")
      );
      if (place) {
        var pic = has && selected.kind === "picture" ? pictureById(slide(), selected.key) : null;
        place.disabled = !pic;
        place.value = pic ? SF.artPlacement(pic) : "free";
        place.title = pic ? "Free is placed by hand and can bleed off the slide. On the lattice it is a block: it takes rows and columns and the others push away from it." : "Only a picture you placed can move onto the lattice — a theme shape belongs to the theme";
      }
      var del = (
        /** @type {HTMLButtonElement|null} */
        document.getElementById("btnArtDelete")
      );
      if (del) {
        del.disabled = !has || isShape;
        del.title = isShape ? "Theme shapes belong to the theme — hide it instead" : "Remove this picture from the slide";
      }
      var what = document.getElementById("artWhat");
      if (what) {
        what.textContent = !has ? "Click a shape or picture" : isShape ? "Theme shape · " + selected.key : "Your picture";
      }
    }
    function afterPaint() {
      var root = box2();
      if (!root) return;
      var now = slide();
      if (selectedSlide && now && selectedSlide.id === now.id) selectedSlide = now;
      if (selectedSlide && !(now && selectedSlide.id === now.id)) {
        selected = null;
        selectedSlide = null;
        if (cancelDrag) cancelDrag();
      }
      root.classList.toggle("art-editing", editing);
      if (!editing) {
        paintBar();
        return;
      }
      markHidden(root);
      if (selected) {
        var again = selected.kind === "picture" ? root.querySelector('[data-art-pic="' + selected.key + '"]') : root.querySelector('[data-art-key="' + selected.key + '"]');
        if (again) {
          selected.node = again;
          again.setAttribute("data-art-selected", "");
        } else selected = null;
      }
      paintBar();
    }
    function setEditing(on) {
      if (on && SF.HeaderFooterUI) SF.HeaderFooterUI.close();
      if (on && SF.Arrange && SF.Arrange.isArranging()) SF.Arrange.setArranging(false);
      if (cancelDrag) cancelDrag();
      editing = !!on;
      if (!editing) selected = null;
      var toggle = document.getElementById("btnArtFlip");
      if (toggle) {
        toggle.setAttribute("aria-pressed", String(editing));
        toggle.textContent = editing ? "◆ Artwork" : "◇ Artwork";
      }
      if (SF.Editor && SF.Editor.refreshCanvas) SF.Editor.refreshCanvas();
      afterPaint();
    }
    var installed = false;
    function install() {
      if (installed) return;
      installed = true;
      var root = box2();
      if (root) root.addEventListener("pointerdown", beginDrag);
      var flip = document.getElementById("btnArtFlip");
      if (flip) flip.addEventListener("click", function() {
        setEditing(!editing);
      });
      var hide = document.getElementById("btnArtHide");
      if (hide) hide.addEventListener("click", toggleHidden);
      var del = document.getElementById("btnArtDelete");
      if (del) del.addEventListener("click", removeSelected);
      var bigger = document.getElementById("btnArtBigger");
      if (bigger) bigger.addEventListener("click", function() {
        resizeSelected(40);
      });
      var smaller = document.getElementById("btnArtSmaller");
      if (smaller) smaller.addEventListener("click", function() {
        resizeSelected(-40);
      });
      var reset = document.getElementById("btnArtReset");
      if (reset) reset.addEventListener("click", resetArt);
      var order2 = (
        /** @type {HTMLSelectElement|null} */
        document.getElementById("artOrder")
      );
      if (order2) {
        var picker = order2;
        picker.addEventListener("change", function() {
          setOrder(picker.value);
        });
      }
      var place = (
        /** @type {HTMLSelectElement|null} */
        document.getElementById("artPlace")
      );
      if (place) {
        var placePicker = place;
        placePicker.addEventListener("change", function() {
          setPlacement(placePicker.value);
        });
      }
      var pick = (
        /** @type {HTMLInputElement|null} */
        document.getElementById("artPicture")
      );
      if (pick) {
        var input = pick;
        input.addEventListener("change", function() {
          addPicture(input.files && input.files[0]);
          input.value = "";
        });
      }
      document.addEventListener("keydown", function(e) {
        var host = box2();
        if (!editing || SF.Player && SF.Player.open || !host || !host.getClientRects().length) return;
        var from = (
          /** @type {Element|null} */
          e.target
        );
        if (from && from.closest && from.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], dialog')) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
          setEditing(false);
          return;
        }
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (selected && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          var pos = originOf(selected, box2());
          var step = e.shiftKey ? 10 : 1;
          writePose(selected, {
            x: pos.x + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0),
            y: pos.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0)
          });
          commit(true);
          afterPaint();
          return;
        }
        if ((e.key === "Delete" || e.key === "Backspace") && selected) {
          var tag = document.activeElement && document.activeElement.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA") return;
          e.preventDefault();
          e.stopImmediatePropagation();
          removeSelected();
        }
      }, true);
      paintBar();
    }
    SF.Artwork = {
      install,
      /** Called by the editor after it rebuilds the canvas. */
      afterPaint,
      isEditing: function() {
        return editing;
      },
      setEditing
    };
  }

  // src/editor/customize.js
  function installCustom(SF) {
    var color = function(v) {
      return /^#[0-9a-f]{6}$/i.test(v || "") ? v : "";
    };
    function value(s, key) {
      if (key.indexOf("bullets.") === 0) return String(s.bullets[Number(key.split(".")[1])] || "");
      if (key.indexOf("blocks.") === 0) {
        var block = SF.freeBlockById && SF.freeBlockById(s, key.slice(7));
        return String(block && block.text || "");
      }
      return String(s[key] || "");
    }
    function entry(s, key) {
      var e = s.formatting && s.formatting[key];
      return e && e.text === value(s, key) && Array.isArray(e.marks) ? e : { text: value(s, key), marks: [] };
    }
    function save(s, key, e) {
      if (!s.formatting) s.formatting = {};
      s.formatting[key] = e;
    }
    function rebase(s, key, old, next) {
      var e = entry(s, key), a = 0, b = 0;
      while (a < old.length && a < next.length && old[a] === next[a]) a++;
      while (b < old.length - a && b < next.length - a && old[old.length - 1 - b] === next[next.length - 1 - b]) b++;
      var end = old.length - b, delta = next.length - old.length;
      e.marks = e.marks.map(function(m) {
        var n = Object.assign({}, m);
        if (m.end <= a) return n;
        if (m.start >= end) {
          n.start += delta;
          n.end += delta;
          return n;
        }
        n.start = Math.min(m.start, a);
        n.end = m.end >= end ? m.end + delta : a;
        return n;
      }).filter(function(m) {
        return m.end > m.start;
      });
      e.text = next;
      save(s, key, e);
    }
    function apply(s, key, start, end, kind, v) {
      if (!(end > start)) return false;
      var e = entry(s, key);
      if (kind === "clear") {
        e.marks = e.marks.flatMap(function(m) {
          if (m.end <= start || m.start >= end) return [m];
          var out = [];
          if (m.start < start) out.push(Object.assign({}, m, { end: start }));
          if (m.end > end) out.push(Object.assign({}, m, { start: end }));
          return out;
        });
      } else {
        e.marks.push({ start, end, kind, value: v });
        e.marks = e.marks.slice(-300);
      }
      save(s, key, e);
      return true;
    }
    function removeBullet(slide, index) {
      slide.bullets.splice(index, 1);
      if (!slide.bullets.length) slide.bullets.push("");
      if (Array.isArray(slide.images) && index < slide.images.length) slide.images.splice(index, 1);
      var previous = slide.formatting || {}, next = {};
      Object.keys(previous).forEach(function(key) {
        if (key.indexOf("bullets.") !== 0) {
          next[key] = previous[key];
          return;
        }
        var i = Number(key.slice(8));
        if (i === index) return;
        next["bullets." + (i > index ? i - 1 : i)] = previous[key];
      });
      slide.formatting = next;
    }
    function paint(node, s, key, text2) {
      var raw = value(s, key), offset = raw.indexOf(String(text2)), marks = entry(s, key).marks;
      if (offset < 0 || !marks.length) return;
      var parts = /* @__PURE__ */ new Set([0, text2.length]);
      marks.forEach(function(m) {
        if (!Number.isInteger(m.start) || !Number.isInteger(m.end)) return;
        parts.add(Math.max(0, Math.min(text2.length, m.start - offset)));
        parts.add(Math.max(0, Math.min(text2.length, m.end - offset)));
      });
      var points = Array.from(parts).sort(function(a, b) {
        return a - b;
      });
      node.textContent = "";
      points.slice(0, -1).forEach(function(a, i) {
        var b = points[i + 1], styles = {};
        marks.forEach(function(m) {
          if (m.start <= a + offset && m.end >= b + offset) styles[m.kind] = m.value;
        });
        var href = styles.link && SF.safeHref(styles.link);
        var jump = !href && styles.link && SF.slideJumpTarget && SF.slideJumpTarget(styles.link);
        var span = document.createElement(href || jump ? "a" : "span");
        span.textContent = text2.slice(a, b);
        if (styles.bold) span.style.fontWeight = "800";
        if (styles.italic) span.style.fontStyle = "italic";
        if (styles.underline) span.style.textDecoration = "underline";
        if (color(styles.color)) span.style.color = styles.color;
        if (styles.highlight) {
          span.style.backgroundColor = "#fff0a6";
          span.style.color = "#20251b";
        }
        if (href) {
          var link = (
            /** @type {HTMLAnchorElement} */
            span
          );
          link.href = href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.onclick = function(e) {
            e.stopPropagation();
          };
        } else if (jump) {
          var hop = (
            /** @type {HTMLAnchorElement} */
            span
          );
          hop.href = "#";
          hop.className = "slide-jump";
          hop.title = "Jump to rail slide " + jump + " (authoring order)";
          hop.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            SF.jumpToSlide(jump);
          };
        }
        node.appendChild(span);
      });
    }
    function bind(input, s, key, change) {
      if (s.type === "table" && key === "body") return;
      var bar;
      input.addEventListener("focus", function() {
        if (bar) return;
        bar = document.createElement("div");
        bar.className = "format-tools";
        bar.setAttribute("role", "toolbar");
        bar.setAttribute("aria-label", "Format selected text");
        var selection = [0, 0];
        function capture() {
          selection = [input.selectionStart, input.selectionEnd];
        }
        input.addEventListener("select", capture);
        input.addEventListener("keyup", capture);
        input.addEventListener("mouseup", capture);
        function format(kind, v) {
          var range = selection;
          if (["bold", "italic", "underline", "highlight"].includes(kind) && range[1] > range[0]) {
            var marks = entry(s, key).marks, all = true;
            for (var i = range[0]; i < range[1]; i++) {
              var on = false;
              marks.forEach(function(m) {
                if (m.kind === kind && m.start <= i && m.end > i) on = !!m.value;
              });
              if (!on) {
                all = false;
                break;
              }
            }
            v = !all;
          }
          if (!apply(s, key, range[0], range[1], kind, v)) {
            SF.toast("Select the words you want to format first");
            return;
          }
          change();
          input.focus();
          input.setSelectionRange(range[0], range[1]);
        }
        [["B", "Bold", "bold"], ["I", "Italic", "italic"], ["U", "Underline", "underline"], ["▰", "Highlight", "highlight"], ["Clear", "Clear formatting", "clear"]].forEach(function(item) {
          var b = document.createElement("button");
          b.type = "button";
          b.textContent = item[0];
          b.title = item[1];
          b.setAttribute("aria-label", item[1]);
          b.onmousedown = function(e) {
            e.preventDefault();
            capture();
          };
          b.onclick = function() {
            format(item[2], true);
          };
          bar.appendChild(b);
        });
        var c = document.createElement("input");
        c.type = "color";
        c.value = "#426332";
        c.title = "Text colour";
        c.setAttribute("aria-label", "Text colour");
        c.oninput = function() {
          format("color", c.value);
        };
        bar.appendChild(c);
        var link = document.createElement("input");
        link.type = "text";
        link.placeholder = "https://… or slide:12";
        link.setAttribute("aria-label", "Web link or slide:N using the rail number");
        link.title = "Web: https://… · Inside this lesson: slide:12 — the number on the left of the rail (author order; hidden slides still count)";
        bar.appendChild(link);
        var lb = document.createElement("button");
        lb.type = "button";
        lb.textContent = "Link";
        lb.onclick = function() {
          if (SF.safeHref(link.value) || SF.slideJumpTarget(link.value)) format("link", link.value);
          else SF.toast("Use an http(s) address, or slide:12 with the number on the left of the rail (author order — not the show count when slides are hidden)");
        };
        bar.appendChild(lb);
        input.addEventListener("keydown", function(e) {
          var k = e.key.toLowerCase();
          if ((e.metaKey || e.ctrlKey) && ["b", "i", "u"].includes(k)) {
            e.preventDefault();
            capture();
            format({ b: "bold", i: "italic", u: "underline" }[k], true);
          }
        });
        input.parentNode.insertBefore(bar, input);
      });
    }
    function enableCanvasEditDrag(form, handle, box2) {
      if (!form || !handle) return;
      handle.addEventListener("pointerdown", function(e) {
        if (e.button !== 0) return;
        if (e.target.closest("button, input, textarea, a, select, label")) return;
        e.preventDefault();
        var parent = form._canvasEditHost || box2 || form.offsetParent || form.parentElement;
        if (!parent) return;
        var pRect = parent.getBoundingClientRect();
        var fRect = form.getBoundingClientRect();
        var scaleX = pRect.width ? form.offsetWidth / fRect.width : 1;
        var scaleY = pRect.height ? form.offsetHeight / fRect.height : 1;
        var startX = e.clientX;
        var startY = e.clientY;
        var origLeft = form.offsetLeft;
        var origTop = form.offsetTop;
        form.style.right = "auto";
        form.style.bottom = "auto";
        form.style.left = origLeft + "px";
        form.style.top = origTop + "px";
        handle.setPointerCapture(e.pointerId);
        function move(ev) {
          var dx = (ev.clientX - startX) * scaleX;
          var dy = (ev.clientY - startY) * scaleY;
          var maxL = Math.max(0, parent.clientWidth - form.offsetWidth);
          var maxT = Math.max(0, parent.clientHeight - form.offsetHeight);
          form.style.left = Math.max(0, Math.min(maxL, origLeft + dx)) + "px";
          form.style.top = Math.max(0, Math.min(maxT, origTop + dy)) + "px";
        }
        function up(ev) {
          try {
            handle.releasePointerCapture(ev.pointerId);
          } catch (_) {
          }
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", up);
          handle.removeEventListener("pointercancel", up);
        }
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up);
        handle.addEventListener("pointercancel", up);
      });
    }
    function canvasEditHost(box2) {
      if (!box2) return box2;
      var stage = box2.closest("#previewBox") || box2.closest(".safe-stage");
      if (stage && stage !== box2) return stage;
      var slide = box2.closest(".slide");
      return slide && slide !== box2 ? slide : box2;
    }
    function placeCanvasEditForm(form, box2, host) {
      host = host || canvasEditHost(box2);
      form._canvasEditHost = host;
      var b = box2.getBoundingClientRect();
      var h = host.getBoundingClientRect();
      var scaleX = h.width ? host.clientWidth / h.width : 1;
      var scaleY = h.height ? host.clientHeight / h.height : 1;
      var left = (b.left - h.left) * scaleX;
      var top = (b.bottom - h.top) * scaleY + 8;
      host.appendChild(form);
      var maxL = Math.max(0, host.clientWidth - form.offsetWidth);
      var maxT = Math.max(0, host.clientHeight - form.offsetHeight);
      if (top > maxT) top = Math.max(0, (b.top - h.top) * scaleY - form.offsetHeight - 8);
      if (left > maxL) left = maxL;
      var rail = document.getElementById("inspector");
      var fits = form.offsetHeight <= host.clientHeight - 8 && form.offsetWidth <= host.clientWidth - 8;
      if (!fits && rail && rail.getClientRects().length) {
        var r = rail.getBoundingClientRect();
        document.body.appendChild(form);
        form.classList.add("canvas-edit-docked");
        form.style.position = "fixed";
        form.style.right = "auto";
        form.style.bottom = "auto";
        form.style.left = Math.round(r.left) + "px";
        form.style.top = Math.round(r.top) + "px";
        form.style.width = Math.round(r.width) + "px";
        form.style.maxHeight = Math.round(r.height) + "px";
        return;
      }
      form.classList.remove("canvas-edit-docked");
      form.style.position = "";
      form.style.width = "";
      form.style.maxHeight = "";
      form.style.right = "auto";
      form.style.bottom = "auto";
      form.style.left = Math.max(0, Math.min(maxL, left)) + "px";
      form.style.top = Math.max(0, Math.min(maxT, top)) + "px";
    }
    function flatRange(node) {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return [0, 0];
      var r = sel.getRangeAt(0);
      if (!node.contains(r.startContainer) || !node.contains(r.endContainer)) return [0, 0];
      function at(container, offset) {
        if (container === node) {
          var n = 0;
          for (var i = 0; i < offset && i < node.childNodes.length; i++) n += (node.childNodes[i].textContent || "").length;
          return n;
        }
        var seen = 0, walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), t;
        while (t = walk.nextNode()) {
          if (t === container) return seen + offset;
          seen += (t.textContent || "").length;
        }
        return seen;
      }
      var a = at(r.startContainer, r.startOffset), b = at(r.endContainer, r.endOffset);
      return a <= b ? [a, b] : [b, a];
    }
    function selectFlat(node, start, end) {
      var range = document.createRange(), walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      var seen = 0, t, haveStart = false, haveEnd = false;
      while (t = walk.nextNode()) {
        var len = (t.textContent || "").length;
        if (!haveStart && start <= seen + len) {
          range.setStart(t, start - seen);
          haveStart = true;
        }
        if (!haveEnd && end <= seen + len) {
          range.setEnd(t, end - seen);
          haveEnd = true;
          break;
        }
        seen += len;
      }
      if (!haveStart) {
        range.selectNodeContents(node);
        range.collapse(false);
      } else if (!haveEnd) range.setEnd(node, node.childNodes.length);
      var sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      sel.addRange(range);
    }
    function inlineEditable(node, s, key) {
      if (!node || !node.isConnected) return false;
      var stored = storedText(s, key);
      if (/\t/.test(stored)) return false;
      var flat = function(v) {
        return String(v || "").replace(/\s+/g, " ").trim();
      };
      if (!flat(stored) && node.dataset && node.dataset.placeholder) return true;
      var id = SF.freeBlockId && SF.freeBlockId(key);
      var block = id && SF.freeBlockById(s, id);
      var spec = block && SF.FREE_KINDS && SF.FREE_KINDS[block.kind];
      if (spec && spec.edits !== void 0) return spec.edits === "inline";
      return flat(node.textContent) === flat(stored);
    }
    function storedText(s, key) {
      var m = /^bullets\.(\d+)$/.exec(key);
      if (m) return String((s.bullets || [])[Number(m[1])] || "");
      var free = SF.freeBlockId && SF.freeBlockId(key);
      if (free) {
        var block = SF.freeBlockById(s, free);
        return String(block && block.text || "");
      }
      return String(s[key] || "");
    }
    function writeText(s, key, v) {
      var m = /^bullets\.(\d+)$/.exec(key);
      if (m) {
        s.bullets[Number(m[1])] = v;
        return;
      }
      var free = SF.freeBlockId && SF.freeBlockId(key);
      if (free) {
        var block = SF.freeBlockById(s, free);
        if (block) block.text = v;
        return;
      }
      s[key] = v;
    }
    var inlineEdit = null;
    var releaseTools = null;
    function inlineTools(node, s, key, repaint, hooks) {
      var bar = document.createElement("div");
      bar.className = "format-tools canvas-inline-tools";
      bar.setAttribute("role", "toolbar");
      bar.setAttribute("aria-label", "Format selected text");
      var held = [0, 0];
      function capture() {
        held = flatRange(node);
      }
      node.addEventListener("keyup", capture);
      node.addEventListener("mouseup", capture);
      document.addEventListener("selectionchange", capture);
      bar.dataset.release = "1";
      releaseTools = function() {
        document.removeEventListener("selectionchange", capture);
      };
      function format(kind, v) {
        var a = held[0], b = held[1];
        if (["bold", "italic", "underline", "highlight"].includes(kind) && b > a) {
          var marks = entry(s, key).marks, all = true;
          for (var i = a; i < b; i++) {
            var on = false;
            marks.forEach(function(m) {
              if (m.kind === kind && m.start <= i && m.end > i) on = !!m.value;
            });
            if (!on) {
              all = false;
              break;
            }
          }
          v = !all;
        }
        if (!apply(s, key, a, b, kind, v)) {
          SF.toast("Select the words you want to format first");
          return;
        }
        repaint();
        node.focus();
        selectFlat(node, a, b);
        held = [a, b];
      }
      if (hooks) hooks.format = function(kind) {
        capture();
        format(kind, true);
      };
      [
        ["B", "Bold", "bold"],
        ["I", "Italic", "italic"],
        ["U", "Underline", "underline"],
        ["▰", "Highlight", "highlight"],
        ["Clear", "Clear formatting", "clear"]
      ].forEach(function(item) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = item[0];
        b.title = item[1];
        b.setAttribute("aria-label", item[1]);
        b.onmousedown = function(e) {
          e.preventDefault();
        };
        b.onclick = function() {
          format(item[2], true);
        };
        bar.appendChild(b);
      });
      var colour = document.createElement("input");
      colour.type = "color";
      colour.value = "#426332";
      colour.title = "Text colour";
      colour.setAttribute("aria-label", "Text colour");
      colour.oninput = function() {
        format("color", colour.value);
      };
      bar.appendChild(colour);
      var link = document.createElement("input");
      link.type = "text";
      link.placeholder = "https://… or slide:12";
      link.setAttribute("aria-label", "Web link or slide:N using the rail number");
      link.title = "Web: https://… · Inside this lesson: slide:12 — the number on the left of the rail (author order; hidden slides still count)";
      bar.appendChild(link);
      var lb = document.createElement("button");
      lb.type = "button";
      lb.textContent = "Link";
      lb.onmousedown = function(e) {
        e.preventDefault();
      };
      lb.onclick = function() {
        if (SF.safeHref(link.value) || SF.slideJumpTarget(link.value)) format("link", link.value);
        else SF.toast("Use an http(s) address, or slide:12 with the number on the left of the rail (author order — not the show count when slides are hidden)");
      };
      bar.appendChild(lb);
      var done = document.createElement("button");
      done.type = "button";
      done.className = "canvas-inline-done";
      done.textContent = "Done";
      done.title = "Finish editing this block (Escape keeps your text too)";
      done.onmousedown = function(e) {
        e.preventDefault();
      };
      done.onclick = function() {
        endInlineEdit("save");
      };
      bar.appendChild(done);
      document.body.appendChild(bar);
      return bar;
    }
    function placeInlineTools(bar, node) {
      var b = node.getBoundingClientRect();
      var w = bar.offsetWidth, h = bar.offsetHeight;
      var left = Math.max(8, Math.min(window.innerWidth - w - 8, b.left));
      var top = b.top - h - 8;
      if (top < 8) top = Math.min(window.innerHeight - h - 8, b.bottom + 8);
      bar.style.left = Math.round(left) + "px";
      bar.style.top = Math.round(Math.max(8, top)) + "px";
    }
    function endInlineEdit(how) {
      var open = inlineEdit;
      if (!open) return;
      inlineEdit = null;
      var node = open.node;
      node.contentEditable = "false";
      node.removeAttribute("role");
      node.removeAttribute("aria-multiline");
      if (open.wasDraggable) node.draggable = true;
      if (releaseTools) {
        releaseTools();
        releaseTools = null;
      }
      if (open.bar) open.bar.remove();
      window.removeEventListener("scroll", open.follow, true);
      window.removeEventListener("resize", open.follow);
      if (open.watch) open.watch.disconnect();
      if (how === "cancel") {
        writeText(open.slide, open.key, open.was);
        if (open.wasEntry) {
          if (!open.slide.formatting) open.slide.formatting = {};
          open.slide.formatting[open.key] = open.wasEntry;
        } else if (open.slide.formatting) {
          delete open.slide.formatting[open.key];
        }
        if (open.onCancel) open.onCancel();
        return;
      }
      if (open.onSave) open.onSave();
    }
    function beginInlineEdit(node, s, key, opts) {
      opts = opts || {};
      if (inlineEdit && inlineEdit.node === node) {
        node.focus();
        return true;
      }
      endInlineEdit("save");
      var open = {
        node,
        slide: s,
        key,
        was: storedText(s, key),
        wasEntry: s.formatting && s.formatting[key] ? JSON.parse(JSON.stringify(s.formatting[key])) : null,
        wasDraggable: !!node.draggable,
        onSave: opts.onSave,
        onCancel: opts.onCancel,
        onInput: opts.onInput,
        /** @type {null|function(string):void} */
        format: null
      };
      inlineEdit = open;
      node.draggable = false;
      node.contentEditable = "plaintext-only";
      node.setAttribute("role", "textbox");
      node.setAttribute("aria-multiline", /^bullets\.\d+$/.test(key) ? "false" : "true");
      function repaint() {
        var here = flatRange(node);
        paint(node, s, key, storedText(s, key));
        selectFlat(node, here[0], here[1]);
      }
      open.bar = inlineTools(node, s, key, repaint, open);
      open.follow = function() {
        placeInlineTools(open.bar, node);
      };
      window.addEventListener("scroll", open.follow, true);
      window.addEventListener("resize", open.follow);
      var stage = node.closest("#previewBox") || node.closest(".safe-stage");
      if (stage && typeof ResizeObserver === "function") {
        open.watch = new ResizeObserver(open.follow);
        open.watch.observe(stage);
        open.watch.observe(node);
      }
      node.addEventListener("input", function() {
        if (inlineEdit !== open) return;
        var raw = node.innerText.replace(/\r/g, "");
        var next = /^bullets\.\d+$/.test(key) ? raw.replace(/[\t\n]+/g, " ") : raw.replace(/\t/g, " ").replace(/\n+$/, "");
        rebase(s, key, storedText(s, key), next);
        writeText(s, key, next);
        if (open.onInput) open.onInput();
        open.follow();
      });
      node.addEventListener("keydown", function(e) {
        if (inlineEdit !== open) return;
        e.stopPropagation();
        if (e.isComposing || e.keyCode === 229) return;
        var k = e.key.toLowerCase();
        if ((e.metaKey || e.ctrlKey) && !e.altKey && ["b", "i", "u"].includes(k)) {
          e.preventDefault();
          if (open.format) open.format(k === "b" ? "bold" : k === "i" ? "italic" : "underline");
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          endInlineEdit("save");
          return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          endInlineEdit("save");
        }
      });
      node.addEventListener("blur", function() {
        setTimeout(function() {
          if (inlineEdit !== open) return;
          var to = document.activeElement;
          if (to && (to === node || node.contains(to) || open.bar && open.bar.contains(to))) return;
          endInlineEdit("save");
        }, 0);
      });
      node.focus();
      placeInlineTools(open.bar, node);
      requestAnimationFrame(function() {
        if (inlineEdit === open) open.follow();
      });
      return true;
    }
    function blockPart(node) {
      var cls = " " + (node.className || "") + " ";
      if (/ (kw-term|it-phrase|ln-label|journey-step-title) /.test(cls)) return "lead";
      if (/ (kw-def|it-note|ln-link|journey-step-body) /.test(cls)) return "trail";
      return null;
    }
    function railFieldFor(s, key, part) {
      var insp = document.getElementById("inspector");
      if (!insp || insp.dataset.slide !== s.id) return null;
      var all = Array.prototype.slice.call(insp.querySelectorAll('[data-content-key="' + key + '"]'));
      if (!all.length) return null;
      if (part) {
        var half = all.filter(function(n) {
          return n.dataset.contentPart === part;
        });
        if (half.length) return half[0];
      }
      return all[0];
    }
    function editCanvasBlock(node, s, key, opts) {
      if (!node || !s || !key) return;
      if (document.querySelector(".arranging, .art-editing")) return;
      var blockId = SF.freeBlockId && SF.freeBlockId(key);
      if (blockId && SF.Editor && SF.Editor.focusBlock) {
        SF.Editor.focusBlock(blockId);
        if (SF.Arrange && SF.Arrange.selectKey) SF.Arrange.selectKey(key);
      }
      if (inlineEditable(node, s, key)) {
        beginInlineEdit(node, s, key, opts);
        return;
      }
      var field = railFieldFor(s, key, blockPart(node));
      if (field) {
        endInlineEdit("save");
        if (field.scrollIntoView) field.scrollIntoView({ block: "nearest" });
        field.focus();
        if (field.select) field.select();
        return;
      }
      if (blockId) {
        endInlineEdit("save");
        return;
      }
      openCanvasEditor(node, s, key, opts);
    }
    var openForm = null;
    function endCanvasEditor() {
      if (!openForm) return false;
      var f = openForm;
      openForm = null;
      f.keep();
      return true;
    }
    function openCanvasEditor(box2, s, key, opts) {
      opts = opts || {};
      if (!box2 || !s || !key) return;
      endCanvasEditor();
      var host = canvasEditHost(box2);
      host.querySelectorAll(".canvas-edit-form").forEach(function(n) {
        n.remove();
      });
      document.querySelectorAll("body > .canvas-edit-form").forEach(function(n) {
        n.remove();
      });
      var bulletMatch = /^bullets\.(\d+)$/.exec(key);
      var oldRaw = bulletMatch ? String(s.bullets[Number(bulletMatch[1])] || "") : String(s[key] || "");
      var oldEntry = s.formatting && s.formatting[key] ? JSON.parse(JSON.stringify(s.formatting[key])) : null;
      var keywordFriendly = !!(bulletMatch && s.type === "keywords" && SF.parseKeywordLine && SF.formatKeywordLine);
      var shown = oldRaw;
      if (keywordFriendly) {
        var pair = SF.parseKeywordLine(oldRaw);
        shown = pair.def ? pair.term + " — " + pair.def : pair.term;
      }
      var current = shown;
      if (shown !== oldRaw) {
        rebase(s, key, oldRaw, shown);
        if (bulletMatch) s.bullets[Number(bulletMatch[1])] = shown;
        else s[key] = shown;
      }
      var form = document.createElement("div");
      form.className = "canvas-edit-form";
      var drag = document.createElement("div");
      drag.className = "canvas-edit-drag";
      drag.setAttribute("role", "button");
      drag.tabIndex = 0;
      drag.title = "Drag to move this panel across the canvas";
      drag.innerHTML = '<span>Edit slide content</span><span class="canvas-edit-drag-hint">Drag</span>';
      form.appendChild(drag);
      enableCanvasEditDrag(form, drag, host);
      var label = document.createElement("label");
      label.textContent = "Text";
      var area = document.createElement("textarea");
      area.value = shown || "";
      area.rows = 3;
      area.setAttribute("aria-label", "Edit slide content");
      label.appendChild(area);
      form.appendChild(label);
      function writeShown(v) {
        var prev = current;
        current = v;
        rebase(s, key, prev, v);
        if (bulletMatch) s.bullets[Number(bulletMatch[1])] = v;
        else s[key] = v;
      }
      area.addEventListener("input", function() {
        writeShown(area.value);
      });
      bind(area, s, key, function() {
      });
      function restore() {
        if (bulletMatch) s.bullets[Number(bulletMatch[1])] = oldRaw;
        else s[key] = oldRaw;
        if (!s.formatting) s.formatting = {};
        if (oldEntry) s.formatting[key] = oldEntry;
        else delete s.formatting[key];
      }
      var save2 = document.createElement("button");
      save2.type = "button";
      save2.className = "btn primary";
      save2.textContent = "Save content";
      function keep() {
        var next = area.value;
        if (keywordFriendly) {
          var edited = SF.parseKeywordLine(next);
          next = SF.formatKeywordLine(edited.term, edited.def);
          rebase(s, key, current, next);
        }
        if (bulletMatch) s.bullets[Number(bulletMatch[1])] = next;
        else s[key] = next;
        form.remove();
      }
      save2.onclick = function() {
        openForm = null;
        keep();
        if (opts.onSave) opts.onSave();
      };
      form.appendChild(save2);
      var cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "btn ghost";
      cancel.textContent = "Cancel";
      cancel.onclick = function() {
        openForm = null;
        restore();
        form.remove();
        if (opts.onCancel) opts.onCancel();
      };
      form.appendChild(cancel);
      host.appendChild(form);
      openForm = { keep };
      area.focus();
      area.setSelectionRange(area.value.length, area.value.length);
      placeCanvasEditForm(form, box2, host);
    }
    function layout(root, s) {
      var d = s.design || {}, pad = root.querySelector(".pad");
      if (!pad || s.type === "quiz" || s.type === "game") return;
      if (["left", "center", "right"].includes(d.align)) {
        pad.style.textAlign = d.align;
        if (root.dataset.composition) root.querySelectorAll("[data-content-key]").forEach(function(n) {
          n.style.textAlign = d.align;
        });
        pad.classList.add("pad-align-" + d.align);
      }
      if (color(d.background)) root.style.background = d.background;
      if (color(d.textColor)) {
        root.style.setProperty("--s-fg", d.textColor);
        root.style.setProperty("--s-dim", d.textColor);
        root.querySelectorAll(".pad h1,.pad h2,.sub,.q,.attrib,.cap,.pad li,.kw-term,.kw-def,.it-phrase,.it-note,.ln-label,.ln-link,.tbl th,.tbl td").forEach(function(n) {
          n.style.color = d.textColor;
        });
      }
      var scale = { small: 0.85, medium: 1, large: 1.15, x2: 2, x3: 3, x5: 5 }[d.size] || 1;
      if (scale !== 1) requestAnimationFrame(function() {
        var nodes = [];
        root.querySelectorAll("h1,h2,.sub,.q,.attrib,li,.kw-term,.kw-def,.it-phrase,.it-note,.ln-label,.ln-link,.ln-url,.cp [data-content-key]").forEach(function(n) {
          var px = parseFloat(getComputedStyle(n).fontSize);
          if (px) nodes.push([n, px]);
        });
        if (!nodes.length) return;
        var want = scale;
        for (var pass = 0; pass < 40; pass++) {
          nodes.forEach(function(pair) {
            pair[0].style.fontSize = pair[1] * want + "px";
          });
          var overflowing = pad.scrollHeight > pad.clientHeight + 1 || pad.scrollWidth > pad.clientWidth + 1;
          if (!overflowing || want <= 1) break;
          want = Math.max(1, want * 0.96);
        }
      });
      if (s.type === "split") {
        var media = root.querySelector(".split-media"), copy = root.querySelector(".split-copy");
        var ratio = [35, 50, 65].includes(d.imageShare) ? d.imageShare : 50;
        media.style.flex = "0 0 " + ratio + "%";
        copy.style.flex = "1 1 0";
        var placement = SF.imagePlacement(s);
        if (["top", "bottom"].includes(placement)) {
          pad.style.flexDirection = "column";
          media.style.order = placement === "top" ? "0" : "1";
          copy.style.order = placement === "top" ? "1" : "0";
          copy.style.padding = "28px 56px";
          copy.style.minHeight = "0";
          media.style.minHeight = "0";
        }
      }
      root.querySelectorAll(".img").forEach(function(img) {
        var x = Number.isFinite(d.focalX) ? Math.max(0, Math.min(100, d.focalX)) : 50;
        var y = Number.isFinite(d.focalY) ? Math.max(0, Math.min(100, d.focalY)) : 50;
        img.style.backgroundPosition = x + "% " + y + "%";
        img.style.setProperty("--img-fx", x + "%");
        img.style.setProperty("--img-fy", y + "%");
      });
    }
    var expanded = /* @__PURE__ */ new Set();
    function inspector(parent, s, change, opts) {
      opts = opts || {};
      var UI = SF.Shell.UI, box2;
      if (opts.bare) {
        box2 = document.createElement("div");
        box2.className = "custom-controls";
      } else {
        box2 = document.createElement("details");
        box2.className = "custom-controls";
        box2.open = expanded.has(s.id);
        box2.ontoggle = function() {
          if (box2.open) expanded.add(s.id);
          else expanded.delete(s.id);
        };
        var summary = document.createElement("summary");
        summary.textContent = "Customise this slide";
        box2.appendChild(summary);
      }
      var d = s.design || (s.design = {});
      function choose(label, key, opts2, fallback) {
        var meta = SF.DESIGN_CONTROLS && SF.DESIGN_CONTROLS[key];
        box2.appendChild(UI.field(meta && meta.label || label, UI.select(opts2.map(function(x) {
          return { value: String(x[0]), label: x[1] };
        }), String(d[key] || fallback), function(v) {
          d[key] = key === "imageShare" || key === "capFade" ? Number(v) : v;
          change();
        })));
      }
      var currentDeck = SF.Editor && SF.Editor.deck ? SF.Editor.deck() : null;
      var compositions = SF.compositionOptions ? SF.compositionOptions(s, currentDeck && currentDeck.theme) : [];
      if (compositions.length) {
        choose("Composition", "composition", [["", "Theme default"], ["none", "Original layout"]].concat(compositions.map(function(key) {
          return [key, SF.COMPOSITIONS[key].label];
        })), "");
        var compositionHint = document.createElement("p");
        compositionHint.className = "hint";
        compositionHint.textContent = "Change the arrangement without changing your theme or content. Shorten copy before increasing text size.";
        box2.appendChild(compositionHint);
      }
      if (SF.supportsChromeRegions(SF, currentDeck, s)) {
        choose("Header and footer", "chromeLayout", [["", "Theme placement"], ["regions", "Named regions"]], "");
        if (d.chromeLayout === "regions") {
          var positions = SF.chromePositions(d);
          [["identitySlot", "Theme identity position"], ["logoSlot", "Logo position"], ["contextSlot", "Slide context position"], ["closingSlot", "Closing text position"], ["numberSlot", "Page number position"]].forEach(function(pair) {
            box2.appendChild(UI.field(pair[1], UI.select(SF.CHROME_SLOTS.map(function(slot) {
              return { value: slot, label: slot.replace("-", " · ").replace("center", "centre") };
            }), positions[pair[0]], function(value2) {
              SF.setChromeSlot(s, pair[0], value2);
              change();
            })));
          });
          var regionHint = document.createElement("p");
          regionHint.className = "hint";
          regionHint.textContent = "Hover over a header or footer item and drag its move handle, or click the handle to choose a slot. Moving into an occupied slot swaps positions. Deck settings still control logo and number visibility. Context stays with the body when the composition uses it there.";
          box2.appendChild(regionHint);
        }
      }
      if (SF.slideComposition(currentDeck, s) === "poster-art") {
        var artworkInput = document.createElement("input");
        artworkInput.type = "text";
        artworkInput.value = s.image || "";
        artworkInput.onchange = function() {
          s.image = SF.safeMedia(artworkInput.value);
          change();
        };
        box2.appendChild(UI.field("Poster artwork · image URL or asset path", artworkInput));
      }
      if (SF.MotionLab) {
        if (SF.MotionLab.active(s)) {
          choose("Scene style", "motionLook", Object.entries(SF.MotionLab.MOTION_LOOKS), "editorial");
          if (SF.Editor && SF.Editor.imagePickerField) {
            box2.appendChild(UI.field("Scene image", SF.Editor.imagePickerField(
              function() {
                return s.image || "";
              },
              function(v) {
                s.image = v ? SF.safeMedia(v) : "";
                change();
              },
              { label: "Scene image" }
            )));
          } else {
            var sceneImage = document.createElement("input");
            sceneImage.type = "text";
            sceneImage.value = s.image || "";
            sceneImage.onchange = function() {
              s.image = SF.safeMedia(sceneImage.value);
              change();
            };
            box2.appendChild(UI.field("Scene image · URL or asset path", sceneImage));
          }
          box2.appendChild(SF.el("p", "hint", "Edit points as label, then a tab, then explanation. Up to four points. Present to interact; previews show the complete overview. Scrub uses numeric explanations (1–100)."));
          if (s.motionScene === "cause") {
            var multiplier = document.createElement("input");
            multiplier.type = "number";
            multiplier.min = "-10";
            multiplier.max = "10";
            multiplier.step = "0.1";
            multiplier.value = String(Number(s.body) || 2);
            multiplier.onchange = function() {
              s.body = multiplier.value;
              change();
            };
            box2.appendChild(UI.field("Model multiplier · y = ax", multiplier));
          }
        }
      }
      choose("Text alignment", "align", [["left", "Left"], ["center", "Centre"], ["right", "Right"]], "left");
      choose("Text size", "size", [
        ["small", "Small"],
        ["medium", "Theme default"],
        ["large", "Large"],
        ["x2", "Display · twice the size"],
        ["x3", "Poster · three times"],
        ["x5", "Hero · five times, as far as it fits"]
      ], "medium");
      var fg = document.createElement("input");
      fg.type = "color";
      fg.value = color(d.textColor) || "#243422";
      fg.onchange = function() {
        d.textColor = fg.value;
        change();
      };
      box2.appendChild(UI.field("Text colour · whole slide", fg, "For individual words, select text in its field and use the colour swatch."));
      var bg = document.createElement("input");
      bg.type = "color";
      bg.value = color(d.background) || "#ffffff";
      bg.onchange = function() {
        d.background = bg.value;
        change();
      };
      box2.appendChild(UI.field("Slide background", bg, "Keep text readable when changing colours. Select words in a text field to format them."));
      if (s.type === "split") {
        box2.appendChild(UI.field("Image placement", UI.select([
          { value: "left", label: "Left of text" },
          { value: "right", label: "Right of text" },
          { value: "top", label: "Above text" },
          { value: "bottom", label: "Below text" }
        ], SF.imagePlacement(s), function(v) {
          SF.setImagePlacement(s, v);
          change();
        })));
        choose("Image share", "imageShare", [[35, "35% image"], [50, "50% image"], [65, "65% image"]], 50);
        choose("Picture mount", "mediaGround", [
          ["card", "On a card — for photographs and plates"],
          ["full", "Edge to edge — for charts already on white"]
        ], "card");
        choose("Text style", "copyStyle", [
          ["points", "Points — a marker on every line"],
          ["prose", "Prose — flush, no markers"]
        ], "points");
        choose("Image arrives", "imageStep", [
          ["none", "With the slide"],
          ["before", "On a press, before the points"],
          ["after", "On a press, after the points"]
        ], "none");
      }
      if (s.type === "cards") {
        box2.appendChild(UI.field("Cards layout", UI.select([
          { value: "grid", label: "Side by side" },
          { value: "rows", label: "Rows down the slide — full width each" },
          { value: "stack", label: "Stacked — one in front, the rest behind" },
          { value: "pictures", label: "Picture cards — an image slot above each card" }
        ], ["stack", "rows", "pictures"].indexOf(d.cardsMode) >= 0 ? d.cardsMode : "grid", function(v) {
          d.cardsMode = v;
          if (SF.slideComposition(currentDeck, s)) d.composition = "none";
          if (v === "stack") {
            s.progressive = true;
            s.buildMode = "dim";
          }
          change();
        }), "Each card gets its own moment, with the ones already covered showing behind."));
        if (d.cardsMode === "pictures" || (s.images || []).some(Boolean)) {
          choose("Picture shape", "cardPics", [["covers", "Portrait 3:4 — crops to fill"], ["plates", "Landscape 4:3 — whole figure, letterboxed"]], "covers");
        }
      }
      if (s.type === "stats") {
        choose("Tile style", "statStyle", [
          ["tile", "Big number over its label"],
          ["ring", "Ring — filled to the number’s share"],
          ["bar", "KPI bar under the number"]
        ], "tile");
        if ((s.design || {}).statStyle === "ring") {
          var ringN = (s.bullets || []).filter(function(b) {
            var pr = SF.parseInfoLine(b);
            return String(pr.label || "").trim() || String(pr.value || "").trim();
          }).length;
          if (ringN > 1) box2.appendChild(SF.el(
            "p",
            "hint field-warn",
            "Rings encode each number as an arc, which the eye compares less accurately than a length. With " + ringN + " of them nobody can line them up — KPI bar reads the same numbers correctly, and the ring is at its best on a single figure you want looked at."
          ));
        }
      }
      if (s.type === "funnel") {
        choose("Direction", "funnelDirection", [["down", "Funnel — widest at the top"], ["up", "Pyramid — widest at the bottom"]], "down");
        box2.appendChild(SF.el(
          "p",
          "hint",
          "A funnel shows what is left at each stage. If where the rest went matters — rejected, declined, lapsed — that question is Flow in the chart picker, and a Sankey carries both. The drop between two stages is printed for you either way."
        ));
      }
      if (s.type === "timeline") {
        choose("Shape", "timelineMode", [["horizontal", "Across — one rail, dates above events"], ["vertical", "Down — a spine with a paragraph per event"]], "horizontal");
      }
      if (s.activity) {
        var ma = document.createElement("textarea");
        ma.rows = 3;
        ma.value = s.modelAnswer || "";
        ma.placeholder = "A worked answer the room sees after their attempt…";
        ma.oninput = function() {
          s.modelAnswer = ma.value;
          if (s.modelAnswerDraft) delete s.modelAnswerDraft;
          change();
        };
        box2.appendChild(UI.field(
          "Model answer",
          ma,
          "Turned over when the timer runs out, or by the ⇄ on the slide. Leave it empty for none — but an activity that asks for an attempt usually owes one."
        ));
        if (s.modelAnswerDraft) {
          box2.appendChild(SF.el(
            "p",
            "hint field-warn",
            "This answer came from the activity library and is written about another subject. It will not be shown to the room until you rewrite it, or accept it as it stands."
          ));
          box2.appendChild(UI.button("Use this answer as written", "ghost", function() {
            delete s.modelAnswerDraft;
            change();
          }));
        }
      }
      if (s.type === "title" || s.type === "section") {
        choose("Backdrop motion", "backdrop", [
          ["", "Still — the theme decides"],
          ["drift", "Drift — colour moving slowly"],
          ["grid", "Grid — a ruled plane travelling"],
          ["glow", "Glow — one slow breath behind the words"]
        ], "");
      }
      if (s.type === "image" || s.type === "gallery" || s.type === "video") {
        choose("Logo sits on", "logoGround", [
          ["", "Let the theme decide"],
          ["dark", "A dark background — show the logo white"],
          ["light", "A light background — keep the logo as it is"]
        ], "");
      }
      if (s.type === "image" || s.type === "gallery") {
        choose("Image frame", "imageFrame", [
          ["", "Full bleed — caption sits over the image"],
          ["16:9", "16:9 landscape — caption below"],
          ["4:3", "4:3 — caption below"],
          ["3:2", "3:2 — caption below"],
          ["1:1", "Square — caption below"],
          ["4:5", "4:5 portrait — caption below"]
        ], "");
      }
      if (s.type === "image" || s.type === "gallery" || s.type === "video" || s.type === "split" && s.subtitle) {
        choose("Caption style", "capStyle", [
          ["scrim", "Gradient over the image"],
          ["bar", "Solid accent bar"],
          ["plain", "Text only, no ground"],
          ["none", "Hide the caption"]
        ], "scrim");
        if (s.type === "image" || s.type === "gallery" || s.type === "video") choose("Caption position", "capPos", [["bottom", "Bottom"], ["top", "Top"]], "bottom");
        if (s.type === "image") choose("Caption clears itself", "capFade", [
          [0, "Stays on the picture"],
          [5, "After 5 seconds"],
          [10, "After 10 seconds"],
          [15, "After 15 seconds"],
          [20, "After 20 seconds"],
          [30, "After 30 seconds"]
        ], 0);
        if (s.type === "image") {
          box2.appendChild(UI.field("Image motion", UI.select([
            { value: "", label: "Stays still" },
            { value: "zoom", label: "Slow zoom in" },
            { value: "travel", label: "Travel — from one point to another" }
          ], d.imageMotion === "travel" ? "travel" : d.imageMotion === "zoom" ? "zoom" : "", function(v) {
            if (v === "zoom" || v === "travel") d.imageMotion = v;
            else delete d.imageMotion;
            change();
          }), "On the projector only. Zoom drifts toward the focus point below; Travel moves from it to a second point."));
          if (d.imageMotion === "travel") {
            ["X", "Y"].forEach(function(axis) {
              var r = document.createElement("input");
              r.type = "range";
              r.min = "0";
              r.max = "100";
              r.value = d["focal" + axis + "2"] == null ? 50 : d["focal" + axis + "2"];
              r.onchange = function() {
                d["focal" + axis + "2"] = Number(r.value);
                change();
              };
              box2.appendChild(UI.field("Travels to " + (axis === "X" ? "horizontal" : "vertical"), r));
            });
            box2.appendChild(UI.field("How long the move takes", UI.select([
              { value: "12", label: "12 seconds" },
              { value: "20", label: "20 seconds" },
              { value: "30", label: "30 seconds — barely visible, on purpose" }
            ], String(d.imageTravelSecs || 20), function(v) {
              var n = Number(v);
              if (n === 20) delete d.imageTravelSecs;
              else d.imageTravelSecs = n;
              change();
            }), "Set the start with Image focus below, the end with Travels to above. Same point twice means no move, and none is drawn."));
          }
        }
      }
      if (s.type === "chart") {
        var pasted = String(s.body || "").split(/\r?\n/).filter(function(l) {
          return l.trim();
        }).length;
        var drawnRows = Math.max(0, Math.min(pasted, SF.TABLE_MAX_ROWS) - 1);
        var lost = pasted - 1 - drawnRows;
        if (lost > 0) box2.appendChild(SF.el(
          "p",
          "hint field-warn",
          "Only the first " + drawnRows + " rows are drawn — " + lost + " more were pasted and are not on the chart. A chart reads its numbers through the table parser, which stops at " + SF.TABLE_MAX_ROWS + " rows including the header. Aggregate them (months to quarters, days to months) or split the range across two slides, and check the caption still describes what is drawn."
        ));
      }
      if (s.type === "code") {
        box2.appendChild(UI.field("How the code arrives", UI.select([
          { value: "all", label: "All at once" },
          { value: "type", label: "Types itself" },
          { value: "lines", label: "One line per press" }
        ], s.codeReveal || "type", function(v) {
          s.codeReveal = v;
          s.typewrite = v === "type";
          change();
        }), "All at once to talk over it. Types itself for a live-coding feel. One line per press when the walk-through is the teaching — Next and Prev move through it like bullets."));
        if ((s.codeReveal || "type") === "type") {
          box2.appendChild(UI.field("Typing speed", UI.select([
            { value: "110", label: "Slow — read along" },
            { value: "80", label: "Deliberate" },
            { value: "55", label: "Steady" },
            { value: "34", label: "Brisk" },
            { value: "18", label: "Fast — barely readable" }
          ], String(s.typeSpeed || 55), function(v) {
            s.typeSpeed = Number(v);
            change();
          }), "Milliseconds between characters, so a larger number is slower. Press Next while it is typing to skip to the end."));
        }
      }
      if (s.type === "chart") {
        box2.appendChild(UI.field("Chart motion", UI.select([
          { value: "", label: "Already drawn" },
          { value: "grow", label: "Draws itself when the slide arrives" }
        ], d.chartMotion === "grow" ? "grow" : "", function(v) {
          if (v === "grow") d.chartMotion = "grow";
          else delete d.chartMotion;
          change();
        }), "Bars rise from the axis, lines draw along, wedges sweep round. On the projector only."));
        var cd = SF.chartData(s);
        if (cd.series.length > 1) {
          var seriesOpts = [{ value: "", label: "Show them all evenly" }];
          cd.series.forEach(function(sr, i) {
            seriesOpts.push({ value: String(i), label: "Isolate “" + sr.name + "”" });
          });
          box2.appendChild(UI.field(
            "Focus one series",
            UI.select(
              seriesOpts,
              d.chartFocus == null ? "" : String(d.chartFocus),
              function(v) {
                if (v === "") delete d.chartFocus;
                else d.chartFocus = Number(v);
                change();
              }
            ),
            "Holds the others back rather than removing them, so the comparison is still there to return to."
          ));
        }
      }
      if (s.type === "split" || s.type === "image") ["X", "Y"].forEach(function(axis) {
        var r = document.createElement("input");
        r.type = "range";
        r.min = "0";
        r.max = "100";
        r.value = d["focal" + axis] == null ? 50 : d["focal" + axis];
        r.onchange = function() {
          d["focal" + axis] = Number(r.value);
          change();
        };
        box2.appendChild(UI.field("Image focus " + (axis === "X" ? "horizontal" : "vertical"), r));
      });
      if (["journey", "mindmap", "content", "cards", "split", "keywords", "italics", "table", "quote", "explain", "image", "gallery"].includes(s.type)) {
        var buildLabel = s.type === "gallery" ? "Reveal one picture at a time (animated)" : s.type === "image" ? "Hold the image back until the next press" : s.type === "table" ? "Reveal one row at a time (animated)" : s.type === "quote" ? "Reveal one line at a time (animated)" : s.type === "explain" ? "Reveal one paragraph at a time (animated)" : "Reveal one bullet / point at a time (animated)";
        var buildValue = s.progressive !== true ? "off" : s.buildMode === "dim" || s.buildMode === "spot" ? s.buildMode : "on";
        box2.appendChild(UI.field("Build on Next", UI.select([
          { value: "off", label: "Show everything at once" },
          { value: "on", label: buildLabel },
          { value: "dim", label: buildLabel.replace(" (animated)", ", dimming the ones before") },
          { value: "spot", label: buildLabel.replace(" (animated)", ", with a spotlight on the live one") }
        ].filter(function(o) {
          return !((o.value === "dim" || o.value === "spot") && s.type === "image");
        }), buildValue, function(v) {
          s.progressive = v !== "off";
          s.buildMode = v === "dim" || v === "spot" ? v : "hide";
          change();
        }), "Dimming keeps earlier points readable instead of hiding them — useful when the room needs the whole argument in view. Spotlight does that and takes the light off the rest of the slide, which is the other half of what a presenter does with their hand."));
      }
      box2.appendChild(UI.button("Reset this slide to theme", "ghost", function() {
        s.design = {};
        s.formatting = {};
        change();
      }));
      var guide = document.createElement("a");
      guide.href = "design-guide.html";
      guide.target = "_blank";
      guide.rel = "noopener";
      guide.textContent = "Design controls guide";
      box2.appendChild(guide);
      tagControls(box2, s, "Look");
      parent.appendChild(box2);
    }
    function tagControls(root, slide, pane) {
      root.querySelectorAll(".field > label").forEach(function(label) {
        var text2 = label.firstChild ? label.firstChild.textContent.trim() : "";
        var key = Object.keys(SF.DESIGN_CONTROLS).find(function(k) {
          var c = SF.DESIGN_CONTROLS[k];
          return c.pane === pane && c.label === text2 && SF.designApplies(k, slide.type);
        });
        if (key) label.parentElement.dataset.designKey = key;
      });
    }
    SF.Custom = { tagControls, removeBullet, bind, editCanvasBlock, endInlineEdit, endCanvasEditor, inlineEditable, openCanvasEditor, enableCanvasEditDrag, placeCanvasEditForm, canvasEditHost, paint, layout, inspector, rebase, apply, entry };
  }

  // src/boards/runtimes/bingo.js
  function installBingo(SF) {
    var active2 = null;
    function deal(board5) {
      var size = Math.max(2, Math.min(4, Number(board5.gridSize) || 3));
      var need = size * size;
      var seen = {}, distinct = [];
      board5.pool.forEach(function(pair) {
        var key = String(pair.term || "").trim().toLowerCase();
        if (!key || seen[key]) return;
        seen[key] = 1;
        distinct.push(pair);
      });
      return board5.participants.map(function() {
        var bag = distinct.slice(), cells = [];
        while (cells.length < need && bag.length) {
          var pick = bag.splice(Math.floor(Math.random() * bag.length), 1)[0];
          cells.push({ id: pick.id, term: pick.term, state: "open" });
        }
        while (cells.length < need) cells.push({ id: null, term: "", state: "open" });
        return cells;
      });
    }
    function create(board5) {
      return {
        phase: "ready",
        cards: deal(board5),
        called: [],
        current: -1,
        revealed: false,
        winners: [],
        elapsed: 0,
        paused: false
      };
    }
    function hasLine(cells, size) {
      return SF.bingoHasLine(cells.map(function(c) {
        return c.state === "claimed";
      }), size);
    }
    function square(state2, board5, team) {
      if (state2.current < 0) return -1;
      var term = board5.pool[state2.current].term;
      var cells = state2.cards[team] || [];
      for (var i = 0; i < cells.length; i++) {
        if (cells[i].term === term) return i;
      }
      return -1;
    }
    function blocked(state2, board5, team) {
      if (state2.current < 0) return "Call a definition first";
      if (state2.winners.indexOf(team) > -1) return "Already has a line";
      var i = square(state2, board5, team);
      if (i < 0) return "Not on this card";
      if (state2.cards[team][i].state === "claimed") return "Already claimed";
      if (state2.cards[team][i].state === "missed") return "Missed earlier";
      return null;
    }
    function transition(board5, state2, action, arg) {
      var size = Math.max(2, Math.min(4, Number(board5.gridSize) || 3));
      var s = Object.assign({}, state2, {
        called: state2.called.slice(),
        winners: state2.winners.slice(),
        cards: state2.cards.map(function(cells) {
          return cells.map(function(c) {
            return Object.assign({}, c);
          });
        })
      });
      if (action === "restart") return create(board5);
      if (action === "start" && s.phase === "ready") {
        s.phase = "calling";
      } else if (action === "pause" && s.phase === "calling") {
        s.paused = !s.paused;
      } else if (action === "call" && s.phase === "calling" && !s.paused) {
        if (s.winners.length) {
          s.phase = "complete";
          return s;
        }
        var left = [];
        for (var i = 0; i < board5.pool.length; i++) {
          if (s.called.indexOf(i) === -1) left.push(i);
        }
        if (!left.length) {
          s.phase = "complete";
          return s;
        }
        s.current = left[Math.floor(Math.random() * left.length)];
        s.called.push(s.current);
        s.revealed = false;
      } else if (action === "reveal" && s.current > -1 && !s.paused) {
        s.revealed = true;
      } else if ((action === "claim" || action === "miss") && s.phase === "calling" && s.revealed && !s.paused && Number.isInteger(arg) && !blocked(s, board5, arg)) {
        var cell = square(s, board5, arg);
        s.cards[arg][cell].state = action === "claim" ? "claimed" : "missed";
        if (action === "claim" && hasLine(s.cards[arg], size) && s.winners.indexOf(arg) === -1) {
          s.winners.push(arg);
        }
      }
      return s;
    }
    function scores(board5, s) {
      return board5.participants.map(function(name, i) {
        return { name, score: (s.cards[i] || []).filter(function(c) {
          return c.state === "claimed";
        }).length, won: s.winners.indexOf(i) > -1 };
      });
    }
    function winner(board5, s) {
      if (!s.winners.length) return "No line yet.";
      var names = s.winners.map(function(i) {
        return board5.participants[i];
      });
      if (board5.participants.length === 1) return "Bingo — the card is complete.";
      return names.length === 1 ? names[0] + " has a line." : "A shared line: " + names.join(" & ");
    }
    function render2(pad, slide, opts) {
      opts = opts || {};
      var b = slide.bingoBoard, s = opts.bingoState || create(b);
      var command2 = opts.bingoCommand;
      var size = Math.max(2, Math.min(4, Number(b.gridSize) || 3));
      var el = SF.el;
      pad.replaceChildren();
      var seenTerms = {}, unique = 0;
      b.pool.forEach(function(pair) {
        var key = String(pair.term || "").trim().toLowerCase();
        if (key && !seenTerms[key]) {
          seenTerms[key] = 1;
          unique++;
        }
      });
      var shortBy = Math.max(0, size * size - unique);
      function button(text2, action, cls, arg) {
        var node = el("button", "bingo-button " + (cls || ""), text2);
        node.type = "button";
        node.disabled = !command2;
        node.dataset.bingoAction = action;
        if (arg != null) node.dataset.bingoArg = String(arg);
        if (command2) node.onclick = function() {
          command2(action, arg);
        };
        return node;
      }
      var head = el("header", "bingo-head");
      var identity = el("div");
      identity.appendChild(el("div", "bingo-eyebrow", "BINGO / " + size + "×" + size + " · " + b.pool.length + " TERMS"));
      identity.appendChild(el("h2", "bingo-name", slide.title));
      head.appendChild(identity);
      var count = el("div", "bingo-count");
      count.appendChild(el("span", null, s.phase === "ready" ? "READY" : s.phase === "complete" ? "BINGO" : "CALLING"));
      count.appendChild(el("strong", null, s.called.length + " / " + b.pool.length));
      head.appendChild(count);
      pad.appendChild(head);
      var call = el("div", "bingo-call" + (s.current > -1 ? " on" : ""));
      if (s.current > -1) {
        call.appendChild(el("div", "bingo-eyebrow", s.revealed ? "THE TERM WAS" : "WHICH TERM IS THIS?"));
        call.appendChild(el("p", "bingo-def", b.pool[s.current].definition));
        if (s.revealed) call.appendChild(el("strong", "bingo-term", b.pool[s.current].term));
      } else {
        call.appendChild(el("div", "bingo-eyebrow", s.phase === "complete" ? "FINISHED" : "NOTHING CALLED YET"));
        call.appendChild(el("p", "bingo-def", s.phase === "complete" ? winner(b, s) : "Call a definition. If it is on their card, a team says what the term means to claim the square."));
      }
      pad.appendChild(call);
      var cards = el("div", "bingo-cards");
      var across = b.participants.length <= 3 ? b.participants.length : b.participants.length === 4 ? 2 : 3;
      cards.classList.add("across-" + across);
      cards.classList.toggle("many", b.participants.length > 3);
      b.participants.forEach(function(name, team) {
        var box2 = el("section", "bingo-card" + (s.winners.indexOf(team) > -1 ? " won" : ""));
        var caption = el("div", "bingo-card-head");
        caption.appendChild(el("strong", null, name));
        if (command2 && s.phase === "calling") {
          var verdicts = el("div", "bingo-verdicts");
          if (s.current > -1 && !s.revealed) {
            verdicts.appendChild(el("span", "bingo-why", "Waiting on an answer"));
          } else {
            var why = blocked(s, b, team);
            if (why) {
              verdicts.appendChild(el("span", "bingo-why", why));
            } else {
              verdicts.appendChild(button("✓ Claim", "claim", "primary", team));
              verdicts.appendChild(button("✗ Missed", "miss", "", team));
            }
          }
          caption.appendChild(verdicts);
        }
        caption.appendChild(el("span", "bingo-tick", s.winners.indexOf(team) > -1 ? "LINE" : (s.cards[team] || []).filter(function(c) {
          return c.state === "claimed";
        }).length + " / " + size * size));
        box2.appendChild(caption);
        var grid = el("div", "bingo-grid");
        grid.style.gridTemplateColumns = "repeat(" + size + ", minmax(0, 1fr))";
        var live = s.current > -1 && !s.revealed ? -1 : square(s, b, team);
        (s.cards[team] || []).forEach(function(cell, i) {
          var sq = el(
            "div",
            "bingo-square is-" + cell.state + (cell.term ? "" : " is-gap") + (i === live && cell.state === "open" ? " calling" : "") + /* "Mitochondrion" in a sixteenth of a shared card broke across two
               lines as "Mitochondri / on". Smaller reads better than split. */
            ((cell.term || "").length > 11 ? " long" : ""),
            cell.term || "needs a term"
          );
          grid.appendChild(sq);
        });
        box2.appendChild(grid);
        cards.appendChild(box2);
      });
      pad.appendChild(cards);
      var foot = el("div", "bingo-foot");
      var status = el("div", "bingo-status");
      status.setAttribute("aria-live", "polite");
      status.appendChild(el("strong", null, s.paused ? "Paused." : s.phase === "ready" ? "Every team has a different card." : s.phase === "complete" ? winner(b, s) : s.current < 0 ? "Call the next definition." : s.revealed ? "Who claimed “" + b.pool[s.current].term + "”?" : "Read it out. Reveal the term once they have answered."));
      status.appendChild(el("span", shortBy ? "bingo-short" : null, shortBy ? "A " + size + "×" + size + " card needs " + size * size + " different terms and there " + (unique === 1 ? "is" : "are") + " " + unique + " — add " + shortBy + " more, or choose a smaller card size in Game settings" : s.phase === "complete" ? s.called.length + " of " + b.pool.length + " terms called" : "A row, column or diagonal wins · no points · each term is called once"));
      foot.appendChild(status);
      var actions = el("div", "bingo-actions");
      if (s.phase === "ready") actions.appendChild(button("Deal and start →", "start", "primary"));
      if (s.phase === "calling") {
        if (s.current > -1 && !s.revealed) actions.appendChild(button("Reveal the term", "reveal", "primary"));
        var more = s.called.length < b.pool.length;
        var nextLabel = s.current < 0 ? "Call a definition →" : "Call the next →";
        if (!more) {
          nextLabel = s.winners.length ? "Finish — bingo" : "Finish — no line";
        } else if (s.winners.length) {
          nextLabel = "Finish — bingo";
        }
        var next = button(
          nextLabel,
          "call",
          s.revealed || s.current < 0 || s.winners.length || !more ? "primary" : ""
        );
        actions.appendChild(next);
        actions.appendChild(button(s.paused ? "Resume" : "Pause", "pause"));
      }
      if (s.phase === "complete") actions.appendChild(button("Deal a new card", "restart", "primary"));
      foot.appendChild(actions);
      pad.appendChild(foot);
      if (s.phase === "complete") {
        var tally = el("div", "bingo-tally");
        scores(b, s).forEach(function(row) {
          tally.appendChild(el(
            "span",
            row.won ? "won" : null,
            row.name + " · " + row.score + (row.won ? " · LINE" : "")
          ));
        });
        foot.appendChild(tally);
      }
    }
    function command(action, arg) {
      if (!active2) return;
      var board5 = active2.slide.bingoBoard;
      var before = active2.player.bingoStates[active2.slide.id];
      var after = transition(board5, before, action, arg);
      active2.player.bingoStates[active2.slide.id] = after;
      if ((action === "claim" || action === "miss") && before.current > -1 && Number.isInteger(arg) && after.cards[arg] && SF.Bingo.onVerdict) {
        var cell = square(before, board5, arg);
        var changed = cell > -1 && before.cards[arg][cell].state !== after.cards[arg][cell].state;
        if (changed) SF.Bingo.onVerdict({
          slideId: active2.slide.id,
          title: active2.slide.title,
          kind: "bingo",
          set: 1,
          card: cell,
          term: board5.pool[before.current].term,
          participant: board5.participants.length > 1 ? board5.participants[arg] : null,
          right: action === "claim"
        });
      }
      active2.paint(true);
    }
    function mount(player, slide, node) {
      unmount();
      var session = SF.Boards.createSession("bingo", {
        player,
        slide,
        node,
        create,
        render: render2,
        command,
        interval: 1e3,
        tick: function(session2, dt) {
          var s = player.bingoStates[slide.id];
          if (s.phase !== "calling") return;
          s.elapsed += dt;
        }
      });
      active2 = session;
      session.start();
    }
    function unmount() {
      if (!active2) return;
      active2.stop();
      active2 = null;
    }
    SF.Bingo = {
      onVerdict: null,
      create,
      transition,
      deal,
      scores,
      winner,
      blocked,
      square,
      render: render2,
      mount,
      unmount,
      command
    };
  }

  // src/boards/runtimes/bowl.js
  function installBowl(SF) {
    var active2 = null;
    function create(board5) {
      return {
        phase: "ready",
        /* How many of each cell's questions have been used, by cell index. A
           cell with two questions in it can be chosen twice. */
        used: board5.cells.map(function() {
          return 0;
        }),
        cell: -1,
        // the cell being asked, or -1 between questions
        revealed: false,
        // has the answer been shown
        scores: board5.participants.map(function() {
          return 0;
        }),
        asked: 0,
        awarded: 0,
        elapsed: 0,
        paused: false
      };
    }
    function pending(board5, state2, index) {
      var cell = board5.cells[index];
      if (!cell) return null;
      return cell.questions[state2.used[index]] || null;
    }
    function spent(board5, state2) {
      return board5.cells.every(function(cell, i) {
        return state2.used[i] >= cell.questions.length;
      });
    }
    function leaders(board5, state2) {
      var top = Math.max.apply(null, state2.scores.concat([0]));
      return state2.scores.reduce(function(out, score, i) {
        if (score === top && top > 0) out.push(i);
        return out;
      }, []);
    }
    function reached(board5, state2) {
      return state2.scores.some(function(score) {
        return score >= board5.target;
      });
    }
    function transition(board5, state2, action, arg) {
      var s = Object.assign({}, state2, {
        used: state2.used.slice(),
        scores: state2.scores.slice()
      });
      if (action === "restart") return create(board5);
      if (action === "start" && s.phase === "ready") {
        s.phase = "picking";
      } else if (action === "pause" && (s.phase === "picking" || s.phase === "asking")) {
        s.paused = !s.paused;
      } else if (action === "pick" && s.phase === "picking" && !s.paused && Number.isInteger(arg) && pending(board5, s, arg)) {
        s.cell = arg;
        s.revealed = false;
        s.phase = "asking";
        s.asked++;
      } else if (action === "reveal" && s.phase === "asking" && !s.paused) {
        s.revealed = true;
      } else if ((action === "award" || action === "noScore") && s.phase === "asking" && s.revealed && !s.paused && s.cell > -1) {
        var cell = board5.cells[s.cell];
        if (action === "award") {
          if (!Number.isInteger(arg) || arg < 0 || arg >= s.scores.length) return state2;
          s.scores[arg] += cell.value;
          s.awarded++;
        }
        s.used[s.cell]++;
        s.cell = -1;
        s.revealed = false;
        s.phase = spent(board5, s) || reached(board5, s) ? "complete" : "picking";
      }
      return s;
    }
    function scores(board5, s) {
      return board5.participants.map(function(name, i) {
        return { name, score: s.scores[i] || 0 };
      });
    }
    function winner(board5, s) {
      var top = leaders(board5, s);
      if (!top.length) return "Nobody scored.";
      var names = top.map(function(i) {
        return board5.participants[i];
      });
      if (board5.participants.length === 1) {
        return s.scores[0] >= board5.target ? "Target reached — " + s.scores[0] + " points." : "The board is empty on " + s.scores[0] + " of " + board5.target + ".";
      }
      return names.length === 1 ? names[0] + " wins on " + s.scores[top[0]] + "." : "A tie on " + s.scores[top[0]] + ": " + names.join(" & ");
    }
    function render2(pad, slide, opts) {
      opts = opts || {};
      var b = slide.bowlBoard, s = opts.bowlState || create(b);
      var command2 = opts.bowlCommand;
      var el = SF.el;
      pad.replaceChildren();
      function button(text3, action, cls, arg) {
        var node = el("button", "bowl-button " + (cls || ""), text3);
        node.type = "button";
        node.disabled = !command2;
        node.dataset.bowlAction = action;
        if (arg != null) node.dataset.bowlArg = String(arg);
        if (command2) node.onclick = function() {
          command2(action, arg);
        };
        return node;
      }
      var head = el("header", "bowl-head");
      var identity = el("div");
      identity.appendChild(el("div", "bowl-eyebrow", "QUIZ BOWL / FIRST TO " + b.target));
      identity.appendChild(el("h2", "bowl-name", slide.title));
      head.appendChild(identity);
      var count = el("div", "bowl-count");
      count.appendChild(el("span", null, s.phase === "ready" ? "READY" : s.phase === "complete" ? "FINISHED" : s.phase === "asking" ? "ON A CELL" : "CHOOSE"));
      var left = b.cells.reduce(function(n, cell, i) {
        return n + Math.max(0, cell.questions.length - s.used[i]);
      }, 0);
      count.appendChild(el("strong", null, left + " left"));
      head.appendChild(count);
      pad.appendChild(head);
      if (s.phase === "asking" && s.cell > -1) {
        var q = pending(b, s, s.cell);
        var cellNow = b.cells[s.cell];
        var ask = el("div", "bowl-ask");
        ask.appendChild(el("div", "bowl-eyebrow", cellNow.category.toUpperCase() + " · " + cellNow.value));
        var text2 = q ? q.question : "";
        var qEl = el("p", "bowl-question", text2);
        qEl.dataset.len = text2.length > 150 ? "xl" : text2.length > 80 ? "lg" : "md";
        ask.appendChild(qEl);
        if (s.revealed) {
          var reveal = el("div", "bowl-answer");
          reveal.appendChild(el("span", "bowl-eyebrow", "THE ANSWER"));
          reveal.appendChild(el("strong", null, q ? q.answer : ""));
          ask.appendChild(reveal);
        } else {
          ask.appendChild(el("p", "bowl-hint", "Take an answer from the room, then reveal."));
        }
        pad.appendChild(ask);
      } else {
        var grid = el("div", "bowl-grid");
        grid.style.gridTemplateColumns = "repeat(" + Math.max(1, b.categories.length) + ", minmax(0, 1fr))";
        b.categories.forEach(function(name) {
          grid.appendChild(el("div", "bowl-category", name));
        });
        b.cells.forEach(function(cell, i) {
          var waiting = Math.max(0, cell.questions.length - s.used[i]);
          if (!waiting) {
            grid.appendChild(el("div", "bowl-cell is-spent", "·"));
            return;
          }
          var node = button(String(cell.value), "pick", "bowl-cell", i);
          node.classList.remove("bowl-button");
          node.classList.add("bowl-cell");
          node.disabled = !command2 || s.phase !== "picking" || s.paused;
          node.setAttribute("aria-label", cell.category + ", " + cell.value + " points");
          if (waiting > 1) node.appendChild(el("span", "bowl-stack", "×" + waiting));
          grid.appendChild(node);
        });
        pad.appendChild(grid);
      }
      var tally = el("div", "bowl-tally");
      tally.classList.toggle("many", b.participants.length > 3);
      scores(b, s).forEach(function(row, i) {
        var box2 = el("section", "bowl-team" + (s.phase === "complete" && leaders(b, s).indexOf(i) > -1 ? " won" : ""));
        var line = el("div", "bowl-team-head");
        line.appendChild(el("strong", null, row.name));
        line.appendChild(el("span", "bowl-score", String(row.score)));
        box2.appendChild(line);
        if (command2 && s.phase === "asking" && s.revealed) {
          box2.appendChild(button("+ " + b.cells[s.cell].value, "award", "primary", i));
        }
        tally.appendChild(box2);
      });
      pad.appendChild(tally);
      var foot = el("div", "bowl-foot");
      var status = el("div", "bowl-status");
      status.setAttribute("aria-live", "polite");
      status.appendChild(el("strong", null, s.paused ? "Paused." : s.phase === "ready" ? "Pick a category and a value to begin." : s.phase === "complete" ? winner(b, s) : s.phase === "asking" ? s.revealed ? "Who answered it?" : "Read it out and take an answer." : "Choose an unused cell."));
      status.appendChild(el("span", null, s.phase === "complete" ? s.asked + " cells opened · " + s.awarded + " awarded" : "Correct scores the cell value · a cell is spent either way · first to " + b.target));
      foot.appendChild(status);
      var actions = el("div", "bowl-actions");
      if (s.phase === "ready") actions.appendChild(button("Open the board →", "start", "primary"));
      if (s.phase === "asking") {
        if (!s.revealed) actions.appendChild(button("Reveal the answer", "reveal", "primary"));
        else actions.appendChild(button("Nobody scored", "noScore"));
      }
      if (s.phase === "picking" || s.phase === "asking") {
        actions.appendChild(button(s.paused ? "Resume" : "Pause", "pause"));
      }
      if (s.phase === "complete") actions.appendChild(button("Play this board again", "restart", "primary"));
      foot.appendChild(actions);
      pad.appendChild(foot);
    }
    function command(action, arg) {
      if (!active2) return;
      var board5 = active2.slide.bowlBoard;
      var before = active2.player.bowlStates[active2.slide.id];
      var after = transition(board5, before, action, arg);
      active2.player.bowlStates[active2.slide.id] = after;
      if ((action === "award" || action === "noScore") && before.cell > -1 && after.cell === -1 && SF.Bowl.onVerdict) {
        var cell = board5.cells[before.cell];
        var q = pending(board5, before, before.cell);
        SF.Bowl.onVerdict({
          slideId: active2.slide.id,
          title: active2.slide.title,
          kind: "bowl",
          set: 1,
          card: before.cell,
          term: cell.category + " " + cell.value + " — " + (q ? q.question : ""),
          participant: action === "award" && board5.participants.length > 1 ? board5.participants[arg] : null,
          right: action === "award",
          value: action === "award" ? cell.value : 0
        });
      }
      active2.paint(true);
    }
    function mount(player, slide, node) {
      unmount();
      var session = SF.Boards.createSession("bowl", {
        player,
        slide,
        node,
        create,
        render: render2,
        command,
        interval: 1e3,
        tick: function(session2, dt) {
          var s = player.bowlStates[slide.id];
          if (s.phase === "ready" || s.phase === "complete") return;
          s.elapsed += dt;
        }
      });
      active2 = session;
      session.start();
    }
    function unmount() {
      if (!active2) return;
      active2.stop();
      active2 = null;
    }
    SF.Bowl = {
      onVerdict: null,
      create,
      transition,
      pending,
      spent,
      scores,
      winner,
      leaders,
      render: render2,
      mount,
      unmount,
      command
    };
  }

  // src/boards/runtimes/memory.js
  function installMemory(SF) {
    var active2 = null;
    function create(board5) {
      return {
        phase: "ready",
        selected: -1,
        revealed: false,
        turn: 0,
        owners: board5.pairs.map(function() {
          return null;
        }),
        remaining: board5.studySeconds,
        paused: false,
        elapsed: 0,
        attempts: 0
      };
    }
    function transition(board5, state2, action, card) {
      var s = Object.assign({}, state2, { owners: state2.owners.slice() });
      if (action === "restart") return create(board5);
      if (action === "start" && s.phase === "ready") {
        s.phase = board5.kind === "knowledgeflip" || !s.remaining ? "recall" : "study";
      } else if (action === "hide" && s.phase === "study") {
        s.phase = "recall";
        s.remaining = 0;
        s.paused = false;
      } else if (action === "pause" && (s.phase === "study" || s.phase === "recall")) {
        s.paused = !s.paused;
      } else if (action === "select" && s.phase === "recall" && !s.paused && s.selected === -1 && Number.isInteger(card) && card >= 0 && card < s.owners.length && s.owners[card] === null) {
        s.selected = card;
        s.revealed = false;
      } else if (action === "reveal" && s.phase === "recall" && !s.paused && s.selected !== -1) {
        s.revealed = true;
      } else if ((action === "claim" || action === "pass") && s.phase === "recall" && !s.paused && s.selected !== -1 && (action === "pass" || s.revealed)) {
        if (action === "claim") s.owners[s.selected] = s.turn;
        s.attempts++;
        s.selected = -1;
        s.revealed = false;
        s.turn = (s.turn + 1) % Math.max(1, board5.participants.length);
        if (s.owners.every(function(owner) {
          return owner !== null;
        })) s.phase = "complete";
      }
      return s;
    }
    function scores(board5, s) {
      return board5.participants.map(function(name, i) {
        return { name, score: s.owners.filter(function(owner) {
          return owner === i;
        }).length };
      });
    }
    function winner(board5, s) {
      var rows2 = scores(board5, s), max = Math.max.apply(null, rows2.map(function(r) {
        return r.score;
      }));
      var names = rows2.filter(function(r) {
        return r.score === max;
      }).map(function(r) {
        return r.name;
      });
      if (rows2.length === 1) return "Every pair remembered.";
      return names.length === 1 ? names[0] + " wins this set." : "Shared win: " + names.join(" & ");
    }
    function render2(pad, slide, opts) {
      opts = opts || {};
      var b = slide.memoryBoard, s = opts.memoryState || create(b), preview = !opts.memoryState;
      var command2 = opts.memoryCommand;
      var el = SF.el;
      pad.replaceChildren();
      function button(text2, action, cls, card) {
        var node = el("button", "mem-button " + (cls || ""), text2);
        node.type = "button";
        node.disabled = !command2;
        node.dataset.memoryAction = action;
        if (card != null) node.dataset.memoryCard = String(card);
        if (command2) node.onclick = function() {
          command2(action, card);
        };
        return node;
      }
      var head = el("header", "mem-header");
      var titles = { memorymatch: "MEMORY MATCH", memoryflip: "MEMORY FLIP", knowledgeflip: "KNOWLEDGE FLIP" };
      var identity = el("div");
      identity.appendChild(el("div", "mem-eyebrow", titles[b.kind] + " / SET " + b.set + " OF " + b.sets));
      identity.appendChild(el("h2", "mem-title", slide.title));
      head.appendChild(identity);
      var clock = el("div", "mem-clock");
      clock.appendChild(el("span", null, s.phase === "ready" ? "READY" : s.phase === "study" ? "STUDY" : s.phase === "complete" ? "FINISHED" : "RECALL"));
      clock.appendChild(el("strong", "mem-time", s.phase === "study" ? Math.ceil(s.remaining) + "s" : Math.floor(s.elapsed / 60) + ":" + String(Math.floor(s.elapsed % 60)).padStart(2, "0")));
      head.appendChild(clock);
      pad.appendChild(head);
      var progress = el("div", "mem-progress");
      ["1 · Study", "2 · Recall", "3 · Collect"].forEach(function(label, i) {
        if (b.kind === "knowledgeflip" && i === 0) label = "1 · Choose";
        var current = s.phase === "ready" || s.phase === "study" ? 0 : s.phase === "complete" ? 2 : 1;
        progress.appendChild(el("span", i <= current ? "on" : "", label));
      });
      progress.appendChild(el("strong", null, s.owners.filter(function(o) {
        return o !== null;
      }).length + " / " + b.pairs.length + " collected"));
      pad.appendChild(progress);
      var allVisible = preview || s.phase === "study" || s.phase === "complete";
      if (b.kind === "knowledgeflip") allVisible = s.phase === "complete";
      var grid = el("div", "mem-grid");
      grid.classList.toggle("mem-grid-small", b.pairs.length <= 4);
      grid.classList.toggle("mem-grid-knowledge", b.kind === "knowledgeflip");
      b.pairs.forEach(function(pair, i) {
        var owned = s.owners[i] !== null, selected = s.selected === i;
        var face = allVisible || owned || selected || b.kind === "knowledgeflip";
        var card = button("", "select", "mem-card" + (face ? " face-up" : " face-down") + (owned ? " collected" : "") + (selected ? " selected" : "") + (b.kind === "knowledgeflip" ? " knowledge" : ""), i);
        card.classList.toggle("dense", pair.term.length > 35 || pair.definition.length > 150);
        card.disabled = !command2 || s.phase !== "recall" || s.paused || owned || s.selected !== -1;
        card.setAttribute("aria-label", face ? pair.term + (owned ? ", collected" : "") : "Choose card " + (i + 1));
        card.appendChild(el("span", "mem-card-number", String(i + 1).padStart(2, "0")));
        if (face) {
          card.appendChild(el("strong", "mem-term", pair.term));
          if (allVisible) card.appendChild(el("span", "mem-definition", pair.definition));
          else if (owned) card.appendChild(el("span", "mem-owner", "✓ " + b.participants[s.owners[i]]));
          else card.appendChild(el(
            "span",
            "mem-card-prompt",
            selected ? "Explain it aloud" : "Choose & explain"
          ));
        } else {
          card.appendChild(el("span", "mem-symbol", "✳"));
          card.appendChild(el("span", "mem-card-prompt", "What do you remember?"));
        }
        grid.appendChild(card);
      });
      pad.appendChild(grid);
      var bottom = el("div", "mem-bottom");
      var status = el("div", "mem-status");
      status.setAttribute("aria-live", "polite");
      var caption = s.paused ? "Paused. Take a moment." : s.phase === "ready" ? b.kind === "knowledgeflip" ? "Keywords stay on the board. Choose one, explain it, then collect the card." : "Ready? Study the whole set, then recall from the hidden cards." : s.phase === "study" ? "Make a connection between each term and its meaning." : s.phase === "complete" ? winner(b, s) : s.selected < 0 ? b.participants[s.turn] + " — choose a keyword." : b.participants[s.turn] + " — explain “" + b.pairs[s.selected].term + "”.";
      status.appendChild(el("strong", null, caption));
      status.appendChild(el("span", null, s.phase === "complete" ? s.attempts + " attempts · " + b.pairs.length + " cards collected" : b.kind === "knowledgeflip" ? b.participants.length > 1 ? "No study timer · 1 point per claim · turns rotate · misses can be retried" : "No study timer · explain aloud · teacher checks · misses can be retried" : b.participants.length > 1 ? "1 point per claim · turns rotate after a claim or pass · misses can be retried" : "One class collection · explain aloud · teacher checks · misses can be retried"));
      bottom.appendChild(status);
      var actions = el("div", "mem-actions");
      if (s.phase === "ready") actions.appendChild(button(b.kind === "knowledgeflip" ? "Open the board →" : "Start studying →", "start", "primary"));
      if (s.phase === "study") actions.appendChild(button("Ready to recall →", "hide", "primary"));
      if (s.phase === "study" || s.phase === "recall") actions.appendChild(button(s.paused ? "Resume" : "Pause", "pause"));
      if (s.phase === "complete") actions.appendChild(button("Play this set again", "restart", "primary"));
      if (s.selected !== -1 && s.phase === "recall" && !s.paused) {
        var check = el("div", "mem-check");
        check.setAttribute("role", "group");
        check.setAttribute("aria-label", "Check this claim");
        check.appendChild(el(
          "div",
          "mem-eyebrow",
          b.kind === "knowledgeflip" ? "EXPLAIN FIRST · THEN CHECK" : "SAY IT FIRST · THEN CHECK"
        ));
        check.appendChild(el("h3", null, b.pairs[s.selected].term));
        check.appendChild(el("p", null, s.revealed ? b.pairs[s.selected].definition : "Explain the meaning before revealing the definition."));
        var verdicts = el("div", "mem-actions");
        if (!s.revealed) verdicts.appendChild(button("Reveal definition", "reveal", "primary"));
        else verdicts.appendChild(button("✓ Claim card · +1", "claim", "primary"));
        verdicts.appendChild(button(s.revealed ? "Try again next turn" : "Pass this turn", "pass"));
        check.appendChild(verdicts);
        pad.appendChild(check);
      }
      bottom.appendChild(actions);
      pad.appendChild(bottom);
      if (s.phase === "complete") {
        var tally = el("div", "mem-tally");
        scores(b, s).forEach(function(row) {
          tally.appendChild(el("span", null, row.name + " · " + row.score));
        });
        bottom.appendChild(tally);
      }
    }
    function command(action, card) {
      if (!active2) return;
      active2.tick();
      var board5 = active2.slide.memoryBoard;
      var before = active2.player.memoryStates[active2.slide.id];
      var after = transition(board5, before, action, card);
      active2.player.memoryStates[active2.slide.id] = after;
      if ((action === "claim" || action === "pass") && before.selected !== -1 && after.selected === -1 && SF.Memory.onVerdict) {
        var pair = board5.pairs[before.selected];
        SF.Memory.onVerdict({
          slideId: active2.slide.id,
          title: active2.slide.title,
          kind: board5.kind,
          set: board5.set,
          card: before.selected,
          term: pair.term,
          participant: board5.participants.length > 1 ? board5.participants[before.turn] : null,
          right: action === "claim"
        });
      }
      active2.paint(true);
    }
    function mount(player, slide, node) {
      unmount();
      var session = SF.Boards.createSession("memory", {
        player,
        slide,
        node,
        create,
        render: render2,
        command,
        interval: 1e3,
        tick: function(session2, dt) {
          var s = player.memoryStates[slide.id];
          if (s.phase === "study") {
            s.remaining = Math.max(0, s.remaining - dt);
            if (!s.remaining) {
              player.memoryStates[slide.id] = transition(slide.memoryBoard, s, "hide");
              session2.paint(false);
              return;
            }
          } else if (s.phase === "recall") s.elapsed += dt;
          else return;
          return true;
        }
      });
      active2 = session;
      session.start();
    }
    function unmount() {
      if (!active2) return;
      active2.stop();
      active2 = null;
    }
    SF.Memory = {
      onVerdict: null,
      create,
      transition,
      scores,
      winner,
      render: render2,
      mount,
      unmount,
      command
    };
  }

  // src/boards/runtimes/lowstakes.js
  function installLowStakes(SF) {
    var active2 = null;
    function create(board5) {
      return {
        phase: "ready",
        remaining: Math.max(0, Number(board5.timeLimit) || 0),
        paused: false,
        elapsed: 0
      };
    }
    function transition(board5, state2, action) {
      var s = Object.assign({}, state2);
      if (action === "restart") return create(board5);
      if (action === "start" && s.phase === "ready") {
        s.phase = "quiz";
        s.remaining = Math.max(0, Number(board5.timeLimit) || 0);
        s.paused = false;
        s.elapsed = 0;
      } else if (action === "pause" && s.phase === "quiz") {
        s.paused = !s.paused;
      } else if (action === "reveal" && (s.phase === "quiz" || s.phase === "ready")) {
        s.phase = "answers";
        s.paused = false;
        s.remaining = 0;
      } else if (action === "finish" && s.phase === "answers") {
        s.phase = "complete";
      } else if (action === "expire" && s.phase === "quiz") {
        s.phase = "answers";
        s.paused = false;
        s.remaining = 0;
      }
      return s;
    }
    function formatClock(seconds) {
      var n = Math.max(0, Math.ceil(seconds));
      var m = Math.floor(n / 60);
      var s = n % 60;
      return m + ":" + String(s).padStart(2, "0");
    }
    function render2(pad, slide, opts) {
      opts = opts || {};
      var b = slide.lowstakesBoard;
      var s = opts.lowstakesState || create(b);
      var preview = !opts.lowstakesState;
      var command2 = opts.lowstakesCommand;
      var el = SF.el;
      pad.replaceChildren();
      ["phase-ready", "phase-quiz", "phase-answers", "phase-complete", "is-paused", "is-preview"].forEach(function(c) {
        pad.classList.remove(c);
      });
      pad.classList.add("phase-" + s.phase);
      if (s.paused) pad.classList.add("is-paused");
      if (preview) pad.classList.add("is-preview");
      function button(text2, action, cls) {
        var node = el("button", "lsq-button " + (cls || ""), text2);
        node.type = "button";
        node.disabled = !command2;
        node.dataset.lowstakesAction = action;
        if (command2) node.onclick = function() {
          command2(action);
        };
        return node;
      }
      var head = el("header", "lsq-header");
      var identity = el("div");
      identity.appendChild(el("div", "lsq-eyebrow", "LOW-STAKES QUIZ · NO NOTES — RETRIEVAL"));
      identity.appendChild(el("h2", "lsq-title", slide.title));
      head.appendChild(identity);
      var clock = el("div", "lsq-clock");
      var clockLabel = s.phase === "ready" ? "READY" : s.phase === "quiz" ? s.paused ? "PAUSED" : "QUIZ" : s.phase === "answers" ? "REVEAL" : "DONE";
      clock.appendChild(el("span", null, clockLabel));
      clock.appendChild(el(
        "strong",
        "lsq-time",
        s.phase === "quiz" ? formatClock(s.remaining) : s.phase === "ready" ? formatClock(b.timeLimit) : formatClock(s.elapsed)
      ));
      head.appendChild(clock);
      pad.appendChild(head);
      var progress = el("div", "lsq-progress");
      ["1 · Ready", "2 · Write", "3 · Reveal"].forEach(function(label, i) {
        var current = s.phase === "ready" ? 0 : s.phase === "quiz" ? 1 : 2;
        progress.appendChild(el("span", i <= current ? "on" : "", label));
      });
      progress.appendChild(el(
        "strong",
        null,
        b.items.filter(function(item) {
          return !item.gap;
        }).length + " ready · no scoreboard"
      ));
      pad.appendChild(progress);
      var showAnswers = preview || s.phase === "answers" || s.phase === "complete";
      var readyCount = b.items.filter(function(item) {
        return !item.gap;
      }).length;
      var list = el("ol", "lsq-list" + (showAnswers ? " revealed" : ""));
      b.items.forEach(function(item, i) {
        var row = el("li", "lsq-item" + (item.gap ? " is-gap" : ""));
        row.appendChild(el("span", "lsq-num", String(i + 1).padStart(2, "0")));
        var body = el("div", "lsq-body");
        if (item.gap === "question") {
          body.appendChild(el("p", "lsq-gap", "Needs a question"));
          body.appendChild(el("p", "lsq-prompt", "Fill this row in Quiz studio before you play"));
        } else if (item.gap === "answer") {
          body.appendChild(el("p", "lsq-question", item.question));
          body.appendChild(el("p", "lsq-gap", "Needs an answer for the reveal"));
        } else {
          body.appendChild(el("p", "lsq-question", item.question));
          if (showAnswers) {
            body.appendChild(el("p", "lsq-answer", item.answer));
          } else {
            body.appendChild(el("p", "lsq-prompt", "Write your answer on paper · no notes"));
          }
        }
        row.appendChild(body);
        list.appendChild(row);
      });
      if (!b.items.length) {
        var empty = el("li", "lsq-item is-gap");
        empty.appendChild(el("span", "lsq-num", "—"));
        var emptyBody = el("div", "lsq-body");
        emptyBody.appendChild(el("p", "lsq-gap", "Needs questions"));
        emptyBody.appendChild(el("p", "lsq-prompt", "Add at least three question–answer pairs in Quiz studio"));
        empty.appendChild(emptyBody);
        list.appendChild(empty);
      }
      pad.appendChild(list);
      var bottom = el("div", "lsq-bottom");
      var status = el("div", "lsq-status");
      status.setAttribute("aria-live", "polite");
      var caption = s.paused ? "Paused. Resume when the room is ready." : s.phase === "ready" ? "Questions stay on the board. Answers stay hidden until time is up." : s.phase === "quiz" ? "Retrieval in progress — no notes, no phones scoring this round." : s.phase === "answers" ? "Discuss answers together before moving on." : "Retrieval complete. Replay resets the clock.";
      status.appendChild(el("strong", null, caption));
      status.appendChild(el(
        "span",
        null,
        readyCount + " of " + b.items.length + " ready · " + formatClock(b.timeLimit) + " quiz · paper answers · no points"
      ));
      bottom.appendChild(status);
      var actions = el("div", "lsq-actions");
      if (s.phase === "ready") {
        actions.appendChild(button("Start the quiz →", "start", "primary"));
        actions.appendChild(button("Reveal answers now", "reveal"));
      }
      if (s.phase === "quiz") {
        actions.appendChild(button(s.paused ? "Resume" : "Pause", "pause"));
        actions.appendChild(button("Reveal answers →", "reveal", "primary"));
      }
      if (s.phase === "answers") {
        actions.appendChild(button("Finish", "finish", "primary"));
        actions.appendChild(button("Play again", "restart"));
      }
      if (s.phase === "complete") {
        actions.appendChild(button("Play this quiz again", "restart", "primary"));
      }
      bottom.appendChild(actions);
      pad.appendChild(bottom);
    }
    function command(action) {
      if (!active2) return;
      active2.tick();
      var board5 = active2.slide.lowstakesBoard;
      var before = active2.player.lowstakesStates[active2.slide.id];
      var after = transition(board5, before, action);
      active2.player.lowstakesStates[active2.slide.id] = after;
      if (action === "reveal" || action === "expire") {
        if (SF.LowStakes.onReveal) {
          SF.LowStakes.onReveal({
            slideId: active2.slide.id,
            title: active2.slide.title,
            count: board5.items.filter(function(item) {
              return !item.gap;
            }).length,
            early: action === "reveal" && before.phase === "quiz" && before.remaining > 0
          });
        }
      }
      active2.paint(true);
    }
    function mount(player, slide, node) {
      unmount();
      var session = SF.Boards.createSession("lowstakes", {
        player,
        slide,
        node,
        create,
        render: render2,
        command,
        interval: 250,
        tick: function(session2, dt) {
          var s = player.lowstakesStates[slide.id];
          if (s.phase === "quiz") {
            s.remaining = Math.max(0, s.remaining - dt);
            s.elapsed += dt;
            if (!s.remaining) {
              player.lowstakesStates[slide.id] = transition(slide.lowstakesBoard, s, "expire");
              if (SF.LowStakes.onReveal) {
                SF.LowStakes.onReveal({
                  slideId: slide.id,
                  title: slide.title,
                  count: slide.lowstakesBoard.items.filter(function(item) {
                    return !item.gap;
                  }).length,
                  early: false
                });
              }
              session2.paint(false);
              return;
            }
          } else {
            return;
          }
          return true;
        }
      });
      active2 = session;
      session.start();
    }
    function unmount() {
      if (!active2) return;
      active2.stop();
      active2 = null;
    }
    SF.LowStakes = {
      create,
      transition,
      render: render2,
      mount,
      unmount,
      command,
      formatClock,
      onReveal: null
    };
  }

  // src/boards/runtimes/boss.js
  function installBoss(SF) {
    function create(questions, participants, seconds) {
      var qs = (questions || []).map(function(q, i) {
        return {
          id: q.id || "q" + i,
          damage: Math.max(0, Number(q.bossDamage) || SF.bossDamage(q.difficulty) || 0),
          difficulty: q.difficulty || "medium",
          /* A question with nothing to ask is still a square on the board — it
             is named as missing rather than quietly skipped. */
          ready: !!(String(q.question || "").trim() && (q.options || []).length)
        };
      });
      var max = Math.max(1, qs.reduce(function(n, q) {
        return n + q.damage;
      }, 0));
      return {
        phase: "ready",
        questions: qs,
        participants: (participants || ["The class"]).slice(),
        seconds: Math.max(0, Number(seconds) || 0),
        index: 0,
        hp: max,
        max,
        revealed: false,
        expired: false,
        hits: 0,
        misses: 0,
        timeouts: 0,
        marked: [],
        remaining: Math.max(0, Number(seconds) || 0),
        dealt: {},
        log: []
      };
    }
    function turn(s) {
      if (!s.participants.length) return 0;
      return s.index % s.participants.length;
    }
    function current(s) {
      return s.questions[s.index] || null;
    }
    function isMarked(s) {
      var q = current(s);
      return !!(q && (s.marked || []).indexOf(q.id) > -1);
    }
    function damageNow(s) {
      var q = current(s);
      return q ? q.damage : 0;
    }
    function copy(s) {
      return Object.assign({}, s, {
        marked: (s.marked || []).slice(),
        dealt: Object.assign({}, s.dealt),
        log: s.log.slice(),
        questions: s.questions.slice(),
        participants: s.participants.slice()
      });
    }
    function advance(s) {
      s.marked = (s.marked || []).concat([s.questions[s.index].id]);
      s.revealed = false;
      s.expired = false;
      s.remaining = s.seconds;
      if (s.hp <= 0) s.phase = "complete";
      else if (s.marked.length >= s.questions.length) s.phase = "complete";
      else s.phase = "asking";
      return s;
    }
    function transition(state2, action, arg) {
      var s = copy(state2);
      if (action === "restart") return create(state2.questions.map(function(q) {
        return {
          id: q.id,
          bossDamage: q.damage,
          difficulty: q.difficulty,
          question: q.ready ? "x" : "",
          options: q.ready ? [1] : []
        };
      }), state2.participants, state2.seconds);
      if (action === "start" && s.phase === "ready") {
        s.phase = "asking";
        s.remaining = s.seconds;
      } else if (isMarked(s) && (action === "tick" || action === "expire" || action === "reveal" || action === "hit" || action === "miss")) {
        return s;
      } else if (action === "tick" && s.phase === "asking" && s.seconds > 0) {
        s.remaining = Math.max(0, s.remaining - Math.max(0, Number(arg) || 0));
        if (s.remaining <= 0) {
          s.phase = "marking";
          s.revealed = true;
          s.expired = true;
        }
      } else if (action === "expire" && s.phase === "asking") {
        s.remaining = 0;
        s.phase = "marking";
        s.revealed = true;
        s.expired = true;
      } else if (action === "reveal" && s.phase === "asking") {
        s.phase = "marking";
        s.revealed = true;
        s.expired = false;
      } else if (action === "hit" && s.phase === "marking" && !s.expired) {
        var who = s.participants[turn(s)] || "The class";
        var dmg = damageNow(s);
        s.hp = Math.max(0, s.hp - dmg);
        s.hits++;
        s.dealt[who] = (s.dealt[who] || 0) + dmg;
        s.log.push({ index: s.index, who, damage: dmg, hit: true, expired: false });
        advance(s);
      } else if (action === "miss" && s.phase === "marking") {
        var missedBy = s.participants[turn(s)] || "The class";
        s.misses++;
        if (s.expired) s.timeouts++;
        s.log.push({ index: s.index, who: missedBy, damage: 0, hit: false, expired: s.expired });
        advance(s);
      }
      return s;
    }
    function defeated(s) {
      return s.hp <= 0;
    }
    function verdict(s) {
      if (s.phase !== "complete") return "";
      if (s.hp <= 0) return "The boss is defeated.";
      return "The boss survived on " + s.hp + " of " + s.max + " HP.";
    }
    function standings(s) {
      return s.participants.map(function(name) {
        return { name, damage: s.dealt[name] || 0 };
      }).sort(function(a, b) {
        return b.damage - a.damage;
      });
    }
    function stage(s) {
      if (s.hp <= 0) return "defeated";
      if (s.hp <= s.max * 0.34) return "weak";
      if (s.hp <= s.max * 0.67) return "hurt";
      return "full";
    }
    var fights = {};
    function forDeck(deck, questions, participants, seconds) {
      if (!deck) return null;
      var key = deck.presenterGameId || deck.id || "deck";
      if (!questions || !questions.length) return fights[key] || null;
      var fight = fights[key];
      if (!fight || fight.questions.length !== questions.length) {
        fight = fights[key] = create(questions, participants, seconds);
      }
      return fight;
    }
    function command(deck, action, arg) {
      var key = deck && (deck.presenterGameId || deck.id || "deck");
      if (!key || !fights[key]) return null;
      var before = fights[key];
      var after = transition(before, action, arg);
      fights[key] = after;
      if ((action === "hit" || action === "miss") && after.log.length > before.log.length && SF.Boss.onVerdict) {
        var entry = after.log[after.log.length - 1];
        SF.Boss.onVerdict({
          slideId: (deck.presenterGameId || deck.id || "deck") + ":boss",
          title: deck.title || "Boss battle",
          kind: "boss",
          set: 1,
          card: entry.index,
          term: "Q" + (entry.index + 1) + " · " + before.questions[entry.index].difficulty + (entry.expired ? " · out of time" : ""),
          participant: after.participants.length > 1 ? entry.who : null,
          right: entry.hit,
          value: entry.damage
        });
      }
      return after;
    }
    function focus(deck, index) {
      var key = deck && (deck.presenterGameId || deck.id || "deck");
      var f = key && fights[key];
      if (!f || !Number.isInteger(index) || index === f.index) return f || null;
      if (index < 0 || index >= f.questions.length) return f;
      var q = f.questions[index];
      var done = !!(q && (f.marked || []).indexOf(q.id) > -1);
      fights[key] = Object.assign({}, f, {
        index,
        /* A different unmarked question is a fresh ask. A marked one stays
           read-only — reveal/hit/miss are ignored and the UI hides them. */
        revealed: done,
        expired: false,
        remaining: f.seconds,
        phase: f.phase === "complete" ? "complete" : "asking"
      });
      return fights[key];
    }
    function clear() {
      fights = {};
    }
    SF.Boss = {
      onVerdict: null,
      create,
      transition,
      focus,
      turn,
      current,
      isMarked,
      damageNow,
      defeated,
      verdict,
      standings,
      stage,
      forDeck,
      command,
      clear
    };
  }

  // src/boards/runtimes/race.js
  function installRace(SF) {
    function clampLength(n) {
      return Math.max(3, Math.min(12, Number(n) || 5));
    }
    function create(field, length) {
      return {
        pos: {},
        winners: [],
        moved: [],
        length: clampLength(length),
        field: (field || []).map(function(l) {
          return { key: l.key, name: l.name, color: l.color };
        })
      };
    }
    function advance(state2, key) {
      var s = Object.assign({}, state2, {
        pos: Object.assign({}, state2.pos),
        winners: state2.winners.slice(),
        moved: []
      });
      if (!s.field.some(function(l) {
        return l.key === key;
      })) return state2;
      var at = s.pos[key] || 0;
      if (at >= s.length) return s;
      s.pos[key] = at + 1;
      s.moved = [key];
      if (s.pos[key] >= s.length && s.winners.indexOf(key) === -1) s.winners.push(key);
      return s;
    }
    function back(state2, key) {
      var s = Object.assign({}, state2, {
        pos: Object.assign({}, state2.pos),
        winners: state2.winners.filter(function(k) {
          return k !== key;
        }),
        moved: []
      });
      s.pos[key] = Math.max(0, (s.pos[key] || 0) - 1);
      return s;
    }
    function reset(state2) {
      return create(state2.field, state2.length);
    }
    function standings(state2) {
      return state2.field.map(function(l) {
        return {
          key: l.key,
          name: l.name,
          color: l.color,
          pos: state2.pos[l.key] || 0,
          moved: state2.moved.indexOf(l.key) > -1,
          won: state2.winners.indexOf(l.key) > -1
        };
      });
    }
    function finished(state2) {
      return state2.winners.length > 0;
    }
    function winner(state2) {
      if (!state2.winners.length) return "";
      var names = state2.winners.map(function(k) {
        var lane = state2.field.filter(function(l) {
          return l.key === k;
        })[0];
        return lane ? lane.name : k;
      });
      return names.length === 1 ? names[0] + " is home." : "A dead heat: " + names.join(" & ");
    }
    var tracks = {};
    function forDeck(deck, field) {
      if (!deck || !field || !field.length) return null;
      var key = deck.presenterGameId || deck.id || "deck";
      var track = tracks[key];
      var sameField = track && track.field.length === field.length && track.field.every(function(l, i) {
        return l.key === field[i].key;
      });
      if (!sameField || track.length !== clampLength(deck.trackLength)) {
        track = tracks[key] = create(field, deck.trackLength);
      }
      return track;
    }
    function command(deck, action, key) {
      var track = deck && tracks[deck.presenterGameId || deck.id || "deck"];
      if (!track) return null;
      if (action === "advance") track = advance(track, key);
      else if (action === "back") track = back(track, key);
      else if (action === "reset") track = reset(track);
      tracks[deck.presenterGameId || deck.id || "deck"] = track;
      return track;
    }
    function clear() {
      tracks = {};
    }
    SF.Race = {
      create,
      advance,
      back,
      reset,
      standings,
      finished,
      winner,
      forDeck,
      command,
      clear
    };
  }

  // src/render/layout-slots.js
  var region = (col, row, cols, rows2, extra = {}) => ({ col, row, cols, rows: rows2, ...extra });
  var clone = (value) => Object.fromEntries(Object.entries(value || {}).map(([key, value2]) => [key, { ...value2 }]));
  var TITLE = {
    "accent-bar": region(1, 3, 2, 1),
    title: region(1, 5, 10, 5),
    subtitle: region(1, 11, 8, 2),
    "slide-date": region(1, 14, 5, 1)
  };
  var CENTRED = {
    title: region(2, 5, 10, 5, { alignX: "center", alignY: "middle" }),
    body: region(2, 6, 10, 5, { alignX: "center", alignY: "middle" }),
    subtitle: region(3, 12, 8, 2, { alignX: "center" }),
    "statement-credit": region(3, 12, 8, 2, { alignX: "center" }),
    "accent-bar": region(5, 14, 3, 1, { alignX: "center" })
  };
  var TEACHING = {
    title: region(1, 1, 12, 2),
    "block-0": region(1, 4, 11, 4),
    "block-1": region(1, 4, 11, 4),
    "block-2": region(1, 4, 11, 4)
  };
  var TEACHING_INSERTS = [
    region(1, 9, 12, 4),
    region(1, 13, 12, 4)
  ];
  var FULL = {
    title: region(1, 1, 12, 2),
    "block-0": region(1, 4, 12, 12),
    "block-1": region(1, 4, 12, 12),
    "block-2": region(1, 4, 12, 12),
    "block-3": region(1, 4, 12, 12)
  };
  var CHROME = {
    "cp-header": region(1, 2, 11, 1),
    "cp-body": region(1, 3, 11, 13),
    "cp-footer": region(1, 16, 11, 1),
    /* blockKeyOf prefers a content key over a class, so the band a composition
       draws as .cp-eyebrow answers to `subtitle`, and the one it draws as
       .q.cp-scenario answers to `body`. Declare the names it actually returns. */
    title: region(1, 1, 12, 2),
    subtitle: region(2, 4, 10, 1),
    body: region(2, 6, 10, 8)
  };
  var SUB_ROW = { subtitle: region(2, 4, 11, 1) };
  var FOOT = { body: region(2, 15, 11, 1) };
  var COMPOSITION_SLOTS = {
    "poster-art": {
      ...CHROME,
      "cp-title-copy": region(1, 4, 6, 8, { alignY: "middle" }),
      "cp-art": region(8, 3, 5, 10, { alignY: "middle" })
    },
    voice: {
      ...CHROME,
      "cp-quote-mark": region(1, 2, 2, 2),
      "cp-eyebrow": region(2, 4, 8, 1),
      q: region(2, 6, 9, 6, { alignY: "middle" })
    },
    ballot: {
      ...CHROME,
      "cp-heading": region(1, 1, 12, 2),
      "cp-choices": region(1, 4, 12, 10),
      "cp-prompt": region(1, 15, 12, 1)
    },
    prompt: {
      ...CHROME,
      "cp-eyebrow": region(2, 3, 8, 1),
      "cp-discussion": region(2, 5, 9, 7, { alignY: "middle" })
    },
    rules: {
      ...CHROME,
      "cp-heading": region(1, 1, 12, 2),
      "cp-rules": region(1, 4, 12, 9),
      "cp-closing-line": region(1, 13, 12, 1),
      "cp-source": region(1, 15, 12, 1)
    },
    commitment: {
      ...CHROME,
      "cp-action-number": region(1, 3, 2, 2),
      "cp-action": region(3, 4, 8, 8, { alignY: "middle" })
    },
    comparison: {
      ...CHROME,
      "cp-heading": region(1, 1, 12, 2),
      "cp-comparison": region(1, 4, 12, 10),
      "cp-source": region(1, 15, 12, 1)
    },
    "reveal-map": {
      ...CHROME,
      "cp-heading": region(1, 1, 12, 2),
      "cp-risk-map": region(1, 4, 12, 10),
      "cp-source": region(1, 15, 12, 1)
    },
    credits: {
      ...CHROME,
      "cp-heading": region(1, 1, 12, 2),
      "cp-credits": region(1, 4, 12, 10),
      "cp-source": region(1, 15, 12, 1)
    },
    lanes: {
      ...CHROME,
      "cp-heading": region(1, 1, 12, 2),
      "cp-lanes": region(1, 4, 12, 10),
      "cp-source": region(1, 15, 12, 1)
    }
  };
  var TYPES = {
    title: { slots: { ...TITLE } },
    section: { slots: { ...CENTRED, title: region(2, 5, 10, 4, { alignX: "center", alignY: "middle" }) } },
    statement: { slots: { ...CENTRED } },
    quote: { slots: { ...CENTRED, "q": region(2, 5, 9, 6, { alignY: "middle" }), attrib: region(2, 12, 8, 2) } },
    introduction: { slots: {
      "lecturer-portrait": region(1, 3, 4, 10),
      "lecturer-copy": region(6, 3, 7, 10, { alignY: "middle" })
    } },
    journey: { slots: {
      title: region(1, 1, 12, 2),
      "journey-context": region(1, 3, 12, 1),
      "journey-route": region(1, 5, 12, 8),
      "journey-takeaway": region(1, 14, 12, 2),
      ...SUB_ROW,
      ...FOOT
    } },
    mindmap: { slots: { mindmap: region(1, 2, 12, 13) } },
    orgchart: { slots: {
      title: region(1, 1, 12, 2),
      subtitle: region(1, 3, 12, 1),
      "org-chart": region(1, 5, 12, 10),
      empty: region(1, 5, 12, 8)
    } },
    /* No slots, because nothing is drawn. The inserts are where an item goes
       when it is added without being dropped anywhere in particular: the same
       reading column the teaching layouts use, so the first item on a blank
       slide lands where a title would have been rather than in a corner. */
    blank: { slots: {}, inserts: [
      region(1, 1, 12, 2),
      region(1, 4, 11, 4),
      region(1, 9, 11, 4),
      region(1, 13, 11, 3)
    ] },
    split: { slots: {
      "split-copy": region(1, 2, 6, 12),
      "split-media": region(8, 2, 5, 12),
      "split-empty": region(8, 2, 5, 12)
    } },
    image: { slots: {
      img: region(1, 1, 12, 16),
      cap: region(1, 12, 12, 4),
      "image-facts-toggle": region(1, 2, 1, 1),
      "image-facts-back": region(1, 1, 12, 16)
    } },
    gallery: { slots: {
      "gallery-stage": region(1, 1, 12, 16),
      "gallery-copy": region(1, 12, 12, 4),
      title: region(2, 2, 10, 1),
      "fig-stack": region(2, 4, 10, 12)
    } },
    video: { slots: {
      vid: region(1, 1, 12, 16),
      "vid-caption": region(1, 12, 12, 4),
      img: region(1, 1, 12, 16),
      cap: region(1, 10, 12, 7)
    } },
    chart: { slots: {
      ...FULL,
      "chart-wrap": region(1, 4, 12, 11),
      "chart-data-table": region(2, 2, 2, 4),
      "chart-source": region(2, 16, 10, 1),
      "chart-key": region(2, 15, 11, 1),
      "ch-callout": region(2, 15, 11, 1)
    } },
    table: { slots: { ...FULL, tbl: region(1, 4, 12, 11) } },
    code: { slots: { ...FULL, "code-shell": region(1, 4, 12, 11), "code-frame": region(2, 5, 10, 11) } },
    timeline: { slots: { ...TEACHING, ...SUB_ROW, timeline: region(1, 4, 7, 11), "info-takeaway": region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
    stats: { slots: { ...TEACHING, ...SUB_ROW, ...FOOT, "stats-grid": region(1, 4, 7, 11), "info-takeaway": region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
    compare: { slots: { ...TEACHING, ...FOOT, compare: region(1, 4, 7, 11), "info-takeaway": region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
    funnel: { slots: { ...TEACHING, ...SUB_ROW, funnel: region(1, 4, 7, 11), "info-takeaway": region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
    iceberg: { slots: { ...TEACHING, ...FOOT, berg: region(1, 4, 7, 11), "info-takeaway": region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
    spectrum: { slots: { ...TEACHING, ...FOOT, spectrum: region(1, 4, 7, 11), "info-takeaway": region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
    sourcecheck: { slots: { ...TEACHING, ...SUB_ROW, "claim-quote": region(1, 1, 7, 3), "claim-rows": region(1, 5, 7, 10), "info-takeaway": region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
    shift: { slots: { ...TEACHING, ...SUB_ROW, ...FOOT, "shift-track": region(1, 4, 7, 11), "info-takeaway": region(1, 15, 7, 1) }, inserts: TEACHING_INSERTS },
    spotfake: { slots: { ...FULL, "fake-pair": region(1, 4, 12, 8), "fake-tells": region(1, 13, 12, 3) } },
    content: { slots: TEACHING, inserts: TEACHING_INSERTS },
    cards: { slots: {
      ...TEACHING,
      "cards-rows": region(2, 5, 10, 15),
      "cards-stack": region(2, 5, 10, 10),
      "has-card-pics": region(2, 6, 10, 10)
    }, inserts: TEACHING_INSERTS },
    keywords: { slots: {
      ...TEACHING,
      "kw-list": region(2, 5, 10, 6),
      flip: region(2, 5, 10, 10),
      "model-answer": region(2, 10, 10, 4)
    }, inserts: TEACHING_INSERTS },
    italics: { slots: { ...TEACHING, "it-list": region(2, 5, 10, 5) }, inserts: TEACHING_INSERTS },
    links: { slots: { ...TEACHING, "ln-list": region(2, 5, 10, 8) }, inserts: TEACHING_INSERTS },
    keyfact: { slots: {
      ...CENTRED,
      title: region(2, 4, 9, 3),
      body: region(2, 8, 9, 3),
      "keyfact-points": region(2, 12, 9, 3),
      keyfact: region(2, 7, 10, 3),
      "keyfact-notes": region(2, 10, 10, 3)
    } },
    explore: { slots: {
      ...FULL,
      "explore-scene": region(2, 4, 11, 9),
      "explore-caption": region(2, 13, 11, 2),
      "explore-button": region(2, 15, 2, 1)
    } },
    simulation: { slots: {
      ...FULL,
      "explore-graph": region(2, 5, 11, 6),
      "explore-reading": region(2, 12, 11, 1),
      "explore-range": region(2, 13, 11, 1),
      "explore-formula": region(2, 14, 11, 1),
      "explore-button": region(2, 15, 1, 1)
    } },
    /* The motion specimens own their canvas the way an experiment does, and
       advertise no inserter for the same reason. */
    motion: { slots: {
      "ml-kicker": region(2, 2, 11, 1),
      "ml-title": region(2, 3, 11, 1),
      "ml-stage": region(2, 4, 11, 10),
      "ml-status": region(2, 15, 11, 1),
      "ml-controls": region(2, 16, 11, 1)
    } },
    /* A game slide is a single card the engine draws: nothing sits beside it,
       and there is nowhere for a free item to go. */
    game: { slots: { gamecard: region(1, 1, 12, 16) } },
    beforeafter: { slots: {
      ...FULL,
      "before-after": region(1, 3, 12, 11),
      "explore-compare": region(2, 4, 11, 10),
      "explore-range": region(2, 14, 11, 1),
      "explore-actions": region(2, 15, 11, 1)
    } },
    /* Measured off the rendered layout across the 42 experiment slides in the
       library, then written down here: the template declared a title, four
       blocks and a stage, and the renderer emits none of those names. An
       experiment owns its whole canvas and advertises no inserter — there is
       nowhere on it a free item could go without landing on the chart. */
    experiment: { slots: {
      "ve-title": region(2, 2, 11, 1),
      "ve-prompt": region(2, 3, 11, 1),
      "ve-plot": region(2, 4, 11, 8),
      "ve-controls": region(2, 13, 11, 1),
      "ve-explanation": region(2, 14, 11, 1),
      "ve-source": region(2, 16, 11, 1)
    } },
    join: { slots: { "join-stage": region(1, 2, 12, 13) } }
  };
  function compositionKey(slide, resolved) {
    if (typeof resolved === "string") return resolved;
    const design = slide && typeof slide.design === "object" ? slide.design : {};
    return typeof design.composition === "string" ? design.composition : "";
  }
  function hasLayoutTemplate(slide, composition) {
    return !!(COMPOSITION_SLOTS[compositionKey(slide, composition)] || TYPES[slide && slide.type]);
  }
  function layoutRegionsFor(slide, composition) {
    const cp = COMPOSITION_SLOTS[compositionKey(slide, composition)];
    const template = cp || (TYPES[slide && slide.type] || { slots: FULL });
    return clone(template.slots || template);
  }
  var KIND_SLOTS = {
    heading: ["cp-heading", "cp-title-copy", "ml-title", "ve-title", "title"],
    text: [
      "cp-eyebrow",
      "cp-discussion",
      "cp-prompt",
      "cp-pledge",
      "journey-context",
      "ve-prompt",
      "subtitle",
      "body"
    ],
    bullets: [
      "cp-choices",
      "cp-rules",
      "cp-action",
      "block-0",
      "split-copy",
      "kw-list",
      "ln-list"
    ],
    pairs: [
      "cp-comparison",
      "cp-lanes",
      "cp-action",
      "kw-list",
      "ln-list",
      "stats-grid",
      "tbl",
      "claim-rows",
      "block-0"
    ],
    image: ["cp-art", "cp-map", "img", "split-media", "gallery-stage", "ml-stage"],
    chart: ["chart-wrap", "explore-graph", "ve-plot", "block-0"],
    quote: ["q", "cp-scenario", "body"],
    note: [
      "cp-credits",
      "cp-closing-line",
      "info-takeaway",
      "journey-takeaway",
      "chart-source",
      "ve-source",
      "cp-footer"
    ]
  };
  function insertionRegionFor(slide, index = 0, kind = "", taken = [], composition) {
    const wanted = KIND_SLOTS[kind] || [];
    const busy = Array.isArray(taken) ? taken.filter(Boolean) : [];
    const clear = (r) => !busy.some((b) => r.col < b.col + b.cols && b.col < r.col + r.cols && r.row < b.row + b.rows && b.row < r.row + r.rows);
    if (wanted.length) {
      const slots = layoutRegionsFor(slide, composition);
      for (const key of wanted) {
        if (slots[key] && clear(slots[key])) return { ...slots[key], slot: key };
      }
    }
    const template = TYPES[slide && slide.type];
    const rail = template && template.inserts;
    const found = Array.isArray(rail) ? rail[index] : null;
    return found ? { ...found } : null;
  }
  var LAYOUT_SLOT_TEMPLATES = TYPES;

  // src/design-controls.js
  var DESIGN_CONTROLS = {
    motionLook: { label: "Scene style", pane: "Look", types: ["motion"], when: "Animated explainer selected", description: "Editorial, layered paper, technical drawing, cinematic depth or comic panels." },
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
    copyStyle: { label: "Text style", pane: "Look", types: ["split"], description: "A marker on every line, or flush prose for a paragraph beside the picture." },
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
    function render2(pad, slide, options, root) {
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
      const state2 = current(host, slide);
      return state2 ? JSON.stringify([slide.id, theme, { ...state2, elapsed: 0, remaining: 0 }]) : null;
    }
    function refreshClock(box2, host, slide) {
      const board5 = forSlide(slide);
      const state2 = current(host, slide);
      const clock2 = board5?.clock && box2.querySelector(board5.clock.selector);
      if (!clock2 || !state2) return false;
      clock2.textContent = board5.clock.text(state2, namespace()[board5.runtime]);
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
    function createSession(key, { player, slide, node, create, render: render3, command: command2, tick, interval = 1e3 }) {
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
        render3(node.querySelector(".pad"), slide, {
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
        const state2 = player[board5.states][slide.id];
        if (state2.paused || player.blank) return;
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
      render: render2,
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
  var rows = (items2) => items2.map(([label, value], i) => box(label, value, i));
  var page = (title, items2, minutes) => ({ title, layout: "keywords", fields: rows(items2), minutes });
  var preset = (items2, extra = {}) => ({ layout: "keywords", fields: rows(items2), ...extra });
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
    /* Think-Pair-Share runs as timed stages: the track, a clock per stage, a
       private note on the phone for Think and an anonymous idea for Share. See
       activities/stages.js. The rest of the staged routines can be switched to
       it in the slide's Visual structure. */
    stages: ["think-pair-share"],
    steps: [
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

  // src/activities/stages.js
  var STAGE_JOBS = {
    note: {
      wall: "Silent thinking",
      phone: "Write a private note. Only you can see it.",
      icon: "✎"
    },
    talk: {
      wall: "Turn to your partner",
      phone: "Your note, to compare with your partner’s.",
      icon: "💬"
    },
    send: {
      wall: "Ideas arrive here, without names",
      phone: "Send your pair’s strongest idea. No name goes with it.",
      icon: "↑"
    },
    down: {
      wall: "Phones down",
      phone: "Phones down. Eyes on the board.",
      icon: "👀"
    }
  };
  var JOB_WORDS = [
    ["note", /\b(think|alone|jot|individual|reflect|silent|write)\b/i],
    ["talk", /\b(pair|partner|compare|discuss|square|talk|group|argue)\b/i],
    ["send", /\b(share|report|send|feed ?back|post|contribute)\b/i],
    ["down", /\b(connect|synthes|summar|debrief|teacher|plenary|close|link)\w*/i]
  ];
  function stageJob(label) {
    const text2 = String(label || "");
    for (const [job, re] of JOB_WORDS) if (re.test(text2)) return (
      /** @type {any} */
      job
    );
    return "down";
  }
  function parseStageLabel(term) {
    const text2 = String(term || "").trim();
    const m = /^(.*?)\s*[·•|:\-–—(]\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m)\b\)?\s*$/i.exec(text2);
    if (!m) return { name: text2, seconds: 0 };
    const n = Number(m[2]);
    const secs = /^s/i.test(m[3]) ? n : n * 60;
    return { name: m[1].trim() || text2, seconds: Math.max(0, Math.min(3600, Math.round(secs))) };
  }
  function activityStages(slide, parseLine) {
    return (slide && slide.bullets || []).map(parseLine).filter((p) => p.term || p.def).slice(0, 8).map((p, i) => {
      const label = parseStageLabel(p.term);
      return { i, name: label.name, seconds: label.seconds, text: p.def || "", job: stageJob(label.name) };
    });
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
    /* An empty canvas. Every other type here is a shape the slide is poured
       into; this one is the absence of a shape, so an author can place items
       wherever the layouts taught the inserters to put them rather than filling
       in someone else's fields. It is also where a slide ends up once every
       block has been taken off it — deleting everything has to leave something,
       and a slide still claiming to be Bullets with no bullets on it is a shape
       pretending to be empty. */
    blank: {
      label: "Blank",
      icon: "▢",
      deck: true,
      group: "introduce",
      starters: [{ title: "Blank canvas", blurb: "Nothing on it. Add items and put them where you want them." }]
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
    experiment: {
      label: "Predict and compare",
      icon: "◉",
      deck: true,
      group: "show",
      starters: [{ title: "Predict and compare", blurb: "Predict, reveal and compare editable visual states.", seed: { title: "Same data, different encodings", experiment: { preset: "polling" }, body: "Candidate	Poll A	Poll B	Poll C\n1	17	20	23\n2	18	20	22\n3	20	19	20\n4	22	21	18\n5	23	20	17" } }]
    },
    /* Ten specimens, each its own row in Add slide. They were a Look control
       once, which put a choice of slide shape in the pane that promises not to
       change your content — and these demand an image and bring a state machine
       with them. A shape belongs where the other shapes are chosen. */
    motion: {
      label: "Animated explainer",
      icon: "◈",
      deck: true,
      group: "show",
      starters: [
        { title: "Mask reveal", blurb: "An image uncovered a piece at a time, under your control.", seed: { title: "Mask reveal", motionScene: "mask", design: { motionLook: "editorial" } } },
        { title: "Draw-on diagram", blurb: "Strokes that arrive in the order you explain them.", seed: { title: "Draw-on diagram", motionScene: "draw", design: { motionLook: "editorial" } } },
        { title: "Card to detail", blurb: "A card the room picks, opening into its detail.", seed: { title: "Card to detail", motionScene: "cards", design: { motionLook: "editorial" } } },
        { title: "Animated annotations", blurb: "Callouts that land on a picture one after another.", seed: { title: "Animated annotations", motionScene: "annotate", design: { motionLook: "editorial" } } },
        { title: "Scrubbable transformation", blurb: "A slider the room drags between two shapes of the same data.", seed: { title: "Scrubbable transformation", motionScene: "scrub", design: { motionLook: "editorial" } } },
        { title: "Cause and effect", blurb: "Change one thing, watch what follows from it.", seed: { title: "Cause and effect", motionScene: "cause", design: { motionLook: "editorial" } } },
        { title: "Branching scenario", blurb: "A choice, and the consequence of having made it.", seed: { title: "Branching scenario", motionScene: "branch", design: { motionLook: "editorial" } } },
        { title: "Exploded diagram", blurb: "Parts that separate to show how the whole fits together.", seed: { title: "Exploded diagram", motionScene: "explode", design: { motionLook: "editorial" } } },
        { title: "Focus lens", blurb: "A moving lens that reads one region of a busy image.", seed: { title: "Focus lens", motionScene: "lens", design: { motionLook: "editorial" } } },
        { title: "Responsive story panels", blurb: "Panels that expand as the story is told through them.", seed: { title: "Responsive story panels", motionScene: "panels", design: { motionLook: "editorial" } } }
      ]
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
  var TEACHER_CALL = ["headsup", "spinexplain", "connection", "randomchallenge", "conceptchain"];
  function correctAnswerLabel(slide) {
    if (slide.input === "text" || slide.input === "number" || slide.input === "tap" || slide.input === "fill") return String(slide.answer || "");
    if (slide.input === "order") return (slide.options || []).join(" → ");
    if (TEACHER_CALL.indexOf(slide.style) > -1) return "Your call — mark it as they answer";
    var opt = (slide.options || [])[slide.correct];
    if (!Number.isInteger(slide.correct) || slide.correct < 0 || opt == null) return "";
    return ("ABCDEF"[slide.correct] || "?") + " — " + opt;
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

  // src/games/rooms.js
  var support = (status, reason) => Object.freeze({ status, reason });
  var ROOM_PLAY = Object.freeze({
    quiz: Object.freeze({
      phones: support("yes", "Each learner answers on their phone."),
      teams: support("yes", "Phone answers feed the chosen team."),
      entry: support("yes", "The teacher records a choice for each learner."),
      solo: support("yes", "The wall accepts the learner’s choice.")
    }),
    typed: Object.freeze({
      phones: support("yes", "Each learner types or places an answer on their phone."),
      teams: support("yes", "Answers feed the chosen team."),
      entry: support("yes", "The teacher records each answer by name."),
      solo: support("partial", "The wall’s non-choice controls need a solo rehearsal.")
    }),
    order: Object.freeze({
      phones: support("yes", "Each learner orders the items on their phone."),
      teams: support("yes", "Orders feed the chosen team."),
      entry: support("yes", "The teacher enters each order as a key sequence."),
      solo: support("partial", "The wall’s order control needs a solo rehearsal.")
    }),
    spot: Object.freeze({
      phones: support("yes", "Each learner taps a word in the passage."),
      teams: support("yes", "Finds feed the chosen team."),
      entry: support("yes", "The teacher taps the word the learner points at."),
      solo: support("yes", "The wall accepts a tap on the passage.")
    }),
    spoken: Object.freeze({
      phones: support("partial", "Phones show a listen-and-watch job card."),
      teams: support("yes", "The teacher credits the selected speaker’s team."),
      entry: support("yes", "The teacher selects a recipient and marks the verdict."),
      solo: support("no", "A teacher and a room are needed for the spoken verdict.")
    }),
    board: Object.freeze({
      phones: support("no", "This board is operated by the teacher; phones do not answer."),
      teams: support("yes", "The teacher runs the board for teams."),
      entry: support("yes", "The teacher operates the board without learner phones."),
      solo: support("no", "The board needs a teacher to run it.")
    }),
    paper: Object.freeze({
      phones: support("no", "This is a paper quiz."),
      teams: support("yes", "Teams can discuss and submit paper answers."),
      entry: support("yes", "The teacher reveals and marks paper answers."),
      solo: support("partial", "A solo paper run still needs a checked workflow.")
    }),
    /* A passage with gaps and a word bank (Fill the gaps). */
    fill: Object.freeze({
      phones: support("yes", "Each learner taps a word from the bank into each gap."),
      teams: support("yes", "Each gap that is right earns its share for the team."),
      entry: support("yes", "The teacher picks a word for each gap, in order, by key."),
      solo: support("no", "The word bank is on the phones; the wall shows the passage.")
    }),
    /* A vote with no right answer to be marked against: the room's split is
       the point (Odd One Out). */
    vote: Object.freeze({
      phones: support("yes", "Each learner taps their pick; nobody is marked."),
      teams: support("yes", "Teams can vote together, then defend their pick."),
      entry: support("yes", "The teacher records each learner’s pick by key."),
      solo: support("no", "The format depends on discussion with others.")
    }),
    discussion: Object.freeze({
      phones: support("no", "This discussion currently has no phone answer step."),
      teams: support("yes", "Teams can discuss before the reveal."),
      entry: support("yes", "The teacher runs the discussion and reveal."),
      solo: support("no", "The format depends on discussion with others.")
    })
  });

  // src/games/choice.js
  var coreStyles = {
    choice: {
      key: "choice",
      plays: ROOM_PLAY.quiz,
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
      plays: ROOM_PLAY.quiz,
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
    plays: ROOM_PLAY.quiz,
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
    plays: ROOM_PLAY.quiz,
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
    plays: ROOM_PLAY.quiz,
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
    plays: ROOM_PLAY.typed,
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
    plays: ROOM_PLAY.typed,
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
    plays: ROOM_PLAY.order,
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
    /* No generic Question field in the editor. Declared here rather than
       named in a list inside js/games.js, where nine styles were spelled
       out to answer a question each of them can answer about itself. */
    showsQuestion: false,
    key: "emoji",
    plays: ROOM_PLAY.typed,
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
  function definitionTransition(state2, action) {
    var s = Object.assign({}, state2 || definitionCreate(30));
    if (action === "restart") return definitionCreate(s.seconds);
    if ((action === "ask" || action === "expire") && s.phase === "reading") {
      s.phase = "asking";
    }
    return s;
  }
  var definition = {
    /* The most of these a teacher can add. Declared here rather than
       spelled out twice in js/games.js, where five styles were named in
       two identical twenty-line blocks. */
    maxQuestions: 20,
    /* No generic Question field in the editor. Declared here rather than
       named in a list inside js/games.js, where nine styles were spelled
       out to answer a question each of them can answer about itself. */
    showsQuestion: false,
    defaults: {
      "defaultTime": 30,
      "defaultPoints": 1,
      "confidence": false
    },
    starters: definition_default,
    key: "definition",
    plays: ROOM_PLAY.typed,
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
    /* No Explanation field in the editor. js/games.js worked this out from
       whether the style had a board engine, with bowl named as the board
       that does take one and two more named as the non-boards that do
       not. Declared, the board question stops being a proxy for it. */
    showsExplanation: false,
    /* The most of these a teacher can add. Declared here rather than
       spelled out twice in js/games.js, where five styles were named in
       two identical twenty-line blocks. */
    maxQuestions: 10,
    /* No generic Question field in the editor. Declared here rather than
       named in a list inside js/games.js, where nine styles were spelled
       out to answer a question each of them can answer about itself. */
    showsQuestion: false,
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    starters: compare_default,
    key: "compare",
    plays: ROOM_PLAY.discussion,
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
    /* The most of these a teacher can add. Declared here rather than
       spelled out twice in js/games.js, where five styles were named in
       two identical twenty-line blocks. */
    maxQuestions: 10,
    /* No generic Question field in the editor. Declared here rather than
       named in a list inside js/games.js, where nine styles were spelled
       out to answer a question each of them can answer about itself. */
    showsQuestion: false,
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    starters: oddone_default,
    key: "oddone",
    plays: ROOM_PLAY.vote,
    label: "Odd one out",
    icon: "◇",
    blurb: "Four equal items. Phones vote for the odd one; the reveal shows the room’s split, the prepared rule, and invites other picks to defend theirs. No score.",
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
      s.hideAnswerUntilReveal = true;
      s.oddoneDiscuss = true;
      s.holdResults = true;
      s.unmarked = true;
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
  function wordRevealShownAt(slide, elapsedMs) {
    var total = wordRevealLetterCount(slide.word || slide.answer || "");
    var fraction = slide.preReveal != null ? Number(slide.preReveal) : wordRevealPreFraction(slide.difficulty);
    var initial = Math.round(total * Math.max(0, Math.min(1, fraction || 0)));
    var interval = Math.max(3, Number(slide.dripInterval) || 5) * 1e3;
    return Math.min(total, initial + Math.floor(Math.max(0, Number(elapsedMs) || 0) / interval));
  }
  function wordRevealGains(slide, answers, currentShown) {
    var total = wordRevealLetterCount(slide.word || slide.answer || "");
    return (answers || []).map(function(answer) {
      var shown = answer.elapsedMs == null ? Math.max(0, Number(currentShown) || 0) : wordRevealShownAt(slide, answer.elapsedMs);
      var points = wordRevealPoints(total ? shown / total : 1);
      return [answer.id, wordreveal.mark(slide, answer.response) ? points : 0];
    });
  }
  var wordreveal = {
    defaults: {
      "defaultTime": 0,
      "defaultPoints": 0,
      "confidence": false
    },
    key: "wordreveal",
    plays: ROOM_PLAY.typed,
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
        text: (state2) => state2.phase === "study" ? Math.ceil(state2.remaining) + "s" : Math.floor(state2.elapsed / 60) + ":" + String(Math.floor(state2.elapsed % 60)).padStart(2, "0")
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
    /* No Explanation field in the editor. js/games.js worked this out from
       whether the style had a board engine, with bowl named as the board
       that does take one and two more named as the non-boards that do
       not. Declared, the board question stops being a proxy for it. */
    showsExplanation: false,
    /* Studied as two-sided pairs before they are claimed, which is what
       knowledgeflip is not — its keywords stand alone. js/games.js asked
       this twice by naming both styles: once to build the pair bank for
       the board, once to word the time hint. */
    studyPairs: true,
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
    plays: ROOM_PLAY.board,
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
    /* No Explanation field in the editor. js/games.js worked this out from
       whether the style had a board engine, with bowl named as the board
       that does take one and two more named as the non-boards that do
       not. Declared, the board question stops being a proxy for it. */
    showsExplanation: false,
    /* Studied as two-sided pairs before they are claimed, which is what
       knowledgeflip is not — its keywords stand alone. js/games.js asked
       this twice by naming both styles: once to build the pair bank for
       the board, once to word the time hint. */
    studyPairs: true,
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
    plays: ROOM_PLAY.board,
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
    /* No Explanation field in the editor. js/games.js worked this out from
       whether the style had a board engine, with bowl named as the board
       that does take one and two more named as the non-boards that do
       not. Declared, the board question stops being a proxy for it. */
    showsExplanation: false,
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
    plays: ROOM_PLAY.board,
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
    /* What its per-question countdown is called. These four styles time
       something other than a question, and js/games.js listed all four
       to find them and then named three of them again to label them. */
    timeLabel: "Round length",
    /* No generic Question field in the editor. Declared here rather than
       named in a list inside js/games.js, where nine styles were spelled
       out to answer a question each of them can answer about itself. */
    showsQuestion: false,
    defaults: {
      "defaultTime": 60,
      "defaultPoints": 1,
      "confidence": false
    },
    key: "headsup",
    plays: ROOM_PLAY.spoken,
    label: "Heads up",
    icon: "↑",
    blurb: "One guesser, one round clock. The class describes the term; Correct or Pass moves straight to the next. How many can they get?",
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
    /* What its per-question countdown is called. These four styles time
       something other than a question, and js/games.js listed all four
       to find them and then named three of them again to label them. */
    timeLabel: "Time per explanation",
    /* No generic Question field in the editor. Declared here rather than
       named in a list inside js/games.js, where nine styles were spelled
       out to answer a question each of them can answer about itself. */
    showsQuestion: false,
    defaults: {
      "defaultPoints": 2,
      "confidence": false
    },
    key: "spinexplain",
    plays: ROOM_PLAY.spoken,
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
    /* What its per-question countdown is called. These four styles time
       something other than a question, and js/games.js listed all four
       to find them and then named three of them again to label them. */
    timeLabel: "Time per challenge",
    /* No generic Question field in the editor. Declared here rather than
       named in a list inside js/games.js, where nine styles were spelled
       out to answer a question each of them can answer about itself. */
    showsQuestion: false,
    defaults: {
      "defaultTime": 0,
      "defaultPoints": 1,
      "confidence": false
    },
    key: "connection",
    plays: ROOM_PLAY.spoken,
    label: "Connection maker",
    icon: "⚭",
    blurb: "Pick two ideas and explain the bridge. Accept credits the speaker’s team.",
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
    /* No Explanation field in the editor. js/games.js worked this out from
       whether the style had a board engine, with bowl named as the board
       that does take one and two more named as the non-boards that do
       not. Declared, the board question stops being a proxy for it. */
    showsExplanation: false,
    /* The most of these a teacher can add. Declared here rather than
       spelled out twice in js/games.js, where five styles were named in
       two identical twenty-line blocks. */
    maxQuestions: 10,
    /* No generic Question field in the editor. Declared here rather than
       named in a list inside js/games.js, where nine styles were spelled
       out to answer a question each of them can answer about itself. */
    showsQuestion: false,
    defaults: {
      "defaultTime": 45,
      "defaultPoints": 1,
      "confidence": false
    },
    starters: conceptchain_default,
    key: "conceptchain",
    plays: ROOM_PLAY.spoken,
    label: "Concept chain",
    icon: "⛓",
    blurb: "Start from a term; add a justified link. Host Accepts to grow the chain and credit the speaker’s team.",
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
    /* What its per-question countdown is called. These four styles time
       something other than a question, and js/games.js listed all four
       to find them and then named three of them again to label them. */
    timeLabel: "Time per challenge",
    /* No generic Question field in the editor. Declared here rather than
       named in a list inside js/games.js, where nine styles were spelled
       out to answer a question each of them can answer about itself. */
    showsQuestion: false,
    defaults: {
      "scoreboard": false,
      "defaultTime": 0,
      "defaultPoints": 0,
      "scoreSlide": false,
      "confidence": false
    },
    key: "randomchallenge",
    plays: ROOM_PLAY.spoken,
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
    /* No Explanation field in the editor. js/games.js worked this out from
       whether the style had a board engine, with bowl named as the board
       that does take one and two more named as the non-boards that do
       not. Declared, the board question stops being a proxy for it. */
    showsExplanation: false,
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
    plays: ROOM_PLAY.board,
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
        text: (state2, engine) => engine.formatClock(state2.phase === "quiz" ? state2.remaining : state2.elapsed || 0)
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
    /* No Explanation field in the editor. js/games.js decided this by asking
       whether the style had a board engine, with bowl named as the board
       that does take one and two more named as the non-boards that do
       not. Declared, the board question stops being a proxy for it. */
    showsExplanation: false,
    /* The most of these a teacher can add. Declared here rather than
       spelled out twice in js/games.js, where five styles were named in
       two identical twenty-line blocks. */
    maxQuestions: 10,
    /* One countdown for the whole quiz rather than one per question, which
       is why the rail shows "180s quiz" instead of a per-question timer.
       js/games.js named the style to decide that. */
    timesWholeGame: true,
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
    plays: ROOM_PLAY.paper,
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
    function target(game) {
      return Number(game.settings && game.settings.bowlTarget) || 1e3;
    }
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
        target: target(game),
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
      intro.subtitle = bg.categories.length + (bg.categories.length === 1 ? " category · " : " categories · ") + game.questions.length + " cells · first to " + target(game);
      intro.notes = "Pick an unused cell, hear the answer, then reveal and award it. The board ends when it empties or a team reaches the target.";
    }
    function bowlNote(game, SF) {
      var grid = SF.bowlGrid(game.questions);
      var total = game.questions.reduce(function(n, q) {
        return n + (q.pointValue || 0);
      }, 0);
      var targetScore = target(game);
      var shape = grid.categories.length + (grid.categories.length === 1 ? " category · " : " categories · ") + game.questions.length + (game.questions.length === 1 ? " cell · " : " cells · ") + total + " points on the board";
      if (total < targetScore) {
        return shape + " — less than the " + targetScore + " target, so the board will empty first";
      }
      return shape + " · the board ends when someone reaches " + targetScore;
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
        boardSettingLink("Target score", String(target(game)))
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
            String(target(game)),
            function(v) {
              st.bowlTarget = Number(v);
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
      question: "What is the jelly inside a cell called?",
      answer: "Cytoplasm"
    },
    {
      category: "Cells",
      pointValue: 200,
      question: "What molecule carries genetic information?",
      answer: "DNA"
    },
    {
      category: "Cells",
      pointValue: 300,
      question: "Which organelle releases energy in respiration?",
      answer: "The mitochondrion"
    },
    {
      category: "Transport",
      pointValue: 100,
      question: "Which way do particles move in diffusion?",
      answer: "From high to low concentration"
    },
    {
      category: "Transport",
      pointValue: 200,
      question: "What is the movement of water across a partially permeable membrane?",
      answer: "Osmosis"
    },
    {
      category: "Transport",
      pointValue: 300,
      question: "Which kind of transport needs energy from respiration?",
      answer: "Active transport"
    },
    {
      category: "Enzymes",
      pointValue: 100,
      question: "What kind of molecule is an enzyme?",
      answer: "A protein"
    },
    {
      category: "Enzymes",
      pointValue: 200,
      question: "What happens to an enzyme above its optimum temperature?",
      answer: "It denatures"
    },
    {
      category: "Enzymes",
      pointValue: 300,
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
      "confidence": false,
      "bowlTarget": 1e3
    },
    key: "bowl",
    plays: ROOM_PLAY.board,
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
        answer: "DNA"
      };
    },
    normalize: function(q) {
      q.category = String(q.category == null ? "" : q.category).slice(0, 40);
      q.answer = String(q.answer == null ? "" : q.answer).slice(0, 120);
      var v = Number(q.pointValue);
      q.pointValue = BOWL_VALUES.indexOf(v) > -1 ? v : 200;
      delete q.targetScore;
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

  // src/games/spot.js
  function spotWords(passage) {
    return String(passage || "").split(/\s+/).map(function(w) {
      return w.trim();
    }).filter(Boolean);
  }
  function bare(word) {
    return String(word || "").toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  }
  function spotSpan(passage, error) {
    var words = spotWords(passage).map(bare);
    var want = spotWords(error).map(bare).filter(Boolean);
    if (!want.length) return null;
    for (var i = 0; i + want.length <= words.length; i++) {
      var hit = true;
      for (var k = 0; k < want.length; k++) {
        if (words[i + k] !== want[k]) {
          hit = false;
          break;
        }
      }
      if (hit) return { from: i, to: i + want.length - 1 };
    }
    return null;
  }
  var SPOT_MAX_WORDS = 80;
  var spot = {
    defaults: {
      "defaultPoints": 1e3
    },
    key: "spot",
    plays: ROOM_PLAY.spot,
    label: "Spot the error",
    icon: "⌖",
    blurb: "A sentence with one mistake in it. The room taps the wrong word; the reveal shows where everyone looked.",
    mechanic: "points",
    input: "tap",
    /* The passage is written in the spot editor's own Sentence field. */
    showsQuestion: false,
    /* Its options are the passage's words, which the author never edits as a
       list — these bound the engine's generic option controls, not the words. */
    minOptions: 0,
    maxOptions: 0,
    make: function() {
      return {
        question: "Photosynthesis happens in the mitochondria, uses carbon dioxide and water, and releases oxygen.",
        error: "mitochondria",
        fix: "chloroplasts",
        explanation: "Mitochondria carry out respiration. Photosynthesis happens in the chloroplasts."
      };
    },
    normalize: function(q) {
      q.error = String(q.error || "").slice(0, 120);
      q.fix = String(q.fix || "").slice(0, 120);
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      var words = spotWords(q.question);
      if (!words.length) return "Q" + n + " has no sentence to search";
      if (words.length > SPOT_MAX_WORDS) return "Q" + n + " is " + words.length + " words — keep it under " + SPOT_MAX_WORDS + " so it fits a phone";
      if (!String(q.error || "").trim()) return "Q" + n + " has no wrong words marked";
      if (!spotSpan(q.question, q.error)) return "Q" + n + ': "' + String(q.error).trim() + '" is not in the sentence, word for word';
      return null;
    },
    compile: function(q, settings, s) {
      var words = spotWords(q.question).slice(0, SPOT_MAX_WORDS);
      var span = spotSpan(q.question, q.error) || { from: 0, to: 0 };
      s.question = q.question;
      s.options = words;
      s.correct = span.from;
      s.errorFrom = span.from;
      s.errorTo = span.to;
      s.fix = q.fix || "";
      var wrong = words.slice(span.from, span.to + 1).join(" ").replace(/[,.;:!?)"'\u201d\u2019]+$/u, "");
      s.answer = wrong + (q.fix ? " → " + q.fix : "");
      s.holdResults = true;
      s.headPrompt = "There is one error in this sentence. Find it.";
    },
    /* A tap anywhere inside the error's words is a find. */
    mark: function(s, response) {
      var i = Number(response);
      if (!Number.isInteger(i)) return false;
      var from = typeof s.errorFrom === "number" ? s.errorFrom : Number(s.correct) || 0;
      var to = typeof s.errorTo === "number" ? s.errorTo : from;
      return i >= from && i <= to;
    },
    summary: function(q) {
      var e = String(q.error || "").trim();
      return e ? 'find "' + e + '"' : "no error marked";
    },
    describe: function(s, response) {
      return (s.options || [])[Number(response)] || "";
    }
  };

  // src/games/fill.js
  var FILL_MAX_GAPS = 4;
  var FILL_MAX_BANK = 12;
  function fillParts(passage) {
    var text2 = String(passage || "");
    var parts = [];
    var gaps = [];
    var re = /\[([^\]\n]{1,60})\]/g;
    var at = 0;
    var m;
    while (m = re.exec(text2)) {
      parts.push(text2.slice(at, m.index));
      gaps.push(m[1].trim());
      at = m.index + m[0].length;
    }
    parts.push(text2.slice(at));
    return { parts, gaps };
  }
  function lureList(raw) {
    var list = Array.isArray(raw) ? raw : String(raw || "").split(/[,\n]/);
    return list.map(function(w) {
      return String(w).trim();
    }).filter(Boolean);
  }
  function fillScore(s, response) {
    var want = s.gapAnswers || [];
    if (!Array.isArray(response) || response.length !== want.length || !want.length) return 0;
    var right = 0;
    for (var i = 0; i < want.length; i++) if (response[i] === want[i]) right++;
    return right / want.length;
  }
  var fill = {
    defaults: {
      "defaultPoints": 1e3,
      "defaultTime": 0,
      "confidence": false
    },
    key: "fill",
    plays: ROOM_PLAY.fill,
    label: "Fill the gaps",
    icon: "▭",
    blurb: "A passage with gaps and a word bank with lures. Phones tap a word into each gap; the reveal shows, gap by gap, what the room chose.",
    mechanic: "points",
    input: "fill",
    /* The passage is written in the fill editor's own field. */
    showsQuestion: false,
    /* Its options are the word bank, built from the gaps and the lures. */
    minOptions: 0,
    maxOptions: 0,
    make: function() {
      return {
        question: "Water moves into a cell by [osmosis], from where there is more [water] to where there is less, across a partially permeable [membrane].",
        lures: "diffusion, glucose, cell wall",
        explanation: "Osmosis is the diffusion of water, across a partially permeable membrane."
      };
    },
    normalize: function(q) {
      var text2 = String(q.question || "");
      var converted = false;
      if (text2.indexOf("[") < 0 && /_{3,}/.test(text2)) {
        var accepted = Array.isArray(q.accept) && q.accept[0] ? q.accept[0] : q.answer;
        if (String(accepted || "").trim()) {
          text2 = text2.replace(/_{3,}/, "[" + String(accepted).trim() + "]");
          converted = true;
        }
      }
      q.question = text2.slice(0, 600);
      var lures = lureList(q.lures).slice(0, FILL_MAX_BANK).join(", ");
      if (converted && lures === lureList(fill.make().lures).join(", ")) lures = "";
      q.lures = lures;
      delete q.options;
      delete q.correct;
      return q;
    },
    problems: function(q, n) {
      var split = fillParts(q.question);
      if (!split.gaps.length) return "Q" + n + " has no gaps — put each missing word in [square brackets]";
      if (split.gaps.length > FILL_MAX_GAPS) return "Q" + n + " has " + split.gaps.length + " gaps — keep it to " + FILL_MAX_GAPS;
      if (split.gaps.some(function(g) {
        return !g;
      })) return "Q" + n + " has an empty [ ]";
      var bank2 = {};
      split.gaps.concat(lureList(q.lures)).forEach(function(w) {
        bank2[w.toLowerCase()] = 1;
      });
      if (Object.keys(bank2).length > FILL_MAX_BANK) return "Q" + n + " has more than " + FILL_MAX_BANK + " words in its bank";
      if (Object.keys(bank2).length < 2) return "Q" + n + " needs a lure, or there is nothing to choose between";
      return null;
    },
    compile: function(q, settings, s) {
      var split = fillParts(q.question);
      var seen = {};
      var bank2 = [];
      split.gaps.concat(lureList(q.lures)).forEach(function(w) {
        var k = w.toLowerCase();
        if (!seen[k] && bank2.length < FILL_MAX_BANK) {
          seen[k] = 1;
          bank2.push(w);
        }
      });
      for (var i = bank2.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = bank2[i];
        bank2[i] = bank2[j];
        bank2[j] = t;
      }
      var lower = bank2.map(function(w) {
        return w.toLowerCase();
      });
      s.question = split.parts.join("_____");
      s.fillParts = split.parts;
      s.options = bank2;
      s.gapAnswers = split.gaps.map(function(g) {
        return lower.indexOf(g.toLowerCase());
      });
      s.answer = split.gaps.join(" · ");
      s.correct = -1;
      s.holdResults = true;
      s.headPrompt = split.gaps.length === 1 ? "Fill the gap" : "Fill the " + split.gaps.length + " gaps";
    },
    /* Right when every gap is; partial credit is in the points (fillScore). */
    mark: function(s, response) {
      return fillScore(s, response) === 1;
    },
    summary: function(q) {
      var n = fillParts(q.question).gaps.length;
      return n === 1 ? "1 gap" : n + " gaps";
    },
    describe: function(s, response) {
      return Array.isArray(response) ? response.map(function(i) {
        return (s.options || [])[i] || "?";
      }).join(" · ") : "";
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
  var GAME_STYLES = { choice: choice2, truefalse, race, speed, boss, slider, type, order, emoji, definition, compare, oddone, wordreveal, memoryflip, memorymatch, knowledgeflip, headsup, spinexplain, connection, conceptchain, randomchallenge, bingo, lowstakes, bowl, spot, fill };

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
        /* Spoken answers count by default in individual play. Teachers may
           opt into points for the selected speaker. */
        scoreSpoken: false,
        resultsOnReveal: false,
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
      answersHint: "One sentence, one mistake. The room taps the wrong word on their phones; nothing on the wall points at it."
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
      answersHint: "Write the passage with each missing word in [square brackets], up to four, and add a few lures. Phones tap a word into each gap."
    },
    "time-traveler": {
      label: "Time traveler",
      answersHint: "Name the event; the year is the answer. Phones place it on a timeline, and each round adds it to the line."
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
      answersHint: "Describe the term without saying it. Mark Correct or Pass; the round counts how many the guesser gets."
    },
    "spin-explain": {
      label: "Spin & explain",
      answersHint: "Clear explanation scores one question’s worth for the speaker’s team; with a hint, half; reject, nothing. Individual play counts unless you switch scoring on."
    },
    "connection-maker": {
      label: "Connection maker",
      answersHint: "Two ideas and a spoken bridge. Accept credits the speaker’s team; individual play counts."
    },
    "concept-chain": {
      label: "Concept chain",
      answersHint: "Grow a justified chain from each start term. Type the spoken link, then Accept — the chain grows on the wall and the speaker’s team is credited."
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
    /* Its own engine since 23 Sep 2026: a word bank tapped into gaps. */
    "fill-in-the-blanks": "fill",
    "heads-up": "headsup",
    "spin-explain": "spinexplain",
    /* Its own engine since 23 Sep 2026: tap the wrong word, not pick a phrase. */
    "spot-the-error": "spot",
    "ranking": "order",
    "odd-one-out": "oddone",
    "predict-outcome": "choice",
    /* A slider on a year scale since 23 Sep 2026: place the event in time. */
    "time-traveler": "slider",
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
    "compare",
    "spot",
    "fill"
  ];
  function formatStyle(formatKey) {
    var s = FORMAT_STYLE[formatKey];
    return s && GAME_STYLES[s] ? s : null;
  }
  function isSpecialStyle(styleKey) {
    return SPECIAL_STYLES.indexOf(styleKey) > -1;
  }
  var INPUTS = ["choice", "text", "number", "order", "tap", "fill"];

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
    function write(state2) {
      try {
        storage().setItem(FOLDER_KEY, JSON.stringify(state2));
        return true;
      } catch (error) {
        warn("Could not save library folders:", error);
        return false;
      }
    }
    function catalog() {
      const state2 = read();
      const seen = /* @__PURE__ */ Object.create(null);
      const out = LIBRARY_GROUPS.map(function(g) {
        seen[g.id] = true;
        return { id: g.id, label: String(state2.labels[g.id] || g.label), builtin: true };
      });
      state2.folders.forEach(function(f) {
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
        const state2 = read();
        if (on) state2.collapsed[id] = true;
        else delete state2.collapsed[id];
        write(state2);
      },
      rename: function(id, label) {
        const name = String(label || "").trim();
        if (!id || !name) return false;
        const state2 = read();
        if (LIBRARY_GROUPS.some(function(g) {
          return g.id === id;
        })) {
          state2.labels[id] = name;
        } else {
          const row = state2.folders.filter(function(f) {
            return f.id === id;
          })[0];
          if (row) row.label = name;
          else state2.folders.push({ id, label: name });
        }
        return write(state2);
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
        const state2 = read();
        state2.folders.push({ id, label: name });
        write(state2);
        return id;
      },
      remove: function(id) {
        if (!id || LIBRARY_GROUPS.some(function(g) {
          return g.id === id;
        })) return false;
        const state2 = read();
        state2.folders = state2.folders.filter(function(f) {
          return f.id !== id;
        });
        delete state2.labels[id];
        delete state2.collapsed[id];
        return write(state2);
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
      function write(items2) {
        try {
          storage().setItem(key, JSON.stringify(items2));
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
      style: "spot",
      title: "Spot the error",
      settings: { scoreboard: true, scoreSlide: false, defaultTime: 30 },
      seeds: [
        { question: "Photosynthesis happens in the mitochondria, uses carbon dioxide and water, and releases oxygen.", error: "mitochondria", fix: "chloroplasts", explanation: "Mitochondria carry out respiration. Photosynthesis happens in the chloroplasts." },
        { question: "Sound travels fastest through a vacuum, because there are no particles in the way.", error: "fastest", fix: "not at all", explanation: "Sound is a vibration passed between particles. With no particles, there is nothing to carry it." },
        { question: "The median of 2, 3, 3, 8 and 14 is 6, because it is the middle value once they are in order.", error: "6", fix: "3", explanation: "In order the middle value is 3. Six is the mean, which a single large value pulls upward." },
        { question: "In 1066 William the Conqueror won the Battle of Hastings and was crowned King of Scotland.", error: "Scotland", fix: "England", explanation: "He was crowned King of England on Christmas Day 1066; Scotland kept its own crown." }
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
      style: "fill",
      title: "Fill the gaps",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 0 },
      seeds: [
        { question: "Water moves into a cell by [osmosis], from where there is more water to where there is less, across a partially permeable [membrane].", lures: "diffusion, active transport, cell wall", explanation: "Osmosis is the diffusion of water across a partially permeable membrane." },
        { question: "Proteins are made on [ribosomes], using instructions copied from [DNA] in the nucleus.", lures: "mitochondria, glucose, chloroplasts", explanation: "mRNA carries the code from DNA to the ribosomes, which assemble amino acids." },
        { question: "Plants make glucose by [photosynthesis], which needs light, water and [carbon dioxide].", lures: "respiration, oxygen, nitrogen", explanation: "Oxygen is produced by photosynthesis, not used by it." }
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
      style: "slider",
      title: "Time traveler",
      settings: { scoreboard: true, scoreSlide: true, defaultTime: 30 },
      seeds: [
        { question: "Place it in time: the Great Fire of London", min: 1500, max: 1900, step: 1, target: 1666, tolerance: 15, unit: "", explanation: "September 1666. It burned for four days and destroyed most of the medieval city." },
        { question: "Place it in time: Fleming notices mould killing bacteria (penicillin)", min: 1800, max: 2e3, step: 1, target: 1928, tolerance: 8, unit: "", explanation: "1928. Mass production only came in the 1940s." },
        { question: "Place it in time: the first Moon landing", min: 1900, max: 2020, step: 1, target: 1969, tolerance: 4, unit: "", explanation: "July 1969, Apollo 11." }
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
      settings: { scoreboard: false, scoreSlide: false, defaultTime: 0, confidence: false, mode: "teams", bowlTarget: 1e3 },
      seeds: [
        { category: "Cells", pointValue: 100, question: "What is the jelly inside a cell called?", answer: "Cytoplasm" },
        { category: "Cells", pointValue: 200, question: "What molecule carries genetic information?", answer: "DNA" },
        { category: "Cells", pointValue: 300, question: "Which organelle releases energy in respiration?", answer: "The mitochondrion" },
        { category: "Transport", pointValue: 100, question: "Which way do particles move in diffusion?", answer: "From high to low concentration" },
        { category: "Transport", pointValue: 200, question: "What is the movement of water across a partially permeable membrane?", answer: "Osmosis" },
        { category: "Transport", pointValue: 300, question: "Which kind of transport needs energy from respiration?", answer: "Active transport" },
        { category: "Enzymes", pointValue: 100, question: "What kind of molecule is an enzyme?", answer: "A protein" },
        { category: "Enzymes", pointValue: 200, question: "What happens to an enzyme above its optimum temperature?", answer: "It denatures" },
        { category: "Enzymes", pointValue: 300, question: "What is the molecule an enzyme acts on called?", answer: "The substrate" }
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
    g.scoreSpoken = g.scoreSpoken === true;
    g.resultsOnReveal = g.resultsOnReveal === true;
    if (g.bowlTarget != null) {
      var target = Number(g.bowlTarget);
      g.bowlTarget = BOWL_TARGETS.indexOf(target) > -1 ? target : 1e3;
    }
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
    var settings = Object.assign({}, raw.settings || {});
    if (style === "bowl" && settings.bowlTarget == null) {
      var oldFirst = Array.isArray(raw.questions) && raw.questions[0];
      settings.bowlTarget = oldFirst && oldFirst.targetScore;
    }
    g.settings = normalizeGameSettings(settings);
    if (format === "time-traveler" && style === "slider" && rawStyle === "type" && Array.isArray(raw.questions)) {
      raw = Object.assign({}, raw, { questions: raw.questions.map(healTimeTraveler) });
    }
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
        "definition",
        /* A slider's line and a fill's lures, for the formats that heal into
           them (Time Traveler, Fill the gaps). */
        "min",
        "max",
        "step",
        "target",
        "tolerance",
        "unit",
        "lures"
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
    if (settings.resultsOnReveal === true) s.holdResults = true;
    if (style.mechanic === "boss" || q.difficulty) {
      s.difficulty = BOSS_LEVELS.indexOf(q.difficulty) > -1 ? q.difficulty : "medium";
      s.bossDamage = bossDamage(s.difficulty);
    }
    QUESTION_SLIDE_FIELDS.forEach(function(k) {
      if (q[k] != null && q[k] !== "") s[k] = q[k];
    });
    s.explainStyle = settings.explainStyle;
    s.confidence = settings.confidence !== false;
    s.scoreSpoken = settings.scoreSpoken === true;
    if (styleKey === "oddone") {
      s.points = 0;
      s.timeLimit = 0;
      s.voteOnly = false;
      s.confidence = false;
      s.hideAnswerUntilReveal = true;
      s.oddoneDiscuss = true;
      s.holdResults = true;
      s.unmarked = true;
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
  function healTimeTraveler(q) {
    if (!q || typeof q !== "object" || q.target != null) return q;
    var clue = String(q.question || "");
    var year = /\b(\d{3,4})\b/.exec(clue);
    var event = String(Array.isArray(q.accept) && q.accept[0] || q.answer || "").trim();
    if (!year || !event) return q;
    var y = Number(year[1]);
    var min = Math.floor(y / 100) * 100 - 100;
    return {
      question: "Place it in time: " + event,
      min,
      max: min + 300,
      step: 1,
      target: y,
      tolerance: 10,
      unit: "",
      explanation: [clue, q.explanation].filter(function(x) {
        return String(x || "").trim();
      }).join(" ")
    };
  }
  var DRAW_STYLES = ["spinexplain", "randomchallenge", "headsup"];
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
    var drawn = DRAW_STYLES.indexOf(game.style) >= 0;
    var travelSpan = { min: Infinity, max: -Infinity };
    if (game.format === "time-traveler") {
      playQuestions.forEach(function(q) {
        if (Number.isFinite(Number(q.min))) travelSpan.min = Math.min(travelSpan.min, Number(q.min));
        if (Number.isFinite(Number(q.max))) travelSpan.max = Math.max(travelSpan.max, Number(q.max));
      });
      if (!(travelSpan.max > travelSpan.min)) travelSpan = { min: 0, max: 100 };
    }
    if (drawn) {
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
      if (drawn) {
        s.drawNo = i + 1;
        s.drawTotal = playQuestions.length;
      }
      if (game.format === "predict-outcome" && s.input === "choice") {
        s.predict = true;
        s.holdResults = true;
        s.confidence = true;
      }
      if (game.style === "truefalse" && game.format === "true-false") {
        s.showdown = true;
        s.holdResults = true;
      }
      if (game.style === "spinexplain") {
        s.spinDraw = i + 1;
        s.spinTotal = playQuestions.length;
        s.headPrompt = "Spin & explain";
      }
      if (game.format === "time-traveler" && s.input === "number") {
        s.min = travelSpan.min;
        s.max = travelSpan.max;
        s.timeline = playQuestions.slice(0, i).map(function(prev) {
          return {
            label: String(prev.question || "").replace(/^Place it in time:\s*/i, "").slice(0, 60),
            year: Number(prev.target)
          };
        }).filter(function(e) {
          return Number.isFinite(e.year) && e.year >= Number(s.min) && e.year <= Number(s.max);
        });
      }
      if (game.style === "headsup") {
        s.roundSeconds = Number(st.defaultTime) > 0 ? Math.min(600, Number(st.defaultTime)) : 60;
        s.timeLimit = 0;
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
  var gameStepCache = /* @__PURE__ */ new Map();
  function showNumber(deck, slide, lookupGame) {
    var place = 0, total = 0, games = 0;
    (deck.slides || []).forEach(function(s) {
      if (s.hidden === true) return;
      var steps = 1;
      if (s.type === "game") {
        var game = lookupGame ? lookupGame(s.gameId) : null;
        if (game) {
          var key = game.id + ":" + (game.modified || 0) + ":" + (deck.theme || "");
          if (!gameStepCache.has(key)) {
            if (gameStepCache.size > 200) gameStepCache.clear();
            gameStepCache.set(key, compileGame(game, { theme: deck.theme }).length);
          }
          steps = gameStepCache.get(key);
          games++;
        }
      }
      if (s === slide) place = total + 1;
      total += steps;
    });
    if (deck.finalScores && games) total += 1;
    return place ? { place, total } : null;
  }
  function runIndexOf(deck, run, i) {
    function at(k2) {
      var s = deck.slides[k2];
      if (!s || s.hidden === true) return -1;
      for (var r = 0; r < run.slides.length; r++) {
        var rs = run.slides[r];
        if (rs.id === s.id || rs.sourceSlideId === s.id) return r;
      }
      return -1;
    }
    for (var k = i; k < deck.slides.length; k++) {
      var f = at(k);
      if (f >= 0) return f;
    }
    for (var b = i - 1; b >= 0; b--) {
      var p = at(b);
      if (p >= 0) return p;
    }
    return 0;
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
      var gameId = game.id;
      var again = run.games.some(function(g) {
        return g.id === gameId;
      });
      run.games.push(game);
      compileGame(game, { theme: deck.theme }).forEach(function(cs) {
        if (again) cs.id = cs.id + "@" + s.id;
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
    var items2 = [];
    var slides = deck && deck.slides || [];
    var seenExternal = {};
    function add(level, index, title, detail) {
      items2.push({ level, slide: index, title, detail });
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
    var stop = items2.filter(function(f) {
      return f.level === "stop";
    }).length;
    return { stop, check: items2.length - stop, items: items2 };
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
    MotionLab: motion_lab_exports,
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
    createActivityFields,
    createCompositionRenderer,
    createChartRenderer,
    createWordRenderer,
    createLiveRenderer,
    createQuizRenderer,
    installArtRenderer,
    installLatticeRenderer,
    createPresenterWindow,
    createDeckSettings,
    createContentFields,
    installArrange,
    createPanes,
    createRail,
    installHeaderFooterUI,
    installArtwork,
    installCustom,
    installExplore,
    installExperiments,
    bindCanvasRegions,
    declareBodyRegion,
    measureBodyRegion,
    hasLayoutTemplate,
    layoutRegionsFor,
    insertionRegionFor,
    LAYOUT_SLOT_TEMPLATES,
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
    /* An activity slide's rows as stages: name, seconds, prompt, phone job. */
    activityStages: function(slide) {
      return activityStages(slide, parseKeywordLine);
    },
    STAGE_JOBS,
    stageJob,
    parseStageLabel,
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
    wordRevealShownAt,
    wordRevealGains,
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
    runIndexOf,
    spotWords,
    spotSpan,
    SPOT_MAX_WORDS,
    fillParts,
    fillScore,
    FILL_MAX_GAPS,
    showNumber,
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
  for (const install of [installBingo, installBowl, installMemory, installLowStakes, installBoss, installRace]) {
    install(runtime.SF);
  }
})();
