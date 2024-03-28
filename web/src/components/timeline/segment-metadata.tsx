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
  return (
    <>
      {isFirstSegmentInMinimap && (
        <div
          className="absolute inset-0 -bottom-7 w-full flex items-center justify-center text-primary-foreground font-medium z-20 text-center text-[10px] scroll-mt-8 pointer-events-none select-none"
          ref={firstMinimapSegmentRef}
        >
          {new Date(alignedMinimapStartTime * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            ...(!dense && { month: "short", day: "2-digit" }),
          })}
        </div>
      )}

      {isLastSegmentInMinimap && (
        <div className="absolute inset-0 -top-3 w-full flex items-center justify-center text-primary-foreground font-medium z-20 text-center text-[10px] pointer-events-none select-none">
          {new Date(alignedMinimapEndTime * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            ...(!dense && { month: "short", day: "2-digit" }),
          })}
        </div>
      )}
    </>
  );
}

export function Tick({ timestamp, timestampSpread }: TickSegmentProps) {
  return (
    <div className="absolute">
      <div className="flex items-end content-end w-[12px] h-[8px]">
        <div
          className={`pointer-events-none select-none h-0.5 ${
            timestamp.getMinutes() % timestampSpread === 0 &&
            timestamp.getSeconds() === 0
              ? "w-[12px] bg-neutral-600 dark:bg-neutral-500"
              : timestamp.getMinutes() % (timestampSpread == 15 ? 5 : 1) ===
                    0 && timestamp.getSeconds() === 0
                ? "w-[8px] bg-neutral-500" // Minor tick mark
                : "w-[5px] bg-neutral-400 dark:bg-neutral-600"
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
  return (
    <div className="absolute left-[15px] h-[8px] z-10">
      {!isFirstSegmentInMinimap && !isLastSegmentInMinimap && (
        <div
          key={`${segmentKey}_timestamp`}
          className="pointer-events-none select-none text-[8px] text-neutral-600 dark:text-neutral-500"
        >
          {timestamp.getMinutes() % timestampSpread === 0 &&
            timestamp.getSeconds() === 0 &&
            timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
        </div>
      )}
    </div>
  );
}
