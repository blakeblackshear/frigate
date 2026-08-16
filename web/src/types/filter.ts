// allow any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FilterType = { [searchKey: string]: any };

export type ExportMode = "select" | "timeline" | "timeline_multi" | "none";

export type FilterList = {
  labels?: string[];
  zones?: string[];
};

export const LAST_24_HOURS_KEY = "last24Hours";

const DRAWER_FEATURES = [
  "export",
  "calendar",
  "filter",
  "debug-replay",
  "share-timestamp",
  "motion-search",
  "quality",
] as const;
export type DrawerFeatures = (typeof DRAWER_FEATURES)[number];
export const DEFAULT_DRAWER_FEATURES: DrawerFeatures[] = [
  "export",
  "calendar",
  "filter",
  "debug-replay",
  "share-timestamp",
  "motion-search",
];

export type GeneralFilter = {
  showAll?: boolean;
  labels?: string[];
  zones?: string[];
};
