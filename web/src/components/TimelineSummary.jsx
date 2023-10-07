import { h } from 'preact';
import useSWR from 'swr';
import ActivityIndicator from './ActivityIndicator';
import { formatUnixTimestampToDateTime } from '../utils/dateUtil';
import About from '../icons/About';
import ActiveObjectIcon from '../icons/ActiveObject';
import PlayIcon from '../icons/Play';
import ExitIcon from '../icons/Exit';
import StationaryObjectIcon from '../icons/StationaryObject';
import FaceIcon from '../icons/Face';
import LicensePlateIcon from '../icons/LicensePlate';
import DeliveryTruckIcon from '../icons/DeliveryTruck';
import ZoneIcon from '../icons/Zone';
import { useMemo, useState } from 'preact/hooks';
import Button from './Button';

export default function TimelineSummary({ event, onFrameSelected }) {
  const { data: eventTimeline } = useSWR([
    'timeline',
    {
      source_id: event.id,
    },
  ]);

  const { data: config } = useSWR('config');

  const annotationOffset = useMemo(() => {
    if (!config) {
      return 0;
    }

    return (config.cameras[event.camera]?.detect?.annotation_offset || 0) / 1000;
  }, [config, event]);

  const [timeIndex, setTimeIndex] = useState(-1);

  const recordingParams = {
    before: event.end_time || Date.now(),
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
    onFrameSelected(eventTimeline[index], getSeekSeconds(eventTimeline[index].timestamp + annotationOffset));
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
          {eventTimeline.map((item, index) => (
            <Button
              key={index}
              className="rounded-full"
              type="iconOnly"
              color={index == timeIndex ? 'blue' : 'gray'}
              aria-label={window.innerWidth > 640 ? getTimelineItemDescription(config, item, event) : ''}
              onClick={() => onSelectMoment(index)}
            >
              {getTimelineIcon(item)}
            </Button>
          ))}
        </div>
      </div>
      {timeIndex >= 0 ? (
        <div className="m-2 max-w-md self-center">
          <div className="flex justify-start">
            <div className="text-lg flex justify-between py-4">Bounding boxes may not align</div>
            <Button
              className="rounded-full"
              type="text"
              color="gray"
              aria-label=" Disclaimer: This data comes from the detect feed but is shown on the recordings, it is unlikely that the
                      streams are perfectly in sync so the bounding box and the footage will not line up perfectly. The annotation_offset field can be used to adjust this."
            >
              <About className="w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getTimelineIcon(timelineItem) {
  switch (timelineItem.class_type) {
    case 'visible':
      return <PlayIcon className="w-8" />;
    case 'gone':
      return <ExitIcon className="w-8" />;
    case 'active':
      return <ActiveObjectIcon className="w-8" />;
    case 'stationary':
      return <StationaryObjectIcon className="w-8" />;
    case 'entered_zone':
      return <ZoneIcon className="w-8" />;
    case 'attribute':
      switch (timelineItem.data.attribute) {
        case 'face':
          return <FaceIcon className="w-8" />;
        case 'license_plate':
          return <LicensePlateIcon className="w-8" />;
        default:
          return <DeliveryTruckIcon className="w-8" />;
      }
  }
}

function getTimelineItemDescription(config, timelineItem, event) {
  switch (timelineItem.class_type) {
    case 'visible':
      return `${event.label} detected at ${formatUnixTimestampToDateTime(timelineItem.timestamp, {
        date_style: 'short',
        time_style: 'medium',
        time_format: config.ui.time_format,
      })}`;
    case 'entered_zone':
      return `${event.label.replaceAll('_', ' ')} entered ${timelineItem.data.zones
        .join(' and ')
        .replaceAll('_', ' ')} at ${formatUnixTimestampToDateTime(timelineItem.timestamp, {
        date_style: 'short',
        time_style: 'medium',
        time_format: config.ui.time_format,
      })}`;
    case 'active':
      return `${event.label} became active at ${formatUnixTimestampToDateTime(timelineItem.timestamp, {
        date_style: 'short',
        time_style: 'medium',
        time_format: config.ui.time_format,
      })}`;
    case 'stationary':
      return `${event.label} became stationary at ${formatUnixTimestampToDateTime(timelineItem.timestamp, {
        date_style: 'short',
        time_style: 'medium',
        time_format: config.ui.time_format,
      })}`;
    case 'attribute':
      return `${timelineItem.data.attribute.replaceAll("_", " ")} detected for ${event.label} at ${formatUnixTimestampToDateTime(
        timelineItem.timestamp,
        {
          date_style: 'short',
          time_style: 'medium',
          time_format: config.ui.time_format,
        }
      )}`;
    case 'gone':
      return `${event.label} left at ${formatUnixTimestampToDateTime(timelineItem.timestamp, {
        date_style: 'short',
        time_style: 'medium',
        time_format: config.ui.time_format,
      })}`;
  }
}
