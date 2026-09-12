/* Formatting stays separate from plain lesson text: phones and exports never
   receive HTML, and all slide surfaces share the same safe DOM renderer. */
(function (global) {
  'use strict';
  var SF = global.SF;
  var color = function (v) { return /^#[0-9a-f]{6}$/i.test(v || '') ? v : ''; };
  function value(s, key) { return String(key.indexOf('bullets.') === 0 ? s.bullets[Number(key.split('.')[1])] || '' : s[key] || ''); }
  function entry(s, key) {
    var e = s.formatting && s.formatting[key];
    return e && e.text === value(s, key) && Array.isArray(e.marks) ? e : {text:value(s,key), marks:[]};
  }
  function save(s,key,e) { if (!s.formatting) s.formatting = {}; s.formatting[key] = e; }
  function rebase(s,key,old,next) {
    var e = entry(s,key), a = 0, b = 0;
    while (a < old.length && a < next.length && old[a] === next[a]) a++;
    while (b < old.length-a && b < next.length-a && old[old.length-1-b] === next[next.length-1-b]) b++;
    var end = old.length-b, delta = next.length-old.length;
    e.marks = e.marks.map(function(m) {
      var n = Object.assign({}, m);
      if (m.end <= a) return n;
      if (m.start >= end) { n.start += delta; n.end += delta; return n; }
      n.start = Math.min(m.start,a); n.end = m.end >= end ? m.end+delta : a;
      return n;
    }).filter(function(m) {return m.end > m.start;});
    e.text = next; save(s,key,e);
  }
  function apply(s,key,start,end,kind,v) {
    if (!(end > start)) return false;
    var e = entry(s,key);
    if (kind === 'clear') {
      e.marks = e.marks.flatMap(function(m) {
        if (m.end <= start || m.start >= end) return [m];
        var out = [];
        if (m.start < start) out.push(Object.assign({},m,{end:start}));
        if (m.end > end) out.push(Object.assign({},m,{start:end}));
        return out;
      });
    } else {
      e.marks.push({start:start,end:end,kind:kind,value:v});
      e.marks = e.marks.slice(-300);
    }
    save(s,key,e); return true;
  }
  function removeBullet(slide,index) {
    slide.bullets.splice(index,1);
    if(!slide.bullets.length)slide.bullets.push('');
    var previous=slide.formatting || {}, next={};
    Object.keys(previous).forEach(function(key){
      if(key.indexOf('bullets.')!==0){next[key]=previous[key];return;}
      var i=Number(key.slice(8));if(i===index)return;
      next['bullets.'+(i>index?i-1:i)]=previous[key];
    });slide.formatting=next;
  }
  function paint(node,s,key,text) {
    var raw = value(s,key), offset = raw.indexOf(String(text)), marks = entry(s,key).marks;
    if (offset < 0 || !marks.length) return;
    var parts = new Set([0,text.length]);
    marks.forEach(function(m) {
      if (!Number.isInteger(m.start) || !Number.isInteger(m.end)) return;
      parts.add(Math.max(0,Math.min(text.length,m.start-offset)));
      parts.add(Math.max(0,Math.min(text.length,m.end-offset)));
    });
    var points = Array.from(parts).sort(function(a,b){return a-b;}); node.textContent = '';
    points.slice(0,-1).forEach(function(a,i) {
      var b = points[i+1], styles = {};
      marks.forEach(function(m) { if (m.start <= a+offset && m.end >= b+offset) styles[m.kind] = m.value; });
      var href = styles.link && SF.safeHref(styles.link);
      var span = document.createElement(href ? 'a' : 'span'); span.textContent = text.slice(a,b);
      if (styles.bold) span.style.fontWeight = '800';
      if (styles.italic) span.style.fontStyle = 'italic';
      if (styles.underline) span.style.textDecoration = 'underline';
      if (color(styles.color)) span.style.color = styles.color;
      if (styles.highlight) { span.style.backgroundColor = '#fff0a6'; span.style.color = '#20251b'; }
      if (href) { span.href = href; span.target = '_blank'; span.rel = 'noopener noreferrer'; span.onclick = function(e){e.stopPropagation();}; }
      node.appendChild(span);
    });
  }
  function bind(input,s,key,change) {
    if (s.type === 'table' && key === 'body') return;
    var bar;
    input.addEventListener('focus', function() {
      if (bar) return;
      bar = document.createElement('div'); bar.className = 'format-tools'; bar.setAttribute('role','toolbar'); bar.setAttribute('aria-label','Format selected text');
      var selection = [0,0];
      function capture(){ selection = [input.selectionStart,input.selectionEnd]; }
      input.addEventListener('select',capture); input.addEventListener('keyup',capture); input.addEventListener('mouseup',capture);
      function format(kind,v) {
        var range = selection;
        if(['bold','italic','underline','highlight'].includes(kind) && range[1]>range[0]) {
          var marks=entry(s,key).marks, all=true;
          for(var i=range[0];i<range[1];i++) {var on=false;marks.forEach(function(m){if(m.kind===kind && m.start<=i && m.end>i)on=!!m.value;});if(!on){all=false;break;}}
          v=!all;
        }
        if (!apply(s,key,range[0],range[1],kind,v)) { SF.toast('Select the words you want to format first'); return; }
        change(); input.focus(); input.setSelectionRange(range[0],range[1]);
      }
      [['B','Bold','bold'],['I','Italic','italic'],['U','Underline','underline'],['▰','Highlight','highlight'],['Clear','Clear formatting','clear']].forEach(function(item) {
        var b = document.createElement('button'); b.type='button'; b.textContent=item[0]; b.title=item[1]; b.setAttribute('aria-label',item[1]);
        b.onmousedown=function(e){e.preventDefault();capture();}; b.onclick=function(){format(item[2],true);}; bar.appendChild(b);
      });
      var c = document.createElement('input'); c.type='color'; c.value='#426332'; c.title='Text colour'; c.setAttribute('aria-label','Text colour'); c.oninput=function(){format('color',c.value);}; bar.appendChild(c);
      var link = document.createElement('input'); link.type='url'; link.placeholder='https://…'; link.setAttribute('aria-label','Link for selected text'); bar.appendChild(link);
      var lb=document.createElement('button'); lb.type='button'; lb.textContent='Link'; lb.onclick=function(){ if(SF.safeHref(link.value)) format('link',link.value); else SF.toast('Enter an http or https link'); }; bar.appendChild(lb);
      input.addEventListener('keydown',function(e){
        var k=e.key.toLowerCase();if((e.metaKey||e.ctrlKey)&&['b','i','u'].includes(k)){e.preventDefault();capture();format({b:'bold',i:'italic',u:'underline'}[k],true);}
      });
      input.parentNode.insertBefore(bar,input);
    });
  }
  function layout(root,s) {
    var d=s.design || {}, pad=root.querySelector('.pad');
    if (!pad || s.type==='quiz' || s.type==='game') return;
    if (['left','center','right'].includes(d.align)) pad.style.textAlign=d.align;
    if (color(d.background)) root.style.background=d.background;
    if (color(d.textColor)) {
      root.style.setProperty('--s-fg',d.textColor);root.style.setProperty('--s-dim',d.textColor);
      root.querySelectorAll('.pad h1,.pad h2,.sub,.q,.attrib,.cap,.pad li,.kw-term,.kw-def,.it-phrase,.it-note,.ln-label,.ln-link,.tbl th,.tbl td').forEach(function(n){n.style.color=d.textColor;});
    }
    var scale={small:.85,medium:1,large:1.15}[d.size] || 1;
    if(scale!==1) requestAnimationFrame(function(){
      root.querySelectorAll('h1,h2,.sub,.q,.attrib,li,.kw-term,.kw-def,.it-phrase,.it-note').forEach(function(n){
        var px=parseFloat(getComputedStyle(n).fontSize); if(px) n.style.fontSize=(px*scale)+'px';
      });
    });
    if (s.type==='split') {
      var media=root.querySelector('.split-media'), copy=root.querySelector('.split-copy');
      var ratio=[35,50,65].includes(d.imageShare)?d.imageShare:50;
      media.style.flex='0 0 '+ratio+'%'; copy.style.flex='1 1 0';
      var placement=SF.imagePlacement(s);
      if(['top','bottom'].includes(placement)) {
        pad.style.flexDirection='column';media.style.order=placement==='top'?'0':'1';copy.style.order=placement==='top'?'1':'0';
        copy.style.padding='28px 56px'; copy.style.minHeight='0';
        media.style.minHeight='0';
      }
    }
    root.querySelectorAll('.img').forEach(function(img){
      var x=Number.isFinite(d.focalX)?Math.max(0,Math.min(100,d.focalX)):50;
      var y=Number.isFinite(d.focalY)?Math.max(0,Math.min(100,d.focalY)):50;
      img.style.backgroundPosition=x+'% '+y+'%';
    });
  }
  var expanded=new Set();
  function inspector(parent,s,change) {
    var UI=SF.Shell.UI, box=document.createElement('details'); box.className='custom-controls';
    box.open=expanded.has(s.id);box.ontoggle=function(){if(box.open)expanded.add(s.id);else expanded.delete(s.id);};
    var summary=document.createElement('summary'); summary.textContent='Customise this slide'; box.appendChild(summary);
    var d=s.design || (s.design={});
    function choose(label,key,opts,fallback){box.appendChild(UI.field(label,UI.select(opts.map(function(x){return {value:String(x[0]),label:x[1]};}),String(d[key]||fallback),function(v){d[key]=key==='imageShare'?Number(v):v;change();})));}
    choose('Text alignment','align',[['left','Left'],['center','Centre'],['right','Right']],'left');
    choose('Text size','size',[['small','Small'],['medium','Theme default'],['large','Large']],'medium');
    var fg=document.createElement('input');fg.type='color';fg.value=color(d.textColor)||'#243422';fg.onchange=function(){d.textColor=fg.value;change();};
    box.appendChild(UI.field('Text colour · whole slide',fg,'For individual words, select text in its field and use the colour swatch.'));
    var bg=document.createElement('input'); bg.type='color'; bg.value=color(d.background)||'#ffffff'; bg.onchange=function(){d.background=bg.value;change();};
    box.appendChild(UI.field('Slide background',bg,'Keep text readable when changing colours. Select words in a text field to format them.'));
    if(s.type==='split'){
      box.appendChild(UI.field('Image placement',UI.select([
        {value:'left',label:'Left of text'},{value:'right',label:'Right of text'},
        {value:'top',label:'Above text'},{value:'bottom',label:'Below text'}
      ],SF.imagePlacement(s),function(v){SF.setImagePlacement(s,v);change();})));
      choose('Image share','imageShare',[[35,'35% image'],[50,'50% image'],[65,'65% image']],50);
    }
    if(s.type==='split'||s.type==='image') ['X','Y'].forEach(function(axis){
      var r=document.createElement('input');r.type='range';r.min=0;r.max=100;r.value=d['focal'+axis]==null?50:d['focal'+axis];r.onchange=function(){d['focal'+axis]=Number(r.value);change();};box.appendChild(UI.field('Image focus '+(axis==='X'?'horizontal':'vertical'),r));
    });
    if(['content','cards','split','keywords','italics','table','quote','explain'].includes(s.type)){
      var buildLabel=s.type==='table'?'Reveal one row at a time (animated)'
        :s.type==='quote'?'Reveal one line at a time (animated)'
        :s.type==='explain'?'Reveal one paragraph at a time (animated)'
        :'Reveal one bullet / point at a time (animated)';
      box.appendChild(UI.field('Build on Next',UI.select([
        {value:'off',label:'Show everything at once'},
        {value:'on',label:buildLabel}
      ],s.progressive===true?'on':'off',function(v){s.progressive=v==='on';change();})));
    }
    box.appendChild(UI.button('Reset to theme','ghost',function(){s.design={};s.formatting={};change();}));
    parent.appendChild(box);
  }
  SF.Custom={removeBullet:removeBullet,bind:bind,paint:paint,layout:layout,inspector:inspector,rebase:rebase,apply:apply,entry:entry};
})(window);
