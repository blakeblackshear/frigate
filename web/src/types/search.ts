const SEARCH_FILTERS = [
  "cameras",
  "date",
  "time",
  "general",
  "zone",
  "sub",
  "attribute",
  "source",
  "sort",
] as const;
export type SearchFilters = (typeof SEARCH_FILTERS)[number];
export const DEFAULT_SEARCH_FILTERS: SearchFilters[] = [
  "cameras",
  "date",
  "time",
  "general",
  "zone",
  "sub",
  "attribute",
  "source",
  "sort",
];

export type SearchSource = "similarity" | "thumbnail" | "description";

export type SearchSortType =
  | "date_asc"
  | "date_desc"
  | "score_asc"
  | "score_desc"
  | "relevance";

export type EventType = "object" | "audio" | "manual";

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
  top_score: number; // for old events
  data: {
    top_score: number;
    score: number;
    sub_label_score?: number;
    region: number[];
    attributes?: [{ box: number[]; label: string; score: number }];
    box: number[];
    area: number;
    ratio: number;
    type: EventType;
    description?: string;
    average_estimated_speed: number;
    velocity_angle: number;
    path_data: [number[], number][];
    recognized_license_plate?: string;
    recognized_license_plate_score?: number;
  };
};

export type SearchFilter = {
  query?: string;
  cameras?: string[];
  labels?: string[];
  sub_labels?: string[];
  attributes?: string[];
  recognized_license_plate?: string[];
  zones?: string[];
  before?: number;
  after?: number;
  min_score?: number;
  max_score?: number;
  min_speed?: number;
  max_speed?: number;
  has_snapshot?: number;
  has_clip?: number;
  is_submitted?: number;
  time_range?: string;
  search_type?: SearchSource[];
  event_id?: string;
  sort?: SearchSortType;
};

export const DEFAULT_TIME_RANGE_AFTER = "00:00";
export const DEFAULT_TIME_RANGE_BEFORE = "23:59";

export type SearchQueryParams = {
  cameras?: string[];
  labels?: string[];
  sub_labels?: string[];
  attributes?: string[];
  recognized_license_plate?: string[];
  zones?: string[];
  before?: string;
  after?: string;
  min_score?: number;
  max_score?: number;
  min_speed?: number;
  max_speed?: number;
  search_type?: string;
  limit?: number;
  in_progress?: number;
  include_thumbnails?: number;
  query?: string;
  page?: number;
  time_range?: string;
  sort?: SearchSortType;
};

export type SearchQuery = [string, SearchQueryParams] | null;
export type FilterType = Exclude<keyof SearchFilter, "query">;

export type SavedSearchQuery = {
  name: string;
  search: string;
  filter: SearchFilter | undefined;
};
