import { h, FunctionComponent } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

interface IProp {
  /** The time to calculate time-ago from */
  time: Date;
  /** OPTIONAL: overwrite current time */
  currentTime?: Date;
  /** OPTIONAL: boolean that determines whether to show the time-ago text in dense format */
  dense?: boolean;
  /** OPTIONAL: set custom refresh interval in milliseconds, default 1000 (1 sec) */
  refreshInterval?: number;
}

type TimeUnit = {
  unit: string;
  full: string;
  value: number;
};

const timeAgo = ({ time, currentTime = new Date(), dense = false }: IProp): string => {
  if (typeof time !== 'number' || time < 0) return 'Invalid Time Provided';

  const pastTime: Date = new Date(time);
  const elapsedTime: number = currentTime.getTime() - pastTime.getTime();

  const timeUnits: TimeUnit[] = [
    { unit: 'ye', full: 'year', value: 31536000 },
    { unit: 'mo', full: 'month', value: 0 },
    { unit: 'day', full: 'day', value: 86400 },
    { unit: 'h', full: 'hour', value: 3600 },
    { unit: 'm', full: 'minute', value: 60 },
    { unit: 's', full: 'second', value: 1 },
  ];

  const elapsed: number = elapsedTime / 1000;
  if (elapsed < 10) {
    return 'just now';
  }

  for (let i = 0; i < timeUnits.length; i++) {
    // if months
    if (i === 1) {
      // Get the month and year for the time provided
      const pastMonth = pastTime.getUTCMonth();
      const pastYear = pastTime.getUTCFullYear();

      // get current month and year
      const currentMonth = currentTime.getUTCMonth();
      const currentYear = currentTime.getUTCFullYear();

      let monthDiff = (currentYear - pastYear) * 12 + (currentMonth - pastMonth);

      // check if the time provided is the previous month but not exceeded 1 month ago.
      if (currentTime.getUTCDate() < pastTime.getUTCDate()) {
        monthDiff--;
      }

      if (monthDiff > 0) {
        const unitAmount = monthDiff;
        return `${unitAmount}${dense ? timeUnits[i].unit[0] : ` ${timeUnits[i].full}`}${dense ? '' : 's'} ago`;
      }
    } else if (elapsed >= timeUnits[i].value) {
      const unitAmount: number = Math.floor(elapsed / timeUnits[i].value);
      return `${unitAmount}${dense ? timeUnits[i].unit[0] : ` ${timeUnits[i].full}`}${dense ? '' : 's'} ago`;
    }
  }
  return 'Invalid Time';
};

const TimeAgo: FunctionComponent<IProp> = ({ refreshInterval = 1000, ...rest }): JSX.Element => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const intervalId: NodeJS.Timeout = setInterval(() => {
      setCurrentTime(new Date());
    }, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  const timeAgoValue = useMemo(() => timeAgo({ currentTime, ...rest }), [currentTime, rest]);

  return <span>{timeAgoValue}</span>;
};
export default TimeAgo;
