/**
 * MP3 demuxer
 */
import { getId3Data } from '@svta/common-media-library/id3/getId3Data';
import { getId3Timestamp } from '@svta/common-media-library/id3/getId3Timestamp';
import BaseAudioDemuxer from './base-audio-demuxer';
import { getAudioBSID } from './dolby';
import * as MpegAudio from './mpegaudio';
import { logger } from '../../utils/logger';

class MP3Demuxer extends BaseAudioDemuxer {
  resetInitSegment(
    initSegment: Uint8Array | undefined,
    audioCodec: string | undefined,
    videoCodec: string | undefined,
    trackDuration: number,
  ) {
    super.resetInitSegment(initSegment, audioCodec, videoCodec, trackDuration);
    this._audioTrack = {
      container: 'audio/mpeg',
      type: 'audio',
      id: 2,
      pid: -1,
      sequenceNumber: 0,
      segmentCodec: 'mp3',
      samples: [],
      manifestCodec: audioCodec,
      duration: trackDuration,
      inputTimeScale: 90000,
      dropped: 0,
    };
  }

  static probe(data: Uint8Array | undefined): boolean {
    if (!data) {
      return false;
    }

    // check if data contains ID3 timestamp and MPEG sync word
    // Look for MPEG header | 1111 1111 | 111X XYZX | where X can be either 0 or 1 and Y or Z should be 1
    // Layer bits (position 14 and 15) in header should be always different from 0 (Layer I or Layer II or Layer III)
    // More info http://www.mp3-tech.org/programmer/frame_header.html
    const id3Data = getId3Data(data, 0);
    let offset = id3Data?.length || 0;

    // Check for ac-3|ec-3 sync bytes and return false if present
    if (
      id3Data &&
      data[offset] === 0x0b &&
      data[offset + 1] === 0x77 &&
      getId3Timestamp(id3Data) !== undefined &&
      // check the bsid to confirm ac-3 or ec-3 (not mp3)
      getAudioBSID(data, offset) <= 16
    ) {
      return false;
    }

    for (let length = data.length; offset < length; offset++) {
      if (MpegAudio.probe(data, offset)) {
        logger.log('MPEG Audio sync word found !');
        return true;
      }
    }
    return false;
  }

  canParse(data, offset) {
    return MpegAudio.canParse(data, offset);
  }

  appendFrame(track, data, offset) {
    if (this.basePTS === null) {
      return;
    }
    return MpegAudio.appendFrame(
      track,
      data,
      offset,
      this.basePTS,
      this.frameIndex,
    );
  }
}

export default MP3Demuxer;
