#!/usr/bin/env node
'use strict';
// Export the native lesson with embedded checks and portable image assets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const storage = new Map();
global.localStorage = {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
global.window = {localStorage:global.localStorage};
require('../js/model.js');
require('../js/lessons.js');
const SF = window.SF;
const deck = SF.buildLesson('ipdv-vc');
const games = [...new Set(deck.slides.map(s=>s.gameId).filter(Boolean))].map(id=>SF.GameStore.get(id));
function embed(value) {
  if(Array.isArray(value))return value.map(embed);
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,embed(v)]));
  if(typeof value==='string' && /^assets\/.*\.(png|jpe?g|gif|svg|webp)$/i.test(value)){
    const ext=path.extname(value).slice(1).toLowerCase();
    const mime=ext==='jpg'?'jpeg':ext==='svg'?'svg+xml':ext;
    return 'data:image/'+mime+';base64,'+fs.readFileSync(path.join(root,value)).toString('base64');
  }
  return value;
}
const bundle={kind:'slideforge-bundle',version:1,exported:new Date().toISOString(),decks:[embed(SF.normalizeDeck(deck))],games:games.map(SF.normalizeGame)};
const file=path.join(root,'lessons/02_Lecture_IPDV_Visual_Communication.sfbundle.json');
fs.writeFileSync(file,JSON.stringify(bundle,null,2)+'\n');
console.log(`${deck.slides.length} slides, ${games.length} checks. Portable bundle: ${file}`);
