import ReviewCard from "@/components/card/ReviewCard";
import FilterCheckBox from "@/components/filter/FilterCheckBox";
import ReviewFilterGroup from "@/components/filter/ReviewFilterGroup";
import ExportDialog from "@/components/overlay/ExportDialog";
import PreviewPlayer, {
  PreviewController,
} from "@/components/player/PreviewPlayer";
import { DynamicVideoController } from "@/components/player/dynamic/DynamicVideoController";
import DynamicVideoPlayer from "@/components/player/dynamic/DynamicVideoPlayer";
import MotionReviewTimeline from "@/components/timeline/MotionReviewTimeline";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useOverlayState } from "@/hooks/use-overlay-state";
import { ExportMode } from "@/types/filter";
import { FrigateConfig } from "@/types/frigateConfig";
import { Preview } from "@/types/preview";
import {
  MotionData,
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
import { FaCircle, FaVideo } from "react-icons/fa";
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import useSWR from "swr";
import { TimeRange } from "@/types/timeline";

const SEGMENT_DURATION = 30;
type TimelineType = "timeline" | "events";

type RecordingViewProps = {
  startCamera: string;
  startTime: number;
  reviewItems?: ReviewSegment[];
  reviewSummary?: ReviewSummary;
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

  const timeRange = useMemo(() => getChunkedTimeDay(startTime), [startTime]);
  const [selectedRangeIdx, setSelectedRangeIdx] = useState(
    timeRange.ranges.findIndex((chunk) => {
      return chunk.after <= startTime && chunk.before >= startTime;
    }),
  );
  const currentTimeRange = useMemo(
    () => timeRange.ranges[selectedRangeIdx],
    [selectedRangeIdx, timeRange],
  );

  // export

  const [exportMode, setExportMode] = useState<ExportMode>("none");
  const [exportRange, setExportRange] = useState<TimeRange>();

  // move to next clip

  const onClipEnded = useCallback(() => {
    if (!mainControllerRef.current) {
      return;
    }

    if (selectedRangeIdx < timeRange.ranges.length - 1) {
      setSelectedRangeIdx(selectedRangeIdx + 1);
    }
  }, [selectedRangeIdx, timeRange]);

  // scrubbing and timeline state

  const [scrubbing, setScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(startTime);
  const [playerTime, setPlayerTime] = useState(startTime);

  const updateSelectedSegment = useCallback(
    (currentTime: number, updateStartTime: boolean) => {
      const index = timeRange.ranges.findIndex(
        (seg) => seg.after <= currentTime && seg.before >= currentTime,
      );

      if (index != -1) {
        if (updateStartTime) {
          setPlaybackStart(currentTime);
        }

        setSelectedRangeIdx(index);
      }
    },
    [timeRange],
  );

  useEffect(() => {
    if (scrubbing) {
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

  const mainCameraAspect = useMemo(() => {
    if (!config) {
      return "normal";
    }

    const aspectRatio =
      config.cameras[mainCamera].detect.width /
      config.cameras[mainCamera].detect.height;

    if (aspectRatio > 2) {
      return "wide";
    } else if (aspectRatio < 16 / 9) {
      return "tall";
    } else {
      return "normal";
    }
  }, [config, mainCamera]);

  const grow = useMemo(() => {
    if (mainCameraAspect == "wide") {
      return "w-full aspect-wide";
    } else if (isDesktop && mainCameraAspect == "tall") {
      return "h-full aspect-tall";
    } else {
      return "w-full aspect-video";
    }
  }, [mainCameraAspect]);

  return (
    <div ref={contentRef} className="size-full flex flex-col">
      <Toaster />
      <div className={`w-full h-10 flex items-center justify-between pr-1`}>
        <Button className="rounded-lg" onClick={() => navigate(-1)}>
          <IoMdArrowRoundBack className="size-5 mr-[10px]" />
          Back
        </Button>
        <div className="flex items-center justify-end gap-2">
          {isMobile && (
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  className="rounded-lg capitalize flex items-center gap-2"
                  size="sm"
                  variant="secondary"
                >
                  <FaVideo className="text-muted-foreground" />
                  {mainCamera.replaceAll("_", " ")}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[75dvh] overflow-hidden">
                {allCameras.map((cam) => (
                  <FilterCheckBox
                    key={cam}
                    CheckIcon={FaCircle}
                    iconClassName="size-2"
                    label={cam.replaceAll("_", " ")}
                    isChecked={cam == mainCamera}
                    onCheckedChange={() => {
                      setPlaybackStart(currentTime);
                      setMainCamera(cam);
                    }}
                  />
                ))}
              </DrawerContent>
            </Drawer>
          )}
          <ExportDialog
            camera={mainCamera}
            currentTime={currentTime}
            latestTime={timeRange.end}
            mode={exportMode}
            range={exportRange}
            setRange={setExportRange}
            setMode={setExportMode}
          />
          <ReviewFilterGroup
            filters={["date", "general"]}
            reviewSummary={reviewSummary}
            filter={filter}
            onUpdateFilter={updateFilter}
            motionOnly={false}
            setMotionOnly={() => {}}
          />
          {isDesktop && (
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
                className={`${timelineType == "timeline" ? "" : "text-gray-500"}`}
                value="timeline"
                aria-label="Select timeline"
              >
                <div className="">Timeline</div>
              </ToggleGroupItem>
              <ToggleGroupItem
                className={`${timelineType == "events" ? "" : "text-gray-500"}`}
                value="events"
                aria-label="Select events"
              >
                <div className="">Events</div>
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </div>

      <div
        className={`flex h-full my-2 justify-center overflow-hidden ${isDesktop ? "" : "flex-col"}`}
      >
        <div className="flex flex-1 flex-wrap">
          <div
            className={`size-full flex px-2 items-center ${mainCameraAspect == "tall" ? "flex-row justify-evenly" : "flex-col justify-center"}`}
          >
            <div
              key={mainCamera}
              className={
                isDesktop
                  ? `flex justify-center items mb-5 ${mainCameraAspect == "tall" ? "h-[96%]" : "w-[82%]"}`
                  : `w-full ${mainCameraAspect == "wide" ? "" : "aspect-video"}`
              }
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
                className={`flex justify-center gap-2 ${mainCameraAspect == "tall" ? "h-full flex-col overflow-y-auto items-center" : "w-full overflow-x-auto"}`}
              >
                {allCameras.map((cam) => {
                  if (cam !== mainCamera) {
                    return (
                      <div key={cam}>
                        <PreviewPlayer
                          className={
                            mainCameraAspect == "tall" ? "" : "size-full"
                          }
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
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>
        {isMobile && (
          <ToggleGroup
            className="py-2 *:px-3 *:py-4 *:rounded-md"
            type="single"
            size="sm"
            value={timelineType}
            onValueChange={(value: TimelineType) =>
              value ? setTimelineType(value) : null
            } // don't allow the severity to be unselected
          >
            <ToggleGroupItem
              className={`${timelineType == "timeline" ? "" : "text-gray-500"}`}
              value="timeline"
              aria-label="Select timeline"
            >
              <div className="">Timeline</div>
            </ToggleGroupItem>
            <ToggleGroupItem
              className={`${timelineType == "events" ? "" : "text-gray-500"}`}
              value="events"
              aria-label="Select events"
            >
              <div className="">Events</div>
            </ToggleGroupItem>
          </ToggleGroup>
        )}
        <Timeline
          contentRef={contentRef}
          mainCamera={mainCamera}
          timelineType={timelineType ?? "timeline"}
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
  timeRange: { start: number; end: number };
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
      before: timeRange.end,
      after: timeRange.start,
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
  }, [exportRange, exportStart, exportEnd, setExportRange, setCurrentTime]);

  if (exportRange != undefined || timelineType == "timeline") {
    return (
      <div
        className={
          isDesktop
            ? "w-[100px] mt-2 overflow-y-auto no-scrollbar"
            : "flex-grow overflow-hidden"
        }
      >
        <MotionReviewTimeline
          segmentDuration={30}
          timestampSpread={15}
          timelineStart={timeRange.end}
          timelineEnd={timeRange.start}
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
      </div>
    );
  }

  return (
    <div
      className={`${isDesktop ? "w-60" : "w-full"} h-full relative p-4 flex flex-col gap-4 bg-secondary overflow-auto`}
    >
      <div className="absolute top-0 inset-x-0 z-20 w-full h-[30px] bg-gradient-to-b from-secondary to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 inset-x-0 z-20 w-full h-[30px] bg-gradient-to-t from-secondary to-transparent pointer-events-none"></div>
      {mainCameraReviewItems.map((review) => {
        if (review.severity == "significant_motion") {
          return;
        }

        return (
          <ReviewCard
            key={review.id}
            event={review}
            currentTime={currentTime}
            onClick={() => setCurrentTime(review.start_time)}
          />
        );
      })}
    </div>
  );
}
