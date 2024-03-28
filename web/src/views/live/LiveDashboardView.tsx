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
import { isDesktop, isMobile, isSafari } from "react-device-detect";
import useSWR from "swr";

type LiveDashboardViewProps = {
  cameras: CameraConfig[];
  includeBirdseye: boolean;
  onSelectCamera: (camera: string) => void;
};
export default function LiveDashboardView({
  cameras,
  includeBirdseye,
  onSelectCamera,
}: LiveDashboardViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // layout

  const [layout, setLayout] = usePersistence<"grid" | "list">(
    "live-layout",
    isDesktop ? "grid" : "list",
  );

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
    if (eventUpdate.type == "end" && eventUpdate.review.severity == "alert") {
      setTimeout(() => updateEvents(), 1000);
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
    <div className="size-full overflow-y-auto">
      {isMobile && (
        <div className="h-11 px-2 relative flex items-center justify-between">
          <Logo className="absolute inset-x-1/2 -translate-x-1/2 h-8" />
          <CameraGroupSelector />
          <div className="flex items-center gap-1">
            <Button
              className={`p-1 ${
                layout == "grid"
                  ? "bg-blue-900 focus:bg-blue-900 bg-opacity-60 focus:bg-opacity-60"
                  : "bg-muted"
              }`}
              size="xs"
              onClick={() => setLayout("grid")}
            >
              <LiveGridIcon layout={layout} />
            </Button>
            <Button
              className={`p-1 ${
                layout == "list"
                  ? "bg-blue-900 focus:bg-blue-900 bg-opacity-60 focus:bg-opacity-60"
                  : "bg-muted"
              }`}
              size="xs"
              onClick={() => setLayout("list")}
            >
              <LiveListIcon layout={layout} />
            </Button>
          </div>
        </div>
      )}

      {events && events.length > 0 && (
        <ScrollArea>
          <TooltipProvider>
            <div className="flex gap-2 items-center">
              {events.map((event) => {
                return <AnimatedEventCard key={event.id} event={event} />;
              })}
            </div>
          </TooltipProvider>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <div
        className={`mt-2 px-2 grid ${layout == "grid" ? "grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4" : ""} gap-2 md:gap-4 *:rounded-2xl *:bg-black`}
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
            grow = `${layout == "grid" ? "col-span-2" : ""} aspect-wide`;
          } else if (aspectRatio < 1) {
            grow = `${layout == "grid" ? "row-span-2 aspect-tall md:h-full" : ""} aspect-tall`;
          } else {
            grow = "aspect-video";
          }
          return (
            <LivePlayer
              cameraRef={cameraRef}
              key={camera.name}
              className={grow}
              windowVisible={
                windowVisible && visibleCameras.includes(camera.name)
              }
              cameraConfig={camera}
              preferredLiveMode={isSafari ? "webrtc" : "mse"}
              onClick={() => onSelectCamera(camera.name)}
            />
          );
        })}
      </div>
    </div>
  );
}
