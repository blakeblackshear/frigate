import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useApiHost } from "@/api";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { Recording } from "@/types/record";
import { Preview } from "@/types/preview";
import PreviewPlayer, { PreviewController } from "../PreviewPlayer";
import { DynamicVideoController } from "./DynamicVideoController";
import HlsVideoPlayer, { HlsSource } from "../HlsVideoPlayer";
import { useDetailStream } from "@/context/detail-stream-context";
import { TimeRange } from "@/types/timeline";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { VideoResolutionType } from "@/types/live";
import axios from "axios";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  calculateInpointOffset,
  calculateSeekPosition,
} from "@/utils/videoUtil";
import { isFirefox } from "react-device-detect";

type PlaybackPhase =
  | "idle"
  | "loadingSource"
  | "awaitingMetadata"
  | "ready"
  | "buffering"
  | "error";

type PlaybackSessionState = {
  sessionId: number;
  phase: PlaybackPhase;
};

type PlaybackSessionAction =
  | {
      type: "beginSession";
      sessionId: number;
      phase: Extract<PlaybackPhase, "loadingSource" | "awaitingMetadata">;
    }
  | {
      type: "setPhase";
      sessionId: number;
      phase: PlaybackPhase;
    };

function playbackSessionReducer(
  state: PlaybackSessionState,
  action: PlaybackSessionAction,
): PlaybackSessionState {
  if (action.sessionId < state.sessionId) {
    return state;
  }

  if (action.type === "beginSession") {
    if (action.sessionId <= state.sessionId) {
      return state;
    }

    return {
      sessionId: action.sessionId,
      phase: action.phase,
    };
  }

  return {
    sessionId: action.sessionId,
    phase: action.phase,
  };
}

/**
 * Dynamically switches between video playback and scrubbing preview player.
 */
type DynamicVideoPlayerProps = {
  className?: string;
  camera: string;
  timeRange: TimeRange;
  cameraPreviews: Preview[];
  startTimestamp?: number;
  isScrubbing: boolean;
  hotKeys: boolean;
  supportsFullscreen: boolean;
  fullscreen: boolean;
  onControllerReady: (controller: DynamicVideoController) => void;
  onTimestampUpdate?: (timestamp: number) => void;
  onClipEnded?: () => void;
  onSeekToTime?: (timestamp: number, play?: boolean) => void;
  setFullResolution: React.Dispatch<React.SetStateAction<VideoResolutionType>>;
  toggleFullscreen: () => void;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
  transformedOverlay?: ReactNode;
};
export default function DynamicVideoPlayer({
  className,
  camera,
  timeRange,
  cameraPreviews,
  startTimestamp,
  isScrubbing,
  hotKeys,
  supportsFullscreen,
  fullscreen,
  onControllerReady,
  onTimestampUpdate,
  onClipEnded,
  onSeekToTime,
  setFullResolution,
  toggleFullscreen,
  containerRef,
  transformedOverlay,
}: DynamicVideoPlayerProps) {
  const { t } = useTranslation(["components/player"]);
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");

  // for detail stream context in History
  const {
    isDetailMode,
    camera: contextCamera,
    currentTime,
  } = useDetailStream();

  // controlling playback

  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [previewController, setPreviewController] =
    useState<PreviewController | null>(null);
  const [noRecording, setNoRecording] = useState(false);
  const controller = useMemo(() => {
    if (!config || !playerRef.current || !previewController) {
      return undefined;
    }

    return new DynamicVideoController(
      camera,
      playerRef.current,
      previewController,
      (config.cameras[camera]?.detect?.annotation_offset || 0) / 1000,
      isScrubbing ? "scrubbing" : "playback",
      setNoRecording,
      () => {},
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

  // initial state

  const [playbackSession, dispatchPlaybackSession] = useReducer(
    playbackSessionReducer,
    {
      sessionId: 0,
      phase: "idle" as PlaybackPhase,
    },
  );
  const playbackSessionCounterRef = useRef(0);

  // Don't set source until recordings load - we need accurate startPosition
  // to avoid hls.js clamping to video end when startPosition exceeds duration
  const [source, setSource] = useState<HlsSource | undefined>(undefined);

  const beginPlaybackSession = useCallback(
    (phase: Extract<PlaybackPhase, "loadingSource" | "awaitingMetadata">) => {
      playbackSessionCounterRef.current += 1;
      const nextSessionId = playbackSessionCounterRef.current;

      dispatchPlaybackSession({
        type: "beginSession",
        sessionId: nextSessionId,
        phase,
      });
    },
    [],
  );

  const onPlayerLoaded = useCallback(() => {
    dispatchPlaybackSession({
      type: "setPhase",
      sessionId: playbackSession.sessionId,
      phase: "ready",
    });

    if (!controller || !startTimestamp) {
      return;
    }

    controller.seekToTimestamp(startTimestamp, true);
  }, [startTimestamp, controller, playbackSession.sessionId]);

  const onTimeUpdate = useCallback(
    (time: number) => {
      if (isScrubbing || !controller || !onTimestampUpdate || time == 0) {
        return;
      }

      if (playbackSession.phase === "buffering") {
        dispatchPlaybackSession({
          type: "setPhase",
          sessionId: playbackSession.sessionId,
          phase: "ready",
        });
      }

      onTimestampUpdate(controller.getProgress(time));
    },
    [
      controller,
      onTimestampUpdate,
      isScrubbing,
      playbackSession.phase,
      playbackSession.sessionId,
    ],
  );

  const onUploadFrameToPlus = useCallback(
    (playTime: number) => {
      if (!controller) {
        return;
      }

      const time = controller.getProgress(playTime);
      return axios.post(`/${camera}/plus/${time}`);
    },
    [camera, controller],
  );

  // state of playback player

  const recordingParams = useMemo(
    () => ({
      before: timeRange.before,
      after: timeRange.after,
    }),
    [timeRange],
  );
  const { data: recordings } = useSWR<Recording[]>(
    [`${camera}/recordings`, recordingParams],
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    beginPlaybackSession("loadingSource");
    setNoRecording(false);
    setSource(undefined);
  }, [
    beginPlaybackSession,
    camera,
    recordingParams.after,
    recordingParams.before,
  ]);

  useEffect(() => {
    if (!recordings) {
      return;
    }

    if (recordings.length == 0) {
      setSource(undefined);
      setNoRecording(true);
      dispatchPlaybackSession({
        type: "setPhase",
        sessionId: playbackSession.sessionId,
        phase: "idle",
      });
      return;
    }

    let startPosition = undefined;

    if (startTimestamp) {
      const inpointOffset = calculateInpointOffset(
        recordingParams.after,
        (recordings || [])[0],
      );

      startPosition = calculateSeekPosition(
        startTimestamp,
        recordings,
        inpointOffset,
      );
    }

    const nextSource = {
      playlist: `${apiHost}vod/${camera}/start/${recordingParams.after}/end/${recordingParams.before}/master.m3u8`,
      startPosition,
    };

    setSource(nextSource);
    setNoRecording(false);
    dispatchPlaybackSession({
      type: "setPhase",
      sessionId: playbackSession.sessionId,
      phase: "awaitingMetadata",
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordings, playbackSession.sessionId]);

  useEffect(() => {
    if (!controller || !recordings?.length) {
      return;
    }

    if (playerRef.current) {
      playerRef.current.autoplay = !isScrubbing;
    }

    controller.newPlayback({
      recordings: recordings ?? [],
      timeRange,
    });

    // we only want this to change when controller or recordings update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, recordings]);

  const inpointOffset = useMemo(
    () => calculateInpointOffset(recordingParams.after, (recordings || [])[0]),
    [recordingParams, recordings],
  );

  const onValidateClipEnd = useCallback(
    (currentTime: number) => {
      if (!onClipEnded || !controller || !recordings) {
        return;
      }

      if (!isFirefox) {
        onClipEnded();
      }

      // Firefox has a bug where clipEnded can be called prematurely due to buffering
      // we need to validate if the current play-point is truly at the end of available recordings

      const lastRecordingTime = recordings.at(-1)?.start_time;

      if (
        !lastRecordingTime ||
        controller.getProgress(currentTime) < lastRecordingTime
      ) {
        return;
      }

      onClipEnded();
    },
    [onClipEnded, controller, recordings],
  );

  const showPreview =
    isScrubbing ||
    (!noRecording &&
      playbackSession.phase !== "ready" &&
      playbackSession.phase !== "buffering");
  const showLoadingIndicator =
    !isScrubbing &&
    !noRecording &&
    (playbackSession.phase === "loadingSource" ||
      playbackSession.phase === "awaitingMetadata" ||
      playbackSession.phase === "buffering");
  const showNoRecordings = !isScrubbing && noRecording;

  return (
    <>
      {source && (
        <HlsVideoPlayer
          videoRef={playerRef}
          containerRef={containerRef}
          visible={
            !isScrubbing &&
            (playbackSession.phase === "ready" ||
              playbackSession.phase === "buffering")
          }
          currentSource={source}
          hotKeys={hotKeys}
          supportsFullscreen={supportsFullscreen}
          fullscreen={fullscreen}
          inpointOffset={inpointOffset}
          onTimeUpdate={onTimeUpdate}
          onPlayerLoaded={onPlayerLoaded}
          onClipEnded={onValidateClipEnd}
          onSeekToTime={(timestamp, play) => {
            if (onSeekToTime) {
              onSeekToTime(timestamp, play);
            }
          }}
          onPlaying={() => {
            if (isScrubbing) {
              playerRef.current?.pause();
            }

            setNoRecording(false);
            if (playbackSession.phase === "buffering") {
              dispatchPlaybackSession({
                type: "setPhase",
                sessionId: playbackSession.sessionId,
                phase: "ready",
              });
            }
          }}
          setFullResolution={setFullResolution}
          onUploadFrame={onUploadFrameToPlus}
          toggleFullscreen={toggleFullscreen}
          onError={(error) => {
            if (error == "stalled" && !isScrubbing) {
              dispatchPlaybackSession({
                type: "setPhase",
                sessionId: playbackSession.sessionId,
                phase: "buffering",
              });
            } else {
              dispatchPlaybackSession({
                type: "setPhase",
                sessionId: playbackSession.sessionId,
                phase: "error",
              });
            }
          }}
          isDetailMode={isDetailMode}
          camera={contextCamera || camera}
          currentTimeOverride={currentTime}
          transformedOverlay={transformedOverlay}
        />
      )}
      <PreviewPlayer
        className={cn(className, showPreview ? "visible" : "hidden")}
        camera={camera}
        timeRange={timeRange}
        cameraPreviews={cameraPreviews}
        startTime={startTimestamp}
        isScrubbing={isScrubbing}
        onControllerReady={(previewController) =>
          setPreviewController(previewController)
        }
      />
      {showLoadingIndicator && (
        <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      )}
      {showNoRecordings && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {t("noRecordingsFoundForThisTime")}
        </div>
      )}
    </>
  );
}
