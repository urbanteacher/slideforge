/* Every chart the renderer can draw, bundled through the existing model entry
 * point. Moved out of js/render.js, where it was 1,453 of 7,215 lines and the
 * largest thing in that file with nothing to do with laying out a slide.
 *
 * A chart is a pure (data, slide) -> SVG function. Thirty-one names live here
 * and four leave: the DOM helper, the key and table a chart slide draws beside
 * its figure, and the dispatcher. The other twenty-seven were never used
 * outside and are now genuinely private.
 *
 * `el` is injected rather than imported because it is the browser renderer's
 * DOM helper and stays there; this follows createCompositionRenderer.
 * Everything else these need is model code, reached through the SF handed in.
 *
 * See docs/render-split.md — this is step 1 of six.
 */
export function createChartRenderer(SF, helpers) {
  const {el} = helpers;

  /* Bar, line and pie, drawn as SVG from the same tabular text a table slide
     uses. No chart library: the app is opened from disk as often as served,
     and a dependency would have to be vendored anyway.
   *
   * Colour comes from --chart-1..6, a six-slot categorical palette derived
   * from the university's hues and validated for colour-vision deficiency —
   * see css/app.css. Slots are assigned in fixed order and never cycled; a
   * seventh series is a data problem, not a palette problem.
   */
  var CHART = { w: 1180, h: 430, padL: 92, padR: 40, padT: 22, padB: 62 };

  function chartColor(i) { return 'var(--chart-' + ((i % 6) + 1) + ')'; }

  function svgEl(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    return n;
  }

  /* Round an axis maximum up to something a reader can do arithmetic with. */
  function niceMax(v) {
    if (!(v > 0)) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var step = [1, 2, 2.5, 5, 10].filter(function (s) { return s * mag >= v; })[0] || 10;
    return step * mag;
  }

  /* A range that hugs the data instead of climbing to the next round
     number. niceMax alone turns a spread of 22–61 into an axis of 0–100 and
     squashes every box into the lower half — which is the axis working
     against the one thing a box plot is for. Pads by a tenth of the spread,
     then rounds each end to a readable step. Zero is kept when the data is
     already near it, because a distribution that reaches the floor should
     be seen to. */
  function niceStep(rough) {
    if (!(rough > 0)) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(rough)));
    return ([1, 2, 2.5, 5, 10].filter(function (m) { return m * mag >= rough; })[0] || 10) * mag;
  }

  function niceRange(lo, hi) {
    if (!(hi > lo)) return { lo: Math.min(0, lo), hi: (hi || 0) + 1 };
    var span = hi - lo, pad = span * 0.1;
    /* Sized from the gap between ticks rather than from the magnitude of
       the span: rounding 0–100 to the next whole hundred-and-fifty is how a
       chart ends up with half its height empty. */
    var step = niceStep(span / 4);
    var top = Math.ceil((hi + pad) / step) * step;
    /* No forced zero. That rule belongs to bars, where length encodes the
       quantity and a cropped baseline exaggerates every difference. A box
       plot and a scatter encode value as position, where insisting on zero
       just pushes the data into a corner — ages of 22 to 61 do not become
       more honest for having forty empty units under them. Zero is still
       used when the data nearly reaches it, because a distribution that
       touches the floor should be seen to. */
    var bottom = lo >= 0 && lo <= span * 0.15 ? 0 : Math.floor(lo / step) * step;
    return { lo: bottom, hi: top };
  }

  function axisTicks(max) {
    var out = [], n = 4;
    for (var i = 0; i <= n; i++) out.push(max * i / n);
    return out;
  }

  function fmt(v) {
    if (v == null) return '';
    var a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e4) return (v / 1e3).toFixed(0) + 'k';
    return String(Math.round(v * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* Legend + a table of the same numbers. The legend is the dependable
     identity channel for two or more series; the table is what makes the
     values available to a screen reader, and to anyone who cannot separate
     two hues at all.

     Whether the legend belongs is decided by chartUsesSeriesLegend — not by
     an exclusion list that every new idiom had to remember to join. */
  function chartKey(data, slide) {
    var wrap = el('div', 'chart-key');
    if (!SF.chartUsesSeriesLegend || !SF.chartUsesSeriesLegend(slide && slide.chartKind, data.series.length)) {
      return wrap;
    }
    data.series.forEach(function (s, i) {
      var item = el('span', 'ck-item');
      var dot = el('i', 'ck-dot');
      dot.style.background = chartColor(i);
      item.appendChild(dot);
      item.appendChild(el('span', null, s.name));
      wrap.appendChild(item);
    });
    return wrap;
  }

  function chartTable(data, slide) {
    /* A Sankey's paste is from/to/amount — dumping chartData series would
       read the column headers as if they were comparable series. */
    if (slide && slide.chartKind === 'sankey' && SF.chartFlows) {
      var flows = SF.chartFlows(slide);
      var ft = el('table', 'chart-data-table');
      var fh = el('tr');
      ['From', 'To', 'Amount'].forEach(function (h) { fh.appendChild(el('th', null, h)); });
      ft.appendChild(fh);
      flows.links.forEach(function (l) {
        var tr = el('tr');
        tr.appendChild(el('td', null, l.from));
        tr.appendChild(el('td', null, l.to));
        tr.appendChild(el('td', null, fmt(l.value)));
        ft.appendChild(tr);
      });
      return ft;
    }
    var t = el('table', 'chart-data-table');
    var head = el('tr');
    head.appendChild(el('th', null, ''));
    data.series.forEach(function (s) { head.appendChild(el('th', null, s.name)); });
    t.appendChild(head);
    data.categories.forEach(function (c, r) {
      var tr = el('tr');
      tr.appendChild(el('th', null, c));
      data.series.forEach(function (s) { tr.appendChild(el('td', null, fmt(s.values[r]))); });
      t.appendChild(tr);
    });
    return t;
  }

  function barChart(data, slide, stepOf) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    var all = [];
    data.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var max = niceMax(Math.max.apply(null, all.concat([0])));

    axisTicks(max).forEach(function (t) {
      var y = P.padT + plotH - (t / max) * plotH;
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var band = plotW / Math.max(1, data.categories.length);
    var n = data.series.length;
    /* One <g class="step"> per beat, with the bars inside it. The reveal
       driver steps whole elements, so marking each bar individually would
       release them one at a time — a press has to land a whole series (or,
       with a single series, a whole category) for the comparison to hold. */
    var groups = [];
    var beats = n > 1 ? n : data.categories.length;
    for (var b = 0; b < beats; b++) {
      var gg = svgEl('g', { class: 'ch-beat', 'data-step': b });
      groups.push(gg);
      svg.appendChild(gg);
    }
    var beatFor = function (si, ci) { return groups[n > 1 ? si : ci]; };
    /* Never fill the band — the leftover is the air that separates one
       category from the next. Wider than a dashboard's 24px cap because this
       is a 1280px slide thrown at a lecture-theatre wall, not a card. */
    var groupW = Math.min(band * 0.62, 78 * n);
    var barW = Math.max(6, (groupW - (n - 1) * 2) / n);

    data.categories.forEach(function (cat, ci) {
      var x0 = P.padL + band * ci + (band - groupW) / 2;
      data.series.forEach(function (s, si) {
        var v = s.values[ci];
        if (v == null) return;
        var hgt = Math.max(0, (v / max) * plotH);
        var x = x0 + si * (barW + 2);
        var y = P.padT + plotH - hgt;
        var g = svgEl('g', { class: 'ch-bar' });
        /* 4px rounded at the data end, square at the baseline. */
        var r = Math.min(4, barW / 2);
        var d = 'M' + x + ' ' + (y + hgt) + ' V' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
                ' H' + (x + barW - r) + ' Q' + (x + barW) + ' ' + y + ' ' + (x + barW) + ' ' + (y + r) +
                ' V' + (y + hgt) + ' Z';
        var path = svgEl('path', { d: d, fill: chartColor(si) });
        g.appendChild(path);
        g.setAttribute('data-series', String(si));
        if (n === 1) {
          var val = svgEl('text', { x: x + barW / 2, y: y - 12, class: 'ch-value', 'text-anchor': 'middle' });
          val.textContent = fmt(v);
          g.appendChild(val);
        }
        beatFor(si, ci).appendChild(g);
      });
      var cl = svgEl('text', { x: P.padL + band * ci + band / 2, y: H - P.padB + 30, class: 'ch-cat', 'text-anchor': 'middle' });
      cl.textContent = cat;
      svg.appendChild(cl);
    });

    svg.appendChild(svgEl('line', { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* Stacked bars. The axis is the total rather than the tallest single
     value, which is the whole point of the idiom: it answers "how big
     altogether, and of what" where grouped bars answer "which is bigger".
     One beat per series, so a build lays the composition down a layer at a
     time — the order the argument is usually made in. */
  function stackedBar(data, slide, stepOf) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    var totals = data.categories.map(function (_, ci) {
      return data.series.reduce(function (sum, s) {
        var v = s.values[ci];
        return sum + (v == null ? 0 : Math.max(0, v));
      }, 0);
    });
    var max = niceMax(Math.max.apply(null, totals.concat([0])));

    axisTicks(max).forEach(function (t) {
      var y = P.padT + plotH - (t / max) * plotH;
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var band = plotW / Math.max(1, data.categories.length);
    var barW = Math.min(band * 0.62, 120);
    var groups = data.series.map(function (_, si) {
      var gg = svgEl('g', { class: 'ch-beat', 'data-step': si });
      svg.appendChild(gg);
      return gg;
    });

    data.categories.forEach(function (cat, ci) {
      var x = P.padL + band * ci + (band - barW) / 2;
      var run = 0;
      data.series.forEach(function (sr, si) {
        var v = sr.values[ci];
        if (v == null || v <= 0) return;
        var hgt = (v / max) * plotH;
        var y = P.padT + plotH - (run + hgt) / 1 * 1 - 0;
        y = P.padT + plotH - ((run + v) / max) * plotH;
        var g = svgEl('g', { class: 'ch-bar' });
        g.setAttribute('data-series', String(si));
        g.appendChild(svgEl('rect', { x: x, y: y, width: barW, height: Math.max(0, hgt), fill: chartColor(si) }));
        /* Only where the band is deep enough to hold it; a number printed
           over a 6px sliver is unreadable and looks like a mistake. */
        if (hgt > 26) {
          var val = svgEl('text', { x: x + barW / 2, y: y + hgt / 2 + 6, class: 'ch-value ch-on-fill', 'text-anchor': 'middle' });
          val.textContent = fmt(v);
          g.appendChild(val);
        }
        groups[si].appendChild(g);
        run += v;
      });
      var cl = svgEl('text', { x: P.padL + band * ci + band / 2, y: H - P.padB + 30, class: 'ch-cat', 'text-anchor': 'middle' });
      cl.textContent = cat;
      svg.appendChild(cl);
    });

    svg.appendChild(svgEl('line', { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* Bars along the x axis. The reason to reach for it is category names:
     "Development", "Graphics", "Training" laid sideways under vertical bars
     either overlap or get turned on their side, and a reader should not have
     to tilt their head in a lecture theatre. */
  function horizontalBar(data, slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    /* Room on the left is taken from the longest label rather than fixed,
       for the same reason the line chart sizes its right margin that way. */
    var longest = data.categories.reduce(function (n2, c) { return Math.max(n2, String(c).length); }, 0);
    var padL = Math.min(320, 40 + longest * 10);
    var plotW = W - padL - P.padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    var all = [];
    data.series.forEach(function (sr) { sr.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var max = niceMax(Math.max.apply(null, all.concat([0])));

    axisTicks(max).forEach(function (t) {
      var x = padL + (t / max) * plotW;
      svg.appendChild(svgEl('line', { x1: x, y1: P.padT, x2: x, y2: P.padT + plotH, class: 'ch-grid' }));
      var lab = svgEl('text', { x: x, y: P.padT + plotH + 28, class: 'ch-tick', 'text-anchor': 'middle' });
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
      var gg = svgEl('g', { class: 'ch-beat', 'data-step': b });
      groups.push(gg);
      svg.appendChild(gg);
    }

    data.categories.forEach(function (cat, ci) {
      var y0 = P.padT + band * ci + (band - groupH) / 2;
      data.series.forEach(function (sr, si) {
        var v = sr.values[ci];
        if (v == null) return;
        var wdt = Math.max(0, (v / max) * plotW);
        var y = y0 + si * (barH + 2);
        var g = svgEl('g', { class: 'ch-bar' });
        g.setAttribute('data-series', String(si));
        g.appendChild(svgEl('rect', { x: padL, y: y, width: wdt, height: barH, rx: Math.min(4, barH / 2), fill: chartColor(si) }));
        if (n === 1) {
          var val = svgEl('text', { x: padL + wdt + 10, y: y + barH / 2 + 6, class: 'ch-value' });
          val.textContent = fmt(v);
          g.appendChild(val);
        }
        groups[n > 1 ? si : ci].appendChild(g);
      });
      var cl = svgEl('text', { x: padL - 14, y: P.padT + band * ci + band / 2 + 6, class: 'ch-cat', 'text-anchor': 'end' });
      cl.textContent = cat;
      svg.appendChild(cl);
    });

    svg.appendChild(svgEl('line', { x1: padL, y1: P.padT, x2: padL, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* Position against two common scales — the encoding at the top of the
     effectiveness ranking, and the only one here that answers "do these two
     things move together". Everything above this point in the file compares
     magnitudes; this is the first that shows a relationship. */
  function scatterChart(slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var d = SF.chartPoints(slide);
    var padL = P.padL, plotW = W - padL - P.padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var xs = [], ys = [];
    d.series.forEach(function (sr) { sr.points.forEach(function (pt) { xs.push(pt.x); ys.push(pt.y); }); });
    if (!xs.length) return svg;
    /* Both axes start at zero unless the data does not go near it. A
       scatter is read for its shape, and a truncated axis makes a weak
       relationship look like a strong one — the exact failure the lecture
       spends a slide on. */
    var xr = niceRange(Math.min.apply(null, xs), Math.max.apply(null, xs));
    var yr = niceRange(Math.min.apply(null, ys), Math.max.apply(null, ys));
    var x0 = xr.lo, xMax = xr.hi, y0 = yr.lo, yMax = yr.hi;
    var xAt = function (v) { return padL + ((v - x0) / (xMax - x0 || 1)) * plotW; };
    var yAt = function (v) { return P.padT + plotH - ((v - y0) / (yMax - y0 || 1)) * plotH; };

    axisTicks(yMax - y0).forEach(function (t) {
      var y = yAt(y0 + t);
      svg.appendChild(svgEl('line', { x1: padL, y1: y, x2: padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(y0 + t);
      svg.appendChild(lab);
    });
    axisTicks(xMax - x0).forEach(function (t) {
      var x = xAt(x0 + t);
      var lab = svgEl('text', { x: x, y: H - P.padB + 30, class: 'ch-tick', 'text-anchor': 'middle' });
      lab.textContent = fmt(x0 + t);
      svg.appendChild(lab);
    });

    /* Labels are nudged up until they clear the ones already placed, and a
       leader line keeps each one attached to its dot. Taken from the
       tube-line scatter in the pollution explorer, where the whole point is
       naming which line is the outlier rather than noting that one exists.

       Greedy and in drawing order rather than an optimiser: a lecturer wants
       the same arrangement every time they open the slide, and a solver that
       finds a prettier answer on the second run is worse than a plain rule
       that never moves. */
    var placed = [];
    d.series.forEach(function (sr, si) {
      var g = svgEl('g', { class: 'ch-line ch-points', 'data-step': si, 'data-series': String(si) });
      sr.points.forEach(function (pt) {
        var cx = xAt(pt.x), cy = yAt(pt.y), r = 9;
        var dot = svgEl('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: r, fill: chartColor(si), class: 'ch-point' });
        if (pt.label) {
          var tip = svgEl('title', {});
          tip.textContent = pt.label + ' · ' + d.xLabel + ' ' + fmt(pt.x) + ' · ' + fmt(pt.y);
          dot.appendChild(tip);
        }
        g.appendChild(dot);
        if (!pt.label) return;
        var wide = pt.label.length * 7.4;
        var ly = cy - r - 9;
        var guard = 0;
        while (guard++ < 24 && placed.some(function (q) {
          return Math.abs(q.y - ly) < 16 && Math.abs(q.x - cx) < (q.w + wide) / 2 + 6;
        })) ly -= 17;
        placed.push({ x: cx, y: ly, w: wide });
        /* Only drawn once the label has actually moved: a leader from a dot
           to the text directly above it is a line nobody needs. */
        if (cy - r - ly > 13) {
          g.appendChild(svgEl('line', { x1: cx, y1: cy - r, x2: cx, y2: ly + 4, class: 'ch-leader' }));
        }
        var lab = svgEl('text', { x: cx.toFixed(1), y: ly.toFixed(1), class: 'ch-point-label', 'text-anchor': 'middle' });
        lab.textContent = pt.label;
        g.appendChild(lab);
      });
      svg.appendChild(g);
    });

    if (d.xLabel) {
      var xl = svgEl('text', { x: padL + plotW / 2, y: H - 6, class: 'ch-axis-label', 'text-anchor': 'middle' });
      xl.textContent = d.xLabel;
      svg.appendChild(xl);
    }
    svg.appendChild(svgEl('line', { x1: padL, y1: P.padT + plotH, x2: padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    svg.appendChild(svgEl('line', { x1: padL, y1: P.padT, x2: padL, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* One variable's shape. Bars touching, because the x axis is continuous
     and a gap between them would say these are separate categories. */
  function histogramChart(slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var vals = SF.chartValues(slide);
    var bins = SF.histogramBins(vals);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (!bins.length) return svg;
    var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
    var max = niceMax(Math.max.apply(null, bins.map(function (b) { return b.count; })));

    axisTicks(max).forEach(function (t) {
      var y = P.padT + plotH - (t / max) * plotH;
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var bw = plotW / bins.length;
    var g = svgEl('g', { class: 'ch-beat', 'data-step': 0, 'data-series': '0' });
    bins.forEach(function (b, i) {
      var hgt = (b.count / max) * plotH;
      g.appendChild(svgEl('rect', { x: P.padL + i * bw, y: P.padT + plotH - hgt,
        width: Math.max(1, bw - 1), height: Math.max(0, hgt), fill: chartColor(0), class: 'ch-bin' }));
      if (i === 0 || i === bins.length - 1 || i % 2 === 0) {
        var lab = svgEl('text', { x: P.padL + i * bw, y: H - P.padB + 30, class: 'ch-tick', 'text-anchor': 'middle' });
        lab.textContent = fmt(Math.round(b.from * 10) / 10);
        svg.appendChild(lab);
      }
    });
    svg.appendChild(g);
    var n = svgEl('text', { x: P.padL + plotW, y: P.padT - 12, class: 'ch-tick', 'text-anchor': 'end' });
    n.textContent = vals.length + ' values · ' + bins.length + ' bins';
    svg.appendChild(n);
    svg.appendChild(svgEl('line', { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* The five-number summary, drawn. What a bar chart of means hides and
     what the lecture spends a slide asking for: spread, skew and the points
     that sit outside the fence. */
  function boxChart(slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var groups = SF.chartGroups(slide);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (!groups.length) return svg;
    var summaries = groups.map(function (g) { return SF.fiveNumber(g.values); });
    var all = [];
    groups.forEach(function (g) { g.values.forEach(function (v) { all.push(v); }); });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var rng = niceRange(lo, hi);
    var base = rng.lo, top = rng.hi;
    var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
    var yAt = function (v) { return P.padT + plotH - ((v - base) / (top - base || 1)) * plotH; };

    axisTicks(top - base).forEach(function (t) {
      var y = yAt(base + t);
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(base + t);
      svg.appendChild(lab);
    });

    var band = plotW / groups.length;
    var bw = Math.min(band * 0.5, 130);
    groups.forEach(function (grp, i) {
      var f = summaries[i];
      var cx = P.padL + band * i + band / 2, x = cx - bw / 2;
      var g = svgEl('g', { class: 'ch-beat ch-box', 'data-step': i, 'data-series': String(i) });
      var col = chartColor(i);
      /* Whisker, then box, then median: the median line has to sit above
         the fill or it disappears into it. */
      g.appendChild(svgEl('line', { x1: cx, y1: yAt(f.min), x2: cx, y2: yAt(f.max), class: 'ch-whisker', stroke: col }));
      g.appendChild(svgEl('line', { x1: cx - bw / 4, y1: yAt(f.min), x2: cx + bw / 4, y2: yAt(f.min), class: 'ch-whisker', stroke: col }));
      g.appendChild(svgEl('line', { x1: cx - bw / 4, y1: yAt(f.max), x2: cx + bw / 4, y2: yAt(f.max), class: 'ch-whisker', stroke: col }));
      g.appendChild(svgEl('rect', { x: x, y: yAt(f.q3), width: bw, height: Math.max(1, yAt(f.q1) - yAt(f.q3)),
        fill: col, opacity: 0.32, stroke: col, 'stroke-width': 2, rx: 3 }));
      g.appendChild(svgEl('line', { x1: x, y1: yAt(f.median), x2: x + bw, y2: yAt(f.median), class: 'ch-median', stroke: col }));
      f.outliers.forEach(function (v) {
        g.appendChild(svgEl('circle', { cx: cx, cy: yAt(v), r: 5, class: 'ch-outlier', stroke: col }));
      });
      svg.appendChild(g);
      var cl = svgEl('text', { x: cx, y: H - P.padB + 30, class: 'ch-cat', 'text-anchor': 'middle' });
      cl.textContent = grp.name + ' · n=' + f.n;
      svg.appendChild(cl);
    });
    svg.appendChild(svgEl('line', { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* An ISOTYPE chart: a row of repeated icons, where the count of icons is
     the quantity. Not decoration — the point of the form is that the reader
     counts rather than measures against an axis, which is why Neurath built
     it for audiences who could not be assumed to read charts at all.

     It survives the projector badly if the icon is fussy, and it lies if
     the icon is scaled instead of repeated, so this repeats and never
     scales. A half unit is drawn as a clipped icon rather than a small one,
     for the same reason.

     One icon is worth chartUnit, shown in the key. Without that a row of
     forty icons is unreadable and a row of two says nothing. */
  function pictogramChart(data, slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg ch-picto', role: 'img' });
    var icon = String(slide.chartIcon || '').trim() || '●';
    var vals = (data.series[0] ? data.series[0].values : []).map(function (v) { return v == null ? 0 : Math.max(0, v); });
    if (!vals.length) return svg;
    var max = Math.max.apply(null, vals);
    /* Pick a unit that keeps the longest row inside about twenty icons
       unless the author has set one: past that nobody counts, they
       estimate, and an estimate off a row of dots is worse than a bar. */
    var unit = Number(slide.chartUnit) > 1 ? Number(slide.chartUnit)
      : Math.max(1, Math.pow(10, Math.max(0, Math.ceil(Math.log10(Math.max(1, max / 20))))));
    var labelRoom = Math.min(300, 40 + data.categories.reduce(function (n, c) {
      return Math.max(n, String(c).length); }, 0) * 10);
    var rowH = Math.min(78, (H - P.padT - P.padB) / Math.max(1, data.categories.length));
    var size = Math.min(rowH * 0.74, 46);

    data.categories.forEach(function (cat, ci) {
      var y = P.padT + rowH * ci + rowH / 2;
      var lab = svgEl('text', { x: labelRoom - 16, y: y + 7, class: 'ch-cat', 'text-anchor': 'end' });
      lab.textContent = cat;
      svg.appendChild(lab);
      var g = svgEl('g', { class: 'ch-beat', 'data-step': ci, 'data-series': '0' });
      var whole = Math.floor(vals[ci] / unit);
      var part = (vals[ci] % unit) / unit;
      for (var i = 0; i < whole && i < 40; i++) {
        var t = svgEl('text', { x: labelRoom + i * (size * 0.92), y: y + size * 0.34,
          class: 'ch-icon', 'font-size': size });
        t.textContent = icon;
        g.appendChild(t);
      }
      if (part > 0.08 && whole < 40) {
        /* The remainder as a clipped icon: a smaller one would encode the
           value in area, which is the thing this form exists to avoid. */
        var cid = 'picto-clip-' + ci;
        var clip = svgEl('clipPath', { id: cid });
        clip.appendChild(svgEl('rect', { x: labelRoom + whole * (size * 0.92), y: y - size * 0.7,
          width: Math.max(1, size * part), height: size * 1.3 }));
        svg.appendChild(clip);
        var ht = svgEl('text', { x: labelRoom + whole * (size * 0.92), y: y + size * 0.34,
          class: 'ch-icon', 'font-size': size, 'clip-path': 'url(#' + cid + ')' });
        ht.textContent = icon;
        g.appendChild(ht);
      }
      var vlab = svgEl('text', { x: labelRoom + Math.min(whole + 1, 41) * (size * 0.92) + 12,
        y: y + 7, class: 'ch-value' });
      vlab.textContent = fmt(vals[ci]);
      g.appendChild(vlab);
      svg.appendChild(g);
    });

    var key = svgEl('text', { x: labelRoom, y: H - 10, class: 'ch-tick' });
    key.textContent = icon + ' = ' + fmt(unit) + (data.series[0] && data.series[0].name ? ' ' + data.series[0].name.toLowerCase() : '');
    svg.appendChild(key);
    return svg;
  }

  /* A radar, star or spider plot: one spoke per variable, one polygon per
     row. It is here because the lecture teaches it, and it is worth being
     able to draw an idiom in order to argue with it.

     Its weaknesses are the point of the slide that uses it. Area grows as
     the square of the values, so a row twice as good encloses four times
     the shape. The order of the spokes is arbitrary and changes that area —
     which a reader cannot see and an author can now demonstrate by
     reordering the columns. And it compares position on unaligned scales,
     several steps down the ranking from the same numbers as bars.

     Scales are shared across spokes by default so the polygon means
     something; per-spoke normalisation makes every row look similar and is
     the more common way this chart misleads. */
  function radarChart(data, slide) {
    var W = CHART.w, H = CHART.h;
    var cx = W / 2, cy = H / 2 + 6, R = Math.min(H / 2 - 34, 168);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var axes = data.categories.length;
    if (axes < 3) return svg;
    var all = [];
    data.series.forEach(function (sr) { sr.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var max = niceMax(Math.max.apply(null, all.concat([0])));
    var ang = function (i) { return -Math.PI / 2 + (i / axes) * Math.PI * 2; };
    var at = function (i, v) {
      var r = (Math.max(0, v) / max) * R;
      return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
    };

    /* Rings first, as a web rather than circles: a polygon read against a
       circular grid looks bowed where it is straight. */
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var pts = [];
      for (var i = 0; i < axes; i++) {
        pts.push((cx + R * f * Math.cos(ang(i))).toFixed(1) + ',' + (cy + R * f * Math.sin(ang(i))).toFixed(1));
      }
      svg.appendChild(svgEl('polygon', { points: pts.join(' '), class: 'ch-grid ch-web', fill: 'none' }));
    });
    for (var i = 0; i < axes; i++) {
      var e = at(i, max);
      svg.appendChild(svgEl('line', { x1: cx, y1: cy, x2: e[0].toFixed(1), y2: e[1].toFixed(1), class: 'ch-grid' }));
      var lr = R + 26, lx = cx + lr * Math.cos(ang(i)), ly = cy + lr * Math.sin(ang(i));
      var cosv = Math.cos(ang(i));
      var lab = svgEl('text', { x: lx.toFixed(1), y: (ly + 5).toFixed(1), class: 'ch-cat',
        'text-anchor': cosv < -0.25 ? 'end' : (cosv > 0.25 ? 'start' : 'middle') });
      lab.textContent = data.categories[i];
      svg.appendChild(lab);
    }
    var tick = svgEl('text', { x: cx + 6, y: cy - R + 4, class: 'ch-tick' });
    tick.textContent = fmt(max);
    svg.appendChild(tick);

    data.series.forEach(function (sr, si) {
      var pts = [];
      for (var i = 0; i < axes; i++) {
        var v = sr.values[i];
        var p = at(i, v == null ? 0 : v);
        pts.push(p[0].toFixed(1) + ',' + p[1].toFixed(1));
      }
      var g = svgEl('g', { class: 'ch-line ch-radar', 'data-step': si, 'data-series': String(si) });
      g.appendChild(svgEl('polygon', { points: pts.join(' '), fill: chartColor(si),
        opacity: 0.18, stroke: chartColor(si), 'stroke-width': 3, 'stroke-linejoin': 'round' }));
      for (var j = 0; j < axes; j++) {
        var vv = sr.values[j], pp = at(j, vv == null ? 0 : vv);
        g.appendChild(svgEl('circle', { cx: pp[0].toFixed(1), cy: pp[1].toFixed(1), r: 5,
          fill: chartColor(si), class: 'ch-dot' }));
      }
      svg.appendChild(g);
    });
    return svg;
  }

  /* A Sankey. Band width is the quantity, which is the one thing the
     lecture's own slide says about it, so width is the only channel used —
     no colour scale, no varying opacity carrying a second meaning.

     Ribbons are cubic beziers with horizontal control points, so a band
     leaves and arrives level and its width is readable at both ends. They
     are drawn before the nodes and in descending size, so a thick flow
     cannot hide a thin one behind it. */
  function sankeyChart(slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var f = SF.chartFlows(slide);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (!f.links.length) return svg;

    var padT = 18, padB = 26, left = 6, right = 6;
    var plotH = H - padT - padB;
    var nodeW = 16;
    var gap = 16;

    /* Scale: the fullest layer decides, so no column overflows and every
       band keeps the same units per pixel across the whole diagram. */
    var byLayer = [];
    for (var d = 0; d < f.layers; d++) byLayer.push(f.nodes.filter(function (n) { return n.depth === d; }));
    var heaviest = byLayer.reduce(function (m, col) {
      return Math.max(m, col.reduce(function (t, n) { return t + n.total; }, 0));
    }, 0);
    var tallest = byLayer.reduce(function (m, col) { return Math.max(m, col.length); }, 0);
    var perUnit = (plotH - (tallest - 1) * gap) / (heaviest || 1);

    var colX = function (d) {
      return left + (f.layers === 1 ? 0 : d * ((W - left - right - nodeW) / (f.layers - 1)));
    };
    byLayer.forEach(function (col, d) {
      col.sort(function (a, b) { return b.total - a.total; });
      var used = col.reduce(function (t, n) { return t + n.total * perUnit; }, 0) + (col.length - 1) * gap;
      var y = padT + (plotH - used) / 2;
      col.forEach(function (n) {
        n.x = colX(d);
        n.y = y;
        n.h = Math.max(2, n.total * perUnit);
        n.inAt = n.y;
        n.outAt = n.y;
        y += n.h + gap;
      });
    });

    var idx = f.index;
    var ribbons = f.links.slice().sort(function (a, b) { return b.value - a.value; });
    var g = svgEl('g', { class: 'ch-beat', 'data-step': 0, 'data-series': '0' });
    ribbons.forEach(function (l) {
      var a = f.nodes[idx[l.from]], b = f.nodes[idx[l.to]];
      var t = l.value * perUnit;
      var x1 = a.x + nodeW, x2 = b.x;
      var y1 = a.outAt, y2 = b.inAt;
      a.outAt += t; b.inAt += t;
      var mx = (x1 + x2) / 2;
      var d2 = 'M' + x1 + ' ' + y1 +
        ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 +
        ' L' + x2 + ' ' + (y2 + t) +
        ' C' + mx + ' ' + (y2 + t) + ' ' + mx + ' ' + (y1 + t) + ' ' + x1 + ' ' + (y1 + t) + ' Z';
      var band = svgEl('path', { d: d2, class: 'ch-flow', fill: chartColor(a.depth % 6) });
      var tip = svgEl('title', {});
      tip.textContent = l.from + ' → ' + l.to + ': ' + fmt(l.value);
      band.appendChild(tip);
      g.appendChild(band);
    });
    svg.appendChild(g);

    f.nodes.forEach(function (n) {
      svg.appendChild(svgEl('rect', { x: n.x, y: n.y, width: nodeW, height: n.h,
        class: 'ch-node', fill: chartColor(n.depth % 6) }));
      /* Labels sit outside the column they belong to, except the last,
         which has nothing to its right to collide with. */
      var last = n.depth === f.layers - 1;
      var lab = svgEl('text', {
        x: last ? n.x - 10 : n.x + nodeW + 10,
        y: n.y + n.h / 2 + 5,
        class: 'ch-cat ch-node-label',
        'text-anchor': last ? 'end' : 'start'
      });
      lab.textContent = n.name + ' · ' + fmt(n.total);
      svg.appendChild(lab);
    });
    return svg;
  }

  /* A dumbbell: one row per category, two marks joined by a bar. Ported
     from the tube-noise chart in the pollution explorer on this machine.

     It answers a question a paired bar answers badly — how far apart are
     these two states — because the gap is drawn as a gap rather than left
     for the eye to compute between two column heights. The bar is the
     subject; the dots only say which end is which.

     Exactly two series. A third would make the connecting bar a lie about
     which pair it joins, so the inspector says so rather than drawing it. */
  function dumbbellChart(data, slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (data.series.length < 2) return svg;
    var a = data.series[0], b = data.series[1];
    var vals = [];
    [a, b].forEach(function (sr) { sr.values.forEach(function (v) { if (v != null) vals.push(v); }); });
    if (!vals.length) return svg;
    var rng = niceRange(Math.min.apply(null, vals), Math.max.apply(null, vals));

    var longest = data.categories.reduce(function (n, c) { return Math.max(n, String(c).length); }, 0);
    var padL = Math.min(330, 40 + longest * 9.5);
    var plotW = W - padL - P.padR, plotH = H - P.padT - P.padB;
    var sx = function (v) { return padL + ((v - rng.lo) / (rng.hi - rng.lo || 1)) * plotW; };
    var rowH = plotH / Math.max(1, data.categories.length);

    axisTicks(rng.hi - rng.lo).forEach(function (t) {
      var x = sx(rng.lo + t);
      svg.appendChild(svgEl('line', { x1: x, y1: P.padT - 6, x2: x, y2: P.padT + plotH - rowH / 2 + 6, class: 'ch-grid' }));
      var lab = svgEl('text', { x: x, y: P.padT + plotH + 18, class: 'ch-tick', 'text-anchor': 'middle' });
      lab.textContent = fmt(rng.lo + t);
      svg.appendChild(lab);
    });

    data.categories.forEach(function (cat, i) {
      var va = a.values[i], vb = b.values[i];
      if (va == null || vb == null) return;
      var y = P.padT + rowH * i + rowH / 2 - rowH / 2 + 10;
      var g = svgEl('g', { class: 'ch-beat ch-dumbbell', 'data-step': i, 'data-series': '0' });
      var lo = Math.min(sx(va), sx(vb)), hi = Math.max(sx(va), sx(vb));
      /* Drawn before the dots so the ends sit on top of it. */
      g.appendChild(svgEl('line', { x1: lo, y1: y, x2: hi, y2: y, class: 'ch-bell-bar' }));
      [[va, 0], [vb, 1]].forEach(function (pair) {
        var dot = svgEl('circle', { cx: sx(pair[0]), cy: y, r: 8, fill: chartColor(pair[1]), class: 'ch-bell-dot' });
        var tip = svgEl('title', {});
        tip.textContent = cat + ' · ' + (pair[1] ? b.name : a.name) + ': ' + fmt(pair[0]);
        dot.appendChild(tip);
        g.appendChild(dot);
      });
      /* The gap named, not just shown: the number is what gets quoted. */
      var diff = Math.abs(va - vb);
      if (hi - lo > 54) {
        var dl = svgEl('text', { x: (lo + hi) / 2, y: y - 12, class: 'ch-tick', 'text-anchor': 'middle' });
        dl.textContent = fmt(diff);
        g.appendChild(dl);
      }
      var cl = svgEl('text', { x: padL - 14, y: y + 6, class: 'ch-cat', 'text-anchor': 'end' });
      cl.textContent = cat;
      g.appendChild(cl);
      svg.appendChild(g);
    });
    return svg;
  }

  /* A categorical evidence matrix: items down, conditions across, and a
     graded label in every cell. Ported from the line-ratings chart in the
     pollution explorer.

     Colour carries an order, not a quantity. Low / Medium / High and
     Weak / Moderate / Strong are both ordinal — the distance between the
     steps is not a number — so the scale is three steps of one hue rather
     than a continuous ramp, which would invite reading a gap that the data
     does not contain. Any vocabulary works; recognised words are ordered,
     and anything else falls back to the order the author wrote them in. */
  var ORDINAL_WORDS = ['none', 'very low', 'weak', 'low', 'l', 'medium', 'med', 'moderate', 'm',
                       'high', 'h', 'strong', 'very high', 'severe'];
  function matrixChart(slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var rows = SF.parseTable(slide.body);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (rows.length < 2) return svg;
    var head = rows[0], body = rows.slice(1);
    var cols = head.slice(1).filter(function (h) { return String(h).trim(); });
    if (!cols.length) return svg;

    /* Rank every value once so the whole matrix shares one scale — colouring
       each column on its own would make a cell's shade mean something
       different depending on where it sits. */
    var seen = [];
    body.forEach(function (r) {
      cols.forEach(function (_, j) {
        var v = String(r[j + 1] || '').trim();
        if (v && seen.indexOf(v) < 0) seen.push(v);
      });
    });
    var ordered = seen.slice().sort(function (x, y) {
      var ix = ORDINAL_WORDS.indexOf(x.toLowerCase()), iy = ORDINAL_WORDS.indexOf(y.toLowerCase());
      if (ix >= 0 && iy >= 0) return ix - iy;
      if (ix >= 0) return -1;
      if (iy >= 0) return 1;
      return seen.indexOf(x) - seen.indexOf(y);
    });
    var rank = {};
    ordered.forEach(function (v, i) { rank[v] = ordered.length > 1 ? i / (ordered.length - 1) : 1; });

    var longest = body.reduce(function (n, r) { return Math.max(n, String(r[0] || '').length); }, 0);
    var padL = Math.min(300, 30 + longest * 9.5);
    var plotW = W - padL - P.padR, plotH = H - P.padT - 42;
    var cw = plotW / cols.length, rh = Math.min(34, plotH / Math.max(1, body.length + 1));

    cols.forEach(function (c, j) {
      var lab = svgEl('text', { x: padL + cw * j + cw / 2, y: P.padT + 16, class: 'ch-cat', 'text-anchor': 'middle' });
      lab.textContent = c;
      svg.appendChild(lab);
    });

    body.forEach(function (r, i) {
      var y = P.padT + 30 + rh * i;
      var g = svgEl('g', { class: 'ch-beat', 'data-step': i, 'data-series': '0' });
      var rl = svgEl('text', { x: padL - 12, y: y + rh * 0.62, class: 'ch-cat', 'text-anchor': 'end' });
      rl.textContent = String(r[0] || '');
      g.appendChild(rl);
      cols.forEach(function (_, j) {
        var v = String(r[j + 1] || '').trim();
        if (!v) return;
        var t = rank[v] == null ? 0 : rank[v];
        var cell = svgEl('rect', { x: padL + cw * j + 4, y: y, width: Math.max(8, cw - 8),
          height: rh - 6, rx: 5, class: 'ch-cell', fill: chartColor(0),
          'fill-opacity': (0.16 + t * 0.78).toFixed(2) });
        g.appendChild(cell);
        /* The label goes in the cell, so the chart is readable without the
           key and by anyone the hues fail. */
        var tx = svgEl('text', { x: padL + cw * j + cw / 2, y: y + rh * 0.62,
          class: 'ch-cell-label' + (t > 0.55 ? ' on-dark' : ''), 'text-anchor': 'middle' });
        tx.textContent = v;
        g.appendChild(tx);
      });
      svg.appendChild(g);
    });
    return svg;
  }

  /* Small multiples: a panel per item, every panel on the same scale.

     Ported from the platform-peaks chart in the pollution explorer. The
     discipline that makes the idiom work is the shared scale — it is what
     lets a reader compare panels by eye instead of re-reading four axes —
     so the scale is computed across every value and then stated on the
     slide, not left for the reader to check.

     The table is read transposed: each row becomes a panel and the columns
     become the axis inside it. "Station | 2023 | 2024 | 2025" is one panel
     per station with years across the bottom, which is how the data arrives
     and saves an author pivoting it first.

     Colour carries direction, not identity. Every panel is the same series,
     so colouring them apart would say they are different things; what
     differs is whether each one rose or fell, and that is worth a hue. */
  function multiplesChart(data, slide) {
    var W = CHART.w, H = CHART.h;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var panels = data.categories.map(function (name, i) {
      return { name: name, values: data.series.map(function (sr) { return sr.values[i]; }) };
    }).filter(function (p) { return p.values.some(function (v) { return v != null; }); });
    if (!panels.length || data.series.length < 2) return svg;

    var all = [];
    panels.forEach(function (p) { p.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var rng = niceRange(Math.min.apply(null, all), Math.max.apply(null, all));

    /* Wide before tall: a row of panels is read left to right like a
       sentence, and a tall grid of narrow ones is read as a table. */
    var cols = Math.min(panels.length, panels.length <= 4 ? panels.length : Math.ceil(Math.sqrt(panels.length * 1.9)));
    var rows = Math.ceil(panels.length / cols);
    var padTop = 26, padBottom = 34;
    var cellW = (W - 36) / cols, cellH = (H - padTop - padBottom) / rows;
    var plotW = cellW - 30, plotH = Math.max(22, cellH - 48);

    panels.forEach(function (p, i) {
      var cx = 18 + (i % cols) * cellW, cy = padTop + Math.floor(i / cols) * cellH;
      var g = svgEl('g', { class: 'ch-beat ch-multiple', 'data-step': i, 'data-series': '0' });
      var n = p.values.length;
      var sx = function (j) { return cx + 14 + (n < 2 ? plotW / 2 : (plotW * j) / (n - 1)); };
      var sy = function (v) { return cy + 26 + plotH - ((v - rng.lo) / (rng.hi - rng.lo || 1)) * plotH; };

      var lab = svgEl('text', { x: cx + 14, y: cy + 12, class: 'ch-cat ch-multiple-title' });
      lab.textContent = p.name;
      g.appendChild(lab);

      /* Floor and ceiling only. Four gridlines in a panel this size is a
         texture, not a scale. */
      [rng.lo, rng.hi].forEach(function (v) {
        g.appendChild(svgEl('line', { x1: sx(0), x2: sx(n - 1), y1: sy(v), y2: sy(v), class: 'ch-grid' }));
      });

      /** @type {number|null} */ var first = null;
      /** @type {number|null} */ var last = null;
      p.values.forEach(function (v) { if (v != null) { if (first === null) first = v; last = v; } });
      /* Both null together or neither, but the checker cannot see that from
         the loop, and a panel of blanks should read flat rather than throw.

         Flat is a band, not an exact tie. A station going 1,010 to 1,008 is
         not falling — it is holding — and colouring two units of drift on a
         thousand-unit scale as a decline is the chart making a claim the
         data does not support. Two per cent of the shared range, so the
         threshold means the same thing in every panel. */
      var slack = (rng.hi - rng.lo) * 0.02;
      var dir = (first === null || last === null || Math.abs(last - first) <= slack) ? 'flat'
              : (last > first ? 'up' : 'down');

      var pts = [];
      p.values.forEach(function (v, j) { if (v != null) pts.push([sx(j), sy(v)]); });
      if (pts.length > 1) {
        g.appendChild(svgEl('polyline', {
          points: pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '),
          fill: 'none', class: 'ch-mult-line dir-' + dir, 'stroke-width': 2.5, 'stroke-linejoin': 'round'
        }));
      }
      p.values.forEach(function (v, j) {
        if (v == null) return;
        g.appendChild(svgEl('circle', { cx: sx(j), cy: sy(v), r: 3.5, class: 'ch-mult-dot dir-' + dir }));
        /* Only the ends carry a number. Labelling every point in a panel
           two inches wide turns the shape back into a table. */
        if (j === 0 || j === n - 1) {
          var vl = svgEl('text', { x: sx(j), y: sy(v) - 8, class: 'ch-mult-value',
            'text-anchor': j === 0 ? 'start' : 'end' });
          vl.textContent = fmt(v);
          g.appendChild(vl);
        }
      });
      /* The axis is named once per panel, at the ends, rather than under
         every point. */
      [0, n - 1].forEach(function (j) {
        var t = svgEl('text', { x: sx(j), y: cy + 26 + plotH + 15, class: 'ch-mult-axis',
          'text-anchor': j === 0 ? 'start' : 'end' });
        t.textContent = (data.series[j] && data.series[j].name) || '';
        g.appendChild(t);
      });
      svg.appendChild(g);
    });

    /* The shared scale, said out loud. Without it a reader has no way to
       know the panels are comparable, which is the entire claim the layout
       is making. */
    var note = svgEl('text', { x: 18, y: H - 10, class: 'ch-tick' });
    note.textContent = 'Every panel on the same ' + fmt(rng.lo) + '–' + fmt(rng.hi) + ' scale' +
      ' · rose, fell or held is shown by colour';
    svg.appendChild(note);
    return svg;
  }

  function lineChart(data, slide, area) {
    var W = CHART.w, H = CHART.h, P = CHART;
    /* Reserve the right margin for the end-labels before drawing anything.
       Sized from the longest series name, because a label that runs past the
       viewBox is clipped mid-word — which is what happened to "Cambridge"
       the first time this was rendered. */
    var longest = data.series.reduce(function (n, x) { return Math.max(n, x.name.length); }, 0);
    var labelRoom = Math.min(230, 18 + longest * 10.5);
    var padR = P.padR + labelRoom;
    var plotW = W - P.padL - padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    var all = [];
    data.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var max = niceMax(Math.max.apply(null, all.concat([0])));

    axisTicks(max).forEach(function (t) {
      var y = P.padT + plotH - (t / max) * plotH;
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var cols = Math.max(1, data.categories.length - 1);
    var xAt = function (i) { return P.padL + (cols ? (plotW * i / cols) : plotW / 2); };
    var yAt = function (v) { return P.padT + plotH - (v / max) * plotH; };

    data.categories.forEach(function (cat, i) {
      var cl = svgEl('text', { x: xAt(i), y: H - P.padB + 30, class: 'ch-cat', 'text-anchor': 'middle' });
      cl.textContent = cat;
      svg.appendChild(cl);
    });

    var ends = [];
    data.series.forEach(function (s, si) {
      var g = svgEl('g', { class: 'ch-line', 'data-step': si, 'data-series': String(si) });
      var pts = [];
      s.values.forEach(function (v, i) { if (v != null) pts.push([xAt(i), yAt(v)]); });
      if (!pts.length) return;
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      /* An area is the same line with the ground under it shaded, drawn
         first so the stroke and its markers stay on top. Translucent
         because overlapping areas are the idiom's known weakness and
         hiding one behind another would be the chart lying. */
      if (area) {
        var base = P.padT + plotH;
        var fillD = d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + base +
                    ' L' + pts[0][0].toFixed(1) + ' ' + base + ' Z';
        g.appendChild(svgEl('path', { d: fillD, fill: chartColor(si), opacity: 0.22, stroke: 'none' }));
      }
      g.appendChild(svgEl('path', { d: d, fill: 'none', stroke: chartColor(si), 'stroke-width': 3,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      pts.forEach(function (p) {
        /* A 2px ring in the surface colour, so a marker stays legible where
           two series cross. */
        g.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: 6, fill: chartColor(si), class: 'ch-dot' }));
      });
      ends.push({ y: pts[pts.length - 1][1], x: pts[pts.length - 1][0], name: s.name, g: g });
      svg.appendChild(g);
    });

    /* Direct end-labels only while the lines actually separate at the right
       edge. Converging series get nudged labels that detach from their lines
       and read as noise, so below a comfortable gap the legend carries
       identity on its own — which it is already doing. */
    var sorted = ends.slice().sort(function (a, b) { return a.y - b.y; });
    var crowded = sorted.some(function (e, i) { return i && (e.y - sorted[i - 1].y) < 26; });
    if (!crowded) {
      ends.forEach(function (e) {
        var lab = svgEl('text', { x: e.x + 14, y: e.y + 6, class: 'ch-end' });
        lab.textContent = e.name;
        e.g.appendChild(lab);
      });
    }

    svg.appendChild(svgEl('line', { x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis' }));
    return svg;
  }

  /* Part-to-whole. A pie is a weaker read than a stacked bar — angle is
     harder to compare than length — but this app teaches the history of the
     form, and you cannot critique Playfair's 1801 pie without showing one. */
  function pieChart(data, slide, donut) {
    var W = CHART.w, H = CHART.h;
    var cx = W / 2, cy = H / 2 + 4, R = Math.min(H / 2 - 14, 200);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });

    /* One series: the slices are the categories. Several: the first is used
       and the rest ignored, which the inspector warns about. */
    var vals = (data.series[0] ? data.series[0].values : []).map(function (v) { return v == null ? 0 : Math.max(0, v); });
    var total = vals.reduce(function (a, b) { return a + b; }, 0);
    if (!total) return svg;

    var angle = -Math.PI / 2;
    vals.forEach(function (v, i) {
      var sweep = (v / total) * Math.PI * 2;
      var a0 = angle, a1 = angle + sweep;
      angle = a1;
      if (!v) return;
      var large = sweep > Math.PI ? 1 : 0;
      var d = 'M' + cx + ' ' + cy +
              ' L' + (cx + R * Math.cos(a0)).toFixed(1) + ' ' + (cy + R * Math.sin(a0)).toFixed(1) +
              ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' +
              (cx + R * Math.cos(a1)).toFixed(1) + ' ' + (cy + R * Math.sin(a1)).toFixed(1) + ' Z';
      var g = svgEl('g', { class: 'ch-slice', 'data-step': i });
      g.appendChild(svgEl('path', { d: d, fill: chartColor(i), class: 'ch-wedge' }));
      var mid = (a0 + a1) / 2, lr = R + 34;
      var lx = cx + lr * Math.cos(mid), ly = cy + lr * Math.sin(mid);
      var pct = Math.round((v / total) * 100);
      /* Label outside the wedge, never inside it: a slice narrow enough to
         crop its own label is exactly the slice you most need named. */
      var lab = svgEl('text', { x: lx, y: ly, class: 'ch-slice-label',
        'text-anchor': Math.cos(mid) < -0.2 ? 'end' : (Math.cos(mid) > 0.2 ? 'start' : 'middle') });
      lab.textContent = (data.categories[i] || '') + ' · ' + pct + '%';
      g.appendChild(lab);
      svg.appendChild(g);
    });
    /* A donut is a pie with the middle taken out, and the reason to prefer
       one is that the hole holds the total — the number a pie makes you add
       up yourself. Drawn in the surface colour over the wedges rather than
       as an arc per slice, which keeps the wedge geometry above identical
       between the two. */
    if (donut) {
      svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: R * 0.58, class: 'ch-donut-hole' }));
      var tot = svgEl('text', { x: cx, y: cy + 2, class: 'ch-donut-total', 'text-anchor': 'middle' });
      tot.textContent = fmt(total);
      svg.appendChild(tot);
      var cap = svgEl('text', { x: cx, y: cy + 30, class: 'ch-donut-cap', 'text-anchor': 'middle' });
      cap.textContent = 'total';
      svg.appendChild(cap);
    }
    return svg;
  }

  /* Binary-partition treemap. Good enough for a use-of-funds slide: biggest
     spend physically dominates. Not a full squarify — those need a library;
     this stays readable on a 1280 wall without one. */
  function layoutTreemap(nodes, x, y, w, h) {
    if (!nodes.length) return [];
    if (nodes.length === 1) {
      return [{ name: nodes[0].name, value: nodes[0].value, i: nodes[0].i, x: x, y: y, w: w, h: h }];
    }
    var total = 0;
    nodes.forEach(function (n) { total += n.value; });
    var acc = 0, mid = 0;
    for (var i = 0; i < nodes.length; i++) {
      acc += nodes[i].value;
      mid = i;
      if (acc >= total / 2) break;
    }
    var left = nodes.slice(0, mid + 1);
    var right = nodes.slice(mid + 1);
    if (!right.length) {
      return [{ name: nodes[0].name, value: nodes[0].value, i: nodes[0].i, x: x, y: y, w: w, h: h }];
    }
    var leftSum = 0;
    left.forEach(function (n) { leftSum += n.value; });
    var ratio = leftSum / total;
    if (w >= h) {
      return layoutTreemap(left, x, y, w * ratio, h)
        .concat(layoutTreemap(right, x + w * ratio, y, w * (1 - ratio), h));
    }
    return layoutTreemap(left, x, y, w, h * ratio)
      .concat(layoutTreemap(right, x, y + h * ratio, w, h * (1 - ratio)));
  }

  /* Part-of-whole by area. Same paste as a pie — one series, categories as
     the parts — but the largest block owns the eye, which is what a use-of-
     funds slide needs and a pie refuses to do. */
  function treemapChart(data, slide) {
    var W = CHART.w, H = CHART.h;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var series = data.series[0];
    if (!series) return svg;
    var nodes = [];
    data.categories.forEach(function (cat, i) {
      var v = series.values[i];
      if (v == null || v <= 0) return;
      nodes.push({ name: cat, value: v, i: i });
    });
    nodes.sort(function (a, b) { return b.value - a.value; });
    var total = 0;
    nodes.forEach(function (n) { total += n.value; });
    if (!total) return svg;
    var gap = 3;
    var rects = layoutTreemap(nodes, gap, gap, W - gap * 2, H - gap * 2);
    rects.forEach(function (r) {
      var g = svgEl('g', { class: 'ch-cell ch-beat', 'data-step': r.i, 'data-series': '0' });
      var pad = 1.5;
      g.appendChild(svgEl('rect', {
        x: r.x + pad, y: r.y + pad,
        width: Math.max(0, r.w - pad * 2), height: Math.max(0, r.h - pad * 2),
        fill: chartColor(r.i % 6), class: 'ch-tree-rect', rx: 4
      }));
      if (r.w > 70 && r.h > 42) {
        var name = svgEl('text', {
          x: r.x + 14, y: r.y + 28, class: 'ch-tree-label', 'text-anchor': 'start'
        });
        name.textContent = r.name;
        g.appendChild(name);
        var pct = Math.round((r.value / total) * 100);
        var val = svgEl('text', {
          x: r.x + 14, y: r.y + 52, class: 'ch-tree-value', 'text-anchor': 'start'
        });
        val.textContent = fmt(r.value) + ' · ' + pct + '%';
        g.appendChild(val);
      }
      svg.appendChild(g);
    });
    return svg;
  }

  /* Actual against a target, one row per category. First series is the bar;
     second (if present) is the target tick. The qualitative ranges a full
     bullet chart sometimes carries are left out — they need a third kind of
     column the paste shape does not name. */
  function bulletChart(data, slide) {
    var W = CHART.w, H = CHART.h, P = { padL: 160, padR: 40, padT: 18, padB: 28 };
    var plotW = W - P.padL - P.padR;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var actual = data.series[0];
    var target = data.series[1] || null;
    if (!actual) return svg;
    var all = [];
    data.series.forEach(function (s) {
      s.values.forEach(function (v) { if (v != null) all.push(Math.abs(v)); });
    });
    var max = niceMax(Math.max.apply(null, all.concat([0])));
    var rowH = Math.min(72, (H - P.padT - P.padB) / Math.max(1, data.categories.length));
    var trackH = Math.min(22, rowH * 0.38);
    var barH = Math.min(12, trackH * 0.55);

    data.categories.forEach(function (cat, ci) {
      var y = P.padT + rowH * ci + rowH / 2;
      var lab = svgEl('text', { x: P.padL - 16, y: y + 6, class: 'ch-cat', 'text-anchor': 'end' });
      lab.textContent = cat;
      svg.appendChild(lab);
      var g = svgEl('g', { class: 'ch-beat', 'data-step': ci });
      g.appendChild(svgEl('rect', {
        x: P.padL, y: y - trackH / 2, width: plotW, height: trackH,
        class: 'ch-bullet-track', rx: 2
      }));
      var av = actual.values[ci];
      if (av != null) {
        var bw = Math.max(0, (Math.abs(av) / max) * plotW);
        var bar = svgEl('g', { class: 'ch-bar', 'data-series': '0' });
        bar.appendChild(svgEl('rect', {
          x: P.padL, y: y - barH / 2, width: bw, height: barH,
          fill: chartColor(0), rx: 2
        }));
        g.appendChild(bar);
        var vlab = svgEl('text', {
          x: P.padL + bw + 10, y: y + 5, class: 'ch-value', 'text-anchor': 'start'
        });
        vlab.textContent = fmt(av);
        g.appendChild(vlab);
      }
      if (target) {
        var tv = target.values[ci];
        if (tv != null) {
          var tx = P.padL + (Math.abs(tv) / max) * plotW;
          var mark = svgEl('g', { class: 'ch-bullet-target', 'data-series': '1' });
          mark.appendChild(svgEl('line', {
            x1: tx, y1: y - trackH * 0.7, x2: tx, y2: y + trackH * 0.7,
            class: 'ch-bullet-tick'
          }));
          g.appendChild(mark);
        }
      }
      svg.appendChild(g);
    });
    return svg;
  }

  /* Columns for the first series, markers for the rest — the ARR-growth
     idiom where absolute size and a rate share one picture. Same axis for
     both: if the marker series is a percentage and the columns are pounds,
     the paste is the wrong shape and the chart will say so by looking odd. */
  function comboChart(data, slide) {
    var W = CHART.w, H = CHART.h, P = CHART;
    var plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    if (!data.series.length) return svg;

    var all = [];
    data.series.forEach(function (s) {
      s.values.forEach(function (v) { if (v != null) all.push(v); });
    });
    var max = niceMax(Math.max.apply(null, all.concat([0])));

    axisTicks(max).forEach(function (t) {
      var y = P.padT + plotH - (t / max) * plotH;
      svg.appendChild(svgEl('line', { x1: P.padL, y1: y, x2: P.padL + plotW, y2: y, class: 'ch-grid' }));
      var lab = svgEl('text', { x: P.padL - 14, y: y + 7, class: 'ch-tick', 'text-anchor': 'end' });
      lab.textContent = fmt(t);
      svg.appendChild(lab);
    });

    var band = plotW / Math.max(1, data.categories.length);
    var barW = Math.min(band * 0.48, 64);
    var cols = data.series[0];
    var colG = svgEl('g', { class: 'ch-beat', 'data-step': 0, 'data-series': '0' });
    data.categories.forEach(function (cat, ci) {
      var v = cols.values[ci];
      if (v == null) return;
      var hgt = Math.max(0, (v / max) * plotH);
      var x = P.padL + band * ci + (band - barW) / 2;
      var y = P.padT + plotH - hgt;
      var g = svgEl('g', { class: 'ch-bar' });
      var r = Math.min(4, barW / 2);
      var d = 'M' + x + ' ' + (y + hgt) + ' V' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
              ' H' + (x + barW - r) + ' Q' + (x + barW) + ' ' + y + ' ' + (x + barW) + ' ' + (y + r) +
              ' V' + (y + hgt) + ' Z';
      g.appendChild(svgEl('path', { d: d, fill: chartColor(0) }));
      colG.appendChild(g);
      var cl = svgEl('text', {
        x: P.padL + band * ci + band / 2, y: H - P.padB + 30,
        class: 'ch-cat', 'text-anchor': 'middle'
      });
      cl.textContent = cat;
      svg.appendChild(cl);
    });
    svg.appendChild(colG);

    data.series.slice(1).forEach(function (s, mi) {
      var si = mi + 1;
      var g = svgEl('g', { class: 'ch-markers ch-beat', 'data-step': si, 'data-series': String(si) });
      var pts = [];
      data.categories.forEach(function (cat, ci) {
        var v = s.values[ci];
        if (v == null) return;
        var cx = P.padL + band * ci + band / 2;
        var cy = P.padT + plotH - (v / max) * plotH;
        pts.push([cx, cy]);
        g.appendChild(svgEl('circle', {
          cx: cx, cy: cy, r: 7, fill: chartColor(si), class: 'ch-marker',
          stroke: 'var(--s-bg, #fff)', 'stroke-width': 2
        }));
      });
      if (pts.length > 1) {
        var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
        g.insertBefore(svgEl('path', {
          d: path, fill: 'none', stroke: chartColor(si),
          'stroke-width': 2.5, class: 'ch-marker-line', 'stroke-dasharray': '4 5'
        }), g.firstChild);
      }
      svg.appendChild(g);
    });

    svg.appendChild(svgEl('line', {
      x1: P.padL, y1: P.padT + plotH, x2: P.padL + plotW, y2: P.padT + plotH, class: 'ch-axis'
    }));
    return svg;
  }

  /* A 10×10 grid = 100 cells. Categories from one series share the grid by
     proportion — the waffle's whole point is that five percent is five
     squares you can count, not a five-degree pie slice. */
  function waffleChart(data, slide) {
    var W = CHART.w, H = CHART.h;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img' });
    var series = data.series[0];
    if (!series) return svg;
    var parts = [];
    var total = 0;
    data.categories.forEach(function (cat, i) {
      var v = series.values[i];
      if (v == null || v <= 0) return;
      parts.push({ name: cat, value: v, i: i });
      total += v;
    });
    if (!total) return svg;

    /* Single category whose value is already a percentage (≤ 100): fill that
       many cells and leave the rest as empty track. Multiple categories:
       share all 100 by proportion. */
    var cells = [];
    if (parts.length === 1 && parts[0].value <= 100) {
      var n = Math.max(0, Math.min(100, Math.round(parts[0].value)));
      for (var a = 0; a < n; a++) cells.push(parts[0].i);
      for (var b = n; b < 100; b++) cells.push(-1);
    } else {
      var assigned = 0;
      parts.forEach(function (p, pi) {
        var count = pi === parts.length - 1
          ? (100 - assigned)
          : Math.round((p.value / total) * 100);
        count = Math.max(0, Math.min(100 - assigned, count));
        for (var c = 0; c < count; c++) cells.push(p.i);
        assigned += count;
      });
      while (cells.length < 100) cells.push(-1);
      cells = cells.slice(0, 100);
    }

    /* The key sits to the left of the grid, so the grid can only start where
       the longest key entry ends. Measuring the NAME alone was not enough:
       every entry also prints its share, so "Apprenticeship" reserved room
       for fourteen characters and then drew twenty, and the tail of the word
       ran under the first column of squares. Reserve for the whole string,
       from where it actually starts (x=52, past the swatch). */
    parts.forEach(function (p) {
      var pct = parts.length === 1 && p.value <= 100
        ? Math.round(p.value)
        : Math.round((p.value / total) * 100);
      p.label = p.name + ' · ' + pct + '%';
    });
    var labelW = Math.max(160, Math.min(380, 52 + parts.reduce(function (m, p) {
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
      var g = svgEl('g', {
        class: 'ch-waffle-cell' + (idx < 0 ? ' ch-waffle-empty' : ' ch-cell'),
        'data-step': idx < 0 ? 0 : idx,
        'data-series': '0'
      });
      g.appendChild(svgEl('rect', {
        x: ox + col * cell + gap / 2,
        y: oy + row * cell + gap / 2,
        width: cell - gap,
        height: cell - gap,
        rx: 2,
        fill: idx < 0 ? 'var(--s-muted, #ccc)' : chartColor(idx % 6),
        opacity: idx < 0 ? 0.22 : 1,
        class: 'ch-waffle-sq'
      }));
      svg.appendChild(g);
    }

    parts.forEach(function (p, pi) {
      var y = oy + 22 + pi * 36;
      var item = svgEl('g', { class: 'ch-beat', 'data-step': p.i, 'data-series': '0' });
      item.appendChild(svgEl('rect', {
        x: 24, y: y - 12, width: 18, height: 18, rx: 3, fill: chartColor(p.i % 6)
      }));
      var t = svgEl('text', { x: 52, y: y + 2, class: 'ch-cat', 'text-anchor': 'start' });
      t.textContent = p.label;
      item.appendChild(t);
      svg.appendChild(item);
    });
    return svg;
  }

  /* One place that turns a kind and a table into a chart. This lived inline
     inside layoutChart, which meant a chart could only ever be a whole slide.
     A block that wants one asks here instead. */
  function chartSvgFor(kind, data, slide, stepOf) {
    return kind === 'multiples' ? multiplesChart(data, slide)
            : kind === 'dumbbell' ? dumbbellChart(data, slide)
            : kind === 'matrix' ? matrixChart(slide)
            : kind === 'sankey' ? sankeyChart(slide)
            : kind === 'radar' ? radarChart(data, slide)
            : kind === 'scatter' ? scatterChart(slide)
            : kind === 'histogram' ? histogramChart(slide)
            : kind === 'box' ? boxChart(slide)
            : kind === 'pictogram' ? pictogramChart(data, slide)
            : kind === 'treemap' ? treemapChart(data, slide)
            : kind === 'bullet' ? bulletChart(data, slide)
            : kind === 'combo' ? comboChart(data, slide)
            : kind === 'waffle' ? waffleChart(data, slide)
            : kind === 'line' ? lineChart(data, slide, false)
            : kind === 'area' ? lineChart(data, slide, true)
            : kind === 'pie' ? pieChart(data, slide, false)
            : kind === 'donut' ? pieChart(data, slide, true)
            : kind === 'stack' ? stackedBar(data, slide, slide.progressive ? stepOf : null)
            : kind === 'hbar' ? horizontalBar(data, slide)
            : barChart(data, slide, slide.progressive ? stepOf : null);
  }

  return {chartKey, chartTable, chartSvgFor, svgEl};
}
