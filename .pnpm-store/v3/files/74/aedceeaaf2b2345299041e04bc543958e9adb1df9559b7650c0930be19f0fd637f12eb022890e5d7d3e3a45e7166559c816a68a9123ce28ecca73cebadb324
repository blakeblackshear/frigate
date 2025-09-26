import { getId3Data } from '@svta/common-media-library/id3/getId3Data';
import { getId3Timestamp } from '@svta/common-media-library/id3/getId3Timestamp';
import BaseAudioDemuxer from './base-audio-demuxer';
import { getAudioBSID } from './dolby';
import type { HlsEventEmitter } from '../../events';
import type { AudioFrame, DemuxedAudioTrack } from '../../types/demuxer';

export class AC3Demuxer extends BaseAudioDemuxer {
  private readonly observer: HlsEventEmitter;

  constructor(observer: HlsEventEmitter) {
    super();
    this.observer = observer;
  }

  resetInitSegment(
    initSegment: Uint8Array | undefined,
    audioCodec: string | undefined,
    videoCodec: string | undefined,
    trackDuration: number,
  ) {
    super.resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration);
    this._audioTrack = {
      container: 'audio/ac-3',
      type: 'audio',
      id: 2,
      pid: -1,
      sequenceNumber: 0,
      segmentCodec: 'ac3',
      samples: [],
      manifestCodec: audioCodec,
      duration: trackDuration,
      inputTimeScale: 90000,
      dropped: 0,
    };
  }

  canParse(data: Uint8Array, offset: number): boolean {
    return offset + 64 < data.length;
  }

  appendFrame(
    track: DemuxedAudioTrack,
    data: Uint8Array,
    offset: number,
  ): AudioFrame | void {
    const frameLength = appendFrame(
      track,
      data,
      offset,
      this.basePTS as number,
      this.frameIndex,
    );
    if (frameLength !== -1) {
      const sample = track.samples[track.samples.length - 1];
      return { sample, length: frameLength, missing: 0 };
    }
  }

  static probe(data: Uint8Array | undefined): boolean {
    if (!data) {
      return false;
    }

    const id3Data = getId3Data(data, 0);
    if (!id3Data) {
      return false;
    }

    // look for the ac-3 sync bytes
    const offset = id3Data.length;
    if (
      data[offset] === 0x0b &&
      data[offset + 1] === 0x77 &&
      getId3Timestamp(id3Data) !== undefined &&
      // check the bsid to confirm ac-3
      getAudioBSID(data, offset) < 16
    ) {
      return true;
    }
    return false;
  }
}

export function appendFrame(
  track: DemuxedAudioTrack,
  data: Uint8Array,
  start: number,
  pts: number,
  frameIndex: number,
): number {
  if (start + 8 > data.length) {
    return -1; // not enough bytes left
  }

  if (data[start] !== 0x0b || data[start + 1] !== 0x77) {
    return -1; // invalid magic
  }

  // get sample rate
  const samplingRateCode = data[start + 4] >> 6;
  if (samplingRateCode >= 3) {
    return -1; // invalid sampling rate
  }

  const samplingRateMap = [48000, 44100, 32000];
  const sampleRate = samplingRateMap[samplingRateCode];

  // get frame size
  const frameSizeCode = data[start + 4] & 0x3f;
  const frameSizeMap = [
    64, 69, 96, 64, 70, 96, 80, 87, 120, 80, 88, 120, 96, 104, 144, 96, 105,
    144, 112, 121, 168, 112, 122, 168, 128, 139, 192, 128, 140, 192, 160, 174,
    240, 160, 175, 240, 192, 208, 288, 192, 209, 288, 224, 243, 336, 224, 244,
    336, 256, 278, 384, 256, 279, 384, 320, 348, 480, 320, 349, 480, 384, 417,
    576, 384, 418, 576, 448, 487, 672, 448, 488, 672, 512, 557, 768, 512, 558,
    768, 640, 696, 960, 640, 697, 960, 768, 835, 1152, 768, 836, 1152, 896, 975,
    1344, 896, 976, 1344, 1024, 1114, 1536, 1024, 1115, 1536, 1152, 1253, 1728,
    1152, 1254, 1728, 1280, 1393, 1920, 1280, 1394, 1920,
  ];

  const frameLength = frameSizeMap[frameSizeCode * 3 + samplingRateCode] * 2;
  if (start + frameLength > data.length) {
    return -1;
  }

  // get channel count
  const channelMode = data[start + 6] >> 5;
  let skipCount = 0;
  if (channelMode === 2) {
    skipCount += 2;
  } else {
    if (channelMode & 1 && channelMode !== 1) {
      skipCount += 2;
    }
    if (channelMode & 4) {
      skipCount += 2;
    }
  }

  const lfeon =
    (((data[start + 6] << 8) | data[start + 7]) >> (12 - skipCount)) & 1;

  const channelsMap = [2, 1, 2, 3, 3, 4, 4, 5];
  const channelCount = channelsMap[channelMode] + lfeon;

  // build dac3 box
  const bsid = data[start + 5] >> 3;
  const bsmod = data[start + 5] & 7;

  const config = new Uint8Array([
    (samplingRateCode << 6) | (bsid << 1) | (bsmod >> 2),
    ((bsmod & 3) << 6) |
      (channelMode << 3) |
      (lfeon << 2) |
      (frameSizeCode >> 4),
    (frameSizeCode << 4) & 0xe0,
  ]);

  const frameDuration = (1536 / sampleRate) * 90000;
  const stamp = pts + frameIndex * frameDuration;
  const unit = data.subarray(start, start + frameLength);

  track.config = config;
  track.channelCount = channelCount;
  track.samplerate = sampleRate;
  track.samples.push({ unit, pts: stamp });

  return frameLength;
}
