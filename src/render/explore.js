/* Four teaching interactions, with authored configuration separate from run state. */

/* Moved out of js/explore.js into the render engine, where it belongs: this is
 * the renderer for five slide types — before/after, visual experiment, motion,
 * explore an image, and what-if graph. js/render.js has always called it, at
 * the same point it calls the boards runtime, so it was a layout provider
 * living outside the layer that calls it.
 *
 * They are ordinary slide types: declared in src/deck/content.js with
 * `deck: true`, offered in the picker, and carrying their own design controls.
 * They render through this hook rather than the LAYOUTS table because they own
 * their run state, not because they are unfinished. The surface probe lists
 * them as "no layout registered" for that reason and it is not a defect.
 *
 * Installed by src/model.js: every page that renders a slide already loads the
 * bundle, and nothing here runs at install but declarations.
 */
export function installExplore(SF) {
  var kinds = ['beforeafter', 'explore', 'simulation', 'experiment'];
  function active(slide) { return (SF.MotionLab && SF.MotionLab.active(slide)) || kinds.includes(slide.type) || (slide.type === 'chart' && slide.exploration && slide.exploration.prediction); }
  function config(slide) { return SF.normalizeExploration(slide.exploration); }
  function initial(slide) { return { position: 50, spot: -1, input: config(slide).initial, revealed: false, experimentStep: -1 }; }
  function state(player, slide) { return Object.assign(initial(slide), (player.exploreStates || {})[slide.id] || {}); }
  function command(player, action, value) {
    var slide = player.deck && player.deck.slides[player.idx];
    if (!slide || !active(slide) || player.frozen) return;
    var c = config(slide), next = state(player, slide), n = Number(value);
    if (SF.MotionLab && SF.MotionLab.active(slide)) {
      var motionNext = SF.MotionLab.update(slide,next,action,value);
      if (!motionNext) return;
      Object.assign(next,motionNext);
    }
    else if (action === 'experiment' && slide.type === 'experiment' && SF.Experiments && Number.isInteger(n)) next.experimentStep = Math.max(-1,Math.min(SF.Experiments.config(slide).states.length-1,n));
    else if (action === 'experimentReplay' && slide.type === 'experiment') next.experimentReplay = (next.experimentReplay || 0) + 1;
    else if (action === 'reveal' && slide.type === 'chart') next.revealed = value === true;
    else if (action === 'position' && slide.type === 'beforeafter' && Number.isFinite(n)) next.position = Math.max(0, Math.min(100, n));
    else if (action === 'spot' && slide.type === 'explore' && Number.isInteger(n)) next.spot = Math.max(-1, Math.min(c.spots.length - 1, n));
    else if (action === 'input' && slide.type === 'simulation' && Number.isFinite(n)) next.input = Math.max(c.min, Math.min(c.max, n));
    else return;
    player.exploreStates = player.exploreStates || {};
    player.exploreStates[slide.id] = next;
    /* The local view updates now — that is what makes a drag feel attached to
       the finger. The presenter sync is coalesced to one a frame: it builds a
       full state payload and posts it, and a pointer drag fires at display
       rate, so an un-throttled sync sent a hundred-odd of them a second to the
       private screen. Invisible without a presenter window open, which is the
       one configuration a lecturer does not teach in. */
    if (player._current && player._current._exploreRefresh) player._current._exploreRefresh(next);
    queueSync(player);
  }
  /* rAF rather than a timer: the sync lands with the frame the drag is
     painting, and the last change of a gesture still gets one because the
     frame after it always runs. Somewhere without animation frames — a test
     context, a headless render — there is no drag to coalesce either, so the
     honest fallback is to sync straight away rather than to invent a timer. */
  var raf = (typeof window !== 'undefined' && window.requestAnimationFrame)
    ? window.requestAnimationFrame.bind(window)
    : null;
  var syncQueued = false;
  function queueSync(player) {
    if (!raf) { player.syncPresenter(); return; }
    if (syncQueued) return;
    syncQueued = true;
    raf(function () { syncQueued = false; player.syncPresenter(); });
  }

  function nextAction(player) {
    var s = player.deck && player.deck.slides[player.idx];
    if (!s || !active(s)) return null;
    var v = state(player, s);
    if (SF.MotionLab && SF.MotionLab.active(s)) {
      var mv=SF.MotionLab.state(s,v),mode=s.motionScene;
      if(['mask','scrub','cause','explode'].includes(mode))return mv.sceneValue<100?'comparison':null;
      if(['draw','annotate'].includes(mode))return mv.sceneStep<SF.MotionLab.items(s).length?'comparison':null;
      return null;
    }
    if (s.type === 'experiment') return v.experimentStep < SF.Experiments.config(s).states.length-1 ? 'comparison' : null;
    if (s.type === 'chart' && !v.revealed) return 'prediction';
    if (s.type === 'explore' && v.spot < config(s).spots.length - 1) return 'hotspot';
    if (s.type === 'beforeafter' && v.position < 100) return 'comparison';
    return null;
  }
  function step(player, direction) {
    var s = player.deck && player.deck.slides[player.idx];
    if (!s || !active(s)) return false;
    var v = state(player, s);
    if(SF.MotionLab && SF.MotionLab.active(s)) {
      var mv=SF.MotionLab.state(s,v), mode=s.motionScene;
      if(['mask','scrub','cause','explode'].includes(mode)) {
        if(direction>0 && mv.sceneValue<100 || direction<0 && mv.sceneValue>0){command(player,'motionValue',mv.sceneValue+direction*25);return true;}
      } else if(['draw','annotate'].includes(mode)) {
        if(direction>0 && mv.sceneStep<SF.MotionLab.items(s).length || direction<0 && mv.sceneStep>0){command(player,'motionStep',mv.sceneStep+direction);return true;}
      }
      return false;
    }
    if (s.type === 'experiment') {
      var next=v.experimentStep+direction;
      if(next>=-1 && next<SF.Experiments.config(s).states.length){command(player,'experiment',next);return true;}
      return false;
    }
    if (s.type === 'chart' && v.revealed === (direction < 0)) { command(player, 'reveal', direction > 0); return true; }
    if (s.type === 'explore' && ((direction > 0 && v.spot < config(s).spots.length - 1) || (direction < 0 && v.spot >= 0))) { command(player, 'spot', v.spot + direction); return true; }
    if (s.type === 'beforeafter' && ((direction > 0 && v.position < 100) || (direction < 0 && v.position > 0))) { command(player, 'position', direction > 0 ? 100 : 0); return true; }
    return false;
  }
  function node(tag, className, text) { var n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; }
  function svg(tag, attrs) { var n = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); }); return n; }
  function photo(url, alt) {
    var image = node('img', 'explore-image'); image.src = SF.safeMedia(url); image.alt = alt;
    image.draggable = false;
    /* A URL that fails slowly — an unreachable host waiting on DNS — can
       error after the slide it was on has been removed, which is 700ms after
       the presenter moves off it. By then there is no parent to explain
       ourselves to. */
    image.onerror = function () {
      image.hidden = true;
      var host = image.parentElement;
      if (host) host.appendChild(node('p', 'explore-empty', 'Choose an image in Design & content.'));
    };
    return image;
  }
  function render(root, pad, slide, opts) {
    if (!active(slide)) return;
    if(SF.MotionLab && SF.MotionLab.active(slide)){SF.MotionLab.render(root,pad,slide,opts,SF.safeMedia);return;}
    if (slide.type === 'experiment' && SF.Experiments) { SF.Experiments.render(root,pad,slide,opts); return; }
    var c = config(slide), view = Object.assign(initial(slide), opts.exploreState || {});
    var enabled = !!(opts.interactive || opts.exploreCommand);
    function send(action, value) { if (opts.exploreCommand) opts.exploreCommand(action, value); }
    function button(parent, text, action) { var b = node('button', 'explore-button', text); b.type = 'button'; b.disabled = !enabled; b.onclick = action; parent.appendChild(b); return b; }
    function range(parent, label, min, max, value, action) {
      var wrap = node('label', 'explore-range'), text = node('span', null, label);
      var input = node('input'); input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String((max - min) / 100); input.value = String(value); input.disabled = !enabled;
      input.setAttribute('aria-label', label); input.oninput = function () { send(action, Number(input.value)); };
      wrap.append(text, input); parent.appendChild(wrap); return input;
    }
    root.classList.add('exploration-slide');
    if (slide.type === 'chart') {
      var result = node('div', 'explore-chart-result');
      Array.from(pad.children).forEach(function (child) { if (child.tagName !== 'H2') result.appendChild(child); });
      var cover = node('div', 'explore-predict'); cover.append(node('span', 'explore-eyebrow', 'PREDICT FIRST'), node('h3', null, c.prompt), node('p', null, slide.feedback ? 'Commit to a prediction. Discuss your reasoning, then compare with the data.' : 'Think, discuss, then compare your prediction with the data.'));
      button(cover, 'Reveal the chart', function () { send('reveal', true); });
      pad.append(cover, result);
      var again = button(pad, 'Hide data · predict again', function () { send('reveal', false); });
      root._exploreRefresh = function (next) { view = Object.assign(view, next); result.hidden = !view.revealed; cover.hidden = view.revealed; again.hidden = !view.revealed; result.classList.toggle('explore-revealed', view.revealed); };
    } else {
      pad.replaceChildren(); pad.appendChild(node('h2', null, slide.title || SF.SLIDE_TYPES[slide.type].label));
      if (slide.type === 'beforeafter') {
        var frame = node('div', 'explore-compare');
        frame.appendChild(photo(c.before, c.beforeLabel + ': ' + c.alt));
        var after = node('div', 'explore-after'); after.appendChild(photo(c.after, c.afterLabel + ': ' + c.alt)); frame.appendChild(after);
        var divider = node('div', 'explore-divider'); frame.appendChild(divider);
        var beforeLabel = node('span', 'explore-before-label', c.beforeLabel), afterLabel = node('span', 'explore-after-label', c.afterLabel); frame.append(beforeLabel, afterLabel);
        if (enabled) {
          frame.style.touchAction = 'none';
          function drag(event) { var rect = frame.getBoundingClientRect(); send('position', 100 - (event.clientX - rect.left) / rect.width * 100); }
          frame.onpointerdown = function (event) { frame.setPointerCapture(event.pointerId); drag(event); };
          frame.onpointermove = function (event) { if (frame.hasPointerCapture(event.pointerId)) drag(event); };
          frame.onpointerup = frame.onpointercancel = function (event) { if (frame.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId); };
        }
        pad.appendChild(frame);
        var slider = range(pad, 'Reveal after image', 0, 100, view.position, 'position');
        var actions = node('div', 'explore-actions'); button(actions, c.beforeLabel, function () { send('position', 0); }); button(actions, 'Compare', function () { send('position', 50); }); button(actions, c.afterLabel, function () { send('position', 100); }); pad.appendChild(actions);
        root._exploreRefresh = function (next) { view = Object.assign(view, next); after.style.clipPath = 'inset(0 0 0 ' + (100 - view.position) + '%)'; divider.style.left = (100 - view.position) + '%'; slider.value = String(view.position); beforeLabel.hidden = view.position === 100; afterLabel.hidden = view.position === 0; };
      } else if (slide.type === 'explore') {
        var scene = node('div', 'explore-scene'), moving = node('div', 'explore-moving'), mainImage = photo(slide.image, c.alt); moving.appendChild(mainImage); scene.appendChild(moving); pad.appendChild(scene);
        var caption = node('div', 'explore-caption'); caption.setAttribute('aria-live', 'polite'); pad.appendChild(caption);
        var spots = c.spots.map(function (spot, i) { var b = button(moving, String(i + 1), function () { send('spot', i); }); b.className = 'explore-hotspot'; b.style.left = spot.x + '%'; b.style.top = spot.y + '%'; b.setAttribute('aria-label', spot.title); return b; });
        button(pad, 'Whole image', function () { send('spot', -1); });
        root._exploreRefresh = function (next) { view = Object.assign(view, next); var spot = c.spots[view.spot];
          // Markers use image coordinates, including the margins introduced by contain.
          var width = scene.clientWidth || 1160, height = scene.clientHeight || 360;
          var iw = mainImage.naturalWidth || width, ih = mainImage.naturalHeight || height;
          var scale = Math.min(width / iw, height / ih), imageWidth = iw * scale, imageHeight = ih * scale;
          function point(p) { return { x: ((width-imageWidth)/2 + p.x/100*imageWidth)/width*100, y: ((height-imageHeight)/2 + p.y/100*imageHeight)/height*100 }; }
          var target = spot ? point(spot) : {x:50,y:50};
          moving.style.transformOrigin = '0 0'; moving.style.transform = spot ? 'translate(' + (50 - target.x * spot.zoom) + '%,' + (50 - target.y * spot.zoom) + '%) scale(' + spot.zoom + ')' : 'translate(0,0) scale(1)'; caption.replaceChildren(node('strong', null, spot ? spot.title : 'Explore the image'), node('p', null, spot ? spot.body : c.spots.length ? 'Choose a numbered detail, or use Next to explore in order.' : 'Add image details in Design & content.')); spots.forEach(function (b, i) { var p = point(c.spots[i]); b.style.left = p.x + '%'; b.style.top = p.y + '%'; b.setAttribute('aria-pressed', String(i === view.spot)); b.style.transform = 'translate(-50%,-50%) scale(' + (1 / (spot ? spot.zoom : 1)) + ')'; }); };
        mainImage.onload = function () { root._exploreRefresh(view); };
        requestAnimationFrame(function () { root._exploreRefresh(view); });
      } else {
        var graph = svg('svg', { viewBox: '0 0 1000 360', class: 'explore-graph', role: 'img' });
        var values = SF.explorationCurve(c, 100);
        var low = Math.min(0, ...values.map(function (p) { return p[1]; })), high = Math.max(1, ...values.map(function (p) { return p[1]; }));
        function X(x) { return 90 + (x - c.min) / (c.max - c.min) * 830; }
        function Y(y) { return 290 - (y - low) / (high - low) * 250; }
        graph.append(svg('path', { d: 'M90 30 V290 H930', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }));
        [[90,325,String(c.min)],[900,325,String(c.max)],[15,45,String(Math.round(high))],[15,292,String(Math.round(low))]].forEach(function (a) { var t = svg('text', { x: a[0], y: a[1], fill: 'currentColor', 'font-size': 20 }); t.textContent = String(a[2]); graph.appendChild(t); });
        graph.appendChild(svg('path', { d: values.map(function (p,i) { return (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1]); }).join(' '), fill: 'none', stroke: 'var(--accent,#1d6b45)', 'stroke-width': 5 }));
        var marker = svg('circle', { r: 10, fill: 'var(--accent,#1d6b45)', stroke: 'currentColor', 'stroke-width': 2 }); graph.appendChild(marker); pad.appendChild(graph);
        var reading = node('output', 'explore-reading'); reading.setAttribute('aria-live', 'polite'); pad.appendChild(reading);
        var input = range(pad, c.inputLabel, c.min, c.max, view.input, 'input');
        pad.appendChild(node('p', 'explore-formula', c.outputLabel + ' = ' + c.a + ' × ' + c.inputLabel + (c.model === 'quadratic' ? '²' : '') + ' + ' + c.b));
        button(pad, 'Reset input', function () { send('input', c.initial); });
        root._exploreRefresh = function (next) { view = Object.assign(view, next); var output = SF.explorationValue(c, view.input); marker.setAttribute('cx', String(X(view.input))); marker.setAttribute('cy', String(Y(output))); input.value = String(view.input); reading.textContent = c.inputLabel + ': ' + Number(view.input.toFixed(2)) + ' → ' + c.outputLabel + ': ' + Number(output.toFixed(2)); graph.setAttribute('aria-label', reading.textContent); };
      }
    }
    root._exploreRefresh(view);
  }
  function inspector(parent, slide, UI, changed, redraw) {
    if (slide.type === 'experiment' && SF.Experiments) return SF.Experiments.inspector(parent,slide,UI,changed,redraw);
    if (!kinds.includes(slide.type) && slide.type !== 'chart') return false;
    /* A local copy, not a write-through. This used to be
       `slide.exploration = config(slide)`, which meant that merely selecting a
       slide rewrote part of the document as a side effect of drawing its
       inspector — and it replaced c.spots with a new array of new objects on
       every repaint, so anything still holding a reference to a spot was
       writing to a detached one. Nothing reaches the slide now until an edit
       does it, through commit(). */
    var c = config(slide);
    function commit(then) { slide.exploration = c; (then || changed)(); }
    function text(label, key, object) { var o = object || c; parent.appendChild(UI.field(label, UI.text(o[key] || '', function (v) { if (key === 'prompt' && slide.feedback && slide.feedback.prompt === o[key]) slide.feedback.prompt = v; o[key] = v; commit(); }))); }
    function number(label, key, object) { var o = object || c; var input = node('input'); input.type = 'number'; input.value = String(o[key]); input.oninput = function () { if (Number.isFinite(input.valueAsNumber)) { o[key] = input.valueAsNumber; commit(); } }; input.onchange = function () { Object.assign(c, SF.normalizeExploration(c)); commit(redraw); }; parent.appendChild(UI.field(label, input)); }
    function image(label, key, object) {
      var o = object || c;
      text(label + ' URL', key, o);
      var file = node('input');
      file.type = 'file';
      file.accept = 'image/*';
      file.setAttribute('aria-label', 'Upload ' + label);
      file.onchange = function () {
        var f = file.files && file.files[0];
        if (!f) return;
        if (f.size > 3.5 * 1024 * 1024) { SF.toast('Choose an image smaller than 3.5 MB.'); return; }
        var reader = new FileReader();
        reader.onload = function () { o[key] = String(reader.result); commit(redraw); };
        reader.readAsDataURL(f);
      };
      parent.appendChild(UI.field('Upload ' + label, file));
      if (String(o[key] || '').trim()) {
        parent.appendChild(UI.button('Remove ' + label.toLowerCase(), 'ghost', function () {
          o[key] = '';
          commit(redraw);
        }));
      }
    }
    if (slide.type === 'chart') {
      parent.appendChild(UI.check('Predict before revealing the chart', c.prediction, function (v) { c.prediction = v; commit(redraw); }));
      if (c.prediction) {
        text('Prediction question', 'prompt');
        parent.appendChild(UI.check('Collect predictions on learner devices', !!slide.feedback, function (v) { slide.feedback = v ? Object.assign(SF.makeFeedback('poll'), { prompt: c.prompt, options: ['Increasing', 'Staying similar', 'Decreasing'] }) : null; redraw(); }));
        parent.appendChild(node('p', 'hint', 'Next reveals the whole chart. Edit response choices in Engagement. Results stay beside the data.'));
      }
      return false;
    }
    text('Title', 'title', slide);
    if (slide.type === 'beforeafter') { image('Before image', 'before'); image('After image', 'after'); text('Before label', 'beforeLabel'); text('After label', 'afterLabel'); text('Image description', 'alt'); }
    if (slide.type === 'explore') {
      image('Main image', 'image', slide); text('Image description', 'alt');
      c.spots.forEach(function (spot, i) {
        parent.appendChild(node('h4', null, 'Detail ' + (i + 1))); text('Detail title', 'title', spot); text('Explanation', 'body', spot);
        number('Horizontal position (%)', 'x', spot); number('Vertical position (%)', 'y', spot); number('Zoom (1–4)', 'zoom', spot);
        parent.appendChild(UI.button('Remove detail', 'ghost', function () { c.spots.splice(i,1); commit(redraw); }));
      });
      if (c.spots.length < 8) parent.appendChild(UI.button('Add image detail', '', function () { c.spots.push({ x: 50, y: 50, zoom: 2, title: 'New detail', body: 'What should learners notice?' }); commit(redraw); }));
      parent.appendChild(node('p', 'hint', 'Positions are percentages of the image. Next visits details in order; Previous steps back.'));
    }
    if (slide.type === 'simulation') {
      parent.appendChild(UI.field('Relationship', UI.select([{ value: 'linear', label: 'Linear: y = ax + b' }, { value: 'quadratic', label: 'Quadratic: y = ax² + b' }], c.model, function (v) { c.model = v; commit(); })));
      text('Input label', 'inputLabel'); text('Output label', 'outputLabel');
      number('Minimum input', 'min'); number('Maximum input', 'max'); number('Starting input', 'initial'); number('Multiplier (a)', 'a'); number('Offset (b)', 'b');
      parent.appendChild(node('p', 'hint', 'Present to drag the input and explore the graph. Input range is bounded to −1000…1000; multiplier to −100…100.'));
    }
    return true;
  }
  SF.Explore = { ownsSteps: active, render: render, inspector: inspector, command: command, step: step, nextAction: nextAction };
}
