import { h } from 'preact';

function timeAgo(timeString) {
  if (!timeString) return 'Invalid Time';
  try {
    const currentTime = new Date();
    const pastTime = new Date(timeString);
    const elapsedTime = currentTime - pastTime;
    if (elapsedTime < 0) return 'Invalid Time';

    const timeUnits = [
      { unit: 'year', value: 31536000 },
      { unit: 'month', value: 0 },
      { unit: 'day', value: 86400 },
      { unit: 'hour', value: 3600 },
      { unit: 'minute', value: 60 },
      { unit: 'second', value: 1 },
    ];

    let elapsed = elapsedTime / 1000;

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
          return `${unitAmount} ${timeUnits[i].unit}${unitAmount > 1 ? 's' : ''} ago`;
        }
      } else if (elapsed >= timeUnits[i].value) {
        const unitAmount = Math.floor(elapsed / timeUnits[i].value);
        return `${unitAmount} ${timeUnits[i].unit}${unitAmount > 1 ? 's' : ''} ago`;
      }
    }
  } catch {
    return 'Invalid Time';
  }
}

const TimeAgo = ({ time }) => {
  return <span>{timeAgo(time)}</span>;
};

export default TimeAgo;
