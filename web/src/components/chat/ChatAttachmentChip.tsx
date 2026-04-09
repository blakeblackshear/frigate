import { useApiHost } from "@/api";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { LuX, LuExternalLink } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";
import { getTranslatedLabel } from "@/utils/i18n";

type ChatAttachmentChipProps = {
  eventId: string;
  mode: "composer" | "bubble";
  onRemove?: () => void;
};

/**
 * Small horizontal chip rendering an event as an "attachment": a thumbnail,
 * a friendly label like "Person on driveway", an optional remove X (composer
 * mode), and an external-link icon that opens the event in Explore.
 */
export function ChatAttachmentChip({
  eventId,
  mode,
  onRemove,
}: ChatAttachmentChipProps) {
  const apiHost = useApiHost();
  const { t } = useTranslation(["views/chat"]);

  const { data: eventData } = useSWR<{ label: string; camera: string }[]>(
    `event_ids?ids=${eventId}`,
  );
  const evt = eventData?.[0];
  const cameraName = useCameraFriendlyName(evt?.camera);
  const displayLabel = evt
    ? t("attachment_chip_label", {
        label: getTranslatedLabel(evt.label),
        camera: cameraName,
      })
    : eventId;

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-background/80 p-1.5 pr-2",
        mode === "bubble" && "border-primary-foreground/30 bg-transparent",
      )}
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
        <img
          className="size-full object-cover"
          src={`${apiHost}api/events/${eventId}/thumbnail.webp`}
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
      </div>
      {evt ? (
        <span
          className={cn(
            "truncate text-xs",
            mode === "bubble"
              ? "text-primary-foreground/90"
              : "text-foreground",
          )}
        >
          {displayLabel}
        </span>
      ) : (
        <ActivityIndicator className="size-4" />
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={`/explore?event_id=${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground",
              mode === "bubble" &&
                "text-primary-foreground/70 hover:text-primary-foreground",
            )}
            onClick={(e) => e.stopPropagation()}
            aria-label={t("open_in_explore")}
          >
            <LuExternalLink className="size-3.5" />
          </a>
        </TooltipTrigger>
        <TooltipContent>{t("open_in_explore")}</TooltipContent>
      </Tooltip>
      {mode === "composer" && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onRemove}
          aria-label={t("attachment_chip_remove")}
        >
          <LuX className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
