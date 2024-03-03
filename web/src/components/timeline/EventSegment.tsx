import { useApiHost } from "@/api";
import { useEventUtils } from "@/hooks/use-event-utils";
import { useSegmentUtils } from "@/hooks/use-segment-utils";
import { ReviewSegment, ReviewSeverity } from "@/types/review";
import React, {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { isDesktop } from "react-device-detect";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { HoverCardPortal } from "@radix-ui/react-hover-card";
import scrollIntoView from "scroll-into-view-if-needed";

type EventSegmentProps = {
  events: ReviewSegment[];
  segmentTime: number;
  segmentDuration: number;
  timestampSpread: number;
  showMinimap: boolean;
  minimapStartTime?: number;
  minimapEndTime?: number;
  severityType: ReviewSeverity;
  contentRef: RefObject<HTMLDivElement>;
};

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

function Tick({ timestamp, timestampSpread }: TickSegmentProps) {
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

function Timestamp({
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

export function EventSegment({
  events,
  segmentTime,
  segmentDuration,
  timestampSpread,
  showMinimap,
  minimapStartTime,
  minimapEndTime,
  severityType,
  contentRef,
}: EventSegmentProps) {
  const {
    getSeverity,
    getReviewed,
    displaySeverityType,
    shouldShowRoundedCorners,
    getEventStart,
    getEventThumbnail,
  } = useSegmentUtils(segmentDuration, events, severityType);

  const { alignStartDateToTimeline, alignEndDateToTimeline } = useEventUtils(
    events,
    segmentDuration,
  );

  const severity = useMemo(
    () => getSeverity(segmentTime, displaySeverityType),
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getSeverity, segmentTime],
  );

  const reviewed = useMemo(
    () => getReviewed(segmentTime),
    [getReviewed, segmentTime],
  );

  const {
    roundTopPrimary,
    roundBottomPrimary,
    roundTopSecondary,
    roundBottomSecondary,
  } = useMemo(
    () => shouldShowRoundedCorners(segmentTime),
    [shouldShowRoundedCorners, segmentTime],
  );

  const startTimestamp = useMemo(() => {
    const eventStart = getEventStart(segmentTime);
    if (eventStart) {
      return alignStartDateToTimeline(eventStart);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getEventStart, segmentTime]);

  const apiHost = useApiHost();

  const eventThumbnail = useMemo(() => {
    return getEventThumbnail(segmentTime);
  }, [getEventThumbnail, segmentTime]);

  const timestamp = useMemo(() => new Date(segmentTime * 1000), [segmentTime]);
  const segmentKey = useMemo(() => segmentTime, [segmentTime]);

  const alignedMinimapStartTime = useMemo(
    () => alignStartDateToTimeline(minimapStartTime ?? 0),
    [minimapStartTime, alignStartDateToTimeline],
  );
  const alignedMinimapEndTime = useMemo(
    () => alignEndDateToTimeline(minimapEndTime ?? 0),
    [minimapEndTime, alignEndDateToTimeline],
  );

  const isInMinimapRange = useMemo(() => {
    return (
      showMinimap &&
      segmentTime >= alignedMinimapStartTime &&
      segmentTime < alignedMinimapEndTime
    );
  }, [
    showMinimap,
    alignedMinimapStartTime,
    alignedMinimapEndTime,
    segmentTime,
  ]);

  const isFirstSegmentInMinimap = useMemo(() => {
    return showMinimap && segmentTime === alignedMinimapStartTime;
  }, [showMinimap, segmentTime, alignedMinimapStartTime]);

  const isLastSegmentInMinimap = useMemo(() => {
    return showMinimap && segmentTime === alignedMinimapEndTime;
  }, [showMinimap, segmentTime, alignedMinimapEndTime]);

  const firstMinimapSegmentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the first segment is out of view
    const firstSegment = firstMinimapSegmentRef.current;
    if (firstSegment && showMinimap && isFirstSegmentInMinimap) {
      scrollIntoView(firstSegment, {
        scrollMode: "if-needed",
        behavior: "smooth",
      });
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMinimap, isFirstSegmentInMinimap, events, segmentDuration]);

  const segmentClasses = `h-2 relative w-full ${
    showMinimap
      ? isInMinimapRange
        ? "bg-secondary-highlight"
        : isLastSegmentInMinimap
          ? ""
          : "opacity-70"
      : ""
  } ${
    isFirstSegmentInMinimap || isLastSegmentInMinimap
      ? "relative h-2 border-b-2 border-gray-500"
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

  const segmentClick = useCallback(() => {
    if (contentRef.current && startTimestamp) {
      const element = contentRef.current.querySelector(
        `[data-segment-start="${startTimestamp - segmentDuration}"]`,
      );
      if (element instanceof HTMLElement) {
        scrollIntoView(element, {
          scrollMode: "if-needed",
          behavior: "smooth",
        });
        element.classList.add(
          `outline-severity_${severityType}`,
          `shadow-severity_${severityType}`,
        );
        element.classList.add("outline-4", "shadow-[0_0_6px_1px]");
        element.classList.remove("outline-0", "shadow-none");

        // Remove the classes after a short timeout
        setTimeout(() => {
          element.classList.remove("outline-4", "shadow-[0_0_6px_1px]");
          element.classList.add("outline-0", "shadow-none");
        }, 3000);
      }
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTimestamp]);

  return (
    <div
      key={segmentKey}
      className={segmentClasses}
      data-segment-time={new Date(segmentTime * 1000)}
    >
      <MinimapBounds
        isFirstSegmentInMinimap={isFirstSegmentInMinimap}
        isLastSegmentInMinimap={isLastSegmentInMinimap}
        alignedMinimapStartTime={alignedMinimapStartTime}
        alignedMinimapEndTime={alignedMinimapEndTime}
        firstMinimapSegmentRef={firstMinimapSegmentRef}
      />

      <Tick timestamp={timestamp} timestampSpread={timestampSpread} />

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
            <HoverCard openDelay={200} closeDelay={100}>
              <div
                className="absolute left-1/2 transform -translate-x-1/2 w-[8px] h-2 ml-[2px] z-10 cursor-pointer"
                data-severity={severityValue}
              >
                <HoverCardTrigger asChild>
                  <div
                    key={`${segmentKey}_${index}_primary_data`}
                    className={`w-full h-2 bg-gradient-to-r ${roundBottomPrimary ? "rounded-bl-full rounded-br-full" : ""} ${roundTopPrimary ? "rounded-tl-full rounded-tr-full" : ""} ${severityColors[severityValue]}`}
                    onClick={segmentClick}
                  ></div>
                </HoverCardTrigger>
                <HoverCardPortal>
                  <HoverCardContent
                    className="rounded-2xl w-[250px] p-2"
                    side="left"
                  >
                    <img
                      className="rounded-lg"
                      src={`${apiHost}${eventThumbnail.replace("/media/frigate/", "")}`}
                    />
                  </HoverCardContent>
                </HoverCardPortal>
              </div>
            </HoverCard>
          )}

          {severityValue !== displaySeverityType && (
            <div className="absolute right-0 h-2 z-10">
              <div
                key={`${segmentKey}_${index}_secondary_data`}
                className={`
                  w-1 h-2 bg-gradient-to-r
                  ${roundBottomSecondary ? "rounded-bl-full rounded-br-full" : ""}
                  ${roundTopSecondary ? "rounded-tl-full rounded-tr-full" : ""}
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
