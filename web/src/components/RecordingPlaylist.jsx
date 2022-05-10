import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import {
  getUnixTime,
  fromUnixTime,
  format,
  parseISO,
  intervalToDuration,
  formatDuration,
  endOfDay,
  startOfDay,
  isSameDay,
} from 'date-fns';
import ArrowDropdown from '../icons/ArrowDropdown';
import ArrowDropup from '../icons/ArrowDropup';
import Link from '../components/Link';
import ActivityIndicator from '../components/ActivityIndicator';
import Menu from '../icons/Menu';
import MenuOpen from '../icons/MenuOpen';
import { useApiHost } from '../api';
import useSWR from 'swr';

export default function RecordingPlaylist({ camera, recordings, selectedDate }) {
  const [active, setActive] = useState(true);
  const toggle = () => setActive(!active);

  const result = [];
  for (const recording of recordings) {
    const date = parseISO(recording.day);
    result.push(
      <ExpandableList
        title={format(date, 'MMM d, yyyy')}
        events={recording.events}
        selected={isSameDay(date, selectedDate)}
      >
        <DayOfEvents camera={camera} day={recording.day} hours={recording.hours} />
      </ExpandableList>
    );
  }

  const openClass = active ? '-left-6' : 'right-0';

  return (
    <div className="flex absolute inset-y-0 right-0 w-9/12 md:w-1/2 lg:w-3/5 max-w-md text-base text-white font-sans">
      <div
        onClick={toggle}
        className={`absolute ${openClass} cursor-pointer items-center self-center rounded-tl-lg rounded-bl-lg border border-r-0 w-6 h-20 py-7 bg-gray-800 bg-opacity-70`}
      >
        {active ? <Menu /> : <MenuOpen />}
      </div>
      <div
        className={`w-full h-full bg-gray-800 bg-opacity-70 border-l overflow-x-hidden overflow-y-auto${
          active ? '' : ' hidden'
        }`}
      >
        {result}
      </div>
    </div>
  );
}

export function DayOfEvents({ camera, day, hours }) {
  const date = parseISO(day);
  const { data: events } = useSWR([
    `events`,
    {
      before: getUnixTime(endOfDay(date)),
      after: getUnixTime(startOfDay(date)),
      camera,
      has_clip: '1',
      include_thumbnails: 0,
      limit: 5000,
    },
  ]);

  // maps all the events under the keys for the hour by hour recordings view
  const eventMap = useMemo(() => {
    const eventMap = {};
    for (const hour of hours) {
      eventMap[`${day}-${hour.hour}`] = [];
    }

    if (!events) {
      return eventMap;
    }

    for (const event of events) {
      const key = format(fromUnixTime(event.start_time), 'yyyy-MM-dd-HH');
      // if the hour of recordings is missing for the event start time, skip it
      if (key in eventMap) {
        eventMap[key].push(event);
      }
    }

    return eventMap;
  }, [events, day, hours]);

  if (!events) {
    return <ActivityIndicator />;
  }

  return (
    <>
      {hours.map((hour, i) => (
        <div key={i} className="mb-2 w-full">
          <div
            className={`flex w-full text-md text-white px-8 py-2 mb-2 ${
              i === 0 ? 'border-t border-white border-opacity-50' : ''
            }`}
          >
            <div className="flex-1">
              <Link href={`/recording/${camera}/${day}/${hour.hour}`} type="text">
                {hour.hour}:00
              </Link>
            </div>
            <div className="flex-1 text-right">{hour.events} Events</div>
          </div>
          {eventMap[`${day}-${hour.hour}`].map((event) => (
            <EventCard key={event.id} camera={camera} event={event} />
          ))}
        </div>
      ))}
    </>
  );
}

export function ExpandableList({ title, events = 0, children, selected = false }) {
  const [active, setActive] = useState(selected);
  const toggle = () => setActive(!active);
  return (
    <div className={`w-full text-sm ${active ? 'border-b border-white border-opacity-50' : ''}`}>
      <div className="flex items-center w-full p-2 cursor-pointer md:text-lg" onClick={toggle}>
        <div className="flex-1 font-bold">{title}</div>
        <div className="flex-1 text-right mr-4">{events} Events</div>
        <div className="w-6 md:w-10 h-6 md:h-10">{active ? <ArrowDropup /> : <ArrowDropdown />}</div>
      </div>
      {/* Only render the child when expanded to lazy load events for the day */}
      {active && <div className={`bg-gray-800 bg-opacity-50`}>{children}</div>}
    </div>
  );
}

export function EventCard({ camera, event }) {
  const apiHost = useApiHost();
  const start = fromUnixTime(event.start_time);
  const end = fromUnixTime(event.end_time);
  let duration = 'In Progress';
  if (event.end_time) {
    duration = formatDuration(intervalToDuration({ start, end }));
  }

  return (
    <Link className="" href={`/recording/${camera}/${format(start, 'yyyy-MM-dd/HH/mm/ss')}`}>
      <div className="flex flex-row mb-2">
        <div className="w-28 mr-4">
          <img className="antialiased" loading="lazy" src={`${apiHost}/api/events/${event.id}/thumbnail.jpg`} />
        </div>
        <div className="flex flex-row w-full border-b">
          <div className="w-full text-gray-700 font-semibold relative pt-0">
            <div className="flex flex-row items-center">
              <div className="flex-1">
                <div className="text-2xl text-white leading-tight capitalize">{event.label}</div>
                <div className="text-xs md:text-normal text-gray-300">Start: {format(start, 'HH:mm:ss')}</div>
                <div className="text-xs md:text-normal text-gray-300">Duration: {duration}</div>
              </div>
              <div className="text-lg text-white text-right leading-tight">{(event.top_score * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
        <div className="w-6" />
      </div>
    </Link>
  );
}
