export type SearchSource = "similarity" | "thumbnail" | "description";

export type SearchResult = {
  id: string;
  camera: string;
  description?: string;
  start_time: number;
  end_time?: number;
  score: number;
  label: string;
  sub_label?: string;
  thumb_path?: string;
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
  };
};


export type PartialSearchResult = Partial<SearchResult> & { id: string };

export type SearchFilter = {
  cameras?: string[];
  labels?: string[];
  subLabels?: string[];
  zones?: string[];
  before?: number;
  after?: number;
  search_type?: SearchSource[];
  event_id?: string;
};
