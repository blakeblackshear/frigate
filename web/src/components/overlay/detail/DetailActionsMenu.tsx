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
import { SearchResult } from "@/types/search";
import { FrigateConfig } from "@/types/frigateConfig";
import { useIsAdmin } from "@/hooks/use-is-admin";

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
}: Props) {
  const { t } = useTranslation(["views/explore", "views/faceLibrary"]);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = useIsAdmin();

  const clipTimeRange = useMemo(() => {
    const startTime = (search.start_time ?? 0) - REVIEW_PADDING;
    const endTime = (search.end_time ?? Date.now() / 1000) + REVIEW_PADDING;
    return `start/${startTime}/end/${endTime}`;
  }, [search]);

  // currently, audio event ids are not saved in review items
  const { data: reviewItem } = useSWR<ReviewSegment>(
    search.data?.type === "audio" ? null : [`review/event/${search.id}`],
  );

  // don't render menu at all if no options are available
  const hasSemanticSearchOption =
    config?.semantic_search.enabled &&
    setSimilarity !== undefined &&
    search.data?.type === "object";

  const hasReviewItem = !!(reviewItem && reviewItem.id);

  const hasAdminTriggerOption =
    isAdmin &&
    config?.semantic_search.enabled &&
    search.data?.type === "object";

  if (
    !search.has_snapshot &&
    !search.has_clip &&
    !hasSemanticSearchOption &&
    !hasReviewItem &&
    !hasAdminTriggerOption
  ) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger>
        <div className="rounded" role="button">
          <HiDotsHorizontal className="size-4 text-muted-foreground" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end">
          {search.has_snapshot && (
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
          )}
          {search.has_snapshot &&
            config?.cameras[search.camera].snapshots.clean_copy && (
              <DropdownMenuItem>
                <a
                  className="w-full"
                  href={`${baseUrl}api/events/${search.id}/snapshot-clean.webp`}
                  download={`${search.camera}_${search.label}-clean.webp`}
                >
                  <div className="flex cursor-pointer items-center gap-2">
                    <span>{t("itemMenu.downloadCleanSnapshot.label")}</span>
                  </div>
                </a>
              </DropdownMenuItem>
            )}
          {search.has_clip && (
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
          )}

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

          {isAdmin &&
            config?.semantic_search.enabled &&
            search.data.type == "object" && (
              <DropdownMenuItem
                onClick={() => {
                  setIsOpen(false);
                  setTimeout(() => {
                    navigate(
                      `/settings?page=triggers&camera=${search.camera}&event_id=${search.id}`,
                    );
                  }, 0);
                }}
              >
                <div className="flex cursor-pointer items-center gap-2">
                  <span>{t("itemMenu.addTrigger.label")}</span>
                </div>
              </DropdownMenuItem>
            )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
