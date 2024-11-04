import { FrigateConfig } from "@/types/frigateConfig";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useMemo } from "react";
import useSWR from "swr";

type MinimapSegmentProps = {
  isFirstSegmentInMinimap: boolean;
  isLastSegmentInMinimap: boolean;
  alignedMinimapStartTime: number;
  alignedMinimapEndTime: number;
  firstMinimapSegmentRef: React.MutableRefObject<HTMLDivElement | null>;
  dense: boolean;
};

type TickSegmentProps = {
  timestamp: Date;
  timestampSpread: number;
};

type TimestampSegmentProps = {
  isFirstSegmentInMinimap: boolean;
  isLastSegmentInMinimap: boolean;
  timestamp: Date;
  timestampSpread: number;
  segmentKey: number;
};

export function MinimapBounds({
  isFirstSegmentInMinimap,
  isLastSegmentInMinimap,
  alignedMinimapStartTime,
  alignedMinimapEndTime,
  firstMinimapSegmentRef,
  dense,
}: MinimapSegmentProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  return (
    <>
      {isFirstSegmentInMinimap && (
        <div
          className="pointer-events-none absolute inset-0 -bottom-7 z-20 flex w-full select-none scroll-mt-8 items-center justify-center text-center text-[10px] font-medium text-primary"
          ref={firstMinimapSegmentRef}
        >
          {formatUnixTimestampToDateTime(alignedMinimapStartTime, {
            timezone: config?.ui.timezone,
            strftime_fmt: !dense
              ? `%b %d, ${config?.ui.time_format == "24hour" ? "%H:%M" : "%I:%M %p"}`
              : `${config?.ui.time_format == "24hour" ? "%H:%M" : "%I:%M %p"}`,
          })}
        </div>
      )}

      {isLastSegmentInMinimap && (
        <div className="pointer-events-none absolute inset-0 -top-3 z-20 flex w-full select-none items-center justify-center text-center text-[10px] font-medium text-primary">
          {formatUnixTimestampToDateTime(alignedMinimapEndTime, {
            timezone: config?.ui.timezone,
            strftime_fmt: !dense
              ? `%b %d, ${config?.ui.time_format == "24hour" ? "%H:%M" : "%I:%M %p"}`
              : `${config?.ui.time_format == "24hour" ? "%H:%M" : "%I:%M %p"}`,
          })}
        </div>
      )}
    </>
  );
}

export function Tick({ timestamp, timestampSpread }: TickSegmentProps) {
  return (
    <div className="absolute">
      <div className="flex h-[8px] w-[12px] content-end items-end">
        <div
          className={`pointer-events-none h-0.5 select-none ${
            timestamp.getMinutes() % timestampSpread === 0 &&
            timestamp.getSeconds() === 0
              ? "w-[12px] bg-neutral_variant dark:bg-neutral"
              : timestamp.getMinutes() % (timestampSpread == 15 ? 5 : 1) ===
                    0 && timestamp.getSeconds() === 0
                ? "w-[8px] bg-neutral" // Minor tick mark
                : "w-[5px] bg-neutral-400 dark:bg-neutral_variant"
          }`}
        ></div>
      </div>
    </div>
  );
}

export function Timestamp({
  isFirstSegmentInMinimap,
  isLastSegmentInMinimap,
  timestamp,
  timestampSpread,
  segmentKey,
}: TimestampSegmentProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const formattedTimestamp = useMemo(() => {
    if (
      !(
        timestamp.getMinutes() % timestampSpread === 0 &&
        timestamp.getSeconds() === 0
      )
    ) {
      return undefined;
    }

    return formatUnixTimestampToDateTime(timestamp.getTime() / 1000, {
      timezone: config?.ui.timezone,
      strftime_fmt: config?.ui.time_format == "24hour" ? "%H:%M" : "%I:%M %p",
    });
  }, [config, timestamp, timestampSpread]);

  return (
    <div className="absolute left-[15px] z-10 h-[8px]">
      {!isFirstSegmentInMinimap && !isLastSegmentInMinimap && (
        <div
          key={`${segmentKey}_timestamp`}
          className="pointer-events-none select-none text-[8px] text-neutral_variant dark:text-neutral"
        >
          {formattedTimestamp}
        </div>
      )}
    </div>
  );
}
