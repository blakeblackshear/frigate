import { h } from 'preact';
import { useState } from 'preact/hooks';
import { format, parseISO } from 'date-fns';
import Accordion from '../components/Accordion';
import EventCard from '../components/EventCard';
import Link from '../components/Link';
import Menu from '../icons/Menu';
import MenuOpen from '../icons/MenuOpen';

export default function RecordingPlaylist({ camera, recordings, selectedDate }) {
  const [active, setActive] = useState(true);
  const toggle = () => setActive(!active);

  const result = [];
  for (const recording of recordings.slice().reverse()) {
    const date = parseISO(recording.date);
    result.push(
      <Accordion title={format(date, 'MMM d, yyyy')} selected={recording.date === selectedDate}>
        {recording.recordings.map((item) => (
          <div className="mb-2">
            <div className="text-white bg-black bg-opacity-50 border-b border-gray-500 py-2 px-4 mb-1">
              <Link href={`/recordings/${camera}/${recording.date}/${item.hour}`} type="text">
                {item.hour}:00
              </Link>
              <span className="float-right">{item.events.length} Events</span>
            </div>
            {item.events.map((event) => (
              <EventCard camera={camera} event={event} />
            ))}
          </div>
        ))}
      </Accordion>
    );
  }

  const openClass = active ? '-left-6' : 'right-0';

  return (
    <div className="flex absolute inset-y-0 right-0 w-9/12 md:w-1/3 max-w-xl min-w-lg text-base text-white font-sans">
      <div
        onClick={toggle}
        className={`absolute ${openClass} cursor-pointer items-center self-center rounded-tl-lg rounded-bl-lg border border-r-0 w-6 h-20 py-7 bg-gray-800 bg-opacity-70`}
      >
        {active ? <Menu /> : <MenuOpen />}
      </div>
      <div
        className={`w-full h-full p-1 md:p-4 bg-gray-800 bg-opacity-70 border-l overflow-x-hidden overflow-y-auto${
          active ? '' : ' hidden'
        }`}
      >
        {result}
      </div>
    </div>
  );
}

export function Heading({ title }) {
  return <div>{title}</div>;
}
