/* The lattice: where a block sits on a slide, and everything that follows from
 * that. Moved out of js/render.js — see docs/render-split.md, step 5b, the
 * last of the split.
 *
 * Block keys and lattice geometry, region overlap and placement, hidden and
 * free blocks and the kinds they come in, restacking, paint order and
 * occlusion, and whether what a slot holds actually fits it. A drag
 * manipulates a named region in a grid, never a coordinate; this is the file
 * that makes that true.
 *
 * Thirty-four SF names and seven locals, only one of which — LATTICE — is read
 * back by js/render.js, for the header and footer that sit on the same grid.
 *
 * It installs rather than returns, for the same reason src/render/art.js does:
 * the body is thirty-four `SF.x = …` statements, and converting them to
 * declarations and a return would have been a rewrite rather than a move.
 *
 * Three things are injected. `el` is the renderer's DOM helper. `travelFrom`
 * and `IMAGE_FRAMES` belong to the image layouts, which stay behind: a free
 * block can hold a picture, so this file needs to read a frame and a travel
 * the same way a picture layout does.
 *
 * Not to be confused with src/render/regions.js, which is *chrome* regions —
 * header and footer slots. Adjacent name, unrelated job.
 */
export function installLatticeRenderer(SF, helpers) {
  const {el, IMAGE_FRAMES, travelFrom} = helpers;

  /* ------------------------------------------------------------- the lattice
     A drag manipulates a named region in a grid, never a coordinate. Free-form
     {x,y,w,h} forfeits reflow, re-theming, aspect export and print, so what a
     slide stores is a cell range — col, row and spans — on the same 16x12
     lattice Engine 3 has been proving against the layout bank.

     The pad keeps its identity and only its children are re-parented, which is
     safe here because no theme sheet uses a `.pad >` selector: descendant rules
     like `.theme-studio.layout-title h1` still match through the wrapper, and
     every nth-child rule in the theme sheets targets `li` inside a list or
     .timeline-event inside its own container, neither of which is re-parented.

     A slide with no regions is not latticed at all, so every existing deck
     renders exactly as before. */
  var LATTICE = { left: 52, top: 88, w: 1176, h: 576, cols: 12, rows: 16, stepX: 101, stepY: 36 };
  SF.LATTICE = LATTICE;
  SF.anchorRegion = function (region) {
    var r = Object.assign({}, region);
    /* Whole cells, at least one of each, and no wider than the lattice. A
       region wider than twelve columns anchored to a col of zero or less, and
       a missing span wrote `span undefined`; either makes the whole gridArea
       invalid, so the browser dropped it and the block fell into a single
       auto-placed cell — no error, just a block in the wrong place at the
       wrong size. The bottom edge is deliberately not clamped: running past
       row 16 is allowed and reported (restackRegions' `over`), and clamping
       it here would hide the overflow the author is being told about. */
    function cells(v, lo, hi) {
      var n = Math.round(Number(v));
      if (!isFinite(n)) n = lo;
      return Math.max(lo, Math.min(hi, n));
    }
    r.cols = cells(r.cols, 1, LATTICE.cols);
    r.col = cells(r.col, 1, LATTICE.cols - r.cols + 1);
    r.rows = cells(r.rows, 1, Infinity);
    r.row = cells(r.row, 1, Infinity);
    if (r.anchorX === 'left') r.col = 1;
    if (r.anchorX === 'center') r.col = Math.floor((LATTICE.cols - r.cols) / 2) + 1;
    if (r.anchorX === 'right') r.col = LATTICE.cols - r.cols + 1;
    if (r.anchorY === 'top') r.row = 1;
    if (r.anchorY === 'middle') r.row = Math.floor((LATTICE.rows - r.rows) / 2) + 1;
    if (r.anchorY === 'bottom') r.row = LATTICE.rows - r.rows + 1;
    return r;
  };

  // A complete slide override, or the deck defaults. Absent means legacy chrome.

  /* What a content block is called in a region map. The editable key when the
     block has one, so a region survives the text changing; otherwise the class
     the theme gave it, which is what an accent rule or a decorative bar has. */
  function blockKeyOf(node, i) {
    if (!node.getAttribute) return 'block-' + i;
    /* An explicit name first. A content key is the usual one, because a block
       that holds words is named by the words it holds — but a picture placed on
       the lattice holds none, and naming it by its class would give every
       picture on the slide the same region. */
    var named = node.getAttribute('data-block-key');
    if (named) return named;
    /* The key this block had while every block was still in the pad. Written
       by dropHiddenBlocks before it removes any, because the two shapes of
       layout block that have no name of their own are numbered by position
       and would otherwise be renumbered by the ones above them going away.
       A name of its own rather than data-block-key, which applyRegions puts
       on the slot wrapping this node — one key on two elements makes every
       lookup ambiguous. */
    var kept = node.getAttribute('data-lattice-key');
    if (kept) return kept;
    var key = node.getAttribute('data-content-key');
    if (key) return key;
    /* An SVG element's className is an SVGAnimatedString, so String() on it
       yields "[object SVGAnimatedString]" and the key became "[object". */
    var raw = node.className;
    if (raw && typeof raw === 'object' && 'baseVal' in raw) raw = raw.baseVal;
    var cls = String(raw || '').split(/\s+/).filter(Boolean)[0];
    return cls || 'block-' + i;
  }
  SF.blockKeyOf = blockKeyOf;

  SF.latticeHost = function (root) {
    return root.querySelector('.cp-body') || root.querySelector('.pad') || null;
  };
  SF.latticeGeometry = function (root) {
    var g = Object.assign({}, LATTICE);
    var grid = root && root.querySelector('.sf-lattice');
    if (!grid) return g;
    var base = root.getBoundingClientRect(), rect = grid.getBoundingClientRect();
    var scale = base.width / 1280;
    if (!scale || !rect.height) return g;
    g.left = (rect.left - base.left) / scale;
    g.top = (rect.top - base.top) / scale;
    g.w = rect.width / scale; g.h = rect.height / scale;
    g.stepX = (g.w + 36) / g.cols; g.stepY = g.h / g.rows;
    return g;
  };

  /* ------------------------------------------------------- placement
     One answer to "may this go here", for every path that moves something.

     There were four. Adding an item looked for a free declared slot and then
     halved whatever was still in the way; dragging clamped to the grid and
     overlapped freely; resizing did the same; the arrow keys did the same
     again. So the canvas protected you when you inserted and abandoned you
     the moment you touched what you had inserted, and nothing anywhere could
     even tell you two blocks were on top of each other — latticeFit measures
     whether a block's own words fit its own rows, so it reported "2 spare"
     on a heading lying across its neighbour.

     The libraries that solve this for a living agree on the shape of the
     answer. gridstack removed its `float: boolean` in v14 for a named mode —
     top, float, list, compact — and not one of the four lets two widgets
     share a cell; even "no gravity" pushes on collision. react-grid-layout
     names the two cases outright: allowOverlap for "layered dashboards,
     free-form layouts", preventCollision for "fixed grids, slot-based
     layouts". Overlap is always a declared mode and never an accident.

     This canvas has both cases and already knows it: the design doc says
     "freeform remains the right model for a decorative plane, and the wrong
     one for content", and tools/stack-audit.mjs measures 30 of 30 slide
     types as vertical stacks. So content snaps and artwork floats, and the
     mode says which rather than the call site deciding. */
  SF.regionsOverlap = function (a, b) {
    return !!a && !!b &&
      a.col < b.col + b.cols && b.col < a.col + a.cols &&
      a.row < b.row + b.rows && b.row < a.row + a.rows;
  };
  /* Every pair of regions sharing a cell. The canvas had no way to ask. */
  SF.overlapsIn = function (regions) {
    var keys = Object.keys(regions || {});
    var out = [];
    keys.forEach(function (a, i) {
      keys.slice(i + 1).forEach(function (b) {
        if (SF.regionsOverlap(regions[a], regions[b])) out.push([a, b]);
      });
    });
    return out;
  };
  /* The nearest place `want` fits without sharing a cell with anything in
     `occupied`, searched outward from where it was asked for. Nearest rather
     than pushing the occupant aside: the items on these slides are placed
     against slots the layouts declared, so moving the thing being dragged
     keeps every other decision the author already made — and a push has to
     decide what happens when the pushed block reaches the edge, which is a
     cascade this grid is too small to absorb.

     Returns null when the slide is too full to hold it anywhere, so a caller
     can refuse rather than invent a position. Pure: the grid and the
     occupancy come in as arguments, so it is testable without a page. */
  SF.freePlacement = function (want, occupied, grid) {
    if (!want) return null;
    var cols = (grid && grid.cols) || 12;
    var rows = (grid && grid.rows) || 16;
    var busy = (occupied || []).filter(Boolean);
    var clear = function (r) {
      return !busy.some(function (b) { return SF.regionsOverlap(r, b); });
    };
    if (want.col >= 1 && want.row >= 1 &&
        want.col + want.cols - 1 <= cols && want.row + want.rows - 1 <= rows &&
        clear(want)) return { ...want };
    var best = null, bestD = Infinity;
    for (var row = 1; row + want.rows - 1 <= rows; row++) {
      for (var col = 1; col + want.cols - 1 <= cols; col++) {
        var here = { col: col, row: row, cols: want.cols, rows: want.rows };
        if (!clear(here)) continue;
        /* Rows weigh more than columns: these layouts are stacks, so sliding
           along a row reads as the same place and dropping down a row does
           not. */
        var d = Math.abs(col - want.col) + Math.abs(row - want.row) * 1.35;
        if (d < bestD) { bestD = d; best = here; }
      }
    }
    return best ? { ...best, moved: true } : null;
  };

  /* The whole move, including what it displaces.

     One rule for dragging, resizing and nudging alike: the block you are
     moving gets exactly what you asked for, anything it lands on is pushed to
     the nearest free place, and if something cannot be placed the move is
     refused whole rather than half-applied.

     The first version of this stopped a block at its neighbour's edge instead.
     That reads well and is wrong: building a layout means growing one block
     through where another currently sits, and refusing it meant a slide could
     no longer be arranged at all — recreating `split` got a copy column 4 rows
     tall instead of 12. Both gridstack and react-grid-layout push for this
     reason, and neither offers a stop-at-the-edge mode.

     `pinned` is the block being moved; `fixed` are keys that may not be
     pushed — a block the layout drew is not an item's to shove, and a picture
     belongs to the decorative plane, which has its own rules. They are
     obstacles, and a move that cannot clear them is refused. Taking a layout
     block off the slide is the way past one.

     @returns {object|null} a new region map, or null when it cannot be done */
  SF.resolvePlacement = function (regions, key, want, grid, fixed) {
    if (!regions || !key || !want) return null;
    var cols = (grid && grid.cols) || 12;
    var rows = (grid && grid.rows) || 16;
    if (want.col < 1 || want.row < 1 ||
        want.col + want.cols - 1 > cols || want.row + want.rows - 1 > rows) return null;
    var immovable = {};
    (fixed || []).forEach(function (k) { immovable[k] = true; });
    var next = {};
    Object.keys(regions).forEach(function (k) { next[k] = { ...regions[k] }; });
    next[key] = { col: want.col, row: want.row, cols: want.cols, rows: want.rows };
    /* Relaxation rather than a cascade written by hand: shift whatever is
       overlapping to its nearest free place and look again. Each pass places
       one block, so the grid's own size bounds the work. */
    var settled = Object.keys(next).length + 4;
    for (var pass = 0; pass < settled; pass++) {
      /** @type {string[]} */
      var clash = [];
      Object.keys(next).forEach(function (a) {
        if (clash.length) return;
        Object.keys(next).forEach(function (b) {
          if (clash.length || a === b) return;
          if (SF.regionsOverlap(next[a], next[b])) clash = [a, b];
        });
      });
      if (!clash.length) return next;
      /* Whichever of the pair may move; the pinned block never does, so a
         clash between it and an immovable one is unresolvable. */
      var shove = clash.filter(function (k) { return k !== key && !immovable[k]; })[0];
      if (!shove) return null;
      var others = Object.keys(next)
        .filter(function (k) { return k !== shove; })
        .map(function (k) { return next[k]; });
      var spot = SF.freePlacement(next[shove], others, { cols: cols, rows: rows });
      if (!spot) return null;
      next[shove] = { col: spot.col, row: spot.row, cols: spot.cols, rows: spot.rows };
    }
    return null;
  };

  /* Which layout blocks this slide has been told not to draw.
     A block the layout drew is not a thing sitting on the slide — it is the
     slide's type rendering a field, and four different shapes of thing at
     that: one that owns a content key (title, subtitle, body), one that is a
     container of them (a bullet list, a stats grid), one that is pure
     decoration with no content at all (an accent bar, the date), and one that
     is an opaque structure built from typed arrays with no keys exposed
     (compare, cards, the org chart, a mind map). There is no single field to
     empty, so "delete this block" cannot mean "clear its words" without a
     hand-written map per type, with the opaque ones needing bespoke code each.

     Not drawing it needs none of that, and it is the same idea as the hidden
     flag artwork pictures have carried all along. It is also recoverable: a
     mis-click costs a keystroke rather than a teacher's title. */
  SF.hiddenBlocksOf = function (slide) {
    var list = slide && slide.design && slide.design.hidden;
    return Array.isArray(list) ? list.filter(Boolean).map(String) : [];
  };
  SF.isBlockHidden = function (slide, key) {
    return !!key && SF.hiddenBlocksOf(slide).indexOf(String(key)) >= 0;
  };
  /* Takes the hidden ones out of the pad before anything measures or places
     what is left. Ahead of applyRegions rather than inside it, because a slide
     with no region map never reaches applyRegions and would otherwise go on
     drawing a block it was told to drop. */
  SF.dropHiddenBlocks = function (root, slide) {
    var hidden = SF.hiddenBlocksOf(slide);
    if (!hidden.length) return 0;
    var host = SF.latticeHost(root);
    if (!host) return 0;
    var kids = Array.prototype.slice.call(host.children).filter(function (n) { return n.nodeType === 1; });
    /* Stamp every key before removing any. Two of the four shapes of layout
       block have no name of their own and fall back to their position in the
       pad — so hiding the title renumbered the bullet list under it from
       block-1 to block-0, and the region map, still keyed block-1, stopped
       describing it. Writing the key each block had while all of them were
       present makes it survive the ones above it going away. */
    kids.forEach(function (node, i) {
      if (node.setAttribute) node.setAttribute('data-lattice-key', String(blockKeyOf(node, i)));
    });
    var gone = 0;
    kids.forEach(function (node) {
      if (hidden.indexOf(String(blockKeyOf(node, 0))) >= 0) { node.remove(); gone++; }
    });
    return gone;
  };

  /* Wraps each pad child in a cell of the lattice. Blocks the map does not
     mention are left to auto-flow rather than dropped — a region map that has
     gone stale should misplace a block, not lose it. */
  SF.applyRegions = function (root, slide) {
    var regions = slide && slide.design && slide.design.regions;
    if (!regions || !Object.keys(regions).length) return false;
    var host = SF.latticeHost(root);
    if (!host) return false;
    var kids = Array.prototype.slice.call(host.children).filter(function (n) {
      return n.nodeType === 1;
    });
    if (!kids.length) return false;
    var grid = el('div', 'sf-lattice');
    kids.forEach(function (node, i) {
      var key = blockKeyOf(node, i);
      var r = regions[key] && SF.anchorRegion(regions[key]);
      var slot = el('div', 'sf-slot');
      slot.setAttribute('data-block-key', key);
      if (r) {
        slot.style.gridArea = r.row + ' / ' + r.col + ' / span ' + r.rows + ' / span ' + r.cols;
        slot.setAttribute('data-region', r.row + ',' + r.col + ',' + r.rows + ',' + r.cols);
        // Half-track offsets keep odd spans truly centred on an even grid.
        var dx = r.anchorX === 'center' && (LATTICE.cols - r.cols) % 2 ? LATTICE.stepX / 2 : 0;
        var dy = r.anchorY === 'middle' && (LATTICE.rows - r.rows) % 2 ? 50 / r.rows : 0;
        if (dx || dy) slot.style.transform = 'translate(' + dx + 'px, ' + dy + '%)';
        /* Where the words sit inside the rows the region gave them, which is a
           different question from where the region sits on the slide. A
           three-row region holding two rows of text can put them in rows 1-2,
           2-3, or centred, and the vertical anchor above cannot say any of
           that — it moves the region and keeps the text at its top.
           Stamped only when it has been chosen, so a slide that has never
           asked renders exactly as it did before this existed. */
        if (/^(top|middle|bottom)$/.test(r.alignY || '')) slot.setAttribute('data-align-y', r.alignY);
        if (/^(left|center|right)$/.test(r.alignX || '')) slot.setAttribute('data-align-x', r.alignX);
      }
      slot.appendChild(node);
      grid.appendChild(slot);
    });
    host.replaceChildren(grid);
    root.classList.add('sf-latticed');
    return true;
  };

  /* ---------------------------------------------------------- free blocks
     A block the author added, rather than one a layout produced.

     Every other block on a slide exists because the slide type and its
     composition drew it: title, subtitle, bullets, the four choices of a
     ballot. That is why the authoring audit found no way to add one, duplicate
     one or delete one — there was nothing to add, because a block was not a
     thing the model had. slide.blocks is that thing, and it is additive in the
     same way slide.art.pictures is: a slide without any renders exactly as it
     did, and no layout is touched.

     The key is a content key, deliberately. blockKeyOf prefers
     data-content-key, so a free block's region lands in design.regions under
     the same name as everything else, and move, resize, anchors, alignY,
     push-down and Fit to text all work on it without another line of code.
     It is also what makes the text editable: the canvas editor and the marks
     engine both index by content key. */
  /* The footprints are measured, not chosen. Across the reference library a
     heading occupies 10 columns and one row (424 of them), body text 9 by 1
     (319), a list 10 by 8 (72), a chart 11 by 11 (34). A picture splits in
     two: 22 are the whole slide and 22 share it at 8 by 11, and an inserted
     item is the second kind, so that is the number taken.

     Every default here was 6 by 6-ish before, which was nobody's measurement
     — it made an inserted heading a third the width of every authored one.

     A kind is a tag, a class, a default footprint — and optionally a `draw`.
     Without one the block is its own text, which is what the first three are
     and how every block behaved before. With one, the same `text` field is
     read as something else: lines for bullets, a path for a picture, a table
     for a chart. One field, interpreted per kind, is what lets the canvas
     editor, the marks engine, Fit to text and the region machinery keep
     working on all of them without knowing any of this. */
  /* What a kind is, and what can be done to one.

     `tag`/`cls`/`draw` are how it renders, `rows`/`cols` the footprint the
     corpus says it takes, and `edits`/`resizes`/`duplicates` what the canvas
     may do with it. That last group used to be inferred at four call sites by
     three different mechanisms — a round-trip string comparison in
     inlineEditable, the `blocks.` key prefix twice over, and the presence of
     a `draw` function standing in for "not prose" — and every one of this
     week's canvas bugs was one of those inferences being wrong somewhere.

     `edits` says where a kind's words are typed once it has some:
       'inline'  on the canvas, where they are drawn
       'rail'    in the inspector, because the rendered form is not the
                 stored form — a bullet list is lines, a pair is a tab
       false     nowhere: an image's text is a path and the picker owns it
     An empty block is typed into on the canvas whatever it declares, because
     a block is added before it is written into and a zero-height box cannot
     be clicked into. That guard lives in inlineEditable and sits above this.

     `draw` was never a proxy for any of it: `quote` has one and is still
     typed into where it sits. */
  var FREE_KINDS = {
    heading: { tag: 'h3', cls: 'free-heading', label: 'Heading', rows: 1, cols: 10, size: 'heading',
      edits: 'inline', resizes: true, duplicates: true },
    text: { tag: 'p', cls: 'free-text', label: 'Text', rows: 1, cols: 9, size: 'body',
      edits: 'inline', resizes: true, duplicates: true },
    note: { tag: 'div', cls: 'free-note', label: 'Note', rows: 1, cols: 4, size: 'small',
      edits: 'inline', resizes: true, duplicates: true },
    bullets: {
      tag: 'ul', cls: 'free-bullets', label: 'Bullet points', rows: 8, cols: 10,
      edits: 'rail', resizes: true, duplicates: true,
      hint: 'One point per line.',
      draw: function (node, text) {
        text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean)
          .forEach(function (line) { node.appendChild(el('li', null, line)); });
      }
    },
    image: {
      tag: 'div', cls: 'free-image', label: 'Image', rows: 11, cols: 8,
      edits: false, resizes: true, duplicates: true,
      hint: 'A URL, or a path to a file beside index.html.',
      draw: function (node, text, block) {
        var src = SF.safeMedia(text);
        if (!src) return;
        var travel = travelFrom(block);
        var motion = travel ? ' img-motion-travel'
          : block.imageMotion === 'zoom' ? ' img-motion-zoom' : '';
        var img = el('img', 'free-image-img' + motion);
        img.src = src;
        img.alt = String(block.alt || '');
        img.draggable = false;
        img.style.objectFit = block.fit === 'contain' ? 'contain' : 'cover';
        /* Frame: the cell says how much room, this says what shape to take in
           it. Without one the picture simply fills the cell, as before. */
        if (Object.prototype.hasOwnProperty.call(IMAGE_FRAMES, block.frame || '')) {
          img.style.aspectRatio = IMAGE_FRAMES[block.frame];
          img.style.width = 'auto';
          img.style.height = 'auto';
          img.style.maxWidth = '100%';
          img.style.maxHeight = '100%';
        }
        var pct = function (v) { var n = Number(v); return (Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50) + '%'; };
        img.style.setProperty('--img-fx', pct(block.focalX));
        img.style.setProperty('--img-fy', pct(block.focalY));
        if (travel) {
          img.style.setProperty('--kb-from', travel.from);
          img.style.setProperty('--kb-to', travel.to);
          img.style.setProperty('--kb-dur', travel.secs + 's');
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
      tag: 'dl', cls: 'free-pairs', label: 'Label and value list', rows: 8, cols: 10,
      edits: 'rail', resizes: true, duplicates: true,
      hint: 'One per line: the label, a tab, then the value.',
      draw: function (node, text) {
        text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean)
          .forEach(function (line) {
            var at = line.indexOf('\t');
            var term = at < 0 ? line : line.slice(0, at);
            var def = at < 0 ? '' : line.slice(at + 1).trim();
            node.appendChild(el('dt', 'free-pair-term', term));
            if (def) node.appendChild(el('dd', 'free-pair-def', def));
          });
      }
    },
    quote: {
      tag: 'figure', cls: 'free-quote', label: 'Quote', rows: 4, cols: 8,
      edits: 'inline', resizes: true, duplicates: true,
      hint: 'The words, a tab, then who said them.',
      draw: function (node, text) {
        var at = text.indexOf('\t');
        var words = at < 0 ? text : text.slice(0, at);
        var who = at < 0 ? '' : text.slice(at + 1).trim();
        node.appendChild(el('blockquote', 'free-quote-words', words.trim()));
        if (who) node.appendChild(el('figcaption', 'free-quote-attrib', who));
      }
    },
    chart: {
      tag: 'div', cls: 'free-chart', label: 'Chart', rows: 11, cols: 11,
      edits: 'rail', resizes: true, duplicates: true,
      hint: 'Tab-separated, a heading row then the values.',
      draw: function (node, text, block) {
        /* A synthetic slide, because chartSvgFor asks a slide for its kind and
           its table and nothing else. Reusing it is the whole point: a block
           chart is the same chart, not a second implementation of one. */
        var stand = { chartKind: block.chartKind || 'bar', body: text, design: {} };
        var data = SF.chartData(stand);
        if (!data.categories.length) return;
        node.appendChild(SF.chartSvgFor(stand.chartKind, data, stand, function (si, ci) {
          return data.series.length > 1 ? si : ci;
        }));
      }
    }
  };
  /* The ranks a block can take, largest first. */
  SF.FREE_SIZES = ['display', 'title', 'heading', 'body', 'small'];
  SF.FREE_KINDS = FREE_KINDS;
  SF.freeBlockKey = function (id) { return 'blocks.' + id; };
  SF.freeBlockId = function (key) {
    var m = /^blocks\.(.+)$/.exec(String(key || ''));
    return m ? m[1] : null;
  };
  SF.freeBlocksOf = function (slide, make) {
    if (!slide) return [];
    if (!Array.isArray(slide.blocks)) {
      if (!make) return [];
      slide.blocks = [];
    }
    return slide.blocks;
  };
  SF.freeBlockById = function (slide, id) {
    return SF.freeBlocksOf(slide).find(function (b) { return String(b.id) === String(id); }) || null;
  };
  /* One answer to "can this come off the slide", and one act that takes it
     off. Deleting had four truths and they disagreed. The Layout bar's ✕ and
     the rail's ✕ Delete were two implementations of the same act: the bar
     dropped the block's formatting, the rail left it behind as an orphan
     keyed to an id nothing rendered any more. Each cleared its own selection
     and not the other's, so deleting from the rail left corner handles on the
     canvas and deleting from the bar left the rail editing a block that was
     gone. And the Delete key meant a third thing — the whole slide — even
     with an item visibly selected and handled.

     A block the layout drew is not deletable here and never was: removing it
     would mean removing the field it renders, which is the rail's job and a
     different act. That asymmetry is the one thing the old paths agreed on,
     so it is what this predicate says. */
  SF.canRemoveBlock = function (slide, key) {
    var id = SF.freeBlockId(key);
    return !!(slide && id && SF.freeBlockById(slide, id));
  };
  SF.removeFreeBlock = function (slide, key) {
    if (!SF.canRemoveBlock(slide, key)) return false;
    var id = SF.freeBlockId(key);
    slide.blocks = SF.freeBlocksOf(slide).filter(function (b) { return String(b.id) !== String(id); });
    if (slide.design && slide.design.regions) delete slide.design.regions[key];
    if (slide.formatting) delete slide.formatting[key];
    return true;
  };

  /* Everything on the canvas can go now, which is what "delete everything"
     has to mean for the slide to end up blank. The two kinds of block go in
     the two ways they can: an item the author added is removed outright,
     because the slide is where it lives; a block the layout drew is hidden,
     because the slide's type is where it lives and the words belong to a
     field the rail still edits.

     One entry point for both, so a caller never has to know which kind it is
     holding — that knowledge is what split deleting into four truths before. */
  SF.canDeleteBlock = function (slide, key) {
    if (!slide || !key) return false;
    if (SF.canRemoveBlock(slide, key)) return true;
    return !SF.freeBlockId(key) && !SF.isBlockHidden(slide, key);
  };
  SF.deleteBlock = function (slide, key) {
    if (!SF.canDeleteBlock(slide, key)) return null;
    if (SF.canRemoveBlock(slide, key)) {
      SF.removeFreeBlock(slide, key);
      return 'item';
    }
    if (!slide.design) slide.design = {};
    if (!Array.isArray(slide.design.hidden)) slide.design.hidden = [];
    slide.design.hidden.push(String(key));
    return 'layout';
  };
  /* The way back. Without it hiding is a trap rather than an edit. */
  SF.restoreBlock = function (slide, key) {
    if (!SF.isBlockHidden(slide, key)) return false;
    slide.design.hidden = SF.hiddenBlocksOf(slide).filter(function (k) { return k !== String(key); });
    if (!slide.design.hidden.length) delete slide.design.hidden;
    return true;
  };
  SF.restoreAllBlocks = function (slide) {
    var n = SF.hiddenBlocksOf(slide).length;
    if (n && slide.design) delete slide.design.hidden;
    return n;
  };

  SF.renderFreeBlocks = function (root, slide) {
    var list = SF.freeBlocksOf(slide).filter(function (b) { return b && b.id; });
    var pictures = ((slide && slide.art && slide.art.pictures) || []).filter(function (p) {
      return p && p.src && p.id && SF.artPlacement(p) === 'lattice';
    });
    if (!list.length && !pictures.length) return 0;
    var host = SF.latticeHost(root);
    if (!host) return 0;
    /* Pictures first, so a block added later stacks under them in document
       order and the first free row a new block finds is below both. */
    pictures.forEach(function (pic) {
      var frame = el('div', 'art-block');
      frame.setAttribute('data-block-key', SF.artBlockKey(pic.id));
      frame.dataset.artPic = String(pic.id);
      var img = el('img', 'art-block-img');
      img.src = SF.safeMedia(pic.src);
      img.alt = String(pic.alt || '');
      img.draggable = false;
      /* Fill or fit, because a cell range and an aspect ratio rarely agree and
         the author has to be able to say which one gives. */
      img.style.objectFit = pic.fit === 'contain' ? 'contain' : 'cover';
      if (pic.hidden) frame.style.display = 'none';
      frame.appendChild(img);
      host.appendChild(frame);
    });
    list.forEach(function (block) {
      var spec = FREE_KINDS[block.kind] || FREE_KINDS.text;
      var key = SF.freeBlockKey(block.id);
      /* An item that took one of the layout's named slots is drawn with that
         slot's own element, so the theme styles it the way it styles the slot.
         Both rules that size a real title are on the tag — `.slide h2` at 52px
         and then `.theme-studio h2` at 55 — so an h3 carrying a class could
         never match either, and the size had to be written down a second time
         in lattice.css to approximate them. A frozen corpus average is the
         wrong answer for a value each theme sets: it came out 52 where the
         studio theme's own title is 55, and would be wrong differently for
         every other theme. Being the element gets all of it for free,
         including the family, the weight and the colour. */
      /* A composition renames the band it draws the subtitle in — the same
         content key comes out as .cp-eyebrow rather than .sub, and is styled
         quite differently for it: 18px bold reversed against the poster,
         where an uncomposed subtitle is 27px regular and dim. So the class
         follows the slide, not just the slot name. */
      var composed = !!(root.getAttribute && root.getAttribute('data-composition')) ||
        !!root.querySelector('[data-composition]');
      var AS_TAG = { title: ['h2', ''], subtitle: ['div', composed ? 'cp-eyebrow' : 'sub'] };
      var asSlot = block.as && AS_TAG[block.as];
      var size = block.size || spec.size;
      var node = asSlot
        ? el(asSlot[0], 'free-block ' + spec.cls + (asSlot[1] ? ' ' + asSlot[1] : ''))
        : el(spec.tag, 'free-block ' + spec.cls + (size ? ' free-size-' + size : ''));
      node.dataset.contentKey = key;
      if (block.as) node.dataset.as = String(block.as);
      node.dataset.freeBlock = String(block.id);
      /* Empty is a real state: a block is added before it is written into, and
         a zero-height box cannot be clicked to write into it. */
      var text = String(block.text == null ? '' : block.text);
      if (!text.trim()) node.dataset.placeholder = spec.label;
      /* A drawing kind renders its text as something other than prose. The
         attribute is for CSS — css/lattice.css uses it to make the block fill
         the cell it was given rather than size to its own content. It used to
         claim to be how a drawing kind "takes itself out of the text-editing
         path", which it never was: nothing read it for that, and what
         actually excluded a chart was inlineEditable's round-trip comparison
         failing. The kind's `edits` says so now, and says it on purpose. */
      if (spec.draw) {
        node.dataset.blockKind = block.kind;
        if (text.trim()) spec.draw(node, text, block);
        host.appendChild(node);
        return;
      }
      /* The text first, then the marks. SF.Custom.paint only decorates — it
         returns without touching the node when a block carries no formatting —
         which is why rich() sets the text before calling it, and why calling
         paint alone rendered every free block empty. */
      node.textContent = text;
      if (SF.Custom) SF.Custom.paint(node, slide, key, text);
      host.appendChild(node);
    });
    return list.length + pictures.length;
  };

  /* ------------------------------------------------------------- push-down
     Make a block taller and the blocks under it move down, instead of landing
     on top of each other. Engine 3's rule, carried over: each gap travels with
     the block below it, so the sum of spans and gaps is unchanged and a resize
     cannot quietly move the row budget. Over the sixteenth row is allowed and
     reported, never refused — the line detector was adopted precisely so that
     overflowing is a number rather than a veto.

     Only the blocks sharing columns with the one that changed. A block beside
     it, in the other half of a split, is not below it and must not move.

     Deliberately not called from paint. A region's `rows` is the author's
     tariff and the empty lines under a heading are composition rather than
     slack, so typing a longer heading reports an overflow and waits: the
     Layout face says "needs 6 lines, has 2", and Fit to text is one click. An
     automatic regrow would rearrange a slide while its author was still
     typing into it. */
  SF.regionColumnGroup = function (regions, key) {
    var subject = regions && regions[key];
    if (!subject) return [];
    var lo = subject.col, hi = subject.col + subject.cols - 1;
    return Object.keys(regions).filter(function (k) {
      var r = regions[k];
      return r && r.col <= hi && lo <= r.col + r.cols - 1;
    }).map(function (k) {
      return { key: k, region: regions[k] };
    }).sort(function (a, b) {
      return a.region.row - b.region.row || (a.key < b.key ? -1 : 1);
    });
  };

  /* Restack `key`'s column group around whatever `key` now spans. Returns what
     it cost, so a caller can say "18 of 16 rows" rather than only redrawing. */
  SF.restackRegions = function (regions, key, rows) {
    var group = SF.regionColumnGroup(regions, key);
    if (!group.length) return null;
    /* Read the gaps before changing anything: a gap is the distance from where
       the previous block ended to where this one starts, and it belongs to the
       block below it. */
    var cursor = 1;
    group.forEach(function (entry) {
      entry.gap = Math.max(0, entry.region.row - cursor);
      cursor = entry.region.row + entry.region.rows;
    });
    if (rows != null) regions[key].rows = Math.max(1, Math.round(rows));
    /* An anchored block answers to its anchor, not to the stack: moving it
       would contradict the choice the author already made about where it sits. */
    var row = 1;
    group.forEach(function (entry) {
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
      used: used,
      budget: LATTICE.rows,
      over: Math.max(0, used - LATTICE.rows),
      moved: group.filter(function (e) { return !e.region.anchorY; }).length
    };
  };

  /* --------------------------------------------------------- what is on top
     Which of two nodes paints over the other, by the CSS painting order rather
     than by a guess. Needed because the answer is not uniform: .slide-art is
     z-index 2 and paints over content everywhere, while .theme-art is
     z-index auto and lands above a content slide's static .pad but below a
     section slide's, which carries z-index 1. Assuming either way is how a
     slide gets called sound while its heading is under a photograph.

     Compared at the two ancestors that are siblings, which is where the
     painting order is actually decided. Bands follow CSS 2.1 appendix E: a
     negative z-index below in-flow content, in-flow content below positioned
     auto/0, and positive z-index above all of it. Document order breaks a tie.
     Correct for the slide's own layers, which are siblings in one stacking
     context; a caller that nests new stacking contexts between them would need
     more than this. */
  function paintBand(node) {
    var cs = getComputedStyle(node);
    if (cs.position === 'static') return [2, 0];
    var z = cs.zIndex === 'auto' ? null : Number(cs.zIndex);
    if (z == null || z === 0 || !Number.isFinite(z)) return [3, 0];
    return z < 0 ? [1, z] : [4, z];
  }

  /* Does this box confine its descendants' z-index, or do they compete in the
     context above it? Only the properties this app actually uses on a slide
     are listed; the list is the reason a theme layer is transparent to the
     ordering and a picture layer is not. */
  function isStackingContext(node) {
    var cs = getComputedStyle(node);
    if (cs.position === 'fixed' || cs.position === 'sticky') return true;
    if (cs.position !== 'static' && cs.zIndex !== 'auto') return true;
    if (parseFloat(cs.opacity) < 1) return true;
    if (cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none') return true;
    if (cs.isolation === 'isolate' || cs.mixBlendMode !== 'normal') return true;
    if (/paint|layout|strict|content/.test(cs.contain || '')) return true;
    return /transform|opacity|filter/.test(cs.willChange || '');
  }

  /* Which box's z-index actually decides where `node` paints inside the
     context it shares with something else: the outermost ancestor below `stop`
     that establishes a stacking context, or the node itself when none does.
     That second case is the whole mechanism behind bringing one theme shape
     forward. .theme-art is position:absolute with z-index:auto, so it is not a
     stacking context and its children's z-index competes directly with the
     slide's other layers — which is how one shape can rise past a picture
     while its siblings stay where the theme put them. Comparing the layers
     instead said a fronted shape was still behind the picture, which is the
     answer this function gave before it understood that. */
  function orderDecider(node, stop) {
    var decider = node;
    for (var n = node.parentElement; n && n !== stop; n = n.parentElement) {
      if (isStackingContext(n)) decider = n;
    }
    return decider;
  }

  SF.paintsAbove = function (a, b) {
    if (!a || !b || a === b) return false;
    /* An ancestor paints under its own descendant, never over it. */
    if (a.contains(b)) return false;
    if (b.contains(a)) return true;
    var up = function (n) { var out = []; for (; n; n = n.parentElement) out.unshift(n); return out; };
    var ca = up(a), cb = up(b), i = 0;
    while (i < ca.length && i < cb.length && ca[i] === cb[i]) i++;
    var lca = ca[i - 1];
    if (!lca) return false;
    var ba = paintBand(orderDecider(a, lca)), bb = paintBand(orderDecider(b, lca));
    if (ba[0] !== bb[0]) return ba[0] > bb[0];
    if (ba[1] !== bb[1]) return ba[1] > bb[1];
    /* Same band and same z-index: document order of the two branches under
       their common ancestor. */
    var sibs = Array.prototype.slice.call(lca.children);
    return sibs.indexOf(ca[i]) > sibs.indexOf(cb[i]);
  };

  /* Artwork solid enough to hide what is behind it. A theme mark at 13% opacity
     is decoration the words read straight through; a photograph at full opacity
     is not. Drawn-but-transparent is the common case in these themes, so the
     threshold is what keeps the measure from crying wolf on every section
     slide the library already ships. */
  var OPAQUE = 0.85;
  SF.occludingArt = function (root) {
    if (!root) return [];
    return Array.prototype.filter.call(
      root.querySelectorAll('.slide-art-img, .theme-art > *'),
      function (n) {
        var cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        var o = parseFloat(cs.opacity);
        return !(Number.isFinite(o) && o < OPAQUE);
      });
  };

  /* How much of each text block the artwork above it covers, as a fraction of
     that block's own painted area. Measured on the text's client rects rather
     than its element box, because a heading's box is usually wider than the
     words in it and a rule over the empty half is not a problem.

     Nothing in the app measured this before: every check asks whether content
     fits its space, none asked whether something is on top of it. A slide whose
     heading is entirely under a placed picture passed the deck review, the fit
     check and the lattice, and looked fine to all three. */
  SF.artOcclusion = function (root, opts) {
    var out = [];
    if (!root) return out;
    var art = SF.occludingArt(root).map(function (n) {
      return { node: n, rect: n.getBoundingClientRect() };
    }).filter(function (a) { return a.rect.width > 2 && a.rect.height > 2; });
    if (!art.length) return out;
    var floor = (opts && opts.floor) || 0.15;
    var pad = root.querySelector('.pad') || root;
    Array.prototype.forEach.call(pad.querySelectorAll('[data-content-key]'), function (block) {
      var said = (block.textContent || '').trim();
      if (!said) return;
      var runs = [];
      var walk = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      var t;
      while ((t = walk.nextNode())) {
        if (!(t.textContent || '').trim()) continue;
        var range = document.createRange();
        range.selectNodeContents(t);
        Array.prototype.forEach.call(range.getClientRects(), function (r) {
          if (r.width > 1 && r.height > 1) runs.push(r);
        });
      }
      if (!runs.length) return;
      /* Only the art that is actually on top of this block, asked once rather
         than once per text run. */
      var above = art.filter(function (a) { return SF.paintsAbove(a.node, block); });
      if (!above.length) return;
      var area = 0, hidden = 0;
      /* Collected rather than assigned through the closure: a name mutated
         inside a callback is not narrowed by the checker afterwards, and the
         `by ? ... : ...` below became unreachable to it. */
      var blamed = [];
      runs.forEach(function (r) {
        area += r.width * r.height;
        /* The worst single overlap rather than their union: art rects on one
           slide rarely overlap each other, and an overcount would only make
           this louder, which is the wrong direction for a number that will
           stop an author. */
        var worst = 0, name = '';
        above.forEach(function (a) {
          var w = Math.min(a.rect.right, r.right) - Math.max(a.rect.left, r.left);
          var h = Math.min(a.rect.bottom, r.bottom) - Math.max(a.rect.top, r.top);
          if (w <= 0 || h <= 0 || w * h <= worst) return;
          worst = w * h;
          name = a.node.getAttribute('data-art-key') || a.node.getAttribute('data-art-pic') || 'artwork';
        });
        hidden += worst;
        if (name) blamed.push(name);
      });
      if (!area || hidden / area < floor) return;
      out.push({
        key: block.getAttribute('data-content-key'),
        text: said.slice(0, 100),
        pct: Math.round((hidden / area) * 1000) / 10,
        by: blamed[0] || 'artwork'
      });
    });
    return out;
  };

  /* ------------------------------------------------------- does it fit?
     Counted in lines, not boxes. A slot measures its element box, but a display
     face paints an inline box half a leading taller, and the app's escapes()
     reads a bottom overhang as an overflow while ignoring an identical one at
     the top — so the same block passed or failed on where it happened to sit.
     Lines count the block, not its leading.

     A region's `rows` is its tariff: the lines the author gave it. The tariff
     does not grow from paint, because the empty lines under a heading are
     composition rather than slack. Overflowing is allowed and reported, never
     refused. Same rule and the same arithmetic as Engine 3, published here so
     the two cannot answer the question differently. */
  SF.linesFor = function (px) {
    var tol = SF.FIT_TOLERANCE == null ? 1 : SF.FIT_TOLERANCE;
    return Math.max(1, Math.ceil((px - tol) / LATTICE.stepY));
  };

  /* Null for a block that spends no lines: out of flow is out of the count. */
  SF.linesNeeded = function (slot) {
    var node = slot.firstElementChild;
    if (!node) return null;
    var pos = getComputedStyle(node).position;
    if (pos === 'absolute' || pos === 'fixed') return null;
    return SF.linesFor(node.scrollHeight);
  };

  /* Measures every slot against the lines its region gave it. Marks the verdict
     on the slot so CSS and tests can both read it, and returns the rows so a
     caller can say which block wants what. */
  SF.latticeFit = function (root) {
    var out = [];
    if (!root) return out;
    root.querySelectorAll('.sf-slot').forEach(function (slot) {
      var parts = (slot.getAttribute('data-region') || '').split(',');
      var have = Number(parts[2]) || Math.max(1, Math.round(slot.clientHeight / LATTICE.stepY));
      var need = SF.linesNeeded(slot);
      if (need != null && root.classList.contains('sf-hf-managed')) {
        need = Math.max(1, Math.ceil((slot.firstElementChild.scrollHeight - 1) / SF.latticeGeometry(root).stepY));
      }
      /* Sideways is not a line question, and nothing else catches it. Measured
         on the content, never on the slot: the arranging face hangs a label off
         the slot in an ::after, and an absolutely positioned pseudo-element
         still counts toward scrollWidth — "accent-bar · 1r x 1c" is 198px of
         text, which reported a 66px rule in a 65px column as three columns of
         overflow. */
      var node = slot.firstElementChild;
      var wide = need != null && !!node && node.scrollWidth > slot.clientWidth + 1;
      var over = need != null && (need > have || wide);
      slot.setAttribute('data-fit', over ? 'over' : 'ok');
      if (need != null) slot.setAttribute('data-need', String(need));
      out.push({
        key: slot.getAttribute('data-block-key'),
        need: need, have: have, wide: wide, over: over
      });
    });
    return out;
  };
}
