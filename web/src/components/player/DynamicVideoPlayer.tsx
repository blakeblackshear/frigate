import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import Player from "video.js/dist/types/player";
import TimelineEventOverlay from "../overlay/TimelineDataOverlay";
import { useApiHost } from "@/api";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { Recording } from "@/types/record";
import { Preview } from "@/types/preview";
import { DynamicPlayback } from "@/types/playback";
import PreviewVideoPlayer, {
  PreviewVideoController,
} from "./PreviewVideoPlayer";

type PlayerMode = "playback" | "scrubbing";

/**
 * Dynamically switches between video playback and scrubbing preview player.
 */
type DynamicVideoPlayerProps = {
  className?: string;
  camera: string;
  timeRange: { start: number; end: number };
  cameraPreviews: Preview[];
  previewOnly?: boolean;
  onControllerReady: (controller: DynamicVideoController) => void;
  onClick?: () => void;
};
export default function DynamicVideoPlayer({
  className,
  camera,
  timeRange,
  cameraPreviews,
  previewOnly = false,
  onControllerReady,
  onClick,
}: DynamicVideoPlayerProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useMemo(
    () =>
      config?.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    [config],
  );

  // playback behavior
  const wideVideo = useMemo(() => {
    if (!config) {
      return false;
    }

    return (
      config.cameras[camera].detect.width /
        config.cameras[camera].detect.height >
      1.7
    );
  }, [camera, config]);

  // controlling playback

  const playerRef = useRef<Player | null>(null);
  const [previewController, setPreviewController] =
    useState<PreviewVideoController | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(previewOnly);
  const [focusedItem, setFocusedItem] = useState<Timeline | undefined>(
    undefined,
  );
  const controller = useMemo(() => {
    if (!config || !playerRef.current || !previewController) {
      return undefined;
    }

    return new DynamicVideoController(
      camera,
      playerRef.current,
      previewController,
      (config.cameras[camera]?.detect?.annotation_offset || 0) / 1000,
      previewOnly ? "scrubbing" : "playback",
      setIsScrubbing,
      setFocusedItem,
    );
    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, config, playerRef.current, previewController]);

  useEffect(() => {
    if (!controller) {
      return;
    }

    if (controller) {
      onControllerReady(controller);
    }

    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  const [initPreviewOnly, setInitPreviewOnly] = useState(previewOnly);

  useEffect(() => {
    if (!controller || !playerRef.current) {
      return;
    }

    if (previewOnly == initPreviewOnly) {
      return;
    }

    if (!previewOnly) {
      controller.seekToTimestamp(playerRef.current.currentTime() || 0, true);
    }

    setInitPreviewOnly(previewOnly);
    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, previewOnly]);

  // keyboard control

  const onKeyboardShortcut = useCallback(
    (key: string, down: boolean, repeat: boolean) => {
      if (!playerRef.current || previewOnly) {
        return;
      }

      switch (key) {
        case "ArrowLeft":
          if (down) {
            const currentTime = playerRef.current.currentTime();

            if (currentTime) {
              playerRef.current.currentTime(Math.max(0, currentTime - 5));
            }
          }
          break;
        case "ArrowRight":
          if (down) {
            const currentTime = playerRef.current.currentTime();

            if (currentTime) {
              playerRef.current.currentTime(currentTime + 5);
            }
          }
          break;
        case "m":
          if (down && !repeat && playerRef) {
            playerRef.current.muted(!playerRef.current.muted());
          }
          break;
        case " ":
          if (down && playerRef) {
            if (playerRef.current.paused()) {
              playerRef.current.play();
            } else {
              playerRef.current.pause();
            }
          }
          break;
      }
    },
    // only update when preview only changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerRef.current, previewOnly],
  );
  useKeyboardListener(
    ["ArrowLeft", "ArrowRight", "m", " "],
    onKeyboardShortcut,
  );

  // initial state

  const initialPlaybackSource = useMemo(() => {
    const date = new Date(timeRange.start * 1000);
    return {
      src: `${apiHost}vod/${date.getFullYear()}-${
        date.getMonth() + 1
      }/${date.getDate()}/${date.getHours()}/${camera}/${timezone.replaceAll(
        "/",
        ",",
      )}/master.m3u8`,
      type: "application/vnd.apple.mpegurl",
    };
    // we only want to calculate this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // state of playback player

  const recordingParams = useMemo(() => {
    return {
      before: timeRange.end,
      after: timeRange.start,
    };
  }, [timeRange]);
  const { data: recordings } = useSWR<Recording[]>(
    previewOnly && onClick == undefined
      ? null
      : [`${camera}/recordings`, recordingParams],
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!controller || (!previewOnly && !recordings)) {
      return;
    }

    const date = new Date(timeRange.start * 1000);
    const playbackUri = `${apiHost}vod/${date.getFullYear()}-${
      date.getMonth() + 1
    }/${date.getDate()}/${date.getHours()}/${camera}/${timezone.replaceAll(
      "/",
      ",",
    )}/master.m3u8`;

    controller.newPlayback({
      recordings: recordings ?? [],
      playbackUri,
    });

    // we only want this to change when recordings update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, recordings]);

  return (
    <div
      className={`relative ${className ?? ""} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div
        className={`w-full relative ${
          previewOnly || isScrubbing ? "hidden" : "visible"
        }`}
      >
        <VideoPlayer
          options={{
            preload: "auto",
            autoplay: !previewOnly,
            sources: [initialPlaybackSource],
            aspectRatio: wideVideo ? undefined : "16:9",
            controlBar: {
              remainingTimeDisplay: false,
              progressControl: {
                seekBar: false,
              },
            },
          }}
          seekOptions={{ forward: 10, backward: 5 }}
          onReady={(player) => {
            playerRef.current = player;
          }}
          onDispose={() => {
            playerRef.current = null;
          }}
        >
          {config && focusedItem && (
            <TimelineEventOverlay
              timeline={focusedItem}
              cameraConfig={config.cameras[camera]}
            />
          )}
        </VideoPlayer>
      </div>
      <PreviewVideoPlayer
        className={`${isScrubbing ? "visible" : "hidden"} ${className ?? ""}`}
        camera={camera}
        timeRange={timeRange}
        cameraPreviews={cameraPreviews}
        onControllerReady={(previewController) => {
          setPreviewController(previewController);
        }}
        onClick={onClick}
      />
    </div>
  );
}

export class DynamicVideoController {
  // main state
  public camera = "";
  private playerController: Player;
  private previewController: PreviewVideoController;
  private setScrubbing: (isScrubbing: boolean) => void;
  private setFocusedItem: (timeline: Timeline) => void;
  private playerMode: PlayerMode = "playback";

  // playback
  private recordings: Recording[] = [];
  private annotationOffset: number;
  private timeToStart: number | undefined = undefined;
  private canPlay: boolean = false;

  // listeners
  private playerProgressListener: (() => void) | null = null;
  private playerEndedListener: (() => void) | null = null;
  private canPlayListener: (() => void) | null = null;

  constructor(
    camera: string,
    playerController: Player,
    previewController: PreviewVideoController,
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
    this.playerController.src({
      src: newPlayback.playbackUri,
      type: "application/vnd.apple.mpegurl",
    });
    this.canPlay = false;

    if (this.timeToStart) {
      this.seekToTimestamp(this.timeToStart);
      this.timeToStart = undefined;
    }
  }

  autoPlay(play: boolean) {
    this.playerController.autoplay(play);
  }

  seekToTimestamp(time: number, play: boolean = false) {
    if (this.playerMode != "playback") {
      this.playerMode = "playback";
      this.setScrubbing(false);
    }

    if (this.recordings.length == 0) {
      this.timeToStart = time;
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
    this.playerController.currentTime(seekSeconds);

    if (play) {
      this.playerController.play();
    } else {
      this.playerController.pause();
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

  onCanPlay(listener: (() => void) | null) {
    if (this.canPlayListener) {
      this.playerController.off("canplay", this.canPlayListener);
      this.canPlayListener = null;
    }

    if (listener) {
      this.canPlayListener = () => {
        this.canPlay = true;
        listener();
      };
      this.playerController.on("canplay", this.canPlayListener);
    }
  }

  onPlayerTimeUpdate(listener: ((timestamp: number) => void) | null) {
    if (this.playerProgressListener) {
      this.playerController.off("timeupdate", this.playerProgressListener);
      this.playerProgressListener = null;
    }

    if (listener) {
      this.playerProgressListener = () => {
        if (this.canPlay) {
          listener(this.getProgress(this.playerController.currentTime() || 0));
        }
      };
      this.playerController.on("timeupdate", this.playerProgressListener);
    }
  }

  onClipChangedEvent(listener: ((dir: "forward") => void) | null) {
    if (this.playerEndedListener) {
      this.playerController.off("ended", this.playerEndedListener);
      this.playerEndedListener = null;
    }

    if (listener) {
      this.playerEndedListener = () => listener("forward");
      this.playerController.on("ended", this.playerEndedListener);
    }
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
