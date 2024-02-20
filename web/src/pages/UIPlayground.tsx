import { useCallback, useMemo, useRef, useState } from "react";
import Heading from "@/components/ui/heading";
import ActivityScrubber, {
  ScrubberItem,
} from "@/components/scrubber/ActivityScrubber";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { Event } from "@/types/event";
import ActivityIndicator from "@/components/ui/activity-indicator";
import { useApiHost } from "@/api";
import TimelineScrubber from "@/components/playground/TimelineScrubber";
import EventReviewTimeline from "@/components/timeline/EventReviewTimeline";
import { ReviewData, ReviewSegment, ReviewSeverity } from "@/types/review";

// Color data
const colors = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
];

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center mb-2">
      <div
        className="w-10 h-10 mr-2 border border-gray-300"
        style={{ backgroundColor: value }}
      ></div>
      <span>{name}</span>
    </div>
  );
}

function eventsToScrubberItems(events: Event[]): ScrubberItem[] {
  const apiHost = useApiHost();

  return events.map((event: Event) => ({
    id: event.id,
    content: `<div class="flex"><img class="" src="${apiHost}api/events/${event.id}/thumbnail.jpg" /><span>${event.label}</span></div>`,
    start: new Date(event.start_time * 1000),
    end: event.end_time ? new Date(event.end_time * 1000) : undefined,
    type: "box",
  }));
}

const generateRandomEvent = (): ReviewSegment => {
  const start_time = Math.floor(Date.now() / 1000) - Math.random() * 60 * 60;
  const end_time = Math.floor(start_time + Math.random() * 60 * 10);
  const severities: ReviewSeverity[] = [
    "significant_motion",
    "detection",
    "alert",
  ];
  const severity = severities[Math.floor(Math.random() * severities.length)];
  const has_been_reviewed = Math.random() < 0.2;
  const id = new Date(start_time * 1000).toISOString(); // Date string as mock ID

  // You need to provide values for camera, thumb_path, and data
  const camera = "CameraXYZ";
  const thumb_path = "/path/to/thumb";
  const data: ReviewData = {
    audio: [],
    detections: [],
    objects: [],
    significant_motion_areas: [],
    zones: [],
  };

  return {
    id,
    start_time,
    end_time,
    severity,
    has_been_reviewed,
    camera,
    thumb_path,
    data,
  };
};

function UIPlayground() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [timeline, setTimeline] = useState<string | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);
  const [mockEvents, setMockEvents] = useState<ReviewSegment[]>([]);

  const onSelect = useCallback(({ items }: { items: string[] }) => {
    setTimeline(items[0]);
  }, []);

  const recentTimestamp = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 240);
    return now.getTime() / 1000;
  }, []);
  const { data: events } = useSWR<Event[]>([
    "events",
    { limit: 10, after: recentTimestamp },
  ]);

  useMemo(() => {
    const initialEvents = Array.from({ length: 50 }, generateRandomEvent);
    setMockEvents(initialEvents);
  }, []);

  return (
    <>
      <Heading as="h2">UI Playground</Heading>

      <Heading as="h4" className="my-5">
        Scrubber
      </Heading>
      <p className="text-small">
        Shows the 10 most recent events within the last 4 hours
      </p>

      {!config && <ActivityIndicator />}

      {config && (
        <div>
          {events && events.length > 0 && (
            <>
              <ActivityScrubber
                items={eventsToScrubberItems(events)}
                selectHandler={onSelect}
              />
            </>
          )}
        </div>
      )}

      {config && (
        <div>
          {timeline && (
            <>
              <TimelineScrubber eventID={timeline} />
            </>
          )}
        </div>
      )}

      <div className="flex">
        <div className="flex-grow">
          <div ref={contentRef}>
            <Heading as="h4" className="my-5">
              Color scheme
            </Heading>
            <p className="text-small">
              Colors as set by the current theme. See the{" "}
              <a
                className="underline"
                href="https://ui.shadcn.com/docs/theming"
              >
                shadcn theming docs
              </a>{" "}
              for usage.
            </p>

            <div className="my-5">
              {colors.map((color, index) => (
                <ColorSwatch
                  key={index}
                  name={color}
                  value={`hsl(var(--${color}))`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-none">
          <EventReviewTimeline
            segmentDuration={60} // seconds per segment
            timestampSpread={15} // minutes between each major timestamp
            timelineStart={Math.floor(Date.now() / 1000)} // start of the timeline - all times are numeric, not Date objects
            timelineEnd={Math.floor(Date.now() / 1000) + 2 * 60 * 60} // end of timeline - timestamp
            showHandlebar // show / hide the handlebar
            handlebarTime={Math.floor(Date.now() / 1000) - 27 * 60} // set the time of the handlebar
            showMinimap // show / hide the minimap
            minimapStartTime={Math.floor(Date.now() / 1000) - 35 * 60} // start time of the minimap - the earlier time (eg 1:00pm)
            minimapEndTime={Math.floor(Date.now() / 1000) - 21 * 60} // end of the minimap - the later time (eg 3:00pm)
            events={mockEvents} // events, including new has_been_reviewed and severity properties
            severityType={"alert"} // choose the severity type for the middle line - all other severity types are to the right
            contentRef={contentRef} // optional content ref where previews are, can be used for observing/scrolling later
          />
        </div>
      </div>
    </>
  );
}

export default UIPlayground;
