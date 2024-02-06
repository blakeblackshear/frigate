import { baseUrl } from "@/api/baseUrl";
import LivePlayer from "@/components/player/LivePlayer";
import Heading from "@/components/ui/heading";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { usePersistence } from "@/hooks/use-persistence";
import { Event as FrigateEvent } from "@/types/event";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { useMemo, useState } from "react";
import { LuStar } from "react-icons/lu";
import { useParams } from "react-router-dom";
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

  // camera live views

  const enabledCameras = useMemo<CameraConfig[]>(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras);
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
                    //onClick={(e: Event) => onSave(e)}
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
        {enabledCameras.map((camera) => {
          return (
            <LivePlayer
              className=" rounded-2xl overflow-hidden"
              cameraConfig={camera}
            />
          );
        })}
      </div>
    </>
  );
}

export default Live;
