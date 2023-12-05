import Heading from '../components/Heading';
import { useMemo, useState } from 'preact/hooks';
import useSWR from 'swr';
import ActivityIndicator from '../components/ActivityIndicator';
import PreviewPlayer from '../components/PreviewPlayer';
import { formatUnixTimestampToDateTime } from '../utils/dateUtil';
import { Clock } from '../icons/Clock';
import { Camera } from '../icons/Camera';
import ActiveObjectIcon from '../icons/ActiveObject';
import PlayIcon from '../icons/Play';
import ExitIcon from '../icons/Exit';
import StationaryObjectIcon from '../icons/StationaryObject';
import FaceIcon from '../icons/Face';
import LicensePlateIcon from '../icons/LicensePlate';
import DeliveryTruckIcon from '../icons/DeliveryTruck';
import ZoneIcon from '../icons/Zone';

export default function Export() {
  const { data: config } = useSWR('config');
  const timezone = useMemo(() => config?.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, [config]);
  const { data: hourlyTimeline } = useSWR(['timeline/hourly', { timezone }]);
  const { data: allPreviews } = useSWR([
    `preview/all/start/${Object.keys(hourlyTimeline || [0])[0]}/end/${Object.keys(hourlyTimeline || [0]).slice(-1)[0]}`,
  ]);

  // detail levels can be normal, extra, full
  const [detailLevel, setDetailLevel] = useState('normal');

  const timelineCards = useMemo(() => {
    if (!hourlyTimeline) {
      return [];
    }

    const cards = {};
    Object.keys(hourlyTimeline)
      .reverse()
      .forEach((hour) => {
        const source_to_types = {};
        Object.values(hourlyTimeline[hour]).forEach((i) => {
          const time = new Date(i.timestamp * 1000);
          time.setSeconds(0);
          time.setMilliseconds(0);
          const key = `${i.source_id}-${time.getMinutes()}`;
          if (key in source_to_types) {
            source_to_types[key].push(i.class_type);
          } else {
            source_to_types[key] = [i.class_type];
          }
        });

        cards[hour] = {};
        Object.values(hourlyTimeline[hour]).forEach((i) => {
          const time = new Date(i.timestamp * 1000);
          time.setSeconds(0);
          time.setMilliseconds(0);
          const key = `${i.camera}-${time.getMinutes()}`;

          // detail level for saving items
          // detail level determines which timeline items for each moment is returned
          // values can be normal, extra, or full
          // normal: return all items except active / attribute / gone / stationary / visible unless that is the only item.
          // extra: return all items except attribute / gone / visible unless that is the only item
          // full: return all items

          let add = true;
          if (detailLevel == 'normal') {
            if (
              source_to_types[`${i.source_id}-${time.getMinutes()}`].length > 1 &&
              ['active', 'attribute', 'gone', 'stationary', 'visible'].includes(i.class_type)
            ) {
              add = false;
            }
          } else if (detailLevel == 'extra') {
            if (
              source_to_types[`${i.source_id}-${time.getMinutes()}`].length > 1 &&
              i.class_type in ['attribute', 'gone', 'visible']
            ) {
              add = false;
            }
          }

          if (add) {
            if (key in cards[hour]) {
              cards[hour][key].entries.push(i);
            } else {
              cards[hour][key] = {
                camera: i.camera,
                time: time.getTime() / 1000,
                entries: [i],
              };
            }
          }
        });
      });

    return cards;
  }, [detailLevel, hourlyTimeline]);

  if (!timelineCards) {
    return <ActivityIndicator />;
  }

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>Review</Heading>
      <div className="text-xs">Dates and times are based on the timezone {timezone}</div>

      <div>
        {Object.entries(timelineCards).map(([hour, timelineHour]) => {
          return (
            <div key={hour}>
              <Heading size="md">
                {formatUnixTimestampToDateTime(hour, {
                  date_style: 'short',
                  time_style: 'medium',
                  time_format: config.ui.time_format,
                })}
              </Heading>
              <div className="flex overflow-auto">
                {Object.entries(timelineHour).map(([key, timeline]) => {
                  return (
                    <div
                      key={key}
                      className="dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow my-2 mr-2"
                    >
                      <PreviewPlayer
                        camera={timeline.camera}
                        allPreviews={allPreviews}
                        startTs={Object.values(timeline.entries)[0].timestamp}
                        mode="thumbnail"
                      />
                      <div className="p-2">
                        <div className="text-sm flex">
                          <Clock className="h-5 w-5 mr-2 inline" />
                          {formatUnixTimestampToDateTime(timeline.time, { ...config.ui })}
                        </div>
                        <div className="capitalize text-sm flex align-center mt-1">
                          <Camera className="h-5 w-5 mr-2 inline" />
                          {timeline.camera.replaceAll('_', ' ')}
                        </div>
                        <Heading size="xs" className="my-2">
                          Activity:
                        </Heading>
                        {Object.entries(timeline.entries).map(([_, entry]) => {
                          return (
                            <div key={entry.timestamp} className="flex text-xs my-1">
                              {getTimelineIcon(entry)}
                              {getTimelineItemDescription(config, entry)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTimelineIcon(timelineItem) {
  switch (timelineItem.class_type) {
    case 'visible':
      return <PlayIcon className="w-4 mr-1" />;
    case 'gone':
      return <ExitIcon className="w-4 mr-1" />;
    case 'active':
      return <ActiveObjectIcon className="w-4 mr-1" />;
    case 'stationary':
      return <StationaryObjectIcon className="w-4 mr-1" />;
    case 'entered_zone':
      return <ZoneIcon className="w-4 mr-1" />;
    case 'attribute':
      switch (timelineItem.data.attribute) {
        case 'face':
          return <FaceIcon className="w-4 mr-1" />;
        case 'license_plate':
          return <LicensePlateIcon className="w-4 mr-1" />;
        default:
          return <DeliveryTruckIcon className="w-4 mr-1" />;
      }
    case 'sub_label':
      switch (timelineItem.data.label) {
        case 'person':
          return <FaceIcon className="w-4 mr-1" />;
        case 'car':
          return <LicensePlateIcon className="w-4 mr-1" />;
      }
  }
}

function getTimelineItemDescription(config, timelineItem) {
  const label = (timelineItem.data.sub_label || timelineItem.data.label).replaceAll('_', ' ');

  switch (timelineItem.class_type) {
    case 'visible':
      return `${label} detected`;
    case 'entered_zone':
      return `${label} entered ${timelineItem.data.zones.join(' and ').replaceAll('_', ' ')}`;
    case 'active':
      return `${label} became active`;
    case 'stationary':
      return `${label} became stationary`;
    case 'attribute': {
      let title = '';
      if (timelineItem.data.attribute == 'face' || timelineItem.data.attribute == 'license_plate') {
        title = `${timelineItem.data.attribute.replaceAll('_', ' ')} detected for ${label}`;
      } else {
        title = `${timelineItem.data.sub_label} recognized as ${timelineItem.data.attribute.replaceAll('_', ' ')}`;
      }
      return title;
    }
    case 'sub_label':
      return `${timelineItem.data.label} recognized as ${timelineItem.data.sub_label}`;
    case 'gone':
      return `${label} left`;
  }
}
