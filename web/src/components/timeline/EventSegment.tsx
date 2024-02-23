import { useEventUtils } from "@/hooks/use-event-utils";
import { useSegmentUtils } from "@/hooks/use-segment-utils";
import { ReviewSegment, ReviewSeverity } from "@/types/review";
import React, { useEffect, useMemo, useRef } from "react";

type EventSegmentProps = {
  events: ReviewSegment[];
  segmentTime: number;
  segmentDuration: number;
  timestampSpread: number;
  showMinimap: boolean;
  minimapStartTime?: number;
  minimapEndTime?: number;
  severityType: ReviewSeverity;
};

type MinimapSegmentProps = {
  isFirstSegmentInMinimap: boolean;
  isLastSegmentInMinimap: boolean;
  alignedMinimapStartTime: number;
  alignedMinimapEndTime: number;
  firstMinimapSegmentRef: React.MutableRefObject<HTMLDivElement | null>;
};

type TickSegmentProps = {
  isFirstSegmentInMinimap: boolean;
  isLastSegmentInMinimap: boolean;
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

function MinimapBounds({
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
          className="absolute inset-0 -bottom-5 w-full flex items-center justify-center text-xs text-primary font-medium z-20 text-center text-[8px] scroll-mt-8"
          ref={firstMinimapSegmentRef}
        >
          {new Date(alignedMinimapStartTime * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            month: "short",
            day: "2-digit",
          })}
        </div>
      )}

      {isLastSegmentInMinimap && (
        <div className="absolute inset-0 -top-1 w-full flex items-center justify-center text-xs text-primary font-medium z-20 text-center text-[8px]">
          {new Date(alignedMinimapEndTime * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            month: "short",
            day: "2-digit",
          })}
        </div>
      )}
    </>
  );
}

function Tick({
  isFirstSegmentInMinimap,
  isLastSegmentInMinimap,
  timestamp,
  timestampSpread,
}: TickSegmentProps) {
  return (
    <div className="w-[12px] h-2 flex justify-left items-end">
      {!isFirstSegmentInMinimap && !isLastSegmentInMinimap && (
        <div
          className={`h-0.5 ${
            timestamp.getMinutes() % timestampSpread === 0 &&
            timestamp.getSeconds() === 0
              ? "w-[12px] bg-gray-400"
              : "w-[8px] bg-gray-600"
          }`}
        ></div>
      )}
    </div>
  );
}

function Timestamp({
  isFirstSegmentInMinimap,
  isLastSegmentInMinimap,
  timestamp,
  timestampSpread,
  segmentKey,
}: TimestampSegmentProps) {
  return (
    <div className="w-[36px] pl-[3px] leading-[9px] h-2 flex justify-left items-top z-10">
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

export function EventSegment({
  events,
  segmentTime,
  segmentDuration,
  timestampSpread,
  showMinimap,
  minimapStartTime,
  minimapEndTime,
  severityType,
}: EventSegmentProps) {
  const {
    getSeverity,
    getReviewed,
    displaySeverityType,
    shouldShowRoundedCorners,
  } = useSegmentUtils(segmentDuration, events, severityType);

  const { alignDateToTimeline } = useEventUtils(events, segmentDuration);

  const severity = useMemo(
    () => getSeverity(segmentTime, displaySeverityType),
    [getSeverity, segmentTime]
  );
  const reviewed = useMemo(
    () => getReviewed(segmentTime),
    [getReviewed, segmentTime]
  );
  const { roundTop, roundBottom } = useMemo(
    () => shouldShowRoundedCorners(segmentTime),
    [shouldShowRoundedCorners, segmentTime]
  );

  const timestamp = useMemo(() => new Date(segmentTime * 1000), [segmentTime]);
  const segmentKey = useMemo(() => segmentTime, [segmentTime]);

  const alignedMinimapStartTime = useMemo(
    () => alignDateToTimeline(minimapStartTime ?? 0),
    [minimapStartTime, alignDateToTimeline]
  );
  const alignedMinimapEndTime = useMemo(
    () => alignDateToTimeline(minimapEndTime ?? 0),
    [minimapEndTime, alignDateToTimeline]
  );

  const isInMinimapRange = useMemo(() => {
    return (
      showMinimap &&
      minimapStartTime &&
      minimapEndTime &&
      segmentTime > minimapStartTime &&
      segmentTime < minimapEndTime
    );
  }, [showMinimap, minimapStartTime, minimapEndTime, segmentTime]);

  const isFirstSegmentInMinimap = useMemo(() => {
    return showMinimap && segmentTime === alignedMinimapStartTime;
  }, [showMinimap, segmentTime, alignedMinimapStartTime]);

  const isLastSegmentInMinimap = useMemo(() => {
    return showMinimap && segmentTime === alignedMinimapEndTime;
  }, [showMinimap, segmentTime, alignedMinimapEndTime]);

  const firstMinimapSegmentRef = useRef<HTMLDivElement>(null);

  let debounceTimer: ReturnType<typeof setTimeout>;

  function debounceScrollIntoView(element: HTMLElement) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  useEffect(() => {
    // Check if the first segment is out of view
    const firstSegment = firstMinimapSegmentRef.current;
    if (firstSegment && showMinimap && isFirstSegmentInMinimap) {
      debounceScrollIntoView(firstSegment);
    }
  }, [showMinimap, isFirstSegmentInMinimap, events, segmentDuration]);

  const segmentClasses = `flex flex-row ${
    showMinimap
      ? isInMinimapRange
        ? "bg-card"
        : isLastSegmentInMinimap
          ? ""
          : "opacity-70"
      : ""
  } ${
    isFirstSegmentInMinimap || isLastSegmentInMinimap
      ? "relative h-2 border-b border-gray-500"
      : ""
  }`;

  const severityColors: { [key: number]: string } = {
    1: reviewed
      ? "from-severity_motion-dimmed/50 to-severity_motion/50"
      : "from-severity_motion-dimmed to-severity_motion",
    2: reviewed
      ? "from-severity_detection-dimmed/50 to-severity_detection/50"
      : "from-severity_detection-dimmed to-severity_detection",
    3: reviewed
      ? "from-severity_alert-dimmed/50 to-severity_alert/50"
      : "from-severity_alert-dimmed to-severity_alert",
  };

  return (
    <div key={segmentKey} className={segmentClasses}>
      <MinimapBounds
        isFirstSegmentInMinimap={isFirstSegmentInMinimap}
        isLastSegmentInMinimap={isLastSegmentInMinimap}
        alignedMinimapStartTime={alignedMinimapStartTime}
        alignedMinimapEndTime={alignedMinimapEndTime}
        firstMinimapSegmentRef={firstMinimapSegmentRef}
      />

      <Tick
        isFirstSegmentInMinimap={isFirstSegmentInMinimap}
        isLastSegmentInMinimap={isLastSegmentInMinimap}
        timestamp={timestamp}
        timestampSpread={timestampSpread}
      />

      <Timestamp
        isFirstSegmentInMinimap={isFirstSegmentInMinimap}
        isLastSegmentInMinimap={isLastSegmentInMinimap}
        timestamp={timestamp}
        timestampSpread={timestampSpread}
        segmentKey={segmentKey}
      />

      {severity.map((severityValue, index) => (
        <React.Fragment key={index}>
          {severityValue === displaySeverityType && (
            <div
              className="mr-3 w-[8px] h-2 flex justify-left items-end"
              data-severity={severityValue}
            >
              <div
                key={`${segmentKey}_${index}_primary_data`}
                className={`
            w-full h-2 bg-gradient-to-r
            ${roundBottom ? "rounded-bl-full rounded-br-full" : ""}
            ${roundTop ? "rounded-tl-full rounded-tr-full" : ""}
            ${severityColors[severityValue]}
          `}
              ></div>
            </div>
          )}

          {severityValue !== displaySeverityType && (
            <div className="h-2 flex flex-grow justify-end items-end">
              <div
                key={`${segmentKey}_${index}_secondary_data`}
                className={`
            w-1 h-2 bg-gradient-to-r
            ${roundBottom ? "rounded-bl-full rounded-br-full" : ""}
            ${roundTop ? "rounded-tl-full rounded-tr-full" : ""}
            ${severityColors[severityValue]}
          `}
              ></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default EventSegment;
