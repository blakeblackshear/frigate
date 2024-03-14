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
import {
  DesktopRecordingView,
  MobileRecordingView,
} from "@/views/events/RecordingView";
import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import useSWR from "swr";

export default function Events() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useTimezone(config);

  // recordings viewer

  const [severity, setSeverity] = useOverlayState<ReviewSeverity>(
    "severity",
    "alert",
  );
  const [selectedReviewId, setSelectedReviewId] = useOverlayState("review");
  const [startTime, setStartTime] = useState<number>();

  // review filter

  const [reviewFilter, setReviewFilter, reviewSearchParams] =
    useApiFilter<ReviewFilter>();

  const onUpdateFilter = useCallback((newFilter: ReviewFilter) => {
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

  const getKey = useCallback(() => {
    const params = {
      cameras: reviewSearchParams["cameras"],
      labels: reviewSearchParams["labels"],
      reviewed: 1,
      before: reviewSearchParams["before"] || last24Hours.before,
      after: reviewSearchParams["after"] || last24Hours.after,
    };
    return ["review", params];
  }, [reviewSearchParams, last24Hours]);

  const { data: reviews, mutate: updateSegments } = useSWR<ReviewSegment[]>(
    getKey,
    reviewSegmentFetcher,
    {
      revalidateOnFocus: false,
    },
  );

  // review summary

  const { data: reviewSummary, mutate: updateSummary } = useSWR<ReviewSummary>([
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
    if (!reviews || reviews.length == 0) {
      return undefined;
    }

    const startDate = new Date();
    startDate.setMinutes(0, 0, 0);

    const endDate = new Date(reviews.at(-1)?.end_time || 0);
    endDate.setHours(0, 0, 0, 0);
    return {
      start: startDate.getTime() / 1000,
      end: endDate.getTime() / 1000,
    };
  }, [reviews]);
  const { data: allPreviews } = useSWR<Preview[]>(
    previewTimes
      ? `preview/all/start/${previewTimes.start}/end/${previewTimes.end}`
      : null,
    { revalidateOnFocus: false },
  );

  // review status

  const markAllItemsAsReviewed = useCallback(
    async (currentItems: ReviewSegment[]) => {
      if (currentItems.length == 0) {
        return;
      }

      const severity = currentItems[0].severity;
      updateSegments(
        (data: ReviewSegment[] | undefined) => {
          if (!data) {
            return data;
          }

          const newData = [...data];

          newData.forEach((seg) => {
            if (seg.severity == severity) {
              seg.has_been_reviewed = true;
            }
          });

          return newData;
        },
        { revalidate: false, populateCache: true },
      );

      await axios.post(`reviews/viewed`, {
        ids: currentItems?.map((seg) => seg.id),
      });
      reloadData();
    },
    [reloadData, updateSegments],
  );

  const markItemAsReviewed = useCallback(
    async (review: ReviewSegment) => {
      const resp = await axios.post(`reviews/viewed`, { ids: [review.id] });

      if (resp.status == 200) {
        updateSegments(
          (data: ReviewSegment[] | undefined) => {
            if (!data) {
              return data;
            }

            const reviewIndex = data.findIndex((item) => item.id == review.id);
            if (reviewIndex == -1) {
              return data;
            }

            const newData = [
              ...data.slice(0, reviewIndex),
              { ...data[reviewIndex], has_been_reviewed: true },
              ...data.slice(reviewIndex + 1),
            ];

            return newData;
          },
          { revalidate: false, populateCache: true },
        );

        updateSummary(
          (data: ReviewSummary | undefined) => {
            if (!data) {
              return data;
            }

            const day = new Date(review.start_time * 1000);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let key;
            if (day.getTime() > today.getTime()) {
              key = "last24Hours";
            } else {
              key = `${day.getFullYear()}-${("0" + (day.getMonth() + 1)).slice(-2)}-${("0" + day.getDate()).slice(-2)}`;
            }

            if (!Object.keys(data).includes(key)) {
              return data;
            }

            const item = data[key];
            return {
              ...data,
              [key]: {
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
            };
          },
          { revalidate: false, populateCache: true },
        );
      }
    },
    [updateSegments, updateSummary],
  );

  // selected items

  const selectedReviewData = useMemo(() => {
    if (!config) {
      return undefined;
    }

    if (!reviews) {
      return undefined;
    }

    if (!selectedReviewId) {
      return undefined;
    }

    const allCameras = reviewFilter?.cameras ?? Object.keys(config.cameras);

    if (selectedReviewId.startsWith("motion")) {
      const motionData = selectedReviewId.split(",");
      const motionStart = parseFloat(motionData[2]);
      setStartTime(motionStart);
      // format is motion,camera,start_time
      return {
        camera: motionData[1],
        severity: "significant_motion" as ReviewSeverity,
        start_time: motionStart,
        allCameras: allCameras,
        cameraSegments: reviews.filter((seg) =>
          allCameras.includes(seg.camera),
        ),
      };
    }

    const selectedReview = reviews.find((item) => item.id == selectedReviewId);

    if (!selectedReview) {
      return undefined;
    }

    // mark item as reviewed since it has been opened
    if (!selectedReview?.has_been_reviewed) {
      markItemAsReviewed(selectedReview);
    }

    return {
      camera: selectedReview.camera,
      severity: selectedReview.severity,
      start_time: selectedReview.start_time,
      allCameras: allCameras,
      cameraSegments: reviews.filter((seg) => allCameras.includes(seg.camera)),
    };

    // previews will not update after item is selected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReviewId, reviews]);

  if (!timezone) {
    return <ActivityIndicator />;
  }

  if (selectedReviewData) {
    if (isMobile) {
      return (
        <MobileRecordingView
          reviewItems={selectedReviewData.cameraSegments}
          startCamera={selectedReviewData.camera}
          startTime={selectedReviewData.start_time}
          allCameras={selectedReviewData.allCameras}
          severity={selectedReviewData.severity}
          relevantPreviews={allPreviews}
        />
      );
    }

    return (
      <DesktopRecordingView
        startCamera={selectedReviewData.camera}
        startTime={selectedReviewData.start_time}
        allCameras={selectedReviewData.allCameras}
        severity={selectedReviewData.severity}
        reviewItems={selectedReviewData.cameraSegments}
        allPreviews={allPreviews}
      />
    );
  } else {
    return (
      <EventView
        reviews={reviews}
        reviewSummary={reviewSummary}
        relevantPreviews={allPreviews}
        timeRange={selectedTimeRange}
        filter={reviewFilter}
        severity={severity ?? "alert"}
        startTime={startTime}
        setSeverity={setSeverity}
        markItemAsReviewed={markItemAsReviewed}
        markAllItemsAsReviewed={markAllItemsAsReviewed}
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
