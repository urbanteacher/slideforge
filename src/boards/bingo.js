/* Bingo: board compilation and authoring hooks. UI services are injected. */
/**
 * @returns {import("../types.js").BoardEngine}
 */
export function createBingoBoard() {
  function compile(game, { makeSlide }) {
    const st = game.settings;
    const out = [];

    var card = makeSlide('content');
    card.id = game.id + ':bingo';
    card.gameId = game.id;
    card.gameTitle = game.title;
    card.title = game.title;
    card.bullets = [
      'Your teacher reads a definition. If the term is on your card, say what it means to claim the square.'
    ];
    card.notes = game.questions
      .map(function (q) {
        return q.notes || '';
      })
      .filter(Boolean)
      .join('\n\n');
    card.bingoBoard = {
      gridSize: Number(game.questions[0].gridSize) || 3,
      /* Teams only, capped at six — six 4×4 cards is already the most a
         projector can hold. On an individual game the room plays one card
         together, which is the shape a single-card class game takes. */
      participants:
        st.mode === 'teams'
          ? st.teams.slice(0, 6).map(function (t, i) {
              return String(t.name || '').trim() || 'Team ' + (i + 1);
            })
          : ['The class'],
      pool: game.questions
        .map(function (q) {
          return {
            id: q.id,
            term: String(q.term || '').trim(),
            definition: String(q.definition || '').trim()
          };
        })
        .filter(function (pair) {
          return pair.term && pair.definition;
        })
    };
    out.push(card);
    return out;
  }
  function decorateIntro(intro, game) {
    const st = game.settings;

    var gsz = Number(game.questions[0].gridSize) || 3;
    intro.subtitle =
      gsz +
      '×' +
      gsz +
      ' cards · ' +
      game.questions.length +
      ' terms in the pool' +
      (st.mode === 'teams' ? ' · a card each' : ' · one class card');

    intro.notes =
      'Call a definition, then ask the team that claims it to explain the term. A row, column or diagonal wins.';
  }
  function poolNote(size, game) {
    var need = size * size;
    var seen = {},
      n = 0;
    game.questions.forEach(function (q) {
      var key = String(q.term || '')
        .trim()
        .toLowerCase();
      if (key && !seen[key]) {
        seen[key] = 1;
        n++;
      }
    });
    if (n < need)
      return need + ' different terms needed · ' + n + ' so far · add ' + (need - n) + ' more';
    return (
      n +
      ' terms in the pool · every card is a different ' +
      size +
      '×' +
      size +
      ' deal · a row, column or diagonal wins'
    );
  }
  function authorQuestion(insp, question, context) {
    const { UI, touched, repaint, drawRail } = context;

    insp.appendChild(
      UI.field(
        'Term (on the cards)',
        UI.text(question.term || '', function (v) {
          question.term = v.slice(0, 40);
          question.question = question.term;
          touched();
          repaint();
          drawRail();
        }),
        'One square. Every term in this game goes in the pool the cards are dealt from.'
      )
    );
    insp.appendChild(
      UI.field(
        'Definition (what you read out)',
        UI.area(
          question.definition || '',
          function (v) {
            question.definition = v.slice(0, 240);
            touched();
            repaint();
          },
          3
        ),
        'Stays off the wall until you reveal it. The room hears the definition and finds the term.'
      )
    );
  }
  function authorInspector(insp, question, context) {
    const { el, game, boardSettingLink, questionOps } = context;

    var size = Number(question.gridSize) || 3;
    insp.appendChild(boardSettingLink('Card size', size + ' × ' + size));
    insp.appendChild(el('p', 'hint', poolNote(size, game)));
    insp.appendChild(
      el(
        'p',
        'hint',
        'Every team is dealt a different card from these terms, so the pool ' +
          'wants more terms than a card has squares. There is no countdown and ' +
          'no points: you call a definition, a team explains the term, and you ' +
          'mark the square. Play the game (or use presenter view) to run it.'
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
            { value: 'individual', label: 'One class card' },
            { value: 'teams', label: 'A card each' }
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
          ? 'Every team is dealt a different card from the same pool, so the same call is on some cards and not others.'
          : 'The room plays one card together. Nobody competes; the class is trying to finish a line.'
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
          'Six at most — six cards is already as much as a projector holds.'
        )
      );
    }
    body.appendChild(
      UI.field(
        'Card size',
        UI.segmented(
          [
            { value: '2', label: '2 × 2' },
            { value: '3', label: '3 × 3' },
            { value: '4', label: '4 × 4' }
          ],
          String(game.questions[0].gridSize || 3),
          function (v) {
            game.questions.forEach(function (pair) {
              pair.gridSize = Number(v);
            });
            touched();
            draw2();
            drawPreview();
            drawRail();
          }
        ),
        poolNote(Number(game.questions[0].gridSize) || 3, game)
      )
    );
    body.appendChild(
      el(
        'p',
        'hint',
        'No timer and no points: a row, column or diagonal wins. Each term ' +
          'is called once, so a square nobody could explain is gone. Claims are ' +
          'recorded in the session report as a spoken round, credited to the ' +
          'team — not to a learner, because a spoken answer has no name on it.'
      )
    );
    return;
  }
  return {
    focusPrimary: '.bingo-verdicts button:not(:disabled)',
    focusFallback: '.bingo-actions button:not(:disabled)',
    key: 'bingo',
    runtime: 'Bingo',
    field: 'bingoBoard',
    states: 'bingoStates',
    state: 'bingoState',
    command: 'bingoCommand',
    className: 'bingo-board-slide',
    setSize: Infinity,
    showsQuestion: false,
    compile,
    decorateIntro,
    authorQuestion,
    authorInspector,
    authorSettings
  };
}
