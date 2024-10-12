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

function use24HourTime(config: FrigateConfig | undefined) {
  const localeUses24HourTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
      })
        ?.formatToParts(new Date(2020, 0, 1, 13))
        ?.find((part) => part.type === "hour")?.value?.length === 2,
    [],
  );

  return useMemo(() => {
    if (!config) {
      return false;
    }

    if (config.ui.time_format != "browser") {
      return config.ui.time_format == "24hour";
    }

    return localeUses24HourTime;
  }, [config, localeUses24HourTime]);
}

export function useFormattedHour(
  config: FrigateConfig | undefined,
  time: string, // hour is assumed to be in 24 hour format per the Date object
) {
  const hour24 = use24HourTime(config);

  return useMemo(() => {
    if (hour24) {
      return time;
    }

    const [hour, minute] = time.includes(":") ? time.split(":") : [time, "00"];
    const hourNum = parseInt(hour);

    const adjustedHour = hourNum % 12 || 12;
    const period = hourNum < 12 ? "AM" : "PM";

    return `${adjustedHour}:${minute} ${period}`;
  }, [hour24, time]);
}
