const SEARCH_FILTERS = [
  "cameras",
  "date",
  "time",
  "general",
  "zone",
  "sub",
  "source",
] as const;
export type SearchFilters = (typeof SEARCH_FILTERS)[number];
export const DEFAULT_SEARCH_FILTERS: SearchFilters[] = [
  "cameras",
  "date",
  "time",
  "general",
  "zone",
  "sub",
  "source",
];

export type SearchSource = "similarity" | "thumbnail" | "description";

export type SearchResult = {
  id: string;
  camera: string;
  start_time: number;
  end_time?: number;
  score: number;
  label: string;
  sub_label?: string;
  thumb_path?: string;
  plus_id?: string;
  has_snapshot: boolean;
  has_clip: boolean;
  zones: string[];
  search_source: SearchSource;
  search_distance: number;
  data: {
    top_score: number;
    score: number;
    sub_label_score?: number;
    region: number[];
    box: number[];
    area: number;
    ratio: number;
    type: "object" | "audio" | "manual";
    description?: string;
  };
};

export type SearchFilter = {
  query?: string;
  cameras?: string[];
  labels?: string[];
  sub_labels?: string[];
  zones?: string[];
  before?: number;
  after?: number;
  time_range?: string;
  search_type?: SearchSource[];
  event_id?: string;
};

export const DEFAULT_TIME_RANGE_AFTER = "00:00";
export const DEFAULT_TIME_RANGE_BEFORE = "23:59";

export type SearchQueryParams = {
  cameras?: string[];
  labels?: string[];
  sub_labels?: string[];
  zones?: string[];
  before?: string;
  after?: string;
  search_type?: string;
  limit?: number;
  in_progress?: number;
  include_thumbnails?: number;
  query?: string;
  page?: number;
  time_range?: string;
};

export type SearchQuery = [string, SearchQueryParams] | null;
export type FilterType = Exclude<keyof SearchFilter, "query">;

export type SavedSearchQuery = {
  name: string;
  search: string;
  filter: SearchFilter | undefined;
};
