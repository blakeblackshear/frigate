import { useCallback } from "react";
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
import useContextMenu from "@/hooks/use-contextmenu";
import { cn } from "@/lib/utils";
import { TooltipPortal } from "@radix-ui/react-tooltip";

type SearchThumbnailProps = {
  searchResult: SearchResult;
  findSimilar: () => void;
  onClick: (searchResult: SearchResult) => void;
};

export default function SearchThumbnail({
  searchResult,
  findSimilar,
  onClick,
}: SearchThumbnailProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  useContextMenu(imgRef, findSimilar);

  const handleOnClick = useCallback(() => {
    onClick(searchResult);
  }, [searchResult, onClick]);

  // date

  const formattedDate = useFormattedTimestamp(
    searchResult.start_time,
    config?.ui.time_format == "24hour" ? "%b %-d, %H:%M" : "%b %-d, %I:%M %p",
    config?.ui.timezone,
  );

  return (
    <div className="relative size-full cursor-pointer" onClick={handleOnClick}>
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
                  {
                    <>
                      <Chip
                        className={`z-0 flex items-start justify-between space-x-1 bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500`}
                        onClick={() => onClick(searchResult)}
                      >
                        {getIconForLabel(
                          searchResult.label,
                          "size-3 text-white",
                        )}
                      </Chip>
                    </>
                  }
                </div>
              </TooltipTrigger>
            </div>
            <TooltipPortal>
              <TooltipContent className="capitalize">
                {[...new Set([searchResult.label])]
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
        <div className="rounded-b-l pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[20%] w-full bg-gradient-to-t from-black/60 to-transparent">
          <div className="mx-3 flex h-full items-end justify-between pb-1 text-sm text-white">
            {searchResult.end_time ? (
              <TimeAgo time={searchResult.start_time * 1000} dense />
            ) : (
              <div>
                <ActivityIndicator size={24} />
              </div>
            )}
            {formattedDate}
          </div>
        </div>
      </div>
    </div>
  );
}
