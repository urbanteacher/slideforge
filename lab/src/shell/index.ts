// shell/: the editor's frame around the slide. The status centre, the editor's preferences, the place kept in the
// address, the command palette and the ? and settings sheets. Code outside shell/ imports from here.
export { Overlays } from './Overlays';
export { RightColumn } from './RightColumn';
export { addCommands, allCommands, bindCommands, openOverlay, useOverlay } from './commands';
export type { Command } from './commands';
export { usePrefs } from './prefs';
export { reason, report, settle, showStatus, startStatus, track, unseenFailures, useStatus } from './status';
export type { Job, JobKind, JobState } from './status';
export { startSyncWatch } from './sync';
export { readPlace, restorePlace, startUrlSync } from './url';
