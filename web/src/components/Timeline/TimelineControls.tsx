import { h } from 'preact';
import Next from '../../icons/Next';
import Pause from '../../icons/Pause';
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
  className?: string;
  isPlaying: boolean;
  onPlayPause: (isPlaying: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const TimelineControls = ({
  disabled,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  className = '',
}: TimelineControlsProps) => {
  const onPlayClickHandler = () => {
    onPlayPause(!isPlaying);
  };
  return (
    <div className={`flex space-x-2 self-center ${className}`}>
      <BubbleButton variant='secondary' onClick={onPrevious} disabled={disabled.previous}>
        <Previous />
      </BubbleButton>
      <BubbleButton onClick={onPlayClickHandler}>{!isPlaying ? <Play /> : <Pause />}</BubbleButton>
      <BubbleButton variant='secondary' onClick={onNext} disabled={disabled.next}>
        <Next />
      </BubbleButton>
    </div>
  );
};
