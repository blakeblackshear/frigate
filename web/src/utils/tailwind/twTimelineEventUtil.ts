import type { TimelineEvent } from '../../components/Timeline/TimelineEvent';

export const getColorFromTimelineEvent = (event: TimelineEvent) => {
  const { label } = event;
  if (label === 'car') {
    return 'bg-red-400';
  } else if (label === 'person') {
    return 'bg-blue-400';
  } else if (label === 'dog') {
    return 'bg-green-400';
  }

  // unknown label
  return 'bg-gray-400';
};