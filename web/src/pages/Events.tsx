import useApiFilter from "@/hooks/use-api-filter";
import useOverlayState from "@/hooks/use-overlay-state";
import { ReviewFilter, ReviewSegment } from "@/types/review";
import DesktopEventView from "@/views/events/DesktopEventView";
import DesktopRecordingView from "@/views/events/DesktopRecordingView";
import MobileEventView from "@/views/events/MobileEventView";
import axios from "axios";
import { useCallback, useMemo } from "react";
import { isMobile } from "react-device-detect";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

const API_LIMIT = 250;

export default function Events() {
  // recordings viewer
  const [selectedReviewId, setSelectedReviewId] = useOverlayState("review");

  // review filter

  const [reviewFilter, setReviewFilter, reviewSearchParams] =
    useApiFilter<ReviewFilter>();

  const onUpdateFilter = useCallback((newFilter: ReviewFilter) => {
      setSize(1);
      setReviewFilter(newFilter);
  }, [])

  // review paging

  const timeRange = useMemo(() => {
    return { before: Date.now() / 1000, after: getHoursAgo(24) };
  }, []);

  const reviewSegmentFetcher = useCallback((key: any) => {
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
          reviewed: reviewSearchParams["showReviewed"] == true ? 1 : 0,
          before: lastDate,
          after: reviewSearchParams["after"] || timeRange.after,
          limit: API_LIMIT,
        };
        return ["review", pagedParams];
      }

      const params = {
        cameras: reviewSearchParams["cameras"],
        labels: reviewSearchParams["labels"],
        reviewed: reviewSearchParams["showReviewed"] == true ? 1 : 0,
        limit: API_LIMIT,
        before: reviewSearchParams["before"] || timeRange.before,
        after: reviewSearchParams["after"] || timeRange.after,
      };
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
  } = useSWRInfinite<ReviewSegment[]>(getKey, reviewSegmentFetcher, {
    revalidateOnFocus: false,
    persistSize: true,
  });

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
          { revalidate: false, populateCache: true }
        );
      }
    },
    [updateSegments]
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
      (item) => item.id == selectedReviewId
    );

    if (!selectedReview) {
      return undefined;
    }

    return {
      selected: selectedReview,
      cameraSegments: allReviews.filter(
        (seg) => seg.camera == selectedReview.camera
      ),
      cameraPreviews: allPreviews?.filter(
        (seg) => seg.camera == selectedReview.camera
      ),
    };
  }, [selectedReviewId, reviewPages]);

  if (selectedData) {
    return (
      <DesktopRecordingView
        reviewItems={selectedData.cameraSegments}
        selectedReview={selectedData.selected}
        relevantPreviews={selectedData.cameraPreviews}
      />
    );
  } else {
    if (isMobile) {
      return (
        <MobileEventView
          reviewPages={reviewPages}
          relevantPreviews={allPreviews}
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
        timeRange={timeRange}
        reachedEnd={isDone}
        isValidating={isValidating}
        filter={reviewFilter}
        loadNextPage={() => setSize(size + 1)}
        markItemAsReviewed={markItemAsReviewed}
        onSelectReview={setSelectedReviewId}
        pullLatestData={updateSegments}
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
