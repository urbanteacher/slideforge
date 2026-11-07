#!/usr/bin/env node
/* Marylebone Road's NO2, hour by hour for 2025, read three ways: by hour of the day (weekdays and
 * weekends apart), by day of the week, and by month. Kamara and Harrison (2021) found these
 * rhythms in 2009–2018; this checks them on the latest full year.
 *
 *   node tools/ipdv-week9/fetch-hourly.mjs
 *
 * Writes tools/ipdv-week9/data/my1-patterns.json. Hours are London clock time (BST in summer),
 * converted from the network's GMT timestamps; each mean is of the hours that have a reading. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const YEAR = 2025;
const url = `https://api.erg.ic.ac.uk/AirQuality/Data/SiteSpecies/SiteCode=MY1/SpeciesCode=NO2/StartDate=${YEAR}-01-01/EndDate=${YEAR + 1}-01-01/Json`;
const res = await fetch(url);
if (!res.ok) throw new Error(`${res.status}`);
const rows = (await res.json()).RawAQData.Data.filter(r => r['@Value'] !== '');

const london = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hourCycle: 'h23', weekday: 'short', month: 'numeric', year: 'numeric' });
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const sum = () => ({ s: 0, n: 0 });
const byHour = { weekday: Array.from({ length: 24 }, sum), weekend: Array.from({ length: 24 }, sum) };
const byDay = DAYS.map(sum), byMonth = Array.from({ length: 12 }, sum);
let hours = 0;
for (const r of rows) {
  const t = new Date(r['@MeasurementDateGMT'].replace(' ', 'T') + 'Z');
  const parts = Object.fromEntries(london.formatToParts(t).map(p => [p.type, p.value]));
  if (Number(parts.year) !== YEAR) continue;
  const v = Number(r['@Value']), d = DAYS.indexOf(parts.weekday), h = Number(parts.hour), m = Number(parts.month) - 1;
  const add = o => { o.s += v; o.n++; };
  add(byHour[d >= 5 ? 'weekend' : 'weekday'][h]); add(byDay[d]); add(byMonth[m]);
  hours++;
}
const mean = o => Math.round(o.s / o.n * 10) / 10;
const out = {
  source: `London Air Quality Network (api.erg.ic.ac.uk), site MY1 Marylebone Road, NO2 hourly means, ${YEAR}, London clock time`,
  fetched: new Date().toISOString().slice(0, 10), year: YEAR, hours,
  hour: { weekday: byHour.weekday.map(mean), weekend: byHour.weekend.map(mean) },
  day: DAYS.map((d, i) => ({ day: d, no2: mean(byDay[i]) })),
  /* capture: the share of the month's hours that have a reading; under 75% is too patchy to trust alone */
  month: byMonth.map((o, i) => ({ month: i + 1, no2: mean(o), capture: Math.round(o.n / (new Date(Date.UTC(YEAR, i + 1, 1)) - new Date(Date.UTC(YEAR, i, 1))) * 3600000 * 100) }))
};
fs.writeFileSync(path.join(here, 'data/my1-patterns.json'), JSON.stringify(out, null, 1) + '\n');
console.log(hours, 'hours ·', 'weekday peak', Math.max(...out.hour.weekday), '· low', Math.min(...out.hour.weekday));
console.log('days', out.day.map(d => `${d.day} ${d.no2}`).join(', '));
console.log('months', out.month.map(m => `${m.no2} (${m.capture}%)`).join(', '));
console.log('weekday by hour', out.hour.weekday.join(' '));
console.log('weekend by hour', out.hour.weekend.join(' '));
