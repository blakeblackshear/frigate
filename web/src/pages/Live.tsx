import { baseUrl } from "@/api/baseUrl";
import LivePlayer from "@/components/player/LivePlayer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Event as FrigateEvent } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { useCallback, useMemo } from "react";
import { LuStar } from "react-icons/lu";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // recent events

  const now = new Date();
  now.setHours(now.getHours() - 4, 0, 0, 0);
  const recentTimestamp = now.getTime() / 1000;
  const { data: events, mutate: updateEvents } = useSWR<FrigateEvent[]>([
    "events",
    { limit: 10, after: recentTimestamp },
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
                <div
                  className="relative rounded min-w-[125px] h-[125px] bg-contain bg-no-repeat bg-center mr-4"
                  style={{
                    backgroundImage: `url(${baseUrl}api/events/${event.id}/thumbnail.jpg)`,
                  }}
                >
                  <LuStar
                    className="h-6 w-6 text-yellow-300 absolute top-1 right-1 cursor-pointer"
                    onClick={(e: Event) => onFavorite(e, event)}
                    fill={event.retain_indefinitely ? "currentColor" : "none"}
                  />
                  {event.end_time ? null : (
                    <div className="bg-slate-300 dark:bg-slate-700 absolute bottom-0 text-center w-full uppercase text-sm rounded-bl">
                      In progress
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {cameras.map((camera) => {
          return <LivePlayer className=" rounded-2xl" cameraConfig={camera} />;
        })}
      </div>
    </>
  );
}

export default Live;
