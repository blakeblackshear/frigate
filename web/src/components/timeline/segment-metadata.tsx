import { isDesktop } from "react-device-detect";

type MinimapSegmentProps = {
  isFirstSegmentInMinimap: boolean;
  isLastSegmentInMinimap: boolean;
  alignedMinimapStartTime: number;
  alignedMinimapEndTime: number;
  firstMinimapSegmentRef: React.MutableRefObject<HTMLDivElement | null>;
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
}: MinimapSegmentProps) {
  return (
    <>
      {isFirstSegmentInMinimap && (
        <div
          className="absolute inset-0 -bottom-7 w-full flex items-center justify-center text-primary-foreground font-medium z-20 text-center text-[10px] scroll-mt-8"
          ref={firstMinimapSegmentRef}
        >
          {new Date(alignedMinimapStartTime * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            ...(isDesktop && { month: "short", day: "2-digit" }),
          })}
        </div>
      )}

      {isLastSegmentInMinimap && (
        <div className="absolute inset-0 -top-3 w-full flex items-center justify-center text-primary-foreground font-medium z-20 text-center text-[10px]">
          {new Date(alignedMinimapEndTime * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            ...(isDesktop && { month: "short", day: "2-digit" }),
          })}
        </div>
      )}
    </>
  );
}

export function Tick({ timestamp, timestampSpread }: TickSegmentProps) {
  return (
    <div className="absolute">
      <div className="flex items-end content-end w-[12px] h-2">
        <div
          className={`h-0.5 ${
            timestamp.getMinutes() % timestampSpread === 0 &&
            timestamp.getSeconds() === 0
              ? "w-[12px] bg-gray-400"
              : "w-[8px] bg-gray-600"
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
    <div className="absolute left-[15px] top-[1px] h-2 z-10">
      {!isFirstSegmentInMinimap && !isLastSegmentInMinimap && (
        <div
          key={`${segmentKey}_timestamp`}
          className="text-[8px] text-gray-400"
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
