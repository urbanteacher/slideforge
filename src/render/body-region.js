/* Identify the existing owner of body content without moving its children.
 * Generic bodies are their pad's CONTENT box; campaign bodies are cp-body.
 * No lattice is inferred from either the text or a nearest-line score. */
export function declareBodyRegion(root,slide){
 const body=root.querySelector('.cp-body');
 if(body){body.dataset.bodyRegion='composition';return;}
 const pad=root.querySelector(':scope > .pad');if(!pad)return;
 pad.dataset.bodyRegion=['image','video','gallery','split','introduction'].includes(slide.type)?'media-stage':'content';
}
function origin(node,root){
 let left=0,top=0,current=node;
 while(current&&current!==root){left+=current.offsetLeft;top+=current.offsetTop;current=current.offsetParent;}
 return current===root?{left,top}:null;
}
/** Read only after attachment, fonts and media have settled in the host page.
 * Returns null for a detached/hidden stage, never a plausible zero-size answer. */
export function measureBodyRegion(root){
 if(!root?.isConnected||!root.offsetWidth||!root.offsetHeight)return null;
 const body=root.querySelector('[data-body-region]');if(!body)return null;
 const position=origin(body,root);if(!position)return null;
 const style=getComputedStyle(body),px=k=>parseFloat(style[k])||0;
 const content=body.dataset.bodyRegion==='content';
 const l=content?px('paddingLeft'):0,r=content?px('paddingRight'):0,t=content?px('paddingTop'):0,b=content?px('paddingBottom'):0;
 const rect={left:position.left+body.clientLeft+l,top:position.top+body.clientTop+t,width:Math.max(0,body.clientWidth-l-r),height:Math.max(0,body.clientHeight-t-b)};
 const css=getComputedStyle(root),token=k=>parseFloat(css.getPropertyValue(k))||0;
 const chromeTop=token('--sf-chrome-top')+token('--sf-header-h');
 const number=root.querySelector(':scope > .pagenum');
 const chromeBottom=number?root.offsetHeight-(parseFloat(getComputedStyle(number).bottom)||0)-token('--sf-footer-h'):root.offsetHeight;
 return {...rect,kind:body.dataset.bodyRegion,element:body,
  // Contact with a reserved band is a diagnostic, not a claim of text overlap.
  headerOverlap:Math.max(0,chromeTop-rect.top),footerOverlap:Math.max(0,rect.top+rect.height-chromeBottom),
  rows:body.dataset.bodyRegion==='composition'&&!root.classList.contains('chrome-regions')?16:null};
}
