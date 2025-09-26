import { canParseId3 } from '@svta/common-media-library/id3/canParseId3';
import { getId3Data } from '@svta/common-media-library/id3/getId3Data';
import { getId3Timestamp } from '@svta/common-media-library/id3/getId3Timestamp';
import {
  type AudioFrame,
  type DemuxedAudioTrack,
  type DemuxedMetadataTrack,
  type DemuxedUserdataTrack,
  type DemuxedVideoTrackBase,
  type Demuxer,
  type DemuxerResult,
  type KeyData,
  MetadataSchema,
} from '../../types/demuxer';
import { appendUint8Array } from '../../utils/mp4-tools';
import { dummyTrack } from '../dummy-demuxed-track';
import type {
  RationalTimestamp,
  TimestampOffset,
} from '../../utils/timescale-conversion';

class BaseAudioDemuxer implements Demuxer {
  protected _audioTrack?: DemuxedAudioTrack;
  protected _id3Track?: DemuxedMetadataTrack;
  protected frameIndex: number = 0;
  protected cachedData: Uint8Array | null = null;
  protected basePTS: number | null = null;
  protected initPTS: TimestampOffset | null = null;
  protected lastPTS: number | null = null;

  resetInitSegment(
    initSegment: Uint8Array | undefined,
    audioCodec: string | undefined,
    videoCodec: string | undefined,
    trackDuration: number,
  ) {
    this._id3Track = {
      type: 'id3',
      id: 3,
      pid: -1,
      inputTimeScale: 90000,
      sequenceNumber: 0,
      samples: [],
      dropped: 0,
    };
  }

  resetTimeStamp(deaultTimestamp: TimestampOffset | null) {
    this.initPTS = deaultTimestamp;
    this.resetContiguity();
  }

  resetContiguity(): void {
    this.basePTS = null;
    this.lastPTS = null;
    this.frameIndex = 0;
  }

  canParse(data: Uint8Array, offset: number): boolean {
    return false;
  }

  appendFrame(
    track: DemuxedAudioTrack,
    data: Uint8Array,
    offset: number,
  ): AudioFrame | void {}

  // feed incoming data to the front of the parsing pipeline
  demux(data: Uint8Array, timeOffset: number): DemuxerResult {
    if (this.cachedData) {
      data = appendUint8Array(this.cachedData, data);
      this.cachedData = null;
    }

    let id3Data: Uint8Array | undefined = getId3Data(data, 0);
    let offset = id3Data ? id3Data.length : 0;
    let lastDataIndex;
    const track = this._audioTrack as DemuxedAudioTrack;
    const id3Track = this._id3Track as DemuxedMetadataTrack;
    const timestamp = id3Data ? getId3Timestamp(id3Data) : undefined;
    const length = data.length;

    if (
      this.basePTS === null ||
      (this.frameIndex === 0 && Number.isFinite(timestamp))
    ) {
      this.basePTS = initPTSFn(timestamp, timeOffset, this.initPTS);
      this.lastPTS = this.basePTS;
    }

    if (this.lastPTS === null) {
      this.lastPTS = this.basePTS;
    }

    // more expressive than alternative: id3Data?.length
    if (id3Data && id3Data.length > 0) {
      id3Track.samples.push({
        pts: this.lastPTS,
        dts: this.lastPTS,
        data: id3Data,
        type: MetadataSchema.audioId3,
        duration: Number.POSITIVE_INFINITY,
      });
    }

    while (offset < length) {
      if (this.canParse(data, offset)) {
        const frame = this.appendFrame(track, data, offset);
        if (frame) {
          this.frameIndex++;
          this.lastPTS = frame.sample.pts;
          offset += frame.length;
          lastDataIndex = offset;
        } else {
          offset = length;
        }
      } else if (canParseId3(data, offset)) {
        // after a canParse, a call to getId3Data *should* always returns some data
        id3Data = getId3Data(data, offset)!;
        id3Track.samples.push({
          pts: this.lastPTS,
          dts: this.lastPTS,
          data: id3Data,
          type: MetadataSchema.audioId3,
          duration: Number.POSITIVE_INFINITY,
        });
        offset += id3Data.length;
        lastDataIndex = offset;
      } else {
        offset++;
      }
      if (offset === length && lastDataIndex !== length) {
        const partialData = data.slice(lastDataIndex);
        if (this.cachedData) {
          this.cachedData = appendUint8Array(this.cachedData, partialData);
        } else {
          this.cachedData = partialData;
        }
      }
    }

    return {
      audioTrack: track,
      videoTrack: dummyTrack() as DemuxedVideoTrackBase,
      id3Track,
      textTrack: dummyTrack() as DemuxedUserdataTrack,
    };
  }

  demuxSampleAes(
    data: Uint8Array,
    keyData: KeyData,
    timeOffset: number,
  ): Promise<DemuxerResult> {
    return Promise.reject(
      new Error(
        `[${this}] This demuxer does not support Sample-AES decryption`,
      ),
    );
  }

  flush(timeOffset: number): DemuxerResult {
    // Parse cache in case of remaining frames.
    const cachedData = this.cachedData;
    if (cachedData) {
      this.cachedData = null;
      this.demux(cachedData, 0);
    }

    return {
      audioTrack: this._audioTrack as DemuxedAudioTrack,
      videoTrack: dummyTrack() as DemuxedVideoTrackBase,
      id3Track: this._id3Track as DemuxedMetadataTrack,
      textTrack: dummyTrack() as DemuxedUserdataTrack,
    };
  }

  destroy() {
    this.cachedData = null;
    // @ts-ignore
    this._audioTrack = this._id3Track = undefined;
  }
}

/**
 * Initialize PTS
 * <p>
 *    use timestamp unless it is undefined, NaN or Infinity
 * </p>
 */
export const initPTSFn = (
  timestamp: number | undefined,
  timeOffset: number,
  initPTS: RationalTimestamp | null,
): number => {
  if (Number.isFinite(timestamp as number)) {
    return timestamp! * 90;
  }
  const init90kHz = initPTS
    ? (initPTS.baseTime * 90000) / initPTS.timescale
    : 0;
  return timeOffset * 90000 + init90kHz;
};
export default BaseAudioDemuxer;
