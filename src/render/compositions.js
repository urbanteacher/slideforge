/* Shared composition rendering, bundled through the existing model entry point.
 * DOM helpers and standard text layouts are injected by the browser renderer,
 * keeping rich formatting, reveal steps and word motion on the same path. */
export function createCompositionRenderer(SF, helpers) {
  const {el, rich, asStep, layoutQuote, layoutStatement, appendSlideDate} = helpers;
  const LETTERS = ['A','B','C','D','E','F'];
  /* Structured compositions use ordinary slide fields, so editing, polls,
     presenter notes and progressive reveals retain the normal data model. */
  function layoutComposition(deck, slide, pad, root) {
    var choice = SF.slideComposition(deck, slide);
    if (!choice || !SF.COMPOSITIONS[choice].structured) return false;
    root.classList.add('composition-structured', 'cp', 'cp-' + slide.type);
    var header = el('div', 'cp-header');
    /* compare and spectrum spend the subtitle on their column and lane
       headings; the poster cover sets it above the headline as an eyebrow,
       where it reads as a label for the question rather than as chrome. Each
       field is rendered once, so the editable node is never duplicated. */
    /* The beat sits with the words it introduces wherever there is a single
       block of words to introduce — cover, scenario, discussion. compare and
       spectrum spend the subtitle on their column and lane headings instead,
       and the list layouts keep it in the header where it labels the whole
       slide rather than one sentence. */
    var beatAsEyebrow = ['title','quote','statement','keyfact'].includes(slide.type);
    var beatAsClosing = slide.type === 'journey';
    var beatInHeader = slide.subtitle && !beatAsEyebrow && !beatAsClosing && !['compare','spectrum'].includes(slide.type);
    if (beatInHeader) header.appendChild(rich('div','cp-beat',slide,'subtitle',slide.subtitle));
    pad.appendChild(header);
    var body = el('div', 'cp-body'); pad.appendChild(body);
    /* The closing rule. Its right-hand end is deliberately empty: the deck's
       own page number is moved onto this line by CSS rather than counted
       again here. The first draft of this composition did count again, and a
       deck with slide numbers on then showed two of them. */
    var footer = el('div', 'cp-footer');
    var closing = deck.closingNote || deck.org;
    if (closing) footer.appendChild(el('span', 'cp-footer-note', closing));
    pad.appendChild(footer);
    function field(tag, cls, key) { return rich(tag, cls, slide, key, slide[key] || ''); }
    function heading() { body.appendChild(field('h2', 'cp-heading', 'title')); }
    function note() { if (slide.body) body.appendChild(field('p', 'cp-source', 'body')); }
    function parts(line) { return SF.parseInfoLine(line); }
    function bullet(tag, cls, i, text) { return rich(tag, cls, slide, 'bullets.' + i, text); }
    /* Null when there is nothing to show, so the caller can leave the column
       out rather than reserve it. A cover saved before this composition had
       artwork — or one whose author simply removed the picture — used to get
       a 495px hole beside the headline, which reads as a broken slide rather
       than a plain one. */
    function artwork() {
      if (!SF.safeMedia(slide.image)) return null;
      var art = el('div', 'cp-art');
      var img = el('img', 'cp-prop'); img.alt = ''; img.src = SF.safeMedia(slide.image);
      art.appendChild(img);
      return art;
    }
    if (slide.type === 'title') {
      var title = el('div', 'cp-title-copy');
      /* "Five Minutes to Think" belongs to the question, not to the furniture:
         above the headline it tells the room what the next five minutes are
         for. Ink rather than paper — every strand ground fails white text,
         1.68:1 on mint at worst, so the separation is carried by size and
         letter-spacing instead of by colour. */
      if (slide.subtitle) title.appendChild(rich('p','cp-eyebrow',slide,'subtitle',slide.subtitle));
      title.appendChild(field('h1','','title'));
      if (slide.body) title.appendChild(field('p','cp-tagline','body'));
      appendSlideDate(slide, title);
      body.appendChild(title);
      var art = artwork();
      if (art) body.appendChild(art); else root.classList.add('cp-title-unillustrated');
    } else if (slide.type === 'quote') {
      body.appendChild(el('span','cp-quote-mark','“'));
      /* Same move as the cover: the beat sits with the words it introduces
         rather than in the corner furniture, so "The scenario · 30 seconds"
         reads as an instruction about the next half minute. */
      if (slide.subtitle) body.appendChild(rich('p','cp-eyebrow',slide,'subtitle',slide.subtitle));
      layoutQuote(Object.assign({},slide,{subtitle:''}),body);
      body.querySelector('.q').classList.add('cp-scenario');

    } else if (slide.type === 'cards') {
      heading();
      var choices = el('div','cp-choices');
      (slide.bullets || []).forEach(function (line,i) {
        var p=SF.parseKeywordLine(line), card=asStep(el('div','cp-choice'),slide);
        card.appendChild(el('span','cp-letter',LETTERS[i] || String(i+1)));
        var copy=el('div','cp-choice-copy');
        copy.appendChild(bullet('h3','',i,p.term)); copy.appendChild(bullet('p','',i,p.def));
        card.appendChild(copy); choices.appendChild(card);
      });
      body.appendChild(choices);
      if (slide.body) body.appendChild(field('p','cp-prompt','body'));
    } else if (slide.type === 'statement') {
      if (slide.subtitle) body.appendChild(rich('p','cp-eyebrow',slide,'subtitle',slide.subtitle));
      var discussion = el('div','cp-discussion');
      discussion.appendChild(el('span','cp-pair-mark','↔'));
      layoutStatement(Object.assign({}, slide, {subtitle:''}), discussion);
      discussion.querySelector('.statement').classList.add('cp-question');
      body.appendChild(discussion);

    } else if (slide.type === 'journey') {
      heading();
      var rules=el('div','cp-rules');
      (slide.bullets || []).forEach(function(line,i) {
        var p=SF.parseKeywordLine(line), row=asStep(el('div','cp-rule'),slide);
        row.appendChild(el('span','cp-rule-number','0'+(i+1)));
        var copy=el('div'); copy.appendChild(bullet('h3','',i,p.term)); copy.appendChild(bullet('p','',i,p.def));
        row.appendChild(copy); rules.appendChild(row);
      });
      body.appendChild(rules);
      /* Under the last rule, not above the first: on this layout the line is
         a summary of the three, and the numbers should be the first thing
         read. */
      if (slide.subtitle) body.appendChild(rich('p','cp-closing-line',slide,'subtitle',slide.subtitle));
      note();
    } else if (slide.type === 'keyfact') {
      var actionMark = el('div','cp-action-number','↗'); actionMark.setAttribute('aria-hidden','true'); body.appendChild(actionMark);
      var action=el('div','cp-action');
      /* Inside the action column, not across the grid: the label belongs to
         the heading it introduces, so it starts where the heading starts. */
      if (slide.subtitle) action.appendChild(rich('p','cp-eyebrow',slide,'subtitle',slide.subtitle));
      action.appendChild(field('h2','','title')); action.appendChild(field('p','','body'));
      (slide.bullets || []).forEach(function(line,i) { action.appendChild(asStep(bullet('p','cp-write-line',i,line),slide)); });
      body.appendChild(action);
    } else if (slide.type === 'compare') {
      heading(); var heads=parts(slide.subtitle), table=el('div','cp-comparison');
      var labelled=(slide.bullets || []).some(function(line){return !!parts(line).note;});
      var th=el('div','cp-compare-head'+(labelled?' labelled':''));
      if(labelled) th.appendChild(el('span'));
      th.appendChild(rich('h3','',slide,'subtitle',heads.label)); th.appendChild(rich('h3','',slide,'subtitle',heads.value)); table.appendChild(th);
      (slide.bullets || []).forEach(function(line,i){
        var p=parts(line), row=asStep(el('div','cp-compare-row'+(labelled?' labelled':'')),slide);
        if(labelled) row.appendChild(bullet('p','',i,p.note));
        row.appendChild(bullet('p','',i,p.label)); row.appendChild(bullet('p','',i,p.value)); table.appendChild(row);
      });
      body.appendChild(table); note();
    } else if (slide.type === 'iceberg') {
      heading();
      var reveal=el('div','cp-risk-map');

      var risks=el('div','cp-risks');
      (slide.bullets || []).forEach(function(line,i) {
        var p=parts(line), row=asStep(el('div','cp-risk'),slide);
        row.appendChild(bullet('span','cp-risk-number',i,p.value || String(i+1)));
        row.appendChild(bullet('h3','',i,p.label)); row.appendChild(bullet('p','',i,p.note)); risks.appendChild(row);
      });
      reveal.appendChild(risks); body.appendChild(reveal); note();
    } else if (slide.type === 'sourcecheck') {
      heading(); var receipt=el('div','cp-credits');
      (slide.bullets || []).forEach(function(line,i) {
        var p=parts(line), row=asStep(el('div','cp-credit'),slide);
        row.appendChild(bullet('span','',i,p.label)); row.appendChild(bullet('strong','',i,p.value)); row.appendChild(bullet('p','',i,p.note)); receipt.appendChild(row);
      });
      body.appendChild(receipt); note();
    } else if (slide.type === 'spectrum') {
      heading(); var lanes=el('div','cp-lanes');
      [parts(slide.subtitle).label,parts(slide.subtitle).value].forEach(function(label,side) {
        var lane=el('div','cp-lane'); lane.appendChild(rich('h3','',slide,'subtitle',label));
        (slide.bullets || []).forEach(function(line,i) {
          var p=parts(line); if ((Number(p.value)>=50?1:0)!==side) return;
          var item=asStep(el('div','cp-lane-item'),slide); item.dataset.step = String(i); item.appendChild(bullet('strong','',i,p.label));
          item.appendChild(bullet('span','cp-lane-position',i,p.value));
          if(p.note) item.appendChild(bullet('p','',i,p.note)); lane.appendChild(item);
        }); lanes.appendChild(lane);
      });
      body.appendChild(lanes); note();
    }
    return true;
  }

  function applyComposition(root, deck, slide) {
    var choice = SF.slideComposition(deck, slide);
    if (!choice) return;
    root.dataset.composition = choice;
    var statement = root.querySelector('.statement-word');
    if (statement) statement.style.removeProperty('font-size');
    var words = String(slide.type === 'quote' || slide.type === 'statement' ? slide.body || '' : slide.title || '');
    root.style.setProperty('--composition-display', words.length > 95 ? 'var(--composition-display-longest,60px)' : words.length > 65 ? 'var(--composition-display-long,72px)' : words.length > 35 ? 'var(--composition-display-medium,86px)' : 'var(--composition-display-short,112px)');
    var n = (slide.bullets || []).filter(function (x) { return String(x).trim(); }).length;
    root.style.setProperty('--composition-columns', String(n === 2 ? 2 : 3));
    root.dataset.compositionDensity = n > 4 ? 'dense' : 'normal';
  }

  return {render:layoutComposition, apply:applyComposition};
}
