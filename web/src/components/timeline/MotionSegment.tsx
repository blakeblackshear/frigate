import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { useEventSegmentUtils } from "@/hooks/use-event-segment-utils";
import { ReviewSegment } from "@/types/review";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import { MinimapBounds, Tick, Timestamp } from "./segment-metadata";
import { useMotionSegmentUtils } from "@/hooks/use-motion-segment-utils";
import { isDesktop, isMobile } from "react-device-detect";
import useTapUtils from "@/hooks/use-tap-utils";

type MotionSegmentProps = {
  events: ReviewSegment[];
  segmentTime: number;
  segmentDuration: number;
  timestampSpread: number;
  firstHalfMotionValue: number;
  secondHalfMotionValue: number;
  motionOnly: boolean;
  showMinimap: boolean;
  minimapStartTime?: number;
  minimapEndTime?: number;
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
  dense: boolean;
};

export function MotionSegment({
  events,
  segmentTime,
  segmentDuration,
  timestampSpread,
  firstHalfMotionValue,
  secondHalfMotionValue,
  motionOnly,
  showMinimap,
  minimapStartTime,
  minimapEndTime,
  setHandlebarTime,
  dense,
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
  const segmentKey = useMemo(() => segmentTime, [segmentTime]);

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
      ? "relative h-[8px] border-b-2 border-gray-500"
      : ""
  }`;

  const animationClassesSecondHalf = `motion-segment ${secondHalfSegmentWidth > 0 ? "hidden" : ""}
    zoom-in-[0.2] ${secondHalfSegmentWidth < 5 ? "duration-200" : "duration-1000"}`;
  const animationClassesFirstHalf = `motion-segment ${firstHalfSegmentWidth > 0 ? "hidden" : ""}
    zoom-in-[0.2] ${firstHalfSegmentWidth < 5 ? "duration-200" : "duration-1000"}`;

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
          data-segment-id={segmentKey}
          className={`segment ${firstHalfSegmentWidth > 0 || secondHalfSegmentWidth > 0 ? "has-data" : ""} ${segmentClasses}  bg-gradient-to-r ${severityColorsBg[severity[0]]}`}
          onClick={segmentClick}
          onTouchEnd={(event) => handleTouchStart(event, segmentClick)}
        >
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

          <div className="absolute left-1/2 z-10 h-[8px] w-[20px] -translate-x-1/2 transform cursor-pointer md:w-[40px]">
            <div className="mb-[1px] flex w-[20px] flex-row justify-center pt-[1px] md:w-[40px]">
              <div className="mb-[1px] flex justify-center">
                <div
                  key={`${segmentKey}_motion_data_1`}
                  data-motion-value={secondHalfSegmentWidth}
                  className={`${isDesktop && animationClassesSecondHalf} h-[2px] rounded-full bg-motion_review`}
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
                  className={`${isDesktop && animationClassesFirstHalf} h-[2px] rounded-full bg-motion_review`}
                  style={{
                    width: firstHalfSegmentWidth || 1,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MotionSegment;
