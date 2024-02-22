import useOverlayState from "@/hooks/use-overlay-state";
import { ReviewSegment } from "@/types/review";
import DesktopEventView from "@/views/events/DesktopEventView";
import DesktopRecordingView from "@/views/events/DesktopRecordingView";
import MobileEventView from "@/views/events/MobileEventView";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import useSWRInfinite from "swr/infinite";

const API_LIMIT = 250;

export default function Events() {
  // recordings viewer
  const [selectedReview, setSelectedReview] = useOverlayState("review");

  // review paging

  const [after, setAfter] = useState(getHoursAgo(24));
  useEffect(() => {
    const intervalId: NodeJS.Timeout = setInterval(() => {
      setAfter(getHoursAgo(24));
    }, 300000);
    return () => clearInterval(intervalId);
  }, [300000]);

  const reviewSegmentFetcher = useCallback((key: any) => {
    const [path, params] = Array.isArray(key) ? key : [key, undefined];
    return axios.get(path, { params }).then((res) => res.data);
  }, []);

  const reviewSearchParams = {};
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

  const isDone = useMemo(
    () => (reviewPages?.at(-1)?.length ?? 0) < API_LIMIT,
    [reviewPages]
  );

  // review status

  const markItemAsReviewed = useCallback(
    async (reviewId: string) => {
      const resp = await axios.post(`review/${reviewId}/viewed`);

      if (resp.status == 200) {
        updateSegments(
          (data: ReviewSegment[][] | undefined) => {
            if (!data) {
              return data;
            }

            const newData: ReviewSegment[][] = [];

            data.forEach((page) => {
              const reviewIndex = page.findIndex((item) => item.id == reviewId);

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
          { revalidate: false }
        );
      }
    },
    [updateSegments]
  );

  if (selectedReview) {
    return <DesktopRecordingView />;
  } else {
    if (isMobile) {
      return (
        <MobileEventView
          reviewPages={reviewPages}
          reachedEnd={isDone}
          isValidating={isValidating}
          loadNextPage={() => setSize(size + 1)}
          markItemAsReviewed={markItemAsReviewed}
        />
      );
    }

    return (
      <DesktopEventView
        reviewPages={reviewPages}
        timeRange={[Date.now() / 1000, after]}
        reachedEnd={isDone}
        isValidating={isValidating}
        loadNextPage={() => setSize(size + 1)}
        markItemAsReviewed={markItemAsReviewed}
        onSelectReview={setSelectedReview}
      />
    );
  }
}

function getHoursAgo(hours: number): number {
  const now = new Date();
  now.setHours(now.getHours() - hours);
  return now.getTime() / 1000;
}
