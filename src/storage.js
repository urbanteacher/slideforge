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

/** Brand folders in the Library. Theme look is Settings; this is where the file sits. */
export const LIBRARY_GROUPS = [
  { id: 'nul', label: 'Northeastern' },
  { id: 'ukbt', label: 'UK Black Tech' },
  { id: 'ukbt-institute', label: 'UKBT Institute' },
  { id: 'aiad26', label: 'AI Awareness Day 2026' },
  { id: 'aiad27', label: 'AI Awareness Day 2027' },
  { id: 'other', label: 'Other' }
];

export function libraryGroupFromTheme(theme) {
  if (theme === 'northeastern') return 'nul';
  if (theme === 'ukbt') return 'ukbt';
  if (theme === 'ukbt-institute') return 'ukbt-institute';
  /* All five principles into one folder. They are five themes because each
     carries its own colour and badge, but they are one campaign and a teacher
     running the day wants them in one place — not scattered through Other with
     everything else. */
  if (theme && theme.indexOf('aiad26-') === 0) return 'aiad26';
  if (theme && theme.indexOf('aiad27-') === 0) return 'aiad27';
  return 'other';
}

/** Keep custom folder ids; only invent a group when the deck has none. */
export function normalizeLibraryGroup(raw, theme) {
  const id = String(raw || '').trim().toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return id || libraryGroupFromTheme(theme);
}

export function slugLibraryFolder(label) {
  return normalizeLibraryGroup(label, '') || 'folder';
}

const FOLDER_KEY = 'slideforge.libraryFolders.v1';

export function createLibraryFolders({ storage, warn = console.warn }) {
  function read() {
    try {
      const raw = JSON.parse(storage().getItem(FOLDER_KEY) || '{}');
      return {
        folders: Array.isArray(raw.folders) ? raw.folders : [],
        collapsed: raw.collapsed && typeof raw.collapsed === 'object' ? raw.collapsed : {},
        labels: raw.labels && typeof raw.labels === 'object' ? raw.labels : {}
      };
    } catch (error) {
      warn('Could not read library folders:', error);
      return { folders: [], collapsed: {}, labels: {} };
    }
  }

  function write(state) {
    try {
      storage().setItem(FOLDER_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      warn('Could not save library folders:', error);
      return false;
    }
  }

  function catalog() {
    const state = read();
    const seen = Object.create(null);
    const out = LIBRARY_GROUPS.map(function (g) {
      seen[g.id] = true;
      return { id: g.id, label: String(state.labels[g.id] || g.label), builtin: true };
    });
    state.folders.forEach(function (f) {
      const id = normalizeLibraryGroup(f && f.id, '');
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push({ id: id, label: String((f && f.label) || id), builtin: false });
    });
    return out;
  }

  return {
    catalog: catalog,
    collapsed: function () { return read().collapsed; },
    setCollapsed: function (id, on) {
      const state = read();
      if (on) state.collapsed[id] = true;
      else delete state.collapsed[id];
      write(state);
    },
    rename: function (id, label) {
      const name = String(label || '').trim();
      if (!id || !name) return false;
      const state = read();
      if (LIBRARY_GROUPS.some(function (g) { return g.id === id; })) {
        state.labels[id] = name;
      } else {
        const row = state.folders.filter(function (f) { return f.id === id; })[0];
        if (row) row.label = name;
        else state.folders.push({ id: id, label: name });
      }
      return write(state);
    },
    create: function (label) {
      const name = String(label || '').trim();
      if (!name) return null;
      let id = slugLibraryFolder(name);
      const used = Object.create(null);
      catalog().forEach(function (g) { used[g.id] = true; });
      let n = 2;
      const base = id;
      while (used[id]) { id = base + '-' + n; n++; }
      const state = read();
      state.folders.push({ id: id, label: name });
      write(state);
      return id;
    },
    remove: function (id) {
      if (!id || LIBRARY_GROUPS.some(function (g) { return g.id === id; })) return false;
      const state = read();
      state.folders = state.folders.filter(function (f) { return f.id !== id; });
      delete state.labels[id];
      delete state.collapsed[id];
      return write(state);
    }
  };
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
           so the Library is not a graveyard of New → never typed. Once a
           draft is already stored (an older session), keep updating it.
           File → Save to Library passes force, so an explicit keep still files. */
        if (!(opts && opts.force) && unusedDraft(document)) {
          const all = read();
          if (!all.some(item => item.id === document.id)) return true;
        }
        if (kind === 'decks' && document && !document.libraryGroup) {
          document.libraryGroup = libraryGroupFromTheme(document.theme);
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
  const usedByDecks = id => readDecks().filter(deck =>
    (deck.slides || []).some(slide => slide.type === 'game' && slide.gameId === id)
  );
  const GameStore = Object.assign(GameStoreBase, {
    usedByDecks,
    usedBy: id => usedByDecks(id).map(deck => deck.title)
  });
  const LibraryFolders = createLibraryFolders({ storage, warn });
  return { Store, GameStore, LibraryFolders };
}
