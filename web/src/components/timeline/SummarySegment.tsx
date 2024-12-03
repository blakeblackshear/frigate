import { cn } from "@/lib/utils";
import { ConsolidatedSegmentData } from "@/types/review";

type SummarySegmentProps = {
  segmentData: ConsolidatedSegmentData;
  totalDuration: number;
};

export function SummarySegment({
  segmentData,
  totalDuration,
}: SummarySegmentProps) {
  const { startTime, endTime, severity, reviewed } = segmentData;

  const severityColors: { [key: string]: string } = {
    significant_motion: reviewed
      ? "bg-severity_significant_motion/50"
      : "bg-severity_significant_motion",
    detection: reviewed ? "bg-severity_detection/50" : "bg-severity_detection",
    alert: reviewed ? "bg-severity_alert/50" : "bg-severity_alert",
    empty: "bg-transparent",
  };

  const height = ((endTime - startTime) / totalDuration) * 100;

  return (
    <div className="relative w-full" style={{ height: `${height}%` }}>
      <div className="absolute inset-0 flex h-full cursor-pointer justify-end">
        <div
          className={cn(
            "w-[10px]",
            severityColors[severity],
            height < 0.5 && "min-h-[0.5px]",
          )}
        ></div>
      </div>
    </div>
  );
}

export default SummarySegment;
