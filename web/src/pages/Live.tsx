import { AnimatedEventThumbnail } from "@/components/image/AnimatedEventThumbnail";
import LivePlayer from "@/components/player/LivePlayer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Event as FrigateEvent } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // recent events

  const { data: allEvents } = useSWR<FrigateEvent[]>(
    ["events", { limit: 10 }],
    { refreshInterval: 60000 }
  );

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

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  return (
    <>
      {events && events.length > 0 && (
        <ScrollArea>
          <TooltipProvider>
            <div className="flex">
              {events.map((event) => {
                return <AnimatedEventThumbnail key={event.id} event={event} />;
              })}
            </div>
          </TooltipProvider>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <div className="mt-4 md:grid md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-4">
        {cameras.map((camera) => {
          let grow;
          let aspectRatio = camera.detect.width / camera.detect.height;
          if (aspectRatio > 2) {
            grow = "md:col-span-2 aspect-wide";
          } else if (aspectRatio < 1) {
            grow = `md:row-span-2 aspect-[8/9] md:h-full`;
          } else {
            grow = "aspect-video";
          }
          return (
            <LivePlayer
              key={camera.name}
              className={`mb-2 md:mb-0 rounded-2xl bg-black ${grow}`}
              cameraConfig={camera}
              preferredLiveMode="mse"
            />
          );
        })}
      </div>
    </>
  );
}

export default Live;
