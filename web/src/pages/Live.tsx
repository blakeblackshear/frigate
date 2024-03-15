import {
  useHashState,
  usePersistedOverlayState,
} from "@/hooks/use-overlay-state";
import { FrigateConfig } from "@/types/frigateConfig";
import LiveBirdseyeView from "@/views/live/LiveBirdseyeView";
import LiveCameraView from "@/views/live/LiveCameraView";
import LiveDashboardView from "@/views/live/LiveDashboardView";
import { useMemo } from "react";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");

  const [selectedCameraName, setSelectedCameraName] = useHashState();
  const [cameraGroup] = usePersistedOverlayState(
    "cameraGroup",
    "default" as string,
  );

  const includesBirdseye = useMemo(() => {
    if (config && cameraGroup && cameraGroup != "default") {
      return config.camera_groups[cameraGroup].cameras.includes("birdseye");
    } else {
      return false;
    }
  }, [config, cameraGroup]);

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    if (cameraGroup && cameraGroup != "default") {
      const group = config.camera_groups[cameraGroup];
      return Object.values(config.cameras)
        .filter((conf) => conf.enabled && group.cameras.includes(conf.name))
        .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config, cameraGroup]);

  const selectedCamera = useMemo(
    () => cameras.find((cam) => cam.name == selectedCameraName),
    [cameras, selectedCameraName],
  );

  if (selectedCameraName == "birdseye") {
    return <LiveBirdseyeView />;
  }

  if (selectedCamera) {
    return <LiveCameraView camera={selectedCamera} />;
  }

  return (
    <LiveDashboardView
      cameras={cameras}
      includeBirdseye={includesBirdseye}
      onSelectCamera={setSelectedCameraName}
    />
  );
}

export default Live;
