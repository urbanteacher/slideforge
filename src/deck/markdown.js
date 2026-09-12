/* Render an already-normalized deck. Game lookup is supplied by the caller. */
import { parseKeywordLine, safeHref } from "./content.js";
import { slideFeedback, FEEDBACK_KINDS } from "./feedback.js";
import { GAME_STYLES } from "../games/registry.js";

export function renderMarkdown(deck, lookupGame = /** @type {(id: string) => any} */ ((_id) => null)) {
  var letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  var out = [];
  function line(s) { out.push(s == null ? '' : String(s)); }
  function blank() { if (out.length && out[out.length - 1] !== '') line(''); }

  line('# ' + (deck.title || 'Untitled lesson'));
  line('');
  line('_Practice notes from SlideForge. Live polls, games and scoring stay in the classroom room._');
  line('');

  (deck.slides || []).forEach(function (s, idx) {
    var n = idx + 1;
    blank();

    if (s.type === 'game') {
      var g = s.gameId ? lookupGame(s.gameId) : null;
      line('## ' + n + '. Knowledge check' + (g || s.gameTitle ? ': ' + (g ? g.title : s.gameTitle) : ''));
      line('');
      if (!g) {
        line('*Game not found in this browser — open the lesson in SlideForge to review the questions.*');
        return;
      }
      line('*' + (GAME_STYLES[g.style] ? GAME_STYLES[g.style].label : g.style) + '*');
      line('');
      (g.questions || []).forEach(function (q, qi) {
        line('### Q' + (qi + 1) + '. ' + (q.question || 'Question'));
        line('');
        if (g.style === 'truefalse') {
          line('- True');
          line('- False');
        } else if (Array.isArray(q.options) && q.options.length) {
          q.options.forEach(function (opt, oi) {
            var mark = (q.correct === oi) ? ' *(answer)*' : '';
            line('- ' + (letters[oi] || String(oi + 1)) + '. ' + opt + mark);
          });
        } else if (q.answer) {
          line('Answer key: `' + q.answer + '`');
        }
        if (q.explanation) {
          line('');
          line('> ' + String(q.explanation).replace(/\n+/g, ' '));
        }
        line('');
      });
      return;
    }

    if (s.type === 'title') {
      line('## ' + n + '. ' + (s.title || 'Title').replace(/\n/g, ' '));
      if (s.subtitle) { line(''); line(s.subtitle); }
    } else if (s.type === 'section') {
      line('## ' + n + '. ' + (s.title || 'Section').replace(/\n/g, ' '));
      if (s.subtitle) { line(''); line(s.subtitle); }
    } else if (s.type === 'quote') {
      line('## ' + n + '. Quote');
      line('');
      line('> ' + String(s.body || '').replace(/\n/g, ' '));
      if (s.subtitle) { line(''); line('— ' + s.subtitle); }
    } else if (s.type === 'image') {
      line('## ' + n + '. ' + (s.title || 'Image').replace(/\n/g, ' '));
      line('');
      line(s.image && String(s.image).indexOf('data:') === 0
        ? '*Embedded image (open in SlideForge to view).*'
        : (s.image ? '![](' + s.image + ')' : '*No image set.*'));
    } else if (s.type === 'cards') {
      line('## ' + n + '. ' + (s.title || 'Cards').replace(/\n/g, ' '));
      line('');
      (s.bullets || []).filter(function (b) { return String(b).trim(); }).forEach(function (b, i) {
        line((i + 1) + '. ' + String(b).replace(/^(\s{2,}|\t|- )+/, '').trim());
      });
    } else if (s.type === 'keywords') {
      line('## ' + n + '. ' + (s.title || 'Keywords').replace(/\n/g, ' '));
      line('');
      (s.bullets || []).map(parseKeywordLine).filter(function (p) { return p.term || p.def; })
        .forEach(function (p) {
          line('- **' + p.term + '** — ' + (p.def || ''));
        });
    } else if (s.type === 'italics') {
      line('## ' + n + '. ' + (s.title || 'Italics').replace(/\n/g, ' '));
      line('');
      (s.bullets || []).map(parseKeywordLine).filter(function (p) { return p.term || p.def; })
        .forEach(function (p) {
          line('- *' + p.term + '* — ' + (p.def || ''));
        });
    } else if (s.type === 'links') {
      line('## ' + n + '. ' + (s.title || 'Links').replace(/\n/g, ' '));
      line('');
      (s.bullets || []).map(parseKeywordLine).filter(function (p) { return p.term || p.def; })
        .forEach(function (p) {
          var href = safeHref(p.def);
          if (href) line('- [' + (p.term || href) + '](' + href + ')');
          else line('- ' + (p.term || 'Link') + (p.def ? ' — ' + p.def : ''));
        });
    } else if (s.type === 'split') {
      line('## ' + n + '. ' + (s.title || 'Dual coding').replace(/\n/g, ' '));
      line('');
      (s.bullets || []).filter(function (b) { return String(b).trim(); }).forEach(function (b) {
        var tier = /^(\s{2,}|\t|- )/.test(b);
        var text = String(b).replace(/^(\s{2,}|\t|- )+/, '').trim();
        line((tier ? '  - ' : '- ') + text);
      });
      line('');
      line(s.image && String(s.image).indexOf('data:') === 0
        ? '*Accompanying image (open in SlideForge to view).*'
        : (s.image ? '![](' + s.image + ')' : '*Add an accompanying image for dual coding.*'));
    } else {
      line('## ' + n + '. ' + (s.title || 'Slide').replace(/\n/g, ' '));
      line('');
      (s.bullets || []).filter(function (b) { return String(b).trim(); }).forEach(function (b) {
        var tier = /^(\s{2,}|\t|- )/.test(b);
        var text = String(b).replace(/^(\s{2,}|\t|- )+/, '').trim();
        line((tier ? '  - ' : '- ') + text);
      });
    }

    var fb = slideFeedback(s);
    if (fb) {
      blank();
      line('### In-class activity · ' + (FEEDBACK_KINDS[fb.kind] ? FEEDBACK_KINDS[fb.kind].label : fb.kind));
      line('');
      line('**Prompt:** ' + (fb.prompt || ''));
      if (fb.kind === 'poll' && fb.options && fb.options.length) {
        line('');
        fb.options.forEach(function (o) { line('- [ ] ' + o); });
      } else {
        line('');
        line('*Respond in the live room (or jot a note here for practice).*');
      }
    }

    if (s.notes) {
      blank();
      line('<details><summary>Speaker notes</summary>');
      line('');
      line(s.notes);
      line('');
      line('</details>');
    }
  });

  blank();
  line('---');
  line('');
  line('_Exported for Canvas / Colab practice. Re-open the `.sfdeck.json` in SlideForge to host live._');
  return out.join('\n');
}

