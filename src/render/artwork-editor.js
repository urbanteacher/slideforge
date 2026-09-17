import {bindCanvasDrag} from './canvas-split.js';
import {normalizeArtwork} from './artwork.js';
import {safeMedia} from '../deck/content.js';
/* Panel lives beside the canvas, outside its scaling. No controls enter exports.
 *
 * BESIDE, not on top. It used to mount inside #previewBox, which made it an
 * overlay covering the slide: 330x344 of a canvas that is only 360 tall at
 * Fit on a laptop, so you could not see the artwork you were positioning, and
 * its max-height was capped by the canvas it was sitting in — the lower half
 * of the panel scrolled away behind an edge with no affordance. Both faults
 * were the same mistake. It now mounts in the stage beside the canvas and
 * takes a grid column of its own, so the slide stays visible while you edit
 * it and the panel is as tall as the stage.
 *
 * Mounting outside #previewBox means the editor's redraw no longer disposes
 * of it, so a stale panel is cleared on every bind. */
export function bindArtworkEditor(box,root,slide,change){
 let selected=null,panel=null;
 const stage=box.parentElement||box;
 stage.querySelectorAll(':scope > .canvas-layers-panel').forEach(n=>n.remove());
 const staged=open=>{
  if(stage.classList.toggle('has-layers-panel',open)===open)window.SF?.applyCanvas?.();
 };
 staged(false);
 const launch=document.createElement('button');launch.type='button';launch.className='canvas-layers-launch';launch.textContent='Layers';box.appendChild(launch);
 function clearSelection(){root.classList.remove('artwork-editing');root.querySelectorAll('.artwork-move,.artwork-frame').forEach(n=>n.remove());root.querySelectorAll('.artwork-selected').forEach(n=>n.classList.remove('artwork-selected'));}
 function button(parent,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;parent.appendChild(b);return b;}
 function field(parent,label,input){input.setAttribute('aria-label',label);const wrap=document.createElement('label');wrap.textContent=label;wrap.appendChild(input);parent.appendChild(wrap);return input;}
 function close(){clearSelection();panel?.remove();panel=null;staged(false);launch.focus();}
 function commit(items,id){const label=panel?.contains(document.activeElement)?document.activeElement?.closest('label')?.firstChild?.textContent:null;slide.artwork=normalizeArtwork(items);panel?.remove();panel=null;clearSelection();change(id,label);}
 function draw(){
  panel?.remove();clearSelection();panel=document.createElement('div');panel.className='canvas-layers-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','Slide layers');
  panel.addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey)return;e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}});
  stage.appendChild(panel);staged(true);const title=document.createElement('h3');title.textContent='Layers';panel.appendChild(title);button(panel,'Close layers',close);
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
  /* Editing mode. The artwork planes are pointer-events:none so a presented
     slide behaves as it always did; objects become clickable only while the
     panel is open. Clicking the shape is how anyone expects to select it —
     before this the only way in was finding its name in the list. */
  root.classList.add('artwork-editing');
  for(const n of root.querySelectorAll('[data-artwork-id]')){
   const id=n.dataset.artworkId;
   if(id===selected)continue;
   const owner=items.find(a=>a.id===id);
   if(!owner||owner.locked)continue;
   n.addEventListener('pointerdown',e=>{e.stopPropagation();selected=id;draw();
    /* Hand focus to the new selection so the arrow keys work straight away
       without a second click. */
    root.querySelector('.artwork-frame')?.focus({preventScroll:true});});
  }
  const art=items.find(a=>a.id===selected);
  if(!art){const info=document.createElement('p');info.textContent=selected==='theme'?'Theme artwork is protected in this release. Add your own image or shape to create editable layers.':'Select a layer to edit it.';panel.appendChild(info);return;}
  const node=[...root.querySelectorAll('[data-artwork-id]')].find(n=>n.dataset.artworkId===art.id);node?.classList.add('artwork-selected');
  /* Direct manipulation. Selecting used to mean finding the object in a list,
     and resizing meant typing a percentage into a number field — you could
     not touch the thing you were changing. Everything below works in pixels
     against the slide's own box and converts to the stored percentages once,
     on release, so a scaled canvas needs no special case and the model stays
     resolution independent. */
  if(node&&!art.locked){
   const box=()=>root.getBoundingClientRect();
   /* Each gesture takes its origin from its own first move event rather than
      from a pointerdown listener. Two earlier attempts failed the same way:
      bindCanvasDrag owns onpointerdown as a property, and a sibling listener
      — whether on the node or captured on the slide — was still null by the
      time begin() ran, so every drag computed a delta from nothing and saved
      nothing. Self-contained is worth the one move event it costs. */
   /* Stored as top-left + size; rotation spins about the centre. Resizing a
      rotated object therefore moves its centre, so the maths is done on the
      centre and converted back, rather than nudging left/top and hoping. */
   const toPx=(a,r)=>({cx:(a.x+a.width/2)/100*r.width,cy:(a.y+a.height/2)/100*r.height,
                       w:a.width/100*r.width,h:a.height/100*r.height});
   const toPct=(g,r)=>({x:(g.cx-g.w/2)/r.width*100,y:(g.cy-g.h/2)/r.height*100,
                        width:g.w/r.width*100,height:g.h/r.height*100});
   const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
   const frame=document.createElement('div');frame.className='artwork-frame';frame.setAttribute('aria-hidden','true');root.appendChild(frame);
   /** @type {[string,number,number][]} */
   const HANDLES=[['nw',-1,-1],['n',0,-1],['ne',1,-1],['e',1,0],['se',1,1],['s',0,1],['sw',-1,1],['w',-1,0]];
   const paint=a=>{
    for(const el of [node,frame]){
     el.style.left=a.x+'%';el.style.top=a.y+'%';el.style.width=a.width+'%';el.style.height=a.height+'%';
     el.style.transform='rotate('+a.rotation+'deg)';
    }
   };
   let live={x:art.x,y:art.y,width:art.width,height:art.height,rotation:art.rotation};
   const reset=()=>{live={x:art.x,y:art.y,width:art.width,height:art.height,rotation:art.rotation};paint(live);};
   const save=()=>{
    const same=live.x===art.x&&live.y===art.y&&live.width===art.width&&live.height===art.height&&live.rotation===art.rotation;
    if(same)return reset();
    art.x=Math.round(live.x);art.y=Math.round(live.y);art.width=Math.round(live.width);
    art.height=Math.round(live.height);art.rotation=Math.round(live.rotation);
    commit(items,art.id);
   };
   paint(live);

   /* Drag the object itself. The old build put a Move button beside it, which
      is one more thing to aim at than the object you are already looking at. */
   let from=null,startG=null,r0=null;
   bindCanvasDrag(node,{
    begin:()=>{from=null;r0=box();startG=toPx(art,r0);},
    move:e=>{if(!from){from={x:e.clientX,y:e.clientY};return;}const g={...startG,cx:startG.cx+(e.clientX-from.x),cy:startG.cy+(e.clientY-from.y)};
             const p=toPct(g,r0);live={...live,x:clamp(p.x,0,100),y:clamp(p.y,0,100)};paint(live);},
    end:save,cancel:reset,click:null});

   for(const [name,hx,hy] of HANDLES){
    const h=document.createElement('button');h.type='button';h.className='artwork-handle artwork-handle-'+name;
    h.dataset.handle=name;h.setAttribute('aria-label','Resize '+art.name+' from the '+name);frame.appendChild(h);
    let hFrom=null,hStart=null,hr=null;
    bindCanvasDrag(h,{
     begin:()=>{hFrom=null;hr=box();hStart=toPx(art,hr);},
     move:e=>{
      if(!hFrom){hFrom={x:e.clientX,y:e.clientY};return;}
      /* Into the object's own axes, so a handle on a rotated shape pulls the
         edge the user is holding rather than a screen-aligned one. */
      const rad=-art.rotation*Math.PI/180,dx=e.clientX-hFrom.x,dy=e.clientY-hFrom.y;
      const lx=dx*Math.cos(rad)-dy*Math.sin(rad),ly=dx*Math.sin(rad)+dy*Math.cos(rad);
      const w=Math.max(8,hStart.w+hx*lx),hh=Math.max(8,hStart.h+hy*ly);
      /* The edge opposite the handle stays put: the centre moves by half of
         whatever the size actually changed by, rotated back into the page. */
      const sw=(w-hStart.w)*hx/2,sh=(hh-hStart.h)*hy/2,wr=art.rotation*Math.PI/180;
      const g={w,h:hh,cx:hStart.cx+sw*Math.cos(wr)-sh*Math.sin(wr),cy:hStart.cy+sw*Math.sin(wr)+sh*Math.cos(wr)};
      const p=toPct(g,hr);
      live={...live,x:clamp(p.x,-50,100),y:clamp(p.y,-50,100),width:clamp(p.width,1,100),height:clamp(p.height,1,100)};
      paint(live);
     },
     end:save,cancel:reset,click:null});
   }

   const spin=document.createElement('button');spin.type='button';spin.className='artwork-handle artwork-rotate';
   spin.dataset.handle='rotate';spin.setAttribute('aria-label','Rotate '+art.name);frame.appendChild(spin);
   let centre=null;
   bindCanvasDrag(spin,{
    begin:()=>{const r=box(),g=toPx(art,r);centre={x:r.left+g.cx,y:r.top+g.cy};},
    move:e=>{
     if(!centre)return;
     const deg=Math.atan2(e.clientY-centre.y,e.clientX-centre.x)*180/Math.PI+90;
     /* Shift snaps to 15 degrees, which is how you get a straight edge back. */
     const snapped=e.shiftKey?Math.round(deg/15)*15:Math.round(deg);
     live={...live,rotation:clamp(((snapped+180)%360+360)%360-180,-180,180)};paint(live);
    },
    end:save,cancel:reset,click:null});

   /* Keyboard parity: the handles are buttons, so they already take focus.
      Arrows nudge, shift makes it a bigger step, alt resizes instead. */
   frame.tabIndex=0;frame.setAttribute('aria-label','Selected artwork: '+art.name);
   frame.addEventListener('keydown',e=>{
    const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(!step||e.metaKey||e.ctrlKey)return;
    e.preventDefault();e.stopPropagation();
    const n=e.shiftKey?5:1;
    if(e.altKey)live={...live,width:clamp(live.width+step[0]*n,1,100),height:clamp(live.height+step[1]*n,1,100)};
    else live={...live,x:clamp(live.x+step[0]*n,0,100),y:clamp(live.y+step[1]*n,0,100)};
    paint(live);save();
   });
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
