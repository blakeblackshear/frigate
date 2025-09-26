import { appendUint8Array } from '../../utils/mp4-tools';
import type {
  DemuxedUserdataTrack,
  DemuxedVideoTrack,
  VideoSample,
  VideoSampleUnit,
} from '../../types/demuxer';
import type { ParsedVideoSample } from '../tsdemuxer';
import type { PES } from '../tsdemuxer';

abstract class BaseVideoParser {
  protected VideoSample: ParsedVideoSample | null = null;

  protected createVideoSample(
    key: boolean,
    pts: number | undefined,
    dts: number | undefined,
  ): ParsedVideoSample {
    return {
      key,
      frame: false,
      pts,
      dts,
      units: [],
      length: 0,
    };
  }

  protected getLastNalUnit(
    samples: VideoSample[],
  ): VideoSampleUnit | undefined {
    let VideoSample = this.VideoSample;
    let lastUnit: VideoSampleUnit | undefined;
    // try to fallback to previous sample if current one is empty
    if (!VideoSample || VideoSample.units.length === 0) {
      VideoSample = samples[samples.length - 1];
    }
    if (VideoSample?.units) {
      const units = VideoSample.units;
      lastUnit = units[units.length - 1];
    }
    return lastUnit;
  }

  protected pushAccessUnit(
    VideoSample: ParsedVideoSample,
    videoTrack: DemuxedVideoTrack,
  ) {
    if (VideoSample.units.length && VideoSample.frame) {
      // if sample does not have PTS/DTS, patch with last sample PTS/DTS
      if (VideoSample.pts === undefined) {
        const samples = videoTrack.samples;
        const nbSamples = samples.length;
        if (nbSamples) {
          const lastSample = samples[nbSamples - 1];
          VideoSample.pts = lastSample.pts;
          VideoSample.dts = lastSample.dts;
        } else {
          // dropping samples, no timestamp found
          videoTrack.dropped++;
          return;
        }
      }
      videoTrack.samples.push(VideoSample as VideoSample);
    }
  }

  abstract parsePES(
    track: DemuxedVideoTrack,
    textTrack: DemuxedUserdataTrack,
    pes: PES,
    last: boolean,
  );

  protected abstract getNALuType(data: Uint8Array, offset: number): number;

  protected parseNALu(
    track: DemuxedVideoTrack,
    array: Uint8Array,
    endOfSegment: boolean,
  ): Array<{
    data: Uint8Array;
    type: number;
    state?: number;
  }> {
    const len = array.byteLength;
    let state = track.naluState || 0;
    const lastState = state;
    const units: VideoSampleUnit[] = [];
    let i = 0;
    let value: number;
    let overflow: number;
    let unitType: number;
    let lastUnitStart = -1;
    let lastUnitType: number = 0;
    // logger.log('PES:' + Hex.hexDump(array));

    if (state === -1) {
      // special use case where we found 3 or 4-byte start codes exactly at the end of previous PES packet
      lastUnitStart = 0;
      // NALu type is value read from offset 0
      lastUnitType = this.getNALuType(array, 0);
      state = 0;
      i = 1;
    }

    while (i < len) {
      value = array[i++];
      // optimization. state 0 and 1 are the predominant case. let's handle them outside of the switch/case
      if (!state) {
        state = value ? 0 : 1;
        continue;
      }
      if (state === 1) {
        state = value ? 0 : 2;
        continue;
      }
      // here we have state either equal to 2 or 3
      if (!value) {
        state = 3;
      } else if (value === 1) {
        overflow = i - state - 1;
        if (lastUnitStart >= 0) {
          const unit: VideoSampleUnit = {
            data: array.subarray(lastUnitStart, overflow),
            type: lastUnitType,
          };
          // logger.log('pushing NALU, type/size:' + unit.type + '/' + unit.data.byteLength);
          units.push(unit);
        } else {
          // lastUnitStart is undefined => this is the first start code found in this PES packet
          // first check if start code delimiter is overlapping between 2 PES packets,
          // ie it started in last packet (lastState not zero)
          // and ended at the beginning of this PES packet (i <= 4 - lastState)
          const lastUnit = this.getLastNalUnit(track.samples);
          if (lastUnit) {
            if (lastState && i <= 4 - lastState) {
              // start delimiter overlapping between PES packets
              // strip start delimiter bytes from the end of last NAL unit
              // check if lastUnit had a state different from zero
              if (lastUnit.state) {
                // strip last bytes
                lastUnit.data = lastUnit.data.subarray(
                  0,
                  lastUnit.data.byteLength - lastState,
                );
              }
            }
            // If NAL units are not starting right at the beginning of the PES packet, push preceding data into previous NAL unit.

            if (overflow > 0) {
              // logger.log('first NALU found with overflow:' + overflow);
              lastUnit.data = appendUint8Array(
                lastUnit.data,
                array.subarray(0, overflow),
              );
              lastUnit.state = 0;
            }
          }
        }
        // check if we can read unit type
        if (i < len) {
          unitType = this.getNALuType(array, i);
          // logger.log('find NALU @ offset:' + i + ',type:' + unitType);
          lastUnitStart = i;
          lastUnitType = unitType;
          state = 0;
        } else {
          // not enough byte to read unit type. let's read it on next PES parsing
          state = -1;
        }
      } else {
        state = 0;
      }
    }
    if (lastUnitStart >= 0 && state >= 0) {
      const unit: VideoSampleUnit = {
        data: array.subarray(lastUnitStart, len),
        type: lastUnitType,
        state: state,
      };
      units.push(unit);
      // logger.log('pushing NALU, type/size/state:' + unit.type + '/' + unit.data.byteLength + '/' + state);
    }
    // no NALu found
    if (units.length === 0) {
      // append pes.data to previous NAL unit
      const lastUnit = this.getLastNalUnit(track.samples);
      if (lastUnit) {
        lastUnit.data = appendUint8Array(lastUnit.data, array);
      }
    }
    track.naluState = state;
    return units;
  }
}

export default BaseVideoParser;
