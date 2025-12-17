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

export type ClassifiedEvent = {
  id: string;
  label?: string;
  score?: number;
};

export type ClassificationDatasetResponse = {
  categories: {
    [id: string]: string[];
  };
  training_metadata: {
    has_trained: boolean;
    last_training_date: string | null;
    last_training_image_count: number;
    current_image_count: number;
    new_images_count: number;
    dataset_changed: boolean;
  } | null;
};
