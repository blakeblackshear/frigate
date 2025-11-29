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
import { useState } from "react";
import { useIsAdmin } from "@/hooks/use-is-admin";

type EventMenuProps = {
  event: Event;
  config?: FrigateConfig;
  onOpenUpload?: (e: Event) => void;
  onOpenSimilarity?: (e: Event) => void;
  isSelected?: boolean;
  onToggleSelection?: (event: Event | undefined) => void;
};

export default function EventMenu({
  event,
  config,
  onOpenUpload,
  onOpenSimilarity,
  isSelected = false,
  onToggleSelection,
}: EventMenuProps) {
  const apiHost = useApiHost();
  const navigate = useNavigate();
  const { t } = useTranslation("views/explore");
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = useIsAdmin();

  const handleObjectSelect = () => {
    if (isSelected) {
      onToggleSelection?.(undefined);
    } else {
      onToggleSelection?.(event);
    }
  };

  return (
    <>
      <span tabIndex={0} className="sr-only" />
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger>
          <div className="rounded p-1 pr-2" role="button">
            <HiDotsHorizontal className="size-4 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={handleObjectSelect}
            >
              {isSelected
                ? t("itemMenu.hideObjectDetails.label")
                : t("itemMenu.showObjectDetails.label")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-0.5" />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => {
                navigate(`/explore?event_id=${event.id}`);
              }}
            >
              {t("details.item.button.viewInExplore")}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
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

            {isAdmin &&
              event.has_snapshot &&
              event.plus_id == undefined &&
              event.data.type == "object" &&
              config?.plus?.enabled && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => {
                    setIsOpen(false);
                    onOpenUpload?.(event);
                  }}
                >
                  {t("itemMenu.submitToPlus.label")}
                </DropdownMenuItem>
              )}

            {event.has_snapshot && config?.semantic_search?.enabled && (
              <DropdownMenuItem
                className="cursor-pointer"
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
