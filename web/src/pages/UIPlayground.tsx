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
import { ReviewTimeline } from "@/components/timeline/ReviewTimeline";

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

const generateRandomEvent = (): Event => {
  const start_time = Date.now() - Math.random() * 3600000 * 3;
  const end_time = start_time + Math.random() * 36000;
  const severities = ["motion", "detection", "alert"];
  const severity = severities[Math.floor(Math.random() * severities.length)];
  const has_been_reviewed = Math.random() < 0.2;
  const id = new Date(start_time).toISOString(); // Date string as mock ID
  return { id, start_time, end_time, severity, has_been_reviewed };
};

function UIPlayground() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [timeline, setTimeline] = useState<string | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);
  const [mockEvents, setMockEvents] = useState<Event[]>([]);

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

            <div className="w-72 my-5">
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
          <ReviewTimeline
            segmentDuration={60}
            timestampSpread={15}
            timelineStart={Date.now()}
            timelineDuration={24 * 60 * 60}
            showHandlebar
            handlebarTime={Date.now() - 27 * 60 * 1000}
            showMinimap
            minimapStartTime={Date.now() - 35 * 60 * 1000}
            minimapEndTime={Date.now() - 21 * 60 * 1000}
            events={mockEvents}
            severityType={"alert"}
            contentRef={contentRef}
          />
        </div>
      </div>
    </>
  );
}

export default UIPlayground;
