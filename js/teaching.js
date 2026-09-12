/* Ephemeral projector ink and authored progressive disclosure. */
(function(){
'use strict';
var SF=window.SF, P=SF.Player, steps=[],shown=0,svg=null,mode='',strokes=[],active=null,tools;
function ns(tag){return document.createElementNS('http://www.w3.org/2000/svg',tag);}
function update(){steps.forEach(function(n,i){n.classList.toggle('step-hidden',i>=shown);});P.revealStep=shown;P.syncPresenter();P.emit('step',{shown:shown});}
function point(e){var r=svg.getBoundingClientRect();return [(e.clientX-r.left)*1280/r.width,(e.clientY-r.top)*720/r.height];}
function stroke(e){var p=point(e);if(mode==='spot'){active.setAttribute('cx',p[0]);active.setAttribute('cy',p[1]);}else {active._points.push(p.join(','));if(active._points.length===1)active._points.push(p.join(','));active.setAttribute('points',active._points.join(' '));}}
function setMode(v){mode=v;if(svg)svg.classList.toggle('drawing',!!v);if(tools)tools.querySelectorAll('[data-mode]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});}
function clear(){if(svg)svg.textContent='';strokes=[];active=null;}
/* The tools dock to the HUD instead of floating over the slide.
   A panel pinned to the corner is on the wall for the whole lesson whether or
   not anyone is drawing; the HUD already fades out when the mouse stops, so
   the pen lives there and appears only when it is asked for. */
function build(){
 var hud=document.getElementById('hud');
 tools=document.createElement('div');tools.className='ink-bar';tools.hidden=true;
 function b(label,title,fn){var n=document.createElement('button');n.textContent=label;n.title=title;
  n.setAttribute('aria-label',title);n.type='button';n.onclick=fn;tools.appendChild(n);return n;}
 [['\u270e','Draw on the slide','draw'],['\u25ce','Spotlight part of the slide','spot']].forEach(function(x){
  var n=b(x[0],x[1],function(){setMode(mode===x[2]?'':x[2]);});n.dataset.mode=x[2];n.setAttribute('aria-pressed','false');});
 b('\u21b6','Undo the last mark',function(){var n=strokes.pop();if(n)n.remove();});
 b('\u2715','Clear all marks (X)',clear);
 /* Only useful on a slide built to disclose, so it says so when it is not. */
 b('\u22ef','Show every step on this slide',function(){
  if(!steps.length){SF.toast('This slide reveals all at once. Turn on Build on Next under Design & content.');return;}
  shown=steps.length;update();});
 /* No hud on this page means nowhere to hang the bar. Used to throw. */
 if(!hud||!hud.parentNode)return;
 hud.parentNode.insertBefore(tools,hud);
}
function toggleBar(){
 if(!tools)build();
 var open=tools.hidden;
 tools.hidden=!open;
 if(!open)setMode('');
 var btn=document.querySelector('#hud [data-act=ink]');
 if(btn){btn.classList.toggle('on',open);btn.setAttribute('aria-pressed',String(open));}
}
P.on('slide',function(e){
 if(!tools)build();setMode('');
 /* Authored disclosure is bullets, keywords, items and table rows. A format
    may also nominate its own steps with .step \u2014 emoji guess releases the
    letter pattern and then a hint that way, so the teacher reveals help with
    the same press rather than a control of its own. */
 steps=Array.from(e.node.querySelectorAll('.pad .step'));
 /* data-step decides the order when a format nominates one. The title row is
    inserted above the stage, so without this a hint in the header would be
    revealed before the letter pattern below it. */
 steps.sort(function(a,b){return (Number(a.dataset.step)||0)-(Number(b.dataset.step)||0);});
 if(!steps.length&&e.slide.progressive)steps=Array.from(e.node.querySelectorAll('.pad li,.kw-row,.it-row,.q-line,.ex-body > p,tbody tr'));shown=0;update();
 svg=ns('svg');svg.setAttribute('viewBox','0 0 1280 720');svg.classList.add('teaching-ink');svg.setAttribute('aria-label','Temporary slide annotations');e.node.appendChild(svg);strokes=[];
 svg.onpointerdown=function(ev){if(!mode)return;ev.preventDefault();svg.setPointerCapture(ev.pointerId);active=ns(mode==='spot'?'circle':'polyline');
 if(mode==='spot'){active.setAttribute('r','100');active.setAttribute('fill','#ffe47755');active.setAttribute('stroke','#ffe477');active.setAttribute('stroke-width','5');}
 else{active.setAttribute('fill','none');active.setAttribute('stroke','#ec346d');active.setAttribute('stroke-width','5');active.setAttribute('stroke-linecap','round');active.setAttribute('stroke-linejoin','round');active._points=[];}
 svg.appendChild(active);strokes.push(active);stroke(ev);};
 svg.onpointermove=function(ev){if(active)stroke(ev);};svg.onpointerup=svg.onpointercancel=function(){active=null;};
});
P.on('close',function(){
 if(tools)tools.hidden=true;
 var btn=document.querySelector('#hud [data-act=ink]');if(btn){btn.classList.remove('on');btn.setAttribute('aria-pressed','false');}
 steps=[];clear();setMode('');});
SF.Teaching={toggleBar:toggleBar,clear:clear,next:function(){if(shown<steps.length){shown++;update();return true;}return false;},prev:function(){if(shown>0&&steps.length){shown--;update();return true;}return false;}};
})();
