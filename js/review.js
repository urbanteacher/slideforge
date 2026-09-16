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
        if(!said||!parent||parent.closest('[aria-hidden="true"],.sr-only,iframe'))continue;
        var range=document.createRange();range.selectNodeContents(text);
        Array.from(range.getClientRects()).forEach(function(r){
          if(!r.width||!r.height)return;
          var past=Math.max(r.right-bounds.right,r.bottom-bounds.bottom,bounds.left-r.left,bounds.top-r.top);
          if(past>3)over.push({text:said.slice(0,100),past:Math.ceil(past)});
        });
      }
      var scroll=pad.scrollHeight>pad.clientHeight+3||pad.scrollWidth>pad.clientWidth+3;
      var media=Array.from(root.querySelectorAll('img')).filter(function(img){return !img.complete||!img.naturalWidth;}).length;
      return {fits:!scroll&&!over.length,over:over.slice(0,5),scroll:scroll,unavailableImages:media,width:1280,height:SF.slideHeight(deck)};
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
    dialog.appendChild(el('p','review-note','A snapshot of your slides. Fit checks find content beyond the slide boundary; inspect overlaps, contrast and motion separately in Present. Imported files stay in this review.'));
    var status=el('p','review-status');status.setAttribute('role','status');dialog.appendChild(status);
    var grid=el('div','review-grid');dialog.appendChild(grid);
    var viewer=el('section','review-viewer');viewer.hidden=true;
    var back=el('button','','Back to grid'),prev=el('button','','← Previous'),next=el('button','','Next →'),position=el('span'),controls=el('div','review-view-controls');
    [back,prev,next].forEach(function(b){b.type='button';});controls.append(back,prev,position,next);viewer.appendChild(controls);
    var stage=el('div','review-stage');viewer.appendChild(stage);dialog.appendChild(viewer);
    var observer=new ResizeObserver(function(entries){entries.forEach(function(entry){
      var n=/** @type {HTMLElement|null} */(entry.target.querySelector('.slide'));
      if(n)n.style.transform='scale('+entry.target.clientWidth/1280+')';});});
    function render(target,d,s,i){target.style.aspectRatio='1280 / '+SF.slideHeight(d);target.replaceChildren(SF.renderSlide(d,s,{interactive:false,revealed:9999,index:i,total:d.slides.length}));observer.observe(target);}
    function draw(){observer.disconnect();all=[];grid.replaceChildren();viewer.hidden=true;grid.hidden=false;bar.hidden=false;
      decks.forEach(function(d){d.slides.forEach(function(s,i){if(s.hidden&&!hidden.checked)return;var item={d:d,s:s,index:i},n=all.length;all.push(item);
        var tile=el('button','review-tile');tile.type='button';var thumb=el('span','review-thumb');thumb.setAttribute('aria-hidden','true');render(thumb,d,s,i);
        var label=el('span','review-caption',d.title+' · '+(i+1)+' · '+(s.title||s.body||s.type)+(s.hidden?' · Hidden':''));tile.append(thumb,label);item.tile=tile;
        tile.onclick=function(){view(n);back.focus();};grid.appendChild(tile);
      });});status.textContent=all.length+' slides shown';checkButton.disabled=!all.length;}
    function view(i){current=i;var item=all[i];grid.hidden=true;bar.hidden=true;viewer.hidden=false;render(stage,item.d,item.s,item.index);position.textContent=(i+1)+' / '+all.length;prev.disabled=i===0;next.disabled=i===all.length-1;}
    back.onclick=function(){viewer.hidden=true;grid.hidden=false;bar.hidden=false;all[current].tile.focus();};prev.onclick=function(){if(current>0)view(current-1);};next.onclick=function(){if(current<all.length-1)view(current+1);};
    dialog.addEventListener('keydown',function(e){if(viewer.hidden)return;if(e.key==='ArrowRight'){e.preventDefault();next.click();}if(e.key==='ArrowLeft'){e.preventDefault();prev.click();}});
    hidden.onchange=draw;
    load.onchange=async function(){try{if(!load.files.length)return;decks=readDecks(JSON.parse(await load.files[0].text()));title.querySelector('h1').textContent=decks.length===1?decks[0].title:decks.length+' decks';draw();}catch(e){status.textContent=said(e);}finally{load.value='';}};
    checkButton.onclick=async function(){if(busy)return;busy=true;checkButton.disabled=true;hidden.disabled=true;load.disabled=true;var bad=0,media=0;
      try{for(var i=0;i<all.length&&!closed;i++){var item=all[i];status.textContent='Checking '+(i+1)+' / '+all.length;var result=await check(item.d,item.s,item.index);if(closed)break;
        if(!result.fits)bad++;media+=result.unavailableImages;
        var old=item.tile.querySelector('.review-result');if(old)old.remove();
        item.tile.appendChild(el('span','review-result'+(result.fits?'':' review-failed'),result.fits?'Fits slide boundary':('Needs review: '+(result.over.map(function(o){return o.text+' ('+o.past+'px beyond edge)';}).join('; ')||'content exceeds its area'))));
      }if(!closed)status.textContent=all.length+' slides checked · '+bad+' with overflow'+(media?' · '+media+' unavailable images':'');}
      catch(e){status.textContent='Fit check failed: '+said(e);}
      finally{busy=false;checkButton.disabled=false;hidden.disabled=false;load.disabled=false;}
    };
    close.onclick=function(){dialog.close();};dialog.addEventListener('close',function(){closed=true;observer.disconnect();dialog.remove();});document.body.appendChild(dialog);dialog.showModal();draw();close.focus();return dialog;
  }
  SF.Review={open:open,check:check,readDecks:readDecks};
})(window);
