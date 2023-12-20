import { useEffect, useRef, useState } from "react";
import {
  Timeline as VisTimeline,
  TimelineGroup,
  TimelineItem,
  TimelineOptions,
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
  items: TimelineItem[];
  groups?: TimelineGroup[];
  options?: TimelineOptions;
} & TimelineEventsHandlers;

function ActivityScrubber({
  items,
  groups,
  options,
  ...eventHandlers
}: ActivityScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<{ timeline: VisTimeline | null }>({
    timeline: null,
  });
  const [currentTime, setCurrentTime] = useState(Date.now());

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

    const timelineInstance = new VisTimeline(
      divElement,
      items as DataItem[],
      groups as DataGroup[],
      options
    );

    domEvents.forEach((event) => {
      const eventHandler = eventHandlers[`${event}Handler`];
      if (typeof eventHandler === "function") {
        timelineInstance.on(event, eventHandler);
      }
    });

    timelineRef.current.timeline = timelineInstance;

    const timelineOptions: TimelineOptions = {
      ...defaultOptions,
      ...options,
    };

    timelineInstance.setOptions(timelineOptions);

    return () => {
      timelineInstance.destroy();
    };
  }, []);

  useEffect(() => {
    if (!timelineRef.current.timeline) {
      return;
    }

    // If the currentTime updates, adjust the scrubber's end date and max
    // May not be applicable to all scrubbers, might want to just pass this in
    // for any scrubbers that we want to dynamically move based on time
    // const updatedTimeOptions: TimelineOptions = {
    //   end: currentTime,
    //   max: currentTime,
    // };

    const timelineOptions: TimelineOptions = {
      ...defaultOptions,
      // ...updatedTimeOptions,
      ...options,
    };

    timelineRef.current.timeline.setOptions(timelineOptions);
    if (items) timelineRef.current.timeline.setItems(items);
  }, [items, groups, options, currentTime, eventHandlers]);

  return <div ref={containerRef} />;
}

export default ActivityScrubber;
