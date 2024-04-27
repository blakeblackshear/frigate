import { useEffect, useMemo } from "react";
import DebugCameraImage from "../camera/DebugCameraImage";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "../indicators/activity-indicator";

type ObjectSettingsProps = {
  selectedCamera?: string;
};

export default function ObjectSettings({
  selectedCamera,
}: ObjectSettingsProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  useEffect(() => {
    document.title = "Object Settings - Frigate";
  }, []);

  if (!cameraConfig) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex flex-col h-50">
      <DebugCameraImage cameraConfig={cameraConfig} className="size-full" />
    </div>
  );
}
