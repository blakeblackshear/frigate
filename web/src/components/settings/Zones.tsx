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
import DebugCameraImage from "@/components/camera/DebugCameraImage";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useCallback, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useMotionContourArea, useMotionThreshold } from "@/api/ws";
import DebugCanvas from "./DebugCanvas";

export default function SettingsZones() {
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

  if (!cameraConfig && !selectedCamera) {
    return <ActivityIndicator />;
  }

  // console.log("selected camera", selectedCamera);
  // console.log("threshold", motionThreshold);
  // console.log("contour area", motionContourArea);
  // console.log(cameraConfig);

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
      <DebugCameraImage cameraConfig={cameraConfig} className="w-[50%]" />
      <DebugCanvas />
    </>
  );
}
