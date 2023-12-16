import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { findLargestYOffsetInBlocks, getTimelineWidthFromBlocks } from '../../utils/Timeline/timelineEventUtils';
import { convertRemToPixels } from '../../utils/windowUtils';
import { TimelineBlockView } from './TimelineBlockView';
import type { TimelineEventBlock } from './TimelineEventBlock';

interface TimelineBlocksProps {
  timeline: TimelineEventBlock[];
  firstBlockOffset: number;
  onEventClick: (block: TimelineEventBlock) => void;
}

export const TimelineBlocks = ({ timeline, firstBlockOffset, onEventClick }: TimelineBlocksProps) => {
  const timelineEventBlocks = useMemo(() => {
    if (timeline.length > 0 && firstBlockOffset) {
      const largestYOffsetInBlocks = findLargestYOffsetInBlocks(timeline);
      const timelineContainerHeight = largestYOffsetInBlocks + convertRemToPixels(1);
      const timelineContainerWidth = getTimelineWidthFromBlocks(timeline, firstBlockOffset);
      const timelineBlockOffset = (timelineContainerHeight - largestYOffsetInBlocks) / 2;
      return (
        <div
          className="relative"
          style={{
            height: `${timelineContainerHeight}px`,
            width: `${timelineContainerWidth}px`,
            background: "url('/images/marker.png')",
            backgroundPosition: 'center',
            backgroundSize: '30px',
            backgroundRepeat: 'repeat',
          }}
        >
          {timeline.map((block) => {
            const onClickHandler = (block: TimelineEventBlock) => onEventClick(block);
            const updatedBlock: TimelineEventBlock = {
              ...block,
              yOffset: block.yOffset + timelineBlockOffset,
            };
            return <TimelineBlockView key={block.id} block={updatedBlock} onClick={onClickHandler} />;
          })}
        </div>
      );
    }
    return <div />;
  }, [timeline, onEventClick, firstBlockOffset]);

  return timelineEventBlocks;
};
