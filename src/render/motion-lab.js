/* Motion specimens use content slides and the existing Explore run-state channel.
 * Authored words stay in title/subtitle/bullets/image; presentation state is transient. */
export const MOTION_SCENES = {
  mask: 'Mask reveal', draw: 'Draw-on diagram', cards: 'Card to detail',
  annotate: 'Animated annotations', scrub: 'Scrubbable transformation',
  cause: 'Cause and effect', branch: 'Branching scenario', explode: 'Exploded diagram',
  lens: 'Focus lens', panels: 'Responsive story panels'
};
export const MOTION_LOOKS = {
  editorial: 'Editorial', paper: 'Layered paper', technical: 'Technical drawing',
  cinema: 'Cinematic depth', comic: 'Comic sequence'
};
/* The scene was briefly a design key. Decks saved in those few hours still
   carry it there, so read both and let the slide's own field win. */
function scene(slide) {
  return slide?.motionScene || slide?.design?.motionScene || '';
}
export function active(slide) {
  /* 'content' still answers true so decks saved while these were a Look
     control keep working; 'motion' is where new ones land. */
  return (slide?.type === 'motion' || slide?.type === 'content')
    && Object.hasOwn(MOTION_SCENES, scene(slide));
}
export function items(slide) {
  return (slide.bullets || []).filter(x => String(x).trim()).slice(0, 4).map(x => {
    const [label, ...detail] = String(x).split('\t');
    return { label: label.slice(0, 100), detail: detail.join(' ').slice(0, 350) };
  });
}
/** @param {any} slide @param {any} raw */
export function state(slide, raw = {}) {
  const count = Math.max(1, items(slide).length);
  const clamp = (x, lo, hi, fallback) => Number.isFinite(Number(x)) ? Math.max(lo, Math.min(hi, Number(x))) : fallback;
  return { sceneStep: Math.round(clamp(raw.sceneStep, 0, count, 0)),
    sceneChoice: Math.round(clamp(raw.sceneChoice, -1, count - 1, -1)),
    sceneValue: clamp(raw.sceneValue, 0, 100, 0),
    sceneX: clamp(raw.sceneX, 0, 100, 50), sceneY: clamp(raw.sceneY, 0, 100, 50) };
}
export function update(slide, previous, action, value) {
  const fields = { motionStep: 'sceneStep', motionChoice: 'sceneChoice', motionValue: 'sceneValue', motionX: 'sceneX', motionY: 'sceneY' };
  if (action === 'motionReset') return state(slide);
  if (!Object.hasOwn(fields, action) || !Number.isFinite(Number(value))) return null;
  return state(slide, { ...previous, [fields[action]]: Number(value) });
}
export function render(root, pad, slide, opts, safeMedia) {
  const mode = scene(slide);
  const rows = items(slide);
  if (!rows.length) rows.push({ label: 'Add a point', detail: 'Use the slide’s bullet fields. Separate label and explanation with a tab.' });
  const enabled = !!opts.exploreCommand;
  let view = state(slide, enabled ? opts.exploreState : { sceneStep: rows.length, sceneValue: 100 });
  const el = (tag, cls = '', text = '') => { const n = document.createElement(tag); n.className = cls; n.textContent = text; return n; };
  const send = (action, value = 0) => { if (enabled) opts.exploreCommand(action, value); };
  const button = (parent, label, fn) => { const b = el('button', 'ml-button', label); b.type = 'button'; b.disabled = !enabled; b.onclick = fn; parent.append(b); return b; };
  const range = (parent, label, key, action) => {
    const wrap = el('label', 'ml-range', label), input = document.createElement('input');
    input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '1'; input.disabled = !enabled;
    input.setAttribute('aria-label', label); input.value = String(view[key]);
    input.oninput = () => send(action, Number(input.value)); wrap.append(input); parent.append(wrap); return input;
  };
  pad.replaceChildren(); root.classList.add('motion-specimen'); root.classList.toggle('ml-live', enabled);
  root.dataset.motionLook = Object.hasOwn(MOTION_LOOKS, slide.design.motionLook || '') ? slide.design.motionLook : 'editorial';
  root.dataset.motionMode = mode;
  pad.append(el('div', 'ml-kicker', MOTION_SCENES[mode]), el('h2', 'ml-title', slide.title || MOTION_SCENES[mode]));
  const stage = el('div', 'ml-stage'); pad.append(stage);
  const status = el('p', 'ml-status'); status.setAttribute('aria-live', enabled ? 'polite' : 'off'); pad.append(status);
  const controls = el('div', 'ml-controls'); pad.append(controls);
  controls.addEventListener('keydown', e => e.stopPropagation());
  stage.addEventListener('keydown', e => { if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) e.stopPropagation(); });
  const parts = [];
  let slider, xSlider, ySlider, photo, lens, detail, svg, markNodes = [], connectorNodes = [];
  const imageURL = safeMedia(slide.image || '');
  function addPhoto() {
    const img = document.createElement('img'); img.className = 'ml-photo'; img.src = imageURL;
    img.alt = slide.subtitle || slide.title || 'Experiment image'; img.draggable = false;
    img.onerror = () => { img.hidden = true; status.textContent = 'Image unavailable — choose an image in Look.'; };
    stage.append(img); return img;
  }
  function svgNode(tag, attrs) { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k,v] of Object.entries(attrs)) n.setAttribute(k, String(v)); return n; }
  if (['mask', 'annotate', 'lens'].includes(mode)) {
    if (imageURL) photo = addPhoto(); else stage.append(el('p', 'ml-empty', 'Choose an image in Look to try this effect.'));
    if (mode === 'annotate') rows.forEach((row, i) => {
      const n = el('div', 'ml-annotation'); n.style.left = `${10 + (i % 2) * 48}%`; n.style.top = `${12 + Math.floor(i / 2) * 44}%`;
      n.append(el('span', 'ml-ring', String(i + 1)), el('strong', '', row.label)); stage.append(n); parts.push(n);
    });
    if (mode === 'lens') {
      lens = el('div', 'ml-lens'); if (imageURL) lens.style.backgroundImage = `url(${JSON.stringify(imageURL)})`; stage.append(lens);
      stage.tabIndex = enabled ? 0 : -1; stage.setAttribute('aria-label', 'Focus lens. Use the horizontal and vertical sliders below, or drag on the image.');
      stage.onpointerdown = e => { if (!enabled) return; stage.setPointerCapture(e.pointerId); move(e); };
      stage.onpointermove = e => { if (stage.hasPointerCapture(e.pointerId)) move(e); };
      function move(e) { const r = stage.getBoundingClientRect(); send('motionX', (e.clientX-r.left)/r.width*100); send('motionY', (e.clientY-r.top)/r.height*100); }
      xSlider = range(controls, 'Lens horizontal', 'sceneX', 'motionX'); ySlider = range(controls, 'Lens vertical', 'sceneY', 'motionY');
    }
  } else if (mode === 'scrub' || mode === 'draw') {
    svg = svgNode('svg', { viewBox: '0 0 1000 360', role: 'img', 'aria-label': mode === 'scrub' ? 'The same values change from circles to aligned bars.' : 'Connections appear in sequence.' }); stage.append(svg);
    rows.forEach((row,i) => {
      if (mode === 'draw') {
        if (i) { const line = svgNode('path', { d: `M ${100+(i-1)*250} 180 L ${100+i*250} 180`, stroke: 'currentColor', 'stroke-width': 4, fill: 'none', pathLength: 1 }); line.classList.add('ml-connector'); svg.append(line); connectorNodes.push(line); }
        const group = svgNode('g', {}); group.classList.add('ml-node'); const circle = svgNode('circle', { cx:100+i*250, cy:180, r:50, fill:'var(--ml-accent)' });
        const label = svgNode('text', { x:100+i*250, y:270, 'text-anchor':'middle', fill:'currentColor', 'font-size':22 }); label.textContent = row.label; group.append(circle,label); svg.append(group); parts.push(group);
      } else {
        const value = Number(row.detail); const number = Number.isFinite(value) && value > 0 ? Math.min(100,value) : 25*(i+1);
        const rect = svgNode('rect', { fill:'var(--ml-accent)' }); const label = svgNode('text', { x:30, y:60+i*80, fill:'currentColor', 'font-size':22 }); label.textContent = `${row.label}: ${number}`;
        svg.append(rect,label); markNodes.push({rect,number,i});
      }
    });
  } else if (mode === 'cause') {
    const meter = el('div', 'ml-meter'); detail = el('div', 'ml-equation'); stage.append(meter,detail); parts.push(meter);
  } else {
    stage.classList.add('ml-card-stage');
    rows.forEach((row,i) => {
      const card = el('button', 'ml-card'); card.type='button'; card.disabled=!enabled;
      card.append(el('span','ml-number',String(i+1).padStart(2,'0')),el('strong','',row.label),el('span','ml-detail',row.detail));
      card.onclick=()=>send('motionChoice',view.sceneChoice===i ? -1 : i); stage.append(card); parts.push(card);
    });
  }
  const continuous = ['mask','scrub','cause','explode'].includes(mode);
  if (continuous) slider = range(controls, mode === 'cause' ? 'Input x' : 'Transformation', 'sceneValue', 'motionValue');
  const selectable = ['cards','branch','panels'].includes(mode);
  const previous = button(controls,'Previous state',()=>send(continuous?'motionValue':selectable?'motionChoice':'motionStep',continuous?view.sceneValue-25:selectable?view.sceneChoice-1:view.sceneStep-1));
  const next = button(controls,'Next state',()=>send(continuous?'motionValue':selectable?'motionChoice':'motionStep',continuous?view.sceneValue+25:selectable?view.sceneChoice+1:view.sceneStep+1));
  if(mode==='lens'){previous.hidden=true;next.hidden=true;}
  button(controls,'Reset / replay',()=>send('motionReset'));
  if (['cards','branch','panels','explode'].includes(mode)) button(controls,'Return to overview',()=>send('motionChoice',-1));
  function refresh(raw) {
    view = state(slide, raw); const t=view.sceneValue/100;
    if(slider) slider.value=String(view.sceneValue); if(xSlider)xSlider.value=String(view.sceneX); if(ySlider)ySlider.value=String(view.sceneY);
    previous.disabled=!enabled || (continuous ? view.sceneValue<=0 : selectable ? view.sceneChoice<0 : view.sceneStep<=0);
    next.disabled=!enabled || (continuous ? view.sceneValue>=100 : selectable ? view.sceneChoice>=rows.length-1 : view.sceneStep>=rows.length);
    root.style.setProperty('--ml-progress',String(t));
    if (mode==='mask' && photo) photo.style.clipPath=`circle(${t*75}% at 50% 50%)`;
    if (mode==='lens' && lens) {
      lens.style.left=`${view.sceneX}%`; lens.style.top=`${view.sceneY}%`;
      const width=stage.clientWidth||1168, height=stage.clientHeight||420;
      const naturalW=photo?.naturalWidth||width, naturalH=photo?.naturalHeight||height;
      const cover=Math.max(width/naturalW,height/naturalH), fullW=naturalW*cover, fullH=naturalH*cover;
      lens.style.backgroundSize=`${fullW*2}px ${fullH*2}px`;
      lens.style.backgroundPosition=`${110-(view.sceneX/100*width+(fullW-width)/2)*2}px ${110-(view.sceneY/100*height+(fullH-height)/2)*2}px`;
    }
    if (mode==='draw' || mode==='annotate') {
      parts.forEach((p,i)=>p.classList.toggle('ml-revealed',i<view.sceneStep));
      connectorNodes.forEach((p,i)=>p.style.strokeDashoffset=i+1<view.sceneStep?'0':'1');
    }
    if(mode==='scrub') markNodes.forEach(({rect,number,i})=>{
      const diameter=2*Math.sqrt(number/Math.PI)*8, width=diameter+(number*6-diameter)*t, height=diameter+(36-diameter)*t;
      rect.setAttribute('x',String(250)); rect.setAttribute('y',String(40+i*80-height/2)); rect.setAttribute('width',String(width));rect.setAttribute('height',String(height));rect.setAttribute('rx',String((1-t)*diameter/2));
    });
    if(mode==='cause') {
      const a=Number(slide.body); const factor=Number.isFinite(a)&&String(slide.body).trim()?Math.max(-10,Math.min(10,a)):2;
      const output=Math.round(view.sceneValue*factor*100)/100;
      detail.textContent=`${factor} × ${Math.round(view.sceneValue)} = ${output}`;
      parts[0].style.transform=`scaleX(${t})`;
    }
    if(['cards','branch','panels','explode'].includes(mode)) {
      stage.classList.toggle('ml-selected',view.sceneChoice>=0);
      parts.forEach((p,i)=>{
        const selected=view.sceneChoice===i;
        p.classList.toggle('ml-selected-card',selected); p.setAttribute('aria-pressed',String(selected));
        if(mode==='explode') p.style.transform=`translate(${(i-(rows.length-1)/2)*t*50}px, ${(i%2?1:-1)*t*65}px) rotate(${(i-(rows.length-1)/2)*t*5}deg)`;
      });
    }
    const selected=rows[view.sceneChoice];
    status.textContent=selected ? `${selected.label} — ${selected.detail}` : mode==='scrub' ? 'Illustrative values. Circle area and bar length encode the same quantity; intermediate shapes are transition frames.' : mode==='cause' ? 'Illustrative linear model: y = ax. Edit the multiplier in the slide body.' : mode==='lens' ? 'Drag over the image or use the sliders to inspect a detail.' : mode==='branch' ? 'Choose a response to reveal its authored consequence. Return to overview to try another.' : (rows[Math.max(0,view.sceneStep-1)]?.detail || slide.subtitle || 'Use the controls to explore.');
  }
  root._exploreRefresh = refresh; refresh(view);
  if(mode==='lens') {
    if(photo)photo.onload=()=>refresh(view);
    requestAnimationFrame(()=>{if(root.isConnected)refresh(view);});
  }
}
