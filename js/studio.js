/* Local lesson-design tools. Reuses the existing game and feedback engines. */
(function () {
  'use strict';
  var SF = window.SF;
  var el = SF.el;
  var returnFocus;
  function makeLesson() {
    var d = SF.makeDeck('The art of paying attention');
    d.theme = 'studio';
    var g = SF.makeGame('Let’s check that idea', 'choice');
    g.theme = 'studio';
    g.settings.defaultTime = 0; g.settings.scoreboard = false; g.settings.scoreSlide = false;
    g.questions[0].question = 'Which strategy best helps you focus on a difficult task?';
    g.questions[0].options = ['Switch between tasks', 'Remove distractions', 'Keep every notification on', 'Do everything at once'];
    g.questions[0].correct = 1;
    g.questions[0].explanation = 'Removing distractions reduces the number of things competing for your attention. Try a short, focused work session, then pause and reflect.';
    SF.GameStore.save(g);
    function slide(type, props) { return Object.assign(SF.makeSlide(type), props); }
    d.slides = [
      slide('title', {title:'The art of\npaying attention.', subtitle:'A small exploration of focus, distraction & how we learn.', bloom:'Understand', notes:'Welcome everyone. Invite them to notice where their attention is right now. There is no leaderboard or countdown in this lesson.'}),
      slide('section', {title:'Where does your\nattention go?', subtitle:'One word. No wrong answers.', bloom:'Remember', feedback:{kind:'wordcloud',prompt:'What pulls your attention away?',options:[],max:2}, notes:'Use the sample response preview to rehearse. In a live session, invite responses and discuss the largest words.'}),
      slide('cards', {title:'Give your attention a little space.', bullets:['Remove the distractions competing for your focus.','Choose one small task with a clear finish line.','Pause, reflect and adjust your approach.'], bloom:'Understand', notes:'Ask for one everyday example of each strategy.'}),
      slide('game', {title:g.title, gameTitle:g.title, gameId:g.id,bloom:'Apply', notes:'Invite an answer, then ask learners to explain their reasoning. Revisit any misconceptions before moving on.'}),
      slide('content', {title:'Make it work in your world.',bullets:['Think of a moment when focusing feels difficult.','Choose one change you could try tomorrow.','Share your idea, then build on someone else’s.'],bloom:'Create',feedback:{kind:'brainstorm',prompt:'What is one change you could try tomorrow?',options:[],max:2},notes:'Invite the room to compare suggestions. Ask which ideas might work in different contexts.'}),
      slide('section', {title:'A little reflection.\nA better next step.',subtitle:'Before you go, check in with yourself.',bloom:'Evaluate',feedback:{kind:'poll',prompt:'Could you apply one of these strategies?',options:['I need another example','I could try with support','I’m ready to try it'],max:1},nextStep:'If learners need another example, model a focused study session. Otherwise, invite them to try one strategy and reflect next lesson.',notes:'Use the responses to decide whether to revisit an example or move to independent practice.'})
    ];
    return d;
  }
  function openLibrary() {
    returnFocus = document.activeElement;
    var modal = document.getElementById('activityModal');
    modal.showModal();
    drawLibrary('all');
  }
  var activities = [
    ['choice','?','Multiple choice','Check an idea. Discuss the why.','check',true],
    ['truefalse','½','True / False','Uncover a common misconception.','check',true],
    ['type','Aa','Type answer','Recall it without the clues.','check',false],
    ['slider','↔','Slider','Estimate a value or a range.','check',false],
    ['puzzle','▦','Puzzle','Put ideas in the right order.','check',false],
    ['audio','♫','Quiz + audio','Listen closely, then respond.','check',false],
    ['poll','▤','Poll','Take the pulse of the room.','feedback',true],
    ['wordcloud','✳','Word cloud','Turn individual thoughts into patterns.','feedback',true],
    ['brainstorm','✎','Brainstorm','Make space for everyone’s ideas.','feedback',true],
    ['open','↗','Open-ended','Go deeper with a written reflection.','feedback',false],
    ['scale','≋','Scale','Explore confidence and agreement.','feedback',false],
    ['nps','◴','NPS','Gather a recommendation score.','feedback',false],
    ['pin','⌖','Drop pin','Place a response on an image.','feedback',false]
  ];
  function drawLibrary(filter) {
    var body = document.getElementById('activityBody'); body.replaceChildren();
    var tabs = el('div','library-tabs');
    [['all','All activities'],['check','Knowledge checks'],['feedback','Gather feedback']].forEach(function (t) {
      var b = SF.Shell.UI.button(t[1], filter === t[0] ? 'active' : '', function () {drawLibrary(t[0]);}); tabs.appendChild(b);
    });
    body.appendChild(tabs);
    body.appendChild(el('p','library-note','Knowledge checks play between slides. Feedback stays beside your slide, with an option to explore responses full screen.'));
    var grid = el('div','activity-grid');
    activities.filter(function (a) {return filter === 'all' || a[4] === filter;}).forEach(function (a) {
      var b = el('button','activity-card ' + a[4]); b.disabled = !a[5];
      b.appendChild(el('span','activity-icon',a[1]));
      b.appendChild(el('strong',null,a[2])); b.appendChild(el('span','activity-description',a[3]));
      b.appendChild(el('span','activity-tag',a[5] ? (a[4] === 'check' ? 'BETWEEN SLIDES  ↗' : 'BESIDE YOUR SLIDE  ↗') : 'PLANNED FORMAT'));
      b.onclick = function () {
        document.getElementById('activityModal').close();
        if (a[4] === 'check') SF.Editor.insertNewGame(a[0]); else SF.Editor.attachFeedback(a[0]);
        SF.toast(a[2] + ' added. Customize it in the right panel.');
      };
      grid.appendChild(b);
    });
    body.appendChild(grid);
  }
  function init() {
    var modal = el('dialog','activity-modal'); modal.id = 'activityModal';
    modal.setAttribute('aria-labelledby','activityTitle');
    modal.innerHTML = '<header><div><span class="eyebrow">LESS WATCHING. MORE THINKING.</span><h2 id="activityTitle">Bring the room into the lesson.</h2></div><button class="btn ghost" aria-label="Close activity library">✕</button></header><div id="activityBody"></div><footer><span class="local-dot"></span> Design & preview locally · Planned formats are not yet available</footer>';
    document.body.appendChild(modal);
    modal.querySelector('header button').onclick = function () {modal.close();};
    modal.addEventListener('click', function (e) {if (e.target === modal) {var r = modal.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close();}});
    modal.addEventListener('close',function () {if (returnFocus) returnFocus.focus();});
    document.getElementById('btnActivities').onclick = openLibrary;
    document.getElementById('btnTemplate').onclick = function () {SF.Editor.useLesson(); SF.toast('Example lesson opened. Your previous lesson is saved in File → Open.');};
    document.getElementById('btnReflect').onclick = function () {SF.Editor.addSlide('section'); SF.Editor.attachFeedback('poll');};
    document.querySelectorAll('.file-actions button').forEach(function (b) {b.addEventListener('click',function () {document.querySelector('.file-menu').open = false;});});
  }
  SF.Studio = {init:init,makeLesson:makeLesson,openLibrary:openLibrary};
})();
