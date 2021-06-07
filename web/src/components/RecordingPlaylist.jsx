import { h } from 'preact';
import { useState } from 'preact/hooks';
import { addSeconds, differenceInSeconds, fromUnixTime, format, parseISO, startOfHour } from 'date-fns';
import ArrowDropdown from '../icons/ArrowDropdown';
import ArrowDropup from '../icons/ArrowDropup';
import Link from '../components/Link';
import Menu from '../icons/Menu';
import MenuOpen from '../icons/MenuOpen';
import { useApiHost } from '../api';

export default function RecordingPlaylist({ camera, recordings, selectedDate, selectedHour }) {
  const [active, setActive] = useState(true);
  const toggle = () => setActive(!active);

  const result = [];
  for (const recording of recordings.slice().reverse()) {
    const date = parseISO(recording.date);
    result.push(
      <ExpandableList
        title={format(date, 'MMM d, yyyy')}
        events={recording.events}
        selected={recording.date === selectedDate}
      >
        {recording.recordings.map((item, i) => (
          <div className="mb-2 w-full">
            <div
              className={`flex w-full text-md text-white px-8 py-2 mb-2 ${
                i === 0 ? 'border-t border-white border-opacity-50' : ''
              }`}
            >
              <div className="flex-1">
                <Link href={`/recording/${camera}/${recording.date}/${item.hour}`} type="text">
                  {item.hour}:00
                </Link>
              </div>
              <div className="flex-1 text-right">{item.events.length} Events</div>
            </div>
            {item.events.map((event) => (
              <EventCard camera={camera} event={event} delay={item.delay} />
            ))}
          </div>
        ))}
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
      <div className={`bg-gray-800 bg-opacity-50 ${active ? '' : 'hidden'}`}>{children}</div>
    </div>
  );
}

export function EventCard({ camera, event, delay }) {
  const apiHost = useApiHost();
  const start = fromUnixTime(event.start_time);
  const end = fromUnixTime(event.end_time);
  const duration = addSeconds(new Date(0), differenceInSeconds(end, start));
  const position = differenceInSeconds(start, startOfHour(start));
  const offset = Object.entries(delay)
    .map(([p, d]) => (position > p ? d : 0))
    .reduce((p, c) => p + c);
  const seconds = Math.max(position - offset - 10, 0);
  return (
    <Link className="" href={`/recording/${camera}/${format(start, 'yyyy-MM-dd')}/${format(start, 'HH')}/${seconds}`}>
      <div className="flex flex-row mb-2">
        <div className="w-28 mr-4">
          <img className="antialiased" src={`${apiHost}/api/events/${event.id}/thumbnail.jpg`} />
        </div>
        <div className="flex flex-row w-full border-b">
          <div className="w-full text-gray-700 font-semibold relative pt-0">
            <div className="flex flex-row items-center">
              <div className="flex-1">
                <div className="text-2xl text-white leading-tight capitalize">{event.label}</div>
                <div className="text-xs md:text-normal text-gray-300">Start: {format(start, 'HH:mm:ss')}</div>
                <div className="text-xs md:text-normal text-gray-300">Duration: {format(duration, 'mm:ss')}</div>
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
