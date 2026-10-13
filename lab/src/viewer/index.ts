// viewer/: the studio viewer for a shared lesson (lab-engine-plan M12). Its public interface: code outside viewer/
// imports from here, never from its files (hard rule 13).
//
//   startViewer()          lab-app/view.html's page: fetch /api/share/<id> and play it (read, follow, practice)
//   shareCopy(deck)        the lesson as Share uploads it (shown slides, no notes, pictures packed)
//   sharedDeck(doc)        a shared copy as the viewer plays it (pictures back, hidden slides and notes out)
//   practiceOf(slide)      what practice offers on a slide; PracticeScore marks it with SlideForge's own marking
export { startViewer } from './page';
export { followIndex, markPractice, practiceCount, practiceOf, PracticeScore, readLink, shareCopy, sharedDeck } from './state';
export type { Practice, PracticeAsk, PracticeRoom, Shared, ShareLink } from './state';
