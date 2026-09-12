/* Persistence for both document kinds. Access is lazy so loading the model
   works without browser storage (Node tests and restricted browser contexts). */
export function createStores({ normalizeDeck, normalizeGame, normalizePlan, storage, warn = console.warn }) {
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
      save(document) {
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
      clear() { write([]); },
      get(id) { return read().find(item => item.id === id) || null; },
      lastId() {
        try { return storage().getItem(lastKey); } catch (error) { return null; }
      },
      read
    };
  }

  const decks = documents('decks', 'slideforge.decks.v1', 'slideforge.lastDeckId', normalizeDeck);
  const plans = documents('plans', 'slideforge.plans.v1', 'slideforge.lastPlanId', normalizePlan);
  const games = documents('games', 'slideforge.games.v1', 'slideforge.lastGameId', normalizeGame);
  const { read: readDecks, ...Store } = decks;
  const { read: readGames, ...GameStoreBase } = games;
  const GameStore = Object.assign(GameStoreBase, {
    usedBy: id => readDecks().filter(deck =>
      deck.slides.some(slide => slide.type === 'game' && slide.gameId === id)
    ).map(deck => deck.title)
  });
  const { read: readPlans, ...PlanStore } = plans;
  return { Store, GameStore, PlanStore };
}
