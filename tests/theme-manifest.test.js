'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {}, console, localStorage: {getItem(){return null;},setItem(){},removeItem(){}} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../js/model.js'),'utf8'),context);
const SF=context.window.SF;

test('every theme declares valid ground, art and compatible composition defaults',()=>{
 for(const [key,theme] of Object.entries(SF.THEMES)){
  assert.ok(theme.name,key);assert.match(theme.swatch,/^#[a-f\d]{6}$/i,key);
  assert.ok(Object.hasOwn(theme,'ground'),key);
  const ground=theme.ground;
  if(typeof ground==='object'){
   assert.ok(Object.hasOwn(ground,'default'),key);
   for(const [layout,value] of Object.entries(ground)){
    assert.ok(['light','dark'].includes(value),key+': '+layout);
    if(layout!=='default')assert.ok(SF.SLIDE_TYPES[layout],key+': '+layout);
   }
  }else assert.ok(['light','dark'].includes(ground),key);
  assert.ok(Object.hasOwn(theme,'art'),key);
  if(theme.art){
   assert.match(theme.art.className,/^[a-z][a-z\d-]*$/);assert.equal(typeof theme.art.html,'string');
   assert.ok(theme.art.layouts.length);
   for(const layout of theme.art.layouts)assert.ok(SF.SLIDE_TYPES[layout],key+': '+layout);
  }
  assert.equal(typeof theme.defaults,'object',key);
  for(const [layout,composition] of Object.entries(theme.defaults)){
   assert.ok(SF.COMPOSITIONS[composition]?.types.includes(layout),key+': '+composition);
   assert.equal(SF.slideComposition({theme:key},{type:layout}),composition);
  }
 }
});
test('mixed themes resolve each slide independently and boards use the default',()=>{
 for(const type of ['title','section','quote'])assert.equal(SF.themeGround('northeastern',type),'dark');
 assert.equal(SF.themeGround('northeastern','content'),'light');
 for(const key of Object.keys(SF.THEMES).filter(k=>k.startsWith('aiad27-'))){
  for(const type of ['quote','journey'])assert.equal(SF.themeGround(key,type),'dark');
  for(const type of ['title','cards','statement','keyfact','chart','question',undefined])assert.equal(SF.themeGround(key,type),'light');
 }
 assert.equal(SF.themeGround('midnight','title'),'dark');
 assert.equal(SF.themeGround('missing','title'),'light');
 assert.equal(SF.themeGround('northeastern','unknown'),'light');
});

test('factories and normalization share one fallback without changing saved themes',()=>{
 assert.equal(SF.makeDeck().theme,SF.DEFAULT_THEME);
 assert.equal(SF.makeGame().theme,SF.DEFAULT_THEME);
 for(const theme of [undefined,'retired','toString']){
  assert.equal(SF.resolveTheme(theme),SF.DEFAULT_THEME);
  assert.equal(SF.normalizeDeck({theme}).theme,SF.DEFAULT_THEME);
  assert.equal(SF.normalizeGame({theme}).theme,SF.DEFAULT_THEME);
 }
 for(const theme of Object.keys(SF.THEMES)){
  assert.equal(SF.normalizeDeck({theme}).theme,theme);
  assert.equal(SF.normalizeGame({theme}).theme,theme);
 }
});
