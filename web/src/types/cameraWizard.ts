// Camera Wizard Types
export const CAMERA_BRANDS = [
  {
    value: "dahua" as const,
    label: "Dahua / Amcrest / EmpireTech",
    template:
      "rtsp://{username}:{password}@{host}:554/cam/realmonitor?channel=1&subtype=0",
    exampleUrl:
      "rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0",
  },
  {
    value: "hikvision" as const,
    label: "Hikvision / Uniview / Annke",
    template: "rtsp://{username}:{password}@{host}:554/Streaming/Channels/101",
    exampleUrl:
      "rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101",
  },
  {
    value: "ubiquiti" as const,
    label: "Ubiquiti",
    template: "rtsp://{username}:{password}@{host}:554/live/ch0",
    exampleUrl: "rtsp://ubnt:password@192.168.1.100:554/live/ch0",
  },
  {
    value: "reolink" as const,
    label: "Reolink",
    template: "rtsp://{username}:{password}@{host}:554/h264Preview_01_main",
    exampleUrl: "rtsp://admin:password@192.168.1.100:554/h264Preview_01_main",
  },
  {
    value: "axis" as const,
    label: "Axis",
    template: "rtsp://{username}:{password}@{host}:554/axis-media/media.amp",
    exampleUrl: "rtsp://root:password@192.168.1.100:554/axis-media/media.amp",
  },
  {
    value: "tplink" as const,
    label: "TP-Link",
    template: "rtsp://{username}:{password}@{host}:554/stream1",
    exampleUrl: "rtsp://admin:password@192.168.1.100:554/stream1",
  },
  {
    value: "foscam" as const,
    label: "Foscam",
    template: "rtsp://{username}:{password}@{host}:88/videoMain",
    exampleUrl: "rtsp://admin:password@192.168.1.100:88/videoMain",
  },
  {
    value: "other" as const,
    label: "Other",
    template: "",
    exampleUrl: "rtsp://username:password@host:port/path",
  },
] as const;

export const CAMERA_BRAND_VALUES = CAMERA_BRANDS.map(
  (brand) => brand.value,
) as unknown as [
  (typeof CAMERA_BRANDS)[number]["value"],
  ...(typeof CAMERA_BRANDS)[number]["value"][],
];

export type CameraBrand = (typeof CAMERA_BRANDS)[number]["value"];

export type StreamRole = "detect" | "record" | "audio";

export type StreamConfig = {
  id: string;
  url: string;
  roles: StreamRole[];
  resolution?: string;
  quality?: string;
  testResult?: TestResult;
  userTested?: boolean;
};

export type TestResult = {
  success: boolean;
  snapshot?: string; // base64 image
  resolution?: string;
  videoCodec?: string;
  audioCodec?: string;
  fps?: number;
  error?: string;
};

export type WizardFormData = {
  cameraName?: string;
  host?: string;
  username?: string;
  password?: string;
  brandTemplate?: CameraBrand;
  customUrl?: string;
  streams?: StreamConfig[];
  liveViewStreamIds?: string[];
};

// API Response Types
export type FfprobeResponse = {
  return_code: number;
  stderr: string;
  stdout: FfprobeData | string;
};

export type FfprobeData = {
  streams: FfprobeStream[];
};

export type FfprobeStream = {
  index?: number;
  codec_name?: string;
  codec_long_name?: string;
  codec_type?: "video" | "audio";
  profile?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  level?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
};

// Config API Types
export type CameraConfigData = {
  cameras: {
    [cameraName: string]: {
      enabled: boolean;
      friendly_name?: string;
      ffmpeg: {
        inputs: {
          path: string;
          roles: string[];
        }[];
      };
      live?: {
        streams: Record<string, string>;
      };
    };
  };
  go2rtc?: {
    streams: {
      [streamName: string]: string[];
    };
  };
};

export type ConfigSetBody = {
  requires_restart: number;
  config_data: CameraConfigData;
  update_topic?: string;
};
