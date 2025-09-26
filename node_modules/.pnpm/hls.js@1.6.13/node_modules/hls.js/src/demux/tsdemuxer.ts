/**
 * highly optimized TS demuxer:
 * parse PAT, PMT
 * extract PES packet from audio and video PIDs
 * extract AVC/H264 (or HEVC/H265) NAL units and AAC/ADTS samples from PES packet
 * trigger the remuxer upon parsing completion
 * it also tries to workaround as best as it can audio codec switch (HE-AAC to AAC and vice versa), without having to restart the MediaSource.
 * it also controls the remuxing process :
 * upon discontinuity or level switch detection, it will also notifies the remuxer so that it can reset its state.
 */

import * as AC3 from './audio/ac3-demuxer';
import * as ADTS from './audio/adts';
import * as MpegAudio from './audio/mpegaudio';
import SampleAesDecrypter from './sample-aes';
import AvcVideoParser from './video/avc-video-parser';
import HevcVideoParser from './video/hevc-video-parser';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import {
  type DemuxedAudioTrack,
  type DemuxedMetadataTrack,
  type DemuxedTrack,
  type DemuxedUserdataTrack,
  type DemuxedVideoTrack,
  type Demuxer,
  type DemuxerResult,
  type ElementaryStreamData,
  type KeyData,
  MetadataSchema,
  type VideoSample,
} from '../types/demuxer';
import { appendUint8Array, RemuxerTrackIdConfig } from '../utils/mp4-tools';
import type { HlsConfig } from '../config';
import type { HlsEventEmitter } from '../events';
import type BaseVideoParser from './video/base-video-parser';
import type { AudioFrame, DemuxedAAC } from '../types/demuxer';
import type { TypeSupported } from '../utils/codecs';
import type { ILogger } from '../utils/logger';

export type ParsedTimestamp = {
  pts?: number;
  dts?: number;
};

export type PES = ParsedTimestamp & {
  data: Uint8Array;
  len: number;
};

export type ParsedVideoSample = ParsedTimestamp &
  Omit<VideoSample, 'pts' | 'dts'>;

const PACKET_LENGTH = 188;

class TSDemuxer implements Demuxer {
  private readonly logger: ILogger;
  private readonly observer: HlsEventEmitter;
  private readonly config: HlsConfig;
  private readonly typeSupported: TypeSupported;

  private sampleAes: SampleAesDecrypter | null = null;
  private pmtParsed: boolean = false;
  private audioCodec?: string;
  private videoCodec?: string;
  private _pmtId: number = -1;

  private _videoTrack?: DemuxedVideoTrack;
  private _audioTrack?: DemuxedAudioTrack;
  private _id3Track?: DemuxedMetadataTrack;
  private _txtTrack?: DemuxedUserdataTrack;
  private aacOverFlow: AudioFrame | null = null;
  private remainderData: Uint8Array | null = null;
  private videoParser: BaseVideoParser | null;

  constructor(
    observer: HlsEventEmitter,
    config: HlsConfig,
    typeSupported: TypeSupported,
    logger: ILogger,
  ) {
    this.observer = observer;
    this.config = config;
    this.typeSupported = typeSupported;
    this.logger = logger;
    this.videoParser = null;
  }

  static probe(data: Uint8Array, logger: ILogger) {
    const syncOffset = TSDemuxer.syncOffset(data);
    if (syncOffset > 0) {
      logger.warn(
        `MPEG2-TS detected but first sync word found @ offset ${syncOffset}`,
      );
    }
    return syncOffset !== -1;
  }

  static syncOffset(data: Uint8Array): number {
    const length = data.length;
    let scanwindow = Math.min(PACKET_LENGTH * 5, length - PACKET_LENGTH) + 1;
    let i = 0;
    while (i < scanwindow) {
      // a TS init segment should contain at least 2 TS packets: PAT and PMT, each starting with 0x47
      let foundPat = false;
      let packetStart = -1;
      let tsPackets = 0;
      for (let j = i; j < length; j += PACKET_LENGTH) {
        if (
          data[j] === 0x47 &&
          (length - j === PACKET_LENGTH || data[j + PACKET_LENGTH] === 0x47)
        ) {
          tsPackets++;
          if (packetStart === -1) {
            packetStart = j;
            // First sync word found at offset, increase scan length (#5251)
            if (packetStart !== 0) {
              scanwindow =
                Math.min(
                  packetStart + PACKET_LENGTH * 99,
                  data.length - PACKET_LENGTH,
                ) + 1;
            }
          }
          if (!foundPat) {
            foundPat = parsePID(data, j) === 0;
          }
          // Sync word found at 0 with 3 packets, or found at offset least 2 packets up to scanwindow (#5501)
          if (
            foundPat &&
            tsPackets > 1 &&
            ((packetStart === 0 && tsPackets > 2) ||
              j + PACKET_LENGTH > scanwindow)
          ) {
            return packetStart;
          }
        } else if (tsPackets) {
          // Exit if sync word found, but does not contain contiguous packets
          return -1;
        } else {
          break;
        }
      }
      i++;
    }
    return -1;
  }

  /**
   * Creates a track model internal to demuxer used to drive remuxing input
   */
  static createTrack(
    type: 'audio' | 'video' | 'id3' | 'text',
    duration?: number,
  ): DemuxedTrack {
    return {
      container:
        type === 'video' || type === 'audio' ? 'video/mp2t' : undefined,
      type,
      id: RemuxerTrackIdConfig[type],
      pid: -1,
      inputTimeScale: 90000,
      sequenceNumber: 0,
      samples: [],
      dropped: 0,
      duration: type === 'audio' ? duration : undefined,
    };
  }

  /**
   * Initializes a new init segment on the demuxer/remuxer interface. Needed for discontinuities/track-switches (or at stream start)
   * Resets all internal track instances of the demuxer.
   */
  public resetInitSegment(
    initSegment: Uint8Array | undefined,
    audioCodec: string,
    videoCodec: string,
    trackDuration: number,
  ) {
    this.pmtParsed = false;
    this._pmtId = -1;

    this._videoTrack = TSDemuxer.createTrack('video') as DemuxedVideoTrack;
    this._videoTrack.duration = trackDuration;
    this._audioTrack = TSDemuxer.createTrack(
      'audio',
      trackDuration,
    ) as DemuxedAudioTrack;
    this._id3Track = TSDemuxer.createTrack('id3') as DemuxedMetadataTrack;
    this._txtTrack = TSDemuxer.createTrack('text') as DemuxedUserdataTrack;
    this._audioTrack.segmentCodec = 'aac';

    // flush any partial content
    this.videoParser = null;
    this.aacOverFlow = null;
    this.remainderData = null;
    this.audioCodec = audioCodec;
    this.videoCodec = videoCodec;
  }

  public resetTimeStamp() {}

  public resetContiguity(): void {
    const { _audioTrack, _videoTrack, _id3Track } = this;
    if (_audioTrack) {
      _audioTrack.pesData = null;
    }
    if (_videoTrack) {
      _videoTrack.pesData = null;
    }
    if (_id3Track) {
      _id3Track.pesData = null;
    }
    this.aacOverFlow = null;
    this.remainderData = null;
  }

  public demux(
    data: Uint8Array,
    timeOffset: number,
    isSampleAes = false,
    flush = false,
  ): DemuxerResult {
    if (!isSampleAes) {
      this.sampleAes = null;
    }

    let pes: PES | null;

    const videoTrack = this._videoTrack as DemuxedVideoTrack;
    const audioTrack = this._audioTrack as DemuxedAudioTrack;
    const id3Track = this._id3Track as DemuxedMetadataTrack;
    const textTrack = this._txtTrack as DemuxedUserdataTrack;

    let videoPid = videoTrack.pid;
    let videoData = videoTrack.pesData;
    let audioPid = audioTrack.pid;
    let id3Pid = id3Track.pid;
    let audioData = audioTrack.pesData;
    let id3Data = id3Track.pesData;
    let unknownPID: number | null = null;
    let pmtParsed = this.pmtParsed;
    let pmtId = this._pmtId;

    let len = data.length;
    if (this.remainderData) {
      data = appendUint8Array(this.remainderData, data);
      len = data.length;
      this.remainderData = null;
    }

    if (len < PACKET_LENGTH && !flush) {
      this.remainderData = data;
      return {
        audioTrack,
        videoTrack,
        id3Track,
        textTrack,
      };
    }

    const syncOffset = Math.max(0, TSDemuxer.syncOffset(data));
    len -= (len - syncOffset) % PACKET_LENGTH;
    if (len < data.byteLength && !flush) {
      this.remainderData = new Uint8Array(
        data.buffer,
        len,
        data.buffer.byteLength - len,
      );
    }

    // loop through TS packets
    let tsPacketErrors = 0;
    for (let start = syncOffset; start < len; start += PACKET_LENGTH) {
      if (data[start] === 0x47) {
        const stt = !!(data[start + 1] & 0x40);
        const pid = parsePID(data, start);
        const atf = (data[start + 3] & 0x30) >> 4;

        // if an adaption field is present, its length is specified by the fifth byte of the TS packet header.
        let offset: number;
        if (atf > 1) {
          offset = start + 5 + data[start + 4];
          // continue if there is only adaptation field
          if (offset === start + PACKET_LENGTH) {
            continue;
          }
        } else {
          offset = start + 4;
        }
        switch (pid) {
          case videoPid:
            if (stt) {
              if (videoData && (pes = parsePES(videoData, this.logger))) {
                this.readyVideoParser(videoTrack.segmentCodec);
                if (this.videoParser !== null) {
                  this.videoParser.parsePES(videoTrack, textTrack, pes, false);
                }
              }

              videoData = { data: [], size: 0 };
            }
            if (videoData) {
              videoData.data.push(data.subarray(offset, start + PACKET_LENGTH));
              videoData.size += start + PACKET_LENGTH - offset;
            }
            break;
          case audioPid:
            if (stt) {
              if (audioData && (pes = parsePES(audioData, this.logger))) {
                switch (audioTrack.segmentCodec) {
                  case 'aac':
                    this.parseAACPES(audioTrack, pes);
                    break;
                  case 'mp3':
                    this.parseMPEGPES(audioTrack, pes);
                    break;
                  case 'ac3':
                    if (__USE_M2TS_ADVANCED_CODECS__) {
                      this.parseAC3PES(audioTrack, pes);
                    }
                    break;
                }
              }
              audioData = { data: [], size: 0 };
            }
            if (audioData) {
              audioData.data.push(data.subarray(offset, start + PACKET_LENGTH));
              audioData.size += start + PACKET_LENGTH - offset;
            }
            break;
          case id3Pid:
            if (stt) {
              if (id3Data && (pes = parsePES(id3Data, this.logger))) {
                this.parseID3PES(id3Track, pes);
              }

              id3Data = { data: [], size: 0 };
            }
            if (id3Data) {
              id3Data.data.push(data.subarray(offset, start + PACKET_LENGTH));
              id3Data.size += start + PACKET_LENGTH - offset;
            }
            break;
          case 0:
            if (stt) {
              offset += data[offset] + 1;
            }

            pmtId = this._pmtId = parsePAT(data, offset);
            // this.logger.log('PMT PID:'  + this._pmtId);
            break;
          case pmtId: {
            if (stt) {
              offset += data[offset] + 1;
            }

            const parsedPIDs = parsePMT(
              data,
              offset,
              this.typeSupported,
              isSampleAes,
              this.observer,
              this.logger,
            );

            // only update track id if track PID found while parsing PMT
            // this is to avoid resetting the PID to -1 in case
            // track PID transiently disappears from the stream
            // this could happen in case of transient missing audio samples for example
            // NOTE this is only the PID of the track as found in TS,
            // but we are not using this for MP4 track IDs.
            videoPid = parsedPIDs.videoPid;
            if (videoPid > 0) {
              videoTrack.pid = videoPid;
              videoTrack.segmentCodec = parsedPIDs.segmentVideoCodec;
            }

            audioPid = parsedPIDs.audioPid;
            if (audioPid > 0) {
              audioTrack.pid = audioPid;
              audioTrack.segmentCodec = parsedPIDs.segmentAudioCodec;
            }
            id3Pid = parsedPIDs.id3Pid;
            if (id3Pid > 0) {
              id3Track.pid = id3Pid;
            }

            if (unknownPID !== null && !pmtParsed) {
              this.logger.warn(
                `MPEG-TS PMT found at ${start} after unknown PID '${unknownPID}'. Backtracking to sync byte @${syncOffset} to parse all TS packets.`,
              );
              unknownPID = null;
              // we set it to -188, the += 188 in the for loop will reset start to 0
              start = syncOffset - 188;
            }
            pmtParsed = this.pmtParsed = true;
            break;
          }
          case 0x11:
          case 0x1fff:
            break;
          default:
            unknownPID = pid;
            break;
        }
      } else {
        tsPacketErrors++;
      }
    }

    if (tsPacketErrors > 0) {
      emitParsingError(
        this.observer,
        new Error(
          `Found ${tsPacketErrors} TS packet/s that do not start with 0x47`,
        ),
        undefined,
        this.logger,
      );
    }

    videoTrack.pesData = videoData;
    audioTrack.pesData = audioData;
    id3Track.pesData = id3Data;

    const demuxResult: DemuxerResult = {
      audioTrack,
      videoTrack,
      id3Track,
      textTrack,
    };

    if (flush) {
      this.extractRemainingSamples(demuxResult);
    }

    return demuxResult;
  }

  public flush(): DemuxerResult | Promise<DemuxerResult> {
    const { remainderData } = this;
    this.remainderData = null;
    let result: DemuxerResult;
    if (remainderData) {
      result = this.demux(remainderData, -1, false, true);
    } else {
      result = {
        videoTrack: this._videoTrack as DemuxedVideoTrack,
        audioTrack: this._audioTrack as DemuxedAudioTrack,
        id3Track: this._id3Track as DemuxedMetadataTrack,
        textTrack: this._txtTrack as DemuxedUserdataTrack,
      };
    }
    this.extractRemainingSamples(result);
    if (this.sampleAes) {
      return this.decrypt(result, this.sampleAes);
    }
    return result;
  }

  private extractRemainingSamples(demuxResult: DemuxerResult) {
    const { audioTrack, videoTrack, id3Track, textTrack } = demuxResult;
    const videoData = videoTrack.pesData;
    const audioData = audioTrack.pesData;
    const id3Data = id3Track.pesData;
    // try to parse last PES packets
    let pes: PES | null;
    if (videoData && (pes = parsePES(videoData, this.logger))) {
      this.readyVideoParser(videoTrack.segmentCodec);
      if (this.videoParser !== null) {
        this.videoParser.parsePES(
          videoTrack as DemuxedVideoTrack,
          textTrack as DemuxedUserdataTrack,
          pes,
          true,
        );
        videoTrack.pesData = null;
      }
    } else {
      // either avcData null or PES truncated, keep it for next frag parsing
      videoTrack.pesData = videoData;
    }

    if (audioData && (pes = parsePES(audioData, this.logger))) {
      switch (audioTrack.segmentCodec) {
        case 'aac':
          this.parseAACPES(audioTrack, pes);
          break;
        case 'mp3':
          this.parseMPEGPES(audioTrack, pes);
          break;
        case 'ac3':
          if (__USE_M2TS_ADVANCED_CODECS__) {
            this.parseAC3PES(audioTrack, pes);
          }
          break;
      }
      audioTrack.pesData = null;
    } else {
      if (audioData?.size) {
        this.logger.log(
          'last AAC PES packet truncated,might overlap between fragments',
        );
      }

      // either audioData null or PES truncated, keep it for next frag parsing
      audioTrack.pesData = audioData;
    }

    if (id3Data && (pes = parsePES(id3Data, this.logger))) {
      this.parseID3PES(id3Track, pes);
      id3Track.pesData = null;
    } else {
      // either id3Data null or PES truncated, keep it for next frag parsing
      id3Track.pesData = id3Data;
    }
  }

  public demuxSampleAes(
    data: Uint8Array,
    keyData: KeyData,
    timeOffset: number,
  ): Promise<DemuxerResult> {
    const demuxResult = this.demux(
      data,
      timeOffset,
      true,
      !this.config.progressive,
    );
    const sampleAes = (this.sampleAes = new SampleAesDecrypter(
      this.observer,
      this.config,
      keyData,
    ));
    return this.decrypt(demuxResult, sampleAes);
  }

  private readyVideoParser(codec: string | undefined) {
    if (this.videoParser === null) {
      if (codec === 'avc') {
        this.videoParser = new AvcVideoParser();
      } else if (__USE_M2TS_ADVANCED_CODECS__ && codec === 'hevc') {
        this.videoParser = new HevcVideoParser();
      }
    }
  }

  private decrypt(
    demuxResult: DemuxerResult,
    sampleAes: SampleAesDecrypter,
  ): Promise<DemuxerResult> {
    return new Promise((resolve) => {
      const { audioTrack, videoTrack } = demuxResult;
      if (audioTrack.samples && audioTrack.segmentCodec === 'aac') {
        sampleAes.decryptAacSamples(
          (audioTrack as DemuxedAAC).samples,
          0,
          () => {
            if (videoTrack.samples) {
              sampleAes.decryptAvcSamples(videoTrack.samples, 0, 0, () => {
                resolve(demuxResult);
              });
            } else {
              resolve(demuxResult);
            }
          },
        );
      } else if (videoTrack.samples) {
        sampleAes.decryptAvcSamples(videoTrack.samples, 0, 0, () => {
          resolve(demuxResult);
        });
      }
    });
  }

  public destroy() {
    if (this.observer) {
      this.observer.removeAllListeners();
    }
    // @ts-ignore
    this.config = this.logger = this.observer = null;
    this.aacOverFlow =
      this.videoParser =
      this.remainderData =
      this.sampleAes =
        null;
    this._videoTrack =
      this._audioTrack =
      this._id3Track =
      this._txtTrack =
        undefined;
  }

  private parseAACPES(track: DemuxedAudioTrack, pes: PES) {
    let startOffset = 0;
    const aacOverFlow = this.aacOverFlow;
    let data = pes.data;
    if (aacOverFlow) {
      this.aacOverFlow = null;
      const frameMissingBytes = aacOverFlow.missing;
      const sampleLength = aacOverFlow.sample.unit.byteLength;
      // logger.log(`AAC: append overflowing ${sampleLength} bytes to beginning of new PES`);
      if (frameMissingBytes === -1) {
        data = appendUint8Array(aacOverFlow.sample.unit, data);
      } else {
        const frameOverflowBytes = sampleLength - frameMissingBytes;
        aacOverFlow.sample.unit.set(
          data.subarray(0, frameMissingBytes),
          frameOverflowBytes,
        );
        track.samples.push(aacOverFlow.sample);
        startOffset = aacOverFlow.missing;
      }
    }
    // look for ADTS header (0xFFFx)
    let offset: number;
    let len: number;
    for (offset = startOffset, len = data.length; offset < len - 1; offset++) {
      if (ADTS.isHeader(data, offset)) {
        break;
      }
    }
    // if ADTS header does not start straight from the beginning of the PES payload, raise an error
    if (offset !== startOffset) {
      let reason: string;
      const recoverable = offset < len - 1;
      if (recoverable) {
        reason = `AAC PES did not start with ADTS header,offset:${offset}`;
      } else {
        reason = 'No ADTS header found in AAC PES';
      }
      emitParsingError(
        this.observer,
        new Error(reason),
        recoverable,
        this.logger,
      );
      if (!recoverable) {
        return;
      }
    }

    ADTS.initTrackConfig(track, this.observer, data, offset, this.audioCodec);

    let pts: number;
    if (pes.pts !== undefined) {
      pts = pes.pts;
    } else if (aacOverFlow) {
      // if last AAC frame is overflowing, we should ensure timestamps are contiguous:
      // first sample PTS should be equal to last sample PTS + frameDuration
      const frameDuration = ADTS.getFrameDuration(track.samplerate as number);
      pts = aacOverFlow.sample.pts + frameDuration;
    } else {
      this.logger.warn('[tsdemuxer]: AAC PES unknown PTS');
      return;
    }

    // scan for aac samples
    let frameIndex = 0;
    let frame;
    while (offset < len) {
      frame = ADTS.appendFrame(track, data, offset, pts, frameIndex);
      offset += frame.length;
      if (!frame.missing) {
        frameIndex++;
        for (; offset < len - 1; offset++) {
          if (ADTS.isHeader(data, offset)) {
            break;
          }
        }
      } else {
        this.aacOverFlow = frame;
        break;
      }
    }
  }

  private parseMPEGPES(track: DemuxedAudioTrack, pes: PES) {
    const data = pes.data;
    const length = data.length;
    let frameIndex = 0;
    let offset = 0;
    const pts = pes.pts;
    if (pts === undefined) {
      this.logger.warn('[tsdemuxer]: MPEG PES unknown PTS');
      return;
    }

    while (offset < length) {
      if (MpegAudio.isHeader(data, offset)) {
        const frame = MpegAudio.appendFrame(
          track,
          data,
          offset,
          pts,
          frameIndex,
        );
        if (frame) {
          offset += frame.length;
          frameIndex++;
        } else {
          // logger.log('Unable to parse Mpeg audio frame');
          break;
        }
      } else {
        // nothing found, keep looking
        offset++;
      }
    }
  }

  private parseAC3PES(track: DemuxedAudioTrack, pes: PES) {
    if (__USE_M2TS_ADVANCED_CODECS__) {
      const data = pes.data;
      const pts = pes.pts;
      if (pts === undefined) {
        this.logger.warn('[tsdemuxer]: AC3 PES unknown PTS');
        return;
      }
      const length = data.length;
      let frameIndex = 0;
      let offset = 0;
      let parsed;

      while (
        offset < length &&
        (parsed = AC3.appendFrame(track, data, offset, pts, frameIndex++)) > 0
      ) {
        offset += parsed;
      }
    }
  }

  private parseID3PES(id3Track: DemuxedMetadataTrack, pes: PES) {
    if (pes.pts === undefined) {
      this.logger.warn('[tsdemuxer]: ID3 PES unknown PTS');
      return;
    }
    const id3Sample = Object.assign({}, pes as Required<PES>, {
      type: this._videoTrack ? MetadataSchema.emsg : MetadataSchema.audioId3,
      duration: Number.POSITIVE_INFINITY,
    });
    id3Track.samples.push(id3Sample);
  }
}

function parsePID(data: Uint8Array, offset: number): number {
  // pid is a 13-bit field starting at the last bit of TS[1]
  return ((data[offset + 1] & 0x1f) << 8) + data[offset + 2];
}

function parsePAT(data: Uint8Array, offset: number): number {
  // skip the PSI header and parse the first PMT entry
  return ((data[offset + 10] & 0x1f) << 8) | data[offset + 11];
}

function parsePMT(
  data: Uint8Array,
  offset: number,
  typeSupported: TypeSupported,
  isSampleAes: boolean,
  observer: HlsEventEmitter,
  logger: ILogger,
) {
  const result = {
    audioPid: -1,
    videoPid: -1,
    id3Pid: -1,
    segmentVideoCodec: 'avc' as 'avc' | 'hevc',
    segmentAudioCodec: 'aac' as 'aac' | 'ac3' | 'mp3',
  };
  const sectionLength = ((data[offset + 1] & 0x0f) << 8) | data[offset + 2];
  const tableEnd = offset + 3 + sectionLength - 4;
  // to determine where the table is, we have to figure out how
  // long the program info descriptors are
  const programInfoLength =
    ((data[offset + 10] & 0x0f) << 8) | data[offset + 11];
  // advance the offset to the first entry in the mapping table
  offset += 12 + programInfoLength;
  while (offset < tableEnd) {
    const pid = parsePID(data, offset);
    const esInfoLength = ((data[offset + 3] & 0x0f) << 8) | data[offset + 4];
    switch (data[offset]) {
      case 0xcf: // SAMPLE-AES AAC
        if (!isSampleAes) {
          logEncryptedSamplesFoundInUnencryptedStream('ADTS AAC', logger);
          break;
        }
      /* falls through */
      case 0x0f: // ISO/IEC 13818-7 ADTS AAC (MPEG-2 lower bit-rate audio)
        // logger.log('AAC PID:'  + pid);
        if (result.audioPid === -1) {
          result.audioPid = pid;
        }

        break;

      // Packetized metadata (ID3)
      case 0x15:
        // logger.log('ID3 PID:'  + pid);
        if (result.id3Pid === -1) {
          result.id3Pid = pid;
        }

        break;

      case 0xdb: // SAMPLE-AES AVC
        if (!isSampleAes) {
          logEncryptedSamplesFoundInUnencryptedStream('H.264', logger);
          break;
        }
      /* falls through */
      case 0x1b: // ITU-T Rec. H.264 and ISO/IEC 14496-10 (lower bit-rate video)
        // logger.log('AVC PID:'  + pid);
        if (result.videoPid === -1) {
          result.videoPid = pid;
        }

        break;

      // ISO/IEC 11172-3 (MPEG-1 audio)
      // or ISO/IEC 13818-3 (MPEG-2 halved sample rate audio)
      case 0x03:
      case 0x04:
        // logger.log('MPEG PID:'  + pid);
        if (!typeSupported.mpeg && !typeSupported.mp3) {
          logger.log('MPEG audio found, not supported in this browser');
        } else if (result.audioPid === -1) {
          result.audioPid = pid;
          result.segmentAudioCodec = 'mp3';
        }
        break;

      case 0xc1: // SAMPLE-AES AC3
        if (!isSampleAes) {
          logEncryptedSamplesFoundInUnencryptedStream('AC-3', logger);
          break;
        }
      /* falls through */
      case 0x81:
        if (__USE_M2TS_ADVANCED_CODECS__) {
          if (!typeSupported.ac3) {
            logger.log('AC-3 audio found, not supported in this browser');
          } else if (result.audioPid === -1) {
            result.audioPid = pid;
            result.segmentAudioCodec = 'ac3';
          }
        } else {
          logger.warn('AC-3 in M2TS support not included in build');
        }
        break;

      case 0x06:
        // stream_type 6 can mean a lot of different things in case of DVB.
        // We need to look at the descriptors. Right now, we're only interested
        // in AC-3 audio, so we do the descriptor parsing only when we don't have
        // an audio PID yet.
        if (result.audioPid === -1 && esInfoLength > 0) {
          let parsePos = offset + 5;
          let remaining = esInfoLength;

          while (remaining > 2) {
            const descriptorId = data[parsePos];

            switch (descriptorId) {
              case 0x6a: // DVB Descriptor for AC-3
                if (__USE_M2TS_ADVANCED_CODECS__) {
                  if (typeSupported.ac3 !== true) {
                    logger.log(
                      'AC-3 audio found, not supported in this browser for now',
                    );
                  } else {
                    result.audioPid = pid;
                    result.segmentAudioCodec = 'ac3';
                  }
                } else {
                  logger.warn('AC-3 in M2TS support not included in build');
                }
                break;
            }

            const descriptorLen = data[parsePos + 1] + 2;
            parsePos += descriptorLen;
            remaining -= descriptorLen;
          }
        }
        break;

      case 0xc2: // SAMPLE-AES EC3
      /* falls through */
      case 0x87:
        emitParsingError(
          observer,
          new Error('Unsupported EC-3 in M2TS found'),
          undefined,
          logger,
        );
        return result;

      case 0x24: // ITU-T Rec. H.265 and ISO/IEC 23008-2 (HEVC)
        if (__USE_M2TS_ADVANCED_CODECS__) {
          if (result.videoPid === -1) {
            result.videoPid = pid;
            result.segmentVideoCodec = 'hevc';
            logger.log('HEVC in M2TS found');
          }
        } else {
          emitParsingError(
            observer,
            new Error('Unsupported HEVC in M2TS found'),
            undefined,
            logger,
          );
          return result;
        }
        break;

      default:
        // logger.log('unknown stream type:' + data[offset]);
        break;
    }
    // move to the next table entry
    // skip past the elementary stream descriptors, if present
    offset += esInfoLength + 5;
  }
  return result;
}

function emitParsingError(
  observer: HlsEventEmitter,
  error: Error,
  levelRetry: boolean | undefined,
  logger: ILogger,
) {
  logger.warn(`parsing error: ${error.message}`);
  observer.emit(Events.ERROR, Events.ERROR, {
    type: ErrorTypes.MEDIA_ERROR,
    details: ErrorDetails.FRAG_PARSING_ERROR,
    fatal: false,
    levelRetry,
    error,
    reason: error.message,
  });
}

function logEncryptedSamplesFoundInUnencryptedStream(
  type: string,
  logger: ILogger,
) {
  logger.log(`${type} with AES-128-CBC encryption found in unencrypted stream`);
}

function parsePES(stream: ElementaryStreamData, logger: ILogger): PES | null {
  let i = 0;
  let frag: Uint8Array;
  let pesLen: number;
  let pesHdrLen: number;
  let pesPts: number | undefined;
  let pesDts: number | undefined;
  const data = stream.data;
  // safety check
  if (!stream || stream.size === 0) {
    return null;
  }

  // we might need up to 19 bytes to read PES header
  // if first chunk of data is less than 19 bytes, let's merge it with following ones until we get 19 bytes
  // usually only one merge is needed (and this is rare ...)
  while (data[0].length < 19 && data.length > 1) {
    data[0] = appendUint8Array(data[0], data[1]);
    data.splice(1, 1);
  }
  // retrieve PTS/DTS from first fragment
  frag = data[0];
  const pesPrefix = (frag[0] << 16) + (frag[1] << 8) + frag[2];
  if (pesPrefix === 1) {
    pesLen = (frag[4] << 8) + frag[5];
    // if PES parsed length is not zero and greater than total received length, stop parsing. PES might be truncated
    // minus 6 : PES header size
    if (pesLen && pesLen > stream.size - 6) {
      return null;
    }

    const pesFlags = frag[7];
    if (pesFlags & 0xc0) {
      /* PES header described here : http://dvd.sourceforge.net/dvdinfo/pes-hdr.html
          as PTS / DTS is 33 bit we cannot use bitwise operator in JS,
          as Bitwise operators treat their operands as a sequence of 32 bits */
      pesPts =
        (frag[9] & 0x0e) * 536870912 + // 1 << 29
        (frag[10] & 0xff) * 4194304 + // 1 << 22
        (frag[11] & 0xfe) * 16384 + // 1 << 14
        (frag[12] & 0xff) * 128 + // 1 << 7
        (frag[13] & 0xfe) / 2;

      if (pesFlags & 0x40) {
        pesDts =
          (frag[14] & 0x0e) * 536870912 + // 1 << 29
          (frag[15] & 0xff) * 4194304 + // 1 << 22
          (frag[16] & 0xfe) * 16384 + // 1 << 14
          (frag[17] & 0xff) * 128 + // 1 << 7
          (frag[18] & 0xfe) / 2;

        if (pesPts - pesDts > 60 * 90000) {
          logger.warn(
            `${Math.round(
              (pesPts - pesDts) / 90000,
            )}s delta between PTS and DTS, align them`,
          );
          pesPts = pesDts;
        }
      } else {
        pesDts = pesPts;
      }
    }
    pesHdrLen = frag[8];
    // 9 bytes : 6 bytes for PES header + 3 bytes for PES extension
    let payloadStartOffset = pesHdrLen + 9;
    if (stream.size <= payloadStartOffset) {
      return null;
    }
    stream.size -= payloadStartOffset;
    // reassemble PES packet
    const pesData = new Uint8Array(stream.size);
    for (let j = 0, dataLen = data.length; j < dataLen; j++) {
      frag = data[j];
      let len = frag.byteLength;
      if (payloadStartOffset) {
        if (payloadStartOffset > len) {
          // trim full frag if PES header bigger than frag
          payloadStartOffset -= len;
          continue;
        } else {
          // trim partial frag if PES header smaller than frag
          frag = frag.subarray(payloadStartOffset);
          len -= payloadStartOffset;
          payloadStartOffset = 0;
        }
      }
      pesData.set(frag, i);
      i += len;
    }
    if (pesLen) {
      // payload size : remove PES header + PES extension
      pesLen -= pesHdrLen + 3;
    }
    return { data: pesData, pts: pesPts, dts: pesDts, len: pesLen };
  }
  return null;
}

export default TSDemuxer;
