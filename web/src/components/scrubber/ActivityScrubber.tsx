import { useRef, useEffect, useState } from "react";
import { Timeline } from "vis-timeline";
import { TimelineOptions } from "vis-timeline/standalone";
import "./scrubber.css";

export type ScrubberItem = {
  id: string;
  content: string;
  start: Date;
  end?: Date;
  type?: "box" | "point";
};

export type ScrubberSelectProps = {
  nodes: ScrubberItem[];
};

type ScrubberChartProps = {
  items: ScrubberItem[];
  options?: TimelineOptions;
  onSelect?: (props: ScrubberSelectProps) => void;
};

export function ActivityScrubber({
  items,
  options,
  onSelect,
}: ScrubberChartProps) {
  const container = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const defaultOptions: TimelineOptions = {
      width: "100%",
      stack: true,
      showMajorLabels: true,
      showCurrentTime: true,
      zoomMin: 10 * 1000, // 10 seconds
      end: currentTime,
      max: currentTime,
      format: {
        minorLabels: {
          minute: "h:mma",
          hour: "ha",
        },
      },
    };

    const timelineOptions: TimelineOptions = {
      ...defaultOptions,
      ...options,
    };

    if (!timelineRef.current) {
      timelineRef.current = new Timeline(
        container.current as HTMLDivElement,
        items,
        timelineOptions
      );

      const updateRange = () => {
        timelineRef.current?.setOptions(timelineOptions);
      };

      timelineRef.current.on("rangechanged", updateRange);
      if (onSelect) {
        timelineRef.current.on("select", onSelect);
      }

      return () => {
        timelineRef.current?.off("rangechanged", updateRange);
      };
    } else {
      // Update existing timeline
      timelineRef.current.setItems(items);
      timelineRef.current.setOptions(timelineOptions);
    }
  }, [items, options, currentTime]);

  return <div ref={container}></div>;
}

export default ActivityScrubber;
