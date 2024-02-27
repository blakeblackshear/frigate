import useDraggableHandler from "@/hooks/use-handle-dragging";
import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  RefObject,
} from "react";
import EventSegment from "./EventSegment";
import { useEventUtils } from "@/hooks/use-event-utils";
import { ReviewSegment, ReviewSeverity } from "@/types/review";
import { TooltipProvider } from "../ui/tooltip";

export type EventReviewTimelineProps = {
  segmentDuration: number;
  timestampSpread: number;
  timelineStart: number;
  timelineEnd: number;
  showHandlebar?: boolean;
  handlebarTime?: number;
  setHandlebarTime?: React.Dispatch<React.SetStateAction<number>>;
  showMinimap?: boolean;
  minimapStartTime?: number;
  minimapEndTime?: number;
  events: ReviewSegment[];
  severityType: ReviewSeverity;
  contentRef: RefObject<HTMLDivElement>;
  onHandlebarDraggingChange?: (isDragging: boolean) => void;
};

export function EventReviewTimeline({
  segmentDuration,
  timestampSpread,
  timelineStart,
  timelineEnd,
  showHandlebar = false,
  handlebarTime,
  setHandlebarTime,
  showMinimap = false,
  minimapStartTime,
  minimapEndTime,
  events,
  severityType,
  contentRef,
  onHandlebarDraggingChange,
}: EventReviewTimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentTimeSegment, setCurrentTimeSegment] = useState<number>(0);
  const scrollTimeRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const timelineDuration = useMemo(
    () => timelineStart - timelineEnd,
    [timelineEnd, timelineStart]
  );

  const { alignDateToTimeline } = useEventUtils(events, segmentDuration);

  const { handleMouseDown, handleMouseUp, handleMouseMove } =
    useDraggableHandler({
      contentRef,
      timelineRef,
      scrollTimeRef,
      alignDateToTimeline,
      segmentDuration,
      showHandlebar,
      timelineDuration,
      timelineStart,
      isDragging,
      setIsDragging,
      currentTimeRef,
      setHandlebarTime,
    });

  function handleResize() {
    // TODO: handle screen resize for mobile
    if (timelineRef.current && contentRef.current) {
    }
  }

  useEffect(() => {
    if (contentRef.current) {
      const content = contentRef.current;
      observer.current = new ResizeObserver(() => {
        handleResize();
      });
      observer.current.observe(content);
      return () => {
        observer.current?.unobserve(content);
      };
    }
  }, []);

  // Generate segments for the timeline
  const generateSegments = useCallback(() => {
    const segmentCount = timelineDuration / segmentDuration;
    const segmentAlignedTime = alignDateToTimeline(timelineStart);

    return Array.from({ length: segmentCount }, (_, index) => {
      const segmentTime = segmentAlignedTime - index * segmentDuration;

      return (
        <EventSegment
          key={segmentTime + severityType}
          events={events}
          segmentDuration={segmentDuration}
          segmentTime={segmentTime}
          timestampSpread={timestampSpread}
          showMinimap={showMinimap}
          minimapStartTime={minimapStartTime}
          minimapEndTime={minimapEndTime}
          severityType={severityType}
          contentRef={contentRef}
        />
      );
    });
  }, [
    segmentDuration,
    timestampSpread,
    timelineStart,
    timelineDuration,
    showMinimap,
    minimapStartTime,
    minimapEndTime,
    events,
  ]);

  const segments = useMemo(
    () => generateSegments(),
    [
      segmentDuration,
      timestampSpread,
      timelineStart,
      timelineDuration,
      showMinimap,
      minimapStartTime,
      minimapEndTime,
      events,
    ]
  );

  useEffect(() => {
    if (showHandlebar) {
      requestAnimationFrame(() => {
        if (currentTimeRef.current && currentTimeSegment) {
          currentTimeRef.current.textContent = new Date(
            currentTimeSegment * 1000
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            ...(segmentDuration < 60 && { second: "2-digit" }),
          });
        }
      });
    }
  }, [currentTimeSegment, showHandlebar]);

  useEffect(() => {
    if (onHandlebarDraggingChange) {
      onHandlebarDraggingChange(isDragging);
    }
  }, [isDragging, onHandlebarDraggingChange]);

  useEffect(() => {
    if (timelineRef.current && handlebarTime && showHandlebar) {
      const { scrollHeight: timelineHeight } = timelineRef.current;

      // Calculate the height of an individual segment
      const segmentHeight =
        timelineHeight / (timelineDuration / segmentDuration);

      // Calculate the segment index corresponding to the target time
      const alignedHandlebarTime = alignDateToTimeline(handlebarTime);
      const segmentIndex = Math.ceil(
        (timelineStart - alignedHandlebarTime) / segmentDuration
      );

      // Calculate the top position based on the segment index
      const newTopPosition = Math.max(0, segmentIndex * segmentHeight);

      // Set the top position of the handle
      const thumb = scrollTimeRef.current;
      if (thumb) {
        requestAnimationFrame(() => {
          thumb.style.top = `${newTopPosition}px`;
        });
      }

      setCurrentTimeSegment(alignedHandlebarTime);
    }
  }, []);

  useEffect(() => {
    generateSegments();
    if (!currentTimeSegment && !handlebarTime) {
      setCurrentTimeSegment(timelineStart);
    }
    // TODO: touch events for mobile
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    currentTimeSegment,
    generateSegments,
    timelineStart,
    handleMouseUp,
    handleMouseMove,
  ]);

  return (
    <TooltipProvider skipDelayDuration={3000}>
      <div
        ref={timelineRef}
        className={`relative w-[120px] md:w-[100px] h-full overflow-y-scroll no-scrollbar bg-secondary ${
          isDragging && showHandlebar ? "cursor-grabbing" : "cursor-auto"
        }`}
      >
        <div className="flex flex-col">{segments}</div>
        {showHandlebar && (
          <div
            className={`absolute left-0 top-0 z-20 w-full `}
            role="scrollbar"
          >
            <div className={`flex items-center justify-center `}>
              <div
                ref={scrollTimeRef}
                className={`relative w-full ${
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                }`}
                onMouseDown={handleMouseDown}
              >
                <div
                  className={`bg-destructive rounded-full mx-auto ${
                    segmentDuration < 60 ? "w-20" : "w-16"
                  } h-5 flex items-center justify-center`}
                >
                  <div
                    ref={currentTimeRef}
                    className="text-white text-xs z-10"
                  ></div>
                </div>
                <div className="absolute h-1 w-full bg-destructive top-1/2 transform -translate-y-1/2"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default EventReviewTimeline;
