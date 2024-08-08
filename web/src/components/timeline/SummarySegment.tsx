import { useEventSegmentUtils } from "@/hooks/use-event-segment-utils";
import { ReviewSegment, ReviewSeverity } from "@/types/review";
import React, { useMemo } from "react";
// import useTapUtils from "@/hooks/use-tap-utils";

type SummarySegmentProps = {
  events: ReviewSegment[];
  segmentTime: number;
  segmentDuration: number;
  segmentHeight: number;
  severityType: ReviewSeverity;
};

export function SummarySegment({
  events,
  segmentTime,
  segmentDuration,
  segmentHeight,
  severityType,
}: SummarySegmentProps) {
  const { getSeverity, getReviewed, displaySeverityType } =
    useEventSegmentUtils(segmentDuration, events, severityType);

  const severity = useMemo(
    () => getSeverity(segmentTime, displaySeverityType),
    [getSeverity, segmentTime, displaySeverityType],
  );

  const reviewed = useMemo(
    () => getReviewed(segmentTime),
    [getReviewed, segmentTime],
  );

  const segmentKey = useMemo(() => segmentTime, [segmentTime]);

  const severityColors: { [key: number]: string } = {
    1: reviewed
      ? "bg-severity_significant_motion/50"
      : "bg-severity_significant_motion",
    2: reviewed ? "bg-severity_detection/50" : "bg-severity_detection",
    3: reviewed ? "bg-severity_alert/50" : "bg-severity_alert",
  };

  return (
    <div
      key={segmentKey}
      className="relative w-full"
      style={{ height: segmentHeight }}
    >
      {severity.map((severityValue: number, index: number) => (
        <React.Fragment key={index}>
          {severityValue === displaySeverityType && (
            <div
              className="flex cursor-pointer justify-end"
              style={{ height: segmentHeight }}
            >
              <div
                key={`${segmentKey}_${index}_secondary_data`}
                style={{ height: segmentHeight }}
                className={`w-[10px] ${severityColors[severityValue]}`}
              ></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default SummarySegment;
