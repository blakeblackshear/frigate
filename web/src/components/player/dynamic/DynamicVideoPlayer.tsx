import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApiHost } from "@/api";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { Recording } from "@/types/record";
import { Preview } from "@/types/preview";
import PreviewPlayer, { PreviewController } from "../PreviewPlayer";
import { DynamicVideoController } from "./DynamicVideoController";
import HlsVideoPlayer from "../HlsVideoPlayer";
import { TimeRange } from "@/types/timeline";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { VideoResolutionType } from "@/types/live";
import axios from "axios";
import { cn } from "@/lib/utils";

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
  fullscreen: boolean;
  onControllerReady: (controller: DynamicVideoController) => void;
  onTimestampUpdate?: (timestamp: number) => void;
  onClipEnded?: () => void;
  setFullResolution: React.Dispatch<React.SetStateAction<VideoResolutionType>>;
  toggleFullscreen: () => void;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
};
export default function DynamicVideoPlayer({
  className,
  camera,
  timeRange,
  cameraPreviews,
  startTimestamp,
  isScrubbing,
  hotKeys,
  fullscreen,
  onControllerReady,
  onTimestampUpdate,
  onClipEnded,
  setFullResolution,
  toggleFullscreen,
  containerRef,
}: DynamicVideoPlayerProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");

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
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout>();
  const [source, setSource] = useState(
    `${apiHost}vod/${camera}/start/${timeRange.after}/end/${timeRange.before}/master.m3u8`,
  );

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

      onTimestampUpdate(controller.getProgress(time));
    },
    [controller, onTimestampUpdate, isScrubbing, isLoading],
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
    if (!controller || !recordings) {
      return;
    }

    if (playerRef.current) {
      playerRef.current.autoplay = !isScrubbing;
    }

    setSource(
      `${apiHost}vod/${camera}/start/${recordingParams.after}/end/${recordingParams.before}/master.m3u8`,
    );
    setLoadingTimeout(setTimeout(() => setIsLoading(true), 1000));

    controller.newPlayback({
      recordings: recordings ?? [],
      timeRange,
    });

    // we only want this to change when recordings update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, recordings]);

  return (
    <>
      <HlsVideoPlayer
        videoRef={playerRef}
        visible={!(isScrubbing || isLoading)}
        currentSource={source}
        hotKeys={hotKeys}
        fullscreen={fullscreen}
        onTimeUpdate={onTimeUpdate}
        onPlayerLoaded={onPlayerLoaded}
        onClipEnded={onClipEnded}
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
        containerRef={containerRef}
      />
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
        onControllerReady={(previewController) => {
          setPreviewController(previewController);
        }}
      />
      {!isScrubbing && isLoading && !noRecording && (
        <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      )}
      {!isScrubbing && noRecording && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          No recordings found for this time
        </div>
      )}
    </>
  );
}
