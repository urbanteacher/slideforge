// presenter/: the studio's Teacher Presenter window (lab-engine-plan M11a). Its public interface: code outside
// presenter/ imports from here (hard rule 13).
//
//   <PresenterWindow />             the window's whole page (main.tsx renders it for ?presenter=1)
//   ShowSide                        the show's end of the BroadcastChannel (show/usePresenter.ts)
//   presenterUrl()                  where the window is opened from
export { PresenterWindow } from './PresenterWindow';
export { PRESENTER_CHANNEL, ShowSide, WindowSide, parseToShow, parseToWindow } from './protocol';
export { QuestionsList, QuickPollForm } from './RoomDesk';
export type { ChannelFactory, ChannelLike, CmdData, PresenterCmd, PresenterRoom, PresenterState, Screen, ToShow, ToWindow } from './protocol';
export { clock, parseCountdown, remaining } from './timer';

/** The address of the presenter window: this same app, with ?presenter=1. */
export function presenterUrl(): string {
  const u = new URL(location.href);
  u.search = '?presenter=1';
  u.hash = '';
  return u.href;
}
