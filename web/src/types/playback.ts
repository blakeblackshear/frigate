import { Preview } from "./preview";
import { Recording } from "./record";
import { TimeRange } from "./timeline";

export type DynamicPlayback = {
  recordings: Recording[];
};

export type PreviewPlayback = {
  preview: Preview | undefined;
  timeRange: TimeRange;
};
