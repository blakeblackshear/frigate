import { h } from 'preact';
import useSWR from 'swr';
import ActivityIndicator from './ActivityIndicator';
import { formatUnixTimestampToDateTime } from '../utils/dateUtil';
import PlayIcon from '../icons/Play';
import ExitIcon from '../icons/Exit';
import { Zone } from '../icons/Zone';
import { useState } from 'preact/hooks';
import Button from './Button';
import { getUnixTime } from 'date-fns';

export default function TimelineSummary({ event, onFrameSelected }) {
  const { data: eventTimeline } = useSWR([
    'timeline',
    {
      source_id: event.id,
    },
  ]);

  const { data: config } = useSWR('config');

  const [timeIndex, setTimeIndex] = useState(-1);

  const recordingParams = {
    before: event.end_time || getUnixTime(),
    after: event.start_time,
  };
  const { data: recordings } = useSWR([`${event.camera}/recordings`, recordingParams], { revalidateOnFocus: false });

  // calculates the seek seconds by adding up all the seconds in the segments prior to the playback time
  const getSeekSeconds = (seekUnix) => {
    if (!recordings) {
      return 0;
    }

    let seekSeconds = 0;
    recordings.every((segment) => {
      // if the next segment is past the desired time, stop calculating
      if (segment.start_time > seekUnix) {
        return false;
      }

      if (segment.end_time < seekUnix) {
        seekSeconds += segment.end_time - segment.start_time;
        return true;
      }

      seekSeconds += segment.end_time - segment.start_time - (segment.end_time - seekUnix);
      return true;
    });

    return seekSeconds;
  };

  const onSelectMoment = async (index) => {
    setTimeIndex(index);
    onFrameSelected(eventTimeline[index], getSeekSeconds(eventTimeline[index].timestamp));
  };

  if (!eventTimeline || !config) {
    return <ActivityIndicator />;
  }

  if (eventTimeline.length == 0) {
    return <div />;
  }

  return (
    <div className="flex flex-col">
      <div className="h-14 flex justify-center">
        <div className="sm:w-1 md:w-1/4 flex flex-row flex-nowrap justify-between overflow-auto">
          {eventTimeline.map((item, index) =>
            item.class_type == 'visible' || item.class_type == 'gone' ? (
              <Button
                key={index}
                className="rounded-full"
                type="text"
                color={index == timeIndex ? 'blue' : 'gray'}
                aria-label={window.innerWidth > 640 ? getTimelineItemDescription(config, item, event) : ''}
                onClick={() => onSelectMoment(index)}
              >
                {item.class_type == 'visible' ? <PlayIcon className="w-8" /> : <ExitIcon className="w-8" />}
              </Button>
            ) : (
              <Button
                key={index}
                className="rounded-full"
                type="text"
                color={index == timeIndex ? 'blue' : 'gray'}
                aria-label={window.innerWidth > 640 ? getTimelineItemDescription(config, item, event) : ''}
                onClick={() => onSelectMoment(index)}
              >
                <Zone className="w-8" />
              </Button>
            )
          )}
        </div>
      </div>
      {timeIndex >= 0 ? (
        <div className="bg-gray-500 p-4 m-2 max-w-md self-center">
          Disclaimer: This data comes from the detect feed but is shown on the recordings, it is unlikely that the
          streams are perfectly in sync so the bounding box and the footage will not line up perfectly.
        </div>
      ) : null}
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
