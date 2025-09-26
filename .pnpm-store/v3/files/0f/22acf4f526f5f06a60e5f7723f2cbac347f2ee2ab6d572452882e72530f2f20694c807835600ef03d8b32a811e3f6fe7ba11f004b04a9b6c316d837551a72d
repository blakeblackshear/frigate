import type { CaptionScreen } from './cea-608-parser';
import type { TimelineController } from '../controller/timeline-controller';

export default class OutputFilter {
  private timelineController: TimelineController;
  private cueRanges: Array<[number, number]> = [];
  private trackName: string;
  private startTime: number | null = null;
  private endTime: number | null = null;
  private screen: CaptionScreen | null = null;

  constructor(timelineController: TimelineController, trackName: string) {
    this.timelineController = timelineController;
    this.trackName = trackName;
  }

  dispatchCue() {
    if (this.startTime === null) {
      return;
    }

    this.timelineController.addCues(
      this.trackName,
      this.startTime,
      this.endTime as number,
      this.screen as CaptionScreen,
      this.cueRanges,
    );
    this.startTime = null;
  }

  newCue(startTime: number, endTime: number, screen: CaptionScreen) {
    if (this.startTime === null || this.startTime > startTime) {
      this.startTime = startTime;
    }

    this.endTime = endTime;
    this.screen = screen;
    this.timelineController.createCaptionsTrack(this.trackName);
  }

  reset() {
    this.cueRanges = [];
    this.startTime = null;
  }
}
