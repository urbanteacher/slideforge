'use strict';
/* The data each of Week 5's live figures is given (src/render/figures/),
 * made from vega-datasets so every number can be reproduced in the lab. */
const DATA = require('./data.js');
const WORLD = require('./world.js');

const GAPMINDER = 'Free data from Gapminder.org (CC BY 4.0), via vega_datasets';
const BLUES = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];

/** Rosling's 2015 world, as the bubbles, linked and rowtable figures take it. */
function world2015(extra) {
  const rows = DATA.health2015().map(r => ({
    id: r.id, name: r.name, x: r.income, y: r.health, size: r.population, group: r.region,
    country: r.name, income: r.income, health: r.health, population: r.population, region: r.region
  }));
  return Object.assign({
    rows,
    x: { title: 'Income per person (GDP per capita, $, log scale)', log: true, domain: [420, 160000], ticks: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000], format: '$,d' },
    y: { title: 'Life expectancy (years)', domain: [46, 86], ticks: [50, 55, 60, 65, 70, 75, 80, 85], format: 'd' },
    size: { domain: [0, 1.4e9], range: [3, 46] },
    groups: DATA.REGIONS,
    tooltip: [
      { field: 'country', title: 'Country' },
      { field: 'income', title: 'Income', format: '$,.0f' },
      { field: 'health', title: 'Life expectancy', format: '.1f' },
      { field: 'population', title: 'Population', format: ',' }
    ],
    source: GAPMINDER + ' · 2015'
  }, extra || {});
}

/** Rosling in motion: gapminder.json, 62 countries, 1955–2005. Clusters as vega-datasets numbers them. */
const CLUSTER = { 0: 'south_asia', 1: 'europe_central_asia', 2: 'sub_saharan_africa', 3: 'america', 4: 'east_asia_pacific', 5: 'middle_east_north_africa' };
function motion(extra) {
  const rows = DATA.timeSeries(), byCountry = {};
  for (const r of rows) {
    const s = byCountry[r.country] || (byCountry[r.country] = { id: r.country, group: CLUSTER[r.cluster], frames: {} });
    s.frames[r.year] = [r.fertility, r.life_expect, r.pop];
  }
  const years = [...new Set(rows.map(r => r.year))].sort((a, b) => a - b);
  const series = Object.values(byCountry);
  for (const s of series) for (const y of years) if (!s.frames[y]) throw new Error(`${s.id} has no ${y}`);
  return Object.assign({
    series, years,
    x: { title: 'Babies per woman (fertility)', domain: [0, 9], ticks: [1, 2, 3, 4, 5, 6, 7, 8], format: 'd' },
    y: { title: 'Life expectancy (years)', domain: [25, 85], ticks: [30, 40, 50, 60, 70, 80], format: 'd' },
    size: { domain: [0, 1.4e9], range: [3, 46] },
    groups: DATA.REGIONS,
    source: GAPMINDER + ' · gapminder.json, 1955–2005'
  }, extra || {});
}

/* --------------------------------------------------------------- maps */

let world = null;
function geometry() { return world || (world = WORLD.build()); }

/** A choropleth fill for one field: its breaks by a method, Blues, and a title. */
function fill(field, method, title, format) {
  const vals = geometry().countries.map(c => c[field]);
  return { field, method, title, format, colors: BLUES, breaks: WORLD.breaks(vals, BLUES.length, method).map(v => Math.round(v * 100) / 100) };
}

const MAP_TOOLTIP = [
  { field: 'name', title: 'Country' },
  { field: 'income', title: 'Income', format: '$,.0f' },
  { field: 'health', title: 'Life expectancy', format: '.1f' },
  { field: 'population', title: 'Population', format: ',' }
];

/** For the finale: each country's bubble where Rosling's chart puts it, in slide pixels. */
function flight() {
  const d = world2015(), PLOT = { x0: 130, x1: 1190, y0: 160, y1: 580 };
  const lx = v => PLOT.x0 + (Math.log(v) - Math.log(d.x.domain[0])) / (Math.log(d.x.domain[1]) - Math.log(d.x.domain[0])) * (PLOT.x1 - PLOT.x0);
  const ly = v => PLOT.y1 - (v - d.y.domain[0]) / (d.y.domain[1] - d.y.domain[0]) * (PLOT.y1 - PLOT.y0);
  const r = v => d.size.range[0] + Math.sqrt(v / d.size.domain[1]) * (d.size.range[1] - d.size.range[0]);
  const shaped = new Set(geometry().countries.map(c => c.name).filter(Boolean));
  const scatter = {}, bubbles = {};
  for (const row of d.rows) {
    if (!shaped.has(row.country)) continue;
    scatter[row.country] = [Math.round(lx(row.income) * 10) / 10, Math.round(ly(row.health) * 10) / 10];
    bubbles[row.country] = { r: Math.round(r(row.population) * 0.7 * 10) / 10, color: DATA.REGIONS[row.region].color };
  }
  return { scatter, bubbles };
}

/* --------------------------------------------------------------- spot the bug */

/** Regions as bars: the whole bar, and the same bar split by country (the bug). */
function regionBars() {
  const rows = DATA.health2015();
  const out = Object.entries(DATA.REGIONS).map(([key, g]) => {
    const mine = rows.filter(r => r.region === key).sort((a, b) => b.population - a.population);
    const total = mine.reduce((n, r) => n + r.population, 0);
    return {
      id: key, label: g.label, value: total, color: '#9fb3c8',
      row: { region: g.label, total },
      parts: mine.map(r => ({ id: r.name, value: r.population, row: { region: g.label, country: r.name, population: r.population } }))
    };
  }).sort((a, b) => b.value - a.value);
  return { rows: out, max: 2.4e9, ticks: [0, 1e9, 2e9], format: '.2s', title: 'Total population, 2015' };
}

module.exports = { world2015, motion, fill, geometry, flight, regionBars, MAP_TOOLTIP, BLUES, GAPMINDER };
