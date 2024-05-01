import {
  useFrigateEvents,
  useInitialCameraState,
  useMotionActivity,
} from "@/api/ws";
import { ATTRIBUTE_LABELS, CameraConfig } from "@/types/frigateConfig";
import { MotionData, ReviewSegment } from "@/types/review";
import { useEffect, useMemo, useState } from "react";
import { useTimelineUtils } from "./use-timeline-utils";
import { ObjectType } from "@/types/ws";
import useDeepMemo from "./use-deep-memo";

type useCameraActivityReturn = {
  activeTracking: boolean;
  activeMotion: boolean;
  objects: ObjectType[];
};

export function useCameraActivity(
  camera: CameraConfig,
): useCameraActivityReturn {
  const [objects, setObjects] = useState<ObjectType[]>([]);

  // init camera activity

  const { payload: initialCameraState } = useInitialCameraState(camera.name);

  const updatedCameraState = useDeepMemo(initialCameraState);

  useEffect(() => {
    if (updatedCameraState) {
      console.log(`the initial objects are ${JSON.stringify(updatedCameraState.objects)}`)
      setObjects(updatedCameraState.objects);
    }
  }, [updatedCameraState]);

  // handle camera activity

  const hasActiveObjects = useMemo(
    () => objects.filter((obj) => !obj.stationary).length > 0,
    [objects],
  );

  const { payload: detectingMotion } = useMotionActivity(camera.name);
  const { payload: event } = useFrigateEvents();
  const updatedEvent = useDeepMemo(event);

  useEffect(() => {
    if (!updatedEvent) {
      return;
    }

    if (updatedEvent.after.camera != camera.name) {
      return;
    }

    const updatedEventIndex = objects.findIndex(
      (obj) => obj.id === updatedEvent.after.id,
    );

    if (updatedEvent.type == "end") {
      if (updatedEventIndex != -1) {
        const newActiveObjects = [...objects];
        newActiveObjects.splice(updatedEventIndex, 1);
        setObjects(newActiveObjects);
      }
    } else {
      if (updatedEventIndex == -1) {
        // add unknown updatedEvent to list if not stationary
        if (!updatedEvent.after.stationary) {
          const newActiveObject: ObjectType = {
            id: updatedEvent.after.id,
            label: updatedEvent.after.label,
            stationary: updatedEvent.after.stationary,
          };
          const newActiveObjects = [...objects, newActiveObject];
          setObjects(newActiveObjects);
        }
      } else {
        const newObjects = [...objects];

        let label = updatedEvent.after.label;

        if (updatedEvent.after.sub_label) {
          const sub_label = updatedEvent.after.sub_label[0];

          if (ATTRIBUTE_LABELS.includes(sub_label)) {
            label = sub_label;
          } else {
            label = `${label}-verified`;
          }
        }

        newObjects[updatedEventIndex].label = label;
        newObjects[updatedEventIndex].stationary =
          updatedEvent.after.stationary;
        setObjects(newObjects);
      }
    }
  }, [camera, updatedEvent, objects]);

  return {
    activeTracking: hasActiveObjects,
    activeMotion: detectingMotion
      ? detectingMotion == "ON"
      : initialCameraState?.motion == true,
    objects,
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
          ((item.end_time ?? Date.now() / 1000) > motionStart &&
            (item.end_time ?? Date.now() / 1000) <= motionEnd) ||
          (item.start_time <= motionStart &&
            (item.end_time ?? Date.now() / 1000) >= motionEnd),
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
