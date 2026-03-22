import { useFullscreen } from "@/hooks/use-fullscreen";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { useHashState, useSearchEffect } from "@/hooks/use-overlay-state";
import { useUserPersistedOverlayState } from "@/hooks/use-overlay-state";
import { FrigateConfig } from "@/types/frigateConfig";
import LiveBirdseyeView from "@/views/live/LiveBirdseyeView";
import LiveCameraView from "@/views/live/LiveCameraView";
import LiveDashboardView from "@/views/live/LiveDashboardView";
import { useTranslation } from "react-i18next";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { useIsAdmin } from "@/hooks/use-is-admin";

function Live() {
  const { t } = useTranslation(["views/live"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const isAdmin = useIsAdmin();

  // selection

  const [selectedCameraName, setSelectedCameraName] = useHashState();
  const [cameraGroup, setCameraGroup, loaded] = useUserPersistedOverlayState(
    "cameraGroup",
    "default" as string,
  );

  useSearchEffect("group", (cameraGroup) => {
    if (config && cameraGroup && loaded) {
      const group = config.camera_groups[cameraGroup];

      if (group) {
        setCameraGroup(cameraGroup);
        // return false so that url cleanup doesn't occur here.
        // will be cleaned up by usePersistedOverlayState in the
        // camera group selector so that the icon switches correctly
        return false;
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
      return true;
    }

    switch (key) {
      case "f":
        toggleFullscreen();
        return true;
    }

    return false;
  });

  useKeyboardListener(
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    (key, modifiers) => {
      if (!modifiers.down || !config || !key || selectedCameraName) {
        return false;
      }

      const groups = Object.entries(config.camera_groups).sort(
        (a, b) => a[1].order - b[1].order,
      );

      // 1-9 → индексы 0-8, 0 → индекс 9
      const index = key === "0" ? 9 : parseInt(key) - 1;

      if (index < groups.length) {
        setCameraGroup(groups[index][0]);
        return true;
      }

      return false;
    },
  );

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
    // Restricted users should never have access to birdseye
    if (!isAdmin) {
      return false;
    }

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
  }, [config, cameraGroup, isAdmin]);

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

  const selectedCamera = useMemo(() => {
    if (!config || !selectedCameraName || selectedCameraName === "birdseye") {
      return undefined;
    }
    const camera = config.cameras[selectedCameraName];
    if (
      camera &&
      allowedCameras.includes(selectedCameraName) &&
      camera.enabled_in_config
    ) {
      return camera;
    }
    return undefined;
  }, [config, selectedCameraName, allowedCameras]);

  return (
    <div className="size-full" ref={mainRef}>
      {selectedCameraName === "birdseye" ? (
        <LiveBirdseyeView
          supportsFullscreen={supportsFullScreen}
          fullscreen={fullscreen}
          toggleFullscreen={toggleFullscreen}
          onSelectCamera={setSelectedCameraName}
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
