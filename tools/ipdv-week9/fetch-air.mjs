#!/usr/bin/env node
/* Week 9's data, fetched once: every London Air Quality Network monitor's
 * nitrogen dioxide (NO2) annual mean, 2010 to 2025, from the network's open
 * API (Environmental Research Group, Imperial College London; data managed
 * for the boroughs and Defra).
 *
 *   node tools/ipdv-week9/fetch-air.mjs
 *
 * Writes tools/ipdv-week9/data/no2.json. A year counts only when the monitor
 * captured at least 75% of the hours, the rule the annual statistics use. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'data/no2.json');
const YEARS = Array.from({ length: 16 }, (_, i) => 2010 + i);
const list = v => (Array.isArray(v) ? v : v ? [v] : []);

const sites = {};
for (const year of YEARS) {
  const url = `https://api.erg.ic.ac.uk/AirQuality/Annual/MonitoringObjective/GroupName=London/Year=${year}/json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${year}: ${res.status}`);
  const body = await res.json();
  let n = 0;
  for (const s of list(body.SiteObjectives && body.SiteObjectives.Site)) {
    const no2 = list(s.Objective).filter(o => o['@SpeciesCode'] === 'NO2');
    const mean = no2.find(o => /annual mean/.test(o['@ObjectiveName']));
    const capture = no2.find(o => /Capture Rate/.test(o['@ObjectiveName']));
    if (!mean || mean['@Value'] === '' || !capture || Number(capture['@Value']) < 75) continue;
    const code = s['@SiteCode'];
    sites[code] = sites[code] || { code, name: s['@SiteName'], type: s['@SiteType'], lat: Number(s['@Latitude']), lon: Number(s['@Longitude']), no2: {} };
    sites[code].no2[year] = Number(mean['@Value']);
    n++;
  }
  console.log(year, n, 'monitors');
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  source: 'London Air Quality Network (api.erg.ic.ac.uk), NO2 annual mean in µg/m³, monitors with at least 75% data capture',
  fetched: new Date().toISOString().slice(0, 10), years: YEARS, sites: Object.values(sites)
}, null, 1) + '\n');
console.log(Object.keys(sites).length, 'monitors →', path.relative(process.cwd(), OUT));
