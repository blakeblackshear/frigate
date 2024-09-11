import { useEffect, useMemo } from "react";
import { isIOS, isMobileOnly, isSafari } from "react-device-detect";
import useSWR from "swr";
import { useApiHost } from "@/api";
import { cn } from "@/lib/utils";
import { LuArrowRightCircle } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { SearchResult } from "@/types/search";
import ImageLoadingIndicator from "@/components/indicators/ImageLoadingIndicator";
import useImageLoaded from "@/hooks/use-image-loaded";
import ActivityIndicator from "@/components/indicators/activity-indicator";

type ExploreViewProps = {
  onSelectSearch: (searchResult: SearchResult) => void;
};

export default function ExploreView({ onSelectSearch }: ExploreViewProps) {
  // title

  useEffect(() => {
    document.title = "Explore - Frigate";
  }, []);

  // data

  const { data: events } = useSWR<SearchResult[]>(
    [
      "events/explore",
      {
        limit: isMobileOnly ? 5 : 10,
      },
    ],
    {
      revalidateOnFocus: false,
    },
  );

  const eventsByLabel = useMemo(() => {
    if (!events) return {};
    return events.reduce<Record<string, SearchResult[]>>((acc, event) => {
      const label = event.label || "Unknown";
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(event);
      return acc;
    }, {});
  }, [events]);

  if (!events) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  return (
    <div className="scrollbar-container mx-2 space-y-4 overflow-x-hidden">
      {Object.entries(eventsByLabel).map(([label, filteredEvents]) => (
        <ThumbnailRow
          key={label}
          searchResults={filteredEvents}
          objectType={label}
          onSelectSearch={onSelectSearch}
        />
      ))}
    </div>
  );
}

type ThumbnailRowType = {
  objectType: string;
  searchResults?: SearchResult[];
  onSelectSearch: (searchResult: SearchResult) => void;
};

function ThumbnailRow({
  objectType,
  searchResults,
  onSelectSearch,
}: ThumbnailRowType) {
  const navigate = useNavigate();

  const handleSearch = (label: string) => {
    const similaritySearchParams = new URLSearchParams({
      labels: label,
    }).toString();
    navigate(`/explore?${similaritySearchParams}`);
  };

  return (
    <div className="rounded-lg bg-background_alt p-2 md:p-4">
      <div className="text-lg capitalize">
        {objectType.replaceAll("_", " ")}
        {searchResults && (
          <span className="ml-3 text-sm text-secondary-foreground">
            (
            {
              // @ts-expect-error we know this is correct
              searchResults[0].event_count
            }{" "}
            detected objects){" "}
          </span>
        )}
      </div>
      <div className="flex flex-row items-center space-x-2 py-2">
        {searchResults?.map((event) => (
          <div
            key={event.id}
            className="relative aspect-square h-auto max-w-[20%] flex-grow md:max-w-[10%]"
          >
            <ExploreThumbnailImage
              event={event}
              onSelectSearch={onSelectSearch}
            />
          </div>
        ))}
        <div
          className="flex cursor-pointer items-center justify-center"
          onClick={() => handleSearch(objectType)}
        >
          <Tooltip>
            <TooltipTrigger>
              <LuArrowRightCircle
                className="ml-2 text-secondary-foreground transition-all duration-300 hover:text-primary"
                size={24}
              />
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent className="capitalize">
                <ExploreMoreLink objectType={objectType} />
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

type ExploreThumbnailImageProps = {
  event: SearchResult;
  onSelectSearch: (searchResult: SearchResult) => void;
};
function ExploreThumbnailImage({
  event,
  onSelectSearch,
}: ExploreThumbnailImageProps) {
  const apiHost = useApiHost();
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();

  return (
    <>
      <ImageLoadingIndicator
        className="absolute inset-0"
        imgLoaded={imgLoaded}
      />
      <img
        ref={imgRef}
        className={cn(
          "absolute h-full w-full cursor-pointer rounded-lg object-cover transition-all duration-300 ease-in-out md:rounded-2xl",
        )}
        style={
          isIOS
            ? {
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
              }
            : undefined
        }
        loading={isSafari ? "eager" : "lazy"}
        draggable={false}
        src={`${apiHost}api/events/${event.id}/thumbnail.jpg`}
        onClick={() => onSelectSearch(event)}
        onLoad={() => {
          onImgLoad();
        }}
      />
    </>
  );
}

function ExploreMoreLink({ objectType }: { objectType: string }) {
  const formattedType = objectType.replaceAll("_", " ");
  const label = formattedType.endsWith("s")
    ? `${formattedType}es`
    : `${formattedType}s`;

  return <div>Explore More {label}</div>;
}
