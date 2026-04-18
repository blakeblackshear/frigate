import {
  useAudioDetections,
  useEnabledState,
  useFrigateEvents,
  useInitialCameraState,
  useMotionActivity,
} from "@/api/ws";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { MotionData, ReviewSegment } from "@/types/review";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AudioDetection, ObjectType } from "@/types/ws";
import { useTimelineUtils } from "./use-timeline-utils";
import useDeepMemo from "./use-deep-memo";
import { isEqual } from "lodash";
import { useAutoFrigateStats } from "./use-stats";
import useSWR from "swr";
import { getAttributeLabels } from "@/utils/iconUtil";

export type MotionOnlyRange = {
  start_time: number;
  end_time: number;
};

type useCameraActivityReturn = {
  enabled?: boolean;
  activeTracking: boolean;
  activeMotion: boolean;
  objects: ObjectType[];
  audio_detections: AudioDetection[];
  offline: boolean;
};

export function useCameraActivity(
  camera: CameraConfig | undefined,
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
  const [objects, setObjects] = useState<ObjectType[] | undefined>([]);
  const [audioDetections, setAudioDetections] = useState<
    AudioDetection[] | undefined
  >([]);

  // init camera activity

  const { payload: updatedCameraState } = useInitialCameraState(
    camera?.name ?? "",
    revalidateOnFocus,
  );
  useEffect(() => {
    if (updatedCameraState) {
      setObjects(updatedCameraState.objects);
    }
  }, [updatedCameraState, camera]);

  const { payload: updatedAudioState } = useAudioDetections();
  const memoizedAudioState = useDeepMemo(updatedAudioState);

  useEffect(() => {
    if (memoizedAudioState && camera?.name) {
      setAudioDetections(memoizedAudioState[camera.name]);
    }
  }, [memoizedAudioState, camera]);

  // handle camera activity

  const hasActiveObjects = useMemo(
    () => (objects || []).filter((obj) => !obj?.stationary)?.length > 0,
    [objects],
  );

  const { payload: cameraEnabled } = useEnabledState(camera?.name ?? "");
  const { payload: detectingMotion } = useMotionActivity(camera?.name ?? "");
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

    if (!camera?.name || updatedEvent.after.camera !== camera.name) {
      return;
    }

    const updatedEventIndex =
      objects?.findIndex((obj) => obj.id === updatedEvent.after.id) ?? -1;

    let newObjects: ObjectType[] = [...(objects ?? [])];

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
          newObjects = [...(objects ?? []), newActiveObject];
        }
      } else {
        let label = updatedEvent.after.label;

        if (updatedEvent.after.sub_label) {
          const sub_label = updatedEvent.after.sub_label[0];

          if (attributeLabels.includes(sub_label)) {
            label = sub_label;
          } else {
            label = `${label}-verified`;
          }
        }

        newObjects[updatedEventIndex] = {
          ...newObjects[updatedEventIndex],
          label,
          stationary: updatedEvent.after.stationary,
        };
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

    if (!camera?.name) {
      return false;
    }

    return (
      cameras[camera.name]?.camera_fps == 0 && stats["service"].uptime > 60
    );
  }, [camera, stats]);

  const isCameraEnabled = cameraEnabled ? cameraEnabled === "ON" : true;

  return {
    enabled: isCameraEnabled,
    activeTracking: isCameraEnabled ? hasActiveObjects : false,
    activeMotion: isCameraEnabled
      ? detectingMotion
        ? detectingMotion === "ON"
        : updatedCameraState?.motion === true
      : false,
    objects: isCameraEnabled ? (objects ?? []) : [],
    audio_detections: isCameraEnabled ? (audioDetections ?? []) : [],
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

    const ranges: [number, number][] = [];
    let currentSegmentStart: number | null = null;
    let currentSegmentEnd: number | null = null;

    // align motion start to timeline start
    const offset =
      (motionData[0].start_time -
        alignStartDateToTimeline(timeRangeSegmentEnd)) %
      segmentDuration;

    const startIndex = Math.abs(Math.floor(offset / 15));
    const now = Date.now() / 1000;

    for (
      let i = startIndex;
      i < motionData.length;
      i = i + segmentDuration / 15
    ) {
      const motionStart = motionData[i]?.start_time;

      if (motionStart == undefined) {
        continue;
      }

      const motionEnd = motionStart + segmentDuration;

      const segmentMotion = motionData
        .slice(i, i + segmentDuration / 15)
        .some(({ motion }) => motion !== undefined && motion > 0);
      const overlappingReviewItems = reviewItems.some(
        (item) =>
          (item.start_time >= motionStart && item.start_time < motionEnd) ||
          ((item.end_time ?? now) > motionStart &&
            (item.end_time ?? now) <= motionEnd) ||
          (item.start_time <= motionStart &&
            (item.end_time ?? now) >= motionEnd),
      );

      if (!segmentMotion || overlappingReviewItems) {
        if (currentSegmentStart === null) {
          currentSegmentStart = motionStart;
        }
        currentSegmentEnd = motionEnd;
      } else if (currentSegmentStart !== null && currentSegmentEnd !== null) {
        ranges.push([currentSegmentStart, currentSegmentEnd]);
        currentSegmentStart = null;
        currentSegmentEnd = null;
      }
    }

    if (currentSegmentStart !== null && currentSegmentEnd !== null) {
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

export function useCameraMotionOnlyRanges(
  segmentDuration: number,
  reviewItems: ReviewSegment[],
  motionData: MotionData[],
) {
  const motionOnlyRanges = useMemo(() => {
    if (!motionData?.length || !reviewItems) {
      return [];
    }

    const fallbackBucketDuration = Math.max(1, segmentDuration / 2);
    const normalizedMotionData = Array.from(
      motionData
        .reduce((accumulator, item) => {
          const currentMotion = accumulator.get(item.start_time) ?? 0;
          accumulator.set(
            item.start_time,
            Math.max(currentMotion, item.motion ?? 0),
          );
          return accumulator;
        }, new Map<number, number>())
        .entries(),
    )
      .map(([start_time, motion]) => ({ start_time, motion }))
      .sort((left, right) => left.start_time - right.start_time);

    const bucketRanges: MotionOnlyRange[] = [];
    const now = Date.now() / 1000;

    for (let i = 0; i < normalizedMotionData.length; i++) {
      const motionStart = normalizedMotionData[i].start_time;
      const motionEnd = motionStart + fallbackBucketDuration;

      const overlappingReviewItems = reviewItems.some(
        (item) =>
          (item.start_time >= motionStart && item.start_time < motionEnd) ||
          ((item.end_time ?? now) > motionStart &&
            (item.end_time ?? now) <= motionEnd) ||
          (item.start_time <= motionStart &&
            (item.end_time ?? now) >= motionEnd),
      );

      const isMotionOnlySegment =
        (normalizedMotionData[i].motion ?? 0) > 0 && !overlappingReviewItems;

      if (!isMotionOnlySegment) {
        continue;
      }

      bucketRanges.push({
        start_time: motionStart,
        end_time: motionEnd,
      });
    }

    if (!bucketRanges.length) {
      return [];
    }

    const mergedRanges = bucketRanges.reduce<MotionOnlyRange[]>(
      (ranges, range) => {
        if (!ranges.length) {
          return [range];
        }

        const previousRange = ranges[ranges.length - 1];
        const isContiguous =
          range.start_time <= previousRange.end_time + 0.001 &&
          range.start_time >= previousRange.end_time - 0.001;

        if (isContiguous) {
          previousRange.end_time = Math.max(
            previousRange.end_time,
            range.end_time,
          );
          return ranges;
        }

        ranges.push(range);
        return ranges;
      },
      [],
    );

    return mergedRanges;
  }, [motionData, reviewItems, segmentDuration]);

  return motionOnlyRanges;
}
