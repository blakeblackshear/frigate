import {
  useAudioActivity,
  useFrigateEvents,
  useMotionActivity,
} from "@/api/ws";
import { CameraConfig } from "@/types/frigateConfig";
import { MotionData, ReviewSegment } from "@/types/review";
import { TimeRange } from "@/types/timeline";
import { useEffect, useMemo, useState } from "react";

type useCameraActivityReturn = {
  activeTracking: boolean;
  activeMotion: boolean;
  activeAudio: boolean;
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
  const { payload: audioRms } = useAudioActivity(camera.name);

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
    activeAudio: camera.audio.enabled_in_config
      ? audioRms >= camera.audio.min_volume
      : false,
  };
}

export function useCameraMotionTimestamps(
  timeRange: TimeRange,
  motionOnly: boolean,
  events: ReviewSegment[],
  motion: MotionData[],
) {
  const timestamps = useMemo(() => {
    const seekableTimestamps = [];
    for (let i = timeRange.after; i <= timeRange.before; i += 0.5) {
      if (!motionOnly) {
        seekableTimestamps.push(i);
      } else {
        if (
          events.find((seg) => seg.start_time <= i && seg.end_time >= i) !=
          undefined
        ) {
          continue;
        }

        const relevantMotion = motion.find(
          (mot) => mot.start_time <= i && mot.start_time + 15 >= i,
        );

        if (!relevantMotion || relevantMotion.motion == 0) {
          continue;
        }

        seekableTimestamps.push(i);
      }
    }

    return seekableTimestamps;
  }, [timeRange, motionOnly, events, motion]);

  return timestamps;
}
