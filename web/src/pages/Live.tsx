import { useFullscreen } from "@/hooks/use-fullscreen";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import {
  useHashState,
  usePersistedOverlayState,
  useSearchEffect,
} from "@/hooks/use-overlay-state";
import { FrigateConfig } from "@/types/frigateConfig";
import LiveBirdseyeView from "@/views/live/LiveBirdseyeView";
import LiveCameraView from "@/views/live/LiveCameraView";
import LiveDashboardView from "@/views/live/LiveDashboardView";
import { useTranslation } from "react-i18next";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { useIsCustomRole } from "@/hooks/use-is-custom-role";

function Live() {
  const { t } = useTranslation(["views/live"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const isCustomRole = useIsCustomRole();

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

      return true;
    }

    return false;
  });

  // fullscreen

  const mainRef = useRef<HTMLDivElement | null>(null);

  const { fullscreen, toggleFullscreen, supportsFullScreen } =
    useFullscreen(mainRef);

  useKeyboardListener(["f"], (key, modifiers) => {
    if (!modifiers.down) {
      return;
    }

    switch (key) {
      case "f":
        toggleFullscreen();
        break;
    }
  });

  // document title

  useEffect(() => {
    if (selectedCameraName) {
      const capitalized = selectedCameraName
        .split("_")
        .filter((text) => text)
        .map((text) => text[0].toUpperCase() + text.substring(1));
      document.title = t("documentTitle.withCamera", {
        camera: capitalized.join(" "),
      });
    } else if (cameraGroup && cameraGroup != "default") {
      document.title = t("documentTitle.withCamera", {
        camera: `${cameraGroup[0].toUpperCase()}${cameraGroup.substring(1)}`,
      });
    } else {
      document.title = t("documentTitle", { ns: "views/live" });
    }
  }, [cameraGroup, selectedCameraName, t]);

  // settings

  const allowedCameras = useAllowedCameras();

  const includesBirdseye = useMemo(() => {
    if (
      config &&
      Object.keys(config.camera_groups).length &&
      cameraGroup &&
      config.camera_groups[cameraGroup] &&
      cameraGroup != "default" &&
      (!isCustomRole || "birdseye" in allowedCameras)
    ) {
      return config.camera_groups[cameraGroup].cameras.includes("birdseye");
    } else {
      return false;
    }
  }, [config, cameraGroup, allowedCameras, isCustomRole]);

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
        .filter(
          (conf) => conf.enabled_in_config && group.cameras.includes(conf.name),
        )
        .filter((cam) => allowedCameras.includes(cam.name))
        .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled_in_config)
      .filter((cam) => allowedCameras.includes(cam.name))
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config, cameraGroup, allowedCameras]);

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
          key={selectedCameraName}
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
