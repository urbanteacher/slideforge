/* Visual teaching experiments: authored states, one editable dataset, no runtime
   state written into the deck. Explore carries state to the presenter window. */
(function () {
  'use strict';
  var SF = window.SF;
  var presets = {
    polling:{label:'Polling: pies to bars',prompt:'Which candidate gains most across the polls?',data:'Candidate\tPoll A\tPoll B\tPoll C\n1\t17\t20\t23\n2\t18\t20\t22\n3\t20\t19\t20\n4\t22\t21\t18\n5\t23\t20\t17',states:[
      {label:'Poll A',kind:'pie',series:0,explanation:'Compare candidates 5 and 3. How confident are you?'},
      {label:'Poll B',kind:'pie',series:1,explanation:'Which candidates improved? Comparing separate angles requires memory.'},
      {label:'Poll C',kind:'pie',series:2,explanation:'Now consider the trend across all three polls.'},
      {label:'Same poll, lengths',kind:'bar',series:2,categorical:true,explanation:'Watch each coloured slice become a bar. The Poll C values stay unchanged: only the encoding changes from angle to aligned length.'},
      {label:'All polls together',kind:'bar',all:true,series:2,explanation:'Now introduce all three polls; colour identifies the poll. Candidate 1 gains 6 percentage points from A to C. Candidate 2 gains 4. All bars share zero.'}]},
    integrity:{label:'Integrity: change the baseline',prompt:'The values stay at 100 and 110. How much bigger does the second bar look?',data:'Group\tValue\nA\t100\nB\t110',states:[
      {label:'Zero baseline',kind:'bar',baseline:0,explanation:'110 is 10% greater than 100. Bar lengths preserve that comparison.'},
      {label:'Baseline at 90',kind:'bar',baseline:90,explanation:'DELIBERATE DISTORTION: visible lengths are 10 and 20. A 10% data increase appears as a 100% length increase. Lie factor = 10.'},
      {label:'Baseline at 95',kind:'bar',baseline:95,explanation:'DELIBERATE DISTORTION: visible lengths are 5 and 15. The graphic shows a 200% increase. Lie factor = 20.'},
      {label:'Restore context',kind:'bar',baseline:0,explanation:'A bar encodes length. Restoring zero restores the relationship between length and quantity.'}]},
    clutter:{label:'Clutter: clean up a chart',prompt:'What gets your attention before you can compare the values?',data:'Day\tHires\nMon\t42\nTue\t58\nWed\t47\nThu\t70\nFri\t64',states:[
      {label:'Cluttered',kind:'bar',clutter:true,explanation:'Heavy gridlines and decorative labels compete with the data.'},
      {label:'Remove decoration',kind:'bar',heavyGrid:true,explanation:'Watch the decorative labels disappear. The values, bar positions and scale have not changed. What still competes for attention?'},
      {label:'Clear comparison',kind:'bar',explanation:'Same values and scale. Direct labels and a quiet baseline remain because they support the comparison.'}]},
    distortion:{label:'Distortion: shape and range',prompt:'Can the same observations appear to tell different stories?',data:'Period\tValue\n1\t30\n2\t42\n3\t38\n4\t55\n5\t44\n6\t48',states:[
      {label:'Complete series',kind:'line',explanation:'The whole six-period series shows fluctuations and an overall increase.'},
      {label:'Compressed width',kind:'line',narrow:true,explanation:'The values and scale are unchanged. A narrow plot makes the slopes look steeper.'},
      {label:'Selected ending',kind:'line',start:3,explanation:'DELIBERATELY SELECTED RANGE: periods 4–6 suggest decline. The earlier observations provide different context.'}]},
    channels:{label:'Marks and channels',prompt:'Which encoding makes close quantities easiest to compare?',data:'Item\tValue\nA\t20\nB\t24\nC\t38\nD\t42',states:[
      {label:'Position',kind:'dot',explanation:'Points share a vertical scale. Compare their positions.'},
      {label:'Area',kind:'bubbles',explanation:'Circle AREA represents value, so radius scales with the square root. Close comparisons become harder.'},
      {label:'Hue only',kind:'hue',explanation:'Hue identifies categories but has no inherent numerical order. Labels are doing the quantitative work here.'},
      {label:'Shape',kind:'shape',explanation:'Different symbols identify categories. Their shapes do not encode the numeric values.'},
      {label:'Length',kind:'bar',explanation:'Bars encode the same quantities by length from a shared zero baseline.'}]},
    colour:{label:'Colour schemes',prompt:'Which palette expresses the structure of each attribute?',data:'Region\tCount\tChange\nNorth\t20\t-12\nEast\t45\t-4\nSouth\t70\t5\nWest\t95\t16',states:[
      {label:'Categorical',kind:'tiles',palette:'categorical',explanation:'Different regions have different identities. The hues imply no order.'},
      {label:'Sequential counts',kind:'tiles',palette:'sequential',explanation:'Light to dark follows increasing counts. Values remain directly labelled.'},
      {label:'Change in one ramp',kind:'tiles',palette:'sequential',series:1,explanation:'Switch attribute from counts to signed change. A single light-to-dark ramp orders values but does not emphasise zero. Predict how two colour directions could help.'},
      {label:'Diverging change',kind:'tiles',palette:'diverging',series:1,explanation:'Blue and orange depart from a neutral zero midpoint. Negative and positive changes remain labelled.'}]},
    accessibility:{label:'Colour plus a second cue',prompt:'Can you still identify each group when the colour disappears?',data:'Group\tValue\nNorth\t20\nEast\t24\nSouth\t38\nWest\t42',states:[
      {label:'Colour and labels',kind:'bar',categorical:true,explanation:'Every group has a direct label as well as a colour.'},
      {label:'Without colour',kind:'bar',mono:true,explanation:'Position and labels preserve meaning in greyscale. This demonstration is not a colour-vision-deficiency simulation.'}]},
    structures:{label:'Dataset structures',prompt:'What is an item, a link, a field or a spatial boundary?',data:'Station\tHires\nA\t20\nB\t35\nC\t60\nD\t80',states:[
      {label:'Table',kind:'table',explanation:'Each row is an item. Station is an identifier and hires is an attribute.'},
      {label:'Network',kind:'network',explanation:'Nodes represent stations; lines represent hypothetical connections. Links need their own data.'},
      {label:'Field',kind:'field',explanation:'A synthetic temperature field sampled across space. Each location has a value, rather than a named station.'},
      {label:'Geometry',kind:'geometry',explanation:'Illustrative region boundaries describe shape and position. These are not real borough boundaries.'}]},
    types:{label:'Attribute classification',prompt:'Do the values have order, meaningful differences, or meaningful ratios?',data:'Example\tValue\nStation ID\t0',states:[
      {label:'Nominal',kind:'classification',example:'Station 12 • Station 7 • Station 3',explanation:'Numbers can be names. Station 12 is not four times Station 3.'},
      {label:'Ordinal',kind:'classification',example:'Low  ·  Medium  ·  High',explanation:'Order is meaningful. Equal gaps are not guaranteed.'},
      {label:'Interval',kind:'classification',example:'10°C  ·  20°C  ·  30°C',explanation:'Equal temperature differences are meaningful. 20°C is not twice as hot as 10°C on an absolute scale.'},
      {label:'Ratio',kind:'classification',example:'10 hires  ·  20 hires  ·  30 hires',explanation:'Zero means no hires. Twenty hires is twice ten hires.'}]},
    zoom:{label:'Chart overview and detail',prompt:'What changes when we focus on part of the series?',data:'Day\tHires\nMon\t20\nTue\t38\nWed\t32\nThu\t70\nFri\t64\nSat\t90',states:[
      {label:'Overview',kind:'line',explanation:'Start with the complete series.'},
      {label:'Focus on Thu–Sat',kind:'line',start:3,explanation:'This is a filtered detail, not missing data. The visible range is labelled and the vertical scale stays fixed.'},
      {label:'Return to overview',kind:'line',explanation:'Restore the whole series to judge the detail in context.'}]}
  };
  function config(s) {
    var raw=s.experiment||{}, key=Object.prototype.hasOwnProperty.call(presets,raw.preset)?raw.preset:'polling', preset=presets[key];
    var states=Array.isArray(raw.states)?raw.states.filter(function(x){return x&&typeof x==='object'&&!Array.isArray(x);}):[];
    return {prompt:String(raw.prompt||preset.prompt),states:(states.length?states:preset.states).slice(0,8),preset:key,duration:Math.max(200,Math.min(4000,Number(raw.duration)||1600))};
  }
  function node(tag,text,parent){var n=document.createElement(tag);if(text!=null)n.textContent=text;if(parent)parent.appendChild(n);return n;}
  function svg(tag,attrs,parent,text){var n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.keys(attrs||{}).forEach(function(k){n.setAttribute(k,attrs[k]);});if(text!=null)n.textContent=text;if(parent)parent.appendChild(n);return n;}
  // Equal-length contours let a datum retain its identity across encodings.
  function mark(parent,key,kind,a){
    var points=[],vertices;
    if(kind==='rect')vertices=[[a.x,a.y],[a.x+a.width,a.y],[a.x+a.width,a.y+a.height],[a.x,a.y+a.height]];
    if(kind==='polygon')vertices=a.vertices;
    for(var i=0;i<64;i++){
      if(kind==='circle'){var angle=-Math.PI/2+i/64*Math.PI*2;points.push([a.cx+a.r*Math.cos(angle),a.cy+a.r*Math.sin(angle)]);}
      else if(kind==='sector'){
        var angle=a.start+(a.end-a.start)*Math.max(0,Math.min(1,(i-8)/47)),radius=i<8?a.r*i/8:i>55?a.r*(64-i)/9:a.r;
        points.push([a.cx+radius*Math.cos(angle),a.cy+radius*Math.sin(angle)]);
      }else{var p=i/64*vertices.length,j=Math.floor(p),t=p-j,u=vertices[j],v=vertices[(j+1)%vertices.length];points.push([u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t]);}
    }
    return svg('polygon',{'data-motion':key,points:points.map(function(p){return p.join(',');}).join(' '),fill:a.fill,stroke:a.stroke||'none','stroke-width':a.stroke?2:0},parent);
  }
  var colours=['#0072b2','#d55e00','#009e73','#cc79a7','#8a6500','#5b4ba8'];
  function draw(host,s,c,state){
    var data=SF.chartData(s), series=data.series;
    var current=series[Math.max(0,Math.min(series.length-1,Number(state.series)||0))];
    var rows=data.categories.slice(0,12).map(function(name,i){return {name:name,index:i,value:current&&current.values[i]};}).filter(function(r){return Number.isFinite(r.value);});
    var chart=svg('svg',{viewBox:'0 0 1000 370',role:'img','aria-label':state.label||'Visual experiment'},host);
    svg('title',{},chart,(state.label||'Experiment')+': '+rows.map(function(r){return r.name+' '+r.value;}).join(', '));
    var ink='currentColor';
    function text(x,y,value,size,anchor,key){var attrs={x:x,y:y,fill:ink,'font-size':size||22,'text-anchor':anchor||'start'};if(key)attrs['data-motion']=key;if(typeof value==='number')attrs['data-number']='true';return svg('text',attrs,chart,String(value));}
    function colour(i){return state.mono?'#636363':colours[i%colours.length];}
    if(state.kind==='classification'){text(500,150,state.example||'',36,'middle');text(500,220,state.label,26,'middle');return;}
    if(!rows.length){text(500,180,'Add a table with category labels and numeric values.',24,'middle');return;}
    var max=Math.max(1,...series.flatMap(function(a){return a.values.filter(Number.isFinite);}));
    var min=Math.min(0,...(state.all?series.flatMap(function(a){return a.values.filter(Number.isFinite);}):rows.map(function(r){return r.value;})));
    var baseline=Number.isFinite(Number(state.baseline))?Number(state.baseline):min;
    if(baseline>=max)baseline=min;
    var top=50,bottom=300,left=100,right=930;
    if(state.narrow){left=350;right=650;}
    function y(v){return bottom-(v-baseline)/(max-baseline)*(bottom-top);}
    if(state.kind==='pie'){
      var sum=rows.reduce(function(a,r){return a+Math.max(0,r.value);},0),angle=-Math.PI/2;
      if(!sum||rows.some(function(r){return r.value<0;})){text(500,180,'A pie needs positive parts of a whole.',24,'middle');return;}
      rows.forEach(function(r,i){var end=angle+r.value/sum*Math.PI*2,cx=350,cy=175,rad=145;
        mark(chart,'mark:'+r.index,'sector',{cx:cx,cy:cy,r:rad,start:angle,end:end,fill:colour(i),stroke:'white'});
        text(570,65+i*32,r.name,21,'start','category:'+r.index);text(760,65+i*32,r.value,21,'middle','value:'+r.index);angle=end;});
      text(350,355,current.name,22,'middle');return;
    }
    if(state.kind==='table'){
      text(180,40,'Station',24);text(620,40,current.name,24);
      var rowHeight=Math.min(55,270/rows.length);
      rows.forEach(function(r,i){text(180,80+i*rowHeight,r.name,20,'start','category:'+r.index);text(620,80+i*rowHeight,r.value,20,'middle','value:'+r.index);});return;
    }
    if(state.kind==='network'){
      var locations=rows.map(function(r,i){var a=i/rows.length*Math.PI*2;return {x:500+330*Math.cos(a),y:175+115*Math.sin(a)};});
      locations.forEach(function(p,i){if(!i)return;var prev=locations[i-1];svg('line',{x1:prev.x,y1:prev.y,x2:p.x,y2:p.y,stroke:ink,'stroke-width':3},chart);});
      rows.forEach(function(r,i){var p=locations[i];mark(chart,'mark:'+r.index,'circle',{cx:p.x,cy:p.y,r:24,fill:colour(i)});text(p.x,p.y+45,r.name,20,'middle','category:'+r.index);});return;
    }
    if(state.kind==='geometry'){
      ['100,70 390,50 430,170 120,190','390,50 790,80 870,220 430,170','120,190 430,170 480,320 150,290','430,170 870,220 800,330 480,320'].forEach(function(p,i){svg('polygon',{points:p,fill:colour(i),'fill-opacity':0.22,stroke:ink,'stroke-width':3},chart);});
      text(500,360,'Illustrative boundaries; no measured quantity encoded',19,'middle');return;
    }
    if(state.kind==='field'){
      for(var yy=0;yy<6;yy++)for(var xx=0;xx<12;xx++){
        var temp=10+xx+yy;
        svg('rect',{x:100+xx*65,y:20+yy*46,width:64,height:45,fill:'hsl(205,65%,'+(93-(temp-10)*3.5)+'%)'},chart);
        text(132+xx*65,49+yy*46,temp,16,'middle');
      }
      text(500,340,'Synthetic temperature samples (°C) across space',22,'middle');return;
    }
    if(['tiles','bubbles','hue','shape'].includes(state.kind)){
      var abs=Math.max(1,...rows.map(function(r){return Math.abs(r.value);}));
      rows.forEach(function(r,i){var x=90+(i+.5)*820/rows.length, fill=colour(i);
        if(state.palette==='sequential')fill='hsl(205,65%,'+(92-(r.value-min)/(max-min)*60)+'%)';
        if(state.palette==='diverging')fill='hsl('+(r.value<0?210:28)+',70%,'+(95-Math.abs(r.value)/abs*55)+'%)';
        if(state.kind==='bubbles')mark(chart,'mark:'+r.index,'circle',{cx:x,cy:150,r:Math.sqrt(Math.max(0,r.value)/max)*Math.min(85,340/rows.length),fill:fill});
        else if(state.kind==='hue')mark(chart,'mark:'+r.index,'circle',{cx:x,cy:150,r:Math.min(55,340/rows.length),fill:fill});
        else if(state.kind==='shape'){
          var radius=Math.min(45,300/rows.length);
          if(i%4===0)mark(chart,'mark:'+r.index,'circle',{cx:x,cy:150,r:radius,fill:fill});
          else if(i%4===1)mark(chart,'mark:'+r.index,'rect',{x:x-radius,y:150-radius,width:radius*2,height:radius*2,fill:fill});
          else mark(chart,'mark:'+r.index,'polygon',{vertices:i%4===2?[[x,150-radius],[x-radius,150+radius],[x+radius,150+radius]]:[[x,150-radius],[x+radius,150],[x,150+radius],[x-radius,150]],fill:fill});
        }
        else {var tileWidth=Math.min(130,720/rows.length);mark(chart,'mark:'+r.index,'rect',{x:x-tileWidth/2,y:80,width:tileWidth,height:140,fill:fill});}
        text(x,270,r.name,21,'middle','category:'+r.index);text(x,305,r.value,24,'middle','value:'+r.index);});
      text(500,360,state.palette==='diverging'?'Blue: negative · neutral: zero · orange: positive':current.name,19,'middle');return;
    }
    var start=Math.min(rows.length-1,Math.max(0,Math.floor(Number(state.start)||0)));
    var shown=rows.slice(start);
    for(var tick=0;tick<=4;tick++){var value=baseline+(max-baseline)*tick/4,py=y(value);
      svg('line',{'data-motion':'grid:'+tick,x1:left,y1:py,x2:right,y2:py,stroke:ink,'stroke-opacity':state.clutter||state.heavyGrid?0.7:0.15,'stroke-width':state.clutter||state.heavyGrid?3:1},chart);
      text(left-12,py+6,Math.round(value*10)/10,18,'end','tick:'+tick);}
    text(left,25,current.name,19);
    var points=[];
    shown.forEach(function(r,i){var x=left+(i+.5)*(right-left)/shown.length;
      if(state.kind==='line'||state.kind==='dot'){
        points.push({x:x,y:y(r.value),id:r.index});mark(chart,'mark:'+r.index,'circle',{cx:x,cy:y(r.value),r:7,fill:colour(state.kind==='dot'?r.index:0)});
        text(x,y(r.value)-15,r.value,19,'middle','value:'+r.index);
      }else{
        var ss=state.all?series.slice(0,4):[current], space=(right-left)/shown.length*.7,w=space/ss.length;
        ss.forEach(function(a,j){var v=a.values[r.index];if(!Number.isFinite(v))return;
          if(v<baseline){text(x,280,'Below axis',15,'middle');return;}
          var zero=y(Math.max(0,baseline));
          var suffix=state.all&&j!==(Number(state.series)||0)?':series'+j:'';
          mark(chart,'mark:'+r.index+suffix,'rect',{x:x-space/2+j*w,y:Math.min(y(v),zero),width:Math.max(2,w-4),height:Math.abs(zero-y(v)),fill:colour(state.all?j:state.categorical||c.preset==='channels'?r.index:0)});
          text(x-space/2+j*w+w/2,y(v)-9,v,17,'middle','value:'+r.index+suffix);});
      }
      text(x,330,r.name,19,'middle','category:'+r.index);
      if(state.clutter)text(x,65,'★ WOW ★',18,'middle','clutter:'+r.index);
    });
    if(state.kind==='line')points.forEach(function(p,i){if(!i)return;var q=points[i-1];svg('line',{'data-motion':'connection:'+q.id+':'+p.id,x1:q.x,y1:q.y,x2:p.x,y2:p.y,stroke:colour(0),'stroke-width':3},chart);});
    if(state.all)series.slice(0,4).forEach(function(a,i){svg('rect',{x:220+i*200,y:349,width:15,height:15,fill:colour(i)},chart);text(245+i*200,363,a.name,18);});
    else text(500,364,start?'Visible range: '+shown[0].name+'–'+shown[shown.length-1].name+' (filtered from '+rows.length+' observations)':'Baseline: '+baseline,18,'middle');
  }
  function render(root,pad,s,opts){
    var c=config(s),step=opts.exploreState&&Number.isInteger(opts.exploreState.experimentStep)?opts.exploreState.experimentStep:-1;
    var lastStep=-1,fromStep=-1,replayToken=opts.exploreState&&opts.exploreState.experimentReplay||0;
    var staticView=opts.interactive===false&&!opts.exploreCommand;
    if(staticView && !opts.exploreState)step=c.states.length-1;
    root.classList.add('experiment-slide','exploration-slide');pad.replaceChildren();node('h2',s.title||'Visual experiment',pad).className='ve-title';
    var prompt=node('p',c.prompt,pad);prompt.className='ve-prompt';
    var plot=node('div','',pad);plot.className='ve-plot';
    var controls=node('div','',pad);controls.className='ve-controls';
    if(staticView)controls.hidden=true;
    var explanation=node('p','',pad);explanation.className='ve-explanation';explanation.setAttribute('aria-live','polite');
    var source=node('p',s.chartSource||'Illustrative teaching data',pad);source.className='ve-source';
    if(SF.chartData(s).categories.length>12)source.textContent+=' Showing the first 12 categories only.';
    function send(n){if(opts.exploreCommand)opts.exploreCommand('experiment',n);else{step=n;paint();}}
    var predict=node('button','Predict first',controls);predict.type='button';predict.onclick=function(){send(-1);};
    var buttons=c.states.map(function(st,i){var b=node('button',st.label||'State '+(i+1),controls);b.type='button';b.onclick=function(){send(i);};return b;});
    var replay=node('button','↻ Replay change',controls);replay.type='button';replay.onclick=function(){if(opts.exploreCommand)opts.exploreCommand('experimentReplay',0);else paint(true);};
    function picture(n){var buffer=document.createElement('div'),st=c.states[n];draw(buffer,s,c,st);if(st.hideValues){buffer.querySelectorAll('[data-motion^="value:"]').forEach(function(el){el.remove();});var title=buffer.querySelector('title');if(title)title.textContent=st.label+' — estimate the quantities before revealing the labels.';}return buffer.firstElementChild;}
    function paint(replaying){
      step=Math.max(-1,Math.min(c.states.length-1,step));
      if(!replaying&&step!==lastStep){fromStep=lastStep;lastStep=step;}
      predict.setAttribute('aria-pressed',String(step<0));buttons.forEach(function(b,i){b.setAttribute('aria-pressed',String(i===step));});
      replay.disabled=step<0||fromStep<0;
      if(step<0){if(SF.ChartMotion)SF.ChartMotion.cancel(plot);plot.replaceChildren();var wait=node('p','Make a prediction. Explain your reasoning, then reveal the first state.',plot);wait.className='ve-predict';explanation.textContent='';}
      else{
        var st=c.states[step],target=picture(step);
        if(SF.ChartMotion){
          if(replaying&&fromStep>=0)SF.ChartMotion.transition(plot,picture(fromStep),{instant:true});
          SF.ChartMotion.transition(plot,target,{duration:c.duration,instant:staticView});
        }else plot.replaceChildren(target);
        explanation.textContent=String(st.explanation||'');
      }
    }
    root._exploreRefresh=function(next){var n=Number.isInteger(next.experimentStep)?next.experimentStep:-1,token=next.experimentReplay||0;if(n===step&&token===replayToken)return;var replaying=n===step&&token!==replayToken;step=n;replayToken=token;paint(replaying);};paint();
  }
  function inspector(parent,s,UI,changed,redraw){
    var c=config(s);
    parent.appendChild(UI.field('Experiment',UI.select(Object.keys(presets).map(function(k){return {value:k,label:presets[k].label};}),c.preset,function(v){
      s.experiment={preset:v};s.body=presets[v].data;s.chartSource='Illustrative teaching data';redraw();
    })));
    parent.appendChild(UI.field('Title',UI.text(s.title||'',function(v){s.title=v;changed();})));
    parent.appendChild(UI.field('Prediction prompt',UI.text(c.prompt,function(v){s.experiment=Object.assign({},s.experiment,{prompt:v});changed();})));
    parent.appendChild(UI.field('Transformation pace',UI.select([{value:'800',label:'Quick — 0.8 seconds'},{value:'1600',label:'Teaching — 1.6 seconds'},{value:'3000',label:'Slow observation — 3 seconds'}],String(c.duration),function(v){s.experiment=Object.assign({},s.experiment,{duration:Number(v)});changed();})));
    var table=node('textarea');table.rows=7;table.value=s.body||presets[c.preset].data;table.setAttribute('aria-label','Experiment dataset');
    table.onchange=function(){s.body=table.value;changed();};parent.appendChild(UI.field('Data: tab-separated headings and values',table));
    parent.appendChild(UI.field('Data source / units',UI.text(s.chartSource||'',function(v){s.chartSource=v;changed();})));
    ['changes','constants','takeaway','caveat'].forEach(function(key){
      var labels={changes:'PDF: what changes',constants:'PDF: what stays fixed',takeaway:'PDF: key takeaway',caveat:'PDF: limitations / caution'};
      parent.appendChild(UI.field(labels[key],UI.text(((s.experiment||{}).print||{})[key]||'',function(v){s.experiment=Object.assign({},s.experiment,{print:Object.assign({},(s.experiment||{}).print,{[key]:v})});changed();})));
    });
    c.states.forEach(function(st,i){
      function save(key,v){var states=c.states.map(function(x){return Object.assign({},x);});states[i][key]=v;c.states=states;s.experiment=Object.assign({},s.experiment,{states:states});changed();}
      parent.appendChild(UI.field('State '+(i+1)+' label',UI.text(st.label||'',function(v){save('label',v);})));
      parent.appendChild(UI.field('Explanation',UI.text(st.explanation||'',function(v){save('explanation',v);})));
      parent.appendChild(UI.check('Hide values for an estimation challenge',!!st.hideValues,function(v){save('hideValues',v);}));
      parent.appendChild(UI.field('Visual',UI.select(['bar','pie','line','dot','bubbles','hue','shape','tiles','table','network','field','geometry','classification'].map(function(k){return {value:k,label:k};}),st.kind||'bar',function(v){save('kind',v);})));
      var choices=SF.chartData(s).series.map(function(a,j){return {value:String(j),label:a.name};});
      if(choices.length)parent.appendChild(UI.field('Data series',UI.select(choices,String(st.series||0),function(v){save('series',Number(v));})));
      if(st.kind==='tiles')parent.appendChild(UI.field('Palette',UI.select(['categorical','sequential','diverging'].map(function(k){return {value:k,label:k};}),st.palette||'categorical',function(v){save('palette',v);})));
      if(st.kind==='bar'){
        parent.appendChild(UI.check('Compare all series',!!st.all,function(v){save('all',v);}));
        parent.appendChild(UI.check('Show deliberate clutter',!!st.clutter,function(v){save('clutter',v);}));
        parent.appendChild(UI.check('Greyscale',!!st.mono,function(v){save('mono',v);}));
      }
      if(['bar','line','dot'].includes(st.kind)){
        var base=node('input');base.type='number';base.value=String(st.baseline||0);base.onchange=function(){if(Number.isFinite(base.valueAsNumber))save('baseline',base.valueAsNumber);};parent.appendChild(UI.field('Axis minimum',base));
      }
      parent.appendChild(UI.button('Remove state '+(i+1),'ghost',function(){if(c.states.length<2){SF.toast('Keep at least one state.');return;}s.experiment=Object.assign({},s.experiment,{states:c.states.filter(function(_,j){return j!==i;})});redraw();}));
    });
    if(c.states.length<8)parent.appendChild(UI.button('Add visual state','',function(){s.experiment=Object.assign({},s.experiment,{states:c.states.concat([{label:'New state',kind:'bar',explanation:''}])});redraw();}));
    parent.appendChild(node('p','Present: Next reveals each state; Previous steps back. Up to 12 categories and 4 grouped series display. Edit explanations when changing data. Field and geometry are illustrative examples. Changing the experiment resets its data and states.'));
    return true;
  }
  function staticState(s,index){var host=document.createElement('div'),c=config(s),st=c.states[index];draw(host,s,c,st);if(st.hideValues){host.querySelectorAll('[data-motion^="value:"]').forEach(function(el){el.remove();});host.querySelector('title').textContent=st.label+' — estimate before reading the reveal.';}return host.firstElementChild;}
  SF.Experiments={config:config,render:render,inspector:inspector,presets:presets,staticState:staticState};
})();
