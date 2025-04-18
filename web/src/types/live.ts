export type LivePlayerMode = "webrtc" | "mse" | "jsmpeg" | "debug";
export type VideoResolutionType = {
  width: number;
  height: number;
};

type LiveProducerMetadata = {
  type: string;
  url: string;
  remote_addr: string;
  user_agent: string;
  sdp: string;
  medias?: string[];
  receivers?: string[];
  recv: number;
};

type LiveConsumerMetadata = {
  type: string;
  url: string;
  remote_addr: string;
  user_agent: string;
  sdp: string;
  medias?: string[];
  senders?: string[];
  send: number;
};

export type LiveStreamMetadata = {
  producers: LiveProducerMetadata[];
  consumers: LiveConsumerMetadata[];
};

export type LivePlayerError = "stalled" | "startup" | "mse-decode";

export type AudioState = Record<string, boolean>;
export type StatsState = Record<string, boolean>;
export type VolumeState = Record<string, number>;

export type PlayerStatsType = {
  streamType: string;
  bandwidth: number;
  latency: number | undefined;
  totalFrames: number;
  droppedFrames: number | undefined;
  decodedFrames: number | undefined;
  droppedFrameRate: number | undefined;
};
