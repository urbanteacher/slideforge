/* Structured content operations shared by editor controls. */
(function(global){
'use strict';
var SF=global.SF;
function move(s,from,to){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=s.bullets.length||to>=s.bullets.length||from===to)return false;
 var order=s.bullets.map(function(_,i){return i;});order.splice(to,0,order.splice(from,1)[0]);
 var old=s.bullets.slice(),format=s.formatting||{},next={};
 Object.keys(format).forEach(function(k){if(!/^bullets\.\d+$/.test(k))next[k]=format[k];});
 s.bullets=order.map(function(i,j){if(format['bullets.'+i])next['bullets.'+j]=format['bullets.'+i];return old[i];});s.formatting=next;
 /* Card pictures follow their card. */
 if(Array.isArray(s.images)&&s.images.length){var pics=s.images.slice();s.images=order.map(function(i){return pics[i]||'';});}
 return true;
}
function lines(text){return String(text).split(/\r?\n/).map(function(line){return line.replace(/^\s*(?:[•*\-]\s+|\d+[.)]\s+)/,'').trim();}).filter(Boolean);}
function append(s,text){
 var added=lines(text);if(!added.length)return 0;
 // Replace unused placeholders, retaining formatting for every existing point.
 var keep=(s.bullets||[]).map(function(v,i){return {v:v,i:i};}).filter(function(x){return x.v.trim();});
 var old=s.formatting||{},next={};Object.keys(old).forEach(function(k){if(!/^bullets\.\d+$/.test(k))next[k]=old[k];});
 s.bullets=keep.map(function(x,i){if(old['bullets.'+x.i])next['bullets.'+i]=old['bullets.'+x.i];return x.v;}).concat(added);s.formatting=next;return added.length;
}
function hidden(s){var out=[];var points=['journey','mindmap','content','cards','split','keywords','italics','links'].includes(s.type);
 if(!points&&(s.bullets||[]).some(function(v){return v.trim();}))out.push({label:'bullet list',field:'bullets',layout:'content'});
 if(!['journey','quote','table','introduction'].includes(s.type)&&String(s.body||'').trim())out.push({label:'extra text',field:'body',layout:'quote'});
 if(!['journey','introduction','title','section','quote'].includes(s.type)&&String(s.subtitle||'').trim())out.push({label:'subtitle',field:'subtitle',layout:'title'});
 if(!['image','split','introduction'].includes(s.type)&&s.image)out.push({label:'picture',field:'image',layout:'split'});
 if(s.type!=='video'&&s.video)out.push({label:'video',field:'video',layout:'video'});
 return out;
}
function split(s,limit){
 if(!Number.isInteger(limit)||limit<1)return [];
 var out=[];for(var at=0;at<s.bullets.length;at+=limit){var n=JSON.parse(JSON.stringify(s));n.id=at?SF.makeSlide(s.type).id:s.id;n.bullets=s.bullets.slice(at,at+limit);n.formatting={};Object.keys(s.formatting||{}).forEach(function(k){if(!/^bullets\.\d+$/.test(k))n.formatting[k]=s.formatting[k];else {var i=Number(k.slice(8));if(i>=at&&i<at+limit)n.formatting['bullets.'+(i-at)]=s.formatting[k];}});out.push(n);}return out;
}
SF.ContentTools={split:split,move:move,lines:lines,append:append,hidden:hidden};
})(window);
