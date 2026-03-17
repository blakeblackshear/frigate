import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApiHost } from "@/api";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  Recording,
  RecordingPlaybackPreference,
} from "@/types/record";
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
import { useUserPersistence } from "@/hooks/use-user-persistence";
import usePlaybackCapabilities from "@/hooks/use-playback-capabilities";
import { chooseRecordingPlayback } from "@/utils/recordingPlayback";
import {
  calculateInpointOffset,
  calculateSeekPosition,
} from "@/utils/videoUtil";
import { isFirefox } from "react-device-detect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout>();
  const [playbackPreference, setPlaybackPreference] =
    useUserPersistence<RecordingPlaybackPreference>(
      `${camera}-recording-playback-v2`,
      "sub",
    );

  // Don't set source until recordings load - we need accurate startPosition
  // to avoid hls.js clamping to video end when startPosition exceeds duration
  const [source, setSource] = useState<HlsSource | undefined>(undefined);

  // start at correct time

  useEffect(() => {
    if (!isScrubbing) {
      setLoadingTimeout(setTimeout(() => setIsLoading(true), 1000));
    }

    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
    // we only want trigger when scrubbing state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, isScrubbing]);

  const onPlayerLoaded = useCallback(() => {
    if (!controller || !startTimestamp) {
      return;
    }

    controller.seekToTimestamp(startTimestamp, true);
  }, [startTimestamp, controller]);

  const onTimeUpdate = useCallback(
    (time: number) => {
      if (isScrubbing || !controller || !onTimestampUpdate || time == 0) {
        return;
      }

      if (isLoading) {
        setIsLoading(false);
      }

      if (isBuffering) {
        setIsBuffering(false);
      }

      onTimestampUpdate(controller.getProgress(time));
    },
    [controller, onTimestampUpdate, isBuffering, isLoading, isScrubbing],
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
  const { data: allRecordings } = useSWR<Recording[]>(
    [`${camera}/recordings`, { ...recordingParams, variant: "all" }],
    { revalidateOnFocus: false },
  );
  const recordings = useMemo(() => {
    if (!allRecordings?.length) {
      return allRecordings;
    }

    const mainRecordings = allRecordings.filter(
      (recording) => (recording.variant || "main") === "main",
    );

    return mainRecordings.length > 0 ? mainRecordings : allRecordings;
  }, [allRecordings]);
  const codecNames = useMemo(
    () =>
      Array.from(
        new Set((allRecordings ?? []).map((recording) => recording.codec_name)),
      ),
    [allRecordings],
  );
  const playbackCapabilities = usePlaybackCapabilities(codecNames);

  useEffect(() => {
    if (!recordings?.length) {
      if (recordings?.length == 0) {
        setNoRecording(true);
      }

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

    const vodPath = `/vod/${camera}/start/${recordingParams.after}/end/${recordingParams.before}/master.m3u8`;
    const decision = chooseRecordingPlayback({
      apiHost,
      config,
      recordings: allRecordings ?? recordings,
      preference: playbackPreference ?? "sub",
      vodPath,
      capabilities: playbackCapabilities,
    });
    setSource({
      playlist: decision.url,
      startPosition,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    apiHost,
    camera,
    recordingParams.after,
    recordingParams.before,
    allRecordings,
    recordings,
    startTimestamp,
    playbackPreference,
    playbackCapabilities,
    config?.transcode_proxy?.enabled,
    config?.transcode_proxy?.vod_proxy_url,
  ]);

  useEffect(() => {
    if (!controller || !recordings?.length) {
      return;
    }

    if (playerRef.current) {
      playerRef.current.autoplay = !isScrubbing;
    }

    setLoadingTimeout(setTimeout(() => setIsLoading(true), 1000));

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

  return (
    <>
      {source && (
        <HlsVideoPlayer
          videoRef={playerRef}
          containerRef={containerRef}
          visible={!(isScrubbing || isLoading)}
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

            if (loadingTimeout) {
              clearTimeout(loadingTimeout);
            }

            setNoRecording(false);
          }}
          setFullResolution={setFullResolution}
          onUploadFrame={onUploadFrameToPlus}
          toggleFullscreen={toggleFullscreen}
          onError={(error) => {
            if (error == "stalled" && !isScrubbing) {
              setIsBuffering(true);
            }
          }}
          isDetailMode={isDetailMode}
          camera={contextCamera || camera}
          currentTimeOverride={currentTime}
          transformedOverlay={transformedOverlay}
        />
      )}
      {!isScrubbing && source && (
        <div className="absolute right-3 top-3 z-50">
          <Select
            value={playbackPreference ?? "sub"}
            onValueChange={(value) =>
              setPlaybackPreference(value as RecordingPlaybackPreference)
            }
          >
            <SelectTrigger className="h-8 w-32 bg-background/90 text-xs backdrop-blur">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="main">Main</SelectItem>
              <SelectItem value="sub">Sub</SelectItem>
              <SelectItem value="transcoded">Transcoded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <PreviewPlayer
        className={cn(
          className,
          isScrubbing || isLoading ? "visible" : "hidden",
        )}
        camera={camera}
        timeRange={timeRange}
        cameraPreviews={cameraPreviews}
        startTime={startTimestamp}
        isScrubbing={isScrubbing}
        onControllerReady={(previewController) =>
          setPreviewController(previewController)
        }
      />
      {!isScrubbing && (isLoading || isBuffering) && !noRecording && (
        <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      )}
      {!isScrubbing && !isLoading && noRecording && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {t("noRecordingsFoundForThisTime")}
        </div>
      )}
    </>
  );
}
