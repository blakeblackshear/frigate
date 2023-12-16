export interface TimelineEvent {
  start_time: number;
  end_time: number;
  startTime: Date;
  endTime: Date;
  id: string;
  label: 'car' | 'person' | 'dog';
}