import { h } from 'preact';
import { addSeconds, differenceInSeconds, fromUnixTime, format, startOfHour } from 'date-fns';
import Link from '../components/Link';
import { useApiHost } from '../api';

export default function EventCard({ camera, event, delay }) {
  const apiHost = useApiHost();
  const start = fromUnixTime(event.start_time);
  const end = fromUnixTime(event.end_time);
  const duration = addSeconds(new Date(0), differenceInSeconds(end, start));
  const seconds = Math.max(differenceInSeconds(start, startOfHour(start)) - delay - 10, 0);
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
                {format(start, 'HH:mm:ss')} ({format(duration, 'mm:ss')})
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
