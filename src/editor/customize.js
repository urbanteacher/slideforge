/* Formatting stays separate from plain lesson text: phones and exports never
   receive HTML, and all slide surfaces share the same safe DOM renderer. */

/* What is left of the editor's customize file: the marks engine (value, entry,
 * apply, rebase, paint), layout, and the Motion pane. The Look pane and the
 * in-place canvas editing went with the classic editor (M15 step 2); the
 * Lesson studio edits in the lab.
 *
 * It installs rather than returns: the public surface is the single SF.Custom
 * assignment at the bottom. Nothing runs at load. js/render.js and
 * src/render/lattice.js reach paint and layout as they draw.
 */
export function installCustom(SF) {
  var color = function (v) { return /^#[0-9a-f]{6}$/i.test(v || '') ? v : ''; };
  /* The one reader every part of the marks engine goes through, so a new place
     for words has to be taught here and nowhere else. It is called on
     every paint of every block and must stay a single expression.
     Blocks the author added live in slide.blocks, keyed blocks.<id>. */
  function value(s, key) {
    if (key.indexOf('bullets.') === 0) return String(s.bullets[Number(key.split('.')[1])] || '');
    if (key.indexOf('blocks.') === 0) {
      var block = SF.freeBlockById && SF.freeBlockById(s, key.slice(7));
      return String((block && block.text) || '');
    }
    return String(s[key] || '');
  }
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
  function layout(root,s) {
    var d=s.design || {}, pad=root.querySelector('.pad');
    if (!pad || s.type==='quiz' || s.type==='game') return;
    if (['left','center','right'].includes(d.align)) {
      pad.style.textAlign=d.align;
      if (root.dataset.composition) root.querySelectorAll('[data-content-key]').forEach(function(n){n.style.textAlign=d.align;});
      /* Named as well as styled, because the accent bar is a box rather than
         text: text-align does nothing to it, and a bar pinned to the left
         under centred type reads as a mistake rather than a choice. */
      pad.classList.add('pad-align-'+d.align);
    }
    if (color(d.background)) root.style.background=d.background;
    if (color(d.textColor)) {
      root.style.setProperty('--s-fg',d.textColor);root.style.setProperty('--s-dim',d.textColor);
      root.querySelectorAll('.pad h1,.pad h2,.sub,.q,.attrib,.cap,.pad li,.kw-term,.kw-def,.it-phrase,.it-note,.ln-label,.ln-link,.tbl th,.tbl td').forEach(function(n){n.style.color=d.textColor;});
    }
    /* Up to five times the theme's own size, for a cover with three words on
       it. The steps above Large are display sizes: they exist because the
       answer to "make it huge" used to be +15%, and a hand-typed font size is
       not something a theme can keep in proportion.

       Asked for, then fitted. Five times a 76px heading is 380px, which is
       most of a 720px slide before the subtitle, so a wordy title at x5 would
       simply fall off the bottom. Rather than refuse the size or let it
       overflow, the pass below grows the type and then steps it back until it
       fits — never below the theme's own size, which never overflowed. Same
       discipline as the code panel's font bands and the quiz answer fitter. */
    var scale={small:.85,medium:1,large:1.15,x2:2,x3:3,x5:5}[d.size] || 1;
    if(scale!==1) requestAnimationFrame(function(){
      var nodes=[];
      root.querySelectorAll('h1,h2,.sub,.q,.attrib,li,.kw-term,.kw-def,.it-phrase,.it-note,.ln-label,.ln-link,.ln-url,.cp [data-content-key]').forEach(function(n){
        var px=parseFloat(getComputedStyle(n).fontSize); if(px) nodes.push([n,px]);
      });
      if(!nodes.length) return;
      /* Fine steps rather than coarse: at 10% a time, x3 and x5 came to rest
         on different rungs of the same ladder (215px and 208px for the same
         four words), which looks like a bug even though both mean "as big as
         this slide allows". At 4% every request above the ceiling converges
         on it. */
      var want=scale;
      for(var pass=0;pass<40;pass++){
        nodes.forEach(function(pair){ pair[0].style.fontSize=(pair[1]*want)+'px'; });
        var overflowing=pad.scrollHeight>pad.clientHeight+1 || pad.scrollWidth>pad.clientWidth+1;
        if(!overflowing || want<=1) break;
        want=Math.max(1,want*0.96);
      }
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
      img.classList.toggle('img-flip', d.imageFlip===true && (s.type==='image'||s.type==='split'));
    });
  }
  /* One select bound to one design key. The registry in src/design-controls.js
     wins when it knows the key; the argument stays as the fallback for
     anything it does not. */
  function chooser(UI,box,d,change){
    return function choose(label,key,opts,fallback){var meta=SF.DESIGN_CONTROLS&&SF.DESIGN_CONTROLS[key];box.appendChild(UI.field((meta&&meta.label)||label,UI.select(opts.map(function(x){return {value:String(x[0]),label:x[1]};}),String(d[key]||fallback),function(v){d[key]=(key==='imageShare'||key==='capFade')?Number(v):v;change();})));};
  }
  /* Everything on a slide that moves or waits: what builds on a press, what
     drifts once it is up, and what leaves on its own. Drawn by the Motion
     pane under Transition in, which is the first thing that moves. These sat
     in Look until 2026-09-24 — most of them were built before the Motion tab
     existed and stayed where they were first put. */
  function motion(parent,s,change){
    var UI=SF.Shell.UI;
    var box=document.createElement('div'); box.className='custom-controls motion-controls';
    var d=s.design || (s.design={});
    var choose=chooser(UI,box,d,change);
    if(['journey','mindmap','content','cards','split','keywords','italics','table','quote','explain','image','gallery'].includes(s.type)){
      var buildLabel=s.type==='gallery'?'Reveal one picture at a time (animated)'
        :s.type==='image'?'Hold the image back until the next press'
        :s.type==='table'?'Reveal one row at a time (animated)'
        :s.type==='quote'?'Reveal one line at a time (animated)'
        :s.type==='explain'?'Reveal one paragraph at a time (animated)'
        :'Reveal one bullet / point at a time (animated)';
      var buildValue=s.progressive!==true?'off':(s.buildMode==='dim'||s.buildMode==='spot'?s.buildMode:'on');
      box.appendChild(UI.field('Build on Next',UI.select([
        {value:'off',label:'Show everything at once'},
        {value:'on',label:buildLabel},
        {value:'dim',label:buildLabel.replace(' (animated)',', dimming the ones before')},
        {value:'spot',label:buildLabel.replace(' (animated)',', with a spotlight on the live one')}
      ].filter(function(o){return !((o.value==='dim'||o.value==='spot')&&s.type==='image');}),buildValue,function(v){
        s.progressive=v!=='off';
        s.buildMode=v==='dim'||v==='spot'?v:'hide';
        change();
      }),'Dimming keeps earlier points readable instead of hiding them \u2014 useful when the room needs the whole argument in view. Spotlight does that and takes the light off the rest of the slide, which is the other half of what a presenter does with their hand.'));
    }
    if(s.type==='split'){
      choose('Image arrives','imageStep',[
        ['none','With the slide'],
        ['before','On a press, before the points'],
        ['after','On a press, after the points']
      ],'none');
    }
    if(s.type==='image') {
      box.appendChild(UI.field('Image motion',UI.select([
        {value:'',label:'Stays still'},
        {value:'zoom',label:'Slow zoom in'},
        {value:'travel',label:'Travel — from one point to another'}
      ],d.imageMotion==='travel'?'travel':d.imageMotion==='zoom'?'zoom':'',function(v){
        if(v==='zoom'||v==='travel') d.imageMotion=v; else delete d.imageMotion;
        change();
      }),'On the projector only. Zoom drifts toward the image focus (set in Look); Travel moves from it to a second point.'));
      if(d.imageMotion==='travel'){
        ['X','Y'].forEach(function(axis){
          var r=document.createElement('input');r.type='range';r.min='0';r.max='100';
          r.value=d['focal'+axis+'2']==null?50:d['focal'+axis+'2'];
          r.onchange=function(){d['focal'+axis+'2']=Number(r.value);change();};
          box.appendChild(UI.field('Travels to '+(axis==='X'?'horizontal':'vertical'),r));
        });
        box.appendChild(UI.field('How long the move takes',UI.select([
          {value:'12',label:'12 seconds'},
          {value:'20',label:'20 seconds'},
          {value:'30',label:'30 seconds — barely visible, on purpose'}
        ],String(d.imageTravelSecs||20),function(v){
          var n=Number(v); if(n===20) delete d.imageTravelSecs; else d.imageTravelSecs=n;
          change();
        }),'Set the start with Image focus in Look, the end with Travels to above. Same point twice means no move, and none is drawn.'));
      }
    }
    if(s.type==='image'){
      /* Only the full-bleed picture slide: it is the one whose caption covers
         the thing the room is being asked to look at. */
      choose('Caption clears itself','capFade',[
        [0,'Stays on the picture'],
        [5,'After 5 seconds'],
        [10,'After 10 seconds'],
        [15,'After 15 seconds'],
        [20,'After 20 seconds'],
        [30,'After 30 seconds']
      ],0);
    }
    /* A chart that grows out of its own axis is the same kind of decision as
       a picture that drifts: how the slide behaves, not what it says. */
    if(s.type==='chart'){
      box.appendChild(UI.field('Chart motion',UI.select([
        {value:'',label:'Already drawn'},
        {value:'grow',label:'Draws itself when the slide arrives'}
      ],d.chartMotion==='grow'?'grow':'',function(v){
        if(v==='grow') d.chartMotion='grow'; else delete d.chartMotion;
        change();
      }),'Bars rise from the axis, lines draw along, wedges sweep round. On the projector only.'));
    }
    /* Code: how it arrives, and how fast. Neither was settable before — the
       layout shipped with a character typewriter at one speed and no way to
       ask for anything else, which is fine until you are walking a room
       through fourteen lines and want a press per line. */
    if(s.type==='code'){
      box.appendChild(UI.field('How the code arrives',UI.select([
        {value:'all',label:'All at once'},
        {value:'type',label:'Types itself'},
        {value:'lines',label:'One line per press'}
      ],s.codeReveal||'type',function(v){
        s.codeReveal=v; s.typewrite=(v==='type');
        change();
      }),'All at once to talk over it. Types itself for a live-coding feel. One line per press when the walk-through is the teaching — Next and Prev move through it like bullets.'));
      if((s.codeReveal||'type')==='type'){
        box.appendChild(UI.field('Typing speed',UI.select([
          {value:'110',label:'Slow — read along'},
          {value:'80',label:'Deliberate'},
          {value:'55',label:'Steady'},
          {value:'34',label:'Brisk'},
          {value:'18',label:'Fast — barely readable'}
        ],String(s.typeSpeed||55),function(v){
          s.typeSpeed=Number(v); change();
        }),'Milliseconds between characters, so a larger number is slower. Press Next while it is typing to skip to the end.'));
      }
    }
    /* A cover can have motion behind it, drawn from this theme's own colours
       rather than from a video file. Offered on the two full-bleed layouts
       only: on a slide with content it would sit under the words. */
    if(s.type==='title'||s.type==='section'){
      choose('Backdrop motion','backdrop',[
        ['','Still — the theme decides'],
        ['drift','Drift — colour moving slowly'],
        ['grid','Grid — a ruled plane travelling'],
        ['glow','Glow — one slow breath behind the words']
      ],'');
    }
    parent.appendChild(box);
  }
  SF.Custom={motion:motion,paint:paint,layout:layout,rebase:rebase,apply:apply,entry:entry};
}
