import SearchThumbnail from "@/components/card/SearchThumbnail";
import SearchFilterGroup from "@/components/filter/SearchFilterGroup";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Chip from "@/components/indicators/Chip";
import SearchDetailDialog from "@/components/overlay/detail/SearchDetailDialog";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { SearchFilter, SearchResult, SearchSource } from "@/types/search";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isMobileOnly } from "react-device-detect";
import { LuImage, LuSearchX, LuText } from "react-icons/lu";
import useSWR from "swr";
import ExploreView from "../explore/ExploreView";
import useKeyboardListener, {
  KeyModifiers,
} from "@/hooks/use-keyboard-listener";
import scrollIntoView from "scroll-into-view-if-needed";
import InputWithTags from "@/components/input/InputWithTags";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { isEqual } from "lodash";
import { formatDateToLocaleString } from "@/utils/dateUtil";
import { TooltipPortal } from "@radix-ui/react-tooltip";

type SearchViewProps = {
  search: string;
  searchTerm: string;
  searchFilter?: SearchFilter;
  searchResults?: SearchResult[];
  isLoading: boolean;
  setSearch: (search: string) => void;
  setSimilaritySearch: (search: SearchResult) => void;
  setSearchFilter: (filter: SearchFilter) => void;
  onUpdateFilter: (filter: SearchFilter) => void;
  loadMore: () => void;
  hasMore: boolean;
};
export default function SearchView({
  search,
  searchTerm,
  searchFilter,
  searchResults,
  isLoading,
  setSearch,
  setSimilaritySearch,
  setSearchFilter,
  onUpdateFilter,
  loadMore,
  hasMore,
}: SearchViewProps) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  // suggestions values

  const allLabels = useMemo<string[]>(() => {
    if (!config) {
      return [];
    }

    const labels = new Set<string>();
    const cameras = searchFilter?.cameras || Object.keys(config.cameras);

    cameras.forEach((camera) => {
      if (camera == "birdseye") {
        return;
      }
      const cameraConfig = config.cameras[camera];
      cameraConfig.objects.track.forEach((label) => {
        labels.add(label);
      });

      if (cameraConfig.audio.enabled_in_config) {
        cameraConfig.audio.listen.forEach((label) => {
          labels.add(label);
        });
      }
    });

    return [...labels].sort();
  }, [config, searchFilter]);

  const { data: allSubLabels } = useSWR("sub_labels");

  const allZones = useMemo<string[]>(() => {
    if (!config) {
      return [];
    }

    const zones = new Set<string>();
    const cameras = searchFilter?.cameras || Object.keys(config.cameras);

    cameras.forEach((camera) => {
      if (camera == "birdseye") {
        return;
      }
      const cameraConfig = config.cameras[camera];
      Object.entries(cameraConfig.zones).map(([name, _]) => {
        zones.add(name);
      });
    });

    return [...zones].sort();
  }, [config, searchFilter]);

  const suggestionsValues = useMemo(
    () => ({
      cameras: Object.keys(config?.cameras || {}),
      labels: Object.values(allLabels || {}),
      zones: Object.values(allZones || {}),
      sub_labels: allSubLabels,
      search_type: ["thumbnail", "description"] as SearchSource[],
      time_range:
        config?.ui.time_format == "24hour"
          ? ["00:00-23:59"]
          : ["12:00AM-11:59PM"],
      before: [formatDateToLocaleString()],
      after: [formatDateToLocaleString(-5)],
    }),
    [config, allLabels, allZones, allSubLabels],
  );

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

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onSelectSearch = useCallback((item: SearchResult, index: number) => {
    setSearchDetail(item);
    setSelectedIndex(index);
  }, []);

  // update search detail when results change

  useEffect(() => {
    if (searchDetail && searchResults) {
      const flattenedResults = searchResults.flat();
      const updatedSearchDetail = flattenedResults.find(
        (result) => result.id === searchDetail.id,
      );

      if (updatedSearchDetail && !isEqual(updatedSearchDetail, searchDetail)) {
        setSearchDetail(updatedSearchDetail);
      }
    }
  }, [searchResults, searchDetail]);

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

  const hasExistingSearch = useMemo(
    () => searchResults != undefined || searchFilter != undefined,
    [searchResults, searchFilter],
  );

  // keyboard listener

  const [inputFocused, setInputFocused] = useState(false);

  const onKeyboardShortcut = useCallback(
    (key: string | null, modifiers: KeyModifiers) => {
      if (!modifiers.down || !uniqueResults || inputFocused) {
        return;
      }

      switch (key) {
        case "ArrowLeft":
          setSelectedIndex((prevIndex) => {
            const newIndex =
              prevIndex === null
                ? uniqueResults.length - 1
                : (prevIndex - 1 + uniqueResults.length) % uniqueResults.length;
            setSearchDetail(uniqueResults[newIndex]);
            return newIndex;
          });
          break;
        case "ArrowRight":
          setSelectedIndex((prevIndex) => {
            const newIndex =
              prevIndex === null ? 0 : (prevIndex + 1) % uniqueResults.length;
            setSearchDetail(uniqueResults[newIndex]);
            return newIndex;
          });
          break;
      }
    },
    [uniqueResults, inputFocused],
  );

  useKeyboardListener(
    ["ArrowLeft", "ArrowRight"],
    onKeyboardShortcut,
    !inputFocused,
  );

  // scroll into view

  useEffect(() => {
    if (
      selectedIndex !== null &&
      uniqueResults &&
      itemRefs.current?.[selectedIndex]
    ) {
      scrollIntoView(itemRefs.current[selectedIndex], {
        block: "center",
        behavior: "smooth",
        scrollMode: "if-needed",
      });
    }
    // we only want to scroll when the index changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  // observer for loading more

  const observerTarget = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, loadMore]);

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

      <div
        className={cn(
          "flex flex-col items-start space-y-2 pl-2 pr-2 md:mb-2 md:pl-3 lg:relative lg:h-10 lg:flex-row lg:items-center lg:space-y-0",
          config?.semantic_search?.enabled
            ? "justify-between"
            : "justify-center",
          isMobileOnly && "mb-2 h-auto flex-wrap gap-2 space-y-0",
        )}
      >
        {config?.semantic_search?.enabled && (
          <div className={cn("z-[41] w-full lg:absolute lg:top-0 lg:w-1/3")}>
            <InputWithTags
              inputFocused={inputFocused}
              setInputFocused={setInputFocused}
              filters={searchFilter ?? {}}
              setFilters={setSearchFilter}
              search={search}
              setSearch={setSearch}
              allSuggestions={suggestionsValues}
            />
          </div>
        )}

        {hasExistingSearch && (
          <ScrollArea className="w-full whitespace-nowrap lg:ml-[35%]">
            <div className="flex flex-row">
              <SearchFilterGroup
                className={cn(
                  "w-full justify-between md:justify-start lg:justify-end",
                )}
                filter={searchFilter}
                onUpdateFilter={onUpdateFilter}
              />
              <ScrollBar orientation="horizontal" className="h-0" />
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="no-scrollbar flex flex-1 flex-wrap content-start gap-2 overflow-y-auto">
        {uniqueResults?.length == 0 && !isLoading && (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
            <LuSearchX className="size-16" />
            No Tracked Objects Found
          </div>
        )}

        {uniqueResults?.length == 0 &&
          isLoading &&
          (searchTerm ||
            (searchFilter && Object.keys(searchFilter).length !== 0)) && (
            <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
          )}

        {uniqueResults && (
          <div className="grid w-full gap-2 px-1 sm:grid-cols-2 md:mx-2 md:grid-cols-4 md:gap-4 3xl:grid-cols-6">
            {uniqueResults &&
              uniqueResults.map((value, index) => {
                const selected = selectedIndex === index;

                return (
                  <div
                    key={value.id}
                    ref={(item) => (itemRefs.current[index] = item)}
                    data-start={value.start_time}
                    className="review-item relative rounded-lg"
                  >
                    <div
                      className={cn(
                        "aspect-square size-full overflow-hidden rounded-lg",
                      )}
                    >
                      <SearchThumbnail
                        searchResult={value}
                        findSimilar={() => setSimilaritySearch(value)}
                        onClick={() => onSelectSearch(value, index)}
                      />
                      {searchTerm && (
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
                            <TooltipPortal>
                              <TooltipContent>
                                Matched {value.search_source} at{" "}
                                {zScoreToConfidence(
                                  value.search_distance,
                                  value.search_source,
                                )}
                                %
                              </TooltipContent>
                            </TooltipPortal>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                    <div
                      className={`review-item-ring pointer-events-none absolute inset-0 z-10 size-full rounded-lg outline outline-[3px] -outline-offset-[2.8px] ${selected ? `shadow-selected outline-selected` : "outline-transparent duration-500"}`}
                    />
                  </div>
                );
              })}
          </div>
        )}
        {uniqueResults && uniqueResults.length > 0 && (
          <>
            <div ref={observerTarget} className="h-10 w-full" />
            <div className="flex h-12 w-full justify-center">
              {hasMore && isLoading && <ActivityIndicator />}
            </div>
          </>
        )}
      </div>
      {searchFilter &&
        Object.keys(searchFilter).length === 0 &&
        !searchTerm && (
          <div className="scrollbar-container flex size-full flex-col overflow-y-auto">
            <ExploreView
              searchDetail={searchDetail}
              setSearchDetail={setSearchDetail}
            />
          </div>
        )}
    </div>
  );
}
