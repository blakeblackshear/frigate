import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  LuX,
  LuFilter,
  LuChevronDown,
  LuChevronUp,
  LuTrash2,
  LuStar,
  LuSearch,
} from "react-icons/lu";
import {
  FilterType,
  SavedSearchQuery,
  SearchFilter,
  SearchSortType,
  SearchSource,
} from "@/types/search";
import useSuggestions from "@/hooks/use-suggestions";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { SaveSearchDialog } from "./SaveSearchDialog";
import { DeleteSearchDialog } from "./DeleteSearchDialog";
import {
  convertLocalDateToTimestamp,
  convertTo12Hour,
  getIntlDateFormat,
  isValidTimeRange,
  to24Hour,
} from "@/utils/dateUtil";
import { toast } from "sonner";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { MdImageSearch } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { getTranslatedLabel } from "@/utils/i18n";
import { CameraNameLabel, ZoneNameLabel } from "../camera/FriendlyNameLabel";

type InputWithTagsProps = {
  inputFocused: boolean;
  setInputFocused: React.Dispatch<React.SetStateAction<boolean>>;
  filters: SearchFilter;
  setFilters: (filter: SearchFilter) => void;
  search: string;
  setSearch: (search: string) => void;
  allSuggestions: {
    [K in keyof SearchFilter]: string[];
  };
};

export default function InputWithTags({
  inputFocused,
  setInputFocused,
  filters,
  setFilters,
  search,
  setSearch,
  allSuggestions,
}: InputWithTagsProps) {
  const { t, i18n } = useTranslation(["views/search"]);
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const allAudioListenLabels = useMemo<Set<string>>(() => {
    if (!config) {
      return new Set<string>();
    }

    const labels = new Set<string>();
    Object.values(config.cameras).forEach((camera) => {
      if (camera?.audio?.enabled) {
        camera.audio.listen.forEach((label) => {
          labels.add(label);
        });
      }
    });
    return labels;
  }, [config]);

  const translatedAudioLabelMap = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    if (!config) return map;

    allAudioListenLabels.forEach((label) => {
      // getTranslatedLabel likely depends on i18n internally; including `lang`
      // in deps ensures this map is rebuilt when language changes
      map.set(label, getTranslatedLabel(label, "audio"));
    });
    return map;
  }, [allAudioListenLabels, config]);

  function resolveLabel(value: string) {
    const mapped = translatedAudioLabelMap.get(value);
    if (mapped) return mapped;
    return getTranslatedLabel(
      value,
      allAudioListenLabels.has(value) ? "audio" : "object",
    );
  }

  const [inputValue, setInputValue] = useState(search || "");
  const [currentFilterType, setCurrentFilterType] = useState<FilterType | null>(
    null,
  );
  const [isSimilaritySearch, setIsSimilaritySearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  // TODO: search history from browser storage

  const [searchHistory, setSearchHistory, searchHistoryLoaded] =
    useUserPersistence<SavedSearchQuery[]>("frigate-search-history");

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState<string | null>(null);

  const searchHistoryNames = useMemo(
    () => searchHistory?.map((item) => item.name) ?? [],
    [searchHistory],
  );

  const handleSetSearchHistory = useCallback(() => {
    setIsSaveDialogOpen(true);
  }, []);

  const handleSaveSearch = useCallback(
    (name: string) => {
      if (searchHistoryLoaded) {
        setSearchHistory([
          ...(searchHistory ?? []).filter((item) => item.name !== name),
          { name, search, filter: filters },
        ]);
      }
    },
    [search, filters, searchHistory, setSearchHistory, searchHistoryLoaded],
  );

  const handleLoadSavedSearch = useCallback(
    (name: string) => {
      if (searchHistoryLoaded) {
        const savedSearchEntry = searchHistory?.find(
          (entry) => entry.name === name,
        );
        if (savedSearchEntry) {
          setFilters(savedSearchEntry.filter!);
          setSearch(savedSearchEntry.search);
        }
      }
    },
    [searchHistory, searchHistoryLoaded, setFilters, setSearch],
  );

  const handleDeleteSearch = useCallback((name: string) => {
    setSearchToDelete(name);
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteSearch = useCallback(() => {
    if (searchToDelete && searchHistory) {
      setSearchHistory(
        searchHistory.filter((item) => item.name !== searchToDelete) ?? [],
      );
      setSearchToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  }, [searchToDelete, searchHistory, setSearchHistory]);

  // suggestions

  const { suggestions, updateSuggestions } = useSuggestions(
    filters,
    allSuggestions,
    searchHistory,
  );

  const resetSuggestions = useCallback(
    (value: string) => {
      setCurrentFilterType(null);
      updateSuggestions(value, null);
    },
    [updateSuggestions],
  );

  const filterSuggestions = useCallback(
    (current_suggestions: string[]) => {
      if (!inputValue || currentFilterType) return suggestions;
      const words = inputValue.split(/[\s,]+/);
      const lastNonEmptyWordIndex = words
        .map((word) => word.trim())
        .lastIndexOf(words.filter((word) => word.trim() !== "").pop() || "");
      const currentWord = words[lastNonEmptyWordIndex];
      if (words.at(-1) === "") {
        return current_suggestions;
      }

      return current_suggestions.filter((suggestion) =>
        suggestion.toLowerCase().startsWith(currentWord),
      );
    },
    [inputValue, suggestions, currentFilterType],
  );

  const removeFilter = useCallback(
    (filterType: FilterType, filterValue: string | number) => {
      const newFilters = { ...filters };
      if (Array.isArray(newFilters[filterType])) {
        (newFilters[filterType] as string[]) = (
          newFilters[filterType] as string[]
        ).filter((v) => v !== filterValue);
        if ((newFilters[filterType] as string[]).length === 0) {
          delete newFilters[filterType];
        }
      } else if (filterType === "before" || filterType === "after") {
        if (newFilters[filterType] === filterValue) {
          delete newFilters[filterType];
        }
      } else if (filterType === "has_snapshot") {
        if (newFilters[filterType] === filterValue) {
          delete newFilters[filterType];
          delete newFilters["is_submitted"];
        }
      } else {
        delete newFilters[filterType];
      }
      setFilters(newFilters as SearchFilter);
    },
    [filters, setFilters],
  );

  const createFilter = useCallback(
    (type: FilterType, value: string) => {
      if (
        allSuggestions[type as FilterType]?.includes(value) ||
        type == "before" ||
        type == "after" ||
        type == "time_range" ||
        type == "min_score" ||
        type == "max_score" ||
        type == "min_speed" ||
        type == "max_speed"
      ) {
        const newFilters = { ...filters };
        let timestamp = 0;
        let score = 0;
        let speed = 0;

        switch (type) {
          case "before":
          case "after":
            timestamp = convertLocalDateToTimestamp(value);
            if (timestamp > 0) {
              // Check for conflicts with existing before/after filters
              if (
                type === "before" &&
                filters.after &&
                timestamp <= filters.after * 1000
              ) {
                toast.error(t("filter.toast.error.beforeDateBeLaterAfter"), {
                  position: "top-center",
                });
                return;
              }
              if (
                type === "after" &&
                filters.before &&
                timestamp >= filters.before * 1000
              ) {
                toast.error(t("filter.toast.error.afterDatebeEarlierBefore"), {
                  position: "top-center",
                });
                return;
              }
              if (type === "before") {
                timestamp -= 1;
              }
              newFilters[type] = timestamp / 1000;
            }
            break;
          case "min_score":
          case "max_score":
            score = parseInt(value);
            if (score >= 0) {
              // Check for conflicts between min_score and max_score
              if (
                type === "min_score" &&
                filters.max_score !== undefined &&
                score > filters.max_score * 100
              ) {
                toast.error(
                  t("filter.toast.error.minScoreMustBeLessOrEqualMaxScore"),
                  {
                    position: "top-center",
                  },
                );
                return;
              }
              if (
                type === "max_score" &&
                filters.min_score !== undefined &&
                score < filters.min_score * 100
              ) {
                toast.error(
                  t("filter.toast.error.maxScoreMustBeGreaterOrEqualMinScore"),
                  {
                    position: "top-center",
                  },
                );
                return;
              }
              newFilters[type] = score / 100;
            }
            break;
          case "min_speed":
          case "max_speed":
            speed = parseFloat(value);
            if (score >= 0) {
              // Check for conflicts between min_speed and max_speed
              if (
                type === "min_speed" &&
                filters.max_speed !== undefined &&
                speed > filters.max_speed
              ) {
                toast.error(
                  t("filter.toast.error.minSpeedMustBeLessOrEqualMaxSpeed"),
                  {
                    position: "top-center",
                  },
                );
                return;
              }
              if (
                type === "max_speed" &&
                filters.min_speed !== undefined &&
                speed < filters.min_speed
              ) {
                toast.error(
                  t("filter.toast.error.maxSpeedMustBeGreaterOrEqualMinSpeed"),
                  {
                    position: "top-center",
                  },
                );
                return;
              }
              newFilters[type] = speed;
            }
            break;
          case "time_range":
            newFilters[type] = value;
            break;
          case "search_type":
            if (!newFilters.search_type) newFilters.search_type = [];
            if (
              !(newFilters.search_type as SearchSource[]).includes(
                value as SearchSource,
              )
            ) {
              (newFilters.search_type as SearchSource[]).push(
                value as SearchSource,
              );
            }
            break;
          case "has_snapshot":
            if (!newFilters.has_snapshot) newFilters.has_snapshot = undefined;
            newFilters.has_snapshot = value == "yes" ? 1 : 0;
            break;
          case "is_submitted":
            if (!newFilters.is_submitted) newFilters.is_submitted = undefined;
            newFilters.is_submitted = value == "yes" ? 1 : 0;
            break;
          case "has_clip":
            if (!newFilters.has_clip) newFilters.has_clip = undefined;
            newFilters.has_clip = value == "yes" ? 1 : 0;
            break;
          case "event_id":
            newFilters.event_id = value;
            break;
          case "sort":
            newFilters.sort = value as SearchSortType;
            break;
          default:
            // Handle array types (cameras, labels, sub_labels, attributes, zones)
            if (!newFilters[type]) newFilters[type] = [];
            if (Array.isArray(newFilters[type])) {
              if (!(newFilters[type] as string[]).includes(value)) {
                (newFilters[type] as string[]).push(value);
              }
            }
            break;
        }

        setFilters(newFilters);
        setInputValue((prev) => prev.replace(`${type}:${value}`, "").trim());
        setCurrentFilterType(null);
      }
    },
    [filters, setFilters, allSuggestions, t],
  );

  function formatFilterValues(
    filterType: string,
    filterValues: number | string,
  ): string {
    if (filterType === "before" || filterType === "after") {
      return new Date(
        (filterType === "before"
          ? (filterValues as number) + 1
          : (filterValues as number)) * 1000,
      ).toLocaleDateString(window.navigator?.language || "en-US");
    } else if (filterType === "time_range") {
      const [startTime, endTime] = (filterValues as string)
        .replace("-", ",")
        .split(",");
      return `${
        config?.ui.time_format === "24hour"
          ? startTime
          : convertTo12Hour(startTime)
      } - ${
        config?.ui.time_format === "24hour" ? endTime : convertTo12Hour(endTime)
      }`;
    } else if (filterType === "min_score" || filterType === "max_score") {
      return Math.round(Number(filterValues) * 100).toString() + "%";
    } else if (filterType === "min_speed" || filterType === "max_speed") {
      return (
        filterValues +
        " " +
        (config?.ui.unit_system == "metric"
          ? t("unit.speed.kph", { ns: "common" })
          : t("unit.speed.mph", { ns: "common" }))
      );
    } else if (
      filterType === "has_clip" ||
      filterType === "has_snapshot" ||
      filterType === "is_submitted"
    ) {
      return filterValues
        ? t("button.yes", { ns: "common" })
        : t("button.no", { ns: "common" });
    } else if (filterType === "labels") {
      const value = String(filterValues);
      return resolveLabel(value);
    } else if (filterType === "search_type") {
      return t("filter.searchType." + String(filterValues));
    } else {
      return String(filterValues).replaceAll("_", " ");
    }
  }

  // handlers

  const handleFilterCreation = useCallback(
    (filterType: FilterType, filterValue: string) => {
      const trimmedValue = filterValue.trim();
      if (
        allSuggestions[filterType]?.includes(trimmedValue) ||
        ((filterType === "before" || filterType === "after") &&
          trimmedValue.match(/^\d{8}$/)) ||
        (filterType === "time_range" &&
          isValidTimeRange(
            trimmedValue.replace("-", ","),
            config?.ui.time_format,
          )) ||
        ((filterType === "min_score" || filterType === "max_score") &&
          !isNaN(Number(trimmedValue)) &&
          Number(trimmedValue) >= 50 &&
          Number(trimmedValue) <= 100) ||
        ((filterType === "min_speed" || filterType === "max_speed") &&
          !isNaN(Number(trimmedValue)) &&
          Number(trimmedValue) >= 1 &&
          Number(trimmedValue) <= 150)
      ) {
        createFilter(
          filterType,
          filterType === "time_range"
            ? trimmedValue
                .replace("-", ",")
                .split(",")
                .map((time) => to24Hour(time.trim(), config?.ui.time_format))
                .join(",")
            : trimmedValue,
        );
        setInputValue((prev) => {
          const regex = new RegExp(
            `${filterType}:${filterValue.trim()}[,\\s]*`,
          );
          const newValue = prev.replace(regex, "").trim();
          return newValue.endsWith(",")
            ? newValue.slice(0, -1).trim()
            : newValue;
        });
        setCurrentFilterType(null);
      }
    },
    [allSuggestions, createFilter, config],
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);

      const words = value.split(/[\s,]+/);
      const lastNonEmptyWordIndex = words
        .map((word) => word.trim())
        .lastIndexOf(words.filter((word) => word.trim() !== "").pop() || "");
      const currentWord = words[lastNonEmptyWordIndex];
      const isLastCharSpaceOrComma = value.endsWith(" ") || value.endsWith(",");

      // Check if the current word is a filter type
      const filterTypeMatch = currentWord.match(/^(\w+):(.*)$/);
      if (filterTypeMatch) {
        const [_, filterType, filterValue] = filterTypeMatch as [
          string,
          FilterType,
          string,
        ];

        // Check if filter type is valid
        if (filterType in allSuggestions) {
          setCurrentFilterType(filterType);

          updateSuggestions(filterValue, filterType);

          // Check if the last character is a space or comma
          if (isLastCharSpaceOrComma) {
            handleFilterCreation(filterType, filterValue);
          }
        } else {
          resetSuggestions(value);
        }
      } else {
        resetSuggestions(value);
      }
    },
    [updateSuggestions, resetSuggestions, allSuggestions, handleFilterCreation],
  );

  const handleInputFocus = useCallback(() => {
    setInputFocused(true);
  }, [setInputFocused]);

  const handleClearInput = useCallback(() => {
    setInputFocused(false);
    setInputValue("");
    resetSuggestions("");
    setSearch("");
    inputRef?.current?.blur();
    setFilters({});
    setCurrentFilterType(null);
    setIsSimilaritySearch(false);
  }, [setFilters, resetSuggestions, setSearch, setInputFocused]);

  const handleClearSimilarity = useCallback(() => {
    const newFilters = { ...filters };
    if (newFilters.event_id === filters.event_id) {
      delete newFilters.event_id;
    }
    delete newFilters.search_type;
    setFilters(newFilters);
  }, [setFilters, filters]);

  const handleInputBlur = useCallback(
    (e: React.FocusEvent) => {
      if (
        commandRef.current &&
        !commandRef.current.contains(e.relatedTarget as Node)
      ) {
        setInputFocused(false);
      }
    },
    [setInputFocused],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (currentFilterType) {
        // Apply the selected suggestion to the current filter type
        if (currentFilterType == "time_range") {
          suggestion = suggestion
            .replace("-", ",")
            .split(",")
            .map((time) => to24Hour(time.trim(), config?.ui.time_format))
            .join(",");
        }
        createFilter(currentFilterType, suggestion);
        setInputValue((prev) => {
          const regex = new RegExp(`${currentFilterType}:[^\\s,]*`, "g");
          return prev.replace(regex, "").trim();
        });
      } else if (suggestion in allSuggestions) {
        // Set the suggestion as a new filter type
        setCurrentFilterType(suggestion as FilterType);
        setInputValue((prev) => {
          // Remove any partial match of the filter type, including incomplete matches
          const words = prev.split(/\s+/);
          const lastWord = words[words.length - 1];
          if (lastWord && suggestion.startsWith(lastWord.toLowerCase())) {
            words[words.length - 1] = suggestion + ":";
          } else {
            words.push(suggestion + ":");
          }
          return words.join(" ").trim();
        });
      } else {
        // Add the suggestion as a standalone word
        setInputValue((prev) => `${prev}${suggestion} `);
      }

      inputRef.current?.focus();
    },
    [createFilter, currentFilterType, allSuggestions, config],
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setInputFocused(false);
      inputRef?.current?.blur();
    },
    [setSearch, setInputFocused],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const event = e.target as HTMLInputElement;

      if (!currentFilterType && (e.key === "Home" || e.key === "End")) {
        const position = e.key === "Home" ? 0 : event.value.length;
        event.setSelectionRange(position, position);
      }

      if (
        e.key === "Enter" &&
        inputValue.trim() !== "" &&
        filterSuggestions(suggestions).length == 0
      ) {
        e.preventDefault();
        handleSearch(inputValue);
      }
    },
    [
      inputValue,
      handleSearch,
      filterSuggestions,
      suggestions,
      currentFilterType,
    ],
  );

  // effects

  useEffect(() => {
    updateSuggestions(inputValue, currentFilterType);
  }, [currentFilterType, inputValue, updateSuggestions]);

  useEffect(() => {
    if (filters?.search_type && filters?.search_type.includes("similarity")) {
      setIsSimilaritySearch(true);
      setInputValue("");
    } else {
      setIsSimilaritySearch(false);
      setInputValue(search || "");
    }
  }, [filters, search]);

  return (
    <>
      <Command
        shouldFilter={false}
        ref={commandRef}
        className="rounded-md border"
      >
        <div className="relative">
          <CommandInput
            ref={inputRef}
            value={inputValue}
            onValueChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="text-md h-9 pr-32"
            placeholder={t("placeholder.search")}
          />
          <div className="absolute right-3 top-0 flex h-full flex-row items-center justify-center gap-5">
            {(search || Object.keys(filters).length > 0) && (
              <Tooltip>
                <TooltipTrigger>
                  <LuX
                    className="size-4 cursor-pointer text-secondary-foreground"
                    onClick={handleClearInput}
                  />
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent>{t("button.clear")}</TooltipContent>
                </TooltipPortal>
              </Tooltip>
            )}

            {(search || Object.keys(filters).length > 0) && (
              <Tooltip>
                <TooltipTrigger>
                  <LuStar
                    className="size-4 cursor-pointer text-secondary-foreground"
                    onClick={handleSetSearchHistory}
                  />
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent>{t("button.save")}</TooltipContent>
                </TooltipPortal>
              </Tooltip>
            )}

            {isSimilaritySearch && (
              <Tooltip>
                <TooltipTrigger className="cursor-default">
                  <MdImageSearch
                    aria-label={t("similaritySearch.active")}
                    className="size-4 text-selected"
                  />
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent>
                    {t("similaritySearch.active")}
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="focus:outline-none"
                  aria-label={t("button.filterInformation")}
                >
                  <LuFilter
                    aria-label={t("button.filterActive")}
                    className={cn(
                      "size-4",
                      Object.keys(filters).length > 0
                        ? "text-selected"
                        : "text-secondary-foreground",
                    )}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h3 className="font-medium">{t("filter.tips.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("filter.tips.desc.text")}
                  </p>
                  <ul className="list-disc pl-5 text-sm text-primary-variant">
                    <li>{t("filter.tips.desc.step1")}</li>
                    <li>{t("filter.tips.desc.step2")}</li>
                    <li>{t("filter.tips.desc.step3")}</li>
                    <li>
                      {t("filter.tips.desc.step4", {
                        DateFormat: getIntlDateFormat(),
                      })}
                    </li>
                    <li>
                      {t("filter.tips.desc.step5", {
                        exampleTime:
                          config?.ui.time_format == "24hour"
                            ? "15:00-16:00"
                            : "3:00PM-4:00PM",
                      })}
                    </li>
                    <li>{t("filter.tips.desc.step6")}</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    {t("filter.tips.desc.exampleLabel")}{" "}
                    <code className="text-primary">
                      cameras:front_door label:person before:01012024
                      time_range:3:00PM-4:00PM
                    </code>
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            {inputFocused ? (
              <LuChevronUp
                onClick={() => {
                  setInputFocused(false);
                  inputRef.current?.blur();
                }}
                className="size-4 cursor-pointer text-secondary-foreground"
              />
            ) : (
              <LuChevronDown
                onClick={() => {
                  setInputFocused(true);
                  inputRef.current?.focus();
                }}
                className="size-4 cursor-pointer text-secondary-foreground"
              />
            )}
          </div>
        </div>

        <CommandList
          className={cn(
            "scrollbar-container border-t duration-200 animate-in fade-in",
            inputFocused && inputRef.current?.matches(":focus")
              ? "visible"
              : "hidden",
          )}
        >
          {!currentFilterType && inputValue && (
            <CommandGroup heading={t("search")}>
              <CommandItem
                className="cursor-pointer"
                onSelect={() => handleSearch(inputValue)}
              >
                <LuSearch className="mr-2 h-4 w-4" />
                {t("searchFor", { inputValue })}
              </CommandItem>
            </CommandGroup>
          )}
          {(Object.keys(filters).filter((key) => key !== "query").length > 0 ||
            isSimilaritySearch) && (
            <CommandGroup heading={t("filter.header.activeFilters")}>
              <div className="my-2 flex flex-wrap gap-2 px-2">
                {isSimilaritySearch && (
                  <span className="inline-flex items-center whitespace-nowrap rounded-full bg-blue-100 px-2 py-0.5 text-sm text-blue-800">
                    {t("similaritySearch.title")}
                    <button
                      onClick={handleClearSimilarity}
                      className="ml-1 focus:outline-none"
                      aria-label={t("similaritySearch.clear")}
                    >
                      <LuX className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {Object.entries(filters).map(([filterType, filterValues]) =>
                  Array.isArray(filterValues)
                    ? filterValues
                        .filter(() => filterType !== "query")
                        .filter(() => !filterValues.includes("similarity"))
                        .map((value, index) => (
                          <span
                            key={`${filterType}-${index}`}
                            className="inline-flex items-center whitespace-nowrap rounded-full bg-green-100 px-2 py-0.5 text-sm text-green-800 smart-capitalize"
                          >
                            {t("filter.label." + filterType)}:{" "}
                            {filterType === "labels" ? (
                              resolveLabel(value)
                            ) : filterType === "cameras" ? (
                              <CameraNameLabel camera={value} />
                            ) : filterType === "zones" ? (
                              <ZoneNameLabel zone={value} />
                            ) : (
                              value.replaceAll("_", " ")
                            )}
                            <button
                              onClick={() =>
                                removeFilter(filterType as FilterType, value)
                              }
                              className="ml-1 focus:outline-none"
                              aria-label={`Remove ${filterType}:${value.replaceAll("_", " ")} filter`}
                            >
                              <LuX className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                    : !(filterType == "event_id" && isSimilaritySearch) && (
                        <span
                          key={filterType}
                          className="inline-flex items-center whitespace-nowrap rounded-full bg-green-100 px-2 py-0.5 text-sm text-green-800 smart-capitalize"
                        >
                          {filterType === "event_id"
                            ? t("trackedObjectId")
                            : filterType === "is_submitted"
                              ? t("features.submittedToFrigatePlus.label", {
                                  ns: "components/filter",
                                })
                              : t("filter.label." + filterType)}
                          : {formatFilterValues(filterType, filterValues)}
                          <button
                            onClick={() =>
                              removeFilter(
                                filterType as FilterType,
                                filterValues as string | number,
                              )
                            }
                            className="ml-1 focus:outline-none"
                            aria-label={`Remove ${filterType}:${filterValues} filter`}
                          >
                            <LuX className="h-3 w-3" />
                          </button>
                        </span>
                      ),
                )}
              </div>
            </CommandGroup>
          )}

          {!currentFilterType &&
            !inputValue &&
            searchHistoryLoaded &&
            (searchHistory?.length ?? 0) > 0 && (
              <CommandGroup heading={t("savedSearches")}>
                {searchHistory?.map((suggestion, index) => (
                  <CommandItem
                    key={index}
                    className="flex cursor-pointer items-center justify-between"
                    onSelect={() => handleLoadSavedSearch(suggestion.name)}
                  >
                    <span>{suggestion.name}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSearch(suggestion.name);
                          }}
                          className="focus:outline-none"
                        >
                          <LuTrash2 className="h-4 w-4 text-secondary-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent>{t("button.delete")}</TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          <CommandGroup
            heading={
              currentFilterType
                ? t("filter.header.currentFilterType")
                : t("filter.header.noFilters")
            }
          >
            {filterSuggestions(suggestions)
              .filter(
                (item) =>
                  !searchHistory?.some((history) => history.name === item),
              )
              .map((suggestion, index) => (
                <CommandItem
                  key={index + (searchHistory?.length ?? 0)}
                  className="cursor-pointer"
                  onSelect={() => handleSuggestionClick(suggestion)}
                >
                  {i18n.language === "en" ? (
                    currentFilterType && currentFilterType === "cameras" ? (
                      <>
                        {suggestion} {" ("}{" "}
                        <CameraNameLabel camera={suggestion} />
                        {")"}
                      </>
                    ) : currentFilterType === "zones" ? (
                      <>
                        {suggestion} {" ("} <ZoneNameLabel zone={suggestion} />
                        {")"}
                      </>
                    ) : (
                      suggestion
                    )
                  ) : (
                    <>
                      {suggestion} {" ("}
                      {currentFilterType ? (
                        currentFilterType === "cameras" ? (
                          <CameraNameLabel camera={suggestion} />
                        ) : currentFilterType === "zones" ? (
                          <ZoneNameLabel zone={suggestion} />
                        ) : (
                          formatFilterValues(currentFilterType, suggestion)
                        )
                      ) : (
                        t("filter.label." + suggestion)
                      )}
                      {")"}
                    </>
                  )}
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </Command>
      <SaveSearchDialog
        existingNames={searchHistoryNames}
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={handleSaveSearch}
      />
      <DeleteSearchDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDeleteSearch}
        searchName={searchToDelete || ""}
      />
    </>
  );
}
