/* SlideForge bingo boards. The pool of pairs is authored in the game; the
   cards dealt from it belong to one presentation run and are reshuffled on
   restart. The teacher calls a definition and marks who explained the term —
   no learner can claim a square. */
(function (global) {
  'use strict';
  var SF = global.SF;
  var active = null;

  /** Deal one card per participant: size² distinct pairs, shuffled. */
  function deal(board) {
    var size = Math.max(2, Math.min(4, Number(board.gridSize) || 3));
    var need = size * size;
    /* One square per *term*, not per authored pair. Two pairs written with the
       same term used to land on the same card twice, and then a single call
       marked only one of them — so a line could need a square whose term had
       already been called and spent. */
    var seen = {}, distinct = [];
    board.pool.forEach(function (pair) {
      var key = String(pair.term || '').trim().toLowerCase();
      if (!key || seen[key]) return;
      seen[key] = 1;
      distinct.push(pair);
    });
    return board.participants.map(function () {
      var bag = distinct.slice(), cells = [];
      while (cells.length < need && bag.length) {
        var pick = bag.splice(Math.floor(Math.random() * bag.length), 1)[0];
        cells.push({ id: pick.id, term: pick.term, state: 'open' });
      }
      /* A pool smaller than the card is refused before the deck runs (see
         GAME_STYLES.bingo.board), but a board built by hand should still
         produce a card rather than a hole. */
      while (cells.length < need) cells.push({ id: null, term: '', state: 'open' });
      return cells;
    });
  }

  function create(board) {
    return { phase: 'ready', cards: deal(board), called: [], current: -1,
      revealed: false, winners: [], elapsed: 0, paused: false };
  }

  /** Row, column or diagonal — the same shape the model tests. */
  function hasLine(cells, size) {
    return SF.bingoHasLine(cells.map(function (c) { return c.state === 'claimed'; }), size);
  }

  /** Which square on this card holds the term being called, if any. */
  function square(state, board, team) {
    if (state.current < 0) return -1;
    var term = board.pool[state.current].term;
    var cells = state.cards[team] || [];
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].term === term) return i;
    }
    return -1;
  }

  /** Why a team cannot answer this call — the wall says so rather than going
      quiet, because a dead button on a projector reads as a broken app. */
  function blocked(state, board, team) {
    if (state.current < 0) return 'Call a definition first';
    if (state.winners.indexOf(team) > -1) return 'Already has a line';
    var i = square(state, board, team);
    if (i < 0) return 'Not on this card';
    if (state.cards[team][i].state === 'claimed') return 'Already claimed';
    if (state.cards[team][i].state === 'missed') return 'Missed earlier';
    return null;
  }

  function transition(board, state, action, arg) {
    var size = Math.max(2, Math.min(4, Number(board.gridSize) || 3));
    var s = Object.assign({}, state, {
      called: state.called.slice(),
      winners: state.winners.slice(),
      cards: state.cards.map(function (cells) {
        return cells.map(function (c) { return Object.assign({}, c); });
      })
    });
    if (action === 'restart') return create(board);
    if (action === 'start' && s.phase === 'ready') {
      s.phase = 'calling';
    } else if (action === 'pause' && s.phase === 'calling') {
      s.paused = !s.paused;
    } else if (action === 'call' && s.phase === 'calling' && !s.paused) {
      /* Someone already has a line — next call closes the round so every
         team that lined up on the same reveal can be claimed first. */
      if (s.winners.length) {
        s.phase = 'complete';
        return s;
      }
      /* Every term gets called once, in a random order — so a square nobody
         claimed is gone, which is what makes a miss cost something. */
      var left = [];
      for (var i = 0; i < board.pool.length; i++) {
        if (s.called.indexOf(i) === -1) left.push(i);
      }
      if (!left.length) {
        /* Pool spent, no line — end so the room can deal a new card. */
        s.phase = 'complete';
        return s;
      }
      s.current = left[Math.floor(Math.random() * left.length)];
      s.called.push(s.current);
      s.revealed = false;
    } else if (action === 'reveal' && s.current > -1 && !s.paused) {
      s.revealed = true;
    } else if ((action === 'claim' || action === 'miss') && s.phase === 'calling' &&
        s.revealed && !s.paused && Number.isInteger(arg) && !blocked(s, board, arg)) {
      var cell = square(s, board, arg);
      s.cards[arg][cell].state = action === 'claim' ? 'claimed' : 'missed';
      if (action === 'claim' && hasLine(s.cards[arg], size) && s.winners.indexOf(arg) === -1) {
        s.winners.push(arg);
        /* Stay calling so another team can claim a line on this same term. */
      }
    }
    return s;
  }

  /** Squares claimed per participant. Not points — bingo has none — but the
      number a teacher reads out, and the one the report tallies. */
  function scores(board, s) {
    return board.participants.map(function (name, i) {
      return { name: name, score: (s.cards[i] || []).filter(function (c) {
        return c.state === 'claimed';
      }).length, won: s.winners.indexOf(i) > -1 };
    });
  }

  function winner(board, s) {
    if (!s.winners.length) return 'No line yet.';
    var names = s.winners.map(function (i) { return board.participants[i]; });
    if (board.participants.length === 1) return 'Bingo — the card is complete.';
    return names.length === 1 ? names[0] + ' has a line.' : 'A shared line: ' + names.join(' & ');
  }

  function render(pad, slide, opts) {
    opts = opts || {};
    var b = slide.bingoBoard, s = opts.bingoState || create(b);
    var command = opts.bingoCommand;
    var size = Math.max(2, Math.min(4, Number(b.gridSize) || 3));
    var el = SF.el;
    pad.replaceChildren();

    /* How many real terms there are to deal from. A card wants size² of them;
       short of that the board still draws — an author needs to see the cards
       and how a round moves through them, and a panel of text instead of a
       board shows neither. The squares it cannot fill say so on themselves. */
    var seenTerms = {}, unique = 0;
    b.pool.forEach(function (pair) {
      var key = String(pair.term || '').trim().toLowerCase();
      if (key && !seenTerms[key]) { seenTerms[key] = 1; unique++; }
    });
    var shortBy = Math.max(0, size * size - unique);

    function button(text, action, cls, arg) {
      var node = el('button', 'bingo-button ' + (cls || ''), text);
      node.type = 'button'; node.disabled = !command;
      node.dataset.bingoAction = action;
      if (arg != null) node.dataset.bingoArg = String(arg);
      if (command) node.onclick = function () { command(action, arg); };
      return node;
    }

    var head = el('header', 'bingo-head');
    var identity = el('div');
    identity.appendChild(el('div', 'bingo-eyebrow', 'BINGO / ' +
      size + '×' + size + ' · ' + b.pool.length + ' TERMS'));
    identity.appendChild(el('h2', 'bingo-name', slide.title));
    head.appendChild(identity);
    var count = el('div', 'bingo-count');
    count.appendChild(el('span', null, s.phase === 'ready' ? 'READY' :
      s.phase === 'complete' ? 'BINGO' : 'CALLING'));
    count.appendChild(el('strong', null, s.called.length + ' / ' + b.pool.length));
    head.appendChild(count);
    pad.appendChild(head);

    /* The call. The definition is the question; the term is the answer, so it
       stays off the wall until the room has committed to one. */
    var call = el('div', 'bingo-call' + (s.current > -1 ? ' on' : ''));
    if (s.current > -1) {
      call.appendChild(el('div', 'bingo-eyebrow', s.revealed ? 'THE TERM WAS' : 'WHICH TERM IS THIS?'));
      call.appendChild(el('p', 'bingo-def', b.pool[s.current].definition));
      if (s.revealed) call.appendChild(el('strong', 'bingo-term', b.pool[s.current].term));
    } else {
      call.appendChild(el('div', 'bingo-eyebrow', s.phase === 'complete' ? 'FINISHED' : 'NOTHING CALLED YET'));
      call.appendChild(el('p', 'bingo-def', s.phase === 'complete' ? winner(b, s)
        : 'Call a definition. If it is on their card, a team says what the term means to claim the square.'));
    }
    pad.appendChild(call);

    var cards = el('div', 'bingo-cards');
    /* Told how many columns rather than left to auto-fit: four teams in three
       columns is 3 + 1, and the orphan row pushed the footer off the bottom of
       the slide. Two rows of two is the same cards and fits. */
    var across = b.participants.length <= 3 ? b.participants.length :
      b.participants.length === 4 ? 2 : 3;
    cards.classList.add('across-' + across);
    cards.classList.toggle('many', b.participants.length > 3);
    b.participants.forEach(function (name, team) {
      var box = el('section', 'bingo-card' + (s.winners.indexOf(team) > -1 ? ' won' : ''));
      var caption = el('div', 'bingo-card-head');
      caption.appendChild(el('strong', null, name));
      /* The verdicts live on the name line. As their own row under each card
         they cost about forty pixels a row, which came straight off the
         squares — nine terms in a strip too shallow to read across a room. */
      if (command && s.phase === 'calling') {
        var verdicts = el('div', 'bingo-verdicts');
        if (s.current > -1 && !s.revealed) {
          verdicts.appendChild(el('span', 'bingo-why', 'Waiting on an answer'));
        } else {
          var why = blocked(s, b, team);
          if (why) {
            verdicts.appendChild(el('span', 'bingo-why', why));
          } else {
            verdicts.appendChild(button('✓ Claim', 'claim', 'primary', team));
            verdicts.appendChild(button('✗ Missed', 'miss', '', team));
          }
        }
        caption.appendChild(verdicts);
      }
      caption.appendChild(el('span', 'bingo-tick', s.winners.indexOf(team) > -1 ? 'LINE' :
        (s.cards[team] || []).filter(function (c) { return c.state === 'claimed'; }).length +
        ' / ' + (size * size)));
      box.appendChild(caption);
      var grid = el('div', 'bingo-grid');
      grid.style.gridTemplateColumns = 'repeat(' + size + ', minmax(0, 1fr))';
      var live = s.current > -1 && !s.revealed ? -1 : square(s, b, team);
      (s.cards[team] || []).forEach(function (cell, i) {
        var sq = el('div', 'bingo-square is-' + cell.state +
          (cell.term ? '' : ' is-gap') +
          (i === live && cell.state === 'open' ? ' calling' : '') +
          /* "Mitochondrion" in a sixteenth of a shared card broke across two
             lines as "Mitochondri / on". Smaller reads better than split. */
          ((cell.term || '').length > 11 ? ' long' : ''),
          cell.term || 'needs a term');
        grid.appendChild(sq);
      });
      box.appendChild(grid);
      cards.appendChild(box);
    });
    pad.appendChild(cards);

    var foot = el('div', 'bingo-foot');
    var status = el('div', 'bingo-status'); status.setAttribute('aria-live', 'polite');
    status.appendChild(el('strong', null, s.paused ? 'Paused.' :
      s.phase === 'ready' ? 'Every team has a different card.' :
      s.phase === 'complete' ? winner(b, s) :
      s.current < 0 ? 'Call the next definition.' :
      s.revealed ? 'Who claimed “' + b.pool[s.current].term + '”?' :
      'Read it out. Reveal the term once they have answered.'));
    status.appendChild(el('span', shortBy ? 'bingo-short' : null, shortBy
      ? 'A ' + size + '×' + size + ' card needs ' + (size * size) + ' different terms and there ' +
        (unique === 1 ? 'is' : 'are') + ' ' + unique + ' — add ' + shortBy +
        ' more, or choose a smaller card size in Game settings'
      : s.phase === 'complete'
        ? s.called.length + ' of ' + b.pool.length + ' terms called'
        : 'A row, column or diagonal wins · no points · each term is called once'));
    foot.appendChild(status);

    var actions = el('div', 'bingo-actions');
    if (s.phase === 'ready') actions.appendChild(button('Deal and start →', 'start', 'primary'));
    if (s.phase === 'calling') {
      if (s.current > -1 && !s.revealed) actions.appendChild(button('Reveal the term', 'reveal', 'primary'));
      var more = s.called.length < b.pool.length;
      var nextLabel = s.current < 0 ? 'Call a definition →' : 'Call the next →';
      if (!more) {
        nextLabel = s.winners.length ? 'Finish — bingo' : 'Finish — no line';
      } else if (s.winners.length) {
        nextLabel = 'Finish — bingo';
      }
      var next = button(nextLabel, 'call',
        s.revealed || s.current < 0 || s.winners.length || !more ? 'primary' : '');
      actions.appendChild(next);
      actions.appendChild(button(s.paused ? 'Resume' : 'Pause', 'pause'));
    }
    if (s.phase === 'complete') actions.appendChild(button('Deal a new card', 'restart', 'primary'));
    foot.appendChild(actions);
    pad.appendChild(foot);

    if (s.phase === 'complete') {
      var tally = el('div', 'bingo-tally');
      scores(b, s).forEach(function (row) {
        tally.appendChild(el('span', row.won ? 'won' : null,
          row.name + ' · ' + row.score + (row.won ? ' · LINE' : '')));
      });
      foot.appendChild(tally);
    }
  }

  function command(action, arg) {
    if (!active) return;
    var board = active.slide.bingoBoard;
    var before = active.player.bingoStates[active.slide.id];
    var after = transition(board, before, action, arg);
    active.player.bingoStates[active.slide.id] = after;
    /* A claim or a miss is the teacher marking what a team said out loud —
       the only record the round leaves. Same evidence, same rail as the
       memory boards. */
    if ((action === 'claim' || action === 'miss') && before.current > -1 &&
        Number.isInteger(arg) && after.cards[arg] && SF.Bingo.onVerdict) {
      var cell = square(before, board, arg);
      var changed = cell > -1 && before.cards[arg][cell].state !== after.cards[arg][cell].state;
      if (changed) SF.Bingo.onVerdict({
        slideId: active.slide.id, title: active.slide.title, kind: 'bingo',
        set: 1, card: cell, term: board.pool[before.current].term,
        participant: board.participants.length > 1 ? board.participants[arg] : null,
        right: action === 'claim'
      });
    }
    active.paint(true);
  }

  function mount(player, slide, node) {
    unmount();
    var session = SF.Boards.createSession('bingo', {
      player: player,
      slide: slide,
      node: node,
      create: create,
      render: render,
      command: command,
      interval: 1000,
      tick: function (session, dt) {
        var s = player.bingoStates[slide.id];
        if (s.phase !== 'calling') return;
        s.elapsed += dt;
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

  SF.Bingo = { onVerdict: null, create: create, transition: transition, deal: deal,
    scores: scores, winner: winner, blocked: blocked, square: square,
    render: render, mount: mount, unmount: unmount, command: command };
})(typeof window === 'undefined' ? globalThis : window);
