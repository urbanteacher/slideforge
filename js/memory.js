/* SlideForge memory boards. Authored pairs stay in games; this disposable
   state belongs to one presentation run. No learner can award a claim. */
(function (global) {
  'use strict';
  var SF = global.SF;
  var active = null;
  function create(board) {
    return { phase: 'ready', selected: -1, revealed: false, turn: 0,
      owners: board.pairs.map(function () { return null; }),
      remaining: board.studySeconds, paused: false, elapsed: 0, attempts: 0 };
  }
  function transition(board, state, action, card) {
    var s = Object.assign({}, state, { owners: state.owners.slice() });
    if (action === 'restart') return create(board);
    if (action === 'start' && s.phase === 'ready') {
      s.phase = board.kind === 'knowledgeflip' || !s.remaining ? 'recall' : 'study';
    } else if (action === 'hide' && s.phase === 'study') {
      s.phase = 'recall'; s.remaining = 0; s.paused = false;
    } else if (action === 'pause' && (s.phase === 'study' || s.phase === 'recall')) {
      s.paused = !s.paused;
    } else if (action === 'select' && s.phase === 'recall' && !s.paused && s.selected === -1 &&
        Number.isInteger(card) && card >= 0 && card < s.owners.length && s.owners[card] === null) {
      s.selected = card; s.revealed = false;
    } else if (action === 'reveal' && s.phase === 'recall' && !s.paused && s.selected !== -1) {
      s.revealed = true;
    } else if ((action === 'claim' || action === 'pass') && s.phase === 'recall' && !s.paused &&
        s.selected !== -1 && (action === 'pass' || s.revealed)) {
      if (action === 'claim') s.owners[s.selected] = s.turn;
      s.attempts++; s.selected = -1; s.revealed = false;
      s.turn = (s.turn + 1) % Math.max(1, board.participants.length);
      if (s.owners.every(function (owner) { return owner !== null; })) s.phase = 'complete';
    }
    return s;
  }
  function scores(board, s) {
    return board.participants.map(function (name, i) {
      return { name: name, score: s.owners.filter(function (owner) { return owner === i; }).length };
    });
  }
  function winner(board, s) {
    var rows = scores(board, s), max = Math.max.apply(null, rows.map(function (r) { return r.score; }));
    var names = rows.filter(function (r) { return r.score === max; }).map(function (r) { return r.name; });
    if (rows.length === 1) return 'Every pair remembered.';
    return names.length === 1 ? names[0] + ' wins this set.' : 'Shared win: ' + names.join(' & ');
  }
  function render(pad, slide, opts) {
    opts = opts || {};
    var b = slide.memoryBoard, s = opts.memoryState || create(b), preview = !opts.memoryState;
    var command = opts.memoryCommand;
    var el = SF.el;
    pad.replaceChildren();
    function button(text, action, cls, card) {
      var node = el('button', 'mem-button ' + (cls || ''), text);
      node.type = 'button'; node.disabled = !command;
      node.dataset.memoryAction = action;
      if (card != null) node.dataset.memoryCard = String(card);
      if (command) node.onclick = function () { command(action, card); };
      return node;
    }
    var head = el('header', 'mem-header');
    var titles = { memorymatch: 'MEMORY MATCH', memoryflip: 'MEMORY FLIP', knowledgeflip: 'KNOWLEDGE FLIP' };
    var identity = el('div');
    identity.appendChild(el('div', 'mem-eyebrow', titles[b.kind] + ' / SET ' + b.set + ' OF ' + b.sets));
    identity.appendChild(el('h2', 'mem-title', slide.title));
    head.appendChild(identity);
    var clock = el('div', 'mem-clock');
    clock.appendChild(el('span', null, s.phase === 'ready' ? 'READY' : s.phase === 'study' ? 'STUDY' : s.phase === 'complete' ? 'FINISHED' : 'RECALL'));
    clock.appendChild(el('strong', 'mem-time', s.phase === 'study' ? Math.ceil(s.remaining) + 's' : Math.floor(s.elapsed / 60) + ':' + String(Math.floor(s.elapsed % 60)).padStart(2, '0')));
    head.appendChild(clock); pad.appendChild(head);

    var progress = el('div', 'mem-progress');
    ['1 · Study', '2 · Recall', '3 · Collect'].forEach(function (label, i) {
      if (b.kind === 'knowledgeflip' && i === 0) label = '1 · Choose';
      var current = s.phase === 'ready' || s.phase === 'study' ? 0 : s.phase === 'complete' ? 2 : 1;
      progress.appendChild(el('span', i <= current ? 'on' : '', label));
    });
    progress.appendChild(el('strong', null, s.owners.filter(function (o) { return o !== null; }).length + ' / ' + b.pairs.length + ' collected'));
    pad.appendChild(progress);

    var allVisible = preview || s.phase === 'study' || s.phase === 'complete';
    /* Knowledge Flip never hides keywords — and never shows definitions on
       the board during play. Preview matches that: terms up, meanings in the
       check panel / inspector only. */
    if (b.kind === 'knowledgeflip') allVisible = s.phase === 'complete';
    var grid = el('div', 'mem-grid');
    grid.classList.toggle('mem-grid-small', b.pairs.length <= 4);
    grid.classList.toggle('mem-grid-knowledge', b.kind === 'knowledgeflip');
    b.pairs.forEach(function (pair, i) {
      var owned = s.owners[i] !== null, selected = s.selected === i;
      var face = allVisible || owned || selected || b.kind === 'knowledgeflip';
      var card = button('', 'select', 'mem-card' + (face ? ' face-up' : ' face-down') +
        (owned ? ' collected' : '') + (selected ? ' selected' : '') +
        (b.kind === 'knowledgeflip' ? ' knowledge' : ''), i);
      card.classList.toggle('dense', pair.term.length > 35 || pair.definition.length > 150);
      card.disabled = !command || s.phase !== 'recall' || s.paused || owned || s.selected !== -1;
      card.setAttribute('aria-label', face ? pair.term + (owned ? ', collected' : '') : 'Choose card ' + (i + 1));
      card.appendChild(el('span', 'mem-card-number', String(i + 1).padStart(2, '0')));
      if (face) {
        card.appendChild(el('strong', 'mem-term', pair.term));
        if (allVisible) card.appendChild(el('span', 'mem-definition', pair.definition));
        else if (owned) card.appendChild(el('span', 'mem-owner', '✓ ' + b.participants[s.owners[i]]));
        else card.appendChild(el('span', 'mem-card-prompt',
          selected ? 'Explain it aloud' : 'Choose & explain'));
      } else {
        card.appendChild(el('span', 'mem-symbol', '✳'));
        card.appendChild(el('span', 'mem-card-prompt', 'What do you remember?'));
      }
      grid.appendChild(card);
    });
    pad.appendChild(grid);

    var bottom = el('div', 'mem-bottom');
    var status = el('div', 'mem-status'); status.setAttribute('aria-live', 'polite');
    var caption = s.paused ? 'Paused. Take a moment.' : s.phase === 'ready' ?
      (b.kind === 'knowledgeflip'
        ? 'Keywords stay on the board. Choose one, explain it, then collect the card.'
        : 'Ready? Study the whole set, then recall from the hidden cards.') :
      s.phase === 'study' ? 'Make a connection between each term and its meaning.' :
      s.phase === 'complete' ? winner(b, s) :
      s.selected < 0 ? b.participants[s.turn] + ' — choose a keyword.' :
      b.participants[s.turn] + ' — explain “' + b.pairs[s.selected].term + '”.';
    status.appendChild(el('strong', null, caption));
    status.appendChild(el('span', null, s.phase === 'complete' ? s.attempts + ' attempts · ' + b.pairs.length + ' cards collected' :
      b.kind === 'knowledgeflip'
        ? (b.participants.length > 1
          ? 'No study timer · 1 point per claim · turns rotate · misses can be retried'
          : 'No study timer · explain aloud · teacher checks · misses can be retried')
        : (b.participants.length > 1
          ? '1 point per claim · turns rotate after a claim or pass · misses can be retried'
          : 'One class collection · explain aloud · teacher checks · misses can be retried')));
    bottom.appendChild(status);
    var actions = el('div', 'mem-actions');
    if (s.phase === 'ready') actions.appendChild(button(b.kind === 'knowledgeflip' ? 'Open the board →' : 'Start studying →', 'start', 'primary'));
    if (s.phase === 'study') actions.appendChild(button('Ready to recall →', 'hide', 'primary'));
    if (s.phase === 'study' || s.phase === 'recall') actions.appendChild(button(s.paused ? 'Resume' : 'Pause', 'pause'));
    if (s.phase === 'complete') actions.appendChild(button('Play this set again', 'restart', 'primary'));
    if (s.selected !== -1 && s.phase === 'recall' && !s.paused) {
      var check = el('div', 'mem-check');
      check.setAttribute('role', 'group'); check.setAttribute('aria-label', 'Check this claim');
      check.appendChild(el('div', 'mem-eyebrow',
        b.kind === 'knowledgeflip' ? 'EXPLAIN FIRST · THEN CHECK' : 'SAY IT FIRST · THEN CHECK'));
      check.appendChild(el('h3', null, b.pairs[s.selected].term));
      check.appendChild(el('p', null, s.revealed ? b.pairs[s.selected].definition : 'Explain the meaning before revealing the definition.'));
      var verdicts = el('div', 'mem-actions');
      if (!s.revealed) verdicts.appendChild(button('Reveal definition', 'reveal', 'primary'));
      else verdicts.appendChild(button('✓ Claim card · +1', 'claim', 'primary'));
      verdicts.appendChild(button(s.revealed ? 'Try again next turn' : 'Pass this turn', 'pass'));
      check.appendChild(verdicts); pad.appendChild(check);
    }
    /* After the check strip, so the turn and the Pause control stay on the
       last line of the board however much the strip grows. */
    bottom.appendChild(actions); pad.appendChild(bottom);
    if (s.phase === 'complete') {
      var tally = el('div', 'mem-tally');
      scores(b, s).forEach(function (row) { tally.appendChild(el('span', null, row.name + ' · ' + row.score)); });
      bottom.appendChild(tally);
    }
  }
  function command(action, card) {
    if (!active) return;
    active.tick();
    var board = active.slide.memoryBoard;
    var before = active.player.memoryStates[active.slide.id];
    var after = transition(board, before, action, card);
    active.player.memoryStates[active.slide.id] = after;
    /* The board state stays disposable, but a claim or a pass is the teacher
       marking something that was said out loud — the same kind of evidence as
       a revealed question, and the only record the round leaves. It goes to
       whoever is keeping one; nothing here knows or cares whether that is a
       live session. */
    if ((action === 'claim' || action === 'pass') && before.selected !== -1 &&
        after.selected === -1 && SF.Memory.onVerdict) {
      var pair = board.pairs[before.selected];
      SF.Memory.onVerdict({
        slideId: active.slide.id, title: active.slide.title, kind: board.kind,
        set: board.set, card: before.selected, term: pair.term,
        participant: board.participants.length > 1 ? board.participants[before.turn] : null,
        right: action === 'claim'
      });
    }
    active.paint(true);
  }
  function mount(player, slide, node) {
    unmount();
    var session = SF.Boards.createSession('memory', {
      player: player,
      slide: slide,
      node: node,
      create: create,
      render: render,
      command: command,
      interval: 1000,
      tick: function (session, dt) {
        var s = player.memoryStates[slide.id];
        if (s.phase === 'study') {
          s.remaining = Math.max(0, s.remaining - dt);
          if (!s.remaining) {
            player.memoryStates[slide.id] = transition(slide.memoryBoard, s, 'hide');
            session.paint(false);
            return;
          }
        } else if (s.phase === 'recall') s.elapsed += dt;
        else return;
        return true;
      }
    });
    active = session;
    session.start();
  }
  function unmount() {
    if (!active) return;
    active.stop();
    active = null;
  }
  SF.Memory = { onVerdict: null, create: create, transition: transition, scores: scores, winner: winner,
    render: render, mount: mount, unmount: unmount, command: command };
})(typeof window === 'undefined' ? globalThis : window);
