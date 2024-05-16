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
  REVIEW_PADDING,
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
import useOptimisticState from "@/hooks/use-optimistic-state";
import { Skeleton } from "@/components/ui/skeleton";
import scrollIntoView from "scroll-into-view-if-needed";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

type EventViewProps = {
  reviews?: ReviewSegment[];
  reviewSummary?: ReviewSummary;
  relevantPreviews?: Preview[];
  timeRange: TimeRange;
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
        alert: summary.total_alert ?? 0,
        detection: summary.total_detection ?? 0,
        significant_motion: summary.total_motion ?? 0,
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
          startTime: review.start_time - REVIEW_PADDING,
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

      axios
        .post(
          `export/${review.camera}/start/${review.start_time}/end/${review.end_time}`,
          { playback: "realtime" },
        )
        .then((response) => {
          if (response.status == 200) {
            toast.success(
              "Successfully started export. View the file in the /exports folder.",
              { position: "top-center" },
            );
          }
        })
        .catch((error) => {
          if (error.response?.data?.message) {
            toast.error(
              `Failed to start export: ${error.response.data.message}`,
              { position: "top-center" },
            );
          } else {
            toast.error(`Failed to start export: ${error.message}`, {
              position: "top-center",
            });
          }
        });
    },
    [reviewItems],
  );

  const [motionOnly, setMotionOnly] = useState(false);
  const [severityToggle, setSeverityToggle] = useOptimisticState(
    severity,
    setSeverity,
    100,
  );

  // review filter info

  const reviewLabels = useMemo(() => {
    const uniqueLabels = new Set<string>();

    reviewItems?.all?.forEach((rev) => {
      rev.data.objects.forEach((obj) =>
        uniqueLabels.add(obj.replace("-verified", "")),
      );
      rev.data.audio.forEach((aud) => uniqueLabels.add(aud));
    });

    return [...uniqueLabels];
  }, [reviewItems]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col pt-2 md:py-2">
      <Toaster closeButton={true} />
      <div className="relative mb-2 flex h-11 items-center justify-between pl-3 pr-2">
        {isMobile && (
          <Logo className="absolute inset-x-1/2 h-8 -translate-x-1/2" />
        )}
        <ToggleGroup
          className="*:rounded-md *:px-3 *:py-4"
          type="single"
          size="sm"
          value={severityToggle}
          onValueChange={(value: ReviewSeverity) =>
            value ? setSeverityToggle(value) : null
          } // don't allow the severity to be unselected
        >
          <ToggleGroupItem
            className={`${severityToggle == "alert" ? "" : "text-muted-foreground"}`}
            value="alert"
            aria-label="Select alerts"
          >
            <MdCircle className="size-2 text-severity_alert md:mr-[10px]" />
            <div className="hidden md:block">
              Alerts{` ∙ ${reviewCounts.alert > -1 ? reviewCounts.alert : ""}`}
            </div>
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`${severityToggle == "detection" ? "" : "text-muted-foreground"}`}
            value="detection"
            aria-label="Select detections"
          >
            <MdCircle className="size-2 text-severity_detection md:mr-[10px]" />
            <div className="hidden md:block">
              Detections
              {` ∙ ${reviewCounts.detection > -1 ? reviewCounts.detection : ""}`}
            </div>
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`rounded-lg px-3 py-4 ${
              severityToggle == "significant_motion"
                ? ""
                : "text-muted-foreground"
            }`}
            value="significant_motion"
            aria-label="Select motion"
          >
            <MdCircle className="size-2 text-severity_significant_motion md:mr-[10px]" />
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
            currentSeverity={severityToggle}
            reviewSummary={reviewSummary}
            filter={filter}
            motionOnly={motionOnly}
            filterLabels={reviewLabels}
            onUpdateFilter={updateFilter}
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
            itemsToReview={reviewCounts[severityToggle]}
            severity={severity}
            filter={filter}
            timeRange={timeRange}
            startTime={startTime}
            loading={severity != severityToggle}
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
  startTime?: number;
  loading: boolean;
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
  startTime,
  loading,
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

    let current;

    if (filter?.showAll) {
      current = reviewItems.all;
    } else {
      current = reviewItems[severity];
    }

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

  // existing review item

  useEffect(() => {
    if (!startTime || !currentItems || currentItems.length == 0) {
      return;
    }

    const element = contentRef.current?.querySelector(
      `[data-start="${startTime + REVIEW_PADDING}"]`,
    );
    if (element) {
      scrollIntoView(element, {
        scrollMode: "if-needed",
        behavior: "smooth",
      });
    }
    // only run when start time changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime]);

  return (
    <>
      <div
        ref={contentRef}
        className="no-scrollbar flex flex-1 flex-wrap content-start gap-2 overflow-y-auto md:gap-4"
      >
        {filter?.before == undefined && (
          <NewReviewData
            className="pointer-events-none absolute left-1/2 z-50 -translate-x-1/2"
            contentRef={contentRef}
            reviewItems={currentItems}
            itemsToReview={loading ? 0 : itemsToReview}
            pullLatestData={pullLatestData}
          />
        )}

        {!currentItems && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <ActivityIndicator />
          </div>
        )}

        {!loading && currentItems?.length === 0 && (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
            <LuFolderCheck className="size-16" />
            There are no {severity.replace(/_/g, " ")}s to review
          </div>
        )}

        <div
          className="mx-2 grid w-full gap-2 px-1 sm:grid-cols-2 md:grid-cols-3 md:gap-4 3xl:grid-cols-4"
          ref={contentRef}
        >
          {!loading && currentItems
            ? currentItems.map((value) => {
                const selected = selectedReviews.includes(value.id);

                return (
                  <div
                    key={value.id}
                    ref={minimapRef}
                    data-start={value.start_time}
                    data-segment-start={
                      alignStartDateToTimeline(value.start_time) -
                      segmentDuration
                    }
                    className="review-item relative rounded-lg"
                  >
                    <div className="aspect-video overflow-hidden rounded-lg">
                      <PreviewThumbnailPlayer
                        review={value}
                        allPreviews={relevantPreviews}
                        timeRange={timeRange}
                        setReviewed={markItemAsReviewed}
                        scrollLock={scrollLock}
                        onTimeUpdate={onPreviewTimeUpdate}
                        onClick={onSelectReview}
                      />
                    </div>
                    <div
                      className={`review-item-ring pointer-events-none absolute inset-0 z-10 size-full rounded-lg outline outline-[3px] -outline-offset-[2.8px] ${selected ? `outline-severity_${value.severity} shadow-severity_${value.severity}` : "outline-transparent duration-500"}`}
                    />
                  </div>
                );
              })
            : (itemsToReview ?? 0) > 0 &&
              Array(itemsToReview)
                .fill(0)
                .map((_, idx) => (
                  <Skeleton key={idx} className="aspect-video size-full" />
                ))}
          {!loading &&
            (currentItems?.length ?? 0) > 0 &&
            (itemsToReview ?? 0) > 0 && (
              <div className="col-span-full flex items-center justify-center">
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
      <div className="flex w-[65px] flex-row md:w-[110px]">
        <div className="no-scrollbar w-[55px] overflow-y-auto md:w-[100px]">
          {loading ? (
            <Skeleton className="size-full" />
          ) : (
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
          )}
        </div>
        <div className="w-[10px]">
          {loading ? (
            <Skeleton className="w-full" />
          ) : (
            <SummaryTimeline
              reviewTimelineRef={reviewTimelineRef}
              timelineStart={timeRange.before}
              timelineEnd={timeRange.after}
              segmentDuration={segmentDuration}
              events={reviewItems?.all ?? []}
              severityType={severity}
            />
          )}
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

  const [previewStart, setPreviewStart] = useState(startTime);

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
        setPreviewStart(currentTime);
        setSelectedRangeIdx(index);
      }
      return;
    }

    Object.values(videoPlayersRef.current).forEach((controller) => {
      controller.scrubToTimestamp(currentTime);
    });
    // only refresh when current time or available segments changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, timeRangeSegments]);

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

      if (nextTimestamp >= timeRange.before - 4) {
        setPlaying(false);
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
  }, [playing, playbackRate, nextTimestamp, setPlaying, timeRange]);

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
        const matchingItem = reviewItems?.all.find((item) => {
          const endTime = item.end_time ?? timeRange.before;

          return (
            ((item.start_time >= segmentStartTime &&
              item.start_time < segmentEndTime) ||
              (endTime > segmentStartTime && endTime <= segmentEndTime) ||
              (item.start_time <= segmentStartTime &&
                endTime >= segmentEndTime)) &&
            item.camera === cameraName
          );
        });

        return matchingItem ? matchingItem.severity : null;
      }
    },
    [
      reviewItems,
      motionData,
      currentTime,
      timeRange,
      motionOnly,
      alignStartDateToTimeline,
    ],
  );

  if (!relevantPreviews) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <div className="no-scrollbar flex flex-1 flex-wrap content-start gap-2 overflow-y-auto md:gap-4">
        <div
          ref={contentRef}
          className="no-scrollbar mx-2 grid w-full gap-2 overflow-auto px-1 sm:grid-cols-2 md:gap-4 xl:grid-cols-3 3xl:grid-cols-4"
        >
          {reviewCameras.map((camera) => {
            let grow;
            let spans;
            const aspectRatio = camera.detect.width / camera.detect.height;
            if (aspectRatio > 2) {
              grow = "aspect-wide";
              spans = "sm:col-span-2";
            } else if (aspectRatio < 1) {
              grow = "md:h-full aspect-tall";
              spans = "md:row-span-2";
            } else {
              grow = "aspect-video";
              spans = "";
            }
            const detectionType = getDetectionType(camera.name);
            return (
              <div key={camera.name} className={`relative ${spans}`}>
                {motionData ? (
                  <>
                    <PreviewPlayer
                      className={`rounded-lg md:rounded-2xl ${spans} ${grow}`}
                      camera={camera.name}
                      timeRange={currentTimeRange}
                      startTime={previewStart}
                      cameraPreviews={relevantPreviews || []}
                      isScrubbing={scrubbing}
                      onControllerReady={(controller) => {
                        videoPlayersRef.current[camera.name] = controller;
                      }}
                      onClick={() =>
                        onOpenRecording({
                          camera: camera.name,
                          startTime: Math.min(
                            currentTime,
                            Date.now() / 1000 - 30,
                          ),
                          severity: "significant_motion",
                        })
                      }
                    />
                    <div
                      className={`review-item-ring pointer-events-none absolute inset-0 z-20 size-full rounded-lg outline outline-[3px] -outline-offset-[2.8px] ${detectionType ? `outline-severity_${detectionType} shadow-severity_${detectionType}` : "outline-transparent duration-500"}`}
                    />
                  </>
                ) : (
                  <Skeleton
                    className={`size-full rounded-lg md:rounded-2xl ${spans} ${grow}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="no-scrollbar w-[55px] overflow-y-auto md:w-[100px]">
        {motionData ? (
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
        ) : (
          <Skeleton className="size-full" />
        )}
      </div>

      <VideoControls
        className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-secondary"
        features={{
          volume: false,
          seek: true,
          playbackRate: true,
          fullscreen: false,
        }}
        isPlaying={playing}
        show={!scrubbing || controlsOpen}
        playbackRates={[4, 8, 12, 16]}
        playbackRate={playbackRate}
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
      />
    </>
  );
}
