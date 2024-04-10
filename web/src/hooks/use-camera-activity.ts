import { useFrigateEvents, useMotionActivity } from "@/api/ws";
import { CameraConfig } from "@/types/frigateConfig";
import { MotionData, ReviewSegment } from "@/types/review";
import { useEffect, useMemo, useState } from "react";
import { useTimelineUtils } from "./use-timeline-utils";

type useCameraActivityReturn = {
  activeTracking: boolean;
  activeMotion: boolean;
};

export function useCameraActivity(
  camera: CameraConfig,
): useCameraActivityReturn {
  const [activeObjects, setActiveObjects] = useState<string[]>([]);
  const hasActiveObjects = useMemo(
    () => activeObjects.length > 0,
    [activeObjects],
  );

  const { payload: detectingMotion } = useMotionActivity(camera.name);
  const { payload: event } = useFrigateEvents();

  useEffect(() => {
    if (!event) {
      return;
    }

    if (event.after.camera != camera.name) {
      return;
    }

    const eventIndex = activeObjects.indexOf(event.after.id);

    if (event.type == "end") {
      if (eventIndex != -1) {
        const newActiveObjects = [...activeObjects];
        newActiveObjects.splice(eventIndex, 1);
        setActiveObjects(newActiveObjects);
      }
    } else {
      if (eventIndex == -1) {
        // add unknown event to list if not stationary
        if (!event.after.stationary) {
          const newActiveObjects = [...activeObjects, event.after.id];
          setActiveObjects(newActiveObjects);
        }
      } else {
        // remove known event from list if it has become stationary
        if (event.after.stationary) {
          activeObjects.splice(eventIndex, 1);
        }
      }
    }
  }, [camera, event, activeObjects]);

  return {
    activeTracking: hasActiveObjects,
    activeMotion: detectingMotion == "ON",
  };
}

export function useCameraMotionNextTimestamp(
  timeRangeSegmentEnd: number,
  segmentDuration: number,
  motionOnly: boolean,
  reviewItems: ReviewSegment[],
  motionData: MotionData[],
  currentTime: number,
) {
  const { alignStartDateToTimeline } = useTimelineUtils({
    segmentDuration,
  });

  const noMotionRanges = useMemo(() => {
    if (!motionData?.length || !reviewItems) {
      return;
    }

    if (!motionOnly) {
      return [];
    }

    const ranges = [];
    let currentSegmentStart = null;
    let currentSegmentEnd = null;

    // align motion start to timeline start
    const offset =
      (motionData[0].start_time -
        alignStartDateToTimeline(timeRangeSegmentEnd)) %
      segmentDuration;

    const startIndex = Math.abs(Math.floor(offset / 15));

    for (
      let i = startIndex;
      i < motionData.length;
      i = i + segmentDuration / 15
    ) {
      const motionStart = motionData[i].start_time;
      const motionEnd = motionStart + segmentDuration;

      const segmentMotion = motionData
        .slice(i, i + segmentDuration / 15)
        .some(({ motion }) => motion !== undefined && motion > 0);
      const overlappingReviewItems = reviewItems.some(
        (item) =>
          (item.start_time >= motionStart && item.start_time < motionEnd) ||
          (item.end_time > motionStart && item.end_time <= motionEnd) ||
          (item.start_time <= motionStart && item.end_time >= motionEnd),
      );

      if (!segmentMotion || overlappingReviewItems) {
        if (currentSegmentStart === null) {
          currentSegmentStart = motionStart;
        }
        currentSegmentEnd = motionEnd;
      } else {
        if (currentSegmentStart !== null) {
          ranges.push([currentSegmentStart, currentSegmentEnd]);
          currentSegmentStart = null;
          currentSegmentEnd = null;
        }
      }
    }

    if (currentSegmentStart !== null) {
      ranges.push([currentSegmentStart, currentSegmentEnd]);
    }

    return ranges;
  }, [
    motionData,
    reviewItems,
    motionOnly,
    alignStartDateToTimeline,
    segmentDuration,
    timeRangeSegmentEnd,
  ]);

  const nextTimestamp = useMemo(() => {
    if (!noMotionRanges) {
      return;
    }

    if (!motionOnly) {
      return currentTime + 0.5;
    }

    let currentRange = 0;
    let nextTimestamp = currentTime + 0.5;

    while (currentRange < noMotionRanges.length) {
      const [start, end] = noMotionRanges[currentRange];

      if (start && end) {
        // If the current time is before the start of the current range
        if (currentTime < start) {
          // The next timestamp is either the start of the current range or currentTime + 0.5, whichever is smaller
          nextTimestamp = Math.min(start, nextTimestamp);
          break;
        }
        // If the current time is within the current range
        else if (currentTime >= start && currentTime < end) {
          // The next timestamp is the end of the current range
          nextTimestamp = end;
          currentRange++;
        }
        // If the current time is past the end of the current range
        else {
          currentRange++;
        }
      }
    }

    return nextTimestamp;
  }, [currentTime, noMotionRanges, motionOnly]);

  return nextTimestamp;
}
