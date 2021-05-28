import { h } from 'preact';
import { format } from 'date-fns';

export default function Calendar({ date, hours = 0, events = 0, selected = false }) {
  const bg = selected ? 'bg-blue-500 bg-opacity-80' : 'bg-gray-500';
  return (
    <div className="min-w-20 min-h-20 md:min-w-32 md:min-h-32 p-1.5 mb-1 font-medium text-xs md:text-base">
      <div className="w-20 md:w-32 flex-none rounded-lg text-center shadow-md">
        <div className="block rounded-lg overflow-hidden text-center text-black">
          <div className={`${bg} text-white py-0.5`}>{format(date, 'MMM yyyy')}</div>
          <div className="pt-0.5 bg-white">
            <span className="text-2xl md:text-5xl font-bold leading-tight">{format(date, 'd')}</span>
          </div>
          <div className="text-center bg-white pt-0.5">
            <span className="md:text-sm">{format(date, 'EEEE')}</span>
          </div>
          <div className="pb-0.5 border-l border-r border-b border-white text-center bg-white hidden md:block">
            <span className="md:text-xs leading-normal">
              {hours} hrs, {events} events
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
