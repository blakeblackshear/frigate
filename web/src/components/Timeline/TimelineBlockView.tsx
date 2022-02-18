import { h } from 'preact';
import { useCallback } from 'preact/hooks';
import { getColorFromTimelineEvent } from '../../utils/Timeline/timelineEventUtils';
import { TimelineEventBlock } from './TimelineEventBlock';

interface TimelineBlockViewProps {
  block: TimelineEventBlock;
  onClick: (block: TimelineEventBlock) => void;
}

export const TimelineBlockView = ({ block, onClick }: TimelineBlockViewProps) => {
  const onClickHandler = useCallback(() => onClick(block), [block, onClick]);
  return (
    <div
      key={block.id}
      onClick={onClickHandler}
      className={`absolute z-10 rounded-full bg-${getColorFromTimelineEvent(block)}-400 h-2`}
      style={{
        top: `${block.yOffset}px`,
        left: `${block.positionX}px`,
        width: `${block.width}px`,
      }}
    />
  );
};
