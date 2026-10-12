// show/: the studio's own slideshow and the live room's wall (lab-engine-plan M7, slice 2). Its public
// interface: code outside show/ imports from here, never from its files (hard rule 13).
//
//   <ShowLayer />                       rendered once, by the app: draws the show when one is open
//   openStudioShow({ room: true })      open the lesson in the studio as a show, with a live room over it
//   studioRoomEnabled()                 ?studioRoom=1 (on this page, or on the page around the shell's frame)
export { ShowLayer } from './Show';
export { closeStudioShow, openStudioShow, studioRoomEnabled } from './state';
export { hasRoomGame } from './steps';
