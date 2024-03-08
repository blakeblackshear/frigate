import { Preview } from "./preview";
import { Recording } from "./record";

export type DynamicPlayback = {
  recordings: Recording[];
  playbackUri: string;
  preview: Preview | undefined;
  timeRange: { end: number; start: number };
};
