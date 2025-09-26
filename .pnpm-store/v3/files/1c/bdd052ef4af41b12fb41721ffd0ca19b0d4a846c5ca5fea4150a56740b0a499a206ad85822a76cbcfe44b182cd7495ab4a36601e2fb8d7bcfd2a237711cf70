import type { SourceBufferName } from './buffer';
import type {
  DemuxedAudioTrack,
  DemuxedMetadataTrack,
  DemuxedUserdataTrack,
  DemuxedVideoTrack,
  DemuxedVideoTrackBase,
  MetadataSample,
  UserdataSample,
} from './demuxer';
import type { PlaylistLevelType } from './loader';
import type { TrackSet } from './track';
import type { DecryptData } from '../loader/level-key';
import type { TimestampOffset } from '../utils/timescale-conversion';

export interface Remuxer {
  remux(
    audioTrack: DemuxedAudioTrack,
    videoTrack: DemuxedVideoTrackBase,
    id3Track: DemuxedMetadataTrack,
    textTrack: DemuxedUserdataTrack,
    timeOffset: number,
    accurateTimeOffset: boolean,
    flush: boolean,
    playlistType: PlaylistLevelType,
  ): RemuxerResult;
  resetInitSegment(
    initSegment: Uint8Array | undefined,
    audioCodec: string | undefined,
    videoCodec: string | undefined,
    decryptdata: DecryptData | null,
  ): void;
  resetTimeStamp(defaultInitPTS: TimestampOffset | null): void;
  resetNextTimestamp(): void;
  destroy(): void;
}

export interface RemuxedTrack {
  data1: Uint8Array<ArrayBuffer>;
  data2?: Uint8Array<ArrayBuffer>;
  startPTS: number;
  endPTS: number;
  startDTS: number;
  endDTS: number;
  type: SourceBufferName;
  hasAudio: boolean;
  hasVideo: boolean;
  independent?: boolean;
  firstKeyFrame?: number;
  firstKeyFramePTS?: number;
  nb: number;
  transferredData1?: ArrayBuffer;
  transferredData2?: ArrayBuffer;
  dropped?: number;
  encrypted?: boolean;
}

export interface RemuxedMetadata {
  samples: MetadataSample[];
}

export interface RemuxedUserdata {
  samples: UserdataSample[];
}

export type Mp4SampleFlags = {
  isLeading: 0;
  isDependedOn: 0;
  hasRedundancy: 0;
  degradPrio: 0;
  dependsOn: 1 | 2;
  isNonSync: 0 | 1;
};

export type Mp4Sample = {
  size: number;
  duration: number;
  cts: number;
  flags: Mp4SampleFlags;
};

export type RemuxedAudioTrackSamples = DemuxedAudioTrack & {
  samples: Mp4Sample[];
};

export type RemuxedVideoTrackSamples = DemuxedVideoTrack & {
  samples: Mp4Sample[];
};

export interface RemuxerResult {
  audio?: RemuxedTrack;
  video?: RemuxedTrack;
  text?: RemuxedUserdata;
  id3?: RemuxedMetadata;
  initSegment?: InitSegmentData;
  independent?: boolean;
}

export interface InitSegmentData {
  tracks?: TrackSet;
  initPTS: number | undefined;
  timescale: number | undefined;
  trackId: number | undefined;
}
