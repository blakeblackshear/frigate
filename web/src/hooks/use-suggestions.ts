import { FilterType, SavedSearchQuery, SearchFilter } from "@/types/search";
import { useCallback, useState } from "react";

// Custom hook for managing suggestions
export type UseSuggestionsType = (
  filters: SearchFilter,
  allSuggestions: { [K in keyof SearchFilter]: string[] },
  searchHistory: SavedSearchQuery[],
) => ReturnType<typeof useSuggestions>;

// Define and export the useSuggestions hook
export default function useSuggestions(
  filters: SearchFilter,
  allSuggestions: { [K in keyof SearchFilter]: string[] },
  searchHistory?: SavedSearchQuery[],
) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
          ...(searchHistory?.map((search) => search.name) ?? []),
          ...availableFilters,
        ]);
      }
    },
    [filters, allSuggestions, searchHistory],
  );

  return {
    suggestions,
    updateSuggestions,
  };
}
