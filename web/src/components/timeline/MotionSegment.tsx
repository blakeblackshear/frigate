import { useTimelineUtils } from "@/hooks/use-timeline-utils";
import { useEventSegmentUtils } from "@/hooks/use-event-segment-utils";
import { MotionData, ReviewSegment } from "@/types/review";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import { MinimapBounds, Tick, Timestamp } from "./segment-metadata";
import { useMotionSegmentUtils } from "@/hooks/use-motion-segment-utils";
import { isDesktop, isMobile } from "react-device-detect";
import useTapUtils from "@/hooks/use-tap-utils";

type MotionSegmentProps = {
  events: ReviewSegment[];
  motion_events: MotionData[];
  segmentTime: number;
  segmentDuration: number;
  timestampSpread: number;
  motionOnly: boolean;
  showMinimap: boolean;
  minimapStartTime?: number;
  minimapEndTime?: number;
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
  dense: boolean;
};

export function MotionSegment({
  events,
  motion_events,
  segmentTime,
  segmentDuration,
  timestampSpread,
  motionOnly,
  showMinimap,
  minimapStartTime,
  minimapEndTime,
  setHandlebarTime,
  dense,
}: MotionSegmentProps) {
  const severityType = "all";
  const {
    getSeverity,
    getReviewed,
    displaySeverityType,
    shouldShowRoundedCorners,
  } = useEventSegmentUtils(segmentDuration, events, severityType);

  const { getMotionSegmentValue, interpolateMotionAudioData } =
    useMotionSegmentUtils(segmentDuration, motion_events);

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

  const { roundTopSecondary, roundBottomSecondary } = useMemo(
    () => shouldShowRoundedCorners(segmentTime),
    [shouldShowRoundedCorners, segmentTime],
  );

  const timestamp = useMemo(() => new Date(segmentTime * 1000), [segmentTime]);
  const segmentKey = useMemo(() => segmentTime, [segmentTime]);

  const maxSegmentWidth = useMemo(() => {
    return isMobile ? 30 : 50;
  }, []);

  const firstHalfSegmentWidth = useMemo(() => {
    return interpolateMotionAudioData(
      getMotionSegmentValue(segmentTime),
      maxSegmentWidth,
    );
  }, [
    segmentTime,
    maxSegmentWidth,
    getMotionSegmentValue,
    interpolateMotionAudioData,
  ]);

  const secondHalfSegmentWidth = useMemo(() => {
    return interpolateMotionAudioData(
      getMotionSegmentValue(segmentTime + segmentDuration / 2),
      maxSegmentWidth,
    );
  }, [
    segmentTime,
    segmentDuration,
    maxSegmentWidth,
    getMotionSegmentValue,
    interpolateMotionAudioData,
  ]);

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
          className={`segment ${firstHalfSegmentWidth > 0 || secondHalfSegmentWidth > 0 ? "has-data" : ""} ${segmentClasses}`}
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

          <div className="absolute left-1/2 transform -translate-x-1/2 w-[20px] md:w-[40px] h-[8px] z-10 cursor-pointer">
            <div className="flex flex-row justify-center w-[20px] md:w-[40px] pt-[1px] mb-[1px]">
              <div className="flex justify-center mb-[1px]">
                <div
                  key={`${segmentKey}_motion_data_1`}
                  data-motion-value={secondHalfSegmentWidth}
                  className={`${isDesktop && animationClassesSecondHalf} h-[2px] rounded-full ${severity[0] != 0 ? "bg-motion_review-dimmed" : "bg-motion_review"}`}
                  style={{
                    width: secondHalfSegmentWidth || 1,
                  }}
                ></div>
              </div>
            </div>

            <div className="flex flex-row justify-center pb-[1px] w-[20px] md:w-[40px]">
              <div className="flex justify-center">
                <div
                  key={`${segmentKey}_motion_data_2`}
                  data-motion-value={firstHalfSegmentWidth}
                  className={`${isDesktop && animationClassesFirstHalf} h-[2px] rounded-full ${severity[0] != 0 ? "bg-motion_review-dimmed" : "bg-motion_review"}`}
                  style={{
                    width: firstHalfSegmentWidth || 1,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {!motionOnly &&
            severity.map((severityValue: number, index: number) => {
              if (severityValue > 0) {
                return (
                  <React.Fragment key={index}>
                    <div className="absolute right-0 h-[8px] z-10">
                      <div
                        key={`${segmentKey}_${index}_secondary_data`}
                        className={`
                          w-1 h-[8px] bg-gradient-to-r
                          ${roundBottomSecondary ? "rounded-bl-full rounded-br-full" : ""}
                          ${roundTopSecondary ? "rounded-tl-full rounded-tr-full" : ""}
                          ${severityColors[severityValue]}
                        `}
                      ></div>
                    </div>
                  </React.Fragment>
                );
              } else {
                return null;
              }
            })}
        </div>
      )}
    </>
  );
}

export default MotionSegment;
