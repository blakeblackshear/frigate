import { useCallback, useMemo } from "react";
import { useApiHost } from "@/api";
import { getIconForLabel } from "@/utils/iconUtil";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { isIOS, isSafari } from "react-device-detect";
import Chip from "@/components/indicators/Chip";
import useImageLoaded from "@/hooks/use-image-loaded";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ImageLoadingIndicator from "../indicators/ImageLoadingIndicator";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import { SearchResult } from "@/types/search";
import { cn } from "@/lib/utils";
import { TooltipPortal } from "@radix-ui/react-tooltip";

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
                  <Chip
                    className={`z-0 flex items-center justify-between gap-1 space-x-1 bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500 text-xs`}
                    onClick={() => onClick(searchResult)}
                  >
                    {getIconForLabel(objectLabel, "size-3 text-white")}
                    {Math.floor(
                      searchResult.score ?? searchResult.data.top_score * 100,
                    )}
                    %
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
        <div className="rounded-b-l pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[20%] items-end bg-gradient-to-t from-black/60 to-transparent"></div>
      </div>
    </div>
  );
}
