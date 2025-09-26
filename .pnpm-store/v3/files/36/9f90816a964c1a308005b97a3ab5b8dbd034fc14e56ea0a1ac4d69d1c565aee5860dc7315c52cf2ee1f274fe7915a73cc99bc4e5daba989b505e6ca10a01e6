import type { DemuxedTrack } from '../types/demuxer';

export function dummyTrack(type = '', inputTimeScale = 90000): DemuxedTrack {
  return {
    type,
    id: -1,
    pid: -1,
    inputTimeScale,
    sequenceNumber: -1,
    samples: [],
    dropped: 0,
  };
}
