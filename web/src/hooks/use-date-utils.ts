import { FrigateConfig } from "@/types/frigateConfig";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useMemo } from "react";

export function useFormattedTimestamp(
  timestamp: number,
  format: string,
  timezone?: string,
) {
  const formattedTimestamp = useMemo(() => {
    return formatUnixTimestampToDateTime(timestamp, {
      timezone,
      strftime_fmt: format,
    });
  }, [format, timestamp, timezone]);

  return formattedTimestamp;
}

export function useFormattedRange(start: number, end: number, format: string) {
  const formattedStart = useMemo(() => {
    return formatUnixTimestampToDateTime(start, {
      strftime_fmt: format,
    });
  }, [format, start]);
  const formattedEnd = useMemo(() => {
    return formatUnixTimestampToDateTime(end, {
      strftime_fmt: format,
    });
  }, [format, end]);

  return `${formattedStart} - ${formattedEnd}`;
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
