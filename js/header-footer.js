/* Six alignment anchors. Defaults belong to the deck; overrides to one slide. */
(function () {
  'use strict';
  var SF = window.SF;
  var open = false, scope = 'deck', selected = 'header-left';
  var panel, fields = {}, warning;
  function deck() { return SF.Editor && SF.Editor.deck(); }
  function slide() { return SF.Editor && SF.Editor.currentSlide(); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function defaults() {
    return {enabled:false, hideOnCover:true, slots:{
      'header-left':{kind:'title'}, 'header-right':{kind:'logo'},
      'footer-left':{kind:'tagline'}, 'footer-right':{kind:'pages'}
    }};
  }
  function config() {
    if (!deck() || !slide()) return defaults();
    return (scope === 'slide' ? SF.headerFooterConfig(deck(), slide()) : deck().headerFooter) || defaults();
  }
  function save(change) {
    var target = scope === 'deck' ? deck() : slide();
    if (!target) return;
    var value = clone(config());
    if (!value.slots || typeof value.slots !== 'object') value.slots = {};
    change(value);
    target.headerFooter = value;
    SF.Editor.commitActivityChange();
    SF.Editor.refreshCanvas();
    refresh();
  }
  function updateItem(key, value) {
    save(function(c) {
      var item = c.slots[selected] || {kind:'empty'};
      item[key] = value;
      c.slots[selected] = item;
    });
  }
  function node(tag, text, parent) {
    var n = document.createElement(tag);
    if (text) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function selectField(parent, label, name, choices, change) {
    var wrap = node('label', label, parent), input = node('select', '', wrap);
    choices.forEach(function(pair) { var o=node('option', pair[1], input);o.value=pair[0]; });
    input.addEventListener('change', function(){change(input.value);});
    fields[name]=input;
    return input;
  }
  function textField(parent, label, name) {
    var wrap=node('label', label, parent), input=node('input','',wrap);input.type='text';
    input.addEventListener('change', function(){updateItem(name,input.value);});
    fields[name]=input;
  }
  function mount(host) {
    if (!panel || !host) return;
    host.appendChild(panel);
    open = true;
    refresh();
  }
  function refresh() {
    if (!panel) return;
    var preview=document.getElementById('previewBox');
    if(preview)preview.classList.toggle('hf-editing',open);
    if (!open || !deck() || !slide()) return;
    var c=config(), item=(c.slots||{})[selected]||{kind:'empty'};
    fields.enabled.checked=!!c.enabled;
    fields.hideOnCover.checked=!!c.hideOnCover;
    fields.scope.value=scope;
    fields.kind.value=item.kind||'empty';
    fields.placement.value=item.placement||'slot';
    fields.anchor.value=item.anchor||'middle-center';
    ['text','alt'].forEach(function(k){if(document.activeElement!==fields[k])fields[k].value=item[k]||'';});
    fields.text.parentElement.hidden=item.kind!=='text';
    fields.alt.parentElement.hidden=item.kind!=='image' && item.kind!=='logo';
    fields.picture.parentElement.hidden=item.kind!=='image';
    fields.tagline.parentElement.hidden=item.kind!=='tagline';
    if(document.activeElement!==fields.tagline)fields.tagline.value=deck().closingNote||'';
    fields.anchor.parentElement.hidden=item.placement!=='canvas';
    panel.querySelectorAll('[data-hf-choice]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.hfChoice===selected));});
    if(preview)preview.querySelectorAll('[data-hf-slot]').forEach(function(n){n.toggleAttribute('data-hf-selected',n.dataset.hfSlot===selected);});
    var inherited=scope==='slide'&&!slide().headerFooter;
    warning.textContent=inherited?'Following presentation defaults. Your next edit creates a slide override.':
      scope==='deck'&&slide().headerFooter?'This slide has its own override. Choose This slide and Restore defaults to follow the presentation.':
      c.hideOnCover && (slide().type==='title'||deck().slides.indexOf(slide())===0)?'Headers and footers are hidden on this cover.':
      !c.enabled?'Enable headers and footers to display these slots.':'Empty neighbouring slots release space. Canvas placement may overlap content.';
    warning.classList.remove('hf-warning');
    requestAnimationFrame(function(){
      if(!open || !preview)return;
      var overflow=Array.from(preview.querySelectorAll('.sf-furniture-cell')).some(function(n){return n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1;});
      if(overflow){warning.textContent='A slot is too full. Shorten its text or free a neighbouring slot.';warning.classList.add('hf-warning');}
      var body=preview.querySelector('.sf-hf-managed > .pad');
      if(body && (body.scrollHeight>body.clientHeight+2 || body.scrollWidth>body.clientWidth+2)){
        warning.textContent='Slide content exceeds the reserved body area. Adjust its layout or shorten the content.';
        warning.classList.add('hf-warning');
      }
    });
  }
  function setOpen(on) {
    open=!!on;
    if(open){
      if(SF.Artwork && SF.Artwork.isEditing())SF.Artwork.setEditing(false);
      if(SF.Arrange && SF.Arrange.isArranging())SF.Arrange.setArranging(false);
    }
    refresh();
  }
  function install() {
    /* Built detached and mounted into the inspector's Header pane by
       drawInspector. Not under the canvas: eighteen controls there left the
       slide 169px tall on a 900px window. Not stacked above the inspector
       either — that column is the editor, so this joins its pane row rather
       than displacing it. */
    panel=node('section','');panel.className='hf-panel';panel.id='headerFooterPanel';
    panel.setAttribute('aria-label','Header and footer slots');
    var toolbar=node('div','',panel);toolbar.className='hf-toolbar';
    selectField(toolbar,'Apply to','scope',[['deck','Presentation defaults'],['slide','This slide']],function(v){scope=v;refresh();});
    ['enabled','hideOnCover'].forEach(function(k){
      var label=node('label',k==='enabled'?'Enabled':'Hide on covers',toolbar), input=node('input','',label);
      input.type='checkbox';fields[k]=input;input.onchange=function(){save(function(c){c[k]=input.checked;});};
    });
    var reset=node('button','Restore defaults',toolbar);reset.type='button';reset.className='canvas-bar-btn';
    reset.onclick=function(){
      var target=scope==='deck'?deck():slide();if(!target)return;
      delete target.headerFooter;SF.Editor.commitActivityChange();SF.Editor.refreshCanvas();refresh();
      SF.toast(scope==='deck'?'Theme header and footer restored.':'This slide follows the presentation defaults.');
    };
    var done=node('button','Done',toolbar);done.type='button';done.className='canvas-bar-btn';done.onclick=function(){setOpen(false);};
    var slots=node('div','',panel);slots.className='hf-slots';
    ['header','footer'].forEach(function(band){['left','center','right'].forEach(function(side){
      var key=band+'-'+side, b=node('button',(band==='header'?'Header':'Footer')+' '+(side==='center'?'centre':side),slots);
      b.type='button';b.dataset.hfChoice=key;b.onclick=function(){selected=key;refresh();};
    });});
    var form=node('div','',panel);form.className='hf-fields';
    selectField(form,'Content','kind',[['empty','Empty'],['text','Text'],['image','Image'],['logo','Presentation logo'],['number','Page number'],['pages','Page / total'],['tagline','Theme tagline'],['title','Presentation title'],['section','Section title']],function(v){updateItem('kind',v);});
    selectField(form,'Place','placement',[['slot','Header / footer slot'],['canvas','Canvas anchor']],function(v){updateItem('placement',v);});
    var anchors=[];['top','middle','bottom'].forEach(function(y){['left','center','right'].forEach(function(x){anchors.push([y+'-'+x,y+' '+(x==='center'?'centre':x)]);});});
    selectField(form,'Anchor','anchor',anchors,function(v){updateItem('anchor',v);});
    textField(form,'Text','text');textField(form,'Image description','alt');
    var taglineLabel=node('label','Presentation tagline',form), tagline=node('input','',taglineLabel);
    tagline.type='text';fields.tagline=tagline;
    tagline.placeholder='Uses organisation name when blank';
    tagline.onchange=function(){
      if(!deck())return;deck().closingNote=tagline.value;
      SF.Editor.commitActivityChange();SF.Editor.refreshCanvas();refresh();
    };
    var label=node('label','Choose image',form), picture=node('input','',label);picture.type='file';picture.accept='image/*';fields.picture=picture;
    picture.onchange=function(){
      var file=picture.files&&picture.files[0];picture.value='';if(!file)return;
      if(!/^image\//.test(file.type)){SF.toast('Choose an image file.');return;}
      if(file.size>3.5*1024*1024){SF.toast('That file is '+(file.size/1024/1024).toFixed(1)+' MB. Slot images have to stay under 3.5 MB, or the lesson outgrows the browser storage it is saved in.');return;}
      var owner=scope==='deck'?deck():slide(), selectedAtStart=selected, scopeAtStart=scope;
      var reader=new FileReader();reader.onload=function(){
        if(scope!==scopeAtStart||selected!==selectedAtStart||owner!==(scope==='deck'?deck():slide())){SF.toast('Selection changed. Choose the image again in the intended slot.');return;}
        /* Decode before keeping it, the way the deck logo picker already does.
           A file named like an image that the browser cannot draw stores
           perfectly and renders as nothing — an empty slot and no message,
           which is the one failure indistinguishable from the feature being
           broken. */
        if(typeof reader.result!=='string')return;
        var dataUrl=reader.result, test=new Image();
        test.onload=function(){updateItem('src',dataUrl);};
        test.onerror=function(){SF.toast('That file is named like an image but the browser cannot draw it, so the slot would stay empty. Try a PNG or SVG.');};
        test.src=dataUrl;
      };reader.onerror=function(){SF.toast('Could not read that image.');};reader.readAsDataURL(file);
    };
    warning=node('p','',panel);warning.className='hf-hint';warning.setAttribute('aria-live','polite');
    /* No id wiring: the Header & footer button lives in the inspector's face
       row and is rebuilt on every draw, so editor.js switches the pane and
       mount() opens this panel. */
    var preview=document.getElementById('previewBox');
    if(preview)preview.addEventListener('click',function(e){
      if(!open)return;var hit=e.target.closest('[data-hf-slot]');if(!hit)return;
      selected=hit.dataset.hfSlot;refresh();
    });
    document.addEventListener('keydown',function(e){if(open&&e.key==='Escape'&&!e.defaultPrevented){setOpen(false);e.preventDefault();}});
  }
  SF.HeaderFooterUI={
    refresh:refresh,
    mount:mount,
    /* Called on every draw of a different pane, so it has to be cheap and
       idempotent — only the canvas outlines and the open flag come off. */
    close:function(){ if(open) setOpen(false); }
  };
  install();
})();
