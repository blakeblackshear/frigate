import useApiFilter from "@/hooks/use-api-filter";
import { useCameraPreviews } from "@/hooks/use-camera-previews";
import { useOverlayState } from "@/hooks/use-overlay-state";
import { FrigateConfig } from "@/types/frigateConfig";
import { RecordingStartingPoint } from "@/types/record";
import { SearchFilter, SearchResult } from "@/types/search";
import { TimeRange } from "@/types/timeline";
import { RecordingView } from "@/views/recording/RecordingView";
import SearchView from "@/views/search/SearchView";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

export default function Search() {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  // search field handler

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [recording, setRecording] =
    useOverlayState<RecordingStartingPoint>("recording");

  // search filter

  const [searchFilter, setSearchFilter, searchSearchParams] =
    useApiFilter<SearchFilter>();

  const onUpdateFilter = useCallback(
    (newFilter: SearchFilter) => {
      setSearchFilter(newFilter);
    },
    [setSearchFilter],
  );

  // search api

  const [similaritySearch, setSimilaritySearch] = useState<SearchResult>();

  useEffect(() => {
    if (similaritySearch) {
      setSimilaritySearch(undefined);
    }

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    setSearchTimeout(
      setTimeout(() => {
        setSearchTimeout(undefined);
        setSearchTerm(search);
      }, 500),
    );
    // we only want to update the searchTerm when search changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const searchQuery = useMemo(() => {
    if (searchTerm.length == 0) {
      return null;
    }

    if (similaritySearch) {
      return [
        "events/search",
        {
          query: similaritySearch.id,
          cameras: searchSearchParams["cameras"],
          labels: searchSearchParams["labels"],
          zones: searchSearchParams["zones"],
          before: searchSearchParams["before"],
          after: searchSearchParams["after"],
          include_thumbnails: 0,
          search_type: "thumbnail",
        },
      ];
    }

    return [
      "events/search",
      {
        query: searchTerm,
        cameras: searchSearchParams["cameras"],
        labels: searchSearchParams["labels"],
        zones: searchSearchParams["zones"],
        before: searchSearchParams["before"],
        after: searchSearchParams["after"],
        include_thumbnails: 0,
      },
    ];
  }, [searchTerm, searchSearchParams, similaritySearch]);

  const { data: searchResults, isLoading } =
    useSWR<SearchResult[]>(searchQuery);

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
          updateFilter={onUpdateFilter}
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
        allPreviews={allPreviews}
        isLoading={isLoading}
        setSearch={setSearch}
        setSimilaritySearch={setSimilaritySearch}
        onUpdateFilter={onUpdateFilter}
        onOpenSearch={onOpenSearch}
      />
    );
  }
}
