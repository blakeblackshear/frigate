import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LuX, LuFilter, LuImage } from "react-icons/lu";
import { FilterType, SearchFilter, SearchSource } from "@/types/search";
import useSuggestions from "@/hooks/use-suggestions";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const convertMMDDYYToTimestamp = (dateString: string): number => {
  const match = dateString.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!match) return 0;

  const [, month, day, year] = match;
  const date = new Date(`20${year}-${month}-${day}T00:00:00Z`);
  return date.getTime();
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
  const [currentFilterType, setCurrentFilterType] = useState<FilterType | null>(
    null,
  );
  const [inputFocused, setInputFocused] = useState(false);
  const [isSimilaritySearch, setIsSimilaritySearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  // TODO: search history from browser storage

  const searchHistory = useMemo(
    () => ["previous search 1", "previous search 2"],
    [],
  );

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
      return current_suggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(currentWord.toLowerCase()),
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
      }
    },
    [filters, setFilters, allSuggestions],
  );

  // handlers

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
    (value: string) => {
      if (value === "") {
        return;
      }

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
    },
    [updateSuggestions, resetSuggestions, allSuggestions, handleFilterCreation],
  );

  const handleInputFocus = useCallback(() => {
    setInputFocused(true);
  }, []);

  const handleClearInput = useCallback(() => {
    setInputFocused(false);
    // setInputValue("");
    resetSuggestions("");
    setSearch("");
    inputRef?.current?.blur();
    setFilters({});
    setCurrentFilterType(null);
    setIsSimilaritySearch(false);
  }, [setFilters, resetSuggestions, setSearch]);

  const handleInputBlur = useCallback((e: React.FocusEvent) => {
    if (
      commandRef.current &&
      !commandRef.current.contains(e.relatedTarget as Node)
    ) {
      setInputFocused(false);
    }
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

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setInputFocused(false);
      inputRef?.current?.blur();
    },
    [setSearch],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === "Enter" &&
        inputValue.trim() !== "" &&
        filterSuggestions(suggestions).length == 0
      ) {
        e.preventDefault();

        handleSearch(inputValue);
      }
    },
    [inputValue, handleSearch, filterSuggestions, suggestions],
  );

  // effects

  useEffect(() => {
    updateSuggestions(inputValue, currentFilterType);
  }, [currentFilterType, inputValue, updateSuggestions]);

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
    <Command shouldFilter={false} ref={commandRef} className="rounded-md">
      <div className="relative">
        <CommandInput
          ref={inputRef}
          value={inputValue}
          onValueChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="text-md h-10 pr-20"
          placeholder="Search..."
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 transform space-x-1">
          {(Object.keys(filters).length > 0 || isSimilaritySearch) && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle filters"
              className={
                Object.keys(filters).length > 0 || isSimilaritySearch
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
          {(search || Object.keys(filters).length > 0) && (
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

      <CommandList
        className={cn(
          "scrollbar-container border-t",
          inputFocused ? "visible" : "hidden",
        )}
      >
        {(Object.keys(filters).length > 0 || isSimilaritySearch) && (
          <CommandGroup heading="Active Filters">
            <div className="my-2 flex flex-wrap gap-2">
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
          </CommandGroup>
        )}
        {!currentFilterType && !inputValue && searchHistory.length > 0 && (
          <CommandGroup heading="Previous Searches">
            {searchHistory.map((suggestion, index) => (
              <CommandItem
                key={index}
                className="cursor-pointer"
                onSelect={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading={currentFilterType ? "Filter Values" : "Filters"}>
          {filterSuggestions(suggestions)
            .filter((item) => !searchHistory.includes(item))
            .map((suggestion, index) => (
              <CommandItem
                key={index + searchHistory.length}
                className="cursor-pointer"
                onSelect={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
