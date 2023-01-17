import { h } from 'preact';

const timeAgo = ({ time, dense = false }) => {
  if (!time) return 'Invalid Time';
  try {
    const currentTime = new Date();
    const pastTime = new Date(time);
    const elapsedTime = currentTime - pastTime;
    if (elapsedTime < 0) return 'Invalid Time';

    const timeUnits = [
      { unit: 'ye', full: 'year', value: 31536000 },
      { unit: 'mo', full: 'month', value: 0 },
      { unit: 'day', full: 'day', value: 86400 },
      { unit: 'h', full: 'hour', value: 3600 },
      { unit: 'm', full: 'minute', value: 60 },
      { unit: 's', full: 'second', value: 1 },
    ];

    let elapsed = elapsedTime / 1000;
    if (elapsed < 60) {
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
        const unitAmount = Math.floor(elapsed / timeUnits[i].value);
        return `${unitAmount}${dense ? timeUnits[i].unit[0] : ` ${timeUnits[i].full}`}${dense ? '' : 's'} ago`;
      }
    }
  } catch {
    return 'Invalid Time';
  }
};

const TimeAgo = (props) => {
  return <span>{timeAgo({ ...props })}</span>;
};

export default TimeAgo;
