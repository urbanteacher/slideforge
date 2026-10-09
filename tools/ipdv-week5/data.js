'use strict';
/* Week 5's data, read from the vega-datasets package (the same files
 * `from vega_datasets import data` gives students in Python), so every
 * number on a slide can be reproduced in the lab.
 *
 *   gapminder-health-income.csv  187 countries, one year (2015): income per
 *                                person, life expectancy, population, region.
 *                                The chart in Rosling's "200 Countries".
 *   gapminder.json               62 countries, 1955–2005 every five years:
 *                                fertility, life expectancy, population.
 *                                The chart in Rosling's 2006 TED talk.
 *
 * Free data from Gapminder.org, CC BY 4.0. */
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.resolve(__dirname, '../../node_modules/vega-datasets/data');

/** World Bank regions as Gapminder labels them, each with a colour the stage can carry.
 *  Okabe–Ito hues (safe for the common colour-vision deficiencies), none of them Northeastern red,
 *  which the deck keeps for "look here". */
const REGIONS = {
  sub_saharan_africa: { label: 'Sub-Saharan Africa', color: '#56b4e9' },
  south_asia: { label: 'South Asia', color: '#e69f00' },
  middle_east_north_africa: { label: 'Middle East & N. Africa', color: '#009e73' },
  east_asia_pacific: { label: 'East Asia & Pacific', color: '#cc79a7' },
  europe_central_asia: { label: 'Europe & Central Asia', color: '#f0e442' },
  america: { label: 'Americas', color: '#d0d8e2' }
};

function csvRows(file) {
  const lines = fs.readFileSync(path.join(DIR, file), 'utf8').trim().split('\n');
  const head = lines.shift().split(',');
  return lines.map(line => {
    const cells = [];
    let cur = '', quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(head.map((h, i) => [h, cells[i]]));
  });
}

/** Rosling's 2015 world: one row per country, named for the tooltip. */
function health2015() {
  return csvRows('gapminder-health-income.csv').map(r => ({
    id: r.country, name: r.country, income: Number(r.income), health: Number(r.health),
    population: Number(r.population), region: r.region, regionLabel: (REGIONS[r.region] || {}).label || r.region
  }));
}

function timeSeries() {
  return JSON.parse(fs.readFileSync(path.join(DIR, 'gapminder.json'), 'utf8'));
}

module.exports = { REGIONS, health2015, timeSeries, DIR };
