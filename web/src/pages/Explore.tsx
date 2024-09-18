import { useApiFilterArgs } from "@/hooks/use-api-filter";
import { useCameraPreviews } from "@/hooks/use-camera-previews";
import { useOverlayState, useSearchEffect } from "@/hooks/use-overlay-state";
import { FrigateConfig } from "@/types/frigateConfig";
import { RecordingStartingPoint } from "@/types/record";
import { SearchFilter, SearchQuery, SearchResult } from "@/types/search";
import { TimeRange } from "@/types/timeline";
import { RecordingView } from "@/views/recording/RecordingView";
import SearchView from "@/views/search/SearchView";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

const API_LIMIT = 25;

export default function Explore() {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  // search field handler

  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [recording, setRecording] =
    useOverlayState<RecordingStartingPoint>("recording");

  // search filter

  const similaritySearch = useMemo(() => {
    if (!searchTerm.includes("similarity:")) {
      return undefined;
    }

    return searchTerm.split(":")[1];
  }, [searchTerm]);

  const [searchFilter, setSearchFilter, searchSearchParams] =
    useApiFilterArgs<SearchFilter>();

  // search api

  useSearchEffect("similarity_search_id", (similarityId) => {
    setSearch(`similarity:${similarityId}`);
    // @ts-expect-error we want to clear this
    setSearchFilter({ ...searchFilter, similarity_search_id: undefined });
    return false;
  });

  useEffect(() => {
    setSearchTerm(search);
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

  // previews

  const previewTimeRange = useMemo<TimeRange>(() => {
    if (!searchResults) {
      return { after: 0, before: 0 };
    }

    return {
      after: Math.min(...searchResults.map((res) => res.start_time)),
      before: Math.max(
        ...searchResults.map((res) => res.end_time ?? Date.now() / 1000),
      ),
    };
  }, [searchResults]);

  const allPreviews = useCameraPreviews(previewTimeRange, {
    autoRefresh: false,
    fetchPreviews: searchResults != undefined,
  });

  // selection

  const onOpenSearch = useCallback(
    (item: SearchResult) => {
      setRecording({
        camera: item.camera,
        startTime: item.start_time,
        severity: "alert",
      });
    },
    [setRecording],
  );

  const selectedReviewData = useMemo(() => {
    if (!recording) {
      return undefined;
    }

    if (!config) {
      return undefined;
    }

    if (!searchResults) {
      return undefined;
    }

    const allCameras = searchFilter?.cameras ?? Object.keys(config.cameras);

    return {
      camera: recording.camera,
      start_time: recording.startTime,
      allCameras: allCameras,
    };

    // previews will not update after item is selected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, searchResults]);

  const selectedTimeRange = useMemo(() => {
    if (!recording) {
      return undefined;
    }

    const time = new Date(recording.startTime * 1000);
    time.setUTCMinutes(0, 0, 0);
    const start = time.getTime() / 1000;
    time.setHours(time.getHours() + 2);
    const end = time.getTime() / 1000;
    return {
      after: start,
      before: end,
    };
  }, [recording]);

  if (recording) {
    if (selectedReviewData && selectedTimeRange) {
      return (
        <RecordingView
          startCamera={selectedReviewData.camera}
          startTime={selectedReviewData.start_time}
          allCameras={selectedReviewData.allCameras}
          allPreviews={allPreviews}
          timeRange={selectedTimeRange}
          updateFilter={setSearchFilter}
        />
      );
    }
  } else {
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
        onOpenSearch={onOpenSearch}
        loadMore={loadMore}
        hasMore={!isReachingEnd}
      />
    );
  }
}
