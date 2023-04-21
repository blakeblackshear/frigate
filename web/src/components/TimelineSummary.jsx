import { h } from 'preact';
import useSWR from 'swr';
import Heading from './Heading';
import ActivityIndicator from './ActivityIndicator';
import { formatUnixTimestampToDateTime } from '../utils/dateUtil';
import MotionIcon from '../icons/Motion';
import SnapshotIcon from '../icons/Snapshot';
import { Zone } from '../icons/Zone';
import { useState } from 'preact/hooks';
import { useApiHost } from '../api';
import Button from './Button';

export default function TimelineSummary({ event }) {
  const apiHost = useApiHost();
  const { data: eventTimeline } = useSWR([
    'timeline',
    {
      source_id: event.id,
    },
  ]);

  const { data: config } = useSWR('config');

  const [timeIndex, setTimeIndex] = useState(0);

  if (!eventTimeline || !config) {
    return <ActivityIndicator />;
  }

  return (
    <div>
      <div className="h-14 flex justify-center">
        <div className="w-1/4 flex flex-row flex-nowrap justify-between">
          {eventTimeline.map((item, index) =>
            item.class_type == 'visible' || item.class_type == 'gone' ? (
              <Button className="rounded-full" type="text" onClick={() => setTimeIndex(index)}>
                <MotionIcon className="w-8" />
              </Button>
            ) : (
              <Button className="rounded-full" type="text" onClick={() => setTimeIndex(index)}>
                <Zone className="w-8" />
              </Button>
            )
          )}
        </div>
      </div>

      <div className="text-center">
        <Heading size="md">{getTimelineItemDescription(config, eventTimeline[timeIndex], event)}</Heading>
        <div className="flex justify-center p-2">
          <img
            className="flex-grow-0"
            src={`${apiHost}/api/${event.camera}/recordings/${eventTimeline[timeIndex].timestamp}/snapshot.png`}
          />
        </div>
      </div>
    </div>
  );
}

function getTimelineItemDescription(config, timelineItem, event) {
  if (timelineItem.class_type == 'visible') {
    return `${event.label} detected at ${formatUnixTimestampToDateTime(timelineItem.timestamp, {
      date_style: 'short',
      time_style: 'medium',
      time_format: config.ui.time_format,
    })}`;
  } else if (timelineItem.class_type == 'entered_zone') {
    return `${event.label} entered ${timelineItem.data.zones} at ${formatUnixTimestampToDateTime(
      timelineItem.timestamp,
      { date_style: 'short', time_style: 'medium', time_format: config.ui.time_format }
    )}`;
  }

  return `${event.label} left at ${formatUnixTimestampToDateTime(timelineItem.timestamp, {
    date_style: 'short',
    time_style: 'medium',
    time_format: config.ui.time_format,
  })}`;
}
