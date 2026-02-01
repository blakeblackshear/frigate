import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { useEventSegmentUtils } from "@/hooks/use-event-segment-utils";
import { ReviewSegment } from "@/types/review";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { MinimapBounds, Tick, Timestamp } from "./segment-metadata";
import { useMotionSegmentUtils } from "@/hooks/use-motion-segment-utils";
import { isMobile } from "react-device-detect";
import useTapUtils from "@/hooks/use-tap-utils";
import { cn } from "@/lib/utils";

type MotionSegmentProps = {
  events: ReviewSegment[];
  segmentTime: number;
  segmentDuration: number;
  timestampSpread: number;
  firstHalfMotionValue: number;
  secondHalfMotionValue: number;
  hasRecording?: boolean;
  prevIsNoRecording?: boolean;
  nextIsNoRecording?: boolean;
  motionOnly: boolean;
  showMinimap: boolean;
  minimapStartTime?: number;
  minimapEndTime?: number;
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
  scrollToSegment: (segmentTime: number, ifNeeded?: boolean) => void;
  dense: boolean;
  alwaysShowMotionLine?: boolean;
};

export function MotionSegment({
  events,
  segmentTime,
  segmentDuration,
  timestampSpread,
  firstHalfMotionValue,
  secondHalfMotionValue,
  hasRecording,
  prevIsNoRecording,
  nextIsNoRecording,
  motionOnly,
  showMinimap,
  minimapStartTime,
  minimapEndTime,
  setHandlebarTime,
  scrollToSegment,
  dense,
  alwaysShowMotionLine = false,
}: MotionSegmentProps) {
  const severityType = "all";
  const { getSeverity, getReviewed, displaySeverityType } =
    useEventSegmentUtils(segmentDuration, events, severityType);

  const { interpolateMotionAudioData } = useMotionSegmentUtils(
    segmentDuration,
    [],
  );

  const { alignStartDateToTimeline, alignEndDateToTimeline } = useTimelineUtils(
    { segmentDuration },
  );

  const { handleTouchStart } = useTapUtils();

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

  const timestamp = useMemo(() => new Date(segmentTime * 1000), [segmentTime]);
  const segmentKey = useMemo(
    () => `${segmentTime}_${segmentDuration}`,
    [segmentTime, segmentDuration],
  );

  const maxSegmentWidth = useMemo(() => {
    return isMobile ? 30 : 50;
  }, []);

  const firstHalfSegmentWidth = useMemo(() => {
    return interpolateMotionAudioData(firstHalfMotionValue, maxSegmentWidth);
  }, [maxSegmentWidth, firstHalfMotionValue, interpolateMotionAudioData]);

  const secondHalfSegmentWidth = useMemo(() => {
    return interpolateMotionAudioData(secondHalfMotionValue, maxSegmentWidth);
  }, [maxSegmentWidth, secondHalfMotionValue, interpolateMotionAudioData]);

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

  // Bottom border: current segment HAS recording, but next segment (below/earlier) has NO recording
  const isFirstSegmentWithoutRecording = useMemo(() => {
    return hasRecording === true && nextIsNoRecording === true;
  }, [hasRecording, nextIsNoRecording]);

  // Top border: current segment HAS recording, but prev segment (above/later) has NO recording
  const isLastSegmentWithoutRecording = useMemo(() => {
    return hasRecording === true && prevIsNoRecording === true;
  }, [hasRecording, prevIsNoRecording]);

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
      ? "relative h-[8px] border-b-2 border-gray-500"
      : ""
  }`;

  const severityColorsBg: { [key: number]: string } = {
    1: reviewed
      ? "from-severity_significant_motion-dimmed/10 to-severity_significant_motion/10"
      : "from-severity_significant_motion-dimmed/20 to-severity_significant_motion/20",
    2: reviewed
      ? "from-severity_detection-dimmed/10 to-severity_detection/10"
      : "from-severity_detection-dimmed/20 to-severity_detection/20",
    3: reviewed
      ? "from-severity_alert-dimmed/10 to-severity_alert/10"
      : "from-severity_alert-dimmed/20 to-severity_alert/20",
  };

  const segmentClick = useCallback(() => {
    if (setHandlebarTime) {
      setHandlebarTime(segmentTime);
    }
  }, [segmentTime, setHandlebarTime]);

  return (
    <>
      {(((firstHalfSegmentWidth > 0 || secondHalfSegmentWidth > 0) &&
        motionOnly &&
        severity[0] < 2) ||
        !motionOnly) && (
        <div
          key={segmentKey}
          data-segment-id={segmentTime}
          className={cn(
            "segment",
            {
              "has-data":
                firstHalfSegmentWidth > 0 || secondHalfSegmentWidth > 0,
            },
            segmentClasses,
            severity[0] && "bg-gradient-to-r",
            severity[0] && severityColorsBg[severity[0]],
            hasRecording == false && "bg-background",
          )}
          onClick={segmentClick}
          onTouchEnd={(event) => handleTouchStart(event, segmentClick)}
        >
          {isFirstSegmentWithoutRecording && (
            <div className="absolute bottom-[0px] left-0 right-0 h-[1px] bg-primary-variant/40" />
          )}
          {isLastSegmentWithoutRecording && (
            <div className="absolute -top-[1px] left-0 right-0 h-[1px] bg-primary-variant/50" />
          )}
          {!motionOnly && (
            <>
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

              <Tick
                key={`${segmentKey}_tick`}
                timestamp={timestamp}
                timestampSpread={timestampSpread}
              />

              <Timestamp
                key={`${segmentKey}_timestamp`}
                isFirstSegmentInMinimap={isFirstSegmentInMinimap}
                isLastSegmentInMinimap={isLastSegmentInMinimap}
                timestamp={timestamp}
                timestampSpread={timestampSpread}
                segmentKey={segmentKey}
              />
            </>
          )}

          {(hasRecording ||
            firstHalfSegmentWidth > 0 ||
            secondHalfSegmentWidth > 0 ||
            alwaysShowMotionLine) && (
            <div className="absolute left-1/2 z-10 h-[8px] w-[20px] -translate-x-1/2 transform cursor-pointer md:w-[40px]">
              <div className="mb-[1px] flex w-[20px] flex-row justify-center pt-[1px] md:w-[40px]">
                <div className="mb-[1px] flex justify-center">
                  <div
                    key={`${segmentKey}_motion_data_1`}
                    data-motion-value={secondHalfSegmentWidth}
                    className={cn(
                      "h-[2px]",
                      "rounded-full",
                      secondHalfSegmentWidth
                        ? "bg-motion_review"
                        : "bg-muted-foreground",
                    )}
                    style={{
                      width: secondHalfSegmentWidth || 1,
                    }}
                  ></div>
                </div>
              </div>

              <div className="flex w-[20px] flex-row justify-center pb-[1px] md:w-[40px]">
                <div className="flex justify-center">
                  <div
                    key={`${segmentKey}_motion_data_2`}
                    data-motion-value={firstHalfSegmentWidth}
                    className={cn(
                      "h-[2px]",
                      "rounded-full",
                      firstHalfSegmentWidth
                        ? "bg-motion_review"
                        : "bg-muted-foreground",
                    )}
                    style={{
                      width: firstHalfSegmentWidth || 1,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default MotionSegment;
