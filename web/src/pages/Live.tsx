import {
  useHashState,
  usePersistedOverlayState,
} from "@/hooks/use-overlay-state";
import { FrigateConfig } from "@/types/frigateConfig";
import LiveBirdseyeView from "@/views/live/LiveBirdseyeView";
import LiveCameraView from "@/views/live/LiveCameraView";
import LiveDashboardView from "@/views/live/LiveDashboardView";
import { useEffect, useMemo } from "react";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // selection

  const [selectedCameraName, setSelectedCameraName] = useHashState();
  const [cameraGroup] = usePersistedOverlayState(
    "cameraGroup",
    "default" as string,
  );

  // document title

  useEffect(() => {
    if (selectedCameraName) {
      const capitalized = selectedCameraName
        .split("_")
        .map((text) => text[0].toUpperCase() + text.substring(1));
      document.title = `${capitalized.join(" ")} - Live - Frigate`;
    } else if (cameraGroup && cameraGroup != "default") {
      document.title = `${cameraGroup[0].toUpperCase()}${cameraGroup.substring(1)} - Live - Frigate`;
    } else {
      document.title = "Live - Frigate";
    }
  }, [cameraGroup, selectedCameraName]);

  // settings

  const includesBirdseye = useMemo(() => {
    if (
      config &&
      Object.keys(config.camera_groups).length &&
      cameraGroup &&
      config.camera_groups[cameraGroup] &&
      cameraGroup != "default"
    ) {
      return config.camera_groups[cameraGroup].cameras.includes("birdseye");
    } else {
      return false;
    }
  }, [config, cameraGroup]);

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    if (
      Object.keys(config.camera_groups).length &&
      cameraGroup &&
      config.camera_groups[cameraGroup] &&
      cameraGroup != "default"
    ) {
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
      cameraGroup={cameraGroup}
      includeBirdseye={includesBirdseye}
      onSelectCamera={setSelectedCameraName}
    />
  );
}

export default Live;
