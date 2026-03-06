import { MotionOnlyRange } from "@/hooks/use-camera-activity";
import { Preview } from "@/types/preview";
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isCurrentHour } from "@/utils/dateUtil";
import { useTranslation } from "react-i18next";
import { CameraConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { baseUrl } from "@/api/baseUrl";
import { Recording } from "@/types/record";
import { useResizeObserver } from "@/hooks/resize-observer";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import TimeAgo from "@/components/dynamic/TimeAgo";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { FrigateConfig } from "@/types/frigateConfig";

const MOTION_HEATMAP_GRID_SIZE = 16;
const MIN_MOTION_CELL_ALPHA = 0.06;

function getPreviewForMotionRange(
  cameraPreviews: Preview[],
  cameraName: string,
  range: MotionOnlyRange,
) {
  const matchingPreviews = cameraPreviews.filter(
    (preview) =>
      preview.camera === cameraName &&
      preview.end > range.start_time &&
      preview.start < range.end_time,
  );

  if (!matchingPreviews.length) {
    return;
  }

  const getOverlap = (preview: Preview) =>
    Math.max(
      0,
      Math.min(preview.end, range.end_time) -
        Math.max(preview.start, range.start_time),
    );

  return matchingPreviews.reduce((best, current) => {
    return getOverlap(current) > getOverlap(best) ? current : best;
  });
}

function getRangeOverlapSeconds(
  rangeStart: number,
  rangeEnd: number,
  recordingStart: number,
  recordingEnd: number,
) {
  return Math.max(
    0,
    Math.min(rangeEnd, recordingEnd) - Math.max(rangeStart, recordingStart),
  );
}

function getMotionHeatmapForRange(
  recordings: Recording[],
  range: MotionOnlyRange,
) {
  const weightedHeatmap = new Map<number, number>();
  let totalWeight = 0;

  recordings.forEach((recording) => {
    const overlapSeconds = getRangeOverlapSeconds(
      range.start_time,
      range.end_time,
      recording.start_time,
      recording.end_time,
    );

    if (overlapSeconds <= 0) {
      return;
    }

    totalWeight += overlapSeconds;

    if (!recording.motion_heatmap) {
      return;
    }

    Object.entries(recording.motion_heatmap).forEach(
      ([cellIndex, intensity]) => {
        const index = Number(cellIndex);
        const level = Number(intensity);

        if (Number.isNaN(index) || Number.isNaN(level) || level <= 0) {
          return;
        }

        const existingWeight = weightedHeatmap.get(index) ?? 0;
        weightedHeatmap.set(index, existingWeight + level * overlapSeconds);
      },
    );
  });

  if (!totalWeight || weightedHeatmap.size === 0) {
    return null;
  }

  const mergedHeatmap: Record<string, number> = {};
  weightedHeatmap.forEach((weightedLevel, index) => {
    const normalizedLevel = Math.max(
      0,
      Math.min(255, Math.round(weightedLevel / totalWeight)),
    );

    if (normalizedLevel > 0) {
      mergedHeatmap[index.toString()] = normalizedLevel;
    }
  });

  return Object.keys(mergedHeatmap).length > 0 ? mergedHeatmap : null;
}

type MotionPreviewClipProps = {
  cameraName: string;
  range: MotionOnlyRange;
  playbackRate: number;
  preview?: Preview;
  fallbackFrameTimes?: number[];
  motionHeatmap?: Record<string, number> | null;
  nonMotionAlpha: number;
  isVisible: boolean;
  onSeek: (timestamp: number) => void;
};

function MotionPreviewClip({
  cameraName,
  range,
  playbackRate,
  preview,
  fallbackFrameTimes,
  motionHeatmap,
  nonMotionAlpha,
  isVisible,
  onSeek,
}: MotionPreviewClipProps) {
  const { t } = useTranslation(["views/events", "common"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dimOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);
  const [{ width: overlayWidth, height: overlayHeight }] =
    useResizeObserver(overlayContainerRef);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [fallbackImageLoaded, setFallbackImageLoaded] = useState(false);
  const [mediaDimensions, setMediaDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [fallbackFrameIndex, setFallbackFrameIndex] = useState(0);
  const [fallbackFramesReady, setFallbackFramesReady] = useState(false);

  const formattedDate = useFormattedTimestamp(
    range.start_time,
    config?.ui.time_format == "24hour"
      ? t("time.formattedTimestampMonthDayHourMinute.24hour", {
          ns: "common",
        })
      : t("time.formattedTimestampMonthDayHourMinute.12hour", {
          ns: "common",
        }),
    config?.ui.timezone,
  );
  const fallbackFrameSrcs = useMemo(() => {
    if (!fallbackFrameTimes || fallbackFrameTimes.length === 0) {
      return [] as string[];
    }

    return fallbackFrameTimes.map(
      (frameTime) =>
        `${baseUrl}api/preview/preview_${cameraName}-${frameTime}.webp/thumbnail.webp`,
    );
  }, [cameraName, fallbackFrameTimes]);

  useEffect(() => {
    setFallbackFrameIndex(0);
    setFallbackFramesReady(false);
  }, [range.start_time, range.end_time, fallbackFrameTimes]);

  useEffect(() => {
    if (fallbackFrameSrcs.length === 0) {
      setFallbackFramesReady(false);
      return;
    }

    let cancelled = false;

    const preloadFrames = async () => {
      await Promise.allSettled(
        fallbackFrameSrcs.map(
          (src) =>
            new Promise<void>((resolve) => {
              const image = new Image();
              image.onload = () => resolve();
              image.onerror = () => resolve();
              image.src = src;
            }),
        ),
      );

      if (!cancelled) {
        setFallbackFramesReady(true);
      }
    };

    void preloadFrames();

    return () => {
      cancelled = true;
    };
  }, [fallbackFrameSrcs]);

  useEffect(() => {
    if (!fallbackFramesReady || fallbackFrameSrcs.length <= 1 || !isVisible) {
      return;
    }

    const intervalMs = Math.max(
      50,
      Math.round(1000 / Math.max(1, playbackRate)),
    );
    const intervalId = window.setInterval(() => {
      setFallbackFrameIndex((previous) => {
        return (previous + 1) % fallbackFrameSrcs.length;
      });
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fallbackFrameSrcs.length, fallbackFramesReady, isVisible, playbackRate]);

  const fallbackFrameSrc = useMemo(() => {
    if (fallbackFrameSrcs.length === 0) {
      return undefined;
    }

    return fallbackFrameSrcs[fallbackFrameIndex] ?? fallbackFrameSrcs[0];
  }, [fallbackFrameIndex, fallbackFrameSrcs]);

  useEffect(() => {
    setVideoLoaded(false);
    setVideoPlaying(false);
    setMediaDimensions(null);
  }, [preview?.src]);

  useEffect(() => {
    if (!preview || !isVisible || videoLoaded || !videoRef.current) {
      return;
    }

    if (videoRef.current.currentSrc || videoRef.current.error) {
      setVideoLoaded(true);
    }
  }, [isVisible, preview, videoLoaded]);

  useEffect(() => {
    setFallbackImageLoaded(false);
    setMediaDimensions(null);
  }, [fallbackFrameSrcs]);

  useEffect(() => {
    if (!fallbackFrameSrc || !isVisible || !fallbackFramesReady) {
      return;
    }

    setFallbackImageLoaded(true);
  }, [fallbackFrameSrc, fallbackFramesReady, isVisible]);

  const showLoadingIndicator =
    (preview != undefined && isVisible && !videoPlaying) ||
    (fallbackFrameSrc != undefined && isVisible && !fallbackImageLoaded);

  const clipStart = useMemo(() => {
    if (!preview) {
      return 0;
    }

    return Math.max(0, range.start_time - preview.start);
  }, [preview, range.start_time]);

  const clipEnd = useMemo(() => {
    if (!preview) {
      return 0;
    }

    const previewDuration = preview.end - preview.start;
    return Math.min(
      previewDuration,
      Math.max(clipStart + 0.1, range.end_time - preview.start),
    );
  }, [clipStart, preview, range.end_time]);

  const resetPlayback = useCallback(() => {
    if (!videoRef.current || !preview) {
      return;
    }

    videoRef.current.currentTime = clipStart;
    videoRef.current.playbackRate = playbackRate;
  }, [clipStart, playbackRate, preview]);

  useEffect(() => {
    if (!videoRef.current || !preview) {
      return;
    }

    if (!isVisible) {
      videoRef.current.pause();
      videoRef.current.currentTime = clipStart;
      return;
    }

    if (videoRef.current.readyState >= 2) {
      resetPlayback();
      void videoRef.current.play().catch(() => undefined);
    }
  }, [clipStart, isVisible, preview, resetPlayback]);

  const drawDimOverlay = useCallback(() => {
    if (!dimOverlayCanvasRef.current) {
      return;
    }

    const canvas = dimOverlayCanvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    if (overlayWidth <= 0 || overlayHeight <= 0) {
      return;
    }

    const width = Math.max(1, overlayWidth);
    const height = Math.max(1, overlayHeight);
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    if (!motionHeatmap) {
      return;
    }

    // Calculate the actual rendered media area (object-contain letterboxing)
    let drawX = 0;
    let drawY = 0;
    let drawWidth = width;
    let drawHeight = height;

    if (
      mediaDimensions &&
      mediaDimensions.width > 0 &&
      mediaDimensions.height > 0
    ) {
      const containerAspect = width / height;
      const mediaAspect = mediaDimensions.width / mediaDimensions.height;

      if (mediaAspect < containerAspect) {
        // Portrait / tall: constrained by height, bars on left and right
        drawHeight = height;
        drawWidth = height * mediaAspect;
        drawX = (width - drawWidth) / 2;
        drawY = 0;
      } else {
        // Wide / landscape: constrained by width, bars on top and bottom
        drawWidth = width;
        drawHeight = width / mediaAspect;
        drawX = 0;
        drawY = (height - drawHeight) / 2;
      }
    }

    const heatmapLevels = Object.values(motionHeatmap)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    const maxHeatmapLevel =
      heatmapLevels.length > 0 ? Math.max(...heatmapLevels) : 0;

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = MOTION_HEATMAP_GRID_SIZE;
    maskCanvas.height = MOTION_HEATMAP_GRID_SIZE;

    const maskContext = maskCanvas.getContext("2d");
    if (!maskContext) {
      return;
    }

    const imageData = maskContext.createImageData(
      MOTION_HEATMAP_GRID_SIZE,
      MOTION_HEATMAP_GRID_SIZE,
    );

    for (let index = 0; index < MOTION_HEATMAP_GRID_SIZE ** 2; index++) {
      const level = Number(motionHeatmap[index.toString()] ?? 0);
      const normalizedLevel =
        maxHeatmapLevel > 0
          ? Math.min(1, Math.max(0, level / maxHeatmapLevel))
          : 0;
      const boostedLevel = Math.sqrt(normalizedLevel);
      const alpha =
        nonMotionAlpha -
        boostedLevel * (nonMotionAlpha - MIN_MOTION_CELL_ALPHA);

      const pixelOffset = index * 4;
      imageData.data[pixelOffset] = 0;
      imageData.data[pixelOffset + 1] = 0;
      imageData.data[pixelOffset + 2] = 0;
      imageData.data[pixelOffset + 3] = Math.round(
        Math.max(0, Math.min(1, alpha)) * 255,
      );
    }

    maskContext.putImageData(imageData, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(maskCanvas, drawX, drawY, drawWidth, drawHeight);
  }, [
    motionHeatmap,
    nonMotionAlpha,
    overlayHeight,
    overlayWidth,
    mediaDimensions,
  ]);

  useEffect(() => {
    drawDimOverlay();
  }, [drawDimOverlay]);

  return (
    <div
      ref={overlayContainerRef}
      className="relative aspect-video size-full cursor-pointer overflow-hidden rounded-lg bg-black md:rounded-2xl"
      onClick={() => onSeek(range.start_time)}
    >
      {showLoadingIndicator && (
        <Skeleton className="absolute inset-0 z-10 rounded-lg md:rounded-2xl" />
      )}
      {preview ? (
        <>
          <video
            ref={videoRef}
            className="size-full bg-black object-contain"
            playsInline
            preload={isVisible ? "metadata" : "none"}
            muted
            autoPlay={isVisible}
            onLoadedMetadata={() => {
              setVideoLoaded(true);

              if (videoRef.current) {
                setMediaDimensions({
                  width: videoRef.current.videoWidth,
                  height: videoRef.current.videoHeight,
                });
              }

              if (!isVisible) {
                return;
              }

              resetPlayback();

              if (videoRef.current) {
                void videoRef.current.play().catch(() => undefined);
              }
            }}
            onCanPlay={() => {
              setVideoLoaded(true);

              if (!isVisible) {
                return;
              }

              if (videoRef.current) {
                void videoRef.current.play().catch(() => undefined);
              }
            }}
            onPlay={() => setVideoPlaying(true)}
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => {
              setVideoLoaded(true);
              setVideoPlaying(true);
            }}
            onTimeUpdate={() => {
              if (!videoRef.current || !preview || !isVisible) {
                return;
              }

              if (videoRef.current.currentTime >= clipEnd) {
                videoRef.current.currentTime = clipStart;
              }
            }}
          >
            {isVisible && (
              <source
                src={`${baseUrl}${preview.src.substring(1)}`}
                type={preview.type}
              />
            )}
          </video>
          {motionHeatmap && (
            <canvas
              ref={dimOverlayCanvasRef}
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            />
          )}
        </>
      ) : fallbackFrameSrc ? (
        <>
          <img
            src={fallbackFrameSrc}
            className="size-full bg-black object-contain"
            loading="lazy"
            alt=""
            onLoad={(e) => {
              setFallbackImageLoaded(true);
              const img = e.currentTarget;
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setMediaDimensions({
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                });
              }
            }}
            onError={() => setFallbackImageLoaded(true)}
          />
          {motionHeatmap && (
            <canvas
              ref={dimOverlayCanvasRef}
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            />
          )}
        </>
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
          {t("motionPreviews.noPreview")}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 p-2">
        <div className="flex flex-col items-start text-xs text-white/90 drop-shadow-lg">
          {range.end_time ? (
            <TimeAgo time={range.start_time * 1000} dense />
          ) : (
            <ActivityIndicator size={14} />
          )}
          {formattedDate}
        </div>
      </div>
    </div>
  );
}

type MotionPreviewsPaneProps = {
  camera: CameraConfig;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  cameraPreviews: Preview[];
  motionRanges: MotionOnlyRange[];
  isLoadingMotionRanges?: boolean;
  playbackRate: number;
  nonMotionAlpha: number;
  onSeek: (timestamp: number) => void;
};

export default function MotionPreviewsPane({
  camera,
  contentRef,
  cameraPreviews,
  motionRanges,
  isLoadingMotionRanges = false,
  playbackRate,
  nonMotionAlpha,
  onSeek,
}: MotionPreviewsPaneProps) {
  const { t } = useTranslation(["views/events"]);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null,
  );

  const [windowVisible, setWindowVisible] = useState(true);
  useEffect(() => {
    const visibilityListener = () => {
      setWindowVisible(document.visibilityState == "visible");
    };

    addEventListener("visibilitychange", visibilityListener);

    return () => {
      removeEventListener("visibilitychange", visibilityListener);
    };
  }, []);

  const [visibleClips, setVisibleClips] = useState<string[]>([]);
  const [hasVisibilityData, setHasVisibilityData] = useState(false);
  const clipObserver = useRef<IntersectionObserver | null>(null);

  const recordingTimeRange = useMemo(() => {
    if (!motionRanges.length) {
      return null;
    }

    return motionRanges.reduce(
      (bounds, range) => ({
        after: Math.min(bounds.after, range.start_time),
        before: Math.max(bounds.before, range.end_time),
      }),
      {
        after: motionRanges[0].start_time,
        before: motionRanges[0].end_time,
      },
    );
  }, [motionRanges]);

  const { data: cameraRecordings } = useSWR<Recording[]>(
    recordingTimeRange
      ? [
          `${camera.name}/recordings`,
          {
            after: Math.floor(recordingTimeRange.after),
            before: Math.ceil(recordingTimeRange.before),
          },
        ]
      : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const { data: previewFrames } = useSWR<string[]>(
    recordingTimeRange
      ? `preview/${camera.name}/start/${Math.floor(recordingTimeRange.after)}/end/${Math.ceil(recordingTimeRange.before)}/frames`
      : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const previewFrameTimes = useMemo(() => {
    if (!previewFrames) {
      return [] as number[];
    }

    return previewFrames
      .map((frame) => {
        const timestampPart = frame.split("-").at(-1)?.replace(".webp", "");
        return timestampPart ? Number(timestampPart) : NaN;
      })
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
  }, [previewFrames]);

  const getFallbackFrameTimesForRange = useCallback(
    (range: MotionOnlyRange) => {
      if (!isCurrentHour(range.end_time) || previewFrameTimes.length === 0) {
        return [] as number[];
      }

      const inRangeFrames = previewFrameTimes.filter(
        (frameTime) =>
          frameTime >= range.start_time && frameTime <= range.end_time,
      );

      // Use all in-range frames when enough data exists for natural animation
      if (inRangeFrames.length > 1) {
        return inRangeFrames;
      }

      // If sparse, keep the single in-range frame and add only the next 2 frames
      if (inRangeFrames.length === 1) {
        const inRangeFrame = inRangeFrames[0];
        const nextFrames = previewFrameTimes
          .filter((frameTime) => frameTime > inRangeFrame)
          .slice(0, 2);

        return [inRangeFrame, ...nextFrames];
      }

      const nextFramesFromStart = previewFrameTimes
        .filter((frameTime) => frameTime >= range.start_time)
        .slice(0, 3);
      // If no in-range frame exists, take up to 3 frames starting at clip start
      if (nextFramesFromStart.length > 0) {
        return nextFramesFromStart;
      }

      const lastFrame = previewFrameTimes.at(-1);
      return lastFrame != undefined ? [lastFrame] : [];
    },
    [previewFrameTimes],
  );

  const setContentNode = useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      setScrollContainer(node);
    },
    [contentRef],
  );

  useEffect(() => {
    if (!scrollContainer) {
      return;
    }

    const visibleClipIds = new Set<string>();
    clipObserver.current = new IntersectionObserver(
      (entries) => {
        setHasVisibilityData(true);

        entries.forEach((entry) => {
          const clipId = (entry.target as HTMLElement).dataset.clipId;

          if (!clipId) {
            return;
          }

          if (entry.isIntersecting) {
            visibleClipIds.add(clipId);
          } else {
            visibleClipIds.delete(clipId);
          }
        });

        const rootRect = scrollContainer.getBoundingClientRect();
        const prunedVisibleClipIds = [...visibleClipIds].filter((clipId) => {
          const clipElement = scrollContainer.querySelector<HTMLElement>(
            `[data-clip-id="${clipId}"]`,
          );

          if (!clipElement) {
            return false;
          }

          const clipRect = clipElement.getBoundingClientRect();

          return (
            clipRect.bottom > rootRect.top && clipRect.top < rootRect.bottom
          );
        });

        setVisibleClips(prunedVisibleClipIds);
      },
      {
        root: scrollContainer,
        threshold: 0,
      },
    );

    scrollContainer
      .querySelectorAll<HTMLElement>("[data-clip-id]")
      .forEach((node) => {
        clipObserver.current?.observe(node);
      });

    return () => {
      clipObserver.current?.disconnect();
    };
  }, [scrollContainer]);

  const clipRef = useCallback((node: HTMLElement | null) => {
    if (!clipObserver.current) {
      return;
    }

    try {
      if (node) {
        clipObserver.current.observe(node);
      }
    } catch {
      // no op
    }
  }, []);

  const clipData = useMemo(
    () =>
      motionRanges
        .filter((range) => range.end_time > range.start_time)
        .sort((left, right) => right.start_time - left.start_time)
        .map((range) => {
          const preview = getPreviewForMotionRange(
            cameraPreviews,
            camera.name,
            range,
          );

          return {
            range,
            preview,
            fallbackFrameTimes: !preview
              ? getFallbackFrameTimesForRange(range)
              : undefined,
            motionHeatmap: getMotionHeatmapForRange(
              cameraRecordings ?? [],
              range,
            ),
          };
        }),
    [
      cameraPreviews,
      camera.name,
      cameraRecordings,
      getFallbackFrameTimesForRange,
      motionRanges,
    ],
  );

  const hasCurrentHourRanges = useMemo(
    () => motionRanges.some((range) => isCurrentHour(range.end_time)),
    [motionRanges],
  );

  const isLoadingPane =
    isLoadingMotionRanges ||
    (motionRanges.length > 0 && cameraRecordings == undefined) ||
    (hasCurrentHourRanges && previewFrames == undefined);

  if (isLoadingPane) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-1 md:mx-2 md:gap-4">
      <div
        ref={setContentNode}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto"
      >
        {clipData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-lg text-primary">
            {t("motionPreviews.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 pb-2 sm:grid-cols-2 md:gap-4 xl:grid-cols-4">
            {clipData.map(
              ({ range, preview, fallbackFrameTimes, motionHeatmap }, idx) => (
                <div
                  key={`${camera.name}-${range.start_time}-${range.end_time}-${preview?.src ?? "none"}-${idx}`}
                  data-clip-id={`${camera.name}-${range.start_time}-${range.end_time}-${idx}`}
                  ref={clipRef}
                >
                  <MotionPreviewClip
                    cameraName={camera.name}
                    range={range}
                    playbackRate={playbackRate}
                    preview={preview}
                    fallbackFrameTimes={fallbackFrameTimes}
                    motionHeatmap={motionHeatmap}
                    nonMotionAlpha={nonMotionAlpha}
                    isVisible={
                      windowVisible &&
                      (visibleClips.includes(
                        `${camera.name}-${range.start_time}-${range.end_time}-${idx}`,
                      ) ||
                        (!hasVisibilityData && idx < 8))
                    }
                    onSeek={onSeek}
                  />
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
