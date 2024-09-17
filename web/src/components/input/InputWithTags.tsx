import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LuX, LuFilter } from "react-icons/lu";
import { SearchFilter, SearchSource } from "@/types/search";

type FilterType = keyof SearchFilter;

// Custom hook for managing suggestions
const useSuggestions = (
  filters: SearchFilter,
  allSuggestions: { [K in keyof SearchFilter]: string[] },
) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const updateSuggestions = useCallback(
    (value: string, currentFilterType: FilterType | null) => {
      if (currentFilterType) {
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
        setSuggestions([...availableFilters]);
      }
    },
    [filters, allSuggestions],
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
  allSuggestions: {
    [K in keyof SearchFilter]: string[];
  };
};

export default function InputWithTags({
  filters,
  setFilters,
  allSuggestions,
}: InputWithTagsProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentFilterType, setCurrentFilterType] = useState<FilterType | null>(
    null,
  );
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
  } = useSuggestions(filters, allSuggestions);

  const resetSuggestions = useCallback(
    (value: string) => {
      setCurrentFilterType(null);
      updateSuggestions(value, null);
    },
    [updateSuggestions],
  );

  const removeFilter = useCallback(
    (filterType: keyof SearchFilter, filterValue: string | number) => {
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
      if (allSuggestions[type]?.includes(value)) {
        const newFilters = { ...filters };

        switch (type) {
          case "before":
          case "after":
            newFilters[type] = parseFloat(value);
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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      const words = value.split(" ");
      const currentWord = words[words.length - 1];

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

          // If filter value is valid, apply the filter
          if (allSuggestions[filterType]?.includes(filterValue.trim())) {
            createFilter(filterType, filterValue.trim());

            // Remove the applied filter from the input
            setInputValue((prev) =>
              prev.replace(`${filterType}:${filterValue}`, "").trim(),
            );
            setCurrentFilterType(null);
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
      createFilter,
      setSelectedSuggestionIndex,
    ],
  );

  const handleInputFocus = useCallback(() => {
    setShowSuggestions(true);
    setShowFilters(true);
    updateSuggestions(inputValue, currentFilterType);
  }, [inputValue, currentFilterType, updateSuggestions]);

  const handleClearInput = useCallback(() => {
    setInputValue("");
    setFilters({});
    setCurrentFilterType(null);
    updateSuggestions("", null);
    setShowSuggestions(false);
  }, [setFilters, updateSuggestions]);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setShowFilters(false);
      }
    }, 0);
  }, []);

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
        const currentWord = inputValue.split(" ").pop() || "";
        if (allSuggestions[currentFilterType]?.includes(currentWord)) {
          createFilter(currentFilterType, currentWord);
        }
      }
    },
    [
      suggestions,
      selectedSuggestionIndex,
      handleSuggestionClick,
      currentFilterType,
      inputValue,
      createFilter,
      setSelectedSuggestionIndex,
      allSuggestions,
    ],
  );

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
          {Object.keys(filters).length > 0 && (
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
              <LuFilter className="h-4 w-4" />
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
      {(showFilters || showSuggestions) && (
        <div className="absolute left-0 top-11 z-[100] w-full rounded-md border border-t-0 border-gray-200 bg-background p-2 text-primary shadow-md">
          {showFilters && Object.keys(filters).length > 0 && (
            <div ref={filterRef} className="my-2 flex flex-wrap gap-2">
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
                    {filterType}:{filterValues}
                    <button
                      onClick={() =>
                        removeFilter(
                          filterType as FilterType,
                          filterValues as string,
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
              className="scrollbar-container mt-1 max-h-[200px] overflow-y-auto"
              role="listbox"
              id="suggestions-list"
            >
              {!currentFilterType && searchHistory.length > 0 && (
                <>
                  <h3 className="px-2 py-1 text-xs font-semibold text-gray-500">
                    Previous Searches
                  </h3>
                  {searchHistory.map((suggestion, index) => (
                    <button
                      key={index}
                      className={`w-full rounded px-2 py-1 text-left text-sm ${
                        index === selectedSuggestionIndex
                          ? "bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      role="option"
                      aria-selected={index === selectedSuggestionIndex}
                    >
                      {suggestion}
                    </button>
                  ))}
                  <div className="my-1 border-t border-gray-200" />
                </>
              )}
              <h3 className="px-2 py-1 text-xs font-semibold text-gray-500">
                {currentFilterType ? "Filter Values" : "Filters"}
              </h3>
              {suggestions
                // .filter((item) => !searchHistory.includes(item))
                .map((suggestion, index) => (
                  <button
                    key={index + (currentFilterType ? 0 : searchHistory.length)}
                    className={`w-full rounded px-2 py-1 text-left text-sm ${
                      index + (currentFilterType ? 0 : searchHistory.length) ===
                      selectedSuggestionIndex
                        ? "bg-blue-100"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    role="option"
                    aria-selected={
                      index + (currentFilterType ? 0 : searchHistory.length) ===
                      selectedSuggestionIndex
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
