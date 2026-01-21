import { IconName } from "@/components/icons/IconPicker";
import { TriggerAction, TriggerType } from "./trigger";

export interface UiConfig {
  timezone?: string;
  time_format?: "browser" | "12hour" | "24hour";
  date_style?: "full" | "long" | "medium" | "short";
  time_style?: "full" | "long" | "medium" | "short";
  dashboard: boolean;
  order: number;
  unit_system?: "metric" | "imperial";
}

export interface BirdseyeConfig {
  enabled: boolean;
  height: number;
  mode: "objects" | "continuous" | "motion";
  quality: number;
  restream: boolean;
  width: number;
}

export interface FaceRecognitionConfig {
  enabled: boolean;
  model_size: SearchModelSize;
  unknown_score: number;
  detection_threshold: number;
  recognition_threshold: number;
}

export type SearchModel = "jinav1" | "jinav2";
export type SearchModelSize = "small" | "large";

export interface CameraConfig {
  friendly_name: string;
  audio: {
    enabled: boolean;
    enabled_in_config: boolean;
    filters: string[] | null;
    listen: string[];
    max_not_heard: number;
    min_volume: number;
    num_threads: number;
  };
  audio_transcription: {
    enabled: boolean;
    enabled_in_config: boolean;
    live_enabled: boolean;
  };
  best_image_timeout: number;
  birdseye: {
    enabled: boolean;
    mode: "objects" | "continuous" | "motion";
    order: number;
  };
  detect: {
    annotation_offset: number;
    enabled: boolean;
    fps: number;
    height: number;
    max_disappeared: number;
    min_initialized: number;
    stationary: {
      interval: number;
      max_frames: {
        default: number | null;
        objects: Record<string, unknown>;
      };
      threshold: number;
    };
    width: number;
  };
  enabled: boolean;
  enabled_in_config: boolean;
  ffmpeg: {
    global_args: string[];
    hwaccel_args: string;
    input_args: string;
    inputs: {
      global_args: string[];
      hwaccel_args: string[];
      input_args: string;
      path: string;
      roles: string[];
    }[];
    output_args: {
      detect: string[];
      record: string;
      rtmp: string;
    };
    retry_interval: number;
  };
  ffmpeg_cmds: {
    cmd: string;
    roles: string[];
  }[];
  live: {
    height: number;
    quality: number;
    streams: { [key: string]: string };
  };
  motion: {
    contour_area: number;
    delta_alpha: number;
    frame_alpha: number;
    frame_height: number;
    improve_contrast: boolean;
    lightning_threshold: number;
    mask: {
      [maskId: string]: {
        friendly_name?: string;
        enabled: boolean;
        enabled_in_config?: boolean;
        coordinates: string;
      };
    };
    mqtt_off_delay: number;
    threshold: number;
  };
  mqtt: {
    bounding_box: boolean;
    crop: boolean;
    enabled: boolean;
    height: number;
    quality: number;
    required_zones: string[];
    timestamp: boolean;
  };
  name: string;
  notifications: {
    enabled: boolean;
    email?: string;
    enabled_in_config: boolean;
  };
  objects: {
    filters: {
      [objectName: string]: {
        mask: {
          [maskId: string]: {
            friendly_name?: string;
            enabled: boolean;
            enabled_in_config?: boolean;
            coordinates: string;
          };
        };
        max_area: number;
        max_ratio: number;
        min_area: number;
        min_ratio: number;
        min_score: number;
        threshold: number;
      };
    };
    mask: {
      [maskId: string]: {
        friendly_name?: string;
        enabled: boolean;
        enabled_in_config?: boolean;
        coordinates: string;
      };
    };
    track: string[];
    genai: {
      enabled: boolean;
      enabled_in_config: boolean;
      prompt: string;
      object_prompts: { [key: string]: string };
      required_zones: string[];
      objects: string[];
    };
  };
  onvif: {
    autotracking: {
      calibrate_on_startup: boolean;
      enabled: boolean;
      enabled_in_config: boolean;
      movement_weights: string[];
      required_zones: string[];
      return_preset: string;
      timeout: number;
      track: string[];
      zoom_factor: number;
      zooming: string;
    };
    host: string;
    password: string | null;
    port: number;
    user: string | null;
    tls_insecure: boolean;
  };
  record: {
    enabled: boolean;
    enabled_in_config: boolean;
    alerts: {
      post_capture: number;
      pre_capture: number;
      retain: {
        days: number;
        mode: string;
      };
    };
    detections: {
      post_capture: number;
      pre_capture: number;
      retain: {
        days: number;
        mode: string;
      };
    };
    expire_interval: number;
    export: {
      timelapse_args: string;
    };
    preview: {
      quality: string;
    };
    retain: {
      days: number;
      mode: string;
    };
  };
  review: {
    alerts: {
      enabled: boolean;
      required_zones: string[];
      labels: string[];
      retain: {
        days: number;
        mode: string;
      };
    };
    detections: {
      enabled: boolean;
      required_zones: string[];
      labels: string[];
      retain: {
        days: number;
        mode: string;
      };
    };
    genai?: {
      enabled: boolean;
      enabled_in_config: boolean;
      alerts: boolean;
      detections: boolean;
    };
  };
  rtmp: {
    enabled: boolean;
  };
  semantic_search: {
    triggers: {
      [triggerName: string]: {
        enabled: boolean;
        type: TriggerType;
        data: string;
        threshold: number;
        actions: TriggerAction[];
        friendly_name: string;
      };
    };
  };
  snapshots: {
    bounding_box: boolean;
    clean_copy: boolean;
    crop: boolean;
    enabled: boolean;
    height: number | null;
    quality: number;
    required_zones: string[];
    retain: {
      default: number;
      mode: string;
      objects: Record<string, unknown>;
    };
    timestamp: boolean;
  };
  timestamp_style: {
    color: {
      blue: number;
      green: number;
      red: number;
    };
    effect: string | null;
    format: string;
    position: string;
    thickness: number;
  };
  type: string;
  ui: UiConfig;
  webui_url: string | null;
  zones: {
    [zoneName: string]: {
      coordinates: string;
      distances: string[];
      enabled: boolean;
      enabled_in_config?: boolean;
      filters: Record<string, unknown>;
      inertia: number;
      loitering_time: number;
      speed_threshold: number;
      objects: string[];
      color: number[];
      friendly_name?: string;
    };
  };
}

export type CameraGroupConfig = {
  cameras: string[];
  icon: IconName;
  order: number;
};

export type StreamType = "no-streaming" | "smart" | "continuous";

export type CameraStreamingSettings = {
  streamName: string;
  streamType: StreamType;
  compatibilityMode: boolean;
  playAudio: boolean;
  volume: number;
};

export type CustomClassificationModelConfig = {
  enabled: boolean;
  name: string;
  threshold: number;
  save_attempts?: number;
  object_config?: {
    objects: string[];
    classification_type: string;
  };
  state_config?: {
    cameras: {
      [cameraName: string]: {
        crop: [number, number, number, number];
      };
    };
    motion: boolean;
  };
};

export type GroupStreamingSettings = {
  [cameraName: string]: CameraStreamingSettings;
};

export type AllGroupsStreamingSettings = {
  [groupName: string]: GroupStreamingSettings;
};

export interface FrigateConfig {
  version: string;
  safe_mode: boolean;

  audio: {
    enabled: boolean;
    enabled_in_config: boolean | null;
    filters: string[] | null;
    listen: string[];
    max_not_heard: number;
    min_volume: number;
    num_threads: number;
  };

  audio_transcription: {
    enabled: boolean;
  };

  auth: {
    roles: {
      [roleName: string]: string[];
    };
  };

  birdseye: BirdseyeConfig;

  cameras: {
    [cameraName: string]: CameraConfig;
  };

  classification: {
    bird: {
      enabled: boolean;
      threshold: number;
    };
    custom: {
      [modelKey: string]: CustomClassificationModelConfig;
    };
  };

  database: {
    path: string;
  };

  detect: {
    annotation_offset: number;
    enabled: boolean;
    fps: number;
    height: number | null;
    max_disappeared: number | null;
    min_initialized: number | null;
    stationary: {
      interval: number | null;
      max_frames: {
        default: number | null;
        objects: Record<string, unknown>;
      };
      threshold: number | null;
    };
    width: number | null;
  };

  detectors: {
    coral: {
      device: string;
      model: {
        height: number;
        input_pixel_format: string;
        input_tensor: string;
        labelmap: Record<string, string>;
        labelmap_path: string | null;
        model_type: string;
        path: string;
        width: number;
      };
      type: string;
    };
  };

  environment_vars: Record<string, unknown>;

  face_recognition: FaceRecognitionConfig;

  ffmpeg: {
    global_args: string[];
    hwaccel_args: string;
    input_args: string;
    output_args: {
      detect: string[];
      record: string;
      rtmp: string;
    };
    retry_interval: number;
  };

  genai: {
    provider: string;
    base_url?: string;
    api_key?: string;
    model: string;
  };

  go2rtc: {
    streams: string[];
    webrtc: {
      candidates: string[];
    };
  };

  camera_groups: { [groupName: string]: CameraGroupConfig };

  lpr: {
    enabled: boolean;
  };

  logger: {
    default: string;
    logs: Record<string, string>;
  };

  model: {
    height: number;
    input_pixel_format: string;
    input_tensor: string;
    labelmap: Record<string, unknown>;
    labelmap_path: string | null;
    model_type: string;
    path: string | null;
    width: number;
    colormap: { [key: string]: [number, number, number] };
    attributes_map: { [key: string]: [string] };
    all_attributes: [string];
    plus?: {
      name: string;
      id: string;
      trainDate: string;
      baseModel: string;
      isBaseModel: boolean;
      supportedDetectors: string[];
      width: number;
      height: number;
    } | null;
  };

  motion: Record<string, unknown> | null;

  mqtt: {
    client_id: string;
    enabled: boolean;
    host: string;
    port: number;
    stats_interval: number;
    tls_ca_certs: string | null;
    tls_client_cert: string | null;
    tls_client_key: string | null;
    tls_insecure: boolean | null;
    topic_prefix: string;
    user: string | null;
  };

  notifications: {
    enabled: boolean;
    email?: string;
    enabled_in_config: boolean;
  };

  objects: {
    filters: {
      [objectName: string]: {
        mask: string[] | null;
        max_area: number;
        max_ratio: number;
        min_area: number;
        min_ratio: number;
        min_score: number;
        threshold: number;
      };
    };
    mask: string[];
    track: string[];
  };

  plus: {
    enabled: boolean;
  };

  proxy: {
    logout_url?: string;
  };

  record: {
    enabled: boolean;
    enabled_in_config: boolean | null;
    events: {
      objects: string[] | null;
      post_capture: number;
      pre_capture: number;
      required_zones: string[];
      retain: {
        default: number;
        mode: string;
        objects: Record<string, unknown>;
      };
    };
    expire_interval: number;
    export: {
      timelapse_args: string;
    };
    preview: {
      quality: string;
    };
    retain: {
      days: number;
      mode: string;
    };
  };

  rtmp: {
    enabled: boolean;
  };

  semantic_search: {
    enabled: boolean;
    reindex: boolean;
    model: SearchModel;
    model_size: SearchModelSize;
  };

  snapshots: {
    bounding_box: boolean;
    clean_copy: boolean;
    crop: boolean;
    enabled: boolean;
    height: number | null;
    quality: number;
    required_zones: string[];
    retain: {
      default: number;
      mode: string;
      objects: Record<string, unknown>;
    };
    timestamp: boolean;
  };

  telemetry: {
    network_interfaces: string[];
    stats: {
      amd_gpu_stats: boolean;
      intel_gpu_stats: boolean;
      network_bandwidth: boolean;
    };
    version_check: boolean;
  };

  timestamp_style: {
    color: {
      blue: number;
      green: number;
      red: number;
    };
    effect: string | null;
    format: string;
    position: string;
    thickness: number;
  };

  ui: UiConfig;
}
