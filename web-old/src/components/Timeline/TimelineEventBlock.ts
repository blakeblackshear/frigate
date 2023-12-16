import type { TimelineEvent } from './TimelineEvent';

export interface TimelineEventBlock extends TimelineEvent {
  index: number;
  yOffset: number;
  width: number;
  positionX: number;
  seconds: number;
}