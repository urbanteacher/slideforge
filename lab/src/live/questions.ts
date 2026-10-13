// The questions box (docs/games/protocol.md: ask, qa, qaList, qaModerate, qaPin, floor): phones send questions while the
// floor is open, the relay keeps them and sends the host every one (`qa`, pending ones too), and the teacher approves,
// hides, marks answered or puts one on the wall. The relay also hands each phone the list on a fresh join and after every
// change (`qaList`), so the host has nothing to resend. Pure: the moderation frames classic's desk sends (js/live.js
// moderate), its buttons (presenter.html), the floor's three modes (js/live.js cycleFloor), and the relay's `qa` made safe.

import type { FloorMode, HostMessage, QaBox, QaItem, QaItemState, QaPinned } from './protocol';

/** What the teacher does with a question: the relay's four moderation actions, and on or off the wall. */
export type QaAction = 'approve' | 'dismiss' | 'answered' | 'pending' | 'pin' | 'unpin';
export const QA_ACTIONS: readonly QaAction[] = ['approve', 'dismiss', 'answered', 'pending', 'pin', 'unpin'];

export const FLOOR_MODES: readonly FloorMode[] = ['auto', 'open', 'shut'];
/** What each floor mode means, as classic says it. */
export const FLOOR_SAYS: Record<FloorMode, string> = {
  auto: 'Floor follows the lesson: hands up at checks, not mid-explanation',
  open: 'Floor open: the room can ask or put a hand up any time',
  shut: 'Floor closed: no hands, no questions until you reopen it',
};

export const emptyQa = (): QaBox => ({ items: [], pinned: null, pending: 0, open: 0 });

const STATES: readonly QaItemState[] = ['pending', 'approved', 'answered', 'dismissed'];

/** The relay's `qa`, made safe (it is shown on the teacher's screens). */
export function qaOf(m: { items?: unknown; pinned?: unknown; pending?: unknown; open?: unknown }): QaBox {
  const items: QaItem[] = (Array.isArray(m.items) ? m.items : []).filter((q) => q && typeof q === 'object').map((q) => {
    const x = q as Record<string, unknown>;
    return { id: Number(x.id) || 0, text: String(x.text ?? ''), name: String(x.name ?? ''), at: Number(x.at) || 0, state: STATES.includes(x.state as QaItemState) ? (x.state as QaItemState) : 'pending', votes: Number(x.votes) || 0 };
  });
  const p = m.pinned && typeof m.pinned === 'object' ? (m.pinned as Record<string, unknown>) : null;
  const pinned: QaPinned | null = p ? { id: Number(p.id) || 0, text: String(p.text ?? ''), name: String(p.name ?? ''), votes: Number(p.votes) || 0 } : null;
  return { items, pinned, pending: Number(m.pending) || 0, open: Number(m.open) || 0 };
}

/** The frame for the teacher's action on a question (classic's moderate). */
export function qaFrame(id: number, action: QaAction): HostMessage {
  if (action === 'pin') return { t: 'qaPin', id };
  if (action === 'unpin') return { t: 'qaPin', id: null };
  return { t: 'qaModerate', id, action };
}

/** The buttons a question has on the desk, as classic's presenter shows them: a waiting one is approved or hidden; one the
 *  room can see goes on or off the wall, is marked answered, or hidden; an answered one is reopened. */
export function qaButtons(q: Pick<QaItem, 'id' | 'state'>, pinnedId: number | null): { label: string; action: QaAction; tone?: 'go' | 'no' }[] {
  if (q.state === 'pending') return [{ label: 'Approve', action: 'approve', tone: 'go' }, { label: 'Hide', action: 'dismiss', tone: 'no' }];
  if (q.state === 'approved') return [
    q.id === pinnedId ? { label: 'Take off the wall', action: 'unpin' } : { label: 'Show on the wall', action: 'pin', tone: 'go' },
    { label: 'Mark answered', action: 'answered' }, { label: 'Hide', action: 'dismiss', tone: 'no' },
  ];
  if (q.state === 'answered') return [{ label: 'Reopen', action: 'approve' }];
  return [];
}

/** What a question's state says on the desk (classic's presenter). */
export const QA_SAYS: Record<QaItemState, string> = { pending: 'waiting for you', approved: 'visible to the room', answered: 'answered', dismissed: 'hidden' };
