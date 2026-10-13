// The Lesson studio's live-room host (lab-engine-plan M7): a room on SlideForge's relay, run from a lab deck,
// speaking the protocol classic speaks (docs/games/protocol.md). No user interface yet.
//
//   const host = new LiveHost({ url: 'wss://…', show: showFromDeck(deck) });
//   const { pin } = await host.start();   // phones join with the PIN, through join.html
//   host.begin(); host.next(); …           // the teacher's Start and Next
//   host.subscribe((room) => …);           // players, tallies, scores, as the relay reports them
//   await host.end();
//   new ManualBridge(host).start()          // serve the teacher-entry window (manual.html#<key>)
export { LiveHost, type HostOptions, type ManualChoice } from './host';
export { ManualBridge, manualState, newKey, type ChannelLike } from './manual';
export { showFromDeck, type RoomQuiz, type RoomShow, type RoomSlide } from './show';
export { typedGroups, type TypedGroup } from './typed';
export { Room, emptyRoom, type Listener, type OpenQuestion, type RoomState, type Tally } from './room';
export { Connection, DEFAULT_BACKOFF, type Backoff, type ConnectionOptions, type SocketFactory, type SocketLike } from './connection';
export type { HostMessage, Phase, PlayerRow, RelayMessage, TallyAnswer } from './protocol';
