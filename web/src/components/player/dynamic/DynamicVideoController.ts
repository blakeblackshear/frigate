import { Recording } from "@/types/record";
import { DynamicPlayback } from "@/types/playback";
import { PreviewController } from "../PreviewPlayer";
import { TimeRange, TrackingDetailsSequence } from "@/types/timeline";
import {
  calculateInpointOffset,
  calculateSeekPosition,
} from "@/utils/videoUtil";

type PlayerMode = "playback" | "scrubbing";

export class DynamicVideoController {
  // main state
  public camera = "";
  private playerController: HTMLVideoElement;
  private previewController: PreviewController;
  private setNoRecording: (noRecs: boolean) => void;
  private setFocusedItem: (timeline: TrackingDetailsSequence) => void;
  private playerMode: PlayerMode = "playback";

  // playback
  private recordings: Recording[] = [];
  private timeRange: TimeRange = { after: 0, before: 0 };
  private inpointOffset: number = 0;
  private annotationOffset: number;
  private timeToStart: number | undefined = undefined;

  constructor(
    camera: string,
    playerController: HTMLVideoElement,
    previewController: PreviewController,
    annotationOffset: number,
    defaultMode: PlayerMode,
    setNoRecording: (noRecs: boolean) => void,
    setFocusedItem: (timeline: TrackingDetailsSequence) => void,
  ) {
    this.camera = camera;
    this.playerController = playerController;
    this.previewController = previewController;
    this.annotationOffset = annotationOffset;
    this.playerMode = defaultMode;
    this.setNoRecording = setNoRecording;
    this.setFocusedItem = setFocusedItem;
  }

  newPlayback(newPlayback: DynamicPlayback) {
    this.recordings = newPlayback.recordings;
    this.timeRange = newPlayback.timeRange;
    this.inpointOffset = calculateInpointOffset(
      this.timeRange.after,
      this.recordings[0],
    );

    if (this.timeToStart) {
      this.seekToTimestamp(this.timeToStart);
      this.timeToStart = undefined;
    }
  }

  play() {
    this.playerController.play();
  }

  pause() {
    this.playerController.pause();
  }

  isPlaying(): boolean {
    return !this.playerController.paused && !this.playerController.ended;
  }

  seekToTimestamp(time: number, play: boolean = false) {
    if (time < this.timeRange.after || time > this.timeRange.before) {
      this.timeToStart = time;
      return;
    }

    if (this.playerMode != "playback") {
      this.playerMode = "playback";
    }

    const seekSeconds = calculateSeekPosition(
      time,
      this.recordings,
      this.inpointOffset,
    );

    if (seekSeconds === undefined) {
      this.setNoRecording(true);
      return;
    }

    if (seekSeconds != 0) {
      this.playerController.currentTime = seekSeconds;

      if (play) {
        this.waitAndPlay();
      } else {
        this.playerController.pause();
      }
    } else {
      // no op
    }
  }

  waitAndPlay() {
    return new Promise((resolve) => {
      const onSeekedHandler = () => {
        this.playerController.removeEventListener("seeked", onSeekedHandler);
        this.playerController.play();
        resolve(undefined);
      };

      this.playerController.addEventListener("seeked", onSeekedHandler, {
        once: true,
      });
    });
  }

  seekToTimelineItem(timeline: TrackingDetailsSequence) {
    this.playerController.pause();
    this.seekToTimestamp(timeline.timestamp + this.annotationOffset);
    this.setFocusedItem(timeline);
  }

  getProgress(playerTime: number): number {
    // take a player time in seconds and convert to timestamp in timeline
    let timestamp = 0;
    let totalTime = 0;
    (this.recordings || []).every((segment) => {
      if (totalTime + segment.duration > playerTime) {
        // segment is here
        timestamp = segment.start_time + (playerTime - totalTime);
        return false;
      } else {
        totalTime += segment.duration;
        return true;
      }
    });

    return timestamp;
  }

  scrubToTimestamp(time: number, saveIfNotReady: boolean = false) {
    const scrubResult = this.previewController.scrubToTimestamp(time);

    if (!scrubResult && saveIfNotReady) {
      this.previewController.setNewPreviewStartTime(time);
    }

    if (scrubResult && this.playerMode != "scrubbing") {
      this.playerMode = "scrubbing";
      this.playerController.pause();
    }
  }

  hasRecordingAtTime(time: number): boolean {
    if (!this.recordings || this.recordings.length == 0) {
      return false;
    }

    return (
      this.recordings.find(
        (segment) => segment.start_time <= time && segment.end_time >= time,
      ) != undefined
    );
  }
}

export default typeof DynamicVideoController;
