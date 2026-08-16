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
  AutoQualityReason,
  PlaybackQuality,
  Recording,
  RecordingCoverage,
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  calculateInpointOffset,
  calculateSeekPosition,
} from "@/utils/videoUtil";
import {
  downloadSnapshot,
  generateSnapshotFilename,
  grabVideoSnapshot,
} from "@/utils/snapshotUtil";
import { isFirefox } from "react-device-detect";
import { AutoQualityGovernor } from "./AutoQualityGovernor";
import { isCodecFamilySupported } from "@/utils/codecSupport";
import { useUserPersistence } from "@/hooks/use-user-persistence";

// forward buffer while playing the low quality stream; low bitrate makes
// a longer buffer cheap and it rides out connection variance better
const SUB_STREAM_BUFFER_LENGTH_S = 30;

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
  onClipPrevious?: (diff: number) => void;
  onSeekToTime?: (timestamp: number, play?: boolean) => void;
  setFullResolution: React.Dispatch<React.SetStateAction<VideoResolutionType>>;
  toggleFullscreen: () => void;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
  transformedOverlay?: ReactNode;
  quality?: PlaybackQuality;
  onAutoQualityChange?: (
    lowQuality: boolean,
    reason: AutoQualityReason | undefined,
  ) => void;
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
  onClipPrevious,
  onSeekToTime,
  setFullResolution,
  toggleFullscreen,
  containerRef,
  transformedOverlay,
  quality,
  onAutoQualityChange,
}: DynamicVideoPlayerProps) {
  const { t } = useTranslation(["components/player", "views/live"]);
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
  const loadingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Don't set source until recordings load - we need accurate startPosition
  // to avoid hls.js clamping to video end when startPosition exceeds duration
  const [source, setSource] = useState<HlsSource | undefined>(undefined);

  // start at correct time

  useEffect(() => {
    if (!isScrubbing) {
      loadingTimeoutRef.current = setTimeout(() => setIsLoading(true), 1000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [camera, isScrubbing]);

  // wall-clock position to resume from once the current source finishes
  // loading. A seek landing mid-load must win over the position the
  // source was built around, or the post-load seek drags playback back
  const sourceAnchorRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    sourceAnchorRef.current = startTimestamp;
  }, [startTimestamp]);
  // a recordings change refined the seek model without changing the
  // playlist, so the playback effect skips its loading indicator
  const modelOnlyUpdateRef = useRef(false);

  const onPlayerLoaded = useCallback(() => {
    sourceLoadedRef.current = true;
    governorRef.current?.sourceLoadEnded();

    const anchor = sourceAnchorRef.current;

    if (!controller || !anchor) {
      return;
    }

    // an anchor outside this chunk is stale (e.g. a natural clip
    // advance); the playlist already starts where playback should
    if (anchor < timeRange.after || anchor > timeRange.before) {
      return;
    }

    // while the handlebar is down only position the hidden player, never
    // start it: a mid-drag chunk prefetch can audibly blip before
    // onPlaying pauses it. The release seek starts playback
    controller.seekToTimestamp(anchor, !isScrubbing);
  }, [controller, timeRange, isScrubbing]);

  // used to re-anchor the source when an auto quality switch rebuilds
  // the playlist mid-playback
  const lastPlayedTimestampRef = useRef<number | undefined>(undefined);

  // the range the controller's playback model was last built for; while
  // a chunk change awaits its coverage, the outgoing source reports
  // times that would map through the stale model
  const modelTimeRangeRef = useRef<TimeRange | undefined>(undefined);

  const onTimeUpdate = useCallback(
    (time: number) => {
      // safety net for stall or startup signals the player missed
      governorRef.current?.stallEnded();
      if (!sourceLoadedRef.current) {
        sourceLoadedRef.current = true;
        governorRef.current?.sourceLoadEnded();
      }

      if (isScrubbing || !controller || !onTimestampUpdate || time == 0) {
        return;
      }

      // drop reports until the controller's model matches this chunk
      if (
        modelTimeRangeRef.current?.after !== timeRange.after ||
        modelTimeRangeRef.current?.before !== timeRange.before
      ) {
        return;
      }

      if (isLoading) {
        setIsLoading(false);
      }

      if (isBuffering) {
        setIsBuffering(false);
      }

      const progress = controller.getProgress(time);
      lastPlayedTimestampRef.current = progress;
      onTimestampUpdate(progress);
    },
    [
      controller,
      onTimestampUpdate,
      isBuffering,
      isLoading,
      isScrubbing,
      timeRange,
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

  const getSnapshotUrlForPlus = useCallback(
    (playTime: number) => {
      if (!controller) {
        return undefined;
      }

      const time = controller.getProgress(playTime);
      if (!time) {
        return undefined;
      }
      return `${apiHost}api/${camera}/recordings/${time}/snapshot.jpg?height=500`;
    },
    [apiHost, camera, controller],
  );

  const onDownloadSnapshot = useCallback(
    async (playTime: number) => {
      if (!controller || !playerRef.current) {
        return;
      }

      // map the player time back to the timeline timestamp so the filename
      // reflects the moment being viewed rather than the current time
      const frameTime = controller.getProgress(playTime);
      const result = await grabVideoSnapshot(playerRef.current);

      if (result.success) {
        downloadSnapshot(
          result.data.dataUrl,
          generateSnapshotFilename(camera, frameTime),
        );
        toast.success(t("snapshot.downloadStarted", { ns: "views/live" }), {
          position: "top-center",
        });
      } else {
        toast.error(t("snapshot.captureFailed", { ns: "views/live" }), {
          position: "top-center",
        });
      }
    },
    [camera, controller, t],
  );

  // state of playback player

  const recordingParams = useMemo(
    () => ({
      before: timeRange.before,
      after: timeRange.after,
      timelines: true,
    }),
    [timeRange],
  );
  const { data: coverage } = useSWR<RecordingCoverage>(
    [`${camera}/recordings/coverage`, recordingParams],
    { revalidateOnFocus: false },
  );

  // auto quality plays the default route until the governor downswitches
  // to the pinned sub route; manual pins bypass this entirely
  const [autoLowQuality, setAutoLowQuality] = useState(false);
  const [autoLowReason, setAutoLowReason] = useState<
    AutoQualityReason | undefined
  >(undefined);
  const autoLowQualityRef = useRef(false);

  const subAvailable = useMemo(
    () => coverage?.spans.some((span) => span.streams.includes("sub")) ?? false,
    [coverage],
  );

  const resolvedQuality = quality ?? "auto";

  // the ref indirection keeps these reading fresh state while the
  // governor stays a single instance for the component's lifetime
  const tryDownswitchRef = useRef<(reason: string) => boolean>(() => false);
  const tryUpswitchRef = useRef<() => void>(() => {});
  const governorRef = useRef<AutoQualityGovernor | null>(null);
  if (governorRef.current === null) {
    governorRef.current = new AutoQualityGovernor(
      (reason) => tryDownswitchRef.current(reason),
      () => tryUpswitchRef.current(),
    );
  }
  const governor = governorRef.current;

  // callers pass an inline callback, so keeping it out of the notify
  // effect's deps stops the notification's re-render from re-firing it
  const onAutoQualityChangeRef = useRef(onAutoQualityChange);

  useEffect(() => {
    onAutoQualityChangeRef.current = onAutoQualityChange;
  }, [onAutoQualityChange]);

  useEffect(() => {
    autoLowQualityRef.current = autoLowQuality;
    onAutoQualityChangeRef.current?.(
      autoLowQuality,
      autoLowQuality ? autoLowReason : undefined,
    );
  }, [autoLowQuality, autoLowReason]);

  useEffect(() => {
    tryDownswitchRef.current = (reason: string) => {
      if (
        resolvedQuality !== "auto" ||
        !subAvailable ||
        autoLowQualityRef.current
      ) {
        return false;
      }
      setAutoLowQuality(true);
      setAutoLowReason(reason === "codec" ? "codec" : "bandwidth");
      // so a recovered connection (or a wrong downswitch) returns to
      // full quality mid-chunk rather than at the next boundary
      governor.armUpswitchProbe();
      return true;
    };
    tryUpswitchRef.current = () => {
      if (resolvedQuality === "auto" && autoLowQualityRef.current) {
        setAutoLowQuality(false);
        setAutoLowReason(undefined);
      }
    };
  }, [resolvedQuality, subAvailable, governor]);

  // persisted across sessions so a device on a known-slow connection
  // starts low instead of paying the first stall to find out
  const [persistedEstimate, setPersistedEstimate, estimateLoaded] =
    useUserPersistence<number>("playbackBandwidthEstimate");

  const persistGovernor = useCallback(() => {
    const estimate = governor.bandwidthEstimate;
    if (estimate !== undefined) {
      setPersistedEstimate(Math.round(estimate));
    }
  }, [governor, setPersistedEstimate]);
  const persistGovernorRef = useRef(persistGovernor);

  useEffect(() => {
    persistGovernorRef.current = persistGovernor;
  }, [persistGovernor]);

  useEffect(() => {
    // returning to auto starts fresh on the default route, except when
    // this browser already proved it cannot decode the original stream
    governor.resetStallHistory();
    setAutoLowQuality(governor.isMainUnplayable);
    setAutoLowReason(governor.isMainUnplayable ? "codec" : undefined);
    // we only want to reset when the pinned quality changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality]);

  useEffect(() => {
    // measured connection throughput carries over across cameras
    governor.resetForCamera();
    setAutoLowQuality(false);
    setAutoLowReason(undefined);
    // we only want to reset when the camera changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  // seed the governor once per camera, then decide the starting quality
  const seededCameraRef = useRef<string | null>(null);
  useEffect(() => {
    if (seededCameraRef.current === camera || !estimateLoaded || !coverage) {
      return;
    }
    seededCameraRef.current = camera;

    const mainSummary = coverage.streams?.main;
    if (mainSummary?.bitrate) {
      governor.learnMainBitrate(mainSummary.bitrate);
    }
    governor.seed(persistedEstimate);

    if (resolvedQuality !== "auto" || !subAvailable) {
      return;
    }

    // data saver is a user preference, not a bandwidth fact: hold the
    // low stream and never auto-upswitch against it (a manual pin to
    // Original still wins as an explicit action)
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData === true;
    if (saveData) {
      governor.setHoldLow(true);
    }

    // a browser that cannot decode the original codec can never play
    // the merged route. This probe fails open (unknown codecs count as
    // supported); the reactive fatal-codec path is the real authority
    const mainSupported = isCodecFamilySupported(mainSummary?.video_codec);
    const subSupported = isCodecFamilySupported(
      coverage.streams?.sub?.video_codec,
    );
    if (!mainSupported && subSupported) {
      governor.markMainUnplayable();
      setAutoLowQuality(true);
      setAutoLowReason("codec");
      return;
    }

    if (saveData) {
      setAutoLowQuality(true);
      setAutoLowReason("saveData");
      return;
    }

    // a fully cold device also starts low: the conservative start shows
    // a first frame in seconds and the armed probe recovers full
    // quality within a few segment loads on connections that allow it
    const coldStart = governor.bandwidthEstimate === undefined;
    if (!coldStart && !governor.shouldStartLow()) {
      return;
    }

    setAutoLowQuality(true);
    setAutoLowReason("bandwidth");
    governor.armUpswitchProbe();
  }, [
    camera,
    coverage,
    estimateLoaded,
    persistedEstimate,
    resolvedQuality,
    subAvailable,
    governor,
  ]);

  // time-to-first-frame budget; the stall clock is blind before
  // playback starts, so an oversized first segment would spin forever
  const sourceLoadedRef = useRef(false);
  useEffect(() => {
    sourceLoadedRef.current = false;
  }, [source]);
  useEffect(() => {
    if (!source || isScrubbing || sourceLoadedRef.current) {
      governor.sourceLoadEnded();
      return;
    }
    governor.sourceLoadStarted();
  }, [source, isScrubbing, governor]);

  useEffect(() => {
    // a chunk boundary is where full quality may be retried, and a
    // natural point to persist what the governor has learned
    setAutoLowQuality((prev) => prev && !governor.shouldRetryMain());
    persistGovernorRef.current();
    // we only want to re-evaluate when the playback chunk changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  useEffect(() => {
    return () => {
      persistGovernorRef.current();
      governor.destroy();
    };
    // governor is a stable per-mount instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveQuality: PlaybackQuality =
    resolvedQuality === "auto" && autoLowQuality ? "sub" : resolvedQuality;

  const onStallStart = useCallback(() => governor.stallStarted(), [governor]);
  const onStallEnd = useCallback(() => governor.stallEnded(), [governor]);
  const onSeekStart = useCallback(() => governor.noteSeek(), [governor]);
  const onFatalNetworkError = useCallback(
    () => governor.fatalNetworkError(),
    [governor],
  );
  const onFatalCodecError = useCallback(
    () => governor.fatalCodecError(),
    [governor],
  );
  const onBandwidthSample = useCallback(
    (estimateBps: number, levelBitrateBps?: number) =>
      governor.bandwidthSample(
        estimateBps,
        levelBitrateBps,
        // the merged default route leads with the original stream, so
        // its samples measure original-quality sustainability
        effectiveQuality !== "sub",
      ),
    [governor, effectiveQuality],
  );

  // the realized timelines mirror the vod manifests exactly, including
  // keyframe back-snap lead-in at cross-stream hand-offs. Walking wall
  // lengths instead drifts ~0.5s per hand-off, since the playlist
  // contains lead-in media the model never knew about
  const recordings = useMemo<Recording[] | undefined>(() => {
    const timeline =
      coverage?.timelines?.[
        effectiveQuality === "main" || effectiveQuality === "sub"
          ? effectiveQuality
          : "auto"
      ];

    if (!timeline) {
      return undefined;
    }

    return timeline.map((span) => ({
      start_time: span.start_time,
      end_time: span.end_time,
      duration: span.duration / 1000,
    })) as Recording[];
  }, [coverage, effectiveQuality]);

  // lets the effect below tell quality rebuilds apart from chunk changes
  const prevEffectiveQualityRef = useRef(effectiveQuality);

  useEffect(() => {
    const qualityChanged = prevEffectiveQualityRef.current !== effectiveQuality;
    prevEffectiveQualityRef.current = effectiveQuality;

    if (!recordings?.length) {
      if (recordings?.length == 0) {
        // drop any stale source so the previous playlist unmounts
        // instead of playing under the no-recording state
        setSource(undefined);
        setNoRecording(true);
        // with no source nothing will play to clear a pending
        // camera-switch load, hiding the message behind a preview frame
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        setIsLoading(false);
      }

      return;
    }

    // an identical playlist means coverage only refined the seek model;
    // skip the rebuild so the player is not torn down
    const streamPath =
      effectiveQuality === "main" || effectiveQuality === "sub"
        ? `/${effectiveQuality}`
        : "";
    const playlist = `${apiHost}vod/${camera}${streamPath}/start/${recordingParams.after}/end/${recordingParams.before}/master.m3u8`;
    if (!qualityChanged && source?.playlist === playlist) {
      modelOnlyUpdateRef.current = true;
      return;
    }

    // a quality switch rebuilds mid-playback, so anchor to the live
    // playhead rather than the chunk-stale startTimestamp prop. The
    // controller still holds the OUTGOING timeline here (newPlayback
    // runs in a later effect), and the timeupdate-throttled lastPlayed
    // ref lags the frame on screen by up to ~250ms
    const liveTime = playerRef.current?.currentTime;
    const livePlayed =
      qualityChanged && controller && liveTime !== undefined && liveTime > 0
        ? controller.getProgress(liveTime)
        : undefined;
    const lastPlayed = livePlayed ?? lastPlayedTimestampRef.current;
    const anchorTimestamp =
      qualityChanged &&
      lastPlayed !== undefined &&
      lastPlayed >= timeRange.after &&
      lastPlayed <= timeRange.before
        ? lastPlayed
        : startTimestamp;
    sourceAnchorRef.current = anchorTimestamp;

    let startPosition = undefined;

    if (anchorTimestamp) {
      const inpointOffset = calculateInpointOffset(
        recordingParams.after,
        (recordings || [])[0],
      );

      startPosition = calculateSeekPosition(
        anchorTimestamp,
        recordings,
        inpointOffset,
      );
    }

    setSource({
      playlist,
      startPosition,
    });

    // we only want to rebuild the source when the playlist itself changes;
    // startTimestamp, timeRange, and the anchor refs are read as-of-rebuild
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordings, effectiveQuality]);

  useEffect(() => {
    if (!controller || !recordings?.length) {
      return;
    }

    if (playerRef.current) {
      playerRef.current.autoplay = !isScrubbing;
    }

    const modelOnlyUpdate = modelOnlyUpdateRef.current;
    modelOnlyUpdateRef.current = false;

    // on a source swap the element already has a decoded frame; keep it
    // visible under the buffering indicator rather than hiding it
    // behind the preview player like the initial load does
    const hasDecodedFrame =
      (playerRef.current?.readyState ?? 0) >=
      HTMLMediaElement.HAVE_CURRENT_DATA;

    if (!modelOnlyUpdate) {
      loadingTimeoutRef.current = setTimeout(
        () => (hasDecodedFrame ? setIsBuffering(true) : setIsLoading(true)),
        1000,
      );
    }

    controller.newPlayback({
      recordings: recordings ?? [],
      timeRange,
    });
    modelTimeRangeRef.current = timeRange;

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
          onClipPrevious={onClipPrevious}
          onSeekToTime={(timestamp, play) => {
            if (onSeekToTime) {
              onSeekToTime(timestamp, play);
            }
          }}
          onPlaying={() => {
            if (isScrubbing) {
              playerRef.current?.pause();
            }

            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }

            setNoRecording(false);
          }}
          setFullResolution={setFullResolution}
          onUploadFrame={onUploadFrameToPlus}
          getSnapshotUrl={getSnapshotUrlForPlus}
          onSnapshot={onDownloadSnapshot}
          toggleFullscreen={toggleFullscreen}
          onError={(error) => {
            if (error == "stalled" && !isScrubbing) {
              setIsBuffering(true);
            }
          }}
          onStallStart={onStallStart}
          onStallEnd={onStallEnd}
          onSeekStart={onSeekStart}
          onBandwidthSample={onBandwidthSample}
          onFatalNetworkError={onFatalNetworkError}
          onFatalCodecError={onFatalCodecError}
          initialBandwidthEstimate={governor.bandwidthEstimate}
          bufferLength={
            effectiveQuality === "sub" ? SUB_STREAM_BUFFER_LENGTH_S : undefined
          }
          isDetailMode={isDetailMode}
          camera={contextCamera || camera}
          currentTimeOverride={currentTime}
          transformedOverlay={transformedOverlay}
        />
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
