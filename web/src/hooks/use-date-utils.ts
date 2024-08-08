import { FrigateConfig } from "@/types/frigateConfig";
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

export function useTimezone(config: FrigateConfig | undefined) {
  return useMemo(() => {
    if (!config) {
      return undefined;
    }

    return (
      config.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    );
  }, [config]);
}
