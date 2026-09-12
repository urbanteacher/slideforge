/* Shared board lifecycle and presenter protocol. Runtime modules are looked up
   when used because browser script tags load them after the model bundle. */
export function createBoardRuntime(
  namespace,
  styles,
  clock = {
    now: () => Date.now(),
    every: (callback, milliseconds) => setInterval(callback, milliseconds),
    cancel: (timer) => clearInterval(timer)
  }
) {
  function definitions() {
    const unique = new Map();
    for (const style of Object.values(styles)) {
      if (style.boardEngine) unique.set(style.boardEngine.key, style.boardEngine);
    }
    return [...unique.values()];
  }
  function forSlide(slide) {
    return (slide && definitions().find((board) => slide[board.field])) || null;
  }
  function current(host, slide) {
    const board = forSlide(slide);
    return (board && host[board.states] && host[board.states][slide.id]) || null;
  }
  function unmountAll() {
    for (const board of definitions()) namespace()[board.runtime]?.unmount();
  }
  function reset(host) {
    unmountAll();
    for (const board of definitions()) host[board.states] = {};
  }
  function mount(host, slide, node) {
    const board = forSlide(slide);
    if (board) namespace()[board.runtime]?.mount(host, slide, node);
  }
  function render(pad, slide, options, root) {
    const board = forSlide(slide);
    const engine = board && namespace()[board.runtime];
    if (!engine) return false;
    root.classList.add(board.className);
    engine.render(pad, slide, options);
    return true;
  }
  function snapshot(host) {
    return Object.fromEntries(
      definitions().map((board) => [board.states, host[board.states] || {}])
    );
  }
  function renderOptions(host, slide, sendCommand) {
    const options = {};
    for (const board of definitions()) {
      options[board.state] = host && host[board.states] && host[board.states][slide.id];
      options[board.command] = sendCommand
        ? (action, card) => {
            const payload = { action };
            if (card !== undefined) payload.card = card;
            sendCommand(board.key, payload);
          }
        : null;
    }
    return options;
  }
  function command(key, action, card) {
    const board = definitions().find((board) => board.key === key);
    const engine = board && namespace()[board.runtime];
    if (!engine) return false;
    engine.command(action, card);
    return true;
  }
  function stamp(host, slide, theme) {
    const state = current(host, slide);
    return state ? JSON.stringify([slide.id, theme, { ...state, elapsed: 0, remaining: 0 }]) : null;
  }
  function refreshClock(box, host, slide) {
    const board = forSlide(slide);
    const state = current(host, slide);
    const clock = board?.clock && box.querySelector(board.clock.selector);
    if (!clock || !state) return false;
    clock.textContent = board.clock.text(state, namespace()[board.runtime]);
    return true;
  }
  function restoreFocus(node, slide) {
    const board = forSlide(slide);
    if (!board) return;
    const target =
      node.querySelector(board.focusPrimary) || node.querySelector(board.focusFallback);
    target?.focus({ preventScroll: true });
  }
  function onVerdict(report) {
    for (const board of definitions()) {
      const engine = namespace()[board.runtime];
      if (engine)
        engine[board.reportEvent || 'onVerdict'] = board.reportValue
          ? (value) => report(board.reportValue(value))
          : report;
    }
  }
  function createSession(
    key,
    { player, slide, node, create, render, command, tick, interval = 1000 }
  ) {
    const board = definitions().find((board) => board.key === key);
    player[board.states] = player[board.states] || {};
    if (!player[board.states][slide.id])
      player[board.states][slide.id] = create(slide[board.field]);
    let last = clock.now();
    let stopped = false;
    const session = { player, slide, node };
    const sync = () => {
      if (player.syncPresenter) player.syncPresenter();
    };
    session.paint = (focus) => {
      render(node.querySelector('.pad'), slide, {
        [board.state]: player[board.states][slide.id],
        [board.command]: command
      });
      if (focus) restoreFocus(node, slide);
      sync();
    };
    session.tick = () => {
      if (stopped) return;
      const now = clock.now();
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      const state = player[board.states][slide.id];
      if (state.paused || player.blank) return;
      if (tick(session, dt)) {
        refreshClock(node, player, slide);
        sync();
      }
    };
    session.start = () => {
      session.paint(false);
      session.timer = clock.every(session.tick, interval);
    };
    session.stop = () => {
      if (stopped) return;
      session.tick();
      clock.cancel(session.timer);
      stopped = true;
    };
    return session;
  }
  return {
    forSlide,
    current,
    unmountAll,
    reset,
    mount,
    render,
    snapshot,
    renderOptions,
    command,
    stamp,
    refreshClock,
    restoreFocus,
    onVerdict,
    createSession
  };
}
