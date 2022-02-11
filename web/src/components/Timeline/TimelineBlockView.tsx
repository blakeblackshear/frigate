import { h } from 'preact';
import { TimelineEventBlock } from './Timeline';

interface TimelineBlockViewProps {
  block: TimelineEventBlock;
  onClick: (block: TimelineEventBlock) => void;
}

export const TimelineBlockView = ({ block, onClick }: TimelineBlockViewProps) => {
  const onClickHandler = () => onClick(block);

  return (
    <div
      key={block.id}
      onClick={onClickHandler}
      className='absolute z-10 rounded-full bg-blue-300 h-2'
      style={{
        top: `${block.yOffset}px`,
        left: `${block.positionX}px`,
        width: `${block.width}px`,
      }}
    ></div>
  );
};
