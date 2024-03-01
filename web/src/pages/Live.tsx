import { useFrigateReviews } from "@/api/ws";
import Logo from "@/components/Logo";
import { AnimatedEventThumbnail } from "@/components/image/AnimatedEventThumbnail";
import LivePlayer from "@/components/player/LivePlayer";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import useOverlayState from "@/hooks/use-overlay-state";
import { usePersistence } from "@/hooks/use-persistence";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import LiveCameraView from "@/views/live/LiveCameraView";
import LiveDashboardView from "@/views/live/LiveDashboardView";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isDesktop, isMobile, isSafari } from "react-device-detect";
import { CiGrid2H, CiGrid31 } from "react-icons/ci";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [selectedCameraName, setSelectedCameraName] = useOverlayState("camera");

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  const selectedCamera = useMemo(
    () => cameras.find((cam) => cam.name == selectedCameraName),
    [cameras, selectedCameraName],
  );

  if (selectedCamera) {
    return <LiveCameraView camera={selectedCamera} />;
  }

  return (
    <LiveDashboardView
      cameras={cameras}
      onSelectCamera={setSelectedCameraName}
    />
  );
}

export default Live;
