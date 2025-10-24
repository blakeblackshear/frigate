import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { HiDotsHorizontal } from "react-icons/hi";
import { useApiHost } from "@/api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Event } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";

type EventMenuProps = {
  event: Event;
  config?: FrigateConfig;
  onOpenUpload?: (e: Event) => void;
  onOpenSimilarity?: (e: Event) => void;
  selectedObjectId?: string;
  setSelectedObjectId?: (event: Event | undefined) => void;
};

export default function EventMenu({
  event,
  config,
  onOpenUpload,
  onOpenSimilarity,
  selectedObjectId,
  setSelectedObjectId,
}: EventMenuProps) {
  const apiHost = useApiHost();
  const navigate = useNavigate();
  const { t } = useTranslation("views/explore");

  const handleObjectSelect = () => {
    if (event.id === selectedObjectId) {
      setSelectedObjectId?.(undefined);
    } else {
      setSelectedObjectId?.(event);
    }
  };

  return (
    <>
      <span tabIndex={0} className="sr-only" />
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="rounded p-1 pr-2" role="button">
            <HiDotsHorizontal className="size-4 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={handleObjectSelect}>
              {event.id === selectedObjectId
                ? t("itemMenu.hideObjectDetails.label")
                : t("itemMenu.showObjectDetails.label")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-0.5" />
            <DropdownMenuItem
              onSelect={() => {
                navigate(`/explore?event_id=${event.id}`);
              }}
            >
              {t("details.item.button.viewInExplore")}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                download
                href={
                  event.has_snapshot
                    ? `${apiHost}api/events/${event.id}/snapshot.jpg`
                    : `${apiHost}api/events/${event.id}/thumbnail.webp`
                }
              >
                {t("itemMenu.downloadSnapshot.label")}
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
    </>
  );
}
