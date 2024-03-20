import { useEventSegmentUtils } from "@/hooks/use-event-segment-utils";
import { ReviewSegment } from "@/types/review";
import React, { useMemo } from "react";
// import useTapUtils from "@/hooks/use-tap-utils";

type SummarySegmentProps = {
  events: ReviewSegment[];
  segmentTime: number;
  segmentDuration: number;
  segmentHeight: number;
};

export function SummarySegment({
  events,
  segmentTime,
  segmentDuration,
  segmentHeight,
}: SummarySegmentProps) {
  const severityType = "all";
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
    1: reviewed ? "bg-severity_motion/50" : "bg-severity_motion",
    2: reviewed ? "bg-severity_detection/50" : "bg-severity_detection",
    3: reviewed ? "bg-severity_alert/50" : "bg-severity_alert",
  };

  return (
    <div
      key={segmentKey}
      className="relative w-full"
      style={{ height: segmentHeight }}
    >
      {severity.map((severityValue: number, index: number) => {
        return (
          <React.Fragment key={index}>
            <div
              className="flex justify-end cursor-pointer"
              style={{ height: segmentHeight }}
            >
              <div
                key={`${segmentKey}_${index}_secondary_data`}
                style={{ height: segmentHeight }}
                className={`w-[10px] ${severityColors[severityValue]}`}
              ></div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default SummarySegment;
