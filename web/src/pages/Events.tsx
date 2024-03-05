import ActivityIndicator from "@/components/indicators/activity-indicator";
import useApiFilter from "@/hooks/use-api-filter";
import { useTimezone } from "@/hooks/use-date-utils";
import useOverlayState from "@/hooks/use-overlay-state";
import { FrigateConfig } from "@/types/frigateConfig";
import { Preview } from "@/types/preview";
import {
  ReviewFilter,
  ReviewSegment,
  ReviewSeverity,
  ReviewSummary,
} from "@/types/review";
import EventView from "@/views/events/EventView";
import RecordingView from "@/views/events/RecordingView";
import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

const API_LIMIT = 100;

export default function Events() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useTimezone(config);

  // recordings viewer

  const [severity, setSeverity] = useState<ReviewSeverity>("alert");
  const [selectedReviewId, setSelectedReviewId] = useOverlayState("review");

  // review filter

  const [reviewFilter, setReviewFilter, reviewSearchParams] =
    useApiFilter<ReviewFilter>();

  const onUpdateFilter = useCallback((newFilter: ReviewFilter) => {
    setSize(1);
    setReviewFilter(newFilter);
    // we don't want this updating
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // review paging

  const [beforeTs, setBeforeTs] = useState(Date.now() / 1000);
  const last24Hours = useMemo(() => {
    return { before: beforeTs, after: getHoursAgo(24) };
  }, [beforeTs]);
  const selectedTimeRange = useMemo(() => {
    if (reviewSearchParams["after"] == undefined) {
      return last24Hours;
    }

    return {
      before: Math.floor(reviewSearchParams["before"]),
      after: Math.floor(reviewSearchParams["after"]),
    };
  }, [last24Hours, reviewSearchParams]);

  const reviewSegmentFetcher = useCallback((key: Array<string> | string) => {
    const [path, params] = Array.isArray(key) ? key : [key, undefined];
    return axios.get(path, { params }).then((res) => res.data);
  }, []);

  const getKey = useCallback(
    (index: number, prevData: ReviewSegment[]) => {
      if (index > 0) {
        const lastDate = prevData[prevData.length - 1].start_time;
        reviewSearchParams;
        const pagedParams = {
          cameras: reviewSearchParams["cameras"],
          labels: reviewSearchParams["labels"],
          reviewed: reviewSearchParams["showReviewed"],
          before: lastDate,
          after: reviewSearchParams["after"] || last24Hours.after,
          limit: API_LIMIT,
        };
        return ["review", pagedParams];
      }

      const params = {
        cameras: reviewSearchParams["cameras"],
        labels: reviewSearchParams["labels"],
        reviewed: reviewSearchParams["showReviewed"],
        limit: API_LIMIT,
        before: reviewSearchParams["before"] || last24Hours.before,
        after: reviewSearchParams["after"] || last24Hours.after,
      };
      return ["review", params];
    },
    [reviewSearchParams, last24Hours],
  );

  const {
    data: reviewPages,
    mutate: updateSegments,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite<ReviewSegment[]>(getKey, reviewSegmentFetcher, {
    revalidateOnFocus: false,
    persistSize: true,
  });

  const isDone = useMemo(
    () => (reviewPages?.at(-1)?.length ?? 0) < API_LIMIT,
    [reviewPages],
  );

  const onLoadNextPage = useCallback(() => setSize(size + 1), [size, setSize]);

  // review summary

  const { data: reviewSummary, mutate: updateSummary } = useSWR<
    ReviewSummary[]
  >([
    "review/summary",
    {
      timezone: timezone,
      cameras: reviewSearchParams["cameras"] ?? null,
      labels: reviewSearchParams["labels"] ?? null,
    },
    { revalidateOnFocus: false },
  ]);

  const reloadData = useCallback(() => {
    setBeforeTs(Date.now() / 1000);
    updateSummary();
  }, [updateSummary]);

  // preview videos

  const previewTimes = useMemo(() => {
    if (
      !reviewPages ||
      reviewPages.length == 0 ||
      reviewPages.at(-1)?.length == 0
    ) {
      return undefined;
    }

    const startDate = new Date();
    startDate.setMinutes(0, 0, 0);

    const endDate = new Date(reviewPages.at(-1)?.at(-1)?.end_time || 0);
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
    { revalidateOnFocus: false },
  );

  // review status

  const markItemAsReviewed = useCallback(
    async (review: ReviewSegment) => {
      const resp = await axios.post(`review/${review.id}/viewed`);

      if (resp.status == 200) {
        updateSegments(
          (data: ReviewSegment[][] | undefined) => {
            if (!data) {
              return data;
            }

            const newData: ReviewSegment[][] = [];

            data.forEach((page) => {
              const reviewIndex = page.findIndex(
                (item) => item.id == review.id,
              );

              if (reviewIndex == -1) {
                newData.push([...page]);
              } else {
                newData.push([
                  ...page.slice(0, reviewIndex),
                  { ...page[reviewIndex], has_been_reviewed: true },
                  ...page.slice(reviewIndex + 1),
                ]);
              }
            });

            return newData;
          },
          { revalidate: false, populateCache: true },
        );

        updateSummary(
          (data: ReviewSummary[] | undefined) => {
            if (!data) {
              return data;
            }

            const day = new Date(review.start_time * 1000);
            const key = `${day.getFullYear()}-${("0" + (day.getMonth() + 1)).slice(-2)}-${("0" + day.getDate()).slice(-2)}`;
            const index = data.findIndex((summary) => summary.day == key);

            if (index == -1) {
              return data;
            }

            const item = data[index];
            return [
              ...data.slice(0, index),
              {
                ...item,
                reviewed_alert:
                  review.severity == "alert"
                    ? item.reviewed_alert + 1
                    : item.reviewed_alert,
                reviewed_detection:
                  review.severity == "detection"
                    ? item.reviewed_detection + 1
                    : item.reviewed_detection,
                reviewed_motion:
                  review.severity == "significant_motion"
                    ? item.reviewed_motion + 1
                    : item.reviewed_motion,
              },
              ...data.slice(index + 1),
            ];
          },
          { revalidate: false, populateCache: true },
        );
      }
    },
    [updateSegments, updateSummary],
  );

  // selected items

  const selectedData = useMemo(() => {
    if (!selectedReviewId) {
      return undefined;
    }

    if (!reviewPages) {
      return undefined;
    }

    const allReviews = reviewPages.flat();
    const selectedReview = allReviews.find(
      (item) => item.id == selectedReviewId,
    );

    if (!selectedReview) {
      return undefined;
    }

    return {
      selected: selectedReview,
      cameraSegments: allReviews.filter(
        (seg) => seg.camera == selectedReview.camera,
      ),
      cameraPreviews: allPreviews?.filter(
        (seg) => seg.camera == selectedReview.camera,
      ),
    };

    // previews will not update after item is selected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReviewId, reviewPages]);

  if (!timezone) {
    return <ActivityIndicator />;
  }

  if (selectedData) {
    return (
      <RecordingView
        reviewItems={selectedData.cameraSegments}
        selectedReview={selectedData.selected}
        relevantPreviews={selectedData.cameraPreviews}
      />
    );
  } else {
    return (
      <EventView
        reviewPages={reviewPages}
        reviewSummary={reviewSummary}
        relevantPreviews={allPreviews}
        timeRange={selectedTimeRange}
        reachedEnd={isDone}
        isValidating={isValidating}
        filter={reviewFilter}
        severity={severity}
        setSeverity={setSeverity}
        loadNextPage={onLoadNextPage}
        markItemAsReviewed={markItemAsReviewed}
        onOpenReview={setSelectedReviewId}
        pullLatestData={reloadData}
        updateFilter={onUpdateFilter}
      />
    );
  }
}

function getHoursAgo(hours: number): number {
  const now = new Date();
  now.setHours(now.getHours() - hours);
  return now.getTime() / 1000;
}
