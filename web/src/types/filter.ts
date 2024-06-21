// allow any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FilterType = { [searchKey: string]: any };

export type ExportMode = "select" | "timeline" | "none";

export type FilterList = {
  labels?: string[];
  zones?: string[];
};

export const LAST_24_HOURS_KEY = "last24Hours";
