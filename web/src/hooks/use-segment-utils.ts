import { useCallback, useMemo } from 'react';
import { Event } from '@/types/event';

export const useSegmentUtils = (
  segmentDuration: number,
  events: Event[],
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
      case "motion":
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
    (segmentTime: number): boolean => {
      const prevSegmentTime = segmentTime - segmentDuration;
      const nextSegmentTime = segmentTime + segmentDuration;

      const hasPrevEvent = events.some((e) => {
        return (
          prevSegmentTime >= getSegmentStart(e.start_time) &&
          prevSegmentTime < getSegmentEnd(e.end_time) &&
          e.severity === severityType
        );
      });

      const hasNextEvent = events.some((e) => {
        return (
          nextSegmentTime >= getSegmentStart(e.start_time) &&
          nextSegmentTime < getSegmentEnd(e.end_time) &&
          e.severity === severityType
        );
      });

      return !hasPrevEvent || !hasNextEvent;
    },
    [events, getSegmentStart, getSegmentEnd, segmentDuration, severityType]
  );

  return { getSegmentStart, getSegmentEnd, getSeverity, displaySeverityType, getReviewed, shouldShowRoundedCorners };
};
