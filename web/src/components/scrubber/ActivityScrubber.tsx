import { useEffect, useRef, useState } from "react";
import {
  Timeline as VisTimeline,
  TimelineGroup,
  TimelineItem,
  TimelineOptions,
  DateType,
  IdType,
} from "vis-timeline";
import type { DataGroup, DataItem, TimelineEvents } from "vis-timeline/types";
import "./scrubber.css";

export type TimelineEventsWithMissing =
  | TimelineEvents
  | "dragover"
  | "markerchange"
  | "markerchanged";

export type TimelineEventHandler =
  | "currentTimeTickHandler"
  | "clickHandler"
  | "contextmenuHandler"
  | "doubleClickHandler"
  | "dragoverHandler"
  | "dropHandler"
  | "mouseOverHandler"
  | "mouseDownHandler"
  | "mouseUpHandler"
  | "mouseMoveHandler"
  | "groupDraggedHandler"
  | "changedHandler"
  | "rangechangeHandler"
  | "rangechangedHandler"
  | "selectHandler"
  | "itemoverHandler"
  | "itemoutHandler"
  | "timechangeHandler"
  | "timechangedHandler"
  | "markerchangeHandler"
  | "markerchangedHandler";

type EventHandler = {
  (properties: any): void;
};

export type TimelineEventsHandlers = Partial<
  Record<TimelineEventHandler, EventHandler>
>;

export type ScrubberItem = TimelineItem;

const domEvents: TimelineEventsWithMissing[] = [
  "currentTimeTick",
  "click",
  "contextmenu",
  "doubleClick",
  "dragover",
  "drop",
  "mouseOver",
  "mouseDown",
  "mouseUp",
  "mouseMove",
  "groupDragged",
  "changed",
  "rangechange",
  "rangechanged",
  "select",
  "itemover",
  "itemout",
  "timechange",
  "timechanged",
  "markerchange",
  "markerchanged",
];

type ActivityScrubberProps = {
  className?: string;
  items?: TimelineItem[];
  timeBars?: { time: DateType; id: IdType }[];
  groups?: TimelineGroup[];
  options?: TimelineOptions;
} & TimelineEventsHandlers;

function ActivityScrubber({
  className,
  items,
  timeBars,
  groups,
  options,
  ...eventHandlers
}: ActivityScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<{ timeline: VisTimeline | null }>({
    timeline: null,
  });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [_, setCustomTimes] = useState<
    { id: IdType; time: DateType }[]
  >([]);

  const defaultOptions: TimelineOptions = {
    width: "100%",
    maxHeight: "350px",
    stack: true,
    showMajorLabels: true,
    showCurrentTime: false,
    zoomMin: 10 * 1000, // 10 seconds
    // start: new Date(currentTime - 60 * 1 * 60 * 1000), // 1 hour ago
    end: currentTime,
    max: currentTime,
    format: {
      minorLabels: {
        minute: "h:mma",
        hour: "ha",
      },
    },
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const divElement = containerRef.current;
    if (!divElement) {
      return;
    }

    const timelineOptions: TimelineOptions = {
      ...defaultOptions,
      ...options,
    };

    const timelineInstance = new VisTimeline(
      divElement,
      items as DataItem[],
      groups as DataGroup[],
      timelineOptions
    );

    if (timeBars) {
      timeBars.forEach((bar) => {
        timelineInstance.addCustomTime(bar.time, bar.id);
      });
    }

    domEvents.forEach((event) => {
      const eventHandler = eventHandlers[`${event}Handler`];
      if (typeof eventHandler === "function") {
        timelineInstance.on(event, eventHandler);
      }
    });

    timelineRef.current.timeline = timelineInstance;

    return () => {
      timelineInstance.destroy();
    };
  }, [containerRef]);

  // need to keep custom times in sync
  useEffect(() => {
    if (!timelineRef.current.timeline || timeBars == undefined) {
      return;
    }

    setCustomTimes((prevTimes) => {
      if (prevTimes.length == 0 && timeBars.length == 0) {
        return [];
      }

      prevTimes
        .filter((x) => timeBars.find((y) => x.id == y.id) == undefined)
        .forEach((time) => {
          try {
            timelineRef.current.timeline?.removeCustomTime(time.id);
          } catch {}
        });

      timeBars.forEach((time) => {
        try {
          const existing = timelineRef.current.timeline?.getCustomTime(time.id);

          if (existing != time.time) {
            timelineRef.current.timeline?.setCustomTime(time.time, time.id);
          }
        } catch {
          timelineRef.current.timeline?.addCustomTime(time.time, time.id);
        }
      });

      return timeBars;
    });
  }, [timeBars, timelineRef]);

  return (
    <div className={className || ""}>
      <div ref={containerRef} />
    </div>
  );
}

export default ActivityScrubber;
