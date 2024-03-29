export type GraphDataPoint = {
  x: Date;
  y: number;
};

export type GraphData = {
  name?: string;
  data: GraphDataPoint[];
};

export type Threshold = {
  warning: number;
  error: number;
};

export const InferenceThreshold = {
  warning: 50,
  error: 100,
} as Threshold;

export const DetectorCpuThreshold = {
  warning: 25,
  error: 50,
} as Threshold;

export const DetectorMemThreshold = {
  warning: 20,
  error: 50,
} as Threshold;
