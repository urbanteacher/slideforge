import {imagePlacement,setImagePlacement} from '../deck/content.js';
const SHARES=[35,50,65];
const opposite={left:'right',right:'left',top:'bottom',bottom:'top'};
const snap=value=>SHARES.reduce((best,n)=>Math.abs(n-value)<Math.abs(best-value)?n:best,50);
/* A gesture previews DOM only. Saving happens once, on a valid drop; Cancel
 * and lost capture restore it, so history never records intermediate moves. */
export function bindCanvasDrag(handle,{begin,move,end,cancel,click}) {
  let origin=null,started=false,suppress=false;
  function abort(){if(origin){suppress=started;origin=null;started=false;cancel();}}
  handle.onpointerdown=e=>{if(e.button!==0)return;e.stopPropagation();handle.focus();suppress=false;origin={x:e.clientX,y:e.clientY};handle.setPointerCapture(e.pointerId);};
  handle.onpointermove=e=>{if(!origin)return;if(!started&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)>5){started=true;begin();}if(started)move(e);};
  handle.onpointerup=e=>{if(!origin)return;origin=null;if(started){started=false;suppress=true;end(e);}};
  handle.onpointercancel=abort;handle.onlostpointercapture=abort;
  handle.onclick=e=>{e.stopPropagation();if(suppress){suppress=false;return;}if(click)click();};
  handle.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();abort();}});
}
export function bindCanvasSplit(root,slide,actions) {
  if(slide.type!=='split')return;
  const pad=root.querySelector('.split-pad'),media=root.querySelector('.split-media'),copy=root.querySelector('.split-copy');
  if(!pad||!media||!copy)return;
  root.classList.add('canvas-split');
  let chooser=null;
  function close(){chooser?.remove();chooser=null;}
  function button(parent,label,id){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.splitTool=id;b.setAttribute('aria-label',label);parent.appendChild(b);return b;}
  function tools(parent){const bar=document.createElement('div');bar.className='canvas-split-tools';parent.appendChild(bar);return bar;}
  const mediaTools=tools(media),copyTools=tools(copy);
  let selected=slide.title?'title':(slide.bullets?.length?'bullets.0':'title');
  const edit=button(copyTools,'Edit text','edit-text');edit.onclick=e=>{e.stopPropagation();close();actions.edit(selected);};
  copy.querySelectorAll('[data-content-key]').forEach(field=>field.addEventListener('click',e=>{
    e.stopPropagation();selected=field.dataset.contentKey;
    copy.querySelectorAll('.canvas-field-selected').forEach(n=>n.classList.remove('canvas-field-selected'));
    field.classList.add('canvas-field-selected');edit.textContent=selected==='title'?'Edit heading':'Edit point';
  }));
  const image=button(mediaTools,'Edit image','edit-image');image.onclick=e=>{e.stopPropagation();close();actions.image();};
  for(const [kind,bar] of [['image',mediaTools],['text',copyTools]]){
    const handle=button(bar,'Move '+kind,'move-'+kind);handle.style.touchAction='none';handle.title='Drag to a region or click to choose';
    const commitPlacement=(slot)=>{if(!Object.hasOwn(opposite,slot))return;const placement=kind==='image'?slot:opposite[slot];close();if(placement!==imagePlacement(slide)){setImagePlacement(slide,placement);actions.change('move-'+kind);}else handle.focus();};
    function show(keyboard){
      close();chooser=document.createElement('div');chooser.className='canvas-split-targets';chooser.setAttribute('role','group');chooser.setAttribute('aria-label','Place '+kind);
      const positions=['left','top','right','bottom'];
      positions.forEach((slot,i)=>{
        const target=button(chooser,'Place '+kind+' '+({top:'above',bottom:'below'}[slot]||slot),'target-'+slot);target.dataset.splitTarget=slot;
        target.onclick=e=>{e.stopPropagation();commitPlacement(slot);};
        target.onkeydown=e=>{if(e.metaKey||e.ctrlKey)return;e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();handle.focus();}const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1}[e.key];if(delta){e.preventDefault();chooser.querySelectorAll('button')[(i+delta+4)%4].focus();}};
      });
      const hint=document.createElement('span');hint.className='split-target-hint';hint.textContent='Move '+kind+' · Esc cancels';chooser.appendChild(hint);root.appendChild(chooser);
      if(keyboard)chooser.querySelector('button')?.focus();
    }
    function hit(e){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-split-target]');return target&&chooser?.contains(target)?target:null;}
    bindCanvasDrag(handle,{begin:()=>show(false),move:e=>{const target=hit(e);chooser.querySelectorAll('button').forEach(b=>b.classList.toggle('snap-active',b===target));},end:e=>{const target=hit(e);if(target)commitPlacement(target.getAttribute('data-split-target'));else{close();handle.focus();}},cancel:()=>{close();handle.focus();},click:()=>show(true)});
  }
  const divider=document.createElement('div');divider.className='canvas-split-divider';divider.tabIndex=0;divider.setAttribute('role','slider');divider.setAttribute('aria-label','Image share');divider.setAttribute('aria-valuemin','35');divider.setAttribute('aria-valuemax','65');divider.dataset.splitTool='resize';pad.appendChild(divider);
  const placement=imagePlacement(slide),vertical=['top','bottom'].includes(placement),first=['left','top'].includes(placement);
  divider.classList.toggle('horizontal',vertical);divider.setAttribute('aria-orientation',vertical?'vertical':'horizontal');
  let original=SHARES.includes(slide.design?.imageShare)?slide.design.imageShare:50,pending=original;
  function paint(value){
    const edge=first?value:100-value;
    divider.style[vertical?'top':'left']=edge+'%';divider.setAttribute('aria-valuenow',String(value));divider.setAttribute('aria-valuetext',value+' percent image');divider.textContent=value+'%';
  }
  function reset(){media.style.flex='0 0 '+original+'%';pending=original;paint(original);root.classList.remove('resizing-split');}
  function commitShare(){root.classList.remove('resizing-split');if(pending!==original){slide.design=slide.design||{};slide.design.imageShare=pending;actions.change('resize');}else reset();}
  paint(original);
  bindCanvasDrag(divider,{begin:()=>{close();root.classList.add('resizing-split');},move:e=>{
    const rect=pad.getBoundingClientRect(),fraction=vertical?(e.clientY-rect.top)/rect.height:(e.clientX-rect.left)/rect.width;
    pending=snap((first?fraction:1-fraction)*100);media.style.flex='0 0 '+pending+'%';paint(pending);
  },end:e=>{const r=pad.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)reset();else commitShare();},cancel:reset,click:null});
  divider.addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey)return;e.stopPropagation();
    const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];
    if(delta||e.key==='Home'||e.key==='End'){e.preventDefault();pending=e.key==='Home'?35:e.key==='End'?65:SHARES[Math.max(0,Math.min(2,SHARES.indexOf(original)+delta))];commitShare();}
  });
}
