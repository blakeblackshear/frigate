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
import ActivityIndicator from "../ui/activity-indicator";
import useKeyboardListener from "@/hooks/use-keyboard-listener";

/**
 * Dynamically switches between video playback and scrubbing preview player.
 */
type DynamicVideoPlayerProps = {
  className?: string;
  camera: string;
  timeRange: { start: number; end: number };
  cameraPreviews: Preview[];
  onControllerReady?: (controller: DynamicVideoController) => void;
};
export default function DynamicVideoPlayer({
  className,
  camera,
  timeRange,
  cameraPreviews,
  onControllerReady,
}: DynamicVideoPlayerProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useMemo(
    () =>
      config?.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    [config]
  );

  // playback behavior
  const tallVideo = useMemo(() => {
    if (!config) {
      return false;
    }

    return (
      config.cameras[camera].detect.width /
        config.cameras[camera].detect.height <
      1.7
    );
  }, [config]);

  // controlling playback

  const playerRef = useRef<Player | undefined>(undefined);
  const previewRef = useRef<Player | undefined>(undefined);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hasPreview, setHasPreview] = useState(false);
  const [focusedItem, setFocusedItem] = useState<Timeline | undefined>(
    undefined
  );
  const controller = useMemo(() => {
    if (!config) {
      return undefined;
    }

    return new DynamicVideoController(
      playerRef,
      previewRef,
      (config.cameras[camera]?.detect?.annotation_offset || 0) / 1000,
      setIsScrubbing,
      setFocusedItem
    );
  }, [config]);

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
    [playerRef]
  );
  useKeyboardListener(
    ["ArrowLeft", "ArrowRight", "m", " "],
    onKeyboardShortcut
  );

  // initial state

  const initialPlaybackSource = useMemo(() => {
    const date = new Date(timeRange.start * 1000);
    return {
      src: `${apiHost}vod/${date.getFullYear()}-${
        date.getMonth() + 1
      }/${date.getDate()}/${date.getHours()}/${camera}/${timezone.replaceAll(
        "/",
        ","
      )}/master.m3u8`,
      type: "application/vnd.apple.mpegurl",
    };
  }, []);
  const initialPreviewSource = useMemo(() => {
    const preview = cameraPreviews.find(
      (preview) =>
        Math.round(preview.start) >= timeRange.start &&
        Math.floor(preview.end) <= timeRange.end
    );

    if (preview) {
      setHasPreview(true);
      return {
        src: preview.src,
        type: preview.type,
      };
    } else {
      setHasPreview(false);
      return undefined;
    }
  }, []);

  // state of playback player

  const recordingParams = useMemo(() => {
    return {
      before: timeRange.end,
      after: timeRange.start,
    };
  }, [timeRange]);
  const { data: recordings } = useSWR<Recording[]>(
    [`${camera}/recordings`, recordingParams],
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!controller || !recordings || recordings.length == 0) {
      return;
    }

    const date = new Date(timeRange.start * 1000);
    const playbackUri = `${apiHost}vod/${date.getFullYear()}-${
      date.getMonth() + 1
    }/${date.getDate()}/${date.getHours()}/${camera}/${timezone.replaceAll(
      "/",
      ","
    )}/master.m3u8`;

    const preview = cameraPreviews.find(
      (preview) =>
        Math.round(preview.start) >= timeRange.start &&
        Math.floor(preview.end) <= timeRange.end
    );
    setHasPreview(preview != undefined);

    controller.newPlayback({
      recordings,
      playbackUri,
      preview,
    });
  }, [controller, recordings]);

  if (!controller) {
    return <ActivityIndicator />;
  }

  //console.log(`${config.detect.width / config.detect.height < 1.7 ? "16:9" : undefined}`)

  return (
    <div className={className}>
      <div
        className={`w-full relative ${
          hasPreview && isScrubbing ? "hidden" : "visible"
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

            if (onControllerReady) {
              onControllerReady(controller);
            }
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
      <div
        className={`w-full ${hasPreview && isScrubbing ? "visible" : "hidden"}`}
      >
        <VideoPlayer
          options={{
            preload: "auto",
            autoplay: true,
            controls: false,
            muted: true,
            loadingSpinner: false,
            sources: hasPreview ? initialPreviewSource : null,
            aspectRatio: tallVideo ? "16:9" : undefined,
          }}
          seekOptions={{}}
          onReady={(player) => {
            previewRef.current = player;
            player.pause();
            player.on("seeked", () => controller.finishedSeeking());
          }}
          onDispose={() => {
            previewRef.current = undefined;
          }}
        />
      </div>
    </div>
  );
}

export class DynamicVideoController {
  // main state
  private playerRef: MutableRefObject<Player | undefined>;
  private previewRef: MutableRefObject<Player | undefined>;
  private setScrubbing: (isScrubbing: boolean) => void;
  private setFocusedItem: (timeline: Timeline) => void;
  private playerMode: "playback" | "scrubbing" = "playback";

  // playback
  private recordings: Recording[] = [];
  private onPlaybackTimestamp: ((time: number) => void) | undefined = undefined;
  private annotationOffset: number;
  private timeToStart: number | undefined = undefined;

  // preview
  private preview: Preview | undefined = undefined;
  private timeToSeek: number | undefined = undefined;
  private seeking = false;

  constructor(
    playerRef: MutableRefObject<Player | undefined>,
    previewRef: MutableRefObject<Player | undefined>,
    annotationOffset: number,
    setScrubbing: (isScrubbing: boolean) => void,
    setFocusedItem: (timeline: Timeline) => void
  ) {
    this.playerRef = playerRef;
    this.previewRef = previewRef;
    this.annotationOffset = annotationOffset;
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
    if (this.preview && this.previewRef.current) {
      this.previewRef.current.src({
        src: this.preview.src,
        type: this.preview.type,
      });
    }
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

  onPlayerTimeUpdate(listener: (timestamp: number) => void) {
    this.onPlaybackTimestamp = listener;
  }

  scrubToTimestamp(time: number) {
    if (this.playerMode != "scrubbing") {
      this.playerMode = "scrubbing";
      this.playerRef.current?.pause();
      this.setScrubbing(true);
    }

    if (this.preview) {
      if (this.seeking) {
        this.timeToSeek = time;
      } else {
        this.previewRef.current?.currentTime(time - this.preview.start);
        this.seeking = true;
      }
    }
  }

  finishedSeeking() {
    if (!this.preview || this.playerMode == "playback") {
      return;
    }

    if (
      this.timeToSeek &&
      this.timeToSeek != this.previewRef.current?.currentTime()
    ) {
      this.previewRef.current?.currentTime(
        this.timeToSeek - this.preview.start
      );
    } else {
      this.seeking = false;
    }
  }
}
