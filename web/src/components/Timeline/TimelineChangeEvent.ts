import { TimelineEvent } from './TimelineEvent';

export interface TimelineChangeEvent {
  timelineEvent: TimelineEvent;
  markerTime: Date;
  seekComplete: boolean;
}