import { baseUrl } from "@/api/baseUrl";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import LPRDetailDialog from "@/components/overlay/dialog/LPRDetailDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FrigateConfig } from "@/types/frigateConfig";
import { Event } from "@/types/event";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { LuTrash2 } from "react-icons/lu";
import axios from "axios";
import { toast } from "sonner";

export default function LPRDebug() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // title
  useEffect(() => {
    document.title = "LPR - Frigate";
  }, []);

  // lpr data
  const { data: lprData, mutate: refreshLPR } = useSWR("lpr/debug");

  const lprAttempts = useMemo<string[]>(
    () => (lprData ? Object.keys(lprData).filter((attempt) => attempt != "train") : []),
    [lprData],
  );

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster />
      <div className="relative mb-2 flex h-11 w-full items-center justify-between">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex flex-row">
            <div className="text-lg font-semibold">License Plate Recognition</div>
          </div>
        </ScrollArea>
      </div>
      <div className="scrollbar-container flex flex-wrap gap-2 overflow-y-scroll">
        {lprAttempts.map((attempt: string) => (
          <LPRAttempt key={attempt} attempt={attempt} config={config} onRefresh={refreshLPR} />
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
    const parts = attempt.split("-");
    return {
      eventId: `${parts[0]}-${parts[1]}`,
      plate: parts[2] || "Text not extracted",
      score: parts[3] || "0",
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

  return (
    <>
      <LPRDetailDialog
        open={showDialog}
        setOpen={setShowDialog}
        event={event}
        config={config}
        lprImage={attempt}
      />

      <div className="relative flex flex-col rounded-lg">
        <div 
          className="w-full cursor-pointer overflow-hidden rounded-t-lg border border-t-0 *:text-card-foreground hover:opacity-90"
          onClick={() => setShowDialog(true)}
        >
          <img className="h-40" src={`${baseUrl}clips/lpr/${attempt}`} />
        </div>
        <div className="rounded-b-lg bg-card p-2">
          <div className="flex w-full flex-row items-center justify-between gap-2">
            <div className="flex flex-col items-start text-xs text-primary-variant">
              <div className="capitalize">{data.plate}</div>
              <div className="text-success">
                {Number.parseFloat(data.score) * 100}%
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
      </div>
    </>
  );
} 