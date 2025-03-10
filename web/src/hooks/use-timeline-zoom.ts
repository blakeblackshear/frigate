import { useState, useEffect, useCallback, useRef } from "react";
import { TimelineZoomDirection } from "@/types/review";

type ZoomSettings = {
  segmentDuration: number;
  timestampSpread: number;
};

type UseTimelineZoomProps = {
  zoomSettings: ZoomSettings;
  zoomLevels: ZoomSettings[];
  onZoomChange: (newZoomLevel: number) => void;
  pinchThresholdPercent?: number;
  timelineRef: React.RefObject<HTMLDivElement>;
  timelineDuration: number;
};

export function useTimelineZoom({
  zoomSettings,
  zoomLevels,
  onZoomChange,
  pinchThresholdPercent = 20,
  timelineRef,
  timelineDuration,
}: UseTimelineZoomProps) {
  const [zoomLevel, setZoomLevel] = useState(
    zoomLevels.findIndex(
      (level) =>
        level.segmentDuration === zoomSettings.segmentDuration &&
        level.timestampSpread === zoomSettings.timestampSpread,
    ),
  );
  const [isZooming, setIsZooming] = useState(false);
  const [zoomDirection, setZoomDirection] =
    useState<TimelineZoomDirection>(null);
  const touchStartDistanceRef = useRef(0);

  const getPinchThreshold = useCallback(() => {
    return (window.innerHeight * pinchThresholdPercent) / 100;
  }, [pinchThresholdPercent]);

  const wheelDeltaRef = useRef(0);
  const isZoomingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleZoom = useCallback(
    (delta: number) => {
      setIsZooming(true);
      setZoomDirection(delta > 0 ? "out" : "in");
      setZoomLevel((prevLevel) => {
        const newLevel = Math.max(
          0,
          Math.min(zoomLevels.length - 1, prevLevel - delta),
        );
        if (newLevel !== prevLevel && timelineRef.current) {
          const { scrollTop, clientHeight, scrollHeight } = timelineRef.current;

          // get time at the center of the viewable timeline
          const centerRatio = (scrollTop + clientHeight / 2) / scrollHeight;
          const centerTime = centerRatio * timelineDuration;

          // calc the new total height based on the new zoom level
          const newTotalHeight =
            (timelineDuration / zoomLevels[newLevel].segmentDuration) * 8;

          // calc the new scroll position to keep the center time in view
          const newScrollTop =
            (centerTime / timelineDuration) * newTotalHeight - clientHeight / 2;

          onZoomChange(newLevel);

          // Apply new scroll position after a short delay to allow for DOM update
          setTimeout(() => {
            if (timelineRef.current) {
              timelineRef.current.scrollTop = newScrollTop;
            }
          }, 0);
        }
        return newLevel;
      });

      setTimeout(() => {
        setIsZooming(false);
        setZoomDirection(null);
      }, 500);
    },
    [zoomLevels, onZoomChange, timelineRef, timelineDuration],
  );

  const debouncedZoom = useCallback(() => {
    if (Math.abs(wheelDeltaRef.current) >= 200) {
      handleZoom(wheelDeltaRef.current > 0 ? 1 : -1);
      wheelDeltaRef.current = 0;
      isZoomingRef.current = false;
    } else {
      isZoomingRef.current = false;
    }
  }, [handleZoom]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();

        if (!isZoomingRef.current) {
          wheelDeltaRef.current += event.deltaY;

          if (Math.abs(wheelDeltaRef.current) >= 200) {
            isZoomingRef.current = true;

            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }

            debounceTimeoutRef.current = setTimeout(() => {
              debouncedZoom();
            }, 200);
          }
        }
      }
    },
    [debouncedZoom],
  );

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY,
      );
      touchStartDistanceRef.current = distance;
    }
  }, []);

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (event.touches.length === 2) {
        event.preventDefault();
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY,
        );

        const distanceDelta = currentDistance - touchStartDistanceRef.current;
        const pinchThreshold = getPinchThreshold();

        if (Math.abs(distanceDelta) > pinchThreshold) {
          handleZoom(distanceDelta > 0 ? -1 : 1);
          touchStartDistanceRef.current = currentDistance;
        }
      }
    },
    [handleZoom, getPinchThreshold],
  );

  useEffect(() => {
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove]);

  return { zoomLevel, handleZoom, isZooming, zoomDirection };
}
