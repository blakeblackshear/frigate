import { useApiFilterArgs } from "@/hooks/use-api-filter";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import { SearchFilter, SearchQuery, SearchResult } from "@/types/search";
import SearchView from "@/views/search/SearchView";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";

const API_LIMIT = 25;

export default function Explore() {
  // search field handler

  const [search, setSearch] = useState("");

  const [searchFilter, setSearchFilter, searchSearchParams] =
    useApiFilterArgs<SearchFilter>();

  const searchTerm = useMemo(
    () => searchSearchParams?.["query"] || "",
    [searchSearchParams],
  );

  // search filter

  const similaritySearch = useMemo(() => {
    if (!searchTerm.includes("similarity:")) {
      return undefined;
    }

    return searchTerm.split(":")[1];
  }, [searchTerm]);

  // search api

  useSearchEffect("query", (query) => {
    setSearch(query);
    return false;
  });

  useSearchEffect("similarity_search_id", (similarityId) => {
    setSearch(`similarity:${similarityId}`);
    // @ts-expect-error we want to clear this
    setSearchFilter({ ...searchFilter, similarity_search_id: undefined });
    return false;
  });

  useEffect(() => {
    if (!searchTerm && !search) {
      return;
    }

    setSearchFilter({
      ...searchFilter,
      query: search.length > 0 ? search : undefined,
    });
    // only update when search is updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const searchQuery: SearchQuery = useMemo(() => {
    if (similaritySearch) {
      return [
        "events/search",
        {
          query: similaritySearch,
          cameras: searchSearchParams["cameras"],
          labels: searchSearchParams["labels"],
          sub_labels: searchSearchParams["subLabels"],
          zones: searchSearchParams["zones"],
          before: searchSearchParams["before"],
          after: searchSearchParams["after"],
          include_thumbnails: 0,
          search_type: "similarity",
        },
      ];
    }

    if (searchTerm) {
      return [
        "events/search",
        {
          query: searchTerm,
          cameras: searchSearchParams["cameras"],
          labels: searchSearchParams["labels"],
          sub_labels: searchSearchParams["subLabels"],
          zones: searchSearchParams["zones"],
          before: searchSearchParams["before"],
          after: searchSearchParams["after"],
          search_type: searchSearchParams["search_type"],
          include_thumbnails: 0,
        },
      ];
    }

    if (searchSearchParams && Object.keys(searchSearchParams).length !== 0) {
      return [
        "events",
        {
          cameras: searchSearchParams["cameras"],
          labels: searchSearchParams["labels"],
          sub_labels: searchSearchParams["subLabels"],
          zones: searchSearchParams["zones"],
          before: searchSearchParams["before"],
          after: searchSearchParams["after"],
          search_type: searchSearchParams["search_type"],
          limit:
            Object.keys(searchSearchParams).length == 0 ? API_LIMIT : undefined,
          in_progress: 0,
          include_thumbnails: 0,
        },
      ];
    }

    return null;
  }, [searchTerm, searchSearchParams, similaritySearch]);

  // paging

  const getKey = (
    pageIndex: number,
    previousPageData: SearchResult[] | null,
  ): SearchQuery => {
    if (previousPageData && !previousPageData.length) return null; // reached the end
    if (!searchQuery) return null;

    const [url, params] = searchQuery;

    // If it's not the first page, use the last item's start_time as the 'before' parameter
    if (pageIndex > 0 && previousPageData) {
      const lastDate = previousPageData[previousPageData.length - 1].start_time;
      return [
        url,
        { ...params, before: lastDate.toString(), limit: API_LIMIT },
      ];
    }

    // For the first page, use the original params
    return [url, { ...params, limit: API_LIMIT }];
  };

  const { data, size, setSize, isValidating } = useSWRInfinite<SearchResult[]>(
    getKey,
    {
      revalidateFirstPage: true,
      revalidateAll: false,
    },
  );

  const searchResults = useMemo(
    () => (data ? ([] as SearchResult[]).concat(...data) : []),
    [data],
  );
  const isLoadingInitialData = !data && !isValidating;
  const isLoadingMore =
    isLoadingInitialData ||
    (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.length === 0;
  const isReachingEnd =
    isEmpty || (data && data[data.length - 1]?.length < API_LIMIT);

  const loadMore = useCallback(() => {
    if (!isReachingEnd && !isLoadingMore) {
      if (searchQuery) {
        const [url] = searchQuery;

        // for chroma, only load 100 results for description and similarity
        if (url === "events/search" && searchResults.length >= 100) {
          return;
        }
      }

      setSize(size + 1);
    }
  }, [isReachingEnd, isLoadingMore, setSize, size, searchResults, searchQuery]);

  return (
    <SearchView
      search={search}
      searchTerm={searchTerm}
      searchFilter={searchFilter}
      searchResults={searchResults}
      isLoading={(isLoadingInitialData || isLoadingMore) ?? true}
      setSearch={setSearch}
      setSimilaritySearch={(search) => setSearch(`similarity:${search.id}`)}
      setSearchFilter={setSearchFilter}
      onUpdateFilter={setSearchFilter}
      loadMore={loadMore}
      hasMore={!isReachingEnd}
    />
  );
}
