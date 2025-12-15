export interface FrigateStats {
  cameras: { [camera_name: string]: CameraStats };
  cpu_usages: { [pid: string]: CpuStats };
  detectors: { [detectorKey: string]: DetectorStats };
  embeddings?: EmbeddingsStats;
  gpu_usages?: { [gpuKey: string]: GpuStats };
  npu_usages?: { [npuKey: string]: NpuStats };
  processes: { [processKey: string]: ExtraProcessStats };
  service: ServiceStats;
  camera_fps: number;
  process_fps: number;
  skipped_fps: number;
  detection_fps: number;
}

export type CameraStats = {
  audio_dBFPS: number;
  audio_rms: number;
  camera_fps: number;
  capture_pid: number;
  detection_enabled: number;
  detection_fps: number;
  ffmpeg_pid: number;
  pid: number;
  process_fps: number;
  skipped_fps: number;
  connection_quality: "excellent" | "fair" | "poor" | "unusable";
  expected_fps: number;
  reconnects_last_hour: number;
  stalls_last_hour: number;
};

export type CpuStats = {
  cmdline: string;
  cpu: string;
  cpu_average: string;
  mem: string;
};

export type DetectorStats = {
  detection_start: number;
  inference_speed: number;
  pid: number;
};

export type EmbeddingsStats = {
  image_embedding_speed: number;
  face_embedding_speed: number;
  plate_recognition_speed: number;
  text_embedding_speed: number;
};

export type ExtraProcessStats = {
  pid: number;
};

export type GpuStats = {
  gpu: string;
  mem: string;
  enc?: string;
  dec?: string;
  pstate?: string;
};

export type NpuStats = {
  npu: number;
  mem: string;
};

export type GpuInfo = "vainfo" | "nvinfo";

export type ServiceStats = {
  last_updated: number;
  storage: { [path: string]: StorageStats };
  temperatures: { [apex: string]: number };
  uptime: number;
  latest_version: string;
  version: string;
};

export type StorageStats = {
  free: number;
  total: number;
  used: number;
  mount_type: string;
  min_shm?: number;
};

export type PotentialProblem = {
  text: string;
  color: string;
  relevantLink?: string;
};

export type Vainfo = {
  return_code: number;
  stdout: string;
  stderr: string;
};

export type Nvinfo = {
  [key: string]: {
    name: string;
    driver: string;
    cuda_compute: string;
    vbios: string;
  };
};

export type Ffprobe = {
  return_code: number;
  stderr: string;
  stdout: {
    programs: string[];
    streams: {
      avg_frame_rate: string;
      codec_long_name: string;
      height?: number;
      width?: number;
    }[];
  };
};
