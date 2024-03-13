import { Recording } from "@/types/record";
import { DynamicPlayback } from "@/types/playback";
import { PreviewController } from "../PreviewPlayer";

type PlayerMode = "playback" | "scrubbing";

export class DynamicVideoController {
  // main state
  public camera = "";
  private playerController: HTMLVideoElement;
  private previewController: PreviewController;
  private setScrubbing: (isScrubbing: boolean) => void;
  private setFocusedItem: (timeline: Timeline) => void;
  private playerMode: PlayerMode = "playback";

  // playback
  private recordings: Recording[] = [];
  private annotationOffset: number;
  private timeToStart: number | undefined = undefined;

  constructor(
    camera: string,
    playerController: HTMLVideoElement,
    previewController: PreviewController,
    annotationOffset: number,
    defaultMode: PlayerMode,
    setScrubbing: (isScrubbing: boolean) => void,
    setFocusedItem: (timeline: Timeline) => void,
  ) {
    this.camera = camera;
    this.playerController = playerController;
    this.previewController = previewController;
    this.annotationOffset = annotationOffset;
    this.playerMode = defaultMode;
    this.setScrubbing = setScrubbing;
    this.setFocusedItem = setFocusedItem;
  }

  newPlayback(newPlayback: DynamicPlayback) {
    this.recordings = newPlayback.recordings;

    if (this.timeToStart) {
      this.seekToTimestamp(this.timeToStart);
      this.timeToStart = undefined;
    }
  }

  pause() {
    this.playerController.pause();
  }

  seekToTimestamp(time: number, play: boolean = false) {
    if (this.playerMode != "playback") {
      this.playerMode = "playback";
      this.setScrubbing(false);
    }

    if (
      this.recordings.length == 0 ||
      time < this.recordings[0].start_time ||
      time > this.recordings[this.recordings.length - 1].end_time
    ) {
      this.timeToStart = time;
      return;
    }

    let seekSeconds = 0;
    (this.recordings || []).every((segment) => {
      // if the next segment is past the desired time, stop calculating
      if (segment.start_time > time) {
        return false;
      }

      if (segment.end_time < time) {
        seekSeconds += segment.end_time - segment.start_time;
        return true;
      }

      seekSeconds +=
        segment.end_time - segment.start_time - (segment.end_time - time);
      return true;
    });

    if (seekSeconds != 0) {
      this.playerController.currentTime = seekSeconds;

      if (play) {
        this.playerController.play();
      } else {
        this.playerController.pause();
      }
    }
  }

  seekToTimelineItem(timeline: Timeline) {
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
      this.setScrubbing(true);
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
