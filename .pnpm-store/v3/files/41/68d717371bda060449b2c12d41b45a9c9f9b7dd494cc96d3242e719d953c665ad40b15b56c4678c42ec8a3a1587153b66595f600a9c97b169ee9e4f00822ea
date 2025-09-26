import BaseVideoParser from './base-video-parser';
import ExpGolomb from './exp-golomb';
import { parseSEIMessageFromNALu } from '../../utils/mp4-tools';
import type {
  DemuxedUserdataTrack,
  DemuxedVideoTrack,
} from '../../types/demuxer';
import type { PES } from '../tsdemuxer';

class AvcVideoParser extends BaseVideoParser {
  public parsePES(
    track: DemuxedVideoTrack,
    textTrack: DemuxedUserdataTrack,
    pes: PES,
    endOfSegment: boolean,
  ) {
    const units = this.parseNALu(track, pes.data, endOfSegment);
    let VideoSample = this.VideoSample;
    let push: boolean;
    let spsfound = false;
    // free pes.data to save up some memory
    (pes as any).data = null;

    // if new NAL units found and last sample still there, let's push ...
    // this helps parsing streams with missing AUD (only do this if AUD never found)
    if (VideoSample && units.length && !track.audFound) {
      this.pushAccessUnit(VideoSample, track);
      VideoSample = this.VideoSample = this.createVideoSample(
        false,
        pes.pts,
        pes.dts,
      );
    }

    units.forEach((unit) => {
      switch (unit.type) {
        // NDR
        case 1: {
          let iskey = false;
          push = true;
          const data = unit.data;
          // only check slice type to detect KF in case SPS found in same packet (any keyframe is preceded by SPS ...)
          if (spsfound && data.length > 4) {
            // retrieve slice type by parsing beginning of NAL unit (follow H264 spec, slice_header definition) to detect keyframe embedded in NDR
            const sliceType = this.readSliceType(data);
            // 2 : I slice, 4 : SI slice, 7 : I slice, 9: SI slice
            // SI slice : A slice that is coded using intra prediction only and using quantisation of the prediction samples.
            // An SI slice can be coded such that its decoded samples can be constructed identically to an SP slice.
            // I slice: A slice that is not an SI slice that is decoded using intra prediction only.
            // if (sliceType === 2 || sliceType === 7) {
            if (
              sliceType === 2 ||
              sliceType === 4 ||
              sliceType === 7 ||
              sliceType === 9
            ) {
              iskey = true;
            }
          }

          if (iskey) {
            // if we have non-keyframe data already, that cannot belong to the same frame as a keyframe, so force a push
            if (VideoSample?.frame && !VideoSample.key) {
              this.pushAccessUnit(VideoSample, track);
              VideoSample = this.VideoSample = null;
            }
          }

          if (!VideoSample) {
            VideoSample = this.VideoSample = this.createVideoSample(
              true,
              pes.pts,
              pes.dts,
            );
          }
          VideoSample.frame = true;
          VideoSample.key = iskey;

          break;
          // IDR
        }
        case 5:
          push = true;
          // handle PES not starting with AUD
          // if we have frame data already, that cannot belong to the same frame, so force a push
          if (VideoSample?.frame && !VideoSample.key) {
            this.pushAccessUnit(VideoSample, track);
            VideoSample = this.VideoSample = null;
          }
          if (!VideoSample) {
            VideoSample = this.VideoSample = this.createVideoSample(
              true,
              pes.pts,
              pes.dts,
            );
          }

          VideoSample.key = true;
          VideoSample.frame = true;
          break;
        // SEI
        case 6: {
          push = true;
          parseSEIMessageFromNALu(
            unit.data,
            1,
            pes.pts as number,
            textTrack.samples,
          );
          break;
          // SPS
        }
        case 7: {
          push = true;
          spsfound = true;
          const sps = unit.data;
          const config = this.readSPS(sps);
          if (
            !track.sps ||
            track.width !== config.width ||
            track.height !== config.height ||
            track.pixelRatio?.[0] !== config.pixelRatio[0] ||
            track.pixelRatio?.[1] !== config.pixelRatio[1]
          ) {
            track.width = config.width;
            track.height = config.height;
            track.pixelRatio = config.pixelRatio;
            track.sps = [sps];
            const codecarray = sps.subarray(1, 4);
            let codecstring = 'avc1.';
            for (let i = 0; i < 3; i++) {
              let h = codecarray[i].toString(16);
              if (h.length < 2) {
                h = '0' + h;
              }

              codecstring += h;
            }
            track.codec = codecstring;
          }
          break;
        }
        // PPS
        case 8:
          push = true;

          track.pps = [unit.data];

          break;
        // AUD
        case 9:
          push = true;
          track.audFound = true;
          if (VideoSample?.frame) {
            this.pushAccessUnit(VideoSample, track);
            VideoSample = null;
          }
          if (!VideoSample) {
            VideoSample = this.VideoSample = this.createVideoSample(
              false,
              pes.pts,
              pes.dts,
            );
          }
          break;
        // Filler Data
        case 12:
          push = true;
          break;
        default:
          push = false;

          break;
      }
      if (VideoSample && push) {
        const units = VideoSample.units;
        units.push(unit);
      }
    });
    // if last PES packet, push samples
    if (endOfSegment && VideoSample) {
      this.pushAccessUnit(VideoSample, track);
      this.VideoSample = null;
    }
  }

  protected getNALuType(data: Uint8Array, offset: number): number {
    return data[offset] & 0x1f;
  }

  readSliceType(data: Uint8Array) {
    const eg = new ExpGolomb(data);
    // skip NALu type
    eg.readUByte();
    // discard first_mb_in_slice
    eg.readUEG();
    // return slice_type
    return eg.readUEG();
  }

  /**
   * The scaling list is optionally transmitted as part of a sequence parameter
   * set and is not relevant to transmuxing.
   * @param count the number of entries in this scaling list
   * @see Recommendation ITU-T H.264, Section 7.3.2.1.1.1
   */
  skipScalingList(count: number, reader: ExpGolomb): void {
    let lastScale = 8;
    let nextScale = 8;
    let deltaScale;
    for (let j = 0; j < count; j++) {
      if (nextScale !== 0) {
        deltaScale = reader.readEG();
        nextScale = (lastScale + deltaScale + 256) % 256;
      }
      lastScale = nextScale === 0 ? lastScale : nextScale;
    }
  }

  /**
   * Read a sequence parameter set and return some interesting video
   * properties. A sequence parameter set is the H264 metadata that
   * describes the properties of upcoming video frames.
   * @returns an object with configuration parsed from the
   * sequence parameter set, including the dimensions of the
   * associated video frames.
   */
  readSPS(sps: Uint8Array): {
    width: number;
    height: number;
    pixelRatio: [number, number];
  } {
    const eg = new ExpGolomb(sps);
    let frameCropLeftOffset = 0;
    let frameCropRightOffset = 0;
    let frameCropTopOffset = 0;
    let frameCropBottomOffset = 0;
    let numRefFramesInPicOrderCntCycle;
    let scalingListCount;
    let i;
    const readUByte = eg.readUByte.bind(eg);
    const readBits = eg.readBits.bind(eg);
    const readUEG = eg.readUEG.bind(eg);
    const readBoolean = eg.readBoolean.bind(eg);
    const skipBits = eg.skipBits.bind(eg);
    const skipEG = eg.skipEG.bind(eg);
    const skipUEG = eg.skipUEG.bind(eg);
    const skipScalingList = this.skipScalingList.bind(this);

    readUByte();
    const profileIdc = readUByte(); // profile_idc
    readBits(5); // profileCompat constraint_set[0-4]_flag, u(5)
    skipBits(3); // reserved_zero_3bits u(3),
    readUByte(); // level_idc u(8)
    skipUEG(); // seq_parameter_set_id
    // some profiles have more optional data we don't need
    if (
      profileIdc === 100 ||
      profileIdc === 110 ||
      profileIdc === 122 ||
      profileIdc === 244 ||
      profileIdc === 44 ||
      profileIdc === 83 ||
      profileIdc === 86 ||
      profileIdc === 118 ||
      profileIdc === 128
    ) {
      const chromaFormatIdc = readUEG();
      if (chromaFormatIdc === 3) {
        skipBits(1);
      } // separate_colour_plane_flag

      skipUEG(); // bit_depth_luma_minus8
      skipUEG(); // bit_depth_chroma_minus8
      skipBits(1); // qpprime_y_zero_transform_bypass_flag
      if (readBoolean()) {
        // seq_scaling_matrix_present_flag
        scalingListCount = chromaFormatIdc !== 3 ? 8 : 12;
        for (i = 0; i < scalingListCount; i++) {
          if (readBoolean()) {
            // seq_scaling_list_present_flag[ i ]
            if (i < 6) {
              skipScalingList(16, eg);
            } else {
              skipScalingList(64, eg);
            }
          }
        }
      }
    }
    skipUEG(); // log2_max_frame_num_minus4
    const picOrderCntType = readUEG();
    if (picOrderCntType === 0) {
      readUEG(); // log2_max_pic_order_cnt_lsb_minus4
    } else if (picOrderCntType === 1) {
      skipBits(1); // delta_pic_order_always_zero_flag
      skipEG(); // offset_for_non_ref_pic
      skipEG(); // offset_for_top_to_bottom_field
      numRefFramesInPicOrderCntCycle = readUEG();
      for (i = 0; i < numRefFramesInPicOrderCntCycle; i++) {
        skipEG();
      } // offset_for_ref_frame[ i ]
    }
    skipUEG(); // max_num_ref_frames
    skipBits(1); // gaps_in_frame_num_value_allowed_flag
    const picWidthInMbsMinus1 = readUEG();
    const picHeightInMapUnitsMinus1 = readUEG();
    const frameMbsOnlyFlag = readBits(1);
    if (frameMbsOnlyFlag === 0) {
      skipBits(1);
    } // mb_adaptive_frame_field_flag

    skipBits(1); // direct_8x8_inference_flag
    if (readBoolean()) {
      // frame_cropping_flag
      frameCropLeftOffset = readUEG();
      frameCropRightOffset = readUEG();
      frameCropTopOffset = readUEG();
      frameCropBottomOffset = readUEG();
    }
    let pixelRatio: [number, number] = [1, 1];
    if (readBoolean()) {
      // vui_parameters_present_flag
      if (readBoolean()) {
        // aspect_ratio_info_present_flag
        const aspectRatioIdc = readUByte();
        switch (aspectRatioIdc) {
          case 1:
            pixelRatio = [1, 1];
            break;
          case 2:
            pixelRatio = [12, 11];
            break;
          case 3:
            pixelRatio = [10, 11];
            break;
          case 4:
            pixelRatio = [16, 11];
            break;
          case 5:
            pixelRatio = [40, 33];
            break;
          case 6:
            pixelRatio = [24, 11];
            break;
          case 7:
            pixelRatio = [20, 11];
            break;
          case 8:
            pixelRatio = [32, 11];
            break;
          case 9:
            pixelRatio = [80, 33];
            break;
          case 10:
            pixelRatio = [18, 11];
            break;
          case 11:
            pixelRatio = [15, 11];
            break;
          case 12:
            pixelRatio = [64, 33];
            break;
          case 13:
            pixelRatio = [160, 99];
            break;
          case 14:
            pixelRatio = [4, 3];
            break;
          case 15:
            pixelRatio = [3, 2];
            break;
          case 16:
            pixelRatio = [2, 1];
            break;
          case 255: {
            pixelRatio = [
              (readUByte() << 8) | readUByte(),
              (readUByte() << 8) | readUByte(),
            ];
            break;
          }
        }
      }
    }
    return {
      width: Math.ceil(
        (picWidthInMbsMinus1 + 1) * 16 -
          frameCropLeftOffset * 2 -
          frameCropRightOffset * 2,
      ),
      height:
        (2 - frameMbsOnlyFlag) * (picHeightInMapUnitsMinus1 + 1) * 16 -
        (frameMbsOnlyFlag ? 2 : 4) *
          (frameCropTopOffset + frameCropBottomOffset),
      pixelRatio: pixelRatio,
    };
  }
}

export default AvcVideoParser;
