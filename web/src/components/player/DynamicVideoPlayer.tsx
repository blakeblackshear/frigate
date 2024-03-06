import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import VideoPlayer from "./VideoPlayer";
import Player from "video.js/dist/types/player";
import TimelineEventOverlay from "../overlay/TimelineDataOverlay";
import { useApiHost } from "@/api";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import ActivityIndicator from "../indicators/activity-indicator";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { Recording } from "@/types/record";
import { Preview } from "@/types/preview";
import { DynamicPlayback } from "@/types/playback";

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
  const tallVideo = useMemo(() => {
    if (!config) {
      return false;
    }

    return (
      config.cameras[camera].detect.width /
        config.cameras[camera].detect.height <
      1
    );
  }, [camera, config]);

  // controlling playback

  const playerRef = useRef<Player | undefined>(undefined);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(previewOnly);
  const [focusedItem, setFocusedItem] = useState<Timeline | undefined>(
    undefined,
  );
  const controller = useMemo(() => {
    if (!config) {
      return undefined;
    }

    return new DynamicVideoController(
      playerRef,
      previewRef,
      (config.cameras[camera]?.detect?.annotation_offset || 0) / 1000,
      previewOnly ? "scrubbing" : "playback",
      setIsScrubbing,
      setFocusedItem,
    );
  }, [camera, config, previewOnly]);

  useEffect(() => {
    if (!playerRef.current && !previewRef.current) {
      return;
    }

    if (controller) {
      onControllerReady(controller);
    }

    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRef, previewRef]);

  const [hasRecordingAtTime, setHasRecordingAtTime] = useState(true);

  // keyboard control

  const onKeyboardShortcut = useCallback(
    (key: string, down: boolean, repeat: boolean) => {
      switch (key) {
        case "ArrowLeft":
          if (down) {
            const currentTime = playerRef.current?.currentTime();

            if (currentTime) {
              playerRef.current?.currentTime(Math.max(0, currentTime - 5));
            }
          }
          break;
        case "ArrowRight":
          if (down) {
            const currentTime = playerRef.current?.currentTime();

            if (currentTime) {
              playerRef.current?.currentTime(currentTime + 5);
            }
          }
          break;
        case "m":
          if (down && !repeat && playerRef.current) {
            playerRef.current.muted(!playerRef.current.muted());
          }
          break;
        case " ":
          if (down && playerRef.current) {
            if (playerRef.current.paused()) {
              playerRef.current.play();
            } else {
              playerRef.current.pause();
            }
          }
          break;
      }
    },
    [playerRef],
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
  const initialPreview = useMemo(() => {
    return cameraPreviews.find(
      (preview) =>
        preview.camera == camera &&
        Math.round(preview.start) >= timeRange.start &&
        Math.floor(preview.end) <= timeRange.end,
    );

    // we only want to calculate this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [currentPreview, setCurrentPreview] = useState(initialPreview);

  const onPreviewSeeked = useCallback(() => {
    if (!controller) {
      return;
    }

    controller.finishedSeeking();

    if (currentPreview && previewOnly && previewRef.current && onClick) {
      setHasRecordingAtTime(
        controller.hasRecordingAtTime(
          currentPreview.start + previewRef.current.currentTime,
        ),
      );
    }
  }, [controller, currentPreview, onClick, previewOnly]);

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

    const preview = cameraPreviews.find(
      (preview) =>
        preview.camera == camera &&
        Math.round(preview.start) >= timeRange.start &&
        Math.floor(preview.end) <= timeRange.end,
    );
    setCurrentPreview(preview);

    if (preview && previewRef.current) {
      previewRef.current.load();
    }

    controller.newPlayback({
      recordings: recordings ?? [],
      playbackUri,
      preview,
    });

    // we only want this to change when recordings update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, recordings]);

  if (!controller) {
    return <ActivityIndicator />;
  }

  return (
    <div
      className={`relative ${className ?? ""} ${onClick ? (hasRecordingAtTime ? "cursor-pointer" : "") : ""}`}
      onClick={onClick}
    >
      {!previewOnly && (
        <div
          className={`w-full relative ${
            currentPreview != undefined && isScrubbing ? "hidden" : "visible"
          }`}
        >
          <VideoPlayer
            options={{
              preload: "auto",
              autoplay: true,
              sources: [initialPlaybackSource],
              aspectRatio: tallVideo ? "16:9" : undefined,
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
              player.on("playing", () => setFocusedItem(undefined));
              player.on("timeupdate", () => {
                controller.updateProgress(player.currentTime() || 0);
              });
              player.on("ended", () =>
                controller.fireClipChangeEvent("forward"),
              );
            }}
            onDispose={() => {
              playerRef.current = undefined;
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
      )}
      <video
        ref={previewRef}
        className={`size-full rounded-2xl ${currentPreview != undefined && (previewOnly || isScrubbing) ? "visible" : "hidden"} ${tallVideo ? "aspect-tall" : ""} bg-black`}
        preload="auto"
        autoPlay
        playsInline
        muted
        disableRemotePlayback
        onSeeked={onPreviewSeeked}
        onLoadedData={() => controller.previewReady()}
      >
        {currentPreview != undefined && (
          <source src={currentPreview.src} type={currentPreview.type} />
        )}
      </video>
    </div>
  );
}

export class DynamicVideoController {
  // main state
  private playerRef: MutableRefObject<Player | undefined>;
  private previewRef: MutableRefObject<HTMLVideoElement | null>;
  private setScrubbing: (isScrubbing: boolean) => void;
  private setFocusedItem: (timeline: Timeline) => void;
  private playerMode: PlayerMode = "playback";

  // playback
  private recordings: Recording[] = [];
  private onPlaybackTimestamp: ((time: number) => void) | undefined = undefined;
  private onClipChange: ((dir: "forward" | "backward") => void) | undefined =
    undefined;
  private annotationOffset: number;
  private timeToStart: number | undefined = undefined;
  private clipChangeLockout: boolean = true;

  // preview
  private preview: Preview | undefined = undefined;
  private timeToSeek: number | undefined = undefined;
  private seeking = false;
  private readyToScrub = true;

  constructor(
    playerRef: MutableRefObject<Player | undefined>,
    previewRef: MutableRefObject<HTMLVideoElement | null>,
    annotationOffset: number,
    defaultMode: PlayerMode,
    setScrubbing: (isScrubbing: boolean) => void,
    setFocusedItem: (timeline: Timeline) => void,
  ) {
    this.playerRef = playerRef;
    this.previewRef = previewRef;
    this.annotationOffset = annotationOffset;
    this.playerMode = defaultMode;
    this.setScrubbing = setScrubbing;
    this.setFocusedItem = setFocusedItem;
  }

  newPlayback(newPlayback: DynamicPlayback) {
    this.recordings = newPlayback.recordings;

    this.playerRef.current?.src({
      src: newPlayback.playbackUri,
      type: "application/vnd.apple.mpegurl",
    });

    if (this.timeToStart) {
      this.seekToTimestamp(this.timeToStart);
      this.timeToStart = undefined;
    }

    this.preview = newPlayback.preview;
  }

  seekToTimestamp(time: number, play: boolean = false) {
    if (this.playerMode != "playback") {
      this.playerMode = "playback";
      this.setScrubbing(false);
      this.timeToSeek = undefined;
      this.seeking = false;
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
    this.playerRef.current?.currentTime(seekSeconds);

    if (play) {
      this.playerRef.current?.play();
    }
  }

  seekToTimelineItem(timeline: Timeline) {
    this.playerRef.current?.pause();
    this.seekToTimestamp(timeline.timestamp + this.annotationOffset);
    this.setFocusedItem(timeline);
  }

  updateProgress(playerTime: number) {
    if (this.onPlaybackTimestamp) {
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

      this.onPlaybackTimestamp(timestamp);
    }
  }

  onPlayerTimeUpdate(listener: ((timestamp: number) => void) | undefined) {
    this.onPlaybackTimestamp = listener;
  }

  onClipChangedEvent(listener: (dir: "forward" | "backward") => void) {
    this.onClipChange = listener;
  }

  fireClipChangeEvent(dir: "forward" | "backward") {
    if (this.onClipChange) {
      this.onClipChange(dir);
    }
  }

  scrubToTimestamp(time: number) {
    if (!this.preview) {
      return;
    }

    if (!this.readyToScrub) {
      return;
    }

    if (time > this.preview.end) {
      if (this.clipChangeLockout) {
        return;
      }

      if (this.playerMode == "scrubbing") {
        this.playerMode = "playback";
        this.setScrubbing(false);
        this.timeToSeek = undefined;
        this.seeking = false;
        this.readyToScrub = false;
        this.clipChangeLockout = true;
        this.fireClipChangeEvent("forward");
      }
      return;
    }

    if (time < this.preview.start) {
      if (this.clipChangeLockout) {
        return;
      }

      if (this.playerMode == "scrubbing") {
        this.playerMode = "playback";
        this.setScrubbing(false);
        this.timeToSeek = undefined;
        this.seeking = false;
        this.readyToScrub = false;
        this.clipChangeLockout = true;
        this.fireClipChangeEvent("backward");
      }
      return;
    }

    if (this.playerMode != "scrubbing") {
      this.playerMode = "scrubbing";
      this.playerRef.current?.pause();
      this.setScrubbing(true);
    }

    if (this.seeking) {
      this.timeToSeek = time;
    } else {
      if (this.previewRef.current) {
        this.previewRef.current.currentTime = Math.max(
          0,
          time - this.preview.start,
        );
        this.seeking = true;
      }
    }
  }

  finishedSeeking() {
    if (
      !this.previewRef.current ||
      !this.preview ||
      this.playerMode == "playback"
    ) {
      return;
    }

    this.clipChangeLockout = false;

    if (
      this.timeToSeek &&
      this.timeToSeek != this.previewRef.current?.currentTime
    ) {
      this.previewRef.current.currentTime =
        this.timeToSeek - this.preview.start;
    } else {
      this.seeking = false;
    }
  }

  previewReady() {
    this.previewRef.current?.pause();
    this.readyToScrub = true;
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
