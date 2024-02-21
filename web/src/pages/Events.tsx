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
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuCalendar, LuFilter, LuVideo } from "react-icons/lu";
import { MdCircle } from "react-icons/md";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

const API_LIMIT = 100;

export default function Events() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [severity, setSeverity] = useState<ReviewSeverity>("alert");
  const contentRef = useRef<HTMLDivElement | null>(null);

  // review paging

  const reviewSearchParams = {};
  const reviewSegmentFetcher = useCallback((key: any) => {
    const [path, params] = Array.isArray(key) ? key : [key, undefined];
    return axios.get(path, { params }).then((res) => res.data);
  }, []);

  const getKey = useCallback(
    (index: number, prevData: ReviewSegment[]) => {
      if (index > 0) {
        const lastDate = prevData[prevData.length - 1].start_time;
        const pagedParams = reviewSearchParams
          ? { before: lastDate, limit: API_LIMIT }
          : {
              ...reviewSearchParams,
              before: lastDate,
              limit: API_LIMIT,
            };
        return ["review", pagedParams];
      }

      const params = reviewSearchParams
        ? { limit: API_LIMIT }
        : { ...reviewSearchParams, limit: API_LIMIT };
      return ["review", params];
    },
    [reviewSearchParams]
  );

  const {
    data: reviewPages,
    mutate: updateSegments,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite<ReviewSegment[]>(getKey, reviewSegmentFetcher);

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

  const isDone = useMemo(
    () => (reviewPages?.at(-1)?.length ?? 0) < API_LIMIT,
    [reviewPages]
  );

  // review interaction

  const pagingObserver = useRef<IntersectionObserver | null>();
  const lastReviewRef = useCallback(
    (node: HTMLElement | null) => {
      if (isValidating) return;
      if (pagingObserver.current) pagingObserver.current.disconnect();
      try {
        pagingObserver.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !isDone) {
            setSize(size + 1);
          }
        });
        if (node) pagingObserver.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    [isValidating, isDone]
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
      { root: contentRef.current }
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

  // review status

  const setReviewed = useCallback(
    async (id: string) => {
      const resp = await axios.post(`review/${id}/viewed`);

      if (resp.status == 200) {
        updateSegments();
      }
    },
    [updateSegments]
  );

  // preview videos

  const previewTimes = useMemo(() => {
    if (
      !reviewPages ||
      reviewPages.length == 0 ||
      reviewPages.at(-1)!!.length == 0
    ) {
      return undefined;
    }

    const startDate = new Date();
    startDate.setMinutes(0, 0, 0);

    const endDate = new Date(reviewPages.at(-1)!!.at(-1)!!.end_time);
    endDate.setHours(0, 0, 0, 0);
    return {
      start: startDate.getTime() / 1000,
      end: endDate.getTime() / 1000,
    };
  }, [reviewPages]);
  const { data: allPreviews } = useSWR<Preview[]>(
    previewTimes
      ? `preview/all/start/${previewTimes.start}/end/${previewTimes.end}`
      : null,
    { revalidateOnFocus: false }
  );

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute flex justify-between left-0 top-0 right-0">
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
            <MdCircle className="w-2 h-2 mr-[10px] text-danger" />
            Alerts
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`px-3 py-4 rounded-2xl ${
              severity == "detection" ? "" : "text-gray-500"
            }`}
            value="detection"
            aria-label="Select detections"
          >
            <MdCircle className="w-2 h-2 mr-[10px] text-orange-400" />
            Detections
          </ToggleGroupItem>
          <ToggleGroupItem
            className={`px-3 py-4 rounded-2xl ${
              severity == "significant_motion" ? "" : "text-gray-500"
            }`}
            value="significant_motion"
            aria-label="Select motion"
          >
            <MdCircle className="w-2 h-2 mr-[10px] text-yellow-400" />
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

      <div
        ref={contentRef}
        className="absolute left-0 top-12 bottom-0 right-28 flex flex-wrap content-start gap-2 overflow-y-auto no-scrollbar"
      >
        {reviewItems[severity]?.map((value, segIdx) => {
          const lastRow = segIdx == reviewItems[severity].length - 1;
          const relevantPreview = Object.values(allPreviews || []).find(
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
                  isMobile={false}
                  setReviewed={() => setReviewed(value.id)}
                />
              </div>
              {lastRow && !isDone && <ActivityIndicator />}
            </div>
          );
        })}
      </div>
      <div className="absolute top-0 right-0 bottom-0">
        <EventReviewTimeline
          segmentDuration={60} // seconds per segment
          timestampSpread={15} // minutes between each major timestamp
          timelineStart={Math.floor(Date.now() / 1000)} // start of the timeline - all times are numeric, not Date objects
          timelineDuration={24 * 60 * 60} // in minutes, defaults to 24 hours
          showMinimap // show / hide the minimap
          minimapStartTime={minimapBounds.start} // start time of the minimap - the earlier time (eg 1:00pm)
          minimapEndTime={minimapBounds.end} // end of the minimap - the later time (eg 3:00pm)
          events={reviewItems.all} // events, including new has_been_reviewed and severity properties
          severityType={severity} // choose the severity type for the middle line - all other severity types are to the right
          contentRef={contentRef} // optional content ref where previews are, can be used for observing/scrolling later
        />
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
