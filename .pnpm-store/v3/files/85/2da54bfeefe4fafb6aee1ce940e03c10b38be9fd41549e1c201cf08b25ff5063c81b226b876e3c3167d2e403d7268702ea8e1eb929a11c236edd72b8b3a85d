/**
 * Generate MP4 Box
 */

import { appendUint8Array } from '../utils/mp4-tools';
import type {
  DemuxedAC3,
  DemuxedAudioTrack,
  DemuxedAVC1,
  DemuxedHEVC,
  DemuxedVideoTrack,
} from '../types/demuxer';
import type {
  Mp4SampleFlags,
  RemuxedAudioTrackSamples,
  RemuxedVideoTrackSamples,
} from '../types/remuxer';

type MediaTrackType = DemuxedAudioTrack | DemuxedVideoTrack;
type RemuxedTrackType = RemuxedAudioTrackSamples | RemuxedVideoTrackSamples;

type HdlrTypes = {
  video: Uint8Array;
  audio: Uint8Array;
};

const UINT32_MAX = Math.pow(2, 32) - 1;

class MP4 {
  public static types: Record<string, number[]>;
  private static HDLR_TYPES: HdlrTypes;
  private static STTS: Uint8Array;
  private static STSC: Uint8Array;
  private static STCO: Uint8Array;
  private static STSZ: Uint8Array;
  private static VMHD: Uint8Array;
  private static SMHD: Uint8Array;
  private static STSD: Uint8Array;
  private static FTYP: Uint8Array;
  private static DINF: Uint8Array;

  static init() {
    MP4.types = {
      avc1: [], // codingname
      avcC: [],
      hvc1: [],
      hvcC: [],
      btrt: [],
      dinf: [],
      dref: [],
      esds: [],
      ftyp: [],
      hdlr: [],
      mdat: [],
      mdhd: [],
      mdia: [],
      mfhd: [],
      minf: [],
      moof: [],
      moov: [],
      mp4a: [],
      '.mp3': [],
      dac3: [],
      'ac-3': [],
      mvex: [],
      mvhd: [],
      pasp: [],
      sdtp: [],
      stbl: [],
      stco: [],
      stsc: [],
      stsd: [],
      stsz: [],
      stts: [],
      tfdt: [],
      tfhd: [],
      traf: [],
      trak: [],
      trun: [],
      trex: [],
      tkhd: [],
      vmhd: [],
      smhd: [],
    };

    let i: string;
    for (i in MP4.types) {
      if (MP4.types.hasOwnProperty(i)) {
        MP4.types[i] = [
          i.charCodeAt(0),
          i.charCodeAt(1),
          i.charCodeAt(2),
          i.charCodeAt(3),
        ];
      }
    }

    const videoHdlr = new Uint8Array([
      0x00, // version 0
      0x00,
      0x00,
      0x00, // flags
      0x00,
      0x00,
      0x00,
      0x00, // pre_defined
      0x76,
      0x69,
      0x64,
      0x65, // handler_type: 'vide'
      0x00,
      0x00,
      0x00,
      0x00, // reserved
      0x00,
      0x00,
      0x00,
      0x00, // reserved
      0x00,
      0x00,
      0x00,
      0x00, // reserved
      0x56,
      0x69,
      0x64,
      0x65,
      0x6f,
      0x48,
      0x61,
      0x6e,
      0x64,
      0x6c,
      0x65,
      0x72,
      0x00, // name: 'VideoHandler'
    ]);

    const audioHdlr = new Uint8Array([
      0x00, // version 0
      0x00,
      0x00,
      0x00, // flags
      0x00,
      0x00,
      0x00,
      0x00, // pre_defined
      0x73,
      0x6f,
      0x75,
      0x6e, // handler_type: 'soun'
      0x00,
      0x00,
      0x00,
      0x00, // reserved
      0x00,
      0x00,
      0x00,
      0x00, // reserved
      0x00,
      0x00,
      0x00,
      0x00, // reserved
      0x53,
      0x6f,
      0x75,
      0x6e,
      0x64,
      0x48,
      0x61,
      0x6e,
      0x64,
      0x6c,
      0x65,
      0x72,
      0x00, // name: 'SoundHandler'
    ]);

    MP4.HDLR_TYPES = {
      video: videoHdlr,
      audio: audioHdlr,
    };

    const dref = new Uint8Array([
      0x00, // version 0
      0x00,
      0x00,
      0x00, // flags
      0x00,
      0x00,
      0x00,
      0x01, // entry_count
      0x00,
      0x00,
      0x00,
      0x0c, // entry_size
      0x75,
      0x72,
      0x6c,
      0x20, // 'url' type
      0x00, // version 0
      0x00,
      0x00,
      0x01, // entry_flags
    ]);

    const stco = new Uint8Array([
      0x00, // version
      0x00,
      0x00,
      0x00, // flags
      0x00,
      0x00,
      0x00,
      0x00, // entry_count
    ]);

    MP4.STTS = MP4.STSC = MP4.STCO = stco;

    MP4.STSZ = new Uint8Array([
      0x00, // version
      0x00,
      0x00,
      0x00, // flags
      0x00,
      0x00,
      0x00,
      0x00, // sample_size
      0x00,
      0x00,
      0x00,
      0x00, // sample_count
    ]);
    MP4.VMHD = new Uint8Array([
      0x00, // version
      0x00,
      0x00,
      0x01, // flags
      0x00,
      0x00, // graphicsmode
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00, // opcolor
    ]);
    MP4.SMHD = new Uint8Array([
      0x00, // version
      0x00,
      0x00,
      0x00, // flags
      0x00,
      0x00, // balance
      0x00,
      0x00, // reserved
    ]);

    MP4.STSD = new Uint8Array([
      0x00, // version 0
      0x00,
      0x00,
      0x00, // flags
      0x00,
      0x00,
      0x00,
      0x01,
    ]); // entry_count

    const majorBrand = new Uint8Array([105, 115, 111, 109]); // isom
    const avc1Brand = new Uint8Array([97, 118, 99, 49]); // avc1
    const minorVersion = new Uint8Array([0, 0, 0, 1]);

    MP4.FTYP = MP4.box(
      MP4.types.ftyp,
      majorBrand,
      minorVersion,
      majorBrand,
      avc1Brand,
    );
    MP4.DINF = MP4.box(MP4.types.dinf, MP4.box(MP4.types.dref, dref));
  }

  static box(type: number[], ...payload: Uint8Array[]) {
    let size = 8;
    let i = payload.length;
    const len = i;
    // calculate the total size we need to allocate
    while (i--) {
      size += payload[i].byteLength;
    }

    const result = new Uint8Array(size);
    result[0] = (size >> 24) & 0xff;
    result[1] = (size >> 16) & 0xff;
    result[2] = (size >> 8) & 0xff;
    result[3] = size & 0xff;
    result.set(type, 4);
    // copy the payload into the result
    for (i = 0, size = 8; i < len; i++) {
      // copy payload[i] array @ offset size
      result.set(payload[i], size);
      size += payload[i].byteLength;
    }
    return result;
  }

  static hdlr(type: keyof HdlrTypes) {
    return MP4.box(MP4.types.hdlr, MP4.HDLR_TYPES[type]);
  }

  static mdat(data: Uint8Array) {
    return MP4.box(MP4.types.mdat, data);
  }

  static mdhd(timescale: number, duration: number) {
    duration *= timescale;
    const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
    const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
    return MP4.box(
      MP4.types.mdhd,
      new Uint8Array([
        0x01, // version 1
        0x00,
        0x00,
        0x00, // flags
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x02, // creation_time
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x03, // modification_time
        (timescale >> 24) & 0xff,
        (timescale >> 16) & 0xff,
        (timescale >> 8) & 0xff,
        timescale & 0xff, // timescale
        upperWordDuration >> 24,
        (upperWordDuration >> 16) & 0xff,
        (upperWordDuration >> 8) & 0xff,
        upperWordDuration & 0xff,
        lowerWordDuration >> 24,
        (lowerWordDuration >> 16) & 0xff,
        (lowerWordDuration >> 8) & 0xff,
        lowerWordDuration & 0xff,
        0x55,
        0xc4, // 'und' language (undetermined)
        0x00,
        0x00,
      ]),
    );
  }

  static mdia(track: MediaTrackType) {
    return MP4.box(
      MP4.types.mdia,
      MP4.mdhd(track.timescale || 0, track.duration || 0),
      MP4.hdlr(track.type),
      MP4.minf(track),
    );
  }

  static mfhd(sequenceNumber: number) {
    return MP4.box(
      MP4.types.mfhd,
      new Uint8Array([
        0x00,
        0x00,
        0x00,
        0x00, // flags
        sequenceNumber >> 24,
        (sequenceNumber >> 16) & 0xff,
        (sequenceNumber >> 8) & 0xff,
        sequenceNumber & 0xff, // sequence_number
      ]),
    );
  }

  static minf(track: MediaTrackType) {
    if (track.type === 'audio') {
      return MP4.box(
        MP4.types.minf,
        MP4.box(MP4.types.smhd, MP4.SMHD),
        MP4.DINF,
        MP4.stbl(track),
      );
    } else {
      return MP4.box(
        MP4.types.minf,
        MP4.box(MP4.types.vmhd, MP4.VMHD),
        MP4.DINF,
        MP4.stbl(track),
      );
    }
  }

  static moof(
    sn: number,
    baseMediaDecodeTime: number,
    track: RemuxedTrackType,
  ) {
    return MP4.box(
      MP4.types.moof,
      MP4.mfhd(sn),
      MP4.traf(track, baseMediaDecodeTime),
    );
  }

  static moov(tracks: MediaTrackType[]) {
    let i = tracks.length;
    const boxes: Uint8Array[] = [];

    while (i--) {
      boxes[i] = MP4.trak(tracks[i]);
    }

    return MP4.box.apply(
      null,
      [
        MP4.types.moov,
        MP4.mvhd(tracks[0].timescale || 0, tracks[0].duration || 0),
      ]
        .concat(boxes)
        .concat(MP4.mvex(tracks)),
    );
  }

  static mvex(tracks: MediaTrackType[]) {
    let i = tracks.length;
    const boxes: Uint8Array[] = [];

    while (i--) {
      boxes[i] = MP4.trex(tracks[i]);
    }

    return MP4.box.apply(null, [MP4.types.mvex, ...boxes]);
  }

  static mvhd(timescale: number, duration: number) {
    duration *= timescale;
    const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
    const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
    const bytes = new Uint8Array([
      0x01, // version 1
      0x00,
      0x00,
      0x00, // flags
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x02, // creation_time
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x03, // modification_time
      (timescale >> 24) & 0xff,
      (timescale >> 16) & 0xff,
      (timescale >> 8) & 0xff,
      timescale & 0xff, // timescale
      upperWordDuration >> 24,
      (upperWordDuration >> 16) & 0xff,
      (upperWordDuration >> 8) & 0xff,
      upperWordDuration & 0xff,
      lowerWordDuration >> 24,
      (lowerWordDuration >> 16) & 0xff,
      (lowerWordDuration >> 8) & 0xff,
      lowerWordDuration & 0xff,
      0x00,
      0x01,
      0x00,
      0x00, // 1.0 rate
      0x01,
      0x00, // 1.0 volume
      0x00,
      0x00, // reserved
      0x00,
      0x00,
      0x00,
      0x00, // reserved
      0x00,
      0x00,
      0x00,
      0x00, // reserved
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x40,
      0x00,
      0x00,
      0x00, // transformation: unity matrix
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00, // pre_defined
      0xff,
      0xff,
      0xff,
      0xff, // next_track_ID
    ]);
    return MP4.box(MP4.types.mvhd, bytes);
  }

  static sdtp(track: RemuxedTrackType) {
    const samples = track.samples || [];
    const bytes = new Uint8Array(4 + samples.length);
    let i: number;
    let flags: Mp4SampleFlags;
    // leave the full box header (4 bytes) all zero
    // write the sample table
    for (i = 0; i < samples.length; i++) {
      flags = samples[i].flags;
      bytes[i + 4] =
        (flags.dependsOn << 4) |
        (flags.isDependedOn << 2) |
        flags.hasRedundancy;
    }

    return MP4.box(MP4.types.sdtp, bytes);
  }

  static stbl(track: MediaTrackType) {
    return MP4.box(
      MP4.types.stbl,
      MP4.stsd(track),
      MP4.box(MP4.types.stts, MP4.STTS),
      MP4.box(MP4.types.stsc, MP4.STSC),
      MP4.box(MP4.types.stsz, MP4.STSZ),
      MP4.box(MP4.types.stco, MP4.STCO),
    );
  }

  static avc1(track: DemuxedAVC1) {
    let sps: number[] = [];
    let pps: number[] = [];
    let i;
    let data;
    let len;
    // assemble the SPSs

    for (i = 0; i < track.sps.length; i++) {
      data = track.sps[i];
      len = data.byteLength;
      sps.push((len >>> 8) & 0xff);
      sps.push(len & 0xff);

      // SPS
      sps = sps.concat(Array.prototype.slice.call(data));
    }

    // assemble the PPSs
    for (i = 0; i < track.pps.length; i++) {
      data = track.pps[i];
      len = data.byteLength;
      pps.push((len >>> 8) & 0xff);
      pps.push(len & 0xff);

      pps = pps.concat(Array.prototype.slice.call(data));
    }

    const avcc = MP4.box(
      MP4.types.avcC,
      new Uint8Array(
        [
          0x01, // version
          sps[3], // profile
          sps[4], // profile compat
          sps[5], // level
          0xfc | 3, // lengthSizeMinusOne, hard-coded to 4 bytes
          0xe0 | track.sps.length, // 3bit reserved (111) + numOfSequenceParameterSets
        ]
          .concat(sps)
          .concat([
            track.pps.length, // numOfPictureParameterSets
          ])
          .concat(pps),
      ),
    ); // "PPS"
    const width = track.width;
    const height = track.height;
    const hSpacing = track.pixelRatio[0];
    const vSpacing = track.pixelRatio[1];

    return MP4.box(
      MP4.types.avc1,
      new Uint8Array([
        0x00,
        0x00,
        0x00, // reserved
        0x00,
        0x00,
        0x00, // reserved
        0x00,
        0x01, // data_reference_index
        0x00,
        0x00, // pre_defined
        0x00,
        0x00, // reserved
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00, // pre_defined
        (width >> 8) & 0xff,
        width & 0xff, // width
        (height >> 8) & 0xff,
        height & 0xff, // height
        0x00,
        0x48,
        0x00,
        0x00, // horizresolution
        0x00,
        0x48,
        0x00,
        0x00, // vertresolution
        0x00,
        0x00,
        0x00,
        0x00, // reserved
        0x00,
        0x01, // frame_count
        0x12,
        0x64,
        0x61,
        0x69,
        0x6c, // dailymotion/hls.js
        0x79,
        0x6d,
        0x6f,
        0x74,
        0x69,
        0x6f,
        0x6e,
        0x2f,
        0x68,
        0x6c,
        0x73,
        0x2e,
        0x6a,
        0x73,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00, // compressorname
        0x00,
        0x18, // depth = 24
        0x11,
        0x11,
      ]), // pre_defined = -1
      avcc,
      MP4.box(
        MP4.types.btrt,
        new Uint8Array([
          0x00,
          0x1c,
          0x9c,
          0x80, // bufferSizeDB
          0x00,
          0x2d,
          0xc6,
          0xc0, // maxBitrate
          0x00,
          0x2d,
          0xc6,
          0xc0,
        ]),
      ), // avgBitrate
      MP4.box(
        MP4.types.pasp,
        new Uint8Array([
          hSpacing >> 24, // hSpacing
          (hSpacing >> 16) & 0xff,
          (hSpacing >> 8) & 0xff,
          hSpacing & 0xff,
          vSpacing >> 24, // vSpacing
          (vSpacing >> 16) & 0xff,
          (vSpacing >> 8) & 0xff,
          vSpacing & 0xff,
        ]),
      ),
    );
  }

  static esds(track: DemuxedAudioTrack) {
    const config = track.config as [number, number];
    return new Uint8Array([
      0x00, // version 0
      0x00,
      0x00,
      0x00, // flags

      0x03, // descriptor_type
      0x19, // length

      0x00,
      0x01, // es_id

      0x00, // stream_priority

      0x04, // descriptor_type
      0x11, // length
      0x40, // codec : mpeg4_audio
      0x15, // stream_type
      0x00,
      0x00,
      0x00, // buffer_size
      0x00,
      0x00,
      0x00,
      0x00, // maxBitrate
      0x00,
      0x00,
      0x00,
      0x00, // avgBitrate

      0x05, // descriptor_type
      0x02, // length
      ...config,
      0x06,
      0x01,
      0x02, // GASpecificConfig)); // length + audio config descriptor
    ]);
  }

  static audioStsd(track: DemuxedAudioTrack) {
    const samplerate = track.samplerate || 0;
    return new Uint8Array([
      0x00,
      0x00,
      0x00, // reserved
      0x00,
      0x00,
      0x00, // reserved
      0x00,
      0x01, // data_reference_index
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00, // reserved
      0x00,
      track.channelCount || 0, // channelcount
      0x00,
      0x10, // sampleSize:16bits
      0x00,
      0x00,
      0x00,
      0x00, // reserved2
      (samplerate >> 8) & 0xff,
      samplerate & 0xff, //
      0x00,
      0x00,
    ]);
  }

  static mp4a(track: DemuxedAudioTrack) {
    return MP4.box(
      MP4.types.mp4a,
      MP4.audioStsd(track),
      MP4.box(MP4.types.esds, MP4.esds(track)),
    );
  }

  static mp3(track: DemuxedAudioTrack) {
    return MP4.box(MP4.types['.mp3'], MP4.audioStsd(track));
  }

  static ac3(track: DemuxedAudioTrack) {
    return MP4.box(
      MP4.types['ac-3'],
      MP4.audioStsd(track),
      MP4.box(MP4.types.dac3, track.config as Uint8Array),
    );
  }

  static stsd(track: MediaTrackType | DemuxedAC3): Uint8Array {
    const { segmentCodec } = track;
    if (track.type === 'audio') {
      if (segmentCodec === 'aac') {
        return MP4.box(MP4.types.stsd, MP4.STSD, MP4.mp4a(track));
      }
      if (
        __USE_M2TS_ADVANCED_CODECS__ &&
        segmentCodec === 'ac3' &&
        track.config
      ) {
        return MP4.box(MP4.types.stsd, MP4.STSD, MP4.ac3(track));
      }
      if (segmentCodec === 'mp3' && track.codec === 'mp3') {
        return MP4.box(MP4.types.stsd, MP4.STSD, MP4.mp3(track));
      }
    } else {
      if (track.pps && track.sps) {
        if (segmentCodec === 'avc') {
          return MP4.box(
            MP4.types.stsd,
            MP4.STSD,
            MP4.avc1(track as DemuxedAVC1),
          );
        }
        if (
          __USE_M2TS_ADVANCED_CODECS__ &&
          segmentCodec === 'hevc' &&
          track.vps
        ) {
          return MP4.box(
            MP4.types.stsd,
            MP4.STSD,
            MP4.hvc1(track as DemuxedHEVC),
          );
        }
      } else {
        throw new Error(`video track missing pps or sps`);
      }
    }

    throw new Error(
      `unsupported ${track.type} segment codec (${segmentCodec}/${track.codec})`,
    );
  }

  static tkhd(track: MediaTrackType) {
    const id = track.id;
    const duration = (track.duration || 0) * (track.timescale || 0);
    const width = (track as any).width || 0;
    const height = (track as any).height || 0;
    const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
    const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
    return MP4.box(
      MP4.types.tkhd,
      new Uint8Array([
        0x01, // version 1
        0x00,
        0x00,
        0x07, // flags
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x02, // creation_time
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x03, // modification_time
        (id >> 24) & 0xff,
        (id >> 16) & 0xff,
        (id >> 8) & 0xff,
        id & 0xff, // track_ID
        0x00,
        0x00,
        0x00,
        0x00, // reserved
        upperWordDuration >> 24,
        (upperWordDuration >> 16) & 0xff,
        (upperWordDuration >> 8) & 0xff,
        upperWordDuration & 0xff,
        lowerWordDuration >> 24,
        (lowerWordDuration >> 16) & 0xff,
        (lowerWordDuration >> 8) & 0xff,
        lowerWordDuration & 0xff,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00, // reserved
        0x00,
        0x00, // layer
        0x00,
        0x00, // alternate_group
        0x00,
        0x00, // non-audio track volume
        0x00,
        0x00, // reserved
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x40,
        0x00,
        0x00,
        0x00, // transformation: unity matrix
        (width >> 8) & 0xff,
        width & 0xff,
        0x00,
        0x00, // width
        (height >> 8) & 0xff,
        height & 0xff,
        0x00,
        0x00, // height
      ]),
    );
  }

  static traf(track: RemuxedTrackType, baseMediaDecodeTime: number) {
    const sampleDependencyTable = MP4.sdtp(track);
    const id = track.id;
    const upperWordBaseMediaDecodeTime = Math.floor(
      baseMediaDecodeTime / (UINT32_MAX + 1),
    );
    const lowerWordBaseMediaDecodeTime = Math.floor(
      baseMediaDecodeTime % (UINT32_MAX + 1),
    );
    return MP4.box(
      MP4.types.traf,
      MP4.box(
        MP4.types.tfhd,
        new Uint8Array([
          0x00, // version 0
          0x00,
          0x00,
          0x00, // flags
          id >> 24,
          (id >> 16) & 0xff,
          (id >> 8) & 0xff,
          id & 0xff, // track_ID
        ]),
      ),
      MP4.box(
        MP4.types.tfdt,
        new Uint8Array([
          0x01, // version 1
          0x00,
          0x00,
          0x00, // flags
          upperWordBaseMediaDecodeTime >> 24,
          (upperWordBaseMediaDecodeTime >> 16) & 0xff,
          (upperWordBaseMediaDecodeTime >> 8) & 0xff,
          upperWordBaseMediaDecodeTime & 0xff,
          lowerWordBaseMediaDecodeTime >> 24,
          (lowerWordBaseMediaDecodeTime >> 16) & 0xff,
          (lowerWordBaseMediaDecodeTime >> 8) & 0xff,
          lowerWordBaseMediaDecodeTime & 0xff,
        ]),
      ),
      MP4.trun(
        track,
        sampleDependencyTable.length +
          16 + // tfhd
          20 + // tfdt
          8 + // traf header
          16 + // mfhd
          8 + // moof header
          8,
      ), // mdat header
      sampleDependencyTable,
    );
  }

  /**
   * Generate a track box.
   * @param track a track definition
   */
  static trak(track: MediaTrackType) {
    track.duration = track.duration || 0xffffffff;
    return MP4.box(MP4.types.trak, MP4.tkhd(track), MP4.mdia(track));
  }

  static trex(track: MediaTrackType) {
    const id = track.id;
    return MP4.box(
      MP4.types.trex,
      new Uint8Array([
        0x00, // version 0
        0x00,
        0x00,
        0x00, // flags
        id >> 24,
        (id >> 16) & 0xff,
        (id >> 8) & 0xff,
        id & 0xff, // track_ID
        0x00,
        0x00,
        0x00,
        0x01, // default_sample_description_index
        0x00,
        0x00,
        0x00,
        0x00, // default_sample_duration
        0x00,
        0x00,
        0x00,
        0x00, // default_sample_size
        0x00,
        0x01,
        0x00,
        0x01, // default_sample_flags
      ]),
    );
  }

  static trun(track: MediaTrackType, offset: number) {
    const samples = track.samples || [];
    const len = samples.length;
    const arraylen = 12 + 16 * len;
    const array = new Uint8Array(arraylen);
    let i;
    let sample;
    let duration;
    let size;
    let flags;
    let cts;
    offset += 8 + arraylen;
    array.set(
      [
        track.type === 'video' ? 0x01 : 0x00, // version 1 for video with signed-int sample_composition_time_offset
        0x00,
        0x0f,
        0x01, // flags
        (len >>> 24) & 0xff,
        (len >>> 16) & 0xff,
        (len >>> 8) & 0xff,
        len & 0xff, // sample_count
        (offset >>> 24) & 0xff,
        (offset >>> 16) & 0xff,
        (offset >>> 8) & 0xff,
        offset & 0xff, // data_offset
      ],
      0,
    );
    for (i = 0; i < len; i++) {
      sample = samples[i];
      duration = sample.duration;
      size = sample.size;
      flags = sample.flags;
      cts = sample.cts;
      array.set(
        [
          (duration >>> 24) & 0xff,
          (duration >>> 16) & 0xff,
          (duration >>> 8) & 0xff,
          duration & 0xff, // sample_duration
          (size >>> 24) & 0xff,
          (size >>> 16) & 0xff,
          (size >>> 8) & 0xff,
          size & 0xff, // sample_size
          (flags.isLeading << 2) | flags.dependsOn,
          (flags.isDependedOn << 6) |
            (flags.hasRedundancy << 4) |
            (flags.paddingValue << 1) |
            flags.isNonSync,
          flags.degradPrio & (0xf0 << 8),
          flags.degradPrio & 0x0f, // sample_flags
          (cts >>> 24) & 0xff,
          (cts >>> 16) & 0xff,
          (cts >>> 8) & 0xff,
          cts & 0xff, // sample_composition_time_offset
        ],
        12 + 16 * i,
      );
    }
    return MP4.box(MP4.types.trun, array);
  }

  static initSegment(tracks: MediaTrackType[]) {
    if (!MP4.types) {
      MP4.init();
    }

    const movie = MP4.moov(tracks);
    const result = appendUint8Array(MP4.FTYP, movie);
    return result;
  }

  static hvc1(track: DemuxedHEVC) {
    if (!__USE_M2TS_ADVANCED_CODECS__) {
      return new Uint8Array();
    }
    const ps = track.params;
    const units: Uint8Array[][] = [track.vps, track.sps, track.pps];
    const NALuLengthSize = 4;
    const config = new Uint8Array([
      0x01,
      (ps.general_profile_space << 6) |
        (ps.general_tier_flag ? 32 : 0) |
        ps.general_profile_idc,
      ps.general_profile_compatibility_flags[0],
      ps.general_profile_compatibility_flags[1],
      ps.general_profile_compatibility_flags[2],
      ps.general_profile_compatibility_flags[3],
      ps.general_constraint_indicator_flags[0],
      ps.general_constraint_indicator_flags[1],
      ps.general_constraint_indicator_flags[2],
      ps.general_constraint_indicator_flags[3],
      ps.general_constraint_indicator_flags[4],
      ps.general_constraint_indicator_flags[5],
      ps.general_level_idc,
      240 | (ps.min_spatial_segmentation_idc >> 8),
      255 & ps.min_spatial_segmentation_idc,
      252 | ps.parallelismType,
      252 | ps.chroma_format_idc,
      248 | ps.bit_depth_luma_minus8,
      248 | ps.bit_depth_chroma_minus8,
      0x00,
      parseInt(ps.frame_rate.fps),
      (NALuLengthSize - 1) |
        (ps.temporal_id_nested << 2) |
        (ps.num_temporal_layers << 3) |
        (ps.frame_rate.fixed ? 64 : 0),
      units.length,
    ]);

    // compute hvcC size in bytes
    let length = config.length;
    for (let i = 0; i < units.length; i += 1) {
      length += 3;
      for (let j = 0; j < units[i].length; j += 1) {
        length += 2 + units[i][j].length;
      }
    }

    const hvcC = new Uint8Array(length);
    hvcC.set(config, 0);
    length = config.length;
    // append parameter set units: one vps, one or more sps and pps
    const iMax = units.length - 1;
    for (let i = 0; i < units.length; i += 1) {
      hvcC.set(
        new Uint8Array([
          (32 + i) | (i === iMax ? 128 : 0),
          0x00,
          units[i].length,
        ]),
        length,
      );
      length += 3;
      for (let j = 0; j < units[i].length; j += 1) {
        hvcC.set(
          new Uint8Array([units[i][j].length >> 8, units[i][j].length & 255]),
          length,
        );
        length += 2;
        hvcC.set(units[i][j], length);
        length += units[i][j].length;
      }
    }
    const hvcc = MP4.box(MP4.types.hvcC, hvcC);
    const width = track.width;
    const height = track.height;
    const hSpacing = track.pixelRatio[0];
    const vSpacing = track.pixelRatio[1];

    return MP4.box(
      MP4.types.hvc1,
      new Uint8Array([
        0x00,
        0x00,
        0x00, // reserved
        0x00,
        0x00,
        0x00, // reserved
        0x00,
        0x01, // data_reference_index
        0x00,
        0x00, // pre_defined
        0x00,
        0x00, // reserved
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00, // pre_defined
        (width >> 8) & 0xff,
        width & 0xff, // width
        (height >> 8) & 0xff,
        height & 0xff, // height
        0x00,
        0x48,
        0x00,
        0x00, // horizresolution
        0x00,
        0x48,
        0x00,
        0x00, // vertresolution
        0x00,
        0x00,
        0x00,
        0x00, // reserved
        0x00,
        0x01, // frame_count
        0x12,
        0x64,
        0x61,
        0x69,
        0x6c, // dailymotion/hls.js
        0x79,
        0x6d,
        0x6f,
        0x74,
        0x69,
        0x6f,
        0x6e,
        0x2f,
        0x68,
        0x6c,
        0x73,
        0x2e,
        0x6a,
        0x73,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00, // compressorname
        0x00,
        0x18, // depth = 24
        0x11,
        0x11,
      ]), // pre_defined = -1
      hvcc,
      MP4.box(
        MP4.types.btrt,
        new Uint8Array([
          0x00,
          0x1c,
          0x9c,
          0x80, // bufferSizeDB
          0x00,
          0x2d,
          0xc6,
          0xc0, // maxBitrate
          0x00,
          0x2d,
          0xc6,
          0xc0,
        ]),
      ), // avgBitrate
      MP4.box(
        MP4.types.pasp,
        new Uint8Array([
          hSpacing >> 24, // hSpacing
          (hSpacing >> 16) & 0xff,
          (hSpacing >> 8) & 0xff,
          hSpacing & 0xff,
          vSpacing >> 24, // vSpacing
          (vSpacing >> 16) & 0xff,
          (vSpacing >> 8) & 0xff,
          vSpacing & 0xff,
        ]),
      ),
    );
  }
}

export default MP4;
