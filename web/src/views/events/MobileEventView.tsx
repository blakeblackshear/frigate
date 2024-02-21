import PreviewThumbnailPlayer from "@/components/player/PreviewThumbnailPlayer";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment, ReviewSeverity } from "@/types/review";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdCircle } from "react-icons/md";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

const API_LIMIT = 250;

export default function MobileEventView() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [severity, setSeverity] = useState<ReviewSeverity>("alert");
  const contentRef = useRef<HTMLDivElement | null>(null);

  // review paging

  const [after, setAfter] = useState(0);
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() - 24);
    setAfter(now.getTime() / 1000);

    const intervalId: NodeJS.Timeout = setInterval(() => {
      const now = new Date();
      now.setHours(now.getHours() - 24);
      setAfter(now.getTime() / 1000);
    }, 60000);
    return () => clearInterval(intervalId);
  }, [60000]);

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
          ? { before: lastDate, after: after, limit: API_LIMIT }
          : {
              ...reviewSearchParams,
              before: lastDate,
              after: after,
              limit: API_LIMIT,
            };
        return ["review", pagedParams];
      }

      const params = reviewSearchParams
        ? { limit: API_LIMIT, after: after }
        : { ...reviewSearchParams, limit: API_LIMIT, after: after };
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
      { threshold: 0.5 }
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
    <>
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

      <div
        ref={contentRef}
        className="w-full h-full grid grid-cols-1 sm:grid-cols-2 mt-2 gap-2 overflow-y-auto"
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
              <div className="w-full aspect-video rounded-lg overflow-hidden">
                <PreviewThumbnailPlayer
                  review={value}
                  relevantPreview={relevantPreview}
                  autoPlayback={minimapBounds.end == value.start_time}
                  setReviewed={() => setReviewed(value.id)}
                />
              </div>
              {lastRow && !isDone && <ActivityIndicator />}
            </div>
          );
        })}
      </div>
    </>
  );
}
