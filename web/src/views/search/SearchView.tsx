import SearchThumbnail from "@/components/card/SearchThumbnail";
import SearchFilterGroup from "@/components/filter/SearchFilterGroup";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import SearchDetailDialog, {
  SearchTab,
} from "@/components/overlay/detail/SearchDetailDialog";
import { Toaster } from "@/components/ui/sonner";
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
import SearchThumbnailFooter from "@/components/card/SearchThumbnailFooter";
import ExploreSettings from "@/components/settings/SearchSettings";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Chip from "@/components/indicators/Chip";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import SearchActionGroup from "@/components/filter/SearchActionGroup";
import { Trans, useTranslation } from "react-i18next";

type SearchViewProps = {
  search: string;
  searchTerm: string;
  searchFilter?: SearchFilter;
  searchResults?: SearchResult[];
  isLoading: boolean;
  isValidating: boolean;
  hasMore: boolean;
  columns: number;
  defaultView?: string;
  setSearch: (search: string) => void;
  setSimilaritySearch: (search: SearchResult) => void;
  setSearchFilter: (filter: SearchFilter) => void;
  onUpdateFilter: (filter: SearchFilter) => void;
  loadMore: () => void;
  refresh: () => void;
  setColumns: (columns: number) => void;
  setDefaultView: (name: string) => void;
};
export default function SearchView({
  search,
  searchTerm,
  searchFilter,
  searchResults,
  isLoading,
  isValidating,
  hasMore,
  columns,
  defaultView = "summary",
  setSearch,
  setSimilaritySearch,
  setSearchFilter,
  onUpdateFilter,
  loadMore,
  refresh,
  setColumns,
  setDefaultView,
}: SearchViewProps) {
  const { t } = useTranslation(["views/explore"]);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  // grid

  const gridClassName = cn(
    "grid w-full gap-2 px-1 gap-2 lg:gap-4 md:mx-2",
    isMobileOnly && "grid-cols-2",
    {
      "sm:grid-cols-2": columns <= 2,
      "sm:grid-cols-3": columns === 3,
      "sm:grid-cols-4": columns === 4,
      "sm:grid-cols-5": columns === 5,
      "sm:grid-cols-6": columns === 6,
      "sm:grid-cols-7": columns === 7,
      "sm:grid-cols-8": columns === 8,
    },
  );

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

      if (!cameraConfig) {
        return;
      }

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
  const { data: allRecognizedLicensePlates } = useSWR(
    "recognized_license_plates",
  );

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

      if (!cameraConfig) {
        return;
      }

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
      min_score: ["50"],
      max_score: ["100"],
      min_speed: ["1"],
      max_speed: ["150"],
      recognized_license_plate: allRecognizedLicensePlates,
      has_clip: ["yes", "no"],
      has_snapshot: ["yes", "no"],
      ...(config?.plus?.enabled &&
        searchFilter?.has_snapshot && { is_submitted: ["yes", "no"] }),
    }),
    [
      config,
      allLabels,
      allZones,
      allSubLabels,
      allRecognizedLicensePlates,
      searchFilter,
    ],
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
  const [page, setPage] = useState<SearchTab>("details");

  // search interaction

  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onSelectSearch = useCallback(
    (item: SearchResult, ctrl: boolean, page: SearchTab = "details") => {
      if (selectedObjects.length > 1 || ctrl) {
        const index = selectedObjects.indexOf(item.id);

        if (index != -1) {
          if (selectedObjects.length == 1) {
            setSelectedObjects([]);
          } else {
            const copy = [
              ...selectedObjects.slice(0, index),
              ...selectedObjects.slice(index + 1),
            ];
            setSelectedObjects(copy);
          }
        } else {
          const copy = [...selectedObjects];
          copy.push(item.id);
          setSelectedObjects(copy);
        }
      } else {
        setPage(page);
        setSearchDetail(item);
      }
    },
    [selectedObjects],
  );

  const onSelectAllObjects = useCallback(() => {
    if (!uniqueResults || uniqueResults.length == 0) {
      return;
    }

    if (selectedObjects.length < uniqueResults.length) {
      setSelectedObjects(uniqueResults.map((value) => value.id));
    } else {
      setSelectedObjects([]);
    }
  }, [uniqueResults, selectedObjects]);

  useEffect(() => {
    setSelectedObjects([]);
    // unselect items when search term or filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, searchFilter]);

  // confidence score

  const zScoreToConfidence = (score: number) => {
    // Normalizing is not needed for similarity searches
    // Sigmoid function for normalized: 1 / (1 + e^x)
    // Cosine for similarity
    if (searchFilter) {
      const notNormalized = searchFilter?.search_type?.includes("similarity");

      const confidence = notNormalized ? 1 - score : 1 / (1 + Math.exp(score));

      return Math.round(confidence * 100);
    }
  };

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
        case "a":
          if (modifiers.ctrl) {
            onSelectAllObjects();
          }
          break;
        case "ArrowLeft":
          if (uniqueResults.length > 0) {
            const currentIndex = searchDetail
              ? uniqueResults.findIndex(
                  (result) => result.id === searchDetail.id,
                )
              : -1;

            const newIndex =
              currentIndex === -1
                ? uniqueResults.length - 1
                : (currentIndex - 1 + uniqueResults.length) %
                  uniqueResults.length;

            setSearchDetail(uniqueResults[newIndex]);
          }
          break;

        case "ArrowRight":
          if (uniqueResults.length > 0) {
            const currentIndex = searchDetail
              ? uniqueResults.findIndex(
                  (result) => result.id === searchDetail.id,
                )
              : -1;

            const newIndex =
              currentIndex === -1
                ? 0
                : (currentIndex + 1) % uniqueResults.length;

            setSearchDetail(uniqueResults[newIndex]);
          }
          break;
        case "PageDown":
          contentRef.current?.scrollBy({
            top: contentRef.current.clientHeight / 2,
            behavior: "smooth",
          });
          break;
        case "PageUp":
          contentRef.current?.scrollBy({
            top: -contentRef.current.clientHeight / 2,
            behavior: "smooth",
          });
          break;
      }
    },
    [uniqueResults, inputFocused, onSelectAllObjects, searchDetail],
  );

  useKeyboardListener(
    ["a", "ArrowLeft", "ArrowRight", "PageDown", "PageUp"],
    onKeyboardShortcut,
    !inputFocused,
  );

  // scroll into view

  const [prevSearchDetail, setPrevSearchDetail] = useState<
    SearchResult | undefined
  >();

  // keep track of previous ref to outline thumbnail when dialog closes
  const prevSearchDetailRef = useRef<SearchResult | undefined>();

  useEffect(() => {
    if (searchDetail === undefined && prevSearchDetailRef.current) {
      setPrevSearchDetail(prevSearchDetailRef.current);
    }
    prevSearchDetailRef.current = searchDetail;
  }, [searchDetail]);

  useEffect(() => {
    if (uniqueResults && itemRefs.current && prevSearchDetail) {
      const selectedIndex = uniqueResults.findIndex(
        (result) => result.id === prevSearchDetail.id,
      );

      const parent = itemRefs.current[selectedIndex];

      if (selectedIndex !== -1 && parent) {
        const target = parent.querySelector(".review-item-ring");
        if (target) {
          scrollIntoView(target, {
            block: "center",
            behavior: "smooth",
            scrollMode: "if-needed",
          });
          target.classList.add(`outline-selected`);
          target.classList.remove("outline-transparent");

          setTimeout(() => {
            target.classList.remove(`outline-selected`);
            target.classList.add("outline-transparent");
          }, 3000);
        }
      }
    }
    // we only want to scroll when the dialog closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevSearchDetail]);

  useEffect(() => {
    if (uniqueResults && itemRefs.current && searchDetail) {
      const selectedIndex = uniqueResults.findIndex(
        (result) => result.id === searchDetail.id,
      );

      const parent = itemRefs.current[selectedIndex];

      if (selectedIndex !== -1 && parent) {
        scrollIntoView(parent, {
          block: "center",
          behavior: "smooth",
          scrollMode: "if-needed",
        });
      }
    }
    // we only want to scroll when changing the detail pane
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDetail]);

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
        page={page}
        setSearch={setSearchDetail}
        setSearchPage={setPage}
        setSimilarity={
          searchDetail && (() => setSimilaritySearch(searchDetail))
        }
        setInputFocused={setInputFocused}
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
            <div className="flex flex-row gap-2">
              {selectedObjects.length == 0 ? (
                <>
                  <SearchFilterGroup
                    className={cn(
                      "w-full justify-between md:justify-start lg:justify-end",
                    )}
                    filter={searchFilter}
                    onUpdateFilter={onUpdateFilter}
                  />
                  <ExploreSettings
                    columns={columns}
                    setColumns={setColumns}
                    defaultView={defaultView}
                    setDefaultView={setDefaultView}
                    filter={searchFilter}
                    onUpdateFilter={onUpdateFilter}
                  />
                  <ScrollBar orientation="horizontal" className="h-0" />
                </>
              ) : (
                <div
                  className={cn(
                    "scrollbar-container flex justify-center gap-2 overflow-x-auto",
                    "h-10 w-full justify-between md:justify-start lg:justify-end",
                  )}
                >
                  <SearchActionGroup
                    selectedObjects={selectedObjects}
                    setSelectedObjects={setSelectedObjects}
                    pullLatestData={refresh}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <div
        ref={contentRef}
        className="no-scrollbar flex flex-1 flex-wrap content-start gap-2 overflow-y-auto"
      >
        {uniqueResults?.length == 0 && !isLoading && (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
            <LuSearchX className="size-16" />
            {t("noTrackedObjects")}
          </div>
        )}

        {((isLoading && uniqueResults?.length == 0) || // show on initial load
          (isValidating && !isLoading)) && // or revalidation
          (searchTerm || // or change of filter/search term
            (searchFilter && Object.keys(searchFilter).length !== 0)) && (
            <ActivityIndicator className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background/80 p-3 dark:bg-background/50" />
          )}

        {uniqueResults && (
          <div className={gridClassName}>
            {uniqueResults &&
              uniqueResults.map((value, index) => {
                const selected = selectedObjects.includes(value.id);

                return (
                  <div
                    key={value.id}
                    ref={(item) => (itemRefs.current[index] = item)}
                    data-start={value.start_time}
                    className="relative flex flex-col rounded-lg"
                  >
                    <div
                      className={cn(
                        "aspect-square w-full overflow-hidden rounded-t-lg border",
                      )}
                    >
                      <SearchThumbnail
                        searchResult={value}
                        onClick={(
                          value: SearchResult,
                          ctrl: boolean,
                          detail: boolean,
                        ) => {
                          if (detail && selectedObjects.length == 0) {
                            setSearchDetail(value);
                          } else {
                            onSelectSearch(
                              value,
                              ctrl || selectedObjects.length > 0,
                            );
                          }
                        }}
                      />
                      {(searchTerm ||
                        searchFilter?.search_type?.includes("similarity")) && (
                        <div className={cn("absolute right-2 top-2 z-40")}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Chip
                                className={`flex select-none items-center justify-between space-x-1 bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500 text-xs text-white smart-capitalize`}
                              >
                                {value.search_source == "thumbnail" ? (
                                  <LuImage className="size-3" />
                                ) : (
                                  <LuText className="size-3" />
                                )}
                              </Chip>
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipContent>
                                <Trans
                                  ns="views/explore"
                                  values={{
                                    type: t(
                                      "filter.searchType." +
                                        value.search_source,
                                      { ns: "views/search" },
                                    ),
                                    confidence: zScoreToConfidence(
                                      value.search_distance,
                                    ),
                                  }}
                                >
                                  searchResult.tooltip
                                </Trans>
                              </TooltipContent>
                            </TooltipPortal>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                    <div
                      className={`review-item-ring pointer-events-none absolute inset-0 z-10 size-full rounded-lg outline outline-[3px] -outline-offset-[2.8px] ${selected ? `shadow-selected outline-selected` : "outline-transparent duration-500"}`}
                    />
                    <div className="flex w-full grow items-center justify-between rounded-b-lg border border-t-0 bg-card p-3 text-card-foreground">
                      <SearchThumbnailFooter
                        searchResult={value}
                        columns={columns}
                        findSimilar={() => {
                          if (config?.semantic_search.enabled) {
                            setSimilaritySearch(value);
                          }
                        }}
                        refreshResults={refresh}
                        showObjectLifecycle={() =>
                          onSelectSearch(value, false, "object_lifecycle")
                        }
                        showSnapshot={() =>
                          onSelectSearch(value, false, "snapshot")
                        }
                      />
                    </div>
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
        !searchTerm &&
        defaultView == "summary" && (
          <div className="scrollbar-container flex size-full flex-col overflow-y-auto">
            <ExploreView
              searchDetail={searchDetail}
              setSearchDetail={setSearchDetail}
              setSimilaritySearch={setSimilaritySearch}
              onSelectSearch={onSelectSearch}
            />
          </div>
        )}
    </div>
  );
}
