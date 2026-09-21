/* SlideForge quiz bowl boards. The categories, values and answers are authored
   in the game; which cells are spent and who has what belongs to one
   presentation run. Only the teacher awards a cell. */

/* Moved out of js/bowl.js and into the boards engine, where the rest of it
 * already lived: src/boards/ holds board compilation and authoring hooks,
 * src/games/ the question mechanics. This is the third layer — the board as
 * the room actually sees it, drawn and driven in the browser.
 *
 * Installed by src/model.js rather than by a page, because the engine is the
 * model's: SF.Boards is built there and resolves SF.Bowl lazily by name.
 * The comment on createBoardRuntime said runtimes are looked up when used
 * "because browser script tags load them after the model bundle" — there are
 * no script tags now, and the lookup works either way.
 *
 * Nothing here runs at install but declarations and the SF.Bowl assignment.
 */
export function installBowl(SF) {
  var active = null;

  function create(board) {
    return {
      phase: 'ready',
      /* How many of each cell's questions have been used, by cell index. A
         cell with two questions in it can be chosen twice. */
      used: board.cells.map(function () { return 0; }),
      cell: -1,              // the cell being asked, or -1 between questions
      revealed: false,       // has the answer been shown
      scores: board.participants.map(function () { return 0; }),
      asked: 0, awarded: 0, elapsed: 0, paused: false
    };
  }

  /** The question a cell would ask next, or null when it is spent. */
  function pending(board, state, index) {
    var cell = board.cells[index];
    if (!cell) return null;
    return cell.questions[state.used[index]] || null;
  }

  function spent(board, state) {
    return board.cells.every(function (cell, i) { return state.used[i] >= cell.questions.length; });
  }

  function leaders(board, state) {
    var top = Math.max.apply(null, state.scores.concat([0]));
    return state.scores.reduce(function (out, score, i) {
      if (score === top && top > 0) out.push(i);
      return out;
    }, []);
  }

  function reached(board, state) {
    return state.scores.some(function (score) { return score >= board.target; });
  }

  function transition(board, state, action, arg) {
    var s = Object.assign({}, state, {
      used: state.used.slice(), scores: state.scores.slice()
    });
    if (action === 'restart') return create(board);
    if (action === 'start' && s.phase === 'ready') {
      s.phase = 'picking';
    } else if (action === 'pause' && (s.phase === 'picking' || s.phase === 'asking')) {
      s.paused = !s.paused;
    } else if (action === 'pick' && s.phase === 'picking' && !s.paused &&
        Number.isInteger(arg) && pending(board, s, arg)) {
      s.cell = arg;
      s.revealed = false;
      s.phase = 'asking';
      s.asked++;
    } else if (action === 'reveal' && s.phase === 'asking' && !s.paused) {
      s.revealed = true;
    } else if ((action === 'award' || action === 'noScore') && s.phase === 'asking' &&
        s.revealed && !s.paused && s.cell > -1) {
      var cell = board.cells[s.cell];
      if (action === 'award') {
        if (!Number.isInteger(arg) || arg < 0 || arg >= s.scores.length) return state;
        s.scores[arg] += cell.value;
        s.awarded++;
      }
      /* Spent either way. A cell nobody could answer is gone — that is what
         makes choosing the five hundred a decision rather than a freebie. */
      s.used[s.cell]++;
      s.cell = -1;
      s.revealed = false;
      s.phase = spent(board, s) || reached(board, s) ? 'complete' : 'picking';
    }
    return s;
  }

  function scores(board, s) {
    return board.participants.map(function (name, i) {
      return { name: name, score: s.scores[i] || 0 };
    });
  }

  function winner(board, s) {
    var top = leaders(board, s);
    if (!top.length) return 'Nobody scored.';
    var names = top.map(function (i) { return board.participants[i]; });
    if (board.participants.length === 1) {
      return s.scores[0] >= board.target
        ? 'Target reached — ' + s.scores[0] + ' points.'
        : 'The board is empty on ' + s.scores[0] + ' of ' + board.target + '.';
    }
    return names.length === 1
      ? names[0] + ' wins on ' + s.scores[top[0]] + '.'
      : 'A tie on ' + s.scores[top[0]] + ': ' + names.join(' & ');
  }

  function render(pad, slide, opts) {
    opts = opts || {};
    var b = slide.bowlBoard, s = opts.bowlState || create(b);
    var command = opts.bowlCommand;
    var el = SF.el;
    pad.replaceChildren();

    function button(text, action, cls, arg) {
      var node = el('button', 'bowl-button ' + (cls || ''), text);
      node.type = 'button'; node.disabled = !command;
      node.dataset.bowlAction = action;
      if (arg != null) node.dataset.bowlArg = String(arg);
      if (command) node.onclick = function () { command(action, arg); };
      return node;
    }

    var head = el('header', 'bowl-head');
    var identity = el('div');
    identity.appendChild(el('div', 'bowl-eyebrow', 'QUIZ BOWL / FIRST TO ' + b.target));
    identity.appendChild(el('h2', 'bowl-name', slide.title));
    head.appendChild(identity);
    var count = el('div', 'bowl-count');
    count.appendChild(el('span', null, s.phase === 'ready' ? 'READY' :
      s.phase === 'complete' ? 'FINISHED' : s.phase === 'asking' ? 'ON A CELL' : 'CHOOSE'));
    var left = b.cells.reduce(function (n, cell, i) {
      return n + Math.max(0, cell.questions.length - s.used[i]);
    }, 0);
    count.appendChild(el('strong', null, left + ' left'));
    head.appendChild(count);
    pad.appendChild(head);

    /* The question being asked replaces the grid. Two things on a projector
       competing for the room's attention is one thing too many, and the grid
       has nothing to say while a question is open. */
    if (s.phase === 'asking' && s.cell > -1) {
      var q = pending(b, s, s.cell);
      var cellNow = b.cells[s.cell];
      var ask = el('div', 'bowl-ask');
      ask.appendChild(el('div', 'bowl-eyebrow', cellNow.category.toUpperCase() + ' · ' + cellNow.value));
      var text = q ? q.question : '';
      /* Steps down rather than overflowing. A short question should be the
         biggest thing on the slide; a long one still has to fit on it. */
      var qEl = el('p', 'bowl-question', text);
      qEl.dataset.len = text.length > 150 ? 'xl' : text.length > 80 ? 'lg' : 'md';
      ask.appendChild(qEl);
      if (s.revealed) {
        var reveal = el('div', 'bowl-answer');
        reveal.appendChild(el('span', 'bowl-eyebrow', 'THE ANSWER'));
        reveal.appendChild(el('strong', null, q ? q.answer : ''));
        ask.appendChild(reveal);
      } else {
        ask.appendChild(el('p', 'bowl-hint', 'Take an answer from the room, then reveal.'));
      }
      pad.appendChild(ask);
    } else {
      var grid = el('div', 'bowl-grid');
      grid.style.gridTemplateColumns = 'repeat(' + Math.max(1, b.categories.length) + ', minmax(0, 1fr))';
      b.categories.forEach(function (name) {
        grid.appendChild(el('div', 'bowl-category', name));
      });
      b.cells.forEach(function (cell, i) {
        var waiting = Math.max(0, cell.questions.length - s.used[i]);
        if (!waiting) {
          grid.appendChild(el('div', 'bowl-cell is-spent', '·'));
          return;
        }
        var node = button(String(cell.value), 'pick', 'bowl-cell', i);
        node.classList.remove('bowl-button');
        node.classList.add('bowl-cell');
        node.disabled = !command || s.phase !== 'picking' || s.paused;
        node.setAttribute('aria-label', cell.category + ', ' + cell.value + ' points');
        if (waiting > 1) node.appendChild(el('span', 'bowl-stack', '×' + waiting));
        grid.appendChild(node);
      });
      pad.appendChild(grid);
    }

    var tally = el('div', 'bowl-tally');
    tally.classList.toggle('many', b.participants.length > 3);
    scores(b, s).forEach(function (row, i) {
      var box = el('section', 'bowl-team' +
        (s.phase === 'complete' && leaders(b, s).indexOf(i) > -1 ? ' won' : ''));
      var line = el('div', 'bowl-team-head');
      line.appendChild(el('strong', null, row.name));
      line.appendChild(el('span', 'bowl-score', String(row.score)));
      box.appendChild(line);
      /* Awarding is only offered once the answer is out, so a teacher cannot
         hand over a cell before the room has heard what it was. */
      if (command && s.phase === 'asking' && s.revealed) {
        box.appendChild(button('+ ' + b.cells[s.cell].value, 'award', 'primary', i));
      }
      tally.appendChild(box);
    });
    pad.appendChild(tally);

    var foot = el('div', 'bowl-foot');
    var status = el('div', 'bowl-status'); status.setAttribute('aria-live', 'polite');
    status.appendChild(el('strong', null, s.paused ? 'Paused.' :
      s.phase === 'ready' ? 'Pick a category and a value to begin.' :
      s.phase === 'complete' ? winner(b, s) :
      s.phase === 'asking'
        ? (s.revealed ? 'Who answered it?' : 'Read it out and take an answer.')
        : 'Choose an unused cell.'));
    status.appendChild(el('span', null, s.phase === 'complete'
      ? s.asked + ' cells opened · ' + s.awarded + ' awarded'
      : 'Correct scores the cell value · a cell is spent either way · first to ' + b.target));
    foot.appendChild(status);

    var actions = el('div', 'bowl-actions');
    if (s.phase === 'ready') actions.appendChild(button('Open the board →', 'start', 'primary'));
    if (s.phase === 'asking') {
      if (!s.revealed) actions.appendChild(button('Reveal the answer', 'reveal', 'primary'));
      else actions.appendChild(button('Nobody scored', 'noScore'));
    }
    if (s.phase === 'picking' || s.phase === 'asking') {
      actions.appendChild(button(s.paused ? 'Resume' : 'Pause', 'pause'));
    }
    if (s.phase === 'complete') actions.appendChild(button('Play this board again', 'restart', 'primary'));
    foot.appendChild(actions);
    pad.appendChild(foot);
  }

  function command(action, arg) {
    if (!active) return;
    var board = active.slide.bowlBoard;
    var before = active.player.bowlStates[active.slide.id];
    var after = transition(board, before, action, arg);
    active.player.bowlStates[active.slide.id] = after;
    /* An award, or a cell nobody could answer. Same rail as the other boards:
       credited to a team, never to a learner, and carrying the cell value so
       the report can show points rather than a count of claims. */
    if ((action === 'award' || action === 'noScore') && before.cell > -1 &&
        after.cell === -1 && SF.Bowl.onVerdict) {
      var cell = board.cells[before.cell];
      var q = pending(board, before, before.cell);
      SF.Bowl.onVerdict({
        slideId: active.slide.id, title: active.slide.title, kind: 'bowl',
        set: 1, card: before.cell,
        term: cell.category + ' ' + cell.value + ' — ' + (q ? q.question : ''),
        participant: action === 'award' && board.participants.length > 1
          ? board.participants[arg] : null,
        right: action === 'award',
        value: action === 'award' ? cell.value : 0
      });
    }
    active.paint(true);
  }

  function mount(player, slide, node) {
    unmount();
    var session = SF.Boards.createSession('bowl', {
      player: player,
      slide: slide,
      node: node,
      create: create,
      render: render,
      command: command,
      interval: 1000,
      tick: function (session, dt) {
        var s = player.bowlStates[slide.id];
        if (s.phase === 'ready' || s.phase === 'complete') return;
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

  SF.Bowl = { onVerdict: null, create: create, transition: transition,
    pending: pending, spent: spent, scores: scores, winner: winner, leaders: leaders,
    render: render, mount: mount, unmount: unmount, command: command };
}
