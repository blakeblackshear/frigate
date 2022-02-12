import { h } from 'preact';
import { TimelineEventBlock } from './Timeline';

interface TimelineBlockViewProps {
  block: TimelineEventBlock;
  onClick: (block: TimelineEventBlock) => void;
}

export const TimelineBlockView = ({ block, onClick }: TimelineBlockViewProps) => {
  const onClickHandler = () => onClick(block);

  const getColor = (eventBlock: TimelineEventBlock) => {
    if (eventBlock.label === 'car') {
      return 'red';
    } else if (eventBlock.label === 'person') {
      return 'blue';
    } else if (eventBlock.label === 'dog') {
      return 'green';
    }
    return 'gray';
  };

  return (
    <div
      key={block.id}
      onClick={onClickHandler}
      className={`absolute z-10 rounded-full bg-${getColor(block)}-400 h-2`}
      style={{
        top: `${block.yOffset}px`,
        left: `${block.positionX}px`,
        width: `${block.width}px`,
      }}
    ></div>
  );
};
