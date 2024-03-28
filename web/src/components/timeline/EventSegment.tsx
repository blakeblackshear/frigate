import { useApiHost } from "@/api";
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
  dense,
}: EventSegmentProps) {
  const {
    getSeverity,
    getReviewed,
    displaySeverityType,
    shouldShowRoundedCorners,
    getEventStart,
    getEventThumbnail,
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

  const apiHost = useApiHost();

  const { handleTouchStart } = useTapUtils();

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
      ? "relative h-[8px] border-b-2 border-neutral-600"
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
        element.classList.add("outline-3");
        element.classList.remove("outline-0");

        // Remove the classes after a short timeout
        setTimeout(() => {
          element.classList.remove("outline-3");
          element.classList.add("outline-0");
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
      data-segment-id={segmentKey}
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
                <div className="absolute left-1/2 transform -translate-x-1/2 w-[20px] md:w-[40px] h-[8px] z-10 cursor-pointer">
                  <div className="flex flex-row justify-center w-[20px] md:w-[40px]">
                    <div className="flex justify-center">
                      <div
                        className="absolute left-1/2 transform -translate-x-1/2 w-[8px] h-[8px] ml-[2px] z-10 cursor-pointer"
                        data-severity={severityValue}
                      >
                        <div
                          key={`${segmentKey}_${index}_primary_data`}
                          className={`w-full h-[8px] bg-gradient-to-r ${roundBottomPrimary ? "rounded-bl-full rounded-br-full" : ""} ${roundTopPrimary ? "rounded-tl-full rounded-tr-full" : ""} ${severityColors[severityValue]}`}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
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
            </HoverCard>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default EventSegment;
