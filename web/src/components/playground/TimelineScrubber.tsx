import useSWR from "swr";
import ActivityScrubber, { ScrubberItem } from "../scrubber/ActivityScrubber";

type TimelineScrubberProps = {
  eventID: string;
};

function timelineEventsToScrubberItems(events: Timeline[]): ScrubberItem[] {
  return events.map((event: Timeline, index: number) => ({
    id: index,
    content: event.class_type,
    start: event.timestamp * 1000,
    type: "box",
  }));
}

function generateScrubberOptions(events: Timeline[]) {
  const startTime = events[0].timestamp * 1000 - 10;
  const endTime = events[events.length - 1].timestamp * 1000 + 10;

  return { start: startTime, end: endTime };
}

function TimelineScrubber({ eventID }: TimelineScrubberProps) {
  const { data: eventTimeline } = useSWR<Timeline[]>([
    "timeline",
    {
      source_id: eventID,
    },
  ]);

  return (
    <>
      {eventTimeline && (
        <>
          <ActivityScrubber
            items={timelineEventsToScrubberItems(eventTimeline)}
            options={generateScrubberOptions(eventTimeline)}
          />
        </>
      )}
    </>
  );
}

export default TimelineScrubber;
