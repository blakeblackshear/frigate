import { useCallback, useEffect, useMemo, useState } from "react";
import { AspectRatio } from "../ui/aspect-ratio";
import CameraImage from "./CameraImage";
import { LuEar } from "react-icons/lu";
import { CameraConfig } from "@/types/frigateConfig";
import { TbUserScan } from "react-icons/tb";
import { MdLeakAdd } from "react-icons/md";
import {
  useAudioActivity,
  useFrigateEvents,
  useMotionActivity,
} from "@/api/ws";

type DynamicCameraImageProps = {
  camera: CameraConfig;
  aspect: number;
};

const INTERVAL_INACTIVE_MS = 60000; // refresh once a minute
const INTERVAL_ACTIVE_MS = 1000; // refresh once a second

export default function DynamicCameraImage({
  camera,
  aspect,
}: DynamicCameraImageProps) {
  const [key, setKey] = useState(Date.now());
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

  const handleLoad = useCallback(() => {
    const loadTime = Date.now() - key;
    const loadInterval = hasActiveObjects
      ? INTERVAL_ACTIVE_MS
      : INTERVAL_INACTIVE_MS;

    setTimeout(
      () => {
        setKey(Date.now());
      },
      loadTime > loadInterval ? 1 : loadInterval
    );
  }, [key]);

  return (
    <AspectRatio
      ratio={aspect}
      className="bg-black flex justify-center items-center relative"
    >
      <CameraImage
        camera={camera.name}
        fitAspect={aspect}
        searchParams={`cache=${key}`}
        onload={handleLoad}
      />
      <div className="flex absolute right-0 bottom-0 bg-black bg-opacity-20 rounded p-1">
        <MdLeakAdd
          className={`${
            detectingMotion == "ON" ? "text-motion" : "text-gray-600"
          }`}
        />
        <TbUserScan
          className={`${
            activeObjects.length > 0 ? "text-object" : "text-gray-600"
          }`}
        />
        {camera.audio.enabled_in_config && (
          <LuEar
            className={`${
              parseInt(audioRms) >= camera.audio.min_volume
                ? "text-audio"
                : "text-gray-600"
            }`}
          />
        )}
      </div>
    </AspectRatio>
  );
}
