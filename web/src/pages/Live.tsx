import { useFrigateEvents } from "@/api/ws";
import { AnimatedEventThumbnail } from "@/components/image/AnimatedEventThumbnail";
import LivePlayer from "@/components/player/LivePlayer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Event as FrigateEvent } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // recent events
  const { payload: eventUpdate } = useFrigateEvents();
  const { data: allEvents, mutate: updateEvents } = useSWR<FrigateEvent[]>(
    ["events", { limit: 10 }],
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!eventUpdate) {
      return;
    }

    // if event is ended and was saved, update events list
    if (
      eventUpdate.type == "end" &&
      (eventUpdate.after.has_clip || eventUpdate.after.has_snapshot)
    ) {
      updateEvents();
      return;
    }

    // if event is updated and has become a saved event, update events list
    if (
      !(eventUpdate.before.has_clip || eventUpdate.before.has_snapshot) &&
      (eventUpdate.after.has_clip || eventUpdate.after.has_snapshot)
    ) {
      updateEvents();
    }
  }, [eventUpdate]);

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

  const [windowVisible, setWindowVisible] = useState(true);
  const visibilityListener = useCallback(() => {
    setWindowVisible(document.visibilityState == "visible");
  }, []);

  useEffect(() => {
    addEventListener("visibilitychange", visibilityListener);

    return () => {
      removeEventListener("visibilitychange", visibilityListener);
    };
  }, []);

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
            grow = `md:row-span-2 aspect-tall md:h-full`;
          } else {
            grow = "aspect-video";
          }
          return (
            <LivePlayer
              key={camera.name}
              className={`mb-2 md:mb-0 rounded-2xl bg-black ${grow}`}
              windowVisible={windowVisible}
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
