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
    /* Card pictures ride on the same index, so a deleted card takes its photo
       with it rather than handing it to the card below. */
    if(Array.isArray(slide.images)&&index<slide.images.length)slide.images.splice(index,1);
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

  /**
   * Double-click editor on the canvas — same text + Bold/Italic/Underline
   * tools the inspector fields use. `onLive` repaints the slide while typing
   * or formatting; `onSave` / `onCancel` finish the edit.
   */
  function enableCanvasEditDrag(form, handle, box) {
    if (!form || !handle) return;
    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (e.target.closest('button, input, textarea, a, select, label')) return;
      e.preventDefault();
      var parent = form._canvasEditHost || box || form.offsetParent || form.parentElement;
      if (!parent) return;
      var pRect = parent.getBoundingClientRect();
      var fRect = form.getBoundingClientRect();
      var scaleX = pRect.width ? form.offsetWidth / fRect.width : 1;
      var scaleY = pRect.height ? form.offsetHeight / fRect.height : 1;
      var startX = e.clientX;
      var startY = e.clientY;
      var origLeft = form.offsetLeft;
      var origTop = form.offsetTop;
      form.style.right = 'auto';
      form.style.bottom = 'auto';
      form.style.left = origLeft + 'px';
      form.style.top = origTop + 'px';
      handle.setPointerCapture(e.pointerId);
      function move(ev) {
        var dx = (ev.clientX - startX) * scaleX;
        var dy = (ev.clientY - startY) * scaleY;
        var maxL = Math.max(0, parent.clientWidth - form.offsetWidth);
        var maxT = Math.max(0, parent.clientHeight - form.offsetHeight);
        form.style.left = Math.max(0, Math.min(maxL, origLeft + dx)) + 'px';
        form.style.top = Math.max(0, Math.min(maxT, origTop + dy)) + 'px';
      }
      function up(ev) {
        try { handle.releasePointerCapture(ev.pointerId); } catch (_) {}
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  /* Mount on the slide/canvas, not the slot — otherwise drag is trapped in one
     lattice cell and the panel covers the words it is editing. */
  function canvasEditHost(box) {
    return (box && (box.closest('.slide') || box.closest('#previewBox') || box.closest('.safe-stage'))) || box;
  }

  function placeCanvasEditForm(form, box, host) {
    host = host || canvasEditHost(box);
    form._canvasEditHost = host;
    var b = box.getBoundingClientRect();
    var h = host.getBoundingClientRect();
    var scaleX = h.width ? host.clientWidth / h.width : 1;
    var scaleY = h.height ? host.clientHeight / h.height : 1;
    var left = (b.left - h.left) * scaleX;
    var top = (b.bottom - h.top) * scaleY + 8;
    host.appendChild(form);
    var maxL = Math.max(0, host.clientWidth - form.offsetWidth);
    var maxT = Math.max(0, host.clientHeight - form.offsetHeight);
    /* Prefer below the slot; if that clips, sit above or to the side. */
    if (top > maxT) top = Math.max(0, (b.top - h.top) * scaleY - form.offsetHeight - 8);
    if (left > maxL) left = maxL;
    form.style.right = 'auto';
    form.style.bottom = 'auto';
    form.style.left = Math.max(0, Math.min(maxL, left)) + 'px';
    form.style.top = Math.max(0, Math.min(maxT, top)) + 'px';
  }

  function openCanvasEditor(box, s, key, opts) {
    opts = opts || {};
    if (!box || !s || !key) return;
    var host = canvasEditHost(box);
    host.querySelectorAll('.canvas-edit-form').forEach(function (n) { n.remove(); });

    var bulletMatch = /^bullets\.(\d+)$/.exec(key);
    var oldRaw = bulletMatch ? String(s.bullets[Number(bulletMatch[1])] || '') : String(s[key] || '');
    var oldEntry = s.formatting && s.formatting[key]
      ? JSON.parse(JSON.stringify(s.formatting[key]))
      : null;
    var keywordFriendly = !!(bulletMatch && s.type === 'keywords' && SF.parseKeywordLine && SF.formatKeywordLine);
    var shown = oldRaw;
    if (keywordFriendly) {
      var pair = SF.parseKeywordLine(oldRaw);
      shown = pair.def ? (pair.term + ' — ' + pair.def) : pair.term;
    }

    var current = shown;
    /* While the form is open the slide holds the textarea text so selection
       indices for Bold / Italic / Underline match what the teacher sees. */
    if (shown !== oldRaw) {
      rebase(s, key, oldRaw, shown);
      if (bulletMatch) s.bullets[Number(bulletMatch[1])] = shown;
      else s[key] = shown;
    }

    var form = document.createElement('div');
    form.className = 'canvas-edit-form';
    var drag = document.createElement('div');
    drag.className = 'canvas-edit-drag';
    drag.setAttribute('role', 'button');
    drag.tabIndex = 0;
    drag.title = 'Drag to move this panel across the canvas';
    drag.innerHTML = '<span>Edit slide content</span><span class="canvas-edit-drag-hint">Drag</span>';
    form.appendChild(drag);
    enableCanvasEditDrag(form, drag, host);

    var label = document.createElement('label');
    label.textContent = 'Text';
    var area = document.createElement('textarea');
    area.value = shown || '';
    area.rows = 3;
    area.setAttribute('aria-label', 'Edit slide content');
    label.appendChild(area);
    form.appendChild(label);

    /* Lab lattice (Engine 3): line tariff + column width live in this form so
       the slide is not crowded with per-slot −/+ chrome. Production ignores this. */
    if (opts.lattice) {
      var lattice = opts.lattice;
      var layout = document.createElement('div');
      layout.className = 'canvas-edit-lattice';
      layout.setAttribute('role', 'group');
      layout.setAttribute('aria-label', 'Slot size on the 16×12 lattice');

      function row(kind, value, bands, apply) {
        var wrap = document.createElement('div');
        wrap.className = 'canvas-edit-lattice-row';
        var name = document.createElement('span');
        name.className = 'canvas-edit-lattice-label';
        name.textContent = kind === 'rows' ? 'Lines' : 'Width';
        var dec = document.createElement('button');
        dec.type = 'button';
        dec.className = 'btn ghost';
        dec.textContent = '−';
        var val = document.createElement('span');
        val.className = 'canvas-edit-lattice-val';
        val.textContent = value + (kind === 'rows' ? 'r' : 'c');
        var inc = document.createElement('button');
        inc.type = 'button';
        inc.className = 'btn ghost';
        inc.textContent = '+';
        function set(n) {
          var next = apply(n);
          if (next == null) return;
          val.textContent = next + (kind === 'rows' ? 'r' : 'c');
          value = next;
        }
        dec.onclick = function () { set(value - 1); };
        inc.onclick = function () { set(value + 1); };
        wrap.appendChild(name);
        wrap.appendChild(dec);
        wrap.appendChild(val);
        wrap.appendChild(inc);
        bands.forEach(function (n) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn ghost';
          b.textContent = String(n);
          b.onclick = function () { set(n); };
          wrap.appendChild(b);
        });
        layout.appendChild(wrap);
      }
      row('rows', lattice.rows, lattice.rowBands || [2, 3, 4], lattice.onRows);
      row('cols', lattice.cols, lattice.colBands || [5, 6, 12], lattice.onCols);
      form.appendChild(layout);
    }

    function writeShown(v) {
      var prev = current;
      current = v;
      rebase(s, key, prev, v);
      if (bulletMatch) s.bullets[Number(bulletMatch[1])] = v;
      else s[key] = v;
      /* Do not rebuild the preview here — the form lives inside #previewBox,
         and a repaint would tear it down mid-edit. Save / Cancel redraw. */
    }
    area.addEventListener('input', function () { writeShown(area.value); });
    bind(area, s, key, function () { /* marks land on the slide; visible after Save */ });

    function restore() {
      if (bulletMatch) s.bullets[Number(bulletMatch[1])] = oldRaw;
      else s[key] = oldRaw;
      if (!s.formatting) s.formatting = {};
      if (oldEntry) s.formatting[key] = oldEntry;
      else delete s.formatting[key];
    }

    var save = document.createElement('button');
    save.type = 'button';
    save.className = 'btn primary';
    save.textContent = 'Save content';
    save.onclick = function () {
      var next = area.value;
      if (keywordFriendly) {
        var edited = SF.parseKeywordLine(next);
        next = SF.formatKeywordLine(edited.term, edited.def);
        rebase(s, key, current, next);
      }
      if (bulletMatch) s.bullets[Number(bulletMatch[1])] = next;
      else s[key] = next;
      form.remove();
      if (opts.onSave) opts.onSave();
    };
    form.appendChild(save);

    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn ghost';
    cancel.textContent = 'Cancel';
    cancel.onclick = function () {
      restore();
      form.remove();
      if (opts.onCancel) opts.onCancel();
    };
    form.appendChild(cancel);

    placeCanvasEditForm(form, box, host);
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
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
    });
  }
  var expanded=new Set();
  function inspector(parent,s,change,opts) {
    opts=opts||{};
    var UI=SF.Shell.UI, box;
    if(opts.bare){
      box=document.createElement('div'); box.className='custom-controls';
    }else{
      box=document.createElement('details'); box.className='custom-controls';
      box.open=expanded.has(s.id);box.ontoggle=function(){if(box.open)expanded.add(s.id);else expanded.delete(s.id);};
      var summary=document.createElement('summary'); summary.textContent='Customise this slide'; box.appendChild(summary);
    }
    var d=s.design || (s.design={});
    function choose(label,key,opts,fallback){box.appendChild(UI.field(label,UI.select(opts.map(function(x){return {value:String(x[0]),label:x[1]};}),String(d[key]||fallback),function(v){d[key]=(key==='imageShare'||key==='capFade')?Number(v):v;change();})));}
    var currentDeck = SF.Editor && SF.Editor.deck ? SF.Editor.deck() : null;
    var compositions = SF.compositionOptions ? SF.compositionOptions(s, currentDeck && currentDeck.theme) : [];
    if (compositions.length) {
      choose('Composition','composition', [['','Theme default'],['none','Original layout']].concat(compositions.map(function (key) {
        return [key, SF.COMPOSITIONS[key].label];
      })), '');
      var compositionHint = document.createElement('p');
      compositionHint.className = 'hint';
      compositionHint.textContent = 'Change the arrangement without changing your theme or content. Shorten copy before increasing text size.';
      box.appendChild(compositionHint);
    }
    if (SF.supportsChromeRegions(SF,currentDeck,s)) {
      choose('Header and footer','chromeLayout',[['','Theme placement'],['regions','Named regions']],'');
      if(d.chromeLayout==='regions') {
        var positions=SF.chromePositions(d);
        [['identitySlot','Theme identity position'],['logoSlot','Logo position'],['contextSlot','Slide context position'],['closingSlot','Closing text position'],['numberSlot','Page number position']].forEach(function(pair){
          box.appendChild(UI.field(pair[1],UI.select(SF.CHROME_SLOTS.map(function(slot){return {value:slot,label:slot.replace('-', ' · ').replace('center','centre')};}),positions[pair[0]],function(value){SF.setChromeSlot(s,pair[0],value);change();})));
        });
        var regionHint=document.createElement('p');regionHint.className='hint';regionHint.textContent='Hover over a header or footer item and drag its move handle, or click the handle to choose a slot. Moving into an occupied slot swaps positions. Deck settings still control logo and number visibility. Context stays with the body when the composition uses it there.';box.appendChild(regionHint);
      }
    }
    if (SF.slideComposition(currentDeck, s) === 'poster-art') {
      var artworkInput=document.createElement('input'); artworkInput.type='text'; artworkInput.value=s.image || '';
      artworkInput.onchange=function(){s.image=SF.safeMedia(artworkInput.value);change();};
      box.appendChild(UI.field('Poster artwork · image URL or asset path',artworkInput));
    }
    choose('Text alignment','align',[['left','Left'],['center','Centre'],['right','Right']],'left');
    choose('Text size','size',[
      ['small','Small'],
      ['medium','Theme default'],
      ['large','Large'],
      ['x2','Display · twice the size'],
      ['x3','Poster · three times'],
      ['x5','Hero · five times, as far as it fits']
    ],'medium');
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
        {value:'stack',label:'Stacked — one in front, the rest behind'},
        {value:'pictures',label:'Picture cards — an image slot above each card'}
      ],['stack','rows','pictures'].indexOf(d.cardsMode)>=0?d.cardsMode:'grid',function(v){
        d.cardsMode=v;
        if (SF.slideComposition(currentDeck,s)) d.composition='none';
        /* A stack with everything already on screen is just a pile. Choosing
           it turns the build on; going back to a row leaves it alone, since
           a side-by-side build is a perfectly ordinary thing to want. */
        if(v==='stack'){s.progressive=true;s.buildMode='dim';}
        change();
      }),'Each card gets its own moment, with the ones already covered showing behind.'));
      if(d.cardsMode==='pictures'||(s.images||[]).some(Boolean)){
        choose('Picture shape','cardPics',[['covers','Portrait 3:4 — crops to fill'],['plates','Landscape 4:3 — whole figure, letterboxed']],'covers');
      }
    }
    if(s.type==='stats'){
      choose('Tile style','statStyle',[
        ['tile','Big number over its label'],
        ['ring','Ring — filled to the number\u2019s share'],
        ['bar','KPI bar under the number']
      ],'tile');
      /* A ring encodes its number as an arc, and arc sits below position and
         length on the channel ranking this app teaches in the chart picker.
         One ring is a dial and reads fine; four rings are four dials the eye
         cannot line up, and the same four numbers as a sorted bar would be
         read accurately at a glance. Said here rather than refused, because
         one hero number in a ring is a legitimate choice. */
      if((s.design||{}).statStyle==='ring'){
        var ringN=(s.bullets||[]).filter(function(b){
          var pr=SF.parseInfoLine(b);
          return String(pr.label||'').trim()||String(pr.value||'').trim();
        }).length;
        if(ringN>1) box.appendChild(SF.el('p','hint field-warn',
          'Rings encode each number as an arc, which the eye compares less accurately than a length. '+
          'With '+ringN+' of them nobody can line them up \u2014 KPI bar reads the same numbers '+
          'correctly, and the ring is at its best on a single figure you want looked at.'));
      }
    }
    if(s.type==='funnel'){
      choose('Direction','funnelDirection',[['down','Funnel — widest at the top'],['up','Pyramid — widest at the bottom']],'down');
      /* The same move the chart picker makes with "Not sure which? Start from
         the question": name the honest alternative rather than block the
         choice. A funnel draws what is LEFT at each stage; the FT taxonomy
         calls that question Flow, and the Sankey this app already draws shows
         where the missing ones WENT, which is usually the interesting half. */
      box.appendChild(SF.el('p','hint',
        'A funnel shows what is left at each stage. If where the rest went matters \u2014 rejected, '+
        'declined, lapsed \u2014 that question is Flow in the chart picker, and a Sankey carries both. '+
        'The drop between two stages is printed for you either way.'));
    }
    if(s.type==='timeline'){
      choose('Shape','timelineMode',[['horizontal','Across — one rail, dates above events'],['vertical','Down — a spine with a paragraph per event']],'horizontal');
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
    if(s.type==='image'||s.type==='gallery'||s.type==='video'||(s.type==='split'&&s.subtitle)){
      choose('Caption style','capStyle',[
        ['scrim','Gradient over the image'],
        ['bar','Solid accent bar'],
        ['plain','Text only, no ground'],
        ['none','Hide the caption']
      ],'scrim');
      if(s.type==='image'||s.type==='gallery'||s.type==='video') choose('Caption position','capPos',[['bottom','Bottom'],['top','Top']],'bottom');
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
      if(s.type==='image') {
        box.appendChild(UI.field('Image motion',UI.select([
          {value:'',label:'Stays still'},
          {value:'zoom',label:'Slow zoom in'},
          {value:'travel',label:'Travel — from one point to another'}
        ],d.imageMotion==='travel'?'travel':d.imageMotion==='zoom'?'zoom':'',function(v){
          if(v==='zoom'||v==='travel') d.imageMotion=v; else delete d.imageMotion;
          change();
        }),'On the projector only. Zoom drifts toward the focus point below; Travel moves from it to a second point.'));
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
          }),'Set the start with Image focus below, the end with Travels to above. Same point twice means no move, and none is drawn.'));
        }
      }
    }
    /* Code: how it arrives, and how fast. Neither was settable before — the
       layout shipped with a character typewriter at one speed and no way to
       ask for anything else, which is fine until you are walking a room
       through fourteen lines and want a press per line. */
    if(s.type==='chart'){
      /* Silent truncation is the worst kind. A chart reads its numbers
         through the table parser, which stops at TABLE_MAX_ROWS — header plus
         eleven — so a longer paste is quietly cut and the chart looks
         finished. It cost a real slide in a real lesson: seventy-two months
         were pasted, eleven were drawn, and the caption underneath went on
         claiming six years including a lockdown that was no longer on the
         picture. Nothing warned anybody. */
      var pasted = String(s.body||'').split(/\r?\n/).filter(function(l){return l.trim();}).length;
      var drawnRows = Math.max(0, Math.min(pasted, SF.TABLE_MAX_ROWS) - 1);
      var lost = pasted - 1 - drawnRows;
      if(lost > 0) box.appendChild(SF.el('p','hint field-warn',
        'Only the first '+drawnRows+' rows are drawn — '+lost+' more were pasted and are '+
        'not on the chart. A chart reads its numbers through the table parser, which stops at '+
        SF.TABLE_MAX_ROWS+' rows including the header. Aggregate them (months to quarters, '+
        'days to months) or split the range across two slides, and check the caption still '+
        'describes what is drawn.'));
    }
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
    /* Chart motion and focus, on design beside image motion and for the same
       reason: both are how a slide behaves rather than what it says, and a
       chart that grows out of its own axis is the same kind of decision as a
       picture that drifts. */
    if(s.type==='chart'){
      box.appendChild(UI.field('Chart motion',UI.select([
        {value:'',label:'Already drawn'},
        {value:'grow',label:'Draws itself when the slide arrives'}
      ],d.chartMotion==='grow'?'grow':'',function(v){
        if(v==='grow') d.chartMotion='grow'; else delete d.chartMotion;
        change();
      }),'Bars rise from the axis, lines draw along, wedges sweep round. On the projector only.'));

      var cd=SF.chartData(s);
      if(cd.series.length>1){
        var seriesOpts=[{value:'',label:'Show them all evenly'}];
        cd.series.forEach(function(sr,i){seriesOpts.push({value:String(i),label:'Isolate “'+sr.name+'”'});});
        box.appendChild(UI.field('Focus one series',UI.select(seriesOpts,
          d.chartFocus==null?'':String(d.chartFocus),function(v){
            if(v==='') delete d.chartFocus; else d.chartFocus=Number(v);
            change();
          }),
          'Holds the others back rather than removing them, so the comparison is still there to return to.'));
      }
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
    box.appendChild(UI.button('Reset to theme','ghost',function(){s.design={};s.formatting={};change();}));
    if (SF.Review && currentDeck) box.appendChild(UI.button('Review slides & check fit','ghost',function(){SF.Review.open(currentDeck);}));
    var guide=document.createElement('a');guide.href='design-guide.html';guide.target='_blank';guide.rel='noopener';guide.textContent='Design controls guide';
    box.appendChild(guide);
    tagControls(box,s,'Look');
    parent.appendChild(box);
  }
  // The guide and reachability checks share the same public control identifiers.
  function tagControls(root, slide, pane) {
    root.querySelectorAll('.field > label').forEach(function(label){
      var text=label.firstChild ? label.firstChild.textContent.trim() : '';
      var key=Object.keys(SF.DESIGN_CONTROLS).find(function(k){
        var c=SF.DESIGN_CONTROLS[k];return c.pane===pane && c.label===text && SF.designApplies(k,slide.type);
      });
      if(key) label.parentElement.dataset.designKey=key;
    });
  }
  SF.Custom={tagControls:tagControls,removeBullet:removeBullet,bind:bind,openCanvasEditor:openCanvasEditor,enableCanvasEditDrag:enableCanvasEditDrag,placeCanvasEditForm:placeCanvasEditForm,canvasEditHost:canvasEditHost,paint:paint,layout:layout,inspector:inspector,rebase:rebase,apply:apply,entry:entry};
})(window);
