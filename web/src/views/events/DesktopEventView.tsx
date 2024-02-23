import { useFrigateEvents } from "@/api/ws";
import PreviewThumbnailPlayer from "@/components/player/PreviewThumbnailPlayer";
import EventReviewTimeline from "@/components/timeline/EventReviewTimeline";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment, ReviewSeverity } from "@/types/review";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuCalendar, LuFilter, LuRefreshCcw, LuVideo } from "react-icons/lu";
import { MdCircle } from "react-icons/md";
import useSWR from "swr";

type DesktopEventViewProps = {
  reviewPages?: ReviewSegment[][];
  relevantPreviews?: Preview[];
  timeRange: { before: number; after: number };
  reachedEnd: boolean;
  isValidating: boolean;
  loadNextPage: () => void;
  markItemAsReviewed: (reviewId: string) => void;
  onSelectReview: (reviewId: string) => void;
  pullLatestData: () => void;
};
export default function DesktopEventView({
  reviewPages,
  relevantPreviews,
  timeRange,
  reachedEnd,
  isValidating,
  loadNextPage,
  markItemAsReviewed,
  onSelectReview,
  pullLatestData,
}: DesktopEventViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [severity, setSeverity] = useState<ReviewSeverity>("alert");
  const contentRef = useRef<HTMLDivElement | null>(null);

  // review paging

  const reviewItems = useMemo(() => {
    const all: ReviewSegment[] = [];
    const alerts: ReviewSegment[] = [];
    const detections: ReviewSegment[] = [];
    const motion: ReviewSegment[] = [];

    reviewPages?.forEach((page) => {
      page.forEach((segment) => {
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
    });

    return {
      all: all,
      alert: alerts,
      detection: detections,
      significant_motion: motion,
    };
  }, [reviewPages]);

  const currentItems = useMemo(() => {
    const current = reviewItems[severity];

    if (!current || current.length == 0) {
      return null;
    }

    return current;
  }, [reviewItems, severity]);

  // review interaction

  const pagingObserver = useRef<IntersectionObserver | null>();
  const lastReviewRef = useCallback(
    (node: HTMLElement | null) => {
      if (isValidating) return;
      if (pagingObserver.current) pagingObserver.current.disconnect();
      try {
        pagingObserver.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !reachedEnd) {
            loadNextPage();
          }
        });
        if (node) pagingObserver.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    [isValidating, reachedEnd]
  );

  const [minimap, setMinimap] = useState<string[]>([]);
  const minimapObserver = useRef<IntersectionObserver | null>();
  useEffect(() => {
    if (!contentRef.current) {
      return;
    }

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
      { root: contentRef.current, threshold: 0.5 }
    );

    return () => {
      minimapObserver.current?.disconnect();
    };
  }, [contentRef]);
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
    [minimapObserver.current]
  );
  const minimapBounds = useMemo(() => {
    const data = {
      start: Math.floor(Date.now() / 1000) - 35 * 60,
      end: Math.floor(Date.now() / 1000) - 21 * 60,
    };
    const list = minimap.sort();

    if (list.length > 0) {
      data.end = parseFloat(list.at(-1)!!);
      data.start = parseFloat(list[0]);
    }

    return data;
  }, [minimap]);

  // new data alert

  const { payload: eventUpdate } = useFrigateEvents();
  const [hasUpdate, setHasUpdate] = useState(false);
  useEffect(() => {
    if (!eventUpdate) {
      return;
    }

    // if event is ended and was saved, update events list
    if (
      eventUpdate.type == "end" &&
      (eventUpdate.after.has_clip || eventUpdate.after.has_snapshot)
    ) {
      setHasUpdate(true);
      return;
    }
  }, [eventUpdate]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between mb-2">
        <ToggleGroup
          type="single"
          defaultValue="alert"
          size="sm"
          onValueChange={(value: ReviewSeverity) => setSeverity(value)}
        >
          <ToggleGroupItem
            className={`px-3 py-4 rounded-2xl ${
              severity == "alert" ? "" : "text-gray-500"
            }`}
            value="alert"
            aria-label="Select alerts"
          >
            <MdCircle className="w-2 h-2 mr-[10px] text-severity_alert" />
            Alerts
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`px-3 py-4 rounded-2xl ${
              severity == "detection" ? "" : "text-gray-500"
            }`}
            value="detection"
            aria-label="Select detections"
          >
            <MdCircle className="w-2 h-2 mr-[10px] text-severity_detection" />
            Detections
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`px-3 py-4 rounded-2xl ${
              severity == "significant_motion" ? "" : "text-gray-500"
            }`}
            value="significant_motion"
            aria-label="Select motion"
          >
            <MdCircle className="w-2 h-2 mr-[10px] text-severity_motion" />
            Motion
          </ToggleGroupItem>
        </ToggleGroup>
        <div>
          <Button className="mx-1" variant="secondary">
            <LuVideo className=" mr-[10px]" />
            All Cameras
          </Button>
          <ReviewCalendarButton />
          <Button className="mx-1" variant="secondary">
            <LuFilter className=" mr-[10px]" />
            Filter
          </Button>
        </div>
      </div>

      {hasUpdate && (
        <Button
          className="absolute top-14 left-[50%] -translate-x-[50%] z-30 bg-gray-400 text-white"
          variant="secondary"
          onClick={() => {
            setHasUpdate(false);
            pullLatestData();
          }}
        >
          <LuRefreshCcw className="w-4 h-4 mr-2" />
          New Items To Review
        </Button>
      )}

      <div className="flex h-full overflow-hidden">
        <div
          ref={contentRef}
          className="flex flex-1 flex-wrap content-start gap-2 overflow-y-auto no-scrollbar"
        >
          {currentItems ? (
            currentItems.map((value, segIdx) => {
              const lastRow = segIdx == reviewItems[severity].length - 1;
              const relevantPreview = Object.values(
                relevantPreviews || []
              ).find(
                (preview) =>
                  preview.camera == value.camera &&
                  preview.start < value.start_time &&
                  preview.end > value.end_time
              );

              return (
                <div
                  key={value.id}
                  ref={lastRow ? lastReviewRef : minimapRef}
                  data-start={value.start_time}
                >
                  <div className="h-[234px] aspect-video rounded-lg overflow-hidden">
                    <PreviewThumbnailPlayer
                      review={value}
                      relevantPreview={relevantPreview}
                      setReviewed={() => markItemAsReviewed(value.id)}
                      onClick={() => onSelectReview(value.id)}
                    />
                  </div>
                  {lastRow && !reachedEnd && <ActivityIndicator />}
                </div>
              );
            })
          ) : (
            <div ref={lastReviewRef} />
          )}
        </div>
        <div className="md:w-[100px] overflow-y-auto no-scrollbar">
          <EventReviewTimeline
            segmentDuration={60}
            timestampSpread={15}
            timelineStart={timeRange.before}
            timelineEnd={timeRange.after}
            showMinimap
            minimapStartTime={minimapBounds.start}
            minimapEndTime={minimapBounds.end}
            events={reviewItems.all}
            severityType={severity}
            contentRef={contentRef}
          />
        </div>
      </div>
    </div>
  );
}

function ReviewCalendarButton() {
  const disabledDates = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24, -1, 0, 0);
    const future = new Date();
    future.setFullYear(tomorrow.getFullYear() + 10);
    return { from: tomorrow, to: future };
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="mx-1" variant="secondary">
          <LuCalendar className=" mr-[10px]" />
          {formatUnixTimestampToDateTime(Date.now() / 1000, {
            strftime_fmt: "%b %-d",
          })}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar mode="single" disabled={disabledDates} />
      </PopoverContent>
    </Popover>
  );
}
