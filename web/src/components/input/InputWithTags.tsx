import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LuX, LuFilter, LuImage } from "react-icons/lu";
import { SearchFilter, SearchSource } from "@/types/search";
import { DropdownMenuSeparator } from "../ui/dropdown-menu";

type FilterType = keyof SearchFilter;

const convertMMDDYYToTimestamp = (dateString: string): number => {
  const match = dateString.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!match) return 0;

  const [, month, day, year] = match;
  const date = new Date(`20${year}-${month}-${day}T00:00:00Z`);
  return date.getTime();
};

// Custom hook for managing suggestions
const useSuggestions = (
  filters: SearchFilter,
  allSuggestions: { [K in keyof SearchFilter]: string[] },
  searchHistory: string[],
) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const updateSuggestions = useCallback(
    (value: string, currentFilterType: FilterType | null) => {
      if (currentFilterType && currentFilterType in allSuggestions) {
        const filterValue = value.split(":").pop() || "";
        const currentFilterValues = filters[currentFilterType] || [];
        setSuggestions(
          allSuggestions[currentFilterType]?.filter(
            (item) =>
              item.toLowerCase().startsWith(filterValue.toLowerCase()) &&
              !(currentFilterValues as (string | number)[]).includes(item),
          ) ?? [],
        );
      } else {
        const availableFilters = Object.keys(allSuggestions).filter(
          (filter) => {
            const filterKey = filter as FilterType;
            const filterValues = filters[filterKey];
            const suggestionValues = allSuggestions[filterKey];

            if (!filterValues) return true;
            if (
              Array.isArray(filterValues) &&
              Array.isArray(suggestionValues)
            ) {
              return filterValues.length < suggestionValues.length;
            }
            return false;
          },
        );
        setSuggestions([
          ...searchHistory,
          ...availableFilters,
          "before",
          "after",
        ]);
      }
    },
    [filters, allSuggestions, searchHistory],
  );

  return {
    suggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    updateSuggestions,
  };
};

type InputWithTagsProps = {
  filters: SearchFilter;
  setFilters: (filter: SearchFilter) => void;
  search: string;
  setSearch: (search: string) => void;
  allSuggestions: {
    [K in keyof SearchFilter]: string[];
  };
};

export default function InputWithTags({
  filters,
  setFilters,
  search,
  setSearch,
  allSuggestions,
}: InputWithTagsProps) {
  const [inputValue, setInputValue] = useState(search || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentFilterType, setCurrentFilterType] = useState<FilterType | null>(
    null,
  );
  const [isSimilaritySearch, setIsSimilaritySearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const searchHistory = useMemo(
    () => ["previous search 1", "previous search 2"],
    [],
  );

  const {
    suggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    updateSuggestions,
  } = useSuggestions(filters, allSuggestions, searchHistory);

  const resetSuggestions = useCallback(
    (value: string) => {
      setCurrentFilterType(null);
      updateSuggestions(value, null);
    },
    [updateSuggestions],
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
      } else {
        delete newFilters[filterType];
      }
      setFilters(newFilters as SearchFilter);
    },
    [filters, setFilters],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    updateSuggestions(inputValue, currentFilterType);
  }, [currentFilterType, inputValue, updateSuggestions]);

  const createFilter = useCallback(
    (type: FilterType, value: string) => {
      if (
        allSuggestions[type as keyof SearchFilter]?.includes(value) ||
        type === "before" ||
        type === "after"
      ) {
        const newFilters = { ...filters };
        let timestamp = 0;

        switch (type) {
          case "before":
          case "after":
            timestamp = convertMMDDYYToTimestamp(value);
            if (timestamp > 0) {
              newFilters[type] = timestamp;
            }
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
          case "event_id":
            newFilters.event_id = value;
            break;
          default:
            // Handle array types (cameras, labels, subLabels, zones)
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
        setShowSuggestions(false);
      }
    },
    [filters, setFilters, allSuggestions],
  );

  const handleFilterCreation = useCallback(
    (filterType: FilterType, filterValue: string) => {
      const trimmedValue = filterValue.trim();
      if (
        allSuggestions[filterType as keyof SearchFilter]?.includes(
          trimmedValue,
        ) ||
        ((filterType === "before" || filterType === "after") &&
          trimmedValue.match(/^\d{6}$/))
      ) {
        createFilter(filterType, trimmedValue);
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
    [allSuggestions, createFilter],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
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
        if (
          filterType in allSuggestions ||
          filterType === "before" ||
          filterType === "after"
        ) {
          setCurrentFilterType(filterType);

          if (filterType === "before" || filterType === "after") {
            // For before and after, we don't need to update suggestions
            if (filterValue.match(/^\d{6}$/)) {
              handleFilterCreation(filterType, filterValue);
            }
          } else {
            updateSuggestions(filterValue, filterType);

            // Check if the last character is a space or comma
            if (isLastCharSpaceOrComma) {
              handleFilterCreation(filterType, filterValue);
            }
          }
        } else {
          resetSuggestions(value);
        }
      } else {
        resetSuggestions(value);
      }

      // Reset suggestion state
      setSelectedSuggestionIndex(-1);
      setShowSuggestions(true);
    },
    [
      updateSuggestions,
      resetSuggestions,
      allSuggestions,
      handleFilterCreation,
      setSelectedSuggestionIndex,
    ],
  );

  const handleInputFocus = useCallback(() => {
    setShowSuggestions(true);
    setShowFilters(true);
    updateSuggestions(inputValue, currentFilterType);
    setSelectedSuggestionIndex(-1);
  }, [
    inputValue,
    currentFilterType,
    updateSuggestions,
    setSelectedSuggestionIndex,
  ]);

  const handleClearInput = useCallback(() => {
    setInputValue("");
    setFilters({});
    setCurrentFilterType(null);
    updateSuggestions("", null);
    setShowFilters(false);
    setShowSuggestions(false);
    setIsSimilaritySearch(false);
    setSearch("");
  }, [setFilters, updateSuggestions, setSearch]);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setShowFilters(false);
        setSelectedSuggestionIndex(-1);
      }
    }, 0);
  }, [setSelectedSuggestionIndex]);

  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (currentFilterType) {
        // Apply the selected suggestion to the current filter type
        createFilter(currentFilterType, suggestion);
        setInputValue((prev) =>
          prev.replace(`${currentFilterType}:`, "").trim(),
        );
      } else if (suggestion in allSuggestions) {
        // Set the suggestion as a new filter type
        setCurrentFilterType(suggestion as FilterType);
        setInputValue((prev) => `${prev}${suggestion}:`);
      } else {
        // Add the suggestion as a standalone word
        setInputValue((prev) => `${prev}${suggestion} `);
      }

      inputRef.current?.focus();
    },
    [createFilter, currentFilterType, allSuggestions],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length,
        );
      } else if (e.key === "Enter" && selectedSuggestionIndex !== -1) {
        e.preventDefault();
        handleSuggestionClick(suggestions[selectedSuggestionIndex]);
      } else if (e.key === "Enter" && currentFilterType) {
        e.preventDefault();
        const currentWord = inputValue.split(/[\s,]+/).pop() || "";
        handleFilterCreation(currentFilterType, currentWord);
      } else if (e.key === "Enter" && !currentFilterType) {
        e.preventDefault();
        setSearch(inputValue);
        inputRef.current?.blur();
        handleInputBlur();
      }
    },
    [
      suggestions,
      selectedSuggestionIndex,
      handleSuggestionClick,
      currentFilterType,
      inputValue,
      handleFilterCreation,
      setSelectedSuggestionIndex,
      setSearch,
      handleInputBlur,
    ],
  );

  useEffect(() => {
    setInputValue(search || "");
  }, [search]);

  useEffect(() => {
    if (search?.startsWith("similarity:")) {
      setIsSimilaritySearch(true);
      setInputValue("");
    } else {
      setIsSimilaritySearch(false);
      setInputValue(search || "");
    }
  }, [search]);

  return (
    <div ref={containerRef}>
      <div className="relative my-2">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="pr-20"
          placeholder="Search..."
          aria-label="Search input"
          aria-autocomplete="list"
          aria-controls="suggestions-list"
          aria-expanded={showSuggestions}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 transform space-x-1">
          {(Object.keys(filters).length > 0 || isSimilaritySearch) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFilters}
              aria-label="Toggle filters"
              className={
                Object.keys(filters).length > 0
                  ? "text-selected"
                  : "text-secondary-foreground"
              }
            >
              {isSimilaritySearch ? (
                <LuImage className="size-4" />
              ) : (
                <LuFilter className="size-4" />
              )}
            </Button>
          )}
          {(inputValue || Object.keys(filters).length > 0) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearInput}
              aria-label="Clear input"
            >
              <LuX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {((showFilters &&
        (Object.keys(filters).length > 0 || isSimilaritySearch)) ||
        showSuggestions) && (
        <div className="scrollbar-container absolute left-0 top-12 z-[100] max-h-[200px] w-full overflow-y-auto rounded-md border border-input bg-background p-2 text-primary shadow-md">
          {showFilters &&
            (Object.keys(filters).length > 0 || isSimilaritySearch) && (
              <div ref={filterRef} className="my-2 flex flex-wrap gap-2">
                {isSimilaritySearch && (
                  <span className="inline-flex items-center whitespace-nowrap rounded-full bg-blue-100 px-2 py-0.5 text-sm text-blue-800">
                    Similarity Search
                    <button
                      onClick={handleClearInput}
                      className="ml-1 focus:outline-none"
                      aria-label="Clear similarity search"
                    >
                      <LuX className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {Object.entries(filters).map(([filterType, filterValues]) =>
                  Array.isArray(filterValues) ? (
                    filterValues.map((value, index) => (
                      <span
                        key={`${filterType}-${index}`}
                        className="inline-flex items-center whitespace-nowrap rounded-full bg-green-100 px-2 py-0.5 text-sm text-green-800"
                      >
                        {filterType}:{value}
                        <button
                          onClick={() =>
                            removeFilter(filterType as FilterType, value)
                          }
                          className="ml-1 focus:outline-none"
                          aria-label={`Remove ${filterType}:${value} filter`}
                        >
                          <LuX className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span
                      key={filterType}
                      className="inline-flex items-center whitespace-nowrap rounded-full bg-green-100 px-2 py-0.5 text-sm text-green-800"
                    >
                      {filterType}:
                      {filterType === "before" || filterType === "after"
                        ? new Date(filterValues as number).toLocaleDateString()
                        : filterValues}
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
            )}
          {showSuggestions && (
            <div
              ref={suggestionRef}
              className="mt-1"
              role="listbox"
              id="suggestions-list"
            >
              {!currentFilterType && searchHistory.length > 0 && (
                <>
                  <h3 className="px-2 py-1 text-xs font-semibold text-secondary-foreground">
                    Previous Searches
                  </h3>
                  {searchHistory.map((suggestion, index) => (
                    <button
                      key={index}
                      className={`w-full rounded px-2 py-1 text-left text-sm text-primary ${
                        index === selectedSuggestionIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setSelectedSuggestionIndex(index)}
                      role="option"
                      aria-selected={index === selectedSuggestionIndex}
                    >
                      {suggestion}
                    </button>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <h3 className="px-2 py-1 text-xs font-semibold text-secondary-foreground">
                {currentFilterType ? "Filter Values" : "Filters"}
              </h3>
              {suggestions
                .filter((item) => !searchHistory.includes(item))
                .map((suggestion, index) => (
                  <button
                    key={index + searchHistory.length}
                    className={`w-full rounded px-2 py-1 text-left text-sm text-primary ${
                      index + searchHistory.length === selectedSuggestionIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() =>
                      setSelectedSuggestionIndex(index + searchHistory.length)
                    }
                    role="option"
                    aria-selected={
                      index + searchHistory.length === selectedSuggestionIndex
                    }
                  >
                    {suggestion}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
