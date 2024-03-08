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
  preloadRecordings: boolean;
  onControllerReady: (controller: DynamicVideoController) => void;
  onClick?: () => void;
};
export default function DynamicVideoPlayer({
  className,
  camera,
  timeRange,
  cameraPreviews,
  previewOnly = false,
  preloadRecordings = true,
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

  const [playerRef, setPlayerRef] = useState<Player | undefined>(undefined);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(previewOnly);
  const [focusedItem, setFocusedItem] = useState<Timeline | undefined>(
    undefined,
  );
  const controller = useMemo(() => {
    if (!config || !playerRef || !previewRef.current) {
      return undefined;
    }

    return new DynamicVideoController(
      camera,
      playerRef,
      previewRef,
      (config.cameras[camera]?.detect?.annotation_offset || 0) / 1000,
      previewOnly ? "scrubbing" : "playback",
      setIsScrubbing,
      setFocusedItem,
    );
    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, config, playerRef, previewRef]);

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
    if (!controller || !playerRef) {
      return;
    }

    if (previewOnly == initPreviewOnly) {
      return;
    }

    if (previewOnly) {
      playerRef.autoplay(false);
    } else {
      controller.seekToTimestamp(playerRef.currentTime() || 0, true);
    }

    setInitPreviewOnly(previewOnly);
    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, previewOnly]);

  const [hasRecordingAtTime, setHasRecordingAtTime] = useState(true);

  // keyboard control

  const onKeyboardShortcut = useCallback(
    (key: string, down: boolean, repeat: boolean) => {
      switch (key) {
        case "ArrowLeft":
          if (down) {
            const currentTime = playerRef?.currentTime();

            if (currentTime) {
              playerRef?.currentTime(Math.max(0, currentTime - 5));
            }
          }
          break;
        case "ArrowRight":
          if (down) {
            const currentTime = playerRef?.currentTime();

            if (currentTime) {
              playerRef?.currentTime(currentTime + 5);
            }
          }
          break;
        case "m":
          if (down && !repeat && playerRef) {
            playerRef.muted(!playerRef.muted());
          }
          break;
        case " ":
          if (down && playerRef) {
            if (playerRef.paused()) {
              playerRef.play();
            } else {
              playerRef.pause();
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
      timeRange,
    });

    // we only want this to change when recordings update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, recordings]);

  return (
    <div
      className={`relative ${className ?? ""} ${onClick ? (hasRecordingAtTime ? "cursor-pointer" : "") : ""}`}
      onClick={onClick}
    >
      {preloadRecordings && (
        <div
          className={`w-full relative ${
            previewOnly || (currentPreview != undefined && isScrubbing)
              ? "hidden"
              : "visible"
          }`}
        >
          <VideoPlayer
            options={{
              preload: "auto",
              autoplay: !previewOnly,
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
              setPlayerRef(player);
            }}
            onDispose={() => {
              setPlayerRef(undefined);
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
        onLoadedData={() => controller?.previewReady()}
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
  public camera = "";
  private playerRef: Player;
  private previewRef: MutableRefObject<HTMLVideoElement | null>;
  private setScrubbing: (isScrubbing: boolean) => void;
  private setFocusedItem: (timeline: Timeline) => void;
  private playerMode: PlayerMode = "playback";
  private timeRange: { start: number; end: number } | undefined = undefined;

  // playback
  private recordings: Recording[] = [];
  private annotationOffset: number;
  private timeToStart: number | undefined = undefined;

  // preview
  private preview: Preview | undefined = undefined;
  private timeToSeek: number | undefined = undefined;
  private seeking = false;

  // listeners
  private playerProgressListener: (() => void) | null = null;
  private playerEndedListener: (() => void) | null = null;
  private canPlayListener: (() => void) | null = null;

  constructor(
    camera: string,
    playerRef: Player,
    previewRef: MutableRefObject<HTMLVideoElement | null>,
    annotationOffset: number,
    defaultMode: PlayerMode,
    setScrubbing: (isScrubbing: boolean) => void,
    setFocusedItem: (timeline: Timeline) => void,
  ) {
    this.camera = camera;
    this.playerRef = playerRef;
    this.previewRef = previewRef;
    this.annotationOffset = annotationOffset;
    this.playerMode = defaultMode;
    this.setScrubbing = setScrubbing;
    this.setFocusedItem = setFocusedItem;
  }

  newPlayback(newPlayback: DynamicPlayback) {
    this.recordings = newPlayback.recordings;

    this.playerRef.src({
      src: newPlayback.playbackUri,
      type: "application/vnd.apple.mpegurl",
    });

    if (this.timeToStart) {
      this.seekToTimestamp(this.timeToStart);
      this.timeToStart = undefined;
    }

    this.preview = newPlayback.preview;

    if (this.preview) {
      this.seeking = false;
      this.timeToSeek = undefined;
    }

    this.timeRange = newPlayback.timeRange;
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
    this.playerRef.currentTime(seekSeconds);

    if (play) {
      this.playerRef.play();
    } else {
      this.playerRef.pause();
    }
  }

  onCanPlay(listener: (() => void) | null) {
    if (listener) {
      this.canPlayListener = listener;
      this.playerRef.on("canplay", this.canPlayListener);
    } else {
      if (this.canPlayListener) {
        this.playerRef.off("canplay", this.canPlayListener);
        this.canPlayListener = null;
      }
    }
  }

  seekToTimelineItem(timeline: Timeline) {
    this.playerRef.pause();
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

  onPlayerTimeUpdate(listener: ((timestamp: number) => void) | undefined) {
    if (this.playerProgressListener) {
      this.playerRef.off("timeupdate", this.playerProgressListener);
    }

    if (listener) {
      this.playerProgressListener = () =>
        listener(this.getProgress(this.playerRef.currentTime() || 0));
      this.playerRef.on("timeupdate", this.playerProgressListener);
    }
  }

  onClipChangedEvent(listener: ((dir: "forward") => void) | undefined) {
    if (this.playerEndedListener) {
      this.playerRef.off("ended", this.playerEndedListener);
    }

    if (listener) {
      this.playerEndedListener = () => listener("forward");
      this.playerRef.on("ended", this.playerEndedListener);
    }
  }

  scrubToTimestamp(time: number) {
    if (!this.preview || !this.timeRange) {
      return;
    }

    if (time < this.preview.start || time > this.preview.end) {
      return;
    }

    if (this.playerMode != "scrubbing") {
      this.playerMode = "scrubbing";
      this.playerRef.pause();
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
