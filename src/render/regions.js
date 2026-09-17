import {THEMES,resolveTheme} from '../themes.js';
/* Named chrome regions. Opt-in only: absent/unknown modes preserve authored
 * layouts. Positions are semantic values, shared by controls and future gestures. */
export const CHROME_SLOTS = ['header-left','header-center','header-right','footer-left','footer-center','footer-right'];
const DEFAULTS = {identitySlot:'header-left',logoSlot:'header-right',contextSlot:'header-center',closingSlot:'footer-left',numberSlot:'footer-right'};
export function supportsChromeRegions(SF, deck, slide) {
  const choice=SF.slideComposition(deck,slide);
  return !!(choice && SF.COMPOSITIONS[choice]?.structured);
}
export function chromePositions(design={}) {
  const result={...DEFAULTS},used=new Set();
  // Invalid imports and collisions resolve deterministically without mutation.
  for(const key of Object.keys(DEFAULTS)) {
    const wanted=CHROME_SLOTS.includes(design[key]) ? design[key] : DEFAULTS[key];
    const slot=!used.has(wanted)?wanted:CHROME_SLOTS.find(s=>!used.has(s));
    result[key]=slot;used.add(slot);
  }
  return result;
}
export function setChromeSlot(slide,key,slot) {
  if(!Object.hasOwn(DEFAULTS,key)||!CHROME_SLOTS.includes(slot))return false;
  const design=slide.design||(slide.design={}),positions=chromePositions(design),previous=positions[key];
  const occupant=Object.keys(positions).find(k=>k!==key&&positions[k]===slot);
  if(occupant)positions[occupant]=previous;
  positions[key]=slot;
  Object.assign(design,positions,{chromeLayout:'regions'});
  return true;
}
export function applyChromeRegions(root,slide,deck) {
  if(slide.design?.chromeLayout!=='regions'||!root.classList.contains('composition-structured'))return;
  const header=root.querySelector('.cp-header'),footer=root.querySelector('.cp-footer');
  if(!header||!footer)return;
  const nodes=/** @type {Record<string, HTMLElement|null>} */ ({logoSlot:root.querySelector('.slide-logo'),contextSlot:header.querySelector('.cp-beat'),closingSlot:footer.querySelector('.cp-footer-note'),numberSlot:root.querySelector('.pagenum')});
  const identity=THEMES[resolveTheme(deck.theme)].chromeIdentity;
  if(identity){const node=document.createElement('div');node.className='chrome-identity';node.textContent=identity;nodes.identitySlot=node;}
  root.classList.add('chrome-regions');root.classList.remove('has-corner-mark');
  const slots={};
  for(const name of CHROME_SLOTS){
    const slot=document.createElement('div');slot.className='chrome-slot';slot.dataset.region=name;
    (name.startsWith('header-')?header:footer).appendChild(slot);slots[name]=slot;
  }
  const positions=chromePositions(slide.design);
  for(const [key,node] of Object.entries(nodes))if(node){node.dataset.chromeItem=key;slots[positions[key]].appendChild(node);}
  for(const region of [header,footer])region.classList.toggle('region-empty',!region.querySelector('[data-chrome-item]'));
}
