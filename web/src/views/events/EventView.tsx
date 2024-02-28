import Logo from "@/components/Logo";
import NewReviewData from "@/components/dynamic/NewReviewData";
import ReviewFilterGroup from "@/components/filter/ReviewFilterGroup";
import PreviewThumbnailPlayer from "@/components/player/PreviewThumbnailPlayer";
import EventReviewTimeline from "@/components/timeline/EventReviewTimeline";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEventUtils } from "@/hooks/use-event-utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewFilter, ReviewSegment, ReviewSeverity } from "@/types/review";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { LuFolderCheck } from "react-icons/lu";
import { MdCircle } from "react-icons/md";
import useSWR from "swr";

type EventViewProps = {
  reviewPages?: ReviewSegment[][];
  relevantPreviews?: Preview[];
  timeRange: { before: number; after: number };
  reachedEnd: boolean;
  isValidating: boolean;
  filter?: ReviewFilter;
  severity: ReviewSeverity;
  setSeverity: (severity: ReviewSeverity) => void;
  loadNextPage: () => void;
  markItemAsReviewed: (reviewId: string) => void;
  onSelectReview: (reviewId: string) => void;
  pullLatestData: () => void;
  updateFilter: (filter: ReviewFilter) => void;
};
export default function EventView({
  reviewPages,
  relevantPreviews,
  timeRange,
  reachedEnd,
  isValidating,
  filter,
  severity,
  setSeverity,
  loadNextPage,
  markItemAsReviewed,
  onSelectReview,
  pullLatestData,
  updateFilter,
}: EventViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const segmentDuration = 60;

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

  const { alignStartDateToTimeline } = useEventUtils(
    reviewItems.all,
    segmentDuration
  );

  const currentItems = useMemo(() => {
    const current = reviewItems[severity];

    if (!current || current.length == 0) {
      return null;
    }

    return current;
  }, [reviewItems, severity]);

  const showMinimap = useMemo(() => {
    if (!contentRef.current) {
      return false;
    }

    return contentRef.current.scrollHeight > contentRef.current.clientHeight;
  }, [contentRef.current?.scrollHeight, severity]);

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
      { root: contentRef.current, threshold: isDesktop ? 0.1 : 0.5 }
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
    [minimapObserver]
  );
  const minimapBounds = useMemo(() => {
    const data = {
      start: 0,
      end: 0,
    };
    const list = minimap.sort();

    if (list.length > 0) {
      data.end = parseFloat(list.at(-1)!!);
      data.start = parseFloat(list[0]);
    }

    return data;
  }, [minimap]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex flex-col size-full">
      <div className="relative flex justify-between mb-2">
        {isMobile && (
          <Logo className="absolute inset-y-0 inset-x-1/2 -translate-x-1/2 h-8" />
        )}
        <ToggleGroup
          className="*:px-3 *:py4 *:rounded-2xl"
          type="single"
          defaultValue="alert"
          size="sm"
          onValueChange={(value: ReviewSeverity) => setSeverity(value)}
        >
          <ToggleGroupItem
            className={`${severity == "alert" ? "" : "text-gray-500"}`}
            value="alert"
            aria-label="Select alerts"
          >
            <MdCircle className="size-2 md:mr-[10px] text-severity_alert" />
            <div className="hidden md:block">Alerts</div>
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`${severity == "detection" ? "" : "text-gray-500"}`}
            value="detection"
            aria-label="Select detections"
          >
            <MdCircle className="size-2 md:mr-[10px] text-severity_detection" />
            <div className="hidden md:block">Detections</div>
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`px-3 py-4 rounded-2xl ${
              severity == "significant_motion" ? "" : "text-gray-500"
            }`}
            value="significant_motion"
            aria-label="Select motion"
          >
            <MdCircle className="size-2 md:mr-[10px] text-severity_motion" />
            <div className="hidden md:block">Motion</div>
          </ToggleGroupItem>
        </ToggleGroup>
        <ReviewFilterGroup filter={filter} onUpdateFilter={updateFilter} />
      </div>

      <div className="flex h-full overflow-hidden">
        <div
          ref={contentRef}
          className="flex flex-1 flex-wrap content-start gap-2 overflow-y-auto no-scrollbar"
        >
          {filter?.before == undefined && (
            <NewReviewData
              className="absolute w-full z-30"
              contentRef={contentRef}
              severity={severity}
              pullLatestData={pullLatestData}
            />
          )}

          {!isValidating && currentItems == null && (
            <div className="size-full flex flex-col justify-center items-center">
              <LuFolderCheck className="size-16" />
              There are no {severity} items to review
            </div>
          )}

          <div
            className="w-full m-2 md:grid md:grid-cols-3 3xl:grid-cols-4 gap-4"
            ref={contentRef}
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
                    data-segment-start={
                      alignStartDateToTimeline(value.start_time) -
                      segmentDuration
                    }
                    className="outline outline-offset-1 outline-0 rounded-lg shadow-none transition-all duration-500 my-1 md:my-0"
                  >
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <PreviewThumbnailPlayer
                        review={value}
                        relevantPreview={relevantPreview}
                        setReviewed={markItemAsReviewed}
                        onClick={onSelectReview}
                      />
                    </div>
                    {lastRow && !reachedEnd && <ActivityIndicator />}
                  </div>
                );
              })
            ) : severity != "alert" ? (
              <div ref={lastReviewRef} />
            ) : null}
          </div>
        </div>
        <div className="w-[55px] md:w-[100px] mt-2 overflow-y-auto no-scrollbar">
          <EventReviewTimeline
            segmentDuration={segmentDuration}
            timestampSpread={15}
            timelineStart={timeRange.before}
            timelineEnd={timeRange.after}
            showMinimap={showMinimap}
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
