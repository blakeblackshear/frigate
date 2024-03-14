import { useEventUtils } from "@/hooks/use-event-utils";
import { useEventSegmentUtils } from "@/hooks/use-event-segment-utils";
import { MotionData, ReviewSegment } from "@/types/review";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import { MinimapBounds, Tick, Timestamp } from "./segment-metadata";
import { useMotionSegmentUtils } from "@/hooks/use-motion-segment-utils";
import { isMobile } from "react-device-detect";
import useTapUtils from "@/hooks/use-tap-utils";

type MotionSegmentProps = {
  events: ReviewSegment[];
  motion_events: MotionData[];
  segmentTime: number;
  segmentDuration: number;
  timestampSpread: number;
  showMinimap: boolean;
  minimapStartTime?: number;
  minimapEndTime?: number;
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
};

export function MotionSegment({
  events,
  motion_events,
  segmentTime,
  segmentDuration,
  timestampSpread,
  showMinimap,
  minimapStartTime,
  minimapEndTime,
  setHandlebarTime,
}: MotionSegmentProps) {
  const severityType = "all";
  const {
    getSeverity,
    getReviewed,
    displaySeverityType,
    shouldShowRoundedCorners,
  } = useEventSegmentUtils(segmentDuration, events, severityType);

  const { getMotionSegmentValue, interpolateMotionAudioData, getMotionStart } =
    useMotionSegmentUtils(segmentDuration, motion_events);

  const { alignStartDateToTimeline, alignEndDateToTimeline } = useEventUtils(
    events,
    segmentDuration,
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

  const startTimestamp = useMemo(() => {
    const eventStart = getMotionStart(segmentTime);
    if (eventStart) {
      return alignStartDateToTimeline(eventStart);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getMotionStart, segmentTime]);

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
    if (
      startTimestamp &&
      setHandlebarTime &&
      (firstHalfSegmentWidth > 1 || secondHalfSegmentWidth > 1)
    ) {
      setHandlebarTime(startTimestamp);
    }
  }, [
    startTimestamp,
    setHandlebarTime,
    firstHalfSegmentWidth,
    secondHalfSegmentWidth,
  ]);

  return (
    <div
      key={segmentKey}
      className={segmentClasses}
      onClick={segmentClick}
      onTouchStart={(event) => handleTouchStart(event, segmentClick)}
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

      <div className="absolute left-1/2 transform -translate-x-1/2 w-[20px] md:w-[40px] h-2 z-10 cursor-pointer">
        <div className="flex flex-row justify-center w-[20px] md:w-[40px] mb-[1px]">
          <div className="flex justify-center">
            <div
              key={`${segmentKey}_motion_data_1`}
              className={`h-[2px] rounded-full ${severity[0] != 0 ? "bg-motion_review-dimmed" : "bg-motion_review"}`}
              style={{
                width: secondHalfSegmentWidth,
              }}
            ></div>
          </div>
        </div>

        <div className="flex flex-row justify-center w-[20px] md:w-[40px]">
          <div className="flex justify-center">
            <div
              key={`${segmentKey}_motion_data_2`}
              className={`h-[2px] rounded-full ${severity[0] != 0 ? "bg-motion_review-dimmed" : "bg-motion_review"}`}
              style={{
                width: firstHalfSegmentWidth,
              }}
            ></div>
          </div>
        </div>
      </div>

      {severity.map((severityValue: number, index: number) => {
        if (severityValue > 1) {
          return (
            <React.Fragment key={index}>
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
            </React.Fragment>
          );
        } else {
          return null;
        }
      })}
    </div>
  );
}

export default MotionSegment;
