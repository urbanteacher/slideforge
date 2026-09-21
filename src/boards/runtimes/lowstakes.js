/* SlideForge low-stakes retrieval board. Authored Q&A stays in the game; the
   worksheet clock and reveal belong to one presentation run. Learners write on
   paper — nothing here awards points or phone answers. */

/* Moved out of js/lowstakes.js and into the boards engine, where the rest of it
 * already lived: src/boards/ holds board compilation and authoring hooks,
 * src/games/ the question mechanics. This is the third layer — the board as
 * the room actually sees it, drawn and driven in the browser.
 *
 * Installed by src/model.js rather than by a page, because the engine is the
 * model's: SF.Boards is built there and resolves SF.LowStakes lazily by name.
 * The comment on createBoardRuntime said runtimes are looked up when used
 * "because browser script tags load them after the model bundle" — there are
 * no script tags now, and the lookup works either way.
 *
 * Nothing here runs at install but declarations and the SF.LowStakes assignment.
 */
export function installLowStakes(SF) {
  var active = null;

  function create(board) {
    return {
      phase: 'ready',
      remaining: Math.max(0, Number(board.timeLimit) || 0),
      paused: false,
      elapsed: 0
    };
  }

  function transition(board, state, action) {
    var s = Object.assign({}, state);
    if (action === 'restart') return create(board);
    if (action === 'start' && s.phase === 'ready') {
      s.phase = 'quiz';
      s.remaining = Math.max(0, Number(board.timeLimit) || 0);
      s.paused = false;
      s.elapsed = 0;
    } else if (action === 'pause' && s.phase === 'quiz') {
      s.paused = !s.paused;
    } else if (action === 'reveal' && (s.phase === 'quiz' || s.phase === 'ready')) {
      s.phase = 'answers';
      s.paused = false;
      s.remaining = 0;
    } else if (action === 'finish' && s.phase === 'answers') {
      s.phase = 'complete';
    } else if (action === 'expire' && s.phase === 'quiz') {
      s.phase = 'answers';
      s.paused = false;
      s.remaining = 0;
    }
    return s;
  }

  function formatClock(seconds) {
    var n = Math.max(0, Math.ceil(seconds));
    var m = Math.floor(n / 60);
    var s = n % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function render(pad, slide, opts) {
    opts = opts || {};
    var b = slide.lowstakesBoard;
    var s = opts.lowstakesState || create(b);
    var preview = !opts.lowstakesState;
    var command = opts.lowstakesCommand;
    var el = SF.el;
    pad.replaceChildren();
    ['phase-ready', 'phase-quiz', 'phase-answers', 'phase-complete', 'is-paused', 'is-preview']
      .forEach(function (c) { pad.classList.remove(c); });
    pad.classList.add('phase-' + s.phase);
    if (s.paused) pad.classList.add('is-paused');
    if (preview) pad.classList.add('is-preview');

    function button(text, action, cls) {
      var node = el('button', 'lsq-button ' + (cls || ''), text);
      node.type = 'button';
      node.disabled = !command;
      node.dataset.lowstakesAction = action;
      if (command) node.onclick = function () { command(action); };
      return node;
    }

    var head = el('header', 'lsq-header');
    var identity = el('div');
    identity.appendChild(el('div', 'lsq-eyebrow', 'LOW-STAKES QUIZ · NO NOTES — RETRIEVAL'));
    identity.appendChild(el('h2', 'lsq-title', slide.title));
    head.appendChild(identity);
    var clock = el('div', 'lsq-clock');
    var clockLabel = s.phase === 'ready' ? 'READY'
      : s.phase === 'quiz' ? (s.paused ? 'PAUSED' : 'QUIZ')
      : s.phase === 'answers' ? 'REVEAL'
      : 'DONE';
    clock.appendChild(el('span', null, clockLabel));
    clock.appendChild(el('strong', 'lsq-time',
      s.phase === 'quiz' ? formatClock(s.remaining)
        : s.phase === 'ready' ? formatClock(b.timeLimit)
          : formatClock(s.elapsed)));
    head.appendChild(clock);
    pad.appendChild(head);

    var progress = el('div', 'lsq-progress');
    ['1 · Ready', '2 · Write', '3 · Reveal'].forEach(function (label, i) {
      var current = s.phase === 'ready' ? 0 : s.phase === 'quiz' ? 1 : 2;
      progress.appendChild(el('span', i <= current ? 'on' : '', label));
    });
    progress.appendChild(el('strong', null,
      b.items.filter(function (item) { return !item.gap; }).length +
      ' ready · no scoreboard'));
    pad.appendChild(progress);

    var showAnswers = preview || s.phase === 'answers' || s.phase === 'complete';
    var readyCount = b.items.filter(function (item) { return !item.gap; }).length;
    var list = el('ol', 'lsq-list' + (showAnswers ? ' revealed' : ''));
    b.items.forEach(function (item, i) {
      var row = el('li', 'lsq-item' + (item.gap ? ' is-gap' : ''));
      row.appendChild(el('span', 'lsq-num', String(i + 1).padStart(2, '0')));
      var body = el('div', 'lsq-body');
      if (item.gap === 'question') {
        body.appendChild(el('p', 'lsq-gap', 'Needs a question'));
        body.appendChild(el('p', 'lsq-prompt', 'Fill this row in Quiz studio before you play'));
      } else if (item.gap === 'answer') {
        body.appendChild(el('p', 'lsq-question', item.question));
        body.appendChild(el('p', 'lsq-gap', 'Needs an answer for the reveal'));
      } else {
        body.appendChild(el('p', 'lsq-question', item.question));
        if (showAnswers) {
          body.appendChild(el('p', 'lsq-answer', item.answer));
        } else {
          body.appendChild(el('p', 'lsq-prompt', 'Write your answer on paper · no notes'));
        }
      }
      row.appendChild(body);
      list.appendChild(row);
    });
    if (!b.items.length) {
      var empty = el('li', 'lsq-item is-gap');
      empty.appendChild(el('span', 'lsq-num', '—'));
      var emptyBody = el('div', 'lsq-body');
      emptyBody.appendChild(el('p', 'lsq-gap', 'Needs questions'));
      emptyBody.appendChild(el('p', 'lsq-prompt', 'Add at least three question–answer pairs in Quiz studio'));
      empty.appendChild(emptyBody);
      list.appendChild(empty);
    }
    pad.appendChild(list);

    var bottom = el('div', 'lsq-bottom');
    var status = el('div', 'lsq-status');
    status.setAttribute('aria-live', 'polite');
    var caption = s.paused ? 'Paused. Resume when the room is ready.'
      : s.phase === 'ready'
        ? 'Questions stay on the board. Answers stay hidden until time is up.'
        : s.phase === 'quiz'
          ? 'Retrieval in progress — no notes, no phones scoring this round.'
          : s.phase === 'answers'
            ? 'Discuss answers together before moving on.'
            : 'Retrieval complete. Replay resets the clock.';
    status.appendChild(el('strong', null, caption));
    status.appendChild(el('span', null,
      readyCount + ' of ' + b.items.length + ' ready · ' +
      formatClock(b.timeLimit) + ' quiz · paper answers · no points'));
    bottom.appendChild(status);

    var actions = el('div', 'lsq-actions');
    if (s.phase === 'ready') {
      actions.appendChild(button('Start the quiz →', 'start', 'primary'));
      actions.appendChild(button('Reveal answers now', 'reveal'));
    }
    if (s.phase === 'quiz') {
      actions.appendChild(button(s.paused ? 'Resume' : 'Pause', 'pause'));
      actions.appendChild(button('Reveal answers →', 'reveal', 'primary'));
    }
    if (s.phase === 'answers') {
      actions.appendChild(button('Finish', 'finish', 'primary'));
      actions.appendChild(button('Play again', 'restart'));
    }
    if (s.phase === 'complete') {
      actions.appendChild(button('Play this quiz again', 'restart', 'primary'));
    }
    bottom.appendChild(actions);
    pad.appendChild(bottom);
  }

  function command(action) {
    if (!active) return;
    active.tick();
    var board = active.slide.lowstakesBoard;
    var before = active.player.lowstakesStates[active.slide.id];
    var after = transition(board, before, action);
    active.player.lowstakesStates[active.slide.id] = after;
    if (action === 'reveal' || action === 'expire') {
      if (SF.LowStakes.onReveal) {
        SF.LowStakes.onReveal({
          slideId: active.slide.id,
          title: active.slide.title,
          count: board.items.filter(function (item) { return !item.gap; }).length,
          early: action === 'reveal' && before.phase === 'quiz' && before.remaining > 0
        });
      }
    }
    active.paint(true);
  }

  function mount(player, slide, node) {
    unmount();
    var session = SF.Boards.createSession('lowstakes', {
      player: player,
      slide: slide,
      node: node,
      create: create,
      render: render,
      command: command,
      interval: 250,
      tick: function (session, dt) {
        var s = player.lowstakesStates[slide.id];
        if (s.phase === 'quiz') {
          s.remaining = Math.max(0, s.remaining - dt);
          s.elapsed += dt;
          if (!s.remaining) {
            player.lowstakesStates[slide.id] = transition(slide.lowstakesBoard, s, 'expire');
            if (SF.LowStakes.onReveal) {
              SF.LowStakes.onReveal({
                slideId: slide.id,
                title: slide.title,
                count: slide.lowstakesBoard.items.filter(function (item) {
                  return !item.gap;
                }).length,
                early: false
              });
            }
            session.paint(false);
            return;
          }
        } else {
          return;
        }
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

  SF.LowStakes = {
    create: create,
    transition: transition,
    render: render,
    mount: mount,
    unmount: unmount,
    command: command,
    formatClock: formatClock,
    onReveal: null
  };
}
