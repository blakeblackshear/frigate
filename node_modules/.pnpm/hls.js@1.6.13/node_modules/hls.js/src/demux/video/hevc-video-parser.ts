import BaseVideoParser from './base-video-parser';
import ExpGolomb from './exp-golomb';
import { parseSEIMessageFromNALu } from '../../utils/mp4-tools';
import type {
  DemuxedUserdataTrack,
  DemuxedVideoTrack,
} from '../../types/demuxer';
import type { ParsedVideoSample } from '../tsdemuxer';
import type { PES } from '../tsdemuxer';

class HevcVideoParser extends BaseVideoParser {
  protected initVPS: Uint8Array | null = null;

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
        // NON-IDR, NON RANDOM ACCESS SLICE
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
          if (!VideoSample) {
            VideoSample = this.VideoSample = this.createVideoSample(
              false,
              pes.pts,
              pes.dts,
            );
          }
          VideoSample.frame = true;
          push = true;
          break;

        // CRA, BLA (random access picture)
        case 16:
        case 17:
        case 18:
        case 21:
          push = true;
          if (spsfound) {
            // handle PES not starting with AUD
            // if we have frame data already, that cannot belong to the same frame, so force a push
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

          VideoSample.key = true;
          VideoSample.frame = true;
          break;

        // IDR
        case 19:
        case 20:
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
        case 39:
          push = true;
          parseSEIMessageFromNALu(
            unit.data,
            2, // NALu header size
            pes.pts as number,
            textTrack.samples,
          );
          break;

        // VPS
        case 32:
          push = true;
          if (!track.vps) {
            if (typeof track.params !== 'object') {
              track.params = {};
            }
            track.params = Object.assign(track.params, this.readVPS(unit.data));
            this.initVPS = unit.data;
          }
          track.vps = [unit.data];
          break;

        // SPS
        case 33:
          push = true;
          spsfound = true;
          if (
            track.vps !== undefined &&
            track.vps[0] !== this.initVPS &&
            track.sps !== undefined &&
            !this.matchSPS(track.sps[0], unit.data)
          ) {
            this.initVPS = track.vps[0];
            track.sps = track.pps = undefined;
          }
          if (!track.sps) {
            const config = this.readSPS(unit.data);
            track.width = config.width;
            track.height = config.height;
            track.pixelRatio = config.pixelRatio;
            track.codec = config.codecString;
            track.sps = [];
            if (typeof track.params !== 'object') {
              track.params = {};
            }
            for (const prop in config.params) {
              track.params[prop] = config.params[prop];
            }
          }
          this.pushParameterSet(track.sps, unit.data, track.vps);
          if (!VideoSample) {
            VideoSample = this.VideoSample = this.createVideoSample(
              true,
              pes.pts,
              pes.dts,
            );
          }
          VideoSample.key = true;
          break;

        // PPS
        case 34:
          push = true;
          if (typeof track.params === 'object') {
            if (!track.pps) {
              track.pps = [];
              const config = this.readPPS(unit.data);
              for (const prop in config) {
                track.params[prop] = config[prop];
              }
            }
            this.pushParameterSet(track.pps, unit.data, track.vps);
          }
          break;

        // ACCESS UNIT DELIMITER
        case 35:
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

  private pushParameterSet(
    parameterSets: Uint8Array[],
    data: Uint8Array,
    vps: Uint8Array[] | undefined,
  ) {
    if ((vps && vps[0] === this.initVPS) || (!vps && !parameterSets.length)) {
      parameterSets.push(data);
    }
  }

  protected getNALuType(data: Uint8Array, offset: number): number {
    return (data[offset] & 0x7e) >>> 1;
  }

  protected ebsp2rbsp(arr: Uint8Array): Uint8Array {
    const dst = new Uint8Array(arr.byteLength);
    let dstIdx = 0;
    for (let i = 0; i < arr.byteLength; i++) {
      if (i >= 2) {
        // Unescape: Skip 0x03 after 00 00
        if (arr[i] === 0x03 && arr[i - 1] === 0x00 && arr[i - 2] === 0x00) {
          continue;
        }
      }
      dst[dstIdx] = arr[i];
      dstIdx++;
    }
    return new Uint8Array(dst.buffer, 0, dstIdx);
  }

  protected pushAccessUnit(
    VideoSample: ParsedVideoSample,
    videoTrack: DemuxedVideoTrack,
  ) {
    super.pushAccessUnit(VideoSample, videoTrack);
    if (this.initVPS) {
      this.initVPS = null; // null initVPS to prevent possible track's sps/pps growth until next VPS
    }
  }

  readVPS(vps: Uint8Array): {
    numTemporalLayers: number;
    temporalIdNested: boolean;
  } {
    const eg = new ExpGolomb(vps);
    // remove header
    eg.readUByte();
    eg.readUByte();

    eg.readBits(4); // video_parameter_set_id
    eg.skipBits(2);
    eg.readBits(6); // max_layers_minus1
    const max_sub_layers_minus1 = eg.readBits(3);
    const temporal_id_nesting_flag = eg.readBoolean();
    // ...vui fps can be here, but empty fps value is not critical for metadata

    return {
      numTemporalLayers: max_sub_layers_minus1 + 1,
      temporalIdNested: temporal_id_nesting_flag,
    };
  }

  readSPS(sps: Uint8Array): {
    codecString: string;
    params: object;
    width: number;
    height: number;
    pixelRatio: [number, number];
  } {
    const eg = new ExpGolomb(this.ebsp2rbsp(sps));
    eg.readUByte();
    eg.readUByte();

    eg.readBits(4); //video_parameter_set_id
    const max_sub_layers_minus1 = eg.readBits(3);
    eg.readBoolean(); // temporal_id_nesting_flag

    // profile_tier_level
    const general_profile_space = eg.readBits(2);
    const general_tier_flag = eg.readBoolean();
    const general_profile_idc = eg.readBits(5);
    const general_profile_compatibility_flags_1 = eg.readUByte();
    const general_profile_compatibility_flags_2 = eg.readUByte();
    const general_profile_compatibility_flags_3 = eg.readUByte();
    const general_profile_compatibility_flags_4 = eg.readUByte();
    const general_constraint_indicator_flags_1 = eg.readUByte();
    const general_constraint_indicator_flags_2 = eg.readUByte();
    const general_constraint_indicator_flags_3 = eg.readUByte();
    const general_constraint_indicator_flags_4 = eg.readUByte();
    const general_constraint_indicator_flags_5 = eg.readUByte();
    const general_constraint_indicator_flags_6 = eg.readUByte();
    const general_level_idc = eg.readUByte();
    const sub_layer_profile_present_flags: boolean[] = [];
    const sub_layer_level_present_flags: boolean[] = [];
    for (let i = 0; i < max_sub_layers_minus1; i++) {
      sub_layer_profile_present_flags.push(eg.readBoolean());
      sub_layer_level_present_flags.push(eg.readBoolean());
    }
    if (max_sub_layers_minus1 > 0) {
      for (let i = max_sub_layers_minus1; i < 8; i++) {
        eg.readBits(2);
      }
    }
    for (let i = 0; i < max_sub_layers_minus1; i++) {
      if (sub_layer_profile_present_flags[i]) {
        eg.readUByte(); // sub_layer_profile_space, sub_layer_tier_flag, sub_layer_profile_idc
        eg.readUByte();
        eg.readUByte();
        eg.readUByte();
        eg.readUByte(); // sub_layer_profile_compatibility_flag
        eg.readUByte();
        eg.readUByte();
        eg.readUByte();
        eg.readUByte();
        eg.readUByte();
        eg.readUByte();
      }
      if (sub_layer_level_present_flags[i]) {
        eg.readUByte();
      }
    }

    eg.readUEG(); // seq_parameter_set_id
    const chroma_format_idc = eg.readUEG();
    if (chroma_format_idc == 3) {
      eg.skipBits(1); //separate_colour_plane_flag
    }
    const pic_width_in_luma_samples = eg.readUEG();
    const pic_height_in_luma_samples = eg.readUEG();
    const conformance_window_flag = eg.readBoolean();
    let pic_left_offset = 0,
      pic_right_offset = 0,
      pic_top_offset = 0,
      pic_bottom_offset = 0;
    if (conformance_window_flag) {
      pic_left_offset += eg.readUEG();
      pic_right_offset += eg.readUEG();
      pic_top_offset += eg.readUEG();
      pic_bottom_offset += eg.readUEG();
    }
    const bit_depth_luma_minus8 = eg.readUEG();
    const bit_depth_chroma_minus8 = eg.readUEG();
    const log2_max_pic_order_cnt_lsb_minus4 = eg.readUEG();
    const sub_layer_ordering_info_present_flag = eg.readBoolean();
    for (
      let i = sub_layer_ordering_info_present_flag ? 0 : max_sub_layers_minus1;
      i <= max_sub_layers_minus1;
      i++
    ) {
      eg.skipUEG(); // max_dec_pic_buffering_minus1[i]
      eg.skipUEG(); // max_num_reorder_pics[i]
      eg.skipUEG(); // max_latency_increase_plus1[i]
    }
    eg.skipUEG(); // log2_min_luma_coding_block_size_minus3
    eg.skipUEG(); // log2_diff_max_min_luma_coding_block_size
    eg.skipUEG(); // log2_min_transform_block_size_minus2
    eg.skipUEG(); // log2_diff_max_min_transform_block_size
    eg.skipUEG(); // max_transform_hierarchy_depth_inter
    eg.skipUEG(); // max_transform_hierarchy_depth_intra
    const scaling_list_enabled_flag = eg.readBoolean();
    if (scaling_list_enabled_flag) {
      const sps_scaling_list_data_present_flag = eg.readBoolean();
      if (sps_scaling_list_data_present_flag) {
        for (let sizeId = 0; sizeId < 4; sizeId++) {
          for (
            let matrixId = 0;
            matrixId < (sizeId === 3 ? 2 : 6);
            matrixId++
          ) {
            const scaling_list_pred_mode_flag = eg.readBoolean();
            if (!scaling_list_pred_mode_flag) {
              eg.readUEG(); // scaling_list_pred_matrix_id_delta
            } else {
              const coefNum = Math.min(64, 1 << (4 + (sizeId << 1)));
              if (sizeId > 1) {
                eg.readEG();
              }
              for (let i = 0; i < coefNum; i++) {
                eg.readEG();
              }
            }
          }
        }
      }
    }

    eg.readBoolean(); // amp_enabled_flag
    eg.readBoolean(); // sample_adaptive_offset_enabled_flag
    const pcm_enabled_flag = eg.readBoolean();
    if (pcm_enabled_flag) {
      eg.readUByte();
      eg.skipUEG();
      eg.skipUEG();
      eg.readBoolean();
    }
    const num_short_term_ref_pic_sets = eg.readUEG();
    let num_delta_pocs = 0;
    for (let i = 0; i < num_short_term_ref_pic_sets; i++) {
      let inter_ref_pic_set_prediction_flag = false;
      if (i !== 0) {
        inter_ref_pic_set_prediction_flag = eg.readBoolean();
      }
      if (inter_ref_pic_set_prediction_flag) {
        if (i === num_short_term_ref_pic_sets) {
          eg.readUEG();
        }
        eg.readBoolean();
        eg.readUEG();
        let next_num_delta_pocs = 0;
        for (let j = 0; j <= num_delta_pocs; j++) {
          const used_by_curr_pic_flag = eg.readBoolean();
          let use_delta_flag = false;
          if (!used_by_curr_pic_flag) {
            use_delta_flag = eg.readBoolean();
          }
          if (used_by_curr_pic_flag || use_delta_flag) {
            next_num_delta_pocs++;
          }
        }
        num_delta_pocs = next_num_delta_pocs;
      } else {
        const num_negative_pics = eg.readUEG();
        const num_positive_pics = eg.readUEG();
        num_delta_pocs = num_negative_pics + num_positive_pics;
        for (let j = 0; j < num_negative_pics; j++) {
          eg.readUEG();
          eg.readBoolean();
        }
        for (let j = 0; j < num_positive_pics; j++) {
          eg.readUEG();
          eg.readBoolean();
        }
      }
    }

    const long_term_ref_pics_present_flag = eg.readBoolean();
    if (long_term_ref_pics_present_flag) {
      const num_long_term_ref_pics_sps = eg.readUEG();
      for (let i = 0; i < num_long_term_ref_pics_sps; i++) {
        for (let j = 0; j < log2_max_pic_order_cnt_lsb_minus4 + 4; j++) {
          eg.readBits(1);
        }
        eg.readBits(1);
      }
    }

    let min_spatial_segmentation_idc = 0;
    let sar_width = 1,
      sar_height = 1;
    let fps_fixed = true,
      fps_den = 1,
      fps_num = 0;
    eg.readBoolean(); // sps_temporal_mvp_enabled_flag
    eg.readBoolean(); // strong_intra_smoothing_enabled_flag
    let default_display_window_flag = false;
    const vui_parameters_present_flag = eg.readBoolean();
    if (vui_parameters_present_flag) {
      const aspect_ratio_info_present_flag = eg.readBoolean();
      if (aspect_ratio_info_present_flag) {
        const aspect_ratio_idc = eg.readUByte();
        const sar_width_table = [
          1, 12, 10, 16, 40, 24, 20, 32, 80, 18, 15, 64, 160, 4, 3, 2,
        ];
        const sar_height_table = [
          1, 11, 11, 11, 33, 11, 11, 11, 33, 11, 11, 33, 99, 3, 2, 1,
        ];
        if (aspect_ratio_idc > 0 && aspect_ratio_idc < 16) {
          sar_width = sar_width_table[aspect_ratio_idc - 1];
          sar_height = sar_height_table[aspect_ratio_idc - 1];
        } else if (aspect_ratio_idc === 255) {
          sar_width = eg.readBits(16);
          sar_height = eg.readBits(16);
        }
      }
      const overscan_info_present_flag = eg.readBoolean();
      if (overscan_info_present_flag) {
        eg.readBoolean();
      }
      const video_signal_type_present_flag = eg.readBoolean();
      if (video_signal_type_present_flag) {
        eg.readBits(3);
        eg.readBoolean();
        const colour_description_present_flag = eg.readBoolean();
        if (colour_description_present_flag) {
          eg.readUByte();
          eg.readUByte();
          eg.readUByte();
        }
      }
      const chroma_loc_info_present_flag = eg.readBoolean();
      if (chroma_loc_info_present_flag) {
        eg.readUEG();
        eg.readUEG();
      }
      eg.readBoolean(); // neutral_chroma_indication_flag
      eg.readBoolean(); // field_seq_flag
      eg.readBoolean(); // frame_field_info_present_flag
      default_display_window_flag = eg.readBoolean();
      if (default_display_window_flag) {
        eg.skipUEG();
        eg.skipUEG();
        eg.skipUEG();
        eg.skipUEG();
      }
      const vui_timing_info_present_flag = eg.readBoolean();
      if (vui_timing_info_present_flag) {
        fps_den = eg.readBits(32);
        fps_num = eg.readBits(32);
        const vui_poc_proportional_to_timing_flag = eg.readBoolean();
        if (vui_poc_proportional_to_timing_flag) {
          eg.readUEG();
        }
        const vui_hrd_parameters_present_flag = eg.readBoolean();
        if (vui_hrd_parameters_present_flag) {
          //const commonInfPresentFlag = true;
          //if (commonInfPresentFlag) {
          const nal_hrd_parameters_present_flag = eg.readBoolean();
          const vcl_hrd_parameters_present_flag = eg.readBoolean();
          let sub_pic_hrd_params_present_flag = false;
          if (
            nal_hrd_parameters_present_flag ||
            vcl_hrd_parameters_present_flag
          ) {
            sub_pic_hrd_params_present_flag = eg.readBoolean();
            if (sub_pic_hrd_params_present_flag) {
              eg.readUByte();
              eg.readBits(5);
              eg.readBoolean();
              eg.readBits(5);
            }
            eg.readBits(4); // bit_rate_scale
            eg.readBits(4); // cpb_size_scale
            if (sub_pic_hrd_params_present_flag) {
              eg.readBits(4);
            }
            eg.readBits(5);
            eg.readBits(5);
            eg.readBits(5);
          }
          //}
          for (let i = 0; i <= max_sub_layers_minus1; i++) {
            fps_fixed = eg.readBoolean(); // fixed_pic_rate_general_flag
            const fixed_pic_rate_within_cvs_flag =
              fps_fixed || eg.readBoolean();
            let low_delay_hrd_flag = false;
            if (fixed_pic_rate_within_cvs_flag) {
              eg.readEG();
            } else {
              low_delay_hrd_flag = eg.readBoolean();
            }
            const cpb_cnt = low_delay_hrd_flag ? 1 : eg.readUEG() + 1;
            if (nal_hrd_parameters_present_flag) {
              for (let j = 0; j < cpb_cnt; j++) {
                eg.readUEG();
                eg.readUEG();
                if (sub_pic_hrd_params_present_flag) {
                  eg.readUEG();
                  eg.readUEG();
                }
                eg.skipBits(1);
              }
            }
            if (vcl_hrd_parameters_present_flag) {
              for (let j = 0; j < cpb_cnt; j++) {
                eg.readUEG();
                eg.readUEG();
                if (sub_pic_hrd_params_present_flag) {
                  eg.readUEG();
                  eg.readUEG();
                }
                eg.skipBits(1);
              }
            }
          }
        }
      }
      const bitstream_restriction_flag = eg.readBoolean();
      if (bitstream_restriction_flag) {
        eg.readBoolean(); // tiles_fixed_structure_flag
        eg.readBoolean(); // motion_vectors_over_pic_boundaries_flag
        eg.readBoolean(); // restricted_ref_pic_lists_flag
        min_spatial_segmentation_idc = eg.readUEG();
      }
    }

    let width = pic_width_in_luma_samples,
      height = pic_height_in_luma_samples;
    if (conformance_window_flag) {
      let chroma_scale_w = 1,
        chroma_scale_h = 1;
      if (chroma_format_idc === 1) {
        // YUV 420
        chroma_scale_w = chroma_scale_h = 2;
      } else if (chroma_format_idc == 2) {
        // YUV 422
        chroma_scale_w = 2;
      }
      width =
        pic_width_in_luma_samples -
        chroma_scale_w * pic_right_offset -
        chroma_scale_w * pic_left_offset;
      height =
        pic_height_in_luma_samples -
        chroma_scale_h * pic_bottom_offset -
        chroma_scale_h * pic_top_offset;
    }

    const profile_space_string = general_profile_space
      ? ['A', 'B', 'C'][general_profile_space]
      : '';
    const profile_compatibility_buf =
      (general_profile_compatibility_flags_1 << 24) |
      (general_profile_compatibility_flags_2 << 16) |
      (general_profile_compatibility_flags_3 << 8) |
      general_profile_compatibility_flags_4;
    let profile_compatibility_rev = 0;
    for (let i = 0; i < 32; i++) {
      profile_compatibility_rev =
        (profile_compatibility_rev |
          (((profile_compatibility_buf >> i) & 1) << (31 - i))) >>>
        0; // reverse bit position (and cast as UInt32)
    }
    let profile_compatibility_flags_string =
      profile_compatibility_rev.toString(16);
    if (
      general_profile_idc === 1 &&
      profile_compatibility_flags_string === '2'
    ) {
      profile_compatibility_flags_string = '6';
    }
    const tier_flag_string = general_tier_flag ? 'H' : 'L';

    return {
      codecString: `hvc1.${profile_space_string}${general_profile_idc}.${profile_compatibility_flags_string}.${tier_flag_string}${general_level_idc}.B0`,
      params: {
        general_tier_flag,
        general_profile_idc,
        general_profile_space,
        general_profile_compatibility_flags: [
          general_profile_compatibility_flags_1,
          general_profile_compatibility_flags_2,
          general_profile_compatibility_flags_3,
          general_profile_compatibility_flags_4,
        ],
        general_constraint_indicator_flags: [
          general_constraint_indicator_flags_1,
          general_constraint_indicator_flags_2,
          general_constraint_indicator_flags_3,
          general_constraint_indicator_flags_4,
          general_constraint_indicator_flags_5,
          general_constraint_indicator_flags_6,
        ],
        general_level_idc,
        bit_depth: bit_depth_luma_minus8 + 8,
        bit_depth_luma_minus8,
        bit_depth_chroma_minus8,
        min_spatial_segmentation_idc,
        chroma_format_idc: chroma_format_idc,
        frame_rate: {
          fixed: fps_fixed,
          fps: fps_num / fps_den,
        },
      },
      width,
      height,
      pixelRatio: [sar_width, sar_height],
    };
  }

  readPPS(pps: Uint8Array): {
    parallelismType: number;
  } {
    const eg = new ExpGolomb(this.ebsp2rbsp(pps));
    eg.readUByte();
    eg.readUByte();
    eg.skipUEG(); // pic_parameter_set_id
    eg.skipUEG(); // seq_parameter_set_id
    eg.skipBits(2); // dependent_slice_segments_enabled_flag, output_flag_present_flag
    eg.skipBits(3); // num_extra_slice_header_bits
    eg.skipBits(2); // sign_data_hiding_enabled_flag, cabac_init_present_flag
    eg.skipUEG();
    eg.skipUEG();
    eg.skipEG(); // init_qp_minus26
    eg.skipBits(2); // constrained_intra_pred_flag, transform_skip_enabled_flag
    const cu_qp_delta_enabled_flag = eg.readBoolean();
    if (cu_qp_delta_enabled_flag) {
      eg.skipUEG();
    }
    eg.skipEG(); // cb_qp_offset
    eg.skipEG(); // cr_qp_offset
    eg.skipBits(4); // pps_slice_chroma_qp_offsets_present_flag, weighted_pred_flag, weighted_bipred_flag, transquant_bypass_enabled_flag
    const tiles_enabled_flag = eg.readBoolean();
    const entropy_coding_sync_enabled_flag = eg.readBoolean();
    let parallelismType = 1; // slice-based parallel decoding
    if (entropy_coding_sync_enabled_flag && tiles_enabled_flag) {
      parallelismType = 0; // mixed-type parallel decoding
    } else if (entropy_coding_sync_enabled_flag) {
      parallelismType = 3; // wavefront-based parallel decoding
    } else if (tiles_enabled_flag) {
      parallelismType = 2; // tile-based parallel decoding
    }

    return {
      parallelismType,
    };
  }

  matchSPS(sps1: Uint8Array, sps2: Uint8Array): boolean {
    // compare without headers and VPS related params
    return (
      String.fromCharCode.apply(null, sps1).substr(3) ===
      String.fromCharCode.apply(null, sps2).substr(3)
    );
  }
}

export default HevcVideoParser;
