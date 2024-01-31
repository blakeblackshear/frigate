import { useApiHost } from "@/api";
import { Card } from "../ui/card";
import { Event as FrigateEvent } from "@/types/event";
import { LuClock, LuStar } from "react-icons/lu";
import { useCallback } from "react";
import TimeAgo from "../dynamic/TimeAgo";
import { HiOutlineVideoCamera } from "react-icons/hi";
import { MdOutlineLocationOn } from "react-icons/md";
import axios from "axios";

type MiniEventCardProps = {
  event: FrigateEvent;
  onUpdate?: () => void;
};

export default function MiniEventCard({ event, onUpdate }: MiniEventCardProps) {
  const baseUrl = useApiHost();
  const onSave = useCallback(
    async (e: Event) => {
      e.stopPropagation();
      let response;
      if (!event.retain_indefinitely) {
        response = await axios.post(`events/${event.id}/retain`);
      } else {
        response = await axios.delete(`events/${event.id}/retain`);
      }
      if (response.status === 200 && onUpdate) {
        onUpdate();
      }
    },
    [event]
  );

  return (
    <Card className="mr-2 min-w-[260px] max-w-[320px]">
      <div className="flex">
        <div
          className="relative rounded-l min-w-[125px] h-[125px] bg-contain bg-no-repeat bg-center"
          style={{
            backgroundImage: `url(${baseUrl}api/events/${event.id}/thumbnail.jpg)`,
          }}
        >
          <LuStar
            className="h-6 w-6 text-yellow-300 absolute top-1 right-1 cursor-pointer"
            onClick={(e: Event) => onSave(e)}
            fill={event.retain_indefinitely ? "currentColor" : "none"}
          />
          {event.end_time ? null : (
            <div className="bg-slate-300 dark:bg-slate-700 absolute bottom-0 text-center w-full uppercase text-sm rounded-bl">
              In progress
            </div>
          )}
        </div>
        <div className="p-1 flex flex-col justify-between">
          <div className="capitalize text-lg font-bold">
            {event.label.replaceAll("_", " ")}
            {event.sub_label
              ? `: ${event.sub_label.replaceAll("_", " ")}`
              : null}
          </div>
          <div>
            <div className="text-sm flex">
              <LuClock className="h-4 w-4 mr-2 inline" />
              <div>
                <TimeAgo time={event.start_time * 1000} dense />
              </div>
            </div>
            <div className="capitalize text-sm flex align-center mt-1 whitespace-nowrap">
              <HiOutlineVideoCamera className="h-4 w-4 mr-2 inline" />
              {event.camera.replaceAll("_", " ")}
            </div>
            {event.zones.length ? (
              <div className="capitalize whitespace-nowrap text-sm flex align-center">
                <MdOutlineLocationOn className="w-4 h-4 mr-2 inline" />
                {event.zones.join(", ").replaceAll("_", " ")}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
