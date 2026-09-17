import {bindCanvasDrag} from './canvas-split.js';
import {normalizeArtwork} from './artwork.js';
import {safeMedia} from '../deck/content.js';
/* Panel lives beside the canvas, outside its scaling. No controls enter exports. */
export function bindArtworkEditor(box,root,slide,change){
 let selected=null,panel=null;
 const launch=document.createElement('button');launch.type='button';launch.className='canvas-layers-launch';launch.textContent='Layers';box.appendChild(launch);
 function clearSelection(){root.querySelectorAll('.artwork-move').forEach(n=>n.remove());root.querySelectorAll('.artwork-selected').forEach(n=>n.classList.remove('artwork-selected'));}
 function button(parent,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;parent.appendChild(b);return b;}
 function field(parent,label,input){input.setAttribute('aria-label',label);const wrap=document.createElement('label');wrap.textContent=label;wrap.appendChild(input);parent.appendChild(wrap);return input;}
 function close(){clearSelection();panel?.remove();panel=null;launch.focus();}
 function commit(items,id){const label=panel?.contains(document.activeElement)?document.activeElement?.closest('label')?.firstChild?.textContent:null;slide.artwork=normalizeArtwork(items);panel?.remove();panel=null;clearSelection();change(id,label);}
 function draw(){
  panel?.remove();clearSelection();panel=document.createElement('div');panel.className='canvas-layers-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','Slide layers');
  panel.addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey)return;e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}});
  box.appendChild(panel);const title=document.createElement('h3');title.textContent='Layers';panel.appendChild(title);button(panel,'Close layers',close);
  const hint=document.createElement('p');hint.textContent='Artwork is decorative. Content stays in its layout. Top items appear in front.';panel.appendChild(hint);
  const items=normalizeArtwork(slide.artwork);
  function list(plane){
   const heading=document.createElement('h4');heading.textContent=plane==='front'?'In front of content':'Behind content';panel.appendChild(heading);
   [...items].reverse().filter(a=>a.plane===plane).forEach(a=>{const row=button(panel,a.name+(a.hidden?' · hidden':'')+(a.locked?' · locked':''),()=>{selected=a.id;draw();});row.className='layer-row';row.dataset.layerId=a.id;row.setAttribute('aria-pressed',String(selected===a.id));});
  }
  list('front');const content=document.createElement('p');content.className='layer-fixed';content.textContent='Slide content · managed by layout';panel.appendChild(content);list('back');
  // Describe existing DOM and CSS artwork as a locked group without changing it.
  const theme=root.querySelector('.theme-art');
  const pseudo=['::before','::after'].some(p=>{const s=getComputedStyle(root,p);return s.content!=='none'&&s.content!=='normal'&&s.display!=='none';});
  if(theme||pseudo){const themeButton=button(panel,'Theme artwork · locked',()=>{selected='theme';draw();if(theme)theme.classList.add('artwork-selected');});themeButton.className='layer-row';themeButton.setAttribute('aria-pressed',String(selected==='theme'));}
  const add=document.createElement('div');add.className='layer-add';panel.appendChild(add);
  for(const kind of ['rectangle','circle','image'])button(add,'Add '+kind,()=>{const id='art-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);commit([...items,{id,kind,name:kind==='image'?'New image':'New '+kind}],id);}).disabled=items.length>=40;
  const art=items.find(a=>a.id===selected);
  if(!art){const info=document.createElement('p');info.textContent=selected==='theme'?'Theme artwork is protected in this release. Add your own image or shape to create editable layers.':'Select a layer to edit it.';panel.appendChild(info);return;}
  const node=[...root.querySelectorAll('[data-artwork-id]')].find(n=>n.dataset.artworkId===art.id);node?.classList.add('artwork-selected');
  if(node&&!art.locked){
   const handle=document.createElement('button');handle.type='button';handle.className='artwork-move';handle.textContent='Move';handle.setAttribute('aria-label','Move artwork');root.appendChild(handle);
   const original={x:art.x,y:art.y};let origin=null,next={...original};
   const paint=point=>{node.style.left=point.x+'%';node.style.top=point.y+'%';handle.style.left=point.x+'%';handle.style.top=point.y+'%';};paint(original);
   handle.addEventListener('pointerdown',e=>{origin={x:e.clientX,y:e.clientY};});
   bindCanvasDrag(handle,{begin:()=>{},move:e=>{if(!origin)return;const r=root.getBoundingClientRect();next={x:Math.max(0,Math.min(100,original.x+(e.clientX-origin.x)/r.width*100)),y:Math.max(0,Math.min(100,original.y+(e.clientY-origin.y)/r.height*100))};paint(next);},end:()=>{if(next.x===original.x&&next.y===original.y)return;art.x=Math.round(next.x);art.y=Math.round(next.y);commit(items,art.id);},cancel:()=>paint(original),click:null});
  }
  const edit=document.createElement('div');edit.className='layer-properties';panel.appendChild(edit);
  const write=(key,value)=>{art[key]=value;commit(items,art.id);};
  const name=document.createElement('input');name.value=art.name;name.disabled=art.locked;name.onchange=()=>write('name',name.value);field(edit,'Layer name',name);
  for(const [key,label] of [['hidden','Hidden'],['locked','Locked']]){const input=document.createElement('input');input.type='checkbox';input.checked=art[key];input.onchange=()=>write(key,input.checked);field(edit,label,input);}
  const props=document.createElement('fieldset');props.disabled=art.locked;edit.appendChild(props);
  const plane=document.createElement('select');for(const [value,label] of [['back','Behind content'],['front','In front of content']]){const option=document.createElement('option');option.value=value;option.textContent=label;plane.appendChild(option);}plane.value=art.plane;plane.onchange=()=>write('plane',plane.value);field(props,'Layer group',plane);
  const peers=items.filter(a=>a.plane===art.plane),index=peers.indexOf(art);
  const reorder=(delta)=>{const other=peers[index+delta];if(!other)return;const a=items.indexOf(art),b=items.indexOf(other);[items[a],items[b]]=[items[b],items[a]];commit(items,art.id);};
  button(props,'Bring forward',()=>reorder(1)).disabled=index===peers.length-1;button(props,'Send backward',()=>reorder(-1)).disabled=index===0;
  for(const [key,label,min,max] of [['x','Horizontal position (%)',0,100],['y','Vertical position (%)',0,100],['width','Width (%)',1,100],['height','Height (%)',1,100],['opacity','Opacity (%)',0,100],['rotation','Rotation (degrees)',-180,180]]){
   const input=document.createElement('input');input.type='number';input.min=String(min);input.max=String(max);input.value=String(art[key]);input.onchange=()=>{const value=Number(input.value);if(input.value!==''&&Number.isFinite(value))write(key,Math.max(Number(min),Math.min(Number(max),value)));};field(props,String(label),input);
  }
  if(art.kind==='image'){
   const source=document.createElement('input');source.value=art.src;field(props,'Image source',source);source.onchange=()=>{const value=safeMedia(source.value);if(value||!source.value.trim())write('src',value);else source.setCustomValidity('Use an image URL or asset path.');};
   const upload=document.createElement('input');upload.type='file';upload.accept='image/*';field(props,'Upload image',upload);
   const status=document.createElement('p');status.setAttribute('role','status');props.appendChild(status);
   upload.onchange=()=>{const file=upload.files?.[0];if(!file)return;if(file.size>3.5*1024*1024){status.textContent='Choose an image smaller than 3.5 MB.';return;}const owner=panel,reader=new FileReader();status.textContent='Reading image…';reader.onerror=()=>{status.textContent='Could not read that file.';};reader.onload=()=>{const src=String(reader.result||''),img=new Image();img.onload=()=>{if(owner?.isConnected)write('src',src);};img.onerror=()=>{status.textContent='Could not decode that image.';};img.src=src;};reader.readAsDataURL(file);};
   const fit=document.createElement('select');for(const value of ['contain','cover']){const option=document.createElement('option');option.value=value;option.textContent=value==='contain'?'Fit whole image':'Fill and crop';fit.appendChild(option);}fit.value=art.fit;fit.onchange=()=>write('fit',fit.value);field(props,'Image fit',fit);
  }else{const color=document.createElement('input');color.type='color';color.value=art.color;color.onchange=()=>write('color',color.value);field(props,'Fill colour',color);}
  button(props,'Delete layer',()=>commit(items.filter(a=>a.id!==art.id),null));
 }
 launch.onclick=()=>{selected=null;draw();panel?.querySelector('button')?.focus();};
 return {open(id,focusLabel){selected=id;draw();const label=[...(panel?.querySelectorAll('label')||[])].find(n=>n.firstChild?.textContent===focusLabel);const input=label?.querySelector('input,select');if(input)/** @type {HTMLElement} */ (input).focus();else panel?.querySelector('button')?.focus();}};
}
