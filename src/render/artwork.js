import {safeMedia} from '../deck/content.js';
const bounded=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
/** Decorative objects are separate from responsive content/composition regions.
 * Invalid imports are normalised on load and again at the rendering boundary. */
/** @returns {import('../types.js').ArtworkLayer[]} */
export function normalizeArtwork(raw){
 if(!Array.isArray(raw))return [];
 const ids=new Set();
 return raw.slice(0,40).filter(a=>a&&['image','rectangle','circle'].includes(a.kind)).map((a,i)=>{
  let id=typeof a.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(a.id)?a.id:'art-'+i;
  while(ids.has(id))id+='-copy';ids.add(id);
  return {id,name:String(a.name||a.kind).slice(0,100),kind:a.kind,src:safeMedia(a.src||''),color:/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#77bfa3',plane:a.plane==='front'?'front':'back',hidden:a.hidden===true,locked:a.locked===true,x:bounded(a.x,0,100,65),y:bounded(a.y,0,100,55),width:bounded(a.width,1,100,25),height:bounded(a.height,1,100,30),opacity:bounded(a.opacity,0,100,100),rotation:bounded(a.rotation,-180,180,0),fit:a.fit==='cover'?'cover':'contain'};
 });
}
export function renderArtwork(root,slide){
 const items=normalizeArtwork(slide.artwork);if(!items.some(a=>!a.hidden))return;
 root.classList.add('has-user-artwork');
 for(const plane of ['back','front']){
  const layer=document.createElement('div');layer.className='artwork-plane artwork-'+plane;layer.setAttribute('aria-hidden','true');
  for(const art of items.filter(a=>a.plane===plane&&!a.hidden)){
   const node=document.createElement('div');node.className='artwork-object artwork-'+art.kind;node.dataset.artworkId=art.id;
   Object.assign(node.style,{left:art.x+'%',top:art.y+'%',width:art.width+'%',height:art.height+'%',opacity:String(art.opacity/100),transform:'rotate('+art.rotation+'deg)'});
   if(art.kind==='image'){if(art.src){const img=document.createElement('img');img.src=art.src;img.alt='';img.draggable=false;img.style.objectFit=art.fit;node.appendChild(img);}}
   else node.style.background=art.color;
   layer.appendChild(node);
  }root.appendChild(layer);
 }
}
