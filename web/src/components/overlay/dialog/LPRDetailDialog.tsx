import { baseUrl } from "@/api/baseUrl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Event } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { FaDownload, FaPlay } from "react-icons/fa";
import { DownloadVideoButton } from "@/components/button/DownloadVideoButton";

type LPRDetailDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  event?: Event;
  config: FrigateConfig;
  lprImage: string;
};

export default function LPRDetailDialog({
  open,
  setOpen,
  event,
  config,
  lprImage,
}: LPRDetailDialogProps) {
  const timestamp = useFormattedTimestamp(
    event?.start_time ?? 0,
    config?.ui.time_format == "24hour" ? "%b %-d %Y, %H:%M" : "%b %-d %Y, %I:%M %p",
    config?.ui.timezone,
  );

  if (!event) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>License Plate Event Details</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-primary/40">Timestamp</div>
              <div className="text-sm">{timestamp}</div>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => window.open(`${baseUrl}clips/${event.camera}-${event.id}.mp4`)}
                  >
                    <FaPlay className="mr-2 size-4" />
                    Play Recording
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Play Recording</TooltipContent>
              </Tooltip>
              <DownloadVideoButton
                source={`${baseUrl}clips/${event.camera}-${event.id}.mp4`}
                camera={event.camera}
                startTime={event.start_time}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => window.open(`${baseUrl}api/events/${event.id}/snapshot.jpg`)}
                  >
                    <FaDownload className="mr-2 size-4" />
                    Download Snapshot
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download Snapshot</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-2 text-sm text-primary/40">License Plate Image</div>
              <img className="rounded-lg" src={`${baseUrl}clips/lpr/${lprImage}`} />
            </div>
            <div>
              <div className="mb-2 text-sm text-primary/40">Event Snapshot</div>
              <img 
                className="rounded-lg" 
                src={event.has_snapshot ? `${baseUrl}api/events/${event.id}/snapshot.jpg` : `${baseUrl}api/events/${event.id}/thumbnail.jpg`} 
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 