// The activities the studio's room runs (lab-engine-plan M10): the shapes, as data. One kind per room profile
// (src/activities/rooms.js): a timed routine (`stages`), an activity that asks the room for feedback (`collect`),
// and a slide or moment the phones only follow (`moment`). Each kind is one file in this folder, listed once in
// index.ts (ACTIVITY_KINDS); the show (show.ts), the host's desk (desk.ts) and canHostInStudio read only from it.

import type { ActivitySettings, StageJob } from '../../core';

/** One stage of a routine, as SlideForge reads it off the activity's rows (src/activities/stages.js), with the
 *  lab's settings over it (the Activity panel's minutes and job). */
export interface RoomStage { i: number; name: string; seconds: number; text: string; job: StageJob; group: boolean }

/** What the phones are told about the stage on the wall: classic's `Player.stage` (js/stages.js publish), carried on `at`. */
export interface StageFrame {
  i: number; of: number; name: string; job: StageJob; group: boolean; text: string; brief: string;
  /** The seconds this stage was given, extensions included, and the seconds left when it was said (not a deadline: the phone's clock is not the host's). */
  seconds: number; left: number;
  /** The next stage's name, or ''. */
  next: string;
}

/** An activity slide as the room runs it: its kind, what `at` says of it (SlideForge's slide title and excerpt), and a routine's stages and brief. */
export interface RoomActivity {
  key: string; page: number; kind: string;
  /** SlideForge's slide (the catalogue's page), as the room reads it. */
  title: string; text: string;
  stages: RoomStage[];
  /** The leading untimed row, pinned through every stage ('' with none). */
  brief: string;
}

/** A SlideForge activity's page, as the catalogue holds it (lab/src/assets/activities.json). */
export interface CataloguePage { key: string; title: string; page: SFActivitySlide; game: boolean }

export interface ActivityKind {
  key: 'stages' | 'collect' | 'moment';
  /** What a teacher calls it. */
  name: string;
  /** Does this kind run the page? The first kind in the list that does, runs it. */
  runs(page: SFActivitySlide): boolean;
  /** A routine's stages and brief (the stages kind). */
  stages?(page: SFActivitySlide, settings?: ActivitySettings): { stages: RoomStage[]; brief: string; page: SFActivitySlide };
  /** Why the studio's room cannot run this page yet ('' when it can): its lesson is hosted by classic. */
  unsupported?(page: SFActivitySlide): string;
}

/** What the wall and the desk know of the activity on the wall. Set by the host's desk; not on the wire. */
export interface ActivityView {
  slideId: string;
  /** The routine's stages (names, jobs, times), for the track. */
  stages: { name: string; job: StageJob; group: boolean; seconds: number }[];
  brief: string;
  /** The stage the room is in (null: the introduction, before the first Next). */
  stage: StageFrame | null;
  /** When this stage's clock runs out, on the host's clock (ms); null with no clock. */
  endsAt: number | null;
  /** How many have written a private note in this note stage, of how many phones (the relay's `wrote`). */
  written: { n: number; of: number } | null;
  /** Phones asking for help (the relay's pace signals: `lost`), while a stage is up. Only the teacher sees it. */
  help: number;
  /** The ideas the teacher put up from a stage's idea box, without their authors, three at most, each named for its stage. */
  spotlights: { sid: string; label: string; text: string }[];
  /** The idea box this activity opened (a `send` stage's), or null. */
  box: string | null;
}

export type { ActivitySettings, StageJob };
