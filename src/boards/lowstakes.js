/* LowStakes: board compilation and authoring hooks. UI services are injected. */
/**
 * @returns {import("../types.js").BoardEngine}
 */
export function createLowstakesBoard({ clampLowstakesSeconds }) {
  function compile(game, { makeSlide }) {
    const st = game.settings;
    const out = [];

    var sheet = makeSlide('content');
    sheet.id = game.id + ':lowstakes';
    sheet.gameId = game.id;
    sheet.gameTitle = game.title;
    sheet.title = game.title;
    sheet.bullets = ['Write your answers on paper. No notes — this is retrieval practice.'];
    sheet.notes = game.questions
      .map(function (q) {
        return q.notes || '';
      })
      .filter(Boolean)
      .join('\n\n');
    sheet.lowstakesBoard = {
      kind: 'lowstakes',
      timeLimit: clampLowstakesSeconds(st.defaultTime),
      items: game.questions.map(function (q) {
        var question = String(q.question || '').trim();
        var answer = String(q.answer || '').trim();
        return {
          id: q.id,
          question: question,
          answer: answer,
          gap: !question ? 'question' : !answer ? 'answer' : null
        };
      })
    };
    out.push(sheet);
    return out;
  }
  function decorateIntro(intro, game) {
    const st = game.settings;

    intro.subtitle =
      game.questions.length +
      ' questions · write on paper · ' +
      clampLowstakesSeconds(st.defaultTime) +
      's then reveal';

    intro.notes =
      'Start the quiz when ready. Learners write answers on paper. When time is up (or you reveal early), discuss the answers together.';
  }

  function authorQuestion(insp, question, context) {
    const { UI, touched, repaint } = context;

    insp.appendChild(
      UI.field(
        'Question',
        UI.area(
          question.question || '',
          function (v) {
            question.question = v.slice(0, 280);
            touched();
            repaint();
          },
          3
        )
      )
    );
    insp.appendChild(
      UI.field(
        'Answer (revealed after the quiz)',
        UI.area(
          question.answer || '',
          function (v) {
            question.answer = v.slice(0, 280);
            touched();
            repaint();
          },
          3
        ),
        'Hidden on the board while the class writes. Shown when time is up or you reveal early.'
      )
    );
  }
  function authorInspector(insp, question, context) {
    const { el, questionOps } = context;

    insp.appendChild(
      el(
        'p',
        'hint',
        'The whole set is one worksheet (3–10 pairs). Learners write on paper ' +
          'during the quiz clock — no notes, this is retrieval. Answers appear ' +
          'together for discussion. Incomplete rows stay on the board as gaps. ' +
          'No phone scoring and no points. Set the quiz length under Game settings.'
      )
    );
    insp.appendChild(questionOps());
    return;
  }
  function authorSettings(body, context) {
    const { UI, el, touched, drawRail, drawPreview, st, draw2 } = context;

    if ([120, 180, 240].indexOf(Number(st.defaultTime)) < 0) st.defaultTime = 180;
    body.appendChild(
      UI.field(
        'Quiz time limit',
        UI.segmented(
          [
            { value: '120', label: '2m' },
            { value: '180', label: '3m' },
            { value: '240', label: '4m' }
          ],
          String(st.defaultTime),
          function (v) {
            st.defaultTime = Number(v);
            touched();
            draw2();
            drawPreview();
            drawRail();
          }
        ),
        'Whole-quiz countdown. When it ends, answers are revealed for discussion.'
      )
    );
    body.appendChild(
      el(
        'p',
        'hint',
        'Use 3–10 question–answer pairs. No scoreboard and no phone answers. ' +
          'The class writes on paper (no notes), then you reveal and discuss. ' +
          'A reveal leaves a session-report trace — not phone scores.'
      )
    );
    return;
  }
  return {
    clock: {
      selector: '.lsq-time',
      text: (state, engine) =>
        engine.formatClock(state.phase === 'quiz' ? state.remaining : state.elapsed || 0)
    },
    focusPrimary: '.lsq-actions button:not(:disabled)',
    focusFallback: '.lsq-actions button:not(:disabled)',
    reportEvent: 'onReveal',
    reportValue: (value) => ({
      slideId: value.slideId,
      title: value.title,
      kind: 'lowstakes',
      set: 1,
      card: 0,
      term: (value.count || 0) + ' questions' + (value.early ? ' · early reveal' : ' · time up'),
      participant: 'The class',
      right: true,
      value: 0
    }),
    key: 'lowstakes',
    runtime: 'LowStakes',
    field: 'lowstakesBoard',
    states: 'lowstakesStates',
    state: 'lowstakesState',
    command: 'lowstakesCommand',
    className: 'lowstakes-board-slide',
    setSize: Infinity,
    showsQuestion: false,
    compile,
    decorateIntro,
    authorQuestion,
    authorInspector,
    authorSettings
  };
}
