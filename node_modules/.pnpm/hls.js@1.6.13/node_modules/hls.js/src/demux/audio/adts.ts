/**
 * ADTS parser helper
 * @link https://wiki.multimedia.cx/index.php?title=ADTS
 */
import { ErrorDetails, ErrorTypes } from '../../errors';
import { Events } from '../../events';
import { logger } from '../../utils/logger';
import type { HlsEventEmitter } from '../../events';
import type {
  AudioFrame,
  AudioSample,
  DemuxedAudioTrack,
} from '../../types/demuxer';

type AudioConfig = {
  config: [number, number];
  samplerate: number;
  channelCount: number;
  codec: string;
  parsedCodec: string;
  manifestCodec: string | undefined;
};

type FrameHeader = {
  headerLength: number;
  frameLength: number;
};

export function getAudioConfig(
  observer: HlsEventEmitter,
  data: Uint8Array,
  offset: number,
  manifestCodec: string | undefined,
): AudioConfig | void {
  const adtsSamplingRates = [
    96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025,
    8000, 7350,
  ];
  const byte2 = data[offset + 2];
  const adtsSamplingIndex = (byte2 >> 2) & 0xf;
  if (adtsSamplingIndex > 12) {
    const error = new Error(`invalid ADTS sampling index:${adtsSamplingIndex}`);
    observer.emit(Events.ERROR, Events.ERROR, {
      type: ErrorTypes.MEDIA_ERROR,
      details: ErrorDetails.FRAG_PARSING_ERROR,
      fatal: true,
      error,
      reason: error.message,
    });
    return;
  }
  // MPEG-4 Audio Object Type (profile_ObjectType+1)
  const adtsObjectType = ((byte2 >> 6) & 0x3) + 1;
  const channelCount = ((data[offset + 3] >> 6) & 0x3) | ((byte2 & 1) << 2);
  const codec = 'mp4a.40.' + adtsObjectType;
  /* refer to http://wiki.multimedia.cx/index.php?title=MPEG-4_Audio#Audio_Specific_Config
      ISO/IEC 14496-3 - Table 1.13 — Syntax of AudioSpecificConfig()
    Audio Profile / Audio Object Type
    0: Null
    1: AAC Main
    2: AAC LC (Low Complexity)
    3: AAC SSR (Scalable Sample Rate)
    4: AAC LTP (Long Term Prediction)
    5: SBR (Spectral Band Replication)
    6: AAC Scalable
   sampling freq
    0: 96000 Hz
    1: 88200 Hz
    2: 64000 Hz
    3: 48000 Hz
    4: 44100 Hz
    5: 32000 Hz
    6: 24000 Hz
    7: 22050 Hz
    8: 16000 Hz
    9: 12000 Hz
    10: 11025 Hz
    11: 8000 Hz
    12: 7350 Hz
    13: Reserved
    14: Reserved
    15: frequency is written explictly
    Channel Configurations
    These are the channel configurations:
    0: Defined in AOT Specifc Config
    1: 1 channel: front-center
    2: 2 channels: front-left, front-right
  */
  // audioObjectType = profile => profile, the MPEG-4 Audio Object Type minus 1
  const samplerate = adtsSamplingRates[adtsSamplingIndex];
  let aacSampleIndex = adtsSamplingIndex;
  if (adtsObjectType === 5 || adtsObjectType === 29) {
    // HE-AAC uses SBR (Spectral Band Replication) , high frequencies are constructed from low frequencies
    // there is a factor 2 between frame sample rate and output sample rate
    // multiply frequency by 2 (see table above, equivalent to substract 3)
    aacSampleIndex -= 3;
  }
  const config: [number, number] = [
    (adtsObjectType << 3) | ((aacSampleIndex & 0x0e) >> 1),
    ((aacSampleIndex & 0x01) << 7) | (channelCount << 3),
  ];
  logger.log(
    `manifest codec:${manifestCodec}, parsed codec:${codec}, channels:${channelCount}, rate:${samplerate} (ADTS object type:${adtsObjectType} sampling index:${adtsSamplingIndex})`,
  );
  return {
    config,
    samplerate,
    channelCount,
    codec,
    parsedCodec: codec,
    manifestCodec,
  };
}

export function isHeaderPattern(data: Uint8Array, offset: number): boolean {
  return data[offset] === 0xff && (data[offset + 1] & 0xf6) === 0xf0;
}

export function getHeaderLength(data: Uint8Array, offset: number): number {
  return data[offset + 1] & 0x01 ? 7 : 9;
}

export function getFullFrameLength(data: Uint8Array, offset: number): number {
  return (
    ((data[offset + 3] & 0x03) << 11) |
    (data[offset + 4] << 3) |
    ((data[offset + 5] & 0xe0) >>> 5)
  );
}

export function canGetFrameLength(data: Uint8Array, offset: number): boolean {
  return offset + 5 < data.length;
}

export function isHeader(data: Uint8Array, offset: number): boolean {
  // Look for ADTS header | 1111 1111 | 1111 X00X | where X can be either 0 or 1
  // Layer bits (position 14 and 15) in header should be always 0 for ADTS
  // More info https://wiki.multimedia.cx/index.php?title=ADTS
  return offset + 1 < data.length && isHeaderPattern(data, offset);
}

export function canParse(data: Uint8Array, offset: number): boolean {
  return (
    canGetFrameLength(data, offset) &&
    isHeaderPattern(data, offset) &&
    getFullFrameLength(data, offset) <= data.length - offset
  );
}

export function probe(data: Uint8Array, offset: number): boolean {
  // same as isHeader but we also check that ADTS frame follows last ADTS frame
  // or end of data is reached
  if (isHeader(data, offset)) {
    // ADTS header Length
    const headerLength = getHeaderLength(data, offset);
    if (offset + headerLength >= data.length) {
      return false;
    }
    // ADTS frame Length
    const frameLength = getFullFrameLength(data, offset);
    if (frameLength <= headerLength) {
      return false;
    }

    const newOffset = offset + frameLength;
    return newOffset === data.length || isHeader(data, newOffset);
  }
  return false;
}

export function initTrackConfig(
  track: DemuxedAudioTrack,
  observer: HlsEventEmitter,
  data: Uint8Array,
  offset: number,
  audioCodec: string | undefined,
) {
  if (!track.samplerate) {
    const config = getAudioConfig(observer, data, offset, audioCodec);
    if (!config) {
      return;
    }
    Object.assign(track, config);
  }
}

export function getFrameDuration(samplerate: number): number {
  return (1024 * 90000) / samplerate;
}

export function parseFrameHeader(
  data: Uint8Array,
  offset: number,
): FrameHeader | void {
  // The protection skip bit tells us if we have 2 bytes of CRC data at the end of the ADTS header
  const headerLength = getHeaderLength(data, offset);
  if (offset + headerLength <= data.length) {
    // retrieve frame size
    const frameLength = getFullFrameLength(data, offset) - headerLength;
    if (frameLength > 0) {
      // logger.log(`AAC frame, offset/length/total/pts:${offset+headerLength}/${frameLength}/${data.byteLength}`);
      return { headerLength, frameLength };
    }
  }
}

export function appendFrame(
  track: DemuxedAudioTrack,
  data: Uint8Array,
  offset: number,
  pts: number,
  frameIndex: number,
): AudioFrame {
  const frameDuration = getFrameDuration(track.samplerate as number);
  const stamp = pts + frameIndex * frameDuration;
  const header = parseFrameHeader(data, offset);
  let unit: Uint8Array;
  if (header) {
    const { frameLength, headerLength } = header;
    const length = headerLength + frameLength;
    const missing = Math.max(0, offset + length - data.length);
    // logger.log(`AAC frame ${frameIndex}, pts:${stamp} length@offset/total: ${frameLength}@${offset+headerLength}/${data.byteLength} missing: ${missing}`);
    if (missing) {
      unit = new Uint8Array(length - headerLength);
      unit.set(data.subarray(offset + headerLength, data.length), 0);
    } else {
      unit = data.subarray(offset + headerLength, offset + length);
    }

    const sample: AudioSample = {
      unit,
      pts: stamp,
    };
    if (!missing) {
      track.samples.push(sample as AudioSample);
    }

    return { sample, length, missing };
  }
  // overflow incomplete header
  const length = data.length - offset;
  unit = new Uint8Array(length);
  unit.set(data.subarray(offset, data.length), 0);
  const sample: AudioSample = {
    unit,
    pts: stamp,
  };
  return { sample, length, missing: -1 };
}
