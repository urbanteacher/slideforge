import {bindCanvasDrag} from './canvas-split.js';
/* Card positions are bullet indices, not coordinates. The editor's existing
 * move operation carries images and rich formatting with their owning card. */
export function bindCanvasCards(root,slide,actions) {
  if(slide.type!=='cards')return;
  const cards=[...root.querySelectorAll('[data-card-index]')];if(!cards.length)return;
  root.classList.add('canvas-cards');
  let panel=null;
  const label=index=>String(slide.bullets[index]||'Empty card').replace(/\t/g,' — ').slice(0,70);
  function button(parent,text){const b=document.createElement('button');b.type='button';b.textContent=text;parent.appendChild(b);return b;}
  function close(){panel?.remove();panel=null;cards.forEach(c=>c.classList.remove('card-drop-target','card-drop-active'));}
  function panelFor(title,onCancel){
    close();panel=document.createElement('div');panel.className='canvas-card-panel';panel.setAttribute('role','group');panel.setAttribute('aria-label',title);
    const heading=document.createElement('strong');heading.textContent=title;panel.appendChild(heading);
    const cancel=button(panel,'Close');cancel.onclick=onCancel;
    panel.addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey)return;e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onCancel();}});
    root.appendChild(panel);return panel;
  }
  function choose(index,handle,keyboard){
    const p=panelFor('Move card '+(index+1)+' to a position',()=>{close();handle.focus();});
    cards.forEach(card=>{
      const destination=Number(card.dataset.cardIndex);card.classList.add('card-drop-target');
      const target=button(p,'Position '+(destination+1)+' · '+label(destination));target.dataset.cardDestination=String(destination);
      target.onclick=e=>{e.stopPropagation();close();if(index===destination)handle.focus();else actions.move(index,destination);};
    });
    if(keyboard)/** @type {HTMLButtonElement|null} */ (p.querySelector('[data-card-destination="'+index+'"]'))?.focus();
  }
  function destination(e){
    const node=document.elementFromPoint(e.clientX,e.clientY);
    const target=node?.closest('[data-card-destination],[data-card-index]');
    if(!target||!root.contains(target))return null;
    return Number(target.getAttribute('data-card-destination')??target.getAttribute('data-card-index'));
  }
  cards.forEach(card=>{
    const index=Number(card.dataset.cardIndex),bar=document.createElement('div');bar.className='canvas-card-tools';card.appendChild(bar);
    const edit=button(bar,'Edit');edit.setAttribute('aria-label','Edit card '+(index+1));edit.onclick=e=>{e.stopPropagation();close();actions.edit(index);};
    const move=button(bar,'Move');move.dataset.cardMove=String(index);move.setAttribute('aria-label','Move card '+(index+1));move.title='Drag to a card position or click to choose';
    bindCanvasDrag(move,{begin:()=>choose(index,move,false),move:e=>{const to=destination(e);cards.forEach(c=>c.classList.toggle('card-drop-active',Number(c.dataset.cardIndex)===to));},end:e=>{const to=destination(e);close();if(to!==null&&to!==index)actions.move(index,to);else move.focus();},cancel:()=>{close();move.focus();},click:()=>choose(index,move,true)});
    // Structured and picture cards may expose multiple fragments for one field.
    // A single card owns the editor operation; its raw line remains intact.
    card.addEventListener('dblclick',e=>{if(e.target.closest('button'))return;e.preventDefault();e.stopPropagation();close();actions.edit(index);});
  });
  const browse=button(root,'Arrange cards');browse.className='canvas-card-browse';
  browse.onclick=()=>{
    const p=panelFor('Cards in this slide',()=>{close();browse.focus();});
    cards.forEach(card=>{
      const index=Number(card.dataset.cardIndex),row=document.createElement('div');row.className='canvas-card-row';
      const name=document.createElement('span');name.textContent=(index+1)+'. '+label(index);row.appendChild(name);
      const edit=button(row,'Edit');edit.setAttribute('aria-label','Edit card '+(index+1)+' from list');edit.onclick=()=>{close();actions.edit(index);};
      const move=button(row,'Move');move.setAttribute('aria-label','Move card '+(index+1)+' from list');move.onclick=()=>choose(index,browse,true);p.appendChild(row);
    });
    p.querySelector('button')?.focus();
  };
}
