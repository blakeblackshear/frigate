import { useFullscreen } from "@/hooks/use-fullscreen";
import {
  useHashState,
  usePersistedOverlayState,
  useSearchEffect,
} from "@/hooks/use-overlay-state";
import { FrigateConfig } from "@/types/frigateConfig";
import LiveBirdseyeView from "@/views/live/LiveBirdseyeView";
import LiveCameraView from "@/views/live/LiveCameraView";
import LiveDashboardView from "@/views/live/LiveDashboardView";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // selection

  const [selectedCameraName, setSelectedCameraName] = useHashState();
  const [cameraGroup, setCameraGroup] = usePersistedOverlayState(
    "cameraGroup",
    "default" as string,
  );

  useSearchEffect("group", (cameraGroup) => {
    if (config && cameraGroup) {
      const group = config.camera_groups[cameraGroup];

      if (group) {
        setCameraGroup(cameraGroup);
      }
    }
  });

  // fullscreen

  const mainRef = useRef<HTMLDivElement | null>(null);

  const { fullscreen, toggleFullscreen, supportsFullScreen } =
    useFullscreen(mainRef);

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

  return (
    <div className="size-full" ref={mainRef}>
      {selectedCameraName === "birdseye" ? (
        <LiveBirdseyeView
          supportsFullscreen={supportsFullScreen}
          fullscreen={fullscreen}
          toggleFullscreen={toggleFullscreen}
        />
      ) : selectedCamera ? (
        <LiveCameraView
          config={config}
          camera={selectedCamera}
          supportsFullscreen={supportsFullScreen}
          fullscreen={fullscreen}
          toggleFullscreen={toggleFullscreen}
        />
      ) : (
        <LiveDashboardView
          cameras={cameras}
          cameraGroup={cameraGroup ?? "default"}
          includeBirdseye={includesBirdseye}
          onSelectCamera={setSelectedCameraName}
          fullscreen={fullscreen}
          toggleFullscreen={toggleFullscreen}
        />
      )}
    </div>
  );
}

export default Live;
