import Heading from "@/components/ui/heading";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import AutoUpdatingCameraImage from "@/components/camera/AutoUpdatingCameraImage";
import { useCallback, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useMotionContourArea, useMotionThreshold } from "@/api/ws";
import { Skeleton } from "../ui/skeleton";

export default function MotionTuner() {
  const { data: config } = useSWR<FrigateConfig>("config");

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  const [selectedCamera, setSelectedCamera] = useState(cameras[0].name);

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  const motionThreshold = useMemo(() => {
    return cameraConfig?.motion.threshold ?? 0;
  }, [cameraConfig?.motion.threshold]);

  const motionContourArea = useMemo(
    () => cameraConfig?.motion.contour_area ?? 0,
    [cameraConfig?.motion.contour_area],
  );

  const { send: sendMotionThreshold } = useMotionThreshold(selectedCamera);
  const { send: sendMotionContourArea } = useMotionContourArea(selectedCamera);

  const setMotionThreshold = useCallback(
    (threshold: number) => {
      if (cameraConfig && threshold != motionThreshold) {
        cameraConfig.motion.threshold = threshold;
        sendMotionThreshold(threshold);
      }
    },
    [cameraConfig, motionThreshold, sendMotionThreshold],
  );

  const setMotionContourArea = useCallback(
    (contour_area: number) => {
      if (cameraConfig && contour_area != motionContourArea) {
        cameraConfig.motion.contour_area = contour_area;
        sendMotionContourArea(contour_area);
      }
    },
    [cameraConfig, motionContourArea, sendMotionContourArea],
  );

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <Heading as="h2">Motion Detection Tuner</Heading>
      <div className="flex items-center space-x-2 mt-5">
        <Select value={selectedCamera} onValueChange={setSelectedCamera}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Camera" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Choose a camera</SelectLabel>
              {cameras.map((camera) => (
                <SelectItem
                  key={camera.name}
                  value={`${camera.name}`}
                  className="capitalize"
                >
                  {camera.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {cameraConfig ? (
        <div className="flex flex-col justify-start">
          <AutoUpdatingCameraImage
            camera={cameraConfig.name}
            searchParams={new URLSearchParams([["motion", "1"]])}
            className="w-[50%]"
          />
          <div className="flex flex-row justify-evenly w-full">
            <div className="flex flex-row mb-5">
              <Slider
                id="motion-threshold"
                className="w-[300px]"
                value={[motionThreshold]}
                min={10}
                max={80}
                step={1}
                onValueChange={(value) => setMotionThreshold(value[0])}
              />
              <Label htmlFor="motion-threshold" className="px-2">
                Threshold: {motionThreshold}
              </Label>
            </div>
            <div className="flex flex-row">
              <Slider
                id="motion-contour-area"
                className="w-[300px]"
                value={[motionContourArea]}
                min={10}
                max={200}
                step={5}
                onValueChange={(value) => setMotionContourArea(value[0])}
              />
              <Label htmlFor="motion-contour-area" className="px-2">
                Contour Area: {motionContourArea}
              </Label>
            </div>
          </div>
        </div>
      ) : (
        <Skeleton className="size-full rounded-2xl" />
      )}
    </>
  );
}
