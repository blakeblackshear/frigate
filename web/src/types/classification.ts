const TRAIN_FILTERS = ["class", "score"] as const;
export type TrainFilters = (typeof TRAIN_FILTERS)[number];

export type TrainFilter = {
  classes?: string[];
  min_score?: number;
  max_score?: number;
};
