// A bare stand-in for the browser's document, for tests that load the store or the editors: they draw text, so they
// reach for a canvas as they load. Import it first, before anything from src/, so it is there when they do.
// (Imported, not loaded with await import(): a dynamic import splits the test build into shared chunks, and a chunk can
// then pull in other test files, which run again.)
const ctx = new Proxy({}, { get: () => () => ({ width: 0 }) });
(globalThis as { document?: unknown }).document ??= { createElement: () => ({ getContext: () => ctx, style: {} }), fonts: undefined };
export {};
