/* Data-keyed SVG transitions. No AI calls, libraries, or saved runtime state. */
(function () {
  'use strict';
  var running = new WeakMap();
  function cancel(host) { var id=running.get(host); if(id)cancelAnimationFrame(id); running.delete(host); }
  function numbers(value) { return String(value||'').trim().split(/[ ,]+/).map(Number); }
  function rgb(value) { var m=String(value).match(/^rgba?\(([^)]+)\)/); return m?m[1].split(',').slice(0,3).map(Number):null; }
  function transition(host,next,options) {
    options=options||{};cancel(host);
    var previous=host.querySelector('svg'), old=new Map(), jobs=[];
    if(previous)previous.querySelectorAll('[data-motion]').forEach(function(el){
      var style=getComputedStyle(el);old.set(el.getAttribute('data-motion'),{el:el.cloneNode(true),fill:rgb(style.fill),stroke:rgb(style.stroke)});
    });
    host.replaceChildren(next);
    if(!previous||options.instant||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    next.querySelectorAll('[data-motion]').forEach(function(el){
      var key=el.getAttribute('data-motion'), before=old.get(key);old.delete(key);
      if(!before||before.el.tagName!==el.tagName){el.style.opacity='0';jobs.push(function(t){el.style.opacity=String(t);});return;}
      ['x','y','x1','y1','x2','y2','cx','cy','r','width','height','stroke-width','stroke-opacity','fill-opacity','points'].forEach(function(attr){
        if(!el.hasAttribute(attr)||!before.el.hasAttribute(attr))return;
        var end=el.getAttribute(attr),a=numbers(before.el.getAttribute(attr)),b=numbers(end);
        if(a.length!==b.length||!a.every(Number.isFinite)||!b.every(Number.isFinite))return;
        jobs.push(function(t){el.setAttribute(attr,t===1?end:b.map(function(v,i){return a[i]+(v-a[i])*t;}).join(' '));});
      });
      var style=getComputedStyle(el);
      ['fill','stroke'].forEach(function(attr){var a=before[attr],b=rgb(style[attr]),end=el.getAttribute(attr);if(!a||!b||end===null)return;
        jobs.push(function(t){el.setAttribute(attr,t===1?end:'rgb('+b.map(function(v,i){return Math.round(a[i]+(v-a[i])*t);}).join(',')+')');});
      });
      if(el.tagName.toLowerCase()==='text'&&el.hasAttribute('data-number')){
        var a=Number(before.el.textContent),b=Number(el.textContent),label=el.textContent;
        if(Number.isFinite(a)&&Number.isFinite(b))jobs.push(function(t){el.textContent=t===1?label:String(Math.round((a+(b-a)*t)*10)/10);});
      }
    });
    old.forEach(function(item){var el=item.el;el.removeAttribute('data-motion');el.setAttribute('aria-hidden','true');next.appendChild(el);jobs.push(function(t){el.style.opacity=String(1-t);if(t===1)el.remove();});});
    jobs.forEach(function(job){job(0);});
    var start=performance.now(),duration=Math.max(200,Math.min(4000,Number(options.duration)||1600));
    function frame(now){if(!host.isConnected){cancel(host);return;}var p=Math.min(1,(now-start)/duration),t=p*p*(3-2*p);jobs.forEach(function(job){job(t);});if(p<1)running.set(host,requestAnimationFrame(frame));else running.delete(host);}
    running.set(host,requestAnimationFrame(frame));
  }
  window.SF.ChartMotion={transition:transition,cancel:cancel};
})();
