import {
  useFrigateEvents,
  useInitialCameraState,
  useMotionActivity,
} from "@/api/ws";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { MotionData, ReviewSegment } from "@/types/review";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTimelineUtils } from "./use-timeline-utils";
import { ObjectType } from "@/types/ws";
import useDeepMemo from "./use-deep-memo";
import { isEqual } from "lodash";
import { useAutoFrigateStats } from "./use-stats";
import useSWR from "swr";
import { getAttributeLabels } from "@/utils/iconUtil";

type useCameraActivityReturn = {
  activeTracking: boolean;
  activeMotion: boolean;
  objects: ObjectType[];
  offline: boolean;
};

export function useCameraActivity(
  camera: CameraConfig,
  revalidateOnFocus: boolean = true,
): useCameraActivityReturn {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const attributeLabels = useMemo(() => {
    if (!config) {
      return [];
    }

    return getAttributeLabels(config);
  }, [config]);
  const [objects, setObjects] = useState<ObjectType[]>([]);

  // init camera activity

  const { payload: updatedCameraState } = useInitialCameraState(
    camera.name,
    revalidateOnFocus,
  );
  useEffect(() => {
    if (updatedCameraState) {
      setObjects(updatedCameraState.objects);
    }
  }, [updatedCameraState, camera]);

  // handle camera activity

  const hasActiveObjects = useMemo(
    () => objects.filter((obj) => !obj.stationary).length > 0,
    [objects],
  );

  const { payload: detectingMotion } = useMotionActivity(camera.name);
  const { payload: event } = useFrigateEvents();
  const updatedEvent = useDeepMemo(event);

  const handleSetObjects = useCallback(
    (newObjects: ObjectType[]) => {
      if (!isEqual(objects, newObjects)) {
        setObjects(newObjects);
      }
    },
    [objects],
  );

  useEffect(() => {
    if (!updatedEvent) {
      return;
    }

    if (updatedEvent.after.camera !== camera.name) {
      return;
    }

    const updatedEventIndex = objects.findIndex(
      (obj) => obj.id === updatedEvent.after.id,
    );

    let newObjects: ObjectType[] = [...objects];

    if (updatedEvent.type === "end") {
      if (updatedEventIndex !== -1) {
        newObjects.splice(updatedEventIndex, 1);
      }
    } else {
      if (updatedEventIndex === -1) {
        // add unknown updatedEvent to list if not stationary
        if (!updatedEvent.after.stationary) {
          const newActiveObject: ObjectType = {
            id: updatedEvent.after.id,
            label: updatedEvent.after.label,
            stationary: updatedEvent.after.stationary,
            area: updatedEvent.after.area,
            ratio: updatedEvent.after.ratio,
            score: updatedEvent.after.score,
            sub_label: updatedEvent.after.sub_label?.[0] ?? "",
          };
          newObjects = [...objects, newActiveObject];
        }
      } else {
        const newObjects = [...objects];

        let label = updatedEvent.after.label;

        if (updatedEvent.after.sub_label) {
          const sub_label = updatedEvent.after.sub_label[0];

          if (attributeLabels.includes(sub_label)) {
            label = sub_label;
          } else {
            label = `${label}-verified`;
          }
        }

        newObjects[updatedEventIndex].label = label;
        newObjects[updatedEventIndex].stationary =
          updatedEvent.after.stationary;
      }
    }

    handleSetObjects(newObjects);
  }, [attributeLabels, camera, updatedEvent, objects, handleSetObjects]);

  // determine if camera is offline

  const stats = useAutoFrigateStats();

  const offline = useMemo(() => {
    if (!stats) {
      return false;
    }

    const cameras = stats["cameras"];

    if (!cameras) {
      return false;
    }

    return cameras[camera.name].camera_fps == 0 && stats["service"].uptime > 60;
  }, [camera, stats]);

  return {
    activeTracking: hasActiveObjects,
    activeMotion: detectingMotion
      ? detectingMotion === "ON"
      : updatedCameraState?.motion === true,
    objects,
    offline,
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
