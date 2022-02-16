import { h } from 'preact';
import { TimelineEventBlock } from './Timeline';
import { TimelineBlockView } from './TimelineBlockView';

interface TimelineBlocksProps {
  timeline: TimelineEventBlock[];
  firstBlockOffset: number;
  onEventClick: (block: TimelineEventBlock) => void;
}
export const TimelineBlocks = ({ timeline, firstBlockOffset, onEventClick }: TimelineBlocksProps) => {
  const convertRemToPixels = (rem) => {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  };

  const getMaxYOffset = () => {
    return timeline.reduce((accumulation, current) => {
      if (current.yOffset > accumulation) {
        accumulation = current.yOffset;
      }
      return accumulation;
    }, 0);
  };

  const getTimelineContainerHeight = () => {
    return getMaxYOffset() + convertRemToPixels(1);
  };

  const calculateTimelineContainerWidth = () => {
    if (timeline.length > 0) {
      const startTimeEpoch = timeline[0].startTime.getTime();
      const endTimeEpoch = new Date().getTime();
      return Math.round(Math.abs(endTimeEpoch - startTimeEpoch) / 1000) + firstBlockOffset * 2;
    }
  };

  const onClickHandler = (block: TimelineEventBlock) => onEventClick(block);

  if (timeline.length > 0) {
    return (
      <div
        className='relative'
        style={{
          height: `${getTimelineContainerHeight()}px`,
          width: `${calculateTimelineContainerWidth()}px`,
          background: "url('/marker.png')",
          backgroundPosition: 'center',
          backgroundSize: '30px',
          backgroundRepeat: 'repeat',
        }}
      >
        {timeline.map((block) => {
          return (
            <TimelineBlockView
              block={{
                ...block,
                yOffset: block.yOffset + (getTimelineContainerHeight() - getMaxYOffset()) / 2,
              }}
              onClick={onClickHandler}
            />
          );
        })}
      </div>
    );
  }
};
