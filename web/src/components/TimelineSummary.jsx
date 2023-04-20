import { h } from 'preact';
import useSWR from 'swr';
import Heading from './Heading';
import ActivityIndicator from './ActivityIndicator';
import { formatUnixTimestampToDateTime } from '../utils/dateUtil';

export default function TimelineSummary({ event }) {
  const { data: eventTimeline } = useSWR([
    'timeline',
    {
      source_id: event.id,
    },
  ]);

  if (!eventTimeline) {
    return <ActivityIndicator />;
  }

  return (
    <div>
      <Heading>Timeline:</Heading>
      {eventTimeline.map((item, index) => (
        <div key="index">{getTimelineItemDescription(item, event, index)}</div>
      ))}
    </div>
  );
}

function getTimelineItemDescription(timelineItem, event, index) {
  if (timelineItem.class_type == 'visible') {
    return `${index}. ${event.label} detected at ${formatUnixTimestampToDateTime(event.start_time, { date_style: "short", time_style: "medium" })}`;
  } else if (timelineItem.class_type == 'entered_zone') {
    return `${index}. ${event.label} entered ${timelineItem.data.zones} at ${formatUnixTimestampToDateTime(event.start_time, { date_style: "short", time_style: "medium" })}`;
  }

  return `${index}. ${event.label} left at ${formatUnixTimestampToDateTime(event.start_time, { date_style: "short", time_style: "medium" })}`;
}
