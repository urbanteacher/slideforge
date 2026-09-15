/* Ephemeral projector ink and authored progressive disclosure.
 *
 * Unified Presentation HUD:
 * Inking tools are integrated directly inside the presentation HUD rather
 * than floating as a separate competing window. When inking is toggled on (I
 * or pencil icon), the HUD smoothly switches into Annotation mode with Draw,
 * Spotlight, Undo, Clear, Steps, and Done buttons.
 */
(function(){
'use strict';
var SF=window.SF, P=SF.Player, steps=[],shown=0,svg=null,mode='',strokes=[],active=null,dim=false;
function ns(tag){return document.createElementNS('http://www.w3.org/2000/svg',tag);}
/* Three states, not two. A point ahead of the build is hidden; the one just
   reached is at full strength; the ones behind it stay on screen but fall
   back, so the room keeps the thread of the argument while the eye is told
   where it is now. In hide mode only the first of those applies. */
function update(){
  steps.forEach(function(n,i){
    n.classList.toggle('step-hidden',i>=shown);
    n.classList.toggle('step-past',dim&&i<shown-1);
    /* The one just reached, named so the stylesheet can put the room's eye on
       it. Three states were already being computed here; only two of them had
       a class, so "the live one" could not be styled at all. */
    n.classList.toggle('step-live',i===shown-1);
    /* How many steps back this one now is. Only the stacked-card layout reads
       it, to push each card further behind the current one, but it costs
       nothing to publish for every build. */
    n.style.setProperty('--depth',String(Math.max(0,shown-1-i)));
  });
  P.revealStep=shown;P.syncPresenter();P.emit('step',{shown:shown});
}
function point(e){var r=svg.getBoundingClientRect();return [(e.clientX-r.left)*1280/r.width,(e.clientY-r.top)*720/r.height];}
/* Strokes are built from slide-space points (1280x720), never from the event.
   The pen may be on this screen or on the presenter desk across the room, and
   a mark has to land in the same place on the wall either way. */
function beginStroke(p){
  if(!svg)return;
  active=ns(mode==='spot'?'circle':'polyline');
  if(mode==='spot'){active.setAttribute('r','100');active.setAttribute('fill','#ffe47755');active.setAttribute('stroke','#ffe477');active.setAttribute('stroke-width','5');}
  else{active.setAttribute('fill','none');active.setAttribute('stroke','#ec346d');active.setAttribute('stroke-width','5');active.setAttribute('stroke-linecap','round');active.setAttribute('stroke-linejoin','round');active._points=[];}
  svg.appendChild(active);strokes.push(active);extendStroke(p);
}
function extendStroke(p){
  if(!active)return;
  if(mode==='spot'){active.setAttribute('cx',p[0]);active.setAttribute('cy',p[1]);}
  else{active._points.push(p.join(','));if(active._points.length===1)active._points.push(p.join(','));active.setAttribute('points',active._points.join(' '));}
}
function endStroke(){active=null;}
function setMode(v){
  mode=v;
  if(svg)svg.classList.toggle('drawing',!!v);
  var inkTools=document.getElementById('hudInkTools');
  if(inkTools){
    inkTools.querySelectorAll('[data-mode]').forEach(function(b){
      b.setAttribute('aria-pressed',String(b.getAttribute('data-mode')===mode));
    });
  }
}
function clear(){if(svg)svg.textContent='';strokes=[];active=null;}
function undo(){var n=strokes.pop();if(n)n.remove();}

function wireTools(){
  var inkTools=document.getElementById('hudInkTools');
  if(!inkTools)return;
  if(inkTools.getAttribute('data-wired'))return;
  inkTools.setAttribute('data-wired','true');

  var btnDraw=inkTools.querySelector('[data-mode="draw"]');
  if(btnDraw) btnDraw.addEventListener('click',function(){setMode(mode==='draw'?'':'draw');});

  var btnSpot=inkTools.querySelector('[data-mode="spot"]');
  if(btnSpot) btnSpot.addEventListener('click',function(){setMode(mode==='spot'?'':'spot');});

  var btnUndo=inkTools.querySelector('[data-ink-act="undo"]');
  if(btnUndo) btnUndo.addEventListener('click',undo);

  var btnClear=inkTools.querySelector('[data-ink-act="clear"]');
  if(btnClear) btnClear.addEventListener('click',clear);

  var btnSteps=inkTools.querySelector('[data-ink-act="steps"]');
  if(btnSteps) btnSteps.addEventListener('click',function(){
    if(!steps.length){SF.toast('This slide reveals all at once. Turn on Build on Next under Design & content.');return;}
    shown=steps.length;update();
  });

  var btnClose=inkTools.querySelector('[data-ink-act="close"]');
  if(btnClose) btnClose.addEventListener('click',function(){toggleBar(false);});
}

function ensureInkElements(){
  var hud=document.getElementById('hud');
  if(!hud)return false;
  var defTools=/** @type {HTMLElement|null} */ (document.getElementById('hudDefaultTools'));
  var inkTools=/** @type {HTMLElement|null} */ (document.getElementById('hudInkTools'));
  if(!defTools||!inkTools){
    // Self-healing fallback if DOM was modified without template
    if(!defTools){
      var createdDef=document.createElement('div');
      createdDef.className='hud-group hud-main-tools';
      createdDef.id='hudDefaultTools';
      var btns=Array.from(hud.querySelectorAll('#hudDefaultTools > button, [data-act="rail"],[data-act="poll"],[data-act="freeze"],[data-act="ink"],[data-act="blank"],[data-act="more"],[data-act="exit"]'));
      btns.forEach(function(b){createdDef.appendChild(b);});
      hud.appendChild(createdDef);
      defTools=createdDef;
    }
    if(!inkTools){
      var createdInk=document.createElement('div');
      createdInk.className='hud-group hud-ink-tools';
      createdInk.id='hudInkTools';
      createdInk.hidden=true;
      createdInk.innerHTML=
        '<button data-mode="draw" title="Draw on the slide" aria-label="Draw on the slide">✎</button>'+
        '<button data-mode="spot" title="Spotlight part of the slide" aria-label="Spotlight part of the slide">◎</button>'+
        '<button data-ink-act="undo" title="Undo the last mark (Z)" aria-label="Undo the last mark (Z)">↶</button>'+
        '<button data-ink-act="clear" title="Clear all marks (X)" aria-label="Clear all marks (X)">🗑</button>'+
        '<button data-ink-act="steps" title="Show every step on this slide" aria-label="Show every step on this slide">⋯</button>'+
        '<span class="sep"></span>'+
        '<button data-ink-act="close" class="hud-ink-done" title="Done drawing (I or Esc)" aria-label="Done drawing">✓ Done</button>';
      hud.appendChild(createdInk);
      inkTools=createdInk;
    }
  }
  wireTools();
  return true;
}

function isOpen(){
  var inkTools=document.getElementById('hudInkTools');
  return !!(inkTools&&!inkTools.hidden);
}

function toggleBar(force, opts){
  if(!ensureInkElements())return;
  var hud=document.getElementById('hud');
  var defTools=document.getElementById('hudDefaultTools');
  var inkTools=document.getElementById('hudInkTools');
  if(!defTools||!inkTools)return;

  var open=typeof force==='boolean'?force:inkTools.hidden;
  if(open){
    defTools.hidden=true;
    inkTools.hidden=false;
    if(hud)hud.classList.add('hud-inking');
    setMode('draw');
    if(P.showHud)P.showHud();
  } else {
    inkTools.hidden=true;
    defTools.hidden=false;
    if(hud)hud.classList.remove('hud-inking');
    setMode('');
  }
  var btn=document.querySelector('#hud [data-act=ink]');
  if(btn){btn.classList.toggle('on',open);btn.setAttribute('aria-pressed',String(open));}
  /* Silent when a desk stroke is opening the bar — a sync mid-begin redraws
     the desk preview and drops the pen. Ordinary I / Done still echo. */
  if(!(opts&&opts.silent) && P.syncPresenter)P.syncPresenter();
}

function ensureCanvas(node){
  if(svg&&svg.isConnected)return true;
  var host=node||document.querySelector('#player .deck-viewport .slide')||document.querySelector('#player .slide');
  if(!host)return false;
  svg=ns('svg');
  svg.setAttribute('viewBox','0 0 1280 720');
  svg.classList.add('teaching-ink');
  svg.setAttribute('aria-label','Temporary slide annotations');
  if(mode)svg.classList.add('drawing');
  host.appendChild(svg);
  strokes=[];
  svg.onpointerdown=function(ev){if(!mode)return;ev.preventDefault();svg.setPointerCapture(ev.pointerId);beginStroke(point(ev));};
  svg.onpointermove=function(ev){if(active)extendStroke(point(ev));};
  svg.onpointerup=svg.onpointercancel=endStroke;
  return true;
}

P.on('slide',function(e){
  ensureInkElements();
  /* Authored disclosure is bullets, keywords, items and table rows. A format
     may also nominate its own steps with .step — emoji guess releases the
     letter pattern and then a hint that way, so the teacher reveals help with
     the same press rather than a control of its own. */
  var explorationSteps = SF.Explore && SF.Explore.ownsSteps(e.slide);
  steps=explorationSteps ? [] : Array.from(e.node.querySelectorAll('.pad .step'));
  steps.sort(function(a,b){return (Number(a.dataset.step)||0)-(Number(b.dataset.step)||0);});
  if(!explorationSteps&&!steps.length&&e.slide.progressive)steps=Array.from(e.node.querySelectorAll('.pad li,.kw-row,.it-row,.q-line,.ex-body > p,tbody tr'));
  /* A stack is defined by what shows behind the front of it, so those layouts
     keep their past steps on screen whatever the build mode says. Everywhere
     else it is the author's choice. */
  var stacked=e.slide.type==='gallery'||
    (e.slide.type==='cards'&&(e.slide.design||{}).cardsMode==='stack');
  /* Spotlight holds the past back as well — it is dim plus a vignette, not a
     different way of building. */
  dim=stacked||e.slide.buildMode==='dim'||e.slide.buildMode==='spot';
  /* The mode goes on the slide so CSS can reach it: the steps are anywhere
     inside the pad, and a spotlight is about everything except them. */
  e.node.classList.toggle('build-spot',e.slide.buildMode==='spot'&&!!e.slide.progressive);
  shown=0;update();
  svg=ns('svg');svg.setAttribute('viewBox','0 0 1280 720');svg.classList.add('teaching-ink');svg.setAttribute('aria-label','Temporary slide annotations');
  if(mode)svg.classList.add('drawing');
  e.node.appendChild(svg);strokes=[];
  svg.onpointerdown=function(ev){if(!mode)return;ev.preventDefault();svg.setPointerCapture(ev.pointerId);beginStroke(point(ev));};
  svg.onpointermove=function(ev){if(active)extendStroke(point(ev));};
  svg.onpointerup=svg.onpointercancel=endStroke;
});

P.on('close',function(){
  toggleBar(false);
  var btn=document.querySelector('#hud [data-act=ink]');
  if(btn){btn.classList.remove('on');btn.setAttribute('aria-pressed','false');}
  steps=[];dim=false;clear();setMode('');
});

/* The desk draws on the wall.
 *
 * Whoever is teaching is usually looking at the presenter screen, not at the
 * projector, so "turn inking on" from over there used to hand them a pen they
 * could not reach: the canvas and its buttons are both on the wall. These let
 * the desk drive this canvas remotely. Points arrive already in slide space,
 * so the desk's preview can be any size it likes. */
function remote(action,data){
  data=data||{};
  if(action==='mode'){
    if(!isOpen())toggleBar(true,{silent:true});
    setMode(data.mode||'');
    if(P.syncPresenter)P.syncPresenter();
    return true;
  }
  /* No canvas means no slide is showing — try to attach one before giving up,
     because desk ink used to arrive before the wall had rebuilt its svg. */
  if(!ensureCanvas())return false;
  if(action==='begin'){
    if(!isOpen())toggleBar(true,{silent:true});
    if(data.mode&&data.mode!==mode)setMode(data.mode);
    if(!mode)return false;
    beginStroke([data.x,data.y]);
    return true;
  }
  if(action==='move'){extendStroke([data.x,data.y]);return !!active;}
  if(action==='end'){endStroke();return true;}
  if(action==='undo'){undo();return true;}
  if(action==='clear'){clear();return true;}
  return false;
}

SF.Teaching={
  toggleBar:toggleBar,
  isOpen:isOpen,
  mode:function(){return mode;},
  remote:remote,
  clear:clear,
  undo:undo,
  next:function(){if(shown<steps.length){shown++;update();return true;}return false;},
  prev:function(){if(shown>0&&steps.length){shown--;update();return true;}return false;}
};
})();
