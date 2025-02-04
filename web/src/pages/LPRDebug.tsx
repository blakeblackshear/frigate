import { baseUrl } from "@/api/baseUrl";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import LPRDetailDialog from "@/components/overlay/dialog/LPRDetailDialog";
import { Button } from "@/components/ui/button";
import { CamerasFilterButton } from "@/components/filter/CamerasFilterButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FrigateConfig } from "@/types/frigateConfig";
import { Event } from "@/types/event";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { LuArrowDownUp, LuTrash2 } from "react-icons/lu";
import axios from "axios";
import { toast } from "sonner";

type SortOption = "score_desc" | "score_asc" | "time_desc" | "time_asc";

export default function LPRDebug() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [sortBy, setSortBy] = useState<SortOption>("time_desc");
  const [selectedCameras, setSelectedCameras] = useState<string[] | undefined>();

  // title
  useEffect(() => {
    document.title = "LPR - Frigate";
  }, []);

  // lpr data
  const { data: lprData, mutate: refreshLPR } = useSWR("lpr/debug");

  const lprAttempts = useMemo<string[]>(() => {
    if (!lprData) return [];
    
    const attempts = Object.keys(lprData).filter((attempt) => attempt != "train");
    
    // Get all events first to access their scores and cameras
    const eventScores = new Map<string, number>();
    const eventCameras = new Map<string, string>();
    attempts.forEach((attempt) => {
      const parts = attempt.split("-");
      const eventId = `${parts[0]}-${parts[1]}`;
      const event = lprData[eventId];
      if (event?.data?.sub_label_score) {
        eventScores.set(attempt, event.data.sub_label_score);
      }
      if (event?.camera) {
        eventCameras.set(attempt, event.camera);
      }
    });
    
    // Filter by selected cameras if any
    const filteredAttempts = selectedCameras?.length
      ? attempts.filter((attempt) => {
          const camera = eventCameras.get(attempt);
          return camera && selectedCameras.includes(camera);
        })
      : attempts;
    
    return filteredAttempts.sort((a, b) => {
      const scoreA = eventScores.get(a) || 0;
      const scoreB = eventScores.get(b) || 0;
      
      switch (sortBy) {
        case "score_desc":
          return scoreB - scoreA;
        case "score_asc":
          return scoreA - scoreB;
        case "time_desc":
          // For time sorting, we'll use the file creation order (default order)
          return b.localeCompare(a);
        case "time_asc":
          return a.localeCompare(b);
        default:
          return 0;
      }
    });
  }, [lprData, sortBy, selectedCameras]);

  const cameras = useMemo(() => {
    if (!config) return [];
    return Object.keys(config.cameras);
  }, [config]);

  const cameraGroups = useMemo(() => {
    if (!config?.camera_groups) return [];
    return Object.entries(config.camera_groups);
  }, [config]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster />
      <div className="relative mb-2 flex h-11 w-full items-center justify-between">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex flex-row">
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <CamerasFilterButton
            allCameras={cameras}
            groups={cameraGroups}
            selectedCameras={selectedCameras}
            updateCameraFilter={setSelectedCameras}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex gap-2" variant={sortBy !== "time_desc" ? "select" : "default"}>
                <LuArrowDownUp className="size-5" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSortBy("score_desc")} className={sortBy === "score_desc" ? "bg-accent" : ""}>
                Ascending Score
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("score_asc")} className={sortBy === "score_asc" ? "bg-accent" : ""}>
                Descending Score
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("time_desc")} className={sortBy === "time_desc" ? "bg-accent" : ""}>
                Most Recent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("time_asc")} className={sortBy === "time_asc" ? "bg-accent" : ""}>
                Oldest First
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="scrollbar-container grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 overflow-y-auto">
        {lprAttempts.map((attempt: string) => (
          <LPRAttempt 
            key={attempt} 
            attempt={attempt} 
            config={config} 
            onRefresh={refreshLPR}
          />
        ))}
      </div>
    </div>
  );
}

type LPRAttemptProps = {
  attempt: string;
  config: FrigateConfig;
  onRefresh: () => void;
};

function LPRAttempt({ attempt, config, onRefresh }: LPRAttemptProps) {
  const [showDialog, setShowDialog] = useState(false);
  const data = useMemo(() => {
    const parts = attempt.split("_");
    return {
      plate: parts[0] || "Text not extracted",
      score: parts[1] || "0",
      eventId: parts[2]?.replace(".jpg", "") || null,
    };
  }, [attempt]);

  const { data: event } = useSWR<Event>(
    data.eventId ? ["event", { id: data.eventId }] : null
  );

  const timestamp = useFormattedTimestamp(
    event?.start_time ?? 0,
    config?.ui.time_format == "24hour" ? "%b %-d %Y, %H:%M" : "%b %-d %Y, %I:%M %p",
    config?.ui.timezone,
  );

  const onDelete = useCallback(() => {
    axios
      .post(`/lpr/debug/delete`, { ids: [attempt] })
      .then((resp) => {
        if (resp.status == 200) {
          toast.success(`Successfully deleted LPR debug image.`, {
            position: "top-center",
          });
          onRefresh();
        }
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          toast.error(`Failed to delete: ${error.response.data.message}`, {
            position: "top-center",
          });
        } else {
          toast.error(`Failed to delete: ${error.message}`, {
            position: "top-center",
          });
        }
      });
  }, [attempt, onRefresh]);

  // Extract event ID from processed image filename (format: PLATE_SCORE_EVENTID.jpg)
  const eventId = useMemo(() => attempt.split("_").slice(2).join("_").replace(".jpg", ""), [attempt]);

  return (
    <>
      <LPRDetailDialog
        open={showDialog}
        setOpen={setShowDialog}
        event={event}
        config={config}
        lprImage={attempt}
        rawImage={`raw_${eventId}.jpg`}
      />

      <div className="relative flex flex-col rounded-lg">
        <div 
          className="w-full overflow-hidden rounded-t-lg border border-t-0 *:text-card-foreground cursor-pointer"
          onClick={() => setShowDialog(true)}
        >
          <div className="aspect-[2/1] flex items-center justify-center bg-black">
            <img 
              className="h-40 max-w-none" 
              src={`${baseUrl}clips/lpr/${attempt}`} 
            />
          </div>
        </div>
        <div className="flex w-full grow items-center justify-between rounded-b-lg border border-t-0 bg-card p-3 text-card-foreground">
          <div className="flex flex-col items-start text-xs text-primary-variant">
            <div className="capitalize">{data.plate}</div>
            <div className="text-success">
              {data.score === "0" || !data.score ? "No score" : `${data.score}%`}
            </div>
            {event && (
              <div className="text-xs text-muted-foreground">
                {timestamp}
              </div>
            )}
          </div>
          <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
            <Tooltip>
              <TooltipTrigger>
                <LuTrash2
                  className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                  onClick={onDelete}
                />
              </TooltipTrigger>
              <TooltipContent>Delete Image</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  );
} 