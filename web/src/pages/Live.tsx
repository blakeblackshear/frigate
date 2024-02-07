import { EventThumbnail } from "@/components/image/EventThumbnail";
import LivePlayer from "@/components/player/LivePlayer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Event as FrigateEvent } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { useCallback, useMemo } from "react";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // recent events

  const { data: allEvents, mutate: updateEvents } = useSWR<FrigateEvent[]>(
    ["events", { limit: 10 }],
    { revalidateOnFocus: false, refreshInterval: 60000 }
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

  const onFavorite = useCallback(async (e: Event, event: FrigateEvent) => {
    e.stopPropagation();
    let response;
    if (!event.retain_indefinitely) {
      response = await axios.post(`events/${event.id}/retain`);
    } else {
      response = await axios.delete(`events/${event.id}/retain`);
    }
    if (response.status === 200) {
      updateEvents();
    }
  }, []);

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
          <div className="flex">
            {events.map((event) => {
              return (
                <EventThumbnail
                  key={event.id}
                  event={event}
                  onFavorite={onFavorite}
                />
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-4">
        {cameras.map((camera) => {
          let grow;
          if (camera.detect.width / camera.detect.height > 2) {
            grow = "md:col-span-2";
          } else if (camera.detect.width / camera.detect.height < 1) {
            grow = "md:row-span-2";
          } else {
            grow = "aspect-video";
          }
          return (
            <LivePlayer
              key={camera.name}
              className={`rounded-2xl bg-black ${grow}`}
              cameraConfig={camera}
              liveChips
            />
          );
        })}
      </div>
    </>
  );
}

export default Live;
