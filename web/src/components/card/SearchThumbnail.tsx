import { useCallback, useMemo, useState } from "react";
import { useApiHost } from "@/api";
import { getIconForLabel } from "@/utils/iconUtil";
import TimeAgo from "../dynamic/TimeAgo";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { isIOS, isSafari } from "react-device-detect";
import Chip from "@/components/indicators/Chip";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import useImageLoaded from "@/hooks/use-image-loaded";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ImageLoadingIndicator from "../indicators/ImageLoadingIndicator";
import ActivityIndicator from "../indicators/activity-indicator";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import { SearchResult } from "@/types/search";
import { cn } from "@/lib/utils";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LuActivity,
  LuCamera,
  LuDownload,
  LuMoreVertical,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";
import FrigatePlusIcon from "@/components/icons/FrigatePlusIcon";
import { FrigatePlusDialog } from "../overlay/dialog/FrigatePlusDialog";
import { Event } from "@/types/event";

type SearchThumbnailProps = {
  searchResult: SearchResult;
  onClick: (searchResult: SearchResult) => void;
};

export default function SearchThumbnail({
  searchResult,
  onClick,
}: SearchThumbnailProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  // interactions

  const [showFrigatePlus, setShowFrigatePlus] = useState(false);

  const handleOnClick = useCallback(() => {
    onClick(searchResult);
  }, [searchResult, onClick]);

  const objectLabel = useMemo(() => {
    if (
      !config ||
      !searchResult.sub_label ||
      !config.model.attributes_map[searchResult.label]
    ) {
      return searchResult.label;
    }

    if (
      config.model.attributes_map[searchResult.label].includes(
        searchResult.sub_label,
      )
    ) {
      return searchResult.sub_label;
    }

    return `${searchResult.label}-verified`;
  }, [config, searchResult]);

  // date

  const formattedDate = useFormattedTimestamp(
    searchResult.start_time,
    config?.ui.time_format == "24hour" ? "%b %-d, %H:%M" : "%b %-d, %I:%M %p",
    config?.ui.timezone,
  );

  return (
    <div className="relative size-full cursor-pointer" onClick={handleOnClick}>
      <FrigatePlusDialog
        upload={
          showFrigatePlus ? (searchResult as unknown as Event) : undefined
        }
        onClose={() => setShowFrigatePlus(false)}
        onEventUploaded={() => {}}
      />

      <ImageLoadingIndicator
        className="absolute inset-0"
        imgLoaded={imgLoaded}
      />
      <div className={`size-full ${imgLoaded ? "visible" : "invisible"}`}>
        <img
          ref={imgRef}
          className={cn(
            "size-full select-none object-cover object-center opacity-100 transition-opacity",
          )}
          style={
            isIOS
              ? {
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                }
              : undefined
          }
          draggable={false}
          src={`${apiHost}api/events/${searchResult.id}/thumbnail.jpg`}
          loading={isSafari ? "eager" : "lazy"}
          onLoad={() => {
            onImgLoad();
          }}
        />

        <div className="absolute left-0 top-2 z-40">
          <Tooltip>
            <div className="flex">
              <TooltipTrigger asChild>
                <div className="mx-3 pb-1 text-sm text-white">
                  <Chip
                    className={`z-0 flex items-start justify-between space-x-1 bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500`}
                    onClick={() => onClick(searchResult)}
                  >
                    {getIconForLabel(objectLabel, "size-3 text-white")}
                  </Chip>
                </div>
              </TooltipTrigger>
            </div>
            <TooltipPortal>
              <TooltipContent className="capitalize">
                {[objectLabel]
                  .filter(
                    (item) => item !== undefined && !item.includes("-verified"),
                  )
                  .map((text) => capitalizeFirstLetter(text))
                  .sort()
                  .join(", ")
                  .replaceAll("-verified", "")}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
        <div className="rounded-t-l pointer-events-none absolute inset-x-0 top-0 z-10 h-[30%] w-full bg-gradient-to-b from-black/60 to-transparent"></div>
        <div className="rounded-b-l pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[20%] items-end bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex w-full items-center justify-between bg-black/50 px-2 py-2 text-sm text-white">
            <div className="flex flex-col items-start">
              {searchResult.end_time ? (
                <TimeAgo time={searchResult.start_time * 1000} dense />
              ) : (
                <div>
                  <ActivityIndicator size={24} />
                </div>
              )}
              {formattedDate}
            </div>
            <div className="flex flex-row items-center justify-end gap-4">
              {config?.plus?.enabled && searchResult.end_time && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FrigatePlusIcon
                      className="size-5 cursor-pointer text-white"
                      onClick={() => setShowFrigatePlus(true)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>Submit to Frigate+</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger>
                  <LuSearch className="size-5 cursor-pointer text-white" />
                </TooltipTrigger>
                <TooltipContent>Find similar</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <LuMoreVertical className="size-5 cursor-pointer text-white" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <LuDownload className="mr-2 size-4" />
                    <span>Download video</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LuCamera className="mr-2 size-4" />
                    <span>Download snapshot</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LuActivity className="mr-2 size-4" />
                    <span>View object lifecycle</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LuTrash2 className="mr-2 size-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
