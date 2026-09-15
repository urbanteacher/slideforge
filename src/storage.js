/* Persistence for both document kinds. Access is lazy so loading the model
   works without browser storage (Node tests and restricted browser contexts). */

/**
 * A New document nobody has written in yet. Popular apps do not file these:
   File → Open was filling with "Untitled presentation" from every unused
   blank. Named work, ready-made lessons, and anything with copy or a photo
   are not drafts.
 * @param {any} doc
 */
export function unusedDraft(doc) {
  if (!doc || !doc.id) return false;
  var title = String(doc.title || '').trim();
  if (title && !/^(untitled(\s+(deck|presentation|lesson|game))?)$/i.test(title)) {
    return false;
  }
  if (Array.isArray(doc.slides)) {
    if (doc.slides.length > 1) return false;
    var slide = doc.slides[0];
    if (!slide) return true;
    var text = [slide.title, slide.subtitle, slide.body, slide.image, slide.notes]
      .concat(slide.bullets || [])
      .map(function (value) {
        var t = String(value || '').replace(/\s+/g, ' ').trim();
        /* makeSlide('title') fills these in. They are prompts, not work. */
        if (t === 'Presentation title' || t === 'Your name') return '';
        return t;
      })
      .join('');
    return !text;
  }
  if (Array.isArray(doc.questions)) {
    return doc.questions.every(function (q) {
      return !q || !String(q.question || '').trim();
    });
  }
  return false;
}

export function createStores({ normalizeDeck, normalizeGame, storage, warn = console.warn }) {
  function documents(kind, key, lastKey, normalize) {
    function read() {
      try {
        const raw = JSON.parse(storage().getItem(key) || '[]');
        return Array.isArray(raw) ? raw.map(normalize).filter(Boolean) : [];
      } catch (error) {
        warn('Could not read saved ' + kind + ':', error);
        return [];
      }
    }

    function write(items) {
      try {
        storage().setItem(key, JSON.stringify(items));
        return true;
      } catch (error) {
        warn('Could not save ' + kind + ':', error);
        return false;
      }
    }

    return {
      list() { return read().sort((a, b) => b.modified - a.modified); },
      save(document, opts) {
        /* An unused blank is a scratch pad, not a file. Skip the first write
           so File → Open is not a graveyard of New → never typed. Once a
           draft is already stored (an older session), keep updating it.
           File → Save to browser passes force, so an explicit keep still files. */
        if (!(opts && opts.force) && unusedDraft(document)) {
          const all = read();
          if (!all.some(item => item.id === document.id)) return true;
        }
        document.modified = Date.now();
        const all = read();
        const index = all.findIndex(item => item.id === document.id);
        if (index === -1) all.push(document); else all[index] = document;
        const ok = write(all);
        // Preserve the last-opened document even when another one sorts first.
        try { storage().setItem(lastKey, document.id); } catch (error) {}
        return ok;
      },
      remove(id) { write(read().filter(item => item.id !== id)); },
      /* Drop untitled blanks that never got content. keepId stays, so the
         document on screen is not yanked out from under the editor. */
      sweepUnused(keepId) {
        const all = read();
        const next = all.filter(item => (keepId && item.id === keepId) || !unusedDraft(item));
        if (next.length !== all.length) write(next);
        return all.length - next.length;
      },
      clear() { write([]); },
      get(id) { return read().find(item => item.id === id) || null; },
      lastId() {
        try { return storage().getItem(lastKey); } catch (error) { return null; }
      },
      read
    };
  }

  const decks = documents('decks', 'slideforge.decks.v1', 'slideforge.lastDeckId', normalizeDeck);
  const games = documents('games', 'slideforge.games.v1', 'slideforge.lastGameId', normalizeGame);
  const { read: readDecks, ...Store } = decks;
  const { read: readGames, ...GameStoreBase } = games;
  const GameStore = Object.assign(GameStoreBase, {
    usedBy: id => readDecks().filter(deck =>
      deck.slides.some(slide => slide.type === 'game' && slide.gameId === id)
    ).map(deck => deck.title)
  });
  return { Store, GameStore };
}
