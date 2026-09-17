/* Lab-only slot prototype. Uses the shared renderer for theme and chrome;
 * replaces only this preview's body. Never writes a deck or production CSS. */
const SF=window.SF;
const section=document.createElement('section');section.id='playground';
section.innerHTML=`<h2>Build with slots</h2>
<p class="lab-role">Scratchpad: type any words, switch theme, see them land on the lattice. Oldest engine — it tests the frame, not the controls.</p>
<p>Experimental preview. Pick what belongs on the slide; its box comes with it. Nothing is saved to your decks. <a href="#safe-deck">Try the complete Safe deck ↓</a></p>
<div class="slot-controls">
<label>Theme <select id="slot-theme"><option value="northeastern">NUL</option><option value="ukbt">UK Black Tech</option><option value="studio">Studio</option><option value="aiad27-safe">AIAD Safe</option></select></label>
<label>Arrangement <select id="slot-layout"><option value="split">Text + image</option><option value="cards">Four cards</option><option value="quote">Quote + context</option></select></label>
<label>Column split <select id="slot-columns"><option value="6">6 / 6</option><option value="7">7 / 5</option><option value="8">8 / 4</option><option value="9">9 / 3</option></select></label>
<label><input type="checkbox" id="slot-swap">Swap sides</label><label><input type="checkbox" id="slot-grid" checked>Show lattice</label>
<label>Header <input id="slot-header" value="AI Awareness Day 2027"></label>
<label>Footer <input id="slot-footer" value="Keep humans in the loop"></label>
<label>Heading <input id="slot-title" value="Keep humans in the loop"></label>
<label>Content · one item per line <textarea id="slot-copy" rows="4">Notice what the tool assumes.
Ask what evidence is missing.
Choose what happens next.
Keep your own judgement.</textarea></label>
</div><p class="slot-band-note">Header · 56px and footer · 32px frame the 16-row body. Clear their text for a quiet band; the space stays reserved.</p><div class="slot-preview"></div><p class="slot-status" role="status"></p>`;
document.querySelector('.lab-contract').after(section);
const mount=section.querySelector('.slot-preview'),status=section.querySelector('.slot-status');let revision=0;
const get=id=>section.querySelector('#slot-'+id);
function slot(cls,col,cols,row,rows,label){const n=document.createElement('div');n.className='vision-slot '+cls;n.style.gridArea=`${row} / ${col} / span ${rows} / span ${cols}`;n.dataset.slotLabel=label;n.dataset.rowSpan=rows;n.dataset.colSpan=cols;return n;}
async function draw(){
 const run=++revision,deck=SF.makeDeck('Slot playground');deck.theme=get('theme').value;deck.showSlideNumbers=true;deck.org='Modular canvas · concept';
 const slide=SF.makeSlide('content');slide.title=get('title').value;slide.design={composition:'none'};deck.slides=[slide];
 const root=SF.renderSlide(deck,slide,{index:0,total:1});root.classList.add('vision-slide');root.querySelector('.pad').remove();
 const header=document.createElement('header');header.className='vision-band vision-header';header.dataset.slotLabel='Header · 56px · outside body rows';
 const headerText=document.createElement('span');headerText.textContent=get('header').value;header.appendChild(headerText);
 const footer=document.createElement('footer');footer.className='vision-band vision-footer';footer.dataset.slotLabel='Footer · 32px · outside body rows';
 const footerText=document.createElement('span');footerText.textContent=get('footer').value;footer.appendChild(footerText);
 const number=root.querySelector('.pagenum');if(number)footer.appendChild(number);
 root.append(header,footer);root.classList.toggle('show-bands',get('grid').checked);
 const body=document.createElement('div');body.className='vision-body';body.classList.toggle('show-grid',get('grid').checked);root.appendChild(body);
 const head=slot('vision-heading',1,12,1,2,'Heading · 2 rows × 12 columns');const h=document.createElement('h2');h.textContent=slide.title;head.appendChild(h);body.appendChild(head);
 const lines=get('copy').value.split('\n').filter(l=>l.trim()),kind=get('layout').value,left=Number(get('columns').value),swap=get('swap').checked;
 get('columns').disabled=kind==='cards';get('swap').disabled=kind==='cards';
 function text(parent,value,tag='p'){const n=document.createElement(tag);n.textContent=value;parent.appendChild(n);}
 if(kind==='cards'){
  lines.forEach((line,i)=>{const n=slot('vision-card',1+(i%4)*3,3,4+Math.floor(i/4)*7,6,'Card '+(i+1)+' · 6 rows × 3 columns');text(n,String(i+1).padStart(2,'0'),'strong');text(n,line);body.appendChild(n);});
 }else{
  const copyCol=swap?left+1:1,copyCols=swap?12-left:left,artCol=swap?1:left+1,artCols=swap?left:12-left;
  const copy=slot('vision-copy',copyCol,copyCols,4,13,(kind==='quote'?'Quote':'Text')+' · 13 rows × '+copyCols+' columns');
  if(kind==='quote'){text(copy,lines[0]||'Your words belong here.','blockquote');lines.slice(1).forEach(l=>text(copy,l));}
  else lines.forEach((l,i)=>{const row=document.createElement('div');row.className='vision-list-item';row.dataset.slotLabel='List item '+(i+1);text(row,String(i+1).padStart(2,'0'),'strong');text(row,l);copy.appendChild(row);});
  body.appendChild(copy);
  const media=slot(kind==='quote'?'vision-context':'vision-image',artCol,artCols,4,13,(kind==='quote'?'Context':'Image')+' · 13 rows × '+artCols+' columns');
  if(kind==='quote'){text(media,'A question for the room','strong');text(media,'What would you keep in human hands?');}
  else {const img=document.createElement('img');img.src='assets/brand/aiad27/poster-safe.svg';img.alt='Safe campaign shield illustration';media.appendChild(img);}
  body.appendChild(media);
 }
 mount.replaceChildren(root);fit();status.textContent='Measuring slots…';
 await document.fonts.ready;await Promise.all([...root.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);if(run!==revision)return;
 const failed=[];for(const n of root.querySelectorAll('.vision-slot,.vision-list-item,blockquote,.vision-band')){const r=n.getBoundingClientRect(),b=body.getBoundingClientRect();let bad=n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1||(!n.classList.contains('vision-band')&&r.bottom>b.bottom+1);
 const walk=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);while(walk.nextNode()){if(!walk.currentNode.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(walk.currentNode);for(const t of range.getClientRects())if(t.right>r.right+1||t.bottom>r.bottom+1||t.left<r.left-1)bad=true;}
 n.classList.toggle('slot-overflow',bad);if(bad)failed.push((n.dataset.slotLabel||'Quote').split(' · ')[0]);}
 status.textContent=`Header 56 · footer 32 · 1176 × 576 body · 16 rows of 36 · 12 columns of 65 with 36 gutters. ${failed.length?'Needs more space: '+failed.join(', ')+'. Shorten content or choose a wider slot.':'All content fits its declared slots.'}`;status.dataset.fits=String(!failed.length);
}
function fit(){const root=mount.querySelector('.slide');if(!root)return;const scale=mount.clientWidth/1280;root.style.transform=`scale(${scale})`;mount.style.height=720*scale+'px';}
new ResizeObserver(fit).observe(mount);section.querySelectorAll('input,select,textarea').forEach(n=>n.addEventListener('input',draw));draw();
