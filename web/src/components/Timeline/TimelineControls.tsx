import { h } from 'preact';
import Next from '../../icons/Next';
import Play from '../../icons/Play';
import Previous from '../../icons/Previous';
import { BubbleButton } from '../BubbleButton';

export interface DisabledControls {
  playPause: boolean;
  next: boolean;
  previous: boolean;
}

interface TimelineControlsProps {
  disabled: DisabledControls;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const TimelineControls = ({ disabled, onPlayPause, onNext, onPrevious }: TimelineControlsProps) => {
  return (
    <div className='flex space-x-2 self-center'>
      <BubbleButton variant='secondary' onClick={onPrevious} disabled={disabled.previous}>
        <Previous />
      </BubbleButton>
      <BubbleButton onClick={onPlayPause}>
        <Play />
      </BubbleButton>
      <BubbleButton variant='secondary' onClick={onNext} disabled={disabled.next}>
        <Next />
      </BubbleButton>
    </div>
  );
};
