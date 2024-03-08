import { useApiHost } from "@/api";
import { useEventUtils } from "@/hooks/use-event-utils";
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
}: EventSegmentProps) {
  const {
    getSeverity,
    getReviewed,
    displaySeverityType,
    shouldShowRoundedCorners,
    getEventStart,
    getEventThumbnail,
  } = useEventSegmentUtils(segmentDuration, events, severityType);

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

      if (setHandlebarTime) {
        setHandlebarTime(startTimestamp);
      }
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTimestamp]);

  return (
    <div key={segmentKey} className={segmentClasses}>
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

      {severity.map((severityValue: number, index: number) => (
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
                    onTouchStart={(event) =>
                      handleTouchStart(event, segmentClick)
                    }
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
