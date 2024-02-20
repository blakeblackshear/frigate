import { useCallback, useMemo } from 'react';
import { ReviewSegment } from '@/types/review';

export const useSegmentUtils = (
  segmentDuration: number,
  events: ReviewSegment[],
  severityType: string,
) => {
  const getSegmentStart = useCallback((time: number): number => {
    return Math.floor(time / (segmentDuration)) * (segmentDuration);
  }, [segmentDuration]);

    const getSegmentEnd = useCallback((time: number | undefined): number => {
        if (time) {
            return Math.ceil(time / (segmentDuration)) * (segmentDuration);
        } else {
            return (Date.now()/1000)+(segmentDuration);
        }
  }, [segmentDuration]);

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
    [severityType]
  );

  const getSeverity = useCallback((time: number): number => {
    const activeEvents = events?.filter((event) => {
      const segmentStart = getSegmentStart(event.start_time);
      const segmentEnd = getSegmentEnd(event.end_time);
      return time >= segmentStart && time < segmentEnd;
    });
    if (activeEvents?.length === 0) return 0; // No event at this time
    const severityValues = activeEvents?.map((event) =>
      mapSeverityToNumber(event.severity)
    );
    return Math.max(...severityValues);
  }, [events, getSegmentStart, getSegmentEnd, mapSeverityToNumber]);

  const getReviewed = useCallback((time: number): boolean => {
    return events.some((event) => {
      const segmentStart = getSegmentStart(event.start_time);
      const segmentEnd = getSegmentEnd(event.end_time);
      return (
        time >= segmentStart && time < segmentEnd && event.has_been_reviewed
      );
    });
  }, [events, getSegmentStart, getSegmentEnd]);

  const shouldShowRoundedCorners = useCallback(
    (segmentTime: number): { roundTop: boolean, roundBottom: boolean } => {

      const prevSegmentTime = segmentTime - segmentDuration;
      const nextSegmentTime = segmentTime + segmentDuration;

      const severityEvents = events.filter(e => e.severity === severityType);

      const otherEvents = events.filter(e => e.severity !== severityType);

      const hasPrevSeverityEvent = severityEvents.some(e => {
        return (
          prevSegmentTime >= getSegmentStart(e.start_time) &&
          prevSegmentTime < getSegmentEnd(e.end_time)
        );
      });

      const hasNextSeverityEvent = severityEvents.some(e => {
        return (
          nextSegmentTime >= getSegmentStart(e.start_time) &&
          nextSegmentTime < getSegmentEnd(e.end_time)
        );
      });

      const hasPrevOtherEvent = otherEvents.some(e => {
         return (
           prevSegmentTime >= getSegmentStart(e.start_time) &&
           prevSegmentTime < getSegmentEnd(e.end_time)
         );
      });

      const hasNextOtherEvent = otherEvents.some(e => {
         return (
           nextSegmentTime >= getSegmentStart(e.start_time) &&
           nextSegmentTime < getSegmentEnd(e.end_time)
         );
      });

      const hasOverlappingSeverityEvent = severityEvents.some(e => {
        return segmentTime >= getSegmentStart(e.start_time) &&
               segmentTime < getSegmentEnd(e.end_time)
      });

      const hasOverlappingOtherEvent = otherEvents.some(e => {
        return segmentTime >= getSegmentStart(e.start_time) &&
               segmentTime < getSegmentEnd(e.end_time)
      });

      let roundTop = false;
      let roundBottom = false;

      if (hasOverlappingSeverityEvent) {
        roundBottom = !hasPrevSeverityEvent;
        roundTop = !hasNextSeverityEvent;
      } else if (hasOverlappingOtherEvent) {
        roundBottom = !hasPrevOtherEvent;
        roundTop = !hasNextOtherEvent;
      } else {
        roundTop = !hasNextSeverityEvent || !hasNextOtherEvent;
        roundBottom = !hasPrevSeverityEvent || !hasPrevOtherEvent;
      }

      return {
        roundTop,
        roundBottom
      };

    },
    [events, getSegmentStart, getSegmentEnd, segmentDuration, severityType]
  );

  return { getSegmentStart, getSegmentEnd, getSeverity, displaySeverityType, getReviewed, shouldShowRoundedCorners };
};
