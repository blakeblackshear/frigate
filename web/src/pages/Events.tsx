import useOverlayState from "@/hooks/use-overlay-state";
import { ReviewSegment } from "@/types/review";
import DesktopEventView from "@/views/events/DesktopEventView";
import DesktopRecordingView from "@/views/events/DesktopRecordingView";
import MobileEventView from "@/views/events/MobileEventView";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

const API_LIMIT = 250;

export default function Events() {
  // recordings viewer
  const [selectedReviewId, setSelectedReviewId] = useOverlayState("review");

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

  // selected items

  const selectedReviews = useMemo(() => {
    if (!selectedReviewId) {
      return undefined;
    }

    if (!reviewPages) {
      return undefined;
    }

    const allReviews = reviewPages.flat();
    const selectedReview = allReviews.find(
      (item) => item.id == selectedReviewId
    );

    if (!selectedReview) {
      return undefined;
    }

    return {
      selected: selectedReview,
      cameraReviews: allReviews.filter(
        (seg) => seg.camera == selectedReview?.camera
      ),
    };
  }, [selectedReviewId, reviewPages]);

  if (selectedReviews) {
    return (
      <DesktopRecordingView
        reviewItems={selectedReviews.cameraReviews}
        selectedReview={selectedReviews.selected}
        relevantPreviews={allPreviews}
      />
    );
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
        relevantPreviews={allPreviews}
        timeRange={[Date.now() / 1000, after]}
        reachedEnd={isDone}
        isValidating={isValidating}
        loadNextPage={() => setSize(size + 1)}
        markItemAsReviewed={markItemAsReviewed}
        onSelectReview={setSelectedReviewId}
      />
    );
  }
}

function getHoursAgo(hours: number): number {
  const now = new Date();
  now.setHours(now.getHours() - hours);
  return now.getTime() / 1000;
}
