// The desk's two clocks, as pure functions: how long the show has run, and a countdown the teacher sets.

const pad = (n: number) => String(n).padStart(2, '0');

/** 83 seconds is "1:23"; an hour or more is "1:02:03". Negative or non-finite is "0:00". */
export function clock(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** What a teacher types for a countdown: "10" is ten minutes, "5:30" five and a half, "90s" ninety seconds. Null when it is nothing. */
export function parseCountdown(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  let m = /^(\d+)\s*s(ec)?$/.exec(t);
  if (m) return Number(m[1]) || null;
  m = /^(\d+):([0-5]?\d)$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]) || null;
  m = /^(\d+(?:\.\d+)?)\s*(m|min)?$/.exec(t);
  return m ? Math.round(Number(m[1]) * 60) || null : null;
}

/** Seconds left of a countdown that ends at `endsAt` (ms since the epoch); negative once it is over. */
export const remaining = (endsAt: number, now: number): number => Math.ceil((endsAt - now) / 1000);
