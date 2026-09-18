/* Review a snapshot through the same renderer as the editor and player. */
(function(global){
  'use strict';
  var SF=global.SF;
  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
  function clone(value){return JSON.parse(JSON.stringify(value));}
  /* A thrown value is only an Error by convention. Anything can be thrown, and
     what reaches the status line has to be readable either way. */
  function said(err){return err instanceof Error?err.message:String(err);}
  function settle(promise){var timer;return Promise.race([promise,new Promise(function(resolve){timer=setTimeout(resolve,5000);})]).finally(function(){clearTimeout(timer);});}
  async function check(deck,slide,index){
    var stage=el('div','slide-fit-stage');stage.setAttribute('aria-hidden','true');
    var root=SF.renderSlide(deck,slide,{interactive:false,revealed:9999,index:index,total:deck.slides.length});
    stage.style.height=SF.slideHeight(deck)+'px';stage.appendChild(root);document.body.appendChild(stage);
    try{
      await settle(document.fonts.ready);
      await Promise.all(Array.from(root.querySelectorAll('img')).map(function(img){return settle(img.decode().catch(function(){}));}));
      // The shared text-size fitter runs on the next animation frame.
      await new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve);});});
      var bounds=root.getBoundingClientRect(),pad=root.querySelector('.pad')||root,over=[];
      var walk=document.createTreeWalker(pad,NodeFilter.SHOW_TEXT);
      while(walk.nextNode()){
        var text=walk.currentNode,parent=text.parentElement,said=(text.textContent||'').trim();
        if(!said||!parent)continue;
        var ignored=parent.closest('[aria-hidden="true"],.sr-only,iframe');
        if(ignored && root.contains(ignored))continue;
        var range=document.createRange();range.selectNodeContents(text);
        Array.from(range.getClientRects()).forEach(function(r){
          if(!r.width||!r.height)return;
          var past=Math.max(r.right-bounds.right,r.bottom-bounds.bottom,bounds.left-r.left,bounds.top-r.top);
          if(past>3)over.push({text:said.slice(0,100),past:Math.ceil(past)});
        });
      }
      var scroll=pad.scrollHeight>pad.clientHeight+3||pad.scrollWidth>pad.clientWidth+3;
      var media=Array.from(root.querySelectorAll('img')).filter(function(img){return !img.complete||!img.naturalWidth;}).length;
      /* The lattice's verdict, folded in rather than left standing beside it.
         A latticed block can want more lines than its region granted while
         still sitting well inside the slide boundary measured above, so the
         two questions have different answers on the same slide — and a deck
         audit that says "fits" about a slide the Layout face has outlined in
         red is worse than no audit. Asked through SF.latticeFit so this and
         the Layout face run one arithmetic, not two that agree today.
         Empty on every slide that has never been arranged. */
      var lattice=SF.latticeFit?SF.latticeFit(root):[];
      var regions=lattice.filter(function(v){return v.over;}).map(function(v){
        return {key:v.key,need:v.need,have:v.have,wide:v.wide};
      });
      /* The third question, and the one nothing in the app asked before: is
         anything painted on top of the words? The two measures above both ask
         whether content fits the space it was given, which a heading entirely
         under a photograph does perfectly. A full-bleed placed picture blanks
         a slide today — .slide-art is z-index 2 and content is not — and this
         function used to call that slide sound.
         Asked through SF.artOcclusion so the review, the art face and any
         future ordering control run one measurement. It consults real paint
         order and ignores artwork below the opacity at which words still read
         through it, which is why the library's 45 slides of theme marks over
         their own headings are not failures: they draw at 13–50% and, on a
         section slide, under a .pad carrying z-index 1. Measured across all 32
         library decks and 563 slides: zero hits. */
      var covered=SF.artOcclusion?SF.artOcclusion(root):[];
      return {fits:!scroll&&!over.length&&!regions.length&&!covered.length,
        over:over.slice(0,5),regions:regions.slice(0,5),covered:covered.slice(0,5),
        slots:lattice.length,
        scroll:scroll,unavailableImages:media,width:1280,height:SF.slideHeight(deck)};
    }finally{stage.remove();}
  }
  function readDecks(value){
    var decks=Array.isArray(value)?value:value&&Array.isArray(value.decks)?value.decks:[value];
    if(!decks.length||decks.some(function(d){return !d||!Array.isArray(d.slides)||!d.slides.length;}))throw Error('Choose a deck or bundle containing at least one slide.');
    return decks.map(function(d){return SF.normalizeDeck(clone(d));});
  }
  function open(input){
    var decks=readDecks(input),all=[],current=0,busy=false,closed=false;
    var dialog=el('dialog','slide-review'),head=el('header','review-head');
    var title=el('div');title.appendChild(el('p','review-kicker','SLIDE REVIEW'));title.appendChild(el('h1','',decks.length===1?decks[0].title:decks.length+' decks'));head.appendChild(title);
    var close=el('button','','Close');close.type='button';head.appendChild(close);dialog.appendChild(head);
    dialog.setAttribute('aria-label','Slide design review');
    var bar=el('div','review-tools'),checkButton=el('button','','Check slide fit'),load=el('input');
    checkButton.type='button';load.type='file';load.accept='.json,.sfdeck,.sfbundle';load.setAttribute('aria-label','Review a deck or bundle file');
    var hidden=el('input');hidden.type='checkbox';var hiddenLabel=el('label');hiddenLabel.append(hidden,document.createTextNode(' Include hidden slides'));
    bar.append(checkButton,hiddenLabel,load);dialog.appendChild(bar);
    dialog.appendChild(el('p','review-note','A snapshot of your slides. Fit checks find three things: content beyond the slide boundary; on an arranged slide, blocks wanting more lines than their region gave them \u2014 the same measurement the Layout face makes; and words with artwork painted over them. Contrast and motion are still for Present. Imported files stay in this review.'));
    var status=el('p','review-status');status.setAttribute('role','status');dialog.appendChild(status);
    var grid=el('div','review-grid');dialog.appendChild(grid);
    var viewer=el('section','review-viewer');viewer.hidden=true;
    var back=el('button','','Back to grid'),prev=el('button','','← Previous'),next=el('button','','Next →'),position=el('span'),controls=el('div','review-view-controls');
    [back,prev,next].forEach(function(b){b.type='button';});controls.append(back,prev,position,next);viewer.appendChild(controls);
    var stage=el('div','review-stage');stage.inert=true;viewer.appendChild(stage);dialog.appendChild(viewer);
    var observer=new ResizeObserver(function(entries){entries.forEach(function(entry){
      var n=/** @type {HTMLElement|null} */(entry.target.querySelector('.slide'));
      if(n)n.style.transform='scale('+entry.target.clientWidth/1280+')';});});
    function render(target,d,s,i){target.style.aspectRatio='1280 / '+SF.slideHeight(d);target.style.setProperty('--review-ratio',String(1280/SF.slideHeight(d)));target.replaceChildren(SF.renderSlide(d,s,{interactive:false,revealed:9999,index:i,total:d.slides.length}));observer.observe(target);}
    function draw(){dialog.classList.remove('review-detail');observer.disconnect();all=[];grid.replaceChildren();viewer.hidden=true;grid.hidden=false;bar.hidden=false;
      decks.forEach(function(d){d.slides.forEach(function(s,i){if(s.hidden&&!hidden.checked)return;var item={d:d,s:s,index:i},n=all.length;all.push(item);
        var tile=el('button','review-tile');tile.type='button';var thumb=el('span','review-thumb');thumb.inert=true;thumb.setAttribute('aria-hidden','true');render(thumb,d,s,i);
        var label=el('span','review-caption',d.title+' · '+(i+1)+' · '+(s.title||s.body||s.type)+(s.hidden?' · Hidden':''));tile.append(thumb,label);item.tile=tile;
        tile.onclick=function(){view(n);back.focus();};grid.appendChild(tile);
      });});status.textContent=all.length+' slides shown';checkButton.disabled=!all.length;}
    function view(i){dialog.classList.add('review-detail');dialog.scrollTop=0;current=i;var item=all[i];grid.hidden=true;bar.hidden=true;viewer.hidden=false;render(stage,item.d,item.s,item.index);position.textContent=(i+1)+' / '+all.length;prev.disabled=i===0;next.disabled=i===all.length-1;if(document.activeElement===prev&&prev.disabled||document.activeElement===next&&next.disabled)back.focus();}
    back.onclick=function(){dialog.classList.remove('review-detail');viewer.hidden=true;grid.hidden=false;bar.hidden=false;all[current].tile.focus();};prev.onclick=function(){if(current>0)view(current-1);};next.onclick=function(){if(current<all.length-1)view(current+1);};
    dialog.addEventListener('keydown',function(e){if(viewer.hidden)return;if(e.key==='ArrowRight'){e.preventDefault();next.click();}if(e.key==='ArrowLeft'){e.preventDefault();prev.click();}});
    hidden.onchange=draw;
    load.onchange=async function(){try{if(!load.files.length)return;decks=readDecks(JSON.parse(await load.files[0].text()));title.querySelector('h1').textContent=decks.length===1?decks[0].title:decks.length+' decks';draw();}catch(e){status.textContent=said(e);}finally{load.value='';}};
    checkButton.onclick=async function(){if(busy)return;busy=true;checkButton.disabled=true;hidden.disabled=true;load.disabled=true;var bad=0,media=0,covered=0;
      try{for(var i=0;i<all.length&&!closed;i++){var item=all[i];status.textContent='Checking '+(i+1)+' / '+all.length;var result=await check(item.d,item.s,item.index);if(closed)break;
        if(!result.fits)bad++;media+=result.unavailableImages;
        if((result.covered||[]).length)covered++;
        var old=item.tile.querySelector('.review-result');if(old)old.remove();
        /* Both failures in one sentence, named the way each one is named where
           it is fixed: a boundary escape by the words that escaped, a region
           overflow by its block key and the shortfall the Layout face shows. */
        var why=result.over.map(function(o){return o.text+' ('+o.past+'px beyond edge)';})
          .concat((result.regions||[]).map(function(r){
            return r.key+(r.wide&&r.need<=r.have?' (wider than its columns)'
              :' (needs '+r.need+' lines, has '+r.have+')');
          }))
          .concat((result.covered||[]).map(function(c){
            return c.key+' is '+c.pct+'% under '+c.by;
          }));
        item.tile.appendChild(el('span','review-result'+(result.fits?'':' review-failed'),
          result.fits?(result.slots?'Fits slide and regions, nothing over the words'
              :'Fits slide boundary, nothing over the words')
            :('Needs review: '+(why.join('; ')||'content exceeds its area'))));
      }if(!closed)status.textContent=all.length+' slides checked · '+bad+' need review'
        +(covered?' · '+covered+' with words under artwork':'')
        +(media?' · '+media+' unavailable images':'');}
      catch(e){status.textContent='Fit check failed: '+said(e);}
      finally{busy=false;checkButton.disabled=false;hidden.disabled=false;load.disabled=false;}
    };
    close.onclick=function(){dialog.close();};dialog.addEventListener('close',function(){closed=true;observer.disconnect();dialog.remove();});document.body.appendChild(dialog);dialog.showModal();draw();close.focus();return dialog;
  }
  SF.Review={open:open,check:check,readDecks:readDecks};
})(window);
