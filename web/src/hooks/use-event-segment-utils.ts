import { useCallback, useMemo } from "react";
import { ReviewSegment } from "@/types/review";

export const useEventSegmentUtils = (
  segmentDuration: number,
  events: ReviewSegment[],
  severityType: string,
) => {
  const getSegmentStart = useCallback(
    (time: number): number => {
      return Math.floor(time / segmentDuration) * segmentDuration;
    },
    [segmentDuration],
  );

  const getSegmentEnd = useCallback(
    (time: number | undefined): number => {
      if (time) {
        return (
          Math.floor(time / segmentDuration) * segmentDuration + segmentDuration
        );
      } else {
        return Date.now() / 1000 + segmentDuration;
      }
    },
    [segmentDuration],
  );

  const mapSeverityToNumber = useCallback((severity: string): number => {
    switch (severity) {
      case "significant_motion":
        return 1;
      case "detection":
        return 2;
      case "alert":
        return 3;
      default:
        return 0;
    }
  }, []);

  const displaySeverityType = useMemo(
    () => mapSeverityToNumber(severityType ?? ""),
    [mapSeverityToNumber, severityType],
  );

  const getSeverity = useCallback(
    (time: number, displaySeverityType: number): number[] => {
      let highestSeverityValue = 0;
      let highestOtherSeverityValue = 0;
      let hasDisplaySeverityType = false;

      for (const event of events || []) {
        const segmentStart = getSegmentStart(event.start_time);
        const segmentEnd = getSegmentEnd(event.end_time);

        if (time >= segmentStart && time < segmentEnd) {
          const severity = mapSeverityToNumber(event.severity);

          if (severity === displaySeverityType) {
            hasDisplaySeverityType = true;
            highestOtherSeverityValue = Math.max(
              highestOtherSeverityValue,
              highestSeverityValue,
            );
          } else {
            highestSeverityValue = Math.max(highestSeverityValue, severity);
          }
        }
      }

      if (hasDisplaySeverityType) {
        return [displaySeverityType, highestOtherSeverityValue];
      } else if (highestSeverityValue === 0) {
        return [0];
      } else {
        return [highestSeverityValue];
      }
    },
    [events, getSegmentStart, getSegmentEnd, mapSeverityToNumber],
  );

  const getReviewed = useCallback(
    (time: number): boolean => {
      return events.some((event) => {
        const segmentStart = getSegmentStart(event.start_time);
        const segmentEnd = getSegmentEnd(event.end_time);
        return (
          time >= segmentStart && time < segmentEnd && event.has_been_reviewed
        );
      });
    },
    [events, getSegmentStart, getSegmentEnd],
  );

  const shouldShowRoundedCorners = useCallback(
    (
      segmentTime: number,
    ): {
      roundTopPrimary: boolean;
      roundBottomPrimary: boolean;
      roundTopSecondary: boolean;
      roundBottomSecondary: boolean;
    } => {
      const prevSegmentTime = segmentTime - segmentDuration;
      const nextSegmentTime = segmentTime + segmentDuration;

      const severityEvents = events.filter((e) => e.severity === severityType);

      const otherEvents = events.filter((e) => e.severity !== severityType);

      const hasPrevSeverityEvent = severityEvents.some((e) => {
        return (
          prevSegmentTime >= getSegmentStart(e.start_time) &&
          prevSegmentTime < getSegmentEnd(e.end_time)
        );
      });

      const hasNextSeverityEvent = severityEvents.some((e) => {
        return (
          nextSegmentTime >= getSegmentStart(e.start_time) &&
          nextSegmentTime < getSegmentEnd(e.end_time)
        );
      });

      const hasPrevOtherEvent = otherEvents.some((e) => {
        return (
          prevSegmentTime >= getSegmentStart(e.start_time) &&
          prevSegmentTime < getSegmentEnd(e.end_time)
        );
      });

      const hasNextOtherEvent = otherEvents.some((e) => {
        return (
          nextSegmentTime >= getSegmentStart(e.start_time) &&
          nextSegmentTime < getSegmentEnd(e.end_time)
        );
      });

      const hasOverlappingSeverityEvent = severityEvents.some((e) => {
        return (
          segmentTime >= getSegmentStart(e.start_time) &&
          segmentTime < getSegmentEnd(e.end_time)
        );
      });

      const hasOverlappingOtherEvent = otherEvents.some((e) => {
        return (
          segmentTime >= getSegmentStart(e.start_time) &&
          segmentTime < getSegmentEnd(e.end_time)
        );
      });

      let roundTopPrimary = false;
      let roundBottomPrimary = false;
      let roundTopSecondary = false;
      let roundBottomSecondary = false;

      if (hasOverlappingSeverityEvent) {
        roundBottomPrimary = !hasPrevSeverityEvent;
        roundTopPrimary = !hasNextSeverityEvent;
      }

      if (hasOverlappingOtherEvent) {
        roundBottomSecondary = !hasPrevOtherEvent;
        roundTopSecondary = !hasNextOtherEvent;
      }

      return {
        roundTopPrimary,
        roundBottomPrimary,
        roundTopSecondary,
        roundBottomSecondary,
      };
    },
    [events, getSegmentStart, getSegmentEnd, segmentDuration, severityType],
  );

  const getEventStart = useCallback(
    (time: number): number => {
      const matchingEvent = events.find((event) => {
        return (
          time >= getSegmentStart(event.start_time) &&
          time < getSegmentEnd(event.end_time) &&
          event.severity == severityType
        );
      });

      return matchingEvent?.start_time ?? 0;
    },
    [events, getSegmentStart, getSegmentEnd, severityType],
  );

  const getEvent = useCallback(
    (time: number): ReviewSegment | undefined => {
      const matchingEvent = events.find((event) => {
        return (
          time >= getSegmentStart(event.start_time) &&
          time < getSegmentEnd(event.end_time) &&
          event.severity == severityType
        );
      });

      return matchingEvent;
    },
    [events, getSegmentStart, getSegmentEnd, severityType],
  );

  return {
    getSegmentStart,
    getSegmentEnd,
    getSeverity,
    displaySeverityType,
    getReviewed,
    shouldShowRoundedCorners,
    getEventStart,
    getEvent,
  };
};
