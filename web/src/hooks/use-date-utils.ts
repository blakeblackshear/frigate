import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useMemo } from "react";

export function useFormattedTimestamp(timestamp: number, format: string) {
  const formattedTimestamp = useMemo(() => {
    return formatUnixTimestampToDateTime(timestamp, {
      strftime_fmt: format,
    });
  }, [format, timestamp]);

  return formattedTimestamp;
}
