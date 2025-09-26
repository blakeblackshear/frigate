/**
 *  MPEG parser helper
 */
import type { DemuxedAudioTrack } from '../../types/demuxer';

let chromeVersion: number | null = null;

const BitratesMap = [
  32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 32, 48, 56,
  64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 32, 40, 48, 56, 64, 80,
  96, 112, 128, 160, 192, 224, 256, 320, 32, 48, 56, 64, 80, 96, 112, 128, 144,
  160, 176, 192, 224, 256, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144,
  160,
];

const SamplingRateMap = [
  44100, 48000, 32000, 22050, 24000, 16000, 11025, 12000, 8000,
];

const SamplesCoefficients = [
  // MPEG 2.5
  [
    0, // Reserved
    72, // Layer3
    144, // Layer2
    12, // Layer1
  ],
  // Reserved
  [
    0, // Reserved
    0, // Layer3
    0, // Layer2
    0, // Layer1
  ],
  // MPEG 2
  [
    0, // Reserved
    72, // Layer3
    144, // Layer2
    12, // Layer1
  ],
  // MPEG 1
  [
    0, // Reserved
    144, // Layer3
    144, // Layer2
    12, // Layer1
  ],
];

const BytesInSlot = [
  0, // Reserved
  1, // Layer3
  1, // Layer2
  4, // Layer1
];

export function appendFrame(
  track: DemuxedAudioTrack,
  data: Uint8Array,
  offset: number,
  pts: number,
  frameIndex: number,
) {
  // Using http://www.datavoyage.com/mpgscript/mpeghdr.htm as a reference
  if (offset + 24 > data.length) {
    return;
  }

  const header = parseHeader(data, offset);
  if (header && offset + header.frameLength <= data.length) {
    const frameDuration = (header.samplesPerFrame * 90000) / header.sampleRate;
    const stamp = pts + frameIndex * frameDuration;
    const sample = {
      unit: data.subarray(offset, offset + header.frameLength),
      pts: stamp,
      dts: stamp,
    };

    track.config = [];
    track.channelCount = header.channelCount;
    track.samplerate = header.sampleRate;
    track.samples.push(sample);

    return { sample, length: header.frameLength, missing: 0 };
  }
}

export function parseHeader(data: Uint8Array, offset: number) {
  const mpegVersion = (data[offset + 1] >> 3) & 3;
  const mpegLayer = (data[offset + 1] >> 1) & 3;
  const bitRateIndex = (data[offset + 2] >> 4) & 15;
  const sampleRateIndex = (data[offset + 2] >> 2) & 3;
  if (
    mpegVersion !== 1 &&
    bitRateIndex !== 0 &&
    bitRateIndex !== 15 &&
    sampleRateIndex !== 3
  ) {
    const paddingBit = (data[offset + 2] >> 1) & 1;
    const channelMode = data[offset + 3] >> 6;
    const columnInBitrates =
      mpegVersion === 3 ? 3 - mpegLayer : mpegLayer === 3 ? 3 : 4;
    const bitRate =
      BitratesMap[columnInBitrates * 14 + bitRateIndex - 1] * 1000;
    const columnInSampleRates =
      mpegVersion === 3 ? 0 : mpegVersion === 2 ? 1 : 2;
    const sampleRate =
      SamplingRateMap[columnInSampleRates * 3 + sampleRateIndex];
    const channelCount = channelMode === 3 ? 1 : 2; // If bits of channel mode are `11` then it is a single channel (Mono)
    const sampleCoefficient = SamplesCoefficients[mpegVersion][mpegLayer];
    const bytesInSlot = BytesInSlot[mpegLayer];
    const samplesPerFrame = sampleCoefficient * 8 * bytesInSlot;
    const frameLength =
      Math.floor((sampleCoefficient * bitRate) / sampleRate + paddingBit) *
      bytesInSlot;

    if (chromeVersion === null) {
      const userAgent = navigator.userAgent || '';
      const result = userAgent.match(/Chrome\/(\d+)/i);
      chromeVersion = result ? parseInt(result[1]) : 0;
    }
    const needChromeFix = !!chromeVersion && chromeVersion <= 87;

    if (
      needChromeFix &&
      mpegLayer === 2 &&
      bitRate >= 224000 &&
      channelMode === 0
    ) {
      // Work around bug in Chromium by setting channelMode to dual-channel (01) instead of stereo (00)
      data[offset + 3] = data[offset + 3] | 0x80;
    }

    return { sampleRate, channelCount, frameLength, samplesPerFrame };
  }
}

export function isHeaderPattern(data: Uint8Array, offset: number): boolean {
  return (
    data[offset] === 0xff &&
    (data[offset + 1] & 0xe0) === 0xe0 &&
    (data[offset + 1] & 0x06) !== 0x00
  );
}

export function isHeader(data: Uint8Array, offset: number): boolean {
  // Look for MPEG header | 1111 1111 | 111X XYZX | where X can be either 0 or 1 and Y or Z should be 1
  // Layer bits (position 14 and 15) in header should be always different from 0 (Layer I or Layer II or Layer III)
  // More info http://www.mp3-tech.org/programmer/frame_header.html
  return offset + 1 < data.length && isHeaderPattern(data, offset);
}

export function canParse(data: Uint8Array, offset: number): boolean {
  const headerSize = 4;

  return isHeaderPattern(data, offset) && headerSize <= data.length - offset;
}

export function probe(data: Uint8Array, offset: number): boolean {
  // same as isHeader but we also check that MPEG frame follows last MPEG frame
  // or end of data is reached
  if (offset + 1 < data.length && isHeaderPattern(data, offset)) {
    // MPEG header Length
    const headerLength = 4;
    // MPEG frame Length
    const header = parseHeader(data, offset);
    let frameLength = headerLength;
    if (header?.frameLength) {
      frameLength = header.frameLength;
    }

    const newOffset = offset + frameLength;
    return newOffset === data.length || isHeader(data, newOffset);
  }
  return false;
}
