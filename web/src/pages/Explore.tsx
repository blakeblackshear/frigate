import { useEventUpdate, useModelState } from "@/api/ws";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useApiFilterArgs } from "@/hooks/use-api-filter";
import { useTimezone } from "@/hooks/use-date-utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { SearchFilter, SearchQuery, SearchResult } from "@/types/search";
import { ModelState } from "@/types/ws";
import SearchView from "@/views/search/SearchView";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuCheck, LuExternalLink, LuX } from "react-icons/lu";
import { TbExclamationCircle } from "react-icons/tb";
import { Link } from "react-router-dom";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

const API_LIMIT = 25;

export default function Explore() {
  // search field handler

  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const timezone = useTimezone(config);

  const [search, setSearch] = useState("");

  const [searchFilter, setSearchFilter, searchSearchParams] =
    useApiFilterArgs<SearchFilter>();

  const searchTerm = useMemo(
    () => searchSearchParams?.["query"] || "",
    [searchSearchParams],
  );

  const similaritySearch = useMemo(
    () => searchSearchParams["search_type"] == "similarity",
    [searchSearchParams],
  );

  useEffect(() => {
    if (!searchTerm && !search) {
      return;
    }

    // switch back to normal search when query is entered
    setSearchFilter({
      ...searchFilter,
      search_type:
        similaritySearch && search ? undefined : searchFilter?.search_type,
      event_id: similaritySearch && search ? undefined : searchFilter?.event_id,
      query: search.length > 0 ? search : undefined,
    });
    // only update when search is updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const searchQuery: SearchQuery = useMemo(() => {
    // no search parameters
    if (searchSearchParams && Object.keys(searchSearchParams).length === 0) {
      return null;
    }

    // parameters, but no search term and not similarity
    if (
      searchSearchParams &&
      Object.keys(searchSearchParams).length !== 0 &&
      !searchTerm &&
      !similaritySearch
    ) {
      return [
        "events",
        {
          cameras: searchSearchParams["cameras"],
          labels: searchSearchParams["labels"],
          sub_labels: searchSearchParams["sub_labels"],
          zones: searchSearchParams["zones"],
          before: searchSearchParams["before"],
          after: searchSearchParams["after"],
          time_range: searchSearchParams["time_range"],
          search_type: searchSearchParams["search_type"],
          limit:
            Object.keys(searchSearchParams).length == 0 ? API_LIMIT : undefined,
          timezone,
          in_progress: 0,
          include_thumbnails: 0,
        },
      ];
    }

    // parameters and search term
    if (!similaritySearch) {
      setSearch(searchTerm);
    }

    return [
      "events/search",
      {
        query: similaritySearch ? undefined : searchTerm,
        cameras: searchSearchParams["cameras"],
        labels: searchSearchParams["labels"],
        sub_labels: searchSearchParams["sub_labels"],
        zones: searchSearchParams["zones"],
        before: searchSearchParams["before"],
        after: searchSearchParams["after"],
        time_range: searchSearchParams["time_range"],
        search_type: searchSearchParams["search_type"],
        event_id: searchSearchParams["event_id"],
        timezone,
        include_thumbnails: 0,
      },
    ];
  }, [searchTerm, searchSearchParams, similaritySearch, timezone]);

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

  const { data, size, setSize, isValidating, mutate } = useSWRInfinite<
    SearchResult[]
  >(getKey, {
    revalidateFirstPage: true,
    revalidateOnFocus: true,
    revalidateAll: false,
  });

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

        // for embeddings, only load 100 results for description and similarity
        if (url === "events/search" && searchResults.length >= 100) {
          return;
        }
      }

      setSize(size + 1);
    }
  }, [isReachingEnd, isLoadingMore, setSize, size, searchResults, searchQuery]);

  // mutation and revalidation

  const eventUpdate = useEventUpdate();

  useEffect(() => {
    mutate();
    // mutate / revalidate when event description updates come in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventUpdate]);

  // model states

  const { payload: minilmModelState } = useModelState(
    "sentence-transformers/all-MiniLM-L6-v2-model.onnx",
  );
  const { payload: minilmTokenizerState } = useModelState(
    "sentence-transformers/all-MiniLM-L6-v2-tokenizer",
  );
  const { payload: clipImageModelState } = useModelState(
    "clip-clip_image_model_vitb32.onnx",
  );
  const { payload: clipTextModelState } = useModelState(
    "clip-clip_text_model_vitb32.onnx",
  );

  const allModelsLoaded = useMemo(() => {
    return (
      minilmModelState === "downloaded" &&
      minilmTokenizerState === "downloaded" &&
      clipImageModelState === "downloaded" &&
      clipTextModelState === "downloaded"
    );
  }, [
    minilmModelState,
    minilmTokenizerState,
    clipImageModelState,
    clipTextModelState,
  ]);

  const renderModelStateIcon = (modelState: ModelState) => {
    if (modelState === "downloading") {
      return <ActivityIndicator className="size-5" />;
    }
    if (modelState === "downloaded") {
      return <LuCheck className="size-5 text-success" />;
    }
    if (modelState === "not_downloaded" || modelState === "error") {
      return <LuX className="size-5 text-danger" />;
    }
    return null;
  };

  if (
    !minilmModelState ||
    !minilmTokenizerState ||
    !clipImageModelState ||
    !clipTextModelState
  ) {
    return (
      <ActivityIndicator className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    );
  }

  return (
    <>
      {!allModelsLoaded ? (
        <div className="absolute inset-0 left-1/2 top-1/2 flex h-96 w-96 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center justify-center space-y-3 rounded-lg bg-background/50 p-5">
            <div className="my-5 flex flex-col items-center gap-2 text-xl">
              <TbExclamationCircle className="mb-3 size-10" />
              <div>Search Unavailable</div>
            </div>
            <div className="max-w-96 text-center">
              Frigate is downloading the necessary embeddings models to support
              semantic searching. This may take several minutes depending on the
              speed of your network connection.
            </div>
            <div className="flex w-96 flex-col gap-2 py-5">
              <div className="flex flex-row items-center justify-center gap-2">
                {renderModelStateIcon(clipImageModelState)}
                CLIP image model
              </div>
              <div className="flex flex-row items-center justify-center gap-2">
                {renderModelStateIcon(clipTextModelState)}
                CLIP text model
              </div>
              <div className="flex flex-row items-center justify-center gap-2">
                {renderModelStateIcon(minilmModelState)}
                MiniLM sentence model
              </div>
              <div className="flex flex-row items-center justify-center gap-2">
                {renderModelStateIcon(minilmTokenizerState)}
                MiniLM tokenizer
              </div>
            </div>
            {(minilmModelState === "error" ||
              clipImageModelState === "error" ||
              clipTextModelState === "error") && (
              <div className="my-3 max-w-96 text-center text-danger">
                An error has occurred. Check Frigate logs.
              </div>
            )}
            <div className="max-w-96 text-center">
              You may want to reindex the embeddings of your tracked objects
              once the models are downloaded.
            </div>
            <div className="flex max-w-96 items-center text-primary-variant">
              <Link
                to="https://docs.frigate.video/configuration/semantic_search"
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                Read the documentation{" "}
                <LuExternalLink className="ml-2 inline-flex size-3" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <SearchView
          search={search}
          searchTerm={searchTerm}
          searchFilter={searchFilter}
          searchResults={searchResults}
          isLoading={(isLoadingInitialData || isLoadingMore) ?? true}
          setSearch={setSearch}
          setSimilaritySearch={(search) => {
            setSearchFilter({
              ...searchFilter,
              search_type: ["similarity"],
              event_id: search.id,
            });
          }}
          setSearchFilter={setSearchFilter}
          onUpdateFilter={setSearchFilter}
          loadMore={loadMore}
          hasMore={!isReachingEnd}
        />
      )}
    </>
  );
}
