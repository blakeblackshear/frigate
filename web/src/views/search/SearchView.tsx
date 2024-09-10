import SearchFilterGroup from "@/components/filter/SearchFilterGroup";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Chip from "@/components/indicators/Chip";
import SearchDetailDialog from "@/components/overlay/detail/SearchDetailDialog";
import SearchThumbnailPlayer from "@/components/player/SearchThumbnailPlayer";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Preview } from "@/types/preview";
import { SearchFilter, SearchResult } from "@/types/search";
import { useCallback, useMemo, useState } from "react";
import { isMobileOnly } from "react-device-detect";
import {
  LuExternalLink,
  LuImage,
  LuSearchCheck,
  LuSearchX,
  LuText,
  LuXCircle,
} from "react-icons/lu";
import { Link } from "react-router-dom";

type SearchViewProps = {
  search: string;
  searchTerm: string;
  searchFilter?: SearchFilter;
  searchResults?: SearchResult[];
  allPreviews?: Preview[];
  isLoading: boolean;
  similaritySearch?: SearchResult;
  setSearch: (search: string) => void;
  setSimilaritySearch: (search: SearchResult) => void;
  onUpdateFilter: (filter: SearchFilter) => void;
  onOpenSearch: (item: SearchResult) => void;
};
export default function SearchView({
  search,
  searchTerm,
  searchFilter,
  searchResults,
  allPreviews,
  isLoading,
  similaritySearch,
  setSearch,
  setSimilaritySearch,
  onUpdateFilter,
  onOpenSearch,
}: SearchViewProps) {
  // remove duplicate event ids

  const uniqueResults = useMemo(() => {
    return searchResults?.filter(
      (value, index, self) =>
        index === self.findIndex((v) => v.id === value.id),
    );
  }, [searchResults]);

  // detail

  const [searchDetail, setSearchDetail] = useState<SearchResult>();

  // search interaction

  const onSelectSearch = useCallback(
    (item: SearchResult, detail: boolean) => {
      if (detail) {
        setSearchDetail(item);
      } else {
        onOpenSearch(item);
      }
    },
    [onOpenSearch],
  );

  // confidence score - probably needs tweaking

  const zScoreToConfidence = (score: number, source: string) => {
    let midpoint, scale;

    if (source === "thumbnail") {
      midpoint = 2;
      scale = 0.5;
    } else {
      midpoint = 0.5;
      scale = 1.5;
    }

    // Sigmoid function: 1 / (1 + e^x)
    const confidence = 1 / (1 + Math.exp((score - midpoint) * scale));

    return Math.round(confidence * 100);
  };

  return (
    <div className="flex size-full flex-col pt-2 md:py-2">
      <Toaster closeButton={true} />
      <SearchDetailDialog
        search={searchDetail}
        setSearch={setSearchDetail}
        setSimilarity={
          searchDetail && (() => setSimilaritySearch(searchDetail))
        }
      />

      <div className="relative mb-2 flex h-11 items-center justify-between pl-2 pr-2 md:pl-3">
        <div className="relative mr-3 w-full md:w-1/3">
          <Input
            className="text-md w-full bg-muted pr-10"
            placeholder={
              isMobileOnly ? "Search" : "Search for a detected object..."
            }
            value={similaritySearch ? "" : search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <LuXCircle
              className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-primary"
              onClick={() => setSearch("")}
            />
          )}
        </div>

        <SearchFilterGroup
          filter={searchFilter}
          onUpdateFilter={onUpdateFilter}
        />
      </div>

      <div className="no-scrollbar flex flex-1 flex-wrap content-start gap-2 overflow-y-auto md:gap-4">
        {searchTerm.length == 0 && (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
            <LuSearchCheck className="size-16" />
            Search
            <div className="mt-2 max-w-64 text-sm text-secondary-foreground">
              Frigate can find detected objects in your review items.
            </div>
            <div className="mt-2 flex items-center text-center text-sm text-primary">
              <Link
                to="https://docs.frigate.video/configuration/semantic_search"
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                Read the Documentation{" "}
                <LuExternalLink className="ml-2 inline-flex size-3" />
              </Link>
            </div>
          </div>
        )}

        {searchTerm.length > 0 && searchResults?.length == 0 && (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
            <LuSearchX className="size-16" />
            No Detected Objects Found
          </div>
        )}

        {isLoading && (
          <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        )}

        <div className="grid w-full gap-2 px-1 sm:grid-cols-2 md:mx-2 md:grid-cols-4 md:gap-4 3xl:grid-cols-6">
          {uniqueResults &&
            uniqueResults.map((value) => {
              const selected = false;

              return (
                <div
                  key={value.id}
                  data-start={value.start_time}
                  className="review-item relative rounded-lg"
                >
                  <div
                    className={cn(
                      "aspect-square size-full overflow-hidden rounded-lg",
                    )}
                  >
                    <SearchThumbnailPlayer
                      searchResult={value}
                      allPreviews={allPreviews}
                      scrollLock={false}
                      onClick={onSelectSearch}
                    />
                    <div className={cn("absolute right-2 top-2 z-40")}>
                      <Tooltip>
                        <TooltipTrigger>
                          <Chip
                            className={`flex select-none items-center justify-between space-x-1 bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500 text-xs capitalize text-white`}
                          >
                            {value.search_source == "thumbnail" ? (
                              <LuImage className="mr-1 size-3" />
                            ) : (
                              <LuText className="mr-1 size-3" />
                            )}
                            {zScoreToConfidence(
                              value.search_distance,
                              value.search_source,
                            )}
                            %
                          </Chip>
                        </TooltipTrigger>
                        <TooltipContent>
                          Matched {value.search_source} at{" "}
                          {zScoreToConfidence(
                            value.search_distance,
                            value.search_source,
                          )}
                          %
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div
                    className={`review-item-ring pointer-events-none absolute inset-0 z-10 size-full rounded-lg outline outline-[3px] -outline-offset-[2.8px] ${selected ? `shadow-severity_alert outline-severity_alert` : "outline-transparent duration-500"}`}
                  />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
