import TimeAgo from "../dynamic/TimeAgo";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { SearchResult } from "@/types/search";
import ActivityIndicator from "../indicators/activity-indicator";
import SearchResultActions from "../menu/SearchResultActions";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type SearchThumbnailProps = {
  searchResult: SearchResult;
  columns: number;
  findSimilar: () => void;
  refreshResults: () => void;
  showTrackingDetails: () => void;
  addTrigger: () => void;
};

export default function SearchThumbnailFooter({
  searchResult,
  columns,
  findSimilar,
  refreshResults,
  showTrackingDetails,
  addTrigger,
}: SearchThumbnailProps) {
  const { t } = useTranslation(["views/search"]);
  const { data: config } = useSWR<FrigateConfig>("config");

  // date
  const formattedDate = useFormattedTimestamp(
    searchResult.start_time,
    config?.ui.time_format == "24hour"
      ? t("time.formattedTimestampMonthDayHourMinute.24hour", { ns: "common" })
      : t("time.formattedTimestampMonthDayHourMinute.12hour", { ns: "common" }),
    config?.ui.timezone,
  );

  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between gap-2 text-white",
        columns > 4 && "items-start sm:flex-col lg:flex-row lg:items-center",
      )}
    >
      <div className="flex flex-col items-start text-xs text-white/90 drop-shadow-lg">
        {searchResult.end_time ? (
          <TimeAgo time={searchResult.start_time * 1000} dense />
        ) : (
          <div>
            <ActivityIndicator size={14} />
          </div>
        )}
        {formattedDate}
      </div>
      <div className="flex flex-row items-center justify-end gap-5 md:gap-4">
        <SearchResultActions
          searchResult={searchResult}
          findSimilar={findSimilar}
          refreshResults={refreshResults}
          showTrackingDetails={showTrackingDetails}
          addTrigger={addTrigger}
        />
      </div>
    </div>
  );
}
