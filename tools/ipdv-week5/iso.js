'use strict';
// Gapminder country name -> ISO 3166-1 numeric code, for joining the
// vega-datasets Gapminder files onto world-110m.json (geometry id = ISO numeric).
// Names are spelled exactly as in gapminder-health-income.csv and gapminder.json.
// world-110m has a few id -99 shapes (Kosovo, Northern Cyprus, Somaliland); none is a Gapminder name.

const fs = require('fs');
const path = require('path');

const ISO = {
  'Afghanistan': 4, 'Albania': 8, 'Algeria': 12, 'Andorra': 20, 'Angola': 24,
  'Antigua and Barbuda': 28, 'Argentina': 32, 'Armenia': 51, 'Australia': 36, 'Austria': 40,
  'Azerbaijan': 31, 'Bahamas': 44, 'Bahrain': 48, 'Bangladesh': 50, 'Barbados': 52,
  'Belarus': 112, 'Belgium': 56, 'Belize': 84, 'Benin': 204, 'Bhutan': 64,
  'Bolivia': 68, 'Bosnia and Herzegovina': 70, 'Botswana': 72, 'Brazil': 76, 'Brunei': 96,
  'Bulgaria': 100, 'Burkina Faso': 854, 'Burundi': 108, 'Cambodia': 116, 'Cameroon': 120,
  'Canada': 124, 'Cape Verde': 132, 'Central African Republic': 140, 'Chad': 148, 'Chile': 152,
  'China': 156, 'Colombia': 170, 'Comoros': 174, 'Congo, Dem. Rep.': 180, 'Congo, Rep.': 178,
  'Costa Rica': 188, "Cote d'Ivoire": 384, 'Croatia': 191, 'Cuba': 192, 'Cyprus': 196,
  'Czech Republic': 203, 'Denmark': 208, 'Djibouti': 262, 'Dominica': 212, 'Dominican Republic': 214,
  'Ecuador': 218, 'Egypt': 818, 'El Salvador': 222, 'Equatorial Guinea': 226, 'Eritrea': 232,
  'Estonia': 233, 'Ethiopia': 231, 'Fiji': 242, 'Finland': 246, 'France': 250,
  'Gabon': 266, 'Gambia': 270, 'Georgia': 268, 'Germany': 276, 'Ghana': 288,
  'Greece': 300, 'Grenada': 308, 'Guatemala': 320, 'Guinea': 324, 'Guinea-Bissau': 624,
  'Guyana': 328, 'Haiti': 332, 'Honduras': 340, 'Hong Kong, China': 344, 'Hungary': 348,
  'Iceland': 352, 'India': 356, 'Indonesia': 360, 'Iran': 364, 'Iraq': 368,
  'Ireland': 372, 'Israel': 376, 'Italy': 380, 'Jamaica': 388, 'Japan': 392,
  'Jordan': 400, 'Kazakhstan': 398, 'Kenya': 404, 'Kiribati': 296, 'Kuwait': 414,
  'Kyrgyz Republic': 417, 'Lao': 418, 'Latvia': 428, 'Lebanon': 422, 'Lesotho': 426,
  'Liberia': 430, 'Libya': 434, 'Lithuania': 440, 'Luxembourg': 442, 'Macedonia, FYR': 807,
  'Madagascar': 450, 'Malawi': 454, 'Malaysia': 458, 'Maldives': 462, 'Mali': 466,
  'Malta': 470, 'Marshall Islands': 584, 'Mauritania': 478, 'Mauritius': 480, 'Mexico': 484,
  'Micronesia, Fed. Sts.': 583, 'Moldova': 498, 'Mongolia': 496, 'Montenegro': 499, 'Morocco': 504,
  'Mozambique': 508, 'Myanmar': 104, 'Namibia': 516, 'Nepal': 524, 'Netherlands': 528,
  'New Zealand': 554, 'Nicaragua': 558, 'Niger': 562, 'Nigeria': 566, 'North Korea': 408,
  'Norway': 578, 'Oman': 512, 'Pakistan': 586, 'Panama': 591, 'Papua New Guinea': 598,
  'Paraguay': 600, 'Peru': 604, 'Philippines': 608, 'Poland': 616, 'Portugal': 620,
  'Qatar': 634, 'Romania': 642, 'Russia': 643, 'Rwanda': 646, 'Samoa': 882,
  'Sao Tome and Principe': 678, 'Saudi Arabia': 682, 'Senegal': 686, 'Serbia': 688, 'Seychelles': 690,
  'Sierra Leone': 694, 'Singapore': 702, 'Slovak Republic': 703, 'Slovenia': 705, 'Solomon Islands': 90,
  'Somalia': 706, 'South Africa': 710, 'South Korea': 410, 'South Sudan': 728, 'Spain': 724,
  'Sri Lanka': 144, 'St. Lucia': 662, 'St. Vincent and the Grenadines': 670, 'Sudan': 729, 'Suriname': 740,
  'Swaziland': 748, 'Sweden': 752, 'Switzerland': 756, 'Syria': 760, 'Taiwan': 158,
  'Tajikistan': 762, 'Tanzania': 834, 'Thailand': 764, 'Timor-Leste': 626, 'Togo': 768,
  'Tonga': 776, 'Trinidad and Tobago': 780, 'Tunisia': 788, 'Turkey': 792, 'Turkmenistan': 795,
  'Uganda': 800, 'Ukraine': 804, 'United Arab Emirates': 784, 'United Kingdom': 826, 'United States': 840,
  'Uruguay': 858, 'Uzbekistan': 860, 'Vanuatu': 548, 'Venezuela': 862, 'Vietnam': 704,
  'West Bank and Gaza': 275, // ISO "Palestine, State of"
  'Yemen': 887, 'Zambia': 894, 'Zimbabwe': 716,
};

function isoFor(name) {
  return Object.prototype.hasOwnProperty.call(ISO, name) ? ISO[name] : null;
}

// Parse one CSV line, honouring double quotes ("Congo, Dem. Rep.").
function csvLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const DATA = path.join(__dirname, '..', '..', 'node_modules', 'vega-datasets', 'data');

function dataNames() {
  const names = new Set();
  const lines = fs.readFileSync(path.join(DATA, 'gapminder-health-income.csv'), 'utf8').trim().split(/\r?\n/);
  const col = csvLine(lines[0]).indexOf('country');
  for (const l of lines.slice(1)) if (l.trim()) names.add(csvLine(l)[col]);
  for (const r of JSON.parse(fs.readFileSync(path.join(DATA, 'gapminder.json'), 'utf8'))) names.add(r.country);
  return [...names].sort();
}

function check() {
  const world = JSON.parse(fs.readFileSync(path.join(DATA, 'world-110m.json'), 'utf8'));
  const ids = new Set(world.objects.countries.geometries.map((g) => g.id).filter((id) => id != null && id !== -99).map(Number));
  const missingName = [], noShape = [];
  let shapes = 0;
  for (const n of dataNames()) {
    const code = isoFor(n);
    if (code == null) missingName.push(n);
    else if (ids.has(code)) shapes++;
    else noShape.push(n);
  }
  return { missingName, noShape, shapes };
}

module.exports = { ISO, isoFor, check };
