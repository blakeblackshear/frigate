import { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useApiHost } from "@/api";
import type { SearchResult } from "@/types/search";
import { ObjectPath } from "./ObjectPath";
import type { FrigateConfig } from "@/types/frigateConfig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useTimezone } from "@/hooks/use-date-utils";
import { Button } from "@/components/ui/button";
import { LuX } from "react-icons/lu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function ObjectPathPlotter() {
  const apiHost = useApiHost();
  const [timeRange, setTimeRange] = useState("1d");
  const { data: config } = useSWR<FrigateConfig>("config");
  const imgRef = useRef<HTMLImageElement>(null);
  const timezone = useTimezone(config);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<SearchResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 20;

  useEffect(() => {
    if (config && !selectedCamera) {
      setSelectedCamera(Object.keys(config.cameras)[0]);
    }
  }, [config, selectedCamera]);

  const searchQuery = useMemo(() => {
    if (!selectedCamera) return null;
    return [
      "events",
      {
        cameras: selectedCamera,
        after: Math.floor(Date.now() / 1000) - getTimeRangeInSeconds(timeRange),
        before: Math.floor(Date.now() / 1000),
        has_clip: 1,
        include_thumbnails: 0,
        limit: 1000,
        timezone,
      },
    ];
  }, [selectedCamera, timeRange, timezone]);

  const { data: events } = useSWR<SearchResult[]>(searchQuery);

  const aspectRatio = useMemo(() => {
    if (!config || !selectedCamera) return 16 / 9;
    return (
      config.cameras[selectedCamera].detect.width /
      config.cameras[selectedCamera].detect.height
    );
  }, [config, selectedCamera]);

  const pathPoints = useMemo(() => {
    if (!events) return [];
    return events.flatMap(
      (event) =>
        event.data.path_data?.map(
          ([coords, timestamp]: [number[], number]) => ({
            x: coords[0],
            y: coords[1],
            timestamp,
            event,
          }),
        ) || [],
    );
  }, [events]);

  const getRandomColor = () => {
    return [
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
    ];
  };

  const eventColors = useMemo(() => {
    if (!events) return {};
    return events.reduce(
      (acc, event) => {
        acc[event.id] = getRandomColor();
        return acc;
      },
      {} as Record<string, number[]>,
    );
  }, [events]);

  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!selectedCamera) return;
    const img = new Image();
    img.src = selectedEvent
      ? `${apiHost}api/${selectedCamera}/recordings/${selectedEvent.start_time}/snapshot.jpg`
      : `${apiHost}api/${selectedCamera}/latest.jpg?h=500`;
    img.onload = () => {
      if (imgRef.current) {
        imgRef.current.src = img.src;
        setImageLoaded(true);
      }
    };
  }, [apiHost, selectedCamera, selectedEvent]);

  const handleEventClick = (event: SearchResult) => {
    setSelectedEvent(event.id === selectedEvent?.id ? null : event);
  };

  const clearSelectedEvent = () => {
    setSelectedEvent(null);
  };

  const totalPages = Math.ceil((events?.length || 0) / eventsPerPage);
  const paginatedEvents = events?.slice(
    (currentPage - 1) * eventsPerPage,
    currentPage * eventsPerPage,
  );

  return (
    <Card className="p-4">
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Tracked Object Paths</h2>
          <div className="flex space-x-2">
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent>
                {config &&
                  Object.keys(config.cameras).map((cameraName) => (
                    <SelectItem key={cameraName} value={cameraName}>
                      {cameraName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last 1 hour</SelectItem>
                <SelectItem value="6h">Last 6 hours</SelectItem>
                <SelectItem value="12h">Last 12 hours</SelectItem>
                <SelectItem value="1d">Last 24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="relative" style={{ aspectRatio }}>
          <img
            ref={imgRef}
            src="/placeholder.svg"
            alt={`Latest from ${selectedCamera}`}
            className="h-auto w-full"
          />
          {imgRef.current && imageLoaded && (
            <svg
              viewBox={`0 0 ${imgRef.current.width} ${imgRef.current.height}`}
              className="absolute inset-0"
            >
              {events?.map((event) => (
                <ObjectPath
                  key={event.id}
                  positions={pathPoints.filter(
                    (point) => point.event.id === event.id,
                  )}
                  color={eventColors[event.id]}
                  width={2}
                  imgRef={imgRef}
                  visible={
                    selectedEvent === null || selectedEvent.id === event.id
                  }
                />
              ))}
            </svg>
          )}
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Legend</h3>
            {selectedEvent && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelectedEvent}
                className="flex items-center"
              >
                <LuX className="mr-1" /> Clear Selection
              </Button>
            )}
          </div>
          <div className="mb-4 grid grid-cols-2 gap-1">
            {paginatedEvents?.map((event) => (
              <div
                key={event.id}
                className={`flex cursor-pointer items-center rounded p-1 ${
                  selectedEvent?.id === event.id ? "bg-secondary" : ""
                }`}
                onClick={() => handleEventClick(event)}
              >
                <div
                  className="mr-2 h-4 w-4 flex-shrink-0"
                  style={{
                    backgroundColor: `rgb(${eventColors[event.id].join(",")})`,
                  }}
                />
                <span className="text-sm">
                  <strong className="mr-1 capitalize">{event.label}</strong>
                  {formatUnixTimestampToDateTime(event.start_time, {
                    timezone: config?.ui.timezone,
                  })}
                </span>
              </div>
            ))}
          </div>
          <Pagination>
            <PaginationContent className="cursor-pointer">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                />
              </PaginationItem>
              {[...Array(totalPages)].map((_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    onClick={() => setCurrentPage(index + 1)}
                    isActive={currentPage === index + 1}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeRangeInSeconds(range: string): number {
  switch (range) {
    case "1h":
      return 60 * 60;
    case "6h":
      return 6 * 60 * 60;
    case "12h":
      return 12 * 60 * 60;
    case "1d":
      return 24 * 60 * 60;
    default:
      return 24 * 60 * 60;
  }
}
