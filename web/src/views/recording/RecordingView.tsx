import ReviewCard from "@/components/card/ReviewCard";
import ReviewFilterGroup from "@/components/filter/ReviewFilterGroup";
import ExportDialog from "@/components/overlay/ExportDialog";
import PreviewPlayer, {
  PreviewController,
} from "@/components/player/PreviewPlayer";
import { DynamicVideoController } from "@/components/player/dynamic/DynamicVideoController";
import DynamicVideoPlayer from "@/components/player/dynamic/DynamicVideoPlayer";
import MotionReviewTimeline from "@/components/timeline/MotionReviewTimeline";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useOverlayState } from "@/hooks/use-overlay-state";
import { ExportMode } from "@/types/filter";
import { FrigateConfig } from "@/types/frigateConfig";
import { Preview } from "@/types/preview";
import {
  MotionData,
  REVIEW_PADDING,
  ReviewFilter,
  ReviewSegment,
  ReviewSummary,
} from "@/types/review";
import { getChunkedTimeDay } from "@/utils/timelineUtil";
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import useSWR from "swr";
import { TimeRange, TimelineType } from "@/types/timeline";
import MobileCameraDrawer from "@/components/overlay/MobileCameraDrawer";
import MobileTimelineDrawer from "@/components/overlay/MobileTimelineDrawer";
import MobileReviewSettingsDrawer from "@/components/overlay/MobileReviewSettingsDrawer";
import Logo from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { FaVideo } from "react-icons/fa";
import { VideoResolutionType } from "@/types/live";
import { ASPECT_VERTICAL_LAYOUT, ASPECT_WIDE_LAYOUT } from "@/types/record";
import { useResizeObserver } from "@/hooks/resize-observer";
import { cn } from "@/lib/utils";
import { useFullscreen } from "@/hooks/use-fullscreen";

const SEGMENT_DURATION = 30;

type RecordingViewProps = {
  startCamera: string;
  startTime: number;
  reviewItems?: ReviewSegment[];
  reviewSummary?: ReviewSummary;
  timeRange: TimeRange;
  allCameras: string[];
  allPreviews?: Preview[];
  filter?: ReviewFilter;
  updateFilter: (newFilter: ReviewFilter) => void;
};
export function RecordingView({
  startCamera,
  startTime,
  reviewItems,
  reviewSummary,
  timeRange,
  allCameras,
  allPreviews,
  filter,
  updateFilter,
}: RecordingViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement | null>(null);

  // controller state

  const [mainCamera, setMainCamera] = useState(startCamera);
  const mainControllerRef = useRef<DynamicVideoController | null>(null);
  const mainLayoutRef = useRef<HTMLDivElement | null>(null);
  const cameraLayoutRef = useRef<HTMLDivElement | null>(null);
  const previewRowRef = useRef<HTMLDivElement | null>(null);
  const previewRefs = useRef<{ [camera: string]: PreviewController }>({});

  const [playbackStart, setPlaybackStart] = useState(
    startTime >= timeRange.after && startTime <= timeRange.before
      ? startTime
      : timeRange.before - 60,
  );

  const mainCameraReviewItems = useMemo(
    () => reviewItems?.filter((cam) => cam.camera == mainCamera) ?? [],
    [reviewItems, mainCamera],
  );

  // timeline

  const [timelineType, setTimelineType] = useOverlayState<TimelineType>(
    "timelineType",
    "timeline",
  );

  const chunkedTimeRange = useMemo(
    () => getChunkedTimeDay(timeRange),
    [timeRange],
  );
  const [selectedRangeIdx, setSelectedRangeIdx] = useState(
    chunkedTimeRange.findIndex((chunk) => {
      return chunk.after <= startTime && chunk.before >= startTime;
    }),
  );
  const currentTimeRange = useMemo<TimeRange>(
    () =>
      chunkedTimeRange[selectedRangeIdx] ??
      chunkedTimeRange[chunkedTimeRange.length - 1],
    [selectedRangeIdx, chunkedTimeRange],
  );
  const reviewFilterList = useMemo(() => {
    const uniqueLabels = new Set<string>();

    reviewItems?.forEach((rev) => {
      rev.data.objects.forEach((obj) =>
        uniqueLabels.add(obj.replace("-verified", "")),
      );
      rev.data.audio.forEach((aud) => uniqueLabels.add(aud));
    });

    const uniqueZones = new Set<string>();

    reviewItems?.forEach((rev) => {
      rev.data.zones.forEach((zone) => uniqueZones.add(zone));
    });

    return { labels: [...uniqueLabels], zones: [...uniqueZones] };
  }, [reviewItems]);

  // export

  const [exportMode, setExportMode] = useState<ExportMode>("none");
  const [exportRange, setExportRange] = useState<TimeRange>();
  const [showExportPreview, setShowExportPreview] = useState(false);

  // move to next clip

  const onClipEnded = useCallback(() => {
    if (!mainControllerRef.current) {
      return;
    }

    if (selectedRangeIdx < chunkedTimeRange.length - 1) {
      setSelectedRangeIdx(selectedRangeIdx + 1);
    }
  }, [selectedRangeIdx, chunkedTimeRange]);

  // scrubbing and timeline state

  const [scrubbing, setScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(startTime);
  const [playerTime, setPlayerTime] = useState(startTime);

  const updateSelectedSegment = useCallback(
    (currentTime: number, updateStartTime: boolean) => {
      const index = chunkedTimeRange.findIndex(
        (seg) => seg.after <= currentTime && seg.before >= currentTime,
      );

      if (index != -1) {
        if (updateStartTime) {
          setPlaybackStart(currentTime);
        }

        setSelectedRangeIdx(index);
      }
    },
    [chunkedTimeRange],
  );

  useEffect(() => {
    if (scrubbing || exportRange) {
      if (
        currentTime > currentTimeRange.before + 60 ||
        currentTime < currentTimeRange.after - 60
      ) {
        updateSelectedSegment(currentTime, false);
        return;
      }

      mainControllerRef.current?.scrubToTimestamp(currentTime);

      Object.values(previewRefs.current).forEach((controller) => {
        controller.scrubToTimestamp(currentTime);
      });
    }
    // we only want to seek when current time updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentTime,
    scrubbing,
    timeRange,
    currentTimeRange,
    updateSelectedSegment,
  ]);

  const manuallySetCurrentTime = useCallback(
    (time: number) => {
      if (!currentTimeRange) {
        return;
      }

      setCurrentTime(time);

      if (currentTimeRange.after <= time && currentTimeRange.before >= time) {
        mainControllerRef.current?.seekToTimestamp(time, true);
      } else {
        updateSelectedSegment(time, true);
      }
    },
    [currentTimeRange, updateSelectedSegment],
  );

  useEffect(() => {
    if (!scrubbing) {
      if (Math.abs(currentTime - playerTime) > 10) {
        if (
          currentTimeRange.after <= currentTime &&
          currentTimeRange.before >= currentTime
        ) {
          mainControllerRef.current?.seekToTimestamp(currentTime, true);
        } else {
          updateSelectedSegment(currentTime, true);
        }
      } else if (playerTime != currentTime) {
        mainControllerRef.current?.play();
      }
    }
    // we only want to seek when current time doesn't match the player update time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, scrubbing]);

  const [fullResolution, setFullResolution] = useState<VideoResolutionType>({
    width: 0,
    height: 0,
  });

  const onSelectCamera = useCallback(
    (newCam: string) => {
      setMainCamera(newCam);
      setFullResolution({
        width: 0,
        height: 0,
      });
      setPlaybackStart(currentTime);
    },
    [currentTime],
  );

  // fullscreen

  const { fullscreen, toggleFullscreen, supportsFullScreen } =
    useFullscreen(mainLayoutRef);

  // layout

  const getCameraAspect = useCallback(
    (cam: string) => {
      if (!config) {
        return undefined;
      }

      if (cam == mainCamera && fullResolution.width && fullResolution.height) {
        return fullResolution.width / fullResolution.height;
      }

      const camera = config.cameras[cam];

      if (!camera) {
        return undefined;
      }

      return camera.detect.width / camera.detect.height;
    },
    [config, fullResolution, mainCamera],
  );

  const mainCameraAspect = useMemo(() => {
    const aspectRatio = getCameraAspect(mainCamera);

    if (!aspectRatio) {
      return "normal";
    } else if (aspectRatio > ASPECT_WIDE_LAYOUT) {
      return "wide";
    } else if (aspectRatio < ASPECT_VERTICAL_LAYOUT) {
      return "tall";
    } else {
      return "normal";
    }
  }, [getCameraAspect, mainCamera]);

  const grow = useMemo(() => {
    if (mainCameraAspect == "wide") {
      return "w-full aspect-wide";
    } else if (mainCameraAspect == "tall") {
      if (isDesktop) {
        return "size-full aspect-tall flex flex-col justify-center";
      } else {
        return "size-full";
      }
    } else {
      return "w-full aspect-video";
    }
  }, [mainCameraAspect]);

  const [{ width: mainWidth, height: mainHeight }] =
    useResizeObserver(cameraLayoutRef);

  const mainCameraStyle = useMemo(() => {
    if (isMobile || mainCameraAspect != "normal" || !config) {
      return undefined;
    }

    const camera = config.cameras[mainCamera];

    if (!camera) {
      return undefined;
    }

    const aspect = getCameraAspect(mainCamera);

    if (!aspect) {
      return undefined;
    }

    const availableHeight = mainHeight - 112;

    let percent;
    if (mainWidth / availableHeight < aspect) {
      percent = 100;
    } else {
      const availableWidth = aspect * availableHeight;
      percent =
        (mainWidth < availableWidth
          ? mainWidth / availableWidth
          : availableWidth / mainWidth) * 100;
    }

    return {
      width: `${Math.round(percent)}%`,
    };
  }, [
    config,
    mainCameraAspect,
    mainWidth,
    mainHeight,
    mainCamera,
    getCameraAspect,
  ]);

  const previewRowOverflows = useMemo(() => {
    if (!previewRowRef.current) {
      return false;
    }

    return (
      previewRowRef.current.scrollWidth > previewRowRef.current.clientWidth ||
      previewRowRef.current.scrollHeight > previewRowRef.current.clientHeight
    );
    // we only want to update when the scroll size changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewRowRef.current?.scrollWidth, previewRowRef.current?.scrollHeight]);

  return (
    <div ref={contentRef} className="flex size-full flex-col pt-2">
      <Toaster closeButton={true} />
      <div className="relative mb-2 flex h-11 w-full items-center justify-between px-2">
        {isMobile && (
          <Logo className="absolute inset-x-1/2 h-8 -translate-x-1/2" />
        )}
        <div className={cn("flex items-center gap-2")}>
          <Button
            className="flex items-center gap-2.5 rounded-lg"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
            {isDesktop && <div className="text-primary">Back</div>}
          </Button>
          <Button
            className="flex items-center gap-2.5 rounded-lg"
            size="sm"
            onClick={() => {
              navigate(`/#${mainCamera}`);
            }}
          >
            <FaVideo className="size-5 text-secondary-foreground" />
            {isDesktop && <div className="text-primary">Live</div>}
          </Button>
        </div>
        <div className="flex items-center justify-end gap-2">
          <MobileCameraDrawer
            allCameras={allCameras}
            selected={mainCamera}
            onSelectCamera={(cam) => {
              setPlaybackStart(currentTime);
              setMainCamera(cam);
            }}
          />
          {isDesktop && (
            <ExportDialog
              camera={mainCamera}
              currentTime={currentTime}
              latestTime={timeRange.before}
              mode={exportMode}
              range={exportRange}
              showPreview={showExportPreview}
              setRange={(range) => {
                setExportRange(range);

                if (range != undefined) {
                  mainControllerRef.current?.pause();
                }
              }}
              setMode={setExportMode}
              setShowPreview={setShowExportPreview}
            />
          )}
          {isDesktop && (
            <ReviewFilterGroup
              filters={["date", "general"]}
              reviewSummary={reviewSummary}
              filter={filter}
              motionOnly={false}
              filterList={reviewFilterList}
              showReviewed
              setShowReviewed={() => {}}
              onUpdateFilter={updateFilter}
              setMotionOnly={() => {}}
            />
          )}
          {isDesktop ? (
            <ToggleGroup
              className="*:rounded-md *:px-3 *:py-4"
              type="single"
              size="sm"
              value={timelineType}
              onValueChange={(value: TimelineType) =>
                value ? setTimelineType(value, true) : null
              } // don't allow the severity to be unselected
            >
              <ToggleGroupItem
                className={`${timelineType == "timeline" ? "" : "text-muted-foreground"}`}
                value="timeline"
                aria-label="Select timeline"
              >
                <div className="">Timeline</div>
              </ToggleGroupItem>
              <ToggleGroupItem
                className={`${timelineType == "events" ? "" : "text-muted-foreground"}`}
                value="events"
                aria-label="Select events"
              >
                <div className="">Events</div>
              </ToggleGroupItem>
            </ToggleGroup>
          ) : (
            <MobileTimelineDrawer
              selected={timelineType ?? "timeline"}
              onSelect={setTimelineType}
            />
          )}
          <MobileReviewSettingsDrawer
            camera={mainCamera}
            filter={filter}
            currentTime={currentTime}
            latestTime={timeRange.before}
            mode={exportMode}
            range={exportRange}
            showExportPreview={showExportPreview}
            allLabels={reviewFilterList.labels}
            allZones={reviewFilterList.zones}
            onUpdateFilter={updateFilter}
            setRange={setExportRange}
            setMode={setExportMode}
            setShowExportPreview={setShowExportPreview}
          />
        </div>
      </div>

      <div
        ref={mainLayoutRef}
        className={cn(
          "flex h-full justify-center overflow-hidden",
          isDesktop ? "" : "flex-col gap-2 landscape:flex-row",
        )}
      >
        <div
          ref={cameraLayoutRef}
          className={cn("flex flex-1 flex-wrap", isDesktop ? "w-[80%]" : "")}
        >
          <div
            className={cn(
              "flex size-full items-center",
              mainCameraAspect == "tall"
                ? "flex-row justify-evenly"
                : "flex-col justify-center gap-2",
            )}
          >
            <div
              key={mainCamera}
              className={cn(
                "relative",
                isDesktop
                  ? cn(
                      "flex justify-center px-4",
                      mainCameraAspect == "tall"
                        ? "h-[50%] md:h-[60%] lg:h-[75%] xl:h-[90%]"
                        : mainCameraAspect == "wide"
                          ? "w-full"
                          : "",
                    )
                  : cn(
                      "pt-2 portrait:w-full",
                      mainCameraAspect == "wide"
                        ? "aspect-wide landscape:w-full"
                        : "aspect-video landscape:h-[94%] landscape:xl:h-[65%]",
                    ),
              )}
              style={{
                width: mainCameraStyle ? mainCameraStyle.width : undefined,
                aspectRatio: isDesktop
                  ? mainCameraAspect == "tall"
                    ? getCameraAspect(mainCamera)
                    : undefined
                  : Math.max(1, getCameraAspect(mainCamera) ?? 0),
              }}
            >
              <DynamicVideoPlayer
                className={grow}
                camera={mainCamera}
                timeRange={currentTimeRange}
                cameraPreviews={allPreviews ?? []}
                startTimestamp={playbackStart}
                hotKeys={exportMode != "select"}
                fullscreen={fullscreen}
                onTimestampUpdate={(timestamp) => {
                  setPlayerTime(timestamp);
                  setCurrentTime(timestamp);
                  Object.values(previewRefs.current ?? {}).forEach((prev) =>
                    prev.scrubToTimestamp(Math.floor(timestamp)),
                  );
                }}
                onClipEnded={onClipEnded}
                onControllerReady={(controller) => {
                  mainControllerRef.current = controller;
                }}
                isScrubbing={scrubbing || exportMode == "timeline"}
                supportsFullscreen={supportsFullScreen}
                setFullResolution={setFullResolution}
                toggleFullscreen={toggleFullscreen}
                containerRef={mainLayoutRef}
              />
            </div>
            {isDesktop && (
              <div
                ref={previewRowRef}
                className={cn(
                  "scrollbar-container flex gap-2 overflow-auto",
                  mainCameraAspect == "tall"
                    ? "h-full w-72 flex-col"
                    : `h-28 w-full`,
                  previewRowOverflows ? "" : "items-center justify-center",
                )}
              >
                <div className="w-2" />
                {allCameras.map((cam) => {
                  if (cam == mainCamera || cam == "birdseye") {
                    return;
                  }

                  return (
                    <div
                      key={cam}
                      className={
                        mainCameraAspect == "tall" ? "w-full" : "h-full"
                      }
                      style={{
                        aspectRatio: getCameraAspect(cam),
                      }}
                    >
                      <PreviewPlayer
                        className="size-full"
                        camera={cam}
                        timeRange={currentTimeRange}
                        cameraPreviews={allPreviews ?? []}
                        startTime={startTime}
                        isScrubbing={scrubbing}
                        onControllerReady={(controller) => {
                          previewRefs.current[cam] = controller;
                          controller.scrubToTimestamp(startTime);
                        }}
                        onClick={() => onSelectCamera(cam)}
                      />
                    </div>
                  );
                })}
                <div className="w-2" />
              </div>
            )}
          </div>
        </div>
        <Timeline
          contentRef={contentRef}
          mainCamera={mainCamera}
          timelineType={
            (exportRange == undefined ? timelineType : "timeline") ?? "timeline"
          }
          timeRange={timeRange}
          mainCameraReviewItems={mainCameraReviewItems}
          currentTime={currentTime}
          exportRange={exportMode == "timeline" ? exportRange : undefined}
          setCurrentTime={setCurrentTime}
          manuallySetCurrentTime={manuallySetCurrentTime}
          setScrubbing={setScrubbing}
          setExportRange={setExportRange}
        />
      </div>
    </div>
  );
}

type TimelineProps = {
  contentRef: MutableRefObject<HTMLDivElement | null>;
  mainCamera: string;
  timelineType: TimelineType;
  timeRange: TimeRange;
  mainCameraReviewItems: ReviewSegment[];
  currentTime: number;
  exportRange?: TimeRange;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  manuallySetCurrentTime: (time: number, force: boolean) => void;
  setScrubbing: React.Dispatch<React.SetStateAction<boolean>>;
  setExportRange: (range: TimeRange) => void;
};
function Timeline({
  contentRef,
  mainCamera,
  timelineType,
  timeRange,
  mainCameraReviewItems,
  currentTime,
  exportRange,
  setCurrentTime,
  manuallySetCurrentTime,
  setScrubbing,
  setExportRange,
}: TimelineProps) {
  const { data: motionData } = useSWR<MotionData[]>([
    "review/activity/motion",
    {
      before: timeRange.before,
      after: timeRange.after,
      scale: SEGMENT_DURATION / 2,
      cameras: mainCamera,
    },
  ]);

  const [exportStart, setExportStartTime] = useState<number>(0);
  const [exportEnd, setExportEndTime] = useState<number>(0);

  useEffect(() => {
    if (exportRange && exportStart != 0 && exportEnd != 0) {
      if (exportRange.after != exportStart) {
        setCurrentTime(exportStart);
      } else if (exportRange?.before != exportEnd) {
        setCurrentTime(exportEnd);
      }

      setExportRange({ after: exportStart, before: exportEnd });
    }
    // we only want to update when the export parts change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportStart, exportEnd, setExportRange, setCurrentTime]);

  return (
    <div
      className={`${
        isDesktop
          ? `${timelineType == "timeline" ? "w-[100px]" : "w-60"} no-scrollbar overflow-y-auto`
          : "overflow-hidden portrait:flex-grow landscape:w-[20%]"
      } relative`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[30px] w-full bg-gradient-to-b from-secondary to-transparent"></div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[30px] w-full bg-gradient-to-t from-secondary to-transparent"></div>
      {timelineType == "timeline" ? (
        motionData ? (
          <MotionReviewTimeline
            segmentDuration={30}
            timestampSpread={15}
            timelineStart={timeRange.before}
            timelineEnd={timeRange.after}
            showHandlebar={exportRange == undefined}
            showExportHandles={exportRange != undefined}
            exportStartTime={exportRange?.after}
            exportEndTime={exportRange?.before}
            setExportStartTime={setExportStartTime}
            setExportEndTime={setExportEndTime}
            handlebarTime={currentTime}
            setHandlebarTime={setCurrentTime}
            events={mainCameraReviewItems}
            motion_events={motionData ?? []}
            severityType="significant_motion"
            contentRef={contentRef}
            onHandlebarDraggingChange={(scrubbing) => setScrubbing(scrubbing)}
          />
        ) : (
          <Skeleton className="size-full" />
        )
      ) : (
        <div className="scrollbar-container h-full overflow-auto bg-secondary">
          <div
            className={cn(
              "scrollbar-container grid h-auto grid-cols-1 gap-4 overflow-auto p-4",
              isMobile && "sm:grid-cols-2",
            )}
          >
            {mainCameraReviewItems.length === 0 ? (
              <div className="mt-5 text-center text-primary">
                No events found for this time period.
              </div>
            ) : (
              mainCameraReviewItems.map((review) => {
                if (review.severity === "significant_motion") {
                  return;
                }

                return (
                  <ReviewCard
                    key={review.id}
                    event={review}
                    currentTime={currentTime}
                    onClick={() => {
                      manuallySetCurrentTime(
                        review.start_time - REVIEW_PADDING,
                        true,
                      );
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
