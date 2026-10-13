// The boards the studio's room runs (live/boards): a board's state as the room keeps it.
/** A board's state, by the board step's id: its kind, and the state its engine keeps (src/boards/runtimes). */
export interface BoardEntry { key: string; state: Record<string, unknown> }
