import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  segmentKey: string;
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
  const { t } = useTranslation(["common"]);
  const timeFormat = config?.ui.time_format === "24hour" ? "24hour" : "12hour";

  const formatKey = dense
    ? `time.formattedTimestampHourMinute.${timeFormat}`
    : `time.formattedTimestampMonthDayHourMinute.${timeFormat}`;

  const formattedStartTime = useFormattedTimestamp(
    alignedMinimapStartTime,
    t(formatKey),
    config?.ui.timezone,
  );

  const formattedEndTime = useFormattedTimestamp(
    alignedMinimapEndTime,
    t(formatKey),
    config?.ui.timezone,
  );

  return (
    <>
      {isFirstSegmentInMinimap && (
        <div
          className="pointer-events-none absolute inset-0 -bottom-7 z-20 flex w-full select-none scroll-mt-8 items-center justify-center text-center text-[10px] font-medium text-primary"
          ref={firstMinimapSegmentRef}
        >
          {formattedStartTime}
        </div>
      )}

      {isLastSegmentInMinimap && (
        <div className="pointer-events-none absolute inset-0 -top-3 z-20 flex w-full select-none items-center justify-center text-center text-[10px] font-medium text-primary">
          {formattedEndTime}
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
  const { t } = useTranslation(["common"]);
  const { data: config } = useSWR<FrigateConfig>("config");

  const timeFormat = config?.ui.time_format === "24hour" ? "24hour" : "12hour";
  const format = t(`time.formattedTimestampHourMinute.${timeFormat}`);

  const formattedTimestamp = useFormattedTimestamp(
    timestamp.getTime() / 1000,
    format,
    config?.ui.timezone,
  );

  const shouldDisplay = useMemo(() => {
    return (
      timestamp.getMinutes() % timestampSpread === 0 &&
      timestamp.getSeconds() === 0
    );
  }, [timestamp, timestampSpread]);

  return (
    <div className="absolute left-[15px] z-10 h-[8px]">
      {!isFirstSegmentInMinimap && !isLastSegmentInMinimap && shouldDisplay && (
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
