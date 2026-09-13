/* Presenter-only controls for temporary projected activities and room signals. */
(function(){
'use strict';
/** @type {import("../src/types.js").SlideForgeGlobal} */
var SF=window.SF;
var M=SF.LessonMoments;
var $=function(id){return document.getElementById(id);};
var moment=null,musicUrl=null;
var lastState=null;
function command(data){if(window.opener&&!window.opener.closed)window.opener.postMessage(Object.assign({type:'sf-presenter-cmd',cmd:'moment'},data),location.origin);}
function start(kind){
 var durEl = /** @type {HTMLSelectElement|null} */ ($('quickDuration'));
 var seconds=kind==='break'?300:Number(durEl?durEl.value:0);
 var guard = $('momentGuard');
 if(kind==='timer'&&!seconds){if(guard)guard.textContent='Choose a duration for the countdown.';return;}
 var taskEl = /** @type {HTMLTextAreaElement|null} */ ($('quickTask'));
 var taskVal = taskEl ? taskEl.value : '';
 if(kind==='task'&&!taskVal.trim()){if(guard)guard.textContent='Write a task to show the room.';return;}
 command({action:'start',kind:kind,seconds:seconds,title:kind==='task'?taskVal:kind==='break'?'Take a break':'Thinking time'});
}
var btnTask = $('showTask'); if(btnTask) btnTask.onclick=function(){start('task');};
var btnCountdown = $('showCountdown'); if(btnCountdown) btnCountdown.onclick=function(){start('timer');};
var btnBreak = $('showBreak'); if(btnBreak) btnBreak.onclick=function(){start('break');};
/* Footer power buttons — same moments as Quick, without opening that pane. */
var footCountdown = $('footCountdown');
if(footCountdown) footCountdown.onclick=function(){
  if(moment&&moment.kind==='timer'){command({action:'clear'});return;}
  start('timer');
};
var footBreak = $('footBreak');
if(footBreak) footBreak.onclick=function(){
  if(moment&&moment.kind==='break'){command({action:'clear'});return;}
  start('break');
};
var btnPause = /** @type {HTMLButtonElement|null} */ ($('pauseMoment'));
if(btnPause) btnPause.onclick=function(){command({action:moment&&moment.paused?'resume':'pause'});};
var btnExtend = $('extendMoment'); if(btnExtend) btnExtend.onclick=function(){command({action:'extend'});};
var btnClear = $('clearMoment'); if(btnClear) btnClear.onclick=function(){command({action:'clear'});};
function clock(){
 var titleEl = $('momentTitle');
 if(titleEl) titleEl.textContent=moment?moment.title:'Nothing showing';
 var left=M.remaining(moment,Date.now());
 var timeEl = $('momentTime');
 if(timeEl) timeEl.textContent=moment&&moment.timed?(left?M.format(left)+(moment.paused?' · paused':''):'Time is up'):moment?'No countdown':'—';
 var pauseBtn = /** @type {HTMLButtonElement|null} */ ($('pauseMoment'));
 if(pauseBtn){pauseBtn.disabled=!moment||!moment.timed||!left;pauseBtn.textContent=moment&&moment.paused?'Resume':'Pause';}
 var extendBtn = /** @type {HTMLButtonElement|null} */ ($('extendMoment'));
 if(extendBtn) extendBtn.disabled=!moment||!moment.timed;
 var clearBtn = /** @type {HTMLButtonElement|null} */ ($('clearMoment'));
 if(clearBtn) clearBtn.disabled=!moment;
 var boxNow = $('boxNow');
 if(boxNow) M.paint(boxNow,moment);
 var footT = /** @type {HTMLButtonElement|null} */ ($('footCountdown'));
 if(footT){
  var onTimer=!!(moment&&moment.kind==='timer');
  footT.classList.toggle('on',onTimer);
  footT.textContent=onTimer?(left?('Timer '+M.format(left)):'End timer'):'Timer';
  footT.title=onTimer?'Clear the thinking-time overlay':'Thinking-time countdown on the wall (uses Quick → Thinking time)';
 }
 var footB = /** @type {HTMLButtonElement|null} */ ($('footBreak'));
 if(footB){
  var onBreak=!!(moment&&moment.kind==='break');
  footB.classList.toggle('on',onBreak);
  footB.textContent=onBreak?(left?('Break '+M.format(left)):'End break'):'Break';
  footB.title=onBreak?'Clear the break overlay':'5-minute break overlay on the wall';
 }
}
function text(box,value){if(!box)return;var p=document.createElement('p');p.textContent=value;box.appendChild(p);}
function room(pulse){
 var box=$('roomActivity');var fb=$('slideFeedback');
 if(!box||!fb)return;
 var boxEl=box, fbEl=fb;
 boxEl.replaceChildren();fbEl.replaceChildren();
 if(!pulse||!pulse.active){text(boxEl,'Host live for room signals.');text(fbEl,'—');return;}
 var counts=pulse.reactions||{};
 [['yes','👍 Got it'],['clap','👏 Applause'],['wow','✨ Wow'],['idea','💡 Idea']].forEach(function(pair){var row=document.createElement('div');row.className='pulse-line';row.appendChild(document.createElement('span')).textContent=pair[1];row.appendChild(document.createElement('strong')).textContent=String(counts[pair[0]]||0);boxEl.appendChild(row);});
 text(boxEl,(pulse.bookmarks||0)+(pulse.bookmarks===1?' bookmark':' bookmarks'));
 var d=pulse.feedback,p=pulse.prompt||{};
 if(!d){text(fbEl,'No responses on this slide.');return;}
 if(p.question||p.prompt)text(fbEl,p.question||p.prompt);
 text(fbEl,(d.total||0)+' responses');
 if(d.counts)d.counts.forEach(function(n,i){text(fbEl,((p.options||[])[i]||'Option '+(i+1))+': '+n);});
 if(d.words)d.words.forEach(function(w){text(fbEl,w.text+' · '+w.n);});
 if(d.items)d.items.forEach(function(item){text(fbEl,typeof item==='string'?item:((item.name?item.name+': ':'')+(item.text||'')));});
}
/* ---------------------------------------------------------- quick poll */

/* The presets are the questions a teacher actually asks on the turn of a
   lesson. Each one fills the same two boxes the Custom route uses, so what
   is launched is always what is on screen — no hidden preset state that the
   prompt box then disagrees with. */
var POLL_PRESETS = {
  yesno: { kind: 'poll', options: ['Yes', 'No'], prompt: '' },
  truefalse: { kind: 'poll', options: ['True', 'False'], prompt: '' },
  abcd: { kind: 'poll', options: ['A', 'B', 'C', 'D'], prompt: '' },
  scale: { kind: 'scale', options: [], prompt: 'How confident do you feel?' },
  wordcloud: { kind: 'wordcloud', options: [], prompt: 'One word: how was that?' }
};
var pollKind = 'poll';

function pollCommand(data) {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(Object.assign({ type: 'sf-presenter-cmd', cmd: 'quickPoll' }, data), location.origin);
  }
}

function pollLines() {
  var box = /** @type {HTMLTextAreaElement|null} */ ($('pollOptions'));
  return (box ? box.value : '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
}

Array.prototype.forEach.call(document.querySelectorAll('[data-poll]'), function (btn) {
  btn.onclick = function () {
    var preset = POLL_PRESETS[btn.getAttribute('data-poll')];
    if (!preset) return;
    pollKind = preset.kind;
    var opts = /** @type {HTMLTextAreaElement|null} */ ($('pollOptions'));
    if (opts) {
      opts.value = preset.options.join('\n');
      opts.disabled = preset.kind !== 'poll';
    }
    var prompt = /** @type {HTMLTextAreaElement|null} */ ($('pollPrompt'));
    if (prompt && preset.prompt && !prompt.value.trim()) prompt.value = preset.prompt;
    Array.prototype.forEach.call(document.querySelectorAll('[data-poll]'), function (b) {
      b.classList.toggle('on', b === btn);
    });
    var guard = $('pollGuard');
    if (guard) guard.textContent = preset.kind === 'poll'
      ? 'Edit the answers if you want different ones.'
      : preset.kind === 'scale' ? 'Five points, from low to high.' : 'One word each.';
  };
});

var pollLaunch = $('pollLaunch');
if (pollLaunch) pollLaunch.onclick = function () {
  var prompt = /** @type {HTMLTextAreaElement|null} */ ($('pollPrompt'));
  var text = prompt ? prompt.value.trim() : '';
  var guard = $('pollGuard');
  if (!text) { if (guard) guard.textContent = 'Write the question the room is answering.'; return; }
  var options = pollLines();
  if (pollKind === 'poll' && options.length < 2) {
    if (guard) guard.textContent = 'A poll needs at least two answers, one per line.';
    return;
  }
  var where = /** @type {HTMLSelectElement|null} */ ($('pollWhere'));
  pollCommand({
    action: 'start', kind: pollKind, prompt: text, options: options,
    presentAs: where ? where.value : 'focus'
  });
  if (guard) guard.textContent = '';
};

var pollEnd = $('pollEnd');
if (pollEnd) pollEnd.onclick = function () { pollCommand({ action: 'end' }); };
var pollQr = $('pollQr');
if (pollQr) pollQr.onclick = function () { pollCommand({ action: 'join' }); };
var pollWhereToggle = /** @type {HTMLButtonElement|null} */ ($('pollWhereToggle'));
if (pollWhereToggle) {
  var toggleEl = pollWhereToggle;
  toggleEl.onclick = function () {
    pollCommand({ action: 'where', presentAs: toggleEl.dataset.next || 'rail' });
  };
}

var btnAi = /** @type {HTMLButtonElement|null} */ ($('pollAiSuggest'));
if (btnAi) {
  var aiButton = btnAi;
  aiButton.onclick = function () {
    var guard = $('pollGuard');
    if (!SF.AI || !SF.AI.generatePollForSlide) {
      if (guard) guard.textContent = 'AI engine not loaded.';
      return;
    }
    var slide = lastState && lastState.deck && lastState.deck.slides ? lastState.deck.slides[lastState.index] : null;
    if (guard) guard.textContent = '✨ Thinking...';
    aiButton.disabled = true;
    Promise.resolve(SF.AI.generatePollForSlide(slide)).then(function (generated) {
      if (!generated) {
        if (guard) guard.textContent = 'Could not generate a poll for this slide.';
        return;
      }
      pollKind = generated.kind;
      var promptEl = /** @type {HTMLTextAreaElement|null} */ ($('pollPrompt'));
      if (promptEl) promptEl.value = generated.prompt || '';
      var optsEl = /** @type {HTMLTextAreaElement|null} */ ($('pollOptions'));
      if (optsEl) {
        optsEl.value = (generated.options || []).join('\n');
        optsEl.disabled = generated.kind !== 'poll';
      }
      Array.prototype.forEach.call(document.querySelectorAll('[data-poll]'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-poll') === generated.kind);
      });
      if (guard) {
        guard.textContent = generated.heuristic
          ? (generated.fallback ? '✨ Generated from slide (offline fallback)' : '✨ Generated diagnostic check from slide')
          : '✨ Generated with AI (Gemini)';
      }
    }).catch(function () {
      if (guard) guard.textContent = 'Failed to generate poll.';
    }).finally(function () {
      aiButton.disabled = false;
    });
  };
}

/* ------------------------------------------------------- quiz on a theme */

var quizGenerate = $('quizGenerate');
if (quizGenerate) quizGenerate.onclick = function () {
  var theme = /** @type {HTMLInputElement|null} */ ($('quizTheme'));
  var words = /** @type {HTMLInputElement|null} */ ($('quizWords'));
  var style = /** @type {HTMLSelectElement|null} */ ($('quizStyle'));
  var count = /** @type {HTMLSelectElement|null} */ ($('quizCount'));
  var guard = $('quizGenGuard');
  var t = theme ? theme.value.trim() : '';
  if (!t) { if (guard) guard.textContent = 'Give it a theme to write about.'; return; }
  window.dispatchEvent(new CustomEvent('sf-activity-quiz-draft', { detail: {
    topic: t, keywords: words ? words.value.trim() : '',
    style: style ? style.value : 'choice', count: count ? Number(count.value) : 3
  } }));
};

function paintPoll(p) {
  var state = $('pollState');
  var count = $('pollCount');
  var end = /** @type {HTMLButtonElement|null} */ ($('pollEnd'));
  var qr = /** @type {HTMLButtonElement|null} */ ($('pollQr'));
  var toggle = /** @type {HTMLButtonElement|null} */ ($('pollWhereToggle'));
  if (state) state.textContent = p ? p.prompt : 'No poll';
  if (count) {
    count.textContent = !p ? '—'
      : !p.live ? 'Not live'
      : p.players ? p.answered + ' / ' + p.players
      : 'No one joined';
  }
  if (end) end.disabled = !p;
  if (qr) qr.disabled = !p;
  if (toggle) {
    toggle.disabled = !p;
    var next = p && p.presentAs === 'focus' ? 'rail' : 'focus';
    toggle.dataset.next = next;
    toggle.textContent = next === 'rail' ? 'Beside slide' : 'Full screen';
  }
}

SF.PresenterLive={update:function(d){lastState=d;paintPoll(d.quickPoll);moment=d.moment||null;room(d.roomPulse);var blocked=!!(d.roomPulse&&d.roomPulse.active&&['reveal','hold'].includes(d.nextAction));['showTask','showCountdown','showBreak','footCountdown','footBreak'].forEach(function(id){var btn=/** @type {HTMLButtonElement|null} */ ($(id));if(btn)btn.disabled=blocked;});var guard=$('momentGuard');if(guard)guard.textContent=blocked?'Finish the live question first.':'';clock();}};
setInterval(clock,250);
var audio = /** @type {HTMLAudioElement|null} */ ($('activityAudio'));
if(audio) audio.volume=0.3;
var musicInput = /** @type {HTMLInputElement|null} */ ($('activityMusic'));
if(musicInput) {
  var mInput = musicInput;
  mInput.onchange=function(){
    var file=mInput.files?mInput.files[0]:null;
    if(!file)return;
    var a=/** @type {HTMLAudioElement|null} */ ($('activityAudio'));
    if(!a)return;
    a.pause();
    if(musicUrl)URL.revokeObjectURL(musicUrl);
    musicUrl=URL.createObjectURL(file);
    a.src=musicUrl;
    a.hidden=false;
    var status=$('musicStatus');
    if(status)status.textContent=file.name;
  };
}
if(audio) {
  audio.onerror=function(){var status=$('musicStatus');if(status)status.textContent='Could not play that file.';};
}
window.addEventListener('pagehide',function(){var a=/** @type {HTMLAudioElement|null} */ ($('activityAudio'));if(a)a.pause();if(musicUrl)URL.revokeObjectURL(musicUrl);});
})();
