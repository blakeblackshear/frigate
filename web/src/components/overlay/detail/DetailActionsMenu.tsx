import { useMemo, useState } from "react";
import { Event } from "@/types/event";
import { baseUrl } from "@/api/baseUrl";
import { ReviewSegment, REVIEW_PADDING } from "@/types/review";
import useSWR from "swr";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { HiDotsHorizontal } from "react-icons/hi";
import FaceSelectionDialog from "../FaceSelectionDialog";
import { SearchResult } from "@/types/search";
import { FrigateConfig } from "@/types/frigateConfig";

type Props = {
  search: SearchResult | Event;
  config?: FrigateConfig;
  setSearch?: (s: SearchResult | undefined) => void;
  setSimilarity?: () => void;
  faceNames?: string[];
  onTrainFace?: (name: string) => void;
  hasFace?: boolean;
};

export default function DetailActionsMenu({
  search,
  config,
  setSearch,
  setSimilarity,
  faceNames = [],
  onTrainFace,
  hasFace = false,
}: Props) {
  const { t } = useTranslation(["views/explore", "views/faceLibrary"]);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const clipTimeRange = useMemo(() => {
    const startTime = (search.start_time ?? 0) - REVIEW_PADDING;
    const endTime = (search.end_time ?? Date.now() / 1000) + REVIEW_PADDING;
    return `start/${startTime}/end/${endTime}`;
  }, [search]);

  const { data: reviewItem } = useSWR<ReviewSegment>([
    `review/event/${search.id}`,
  ]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger>
        <div className="rounded p-1 pr-2" role="button">
          <HiDotsHorizontal className="size-4 text-muted-foreground" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <a
              className="w-full"
              href={`${baseUrl}api/events/${search.id}/snapshot.jpg?bbox=1`}
              download={`${search.camera}_${search.label}.jpg`}
            >
              <div className="flex cursor-pointer items-center gap-2">
                <span>{t("itemMenu.downloadSnapshot.label")}</span>
              </div>
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem>
            <a
              className="w-full"
              href={`${baseUrl}api/${search.camera}/${clipTimeRange}/clip.mp4`}
              download
            >
              <div className="flex cursor-pointer items-center gap-2">
                <span>{t("itemMenu.downloadVideo.label")}</span>
              </div>
            </a>
          </DropdownMenuItem>

          {config?.semantic_search.enabled &&
            setSimilarity != undefined &&
            search.data?.type == "object" && (
              <DropdownMenuItem
                onClick={() => {
                  setIsOpen(false);
                  setTimeout(() => {
                    setSearch?.(undefined);
                    setSimilarity?.();
                  }, 0);
                }}
              >
                <div className="flex cursor-pointer items-center gap-2">
                  <span>{t("itemMenu.findSimilar.label")}</span>
                </div>
              </DropdownMenuItem>
            )}

          {reviewItem && reviewItem.id && (
            <DropdownMenuItem
              onClick={() => {
                setIsOpen(false);
                setTimeout(() => {
                  navigate(`/review?id=${reviewItem.id}`);
                }, 0);
              }}
            >
              <div className="flex cursor-pointer items-center gap-2">
                <span>{t("itemMenu.viewInHistory.label")}</span>
              </div>
            </DropdownMenuItem>
          )}

          {hasFace && onTrainFace && (
            <DropdownMenuItem asChild>
              <FaceSelectionDialog
                faceNames={faceNames}
                onTrainAttempt={onTrainFace}
              >
                <div className="flex cursor-pointer items-center gap-2">
                  <span>{t("trainFace", { ns: "views/faceLibrary" })}</span>
                </div>
              </FaceSelectionDialog>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
