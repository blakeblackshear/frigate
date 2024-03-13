import { Preview } from "./preview";
import { Recording } from "./record";

export type DynamicPlayback = {
  recordings: Recording[];
};

export type PreviewPlayback = {
  preview: Preview | undefined;
  timeRange: { end: number; start: number };
};
