import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { HiDotsHorizontal } from "react-icons/hi";
import { useApiHost } from "@/api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Event } from "@/types/event";
import type { FrigateConfig } from "@/types/frigateConfig";

type EventMenuProps = {
  event: Event;
  config?: FrigateConfig;
  onOpenUpload?: (e: Event) => void;
  onOpenSimilarity?: (e: Event) => void;
};

export default function EventMenu({
  event,
  config,
  onOpenUpload,
  onOpenSimilarity,
}: EventMenuProps) {
  const apiHost = useApiHost();
  const navigate = useNavigate();
  const { t } = useTranslation("views/explore");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button
          className="mr-2 rounded p-1"
          aria-label={t("itemMenu.openMenu", { ns: "common" })}
        >
          <HiDotsHorizontal className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <a
              download
              href={
                event.has_snapshot
                  ? `${apiHost}api/events/${event.id}/snapshot.jpg`
                  : `${apiHost}api/events/${event.id}/thumbnail.webp`
              }
            >
              {t("button.download", { ns: "common" })}
            </a>
          </DropdownMenuItem>

          {event.has_snapshot &&
            event.plus_id == undefined &&
            event.data.type == "object" &&
            config?.plus?.enabled && (
              <DropdownMenuItem
                onSelect={() => {
                  onOpenUpload?.(event);
                }}
              >
                {t("itemMenu.submitToPlus.label")}
              </DropdownMenuItem>
            )}

          {event.has_snapshot && config?.semantic_search?.enabled && (
            <DropdownMenuItem
              onSelect={() => {
                if (onOpenSimilarity) onOpenSimilarity(event);
                else
                  navigate(
                    `/explore?search_type=similarity&event_id=${event.id}`,
                  );
              }}
            >
              {t("itemMenu.findSimilar.label")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
