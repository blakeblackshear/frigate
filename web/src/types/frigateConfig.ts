import { IconName } from "@/components/icons/IconPicker";

export interface UiConfig {
  timezone?: string;
  time_format?: "browser" | "12hour" | "24hour";
  date_style?: "full" | "long" | "medium" | "short";
  time_style?: "full" | "long" | "medium" | "short";
  strftime_fmt?: string;
  dashboard: boolean;
  order: number;
}

export interface BirdseyeConfig {
  enabled: boolean;
  height: number;
  mode: "objects" | "continuous" | "motion";
  quality: number;
  restream: boolean;
  width: number;
}

export type SearchModelSize = "small" | "large";

export interface CameraConfig {
  audio: {
    enabled: boolean;
    enabled_in_config: boolean;
    filters: string[] | null;
    listen: string[];
    max_not_heard: number;
    min_volume: number;
    num_threads: number;
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
    stream_name: string;
  };
  motion: {
    contour_area: number;
    delta_alpha: number;
    frame_alpha: number;
    frame_height: number;
    improve_contrast: boolean;
    lightning_threshold: number;
    mask: string[];
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
    mask: string;
    track: string[];
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
  };
  record: {
    enabled: boolean;
    enabled_in_config: boolean;
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
    sync_recordings: boolean;
  };
  review: {
    alerts: {
      required_zones: string[];
      labels: string[];
    };
    detections: {
      required_zones: string[];
      labels: string[];
    };
  };
  rtmp: {
    enabled: boolean;
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
  ui: UiConfig;
  webui_url: string | null;
  zones: {
    [zoneName: string]: {
      coordinates: string;
      filters: Record<string, unknown>;
      inertia: number;
      loitering_time: number;
      objects: string[];
      color: number[];
    };
  };
}

export type CameraGroupConfig = {
  cameras: string[];
  icon: IconName;
  order: number;
};

export interface FrigateConfig {
  audio: {
    enabled: boolean;
    enabled_in_config: boolean | null;
    filters: string[] | null;
    listen: string[];
    max_not_heard: number;
    min_volume: number;
    num_threads: number;
  };

  birdseye: BirdseyeConfig;

  cameras: {
    [cameraName: string]: CameraConfig;
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
    enabled: boolean;
    provider: string;
    base_url?: string;
    api_key?: string;
    model: string;
    prompt: string;
    object_prompts: { [key: string]: string };
    required_zones: string[];
    objects: string[];
  };

  go2rtc: {
    streams: string[];
    webrtc: {
      candidates: string[];
    };
  };

  camera_groups: { [groupName: string]: CameraGroupConfig };

  live: {
    height: number;
    quality: number;
    stream_name: string;
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
    sync_recordings: boolean;
  };

  rtmp: {
    enabled: boolean;
  };

  semantic_search: {
    enabled: boolean;
    reindex: boolean;
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
