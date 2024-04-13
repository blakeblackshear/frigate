export interface FrigateStats {
  cameras: { [camera_name: string]: CameraStats };
  cpu_usages: { [pid: string]: CpuStats };
  detectors: { [detectorKey: string]: DetectorStats };
  gpu_usages?: { [gpuKey: string]: GpuStats };
  processes: { [processKey: string]: ExtraProcessStats };
  service: ServiceStats;
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

export type ExtraProcessStats = {
  pid: number;
};

export type GpuStats = {
  gpu: string;
  mem: string;
};

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
};

export type PotentialProblem = {
  text: string;
  color: string;
};

export type Vainfo = {
  return_code: number;
  stdout: string;
  stderr: string;
};
