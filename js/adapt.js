/* SlideForge — the Adapt report.
 *
 * Turns a session report into a short list of things to do next lesson.
 *
 * Everything here is derived from what was already recorded: no new data is
 * collected to produce it. It takes the projected report and nothing else, so
 * a session from last term reads the same way as the one that just ended.
 *
 * Two rules run through the whole file, and they are what make it worth
 * reading rather than worth ignoring:
 *
 *   1. Never claim more than the evidence carries. Four answers is four
 *      answers. Every finding states its own numbers, findings below the
 *      evidence floor are marked tentative and worded as questions, and the
 *      report opens by saying how much it is standing on.
 *
 *   2. Say what to do, not what happened. "62% correct" is the report the
 *      teacher already has. This one exists to say re-teach it, or check it
 *      differently, or that they can recall it but cannot use it.
 *
 * No DOM: js/reports.js renders it, node tests it.
 */
(function (global) {
  'use strict';

  /** @type {import("../src/types.js").SlideForgeGlobal} */

  var SF = global.SF = global.SF || {};

  /* Below this many responses a check is a straw poll, not a measurement.
     Findings still appear — a teacher wants to know — but they are marked
     tentative and phrased as something to look at rather than a fact. */
  var EVIDENCE_FLOOR = 5;

  /* How much of the room has to be wrong before it is the lesson's problem
     rather than a handful of people's. */
  var WEAK = 0.6;          // below this, worth raising
  var BAD = 0.4;           // below this, act on it
  var STRONG = 0.75;       // at or above this, treat as secure

  function pct(n, of) { return of ? Math.round((n / of) * 100) : 0; }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /** Answers that were actually marked, which is the only denominator. */
  function scored(check) {
    return (check.responses || []).filter(function (r) { return r.right !== null; });
  }

  function rightCount(check) {
    return scored(check).filter(function (r) { return r.right === true; }).length;
  }

  function checkTitle(check, i) {
    return String(check.question || '').trim() || 'Check ' + (i + 1);
  }

  /* The wrong answer they agreed on, if they agreed on one. A concentrated
     wrong answer is a single misconception with a name; wrong answers spread
     evenly across the options are closer to noise, and the fix is different. */
  function sharedMistake(check) {
    if (check.input !== 'choice' || !Array.isArray(check.options)) return null;
    var wrong = scored(check).filter(function (r) { return r.right === false; });
    if (wrong.length < 2) return null;
    var counts = {};
    wrong.forEach(function (r) { counts[r.choice] = (counts[r.choice] || 0) + 1; });
    var top = Object.keys(counts).reduce(function (a, k) {
      return counts[k] > (counts[a] || 0) ? k : a;
    }, Object.keys(counts)[0]);
    /* More than half, not merely the most. Two of four wrong answers on one
       option, with the other two elsewhere, is not a room agreeing on
       anything — and naming it as "the" misconception would send the next
       lesson after a mistake most of them did not make. */
    if (counts[top] * 2 <= wrong.length) return null;
    var named = Array.isArray(check.misconceptions)
      ? String(check.misconceptions[Number(top)] || '').trim() : '';
    return { option: check.options[Number(top)], n: counts[top], of: wrong.length, named: named };
  }

  function countSure(check, sure, right) {
    return (check.responses || []).filter(function (r) {
      return r.sure === sure && r.right === right;
    }).length;
  }

  /* ------------------------------------------------------------- findings */

  /* severity decides the order and the heading it lands under; strength
     decides the wording. Kept separate on purpose: an urgent finding on thin
     evidence is still urgent and still thin. */
  function finding(severity, id, title, evidence, action, extra) {
    var f = { id: id, severity: severity, title: title, evidence: evidence, action: action };
    return Object.assign(f, extra || {});
  }

  function strengthOf(n) { return n >= EVIDENCE_FLOOR ? 'strong' : 'tentative'; }

  /**
   * At most one finding per check.
   *
   * A check that the room got wrong, and got wrong confidently, is one problem
   * and not two — listing it twice reads as twice as much wrong with the
   * lesson, and a list where everything is urgent says nothing is.
   */
  function checkFindings(report) {
    var out = [];
    (report.checks || []).forEach(function (check, i) {
      var marked = scored(check);
      var title = checkTitle(check, i);
      var where = { slideId: check.sourceSlideId || check.id, title: title };

      /* A vote-only check is unrevealed on purpose — the first half of a peer
         instruction pair, whose answer belongs to the second. Reporting it as
         a loop somebody forgot to close would train the reader to skip this
         section. */
      if (!check.revealedAt && check.voteOnly) return;

      if (!check.revealedAt) {
        out.push(finding('note', 'unrevealed:' + i,
          'Never revealed: ' + title,
          plural((check.responses || []).length, 'answer', 'answers') +
            ' came in, but the answer was never shown, so nothing is marked.',
          'The room answered this and never found out. Worth closing the loop ' +
            'even now — and it is why this check is absent from everything below.',
          { strength: 'strong', where: where }));
        return;
      }
      if (!marked.length) return;

      var right = rightCount(check);
      var rate = right / marked.length;
      var strength = strengthOf(marked.length);
      var sureWrong = countSure(check, true, false);
      var guessedRight = countSure(check, false, true);
      var mistake = sharedMistake(check);
      var evidence = [right + ' of ' + marked.length + ' correct (' + pct(right, marked.length) + '%)'];
      var action = [];
      var severity = null;
      var heading = null;

      if (rate < WEAK) {
        severity = rate < BAD ? 'act' : 'watch';
        heading = 'Re-teach: ' + title;
        if (mistake) {
          evidence.push(mistake.n + ' of the ' + mistake.of +
            ' wrong answers chose "' + mistake.option + '"' +
            (mistake.named ? ' — ' + mistake.named : ''));
          /* An author's label names the mistake the room actually made; it
             never decides that one was made. That judgement stays with the
             answers, so a label on an option nobody picked says nothing, and
             a wrong guess about what would tempt them costs no more than the
             wording of one sentence. */
          action.push(mistake.named
            ? ('The wrong answers agree, and this one has a name: ' +
              mistake.named + '. Teach against that directly rather than ' +
              'covering the topic again, which leaves it intact.')
            : ('The wrong answers agree, so this is one misconception ' +
              'with a name rather than general confusion. Teach against "' +
              mistake.option + '" directly — covering the topic again leaves it intact.'));
        } else {
          action.push('The wrong answers are spread across the options, which ' +
            'reads more like the question not landing than one shared mistake. ' +
            'Re-teach from a different angle and check again.');
        }
      }

      /* Folded into the same finding: confidently wrong changes what to do
         about a weak check rather than being a separate thing to do. */
      if (sureWrong >= 2) {
        severity = 'act';
        heading = heading || 'A confident misconception: ' + title;
        evidence.push(plural(sureWrong, 'person', 'people') + ' were wrong and sure');
        action.push('Being wrong and sure is not being stuck: they have a ' +
          'working model that produces the wrong answer, so practice confirms ' +
          'it rather than fixing it. What has to change is the explanation.');
      }

      if (right && guessedRight >= Math.ceil(right / 2) && rate >= WEAK) {
        severity = severity || 'watch';
        heading = heading || 'The score flatters this one: ' + title;
        evidence.push(guessedRight + ' of the ' + right + ' correct answers were guesses');
        action.push('It looks more secure than it is. Ask it again in a form ' +
          'guessing cannot carry — a typed answer, or a "why" — before treating ' +
          'it as known.');
      }

      if (severity) {
        out.push(finding(severity, 'check:' + i, heading,
          evidence.join(' · '), action.join(' '),
          { strength: strength, where: where, rate: rate }));
      }
    });
    return out;
  }

  /* ------------------------------------------------------------ the rest */

  function paceFindings(report) {
    /* Only the two loudest. A list of every slide anyone twitched on is not a
       finding, it is the raw data with a heading on it. */
    return (report.signals || []).filter(function (g) { return g.total >= 2; })
      .slice(0, 2).map(function (g, i) {
        var where = g.slideId ? { slideId: g.slideId, title: g.title, n: g.n } : null;
        var what = g.lost >= g.fast && g.lost >= g.slow ? 'lost the thread'
          : g.fast > g.slow ? 'asked you to slow down' : 'asked you to speed up';
        return finding(where && g.total >= 3 ? 'act' : 'watch', 'pace:' + i,
          where
            ? 'The room ' + what + ' on "' + (g.title || 'a slide') + '"'
            : 'The room ' + what + ' before the lesson started',
          plural(g.total, 'signal', 'signals') + ' — ' +
            [g.lost && g.lost + ' lost', g.fast && g.fast + ' too fast', g.slow && g.slow + ' too slow']
              .filter(Boolean).join(', '),
          !where
            ? 'Sent before the first slide went up, so it is about arriving ' +
              'rather than about the lesson — people settling, or a room that ' +
              'was already behind when it walked in.'
            : g.lost >= g.fast
              ? 'This is where to start next lesson. Not a repeat of the slide — ' +
                'the slide did not work — but a second explanation of the same idea.'
              : 'Pace, not content. The material may be fine and delivered too ' +
                'fast to follow; the same slides with a pause and a question in ' +
                'the middle may be all it needs.',
          { strength: strengthOf(g.total + 3), where: where });
      });
  }

  function feedbackFindings(report) {
    var out = [];
    (report.feedback || []).forEach(function (f, i) {
      var replies = (f.responses || []).length;
      if (!replies) return;

      if (f.kind === 'scale') {
        var points = (f.options || []).length || 5;
        var sum = 0, low = 0, high = 0;
        f.responses.forEach(function (r) {
          var v = Number(r.values[0]);
          sum += v + 1;
          if (v === 0) low++;
          if (v === points - 1) high++;
        });
        var mean = sum / replies;
        var edges = low + high;
        /* A split needs people at *both* ends. Counting the ends together
           would call a room bunched at the top a split room, which is the
           opposite of what it is. */
        var split = points > 2 && low >= 2 && high >= 2 && edges > replies - edges;
        if (mean <= (points + 1) / 2) {
          out.push(finding(mean <= points * 0.4 ? 'act' : 'watch', 'scale-low:' + i,
            'The room put itself low on "' + f.prompt + '"',
            mean.toFixed(1) + ' of ' + points + ' across ' + plural(replies, 'reply', 'replies'),
            'They told you this before you asked them to do anything with it. ' +
              'Worth taking at face value and building in the support rather ' +
              'than finding out later.',
            { strength: strengthOf(replies) }));
        } else if (split) {
          out.push(finding('watch', 'scale-split:' + i,
            'The room is split on "' + f.prompt + '"',
            edges + ' of ' + replies + ' answered at one end or the other, ' +
              'averaging ' + mean.toFixed(1) + ' of ' + points + '.',
            'An average of ' + mean.toFixed(1) + ' describes nobody here. Two ' +
              'groups need two different next lessons, so plan for both rather ' +
              'than for the middle.',
            { strength: strengthOf(replies) }));
        }
      }
    });
    return out;
  }

  function loopFindings(report) {
    var out = [];
    var s = report.summary || {};

    var unanswered = (report.questions || []).filter(function (q) {
      return q.state === 'approved' || q.state === 'pending';
    });
    if (unanswered.length) {
      out.push(finding('watch', 'qa:open',
        plural(unanswered.length, 'question', 'questions') + ' from the room went unanswered',
        unanswered.slice(0, 3).map(function (q) { return '"' + q.text + '"'; }).join(' · ') +
          (unanswered.length > 3 ? ' and ' + (unanswered.length - 3) + ' more' : ''),
        'They asked and did not get an answer. Opening next lesson with these ' +
          'costs a minute and is the clearest possible sign that asking works.',
        { strength: 'strong' }));
    }

    var waited = (report.attendance || []).filter(function (p) { return !p.admittedAt; });
    if (waited.length) {
      out.push(finding('note', 'joined:waiting',
        plural(waited.length, 'person', 'people') + ' never made it into the lesson',
        'They joined and stayed in the waiting room.',
        'The join window closes at the first question of a round and reopens at ' +
          'the next one. If people are routinely stuck outside, a round boundary ' +
          'earlier in the deck lets latecomers in.',
        { strength: 'strong' }));
    }

    var silent = (report.attendance || []).filter(function (p) {
      return p.admittedAt && p.questionsEligible >= 2 && p.questionsAnswered === 0;
    });
    if (silent.length) {
      out.push(finding('watch', 'silent',
        plural(silent.length, 'person', 'people') + ' answered nothing',
        'Admitted, eligible for ' + plural(silent[0].questionsEligible, 'check', 'checks') +
          ', and answered none of them.',
        'Could be a flat battery, could be someone who has stopped following. ' +
          'The names are in Attendance — worth a quiet word rather than a ' +
          'conclusion from this report.',
        { strength: 'strong' }));
    }

    if (s.checks && !s.revealed) {
      out.push(finding('note', 'nothing-revealed',
        'No check was revealed',
        plural(s.checks, 'check', 'checks') + ' opened, none revealed.',
        'Nothing is marked, so this report has no outcomes to work from. If the ' +
          'session ended early that explains it.',
        { strength: 'strong' }));
    }
    return out;
  }

  /* ------------------------------------------------------------- assembly */

  var RANK = { act: 0, watch: 1, note: 2 };

  /**
   * @param {object} report a projected session report (server/sessions.js)
   * @returns {object} { headline, basis, findings, thin }
   */
  function adapt(report) {
    if (!report) return null;
    /** @type {any[]} */
    var findings = [];
    findings = findings
      .concat(checkFindings(report))
      .concat(paceFindings(report))
      .concat(feedbackFindings(report))
      .concat(loopFindings(report));

    findings.sort(function (a, b) {
      return (RANK[a.severity] - RANK[b.severity]) ||
        (a.strength === b.strength ? 0 : a.strength === 'strong' ? -1 : 1);
    });

    var marked = (report.checks || []).reduce(function (n, c) { return n + scored(c).length; }, 0);
    var people = (report.attendance || []).filter(function (p) { return p.admittedAt; }).length;
    var revealed = (report.checks || []).filter(function (c) { return c.revealedAt; }).length;

    /* Stated up front rather than buried, because it is the first thing that
       should temper everything under it. A report built on nine answers from
       four people cannot carry a conclusion about a class. */
    var oral = (report.oral || []).reduce(function (n, r) { return n + r.verdicts.length; }, 0);
    var thin = marked < EVIDENCE_FLOOR || people < 3;
    var basis = {
      people: people,
      checks: revealed,
      answers: marked,
      feedback: (report.feedback || []).length,
      signals: (report.summary && report.summary.signalsRaised) || 0,
      thin: thin,
      sentence: revealed || marked
        ? 'Based on ' + plural(marked, 'marked answer', 'marked answers') + ' from ' +
          plural(people, 'person', 'people') + ' across ' +
          plural(revealed, 'revealed check', 'revealed checks') + '.' +
          (thin ? ' That is not much to stand on — read everything below as a question rather than a conclusion.' : '')
        : oral
          /* A spoken board was marked, so "nothing was marked" would be a lie.
             It just cannot be read per learner: the credit went to a team or
             to the class, which is all a spoken answer can honestly carry. */
          ? oral + (oral === 1 ? ' card was' : ' cards were') + ' marked on a board judged out loud. ' +
            'Those are credited to a team or to the class, not to a learner, so ' +
            'there is nothing here to read per person — the round itself is under ' +
            'Knowledge checks.'
          : 'Nothing was marked in this session, so there are no outcomes to read.'
    };

    var act = findings.filter(function (f) { return f.severity === 'act'; }).length;
    var watch = findings.filter(function (f) { return f.severity === 'watch'; }).length;
    var headline = !findings.length
      ? (basis.answers ? 'Nothing here needs changing.'
        : oral ? 'The marking here was spoken, not per learner.'
        : 'Not enough happened to say anything.')
      : act
        ? plural(act, 'thing', 'things') + ' to change before next lesson' +
          (watch ? ', and ' + watch + ' to keep an eye on' : '')
        : watch
          ? plural(watch, 'thing', 'things') + ' to keep an eye on'
          : 'Nothing urgent — a few notes on the lesson itself';

    return {
      headline: headline,
      basis: basis,
      findings: findings,
      thin: thin
    };
  }

  /**
   * The same report as markdown, for pasting into a lesson plan.
   *
   * One-way and deliberately plain: it is a note to yourself for next week,
   * not a document this app expects to read back.
   */
  function adaptToMarkdown(report) {
    var a = adapt(report);
    if (!a) return '';
    var out = [];
    var line = function (t) { out.push(t == null ? '' : String(t)); };

    line('# Adapt — ' + (report.title || 'Untitled session'));
    line('');
    line('_' + a.headline + '_');
    line('');
    line(a.basis.sentence);
    line('');

    var HEADS = { act: 'Change this', watch: 'Keep an eye on', note: 'Notes' };
    ['act', 'watch', 'note'].forEach(function (sev) {
      var rows = a.findings.filter(function (f) { return f.severity === sev; });
      if (!rows.length) return;
      line('## ' + HEADS[sev]);
      line('');
      rows.forEach(function (f) {
        line('### ' + f.title + (f.strength === 'tentative' ? ' *(thin evidence)*' : ''));
        line('');
        line('- **Evidence:** ' + f.evidence);
        line('- **Suggested:** ' + f.action);
        line('');
      });
    });

    line('---');
    line('');
    line('Generated by SlideForge from the session journal. Names are ' +
      'self-reported and pace signals are anonymous. Nothing here is a ' +
      'measurement of a person.');
    return out.join('\n');
  }

  SF.adapt = adapt;
  SF.adaptToMarkdown = adaptToMarkdown;
  SF.ADAPT_EVIDENCE_FLOOR = EVIDENCE_FLOOR;
})(window);
