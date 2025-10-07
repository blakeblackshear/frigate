const TRAIN_FILTERS = ["class", "score"] as const;
export type TrainFilters = (typeof TRAIN_FILTERS)[number];

export type TrainFilter = {
  classes?: string[];
  min_score?: number;
  max_score?: number;
};

export type ClassificationItemData = {
  filepath: string;
  filename: string;
  name: string;
  timestamp?: number;
  eventId?: string;
  score?: number;
};

export type ClassificationThreshold = {
  recognition: number;
  unknown: number;
};
