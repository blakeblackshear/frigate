import { Preview } from "./preview";
import { Recording } from "./record";
import { TimeRange } from "./timeline";

export type DynamicPlayback = {
  recordings: Recording[];
  timeRange: TimeRange;
};

export type PreviewPlayback = {
  preview: Preview | undefined;
  timeRange: TimeRange;
};
