// The Lesson studio's live-room host (lab-engine-plan M7): a room on SlideForge's relay, run from a lab deck,
// speaking the protocol classic speaks (docs/games/protocol.md). No user interface yet.
//
//   const host = new LiveHost({ url: 'wss://…', show: showFromDeck(deck) });
//   const { pin } = await host.start();   // phones join with the PIN, through join.html
//   host.begin(); host.next(); …           // the teacher's Start and Next
//   host.subscribe((room) => …);           // players, tallies, scores, as the relay reports them
//   await host.end();
//   new ManualBridge(host).start()          // serve the teacher-entry window (manual.html#<key>)
export { LiveHost, type HostOptions } from './host';
export type { ManualChoice } from './styles';
export { ManualBridge, manualState, newKey, type ChannelLike } from './manual';
export { showFromDeck, type RoomQuiz, type RoomShow, type RoomSlide } from './show';
export { feedbackOf, type RoomFeedback } from './feedback';
export { FLOOR_MODES, FLOOR_SAYS, QA_ACTIONS, QA_SAYS, emptyQa, qaButtons, qaFrame, qaOf, type QaAction } from './questions';
export { QUICK_PRESETS, quickFields, quickProblem, type QuickAsk, type QuickKind, type QuickPreset } from './quick';
export { ACTIVITY_KINDS, activityBlocker, activityKeys, activityOf, cataloguePage, type ActivityKind, type ActivityView, type RoomActivity, type RoomStage, type StageFrame } from './activities';
export { type BossView, type DripView, type Mechanic, type RaceLane, type RaceView } from './mechanics';
export { emptySpoken, speakerOf, type ChainModel, type Credit, type Recipient, type RoundView, type SpokenView } from './spoken';
export { typedGroups, type TypedGroup } from './typed';
export { BOARDS, boardForFormat, boardOfKey, boardOn, boardRevealed, boardWallOf, type BoardAction, type BoardEntry, type BoardKind, type BoardWallBase, type BingoCard, type BingoWall, type BowlWall, type LowStakesWall, type MemoryCard, type MemoryWall, type RoomBoard } from './boards';
export { emptySpeed, type SpeedRound, type SpeedView, type SprintView } from './speedroom';
export { STYLES, styleFor, styleForFormat, styleNames, styleOf, type GapsModel, type HeatModel, type LineMark, type LineModel, type SlotsModel, type SortModel, type SplitModel, type StyleEntry, type WallDetail } from './styles';
export { MAX_TEAMS, TEAM_COLORS, TEAM_DEFAULTS, normalizeTeams, parseRoster, roomPlay, teamBoardOf, teamColor, type Roster, type RoomPlay, type TeamRow } from './teams';
export { Room, emptyRoom, type Listener, type Mech, type OpenFeedback, type OpenQuestion, type RoomState, type Tally } from './room';
export { Connection, DEFAULT_BACKOFF, type Backoff, type ConnectionOptions, type SocketFactory, type SocketLike } from './connection';
export type { SprintProgress, SprintQuestion, SprintResult } from './protocol';
export type { Digest, FloorMode, HostMessage, QaBox, QaItem, QaItemState, QaPinned, Phase, PromptFields, PlayerRow, RelayMessage, ScoreRow, TallyAnswer } from './protocol';
