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
    } else if (s.type === 'journey' || s.type === 'keywords' || s.type === 'mindmap') {
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

/**
 * One-way starter import: headings and lists become ordinary slides.
 * Not a round-trip of practice notes, and not Slidev-as-source-of-truth —
 * games, tables, charts and live activities stay out on purpose.
 *
 * @param {string} text
 * @returns {{ title: string, slides: Array<{ type: string, title?: string, subtitle?: string, body?: string, bullets?: string[], image?: string }> }}
 */
export function parseMarkdownDeck(text) {
  var raw = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  var lines = raw.split('\n');
  var i = 0;

  /* Optional YAML front matter — title: only, ignore the rest. */
  var frontTitle = '';
  if (lines[0] === '---') {
    i = 1;
    while (i < lines.length && lines[i] !== '---') {
      var fm = lines[i].match(/^\s*title\s*:\s*(.+?)\s*$/i);
      if (fm) frontTitle = fm[1].replace(/^["']|["']$/g, '').trim();
      i++;
    }
    if (i < lines.length && lines[i] === '---') i++;
  }

  function stripExportNum(t) {
    return String(t || '').replace(/^\d+\.\s+/, '').trim();
  }

  function isSkipLine(t) {
    var s = t.trim();
    if (!s) return true;
    if (/^_Practice notes from SlideForge/i.test(s)) return true;
    if (/^_Exported for Canvas/i.test(s)) return true;
    if (/^<details/i.test(s) || /^<\/details>/i.test(s) || /^<summary/i.test(s)) return true;
    if (/^###\s+In-class activity/i.test(s)) return true;
    return false;
  }

  /** @type {Array<{ type: string, title?: string, subtitle?: string, body?: string, bullets?: string[], image?: string }>} */
  var slides = [];
  var deckTitle = frontTitle;
  /** @type {{ type: string, title: string, subtitle: string, body: string, bullets: string[], image: string } | null} */
  var cur = null;

  function flush() {
    if (!cur) return;
    var title = stripExportNum(cur.title) || 'Slide';
    var bullets = cur.bullets.filter(function (b) { return String(b).trim(); });
    var paras = cur.body.split(/\n\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
    var image = cur.image || '';
    var quoteOnly = paras.length === 1 && /^>\s?/.test(paras[0]) && !bullets.length;
    var allQuotes = paras.length && paras.every(function (p) { return /^>\s?/.test(p); }) && !bullets.length;

    if ((/^quote$/i.test(title) || quoteOnly || allQuotes) && (paras.length || cur.body)) {
      var qBody = paras.map(function (p) { return p.replace(/^>\s?/, '').trim(); }).join(' ');
      var attr = '';
      if (/^[—–\-]\s*/.test(cur.subtitle)) attr = cur.subtitle.replace(/^[—–\-]\s*/, '');
      slides.push({ type: 'quote', title: '', body: qBody || title, subtitle: attr });
    } else if (image && !bullets.length && paras.length <= 1) {
      slides.push({ type: 'image', title: title === 'Image' ? '' : title, image: image,
        subtitle: paras[0] || '' });
    } else if (bullets.length && bullets.every(function (b) { return /^\d+\.\s+/.test(b); })) {
      slides.push({
        type: 'cards', title: title,
        bullets: bullets.map(function (b) { return b.replace(/^\d+\.\s+/, '').trim(); })
      });
    } else if (bullets.length && bullets.every(function (b) {
      return /\*\*[^*]+\*\*\s*[—–\-:]/.test(b) || /\*[^*]+\*\s*[—–\-:]/.test(b);
    })) {
      slides.push({
        type: 'keywords', title: title,
        bullets: bullets.map(function (b) {
          var m = b.match(/^\*\*?([^*]+)\*\*?\s*[—–\-:]\s*(.*)$/);
          return m ? (m[1].trim() + '\t' + m[2].trim()) : b;
        })
      });
    } else if (bullets.length && bullets.every(function (b) {
      return /\[[^\]]+\]\([^)]+\)/.test(b);
    })) {
      slides.push({
        type: 'links', title: title,
        bullets: bullets.map(function (b) {
          var m = b.match(/\[([^\]]+)\]\(([^)]+)\)/);
          return m ? (m[1].trim() + '\t' + m[2].trim()) : b;
        })
      });
    } else if (!bullets.length && !image && paras.length <= 1) {
      var kind = slides.length === 0 ? 'title' : 'section';
      slides.push({ type: kind, title: title, subtitle: paras[0] || cur.subtitle || '' });
    } else {
      slides.push({
        type: 'content', title: title,
        bullets: bullets.length ? bullets.map(function (b) {
          return b.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '').trim();
        }) : [],
        body: bullets.length ? '' : paras.join('\n\n'),
        image: image
      });
    }
    cur = null;
  }

  function startSlide(title) {
    flush();
    cur = { type: 'content', title: title, subtitle: '', body: '', bullets: [], image: '' };
    return /** @type {{ type: string, title: string, subtitle: string, body: string, bullets: string[], image: string }} */ (cur);
  }

  for (; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();

    if (/^---+$/.test(trimmed)) {
      if (cur) flush();
      continue;
    }
    if (isSkipLine(line) && !cur) continue;

    var h1 = line.match(/^#\s+(.+)$/);
    if (h1 && !cur && !deckTitle) {
      deckTitle = h1[1].trim();
      continue;
    }
    if (h1 && !cur && deckTitle) {
      startSlide(h1[1].trim());
      continue;
    }

    var h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      startSlide(h2[1].trim());
      continue;
    }

    /** @type {{ type: string, title: string, subtitle: string, body: string, bullets: string[], image: string }} */
    var s;
    if (cur) {
      s = cur;
    } else {
      if (!trimmed || isSkipLine(line)) continue;
      s = startSlide(deckTitle || 'Slide');
    }

    if (/^###\s+/.test(line)) continue;

    var img = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    if (img) {
      if (!s.image) s.image = img[2];
      continue;
    }

    var attr = trimmed.match(/^[—–]\s+(.+)$/);
    if (attr && (s.body || s.bullets.length)) {
      s.subtitle = '— ' + attr[1].trim();
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      s.body = (s.body ? s.body + '\n\n' : '') + trimmed;
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      s.bullets.push(trimmed);
      continue;
    }

    if (!trimmed) {
      if (s.body && !/\n\n$/.test(s.body)) s.body += '\n\n';
      continue;
    }

    if (isSkipLine(line)) continue;

    if (!s.bullets.length && !s.body && !s.subtitle &&
        s.title && trimmed.length < 120) {
      /* First prose under a heading is often the subtitle on title/section. */
      s.subtitle = trimmed;
      continue;
    }
    s.body = (s.body ? s.body.replace(/\n\n$/, '\n') + (s.body ? '\n' : '') : '') + trimmed;
  }
  flush();

  if (!deckTitle) deckTitle = (slides[0] && slides[0].title) || 'Imported from Markdown';
  return { title: deckTitle, slides: slides };
}

