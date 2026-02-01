import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { useEventSegmentUtils } from "@/hooks/use-event-segment-utils";
import { ReviewSegment, ReviewSeverity } from "@/types/review";
import React, {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { HoverCardPortal } from "@radix-ui/react-hover-card";
import scrollIntoView from "scroll-into-view-if-needed";
import { MinimapBounds, Tick, Timestamp } from "./segment-metadata";
import useTapUtils from "@/hooks/use-tap-utils";
import ReviewCard from "../card/ReviewCard";

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
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
  scrollToSegment: (segmentTime: number, ifNeeded?: boolean) => void;
  dense: boolean;
};

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
  setHandlebarTime,
  scrollToSegment,
  dense,
}: EventSegmentProps) {
  const {
    getSeverity,
    getReviewed,
    displaySeverityType,
    shouldShowRoundedCorners,
    getEventStart,
    getEvent,
  } = useEventSegmentUtils(segmentDuration, events, severityType);

  const { alignStartDateToTimeline, alignEndDateToTimeline } = useTimelineUtils(
    { segmentDuration },
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

  const { roundTopPrimary, roundBottomPrimary } = useMemo(
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

  const { handleTouchStart } = useTapUtils();

  const segmentEvent = useMemo(() => {
    return getEvent(segmentTime);
  }, [getEvent, segmentTime]);

  const timestamp = useMemo(() => new Date(segmentTime * 1000), [segmentTime]);
  const segmentKey = useMemo(
    () => `${segmentTime}_${segmentDuration}`,
    [segmentTime, segmentDuration],
  );

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
      scrollToSegment(alignedMinimapStartTime);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMinimap, isFirstSegmentInMinimap, events, segmentDuration]);

  const segmentClasses = `h-[8px] relative w-full ${
    showMinimap
      ? isInMinimapRange
        ? "bg-secondary-highlight"
        : isLastSegmentInMinimap
          ? ""
          : "opacity-70"
      : ""
  } ${
    isFirstSegmentInMinimap || isLastSegmentInMinimap
      ? "relative h-[8px] border-b-2 border-neutral_variant"
      : ""
  }`;

  const severityColors: { [key: number]: string } = {
    1: reviewed
      ? "from-severity_significant_motion-dimmed/50 to-severity_significant_motion/50"
      : "from-severity_significant_motion-dimmed to-severity_significant_motion",
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
        `[data-segment-start="${startTimestamp - segmentDuration}"] .review-item-ring`,
      );
      if (element instanceof HTMLElement) {
        scrollIntoView(element, {
          scrollMode: "if-needed",
          behavior: "smooth",
        });
        element.classList.add(`outline-severity_${severityType}`);
        element.classList.remove("outline-transparent");

        // Remove the classes after a short timeout
        setTimeout(() => {
          element.classList.remove(`outline-severity_${severityType}`);
          element.classList.add("outline-transparent");
        }, 3000);
      }

      if (setHandlebarTime) {
        setHandlebarTime(startTimestamp);
      }
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTimestamp]);

  return (
    <div
      key={segmentKey}
      data-segment-id={segmentTime}
      className={`segment ${segmentClasses}`}
      onClick={segmentClick}
      onTouchEnd={(event) => handleTouchStart(event, segmentClick)}
    >
      {showMinimap && (
        <MinimapBounds
          isFirstSegmentInMinimap={isFirstSegmentInMinimap}
          isLastSegmentInMinimap={isLastSegmentInMinimap}
          alignedMinimapStartTime={alignedMinimapStartTime}
          alignedMinimapEndTime={alignedMinimapEndTime}
          firstMinimapSegmentRef={firstMinimapSegmentRef}
          dense={dense}
        />
      )}

      <Tick timestamp={timestamp} timestampSpread={timestampSpread} />

      <Timestamp
        isFirstSegmentInMinimap={isFirstSegmentInMinimap}
        isLastSegmentInMinimap={isLastSegmentInMinimap}
        timestamp={timestamp}
        timestampSpread={timestampSpread}
        segmentKey={segmentKey}
      />

      {severity.map((severityValue: number, index: number) => (
        <React.Fragment key={index}>
          {severityValue === displaySeverityType && (
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="absolute left-1/2 z-10 h-[8px] w-[20px] -translate-x-1/2 transform cursor-pointer md:w-[40px]">
                  <div className="flex w-[20px] flex-row justify-center md:w-[40px]">
                    <div className="flex justify-center">
                      <div
                        className="absolute left-1/2 z-10 ml-[2px] h-[8px] w-[8px] -translate-x-1/2 transform cursor-pointer md:ml-0"
                        data-severity={severityValue}
                      >
                        <div
                          key={`${segmentKey}_${index}_primary_data`}
                          className={`h-[8px] w-full bg-gradient-to-r ${roundBottomPrimary ? "rounded-bl-full rounded-br-full" : ""} ${roundTopPrimary ? "rounded-tl-full rounded-tr-full" : ""} ${severityColors[severityValue]}`}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </HoverCardTrigger>
              <HoverCardPortal>
                <HoverCardContent
                  className="w-[250px] rounded-lg p-2 md:rounded-2xl"
                  side="left"
                >
                  {segmentEvent && <ReviewCard event={segmentEvent} />}
                </HoverCardContent>
              </HoverCardPortal>
            </HoverCard>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default EventSegment;
