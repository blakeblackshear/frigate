import Logo from "@/components/Logo";
import NewReviewData from "@/components/dynamic/NewReviewData";
import ReviewActionGroup from "@/components/filter/ReviewActionGroup";
import ReviewFilterGroup from "@/components/filter/ReviewFilterGroup";
import PreviewThumbnailPlayer from "@/components/player/PreviewThumbnailPlayer";
import EventReviewTimeline from "@/components/timeline/EventReviewTimeline";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { useScrollLockout } from "@/hooks/use-mouse-listener";
import { FrigateConfig } from "@/types/frigateConfig";
import { Preview } from "@/types/preview";
import {
  MotionData,
  ReviewFilter,
  ReviewSegment,
  ReviewSeverity,
  ReviewSummary,
} from "@/types/review";
import { getChunkedTimeRange } from "@/utils/timelineUtil";
import axios from "axios";
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { LuFolderCheck } from "react-icons/lu";
import { MdCircle } from "react-icons/md";
import useSWR from "swr";
import MotionReviewTimeline from "@/components/timeline/MotionReviewTimeline";
import { Button } from "@/components/ui/button";
import PreviewPlayer, {
  PreviewController,
} from "@/components/player/PreviewPlayer";
import SummaryTimeline from "@/components/timeline/SummaryTimeline";
import { RecordingStartingPoint } from "@/types/record";
import VideoControls from "@/components/player/VideoControls";
import { TimeRange } from "@/types/timeline";
import { useCameraMotionNextTimestamp } from "@/hooks/use-camera-activity";

type EventViewProps = {
  reviews?: ReviewSegment[];
  reviewSummary?: ReviewSummary;
  relevantPreviews?: Preview[];
  timeRange: { before: number; after: number };
  filter?: ReviewFilter;
  severity: ReviewSeverity;
  startTime?: number;
  setSeverity: (severity: ReviewSeverity) => void;
  markItemAsReviewed: (review: ReviewSegment) => void;
  markAllItemsAsReviewed: (currentItems: ReviewSegment[]) => void;
  onOpenRecording: (recordingInfo: RecordingStartingPoint) => void;
  pullLatestData: () => void;
  updateFilter: (filter: ReviewFilter) => void;
};
export default function EventView({
  reviews,
  reviewSummary,
  relevantPreviews,
  timeRange,
  filter,
  severity,
  startTime,
  setSeverity,
  markItemAsReviewed,
  markAllItemsAsReviewed,
  onOpenRecording,
  pullLatestData,
  updateFilter,
}: EventViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const contentRef = useRef<HTMLDivElement | null>(null);

  // review counts

  const reviewCounts = useMemo(() => {
    if (!reviewSummary) {
      return { alert: 0, detection: 0, significant_motion: 0 };
    }

    let summary;
    if (filter?.before == undefined) {
      summary = reviewSummary["last24Hours"];
    } else {
      const day = new Date(filter.before * 1000);
      const key = `${day.getFullYear()}-${("0" + (day.getMonth() + 1)).slice(-2)}-${("0" + day.getDate()).slice(-2)}`;
      summary = reviewSummary[key];
    }

    if (!summary) {
      return { alert: -1, detection: -1, significant_motion: -1 };
    }

    if (filter?.showReviewed == 1) {
      return {
        alert: summary.total_alert,
        detection: summary.total_detection,
        significant_motion: summary.total_motion,
      };
    } else {
      return {
        alert: summary.total_alert - summary.reviewed_alert,
        detection: summary.total_detection - summary.reviewed_detection,
        significant_motion: summary.total_motion - summary.reviewed_motion,
      };
    }
  }, [filter, reviewSummary]);

  // review paging

  const reviewItems = useMemo(() => {
    if (!reviews) {
      return undefined;
    }

    const all: ReviewSegment[] = [];
    const alerts: ReviewSegment[] = [];
    const detections: ReviewSegment[] = [];
    const motion: ReviewSegment[] = [];

    reviews?.forEach((segment) => {
      all.push(segment);

      switch (segment.severity) {
        case "alert":
          alerts.push(segment);
          break;
        case "detection":
          detections.push(segment);
          break;
        default:
          motion.push(segment);
          break;
      }
    });

    return {
      all: all,
      alert: alerts,
      detection: detections,
      significant_motion: motion,
    };
  }, [reviews]);

  // review interaction

  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const onSelectReview = useCallback(
    (review: ReviewSegment, ctrl: boolean) => {
      if (selectedReviews.length > 0 || ctrl) {
        const index = selectedReviews.indexOf(review.id);

        if (index != -1) {
          if (selectedReviews.length == 1) {
            setSelectedReviews([]);
          } else {
            const copy = [
              ...selectedReviews.slice(0, index),
              ...selectedReviews.slice(index + 1),
            ];
            setSelectedReviews(copy);
          }
        } else {
          const copy = [...selectedReviews];
          copy.push(review.id);
          setSelectedReviews(copy);
        }
      } else {
        onOpenRecording({
          camera: review.camera,
          startTime: review.start_time,
          severity: review.severity,
        });

        markItemAsReviewed(review);
      }
    },
    [selectedReviews, setSelectedReviews, onOpenRecording, markItemAsReviewed],
  );

  const exportReview = useCallback(
    (id: string) => {
      const review = reviewItems?.all?.find((seg) => seg.id == id);

      if (!review) {
        return;
      }

      axios.post(
        `export/${review.camera}/start/${review.start_time}/end/${review.end_time}`,
        { playback: "realtime" },
      );
    },
    [reviewItems],
  );

  const [motionOnly, setMotionOnly] = useState(false);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex flex-col size-full">
      <div className="h-11 px-2 relative flex justify-between items-center">
        {isMobile && (
          <Logo className="absolute inset-x-1/2 -translate-x-1/2 h-8" />
        )}
        <ToggleGroup
          className="*:px-3 *:py-4 *:rounded-2xl"
          type="single"
          size="sm"
          value={severity}
          onValueChange={(value: ReviewSeverity) =>
            value ? setSeverity(value) : null
          } // don't allow the severity to be unselected
        >
          <ToggleGroupItem
            className={`${severity == "alert" ? "" : "text-gray-500"}`}
            value="alert"
            aria-label="Select alerts"
          >
            <MdCircle className="size-2 md:mr-[10px] text-severity_alert" />
            <div className="hidden md:block">
              Alerts{` ∙ ${reviewCounts.alert > -1 ? reviewCounts.alert : ""}`}
            </div>
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`${severity == "detection" ? "" : "text-gray-500"}`}
            value="detection"
            aria-label="Select detections"
          >
            <MdCircle className="size-2 md:mr-[10px] text-severity_detection" />
            <div className="hidden md:block">
              Detections
              {` ∙ ${reviewCounts.detection > -1 ? reviewCounts.detection : ""}`}
            </div>
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`px-3 py-4 rounded-2xl ${
              severity == "significant_motion" ? "" : "text-gray-500"
            }`}
            value="significant_motion"
            aria-label="Select motion"
          >
            <MdCircle className="size-2 md:mr-[10px] text-severity_significant_motion" />
            <div className="hidden md:block">Motion</div>
          </ToggleGroupItem>
        </ToggleGroup>

        {selectedReviews.length <= 0 ? (
          <ReviewFilterGroup
            filters={
              severity == "significant_motion"
                ? ["cameras", "date", "motionOnly"]
                : ["cameras", "reviewed", "date", "general"]
            }
            reviewSummary={reviewSummary}
            filter={filter}
            onUpdateFilter={updateFilter}
            motionOnly={motionOnly}
            setMotionOnly={setMotionOnly}
          />
        ) : (
          <ReviewActionGroup
            selectedReviews={selectedReviews}
            setSelectedReviews={setSelectedReviews}
            onExport={exportReview}
            pullLatestData={pullLatestData}
          />
        )}
      </div>

      <div className="flex h-full overflow-hidden">
        {severity != "significant_motion" && (
          <DetectionReview
            contentRef={contentRef}
            reviewItems={reviewItems}
            relevantPreviews={relevantPreviews}
            selectedReviews={selectedReviews}
            itemsToReview={reviewCounts[severity]}
            severity={severity}
            filter={filter}
            timeRange={timeRange}
            markItemAsReviewed={markItemAsReviewed}
            markAllItemsAsReviewed={markAllItemsAsReviewed}
            onSelectReview={onSelectReview}
            pullLatestData={pullLatestData}
          />
        )}
        {severity == "significant_motion" && (
          <MotionReview
            key={timeRange.before}
            contentRef={contentRef}
            reviewItems={reviewItems}
            relevantPreviews={relevantPreviews}
            timeRange={timeRange}
            startTime={startTime}
            filter={filter}
            motionOnly={motionOnly}
            onOpenRecording={onOpenRecording}
          />
        )}
      </div>
    </div>
  );
}

type DetectionReviewProps = {
  contentRef: MutableRefObject<HTMLDivElement | null>;
  reviewItems?: {
    all: ReviewSegment[];
    alert: ReviewSegment[];
    detection: ReviewSegment[];
    significant_motion: ReviewSegment[];
  };
  itemsToReview?: number;
  relevantPreviews?: Preview[];
  selectedReviews: string[];
  severity: ReviewSeverity;
  filter?: ReviewFilter;
  timeRange: { before: number; after: number };
  markItemAsReviewed: (review: ReviewSegment) => void;
  markAllItemsAsReviewed: (currentItems: ReviewSegment[]) => void;
  onSelectReview: (review: ReviewSegment, ctrl: boolean) => void;
  pullLatestData: () => void;
};
function DetectionReview({
  contentRef,
  reviewItems,
  itemsToReview,
  relevantPreviews,
  selectedReviews,
  severity,
  filter,
  timeRange,
  markItemAsReviewed,
  markAllItemsAsReviewed,
  onSelectReview,
  pullLatestData,
}: DetectionReviewProps) {
  const reviewTimelineRef = useRef<HTMLDivElement>(null);

  const segmentDuration = 60;

  // review data
  const currentItems = useMemo(() => {
    if (!reviewItems) {
      return null;
    }

    const current = reviewItems[severity];

    if (!current || current.length == 0) {
      return [];
    }

    if (filter?.showReviewed != 1) {
      return current.filter((seg) => !seg.has_been_reviewed);
    } else {
      return current;
    }
    // only refresh when severity or filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, filter, reviewItems?.all.length]);

  // preview

  const [previewTime, setPreviewTime] = useState<number>();

  const onPreviewTimeUpdate = useCallback(
    (time: number | undefined) => {
      if (!time) {
        setPreviewTime(time);
        return;
      }

      if (!previewTime || time > previewTime) {
        setPreviewTime(time);
      }
    },
    [previewTime, setPreviewTime],
  );

  // timeline interaction

  const timelineDuration = useMemo(
    () => timeRange.before - timeRange.after,
    [timeRange],
  );

  const { alignStartDateToTimeline, getVisibleTimelineDuration } =
    useTimelineUtils({
      segmentDuration,
      timelineDuration,
      timelineRef: reviewTimelineRef,
    });

  const scrollLock = useScrollLockout(contentRef);

  const [minimap, setMinimap] = useState<string[]>([]);
  const minimapObserver = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    const visibleTimestamps = new Set<string>();
    minimapObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const start = (entry.target as HTMLElement).dataset.start;

          if (!start) {
            return;
          }

          if (entry.isIntersecting) {
            visibleTimestamps.add(start);
          } else {
            visibleTimestamps.delete(start);
          }

          setMinimap([...visibleTimestamps]);
        });
      },
      { root: contentRef.current, threshold: isDesktop ? 0.1 : 0.5 },
    );

    return () => {
      minimapObserver.current?.disconnect();
    };
  }, [contentRef, minimapObserver]);

  const minimapBounds = useMemo(() => {
    const data = {
      start: 0,
      end: 0,
    };
    const list = minimap.sort();

    if (list.length > 0) {
      data.end = parseFloat(list.at(-1) || "0");
      data.start = parseFloat(list[0]);
    }

    return data;
  }, [minimap]);

  const minimapRef = useCallback(
    (node: HTMLElement | null) => {
      if (!minimapObserver.current) {
        return;
      }

      try {
        if (node) minimapObserver.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    [minimapObserver],
  );

  const showMinimap = useMemo(() => {
    if (!contentRef.current) {
      return false;
    }

    // don't show minimap if the view is not scrollable
    if (contentRef.current.scrollHeight < contentRef.current.clientHeight) {
      return false;
    }

    const visibleTime = getVisibleTimelineDuration();
    const minimapTime = minimapBounds.end - minimapBounds.start;
    if (visibleTime && minimapTime >= visibleTime * 0.75) {
      return false;
    }

    return true;
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentRef.current?.scrollHeight, minimapBounds]);

  const visibleTimestamps = useMemo(
    () => minimap.map((str) => parseFloat(str)),
    [minimap],
  );

  return (
    <>
      <div
        ref={contentRef}
        className="mt-2 flex flex-1 flex-wrap content-start gap-2 md:gap-4 overflow-y-auto no-scrollbar"
      >
        {filter?.before == undefined && (
          <NewReviewData
            className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            contentRef={contentRef}
            reviewItems={currentItems}
            itemsToReview={itemsToReview}
            pullLatestData={pullLatestData}
          />
        )}

        {!currentItems && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <ActivityIndicator />
          </div>
        )}

        {currentItems?.length === 0 && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex flex-col justify-center items-center text-center">
            <LuFolderCheck className="size-16" />
            There are no {severity.replace(/_/g, " ")}s to review
          </div>
        )}

        <div
          className="w-full m-2 p-1 grid sm:grid-cols-2 md:grid-cols-3 3xl:grid-cols-4 gap-2 md:gap-4"
          ref={contentRef}
        >
          {currentItems &&
            currentItems.map((value) => {
              const selected = selectedReviews.includes(value.id);

              return (
                <div
                  key={value.id}
                  ref={minimapRef}
                  data-start={value.start_time}
                  data-segment-start={
                    alignStartDateToTimeline(value.start_time) - segmentDuration
                  }
                  className={`review-item outline outline-offset-1 rounded-lg shadow-none transition-all my-1 md:my-0 ${selected ? `outline-3 outline-severity_${value.severity} shadow-severity_${value.severity}` : "outline-0 duration-500"}`}
                >
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <PreviewThumbnailPlayer
                      review={value}
                      allPreviews={relevantPreviews}
                      setReviewed={markItemAsReviewed}
                      scrollLock={scrollLock}
                      onTimeUpdate={onPreviewTimeUpdate}
                      onClick={onSelectReview}
                    />
                  </div>
                </div>
              );
            })}
          {(currentItems?.length ?? 0) > 0 && (itemsToReview ?? 0) > 0 && (
            <div className="col-span-full flex justify-center items-center">
              <Button
                className="text-white"
                variant="select"
                onClick={() => {
                  markAllItemsAsReviewed(currentItems ?? []);
                }}
              >
                Mark these items as reviewed
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="w-[65px] md:w-[110px] mt-2 flex flex-row">
        <div className="w-[55px] md:w-[100px] overflow-y-auto no-scrollbar">
          <EventReviewTimeline
            segmentDuration={segmentDuration}
            timestampSpread={15}
            timelineStart={timeRange.before}
            timelineEnd={timeRange.after}
            showMinimap={showMinimap && !previewTime}
            minimapStartTime={minimapBounds.start}
            minimapEndTime={minimapBounds.end}
            showHandlebar={previewTime != undefined}
            handlebarTime={previewTime}
            visibleTimestamps={visibleTimestamps}
            events={reviewItems?.all ?? []}
            severityType={severity}
            contentRef={contentRef}
            timelineRef={reviewTimelineRef}
            dense={isMobile}
          />
        </div>
        <div className="w-[10px]">
          <SummaryTimeline
            reviewTimelineRef={reviewTimelineRef}
            timelineStart={timeRange.before}
            timelineEnd={timeRange.after}
            segmentDuration={segmentDuration}
            events={reviewItems?.all ?? []}
            severityType={severity}
          />
        </div>
      </div>
    </>
  );
}

type MotionReviewProps = {
  contentRef: MutableRefObject<HTMLDivElement | null>;
  reviewItems?: {
    all: ReviewSegment[];
    alert: ReviewSegment[];
    detection: ReviewSegment[];
    significant_motion: ReviewSegment[];
  };
  relevantPreviews?: Preview[];
  timeRange: TimeRange;
  startTime?: number;
  filter?: ReviewFilter;
  motionOnly?: boolean;
  onOpenRecording: (data: RecordingStartingPoint) => void;
};
function MotionReview({
  contentRef,
  reviewItems,
  relevantPreviews,
  timeRange,
  startTime,
  filter,
  motionOnly = false,
  onOpenRecording,
}: MotionReviewProps) {
  const segmentDuration = 30;
  const { data: config } = useSWR<FrigateConfig>("config");

  const reviewCameras = useMemo(() => {
    if (!config) {
      return [];
    }

    let cameras;
    if (!filter || !filter.cameras) {
      cameras = Object.values(config.cameras);
    } else {
      const filteredCams = filter.cameras;

      cameras = Object.values(config.cameras).filter((cam) =>
        filteredCams.includes(cam.name),
      );
    }

    return cameras.sort((a, b) => a.ui.order - b.ui.order);
  }, [config, filter]);

  const videoPlayersRef = useRef<{ [camera: string]: PreviewController }>({});

  // motion data

  const { data: motionData } = useSWR<MotionData[]>([
    "review/activity/motion",
    {
      before: timeRange.before,
      after: timeRange.after,
      scale: segmentDuration / 2,
      cameras: filter?.cameras?.join(",") ?? null,
    },
  ]);

  // timeline time

  const timeRangeSegments = useMemo(
    () => getChunkedTimeRange(timeRange.after, timeRange.before),
    [timeRange],
  );

  const initialIndex = useMemo(() => {
    if (!startTime) {
      return timeRangeSegments.ranges.length - 1;
    }

    return timeRangeSegments.ranges.findIndex(
      (seg) => seg.after <= startTime && seg.before >= startTime,
    );
    // only render once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedRangeIdx, setSelectedRangeIdx] = useState(initialIndex);
  const [currentTime, setCurrentTime] = useState<number>(
    startTime ?? timeRangeSegments.ranges[selectedRangeIdx]?.before,
  );
  const currentTimeRange = useMemo(
    () => timeRangeSegments.ranges[selectedRangeIdx],
    [selectedRangeIdx, timeRangeSegments],
  );

  const [scrubbing, setScrubbing] = useState(false);
  const [playing, setPlaying] = useState(false);

  // move to next clip

  useEffect(() => {
    if (
      currentTime > currentTimeRange.before + 60 ||
      currentTime < currentTimeRange.after - 60
    ) {
      const index = timeRangeSegments.ranges.findIndex(
        (seg) => seg.after <= currentTime && seg.before >= currentTime,
      );

      if (index != -1) {
        Object.values(videoPlayersRef.current).forEach((controller) => {
          controller.setNewPreviewStartTime(currentTime);
        });
        setSelectedRangeIdx(index);
      }
      return;
    }

    Object.values(videoPlayersRef.current).forEach((controller) => {
      controller.scrubToTimestamp(currentTime);
    });
  }, [currentTime, currentTimeRange, timeRangeSegments]);

  // playback

  const [playbackRate, setPlaybackRate] = useState(8);
  const [controlsOpen, setControlsOpen] = useState(false);

  const nextTimestamp = useCameraMotionNextTimestamp(
    timeRangeSegments.end,
    segmentDuration,
    motionOnly,
    reviewItems?.all ?? [],
    motionData ?? [],
    currentTime,
  );

  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (nextTimestamp) {
      if (!playing && timeoutIdRef.current != null) {
        clearTimeout(timeoutIdRef.current);
        return;
      }

      const handleTimeout = () => {
        setCurrentTime(nextTimestamp);
        timeoutIdRef.current = setTimeout(handleTimeout, 500 / playbackRate);
      };

      timeoutIdRef.current = setTimeout(handleTimeout, 500 / playbackRate);

      return () => {
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }
      };
    }
  }, [playing, playbackRate, nextTimestamp]);

  const { alignStartDateToTimeline } = useTimelineUtils({
    segmentDuration,
  });

  const getDetectionType = useCallback(
    (cameraName: string) => {
      if (motionOnly) {
        const segmentStartTime = alignStartDateToTimeline(currentTime);
        const segmentEndTime = segmentStartTime + segmentDuration;
        const matchingItem = motionData?.find((item) => {
          const cameras = item.camera.split(",").map((camera) => camera.trim());
          return (
            item.start_time >= segmentStartTime &&
            item.start_time < segmentEndTime &&
            cameras.includes(cameraName)
          );
        });

        return matchingItem ? "significant_motion" : null;
      } else {
        const segmentStartTime = alignStartDateToTimeline(currentTime);
        const segmentEndTime = segmentStartTime + segmentDuration;
        const matchingItem = reviewItems?.all.find(
          (item) =>
            ((item.start_time >= segmentStartTime &&
              item.start_time < segmentEndTime) ||
              (item.end_time > segmentStartTime &&
                item.end_time <= segmentEndTime) ||
              (item.start_time <= segmentStartTime &&
                item.end_time >= segmentEndTime)) &&
            item.camera === cameraName,
        );

        return matchingItem ? matchingItem.severity : null;
      }
    },
    [
      reviewItems,
      motionData,
      currentTime,
      motionOnly,
      alignStartDateToTimeline,
    ],
  );

  if (!relevantPreviews) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <div className="flex flex-1 flex-wrap content-start gap-2 md:gap-4 overflow-y-auto no-scrollbar">
        <div
          ref={contentRef}
          className="w-full m-2 p-1 grid sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-2 md:gap-4 overflow-auto no-scrollbar"
        >
          {reviewCameras.map((camera) => {
            let grow;
            const aspectRatio = camera.detect.width / camera.detect.height;
            if (aspectRatio > 2) {
              grow = "sm:col-span-2 aspect-wide";
            } else if (aspectRatio < 1) {
              grow = "md:row-span-2 md:h-full aspect-tall";
            } else {
              grow = "aspect-video";
            }
            const detectionType = getDetectionType(camera.name);
            return (
              <PreviewPlayer
                key={camera.name}
                className={`${detectionType ? `outline outline-3 outline-offset-1 outline-severity_${detectionType}` : "outline-0 shadow-none"} rounded-2xl ${grow}`}
                camera={camera.name}
                timeRange={currentTimeRange}
                startTime={startTime}
                cameraPreviews={relevantPreviews || []}
                isScrubbing={scrubbing}
                onControllerReady={(controller) => {
                  videoPlayersRef.current[camera.name] = controller;
                }}
                onClick={() =>
                  onOpenRecording({
                    camera: camera.name,
                    startTime: currentTime,
                    severity: "significant_motion",
                  })
                }
              />
            );
          })}
        </div>
      </div>
      <div className="w-[55px] md:w-[100px] mt-2 overflow-y-auto no-scrollbar">
        <MotionReviewTimeline
          segmentDuration={segmentDuration}
          timestampSpread={15}
          timelineStart={timeRangeSegments.end}
          timelineEnd={timeRangeSegments.start}
          motionOnly={motionOnly}
          showHandlebar
          handlebarTime={currentTime}
          setHandlebarTime={setCurrentTime}
          events={reviewItems?.all ?? []}
          motion_events={motionData ?? []}
          severityType="significant_motion"
          contentRef={contentRef}
          onHandlebarDraggingChange={(scrubbing) => {
            if (playing && scrubbing) {
              setPlaying(false);
            }

            setScrubbing(scrubbing);
          }}
          dense={isMobile}
        />
      </div>

      <VideoControls
        className="absolute bottom-16 left-1/2 -translate-x-1/2"
        features={{
          volume: false,
          seek: true,
          playbackRate: true,
        }}
        isPlaying={playing}
        playbackRates={[4, 8, 12, 16]}
        playbackRate={playbackRate}
        controlsOpen={controlsOpen}
        setControlsOpen={setControlsOpen}
        onPlayPause={setPlaying}
        onSeek={(diff) => {
          const wasPlaying = playing;

          if (wasPlaying) {
            setPlaying(false);
          }

          setCurrentTime(currentTime + diff);

          if (wasPlaying) {
            setTimeout(() => setPlaying(true), 100);
          }
        }}
        onSetPlaybackRate={setPlaybackRate}
        show={currentTime < timeRange.before - 4}
      />
    </>
  );
}
