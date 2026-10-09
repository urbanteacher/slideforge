'use strict';
/* The world the map figures draw (src/render/figures/worldmap.js), made once
 * at build time so the browser needs no map library.
 *
 * world-110m (Natural Earth, public domain, via vega-datasets) is projected
 * three ways (Mercator, Equal Earth, Robinson) into the same 1000-wide box,
 * keeping every ring's vertices in the same order, so a figure can morph one
 * projection into another by moving each point. Antarctica is left out: it
 * fills the bottom of every projection and Mercator cannot draw it.
 *
 * Each country carries its Gapminder name (tools/ipdv-week5/iso.js) and its
 * 2015 values, so the map can be a choropleth and can answer a hover. */
const fs = require('node:fs');
const path = require('node:path');
const topojson = require('topojson-client');
const d3 = require('d3-geo');
const d3p = require('d3-geo-projection');
const { ISO } = require('./iso.js');
const DATA = require('./data.js');

const BOX = { w: 1000, h: 560 };
const ANTARCTICA = 10, GREENLAND = 304;

/** Same box for every projection: fitted to the world without Antarctica. */
function projections(land) {
  const mk = {
    mercator: () => d3.geoMercator(),
    equalEarth: () => d3.geoEqualEarth(),
    robinson: () => d3p.geoRobinson()
  };
  const out = {};
  for (const [k, f] of Object.entries(mk)) out[k] = f().fitExtent([[10, 10], [BOX.w - 10, BOX.h - 10]], land);
  return out;
}

function build() {
  const topo = JSON.parse(fs.readFileSync(path.join(DATA.DIR, 'world-110m.json'), 'utf8'));
  const all = topojson.feature(topo, topo.objects.countries).features.filter(f => +f.id !== ANTARCTICA && f.geometry);
  const land = { type: 'FeatureCollection', features: all };
  const P = projections(land);
  const byCode = {};
  for (const [name, code] of Object.entries(ISO)) if (code != null && byCode[code] == null) byCode[code] = name;
  const values = Object.fromEntries(DATA.health2015().map(r => [r.name, r]));
  const round = v => Math.round(v * 10) / 10;

  const countries = all.map(f => {
    const code = +f.id, name = byCode[code] || null, v = name ? values[name] : null;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const rings = [];
    for (const poly of polys) for (const ring of poly) rings.push(ring);
    const shapes = {};
    for (const [k, proj] of Object.entries(P)) {
      shapes[k] = rings.map(ring => ring.map(([lon, lat]) => {
        const p = proj([lon, Math.max(-84, Math.min(84, lat))]);
        return [round(p[0]), round(p[1])];
      }));
    }
    const c = d3.geoCentroid(f), centroid = {};
    for (const [k, proj] of Object.entries(P)) { const p = proj(c); centroid[k] = [round(p[0]), round(p[1])]; }
    return {
      code, name, region: v ? v.region : null,
      income: v ? v.income : null, health: v ? v.health : null, population: v ? v.population : null,
      gdp: v ? v.income * v.population : null,
      centroid, shapes,
      ...(code === GREENLAND ? { lonlat: rings.map(r => r.map(([lon, lat]) => [round(lon), round(lat)])) } : {})
    };
  });
  /* Mercator's own constants, so a figure can project Greenland as it is dragged. */
  const m = P.mercator, mercator = { k: m.scale(), tx: m.translate()[0], ty: m.translate()[1] };
  return { box: BOX, mercator, countries };
}

/** Class breaks for `values` in `n` classes: equal interval, quantile, natural (Jenks, by ckmeans). */
function breaks(values, n, method) {
  const v = values.filter(x => x != null && isFinite(x)).sort((a, b) => a - b);
  const lo = v[0], hi = v[v.length - 1];
  if (method === 'equal') return Array.from({ length: n - 1 }, (_, i) => lo + (hi - lo) * (i + 1) / n);
  if (method === 'quantile') return Array.from({ length: n - 1 }, (_, i) => v[Math.floor(v.length * (i + 1) / n)]);
  /* Natural breaks: the n groups that minimise the squared distance to their means (ckmeans DP). */
  const N = v.length, cost = (i, j) => { let s = 0, s2 = 0; for (let k = i; k <= j; k++) { s += v[k]; s2 += v[k] * v[k]; } return s2 - s * s / (j - i + 1); };
  const D = Array.from({ length: n }, () => new Array(N).fill(Infinity)), B = Array.from({ length: n }, () => new Array(N).fill(0));
  for (let j = 0; j < N; j++) D[0][j] = cost(0, j);
  for (let c = 1; c < n; c++) for (let j = c; j < N; j++) for (let i = c; i <= j; i++) {
    const d = D[c - 1][i - 1] + cost(i, j);
    if (d < D[c][j]) { D[c][j] = d; B[c][j] = i; }
  }
  const cuts = []; let j = N - 1;
  for (let c = n - 1; c > 0; c--) { const i = B[c][j]; cuts.unshift(v[i]); j = i - 1; }
  return cuts;
}

module.exports = { build, breaks, BOX };
