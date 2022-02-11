import { h } from 'preact';
import { TimelineEventBlock } from './Timeline';
import { TimelineBlockView } from './TimelineBlockView';

interface TimelineBlocksProps {
  timeline: TimelineEventBlock[];
  firstBlockOffset: number;
  onEventClick: (block: TimelineEventBlock) => void;
}
export const TimelineBlocks = ({ timeline, firstBlockOffset, onEventClick }: TimelineBlocksProps) => {
  const calculateTimelineContainerWidth = () => {
    if (timeline.length > 0) {
      const startTimeEpoch = timeline[0].startTime.getTime();
      const endTimeEpoch = new Date().getTime();
      return Math.round(Math.abs(endTimeEpoch - startTimeEpoch) / 1000) + firstBlockOffset * 2;
    }
  };

  const onClickHandler = (block: TimelineEventBlock) => onEventClick(block);

  if (timeline && timeline.length > 0) {
    return (
      <div
        className='relative block whitespace-nowrap overflow-x-hidden h-16'
        style={{
          width: `${calculateTimelineContainerWidth()}px`,
          background: "url('/marker.png')",
          backgroundPosition: 'center',
          backgroundSize: '30px',
          backgroundRepeat: 'repeat',
        }}
      >
        {timeline.map((block) => (
          <TimelineBlockView block={block} onClick={onClickHandler} />
        ))}
      </div>
    );
  }
};
