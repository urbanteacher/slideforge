/* Memory: board compilation and authoring hooks. UI services are injected. */
/**
 * @returns {import("../types.js").BoardEngine}
 */
export function createMemoryBoard() {
  function compile(game, { makeSlide }) {
    const st = game.settings;
    const out = [];

    for (var first = 0; first < game.questions.length; first += 8) {
      var pairs = game.questions.slice(first, first + 8);
      var board = makeSlide('content');
      board.id = game.id + ':memory:' + pairs[0].id;
      board.gameId = game.id;
      board.gameTitle = game.title;
      board.title = game.title;
      board.bullets = [
        'Look at the shared board. Explain your answer aloud; your teacher checks each claim.'
      ];
      board.notes = pairs
        .map(function (q) {
          return q.notes || '';
        })
        .filter(Boolean)
        .join('\n\n');
      board.memoryBoard = {
        kind: game.style,
        set: Math.floor(first / 8) + 1,
        sets: Math.ceil(game.questions.length / 8),
        studySeconds: Math.max(0, Math.min(60, Number(pairs[0].studySeconds) || 0)),
        participants:
          game.style === 'memoryflip' || st.mode !== 'teams'
            ? ['Class']
            : st.teams.map(function (t, i) {
                return String(t.name || '').trim() || 'Team ' + (i + 1);
              }),
        pairs: pairs.map(function (q) {
          return { id: q.id, term: q.term || q.question || '', definition: q.definition || '' };
        })
      };
      out.push(board);
    }
    return out; // The board owns its completion and collection scores.
  }
  function decorateIntro(intro, game) {
    const st = game.settings;

    intro.subtitle =
      game.style === 'knowledgeflip'
        ? game.questions.length + ' keywords · explain aloud · no study timer'
        : game.questions.length + ' cards · explain aloud · teacher checks';

    intro.notes =
      game.style === 'knowledgeflip'
        ? 'Open the board when ready. Keywords stay visible — choose, explain, reveal, claim.'
        : 'Start the board when the room is ready. Learners recall aloud; the teacher checks each claim.';
  }

  function authorQuestion(insp, question, context) {
    const { UI, game, touched, repaint } = context;
    if (game.style === 'knowledgeflip') {
      insp.appendChild(
        UI.field(
          'Keyword',
          UI.text(question.term || '', function (v) {
            question.term = v.slice(0, 80);
            question.question = question.term;
            touched();
            repaint();
          })
        )
      );
      insp.appendChild(
        UI.field(
          'Definition (host only)',
          UI.area(
            question.definition || '',
            function (v) {
              question.definition = v.slice(0, 240);
              touched();
              repaint();
            },
            3
          ),
          'Stays off the board until you reveal it in the check panel. Learners explain from the keyword alone.'
        )
      );
    } else {
      insp.appendChild(
        UI.field(
          'Term',
          UI.text(question.term || '', function (v) {
            question.term = v.slice(0, 80);
            question.question = question.term;
            touched();
            repaint();
          })
        )
      );
      insp.appendChild(
        UI.field(
          'Definition',
          UI.area(
            question.definition || '',
            function (v) {
              question.definition = v.slice(0, 240);
              touched();
              repaint();
            },
            3
          )
        )
      );
    }
  }
  function authorInspector(insp, question, context) {
    const { el, game, boardSettingLink, questionOps } = context;

    var boardHint =
      game.style === 'knowledgeflip'
        ? 'Keywords stay visible — there is no study timer. Learners choose a card, explain aloud, then you reveal and claim (+1). Edit each keyword in the rail; the preview shows the shared board.'
        : game.style === 'memoryflip'
          ? 'Pairs become a shared board in sets of up to eight. Study, then recall. One class collection — teacher checks each claim.'
          : 'Pairs become a shared board in sets of up to eight. Study, then recall with rotating turns. Play the game (or use presenter view) to run the board.';
    if (game.style !== 'knowledgeflip') {
      var study = Number(game.questions[0].studySeconds) || 0;
      insp.appendChild(
        boardSettingLink('Study time', study ? study + ' seconds' : 'no study phase')
      );
    }
    insp.appendChild(el('p', 'hint', boardHint));
    insp.appendChild(questionOps());
    return;
  }
  function authorSettings(body, context) {
    const { UI, el, game, touched, drawRail, drawPreview, st, draw2 } = context;

    var classOnly = game.style === 'memoryflip';
    body.appendChild(
      UI.field(
        'Play together',
        UI.segmented(
          [
            { value: 'individual', label: 'Whole class' },
            { value: 'teams', label: 'Rotating teams' }
          ],
          classOnly ? 'individual' : st.mode,
          function (v) {
            st.mode = classOnly ? 'individual' : v;
            touched();
            draw2();
            drawPreview();
          }
        ),
        classOnly
          ? 'Memory Flip uses one shared class collection.'
          : game.style === 'knowledgeflip'
            ? 'Keywords stay on the board. One card per turn — whole class or rotating teams after a claim or pass.'
            : 'One card per turn. Teams rotate after a claim or pass.'
      )
    );
    if (st.mode === 'teams' && !classOnly) {
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
          )
        )
      );
    }
    if (game.style !== 'knowledgeflip') {
      body.appendChild(
        UI.field(
          'Study time for the whole board (seconds)',
          UI.num(
            game.questions[0].studySeconds,
            function (v) {
              game.questions.forEach(function (pair) {
                pair.studySeconds = Math.max(0, Math.min(60, v == null ? 10 : v));
              });
              touched();
              draw2();
              drawPreview();
              drawRail();
            },
            0,
            60
          ),
          'The whole set is visible during study, then the cards hide. Recall is untimed; 0 skips study.'
        )
      );
    }
    body.appendChild(
      el(
        'p',
        'hint',
        game.style === 'knowledgeflip'
          ? 'No study phase. Open the board → choose a keyword → explain → reveal → claim. Collection scores stay on this board; they do not feed the live quiz leaderboard.'
          : 'Each accepted claim collects one card. The board shows collection scores and recognises ties. Learners answer aloud; the teacher controls the board or uses presenter view. These collection scores are local to this playthrough and do not change the live quiz leaderboard.'
      )
    );
    return;
  }
  return {
    clock: {
      selector: '.mem-time',
      text: (state) =>
        state.phase === 'study'
          ? Math.ceil(state.remaining) + 's'
          : Math.floor(state.elapsed / 60) +
            ':' +
            String(Math.floor(state.elapsed % 60)).padStart(2, '0')
    },
    focusPrimary: '.mem-check button:not(:disabled)',
    focusFallback: '.mem-card:not(:disabled), .mem-actions button:not(:disabled)',
    key: 'memory',
    runtime: 'Memory',
    field: 'memoryBoard',
    states: 'memoryStates',
    state: 'memoryState',
    command: 'memoryCommand',
    className: 'memory-board-slide',
    setSize: 8,
    showsQuestion: false,
    compile,
    decorateIntro,
    authorQuestion,
    authorInspector,
    authorSettings
  };
}
