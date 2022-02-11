import { h } from 'preact';
import Heading from '../components/Heading';

export function HistoryHeader({ objectLabel, date, end, camera, className }) {
  return (
    <div className={`text-center ${className}`}>
      <Heading size='lg'>{objectLabel}</Heading>
      <div>
        <span>
          Today, {date.toLocaleTimeString()} - {end ? end.toLocaleTimeString() : 'Incomplete'} &middot; {camera}
        </span>
      </div>
    </div>
  );
}
