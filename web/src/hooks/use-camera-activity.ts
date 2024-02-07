import {
  useAudioActivity,
  useFrigateEvents,
  useMotionActivity,
} from "@/api/ws";
import { CameraConfig } from "@/types/frigateConfig";
import { useEffect, useMemo, useState } from "react";

type useCameraActivityReturn = {
  activeTracking: boolean;
  activeMotion: boolean;
  activeAudio: boolean;
};

export default function useCameraActivity(
  camera: CameraConfig
): useCameraActivityReturn {
  const [activeObjects, setActiveObjects] = useState<string[]>([]);
  const hasActiveObjects = useMemo(
    () => activeObjects.length > 0,
    [activeObjects]
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

    if (event.type == "end") {
      const eventIndex = activeObjects.indexOf(event.after.id);

      if (eventIndex != -1) {
        const newActiveObjects = [...activeObjects];
        newActiveObjects.splice(eventIndex, 1);
        setActiveObjects(newActiveObjects);
      }
    } else {
      if (!event.after.stationary) {
        const eventIndex = activeObjects.indexOf(event.after.id);

        if (eventIndex == -1) {
          const newActiveObjects = [...activeObjects, event.after.id];
          setActiveObjects(newActiveObjects);
        }
      }
    }
  }, [event, activeObjects]);

  return {
    activeTracking: hasActiveObjects,
    activeMotion: detectingMotion == "ON",
    activeAudio: camera.audio.enabled_in_config
      ? audioRms >= camera.audio.min_volume
      : false,
  };
}
