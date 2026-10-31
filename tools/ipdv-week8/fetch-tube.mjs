// The Tube as a network, from TfL's open data (api.tfl.gov.uk, Line Route Sequence).
// Run once; the builder reads the file it writes, so the lecture builds offline.
//   node tools/ipdv-week8/fetch-tube.mjs
// Writes tools/ipdv-week8/data/tube.json: every Underground station (name, zone,
// lat, lon) and every pair of neighbouring stations on each line, from the
// regular service patterns. Powered by TfL Open Data (OGL v2.0).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'tube.json');
const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); };
const lines = (await get('https://api.tfl.gov.uk/Line/Mode/tube')).map(l => ({ id: l.id, name: l.name }));
const stations = new Map(), edges = new Map();
/* A station's hub: two platforms of one station (Paddington's Bakerloo and Circle) are one node. */
const name = s => s.replace(/ Underground Station$/, '').replace(/ \(H&C Line\)-Underground$/, '').replace(/ \(.*\)$/, '').trim();
for (const line of lines) {
  const d = await get(`https://api.tfl.gov.uk/Line/${line.id}/Route/Sequence/all?serviceTypes=Regular`);
  const ids = new Map();
  for (const seq of d.stopPointSequences) for (const s of seq.stopPoint) {
    const key = name(s.name);
    ids.set(s.id, key);
    const prev = stations.get(key);
    stations.set(key, { name: key, zone: s.zone || prev?.zone || '', lat: s.lat, lon: s.lon, lines: [...new Set([...(prev?.lines || []), line.id])] });
  }
  for (const route of d.orderedLineRoutes) {
    const seq = route.naptanIds.map(id => ids.get(id)).filter(Boolean);
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] === seq[i - 1]) continue;
      const [a, b] = [seq[i - 1], seq[i]].sort();
      edges.set(`${a}|${b}|${line.id}`, { source: a, target: b, line: line.id });
    }
  }
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({
  source: 'Powered by TfL Open Data (api.tfl.gov.uk), Open Government Licence v2.0', fetched: new Date().toISOString().slice(0, 10),
  lines, stations: [...stations.values()].sort((a, b) => a.name.localeCompare(b.name)), edges: [...edges.values()]
}, null, 1));
console.log(`${stations.size} stations, ${edges.size} line links, ${lines.length} lines -> ${path.relative(process.cwd(), out)}`);
