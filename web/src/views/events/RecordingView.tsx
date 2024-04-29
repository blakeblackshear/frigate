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
  const previewRefs = useRef<{ [camera: string]: PreviewController }>({});

  const [playbackStart, setPlaybackStart] = useState(startTime);

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
  const currentTimeRange = useMemo(
    () => chunkedTimeRange[selectedRangeIdx],
    [selectedRangeIdx, chunkedTimeRange],
  );

  // export

  const [exportMode, setExportMode] = useState<ExportMode>("none");
  const [exportRange, setExportRange] = useState<TimeRange>();

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

  const onSelectCamera = useCallback(
    (newCam: string) => {
      setMainCamera(newCam);
      setPlaybackStart(currentTime);
    },
    [currentTime],
  );

  // motion timeline data

  const getCameraAspect = useCallback(
    (cam: string) => {
      if (!config) {
        return undefined;
      }

      const camera = config.cameras[cam];

      if (!camera) {
        return undefined;
      }

      return camera.detect.width / camera.detect.height;
    },
    [config],
  );

  const mainCameraAspect = useMemo(() => {
    const aspectRatio = getCameraAspect(mainCamera);

    if (!aspectRatio) {
      return "normal";
    } else if (aspectRatio > 2) {
      return "wide";
    } else if (aspectRatio < 16 / 9) {
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

  return (
    <div ref={contentRef} className="size-full pt-2 flex flex-col">
      <Toaster />
      <div
        className={`w-full h-11 mb-2 px-2 relative flex items-center justify-between`}
      >
        {isMobile && (
          <Logo className="absolute inset-x-1/2 -translate-x-1/2 h-8" />
        )}
        <div
          className={`flex items-center gap-2 ${isMobile ? "landscape:flex-col" : ""}`}
        >
          <Button
            className={`flex items-center gap-2.5 rounded-lg`}
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
              setRange={(range) => {
                setExportRange(range);

                if (range != undefined) {
                  mainControllerRef.current?.pause();
                }
              }}
              setMode={setExportMode}
            />
          )}
          {isDesktop && (
            <ReviewFilterGroup
              filters={["date", "general"]}
              reviewSummary={reviewSummary}
              filter={filter}
              onUpdateFilter={updateFilter}
              motionOnly={false}
              setMotionOnly={() => {}}
            />
          )}
          {isDesktop ? (
            <ToggleGroup
              className="*:px-3 *:py-4 *:rounded-md"
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
            onUpdateFilter={updateFilter}
            setRange={setExportRange}
            setMode={setExportMode}
          />
        </div>
      </div>

      <div
        className={`h-full flex justify-center overflow-hidden ${isDesktop ? "" : "flex-col landscape:flex-row gap-2"}`}
      >
        <div className={`${isDesktop ? "w-[80%]" : ""} flex flex-1 flex-wrap`}>
          <div
            className={`size-full flex items-center ${mainCameraAspect == "tall" ? "flex-row justify-evenly" : "flex-col justify-center gap-2"}`}
          >
            <div
              key={mainCamera}
              className={`relative ${
                isDesktop
                  ? `${mainCameraAspect == "tall" ? "h-[50%] md:h-[60%] lg:h-[75%] xl:h-[90%]" : mainCameraAspect == "wide" ? "w-full" : "w-[78%]"} px-4 flex justify-center`
                  : `portrait:w-full pt-2 ${mainCameraAspect == "wide" ? "landscape:w-full aspect-wide" : "landscape:h-[94%] aspect-video"}`
              }`}
              style={{
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
              />
            </div>
            {isDesktop && (
              <div
                className={`flex gap-2 ${mainCameraAspect == "tall" ? "h-full w-[12%] flex-col justify-center overflow-y-auto" : "w-full h-[14%] justify-center items-center overflow-x-auto"} `}
              >
                {allCameras.map((cam) => {
                  if (cam == mainCamera) {
                    return;
                  }

                  return (
                    <div
                      key={cam}
                      className={
                        mainCameraAspect == "tall" ? undefined : "h-full"
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
          ? `${timelineType == "timeline" ? "w-[100px]" : "w-60"} overflow-y-auto no-scrollbar`
          : "portrait:flex-grow landscape:w-[20%] overflow-hidden"
      } relative`}
    >
      <div className="absolute top-0 inset-x-0 z-20 w-full h-[30px] bg-gradient-to-b from-secondary to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 inset-x-0 z-20 w-full h-[30px] bg-gradient-to-t from-secondary to-transparent pointer-events-none"></div>
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
            onlyInitialHandlebarScroll={true}
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
        <div
          className={`h-full grid grid-cols-1 gap-4 overflow-auto p-4 bg-secondary ${isDesktop ? "" : "sm:grid-cols-2"}`}
        >
          {mainCameraReviewItems.map((review) => {
            if (review.severity == "significant_motion") {
              return;
            }

            return (
              <ReviewCard
                key={review.id}
                event={review}
                currentTime={currentTime}
                onClick={() => {
                  setScrubbing(true);
                  setCurrentTime(review.start_time - REVIEW_PADDING);
                  setScrubbing(false);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
