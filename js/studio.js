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
  /* [id, icon, title, blurb, kind, enabled] — fullscreen catalogue games stay placeholders until engines ship. */
  var activities = [
    ['choice','?','Multiple choice','Check an idea. Discuss the why.','check',true],
    ['truefalse','½','True / False','Uncover a common misconception.','check',true],
    ['type','Aa','Type answer','Recall it without the clues — no options to pick from.','check',true],
    ['poll','▤','Poll','Take the pulse of the room.','feedback',true],
    ['wordcloud','✳','Word cloud','Turn individual thoughts into patterns.','feedback',true],
    ['brainstorm','✎','Brainstorm','Make space for everyone’s ideas.','feedback',true],
    ['true-false','⚡','True/False Showdown','Fast retrieval under time pressure.','check',false],
    ['low-stakes-quiz','◎','Low-Stakes Quiz','Retrieval practice without a leaderboard.','check',false],
    ['quiz-bowl','▦','Quiz Bowl','Strategic recall across categories.','check',false],
    ['beat-the-clock','◷','Beat the Clock','Speeded multiple-choice fluency.','check',false],
    ['boss-battle','▲','Boss Battle','Shared goal: bring the boss HP down.','check',false],
    ['horse-race','♘','Horse Race','Team race across quick competitive rounds.','check',false],
    ['memory-flip','🂠','Memory Flip','Study, then claim term↔definition pairs.','check',false],
    ['memory-match','⧉','Memory Match','Memorise pairs; turn-based recall.','check',false],
    ['memory-maze','⎇','Memory Maze','Hold a sequence, then navigate it.','check',false],
    ['bingo','▣','Bingo','Mark terms from spoken definitions.','check',false],
    ['knowledge-flip','↺','Knowledge Flip','Explain visible keywords; claim understanding.','check',false],
    ['definition-challenge','¶','Definition Challenge','Read a passage, then answer from memory.','check',false],
    ['emoji-guess','☺','Emoji Guess','Decode concepts from symbolic clues.','check',false],
    ['word-reveal','…','Word Reveal','Guess from letters as they drip in.','check',false],
    ['fill-in-the-blanks','_','Fill in the Blanks','Cloze comprehension in context.','check',false],
    ['heads-up','↑','Heads Up','Describe a term; peers retrieve it.','check',false],
    ['spin-explain','◉','Spin & Explain','Spin a concept; explain it aloud.','check',false],
    ['spot-the-error','✗','Spot the Error','Find the mistake; explain the fix.','check',false],
    ['ranking','↕','Ranking Challenge','Order items by criteria and justify.','check',false],
    ['odd-one-out','◇','Odd One Out','Spot the outlier; name the rule.','check',false],
    ['compare-contrast','⇄','Compare & Contrast','Map similarities and differences.','check',false],
    ['predict-outcome','→','Predict the Outcome','Choose what happens next, and why.','check',false],
    ['time-traveler','☽','Time Traveler','Recall events from year or clue.','check',false],
    ['connection-maker','⚭','Connection Maker','Link two ideas; explain the bridge.','check',false],
    ['question-cube','⚀','Question Cube','Roll a prompt; open class discussion.','check',false],
    ['random-challenge','✦','Random Challenge','Draw varied open challenges.','check',false],
    ['concept-chain','⛓','Concept Chain','Grow a justified chain of ideas.','check',false]
  ];
  function drawLibrary(filter) {
    var body = document.getElementById('activityBody'); body.replaceChildren();
    var tabs = el('div','library-tabs');
    [['all','All activities'],['check','Knowledge checks'],['feedback','Gather feedback']].forEach(function (t) {
      var b = SF.Shell.UI.button(t[1], filter === t[0] ? 'active' : '', function () {drawLibrary(t[0]);}); tabs.appendChild(b);
    });
    body.appendChild(tabs);
    body.appendChild(el('p','library-note','Live checks and feedback are ready now. Fullscreen games appear as planned formats under Knowledge checks until their engines ship; feedback stays beside your slide.'));
    var grid = el('div','activity-grid');
    activities.filter(function (a) {return filter === 'all' || a[4] === filter;}).forEach(function (a) {
      var b = el('button','activity-card ' + a[4]); b.disabled = !a[5];
      b.appendChild(el('span','activity-icon',a[1]));
      b.appendChild(el('strong',null,a[2])); b.appendChild(el('span','activity-description',a[3]));
      b.appendChild(el('span','activity-tag',a[5] ? (a[4] === 'check' ? 'BETWEEN SLIDES  ↗' : 'BESIDE YOUR SLIDE  ↗') : 'PLANNED FORMAT'));
      /* Planned cards stay disabled — never call insert with an unimplemented style id. */
      if (a[5]) b.onclick = function () {
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
