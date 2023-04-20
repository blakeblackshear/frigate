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

  const { data: config } = useSWR('config');

  if (!eventTimeline || !config) {
    return <ActivityIndicator />;
  }

  return (
    <div>
      <Heading>Timeline:</Heading>
      {eventTimeline.map((item, index) => (
        <div key="index">{getTimelineItemDescription(config, item, event, index)}</div>
      ))}
    </div>
  );
}

function getTimelineItemDescription(config, timelineItem, event, index) {
  if (timelineItem.class_type == 'visible') {
    return `${index + 1}. ${event.label} detected at ${formatUnixTimestampToDateTime(timelineItem.timestamp, { date_style: "short", time_style: "medium", time_format: config.ui.time_format })}`;
  } else if (timelineItem.class_type == 'entered_zone') {
    return `${index + 1}. ${event.label} entered ${timelineItem.data.zones} at ${formatUnixTimestampToDateTime(timelineItem.timestamp, { date_style: "short", time_style: "medium", time_format: config.ui.time_format })}`;
  }

  return `${index + 1}. ${event.label} left at ${formatUnixTimestampToDateTime(timelineItem.timestamp, { date_style: "short", time_style: "medium", time_format: config.ui.time_format })}`;
}
