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

export const EmbeddingThreshold = {
  warning: 500,
  error: 1000,
} as Threshold;

export const GenAIThreshold = {
  warning: 30000,
  error: 60000,
} as Threshold;

export const DetectorTempThreshold = {
  warning: 72,
  error: 80,
} as Threshold;

export const DetectorCpuThreshold = {
  warning: 25,
  error: 50,
} as Threshold;

export const DetectorMemThreshold = {
  warning: 20,
  error: 50,
} as Threshold;

export const GPUUsageThreshold = {
  warning: 75,
  error: 95,
} as Threshold;

export const GPUMemThreshold = {
  warning: 75,
  error: 95,
} as Threshold;

export const CameraFfmpegThreshold = {
  warning: 20,
  error: 20,
} as Threshold;

export const CameraDetectThreshold = {
  warning: 20,
  error: 40,
} as Threshold;
