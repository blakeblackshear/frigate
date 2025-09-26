import type { RationalTimestamp } from '../utils/timescale-conversion';

export interface Demuxer {
  demux(
    data: Uint8Array,
    timeOffset: number,
    isSampleAes?: boolean,
    flush?: boolean,
  ): DemuxerResult;
  demuxSampleAes(
    data: Uint8Array,
    keyData: KeyData,
    timeOffset: number,
  ): Promise<DemuxerResult>;
  flush(timeOffset?: number): DemuxerResult | Promise<DemuxerResult>;
  destroy(): void;
  resetInitSegment(
    initSegment: Uint8Array | undefined,
    audioCodec: string | undefined,
    videoCodec: string | undefined,
    trackDuration: number,
  );
  resetTimeStamp(defaultInitPTS?: RationalTimestamp | null): void;
  resetContiguity(): void;
}

export interface DemuxerResult {
  audioTrack: DemuxedAudioTrack;
  videoTrack: DemuxedVideoTrackBase;
  id3Track: DemuxedMetadataTrack;
  textTrack: DemuxedUserdataTrack;
}

export interface DemuxedTrack {
  type: string;
  id: number;
  pid: number;
  inputTimeScale: number;
  sequenceNumber: number;
  samples:
    | AudioSample[]
    | VideoSample[]
    | MetadataSample[]
    | UserdataSample[]
    | Uint8Array;
  timescale?: number;
  container?: string;
  dropped: number;
  duration?: number;
  pesData?: ElementaryStreamData | null;
  codec?: string;
}

export interface PassthroughTrack extends DemuxedTrack {
  sampleDuration: number;
  samples: Uint8Array;
  timescale: number;
  duration: number;
  codec: string;
  supplemental: string | undefined;
}
export interface DemuxedAudioTrack extends DemuxedTrack {
  type: 'audio';
  segmentCodec: 'aac' | 'ac3' | 'mp3';
  config?: number[] | Uint8Array;
  samplerate?: number;
  channelCount?: number;
  manifestCodec?: string;
  parsedCodec?: string;
  samples: AudioSample[];
}

export type DemuxedAAC = DemuxedAudioTrack & {
  segmentCodec: 'aac';
  samples: AACAudioSample[];
};

export type DemuxedAC3 = DemuxedAudioTrack & {
  segmentCodec: 'ac3';
  config: Uint8Array;
};

export interface DemuxedVideoTrackBase extends DemuxedTrack {
  width?: number;
  height?: number;
  pixelRatio?: [number, number];
  audFound?: boolean;
  vps?: Uint8Array[];
  pps?: Uint8Array[];
  sps?: Uint8Array[];
  naluState?: number;
  segmentCodec?: string;
  manifestCodec?: string;
  samples: VideoSample[] | Uint8Array;
  params?: object;
}

export interface DemuxedVideoTrack extends DemuxedVideoTrackBase {
  type: 'video';
  segmentCodec: 'avc' | 'hevc';
  samples: VideoSample[];
  pixelRatio: [number, number];
  width: number;
  height: number;
}

export type DemuxedAVC1 = DemuxedVideoTrack & {
  segmentCodec: 'avc';
  pps: Uint8Array[];
  sps: Uint8Array[];
};

export type DemuxedHEVC = DemuxedVideoTrack & {
  segmentCodec: 'hevc';
  params: {
    general_profile_space: number;
    general_tier_flag: number;
    general_profile_idc: number;
    general_profile_compatibility_flags: number[];
    general_constraint_indicator_flags: number[];
    general_level_idc: number;
    min_spatial_segmentation_idc: number;
    parallelismType: number;
    chroma_format_idc: number;
    bit_depth_luma_minus8: number;
    bit_depth_chroma_minus8: number;
    frame_rate: { fps: string; fixed: boolean };
    temporal_id_nested: number;
    num_temporal_layers: number;
  };
  pps: Uint8Array[];
  sps: Uint8Array[];
  vps: Uint8Array;
};

export interface DemuxedMetadataTrack extends DemuxedTrack {
  samples: MetadataSample[];
}

export interface DemuxedUserdataTrack extends DemuxedTrack {
  samples: UserdataSample[];
}

export enum MetadataSchema {
  audioId3 = 'org.id3',
  dateRange = 'com.apple.quicktime.HLS',
  emsg = 'https://aomedia.org/emsg/ID3',
  misbklv = 'urn:misb:KLV:bin:1910.1',
}
export interface MetadataSample {
  pts: number;
  dts: number;
  duration: number;
  len?: number;
  data: Uint8Array;
  type: MetadataSchema;
}

export interface UserdataSample {
  pts: number;
  bytes?: Uint8Array;
  type?: number;
  payloadType?: number;
  uuid?: string;
  userData?: string;
  userDataBytes?: Uint8Array;
}

export interface VideoSample {
  dts: number;
  pts: number;
  key: boolean;
  frame: boolean;
  units: VideoSampleUnit[];
  length: number;
}

export interface VideoSampleUnit {
  data: Uint8Array;
  type: number;
  state?: number;
}

export type AudioSample = {
  unit: Uint8Array;
  pts: number;
};

export type AACAudioSample = {
  unit: Uint8Array<ArrayBuffer>;
};

export type AudioFrame = {
  sample: AudioSample;
  length: number;
  missing: number;
};

export interface ElementaryStreamData {
  data: Uint8Array[];
  size: number;
}

export interface KeyData {
  method: string;
  key: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
}
