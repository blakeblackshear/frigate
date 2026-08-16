import {
  MutableRefObject,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Hls, { HlsConfig } from "hls.js";
import { isDesktop, isMobile } from "react-device-detect";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import VideoControls from "./VideoControls";
import { VideoResolutionType } from "@/types/live";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { AxiosResponse } from "axios";
import { toast } from "sonner";
import { useOverlayState } from "@/hooks/use-overlay-state";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { cn } from "@/lib/utils";
import { ASPECT_VERTICAL_LAYOUT, RecordingPlayerError } from "@/types/record";
import { useTranslation } from "react-i18next";
import ObjectTrackOverlay from "@/components/overlay/ObjectTrackOverlay";
import { useIsAdmin } from "@/hooks/use-is-admin";

// Android native hls does not seek correctly
const USE_NATIVE_HLS = false;
const HLS_MIME_TYPE = "application/vnd.apple.mpegurl" as const;
const unsupportedErrorCodes: number[] = [
  MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED,
  MediaError.MEDIA_ERR_DECODE,
];

export interface HlsSource {
  playlist: string;
  startPosition?: number;
}

type HlsVideoPlayerProps = {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
  visible: boolean;
  currentSource: HlsSource;
  hotKeys: boolean;
  supportsFullscreen: boolean;
  fullscreen: boolean;
  frigateControls?: boolean;
  inpointOffset?: number;
  onClipEnded?: (currentTime: number) => void;
  onClipPrevious?: (diff: number) => void;
  onPlayerLoaded?: () => void;
  onTimeUpdate?: (time: number) => void;
  onPlaying?: () => void;
  onSeekToTime?: (timestamp: number, play?: boolean) => void;
  setFullResolution?: React.Dispatch<React.SetStateAction<VideoResolutionType>>;
  onUploadFrame?: (playTime: number) => Promise<AxiosResponse> | undefined;
  getSnapshotUrl?: (playTime: number) => string | undefined;
  onSnapshot?: (playTime: number) => Promise<void> | void;
  toggleFullscreen?: () => void;
  onError?: (error: RecordingPlayerError) => void;
  onStallStart?: () => void;
  onStallEnd?: () => void;
  onSeekStart?: () => void;
  onBandwidthSample?: (estimateBps: number, levelBitrateBps?: number) => void;
  onFatalNetworkError?: () => boolean;
  onFatalCodecError?: () => boolean;
  initialBandwidthEstimate?: number;
  bufferLength?: number;
  isDetailMode?: boolean;
  camera?: string;
  currentTimeOverride?: number;
  transformedOverlay?: ReactNode;
};

export default function HlsVideoPlayer({
  videoRef,
  containerRef,
  visible,
  currentSource,
  hotKeys,
  supportsFullscreen,
  fullscreen,
  frigateControls = true,
  inpointOffset = 0,
  onClipEnded,
  onClipPrevious,
  onPlayerLoaded,
  onTimeUpdate,
  onPlaying,
  onSeekToTime,
  setFullResolution,
  onUploadFrame,
  getSnapshotUrl,
  onSnapshot,
  toggleFullscreen,
  onError,
  onStallStart,
  onStallEnd,
  onSeekStart,
  onBandwidthSample,
  onFatalNetworkError,
  onFatalCodecError,
  initialBandwidthEstimate,
  bufferLength,
  isDetailMode = false,
  camera,
  currentTimeOverride,
  transformedOverlay,
}: HlsVideoPlayerProps) {
  const { t } = useTranslation("components/player");
  const { data: config } = useSWR<FrigateConfig>("config");
  const isAdmin = useIsAdmin();

  // for detail stream context in History
  const currentTime = currentTimeOverride;

  // playback

  const hlsRef = useRef<Hls>(undefined);
  // kept in a ref so changing callback identities do not recreate the
  // Hls instance; the setup effect must only re-run on source changes
  const qualitySignalsRef = useRef({
    onStallStart,
    onStallEnd,
    onSeekStart,
    onBandwidthSample,
    onFatalNetworkError,
    onFatalCodecError,
    initialBandwidthEstimate,
  });
  // must resolve before the first render: a mount-effect flip would run
  // the first source effect in native mode, briefly handing iOS a native
  // HLS src that hls.js then tears away mid-load
  const [useHlsCompat, setUseHlsCompat] = useState(() => {
    if (
      USE_NATIVE_HLS &&
      document.createElement("video").canPlayType(HLS_MIME_TYPE)
    ) {
      return false;
    }
    return Hls.isSupported();
  });
  const [loadedMetadata, setLoadedMetadata] = useState(false);
  const [bufferTimeout, setBufferTimeout] = useState<NodeJS.Timeout>();
  // native HLS playback has no MSE, so it recovers from pipeline errors
  // by reloading the source; one attempt per source
  const nativeRetryRef = useRef(0);
  // a ref rather than an effect-scoped counter so the element error
  // handler can hold its toast while a recovery is still possible
  const mediaRecoveryBudgetRef = useRef(0);

  const applyVideoDimensions = useCallback(
    (width: number, height: number) => {
      if (setFullResolution) {
        setFullResolution({ width, height });
      }
      setVideoDimensions({ width, height });
      if (height > 0) {
        setTallCamera(width / height < ASPECT_VERTICAL_LAYOUT);
      }
    },
    [setFullResolution],
  );

  const handleLoadedMetadata = useCallback(() => {
    setLoadedMetadata(true);
    if (!videoRef.current) {
      return;
    }

    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;

    // iOS Safari occasionally reports 0x0 for videoWidth/videoHeight
    // Poll with requestAnimationFrame until dimensions become available (or timeout).
    if (width > 0 && height > 0) {
      applyVideoDimensions(width, height);
      return;
    }

    let attempts = 0;
    const maxAttempts = 120; // ~2 seconds at 60fps
    const tryGetDims = () => {
      if (!videoRef.current) return;
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;
      if (w > 0 && h > 0) {
        applyVideoDimensions(w, h);
        return;
      }
      if (attempts < maxAttempts) {
        attempts += 1;
        requestAnimationFrame(tryGetDims);
      }
    };
    requestAnimationFrame(tryGetDims);
  }, [videoRef, applyVideoDimensions]);

  useEffect(() => {
    qualitySignalsRef.current = {
      onStallStart,
      onStallEnd,
      onSeekStart,
      onBandwidthSample,
      onFatalNetworkError,
      onFatalCodecError,
      initialBandwidthEstimate,
    };
  }, [
    onStallStart,
    onStallEnd,
    onSeekStart,
    onBandwidthSample,
    onFatalNetworkError,
    onFatalCodecError,
    initialBandwidthEstimate,
  ]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    // loadedMetadata is intentionally NOT reset here: on a source swap
    // the element already holds a decoded frame, and keeping it visible
    // bridges the gap while the new source loads
    const currentPlaybackRate = videoRef.current.playbackRate;

    if (!useHlsCompat) {
      nativeRetryRef.current = 0;
      mediaRecoveryBudgetRef.current = 0;
      videoRef.current.src = currentSource.playlist;
      videoRef.current.load();
      return;
    }

    // Base HLS configuration
    const hlsConfig: Partial<HlsConfig> = {
      maxBufferLength: bufferLength ?? 10,
      maxBufferSize: 20 * 1000 * 1000,
      startPosition: currentSource.startPosition,
    };

    // every quality switch and chunk change recreates the instance, so
    // seed it to keep measured throughput across source swaps
    const seedEstimate = qualitySignalsRef.current.initialBandwidthEstimate;
    if (seedEstimate !== undefined && seedEstimate > 0) {
      hlsConfig.abrEwmaDefaultEstimate = seedEstimate;
    }

    const hls = new Hls(hlsConfig);
    hlsRef.current = hls;
    let networkRecoveryAttempts = 0;
    mediaRecoveryBudgetRef.current = 1;
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // prefer a quality downswitch; fall back to restarting loading
          const handled =
            qualitySignalsRef.current.onFatalNetworkError?.() ?? false;
          if (!handled && networkRecoveryAttempts < 2) {
            networkRecoveryAttempts += 1;
            hls.startLoad();
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          // retrying the same codec cannot succeed, so a codec error
          // prefers a quality downswitch over recovery
          const isCodecError =
            data.details ===
              Hls.ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR ||
            data.details === Hls.ErrorDetails.BUFFER_ADD_CODEC_ERROR;
          if (isCodecError && qualitySignalsRef.current.onFatalCodecError?.()) {
            return;
          }
          if (!isCodecError && mediaRecoveryBudgetRef.current > 0) {
            mediaRecoveryBudgetRef.current -= 1;
            hls.recoverMediaError();
          }
        }
        return;
      }

      // hls.js reports each stall episode only once, so STALL_RESOLVED
      // below is what closes it
      if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
        qualitySignalsRef.current.onStallStart?.();
      }
    });
    hls.on(Hls.Events.STALL_RESOLVED, () => {
      qualitySignalsRef.current.onStallEnd?.();
    });
    hls.on(Hls.Events.FRAG_LOADED, () => {
      // manifests are single-variant, so the bitrate is always level 0
      qualitySignalsRef.current.onBandwidthSample?.(
        hls.bandwidthEstimate,
        hls.levels?.[0]?.bitrate || undefined,
      );
    });
    hls.attachMedia(videoRef.current);
    hls.loadSource(currentSource.playlist);
    videoRef.current.playbackRate = currentPlaybackRate;

    return () => {
      // we must destroy the hlsRef every time the source changes
      // so that we can create a new HLS instance with startPosition
      // set at the optimal point in time
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [videoRef, hlsRef, useHlsCompat, currentSource, bufferLength]);

  // state handling

  const onPlayPause = useCallback(
    (play: boolean) => {
      if (!videoRef.current) {
        return;
      }

      if (play) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    },
    [videoRef],
  );

  // controls

  const [tallCamera, setTallCamera] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [persistedMuted, setPersistedMuted] = useUserPersistence(
    "hlsPlayerMuted",
    true,
  );
  const [temporaryMuted, setTemporaryMuted] = useState(false);
  const [volume, setVolume] = useOverlayState("playerVolume", 1.0);
  const [defaultPlaybackRate] = useUserPersistence("playbackRate", 1);
  const [playbackRate, setPlaybackRate] = useOverlayState(
    "playbackRate",
    defaultPlaybackRate ?? 1,
  );
  const [mobileCtrlTimeout, setMobileCtrlTimeout] = useState<NodeJS.Timeout>();
  const [controls, setControls] = useState(isMobile);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [videoDimensions, setVideoDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  const muted = persistedMuted || temporaryMuted;

  const onSetMuted = useCallback(
    (muted: boolean) => {
      setTemporaryMuted(false);
      setPersistedMuted(muted);
    },
    [setPersistedMuted],
  );

  useEffect(() => {
    if (!isDesktop) {
      return;
    }

    const callback = (e: MouseEvent) => {
      if (!videoRef.current) {
        return;
      }

      const rect = videoRef.current.getBoundingClientRect();

      if (
        e.clientX > rect.left &&
        e.clientX < rect.right &&
        e.clientY > rect.top &&
        e.clientY < rect.bottom
      ) {
        setControls(true);
      } else {
        setControls(controlsOpen);
      }
    };
    window.addEventListener("mousemove", callback);
    return () => {
      window.removeEventListener("mousemove", callback);
    };
  }, [videoRef, controlsOpen]);

  const getVideoTime = useCallback(() => {
    const currentTime = videoRef.current?.currentTime;

    if (!currentTime) {
      return undefined;
    }

    return currentTime + inpointOffset;
  }, [videoRef, inpointOffset]);

  const handleSnapshot = useCallback(async () => {
    const frameTime = getVideoTime();

    if (!frameTime || !onSnapshot) {
      return;
    }

    setIsSnapshotLoading(true);
    try {
      await onSnapshot(frameTime);
    } finally {
      setIsSnapshotLoading(false);
    }
  }, [getVideoTime, onSnapshot]);

  return (
    <TransformWrapper
      minScale={1.0}
      wheel={{ smoothStep: 0.005 }}
      onZoom={(zoom) => setZoomScale(zoom.state.scale)}
      disabled={!frigateControls}
    >
      {frigateControls && (
        <VideoControls
          className={cn(
            "absolute left-1/2 z-50 -translate-x-1/2",
            tallCamera ? "bottom-12" : "bottom-5",
          )}
          video={videoRef.current}
          isPlaying={isPlaying}
          show={visible && (controls || controlsOpen)}
          muted={muted}
          volume={volume}
          features={{
            volume: true,
            seek: true,
            playbackRate: true,
            plusUpload: isAdmin && config?.plus?.enabled == true,
            snapshot: !!onSnapshot,
            fullscreen: supportsFullscreen,
          }}
          setControlsOpen={setControlsOpen}
          setMuted={onSetMuted}
          playbackRate={playbackRate ?? 1}
          hotKeys={hotKeys}
          onPlayPause={onPlayPause}
          onSeek={(diff) => {
            const currentTime = videoRef.current?.currentTime;

            if (!videoRef.current || currentTime == undefined) {
              return;
            }

            const newTime = currentTime + diff;

            if (newTime < 0 && onClipPrevious) {
              onClipPrevious(diff);
            } else {
              videoRef.current.currentTime = Math.max(0, newTime);
            }
          }}
          onSetPlaybackRate={(rate) => {
            setPlaybackRate(rate, true);

            if (videoRef.current) {
              videoRef.current.playbackRate = rate;
            }
          }}
          getSnapshotUrl={() => {
            const frameTime = getVideoTime();
            if (!frameTime || !getSnapshotUrl) {
              return undefined;
            }
            return getSnapshotUrl(frameTime);
          }}
          onUploadFrame={async () => {
            const frameTime = getVideoTime();

            if (frameTime && onUploadFrame) {
              const resp = await onUploadFrame(frameTime);

              if (resp && resp.status == 200) {
                toast.success(t("toast.success.submittedFrigatePlus"), {
                  position: "top-center",
                });
              } else {
                toast.success(t("toast.error.submitFrigatePlusFailed"), {
                  position: "top-center",
                });
              }
            }
          }}
          onSnapshot={onSnapshot ? handleSnapshot : undefined}
          snapshotLoading={isSnapshotLoading}
          fullscreen={fullscreen}
          toggleFullscreen={toggleFullscreen}
          containerRef={containerRef}
        />
      )}
      <TransformComponent
        wrapperStyle={{
          display: visible ? undefined : "none",
          width: "100%",
          height: "100%",
        }}
        wrapperProps={{
          onClick: isDesktop ? undefined : () => setControls(!controls),
        }}
        contentStyle={{
          width: "100%",
          height: isMobile ? "100%" : undefined,
        }}
      >
        <div className="relative size-full">
          {transformedOverlay}
          {isDetailMode &&
            camera &&
            currentTime != null &&
            loadedMetadata &&
            videoDimensions.width > 0 &&
            videoDimensions.height > 0 && (
              <div
                className={cn(
                  "absolute inset-0 z-50",
                  isDesktop
                    ? "size-full"
                    : "mx-auto flex items-center justify-center portrait:max-h-[50dvh]",
                )}
                style={{
                  aspectRatio: `${videoDimensions.width} / ${videoDimensions.height}`,
                }}
              >
                <ObjectTrackOverlay
                  camera={camera}
                  showBoundingBoxes={!isPlaying}
                  currentTime={currentTime}
                  videoWidth={videoDimensions.width}
                  videoHeight={videoDimensions.height}
                  className="absolute inset-0 z-10"
                  onSeekToTime={(timestamp, play) => {
                    if (onSeekToTime) {
                      onSeekToTime(timestamp, play);
                    }
                  }}
                />
              </div>
            )}
          <video
            ref={videoRef}
            className={`size-full rounded-lg bg-black md:rounded-2xl ${loadedMetadata ? "" : "invisible"} cursor-pointer`}
            preload="auto"
            autoPlay
            controls={!frigateControls}
            playsInline
            muted={muted}
            onClick={
              isDesktop
                ? () => {
                    if (zoomScale == 1.0) onPlayPause(!isPlaying);
                  }
                : undefined
            }
            onVolumeChange={() => {
              if (!videoRef.current) {
                return;
              }

              setVolume(videoRef.current.volume ?? 1.0, true);

              if (frigateControls) {
                if (videoRef.current.muted && !persistedMuted) {
                  setTemporaryMuted(true);
                } else if (!videoRef.current.muted && temporaryMuted) {
                  setTemporaryMuted(false);
                }
              } else {
                setPersistedMuted(videoRef.current.muted);
              }
            }}
            onPlay={() => {
              setIsPlaying(true);

              if (isMobile) {
                setControls(true);
                setMobileCtrlTimeout(
                  setTimeout(() => setControls(false), 4000),
                );
              }
            }}
            onPlaying={() => {
              qualitySignalsRef.current.onStallEnd?.();
              onPlaying?.();
            }}
            onPause={() => {
              setIsPlaying(false);
              clearTimeout(bufferTimeout);

              // paused time must never count as stall time
              qualitySignalsRef.current.onStallEnd?.();

              if (isMobile && mobileCtrlTimeout) {
                clearTimeout(mobileCtrlTimeout);
              }
            }}
            onSeeking={() => {
              // iOS ManagedMediaSource gates hls.js fragment loading off
              // while paused and never resumes it on seek, so a seek
              // into unbuffered media would never complete
              hlsRef.current?.resumeBuffering();
              qualitySignalsRef.current.onSeekStart?.();
            }}
            onWaiting={() => {
              if (videoRef.current?.paused) {
                return;
              }

              // the only stall signal under native HLS playback, which
              // emits no hls.js events
              qualitySignalsRef.current.onStallStart?.();

              if (onError != undefined) {
                setBufferTimeout(
                  setTimeout(() => {
                    if (
                      document.visibilityState === "visible" &&
                      videoRef.current
                    ) {
                      onError("stalled");
                    }
                  }, 3000),
                );
              }
            }}
            onProgress={() => {
              if (onError != undefined) {
                if (videoRef.current?.paused) {
                  return;
                }

                if (bufferTimeout) {
                  clearTimeout(bufferTimeout);
                  setBufferTimeout(undefined);
                }
              }
            }}
            onTimeUpdate={() => {
              if (!onTimeUpdate) {
                return;
              }

              const frameTime = getVideoTime();

              if (frameTime) {
                onTimeUpdate(frameTime);
              }
            }}
            onLoadedData={() => {
              onPlayerLoaded?.();
              handleLoadedMetadata();

              if (videoRef.current) {
                if (playbackRate) {
                  videoRef.current.playbackRate = playbackRate;
                }

                if (volume) {
                  videoRef.current.volume = volume;
                }
              }
            }}
            onEnded={() => {
              if (onClipEnded) {
                onClipEnded(getVideoTime() ?? 0);
              }
            }}
            onError={(e) => {
              const mediaError = (e.target as HTMLVideoElement).error;

              if (!mediaError) {
                return;
              }

              // an intentional source swap aborts the in-flight load;
              // that abort is not an error the user can act on
              if (mediaError.code === MediaError.MEDIA_ERR_ABORTED) {
                return;
              }

              // hold the toast while the fatal handler still has a retry
              // left; a failed recovery raises a second element error
              if (hlsRef.current && mediaRecoveryBudgetRef.current > 0) {
                return;
              }

              if (!hlsRef.current && videoRef.current) {
                if (
                  unsupportedErrorCodes.includes(mediaError.code) &&
                  Hls.isSupported()
                ) {
                  setLoadedMetadata(false);
                  setUseHlsCompat(true);
                  return;
                }

                // native pipeline errors around source swaps are usually
                // transient, and hls.js is no fallback without MSE
                if (nativeRetryRef.current < 1) {
                  nativeRetryRef.current += 1;
                  videoRef.current.load();
                  return;
                }
              }

              toast.error(
                `Failed to play recordings (error ${mediaError.code}): ${mediaError.message}`,
                {
                  position: "top-center",
                },
              );
            }}
          />
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
}
