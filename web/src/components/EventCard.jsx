import { h } from 'preact';
import { differenceInSeconds, fromUnixTime, format, startOfHour } from 'date-fns';
import Link from '../components/Link';
import { useApiHost } from '../api';

export default function EventCard({ camera, event }) {
  const apiHost = useApiHost();
  const start = fromUnixTime(event.start_time);
  const end = fromUnixTime(event.end_time);
  const seconds = Math.max(differenceInSeconds(start, startOfHour(start)) - 10, 0);
  return (
    <Link className="" href={`/recordings/${camera}/${format(start, 'yyyy-MM-dd')}/${format(start, 'HH')}/${seconds}`}>
      <div className="rounded-lg shadow-lg bg-gray-600 w-full flex flex-row flex-wrap p-3 antialiased mb-2">
        <div className="w-1/2 md:w-1/3">
          <img className="rounded-lg shadow-lg antialiased" src={`${apiHost}/api/events/${event.id}/thumbnail.jpg`} />
        </div>
        <div className="w-1/2 md:w-2/3 px-3 flex flex-row flex-wrap">
          <div className="w-full text-right text-gray-700 font-semibold relative pt-0">
            <div className="text-2xl text-white leading-tight capitalize">{event.label}</div>
            <div className="text-lg text-white leading-tight">{(event.top_score * 100).toFixed(1)}%</div>
            <div className="text-xs md:text-normal text-gray-300 hover:text-gray-400 cursor-pointer">
              <span className="border-b border-dashed border-gray-500 pb-1">
                {format(start, 'HH:mm:ss')} - {format(end, 'HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden md:block w-full text-right">
          <div className="text-sm text-gray-300 hover:text-gray-400 cursor-pointer md:absolute pt-3 md:pt-0 bottom-0 right-0">
            {event.zones.map((zone) => (
              <div>{zone}</div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
