// show/: the studio's own slideshow and the live room's wall (lab-engine-plan M7, slice 2). Its public
// interface: code outside show/ imports from here, never from its files (hard rule 13).
//
//   <ShowLayer />                       rendered once, by the app: draws the show when one is open
//   openStudioShow({ room: true })      open the lesson in the studio as a show, with a live room over it
//   canHostInStudio(deck)               can the studio's room run this lesson (every game one of the registry's styles)?
//   openStudioShow()                    a plain show: no room, with the Teacher Presenter, notes on another device, black / white screen, overview and jump
//   studioShowEnabled()                 ?studioShow=1 (the TopBar's Present (studio), until the shell's Present is switched, M15)
//   studioRoomEnabled()                 ?studioRoom=1 (on this page, or on the page around the shell's frame)
export { ShowLayer } from './Show';
export { closeStudioShow, openStudioShow, studioRoomEnabled, studioShowEnabled, type ShowFirst } from './state';
export { hasRoomGame } from './steps';
export { canHostInStudio, whyNotPresentInStudio, type CanHost } from './canHost';
export type { ShowHooks, SessionRef } from './hooks';
export { roomRunning, roomWatchOn } from './useRoom';
