import SearchFilterGroup from "@/components/filter/SearchFilterGroup";
import SearchThumbnailPlayer from "@/components/player/SearchThumbnailPlayer";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { SearchResult } from "@/types/search";
import { useEffect, useState } from "react";
import { LuSearchCheck } from "react-icons/lu";
import useSWR from "swr";

export default function Search() {
  // search field handler

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // search api

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    setSearchTimeout(
      setTimeout(() => {
        setSearchTimeout(undefined);
        setSearchTerm(search);
      }, 500),
    );
  }, [search]);

  const { data: searchResults } = useSWR<SearchResult[]>(
    searchTerm.length > 0 ? ["events/search", { query: searchTerm }] : null,
  );

  return (
    <div className="flex size-full flex-col pt-2 md:py-2">
      <Toaster closeButton={true} />

      <div className="relative mb-2 flex h-11 items-center justify-between pl-2 pr-2 md:pl-3">
        <Input
          className="w-full bg-muted md:w-1/3"
          placeholder="Search for a specific detection..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <SearchFilterGroup onUpdateFilter={() => {}} />
      </div>

      <div className="no-scrollbar flex flex-1 flex-wrap content-start gap-2 overflow-y-auto md:gap-4">
        {searchTerm == "" && (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
            <LuSearchCheck className="size-16" />
            Search For Detections
          </div>
        )}

        {searchResults &&
          searchResults.map((value) => {
            const selected = false;

            return (
              <div
                key={value.id}
                data-start={value.start_time}
                className="review-item relative rounded-lg"
              >
                <div className="aspect-video overflow-hidden rounded-lg">
                  <SearchThumbnailPlayer
                    searchResult={value}
                    allPreviews={[]}
                    scrollLock={false}
                    onClick={() => {}}
                    //onTimeUpdate={onPreviewTimeUpdate}
                    //onClick={onSelectReview}
                  />
                </div>
                <div
                  className={`review-item-ring pointer-events-none absolute inset-0 z-10 size-full rounded-lg outline outline-[3px] -outline-offset-[2.8px] ${selected ? `shadow-severity_alert outline-severity_alert` : "outline-transparent duration-500"}`}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
