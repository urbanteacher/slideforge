import {CHROME_SLOTS,chromePositions,setChromeSlot} from './regions.js';
const LABELS={identitySlot:'theme identity',logoSlot:'logo',contextSlot:'slide context',closingSlot:'closing text',numberSlot:'page number'};
const slotLabel=slot=>slot.replace('-', ' ').replace('center','centre');
/* Editor-only affordances. The shared renderer/export never receives handles.
 * Pointer coordinates select a declared target; only slot names are saved. */
export function bindCanvasRegions(root,slide,onChange) {
  if(!root.classList.contains('chrome-regions'))return;
  let overlay=null,active=null;
  function dismiss(focus=true){
    overlay?.remove();overlay=null;
    if(active){active.setAttribute('aria-expanded','false');if(focus)active.focus();}
    active=null;
  }
  function commit(key,slot){
    if(chromePositions(slide.design)[key]===slot){dismiss();return;}
    dismiss(false);
    if(setChromeSlot(slide,key,slot))onChange(key);
  }
  function show(handle,key,keyboard){
    dismiss(false);active=handle;handle.setAttribute('aria-expanded','true');
    overlay=document.createElement('div');overlay.className='canvas-region-targets';
    overlay.setAttribute('role','group');overlay.setAttribute('aria-label','Choose a position for '+LABELS[key]);
    const positions=chromePositions(slide.design);
    for(const [i,slot] of CHROME_SLOTS.entries()){
      const button=document.createElement('button');button.type='button';button.dataset.snapSlot=slot;
      button.style.gridColumn=String(i%3+1);button.style.gridRow=i<3?'1':'3';
      const occupant=Object.keys(positions).find(k=>k!==key&&positions[k]===slot&&root.querySelector('[data-chrome-item='+k+']'));
      button.textContent=slotLabel(slot)+(occupant?' · swap '+LABELS[occupant]:'');
      button.setAttribute('aria-label','Move '+LABELS[key]+' to '+slotLabel(slot)+(occupant?', swap with '+LABELS[occupant]:''));
      button.onclick=e=>{e.stopPropagation();commit(key,slot);};
      button.onkeydown=e=>{
        if(e.metaKey||e.ctrlKey)return;
        e.stopPropagation();
        if(e.key==='Escape'){e.preventDefault();dismiss();}
        const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3}[e.key];
        if(delta){e.preventDefault();const buttons=overlay.querySelectorAll('button');buttons[(i+delta+6)%6].focus();}
      };
      overlay.appendChild(button);
    }
    const hint=document.createElement('div');hint.className='canvas-region-hint';hint.textContent='Choose a slot · occupied items swap · Esc cancels';hint.setAttribute('role','status');overlay.appendChild(hint);
    root.appendChild(overlay);
    if(keyboard)/** @type {HTMLButtonElement|null} */ (overlay.querySelector('button[data-snap-slot="'+positions[key]+'"]'))?.focus();
  }
  root.querySelectorAll('[data-chrome-item]').forEach(item=>{
    const key=item.dataset.chromeItem,handle=document.createElement('button');
    handle.type='button';handle.className='canvas-region-handle';handle.dataset.moveItem=key;handle.textContent='✥';
    handle.title='Drag '+LABELS[key]+' to a slot, or click to choose';handle.setAttribute('aria-label','Move '+LABELS[key]);handle.setAttribute('aria-expanded','false');
    // Attach to its slot so the mark keeps its own sizing and pointer policy.
    item.parentElement.appendChild(handle);
    let start=null,dragging=false,suppressClick=false;
    function hit(e){return document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-snap-slot]');}
    function cancel(){if(start||dragging)suppressClick=true;start=null;dragging=false;dismiss();}
    handle.onpointerdown=e=>{
      if(e.button!==0)return;e.stopPropagation();suppressClick=false;
      start={x:e.clientX,y:e.clientY};handle.setPointerCapture(e.pointerId);
    };
    handle.onpointermove=e=>{
      if(!start)return;
      if(!dragging&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>5){dragging=true;show(handle,key,false);}
      if(!dragging)return;
      const target=hit(e);overlay.querySelectorAll('button').forEach(b=>b.classList.toggle('snap-active',b===target));
    };
    handle.onpointerup=e=>{
      if(!start)return;start=null;
      if(!dragging)return;dragging=false;suppressClick=true;
      const target=hit(e);
      if(target&&overlay?.contains(target))commit(key,target.getAttribute('data-snap-slot'));else dismiss();
    };
    handle.onpointercancel=cancel;
    handle.onlostpointercapture=()=>{if(start)cancel();};
    handle.onkeydown=e=>{if(e.metaKey||e.ctrlKey)return;e.stopPropagation();if(e.key==='Escape'){e.preventDefault();cancel();}};
    handle.onclick=e=>{e.stopPropagation();if(suppressClick){suppressClick=false;return;}show(handle,key,true);};
  });
}
