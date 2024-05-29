import { useFrigateReviews } from "@/api/ws";
import Logo from "@/components/Logo";
import { CameraGroupSelector } from "@/components/filter/CameraGroupSelector";
import { LiveGridIcon, LiveListIcon } from "@/components/icons/LiveIcons";
import { AnimatedEventCard } from "@/components/card/AnimatedEventCard";
import BirdseyeLivePlayer from "@/components/player/BirdseyeLivePlayer";
import LivePlayer from "@/components/player/LivePlayer";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePersistence } from "@/hooks/use-persistence";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isDesktop,
  isMobile,
  isMobileOnly,
  isSafari,
  isTablet,
} from "react-device-detect";
import useSWR from "swr";
import DraggableGridLayout from "./DraggableGridLayout";
import { IoClose } from "react-icons/io5";
import { LuLayoutDashboard } from "react-icons/lu";
import { cn } from "@/lib/utils";

type LiveDashboardViewProps = {
  cameras: CameraConfig[];
  cameraGroup?: string;
  includeBirdseye: boolean;
  onSelectCamera: (camera: string) => void;
};
export default function LiveDashboardView({
  cameras,
  cameraGroup,
  includeBirdseye,
  onSelectCamera,
}: LiveDashboardViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // layout

  const [mobileLayout, setMobileLayout] = usePersistence<"grid" | "list">(
    "live-layout",
    isDesktop ? "grid" : "list",
  );

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // recent events

  const { payload: eventUpdate } = useFrigateReviews();
  const { data: allEvents, mutate: updateEvents } = useSWR<ReviewSegment[]>([
    "review",
    { limit: 10, severity: "alert" },
  ]);

  useEffect(() => {
    if (!eventUpdate) {
      return;
    }

    // if event is ended and was saved, update events list
    if (eventUpdate.after.severity == "alert") {
      if (eventUpdate.type == "end" || eventUpdate.type == "new") {
        setTimeout(
          () => updateEvents(),
          eventUpdate.type == "end" ? 1000 : 6000,
        );
      } else if (
        eventUpdate.before.data.objects.length <
        eventUpdate.after.data.objects.length
      ) {
        setTimeout(() => updateEvents(), 5000);
      }

      return;
    }
  }, [eventUpdate, updateEvents]);

  const events = useMemo(() => {
    if (!allEvents) {
      return [];
    }

    const date = new Date();
    date.setHours(date.getHours() - 1);
    const cutoff = date.getTime() / 1000;
    return allEvents.filter((event) => event.start_time > cutoff);
  }, [allEvents]);

  // camera live views

  const [autoLiveView] = usePersistence("autoLiveView", true);
  const [windowVisible, setWindowVisible] = useState(true);
  const visibilityListener = useCallback(() => {
    setWindowVisible(document.visibilityState == "visible");
  }, []);

  useEffect(() => {
    addEventListener("visibilitychange", visibilityListener);

    return () => {
      removeEventListener("visibilitychange", visibilityListener);
    };
  }, [visibilityListener]);

  const [visibleCameras, setVisibleCameras] = useState<string[]>([]);
  const visibleCameraObserver = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    const visibleCameras = new Set<string>();
    visibleCameraObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const camera = (entry.target as HTMLElement).dataset.camera;

          if (!camera) {
            return;
          }

          if (entry.isIntersecting) {
            visibleCameras.add(camera);
          } else {
            visibleCameras.delete(camera);
          }

          setVisibleCameras([...visibleCameras]);
        });
      },
      { threshold: 0.5 },
    );

    return () => {
      visibleCameraObserver.current?.disconnect();
    };
  }, []);

  const cameraRef = useCallback(
    (node: HTMLElement | null) => {
      if (!visibleCameraObserver.current) {
        return;
      }

      try {
        if (node) visibleCameraObserver.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    // we need to listen on the value of the ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleCameraObserver.current],
  );

  const birdseyeConfig = useMemo(() => config?.birdseye, [config]);

  return (
    <div
      className="size-full overflow-y-auto px-1 pt-2 md:p-2"
      ref={containerRef}
    >
      {isMobile && (
        <div className="relative flex h-11 items-center justify-between">
          <Logo className="absolute inset-x-1/2 h-8 -translate-x-1/2" />
          <div className="max-w-[45%]">
            <CameraGroupSelector />
          </div>
          {(!cameraGroup || cameraGroup == "default" || isMobileOnly) && (
            <div className="flex items-center gap-1">
              <Button
                className={`p-1 ${
                  mobileLayout == "grid"
                    ? "bg-blue-900 bg-opacity-60 focus:bg-blue-900 focus:bg-opacity-60"
                    : "bg-secondary"
                }`}
                size="xs"
                onClick={() => setMobileLayout("grid")}
              >
                <LiveGridIcon layout={mobileLayout} />
              </Button>
              <Button
                className={`p-1 ${
                  mobileLayout == "list"
                    ? "bg-blue-900 bg-opacity-60 focus:bg-blue-900 focus:bg-opacity-60"
                    : "bg-secondary"
                }`}
                size="xs"
                onClick={() => setMobileLayout("list")}
              >
                <LiveListIcon layout={mobileLayout} />
              </Button>
            </div>
          )}
          {cameraGroup && cameraGroup !== "default" && isTablet && (
            <div className="flex items-center gap-1">
              <Button
                className={cn(
                  "p-1",
                  isEditMode
                    ? "bg-selected text-primary"
                    : "bg-secondary text-secondary-foreground",
                )}
                size="xs"
                onClick={() =>
                  setIsEditMode((prevIsEditMode) => !prevIsEditMode)
                }
              >
                {isEditMode ? <IoClose /> : <LuLayoutDashboard />}
              </Button>
            </div>
          )}
        </div>
      )}

      {events && events.length > 0 && (
        <ScrollArea>
          <TooltipProvider>
            <div className="flex items-center gap-2 px-1">
              {events.map((event) => {
                return <AnimatedEventCard key={event.id} event={event} />;
              })}
            </div>
          </TooltipProvider>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {!cameraGroup || cameraGroup == "default" || isMobileOnly ? (
        <div
          className={cn(
            "mt-2 grid grid-cols-1 gap-2 px-2 md:gap-4",
            mobileLayout == "grid" &&
              "grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4",
            isMobile && "px-0",
          )}
        >
          {includeBirdseye && birdseyeConfig?.enabled && (
            <BirdseyeLivePlayer
              birdseyeConfig={birdseyeConfig}
              liveMode={birdseyeConfig.restream ? "mse" : "jsmpeg"}
              onClick={() => onSelectCamera("birdseye")}
            />
          )}
          {cameras.map((camera) => {
            let grow;
            const aspectRatio = camera.detect.width / camera.detect.height;
            if (aspectRatio > 2) {
              grow = `${mobileLayout == "grid" ? "col-span-2" : ""} aspect-wide`;
            } else if (aspectRatio < 1) {
              grow = `${mobileLayout == "grid" ? "row-span-2 aspect-tall md:h-full" : ""} aspect-tall`;
            } else {
              grow = "aspect-video";
            }
            return (
              <LivePlayer
                cameraRef={cameraRef}
                key={camera.name}
                className={`${grow} rounded-lg bg-black md:rounded-2xl`}
                windowVisible={
                  windowVisible && visibleCameras.includes(camera.name)
                }
                cameraConfig={camera}
                preferredLiveMode={isSafari ? "webrtc" : "mse"}
                autoLive={autoLiveView}
                onClick={() => onSelectCamera(camera.name)}
              />
            );
          })}
        </div>
      ) : (
        <DraggableGridLayout
          cameras={cameras}
          cameraGroup={cameraGroup}
          containerRef={containerRef}
          cameraRef={cameraRef}
          includeBirdseye={includeBirdseye}
          onSelectCamera={onSelectCamera}
          windowVisible={windowVisible}
          visibleCameras={visibleCameras}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
        />
      )}
    </div>
  );
}
