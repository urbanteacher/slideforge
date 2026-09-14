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
      /* "slide:12" is a jump inside the lesson rather than a trip out of it.
         Kept in the same mark as a web link because to the author it is the
         same act — put a link on this word — and a second mechanism would
         mean a second inspector, a second renderer and two ways to say one
         thing. safeHref refuses it, which is how the two are told apart. */
      var jump = !href && styles.link && SF.slideJumpTarget && SF.slideJumpTarget(styles.link);
      var span = document.createElement(href || jump ? 'a' : 'span'); span.textContent = text.slice(a,b);
      if (styles.bold) span.style.fontWeight = '800';
      if (styles.italic) span.style.fontStyle = 'italic';
      if (styles.underline) span.style.textDecoration = 'underline';
      if (color(styles.color)) span.style.color = styles.color;
      if (styles.highlight) { span.style.backgroundColor = '#fff0a6'; span.style.color = '#20251b'; }
      if (href) {
        var link = /** @type {HTMLAnchorElement} */ (span);
        link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.onclick = function(e){e.stopPropagation();};
      } else if (jump) {
        var hop = /** @type {HTMLAnchorElement} */ (span);
        hop.href = '#';
        hop.className = 'slide-jump';
        hop.title = 'Jump to rail slide ' + jump + ' (authoring order)';
        hop.onclick = function(e){ e.preventDefault(); e.stopPropagation(); SF.jumpToSlide(jump); };
      }
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
      var link = document.createElement('input'); link.type='text'; link.placeholder='https://… or slide:12'; link.setAttribute('aria-label','Web link or slide:N using the rail number'); link.title='Web: https://… · Inside this lesson: slide:12 — the number on the left of the rail (author order; hidden slides still count)'; bar.appendChild(link);
      var lb=document.createElement('button'); lb.type='button'; lb.textContent='Link'; lb.onclick=function(){ if(SF.safeHref(link.value)||SF.slideJumpTarget(link.value)) format('link',link.value); else SF.toast('Use an http(s) address, or slide:12 with the number on the left of the rail (author order — not the show count when slides are hidden)'); }; bar.appendChild(lb);
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
      img.style.setProperty('--img-fx', x + '%');
      img.style.setProperty('--img-fy', y + '%');
    });
  }
  var expanded=new Set();
  function inspector(parent,s,change) {
    var UI=SF.Shell.UI, box=document.createElement('details'); box.className='custom-controls';
    box.open=expanded.has(s.id);box.ontoggle=function(){if(box.open)expanded.add(s.id);else expanded.delete(s.id);};
    var summary=document.createElement('summary'); summary.textContent='Customise this slide'; box.appendChild(summary);
    var d=s.design || (s.design={});
    function choose(label,key,opts,fallback){box.appendChild(UI.field(label,UI.select(opts.map(function(x){return {value:String(x[0]),label:x[1]};}),String(d[key]||fallback),function(v){d[key]=(key==='imageShare'||key==='capFade')?Number(v):v;change();})));}
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
      choose('Picture mount','mediaGround',[
        ['card','On a card — for photographs and plates'],
        ['full','Edge to edge — for charts already on white']
      ],'card');
      choose('Image arrives','imageStep',[
        ['none','With the slide'],
        ['before','On a press, before the points'],
        ['after','On a press, after the points']
      ],'none');
    }
    if(s.type==='cards'){
      box.appendChild(UI.field('Cards layout',UI.select([
        {value:'grid',label:'Side by side'},
        {value:'rows',label:'Rows down the slide — full width each'},
        {value:'stack',label:'Stacked — one in front, the rest behind'}
      ],d.cardsMode==='stack'?'stack':d.cardsMode==='rows'?'rows':'grid',function(v){
        d.cardsMode=v;
        /* A stack with everything already on screen is just a pile. Choosing
           it turns the build on; going back to a row leaves it alone, since
           a side-by-side build is a perfectly ordinary thing to want. */
        if(v==='stack'){s.progressive=true;s.buildMode='dim';}
        change();
      }),'Each card gets its own moment, with the ones already covered showing behind.'));
    }
    if(s.activity){
      var ma=document.createElement('textarea');ma.rows=3;ma.value=s.modelAnswer||'';
      ma.placeholder='A worked answer the room sees after their attempt…';
      /* Typing in it is the confirmation: the draft flag exists to catch copy
         nobody has looked at, and somebody who has edited it has looked at it. */
      ma.oninput=function(){s.modelAnswer=ma.value;if(s.modelAnswerDraft)delete s.modelAnswerDraft;change();};
      box.appendChild(UI.field('Model answer',ma,
        'Turned over when the timer runs out, or by the ⇄ on the slide. Leave it empty for none — but an activity that asks for an attempt usually owes one.'));
      if(s.modelAnswerDraft){
        box.appendChild(SF.el('p','hint field-warn',
          'This answer came from the activity library and is written about another subject. '+
          'It will not be shown to the room until you rewrite it, or accept it as it stands.'));
        box.appendChild(UI.button('Use this answer as written','ghost',function(){
          delete s.modelAnswerDraft;change();
        }));
      }
    }
    /* Only worth asking where the answer is not already obvious from the
       theme: a picture slide's ground is whatever picture is on it. */
    if(s.type==='image'||s.type==='gallery'||s.type==='video'){
      choose('Logo sits on','logoGround',[
        ['','Let the theme decide'],
        ['dark','A dark background — show the logo white'],
        ['light','A light background — keep the logo as it is']
      ],'');
    }
    if(s.type==='image'||s.type==='gallery'){
      choose('Image frame','imageFrame',[
        ['','Full bleed — caption sits over the image'],
        ['16:9','16:9 landscape — caption below'],
        ['4:3','4:3 — caption below'],
        ['3:2','3:2 — caption below'],
        ['1:1','Square — caption below'],
        ['4:5','4:5 portrait — caption below']
      ],'');
    }
    if(s.type==='image'||s.type==='gallery'||(s.type==='split'&&s.subtitle)){
      choose('Caption style','capStyle',[
        ['scrim','Gradient over the image'],
        ['bar','Solid accent bar'],
        ['plain','Text only, no ground'],
        ['none','Hide the caption']
      ],'scrim');
      if(s.type==='image'||s.type==='gallery') choose('Caption position','capPos',[['bottom','Bottom'],['top','Top']],'bottom');
      /* Only the full-bleed picture slide: it is the one whose caption covers
         the thing the room is being asked to look at. */
      if(s.type==='image') choose('Caption clears itself','capFade',[
        [0,'Stays on the picture'],
        [5,'After 5 seconds'],
        [10,'After 10 seconds'],
        [15,'After 15 seconds'],
        [20,'After 20 seconds'],
        [30,'After 30 seconds']
      ],0);
      if(s.type==='image') box.appendChild(UI.field('Image motion',UI.select([
        {value:'',label:'Stays still'},
        {value:'zoom',label:'Slow zoom in'}
      ],d.imageMotion==='zoom'?'zoom':'',function(v){
        if(v==='zoom') d.imageMotion='zoom'; else delete d.imageMotion;
        change();
      }),'On the projector only. Zooms toward the Image focus point below.'));
    }
    if(s.type==='split'||s.type==='image') ['X','Y'].forEach(function(axis){
      var r=document.createElement('input');r.type='range';r.min='0';r.max='100';r.value=d['focal'+axis]==null?50:d['focal'+axis];r.onchange=function(){d['focal'+axis]=Number(r.value);change();};box.appendChild(UI.field('Image focus '+(axis==='X'?'horizontal':'vertical'),r));
    });
    if(['journey','mindmap','content','cards','split','keywords','italics','table','quote','explain','image','gallery'].includes(s.type)){
      var buildLabel=s.type==='gallery'?'Reveal one picture at a time (animated)'
        :s.type==='image'?'Hold the image back until the next press'
        :s.type==='table'?'Reveal one row at a time (animated)'
        :s.type==='quote'?'Reveal one line at a time (animated)'
        :s.type==='explain'?'Reveal one paragraph at a time (animated)'
        :'Reveal one bullet / point at a time (animated)';
      var buildValue=s.progressive!==true?'off':(s.buildMode==='dim'?'dim':'on');
      box.appendChild(UI.field('Build on Next',UI.select([
        {value:'off',label:'Show everything at once'},
        {value:'on',label:buildLabel},
        {value:'dim',label:buildLabel.replace(' (animated)',', dimming the ones before')}
      ].filter(function(o){return !(o.value==='dim'&&s.type==='image');}),buildValue,function(v){
        s.progressive=v!=='off';
        s.buildMode=v==='dim'?'dim':'hide';
        change();
      }),'Dimming keeps earlier points readable instead of hiding them \u2014 useful when the room needs the whole argument in view.'));
    }
    box.appendChild(UI.button('Reset to theme','ghost',function(){s.design={};s.formatting={};change();}));
    parent.appendChild(box);
  }
  SF.Custom={removeBullet:removeBullet,bind:bind,paint:paint,layout:layout,inspector:inspector,rebase:rebase,apply:apply,entry:entry};
})(window);
