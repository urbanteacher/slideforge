/* Bowl: board compilation and authoring hooks. UI services are injected. */
/**
 * @returns {import("../types.js").BoardEngine}
 */
export function createBowlBoard({ bowlGrid }) {
  function target(game) {
    return Number(game.settings && game.settings.bowlTarget) || 1000;
  }

  function compile(game, { makeSlide }) {
    const st = game.settings;
    const out = [];

    var grid = bowlGrid(game.questions);
    var bowl = makeSlide('content');
    bowl.id = game.id + ':bowl';
    bowl.gameId = game.id;
    bowl.gameTitle = game.title;
    bowl.title = game.title;
    bowl.bullets = [
      'Choose a category and a value. Answer aloud — your teacher checks it and awards the cell.'
    ];
    bowl.notes = game.questions
      .map(function (q) {
        return q.notes || '';
      })
      .filter(Boolean)
      .join('\n\n');
    bowl.bowlBoard = {
      categories: grid.categories,
      values: grid.values,
      cells: grid.cells,
      target: target(game),
      participants:
        st.mode === 'teams'
          ? st.teams.slice(0, 6).map(function (t, i) {
              return String(t.name || '').trim() || 'Team ' + (i + 1);
            })
          : ['The class']
    };
    out.push(bowl);
    return out;
  }
  function decorateIntro(intro, game) {
    const st = game.settings;

    var bg = bowlGrid(game.questions);
    intro.subtitle =
      bg.categories.length +
      (bg.categories.length === 1 ? ' category · ' : ' categories · ') +
      game.questions.length +
      ' cells · first to ' +
      target(game);

    intro.notes =
      'Pick an unused cell, hear the answer, then reveal and award it. The board ends when it empties or a team reaches the target.';
  }
  function bowlNote(game, SF) {
    var grid = SF.bowlGrid(game.questions);
    var total = game.questions.reduce(function (n, q) {
      return n + (q.pointValue || 0);
    }, 0);
    var targetScore = target(game);
    var shape =
      grid.categories.length +
      (grid.categories.length === 1 ? ' category · ' : ' categories · ') +
      game.questions.length +
      (game.questions.length === 1 ? ' cell · ' : ' cells · ') +
      total +
      ' points on the board';
    if (total < targetScore) {
      return shape + ' — less than the ' + targetScore + ' target, so the board will empty first';
    }
    return shape + ' · the board ends when someone reaches ' + targetScore;
  }
  function authorQuestion(insp, question, context) {
    const { UI, touched, drawRail } = context;

    insp.appendChild(
      UI.field(
        'Category',
        UI.text(question.category || '', function (v) {
          question.category = v.slice(0, 40);
          touched();
          drawRail();
        })
      )
    );
    insp.appendChild(
      UI.field(
        'Point value',
        UI.select(
          [100, 200, 300, 400, 500].map(function (n) {
            return { value: String(n), label: String(n) };
          }),
          String(question.pointValue || 200),
          function (v) {
            question.pointValue = Number(v);
            touched();
            drawRail();
          }
        )
      )
    );
    insp.appendChild(
      UI.field(
        'Answer (host only)',
        UI.text(question.answer || '', function (v) {
          question.answer = v.slice(0, 120);
          touched();
        }),
        'Off the wall until you reveal it. Then award the cell to a team.'
      )
    );
  }
  function authorInspector(insp, question, context) {
    const { SF, el, game, boardSettingLink, questionOps } = context;

    /* Unlike the pair boards, a bowl cell asks a real question — so the
         Question field above stays. What goes is the quiz half below it: no
         countdown, no per-question points beyond the cell's own value, and
         nothing for a phone to vote on. */
    insp.appendChild(
      boardSettingLink('Target score', String(target(game)))
    );
    insp.appendChild(el('p', 'hint', bowlNote(game, SF)));
    insp.appendChild(
      el(
        'p',
        'hint',
        'This question is one cell. Questions sharing a category and a value ' +
          'stack in the same cell and are asked one at a time. The answer is ' +
          'for you — it goes up only when you reveal it, and then you award the ' +
          'cell to whoever answered.'
      )
    );
    insp.appendChild(questionOps());
    return;
  }
  function authorSettings(body, context) {
    const { SF, UI, el, game, touched, drawRail, drawPreview, st, draw2 } = context;

    body.appendChild(
      UI.field(
        'Play as',
        UI.segmented(
          [
            { value: 'individual', label: 'One class score' },
            { value: 'teams', label: 'Teams compete' }
          ],
          st.mode,
          function (v) {
            st.mode = v;
            if (v === 'teams' && st.teams.length < 2) {
              st.teams = SF.makeGame().settings.teams.slice(0, 2);
            }
            touched();
            draw2();
            drawPreview();
          }
        ),
        st.mode === 'teams'
          ? 'Teams choose cells and you award each one to whoever answered it.'
          : 'The room plays one score against the target rather than each other.'
      )
    );
    if (st.mode === 'teams') {
      body.appendChild(
        UI.field(
          'Team names — one per line',
          UI.area(
            st.teams
              .map(function (t) {
                return t.name;
              })
              .join('\n'),
            function (v) {
              var names = v
                .split('\n')
                .map(function (n) {
                  return n.trim().slice(0, 20);
                })
                .filter(Boolean)
                .slice(0, 6);
              st.teams = names.length
                ? names.map(function (name) {
                    return { name: name };
                  })
                : [{ name: 'Class' }];
              touched();
              drawPreview();
            },
            4
          ),
          'Six at most — six scores is as much as the board carries.'
        )
      );
    }
    body.appendChild(
      UI.field(
        'Target score',
        UI.segmented(
          (SF.BOWL_TARGETS || [500, 1000, 1500, 2000]).map(function (n) {
            return { value: String(n), label: String(n) };
          }),
          String(target(game)),
          function (v) {
            st.bowlTarget = Number(v);
            touched();
            draw2();
            drawPreview();
            drawRail();
          }
        ),
        bowlNote(game, SF)
      )
    );
    body.appendChild(
      el(
        'p',
        'hint',
        'Cells are worth what they say and are spent whether or not anyone ' +
          'answers them, which is what makes reaching for the five hundred a ' +
          'decision. The board ends when it empties or someone reaches the ' +
          'target; ties are named. Awards are recorded in the session report ' +
          'as a spoken round, credited to the team.'
      )
    );
    return;
  }
  return {
    focusPrimary: '.bowl-team button:not(:disabled)',
    focusFallback: '.bowl-actions button:not(:disabled), .bowl-cell:not(:disabled)',
    key: 'bowl',
    runtime: 'Bowl',
    field: 'bowlBoard',
    states: 'bowlStates',
    state: 'bowlState',
    command: 'bowlCommand',
    className: 'bowl-board-slide',
    setSize: Infinity,
    showsQuestion: true,
    compile,
    decorateIntro,
    authorQuestion,
    authorInspector,
    authorSettings
  };
}
