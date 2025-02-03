import { baseUrl } from "@/api/baseUrl";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import LPRDetailDialog from "@/components/overlay/dialog/LPRDetailDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { FrigateConfig } from "@/types/frigateConfig";
import { Event } from "@/types/event";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";

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
          <LPRAttempt key={attempt} attempt={attempt} config={config} />
        ))}
      </div>
    </div>
  );
}

type LPRAttemptProps = {
  attempt: string;
  config: FrigateConfig;
};

function LPRAttempt({ attempt, config }: LPRAttemptProps) {
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

  return (
    <>
      <LPRDetailDialog
        open={showDialog}
        setOpen={setShowDialog}
        event={event}
        config={config}
        lprImage={attempt}
      />

      <div 
        className="relative flex cursor-pointer flex-col rounded-lg hover:opacity-90"
        onClick={() => setShowDialog(true)}
      >
        <div className="w-full overflow-hidden rounded-t-lg border border-t-0 *:text-card-foreground">
          <img className="h-40" src={`${baseUrl}clips/lpr/${attempt}`} />
        </div>
        <div className="rounded-b-lg bg-card p-2">
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-col items-start text-xs text-primary-variant">
              <div className="capitalize">{data.plate}</div>
              <div className="text-success">
                {Number.parseFloat(data.score) * 100}%
              </div>
            </div>
            {event && (
              <div className="text-xs text-muted-foreground">
                {timestamp}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 