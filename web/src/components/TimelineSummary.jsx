import { h } from 'preact';
import useSWR from 'swr';
import Heading from './Heading';
import ActivityIndicator from './ActivityIndicator';
import { formatUnixTimestampToDateTime } from '../utils/dateUtil';
import PlayIcon from '../icons/Play';
import ExitIcon from '../icons/Exit';
import { Zone } from '../icons/Zone';
import { useState } from 'preact/hooks';
import { useApiHost } from '../api';
import Button from './Button';
import VideoPlayer from './VideoPlayer';

export default function TimelineSummary({ event }) {
  const apiHost = useApiHost();
  const eventDuration = event.end_time - event.start_time;
  const { data: eventTimeline } = useSWR([
    'timeline',
    {
      source_id: event.id,
    },
  ]);

  const { data: config } = useSWR('config');

  const [timeIndex, setTimeIndex] = useState(0);

  const onSelectMoment = async (index) => {
    setTimeIndex(index);

    if (this.player) {
      const videoOffset = this.player.duration() - eventDuration;
      const startTime = videoOffset + (eventTimeline[index].timestamp - event.start_time);
      this.player.currentTime(startTime);
    }
  };

  if (!eventTimeline || !config) {
    return <ActivityIndicator />;
  }

  return (
    <div>
      <div className="h-14 flex justify-center">
        <div className="w-1/4 flex flex-row flex-nowrap justify-between">
          {eventTimeline.map((item, index) =>
            item.class_type == 'visible' || item.class_type == 'gone' ? (
              <Button
                className="rounded-full"
                type="text"
                color={index == timeIndex ? 'blue' : 'gray'}
                aria-label={getTimelineItemDescription(config, item, event)}
                onClick={() => onSelectMoment(index)}
              >
                {item.class_type == 'visible' ? <PlayIcon className="w-8" /> : <ExitIcon className="w-8" />}
              </Button>
            ) : (
              <Button
                className="rounded-full"
                type="text"
                color={index == timeIndex ? 'blue' : 'gray'}
                aria-label={getTimelineItemDescription(config, item, event)}
                onClick={() => onSelectMoment(index)}
              >
                <Zone className="w-8" />
              </Button>
            )
          )}
        </div>
      </div>

      <div className="text-center">
        <Heading size="sm">{getTimelineItemDescription(config, eventTimeline[timeIndex], event)}</Heading>
        <VideoPlayer
          options={{
            preload: 'auto',
            autoplay: false,
            sources: [
              {
                src: `${apiHost}vod/event/${event.id}/master.m3u8`,
                type: 'application/vnd.apple.mpegurl',
              },
            ],
          }}
          seekOptions={{ forward: 10, backward: 5 }}
          onReady={(player) => {
            this.player = player;
          }}
          onDispose={() => {
            this.player = null;
          }}
        />
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
    return `${event.label.replaceAll('_', ' ')} entered ${timelineItem.data.zones
      .join(' and ')
      .replaceAll('_', ' ')} at ${formatUnixTimestampToDateTime(timelineItem.timestamp, {
      date_style: 'short',
      time_style: 'medium',
      time_format: config.ui.time_format,
    })}`;
  }

  return `${event.label} left at ${formatUnixTimestampToDateTime(timelineItem.timestamp, {
    date_style: 'short',
    time_style: 'medium',
    time_format: config.ui.time_format,
  })}`;
}
