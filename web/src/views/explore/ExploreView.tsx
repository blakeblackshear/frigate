import { Event } from "@/types/event";
import { useEffect, useMemo, useState } from "react";
import { isIOS } from "react-device-detect";
import useSWR from "swr";
import { useApiHost } from "@/api";
import { cn } from "@/lib/utils";
import { LuArrowRightCircle } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";

export default function ImageAccordion() {
  // title

  useEffect(() => {
    document.title = "Explore - Frigate";
  }, []);

  // data

  const { data: events } = useSWR<Event[]>(
    [
      "events",
      {
        limit: 100,
      },
    ],
    {
      revalidateOnFocus: false,
    },
  );

  const eventsByLabel = useMemo(() => {
    if (!events) return {};
    return events.reduce<Record<string, Event[]>>((acc, event) => {
      const label = event.label || "Unknown";
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(event);
      return acc;
    }, {});
  }, [events]);

  return (
    <div className="space-y-4 overflow-x-hidden p-2">
      {Object.entries(eventsByLabel).map(([label, filteredEvents]) => (
        <ThumbnailRow key={label} events={filteredEvents} objectType={label} />
      ))}
    </div>
  );
}

function ThumbnailRow({
  objectType,
  events,
}: {
  objectType: string;
  events?: Event[];
}) {
  const apiHost = useApiHost();
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleSearch = (label: string) => {
    const similaritySearchParams = new URLSearchParams({
      labels: label,
    }).toString();
    navigate(`/explore?${similaritySearchParams}`);
  };

  return (
    <div className="space-y-2">
      <h2 className="text-lg capitalize">{objectType}</h2>
      <div className="flex flex-row items-center space-x-2 p-2">
        {events?.map((event, index) => (
          <div
            key={event.id}
            className="relative aspect-square h-[50px] w-full max-w-[50px] md:h-[120px] md:max-w-[120px]"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <img
              className={cn(
                "absolute h-full w-full rounded-lg object-cover transition-all duration-300 ease-in-out md:rounded-2xl",
                hoveredIndex === index ? "z-10 scale-110" : "scale-100",
              )}
              style={
                isIOS
                  ? {
                      WebkitUserSelect: "none",
                      WebkitTouchCallout: "none",
                    }
                  : undefined
              }
              draggable={false}
              src={
                event.has_snapshot
                  ? `${apiHost}api/events/${event.id}/snapshot.jpg`
                  : `${apiHost}api/events/${event.id}/thumbnail.jpg`
              }
              alt={`${objectType} snapshot`}
            />
          </div>
        ))}
        <div
          className="flex cursor-pointer items-center justify-center"
          onClick={() => handleSearch(objectType)}
        >
          <Tooltip>
            <TooltipTrigger>
              <LuArrowRightCircle
                className="text-secondary-foreground"
                size={24}
              />
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent className="capitalize">
                Explore More {objectType}s
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
