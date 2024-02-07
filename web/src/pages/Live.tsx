import { EventThumbnail } from "@/components/image/EventThumbnail";
import LivePlayer from "@/components/player/LivePlayer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Event as FrigateEvent } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // recent events

  const [recentCutoff, setRecentCutoff] = useState<number>(0);
  useEffect(() => {
    const date = new Date();
    date.setHours(date.getHours() - 4);
    setRecentCutoff(date.getTime() / 1000);

    const intervalId: NodeJS.Timeout = setInterval(() => {
      const date = new Date();
      date.setHours(date.getHours() - 4);
      setRecentCutoff(date.getTime() / 1000);
    }, 30000);
    return () => clearInterval(intervalId);
  }, [30000]);
  const { data: events, mutate: updateEvents } = useSWR<FrigateEvent[]>([
    "events",
    { limit: 10, after: recentCutoff },
  ]);

  const onFavorite = useCallback(
    async (e: Event, event: FrigateEvent) => {
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
    },
    [event]
  );

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

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {cameras.map((camera) => {
          return (
            <LivePlayer
              key={camera.name}
              className="rounded-2xl bg-black h-[428px]"
              cameraConfig={camera}
            />
          );
        })}
      </div>
    </>
  );
}

export default Live;
