import { h } from 'preact';
import Heading from '../Heading';
import { TimelineEvent } from '../Timeline/Timeline';

interface HistoryHeaderProps {
  event: TimelineEvent;
  className?: string;
}
export const HistoryHeader = ({ event, className = '' }: HistoryHeaderProps) => {
  let title = 'No Event Found';
  let subtitle = <span>Event was not found at marker position.</span>;
  if (event) {
    const { startTime, endTime, label } = event;
    const thisMorning = new Date();
    thisMorning.setHours(0, 0, 0);
    const isToday = endTime.getTime() > thisMorning.getTime();
    title = label;
    subtitle = (
      <span>
        {isToday ? 'Today' : 'Yesterday'}, {startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()} &middot;
      </span>
    );
  }
  return (
    <div className={`text-center ${className}`}>
      <Heading size='lg'>{title}</Heading>
      <div>{subtitle}</div>
    </div>
  );
};
